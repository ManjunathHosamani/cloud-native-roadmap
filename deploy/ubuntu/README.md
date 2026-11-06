# Ubuntu server install

Run the roadmap on an Ubuntu server (22.04 or 24.04) so that anyone on the network can open it at `https://<server-ip>`, with no login.

| Part | What it does |
|---|---|
| `roadmap-server` (systemd service `roadmap`) | The app. Listens on `127.0.0.1:3000` only and starts on boot |
| nginx | Serves the app over HTTPS on port 443 and redirects port 80 to it |
| `deploy/ubuntu/upgrade.sh` | Pulls the latest commit from GitHub and upgrades in place, rolling back if the new version is not healthy |

Each visitor's progress is kept in their own browser. The server stores a single progress record shared by everyone, so nginx hides it (see [Limits](#limits)).

All commands run as root (`sudo -i`). Paths assume the repo is cloned to `/root/cloud-native-roadmap`.

## 1. Prerequisites

```bash
apt update
apt install -y git make curl nginx
```

**Go 1.25 or newer.** The `golang-go` package from apt is too old (1.18 on 22.04, 1.22 on 24.04), so install the official release:

```bash
GO=$(curl -fsSL 'https://go.dev/VERSION?m=text' | head -1)          # e.g. go1.27.3
curl -fsSLO "https://go.dev/dl/$GO.linux-$(dpkg --print-architecture).tar.gz"
rm -rf /usr/local/go && tar -C /usr/local -xzf "$GO.linux-$(dpkg --print-architecture).tar.gz"
echo 'export PATH=/usr/local/go/bin:$PATH' > /etc/profile.d/go.sh
. /etc/profile.d/go.sh && go version
```

`/usr/local/go` comes first on the PATH, so an older `/usr/bin/go` from apt does no harm. If `/usr/local/go` is already Go 1.21 or newer and you would rather not replace it, keep it: Go downloads the 1.25 toolchain that `go.mod` asks for by itself (this needs internet access).

Node and gcc are only needed for `make check` (content validation and race tests). Run the checks on your development machine before you push. The server skips them.

## 2. Install the app

```bash
cd /root
git clone https://github.com/ManjunathHosamani/cloud-native-roadmap.git
cd cloud-native-roadmap
SKIP_CHECKS=1 make install
cp deploy/ubuntu/roadmap.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now roadmap
curl -s http://127.0.0.1:3000/api/v1/version           # {"schema":2,"version":"..."}
```

Use the service rather than `make start`. `make start` runs the app in the background, but it does not come back after a reboot.

## 3. HTTPS with nginx

Create a self-signed certificate for the server's IP address and hostname:

```bash
IP=$(hostname -I | awk '{print $1}')
mkdir -p /etc/ssl/roadmap
openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
  -keyout /etc/ssl/roadmap/roadmap.key -out /etc/ssl/roadmap/roadmap.crt \
  -subj "/CN=$IP" -addext "subjectAltName=IP:$IP,DNS:$(hostname)"
chmod 600 /etc/ssl/roadmap/roadmap.key
```

If your IT team can issue a certificate from the internal certificate authority, put it at the same two paths instead. Browsers then show no warning.

Enable the site:

```bash
cp deploy/ubuntu/nginx-roadmap.conf /etc/nginx/sites-available/roadmap
ln -sf /etc/nginx/sites-available/roadmap /etc/nginx/sites-enabled/roadmap
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Two rules in the config are required, not optional:

- `/api/v1/admin/` returns 403. The upgrade shutdown endpoint trusts requests from loopback, and behind nginx every request comes from loopback. Without this rule, anyone could stop the app.
- `/api/v1/state` returns 404. Without it, every visitor's browser would sync into one shared record and overwrite everyone else's progress.

## 4. Check it

From another machine:

```bash
curl -k https://<server-ip>/api/v1/version               # {"schema":2,"version":"..."}
curl -k -o /dev/null -w '%{http_code}\n' https://<server-ip>/api/v1/state            # 404
curl -k -o /dev/null -w '%{http_code}\n' https://<server-ip>/api/v1/admin/shutdown   # 403
```

Then open `https://<server-ip>` in a browser. The first visit shows a certificate warning while the certificate is self-signed.

If the page times out, check the server's firewall (`ufw status`; if it is active, run `ufw allow 'Nginx Full'`) and whether the network lets clients reach ports 80 and 443.

## Upgrade to the latest version on GitHub

```bash
cd /root/cloud-native-roadmap
bash deploy/ubuntu/upgrade.sh
```

The script:

1. Runs `git fetch`. If the server is already on the latest commit, it stops there.
2. Pulls the new code and builds it while the old version keeps serving. If the build fails, nothing else changes.
3. Stops the service. `make upgrade` then backs up the database to `/root/.config/go-roadmap/backups/`, keeps the old binary as `roadmap-server.prev`, and installs the new one.
4. Starts the service and waits until `/api/v1/version` reports the new version.
5. If that does not happen within 30 seconds, it rolls back: it restores the old binary and the database snapshot, starts the old version again, and exits with an error.

Options: `FORCE=1` reinstalls even when the server is already up to date. `CHECKS=1` also runs `make check` (needs Node 18+ and gcc).

Open browser tabs show "The app was upgraded — Reload".

**To upgrade automatically every night**, add a cron entry:

```bash
echo '30 2 * * * root bash /root/cloud-native-roadmap/deploy/ubuntu/upgrade.sh >> /var/log/roadmap-upgrade.log 2>&1' > /etc/cron.d/roadmap-upgrade
```

**To undo an upgrade by hand:**

```bash
systemctl stop roadmap
RESTORE_DATA=1 make rollback      # previous binary + pre-upgrade database
systemctl start roadmap
```

Do not run `make upgrade`, `make start` or `make stop` directly on a server set up this way. They manage the process with `nohup`, outside systemd.

## Day-to-day

| Task | Command |
|---|---|
| Status | `systemctl status roadmap` and `make status` |
| Logs | `tail -f /root/.config/go-roadmap/logs/server.log` |
| Restart | `systemctl restart roadmap` |
| Back up the database | `make backup` |

## Limits

- **Progress is saved only in each visitor's browser.** Clearing browser data or switching machines loses it, unless the visitor saves a JSON export first. Saving progress on the server for each person would need user profiles, which the app does not have yet.
- **The app runs as root**, because `make install` installs into the home folder of whoever runs it. It listens only on loopback, and nginx is the only part exposed to the network.
