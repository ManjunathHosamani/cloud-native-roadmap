#!/usr/bin/env bash
# Install / upgrade / rollback the app on this machine (Linux and macOS).
# Called by the Makefile: make install | upgrade | rollback | start | stop | status | backup
# The Windows equivalent lives in scripts/make.ps1.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${VERSION:-$(tr -d '[:space:]' < VERSION)}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/share/cloud-native-roadmap}"
INSTALLED="$INSTALL_DIR/roadmap-server"
BIN_LINK="$HOME/.local/bin/roadmap-server"
STAGED="bin/staging/roadmap-server"
case "$(uname -s)" in
  Darwin) DEFAULT_DATA="$HOME/Library/Application Support/go-roadmap" ;;
  *)      DEFAULT_DATA="${XDG_CONFIG_HOME:-$HOME/.config}/go-roadmap" ;;
esac
# Executable names of this app, including dist/ builds and the legacy docs/ server.
NAMES='^(roadmap-server|roadmap-server-(linux|darwin)-(amd64|arm64)|go-roadmap-server)$'

say()  { printf '==> %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\nmake failed: %s\n' "$*" >&2; exit 1; }

# Value of -name / --name / -name=value in an argument string (up to the next flag).
arg_value() { sed -nE "s/(^|.* )--?$2[= ]+(.*)\$/\2/p" <<<"$1" | sed -E 's/ -.*//'; }

exe_of() {
  if [ -e "/proc/$1/exe" ]; then readlink "/proc/$1/exe"; else ps -o comm= -p "$1"; fi
}

# Prints "pid<TAB>exe<TAB>addr<TAB>datadir<TAB>legacy<TAB>args" for each running instance.
find_running() {
  ps -eo pid=,args= | while read -r pid cmd; do
    first="${cmd%% *}"
    base="$(basename "$first")"
    [[ "$base" =~ $NAMES ]] || continue
    args=""; [[ "$cmd" == *" "* ]] && args="${cmd#* }"
    addr="$(arg_value "$args" addr)"; addr="${addr:-127.0.0.1:3000}"
    addr="$(sed -E 's/^(0\.0\.0\.0|\[::\]|::)?:/127.0.0.1:/' <<<"$addr")"
    data="$(arg_value "$args" data-dir)"; data="${data:-$DEFAULT_DATA}"
    legacy=0; [[ "$base" == go-roadmap-server* ]] && legacy=1
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$pid" "$(exe_of "$pid")" "$addr" "$data" "$legacy" "$args"
  done
}

running_version() { curl -fsS --max-time 2 "http://$1/api/v1/version" 2>/dev/null | sed -nE 's/.*"version":"([^"]*)".*/\1/p'; }

# SIGTERM triggers a graceful shutdown in every release; escalate only on timeout.
stop_pid() {
  kill -TERM "$1" 2>/dev/null || return 0
  for _ in $(seq 1 50); do kill -0 "$1" 2>/dev/null || { info "stopped PID $1 (graceful)"; return 0; }; sleep 0.5; done
  kill -KILL "$1" 2>/dev/null || true
  info "stopped PID $1 (forced after 25s)"
}

# Starts detached; logs go to <data dir>/logs/server.log.
start_app() {
  local exe="$1" args="$2" data="$3" log
  log="$data/logs/server.log"
  mkdir -p "$data/logs"
  args="$(sed -E 's/(^| )--?open(=[^ ]*)?( |$)/ /g; s/(^| )--?log-file[= ][^ ]*/ /g' <<<"$args")"
  local launcher=(nohup); command -v setsid >/dev/null && launcher=(setsid nohup)
  # shellcheck disable=SC2086 # args are a flag string recovered from ps
  if "$exe" -version >/dev/null 2>&1; then
    "${launcher[@]}" "$exe" $args -log-file "$log" >/dev/null 2>&1 &
  else  # releases before 1.2.0 have no -log-file
    "${launcher[@]}" "$exe" $args >>"$log" 2>&1 &
  fi
  info "started PID $!: $exe $args (log: $log)"
}

wait_healthy() {
  for _ in $(seq 1 60); do [ "$(running_version "$1")" = "$2" ] && return 0; sleep 0.5; done
  return 1
}

# Consistent snapshot using the staged binary (it never migrates).
backup_data() {
  local data="$1" reason="$2" dest
  [ -f "$data/roadmap.db" ] || { info "no database yet in $data" >&2; return 0; }
  dest="$data/backups/roadmap-$(date -u +%Y%m%dT%H%M%SZ)-$reason.db"
  "$STAGED" -backup "$dest" -data-dir "$data" >/dev/null || die "backup of $data/roadmap.db failed"
  info "database backed up to $dest" >&2
  printf '%s' "$dest"
}

