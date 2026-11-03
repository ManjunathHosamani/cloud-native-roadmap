// Kubernetes & Containers roadmap — content file (see CONTRIBUTING.md for the schema).
// Long fields use template literals; code is plain text, def/hint/interviewFocus.a are restricted HTML.
registerRoadmap({
  id: 'kubernetes',
  order: 20,
  title: 'Kubernetes & Containers',
  short: 'Kubernetes',
  icon: '☸️',
  color: '#326CE5',
  desc: 'Virtualization, containers, Docker and Kubernetes — from architecture to production operations.',
  unit: 'Module',
  modules: [
    // ───────────────────────────────────────────────────────────── Module 1
    {
      n: 1,
      title: 'Virtualization vs Containerization',
      summary: 'How VMs and containers actually isolate workloads: hypervisors, Linux namespaces, cgroups v2, overlay filesystems, the OCI specs and the runtime stack (runc, containerd, CRI-O). This is the foundation every Kubernetes debugging session eventually lands on.',
      topics: [
        {
          title: 'Hypervisors & Virtual Machines',
          def: `<p>A <strong>hypervisor</strong> (Virtual Machine Monitor) multiplexes physical hardware between several <strong>guest operating systems</strong>, each with its own kernel, drivers and virtual hardware.</p>
<ul>
<li><strong>Type 1 (bare-metal)</strong>: runs directly on hardware — VMware ESXi, Microsoft Hyper-V, Xen, and <strong>KVM</strong> (a Linux kernel module that turns Linux itself into a type-1 hypervisor; QEMU provides device emulation). All public clouds use type 1 (AWS Nitro is KVM-based).</li>
<li><strong>Type 2 (hosted)</strong>: runs as an application on a host OS — VirtualBox, VMware Workstation/Fusion, Parallels. Convenient for desktops, extra overhead and weaker isolation from the host OS.</li>
</ul>
<p>Modern virtualization is <strong>hardware-assisted</strong>: Intel VT-x / AMD-V add a privileged guest mode so guest kernels run natively, and <strong>EPT/NPT</strong> (second-level address translation) virtualize the MMU. I/O is accelerated with <strong>paravirtual drivers</strong> (virtio) or SR-IOV device passthrough.</p>
<p><strong>Trade-offs:</strong> VMs give a strong security boundary (a separate kernel, small hypervisor attack surface) and can run any OS, but cost a full guest kernel per workload (hundreds of MB RAM, seconds-to-minutes to boot, larger images). Kubernetes nodes themselves are almost always VMs — containers run <em>inside</em> VMs in the cloud, so the two technologies are complementary, not competing.</p>`,
          interview: 'Be ready to place KVM correctly (type 1, in-kernel), explain why hardware assistance (VT-x/AMD-V, EPT) made virtualization cheap, and state that in the cloud containers run inside VMs: VMs isolate tenants, containers pack applications.',
          examples: [
            { label: 'Check hardware virtualization support on a Linux host', lang: 'bash', code: `# Non-zero means VT-x (vmx) or AMD-V (svm) is available
grep -E -c '(vmx|svm)' /proc/cpuinfo
lscpu | grep -i virtualization

# Is the KVM module loaded? List libvirt-managed VMs
lsmod | grep kvm
virsh list --all` }
          ]
        },
        {
          title: 'Containers vs VMs',
          def: `<p>A <strong>container</strong> is just a <strong>Linux process</strong> (or process tree) that the kernel isolates with <strong>namespaces</strong> (what it can see), constrains with <strong>cgroups</strong> (what it can use), and gives a private root filesystem (usually an <strong>overlay</strong> of read-only image layers). It hardens further with capabilities, seccomp, and LSMs (AppArmor/SELinux). There is <em>no guest kernel</em> — all containers share the host kernel.</p>
<table>
<thead><tr><th>Aspect</th><th>Virtual machine</th><th>Container</th></tr></thead>
<tbody>
<tr><td>Isolation unit</td><td>Hardware (virtual CPU/MMU)</td><td>Kernel features (namespaces, cgroups)</td></tr>
<tr><td>Kernel</td><td>One per VM</td><td>Shared host kernel</td></tr>
<tr><td>Startup</td><td>Seconds to minutes</td><td>Milliseconds</td></tr>
<tr><td>Footprint</td><td>GBs image, 100s MB RAM overhead</td><td>MBs image, near-zero overhead</td></tr>
<tr><td>Security boundary</td><td>Strong</td><td>Weaker — a kernel exploit escapes all containers</td></tr>
<tr><td>OS flexibility</td><td>Any OS</td><td>Same kernel family (Linux containers on Linux)</td></tr>
</tbody>
</table>
<p>Consequences you must know: a container's <code>uname -r</code> shows the <em>host</em> kernel; kernel modules are host-wide; a Linux image cannot run natively on a Windows kernel (Docker Desktop hides a Linux VM). Containers win on density, startup speed and immutable packaging; VMs win on isolation and heterogeneity.</p>
<p><strong>Kernel parameters (sysctls) are split in two</strong> — a classic follow-up question:</p>
<ul>
<li><strong>Namespaced sysctls</strong> belong to a namespace, so each container/Pod has its own copy: almost all of <code>net.*</code> (network namespace — e.g. <code>net.ipv4.ip_local_port_range</code>, <code>net.core.somaxconn</code>, <code>net.ipv4.tcp_keepalive_time</code>) and the IPC ones (<code>kernel.shm*</code>, <code>kernel.msg*</code>, <code>kernel.sem</code>, <code>fs.mqueue.*</code>). Kubernetes sets them per Pod with <code>spec.securityContext.sysctls</code> (Docker: <code>--sysctl</code>).</li>
<li><strong>Node-level sysctls</strong> are global to the kernel and therefore shared by every container on the node: <code>vm.*</code> (e.g. <code>vm.max_map_count</code> for Elasticsearch, <code>vm.swappiness</code>), most other <code>kernel.*</code> and <code>fs.*</code> keys. A Pod cannot set them; change them on the node (node image, tuning DaemonSet or a privileged init container) — and they affect every Pod there.</li>
<li>Kubernetes further splits namespaced sysctls into <strong>safe</strong> (cannot affect other Pods or the node: e.g. <code>net.ipv4.ip_local_port_range</code>, <code>net.ipv4.ip_unprivileged_port_start</code>, <code>net.ipv4.tcp_syncookies</code>, <code>kernel.shm_rmid_forced</code>; allowed by default and by the <em>baseline</em> Pod Security level) and <strong>unsafe</strong> (e.g. <code>net.core.somaxconn</code>, <code>kernel.msgmax</code>; the kubelet rejects the Pod with <code>SysctlForbidden</code> unless the node allow-lists them via <code>--allowed-unsafe-sysctls</code>).</li>
</ul>`,
          interview: 'Never say a container is a lightweight VM without qualifying it. Say: a container is an isolated process sharing the host kernel; the isolation boundary is the kernel syscall surface, which is why sandboxed runtimes (gVisor, Kata) exist for untrusted code. If asked about sysctls: namespaced ones (net.*, kernel.shm*/msg*/sem) are per Pod via securityContext.sysctls (safe vs unsafe), node-level ones (vm.*) are shared and must be tuned on the node.',
          examples: [
            { label: 'Prove a container is just a host process', lang: 'bash', code: `docker run -d --name sleeper alpine sleep 3600
# The "container" appears in the host process table
ps -ef | grep 'sleep 3600'
# Same kernel inside and outside
uname -r
docker exec sleeper uname -r
# Its PID 1 inside maps to a normal host PID
docker inspect -f '{{.State.Pid}}' sleeper` },
            { label: 'Namespaced sysctls per Pod (safe and unsafe)', lang: 'yaml', code: `apiVersion: v1
kind: Pod
metadata:
  name: tuned-api
spec:
  securityContext:
    sysctls:
    - name: net.ipv4.ip_local_port_range   # safe + namespaced: always allowed
      value: "1024 65000"
    - name: net.core.somaxconn             # namespaced but UNSAFE: the node must allow it
      value: "4096"                        # kubelet --allowed-unsafe-sysctls='net.core.somaxconn'
  containers:
  - name: api
    image: ghcr.io/acme/api:1.4.2
# vm.max_map_count is NOT namespaced: it cannot be set here (tune it on the node instead).
# Docker equivalent: docker run --sysctl net.core.somaxconn=4096 ...` }
          ]
        },
        {
          title: 'Linux Namespaces',
          def: `<p>Namespaces wrap a global kernel resource so processes inside see their <strong>own isolated instance</strong>. A container is a process placed in a fresh set of them (via <code>clone()</code>/<code>unshare()</code> flags).</p>
<table>
<thead><tr><th>Namespace</th><th>Isolates</th><th>Container effect</th></tr></thead>
<tbody>
<tr><td><code>pid</code></td><td>Process IDs</td><td>App is PID 1; cannot see host processes</td></tr>
<tr><td><code>net</code></td><td>Interfaces, routes, iptables, ports</td><td>Own <code>eth0</code>, own port space (a K8s Pod shares one net ns)</td></tr>
<tr><td><code>mnt</code></td><td>Mount table</td><td>Private root filesystem via <code>pivot_root</code></td></tr>
<tr><td><code>uts</code></td><td>Hostname / domain name</td><td>Container has its own hostname</td></tr>
<tr><td><code>ipc</code></td><td>SysV IPC, POSIX message queues</td><td>Shared memory isolation</td></tr>
<tr><td><code>user</code></td><td>UID/GID mappings</td><td>Root in the container maps to an unprivileged host UID</td></tr>
<tr><td><code>cgroup</code></td><td>View of the cgroup tree</td><td>Container sees its cgroup as the root</td></tr>
<tr><td><code>time</code></td><td>CLOCK_MONOTONIC/BOOTTIME offsets</td><td>Used for checkpoint/restore</td></tr>
</tbody>
</table>
<p><strong>PID 1 matters:</strong> the kernel does not apply default signal handlers to PID 1, so an app that ignores SIGTERM will not die on <code>docker stop</code>/pod deletion until SIGKILL after the grace period. Use an init (<code>tini</code>, <code>docker run --init</code>) or handle signals properly. PID 1 must also reap zombie children.</p>
<p><strong>User namespaces</strong> are the strongest mitigation for container breakouts: Kubernetes supports them per-pod with <code>hostUsers: false</code> (beta since 1.30, enabled by default from 1.33). Each Pod gets its own non-overlapping range of 65536 host UIDs/GIDs, so UID 0 inside is an unprivileged UID on the host and capabilities only apply inside the namespace. Volumes still work thanks to <strong>idmapped mounts</strong>, which needs a recent kernel (Linux 6.3+ for tmpfs-backed volumes such as Secrets and projected tokens) and a runtime that supports it (containerd 2.0+, CRI-O 1.25+). Several high-severity container-escape CVEs were not exploitable with user namespaces enabled.</p>`,
          interview: 'List the namespaces from memory, explain that Pod containers share net/ipc (and optionally pid) namespaces through the pause container, and explain the PID 1 signal problem — it is the root cause of many slow pod terminations.',
          examples: [
            { label: 'Inspect and enter namespaces', lang: 'bash', code: `# Namespaces of the current shell
ls -l /proc/$$/ns

# Create a new PID + mount + UTS namespace with its own /proc
sudo unshare --pid --fork --mount-proc --uts bash
hostname demo-ns && ps aux     # only bash and ps are visible

# From the host: enter the net namespace of a running container
PID=$(docker inspect -f '{{.State.Pid}}' sleeper)
sudo nsenter -t "$PID" -n ip addr` }
          ]
        },
        {
          title: 'cgroups v2: Resource Control',
          def: `<p><strong>Control groups</strong> limit, account for and prioritise resources of process groups. <strong>cgroup v2</strong> uses a <em>single unified hierarchy</em> mounted at <code>/sys/fs/cgroup</code>, where each directory is a group and files are controller knobs.</p>
<ul>
<li><strong>memory</strong>: <code>memory.max</code> (hard limit — exceeding it triggers the OOM killer inside the cgroup → <code>OOMKilled</code>), <code>memory.high</code> (throttle/reclaim threshold), <code>memory.events</code> (oom, oom_kill counters).</li>
<li><strong>cpu</strong>: <code>cpu.max</code> = <code>"quota period"</code> (e.g. <code>50000 100000</code> = 0.5 CPU via CFS bandwidth control → <em>throttling</em>, not killing) and <code>cpu.weight</code> (relative share under contention; Kubernetes maps CPU <em>requests</em> to weight and <em>limits</em> to <code>cpu.max</code>).</li>
<li><strong>io</strong> (<code>io.max</code>, <code>io.weight</code>) and <strong>pids</strong> (<code>pids.max</code> — fork-bomb protection).</li>
<li><strong>PSI</strong> (pressure stall information: <code>cpu.pressure</code>, <code>memory.pressure</code>) shows how long tasks stalled waiting on a resource.</li>
</ul>
<p>v2 fixes v1 problems: consistent semantics across controllers, safe delegation to unprivileged users, and memory accounting that includes kernel/page-cache. Kubernetes cgroup v2 support is GA since 1.25; <strong>cgroup v1 is in maintenance mode since 1.31</strong> and from 1.35 the kubelet refuses to start on a v1 host by default (<code>failCgroupV1: true</code>; you can still opt out temporarily, but full removal of v1 support follows). Migrate node images (e.g. Amazon Linux 2, CentOS 7 era distros) before upgrading. Use the <code>systemd</code> cgroup driver in both kubelet and the runtime so there is only one cgroup manager.</p>`,
          interview: 'Know the exact mapping: memory limit -> memory.max (OOM kill), CPU limit -> cpu.max (throttling), CPU request -> cpu.weight (fair share). Mention the systemd cgroup driver must match between kubelet and containerd.',
          examples: [
            { label: 'Create a cgroup v2 and cap memory/CPU by hand', lang: 'bash', code: `stat -fc %T /sys/fs/cgroup      # "cgroup2fs" means cgroup v2
sudo mkdir /sys/fs/cgroup/demo
echo "+memory +cpu" | sudo tee /sys/fs/cgroup/cgroup.subtree_control
echo 100M          | sudo tee /sys/fs/cgroup/demo/memory.max
echo "50000 100000" | sudo tee /sys/fs/cgroup/demo/cpu.max   # 0.5 CPU
echo $$            | sudo tee /sys/fs/cgroup/demo/cgroup.procs
cat /sys/fs/cgroup/demo/memory.events /sys/fs/cgroup/demo/cpu.stat` }
          ]
        },
        {
          title: 'Overlay Filesystems & the OCI Specs',
          def: `<p>Container images are stacks of <strong>read-only layers</strong> (tar archives of filesystem diffs). At runtime a <strong>union filesystem</strong> — on Linux almost always <strong>overlayfs</strong> — merges them:</p>
<ul>
<li><code>lowerdir</code> = image layers (read-only, shared by every container from that image), <code>upperdir</code> = per-container writable layer, <code>workdir</code> = scratch, <code>merged</code> = the view the container sees.</li>
<li>Modifying a lower file triggers <strong>copy-up</strong> of the whole file into the upper layer; deleting it creates a <strong>whiteout</strong> entry. That is why deleting a file in a later Dockerfile layer never shrinks the image.</li>
<li>The writable layer dies with the container — persistent data belongs in volumes.</li>
</ul>
<p>The <strong>Open Container Initiative (OCI)</strong> standardises the ecosystem:</p>
<ul>
<li><strong>Image spec</strong>: an <em>image index</em> (multi-arch list) → per-platform <em>manifest</em> → a <em>config</em> JSON (env, entrypoint, rootfs diff IDs) plus <em>layer</em> blobs, all <strong>content-addressed by sha256 digest</strong>.</li>
<li><strong>Runtime spec</strong>: a <em>bundle</em> = <code>rootfs/</code> + <code>config.json</code> (process, mounts, namespaces, cgroups, capabilities, seccomp) and lifecycle operations (create/start/kill/delete).</li>
<li><strong>Distribution spec</strong>: the HTTP API registries implement (push/pull blobs and manifests); also used to store Helm charts, signatures and SBOMs as OCI artifacts.</li>
</ul>`,
          interview: 'Explain copy-up and whiteouts to justify Dockerfile practices, and explain that a digest (sha256) is immutable while a tag is a mutable pointer — the basis of reproducible deploys and image signing.',
          examples: [
            { label: 'Look inside an image without running it', lang: 'bash', code: `# Raw manifest / multi-arch index from the registry
docker buildx imagetools inspect nginx:1.27
crane manifest nginx:1.27 | jq .

# Copy into an on-disk OCI layout and explore blobs
skopeo copy docker://alpine:3.20 oci:alpine-oci:3.20
cat alpine-oci/index.json | jq .
ls alpine-oci/blobs/sha256/

# See the overlay mount of a running container
docker inspect -f '{{json .GraphDriver.Data}}' sleeper | jq .` }
          ]
        },
        {
          title: 'Container Runtimes: runc, containerd, CRI-O, CRI & Sandboxes',
          def: `<p>The runtime stack is layered:</p>
<ul>
<li><strong>Low-level (OCI) runtime</strong>: <code>runc</code> (reference implementation, Go) or <code>crun</code> (C, faster/smaller). Takes an OCI bundle, sets up namespaces/cgroups/seccomp, execs the process, exits.</li>
<li><strong>High-level runtime</strong>: <strong>containerd</strong> (CNCF graduated; image pull/unpack via snapshotters, content store, a per-container <em>shim</em> that keeps the container alive independent of the daemon) or <strong>CRI-O</strong> (built only for Kubernetes, default on OpenShift).</li>
<li><strong>CRI</strong> (Container Runtime Interface): the gRPC API (<code>RuntimeService</code>: RunPodSandbox, CreateContainer…; <code>ImageService</code>: PullImage…) that the <strong>kubelet</strong> calls. containerd implements it via its built-in CRI plugin.</li>
<li><strong>Docker Engine</strong> sits on top of containerd. Kubernetes removed <em>dockershim</em> in 1.24; Docker-built images still run everywhere because they are OCI images. Keep the runtime current too: Kubernetes 1.35 was announced as the last release supporting containerd 1.x, so nodes need containerd 2.x after that.</li>
</ul>
<p><strong>Sandboxed runtimes</strong> for untrusted/multi-tenant code: <strong>gVisor</strong> (<code>runsc</code>: a user-space kernel "Sentry" intercepts syscalls — smaller host attack surface, some syscall/perf overhead), <strong>Kata Containers</strong> (each pod in a lightweight VM with its own kernel, using QEMU/Cloud Hypervisor/Firecracker), and <strong>Firecracker</strong> microVMs (AWS Lambda/Fargate; ~125 ms boot). Kubernetes selects them per pod with a <strong>RuntimeClass</strong>.</p>`,
          interview: 'Draw the chain: kubectl -> API server -> kubelet -> (CRI gRPC) -> containerd -> containerd-shim-runc-v2 -> runc -> your process. Explain why dockershim removal did not break images, and when you would pick gVisor vs Kata.',
          examples: [
            { label: 'Debug at the CRI level on a node with crictl', lang: 'bash', code: `crictl info | head                 # runtime status and config
crictl pods --namespace default
crictl ps -a                      # containers incl. exited ones
crictl logs <container-id>
crictl inspect <container-id> | jq '.info.runtimeSpec.linux.resources'
crictl images; crictl rmi --prune` },
            { label: 'Run a pod under gVisor with RuntimeClass', lang: 'yaml', code: `apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc          # must match a runtime handler configured in containerd
---
apiVersion: v1
kind: Pod
metadata:
  name: untrusted
spec:
  runtimeClassName: gvisor
  containers:
  - name: app
    image: registry.example.com/untrusted-job:1.4.2` }
          ]
        }
      ],
      problems: [
        {
          t: 'Explain containers vs VMs to a skeptical architect',
          d: 'easy',
          type: 'concept',
          hint: `<ul>
<li>Start with the isolation mechanism: hardware virtualization vs kernel namespaces/cgroups.</li>
<li>Cover shared kernel implications (security boundary, OS compatibility).</li>
<li>Quantify: startup ms vs s, MB vs GB, density.</li>
<li>Close with "complementary": K8s nodes are VMs; sandboxed runtimes blur the line.</li>
</ul>`
        },
        {
          t: 'Inspect the namespaces and cgroup of a running container',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Find the host PID with <code>docker inspect</code> (or <code>crictl inspect</code> on a K8s node).</li>
<li>Compare <code>/proc/&lt;pid&gt;/ns/*</code> inode numbers with your shell's.</li>
<li>Read <code>/proc/&lt;pid&gt;/cgroup</code> and then the limit files under <code>/sys/fs/cgroup</code>.</li>
</ul>`,
          solution: `docker run -d --name web --memory 256m --cpus 0.5 nginx:1.27
PID=$(docker inspect -f '{{.State.Pid}}' web)
sudo ls -l /proc/$PID/ns          # inode numbers differ from /proc/self/ns
cat /proc/$PID/cgroup              # e.g. 0::/system.slice/docker-<id>.scope
CG=/sys/fs/cgroup$(cut -d: -f3 /proc/$PID/cgroup)
cat $CG/memory.max                 # 268435456
cat $CG/cpu.max                    # 50000 100000
sudo nsenter -t $PID -n ss -lntp   # nginx listening on :80 inside its net ns`,
          lang: 'bash'
        },
        {
          t: 'Build a "container" by hand with unshare and chroot',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Get a root filesystem by exporting an image (<code>docker export</code>).</li>
<li><code>unshare</code> new pid, mount, uts, net and ipc namespaces with <code>--fork --mount-proc</code>.</li>
<li><code>chroot</code> (runc actually uses <code>pivot_root</code>) into the rootfs.</li>
<li>Add a cgroup limit by writing the PID to <code>cgroup.procs</code>.</li>
</ul>`,
          solution: `mkdir rootfs
docker export $(docker create alpine:3.20) | tar -C rootfs -xf -
sudo unshare --pid --fork --mount --uts --ipc --net --mount-proc=rootfs/proc \\
  chroot rootfs /bin/sh -c 'hostname box; ps; ip link; exec sh'
# In another terminal, cap memory with cgroup v2:
sudo mkdir /sys/fs/cgroup/box && echo 64M | sudo tee /sys/fs/cgroup/box/memory.max
echo <pid-of-sh> | sudo tee /sys/fs/cgroup/box/cgroup.procs`,
          lang: 'bash'
        },
        {
          t: 'Trigger and observe an OOM kill under cgroups v2',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Run a container with a small <code>--memory</code> limit and allocate more than that.</li>
<li>Check <code>docker inspect</code> <code>.State.OOMKilled</code> and exit code 137 (128 + SIGKILL 9).</li>
<li>Read <code>memory.events</code> to see the <code>oom_kill</code> counter.</li>
<li>Contrast: exceeding a CPU limit throttles, it never kills.</li>
</ul>`,
          solution: `docker run --name hog --memory 64m --memory-swap 64m python:3.12-slim \\
  python -c "b = bytearray(200 * 1024 * 1024)"
docker inspect -f '{{.State.OOMKilled}} {{.State.ExitCode}}' hog   # true 137
dmesg | grep -i 'killed process' | tail -1
# Kubernetes equivalent: lastState.terminated.reason == OOMKilled
kubectl get pod <pod> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'`,
          lang: 'bash'
        },
        {
          t: 'Explore an OCI image: index, manifest, config and layers',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Pull a multi-arch image's index and pick the linux/amd64 manifest.</li>
<li>Follow digests: index → manifest → config + layers.</li>
<li>Note the difference between a <em>layer digest</em> (compressed blob) and a <em>diff ID</em> (uncompressed).</li>
<li>Pin the image by digest and explain why that is reproducible.</li>
</ul>`,
          solution: `crane manifest golang:1.23 | jq '.manifests[] | {platform, digest}'
DIG=$(crane manifest golang:1.23 | jq -r '.manifests[] | select(.platform.architecture=="amd64" and .platform.os=="linux") | .digest')
crane manifest golang@$DIG | jq '.config, .layers[].digest'
crane config golang@$DIG | jq '.config.Env, .rootfs.diff_ids'
# Deploy by digest (immutable) instead of tag (mutable):
#   image: golang@sha256:<digest>`,
          lang: 'bash'
        },
        {
          t: 'Debug a node-level container problem with crictl',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>kubectl may be unavailable or the API server may be the thing that is broken — go to the node.</li>
<li><code>systemctl status containerd kubelet</code> and <code>journalctl -u kubelet</code>.</li>
<li><code>crictl ps -a</code> shows exited containers and restart counts; <code>crictl logs</code> works without the API server.</li>
<li>Check the CRI socket path and the cgroup driver match (<code>SystemdCgroup = true</code>).</li>
</ul>`,
          solution: `sudo systemctl status containerd kubelet
sudo journalctl -u kubelet --since "15 min ago" | grep -iE 'error|failed' | tail -20
sudo crictl --runtime-endpoint unix:///run/containerd/containerd.sock ps -a
sudo crictl logs --tail 50 <container-id>
sudo crictl inspectp <pod-sandbox-id> | jq '.status.state'
grep -n SystemdCgroup /etc/containerd/config.toml   # should be true with systemd driver`,
          lang: 'bash'
        },
        {
          t: 'Go service ignores container CPU/memory limits',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Runtimes historically read host CPU count/memory, not the cgroup limit — e.g. GOMAXPROCS = 64 on a 2-CPU limit causes heavy CFS throttling.</li>
<li>Go 1.25+ sets GOMAXPROCS from the cgroup CPU limit automatically; on older Go use <code>go.uber.org/automaxprocs</code> or set it from the downward API.</li>
<li>Set <code>GOMEMLIMIT</code> (~90% of the memory limit) so the GC works harder before the OOM killer strikes.</li>
<li>JVMs: use container-aware flags (<code>-XX:MaxRAMPercentage</code>).</li>
</ul>`,
          solution: `env:
- name: GOMEMLIMIT
  valueFrom:
    resourceFieldRef:
      resource: limits.memory      # bytes; GOMEMLIMIT accepts plain bytes
      divisor: "1"
- name: GOMAXPROCS                # only needed for Go < 1.25
  valueFrom:
    resourceFieldRef:
      resource: limits.cpu
      divisor: "1"                # rounds up to whole CPUs`,
          lang: 'yaml'
        },
        {
          t: 'Why is running as root in a container dangerous, and how do you mitigate it?',
          d: 'medium',
          type: 'concept',
          hint: `<ul>
<li>Without a user namespace, UID 0 in the container <em>is</em> UID 0 on the host — limited only by dropped capabilities, seccomp and LSMs.</li>
<li>Any kernel or runtime bug (e.g. runc CVE-2019-5736, Leaky Vessels CVE-2024-21626) becomes a host root compromise.</li>
<li>Mitigations: non-root USER, <code>runAsNonRoot</code>, drop ALL capabilities, <code>allowPrivilegeEscalation: false</code>, RuntimeDefault seccomp, read-only rootfs, user namespaces (<code>hostUsers: false</code>), sandboxed runtimes.</li>
</ul>`
        },
        {
          t: 'Trace docker run / kubelet pod start through the runtime stack',
          d: 'hard',
          type: 'concept',
          hint: `<ul>
<li>Docker CLI → dockerd (REST) → containerd (gRPC) → <code>containerd-shim-runc-v2</code> → <code>runc create/start</code> → process; runc exits, the shim stays as parent and holds stdio/exit code.</li>
<li>Kubelet path: RunPodSandbox (creates the <em>pause</em> container + network namespace, invokes the CNI plugin) → PullImage → CreateContainer → StartContainer.</li>
<li>Snapshotter prepares the overlay rootfs; containerd generates the OCI <code>config.json</code>.</li>
<li>Why the shim exists: restart containerd without killing containers.</li>
</ul>`
        },
        {
          t: 'Design isolation for running untrusted customer code on Kubernetes',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>Threat model: hostile tenant attempting kernel exploits and lateral movement.</li>
<li>Compute: RuntimeClass with gVisor or Kata (VM boundary), dedicated node pools via taints/tolerations, no hostPath/privileged (Pod Security <em>restricted</em>).</li>
<li>Network: default-deny NetworkPolicy, egress allow-lists, block cloud metadata endpoint (169.254.169.254).</li>
<li>Identity: no automounted ServiceAccount tokens; per-tenant namespaces, quotas and LimitRanges.</li>
<li>Trade-offs: gVisor syscall overhead and compatibility vs Kata memory/boot overhead; for the strongest isolation use separate clusters or Firecracker microVMs.</li>
</ul>`
        },
        {
          t: 'Pod needs custom kernel parameters (sysctls) — what can be set per Pod?',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Scenario: a high-connection API wants a larger <code>net.core.somaxconn</code> and a wider <code>net.ipv4.ip_local_port_range</code>; an Elasticsearch Pod fails its bootstrap check on <code>vm.max_map_count</code>.</li>
<li>First classify each key. <strong>Namespaced</strong> sysctls have one copy per network/IPC namespace (<code>net.*</code>, <code>kernel.shm*</code>, <code>kernel.msg*</code>, <code>kernel.sem</code>, <code>fs.mqueue.*</code>); <strong>node-level</strong> ones are global to the kernel (<code>vm.*</code>, most other <code>kernel.*</code>). Only namespaced keys can go in <code>spec.securityContext.sysctls</code>.</li>
<li>Namespaced + <strong>safe</strong> (e.g. <code>ip_local_port_range</code>) → just set it. Namespaced + <strong>unsafe</strong> (e.g. <code>somaxconn</code>) → the kubelet rejects the Pod with <code>SysctlForbidden</code> until the node allow-lists the key (<code>allowedUnsafeSysctls</code>); keep such Pods on a dedicated, tainted pool. The baseline Pod Security level only admits safe sysctls.</li>
<li>Node-level → tune the node (node image or bootstrap script, a tuning DaemonSet, or a privileged init container as a last resort), knowing it changes the kernel for every Pod on that node; label or taint the tuned pool and schedule the workload there.</li>
<li><code>hostNetwork: true</code> Pods share the node's network namespace, so per-Pod <code>net.*</code> sysctls are rejected for them (same for IPC keys with <code>hostIPC</code>).</li>
</ul>`,
          solution: `kubectl describe pod api-xyz | grep -i sysctl
#   SysctlForbidden: forbidden sysctl: "net.core.somaxconn" not allowlisted
# Namespaced keys show different values in a Pod and on the node:
kubectl exec api-xyz -- cat /proc/sys/net/core/somaxconn
kubectl debug node/worker-1 -it --image=busybox:1.36 -- cat /proc/sys/net/core/somaxconn
# Allow the unsafe-but-namespaced key on a dedicated pool (KubeletConfiguration):
#   allowedUnsafeSysctls: ["net.core.somaxconn"]
# ...then request it in the Pod:
#   securityContext:
#     sysctls: [{ name: net.core.somaxconn, value: "4096" }]
# Node-level key: tune the pool, never the Pod
kubectl label nodes es-1 es-2 es-3 tuning=search
#   e.g. a DaemonSet on tuning=search nodes running: sysctl -w vm.max_map_count=262144`,
          lang: 'bash'
        }
      ],
      interviewFocus: [
        {
          q: 'What exactly is a container, at the kernel level?',
          a: `<p>A container is an ordinary Linux process tree configured with:</p>
<ul>
<li><strong>Namespaces</strong> for visibility isolation (pid, net, mnt, uts, ipc, user, cgroup, time).</li>
<li><strong>cgroups</strong> for resource limits and accounting (memory.max, cpu.max, pids.max…).</li>
<li>A private <strong>root filesystem</strong> via <code>pivot_root</code> into an overlayfs mount of image layers.</li>
<li><strong>Security hardening</strong>: reduced capabilities, a seccomp syscall filter, AppArmor/SELinux profile, optionally a user namespace.</li>
</ul>
<p>There is no "container" object in the kernel; the runtime (runc) assembles these primitives from an OCI <code>config.json</code>. Because the kernel is shared, the security boundary is the syscall interface.</p>`
        },
        {
          q: 'Compare runc, containerd, CRI-O, gVisor and Kata. Where does each sit?',
          a: `<ul>
<li><strong>runc / crun</strong>: low-level OCI runtimes. Create namespaces/cgroups and exec the process. Short-lived.</li>
<li><strong>containerd</strong>: high-level daemon — image pull/storage, snapshotters, container lifecycle through shims; exposes CRI to kubelet. Used by Docker, EKS, GKE, AKS.</li>
<li><strong>CRI-O</strong>: Kubernetes-only high-level runtime implementing CRI, versioned with Kubernetes; default on OpenShift.</li>
<li><strong>gVisor (runsc)</strong>: OCI runtime with a user-space application kernel; reduces host kernel attack surface at the cost of syscall overhead and some incompatibility.</li>
<li><strong>Kata</strong>: OCI runtime that boots a lightweight VM per pod; hardware isolation with VM overhead.</li>
</ul>
<p>gVisor and Kata plug in <em>beneath</em> containerd/CRI-O as alternative runtime handlers selected through <strong>RuntimeClass</strong>.</p>`
        },
        {
          q: 'How do CPU and memory limits behave differently, and why?',
          a: `<p><strong>Memory is incompressible</strong>: you cannot take back a page without the app's cooperation, so exceeding <code>memory.max</code> invokes the cgroup OOM killer — the container is killed (exit 137, <code>OOMKilled</code>).</p>
<p><strong>CPU is compressible</strong>: CFS bandwidth control gives a quota per period (default 100 ms). When the quota is used up the cgroup is <strong>throttled</strong> until the next period — latency spikes, no kill. Multi-threaded apps can burn a 200 ms quota in 25 ms on 8 cores and then stall 75 ms.</p>
<p>Implications: always set memory limits (usually equal to requests for predictability); many teams set CPU requests but omit CPU limits for latency-sensitive services, and watch <code>container_cpu_cfs_throttled_periods_total</code>.</p>`
        },
        {
          q: 'Why did Kubernetes remove dockershim, and what changed for users?',
          a: `<p>Docker Engine never implemented CRI, so the kubelet carried an in-tree adapter (dockershim) translating CRI to the Docker API — which itself then called containerd. That extra hop added maintenance burden, bugs and latency. Kubernetes 1.24 removed it.</p>
<ul>
<li><strong>Images</strong>: unaffected — Docker builds OCI-compliant images.</li>
<li><strong>Nodes</strong>: switch to containerd or CRI-O (or cri-dockerd if you truly need Docker).</li>
<li><strong>Breakage</strong>: anything mounting <code>/var/run/docker.sock</code> (old CI "Docker-in-Docker", log agents parsing Docker JSON logs) had to change; use <code>crictl</code>, BuildKit/Kaniko, CRI log format.</li>
</ul>`
        },
        {
          q: 'Why does deleting a file in a later Dockerfile layer not reduce image size?',
          a: `<p>Layers are immutable diffs stacked by overlayfs. A delete in layer N writes a <strong>whiteout</strong> marker that hides the file in the merged view, but the bytes still live in layer N-1, which is still shipped and pulled. Fixes: do download-use-delete in the <strong>same RUN</strong> instruction, or use <strong>multi-stage builds</strong> so only the final artifacts are copied into a clean final stage. The same mechanism explains why a secret <code>COPY</code>-ed and later deleted is still extractable from the image — use BuildKit secret mounts instead.</p>`
        }
      ],
      quiz: [
        { q: 'Is KVM a type 1 or type 2 hypervisor?', a: 'Type 1 — it is a Linux kernel module that turns the host kernel into a bare-metal hypervisor (QEMU provides device emulation).' },
        { q: 'Which namespace gives a container its own network interfaces and port space?', a: 'The network (net) namespace.' },
        { q: 'What happens when a container exceeds its memory limit vs its CPU limit?', a: 'Memory: the cgroup OOM killer kills it (exit code 137, OOMKilled). CPU: it is throttled by CFS bandwidth control, not killed.' },
        { q: 'What cgroup v2 file holds the CPU limit and what is its format?', a: 'cpu.max, formatted as "quota period" in microseconds, e.g. "50000 100000" for half a CPU.' },
        { q: 'What is copy-up in overlayfs?', a: 'When a container modifies a file from a read-only lower layer, the whole file is first copied into the writable upper layer and then changed.' },
        { q: 'What are the three OCI specifications?', a: 'Image spec, runtime spec and distribution spec.' },
        { q: 'Which interface does the kubelet use to talk to containerd or CRI-O?', a: 'CRI — the Container Runtime Interface, a gRPC API with RuntimeService and ImageService.' },
        { q: 'Which Kubernetes object selects gVisor or Kata for a pod?', a: 'RuntimeClass, referenced via spec.runtimeClassName.' },
        { q: 'Can a Pod set its own kernel parameters (sysctls)?', a: 'Only namespaced ones (net.*, kernel.shm*, kernel.msg*, kernel.sem, fs.mqueue.*) via spec.securityContext.sysctls; safe ones are allowed by default, unsafe ones must be allow-listed on the kubelet. Node-level sysctls such as vm.max_map_count are shared by all Pods and must be set on the node.' }
      ],
      resources: [
        { title: 'Open Container Initiative — specifications', url: 'https://opencontainers.org/', type: 'docs' },
        { title: 'Kubernetes Docs — Container Runtimes', url: 'https://kubernetes.io/docs/setup/production-environment/container-runtimes/', type: 'docs' },
        { title: 'Kubernetes Docs — About cgroup v2', url: 'https://kubernetes.io/docs/concepts/architecture/cgroups/', type: 'docs' },
        { title: 'Linux man page — namespaces(7)', url: 'https://man7.org/linux/man-pages/man7/namespaces.7.html', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────────────────────── Module 2
    {
      n: 2,
      title: 'Docker',
      summary: 'Building small, secure, reproducible images and running them: layers and caching, multi-stage Dockerfiles, BuildKit, networking, volumes, Compose, registries, scanning and signing. Interviewers use Docker questions to check whether you understand what Kubernetes is actually running.',
      topics: [
        {
          title: 'Images, Layers & the Build Cache',
          def: `<p>An image is an ordered stack of layers plus a config. In a Dockerfile, every filesystem-changing instruction (<code>RUN</code>, <code>COPY</code>, <code>ADD</code>) creates a layer; metadata instructions (<code>ENV</code>, <code>CMD</code>, <code>EXPOSE</code>, <code>LABEL</code>) only change the config.</p>
<p><strong>Cache rule:</strong> the builder reuses a layer if the instruction text and its inputs are unchanged <em>and</em> every previous layer was a cache hit. For <code>COPY</code>/<code>ADD</code> the inputs are file checksums. Once one step misses, <strong>every later step rebuilds</strong>. Therefore:</p>
<ul>
<li>Order instructions from least to most frequently changing: base image → OS packages → dependency manifests (<code>go.mod</code>/<code>go.sum</code>) → dependency download → source code → build.</li>
<li>Combine <code>apt-get update &amp;&amp; apt-get install … &amp;&amp; rm -rf /var/lib/apt/lists/*</code> in one <code>RUN</code> so you never cache a stale index and the cleanup actually shrinks the layer.</li>
<li>A <code>.dockerignore</code> keeps <code>.git</code>, build outputs, local env files and secrets out of the build context, which both speeds up the build and prevents spurious cache misses.</li>
</ul>
<p>Tools: <code>docker history</code> shows per-layer size; <code>dive</code> lets you browse layer contents and wasted space.</p>`,
          interview: 'Explain the cache-invalidation cascade and why COPY go.mod go.sum before COPY . matters. Interviewers often hand you a slow Dockerfile and ask you to reorder it.',
          examples: [
            { label: 'Inspect layers and sizes', lang: 'bash', code: `docker history --no-trunc --format '{{.Size}}\\t{{.CreatedBy}}' myapp:1.0
docker image inspect myapp:1.0 --format '{{json .RootFS.Layers}}' | jq length
dive myapp:1.0          # interactive layer explorer (wagoodman/dive)` },
            { label: 'A sensible .dockerignore', lang: 'bash', code: `# .dockerignore
.git
.github
**/*_test.go
bin/
dist/
*.env
.env*
docker-compose*.yml
Dockerfile*
README.md` }
          ]
        },
        {
          title: 'Dockerfile Best Practices: Multi-stage, Non-root, Distroless',
          def: `<p>A production Dockerfile should be <strong>small, reproducible, least-privilege and cache-friendly</strong>.</p>
<ul>
<li><strong>Multi-stage builds</strong>: compile in a full SDK image, copy only the artifact into a minimal runtime stage. A Go service goes from ~1 GB (<code>golang</code>) to ~10–20 MB.</li>
<li><strong>Minimal base</strong>: <code>gcr.io/distroless/static</code> (no shell, no package manager, CA certs + tzdata + nonroot user) or <code>scratch</code> (truly empty — you must add CA certs and a user yourself). Alpine uses musl libc, which can surprise CGO and DNS-heavy apps.</li>
<li><strong>Pin the base</strong>: a specific tag (<code>golang:1.25-alpine3.22</code>) at minimum, ideally <code>@sha256:</code> digest, updated by Renovate/Dependabot.</li>
<li><strong>Non-root</strong>: <code>USER 65532</code> (numeric UIDs let Kubernetes verify <code>runAsNonRoot</code>). Combine with a read-only root filesystem at runtime.</li>
<li><strong>Exec form</strong> <code>ENTRYPOINT ["/app"]</code>, not shell form, so the app is PID 1 and receives SIGTERM directly.</li>
<li>Prefer <code>COPY</code> over <code>ADD</code> (ADD auto-extracts tars and fetches URLs). Never bake secrets into layers or <code>ENV</code>.</li>
<li>Add <code>LABEL org.opencontainers.image.source/revision</code> for traceability.</li>
</ul>`,
          interview: 'Be able to write a Go multi-stage Dockerfile from memory, justify distroless vs scratch vs alpine, and explain exec vs shell form (signal handling) and ENTRYPOINT vs CMD (CMD supplies default args).',
          examples: [
            { label: 'Production multi-stage Dockerfile for a Go service', lang: 'dockerfile', code: `# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS build
WORKDIR /src
# 1) dependencies: cached until go.mod/go.sum change
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
# 2) source + build
COPY . .
ARG TARGETOS TARGETARCH
RUN --mount=type=cache,target=/go/pkg/mod \\
    --mount=type=cache,target=/root/.cache/go-build \\
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \\
    go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
LABEL org.opencontainers.image.source="https://github.com/acme/api"
COPY --from=build /out/api /api
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/api"]` }
          ]
        },
        {
          title: 'BuildKit & buildx',
          def: `<p><strong>BuildKit</strong> is the default builder since Docker Engine 23. It builds a DAG of stages, runs independent stages <strong>in parallel</strong>, skips unused stages, and adds powerful <code>RUN --mount</code> options:</p>
<ul>
<li><code>--mount=type=cache</code>: persistent package/compiler caches (Go module and build caches, npm, pip) that survive across builds without bloating layers.</li>
<li><code>--mount=type=secret</code>: exposes a secret file for one <code>RUN</code> only — never written to a layer or history.</li>
<li><code>--mount=type=ssh</code>: forwards the SSH agent for private git dependencies.</li>
</ul>
<p><strong>buildx</strong> is the CLI front-end: multi-platform builds (<code>--platform linux/amd64,linux/arm64</code>, via cross-compilation or QEMU emulation), remote/Kubernetes builders, and <strong>cache export</strong> (<code>--cache-to/--cache-from type=registry|gha|local</code>) so ephemeral CI runners still hit the cache. It can also attach <strong>SBOM</strong> and <strong>SLSA provenance</strong> attestations (<code>--sbom=true --provenance=mode=max</code>).</p>
<p>In-cluster/daemonless alternatives: BuildKit rootless, Kaniko (now community-maintained after Google archived it), Buildah, <code>ko</code> for Go (builds images without a Dockerfile).</p>`,
          interview: 'Show you can make CI builds fast (registry cache export, cache mounts) and secure (secret mounts instead of build args). Mention that build args are visible in docker history.',
          examples: [
            { label: 'Multi-arch build with registry cache, SBOM and provenance', lang: 'bash', code: `docker buildx create --name ci --use
docker buildx build \\
  --platform linux/amd64,linux/arm64 \\
  --cache-from type=registry,ref=ghcr.io/acme/api:buildcache \\
  --cache-to   type=registry,ref=ghcr.io/acme/api:buildcache,mode=max \\
  --sbom=true --provenance=mode=max \\
  -t ghcr.io/acme/api:1.4.2 --push .` }
          ]
        },
        {
          title: 'Container Networking',
          def: `<p>Docker network drivers:</p>
<ul>
<li><strong>bridge</strong> (default): a Linux bridge (<code>docker0</code>) with a veth pair per container and NAT for egress. On a <strong>user-defined bridge</strong>, Docker's embedded DNS (<code>127.0.0.11</code>) resolves container/service names; on the legacy default bridge it does not — a classic gotcha.</li>
<li><strong>host</strong>: no network namespace — the container uses the host stack directly (fast, no isolation, port conflicts).</li>
<li><strong>none</strong>: loopback only, for batch jobs that need no network.</li>
<li><strong>overlay</strong> (Swarm, multi-host VXLAN), <strong>macvlan/ipvlan</strong> (container gets an address on the physical LAN).</li>
</ul>
<p><strong>Port publishing</strong> <code>-p 8080:80</code> installs iptables/nftables DNAT rules (host 8080 → container 80) plus a userland <code>docker-proxy</code> for loopback traffic. By default it binds <code>0.0.0.0</code>, and because Docker inserts its rules before host firewall chains, a published port can bypass ufw/firewalld — bind explicitly with <code>-p 127.0.0.1:8080:80</code> for local-only services. <code>EXPOSE</code> is documentation only; it publishes nothing.</p>
<p>Inside a container, <code>localhost</code> is the container itself. An app listening on <code>127.0.0.1</code> is unreachable from outside — listen on <code>0.0.0.0</code>.</p>`,
          interview: 'Common debug probes: "my containers cannot reach each other by name" (default bridge), "port published but connection refused" (app bound to 127.0.0.1), "localhost inside the container" confusion, and the firewall bypass of -p.',
          examples: [
            { label: 'User-defined bridge with DNS-based discovery', lang: 'bash', code: `docker network create appnet
docker run -d --name db  --network appnet -e POSTGRES_PASSWORD=dev postgres:16
docker run -d --name api --network appnet -p 127.0.0.1:8080:8080 \\
  -e DATABASE_URL=postgres://postgres:dev@db:5432/postgres acme/api:1.4.2
docker run --rm --network appnet busybox nslookup db     # resolved by 127.0.0.11
docker network inspect appnet --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\\n"}}{{end}}'
sudo iptables -t nat -L DOCKER -n                         # the DNAT rule for :8080` }
          ]
        },
        {
          title: 'Volumes, Bind Mounts & Docker Compose',
          def: `<p>The container writable layer is ephemeral and slow (copy-on-write). Persist data with:</p>
<ul>
<li><strong>Named volumes</strong>: managed by Docker under <code>/var/lib/docker/volumes</code>, portable, pre-populated from the image path on first use, support volume drivers (NFS, cloud). Default choice for databases.</li>
<li><strong>Bind mounts</strong>: map an exact host path — great for dev hot-reload and config; ties the container to host layout and UID/GID ownership (a common "permission denied" source for non-root images).</li>
<li><strong>tmpfs</strong>: in-memory, never written to disk — scratch space and sensitive temp files.</li>
</ul>
<p>Prefer the explicit <code>--mount type=volume|bind|tmpfs,src=…,dst=…[,readonly]</code> syntax.</p>
<p><strong>Docker Compose</strong> (v2, <code>docker compose</code>; the top-level <code>version:</code> key is obsolete) declares multi-container apps in <code>compose.yaml</code>: services, networks (a project network with DNS is created automatically), volumes, env files, <code>healthcheck</code>s, and <code>depends_on</code> with <code>condition: service_healthy</code> to order startup. <code>profiles</code> toggle optional services; <code>docker compose watch</code> syncs code for dev loops. Compose is for local dev/CI integration tests — in production its role is taken by Kubernetes manifests.</p>`,
          interview: 'Know the three mount types and when to use each, and that depends_on without a health condition only orders container start, not readiness. Compose is a common way to stand up integration-test dependencies in CI — a natural bridge from QA experience.',
          examples: [
            { label: 'compose.yaml: Go API + Postgres + Redis with health-gated startup', lang: 'yaml', code: `services:
  api:
    build: .
    ports: ["127.0.0.1:8080:8080"]
    environment:
      DATABASE_URL: postgres://app:app@db:5432/app?sslmode=disable
      REDIS_ADDR: cache:6379
    depends_on:
      db:    { condition: service_healthy }
      cache: { condition: service_started }
    read_only: true
    tmpfs: [/tmp]
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: app, POSTGRES_PASSWORD: app, POSTGRES_DB: app }
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 3s
      retries: 10
  cache:
    image: redis:7-alpine
volumes:
  pgdata: {}` }
          ]
        },
        {
          title: 'Registries, Tagging, Scanning & Signing',
          def: `<p><strong>Registries</strong> (Docker Hub, GHCR, ECR, Artifact Registry, ACR, Harbor) implement the OCI distribution API. An image reference is <code>registry/repo:tag@sha256:digest</code>.</p>
<ul>
<li><strong>Tags are mutable pointers; digests are immutable</strong>. Never deploy <code>:latest</code>. Tag with semver and/or git SHA (<code>1.4.2</code>, <code>sha-3f2a9c1</code>), enable tag immutability in the registry, and pin by digest in production manifests (GitOps tools can resolve this).</li>
<li>Docker Hub enforces pull rate limits — mirror or proxy-cache base images for CI and clusters.</li>
</ul>
<p><strong>Scanning</strong>: Trivy, Grype or Docker Scout match the image's packages (an <strong>SBOM</strong>, e.g. generated by Syft in SPDX/CycloneDX) against CVE databases. Gate CI on fixable HIGH/CRITICAL findings, and rescan running images continuously because new CVEs appear after build.</p>
<p><strong>Signing</strong>: <strong>Sigstore cosign</strong> signs the image digest and stores the signature as an OCI artifact next to it. <em>Keyless</em> mode uses a short-lived certificate from Fulcio bound to the CI's OIDC identity and records it in the Rekor transparency log. Clusters verify signatures and attestations (SBOM, SLSA provenance) at admission with Kyverno, Sigstore policy-controller or Gatekeeper. Notation (Notary Project) is the alternative standard.</p>`,
          interview: 'Explain why you sign digests, not tags, and how keyless signing ties an image to a specific CI workflow identity. Expect "how do you prevent a compromised image from reaching production" as a design follow-up.',
          examples: [
            { label: 'Scan, generate SBOM, sign and verify an image', lang: 'bash', code: `IMG=ghcr.io/acme/api@sha256:<digest>
trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 "$IMG"
syft "$IMG" -o spdx-json > sbom.spdx.json

# Keyless signing in CI (GitHub Actions OIDC token)
cosign sign --yes "$IMG"
cosign attest --yes --type spdxjson --predicate sbom.spdx.json "$IMG"

# Verify: only images signed by our release workflow are accepted
cosign verify "$IMG" \\
  --certificate-identity-regexp 'https://github.com/acme/api/.github/workflows/release.yml@.*' \\
  --certificate-oidc-issuer https://token.actions.githubusercontent.com` }
          ]
        }
      ],
      problems: [
        {
          t: 'Write a production Dockerfile for a Go HTTP service',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Two stages: <code>golang</code> build stage, <code>distroless/static:nonroot</code> runtime.</li>
<li>Copy <code>go.mod</code>/<code>go.sum</code> first, then <code>go mod download</code>, then the source.</li>
<li><code>CGO_ENABLED=0</code> for a static binary; <code>-trimpath -ldflags="-s -w"</code>.</li>
<li>Numeric non-root <code>USER</code>, exec-form <code>ENTRYPOINT</code>.</li>
</ul>`,
          solution: `# syntax=docker/dockerfile:1
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/api"]`,
          lang: 'dockerfile'
        },
        {
          t: 'Every code change re-downloads all dependencies — fix the Dockerfile',
          d: 'easy',
          type: 'debug',
          hint: `<ul>
<li>Look for <code>COPY . .</code> before the dependency step — any source change invalidates the cache.</li>
<li>Split: copy only manifests, download, then copy the rest.</li>
<li>Add a <code>.dockerignore</code> (a changing <code>.git</code> directory also busts the cache).</li>
<li>Add BuildKit cache mounts for the module and build caches.</li>
</ul>`,
          solution: `# BEFORE (cache busted on every commit)
COPY . .
RUN go mod download && go build -o /out/api ./cmd/api

# AFTER
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \\
    --mount=type=cache,target=/root/.cache/go-build \\
    go build -o /out/api ./cmd/api`,
          lang: 'dockerfile'
        },
        {
          t: 'Two containers cannot reach each other by name',
          d: 'easy',
          type: 'debug',
          hint: `<ul>
<li>Check which network each container is on: <code>docker inspect -f '{{json .NetworkSettings.Networks}}'</code>.</li>
<li>The legacy default <code>bridge</code> network has no embedded DNS — names do not resolve.</li>
<li>Put both on a user-defined network (Compose does this automatically).</li>
<li>Also verify the target listens on <code>0.0.0.0</code>, not <code>127.0.0.1</code>.</li>
</ul>`,
          solution: `docker network create appnet
docker network connect appnet api
docker network connect appnet db
docker exec api getent hosts db      # now resolves via 127.0.0.11
docker exec db ss -lnt               # confirm 0.0.0.0:5432, not 127.0.0.1:5432`,
          lang: 'bash'
        },
        {
          t: 'Shrink a 1.2 GB image below 25 MB',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Measure first with <code>docker history</code>/<code>dive</code> — find which layers are big.</li>
<li>Multi-stage: ship only the binary/runtime, not the SDK, compilers or caches.</li>
<li>Choose distroless/scratch; strip symbols; remove package caches in the same <code>RUN</code>.</li>
<li>Re-check that CA certificates and timezone data are still present if needed.</li>
</ul>`,
          solution: `docker images acme/api                       # 1.2GB (FROM golang, single stage)
docker history acme/api | head
# Rewrite as multi-stage (see "Write a production Dockerfile"), then:
docker build -t acme/api:slim .
docker images acme/api:slim                  # ~15MB
docker run --rm acme/api:slim --version
dive acme/api:slim --ci                      # fail CI if wasted space exceeds threshold`,
          lang: 'bash'
        },
        {
          t: 'Compose a local stack: API + Postgres + Redis for integration tests',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Use healthchecks plus <code>depends_on: condition: service_healthy</code>.</li>
<li>Named volume for Postgres data; bind only to 127.0.0.1.</li>
<li>Run tests with <code>docker compose up -d --wait</code> then tear down with <code>down -v</code>.</li>
<li>Consider Testcontainers-go for per-test lifecycle in Go.</li>
</ul>`,
          solution: `docker compose up -d --build --wait     # blocks until healthchecks pass
go test ./integration/... -count=1
docker compose logs api --tail 50
docker compose down -v                  # remove containers AND volumes`,
          lang: 'bash'
        },
        {
          t: 'Permission denied writing to a bind mount from a non-root container',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Bind mounts keep host ownership; the container UID (e.g. 65532) does not own the host directory.</li>
<li>Check with <code>ls -ln</code> on the host and <code>id</code> in the container.</li>
<li>Fix by matching ownership (<code>chown</code>), running with <code>--user $(id -u):$(id -g)</code> in dev, or using a named volume.</li>
<li>In Kubernetes the equivalent fix is <code>securityContext.fsGroup</code>.</li>
</ul>`,
          solution: `docker run --rm -v "$PWD/data:/data" acme/api:1.4.2 touch /data/x   # Permission denied
ls -ln data                       # owned by 1000:1000
sudo chown -R 65532:65532 data    # option 1: match the image UID
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD/data:/data" acme/api:1.4.2 touch /data/x   # option 2
docker volume create apidata      # option 3: named volume`,
          lang: 'bash'
        },
        {
          t: 'docker stop takes 10 seconds and the app never shuts down gracefully',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Shell-form <code>CMD ./app</code> runs <code>/bin/sh -c</code> as PID 1; sh does not forward SIGTERM.</li>
<li>After the 10 s grace period Docker sends SIGKILL (Kubernetes: <code>terminationGracePeriodSeconds</code>, default 30 s).</li>
<li>Use exec form, or <code>exec</code> in entrypoint scripts, or an init like tini.</li>
<li>In Go, handle SIGTERM with <code>signal.NotifyContext</code> and call <code>server.Shutdown(ctx)</code>.</li>
</ul>`,
          solution: `# Bad: CMD ./api            -> PID 1 is /bin/sh
# Good:
ENTRYPOINT ["/api"]
# If you need a wrapper script, end it with exec so the app replaces the shell:
#   #!/bin/sh
#   set -e
#   /render-config.sh
#   exec /api "$@"
# Or run with an init that forwards signals and reaps zombies:
#   docker run --init acme/api:1.4.2`,
          lang: 'dockerfile'
        },
        {
          t: 'Build and push a multi-arch (amd64 + arm64) image',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Create a buildx builder (docker-container driver).</li>
<li>For Go, cross-compile with <code>--platform=$BUILDPLATFORM</code> and <code>TARGETOS/TARGETARCH</code> instead of slow QEMU emulation.</li>
<li>Push produces an OCI image index listing both manifests.</li>
<li>Verify with <code>docker buildx imagetools inspect</code>.</li>
</ul>`,
          solution: `docker buildx create --name multi --driver docker-container --use
docker buildx build --platform linux/amd64,linux/arm64 \\
  -t ghcr.io/acme/api:1.4.2 --push .
docker buildx imagetools inspect ghcr.io/acme/api:1.4.2   # shows both platforms`,
          lang: 'bash'
        },
        {
          t: 'Fetch private Go modules during build without leaking the token',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul>
<li><code>ARG GITHUB_TOKEN</code> and <code>ENV</code> values end up in image history/metadata — never use them for secrets.</li>
<li>Use <code>RUN --mount=type=secret</code> (available only during that RUN) or <code>--mount=type=ssh</code>.</li>
<li>Set <code>GOPRIVATE</code> (skip the public proxy/checksum DB) and mount credentials as a <code>.netrc</code> secret at the path git/Go read.</li>
<li>Verify with <code>docker history</code> that nothing sensitive remains.</li>
</ul>`,
          solution: `# Dockerfile
ENV GOPRIVATE=github.com/acme/*
COPY go.mod go.sum ./
# The .netrc exists only while this RUN executes; git (via curl) and the Go tool read it
RUN --mount=type=secret,id=netrc,target=/root/.netrc \\
    --mount=type=cache,target=/go/pkg/mod \\
    go mod download

# CI: create the netrc from the token, then build
printf 'machine github.com login x-access-token password %s\\n' "$GITHUB_TOKEN" > "$RUNNER_TEMP/netrc"
docker buildx build --secret id=netrc,src="$RUNNER_TEMP/netrc" -t acme/api:1.4.2 .
docker history --no-trunc acme/api:1.4.2 | grep -c x-access-token   # 0`,
          lang: 'dockerfile'
        },
        {
          t: 'Design a secure container supply chain from commit to cluster',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>Source: pinned, digest-referenced base images updated by Renovate; reviewed Dockerfiles.</li>
<li>Build: ephemeral CI runner, BuildKit with SBOM + SLSA provenance, no long-lived credentials (OIDC to registry).</li>
<li>Gate: Trivy/Grype scan on fixable HIGH/CRITICAL; license policy on SBOM.</li>
<li>Sign: cosign keyless signature + attestations on the <em>digest</em>; immutable tags.</li>
<li>Deploy: admission policy (Kyverno verifyImages / Sigstore policy-controller) only admits signed images from trusted registries; continuous rescanning of running images.</li>
</ul>`
        }
      ],
      interviewFocus: [
        {
          q: 'How do you make container builds fast in CI where runners are ephemeral?',
          a: `<ul>
<li><strong>Order layers</strong> for cache hits: dependency manifests before source.</li>
<li><strong>Export the build cache</strong> to a registry or the CI cache: <code>--cache-to type=registry,mode=max</code> / <code>--cache-from</code> (mode=max also caches intermediate stages).</li>
<li><strong>Cache mounts</strong> for package managers/compilers (<code>/go/pkg/mod</code>, <code>/root/.cache/go-build</code>) — note these live in the builder, so they help most with persistent builders.</li>
<li>Tight <strong>.dockerignore</strong>, small build context.</li>
<li><strong>Cross-compile</strong> multi-arch instead of QEMU emulation; build independent stages in parallel.</li>
<li>Pull-through cache / mirror for base images to avoid rate limits.</li>
</ul>`
        },
        {
          q: 'ENTRYPOINT vs CMD, shell form vs exec form — what are the practical consequences?',
          a: `<p><strong>ENTRYPOINT</strong> defines the executable; <strong>CMD</strong> provides default arguments (or the whole command if no ENTRYPOINT). <code>docker run img args</code> replaces CMD; <code>--entrypoint</code> replaces ENTRYPOINT. In Kubernetes, <code>command</code> overrides ENTRYPOINT and <code>args</code> overrides CMD.</p>
<p><strong>Exec form</strong> (<code>["/api","--port=8080"]</code>) runs the binary directly as PID 1, so it receives SIGTERM. <strong>Shell form</strong> (<code>/api --port=8080</code>) wraps it in <code>/bin/sh -c</code>; the shell is PID 1 and usually does not forward signals, so pods wait the full grace period and then get SIGKILLed — dropped in-flight requests. Shell form also fails on distroless (no shell).</p>`
        },
        {
          q: 'What happens when you run docker run -p 8080:80, and what are the security implications?',
          a: `<p>Docker creates a veth pair connecting the container's network namespace to the <code>docker0</code> (or user-defined) bridge, assigns an IP from the bridge subnet, and adds NAT rules: a <strong>DNAT</strong> in the <code>DOCKER</code> chain mapping host <code>:8080</code> to <code>containerIP:80</code>, and MASQUERADE for egress. A <code>docker-proxy</code> process handles hairpin/loopback cases.</p>
<p><strong>Security</strong>: it binds all interfaces by default and the rules are evaluated before typical ufw/firewalld INPUT rules, so a "firewalled" host can still expose the port publicly. Bind to <code>127.0.0.1</code> or manage rules in the <code>DOCKER-USER</code> chain.</p>`
        },
        {
          q: 'distroless vs scratch vs alpine — how do you choose a runtime base image?',
          a: `<table>
<thead><tr><th>Base</th><th>Pros</th><th>Cons</th></tr></thead>
<tbody>
<tr><td><code>scratch</code></td><td>Empty, smallest possible, zero CVEs</td><td>Add CA certs, tzdata, /etc/passwd yourself; no debugging tools</td></tr>
<tr><td><code>distroless/static</code></td><td>~2 MB, CA certs, tzdata, nonroot user, minimal CVEs</td><td>No shell — debug with <code>kubectl debug</code> ephemeral containers</td></tr>
<tr><td><code>alpine</code></td><td>Small with a shell and apk</td><td>musl libc (CGO, DNS behaviour differences), more packages = more CVEs</td></tr>
<tr><td><code>debian-slim</code>/<code>ubi-minimal</code></td><td>glibc compatibility</td><td>Larger, more CVE noise</td></tr>
</tbody>
</table>
<p>For static Go binaries, distroless static (or Chainguard/Wolfi images) is the usual answer; the lack of a shell is a feature that shrinks the attack surface.</p>`
        },
        {
          q: 'How would you guarantee the image running in production is exactly the one CI built and tested?',
          a: `<ul>
<li>Deploy by <strong>digest</strong>, not tag; enable registry <strong>tag immutability</strong>.</li>
<li>CI signs the digest with <strong>cosign</strong> (keyless, identity = the release workflow) and attaches SBOM and <strong>SLSA provenance</strong> attestations.</li>
<li>An <strong>admission controller</strong> verifies signature, signer identity and issuer, and optionally that provenance shows the expected repo/branch, rejecting anything else.</li>
<li>Promote the same digest across environments (no rebuilds per environment); configuration comes from ConfigMaps/Secrets.</li>
</ul>`
        }
      ],
      quiz: [
        { q: 'Which Dockerfile instructions create filesystem layers?', a: 'RUN, COPY and ADD. Instructions like ENV, CMD, EXPOSE and LABEL only modify image config metadata.' },
        { q: 'Why copy go.mod and go.sum before the rest of the source?', a: 'So the dependency download layer stays cached until dependencies change; copying all source first invalidates it on every code edit.' },
        { q: 'Does EXPOSE publish a port?', a: 'No. EXPOSE is documentation/metadata; ports are published with -p (or by a Kubernetes Service).' },
        { q: 'Why do container names not resolve on the default bridge network?', a: 'Docker embedded DNS (127.0.0.11) only serves user-defined networks; the legacy default bridge has no name resolution.' },
        { q: 'What is the safe way to use a secret during a Docker build?', a: 'A BuildKit secret mount (RUN --mount=type=secret,id=...), which exposes the secret only to that RUN step and never stores it in a layer or history.' },
        { q: 'What is the difference between an image tag and digest?', a: 'A tag is a mutable, human-friendly pointer; a digest (sha256 of the manifest) is immutable and content-addressed.' },
        { q: 'In Kubernetes, which fields override ENTRYPOINT and CMD?', a: 'command overrides ENTRYPOINT and args overrides CMD.' },
        { q: 'What does depends_on with condition: service_healthy do in Compose?', a: 'It delays starting the dependent service until the dependency healthcheck reports healthy, not merely started.' }
      ],
      resources: [
        { title: 'Docker Docs — Building best practices', url: 'https://docs.docker.com/build/building/best-practices/', type: 'docs' },
        { title: 'Docker Docs — Multi-stage builds', url: 'https://docs.docker.com/build/building/multi-stage/', type: 'docs' },
        { title: 'Docker Docs — Networking overview', url: 'https://docs.docker.com/engine/network/', type: 'docs' },
        { title: 'Sigstore — Cosign documentation', url: 'https://docs.sigstore.dev/', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────────────────────── Module 3
    {
      n: 3,
      title: 'Kubernetes Architecture',
      summary: 'The control plane and node components, the declarative desired-state model and reconciliation loops that make Kubernetes self-healing, the full journey of kubectl apply, and how API objects, namespaces, labels and annotations fit together. "What happens when you kubectl apply?" is one of the most common senior interview questions.',
      topics: [
        {
          title: 'Control Plane Components',
          def: `<ul>
<li><strong>kube-apiserver</strong>: the front door and the <em>only</em> component that talks to etcd. Serves the REST API, runs the request pipeline (authentication → authorization → mutating admission → validation → validating admission → persist), and provides efficient <strong>watch</strong> streams. Stateless, so it scales horizontally behind a load balancer.</li>
<li><strong>etcd</strong>: a strongly consistent, distributed key-value store using <strong>Raft</strong>. Holds all cluster state. Needs a quorum (majority) — run 3 or 5 members; 3 tolerate 1 failure, 5 tolerate 2. Every write bumps a global revision that becomes the object's <code>resourceVersion</code>. Back it up; it <em>is</em> your cluster.</li>
<li><strong>kube-scheduler</strong>: watches pods with an empty <code>spec.nodeName</code>, filters feasible nodes, scores them, and writes a <strong>Binding</strong>. It never starts containers.</li>
<li><strong>kube-controller-manager</strong>: one binary running dozens of controllers — Deployment, ReplicaSet, StatefulSet, DaemonSet, Job, CronJob, Node lifecycle, EndpointSlice, Namespace, ServiceAccount, garbage collector, etc.</li>
<li><strong>cloud-controller-manager</strong>: cloud-specific loops split out of core — node (labels, addresses, deleting nodes whose VM is gone), route, and <strong>service</strong> (provisions cloud load balancers for <code>type: LoadBalancer</code>).</li>
</ul>
<p>Scheduler and controller-manager run as multiple replicas with <strong>leader election</strong> via <code>Lease</code> objects in <code>kube-system</code> — only one instance is active at a time. On managed services (EKS, GKE, AKS) the provider runs and hides the whole control plane.</p>`,
          interview: 'Stress that components never talk to each other directly — they all communicate through the API server by watching and updating objects. That hub-and-spoke design is the key architectural insight.',
          examples: [
            { label: 'Inspect control plane health and leaders', lang: 'bash', code: `kubectl get pods -n kube-system -o wide
kubectl get --raw='/readyz?verbose'          # per-check apiserver readiness
kubectl get --raw='/livez?verbose' | tail -3
kubectl get lease -n kube-system             # kube-scheduler / kube-controller-manager holders
kubectl get lease kube-scheduler -n kube-system -o jsonpath='{.spec.holderIdentity}'
kubectl api-resources | head -20             # every resource type the apiserver serves` }
          ]
        },
        {
          title: 'Node Components',
          def: `<ul>
<li><strong>kubelet</strong>: the node agent. Watches pods bound to its node (plus <strong>static pods</strong> from <code>/etc/kubernetes/manifests</code> — how kubeadm runs the control plane itself), drives the runtime over <strong>CRI</strong>, mounts volumes (via <strong>CSI</strong>), runs probes, enforces resource limits through cgroups, performs <strong>node-pressure eviction</strong>, and reports pod/node status. Heartbeats are cheap <code>Lease</code> updates in <code>kube-node-lease</code> (every ~10 s).</li>
<li><strong>Container runtime</strong>: containerd or CRI-O + runc. Pod networking is set up by the runtime calling the <strong>CNI</strong> plugin during <code>RunPodSandbox</code>.</li>
<li><strong>kube-proxy</strong>: watches Services and EndpointSlices and programs the node's packet path (iptables, nftables — GA since 1.33 — or IPVS, deprecated in 1.35) so traffic to a ClusterIP is load-balanced to backend pod IPs. Can be replaced entirely by Cilium's eBPF datapath.</li>
</ul>
<p><strong>Cluster add-ons</strong> (run as normal workloads): CoreDNS, the CNI agent DaemonSet (Calico, Cilium…), metrics-server, CSI node plugins, ingress/gateway controllers.</p>
<p>If a node stops heartbeating, the node lifecycle controller marks it <code>NotReady/Unknown</code> after the grace period and taints it <code>node.kubernetes.io/unreachable:NoExecute</code>; pods carry a default 300 s toleration, so they are evicted and replaced elsewhere after ~5 minutes (StatefulSet pods are not force-replaced, to protect identity). If you <em>know</em> the node is powered off, add the <code>node.kubernetes.io/out-of-service</code> taint (non-graceful node shutdown, GA 1.28): pods on it are force-deleted and their volumes detached, so StatefulSet pods and RWO volumes can move immediately.</p>`,
          interview: 'Know what the kubelet does beyond starting containers (probes, eviction, volume mounts, status), that static pods explain how the control plane bootstraps itself, and the timeline of a node failure.',
          examples: [
            { label: 'Node-level inspection', lang: 'bash', code: `kubectl get nodes -o wide
kubectl describe node worker-1 | sed -n '/Conditions/,/Addresses/p'
kubectl get lease -n kube-node-lease
# On the node itself
systemctl status kubelet
journalctl -u kubelet -f
ls /etc/kubernetes/manifests          # static pods (kubeadm control plane)
cat /var/lib/kubelet/config.yaml | grep -E 'cgroupDriver|evictionHard' -A3` }
          ]
        },
        {
          title: 'Declarative Desired State & Reconciliation Loops',
          def: `<p>Kubernetes is a set of <strong>control loops</strong>. You declare <strong>desired state</strong> in an object's <code>spec</code>; controllers continuously observe <strong>actual state</strong>, compare, and act to converge, then record what they observed in <code>status</code>.</p>
<ul>
<li><strong>Level-triggered, not edge-triggered</strong>: a controller reacts to the current state, not to a missed event. If it crashes and restarts, it simply re-lists and reconciles — robust against lost notifications.</li>
<li><strong>Informers</strong> (client-go) do an initial LIST then a WATCH from that <code>resourceVersion</code>, maintain a local cache, and push object keys into a rate-limited <strong>work queue</strong>; workers call an idempotent <code>Reconcile(key)</code>.</li>
<li><strong>Optimistic concurrency</strong>: updates carry <code>resourceVersion</code>; a stale write gets <code>409 Conflict</code> and the controller retries with a fresh read.</li>
<li><code>metadata.generation</code> increments on spec changes; controllers set <code>status.observedGeneration</code> to show which spec they have acted on (this is what <code>kubectl rollout status</code> checks).</li>
<li><strong>ownerReferences</strong> link Deployment → ReplicaSet → Pod; the garbage collector deletes dependents (cascading deletion: background, foreground or orphan).</li>
<li><strong>Finalizers</strong> block deletion until a controller finishes cleanup (e.g. releasing a cloud volume or load balancer) and removes its finalizer.</li>
</ul>
<p>This same pattern is what you implement when writing an <strong>operator</strong> with controller-runtime in Go.</p>`,
          interview: 'Explain level-triggered reconciliation and why it makes the system self-healing. Bonus points for informers/work queues, resourceVersion conflicts and observedGeneration — these show you could write a controller.',
          examples: [
            { label: 'See spec vs status, generation and owners', lang: 'bash', code: `kubectl get deploy web -o jsonpath='{.metadata.generation} {.status.observedGeneration}{"\\n"}'
kubectl get rs -l app=web -o jsonpath='{.items[0].metadata.ownerReferences[0].kind}{"\\n"}'
kubectl get pod -l app=web -o custom-columns=NAME:.metadata.name,OWNER:.metadata.ownerReferences[0].name
kubectl get deploy web --watch -o wide      # watch the loop converge` }
          ]
        },
        {
          title: 'What Happens on kubectl apply — End to End',
          def: `<ol>
<li><strong>kubectl</strong> parses the manifest, uses API discovery to map <code>apiVersion/kind</code> to a REST path, and sends the request — a server-side apply PATCH with <code>--server-side</code>, otherwise a client-computed three-way merge patch (using the <code>last-applied-configuration</code> annotation).</li>
<li><strong>kube-apiserver</strong>: TLS → <strong>authentication</strong> (client cert, bearer/OIDC token, ServiceAccount token) → <strong>authorization</strong> (RBAC, Node authorizer) → <strong>mutating admission</strong> (defaults, ServiceAccount injection, mutating webhooks such as sidecar injectors) → schema <strong>validation</strong> → <strong>validating admission</strong> (PodSecurity, ResourceQuota, ValidatingAdmissionPolicy/CEL, webhooks such as Kyverno) → write to <strong>etcd</strong>. kubectl returns here — everything after is asynchronous.</li>
<li><strong>Deployment controller</strong> (watching Deployments) creates/updates a <strong>ReplicaSet</strong> named with the pod-template hash.</li>
<li><strong>ReplicaSet controller</strong> creates <strong>Pods</strong> with no <code>nodeName</code>.</li>
<li><strong>Scheduler</strong> filters and scores nodes, then POSTs a <strong>Binding</strong> setting <code>spec.nodeName</code>.</li>
<li><strong>kubelet</strong> on that node sees the pod → CRI <code>RunPodSandbox</code> (pause container, network namespace, <strong>CNI</strong> assigns the Pod IP) → pull images → init containers → app containers → probes → patches <code>status</code>.</li>
<li>Once <strong>Ready</strong>, the <strong>EndpointSlice controller</strong> adds the Pod IP to matching Services; <strong>kube-proxy</strong> on every node updates rules and CoreDNS keeps resolving the Service name — traffic flows.</li>
</ol>`,
          interview: 'Tell this as a story through the API server: each component watches, acts, and writes back. Mention admission webhooks and that kubectl returns once the object is persisted, not once pods are running.',
          examples: [
            { label: 'Watch the chain of events after an apply', lang: 'bash', code: `kubectl apply -f deploy.yaml --server-side
kubectl get events --sort-by=.lastTimestamp -w
# Typical order: ScalingReplicaSet (deployment-controller) -> SuccessfulCreate (replicaset-controller)
#  -> Scheduled (default-scheduler) -> Pulling/Pulled/Created/Started (kubelet)
kubectl apply -f deploy.yaml -v=8 2>&1 | grep -E 'GET|PATCH|POST' | head   # see the HTTP calls` }
          ]
        },
        {
          title: 'API Objects, Namespaces, Labels, Selectors & Annotations',
          def: `<p>Every object has <code>apiVersion</code> (group/version, e.g. <code>apps/v1</code>), <code>kind</code>, <code>metadata</code>, usually <code>spec</code> and a controller-owned <code>status</code>. API versions graduate <code>v1alpha1 → v1beta1 → v1</code>; deprecated versions are removed on a published schedule, so check manifests before upgrades.</p>
<ul>
<li><strong>Namespaces</strong> scope names, RBAC, ResourceQuotas, LimitRanges, NetworkPolicies and Pod Security levels. They are <em>not</em> a hard security boundary on their own. Nodes, PVs, StorageClasses, ClusterRoles, CRDs and Namespaces are <strong>cluster-scoped</strong>.</li>
<li><strong>Labels</strong>: identifying key/value pairs used by <strong>selectors</strong> — Services, Deployments, NetworkPolicies and affinity rules all select by label. Equality-based (<code>app=web</code>, <code>tier!=db</code>) and set-based (<code>env in (prod,staging)</code>, <code>!canary</code>). Use the recommended <code>app.kubernetes.io/name</code>, <code>/instance</code>, <code>/version</code>, <code>/component</code>, <code>/part-of</code>, <code>/managed-by</code>.</li>
<li><strong>Annotations</strong>: non-identifying metadata for tools and humans (build SHA, owner team, controller configuration such as ingress or Prometheus hints). Not selectable; can be large.</li>
</ul>
<p><strong>Server-side apply</strong> tracks which <strong>field manager</strong> owns each field (<code>metadata.managedFields</code>) and reports conflicts when two managers (e.g. you and the HPA over <code>replicas</code>) fight. A Deployment's <code>spec.selector</code> is immutable — changing labels there means recreating the Deployment.</p>`,
          interview: 'Expect: labels vs annotations, why Deployment selectors are immutable, namespaces are not a security boundary without RBAC/NetworkPolicy/quotas, and how server-side apply resolves ownership conflicts.',
          examples: [
            { label: 'Labels and selectors in practice', lang: 'bash', code: `kubectl get pods -l 'app.kubernetes.io/name=web,environment in (prod,staging)' --show-labels
kubectl label pod web-7d9c-abcde quarantine=true --overwrite
kubectl annotate deploy web team.acme.io/owner=payments
kubectl get pods -L app.kubernetes.io/version          # label as a column
kubectl api-resources --namespaced=false               # cluster-scoped kinds
kubectl explain deployment.spec.selector` }
          ]
        },
        {
          title: 'Highly Available Control Plane',
          def: `<p>An HA control plane removes single points of failure. Each component is made redundant in a <em>different</em> way, which is exactly what interviewers probe:</p>
<table>
<thead><tr><th>Component</th><th>HA model</th><th>Why</th></tr></thead>
<tbody>
<tr><td>kube-apiserver</td><td><strong>Active-active</strong> behind a load balancer</td><td>Stateless; every replica serves reads and writes against etcd</td></tr>
<tr><td>etcd</td><td><strong>Raft quorum</strong> (3 or 5 members, one leader)</td><td>Strong consistency needs a majority to commit each write</td></tr>
<tr><td>scheduler, controller-manager, cloud-controller-manager</td><td><strong>Active-passive</strong> via leader election</td><td>Two active schedulers would make conflicting decisions</td></tr>
</tbody>
</table>
<ul>
<li><strong>3 or 5 control plane nodes</strong> spread across failure zones. API servers sit behind an L4 load balancer (cloud LB, or kube-vip / keepalived + HAProxy on-prem) that health-checks <code>/readyz</code>; every kubelet and kubeconfig uses the LB address, which must be in the API server certificate SANs. In-cluster clients use the <code>kubernetes</code> Service instead, whose endpoints are the API servers' own advertise addresses.</li>
<li><strong>etcd topology</strong>: <em>stacked</em> (etcd on each control plane node — simpler, fewer machines, coupled failure) or <em>external</em> (dedicated etcd cluster — more resilient, more to operate). etcd needs low-latency disks (fsync) and networks; never span high-latency regions. Add new members as non-voting <strong>learners</strong> first so a slow catch-up cannot cost quorum.</li>
<li><strong>Leader election</strong>: scheduler and controller-manager run on every control plane node, but only the holder of a <code>Lease</code> in <code>kube-system</code> acts. The leader renews the lease (default lease duration 15 s, renew deadline 10 s, retry 2 s); if it dies, a standby takes over within roughly one lease duration. A leader that cannot renew stops itself to avoid split brain.</li>
<li><strong>Quorum math</strong>: n members tolerate floor((n−1)/2) failures; an even number adds no tolerance (4 members still tolerate only 1). Losing quorum makes etcd refuse writes, so the API becomes unavailable. 5 members tolerate 2 failures but every write waits for 3 acknowledgements — more members means slower writes, so 7+ is rarely worth it.</li>
<li><strong>Overload protection</strong>: API Priority and Fairness (APF) queues requests per priority level and flow so one noisy client (a buggy controller, a <code>kubectl get -A</code> loop) cannot starve the kubelets and controllers; excess requests get <code>429 Too Many Requests</code>.</li>
</ul>
<p><strong>Control plane outage ≠ application outage.</strong> Running pods keep running and kube-proxy rules keep forwarding traffic; what stops is change: no scheduling, no scaling, no self-healing, no deploys. Protect etcd with regular encrypted <strong>snapshots</strong> (and test restores), and keep control plane versions within the supported skew (kubelet may lag the API server by up to three minor versions; upgrade the control plane first, one minor version at a time).</p>`,
          interview: 'Be ready with quorum math, why API servers are active-active but schedulers and controller-managers are active-passive (Lease-based leader election), stacked vs external etcd trade-offs, what sits in front of the API servers, what keeps working when the control plane is down, and the etcd backup/restore procedure.',
          examples: [
            { label: 'etcd health and snapshot backup (kubeadm cluster)', lang: 'bash', code: `export ETCDCTL_API=3
FLAGS="--endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt \\
  --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key"
etcdctl $FLAGS endpoint status --cluster -w table     # leader, DB size, raft term
etcdctl $FLAGS snapshot save /backup/etcd-$(date +%F).db
etcdutl snapshot status /backup/etcd-$(date +%F).db -w table` }
          ]
        }
      ],
      problems: [
        {
          t: 'Tour a cluster control plane and identify every component',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Spin up a local cluster with kind or minikube.</li>
<li>List <code>kube-system</code> pods and map each to its role.</li>
<li>Find static pod manifests on the control plane node (<code>docker exec</code> into the kind node).</li>
<li>Check leader election Leases and apiserver <code>/readyz</code>.</li>
</ul>`,
          solution: `kind create cluster --name lab
kubectl get pods -n kube-system -o wide
docker exec lab-control-plane ls /etc/kubernetes/manifests
# etcd.yaml kube-apiserver.yaml kube-controller-manager.yaml kube-scheduler.yaml
kubectl get lease -n kube-system
kubectl get --raw='/readyz?verbose' | grep etcd`,
          lang: 'bash'
        },
        {
          t: 'Organize and query resources with labels and selectors',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Apply recommended <code>app.kubernetes.io/*</code> labels.</li>
<li>Query with equality and set-based selectors.</li>
<li>Remove a pod from a Service by changing its label and watch the ReplicaSet replace it.</li>
</ul>`,
          solution: `kubectl create deployment web --image=nginx:1.27 --replicas=3
kubectl expose deployment web --port 80
kubectl get pods -l app=web --show-labels
POD=$(kubectl get pod -l app=web -o name | head -1)
kubectl label $POD app=quarantine --overwrite     # leaves Service endpoints AND ReplicaSet
kubectl get pods --show-labels                    # RS created a replacement; quarantined pod kept for debugging
kubectl get endpointslices -l kubernetes.io/service-name=web -o wide`,
          lang: 'bash'
        },
        {
          t: 'Observe self-healing: kill pods and watch reconciliation',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Delete a Deployment-managed pod and watch a new one appear.</li>
<li>Scale the ReplicaSet directly — the Deployment controller reverts it.</li>
<li>Explain which controller acted in each case using events.</li>
</ul>`,
          solution: `kubectl delete pod -l app=web --wait=false && kubectl get pods -l app=web -w
RS=$(kubectl get rs -l app=web -o name)
kubectl scale $RS --replicas=1       # fight the controller...
kubectl get rs -l app=web -w         # ...Deployment controller restores 3
kubectl get events --field-selector involvedObject.kind=ReplicaSet --sort-by=.lastTimestamp`,
          lang: 'bash'
        },
        {
          t: 'Talk to the API server directly and read the HTTP traffic',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li><code>kubectl -v=8</code> prints request URLs, headers and bodies.</li>
<li><code>kubectl proxy</code> lets you curl the API without handling auth.</li>
<li>Try a watch: <code>?watch=true&amp;resourceVersion=…</code> and observe streamed events.</li>
<li>Note the group/version/resource path structure.</li>
</ul>`,
          solution: `kubectl get pods -v=8 2>&1 | grep 'GET https'
kubectl proxy --port 8001 &
curl -s localhost:8001/api/v1/namespaces/default/pods | jq '.items[].metadata.name'
curl -s localhost:8001/apis/apps/v1/namespaces/default/deployments/web | jq '.status'
RV=$(curl -s localhost:8001/api/v1/namespaces/default/pods | jq -r .metadata.resourceVersion)
curl -sN "localhost:8001/api/v1/namespaces/default/pods?watch=true&resourceVersion=$RV"`,
          lang: 'bash'
        },
        {
          t: 'Explain everything that happens after kubectl apply -f deployment.yaml',
          d: 'medium',
          type: 'concept',
          hint: `<ul>
<li>kubectl → apiserver pipeline: authn → authz → mutating admission → validation → validating admission → etcd.</li>
<li>Deployment controller → ReplicaSet → ReplicaSet controller → Pods (unscheduled).</li>
<li>Scheduler: filter → score → Binding.</li>
<li>kubelet: sandbox + CNI → image pull → containers → probes → status.</li>
<li>EndpointSlices → kube-proxy/DNS → traffic. Emphasise asynchronous watches via the API server.</li>
</ul>`
        },
        {
          t: 'Node shows NotReady — diagnose',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li><code>kubectl describe node</code>: Conditions (MemoryPressure, DiskPressure, PIDPressure, Ready) and their messages.</li>
<li>On the node: kubelet and containerd status and logs; common causes are a stopped runtime, expired kubelet certificates, full disk, or a broken CNI ("network plugin not ready").</li>
<li>Check the node Lease renew time.</li>
<li>Cordon/drain if you need to take it out of service.</li>
</ul>`,
          solution: `kubectl get nodes
kubectl describe node worker-2 | sed -n '/Conditions/,/Addresses/p'
kubectl get lease worker-2 -n kube-node-lease -o jsonpath='{.spec.renewTime}{"\\n"}'
# On worker-2
sudo systemctl status kubelet containerd
sudo journalctl -u kubelet --since "10 min ago" | grep -iE 'error|cni|certificate|eviction' | tail
df -h /var/lib/containerd /var/lib/kubelet
ls /etc/cni/net.d/                         # empty = CNI not installed -> NetworkReady=false
# Remediate or evacuate
kubectl cordon worker-2 && kubectl drain worker-2 --ignore-daemonsets --delete-emptydir-data`,
          lang: 'bash'
        },
        {
          t: 'Namespace or object stuck in Terminating',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Deletion sets <code>deletionTimestamp</code>; the object disappears only when <code>finalizers</code> is empty.</li>
<li>Find which finalizer remains and which controller owns it — is that controller (or its CRD/webhook) gone?</li>
<li>For namespaces, check <code>status.conditions</code> for resources that failed to delete (often an unavailable aggregated API or CRD).</li>
<li>Removing a finalizer manually is a last resort — it can leak external resources (cloud disks, LBs).</li>
</ul>`,
          solution: `kubectl get ns team-x -o jsonpath='{.status.conditions}' | jq .
kubectl api-resources --verbs=list --namespaced -o name \\
  | xargs -n1 kubectl get -n team-x --ignore-not-found --show-kind
kubectl get apiservice | grep False                  # broken aggregated API blocks ns deletion
kubectl get pvc data-0 -n team-x -o jsonpath='{.metadata.finalizers}'
# Last resort, after confirming external cleanup:
kubectl patch pvc data-0 -n team-x --type=merge -p '{"metadata":{"finalizers":null}}'`,
          lang: 'bash'
        },
        {
          t: 'The control plane is down — what still works and what breaks?',
          d: 'medium',
          type: 'concept',
          hint: `<ul>
<li>Data plane keeps running: existing containers, kube-proxy rules, CNI routes, already-resolved DNS (CoreDNS serves from its cache but cannot learn changes).</li>
<li>Broken: kubectl, deploys, scaling (HPA), scheduling, self-healing after crashes on other nodes, new Service endpoints, ServiceAccount token refresh eventually.</li>
<li>kubelet still restarts crashed containers locally (restartPolicy) — no API needed.</li>
<li>Recovery priority: etcd quorum → apiserver → controllers.</li>
</ul>`
        },
        {
          t: 'Back up and restore etcd on a kubeadm cluster',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul>
<li>Take a snapshot with <code>etcdctl snapshot save</code> using the etcd client certs.</li>
<li>Restore with <code>etcdutl snapshot restore</code> into a <em>new</em> data dir.</li>
<li>Point the etcd static pod manifest's hostPath to the new directory; the kubelet restarts etcd.</li>
<li>For multi-member clusters restore every member with consistent <code>--initial-cluster</code> flags; restoring rolls the cluster back in time (objects created afterwards are lost).</li>
<li>Encrypt and ship backups off-cluster; test restores regularly.</li>
</ul>`,
          solution: `export ETCDCTL_API=3
etcdctl --endpoints=https://127.0.0.1:2379 \\
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\
  --cert=/etc/kubernetes/pki/etcd/server.crt \\
  --key=/etc/kubernetes/pki/etcd/server.key \\
  snapshot save /backup/etcd.db
etcdutl snapshot status /backup/etcd.db -w table

# Restore (single control plane node)
etcdutl snapshot restore /backup/etcd.db --data-dir /var/lib/etcd-restore
sudo sed -i 's#path: /var/lib/etcd$#path: /var/lib/etcd-restore#' /etc/kubernetes/manifests/etcd.yaml
# kubelet recreates the etcd static pod; then verify
kubectl get pods -A`,
          lang: 'bash'
        },
        {
          t: 'Design a highly available self-managed control plane',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>3 control plane nodes across 3 zones; stacked etcd for simplicity or external 3/5-member etcd for blast-radius isolation.</li>
<li>L4 load balancer (health-checking <code>/readyz</code>) in front of apiservers; kubelets and kubeconfigs use the LB DNS name, which is also in the apiserver certificate SANs.</li>
<li>Dedicated SSDs for etcd, monitored fsync and peer latency; defragmentation and compaction; DB size quota alerts.</li>
<li>Automated encrypted etcd snapshots off-site; documented, rehearsed restore.</li>
<li>Upgrade one control plane node at a time, respecting version skew; consider managed control planes to avoid all of this.</li>
</ul>`
        },
        {
          t: 'API server is slow or returns 429 Too Many Requests — diagnose',
          d: 'hard',
          type: 'debug',
          hint: `<ul>
<li>Symptoms: kubectl hangs, controllers lag, clients log <code>429</code> with a <code>Retry-After</code> header, or <code>etcdserver: request timed out</code>.</li>
<li><strong>API Priority and Fairness (APF)</strong> classifies each request with a <code>FlowSchema</code> into a <code>PriorityLevelConfiguration</code> that has its own concurrency share and fair queues; when a level's queues are full it answers 429. Response headers <code>X-Kubernetes-PF-FlowSchema-UID</code> and <code>X-Kubernetes-PF-PriorityLevel-UID</code> show where a request landed.</li>
<li>Find the noisy client: <code>apiserver_flowcontrol_rejected_requests_total</code>, <code>apiserver_flowcontrol_current_inqueue_requests</code>, <code>apiserver_request_duration_seconds</code> by verb and resource, and audit logs grouped by user and user agent. Usual culprits: a controller doing un-paginated LISTs instead of using informers, a CI loop running <code>kubectl get -A</code>, a DaemonSet whose every Pod watches all Pods.</li>
<li>Rule out the backends: etcd (<code>etcd_disk_wal_fsync_duration_seconds</code> p99 should be under ~10 ms, DB size vs quota, leader changes, a <code>NOSPACE</code> alarm) and slow admission webhooks (<code>apiserver_admission_webhook_admission_duration_seconds</code>).</li>
<li>Fix the client first (informers and the watch cache, pagination, backoff, fewer watchers); then, if needed, give critical traffic its own FlowSchema. Simply raising limits moves the overload to etcd.</li>
</ul>`,
          solution: `kubectl get --raw /metrics | grep '^apiserver_flowcontrol_rejected_requests_total' | sort -k2 -nr | head
kubectl get --raw /debug/api_priority_and_fairness/dump_priority_levels
kubectl get flowschemas,prioritylevelconfigurations
kubectl get --raw /metrics | grep '^apiserver_admission_webhook_admission_duration_seconds_count' | head
# Who is calling? (self-managed: audit log on a control plane node)
jq -r '[.user.username, .userAgent, .verb, (.objectRef.resource // "-")] | @tsv' \\
  /var/log/kubernetes/audit/audit.log | sort | uniq -c | sort -nr | head
# etcd health (FLAGS with the etcd client certs, as in the HA lesson)
etcdctl $FLAGS endpoint status --cluster -w table
etcdctl $FLAGS alarm list            # NOSPACE => over quota: compact, defrag, then disarm`,
          lang: 'bash'
        },
        {
          t: 'Plan a zero-downtime Kubernetes minor-version upgrade',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li><strong>Prepare</strong>: read the release notes and the deprecated API migration guide; find removed APIs in Git, Helm releases and the live cluster (<code>kubent</code>, <code>pluto</code>, the <code>apiserver_requested_deprecated_apis</code> metric); check add-on compatibility (CNI, CSI, ingress/gateway, mesh, policy engines, operators); take and verify an etcd snapshot.</li>
<li><strong>Order</strong>: one minor version at a time; control plane first (API servers one by one behind the load balancer, then controller-manager and scheduler), then add-ons, then nodes. kubelets may lag the API server by up to three minor versions but must never be newer.</li>
<li><strong>Nodes</strong>: surge or blue-green node pools — add new-version nodes, cordon and drain old ones (the Eviction API respects PDBs), then delete them. Workloads must cooperate: at least 2 replicas, PDBs that allow a disruption, readiness probes, graceful shutdown and topology spread.</li>
<li><strong>Verify and roll back</strong>: upgrade a non-production cluster first, run smoke tests and watch SLO dashboards between stages. Control plane downgrades are not supported, so the real rollback plan is an etcd restore or failing over to another cluster; for critical platforms consider blue-green <em>clusters</em> with traffic shifting.</li>
<li>Managed services (EKS, GKE, AKS) automate the control plane, but you still own API removals, add-on versions, node pools and PDB hygiene — and must stay inside the support window (about 14 months per minor release upstream).</li>
</ul>`
        }
      ],
      interviewFocus: [
        {
          q: 'Why does only the API server talk to etcd?',
          a: `<ul>
<li><strong>Single enforcement point</strong>: every write passes authentication, authorization, admission and validation. Direct etcd access would bypass all of them.</li>
<li><strong>Abstraction</strong>: components depend on a versioned REST API, not a storage schema; storage can evolve (encryption at rest, protobuf encoding, version conversion).</li>
<li><strong>Scalability</strong>: the apiserver's watch cache fans out events to thousands of watchers without each hitting etcd.</li>
<li><strong>Security</strong>: etcd holds every Secret; only apiservers have client certs for it (mTLS).</li>
</ul>`
        },
        {
          q: 'Explain level-triggered reconciliation and how a controller is built.',
          a: `<p>An edge-triggered system acts on events ("pod deleted"); a missed event means a missed action. A <strong>level-triggered</strong> controller acts on the <em>difference between desired and actual state</em>, whenever it looks, so missed events, restarts and duplicate events are harmless.</p>
<p>Implementation (client-go / controller-runtime): <strong>informer</strong> LIST + WATCH into a local cache → event handlers enqueue object <strong>keys</strong> (namespace/name) into a deduplicating, rate-limited <strong>work queue</strong> → workers call <code>Reconcile(key)</code>, which reads current state from the cache, computes the diff, makes idempotent API calls, updates <code>status</code>, and requeues on error with backoff. Periodic resyncs catch drift. Only the leader reconciles (Lease-based leader election).</p>`
        },
        {
          q: 'What happens if etcd loses quorum?',
          a: `<p>etcd stops accepting writes (and linearizable reads), so the API server fails most requests: no kubectl changes, no scheduling, no controller actions, no status updates. <strong>Workloads keep running</strong> — kubelets keep containers alive and restart crashed ones locally, kube-proxy rules stay in place.</p>
<p>Recovery: restore failed members to regain majority; if quorum is permanently lost, restore from snapshot (a new cluster is bootstrapped from the snapshot), accepting loss of writes after the snapshot. Prevention: 3 or 5 members across zones, fast disks, monitoring of <code>etcd_server_has_leader</code>, leader changes, fsync latency and DB size.</p>`
        },
        {
          q: 'Client-side apply vs server-side apply — why does it matter?',
          a: `<p><strong>Client-side apply</strong> stores the whole last-applied manifest in an annotation and kubectl computes a three-way merge (last-applied, live, new). It cannot know about fields other actors manage, and the annotation can exceed size limits for large objects (e.g. big CRDs).</p>
<p><strong>Server-side apply</strong> (GA since 1.22) moves merging into the API server and tracks <strong>field ownership</strong> per manager in <code>managedFields</code>. If you try to set a field another manager owns (e.g. HPA-managed <code>replicas</code>), you get a <strong>conflict</strong> instead of silently overwriting; you can <code>--force-conflicts</code> deliberately. It is what GitOps tools and controllers should use, and removing a field from your manifest removes it from the object only if you were its sole owner.</p>`
        },
        {
          q: 'How does optimistic concurrency work in Kubernetes?',
          a: `<p>Every object carries <code>metadata.resourceVersion</code> (derived from the etcd revision). An <strong>update</strong> (PUT) includes the version the client read; if the object changed meanwhile, the apiserver returns <strong>409 Conflict</strong> and the client must re-read and retry (client-go's <code>retry.RetryOnConflict</code>). No locks are held, so many controllers can work concurrently. Patches (merge/strategic/apply) avoid most conflicts because they send only intent. <code>resourceVersion</code> is also the watch bookmark: "send me changes after version N" — if N is too old (compacted), the client gets <code>410 Gone</code> and must re-list.</p>`
        }
      ],
      quiz: [
        { q: 'Which control plane component is the only one that reads and writes etcd?', a: 'kube-apiserver.' },
        { q: 'How many etcd member failures can a 5-member cluster tolerate?', a: 'Two — quorum is 3 of 5.' },
        { q: 'What does the scheduler actually write when it places a pod?', a: 'A Binding that sets the pod spec.nodeName; the kubelet on that node then starts the pod.' },
        { q: 'Which component provisions a cloud load balancer for a LoadBalancer Service?', a: 'The service controller in the cloud-controller-manager (or a separate LB controller such as the AWS Load Balancer Controller).' },
        { q: 'What are static pods?', a: 'Pods defined by manifest files in a directory the kubelet watches (e.g. /etc/kubernetes/manifests); the kubelet runs them without the scheduler — kubeadm runs the control plane this way.' },
        { q: 'What is the difference between labels and annotations?', a: 'Labels are identifying and selectable (used by selectors); annotations are non-identifying metadata for tools and humans and cannot be selected on.' },
        { q: 'What blocks an object with a deletionTimestamp from disappearing?', a: 'Remaining entries in metadata.finalizers; the owning controller must remove them after cleanup.' },
        { q: 'Do running applications stop if the whole control plane goes down?', a: 'No. Existing pods and networking keep working; only changes, scheduling, scaling and self-healing via controllers stop.' },
        { q: 'Why is kube-apiserver run active-active but kube-scheduler active-passive?', a: 'The API server is stateless (all state lives in etcd), so any replica can serve any request behind a load balancer. Two active schedulers or controller-managers would make conflicting decisions, so only the holder of a Lease (leader election) acts.' },
        { q: 'Which version skew is allowed between the kubelet and the API server?', a: 'The kubelet may be up to three minor versions older than the API server and never newer; upgrade the control plane first, one minor version at a time.' }
      ],
      resources: [
        { title: 'Kubernetes Docs — Cluster Architecture', url: 'https://kubernetes.io/docs/concepts/architecture/', type: 'docs' },
        { title: 'Kubernetes Docs — Kubernetes Components', url: 'https://kubernetes.io/docs/concepts/overview/components/', type: 'docs' },
        { title: 'Kubernetes Docs — Options for Highly Available Topology', url: 'https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/', type: 'docs' },
        { title: 'Kubernetes Docs — Operating etcd clusters for Kubernetes', url: 'https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────────────────────── Module 4
    {
      n: 4,
      title: 'Workloads: Pods, Deployments, StatefulSets & more',
      summary: 'The workload API: Pod lifecycle and termination, init and native sidecar containers, ReplicaSets and Deployments with rolling updates and rollbacks, release strategies, StatefulSets, DaemonSets, Jobs and CronJobs. Knowing which controller to choose and how rollouts behave under failure is core senior-level knowledge.',
      topics: [
        {
          title: 'Pods & the Pod Lifecycle',
          def: `<p>A <strong>Pod</strong> is the smallest deployable unit: one or more containers that share a network namespace (one IP, talk over <code>localhost</code>), IPC namespace and volumes, scheduled together on one node. Pods are <strong>ephemeral and disposable</strong> — controllers replace them; you rarely create bare Pods.</p>
<ul>
<li><strong>Phases</strong>: <code>Pending</code> (accepted, not all containers started — scheduling, image pull), <code>Running</code>, <code>Succeeded</code>, <code>Failed</code>, <code>Unknown</code> (node unreachable).</li>
<li><strong>Container states</strong>: <code>Waiting</code> (with reasons like <code>ContainerCreating</code>, <code>ImagePullBackOff</code>, <code>CrashLoopBackOff</code>), <code>Running</code>, <code>Terminated</code> (reason, exit code).</li>
<li><strong>Conditions</strong>: <code>PodScheduled</code>, <code>PodReadyToStartContainers</code>, <code>Initialized</code>, <code>ContainersReady</code>, <code>Ready</code> — only <code>Ready</code> pods receive Service traffic.</li>
<li><code>restartPolicy</code>: <code>Always</code> (Deployments), <code>OnFailure</code>/<code>Never</code> (Jobs). Restarts back off exponentially (10 s, 20 s, 40 s … capped at 5 min) — that is <strong>CrashLoopBackOff</strong>.</li>
</ul>
<p><strong>Termination sequence</strong> (critical for zero-downtime): API sets <code>deletionTimestamp</code> → in parallel, the pod is removed from EndpointSlices <em>and</em> the kubelet runs the <code>preStop</code> hook, then sends <strong>SIGTERM</strong> → after <code>terminationGracePeriodSeconds</code> (default 30 s, counted from the start of preStop) → <strong>SIGKILL</strong>. Because endpoint removal propagates asynchronously to every kube-proxy/ingress, a short <code>preStop</code> delay avoids routing requests to a process that already exited.</p>`,
          interview: 'Walk through the termination sequence precisely and explain the race between endpoint removal and SIGTERM. Distinguish pod phase (coarse) from container state and conditions (what you actually debug with).',
          examples: [
            { label: 'Inspect phase, conditions and container states', lang: 'bash', code: `kubectl get pod web-abc -o jsonpath='{.status.phase}{"\\n"}'
kubectl get pod web-abc -o jsonpath='{range .status.conditions[*]}{.type}={.status}{"\\n"}{end}'
kubectl get pod web-abc -o jsonpath='{.status.containerStatuses[*].state}' | jq .
kubectl get pod web-abc -o jsonpath='{.status.containerStatuses[0].lastState.terminated}' | jq .` }
          ]
        },
        {
          title: 'Init Containers & Native Sidecar Containers',
          def: `<p><strong>Init containers</strong> run <em>sequentially</em>, each to successful completion, before app containers start. Uses: wait for a dependency, run schema migrations, render config, fix volume permissions, fetch secrets. They can use different images and privileges than the app.</p>
<p><strong>Native sidecar containers</strong> (GA in 1.33, on by default since 1.29) are init containers with <code>restartPolicy: Always</code>. They:</p>
<ul>
<li>start <em>before</em> the app containers (and can gate them with a startup probe), so a proxy or log agent is ready first;</li>
<li>keep running for the pod's lifetime and are restarted independently if they crash;</li>
<li>are terminated <em>after</em> the main containers on shutdown, in reverse order;</li>
<li>do not block <strong>Job</strong> completion — the long-standing "Istio sidecar keeps my Job running forever" problem is solved.</li>
</ul>
<p>Classic multi-container patterns: <strong>sidecar</strong> (extend the app: log shipper, service-mesh proxy, secret refresher), <strong>ambassador</strong> (proxy outbound connections, e.g. a cloud SQL proxy), <strong>adapter</strong> (normalise output, e.g. expose metrics in Prometheus format). Only co-locate containers that must share lifecycle, network or disk — otherwise use separate Deployments.</p>`,
          interview: 'Explain why native sidecars were needed (ordering at startup/shutdown and Job completion) and how they are declared (initContainers + restartPolicy: Always). Know the sidecar/ambassador/adapter vocabulary.',
          examples: [
            { label: 'Init container + native sidecar', lang: 'yaml', code: `apiVersion: v1
kind: Pod
metadata:
  name: api
spec:
  initContainers:
  - name: wait-for-db
    image: busybox:1.36
    command: ["sh", "-c", "until nc -z postgres 5432; do echo waiting; sleep 2; done"]
  - name: log-shipper              # native sidecar
    image: fluent/fluent-bit:3.1
    restartPolicy: Always
    volumeMounts:
    - { name: logs, mountPath: /var/log/app }
  containers:
  - name: api
    image: ghcr.io/acme/api:1.4.2
    volumeMounts:
    - { name: logs, mountPath: /var/log/app }
  volumes:
  - name: logs
    emptyDir: {}` }
          ]
        },
        {
          title: 'ReplicaSets & Deployments: Rolling Updates and Rollbacks',
          def: `<p>A <strong>ReplicaSet</strong> keeps N pods matching a selector alive. A <strong>Deployment</strong> manages ReplicaSets to provide declarative updates: changing the pod template creates a new ReplicaSet (named with the <code>pod-template-hash</code>) and shifts pods from old to new.</p>
<ul>
<li><code>strategy: RollingUpdate</code> (default) with <code>maxSurge</code> (extra pods above desired, default 25%) and <code>maxUnavailable</code> (pods below desired, default 25%). <code>maxSurge: 1, maxUnavailable: 0</code> = never lose capacity, needs spare room. <code>Recreate</code> kills all old pods first (use when versions cannot coexist).</li>
<li>Rollouts are gated by <strong>readiness</strong>: a new pod counts as available only after it is Ready for <code>minReadySeconds</code>. Bad readiness probes = bad rollouts.</li>
<li><code>progressDeadlineSeconds</code> (default 600): if no progress, the Deployment gets condition <code>Progressing=False, reason ProgressDeadlineExceeded</code>. Kubernetes does <em>not</em> auto-rollback — your pipeline must detect it (<code>kubectl rollout status</code> exits non-zero).</li>
<li><code>revisionHistoryLimit</code> (default 10) old ReplicaSets are kept for <code>kubectl rollout undo</code>. <code>kubectl rollout pause/resume</code> batches several changes into one rollout.</li>
</ul>
<p>Only pod template changes trigger a rollout; scaling does not. ConfigMap changes do <em>not</em> restart pods unless you roll them (checksum annotation, <code>kubectl rollout restart</code>, or a reloader controller).</p>`,
          interview: 'Know the defaults (25%/25%), what maxSurge/maxUnavailable mean in absolute numbers for a given replica count, that rollback is manual (or via Argo Rollouts), and that readiness gates the rollout.',
          examples: [
            { label: 'Production-style Deployment', lang: 'yaml', code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  labels: { app.kubernetes.io/name: api }
spec:
  replicas: 4
  revisionHistoryLimit: 5
  progressDeadlineSeconds: 300
  minReadySeconds: 5
  selector:
    matchLabels: { app.kubernetes.io/name: api }
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  template:
    metadata:
      labels: { app.kubernetes.io/name: api }
    spec:
      terminationGracePeriodSeconds: 40
      containers:
      - name: api
        image: ghcr.io/acme/api:1.4.2
        ports: [{ name: http, containerPort: 8080 }]
        readinessProbe:
          httpGet: { path: /readyz, port: http }
          periodSeconds: 5
        resources:
          requests: { cpu: 250m, memory: 256Mi }
          limits:   { memory: 256Mi }
        lifecycle:
          preStop:
            sleep: { seconds: 5 }     # let endpoint removal propagate` },
            { label: 'Rollout operations', lang: 'bash', code: `kubectl set image deploy/api api=ghcr.io/acme/api:1.5.0
kubectl annotate deploy/api kubernetes.io/change-cause="release 1.5.0" --overwrite
kubectl rollout status deploy/api --timeout=5m
kubectl rollout history deploy/api
kubectl rollout undo deploy/api                 # or --to-revision=3
kubectl rollout restart deploy/api              # re-create pods, e.g. after a ConfigMap change` }
          ]
        },
        {
          title: 'Release Strategies: Blue-Green & Canary',
          def: `<p>Rolling updates are progressive but coarse: both versions serve traffic during the rollout, with no traffic-percentage control and no automatic analysis. Alternatives:</p>
<ul>
<li><strong>Blue-green</strong>: run the full new version (green) next to the old (blue), test it via a separate Service, then switch the production Service <code>selector</code> (or Gateway backend) to green in one step. Instant rollback by switching back. Costs 2x capacity during the switch; DB schema must be compatible with both.</li>
<li><strong>Canary</strong>: send a small share of traffic to the new version, watch error rate/latency, then increase. With plain Deployments, the share equals the <em>replica ratio</em> (1 canary + 9 stable pods behind one Service ≈ 10%). Precise percentages need L7 routing: <strong>Gateway API</strong> <code>HTTPRoute</code> backend <code>weight</code>s, an ingress controller's canary annotations, or a service mesh.</li>
<li><strong>Progressive delivery</strong> automates canary/blue-green with metric analysis and auto-rollback: <strong>Argo Rollouts</strong> or <strong>Flagger</strong> (Module 9).</li>
<li><strong>Feature flags</strong> decouple deploy from release entirely.</li>
</ul>
<p>Whatever the strategy, zero-downtime requires: readiness probes, graceful shutdown (SIGTERM handling + preStop delay), a PodDisruptionBudget, backward-compatible APIs and <strong>expand/contract</strong> database migrations (add columns first, remove them only after no old version runs).</p>`,
          interview: 'Compare rolling, blue-green and canary on cost, risk, rollback speed and traffic control, and always mention database compatibility (expand/contract) — it is where real zero-downtime plans fail.',
          examples: [
            { label: 'Canary with Gateway API weights', lang: 'yaml', code: `apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api
spec:
  parentRefs: [{ name: public-gw }]
  hostnames: ["api.acme.io"]
  rules:
  - backendRefs:
    - { name: api-stable, port: 80, weight: 90 }
    - { name: api-canary, port: 80, weight: 10 }` }
          ]
        },
        {
          title: 'StatefulSets',
          def: `<p>A <strong>StatefulSet</strong> gives each replica a <strong>stable identity</strong> that survives rescheduling:</p>
<ul>
<li><strong>Stable names</strong> with ordinals: <code>db-0</code>, <code>db-1</code>, <code>db-2</code>.</li>
<li><strong>Stable DNS</strong> through a required <strong>headless Service</strong> (<code>clusterIP: None</code>): <code>db-0.db.prod.svc.cluster.local</code> — peers can address a specific member (primary election, cluster bootstrap).</li>
<li><strong>Stable storage</strong>: <code>volumeClaimTemplates</code> create one PVC per ordinal (<code>data-db-0</code>) that follows the pod to any node. PVCs are kept on scale-down/delete by default; <code>persistentVolumeClaimRetentionPolicy</code> (GA 1.32) can delete them.</li>
<li><strong>Ordering</strong>: with <code>podManagementPolicy: OrderedReady</code> pods are created 0→N−1 (each Ready before the next) and removed N−1→0; <code>Parallel</code> skips this for faster scaling.</li>
<li><strong>Updates</strong>: <code>RollingUpdate</code> from highest ordinal down; <code>partition: k</code> updates only ordinals ≥ k (manual canary). <code>OnDelete</code> updates a pod only when you delete it.</li>
</ul>
<p>A StatefulSet does not make an app clustered or replicated — the application (Postgres, Kafka, etcd) must handle replication, failover and membership. That operational logic is why <strong>operators</strong> (CloudNativePG, Strimzi) are usually preferred over hand-written StatefulSets, and why many teams use managed databases instead.</p>`,
          interview: 'Explain the three stable guarantees (name, DNS, storage), why a headless Service is needed, ordered vs parallel management, partitioned rollouts, and that a StatefulSet is not a replication solution.',
          examples: [
            { label: 'Headless Service + StatefulSet with per-pod storage', lang: 'yaml', code: `apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  clusterIP: None              # headless: DNS returns pod IPs
  selector: { app: web }
  ports: [{ name: http, port: 80 }]
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: web
  replicas: 3
  selector:
    matchLabels: { app: web }
  updateStrategy:
    type: RollingUpdate
    rollingUpdate: { partition: 0 }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
      - name: nginx
        image: nginx:1.27
        volumeMounts: [{ name: data, mountPath: /usr/share/nginx/html }]
  volumeClaimTemplates:
  - metadata: { name: data }
    spec:
      accessModes: [ReadWriteOnce]
      storageClassName: standard
      resources: { requests: { storage: 1Gi } }` }
          ]
        },
        {
          title: 'DaemonSets, Jobs & CronJobs',
          def: `<p><strong>DaemonSet</strong>: one pod per (matching) node — CNI agents, kube-proxy, log collectors, node exporters, CSI node plugins. New nodes get a pod automatically; use tolerations to run on tainted/control-plane nodes and <code>nodeSelector</code>/affinity to restrict. Updates: <code>RollingUpdate</code> (maxUnavailable / maxSurge) or <code>OnDelete</code>.</p>
<p><strong>Job</strong>: run pods to successful completion.</p>
<ul>
<li><code>completions</code> and <code>parallelism</code>; <code>completionMode: Indexed</code> gives each pod <code>JOB_COMPLETION_INDEX</code> for static work partitioning.</li>
<li><code>backoffLimit</code> (default 6) retries; <code>backoffLimitPerIndex</code> (GA 1.33) for indexed jobs; <code>podFailurePolicy</code> to fail fast on non-retriable exit codes or ignore disruptions (preemption, eviction).</li>
<li><code>successPolicy</code> (GA 1.33) declares an indexed Job complete when specific indexes or a count succeed (leader/worker patterns); <code>podReplacementPolicy: Failed</code> (GA 1.34) waits until a failed pod has fully terminated before creating its replacement, so two copies never run at once.</li>
<li><code>activeDeadlineSeconds</code> caps total runtime; <code>ttlSecondsAfterFinished</code> garbage-collects finished jobs.</li>
<li>Jobs can be <code>suspend</code>ed — the basis of queueing systems such as <strong>Kueue</strong>.</li>
</ul>
<p><strong>CronJob</strong>: creates Jobs on a cron <code>schedule</code>, with <code>timeZone</code> (e.g. <code>Europe/Berlin</code>), <code>concurrencyPolicy</code> (<code>Allow</code>, <code>Forbid</code>, <code>Replace</code>), <code>startingDeadlineSeconds</code> for missed runs and history limits. Scheduling is at-least-once-ish: jobs should be <strong>idempotent</strong>.</p>`,
          interview: 'Pick the right controller for a scenario, and explain Job failure handling (backoffLimit vs podFailurePolicy vs activeDeadlineSeconds) and why CronJob workloads must be idempotent.',
          examples: [
            { label: 'Indexed Job and CronJob', lang: 'yaml', code: `apiVersion: batch/v1
kind: Job
metadata:
  name: reindex
spec:
  completions: 10
  parallelism: 3
  completionMode: Indexed
  backoffLimit: 4
  activeDeadlineSeconds: 3600
  ttlSecondsAfterFinished: 86400
  podFailurePolicy:
    rules:
    - action: FailJob
      onExitCodes: { containerName: worker, operator: In, values: [42] }   # bad input: do not retry
    - action: Ignore
      onPodConditions: [{ type: DisruptionTarget }]                        # preemption/eviction
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: ghcr.io/acme/reindex:2.0.1
        args: ["--shard=$(JOB_COMPLETION_INDEX)", "--shards=10"]
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
spec:
  schedule: "0 2 * * *"
  timeZone: "Asia/Kolkata"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 600
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: report
            image: ghcr.io/acme/report:1.2.0` }
          ]
        }
      ],
      problems: [
        {
          t: 'Deploy a stateless app with a Deployment and Service',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Deployment with 3 replicas, labels, resource requests and a readiness probe.</li>
<li>ClusterIP Service selecting the same labels.</li>
<li>Verify EndpointSlices list 3 ready addresses, then <code>port-forward</code> or curl from a debug pod.</li>
</ul>`,
          solution: `kubectl create deployment hello --image=registry.k8s.io/e2e-test-images/agnhost:2.53 --replicas=3 \\
  -- /agnhost netexec --http-port=8080
kubectl expose deployment hello --port 80 --target-port 8080
kubectl rollout status deploy/hello
kubectl get endpointslices -l kubernetes.io/service-name=hello
kubectl run tmp --rm -it --image=curlimages/curl --restart=Never -- curl -s hello/hostname`,
          lang: 'bash'
        },
        {
          t: 'Perform a rolling update and roll back a bad release',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Update the image and watch old/new ReplicaSets scale in opposite directions.</li>
<li>Deploy a non-existent tag; observe the rollout stall (old pods keep serving thanks to maxUnavailable).</li>
<li><code>kubectl rollout undo</code> and confirm the revision.</li>
</ul>`,
          solution: `kubectl set image deploy/hello agnhost=registry.k8s.io/e2e-test-images/agnhost:2.52
kubectl get rs -l app=hello -w
kubectl set image deploy/hello agnhost=registry.k8s.io/e2e-test-images/agnhost:does-not-exist
kubectl rollout status deploy/hello --timeout=60s || echo "rollout stuck"
kubectl get pods -l app=hello          # new pod ImagePullBackOff, old pods still Running
kubectl rollout undo deploy/hello
kubectl rollout history deploy/hello`,
          lang: 'bash'
        },
        {
          t: 'Choose the right workload controller for each scenario',
          d: 'easy',
          type: 'concept',
          hint: `<ul>
<li>Stateless REST API → Deployment.</li>
<li>Kafka/Postgres/ZooKeeper member with its own disk and identity → StatefulSet (or an operator).</li>
<li>Log/metrics agent on every node → DaemonSet.</li>
<li>One-off DB migration or batch reprocessing → Job; nightly backup → CronJob.</li>
<li>Single debugging shell → bare Pod (or <code>kubectl debug</code>), never for production.</li>
</ul>`
        },
        {
          t: 'Add an init container that runs migrations before the app starts',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Init containers run in order and must exit 0; the pod stays in <code>Init:N/M</code> until they do.</li>
<li>Migrations must be idempotent and safe to run concurrently (every replica runs init containers) — use the migration tool's locking, or move migrations to a pre-deploy Job.</li>
<li>Debug with <code>kubectl logs pod -c migrate</code>.</li>
</ul>`,
          solution: `spec:
  initContainers:
  - name: migrate
    image: ghcr.io/acme/api:1.5.0
    command: ["/api", "migrate", "up"]     # tool takes an advisory lock in the DB
    envFrom: [{ secretRef: { name: api-db } }]
  containers:
  - name: api
    image: ghcr.io/acme/api:1.5.0
    envFrom: [{ secretRef: { name: api-db } }]
# Debug:
#   kubectl get pod -l app=api            -> Init:0/1 or Init:CrashLoopBackOff
#   kubectl logs <pod> -c migrate`,
          lang: 'yaml'
        },
        {
          t: 'Add a native sidecar and make a Job finish with it',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Declare the sidecar under <code>initContainers</code> with <code>restartPolicy: Always</code>.</li>
<li>Give it a startup probe so the main container waits until it is ready.</li>
<li>Run as a Job and observe the Job completes when the main container exits (the sidecar is stopped automatically).</li>
</ul>`,
          solution: `apiVersion: batch/v1
kind: Job
metadata:
  name: export
spec:
  template:
    spec:
      restartPolicy: Never
      initContainers:
      - name: db-proxy
        image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.11.0
        args: ["--port=5432", "acme:asia-south1:prod-db"]
        restartPolicy: Always            # => native sidecar
        startupProbe:
          tcpSocket: { port: 5432 }
          periodSeconds: 1
          failureThreshold: 30
      containers:
      - name: export
        image: ghcr.io/acme/export:1.0.0
        env: [{ name: DB_HOST, value: "127.0.0.1" }]`,
          lang: 'yaml'
        },
        {
          t: 'Run a parallel batch Job and a nightly CronJob with safe retries',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Indexed Job: <code>completions</code>, <code>parallelism</code>, shard via <code>JOB_COMPLETION_INDEX</code>.</li>
<li>Bound retries and runtime: <code>backoffLimit</code>, <code>activeDeadlineSeconds</code>, <code>podFailurePolicy</code>.</li>
<li>CronJob: <code>timeZone</code>, <code>concurrencyPolicy: Forbid</code>, <code>startingDeadlineSeconds</code>, history limits.</li>
<li>Trigger a CronJob manually to test: <code>kubectl create job --from=cronjob/…</code>.</li>
</ul>`,
          solution: `kubectl apply -f reindex-job.yaml -f nightly-cronjob.yaml
kubectl get job reindex -w                      # COMPLETIONS 0/10 -> 10/10
kubectl get pods -l job-name=reindex -L batch.kubernetes.io/job-completion-index
kubectl create job manual-report --from=cronjob/nightly-report
kubectl logs job/manual-report
kubectl get cronjob nightly-report -o jsonpath='{.status.lastScheduleTime}'`,
          lang: 'bash'
        },
        {
          t: 'Rollout stuck: new pods never become Ready',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li><code>kubectl rollout status</code> hangs; Deployment condition shows <code>ProgressDeadlineExceeded</code> after the deadline.</li>
<li>Describe the new pods: readiness probe failures (wrong path/port, app slow to start, dependency down), image pull issues, or Pending due to resources.</li>
<li>With maxUnavailable 0 the old version keeps serving — no outage, but the pipeline must fail and roll back.</li>
<li>Fix forward or <code>rollout undo</code>; add a startupProbe for slow starters.</li>
</ul>`,
          solution: `kubectl rollout status deploy/api --timeout=2m; echo "exit=$?"
kubectl get deploy api -o jsonpath='{.status.conditions[?(@.type=="Progressing")]}' | jq .
NEW_RS=$(kubectl get rs -l app.kubernetes.io/name=api --sort-by=.metadata.creationTimestamp -o name | tail -1)
kubectl describe $NEW_RS | tail -5
kubectl describe pod -l app.kubernetes.io/name=api | grep -A3 -E 'Readiness probe failed|Events'
kubectl logs -l app.kubernetes.io/name=api --tail=20 --prefix
kubectl rollout undo deploy/api`,
          lang: 'bash'
        },
        {
          t: 'Run a stateful app with StatefulSet, headless Service and per-pod storage',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul>
<li>Create the headless Service first; set <code>serviceName</code> on the StatefulSet.</li>
<li>Write a unique file into each pod's volume, delete the pod, confirm the same PVC re-attaches.</li>
<li>Resolve <code>web-0.web</code> from another pod.</li>
<li>Try a partitioned rollout: set <code>partition: 2</code>, change the image, observe only <code>web-2</code> updates.</li>
</ul>`,
          solution: `kubectl apply -f web-statefulset.yaml          # headless svc + sts from the lesson
kubectl get pods -l app=web -w                    # web-0, then web-1, then web-2
for i in 0 1 2; do kubectl exec web-$i -- sh -c "echo web-$i > /usr/share/nginx/html/index.html"; done
kubectl delete pod web-1 && kubectl wait --for=condition=Ready pod/web-1
kubectl exec web-1 -- cat /usr/share/nginx/html/index.html   # still "web-1"
kubectl get pvc                                   # data-web-0 / data-web-1 / data-web-2
kubectl run dns --rm -it --image=busybox:1.36 --restart=Never -- nslookup web-0.web
kubectl patch sts web -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":2}}}}'
kubectl set image sts/web nginx=nginx:1.27-alpine
kubectl get pods -l app=web -o custom-columns=POD:.metadata.name,IMAGE:.spec.containers[0].image`,
          lang: 'bash'
        },
        {
          t: 'Eliminate 502s during rollouts with graceful shutdown',
          d: 'hard',
          type: 'debug',
          hint: `<ul>
<li>Root cause: the pod gets SIGTERM while load balancers / kube-proxy on other nodes still route to it (endpoint removal is asynchronous), or the app exits without draining in-flight requests.</li>
<li>Add a <code>preStop</code> delay (native <code>sleep</code> action works even in distroless images).</li>
<li>In Go: on SIGTERM, fail readiness, then <code>http.Server.Shutdown(ctx)</code> with a timeout below the grace period.</li>
<li>Ensure <code>terminationGracePeriodSeconds</code> &gt; preStop + drain time; keep maxUnavailable 0 and a PDB.</li>
</ul>`,
          solution: `spec:
  terminationGracePeriodSeconds: 45
  containers:
  - name: api
    lifecycle:
      preStop:
        sleep: { seconds: 10 }    # endpoints/LB deregistration propagates
# Go side (main.go):
#   ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
#   defer stop()
#   go srv.ListenAndServe()
#   <-ctx.Done()
#   shutdownCtx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
#   defer cancel()
#   _ = srv.Shutdown(shutdownCtx)   // stops accepting, waits for in-flight requests`,
          lang: 'yaml'
        },
        {
          t: 'Design a zero-downtime deployment strategy for a customer-facing API',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>Pod level: readiness/startup probes, graceful shutdown, preStop delay, resource requests, PDB, topology spread across zones.</li>
<li>Rollout: RollingUpdate maxSurge 25% / maxUnavailable 0, or canary via Gateway API weights / Argo Rollouts with automated metric analysis and auto-rollback.</li>
<li>Data: expand/contract migrations; APIs backward compatible across N and N−1; feature flags for risky behaviour.</li>
<li>Pipeline: same image digest across environments, smoke tests, <code>rollout status</code> gates, SLO-based alerts.</li>
<li>Rollback plan: one command or automatic, and practised.</li>
</ul>`
        },
        {
          t: 'Pod stuck in Terminating after its node died',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Deletion sets <code>deletionTimestamp</code>, but only the kubelet can confirm the containers are gone. With the node unreachable, the Pod stays <code>Terminating</code> long after its grace period.</li>
<li>Deployment Pods: replacements were already created elsewhere (terminating Pods do not count toward replicas), so this is mostly cosmetic. StatefulSet Pods are <em>not</em> replaced until the old object is gone, and their RWO volumes stay attached (Multi-Attach errors) — a real outage for one replica.</li>
<li>Confirm the node is really dead (cloud console, node Lease <code>renewTime</code>). If it is powered off, delete the Node object (the cloud-controller-manager does this when the VM is gone) or add the <code>node.kubernetes.io/out-of-service=nodeshutdown:NoExecute</code> taint: Pods are force-deleted and volumes detached.</li>
<li><code>kubectl delete pod --force --grace-period=0</code> only removes the API object. During a network partition the old container may still run and write the volume while a new replica starts — fence the node first, then force.</li>
<li>On healthy nodes, look for other causes: a finalizer on the Pod, an app or preStop hook ignoring SIGTERM with a huge grace period, or a hung volume unmount in the kubelet logs.</li>
</ul>`,
          solution: `kubectl get pods -o wide | grep Terminating
kubectl get node worker-3
kubectl get lease worker-3 -n kube-node-lease -o jsonpath='{.spec.renewTime}{"\\n"}'
kubectl get pod db-1 -o jsonpath='{.metadata.deletionTimestamp} {.metadata.finalizers}{"\\n"}'
# Node confirmed powered off: let Kubernetes clean up and detach volumes
kubectl taint nodes worker-3 node.kubernetes.io/out-of-service=nodeshutdown:NoExecute
kubectl get volumeattachment | grep worker-3        # disappears once detached
kubectl get pod db-1 -o wide -w                     # recreated elsewhere with the same PVC
# Last resort for one Pod, only after fencing the node:
kubectl delete pod db-1 --force --grace-period=0`,
          lang: 'bash'
        }
      ],
      interviewFocus: [
        {
          q: 'Walk me through what happens when a pod is deleted, and how you avoid dropped requests.',
          a: `<ol>
<li>API server sets <code>deletionTimestamp</code>; the pod shows <code>Terminating</code>.</li>
<li><strong>In parallel</strong>: the EndpointSlice controller removes the pod from Services (then every kube-proxy, ingress controller and cloud LB must observe that), and the kubelet starts shutdown.</li>
<li>kubelet runs the <code>preStop</code> hook, then sends <strong>SIGTERM</strong> to PID 1 of each container.</li>
<li>If still running when <code>terminationGracePeriodSeconds</code> expires (clock starts at preStop), <strong>SIGKILL</strong>.</li>
</ol>
<p>Because step 2 is eventually consistent, a pod that exits immediately on SIGTERM can still receive traffic → 502/connection refused. Fix: preStop sleep of a few seconds, the app handling SIGTERM by draining (Go <code>Server.Shutdown</code>), exec-form entrypoint so the app actually receives SIGTERM, and a grace period longer than preStop + drain.</p>`
        },
        {
          q: 'With 10 replicas, maxSurge 25% and maxUnavailable 25%, how does a rollout proceed?',
          a: `<p>maxSurge rounds <strong>up</strong> → 3 extra pods allowed (max 13 total). maxUnavailable rounds <strong>down</strong> → 2 pods may be unavailable (at least 8 available). The controller immediately scales the new ReplicaSet to 3 (total 13) and scales the old ReplicaSet down by 2 (to 8). As new pods become Ready (after <code>minReadySeconds</code>), it continues scaling new up and old down while respecting both bounds, until the new ReplicaSet has 10 and the old has 0. If new pods never become Ready, the rollout stops with only a few new pods — the old version keeps serving at ≥ 8 pods — and after <code>progressDeadlineSeconds</code> the Deployment reports <code>ProgressDeadlineExceeded</code>.</p>`
        },
        {
          q: 'When would you use a StatefulSet instead of a Deployment, and what does it not do for you?',
          a: `<p>Use a StatefulSet when each replica needs <strong>stable network identity</strong> (peers address <code>pod-N.svc</code>), <strong>stable dedicated storage</strong> (one PVC per ordinal that follows the pod), or <strong>ordered</strong> startup/shutdown/updates — databases, Kafka, ZooKeeper, etcd, Elasticsearch.</p>
<p>It does <em>not</em>: configure replication, elect leaders, rebalance data, take backups, or perform safe failover. A pod on a failed node is not replaced until the node is confirmed gone (to avoid two pods with the same identity writing the same volume). That is why production stateful systems are run with <strong>operators</strong> encoding that domain knowledge — or as managed services.</p>`
        },
        {
          q: 'Why were native sidecar containers introduced?',
          a: `<p>Before them, sidecars were just extra entries in <code>containers</code>, with no ordering guarantees:</p>
<ul>
<li><strong>Startup</strong>: the app could start before the proxy (Envoy) was ready and fail its first outbound calls.</li>
<li><strong>Shutdown</strong>: the proxy could exit before the app finished draining, cutting off in-flight requests.</li>
<li><strong>Jobs</strong>: a never-ending sidecar kept a Job pod Running forever.</li>
</ul>
<p>Native sidecars (<code>initContainers</code> with <code>restartPolicy: Always</code>; GA in 1.33) start in init order before app containers (optionally gated by a startup probe), run for the whole pod lifetime, restart independently, are stopped after the main containers, and do not block Job completion.</p>`
        },
        {
          q: 'How do you handle a failing CronJob that sometimes runs twice or overlaps?',
          a: `<ul>
<li>Set <code>concurrencyPolicy: Forbid</code> (skip if previous still running) or <code>Replace</code>.</li>
<li>Set <code>startingDeadlineSeconds</code> so missed runs after controller downtime are not all fired at once.</li>
<li>Bound execution with <code>activeDeadlineSeconds</code> and retries with <code>backoffLimit</code>; use <code>podFailurePolicy</code> to stop retrying non-retriable errors.</li>
<li>Make the job <strong>idempotent</strong> (upserts, checkpoints, distributed lock) because Kubernetes guarantees "approximately once" scheduling, not exactly-once.</li>
<li>Specify <code>timeZone</code> explicitly, and alert on <code>lastSuccessfulTime</code> staleness.</li>
</ul>`
        }
      ],
      quiz: [
        { q: 'What are the five pod phases?', a: 'Pending, Running, Succeeded, Failed and Unknown.' },
        { q: 'What are the default maxSurge and maxUnavailable for a Deployment?', a: '25% each.' },
        { q: 'Does Kubernetes automatically roll back a Deployment that exceeds progressDeadlineSeconds?', a: 'No. It marks the Deployment Progressing=False (ProgressDeadlineExceeded); rollback must be done by you or a tool such as Argo Rollouts.' },
        { q: 'How do you declare a native sidecar container?', a: 'As an entry in initContainers with restartPolicy: Always.' },
        { q: 'What does a StatefulSet require that a Deployment does not?', a: 'A headless Service (referenced by serviceName) to provide stable per-pod DNS names; it also supports volumeClaimTemplates for per-pod PVCs.' },
        { q: 'What does partition in a StatefulSet rolling update do?', a: 'Only pods with ordinal greater than or equal to the partition are updated, enabling staged/canary updates.' },
        { q: 'Which CronJob setting prevents overlapping runs?', a: 'concurrencyPolicy: Forbid.' },
        { q: 'Does updating a ConfigMap restart the Deployment pods that use it?', a: 'No. Only pod template changes trigger a rollout; use kubectl rollout restart, a checksum annotation or a reloader controller.' }
      ],
      resources: [
        { title: 'Kubernetes Docs — Pod Lifecycle', url: 'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/', type: 'docs' },
        { title: 'Kubernetes Docs — Deployments', url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/', type: 'docs' },
        { title: 'Kubernetes Docs — StatefulSets', url: 'https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/', type: 'docs' },
        { title: 'Kubernetes Docs — Sidecar Containers', url: 'https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────────────────────── Module 5
    {
      n: 5,
      title: 'Services, Networking & Ingress',
      summary: 'The Kubernetes networking model and CNI plugins, Service types and EndpointSlices, how kube-proxy (iptables, IPVS, nftables) or eBPF implement virtual IPs, CoreDNS service discovery, north-south traffic with Ingress and the Gateway API, and east-west isolation with NetworkPolicy. Networking is where most production incidents — and the hardest interview debugging questions — live.',
      topics: [
        {
          title: 'The Networking Model & CNI Plugins',
          def: `<p>Kubernetes mandates a flat network model:</p>
<ul>
<li>Every <strong>Pod gets its own IP</strong>; containers in a pod share it.</li>
<li>Pods can reach all other pods on any node <strong>without NAT</strong>.</li>
<li>Node agents (kubelet) can reach all pods on their node.</li>
</ul>
<p>Kubernetes does not implement this itself — a <strong>CNI (Container Network Interface) plugin</strong> does. When the runtime creates a pod sandbox it invokes the CNI binary with <code>ADD</code> (create a veth pair, move one end into the pod netns, assign an IP via IPAM, program routes); <code>DEL</code> on teardown. Cross-node traffic uses either an <strong>overlay</strong> (VXLAN/Geneve encapsulation — works anywhere, small MTU/CPU overhead) or <strong>native routing</strong> (BGP or cloud route tables — no encapsulation, needs network cooperation).</p>
<table>
<thead><tr><th>Plugin</th><th>Notes</th></tr></thead>
<tbody>
<tr><td><strong>Cilium</strong></td><td>eBPF datapath, can replace kube-proxy, L3–L7 policies, Hubble flow observability, transparent encryption (WireGuard/IPsec), Cluster Mesh</td></tr>
<tr><td><strong>Calico</strong></td><td>BGP or overlay, iptables/nftables or eBPF dataplane, rich NetworkPolicy (global policies), widely used on-prem</td></tr>
<tr><td><strong>Cloud VPC CNIs</strong></td><td>AWS VPC CNI, Azure CNI, GKE Dataplane V2 (Cilium-based) — pods get routable VPC IPs; watch for IP exhaustion (prefix delegation, overlay modes)</td></tr>
<tr><td><strong>Flannel</strong></td><td>Simple overlay; does not enforce NetworkPolicy on its own</td></tr>
</tbody>
</table>
<p>Pod and Service CIDRs must not overlap with each other or with networks pods need to reach. Dual-stack IPv4/IPv6 is GA.</p>`,
          interview: 'State the three rules of the model, explain that CNI implements it during RunPodSandbox, and compare overlay vs native routing and Cilium vs Calico. Mention VPC IP exhaustion on EKS as a real-world gotcha.',
          examples: [
            { label: 'Inspect pod networking and the CNI', lang: 'bash', code: `kubectl get pods -o wide                         # pod IPs and nodes
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name} {.spec.podCIDR}{"\\n"}{end}'
ls /etc/cni/net.d/ && cat /etc/cni/net.d/*.conflist | jq '.plugins[].type'   # on a node
ip route | grep -E 'cali|cilium|flannel|vxlan'   # per-pod or per-node routes
cilium status && cilium connectivity test        # if running Cilium` }
          ]
        },
        {
          title: 'Service Types',
          def: `<p>Pods come and go; a <strong>Service</strong> gives a stable virtual IP (ClusterIP) and DNS name in front of the pods matched by its <code>selector</code>.</p>
<ul>
<li><strong>ClusterIP</strong> (default): virtual IP reachable only inside the cluster.</li>
<li><strong>NodePort</strong>: ClusterIP + a port (30000–32767) opened on every node.</li>
<li><strong>LoadBalancer</strong>: NodePort + an external L4 load balancer provisioned by the cloud controller (or MetalLB on bare metal). Many cloud controllers can target pod IPs directly (e.g. AWS NLB IP mode) — configured via annotations / <code>loadBalancerClass</code>.</li>
<li><strong>ExternalName</strong>: a DNS CNAME to an external host — no proxying, no ports remapping.</li>
<li><strong>Headless</strong> (<code>clusterIP: None</code>): no virtual IP; DNS returns pod IPs directly — for StatefulSets and client-side load balancing (gRPC).</li>
<li><strong>Selector-less</strong> Services with manual EndpointSlices point at external backends (e.g. a database VM) while keeping in-cluster DNS.</li>
</ul>
<p>Traffic policies: <code>externalTrafficPolicy: Local</code> preserves the client source IP and avoids a second hop but only nodes with local endpoints pass LB health checks (risk of imbalance); <code>Cluster</code> (default) spreads evenly but SNATs. <code>internalTrafficPolicy: Local</code> keeps in-cluster traffic on the node (node-local agents). <code>trafficDistribution</code> (<code>PreferClose</code>, GA 1.33; <code>PreferSameZone</code> — its clearer new name — and <code>PreferSameNode</code> were added in 1.34) prefers topologically close endpoints to cut cross-zone latency and cost, falling back to all endpoints when none are close. <code>port</code> is the Service port, <code>targetPort</code> the container port (can be a named port).</p>`,
          interview: 'Explain each type as building on the previous one (ClusterIP ⊂ NodePort ⊂ LoadBalancer), when to use headless, and the trade-off of externalTrafficPolicy Local vs Cluster.',
          examples: [
            { label: 'LoadBalancer Service preserving client IP', lang: 'yaml', code: `apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local       # keep client source IP, no extra hop
  selector: { app.kubernetes.io/name: api }
  ports:
  - name: http
    port: 80
    targetPort: http                 # named containerPort in the pod spec
    protocol: TCP` }
          ]
        },
        {
          title: 'EndpointSlices & kube-proxy Modes',
          def: `<p>The <strong>EndpointSlice controller</strong> tracks pods matching each Service selector and writes <code>EndpointSlice</code> objects (up to 100 endpoints each, sharded for scale) with per-endpoint conditions <code>ready</code>, <code>serving</code>, <code>terminating</code>, plus zone and node hints. The legacy <code>Endpoints</code> API is deprecated (since 1.33).</p>
<p><strong>kube-proxy</strong> on each node watches Services and EndpointSlices and programs the dataplane:</p>
<ul>
<li><strong>iptables</strong> (long-time default): chains <code>KUBE-SERVICES → KUBE-SVC-* → KUBE-SEP-*</code>, choosing an endpoint with random probabilities and DNAT-ing to it; conntrack handles replies. Rule updates scale poorly with tens of thousands of endpoints.</li>
<li><strong>IPVS</strong>: kernel L4 load balancer with hash tables and algorithms (rr, lc, sh). Deprecated in 1.35 in favour of nftables: it still works, but plan the migration.</li>
<li><strong>nftables</strong> (GA in 1.33): modern successor using maps/sets — faster updates and lookups; the recommended mode going forward on recent kernels.</li>
<li><strong>eBPF replacement</strong>: Cilium (and Calico eBPF) remove kube-proxy and translate Service IPs with eBPF at the socket or TC layer — no per-packet NAT chains, better scalability and observability.</li>
</ul>
<p>The ClusterIP is <strong>virtual</strong>: no interface owns it (in iptables mode), so you cannot ping it — test with TCP/HTTP instead. Load balancing is per <em>connection</em>, not per request, which is why long-lived HTTP/2 / gRPC connections pin to one pod (use client-side LB with a headless Service, or an L7 proxy/mesh).</p>`,
          interview: 'Explain how a ClusterIP is implemented (DNAT in iptables/nftables or eBPF), why you cannot ping it, the per-connection load-balancing limitation with gRPC, and why nftables/eBPF scale better than iptables.',
          examples: [
            { label: 'See how a Service is programmed', lang: 'bash', code: `kubectl get endpointslices -l kubernetes.io/service-name=api -o yaml | grep -A4 conditions
kubectl -n kube-system get cm kube-proxy -o yaml | grep -E '^\\s*mode'
# On a node (iptables mode):
sudo iptables -t nat -L KUBE-SERVICES -n | grep api
sudo iptables -t nat -L KUBE-SVC-XXXXXXXXXXXXXXXX -n     # probability-based endpoint picks
# nftables mode:
sudo nft list table ip kube-proxy | grep -A3 'service-.*api'
sudo conntrack -L -d <cluster-ip> 2>/dev/null | head` }
          ]
        },
        {
          title: 'CoreDNS & Service Discovery',
          def: `<p><strong>CoreDNS</strong> (a Deployment behind the <code>kube-dns</code> Service) answers cluster DNS using the <code>kubernetes</code> plugin:</p>
<ul>
<li><code>my-svc.my-ns.svc.cluster.local</code> → ClusterIP (A/AAAA). Headless → the ready pod IPs.</li>
<li><code>_http._tcp.my-svc.my-ns.svc.cluster.local</code> → SRV records for named ports.</li>
<li>StatefulSet pods: <code>web-0.web.my-ns.svc.cluster.local</code>.</li>
<li>Everything else is forwarded upstream (node resolv.conf or configured resolvers); <code>cache</code> and <code>forward</code> plugins live in the <code>Corefile</code> ConfigMap.</li>
</ul>
<p>The kubelet writes each pod's <code>/etc/resolv.conf</code>: <code>nameserver</code> = kube-dns ClusterIP, search domains <code>&lt;ns&gt;.svc.cluster.local svc.cluster.local cluster.local</code>, and <strong><code>ndots:5</code></strong>. Any name with fewer than 5 dots is first tried with each search suffix — so <code>api.github.com</code> triggers several NXDOMAIN lookups (×2 for A and AAAA) before the real query. Mitigations: use FQDNs with a trailing dot, lower <code>ndots</code> via <code>dnsConfig</code>, deploy <strong>NodeLocal DNSCache</strong>, and scale CoreDNS (autoscaler).</p>
<p><code>dnsPolicy</code>: <code>ClusterFirst</code> (default), <code>Default</code> (inherit node resolv.conf), <code>ClusterFirstWithHostNet</code> (for hostNetwork pods), <code>None</code> (use only <code>dnsConfig</code>). Service env vars (<code>MY_SVC_SERVICE_HOST</code>) also exist but only for Services created before the pod — prefer DNS.</p>`,
          interview: 'Know the DNS name format, what headless DNS returns, the ndots:5 amplification issue and its fixes, and how to debug DNS from inside a pod.',
          examples: [
            { label: 'Debug DNS from inside the cluster', lang: 'bash', code: `kubectl run dns --rm -it --image=registry.k8s.io/e2e-test-images/agnhost:2.53 --restart=Never -- sh
# inside the pod:
cat /etc/resolv.conf                       # nameserver 10.96.0.10, search ..., options ndots:5
nslookup api.shop.svc.cluster.local
dig +search +short api                      # resolved via search domains
dig SRV _http._tcp.api.shop.svc.cluster.local +short
# cluster side:
kubectl -n kube-system get cm coredns -o yaml
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=50` },
            { label: 'Reduce DNS amplification for an egress-heavy pod', lang: 'yaml', code: `spec:
  dnsConfig:
    options:
    - name: ndots
      value: "2"` }
          ]
        },
        {
          title: 'Ingress & the Gateway API',
          def: `<p><strong>Ingress</strong> (<code>networking.k8s.io/v1</code>) defines HTTP(S) host/path routing and TLS termination, implemented by an <strong>ingress controller</strong>. It is stable but <strong>frozen</strong>: anything beyond host/path (header matching, traffic splitting, rewrites, timeouts) lives in controller-specific annotations, which are not portable. The community <strong>ingress-nginx</strong> controller (kubernetes/ingress-nginx) has been <strong>retired</strong>: SIG Network and the Security Response Committee announced it in November 2025 and best-effort maintenance ended in March 2026 — no further releases or security fixes. Existing installs keep running but stay unpatched (remember IngressNightmare, CVE-2025-1974: unauthenticated RCE through its admission webhook), so it is a migration item, not a "later". Note the distinction interviewers like: the <em>Ingress API</em> is frozen, not deprecated, and other controllers (F5 NGINX Ingress Controller, Traefik, HAProxy, cloud ingress controllers) still implement it.</p>
<p>The <strong>Gateway API</strong> (GA since v1.0, Oct 2023) is the successor, designed around <strong>roles</strong>:</p>
<ul>
<li><code>GatewayClass</code> — infrastructure provider (which controller: Envoy Gateway, Istio, Cilium, NGINX Gateway Fabric, Contour, Kong, Traefik, GKE, AWS…).</li>
<li><code>Gateway</code> — cluster operator: listeners (ports, protocols, hostnames, TLS certificates) and which namespaces may attach routes.</li>
<li><code>HTTPRoute</code>, <code>GRPCRoute</code> (GA), <code>TLSRoute</code>/<code>TCPRoute</code>/<code>UDPRoute</code> — app teams: matches on path, headers, query params and method; <strong>weighted backends</strong> (canary); filters (redirects, rewrites, header modification, mirroring); timeouts.</li>
<li><code>ReferenceGrant</code> — explicit consent for cross-namespace references (e.g. a route using a Service or Secret in another namespace).</li>
</ul>
<p>It is expressive, portable, role-oriented (platform team owns Gateways, app teams own Routes) and also used for east-west mesh traffic (GAMMA). For new platforms, choose Gateway API.</p>`,
          interview: 'Contrast Ingress (frozen, annotation sprawl) with Gateway API (typed, role-oriented, traffic splitting built in). Mention the ingress-nginx retirement and how you would plan a migration.',
          examples: [
            { label: 'Shared Gateway (platform team) + HTTPRoute (app team)', lang: 'yaml', code: `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public-gw
  namespace: infra
spec:
  gatewayClassName: envoy-gateway
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    hostname: "*.acme.io"
    tls:
      mode: Terminate
      certificateRefs: [{ name: acme-wildcard-tls }]
    allowedRoutes:
      namespaces:
        from: Selector
        selector: { matchLabels: { gateway-access: "true" } }
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
  namespace: shop
spec:
  parentRefs: [{ name: public-gw, namespace: infra, sectionName: https }]
  hostnames: ["shop.acme.io"]
  rules:
  - matches: [{ path: { type: PathPrefix, value: /api } }]
    backendRefs: [{ name: shop-api, port: 80 }]
    timeouts: { request: 10s }
  - matches: [{ path: { type: PathPrefix, value: / } }]
    backendRefs: [{ name: shop-web, port: 80 }]` }
          ]
        },
        {
          title: 'NetworkPolicy',
          def: `<p>By default every pod can talk to every pod. A <strong>NetworkPolicy</strong> selects pods (<code>podSelector</code>) and, for the selected directions (<code>policyTypes: Ingress/Egress</code>), allows only the listed traffic:</p>
<ul>
<li>Peers: <code>podSelector</code> (same namespace), <code>namespaceSelector</code> (e.g. <code>kubernetes.io/metadata.name: monitoring</code>), both combined in <em>one</em> entry (AND), or <code>ipBlock</code> CIDRs; plus ports/protocols.</li>
<li>Policies are <strong>additive allow-lists</strong> — there are no deny rules. Once any policy selects a pod for a direction, everything not allowed by some policy is denied.</li>
<li>Rules match <strong>pod IPs and container ports after Service DNAT</strong> — allow the targetPort, not the Service port.</li>
<li>Policies are enforced by the <strong>CNI</strong>; on a CNI without support (plain Flannel) they are silently ignored.</li>
</ul>
<p>Standard pattern: per-namespace <strong>default-deny</strong> for ingress and egress, then explicit allows — and do not forget <strong>DNS egress</strong> to CoreDNS (UDP and TCP 53), or everything breaks with name-resolution errors. Standard NetworkPolicy is L3/L4 and namespace-scoped; for cluster-wide guardrails and L7/FQDN rules use CNI-specific CRDs (CiliumNetworkPolicy, Calico GlobalNetworkPolicy) or SIG Network's cluster-scoped policy API (the alpha AdminNetworkPolicy/BaselineAdminNetworkPolicy CRDs, being consolidated into <code>ClusterNetworkPolicy</code>) where your CNI implements it.</p>`,
          interview: 'Be precise: additive allow-lists, AND vs OR semantics in from/to entries, ports are post-DNAT, enforcement depends on the CNI, and default-deny must include a DNS exception.',
          examples: [
            { label: 'Default deny + DNS + frontend → backend', lang: 'yaml', code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-all, namespace: shop }
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-dns-egress, namespace: shop }
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
  - to:
    - namespaceSelector: { matchLabels: { kubernetes.io/metadata.name: kube-system } }
      podSelector: { matchLabels: { k8s-app: kube-dns } }     # same entry = AND
    ports: [{ protocol: UDP, port: 53 }, { protocol: TCP, port: 53 }]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: backend-from-frontend, namespace: shop }
spec:
  podSelector: { matchLabels: { app: backend } }
  policyTypes: [Ingress]
  ingress:
  - from: [{ podSelector: { matchLabels: { app: frontend } } }]
    ports: [{ protocol: TCP, port: 8080 }]                    # container port, not Service port
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: frontend-to-backend, namespace: shop }
spec:
  podSelector: { matchLabels: { app: frontend } }
  policyTypes: [Egress]
  egress:
  - to: [{ podSelector: { matchLabels: { app: backend } } }]
    ports: [{ protocol: TCP, port: 8080 }]` }
          ]
        }
      ],
      problems: [
        {
          t: 'Expose a Deployment as ClusterIP, NodePort and LoadBalancer',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Create the Deployment, then three Services with the same selector but different types.</li>
<li>Reach ClusterIP from a debug pod, NodePort via a node IP, LoadBalancer via its external IP (kind/minikube: <code>cloud-provider-kind</code> or <code>minikube tunnel</code>).</li>
<li>Compare <code>kubectl get svc</code> output and the allocated ports.</li>
</ul>`,
          solution: `kubectl create deployment web --image=nginx:1.27 --replicas=2
kubectl expose deploy web --name web-cip --port 80
kubectl expose deploy web --name web-np  --port 80 --type NodePort
kubectl expose deploy web --name web-lb  --port 80 --type LoadBalancer
kubectl get svc
kubectl run c --rm -it --image=curlimages/curl --restart=Never -- curl -sI web-cip
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
NP=$(kubectl get svc web-np -o jsonpath='{.spec.ports[0].nodePort}')
curl -sI http://$NODE_IP:$NP
kubectl get svc web-lb -w        # wait for EXTERNAL-IP`,
          lang: 'bash'
        },
        {
          t: 'Discover services through cluster DNS',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Resolve short name, namespace-qualified name and FQDN from pods in the same and in different namespaces.</li>
<li>Compare a normal Service (one ClusterIP) to a headless Service (pod IPs).</li>
<li>Read <code>/etc/resolv.conf</code> and explain the search list.</li>
</ul>`,
          solution: `kubectl create ns other
kubectl run d1 --rm -it -n other --image=busybox:1.36 --restart=Never -- sh -c '
  cat /etc/resolv.conf
  nslookup web-cip || echo "short name fails from another namespace"
  nslookup web-cip.default
  nslookup web-cip.default.svc.cluster.local'
kubectl create service clusterip web-headless --clusterip=None --tcp=80:80
kubectl patch svc web-headless -p '{"spec":{"selector":{"app":"web"}}}'
kubectl run d2 --rm -it --image=busybox:1.36 --restart=Never -- nslookup web-headless   # 2 pod IPs`,
          lang: 'bash'
        },
        {
          t: 'Service returns connection refused / has no endpoints — diagnose',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Check EndpointSlices: empty means the selector matches no <em>Ready</em> pods (label typo, wrong namespace, failing readiness probe).</li>
<li>Endpoints present but connection refused: <code>targetPort</code> does not match the container port, or the app listens on 127.0.0.1.</li>
<li>Bypass the Service: curl the pod IP directly; then curl the ClusterIP; then the DNS name — find which hop fails.</li>
<li>Check NetworkPolicies selecting the destination pods.</li>
</ul>`,
          solution: `kubectl get svc api -o jsonpath='{.spec.selector}{" "}{.spec.ports}{"\\n"}'
kubectl get pods -l app.kubernetes.io/name=api -o wide --show-labels
kubectl get endpointslices -l kubernetes.io/service-name=api -o wide
kubectl describe pod -l app.kubernetes.io/name=api | grep -E 'Readiness|Ready:'
POD_IP=$(kubectl get pod -l app.kubernetes.io/name=api -o jsonpath='{.items[0].status.podIP}')
kubectl run c --rm -it --image=curlimages/curl --restart=Never -- sh -c "
  curl -sv http://$POD_IP:8080/healthz; curl -sv http://api/healthz"
POD=$(kubectl get pod -l app.kubernetes.io/name=api -o name | head -1)
kubectl debug -it $POD --image=nicolaka/netshoot -- ss -lnt   # 0.0.0.0:8080 or only 127.0.0.1?
kubectl get networkpolicy -n default`,
          lang: 'bash'
        },
        {
          t: 'Route HTTPS traffic with the Gateway API (host, path and canary)',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Install the Gateway API CRDs and an implementation (e.g. Envoy Gateway, Cilium, NGINX Gateway Fabric).</li>
<li>Create a Gateway with an HTTPS listener using a TLS Secret (cert-manager can issue it).</li>
<li>Attach an HTTPRoute with path-based rules and a 90/10 weighted canary.</li>
<li>Check <code>status.parents[].conditions</code> on the route (Accepted, ResolvedRefs).</li>
</ul>`,
          solution: `# Pin current releases; the Gateway API CRD version must be one your implementation supports
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.4.0/standard-install.yaml
helm install eg oci://docker.io/envoyproxy/gateway-helm --version v1.5.0 -n envoy-gateway-system --create-namespace
kubectl apply -f gatewayclass.yaml -f gateway.yaml -f httproute.yaml
kubectl get gateway -A
kubectl get httproute shop -n shop -o jsonpath='{.status.parents[0].conditions}' | jq '.[] | {type,status,reason}'
GW_IP=$(kubectl get gateway public-gw -n infra -o jsonpath='{.status.addresses[0].value}')
for i in $(seq 20); do curl -sk --resolve shop.acme.io:443:$GW_IP https://shop.acme.io/api/version; done | sort | uniq -c`,
          lang: 'bash'
        },
        {
          t: 'Lock down a namespace with default-deny NetworkPolicies',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Verify your CNI enforces policies (Calico, Cilium, cloud CNIs with policy enabled).</li>
<li>Apply default-deny for ingress and egress; confirm everything breaks, including DNS.</li>
<li>Add DNS egress, frontend→backend ingress/egress, and ingress from the gateway namespace.</li>
<li>Test allowed and denied paths with curl from labelled test pods.</li>
</ul>`,
          solution: `kubectl apply -f default-deny.yaml          # policies from the lesson
kubectl run fe --rm -it -n shop -l app=frontend --image=curlimages/curl --restart=Never -- \\
  curl -s -m 3 http://backend:8080/healthz      # allowed
kubectl run rogue --rm -it -n shop -l app=rogue --image=curlimages/curl --restart=Never -- \\
  curl -s -m 3 http://backend:8080/healthz || echo "blocked as expected"
kubectl get networkpolicy -n shop
# Cilium: observe drops
hubble observe --namespace shop --verdict DROPPED`,
          lang: 'bash'
        },
        {
          t: 'Client source IP is lost behind a LoadBalancer Service',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>With <code>externalTrafficPolicy: Cluster</code> the node SNATs traffic when forwarding to a pod on another node.</li>
<li>Set <code>externalTrafficPolicy: Local</code>: no SNAT, but only nodes with ready local endpoints pass the LB health check (<code>healthCheckNodePort</code>); spread pods evenly.</li>
<li>For L7 load balancers, read <code>X-Forwarded-For</code> or enable PROXY protocol instead.</li>
<li>LBs in IP-target mode send directly to pod IPs and avoid the issue.</li>
</ul>`,
          solution: `kubectl patch svc api -p '{"spec":{"externalTrafficPolicy":"Local"}}'
kubectl get svc api -o jsonpath='{.spec.healthCheckNodePort}{"\\n"}'
kubectl logs deploy/api | tail          # remote addr now shows real client IPs
# Avoid imbalance: spread replicas across nodes/zones (topologySpreadConstraints)`,
          lang: 'bash'
        },
        {
          t: 'Intermittent DNS timeouts and slow outbound calls',
          d: 'hard',
          type: 'debug',
          hint: `<ul>
<li>Measure: CoreDNS metrics (<code>coredns_dns_request_duration_seconds</code>, SERVFAIL rates), CPU throttling and replica count of CoreDNS.</li>
<li><code>ndots:5</code> multiplies external lookups by the search list (and A + AAAA) — use FQDNs with a trailing dot or lower ndots.</li>
<li>Classic 5 s timeouts: conntrack races on parallel UDP A/AAAA queries — NodeLocal DNSCache (TCP upstream) fixes it; <code>single-request-reopen</code> for glibc clients.</li>
<li>Scale CoreDNS (cluster-proportional autoscaler) and check upstream resolvers and NetworkPolicy DNS egress (TCP 53 too).</li>
</ul>`,
          solution: `kubectl -n kube-system top pod -l k8s-app=kube-dns
kubectl -n kube-system logs -l k8s-app=kube-dns | grep -iE 'timeout|SERVFAIL|i/o' | tail
kubectl run t --rm -it --image=registry.k8s.io/e2e-test-images/agnhost:2.53 --restart=Never -- sh -c '
  time nslookup api.github.com; time nslookup api.github.com.'
# Enable query logging temporarily: add "log" to the Corefile
kubectl -n kube-system edit cm coredns
# Mitigations: NodeLocal DNSCache DaemonSet, dnsConfig ndots: "2", scale CoreDNS
kubectl -n kube-system scale deploy coredns --replicas=4`,
          lang: 'bash'
        },
        {
          t: 'Trace a request from a pod to a ClusterIP Service backend on another node',
          d: 'hard',
          type: 'concept',
          hint: `<ul>
<li>DNS: CoreDNS returns the ClusterIP for <code>api.shop.svc.cluster.local</code>.</li>
<li>Packet leaves the pod netns through its veth into the host netns.</li>
<li>kube-proxy rules (iptables/nftables) or eBPF match ClusterIP:port and DNAT to a chosen podIP:targetPort; conntrack records the flow.</li>
<li>CNI routing: encapsulate (VXLAN/Geneve) or route natively to the destination node; it delivers via the target pod's veth.</li>
<li>Reply is reverse-NATed by conntrack so the client sees the ClusterIP as the source.</li>
</ul>`
        },
        {
          t: 'Plan a migration from ingress-nginx to the Gateway API',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>Inventory Ingress objects and every controller-specific annotation (rewrites, auth, rate limits, canary, timeouts, snippets).</li>
<li>Pick a conformant implementation; map features to HTTPRoute matches/filters/timeouts or implementation policy CRDs; use the <code>ingress2gateway</code> tool to bootstrap manifests.</li>
<li>Platform team owns GatewayClass/Gateway and certificates; app teams own HTTPRoutes (RBAC + <code>allowedRoutes</code>).</li>
<li>Run both side by side on separate LB addresses; shift DNS gradually (weighted records), monitor 4xx/5xx and latency; roll back by DNS.</li>
<li>Remove annotation-only behaviours (e.g. <code>configuration-snippet</code>) — they were also a security risk.</li>
</ul>`
        },
        {
          t: 'Design network isolation for a multi-tenant cluster',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>Namespace per tenant with default-deny ingress/egress, DNS allowed, and explicit allows to shared services.</li>
<li>Cluster-wide guardrails tenants cannot override: Calico/Cilium global policies, or AdminNetworkPolicy/ClusterNetworkPolicy where supported (block node and metadata IPs, always allow monitoring and DNS).</li>
<li>Egress control: FQDN-based policies or dedicated egress gateways with fixed IPs for allow-listing at partners.</li>
<li>North-south: shared Gateway with per-tenant HTTPRoutes restricted by <code>allowedRoutes</code>; mTLS east-west via a mesh where required.</li>
<li>Observe and audit flows (Hubble, Calico flow logs); test policies in CI with policy simulators.</li>
</ul>`
        },
        {
          t: 'Pods stuck in ContainerCreating: the CNI cannot assign an IP',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Events show <code>FailedCreatePodSandBox ... failed to set up sandbox container network</code> with <code>failed to assign an IP address</code> or <code>no IP addresses available in range set</code>.</li>
<li><strong>IP exhaustion</strong>: with VPC-native CNIs (AWS VPC CNI, Azure CNI) every Pod consumes a subnet IP, and subnets or per-node ENI/IP limits run out long before CPU does. Overlay CNIs exhaust the node's podCIDR (a /24 is about 250 Pods) or the cluster pool.</li>
<li><strong>Unhealthy CNI on that node</strong>: the agent DaemonSet Pod crash-looping, no config in <code>/etc/cni/net.d</code>, or leaked IPAM allocations after crashes.</li>
<li>Fixes: prefix delegation, secondary CIDRs or larger subnets, an overlay/custom networking mode; tune warm-IP settings; align <code>maxPods</code> with the IPs a node can really get; repair the CNI agent and clean stale IPAM state. In design reviews, size Pod CIDRs for peak scale-out, not for today's node count.</li>
</ul>`,
          solution: `kubectl describe pod api-xyz | sed -n '/Events/,$p'
NODE=$(kubectl get pod api-xyz -o jsonpath='{.spec.nodeName}')
kubectl -n kube-system get pods -o wide --field-selector spec.nodeName=$NODE | grep -E 'aws-node|cilium|calico|azure'
kubectl get node $NODE -o jsonpath='{.status.allocatable.pods} {.spec.podCIDR}{"\\n"}'
kubectl get pods -A --field-selector spec.nodeName=$NODE --no-headers | wc -l
# EKS example: IPAM errors and subnet headroom
kubectl -n kube-system logs -l k8s-app=aws-node -c aws-node --tail=50 | grep -iE 'ipamd|no available'
aws ec2 describe-subnets --subnet-ids subnet-0abc --query 'Subnets[].AvailableIpAddressCount'
# Mitigation: prefix delegation (a /28 per ENI slot), then recycle nodes so maxPods is recalculated
kubectl -n kube-system set env daemonset aws-node ENABLE_PREFIX_DELEGATION=true`,
          lang: 'bash'
        }
      ],
      interviewFocus: [
        {
          q: 'How does a ClusterIP Service actually work?',
          a: `<p>A ClusterIP is a <strong>virtual IP</strong> allocated from the service CIDR; no host or interface owns it. Each node's kube-proxy (or an eBPF dataplane) watches Services and EndpointSlices and installs rules: packets to <code>ClusterIP:port</code> are <strong>DNAT</strong>-ed to one ready backend <code>podIP:targetPort</code> (random choice in iptables mode, maps in nftables, eBPF lookups in Cilium), and conntrack reverses the translation for replies. The real pod-to-pod delivery is then handled by the CNI.</p>
<p>Consequences: balancing is <strong>per connection</strong> (gRPC/HTTP/2 connections stick to one pod), you cannot ping a ClusterIP in iptables mode, and changes propagate eventually — briefly, some nodes may still route to a terminating pod.</p>`
        },
        {
          q: 'Ingress vs Gateway API — why did Kubernetes create a new API?',
          a: `<ul>
<li><strong>Expressiveness</strong>: Ingress only standardises host/path routing and TLS; everything else became incompatible annotations. Gateway API has typed fields for header/query/method matching, weighted backends, redirects, rewrites, mirroring and timeouts.</li>
<li><strong>Role separation</strong>: GatewayClass (provider), Gateway (platform/ops), Routes (app teams), with <code>allowedRoutes</code> and <code>ReferenceGrant</code> controlling cross-namespace access. One Ingress object mixed all of this.</li>
<li><strong>Protocols</strong>: HTTP, gRPC, TLS passthrough, TCP, UDP; also mesh (east-west) via GAMMA.</li>
<li><strong>Portability</strong>: a conformance test suite and versioned release channels (standard vs experimental).</li>
</ul>
<p>Ingress is not removed, but it is feature-frozen and the most popular controller (ingress-nginx) has been retired, so new designs should default to Gateway API.</p>`
        },
        {
          q: 'Your gRPC service gets all traffic on one pod even though it has 5 replicas. Why, and how do you fix it?',
          a: `<p>kube-proxy balances <strong>L4 connections</strong>. gRPC uses long-lived HTTP/2 connections that multiplex all requests, so each client sticks to whichever pod it connected to first; with few clients, load is badly skewed.</p>
<ul>
<li><strong>Client-side load balancing</strong>: headless Service + gRPC <code>round_robin</code> policy with the <code>dns:///</code> resolver (re-resolve periodically; set server <code>MaxConnectionAge</code> so clients reconnect and discover new pods).</li>
<li><strong>L7 proxy</strong>: a service mesh (Istio, Linkerd) or a Gateway with <code>GRPCRoute</code> that balances per request.</li>
<li>xDS-based proxyless gRPC for large fleets.</li>
</ul>`
        },
        {
          q: 'Explain NetworkPolicy semantics, including the common pitfalls.',
          a: `<ul>
<li>Pods are non-isolated until <strong>any</strong> policy selects them for a direction; then only the union of all allows applies. There are no deny rules in the standard API.</li>
<li>In a <code>from</code>/<code>to</code> list, separate entries are <strong>OR</strong>; <code>namespaceSelector</code> and <code>podSelector</code> in the same entry are <strong>AND</strong> — a missing dash changes the meaning drastically.</li>
<li>Policies see traffic after Service DNAT: allow <strong>pod labels and container ports</strong>, not Service IPs/ports.</li>
<li>Default-deny egress breaks <strong>DNS</strong> unless you allow UDP+TCP 53 to CoreDNS.</li>
<li>Enforcement is by the CNI — on a non-enforcing CNI they silently do nothing. Test them.</li>
<li>For cluster-wide, L7 or FQDN rules use CNI-specific CRDs (or the emerging cluster-scoped ClusterNetworkPolicy API).</li>
</ul>`
        },
        {
          q: 'Compare kube-proxy iptables, IPVS, nftables and eBPF dataplanes.',
          a: `<table>
<thead><tr><th>Mode</th><th>How</th><th>Trade-offs</th></tr></thead>
<tbody>
<tr><td>iptables</td><td>Linear chains with random-probability DNAT</td><td>Ubiquitous; rule sync and evaluation degrade with tens of thousands of endpoints</td></tr>
<tr><td>IPVS</td><td>Kernel L4 LB, hash tables, multiple algorithms</td><td>Faster lookups, but still relies on iptables for some features; deprecated in 1.35</td></tr>
<tr><td>nftables</td><td>Sets/maps (verdict maps), incremental updates</td><td>GA in 1.33; scales far better than iptables; recommended for kube-proxy on modern kernels</td></tr>
<tr><td>eBPF (Cilium)</td><td>Service translation at socket/TC hooks; kube-proxy removed</td><td>Best scalability and observability, Maglev hashing, DSR; requires a modern kernel and Cilium expertise</td></tr>
</tbody>
</table>`
        }
      ],
      quiz: [
        { q: 'What port range does NodePort use by default?', a: '30000-32767.' },
        { q: 'What does a headless Service return from DNS?', a: 'The IPs of the ready pods selected by the Service, instead of a single ClusterIP.' },
        { q: 'What is the full DNS name of Service "api" in namespace "shop"?', a: 'api.shop.svc.cluster.local (with the default cluster domain).' },
        { q: 'Why does externalTrafficPolicy: Local preserve the client IP?', a: 'Traffic is only delivered to pods on the receiving node, so no SNAT is needed for a cross-node hop.' },
        { q: 'What happens to all other traffic once a pod is selected by an Ingress-type NetworkPolicy?', a: 'All inbound traffic not explicitly allowed by some policy is denied.' },
        { q: 'Which Gateway API resource is typically owned by application teams?', a: 'Route resources such as HTTPRoute or GRPCRoute (GatewayClass belongs to the provider and Gateway to the platform team).' },
        { q: 'What resource lets a route reference a Service or Secret in another namespace?', a: 'ReferenceGrant, created in the target namespace.' },
        { q: 'Why can a pod not resolve names after a default-deny egress policy?', a: 'DNS traffic to CoreDNS on UDP/TCP port 53 is blocked; an explicit egress allow is required.' },
        { q: 'Is the Ingress API deprecated now that ingress-nginx is retired?', a: 'No. The Ingress API is GA but feature-frozen; only the community ingress-nginx controller was retired (no fixes after March 2026). Other controllers still implement Ingress, and Gateway API is the recommended successor.' },
        { q: 'Which kube-proxy mode is recommended going forward?', a: 'nftables (GA in 1.33). IPVS was deprecated in 1.35, and iptables mode scales poorly with many Services and endpoints.' }
      ],
      resources: [
        { title: 'Kubernetes Docs — Service', url: 'https://kubernetes.io/docs/concepts/services-networking/service/', type: 'docs' },
        { title: 'Kubernetes Docs — DNS for Services and Pods', url: 'https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/', type: 'docs' },
        { title: 'Gateway API documentation', url: 'https://gateway-api.sigs.k8s.io/', type: 'docs' },
        { title: 'Kubernetes Docs — Network Policies', url: 'https://kubernetes.io/docs/concepts/services-networking/network-policies/', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────────────────────── Module 6
    {
      n: 6,
      title: 'Configuration & Storage',
      summary: 'Separating configuration from images with ConfigMaps and Secrets (and their real security limits), and persisting data with PersistentVolumes, PVCs, StorageClasses, CSI drivers, snapshots and ephemeral volumes. Expect questions on Secret security, PVC binding failures and stateful storage design.',
      topics: [
        {
          title: 'ConfigMaps',
          def: `<p>A <strong>ConfigMap</strong> stores non-confidential key/value configuration (up to <strong>1 MiB</strong>) so the same image runs in every environment (12-factor). Consume it as:</p>
<ul>
<li><strong>Environment variables</strong>: <code>env[].valueFrom.configMapKeyRef</code> or all keys with <code>envFrom</code>. Read once at container start — <strong>never updated</strong> in a running container.</li>
<li><strong>Volume files</strong>: each key becomes a file. The kubelet <strong>does update</strong> mounted files when the ConfigMap changes (eventually — sync period plus cache TTL, typically up to a minute or two) via an atomic symlink swap. Mounts using <code>subPath</code> are <em>not</em> updated.</li>
<li><strong>Command-line args</strong> via <code>$(VAR)</code> expansion of env vars.</li>
</ul>
<p>Apps must re-read files to pick up changes (file watcher / SIGHUP), or you roll the Deployment. Common patterns: a <strong>checksum annotation</strong> of the config in the pod template (Helm), a <strong>hash-suffixed name</strong> generated by Kustomize's <code>configMapGenerator</code> (changing config creates a new ConfigMap and therefore a rollout — and allows rollback), or a reloader controller.</p>
<p><code>immutable: true</code> prevents accidental edits and lets the kubelet stop watching the object (less apiserver load at scale); to change it you create a new one.</p>`,
          interview: 'The key gotcha: env vars never refresh, volume files refresh eventually (not with subPath), and nothing restarts your pods automatically. Know the hash-suffix and checksum patterns for triggering rollouts.',
          examples: [
            { label: 'Create and consume a ConfigMap', lang: 'bash', code: `kubectl create configmap api-config \\
  --from-literal=LOG_LEVEL=info \\
  --from-file=config.yaml=./config/prod.yaml \\
  --dry-run=client -o yaml > api-config.yaml
kubectl apply -f api-config.yaml
kubectl get cm api-config -o yaml` },
            { label: 'Env + file consumption', lang: 'yaml', code: `spec:
  containers:
  - name: api
    image: ghcr.io/acme/api:1.4.2
    env:
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef: { name: api-config, key: LOG_LEVEL }
    volumeMounts:
    - name: config
      mountPath: /etc/api          # /etc/api/config.yaml, refreshed on change
      readOnly: true
  volumes:
  - name: config
    configMap:
      name: api-config
      items: [{ key: config.yaml, path: config.yaml }]` }
          ]
        },
        {
          title: 'Secrets and Their Limits',
          def: `<p>A <strong>Secret</strong> looks like a ConfigMap for sensitive data, with types such as <code>Opaque</code>, <code>kubernetes.io/tls</code>, <code>kubernetes.io/dockerconfigjson</code> and <code>kubernetes.io/basic-auth</code>. Know what it does and does <em>not</em> protect:</p>
<ul>
<li>Values are <strong>base64-encoded, not encrypted</strong>. Anyone who can <code>get</code> the Secret (or create a pod in that namespace that mounts it) can read it. <code>list</code>/<code>watch</code> on secrets is effectively read access to all of them.</li>
<li>Stored <strong>in plaintext in etcd by default</strong> → enable <strong>encryption at rest</strong> with an <code>EncryptionConfiguration</code>, ideally the <strong>KMS v2</strong> provider (GA 1.29) backed by a cloud KMS/HSM (envelope encryption); managed clusters offer this as a setting.</li>
<li>Better than ConfigMaps: mounted via <strong>tmpfs</strong> (never on node disk), only sent to nodes running pods that use them, separately RBAC-controllable.</li>
<li>Prefer <strong>volume mounts over env vars</strong>: env vars leak into crash dumps, child processes, <code>/proc/&lt;pid&gt;/environ</code> and debug output.</li>
</ul>
<p><strong>External secret management</strong> keeps the source of truth outside the cluster: <strong>External Secrets Operator</strong> (syncs from AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, Vault into native Secrets), <strong>Secrets Store CSI Driver</strong> (mounts secrets directly as files, optional sync), <strong>Vault Agent injector</strong>. For GitOps, never commit plain Secrets — use <strong>Sealed Secrets</strong> or <strong>SOPS</strong> (encrypted in Git) or ESO references. Better still, avoid static secrets: workload identity (IRSA/EKS Pod Identity, GKE/Azure Workload Identity) for cloud APIs.</p>`,
          interview: 'Say "base64 is encoding, not encryption" before the interviewer does. Cover encryption at rest (KMS v2), RBAC least privilege, env vs volume, external secret stores and workload identity.',
          examples: [
            { label: 'Create and inspect Secrets', lang: 'bash', code: `kubectl create secret generic api-db \\
  --from-literal=DB_USER=api --from-literal=DB_PASSWORD="$(openssl rand -base64 24)"
kubectl create secret tls api-tls --cert=tls.crt --key=tls.key
kubectl create secret docker-registry regcred --docker-server=ghcr.io \\
  --docker-username=bot --docker-password="$GHCR_TOKEN"
kubectl get secret api-db -o jsonpath='{.data.DB_USER}' | base64 -d   # trivially decoded
kubectl auth can-i get secrets -n shop --as=system:serviceaccount:shop:default` }
          ]
        },
        {
          title: 'Environment Variables vs Volume Mounts & the Downward API',
          def: `<table>
<thead><tr><th>Aspect</th><th>Env vars</th><th>Volume files</th></tr></thead>
<tbody>
<tr><td>Updates</td><td>Never (restart needed)</td><td>Eventually refreshed (not with subPath)</td></tr>
<tr><td>Secret safety</td><td>Leaks to child processes, logs, crash reports</td><td>tmpfs files with file permissions (<code>defaultMode</code>)</td></tr>
<tr><td>Size/structure</td><td>Small scalar values</td><td>Whole config files, certificates</td></tr>
<tr><td>App support</td><td>Universal (12-factor)</td><td>App must read (and ideally watch) files</td></tr>
</tbody>
</table>
<p>The <strong>downward API</strong> exposes pod metadata and resources to the container without calling the API server: <code>metadata.name</code>, <code>metadata.namespace</code>, <code>metadata.labels</code>, <code>status.podIP</code>, <code>spec.nodeName</code>, <code>spec.serviceAccountName</code>, and container <code>requests</code>/<code>limits</code> (via <code>resourceFieldRef</code> — useful for <code>GOMEMLIMIT</code>). Labels and annotations are only available as files (they can change).</p>
<p>A <strong>projected</strong> volume combines several sources — ConfigMaps, Secrets, downward API and <code>serviceAccountToken</code> (audience-bound, auto-rotated tokens) — into one directory.</p>`,
          interview: 'Justify secrets-as-files, and show the downward API for pod name/IP/limits (logging context, GOMEMLIMIT, peer identity). Projected service account tokens come up again in security interviews.',
          examples: [
            { label: 'Downward API and a projected volume', lang: 'yaml', code: `spec:
  containers:
  - name: api
    image: ghcr.io/acme/api:1.4.2
    env:
    - name: POD_NAME
      valueFrom: { fieldRef: { fieldPath: metadata.name } }
    - name: NODE_NAME
      valueFrom: { fieldRef: { fieldPath: spec.nodeName } }
    - name: GOMEMLIMIT
      valueFrom: { resourceFieldRef: { resource: limits.memory } }
    volumeMounts:
    - { name: bundle, mountPath: /var/run/app, readOnly: true }
  volumes:
  - name: bundle
    projected:
      defaultMode: 0440
      sources:
      - secret: { name: api-db }
      - configMap: { name: api-config }
      - downwardAPI:
          items: [{ path: labels, fieldRef: { fieldPath: metadata.labels } }]
      - serviceAccountToken:
          audience: vault
          expirationSeconds: 3600
          path: vault-token` }
          ]
        },
        {
          title: 'PersistentVolumes, PVCs & StorageClasses',
          def: `<p>Storage is decoupled into three objects:</p>
<ul>
<li><strong>PersistentVolume (PV)</strong>: a cluster-scoped piece of storage (EBS volume, PD, Azure Disk, NFS share…).</li>
<li><strong>PersistentVolumeClaim (PVC)</strong>: a namespaced <em>request</em> for storage (size, access mode, class). The PV controller <strong>binds</strong> a PVC 1:1 to a matching PV.</li>
<li><strong>StorageClass</strong>: a provisioner + parameters (disk type, IOPS, encryption) that enables <strong>dynamic provisioning</strong> — a PV is created on demand for each PVC. One class can be the default.</li>
</ul>
<p>Key fields:</p>
<ul>
<li><strong>Access modes</strong>: <code>ReadWriteOnce</code> (RWO — one <em>node</em>, multiple pods on that node), <code>ReadOnlyMany</code>, <code>ReadWriteMany</code> (RWX — needs a shared filesystem: NFS, EFS, CephFS, Azure Files), <code>ReadWriteOncePod</code> (RWOP — exactly one pod, GA 1.29). Block cloud disks are RWO.</li>
<li><code>volumeBindingMode: WaitForFirstConsumer</code>: delay provisioning until the pod is scheduled so the disk is created in the <strong>same zone</strong> as the pod. <code>Immediate</code> can create a disk in a zone where the pod cannot run.</li>
<li><code>reclaimPolicy</code>: <code>Delete</code> (default for dynamic — deleting the PVC deletes the disk and data!) or <code>Retain</code> (PV becomes <code>Released</code>; manual cleanup/reuse).</li>
<li><code>allowVolumeExpansion: true</code> to grow PVCs by editing <code>spec.resources.requests.storage</code> (shrinking is not supported).</li>
<li><code>volumeMode: Filesystem</code> (default) or <code>Block</code> (raw device).</li>
</ul>`,
          interview: 'Explain PV/PVC/StorageClass roles, why WaitForFirstConsumer matters for zonal disks, that RWO is per node not per pod (RWOP is per pod), and the danger of reclaimPolicy Delete for important data.',
          examples: [
            { label: 'StorageClass (AWS EBS CSI) and PVC', lang: 'yaml', code: `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-encrypted
  annotations: { storageclass.kubernetes.io/is-default-class: "true" }
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: gp3-encrypted
  resources:
    requests: { storage: 20Gi }` }
          ]
        },
        {
          title: 'CSI Drivers & Volume Snapshots',
          def: `<p>The <strong>Container Storage Interface (CSI)</strong> lets storage vendors ship drivers out-of-tree. The in-tree cloud volume plugins have been migrated to CSI and removed. A CSI driver runs as:</p>
<ul>
<li>a <strong>controller plugin</strong> (Deployment) with Kubernetes sidecars — <code>external-provisioner</code> (CreateVolume for PVCs), <code>external-attacher</code> (ControllerPublish via <code>VolumeAttachment</code> objects), <code>external-resizer</code>, <code>external-snapshotter</code>;</li>
<li>a <strong>node plugin</strong> (DaemonSet) the kubelet calls to <code>NodeStageVolume</code> (format/mount the device once per node) and <code>NodePublishVolume</code> (bind-mount into the pod).</li>
</ul>
<p><strong>Volume snapshots</strong> (GA) mirror the PV/PVC model: <code>VolumeSnapshotClass</code> (driver + deletion policy), <code>VolumeSnapshot</code> (namespaced request), <code>VolumeSnapshotContent</code> (the actual snapshot). Restore by creating a PVC with <code>dataSource</code> pointing at the snapshot; <strong>clone</strong> by using another PVC as <code>dataSource</code>. Snapshots are crash-consistent — quiesce or use app-level backup for databases. Tools like <strong>Velero</strong> orchestrate snapshot + object backups for DR. <code>VolumeAttributesClass</code> (GA 1.34) lets you change performance parameters (IOPS/throughput) of a live volume by switching the PVC's <code>volumeAttributesClassName</code>.</p>`,
          interview: 'Describe the controller vs node plugin split, the attach/stage/publish steps (useful for debugging stuck mounts), and how snapshots and restores work — plus that crash-consistent is not application-consistent.',
          examples: [
            { label: 'Snapshot and restore a PVC', lang: 'yaml', code: `apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: data-snap-2026-10-29
spec:
  volumeSnapshotClassName: ebs-snapclass
  source:
    persistentVolumeClaimName: data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-restored
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: gp3-encrypted
  resources:
    requests: { storage: 20Gi }
  dataSource:
    name: data-snap-2026-10-29
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io` }
          ]
        },
        {
          title: 'Ephemeral Volumes',
          def: `<p>Not all volumes outlive the pod:</p>
<ul>
<li><strong>emptyDir</strong>: created empty when the pod starts on a node, deleted when the pod is removed (survives container restarts). Share files between containers, scratch/cache space. <code>medium: Memory</code> makes it tmpfs (counts against the container memory limit); <code>sizeLimit</code> caps usage (exceeding it evicts the pod).</li>
<li><strong>configMap / secret / downwardAPI / projected</strong>: injected data (Secrets on tmpfs).</li>
<li><strong>Generic ephemeral volumes</strong> (<code>ephemeral.volumeClaimTemplate</code>): a per-pod PVC from any StorageClass, created and deleted with the pod — scratch space with real disk performance, snapshots or a specific size.</li>
<li><strong>CSI ephemeral inline volumes</strong>: driver-specific, e.g. the Secrets Store CSI driver.</li>
<li><strong>Image volumes</strong> (<code>volumes[].image</code>; alpha 1.31, beta 1.33, enabled by default from 1.35): mount the content of an OCI image or artifact read-only, e.g. ML model weights or static assets versioned and shipped separately from the app image. Pulled like container images (<code>pullPolicy</code>, imagePullSecrets) and needs runtime support (containerd 2.1+, recent CRI-O).</li>
</ul>
<p>Container writable layers, logs and emptyDirs consume node <strong>ephemeral storage</strong>. Set <code>resources.requests/limits["ephemeral-storage"]</code>; the kubelet evicts pods that exceed limits, and under <code>DiskPressure</code> evicts pods to reclaim space. Avoid <code>hostPath</code> — it ties pods to a node and is a major security risk (blocked by the <em>restricted</em> and <em>baseline</em> Pod Security levels).</p>`,
          interview: 'Know when to use emptyDir vs generic ephemeral volumes vs PVCs, that memory-backed emptyDir counts toward the memory limit, and that ephemeral-storage limits cause evictions.',
          examples: [
            { label: 'emptyDir scratch and a generic ephemeral volume', lang: 'yaml', code: `spec:
  containers:
  - name: worker
    image: ghcr.io/acme/transcoder:3.0.0
    resources:
      requests: { ephemeral-storage: 2Gi }
      limits:   { ephemeral-storage: 4Gi }
    volumeMounts:
    - { name: tmp, mountPath: /tmp }
    - { name: scratch, mountPath: /scratch }
  volumes:
  - name: tmp
    emptyDir: { medium: Memory, sizeLimit: 128Mi }
  - name: scratch
    ephemeral:
      volumeClaimTemplate:
        spec:
          accessModes: [ReadWriteOnce]
          storageClassName: gp3-encrypted
          resources: { requests: { storage: 50Gi } }` },
            { label: 'Image volume: mount model weights from an OCI artifact', lang: 'yaml', code: `spec:
  containers:
  - name: inference
    image: ghcr.io/acme/inference:2.1.0          # small app image
    volumeMounts:
    - { name: model, mountPath: /models, readOnly: true }
  volumes:
  - name: model
    image:                                       # image volume source (beta, on by default in 1.35)
      reference: ghcr.io/acme/models/ranker:v7   # weights versioned independently of the app
      pullPolicy: IfNotPresent` }
          ]
        }
      ],
      problems: [
        {
          t: 'Inject configuration via a ConfigMap as env vars and as a file',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Create the ConfigMap from a literal and from a file.</li>
<li>Consume one key with <code>configMapKeyRef</code> and mount the file under <code>/etc/app</code>.</li>
<li>Verify with <code>kubectl exec … env</code> and <code>cat</code>.</li>
</ul>`,
          solution: `kubectl create configmap app-cfg --from-literal=LOG_LEVEL=debug --from-file=app.yaml
kubectl apply -f deploy-with-config.yaml     # env + volume, as in the lesson
kubectl exec deploy/api -- env | grep LOG_LEVEL
kubectl exec deploy/api -- cat /etc/api/app.yaml`,
          lang: 'bash'
        },
        {
          t: 'Create a Secret and consume it safely as a mounted file',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Create the Secret with kubectl (not a YAML file committed to Git).</li>
<li>Mount it read-only with restrictive <code>defaultMode</code> (e.g. 0400) instead of env vars.</li>
<li>Restrict RBAC: only the app's ServiceAccount needs the Secret, and only via the pod — not via API <code>get</code>.</li>
<li>Show that base64 is reversible.</li>
</ul>`,
          solution: `kubectl create secret generic api-db --from-literal=password="$(openssl rand -base64 24)"
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata: { name: secret-demo }
spec:
  containers:
  - name: app
    image: busybox:1.36
    command: ["sh", "-c", "ls -l /etc/db && sleep 3600"]
    volumeMounts: [{ name: db, mountPath: /etc/db, readOnly: true }]
  volumes:
  - name: db
    secret: { secretName: api-db, defaultMode: 0400 }
EOF
kubectl logs secret-demo
kubectl exec secret-demo -- mount | grep /etc/db      # tmpfs`,
          lang: 'bash'
        },
        {
          t: 'ConfigMap was updated but the app still uses the old values',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Env vars are resolved at container start — they never change.</li>
<li>Volume files update after kubelet sync (up to ~1–2 minutes) except with <code>subPath</code>.</li>
<li>Even with updated files, the app must reload them.</li>
<li>Fix: <code>kubectl rollout restart</code>, checksum annotation in the template, Kustomize hash suffix, or a reloader controller.</li>
</ul>`,
          solution: `kubectl get deploy api -o jsonpath='{.spec.template.spec.containers[0].env}' | jq .
kubectl get deploy api -o jsonpath='{.spec.template.spec.containers[0].volumeMounts}' | jq .   # subPath?
kubectl exec deploy/api -- cat /etc/api/config.yaml
kubectl rollout restart deploy/api
# Helm pattern in the pod template:
#   annotations:
#     checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}`,
          lang: 'bash'
        },
        {
          t: 'Provision persistent storage dynamically with a StorageClass and PVC',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Check the default StorageClass and its <code>volumeBindingMode</code>.</li>
<li>Create a PVC; with WaitForFirstConsumer it stays Pending until a pod uses it — that is expected.</li>
<li>Write data, delete the pod, recreate it, confirm the data persists.</li>
<li>Expand the PVC and observe the resize.</li>
</ul>`,
          solution: `kubectl get storageclass
kubectl apply -f pvc.yaml && kubectl get pvc data      # Pending (WaitForFirstConsumer)
kubectl run writer --image=busybox:1.36 --restart=Never \\
  --overrides='{"spec":{"volumes":[{"name":"d","persistentVolumeClaim":{"claimName":"data"}}],"containers":[{"name":"writer","image":"busybox:1.36","command":["sh","-c","echo hello > /d/f && sleep 3600"],"volumeMounts":[{"name":"d","mountPath":"/d"}]}]}}'
kubectl get pvc data                                    # Bound
kubectl get pv -o custom-columns=NAME:.metadata.name,CLAIM:.spec.claimRef.name,POLICY:.spec.persistentVolumeReclaimPolicy
kubectl patch pvc data -p '{"spec":{"resources":{"requests":{"storage":"30Gi"}}}}'
kubectl get pvc data -o jsonpath='{.status.capacity.storage}{"\\n"}'`,
          lang: 'bash'
        },
        {
          t: 'PVC stuck in Pending',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li><code>kubectl describe pvc</code> events tell you which case you are in.</li>
<li>"waiting for first consumer" → normal until a pod is scheduled.</li>
<li>No StorageClass / wrong name / no default class → nothing provisions it; static PVs that do not match size, access mode, class or selector.</li>
<li>Provisioner errors: CSI driver not installed, missing cloud IAM permissions, quota exceeded, unsupported access mode (RWX on a block-disk class).</li>
</ul>`,
          solution: `kubectl describe pvc data | sed -n '/Events/,$p'
kubectl get storageclass                               # does the class exist? is one default?
kubectl get csidrivers
kubectl -n kube-system get pods | grep -i csi
kubectl -n kube-system logs deploy/ebs-csi-controller -c csi-provisioner --tail=30
kubectl get pv                                         # for static provisioning: Available PV that matches?`,
          lang: 'bash'
        },
        {
          t: 'Pod stuck in ContainerCreating with Multi-Attach or volume node affinity errors',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li><strong>Multi-Attach error</strong>: an RWO disk is still attached to another node (old pod on a dead/drained node, or two replicas sharing one RWO PVC). Check <code>VolumeAttachment</code> objects.</li>
<li><strong>volume node affinity conflict</strong>: the PV lives in zone A but the pod can only schedule in zone B (classic with <code>Immediate</code> binding).</li>
<li>Fixes: Recreate strategy or RWOP for single-writer apps, StatefulSets for per-replica volumes, WaitForFirstConsumer, wait for/force detach after confirming the old node is gone.</li>
</ul>`,
          solution: `kubectl describe pod api-xyz | sed -n '/Events/,$p'
kubectl get volumeattachment -o custom-columns=PV:.spec.source.persistentVolumeName,NODE:.spec.nodeName,ATTACHED:.status.attached
kubectl get pv <pv> -o jsonpath='{.spec.nodeAffinity}' | jq .
kubectl get nodes -L topology.kubernetes.io/zone
# A Deployment with one RWO PVC must not surge a second pod onto another node:
kubectl patch deploy api -p '{"spec":{"strategy":{"type":"Recreate","rollingUpdate":null}}}'`,
          lang: 'bash'
        },
        {
          t: 'Snapshot a volume and restore it into a new PVC',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Requires a CSI driver with snapshot support plus the snapshot CRDs and controller.</li>
<li>Create a VolumeSnapshotClass, then a VolumeSnapshot from the PVC; wait for <code>readyToUse: true</code>.</li>
<li>Restore into a new PVC via <code>dataSource</code>; mount and verify data.</li>
<li>For databases, quiesce writes or use native backup tools for consistency.</li>
</ul>`,
          solution: `kubectl get volumesnapshotclass
kubectl apply -f snapshot.yaml
kubectl get volumesnapshot data-snap-2026-10-29 -o jsonpath='{.status.readyToUse}{"\\n"}'
kubectl apply -f pvc-restored.yaml
kubectl get pvc data-restored -w
kubectl get volumesnapshotcontent`,
          lang: 'bash'
        },
        {
          t: 'Enable and verify encryption at rest for Secrets',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul>
<li>Write an <code>EncryptionConfiguration</code>: first provider encrypts new writes; keep <code>identity</code> last to read old plaintext data.</li>
<li>Point kube-apiserver at it with <code>--encryption-provider-config</code> (and mount the file into the static pod) on every control plane node.</li>
<li>Re-write existing Secrets so they get encrypted.</li>
<li>Verify in etcd: the value starts with <code>k8s:enc:</code>. In production use the KMS v2 provider instead of a local key.</li>
</ul>`,
          solution: `cat <<'EOF' | sudo tee /etc/kubernetes/enc/enc.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources: [secrets]
  providers:
  - secretbox:                    # strong local cipher (aescbc is rated weak); production: kms apiVersion v2
      keys:
      - name: key1
        secret: REPLACE_WITH_OUTPUT_OF_head_-c_32_/dev/urandom_|_base64
  - identity: {}
EOF
# kube-apiserver static pod: add --encryption-provider-config=/etc/kubernetes/enc/enc.yaml
# plus a hostPath volume/volumeMount for /etc/kubernetes/enc
kubectl get secrets -A -o json | kubectl replace -f -          # re-encrypt existing data
sudo ETCDCTL_API=3 etcdctl --cacert=/etc/kubernetes/pki/etcd/ca.crt \\
  --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key \\
  get /registry/secrets/default/api-db | hexdump -C | head -3   # shows k8s:enc:secretbox:v1:key1`,
          lang: 'bash'
        },
        {
          t: 'Sync secrets from a cloud secret manager with External Secrets Operator',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul>
<li>Install ESO; authenticate the operator with workload identity (IRSA / Pod Identity / Workload Identity), not static keys.</li>
<li>Define a <code>ClusterSecretStore</code> for the provider and an <code>ExternalSecret</code> per app.</li>
<li>Check <code>status.conditions</code> (SecretSynced) and the generated native Secret.</li>
<li>Rotation: <code>refreshInterval</code> updates the Secret; the app still needs to reload (file watch or rollout).</li>
</ul>`,
          solution: `apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: aws-sm
spec:
  provider:
    aws:
      service: SecretsManager
      region: ap-south-1
      auth:
        jwt:
          serviceAccountRef: { name: external-secrets, namespace: external-secrets }
---
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: api-db
  namespace: shop
spec:
  refreshInterval: 1h
  secretStoreRef: { kind: ClusterSecretStore, name: aws-sm }
  target:
    name: api-db
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef: { key: prod/shop/db, property: password }
# kubectl get externalsecret api-db -n shop   -> STATUS SecretSynced`,
          lang: 'yaml'
        },
        {
          t: 'Design secrets management for a multi-environment GitOps platform',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>Source of truth: cloud secret manager or Vault; Git only holds references (ExternalSecret) or encrypted blobs (SOPS/Sealed Secrets).</li>
<li>Identity: workload identity for pods and for the operator; per-environment stores and IAM boundaries.</li>
<li>Cluster: KMS v2 encryption at rest, RBAC denying human <code>get/list</code> on Secrets in prod, audit logging of Secret access.</li>
<li>Delivery: secrets mounted as files, apps reload on change; rotation runbooks and automated rotation for DB credentials (dynamic secrets).</li>
<li>Detection: secret scanning in CI (gitleaks), alerting on drift.</li>
</ul>`
        },
        {
          t: 'Grow the disks of a StatefulSet whose volumeClaimTemplates are immutable',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Editing <code>volumeClaimTemplates</code> is rejected (it is an immutable StatefulSet field), and the existing PVCs would not change anyway.</li>
<li>Expand each PVC directly: the StorageClass needs <code>allowVolumeExpansion: true</code>; the CSI driver grows the disk and the filesystem is resized online (or on the next mount for some drivers). Watch <code>status.capacity</code> and the <code>FileSystemResizePending</code> condition.</li>
<li>Make future replicas match: delete the StatefulSet with <code>--cascade=orphan</code> (Pods keep running), re-create it with the larger template, and the controller adopts the existing Pods and PVCs.</li>
<li>Shrinking is impossible: migrate to new, smaller PVCs (snapshot/restore or application-level replication). Mind provider limits such as the EBS cool-down of one modification per volume every 6 hours.</li>
</ul>`,
          solution: `kubectl get sc gp3-encrypted -o jsonpath='{.allowVolumeExpansion}{"\\n"}'   # must be true
for i in 0 1 2; do
  kubectl patch pvc data-web-$i -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
done
kubectl get pvc -o custom-columns=PVC:.metadata.name,REQ:.spec.resources.requests.storage,CAP:.status.capacity.storage
kubectl describe pvc data-web-0 | grep -A3 Conditions                       # FileSystemResizePending?
# Update the template for future replicas without restarting Pods
kubectl get sts web -o yaml > web-sts.yaml
kubectl delete sts web --cascade=orphan
# edit web-sts.yaml: volumeClaimTemplates[0].spec.resources.requests.storage: 50Gi
# (remove status, resourceVersion and uid before re-applying)
kubectl apply -f web-sts.yaml
kubectl exec web-0 -- df -h /usr/share/nginx/html`,
          lang: 'bash'
        }
      ],
      interviewFocus: [
        {
          q: 'Are Kubernetes Secrets secure? How would you harden them?',
          a: `<p>Out of the box they are only <strong>access-controlled, base64-encoded objects</strong>, stored unencrypted in etcd. Hardening:</p>
<ul>
<li><strong>Encryption at rest</strong> with the KMS v2 provider (envelope encryption with a cloud KMS key; DEKs cached for performance).</li>
<li><strong>RBAC least privilege</strong>: no wildcard verbs; remember that <code>list</code>/<code>watch</code> returns secret data and that anyone who can create pods in a namespace can mount its Secrets.</li>
<li><strong>Mount as files</strong>, not env vars; <code>automountServiceAccountToken: false</code> where the API is not needed.</li>
<li><strong>External source of truth</strong> (ESO, Secrets Store CSI, Vault) with rotation; avoid static cloud credentials entirely via workload identity.</li>
<li><strong>Audit logging</strong> of secret reads; secret scanning in Git; never print secrets in logs.</li>
</ul>`
        },
        {
          q: 'Explain the PV/PVC binding lifecycle and the role of WaitForFirstConsumer.',
          a: `<p>A PVC is a request; the PV controller either binds it to an existing <code>Available</code> PV that satisfies class, size, access mode and selector, or — with a StorageClass — the CSI <code>external-provisioner</code> creates a new volume and PV. Binding is exclusive and 1:1; the PV records the PVC in <code>claimRef</code>. When the PVC is deleted, the PV becomes <code>Released</code> and the <code>reclaimPolicy</code> applies (Delete destroys the backing disk; Retain keeps it for manual recovery).</p>
<p>With <code>Immediate</code> binding, provisioning happens at PVC creation, possibly in a zone where the pod later cannot be scheduled (resources, affinity, taints) → <em>volume node affinity conflict</em>. <code>WaitForFirstConsumer</code> lets the scheduler pick the node first and passes the chosen topology to the provisioner, so the disk is created where the pod runs.</p>`
        },
        {
          q: 'How would you design storage for a stateful workload that must survive a zone failure?',
          a: `<ul>
<li>Block volumes (EBS, PD) are <strong>zonal</strong>: a pod cannot follow its disk to another zone. So zone resilience must come from <strong>application-level replication</strong> — e.g. a 3-replica database StatefulSet spread across zones (topologySpreadConstraints) with synchronous/asynchronous replication handled by the database or its operator.</li>
<li>Alternatively use regional storage (GCP regional PD, Azure ZRS disks) or a managed database service with multi-AZ failover.</li>
<li>Use <code>WaitForFirstConsumer</code>, <code>reclaimPolicy: Retain</code> for critical data, PDBs to avoid draining multiple replicas at once.</li>
<li><strong>Backups</strong> are separate from replication: scheduled snapshots and logical backups copied to another region (Velero, database-native tools), with tested restores and defined RPO/RTO.</li>
</ul>`
        },
        {
          q: 'ReadWriteOnce vs ReadWriteMany vs ReadWriteOncePod — what do they really mean?',
          a: `<ul>
<li><strong>RWO</strong>: mountable read-write by a single <em>node</em>. Multiple pods on the same node can share it — a surprise for people who expect "one pod".</li>
<li><strong>RWOP</strong> (GA 1.29): only a single <em>pod</em> in the whole cluster — enforces single-writer semantics.</li>
<li><strong>RWX</strong>: many nodes read-write simultaneously. Requires a shared filesystem (NFS, EFS, Filestore, Azure Files, CephFS), usually with lower performance and different consistency semantics; block-disk classes do not support it.</li>
<li><strong>ROX</strong>: many nodes read-only (e.g. a pre-populated dataset from a snapshot).</li>
</ul>
<p>Access modes are a matching constraint and are enforced at attach/mount time by the driver — the important part is choosing a backend that actually supports the semantics your app needs.</p>`
        }
      ],
      quiz: [
        { q: 'What is the maximum size of a ConfigMap or Secret?', a: '1 MiB.' },
        { q: 'Do environment variables from a ConfigMap update when the ConfigMap changes?', a: 'No. Only volume-mounted files (without subPath) are refreshed; env vars require a container restart.' },
        { q: 'Are Secret values encrypted by default?', a: 'No. They are base64-encoded and stored unencrypted in etcd unless encryption at rest is configured.' },
        { q: 'Which volumeBindingMode avoids zone mismatches between a pod and its disk?', a: 'WaitForFirstConsumer.' },
        { q: 'What happens to the underlying disk when a dynamically provisioned PVC with reclaimPolicy Delete is deleted?', a: 'The PV and the backing storage volume are deleted, along with the data.' },
        { q: 'Which access mode guarantees only one pod can use a volume?', a: 'ReadWriteOncePod (RWOP).' },
        { q: 'How do you restore a VolumeSnapshot?', a: 'Create a new PVC whose spec.dataSource references the VolumeSnapshot.' },
        { q: 'What happens when an emptyDir with medium: Memory grows?', a: 'It is tmpfs and its usage counts against the container memory limit, which can lead to OOM kills.' },
        { q: 'What does an image volume mount?', a: 'The content of an OCI image or artifact, read-only, as a Pod volume (volumes[].image) — for example model weights shipped and versioned separately from the app image.' }
      ],
      resources: [
        { title: 'Kubernetes Docs — Secrets', url: 'https://kubernetes.io/docs/concepts/configuration/secret/', type: 'docs' },
        { title: 'Kubernetes Docs — Encrypting Confidential Data at Rest', url: 'https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/', type: 'docs' },
        { title: 'Kubernetes Docs — Persistent Volumes', url: 'https://kubernetes.io/docs/concepts/storage/persistent-volumes/', type: 'docs' },
        { title: 'External Secrets Operator', url: 'https://external-secrets.io/latest/', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────────────────────── Module 7
    {
      n: 7,
      title: 'Scheduling, Resources & Scaling',
      summary: 'How resource requests and limits drive scheduling, QoS, OOM kills and CPU throttling; how the scheduler filters and scores nodes; placement controls (affinity, taints, topology spread, priority, PDBs); and autoscaling at pod level (HPA, VPA, KEDA) and node level (Cluster Autoscaler, Karpenter). This is where reliability and cost meet.',
      topics: [
        {
          title: 'Requests, Limits & QoS Classes',
          def: `<ul>
<li><strong>Requests</strong> are what the <em>scheduler</em> reserves: a pod fits a node only if the sum of requests fits the node's <strong>allocatable</strong> capacity (capacity minus system/kube reserved and eviction thresholds). Actual usage is irrelevant to scheduling. CPU requests also set the cgroup <code>cpu.weight</code> (fair share under contention).</li>
<li><strong>Limits</strong> are enforced at runtime by the kernel: memory limit → <code>memory.max</code> (OOM kill), CPU limit → <code>cpu.max</code> (throttling).</li>
<li>Units: CPU in cores or millicores (<code>250m</code>); memory in bytes with binary suffixes (<code>256Mi</code>; note <code>256M</code> is decimal and <code>256m</code> is milli-bytes — a classic typo).</li>
</ul>
<p><strong>QoS classes</strong> are derived automatically:</p>
<table>
<thead><tr><th>Class</th><th>Rule</th><th>Under node pressure</th></tr></thead>
<tbody>
<tr><td><strong>Guaranteed</strong></td><td>Every container has CPU and memory requests = limits</td><td>Evicted last; lowest OOM score (-997); eligible for exclusive CPUs with the static CPU manager</td></tr>
<tr><td><strong>Burstable</strong></td><td>At least one request or limit set, not Guaranteed</td><td>Middle</td></tr>
<tr><td><strong>BestEffort</strong></td><td>No requests or limits at all</td><td>Evicted first; OOM score 1000</td></tr>
</tbody>
</table>
<p>Governance: <strong>LimitRange</strong> sets per-namespace defaults/min/max for containers (so pods without requests still get some), and <strong>ResourceQuota</strong> caps the total requests/limits/object counts per namespace. <strong>In-place pod resize</strong> (beta and on by default in 1.33, <strong>GA in 1.35</strong>) changes the CPU/memory requests and limits of a <em>running</em> Pod through the <code>resize</code> subresource without recreating it. Per-resource <code>resizePolicy</code> says whether the container must restart (typically CPU <code>NotRequired</code>, memory <code>RestartContainer</code> for runtimes that size heaps at start); the QoS class can never change; progress is reported in the <code>PodResizePending</code> (e.g. reason <code>Infeasible</code> when the node is too small) and <code>PodResizeInProgress</code> conditions. Editing a Deployment's template still triggers a normal rollout — in-place resize acts on Pods, and VPA's <code>InPlaceOrRecreate</code> mode builds on it. <strong>Pod-level resources</strong> (<code>spec.resources</code>, beta 1.34) let you give a Pod one CPU/memory budget shared by all its containers.</p>`,
          interview: 'Requests are for scheduling and fair share; limits are for enforcement. Derive the QoS class of a given pod spec and explain the eviction consequences. Common senior recommendation: memory request = limit; CPU request set, CPU limit often omitted.',
          examples: [
            { label: 'Resources, LimitRange and ResourceQuota', lang: 'yaml', code: `# Guaranteed QoS container
resources:
  requests: { cpu: "500m", memory: 512Mi }
  limits:   { cpu: "500m", memory: 512Mi }
---
apiVersion: v1
kind: LimitRange
metadata: { name: defaults, namespace: shop }
spec:
  limits:
  - type: Container
    defaultRequest: { cpu: 100m, memory: 128Mi }
    default:        { memory: 256Mi }
    max:            { cpu: "2", memory: 2Gi }
---
apiVersion: v1
kind: ResourceQuota
metadata: { name: shop-quota, namespace: shop }
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.memory: 60Gi
    pods: "200"
    persistentvolumeclaims: "20"` },
            { label: 'Check QoS and node allocation', lang: 'bash', code: `kubectl get pod api-abc -o jsonpath='{.status.qosClass}{"\\n"}'
kubectl describe node worker-1 | sed -n '/Allocated resources/,/Events/p'
kubectl top pod -n shop --containers
kubectl describe quota -n shop` },
            { label: 'In-place resize of a running Pod (GA 1.35)', lang: 'bash', code: `# Container spec excerpt: CPU can change live, memory changes restart the container
#   resizePolicy:
#   - { resourceName: cpu,    restartPolicy: NotRequired }
#   - { resourceName: memory, restartPolicy: RestartContainer }
kubectl patch pod api-abc --subresource resize --type merge -p \\
  '{"spec":{"containers":[{"name":"api","resources":{"requests":{"cpu":"800m"},"limits":{"cpu":"800m"}}}]}}'
kubectl get pod api-abc -o jsonpath='{.status.conditions[?(@.type=="PodResizePending")]}'   # Infeasible / Deferred?
kubectl get pod api-abc -o jsonpath='{.status.containerStatuses[0].resources}'               # what is applied now
kubectl get pod api-abc -o jsonpath='{.status.containerStatuses[0].restartCount}'            # unchanged for CPU` }
          ]
        },
        {
          title: 'OOMKilled, CPU Throttling & Evictions',
          def: `<p>Three different mechanisms are often confused:</p>
<ul>
<li><strong>Container OOM kill</strong>: the container exceeds its own memory limit → kernel cgroup OOM killer → <code>lastState.terminated.reason: OOMKilled</code>, exit code <strong>137</strong>, container restarts per <code>restartPolicy</code> (pod is <em>not</em> rescheduled). Causes: leak, limit too low, unbounded caches, large batch loads, memory-backed emptyDir, runtime not limit-aware (set <code>GOMEMLIMIT</code>).</li>
<li><strong>CPU throttling</strong>: the container uses its full CFS quota within a 100 ms period and is paused until the next period. No restart, just latency — p99 spikes while average CPU looks low. Detect with <code>container_cpu_cfs_throttled_periods_total / container_cpu_cfs_periods_total</code>. Fixes: raise or remove the CPU limit, match <code>GOMAXPROCS</code> to the limit (automatic in Go 1.25+).</li>
<li><strong>Node-pressure eviction</strong>: the <em>kubelet</em> proactively evicts pods when the node crosses thresholds (<code>memory.available</code>, <code>nodefs.available</code>, <code>imagefs.available</code>, <code>pid.available</code>). The pod is <code>Failed</code> with reason <code>Evicted</code> and a controller recreates it elsewhere. Ranking: pods whose usage exceeds their requests first, then by priority, then by usage above requests — so BestEffort and over-request Burstable pods go first.</li>
</ul>
<p>If the kubelet is too slow, the kernel's <em>node-level</em> OOM killer fires, choosing victims by <code>oom_score_adj</code> (QoS-based). <strong>API-initiated eviction</strong> (<code>kubectl drain</code>) is different again: it respects PodDisruptionBudgets.</p>`,
          interview: 'Distinguish container OOMKilled (limit), kubelet eviction (node pressure) and throttling (CPU limit) by symptoms and evidence. Throttling is the classic hidden cause of latency in Go/JVM services.',
          examples: [
            { label: 'Find OOM kills, evictions and throttling', lang: 'bash', code: `kubectl get pods -A -o json | jq -r '.items[] | select(.status.containerStatuses[]?.lastState.terminated.reason=="OOMKilled") | .metadata.namespace + "/" + .metadata.name'
kubectl get pods -A --field-selector=status.phase=Failed | grep -i evicted
kubectl get events -A --field-selector reason=Evicted
kubectl describe node worker-1 | grep -E 'MemoryPressure|DiskPressure|PIDPressure'
# PromQL: share of throttled CFS periods per container
# sum by (pod, container) (rate(container_cpu_cfs_throttled_periods_total[5m]))
#   / sum by (pod, container) (rate(container_cpu_cfs_periods_total[5m]))` }
          ]
        },
        {
          title: 'Scheduler Internals, Priority & Preemption',
          def: `<p>The kube-scheduler picks a node for each pending pod using the <strong>scheduling framework</strong> — a pipeline of plugins:</p>
<ol>
<li><strong>Queue sort</strong> (by priority) → <strong>PreFilter</strong>.</li>
<li><strong>Filter</strong> (hard constraints, node is feasible or not): <code>NodeResourcesFit</code> (requests vs allocatable), <code>NodeAffinity</code>/<code>nodeSelector</code>, <code>TaintToleration</code>, <code>PodTopologySpread</code> (DoNotSchedule), <code>InterPodAffinity</code>, <code>VolumeBinding</code>/<code>VolumeZone</code>, <code>NodePorts</code>, <code>NodeUnschedulable</code>.</li>
<li><strong>PostFilter</strong>: if no node fits, try <strong>preemption</strong>.</li>
<li><strong>Score</strong> (soft preferences, 0–100 per plugin, weighted): <code>NodeResourcesFit</code> (LeastAllocated spreads, MostAllocated bin-packs), <code>NodeResourcesBalancedAllocation</code>, <code>ImageLocality</code>, preferred affinities, <code>TaintToleration</code> (PreferNoSchedule).</li>
<li><strong>Reserve → Permit → PreBind</strong> (e.g. provision volumes) → <strong>Bind</strong>.</li>
</ol>
<p>For large clusters it scores only a percentage of feasible nodes (<code>percentageOfNodesToScore</code>). Multiple <strong>profiles</strong> can run in one scheduler (<code>schedulerName</code>), and <code>schedulingGates</code> hold pods unscheduled until an external controller (e.g. a quota/queue system) removes the gate.</p>
<p><strong>PriorityClass</strong> assigns a priority value. If a high-priority pod cannot be placed, the scheduler <strong>preempts</strong> (evicts) lower-priority pods on a node to make room — gracefully, but <em>without</em> fully honouring PDBs (best effort). <code>preemptionPolicy: Never</code> gives queue priority without evicting others. Built-in <code>system-cluster-critical</code>/<code>system-node-critical</code> protect DNS, CNI and similar add-ons.</p>`,
          interview: 'Explain filter vs score with concrete plugin examples, what happens when nothing fits (preemption, then Pending with a FailedScheduling event), and how PriorityClasses protect critical workloads — and can starve batch jobs.',
          examples: [
            { label: 'PriorityClasses for critical and overprovisioning workloads', lang: 'yaml', code: `apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata: { name: business-critical }
value: 100000
globalDefault: false
description: "Customer-facing APIs"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata: { name: overprovisioning }
value: -10                       # placeholder pods, preempted first
preemptionPolicy: Never
description: "Pause pods that reserve headroom for fast scale-up"` }
          ]
        },
        {
          title: 'Affinity, Taints/Tolerations & Topology Spread',
          def: `<ul>
<li><strong>nodeSelector</strong>: simplest — pod only on nodes with matching labels.</li>
<li><strong>Node affinity</strong>: expressive node selection — <code>requiredDuringSchedulingIgnoredDuringExecution</code> (hard) and <code>preferred…</code> (weighted soft), operators <code>In</code>, <code>NotIn</code>, <code>Exists</code>, <code>Gt</code>, <code>Lt</code>.</li>
<li><strong>Pod affinity / anti-affinity</strong>: place relative to other pods within a <code>topologyKey</code> domain (<code>kubernetes.io/hostname</code>, <code>topology.kubernetes.io/zone</code>) — co-locate a cache with its app, or keep replicas apart. Required anti-affinity is expensive at scale and can leave pods Pending.</li>
<li><strong>Taints &amp; tolerations</strong> work the other way round: a node taint <em>repels</em> pods that do not tolerate it. Effects: <code>NoSchedule</code>, <code>PreferNoSchedule</code>, <code>NoExecute</code> (also evicts running pods, optionally after <code>tolerationSeconds</code>). A toleration <em>allows</em> but does not <em>attract</em> — combine with node affinity to dedicate nodes (GPU, spot, tenant pools).</li>
<li><strong>topologySpreadConstraints</strong>: keep replicas evenly distributed — <code>maxSkew</code>, <code>topologyKey</code>, <code>whenUnsatisfiable: DoNotSchedule|ScheduleAnyway</code>, <code>minDomains</code>, and <code>matchLabelKeys: [pod-template-hash]</code> so each rollout revision is spread independently. Preferred over anti-affinity for HA spreading.</li>
</ul>
<p>"IgnoredDuringExecution" means rules are checked only at scheduling; changing node labels later does not move pods (the <strong>descheduler</strong> can rebalance).</p>`,
          interview: 'Taints repel, tolerations permit, affinity attracts — dedicating nodes needs both. Prefer topologySpreadConstraints for zone/node spreading and know the difference between DoNotSchedule and ScheduleAnyway.',
          examples: [
            { label: 'Zone + node spreading and a dedicated GPU pool', lang: 'yaml', code: `spec:
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector: { matchLabels: { app.kubernetes.io/name: api } }
    matchLabelKeys: [pod-template-hash]
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: ScheduleAnyway
    labelSelector: { matchLabels: { app.kubernetes.io/name: api } }
---
# GPU workload: tolerate the pool taint AND require the pool label
# (nodes prepared with: kubectl taint nodes gpu-1 nvidia.com/gpu=present:NoSchedule)
spec:
  tolerations:
  - { key: nvidia.com/gpu, operator: Exists, effect: NoSchedule }
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - { key: node-pool, operator: In, values: [gpu] }
  containers:
  - name: trainer
    image: ghcr.io/acme/trainer:0.9.0
    resources:
      limits: { nvidia.com/gpu: 1 }` }
          ]
        },
        {
          title: 'Pod Autoscaling: HPA, VPA & KEDA',
          def: `<p><strong>HorizontalPodAutoscaler</strong> (<code>autoscaling/v2</code>) adjusts <code>replicas</code>: <code>desired = ceil(current × currentMetric / target)</code>, ignoring changes within a 10% tolerance and taking the <strong>max</strong> across multiple metrics.</p>
<ul>
<li><strong>Resource</strong> metrics (CPU/memory utilization as % of <em>requests</em> — no requests, no scaling) from <strong>metrics-server</strong>.</li>
<li><strong>Pods / Object</strong> custom metrics (RPS, queue lag) and <strong>External</strong> metrics via an adapter (Prometheus Adapter) or <strong>KEDA</strong>, which offers 60+ event sources (Kafka lag, SQS depth, cron) and can scale to <strong>zero</strong>.</li>
<li><code>behavior</code>: per-direction policies and <code>stabilizationWindowSeconds</code> (scale-down default 300 s) to prevent flapping.</li>
<li>Memory is usually a poor HPA signal (Go/JVM rarely give memory back); prefer CPU or request/queue metrics.</li>
</ul>
<p><strong>VerticalPodAutoscaler</strong> (add-on) recommends/sets requests from observed usage. Modes: <code>Off</code> (recommendations only — great for right-sizing), <code>Initial</code>, <code>Recreate</code>, and <code>InPlaceOrRecreate</code> (uses in-place resize). Do not let HPA and VPA act on the <em>same</em> CPU/memory metric — they fight. A common combo: HPA on RPS/CPU + VPA in Off mode for request tuning.</p>`,
          interview: 'Know the HPA formula, that utilization is relative to requests, why stabilization windows exist, when to use KEDA (event-driven, scale to zero), and why HPA + VPA on the same metric conflict.',
          examples: [
            { label: 'HPA with CPU + custom metric and tuned behaviour', lang: 'yaml', code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
  minReplicas: 3
  maxReplicas: 40
  metrics:
  - type: Resource
    resource:
      name: cpu
      target: { type: Utilization, averageUtilization: 70 }
  - type: Pods
    pods:
      metric: { name: http_requests_per_second }
      target: { type: AverageValue, averageValue: "100" }
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      selectPolicy: Max
      policies:
      - { type: Percent, value: 100, periodSeconds: 30 }
      - { type: Pods, value: 5, periodSeconds: 30 }
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - { type: Percent, value: 20, periodSeconds: 60 }` }
          ]
        },
        {
          title: 'Node Autoscaling, PodDisruptionBudgets & Scaling Trade-offs',
          def: `<p>Pod autoscalers create pods; something must create <strong>nodes</strong> for them:</p>
<ul>
<li><strong>Cluster Autoscaler</strong>: watches for pods Pending because they are unschedulable, simulates which <strong>node group</strong> (ASG/MIG/VMSS) could fit them and scales it up; removes nodes that are underutilised and whose pods can move elsewhere. Works with pre-defined instance types per group.</li>
<li><strong>Karpenter</strong> (SIG Autoscaling; AWS, Azure and other providers): group-less — reads pending pods' requirements and launches <strong>right-sized</strong> instances directly from a broad set of types (spot/on-demand, arch), and continuously <strong>consolidates</strong> by replacing/removing under-used nodes. Configured with <code>NodePool</code> + provider <code>NodeClass</code>; disruption budgets limit churn.</li>
</ul>
<p><strong>PodDisruptionBudgets</strong> (<code>minAvailable</code> or <code>maxUnavailable</code>) limit <em>voluntary</em> disruptions issued through the Eviction API — drains, node upgrades, autoscaler consolidation. They do not protect against node crashes or OOM. A PDB that allows zero disruptions (e.g. <code>minAvailable: 100%</code>, or 1 replica with <code>minAvailable: 1</code>) blocks drains forever; <code>unhealthyPodEvictionPolicy: AlwaysAllow</code> lets crash-looping pods be evicted.</p>
<p><strong>Horizontal vs vertical</strong>: horizontal adds resilience and near-linear capacity for stateless services but needs statelessness and a scalable backend; vertical suits stateful/single-instance components and right-sizing but is bounded by node size and (without in-place resize) restarts pods. Scale-up latency stacks: metric delay + HPA sync (15 s) + node provisioning (often 1–3 min) + image pull + app start — mitigate with headroom (overprovisioning pause pods with negative priority), smaller images and fast startup.</p>`,
          interview: 'Compare Cluster Autoscaler and Karpenter, explain how PDBs interact with drains and autoscaler scale-down, and walk through the end-to-end scale-up latency with ways to reduce it.',
          examples: [
            { label: 'PodDisruptionBudget and a Karpenter NodePool', lang: 'yaml', code: `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: api }
spec:
  maxUnavailable: 1
  unhealthyPodEvictionPolicy: AlwaysAllow
  selector:
    matchLabels: { app.kubernetes.io/name: api }
---
apiVersion: karpenter.sh/v1
kind: NodePool
metadata: { name: general }
spec:
  template:
    spec:
      nodeClassRef: { group: karpenter.k8s.aws, kind: EC2NodeClass, name: default }
      requirements:
      - { key: karpenter.sh/capacity-type, operator: In, values: [spot, on-demand] }
      - { key: kubernetes.io/arch, operator: In, values: [amd64, arm64] }
      expireAfter: 720h
  limits: { cpu: "1000" }
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m
    budgets: [{ nodes: "10%" }]` }
          ]
        },
        {
          title: 'GPUs & Dynamic Resource Allocation (DRA)',
          def: `<p>Accelerators (GPUs, TPUs, FPGAs, SmartNICs) are neither CPU nor memory, so Kubernetes needs a way to advertise and allocate them.</p>
<ul>
<li><strong>Device plugins</strong> (the classic model): a DaemonSet such as the NVIDIA device plugin registers an <strong>extended resource</strong> (<code>nvidia.com/gpu</code>) with the kubelet; Pods request whole units in <code>limits</code> and the scheduler only counts them. Simple but opaque: you cannot ask for "a GPU with at least 40 GiB", share one device between Pods, or describe topology.</li>
<li><strong>Dynamic Resource Allocation (DRA)</strong>, GA in 1.34 (<code>resource.k8s.io/v1</code>), does for devices what PV/PVC/StorageClass did for storage:
<ul>
<li>a DRA <strong>driver</strong> publishes each node's devices in <code>ResourceSlice</code> objects, with typed attributes and capacities (model, memory, MIG profile, PCIe root);</li>
<li>admins define <code>DeviceClass</code>es with CEL selectors (for example "driver is gpu.nvidia.com");</li>
<li>workloads request devices through a <code>ResourceClaim</code> (named, can be shared) or a <code>ResourceClaimTemplate</code> (one claim per Pod), optionally filtered with CEL on attributes and capacity, and reference it from <code>spec.resourceClaims</code> and <code>resources.claims</code>;</li>
<li>the <strong>scheduler</strong> allocates concrete devices while picking the node (structured parameters: no driver round trips during scheduling), and the kubelet asks the driver to prepare them (CDI) before the containers start.</li>
</ul></li>
<li>Newer DRA features — prioritised alternatives (<code>firstAvailable</code>: "an H100, otherwise two A100s"), admin access for monitoring agents, partitionable devices for MIG-style slicing, device taints — are beta or alpha, so check your version.</li>
</ul>
<p>Platform concerns around accelerators: dedicate node pools with taints plus node affinity; queue batch and training Jobs with <strong>Kueue</strong> (quotas, fair sharing, all-or-nothing admission for gang-scheduled workloads); share GPUs with time-slicing or MIG for inference; and autoscale GPU nodes with Karpenter or Cluster Autoscaler, which must understand the claims to simulate scheduling. GPU nodes are expensive, so idle detection and bin-packing matter far more than for CPU.</p>`,
          interview: 'Contrast device plugins (opaque integer counts in limits) with DRA (drivers publish ResourceSlices, admins define DeviceClasses, workloads request ResourceClaims with CEL selectors, the scheduler allocates; GA in 1.34). Then explain how you isolate and queue expensive GPU capacity: taints plus affinity, Kueue, MIG or time-slicing, and node autoscaling.',
          examples: [
            { label: 'DRA: DeviceClass, per-Pod claim template with a CEL filter, and the Pod', lang: 'yaml', code: `apiVersion: resource.k8s.io/v1
kind: DeviceClass
metadata: { name: gpu.example.com }
spec:
  selectors:
  - cel: { expression: "device.driver == 'gpu.example.com'" }
---
apiVersion: resource.k8s.io/v1
kind: ResourceClaimTemplate
metadata: { name: big-gpu, namespace: ml }
spec:
  spec:
    devices:
      requests:
      - name: gpu
        exactly:
          deviceClassName: gpu.example.com
          allocationMode: ExactCount
          count: 1
          selectors:
          - cel:
              expression: "device.capacity['gpu.example.com'].memory.compareTo(quantity('40Gi')) >= 0"
---
apiVersion: v1
kind: Pod
metadata: { name: trainer, namespace: ml }
spec:
  resourceClaims:
  - name: gpu
    resourceClaimTemplateName: big-gpu    # a ResourceClaim is generated for this Pod
  containers:
  - name: trainer
    image: ghcr.io/acme/trainer:0.9.0
    resources:
      claims: [{ name: gpu }]` },
            { label: 'Inspect devices and allocations', lang: 'bash', code: `kubectl get deviceclasses
kubectl get resourceslices -o wide            # devices each node's driver advertises
kubectl get resourceclaims -n ml              # generated per Pod: allocated / reserved
kubectl describe resourceclaim -n ml <claim-name>
kubectl describe node gpu-1 | grep -A6 Allocatable   # device-plugin GPUs appear as nvidia.com/gpu` }
          ]
        }
      ],
      problems: [
        {
          t: 'Deploy a stateless app with Deployment + Service + HPA and load-test it',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Install metrics-server (kind needs <code>--kubelet-insecure-tls</code>).</li>
<li>Set CPU <em>requests</em> on the Deployment — HPA utilization is relative to them.</li>
<li>Create an HPA targeting 50% CPU, generate load, watch replicas grow and then shrink after the stabilization window.</li>
</ul>`,
          solution: `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl create deployment php --image=registry.k8s.io/hpa-example
kubectl set resources deploy php --requests=cpu=200m --limits=memory=128Mi
kubectl expose deploy php --port 80
kubectl autoscale deploy php --cpu-percent=50 --min=1 --max=10
kubectl run load --image=busybox:1.36 --restart=Never -- \\
  sh -c "while true; do wget -q -O- http://php; done"
kubectl get hpa php -w            # TARGETS climbs, REPLICAS increases
kubectl delete pod load           # scale-down after ~5 minutes`,
          lang: 'bash'
        },
        {
          t: 'Classify pods into QoS classes and predict eviction order',
          d: 'easy',
          type: 'concept',
          hint: `<ul>
<li>Guaranteed: every container has CPU and memory with requests == limits.</li>
<li>BestEffort: no container sets any request or limit.</li>
<li>Everything else is Burstable.</li>
<li>Eviction under memory pressure: pods using more than their requests first (BestEffort always), then by priority, then by how far above requests.</li>
</ul>`,
          solution: `kubectl get pods -A -o custom-columns=NS:.metadata.namespace,POD:.metadata.name,QOS:.status.qosClass,PRIO:.spec.priority
# Example answers:
#  requests cpu=500m,mem=1Gi limits cpu=500m,mem=1Gi (all containers) -> Guaranteed
#  requests mem=256Mi only                                            -> Burstable
#  no resources at all                                                -> BestEffort (evicted first)`,
          lang: 'bash'
        },
        {
          t: 'Pod stuck in Pending — diagnose scheduling failures',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li><code>kubectl describe pod</code> → <code>FailedScheduling</code> event, e.g. "0/6 nodes are available: 3 Insufficient cpu, 3 node(s) had untolerated taint…".</li>
<li>Insufficient resources: requests too high vs allocatable, quota, or the autoscaler cannot add nodes (max size, no matching instance type).</li>
<li>Constraints: nodeSelector/affinity with no matching nodes, untolerated taints, required anti-affinity, topology spread with DoNotSchedule, PVC in another zone or unbound PVC.</li>
<li>Also: <code>schedulingGates</code> present, or a custom <code>schedulerName</code> that no scheduler serves.</li>
</ul>`,
          solution: `kubectl describe pod api-xyz | sed -n '/Events/,$p'
kubectl get pod api-xyz -o jsonpath='{.spec.nodeSelector}{"\\n"}{.spec.affinity}{"\\n"}{.spec.tolerations}{"\\n"}{.spec.schedulingGates}{"\\n"}'
kubectl get nodes -L node-pool,topology.kubernetes.io/zone
kubectl describe nodes | grep -E '^Name:|Taints:|cpu  |memory  '
kubectl get pvc -n shop
kubectl -n kube-system logs deploy/cluster-autoscaler --tail=50 | grep -i -E 'scale|unschedulable'`,
          lang: 'bash'
        },
        {
          t: 'Container is repeatedly OOMKilled — diagnose and fix',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Confirm: <code>lastState.terminated.reason: OOMKilled</code>, exit 137, restart count increasing.</li>
<li>Compare the limit with real usage over time (<code>kubectl top</code>, <code>container_memory_working_set_bytes</code>): steady growth = leak, spikes = load-related.</li>
<li>Go: profile with pprof heap; set <code>GOMEMLIMIT</code> to ~90% of the limit; bound caches and request body sizes.</li>
<li>Fix the cause or right-size the limit (VPA recommendation); distinguish from kubelet eviction (reason Evicted).</li>
</ul>`,
          solution: `kubectl get pod api-xyz -o jsonpath='{.status.containerStatuses[0].restartCount} {.status.containerStatuses[0].lastState.terminated.reason} {.status.containerStatuses[0].lastState.terminated.exitCode}{"\\n"}'
kubectl get pod api-xyz -o jsonpath='{.spec.containers[0].resources}' | jq .
kubectl top pod api-xyz --containers
kubectl logs api-xyz --previous | tail -30
kubectl port-forward pod/api-xyz 6060:6060 &
go tool pprof -top http://localhost:6060/debug/pprof/heap
kubectl set env deploy/api GOMEMLIMIT=460MiB          # for a 512Mi limit`,
          lang: 'bash'
        },
        {
          t: 'HPA shows unknown targets and never scales',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li><code>kubectl describe hpa</code> conditions: <code>AbleToScale</code>, <code>ScalingActive</code>, <code>ScalingLimited</code>.</li>
<li><code>&lt;unknown&gt;</code> for CPU: metrics-server missing/unhealthy, or containers have no CPU requests.</li>
<li>Custom metrics: the adapter must serve <code>custom.metrics.k8s.io</code>; check the APIService is Available.</li>
<li>Already at maxReplicas, or a GitOps tool keeps resetting <code>replicas</code> (remove replicas from the manifest).</li>
</ul>`,
          solution: `kubectl describe hpa api | sed -n '/Conditions/,$p'
kubectl top pods -l app.kubernetes.io/name=api            # fails => metrics-server problem
kubectl -n kube-system get deploy metrics-server
kubectl get apiservice v1beta1.metrics.k8s.io v1beta1.custom.metrics.k8s.io
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/shop/pods/*/http_requests_per_second" | jq .
kubectl get deploy api -o jsonpath='{.spec.template.spec.containers[*].resources.requests}'`,
          lang: 'bash'
        },
        {
          t: 'Spread replicas across zones and nodes for high availability',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Label-check nodes for <code>topology.kubernetes.io/zone</code>.</li>
<li>Add a zone constraint with DoNotSchedule and a hostname constraint with ScheduleAnyway.</li>
<li>Use <code>matchLabelKeys: [pod-template-hash]</code> so rollouts stay balanced.</li>
<li>Add a PDB so drains never take down more than one replica.</li>
</ul>`,
          solution: `kubectl get nodes -L topology.kubernetes.io/zone
kubectl apply -f api-deployment-with-spread.yaml -f api-pdb.yaml
kubectl get pods -l app.kubernetes.io/name=api -o wide \\
  | awk 'NR>1 {print $7}' | xargs -I{} kubectl get node {} -L topology.kubernetes.io/zone --no-headers \\
  | awk '{print $NF}' | sort | uniq -c        # roughly equal per zone`,
          lang: 'bash'
        },
        {
          t: 'Dedicate a node pool to GPU (or tenant) workloads',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Taint the pool so ordinary pods stay off (<code>NoSchedule</code>).</li>
<li>Label the pool and use required node affinity so GPU pods go only there.</li>
<li>Toleration alone is not enough — it permits but does not attract.</li>
<li>Request the extended resource (<code>nvidia.com/gpu</code>) exposed by the device plugin.</li>
</ul>`,
          solution: `kubectl label nodes gpu-1 gpu-2 node-pool=gpu
kubectl taint nodes gpu-1 gpu-2 nvidia.com/gpu=present:NoSchedule
kubectl apply -f trainer.yaml                 # toleration + nodeAffinity + gpu limit
kubectl get pods -o wide -l app=trainer
kubectl describe node gpu-1 | grep -A3 'Allocatable' | grep nvidia`,
          lang: 'bash'
        },
        {
          t: 'Node drain hangs because of a PodDisruptionBudget',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li><code>kubectl drain</code> uses the Eviction API, which returns 429 when a PDB would be violated, and keeps retrying.</li>
<li>Check <code>ALLOWED DISRUPTIONS</code>: 0 means the budget is already exhausted — too few replicas, pods not Ready, or <code>minAvailable</code> equal to replicas.</li>
<li>Fix the workload (more replicas, healthy pods), use <code>maxUnavailable: 1</code>, set <code>unhealthyPodEvictionPolicy: AlwaysAllow</code>.</li>
<li>Avoid <code>--disable-eviction</code> except in emergencies — it bypasses PDBs.</li>
</ul>`,
          solution: `kubectl drain worker-3 --ignore-daemonsets --delete-emptydir-data --timeout=5m
# error when evicting pods/"api-..." (will retry): Cannot evict pod as it would violate the pod's disruption budget.
kubectl get pdb -A
kubectl describe pdb api -n shop
kubectl get deploy api -n shop -o jsonpath='{.spec.replicas} {.status.readyReplicas}{"\\n"}'
kubectl scale deploy api -n shop --replicas=3       # create headroom, then drain again
kubectl patch pdb api -n shop --type=merge -p '{"spec":{"unhealthyPodEvictionPolicy":"AlwaysAllow"}}'`,
          lang: 'bash'
        },
        {
          t: 'p99 latency spikes while CPU usage looks low — diagnose throttling',
          d: 'hard',
          type: 'debug',
          hint: `<ul>
<li>Averages hide bursts: a multi-threaded process can exhaust its 100 ms CFS quota in a few ms and stall for the rest.</li>
<li>Check throttled periods ratio and <code>cpu.stat</code> (<code>nr_throttled</code>, <code>throttled_usec</code>) in the container cgroup.</li>
<li>Check <code>GOMAXPROCS</code> vs CPU limit (Go &lt; 1.25 uses node CPU count).</li>
<li>Remedies: remove or raise CPU limits (keep requests), set GOMAXPROCS correctly, reduce GC pressure, or use the static CPU manager for Guaranteed pods.</li>
</ul>`,
          solution: `kubectl exec api-xyz -- cat /sys/fs/cgroup/cpu.stat      # nr_periods, nr_throttled, throttled_usec
kubectl exec api-xyz -- cat /sys/fs/cgroup/cpu.max       # e.g. "100000 100000" = 1 CPU
kubectl get pod api-xyz -o jsonpath='{.spec.nodeName}' | xargs kubectl get node -o jsonpath='{.status.capacity.cpu}{"\\n"}'
# PromQL: rate(container_cpu_cfs_throttled_periods_total{pod="api-xyz"}[5m])
#       / rate(container_cpu_cfs_periods_total{pod="api-xyz"}[5m])   -> e.g. 0.4 = 40% throttled
kubectl patch deploy api --type=json -p '[{"op":"remove","path":"/spec/template/spec/containers/0/resources/limits/cpu"}]'`,
          lang: 'bash'
        },
        {
          t: 'Design autoscaling for a spiky, event-driven workload',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>Pick the right signal: queue depth/lag (KEDA) for consumers, RPS or concurrency for APIs; CPU is a lagging indicator.</li>
<li>Pod layer: HPA/KEDA with aggressive scale-up and conservative scale-down behaviour; minReplicas for baseline; scale-to-zero only where cold starts are acceptable.</li>
<li>Node layer: Karpenter/Cluster Autoscaler with diverse instance types, spot for interruptible consumers, overprovisioning pause pods (negative PriorityClass) for headroom.</li>
<li>Reduce startup time: small images, pre-pulled images, fast readiness; PDBs and topology spread for safety.</li>
<li>Guardrails: maxReplicas tied to downstream capacity (DB connections), quotas, cost alerts, load tests that validate the scaling curve.</li>
</ul>`
        },
        {
          t: 'Resize a running Pod in place without a restart',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Needs Kubernetes 1.33+ (GA in 1.35) and kubectl 1.32+ for <code>--subresource resize</code>.</li>
<li>Declare <code>resizePolicy</code> per resource: CPU <code>NotRequired</code>; memory <code>RestartContainer</code> when the runtime sizes its heap once at startup (JVM <code>-Xmx</code>, <code>GOMEMLIMIT</code> read at boot).</li>
<li>Patch the Pod's <code>resize</code> subresource. The QoS class must not change: a Guaranteed Pod has to keep requests equal to limits.</li>
<li>Watch <code>PodResizePending</code> (<code>Infeasible</code>: can never fit on this node; <code>Deferred</code>: may fit later) and <code>PodResizeInProgress</code>; <code>status.containerStatuses[].resources</code> shows what is actually applied, and <code>restartCount</code> stays the same for a CPU change.</li>
<li>Remember the owner: the Deployment template still holds the old values, so the next rollout or a recreated Pod reverts the change — persist it in Git, or let VPA in <code>InPlaceOrRecreate</code> mode manage it.</li>
</ul>`,
          solution: `kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata: { name: resize-demo }
spec:
  containers:
  - name: app
    image: registry.k8s.io/pause:3.10
    resizePolicy:
    - { resourceName: cpu,    restartPolicy: NotRequired }
    - { resourceName: memory, restartPolicy: RestartContainer }
    resources:
      requests: { cpu: 500m, memory: 128Mi }
      limits:   { cpu: 500m, memory: 128Mi }
EOF
kubectl patch pod resize-demo --subresource resize --type merge -p \\
  '{"spec":{"containers":[{"name":"app","resources":{"requests":{"cpu":"1"},"limits":{"cpu":"1"}}}]}}'
kubectl get pod resize-demo -o jsonpath='{.status.containerStatuses[0].resources}{"\\n"}{.status.containerStatuses[0].restartCount}{"\\n"}'
kubectl get pod resize-demo -o json | jq '.status.conditions[] | select(.type | startswith("PodResize"))'
# Ask for more than the node has: PodResizePending/Infeasible, the Pod keeps running at the old size
kubectl patch pod resize-demo --subresource resize --type merge -p \\
  '{"spec":{"containers":[{"name":"app","resources":{"requests":{"cpu":"64"},"limits":{"cpu":"64"}}}]}}'`,
          lang: 'bash'
        }
      ],
      interviewFocus: [
        {
          q: 'Should you set CPU limits? Defend your answer.',
          a: `<p>It depends on the goal, and a strong answer shows both sides:</p>
<ul>
<li><strong>Against CPU limits</strong> (common for latency-sensitive services): CPU is compressible; with accurate <em>requests</em>, CFS weights already guarantee each pod its share under contention, and idle CPU can be borrowed. Limits cause throttling and tail-latency spikes even when the node is idle.</li>
<li><strong>For CPU limits</strong>: multi-tenant fairness and predictability (noisy neighbours, benchmarking), Guaranteed QoS / exclusive cores via the static CPU manager, chargeback, environments where requests are not trustworthy.</li>
</ul>
<p>A typical policy: always set CPU and memory <strong>requests</strong>; set memory <strong>limit = request</strong>; omit CPU limits for services (or set them generously) and monitor throttling; use LimitRanges/quotas to keep teams honest. Make the runtime limit-aware (GOMAXPROCS/GOMEMLIMIT).</p>`
        },
        {
          q: 'Walk through how the scheduler chooses a node for a pod.',
          a: `<ol>
<li>The pod enters the scheduling queue, ordered by priority.</li>
<li><strong>Filtering</strong> removes infeasible nodes: insufficient allocatable resources for the requests, nodeSelector/required affinity mismatch, untolerated taints, unsatisfiable topology spread or pod anti-affinity, volume zone conflicts, port conflicts, cordoned nodes.</li>
<li>If none remain, <strong>PostFilter/preemption</strong> looks for a node where evicting lower-priority pods would make it fit; otherwise the pod stays Pending with a FailedScheduling event (which also triggers the cluster autoscaler).</li>
<li><strong>Scoring</strong> ranks feasible nodes with weighted plugins (resource balance or bin-packing, image locality, preferred affinities, spread).</li>
<li>Highest score wins (ties broken randomly); the scheduler reserves the resources in its cache, runs Permit/PreBind (e.g. volume provisioning), and writes the Binding asynchronously.</li>
</ol>`
        },
        {
          q: 'How do HPA, VPA and the Cluster Autoscaler/Karpenter interact?',
          a: `<ul>
<li><strong>HPA</strong> changes replica count based on metrics relative to requests; new replicas may not fit → Pending.</li>
<li><strong>Cluster Autoscaler/Karpenter</strong> react to Pending (unschedulable) pods by adding nodes, and remove/consolidate under-used nodes — respecting PDBs and annotations like <code>karpenter.sh/do-not-disrupt</code>.</li>
<li><strong>VPA</strong> changes requests; that changes both HPA's utilization math and node packing. Run VPA in <code>Off</code> mode to inform requests, or let it act on resources HPA does not use.</li>
</ul>
<p>Pitfalls: missing requests (HPA blind, autoscaler mis-packs), HPA on memory for runtimes that never release memory (never scales down), and scale-up latency stacking across all three layers. Tune with HPA behaviour, overprovisioning, and realistic load tests.</p>`
        },
        {
          q: 'What is the difference between an OOMKilled container and an evicted pod?',
          a: `<table>
<thead><tr><th></th><th>OOMKilled</th><th>Evicted</th></tr></thead>
<tbody>
<tr><td>Who acts</td><td>Kernel cgroup OOM killer</td><td>kubelet (node-pressure) or Eviction API (drain)</td></tr>
<tr><td>Trigger</td><td>Container exceeds its own memory limit</td><td>Node runs low on memory/disk/PIDs, or voluntary disruption</td></tr>
<tr><td>Result</td><td>Container restarts in the same pod (exit 137)</td><td>Pod terminated (phase Failed, reason Evicted); controller creates a replacement elsewhere</td></tr>
<tr><td>Fix</td><td>Fix leak / raise limit / GOMEMLIMIT</td><td>Set accurate requests, priorities, node reservations, ephemeral-storage limits</td></tr>
</tbody>
</table>`
        },
        {
          q: 'How do you design a workload to survive node upgrades and zone outages?',
          a: `<ul>
<li>At least 3 replicas spread with <strong>topologySpreadConstraints</strong> across zones and nodes.</li>
<li>A <strong>PDB</strong> (<code>maxUnavailable: 1</code>) so drains and consolidations proceed one pod at a time without blocking forever.</li>
<li>Readiness probes and graceful shutdown so evictions do not drop requests.</li>
<li>Capacity headroom: in an N-zone setup, losing one zone must leave enough capacity (overprovision ~1/(N−1)) — or rely on fast node autoscaling plus a PriorityClass for critical services.</li>
<li>Stateful dependencies replicated across zones; zonal storage pinned via WaitForFirstConsumer.</li>
</ul>`
        }
      ],
      quiz: [
        { q: 'What does the scheduler use to decide if a pod fits on a node: requests, limits or actual usage?', a: 'Requests, compared against node allocatable capacity.' },
        { q: 'What makes a pod Guaranteed QoS?', a: 'Every container has CPU and memory requests and limits, with requests equal to limits.' },
        { q: 'What exit code indicates an OOM-killed container?', a: '137 (128 + SIGKILL 9), with reason OOMKilled.' },
        { q: 'What is the HPA scaling formula?', a: 'desiredReplicas = ceil(currentReplicas x currentMetricValue / targetMetricValue), with a default 10% tolerance.' },
        { q: 'What is the default HPA scale-down stabilization window?', a: '300 seconds.' },
        { q: 'Does a toleration force a pod onto a tainted node?', a: 'No. It only permits scheduling there; use node affinity or nodeSelector to attract the pod.' },
        { q: 'Which disruptions do PodDisruptionBudgets protect against?', a: 'Only voluntary disruptions through the Eviction API, such as drains and autoscaler consolidation — not node crashes or OOM kills.' },
        { q: 'How does Karpenter differ from Cluster Autoscaler?', a: 'Karpenter provisions right-sized nodes directly from pending pod requirements without predefined node groups and actively consolidates; Cluster Autoscaler scales predefined node groups.' },
        { q: 'Can you change a running Pod CPU and memory without recreating it?', a: 'Yes, with in-place pod resize (GA in 1.35) through the resize subresource; resizePolicy decides whether a container restart is needed, and the QoS class cannot change.' },
        { q: 'What replaces opaque device-plugin counts for GPUs in modern Kubernetes?', a: 'Dynamic Resource Allocation (GA in 1.34): drivers publish ResourceSlices, admins define DeviceClasses, workloads request devices with ResourceClaims (CEL selectors), and the scheduler allocates them.' }
      ],
      resources: [
        { title: 'Kubernetes Docs — Resource Management for Pods and Containers', url: 'https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/', type: 'docs' },
        { title: 'Kubernetes Docs — Assigning Pods to Nodes', url: 'https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/', type: 'docs' },
        { title: 'Kubernetes Docs — Horizontal Pod Autoscaling', url: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/', type: 'docs' },
        { title: 'Karpenter documentation', url: 'https://karpenter.sh/docs/', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────────────────────── Module 8
    {
      n: 8,
      title: 'Kubernetes Security',
      summary: 'Defense in depth for clusters: API authentication and RBAC, ServiceAccounts and projected tokens, Pod Security Standards and securityContext, admission control and policy engines (ValidatingAdmissionPolicy, Kyverno, Gatekeeper), supply-chain verification with cosign, secrets encryption, network isolation and audit logging. Security questions are standard in senior interviews for platform and backend roles alike.',
      topics: [
        {
          title: 'API Authentication & RBAC Authorization',
          def: `<p>Every API request is <strong>authenticated</strong>, then <strong>authorized</strong>, then passed through <strong>admission</strong>.</p>
<p><strong>Authentication</strong> — Kubernetes has no User objects; identities come from credentials:</p>
<ul>
<li><strong>X.509 client certificates</strong> (CN = user, O = groups) — used by components; poor for humans (cannot be revoked individually).</li>
<li><strong>OIDC tokens</strong> from an IdP (Okta, Entra ID, Google, Dex/Keycloak) — the standard for humans; structured authentication configuration (<code>--authentication-config</code>, GA 1.34) supports multiple issuers, CEL claim validation and mappings, and reloads without an API server restart. Managed clouds map IAM identities instead (EKS access entries, GKE IAM, AKS Entra ID).</li>
<li><strong>ServiceAccount tokens</strong> for workloads; webhook token authentication for custom schemes.</li>
</ul>
<p><strong>Authorization</strong> — usually <code>Node,RBAC</code> modes. RBAC is <strong>additive-only</strong> (no deny rules):</p>
<ul>
<li><strong>Role</strong> (namespaced) / <strong>ClusterRole</strong> (cluster-wide or reusable): rules of apiGroups + resources (+ subresources like <code>pods/log</code>, <code>pods/exec</code>) + verbs (<code>get list watch create update patch delete</code>, plus special <code>bind escalate impersonate</code>).</li>
<li><strong>RoleBinding</strong> grants a Role or ClusterRole <em>within one namespace</em>; <strong>ClusterRoleBinding</strong> grants cluster-wide. Binding a ClusterRole via a RoleBinding is the idiomatic way to reuse a role per namespace.</li>
<li>Subjects: <code>User</code>, <code>Group</code>, <code>ServiceAccount</code>. Bind to IdP <strong>groups</strong>, not individuals.</li>
</ul>
<p>Built-in roles: <code>view</code>, <code>edit</code>, <code>admin</code>, <code>cluster-admin</code> (avoid granting it). Dangerous permissions: <code>secrets</code> get/list/watch, <code>pods/exec</code>, creating pods or workloads (they can mount any Secret and use any ServiceAccount in the namespace), <code>nodes/proxy</code>, <code>impersonate</code>, <code>bind</code>/<code>escalate</code>, and write access to webhook configurations.</p>`,
          interview: 'Explain the authn → authz → admission pipeline, Role vs ClusterRole vs bindings, that RBAC has no deny, and which permissions are equivalent to privilege escalation (create pods, exec, secrets, bind/escalate/impersonate).',
          examples: [
            { label: 'Read-only access for a team in one namespace', lang: 'yaml', code: `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: app-reader, namespace: shop }
rules:
- apiGroups: ["", "apps", "batch"]
  resources: [pods, pods/log, services, deployments, replicasets, jobs, configmaps, events]
  verbs: [get, list, watch]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: shop-devs-read, namespace: shop }
subjects:
- kind: Group
  name: oidc:shop-developers        # group claim from the IdP
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: app-reader
  apiGroup: rbac.authorization.k8s.io` },
            { label: 'Audit effective permissions', lang: 'bash', code: `kubectl auth whoami
kubectl auth can-i --list -n shop
kubectl auth can-i create pods -n shop --as=jane@acme.io --as-group=oidc:shop-developers
kubectl auth can-i get secrets -n shop --as=system:serviceaccount:shop:api
kubectl get clusterrolebindings -o wide | grep cluster-admin` }
          ]
        },
        {
          title: 'ServiceAccounts & Projected Tokens',
          def: `<p>A <strong>ServiceAccount</strong> is the identity of a workload. Each namespace has a <code>default</code> SA; give each app its own SA with only the RBAC it needs.</p>
<ul>
<li><strong>Bound, projected tokens</strong>: the kubelet obtains tokens via the <code>TokenRequest</code> API and mounts them at <code>/var/run/secrets/kubernetes.io/serviceaccount/token</code>. They are JWTs that are <strong>time-limited</strong> (auto-rotated by the kubelet), <strong>audience-bound</strong>, and <strong>bound to the pod</strong> (invalid once the pod is deleted). client-go reloads them automatically.</li>
<li>Legacy long-lived Secret-based tokens are no longer auto-created (1.24) and unused ones are cleaned up. Avoid creating them; use <code>kubectl create token</code> for short-lived tokens.</li>
<li><code>automountServiceAccountToken: false</code> on the SA or pod for workloads that never call the API — a stolen token is then not available to an attacker in the container.</li>
<li><strong>Workload identity federation</strong>: the cluster is an OIDC issuer; cloud IAM trusts projected tokens with a specific audience (EKS IRSA / Pod Identity, GKE Workload Identity, Azure Workload Identity), so pods get short-lived cloud credentials without static keys. Vault's Kubernetes auth works the same way.</li>
</ul>
<p>The SA username format is <code>system:serviceaccount:&lt;namespace&gt;:&lt;name&gt;</code> and groups <code>system:serviceaccounts</code> and <code>system:serviceaccounts:&lt;namespace&gt;</code> — handy in RBAC and audit logs.</p>`,
          interview: 'Explain why projected tokens are safer than legacy secrets (expiry, audience, pod binding), when to disable automounting, and how workload identity eliminates static cloud keys.',
          examples: [
            { label: 'Per-app ServiceAccount with least-privilege RBAC', lang: 'yaml', code: `apiVersion: v1
kind: ServiceAccount
metadata: { name: pod-watcher, namespace: ops }
automountServiceAccountToken: true
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: pod-reader, namespace: ops }
rules:
- apiGroups: [""]
  resources: [pods]
  verbs: [get, list, watch]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: pod-watcher, namespace: ops }
subjects: [{ kind: ServiceAccount, name: pod-watcher, namespace: ops }]
roleRef: { kind: Role, name: pod-reader, apiGroup: rbac.authorization.k8s.io }` },
            { label: 'Inspect a projected token', lang: 'bash', code: `kubectl create token pod-watcher -n ops --duration=10m --audience=vault \\
  | cut -d. -f2 | base64 -d 2>/dev/null | jq '{iss, aud, exp, sub}'
kubectl exec -n ops deploy/watcher -- cat /var/run/secrets/kubernetes.io/serviceaccount/token | cut -c1-20` }
          ]
        },
        {
          title: 'Pod Security Standards & securityContext',
          def: `<p>The <strong>Pod Security Standards</strong> define three levels:</p>
<ul>
<li><strong>privileged</strong>: unrestricted (system components like CNI agents).</li>
<li><strong>baseline</strong>: blocks known privilege escalations — no privileged containers, hostNetwork/hostPID/hostIPC, hostPath, dangerous capabilities, hostPorts.</li>
<li><strong>restricted</strong>: hardened best practice — additionally requires <code>runAsNonRoot</code>, <code>allowPrivilegeEscalation: false</code>, dropping <code>ALL</code> capabilities (only <code>NET_BIND_SERVICE</code> may be added back), a <code>RuntimeDefault</code>/<code>Localhost</code> seccomp profile, and restricted volume types.</li>
</ul>
<p>The built-in <strong>Pod Security Admission</strong> controller (replacement for PodSecurityPolicy, removed in 1.25) enforces them per namespace with labels in three modes: <code>enforce</code> (reject), <code>audit</code> (audit log annotation), <code>warn</code> (client warning). Pin <code>-version</code> to avoid surprises on upgrades.</p>
<p><strong>securityContext</strong> fields at pod and container level: <code>runAsUser/runAsGroup/runAsNonRoot</code>, <code>fsGroup</code> (volume group ownership), <code>readOnlyRootFilesystem</code>, <code>allowPrivilegeEscalation</code>, <code>capabilities</code>, <code>seccompProfile</code>, <code>appArmorProfile</code>, <code>seLinuxOptions</code>, <code>privileged</code>. Add <code>hostUsers: false</code> to run the pod in a <strong>user namespace</strong> (beta, on by default since 1.33; needs Linux 6.3+ and containerd 2.0+ or CRI-O 1.25+), so even root inside maps to an unprivileged host UID and its capabilities are confined to the namespace.</p>`,
          interview: 'Name the three levels and what restricted requires, explain PSA modes and namespace labels, and write a restricted-compliant securityContext from memory.',
          examples: [
            { label: 'Enforce restricted on a namespace (dry-run first)', lang: 'bash', code: `kubectl label --dry-run=server --overwrite ns shop pod-security.kubernetes.io/enforce=restricted
kubectl label --overwrite ns shop \\
  pod-security.kubernetes.io/enforce=restricted \\
  pod-security.kubernetes.io/enforce-version=latest \\
  pod-security.kubernetes.io/warn=restricted \\
  pod-security.kubernetes.io/audit=restricted` },
            { label: 'Restricted-compliant pod spec', lang: 'yaml', code: `spec:
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 65532
    runAsGroup: 65532
    fsGroup: 65532
    seccompProfile: { type: RuntimeDefault }
  containers:
  - name: api
    image: ghcr.io/acme/api@sha256:4f1c0e...    # pinned digest
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities: { drop: [ALL] }
    volumeMounts: [{ name: tmp, mountPath: /tmp }]
  volumes:
  - name: tmp
    emptyDir: {}` }
          ]
        },
        {
          title: 'Admission Control & Policy Engines',
          def: `<p><strong>Admission controllers</strong> intercept requests after authorization and before persistence. Built-ins include <code>NamespaceLifecycle</code>, <code>LimitRanger</code>, <code>ServiceAccount</code>, <code>ResourceQuota</code>, <code>PodSecurity</code>, <code>DefaultStorageClass</code>, <code>NodeRestriction</code>. Extensibility:</p>
<ul>
<li><strong>Mutating</strong> then <strong>validating admission webhooks</strong>: HTTPS callbacks to your service. Powerful, but a down webhook with <code>failurePolicy: Fail</code> can block all matching writes cluster-wide — scope them with selectors, exclude <code>kube-system</code>, set short timeouts, run HA.</li>
<li><strong>ValidatingAdmissionPolicy</strong> (GA 1.30): in-process <strong>CEL</strong> expressions — no webhook to operate, fast, parameterisable through bindings. <strong>MutatingAdmissionPolicy</strong> (alpha 1.32, beta 1.34 — while beta, the <code>admissionregistration.k8s.io/v1beta1</code> API must be enabled on the API server) brings CEL-based mutation in-process too: mutations are expressed as server-side-apply configurations or JSON patches, so defaulting, label and sidecar injection no longer need a webhook.</li>
</ul>
<p><strong>Policy engines</strong> package this for platform teams:</p>
<ul>
<li><strong>Kyverno</strong>: policies as Kubernetes YAML (validate, mutate, generate, verifyImages, cleanup); also newer CEL-based policy types; easy for Kubernetes-native teams.</li>
<li><strong>OPA Gatekeeper</strong>: <code>ConstraintTemplate</code>s written in <strong>Rego</strong> plus <code>Constraint</code>s; general-purpose policy language reused beyond Kubernetes.</li>
</ul>
<p>Typical guardrails: require resource requests/limits, disallow <code>:latest</code> and untrusted registries, require labels/owners, block privileged/hostPath, enforce signed images, restrict Ingress hostnames per namespace. Roll out in audit mode first, then enforce; test policies in CI against your manifests (<code>kyverno test</code>, <code>gator</code>).</p>`,
          interview: 'Know the admission order (mutating before validating), the risk profile of webhooks (failurePolicy, timeouts), when native CEL policies suffice vs Kyverno/Gatekeeper, and an audit-then-enforce rollout plan.',
          examples: [
            { label: 'ValidatingAdmissionPolicy (CEL): no :latest images in prod', lang: 'yaml', code: `apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata: { name: disallow-latest-tag }
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["deployments", "statefulsets", "daemonsets"]
  validations:
  - expression: >-
      object.spec.template.spec.containers.all(c,
        c.image.contains('@sha256:') ||
        (c.image.substring(c.image.lastIndexOf('/') + 1).contains(':') &&
         !c.image.endsWith(':latest')))
    message: "Pin a version tag or digest: untagged images and :latest are not allowed."
    # untagged "nginx" means nginx:latest, so the last path segment must carry a tag
    # (extend the same check to initContainers, and match Pods/Jobs/CronJobs too)
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata: { name: disallow-latest-tag-prod }
spec:
  policyName: disallow-latest-tag
  validationActions: [Deny]
  matchResources:
    namespaceSelector: { matchLabels: { env: prod } }` },
            { label: 'MutatingAdmissionPolicy (CEL, beta): default a missing team label', lang: 'yaml', code: `apiVersion: admissionregistration.k8s.io/v1beta1
kind: MutatingAdmissionPolicy
metadata: { name: default-team-label }
spec:
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE"]
      resources: ["pods"]
  matchConditions:
  - name: no-team-label
    expression: "!has(object.metadata.labels) || !('team' in object.metadata.labels)"
  failurePolicy: Fail
  reinvocationPolicy: Never
  mutations:
  - patchType: ApplyConfiguration            # merged like a server-side apply patch
    applyConfiguration:
      expression: >-
        Object{
          metadata: Object.metadata{
            labels: {"team": "unassigned"}
          }
        }
---
apiVersion: admissionregistration.k8s.io/v1beta1
kind: MutatingAdmissionPolicyBinding
metadata: { name: default-team-label }
spec:
  policyName: default-team-label` }
          ]
        },
        {
          title: 'Image Supply Chain Security',
          def: `<p>The cluster should run <strong>only images you built, scanned and signed</strong>:</p>
<ul>
<li><strong>Trusted sources</strong>: allow-list registries; pin base images and deploy by <strong>digest</strong>; mirror public images internally.</li>
<li><strong>Build integrity</strong>: hermetic CI builds producing <strong>SLSA provenance</strong> (who/what/where built it) and an <strong>SBOM</strong>, attached as OCI attestations.</li>
<li><strong>Signing</strong> with <strong>Sigstore cosign</strong>: keyless signatures tie the image digest to the CI workload identity (e.g. a GitHub Actions workflow on <code>main</code>), recorded in the Rekor transparency log; or key-based signing with KMS-held keys.</li>
<li><strong>Verification at admission</strong>: Kyverno <code>verifyImages</code>, Sigstore <strong>policy-controller</strong>, or Gatekeeper with an external data provider (Ratify) reject unsigned images or wrong signers; Kyverno can also mutate tags to digests so what was verified is what runs.</li>
<li><strong>Continuous scanning</strong> of running images (Trivy Operator, cloud registries) and patch automation (Renovate, rebuilds on base-image updates).</li>
<li><strong>Private registry auth</strong> via <code>imagePullSecrets</code>, node credentials, or kubelet credential providers that can use the Pod's own ServiceAccount token (beta 1.34) so each workload pulls with its own identity instead of a shared node role. A private image cached on a node could historically be started by any Pod scheduled there: use <code>imagePullPolicy: Always</code> for sensitive images in shared clusters, or the newer kubelet option that re-verifies pull credentials for cached images (KEP-2535, alpha in 1.33).</li>
</ul>`,
          interview: 'Describe the end-to-end chain (build → SBOM/provenance → sign → verify at admission → runtime scanning) and why verification must be bound to the digest and to a specific signer identity, not just "is signed".',
          examples: [
            { label: 'Kyverno: only admit keyless-signed images from our release workflow', lang: 'yaml', code: `apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: verify-acme-images }
spec:
  webhookTimeoutSeconds: 30
  rules:
  - name: verify-cosign-keyless
    match:
      any:
      - resources: { kinds: [Pod] }
    verifyImages:
    - imageReferences: ["ghcr.io/acme/*"]
      failureAction: Enforce
      mutateDigest: true
      attestors:
      - entries:
        - keyless:
            subject: "https://github.com/acme/*/.github/workflows/release.yml@refs/heads/main"
            issuer: "https://token.actions.githubusercontent.com"
            rekor: { url: "https://rekor.sigstore.dev" }` }
          ]
        },
        {
          title: 'Defense in Depth: Encryption, Isolation, Audit & Runtime Security',
          def: `<ul>
<li><strong>Control plane</strong>: private API endpoint or IP allow-lists, OIDC for humans with short-lived credentials, no shared admin kubeconfigs, <code>NodeRestriction</code> admission, etcd reachable only by apiservers (mTLS), <strong>Secrets encryption at rest</strong> with KMS v2.</li>
<li><strong>Network</strong>: default-deny NetworkPolicies per namespace, egress control, block the cloud metadata endpoint (169.254.169.254) for pods that do not need it, mTLS east-west with a mesh where required.</li>
<li><strong>Nodes</strong>: minimal OS (Bottlerocket, Talos, COS, Flatcar), automatic patching, no SSH (use <code>kubectl debug node</code>), CIS benchmark checks (kube-bench).</li>
<li><strong>Audit logging</strong>: an audit <code>Policy</code> chooses a level per request — <code>None</code>, <code>Metadata</code> (who/what/when), <code>Request</code>, <code>RequestResponse</code>. Log Secrets only at <code>Metadata</code> (never their content), RBAC changes at <code>RequestResponse</code>; ship logs off-cluster and alert on exec into pods, cluster-admin bindings, and anonymous access.</li>
<li><strong>Runtime detection</strong>: <strong>Falco</strong> or <strong>Tetragon</strong> (eBPF) detect shells in containers, unexpected binaries, sensitive file reads and outbound connections.</li>
</ul>
<p>The 4C model summarises layers — <strong>Cloud, Cluster, Container, Code</strong>; each layer can only be as secure as the one around it.</p>`,
          interview: 'Organise your answer by layer (cloud/cluster/container/code), cite concrete controls per layer, and mention detection (audit logs, Falco) as well as prevention.',
          examples: [
            { label: 'API server audit policy', lang: 'yaml', code: `apiVersion: audit.k8s.io/v1
kind: Policy
omitStages: ["RequestReceived"]
rules:
- level: None                                   # noisy, low-value
  users: ["system:kube-proxy"]
  verbs: ["watch"]
- level: Metadata                               # never log secret payloads
  resources:
  - group: ""
    resources: ["secrets", "configmaps", "serviceaccounts/token"]
- level: RequestResponse                        # full detail for permission changes
  resources:
  - group: "rbac.authorization.k8s.io"
- level: Request
  resources:
  - group: ""
    resources: ["pods/exec", "pods/attach", "pods/portforward"]
- level: Metadata                               # everything else` }
          ]
        }
      ],
      problems: [
        {
          t: 'Give a developer group read-only access to one namespace',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Bind the built-in <code>view</code> ClusterRole with a namespaced RoleBinding (or write a custom Role).</li>
<li>Bind to an IdP group, not individual users.</li>
<li>Note that <code>view</code> deliberately excludes Secrets.</li>
<li>Verify with <code>kubectl auth can-i --as … --as-group …</code>.</li>
</ul>`,
          solution: `kubectl create rolebinding shop-devs-view -n shop --clusterrole=view --group=oidc:shop-developers
kubectl auth can-i list pods -n shop --as=jane --as-group=oidc:shop-developers      # yes
kubectl auth can-i get secrets -n shop --as=jane --as-group=oidc:shop-developers    # no
kubectl auth can-i delete pods -n shop --as=jane --as-group=oidc:shop-developers    # no
kubectl auth can-i list pods -n payments --as=jane --as-group=oidc:shop-developers  # no`,
          lang: 'bash'
        },
        {
          t: 'Create a least-privilege ServiceAccount for an in-cluster Go client',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Dedicated SA, Role with only <code>get/list/watch pods</code>, RoleBinding.</li>
<li>Set <code>serviceAccountName</code> in the pod; client-go <code>rest.InClusterConfig()</code> picks up the projected token.</li>
<li>Verify with <code>kubectl auth can-i --as=system:serviceaccount:ns:name</code>.</li>
</ul>`,
          solution: `kubectl apply -f pod-watcher-rbac.yaml          # SA + Role + RoleBinding from the lesson
kubectl auth can-i watch pods -n ops --as=system:serviceaccount:ops:pod-watcher    # yes
kubectl auth can-i delete pods -n ops --as=system:serviceaccount:ops:pod-watcher   # no
kubectl auth can-i list pods -A --as=system:serviceaccount:ops:pod-watcher         # no
# Go (client-go):
#   cfg, _ := rest.InClusterConfig()
#   cs, _ := kubernetes.NewForConfig(cfg)
#   pods, err := cs.CoreV1().Pods("ops").List(ctx, metav1.ListOptions{})`,
          lang: 'bash'
        },
        {
          t: 'Harden a Deployment to pass the restricted Pod Security level',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Label the namespace with <code>warn=restricted</code> first and read the warnings on apply.</li>
<li>Add runAsNonRoot + numeric UID, drop ALL capabilities, disallow privilege escalation, RuntimeDefault seccomp.</li>
<li>readOnlyRootFilesystem with an emptyDir for <code>/tmp</code>; disable token automount if unused.</li>
<li>Switch to <code>enforce=restricted</code> once clean.</li>
</ul>`,
          solution: `kubectl label ns shop pod-security.kubernetes.io/warn=restricted --overwrite
kubectl apply -f api.yaml
# Warning: would violate PodSecurity "restricted:latest": allowPrivilegeEscalation != false,
#   unrestricted capabilities, runAsNonRoot != true, seccompProfile ...
# -> add the securityContext from the lesson, re-apply until no warnings
kubectl label ns shop pod-security.kubernetes.io/enforce=restricted --overwrite
kubectl exec deploy/api -- id                       # uid=65532
kubectl exec deploy/api -- touch /x || echo "read-only rootfs OK"`,
          lang: 'bash'
        },
        {
          t: 'In-cluster app gets 403 Forbidden from the API server',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Read the error: it names the user (<code>system:serviceaccount:ns:sa</code>), verb, resource, API group and namespace.</li>
<li>Check which SA the pod actually uses (often <code>default</code> by mistake).</li>
<li>Check bindings: Role in the wrong namespace, missing apiGroup (e.g. <code>apps</code> for deployments), a needed subresource (<code>pods/log</code>), or a Role where cluster-wide access needs a ClusterRole.</li>
<li>401 instead of 403 means authentication failed (expired/legacy token, wrong audience).</li>
</ul>`,
          solution: `kubectl logs deploy/watcher -n ops | grep -i forbidden
# pods is forbidden: User "system:serviceaccount:ops:default" cannot list resource "pods" in API group "" in the namespace "ops"
kubectl get deploy watcher -n ops -o jsonpath='{.spec.template.spec.serviceAccountName}{"\\n"}'
kubectl get rolebindings,clusterrolebindings -A -o wide | grep -E 'pod-watcher|ops:default'
kubectl auth can-i list pods -n ops --as=system:serviceaccount:ops:pod-watcher
kubectl patch deploy watcher -n ops -p '{"spec":{"template":{"spec":{"serviceAccountName":"pod-watcher"}}}}'`,
          lang: 'bash'
        },
        {
          t: 'Write admission policies that block :latest images and missing resource requests',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Use a ValidatingAdmissionPolicy with CEL for both rules (or Kyverno <code>validate</code> rules).</li>
<li>Bind it in <code>Warn</code>/<code>Audit</code> mode first, check what would fail, then <code>Deny</code>.</li>
<li>Scope with a namespace selector; exclude system namespaces.</li>
<li>Test with server-side dry-run.</li>
</ul>`,
          solution: `# Add a second validation to the policy from the lesson:
#  - expression: >-
#      object.spec.template.spec.containers.all(c,
#        has(c.resources.requests) && 'cpu' in c.resources.requests && 'memory' in c.resources.requests)
#    message: "All containers must set cpu and memory requests."
kubectl apply -f disallow-latest-policy.yaml
kubectl patch validatingadmissionpolicybinding disallow-latest-tag-prod --type=merge \\
  -p '{"spec":{"validationActions":["Warn","Audit"]}}'          # observe first
kubectl create deploy bad --image=nginx:latest -n prod --dry-run=server
kubectl patch validatingadmissionpolicybinding disallow-latest-tag-prod --type=merge \\
  -p '{"spec":{"validationActions":["Deny"]}}'                  # then enforce`,
          lang: 'bash'
        },
        {
          t: 'Enforce that only signed images from your CI can run',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul>
<li>Sign images in CI with cosign keyless (OIDC identity of the release workflow).</li>
<li>Install Kyverno (or Sigstore policy-controller) and apply a <code>verifyImages</code> policy matching your registry with subject + issuer.</li>
<li><code>mutateDigest: true</code> rewrites tags to verified digests.</li>
<li>Test: a signed image is admitted; an unsigned or differently-signed image is rejected. Exclude system namespaces to avoid lockout.</li>
</ul>`,
          solution: `# CI (GitHub Actions with id-token: write)
cosign sign --yes ghcr.io/acme/api@sha256:<digest>
# Cluster
helm install kyverno kyverno/kyverno -n kyverno --create-namespace
kubectl apply -f verify-acme-images.yaml
kubectl run ok  --image=ghcr.io/acme/api:1.4.2 -n shop          # admitted, image rewritten to @sha256
kubectl run bad --image=ghcr.io/acme/unsigned:dev -n shop       # denied: no matching signatures
kubectl get pod ok -n shop -o jsonpath='{.spec.containers[0].image}{"\\n"}'`,
          lang: 'bash'
        },
        {
          t: 'Detect and investigate a suspicious kubectl exec with audit logs',
          d: 'hard',
          type: 'debug',
          hint: `<ul>
<li>Ensure the audit policy logs <code>pods/exec</code> at Request level and ships logs off-cluster (or use the managed provider's audit log).</li>
<li>Query by <code>objectRef.subresource == "exec"</code>; extract <code>user.username</code>, <code>sourceIPs</code>, target pod and command.</li>
<li>Correlate with RBAC: who granted <code>pods/exec</code>? Check runtime detection (Falco) for what happened inside.</li>
<li>Contain: revoke the binding, rotate credentials/tokens the pod could access, preserve evidence.</li>
</ul>`,
          solution: `# Self-managed: audit log file on control plane nodes
jq -c 'select(.objectRef.subresource=="exec") | {t:.requestReceivedTimestamp, user:.user.username, ip:.sourceIPs, ns:.objectRef.namespace, pod:.objectRef.name, uri:.requestURI}' \\
  /var/log/kubernetes/audit/audit.log | tail
# Who can exec?
kubectl get rolebindings,clusterrolebindings -A -o json | jq -r '.items[] | select(.roleRef.name=="cluster-admin" or .roleRef.name=="admin" or .roleRef.name=="edit") | .metadata.name'
kubectl auth can-i create pods/exec -n prod --as=<user>`,
          lang: 'bash'
        },
        {
          t: 'Find RBAC privilege-escalation paths in a cluster',
          d: 'hard',
          type: 'concept',
          hint: `<ul>
<li><strong>create pods/workloads</strong> in a namespace ⇒ can mount any Secret and run as any ServiceAccount there (including powerful controller SAs).</li>
<li><strong>secrets get/list</strong> ⇒ steal tokens and credentials; <strong>pods/exec</strong> ⇒ act as the pod.</li>
<li><strong>bind/escalate</strong> on roles, <strong>impersonate</strong> users/groups, <strong>serviceaccounts/token create</strong>.</li>
<li><strong>nodes/proxy</strong> ⇒ kubelet API (exec on any pod on the node); write access to <strong>webhook configurations</strong> or CRDs of security tools; creating privileged pods where Pod Security is not enforced ⇒ node root.</li>
<li>Tools: <code>kubectl auth can-i --list</code>, rbac-tool, KubiScan, rakkess.</li>
</ul>`
        },
        {
          t: 'Design a security baseline for a multi-tenant production cluster',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>Identity: OIDC SSO with groups, no static admin credentials, break-glass procedure; per-team namespaces with RoleBindings to <code>edit</code>-like custom roles (no secrets list, no exec in prod).</li>
<li>Workloads: PSA <code>restricted</code> by default; ValidatingAdmissionPolicy/Kyverno guardrails; signed images from trusted registries; per-app SAs, no token automount by default, workload identity for cloud access.</li>
<li>Network: default-deny, metadata endpoint blocked, egress control, mTLS for sensitive paths.</li>
<li>Data: KMS v2 secrets encryption, external secret store, encrypted volumes.</li>
<li>Detection &amp; response: audit logs to SIEM, Falco/Tetragon, CIS benchmark scans, regular upgrades; consider sandboxed runtimes or separate clusters for untrusted tenants.</li>
</ul>`
        },
        {
          t: 'A cluster-admin kubeconfig has leaked — contain and recover',
          d: 'hard',
          type: 'debug',
          hint: `<ul>
<li>Identify the credential type first, because it decides what "revoke" means: an <strong>OIDC token</strong> (revoke the session and refresh token in the IdP; ID tokens expire within minutes), a <strong>ServiceAccount token</strong> (delete the legacy token Secret, or delete and recreate the ServiceAccount — bound tokens die with their Pod or SA), or an <strong>X.509 client certificate</strong> (Kubernetes has no certificate revocation).</li>
<li>For a client certificate, remove every RoleBinding and ClusterRoleBinding granting its CN (user) or O (groups). If a group is <code>system:masters</code>, RBAC cannot restrict it at all: the only fix is rotating the cluster CA (or waiting for expiry). That is why kubeadm's <code>admin.conf</code> uses the <code>kubeadm:cluster-admins</code> group since 1.29 and keeps <code>system:masters</code> only in <code>super-admin.conf</code>, which belongs in a vault.</li>
<li>Scope the blast radius from audit logs: everything that identity or source IP did since the leak — new bindings, tokens requested (<code>serviceaccounts/token</code>), Secrets read, workloads or webhooks created (persistence), exec into Pods.</li>
<li>Eradicate and rotate: delete attacker-created objects, rotate the Secrets they read and the external credentials inside them, review admission webhooks, DaemonSets and CronJobs.</li>
<li>Prevent: OIDC with short-lived tokens for humans, no shared admin kubeconfigs, break-glass credentials in a vault with alerts on use, a private API endpoint, alerts on new cluster-admin bindings.</li>
</ul>`,
          solution: `# 1) What is it? Decode the client certificate from the leaked kubeconfig
yq '.users[0].user."client-certificate-data"' leaked.kubeconfig | base64 -d \\
  | openssl x509 -noout -subject -enddate          # O = system:masters ?  CN = ?
# 2) Cut access granted through RBAC (impossible for system:masters)
kubectl get clusterrolebindings,rolebindings -A -o json \\
  | jq -r '.items[] | select(any(.subjects[]?; .name=="jane" or .name=="ops-admins")) | .kind + " " + .metadata.name'
kubectl delete clusterrolebinding ops-admins-cluster-admin
# 3) Scope: what did the identity do?
jq -c 'select(.user.username=="jane") | {t:.requestReceivedTimestamp, verb, res:.objectRef.resource, ns:.objectRef.namespace, name:.objectRef.name, ip:.sourceIPs}' \\
  /var/log/kubernetes/audit/audit.log | tail -50
# 4) Hunt for persistence created recently
kubectl get clusterrolebindings,mutatingwebhookconfigurations,validatingwebhookconfigurations --sort-by=.metadata.creationTimestamp | tail
kubectl get daemonsets,cronjobs -A --sort-by=.metadata.creationTimestamp | tail
# 5) A system:masters certificate leaked => rotate the cluster CA and re-issue every certificate`,
          lang: 'bash'
        }
      ],
      interviewFocus: [
        {
          q: 'A user can create Deployments in a namespace but cannot read Secrets. Is the namespace\'s data safe from them?',
          a: `<p><strong>No.</strong> Creating pods (directly or via Deployments/Jobs) is effectively read access to every Secret in that namespace: the user can mount any Secret as a volume or env var and print it, or run the pod as any ServiceAccount in the namespace and use its token (and therefore its RBAC rights). With weak Pod Security they can also create privileged/hostPath pods and become root on the node.</p>
<p>Mitigations: treat namespace write access as a trust boundary, keep powerful ServiceAccounts in separate namespaces, enforce <code>restricted</code> Pod Security, use admission policies to restrict which SAs/Secrets workloads may reference, and keep high-value secrets outside the cluster (workload identity, Vault).</p>`
        },
        {
          q: 'Explain the difference between Role, ClusterRole, RoleBinding and ClusterRoleBinding with a practical example.',
          a: `<ul>
<li><strong>Role</strong>: permissions inside one namespace (e.g. read pods in <code>shop</code>).</li>
<li><strong>ClusterRole</strong>: permissions that are cluster-scoped (nodes, PVs, namespaces), non-resource URLs (<code>/healthz</code>), or a <em>reusable template</em> of namespaced permissions.</li>
<li><strong>RoleBinding</strong>: grants a Role <em>or ClusterRole</em> within its own namespace only.</li>
<li><strong>ClusterRoleBinding</strong>: grants a ClusterRole across all namespaces.</li>
</ul>
<p>Example: define a <code>ClusterRole app-operator</code> once, then create a <code>RoleBinding</code> in each team namespace binding it to that team's group — each team gets the same permissions, scoped to its own namespace. Granting the same ClusterRole via a ClusterRoleBinding would give every team access to every namespace.</p>`
        },
        {
          q: 'How do pods securely access cloud services (S3, GCS, Key Vault) without static credentials?',
          a: `<p>With <strong>workload identity federation</strong>. The cluster acts as an OIDC issuer for ServiceAccount tokens. The kubelet projects a short-lived, audience-specific token into the pod; the cloud SDK exchanges it with the cloud STS for temporary credentials of an IAM role/identity whose trust policy only accepts that cluster issuer, namespace and ServiceAccount (<code>sub = system:serviceaccount:shop:api</code>).</p>
<ul>
<li>AWS: IRSA or EKS Pod Identity; GCP: Workload Identity Federation for GKE; Azure: Workload Identity.</li>
<li>Benefits: no long-lived keys in Secrets, automatic rotation, per-app least privilege, auditable in cloud logs.</li>
<li>Also block pod access to the node's instance metadata endpoint so pods cannot borrow the node's role.</li>
</ul>`
        },
        {
          q: 'Kyverno vs OPA Gatekeeper vs ValidatingAdmissionPolicy — how do you choose?',
          a: `<table>
<thead><tr><th></th><th>ValidatingAdmissionPolicy</th><th>Kyverno</th><th>Gatekeeper</th></tr></thead>
<tbody>
<tr><td>Language</td><td>CEL</td><td>YAML (+ CEL, JMESPath)</td><td>Rego</td></tr>
<tr><td>Runs</td><td>In the apiserver, no webhook</td><td>Webhook + controllers</td><td>Webhook + audit controller</td></tr>
<tr><td>Capabilities</td><td>Validation (mutation via MutatingAdmissionPolicy)</td><td>Validate, mutate, generate, image verification, cleanup, reports</td><td>Validate, mutate, audit of existing resources, external data</td></tr>
<tr><td>Best for</td><td>Simple, high-performance guardrails, no extra ops</td><td>Kubernetes-native teams, supply-chain policies</td><td>Organisations standardised on OPA/Rego across systems</td></tr>
</tbody>
</table>
<p>Common pattern: native CEL policies for simple invariants, plus Kyverno or Gatekeeper for mutation, generation, image verification and reporting.</p>`
        },
        {
          q: 'What does the restricted Pod Security Standard prevent, and what breaks when you enforce it?',
          a: `<p>It prevents running as root, privilege escalation via setuid binaries, added Linux capabilities (except NET_BIND_SERVICE), privileged/host namespace access, hostPath and other risky volumes, and unconfined seccomp — closing the most common container-escape paths.</p>
<p>What typically breaks: images whose Dockerfile runs as root or binds port 80 without the capability, apps writing to the root filesystem (if you also add <code>readOnlyRootFilesystem</code>), Helm charts lacking securityContext, and node agents (CNI, CSI, log collectors) that legitimately need privileges — those live in separate namespaces labelled <code>privileged</code>. Roll out with <code>warn</code>/<code>audit</code> first, fix images (non-root USER, high ports), then <code>enforce</code>.</p>`
        }
      ],
      quiz: [
        { q: 'In what order does the API server process a request?', a: 'Authentication, then authorization, then mutating admission, schema validation, validating admission, and finally persistence to etcd.' },
        { q: 'Can RBAC express a deny rule?', a: 'No. RBAC is purely additive; anything not explicitly allowed is denied.' },
        { q: 'What does a RoleBinding that references a ClusterRole grant?', a: 'The ClusterRole permissions, but only within the RoleBinding namespace.' },
        { q: 'What are the three Pod Security Standard levels?', a: 'privileged, baseline and restricted.' },
        { q: 'What are the three Pod Security Admission modes?', a: 'enforce, audit and warn, set as namespace labels.' },
        { q: 'Why are projected ServiceAccount tokens safer than legacy token Secrets?', a: 'They are short-lived and auto-rotated, audience-bound and bound to the pod lifetime, whereas legacy tokens never expired.' },
        { q: 'Which built-in feature allows CEL-based validation without a webhook?', a: 'ValidatingAdmissionPolicy (GA in Kubernetes 1.30).' },
        { q: 'At what audit level should Secrets be logged?', a: 'Metadata, so access is recorded without logging the secret content.' },
        { q: 'Can MutatingAdmissionPolicy replace a mutating webhook?', a: 'For many cases, yes: it mutates in-process with CEL (apply configurations or JSON patches) with no webhook service to operate. It is beta since 1.34, so the v1beta1 API must be enabled.' },
        { q: 'Can you revoke a leaked Kubernetes client certificate?', a: 'Not directly; Kubernetes has no certificate revocation. Remove the RBAC bindings for its user and groups, and if it carries the system:masters group, rotate the cluster CA.' }
      ],
      resources: [
        { title: 'Kubernetes Docs — Using RBAC Authorization', url: 'https://kubernetes.io/docs/reference/access-authn-authz/rbac/', type: 'docs' },
        { title: 'Kubernetes Docs — Pod Security Standards', url: 'https://kubernetes.io/docs/concepts/security/pod-security-standards/', type: 'docs' },
        { title: 'Kubernetes Docs — Validating Admission Policy', url: 'https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/', type: 'docs' },
        { title: 'Kyverno documentation', url: 'https://kyverno.io/docs/', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────────────────────── Module 9
    {
      n: 9,
      title: 'Packaging, Delivery & GitOps',
      summary: 'How manifests get from a Git commit into clusters safely: Helm charts and releases, Kustomize bases and overlays, GitOps with Argo CD and Flux, CI/CD pipeline design, progressive delivery with Argo Rollouts and Flagger, and extending Kubernetes with CRDs and operators. Your QA automation background maps directly onto pipeline quality gates here.',
      topics: [
        {
          title: 'Helm: Charts, Values, Templating & Releases',
          def: `<p><strong>Helm</strong> is the Kubernetes package manager. A <strong>chart</strong> contains <code>Chart.yaml</code> (name, version, appVersion, dependencies), <code>values.yaml</code> (defaults), optional <code>values.schema.json</code> (validates user values), and <code>templates/</code> rendered with <strong>Go templates</strong> + Sprig functions (<code>include</code>, <code>toYaml</code>, <code>nindent</code>, <code>default</code>, <code>required</code>). <code>_helpers.tpl</code> holds named templates such as labels and full names.</p>
<ul>
<li>A <strong>release</strong> is an installed instance of a chart; each upgrade creates a <strong>revision</strong> stored as a Secret in the release namespace (<code>sh.helm.release.v1.&lt;name&gt;.v&lt;N&gt;</code>), enabling <code>helm history</code> and <code>helm rollback</code>.</li>
<li>Values precedence: chart defaults &lt; parent chart values &lt; <code>-f</code> files (in order) &lt; <code>--set</code>.</li>
<li><strong>Hooks</strong> (<code>pre-install</code>, <code>pre-upgrade</code>, <code>post-upgrade</code>…) run Jobs such as migrations; <code>helm test</code> runs test pods.</li>
<li>Charts are distributed as <strong>OCI artifacts</strong> in container registries (<code>helm push … oci://</code>).</li>
<li><strong>Helm 4</strong> (released Nov 2025) uses server-side apply for new installs, adds WebAssembly plugins and renames some flags (e.g. <code>--atomic</code> → <code>--rollback-on-failure</code>).</li>
</ul>
<p>Pitfalls: logic-heavy templates that nobody can review — always inspect <code>helm template</code> output, lint it, and validate it against schemas; whitespace/indentation bugs (<code>nindent</code>); and CRD lifecycle (Helm installs CRDs from <code>crds/</code> but never upgrades or deletes them).</p>`,
          interview: 'Explain chart structure, values precedence, how releases and rollbacks are stored, hooks, and why rendering + validating templates in CI is essential. Know the CRD limitation.',
          examples: [
            { label: 'Template excerpt (templates/deployment.yaml)', lang: 'yaml', code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "api.fullname" . }}
  labels:
    {{- include "api.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "api.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels:
        {{- include "api.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: api
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        resources:
          {{- toYaml .Values.resources | nindent 10 }}` },
            { label: 'Release lifecycle', lang: 'bash', code: `helm lint ./charts/api
helm template api ./charts/api -f values-prod.yaml | kubeconform -strict -summary
helm upgrade --install api ./charts/api -n shop --create-namespace \\
  -f values-prod.yaml --wait --timeout 5m --atomic     # Helm 4: --rollback-on-failure
helm history api -n shop
helm rollback api 3 -n shop
helm package charts/api && helm push api-1.2.0.tgz oci://ghcr.io/acme/charts` }
          ]
        },
        {
          title: 'Kustomize: Bases & Overlays',
          def: `<p><strong>Kustomize</strong> (built into <code>kubectl apply -k</code>) customises plain YAML <strong>without templates</strong>. A <code>kustomization.yaml</code> lists <code>resources</code> and transformations:</p>
<ul>
<li><strong>Base</strong>: environment-agnostic manifests. <strong>Overlays</strong> (<code>overlays/dev</code>, <code>overlays/prod</code>) reference the base and patch it.</li>
<li><code>patches</code>: strategic-merge or JSON 6902 patches targeted by kind/name/labels.</li>
<li><code>images</code>: override image names/tags/<strong>digests</strong> — what CI bumps.</li>
<li><code>namespace</code>, <code>namePrefix</code>/<code>nameSuffix</code>, <code>labels</code>, <code>replicas</code>.</li>
<li><code>configMapGenerator</code>/<code>secretGenerator</code> add a <strong>content hash suffix</strong> to names and rewrite references, so config changes automatically roll pods.</li>
<li><code>components</code>: reusable optional features (e.g. "enable-tracing") mixed into several overlays.</li>
</ul>
<table>
<thead><tr><th></th><th>Helm</th><th>Kustomize</th></tr></thead>
<tbody>
<tr><td>Model</td><td>Templates + values; package manager with releases</td><td>Patches over plain YAML</td></tr>
<tr><td>Strength</td><td>Distributing reusable, configurable software</td><td>Environment variations of your own apps; reviewable diffs</td></tr>
<tr><td>Weakness</td><td>Template complexity</td><td>No packaging/versioning/hooks; complex variation gets verbose</td></tr>
</tbody>
</table>
<p>They combine well: Argo CD and Flux can render a Helm chart and then apply Kustomize patches on top.</p>`,
          interview: 'Contrast Helm and Kustomize and when you would use each (or both). Explain how configMapGenerator hash suffixes trigger rollouts and how CI updates images with kustomize edit set image.',
          examples: [
            { label: 'Prod overlay', lang: 'yaml', code: `# overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: shop
resources:
- ../../base
labels:
- pairs: { environment: prod }
  includeSelectors: false
images:
- name: ghcr.io/acme/api
  digest: sha256:4f1c0e9b...          # bumped by CI
replicas:
- name: api
  count: 6
configMapGenerator:
- name: api-config
  behavior: merge
  literals: [LOG_LEVEL=info, FEATURE_X=false]
patches:
- target: { kind: Deployment, name: api }
  patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/resources/requests/cpu
      value: 500m` },
            { label: 'Build, diff and apply', lang: 'bash', code: `kubectl kustomize overlays/prod | kubeconform -strict -summary
kubectl diff -k overlays/prod
kubectl apply -k overlays/prod --server-side
cd overlays/prod && kustomize edit set image ghcr.io/acme/api=ghcr.io/acme/api@sha256:<digest>` }
          ]
        },
        {
          title: 'GitOps with Argo CD & Flux',
          def: `<p><strong>GitOps</strong> (OpenGitOps principles): the desired state is <strong>declarative</strong>, <strong>versioned and immutable</strong> in Git, <strong>pulled automatically</strong> by agents in the cluster, and <strong>continuously reconciled</strong>. Benefits: audit trail and review for every change, easy rollback (<code>git revert</code>), drift detection, no cluster credentials in CI (pull model).</p>
<p><strong>Argo CD</strong> (CNCF graduated):</p>
<ul>
<li><code>Application</code>: source (Git path, Helm chart, Kustomize) → destination (cluster + namespace); <code>syncPolicy.automated</code> with <code>prune</code> (delete removed resources) and <code>selfHeal</code> (revert manual drift).</li>
<li><code>AppProject</code>: guardrails — allowed repos, destinations and resource kinds per team.</li>
<li><code>ApplicationSet</code>: generate Applications from generators (clusters, Git directories, lists, PRs) — multi-cluster and preview environments.</li>
<li>Sync waves and hooks order resources; health checks understand Deployments, Rollouts and CRDs; <code>ignoreDifferences</code> for fields owned by controllers (e.g. HPA-managed replicas).</li>
</ul>
<p><strong>Flux</strong> (CNCF graduated) is a set of controllers: <code>GitRepository</code>/<code>OCIRepository</code> sources, <code>Kustomization</code> and <code>HelmRelease</code> reconcilers, notification and <strong>image automation</strong> controllers (write new image tags back to Git). Flux is CLI/CRD-centric and lightweight; Argo CD adds a rich UI, SSO and multi-tenant RBAC.</p>
<p>Repo structure: keep application source and environment config separate (config repo or <code>deploy/</code> directory), one directory per environment, promotion by PR.</p>`,
          interview: 'State the four GitOps principles, the push vs pull trade-off, how Argo CD handles drift (selfHeal, prune, ignoreDifferences), and how ApplicationSets scale to many clusters. Compare Argo CD and Flux briefly.',
          examples: [
            { label: 'Argo CD Application with automated sync', lang: 'yaml', code: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shop-api-prod
  namespace: argocd
spec:
  project: shop
  source:
    repoURL: https://github.com/acme/platform-config.git
    targetRevision: main
    path: apps/shop-api/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: shop
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true, ServerSideApply=true, RespectIgnoreDifferences=true]
    retry: { limit: 5, backoff: { duration: 10s, factor: 2, maxDuration: 3m } }
  ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers: [/spec/replicas]        # owned by the HPA` }
          ]
        },
        {
          title: 'CI/CD Pipelines to Kubernetes',
          def: `<p>A robust pipeline separates <strong>CI</strong> (produce a trusted artifact) from <strong>CD</strong> (declare which artifact runs where):</p>
<ol>
<li><strong>Verify</strong>: unit tests (<code>go test -race</code>), lint, SAST, dependency checks (govulncheck).</li>
<li><strong>Build</strong> once: multi-arch image, SBOM and provenance, push by digest.</li>
<li><strong>Gate</strong>: vulnerability scan, signature with cosign, manifest checks — <code>helm lint</code>/<code>helm template</code>, <code>kubeconform</code> (schema), <code>kube-linter</code>/Polaris (best practices), <code>kyverno test</code>/conftest (policy).</li>
<li><strong>Integration tests</strong> in an ephemeral environment: kind/k3d cluster in CI or a preview namespace per PR (ApplicationSet PR generator); contract and smoke tests.</li>
<li><strong>Deploy via Git</strong>: CI updates the image digest in the config repo (PR or commit); Argo CD/Flux syncs; promotion to the next environment is another PR with the <em>same digest</em>.</li>
<li><strong>Verify in production</strong>: <code>rollout status</code>/health, synthetic checks, SLO-based automated analysis (Argo Rollouts), automatic rollback.</li>
</ol>
<p>Security of the pipeline itself: OIDC federation instead of long-lived cloud or registry secrets, pinned third-party actions (by SHA), least-privilege tokens, protected branches and required reviews on the config repo, and no kubeconfig in CI when using pull-based GitOps.</p>`,
          interview: 'Describe build-once-promote-many, where tests and policy checks sit, how CI hands off to GitOps, and how you secure the pipeline (OIDC, pinned actions). Tie it to your QA experience: quality gates, flaky test management, test environments.',
          examples: [
            { label: 'GitHub Actions: test, build, sign, then bump the GitOps repo', lang: 'yaml', code: `name: release
on:
  push:
    branches: [main]
permissions:
  contents: read
  packages: write
  id-token: write          # OIDC for keyless cosign signing
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-go@v5
      with: { go-version-file: go.mod }
    - run: go test -race ./...
    - uses: docker/setup-buildx-action@v3
    - uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: \${{ github.actor }}
        password: \${{ secrets.GITHUB_TOKEN }}
    - id: build
      uses: docker/build-push-action@v6
      with:
        push: true
        tags: ghcr.io/acme/api:\${{ github.sha }}
        sbom: true
        provenance: mode=max
    - uses: sigstore/cosign-installer@v3
    - run: cosign sign --yes ghcr.io/acme/api@\${{ steps.build.outputs.digest }}
    - name: Bump image digest in config repo (dev overlay)
      env:
        GH_TOKEN: \${{ secrets.CONFIG_REPO_TOKEN }}
        DIGEST: \${{ steps.build.outputs.digest }}
      run: |
        git clone https://x-access-token:$GH_TOKEN@github.com/acme/platform-config.git
        cd platform-config/apps/shop-api/overlays/dev
        kustomize edit set image ghcr.io/acme/api=ghcr.io/acme/api@$DIGEST
        git -c user.name=ci -c user.email=ci@acme.io commit -am "shop-api: deploy $DIGEST to dev"
        git push` }
          ]
        },
        {
          title: 'Progressive Delivery: Argo Rollouts & Flagger',
          def: `<p><strong>Progressive delivery</strong> = canary or blue-green releases with <strong>automated analysis and rollback</strong>.</p>
<p><strong>Argo Rollouts</strong> replaces a Deployment with a <code>Rollout</code> resource (same pod template) plus a strategy:</p>
<ul>
<li><strong>canary</strong> <code>steps</code>: <code>setWeight</code>, <code>pause</code> (timed or manual promotion), <code>analysis</code>; optional <code>trafficRouting</code> for precise percentages through Gateway API (plugin), Istio, NGINX, AWS ALB, SMI — otherwise weight is approximated by replica counts.</li>
<li><strong>blueGreen</strong>: <code>activeService</code> and <code>previewService</code>, pre/post-promotion analysis, <code>autoPromotionEnabled</code>, <code>scaleDownDelaySeconds</code> for fast rollback.</li>
<li><code>AnalysisTemplate</code>s query Prometheus, Datadog, New Relic, CloudWatch, a web endpoint or run a Job; failed analysis <strong>aborts and rolls back</strong> automatically.</li>
<li><code>kubectl argo rollouts get rollout … --watch</code>, <code>promote</code>, <code>abort</code>.</li>
</ul>
<p><strong>Flagger</strong> (Flux project) keeps your Deployment and creates the canary machinery itself (primary/canary Deployments and Services), driven by a <code>Canary</code> resource with metric thresholds and webhooks (load tests, acceptance tests), integrating with Istio, Linkerd, Gateway API, NGINX, Contour and others.</p>
<p>Good analysis uses <strong>SLO-style metrics</strong> (error rate, p99 latency) compared against the stable version, with enough traffic for statistical meaning; pair with feature flags for business-logic risk.</p>`,
          interview: 'Explain how an automated canary works end to end: traffic shifting, metric analysis, promotion and automatic rollback. Contrast Argo Rollouts (replaces Deployment) and Flagger (wraps Deployment).',
          examples: [
            { label: 'Argo Rollouts canary with Prometheus analysis', lang: 'yaml', code: `apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: api, namespace: shop }
spec:
  replicas: 10
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      containers:
      - name: api
        image: ghcr.io/acme/api:1.5.0
        ports: [{ containerPort: 8080 }]
  strategy:
    canary:
      canaryService: api-canary
      stableService: api-stable
      trafficRouting:
        plugins:
          argoproj-labs/gatewayAPI: { httpRoute: api, namespace: shop }
      steps:
      - setWeight: 10
      - pause: { duration: 5m }
      - analysis: { templates: [{ templateName: success-rate }] }
      - setWeight: 50
      - pause: { duration: 10m }
      - analysis: { templates: [{ templateName: success-rate }] }
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: { name: success-rate, namespace: shop }
spec:
  metrics:
  - name: success-rate
    interval: 1m
    count: 5
    failureLimit: 1
    successCondition: result[0] >= 0.99
    provider:
      prometheus:
        address: http://prometheus.monitoring:9090
        query: |
          sum(rate(http_requests_total{service="api-canary",code!~"5.."}[2m]))
          /
          sum(rate(http_requests_total{service="api-canary"}[2m]))` }
          ]
        },
        {
          title: 'Operators & Custom Resource Definitions',
          def: `<p>A <strong>CustomResourceDefinition (CRD)</strong> adds a new resource type to the API server — with an OpenAPI v3 <strong>schema</strong>, CEL validation rules (<code>x-kubernetes-validations</code>), a <code>status</code> subresource, printer columns, and multiple versions (with a conversion webhook if schemas differ). On its own, a CRD only stores data.</p>
<p>An <strong>operator</strong> = CRD(s) + a <strong>controller</strong> that reconciles them, encoding human operational knowledge: provisioning, scaling, backups, upgrades, failover. Examples: cert-manager (<code>Certificate</code>), Prometheus Operator (<code>ServiceMonitor</code>), CloudNativePG (<code>Cluster</code>), Strimzi (<code>Kafka</code>), Crossplane (cloud resources as CRDs).</p>
<ul>
<li>Built in Go with <strong>controller-runtime</strong> via <strong>Kubebuilder</strong> or the <strong>Operator SDK</strong>: you implement <code>Reconcile(ctx, req)</code>; the framework provides informers, caches, work queues, leader election, webhooks and metrics.</li>
<li>Design rules: idempotent, level-triggered reconcile; set <code>ownerReferences</code> on created children for garbage collection; use <strong>finalizers</strong> for external cleanup; report progress with <code>status.conditions</code> and <code>observedGeneration</code>; never block in Reconcile — requeue.</li>
<li>Maturity is often described as capability levels: basic install → upgrades → full lifecycle (backup/restore) → deep insights → auto-pilot.</li>
</ul>
<p>Use an operator when you have complex, stateful operational logic; prefer plain manifests/Helm when a Deployment and Service suffice.</p>`,
          interview: 'Explain CRD vs operator, the reconcile loop contract (idempotent, level-triggered, owner references, finalizers, status conditions), and name operators you have used. This bridges to Kubernetes programming in Go.',
          examples: [
            { label: 'A CRD with schema validation and status', lang: 'yaml', code: `apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.platform.acme.io
spec:
  group: platform.acme.io
  scope: Namespaced
  names: { plural: databases, singular: database, kind: Database, shortNames: [db] }
  versions:
  - name: v1alpha1
    served: true
    storage: true
    subresources: { status: {} }
    additionalPrinterColumns:
    - { name: Engine, type: string, jsonPath: .spec.engine }
    - { name: Ready, type: string, jsonPath: '.status.conditions[?(@.type=="Ready")].status' }
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required: [engine, storageGB]
            properties:
              engine: { type: string, enum: [postgres, mysql] }
              storageGB: { type: integer, minimum: 10, maximum: 1000 }
            x-kubernetes-validations:
            - rule: "self.engine != 'mysql' || self.storageGB <= 500"
              message: "mysql databases are limited to 500GB"
          status:
            type: object
            x-kubernetes-preserve-unknown-fields: true` }
          ]
        }
      ],
      problems: [
        {
          t: 'Create dev, staging and prod overlays with Kustomize',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Base: Deployment, Service, ConfigMap generator — no environment specifics.</li>
<li>Overlays: namespace, replicas, image digest, resource patch, extra config literals.</li>
<li>Render each overlay and diff them; apply with <code>kubectl apply -k</code>.</li>
</ul>`,
          solution: `mkdir -p base overlays/{dev,staging,prod}
# base/kustomization.yaml: resources: [deployment.yaml, service.yaml]; configMapGenerator: [...]
# overlays/*/kustomization.yaml: resources: [../../base] + per-env changes (see lesson)
for e in dev staging prod; do kubectl kustomize overlays/$e > /tmp/$e.yaml; done
diff /tmp/staging.yaml /tmp/prod.yaml
kubectl apply -k overlays/dev
kubectl get cm -n shop | grep api-config        # api-config-<hash>`,
          lang: 'bash'
        },
        {
          t: 'Helm or Kustomize? Choose for three scenarios',
          d: 'easy',
          type: 'concept',
          hint: `<ul>
<li>Publishing a reusable product many teams/customers install with different options → Helm chart (versioned, OCI-distributed, values schema).</li>
<li>Your own microservice across dev/staging/prod → Kustomize overlays (plain YAML, readable diffs), or a thin internal Helm chart if you have dozens of similar services.</li>
<li>Third-party chart that needs one extra patch → Helm + Kustomize post-render (Argo CD / Flux support this natively).</li>
<li>Mention review-ability, testing (<code>helm template</code> + kubeconform), and team skills.</li>
</ul>`
        },
        {
          t: 'Package a Go service as a production-ready Helm chart',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Start with <code>helm create</code>; remove what you do not need.</li>
<li>Values: image (repository, tag, digest), resources, probes, autoscaling, securityContext, extra env, ingress/HTTPRoute toggles.</li>
<li>Add <code>values.schema.json</code>, a checksum annotation for config, a PDB, and <code>helm test</code>.</li>
<li>CI: <code>helm lint</code>, <code>helm template | kubeconform</code>, helm-unittest; publish to an OCI registry.</li>
</ul>`,
          solution: `helm create charts/api
# edit values.yaml / templates; add templates/pdb.yaml and values.schema.json
helm lint charts/api --strict
helm template api charts/api -f charts/api/ci/prod-values.yaml | kubeconform -strict -summary -kubernetes-version 1.35.0
helm unittest charts/api                          # helm-unittest plugin
helm upgrade --install api charts/api -n shop --create-namespace --wait
helm test api -n shop
helm package charts/api --version 1.2.0 && helm push api-1.2.0.tgz oci://ghcr.io/acme/charts`,
          lang: 'bash'
        },
        {
          t: 'helm upgrade fails with "another operation (install/upgrade/rollback) is in progress"',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>A previous upgrade was interrupted (CI job cancelled, timeout) and left the release in <code>pending-upgrade</code>/<code>pending-install</code>.</li>
<li>Inspect with <code>helm history</code> and <code>helm status</code>; find the cause (hook Job failing, pods never Ready with <code>--wait</code>).</li>
<li>Recover with <code>helm rollback</code> to the last deployed revision; as a last resort delete the pending release Secret.</li>
<li>Prevent: rollback-on-failure flags, CI concurrency locks per release, adequate timeouts.</li>
</ul>`,
          solution: `helm history api -n shop                  # last revision: pending-upgrade
helm status api -n shop
kubectl get jobs -n shop -l app.kubernetes.io/managed-by=Helm   # failing pre-upgrade hook?
helm rollback api 7 -n shop               # last good "deployed" revision
# last resort:
kubectl get secret -n shop -l owner=helm,name=api
kubectl delete secret -n shop sh.helm.release.v1.api.v8`,
          lang: 'bash'
        },
        {
          t: 'Bootstrap Argo CD and deploy an app with automated sync, prune and self-heal',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Install Argo CD, log in with the CLI, register the repo.</li>
<li>Create an <code>AppProject</code> and an <code>Application</code> pointing at your Kustomize overlay.</li>
<li>Test self-heal: <code>kubectl scale</code> or edit a resource manually and watch it revert.</li>
<li>Test prune: delete a manifest in Git and watch the resource disappear.</li>
</ul>`,
          solution: `kubectl create ns argocd
kubectl apply -n argocd --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo
kubectl -n argocd port-forward svc/argocd-server 8080:443 &
argocd login localhost:8080 --insecure --username admin
kubectl apply -f shop-api-prod-application.yaml
argocd app get shop-api-prod
kubectl -n shop set image deploy/api api=nginx:bad    # manual drift...
argocd app get shop-api-prod --refresh                # ...reverted by selfHeal`,
          lang: 'bash'
        },
        {
          t: 'Argo CD application is permanently OutOfSync',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li><code>argocd app diff</code> shows which fields differ.</li>
<li>Typical causes: fields mutated by controllers or webhooks (HPA replicas, injected sidecars, defaulted fields, CA bundles), generated names, CRD defaults.</li>
<li>Fix with <code>ignoreDifferences</code> (+ <code>RespectIgnoreDifferences=true</code>), remove the field from Git (e.g. <code>replicas</code> when an HPA is used), or use server-side apply diffing.</li>
<li>Also check that two Applications do not manage the same resource (fight via tracking labels).</li>
</ul>`,
          solution: `argocd app diff shop-api-prod
argocd app get shop-api-prod -o json | jq '.status.resources[] | select(.status=="OutOfSync") | {kind,name}'
# Example fix: HPA owns replicas -> remove spec.replicas from the manifest, or:
#   spec.ignoreDifferences: [{ group: apps, kind: Deployment, jsonPointers: [/spec/replicas] }]
#   spec.syncPolicy.syncOptions: [RespectIgnoreDifferences=true, ServerSideApply=true]
kubectl get deploy api -n shop -o jsonpath='{.metadata.annotations}' | jq .   # tracking id: which app owns it?`,
          lang: 'bash'
        },
        {
          t: 'Build a CI pipeline that tests, builds, scans, signs and promotes via GitOps',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>One workflow per merge to main: tests → buildx with SBOM/provenance → scan gate → cosign sign → bump digest in the dev overlay.</li>
<li>Use OIDC (<code>id-token: write</code>) for signing and cloud auth; pin third-party actions by SHA in real repos.</li>
<li>Promotion to staging/prod = PR copying the same digest to the next overlay, with required approvals.</li>
<li>Validate manifests in the config repo's own CI (kubeconform, policy tests).</li>
</ul>`,
          solution: `# See the GitHub Actions example in the "CI/CD Pipelines to Kubernetes" lesson.
# Config repo PR checks:
kubectl kustomize apps/shop-api/overlays/prod | kubeconform -strict -summary
kubectl kustomize apps/shop-api/overlays/prod | kube-linter lint -
kyverno apply policies/ --resource <(kubectl kustomize apps/shop-api/overlays/prod)
# Promotion (dev -> staging) by digest:
DIGEST=$(yq '.images[0].digest' apps/shop-api/overlays/dev/kustomization.yaml)
(cd apps/shop-api/overlays/staging && kustomize edit set image ghcr.io/acme/api=ghcr.io/acme/api@$DIGEST)
gh pr create --title "shop-api: promote $DIGEST to staging" --body "Promotes the dev-verified digest"`,
          lang: 'bash'
        },
        {
          t: 'Define a CRD and describe the operator that reconciles it',
          d: 'medium',
          type: 'concept',
          hint: `<ul>
<li>Design the API: <code>spec</code> (desired: engine, version, storage, backups) and <code>status</code> (conditions, endpoint, observedGeneration).</li>
<li>Validate with OpenAPI schema + CEL rules; enable the status subresource.</li>
<li>Reconcile: ensure StatefulSet/Service/Secret children (with ownerReferences), finalizer for external backup cleanup, update conditions, requeue on transient errors.</li>
<li>Scaffold with Kubebuilder; test with envtest.</li>
</ul>`,
          solution: `kubebuilder init --domain acme.io --repo github.com/acme/db-operator
kubebuilder create api --group platform --version v1alpha1 --kind Database
make manifests && make install          # generates and installs the CRD
make run                                 # runs the controller locally against the cluster
kubectl apply -f config/samples/platform_v1alpha1_database.yaml
kubectl get databases -o wide`,
          lang: 'bash'
        },
        {
          t: 'Implement an automated canary with Argo Rollouts and Prometheus analysis',
          d: 'hard',
          type: 'hands-on',
          hint: `<ul>
<li>Install the Argo Rollouts controller and the kubectl plugin; convert the Deployment to a <code>Rollout</code> (or use <code>workloadRef</code>).</li>
<li>Create stable and canary Services and an HTTPRoute; configure the Gateway API traffic-router plugin.</li>
<li>Write an AnalysisTemplate on success rate (and p99 latency); add analysis steps.</li>
<li>Release a good version (promotes) and a bad one returning 500s (aborts and rolls back automatically).</li>
</ul>`,
          solution: `kubectl create ns argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
kubectl apply -f api-services.yaml -f api-httproute.yaml -f analysis-template.yaml -f api-rollout.yaml
kubectl argo rollouts get rollout api -n shop --watch
kubectl argo rollouts set image api api=ghcr.io/acme/api:1.5.1 -n shop    # good version -> promotes
kubectl argo rollouts set image api api=ghcr.io/acme/api:1.5.2-bad -n shop # analysis fails -> Degraded, rolled back
kubectl get analysisrun -n shop
kubectl argo rollouts abort api -n shop       # manual abort if needed`,
          lang: 'bash'
        },
        {
          t: 'Design environment promotion and multi-cluster delivery with GitOps',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>Repos: app repos (code + chart) and a config repo with <code>apps/&lt;app&gt;/overlays/&lt;env&gt;</code>; or env branches avoided in favour of directories.</li>
<li>Build once; promote the same digest dev → staging → prod by PR, gated by automated tests, policy checks and approvals; Argo CD/Flux image automation for dev only.</li>
<li>Multi-cluster: ApplicationSet with cluster generator (labels like <code>env=prod, region=eu</code>); progressive rollout across clusters/regions (waves) using Argo CD progressive syncs or staged PRs.</li>
<li>Safety: AppProjects per team, sync windows (freeze periods), canary per cluster via Rollouts, automatic rollback, drift alerts.</li>
<li>Secrets via ESO references; platform add-ons managed by the same GitOps tooling ("app of apps").</li>
</ul>`
        },
        {
          t: 'A custom operator hot-loops and hammers the API server — diagnose',
          d: 'hard',
          type: 'debug',
          hint: `<ul>
<li>Symptoms: high controller CPU, <code>controller_runtime_reconcile_total</code> climbing for objects nobody changed, API server 429s, and the custom resource's <code>resourceVersion</code> changing every second.</li>
<li>Classic cause: Reconcile writes <code>status</code> on every pass (often a <code>lastReconcileTime</code> timestamp). The write is a watch event, which triggers the next reconcile. Update status only when it actually changed, and filter events with <code>GenerationChangedPredicate</code> — status writes do not bump <code>metadata.generation</code>.</li>
<li>Non-deterministic desired state: random names, unordered map iteration or server-defaulted fields make every comparison "different". Use server-side apply with a field manager and compare only the fields you own.</li>
<li>Fighting another writer: your operator vs an HPA, a mutating webhook or Argo CD self-heal flipping the same field; <code>managedFields</code> shows who.</li>
<li>Requeue deliberately: return an error (rate-limited backoff) or <code>RequeueAfter</code> for polling, read from the informer cache rather than uncached LIST calls, and watch only children you own (<code>Owns()</code>).</li>
</ul>`,
          solution: `func (r *DatabaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var db platformv1.Database
    if err := r.Get(ctx, req.NamespacedName, &db); err != nil { // served from the informer cache
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }
    before := db.Status.DeepCopy()

    // ... ensure children (server-side apply or CreateOrUpdate), then compute conditions ...
    meta.SetStatusCondition(&db.Status.Conditions, metav1.Condition{
        Type: "Ready", Status: metav1.ConditionTrue, Reason: "Provisioned",
        ObservedGeneration: db.Generation,
    })
    db.Status.ObservedGeneration = db.Generation

    // No timestamps that change every pass; write only real changes
    if !equality.Semantic.DeepEqual(before, &db.Status) {
        if err := r.Status().Update(ctx, &db); err != nil {
            return ctrl.Result{}, err // conflict => rate-limited requeue with fresh state
        }
    }
    return ctrl.Result{}, nil
}

func (r *DatabaseReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&platformv1.Database{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
        Owns(&appsv1.StatefulSet{}). // child changes still trigger reconciles
        Complete(r)
}`,
          lang: 'go'
        }
      ],
      interviewFocus: [
        {
          q: 'What is GitOps and how is it different from running kubectl apply in a CI pipeline?',
          a: `<p>GitOps declares the desired state of every environment in Git, and an agent <strong>inside</strong> the cluster (Argo CD, Flux) continuously <strong>pulls and reconciles</strong> it. Push-based CI runs <code>kubectl apply</code> once from outside.</p>
<ul>
<li><strong>Drift</strong>: GitOps detects and reverts manual changes (selfHeal); push CI does not notice.</li>
<li><strong>Security</strong>: no cluster-admin kubeconfig stored in CI; the cluster only needs read access to Git/registries.</li>
<li><strong>Audit and rollback</strong>: every change is a reviewed commit; rollback is <code>git revert</code>.</li>
<li><strong>Scale</strong>: one repo can drive hundreds of clusters (ApplicationSets).</li>
</ul>
<p>Trade-offs: an extra system to operate, eventual consistency (pipelines must wait for sync/health to report results), and secrets need a separate solution.</p>`
        },
        {
          q: 'How do you promote a release from staging to production safely?',
          a: `<ul>
<li><strong>Build once</strong>: production runs the exact image <em>digest</em> tested in staging — never rebuild per environment.</li>
<li>Promotion is a <strong>Git change</strong> (PR updating the prod overlay) with required reviews, automated checks (render, schema, policy) and possibly change windows.</li>
<li>Rollout in prod is <strong>progressive</strong>: canary with automated analysis on error rate and latency, then region-by-region.</li>
<li>Config differences between environments are explicit in overlays; feature flags decouple deployment from release.</li>
<li><strong>Rollback</strong>: automatic on failed analysis; otherwise revert the PR. Database changes follow expand/contract so the previous version still works.</li>
</ul>`
        },
        {
          q: 'What problems do operators solve, and when would you not write one?',
          a: `<p>Operators automate <strong>day-2 operations</strong> of complex, usually stateful software — provisioning, configuration, scaling, upgrades, backup/restore, failover — by encoding expert runbooks in a reconcile loop driven by a high-level CRD (<code>kind: PostgresCluster</code>).</p>
<p>Do <strong>not</strong> write one when a Deployment + Helm chart suffices, when a mature community operator exists (CloudNativePG, Strimzi, cert-manager), or when the team cannot maintain it — an operator is a privileged, always-running piece of production software with its own upgrade, testing (envtest, e2e) and CRD versioning burden. Writing a buggy operator can damage data faster than a human.</p>`
        },
        {
          q: 'Explain how Argo Rollouts decides to promote or roll back a canary.',
          a: `<p>The Rollout controller executes <code>steps</code> in order. <code>setWeight</code> changes traffic via the configured router (e.g. updates HTTPRoute backend weights) or replica counts; <code>pause</code> waits; <code>analysis</code> creates an <strong>AnalysisRun</strong> from an AnalysisTemplate that queries a metrics provider at an interval. Each measurement is evaluated against <code>successCondition</code>/<code>failureCondition</code>; exceeding <code>failureLimit</code> marks the run Failed.</p>
<p>On failure, the Rollout <strong>aborts</strong>: traffic weight returns to 0% canary, canary pods scale down, and the Rollout is <code>Degraded</code> — the stable ReplicaSet never stopped serving. If all steps pass, the canary becomes the new stable. Background analysis can run across all steps. Quality depends on metrics: use rates comparable between canary and stable, enough traffic, and inconclusive handling.</p>`
        }
      ],
      quiz: [
        { q: 'Where does Helm 3+ store release history?', a: 'As Secrets (by default) in the release namespace, one per revision.' },
        { q: 'What does helm template do?', a: 'Renders the chart templates locally into YAML without installing anything, useful for review and validation in CI.' },
        { q: 'How does a Kustomize configMapGenerator trigger a rollout when config changes?', a: 'It appends a content hash to the ConfigMap name and rewrites references, so the pod template changes.' },
        { q: 'What do prune and selfHeal do in an Argo CD automated sync policy?', a: 'prune deletes resources removed from Git; selfHeal reverts manual changes in the cluster back to the Git state.' },
        { q: 'What Argo CD resource generates many Applications from clusters or directories?', a: 'ApplicationSet.' },
        { q: 'What does a CRD provide without a controller?', a: 'Only a new API type with validation and storage; nothing acts on the objects until a controller reconciles them.' },
        { q: 'How does Flagger differ from Argo Rollouts in how it manages workloads?', a: 'Flagger wraps an existing Deployment and generates primary/canary resources; Argo Rollouts replaces the Deployment with its own Rollout resource.' },
        { q: 'Why deploy by digest when promoting across environments?', a: 'A digest is immutable, guaranteeing every environment runs exactly the artifact that was tested and signed.' }
      ],
      resources: [
        { title: 'Helm documentation', url: 'https://helm.sh/docs/', type: 'docs' },
        { title: 'Kubernetes Docs — Declarative Management with Kustomize', url: 'https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/', type: 'docs' },
        { title: 'Argo CD documentation', url: 'https://argo-cd.readthedocs.io/en/stable/', type: 'docs' },
        { title: 'Argo Rollouts documentation', url: 'https://argoproj.github.io/argo-rollouts/', type: 'docs' }
      ]
    },
    // ───────────────────────────────────────────────────────────── Module 10
    {
      n: 10,
      title: 'Observability & Troubleshooting',
      summary: 'Health probes, logging, metrics, tracing and events — and a systematic method for debugging CrashLoopBackOff, ImagePullBackOff, Pending, OOMKilled, unreachable Services and DNS failures, including kubectl debug with ephemeral containers. Ends with a service mesh primer. Live debugging rounds are common in senior interviews; a calm, systematic method matters as much as the answer.',
      topics: [
        {
          title: 'Liveness, Readiness & Startup Probes',
          def: `<p>The kubelet runs probes per container (<code>httpGet</code>, <code>tcpSocket</code>, <code>exec</code>, <code>grpc</code>), with <code>initialDelaySeconds</code>, <code>periodSeconds</code>, <code>timeoutSeconds</code>, <code>failureThreshold</code>, <code>successThreshold</code>.</p>
<table>
<thead><tr><th>Probe</th><th>Question</th><th>On failure</th></tr></thead>
<tbody>
<tr><td><strong>startup</strong></td><td>Has the app finished starting?</td><td>Other probes wait; after <code>failureThreshold × periodSeconds</code> the container is restarted</td></tr>
<tr><td><strong>readiness</strong></td><td>Can it serve traffic right now?</td><td>Removed from Service endpoints (no restart); gates rollouts</td></tr>
<tr><td><strong>liveness</strong></td><td>Is it irrecoverably stuck (deadlock)?</td><td>Container is <strong>killed and restarted</strong></td></tr>
</tbody>
</table>
<p><strong>Best practices:</strong></p>
<ul>
<li>Liveness must check only the process itself (event loop alive), <strong>never dependencies</strong> — a DB outage would restart every pod and turn a partial outage into a total one.</li>
<li>Readiness may consider critical dependencies and should fail during graceful shutdown (drain).</li>
<li>Use a <strong>startup probe</strong> for slow starters instead of a huge <code>initialDelaySeconds</code> on liveness.</li>
<li>Keep probe handlers cheap; generous timeouts — CPU throttling or GC pauses can make tight timeouts fail and cause restart storms under load.</li>
<li>Not every app needs liveness; a crashed process exits and is restarted anyway.</li>
</ul>`,
          interview: 'Explain the three probes by their consequences (restart vs remove from endpoints), and the classic anti-pattern of liveness probes checking dependencies, which causes cascading restarts.',
          examples: [
            { label: 'Probes for a Go HTTP service', lang: 'yaml', code: `containers:
- name: api
  image: ghcr.io/acme/api:1.5.0
  ports: [{ name: http, containerPort: 8080 }]
  startupProbe:
    httpGet: { path: /healthz, port: http }
    periodSeconds: 5
    failureThreshold: 30          # up to 150 s to start
  livenessProbe:
    httpGet: { path: /healthz, port: http }   # process-only check
    periodSeconds: 10
    timeoutSeconds: 3
    failureThreshold: 3
  readinessProbe:
    httpGet: { path: /readyz, port: http }    # may check DB pool, warm caches, shutdown flag
    periodSeconds: 5
    timeoutSeconds: 2
    failureThreshold: 2` }
          ]
        },
        {
          title: 'Logging Architecture',
          def: `<p>Kubernetes has no built-in log storage. The standard pipeline:</p>
<ol>
<li>Apps write to <strong>stdout/stderr</strong> (12-factor). Prefer <strong>structured JSON</strong> (Go <code>log/slog</code> with a JSON handler) including trace and request IDs.</li>
<li>The container runtime writes them to files under <code>/var/log/pods/&lt;ns&gt;_&lt;pod&gt;_&lt;uid&gt;/&lt;container&gt;/</code> (CRI log format); the kubelet rotates them (<code>containerLogMaxSize</code>, <code>containerLogMaxFiles</code>). <code>kubectl logs</code> reads these files via the kubelet — so only recent, local logs are available, and they vanish with the pod.</li>
<li>A <strong>node-level agent DaemonSet</strong> (Fluent Bit, Vector, OpenTelemetry Collector, Grafana Alloy) tails the files, enriches records with Kubernetes metadata (namespace, pod, labels) and ships them to a backend: <strong>Loki</strong>, Elasticsearch/OpenSearch, CloudWatch, Cloud Logging, Splunk.</li>
</ol>
<p>Alternatives: a sidecar that tails app-written files (legacy apps), or apps pushing directly via OTLP. Control plane logs (apiserver, audit) come from the nodes or the managed provider. Watch cost: log volume and label cardinality (Loki) drive spend — sample debug logs, drop noise at the agent.</p>`,
          interview: 'Describe stdout → node files → DaemonSet agent → backend, why kubectl logs is not a logging solution, and the value of structured logs with correlation IDs.',
          examples: [
            { label: 'kubectl logs essentials', lang: 'bash', code: `kubectl logs deploy/api -c api --since=15m --timestamps
kubectl logs api-7d9c-abcde --previous            # the crashed instance
kubectl logs -l app.kubernetes.io/name=api --prefix --max-log-requests=10 -f
kubectl logs job/migrate
stern 'api-.*' -n shop --since 10m                # multi-pod tailing (stern)` }
          ]
        },
        {
          title: 'Metrics: metrics-server, Prometheus & Grafana',
          def: `<ul>
<li><strong>metrics-server</strong>: scrapes CPU/memory from kubelets (cAdvisor/Summary API) and serves the <code>metrics.k8s.io</code> API for <code>kubectl top</code>, HPA and VPA. In-memory, short window — <em>not</em> a monitoring system.</li>
<li><strong>Prometheus</strong>: pull-based TSDB scraping <code>/metrics</code> endpoints. Typical sources: <strong>node-exporter</strong> (host), <strong>kubelet/cAdvisor</strong> (container usage, throttling, OOM), <strong>kube-state-metrics</strong> (object state: desired vs available replicas, pod phase, restarts), control plane components, and your apps (Go: <code>prometheus/client_golang</code> or OTel metrics).</li>
<li><strong>Prometheus Operator / kube-prometheus-stack</strong>: <code>ServiceMonitor</code>/<code>PodMonitor</code> CRDs define scrape targets declaratively, <code>PrometheusRule</code> holds alerting/recording rules, <strong>Alertmanager</strong> routes and deduplicates alerts; Grafana dashboards on top. For long retention and global views: Thanos, Mimir or a managed service.</li>
</ul>
<p>What to measure: <strong>RED</strong> for services (Rate, Errors, Duration — histograms for latency percentiles) and <strong>USE</strong> for resources (Utilisation, Saturation, Errors). Alert on <strong>symptoms/SLOs</strong> (error budget burn rate), not on every cause. Control <strong>cardinality</strong>: never put user IDs, raw URLs or request IDs in labels.</p>`,
          interview: 'Distinguish metrics-server (autoscaling) from Prometheus (monitoring), name the exporters and what each answers, RED/USE, SLO-based alerting and cardinality pitfalls.',
          examples: [
            { label: 'Scrape an app and alert on its error ratio', lang: 'yaml', code: `apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api
  namespace: shop
  labels: { release: kps }          # matched by the Prometheus serviceMonitorSelector
spec:
  selector:
    matchLabels: { app.kubernetes.io/name: api }
  endpoints:
  - { port: http, path: /metrics, interval: 30s }
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-slo
  namespace: shop
  labels: { release: kps }
spec:
  groups:
  - name: api.slo
    rules:
    - alert: APIHighErrorRatio
      expr: |
        sum(rate(http_requests_total{job="api",code=~"5.."}[5m]))
          / sum(rate(http_requests_total{job="api"}[5m])) > 0.02
      for: 10m
      labels: { severity: page }
      annotations:
        summary: "api 5xx ratio above 2% for 10 minutes"` },
            { label: 'Useful PromQL', lang: 'bash', code: `# p99 latency per route
histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_seconds_bucket{job="api"}[5m])))
# Pods restarting in the last hour
increase(kube_pod_container_status_restarts_total[1h]) > 0
# Deployments not at desired availability
kube_deployment_spec_replicas != kube_deployment_status_replicas_available
# Memory working set vs limit
sum by (pod) (container_memory_working_set_bytes{container!=""}) / sum by (pod) (kube_pod_container_resource_limits{resource="memory"})` }
          ]
        },
        {
          title: 'Tracing with OpenTelemetry & Kubernetes Events',
          def: `<p><strong>Distributed tracing</strong> follows one request across services: a <strong>trace</strong> is a tree of <strong>spans</strong> (operation, timing, attributes, status); context propagates between services in the W3C <code>traceparent</code> header. It answers "where did these 800 ms go?" in a way metrics and logs cannot.</p>
<ul>
<li><strong>OpenTelemetry</strong> (CNCF) is the vendor-neutral standard: SDKs (Go: <code>go.opentelemetry.io/otel</code>, <code>otelhttp</code>/<code>otelgrpc</code> instrumentation), the <strong>OTLP</strong> protocol, and the <strong>Collector</strong> (receive → process: batch, sample, add k8s attributes → export to Tempo, Jaeger, vendors). Deploy collectors as a DaemonSet agent and/or a gateway Deployment; the OTel Operator can auto-instrument some languages.</li>
<li>Correlate signals: put <code>trace_id</code> in logs, and use <strong>exemplars</strong> to jump from a latency histogram bucket to an example trace. Use tail-based sampling at the gateway to keep errors and slow traces.</li>
</ul>
<p><strong>Kubernetes Events</strong> record what controllers and the kubelet did — <code>Scheduled</code>, <code>Pulling</code>, <code>BackOff</code>, <code>FailedScheduling</code>, <code>Unhealthy</code>, <code>FailedMount</code>, <code>Evicted</code>, <code>OOMKilling</code> (node). They are the first place to look when something does not start. They are retained only briefly (default 1 h) and are best-effort — export them (event exporter, OTel <code>k8sobjects</code> receiver) for post-incident analysis.</p>`,
          interview: 'Explain spans, context propagation and the Collector pipeline; how to correlate logs, metrics and traces; and that Events are short-lived but the fastest signal for startup failures.',
          examples: [
            { label: 'Read events effectively', lang: 'bash', code: `kubectl events -n shop --types=Warning
kubectl events -n shop --for pod/api-7d9c-abcde
kubectl get events -A --sort-by=.lastTimestamp | tail -30
kubectl get events -n shop --field-selector reason=FailedScheduling` },
            { label: 'Point a Go service at an OTel Collector', lang: 'yaml', code: `env:
- name: OTEL_SERVICE_NAME
  value: api
- name: OTEL_EXPORTER_OTLP_ENDPOINT
  value: http://otel-collector.observability:4317
- name: POD_NAME
  valueFrom: { fieldRef: { fieldPath: metadata.name } }
- name: OTEL_RESOURCE_ATTRIBUTES
  value: k8s.pod.name=$(POD_NAME),deployment.environment=prod` }
          ]
        },
        {
          title: 'Systematic Troubleshooting & kubectl debug',
          def: `<p>Method: <strong>observe status → read events → read logs (current and <code>--previous</code>) → inspect spec/config → reproduce inside the cluster → fix → verify</strong>. Work from the outside in (or the pod outward), changing one thing at a time.</p>
<table>
<thead><tr><th>Symptom</th><th>Look at</th><th>Common causes</th></tr></thead>
<tbody>
<tr><td><strong>Pending</strong></td><td>describe → FailedScheduling</td><td>Insufficient CPU/memory requests, taints, affinity/spread, PVC unbound/zone, quota</td></tr>
<tr><td><strong>ContainerCreating</strong> (stuck)</td><td>describe events</td><td>Volume mount/attach (Multi-Attach), missing Secret/ConfigMap, CNI failure (no IP)</td></tr>
<tr><td><strong>ImagePullBackOff</strong></td><td>describe events</td><td>Wrong name/tag, private registry auth, rate limits, network/DNS to registry, wrong platform</td></tr>
<tr><td><strong>CreateContainerConfigError</strong></td><td>describe</td><td>Referenced Secret/ConfigMap key missing</td></tr>
<tr><td><strong>CrashLoopBackOff</strong></td><td>logs --previous, exit code</td><td>App error/config (exit 1), bad command (127/126), OOM (137), liveness probe kills, missing permissions</td></tr>
<tr><td><strong>OOMKilled</strong></td><td>lastState, metrics</td><td>Limit too low, leak, runtime not limit-aware</td></tr>
<tr><td><strong>Running but not Ready</strong></td><td>describe → probe failures</td><td>Wrong probe path/port, dependency down, slow start without startupProbe</td></tr>
<tr><td><strong>Service unreachable</strong></td><td>EndpointSlices, pod IP direct</td><td>Selector mismatch, targetPort wrong, app on 127.0.0.1, NetworkPolicy</td></tr>
<tr><td><strong>DNS failures</strong></td><td>resolv.conf, CoreDNS logs</td><td>CoreDNS down/overloaded, egress policy blocks 53, ndots/search issues, upstream DNS</td></tr>
</tbody>
</table>
<p><strong>kubectl debug</strong>: add an <strong>ephemeral container</strong> with tools to a running pod (essential for distroless images); <code>--target</code> shares the app container's process namespace so you can see its processes and <code>/proc/&lt;pid&gt;/root</code>. <code>--copy-to</code> creates a modified copy of the pod (change command or image) to debug crash loops. <code>kubectl debug node/&lt;name&gt;</code> starts a privileged pod on the node with the host filesystem at <code>/host</code>. <code>--profile</code> (<code>general</code>, <code>netadmin</code>, <code>sysadmin</code>…) sets the needed capabilities.</p>`,
          interview: 'Interviewers want a repeatable method, not guesses: status, events, logs, spec, then in-cluster reproduction. Know exit code meanings and the three kubectl debug modes (ephemeral container, pod copy, node).',
          examples: [
            { label: 'First-response commands', lang: 'bash', code: `kubectl get pods -n shop -o wide
kubectl describe pod api-7d9c-abcde -n shop | sed -n '/State:/,/Ready:/p;/Events/,$p'
kubectl logs api-7d9c-abcde -n shop --previous --tail=100
kubectl get pod api-7d9c-abcde -n shop -o jsonpath='{.status.containerStatuses[0].lastState.terminated}' | jq .
kubectl get events -n shop --sort-by=.lastTimestamp | tail -20` },
            { label: 'kubectl debug in its three modes', lang: 'bash', code: `# 1) Ephemeral container in a running distroless pod, sharing the app's process namespace
kubectl debug -it api-7d9c-abcde -n shop --image=nicolaka/netshoot --target=api --profile=netadmin
#    inside: ps aux; ss -lntp; curl localhost:8080/readyz; ls /proc/1/root/etc

# 2) Copy of a crash-looping pod with the command replaced so it stays up
kubectl debug api-7d9c-abcde -n shop -it --copy-to=api-debug --container=api -- sh

# 3) Node debugging: host filesystem mounted at /host
kubectl debug node/worker-2 -it --image=ubuntu --profile=sysadmin
#    inside: chroot /host; journalctl -u kubelet; crictl ps` }
          ]
        },
        {
          title: 'Service Mesh Primer: Istio & Linkerd',
          def: `<p>A <strong>service mesh</strong> moves cross-cutting networking concerns out of application code into the infrastructure layer:</p>
<ul>
<li><strong>Security</strong>: automatic <strong>mTLS</strong> between workloads with identities derived from ServiceAccounts (SPIFFE IDs), and identity-based authorization policies.</li>
<li><strong>Traffic management</strong>: retries, timeouts, circuit breaking, outlier detection, weighted routing for canaries, mirroring, fault injection — per request (L7), which also fixes gRPC load balancing.</li>
<li><strong>Observability</strong>: uniform golden metrics (success rate, latency, RPS) and trace spans for every hop without code changes (apps still need to propagate trace headers).</li>
</ul>
<p>Data-plane models:</p>
<ul>
<li><strong>Sidecar</strong>: a proxy injected into every pod (Envoy for Istio; Linkerd's Rust micro-proxy). Mature, but adds per-pod CPU/memory, latency and upgrade friction (pods must restart to upgrade proxies).</li>
<li><strong>Sidecar-less</strong>: <strong>Istio ambient mode</strong> (GA since Istio 1.24) — a per-node <code>ztunnel</code> for L4 mTLS plus optional per-namespace <strong>waypoint</strong> proxies for L7; Cilium service mesh uses eBPF plus per-node Envoy.</li>
</ul>
<p>Linkerd emphasises simplicity and low overhead; Istio has the richest features. Both increasingly configure routing via the <strong>Gateway API</strong> (GAMMA). Adopt a mesh when you need zero-trust mTLS everywhere, fine-grained traffic control or uniform telemetry across many services — not by default: it is significant operational complexity.</p>`,
          interview: 'Explain what a mesh gives you (mTLS identity, L7 traffic control, telemetry), sidecar vs ambient trade-offs, and when you would not use one. Be ready to compare Istio and Linkerd at a high level.',
          examples: [
            { label: 'Istio: strict mTLS and a retry/timeout policy', lang: 'yaml', code: `apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata: { name: default, namespace: shop }
spec:
  mtls: { mode: STRICT }
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata: { name: payments, namespace: shop }
spec:
  hosts: [payments]
  http:
  - route: [{ destination: { host: payments } }]
    timeout: 2s
    retries: { attempts: 3, perTryTimeout: 500ms, retryOn: "5xx,reset,connect-failure" }` }
          ]
        }
      ],
      problems: [
        {
          t: 'Add liveness, readiness and startup probes to a Go service',
          d: 'easy',
          type: 'hands-on',
          hint: `<ul>
<li>Expose <code>/healthz</code> (process alive) and <code>/readyz</code> (ready to serve; false while starting and during shutdown).</li>
<li>Use a startup probe for initialisation (migrations, cache warm-up).</li>
<li>On SIGTERM, flip readiness to failing, then drain with <code>Server.Shutdown</code>.</li>
<li>Verify with <code>kubectl describe pod</code> and by watching endpoints during a rollout.</li>
</ul>`,
          solution: `// main.go (excerpt)
var ready atomic.Bool

mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
    w.WriteHeader(http.StatusOK) // process is alive; no dependency checks
})
mux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
    if !ready.Load() || db.PingContext(r.Context()) != nil {
        http.Error(w, "not ready", http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
})

go func() { warmUp(); ready.Store(true) }()

<-ctx.Done()            // SIGTERM received
ready.Store(false)      // stop receiving new traffic
time.Sleep(5 * time.Second)
_ = srv.Shutdown(shutdownCtx)`,
          lang: 'go'
        },
        {
          t: 'Pod stuck in ImagePullBackOff — diagnose',
          d: 'easy',
          type: 'debug',
          hint: `<ul>
<li>Read the exact event message: <code>not found</code>/<code>manifest unknown</code> (typo, tag missing), <code>unauthorized</code>/<code>403</code> (credentials), <code>toomanyrequests</code> (rate limit), <code>no match for platform</code> (arch), timeouts (network/DNS/proxy).</li>
<li>Check <code>imagePullSecrets</code> on the pod or its ServiceAccount, and that the Secret is in the same namespace.</li>
<li>Try pulling from the node with <code>crictl pull</code> to separate cluster config from network issues.</li>
</ul>`,
          solution: `kubectl describe pod web-xyz | sed -n '/Events/,$p'
# Failed to pull image "ghcr.io/acme/api:1.5.O": ... not found     <- typo (letter O)
kubectl get pod web-xyz -o jsonpath='{.spec.imagePullSecrets}{" "}{.spec.serviceAccountName}{"\\n"}'
kubectl get secret regcred -o jsonpath='{.data.\\.dockerconfigjson}' | base64 -d | jq '.auths | keys'
crane manifest ghcr.io/acme/api:1.5.0 | jq '.manifests[].platform'    # does the tag/arch exist?
kubectl patch serviceaccount default -p '{"imagePullSecrets":[{"name":"regcred"}]}'
kubectl debug node/worker-1 -it --image=ubuntu -- chroot /host crictl pull ghcr.io/acme/api:1.5.0`,
          lang: 'bash'
        },
        {
          t: 'Pod in CrashLoopBackOff — diagnose',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Get the exit code and reason from <code>lastState.terminated</code>: 1 = app error, 126/127 = command not executable/not found, 137 = SIGKILL (OOM or liveness), 139 = segfault, 143 = SIGTERM.</li>
<li><code>kubectl logs --previous</code> — the current container may have no logs yet.</li>
<li>Check events for <code>Unhealthy</code> liveness failures; compare <code>command/args</code>, env, mounted config with what the app expects.</li>
<li>If logs are empty, use <code>kubectl debug --copy-to</code> with a shell to run the binary manually.</li>
</ul>`,
          solution: `kubectl get pod api-xyz -o jsonpath='{.status.containerStatuses[0].lastState.terminated}' | jq '{reason, exitCode, message}'
kubectl logs api-xyz --previous --tail=50
kubectl describe pod api-xyz | grep -E 'Liveness|Unhealthy|Back-off|Exit Code'
kubectl get pod api-xyz -o jsonpath='{.spec.containers[0].command}{" "}{.spec.containers[0].args}{"\\n"}'
kubectl debug api-xyz -it --copy-to=api-dbg --container=api --image=busybox:1.36 -- sh
#   inside the copy: inspect env, mounted config, try running the binary by hand
kubectl delete pod api-dbg`,
          lang: 'bash'
        },
        {
          t: 'Debug a distroless container with an ephemeral container',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li><code>kubectl exec … sh</code> fails: no shell in distroless.</li>
<li>Attach an ephemeral debug container with <code>--target</code> to share the process namespace.</li>
<li>Inspect the app's processes, open sockets, files via <code>/proc/&lt;pid&gt;/root</code>, and make requests over localhost.</li>
<li>Ephemeral containers cannot be removed and have no resources/probes — they stay until the pod is deleted.</li>
</ul>`,
          solution: `kubectl exec -it api-xyz -- sh            # OCI runtime exec failed: "sh": executable file not found
kubectl debug -it api-xyz --image=nicolaka/netshoot --target=api --profile=general
# inside the ephemeral container:
ps aux                                   # the /api process is visible
ss -lntp
curl -s localhost:8080/readyz
cat /proc/$(pgrep -f /api)/root/etc/os-release
kubectl get pod api-xyz -o jsonpath='{.spec.ephemeralContainers[*].name}{"\\n"}'`,
          lang: 'bash'
        },
        {
          t: 'Liveness probe causes restart storms under load',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Symptom: restarts spike exactly during traffic peaks; events show <code>Liveness probe failed: context deadline exceeded</code>.</li>
<li>Causes: tight <code>timeoutSeconds</code> (1 s default) with CPU throttling or GC pauses; liveness endpoint doing DB checks; probe served by the same saturated worker pool.</li>
<li>Restarting overloaded pods sheds capacity and makes the overload worse (cascading failure).</li>
<li>Fix: liveness checks only process health, larger timeout/failureThreshold, separate cheap handler, fix CPU limits, rely on readiness to shed load.</li>
</ul>`,
          solution: `kubectl get events -n shop --field-selector reason=Unhealthy --sort-by=.lastTimestamp | tail
kubectl get pods -n shop -l app.kubernetes.io/name=api -o custom-columns=POD:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount
kubectl get deploy api -n shop -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}' | jq .
# Fix (patch excerpt):
#   livenessProbe:  { httpGet: { path: /healthz, port: http }, timeoutSeconds: 3, periodSeconds: 10, failureThreshold: 6 }
#   readinessProbe: { httpGet: { path: /readyz,  port: http }, timeoutSeconds: 2, periodSeconds: 5 }`,
          lang: 'bash'
        },
        {
          t: 'Gateway returns 503 for a route — trace from the edge to the pod',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Check the HTTPRoute status: <code>Accepted</code> (attached to the Gateway listener?) and <code>ResolvedRefs</code> (backend Service/port exist, ReferenceGrant if cross-namespace).</li>
<li>Check the Service has ready endpoints; curl the Service from inside the cluster, then a pod IP directly.</li>
<li>Check NetworkPolicies allow traffic from the gateway namespace to the pods.</li>
<li>Read the gateway proxy logs (Envoy response flags like <code>UH</code> = no healthy upstream).</li>
</ul>`,
          solution: `kubectl get httproute shop -n shop -o jsonpath='{.status.parents[*].conditions}' | jq '.[] | {type, status, reason, message}'
kubectl get gateway public-gw -n infra -o jsonpath='{.status.listeners[*].attachedRoutes}{"\\n"}'
kubectl get endpointslices -n shop -l kubernetes.io/service-name=shop-api
kubectl run c -n shop --rm -it --image=curlimages/curl --restart=Never -- curl -sv http://shop-api/api/health
kubectl get networkpolicy -n shop
kubectl logs -n envoy-gateway-system -l gateway.envoyproxy.io/owning-gateway-name=public-gw --tail=20`,
          lang: 'bash'
        },
        {
          t: 'Install kube-prometheus-stack, scrape your app and alert on errors',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Install the chart; note its release label used by ServiceMonitor/PrometheusRule selectors.</li>
<li>Expose <code>/metrics</code> from the Go app with a named Service port.</li>
<li>Create a ServiceMonitor and confirm the target is UP in Prometheus.</li>
<li>Add a PrometheusRule for the 5xx ratio; trigger it with a faulty endpoint and see it in Alertmanager.</li>
</ul>`,
          solution: `helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kps prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
kubectl apply -f api-servicemonitor.yaml -f api-prometheusrule.yaml
kubectl -n monitoring port-forward svc/kps-kube-prometheus-stack-prometheus 9090 &
curl -s 'localhost:9090/api/v1/targets?state=active' | jq '.data.activeTargets[] | select(.labels.job=="api") | .health'
curl -s localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.name=="APIHighErrorRatio") | .state'
kubectl -n monitoring port-forward svc/kps-grafana 3000:80`,
          lang: 'bash'
        },
        {
          t: 'Instrument a Go service with OpenTelemetry and view traces',
          d: 'medium',
          type: 'hands-on',
          hint: `<ul>
<li>Deploy an OTel Collector (Helm chart) with an OTLP receiver and an exporter to Jaeger or Tempo.</li>
<li>Initialise a TracerProvider with an OTLP exporter and W3C propagation; wrap handlers with <code>otelhttp</code> and outgoing clients with <code>otelhttp.NewTransport</code>.</li>
<li>Configure via env vars (<code>OTEL_SERVICE_NAME</code>, <code>OTEL_EXPORTER_OTLP_ENDPOINT</code>).</li>
<li>Add <code>trace_id</code> to slog records to correlate logs and traces.</li>
</ul>`,
          solution: `// tracing.go (excerpt)
func initTracing(ctx context.Context) (func(context.Context) error, error) {
    exp, err := otlptracegrpc.New(ctx) // honours OTEL_EXPORTER_OTLP_ENDPOINT
    if err != nil {
        return nil, err
    }
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exp),
        sdktrace.WithResource(resource.Default()), // reads OTEL_SERVICE_NAME / OTEL_RESOURCE_ATTRIBUTES
    )
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.TraceContext{})
    return tp.Shutdown, nil
}

// main.go
handler := otelhttp.NewHandler(mux, "api")
client := &http.Client{Transport: otelhttp.NewTransport(http.DefaultTransport)}`,
          lang: 'go'
        },
        {
          t: 'Latency spike right after a deploy — triage the incident',
          d: 'hard',
          type: 'debug',
          hint: `<ul>
<li>Stabilise first: if the deploy correlates, roll back (<code>rollout undo</code> / abort the Rollout), then investigate.</li>
<li>Scope with metrics: which routes, pods, nodes, zones? RED dashboards, comparing old vs new ReplicaSet (<code>pod-template-hash</code>).</li>
<li>Find the slow span in traces; check logs for errors/timeouts with trace IDs.</li>
<li>Check resources: CPU throttling, GC, OOM restarts, readiness flapping, HPA at max, connection pool exhaustion, DNS latency.</li>
<li>Write a blameless postmortem: timeline, root cause, detection gap, action items (canary analysis that would have caught it).</li>
</ul>`,
          solution: `kubectl rollout history deploy/api -n shop
kubectl rollout undo deploy/api -n shop          # mitigate first
# Compare versions in PromQL (pod-template-hash label via kube_pod_labels join), e.g.
#   histogram_quantile(0.99, sum by (le, pod) (rate(http_request_duration_seconds_bucket{job="api"}[5m])))
kubectl top pods -n shop -l app.kubernetes.io/name=api
kubectl get hpa api -n shop
kubectl get events -n shop --types=Warning --sort-by=.lastTimestamp | tail
kubectl logs -n shop -l app.kubernetes.io/name=api --since=30m | grep -E '"level":"(ERROR|WARN)"' | head`,
          lang: 'bash'
        },
        {
          t: 'Design an observability stack for a 50-service Kubernetes platform',
          d: 'hard',
          type: 'design',
          hint: `<ul>
<li>Signals: metrics (Prometheus + long-term store like Mimir/Thanos or managed), logs (Fluent Bit/OTel agent → Loki/OpenSearch), traces (OTel SDKs → Collector gateway with tail sampling → Tempo/Jaeger), events exported.</li>
<li>Standards: OpenTelemetry everywhere, semantic conventions, required labels (service, version, env, team), structured JSON logs with trace IDs.</li>
<li>SLOs per service with burn-rate alerts routed by team via Alertmanager; dashboards as code; runbooks linked from alerts.</li>
<li>Cost and scale: cardinality budgets, retention tiers, sampling, multi-tenancy per team.</li>
<li>Reliability of the stack itself: HA, separate failure domain or managed service, meta-monitoring (alert if alerts stop).</li>
</ul>`
        },
        {
          t: 'Pods evicted with DiskPressure — find what filled the node disk',
          d: 'medium',
          type: 'debug',
          hint: `<ul>
<li>Signals: node condition <code>DiskPressure=True</code>, taint <code>node.kubernetes.io/disk-pressure:NoSchedule</code>, Pods <code>Evicted</code> with "The node was low on resource: ephemeral-storage", and image garbage-collection events (<code>FreeDiskSpaceFailed</code>).</li>
<li>Two filesystems matter: <strong>nodefs</strong> (the kubelet directory: emptyDirs, container logs, and writable layers when on the same disk) and <strong>imagefs</strong> (images and layers). Eviction thresholds exist for both, including inode variants.</li>
<li>Usual culprits: an app writing to its container filesystem or an emptyDir without <code>sizeLimit</code>, huge stdout logs (rotation by <code>containerLogMaxSize</code>/<code>containerLogMaxFiles</code>), many large images on a small root disk, core dumps, or something outside Kubernetes (journald, host logs).</li>
<li>Fix: set <code>ephemeral-storage</code> requests and limits and emptyDir <code>sizeLimit</code> so the offender alone is evicted; log less or ship logs; give images a bigger or separate disk; tune image GC thresholds; alert on node disk usage well before the eviction threshold.</li>
</ul>`,
          solution: `kubectl describe node worker-5 | grep -E 'DiskPressure|disk-pressure|ephemeral-storage'
kubectl get pods -A --field-selector=status.phase=Failed -o wide | grep worker-5
kubectl get events -A --field-selector involvedObject.name=worker-5 --sort-by=.lastTimestamp | tail
# Per-Pod ephemeral-storage usage from the kubelet summary API
kubectl get --raw /api/v1/nodes/worker-5/proxy/stats/summary \\
  | jq -r '.pods[] | [.podRef.namespace + "/" + .podRef.name, (.["ephemeral-storage"].usedBytes // 0)] | @tsv' \\
  | sort -k2 -nr | head
# On the node itself
kubectl debug node/worker-5 -it --image=ubuntu --profile=sysadmin -- chroot /host sh -c \\
  'df -h /var/lib/kubelet /var/lib/containerd; du -xsh /var/log/pods/* 2>/dev/null | sort -h | tail -5'`,
          lang: 'bash'
        }
      ],
      interviewFocus: [
        {
          q: 'Walk me through how you would debug a pod in CrashLoopBackOff.',
          a: `<ol>
<li><code>kubectl get pod</code>: restart count and age — is it new (just deployed) or regressed?</li>
<li><code>kubectl describe pod</code>: last state, <strong>exit code</strong>, reason (OOMKilled?), events (liveness failures, mount problems).</li>
<li><code>kubectl logs --previous</code>: the crashed instance's output — usually a config or dependency error.</li>
<li>Interpret the exit code: 1 app error; 126/127 bad command or missing binary (wrong entrypoint, distroless without shell); 137 SIGKILL (OOM or liveness); 143 SIGTERM.</li>
<li>Check what changed: image, command/args, env, ConfigMap/Secret values, ServiceAccount permissions, dependency availability.</li>
<li>Reproduce: <code>kubectl debug --copy-to</code> with a shell or an ephemeral container; run the binary by hand.</li>
<li>Fix, roll out, verify, and add a guard (startup probe, config validation at boot, alert).</li>
</ol>`
        },
        {
          q: 'Why should a liveness probe never check a database?',
          a: `<p>A liveness failure <strong>restarts</strong> the container. If the database is slow or down, every replica's liveness fails simultaneously, and the kubelet restarts all of them — which does not fix the database, drops in-flight requests, causes cold starts and connection storms against the recovering database, and turns a partial degradation into a full outage.</p>
<p>Liveness should detect only states the restart <em>can fix</em> (deadlock, wedged event loop). Dependency health belongs in <strong>readiness</strong> (temporarily stop routing traffic) or, better, in graceful degradation inside the app plus alerts. Also give probes realistic timeouts so CPU throttling under load does not trigger restarts.</p>`
        },
        {
          q: 'A Service is not reachable from another pod. How do you narrow it down?',
          a: `<ol>
<li><strong>DNS</strong>: <code>nslookup svc.ns</code> from the client pod. Fails → CoreDNS health, NetworkPolicy egress to port 53, wrong namespace/short name.</li>
<li><strong>Service → endpoints</strong>: <code>kubectl get endpointslices -l kubernetes.io/service-name=svc</code>. Empty → selector/label mismatch or pods not Ready.</li>
<li><strong>Pod directly</strong>: curl <code>podIP:targetPort</code>. Fails → app not listening on that port/interface (127.0.0.1), or NetworkPolicy ingress denial.</li>
<li><strong>ClusterIP</strong>: curl <code>clusterIP:port</code>. Pod works but ClusterIP fails → port/targetPort mismatch or kube-proxy/eBPF dataplane issue on that node.</li>
<li><strong>Cross-node</strong>: works on the same node but not across nodes → CNI/overlay, MTU, cloud security groups.</li>
</ol>
<p>Use an ephemeral netshoot container in the client pod to run these tests from the exact same network namespace.</p>`
        },
        {
          q: 'Logs, metrics and traces — when do you use which?',
          a: `<ul>
<li><strong>Metrics</strong>: cheap, aggregated numbers over time — detection and alerting ("error ratio is 5%", "p99 is 2 s"), capacity planning, SLOs. Low cardinality.</li>
<li><strong>Traces</strong>: the path and timing of individual requests across services — localisation ("the 2 s is in the payments call → its DB query").</li>
<li><strong>Logs</strong>: detailed discrete events with context — explanation ("why did this request fail": stack trace, validation error).</li>
<li><strong>Events/profiles</strong>: Kubernetes events for platform actions; continuous profiling (pprof/Pyroscope) for CPU/memory hot spots.</li>
</ul>
<p>Typical flow: an alert fires on a metric → an exemplar or trace search shows which hop is slow → logs for that trace ID explain the error. Correlation IDs and consistent resource attributes (service, version, pod) make this flow possible.</p>`
        },
        {
          q: 'When would you introduce a service mesh, and what are the costs?',
          a: `<p><strong>Introduce one</strong> when you need: zero-trust <strong>mTLS</strong> with workload identity and authorization between many services (compliance), consistent <strong>L7 traffic control</strong> (retries, timeouts, circuit breaking, canaries) across polyglot services, per-request load balancing for gRPC, or uniform golden-signal telemetry without touching every codebase.</p>
<p><strong>Costs</strong>: extra latency per hop (sidecars, typically sub-millisecond to a few ms), CPU/memory per pod (sidecar) or per node (ambient), a complex control plane to upgrade and debug, certificate management, new failure modes (misconfigured policies blocking traffic, retry storms), and team learning curve. Alternatives for smaller platforms: Gateway API at the edge, NetworkPolicies, app-level libraries (gRPC retries, OTel), and Cilium's transparent encryption. Ambient mode or Linkerd reduce — but do not eliminate — the overhead.</p>`
        }
      ],
      quiz: [
        { q: 'What happens when a readiness probe fails?', a: 'The pod is removed from Service endpoints until it passes again; the container is not restarted.' },
        { q: 'What happens when a liveness probe fails failureThreshold times?', a: 'The kubelet kills and restarts the container.' },
        { q: 'Why use a startup probe?', a: 'To give slow-starting apps time to initialise without weakening liveness settings; liveness and readiness are disabled until it succeeds.' },
        { q: 'What does exit code 137 indicate?', a: 'The container was killed with SIGKILL (128 + 9), typically OOMKilled or killed after a failed liveness probe/grace period.' },
        { q: 'How do you see logs from the previous, crashed container instance?', a: 'kubectl logs <pod> --previous (-p).' },
        { q: 'Is metrics-server a monitoring solution?', a: 'No. It provides short-term CPU/memory for kubectl top and autoscalers; use Prometheus (or similar) for monitoring and alerting.' },
        { q: 'How can you get a shell-like debugging environment in a distroless pod?', a: 'Use kubectl debug to add an ephemeral container with tools, using --target to share the app container process namespace.' },
        { q: 'How long are Kubernetes Events retained by default?', a: 'About one hour, so they should be exported for later analysis.' }
      ],
      resources: [
        { title: 'Kubernetes Docs — Configure Liveness, Readiness and Startup Probes', url: 'https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/', type: 'docs' },
        { title: 'Kubernetes Docs — Debug Running Pods', url: 'https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/', type: 'docs' },
        { title: 'Kubernetes Docs — Logging Architecture', url: 'https://kubernetes.io/docs/concepts/cluster-administration/logging/', type: 'docs' },
        { title: 'OpenTelemetry documentation', url: 'https://opentelemetry.io/docs/', type: 'docs' }
      ]
    }
  ],
  flashcards: [
    { q: 'What two kernel features make a container?', a: 'Namespaces (isolate what a process can see) and cgroups (limit what it can use), plus a private root filesystem and security hardening (capabilities, seccomp, LSMs).', d: 1 },
    { q: 'Type 1 vs type 2 hypervisor?', a: 'Type 1 runs directly on hardware (ESXi, Hyper-V, Xen, KVM); type 2 runs as an application on a host OS (VirtualBox, VMware Workstation).', d: 1 },
    { q: 'runc vs containerd vs CRI?', a: 'runc is the low-level OCI runtime that creates the container process; containerd is the high-level runtime managing images and lifecycle; CRI is the gRPC API the kubelet uses to talk to containerd or CRI-O.', d: 2 },
    { q: 'Why put COPY go.mod go.sum before COPY . in a Dockerfile?', a: 'So the dependency download layer stays cached until dependencies change, instead of being rebuilt on every source edit.', d: 1 },
    { q: 'Exec form vs shell form ENTRYPOINT?', a: 'Exec form runs the binary as PID 1 so it receives SIGTERM; shell form wraps it in /bin/sh -c, which usually does not forward signals, causing slow, ungraceful shutdowns.', d: 2 },
    { q: 'Tag vs digest?', a: 'A tag is a mutable pointer; a digest (sha256) is an immutable content address. Deploy and sign by digest.', d: 1 },
    { q: 'Which component is the only one that talks to etcd?', a: 'kube-apiserver.', d: 1 },
    { q: 'What does level-triggered reconciliation mean?', a: 'Controllers act on the difference between desired and current state whenever they look, rather than on individual events, so missed or duplicate events do not break convergence.', d: 2 },
    { q: 'Order of the API request pipeline?', a: 'Authentication, authorization, mutating admission, schema validation, validating admission, persistence to etcd.', d: 2 },
    { q: 'Pod termination sequence?', a: 'deletionTimestamp set; endpoints removed in parallel with preStop hook; SIGTERM; after terminationGracePeriodSeconds (default 30 s, counted from preStop) SIGKILL.', d: 2 },
    { q: 'maxSurge vs maxUnavailable?', a: 'maxSurge: how many pods above desired may exist during a rollout (rounded up). maxUnavailable: how many below desired may be unavailable (rounded down). Both default to 25%.', d: 2 },
    { q: 'Three stable guarantees of a StatefulSet?', a: 'Stable pod names with ordinals, stable DNS via a headless Service, and stable per-pod storage via volumeClaimTemplates.', d: 2 },
    { q: 'How is a native sidecar declared?', a: 'As an init container with restartPolicy: Always; it starts before app containers, runs for the pod lifetime and does not block Job completion.', d: 2 },
    { q: 'ClusterIP vs NodePort vs LoadBalancer?', a: 'ClusterIP: internal virtual IP. NodePort: ClusterIP plus a port on every node. LoadBalancer: NodePort plus an external cloud load balancer.', d: 1 },
    { q: 'Why does gRPC traffic stick to one pod behind a ClusterIP?', a: 'kube-proxy balances per TCP connection; gRPC multiplexes all requests over long-lived HTTP/2 connections. Use client-side LB with a headless Service or an L7 proxy/mesh.', d: 3 },
    { q: 'What problem does ndots:5 cause?', a: 'External names with fewer than 5 dots are first tried against every search domain, multiplying DNS queries and latency. Use FQDNs with a trailing dot or lower ndots.', d: 3 },
    { q: 'Gateway API resource roles?', a: 'GatewayClass (infrastructure provider), Gateway (cluster operator: listeners, TLS), Routes such as HTTPRoute (application teams); ReferenceGrant permits cross-namespace references.', d: 2 },
    { q: 'What must a default-deny egress NetworkPolicy always be paired with?', a: 'An explicit egress allow for DNS (UDP and TCP 53) to CoreDNS.', d: 2 },
    { q: 'Are Secrets encrypted by default?', a: 'No. They are base64-encoded and stored unencrypted in etcd unless encryption at rest (ideally KMS v2) is configured.', d: 1 },
    { q: 'Why use volumeBindingMode: WaitForFirstConsumer?', a: 'It delays volume provisioning until the pod is scheduled, so zonal disks are created in the same zone as the pod.', d: 2 },
    { q: 'QoS classes and eviction order?', a: 'Guaranteed (requests = limits for CPU and memory in all containers), Burstable, BestEffort (no requests/limits). BestEffort and pods exceeding requests are evicted first.', d: 2 },
    { q: 'Memory limit vs CPU limit exceeded?', a: 'Memory: container OOMKilled (exit 137). CPU: throttled by CFS quota, never killed.', d: 1 },
    { q: 'HPA formula?', a: 'desiredReplicas = ceil(currentReplicas x currentMetric / targetMetric); utilization is relative to requests; default scale-down stabilization is 300 s.', d: 2 },
    { q: 'Taints vs node affinity?', a: 'Taints repel pods that lack a matching toleration; node affinity attracts pods to labelled nodes. Dedicated node pools need both.', d: 2 },
    { q: 'What does a PodDisruptionBudget protect against?', a: 'Voluntary disruptions through the Eviction API (drains, upgrades, autoscaler consolidation) — not node crashes or OOM kills.', d: 2 },
    { q: 'Why is "create pods" in a namespace a sensitive permission?', a: 'A pod can mount any Secret and run as any ServiceAccount in that namespace, effectively granting their access.', d: 3 },
    { q: 'Three Pod Security Standard levels?', a: 'privileged, baseline, restricted — enforced per namespace by Pod Security Admission labels (enforce, audit, warn).', d: 1 },
    { q: 'Four GitOps principles?', a: 'Declarative, versioned and immutable, pulled automatically, continuously reconciled.', d: 2 },
    { q: 'Liveness vs readiness probe failure?', a: 'Liveness failure restarts the container; readiness failure removes the pod from Service endpoints without restarting. Liveness must not check dependencies.', d: 1 },
    { q: 'Three modes of kubectl debug?', a: 'Ephemeral container in a running pod (with --target to share processes), a modified copy of a pod (--copy-to), and a node debugging pod (kubectl debug node/NAME).', d: 3 },
    { q: 'Namespaced vs node-level sysctls?', a: 'Namespaced ones (net.*, kernel.shm*/msg*/sem, fs.mqueue.*) are set per Pod via securityContext.sysctls (safe ones by default, unsafe ones only if the kubelet allow-lists them); node-level ones (vm.*, most kernel.*) are shared by every Pod on the node.', d: 2 },
    { q: 'How is HA achieved for kube-apiserver, etcd and kube-scheduler?', a: 'kube-apiserver: active-active behind a load balancer. etcd: Raft quorum of 3 or 5 members. kube-scheduler and controller-manager: active-passive through Lease-based leader election.', d: 2 },
    { q: 'What does hostUsers: false do?', a: 'Runs the Pod in a user namespace, so root inside maps to an unprivileged host UID range; beta and on by default since 1.33, it needs idmapped mounts (recent kernel, containerd 2.0+ or CRI-O 1.25+).', d: 3 },
    { q: 'In-place pod resize in one sentence?', a: 'GA in 1.35: patch the Pod resize subresource to change CPU/memory without recreating it; resizePolicy controls container restarts and the QoS class cannot change.', d: 2 },
    { q: 'What are the main DRA objects?', a: 'ResourceSlice (devices a driver advertises per node), DeviceClass (admin-defined selector), ResourceClaim / ResourceClaimTemplate (the workload request referenced from the Pod). The scheduler allocates devices; GA in 1.34.', d: 3 },
    { q: 'kube-proxy modes as of 1.35?', a: 'iptables: long-time default; nftables: GA in 1.33 and recommended; IPVS: deprecated in 1.35; eBPF dataplanes such as Cilium can replace kube-proxy entirely.', d: 2 },
    { q: 'What is the status of ingress-nginx in 2026?', a: 'Retired: announced in November 2025, no releases or security fixes after March 2026. The Ingress API itself is frozen, not deprecated; migrate to Gateway API or another maintained controller.', d: 1 },
    { q: 'Why does a StatefulSet Pod stay Terminating when its node dies?', a: 'Only the kubelet can confirm the containers stopped, and the controller will not create a second Pod with the same identity. Fence the node, then use the out-of-service taint or a force delete.', d: 3 }
  ]
});
