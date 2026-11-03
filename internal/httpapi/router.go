// Package httpapi wires the HTTP API, health probes and static frontend.
package httpapi

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"cloud-native-roadmap/internal/store"
)

// MaxStateBytes caps the size of a progress document.
const MaxStateBytes = 1 << 20 // 1 MiB

// Options configures the handler.
type Options struct {
	Store  store.Store
	Static fs.FS // frontend assets (index.html at the root)
	Logger *slog.Logger
	// Version and Schema are reported by GET /api/v1/version; the frontend uses
	// them to offer a reload after an upgrade.
	Version string
	Schema  int
	// Shutdown, when set, enables POST /api/v1/admin/shutdown for local
	// upgrades. Only loopback clients that send the X-Roadmap-Admin header may
	// call it. Leave nil when the server is reachable from other hosts.
	Shutdown func()
}

// New returns the fully wrapped application handler.
func New(opts Options) (http.Handler, error) {
	if opts.Store == nil || opts.Static == nil {
		return nil, errors.New("httpapi: Store and Static are required")
	}
	log := opts.Logger
	if log == nil {
		log = slog.New(slog.DiscardHandler)
	}
	static, err := newStaticHandler(opts.Static)
	if err != nil {
		return nil, err
	}

	a := &api{store: opts.Store, log: log, version: opts.Version, schema: opts.Schema, shutdown: opts.Shutdown}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", a.healthz)
	mux.HandleFunc("GET /readyz", a.readyz)
	mux.HandleFunc("GET /api/v1/state", a.getState)
	mux.HandleFunc("PUT /api/v1/state", a.putState)
	mux.HandleFunc("DELETE /api/v1/state", a.deleteState)
	mux.HandleFunc("GET /api/v1/version", a.getVersion)
	mux.HandleFunc("POST /api/v1/admin/shutdown", a.adminShutdown)
	mux.Handle("GET /", static) // GET also matches HEAD

	var h http.Handler = mux
	h = withSecurityHeaders(h)
	h = withRecovery(log)(h)
	h = withLogging(log)(h)
	h = withRequestID(h)
	return h, nil
}

type api struct {
	store    store.Store
	log      *slog.Logger
	version  string
	schema   int
	shutdown func()
}

func (a *api) getVersion(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, map[string]any{"version": a.version, "schema": a.schema})
}

// adminShutdown starts a graceful shutdown so an upgrade can replace the binary.
// A custom header cannot be sent cross-origin without a CORS preflight, which
// this server never approves, so web pages cannot trigger it; the loopback
// check keeps other hosts out.
func (a *api) adminShutdown(w http.ResponseWriter, r *http.Request) {
	if a.shutdown == nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	ip := net.ParseIP(host)
	if err != nil || ip == nil || !ip.IsLoopback() || r.Header.Get("X-Roadmap-Admin") != "shutdown" {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	a.log.Info("shutdown requested via admin API")
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "shutting down"})
	go a.shutdown()
}

type stateResponse struct {
	State     json.RawMessage `json:"state"`
	UpdatedAt *time.Time      `json:"updatedAt"`
}

func toResponse(s store.State) stateResponse {
	r := stateResponse{State: s.Data}
	if !s.UpdatedAt.IsZero() {
		r.UpdatedAt = &s.UpdatedAt
	}
	return r
}

func (a *api) healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *api) readyz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := a.store.Ping(ctx); err != nil {
		a.log.Warn("readiness check failed", "err", err)
		writeError(w, http.StatusServiceUnavailable, "store unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (a *api) getState(w http.ResponseWriter, r *http.Request) {
	s, err := a.store.Get(r.Context(), store.DefaultProfile)
	if err != nil {
		a.fail(w, r, err)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, toResponse(s))
}

func (a *api) putState(w http.ResponseWriter, r *http.Request) {
	if ct := r.Header.Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		writeError(w, http.StatusUnsupportedMediaType, "Content-Type must be application/json")
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxStateBytes))
	if err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("state exceeds %d bytes", MaxStateBytes))
			return
		}
		writeError(w, http.StatusBadRequest, "could not read body")
		return
	}
	s, err := a.store.Put(r.Context(), store.DefaultProfile, body)
	if errors.Is(err, store.ErrInvalidState) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		a.fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updatedAt": s.UpdatedAt})
}

func (a *api) deleteState(w http.ResponseWriter, r *http.Request) {
	if err := a.store.Delete(r.Context(), store.DefaultProfile); err != nil {
		a.fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *api) fail(w http.ResponseWriter, r *http.Request, err error) {
	a.log.Error("request failed", "err", err, "path", r.URL.Path, "request_id", RequestID(r.Context()))
	writeError(w, http.StatusInternalServerError, "internal server error")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// newStaticHandler serves the embedded frontend with strong ETags so browsers
// revalidate cheaply (embedded files carry no modification time).
func newStaticHandler(fsys fs.FS) (http.Handler, error) {
	etags := map[string]string{}
	err := fs.WalkDir(fsys, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		b, err := fs.ReadFile(fsys, p)
		if err != nil {
			return err
		}
		sum := sha256.Sum256(b)
		etags["/"+p] = `"` + hex.EncodeToString(sum[:8]) + `"`
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("index static assets: %w", err)
	}
	if _, ok := etags["/index.html"]; !ok {
		return nil, errors.New("static assets: index.html not found")
	}
	files := http.FileServerFS(fsys)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		if p == "/" {
			p = "/index.html"
		}
		if tag, ok := etags[p]; ok {
			w.Header().Set("ETag", tag)
			w.Header().Set("Cache-Control", "no-cache") // always revalidate; 304 when unchanged
		}
		files.ServeHTTP(w, r)
	}), nil
}
