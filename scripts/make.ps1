<#
.SYNOPSIS
  Task runner for Windows with the same tasks as the Makefile. Call it through make.cmd:
    .\make              # list tasks
    .\make upgrade      # build the latest version and upgrade the running/installed app
.PARAMETER Task
  The task to run (see ".\make help").
.PARAMETER Arg
  Extra arguments: for "bump", the part (patch|minor|major|X.Y.Z) followed by optional change notes.
.PARAMETER Version
  Override the version stamped into the binary (default: contents of VERSION).
.PARAMETER Image
  Image name for docker/deploy. Use a registry path (e.g. ghcr.io/me/roadmap) to push before deploying.
.PARAMETER SkipChecks
  For "install"/"upgrade": skip vet, tests and content validation.
.PARAMETER RestoreData
  For "rollback": also restore the database snapshot taken before the last upgrade.
#>
param(
    [Parameter(Position = 0)][string]$Task = "help",
    [Parameter(Position = 1, ValueFromRemainingArguments = $true)][string[]]$Arg = @(),
    [string]$Version = $env:VERSION,
    [string]$Image = $(if ($env:IMAGE) { $env:IMAGE } else { "cloud-native-roadmap" }),
    [string]$Addr = $env:ADDR,
    [switch]$RestoreData,
    [switch]$SkipChecks
)
# Native tools (go, git, docker) write progress to stderr, which Windows PowerShell 5.1 turns into
# errors under "Stop". Failures are detected through exit codes in Step instead.
$ErrorActionPreference = "Continue"
$ProjectDir = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectDir

if (-not $Version) { $Version = (Get-Content VERSION -ErrorAction SilentlyContinue | Select-Object -First 1) }
if (-not $Version) { $Version = "dev" }
$Version = $Version.Trim()
$ldflags = "-s -w -X main.version=$Version"
$platforms = @("linux/amd64", "linux/arm64", "darwin/amd64", "darwin/arm64", "windows/amd64")

# Local installation layout.
$InstallDir   = Join-Path $env:LOCALAPPDATA "Programs\cloud-native-roadmap"
$InstalledExe = Join-Path $InstallDir "roadmap-server.exe"
$DefaultData  = Join-Path $env:APPDATA "go-roadmap"   # the server's default (os.UserConfigDir)
$StagedExe    = Join-Path $ProjectDir "bin\staging\roadmap-server.exe"
$Shortcut     = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Cloud-Native Roadmap.lnk"
# Executable names of this app, including the legacy docs/ server and dist\ builds.
$ProcNames = @("roadmap-server", "roadmap-server-windows-amd64", "go-roadmap-server")

function Step([string]$Name, [scriptblock]$Block) {
    Write-Host "==> $Name" -ForegroundColor Cyan
    $global:LASTEXITCODE = 0
    & $Block
    if ($LASTEXITCODE -ne 0) { throw "$Name failed (exit $LASTEXITCODE)" }
}
function Info([string]$Msg) { Write-Host "    $Msg" }
function Need([string]$Cmd, [string]$Hint) {
    if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) { throw "'$Cmd' is not installed. $Hint" }
}
function GoBuild([string]$Out) {
    $env:CGO_ENABLED = "0"
    go build -trimpath -ldflags $ldflags -o $Out ./cmd/server
}

# ---- local process management (install / upgrade / rollback) ---------------

