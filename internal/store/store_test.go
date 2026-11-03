package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func backends(t *testing.T) map[string]Store {
	t.Helper()
	sq, err := OpenSQLite(context.Background(), filepath.Join(t.TempDir(), "test.db"), SQLiteOptions{})
	if err != nil {
		t.Fatalf("OpenSQLite: %v", err)
	}
	t.Cleanup(func() { sq.Close() })
	return map[string]Store{"memory": NewMemory(), "sqlite": sq}
}

func TestStoreRoundTrip(t *testing.T) {
	ctx := context.Background()
	for name, s := range backends(t) {
		t.Run(name, func(t *testing.T) {
			got, err := s.Get(ctx, DefaultProfile)
			if err != nil {
				t.Fatalf("Get empty: %v", err)
			}
			if string(got.Data) != "{}" || !got.UpdatedAt.IsZero() {
				t.Fatalf("empty state = %s @ %v, want {} @ zero", got.Data, got.UpdatedAt)
			}

			doc := json.RawMessage(`{"checks":{"w1_topic_0":true}}`)
			put, err := s.Put(ctx, DefaultProfile, doc)
			if err != nil {
				t.Fatalf("Put: %v", err)
			}
			if put.UpdatedAt.IsZero() {
				t.Fatal("Put returned zero UpdatedAt")
			}

			got, err = s.Get(ctx, DefaultProfile)
			if err != nil {
				t.Fatalf("Get: %v", err)
			}
			if string(got.Data) != string(doc) {
				t.Fatalf("Get = %s, want %s", got.Data, doc)
			}
			if !got.UpdatedAt.Equal(put.UpdatedAt) {
				t.Fatalf("UpdatedAt = %v, want %v", got.UpdatedAt, put.UpdatedAt)
			}

			if other, _ := s.Get(ctx, "someone-else"); string(other.Data) != "{}" {
				t.Fatalf("profiles not isolated: %s", other.Data)
			}

			if err := s.Delete(ctx, DefaultProfile); err != nil {
				t.Fatalf("Delete: %v", err)
			}
			if got, _ = s.Get(ctx, DefaultProfile); string(got.Data) != "{}" {
				t.Fatalf("after Delete = %s, want {}", got.Data)
			}
		})
	}
}

func TestStoreRejectsNonObjects(t *testing.T) {
	ctx := context.Background()
	for name, s := range backends(t) {
		t.Run(name, func(t *testing.T) {
			for _, bad := range []string{``, `null`, `[]`, `"x"`, `42`, `{"a":`} {
				if _, err := s.Put(ctx, DefaultProfile, json.RawMessage(bad)); !errors.Is(err, ErrInvalidState) {
					t.Errorf("Put(%q) err = %v, want ErrInvalidState", bad, err)
				}
			}
		})
	}
}

func TestSQLiteImportsLegacyState(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "legacy.db")

	// Recreate the schema written by the original single-file server.
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`
		CREATE TABLE user_state (id INTEGER PRIMARY KEY DEFAULT 1, state_json TEXT NOT NULL DEFAULT '{}',
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
		INSERT INTO user_state (id, state_json) VALUES (1, '{"checks":{"w2_prob_3":true}}');`)
	db.Close()
	if err != nil {
		t.Fatal(err)
	}

	s, err := OpenSQLite(ctx, path, SQLiteOptions{})
	if err != nil {
		t.Fatalf("OpenSQLite: %v", err)
	}
	defer s.Close()

	got, err := s.Get(ctx, DefaultProfile)
	if err != nil {
		t.Fatal(err)
	}
	if string(got.Data) != `{"checks":{"w2_prob_3":true}}` {
		t.Fatalf("legacy state not imported: %s", got.Data)
	}
	if got.UpdatedAt.IsZero() {
		t.Fatal("legacy UpdatedAt not parsed")
	}
}

