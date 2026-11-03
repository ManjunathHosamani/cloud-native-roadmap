package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "modernc.org/sqlite" // pure-Go driver: no CGO / GCC required
)

// SQLite is a Store backed by a local SQLite database file.
type SQLite struct {
	db   *sql.DB
	info OpenInfo
}

// SQLiteOptions configures OpenSQLite.
type SQLiteOptions struct {
	// AppVersion is recorded in the database so upgrades can be traced.
	AppVersion string
	// BackupDir receives a snapshot of the database before any schema change.
	// Empty disables the automatic pre-migration backup.
	BackupDir string
	// KeepBackups is how many snapshots to keep in BackupDir (default 10).
	KeepBackups int
}

// OpenInfo describes what OpenSQLite found and did.
type OpenInfo struct {
	FromSchema      int    // schema version before opening
	ToSchema        int    // schema version after migrations
	Backup          string // path of the pre-migration snapshot, if one was taken
	PreviousVersion string // app version that last opened the database ("" if unknown)
}

// ErrSchemaTooNew means the database was written by a newer release.
var ErrSchemaTooNew = errors.New("database schema is newer than this binary supports")

// migrations[i] upgrades the schema from version i to i+1. Append only: never
// edit or reorder a released migration. Each runs in its own transaction
// together with the PRAGMA user_version bump, so a failure leaves the
// database at the previous version.
var migrations = []func(ctx context.Context, tx *sql.Tx) error{
	migrateAppState,
	migrateAppMeta,
}

// SchemaVersion is the schema version this binary writes.
var SchemaVersion = len(migrations)

// v1: the progress table, plus a one-time import from the legacy server's
// user_state table. Idempotent, because v1.0 databases have the table but
// user_version 0.
func migrateAppState(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS app_state (
			profile    TEXT PRIMARY KEY,
			state      TEXT NOT NULL,
			updated_at TEXT NOT NULL
		)`); err != nil {
		return fmt.Errorf("create app_state: %w", err)
	}
	var legacy int
	if err := tx.QueryRowContext(ctx,
		`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='user_state'`).Scan(&legacy); err != nil {
		return fmt.Errorf("inspect schema: %w", err)
	}
	if legacy == 0 {
		return nil
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT OR IGNORE INTO app_state (profile, state, updated_at)
		SELECT ?, state_json, strftime('%Y-%m-%dT%H:%M:%fZ', COALESCE(updated_at, CURRENT_TIMESTAMP))
		FROM user_state WHERE id = 1 AND state_json NOT IN ('', '{}')`, DefaultProfile); err != nil {
		return fmt.Errorf("import legacy state: %w", err)
	}
	return nil
}

// v2: key/value metadata (which app versions have opened this database).
func migrateAppMeta(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
	return err
}

func dsn(path string) string {
	q := url.Values{}
	q.Add("_pragma", "busy_timeout(5000)")
	q.Add("_pragma", "journal_mode(WAL)")
	q.Add("_pragma", "synchronous(NORMAL)")
	return "file:" + path + "?" + q.Encode()
}

