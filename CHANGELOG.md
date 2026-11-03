# Changelog

All notable changes to the Cloud-Native Engineering Roadmap. Versions follow
[semantic versioning](https://semver.org):

- **MAJOR**: a change that needs manual action, for example progress that cannot be migrated.
- **MINOR**: new features or new content.
- **PATCH**: fixes and corrections.

Add notes under **Unreleased** as you work. `make bump` moves them into a dated release.

## [Unreleased]

## [1.3.0] - 2026-11-03

Content review of all eight roadmaps. Corrections, 2025–26 updates, new lessons and problems, and about 75 new animated diagrams. Existing progress is kept: content was only appended, and no titles or questions were renamed.

- Diagrams: the overview frame now shows the starting state. Nodes that appear later (scale-out, failover, B-tree splits) are revealed during playback.
- Go: corrected runtime internals for Go 1.24+ (Swiss-table maps, `any` vs non-empty interface layout, the append growth curve, thread vs goroutine stacks) and several concurrency myths (`time.After` and tickers since 1.23, `sync.Cond` has no spurious wakeups, no fixed "10×" for RWMutex or atomics, `net/http`'s narrow built-in retry). New lessons on iterators, testing (fuzzing, `b.Loop`, `testing/synctest`), secure coding (`os.Root`, SSRF) and cleanups and weak pointers. Fixed non-compiling or unsafe examples. Modernized for Go 1.22–1.27. 5 problems, 31 quiz questions, 10 flashcards and 7 diagrams.
- Kubernetes: corrected the sysctl explanation (namespaced vs node-level, safe vs unsafe). Brought feature status up to 1.33–1.35 (in-place resize GA, user namespaces, nftables/IPVS, end of cgroup v1 and containerd 1.x, MutatingAdmissionPolicy beta, DRA GA, ingress-nginx retirement). Rewrote the HA control plane lesson. New topic on GPUs and DRA, 10 debugging and design problems, and 8 diagrams. Fixed an admission policy that let untagged images through, and the aescbc encryption example.
- Security: corrected the missing-intermediate explanation (Go uses the platform verifier on Windows and macOS) and the state/nonce/PKCE guidance. New lessons on DPoP and sender-constrained tokens, and on PAR/RAR/FAPI 2.0. Updated to OWASP Top 10:2025, SC-081 certificate lifetimes, the end of OCSP and post-quantum key exchange. Fixed unsafe code examples. 8 diagrams.
- Cloud: corrected Azure region pairs, the same-account resource-policy rule, the Lambda concurrency quota and Cosmos DB Strong consistency with multi-region writes. Covered 2025–26 service changes (App Runner → ECS Express Mode, regional NAT Gateway, 50 TB S3 objects, OpenTofu S3 locking). New data-perimeter lesson, Graviton and FinOps problems, and 7 diagrams. The RDS failover diagram now shows the promoted standby as the new primary.
- Networking: corrected the AWS single-flow throughput limit and what changes in a packet in transit. Updated TLS (post-quantum, OCSP, ECH), QUIC/HTTP/3, BBR, DNS and IPv6. New lesson on Kubernetes Service load balancing (nftables/IPVS/eBPF), 5 troubleshooting problems, and 9 diagrams.
- System Design: corrected retry amplification (3 retries per layer across 3 layers = 64×). Every topic now has a worked example (26 new). New lessons on load shedding, hot partitions, multi-tenancy, idempotent consumers, search and probabilistic data structures. 6 new HLD and LLD problems and 14 diagrams.
- Computer Architecture: corrected dTLB huge-page reach and the claim that a page fault hands off Go's P. Updated for EEVDF and sched_ext, io_uring restrictions, cgroup v2 and DDR5 bandwidth. New lessons on memory allocators, file systems and virtualization. 6 problems and 7 diagrams.
- Storage: new lessons on MVCC anomalies, VACUUM and wraparound, lakehouse table formats, zoned storage and tiered storage. 5 problems, updated cloud and Kubernetes storage facts, and 8 diagrams.

## [1.2.0] - 2026-10-29

- One-command install, upgrade and rollback (`make install`, `make upgrade`, `make rollback`). Upgrades back up the database first, shut the running app down gracefully, restart it with the same settings, and roll back automatically if the new version is not healthy.
- Versioned database migrations. The database is snapshotted to `<data dir>/backups` before any schema change, and the app refuses to open a database written by a newer version.
- New `roadmap-server -backup FILE` and `-version` commands, `GET /api/v1/version`, and a loopback-only graceful-shutdown endpoint.
- The app shows its version. Open tabs offer a reload when the server has been upgraded, and progress sync retries while the server restarts.
- The app version is managed in `VERSION` and stamped into the binary, the UI and the container image (`make bump`).

## [1.1.0] - 2026-10-29

- 167 animated diagrams (architecture diagrams, flowcharts and protocol sequences) across all eight roadmaps, plus 14 interactive labs.
- Spaced-repetition review of flashcards and quick-check questions.
- Guided flow: "Next up", "Mark done & next topic", and modules open at the first unfinished topic.
- A visual-explainers gallery, with visuals included in search.
- One-command builds on every OS (`make run`, `make dist`, `make up`, `make deploy`), Docker Compose, and a self-probing health check.

## [1.0.0] - 2026-10-29

- Rewrote the Go interview-prep app as a multi-roadmap platform. It has eight roadmaps: Go, Kubernetes, Cloud, Security, Networking, System Design, Computer Architecture and Storage.
- New Go server with an embedded single-binary frontend, SQLite progress sync, security headers and graceful shutdown.
- Existing progress from the legacy app is migrated automatically.
