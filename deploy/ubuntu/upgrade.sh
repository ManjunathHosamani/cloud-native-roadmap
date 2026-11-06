#!/usr/bin/env bash
# Upgrade an Ubuntu server install (systemd service "roadmap") to the latest commit on GitHub.
#
#   sudo bash deploy/ubuntu/upgrade.sh            # pull, build, back up, replace, restart, verify
#   sudo FORCE=1 bash deploy/ubuntu/upgrade.sh    # rebuild and reinstall even if already up to date
#   sudo CHECKS=1 bash deploy/ubuntu/upgrade.sh   # also run make check (needs Node 18+ and gcc)
#
# Use this instead of "make upgrade" on a server: make upgrade restarts the app with
# nohup, outside systemd. If the new version does not become healthy, the previous
# binary and the pre-upgrade database snapshot are restored and it is started again.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PATH="/usr/local/go/bin:$PATH"   # the Go 1.25+ install, ahead of any older apt golang-go

SERVICE=roadmap
URL=http://127.0.0.1:3000/api/v1/version

say() { printf '==> %s\n' "$*"; }
version_of() { curl -fsS --max-time 2 "$URL" 2>/dev/null | sed -nE 's/.*"version":"([^"]*)".*/\1/p'; }

[ "$(id -u)" = 0 ] || { echo "run as root (sudo)" >&2; exit 1; }

say "fetch from GitHub"
git fetch --quiet origin
if [ "$(git rev-parse HEAD)" = "$(git rev-parse '@{u}')" ] && [ "${FORCE:-0}" != 1 ]; then
  echo "Already up to date ($(git log -1 --format='%h %s'), running v$(version_of))."
  exit 0
fi
git pull --ff-only --quiet
VERSION="$(tr -d '[:space:]' < VERSION)"
say "now at $(git log -1 --format='%h %s') (v$VERSION)"

# Everything that can fail runs while the old version is still serving.
if [ "${CHECKS:-0}" = 1 ]; then make --no-print-directory check; fi
say "build"
CGO_ENABLED=0 go build -trimpath -o /dev/null ./cmd/server

say "stop $SERVICE (running v$(version_of))"
systemctl stop "$SERVICE"
# With nothing running, make upgrade backs up the database, keeps the old binary
# as roadmap-server.prev and installs the new one, but does not start it.
SKIP_CHECKS=1 make --no-print-directory upgrade
systemctl start "$SERVICE"

for _ in $(seq 1 60); do
  if [ "$(version_of)" = "$VERSION" ]; then say "healthy: v$VERSION"; exit 0; fi
  sleep 0.5
done

say "v$VERSION did not become healthy - rolling back"
journalctl -u "$SERVICE" -n 20 --no-pager || true
systemctl stop "$SERVICE"
RESTORE_DATA=1 make --no-print-directory rollback
systemctl start "$SERVICE"
sleep 2
echo "Rolled back to v$(version_of). Fix the problem, then run this script again." >&2
exit 1
