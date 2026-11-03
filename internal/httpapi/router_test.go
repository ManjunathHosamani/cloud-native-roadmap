package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"cloud-native-roadmap/internal/store"
)

var testFS = fstest.MapFS{
	"index.html":    {Data: []byte("<!doctype html><title>t</title>")},
	"css/app.css":   {Data: []byte("body{}")},
	"js/app.js":     {Data: []byte("console.log(1)")},
	"js/data/go.js": {Data: []byte("registerRoadmap({})")},
}

func newTestServer(t *testing.T, s store.Store) http.Handler {
	t.Helper()
	h, err := New(Options{Store: s, Static: testFS})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	return h
}

func do(h http.Handler, method, path, body string, hdr map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

var jsonHdr = map[string]string{"Content-Type": "application/json"}

func TestStateLifecycle(t *testing.T) {
	h := newTestServer(t, store.NewMemory())

	rec := do(h, "GET", "/api/v1/state", "", nil)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"state":{}`) || !strings.Contains(rec.Body.String(), `"updatedAt":null`) {
		t.Fatalf("initial GET = %d %s", rec.Code, rec.Body)
	}

	rec = do(h, "PUT", "/api/v1/state", `{"checks":{"a":true}}`, jsonHdr)
	if rec.Code != 200 {
		t.Fatalf("PUT = %d %s", rec.Code, rec.Body)
	}

	rec = do(h, "GET", "/api/v1/state", "", nil)
	var got struct {
		State     map[string]any `json:"state"`
		UpdatedAt *string        `json:"updatedAt"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got.UpdatedAt == nil || got.State["checks"] == nil {
		t.Fatalf("GET after PUT = %s", rec.Body)
	}
	if cc := rec.Header().Get("Cache-Control"); cc != "no-store" {
		t.Errorf("state Cache-Control = %q, want no-store", cc)
	}

	if rec = do(h, "DELETE", "/api/v1/state", "", nil); rec.Code != http.StatusNoContent {
		t.Fatalf("DELETE = %d", rec.Code)
	}
	if rec = do(h, "GET", "/api/v1/state", "", nil); !strings.Contains(rec.Body.String(), `"state":{}`) {
		t.Fatalf("GET after DELETE = %s", rec.Body)
	}
}

func TestPutValidation(t *testing.T) {
	h := newTestServer(t, store.NewMemory())
	tests := []struct {
		name string
		body string
		hdr  map[string]string
		want int
	}{
		{"wrong content type", `{}`, map[string]string{"Content-Type": "text/plain"}, http.StatusUnsupportedMediaType},
		{"array", `[]`, jsonHdr, http.StatusBadRequest},
		{"malformed", `{"a":`, jsonHdr, http.StatusBadRequest},
		{"too large", `{"x":"` + strings.Repeat("a", MaxStateBytes) + `"}`, jsonHdr, http.StatusRequestEntityTooLarge},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if rec := do(h, "PUT", "/api/v1/state", tt.body, tt.hdr); rec.Code != tt.want {
				t.Fatalf("code = %d, want %d (%s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

func TestRoutingAndMethods(t *testing.T) {
	h := newTestServer(t, store.NewMemory())
	tests := []struct {
		method, path string
		want         int
	}{
		{"GET", "/healthz", 200},
		{"GET", "/readyz", 200},
		{"POST", "/api/v1/state", http.StatusMethodNotAllowed},
		{"GET", "/api/v1/unknown", http.StatusNotFound},
		{"GET", "/", 200},
		{"GET", "/js/app.js", 200},
		{"GET", "/nope.js", 404},
	}
	for _, tt := range tests {
		if rec := do(h, tt.method, tt.path, "", nil); rec.Code != tt.want {
			t.Errorf("%s %s = %d, want %d", tt.method, tt.path, rec.Code, tt.want)
		}
	}
}

func TestSecurityAndRequestIDHeaders(t *testing.T) {
	h := newTestServer(t, store.NewMemory())
	rec := do(h, "GET", "/", "", map[string]string{"X-Request-ID": "abc-123"})
	if got := rec.Header().Get("X-Request-ID"); got != "abc-123" {
		t.Errorf("request id not propagated: %q", got)
	}
	for _, k := range []string{"Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"} {
		if rec.Header().Get(k) == "" {
			t.Errorf("missing %s", k)
		}
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Error("CORS must not be enabled")
	}
	// Malicious IDs are replaced, not reflected.
	rec = do(h, "GET", "/healthz", "", map[string]string{"X-Request-ID": "<script>"})
	if got := rec.Header().Get("X-Request-ID"); got == "<script>" || got == "" {
		t.Errorf("unsafe request id handling: %q", got)
	}
}

func TestStaticETagRevalidation(t *testing.T) {
	h := newTestServer(t, store.NewMemory())
	rec := do(h, "GET", "/css/app.css", "", nil)
	tag := rec.Header().Get("ETag")
	if tag == "" {
		t.Fatal("no ETag on static asset")
	}
	if rec = do(h, "GET", "/css/app.css", "", map[string]string{"If-None-Match": tag}); rec.Code != http.StatusNotModified {
		t.Fatalf("revalidation = %d, want 304", rec.Code)
	}
}

type failingStore struct{ store.Store }

func (failingStore) Ping(context.Context) error { return errors.New("down") }
func (failingStore) Get(context.Context, string) (store.State, error) {
	return store.State{}, errors.New("boom")
}

func TestStoreFailures(t *testing.T) {
	h := newTestServer(t, failingStore{store.NewMemory()})
	if rec := do(h, "GET", "/readyz", "", nil); rec.Code != http.StatusServiceUnavailable {
		t.Errorf("readyz = %d, want 503", rec.Code)
	}
	rec := do(h, "GET", "/api/v1/state", "", nil)
	if rec.Code != 500 || strings.Contains(rec.Body.String(), "boom") {
		t.Errorf("GET = %d %s; want 500 without leaking internals", rec.Code, rec.Body)
	}
}

type panicStore struct{ store.Store }

func (panicStore) Get(context.Context, string) (store.State, error) { panic("kaboom") }

func TestPanicRecovery(t *testing.T) {
	h := newTestServer(t, panicStore{store.NewMemory()})
	if rec := do(h, "GET", "/api/v1/state", "", nil); rec.Code != 500 {
		t.Fatalf("code = %d, want 500", rec.Code)
	}
}

func TestVersionEndpoint(t *testing.T) {
	h, err := New(Options{Store: store.NewMemory(), Static: testFS, Version: "1.2.0", Schema: 2})
	if err != nil {
		t.Fatal(err)
	}
	rec := do(h, "GET", "/api/v1/version", "", nil)
	if rec.Code != 200 || rec.Header().Get("Cache-Control") != "no-store" ||
		!strings.Contains(rec.Body.String(), `"version":"1.2.0"`) || !strings.Contains(rec.Body.String(), `"schema":2`) {
		t.Fatalf("GET /api/v1/version = %d %s", rec.Code, rec.Body)
	}
}

func TestAdminShutdown(t *testing.T) {
	called := make(chan struct{}, 1)
	h, err := New(Options{Store: store.NewMemory(), Static: testFS, Shutdown: func() { called <- struct{}{} }})
	if err != nil {
		t.Fatal(err)
	}
	send := func(remote string, hdr map[string]string) int {
		req := httptest.NewRequest("POST", "/api/v1/admin/shutdown", nil)
		req.RemoteAddr = remote
		for k, v := range hdr {
			req.Header.Set(k, v)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec.Code
	}
	admin := map[string]string{"X-Roadmap-Admin": "shutdown"}
	if c := send("192.0.2.7:4000", admin); c != http.StatusForbidden {
		t.Fatalf("remote client: %d, want 403", c)
	}
	if c := send("127.0.0.1:4000", nil); c != http.StatusForbidden {
		t.Fatalf("loopback without header: %d, want 403", c)
	}
	if len(called) != 0 {
		t.Fatal("shutdown called by a rejected request")
	}
	if c := send("[::1]:4000", admin); c != http.StatusAccepted {
		t.Fatalf("loopback with header: %d, want 202", c)
	}
	<-called

	// Disabled when no Shutdown func is configured (e.g. in containers).
	h2 := newTestServer(t, store.NewMemory())
	req := httptest.NewRequest("POST", "/api/v1/admin/shutdown", nil)
	req.RemoteAddr = "127.0.0.1:4000"
	req.Header.Set("X-Roadmap-Admin", "shutdown")
	rec := httptest.NewRecorder()
	h2.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("disabled endpoint: %d, want 404", rec.Code)
	}
}
