# Implementation Plan — Cloud-Native Engineering Roadmap

Redesign of the former `docs/` Go interview-prep app into a production-ready,
multi-roadmap learning platform: **Go** plus standalone roadmaps for
**Kubernetes & Containers, Cloud (AWS/Azure), Security, Networking,
System Design (HLD + LLD), Computer Architecture & OS, and Storage**.

## 1. Audit of the original `docs/` folder

| Item | Finding | Action |
|---|---|---|
| `go_learning_roadmap_v2.html` + `roadmap-*.js/css` | The live SPA | Re-architected into `web/` |
| `server/main.go` | Single-file server; wildcard CORS, no timeouts, no graceful shutdown, static path guessing, port-based backend detection in JS | Rewritten as `cmd/` + `internal/` with embedded assets |
| `go-roadmap-server.exe`, `.exe~` (30 MB) | Build artefacts / editor backup | Deleted |
| `go_learning_roadmap.html` (290 KB) | Legacy v1 monolith, superseded | Deleted |
| `roadmap-curriculum.js.bak` | Stale backup | Deleted |
| `week7.json` | Orphan — already inlined in curriculum | Deleted |
| `go_learning_roadmap_prompt.md` | Content-generation prompt, superseded by data files | Deleted |
| `install.bat`, `start.bat` | Replaced by `Makefile` + `scripts/` | Deleted |

### Bugs found and fixed
1. **W2 / W3 study content misaligned** — `topicStudy[i]` didn't match `topics[i]` (e.g. "new vs make" showed the Priority Queue lesson).
2. **Company-track progress IDs collided** — `w9_tprob_0` was shared by all five tracks.
3. **`Generic max` solution didn't compile** — `comparable` does not permit `>`; now `cmp.Ordered`.
4. Backend detection relied on `location.port === '3000'` → now probes `/api/v1/health`.
5. README claimed GCC was required — the driver (`modernc.org/sqlite`) is pure Go.
6. Exercism links were mapped but never rendered.

## 2. Target architecture

```
cloud-native-roadmap/
├── cmd/server/main.go          # entrypoint: config, signals, graceful shutdown
├── internal/
│   ├── config/                 # env + flag config (12-factor)
│   ├── store/                  # Store interface, SQLite + in-memory impls, tests
│   └── httpapi/                # router, handlers, middleware, tests
├── web/                        # embedded into the binary via go:embed
│   ├── index.html
│   ├── css/app.css
│   ├── js/app.js               # SPA engine (hash router, render, search, state)
│   └── js/data/*.js            # one content file per roadmap (self-registering)
├── scripts/validate-content.js # schema validator for all roadmap data
├── deploy/                     # Dockerfile-adjacent k8s manifests
├── Dockerfile                  # multi-stage, distroless, non-root
├── Makefile, make.cmd           # same tasks on Linux/macOS and Windows (scripts/make.ps1)
└── README.md
```

### Backend (Go)
- `net/http` (Go 1.22+ method routing), `log/slog` JSON logs, `http.Server` timeouts.
- Graceful shutdown on SIGINT/SIGTERM; `/healthz` (liveness) and `/readyz` (DB ping).
- API: `GET/PUT/DELETE /api/v1/state` (1 MiB body cap, JSON validation).
- Middleware: request ID, structured access log, panic recovery, security headers (CSP, nosniff, frame-deny).
- Same-origin only (no wildcard CORS). Config via env/flags: `PORT`, `DATA_DIR`, `OPEN_BROWSER`, `LOG_LEVEL`.
- Single static binary — web assets embedded with `go:embed`.
- Unit tests for store and handlers (`go test ./...`).

### Frontend
- Multi-roadmap registry: each `js/data/*.js` calls `registerRoadmap({...})`.
- Hash routing (`#/k8s/m3/study`) → deep links, back/forward, bookmarkable.
- Normalised content schema (string or object topics/problems) so old and new data coexist.
- Problems carry difficulty, type (coding / design / hands-on), hints and solutions.
- Per-roadmap progress, global dashboard, flashcards filterable by roadmap.
- Universal search (Ctrl+K) across all roadmaps; progress export/import (JSON).
- Works offline from `file://` (localStorage) or via server (SQLite sync).
- Progress-key migration keeps existing user progress.

