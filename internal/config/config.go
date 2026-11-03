// Package config loads server configuration from flags and environment
// variables (12-factor). Flags take precedence over environment variables.
package config

import (
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Config holds runtime settings for the server.
type Config struct {
	Addr            string        // listen address, e.g. 127.0.0.1:3000
	DataDir         string        // directory holding roadmap.db
	Store           string        // "sqlite" or "memory"
	OpenBrowser     bool          // open the default browser on start
	LogLevel        slog.Level    // debug | info | warn | error
	LogFormat       string        // "text" or "json"
	LogFile         string        // write logs to this file instead of stdout ("" = stdout)
	ShutdownTimeout time.Duration // grace period for in-flight requests
}

// Load parses args (without the program name) using env as the fallback source.
func Load(args []string, getenv func(string) string) (Config, error) {
	envOr := func(key, def string) string {
		if v := strings.TrimSpace(getenv(key)); v != "" {
			return v
		}
		return def
	}

	defAddr := envOr("ADDR", "127.0.0.1:3000")
	if p := getenv("PORT"); p != "" && getenv("ADDR") == "" {
		defAddr = ":" + p // PaaS convention: PORT implies all interfaces
	}
	defOpen, _ := strconv.ParseBool(envOr("OPEN_BROWSER", "false"))
	defShutdown, err := time.ParseDuration(envOr("SHUTDOWN_TIMEOUT", "15s"))
	if err != nil {
		return Config{}, fmt.Errorf("SHUTDOWN_TIMEOUT: %w", err)
	}

	var c Config
	var level string
	fs := flag.NewFlagSet("roadmap-server", flag.ContinueOnError)
	fs.StringVar(&c.Addr, "addr", defAddr, "listen address (env ADDR, or PORT)")
	fs.StringVar(&c.DataDir, "data-dir", envOr("DATA_DIR", defaultDataDir()), "data directory (env DATA_DIR)")
	fs.StringVar(&c.Store, "store", envOr("STORE", "sqlite"), "storage backend: sqlite | memory (env STORE)")
	fs.BoolVar(&c.OpenBrowser, "open", defOpen, "open the browser on start (env OPEN_BROWSER)")
	fs.StringVar(&level, "log-level", envOr("LOG_LEVEL", "info"), "log level: debug | info | warn | error (env LOG_LEVEL)")
	fs.StringVar(&c.LogFormat, "log-format", envOr("LOG_FORMAT", "text"), "log format: text | json (env LOG_FORMAT)")
	fs.StringVar(&c.LogFile, "log-file", envOr("LOG_FILE", ""), "write logs to this file instead of stdout (env LOG_FILE)")
	fs.DurationVar(&c.ShutdownTimeout, "shutdown-timeout", defShutdown, "graceful shutdown timeout (env SHUTDOWN_TIMEOUT)")
	if err := fs.Parse(args); err != nil {
		return Config{}, err
	}

	if err := c.LogLevel.UnmarshalText([]byte(level)); err != nil {
		return Config{}, fmt.Errorf("log level: %w", err)
	}
	if c.Store != "sqlite" && c.Store != "memory" {
		return Config{}, fmt.Errorf("unknown store %q (want sqlite or memory)", c.Store)
	}
	if c.LogFormat != "text" && c.LogFormat != "json" {
		return Config{}, fmt.Errorf("unknown log format %q (want text or json)", c.LogFormat)
	}
	return c, nil
}

// defaultDataDir keeps the legacy location so existing progress is picked up.
func defaultDataDir() string {
	if dir, err := os.UserConfigDir(); err == nil {
		return filepath.Join(dir, "go-roadmap")
	}
	return "data"
}
