package config

import (
	"log/slog"
	"testing"
	"time"
)

func env(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

func TestLoad(t *testing.T) {
	tests := []struct {
		name    string
		args    []string
		env     map[string]string
		check   func(t *testing.T, c Config)
		wantErr bool
	}{
		{
			name: "defaults are local-only",
			check: func(t *testing.T, c Config) {
				if c.Addr != "127.0.0.1:3000" || c.Store != "sqlite" || c.OpenBrowser || c.LogLevel != slog.LevelInfo {
					t.Errorf("unexpected defaults: %+v", c)
				}
			},
		},
		{
			name: "PORT binds all interfaces",
			env:  map[string]string{"PORT": "8080"},
			check: func(t *testing.T, c Config) {
				if c.Addr != ":8080" {
					t.Errorf("Addr = %q, want :8080", c.Addr)
				}
			},
		},
		{
			name: "ADDR wins over PORT",
			env:  map[string]string{"PORT": "8080", "ADDR": "0.0.0.0:9000"},
			check: func(t *testing.T, c Config) {
				if c.Addr != "0.0.0.0:9000" {
					t.Errorf("Addr = %q", c.Addr)
				}
			},
		},
		{
			name: "flags win over env",
			args: []string{"-addr", ":1", "-store", "memory", "-open", "-log-level", "debug", "-shutdown-timeout", "3s"},
			env:  map[string]string{"ADDR": ":2", "STORE": "sqlite"},
			check: func(t *testing.T, c Config) {
				if c.Addr != ":1" || c.Store != "memory" || !c.OpenBrowser || c.LogLevel != slog.LevelDebug || c.ShutdownTimeout != 3*time.Second {
					t.Errorf("flags not applied: %+v", c)
				}
			},
		},
		{name: "bad store", env: map[string]string{"STORE": "postgres"}, wantErr: true},
		{name: "bad log level", args: []string{"-log-level", "loud"}, wantErr: true},
		{name: "bad duration", env: map[string]string{"SHUTDOWN_TIMEOUT": "soon"}, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, err := Load(tt.args, env(tt.env))
			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.check != nil {
				tt.check(t, c)
			}
		})
	}
}