# Value of -name / --name / -name=value in a command line, or $null.
function Get-ArgValue([string]$CommandLine, [string]$Name) {
    $m = [regex]::Match($CommandLine, "(?:^|\s)--?$Name(?:=|\s+)(?:`"([^`"]*)`"|(\S+))")
    if (-not $m.Success) { return $null }
    if ($m.Groups[1].Success) { return $m.Groups[1].Value } else { return $m.Groups[2].Value }
}

# The arguments of a command line without the executable path.
function Get-ArgString([string]$CommandLine) {
    $c = $CommandLine.Trim()
    if ($c.StartsWith('"')) { $i = $c.IndexOf('"', 1); return $c.Substring($i + 1).Trim() }
    $i = $c.IndexOf(' ')
    if ($i -lt 0) { return "" } else { return $c.Substring($i + 1).Trim() }
}

# Running instances of the app, with the address and data folder each one uses.
function Get-RoadmapProcess {
    Get-CimInstance Win32_Process | Where-Object { $ProcNames -contains [IO.Path]::GetFileNameWithoutExtension($_.Name) } | ForEach-Object {
        $cl = [string]$_.CommandLine
        $addr = Get-ArgValue $cl "addr"
        if (-not $addr) {
            $l = Get-NetTCPConnection -OwningProcess $_.ProcessId -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($l) { $addr = "{0}:{1}" -f $l.LocalAddress, $l.LocalPort } else { $addr = "127.0.0.1:3000" }
        }
        $addr = $addr -replace '^(0\.0\.0\.0|::|\[::\])?:', '127.0.0.1:'
        $data = Get-ArgValue $cl "data-dir"
        if (-not $data) { $data = $DefaultData }
        [pscustomobject]@{
            Id = $_.ProcessId; Path = $_.ExecutablePath; Args = (Get-ArgString $cl)
            Addr = $addr; DataDir = $data; Legacy = ($_.Name -like "go-roadmap-server*")
        }
    }
}

function Get-RunningVersion([string]$HostPort) {
    try { return (Invoke-RestMethod -UseBasicParsing -TimeoutSec 2 "http://$HostPort/api/v1/version").version } catch { return $null }
}

# Graceful stop via the loopback admin endpoint; force only if that is unavailable
# (older releases) or times out. SQLite commits are durable, so a forced stop
# loses at most a request in flight, and the browser keeps a local copy anyway.
function Stop-Roadmap($P) {
    $graceful = $false
    if (-not $P.Legacy) {
        try {
            Invoke-WebRequest -UseBasicParsing -Method Post -TimeoutSec 5 -Headers @{ "X-Roadmap-Admin" = "shutdown" } "http://$($P.Addr)/api/v1/admin/shutdown" | Out-Null
            $graceful = $true
        } catch { }
    }
    if ($graceful) { Wait-Process -Id $P.Id -Timeout 25 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $P.Id -ErrorAction SilentlyContinue) {
        Info "graceful shutdown unavailable for PID $($P.Id) - stopping it"
        Stop-Process -Id $P.Id -Force -ErrorAction SilentlyContinue
        Wait-Process -Id $P.Id -Timeout 10 -ErrorAction SilentlyContinue
    }
    Info ("stopped PID {0} ({1})" -f $P.Id, $(if ($graceful) { "graceful" } else { "forced" }))
}

# Starts the app detached and hidden (it keeps running after this terminal closes)
# with logs in <data dir>\logs\server.log. Win32_Process.Create is used because
# Start-Process would let the server inherit this shell's console and pipes.
function Start-Roadmap([string]$Exe, [string]$ArgString, [string]$DataDir) {
    $log = Join-Path $DataDir "logs\server.log"
    $ArgString = $ArgString -replace '(^|\s)--?open(=\S+)?(?=\s|$)', ' '          # the browser tab is already open
    $ArgString = ($ArgString -replace '(^|\s)--?log-file(=|\s+)("[^"]*"|\S+)', ' ').Trim()
    New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
    # Releases before 1.2.0 have neither -version nor -log-file (e.g. after a rollback):
    # run those through cmd with output redirected instead.
    & $Exe -version *> $null
    if ($LASTEXITCODE -eq 0) { $cmd = ('"{0}" {1} -log-file "{2}"' -f $Exe, $ArgString, $log) -replace '\s+', ' ' }
    else { $cmd = 'cmd.exe /d /c ""{0}" {1} >> "{2}" 2>&1"' -f $Exe, $ArgString, $log }
    $si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }
    $r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd; CurrentDirectory = (Split-Path $Exe); ProcessStartupInformation = $si }
    if ($r.ReturnValue -ne 0) { throw "could not start $Exe (Win32_Process.Create returned $($r.ReturnValue))" }
    Info "started PID $($r.ProcessId): $Exe $ArgString  (log: $log)"
    return $r.ProcessId
}