## 3. Content plan

### Go roadmap (existing W1–W8 kept and fixed, new W9–W14 added)
| Week | Module | Covers your topics |
|---|---|---|
| 9 | Network Programming in Go | TCP/UDP, DNS, reverse proxy, load balancer, gRPC |
| 10 | Security in Go | TLS/mTLS, certs, JWT, OAuth2/OIDC, sessions/cookies, RBAC |
| 11 | Cloud-Native Go Services | Docker, 12-factor, probes, graceful shutdown, observability, scaling |
| 12 | Kubernetes Programming with Go | client-go, informers, controllers, operators, CRDs |
| 13 | Go Runtime Internals & Performance | scheduler, GC, CPU caches, computer architecture |
| 14 | System Design & LLD in Go | patterns, LLD problems, distributed building blocks |
Company tracks (Google/Meta/Amazon/Netflix/Microsoft) kept as T1–T8.

### New standalone roadmaps
| Roadmap | Modules |
|---|---|
| Kubernetes & Containers | virtualization vs containers, Docker, K8s architecture, workloads (Pods/Deployments/StatefulSets/DaemonSets/Jobs), Services/Ingress/Gateway, config & storage, scaling (HPA/VPA/CA), security & RBAC, Helm/GitOps, troubleshooting |
| Cloud (AWS & Azure) | fundamentals, compute, storage, databases, networking (VPC/VNet), IAM/Entra, LB & API gateway, messaging, IaC, Well-Architected & cost |
| Security | AuthN/AuthZ, sessions & cookies, JWT, OAuth2, OIDC, SAML/SSO, RBAC/ABAC, cryptography, SSL/TLS, PKI & certs, mTLS, OWASP, secrets |
| Networking | OSI/TCP-IP, IP/subnetting, TCP/UDP, HTTP/1.1–3, DNS, proxies, load balancers, API gateways, CDN, firewalls/NAT, troubleshooting |
| System Design | scaling (horizontal vs vertical), LB, caching, DB scaling, CAP, queues, microservices patterns, HLD framework + classic problems, LLD (SOLID, patterns, classic problems) |
| Computer Architecture & OS | CPU, caches, memory, virtual memory, processes/threads, scheduling, I/O models, concurrency hardware |
| Storage | block/file/object, disks & RAID, file systems, storage engines (B-tree/LSM), replication, distributed & cloud storage, backup/DR |

Each module: topics (definition + interview tip + examples), most-important
problems (with difficulty, type and hints), interview-focus Q&A, quick-check
Q&A, resources; each roadmap also contributes flashcards.

## 4. Execution steps
1. Back up original `docs/` (no git) → done before any change.
2. Scaffold new folder; write content schema + validator.
3. Generate content files in parallel (8 independent authors, one per file), each validated.
4. Migrate existing Go data into the new schema via a one-off transform script (fixing the bugs above).
5. Rewrite SPA engine, HTML shell and CSS.
6. Rewrite server into `cmd/` + `internal/`, add tests, Dockerfile, k8s manifests, Makefile.
7. Verify: `go vet`, `go test`, content validator, headless render smoke test, live server check.
8. Remove old `docs/` and update root `build-all.bat`.

## 5. Status (2026-10-29)

Steps 1–7 are done. In step 8, `build-all.bat` is updated, but the old `docs/` folder still needs to be deleted by hand.

