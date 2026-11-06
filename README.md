# Cloud-Native Engineering Roadmap

An interview-prep learning platform for senior backend / cloud-native engineers. It has eight roadmaps:

| Roadmap | Covers |
|---|---|
| 🐹 **Go Engineering** | Core Go (weeks 1–8), then cloud-native Go (weeks 9–14): networking, security, containers, Kubernetes controllers, runtime internals, LLD. Also company tracks and LeetCode Top 30 |
| ☸️ **Kubernetes & Containers** | Virtualization vs containers, Docker, K8s architecture, workloads, networking, storage, scaling, security, GitOps, troubleshooting |
| ☁️ **Cloud (AWS & Azure)** | IAM, compute, VPC/VNet, load balancers & API gateways, storage, databases, messaging, IaC, reliability & cost |
| 🔐 **Security** | AuthN/AuthZ, sessions & cookies, JWT, OAuth 2.x, OIDC, SAML/SSO, RBAC/ABAC, cryptography, TLS & PKI, mTLS, OWASP |
| 🌐 **Networking** | OSI/TCP-IP, IP & subnetting, TCP/UDP/QUIC, HTTP, DNS, proxies, load balancers, API gateways, CDN, troubleshooting |
| 🏗️ **System Design** | Scalability, caching, data, distributed systems, messaging, microservices, classic HLD problems, LLD in Go |
| 🖥️ **Computer Architecture & OS** | CPU, caches, virtual memory, processes and threads, synchronization, I/O and epoll |
| 💾 **Storage** | Disks, block/file/object storage, RAID, file systems, B-tree and LSM storage engines, distributed and cloud storage, backup & DR |

Each module has study topics (a lesson, an interview tip and examples) and the most important practice problems (with difficulty, hints and solutions). It also has interview-focus Q&A, quick-check questions, resources and notes.

**Learning aids**
- 🎬 **Visual explainers.** These are animated diagrams placed inside the lessons: architecture diagrams, flowcharts and protocol sequences. Press ▶ to watch requests move between components, step through with ◀ ▶ or the arrow keys, click a box for details, or go full screen. All of them are collected at `#/visuals`.
- 🧪 **Interactive labs.** Simulators you can experiment with: a subnet calculator, consistent-hashing ring, rate limiter, JWT decoder, LRU/LFU cache, load-balancer algorithms, quorum (N/W/R), Go channels, HPA, latency numbers, availability nines, backoff with jitter, back-of-the-envelope estimation and RAID.
- 🧠 **Spaced-repetition review.** Flashcards and, optionally, every module's quick-check questions, scheduled with Leitner boxes. The cards you miss come back sooner. The dashboard and sidebar show how many cards are due.
- ▶ **Guided flow.** "Next up" on each roadmap and "Mark done & next topic" in each lesson. A module opens at your first unfinished topic.
- Progress tracking, a daily streak, search across all roadmaps (Ctrl+K, including the visuals), JSON export/import, and dark and light themes.

## Quick start

**No install.** Open `web/index.html` in a browser. Progress is saved in that browser's localStorage.

**One command, on any OS** (needs Go 1.25+; Node is optional and only used to validate content). On Windows `make` runs `make.cmd` (in PowerShell type `.\make`). On Linux and macOS it uses the `Makefile`. Both have the same tasks:

```bash
make run        # vet + test + validate, build, then start the app and open http://127.0.0.1:3000
make dist       # standalone binaries for Windows/Linux/macOS (amd64+arm64) in dist/, plus SHA256SUMS
make up         # run in Docker Compose on http://localhost:8080   (make down to stop)
make deploy     # build the image and roll it out to the current kubectl context
make            # list every task
```

Each binary embeds the web app and runs on its own. Progress is stored in SQLite in your user config folder.

`make deploy` works out how to get the image to the cluster. On kind it runs `kind load`, on minikube `minikube image load`, and Docker Desktop shares the local image store so nothing is copied. With a registry, push and deploy with `make deploy IMAGE=ghcr.io/you/roadmap VERSION=v1.0.0` (on Windows: `.\make deploy -Image ghcr.io/you/roadmap -Version v1.0.0`). Then open the app with `kubectl -n roadmap port-forward svc/roadmap 8080:80`.

