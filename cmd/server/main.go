// Command server serves the Cloud-Native Engineering Roadmap SPA and persists
// learner progress in SQLite.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"cloud-native-roadmap/internal/config"
	"cloud-native-roadmap/internal/httpapi"
	"cloud-native-roadmap/internal/store"
	"cloud-native-roadmap/web"
)

// version is overridden at build time: -ldflags "-X main.version=1.2.3".
var version = "dev"

// Commands other than serving (used by Docker health checks and the upgrade scripts):
//
//	roadmap-server -version                         print the version
//	roadmap-server -healthcheck [-addr A]           GET /healthz; exit 0 if healthy
//	roadmap-server -backup FILE [-data-dir D]       consistent snapshot of the database
func main() {
	if len(os.Args) > 1 {
		switch strings.TrimLeft(os.Args[1], "-") {
		case "version":
			fmt.Println(version)
			return
		case "healthcheck":
			os.Exit(healthcheck(os.Args[2:]))
		case "backup":
			os.Exit(backup(os.Args[2:]))
		}
	}
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load(os.Args[1:], os.Getenv)
	if err != nil {
		return err
	}
	log, closeLog, err := newLogger(cfg)
	if err != nil {
		return err
	}
	defer closeLog()
	slog.SetDefault(log)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	st, err := openStore(ctx, cfg, log)
	if err != nil {
		return err
	}
	defer st.Close()

	// The admin shutdown endpoint (used by "make upgrade") is only enabled when
	// the server listens on loopback, i.e. on a developer machine.
	adminStop := make(chan struct{})
	var stopOnce sync.Once
	var shutdownHook func()
	if isLoopback(cfg.Addr) {
		shutdownHook = func() { stopOnce.Do(func() { close(adminStop) }) }
	}

	handler, err := httpapi.New(httpapi.Options{
		Store: st, Static: web.Assets, Logger: log,
		Version: version, Schema: store.SchemaVersion, Shutdown: shutdownHook,
	})
	if err != nil {
		return err
	}

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    64 << 10,
		ErrorLog:          slog.NewLogLogger(log.Handler(), slog.LevelWarn),
	}

	// Bind before announcing so "listening" really means ready to accept.
	ln, err := net.Listen("tcp", cfg.Addr)
	if err != nil {
		return fmt.Errorf("listen on %s: %w", cfg.Addr, err)
	}
	url := "http://" + browsableAddr(ln.Addr())
	log.Info("server started", "version", version, "url", url, "store", cfg.Store, "data_dir", cfg.DataDir)

	serveErr := make(chan error, 1)
	go func() { serveErr <- srv.Serve(ln) }()

	if cfg.OpenBrowser {
		openBrowser(log, url)
	}

	select {
	case err := <-serveErr:
		if !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve: %w", err)
		}
		return nil
	case <-ctx.Done():
	case <-adminStop:
	}

	stop() // a second signal now terminates immediately
	log.Info("shutting down", "timeout", cfg.ShutdownTimeout)
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	log.Info("server stopped")
	return nil
}

// healthcheck GETs /healthz on the configured address and returns the process exit code.
func healthcheck(args []string) int {
	cfg, err := config.Load(args, os.Getenv)
	if err != nil {
		fmt.Fprintln(os.Stderr, "healthcheck:", err)
		return 1
	}
	host, port, err := net.SplitHostPort(cfg.Addr)
	if err != nil {
		fmt.Fprintln(os.Stderr, "healthcheck:", err)
		return 1
	}
	if ip := net.ParseIP(host); host == "" || (ip != nil && ip.IsUnspecified()) {
		host = "127.0.0.1"
	}
	client := http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://" + net.JoinHostPort(host, port) + "/healthz")
	if err != nil {
		fmt.Fprintln(os.Stderr, "healthcheck:", err)
		return 1
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		fmt.Fprintln(os.Stderr, "healthcheck: status", resp.StatusCode)
		return 1
	}
	return 0
}

// newLogger logs to stdout, or to cfg.LogFile when the server runs detached
// (as started by "make start/upgrade"). The file is rotated to .prev at 5 MiB.
func newLogger(cfg config.Config) (*slog.Logger, func(), error) {
	var w io.Writer = os.Stdout
	closeFn := func() {}
	if cfg.LogFile != "" {
		if err := os.MkdirAll(filepath.Dir(cfg.LogFile), 0o750); err != nil {
			return nil, nil, fmt.Errorf("log file: %w", err)
		}
		if fi, err := os.Stat(cfg.LogFile); err == nil && fi.Size() > 5<<20 {
			os.Rename(cfg.LogFile, cfg.LogFile+".prev")
		}
		f, err := os.OpenFile(cfg.LogFile, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o640)
		if err != nil {
			return nil, nil, fmt.Errorf("log file: %w", err)
		}
		w, closeFn = f, func() { f.Close() }
	}
	opts := &slog.HandlerOptions{Level: cfg.LogLevel}
	if cfg.LogFormat == "json" {
		return slog.New(slog.NewJSONHandler(w, opts)), closeFn, nil
	}
	return slog.New(slog.NewTextHandler(w, opts)), closeFn, nil
}

func openStore(ctx context.Context, cfg config.Config, log *slog.Logger) (store.Store, error) {
	if cfg.Store == "memory" {
		return store.NewMemory(), nil
	}
	if err := os.MkdirAll(cfg.DataDir, 0o750); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}
	st, err := store.OpenSQLite(ctx, filepath.Join(cfg.DataDir, "roadmap.db"), store.SQLiteOptions{
		AppVersion: version,
		BackupDir:  filepath.Join(cfg.DataDir, "backups"),
	})
	if err != nil {
		return nil, err
	}
	info := st.Info()
	if info.FromSchema != info.ToSchema {
		log.Info("database migrated", "from_schema", info.FromSchema, "to_schema", info.ToSchema, "backup", info.Backup)
	}
	if info.PreviousVersion != "" && info.PreviousVersion != version {
		log.Info("upgraded", "from_version", info.PreviousVersion, "to_version", version)
	}
	return st, nil
}

// backup writes a consistent copy of the database to the given file. It does
// not migrate, so it is safe to run with a newer binary against an older
// database (and while the server is running).
func backup(args []string) int {
	if len(args) == 0 || strings.HasPrefix(args[0], "-") {
		fmt.Fprintln(os.Stderr, "usage: roadmap-server -backup FILE [-data-dir DIR]")
		return 2
	}
	cfg, err := config.Load(args[1:], os.Getenv)
	if err != nil {
		fmt.Fprintln(os.Stderr, "backup:", err)
		return 2
	}
	src := filepath.Join(cfg.DataDir, "roadmap.db")
	if _, err := os.Stat(src); errors.Is(err, os.ErrNotExist) {
		fmt.Fprintln(os.Stderr, "backup: no database at", src)
		return 3
	}
	if err := store.Backup(context.Background(), src, args[0]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}
	fmt.Println(args[0])
	return 0
}

func isLoopback(addr string) bool {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return false
	}
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

// browsableAddr turns a wildcard listen address into one a browser can open.
func browsableAddr(a net.Addr) string {
	tcp, ok := a.(*net.TCPAddr)
	if !ok || tcp.IP.IsUnspecified() {
		if ok {
			return fmt.Sprintf("localhost:%d", tcp.Port)
		}
		return a.String()
	}
	return tcp.String()
}

func openBrowser(log *slog.Logger, url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		log.Warn("could not open browser", "err", err)
		return
	}
	go cmd.Wait() // reap the child process
}