build_staged() {
  mkdir -p "$(dirname "$STAGED")"
  say "build $VERSION"
  CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=$VERSION" -o "$STAGED" ./cmd/server
  [ "$("$STAGED" -version)" = "$VERSION" ] || die "staged binary does not report $VERSION"
}

link_installed() {
  mkdir -p "$(dirname "$BIN_LINK")"
  ln -sf "$INSTALLED" "$BIN_LINK"
  case ":$PATH:" in *":$(dirname "$BIN_LINK"):"*) ;; *) info "add $(dirname "$BIN_LINK") to PATH to run 'roadmap-server' directly" ;; esac
  if [ "$(uname -s)" = Linux ]; then
    mkdir -p "$HOME/.local/share/applications"
    printf '[Desktop Entry]\nName=Cloud-Native Roadmap\nExec=%s -open\nType=Application\nTerminal=false\nCategories=Development;Education;\n' \
      "$INSTALLED" > "$HOME/.local/share/applications/cloud-native-roadmap.desktop"
  fi
}

cmd_upgrade() {
  [ "${SKIP_CHECKS:-0}" = 1 ] || make --no-print-directory check
  build_staged
  local procs=() targets=() line p pid exe addr data legacy args from
  while IFS= read -r line; do procs+=("$line"); done < <(find_running)   # bash 3.2 (macOS) has no mapfile
  for p in ${procs[@]+"${procs[@]}"}; do
    IFS=$'\t' read -r pid exe addr data legacy args <<<"$p"
    if [ "$legacy" = 1 ]; then from="legacy app"; else from="$(running_version "$addr")"; from="${from:+v$from}"; from="${from:-pre-1.2.0}"; fi
    say "found running $exe (PID $pid, $addr, data $data, $from)"
    [ "$legacy" = 1 ] && { exe="$INSTALLED"; args=""; }
    targets+=("$pid"$'\t'"$exe"$'\t'"$addr"$'\t'"$data"$'\t'"$args")
  done
  if [ ${#targets[@]} -eq 0 ]; then
    say "no running instance found; installing to $INSTALLED"
    targets+=(""$'\t'"$INSTALLED"$'\t'"127.0.0.1:3000"$'\t'"$DEFAULT_DATA"$'\t')
  fi

  local t backups=()
  for t in "${targets[@]}"; do IFS=$'\t' read -r pid exe addr data args <<<"$t"; if [ -n "$pid" ]; then stop_pid "$pid"; fi; done
  for t in "${targets[@]}"; do IFS=$'\t' read -r pid exe addr data args <<<"$t"; backups+=("$(backup_data "$data" "before-$VERSION")"); done
  for t in "${targets[@]}"; do
    IFS=$'\t' read -r pid exe addr data args <<<"$t"
    mkdir -p "$(dirname "$exe")"
    if [ -f "$exe" ]; then cp -f "$exe" "$exe.prev"; fi
    cp -f "$STAGED" "$exe.new" && mv -f "$exe.new" "$exe"   # atomic replace
    info "installed $VERSION -> $exe"
  done
  if [ -f "$INSTALLED" ]; then link_installed; fi

  local i=0 failed=()
  for t in "${targets[@]}"; do
    IFS=$'\t' read -r pid exe addr data args <<<"$t"
    if [ -n "$pid" ]; then
      start_app "$exe" "$args" "$data"
      if wait_healthy "$addr" "$VERSION"; then
        say "healthy: v$VERSION on http://$addr"
      else
        say "v$VERSION did not become healthy on $addr - rolling back"
        tail -n 15 "$data/logs/server.log" 2>/dev/null | sed 's/^/    /' || true
        pkill -f "^$exe( |$)" 2>/dev/null || true; sleep 1
        if [ -f "$exe.prev" ]; then cp -f "$exe.prev" "$exe"; fi
        if [ -n "${backups[$i]:-}" ]; then cp -f "${backups[$i]}" "$data/roadmap.db"; rm -f "$data/roadmap.db-wal" "$data/roadmap.db-shm"; fi
        start_app "$exe" "$args" "$data"
        failed+=("$exe")
      fi
    fi
    i=$((i + 1))
  done
  [ ${#failed[@]} -eq 0 ] || die "upgrade failed and was rolled back for: ${failed[*]:-}"
  printf '\nDone: v%s is installed.\n' "$VERSION"
  if [ ${#procs[@]} -eq 0 ]; then echo "Start it with: make start"; else echo "Open browser tabs will offer a reload. Undo with: make rollback"; fi
}

cmd_rollback() {
  local procs=() exes=() line p pid exe addr data legacy args
  while IFS= read -r line; do procs+=("$line"); done < <(find_running | awk -F'\t' '$5 == 0')
  for p in ${procs[@]+"${procs[@]}"}; do IFS=$'\t' read -r pid exe addr data legacy args <<<"$p"; exes+=("$exe"); done
  exes+=("$INSTALLED")
  local done_any=0 e
  for p in ${procs[@]+"${procs[@]}"}; do IFS=$'\t' read -r pid exe addr data legacy args <<<"$p"; stop_pid "$pid"; done
  for e in $(printf '%s\n' "${exes[@]}" | sort -u); do
    [ -f "$e.prev" ] || continue
    mv -f "$e" "$e.swap" && mv -f "$e.prev" "$e" && mv -f "$e.swap" "$e.prev"   # rollback twice = forward again
    info "restored previous binary -> $e"; done_any=1
  done
  [ "$done_any" = 1 ] || die "nothing to roll back: no roadmap-server.prev next to the running or installed app"
  if [ "${RESTORE_DATA:-0}" = 1 ]; then
    [ -x "$STAGED" ] || build_staged
    local dd snap
    for dd in $( { for p in ${procs[@]+"${procs[@]}"}; do cut -f4 <<<"$p"; done; echo "$DEFAULT_DATA"; } | sort -u); do
      snap="$(ls "$dd"/backups/roadmap-*-before-*.db 2>/dev/null | sort | tail -n 1 || true)"
      [ -n "$snap" ] || continue
      backup_data "$dd" before-rollback >/dev/null
      cp -f "$snap" "$dd/roadmap.db"; rm -f "$dd/roadmap.db-wal" "$dd/roadmap.db-shm"
      info "restored database from $(basename "$snap")"
    done
  fi
  for p in ${procs[@]+"${procs[@]}"}; do IFS=$'\t' read -r pid exe addr data legacy args <<<"$p"; start_app "$exe" "$args" "$data"; done
  echo "Rolled back."
}

cmd_start() {
  [ -z "$(find_running)" ] || { echo "already running (see: make status)"; return; }
  local exe="$INSTALLED"; [ -x "$exe" ] || exe="$PWD/bin/roadmap-server"; [ -x "$exe" ] || die "not installed: run make install"
  local addr="${ADDR:-127.0.0.1:3000}"
  start_app "$exe" "${ADDR:+-addr $ADDR}" "$DEFAULT_DATA"
  wait_healthy "$addr" "$("$exe" -version)" || die "did not start; see $DEFAULT_DATA/logs/server.log"
  echo "running on http://$addr (stop with: make stop)"
  { command -v xdg-open >/dev/null && xdg-open "http://$addr"; } || { command -v open >/dev/null && open "http://$addr"; } || true
}

cmd_stop() {
  local found=0 pid
  while IFS=$'\t' read -r pid _; do [ -n "$pid" ] && { stop_pid "$pid"; found=1; }; done < <(find_running)
  [ "$found" = 1 ] || echo "not running"
}

cmd_status() {
  echo "source version:    $VERSION"
  if [ -x "$INSTALLED" ]; then echo "installed version: $("$INSTALLED" -version)  ($INSTALLED)"; else echo "installed version: (not installed)"; fi
  local any=0 pid exe addr data legacy args v
  while IFS=$'\t' read -r pid exe addr data legacy args; do
    [ -n "$pid" ] || continue; any=1
    if [ "$legacy" = 1 ]; then v="legacy app"; else v="$(running_version "$addr")"; v="${v:+v$v}"; v="${v:-pre-1.2.0}"; fi
    echo "running:           $v PID $pid on http://$addr  ($exe)"
  done < <(find_running)
  [ "$any" = 1 ] || echo "running:           no"
  echo "data folder:       $DEFAULT_DATA"
  local b; b="$(ls "$DEFAULT_DATA"/backups/roadmap-*.db 2>/dev/null | sort | tail -n 1 || true)"
  [ -z "$b" ] || echo "latest backup:     $b"
}

cmd_backup() {
  [ -x "$INSTALLED" ] && STAGED="$INSTALLED" || build_staged
  backup_data "$DEFAULT_DATA" manual >/dev/null
}

case "${1:-}" in
  install|upgrade) cmd_upgrade ;;
  rollback) cmd_rollback ;;
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  backup) cmd_backup ;;
  *) die "usage: scripts/local.sh install|upgrade|rollback|start|stop|status|backup" ;;
esac