// A database written by v1.0 (app_state table, user_version 0) must be backed
// up, migrated to the current schema and keep its data.
func TestSQLiteUpgradesV1Database(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	path := filepath.Join(dir, "roadmap.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`
		CREATE TABLE app_state (profile TEXT PRIMARY KEY, state TEXT NOT NULL, updated_at TEXT NOT NULL);
		INSERT INTO app_state VALUES ('default', '{"checks":{"go_m9_topic_0":true}}', '2026-10-01T10:00:00Z');`)
	db.Close()
	if err != nil {
		t.Fatal(err)
	}

	backups := filepath.Join(dir, "backups")
	s, err := OpenSQLite(ctx, path, SQLiteOptions{AppVersion: "1.2.0", BackupDir: backups})
	if err != nil {
		t.Fatalf("OpenSQLite: %v", err)
	}
	info := s.Info()
	if info.FromSchema != 0 || info.ToSchema != SchemaVersion {
		t.Fatalf("schema %d -> %d, want 0 -> %d", info.FromSchema, info.ToSchema, SchemaVersion)
	}
	if info.Backup == "" {
		t.Fatal("no pre-upgrade backup taken")
	}
	got, _ := s.Get(ctx, DefaultProfile)
	if string(got.Data) != `{"checks":{"go_m9_topic_0":true}}` {
		t.Fatalf("data lost in migration: %s", got.Data)
	}
	s.Close()

	// The snapshot is a complete, openable copy of the old database.
	snap, err := sql.Open("sqlite", info.Backup)
	if err != nil {
		t.Fatal(err)
	}
	var state string
	var ver int
	snap.QueryRow(`SELECT state FROM app_state`).Scan(&state)
	snap.QueryRow(`PRAGMA user_version`).Scan(&ver)
	snap.Close()
	if state != `{"checks":{"go_m9_topic_0":true}}` || ver != 0 {
		t.Fatalf("backup = %q (schema %d), want original data at schema 0", state, ver)
	}

	// Re-opening a current database takes no new backup and remembers the version.
	s, err = OpenSQLite(ctx, path, SQLiteOptions{AppVersion: "1.3.0", BackupDir: backups})
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	if s.Info().Backup != "" {
		t.Fatal("backup taken although schema was current")
	}
	if s.Info().PreviousVersion != "1.2.0" {
		t.Fatalf("PreviousVersion = %q, want 1.2.0", s.Info().PreviousVersion)
	}
}

func TestSQLiteRefusesNewerSchema(t *testing.T) {
	path := filepath.Join(t.TempDir(), "future.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	db.Exec(`CREATE TABLE app_state (profile TEXT PRIMARY KEY, state TEXT, updated_at TEXT); PRAGMA user_version = 99`)
	db.Close()
	if _, err := OpenSQLite(context.Background(), path, SQLiteOptions{}); !errors.Is(err, ErrSchemaTooNew) {
		t.Fatalf("err = %v, want ErrSchemaTooNew", err)
	}
}

func TestBackupAndPrune(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	path := filepath.Join(dir, "roadmap.db")
	s, err := OpenSQLite(ctx, path, SQLiteOptions{})
	if err != nil {
		t.Fatal(err)
	}
	s.Put(ctx, DefaultProfile, json.RawMessage(`{"checks":{"a":true}}`))
	// Backup works while the database is open (as during a live upgrade).
	dest := filepath.Join(dir, "out", "copy.db")
	if err := Backup(ctx, path, dest); err != nil {
		t.Fatalf("Backup: %v", err)
	}
	s.Close()
	if err := Backup(ctx, path, dest); err == nil {
		t.Fatal("Backup overwrote an existing file")
	}
	if err := Backup(ctx, filepath.Join(dir, "missing.db"), filepath.Join(dir, "x.db")); err == nil {
		t.Fatal("Backup of a missing database succeeded")
	}

	bdir := filepath.Join(dir, "backups")
	os.MkdirAll(bdir, 0o750)
	for _, n := range []string{"roadmap-20260101T000000Z-a.db", "roadmap-20260102T000000Z-b.db", "roadmap-20260103T000000Z-c.db", "notes.txt"} {
		os.WriteFile(filepath.Join(bdir, n), nil, 0o600)
	}
	pruneBackups(bdir, 2)
	left, _ := os.ReadDir(bdir)
	var names []string
	for _, e := range left {
		names = append(names, e.Name())
	}
	if len(names) != 3 || names[0] != "notes.txt" || names[1] != "roadmap-20260102T000000Z-b.db" {
		t.Fatalf("after prune: %v", names)
	}
}