| Roadmap | Modules | Topics | Problems | Q&A | Flashcards |
|---|---|---|---|---|---|
| Go | 14 | 85 | 176 | 199 | 59 |
| Kubernetes & Containers | 10 | 60 | 99 | 128 | 30 |
| Cloud (AWS & Azure) | 10 | 56 | 98 | 125 | 30 |
| Security | 11 | 63 | 101 | 138 | 35 |
| Networking | 10 | 58 | 88 | 118 | 30 |
| System Design | 11 | 62 | 114 | 141 | 35 |
| Computer Architecture & OS | 8 | 47 | 80 | 100 | 30 |
| Storage | 8 | 45 | 78 | 99 | 30 |
| **Total** | **82** | **476** | **834** | **1048** | **279** |

**Verified:**
- `go vet`, `go test`, and the content validator (0 errors) all pass.
- Every roadmap renders in headless Edge, both from the server and from `file://`.
- Real legacy progress imports correctly when tested on a copy of `roadmap.db`.
- A fresh browser adopts the server's progress instead of overwriting it.

**Still to check:**
- **Third-party Go snippets:** snippets that use client-go, controller-runtime, the AWS SDK, or the JWT/OIDC/SAML/SPIFFE libraries were written against their current APIs but not compiled.
- **Recent facts:** version-specific facts from 2025–2026 should be spot-checked; see each roadmap's resources.
- **Docker image and Kubernetes manifest:** neither was built or applied on this machine.

## 6. Phase 2: visual learning, review and one-command delivery (2026-10-29)

### Plan
1. **Visual engine** (`web/js/diagrams.js`): the diagrams are data in `web/js/visuals/*.js`, rendered as SVG that follows the theme and works under the CSP and offline. There are three kinds:
   - `graph`: architecture diagrams and flowcharts, with groups and clickable nodes.
   - `sequence`: protocol flows.
   - `widget`: interactive labs implemented in `web/js/widgets.js`.

   Step playback (play/pause, step, speed, full screen, keyboard, a text transcript) animates tokens along the edges. These animated diagrams are used instead of GIFs or video, which would be heavy, would not follow the theme, and would need `media-src`/`frame-src` exceptions to the CSP.
2. **Validator geometry checks**: references to exact topic and problem titles, node overlap, edges crossing nodes, edge labels on nodes, text that does not fit its box, and caption lengths.
3. **Content review**: one author per roadmap reviewed every topic and drew a diagram only where structure or motion is the hard part. Topics that are lists of facts were skipped.
4. **Learning improvements** with real impact: spaced-repetition review, a guided "next" flow, and the visuals gallery plus search.
5. **One-command build and deploy**: `make <task>` works the same on Windows (`make.cmd` → `scripts/make.ps1`) and Linux/macOS (`Makefile`). Added `compose.yaml`, a self-probing `-healthcheck` for distroless images, and `deploy`, which works out how to get the image to kind, minikube, Docker Desktop or a registry.

### Delivered
| Roadmap | Animated diagrams | Labs |
|---|---|---|
| Go | 25 | 2 |
| Kubernetes & Containers | 21 | 1 |
| Cloud (AWS & Azure) | 19 | 1 |
| Security | 21 | 1 |
| Networking | 21 | 2 |
| System Design | 27 (8 on classic HLD/LLD problems) | 8 |
| Computer Architecture & OS | 16 | 1 |
| Storage | 17 | 3 |
| **Total** | **167** | **19 placements of 14 labs** |

**Labs:** subnet calculator, consistent-hashing ring, rate limiter (token bucket / fixed / sliding window), JWT decoder and HS256 verifier, LRU/LFU cache, load-balancer algorithms, quorum N/W/R, Go channel simulator, HPA calculator, latency numbers, availability nines, backoff with jitter, back-of-the-envelope estimator, RAID.

**App improvements:**
- Leitner spaced-repetition review of flashcards, optionally including every module's quick-check questions. It shows the number of due cards on the dashboard and in the sidebar, and grades with keys 1/2/3.
- "Next up" on the roadmap page and roadmap cards.
- A module opens at the first unfinished topic, with "Mark done & next topic" and expand/collapse all.
- 🎬 badges on topics and modules that have visuals.
- The `#/visuals` gallery.
- Visuals are included in search.