function Wait-Healthy([string]$HostPort, [string]$Want, [int]$Seconds = 30) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        $v = Get-RunningVersion $HostPort
        if ($v -and ($v -eq $Want)) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

# Consistent snapshot of a data folder's database. Uses the staged (new) binary,
# which does not migrate, so it works for databases written by any release.
function Backup-Data([string]$Exe, [string]$DataDir, [string]$Reason) {
    $db = Join-Path $DataDir "roadmap.db"
    if (-not (Test-Path $db)) { Info "no database yet in $DataDir"; return $null }
    $dest = Join-Path $DataDir ("backups\roadmap-{0}-{1}.db" -f (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ"), $Reason)
    & $Exe -backup $dest -data-dir $DataDir | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "backup of $db failed (exit $LASTEXITCODE)" }
    Info "database backed up to $dest"
    return $dest
}

function Copy-WithRetry([string]$From, [string]$To) {
    for ($i = 0; $i -lt 10; $i++) {
        try { Copy-Item -Force $From $To -ErrorAction Stop; return } catch { Start-Sleep -Milliseconds 500 }
    }
    throw "could not write $To (is it still running?)"
}

function New-StartMenuShortcut([string]$Exe) {
    $sh = New-Object -ComObject WScript.Shell
    $lnk = $sh.CreateShortcut($Shortcut)
    $lnk.TargetPath = $Exe
    $lnk.Arguments = "-open"
    $lnk.WorkingDirectory = Split-Path $Exe
    $lnk.Description = "Cloud-Native Engineering Roadmap"
    $lnk.Save()
}

# Builds the current version, then installs it or upgrades every running copy in place.
function Invoke-Upgrade {
    if (-not $SkipChecks) { & $tasks.check }
    New-Item -ItemType Directory -Force (Split-Path $StagedExe) | Out-Null
    Step "build $Version" { GoBuild $StagedExe }
    $built = (& $StagedExe -version)
    if ($built -ne $Version) { throw "staged binary reports '$built', expected '$Version'" }

    $running = @(Get-RoadmapProcess)
    $targets = @()
    foreach ($p in $running) {
        $from = if ($p.Legacy) { "legacy app" } else { $v = Get-RunningVersion $p.Addr; if ($v) { "v$v" } else { "unknown version" } }
        Write-Host ("==> found running {0} (PID {1}, {2}, data {3}, {4})" -f $p.Path, $p.Id, $p.Addr, $p.DataDir, $from) -ForegroundColor Cyan
        # Upgrade in place unless it is the legacy docs\ server, which is replaced by the installed app.
        $exe = if ($p.Legacy) { $InstalledExe } else { $p.Path }
        $targets += [pscustomobject]@{ Proc = $p; Exe = $exe; Args = $(if ($p.Legacy) { "" } else { $p.Args }); Backup = $null }
    }
    if (-not $targets.Count) {
        Write-Host "==> no running instance found; installing to $InstalledExe" -ForegroundColor Cyan
        $targets += [pscustomobject]@{ Proc = $null; Exe = $InstalledExe; Args = ""; Backup = $null }
    }

    # Stop first, then back up: the snapshot then contains every last write.
    foreach ($t in $targets) { if ($t.Proc) { Stop-Roadmap $t.Proc } }
    foreach ($t in $targets) {
        $dd = if ($t.Proc) { $t.Proc.DataDir } else { $DefaultData }
        $t.Backup = Backup-Data $StagedExe $dd "before-$Version"
    }

    $failed = @()
    foreach ($t in ($targets | Sort-Object Exe -Unique)) {
        New-Item -ItemType Directory -Force (Split-Path $t.Exe) | Out-Null
        if (Test-Path $t.Exe) { Copy-WithRetry $t.Exe ($t.Exe -replace '\.exe$', '.prev.exe') }
        Copy-WithRetry $StagedExe $t.Exe
        Info "installed $Version -> $($t.Exe)"
    }
    if (-not (Test-Path $Shortcut) -and (Test-Path $InstalledExe)) { New-StartMenuShortcut $InstalledExe; Info "Start menu shortcut: Cloud-Native Roadmap" }

    foreach ($t in $targets) {
        if (-not $t.Proc) { continue }
        $dd = $t.Proc.DataDir
        $np = Start-Roadmap $t.Exe $t.Args $dd
        if (Wait-Healthy $t.Proc.Addr $Version 30) {
            Write-Host "==> healthy: v$Version on http://$($t.Proc.Addr)" -ForegroundColor Green
            continue
        }
        Write-Host "==> v$Version did not become healthy on $($t.Proc.Addr) - rolling back" -ForegroundColor Red
        Get-Content (Join-Path $dd "logs\server.log") -Tail 15 -ErrorAction SilentlyContinue | ForEach-Object { Info $_ }
        Stop-Process -Id $np -Force -ErrorAction SilentlyContinue; Wait-Process -Id $np -Timeout 10 -ErrorAction SilentlyContinue
        $prev = $t.Exe -replace '\.exe$', '.prev.exe'
        if (Test-Path $prev) { Copy-WithRetry $prev $t.Exe }
        if ($t.Backup) { Copy-WithRetry $t.Backup (Join-Path $dd "roadmap.db"); Remove-Item -Force (Join-Path $dd "roadmap.db-wal"), (Join-Path $dd "roadmap.db-shm") -ErrorAction SilentlyContinue }
        $restart = if ($t.Proc.Legacy) { $t.Proc.Path } else { $t.Exe }
        Start-Roadmap $restart $t.Proc.Args $dd | Out-Null
        $failed += $t.Exe
    }
    if ($failed.Count) { throw "upgrade failed and was rolled back for: $($failed -join ', ')" }

    Write-Host ""
    Write-Host "Done: v$Version is installed." -ForegroundColor Green
    if (-not $running.Count) { Write-Host "Start it with:  .\make start   (or the 'Cloud-Native Roadmap' Start menu entry)" }
    else { Write-Host "Open browser tabs will offer a reload. Undo with: .\make rollback" }
}

function Invoke-Rollback {
    $running = @(Get-RoadmapProcess | Where-Object { -not $_.Legacy })
    $exes = @($running | ForEach-Object { $_.Path }) + @($InstalledExe) | Where-Object { Test-Path ($_ -replace '\.exe$', '.prev.exe') } | Sort-Object -Unique
    if (-not $exes.Count) { throw "nothing to roll back: no roadmap-server.prev.exe next to the running or installed app" }
    foreach ($p in $running) { Stop-Roadmap $p }
    foreach ($exe in $exes) {
        $prev = $exe -replace '\.exe$', '.prev.exe'
        $tmp = "$exe.swap"
        Move-Item -Force $exe $tmp; Move-Item -Force $prev $exe; Move-Item -Force $tmp $prev   # rollback twice = forward again
        Info "restored previous binary -> $exe"
    }
    if ($RestoreData) {
        $dirs = @($running | ForEach-Object { $_.DataDir }) + @($DefaultData) | Sort-Object -Unique
        foreach ($dd in $dirs) {
            $snap = Get-ChildItem (Join-Path $dd "backups") -Filter "roadmap-*-before-*.db" -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
            if (-not $snap) { continue }
            Backup-Data $StagedExe $dd "before-rollback" | Out-Null
            Copy-WithRetry $snap.FullName (Join-Path $dd "roadmap.db")
            Remove-Item -Force (Join-Path $dd "roadmap.db-wal"), (Join-Path $dd "roadmap.db-shm") -ErrorAction SilentlyContinue
            Info "restored database from $($snap.Name)"
        }
    }
    foreach ($p in $running) { Start-Roadmap $p.Path $p.Args $p.DataDir | Out-Null }
    Write-Host "Rolled back." -ForegroundColor Green
}

$tasks = [ordered]@{
    help = {
        Write-Host "Usage: .\make <task>      (version $Version)`n"
        Write-Host "  Develop"
        Write-Host "    run        check, build and start the app in this window (opens the browser)"
        Write-Host "    dev        start from source without checks (go run)"
        Write-Host "    check      go vet + go test + content and version validation"
        Write-Host "    build      check + build bin\roadmap-server.exe"
        Write-Host "  Install on this PC"
        Write-Host "    install    build and install to $InstallDir (+ Start menu entry)"
        Write-Host "    upgrade    build, back up data, stop, replace, restart, verify (auto-rollback)"
        Write-Host "    rollback   restore the previous binary (-RestoreData also restores the pre-upgrade database)"
        Write-Host "    start / stop / status   control the installed app"
        Write-Host "    backup     snapshot the database now (safe while running)"
        Write-Host "  Release"
        Write-Host "    bump       new version: .\make bump minor `"note`" `"note`"   (patch | minor | major | X.Y.Z)"
        Write-Host "    version    print the version"
        Write-Host "    dist       binaries for every platform in dist\ with SHA256SUMS"
        Write-Host "  Containers"
        Write-Host "    docker     build the image          up/down   Docker Compose on http://localhost:8080"
        Write-Host "    deploy     roll out to the current kubectl context      undeploy   delete it"
        Write-Host "    clean      remove bin\ and dist\"
    }
    version  = { Write-Host $Version }
    vet      = { Step "go vet" { go vet ./... } }
    test     = { Step "go test" { go test ./... } }
    validate = {
        if (Get-Command node -ErrorAction SilentlyContinue) {
            Step "validate version" { node scripts/version.js check }
            Step "validate content" { node scripts/validate-content.js }
        } else { Write-Warning "node not found - skipping content validation" }
    }
    check    = { & $tasks.vet; & $tasks.test; & $tasks.validate }
    build    = { & $tasks.check; Step "build bin\roadmap-server.exe ($Version)" { GoBuild "bin/roadmap-server.exe" } }
    run      = {
        & $tasks.build
        $runArgs = @("-open"); if ($Addr) { $runArgs += @("-addr", $Addr) }
        & .\bin\roadmap-server.exe @runArgs
    }
    dev      = { go run ./cmd/server -open }
    install  = { Invoke-Upgrade }
    upgrade  = { Invoke-Upgrade }
    rollback = { Invoke-Rollback }
    stop     = {
        $ps = @(Get-RoadmapProcess)
        if (-not $ps.Count) { Write-Host "not running"; return }
        foreach ($p in $ps) { Stop-Roadmap $p }
    }
    start    = {
        if (@(Get-RoadmapProcess).Count) { Write-Host "already running (see .\make status)"; return }
        $exe = if (Test-Path $InstalledExe) { $InstalledExe } elseif (Test-Path "bin\roadmap-server.exe") { (Resolve-Path "bin\roadmap-server.exe").Path } else { throw "not installed: run .\make install" }
        $a = if ($Addr) { "-addr $Addr" } else { "" }
        Start-Roadmap $exe $a $DefaultData | Out-Null
        $hp = if ($Addr) { $Addr } else { "127.0.0.1:3000" }
        if (Wait-Healthy $hp (& $exe -version) 20) { Start-Process "http://$hp"; Write-Host "running on http://$hp (stop with .\make stop)" -ForegroundColor Green }
        else { throw "did not start; see $DefaultData\logs\server.log" }
    }
    status   = {
        Write-Host "source version:    $Version"
        if (Test-Path $InstalledExe) { Write-Host "installed version: $(& $InstalledExe -version)  ($InstalledExe)" } else { Write-Host "installed version: (not installed)" }
        $ps = @(Get-RoadmapProcess)
        if (-not $ps.Count) { Write-Host "running:           no" }
        foreach ($p in $ps) {
            $v = if ($p.Legacy) { "legacy app" } else { $rv = Get-RunningVersion $p.Addr; if ($rv) { "v$rv" } else { "pre-1.2.0" } }
            Write-Host ("running:           {0} PID {1} on http://{2}  ({3})" -f $v, $p.Id, $p.Addr, $p.Path)
        }
        Write-Host "data folder:       $DefaultData"
        $b = Get-ChildItem (Join-Path $DefaultData "backups") -Filter "roadmap-*.db" -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
        if ($b) { Write-Host "latest backup:     $($b.FullName)" }
    }
    backup   = {
        $exe = if (Test-Path $InstalledExe) { $InstalledExe } else { New-Item -ItemType Directory -Force (Split-Path $StagedExe) | Out-Null; Step "build backup tool" { GoBuild $StagedExe }; $StagedExe }
        Backup-Data $exe $DefaultData "manual" | Out-Null
    }
    bump     = {
        if (-not $Arg.Count) { throw "usage: .\make bump patch|minor|major|X.Y.Z [`"change note`" ...]" }
        Step "bump version" { node scripts/version.js bump @Arg }
        Write-Host "Next: .\make upgrade   (installs the new version)"
    }
    dist     = {
        & $tasks.check
        if (Test-Path dist) { Remove-Item -Recurse -Force dist }
        New-Item -ItemType Directory dist | Out-Null
        foreach ($t in $platforms) {
            $os, $arch = $t.Split("/")
            $ext = if ($os -eq "windows") { ".exe" } else { "" }
            $env:GOOS = $os; $env:GOARCH = $arch
            Step "build $t" { GoBuild "dist/roadmap-server-$os-$arch$ext" }
        }
        Remove-Item Env:GOOS, Env:GOARCH
        $sums = Get-ChildItem dist -File | ForEach-Object { "{0}  {1}" -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower(), $_.Name }
        $sums | Set-Content -Encoding ascii dist/SHA256SUMS
        Write-Host "`nBinaries (v$Version) are in dist\ - each one is the complete app." -ForegroundColor Green
    }
    docker   = {
        Need docker "Install Docker Desktop: https://docs.docker.com/desktop/"
        Step "docker build $Image`:$Version" { docker build --build-arg VERSION=$Version -t "$Image`:$Version" -t "$Image`:latest" . }
    }
    up       = {
        Need docker "Install Docker Desktop: https://docs.docker.com/desktop/"
        $env:VERSION = $Version
        Step "docker compose up" { docker compose up -d --build }
        Write-Host "App running on http://localhost:8080  (stop with: .\make down)" -ForegroundColor Green
    }
    down     = { Need docker ""; Step "docker compose down" { docker compose down } }
    deploy   = {
        Need kubectl "Install kubectl: https://kubernetes.io/docs/tasks/tools/"
        & $tasks.docker
        $ref = "$Image`:$Version"
        $ctx = (& kubectl config current-context)
        if ($LASTEXITCODE -ne 0) { throw "kubectl has no current context - point it at a cluster first" }
        Write-Host "==> target context: $ctx" -ForegroundColor Cyan
        if ($Image -match "/") { Step "docker push $ref" { docker push $ref } }
        elseif ($ctx -like "kind-*") { Step "kind load" { kind load docker-image $ref --name $ctx.Substring(5) } }
        elseif ($ctx -eq "minikube") { Step "minikube image load" { minikube image load $ref } }
        # docker-desktop and similar share the local image store, so nothing to copy.
        Step "kubectl apply" { kubectl apply -f deploy/kubernetes.yaml }
        Step "set image $ref" { kubectl -n roadmap set image deployment/roadmap server=$ref }
        Step "rollout" { kubectl -n roadmap rollout status deployment/roadmap --timeout=180s }
        Write-Host "`nDeployed $ref. Open it with:`n  kubectl -n roadmap port-forward svc/roadmap 8080:80   ->  http://localhost:8080" -ForegroundColor Green
    }
    undeploy = { Need kubectl ""; Step "kubectl delete" { kubectl delete -f deploy/kubernetes.yaml --ignore-not-found } }
    clean    = { Remove-Item -Recurse -Force bin, dist -ErrorAction SilentlyContinue; Write-Host "removed bin\ and dist\" }
}

if (-not $tasks.Contains($Task)) { Write-Host "Unknown task '$Task'.`n" -ForegroundColor Red; & $tasks.help; exit 2 }
try { & $tasks[$Task] }
catch { Write-Host "`nmake $Task failed: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