## Install, upgrade and release

The commands are the same on every OS. In Windows PowerShell type `.\make <task>`; on Linux/macOS type `make <task>`. Run them from the `cloud-native-roadmap` folder.

This section is for a personal machine. To host the app on an Ubuntu server for everyone on the network (HTTPS, starts on boot, upgrades from GitHub), follow [deploy/ubuntu/README.md](deploy/ubuntu/README.md) instead.

### Install (first time)
```bash
make install     # vet + test + validate, build, install, add a Start menu / desktop entry
make start       # start it in the background and open http://127.0.0.1:3000
```
| | Windows | Linux / macOS |
|---|---|---|
| App | `%LOCALAPPDATA%\Programs\cloud-native-roadmap\roadmap-server.exe` | `~/.local/share/cloud-native-roadmap/roadmap-server` (linked from `~/.local/bin`) |
| Data (progress) | `%APPDATA%\go-roadmap\roadmap.db` | `~/.config/go-roadmap` (Linux) or `~/Library/Application Support/go-roadmap` (macOS) |
| Backups / logs | `<data>\backups`, `<data>\logs\server.log` | `<data>/backups`, `<data>/logs/server.log` |

### Upgrade (the app is already installed or running)
```bash
make upgrade
```
1. Runs the checks and builds the new version from source.
2. Finds every running copy: the installed app, a `bin\` or `dist\` build, or the legacy `docs\` server. It records each copy's address, data folder and arguments.
3. Stops each copy gracefully: through the loopback-only admin endpoint on Windows, or SIGTERM on Linux/macOS. It forces a stop only if that fails.
4. **Backs up the database after the stop**, so the snapshot holds every last write: `<data>/backups/roadmap-<time>-before-<version>.db`.
5. Keeps the previous binary as `roadmap-server.prev(.exe)` and replaces the binary in place.
6. Restarts each copy in the background with its original arguments. When the new version opens the database, it migrates the schema; if the schema changes, it takes its own snapshot first.
7. Waits until `/api/v1/version` reports the new version. If that doesn't happen, it **rolls back automatically**: it restores the previous binary and the database snapshot, then restarts the old version.

Open browser tabs show "The app was upgraded — Reload", and progress made during the restart is retried, not lost. Other commands:

```bash
make status      # source, installed and running versions; data folder; latest backup
make rollback    # swap back to the previous binary (run it again to roll forward)
make backup      # snapshot the database now (safe while the app runs)
make stop
```
To also restore the pre-upgrade database on rollback, use `.\make rollback -RestoreData` (Windows) or `RESTORE_DATA=1 make rollback` (Linux/macOS). To upgrade without Node or tests, use `.\make upgrade -SkipChecks` (Windows) or `SKIP_CHECKS=1 make upgrade` (Linux/macOS).

**Containers.** `make up` rebuilds and recreates the Compose service and keeps the `roadmap-data` volume. `make deploy` rolls the new image out to Kubernetes (strategy `Recreate`, so one writer at a time). In both cases the server snapshots the database to `/data/backups` before a schema migration. For a manual snapshot: `kubectl -n roadmap exec deploy/roadmap -- /roadmap-server -backup /data/backups/manual.db`.

### Versions and releases
`VERSION` (semver) is the single source of truth. It's stamped into the binary (`roadmap-server -version`), the UI (shown in the sidebar), `GET /api/v1/version`, the container image tag, and the dist file names. `make check` fails if `VERSION`, `web/js/version.js` and `CHANGELOG.md` disagree.

For every change:
1. Note it under **Unreleased** in `CHANGELOG.md`.
2. Bump the version: `make bump PART=patch` for fixes, `minor` for features or content, or `major` for changes that need manual action. On Windows: `.\make bump minor "what changed"`. This updates `VERSION`, `web/js/version.js` and the changelog.
3. Install it locally with `make upgrade`, and/or publish binaries with `make dist`, and/or roll it out with `make deploy`.

**Database changes** go in `internal/store/sqlite.go` as a new entry appended to `migrations`. Never edit a migration that has been released. A binary refuses to open a database written by a newer schema, so a rollback never silently corrupts data; restore the snapshot instead.

## Configuration

Flags override environment variables.

| Flag | Env | Default | Description |
|---|---|---|---|
| `-addr` | `ADDR` (or `PORT`) | `127.0.0.1:3000` | Listen address. If `PORT` is set, the server listens on all interfaces (`:PORT`) |
| `-data-dir` | `DATA_DIR` | `<user config dir>/go-roadmap` | Folder that holds `roadmap.db` |
| `-store` | `STORE` | `sqlite` | `sqlite` or `memory` |
| `-open` | `OPEN_BROWSER` | `false` | Open the browser on start |
| `-log-level` | `LOG_LEVEL` | `info` | `debug`, `info`, `warn` or `error` |
| `-log-format` | `LOG_FORMAT` | `text` | `text` or `json` |
| `-shutdown-timeout` | `SHUTDOWN_TIMEOUT` | `15s` | How long to wait for in-flight requests on shutdown |
| `-log-file` | `LOG_FILE` | (stdout) | Write logs to a file; it is rotated at 5 MiB. Used when the app runs in the background |

Other commands:
- `roadmap-server -version`
- `roadmap-server -backup FILE [-data-dir DIR]`: a consistent snapshot of the database, safe while the app is running.
- `roadmap-server -healthcheck`: exits with code 0 when the server is healthy.

## API

| Method & path | Purpose |
|---|---|
| `GET /healthz` | Liveness |
| `GET /readyz` | Readiness (pings the database) |
| `GET /api/v1/state` | Returns `{state, updatedAt}` |
| `PUT /api/v1/state` | Replaces the state. Body must be a JSON object of at most 1 MiB |
| `DELETE /api/v1/state` | Clears the saved state |
| `GET /api/v1/version` | Returns `{version, schema}`. The UI uses it to offer a reload after an upgrade |
| `POST /api/v1/admin/shutdown` | Graceful shutdown for local upgrades. It is enabled only when the server listens on loopback, and requires a loopback client and the `X-Roadmap-Admin: shutdown` header |

## Architecture

```
cmd/server/          entrypoint: config, signal handling, graceful shutdown
internal/config/     flags + env (12-factor)
internal/store/      Store interface; SQLite (pure Go, no CGO) and in-memory implementations
internal/httpapi/    routes, handlers, middleware (request ID, access log, panic recovery, CSP/security headers)
web/                 the SPA, embedded into the binary with go:embed
  js/app.js          hash router, rendering, state & sync, search, flashcards
  js/data/*.js       one content file per roadmap (registerRoadmap({...}))
  js/visuals/*.js    animated diagrams per roadmap + labs.js (registerDiagram({...}))
  js/diagrams.js     diagram renderer and player (SVG, step animation, CSP-safe)
  js/widgets.js      interactive labs (registerWidget(...))
scripts/             validate-content.js (content + diagram geometry checks), make.ps1 (Windows task runner)
deploy/              Kubernetes manifest; compose.yaml for Docker Compose
```

- **Progress sync.** The browser always writes to localStorage. When the page is served by the Go server, it also mirrors progress to SQLite (debounced `PUT`), and on load the newer copy wins.
- **Security.** Pages are served same-origin only (no CORS). The Content-Security-Policy is strict (`script-src 'self'`), so the frontend uses no inline handlers. Request bodies are size-limited, and the server sets timeouts on every connection.
- **Upgrading from the old `docs/` app.** The server reuses the old data folder and imports the legacy `user_state` table. The browser migrates the old `go_roadmap_v2` localStorage key. Existing checkmarks, notes and streaks are kept.

## Development

```bash
make check                                # go vet, go test, content + visuals validation
make dev                                  # run from source (go run) without checks
node scripts/validate-content.js          # validate content and visuals only
```

To add or edit content, or to add diagrams, see [CONTRIBUTING.md](CONTRIBUTING.md) for the schemas and rules.