### Verified
- `make build` passes: vet, tests, and validation (0 errors across 186 visuals).
- Under the real server with the CSP enforced, every diagram is stepped to its last frame in headless Edge with no exceptions or CSP violations.
- Labs were exercised one by one on desktop and at 390 px.
- Dark and light themes and mobile layout were checked.

**Not verified here:** `make docker`, `make up` and `make deploy`. Docker and kubectl are not installed on this machine.

### Content issues reported by the visual authors (lesson text not yet changed)
- **Go:**
  - The maps lesson describes the pre-1.24 bucket design; Go 1.24+ uses Swiss tables.
  - `any` holds a `*_type`, not an itab.
  - Since Go 1.23, timers and tickers that are no longer referenced are garbage collected, so the `time.After` and ticker "leak" claims are outdated.
  - `sync.Cond` has no OS spurious wakeups.
  - "RWMutex/atomics ~10× faster" is overstated.
  - `http.Transport` does retry idempotent requests on dead reused connections.
  - The Linux default thread stack is typically 8 MB, not 2 MB.
  - Slice growth since 1.18 moves smoothly from 2× to 1.25×.
- **Security:**
  - A missing intermediate certificate fails in Go reliably only on Linux.
  - One garbled sentence in the state/nonce/PKCE topic.
- **Cloud:**
  - Not all Azure regions are paired.
  - The resource-policy allow caveat with role ARNs is missing.
  - New accounts can have a Lambda concurrency quota below 1,000.
  - Cosmos DB strong consistency is unavailable with multi-region writes.
- **Networking:**
  - The AWS single-flow limit is 5 Gbps, or 10 Gbps in a cluster placement group.
  - DSCP/ECN can also be rewritten in transit.
- **System Design:** "3 retries per layer" across 3 layers is 4³ = 64× attempts, not 27×.
- **Kubernetes:** namespaced sysctls can be set per Pod.
- **Computer Architecture:** the 2 MiB-page dTLB reach is typically about 64 MiB.

## 7. Phase 3: corrections, content review, upgrades and versioning (v1.2.0–v1.3.0)

**Upgrades (v1.2.0)**
- Versioned SQLite migrations (`PRAGMA user_version`). The database is snapshotted with `VACUUM INTO` before any schema change, and the app refuses to open a database written by a newer schema.
- New commands: `roadmap-server -backup` and `-version`; `-log-file`.
- New endpoints: `GET /api/v1/version`, and a graceful-shutdown endpoint that works only on loopback and only with a required header.
- `make install | upgrade | rollback | start | stop | status | backup` on Windows (`scripts/make.ps1`) and Linux/macOS (`scripts/local.sh`).
- `make upgrade` stops each running copy gracefully, backs up its data, swaps the binary (keeping `.prev`), restarts it with the same arguments, waits until it reports the new version, and rolls back automatically if it doesn't.
- The UI shows its version, offers a reload after an upgrade, and retries sync while the server restarts.

**Versioning:** `VERSION` → binary, UI, API, image tag. `CHANGELOG.md` with an Unreleased section. `make bump`. `make check` fails if the three disagree.

**Content (v1.3.0):** every inaccuracy reported in section 6 is fixed. A full review of all eight roadmaps brought them up to date for 2025–26 and added new topics, problems, quiz items and flashcards, plus about 75 new diagrams. See `CHANGELOG.md`.

**Verified**
- `make build` passes: vet, tests, and version and content validation.
- 2,807 progress-keyed items are unchanged compared with the v1.0 baseline.
- 235 diagrams and 19 labs play to the end under the CSP with no errors.
- On Windows, `make upgrade` was tested against a running v1.0 binary in a sandbox, covering both the forced and the graceful stop, along with automatic data migration and `make rollback` in both directions.

**Not verified here**
- `scripts/local.sh` on Linux/macOS: syntax-checked only.
- Docker, Compose and Kubernetes flows: Docker and kubectl are not installed here.