// OpenSQLite opens (creating if needed) the database at path and migrates it
// to SchemaVersion, snapshotting it first when the schema is about to change.
func OpenSQLite(ctx context.Context, path string, opts SQLiteOptions) (*SQLite, error) {
	db, err := sql.Open("sqlite", dsn(path))
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	// SQLite allows one writer at a time; a single connection avoids SQLITE_BUSY.
	db.SetMaxOpenConns(1)

	s := &SQLite{db: db}
	if err := s.migrate(ctx, opts); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

// Info reports the migration outcome of OpenSQLite.
func (s *SQLite) Info() OpenInfo { return s.info }

func (s *SQLite) migrate(ctx context.Context, opts SQLiteOptions) error {
	var cur, tables int
	if err := s.db.QueryRowContext(ctx, `PRAGMA user_version`).Scan(&cur); err != nil {
		return fmt.Errorf("migrate: read schema version: %w", err)
	}
	s.info.FromSchema, s.info.ToSchema = cur, cur
	if cur > SchemaVersion {
		return fmt.Errorf("%w (database v%d, binary v%d): upgrade the app or restore a backup", ErrSchemaTooNew, cur, SchemaVersion)
	}
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM sqlite_master WHERE type='table'`).Scan(&tables); err != nil {
		return fmt.Errorf("migrate: inspect schema: %w", err)
	}

	if cur < SchemaVersion && tables > 0 && opts.BackupDir != "" {
		name := fmt.Sprintf("roadmap-%s-schema%d-before-upgrade.db", time.Now().UTC().Format("20060102T150405Z"), cur)
		dest := filepath.Join(opts.BackupDir, name)
		if err := vacuumInto(ctx, s.db, dest); err != nil {
			return fmt.Errorf("migrate: pre-upgrade backup: %w", err)
		}
		s.info.Backup = dest
		pruneBackups(opts.BackupDir, opts.KeepBackups)
	}

	for v := cur; v < SchemaVersion; v++ {
		tx, err := s.db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("migrate to v%d: %w", v+1, err)
		}
		if err := migrations[v](ctx, tx); err != nil {
			tx.Rollback()
			return fmt.Errorf("migrate to v%d: %w", v+1, err)
		}
		if _, err := tx.ExecContext(ctx, fmt.Sprintf(`PRAGMA user_version = %d`, v+1)); err != nil {
			tx.Rollback()
			return fmt.Errorf("migrate to v%d: set version: %w", v+1, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("migrate to v%d: commit: %w", v+1, err)
		}
		s.info.ToSchema = v + 1
	}

	_ = s.db.QueryRowContext(ctx, `SELECT value FROM app_meta WHERE key = 'app_version'`).Scan(&s.info.PreviousVersion)
	if opts.AppVersion != "" && opts.AppVersion != s.info.PreviousVersion {
		now := time.Now().UTC().Format(time.RFC3339)
		if _, err := s.db.ExecContext(ctx, `
			INSERT INTO app_meta (key, value) VALUES ('app_version', ?), ('app_version_since', ?), ('previous_app_version', ?)
			ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
			opts.AppVersion, now, s.info.PreviousVersion); err != nil {
			return fmt.Errorf("migrate: record app version: %w", err)
		}
	}
	return nil
}

// vacuumInto writes a consistent, compacted copy of the database to dest.
// It is safe while other connections (or another process) use the database.
func vacuumInto(ctx context.Context, db *sql.DB, dest string) error {
	if err := os.MkdirAll(filepath.Dir(dest), 0o750); err != nil {
		return err
	}
	if _, err := os.Stat(dest); err == nil {
		return fmt.Errorf("%s already exists", dest)
	}
	_, err := db.ExecContext(ctx, `VACUUM INTO ?`, dest)
	return err
}

// Backup snapshots the database file at src into dest without migrating it,
// so it works on databases written by older or newer releases.
func Backup(ctx context.Context, src, dest string) error {
	if _, err := os.Stat(src); err != nil {
		return fmt.Errorf("backup: %w", err)
	}
	db, err := sql.Open("sqlite", dsn(src))
	if err != nil {
		return fmt.Errorf("backup: open: %w", err)
	}
	defer db.Close()
	if err := vacuumInto(ctx, db, dest); err != nil {
		return fmt.Errorf("backup: %w", err)
	}
	return nil
}

// pruneBackups keeps the newest keep roadmap-*.db files in dir.
func pruneBackups(dir string, keep int) {
	if keep <= 0 {
		keep = 10
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "roadmap-") && strings.HasSuffix(e.Name(), ".db") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names) // names start with a UTC timestamp, so this is oldest first
	for len(names) > keep {
		os.Remove(filepath.Join(dir, names[0]))
		names = names[1:]
	}
}

func (s *SQLite) Get(ctx context.Context, profile string) (State, error) {
	var data, updated string
	err := s.db.QueryRowContext(ctx,
		`SELECT state, updated_at FROM app_state WHERE profile = ?`, profile).Scan(&data, &updated)
	if errors.Is(err, sql.ErrNoRows) {
		return State{Data: emptyObject}, nil
	}
	if err != nil {
		return State{}, fmt.Errorf("get state: %w", err)
	}
	t, _ := time.Parse(time.RFC3339Nano, updated)
	return State{Data: json.RawMessage(data), UpdatedAt: t}, nil
}

func (s *SQLite) Put(ctx context.Context, profile string, data json.RawMessage) (State, error) {
	if err := Validate(data); err != nil {
		return State{}, err
	}
	now := time.Now().UTC()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO app_state (profile, state, updated_at) VALUES (?, ?, ?)
		ON CONFLICT(profile) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
		profile, string(data), now.Format(time.RFC3339Nano))
	if err != nil {
		return State{}, fmt.Errorf("put state: %w", err)
	}
	return State{Data: data, UpdatedAt: now}, nil
}

func (s *SQLite) Delete(ctx context.Context, profile string) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM app_state WHERE profile = ?`, profile); err != nil {
		return fmt.Errorf("delete state: %w", err)
	}
	return nil
}

func (s *SQLite) Ping(ctx context.Context) error { return s.db.PingContext(ctx) }
func (s *SQLite) Close() error                   { return s.db.Close() }
