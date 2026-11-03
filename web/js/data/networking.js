// Networking for Backend Engineers — roadmap content.
// Schema: see CONTRIBUTING.md. Validate with: node scripts/validate-content.js web/js/data/networking.js
registerRoadmap({
  id: 'networking',
  order: 50,
  title: 'Networking for Backend Engineers',
  short: 'Networking',
  icon: '🌐',
  color: '#10B981',
  desc: 'OSI & TCP/IP, DNS, HTTP, proxies, load balancers, API gateways and network troubleshooting.',
  unit: 'Module',
  modules: [
// ───────────────────────────── Module 1 ─────────────────────────────
{
  n: 1,
  title: 'Network Models: OSI & TCP/IP',
  summary: 'The mental model every networking interview starts from: the OSI and TCP/IP layers, how data is encapsulated on the way down the stack, where load balancers, proxies, firewalls and gateways actually operate, and why MTU problems cause some of the most confusing production outages.',
  topics: [
    {
      title: 'The OSI Model: 7 Layers, PDUs, Protocols & Devices',
      def: `<p>The <strong>OSI (Open Systems Interconnection)</strong> model is a 7-layer <em>reference</em> model. Nobody implements it literally, but it is the shared vocabulary for saying <em>where</em> something happens ("that's an L4 load balancer", "L7 routing on the Host header"). Each layer serves the one above it and uses the one below it.</p>
<table>
<thead><tr><th>#</th><th>Layer</th><th>PDU</th><th>Protocols / examples</th><th>Devices / components</th></tr></thead>
<tbody>
<tr><td>7</td><td>Application</td><td>Data / message</td><td>HTTP, gRPC, DNS, SMTP, SSH</td><td>L7 LB, API gateway, WAF, reverse proxy</td></tr>
<tr><td>6</td><td>Presentation</td><td>Data</td><td>TLS (commonly placed here), encoding, compression</td><td>TLS terminator</td></tr>
<tr><td>5</td><td>Session</td><td>Data</td><td>Session setup/teardown, RPC sessions</td><td>(rarely a separate component)</td></tr>
<tr><td>4</td><td>Transport</td><td>Segment (TCP) / Datagram (UDP)</td><td>TCP, UDP, QUIC (runs over UDP)</td><td>L4 LB (AWS NLB), stateful firewall</td></tr>
<tr><td>3</td><td>Network</td><td>Packet</td><td>IPv4, IPv6, ICMP, IPsec, BGP (runs over TCP but serves L3)</td><td>Router, L3 switch</td></tr>
<tr><td>2</td><td>Data Link</td><td>Frame</td><td>Ethernet, 802.11 Wi-Fi, ARP, VLAN (802.1Q)</td><td>Switch, bridge, NIC</td></tr>
<tr><td>1</td><td>Physical</td><td>Bits / symbols</td><td>Copper, fibre, radio, 1000BASE-T</td><td>Hub, repeater, cable, transceiver</td></tr>
</tbody>
</table>
<p>Mnemonic (top down): <strong>A</strong>ll <strong>P</strong>eople <strong>S</strong>eem <strong>T</strong>o <strong>N</strong>eed <strong>D</strong>ata <strong>P</strong>rocessing. Layers 5 and 6 are fuzzy in practice; TLS, for example, sits between TCP and HTTP and is called "L6", "L4.5" or just "part of L7" depending on who you ask. Say that explicitly in an interview; it shows you know the model is a model.</p>`,
      interview: 'Interviewers rarely want you to recite the 7 layers. They probe whether you can place real components on them: "Is an AWS ALB L4 or L7? What can it see that an NLB cannot?" Mention that L5/L6 are blurry and that TLS and QUIC do not fit neatly — that nuance is a senior signal.',
      examples: [
        { label: 'Seeing layers in a single packet (tcpdump -e shows L2)', lang: 'text', code: `$ sudo tcpdump -i eth0 -e -n -c 1 'tcp port 443'
12:01:07.114 02:42:ac:11:00:02 > 02:42:ac:11:00:01, ethertype IPv4 (0x0800), length 74:
    172.17.0.2.51544 > 142.250.183.4.443: Flags [S], seq 3021, win 64240,
    options [mss 1460,sackOK,TS val 1 ecr 0,nop,wscale 7], length 0

L2: src/dst MAC + ethertype     L3: src/dst IP
L4: ports, TCP flags [S]=SYN, MSS/window options     L7: none yet (handshake)` }
      ]
    },
    {
      title: 'The TCP/IP (Internet) Model',
      def: `<p>The <strong>TCP/IP model</strong> is what the Internet actually implements (RFC 1122). It has <strong>4 layers</strong>:</p>
<table>
<thead><tr><th>TCP/IP layer</th><th>Maps to OSI</th><th>Examples</th></tr></thead>
<tbody>
<tr><td>Application</td><td>5, 6, 7</td><td>HTTP/1.1, HTTP/2, HTTP/3, DNS, TLS, gRPC</td></tr>
<tr><td>Transport</td><td>4</td><td>TCP, UDP (QUIC is a transport built on UDP)</td></tr>
<tr><td>Internet</td><td>3</td><td>IPv4, IPv6, ICMP</td></tr>
<tr><td>Link (Network Access)</td><td>1, 2</td><td>Ethernet, Wi-Fi, ARP</td></tr>
</tbody>
</table>
<p>Some texts use a 5-layer hybrid (splitting Link into Data Link + Physical), which is what most engineers actually reason with.</p>
<p>Key design ideas worth knowing:</p>
<ul>
<li><strong>End-to-end principle</strong>: the network core (routers) stays simple and stateless; reliability, ordering and security live at the end hosts (TCP, TLS). Middleboxes (NAT, firewalls, LBs) violate this and cause <em>protocol ossification</em> — the reason QUIC encrypts almost all of its transport header and runs over UDP.</li>
<li><strong>Hourglass shape</strong>: many link technologies and many applications, but one narrow waist — IP. Everything runs over IP and IP runs over everything.</li>
<li><strong>Kernel vs user space</strong>: on Linux, L2–L4 (Ethernet, IP, TCP/UDP) live in the kernel; L7 (HTTP, TLS — unless kTLS) lives in your process. QUIC moves the transport into user space, which is why it can evolve faster.</li>
</ul>`,
      interview: 'Be ready to map OSI to TCP/IP quickly and to explain why the industry speaks "OSI numbers" (L4/L7) while running TCP/IP. A strong answer mentions ossification: middleboxes inspecting TCP headers made TCP hard to change, which is a big reason QUIC was built over UDP with encrypted headers.',
      examples: [
        { label: 'Where each layer lives on a Linux host', lang: 'text', code: `+-------------------------------+  user space
| Your Go service (HTTP, TLS)   |  L7 (+ QUIC if using quic-go)
+---------------+---------------+
     syscalls: socket(), connect(), read(), write()
+---------------+---------------+  kernel
| TCP / UDP  (sk_buff, sockets) |  L4
| IP routing, netfilter/iptables|  L3
| NIC driver, qdisc             |  L2
+---------------+---------------+
| NIC hardware / cable          |  L1` }
      ]
    },
    {
      title: 'Encapsulation & Decapsulation',
      def: `<p>On send, each layer wraps the payload from the layer above with its own header (and sometimes trailer): <strong>encapsulation</strong>. On receive, each layer strips its header and hands the payload up: <strong>decapsulation</strong>. Routers decapsulate only up to L3 (to read the destination IP) and re-encapsulate with a new L2 header for the next hop.</p>
<p>The IP header is <em>mostly</em> preserved end to end, but not frozen. What can legitimately change in flight:</p>
<ul>
<li><strong>Every router</strong>: decrements TTL (IPv6: Hop Limit) and, for IPv4, recomputes the header checksum (IPv6 has none).</li>
<li><strong>DSCP</strong> (the 6 QoS bits of the old ToS / Traffic Class byte) may be <em>re-marked</em> at trust boundaries — many ISPs and clouds reset or remap it, so you cannot rely on your markings surviving the Internet.</li>
<li><strong>ECN</strong> (the low 2 bits): an ECN-capable router that is congested sets <strong>CE</strong> (Congestion Experienced) instead of dropping the packet; the receiver echoes it back so the sender slows down (the basis of DCTCP and L4S).</li>
<li><strong>NAT/PAT</strong> rewrites source or destination addresses and ports (fixing up the IP and TCP/UDP checksums) — kube-proxy DNAT, NAT gateways, home routers.</li>
<li><strong>IPv4 fragmentation</strong>: a router may split a packet whose DF bit is clear (changing total length, flags and fragment offset); IPv6 routers never fragment.</li>
<li>Middleboxes may also touch L4: <strong>MSS clamping</strong> rewrites the TCP MSS option in SYNs, and some firewalls strip TCP options.</li>
</ul>
<p>Typical header sizes (memorise these — they drive MTU math):</p>
<ul>
<li>Ethernet II: <strong>14 bytes</strong> header + 4 bytes FCS trailer (+4 for an 802.1Q VLAN tag)</li>
<li>IPv4: <strong>20 bytes</strong> minimum (up to 60 with options); IPv6: <strong>40 bytes</strong> fixed</li>
<li>TCP: <strong>20 bytes</strong> minimum (Linux typically uses 32 with the timestamps option); UDP: <strong>8 bytes</strong></li>
<li>TLS 1.3 record: 5-byte header + 16-byte AEAD tag + 1-byte content type per record</li>
<li>VXLAN overlay (Kubernetes CNI, cloud overlays): <strong>~50 bytes</strong> extra (outer Ethernet 14 + outer IPv4 20 + UDP 8 + VXLAN 8)</li>
</ul>
<p>So a full 1500-byte IPv4 packet carries at most 1500 − 20 − 20 = <strong>1460 bytes</strong> of TCP payload (the default <strong>MSS</strong>), or 1448 with TCP timestamps. Tunnels (VXLAN, IPsec, WireGuard, GRE) are simply encapsulation of a whole packet inside another packet — they "eat" MTU.</p>`,
      interview: 'A common follow-up: "What changes in the packet as it crosses a router?" Answer: a new L2 header (source/dest MAC change every hop), TTL/Hop Limit decremented, IPv4 header checksum recomputed; source/dest IP stay the same unless NAT is involved and ports change only with NAT/PAT. The senior add-on: DSCP may be re-marked at trust boundaries, a congested ECN-capable router sets the ECN CE bits instead of dropping, an IPv4 router may fragment a packet without DF, and middleboxes may clamp the TCP MSS option.',
      examples: [
        { label: 'Encapsulation of an HTTPS request', lang: 'text', code: `App:        [ HTTP request: GET /api/users ... ]
TLS:        [ TLS hdr | encrypted HTTP | tag ]
TCP:        [ TCP hdr 20-32B | TLS record ]
IP:         [ IPv4 hdr 20B | TCP segment ]
Ethernet:   [ Eth hdr 14B | IP packet (<= 1500B MTU) | FCS 4B ]

Overlay (VXLAN) wraps the whole inner frame again:
[ outer Eth | outer IP | UDP:4789 | VXLAN | inner Eth | inner IP | TCP | data ]` }
      ]
    },
    {
      title: 'Where LBs, Proxies, Firewalls & API Gateways Operate (L3/L4/L7)',
      def: `<p>The layer a component works at determines <strong>what it can see and therefore what it can decide on</strong>.</p>
<table>
<thead><tr><th>Layer</th><th>Sees</th><th>Typical components</th><th>Can do</th></tr></thead>
<tbody>
<tr><td>L3</td><td>Src/dst IP, protocol</td><td>Routers, ECMP, anycast, cloud route tables, security groups (partly L4)</td><td>Forward/drop by IP, route by prefix</td></tr>
<tr><td>L4</td><td>IP + ports, TCP flags</td><td>AWS NLB, GCP passthrough NLB, IPVS/kube-proxy, HAProxy (mode tcp), stateful firewalls, NAT</td><td>Balance per <em>connection</em>, very fast, protocol-agnostic, TLS passthrough</td></tr>
<tr><td>L7</td><td>Full request: method, path, headers, cookies, body</td><td>AWS ALB, Envoy, Nginx, HAProxy (mode http), API gateways, WAF, service mesh sidecars</td><td>Balance per <em>request</em>, path/header routing, retries, auth, rate limiting, rewrites</td></tr>
</tbody>
</table>
<p>Important consequences:</p>
<ul>
<li>An <strong>L4 LB cannot route on URL or header</strong> and cannot balance individual gRPC calls — a single long-lived HTTP/2 connection pins all RPCs to one backend.</li>
<li>An <strong>L7 component must terminate TLS</strong> (or receive plaintext) to read headers; it holds a client-side and a server-side connection (a full proxy).</li>
<li>A <strong>stateful firewall</strong> tracks connections (conntrack) at L3/L4; a <strong>WAF</strong> inspects L7 payloads (SQLi, XSS).</li>
<li>L4 LBs can preserve the client IP (passthrough/DSR); L7 proxies replace it and must forward it via <code>X-Forwarded-For</code> or the PROXY protocol.</li>
</ul>`,
      interview: 'Classic question: "Why do gRPC services behind a Kubernetes ClusterIP Service get uneven load?" Because kube-proxy balances at L4 per connection and HTTP/2 multiplexes every RPC onto one long-lived connection. Fix: L7 balancing (Envoy/mesh, gRPC client-side LB with headless Service, or periodic connection recycling via MaxConnectionAge).',
      examples: [
        { label: 'Same backend, L4 vs L7 in HAProxy', lang: 'text', code: `# L4: forwards bytes, cannot see HTTP
frontend db_in
    mode tcp
    bind :5432
    default_backend pg
backend pg
    mode tcp
    balance leastconn
    server pg1 10.0.1.10:5432 check
    server pg2 10.0.1.11:5432 check

# L7: parses HTTP, routes by path
frontend web_in
    mode http
    bind :443 ssl crt /etc/ssl/site.pem
    acl is_api path_beg /api/
    use_backend api if is_api
    default_backend static` }
      ]
    },
    {
      title: 'MTU, MSS, Fragmentation & Path MTU Discovery',
      def: `<p><strong>MTU</strong> (Maximum Transmission Unit) is the largest L3 packet a link can carry: 1500 bytes for standard Ethernet, up to 9000/9001 for jumbo frames (AWS uses 9001 inside a VPC, but only 1500 across the internet gateway and most VPN/peering paths). IPv6 requires every link to support at least <strong>1280</strong>.</p>
<p><strong>MSS</strong> (Maximum Segment Size) is the largest TCP <em>payload</em>, advertised in the SYN: MSS = MTU − IP header − TCP header (1460 for IPv4 on 1500). Each side advertises its own MSS; the sender uses the smaller.</p>
<p><strong>Fragmentation</strong>: an IPv4 router may split a too-large packet into fragments unless the <strong>DF (Don't Fragment)</strong> bit is set. Fragmentation is bad: losing one fragment loses the whole packet, middleboxes often drop fragments, and reassembly costs CPU. <strong>IPv6 routers never fragment</strong> — only the source can.</p>
<p><strong>Path MTU Discovery (PMTUD)</strong>: TCP sends with DF set; a router with a smaller next-hop MTU drops the packet and returns <em>ICMP "Fragmentation Needed" (type 3, code 4)</em> or <em>ICMPv6 "Packet Too Big"</em>. If a firewall blocks that ICMP, you get a <strong>PMTUD black hole</strong>: the TCP handshake and small requests work, but large responses hang forever. Fixes:</p>
<ul>
<li>Allow ICMP type 3/4 (and ICMPv6 type 2) through firewalls and security groups.</li>
<li><strong>MSS clamping</strong> on the tunnel/router (<code>iptables ... --clamp-mss-to-pmtu</code>).</li>
<li>Lower the interface/CNI MTU to account for overlay overhead (VXLAN −50, WireGuard −60/−80, IPsec ~−73).</li>
<li>Enable Packetization Layer PMTUD (<code>net.ipv4.tcp_mtu_probing=1</code>), which does not rely on ICMP.</li>
</ul>`,
      interview: 'The symptom pattern is what interviewers want: "TCP connects, small requests work, large downloads or TLS handshakes with big certificate chains hang." That screams MTU/PMTUD black hole. Mention ping with DF to find the path MTU, MSS clamping, and allowing ICMP Fragmentation Needed.',
      examples: [
        { label: 'Find the path MTU with ping (Linux)', lang: 'bash', code: `# -M do = set DF bit; -s = ICMP payload size (add 28 for IP+ICMP headers)
$ ping -M do -s 1472 -c 2 10.20.0.15     # 1472 + 28 = 1500
PING 10.20.0.15 (10.20.0.15) 1472(1500) bytes of data.
ping: local error: message too long, mtu=1450

$ ping -M do -s 1422 -c 2 10.20.0.15     # 1422 + 28 = 1450
1430 bytes from 10.20.0.15: icmp_seq=1 ttl=63 time=0.61 ms

# Clamp MSS on a gateway/tunnel so TCP never sends oversize segments
$ sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \\
    -j TCPMSS --clamp-mss-to-pmtu` }
      ]
    }
  ],
  problems: [
    {
      t: 'Map common protocols and devices to OSI layers',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Place: HTTP, TLS, TCP, UDP, QUIC, IP, ICMP, ARP, Ethernet, BGP, DNS.</li><li>Place: switch, router, NLB, ALB, WAF, API gateway.</li><li>Call out the ambiguous ones (TLS, QUIC, ARP, BGP) and justify your choice.</li></ul>`,
      solution: `L7: HTTP, DNS, gRPC, BGP (application protocol over TCP 179 that controls L3 routing)
L6/L5 (or "between L4 and L7"): TLS
L4: TCP, UDP; QUIC = transport functionality implemented in user space over UDP
L3: IPv4, IPv6, ICMP (carried in IP but serves L3 control)
L2: Ethernet, ARP (resolves L3 -> L2, often called "L2.5"), 802.1Q VLAN
Devices: switch = L2; router = L3; NLB / IPVS = L4; ALB, Envoy, API gateway, WAF = L7`
    },
    {
      t: 'Compute header overhead and goodput for a full-size TCP segment',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Start from 1500-byte MTU, subtract IPv4 and TCP headers (with and without timestamps).</li><li>On the wire add Ethernet header, FCS, preamble+SFD (8B) and inter-frame gap (12B).</li><li>Repeat for IPv6.</li></ul>`,
      solution: `IPv4, TCP no options: payload = 1500 - 20 - 20 = 1460 bytes (MSS)
IPv4, TCP timestamps:  payload = 1500 - 20 - 32 = 1448 bytes
IPv6, TCP timestamps:  payload = 1500 - 40 - 32 = 1428 bytes

On-the-wire bytes per frame = 1500 + 14 (Eth) + 4 (FCS) + 8 (preamble/SFD) + 12 (IFG) = 1538
Goodput efficiency (IPv4 + TS) = 1448 / 1538 = ~94.1%
=> max TCP goodput on 1 Gbit/s Ethernet is ~941 Mbit/s (what iperf typically shows).`
    },
    {
      t: 'Classify infrastructure components as L3, L4 or L7',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>AWS NLB, AWS ALB, Kubernetes kube-proxy (iptables/IPVS), Envoy, Nginx stream vs http, security groups, Cloudflare WAF.</li><li>Ask: what does it need to read to make its decision?</li><li>Note which ones preserve the client source IP.</li></ul>`,
      solution: `AWS NLB: L4 (TCP/UDP/TLS listeners); preserves client IP for instance targets.
AWS ALB: L7 (HTTP/HTTPS/gRPC); client IP in X-Forwarded-For.
kube-proxy (iptables/IPVS/nftables): L4 DNAT per connection.
Envoy: L4 (tcp_proxy filter) and L7 (http_connection_manager).
Nginx: "stream {}" block = L4; "http {}" block = L7.
Security groups / NACLs: L3/L4 (IP, protocol, port); SGs stateful, NACLs stateless.
Cloudflare WAF: L7 (inspects HTTP requests).`
    },
    {
      t: 'Identify each layer in a real tcpdump capture',
      d: 'medium',
      type: 'hands-on',
      hint: `<ul><li>Run <code>sudo tcpdump -i any -e -nn -vv -c 10 'port 443'</code> while running <code>curl https://example.com</code>.</li><li>Label the MAC addresses (L2), IP + TTL (L3), ports + flags + MSS/wscale (L4).</li><li>Notice the TLS ClientHello is visible but HTTP is not — why?</li><li>Bonus: open the pcap in Wireshark and expand each layer.</li></ul>`,
      solution: `sudo tcpdump -i eth0 -e -nn -vv -w /tmp/https.pcap 'host example.com' &
curl -s -o /dev/null https://example.com
# In the output:
#  L2: aa:bb:.. > cc:dd:.. ethertype IPv4 (gateway MAC is the destination, not the server's!)
#  L3: (tos 0x0, ttl 64, id 0, flags [DF], proto TCP (6), length 60)
#  L4: 10.0.0.5.53312 > 93.184.215.14.443: Flags [S], options [mss 1460,sackOK,TS,nop,wscale 7]
#  L7: TLS ClientHello with SNI "example.com" in clear text; HTTP is inside encrypted records.
# Key insight: the destination MAC is the default gateway's MAC because the server is off-subnet.`
    },
    {
      t: 'Discover the path MTU between two hosts',
      d: 'medium',
      type: 'hands-on',
      hint: `<ul><li>Use <code>ping -M do -s SIZE</code> (Linux) or <code>ping -f -l SIZE</code> (Windows).</li><li>Remember the 28-byte IPv4+ICMP overhead.</li><li>Binary-search the size; compare with <code>tracepath</code> output.</li></ul>`,
      solution: `# Binary search payload size with DF set
for s in 1472 1450 1422 1400; do
  ping -M do -s $s -c 1 -W 1 10.20.0.15 >/dev/null 2>&1 && echo "$s OK" || echo "$s FAIL"
done
# Path MTU = largest OK size + 28

# tracepath does PMTUD hop by hop
$ tracepath -n 10.20.0.15
 1?: [LOCALHOST]   pmtu 1500
 1:  10.0.0.1      0.412ms
 2:  10.0.0.1      0.380ms pmtu 1450
 2:  10.20.0.15    0.701ms reached
     Resume: pmtu 1450 hops 2 back 2`
    },
    {
      t: 'Debug: small API calls work over VPN, large responses hang',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Handshake completes (small packets) but full-size data segments disappear.</li><li>Check MTU of the tunnel interface vs the LAN interface.</li><li>Is ICMP "fragmentation needed" being dropped somewhere?</li><li>Fixes: MSS clamping, lower MTU, allow ICMP, tcp_mtu_probing.</li></ul>`,
      solution: `Diagnosis
1. curl -v shows TCP connect + TLS handshake OK, then the body stalls (or the TLS
   handshake stalls at ServerHello/Certificate when the cert chain is large).
2. ping -M do -s 1472 <server> fails, -s 1372 succeeds => path MTU ~1400 (tunnel overhead).
3. tcpdump on the client: retransmissions of 1500-byte segments, no ICMP type 3 code 4 arriving.
=> PMTUD black hole: a firewall drops ICMP "Fragmentation Needed".

Fixes (pick one or more)
- Clamp MSS on the VPN gateway:
  iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
- Set the tunnel MTU correctly (e.g. WireGuard 1420) and the inner hosts' MTU/MSS.
- Allow ICMP type 3 code 4 (ICMPv6 type 2) in firewalls/security groups.
- Enable net.ipv4.tcp_mtu_probing=1 on endpoints as a safety net.`
    },
    {
      t: 'Choose L4 or L7 load balancing for a gRPC microservice',
      d: 'medium',
      type: 'design',
      hint: `<ul><li>gRPC = long-lived HTTP/2 connections with many multiplexed RPCs.</li><li>What does an L4 balancer distribute: connections or requests?</li><li>Options: L7 proxy (Envoy/ALB gRPC), client-side LB (xDS / headless Service), MaxConnectionAge.</li><li>Consider TLS termination, observability and retries.</li></ul>`,
      solution: `Choose L7 (or client-side) balancing.
- L4 balances connections; one HTTP/2 connection carries all RPCs from a client => hot backends,
  and new pods receive no traffic until clients reconnect.
- L7 (Envoy, ALB with gRPC target groups, service mesh) balances per RPC, understands gRPC status
  codes for retries/outlier detection, supports per-method routing and metrics.
- Alternative without a proxy: gRPC client-side round_robin with a headless Kubernetes Service
  (DNS returns pod IPs) or proxyless gRPC with xDS.
- If you must stay on L4: set server keepalive MaxConnectionAge (e.g. 5m) so clients reconnect
  and redistribute periodically.`
    },
    {
      t: 'Debug: pods on a VXLAN overlay time out on large payloads',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>Node NIC MTU 1500, overlay adds ~50 bytes.</li><li>Check <code>ip link</code> inside the pod vs on the node vs the CNI config.</li><li>Pod-to-pod on the same node works; cross-node large transfers fail.</li><li>Cloud jumbo frames (9001) can hide or cause the issue depending on path.</li></ul>`,
      solution: `Symptoms: same-node pod traffic fine; cross-node small requests fine; large responses,
image pulls through an in-cluster proxy, or TLS handshakes stall.

Check:
  kubectl exec pod-a -- ip link show eth0         # mtu 1500  <-- wrong
  ip link show flannel.1  (or vxlan.calico)       # mtu 1450
  ip link show eth0 (node)                        # mtu 1500
Inner packet 1500 + 50 VXLAN = 1550 > node MTU 1500 => dropped (DF set, ICMP often not
delivered back into the pod network namespace).

Fix:
- Set the CNI MTU to node MTU - overhead (Calico: veth_mtu 1450 for VXLAN, 1480 for IPIP,
  1440 for WireGuard; Cilium auto-detects; Flannel uses 1450 for VXLAN).
- Or raise node MTU (jumbo 9001 in AWS VPC) so the overlay fits, keeping 1500 at the edge.
- Roll pods so new veth pairs pick up the MTU.`
    },
    {
      t: 'Parse an IPv4 + TCP header from raw bytes in Go',
      d: 'hard',
      type: 'coding',
      hint: `<ul><li>IPv4: version/IHL in byte 0 (IHL is in 32-bit words), total length bytes 2-3, TTL byte 8, protocol byte 9, src 12-15, dst 16-19.</li><li>TCP starts at IHL*4: src port, dst port, seq, ack, data offset (upper 4 bits of byte 12), flags byte 13.</li><li>Use <code>encoding/binary.BigEndian</code> (network byte order).</li><li>Validate lengths before indexing.</li></ul>`,
      solution: `package main

import (
    "encoding/binary"
    "errors"
    "fmt"
    "net/netip"
)

type Packet struct {
    Src, Dst         netip.Addr
    TTL, Proto       uint8
    SrcPort, DstPort uint16
    Seq, Ack         uint32
    Flags            uint8
    Payload          []byte
}

func Parse(b []byte) (*Packet, error) {
    if len(b) < 20 || b[0]>>4 != 4 {
        return nil, errors.New("not an IPv4 packet")
    }
    ihl := int(b[0]&0x0f) * 4
    total := int(binary.BigEndian.Uint16(b[2:4]))
    if ihl < 20 || total > len(b) || total < ihl+20 {
        return nil, errors.New("truncated packet")
    }
    p := &Packet{TTL: b[8], Proto: b[9]}
    p.Src = netip.AddrFrom4([4]byte(b[12:16]))
    p.Dst = netip.AddrFrom4([4]byte(b[16:20]))
    if p.Proto != 6 {
        return nil, fmt.Errorf("protocol %d is not TCP", p.Proto)
    }
    t := b[ihl:total]
    p.SrcPort = binary.BigEndian.Uint16(t[0:2])
    p.DstPort = binary.BigEndian.Uint16(t[2:4])
    p.Seq = binary.BigEndian.Uint32(t[4:8])
    p.Ack = binary.BigEndian.Uint32(t[8:12])
    off := int(t[12]>>4) * 4
    if off < 20 || off > len(t) {
        return nil, errors.New("bad TCP data offset")
    }
    p.Flags = t[13] // CWR ECE URG ACK PSH RST SYN FIN
    p.Payload = t[off:]
    return p, nil
}

func main() {
    // Capture raw packets with an AF_PACKET socket or gopacket/pcap, then call Parse.
    fmt.Println("SYN flag set:", 0x12&0x02 != 0)
}`,
      lang: 'go'
    }
  ],
  interviewFocus: [
    {
      q: 'What is the difference between an L4 and an L7 load balancer, and when would you choose each?',
      a: `<p><strong>L4</strong> balancers make decisions on the 5-tuple (src/dst IP, src/dst port, protocol). They balance <em>connections</em>, forward bytes without parsing them, and can run at millions of packets per second with microsecond latency (AWS NLB, Maglev, IPVS). They support any TCP/UDP protocol, allow TLS passthrough, and can preserve the client IP.</p>
<p><strong>L7</strong> balancers terminate the client connection, parse HTTP/gRPC, and balance <em>requests</em>. They enable path/host/header routing, retries, timeouts, circuit breaking, auth, rate limiting, compression, observability per route. Cost: more CPU, TLS termination, a second connection to the backend, and the need to forward client identity (<code>X-Forwarded-For</code>, PROXY protocol).</p>
<p><strong>Choose L4</strong> for databases, non-HTTP protocols, extreme throughput, or as the first tier in front of an L7 fleet. <strong>Choose L7</strong> for HTTP APIs, gRPC (per-RPC balancing), canary/blue-green by header, and anything that needs request awareness. Large systems commonly stack them: anycast/L4 (Maglev, NLB) → L7 proxy fleet (Envoy/GFE) → services.</p>`
    },
    {
      q: 'Walk me through what happens to a packet as it goes from your laptop to a server on another network.',
      a: `<ol>
<li>App writes to a socket; kernel builds a TCP segment (ports, seq) inside an IP packet (src = laptop IP, dst = server IP).</li>
<li>Routing table lookup: destination is off-subnet, so next hop = <strong>default gateway</strong>. ARP resolves the gateway's MAC (cached in the neighbour table).</li>
<li>Ethernet frame: dst MAC = gateway, src MAC = laptop NIC. Sent over Wi-Fi/Ethernet.</li>
<li>Home router performs <strong>NAT/PAT</strong>: rewrites src IP to the public IP and possibly the src port, records the mapping in its conntrack table.</li>
<li>Each router hop: strips L2, decrements TTL, recomputes IPv4 checksum, looks up the longest-prefix match, re-encapsulates with a new L2 header (and may re-mark DSCP or set ECN CE when congested). BGP decided the inter-domain path.</li>
<li>At the destination network, maybe an L4 LB (DNAT to a backend) and then the server's kernel decapsulates up to TCP and delivers the payload to the listening socket.</li>
</ol>
<p>Key points interviewers listen for: <strong>MACs change per hop, IPs do not</strong> (except NAT), TTL decrements, longest-prefix match, and the return path may be different (asymmetric routing).</p>`
    },
    {
      q: 'Explain MTU, MSS and Path MTU Discovery. How does a PMTUD black hole present, and how do you fix it?',
      a: `<p><strong>MTU</strong> is the maximum L3 packet size for a link (1500 on Ethernet). <strong>MSS</strong> is the maximum TCP payload, advertised in SYN options (1460 for IPv4/1500). <strong>PMTUD</strong>: senders set DF; any router that cannot forward a too-large packet drops it and sends ICMP Fragmentation Needed (IPv4) / Packet Too Big (IPv6) with the next-hop MTU; the sender lowers its segment size.</p>
<p><strong>Black hole</strong>: a firewall drops those ICMP messages, so the sender keeps retransmitting oversize segments forever. Symptoms: connections establish, small requests succeed, large responses or big TLS certificate chains hang, often only via VPN/overlay paths.</p>
<p><strong>Fixes</strong>: permit ICMP type 3 code 4 / ICMPv6 type 2; MSS clamping on tunnel gateways; set correct MTU on overlay/tunnel interfaces (VXLAN −50, WireGuard −60/−80); enable <code>tcp_mtu_probing</code> (RFC 4821 PLPMTUD). QUIC handles this itself via DPLPMTUD and requires at least 1200-byte UDP datagrams.</p>`
    },
    {
      q: 'Why was QUIC built on top of UDP rather than as a new transport protocol next to TCP?',
      a: `<ul>
<li><strong>Deployability</strong>: NATs, firewalls and middleboxes only pass TCP and UDP reliably. A new IP protocol number (like SCTP) is blocked on much of the Internet.</li>
<li><strong>Ossification</strong>: middleboxes inspect and rewrite TCP headers, so extending TCP (e.g. TCP Fast Open, new options) breaks in the wild. QUIC encrypts nearly all transport metadata, so middleboxes cannot ossify it.</li>
<li><strong>User-space implementation</strong>: TCP lives in OS kernels and evolves at OS-upgrade speed; QUIC ships in apps/libraries (Chrome, quic-go, Envoy) and can be iterated quickly.</li>
<li><strong>Features</strong>: integrated TLS 1.3 (1-RTT, 0-RTT resumption), stream multiplexing without transport-level head-of-line blocking, connection migration via connection IDs.</li>
</ul>`
    }
  ],
  quiz: [
    { q: 'What is the PDU name at OSI layers 2, 3 and 4?', a: 'Frame (L2), packet (L3), segment for TCP or datagram for UDP (L4).' },
    { q: 'How many layers does the TCP/IP model have and what are they?', a: 'Four: Link (network access), Internet, Transport, Application.' },
    { q: 'What is the default TCP MSS on a standard Ethernet IPv4 path?', a: '1460 bytes (1500 MTU - 20 IPv4 - 20 TCP); 1448 effective with TCP timestamps.' },
    { q: 'What changes in a packet at each router hop (no NAT)?', a: 'Always: the L2 header (source/destination MAC), the TTL / Hop Limit, and the IPv4 header checksum. Possibly: DSCP re-marking, ECN set to CE by a congested router, and IPv4 fragmentation if DF is clear. IP addresses and ports stay the same without NAT.' },
    { q: 'Can IPv6 routers fragment packets?', a: 'No. Only the source host can fragment in IPv6; routers send ICMPv6 Packet Too Big. Minimum IPv6 MTU is 1280.' },
    { q: 'At which layer does an AWS ALB operate, and an NLB?', a: 'ALB is L7 (HTTP/HTTPS/gRPC); NLB is L4 (TCP/UDP/TLS).' },
    { q: 'How much overhead does VXLAN add?', a: 'About 50 bytes (outer Ethernet 14 + outer IPv4 20 + UDP 8 + VXLAN 8), so inner MTU is typically 1450 on a 1500 network.' },
    { q: 'What do the DSCP and ECN bits in the IP header do, and can they change in transit?', a: 'DSCP (6 bits) marks QoS class and is often re-marked or zeroed at network trust boundaries; ECN (2 bits) lets a congested router mark CE instead of dropping, which the receiver echoes so the sender slows down. Both may legitimately change along the path.' }
  ],
  resources: [
    { title: 'RFC 1122 — Requirements for Internet Hosts (Communication Layers)', url: 'https://datatracker.ietf.org/doc/html/rfc1122', type: 'docs' },
    { title: 'Cloudflare Learning — What is the OSI model?', url: 'https://www.cloudflare.com/learning/ddos/glossary/open-systems-interconnection-model-osi/', type: 'article' },
    { title: 'Cloudflare Learning — What is MTU?', url: 'https://www.cloudflare.com/learning/network-layer/what-is-mtu/', type: 'article' },
    { title: 'High Performance Browser Networking (Ilya Grigorik) — free online book', url: 'https://hpbn.co/', type: 'book' }
  ]
},
// ───────────────────────────── Module 2 ─────────────────────────────
{
  n: 2,
  title: 'IP Addressing & Routing',
  summary: 'IPv4/IPv6 addressing, CIDR and subnetting you can do on a whiteboard, private ranges and NAT, the L2 glue (ARP, MAC, DHCP, VLANs), routing tables and longest-prefix match, and how BGP and anycast move traffic across the Internet. Essential for VPC design, Kubernetes networking and debugging connectivity.',
  topics: [
    {
      title: 'IPv4 & IPv6 Addressing',
      def: `<p><strong>IPv4</strong>: 32-bit addresses in dotted-decimal (<code>203.0.113.10</code>), ~4.3 billion total, exhausted at the RIR level — hence NAT everywhere and paid public IPv4 (AWS charges per public IPv4 since 2024).</p>
<p><strong>IPv6</strong>: 128-bit addresses in 8 groups of 16-bit hex: <code>2001:0db8:0000:0000:0000:ff00:0042:8329</code> → shortened to <code>2001:db8::ff00:42:8329</code> (drop leading zeros per group; replace <em>one</em> longest run of zero groups with <code>::</code>).</p>
<table>
<thead><tr><th>Purpose</th><th>IPv4</th><th>IPv6</th></tr></thead>
<tbody>
<tr><td>Loopback</td><td>127.0.0.0/8</td><td>::1/128</td></tr>
<tr><td>Private / unique local</td><td>10/8, 172.16/12, 192.168/16</td><td>fc00::/7 (ULA, used as fd00::/8)</td></tr>
<tr><td>Link-local</td><td>169.254.0.0/16</td><td>fe80::/10</td></tr>
<tr><td>Global unicast</td><td>everything else public</td><td>2000::/3</td></tr>
<tr><td>Documentation</td><td>192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24</td><td>2001:db8::/32</td></tr>
<tr><td>Broadcast</td><td>yes (255.255.255.255, subnet broadcast)</td><td>none — multicast only (ff00::/8)</td></tr>
</tbody>
</table>
<p>IPv6 differences that matter in practice: a standard LAN subnet is always <strong>/64</strong>; hosts self-configure with <strong>SLAAC</strong> (or DHCPv6); <strong>NDP</strong> (ICMPv6) replaces ARP, so blocking all ICMPv6 breaks IPv6; the header is a fixed 40 bytes with no checksum and no router fragmentation. Dual-stack clients use <strong>Happy Eyeballs</strong> (RFC 8305): race IPv6 and IPv4 connections and use whichever connects first — Go's <code>net.Dialer</code> does this by default (<code>FallbackDelay</code> 300 ms).</p>
<p><strong>Adoption reality (2025–26)</strong>: roughly half of Google's users now reach it over IPv6, driven by mobile carriers and large ISPs; many mobile networks are <strong>IPv6-only</strong> and reach IPv4-only sites through <strong>NAT64 + DNS64</strong> (the resolver synthesises <code>64:ff9b::/96</code> AAAA records) or <strong>464XLAT</strong> on the handset. Enterprise and cloud-internal networks lag. In AWS, dual-stack VPCs, IPv6-only subnets and IPv6 EKS clusters are available; IPv6-only workloads need DNS64 + NAT64 on the NAT gateway to call IPv4-only services. Practical consequences: always publish AAAA records for public endpoints (with matching security-group and NACL rules for <code>::/0</code>), test that your service actually listens on <code>[::]</code>, and remember that a "works on IPv4, times out on IPv6" bug is masked by Happy Eyeballs on some clients and fatal on IPv6-only ones.</p>`,
      interview: 'Expect "how many addresses in a /64?" (2^64) and "why does IPv6 not need NAT?" (enough addresses for end-to-end reachability; use stateful firewalls for security instead). Know that 169.254.169.254 is the cloud metadata endpoint — a classic SSRF target.',
      examples: [
        { label: 'Inspect addresses on Linux', lang: 'bash', code: `$ ip -brief addr
lo        UNKNOWN  127.0.0.1/8 ::1/128
eth0      UP       10.0.12.34/20 2600:1f18:abcd:1200:8f1:2a3b:4c5d:6e7f/128 fe80::8f1:2aff:fe3b:4c5d/64

$ ip -6 neigh        # NDP table (IPv6 equivalent of the ARP cache)
fe80::1 dev eth0 lladdr 02:4f:aa:bb:cc:01 router REACHABLE` }
      ]
    },
    {
      title: 'CIDR & Subnetting (Worked Examples)',
      def: `<p><strong>CIDR</strong> notation <code>a.b.c.d/n</code> means the first <em>n</em> bits are the network prefix; the remaining <code>32 − n</code> bits address hosts. Size = 2<sup>32−n</sup>. In a classic subnet, the first address is the <strong>network</strong> address and the last is <strong>broadcast</strong>, so usable hosts = 2<sup>32−n</sup> − 2 (/31 point-to-point and /32 host routes are exceptions). <strong>AWS reserves 5</strong> addresses per subnet (network, +1 router, +2 DNS, +3 reserved, broadcast); Azure also reserves 5.</p>
<table>
<thead><tr><th>Prefix</th><th>Mask</th><th>Addresses</th><th>Block size in last changing octet</th></tr></thead>
<tbody>
<tr><td>/16</td><td>255.255.0.0</td><td>65,536</td><td>1 in 2nd octet</td></tr>
<tr><td>/20</td><td>255.255.240.0</td><td>4,096</td><td>16 in 3rd octet</td></tr>
<tr><td>/24</td><td>255.255.255.0</td><td>256</td><td>1 in 3rd octet</td></tr>
<tr><td>/26</td><td>255.255.255.192</td><td>64</td><td>64</td></tr>
<tr><td>/27</td><td>255.255.255.224</td><td>32</td><td>32</td></tr>
<tr><td>/28</td><td>255.255.255.240</td><td>16</td><td>16</td></tr>
</tbody>
</table>
<p><strong>Method ("magic number")</strong>: block size = 256 − mask octet. Network = largest multiple of block size ≤ the address octet.</p>
<p><strong>Example 1</strong> — <code>192.168.10.77/27</code>: mask 255.255.255.224, block 32. Multiples: 0, 32, 64, 96… → network <code>192.168.10.64</code>, broadcast <code>.95</code>, usable <code>.65–.94</code> (30 hosts).</p>
<p><strong>Example 2</strong> — split <code>10.0.0.0/16</code> into 4: need 2 extra bits → <strong>/18</strong> (16,384 addresses each): <code>10.0.0.0/18</code>, <code>10.0.64.0/18</code>, <code>10.0.128.0/18</code>, <code>10.0.192.0/18</code>.</p>
<p><strong>Example 3</strong> — do <code>10.1.0.0/16</code> and <code>10.1.128.0/17</code> overlap? Yes: the /17 is the upper half of the /16. Overlap checks matter for VPC peering, VPNs and Kubernetes pod/service CIDRs.</p>`,
      interview: 'Do subnetting out loud and fast: block size, network, broadcast, usable range. Then connect it to real design: "I would give the VPC a /16, use /20 private subnets per AZ because EKS with the VPC CNI assigns a VPC IP to every pod, and keep space free for future AZs." Never pick overlapping ranges with on-prem or other VPCs.',
      examples: [
        { label: 'Subnet math with ipcalc', lang: 'bash', code: `$ ipcalc 192.168.10.77/27
Address:   192.168.10.77        11000000.10101000.00001010.010 01101
Netmask:   255.255.255.224 = 27 11111111.11111111.11111111.111 00000
Network:   192.168.10.64/27
HostMin:   192.168.10.65
HostMax:   192.168.10.94
Broadcast: 192.168.10.95
Hosts/Net: 30` }
      ]
    },
    {
      title: 'Private Ranges, NAT & PAT',
      def: `<p><strong>RFC 1918 private ranges</strong> are not routed on the public Internet: <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code> (172.16.0.0–172.31.255.255), <code>192.168.0.0/16</code>. Also know <code>100.64.0.0/10</code> (RFC 6598, carrier-grade NAT; also used by Tailscale and some EKS secondary CIDRs) and <code>169.254.0.0/16</code> (link-local).</p>
<p><strong>NAT</strong> rewrites addresses in flight and keeps state in a translation table (Linux: <code>conntrack</code>):</p>
<ul>
<li><strong>SNAT</strong> (source NAT): private client → shared public IP on egress (home router, AWS NAT Gateway, Kubernetes node masquerade for pod egress).</li>
<li><strong>DNAT</strong> (destination NAT): public IP:port → private backend (port forwarding, kube-proxy Service VIP → pod IP, L4 LBs).</li>
<li><strong>PAT / NAPT</strong> ("NAT overload"): many hosts share one IP; uniqueness comes from rewriting the <em>source port</em>. Limit: ~64K ports per (public IP, destination IP, destination port, protocol) tuple.</li>
</ul>
<p>Production gotchas:</p>
<ul>
<li><strong>NAT port exhaustion</strong>: AWS NAT Gateway supports ~55,000 simultaneous connections to each unique destination (IP, port, protocol); exceeding it shows up as the <code>ErrorPortAllocation</code> metric. Fix: more NAT IPs/gateways, connection pooling/keep-alive, VPC endpoints for AWS APIs.</li>
<li><strong>Idle timeouts</strong>: NAT/conntrack entries expire (AWS NAT GW: 350 s idle). Long idle connections silently die; use TCP keep-alives shorter than the NAT timeout.</li>
<li><strong>conntrack table full</strong>: <code>nf_conntrack: table full, dropping packet</code> in dmesg on busy Kubernetes nodes.</li>
<li>NAT breaks end-to-end addressing: peer-to-peer apps need STUN/TURN/ICE; servers see the NAT IP, not the client's.</li>
</ul>`,
      interview: 'Know the difference between SNAT, DNAT and PAT and tie each to something real (NAT Gateway, kube-proxy, home router). The senior-level probe is NAT port exhaustion and idle-timeout behaviour — mention ErrorPortAllocation, keep-alives and VPC endpoints.',
      examples: [
        { label: 'Inspect NAT state on a Linux gateway / Kubernetes node', lang: 'bash', code: `# SNAT (masquerade) pod egress to the node IP
$ sudo iptables -t nat -A POSTROUTING -s 10.244.0.0/16 ! -d 10.244.0.0/16 -j MASQUERADE

# Look at live translations
$ sudo conntrack -L -p tcp --dport 443 | head -2
tcp 6 431999 ESTABLISHED src=10.244.1.7 dst=52.94.1.10 sport=43122 dport=443 \\
    src=52.94.1.10 dst=10.0.12.34 sport=443 dport=43122 [ASSURED] mark=0 use=1

$ sudo sysctl net.netfilter.nf_conntrack_count net.netfilter.nf_conntrack_max
net.netfilter.nf_conntrack_count = 182311
net.netfilter.nf_conntrack_max = 262144` }
      ]
    },
    {
      title: 'Layer 2 Glue: MAC, ARP, DHCP & VLANs',
      def: `<p>A <strong>MAC address</strong> is a 48-bit L2 address (<code>02:42:ac:11:00:02</code>) used only within a broadcast domain. Switches learn MAC → port mappings and forward frames accordingly.</p>
<p><strong>ARP</strong> (Address Resolution Protocol) maps an IPv4 address to a MAC on the local segment: the host broadcasts "who has 10.0.0.1? tell 10.0.0.5", the owner replies unicast, and the result is cached in the neighbour table (<code>ip neigh</code>). For off-subnet destinations, the host ARPs for the <strong>default gateway</strong>, not the remote server. <strong>Gratuitous ARP</strong> (unsolicited announcement) is how VIP failover works (keepalived/VRRP, MetalLB L2 mode): the new owner announces "10.0.0.100 is now at my MAC". IPv6 uses <strong>NDP</strong> (Neighbor Solicitation/Advertisement) instead.</p>
<p><strong>DHCP</strong> assigns IP, mask, gateway, DNS servers and lease time via <strong>DORA</strong>: Discover (broadcast) → Offer → Request → Acknowledge, over UDP 67/68. Relays (ip helper) forward DHCP across subnets. Cloud VPCs run DHCP for you (DHCP option sets in AWS).</p>
<p><strong>VLANs</strong> (IEEE 802.1Q) split one physical switch into multiple isolated L2 broadcast domains by adding a 4-byte tag with a 12-bit VLAN ID (1–4094 usable). <strong>Access ports</strong> carry one untagged VLAN; <strong>trunk ports</strong> carry many tagged VLANs. Traffic between VLANs must be routed (L3). VLAN limits (4094) and L2 scaling limits are why data centres and clouds use overlays like <strong>VXLAN</strong> (24-bit VNI, ~16M segments).</p>`,
      interview: 'ARP questions often hide in "what happens when you ping a host": ARP for gateway first, ARP cache, gratuitous ARP for failover. Mention ARP spoofing as the security angle and VXLAN as the reason cloud networks are not limited to 4094 VLANs.',
      examples: [
        { label: 'ARP / neighbour table and an ARP exchange', lang: 'text', code: `$ ip neigh
10.0.0.1 dev eth0 lladdr 02:4f:aa:bb:cc:01 REACHABLE
10.0.0.23 dev eth0 lladdr 02:4f:aa:bb:cc:17 STALE

$ sudo tcpdump -i eth0 -n arp
ARP, Request who-has 10.0.0.1 tell 10.0.0.5, length 28
ARP, Reply 10.0.0.1 is-at 02:4f:aa:bb:cc:01, length 28
ARP, Request who-has 10.0.0.100 tell 10.0.0.100, length 28   <- gratuitous ARP (VIP moved)` }
      ]
    },
    {
      title: 'Routing Tables, Default Gateway & Longest-Prefix Match',
      def: `<p>Every host and router has a <strong>routing table</strong>: a list of destination prefixes with a next hop (gateway) and/or outgoing interface. Lookup uses <strong>longest-prefix match</strong>: the most specific matching route wins, regardless of order. <code>0.0.0.0/0</code> (the <strong>default route</strong>) matches everything and therefore loses to any more specific route; its next hop is the <strong>default gateway</strong>.</p>
<ul>
<li><strong>Connected routes</strong>: created automatically for each interface's subnet (deliver directly via ARP).</li>
<li><strong>Static routes</strong>: configured by hand or by cloud route tables (e.g. <code>0.0.0.0/0 → igw-…</code> for public subnets, <code>0.0.0.0/0 → nat-…</code> for private subnets).</li>
<li><strong>Dynamic routes</strong>: learned via routing protocols — OSPF/IS-IS inside an organisation, BGP between organisations (and in Calico/Cilium for pod routes).</li>
<li><strong>ECMP</strong>: multiple equal-cost next hops; flows are hashed (5-tuple) across them — the basis of L3/L4 load balancing in data centres.</li>
</ul>
<p>Tie-breakers when prefixes are equal: administrative distance (route source trust), then metric. Linux also supports multiple tables and <strong>policy routing</strong> (<code>ip rule</code>) — used by AWS VPC CNI and VPNs. A common cloud gotcha: a "public" subnet is just a subnet whose route table has a default route to an Internet Gateway; instances also need a public IP to be reachable.</p>`,
      interview: 'If asked "how does a router decide where to send a packet", say longest-prefix match first, then administrative distance/metric, then ECMP hashing. Use ip route get to show the decision. Bonus: asymmetric routing breaks stateful firewalls and conntrack-based NAT.',
      examples: [
        { label: 'Read the routing table and ask the kernel for a decision', lang: 'bash', code: `$ ip route
default via 10.0.0.1 dev eth0 proto dhcp metric 100
10.0.0.0/20 dev eth0 proto kernel scope link src 10.0.12.34
10.244.0.0/16 via 10.0.0.50 dev eth0          # pod CIDR via a peer node
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1

$ ip route get 10.244.3.9
10.244.3.9 via 10.0.0.50 dev eth0 src 10.0.12.34 uid 1000   # /16 beats default /0
$ ip route get 8.8.8.8
8.8.8.8 via 10.0.0.1 dev eth0 src 10.0.12.34 uid 1000       # only default matches` }
      ]
    },
    {
      title: 'BGP Basics & Anycast',
      def: `<p><strong>BGP</strong> (Border Gateway Protocol, RFC 4271) is the routing protocol of the Internet. The Internet is ~75,000+ <strong>Autonomous Systems</strong> (ASes, each with an ASN) that announce the IP prefixes they own to neighbours. BGP is a <strong>path-vector</strong> protocol over TCP port 179: each route carries the <code>AS_PATH</code> it travelled, which prevents loops and is a key input to path selection (along with local preference, MED, etc. — policy beats shortest path).</p>
<ul>
<li><strong>eBGP</strong> between ASes; <strong>iBGP</strong> within one AS.</li>
<li>Withdrawing a route removes reachability globally within seconds to minutes. The <strong>Facebook outage of October 2021</strong> happened when a config change took down backbone connectivity and DNS servers then withdrew their BGP announcements — Facebook's authoritative DNS vanished from the Internet.</li>
<li><strong>Route leaks/hijacks</strong>: someone announces a prefix they do not own (or a more specific one, which wins by longest-prefix match). Mitigation: <strong>RPKI</strong> route origin validation.</li>
<li>In Kubernetes, <strong>Calico</strong> and <strong>Cilium</strong> can peer with top-of-rack routers via BGP to advertise pod CIDRs; <strong>MetalLB BGP mode</strong> advertises Service VIPs.</li>
</ul>
<p><strong>Anycast</strong>: the same prefix is announced from many locations; BGP delivers each client to the topologically nearest site. Used by DNS (all 13 root server identities, 1.1.1.1, 8.8.8.8), CDNs and DDoS scrubbing — attack traffic is spread across all sites. Anycast works best for short UDP exchanges or with ECMP-stable paths; route changes mid-connection can move a TCP flow to another site, which CDNs handle with consistent hashing and connection state sharing.</p>`,
      interview: 'You will not be asked to configure BGP, but you should explain AS, prefix announcement, AS_PATH, why the more-specific route wins (hijacks), and how anycast gives global load distribution and DDoS absorption. Citing the 2021 Facebook outage is a strong, concrete example.',
      examples: [
        { label: 'Look up who announces a prefix and trace an anycast address', lang: 'bash', code: `# Which AS originates 1.1.1.1? (Team Cymru whois)
$ whois -h whois.cymru.com " -v 1.1.1.1"
AS      | IP       | BGP Prefix  | CC | Registry | Allocated  | AS Name
13335   | 1.1.1.1  | 1.1.1.0/24  | US | arin     | 2010-07-14 | CLOUDFLARENET, US

# The same anycast IP terminates in a nearby PoP for each client
$ dig +short CH TXT id.server @1.1.1.1
"BOM"        # Mumbai PoP when queried from India` }
      ]
    }
  ],
  problems: [
    {
      t: 'Subnet 10.0.0.0/16 into 4 equal subnets',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>4 subnets = 2<sup>2</sup> → borrow 2 bits: /16 + 2 = /18.</li><li>Block size in the 3rd octet = 256 / 4 = 64.</li><li>List network, broadcast and usable range for each; subtract 5 per subnet if this is AWS.</li></ul>`,
      solution: `New prefix: /18 (16,384 addresses each, 16,382 usable classic; 16,379 in AWS)

Subnet 1: 10.0.0.0/18    range 10.0.0.0   - 10.0.63.255   (usable 10.0.0.1  - 10.0.63.254)
Subnet 2: 10.0.64.0/18   range 10.0.64.0  - 10.0.127.255  (usable 10.0.64.1 - 10.0.127.254)
Subnet 3: 10.0.128.0/18  range 10.0.128.0 - 10.0.191.255
Subnet 4: 10.0.192.0/18  range 10.0.192.0 - 10.0.255.255
Mask: 255.255.192.0`
    },
    {
      t: 'Find network, broadcast and host range for 192.168.10.77/27',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>/27 → mask 255.255.255.224 → block size 32.</li><li>Find the multiple of 32 at or below 77.</li><li>Usable = 2<sup>5</sup> − 2.</li></ul>`,
      solution: `Mask: 255.255.255.224, block size 32
Network:   192.168.10.64
Broadcast: 192.168.10.95
Usable:    192.168.10.65 - 192.168.10.94 (30 hosts)
Next subnet starts at 192.168.10.96`
    },
    {
      t: 'Classify addresses: private, public, link-local, CGNAT or special',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Check: 172.32.5.10, 172.20.1.1, 100.72.0.5, 169.254.169.254, 192.0.2.10, fd12:3456::1, fe80::1.</li><li>172.16.0.0/12 ends at 172.31.255.255.</li></ul>`,
      solution: `172.32.5.10      public (outside 172.16.0.0/12, a classic trick question)
172.20.1.1       private RFC 1918
100.72.0.5       CGNAT shared space 100.64.0.0/10 (RFC 6598) - not RFC 1918 but not public
169.254.169.254  link-local; cloud instance metadata service (SSRF target - use IMDSv2)
192.0.2.10       TEST-NET-1 documentation range, never routed
fd12:3456::1     IPv6 Unique Local Address (fc00::/7)
fe80::1          IPv6 link-local (often the default gateway's link-local address)`
    },
    {
      t: 'Write a CIDR subnet splitter in Go with net/netip',
      d: 'medium',
      type: 'coding',
      hint: `<ul><li>Use <code>netip.ParsePrefix</code>, <code>Prefix.Masked()</code>, <code>Addr.As4()</code>.</li><li>N subnets must be a power of two; new prefix = bits + log2(N).</li><li>Convert the address to <code>uint32</code>, add i × block size, convert back.</li><li>Guard against prefix length &gt; 32 and IPv6 input.</li></ul>`,
      solution: `package main

import (
    "encoding/binary"
    "fmt"
    "math/bits"
    "net/netip"
)

func Split(p netip.Prefix, n int) ([]netip.Prefix, error) {
    if !p.Addr().Is4() {
        return nil, fmt.Errorf("only IPv4 supported")
    }
    if n <= 0 || n&(n-1) != 0 {
        return nil, fmt.Errorf("n must be a power of two, got %d", n)
    }
    extra := bits.TrailingZeros(uint(n))
    newLen := p.Bits() + extra
    if newLen > 32 {
        return nil, fmt.Errorf("cannot split /%d into %d subnets", p.Bits(), n)
    }
    a4 := p.Masked().Addr().As4()
    base := uint64(binary.BigEndian.Uint32(a4[:]))
    size := uint64(1) << (32 - newLen)
    out := make([]netip.Prefix, 0, n)
    for i := 0; i < n; i++ {
        var b [4]byte
        binary.BigEndian.PutUint32(b[:], uint32(base+uint64(i)*size))
        out = append(out, netip.PrefixFrom(netip.AddrFrom4(b), newLen))
    }
    return out, nil
}

func Broadcast(p netip.Prefix) netip.Addr {
    a4 := p.Masked().Addr().As4()
    v := binary.BigEndian.Uint32(a4[:]) | (^uint32(0) >> p.Bits())
    var b [4]byte
    binary.BigEndian.PutUint32(b[:], v)
    return netip.AddrFrom4(b)
}

func main() {
    subs, err := Split(netip.MustParsePrefix("10.0.0.0/16"), 4)
    if err != nil {
        panic(err)
    }
    for _, s := range subs {
        fmt.Printf("%-16s first=%s broadcast=%s\\n", s, s.Addr().Next(), Broadcast(s))
    }
    // Overlap check is built in:
    fmt.Println(netip.MustParsePrefix("10.1.0.0/16").Overlaps(netip.MustParsePrefix("10.1.128.0/17")))
}`,
      lang: 'go'
    },
    {
      t: 'Trace routing decisions on a Linux host',
      d: 'medium',
      type: 'hands-on',
      hint: `<ul><li>Use <code>ip route</code>, <code>ip route get</code>, <code>ip rule</code>, <code>ip neigh</code>.</li><li>Add a more-specific static route and observe it win over the default.</li><li>Use <code>traceroute -n</code> to confirm the first hop.</li></ul>`,
      solution: `ip route                              # list main table
ip route get 8.8.8.8                  # which route/next hop/source IP is chosen
sudo ip route add 192.0.2.0/24 via 10.0.0.254 dev eth0
ip route get 192.0.2.10               # now via 10.0.0.254 (longest prefix wins)
ip rule                               # policy routing rules (VPC CNI, VPNs add these)
ip neigh show 10.0.0.254              # ARP entry for the next hop
traceroute -n 192.0.2.10              # first hop should be 10.0.0.254
sudo ip route del 192.0.2.0/24`
    },
    {
      t: 'Design an IP plan for a multi-AZ VPC running EKS',
      d: 'medium',
      type: 'design',
      hint: `<ul><li>3 AZs × (public, private-app, private-data) subnets.</li><li>EKS VPC CNI gives every pod a VPC IP — size private subnets generously or use prefix delegation / a secondary 100.64.0.0/16 CIDR.</li><li>Avoid overlap with on-prem, other VPCs (peering/Transit Gateway) and the Kubernetes service CIDR.</li><li>Leave room to grow (a 4th AZ, new tiers).</li></ul>`,
      solution: `VPC: 10.20.0.0/16 (checked against IPAM: no overlap with on-prem 10.0.0.0/12 or other VPCs)

Private app (EKS nodes + pods), one /19 per AZ (8,187 usable each):
  10.20.0.0/19  (az-a)   10.20.32.0/19 (az-b)   10.20.64.0/19 (az-c)   10.20.96.0/19 (spare az-d)
Private data (RDS, ElastiCache), /22 per AZ:
  10.20.128.0/22  10.20.132.0/22  10.20.136.0/22
Public (ALB/NLB, NAT GW), /24 per AZ:
  10.20.192.0/24  10.20.193.0/24  10.20.194.0/24
Reserved for future: 10.20.200.0/21 and up

Kubernetes Service CIDR: 172.20.0.0/16 (EKS default, must not overlap VPC)
If pods outgrow the plan: add secondary CIDR 100.64.0.0/16 for pods (custom networking)
or enable prefix delegation (/28 per ENI slot) to raise pods-per-node density.
Route tables: public -> IGW; private -> NAT GW in same AZ (avoid cross-AZ charges);
add Gateway VPC endpoints for S3/DynamoDB to bypass NAT.`
    },
    {
      t: 'Debug: VPC peering or VPN connects but some hosts are unreachable (overlapping CIDRs)',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Compare CIDRs of both sides, including Docker bridge (172.17.0.0/16), Kubernetes pod/service CIDRs and VPN client pools.</li><li>Run <code>ip route get</code> for the unreachable IP on the source host — which interface wins?</li><li>Remember longest-prefix match.</li></ul>`,
      solution: `Typical findings:
- Remote network 172.17.0.0/16 overlaps the local Docker bridge => ip route get 172.17.5.4
  shows "dev docker0": packets never leave the host.
- AWS refuses peering for overlapping VPC CIDRs; with Transit Gateway/VPN, the more specific
  local route silently wins.
- Kubernetes Service CIDR 10.96.0.0/12 overlapping an on-prem range => kube-proxy DNATs or
  routes locally.

Fixes:
- Re-address one side (best long-term; use an IPAM tool / central registry).
- Change Docker's bip / default-address-pools in daemon.json.
- Use NAT (e.g. private NAT gateway) to translate one side into a non-overlapping range.
- Use PrivateLink / VPC endpoints (service-level connectivity, no routing needed).`
    },
    {
      t: 'Debug: intermittent outbound connection failures through a NAT gateway',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>Many pods calling the same third-party API IP:443 through one NAT gateway.</li><li>Look at <code>ErrorPortAllocation</code> and <code>ActiveConnectionCount</code> metrics; client sees connect timeouts.</li><li>Also check idle-timeout drops (350 s) for long-lived idle connections.</li><li>Think: pooling, keep-alive, more NAT IPs, VPC endpoints.</li></ul>`,
      solution: `Root cause: PAT port exhaustion. A NAT IP has ~55,000 ports per unique destination
(IP, port, protocol). Thousands of short-lived connections (no HTTP keep-alive, each
followed by TIME_WAIT on the NAT side) to one API endpoint exhaust them.

Evidence:
- CloudWatch NAT GW ErrorPortAllocation > 0, PacketsDropCount rising.
- App logs: "dial tcp ...:443: i/o timeout" bursts under peak load.

Fixes (layered):
1. Reuse connections: Go http.Transport with MaxIdleConnsPerHost sized to concurrency
   (default is only 2!), always drain and close resp.Body.
2. Add secondary IPs to the NAT gateway (up to 8 per GW in AWS) or more NAT gateways.
3. Use VPC endpoints / PrivateLink for AWS services (S3, DynamoDB, STS, ECR) to bypass NAT.
4. For long-lived idle connections, enable TCP keep-alive below 350 s so NAT state is kept.
5. Alert on ErrorPortAllocation.`
    },
    {
      t: 'Explain how anycast + BGP provides global failover for a DNS service',
      d: 'hard',
      type: 'design',
      hint: `<ul><li>Same /24 announced from many PoPs; BGP picks nearest by AS_PATH/policy.</li><li>Health checking: a PoP withdraws its announcement when unhealthy.</li><li>Why /24? (Most networks filter IPv4 prefixes longer than /24.)</li><li>What happens to in-flight TCP connections when routes change?</li></ul>`,
      solution: `Design
- Obtain a /24 (IPv4) and /48 (IPv6) - the smallest prefixes widely accepted in the global table.
- Announce the same prefixes from every PoP via eBGP to transit and IX peers.
- Each PoP runs a local health checker; if the DNS service fails, the router withdraws the
  announcement (e.g. ExaBGP / BIRD with health checks). Traffic re-converges to the next
  nearest PoP in seconds.
- Use AS_PATH prepending / communities to steer or drain traffic from a PoP for maintenance.

Properties
- Clients reach the nearest healthy PoP with no client-side logic or DNS TTL wait.
- DDoS is distributed across all PoPs instead of concentrated on one.
- DNS over UDP is ideal: one request/response, so route flaps rarely break anything.
- For TCP (DoT/DoH), a route change can shift a flow to a PoP without state => RST.
  Mitigate with stable ECMP hashing within a PoP and short-lived connections.
- Protect announcements with RPKI ROAs to prevent hijacks.`
    }
  ],
  interviewFocus: [
    {
      q: 'Explain NAT. What problems does it cause for backend systems at scale?',
      a: `<p>NAT rewrites IP addresses (and with PAT, ports) as packets cross a device, keeping a stateful translation table. <strong>SNAT</strong> lets private hosts share public IPs for egress; <strong>DNAT</strong> maps a public or virtual IP to a private backend (port forwarding, kube-proxy, L4 LBs).</p>
<p>Problems at scale:</p>
<ul>
<li><strong>Port exhaustion</strong>: ~64K source ports per (NAT IP, destination IP:port, protocol); short-lived connections to one popular destination exhaust them.</li>
<li><strong>State limits</strong>: conntrack tables fill on busy nodes (<code>nf_conntrack: table full</code>); NAT devices have connection limits.</li>
<li><strong>Idle timeouts</strong> silently kill idle long-lived connections (DB pools, gRPC streams) — need keep-alives.</li>
<li><strong>Loss of client identity</strong>: servers see the NAT IP; IP-based rate limiting penalises everyone behind a corporate or CGNAT IP.</li>
<li><strong>Asymmetric routing</strong> breaks stateful NAT; also breaks end-to-end protocols (P2P, SIP) without STUN/TURN.</li>
</ul>
<p>Mitigations: connection pooling, multiple NAT IPs, VPC endpoints, IPv6 (no NAT required), and alerting on NAT error metrics.</p>`
    },
    {
      q: 'How would you plan IP address space for a company running Kubernetes across multiple VPCs and on-prem?',
      a: `<ul>
<li><strong>Central IPAM</strong>: one source of truth (AWS VPC IPAM, NetBox, Infoblox). Allocate non-overlapping blocks per region/environment (e.g. 10.0.0.0/12 on-prem, 10.16.0.0/12 AWS prod, 10.32.0.0/12 AWS non-prod).</li>
<li><strong>Size for pods</strong>: with flat pod networking (AWS VPC CNI, Azure CNI) every pod consumes a VPC IP; use large private subnets, prefix delegation, or secondary non-routable CIDRs (100.64.0.0/10) for pods with SNAT at the node.</li>
<li><strong>Overlay CNIs</strong> (Calico VXLAN, Cilium overlay) decouple pod IPs from the VPC, so pod CIDRs can be reused between clusters if pods never need direct routing.</li>
<li><strong>Reserve</strong> the Kubernetes Service CIDR, Docker bridge ranges and VPN client pools so they never collide.</li>
<li><strong>Plan for growth</strong>: leave unallocated blocks per region and per AZ; changing CIDRs later means migrations.</li>
<li><strong>IPv6</strong>: consider IPv6-only or dual-stack clusters to eliminate exhaustion and NAT entirely (EKS and GKE support IPv6 pods).</li>
</ul>`
    },
    {
      q: 'What is longest-prefix match and why does it matter for security (BGP hijacking)?',
      a: `<p>When multiple routes match a destination, the router chooses the one with the <strong>longest (most specific) prefix</strong>. <code>10.1.2.0/24</code> beats <code>10.1.0.0/16</code> which beats <code>0.0.0.0/0</code>.</p>
<p>In BGP this means an attacker (or a misconfigured network) announcing a <em>more specific</em> prefix than the legitimate owner attracts all traffic for that range globally — a <strong>BGP hijack</strong>. Famous incidents include the 2008 Pakistan Telecom YouTube hijack and the 2018 Amazon Route 53 hijack used to steal cryptocurrency via DNS.</p>
<p>Defences: <strong>RPKI</strong> Route Origin Authorizations with route origin validation at ISPs; announcing /24s yourself so nobody can be more specific (most networks filter longer than /24); BGP monitoring (e.g. Cloudflare Radar, BGPStream); and, at the application layer, <strong>TLS</strong> so a hijacker cannot impersonate your service without a valid certificate.</p>`
    },
    {
      q: 'How do ARP and gratuitous ARP enable high-availability virtual IPs, and what are the limits?',
      a: `<p>With VRRP/keepalived (or MetalLB in L2 mode), two or more nodes share a virtual IP. Only the active node answers ARP for the VIP. On failover the new active node sends <strong>gratuitous ARP</strong> announcing VIP → its MAC; switches and hosts update their caches and traffic moves within seconds.</p>
<p>Limits:</p>
<ul>
<li>Works only inside one L2 broadcast domain (one subnet/VLAN); not across AZs or regions.</li>
<li>All traffic for the VIP goes through a single node — no load spreading (MetalLB L2 is failover only).</li>
<li>Most public clouds do not support gratuitous ARP for arbitrary IPs; you use cloud LBs, secondary IP reassignment via API, or BGP instead.</li>
<li>Stale ARP caches on some devices can delay failover; split-brain if both nodes think they are active.</li>
</ul>
<p>For multi-node load spreading, use <strong>BGP + ECMP</strong> (MetalLB BGP mode, Calico) or a cloud L4 LB.</p>`
    }
  ],
  quiz: [
    { q: 'List the three RFC 1918 private IPv4 ranges.', a: '10.0.0.0/8, 172.16.0.0/12 (172.16.0.0-172.31.255.255) and 192.168.0.0/16.' },
    { q: 'How many usable hosts are in a /26 (classic) and in an AWS /26 subnet?', a: '62 classic (64 - 2); 59 in AWS because AWS reserves 5 addresses per subnet.' },
    { q: 'What replaces ARP in IPv6?', a: 'Neighbor Discovery Protocol (NDP), which uses ICMPv6 Neighbor Solicitation and Neighbor Advertisement messages.' },
    { q: 'What are the four DHCP messages in order?', a: 'Discover, Offer, Request, Acknowledge (DORA).' },
    { q: 'Which route wins for 10.1.2.3: 10.0.0.0/8, 10.1.0.0/16 or 0.0.0.0/0?', a: '10.1.0.0/16 - longest prefix match chooses the most specific matching route.' },
    { q: 'What is anycast?', a: 'Announcing the same IP prefix from many locations so BGP routes each client to the nearest one; used by DNS resolvers, root servers and CDNs.' },
    { q: 'How many usable VLAN IDs does 802.1Q support and what overcomes the limit?', a: '4094 (12-bit ID, 0 and 4095 reserved). VXLAN uses a 24-bit VNI, allowing about 16 million segments.' },
    { q: 'What is the difference between SNAT and DNAT?', a: 'SNAT rewrites the source address (egress, many clients share one IP); DNAT rewrites the destination address (port forwarding, Service VIP to pod).' },
    { q: 'How does an IPv6-only client reach an IPv4-only server?', a: 'Through NAT64 + DNS64: the DNS64 resolver synthesises an AAAA record inside 64:ff9b::/96 that embeds the IPv4 address, and a NAT64 gateway translates the IPv6 packets to IPv4 (464XLAT adds a client-side translator for apps that need IPv4 literals).' }
  ],
  resources: [
    { title: 'RFC 1918 — Address Allocation for Private Internets', url: 'https://datatracker.ietf.org/doc/html/rfc1918', type: 'docs' },
    { title: 'RFC 4632 — Classless Inter-domain Routing (CIDR)', url: 'https://datatracker.ietf.org/doc/html/rfc4632', type: 'docs' },
    { title: 'Cloudflare Learning — What is BGP?', url: 'https://www.cloudflare.com/learning/security/glossary/what-is-bgp/', type: 'article' },
    { title: 'Cloudflare Learning — What is anycast?', url: 'https://www.cloudflare.com/learning/cdn/glossary/anycast-network/', type: 'article' }
  ]
},
// ───────────────────────────── Module 3 ─────────────────────────────
{
  n: 3,
  title: 'Transport Layer: TCP, UDP & QUIC',
  summary: 'How TCP really behaves in production: handshakes and teardown, TIME_WAIT and CLOSE_WAIT, sequence numbers, flow vs congestion control (CUBIC, BBR), Nagle and delayed ACK, head-of-line blocking, UDP and QUIC, sockets, ephemeral port exhaustion and keep-alives. Most "the network is slow" incidents are really transport-layer behaviour.',
  topics: [
    {
      title: 'TCP Connection Lifecycle: Handshake, Teardown & States',
      def: `<p><strong>3-way handshake</strong> (connection establishment, 1 RTT before data):</p>
<ol>
<li>Client → <code>SYN</code>, seq = x (random ISN), options: MSS, window scale, SACK-permitted, timestamps. State: <code>SYN_SENT</code>.</li>
<li>Server → <code>SYN-ACK</code>, seq = y, ack = x+1. Server state: <code>SYN_RECEIVED</code> (entry in the <strong>SYN queue</strong>).</li>
<li>Client → <code>ACK</code>, ack = y+1. Both <code>ESTABLISHED</code>; the connection moves to the server's <strong>accept queue</strong> until the app calls <code>accept()</code>.</li>
</ol>
<p><strong>4-way teardown</strong> (each direction closes independently — TCP is full-duplex):</p>
<ol>
<li>Active closer → <code>FIN</code> (<code>FIN_WAIT_1</code>).</li>
<li>Passive side → <code>ACK</code> (passive: <code>CLOSE_WAIT</code>; active: <code>FIN_WAIT_2</code>). The passive side may keep sending data (half-close).</li>
<li>Passive side app calls <code>close()</code> → <code>FIN</code> (<code>LAST_ACK</code>).</li>
<li>Active closer → <code>ACK</code> and enters <strong><code>TIME_WAIT</code></strong>; passive side → <code>CLOSED</code>.</li>
</ol>
<p>Often steps 2 and 3 merge into one FIN-ACK (3 segments). <strong>RST</strong> aborts a connection immediately: sent for a closed port, by <code>SO_LINGER</code> with 0 timeout, by firewalls/LBs on idle timeout, or when data arrives for a socket that no longer exists. Clients see "connection reset by peer".</p>
<p>Server-side queues: <code>net.ipv4.tcp_max_syn_backlog</code> (SYN queue) and the <code>listen()</code> backlog capped by <code>net.core.somaxconn</code> (4096 by default since Linux 5.4). Accept-queue overflow shows up as <code>ListenOverflows</code> in <code>nstat</code> and as client-side SYN retransmits (1 s, 3 s… latency spikes). <strong>SYN cookies</strong> let a server survive SYN floods without SYN-queue state.</p>`,
      interview: 'Draw the state diagram from memory, labelling which side ends in TIME_WAIT (the active closer) and which in CLOSE_WAIT (the passive side, until the application calls close). Interviewers love "what does a pile of CLOSE_WAIT mean?" — it is almost always an application bug that never closes sockets.',
      examples: [
        { label: 'Handshake, request and teardown in tcpdump', lang: 'text', code: `$ sudo tcpdump -i lo -nn 'tcp port 8080'
10:00:00.000 IP 127.0.0.1.51000 > 127.0.0.1.8080: Flags [S],  seq 1000, win 65495, options [mss 65495,sackOK,TS,nop,wscale 7]
10:00:00.000 IP 127.0.0.1.8080 > 127.0.0.1.51000: Flags [S.], seq 5000, ack 1001, win 65483, options [...]
10:00:00.000 IP 127.0.0.1.51000 > 127.0.0.1.8080: Flags [.],  ack 5001
10:00:00.001 IP 127.0.0.1.51000 > 127.0.0.1.8080: Flags [P.], seq 1001:1079, ack 5001, length 78   (HTTP GET)
10:00:00.002 IP 127.0.0.1.8080 > 127.0.0.1.51000: Flags [P.], seq 5001:5190, ack 1079, length 189  (HTTP 200)
10:00:00.003 IP 127.0.0.1.51000 > 127.0.0.1.8080: Flags [F.], seq 1079, ack 5190     <- client closes first
10:00:00.003 IP 127.0.0.1.8080 > 127.0.0.1.51000: Flags [F.], seq 5190, ack 1080
10:00:00.003 IP 127.0.0.1.51000 > 127.0.0.1.8080: Flags [.],  ack 5191               <- client -> TIME_WAIT
S=SYN  .=ACK  P=PUSH  F=FIN  R=RST` }
      ]
    },
    {
      title: 'TIME_WAIT, CLOSE_WAIT & Ephemeral Port Exhaustion',
      def: `<p><strong>TIME_WAIT</strong> is held by the side that closes first for <strong>2 × MSL</strong> (fixed at <strong>60 s</strong> on Linux). Purposes: (1) re-send the final ACK if the peer's FIN is retransmitted, and (2) let delayed segments from the old connection die so they are not mistaken for data in a new connection with the same 4-tuple. TIME_WAIT sockets cost little memory, but they <strong>reserve the 4-tuple</strong>.</p>
<p>A TCP connection is identified by the <strong>4-tuple</strong> (src IP, src port, dst IP, dst port). A client talking to one destination IP:port can have at most as many concurrent + TIME_WAIT connections as it has <strong>ephemeral ports</strong>: Linux default <code>ip_local_port_range = 32768 60999</code> → <strong>28,232 ports</strong>. At 60 s TIME_WAIT that is only ~470 new connections/second to a single backend before <code>connect: cannot assign requested address</code> (EADDRNOTAVAIL).</p>
<p>Fixes, in order of preference:</p>
<ul>
<li><strong>Reuse connections</strong>: HTTP keep-alive / connection pools (Go: raise <code>MaxIdleConnsPerHost</code> from its default of 2; nginx: <code>keepalive</code> in <code>upstream</code>).</li>
<li><code>net.ipv4.tcp_tw_reuse=1</code>: lets <em>outgoing</em> connections reuse a TIME_WAIT 4-tuple when timestamps prove it is safe (Linux default is 2 = loopback only).</li>
<li>Widen <code>ip_local_port_range</code> (e.g. 1024–65535, avoiding listening ports); add more destination IPs/ports or source IPs.</li>
<li>Never use <code>tcp_tw_recycle</code> (broke clients behind NAT; removed in Linux 4.12). Avoid <code>SO_LINGER</code>=0 RST tricks except deliberately.</li>
</ul>
<p><strong>CLOSE_WAIT</strong> means the peer sent FIN but <em>your</em> application has not called <code>close()</code>. It does not time out. Growing CLOSE_WAIT = leaked sockets: in Go, typically an un-closed <code>resp.Body</code>, a handler that returns without <code>conn.Close()</code>, or a goroutine stuck before cleanup.</p>`,
      interview: 'Expected answer shape: who holds TIME_WAIT, why it exists, why it is not a bug, how it exhausts ephemeral ports to a single destination, and the fix hierarchy (keep-alive first, tcp_tw_reuse second, never tw_recycle). Contrast with CLOSE_WAIT, which is always your bug.',
      examples: [
        { label: 'Count socket states and check port range', lang: 'bash', code: `$ ss -tan state time-wait | wc -l
27904
$ ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn
  27903 TIME-WAIT
    412 ESTAB
     38 CLOSE-WAIT
$ ss -tan state time-wait dst 10.0.5.20 | head -3     # all to one upstream?
$ sysctl net.ipv4.ip_local_port_range net.ipv4.tcp_tw_reuse
net.ipv4.ip_local_port_range = 32768    60999
net.ipv4.tcp_tw_reuse = 2
$ nstat -az | grep -E 'TcpExtTW|ListenOverflows'
TcpExtTW                      1293811            0.0` }
      ]
    },
    {
      title: 'Reliability, Flow Control & Congestion Control',
      def: `<p><strong>Sequence numbers</strong> count <em>bytes</em>, not segments. ACKs are <strong>cumulative</strong>: <code>ack=5001</code> means "I have everything up to byte 5000". <strong>SACK</strong> (selective ACK) reports out-of-order blocks so only missing data is resent. Loss detection: <strong>fast retransmit</strong> after 3 duplicate ACKs (or RACK-TLP time-based detection in modern Linux), otherwise the <strong>RTO</strong> timer fires (min 200 ms on Linux, exponential backoff).</p>
<p><strong>Flow control</strong> protects the <em>receiver</em>: the receiver advertises <code>rwnd</code> (free buffer). With the <strong>window scale</strong> option it can exceed 64 KB. A zero window stalls the sender (slow consumer).</p>
<p><strong>Congestion control</strong> protects the <em>network</em>: the sender keeps <code>cwnd</code>. Bytes in flight ≤ min(cwnd, rwnd).</p>
<ul>
<li><strong>Slow start</strong>: start at initcwnd = 10 segments (~14 KB, RFC 6928), double each RTT until loss or <code>ssthresh</code>. This is why a new connection cannot use full bandwidth immediately and why connection reuse matters.</li>
<li><strong>Congestion avoidance</strong>: grow roughly linearly; on loss, cut the window (AIMD).</li>
<li><strong>CUBIC</strong> (Linux/Windows default): loss-based; window grows as a cubic function of time since the last loss — good on high-BDP links but fills buffers (bufferbloat).</li>
<li><strong>BBR</strong> (Google): model-based; estimates bottleneck bandwidth and min RTT and paces sending at that rate. Much better on lossy/long-haul links (random loss does not collapse throughput). Used by Google, YouTube and many CDNs; enable with <code>net.ipv4.tcp_congestion_control=bbr</code> and the <code>fq</code> qdisc. Versions matter: the <code>tcp_bbr</code> module in mainline Linux has long been <strong>BBRv1</strong>, which can starve competing CUBIC flows and ignores loss; <strong>BBRv3</strong> (Google's production version, documented in the IETF CCWG BBR draft) also reacts to loss and ECN and shares bandwidth more fairly, but ships out-of-tree — check which one your kernel actually runs before quoting benchmarks.</li>
<li><strong>Loss recovery states</strong>: 3 duplicate ACKs → fast retransmit + <em>fast recovery</em> (halve cwnd for Reno, ×0.7 for CUBIC, keep sending); an RTO means the ACK clock was lost, so cwnd collapses to 1 segment and slow start begins again — which is why a single timeout hurts far more than a fast retransmit.</li>
<li><strong>ECN</strong>: instead of dropping, an ECN-capable router marks packets CE; the receiver echoes ECE and the sender reduces cwnd without losing data. <strong>L4S</strong> (RFC 9330–9332) pairs ECN marking with scalable congestion controls (e.g. TCP Prague, DCTCP) for very low queueing delay and is being rolled out by some ISPs and Apple platforms.</li>
</ul>
<p><strong>Bandwidth-delay product</strong> (BDP) = bandwidth × RTT = bytes that must be in flight to fill the pipe. 1 Gbit/s × 100 ms = 12.5 MB; if socket buffers (<code>tcp_rmem</code>/<code>tcp_wmem</code>) are smaller, throughput is capped at window ÷ RTT regardless of link speed.</p>`,
      interview: 'The classic trap: "flow control and congestion control are the same thing" — they are not (receiver buffer vs network capacity). Be able to compute BDP and explain why a single TCP stream across regions underperforms (window/RTT limit) and how BBR differs from CUBIC.',
      examples: [
        { label: 'Inspect cwnd, rtt and congestion algorithm per socket', lang: 'bash', code: `$ ss -tin dst 10.0.5.20
ESTAB 0 0 10.0.1.4:43122 10.0.5.20:443
   cubic wscale:7,7 rto:204 rtt:1.25/0.4 mss:1448 cwnd:10 ssthresh:7
   bytes_sent:18234 bytes_acked:18235 send 92.7Mbps pacing_rate 185Mbps
   retrans:0/3 rcv_space:14480

$ sysctl net.ipv4.tcp_available_congestion_control
net.ipv4.tcp_available_congestion_control = reno cubic bbr
$ sudo sysctl -w net.core.default_qdisc=fq net.ipv4.tcp_congestion_control=bbr` }
      ]
    },
    {
      title: 'Nagle, Delayed ACK & Head-of-Line Blocking',
      def: `<p><strong>Nagle's algorithm</strong>: while there is unacknowledged data in flight, buffer small writes until a full MSS accumulates or an ACK arrives. Reduces tiny-packet overhead (originally for telnet keystrokes).</p>
<p><strong>Delayed ACK</strong>: the receiver waits (Linux ~40 ms minimum, Windows 200 ms) hoping to piggyback the ACK on response data or ACK two segments at once.</p>
<p><strong>Together they deadlock briefly</strong>: a <em>write-write-read</em> pattern (e.g. send header, then body in separate writes) — the second small write is held by Nagle waiting for an ACK, and the receiver delays the ACK waiting for more data → a fixed ~40 ms (or 200 ms) stall per request. Fixes: set <code>TCP_NODELAY</code>, or better, coalesce writes (buffered writer, <code>writev</code>). <strong>Go sets TCP_NODELAY on all TCP connections by default</strong> (<code>(*TCPConn).SetNoDelay(true)</code>), so you mostly hit this with other runtimes or proxies. <code>TCP_CORK</code> is the opposite: deliberately batch.</p>
<p><strong>Head-of-line (HOL) blocking</strong> exists at two levels:</p>
<ul>
<li><strong>Application level</strong> (HTTP/1.1): one request at a time per connection; a slow response blocks the ones behind it (pipelining never worked well). HTTP/2 multiplexing solves this.</li>
<li><strong>Transport level</strong> (TCP): TCP delivers a single ordered byte stream, so one lost segment stalls <em>all</em> HTTP/2 streams on that connection until it is retransmitted. On lossy mobile networks HTTP/2 can be slower than several HTTP/1.1 connections. <strong>QUIC</strong> fixes this with independent streams — loss on one stream does not block others.</li>
</ul>`,
      interview: 'A suspicious constant 40 ms or 200 ms latency is the Nagle/delayed-ACK fingerprint. For HOL blocking, distinguish the HTTP/1.1 application-level problem (solved by HTTP/2) from the TCP-level problem (solved only by QUIC/HTTP/3).',
      examples: [
        { label: 'Go: TCP_NODELAY is on by default; batch writes anyway', lang: 'go', code: `conn, err := net.Dial("tcp", "10.0.5.20:7000")
if err != nil {
    return err
}
tcp := conn.(*net.TCPConn)
_ = tcp.SetNoDelay(true) // already the default in Go; false re-enables Nagle

// Prefer one write per message instead of many small writes
w := bufio.NewWriterSize(conn, 32*1024)
w.Write(header)
w.Write(body)
if err := w.Flush(); err != nil { // single syscall, one segment burst
    return err
}` }
      ]
    },
    {
      title: 'UDP & QUIC',
      def: `<p><strong>UDP</strong> (RFC 768) adds only ports, length and checksum to IP: no connection, no ordering, no retransmission, no congestion control. 8-byte header, message-oriented (datagram boundaries preserved). Use cases: <strong>DNS</strong>, VoIP/video conferencing (late data is useless), gaming, telemetry (StatsD), NTP, DHCP, VXLAN and WireGuard tunnels, and <strong>QUIC</strong>. Apps on UDP must handle loss, reordering, pacing and amplification risks themselves.</p>
<p><strong>QUIC</strong> (RFC 9000, with TLS in RFC 9001 and HTTP/3 in RFC 9114) is a secure, multiplexed, reliable transport implemented in user space over UDP:</p>
<ul>
<li><strong>Combined handshake</strong>: transport + TLS 1.3 in <strong>1 RTT</strong> (vs TCP 1 RTT + TLS 1.3 1 RTT = 2 RTT; TLS 1.2 = 3 RTT). <strong>0-RTT</strong> resumption sends data in the first flight — but 0-RTT data is <em>replayable</em>, so only allow idempotent requests.</li>
<li><strong>Independent streams</strong>: loss on one stream does not block others (no transport HOL blocking).</li>
<li><strong>Connection IDs</strong>: connections survive IP/port changes (Wi-Fi → cellular, NAT rebinding) via <strong>connection migration</strong>. This also complicates L4 load balancing: LBs must route by connection ID, not 4-tuple.</li>
<li><strong>Always encrypted</strong>: even most transport headers (packet numbers, ACKs) are protected — resists ossification but makes passive network debugging harder (use qlog / SSLKEYLOGFILE).</li>
<li>Pluggable congestion control in user space (CUBIC/BBR), better loss recovery (monotonic packet numbers — no retransmission ambiguity).</li>
</ul>
<p>Costs: higher CPU per byte than kernel TCP (mitigated with GSO/GRO and UDP offloads), UDP blocked or rate-limited on some enterprise networks (clients fall back to TCP via <code>Alt-Svc</code>/HTTPS DNS record discovery), and less mature tooling. In Go use <code>quic-go</code> (the standard library does not ship QUIC or HTTP/3; the Go team's implementation under <code>golang.org/x/net</code> is still experimental).</p>
<p><strong>Deployment status</strong>: QUIC carries a large share of Internet traffic — Google services, Meta apps and the big CDNs use it by default, and roughly a fifth to a third of HTTP requests seen by major CDNs use HTTP/3 (most of the rest is HTTP/2). Inside data centres TCP still dominates: low loss and kernel offloads (TSO/GRO) make TCP cheaper there, and QUIC's wins are mostly on lossy, high-RTT, mobile last miles. QUIC v2 (RFC 9369) exists mainly to keep middleboxes from ossifying on v1's wire image.</p>`,
      interview: 'Explain QUIC in terms of the TCP problems it solves: handshake latency, transport HOL blocking, ossification, connection migration. Then be balanced: CPU cost, UDP blocking and LB complexity. Mention 0-RTT replay risk — that is a frequent senior-level follow-up.',
      examples: [
        { label: 'Check HTTP/3 support and handshake timing', lang: 'bash', code: `$ curl -sI https://www.cloudflare.com | grep -i alt-svc
alt-svc: h3=":443"; ma=86400

$ curl --http3-only -s -o /dev/null -w 'proto=%{http_version} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer}\\n' https://www.cloudflare.com
proto=3 connect=0.021 tls=0.021 ttfb=0.064      # QUIC: connect and TLS complete together

$ curl --http2 -s -o /dev/null -w 'proto=%{http_version} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer}\\n' https://www.cloudflare.com
proto=2 connect=0.019 tls=0.041 ttfb=0.085      # TCP connect, then a separate TLS round trip` }
      ]
    },
    {
      title: 'Sockets, Ports & Keep-Alives',
      def: `<p>A <strong>socket</strong> is the OS handle for an endpoint. A listening TCP socket is bound to (IP, port); each accepted connection gets a <em>new</em> socket identified by the full 4-tuple — so one server port can serve millions of clients (the limit is memory and file descriptors, not ports). Raise <code>ulimit -n</code> (<code>LimitNOFILE</code>) for busy servers; "too many open files" is EMFILE.</p>
<p>Ports: 0–1023 well-known (privileged on Linux unless <code>CAP_NET_BIND_SERVICE</code>), 1024–49151 registered, ephemeral range chosen by the OS for outgoing connections. Useful socket options:</p>
<ul>
<li><code>SO_REUSEADDR</code>: bind a listening port even if old connections are in TIME_WAIT (Go sets it on listeners).</li>
<li><code>SO_REUSEPORT</code>: multiple sockets/processes bind the same port; the kernel load-balances new connections across them (used by Envoy, Nginx <code>reuseport</code>, zero-downtime restarts).</li>
</ul>
<p><strong>TCP keep-alive</strong> vs <strong>HTTP keep-alive</strong> — different things:</p>
<ul>
<li><strong>TCP keep-alive</strong>: kernel sends empty probes on an idle connection to detect dead peers and keep NAT/LB/firewall state alive. Linux defaults are useless for this (<code>tcp_keepalive_time</code> = 7200 s). Go's <code>net.Dialer</code> and listeners enable it with 15 s by default; Go 1.23 added <code>KeepAliveConfig</code> (Idle, Interval, Count).</li>
<li><strong>HTTP keep-alive</strong> (persistent connections): reuse one TCP connection for many HTTP requests. Default in HTTP/1.1. Go: <code>http.Transport</code> pool (<code>MaxIdleConns</code>, <code>MaxIdleConnsPerHost</code>, <code>IdleConnTimeout</code>); server: <code>http.Server.IdleTimeout</code>.</li>
</ul>
<p>Golden rule for idle timeouts in a chain: <strong>client idle timeout &lt; LB idle timeout &lt; server idle timeout</strong>, otherwise the server/LB closes a connection the client is about to reuse → sporadic "connection reset" or 502s (AWS ALB default idle timeout is 60 s, so set backend keep-alive higher, e.g. 75 s).</p>`,
      interview: 'Know both keep-alives and the idle-timeout ordering rule; the "random 502s behind an ALB" story (backend closes idle keep-alive connections before the ALB does) is a very common real-world question. Also: one listening port does not limit the number of clients — the 4-tuple does.',
      examples: [
        { label: 'Go client/server timeouts and keep-alive tuning', lang: 'go', code: `dialer := &net.Dialer{
    Timeout: 3 * time.Second,
    KeepAliveConfig: net.KeepAliveConfig{ // Go 1.23+
        Enable: true, Idle: 30 * time.Second, Interval: 10 * time.Second, Count: 3,
    },
}
client := &http.Client{
    Timeout: 10 * time.Second,
    Transport: &http.Transport{
        DialContext:         dialer.DialContext,
        MaxIdleConns:        200,
        MaxIdleConnsPerHost: 100,              // default 2 -> churn + TIME_WAIT
        IdleConnTimeout:     50 * time.Second, // below the LB idle timeout (60s)
        TLSHandshakeTimeout: 3 * time.Second,
    },
}
srv := &http.Server{
    Addr:              ":8080",
    ReadHeaderTimeout: 5 * time.Second,
    IdleTimeout:       75 * time.Second, // above the ALB idle timeout (60s)
}` }
      ]
    }
  ],
  problems: [
    {
      t: 'Draw the TCP handshake, teardown and state transitions',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Show flags, seq/ack numbers for SYN, SYN-ACK, ACK.</li><li>Show FIN/ACK in both directions and the states on each side.</li><li>Mark who ends in TIME_WAIT and how long it lasts on Linux.</li></ul>`,
      solution: `Client                                  Server (LISTEN)
SYN_SENT     --- SYN seq=x --->            SYN_RCVD
ESTABLISHED  <-- SYN+ACK seq=y ack=x+1 --
             --- ACK ack=y+1 --->          ESTABLISHED
... data ...
FIN_WAIT_1   --- FIN seq=u --->            CLOSE_WAIT  (app must call close())
FIN_WAIT_2   <-- ACK ack=u+1 ---
TIME_WAIT    <-- FIN seq=v ---             LAST_ACK
(60s on Linux = 2*MSL)  --- ACK ack=v+1 --> CLOSED
CLOSED`
    },
    {
      t: 'Choose TCP, UDP or QUIC for five workloads',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Workloads: DNS lookup, database replication, live video call, mobile app API over flaky networks, metrics firehose (StatsD).</li><li>Consider ordering, reliability, latency, loss tolerance, middlebox support.</li></ul>`,
      solution: `DNS lookup: UDP (one request/response; TCP fallback for >512B/1232B or truncation; DoT/DoH for privacy)
Database replication: TCP (strict ordering and reliability; long-lived connections)
Live video call: UDP (RTP/SRTP, WebRTC) - late packets are useless, app does FEC/jitter buffers
Mobile app API on flaky networks: QUIC/HTTP3 - 1-RTT/0-RTT setup, no transport HOL blocking,
  connection migration when switching Wi-Fi <-> cellular; fall back to HTTP/2 over TCP
Metrics firehose: UDP (fire-and-forget, loss acceptable) or batched over TCP/gRPC if loss matters`
    },
    {
      t: 'Compute the bandwidth-delay product and the maximum single-stream throughput',
      d: 'medium',
      type: 'concept',
      hint: `<ul><li>BDP = bandwidth × RTT.</li><li>Throughput ≤ window / RTT.</li><li>Case: 10 Gbit/s link, 80 ms RTT (us-east-1 ↔ eu-west-1), tcp_rmem max = 6 MB.</li><li>What happens with 1% packet loss and CUBIC (Mathis formula ≈ MSS / (RTT × √p))?</li></ul>`,
      solution: `BDP = 10e9 bit/s * 0.08 s = 800e6 bit = 100 MB must be in flight to fill the link.
Max window 6 MB => throughput <= 6 MB / 0.08 s = 75 MB/s = 600 Mbit/s (6% of the link).

With 1% loss (Mathis, loss-based CC): ~ MSS/(RTT*sqrt(p)) * 1.22
  = 1448 B / (0.08 s * 0.1) * 1.22 = ~221 KB/s = ~1.8 Mbit/s  (!)

Fixes: raise net.core.rmem_max / tcp_rmem / tcp_wmem max to >= BDP, use BBR (much less
sensitive to random loss), use parallel streams (S3 multipart, gsutil -m), or move the
data closer (replication, CDN).`
    },
    {
      t: 'Observe socket states and queues with ss',
      d: 'medium',
      type: 'hands-on',
      hint: `<ul><li>Start a server (<code>python3 -m http.server 8080</code>) and hammer it with <code>ab</code> or <code>hey</code> without keep-alive.</li><li>Use <code>ss -s</code>, <code>ss -tan state time-wait</code>, <code>ss -ltn</code> (Recv-Q/Send-Q on listeners = accept queue).</li><li>Find which side holds TIME_WAIT.</li></ul>`,
      solution: `python3 -m http.server 8080 &
hey -n 20000 -c 50 -disable-keepalive http://127.0.0.1:8080/

ss -s                                  # summary: estab, timewait counts
ss -tan state time-wait '( sport = :8080 or dport = :8080 )' | wc -l
# python's server closes after each response => server side holds TIME_WAIT (src port 8080)

ss -ltn 'sport = :8080'
# State  Recv-Q Send-Q  Local Address:Port
# LISTEN 0      5       0.0.0.0:8080       <- Send-Q = backlog limit, Recv-Q = current accept queue
nstat -az TcpExtListenOverflows TcpExtListenDrops   # accept queue overflow counters

hey -n 20000 -c 50 http://127.0.0.1:8080/   # with keep-alive: far fewer TIME_WAIT sockets`
    },
    {
      t: 'Build a TCP echo server in Go with timeouts and graceful shutdown',
      d: 'medium',
      type: 'coding',
      hint: `<ul><li>Use <code>signal.NotifyContext</code> and close the listener on cancel; <code>Accept</code> returns <code>net.ErrClosed</code>.</li><li>Per-connection goroutine with read/write deadlines (idle timeout).</li><li>Use <code>context.AfterFunc</code> to unblock reads on shutdown; <code>sync.WaitGroup</code> to drain.</li><li>Test with <code>nc localhost 9000</code>.</li></ul>`,
      solution: `package main

import (
    "bufio"
    "context"
    "errors"
    "log"
    "net"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

func main() {
    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    ln, err := net.Listen("tcp", ":9000")
    if err != nil {
        log.Fatal(err)
    }
    context.AfterFunc(ctx, func() { ln.Close() }) // stop accepting on signal

    var wg sync.WaitGroup
    for {
        conn, err := ln.Accept()
        if err != nil {
            if errors.Is(err, net.ErrClosed) {
                break
            }
            log.Printf("accept: %v", err)
            continue
        }
        wg.Add(1)
        go func() {
            defer wg.Done()
            handle(ctx, conn)
        }()
    }
    log.Println("draining connections")
    wg.Wait()
}

func handle(ctx context.Context, c net.Conn) {
    defer c.Close()
    // On shutdown, force any blocked Read to return immediately.
    stopWatch := context.AfterFunc(ctx, func() { c.SetReadDeadline(time.Now()) })
    defer stopWatch()

    r := bufio.NewReader(c)
    for ctx.Err() == nil {
        c.SetReadDeadline(time.Now().Add(30 * time.Second)) // idle timeout
        line, err := r.ReadBytes('\\n')
        if err != nil {
            return // EOF, timeout or shutdown
        }
        c.SetWriteDeadline(time.Now().Add(5 * time.Second))
        if _, err := c.Write(line); err != nil {
            return
        }
    }
}`,
      lang: 'go'
    },
    {
      t: 'Explain TIME_WAIT accumulation on a busy proxy and fix it',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Nginx in front of a few upstream IPs, upstream connections are not reused.</li><li>Which side closes first? Which 4-tuples are consumed?</li><li>Compute: 28,232 ports / 60 s per upstream IP:port.</li><li>Fix hierarchy: upstream keep-alive → tcp_tw_reuse → port range → more upstream IPs.</li></ul>`,
      solution: `Why: by default nginx speaks HTTP/1.0 to upstreams with "Connection: close", so every
proxied request opens a new upstream connection and nginx (the active closer) holds
TIME_WAIT for 60s. All of them share (nginx IP, upstream IP, upstream port), so only the
source port varies: 28,232 ports / 60s = ~470 req/s per upstream before
"connect() failed (99: Cannot assign requested address)".

Fix 1 - reuse upstream connections:
  upstream api {
      server 10.0.5.20:8080;
      server 10.0.5.21:8080;
      keepalive 64;              # idle connections cached per worker
      keepalive_timeout 60s;
  }
  location / {
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
  }
  (Make the upstream's idle timeout longer than nginx's keepalive_timeout.)

Fix 2 - kernel: sysctl -w net.ipv4.tcp_tw_reuse=1 (outgoing connections only, needs TCP
timestamps), widen net.ipv4.ip_local_port_range="10240 65535".
Fix 3 - scale the tuple space: more upstream IPs/ports, or multiple source IPs (proxy_bind).
Do NOT: enable tcp_tw_recycle (removed in Linux 4.12) or lower TIME_WAIT via RST hacks.`
    },
    {
      t: 'Debug: thousands of CLOSE_WAIT sockets in a Go service',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>CLOSE_WAIT = peer closed, local app did not.</li><li>Use <code>ss -tanp state close-wait</code> to find the peer: is it an upstream the service calls?</li><li>Look for missing <code>resp.Body.Close()</code>, early returns, or raw <code>net.Conn</code> handlers ignoring EOF.</li><li>Check goroutine dumps (<code>/debug/pprof/goroutine?debug=2</code>).</li></ul>`,
      solution: `ss -tanp state close-wait | awk '{print $4}' | sort | uniq -c | sort -rn | head
# 3812 10.0.5.20:443   <- all to one upstream the service calls as a CLIENT

Root cause (typical):
    resp, err := client.Do(req)
    if err != nil { return err }
    if resp.StatusCode != 200 {
        return fmt.Errorf("status %d", resp.StatusCode)   // body never closed!
    }
    defer resp.Body.Close()

The upstream closes idle connections (FIN), but the leaked body keeps the conn out of the
Transport pool and nobody calls Close(), so the socket sits in CLOSE_WAIT forever (and
leaks a file descriptor + goroutines).

Fix:
    resp, err := client.Do(req)
    if err != nil { return err }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        io.Copy(io.Discard, io.LimitReader(resp.Body, 64<<10)) // allow reuse
        return fmt.Errorf("status %d", resp.StatusCode)
    }
Also: lint with bodyclose, alert on CLOSE_WAIT count and open FDs.`
    },
    {
      t: 'Debug: "connect: cannot assign requested address" under load',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>EADDRNOTAVAIL on <code>connect()</code> = no free ephemeral port for that destination.</li><li>Check TIME_WAIT counts per destination, <code>ip_local_port_range</code>, and the HTTP client's pool settings.</li><li>Go default <code>MaxIdleConnsPerHost</code> = 2; a new <code>http.Client</code>/<code>Transport</code> per request defeats pooling.</li><li>Also consider SNAT on the node (Kubernetes) multiplying the problem.</li></ul>`,
      solution: `Investigation
  ss -tan state time-wait dst 10.0.5.20 | wc -l          # ~28k => exhausted
  sysctl net.ipv4.ip_local_port_range                    # 32768 60999
  grep -rn "http.Client{" ./ ; grep -rn "&http.Transport{" ./   # created per request?

Typical root causes
1. New http.Transport per request => no pooling, every call = new conn + TIME_WAIT.
2. MaxIdleConnsPerHost=2 with concurrency 200 => 198 conns closed after each burst.
3. Response bodies not drained/closed => conns cannot be reused.
4. In Kubernetes, pod egress SNATed to the node IP => all pods on the node share one
   ephemeral port space toward the same destination.

Fix
- One shared http.Client per process; MaxIdleConnsPerHost ~= peak concurrency per host.
- Always drain + close bodies.
- sysctl net.ipv4.tcp_tw_reuse=1; widen ip_local_port_range.
- Spread over more destination IPs (headless service / multiple LB IPs).
- Verify: TIME_WAIT count drops by orders of magnitude; nstat TcpActiveOpens rate falls.`
    },
    {
      t: 'Debug: every request has an extra ~40 ms latency',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>Constant 40 ms (Linux) or 200 ms (Windows) is a fingerprint.</li><li>Capture with tcpdump: look for a small segment, then a gap, then the ACK.</li><li>Pattern: write(header); write(body); read(response).</li><li>Fix with TCP_NODELAY or coalesced writes; check client libraries and proxies.</li></ul>`,
      solution: `tcpdump shows:
  t=0.000  client > server  [P.] len 120   (header write)
  t=0.040  server > client  [.]  ack       <- delayed ACK timer (40ms)
  t=0.040  client > server  [P.] len 300   (body write, held by Nagle until that ACK)
  t=0.042  server > client  [P.] len 512   (response)

Cause: Nagle (client) + delayed ACK (server). The second small write cannot be sent while
the first is unacknowledged; the server will not ACK until it has a full request or the
delayed-ACK timer fires.

Fixes
- Coalesce writes into one buffer / writev (best: fewer packets, no stall).
- Set TCP_NODELAY on the client (Go: default on; Java/Python/C clients often off).
- Server-side TCP_QUICKACK can help but is not sticky on Linux.
Verify: p50 latency drops by ~40ms; tcpdump shows header+body in one segment.`
    }
  ],
  interviewFocus: [
    {
      q: 'Explain TIME_WAIT: why it exists, who gets it, and when it becomes a problem.',
      a: `<p>The side that sends the first FIN (the <strong>active closer</strong>) enters TIME_WAIT for 2×MSL — 60 s on Linux. It exists to (1) retransmit the final ACK if the peer's FIN is lost, and (2) ensure stray segments from the old connection expire before the same 4-tuple can be reused.</p>
<p>It becomes a problem when one host opens many short-lived connections to the <strong>same destination IP:port</strong>: each TIME_WAIT pins a source port, and with ~28K ephemeral ports you can only sustain ~470 new connections/s per destination. Typical victims: reverse proxies without upstream keep-alive, services creating an HTTP client per request, load generators.</p>
<p>Fixes: (1) connection reuse — keep-alive/pools, gRPC/HTTP/2 multiplexing; (2) <code>tcp_tw_reuse=1</code> for outgoing connections; (3) widen the ephemeral range or add destination/source IPs; (4) design so that the <em>client</em> closes (TIME_WAIT on many clients instead of one server). Never use <code>tcp_tw_recycle</code>. Servers with many TIME_WAITs on their listening port are usually fine — the 4-tuples differ per client.</p>`
    },
    {
      q: 'Compare flow control and congestion control. How do CUBIC and BBR differ?',
      a: `<p><strong>Flow control</strong> prevents overwhelming the <em>receiver</em>: the receiver advertises a window (rwnd) of free buffer space. <strong>Congestion control</strong> prevents overwhelming the <em>network</em>: the sender maintains cwnd. Effective window = min(rwnd, cwnd).</p>
<p><strong>CUBIC</strong> is loss-based: it grows cwnd (cubic function of time since last loss) until a loss, then backs off by ~30%. It fills router buffers before seeing loss (bufferbloat, higher latency) and interprets random non-congestion loss (Wi-Fi, long-haul) as congestion, collapsing throughput.</p>
<p><strong>BBR</strong> is model-based: it continuously estimates bottleneck bandwidth (max delivery rate) and RTprop (min RTT), paces packets at that bandwidth, and keeps in-flight data around BDP. Result: higher throughput on lossy/high-BDP paths and lower queueing delay. Caveats: BBRv1 (still what mainline Linux calls <code>bbr</code>) can take an unfair share from CUBIC flows and ignores loss; BBRv3 — deployed across Google and specified in the IETF CCWG draft — adds loss and ECN signals to fix much of that but is not the default everywhere. BBR also needs pacing (the <code>fq</code> qdisc or internal TCP pacing).</p>
<p>Practical tie-in: slow start (initcwnd 10) means a new connection needs several RTTs to reach full speed — another reason to reuse connections and to place servers close to users.</p>`
    },
    {
      q: 'What does QUIC improve over TCP + TLS, and what new operational challenges does it bring?',
      a: `<p><strong>Improvements</strong>:</p>
<ul>
<li>1-RTT combined transport+crypto handshake (0-RTT on resumption) vs 2 RTT for TCP + TLS 1.3.</li>
<li>Independent streams: no transport-level head-of-line blocking.</li>
<li>Connection migration via connection IDs (network changes do not kill the connection).</li>
<li>Encrypted transport headers resist middlebox ossification; user-space implementation evolves quickly.</li>
<li>Better loss recovery: unique packet numbers remove retransmission ambiguity; more ACK ranges.</li>
</ul>
<p><strong>Challenges</strong>:</p>
<ul>
<li>CPU cost: user-space crypto and per-packet syscalls; needs UDP GSO/GRO, recvmmsg, larger socket buffers.</li>
<li>Load balancing: 4-tuple hashing breaks on migration; LBs must route by connection ID (QUIC-LB draft) or terminate QUIC at the edge.</li>
<li>Firewalls/enterprise networks often block or throttle UDP/443 — clients must fall back to TCP.</li>
<li>Observability: tcpdump cannot see packet numbers or ACKs; use qlog, SSLKEYLOGFILE, and endpoint metrics.</li>
<li>0-RTT replay: only allow idempotent requests in early data (servers can reject with 425 Too Early).</li>
<li>UDP amplification: servers must limit responses to 3× received bytes before address validation.</li>
</ul>`
    },
    {
      q: 'A service behind an AWS ALB returns sporadic 502 errors with no errors in the app logs. What is your hypothesis?',
      a: `<p>Prime suspect: an <strong>idle-timeout race</strong> on keep-alive connections. The ALB keeps idle connections to targets for its idle timeout (default 60 s). If the backend's keep-alive/idle timeout is <em>shorter</em> (e.g. Node.js 5 s, some Go servers configured low), the backend closes the connection at the same moment the ALB sends a new request on it → the ALB gets a RST/FIN → 502 (ALB access logs show <code>elb_status_code</code> 502 with <code>target_status_code</code> of <code>-</code> because no valid response was received).</p>
<p>Verify: ALB access logs (<code>elb_status_code=502</code>, <code>target_status_code=-</code>), CloudWatch <code>HTTPCode_ELB_502_Count</code> correlated with low traffic periods; tcpdump on targets showing the backend FIN followed immediately by an incoming request.</p>
<p>Fix: set the backend idle timeout <strong>greater</strong> than the ALB idle timeout (e.g. Go <code>http.Server.IdleTimeout = 75s</code>), and generally keep <em>client &lt; proxy &lt; server</em> idle timeouts along the chain. Other causes to rule out: target crashing mid-response, response headers too large, TLS errors to HTTPS targets, and pods terminating without connection draining (fix with preStop sleep + deregistration delay).</p>`
    },
    {
      q: 'What happens under a SYN flood, and how do servers defend against it?',
      a: `<p>An attacker sends many SYNs (often spoofed sources) and never completes the handshake. Each half-open connection consumes a SYN-queue entry; when the queue fills, legitimate SYNs are dropped and clients see connect timeouts (retransmitted SYNs at 1 s, 3 s, 7 s…).</p>
<p>Defences:</p>
<ul>
<li><strong>SYN cookies</strong> (<code>net.ipv4.tcp_syncookies=1</code>): when the queue overflows, the server encodes connection state in the ISN of the SYN-ACK and keeps no state; a valid final ACK reconstructs it. Cost: some TCP options are limited.</li>
<li>Larger <code>tcp_max_syn_backlog</code>, fewer SYN-ACK retries (<code>tcp_synack_retries</code>).</li>
<li>Upstream protection: cloud LBs/CDNs (AWS Shield, Cloudflare) absorb SYN floods at the edge with SYN proxies; anycast spreads load.</li>
<li>Rate limiting SYNs per source and filtering spoofed sources (BCP 38 at ISPs).</li>
</ul>
<p>Related: accept-queue overflow (app not calling <code>accept()</code> fast enough) looks similar — check <code>ListenOverflows</code> vs SYN-flood indicators (<code>TcpExtSyncookiesSent</code>, many SYN_RECV sockets).</p>`
    }
  ],
  quiz: [
    { q: 'Which side of a TCP connection enters TIME_WAIT and for how long on Linux?', a: 'The side that closes first (sends the first FIN); 60 seconds (2 x MSL, hard-coded on Linux).' },
    { q: 'What does a large number of CLOSE_WAIT sockets indicate?', a: 'The peer closed the connection but the local application never called close() - a socket/resource leak in the app.' },
    { q: 'What is the default Linux ephemeral port range and its size?', a: '32768-60999, i.e. 28,232 ports.' },
    { q: 'What is the difference between rwnd and cwnd?', a: 'rwnd is the receiver-advertised window (flow control); cwnd is the sender-side congestion window (congestion control). In-flight data is limited by the minimum of the two.' },
    { q: 'What is the TCP initial congestion window on modern Linux?', a: '10 segments (about 14 KB with a 1448-byte MSS), per RFC 6928.' },
    { q: 'Why can a constant 40 ms delay appear on request/response traffic?', a: 'Nagle algorithm on the sender interacting with delayed ACK on the receiver (write-write-read pattern). Fix with TCP_NODELAY or coalesced writes.' },
    { q: 'How many round trips does a new HTTPS connection need before the request with TCP+TLS 1.3 vs QUIC?', a: 'TCP + TLS 1.3: 2 RTT (1 TCP + 1 TLS). QUIC: 1 RTT (0 RTT on resumption).' },
    { q: 'What is the difference between TCP keep-alive and HTTP keep-alive?', a: 'TCP keep-alive sends kernel probes on idle connections to detect dead peers and keep NAT state; HTTP keep-alive reuses one TCP connection for multiple HTTP requests.' },
    { q: 'What happens to cwnd after three duplicate ACKs versus after a retransmission timeout?', a: 'Three duplicate ACKs trigger fast retransmit and fast recovery: cwnd is reduced (halved for Reno, x0.7 for CUBIC) and sending continues. An RTO resets cwnd to 1 segment and restarts slow start, which is far more expensive.' }
  ],
  resources: [
    { title: 'RFC 9293 — Transmission Control Protocol (TCP)', url: 'https://datatracker.ietf.org/doc/html/rfc9293', type: 'docs' },
    { title: 'RFC 9000 — QUIC: A UDP-Based Multiplexed and Secure Transport', url: 'https://datatracker.ietf.org/doc/html/rfc9000', type: 'docs' },
    { title: 'High Performance Browser Networking — Building Blocks of TCP', url: 'https://hpbn.co/building-blocks-of-tcp/', type: 'book' },
    { title: 'Cloudflare Learning — What is HTTP/3 (QUIC)?', url: 'https://www.cloudflare.com/learning/performance/what-is-http3/', type: 'article' }
  ]
},
// ───────────────────────────── Module 4 ─────────────────────────────
{
  n: 4,
  title: 'HTTP & Application Protocols',
  summary: 'HTTP from 1.1 through HTTP/2 and HTTP/3, the semantics that interviews probe (idempotency, status codes, caching, cookies, CORS), real-time options (WebSockets, SSE) and how gRPC rides on HTTP/2. Ends with a practical REST vs gRPC vs GraphQL decision framework.',
  topics: [
    {
      title: 'HTTP/1.1: Methods, Idempotency, Status Codes & Headers',
      def: `<p>HTTP semantics are defined in <strong>RFC 9110</strong> (shared by HTTP/1.1, /2 and /3); HTTP/1.1 message syntax in RFC 9112. A request is a text start line (<code>GET /path HTTP/1.1</code>), headers, a blank line and an optional body. <code>Host</code> is mandatory in HTTP/1.1 (it enables virtual hosting).</p>
<table>
<thead><tr><th>Method</th><th>Safe</th><th>Idempotent</th><th>Typical use</th></tr></thead>
<tbody>
<tr><td>GET / HEAD</td><td>yes</td><td>yes</td><td>Read</td></tr>
<tr><td>OPTIONS</td><td>yes</td><td>yes</td><td>Capabilities, CORS preflight</td></tr>
<tr><td>PUT</td><td>no</td><td>yes</td><td>Create/replace at a known URI</td></tr>
<tr><td>DELETE</td><td>no</td><td>yes</td><td>Remove</td></tr>
<tr><td>POST</td><td>no</td><td>no</td><td>Create / process / actions</td></tr>
<tr><td>PATCH</td><td>no</td><td>not guaranteed</td><td>Partial update</td></tr>
</tbody>
</table>
<p><strong>Idempotent</strong> = repeating the request has the same effect on server state as sending it once — which is what makes <strong>retries safe</strong>. Proxies and clients may automatically retry idempotent requests; make POST retry-safe with an <code>Idempotency-Key</code> header stored server-side.</p>
<p>Status codes worth knowing cold: <code>200</code>, <code>201 Created</code>, <code>204</code>, <code>301/308</code> permanent (308 keeps the method), <code>302/307</code> temporary (307 keeps the method), <code>304 Not Modified</code>, <code>400</code>, <code>401</code> (not authenticated), <code>403</code> (authenticated but not allowed), <code>404</code>, <code>409 Conflict</code>, <code>412 Precondition Failed</code>, <code>422</code>, <code>429 Too Many Requests</code> (+ <code>Retry-After</code>), <code>500</code>, <code>502 Bad Gateway</code> (proxy got an invalid/no response — upstream reset, refused), <code>503</code> (no healthy upstream / overloaded), <code>504 Gateway Timeout</code> (upstream too slow). Nginx logs <code>499</code> when the client gave up first.</p>
<p>Connection management: HTTP/1.1 connections are <strong>persistent</strong> by default (<code>Connection: close</code> to opt out). Only one outstanding request per connection in practice — <strong>pipelining</strong> exists but is disabled in browsers due to HOL blocking and buggy proxies — so browsers open ~6 connections per origin. Framing uses <code>Content-Length</code> or <code>Transfer-Encoding: chunked</code>; disagreement between a proxy and a backend about which one wins is the root of <strong>request smuggling</strong>.</p>`,
      interview: 'Be crisp on 401 vs 403, 502 vs 503 vs 504, 301 vs 308, and why idempotency matters for retries. A strong answer to "how do you make payment POSTs safe to retry" is an Idempotency-Key stored with the result so duplicates return the original response.',
      examples: [
        { label: 'Raw HTTP/1.1 exchange', lang: 'http', code: `POST /v1/payments HTTP/1.1
Host: api.example.com
Content-Type: application/json
Idempotency-Key: 6f1c2a9e-4b7d-4f0e-9a51-0c2d7e1b8f33
Authorization: Bearer eyJhbGciOi...
Content-Length: 48

{"amount":1999,"currency":"USD","source":"tok_1"}

HTTP/1.1 201 Created
Location: /v1/payments/pay_8xK2
Content-Type: application/json
Content-Length: 61

{"id":"pay_8xK2","status":"succeeded","amount":1999}` }
      ]
    },
    {
      title: 'HTTP/2 and HTTP/3',
      def: `<p><strong>HTTP/2</strong> (RFC 9113) keeps HTTP semantics but changes the wire format:</p>
<ul>
<li><strong>Binary framing</strong>: messages are split into frames (HEADERS, DATA, SETTINGS, WINDOW_UPDATE, RST_STREAM, GOAWAY, PING) tagged with a <strong>stream ID</strong>.</li>
<li><strong>Multiplexing</strong>: many concurrent request/response streams over <em>one</em> TCP connection — no more 6-connection limit or domain sharding; fixes application-level HOL blocking.</li>
<li><strong>HPACK</strong> header compression: static + dynamic tables and Huffman coding; repeated headers (cookies, user-agent) cost a few bytes.</li>
<li>Per-stream and connection-level <strong>flow control</strong>, stream priorities (largely replaced by the simpler RFC 9218 priority scheme).</li>
<li>Negotiated via TLS <strong>ALPN</strong> (<code>h2</code>); cleartext <code>h2c</code> is used internally (gRPC without TLS). <strong>Server push</strong> is effectively dead (removed from Chrome); use <code>103 Early Hints</code> instead.</li>
<li>Weakness: still TCP — one lost packet stalls all streams (transport HOL). Security: the <strong>Rapid Reset</strong> attack (CVE-2023-44487) abused cheap stream creation + RST_STREAM to generate record-breaking request floods; its 2025 variant <strong>MadeYouReset</strong> (CVE-2025-8671) sends deliberately invalid frames so the <em>server</em> resets the streams, slipping past mitigations that only counted client resets.</li>
</ul>
<p><strong>HTTP/3</strong> (RFC 9114) maps HTTP semantics onto <strong>QUIC</strong> streams. Each request is an independent QUIC stream, so packet loss only delays the affected stream. Header compression is <strong>QPACK</strong> (HPACK redesigned to tolerate out-of-order delivery). Discovery: the server advertises <code>Alt-Svc: h3=":443"</code> on an HTTP/1.1 or /2 response, or publishes an <strong>HTTPS DNS record</strong> (RFC 9460) so clients can try QUIC on the first connection. Clients race or fall back to TCP when UDP is blocked. HTTP/3 is supported by all major browsers, CDNs (Cloudflare, Fastly, Akamai, CloudFront), Envoy, HAProxy and Nginx (1.25+).</p>
<p><strong>Where HTTP/3 actually runs (2026)</strong>: overwhelmingly at the <em>edge</em> — browser/mobile app ↔ CDN or global LB. Many regional cloud L7 load balancers and most service meshes still speak HTTP/1.1 or HTTP/2 to backends, so a typical path is HTTP/3 to the PoP and HTTP/2 over warm TCP connections to the origin. Roughly a fifth to a third of requests at large CDNs use HTTP/3; the rest fall back because of UDP-blocking networks, clients that have not yet seen the <code>Alt-Svc</code>/HTTPS record, or middleboxes. Operationally you must open <strong>UDP 443</strong> in security groups/firewalls, make sure the LB supports QUIC (or passes UDP through), and keep TCP fallback healthy. WebSockets over HTTP/3 use extended CONNECT (RFC 9220).</p>`,
      interview: 'Typical probe: "Does HTTP/2 eliminate head-of-line blocking?" Only at the HTTP layer; TCP still has it, which HTTP/3 over QUIC fixes. Also be ready for: why one HTTP/2 connection breaks L4 load balancing, and what Rapid Reset was.',
      examples: [
        { label: 'See protocol negotiation with curl', lang: 'text', code: `$ curl -sv --http2 -o /dev/null https://www.google.com 2>&1 | grep -E 'ALPN|HTTP/2|using'
* ALPN: curl offers h2,http/1.1
* ALPN: server accepted h2
* using HTTP/2
> GET / HTTP/2
< HTTP/2 200

$ curl -sI https://www.google.com | grep -i alt-svc
alt-svc: h3=":443"; ma=2592000          # "h3-29"-style draft tokens are obsolete

$ dig +short HTTPS cloudflare.com
1 . alpn="h3,h2" ipv4hint=104.16.132.229,104.16.133.229 ipv6hint=2606:4700::6810:84e5,2606:4700::6810:85e5` }
      ]
    },
    {
      title: 'HTTP Caching: Cache-Control, ETag & Revalidation',
      def: `<p>Caching (RFC 9111) happens in browsers (private caches) and in CDNs/proxies (shared caches). <code>Cache-Control</code> directives:</p>
<ul>
<li><code>max-age=N</code>: fresh for N seconds; <code>s-maxage=N</code>: overrides max-age for <em>shared</em> caches (CDN).</li>
<li><code>public</code> / <code>private</code>: may shared caches store it? Responses with <code>Authorization</code> are private unless marked otherwise.</li>
<li><code>no-cache</code>: may store, but <strong>must revalidate</strong> before every use. <code>no-store</code>: never store (sensitive data). These are commonly confused.</li>
<li><code>must-revalidate</code>: once stale, do not serve without revalidation. <code>immutable</code>: never revalidate while fresh (fingerprinted assets).</li>
<li><code>stale-while-revalidate=N</code>: serve stale while refreshing in the background; <code>stale-if-error=N</code>: serve stale if origin fails — great for resilience.</li>
</ul>
<p><strong>Validators</strong> enable cheap revalidation: the server sends <code>ETag: "abc123"</code> (or <code>Last-Modified</code>); the client later sends <code>If-None-Match: "abc123"</code> (or <code>If-Modified-Since</code>); if unchanged, the server returns <strong><code>304 Not Modified</code></strong> with no body. Weak ETags (<code>W/"..."</code>) mean semantically equivalent. ETags also enable <strong>optimistic concurrency</strong>: <code>PUT</code> with <code>If-Match</code> → <code>412 Precondition Failed</code> if someone else changed the resource.</p>
<p><code>Vary</code> tells caches which request headers are part of the cache key (<code>Vary: Accept-Encoding</code>). <code>Vary: Cookie</code> or <code>Vary: User-Agent</code> fragments the cache and kills hit ratio. Classic strategy: fingerprinted static assets <code>max-age=31536000, immutable</code>; HTML <code>no-cache</code> with ETag; personalised API responses <code>private, no-store</code> or short <code>max-age</code>.</p>`,
      interview: 'Expect "no-cache vs no-store" and "how does a 304 work". A senior answer designs a full caching policy: immutable fingerprinted assets, revalidated HTML, s-maxage for CDN-cacheable APIs, stale-while-revalidate for resilience, and careful Vary to protect hit ratio.',
      examples: [
        { label: 'Conditional request returning 304', lang: 'http', code: `GET /api/products/42 HTTP/1.1
Host: shop.example.com
If-None-Match: "a1b2c3d4"

HTTP/1.1 304 Not Modified
ETag: "a1b2c3d4"
Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=30
Vary: Accept-Encoding` }
      ]
    },
    {
      title: 'Cookies & CORS',
      def: `<p><strong>Cookies</strong> are set with <code>Set-Cookie</code> and sent back automatically by the browser. Attributes that matter for security:</p>
<ul>
<li><code>Secure</code> (HTTPS only), <code>HttpOnly</code> (not readable from JavaScript — mitigates XSS token theft).</li>
<li><code>SameSite=Lax</code> (default in modern browsers; sent on top-level navigations), <code>Strict</code> (never cross-site), <code>None</code> (always; requires <code>Secure</code>). SameSite is the main CSRF defence today.</li>
<li><code>Domain</code>/<code>Path</code> scope; <code>__Host-</code> prefix forces Secure, Path=/ and no Domain (cannot be set by subdomains).</li>
<li><code>Max-Age</code>/<code>Expires</code>; without them it is a session cookie. Third-party cookies are being restricted (Safari/Firefox block by default; partitioned cookies via <code>Partitioned</code>/CHIPS).</li>
</ul>
<p><strong>Same-origin policy</strong>: scripts can only read responses from the same <em>origin</em> (scheme + host + port). <strong>CORS</strong> lets a server relax this for specific origins. It is enforced by the <em>browser</em>, not the server — curl and server-to-server calls ignore it, so CORS is not an authorization mechanism.</p>
<ul>
<li><strong>Simple requests</strong> (GET/HEAD/POST with safelisted headers and form/text content types) are sent directly; the browser checks <code>Access-Control-Allow-Origin</code> on the response.</li>
<li><strong>Preflighted requests</strong> (PUT/DELETE, <code>Content-Type: application/json</code>, custom headers like <code>Authorization</code>): browser first sends <code>OPTIONS</code> with <code>Origin</code>, <code>Access-Control-Request-Method</code>, <code>Access-Control-Request-Headers</code>; the server must answer 2xx with matching <code>Allow-Methods</code>/<code>Allow-Headers</code>. <code>Access-Control-Max-Age</code> caches the preflight.</li>
<li>With credentials (cookies), <code>Allow-Origin</code> cannot be <code>*</code> — echo the specific allowed origin, add <code>Access-Control-Allow-Credentials: true</code> and <code>Vary: Origin</code>.</li>
</ul>`,
      interview: 'Common traps: thinking CORS protects the server (it protects users in browsers), returning * with credentials, forgetting OPTIONS must not require auth, and forgetting Vary: Origin when reflecting origins through a CDN. Tie SameSite cookies to CSRF defence.',
      examples: [
        { label: 'Preflight exchange', lang: 'http', code: `OPTIONS /v1/orders HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: authorization, content-type

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: authorization, content-type
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 600
Vary: Origin` }
      ]
    },
    {
      title: 'Real-Time: WebSockets, Server-Sent Events & Long Polling',
      def: `<p><strong>WebSockets</strong> (RFC 6455): start as HTTP/1.1 <code>GET</code> with <code>Upgrade: websocket</code> + <code>Sec-WebSocket-Key</code>; the server replies <code>101 Switching Protocols</code>, and the TCP connection becomes a <strong>full-duplex, message-framed</strong> channel (text/binary frames, ping/pong, close). Over HTTP/2 they use extended CONNECT (RFC 8441) and over HTTP/3 RFC 9220, but many proxies still only support the HTTP/1.1 upgrade path. Because <code>Upgrade</code> and <code>Connection</code> are <em>hop-by-hop</em> headers, every proxy in the chain must explicitly forward them (or natively support WebSockets) — the most common reason a WebSocket works locally but fails behind Nginx or an old LB. Use for chat, collaborative editing, multiplayer, trading UIs.</p>
<p><strong>Server-Sent Events</strong> (SSE): a normal HTTP response with <code>Content-Type: text/event-stream</code> that never ends; the server writes <code>data:</code> lines. One-directional (server → client), text only, built-in <strong>automatic reconnect</strong> with <code>Last-Event-ID</code>, works through ordinary HTTP infrastructure and multiplexes nicely over HTTP/2. Ideal for notifications, live feeds, progress updates and LLM token streaming.</p>
<p><strong>Long polling</strong>: the client sends a request the server holds until data is available or a timeout, then immediately re-polls. Works everywhere, but has overhead per message.</p>
<p>Operational concerns for long-lived connections:</p>
<ul>
<li><strong>Idle timeouts</strong> on LBs/proxies (ALB 60 s, Nginx <code>proxy_read_timeout</code> 60 s) kill quiet connections — send heartbeats (ping frames, SSE comments) more often than the shortest timeout.</li>
<li><strong>Proxy config</strong>: Nginx needs <code>proxy_http_version 1.1</code> plus <code>Upgrade</code>/<code>Connection</code> headers for WebSockets, and <code>proxy_buffering off</code> for SSE.</li>
<li><strong>Load balancing</strong>: connections are sticky by nature; scaling events and deploys need graceful drain and client reconnect with jittered backoff (avoid thundering herds). Fan-out across instances needs a pub/sub backbone (Redis, NATS, Kafka).</li>
<li>Capacity: memory per connection, file descriptors, ephemeral ports on the proxy.</li>
</ul>`,
      interview: 'Interviewers want a justified choice: SSE when updates are server-to-client only (simpler, HTTP-native, auto-reconnect), WebSockets for bidirectional low-latency messaging. Then the scaling story: sticky connections, heartbeats vs idle timeouts, pub/sub fan-out and reconnect storms.',
      examples: [
        { label: 'Minimal SSE endpoint in Go', lang: 'go', code: `func events(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    rc := http.NewResponseController(w) // Go 1.20+
    ticker := time.NewTicker(15 * time.Second)
    defer ticker.Stop()
    for {
        select {
        case <-r.Context().Done(): // client went away
            return
        case msg := <-subscribe(r.Context()):
            fmt.Fprintf(w, "id: %d\\ndata: %s\\n\\n", msg.ID, msg.JSON)
        case <-ticker.C:
            fmt.Fprint(w, ": heartbeat\\n\\n") // keeps LB idle timers alive
        }
        if err := rc.Flush(); err != nil {
            return
        }
    }
}` }
      ]
    },
    {
      title: 'gRPC over HTTP/2 & REST vs gRPC vs GraphQL',
      def: `<p><strong>gRPC</strong> is an RPC framework using <strong>Protocol Buffers</strong> over <strong>HTTP/2</strong>. Each RPC is an HTTP/2 stream: <code>POST /package.Service/Method</code>, <code>content-type: application/grpc</code>, length-prefixed protobuf messages in DATA frames, and the result in HTTP <strong>trailers</strong> (<code>grpc-status</code>, <code>grpc-message</code>). Four RPC types: unary, server streaming, client streaming, bidirectional streaming. Built-in <strong>deadlines</strong> (propagated as <code>grpc-timeout</code>), cancellation, metadata, and a fixed set of status codes (<code>UNAVAILABLE</code>, <code>DEADLINE_EXCEEDED</code>, <code>RESOURCE_EXHAUSTED</code>...).</p>
<p>Gotchas: browsers cannot access HTTP/2 trailers, so web clients need <strong>gRPC-Web</strong> (via Envoy) or Connect; long-lived connections need L7 or client-side load balancing; every proxy hop must support HTTP/2 end to end.</p>
<table>
<thead><tr><th></th><th>REST (JSON/HTTP)</th><th>gRPC</th><th>GraphQL</th></tr></thead>
<tbody>
<tr><td>Contract</td><td>OpenAPI (optional)</td><td>.proto (required, codegen)</td><td>Schema (SDL, required)</td></tr>
<tr><td>Payload</td><td>Text JSON, human-readable</td><td>Binary protobuf, small and fast</td><td>JSON, client picks fields</td></tr>
<tr><td>Transport</td><td>HTTP/1.1, 2, 3</td><td>HTTP/2 (HTTP/3 emerging)</td><td>Usually HTTP POST; subscriptions over WebSocket</td></tr>
<tr><td>Caching</td><td>Excellent (HTTP caching, CDNs)</td><td>None at HTTP level</td><td>Hard (single POST endpoint; persisted queries help)</td></tr>
<tr><td>Streaming</td><td>SSE/WebSocket add-ons</td><td>Native, bidirectional</td><td>Subscriptions</td></tr>
<tr><td>Best for</td><td>Public APIs, browsers, CRUD</td><td>Internal service-to-service, low latency, polyglot</td><td>Aggregating many backends for varied UIs (BFF)</td></tr>
<tr><td>Risks</td><td>Over/under-fetching, chatty</td><td>Browser support, debugging binary, LB</td><td>N+1 resolvers, query cost/DoS, auth per field</td></tr>
</tbody>
</table>`,
      interview: 'Do not pick a winner; map choice to context. A strong answer: REST at the public edge (cacheable, universal), gRPC east-west between services (contracts, streaming, deadlines), GraphQL as a BFF/aggregation layer for many client types — with the operational costs of each (gRPC LB, GraphQL query cost limits).',
      examples: [
        { label: 'What a unary gRPC call looks like on the wire (HTTP/2 frames)', lang: 'text', code: `HEADERS (stream 1)
  :method = POST
  :scheme = https
  :path = /orders.v1.OrderService/GetOrder
  :authority = orders.internal:443
  content-type = application/grpc
  te = trailers
  grpc-timeout = 250m          <- 250 ms deadline, propagated downstream
DATA (stream 1)  [0x00][len=0x0000000a][protobuf GetOrderRequest]

HEADERS (stream 1)  :status = 200, content-type = application/grpc
DATA (stream 1)     [0x00][len][protobuf Order]
HEADERS (stream 1, END_STREAM)   <- trailers
  grpc-status = 0
  grpc-message =` }
      ]
    }
  ],
  problems: [
    {
      t: 'Classify HTTP methods by safety and idempotency and make POST retry-safe',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Safe = no state change; idempotent = same effect if repeated.</li><li>Which methods can a proxy retry automatically?</li><li>How would you design an <code>Idempotency-Key</code> for payments (storage, TTL, concurrent duplicates)?</li></ul>`,
      solution: `Safe + idempotent: GET, HEAD, OPTIONS, TRACE
Idempotent, not safe: PUT, DELETE
Neither: POST; PATCH is not guaranteed idempotent (e.g. "append item" vs "set field")

Idempotency-Key design (Stripe-style):
- Client generates a UUID per logical operation and reuses it on retries.
- Server: INSERT key (unique) with status=in_progress + request hash in the same DB/tx scope.
  - Key exists + completed => return stored response (same status/body).
  - Key exists + in_progress => 409 Conflict (or wait).
  - Key exists + different request hash => 422 (key reuse with different payload).
- Store result atomically with the side effect; expire keys after 24h.`
    },
    {
      t: 'Pick the correct status code for eight API scenarios',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Scenarios: created resource; invalid JSON; missing token; valid token but wrong role; version conflict on update; rate-limited; upstream timed out at the gateway; upstream refused the connection.</li><li>Think 4xx = client can fix, 5xx = server side.</li></ul>`,
      solution: `Created resource                 -> 201 Created + Location header
Invalid JSON body                -> 400 Bad Request (422 if syntactically valid but semantically wrong)
Missing/expired token            -> 401 Unauthorized + WWW-Authenticate
Valid token, insufficient role   -> 403 Forbidden (or 404 to avoid leaking existence)
ETag mismatch on PUT (If-Match)  -> 412 Precondition Failed; business conflict -> 409 Conflict
Rate-limited                     -> 429 Too Many Requests + Retry-After
Gateway: upstream too slow       -> 504 Gateway Timeout
Gateway: upstream refused/reset  -> 502 Bad Gateway; no healthy upstreams -> 503 Service Unavailable`
    },
    {
      t: 'Inspect HTTP/1.1, HTTP/2 and HTTP/3 with curl',
      d: 'medium',
      type: 'hands-on',
      hint: `<ul><li>Use <code>--http1.1</code>, <code>--http2</code>, <code>--http3-only</code> with <code>-v</code> and <code>-w '%{http_version}'</code>.</li><li>Observe ALPN, Alt-Svc and connection reuse across two URLs in one command.</li><li>Compare <code>time_connect</code>, <code>time_appconnect</code>, <code>time_starttransfer</code>.</li></ul>`,
      solution: `URL=https://www.cloudflare.com/
fmt='%{http_version} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\\n'
curl -s -o /dev/null --http1.1    -w "$fmt" $URL
curl -s -o /dev/null --http2      -w "$fmt" $URL
curl -s -o /dev/null --http3-only -w "$fmt" $URL    # needs curl built with HTTP/3 (ngtcp2/quiche)

# Connection reuse: second request shows "Re-using existing connection"
curl -sv -o /dev/null -o /dev/null $URL $URL 2>&1 | grep -iE 're-using|connected to'

# Alt-Svc advertisement and HTTPS DNS record
curl -sI $URL | grep -i alt-svc
dig +short HTTPS cloudflare.com`
    },
    {
      t: 'Design caching headers for a web app and its API',
      d: 'medium',
      type: 'design',
      hint: `<ul><li>Assets: fingerprinted JS/CSS/images. HTML shell. Public product catalogue API. Per-user account API. Sensitive data (tokens, PII).</li><li>Decide browser vs CDN TTLs (<code>max-age</code> vs <code>s-maxage</code>).</li><li>Plan invalidation and resilience (stale-while-revalidate, stale-if-error).</li></ul>`,
      solution: `/static/app.3f9a1c.js, images with content hash:
  Cache-Control: public, max-age=31536000, immutable        (new deploy = new URL)
/index.html (SPA shell):
  Cache-Control: no-cache  + ETag                            (always revalidate -> 304)
GET /api/products?category=shoes (public, changes every few minutes):
  Cache-Control: public, max-age=30, s-maxage=300, stale-while-revalidate=60, stale-if-error=600
  Vary: Accept-Encoding    (purge by surrogate key/tag on product update)
GET /api/me/orders (per user):
  Cache-Control: private, max-age=0, must-revalidate + ETag  (browser only, never CDN)
POST /oauth/token, PII endpoints:
  Cache-Control: no-store
Avoid Vary: Cookie / User-Agent on CDN-cached responses; normalise cache keys at the CDN.`
    },
    {
      t: 'Implement ETag-based conditional GET in Go',
      d: 'medium',
      type: 'coding',
      hint: `<ul><li>Hash the response body to build a strong ETag; set <code>Cache-Control</code>.</li><li>Parse <code>If-None-Match</code> (comma-separated list, may include <code>W/</code> and <code>*</code>).</li><li>Return <code>304</code> with no body when it matches.</li><li>Note: <code>http.ServeContent</code> already implements this for files/seekers.</li></ul>`,
      solution: `package main

import (
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strings"
)

type Product struct {
    ID    int    \`json:"id"\`
    Name  string \`json:"name"\`
    Price int    \`json:"price"\`
}

func etagFor(b []byte) string {
    sum := sha256.Sum256(b)
    return fmt.Sprintf("%q", hex.EncodeToString(sum[:12])) // quoted per RFC 9110
}

func matches(ifNoneMatch, etag string) bool {
    for _, part := range strings.Split(ifNoneMatch, ",") {
        p := strings.TrimPrefix(strings.TrimSpace(part), "W/") // weak comparison
        if p == "*" || p == etag {
            return true
        }
    }
    return false
}

func productHandler(w http.ResponseWriter, r *http.Request) {
    body, err := json.Marshal(Product{ID: 42, Name: "Keyboard", Price: 4999})
    if err != nil {
        http.Error(w, "encode error", http.StatusInternalServerError)
        return
    }
    etag := etagFor(body)
    w.Header().Set("ETag", etag)
    w.Header().Set("Cache-Control", "public, max-age=60, s-maxage=300")
    w.Header().Set("Vary", "Accept-Encoding")

    if inm := r.Header.Get("If-None-Match"); inm != "" && matches(inm, etag) {
        w.WriteHeader(http.StatusNotModified) // no body
        return
    }
    w.Header().Set("Content-Type", "application/json")
    w.Write(body)
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /api/products/42", productHandler)
    log.Fatal(http.ListenAndServe(":8080", mux))
}
// Test: curl -si localhost:8080/api/products/42 ; then repeat with -H 'If-None-Match: "<etag>"'`,
      lang: 'go'
    },
    {
      t: 'Debug: browser shows a CORS error but curl works',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Open DevTools Network tab: is there an <code>OPTIONS</code> preflight? What status did it get?</li><li>Common causes: auth middleware rejects OPTIONS with 401; missing <code>Allow-Headers</code> for <code>authorization</code>; <code>*</code> with credentials; CDN caching one origin's response without <code>Vary: Origin</code>.</li><li>Reproduce the preflight with curl.</li></ul>`,
      solution: `Reproduce:
curl -si -X OPTIONS https://api.example.com/v1/orders \\
  -H 'Origin: https://app.example.com' \\
  -H 'Access-Control-Request-Method: PUT' \\
  -H 'Access-Control-Request-Headers: authorization,content-type'

Typical findings and fixes:
1. 401 on OPTIONS -> auth middleware runs before CORS. Handle OPTIONS preflight first and
   never require credentials on it.
2. Response lacks "Access-Control-Allow-Headers: authorization, content-type" -> add them.
3. "Access-Control-Allow-Origin: *" + fetch(..., {credentials: 'include'}) -> browsers reject;
   echo the allow-listed origin and add Access-Control-Allow-Credentials: true.
4. Works for one frontend, fails for another -> CDN cached ACAO for origin A; add Vary: Origin
   (or include Origin in the cache key).
5. Redirect (301 http->https or trailing slash) on preflight -> preflights must not redirect.
curl "works" because CORS is enforced only by browsers.`
    },
    {
      t: 'Debug: WebSocket connections drop every 60 seconds behind a load balancer',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Exactly 60 s = a default idle timeout somewhere (ALB idle timeout, Nginx <code>proxy_read_timeout</code>).</li><li>Are there any frames during quiet periods?</li><li>Check proxy upgrade config and the close code the client sees (1006 = abnormal).</li></ul>`,
      solution: `Cause: no traffic during quiet periods + 60s idle timeout on the LB/proxy.
Client sees close code 1006 (abnormal closure, no close frame).

Fixes:
1. Application heartbeats: server sends ping frames every 20-30s (below the smallest idle
   timeout in the path); client replies pong (browsers do this automatically).
2. Raise timeouts where appropriate:
   - AWS ALB: idle_timeout.timeout_seconds attribute (up to 4000s)
   - Nginx:
       location /ws/ {
           proxy_pass http://ws_backend;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_read_timeout 3600s;
           proxy_send_timeout 3600s;
       }
3. Client: reconnect with exponential backoff + jitter and resume state (last message id).`
    },
    {
      t: 'Choose REST, gRPC or GraphQL for a multi-client platform',
      d: 'hard',
      type: 'design',
      hint: `<ul><li>Clients: public partner API, web + mobile apps, ~40 internal microservices in Go/Java/Python.</li><li>Evaluate caching, contracts, streaming, browser support, evolution/versioning, observability, LB.</li><li>A hybrid is usually right — justify each boundary.</li></ul>`,
      solution: `Public partner API -> REST/JSON over HTTPS (+ OpenAPI): universally consumable, HTTP caching
  and CDN friendly, easy auth (OAuth2), versioned via URL/header, rate limited at the gateway.
Web + mobile -> GraphQL BFF (or per-client REST BFF): one round trip aggregating many services,
  client-selected fields reduce over-fetching on mobile. Guardrails: persisted queries,
  depth/cost limits, DataLoader batching against N+1, field-level authz.
Service-to-service -> gRPC: protobuf contracts with codegen across Go/Java/Python, deadlines
  and cancellation propagation, streaming, ~5-10x smaller payloads than JSON. Requires L7 /
  mesh or client-side LB (HTTP/2), gRPC health checks, buf for breaking-change detection.
Async events -> Kafka/NATS with schema registry (not HTTP at all).
Edge: API gateway translates REST -> gRPC (gRPC-JSON transcoding in Envoy) where useful.`
    },
    {
      t: 'Explain the HTTP/2 Rapid Reset attack and how servers mitigate it',
      d: 'hard',
      type: 'concept',
      hint: `<ul><li>CVE-2023-44487, disclosed October 2023 (Google saw 398M req/s).</li><li>How does RST_STREAM interact with <code>SETTINGS_MAX_CONCURRENT_STREAMS</code>?</li><li>Why is the cost asymmetric (client cheap, server expensive)?</li><li>Mitigations in proxies (Envoy, Nginx) and Go's net/http.</li></ul>`,
      solution: `Attack: the client opens a stream (HEADERS) and immediately cancels it (RST_STREAM), repeating
in a tight loop. Reset streams no longer count toward MAX_CONCURRENT_STREAMS, so one
connection can create unbounded requests per RTT. The server already did the work to parse
headers, route, and often start a backend request -> massive asymmetric amplification
(botnet of ~20k machines produced 398M rps against Google).

Mitigations:
- Track resets per connection; send GOAWAY / close connections whose RST_STREAM rate or
  ratio of cancelled streams is abusive (Envoy overload manager, Nginx limits, HAProxy).
- Bound concurrently *executing* handlers, not just open streams (Go 1.21.3+ / x/net
  http2 limit handler goroutines to MaxConcurrentStreams and queue the rest).
- Cap total requests per connection and new streams per second; rate limit at the edge.
- Patch all HTTP/2 terminators (CDN, LB, ingress, Go/Java servers) - every hop is exposed.

Follow-up - MadeYouReset (CVE-2025-8671, August 2025): instead of sending RST_STREAM itself,
the client sends frames that are invalid for an open stream (e.g. a zero-increment
WINDOW_UPDATE or DATA on a half-closed stream) so the SERVER resets it. Mitigations that only
counted client-sent resets missed it, yet the backend work was still running. Lesson: account
for every stream that ends early, whoever resets it, and bound in-flight work per connection.`
    },
    {
      t: 'Debug: HTTP/3 is enabled but clients keep using HTTP/2',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>How does a client even learn that HTTP/3 is available (Alt-Svc, HTTPS DNS record)? Is it cached?</li><li>Is UDP 443 open end to end: security group, NACL, corporate firewall, the load balancer itself?</li><li>Does the LB terminate QUIC, or pass UDP to backends? Does the certificate / SNI match for the QUIC listener?</li><li>Test with <code>curl --http3-only</code> and compare from a home network vs the office.</li></ul>`,
      solution: `1. Discovery
   curl -sI https://app.example.com | grep -i alt-svc      # missing? -> no client will try h3
   dig +short HTTPS app.example.com                        # alpn="h3,h2" lets clients try h3 first
   Browsers only switch after seeing Alt-Svc on an earlier response (cached for ma=seconds),
   so "first request is always h2" is normal.
2. Reachability of UDP 443
   curl --http3-only -sv -o /dev/null https://app.example.com 2>&1 | tail -3
   -> timeout = UDP blocked or not listening. Check: security group / NACL allow UDP 443
   inbound (and ephemeral UDP outbound for NACLs), host firewall, corporate networks that
   block QUIC on purpose (they force TCP fallback).
3. Load balancer support
   The edge must speak QUIC: a CDN or global LB with HTTP/3 enabled, Nginx/HAProxy/Envoy with
   a QUIC listener, or an L4 LB passing UDP to backends that terminate QUIC. A TCP-only L7 LB
   in front silently means "HTTP/2 only".
4. Client side
   Some clients disable QUIC (enterprise policy, old curl builds without ngtcp2/quiche, Go's
   net/http has no HTTP/3). chrome://net-internals or the DevTools Protocol column shows h3.
Fix: advertise Alt-Svc (and an HTTPS record), open UDP 443 everywhere on the path, enable
QUIC on the edge, keep TCP fallback healthy, and measure the h3 share per network/ASN.`
    }
  ],
  interviewFocus: [
    {
      q: 'Compare HTTP/1.1, HTTP/2 and HTTP/3. What problem does each version solve?',
      a: `<table>
<thead><tr><th></th><th>HTTP/1.1</th><th>HTTP/2</th><th>HTTP/3</th></tr></thead>
<tbody>
<tr><td>Format</td><td>Text</td><td>Binary frames</td><td>Binary frames on QUIC streams</td></tr>
<tr><td>Concurrency</td><td>1 request per connection at a time; ~6 conns/origin</td><td>Many streams on 1 TCP conn</td><td>Many independent QUIC streams</td></tr>
<tr><td>Header compression</td><td>None</td><td>HPACK</td><td>QPACK</td></tr>
<tr><td>HOL blocking</td><td>Application + TCP</td><td>TCP only</td><td>None at transport (per stream)</td></tr>
<tr><td>Handshake (new conn)</td><td>TCP + TLS (2-3 RTT)</td><td>TCP + TLS (2 RTT with TLS 1.3)</td><td>1 RTT, 0-RTT resumption</td></tr>
<tr><td>Transport</td><td>TCP</td><td>TCP</td><td>QUIC over UDP</td></tr>
</tbody>
</table>
<p>HTTP/2 solved application-level HOL blocking, connection overhead and header bloat. HTTP/3 solves TCP's HOL blocking, handshake latency and connection migration. Trade-offs: HTTP/2 concentrates all traffic on one connection (L4 LB imbalance, single-connection loss sensitivity); HTTP/3 costs more CPU and needs UDP to be allowed. Internally (datacentre, low loss), HTTP/2 or gRPC is usually enough; HTTP/3 shines at the edge for mobile and lossy networks.</p>`
    },
    {
      q: 'How would you make an API safe to retry, and which components are allowed to retry?',
      a: `<ul>
<li><strong>Idempotent methods</strong> (GET, PUT, DELETE) may be retried by clients and proxies; design PUT/DELETE to be truly idempotent (set state, do not increment).</li>
<li><strong>POST</strong>: use an <code>Idempotency-Key</code> header; the server stores key → (request hash, status, response) atomically with the side effect, returns the stored response on duplicates, and rejects key reuse with a different payload.</li>
<li><strong>Retry policy</strong>: only on retryable failures (connect errors, 502/503/504, gRPC <code>UNAVAILABLE</code>), with exponential backoff + jitter, a retry budget (e.g. ≤ 10–20% extra load) and respecting <code>Retry-After</code>.</li>
<li><strong>Retry in one layer only</strong>: if the client, gateway, mesh sidecar and service all retry 3×, one failure becomes 81 requests (retry amplification) — classic cause of cascading failures.</li>
<li><strong>Deadlines</strong>: propagate a total deadline so retries do not exceed the caller's timeout (gRPC deadlines, <code>context.WithTimeout</code>).</li>
<li>Use <strong>optimistic concurrency</strong> (<code>ETag</code> + <code>If-Match</code> → 412) for safe concurrent updates.</li>
</ul>`
    },
    {
      q: 'Explain how CORS works and why it is not an authorization mechanism.',
      a: `<p>Browsers enforce the same-origin policy: JavaScript from <code>https://app.example.com</code> cannot read responses from <code>https://api.example.com</code> unless the API opts in via CORS headers. For non-simple requests the browser sends a <strong>preflight</strong> <code>OPTIONS</code> request describing the intended method and headers; only if the server responds with matching <code>Access-Control-Allow-*</code> headers does the browser send the real request and expose the response.</p>
<p>It is not authorization because: (1) it is enforced only by browsers — curl, scripts, servers and attackers' tools ignore it; (2) simple requests (e.g. form POSTs) are still <em>sent</em>; CORS only controls whether JS can <em>read</em> the response. Real protection needs authentication (tokens/cookies), authorization checks on every endpoint, and CSRF defences (SameSite cookies, CSRF tokens, checking <code>Origin</code>). Misconfigurations to avoid: reflecting any Origin with credentials, regex allow-lists like <code>.*example.com</code> that match <code>evilexample.com</code>, and missing <code>Vary: Origin</code> behind caches.</p>`
    },
    {
      q: 'You need to push live updates to 1 million browser clients. WebSockets, SSE or long polling? How do you scale it?',
      a: `<p><strong>Choice</strong>: if updates are server → client only (notifications, scores, prices), <strong>SSE</strong> is simpler — plain HTTP, works with HTTP/2 multiplexing, auto-reconnect with <code>Last-Event-ID</code>. If clients also send frequent low-latency messages (chat, collaboration, games), use <strong>WebSockets</strong>. Long polling only as a fallback.</p>
<p><strong>Scaling</strong>:</p>
<ul>
<li>Dedicated connection-gateway tier (Go handles ~100K+ idle connections per node with tuned FDs/memory; ~10–20 nodes plus headroom).</li>
<li>L4 LB or L7 LB with long idle timeouts; heartbeats every 20–30 s; spread across AZs.</li>
<li>Pub/sub backbone (Redis Streams/NATS/Kafka) so any gateway can deliver to its local subscribers; route by topic/user.</li>
<li>Graceful deploys: drain gradually, send a reconnect hint, clients reconnect with jittered backoff to avoid thundering herds; resume from last event ID.</li>
<li>Kernel tuning: <code>ulimit -n</code>, <code>somaxconn</code>, ephemeral ports on any proxy in front, conntrack size.</li>
<li>Observability: active connections, message lag, reconnect rate.</li>
</ul>`
    }
  ],
  quiz: [
    { q: 'What is the difference between Cache-Control no-cache and no-store?', a: 'no-cache allows storing but requires revalidation with the origin before each reuse; no-store forbids storing the response at all.' },
    { q: 'What is the difference between 502, 503 and 504 at a gateway?', a: '502: upstream returned an invalid response or the connection failed/reset; 503: service unavailable (no healthy upstream or overloaded); 504: upstream did not respond within the timeout.' },
    { q: 'Which status code does a server return when an If-None-Match ETag matches?', a: '304 Not Modified, with no body.' },
    { q: 'What header compression do HTTP/2 and HTTP/3 use?', a: 'HPACK for HTTP/2 and QPACK for HTTP/3.' },
    { q: 'Why can Access-Control-Allow-Origin not be * when credentials are included?', a: 'The CORS spec forbids wildcard origins on credentialed requests; the server must echo the specific allowed origin and send Access-Control-Allow-Credentials: true.' },
    { q: 'How does a WebSocket connection start?', a: 'As an HTTP/1.1 GET with Upgrade: websocket and Sec-WebSocket-Key; the server answers 101 Switching Protocols.' },
    { q: 'Where does gRPC put the call status?', a: 'In HTTP/2 trailers (grpc-status, grpc-message), which is why browsers need gRPC-Web.' },
    { q: 'What does SameSite=Lax do?', a: 'Cookies are sent on same-site requests and top-level cross-site GET navigations, but not on cross-site subresource or POST requests - a primary CSRF defence and the browser default.' },
    { q: 'Why does a WebSocket often fail behind a reverse proxy that works fine for normal HTTP?', a: 'Upgrade and Connection are hop-by-hop headers, so the proxy drops them unless configured to forward them (Nginx: proxy_http_version 1.1 plus Upgrade/Connection headers). Idle timeouts (60 s defaults) also kill quiet connections without heartbeats.' }
  ],
  resources: [
    { title: 'MDN — HTTP', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', type: 'docs' },
    { title: 'RFC 9110 — HTTP Semantics', url: 'https://datatracker.ietf.org/doc/html/rfc9110', type: 'docs' },
    { title: 'RFC 9114 — HTTP/3', url: 'https://datatracker.ietf.org/doc/html/rfc9114', type: 'docs' },
    { title: 'High Performance Browser Networking — HTTP/2', url: 'https://hpbn.co/http2/', type: 'book' }
  ]
},
// ───────────────────────────── Module 5 ─────────────────────────────
{
  n: 5,
  title: 'DNS',
  summary: 'DNS is the first dependency of almost every request and the root cause of a surprising share of outages. This module covers the full resolution path, record types, TTLs and caching (including negative caching), DNS-based traffic management, split-horizon and Kubernetes DNS (CoreDNS, ndots), DNSSEC, DoH/DoT and lessons from real DNS outages.',
  topics: [
    {
      title: 'How Resolution Works: Stub → Recursive → Root → TLD → Authoritative',
      def: `<p>Resolving <code>api.example.com</code> from a cold cache:</p>
<ol>
<li><strong>Stub resolver</strong> (libc / Go resolver in your process) checks <code>/etc/hosts</code> (per <code>nsswitch.conf</code>), then sends a <em>recursive</em> query (RD bit set) to the resolver in <code>/etc/resolv.conf</code> — e.g. the VPC resolver (169.254.169.253 / VPC+2), CoreDNS in Kubernetes, or 1.1.1.1/8.8.8.8.</li>
<li>The <strong>recursive resolver</strong> checks its cache. On a miss it resolves <em>iteratively</em>:</li>
<li>Asks a <strong>root server</strong> (13 named identities a–m, hundreds of anycast instances): "I don't know <code>api.example.com</code>, but here are the <code>.com</code> TLD servers" (a <em>referral</em> with NS records + glue A/AAAA records).</li>
<li>Asks a <strong>.com TLD server</strong>: referral to <code>example.com</code>'s authoritative name servers (e.g. Route 53 <code>ns-123.awsdns-15.com</code>).</li>
<li>Asks the <strong>authoritative server</strong>: final answer (AA flag set), e.g. a CNAME to <code>my-alb-123.us-east-1.elb.amazonaws.com</code>, which the resolver then chases to A/AAAA records.</li>
<li>The resolver caches every answer for its <strong>TTL</strong> and returns the result to the stub.</li>
</ol>
<p>Transport: UDP port 53 by default. Responses larger than the advertised EDNS0 buffer (recommended <strong>1232 bytes</strong> since DNS Flag Day 2020) set the <strong>TC (truncated)</strong> bit and the client retries over <strong>TCP 53</strong> — so firewalls must allow TCP 53 too. <strong>Glue records</strong> break the chicken-and-egg problem when a domain's name servers live inside that domain (<code>ns1.example.com</code>).</p>
<p>Caches exist at every layer: browser, OS (systemd-resolved, nscd), node-local caches, recursive resolvers. Notably, <strong>Go's standard resolver does not cache</strong> and the JVM caches according to <code>networkaddress.cache.ttl</code>.</p>`,
      interview: 'Explain the difference between recursive (client asks resolver to do everything) and iterative (resolver follows referrals) queries, mention caching at each layer, the TC bit and TCP fallback, and glue records. Using dig +trace to demonstrate the walk is a great live-interview move.',
      examples: [
        { label: 'Follow the delegation chain with dig +trace', lang: 'text', code: `$ dig +trace +nodnssec api.github.com
.                     518400 IN NS  a.root-servers.net.
;; Received 811 bytes from 127.0.0.53#53(127.0.0.53) in 0 ms

com.                  172800 IN NS  a.gtld-servers.net.
;; Received 1170 bytes from 198.41.0.4#53(a.root-servers.net) in 12 ms

github.com.           172800 IN NS  dns1.p08.nsone.net.
github.com.           172800 IN NS  ns-421.awsdns-52.com.
;; Received 795 bytes from 192.5.6.30#53(a.gtld-servers.net) in 20 ms

api.github.com.       60     IN A   140.82.112.6
;; Received 59 bytes from 198.51.44.8#53(dns1.p08.nsone.net) in 8 ms` }
      ]
    },
    {
      title: 'DNS Record Types',
      def: `<table>
<thead><tr><th>Type</th><th>Purpose</th><th>Example / notes</th></tr></thead>
<tbody>
<tr><td>A / AAAA</td><td>Name → IPv4 / IPv6</td><td>Multiple records = simple round-robin</td></tr>
<tr><td>CNAME</td><td>Alias to another name</td><td>Cannot coexist with other records at the same name, so <strong>not allowed at the zone apex</strong> (<code>example.com</code>). Use provider ALIAS/ANAME (Route 53 alias, Cloudflare CNAME flattening).</td></tr>
<tr><td>MX</td><td>Mail servers with priority</td><td><code>10 mx1.example.com.</code> — lower is preferred</td></tr>
<tr><td>TXT</td><td>Arbitrary text</td><td>SPF, DKIM, DMARC, domain verification (ACME DNS-01, Google site verification)</td></tr>
<tr><td>NS</td><td>Delegates a zone to name servers</td><td>Must match at parent (registrar) and child</td></tr>
<tr><td>SOA</td><td>Zone metadata</td><td>Primary NS, admin, serial, refresh, retry, expire, and the <strong>minimum/negative TTL</strong></td></tr>
<tr><td>SRV</td><td>Service location: priority, weight, port, target</td><td><code>_grpc._tcp.svc.example.com</code>; Kubernetes creates SRV for named ports</td></tr>
<tr><td>CAA</td><td>Which CAs may issue certificates</td><td><code>0 issue "letsencrypt.org"</code> — CAs must check it</td></tr>
<tr><td>PTR</td><td>Reverse lookup IP → name</td><td>In <code>in-addr.arpa</code> / <code>ip6.arpa</code>; matters for mail reputation</td></tr>
<tr><td>HTTPS / SVCB</td><td>Service binding</td><td>ALPN (h3), IP hints, ECH config; lets browsers use HTTP/3 on first connect; works at the apex</td></tr>
</tbody>
</table>
<p>Hosted zone structure: the registrar holds NS records for your domain in the TLD; your DNS provider hosts the zone and its records. Delegating a subdomain (e.g. <code>k8s.example.com</code> to a separate zone for ExternalDNS) is done with NS records in the parent zone.</p>`,
      interview: 'The apex CNAME question is a favourite: explain why (CNAME must be the only record at a name, and the apex needs SOA and NS) and the provider workaround (ALIAS/flattening, or HTTPS records). Also know CAA for certificate security and SRV for service discovery.',
      examples: [
        { label: 'Query different record types', lang: 'bash', code: `$ dig +short example.com SOA
ns.icann.org. noc.dns.icann.org. 2024081448 7200 3600 1209600 3600
#  primary NS   admin mailbox      serial    refresh retry expire  negative-TTL

$ dig +short google.com CAA
0 issue "pki.goog"

$ dig +short _xmpp-server._tcp.jabber.org SRV
30 30 5269 hermes2.jabber.org.

$ dig +short -x 8.8.8.8          # PTR (reverse)
dns.google.` }
      ]
    },
    {
      title: 'TTL, Caching & Negative Caching',
      def: `<p>Every record has a <strong>TTL</strong> (seconds a resolver may cache it). The trade-off: long TTL = fewer queries, lower latency, resilience if authoritative servers are unreachable; short TTL = faster failover and changes, more load and more exposure to DNS outages.</p>
<ul>
<li>Typical values: 300 s for service endpoints, 60 s for LB/failover records, 3600–86400 s for stable records (MX, NS).</li>
<li><strong>Before a migration</strong>, lower the TTL to 60 s at least one <em>old TTL</em> in advance; cut over; raise it again afterwards.</li>
<li>Resolvers may clamp TTLs (min/max) and some clients ignore them. Long-lived HTTP keep-alive and connection pools also keep using old IPs <em>regardless of DNS</em> — failover requires connection recycling too.</li>
</ul>
<p><strong>Negative caching</strong> (RFC 2308): <code>NXDOMAIN</code> (name does not exist) and <code>NODATA</code> (name exists, no record of that type) answers are cached for the lower of the SOA <code>minimum</code> field and the SOA record's TTL. Classic trap: you query <code>new.example.com</code> <em>before</em> creating it, the resolver caches NXDOMAIN for e.g. 900 s, and the new record "doesn't work" for 15 minutes.</p>
<p>Client-side caching to know:</p>
<ul>
<li><strong>Go</strong>: no built-in cache; every <code>Dial</code> resolves (pooled connections avoid repeated lookups). Pure-Go resolver vs cgo is chosen automatically (<code>GODEBUG=netdns=go|cgo</code>).</li>
<li><strong>JVM</strong>: <code>networkaddress.cache.ttl</code> (30 s default without a security manager; historically forever) — a classic source of "failover didn't happen".</li>
<li><strong>Browsers</strong>: own caches (~1 min in Chrome); <strong>systemd-resolved</strong>, <strong>NodeLocal DNSCache</strong>, CoreDNS <code>cache</code> plugin.</li>
</ul>`,
      interview: 'Interviewers probe whether you understand that DNS changes are not instant: TTLs, negative caching, resolver clamping, and connection pools that never re-resolve. The senior insight is that DNS failover only works if clients re-resolve and reconnect.',
      examples: [
        { label: 'Watch the TTL count down and negative caching', lang: 'text', code: `$ dig +noall +answer api.example.com @1.1.1.1
api.example.com.   300   IN  A  203.0.113.10
$ dig +noall +answer api.example.com @1.1.1.1      # 20s later, from cache
api.example.com.   280   IN  A  203.0.113.10

$ dig new.example.com @1.1.1.1 | grep -E 'status|SOA'
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 4411
example.com.  900  IN  SOA  ns1.example.com. hostmaster.example.com. 2026102901 7200 900 1209600 900
# NXDOMAIN cached for up to 900s - creating the record now won't be visible via this resolver` }
      ]
    },
    {
      title: 'DNS-Based Load Balancing, GeoDNS & Failover',
      def: `<p>Authoritative DNS can return <em>different answers to different clients</em>, which makes it the first (global) tier of traffic management:</p>
<ul>
<li><strong>Round-robin</strong>: multiple A records; clients usually try the first. No health awareness on its own.</li>
<li><strong>Weighted</strong>: e.g. 90/10 between old and new stacks for migrations/canaries.</li>
<li><strong>Latency-based</strong> (Route 53) / <strong>GeoDNS</strong> / geoproximity: answer with the region closest (by measured latency or location) to the <em>resolver</em>.</li>
<li><strong>Failover</strong>: health checks against endpoints; unhealthy primary → answer with secondary. Route 53 health checkers probe from multiple regions.</li>
</ul>
<p>Limitations you must mention:</p>
<ul>
<li><strong>Resolver, not client, location</strong>: GeoDNS sees the recursive resolver's IP. A user in Mumbai using a US-based resolver gets US answers. <strong>EDNS Client Subnet</strong> (ECS) passes a truncated client subnet to the authoritative server to fix this (privacy trade-off; 1.1.1.1 does not send ECS).</li>
<li><strong>Caching delays</strong>: failover speed ≈ health-check detection time + TTL + client behaviour. Realistic: 1–5 minutes.</li>
<li><strong>Coarse granularity</strong>: per resolver, not per request; no session awareness.</li>
</ul>
<p>Because of these limits, large providers combine GeoDNS with <strong>anycast</strong> (one IP announced everywhere, BGP picks the nearest site) and global L7 load balancers (Google Cloud global external LB, AWS Global Accelerator, Cloudflare) that fail over without waiting for DNS TTLs.</p>
<p><strong>Making DNS failover actually work</strong>:</p>
<ul>
<li><strong>Health checks</strong> should hit an endpoint that proves the region can serve (LB → app → critical dependency), probed from several checker locations with a threshold (e.g. 3 × 10 s) so one flaky probe does not flip traffic. Too shallow = failing over to nothing; too deep = every region "unhealthy" when a shared dependency blips.</li>
<li><strong>Fail-open behaviour</strong>: Route 53 returns <em>all</em> records when every one is unhealthy (better than NXDOMAIN) — know what your provider does.</li>
<li><strong>Use the data plane, not the control plane, during incidents</strong>: health-check-driven answers and pre-created routing controls (Route 53 ARC) keep working when a provider's control/API plane is impaired; "we'll just edit the record" may not be possible mid-outage.</li>
<li><strong>Clients must cooperate</strong>: finite resolver and JVM caches, bounded connection lifetimes, retries — otherwise the DNS answer changes and traffic does not.</li>
<li><strong>Capacity</strong>: the surviving region must absorb the shifted load; weighted records let you drain gradually instead of flipping 100% at once.</li>
</ul>`,
      interview: 'When designing multi-region systems, name DNS as the coarse global layer and explain its failure modes (resolver location, TTL lag, sticky clients). Strong candidates propose anycast or Global Accelerator for fast failover and DNS for coarse steering.',
      examples: [
        { label: 'Route 53 failover records (Terraform)', lang: 'text', code: `resource "aws_route53_health_check" "primary" {
  fqdn              = "api-use1.example.com"
  type              = "HTTPS"
  resource_path     = "/healthz"
  failure_threshold = 3
  request_interval  = 10
}

resource "aws_route53_record" "api_primary" {
  zone_id         = aws_route53_zone.main.zone_id
  name            = "api.example.com"
  type            = "A"
  set_identifier  = "primary-us-east-1"
  health_check_id = aws_route53_health_check.primary.id
  failover_routing_policy { type = "PRIMARY" }
  alias {
    name                   = aws_lb.use1.dns_name
    zone_id                = aws_lb.use1.zone_id
    evaluate_target_health = true
  }
}
# A matching SECONDARY record points at the eu-west-1 load balancer.` }
      ]
    },
    {
      title: 'Split-Horizon DNS & Kubernetes DNS (CoreDNS, ndots)',
      def: `<p><strong>Split-horizon DNS</strong> returns different answers depending on where the query comes from: internal clients get private IPs, external clients get public IPs for the same name. Implementations: Route 53 private hosted zones associated with VPCs, Cloud DNS private zones, BIND views, corporate DNS + VPN. Pitfalls: VPN clients using the wrong resolver, and certificates/SNI that must work for both views.</p>
<p><strong>Kubernetes DNS</strong> is served by <strong>CoreDNS</strong> (a Deployment behind the <code>kube-dns</code> Service, typically <code>10.96.0.10</code>):</p>
<ul>
<li>Services: <code>my-svc.my-ns.svc.cluster.local</code> → ClusterIP. <strong>Headless</strong> Services (<code>clusterIP: None</code>) return the pod IPs directly (StatefulSets: <code>pod-0.my-svc.my-ns.svc.cluster.local</code>). SRV records exist for named ports.</li>
<li>Pod <code>/etc/resolv.conf</code>: <code>search my-ns.svc.cluster.local svc.cluster.local cluster.local</code> (+ node search domains) and <strong><code>options ndots:5</code></strong>.</li>
<li><strong>ndots:5</strong> means any name with fewer than 5 dots is first tried with every search suffix. <code>api.stripe.com</code> (2 dots) generates queries for <code>api.stripe.com.my-ns.svc.cluster.local</code>, <code>...svc.cluster.local</code>, <code>...cluster.local</code>, (+ e.g. <code>...ec2.internal</code>) — each for A <em>and</em> AAAA — before the real lookup. That is 8+ wasted queries per external lookup, multiplying CoreDNS load and latency.</li>
<li>Mitigations: use FQDNs with a trailing dot (<code>api.stripe.com.</code>), lower <code>ndots</code> via <code>dnsConfig</code>, deploy <strong>NodeLocal DNSCache</strong>, scale CoreDNS (and its <code>cache</code>), set <code>autopath</code> in CoreDNS.</li>
<li>Classic issue: intermittent <strong>5-second DNS delays</strong> caused by a conntrack race when glibc sends A and AAAA queries in parallel over the same UDP socket through DNAT to the CoreDNS VIP; one is dropped and the client waits for the 5 s resolver timeout. Fixes: NodeLocal DNSCache, <code>options single-request-reopen</code> (glibc), newer kernels.</li>
</ul>`,
      interview: 'Kubernetes DNS is a top debugging question: know resolv.conf in a pod, what ndots:5 does to external lookups, the 5-second conntrack race, and NodeLocal DNSCache. Being able to read and change dnsConfig is a practical signal.',
      examples: [
        { label: 'Pod resolv.conf and lowering ndots', lang: 'yaml', code: `# kubectl exec -it web-7d9c -- cat /etc/resolv.conf
# search payments.svc.cluster.local svc.cluster.local cluster.local ec2.internal
# nameserver 10.96.0.10
# options ndots:5

apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  dnsPolicy: ClusterFirst
  dnsConfig:
    options:
      - name: ndots
        value: "2"            # external names with 2+ dots resolve directly
      - name: single-request-reopen   # glibc: avoid A/AAAA conntrack race
  containers:
    - name: app
      image: ghcr.io/example/web:1.4.2` }
      ]
    },
    {
      title: 'DNSSEC, DoT/DoH & Common DNS Outages',
      def: `<p><strong>DNS cache poisoning</strong>: an attacker races forged responses to a resolver (Kaminsky attack, 2008). Defences: random source ports + random 16-bit query IDs, 0x20 case randomisation, and DNSSEC.</p>
<p><strong>DNSSEC</strong> provides <em>authenticity and integrity</em> (not confidentiality): zones sign record sets (<code>RRSIG</code>) with keys published as <code>DNSKEY</code>; the parent publishes a <code>DS</code> hash of the child's key, forming a <strong>chain of trust</strong> from the root. Validating resolvers return SERVFAIL for bad signatures. Risks: operational complexity — botched key rollovers or DS mismatches make the whole domain unresolvable (Slack's 2021 DNSSEC outage).</p>
<p>DNSSEC in practice: most TLDs are signed and the big public resolvers (1.1.1.1, 8.8.8.8, 9.9.9.9) validate, but only a small minority of second-level domains (single-digit percent of <code>.com</code>) are signed. Use ECDSA P-256 (algorithm 13) for small responses, let the DNS provider manage ZSK rotation, and automate DS updates at the parent with CDS/CDNSKEY (RFC 8078) where the registry supports it. The <strong>root KSK</strong> itself is rolled rarely: KSK-2017 is being replaced by KSK-2024 (published in the root zone in 2025, scheduled to start signing in October 2026); validators that update trust anchors automatically (RFC 5011) or ship current anchors are unaffected, stale hand-configured anchors break validation.</p>
<p><strong>Encrypted DNS</strong> protects <em>privacy</em> between stub and resolver: <strong>DoT</strong> (DNS over TLS, TCP 853) and <strong>DoH</strong> (DNS over HTTPS, 443 — blends with web traffic, used by browsers; RFC 8484 wire format, <code>application/dns-message</code>); <strong>DoQ</strong> over QUIC (RFC 9250). Related pieces: <strong>DDR</strong> (RFC 9462) lets a client discover that its configured resolver also offers DoH/DoT; <strong>Oblivious DoH</strong> (RFC 9230) splits "who asked" from "what was asked" via a proxy. Encrypted DNS also matters for <strong>ECH</strong> (Encrypted Client Hello): the ECH public key is published in the HTTPS record, and fetching it in cleartext would leak the very hostname ECH hides. Enterprises often block or redirect DoH (or use the browser "canary domain" and policies) to keep visibility and split-horizon working. Encrypted DNS does <em>not</em> hide the destination from the network entirely — the IP address and, without ECH, the TLS SNI still reveal it.</p>
<p><strong>Common DNS outages and lessons</strong>:</p>
<ul>
<li><strong>Dyn, 2016</strong>: Mirai botnet DDoS on a managed DNS provider took down Twitter, GitHub, Netflix → use <strong>multiple DNS providers</strong> for critical zones.</li>
<li><strong>Facebook, 2021</strong>: backbone change caused DNS servers to withdraw BGP routes → DNS was unreachable, internal tools depended on it too.</li>
<li><strong>AWS us-east-1, October 2025</strong>: a race condition in DynamoDB's automated DNS management left the regional endpoint record empty, cascading to many dependent services → automation needs safeguards; clients need sane retry/backoff.</li>
<li>Everyday: expired domains, wrong NS delegation after a provider migration, record deleted by IaC drift, CoreDNS overloaded or OOM-killed, resolver rate limits (AWS VPC resolver: 1024 packets/s per ENI).</li>
</ul>`,
      interview: 'Distinguish DNSSEC (integrity) from DoH/DoT (confidentiality) — candidates often confuse them. Bring up real outages and the resulting design rules: multi-provider DNS for critical zones, caching resolvers close to clients, reasonable TTLs, and alerting on resolution latency/SERVFAIL rates.',
      examples: [
        { label: 'Check DNSSEC and query over DoH', lang: 'bash', code: `$ dig +dnssec +multi cloudflare.com A | grep -E 'flags|RRSIG'
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 3     <- "ad" = authenticated data (validated)
cloudflare.com. 300 IN RRSIG A 13 2 300 ( ... )

$ delv cloudflare.com A              # full validation trace
; fully validated

# DNS over HTTPS: RFC 8484 wire format via kdig (knot-dnsutils) or curl's built-in DoH
$ kdig @1.1.1.1 +https example.com A +short
$ curl -sv --doh-url https://1.1.1.1/dns-query -o /dev/null https://example.com 2>&1 | grep -i doh

# Provider JSON API (Cloudflare/Google extension - NOT the RFC 8484 format)
$ curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=example.com&type=A'
{"Status":0,"AD":true,"Answer":[{"name":"example.com","type":1,"TTL":300,"data":"..."}]}

# DNS over TLS (port 853)
$ kdig @1.1.1.1 +tls example.com A +short` }
      ]
    }
  ],
  problems: [
    {
      t: 'Trace a full DNS resolution with dig',
      d: 'easy',
      type: 'hands-on',
      hint: `<ul><li>Use <code>dig +trace</code>, then query each level directly with <code>@server</code> and <code>+norecurse</code>.</li><li>Identify referrals (NS in AUTHORITY section), glue (ADDITIONAL), and the AA flag on the final answer.</li><li>Compare timings for cold vs warm cache on a recursive resolver.</li></ul>`,
      solution: `dig +trace www.wikipedia.org
dig @a.root-servers.net www.wikipedia.org +norecurse    # referral to .org (AUTHORITY: NS, ADDITIONAL: glue)
dig @a0.org.afilias-nst.info www.wikipedia.org +norecurse   # referral to wikipedia.org NS
dig @ns0.wikimedia.org www.wikipedia.org +norecurse     # flags: qr aa  -> authoritative answer (CNAME dyna.wikimedia.org)
dig www.wikipedia.org @1.1.1.1 | grep 'Query time'      # first: ~20-60ms (maybe cached already)
dig www.wikipedia.org @1.1.1.1 | grep 'Query time'      # warm: ~1-5ms`
    },
    {
      t: 'Choose DNS record types for common requirements',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Point <code>example.com</code> (apex) and <code>www</code> at a cloud load balancer.</li><li>Receive email; prove domain ownership for an ACME certificate; restrict which CAs can issue.</li><li>Advertise HTTP/3 support; reverse lookup for an outbound mail server.</li></ul>`,
      solution: `example.com (apex) -> load balancer: ALIAS / Route 53 alias A+AAAA (CNAME not allowed at apex)
www.example.com    -> CNAME to the LB hostname (or alias)
Email              -> MX 10 mx1.example.com. + TXT SPF ("v=spf1 include:_spf.google.com -all"),
                      DKIM TXT at selector._domainkey, DMARC TXT at _dmarc
ACME DNS-01        -> TXT _acme-challenge.example.com "<token>"
Restrict CAs       -> CAA 0 issue "letsencrypt.org"; CAA 0 iodef "mailto:security@example.com"
HTTP/3 hint        -> HTTPS record: example.com. HTTPS 1 . alpn="h3,h2"
Outbound mail IP   -> PTR in the reverse zone (set via your cloud/ISP) matching forward A record`
    },
    {
      t: 'Plan a zero-downtime DNS cutover to a new load balancer',
      d: 'medium',
      type: 'design',
      hint: `<ul><li>Current TTL is 86400. Work backwards from the cutover time.</li><li>Use weighted records to shift gradually and monitor.</li><li>What about clients with pooled connections or JVM caches?</li><li>Rollback plan.</li></ul>`,
      solution: `T-48h: lower TTL 86400 -> 60 (must wait at least the OLD TTL so caches expire).
T-0:   create weighted records: old LB 90, new LB 10. Watch error rates/latency per stack.
       Shift 50/50, then 0/100 over hours.
       Keep the old LB serving: long-lived connections, pooled clients and resolvers that
       ignore TTLs keep hitting it for a while.
T+?:   watch old LB request count trend to ~0 (plus a safety margin), then decommission.
       Raise TTL back to 300-3600.
Clients: ensure services recycle connections (MaxConnectionAge / IdleConnTimeout) and that
JVM networkaddress.cache.ttl is finite.
Rollback: flip weights back (fast because TTL is 60).`
    },
    {
      t: 'Write a DNS lookup tool in Go with a custom resolver and timeouts',
      d: 'medium',
      type: 'coding',
      hint: `<ul><li>Use <code>net.Resolver{PreferGo: true, Dial: ...}</code> to target a specific server.</li><li>Bound each lookup with <code>context.WithTimeout</code>.</li><li>Look up A/AAAA (<code>LookupNetIP</code>), CNAME, MX, TXT.</li><li>Use <code>errors.As</code> with <code>*net.DNSError</code> to distinguish NXDOMAIN (<code>IsNotFound</code>) from timeouts.</li></ul>`,
      solution: `package main

import (
    "context"
    "errors"
    "fmt"
    "net"
    "os"
    "time"
)

func newResolver(server string) *net.Resolver {
    return &net.Resolver{
        PreferGo: true,
        Dial: func(ctx context.Context, network, _ string) (net.Conn, error) {
            d := net.Dialer{Timeout: 2 * time.Second}
            return d.DialContext(ctx, network, server) // network is "udp" or "tcp" (TC fallback)
        },
    }
}

func main() {
    if len(os.Args) < 2 {
        fmt.Println("usage: dnslookup <name> [server:53]")
        os.Exit(2)
    }
    name, server := os.Args[1], "1.1.1.1:53"
    if len(os.Args) > 2 {
        server = os.Args[2]
    }
    r := newResolver(server)
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    start := time.Now()
    ips, err := r.LookupNetIP(ctx, "ip", name)
    if err != nil {
        var de *net.DNSError
        switch {
        case errors.As(err, &de) && de.IsNotFound:
            fmt.Println("NXDOMAIN / no such host")
        case errors.As(err, &de) && de.IsTimeout:
            fmt.Println("timeout talking to", server)
        default:
            fmt.Println("error:", err)
        }
        os.Exit(1)
    }
    fmt.Printf("A/AAAA %v (%s)\\n", ips, time.Since(start))

    if cname, err := r.LookupCNAME(ctx, name); err == nil {
        fmt.Println("CNAME ", cname)
    }
    if mxs, err := r.LookupMX(ctx, name); err == nil {
        for _, mx := range mxs {
            fmt.Printf("MX     %d %s\\n", mx.Pref, mx.Host)
        }
    }
    if txts, err := r.LookupTXT(ctx, name); err == nil {
        for _, t := range txts {
            fmt.Println("TXT   ", t)
        }
    }
}`,
      lang: 'go'
    },
    {
      t: 'Debug: a newly created DNS record "does not resolve" for some users',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Query the authoritative servers directly vs public resolvers.</li><li>Did anyone query the name before it existed (negative caching)?</li><li>Check NS delegation at the registrar vs the hosted zone (common after provider migrations).</li><li>Split-horizon: is the client using an internal resolver with a private zone shadowing the name?</li></ul>`,
      solution: `1. Authoritative check:
   dig +short NS example.com                     # what the world thinks
   dig @ns-123.awsdns-15.com new.example.com     # answer present with aa flag?
   If the registrar NS differ from the hosted zone NS -> you edited the wrong zone.
2. Negative caching:
   dig new.example.com @8.8.8.8 -> NXDOMAIN with SOA in AUTHORITY: the TTL shown is how long
   it stays cached (min of SOA minimum and SOA TTL). Wait it out or flush (Google/Cloudflare
   have public cache-purge pages); lower the SOA minimum for zones with frequent new names.
3. Split-horizon shadowing:
   A Route 53 private hosted zone for example.com associated with the VPC answers ALL
   example.com queries from the VPC; records only in the public zone return NXDOMAIN inside.
   Fix: add the record to the private zone too, or use a sub-zone.
4. Client caches: systemd-resolved (resolvectl flush-caches), browser cache, JVM.`
    },
    {
      t: 'Debug: service keeps calling the old IP after DNS failover',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>DNS already returns the new IP (verify with dig), but traffic still hits the old one.</li><li>Think about where resolution results live: JVM cache, connection pools, HTTP/2 / gRPC long-lived connections, sidecars.</li><li>What forces re-resolution?</li></ul>`,
      solution: `Causes:
- Long-lived pooled connections (HTTP keep-alive, HTTP/2, gRPC, DB pools) never re-resolve;
  DNS is only consulted when a NEW connection is dialed.
- JVM InetAddress cache (networkaddress.cache.ttl) or a custom app-level cache ignoring TTL.
- gRPC dns resolver re-resolves only on connection failure / periodically (min 30s).

Fixes:
- Bound connection lifetime: Go http.Transport IdleConnTimeout; gRPC server
  MaxConnectionAge (+Grace) so clients reconnect and re-resolve; DB pool max lifetime.
- Set JVM networkaddress.cache.ttl=30 (and negative ttl ~10).
- On failover, the old endpoint should actively close connections (GOAWAY / drain) so
  clients reconnect.
- Prefer failover that does not depend on DNS (anycast, Global Accelerator, LB-level).`
    },
    {
      t: 'Debug intermittent DNS resolution failures in Kubernetes',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>Symptoms: random 5 s latency spikes, occasional <code>i/o timeout</code> / <code>no such host</code>, worse under load.</li><li>Inspect pod <code>resolv.conf</code> (ndots, search domains), CoreDNS metrics/logs, conntrack drops (<code>insert_failed</code>).</li><li>Check CoreDNS replicas, CPU throttling, OOMKills, upstream resolver limits (AWS: 1024 pps per ENI).</li><li>Mitigations: NodeLocal DNSCache, ndots/FQDNs, autoscaling CoreDNS.</li></ul>`,
      solution: `1. Reproduce and measure from an affected pod
   kubectl run dnsperf --rm -it --image=nicolaka/netshoot -- bash
   for i in $(seq 200); do dig +tries=1 +time=2 api.stripe.com | grep 'Query time'; done
   -> occasional ~5000 ms or timeouts

2. Query amplification from ndots:5
   cat /etc/resolv.conf -> ndots:5 + 4 search domains => 10 queries per external lookup
   CoreDNS logs (log plugin) show many NXDOMAIN for *.svc.cluster.local suffixes.

3. conntrack race (A + AAAA in parallel over the same UDP socket via DNAT)
   On the node: conntrack -S | grep insert_failed   (non-zero and rising)
   => one query dropped, glibc waits the 5s timeout.

4. CoreDNS capacity / upstream limits
   kubectl -n kube-system top pods -l k8s-app=kube-dns; check throttling and OOMKilled;
   coredns_dns_request_duration_seconds, coredns_forward_* metrics; AWS VPC resolver
   1024 packets/s/ENI limit -> "linklocal_allowance_exceeded" in ENA stats (ethtool -S).

Fixes (combine)
- Deploy NodeLocal DNSCache (per-node cache on 169.254.20.10, avoids DNAT/conntrack for
  pod->cache, uses TCP to CoreDNS).
- Lower ndots (dnsConfig ndots: 2) or use FQDNs with trailing dot for external hosts.
- options single-request-reopen for glibc images (Alpine/musl behaves differently).
- Scale CoreDNS (cluster-proportional-autoscaler / HPA), raise cache TTL, enable autopath.
- Spread CoreDNS across nodes/AZs; alert on SERVFAIL rate and p99 latency.`
    },
    {
      t: 'Design DNS-based failover for an active-passive multi-region service',
      d: 'hard',
      type: 'design',
      hint: `<ul><li>Primary us-east-1, standby eu-west-1. Target RTO ≤ 5 minutes.</li><li>Health checks: what exactly do they check (deep vs shallow)? From where?</li><li>Account for detection time + TTL + client caching + data layer failover.</li><li>Avoid flapping and split-brain; consider non-DNS alternatives.</li></ul>`,
      solution: `Design
- Route 53 failover routing: PRIMARY alias -> us-east-1 ALB, SECONDARY alias -> eu-west-1 ALB.
- Health check on a dedicated /healthz/deep endpoint that verifies the region can serve
  (DB writable, critical deps) but is cheap and cached; evaluated from multiple checker
  regions; failure_threshold 3 x 10s interval => ~30s detection.
- TTL 60s on the records. Expected failover ~= 30s detect + 60s TTL + client reconnect
  => 2-3 minutes for well-behaved clients.
- Data layer: Aurora Global Database / DynamoDB global tables; the failover runbook (or
  automation) promotes the secondary DB BEFORE or together with DNS - DNS alone does not
  fail over state. Use a Route 53 ARC routing control as a manual "big switch" to avoid
  flapping and to make failback deliberate.
- Clients: finite DNS caches, bounded connection lifetimes, retries with backoff.
Alternatives/complements: AWS Global Accelerator (anycast IPs, failover in seconds, no TTL
dependency) or Cloudflare/GCP global LB; multiple DNS providers for the zone itself.
Test it: regular game days that actually fail traffic over.`
    },
    {
      t: 'Explain DNSSEC chain of trust and contrast it with DoH/DoT',
      d: 'hard',
      type: 'concept',
      hint: `<ul><li>Records: DNSKEY (KSK/ZSK), RRSIG, DS, NSEC/NSEC3.</li><li>Walk the chain from the root trust anchor to <code>example.com</code>.</li><li>What DNSSEC does <em>not</em> protect; what DoH/DoT does not protect.</li><li>Operational risks and why adoption is limited.</li></ul>`,
      solution: `DNSSEC chain of trust
- Each zone signs its RRsets -> RRSIG records, using a Zone Signing Key (ZSK).
- The ZSK is in the DNSKEY RRset, signed by the Key Signing Key (KSK).
- The parent zone publishes a DS record (hash of the child's KSK) and signs it with its own key.
- Root KSK is the trust anchor built into validating resolvers.
  root DNSKEY -> .com DS -> .com DNSKEY -> example.com DS -> example.com DNSKEY -> RRSIG(A)
- NSEC/NSEC3 give authenticated denial of existence (signed NXDOMAIN).
Protects: integrity/authenticity of answers (no cache poisoning/spoofing).
Does NOT: encrypt queries; protect the stub->resolver hop unless the stub validates.

DoT/DoH
- Encrypt and authenticate the channel between client and resolver (TLS).
Protects: privacy from on-path observers, tampering on that hop.
Does NOT: prove the resolver's answer is authentic from the zone owner (resolver can lie or be
poisoned) - which is DNSSEC's job. They are complementary.

Risks: key rollovers / DS mismatches = total outage (SERVFAIL for validating resolvers),
larger responses (fragmentation, TCP fallback), amplification potential.`
    },
    {
      t: 'Debug: SERVFAIL for the whole domain after moving to a new DNS provider',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>Some users (those behind validating resolvers such as 1.1.1.1 or 8.8.8.8) get SERVFAIL; others resolve fine.</li><li>Compare <code>dig +dnssec</code> with and without <code>+cd</code> (checking disabled).</li><li>Which DS record is published at the parent, and which DNSKEYs does the new provider serve?</li><li>What is the safe order of operations for a signed-zone migration?</li></ul>`,
      solution: `Diagnose
  dig app.example.com @1.1.1.1            -> status: SERVFAIL
  dig app.example.com @1.1.1.1 +cd        -> NOERROR with an answer  => validation failure,
                                             not a missing record
  dig +short DS example.com @a.gtld-servers.net     # DS at the parent (old provider's KSK)
  dig +short DNSKEY example.com @ns1.newprovider.net # new provider signs with a different key
  delv app.example.com                      # "no valid signature found" / "broken trust chain"
  Online: DNSViz shows the broken DS -> DNSKEY link.
Root cause: the registrar still publishes a DS for the OLD provider's key, while the new
provider signs with its own keys (or the zone is now unsigned). Validators see a chain of
trust that does not verify and return SERVFAIL for every name; non-validating resolvers
still work, which is why only "some users" are affected.

Immediate fix
  - Remove the stale DS at the registrar (zone becomes insecure but resolvable), or publish
    the DS for the new provider's KSK. Wait out the DS TTL (often 1 day at the TLD) and
    the negative/SERVFAIL caching at resolvers; some public resolvers offer a cache flush.

Safe migration order (multi-signer, RFC 8901)
  1. Lower TTLs. 2. Add the new provider's DNSKEY to the old zone and vice versa so both
  sign validly. 3. Add the new DS alongside the old one. 4. Switch NS at the registrar and
  wait > max(NS TTL, DS TTL). 5. Remove the old DS and keys.
  Or simpler: go insecure first (remove DS, wait TTL), migrate, then re-sign and add DS.
Prevention: monitor DNSSEC validity from validating resolvers, and alert on DS/DNSKEY
mismatches and upcoming RRSIG expiry.`
    }
  ],
  interviewFocus: [
    {
      q: 'Walk me through DNS resolution for api.example.com from a Go service running in a Kubernetes pod.',
      a: `<ol>
<li>The Go resolver (pure Go by default on Linux) reads <code>/etc/resolv.conf</code>: nameserver = kube-dns Service IP (or NodeLocal DNSCache 169.254.20.10), search domains, <code>ndots:5</code>.</li>
<li><code>api.example.com</code> has 2 dots &lt; 5, so it first tries <code>api.example.com.&lt;ns&gt;.svc.cluster.local</code>, <code>.svc.cluster.local</code>, <code>.cluster.local</code> (and node domains) — A and AAAA each — all NXDOMAIN, then the absolute name.</li>
<li>Packets go to the Service VIP; kube-proxy (iptables/IPVS/eBPF) DNATs to a CoreDNS pod (conntrack entry).</li>
<li>CoreDNS: <code>kubernetes</code> plugin answers cluster names; others hit its <code>cache</code>, then <code>forward</code> to the upstream (node's resolv.conf → VPC resolver).</li>
<li>VPC resolver checks private hosted zones (split-horizon), its cache, then resolves iteratively: root → .com → example.com authoritative (e.g. Route 53) → CNAME to ALB → A records.</li>
<li>Answers are cached at CoreDNS and the VPC resolver per TTL. Go itself does not cache, so each new <code>Dial</code> repeats from step 1 — connection pooling avoids that.</li>
</ol>
<p>Points to highlight: ndots amplification, conntrack/UDP issues, CoreDNS capacity, and that changing the record only affects new connections.</p>`
    },
    {
      q: 'What are the trade-offs of short vs long DNS TTLs?',
      a: `<ul>
<li><strong>Short (30–60 s)</strong>: faster failover and migrations, quick rollback. Costs: more queries (cost on Route 53, load on resolvers), more latency on cache misses, and higher sensitivity to DNS provider outages — when the provider is down, caches empty within a minute.</li>
<li><strong>Long (hours–days)</strong>: resilient to provider outages, fewer lookups, faster average resolution. Costs: changes and failover take hours; mistakes linger.</li>
<li>Reality check: many resolvers clamp TTLs and clients cache independently; long-lived connections ignore DNS entirely. So failover via DNS is never instantaneous.</li>
<li>Typical policy: 300 s for most service records; 60 s for records used in failover; long TTLs for NS/MX; lower TTL ahead of planned changes.</li>
<li>For critical zones, combine moderate TTLs with <strong>multi-provider DNS</strong> and serve-stale (RFC 8767) resolvers so outages of the authoritative provider are survivable.</li>
</ul>`
    },
    {
      q: 'How do GeoDNS and anycast differ for routing users to the nearest region?',
      a: `<p><strong>GeoDNS</strong> returns different IPs based on the requesting resolver's location (or EDNS Client Subnet). Pros: per-region IPs, fine-grained policy (weights, health, compliance — keep EU users in EU), works with any infrastructure. Cons: decided at resolution time and cached for TTL; uses resolver location (wrong for users of distant public resolvers without ECS); failover limited by TTL and client caches.</p>
<p><strong>Anycast</strong> announces the same IP from many locations; BGP routes each packet to the topologically nearest site. Pros: instant failover when a site withdraws its route, natural DDoS distribution, single IP to whitelist. Cons: "nearest" by BGP is not always lowest latency; route changes can move TCP flows mid-connection; requires owning IP space and BGP operations (or a provider: Cloudflare, Global Accelerator, GCP global LB).</p>
<p>Production systems use both: anycast for the edge/CDN and DNS resolvers, GeoDNS/latency routing for steering to regional backends and for data-residency rules.</p>`
    },
    {
      q: 'A company had a major outage because its DNS provider was DDoSed. How would you make DNS resilient?',
      a: `<ul>
<li><strong>Multiple authoritative providers</strong> (e.g. Route 53 + Cloudflare/NS1), all listed in the registrar NS set, kept in sync via IaC (OctoDNS, Terraform, DNSControl). Resolvers retry other NS servers automatically.</li>
<li><strong>Anycast authoritative networks</strong> with large DDoS capacity.</li>
<li><strong>Sensible TTLs</strong> (not 30 s everywhere) so caches carry you through short outages; resolvers with serve-stale (RFC 8767).</li>
<li><strong>Registrar security</strong>: registry lock, MFA, monitoring for NS/DS changes and domain expiry.</li>
<li><strong>Internal dependency awareness</strong>: make sure internal tooling, auth and runbooks do not depend on the same DNS that may be down (Facebook 2021 lesson); keep break-glass access by IP.</li>
<li><strong>Monitoring</strong>: synthetic resolution checks from many vantage points, SERVFAIL rate, resolution latency, and alerting on unexpected record changes.</li>
<li>DNSSEC with multi-provider requires careful key management (multi-signer model) — plan it, or it becomes a self-inflicted outage.</li>
</ul>`
    }
  ],
  quiz: [
    { q: 'Why can a CNAME not be used at the zone apex?', a: 'A CNAME must be the only record at its name, but the apex must have SOA and NS records. Providers offer ALIAS/ANAME or CNAME flattening instead.' },
    { q: 'What determines how long an NXDOMAIN is cached?', a: 'The lower of the SOA record TTL and the SOA minimum field (RFC 2308 negative caching).' },
    { q: 'When does DNS fall back to TCP?', a: 'When a UDP response is truncated (TC bit set) because it exceeds the EDNS0 buffer size (1232 bytes recommended), and for zone transfers; DoT also uses TCP.' },
    { q: 'What does ndots:5 do in a Kubernetes pod?', a: 'Names with fewer than 5 dots are first tried with each search domain appended before being tried as absolute, causing many extra queries for external names.' },
    { q: 'What does a headless Kubernetes Service return in DNS?', a: 'The individual pod IPs (A/AAAA records) instead of a single ClusterIP, plus per-pod names for StatefulSets.' },
    { q: 'Does DNSSEC encrypt DNS queries?', a: 'No. DNSSEC provides integrity and authenticity via signatures. Encryption/privacy comes from DoT, DoH or DoQ.' },
    { q: 'What record type restricts which certificate authorities may issue certificates for a domain?', a: 'CAA (Certification Authority Authorization).' },
    { q: 'Does the Go standard library cache DNS results?', a: 'No. Each new dial resolves again; caching happens in the system/cluster resolvers, and connection pooling reduces lookups.' },
    { q: 'A name returns SERVFAIL from 1.1.1.1 but resolves with dig +cd. What does that tell you?', a: '+cd (checking disabled) skips DNSSEC validation, so the data exists but validation fails: typically a stale or wrong DS record at the parent, expired RRSIGs or a broken key rollover.' }
  ],
  resources: [
    { title: 'RFC 1034 — Domain Names: Concepts and Facilities', url: 'https://datatracker.ietf.org/doc/html/rfc1034', type: 'docs' },
    { title: 'RFC 2308 — Negative Caching of DNS Queries', url: 'https://datatracker.ietf.org/doc/html/rfc2308', type: 'docs' },
    { title: 'Cloudflare Learning — What is DNS?', url: 'https://www.cloudflare.com/learning/dns/what-is-dns/', type: 'article' },
    { title: 'Cloudflare Learning — DNS records explained', url: 'https://www.cloudflare.com/learning/dns/dns-records/', type: 'article' }
  ]
},
// ───────────────────────────── Module 6 ─────────────────────────────
{
  n: 6,
  title: 'Proxies & Load Balancers',
  summary: 'Forward, reverse and transparent proxies; L4 vs L7 load balancing; algorithms from round robin to consistent hashing and power-of-two-choices; health checks, stickiness and connection draining; TLS termination options and DSR; how Nginx, HAProxy, Envoy and global load balancers fit together; and how Kubernetes Services balance traffic (kube-proxy nftables/IPVS, eBPF). Load balancing is in nearly every system design interview.',
  topics: [
    {
      title: 'Forward, Reverse & Transparent Proxies',
      def: `<p>A <strong>proxy</strong> is an intermediary that terminates one connection and opens another. The difference is <em>whom it represents</em>:</p>
<table>
<thead><tr><th></th><th>Forward proxy</th><th>Reverse proxy</th><th>Transparent proxy</th></tr></thead>
<tbody>
<tr><td>Acts for</td><td>Clients</td><td>Servers</td><td>Network operator (clients unaware)</td></tr>
<tr><td>Client config</td><td>Explicit (<code>HTTPS_PROXY</code>, PAC file)</td><td>None — clients think it is the server</td><td>None — traffic intercepted (iptables TPROXY/REDIRECT, WCCP)</td></tr>
<tr><td>Typical use</td><td>Egress control, caching, corporate filtering, hiding client IPs</td><td>Load balancing, TLS termination, caching, WAF, compression, routing</td><td>ISP caching, corporate inspection, <strong>service mesh sidecars</strong> (iptables redirects pod traffic to Envoy)</td></tr>
<tr><td>Examples</td><td>Squid, corporate Zscaler, egress gateways</td><td>Nginx, HAProxy, Envoy, ALB, Cloudflare</td><td>Istio sidecar, Squid intercept mode</td></tr>
</tbody>
</table>
<p>For HTTPS, a forward proxy usually receives <code>CONNECT host:443</code> and blindly tunnels the TLS bytes (it sees only the hostname via CONNECT/SNI) unless it performs TLS interception with a corporate CA. Go clients honour <code>HTTP_PROXY</code>/<code>HTTPS_PROXY</code>/<code>NO_PROXY</code> via <code>http.ProxyFromEnvironment</code> (the default Transport).</p>
<p>Because a reverse proxy terminates the client connection, the backend sees the <em>proxy's</em> IP. Client identity must be forwarded: <code>X-Forwarded-For</code> (appended at each hop; trust only entries added by your own proxies), <code>X-Forwarded-Proto</code>, the standard <code>Forwarded</code> header (RFC 7239), or the <strong>PROXY protocol</strong> (v1 text / v2 binary header prepended to the TCP stream — used by L4 LBs like AWS NLB and HAProxy when the backend must see the real client IP for non-HTTP traffic).</p>`,
      interview: 'Be precise about who the proxy represents and what it can see. A frequent follow-up is client IP spoofing via X-Forwarded-For: only trust the rightmost entries added by proxies you control, or use the PROXY protocol at L4.',
      examples: [
        { label: 'Nginx reverse proxy forwarding client identity', lang: 'nginx', code: `upstream api {
    server 10.0.5.20:8080 max_fails=3 fail_timeout=10s;
    server 10.0.5.21:8080 max_fails=3 fail_timeout=10s;
    keepalive 64;
}

server {
    listen 443 ssl;
    http2 on;
    server_name api.example.com;
    ssl_certificate     /etc/ssl/api.crt;
    ssl_certificate_key /etc/ssl/api.key;

    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;
        proxy_read_timeout 30s;
    }
}` }
      ]
    },
    {
      title: 'L4 vs L7 Load Balancing',
      def: `<p><strong>L4 load balancers</strong> operate on TCP/UDP flows. Two styles:</p>
<ul>
<li><strong>Pass-through / NAT</strong>: packets are forwarded (DNAT, or encapsulated) to a backend chosen by hashing the 5-tuple; the TCP connection is end-to-end between client and backend. Examples: AWS NLB, GCP passthrough NLB, Google Maglev, Facebook Katran, Linux IPVS, kube-proxy.</li>
<li><strong>L4 proxy</strong>: terminates TCP and opens a new TCP connection (HAProxy <code>mode tcp</code>, Envoy <code>tcp_proxy</code>, Nginx <code>stream</code>).</li>
</ul>
<p>Strengths: protocol-agnostic (databases, MQTT, custom TCP, UDP, QUIC), extremely fast (millions of pps), cheap per connection, TLS passthrough possible. Weaknesses: <strong>balances connections, not requests</strong>; no content-based routing; no HTTP-aware retries or metrics.</p>
<p><strong>L7 load balancers</strong> are full proxies that parse HTTP/gRPC: routing by host/path/header/method, per-request balancing over pooled backend connections, retries/timeouts/circuit breaking, header manipulation, auth, compression, caching, request-level observability (status codes, latency per route). Examples: AWS ALB, GCP external Application LB, Envoy, Nginx, HAProxy <code>mode http</code>, Traefik.</p>
<p>The <strong>long-lived connection problem</strong>: with HTTP/2, gRPC, WebSockets or DB pools behind an L4 LB, clients hold a few connections for hours, so newly added backends get no traffic and load skews. Remedies: L7 balancing, client-side balancing, or capping connection age (gRPC <code>MaxConnectionAge</code>, HTTP/2 <code>GOAWAY</code>).</p>
<p>Common architecture: <strong>L4 tier</strong> (anycast/ECMP + Maglev/NLB) for scale and DDoS resilience in front of an <strong>L7 tier</strong> (Envoy/Nginx fleet or ALB) that does the smart routing.</p>`,
      interview: 'Do not just list features — explain the consequence: L4 sees flows, L7 sees requests. Then apply it: gRPC behind an NLB, the long-lived connection skew, and why big companies layer L4 in front of L7.',
      examples: [
        { label: 'Nginx L4 (stream) load balancing for PostgreSQL', lang: 'nginx', code: `stream {
    upstream pg_read {
        least_conn;
        server 10.0.6.11:5432 max_fails=2 fail_timeout=5s;
        server 10.0.6.12:5432 max_fails=2 fail_timeout=5s;
    }
    server {
        listen 5432;
        proxy_pass pg_read;
        proxy_connect_timeout 2s;
        proxy_timeout 10m;          # idle timeout for long-lived DB connections
    }
}` }
      ]
    },
    {
      title: 'Load Balancing Algorithms',
      def: `<table>
<thead><tr><th>Algorithm</th><th>How it works</th><th>Good for</th><th>Watch out</th></tr></thead>
<tbody>
<tr><td>Round robin</td><td>Next backend in order</td><td>Homogeneous backends, uniform requests</td><td>Ignores load and slow nodes</td></tr>
<tr><td>Weighted round robin</td><td>Proportional to weights</td><td>Mixed instance sizes, canaries (5%)</td><td>Static weights</td></tr>
<tr><td>Least connections / least request</td><td>Fewest active connections/requests</td><td>Variable request duration, long-lived connections</td><td>Herding onto a newly added (empty) node; needs slow start</td></tr>
<tr><td>Least response time / EWMA</td><td>Lowest recent latency (× active requests)</td><td>Heterogeneous latency (Linkerd, Finagle "peak EWMA", Nginx Plus <code>least_time</code>)</td><td>Fast-failing nodes look "fast" — combine with outlier detection</td></tr>
<tr><td>IP hash / consistent hashing (ring hash, Maglev)</td><td>Hash of client IP / header / key picks the node; adding/removing a node remaps only ~1/N keys</td><td>Cache affinity (sharded caches), session affinity, stateful backends</td><td>Hot keys; IP hash breaks behind NAT (many users share one IP)</td></tr>
<tr><td>Random / Power of two choices (P2C)</td><td>Pick 2 random backends, send to the less loaded</td><td>Large distributed LB fleets with stale load info (Envoy <code>LEAST_REQUEST</code> default)</td><td>Almost none — exponentially better than random, avoids herding</td></tr>
</tbody>
</table>
<p><strong>Why P2C matters</strong>: with many independent LB instances, "least loaded" based on each instance's view causes all of them to pick the same seemingly idle node (herd behaviour). Choosing the better of two random candidates keeps the maximum load close to optimal (max load drops from O(log n / log log n) to O(log log n)) while avoiding synchronisation.</p>
<p><strong>Consistent hashing</strong>: nodes and keys are hashed onto a ring; a key goes to the next node clockwise. <strong>Virtual nodes</strong> (100–200 points per node) smooth the distribution. <strong>Maglev hashing</strong> (Google) uses a lookup table for even spread and minimal disruption; <strong>bounded-load consistent hashing</strong> caps per-node load to handle hot keys.</p>`,
      interview: 'Pick algorithms with reasons: least-request/P2C as a strong default for HTTP services, consistent hashing for cache affinity, weighted for canaries. Explaining why P2C beats naive least-connections in a distributed LB fleet is a distinguished-level signal.',
      examples: [
        { label: 'Envoy cluster: least request (P2C) + health checks + outlier detection', lang: 'yaml', code: `clusters:
- name: orders
  type: STRICT_DNS
  connect_timeout: 1s
  lb_policy: LEAST_REQUEST          # P2C by default (choice_count: 2)
  least_request_lb_config:
    choice_count: 2
  common_lb_config:
    healthy_panic_threshold: { value: 50 }
  load_assignment:
    cluster_name: orders
    endpoints:
    - lb_endpoints:
      - endpoint: { address: { socket_address: { address: orders.internal, port_value: 8080 } } }
  health_checks:
  - timeout: 1s
    interval: 5s
    unhealthy_threshold: 3
    healthy_threshold: 2
    http_health_check: { path: /readyz }
  outlier_detection:               # passive health checking
    consecutive_5xx: 5
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50` }
      ]
    },
    {
      title: 'Health Checks, Sticky Sessions & Connection Draining',
      def: `<p><strong>Active health checks</strong>: the LB probes each backend (TCP connect, HTTP <code>GET /healthz</code>, gRPC health protocol) on an interval with healthy/unhealthy thresholds. <strong>Passive health checks</strong> (outlier detection): the LB watches real traffic — consecutive 5xx, connect failures, latency — and temporarily ejects bad hosts. Use both: active catches dead hosts with no traffic; passive reacts within requests.</p>
<ul>
<li>Health endpoints should reflect <strong>ability to serve</strong> (readiness), but avoid deep checks that fail every instance at once when a shared dependency blips — that turns a partial outage into a total one. Envoy's <strong>panic threshold</strong> routes to all hosts if too many are unhealthy.</li>
<li>Kubernetes: <em>readiness</em> probe gates Service endpoints; <em>liveness</em> restarts the container — never make liveness depend on downstream services.</li>
</ul>
<p><strong>Sticky sessions</strong> (session affinity) send a client to the same backend: LB-generated cookie (ALB <code>AWSALB</code>), application cookie, or source-IP / header hashing. They help stateful legacy apps and caches, but cause uneven load, break on node failure (sessions lost), and complicate scaling. Prefer <strong>stateless services</strong> with shared session storage (Redis) or signed tokens.</p>
<p><strong>Connection draining</strong> (deregistration delay): when a backend is removed, the LB stops sending <em>new</em> requests but lets in-flight ones finish for a grace period (ALB/NLB default 300 s). In Kubernetes, pod termination races with endpoint removal, so:</p>
<ol>
<li>Add a <code>preStop</code> sleep (5–15 s) so LBs/kube-proxy stop routing before the app stops.</li>
<li>On SIGTERM, stop accepting, finish in-flight requests (<code>http.Server.Shutdown</code>), send <code>Connection: close</code> / HTTP/2 GOAWAY.</li>
<li>Set <code>terminationGracePeriodSeconds</code> longer than preStop + drain time.</li>
</ol>
<p><strong>Slow start</strong> (Envoy, ALB, HAProxy) ramps traffic to newly healthy hosts so cold caches and JITs are not overwhelmed.</p>`,
      interview: 'Zero-downtime deploys are a favourite topic: explain the Kubernetes endpoint-removal race, preStop sleep, graceful shutdown in Go, deregistration delay, and why 502s happen during rollouts without them. Also mention the danger of deep health checks causing fleet-wide ejection.',
      examples: [
        { label: 'Kubernetes graceful termination settings', lang: 'yaml', code: `spec:
  terminationGracePeriodSeconds: 45
  containers:
  - name: api
    image: ghcr.io/example/api:2.3.0
    readinessProbe:
      httpGet: { path: /readyz, port: 8080 }
      periodSeconds: 5
      failureThreshold: 2
    livenessProbe:
      httpGet: { path: /livez, port: 8080 }   # process health only, no dependencies
      periodSeconds: 10
      failureThreshold: 3
    lifecycle:
      preStop:
        sleep: { seconds: 10 }   # native sleep action (Kubernetes 1.30+); else exec sleep
# App: on SIGTERM -> srv.Shutdown(ctx with 30s timeout) to drain in-flight requests` }
      ]
    },
    {
      title: 'TLS Termination, Passthrough, Re-encryption & DSR',
      def: `<table>
<thead><tr><th>Mode</th><th>How</th><th>Pros</th><th>Cons</th></tr></thead>
<tbody>
<tr><td><strong>Termination</strong> (offload)</td><td>LB decrypts; plaintext to backends</td><td>L7 features, central cert management, offloads CPU</td><td>Plaintext inside the network — often not acceptable for zero-trust/compliance</td></tr>
<tr><td><strong>Passthrough</strong></td><td>L4 LB forwards encrypted bytes; backend terminates (LB may route by SNI)</td><td>End-to-end encryption, backend holds keys, mTLS to the backend possible</td><td>No L7 routing/inspection; certs on every backend; LB cannot add XFF (use PROXY protocol)</td></tr>
<tr><td><strong>Re-encryption</strong> (bridging)</td><td>LB terminates, then opens new TLS to backend (often mTLS)</td><td>L7 features + encryption in transit everywhere</td><td>Two handshakes, more CPU, two cert domains to manage</td></tr>
</tbody>
</table>
<p>Modern defaults: TLS 1.3 (1-RTT handshake, forward secrecy, AEAD ciphers), ECDSA certificates, session resumption, hybrid post-quantum key exchange (<code>X25519MLKEM768</code>, on by default in current browsers, Cloudflare and Go 1.24+), and fully automated issuance/rotation (ACME, cert-manager, ACM) — mandatory now that public certificate lifetimes are shrinking (200 days max from March 2026, heading to 47 days by 2029). OCSP stapling matters less than it used to: Let's Encrypt shut down its OCSP service in 2025 and revocation is moving to CRLs and browser-pushed lists (CRLite, CRLSets). Service meshes make re-encryption with mTLS cheap and automatic for east-west traffic.</p>
<p><strong>Direct Server Return (DSR)</strong>: the LB forwards only the <em>inbound</em> packets to the backend (rewriting the MAC in L2 DSR, or encapsulating with IPIP/GUE); the backend has the VIP configured on a loopback and replies <strong>directly to the client</strong>, bypassing the LB. Since responses are typically far larger than requests, the LB handles a fraction of the bandwidth. Used by Google Maglev, Facebook Katran, GitHub GLB, IPVS DR mode. Limits: L4 only (the LB never sees responses, so no L7 features, no TLS termination), backends need special network config (ARP suppression for the VIP), and MTU care for encapsulation.</p>`,
      interview: 'Be ready to choose a TLS mode under constraints ("PCI requires encryption in transit inside the VPC" → re-encrypt or passthrough), and to explain DSR as a bandwidth optimisation for asymmetric traffic with its L4-only limitation.',
      examples: [
        { label: 'HAProxy SNI-based TLS passthrough (no decryption)', lang: 'text', code: `frontend tls_in
    mode tcp
    bind :443
    tcp-request inspect-delay 5s
    tcp-request content accept if { req_ssl_hello_type 1 }
    use_backend payments if { req_ssl_sni -i pay.example.com }
    default_backend web

backend payments
    mode tcp
    server pay1 10.0.7.10:443 check send-proxy-v2   # PROXY v2 carries client IP
backend web
    mode tcp
    server web1 10.0.7.20:443 check` }
      ]
    },
    {
      title: 'Nginx, HAProxy, Envoy & Global vs Local Load Balancing',
      def: `<table>
<thead><tr><th></th><th>Nginx</th><th>HAProxy</th><th>Envoy</th></tr></thead>
<tbody>
<tr><td>Origin</td><td>Web server + reverse proxy</td><td>Dedicated high-performance LB</td><td>Cloud-native L4/L7 proxy (Lyft, CNCF)</td></tr>
<tr><td>Config</td><td>Static files, reload</td><td>Static files, hitless reload, Runtime API</td><td><strong>Dynamic via xDS APIs</strong> (LDS/RDS/CDS/EDS/SDS) from a control plane</td></tr>
<tr><td>Strengths</td><td>Static content, caching, ubiquity, simple configs</td><td>Raw performance, rich LB/stick tables, excellent observability</td><td>HTTP/2 + gRPC everywhere, retries, circuit breaking, outlier detection, rich stats/tracing, extensibility (Wasm, Lua, ext_authz)</td></tr>
<tr><td>Typical role</td><td>Edge web server, ingress (the community ingress-nginx project was retired in 2026; new clusters use Gateway API implementations)</td><td>Edge/L4 LB, high-throughput TCP</td><td>Service mesh data plane (Istio), Envoy Gateway, API gateways, edge proxy</td></tr>
</tbody>
</table>
<p><strong>Local load balancing</strong> distributes traffic among instances <em>within</em> a region/data centre (ALB, NLB, Envoy cluster). <strong>Global load balancing (GSLB)</strong> chooses the <em>region/site</em>:</p>
<ul>
<li><strong>DNS-based</strong> (Route 53 latency/geo/failover, NS1, Azure Traffic Manager): simple, works anywhere; failover limited by TTLs and resolver location.</li>
<li><strong>Anycast-based</strong> (AWS Global Accelerator, GCP global external Application LB, Cloudflare, Azure Front Door): one IP worldwide, users enter the provider's network at the nearest PoP, health-based failover in seconds without DNS caching issues, TLS termination at the edge.</li>
</ul>
<p>Design pattern: GSLB (anycast or DNS) → regional L4/L7 LB → service mesh / client-side LB → pods. Each layer has its own health checks and failure domain.</p>`,
      interview: 'Know when to reach for each proxy and why Envoy dominates cloud-native (xDS dynamic config, gRPC, observability). For global designs, articulate DNS GSLB vs anycast trade-offs and the layered pattern from global to local.',
      examples: [
        { label: 'Minimal Envoy L7 listener routing to the orders cluster', lang: 'yaml', code: `static_resources:
  listeners:
  - name: ingress_http
    address:
      socket_address: { address: 0.0.0.0, port_value: 8080 }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          route_config:
            virtual_hosts:
            - name: api
              domains: ["*"]
              routes:
              - match: { prefix: "/orders" }
                route:
                  cluster: orders
                  timeout: 2s
                  retry_policy:
                    retry_on: "connect-failure,reset,503"
                    num_retries: 2
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router` }
      ]
    },
    {
      title: 'Kubernetes Service Load Balancing: kube-proxy, nftables/IPVS & eBPF',
      def: `<p>A ClusterIP Service is not a proxy process: it is a <strong>virtual IP</strong> that exists only as packet-rewriting rules on every node. When a pod connects to <code>10.96.45.12:8080</code>, the node's dataplane picks a ready endpoint and <strong>DNATs</strong> the connection to a pod IP; conntrack remembers the choice so every packet of that connection goes to the same pod and replies are un-NATed.</p>
<table>
<thead><tr><th>Dataplane</th><th>How it picks a backend</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>kube-proxy <strong>iptables</strong></td><td>Chain of random-probability rules per Service</td><td>Long-time default; rule updates and lookups scale poorly with tens of thousands of endpoints</td></tr>
<tr><td>kube-proxy <strong>nftables</strong></td><td>Verdict maps (hash lookups)</td><td>GA in Kubernetes 1.33; the intended successor to iptables mode on modern kernels</td></tr>
<tr><td>kube-proxy <strong>IPVS</strong></td><td>In-kernel L4 LB with rr/lc/sh schedulers</td><td>Scales well but has feature gaps and is in maintenance mode upstream; prefer nftables for new clusters</td></tr>
<tr><td><strong>eBPF</strong> (Cilium kube-proxy replacement, Calico eBPF)</td><td>Socket-level or TC/XDP hash-map lookups</td><td>Can translate at <code>connect()</code> time (no per-packet NAT), supports Maglev hashing, DSR and source-IP preservation</td></tr>
</tbody>
</table>
<p>Behaviours that come up in interviews and incidents:</p>
<ul>
<li><strong>Per-connection, not per-request</strong>: like any L4 LB, a long-lived HTTP/2 or gRPC connection pins all its RPCs to one pod. Use a headless Service + client-side LB, a mesh, or <code>MaxConnectionAge</code>.</li>
<li><strong>Only ready endpoints</strong> receive new connections; terminating pods are removed asynchronously, hence preStop sleeps.</li>
<li><strong>External traffic</strong> (NodePort/LoadBalancer): <code>externalTrafficPolicy: Cluster</code> may hop to another node and SNATs, hiding the client IP; <code>Local</code> keeps the client IP and avoids the extra hop but only nodes with ready local pods pass the LB health check (uneven spread if pods are unevenly placed).</li>
<li><strong>Topology-aware routing</strong>: <code>spec.trafficDistribution: PreferClose</code> (or the older topology-aware hints) keeps traffic in the caller's zone to cut latency and cross-AZ cost, at the price of less even load.</li>
<li><code>sessionAffinity: ClientIP</code> gives crude stickiness by source IP (breaks behind SNAT).</li>
<li><strong>Conntrack is shared state</strong>: UDP DNS races, table exhaustion and stale entries after endpoint changes (old UDP flows keep going to a deleted pod until the entry expires) are classic node-level issues.</li>
</ul>`,
      interview: 'Explain that a ClusterIP is a VIP implemented as DNAT rules on every node, that balancing happens once per connection, and what that implies for gRPC. Then show currency: nftables mode is GA and replaces iptables mode, eBPF dataplanes (Cilium) remove kube-proxy entirely, and externalTrafficPolicy Local vs Cluster trades client-IP preservation against even spreading.',
      examples: [
        { label: 'See how a Service is implemented on a node', lang: 'bash', code: `# Which mode is kube-proxy using?
$ kubectl -n kube-system get cm kube-proxy -o yaml | grep -E '^\\s*mode:'
    mode: nftables

# nftables mode: the Service VIP is a key in a verdict map
$ sudo nft list map ip kube-proxy service-ips | grep 10.96.45.12
    10.96.45.12 . tcp . 8080 : goto service-ABCD1234-shop/orders/tcp/http

# iptables mode equivalent
$ sudo iptables -t nat -L KUBE-SERVICES -n | grep 10.96.45.12

# Live DNAT decisions recorded by conntrack
$ sudo conntrack -L -d 10.96.45.12 | head -2
tcp 6 86397 ESTABLISHED src=10.244.1.7 dst=10.96.45.12 sport=51122 dport=8080 \\
    src=10.244.2.31 dst=10.244.1.7 sport=8080 dport=51122 [ASSURED]

# Cilium (kube-proxy replacement): Service -> backend map
$ kubectl -n kube-system exec ds/cilium -- cilium-dbg service list | grep 10.96.45.12` }
      ]
    }
  ],
  problems: [
    {
      t: 'Explain forward vs reverse vs transparent proxy with examples',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Who configures the proxy? Who does it represent?</li><li>What does each see for HTTPS traffic?</li><li>Map: corporate egress proxy, Nginx in front of an API, Istio sidecar.</li></ul>`,
      solution: `Forward proxy: client-configured (HTTPS_PROXY), represents clients toward the internet.
  For HTTPS it receives CONNECT host:443 and tunnels encrypted bytes (sees hostname only)
  unless doing TLS interception. Example: corporate Zscaler/Squid, egress gateway.
Reverse proxy: invisible to clients, represents servers. Terminates TLS, load balances,
  caches, routes, adds X-Forwarded-For. Example: Nginx/Envoy/ALB in front of an API.
Transparent proxy: clients unaware; traffic is redirected by the network (iptables
  REDIRECT/TPROXY). Example: Istio sidecar capturing all pod inbound/outbound traffic.`
    },
    {
      t: 'Choose a load balancing algorithm for five workloads',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Workloads: stateless REST API on identical pods; requests that vary 10 ms–10 s; sharded in-memory cache cluster; canary release at 5%; mixed instance sizes.</li><li>Consider distributed LB instances and hot spots.</li></ul>`,
      solution: `Stateless REST API, identical pods     -> round robin or least request (P2C); P2C is a safe default
Highly variable request duration       -> least request / P2C (or EWMA latency-aware)
Sharded in-memory cache                -> consistent hashing on the cache key (ring/Maglev),
                                          bounded-load variant to survive hot keys
Canary at 5%                           -> weighted routing (95/5) at the L7 LB / mesh
Mixed instance sizes                   -> weighted least request (weights ~ capacity)`
    },
    {
      t: 'Preserve the real client IP through an NLB and an Nginx ingress',
      d: 'medium',
      type: 'design',
      hint: `<ul><li>Chain: client → AWS NLB (L4) → Nginx (L7) → Go service.</li><li>Options: NLB client IP preservation, PROXY protocol v2, X-Forwarded-For.</li><li>How does the Go service decide which XFF entry to trust?</li></ul>`,
      solution: `1. NLB -> Nginx: enable PROXY protocol v2 on the NLB target group (or rely on NLB client IP
   preservation for instance targets). Nginx:
     listen 443 ssl proxy_protocol;
     set_real_ip_from 10.0.0.0/16;          # NLB / VPC range
     real_ip_header proxy_protocol;
2. Nginx -> service:
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Real-IP $remote_addr;
3. Go service: take the client IP from X-Forwarded-For counting from the RIGHT, skipping the
   number of trusted proxies you operate; never trust the leftmost value blindly (clients
   can send a forged X-Forwarded-For header).
In Kubernetes: Service externalTrafficPolicy: Local preserves source IP for NodePort/LB
traffic (at the cost of uneven spreading if pods are not on every node).`
    },
    {
      t: 'Implement consistent hashing with virtual nodes in Go',
      d: 'medium',
      type: 'coding',
      hint: `<ul><li>Hash each node many times (<code>node#i</code>) onto a sorted ring of uint32.</li><li>Lookup: hash the key, binary-search the first ring point ≥ hash, wrap around.</li><li>Measure distribution and how many keys move when adding a node (~1/N).</li></ul>`,
      solution: `package main

import (
    "fmt"
    "hash/crc32"
    "slices"
    "sort"
    "strconv"
)

type Ring struct {
    replicas int
    points   []uint32
    owner    map[uint32]string
}

func NewRing(replicas int, nodes ...string) *Ring {
    r := &Ring{replicas: replicas, owner: map[uint32]string{}}
    for _, n := range nodes {
        r.Add(n)
    }
    return r
}

func (r *Ring) Add(node string) {
    for i := 0; i < r.replicas; i++ {
        h := crc32.ChecksumIEEE([]byte(node + "#" + strconv.Itoa(i)))
        r.points = append(r.points, h)
        r.owner[h] = node
    }
    slices.Sort(r.points)
}

func (r *Ring) Get(key string) string {
    if len(r.points) == 0 {
        return ""
    }
    h := crc32.ChecksumIEEE([]byte(key))
    i := sort.Search(len(r.points), func(i int) bool { return r.points[i] >= h })
    if i == len(r.points) {
        i = 0 // wrap around the ring
    }
    return r.owner[r.points[i]]
}

func main() {
    r := NewRing(150, "cache-a", "cache-b", "cache-c")
    before := map[string]string{}
    counts := map[string]int{}
    for i := 0; i < 100000; i++ {
        k := "user:" + strconv.Itoa(i)
        before[k] = r.Get(k)
        counts[before[k]]++
    }
    fmt.Println("distribution:", counts)

    r.Add("cache-d")
    moved := 0
    for k, n := range before {
        if r.Get(k) != n {
            moved++
        }
    }
    fmt.Printf("moved %.1f%% of keys (ideal ~25%%)\\n", float64(moved)/1000)
}`,
      lang: 'go'
    },
    {
      t: 'Debug: 502 errors during every Kubernetes rolling deployment',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>When does the pod stop accepting connections vs when do kube-proxy/ingress/ALB stop sending traffic?</li><li>Does the app handle SIGTERM and drain in-flight requests?</li><li>Check <code>terminationGracePeriodSeconds</code>, preStop, readiness, ALB deregistration delay and keep-alive reuse.</li></ul>`,
      solution: `Root cause: on pod deletion, the kubelet sends SIGTERM at the same time endpoints are
removed; kube-proxy, ingress controllers and the ALB (target deregistration) learn about it
asynchronously (hundreds of ms to seconds). Meanwhile the app exits immediately ->
connections refused/reset -> 502 at the proxy.

Fix:
1. preStop sleep 10-15s: the pod keeps serving while everyone removes it from rotation.
2. Graceful shutdown in Go:
     <-ctx.Done()   // SIGTERM
     shutdownCtx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
     defer cancel()
     srv.Shutdown(shutdownCtx) // stops accepting, closes idle conns, waits for in-flight
3. terminationGracePeriodSeconds > preStop + max request time (e.g. 45s).
4. ALB/NLB: deregistration_delay ~30-60s (default 300s slows deploys); with AWS LB Controller
   use pod readiness gates so new pods are registered healthy before old ones go.
5. maxUnavailable: 0, maxSurge: 25% so capacity never drops.
Verify with a load test (hey/vegeta) during a rollout: 0 non-2xx.`
    },
    {
      t: 'Debug: one backend gets most of the traffic',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>Is the LB L4 or L7? Are clients using HTTP/2, gRPC or long keep-alive connections?</li><li>Was the hot backend the first one up after a deploy (least-conn herding / connection age)?</li><li>Hash-based? Check for hot keys or many users behind one NAT IP.</li><li>Look at per-backend connection counts vs request counts.</li></ul>`,
      solution: `Investigate per-backend: active connections, RPS, latency (LB metrics, Envoy
upstream_rq_total per host, ss -tn on backends).

Common causes and fixes:
1. L4 LB + long-lived HTTP/2/gRPC connections: connections were established when only some
   backends existed (e.g. during a rollout) and never rebalance.
   -> L7 / mesh balancing per request, or gRPC MaxConnectionAge (e.g. 5m) + client-side LB.
2. Client keep-alive pools with few connections (e.g. 1 connection per client).
   -> more clients connections, or L7 LB that balances requests over its own pool.
3. Source-IP hashing with many users behind a corporate NAT / CGNAT.
   -> hash on a better key (user ID, cookie) or use least request.
4. Consistent hashing with a hot key.
   -> bounded-load consistent hashing, key splitting, local caching of hot keys.
5. Least-connections herding onto a new or fast-failing node (errors return fast and look
   "less loaded").
   -> P2C, outlier detection, slow start.
6. Kubernetes externalTrafficPolicy: Local with uneven pod placement.
   -> topology spread constraints or Cluster policy.`
    },
    {
      t: 'Build a simple L4 TCP load balancer in Go',
      d: 'hard',
      type: 'coding',
      hint: `<ul><li>Accept connections, choose a healthy backend, dial it, and copy bytes both ways with <code>io.Copy</code> (uses splice on Linux).</li><li>Propagate half-close with <code>CloseWrite</code> so protocols that shut down one direction still work.</li><li>Active health checks (periodic TCP dial) + passive (mark down on dial failure).</li><li>Pick with power-of-two-choices on active connection counts.</li></ul>`,
      solution: `package main

import (
    "context"
    "io"
    "log"
    "math/rand/v2"
    "net"
    "os/signal"
    "sync"
    "sync/atomic"
    "syscall"
    "time"
)

type Backend struct {
    Addr    string
    healthy atomic.Bool
    active  atomic.Int64
}

type Pool struct{ backends []*Backend }

func NewPool(addrs ...string) *Pool {
    p := &Pool{}
    for _, a := range addrs {
        b := &Backend{Addr: a}
        b.healthy.Store(true)
        p.backends = append(p.backends, b)
    }
    return p
}

// Pick uses power-of-two-choices over healthy backends (least active connections).
func (p *Pool) Pick() *Backend {
    var up []*Backend
    for _, b := range p.backends {
        if b.healthy.Load() {
            up = append(up, b)
        }
    }
    switch len(up) {
    case 0:
        return nil
    case 1:
        return up[0]
    }
    a, b := up[rand.IntN(len(up))], up[rand.IntN(len(up))]
    if b.active.Load() < a.active.Load() {
        return b
    }
    return a
}

func (p *Pool) HealthCheck(ctx context.Context, every time.Duration) {
    t := time.NewTicker(every)
    defer t.Stop()
    for {
        for _, b := range p.backends {
            c, err := net.DialTimeout("tcp", b.Addr, time.Second)
            if err == nil {
                c.Close()
            }
            if was := b.healthy.Swap(err == nil); was != (err == nil) {
                log.Printf("backend %s healthy=%v", b.Addr, err == nil)
            }
        }
        select {
        case <-ctx.Done():
            return
        case <-t.C:
        }
    }
}

func (p *Pool) Serve(client net.Conn) {
    defer client.Close()
    b := p.Pick()
    if b == nil {
        log.Print("no healthy backends")
        return
    }
    up, err := net.DialTimeout("tcp", b.Addr, 2*time.Second)
    if err != nil {
        b.healthy.Store(false) // passive health check
        log.Printf("dial %s: %v", b.Addr, err)
        return
    }
    defer up.Close()
    b.active.Add(1)
    defer b.active.Add(-1)

    var wg sync.WaitGroup
    pipe := func(dst, src net.Conn) {
        defer wg.Done()
        io.Copy(dst, src) // zero-copy splice on Linux for TCP->TCP
        if tc, ok := dst.(*net.TCPConn); ok {
            tc.CloseWrite() // propagate half-close (FIN)
        }
    }
    wg.Add(2)
    go pipe(up, client)
    go pipe(client, up)
    wg.Wait()
}

func main() {
    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    pool := NewPool("127.0.0.1:9001", "127.0.0.1:9002", "127.0.0.1:9003")
    go pool.HealthCheck(ctx, 5*time.Second)

    ln, err := net.Listen("tcp", ":8000")
    if err != nil {
        log.Fatal(err)
    }
    context.AfterFunc(ctx, func() { ln.Close() })
    log.Print("L4 LB listening on :8000")
    for {
        c, err := ln.Accept()
        if err != nil {
            if ctx.Err() != nil {
                return
            }
            continue
        }
        go pool.Serve(c)
    }
}
// Extensions: idle timeouts via deadlines, connection draining on shutdown (WaitGroup),
// PROXY protocol v2 header to preserve client IP, metrics per backend, weighted choices.`,
      lang: 'go'
    },
    {
      t: 'Design global load balancing for a multi-region service',
      d: 'hard',
      type: 'design',
      hint: `<ul><li>Active-active in 3 regions (us-east, eu-west, ap-south); p99 &lt; 200 ms globally; region failover &lt; 1 minute.</li><li>Global layer: DNS GSLB vs anycast (Global Accelerator / global LB / CDN).</li><li>Regional layer: L4/L7 LBs, health checks, capacity headroom.</li><li>Data: where do writes go? Session state? Data residency?</li></ul>`,
      solution: `Global entry
- Anycast front door (AWS Global Accelerator, GCP global Application LB, or Cloudflare):
  one set of static IPs, users enter the provider backbone at the nearest PoP, TLS terminated
  at the edge (lower handshake RTT), health-based regional failover in seconds, no DNS TTL lag.
- DNS (Route 53) points the hostname at the anycast IPs; optional latency-based records as a
  fallback path. Multiple DNS providers for the zone.

Regional layer
- Each region: ALB/Envoy gateway -> services (mesh / client-side LB) across 3 AZs.
- Deep regional health endpoint feeds the global LB; traffic dials (weights per region) for
  draining a region during incidents or deploys.
- Capacity: N+1 regions - each region sized to absorb a failed region's share (~50% headroom
  with 3 regions) or autoscaling with pre-warmed minimums.

State
- Stateless services; sessions in signed tokens or regional caches.
- Data: home-region per user/tenant (writes routed to home region via a routing header/
  cookie), or multi-region DB (Spanner, CockroachDB, DynamoDB global tables, Aurora Global
  with write forwarding). Respect residency (EU users pinned to EU).

Failure handling
- Retries with budgets; idempotency keys for cross-region retries.
- Avoid thundering herds on failover: rate-limit at the edge, autoscale target region,
  shed low-priority traffic.
- Regular game days that fail over a full region.`
    },
    {
      t: 'Debug: intermittent 504s from the load balancer on slow endpoints',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Chain: browser → CDN → ALB → Nginx ingress → Go service → database. Each hop has its own timeout.</li><li>Do the 504s cluster at a suspiciously round duration (30 s, 60 s)? Which component generated them (check the Server header and each hop's access logs)?</li><li>What happens to the work on the backend after the proxy gives up?</li><li>Distinguish 502 (connection failed/reset) from 504 (upstream too slow).</li></ul>`,
      solution: `Find who timed out
  - The response body/headers name the generator (CloudFront "Generated by cloudfront",
    ALB plain 504 page, nginx "504 Gateway Time-out").
  - Latency histogram of the 504s: a hard wall at exactly 60.0 s = nginx proxy_read_timeout
    default (60 s) or the ALB idle timeout (60 s); 30 s = CDN origin read timeout, etc.
  - Access logs: ALB target_processing_time = -1 with elb_status_code 504; nginx
    upstream_response_time ~60.000 with status 504; app logs show the request finishing at
    75 s - after nobody was waiting.
Root cause: the timeouts shrink in the wrong direction. A report endpoint takes 45-90 s;
nginx gives up at 60 s while the app keeps working (wasted DB load, and client retries
multiply it).
Fix
  - Budget timeouts from the outside in: client > CDN > LB > proxy > app > DB, each hop a
    bit shorter than its caller, and propagate deadlines (context, grpc-timeout) so the app
    stops work when the caller has gone.
  - Make long work asynchronous: 202 Accepted + job ID + polling/webhook/SSE instead of a
    90 s synchronous request.
  - Raise specific timeouts only for the routes that need it (nginx location-level
    proxy_read_timeout, ALB idle timeout) rather than globally.
  - Keep keep-alive idle timeouts in the opposite order (server > LB > client) to avoid 502s.`
    }
  ],
  interviewFocus: [
    {
      q: 'Design the load balancing layer for a high-traffic HTTP API. Walk from the client to the pod.',
      a: `<ol>
<li><strong>DNS / GSLB</strong>: hostname resolves to anycast IPs (Global Accelerator, Cloudflare, GCP global LB) or latency-based regional records.</li>
<li><strong>Edge / L4</strong>: anycast + ECMP into a Maglev/NLB-style L4 tier — absorbs DDoS, spreads connections with consistent hashing, preserves connections when L4 nodes change.</li>
<li><strong>L7 tier</strong>: Envoy/ALB/API gateway terminates TLS 1.3, routes by host/path, enforces auth and rate limits, retries idempotent requests with budgets, balances per request with least-request/P2C, ejects outliers.</li>
<li><strong>In-cluster</strong>: mesh sidecars/ambient or gRPC client-side LB for east-west traffic with mTLS.</li>
<li><strong>Pods</strong>: readiness probes, graceful shutdown, preStop hooks, connection draining.</li>
</ol>
<p>Cross-cutting: active + passive health checks at every layer, panic thresholds, slow start, timeouts that shrink as you go deeper (edge 30 s &gt; service 10 s &gt; DB 2 s), observability per hop (RED metrics, tracing headers), and capacity headroom so losing an AZ or region is survivable.</p>`
    },
    {
      q: 'Explain consistent hashing. Why is it used in load balancers and caches, and what are its weaknesses?',
      a: `<p>With naive <code>hash(key) % N</code>, changing N remaps almost every key — catastrophic for caches (mass misses → origin overload). <strong>Consistent hashing</strong> places nodes and keys on a hash ring; each key belongs to the next node clockwise, so adding/removing one node moves only ~1/N of keys.</p>
<ul>
<li><strong>Virtual nodes</strong> (many points per server) fix uneven arcs and allow weighting by capacity.</li>
<li><strong>Maglev hashing</strong>: a precomputed lookup table giving near-perfect balance and minimal disruption — used in Google's and Envoy's L4/L7 LBs. <strong>Jump hash</strong> and <strong>rendezvous (HRW) hashing</strong> are alternatives.</li>
<li>Uses: L4 LBs keeping flows on the same backend across LB changes, sticky routing to sharded caches (Memcached clients), partitioning in Cassandra/DynamoDB, Envoy <code>RING_HASH</code>/<code>MAGLEV</code> for session affinity.</li>
</ul>
<p>Weaknesses: <strong>hot keys</strong> overload one node (fix: bounded-load consistent hashing, replication of hot keys, local caches); poor balance without enough virtual nodes; affinity reduces the LB's freedom to avoid slow nodes; and membership must be consistent across all LB instances or keys flap.</p>`
    },
    {
      q: 'How do you achieve zero-downtime deployments behind a load balancer?',
      a: `<ul>
<li><strong>Readiness gating</strong>: new instances receive traffic only after readiness passes (warm caches, connections to dependencies); optional slow start.</li>
<li><strong>Surge before removal</strong>: <code>maxSurge</code> &gt; 0, <code>maxUnavailable: 0</code>.</li>
<li><strong>Remove from rotation first, then stop</strong>: preStop sleep so LBs/kube-proxy/ingress stop routing; LB deregistration delay; mark not-ready.</li>
<li><strong>Graceful shutdown</strong>: on SIGTERM stop accepting, finish in-flight requests (<code>http.Server.Shutdown</code>), close idle keep-alives, send HTTP/2 GOAWAY; long-lived streams get a reconnect signal.</li>
<li><strong>Compatibility</strong>: old and new versions run simultaneously — APIs and DB schemas must be backward compatible (expand/contract migrations).</li>
<li><strong>Progressive delivery</strong>: canary with weighted routing (1% → 10% → 50%), automated rollback on SLO burn (Argo Rollouts, Flagger).</li>
<li><strong>Client side</strong>: retries for idempotent requests on connection errors cover the remaining races.</li>
</ul>`
    },
    {
      q: 'When would you use TLS termination at the load balancer versus end-to-end encryption?',
      a: `<p><strong>Terminate at the LB</strong> when you need L7 features (routing, WAF, auth, caching) and the internal network is trusted or encrypted at a lower layer (e.g. cloud VPC encryption on modern instance types). It centralises certificates (ACM, cert-manager) and offloads crypto.</p>
<p><strong>Re-encrypt</strong> (terminate + new TLS/mTLS to backend) when compliance (PCI DSS, HIPAA) or zero-trust policy requires encryption in transit everywhere but you still need L7 features. Service meshes automate this with per-workload identities (SPIFFE) and short-lived certificates.</p>
<p><strong>Passthrough</strong> when the backend must hold the keys (HSM-backed, client certificate auth end-to-end, regulatory key custody), for non-HTTP TLS protocols, or for multi-tenant platforms routing by SNI to tenant-managed certs. Trade-off: no L7 inspection; client IP via PROXY protocol.</p>
<p>Whatever the mode: TLS 1.3 preferred (1.2 minimum), automated rotation, HSTS at the edge, and monitoring of certificate expiry — expired certificates remain one of the most common self-inflicted outages.</p>`
    }
  ],
  quiz: [
    { q: 'What is the main difference between a forward and a reverse proxy?', a: 'A forward proxy acts on behalf of clients (configured by them) to reach servers; a reverse proxy acts on behalf of servers and is transparent to clients.' },
    { q: 'Why does an L4 load balancer distribute gRPC traffic poorly?', a: 'It balances connections, and gRPC multiplexes many RPCs over a few long-lived HTTP/2 connections, so load sticks to whichever backends hold those connections.' },
    { q: 'What is the power of two choices algorithm?', a: 'Pick two backends at random and send the request to the less loaded one; gives near-optimal balance without herding, used by Envoy LEAST_REQUEST.' },
    { q: 'What fraction of keys move when a node is added to a consistent hash ring of N nodes?', a: 'About 1/(N+1) of keys - only those that now fall on the new node.' },
    { q: 'What is the difference between active and passive health checks?', a: 'Active: the LB probes backends periodically. Passive (outlier detection): the LB ejects backends based on errors/latency observed in real traffic.' },
    { q: 'What is Direct Server Return?', a: 'The LB forwards only inbound packets; backends reply directly to clients using the VIP on a loopback, so response traffic bypasses the LB. L4 only.' },
    { q: 'What is the PROXY protocol used for?', a: 'Passing the original client IP/port from an L4 proxy or LB to the backend by prepending a header to the TCP stream (v1 text, v2 binary).' },
    { q: 'What is the default AWS ALB/NLB deregistration delay?', a: '300 seconds; often lowered to 30-60 seconds for faster deployments.' }
  ],
  resources: [
    { title: 'Envoy Docs — Load balancing overview', url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/overview', type: 'docs' },
    { title: 'NGINX Docs — Using nginx as HTTP load balancer', url: 'https://nginx.org/en/docs/http/load_balancing.html', type: 'docs' },
    { title: 'Cloudflare Learning — What is load balancing?', url: 'https://www.cloudflare.com/learning/performance/what-is-load-balancing/', type: 'article' },
    { title: 'Cloudflare Learning — What is a reverse proxy?', url: 'https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/', type: 'article' }
  ]
},
// ───────────────────────────── Module 7 ─────────────────────────────
{
  n: 7,
  title: 'API Gateway & Service Mesh',
  summary: 'What an API gateway does (routing, authentication, rate limiting, transformation, aggregation), the BFF pattern, how gateways differ from load balancers, reverse proxies and service meshes, the Kubernetes Gateway API, and service mesh architecture — data plane vs control plane, sidecar vs ambient, and north-south vs east-west traffic.',
  topics: [
    {
      title: 'API Gateway Responsibilities',
      def: `<p>An <strong>API gateway</strong> is a specialised L7 reverse proxy that is the single entry point for external (north-south) API traffic. It centralises cross-cutting concerns so every service does not re-implement them:</p>
<ul>
<li><strong>Routing</strong>: host/path/header/method → service and version; canary and blue/green splits; protocol translation (REST ↔ gRPC transcoding, WebSocket proxying).</li>
<li><strong>Authentication</strong>: validate API keys, JWTs (signature via JWKS, <code>exp</code>, <code>aud</code>, <code>iss</code>), OAuth 2.1 / OIDC token introspection, mTLS client certs. Pass identity downstream as trusted headers or a re-minted internal token. (Fine-grained <em>authorization</em> usually stays in services or a policy engine like OPA.)</li>
<li><strong>Rate limiting & quotas</strong>: per API key/tenant/IP/route; token bucket or sliding window; local (per instance) vs global (Redis / Envoy rate limit service); returns <code>429</code> with <code>Retry-After</code> and <code>RateLimit-*</code> headers. Quotas tie into billing plans.</li>
<li><strong>Request/response transformation</strong>: header injection/removal, path rewrites, body mapping, response filtering, compression, CORS handling.</li>
<li><strong>Aggregation / composition</strong>: one client call fans out to several services and merges the result (reduces mobile round trips) — keep it thin or use a BFF.</li>
<li><strong>Resilience</strong>: timeouts, retries with budgets, circuit breaking, request size limits, load shedding.</li>
<li><strong>Observability & governance</strong>: access logs, metrics per route/consumer, tracing header injection, API versioning, developer portal, monetisation.</li>
</ul>
<p>Risks: the gateway is a <strong>single point of failure and a bottleneck</strong> (run it HA, multi-AZ, autoscaled), it adds a hop of latency (typically 1–5 ms), and it can become a "God gateway" full of business logic owned by a central team — keep business logic in services.</p>`,
      interview: 'List responsibilities, then show judgement: what belongs in the gateway (authN, coarse rate limits, routing) versus in services (business authorization, domain logic). Mention HA, latency cost and the anti-pattern of putting business logic in the gateway.',
      examples: [
        { label: 'Kong declarative config: route + JWT auth + rate limiting', lang: 'yaml', code: `_format_version: "3.0"
services:
  - name: orders
    url: http://orders.orders.svc.cluster.local:8080
    connect_timeout: 2000
    read_timeout: 10000
    retries: 2
    routes:
      - name: orders-v1
        paths: ["/v1/orders"]
        methods: ["GET", "POST"]
        strip_path: false
    plugins:
      - name: jwt                      # validate bearer tokens
      - name: rate-limiting
        config:
          minute: 600
          policy: redis                # global counters across gateway replicas
          redis:
            host: redis.infra.svc
          limit_by: consumer
      - name: correlation-id
        config: { header_name: X-Request-ID, generator: uuid }` }
      ]
    },
    {
      title: 'Backend for Frontend (BFF) & Aggregation',
      def: `<p>A <strong>BFF</strong> is a dedicated API layer per client experience (web, iOS/Android, partner, TV) owned by the team that builds that frontend. Instead of one general-purpose gateway trying to satisfy every client, each BFF shapes data exactly for its UI.</p>
<ul>
<li><strong>Why</strong>: mobile wants fewer round trips and smaller payloads; web wants richer data; partners want stable versioned contracts. A single API becomes either bloated or chatty.</li>
<li><strong>What a BFF does</strong>: aggregates calls to several services (often in parallel), trims and reshapes responses, handles client-specific auth flows (e.g. cookie sessions for web, tokens for mobile), and translates protocols (REST/GraphQL outward, gRPC inward).</li>
<li><strong>Relationship to the gateway</strong>: typical layering is <em>edge gateway</em> (TLS, WAF, authN, rate limits) → <em>BFFs</em> → <em>domain services</em>. GraphQL servers (often federated) are a popular BFF implementation.</li>
</ul>
<p>Design rules for aggregation:</p>
<ul>
<li>Fan out <strong>in parallel</strong> with a total deadline (<code>errgroup</code> + <code>context.WithTimeout</code> in Go); latency ≈ slowest call, so set per-call timeouts.</li>
<li><strong>Degrade gracefully</strong>: return partial results when non-critical calls fail (recommendations missing is fine; price missing is not).</li>
<li>Avoid duplicated business logic across BFFs — push shared logic down into services.</li>
<li>Watch fan-out amplification: one page load = N backend calls; cache aggressively, batch (DataLoader pattern).</li>
</ul>`,
      interview: 'Interviewers ask "gateway or BFF?" The answer is usually both at different layers: a shared edge gateway for cross-cutting concerns and per-client BFFs for composition. Show you know the costs: more services to own, risk of duplicated logic, fan-out latency.',
      examples: [
        { label: 'Parallel aggregation with a deadline in a Go BFF', lang: 'go', code: `func (b *BFF) productPage(ctx context.Context, id string) (*Page, error) {
    ctx, cancel := context.WithTimeout(ctx, 300*time.Millisecond)
    defer cancel()

    var p Page
    g, gctx := errgroup.WithContext(ctx)
    g.Go(func() (err error) { p.Product, err = b.catalog.Get(gctx, id); return }) // critical
    g.Go(func() (err error) { p.Price, err = b.pricing.Get(gctx, id); return })   // critical
    g.Go(func() error {                                                          // optional
        recs, err := b.recs.For(gctx, id)
        if err != nil {
            b.log.Warn("recs degraded", "err", err)
            return nil // degrade gracefully
        }
        p.Recommendations = recs
        return nil
    })
    if err := g.Wait(); err != nil {
        return nil, err
    }
    return &p, nil
}` }
      ]
    },
    {
      title: 'Gateway vs Load Balancer vs Reverse Proxy vs Service Mesh (and Gateway API)',
      def: `<table>
<thead><tr><th></th><th>Reverse proxy</th><th>Load balancer</th><th>API gateway</th><th>Service mesh</th></tr></thead>
<tbody>
<tr><td>Primary job</td><td>Front servers: TLS, caching, routing</td><td>Distribute traffic, health checks</td><td>Manage APIs as products: auth, quotas, transformation</td><td>Secure and observe service-to-service traffic</td></tr>
<tr><td>Traffic</td><td>North-south</td><td>North-south (and internal)</td><td>North-south</td><td>East-west (plus ingress/egress gateways)</td></tr>
<tr><td>Layer</td><td>L7 (sometimes L4)</td><td>L4 or L7</td><td>L7</td><td>L4 + L7</td></tr>
<tr><td>Consumer awareness</td><td>No</td><td>No</td><td>Yes: API keys, plans, developer portal</td><td>Workload identity (SPIFFE), not end users</td></tr>
<tr><td>Examples</td><td>Nginx, HAProxy</td><td>ALB, NLB, Maglev</td><td>Kong, Envoy Gateway, AWS API Gateway, Apigee</td><td>Istio, Linkerd, Cilium</td></tr>
</tbody>
</table>
<p>The lines blur: Envoy can be all four. The useful question is <em>who owns the policy and for which traffic</em>.</p>
<p><strong>Kubernetes Gateway API</strong> (GA since v1.0, Oct 2023) is the successor to Ingress. It is <strong>role-oriented</strong>: infrastructure providers define a <code>GatewayClass</code>, platform teams own <code>Gateway</code> resources (listeners, TLS, which namespaces may attach), and application teams own <code>HTTPRoute</code>/<code>GRPCRoute</code>/<code>TLSRoute</code> objects in their namespaces. It natively supports header matching, weighted traffic splitting, request mirroring, redirects/rewrites and cross-namespace references via <code>ReferenceGrant</code> — features that required vendor-specific annotations with Ingress. Implementations include Envoy Gateway, Istio, Cilium, NGINX Gateway Fabric, Kong, Traefik, GKE and AWS (VPC Lattice / LB Controller). The <strong>GAMMA</strong> initiative uses the same Route resources for mesh (east-west) traffic by attaching a Route to a <code>Service</code> instead of a <code>Gateway</code>.</p>
<p>Maturity to quote accurately: <code>Gateway</code>, <code>GatewayClass</code>, <code>HTTPRoute</code> and <code>ReferenceGrant</code> are GA since v1.0; <code>GRPCRoute</code> and mesh (GAMMA) support became Standard in v1.1 (2024); <code>BackendTLSPolicy</code> (TLS from the gateway to backends) reached Standard in v1.4 (2025). <code>TCPRoute</code>/<code>UDPRoute</code> are still in the Experimental channel, so check which channel's CRDs your cluster installs. The Gateway API CRDs are installed separately from Kubernetes itself (often by the implementation), so two controllers fighting over CRD versions is a real upgrade hazard. With the community <strong>ingress-nginx</strong> controller retired in 2026, migrating Ingress objects (and their vendor annotations) to Gateway API — e.g. with the <code>ingress2gateway</code> tool — is a common platform-team task.</p>`,
      interview: 'The comparison table question is very common. Answer with responsibilities and traffic direction, then admit the overlap (Envoy everywhere) and steer to ownership. Knowing Gateway API roles (GatewayClass, Gateway, HTTPRoute) shows current Kubernetes knowledge.',
      examples: [
        { label: 'Gateway API: shared Gateway + team-owned HTTPRoute with a 90/10 canary', lang: 'yaml', code: `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public
  namespace: infra
spec:
  gatewayClassName: eg                # Envoy Gateway
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    hostname: api.example.com
    tls:
      mode: Terminate
      certificateRefs:
      - name: api-example-com-tls
    allowedRoutes:
      namespaces:
        from: All
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: orders
  namespace: orders
spec:
  parentRefs:
  - name: public
    namespace: infra
  hostnames: ["api.example.com"]
  rules:
  - matches:
    - path: { type: PathPrefix, value: /v1/orders }
      headers:
      - name: x-canary
        value: "true"
    backendRefs:
    - { name: orders-v2, port: 8080 }
  - matches:
    - path: { type: PathPrefix, value: /v1/orders }
    backendRefs:
    - { name: orders-v1, port: 8080, weight: 90 }
    - { name: orders-v2, port: 8080, weight: 10 }` }
      ]
    },
    {
      title: 'Gateway Products: Kong, Envoy Gateway, AWS API Gateway',
      def: `<ul>
<li><strong>Kong</strong>: built on Nginx/OpenResty; large plugin ecosystem (auth, rate limiting, transformations), declarative config (decK) or Kubernetes CRDs via Kong Ingress Controller (supports Gateway API). Open-source core plus enterprise features (portal, analytics).</li>
<li><strong>Envoy Gateway</strong>: CNCF project that runs Envoy as a Kubernetes Gateway API implementation, with extension CRDs (<code>SecurityPolicy</code> for JWT/OIDC/ext-auth, <code>BackendTrafficPolicy</code> for rate limits, retries, circuit breaking; <code>ClientTrafficPolicy</code>). Good fit if you want a standards-based, Envoy-native edge without a full mesh. Other Envoy-based gateways: Contour, Gloo, Emissary.</li>
<li><strong>AWS API Gateway</strong>: fully managed. <em>REST APIs</em> (feature-rich: API keys, usage plans, request validation, caching, WAF, private APIs) vs <em>HTTP APIs</em> (cheaper, lower latency, JWT authorizers, fewer features) vs <em>WebSocket APIs</em>. Integrations with Lambda, HTTP backends and VPC Link (private NLB/ALB). Limits to know: 10 MB payloads, a default 29 s integration timeout (raisable for regional REST APIs), account-level throttling (10,000 rps default per region).</li>
<li>Others: Apigee (full API management/monetisation), Azure API Management, Tyk, Traefik, NGINX Gateway Fabric.</li>
</ul>
<p>Selection criteria: managed vs self-hosted operations, latency and cost at your RPS (managed per-request pricing gets expensive at scale), protocol support (gRPC, WebSockets, HTTP/3), extensibility (plugins/Wasm/ext_authz), Kubernetes-native config (Gateway API), multi-cloud portability, and developer-portal/monetisation needs.</p>`,
      interview: 'You will rarely be quizzed on product trivia, but you should justify a choice: AWS API Gateway for serverless/low ops, Envoy Gateway or Kong on Kubernetes for control, portability and cost at high RPS. Mention concrete limits (29 s timeout, payload size, throttling) as reasons a design might not fit a managed gateway.',
      examples: [
        { label: 'Envoy Gateway: JWT auth + global rate limit for a route', lang: 'yaml', code: `apiVersion: gateway.envoyproxy.io/v1alpha1
kind: SecurityPolicy
metadata:
  name: orders-jwt
  namespace: orders
spec:
  targetRefs:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: orders
  jwt:
    providers:
    - name: auth0
      issuer: https://example.us.auth0.com/
      audiences: ["orders-api"]
      remoteJWKS:
        uri: https://example.us.auth0.com/.well-known/jwks.json
---
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: orders-ratelimit
  namespace: orders
spec:
  targetRefs:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: orders
  rateLimit:
    type: Global
    global:
      rules:
      - clientSelectors:
        - headers:
          - name: x-api-key
            type: Distinct      # separate bucket per API key
        limit:
          requests: 100
          unit: Minute` }
      ]
    },
    {
      title: 'Service Mesh: Data Plane & Control Plane',
      def: `<p>A <strong>service mesh</strong> moves networking concerns for service-to-service (east-west) traffic out of application code into infrastructure:</p>
<ul>
<li><strong>Data plane</strong>: proxies on the request path — Envoy sidecars (Istio), the Rust <code>linkerd2-proxy</code> (Linkerd), per-node ztunnel + waypoints (Istio ambient), or eBPF + per-node Envoy (Cilium). They do mTLS, load balancing, retries, timeouts, circuit breaking, traffic splitting and telemetry.</li>
<li><strong>Control plane</strong>: <code>istiod</code>, Linkerd control plane. Watches the Kubernetes API, computes config and pushes it to proxies (Envoy via <strong>xDS</strong>: LDS listeners, RDS routes, CDS clusters, EDS endpoints, SDS secrets). Acts as a <strong>certificate authority</strong>, issuing short-lived workload certificates with <strong>SPIFFE</strong> identities (<code>spiffe://cluster.local/ns/orders/sa/orders</code>).</li>
</ul>
<p>What you get:</p>
<ul>
<li><strong>Zero-trust security</strong>: automatic mTLS between workloads, identity-based authorization (<code>AuthorizationPolicy</code>: "only <code>frontend</code> SA may call <code>orders</code> POST").</li>
<li><strong>Traffic management</strong>: canaries, mirroring, fault injection, locality-aware routing, outlier detection.</li>
<li><strong>Observability</strong>: uniform golden metrics (RPS, errors, latency) and tracing spans for every hop without code changes (apps must still propagate trace headers).</li>
</ul>
<p>Costs: extra latency per hop (sidecar typically ~1–3 ms p99 at moderate load), CPU/memory per proxy, operational complexity (upgrades, config debugging), and failure modes of its own (control plane outage = stale config, cert expiry). Adopt a mesh when you have many services, polyglot stacks, and real mTLS/zero-trust or traffic-control requirements — not for five services.</p>`,
      interview: 'Explain data plane vs control plane with xDS and certificate issuance, then be honest about costs. A senior answer includes "when not to use a mesh" and alternatives (gRPC proxyless with xDS, library-based resilience, Cilium for L3/L4 policy plus mTLS).',
      examples: [
        { label: 'Istio: enforce mTLS and identity-based authorization', lang: 'yaml', code: `apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: orders
spec:
  mtls:
    mode: STRICT                  # reject plaintext to workloads in this namespace
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: orders-allow-frontend
  namespace: orders
spec:
  selector:
    matchLabels: { app: orders }
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/web/sa/frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/v1/orders*"]` }
      ]
    },
    {
      title: 'Sidecar vs Ambient & East-West vs North-South',
      def: `<p><strong>North-south</strong> traffic enters or leaves the cluster/data centre (clients → APIs, services → third-party APIs). It is handled by edge LBs, API gateways, WAFs and egress gateways. <strong>East-west</strong> traffic flows between services inside (orders → payments). It dominates by volume in microservices (one user request can fan out to dozens of internal calls) and is the mesh's domain.</p>
<p><strong>Sidecar model</strong>: an Envoy proxy container injected into every pod; iptables (or the Istio CNI plugin) redirects all inbound/outbound traffic through it.</p>
<ul>
<li>Pros: full L7 features per workload, strong isolation, mature.</li>
<li>Cons: resource overhead × every pod, injection requires pod restarts for upgrades, startup/shutdown ordering issues (app starts before the proxy is ready; Jobs never finish because the sidecar keeps running) — largely addressed by Kubernetes <strong>native sidecars</strong> (restartable init containers with <code>restartPolicy: Always</code>, on by default since 1.29 and GA in 1.33).</li>
</ul>
<p><strong>Ambient mode</strong> (Istio, GA since 1.24 in late 2024): no per-pod proxies.</p>
<ul>
<li><strong>ztunnel</strong>: a per-node, Rust L4 proxy providing mTLS (HBONE tunnelling over HTTP/2 CONNECT), L4 authorization and telemetry for all pods on the node.</li>
<li><strong>Waypoint proxies</strong>: optional Envoy deployments per namespace or service account, added only where L7 features (HTTP routing, retries, L7 authz) are needed.</li>
<li>Pros: much lower resource cost, no restarts to join/upgrade the mesh, incremental adoption. Cons: newer, L7 adds an extra network hop through the waypoint, shared per-node component (ztunnel) is a larger blast radius.</li>
</ul>
<p>Other approaches: <strong>Linkerd</strong> keeps sidecars but uses a lightweight Rust micro-proxy; <strong>Cilium</strong> uses eBPF for L3/L4 and a per-node Envoy for L7; <strong>proxyless gRPC</strong> consumes xDS directly from the control plane.</p>`,
      interview: 'Be ready to compare sidecar vs ambient on resource cost, upgrade story, latency, isolation and maturity — and to explain the sidecar lifecycle problems (startup race, Jobs never completing) and how native sidecars fix them. Correctly using the terms north-south and east-west is expected.',
      examples: [
        { label: 'Istio ambient: enroll a namespace and add a waypoint for L7', lang: 'bash', code: `# L4 mTLS for every pod in the namespace via ztunnel - no restarts needed
$ kubectl label namespace orders istio.io/dataplane-mode=ambient

# Add an L7 waypoint (Envoy) for HTTP policies in this namespace
$ istioctl waypoint apply -n orders --enroll-namespace
waypoint orders/waypoint applied
namespace orders labeled with "istio.io/use-waypoint: waypoint"

$ istioctl ztunnel-config workloads | grep orders
NAMESPACE  POD NAME                 ADDRESS      NODE     WAYPOINT  PROTOCOL
orders     orders-6d9f7c9b8-2kq7x   10.244.1.17  node-a   waypoint  HBONE` }
      ]
    }
  ],
  problems: [
    {
      t: 'Compare API gateway, load balancer, reverse proxy and service mesh',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>For each: primary responsibility, traffic direction, layer, who owns it, examples.</li><li>Where do they overlap? Why might one system use all four?</li></ul>`,
      solution: `Reverse proxy: fronts servers (TLS, caching, compression, routing). Nginx, HAProxy.
Load balancer: distributes traffic + health checks, L4 or L7. NLB/ALB, Maglev.
API gateway: API management for external consumers - authN, rate limits/quotas per consumer,
  transformation, aggregation, versioning, portal. Kong, Envoy Gateway, AWS API Gateway.
Service mesh: east-west security (mTLS, identity authz), resilience and telemetry between
  services without code changes. Istio, Linkerd, Cilium.
Typical stack: anycast/DNS -> L4 LB -> API gateway (Envoy) -> services in a mesh. Envoy can
implement every role; the distinction is ownership and traffic direction.`
    },
    {
      t: 'Configure a weighted canary with the Kubernetes Gateway API',
      d: 'medium',
      type: 'hands-on',
      hint: `<ul><li>Install an implementation (e.g. Envoy Gateway) and create a <code>Gateway</code> in an infra namespace.</li><li>Create an <code>HTTPRoute</code> with two <code>backendRefs</code> and weights; add a header-match rule that always routes testers to v2.</li><li>Verify the split with a loop of curl requests.</li></ul>`,
      solution: `helm install eg oci://docker.io/envoyproxy/gateway-helm -n envoy-gateway-system --create-namespace
kubectl apply -f gatewayclass-and-gateway.yaml     # GatewayClass "eg" + Gateway "public"
kubectl apply -f orders-httproute.yaml             # rules: x-canary:true -> v2; else v1:90 / v2:10

kubectl get gateway -n infra public -o jsonpath='{.status.addresses[0].value}'
GW=<address>
for i in $(seq 200); do curl -s -H 'Host: api.example.com' http://$GW/v1/orders/version; echo; done \\
  | sort | uniq -c          # ~180 v1, ~20 v2
curl -s -H 'Host: api.example.com' -H 'x-canary: true' http://$GW/v1/orders/version   # always v2
kubectl get httproute orders -n orders -o yaml | grep -A5 conditions   # Accepted / ResolvedRefs`
    },
    {
      t: 'Implement a per-client token bucket rate limiter middleware in Go',
      d: 'medium',
      type: 'coding',
      hint: `<ul><li>Bucket per key (API key header, else client IP): capacity = burst, refill = rate tokens/s, computed lazily on each request.</li><li>Guard with a mutex; evict idle buckets to bound memory.</li><li>On reject: 429 with <code>Retry-After</code>.</li><li>Discuss making it global (Redis + Lua) for multiple gateway replicas.</li></ul>`,
      solution: `package main

import (
    "math"
    "net"
    "net/http"
    "strconv"
    "sync"
    "time"
)

type bucket struct {
    tokens float64
    last   time.Time
}

type Limiter struct {
    mu      sync.Mutex
    rate    float64 // tokens per second
    burst   float64
    buckets map[string]*bucket
}

func NewLimiter(rate, burst float64) *Limiter {
    l := &Limiter{rate: rate, burst: burst, buckets: map[string]*bucket{}}
    go l.evictLoop(time.Minute)
    return l
}

func (l *Limiter) Allow(key string) (bool, time.Duration) {
    l.mu.Lock()
    defer l.mu.Unlock()
    now := time.Now()
    b, ok := l.buckets[key]
    if !ok {
        b = &bucket{tokens: l.burst, last: now}
        l.buckets[key] = b
    }
    b.tokens = math.Min(l.burst, b.tokens+now.Sub(b.last).Seconds()*l.rate)
    b.last = now
    if b.tokens >= 1 {
        b.tokens--
        return true, 0
    }
    wait := time.Duration((1 - b.tokens) / l.rate * float64(time.Second))
    return false, wait
}

func (l *Limiter) evictLoop(idle time.Duration) {
    for range time.Tick(idle) {
        l.mu.Lock()
        for k, b := range l.buckets {
            if time.Since(b.last) > idle {
                delete(l.buckets, k)
            }
        }
        l.mu.Unlock()
    }
}

func (l *Limiter) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        key := r.Header.Get("X-API-Key")
        if key == "" {
            key, _, _ = net.SplitHostPort(r.RemoteAddr) // behind a proxy: use trusted XFF
        }
        ok, wait := l.Allow(key)
        if !ok {
            w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(wait.Seconds()))))
            http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func main() {
    lim := NewLimiter(10, 20) // 10 req/s, bursts of 20 per key
    mux := http.NewServeMux()
    mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok\\n")) })
    http.ListenAndServe(":8080", lim.Middleware(mux))
}
// Multi-replica gateways: keep the same algorithm in Redis (atomic Lua script or
// INCR + EXPIRE fixed/sliding windows) or use Envoy's global rate limit service.`,
      lang: 'go'
    },
    {
      t: 'Design a BFF layer for web and mobile clients',
      d: 'medium',
      type: 'design',
      hint: `<ul><li>Home screen needs data from profile, feed, notifications and recommendations services.</li><li>Mobile on 3G vs desktop web: payload size and round trips.</li><li>Where do authN, rate limiting and caching live? What happens when recommendations is down?</li></ul>`,
      solution: `Layers: CDN/WAF -> edge API gateway (TLS, JWT validation, coarse rate limits, routing)
  -> web-bff and mobile-bff (owned by the respective frontend teams) -> domain services (gRPC).

mobile-bff GET /home:
- Parallel fan-out with a 300ms total deadline: profile, feed(page 1, 10 items, thumbnails),
  notifications count, recommendations.
- Critical: profile, feed. Optional: notifications, recs -> omitted on failure/timeout.
- Response trimmed to exactly what the screen renders (~5-10KB), gzip/brotli.
- Per-user cache 30s for recs; ETag for conditional refresh.
web-bff: richer payload, server-side rendering data, cookie-based session (BFF holds tokens;
  browser only gets an HttpOnly SameSite cookie - the "token handler" pattern).
Guardrails: shared business rules live in services, not BFFs; contract tests between BFF and
services; per-BFF SLOs and dashboards.`
    },
    {
      t: 'Debug: Kubernetes Jobs never complete and pods fail at startup after mesh injection',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>The app starts before the sidecar proxy is ready → outbound connections fail.</li><li>The Job's main container exits, but the sidecar keeps the pod Running.</li><li>Look at Kubernetes native sidecars and Istio's <code>holdApplicationUntilProxyStarts</code>; or move to ambient mode.</li></ul>`,
      solution: `Symptoms
- App logs at startup: "connection refused" to config server/DB for the first ~1-2s.
- Job pods stay Running/NotReady after the main container exits (sidecar still alive).

Fixes
1. Kubernetes native sidecars (restartable init containers, default on since 1.29): the proxy
   starts before app containers and is terminated after them; Jobs complete normally.
   Istio injects native sidecars when ENABLE_NATIVE_SIDECARS=true (default on in recent
   releases with supported Kubernetes versions).
2. Older setups: annotate proxy.istio.io/config: '{ "holdApplicationUntilProxyStarts": true }'
   and have Jobs call the pilot-agent quit endpoint (curl -X POST localhost:15020/quitquitquit)
   when done.
3. Ambient mode: no sidecar in the pod at all - ztunnel on the node handles mTLS.
4. Make apps resilient anyway: retry dependency connections with backoff at startup.`
    },
    {
      t: 'Debug: 503s with "upstream connect error ... connection termination" after enabling STRICT mTLS',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>Which clients are <em>not</em> in the mesh (no sidecar / not enrolled in ambient)? Plaintext to a STRICT workload is rejected.</li><li>Read Envoy access log response flags: <code>UF</code> (upstream connection failure), <code>UH</code> (no healthy upstream), <code>URX</code>, <code>NR</code> (no route).</li><li>Use <code>istioctl proxy-config</code> / <code>istioctl analyze</code>, and check DestinationRule TLS settings and port naming/appProtocol.</li></ul>`,
      solution: `1. Identify failing paths: Envoy access logs on the client side show
   "503 UF upstream_reset_before_response_started{connection_termination}".
2. Check whether the caller has a proxy:
   kubectl get pod -n legacy -o jsonpath='{..containers[*].name}'   # no istio-proxy?
   A non-mesh client sends plaintext; the STRICT server-side proxy closes the connection.
3. Check conflicting config:
   istioctl analyze -n orders
   kubectl get destinationrule -A -o yaml | grep -B3 -A3 'mode: DISABLE'  # DR disabling TLS
   istioctl proxy-config cluster <client-pod> --fqdn orders.orders.svc.cluster.local -o json | grep -i tls
4. Protocol detection: port named "tcp" or missing appProtocol for an HTTP service can lead
   to wrong filter chains; set appProtocol: http / grpc on Service ports.
Fix / rollout plan
- Migrate namespace by namespace: PERMISSIVE first (accepts mTLS + plaintext), verify via
  telemetry that all traffic is mTLS (connection_security_policy="mutual_tls"), then STRICT.
- Enroll legacy clients in the mesh (sidecar or ambient) or route them through an ingress
  gateway; remove DestinationRules that disable TLS.`
    },
    {
      t: 'Decide whether to adopt a service mesh, and sidecar or ambient',
      d: 'hard',
      type: 'design',
      hint: `<ul><li>Context: 150 microservices (Go, Java, Python), compliance requires encryption in transit and service-level authz, SRE team of 6.</li><li>Compare: no mesh (libraries + NetworkPolicy), Linkerd, Istio sidecar, Istio ambient, Cilium.</li><li>Evaluate resources, latency, upgrade operations, L7 needs, team skills, failure modes.</li></ul>`,
      solution: `Requirements drive the choice: mTLS everywhere + identity authz across 3 languages => a
mesh is justified (libraries in 3 languages would drift; NetworkPolicy is IP-based, not identity).

Options
- Istio ambient: ztunnel gives mTLS + L4 identity authz for all 150 services with no pod
  restarts and low overhead; add waypoints only for services needing L7 policies, retries or
  canaries. Best fit for broad compliance with a small team.
- Istio sidecar: maximal L7 features per pod, mature; ~0.5 vCPU / 50-100MB per sidecar at
  load across ~600 pods is significant, upgrades need rolling restarts.
- Linkerd: simplest operations, light Rust proxy, automatic mTLS; fewer advanced traffic APIs.
- Cilium: if already the CNI - eBPF L3/L4 policy and mutual auth with lower overhead; L7 via
  per-node Envoy.

Recommendation: Istio ambient (or Linkerd if simplicity outweighs features); roll out per
namespace: PERMISSIVE -> verify -> STRICT; default-deny AuthorizationPolicies; dashboards on
golden metrics; runbooks for control plane outage (data plane keeps last config) and CA
rotation; load-test p99 latency before and after.`
    },
    {
      t: 'Build a minimal API gateway in Go',
      d: 'hard',
      type: 'coding',
      hint: `<ul><li>Path-prefix routing to upstreams with <code>httputil.ReverseProxy</code> using the <code>Rewrite</code> hook (<code>SetURL</code>, <code>SetXForwarded</code>).</li><li>Middleware chain: request ID → authentication → routing; per-route timeouts.</li><li>Custom <code>ErrorHandler</code> returning 502/504; tuned shared <code>Transport</code>.</li><li>Server timeouts and graceful shutdown.</li></ul>`,
      solution: `package main

import (
    "context"
    "crypto/rand"
    "encoding/hex"
    "errors"
    "log/slog"
    "net"
    "net/http"
    "net/http/httputil"
    "net/url"
    "os/signal"
    "strings"
    "syscall"
    "time"
)

var transport = &http.Transport{
    DialContext:         (&net.Dialer{Timeout: 2 * time.Second}).DialContext,
    MaxIdleConns:        512,
    MaxIdleConnsPerHost: 128,
    IdleConnTimeout:     60 * time.Second,
}

func newProxy(target string) http.Handler {
    u, err := url.Parse(target)
    if err != nil {
        panic(err)
    }
    return &httputil.ReverseProxy{
        Rewrite: func(pr *httputil.ProxyRequest) {
            pr.SetURL(u)        // scheme/host of upstream, path joined
            pr.SetXForwarded()  // X-Forwarded-For/Host/Proto
            pr.Out.Header.Set("X-Request-ID", pr.In.Header.Get("X-Request-ID"))
        },
        Transport: transport,
        ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
            status := http.StatusBadGateway
            if errors.Is(err, context.DeadlineExceeded) {
                status = http.StatusGatewayTimeout
            }
            slog.Warn("upstream error", "path", r.URL.Path, "err", err)
            http.Error(w, http.StatusText(status), status)
        },
    }
}

func withTimeout(d time.Duration, h http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx, cancel := context.WithTimeout(r.Context(), d)
        defer cancel()
        h.ServeHTTP(w, r.WithContext(ctx))
    })
}

func requestID(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Request-ID")
        if id == "" {
            b := make([]byte, 8)
            rand.Read(b)
            id = hex.EncodeToString(b)
            r.Header.Set("X-Request-ID", id)
        }
        w.Header().Set("X-Request-ID", id)
        next.ServeHTTP(w, r)
    })
}

var apiKeys = map[string]string{"k_live_123": "tenant-a"} // real gateways: JWT via JWKS

func auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        tok := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
        tenant, ok := apiKeys[tok]
        if !ok {
            w.Header().Set("WWW-Authenticate", "Bearer")
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        r.Header.Del("X-Tenant") // never trust client-supplied identity headers
        r.Header.Set("X-Tenant", tenant)
        next.ServeHTTP(w, r)
    })
}

func main() {
    mux := http.NewServeMux()
    mux.Handle("/v1/users/", withTimeout(2*time.Second, newProxy("http://users.internal:8080")))
    mux.Handle("/v1/orders/", withTimeout(5*time.Second, newProxy("http://orders.internal:8080")))
    mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })

    srv := &http.Server{
        Addr:              ":8443",
        Handler:           requestID(auth(mux)), // add rate limiting, logging, metrics here
        ReadHeaderTimeout: 5 * time.Second,
        IdleTimeout:       90 * time.Second,
    }
    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()
    go func() {
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            slog.Error("listen", "err", err)
        }
    }()
    <-ctx.Done()
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
    defer cancel()
    srv.Shutdown(shutdownCtx)
}`,
      lang: 'go'
    }
  ],
  interviewFocus: [
    {
      q: 'What is the difference between an API gateway and a service mesh? Do you need both?',
      a: `<p>An <strong>API gateway</strong> manages <em>north-south</em> traffic from external consumers: authentication of users/clients, API keys, quotas and rate limits per consumer, request transformation, aggregation, versioning, developer portal. It is consumer-aware and product-oriented.</p>
<p>A <strong>service mesh</strong> manages <em>east-west</em> traffic between services: workload identity and mTLS, service-to-service authorization, retries/timeouts/circuit breaking, traffic shifting, and uniform telemetry — transparent to application code.</p>
<p>They complement each other: the gateway is the front door, the mesh is the internal road network. Many meshes ship an ingress gateway (Istio Gateway, often managed via the Gateway API), and some organisations use it as the API gateway when they only need routing + JWT validation. You need a dedicated API gateway product when you have external API consumers with plans, keys, quotas, monetisation and a portal. You need a mesh when the number of services, languages and security requirements make per-service libraries untenable.</p>`
    },
    {
      q: 'How would you implement rate limiting across a fleet of 20 gateway replicas?',
      a: `<ul>
<li><strong>Algorithm</strong>: token bucket (allows bursts, smooth refill) or sliding-window counter (accurate per-window limits). Fixed windows allow 2× bursts at boundaries.</li>
<li><strong>Local only</strong>: each replica enforces limit/20 — simple and fast but inaccurate with uneven LB distribution or autoscaling.</li>
<li><strong>Global</strong>: central store (Redis cluster) with atomic Lua scripts (token bucket) or <code>INCR</code>+<code>EXPIRE</code>; or Envoy's global rate limit service (gRPC) backed by Redis. Adds ~1 ms per request and a dependency.</li>
<li><strong>Hybrid</strong> (best at scale): local token buckets for coarse protection plus asynchronous synchronisation of counts, or global checks only for expensive tiers. Decide <strong>fail-open vs fail-closed</strong> when Redis is down (usually fail-open with local limits as a backstop).</li>
<li><strong>Keys</strong>: API key / tenant / user ID, not just IP (NAT shares IPs; attackers rotate IPs). Multiple dimensions: per-route, per-tenant, global.</li>
<li><strong>Response</strong>: <code>429</code> with <code>Retry-After</code> and <code>RateLimit-Limit/Remaining/Reset</code> headers so well-behaved clients back off.</li>
<li>Layering: edge/CDN volumetric limits (DDoS), gateway per-consumer quotas, service-level concurrency limits / load shedding (adaptive, e.g. based on latency).</li>
</ul>`
    },
    {
      q: 'Explain how a service mesh implements mTLS without application changes.',
      a: `<ol>
<li>The control plane (istiod) runs a CA (or plugs into an external one like cert-manager/Vault). Each workload's proxy (sidecar or ztunnel) obtains a <strong>short-lived certificate</strong> (24 h default in Istio, rotated automatically) whose SAN is a <strong>SPIFFE ID</strong> derived from its Kubernetes service account. Delivery uses the SDS API — keys never touch disk.</li>
<li>Traffic is transparently redirected to the local proxy (iptables/eBPF or the CNI plugin). The app sends plaintext HTTP to <code>orders:8080</code>.</li>
<li>The client-side proxy opens a TLS connection to the server-side proxy, presenting its certificate; both verify each other against the mesh trust root (mutual TLS). In ambient, ztunnels tunnel the traffic via HBONE (mTLS + HTTP/2 CONNECT).</li>
<li>The server-side proxy now knows the caller's verified identity and enforces <code>AuthorizationPolicy</code>, then forwards plaintext to the app over localhost.</li>
</ol>
<p>Caveats: the app must still propagate trace headers; traffic from non-mesh workloads fails under STRICT mode; egress to external services needs explicit configuration; and the CA/trust root rotation must be planned.</p>`
    },
    {
      q: 'Sidecar vs ambient mesh: what are the trade-offs?',
      a: `<table>
<thead><tr><th></th><th>Sidecar</th><th>Ambient (ztunnel + waypoint)</th></tr></thead>
<tbody>
<tr><td>Resource cost</td><td>One proxy per pod — highest</td><td>One ztunnel per node + waypoints only where L7 needed</td></tr>
<tr><td>Onboarding/upgrades</td><td>Pod restart to inject/upgrade</td><td>Namespace label; upgrade node agents without app restarts</td></tr>
<tr><td>L7 features</td><td>Everywhere by default</td><td>Opt-in via waypoint (an extra hop)</td></tr>
<tr><td>Isolation / blast radius</td><td>Per pod</td><td>ztunnel shared by all pods on a node</td></tr>
<tr><td>Lifecycle issues</td><td>Startup/shutdown ordering (mitigated by native sidecars)</td><td>None in the pod</td></tr>
<tr><td>Maturity</td><td>Very mature</td><td>GA since Istio 1.24; fewer production years</td></tr>
</tbody>
</table>
<p>Rule of thumb: ambient for broad mTLS/L4 policy at low cost; add waypoints or keep sidecars for workloads needing rich per-pod L7 policy.</p>`
    }
  ],
  quiz: [
    { q: 'What is north-south vs east-west traffic?', a: 'North-south enters or leaves the cluster/data centre (clients to services, services to external APIs); east-west flows between services inside it.' },
    { q: 'Name four core responsibilities of an API gateway.', a: 'Routing, authentication, rate limiting/quotas, request/response transformation (also aggregation, observability, versioning).' },
    { q: 'What is the BFF pattern?', a: 'Backend for Frontend: a dedicated API layer per client type (web, mobile) that aggregates and shapes backend data for that client, owned by the frontend team.' },
    { q: 'What are the three main role-oriented resources in the Kubernetes Gateway API?', a: 'GatewayClass (infrastructure provider), Gateway (platform/cluster operator) and Routes such as HTTPRoute/GRPCRoute (application developers).' },
    { q: 'What do the data plane and control plane do in a service mesh?', a: 'The data plane (proxies) handles actual traffic: mTLS, routing, retries, telemetry. The control plane configures proxies (xDS) and issues workload certificates.' },
    { q: 'In Istio ambient mode, what are ztunnel and waypoint proxies?', a: 'ztunnel is a per-node L4 proxy providing mTLS and L4 policy; waypoints are optional Envoy proxies providing L7 features for a namespace or service account.' },
    { q: 'What identity format do meshes like Istio use in workload certificates?', a: 'SPIFFE IDs, e.g. spiffe://cluster.local/ns/orders/sa/orders, derived from the Kubernetes service account.' }
  ],
  resources: [
    { title: 'Envoy Docs — What is Envoy', url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/what_is_envoy', type: 'docs' },
    { title: 'Envoy Docs — xDS configuration API overview', url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/dynamic_configuration', type: 'docs' },
    { title: 'Cloudflare Learning — What is an API gateway?', url: 'https://www.cloudflare.com/learning/security/api/what-is-an-api-gateway/', type: 'article' },
    { title: 'Cloudflare Learning — What is rate limiting?', url: 'https://www.cloudflare.com/learning/bots/what-is-rate-limiting/', type: 'article' }
  ]
},
// ───────────────────────────── Module 8 ─────────────────────────────
{
  n: 8,
  title: 'CDN & Edge Networking',
  summary: 'How CDNs move content and computation close to users: PoPs, anycast routing and cache hierarchies, cache keys and invalidation, origin shielding and request collapsing, static vs dynamic acceleration, edge compute, TLS at the edge and DDoS absorption. CDNs show up in almost every large-scale system design answer.',
  topics: [
    {
      title: 'How CDNs Work: PoPs, Anycast & Cache Hierarchy',
      def: `<p>A <strong>CDN</strong> is a globally distributed network of reverse proxies (<strong>PoPs</strong>, points of presence) that cache and serve content near users. Major CDNs run hundreds of PoPs, often inside ISP networks and at Internet exchange points.</p>
<p><strong>Request routing</strong> to the nearest PoP:</p>
<ul>
<li><strong>Anycast</strong> (Cloudflare, Fastly): the same IPs are announced from every PoP; BGP delivers users to the closest one. Simple, fast failover, great for DDoS.</li>
<li><strong>DNS-based</strong> (Akamai, CloudFront): the CDN's authoritative DNS returns the IP of a PoP chosen by resolver location, PoP load and health (often with EDNS Client Subnet).</li>
</ul>
<p><strong>Request flow</strong>: user → nearest edge PoP (TCP + TLS terminated a few ms away). <em>Cache hit</em> → served immediately. <em>Miss</em> → the edge asks an upper tier (regional cache / <strong>origin shield</strong>), which asks the <strong>origin</strong> only if it also misses. Responses are stored at each tier according to cache rules and TTLs.</p>
<ul>
<li><strong>Cache hierarchy / tiered caching</strong>: edge → regional tier → shield → origin. Raises hit ratio (popular objects are cached in the upper tier even if each edge sees few requests) and reduces origin load.</li>
<li><strong>Key metrics</strong>: cache hit ratio (requests) and <em>byte</em> hit ratio, origin offload, TTFB at the edge, origin error rate.</li>
<li><strong>Eviction</strong>: popular content stays hot; long-tail objects are evicted (LRU-like), so a long TTL does not guarantee the object stays cached.</li>
</ul>
<p>Even when content is not cacheable, a CDN helps: TLS handshakes complete close to the user, the edge keeps warm, multiplexed connections to the origin over an optimised backbone, and it absorbs attacks.</p>`,
      interview: 'Describe the request flow for a hit and a miss, the role of tiers and shields, and anycast vs DNS-based routing. Then quantify the benefit: a TLS handshake against a PoP 10 ms away instead of an origin 150 ms away saves hundreds of milliseconds per new connection.',
      examples: [
        { label: 'Read CDN cache status headers', lang: 'text', code: `$ curl -sI https://www.cloudflare.com/img/logo.svg | grep -iE 'cf-cache-status|age|cache-control|cf-ray'
cache-control: public, max-age=14400
cf-cache-status: HIT
age: 3127
cf-ray: 8f1a2b3c4d5e6f70-BOM        # served from the Mumbai PoP

# CloudFront equivalents
x-cache: Hit from cloudfront
x-amz-cf-pop: BOM78-P1
age: 412` }
      ]
    },
    {
      title: 'Cache Keys, TTLs, Invalidation & Purge',
      def: `<p>The <strong>cache key</strong> decides which requests share a cached object. Default: scheme + host + path + query string. Everything that is <em>not</em> in the key must not change the response; everything that changes the response <em>must</em> be in the key (or in <code>Vary</code>).</p>
<ul>
<li><strong>Normalise</strong> to raise hit ratio: sort query parameters, drop tracking params (<code>utm_*</code>, <code>fbclid</code>, <code>gclid</code>), lowercase hosts, ignore irrelevant cookies and headers.</li>
<li><strong>Add dimensions deliberately</strong>: device class (not raw <code>User-Agent</code>), country, language, currency — each multiplies the number of variants.</li>
<li>Responses with <code>Set-Cookie</code>, <code>Cache-Control: private/no-store</code> or requests with <code>Authorization</code> are usually not cached by default.</li>
</ul>
<p><strong>TTL controls</strong>: <code>Cache-Control: s-maxage</code> for shared caches, <code>CDN-Cache-Control</code> (RFC 9213) or <code>Surrogate-Control</code> to set CDN-only TTLs without affecting browsers, plus CDN-side overrides. Use <code>stale-while-revalidate</code> and <code>stale-if-error</code> for latency and resilience.</p>
<p><strong>Invalidation strategies</strong> ("There are only two hard things in computer science: cache invalidation and naming things"):</p>
<ul>
<li><strong>Versioned / fingerprinted URLs</strong> (<code>app.3f9a1c.js</code>): never purge; deploy new URLs; cache for a year with <code>immutable</code>. Best option for static assets.</li>
<li><strong>Purge by URL</strong>: precise but you must know every URL/variant.</li>
<li><strong>Purge by tag / surrogate key</strong> (<code>Surrogate-Key</code> on Fastly, <code>Cache-Tag</code> on Cloudflare Enterprise/Akamai): tag responses with e.g. <code>product-42 category-shoes</code> and purge all related objects in one API call — ideal for CMS/e-commerce.</li>
<li><strong>Soft purge</strong>: mark stale instead of deleting, so the CDN can serve stale while revalidating — protects the origin.</li>
<li><strong>Purge everything</strong>: last resort — causes a cold cache and an origin stampede.</li>
<li><strong>Short TTL + revalidation</strong>: accept bounded staleness instead of purging at all.</li>
</ul>`,
      interview: 'Interviewers want to see the cache-key reasoning (what varies the response) and a layered invalidation plan: fingerprinted assets, tag-based purge for content, short TTL + stale-while-revalidate for APIs, and avoiding purge-all stampedes.',
      examples: [
        { label: 'Origin response tagged for surrogate-key purging', lang: 'http', code: `HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: public, max-age=60
CDN-Cache-Control: max-age=86400, stale-while-revalidate=300, stale-if-error=86400
Surrogate-Key: product-42 category-shoes brand-acme
ETag: "p42-v17"

# Later, when product 42 changes (Fastly API):
POST /service/SERVICE_ID/purge/product-42
Fastly-Key: ********
Fastly-Soft-Purge: 1` }
      ]
    },
    {
      title: 'Origin Shielding & Request Collapsing',
      def: `<p>Without protection, a popular object that expires (or is purged) at 300 PoPs simultaneously can generate 300+ concurrent origin requests — or thousands if each PoP has many cache servers. Two mechanisms prevent this:</p>
<ul>
<li><strong>Origin shield</strong>: one designated PoP/tier (ideally close to the origin region) through which <em>all</em> edge misses flow. The origin sees at most one request per object per TTL from the shield instead of one per PoP. Also improves hit ratio for long-tail content. Examples: CloudFront Origin Shield, Fastly shielding, Cloudflare Tiered Cache.</li>
<li><strong>Request collapsing / coalescing</strong>: when many requests for the same uncached key arrive concurrently, the cache forwards <em>one</em> request to the origin and makes the others wait for that response (Nginx <code>proxy_cache_lock</code>, Varnish, Go's <code>singleflight</code>). Combined with <code>stale-while-revalidate</code>, users get stale content instantly while one background request refreshes it.</li>
</ul>
<p>Other origin-protection practices:</p>
<ul>
<li>Cache errors briefly (negative caching of 404s for seconds) so missing objects do not hammer the origin; but never cache 5xx for long.</li>
<li><code>stale-if-error</code>: serve stale content when the origin returns 5xx or times out — turns origin outages into degraded freshness instead of downtime.</li>
<li>Capacity plan the origin for realistic cache-miss scenarios (cold start after purge, new release, cache eviction), not just steady-state hit ratio.</li>
<li>Lock the origin down so only the CDN can reach it (see TLS at the edge).</li>
</ul>`,
      interview: 'The thundering-herd-on-expiry problem is a classic. Explain both shielding (reduces fan-in from many PoPs) and request collapsing (reduces concurrent duplicates within a cache), and relate them to the same pattern in application caches (singleflight, probabilistic early expiration).',
      examples: [
        { label: 'Nginx caching proxy with collapsing and stale serving', lang: 'nginx', code: `proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=edge:100m max_size=50g inactive=7d use_temp_path=off;

server {
    listen 443 ssl;
    http2 on;
    server_name cdn.example.com;

    location / {
        proxy_pass https://origin.example.com;
        proxy_cache edge;
        proxy_cache_key "$scheme$host$uri$is_args$args";
        proxy_cache_valid 200 301 10m;
        proxy_cache_valid 404 30s;
        proxy_cache_lock on;                 # request collapsing
        proxy_cache_lock_timeout 5s;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;    # stale-while-revalidate behaviour
        add_header X-Cache-Status $upstream_cache_status;
    }
}` }
      ]
    },
    {
      title: 'Static vs Dynamic Acceleration & Edge Compute',
      def: `<p><strong>Static acceleration</strong>: cache images, JS/CSS, fonts, video segments (HLS/DASH), downloads at the edge — the classic CDN use case with hit ratios of 90%+.</p>
<p><strong>Dynamic acceleration</strong> (uncacheable, personalised or API traffic):</p>
<ul>
<li><strong>Edge termination</strong>: TCP and TLS handshakes complete at a PoP near the user (HTTP/3 + TLS 1.3 to the client).</li>
<li><strong>Warm connection pools</strong> from edge to origin: no new handshakes per user request, large congestion windows already open.</li>
<li><strong>Optimised middle mile</strong>: routing over the CDN's private backbone or the best measured Internet path (Cloudflare Argo Smart Routing, Akamai SureRoute, CloudFront over the AWS backbone, Global Accelerator for non-HTTP).</li>
<li>Protocol optimisations: compression (Brotli/zstd), HTTP/2/3 multiplexing, early hints (<code>103</code>).</li>
<li><strong>Micro-caching</strong>: caching dynamic but shared responses for 1–5 s can absorb huge spikes (e.g. a news homepage).</li>
</ul>
<p><strong>Edge compute</strong> runs your code in PoPs: Cloudflare Workers (V8 isolates, millisecond cold starts), Fastly Compute (WebAssembly), CloudFront Functions (lightweight JS for header/URL manipulation) and Lambda@Edge (heavier Node/Python), Akamai EdgeWorkers. Use cases:</p>
<ul>
<li>Auth at the edge: validate JWTs / signed cookies before traffic reaches the origin.</li>
<li>A/B testing and feature flags, geo/locale redirects, header and cache-key manipulation.</li>
<li>Personalising cached pages (edge-side includes, HTML rewriting), image resizing/format negotiation (AVIF/WebP).</li>
<li>Bot mitigation, request validation, API rate limiting.</li>
</ul>
<p>Constraints: tight CPU/memory/time limits, restricted runtimes, and <strong>data gravity</strong> — most data lives in a home region, so edge code needing a database round trip to that region loses its latency advantage unless paired with edge stores (Workers KV, Durable Objects, D1, Fastly KV) or read replicas.</p>`,
      interview: 'Show you know a CDN accelerates dynamic content too (handshake offload, warm connections, backbone routing) and give concrete edge-compute use cases with their limits — especially data gravity. Mentioning micro-caching for spike absorption is a strong practical touch.',
      examples: [
        { label: 'Latency budget: direct to origin vs via a CDN edge (user in Mumbai, origin in us-east-1)', lang: 'text', code: `                        Direct to origin        Via CDN edge (BOM PoP)
RTT user -> endpoint    ~200 ms                 ~10 ms
TCP handshake           200 ms                  10 ms
TLS 1.3 handshake       200 ms                  10 ms
Request -> response     200 ms + origin time    10 ms + edge->origin (warm conn ~190 ms) + origin time
----------------------------------------------------------------------------------------
New connection, dynamic ~600 ms + origin        ~220 ms + origin
Cache HIT               n/a                     ~30 ms total` }
      ]
    },
    {
      title: 'TLS at the Edge, Origin Protection & DDoS Absorption',
      def: `<p><strong>TLS at the edge</strong>: the CDN terminates client TLS using certificates it manages (auto-issued via ACME, or uploaded). Features: TLS 1.3, 0-RTT resumption (idempotent requests only), hybrid post-quantum key exchange, HTTP/3, automatic HTTPS redirects and HSTS, automated short-lived certificates, and <strong>Encrypted Client Hello (ECH)</strong> to hide SNI — supported by Chrome and Firefox and enabled by providers such as Cloudflare. ECH works best at large CDNs because many sites share one public "outer" name; the client gets the ECH key from the site's HTTPS DNS record. Keyless SSL / customer-managed keys allow terminating at the edge while private keys stay in your HSM.</p>
<p><strong>CDN → origin</strong> should also be encrypted (re-encryption, "Full (strict)" mode in Cloudflare terms — validating the origin certificate). <strong>Protect the origin</strong> so attackers cannot bypass the CDN:</p>
<ul>
<li>Allow inbound only from CDN IP ranges (published lists, AWS managed prefix list for CloudFront).</li>
<li><strong>Authenticated origin pulls</strong>: the CDN presents a client certificate (mTLS) that the origin verifies; or a secret header checked by the origin/WAF.</li>
<li>Private connectivity: Cloudflare Tunnel (outbound-only connector), CloudFront VPC origins — the origin has no public IP at all.</li>
</ul>
<p><strong>DDoS absorption</strong>: anycast spreads attack traffic across every PoP, so a 1 Tbps attack becomes a few Gbps per location, absorbed by the CDN's total capacity (hundreds of Tbps for the largest networks).</p>
<ul>
<li><strong>L3/L4</strong> (SYN floods, UDP reflection/amplification): filtered in-kernel/XDP at the edge, SYN cookies/proxies, dropping unexpected protocols — the origin never sees it.</li>
<li><strong>L7</strong> (HTTP floods, credential stuffing): WAF rules, rate limiting, bot scoring, JavaScript/managed challenges, caching (cached responses are cheap to serve during floods).</li>
<li>Always-on vs on-demand mitigation; managed rules updated for new attack vectors (e.g. HTTP/2 Rapid Reset).</li>
</ul>`,
      interview: 'The common gap is origin exposure: a CDN only protects you if the origin cannot be reached directly. Mention IP allow-listing plus authenticated origin pulls or tunnels, full-strict TLS to origin, and how anycast dilutes volumetric DDoS while WAF/rate limiting handle L7.',
      examples: [
        { label: 'Origin accepts only CDN traffic with mTLS (Nginx)', lang: 'nginx', code: `server {
    listen 443 ssl;
    server_name origin.example.com;
    ssl_certificate     /etc/ssl/origin.crt;
    ssl_certificate_key /etc/ssl/origin.key;

    # Authenticated origin pulls: require the CDN's client certificate
    ssl_client_certificate /etc/ssl/cdn-origin-pull-ca.pem;
    ssl_verify_client on;

    # Defence in depth: only CDN egress ranges (generated from the CDN's published list)
    include /etc/nginx/cdn-allowlist.conf;   # allow 173.245.48.0/20; ... deny all;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}` }
      ]
    }
  ],
  problems: [
    {
      t: 'Explain the CDN request flow for a cache hit and a cache miss',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Start from DNS/anycast routing to the nearest PoP.</li><li>Cover TLS termination, cache lookup by key, tiered/shield lookup, origin fetch, storing per TTL.</li><li>Which headers tell you what happened (<code>Age</code>, <code>X-Cache</code>, <code>cf-cache-status</code>)?</li></ul>`,
      solution: `1. DNS: cdn.example.com -> CNAME to CDN -> anycast IP (or DNS picks a PoP IP).
2. Client connects to the nearest PoP; TCP/QUIC + TLS 1.3 terminate there.
3. PoP computes the cache key (host + path + normalised query + configured headers/cookies).
HIT: object fresh in the edge cache -> response immediately, Age header shows seconds cached,
     cf-cache-status: HIT / x-cache: Hit from cloudfront.
STALE: object expired -> revalidate with origin (If-None-Match) or serve stale while
     revalidating; 304 from origin refreshes TTL cheaply.
MISS: edge asks the regional tier / origin shield; if it also misses, the shield fetches from
     the origin over a warm (re-encrypted) connection, stores it per Cache-Control/CDN rules,
     and the edge stores it too. cf-cache-status: MISS, no Age (or Age: 0).
BYPASS/DYNAMIC: uncacheable (private/no-store/Set-Cookie) -> proxied to origin every time.`
    },
    {
      t: 'Inspect CDN behaviour with curl',
      d: 'easy',
      type: 'hands-on',
      hint: `<ul><li>Request the same asset twice; compare <code>Age</code> and cache status headers.</li><li>Add a random query string — what happens to the hit status?</li><li>Find which PoP served you and compare the TTFB with the origin directly (if known).</li></ul>`,
      solution: `URL=https://www.cloudflare.com/favicon.ico
curl -sI $URL | grep -iE 'cf-cache-status|age|cache-control|cf-ray'
curl -sI $URL | grep -iE 'cf-cache-status|age'          # HIT, Age increasing
curl -sI "$URL?nocache=$RANDOM" | grep -i cf-cache-status   # likely MISS: query is in the cache key
curl -s -o /dev/null -w 'ttfb=%{time_starttransfer}s\\n' $URL
curl -s https://www.cloudflare.com/cdn-cgi/trace | grep -E 'colo|http|tls'   # PoP code, protocol, TLS version`
    },
    {
      t: 'Design cache keys for an e-commerce product page',
      d: 'medium',
      type: 'design',
      hint: `<ul><li>Response varies by: currency, language, device class (mobile/desktop), A/B variant. It does not vary by marketing params, session cookie or exact User-Agent.</li><li>How do you derive a small number of variants at the edge?</li><li>What about logged-in user data (cart count, name)?</li></ul>`,
      solution: `Cache key = host + path + allow-listed query params (sorted) + derived dimensions:
  - currency  : from a cookie (currency=EUR) or geo -> normalised to a small set
  - language  : from Accept-Language -> one of en/de/fr/es (not the raw header)
  - device    : edge-derived class mobile|desktop (not the raw User-Agent)
  - abVariant : A|B assigned at the edge, stored in a cookie
Strip: utm_*, gclid, fbclid, session cookies, analytics cookies.
Variants: ~4 currencies x 4 langs x 2 devices x 2 variants = 64 per product - acceptable.
Personal data (cart count, user name): NOT in the cached HTML. Fetch via a small
  uncached API call from the browser (or edge-side include / edge personalisation).
Headers: CDN-Cache-Control: max-age=3600, stale-while-revalidate=60; Surrogate-Key: product-<id>
  so price/stock changes purge only affected pages.`
    },
    {
      t: 'Plan cache invalidation for a news website',
      d: 'medium',
      type: 'design',
      hint: `<ul><li>Article pages, section fronts (homepage), images, breaking news corrections that must propagate within seconds.</li><li>Combine TTLs, stale-while-revalidate, tag-based purge and fingerprinted assets.</li><li>Avoid origin stampedes on major breaking news.</li></ul>`,
      solution: `Static assets (JS/CSS/fonts): fingerprinted, max-age=31536000, immutable. Never purge.
Images: content-addressed URLs; long TTL; new image = new URL.
Articles: CDN TTL 1 day + Surrogate-Key: article-<id> section-<name> author-<id>.
  CMS publish/correct -> soft purge article-<id> (served stale while one request refreshes).
Homepage / section fronts: micro-cache with short CDN TTL (30-60s) + stale-while-revalidate=30
  + purge by section-<name> tag when an article in it changes.
Breaking news: soft purge homepage + section tags; origin shield + request collapsing ensure the
  origin sees ~1 request per object instead of one per PoP.
Resilience: stale-if-error=86400 so the site stays up if the CMS/origin fails.
Never use purge-all during peak traffic.`
    },
    {
      t: 'Debug: CDN cache hit ratio is below 20% after launch',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Look at response headers from the origin: <code>Set-Cookie</code>, <code>Cache-Control: private/no-cache</code>, <code>Vary</code>.</li><li>Look at request diversity: unique query strings, cache-busting params, many hostnames.</li><li>Check CDN logs / analytics for cache status breakdown (MISS vs BYPASS vs EXPIRED).</li></ul>`,
      solution: `Typical findings
1. Framework adds "Cache-Control: private, no-cache" or Set-Cookie (session) to every response
   -> CDN BYPASS. Fix: stateless pages for anonymous users, no session cookie on static/public
   routes, explicit CDN-Cache-Control.
2. Vary: User-Agent or Vary: Cookie -> thousands of variants. Fix: remove; derive device class
   at the edge.
3. Tracking params (utm_*, fbclid) and ?v=timestamp cache busters in the key. Fix: strip/ignore
   in cache-key config; use fingerprinted filenames.
4. TTLs too short (max-age=0) or missing validators. Fix: s-maxage + stale-while-revalidate.
5. Low request density per PoP for long-tail content. Fix: tiered cache / origin shield.
Measure: hit ratio by path and by cache status; target >90% for static, monitor origin offload.`
    },
    {
      t: 'Debug: origin overloaded after a global cache purge',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Every PoP missed simultaneously; how many concurrent origin requests per object?</li><li>Is origin shielding enabled? Is request collapsing on?</li><li>Hard purge vs soft purge; stale serving.</li></ul>`,
      solution: `Cause: purge-all invalidated every object in every PoP. Each PoP (and each cache node inside
it) sends its own origin request for hot objects -> request storm, origin CPU/DB saturated,
5xx -> CDN retries add more load.

Immediate: enable/verify origin shield so all misses funnel through one tier; turn on
stale-if-error so 5xx are masked with stale copies where any exist; rate limit origin fetches.
Prevent:
- Prefer tag/URL soft purges; never purge-all at peak.
- Request collapsing at edge and shield (one fetch per object per tier).
- stale-while-revalidate so expiry never blocks users.
- Pre-warm critical objects after deploys; capacity-test the origin for a cold-cache scenario.`
    },
    {
      t: 'Debug: users see another user\'s account page via the CDN',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>A personalised response was cached under a shared key — which headers allowed it?</li><li>Consider "cache everything" rules, missing <code>Cache-Control: private</code>, and <strong>web cache deception</strong> (<code>/account/profile.css</code>).</li><li>Containment first: purge and bypass; then fix rules and headers.</li></ul>`,
      solution: `Containment (minutes): purge affected paths; add a bypass rule for /account/* and any
authenticated route; invalidate sessions if tokens/PII were exposed; start incident process.

Root causes to check:
1. A CDN "cache everything" / override-TTL rule applied to dynamic routes, ignoring origin
   headers.
2. Origin sent no Cache-Control (heuristic caching) or "public" on personalised responses.
3. Web cache deception: /account/settings/x.css is routed by the app to the account page
   (path-insensitive routing) but the CDN caches it because of the .css extension.
4. Cache key excludes the auth cookie/Authorization header while the response depends on it.

Fixes:
- Origin: Cache-Control: private, no-store on every authenticated/personalised response
  (set in middleware by default, opt-in to caching).
- CDN: never cache requests carrying Authorization or session cookies; respect origin
  headers on dynamic routes; extension-based rules only for real static paths.
- App: strict routing (404 for unexpected suffixes); set correct Content-Type.
- Tests: automated check that authenticated routes return private/no-store.`
    },
    {
      t: 'Implement a caching reverse proxy with request coalescing in Go',
      d: 'hard',
      type: 'coding',
      hint: `<ul><li>In-memory cache keyed by path + normalised query (drop <code>utm_*</code>, sort params).</li><li>On a miss, the first request fetches from origin; concurrent requests for the same key wait for that result (singleflight).</li><li>Use a detached context with timeout for the shared fetch (one client cancelling must not fail the others).</li><li>Only cache GET 200 responses; expose <code>X-Cache: HIT|MISS|COALESCED</code>.</li></ul>`,
      solution: `package main

import (
    "context"
    "io"
    "log"
    "net/http"
    "net/url"
    "strings"
    "sync"
    "time"
)

type entry struct {
    status  int
    ctype   string
    body    []byte
    expires time.Time
}

type call struct {
    done chan struct{}
    e    *entry
    err  error
}

type Cache struct {
    origin   string
    ttl      time.Duration
    client   *http.Client
    mu       sync.Mutex
    items    map[string]*entry
    inflight map[string]*call
}

func cacheKey(u *url.URL) string {
    q := u.Query()
    for k := range q {
        if strings.HasPrefix(k, "utm_") || k == "fbclid" || k == "gclid" {
            q.Del(k)
        }
    }
    return u.Path + "?" + q.Encode() // Encode sorts keys
}

func (c *Cache) get(key, path string) (*entry, string, error) {
    c.mu.Lock()
    if e, ok := c.items[key]; ok && time.Now().Before(e.expires) {
        c.mu.Unlock()
        return e, "HIT", nil
    }
    if cl, ok := c.inflight[key]; ok { // someone is already fetching
        c.mu.Unlock()
        <-cl.done
        return cl.e, "COALESCED", cl.err
    }
    cl := &call{done: make(chan struct{})}
    c.inflight[key] = cl
    c.mu.Unlock()

    cl.e, cl.err = c.fetch(path)

    c.mu.Lock()
    delete(c.inflight, key)
    if cl.err == nil && cl.e.status == http.StatusOK {
        c.items[key] = cl.e
    }
    c.mu.Unlock()
    close(cl.done)
    return cl.e, "MISS", cl.err
}

func (c *Cache) fetch(path string) (*entry, error) {
    // Detached context: the shared fetch must not die if the first client disconnects.
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.origin+path, nil)
    if err != nil {
        return nil, err
    }
    resp, err := c.client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    body, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20))
    if err != nil {
        return nil, err
    }
    return &entry{status: resp.StatusCode, ctype: resp.Header.Get("Content-Type"),
        body: body, expires: time.Now().Add(c.ttl)}, nil
}

func (c *Cache) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "only GET is cached in this demo", http.StatusMethodNotAllowed)
        return
    }
    e, status, err := c.get(cacheKey(r.URL), r.URL.RequestURI())
    if err != nil {
        http.Error(w, "origin error", http.StatusBadGateway)
        return
    }
    w.Header().Set("Content-Type", e.ctype)
    w.Header().Set("X-Cache", status)
    w.WriteHeader(e.status)
    w.Write(e.body)
}

func main() {
    c := &Cache{
        origin: "http://localhost:9000", ttl: 30 * time.Second,
        client: &http.Client{Timeout: 10 * time.Second},
        items:  map[string]*entry{}, inflight: map[string]*call{},
    }
    log.Fatal(http.ListenAndServe(":8080", c))
}
// Production additions: LRU/size bound, honour Cache-Control from origin, stale-while-
// revalidate, Vary handling, metrics; or use golang.org/x/sync/singleflight.`,
      lang: 'go'
    },
    {
      t: 'Design a CDN strategy for a global SaaS application and its API',
      d: 'hard',
      type: 'design',
      hint: `<ul><li>SPA frontend, REST/GraphQL API, file uploads/downloads, WebSockets; users on all continents; origin in two regions.</li><li>What is cacheable? What is accelerated but not cached? What runs at the edge?</li><li>Security: WAF, bot protection, origin lockdown, DDoS.</li></ul>`,
      solution: `Frontend: SPA assets fingerprinted, immutable 1y; index.html no-cache + ETag. Served
entirely from CDN (S3/GCS origin with origin access control). Hit ratio ~99%.
API (dynamic): proxied through the CDN for edge TLS 1.3 + HTTP/3, warm pooled connections to
origin, backbone routing; latency-based origin selection between the two regions with health
checks and failover. Cache only public GETs (feature flags, config, public catalogue) with
s-maxage + SWR; micro-cache popular shared endpoints 1-5s.
Edge compute: JWT validation and coarse authz, geo/data-residency routing (EU tenants -> EU
origin), A/B assignment, security headers.
Files: downloads via signed URLs/cookies with short expiry, cached at edge; uploads direct to
object storage via pre-signed URLs (multipart), bypassing the API.
WebSockets: proxied via CDN (supported by Cloudflare/CloudFront) or a separate anycast L4
front door; heartbeats under the idle timeout.
Security: managed WAF rules + rate limiting per API key, bot management, always-on DDoS;
origins reachable only from CDN (private origins/tunnels or allow-list + mTLS origin pulls).
Observability: hit ratio, edge vs origin latency, 5xx by PoP, origin offload; logs to SIEM.`
    }
  ],
  interviewFocus: [
    {
      q: 'How does a CDN reduce latency even for dynamic, uncacheable API requests?',
      a: `<ul>
<li><strong>Handshake offload</strong>: TCP + TLS (or QUIC) complete at a PoP a few ms away instead of across an ocean — saves 1–2 long RTTs per new connection.</li>
<li><strong>Connection reuse to origin</strong>: the edge keeps persistent, multiplexed connections with already-grown congestion windows; user requests ride them without new handshakes or slow start.</li>
<li><strong>Better middle mile</strong>: routing over the provider's backbone or dynamically chosen best paths avoids congested public Internet routes and lowers loss (which matters hugely for TCP throughput).</li>
<li><strong>Modern protocols to the client</strong>: HTTP/3 over QUIC and TLS 1.3 at the edge even if the origin only speaks HTTP/1.1.</li>
<li><strong>Edge logic</strong>: auth checks, redirects and some responses can be served entirely at the edge; micro-caching collapses spikes.</li>
</ul>
<p>Quantified: for a user 200 ms RTT from the origin, a new HTTPS request drops from ~600 ms + server time to ~220 ms + server time.</p>`
    },
    {
      q: 'What makes cache invalidation hard at CDN scale, and how do you design around it?',
      a: `<p>Hard because: objects live in hundreds of PoPs and multiple tiers; purges propagate asynchronously (usually seconds, sometimes longer); one logical change affects many URLs and variants (languages, devices, query strings); browsers and intermediate caches also hold copies you cannot purge; and mass purges cause origin stampedes.</p>
<p>Design around it:</p>
<ul>
<li><strong>Immutable, versioned URLs</strong> for anything you can (assets, images, API responses addressed by version) — no invalidation needed.</li>
<li><strong>Tag-based purges</strong> (surrogate keys) to invalidate all representations of an entity in one call.</li>
<li><strong>Short CDN TTL + stale-while-revalidate</strong> for content that changes unpredictably — bounded staleness without purges.</li>
<li><strong>Soft purge</strong>, origin shielding and request collapsing to avoid stampedes.</li>
<li>Keep browser TTLs (<code>max-age</code>) shorter than CDN TTLs (<code>s-maxage</code> / <code>CDN-Cache-Control</code>) for anything you may need to purge, because you cannot purge browsers.</li>
</ul>`
    },
    {
      q: 'How do CDNs mitigate DDoS attacks, and what must you configure yourself?',
      a: `<p>The CDN provides: massive anycast capacity that dilutes volumetric attacks across all PoPs; L3/L4 filtering (XDP/eBPF, SYN proxies, dropping reflection traffic like DNS/NTP/memcached amplification); L7 protections (managed WAF rules, rate limiting, bot detection, challenges); and caching, which turns many floods into cheap cache hits.</p>
<p>You must configure:</p>
<ul>
<li><strong>Origin lockdown</strong> — otherwise attackers discover and hit the origin IP directly (historical DNS records, certificate transparency logs, email headers). Use private origins/tunnels, IP allow-lists and authenticated origin pulls; rotate origin IPs after onboarding.</li>
<li>Rate limits and WAF rules that reflect your API (per key, per route, login endpoints).</li>
<li>Cacheability of public content so the edge can absorb floods.</li>
<li>Non-HTTP services (game servers, SSH, custom TCP/UDP) need L4 protection products (Spectrum, AWS Shield Advanced with Global Accelerator/NLB).</li>
<li>Runbooks: under-attack modes, contacts, and alerting on traffic anomalies.</li>
</ul>`
    },
    {
      q: 'When would you run code at the edge instead of in your regional backend?',
      a: `<p><strong>Good fits</strong>: logic that needs only the request plus small, globally replicated data — request routing and redirects, A/B assignment, auth token verification (stateless JWT with cached JWKS), header/security policy injection, cache-key normalisation, image transformation, bot filtering, geo-compliance decisions, and personalisation of otherwise cached pages.</p>
<p><strong>Poor fits</strong>: anything needing strongly consistent reads/writes against a central database (each edge request would make a long round trip to the home region — slower than running in-region), heavy CPU work, long-running connections or large dependencies.</p>
<p>Decision rule: compute should move to the edge only if its <em>data</em> can move there too (edge KV, replicated config, read replicas) or if the work prevents a round trip entirely (rejecting bad requests early). Also weigh vendor lock-in of edge runtimes and observability/debugging limitations.</p>`
    }
  ],
  quiz: [
    { q: 'What is a CDN PoP?', a: 'A point of presence: a data centre location of the CDN with cache servers that terminate user connections and serve cached content.' },
    { q: 'What does the Age response header indicate?', a: 'How many seconds the response has been stored in a shared cache since it was fetched or revalidated from the origin.' },
    { q: 'What is origin shielding?', a: 'Routing all edge cache misses through a designated tier/PoP so the origin receives at most one request per object instead of one per PoP.' },
    { q: 'What is request collapsing?', a: 'When many concurrent requests miss on the same key, only one is forwarded to the origin and the others wait for and share its response.' },
    { q: 'What is the safest way to invalidate static assets?', a: 'Use fingerprinted/versioned URLs with long immutable TTLs, so new deployments reference new URLs and no purge is needed.' },
    { q: 'What is a surrogate key (cache tag)?', a: 'A label attached to cached responses that allows purging every object with that tag in one API call, e.g. all pages showing product 42.' },
    { q: 'Why must the origin be locked down behind a CDN?', a: 'Otherwise attackers can bypass the CDN WAF, rate limits and DDoS protection by sending traffic directly to the origin IP.' }
  ],
  resources: [
    { title: 'Cloudflare Learning — What is a CDN?', url: 'https://www.cloudflare.com/learning/cdn/what-is-a-cdn/', type: 'article' },
    { title: 'MDN — HTTP caching', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching', type: 'docs' },
    { title: 'RFC 9111 — HTTP Caching', url: 'https://datatracker.ietf.org/doc/html/rfc9111', type: 'docs' },
    { title: 'NGINX Docs — ngx_http_proxy_module (proxy_cache)', url: 'https://nginx.org/en/docs/http/ngx_http_proxy_module.html', type: 'docs' }
  ]
},
// ───────────────────────────── Module 9 ─────────────────────────────
{
  n: 9,
  title: 'Network Security',
  summary: 'Defending systems at the network layer: stateless vs stateful firewalls and WAFs, why NAT is not security, VPN technologies (IPsec, WireGuard, TLS VPNs), segmentation and DMZs, zero-trust networking, DDoS attack classes and mitigations, TLS everywhere, and classic attacks such as ARP spoofing, DNS spoofing and man-in-the-middle.',
  topics: [
    {
      title: 'Firewalls: Stateless, Stateful, L7 & WAF',
      def: `<p><strong>Stateless packet filters</strong> evaluate each packet independently against ordered rules (src/dst IP, protocol, port). Fast and simple, but return traffic must be allowed explicitly — e.g. ephemeral ports 1024–65535 for responses. Examples: AWS <strong>Network ACLs</strong> (subnet level, numbered rules, allow <em>and</em> deny), router ACLs.</p>
<p><strong>Stateful firewalls</strong> track connections (Linux <code>conntrack</code>): if an outbound connection is allowed, its return packets are allowed automatically. Examples: AWS <strong>Security Groups</strong> (instance/ENI level, allow-only, can reference other SGs by ID), GCP/Azure firewall rules, iptables/nftables with <code>ct state established,related accept</code>. Watch conntrack table limits on busy hosts.</p>
<p>How connection tracking works: the first packet of a flow is checked against the rules; if allowed, an entry keyed by the 5-tuple is created (state <code>NEW</code> → <code>ESTABLISHED</code> once the reply is seen). Later packets match the entry and skip the rule walk; ICMP errors and FTP data channels match as <code>RELATED</code>; packets that fit no valid flow (e.g. a mid-stream ACK after the entry expired) are <code>INVALID</code> and usually dropped. Entries expire on FIN/RST or after an idle timeout (Linux and AWS security groups: 5 days for established TCP by default, configurable per ENI in AWS; AWS NAT gateways and NLBs, by contrast, drop idle TCP flows after 350 s — a common surprise for long-lived quiet connections). Consequences: <strong>asymmetric routing breaks stateful firewalls</strong> (the reply arrives at a device that never saw the SYN), a full table drops new connections (<code>nf_conntrack: table full</code>), and rule changes do not affect already-established flows until they are reset.</p>
<p><strong>L7 / next-generation firewalls</strong> identify applications and users, inspect TLS (when decrypting), and apply IDS/IPS signatures. <strong>WAFs</strong> (Web Application Firewalls) inspect HTTP requests for attacks — SQL injection, XSS, path traversal, SSRF patterns, known CVE exploits (Log4Shell) — using managed rule sets (OWASP Core Rule Set, AWS Managed Rules, Cloudflare Managed Ruleset) plus custom rules and rate limits. Deploy in <em>count/log</em> mode first to tune false positives, then block. A WAF is defence in depth, not a substitute for secure code.</p>
<p><strong>Kubernetes NetworkPolicy</strong>: L3/L4 pod firewalling by label selectors, namespaces and CIDRs, enforced by the CNI (Calico, Cilium; Flannel alone does not enforce). Pods are non-isolated until a policy selects them; start with <strong>default deny</strong> ingress <em>and</em> egress per namespace, then allow explicit flows — remembering DNS egress to CoreDNS. Cilium adds L7-aware and FQDN-based egress policies.</p>
<p><strong>Egress control</strong> is often neglected: restricting outbound traffic (egress gateways, proxy allow-lists, FQDN policies) limits data exfiltration and C2 callbacks after a compromise.</p>`,
      interview: 'Security groups vs NACLs is a staple AWS networking question: stateful vs stateless, allow-only vs allow/deny, instance vs subnet level, and the ephemeral port return-traffic trap. Then show breadth: WAF limits, NetworkPolicy default-deny, and egress filtering.',
      examples: [
        { label: 'Kubernetes default-deny plus explicit allows', lang: 'yaml', code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
  namespace: payments
spec:
  podSelector:
    matchLabels: { app: payments-api }
  policyTypes: [Ingress, Egress]
  ingress:
  - from:
    - namespaceSelector:
        matchLabels: { kubernetes.io/metadata.name: web }
      podSelector:
        matchLabels: { app: frontend }
    ports:
    - { protocol: TCP, port: 8080 }
  egress:
  - to:                                    # DNS
    - namespaceSelector:
        matchLabels: { kubernetes.io/metadata.name: kube-system }
      podSelector:
        matchLabels: { k8s-app: kube-dns }
    ports:
    - { protocol: UDP, port: 53 }
    - { protocol: TCP, port: 53 }
  - to:                                    # database subnet
    - ipBlock: { cidr: 10.20.128.0/22 }
    ports:
    - { protocol: TCP, port: 5432 }` }
      ]
    },
    {
      title: 'NAT Is Not Security; Segmentation & DMZ',
      def: `<p><strong>Is NAT a security feature?</strong> Partly by accident. A NAT device drops unsolicited inbound packets because there is no translation entry — but that protection actually comes from the <em>stateful tracking</em>, which a stateful firewall provides explicitly and more reliably. NAT does not stop outbound malware, does not inspect traffic, can be traversed (UPnP, port forwards, hole punching), and with IPv6 (no NAT) hosts are globally addressable — so you need a <strong>stateful firewall with default-deny inbound</strong> either way. Treat NAT as address conservation, not access control.</p>
<p><strong>Network segmentation</strong> limits blast radius and lateral movement:</p>
<ul>
<li><strong>Macro-segmentation</strong>: separate VPCs/VNets/accounts per environment (prod vs dev) and per sensitivity (PCI cardholder data environment), connected only through controlled paths (Transit Gateway with route tables, PrivateLink for service-level exposure).</li>
<li><strong>Tiered subnets</strong>: public (LBs only), private app, isolated data subnets with no route to the Internet.</li>
<li><strong>Micro-segmentation</strong>: per-workload rules — security groups referencing other security groups ("only the app SG can reach the DB SG on 5432"), Kubernetes NetworkPolicies, mesh <code>AuthorizationPolicy</code> based on identity.</li>
</ul>
<p>A <strong>DMZ</strong> (demilitarised zone) is a network segment between the Internet and the internal network hosting public-facing services (reverse proxies, mail relays, bastions). Traditional design: Internet ↔ outer firewall ↔ DMZ ↔ inner firewall ↔ internal network; DMZ hosts may only open specific connections inward. In the cloud the equivalent is public subnets containing only load balancers/WAF/NAT, with everything else private. <strong>Bastion hosts</strong> are increasingly replaced by identity-aware access (AWS SSM Session Manager, GCP IAP, Teleport) with no inbound SSH open at all.</p>`,
      interview: 'When asked "is NAT a firewall?", say no, explain why it looks like one (stateful translation table) and why that is insufficient (IPv6, outbound threats, port forwards). Then show a segmented architecture with security-group-to-security-group rules and no public SSH.',
      examples: [
        { label: 'Three-tier segmentation with security group references (Terraform)', lang: 'text', code: `resource "aws_security_group_rule" "alb_from_internet" {
  type = "ingress"  from_port = 443  to_port = 443  protocol = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}
resource "aws_security_group_rule" "app_from_alb" {
  type = "ingress"  from_port = 8080  to_port = 8080  protocol = "tcp"
  source_security_group_id = aws_security_group.alb.id      # only the ALB
  security_group_id        = aws_security_group.app.id
}
resource "aws_security_group_rule" "db_from_app" {
  type = "ingress"  from_port = 5432  to_port = 5432  protocol = "tcp"
  source_security_group_id = aws_security_group.app.id      # only app instances
  security_group_id        = aws_security_group.db.id
}
# No SSH ingress anywhere: operators use SSM Session Manager.` }
      ]
    },
    {
      title: 'VPNs: IPsec, WireGuard & TLS VPNs',
      def: `<table>
<thead><tr><th></th><th>IPsec</th><th>WireGuard</th><th>TLS/SSL VPN</th></tr></thead>
<tbody>
<tr><td>Layer</td><td>L3 (IP)</td><td>L3 (IP over UDP)</td><td>L4/L7 (TLS over TCP or DTLS/UDP)</td></tr>
<tr><td>Key exchange</td><td>IKEv2 (UDP 500/4500), certificates or PSK</td><td>Noise protocol, static Curve25519 public keys</td><td>TLS handshake, certificates + user auth (SAML/MFA)</td></tr>
<tr><td>Crypto</td><td>Negotiated suites (AES-GCM, etc.) — flexible but complex</td><td>Fixed modern suite (ChaCha20-Poly1305, Curve25519, BLAKE2s) — no negotiation</td><td>TLS cipher suites</td></tr>
<tr><td>Typical use</td><td>Site-to-site (AWS Site-to-Site VPN, on-prem routers), standards-based interop</td><td>Modern site-to-site and remote access (Tailscale, Netmaker), Kubernetes CNI encryption (Calico, Cilium)</td><td>Remote user access through restrictive networks (OpenVPN, Cisco AnyConnect, Fortinet)</td></tr>
<tr><td>Pros</td><td>Ubiquitous, hardware offload, vendor interop</td><td>~4K lines of code, in Linux kernel since 5.6, fast, roaming-friendly</td><td>Works over TCP 443 where UDP is blocked; clientless browser modes</td></tr>
<tr><td>Cons</td><td>Complex config, NAT traversal quirks (NAT-T over UDP 4500)</td><td>No built-in user auth/IP assignment (overlays add it), UDP only</td><td>TCP-over-TCP meltdown, history of appliance CVEs</td></tr>
</tbody>
</table>
<p>IPsec modes: <strong>tunnel mode</strong> encapsulates the whole IP packet (site-to-site), <strong>transport mode</strong> protects only the payload (host-to-host). The protocol carrying encrypted data is <strong>ESP</strong> (IP protocol 50); AH (authentication only) is rarely used.</p>
<p>Every VPN adds encapsulation overhead — set tunnel MTUs correctly (WireGuard defaults to 1420) and clamp MSS. Cloud alternatives: Direct Connect/ExpressRoute/Interconnect for private dedicated links (not encrypted by default — run MACsec or IPsec on top if required).</p>
<p>Traditional remote-access VPNs grant network-level access ("once in, reach everything"), which is why the industry is moving to <strong>zero-trust network access</strong> that grants per-application access.</p>`,
      interview: 'Compare the three families on layer, crypto agility, performance and operations, and state when you would use each. Mention MTU overhead and that private links like Direct Connect are not encrypted by default. Connect remote-access VPN weaknesses to zero trust.',
      examples: [
        { label: 'WireGuard site-to-site config', lang: 'text', code: `# /etc/wireguard/wg0.conf on gateway A (10.10.0.0/16 behind it)
[Interface]
Address    = 172.31.255.1/30
ListenPort = 51820
PrivateKey = <A-private-key>
MTU        = 1420

[Peer]
PublicKey           = <B-public-key>
Endpoint            = 203.0.113.50:51820
AllowedIPs          = 172.31.255.2/32, 10.20.0.0/16   # cryptokey routing: what B may send/receive
PersistentKeepalive = 25                              # keep NAT mappings alive

$ sudo wg-quick up wg0 && sudo wg show
peer: <B-public-key>
  endpoint: 203.0.113.50:51820
  allowed ips: 172.31.255.2/32, 10.20.0.0/16
  latest handshake: 12 seconds ago
  transfer: 1.21 GiB received, 3.48 GiB sent` }
      ]
    },
    {
      title: 'Zero-Trust Networking',
      def: `<p><strong>Zero trust</strong> (NIST SP 800-207, Google BeyondCorp): <em>network location grants no trust</em>. Being "inside" the corporate network or VPC does not authorise anything. Every request is authenticated, authorised and encrypted based on <strong>identity</strong> (user + device + workload) and context, with least privilege.</p>
<p>Core principles:</p>
<ul>
<li><strong>Strong identity everywhere</strong>: users via SSO/OIDC with phishing-resistant MFA (WebAuthn/passkeys); devices via certificates and posture checks (managed, patched, disk encrypted); workloads via SPIFFE/SPIRE identities, cloud IAM roles, mTLS certificates.</li>
<li><strong>Per-request policy</strong> at a policy enforcement point (identity-aware proxy, service mesh sidecar/waypoint, API gateway) consulting a policy engine (OPA, Cedar, cloud IAM).</li>
<li><strong>Encrypt all traffic</strong>, including east-west (mTLS).</li>
<li><strong>Least privilege + micro-segmentation</strong>: access to specific applications, not networks; short-lived credentials.</li>
<li><strong>Assume breach</strong>: continuous monitoring, logging every access decision, anomaly detection.</li>
</ul>
<p>Implementations:</p>
<ul>
<li><strong>User → app (ZTNA)</strong>: identity-aware proxies replace VPNs — Google IAP / BeyondCorp Enterprise, Cloudflare Access, Zscaler Private Access, Tailscale with ACLs, AWS Verified Access. Apps are never exposed directly; connectors dial out to the broker.</li>
<li><strong>Service → service</strong>: service mesh mTLS with identity-based <code>AuthorizationPolicy</code>, SPIFFE IDs, short-lived certs; cloud workload identity (IRSA/EKS Pod Identity, GKE Workload Identity) for cloud APIs.</li>
<li><strong>Admin access</strong>: just-in-time, audited sessions (SSM Session Manager, Teleport) instead of bastions with long-lived SSH keys.</li>
</ul>
<p>Zero trust does not mean "no firewalls": segmentation stays as defence in depth, but it is no longer the primary trust boundary.</p>`,
      interview: 'Define zero trust crisply ("identity, not network location"), then give concrete mechanisms for each traffic type: ZTNA/identity-aware proxy for users, mTLS + SPIFFE + authz policies for services, JIT access for admins. Mention that perimeter VPNs fail because one compromised laptop gets broad network access.',
      examples: [
        { label: 'Zero-trust request path for an internal admin app', lang: 'text', code: `Laptop (managed, cert-based device identity)
   | HTTPS
   v
Identity-aware proxy (e.g. Cloudflare Access / Google IAP)
   1. Authenticate user via OIDC SSO + WebAuthn MFA
   2. Check device posture (MDM-managed, OS patched, disk encrypted)
   3. Evaluate policy: group=finance-admins AND device=compliant AND country in allowed list
   4. Issue short-lived signed assertion (JWT) to the app
   | (outbound-only tunnel from app connector; app has no public IP)
   v
Admin app: verifies the proxy's JWT signature + audience on every request
   | mTLS (SPIFFE ID spiffe://corp/ns/finance/sa/admin-app)
   v
Ledger service: AuthorizationPolicy allows only admin-app identity, method GET/POST
Every decision logged to SIEM.` }
      ]
    },
    {
      title: 'DDoS Attack Types & Mitigation',
      def: `<table>
<thead><tr><th>Class</th><th>Goal</th><th>Examples</th><th>Measured in</th><th>Mitigation</th></tr></thead>
<tbody>
<tr><td><strong>Volumetric</strong> (L3/L4)</td><td>Saturate bandwidth</td><td>UDP floods; <strong>reflection/amplification</strong> via DNS, NTP (monlist), memcached (up to ~50,000× amplification), CLDAP, SSDP; botnet floods</td><td>Gbps / Tbps</td><td>Anycast scrubbing capacity (CDN, AWS Shield, Cloud Armor), upstream filtering/blackholing, drop unexpected UDP</td></tr>
<tr><td><strong>Protocol</strong> (L3/L4)</td><td>Exhaust state in servers, firewalls, LBs</td><td>SYN floods, ACK/RST floods, fragmentation attacks, Ping of Death (historic), conntrack exhaustion</td><td>Packets/s</td><td>SYN cookies, SYN proxies at the edge, stateless filtering before stateful devices, rate limits per source</td></tr>
<tr><td><strong>Application</strong> (L7)</td><td>Exhaust app CPU, DB, threads</td><td>HTTP GET/POST floods on expensive endpoints (search, login), Slowloris (slow headers), HTTP/2 Rapid Reset, cache-busting floods, credential stuffing</td><td>Requests/s</td><td>WAF, rate limiting per key/IP/fingerprint, bot detection &amp; challenges, caching, server timeouts (header/body read), autoscaling + load shedding</td></tr>
</tbody>
</table>
<p><strong>Amplification</strong> works because UDP has no handshake: the attacker spoofs the victim's IP as the source of a small request to open reflectors that send large responses to the victim. Defences on the Internet side: BCP 38 source address validation by ISPs, closing open resolvers/reflectors, and response rate limiting. As a service owner, never run open UDP services that reply with more bytes than they receive (QUIC enforces a 3× anti-amplification limit before address validation).</p>
<p>Architectural defences: put everything behind an anycast CDN/DDoS provider, lock down origins, make expensive endpoints cacheable or cheap to reject early (auth, validation at the edge), set aggressive server timeouts (<code>ReadHeaderTimeout</code> in Go defeats Slowloris), have per-tenant quotas, and pre-plan "under attack" runbooks.</p>`,
      interview: 'Classify the attack first (volumetric vs protocol vs application), then match mitigations to the layer. Explaining reflection/amplification with IP spoofing and why UDP enables it is a common deep-dive; Slowloris and Go ReadHeaderTimeout make a nice practical bridge.',
      examples: [
        { label: 'Hardening a Go server against slow and oversized requests', lang: 'go', code: `srv := &http.Server{
    Addr:              ":8443",
    Handler:           http.MaxBytesHandler(mux, 1<<20), // 1 MiB request body cap
    ReadHeaderTimeout: 5 * time.Second,                  // defeats Slowloris
    ReadTimeout:       15 * time.Second,
    WriteTimeout:      30 * time.Second,
    IdleTimeout:       90 * time.Second,
    MaxHeaderBytes:    32 << 10,
}
// HTTP/2 limits (golang.org/x/net/http2 for fine-tuning):
//   MaxConcurrentStreams: 100 - Go 1.21.3+ also bounds handler goroutines (Rapid Reset fix)` }
      ]
    },
    {
      title: 'TLS Everywhere & Common Network Attacks',
      def: `<p><strong>TLS 1.3</strong> (RFC 8446) is the baseline: 1-RTT handshake (0-RTT optional), mandatory <strong>forward secrecy</strong> (ephemeral ECDHE — static RSA key exchange removed), only AEAD ciphers (AES-GCM, ChaCha20-Poly1305), encrypted certificates in the handshake, and removal of legacy features (renegotiation, compression, CBC, SHA-1). Clients validate the server's certificate chain to a trusted root, check the hostname against the <strong>SAN</strong>, validity dates and revocation. <strong>mTLS</strong> additionally authenticates the client with a certificate. <strong>HSTS</strong> (<code>Strict-Transport-Security</code>, ideally preloaded) prevents protocol downgrade. Certificate Transparency logs make mis-issuance detectable; CAA records restrict issuers.</p>
<p>What changed recently (worth mentioning in 2026 interviews):</p>
<ul>
<li><strong>Post-quantum key exchange</strong>: hybrid <code>X25519MLKEM768</code> (classical X25519 + ML-KEM, FIPS 203) is negotiated by default between current browsers and big providers, and by Go's <code>crypto/tls</code> since 1.24 — it protects today's traffic against "harvest now, decrypt later". The larger key share pushes the ClientHello past one packet, which breaks some buggy middleboxes. Certificates/signatures are still classical.</li>
<li><strong>Shorter certificate lifetimes</strong>: CA/Browser Forum rules cut the maximum public TLS certificate validity to 200 days from March 2026, 100 days in 2027 and 47 days by 2029. Manual renewal is no longer viable — ACME/cert-manager automation and expiry monitoring are mandatory.</li>
<li><strong>Revocation</strong>: OCSP is fading (privacy leaks, soft-fail). Let's Encrypt ended OCSP in 2025; browsers rely on CRLs aggregated into pushed lists (Firefox CRLite, Chrome CRLSets), and short lifetimes limit the damage of an unrevoked key.</li>
<li><strong>ECH</strong> (Encrypted Client Hello) encrypts the SNI and other ClientHello fields using a key from the HTTPS DNS record, closing the last big plaintext metadata leak of TLS 1.3.</li>
</ul>
<p>"TLS everywhere" means encrypting internal (east-west) traffic too: cloud networks, data centres and even links between your own data centres have been tapped in the past.</p>
<p><strong>Common attacks</strong>:</p>
<ul>
<li><strong>ARP spoofing / poisoning</strong> (L2): attacker on the same LAN sends forged ARP replies claiming the gateway's IP → traffic flows through the attacker (MITM). Defences: dynamic ARP inspection + DHCP snooping on switches, static ARP for critical hosts, and TLS (makes intercepted traffic useless). Cloud VPCs do not allow ARP spoofing between instances.</li>
<li><strong>DNS spoofing / cache poisoning</strong>: forged DNS answers redirect users to attacker IPs. Defences: source port + ID randomisation, DNSSEC validation, DoH/DoT to trusted resolvers — and TLS certificate validation, which makes the redirect fail.</li>
<li><strong>Man-in-the-middle</strong> (rogue Wi-Fi, compromised router, BGP hijack, malicious proxy): defeated by properly validated TLS; risk remains if users click through warnings, apps disable verification (<code>InsecureSkipVerify: true</code>), or attackers obtain a valid certificate (CT monitoring, CAA, certificate pinning for high-value mobile apps).</li>
<li><strong>SSL stripping</strong>: attacker downgrades the first plain-HTTP request; prevented by HSTS preload.</li>
<li><strong>Session hijacking / replay</strong>: steal cookies over plaintext — <code>Secure</code>, <code>HttpOnly</code>, short-lived tokens, token binding / DPoP.</li>
</ul>`,
      interview: 'Explain what TLS 1.3 changed and why forward secrecy matters. For attacks, the key insight is that correctly validated TLS neutralises most network-level MITM (ARP spoofing, DNS spoofing, BGP hijack) — and that the most common real-world failure is code that disables certificate verification.',
      examples: [
        { label: 'Audit a server TLS configuration', lang: 'bash', code: `# Negotiated protocol, cipher and certificate chain
$ openssl s_client -connect api.example.com:443 -servername api.example.com -tls1_3 </dev/null 2>/dev/null \\
    | grep -E 'Protocol|Cipher|Verify return|s:|i:'
 0 s:CN = api.example.com
   i:C = US, O = Let's Encrypt, CN = E6
 1 s:C = US, O = Let's Encrypt, CN = E6
   i:C = US, O = Internet Security Research Group, CN = ISRG Root X1
Protocol  : TLSv1.3
Cipher    : TLS_AES_256_GCM_SHA384
Verify return code: 0 (ok)

# Legacy protocols must fail
$ openssl s_client -connect api.example.com:443 -tls1_1 </dev/null 2>&1 | grep -iE 'alert|no protocols'
... alert protocol version ...

# HSTS header present?
$ curl -sI https://api.example.com | grep -i strict-transport
strict-transport-security: max-age=63072000; includeSubDomains; preload` }
      ]
    }
  ],
  problems: [
    {
      t: 'Write security group and NACL rules for a public web tier',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>Web servers behind an ALB serve HTTPS; they call an external payment API over 443.</li><li>Security groups are stateful; NACLs are stateless and evaluated in rule-number order.</li><li>Do not forget ephemeral ports for return traffic in NACLs.</li></ul>`,
      solution: `ALB security group:   inbound 443 from 0.0.0.0/0 (and ::/0); outbound 8080 to web SG
Web security group:   inbound 8080 from ALB SG only; outbound 443 to 0.0.0.0/0 (payment API)
  (stateful: responses to allowed flows return automatically)

Public subnet NACL (ALB + NAT gateway subnet):
  Inbound : 100 allow TCP 443 from 0.0.0.0/0          clients -> ALB
            110 allow TCP 1024-65535 from 0.0.0.0/0   responses arriving for connections this
                                                      subnet initiated (ALB -> targets,
                                                      NAT GW -> payment API)
            *   deny all
  Outbound: 100 allow TCP 1024-65535 to 0.0.0.0/0     responses to clients' ephemeral ports
            110 allow TCP 8080 to 10.20.0.0/16        ALB -> targets
            120 allow TCP 443 to 0.0.0.0/0            NAT GW -> payment API
            *   deny all
Most teams keep NACLs permissive and use security groups as the main control; NACLs for coarse
subnet-level denies (e.g. block a malicious CIDR).`
    },
    {
      t: 'Write default-deny NetworkPolicies for a namespace',
      d: 'medium',
      type: 'hands-on',
      hint: `<ul><li>Deny all ingress and egress by default.</li><li>Allow frontend (namespace <code>web</code>) → api:8080, api → postgres:5432, and DNS egress for every pod.</li><li>Verify with <code>kubectl exec ... -- nc -zv</code> before and after; confirm your CNI enforces policies.</li></ul>`,
      solution: `# 1. default deny (podSelector: {} selects all pods; both policy types)
# 2. allow DNS egress for all pods in the namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-dns, namespace: payments }
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
  - to:
    - namespaceSelector: { matchLabels: { kubernetes.io/metadata.name: kube-system } }
      podSelector: { matchLabels: { k8s-app: kube-dns } }
    ports: [{ protocol: UDP, port: 53 }, { protocol: TCP, port: 53 }]
# 3. api ingress from web/frontend on 8080 + api egress to postgres pods on 5432
#    (see the topic example) and postgres ingress from api on 5432.

Verify:
kubectl -n web exec deploy/frontend -- nc -zv payments-api.payments 8080   # succeeds
kubectl -n web exec deploy/other    -- nc -zv payments-api.payments 8080   # times out
kubectl -n payments exec deploy/payments-api -- nc -zv example.com 443     # times out (egress denied)
Note: policies are additive (union of allows); there is no "deny" rule in the core API -
use Calico/Cilium policies for explicit deny and FQDN egress rules.`
    },
    {
      t: 'Debug: instances in a subnet can initiate connections but never get responses',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Security groups allow outbound 443 and look fine.</li><li>Check the subnet NACL inbound rules: are ephemeral return ports allowed?</li><li>Use VPC Flow Logs: look for REJECT on inbound packets with destination ports 32768–60999.</li></ul>`,
      solution: `Flow logs show: ACCEPT outbound 10.20.1.15:43122 -> 52.94.1.10:443, then
REJECT inbound 52.94.1.10:443 -> 10.20.1.15:43122.
The NACL is stateless: its inbound rules only allow 22/443, so responses to the instance's
ephemeral source ports are dropped. Security groups (stateful) were never the problem.

Fix: add NACL inbound rule "allow TCP 1024-65535 from 0.0.0.0/0" (or narrow to required
destinations) - Linux uses 32768-60999, Windows 49152-65535, NAT gateways 1024-65535.
Similarly ensure outbound NACL rules allow ephemeral ports for responses to inbound connections.`
    },
    {
      t: 'Design network segmentation for a PCI-scoped payment service',
      d: 'medium',
      type: 'design',
      hint: `<ul><li>Minimise PCI scope: isolate the cardholder data environment (CDE).</li><li>Separate accounts/VPCs, controlled connectivity, no direct Internet egress from CDE.</li><li>Encryption in transit everywhere, logging, admin access without bastions.</li></ul>`,
      solution: `- Dedicated AWS account + VPC for the CDE (tokenisation service + vault DB); everything else
  stays out of PCI scope by only handling tokens.
- Exposure: tokenisation API published to other VPCs via PrivateLink (service-level, no
  routing between VPCs, no CIDR overlap concerns).
- Subnets: private app subnets + isolated data subnets (no route to IGW/NAT). Egress only via
  an egress proxy / Network Firewall with FQDN allow-list (payment processor endpoints).
- Security groups: app SG <- PrivateLink endpoint; DB SG <- app SG on 5432; nothing else.
- Encryption: TLS 1.2+ (1.3 preferred) from clients, mTLS between CDE services, KMS-encrypted
  storage, HSM/KMS for card data keys.
- Edge: WAF on the public payment page/API, DDoS protection.
- Access: no SSH; SSM Session Manager with MFA and session logging; break-glass roles.
- Monitoring: VPC Flow Logs, Network Firewall logs, CloudTrail to an isolated log account;
  alert on any new route/SG change in the CDE.`
    },
    {
      t: 'Explain a DNS amplification DDoS attack and its mitigations',
      d: 'medium',
      type: 'concept',
      hint: `<ul><li>Why UDP? Why spoofed source IPs? What is the amplification factor?</li><li>Who can mitigate: ISPs, reflector operators, victims?</li><li>What should you never deploy yourself?</li></ul>`,
      solution: `Attack:
1. Botnet sends small DNS queries (~60 B) with the SOURCE IP spoofed to the victim's IP,
   asking open resolvers for large answers (ANY, DNSSEC-signed TXT/DNSKEY records).
2. Resolvers send big responses (~3-4 KB) to the victim: ~50x amplification; thousands of
   reflectors => Tbps toward the victim, with traffic coming from legitimate DNS servers.
Mitigation:
- Network ecosystem: BCP 38 / uRPF ingress filtering so ISPs drop spoofed packets.
- Reflector operators: no open resolvers; response rate limiting (RRL); minimal ANY responses.
- Victim: anycast DDoS scrubbing (CDN, AWS Shield, Cloud Armor) absorbing the volume;
  upstream ACLs dropping UDP/53 responses not matching your own queries; RTBH as last resort.
- Your own services: never expose UDP services that reply bigger than the request without
  validation (QUIC's 3x limit is the model to follow).`
    },
    {
      t: 'Implement mutual TLS between a Go client and server',
      d: 'hard',
      type: 'coding',
      hint: `<ul><li>Create a private CA, a server cert with SAN <code>localhost</code>, and a client cert (openssl or cfssl).</li><li>Server: <code>tls.Config{ClientCAs: pool, ClientAuth: tls.RequireAndVerifyClientCert, MinVersion: tls.VersionTLS13}</code>.</li><li>Client: <code>RootCAs</code> + <code>Certificates</code>; never <code>InsecureSkipVerify</code>.</li><li>Read the verified client identity from <code>r.TLS.PeerCertificates</code> and authorise on it.</li></ul>`,
      solution: `# --- generate certificates (bash) ---
# openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -days 30 \\
#   -subj "/CN=demo-ca" -keyout ca-key.pem -out ca.pem
# openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -subj "/CN=localhost" \\
#   -keyout server-key.pem -out server.csr
# openssl x509 -req -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -days 30 \\
#   -extfile <(printf "subjectAltName=DNS:localhost") -out server.pem
# openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -subj "/CN=orders-client" \\
#   -keyout client-key.pem -out client.csr
# openssl x509 -req -in client.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -days 30 \\
#   -extfile <(printf "extendedKeyUsage=clientAuth") -out client.pem

package main

import (
    "crypto/tls"
    "crypto/x509"
    "fmt"
    "io"
    "log"
    "net/http"
    "os"
    "time"
)

func caPool() *x509.CertPool {
    pem, err := os.ReadFile("ca.pem")
    if err != nil {
        log.Fatal(err)
    }
    pool := x509.NewCertPool()
    if !pool.AppendCertsFromPEM(pem) {
        log.Fatal("bad CA PEM")
    }
    return pool
}

func server() {
    allowed := map[string]bool{"orders-client": true} // authorise verified identities
    srv := &http.Server{
        Addr: ":8443",
        TLSConfig: &tls.Config{
            MinVersion: tls.VersionTLS13,
            ClientCAs:  caPool(),
            ClientAuth: tls.RequireAndVerifyClientCert,
        },
        ReadHeaderTimeout: 5 * time.Second,
        Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            id := r.TLS.PeerCertificates[0].Subject.CommonName // SPIFFE: use cert.URIs
            if !allowed[id] {
                http.Error(w, "forbidden", http.StatusForbidden)
                return
            }
            fmt.Fprintf(w, "hello %s, TLS version %x\\n", id, r.TLS.Version)
        }),
    }
    log.Fatal(srv.ListenAndServeTLS("server.pem", "server-key.pem"))
}

func client() {
    cert, err := tls.LoadX509KeyPair("client.pem", "client-key.pem")
    if err != nil {
        log.Fatal(err)
    }
    c := &http.Client{
        Timeout: 5 * time.Second,
        Transport: &http.Transport{TLSClientConfig: &tls.Config{
            MinVersion:   tls.VersionTLS13,
            RootCAs:      caPool(),
            Certificates: []tls.Certificate{cert},
        }},
    }
    resp, err := c.Get("https://localhost:8443/")
    if err != nil {
        log.Fatal(err) // without a client cert: "tls: certificate required"
    }
    defer resp.Body.Close()
    body, _ := io.ReadAll(resp.Body)
    fmt.Print(string(body))
}

func main() {
    if len(os.Args) > 1 && os.Args[1] == "client" {
        client()
        return
    }
    server()
}`,
      lang: 'go'
    },
    {
      t: 'Design zero-trust access to replace the corporate VPN',
      d: 'hard',
      type: 'design',
      hint: `<ul><li>500 employees, 40 internal web apps, SSH to servers, a few legacy TCP apps; contractors with unmanaged laptops.</li><li>Components: IdP + MFA, device posture, identity-aware proxy/ZTNA connectors, policy engine, logging.</li><li>Migration plan without a big-bang cutover.</li></ul>`,
      solution: `Architecture
- IdP: Okta/Entra ID/Google with phishing-resistant MFA (WebAuthn), SCIM-provisioned groups.
- Device trust: MDM-enrolled devices carry device certificates; posture checks (OS version,
  disk encryption, EDR running) feed the policy engine.
- Access broker (Cloudflare Access / Google IAP / Zscaler ZPA / Tailscale):
  - Web apps: identity-aware reverse proxy; apps reachable only via outbound connectors
    (no inbound firewall holes); app validates the broker's signed JWT.
  - SSH: short-lived SSH certificates issued after SSO (Teleport / Cloudflare SSH / SSM),
    session recording; no static keys.
  - Legacy TCP apps: ZTNA client tunnels scoped per app (not per network).
- Policies per app: group + device posture + risk (geo, impossible travel). Contractors on
  unmanaged devices: browser-isolated access to a subset of web apps only.
- Logging: every access decision to SIEM; alerts on anomalies.
Migration
1. Inventory apps and owners; put the broker in front of low-risk web apps first (VPN still on).
2. Move SSH and admin tools; then legacy TCP apps.
3. Restrict the VPN to remaining exceptions, then decommission; remove broad network ACLs.
Success metrics: % apps behind ZTNA, VPN users -> 0, mean time to revoke access.`
    },
    {
      t: 'Mitigate an ongoing HTTP flood against the login endpoint',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>Characterise the traffic: IP diversity, ASNs, user agents, TLS fingerprints (JA3/JA4), request rate per IP and per account.</li><li>Immediate edge controls vs application changes.</li><li>Protect the expensive part (password hashing, DB) and avoid locking out real users.</li></ul>`,
      solution: `Triage (first 15 min)
- Dashboards: login RPS 50x normal, p99 latency up, CPU saturated by bcrypt/argon2.
- Edge analytics: 40k IPs (residential proxies), rotating user agents, a few TLS
  fingerprints (JA4) dominating, mostly invalid usernames => credential stuffing/flood.
Immediate mitigations (edge/WAF)
- Rate limit POST /login per IP (e.g. 5/min) and per username; stricter per ASN for
  hosting providers.
- Managed challenge (JS/Turnstile/CAPTCHA) for suspicious fingerprints and high bot scores.
- Block or challenge the dominant malicious JA4 fingerprints.
Application
- Cheap rejections before expensive work: validate input, check per-account/IP counters in
  Redis before hashing passwords; concurrency limit on the hashing pool (load shedding with
  503 + Retry-After rather than collapse).
- Uniform responses/timing for unknown users (no username enumeration).
- Breached-password checks; MFA/passkeys reduce payoff of stuffing.
Afterwards
- Permanent bot management on auth endpoints, alerting on login failure ratios, runbook
  updates, and a post-incident review.`
    },
    {
      t: 'Debug: site-to-site VPN shows "up" but traffic does not pass',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>"Tunnel up" only means the key exchange (IKE / WireGuard handshake) worked. Which packets are allowed <em>into</em> the tunnel?</li><li>Check routes on both sides, IPsec traffic selectors / WireGuard <code>AllowedIPs</code>, security groups/NACLs, NAT before encryption, and the return path.</li><li>Small pings work but SSH/HTTPS hangs: think MTU.</li><li>Capture on the inside and outside interfaces of each gateway.</li></ul>`,
      solution: `Walk the packet: host A -> route -> gateway A -> encrypt -> Internet -> gateway B -> decrypt
-> route -> host B, then the same in reverse.

1. Routing into the tunnel
   ip route get 10.20.5.10 on host A / the VPC route table: is 10.20.0.0/16 pointed at the
   VGW / TGW / wg0? AWS: route propagation enabled on the subnet route table?
2. What the tunnel accepts
   WireGuard: AllowedIPs on each peer must include the REMOTE subnet (cryptokey routing);
   packets from a source not in the peer's AllowedIPs are silently dropped on receive.
   wg show -> "latest handshake" recent but "transfer" counters not increasing = selector issue.
   IPsec: phase 2 traffic selectors / proxy IDs must mirror each other exactly
   (10.10.0.0/16 <-> 10.20.0.0/16 on both ends); a mismatch keeps IKE up but drops data.
3. Filters on both ends
   Security groups / NACLs (incl. ephemeral return ports), host firewalls, and forwarding
   (sysctl net.ipv4.ip_forward=1, source/destination check disabled on an EC2 VPN instance).
4. NAT and asymmetric return
   Traffic NATed before encryption no longer matches the selectors; replies routed out via
   the Internet gateway instead of back into the tunnel get dropped by stateful firewalls.
   tcpdump on gateway B's inside interface: requests arrive, replies never come back?
5. MTU
   ping works, TLS/SSH stalls after the handshake => tunnel overhead + blocked ICMP. Clamp MSS
   on the gateways and set the tunnel MTU (WireGuard 1420, IPsec ~1400 or lower).
6. Overlapping CIDRs between the sites route traffic locally instead of into the tunnel.
Fix whichever step fails, then verify with nc/curl in both directions and watch the tunnel
byte counters move.`
    }
  ],
  interviewFocus: [
    {
      q: 'Compare security groups and network ACLs in AWS. When do you use each?',
      a: `<table>
<thead><tr><th></th><th>Security group</th><th>Network ACL</th></tr></thead>
<tbody>
<tr><td>Scope</td><td>ENI / instance / pod (with SG for pods)</td><td>Subnet</td></tr>
<tr><td>State</td><td>Stateful (return traffic automatic)</td><td>Stateless (must allow return ephemeral ports)</td></tr>
<tr><td>Rules</td><td>Allow only; all rules evaluated</td><td>Allow and deny; evaluated in number order, first match wins</td></tr>
<tr><td>References</td><td>Can reference other SGs (identity-like grouping)</td><td>CIDRs only</td></tr>
<tr><td>Default</td><td>Deny inbound, allow outbound</td><td>Default NACL allows all</td></tr>
</tbody>
</table>
<p>Use <strong>security groups</strong> as the primary, fine-grained control (tier-to-tier with SG references). Use <strong>NACLs</strong> sparingly for coarse subnet-level guardrails: explicit denies of known-bad CIDRs, enforcing that a data subnet can never talk to the Internet. Remember NACL ephemeral port rules, or return traffic silently drops. Add AWS Network Firewall or an egress proxy for FQDN-based egress filtering and IDS/IPS.</p>`
    },
    {
      q: 'What is zero trust, and how would you implement it for service-to-service traffic in Kubernetes?',
      a: `<p>Zero trust removes implicit trust based on network location: every request must be authenticated and authorised based on identity and context, encrypted, and logged, with least privilege.</p>
<p>For service-to-service traffic in Kubernetes:</p>
<ol>
<li><strong>Workload identity</strong>: one service account per workload; SPIFFE IDs issued by the mesh CA or SPIRE; short-lived certificates rotated automatically.</li>
<li><strong>mTLS everywhere</strong>: service mesh (Istio ambient/sidecar, Linkerd, Cilium) in STRICT mode after a PERMISSIVE migration phase.</li>
<li><strong>Authorization</strong>: default-deny <code>AuthorizationPolicy</code>; allow specific source identities, methods and paths; for fine-grained rules, ext_authz to OPA.</li>
<li><strong>Network policy as defence in depth</strong>: default-deny NetworkPolicies so a compromised pod cannot even open connections outside its allowed flows; FQDN egress policies.</li>
<li><strong>Cloud access</strong>: workload identity federation (EKS Pod Identity / IRSA, GKE Workload Identity) instead of static keys.</li>
<li><strong>Observability</strong>: log every allow/deny decision; alert on denied flows and unexpected identities.</li>
</ol>`
    },
    {
      q: 'How does TLS protect against man-in-the-middle attacks, and how do real-world systems still get MITMed?',
      a: `<p>During the handshake the server proves possession of the private key for a certificate that chains to a trusted root and whose SAN matches the requested hostname; the ECDHE key exchange is signed, so an attacker who intercepts traffic (via ARP spoofing, DNS spoofing, BGP hijack or a rogue Wi-Fi AP) cannot complete the handshake as the server without a valid certificate for that name. TLS 1.3 also guarantees forward secrecy and authenticated encryption of all application data.</p>
<p>How MITM still happens:</p>
<ul>
<li>Applications disable verification (<code>InsecureSkipVerify: true</code>, trust-all trust managers) — common in internal tools and tests that leak into production.</li>
<li>Users click through certificate warnings; no HSTS, so SSL stripping works on the first HTTP request.</li>
<li>Attackers obtain a valid certificate: compromised/misbehaving CA, domain validation via hijacked DNS or BGP, or a compromised account at the DNS provider. Mitigate with CAA, CT log monitoring, DNSSEC, registry lock.</li>
<li>Enterprise TLS interception with a corporate root installed on devices (by design).</li>
<li>Endpoints are compromised (malware on the client or server sees plaintext).</li>
</ul>`
    },
    {
      q: 'Walk through DDoS protection for a public API from the edge to the application.',
      a: `<ol>
<li><strong>Edge network</strong>: anycast CDN/DDoS provider (Cloudflare, AWS Shield Advanced + CloudFront/Global Accelerator, Cloud Armor) absorbs volumetric and protocol attacks; origin unreachable except via the provider.</li>
<li><strong>Edge L7</strong>: WAF managed rules, per-key/IP/fingerprint rate limiting, bot management and challenges, geo/ASN rules during attacks, caching of whatever is cacheable.</li>
<li><strong>Load balancer / gateway</strong>: connection and request limits, timeouts, HTTP/2 stream limits, request size caps, per-tenant quotas.</li>
<li><strong>Application</strong>: cheap early rejection (auth before work), bounded concurrency and queue sizes, adaptive load shedding (return 503 fast instead of slowing down), timeouts on every dependency, circuit breakers.</li>
<li><strong>Capacity</strong>: autoscaling with sane maximums (attacks should not bankrupt you), headroom in databases, priority for critical traffic.</li>
<li><strong>Operations</strong>: traffic anomaly alerts, runbooks ("under attack" mode, emergency rules), provider escalation contacts, post-incident reviews.</li>
</ol>`
    }
  ],
  quiz: [
    { q: 'Are AWS security groups stateful or stateless? And NACLs?', a: 'Security groups are stateful; network ACLs are stateless.' },
    { q: 'Is NAT a security control?', a: 'Not really. Its stateful translation incidentally drops unsolicited inbound traffic, but proper security comes from a stateful firewall with default-deny; NAT does not inspect traffic and does not exist for IPv6.' },
    { q: 'Which IP protocol carries encrypted IPsec data, and which ports does IKE use?', a: 'ESP (IP protocol 50); IKE uses UDP 500, and UDP 4500 for NAT traversal.' },
    { q: 'What cryptographic primitives does WireGuard use?', a: 'Curve25519 for key exchange, ChaCha20-Poly1305 for encryption, BLAKE2s for hashing (Noise protocol framework); no cipher negotiation.' },
    { q: 'What are the three main DDoS attack classes?', a: 'Volumetric (bandwidth saturation, e.g. amplification), protocol (state exhaustion, e.g. SYN floods) and application-layer (L7 request floods, Slowloris).' },
    { q: 'What does TLS 1.3 remove compared with TLS 1.2?', a: 'Static RSA and non-ephemeral key exchange (forward secrecy is mandatory), non-AEAD/CBC ciphers, compression, renegotiation, and legacy hashes like SHA-1/MD5.' },
    { q: 'How does ARP spoofing work?', a: 'An attacker on the same LAN sends forged ARP replies mapping the gateway (or victim) IP to its own MAC, so traffic flows through the attacker.' },
    { q: 'What does HSTS protect against?', a: 'SSL stripping/downgrade to HTTP: browsers will only use HTTPS for the domain for max-age seconds (and from the first visit if preloaded).' },
    { q: 'What do the conntrack states NEW, ESTABLISHED, RELATED and INVALID mean in a stateful firewall?', a: 'NEW: first packet of a flow, checked against the rules. ESTABLISHED: packets of a flow already allowed (replies pass automatically). RELATED: packets tied to an existing flow such as ICMP errors. INVALID: packets matching no valid flow, usually dropped.' }
  ],
  resources: [
    { title: 'RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3', url: 'https://datatracker.ietf.org/doc/html/rfc8446', type: 'docs' },
    { title: 'Cloudflare Learning — What is a DDoS attack?', url: 'https://www.cloudflare.com/learning/ddos/what-is-a-ddos-attack/', type: 'article' },
    { title: 'Cloudflare Learning — What is Zero Trust security?', url: 'https://www.cloudflare.com/learning/security/glossary/what-is-zero-trust/', type: 'article' },
    { title: 'Cloudflare Learning — What is a WAF?', url: 'https://www.cloudflare.com/learning/ddos/glossary/web-application-firewall-waf/', type: 'article' }
  ]
},
// ───────────────────────────── Module 10 ─────────────────────────────
{
  n: 10,
  title: 'Troubleshooting & End-to-End Flow',
  summary: 'Puts everything together: the full "what happens when you type a URL and press Enter" walkthrough, the essential toolbox (ping, traceroute/mtr, dig, curl timings, ss, tcpdump/Wireshark, nc, openssl s_client, iperf3), a systematic layer-by-layer debugging method, and latency analysis across DNS, TCP connect, TLS and TTFB. This is where QA debugging instincts become a senior backend superpower.',
  topics: [
    {
      title: 'What Happens When You Type a URL and Press Enter',
      def: `<p>For <code>https://shop.example.com/cart</code>:</p>
<ol>
<li><strong>URL parsing &amp; browser checks</strong>: scheme, host, path. <strong>HSTS</strong> list forces HTTPS. Check service worker and HTTP cache (a fresh cached response may short-circuit everything). Reuse an existing connection to the origin if one is open (HTTP/2/3 coalescing).</li>
<li><strong>DNS</strong>: browser cache → OS cache/stub resolver (<code>/etc/hosts</code>) → recursive resolver (possibly DoH) → root → <code>.com</code> TLD → authoritative servers → CNAME to CDN → A/AAAA. An <strong>HTTPS record</strong> may advertise <code>h3</code> and ECH keys.</li>
<li><strong>Connection</strong>: Happy Eyeballs races IPv6 and IPv4. With HTTP/3: QUIC handshake over UDP 443 (1 RTT including TLS). Otherwise TCP 3-way handshake (1 RTT), SYN carries MSS/window scale/SACK options. Routing: ARP/NDP for the default gateway, NAT at the home router, ISP, BGP-chosen path, anycast to the nearest CDN PoP.</li>
<li><strong>TLS 1.3</strong>: ClientHello (SNI, ALPN <code>h2</code>/<code>http/1.1</code>, key share, supported ciphers) → ServerHello + encrypted certificate, CertificateVerify, Finished. The browser validates the chain, hostname (SAN), expiry, revocation/CT. 1 RTT (0-RTT on resumption).</li>
<li><strong>HTTP request</strong>: <code>GET /cart</code> with headers (Host/<code>:authority</code>, cookies, Accept-Encoding) as HPACK/QPACK-compressed HEADERS frames.</li>
<li><strong>Edge &amp; backend</strong>: CDN PoP (WAF, bot checks, cache lookup — cart is personalised so it misses/bypasses) → warm connection to origin load balancer → API gateway (authN, rate limit) → service (mesh mTLS hops) → cache/database → response.</li>
<li><strong>Response</strong>: status, headers (Cache-Control, Set-Cookie, CSP), compressed body streamed back through every hop.</li>
<li><strong>Rendering</strong>: parse HTML → DOM, CSS → CSSOM, run JS, discover subresources (images, scripts, fonts) that reuse the same connection or trigger new DNS/TLS for other origins; layout, paint, composite. Metrics: TTFB, FCP, LCP, INP.</li>
<li><strong>Afterwards</strong>: connection kept alive for reuse; cached resources stored per headers; session tickets saved for faster resumption.</li>
</ol>
<p>Scale the depth to the interviewer: a backend role wants detail on DNS, TCP/TLS, load balancing, gateways, services and caching; mention which steps dominate latency and where things fail.</p>`,
      interview: 'This is the most common networking interview question. Structure beats volume: browser checks, DNS, connection, TLS, HTTP, infrastructure path, response, rendering. Pause at each step to offer depth ("I can go deeper on TLS or the load balancing path") and tie in failure modes and latency costs.',
      examples: [
        { label: 'Watch most of the steps with one curl command', lang: 'text', code: `$ curl -sv -o /dev/null https://example.com/ 2>&1 | grep -E '^\\*|^> |^< ' | head -25
* Host example.com:443 was resolved.
* IPv6: 2001:db8:10::25          (addresses shown from documentation ranges)
* IPv4: 203.0.113.25
*   Trying [2001:db8:10::25]:443...            <- Happy Eyeballs tries IPv6 first
* Connected to example.com (2001:db8:10::25) port 443
* ALPN: curl offers h2,http/1.1
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* TLSv1.3 (IN), TLS handshake, Certificate (11):
* TLSv1.3 (IN), TLS handshake, CERT verify (15):
* TLSv1.3 (IN), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384 / X25519MLKEM768 / id-ecPublicKey
* ALPN: server accepted h2
* Server certificate:
*  subject: CN=example.com
*  subjectAltName: host "example.com" matched cert's "example.com"
> GET / HTTP/2
> Host: example.com
< HTTP/2 200
< cache-control: max-age=3600` }
      ]
    },
    {
      title: 'Connectivity Tools: ping, traceroute, mtr & nc',
      def: `<p><strong>ping</strong> sends ICMP Echo Requests: proves L3 reachability and measures RTT, jitter and loss. Caveats: ICMP is often blocked or deprioritised (cloud LBs, many firewalls), so "no ping" ≠ "host down". Use <code>ping -M do -s SIZE</code> for MTU tests.</p>
<p><strong>traceroute</strong> discovers the path by sending probes with increasing TTL (1, 2, 3…); each router that decrements TTL to 0 returns ICMP <em>Time Exceeded</em>, revealing itself. Linux defaults to UDP probes, Windows <code>tracert</code> uses ICMP; <code>traceroute -T -p 443</code> / <code>tcptraceroute</code> uses TCP SYNs to get through firewalls that allow only the service port. <code>* * *</code> means no reply for that hop (filtering/rate limiting), not necessarily a problem.</p>
<p><strong>mtr</strong> combines ping and traceroute continuously, showing loss and latency per hop. Reading it correctly is a senior skill:</p>
<ul>
<li>Loss at an intermediate hop that does <strong>not</strong> continue to later hops = that router rate-limits ICMP generation (control plane), not real forwarding loss. Ignore it.</li>
<li>Loss that starts at a hop and <strong>persists to the destination</strong> = real loss at or after that hop.</li>
<li>A latency jump that persists (e.g. +120 ms crossing an ocean) is geography; a jump at one hop only is ICMP deprioritisation.</li>
<li>Asymmetric routing: the return path may differ, so the problem may be on a path you cannot see — run mtr from both ends.</li>
</ul>
<p><strong>nc (netcat)</strong> is the TCP/UDP Swiss-army knife: <code>nc -zv host 5432</code> tests whether a port accepts connections (L4), <code>nc -l 9000</code> starts a listener to test reachability from the other side, and you can hand-type raw protocol requests (HTTP, Redis, SMTP). In Kubernetes, run these from a debug container (<code>kubectl debug</code> with the <code>nicolaka/netshoot</code> image).</p>`,
      interview: 'Explain the TTL mechanism behind traceroute and show you can read mtr without panicking over intermediate-hop loss. Interviewers like candidates who switch to TCP-based probes (nc, traceroute -T) because ICMP is commonly filtered.',
      examples: [
        { label: 'mtr report with ICMP rate limiting (not real loss)', lang: 'text', code: `$ mtr -rwzbc 100 api.example.com
HOST: laptop                         Loss%  Snt   Last   Avg  Best  Wrst StDev
  1. AS???  192.168.1.1               0.0%   100    1.1   1.3   0.9   4.2   0.4
  2. AS9829 10.150.0.1                0.0%   100    6.0   6.8   5.1  15.3   1.6
  3. AS9829 103.27.8.13              42.0%   100   18.2  19.1  17.9  31.0   2.0   <- ICMP rate limit
  4. AS6453 180.87.38.5               0.0%   100   19.4  20.0  18.8  27.1   1.4
  5. AS13335 162.158.226.1            0.0%   100   20.3  20.9  19.7  29.8   1.5
  6. AS13335 104.18.32.47             0.0%   100   20.1  20.6  19.5  25.2   1.0   <- destination: 0% loss

$ nc -zv -w 3 db.internal 5432
Connection to db.internal (10.20.128.15) 5432 port [tcp/postgresql] succeeded!` }
      ]
    },
    {
      title: 'DNS, HTTP & TLS Tools: dig, curl -v / -w, openssl s_client',
      def: `<p><strong>dig</strong> is the DNS tool of choice (<code>nslookup</code> is simpler and available on Windows). Key usages: <code>dig +short name</code>, <code>dig @8.8.8.8 name</code> (specific resolver), <code>dig +trace</code> (delegation path), <code>dig name AAAA/MX/TXT/CNAME</code>, <code>dig -x IP</code> (PTR), and inspecting <code>status:</code> (NOERROR/NXDOMAIN/SERVFAIL), flags (<code>aa</code>, <code>ad</code>, <code>tc</code>) and TTLs. Compare what different resolvers return to spot split-horizon or caching issues.</p>
<p><strong>curl</strong> for HTTP debugging:</p>
<ul>
<li><code>-v</code>: DNS result, connection, TLS handshake, request/response headers. <code>-I</code>: HEAD; <code>-sS -o /dev/null</code>: quiet body.</li>
<li><code>--resolve host:443:IP</code> / <code>--connect-to</code>: bypass DNS to hit a specific backend or LB while keeping the correct Host/SNI — invaluable for testing one node, a new LB, or before DNS cutover.</li>
<li><code>--http1.1 / --http2 / --http3</code>, <code>-H</code> custom headers, <code>-k</code> (never in production code).</li>
<li><code>-w</code> timings — the latency breakdown (all cumulative from start): <code>time_namelookup</code> (DNS), <code>time_connect</code> (TCP done), <code>time_appconnect</code> (TLS done), <code>time_pretransfer</code>, <code>time_starttransfer</code> (TTFB), <code>time_total</code>.</li>
</ul>
<p>Derive phases by subtraction: TCP = connect − namelookup; TLS = appconnect − connect; server processing ≈ starttransfer − pretransfer; transfer = total − starttransfer.</p>
<p><strong>openssl s_client</strong> debugs TLS directly: <code>openssl s_client -connect host:443 -servername host</code> shows the certificate chain, negotiated protocol and cipher, verification result and ALPN (<code>-alpn h2</code>). Use <code>-showcerts</code> to dump the chain (missing intermediates are a classic cause of failures on some clients only), and pipe to <code>openssl x509 -noout -dates -subject -ext subjectAltName</code> to check expiry and SANs. Forgetting <code>-servername</code> (SNI) returns the default certificate and misleads you.</p>`,
      interview: 'curl -w timing breakdown and --resolve are the two features that impress interviewers most; they show you can isolate DNS, connection, TLS and server time and test individual backends. For TLS issues, openssl s_client with -servername and -showcerts is the expected answer.',
      examples: [
        { label: 'Latency breakdown with curl -w', lang: 'bash', code: `$ cat > curl-timing.txt <<'EOF'
     dns:  %{time_namelookup}s\\n
 connect:  %{time_connect}s\\n
     tls:  %{time_appconnect}s\\n
    ttfb:  %{time_starttransfer}s\\n
   total:  %{time_total}s\\n
    code:  %{http_code}  proto: HTTP/%{http_version}  ip: %{remote_ip}\\n
EOF
$ curl -sS -o /dev/null -w @curl-timing.txt https://api.example.com/v1/health
     dns:  0.031s       -> DNS 31 ms
 connect:  0.072s       -> TCP 41 ms  (~1 RTT)
     tls:  0.118s       -> TLS 46 ms  (~1 RTT, TLS 1.3)
    ttfb:  0.402s       -> server ~284 ms  <- investigate the backend
   total:  0.405s
    code:  200  proto: HTTP/2  ip: 203.0.113.10

# Hit one specific backend while keeping Host + SNI correct
$ curl -sS -o /dev/null -w @curl-timing.txt --resolve api.example.com:443:10.0.5.21 https://api.example.com/v1/health` }
      ]
    },
    {
      title: 'Socket & Packet Inspection: ss, netstat, tcpdump & Wireshark',
      def: `<p><strong>ss</strong> (modern replacement for <code>netstat</code>) shows sockets from the kernel:</p>
<ul>
<li><code>ss -ltnp</code>: listening TCP sockets with owning process — "is anything listening on 8080, and on which address?" (<code>127.0.0.1:8080</code> is unreachable from other hosts/pods — a classic container bug; bind <code>0.0.0.0</code>).</li>
<li><code>ss -tan state established '( dport = :5432 )'</code>, <code>ss -s</code> summary, counts per state (TIME_WAIT/CLOSE_WAIT).</li>
<li><code>ss -tin</code>: per-connection TCP internals — rtt, cwnd, retransmits, congestion algorithm. <code>Recv-Q</code>/<code>Send-Q</code> on established sockets reveal slow readers or a stalled peer.</li>
<li>Also: <code>lsof -i :8080</code>, <code>nstat -az</code> for kernel counters (retransmits, listen overflows), <code>conntrack -S</code>.</li>
</ul>
<p><strong>tcpdump</strong> captures packets with BPF filters: <code>host</code>, <code>port</code>, <code>net</code>, <code>tcp[tcpflags] &amp; tcp-rst != 0</code>. Use <code>-nn</code> (no name/port resolution), <code>-i any</code>, <code>-w file.pcap</code> to save for Wireshark, <code>-s 0</code> full packets, <code>-A</code> to print ASCII payloads (plaintext HTTP). Capture on <em>both</em> ends when possible: comparing captures shows where packets are lost or modified (NAT, MSS clamping, RSTs injected by middleboxes).</p>
<p><strong>Wireshark</strong> decodes protocols and highlights problems. Useful display filters: <code>tcp.analysis.retransmission</code>, <code>tcp.analysis.zero_window</code>, <code>tcp.flags.reset == 1</code>, <code>tls.handshake.type == 1</code> (ClientHello, shows SNI), <code>dns.flags.rcode != 0</code>, <code>http.response.code &gt;= 500</code>. Statistics → Conversations / IO Graphs / TCP Stream Graphs visualise throughput and stalls. To decrypt TLS, export session keys from the client with <code>SSLKEYLOGFILE</code> (supported by browsers, curl and Go via <code>tls.Config.KeyLogWriter</code>) — never in production.</p>
<p>In Kubernetes: <code>kubectl debug -it pod/api --image=nicolaka/netshoot --target=api</code> shares the pod's network namespace; on nodes, <code>nsenter -t PID -n tcpdump</code> captures inside a container's namespace.</p>`,
      interview: 'Expect "how would you prove whether the problem is the network or the application?" The answer is packet captures at both ends plus socket stats: if the request arrives and the response leaves late, it is the app; if packets are retransmitted or reset in between, it is the network or a middlebox.',
      examples: [
        { label: 'Targeted captures', lang: 'bash', code: `# Only SYN and RST packets to/from the DB - connection setup problems at a glance
$ sudo tcpdump -i any -nn 'host 10.20.128.15 and port 5432 and tcp[tcpflags] & (tcp-syn|tcp-rst) != 0'
10:42:01.101 eth0 Out IP 10.20.1.15.51200 > 10.20.128.15.5432: Flags [S], seq 1, win 62727
10:42:01.102 eth0 In  IP 10.20.128.15.5432 > 10.20.1.15.51200: Flags [R.], seq 0, ack 2   <- refused

# Save a capture of one pod's traffic for Wireshark
$ kubectl debug -it pod/api-7d9c --image=nicolaka/netshoot --target=api -- \\
    tcpdump -i eth0 -nn -s 0 -w /tmp/api.pcap 'port 8080 or port 53'

# Who is listening, and on which address?
$ ss -ltnp | grep 8080
LISTEN 0 4096 127.0.0.1:8080 0.0.0.0:* users:(("api",pid=1,fd=7))   <- loopback only: bug in a container` }
      ]
    },
    {
      title: 'Throughput & Latency Analysis: iperf3, BDP & the Latency Budget',
      def: `<p><strong>iperf3</strong> measures raw network throughput between two hosts, isolating the network from your application: run <code>iperf3 -s</code> on one end and <code>iperf3 -c host -t 30</code> on the other; <code>-P 8</code> for parallel streams, <code>-R</code> for reverse direction, <code>-u -b 1G</code> for UDP (shows loss and jitter). If one stream is slow but 8 parallel streams fill the link, the bottleneck is <strong>per-flow</strong> (TCP window vs BDP, or a per-flow cap imposed by the provider) rather than link capacity.</p>
<p><strong>Cloud per-flow limits (AWS EC2)</strong> are a frequent surprise. A <em>flow</em> is one 5-tuple, i.e. one TCP connection:</p>
<ul>
<li>A single flow is limited to <strong>5 Gbit/s</strong> when the instances are <em>not</em> in the same cluster placement group, and up to <strong>10 Gbit/s</strong> between instances <em>inside</em> one cluster placement group.</li>
<li>The advertised instance bandwidth (e.g. "up to 25/50/100 Gbit/s") is an <strong>aggregate across many flows</strong> — you only reach it with parallel connections.</li>
<li><strong>ENA Express</strong> (SRD-based, supported instance types, same AZ) raises the single-flow limit to up to 25 Gbit/s and smooths tail latency.</li>
<li>Separate aggregate caps apply to traffic leaving the Region or going through an internet gateway (e.g. about half of the instance bandwidth on large instances, 5 Gbit/s on instances with fewer than 32 vCPUs), and instances also have pps and connection-tracking allowances — check <code>ethtool -S eth0 | grep allowance_exceeded</code>.</li>
</ul>
<p>So "one <code>scp</code> runs at 5 Gbit/s on a 25 Gbit/s instance" is expected, not a fault: parallelise (multipart uploads, multiple streams), use a placement group or ENA Express where it applies, and tune buffers for long-RTT paths.</p>
<p><strong>The latency budget of a single HTTPS request</strong> on a new connection:</p>
<table>
<thead><tr><th>Phase</th><th>Typical cost</th><th>Reduce by</th></tr></thead>
<tbody>
<tr><td>DNS</td><td>0 ms (cached) – 100+ ms (cold, distant resolver)</td><td>Caching, nearby resolvers, NodeLocal DNSCache, sane TTLs, fix ndots</td></tr>
<tr><td>TCP connect</td><td>1 RTT</td><td>Connection reuse/pools, edge termination (CDN)</td></tr>
<tr><td>TLS</td><td>1 RTT (TLS 1.3) / 2 RTT (TLS 1.2); + cert chain size</td><td>TLS 1.3, resumption, ECDSA certs and short chains, QUIC (merged with connect)</td></tr>
<tr><td>Request → TTFB</td><td>1 RTT + server time</td><td>Profiling the backend, caching, fewer serial downstream calls</td></tr>
<tr><td>Transfer</td><td>size / throughput; several RTTs during slow start</td><td>Compression, smaller payloads, reuse warm connections</td></tr>
</tbody>
</table>
<p>Rules of thumb: same-AZ RTT ~0.1–0.5 ms, cross-AZ ~0.5–2 ms, cross-continent 70–250 ms. Light in fibre travels ~200 km per ms, so physics sets a floor (Mumbai ↔ Virginia ≈ 13,000 km → ≥ 130 ms RTT). With per-request round trips dominating, the biggest wins are fewer round trips (reuse, batching, HTTP/2/3, edge termination) rather than more bandwidth.</p>
<p>For services, analyse percentiles (p50/p99/p99.9) not averages; tail latency often comes from retransmission timeouts (min RTO 200 ms on Linux), DNS timeouts (5 s), connection pool exhaustion, GC pauses or CPU throttling — check the network counters (<code>nstat</code> retransmits) before blaming the network.</p>`,
      interview: 'Quantify. Interviewers like candidates who can say "that is 3 RTTs at 80 ms = 240 ms before the first byte; reuse and TLS 1.3 cut it to 1 RTT". Also distinguish link capacity (iperf with parallel streams) from per-flow limits: BDP/window, and cloud caps such as AWS limiting one 5-tuple flow to 5 Gbit/s outside a cluster placement group (10 Gbit/s inside one) while instance bandwidth is an aggregate across flows.',
      examples: [
        { label: 'iperf3: single stream vs parallel streams', lang: 'text', code: `$ iperf3 -c 10.50.0.20 -t 20                # us-east-1 -> eu-west-1 over peering, RTT 75 ms
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-20.00  sec   1.02 GBytes   438 Mbits/sec   212   sender

$ iperf3 -c 10.50.0.20 -t 20 -P 8
[SUM]   0.00-20.00  sec   8.91 GBytes  3.83 Gbits/sec   1310   sender

Single flow limited by window/RTT (BDP = 5 Gbit/s x 75 ms = ~47 MB needed in flight).
Even with perfect tuning, one flow could not exceed AWS's 5 Gbit/s single-flow cap
(10 Gbit/s only inside a cluster placement group), and inter-region traffic has its own
aggregate cap - parallel streams are how instance bandwidth is reached.
Fix: raise tcp_rmem/tcp_wmem max, use BBR, or parallelise transfers (multipart).` }
      ]
    },
    {
      title: 'Systematic Layer-by-Layer Debugging',
      def: `<p>Random poking wastes hours. Use a method:</p>
<ol>
<li><strong>Define the symptom precisely</strong>: who (all users? one region? one pod?), what (error text, status code, latency percentile), since when (correlate with deploys, config, certificate expiry, traffic changes), and is it intermittent?</li>
<li><strong>Read the error literally</strong> — it tells you the layer:
<ul>
<li><code>no such host</code> / NXDOMAIN / SERVFAIL → DNS.</li>
<li><code>connection timed out</code> (SYN unanswered) → routing, firewall/SG/NACL/NetworkPolicy DROP, host down, wrong IP.</li>
<li><code>connection refused</code> (RST to SYN) → host reachable, nothing listening on that port/address (or REJECT rule).</li>
<li><code>no route to host</code> → ICMP unreachable / ARP failure.</li>
<li><code>connection reset by peer</code> (RST mid-stream) → process crash, idle timeout on LB/NAT, proxy limits, conntrack drops.</li>
<li><code>x509: certificate signed by unknown authority</code> / hostname mismatch / expired → TLS.</li>
<li>HTTP <code>502/503/504</code> → proxy-to-upstream problems; <code>4xx</code> → request/auth.</li>
</ul></li>
<li><strong>Walk the layers</strong> (bottom-up when nothing works, top-down when one feature fails, or split in half): DNS (<code>dig</code>) → L3 reachability (<code>ping</code>, <code>ip route get</code>, <code>mtr</code>) → L4 port (<code>nc -zv</code>, <code>ss -ltn</code> on the server) → TLS (<code>openssl s_client</code>) → HTTP (<code>curl -v --resolve</code>) → application logs/traces.</li>
<li><strong>Compare working vs failing</strong>: another pod, node, AZ, client, protocol (IPv4 vs IPv6), payload size (MTU!). The difference is the clue.</li>
<li><strong>Bisect the path</strong>: test from the client, from the LB subnet, from the node, from inside the pod. Capture packets at each boundary.</li>
<li><strong>Change one thing at a time</strong>, write down findings, and confirm the fix with the same measurement that showed the problem.</li>
</ol>
<p><strong>Kubernetes path checklist</strong> (client → Service → pod): DNS name resolves? Service has <strong>endpoints</strong> (<code>kubectl get endpointslices</code> — empty means selector/label mismatch or no ready pods)? <code>targetPort</code> matches the container port? App listens on <code>0.0.0.0</code>? Readiness passing? NetworkPolicy allows the flow (including DNS egress)? kube-proxy/CNI healthy on the node? For external traffic: LB health checks, security groups, <code>externalTrafficPolicy</code>.</p>`,
      interview: 'Interviewers value method over tools. Narrate: clarify scope, read the error to pick the layer, verify each layer with one command, compare working vs failing, bisect the path. Knowing the exact meaning of refused vs timed out vs reset instantly narrows the search.',
      examples: [
        { label: 'Kubernetes "service unreachable" walk-through', lang: 'bash', code: `kubectl run tmp --rm -it --image=nicolaka/netshoot -- bash
dig +short orders.shop.svc.cluster.local          # 1. DNS -> 10.96.45.12 (ClusterIP)
nc -zv -w 3 orders.shop 8080                      # 2. L4 via Service: timed out?
kubectl -n shop get endpointslices -l kubernetes.io/service-name=orders   # 3. endpoints empty?
kubectl -n shop get svc orders -o jsonpath='{.spec.selector} {.spec.ports}'
kubectl -n shop get pods -l app=orders -o wide     # 4. labels match? Ready?
nc -zv -w 3 10.244.2.31 8080                       # 5. direct to pod IP: refused => app/port issue
kubectl -n shop exec deploy/orders -- ss -ltn      # 6. listening on 127.0.0.1 or wrong port?
kubectl -n shop get networkpolicy                  # 7. policy blocking ingress from tmp's namespace?
curl -sv http://orders.shop:8080/healthz           # 8. HTTP layer once L4 works` }
      ]
    }
  ],
  problems: [
    {
      t: 'Break down HTTPS request latency with curl -w',
      d: 'easy',
      type: 'hands-on',
      hint: `<ul><li>Create a <code>-w</code> format file with namelookup, connect, appconnect, pretransfer, starttransfer, total.</li><li>Compute DNS, TCP, TLS, server time and transfer by subtraction.</li><li>Run it twice, then against a distant region, then with <code>--http3</code>; explain the differences.</li></ul>`,
      solution: `curl -sS -o /dev/null -w 'dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} pre=%{time_pretransfer} ttfb=%{time_starttransfer} total=%{time_total}\\n' https://example.com/

Example: dns=0.028 tcp=0.110 tls=0.195 pre=0.195 ttfb=0.282 total=0.283
  DNS      = 28 ms
  TCP      = 110 - 28  = 82 ms   (~1 RTT -> RTT ~82 ms)
  TLS      = 195 - 110 = 85 ms   (~1 RTT -> TLS 1.3)
  server   = 282 - 195 = 87 ms   (1 RTT + ~5 ms processing)
  transfer = 283 - 282 = 1 ms
Second run: dns ~0 (cached). Distant region: every RTT-bound phase grows.
--http3: tcp and tls collapse into one QUIC handshake RTT.`
    },
    {
      t: 'Interpret traceroute and mtr output correctly',
      d: 'easy',
      type: 'concept',
      hint: `<ul><li>How does traceroute use TTL and ICMP Time Exceeded?</li><li>Hop 4 shows 60% loss but the destination shows 0%: is there a problem?</li><li>What do <code>* * *</code> lines mean? Why might UDP traceroute fail where TCP traceroute succeeds?</li></ul>`,
      solution: `- Probes are sent with TTL=1,2,3...; the router where TTL hits 0 drops the probe and returns
  ICMP Time Exceeded, revealing its address and RTT.
- Loss at an intermediate hop that does not persist to later hops = that router rate-limits or
  deprioritises generating ICMP replies (control plane). Forwarding is fine. Not a problem.
- Loss starting at hop N and persisting to the destination = real loss at/after hop N.
- "* * *" = no ICMP reply for that hop (filtered/rate-limited); harmless if later hops answer.
- Firewalls often drop UDP high ports (Linux default) or ICMP echo (Windows tracert) but allow
  TCP 443 -> use traceroute -T -p 443 or mtr --tcp -P 443.
- Remember asymmetric routing: run mtr from both ends.`
    },
    {
      t: 'Find which process owns a port and inspect its connections',
      d: 'easy',
      type: 'hands-on',
      hint: `<ul><li>Use <code>ss -ltnp</code>, <code>lsof -i :PORT</code>, <code>ss -tanp</code>.</li><li>Check the bind address (127.0.0.1 vs 0.0.0.0 vs ::).</li><li>Summarise connection states per remote peer.</li></ul>`,
      solution: `sudo ss -ltnp 'sport = :8080'          # LISTEN 0 4096 0.0.0.0:8080 users:(("api",pid=2412,fd=7))
sudo lsof -nP -iTCP:8080 -sTCP:LISTEN
sudo ss -tanp '( sport = :8080 )' | awk 'NR>1{print $1, $5}' | sort | uniq -c | sort -rn | head
#  120 ESTAB 10.0.1.4:51234 ...   (per-peer distribution)
ss -s                                   # overall summary by state
ss -tin '( sport = :8080 )' | head      # rtt, cwnd, retrans per connection
# Bind address matters: 127.0.0.1:8080 is reachable only from the same host/network namespace.`
    },
    {
      t: 'Explain what happens when you type a URL and press Enter',
      d: 'medium',
      type: 'concept',
      hint: `<ul><li>Structure: browser checks → DNS → connection (TCP/QUIC) → TLS → HTTP → infrastructure path → response → rendering.</li><li>For each step: what happens, what it costs, how it fails.</li><li>Tailor depth for a backend role: load balancers, gateways, caching, databases.</li></ul>`,
      solution: `1. Parse URL; HSTS forces https; check service worker / HTTP cache; reuse open connection?
2. DNS: browser cache -> OS -> recursive resolver (maybe DoH) -> root -> TLD -> authoritative;
   CNAME to CDN; A/AAAA (+ HTTPS record advertising h3). Failure: NXDOMAIN, SERVFAIL, timeouts.
3. Connect: Happy Eyeballs (IPv6/IPv4 race). QUIC (UDP 443) or TCP SYN/SYN-ACK/ACK; ARP for
   gateway, NAT at home router, BGP path, anycast to nearest PoP. Cost: 1 RTT.
4. TLS 1.3: ClientHello (SNI, ALPN, key share) -> ServerHello, cert, Finished; validate chain,
   SAN, expiry. Cost: 1 RTT (merged with QUIC handshake; 0-RTT on resumption).
5. HTTP/2 or /3 request: HEADERS frame with method, path, authority, cookies.
6. Edge: CDN WAF/bot checks, cache lookup (hit -> respond). Miss -> origin LB (L4/L7) ->
   API gateway (auth, rate limit) -> service (mesh mTLS) -> cache/DB -> response.
7. Response streams back; headers drive caching, cookies, security policies.
8. Browser: parse HTML/CSS, execute JS, fetch subresources (more DNS/TLS for third parties),
   layout/paint. Connection kept alive; TLS session ticket stored.
Mention typical latencies and failure modes at each step.`
    },
    {
      t: 'Capture and analyse a TLS handshake with tcpdump and Wireshark',
      d: 'medium',
      type: 'hands-on',
      hint: `<ul><li>Capture port 443 traffic while running curl with <code>SSLKEYLOGFILE</code> set.</li><li>In Wireshark, filter <code>tls.handshake</code>; find SNI, ALPN, cipher, certificate (encrypted in TLS 1.3!).</li><li>Load the key log file (Preferences → Protocols → TLS) to decrypt HTTP/2 frames.</li></ul>`,
      solution: `export SSLKEYLOGFILE=$HOME/tls-keys.log
sudo tcpdump -i any -nn -s 0 -w /tmp/tls.pcap 'tcp port 443 and host example.com' &
curl -s -o /dev/null --http2 https://example.com/
sudo kill %1

Wireshark:
- Filter tls.handshake.type == 1 -> ClientHello: SNI "example.com", ALPN h2/http1.1,
  supported_versions includes TLS 1.3, key_share x25519.
- ServerHello: selected TLS 1.3 + TLS_AES_256_GCM_SHA384. Certificate is ENCRYPTED in 1.3
  (unlike 1.2) - you only see it after decryption.
- Edit > Preferences > Protocols > TLS > (Pre)-Master-Secret log filename = tls-keys.log
  -> now HTTP/2 HEADERS/DATA frames are visible.
- Statistics > Flow Graph to visualise SYN, handshake and request timing (count RTTs).
Delete the key log afterwards; never enable SSLKEYLOGFILE in production.`
    },
    {
      t: 'Diagnose refused vs timed out vs reset vs no route to host',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>What packet (or lack of one) produces each error?</li><li>How long does each take to appear and why?</li><li>List likely causes for each in a cloud/Kubernetes environment and the next command you would run.</li></ul>`,
      solution: `connection refused  - SYN answered by RST immediately. Host reachable, nothing listening on
                      that IP:port (app down, wrong port, bound to 127.0.0.1), or firewall REJECT
                      with tcp-reset. Next: ss -ltnp on the server; check targetPort.
connection timed out - SYN never answered (Linux retries ~6 times ~= 2 min unless the client
                      sets a dial timeout). Security group/NACL/NetworkPolicy DROP, routing black
                      hole, host down, wrong IP. Next: ip route get, flow logs, tcpdump on both
                      ends, nc from a host in the same subnet.
no route to host    - ICMP host/net unreachable or ARP/NDP failure for the next hop; also
                      iptables REJECT with icmp-host-prohibited. Next: ip neigh, ip route.
connection reset by peer - RST on an established connection: process crashed/restarted, LB or
                      NAT idle timeout, conntrack entry dropped, server closed with unread data,
                      proxy max-requests/limits. Next: correlate with restarts, idle durations,
                      LB logs; tcpdump to see who sends the RST.
i/o timeout (Go)    - your own deadline/context expired; check which phase via httptrace.`
    },
    {
      t: 'Instrument a Go HTTP client with httptrace to report phase timings',
      d: 'medium',
      type: 'coding',
      hint: `<ul><li>Use <code>net/http/httptrace.ClientTrace</code> hooks: DNSStart/Done, ConnectStart/Done, TLSHandshakeStart/Done, GotConn, WroteRequest, GotFirstResponseByte.</li><li>Attach with <code>httptrace.WithClientTrace(ctx, trace)</code>.</li><li>Run two requests with one client to show connection reuse (no DNS/TCP/TLS on the second).</li></ul>`,
      solution: `package main

import (
    "crypto/tls"
    "fmt"
    "io"
    "net/http"
    "net/http/httptrace"
    "os"
    "time"
)

func timedGet(client *http.Client, url string) error {
    var start, dnsStart, connStart, tlsStart, wrote, firstByte time.Time
    var dns, conn, tlsDur time.Duration
    var reused bool

    trace := &httptrace.ClientTrace{
        DNSStart:          func(httptrace.DNSStartInfo) { dnsStart = time.Now() },
        DNSDone:           func(httptrace.DNSDoneInfo) { dns = time.Since(dnsStart) },
        ConnectStart:      func(_, _ string) { connStart = time.Now() },
        ConnectDone:       func(_, _ string, _ error) { conn = time.Since(connStart) },
        TLSHandshakeStart: func() { tlsStart = time.Now() },
        TLSHandshakeDone:  func(tls.ConnectionState, error) { tlsDur = time.Since(tlsStart) },
        GotConn:           func(i httptrace.GotConnInfo) { reused = i.Reused },
        WroteRequest:      func(httptrace.WroteRequestInfo) { wrote = time.Now() },
        GotFirstResponseByte: func() { firstByte = time.Now() },
    }

    req, err := http.NewRequest(http.MethodGet, url, nil)
    if err != nil {
        return err
    }
    req = req.WithContext(httptrace.WithClientTrace(req.Context(), trace))

    start = time.Now()
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    io.Copy(io.Discard, resp.Body) // drain so the connection can be reused
    resp.Body.Close()
    total := time.Since(start)

    fmt.Printf("%s %s reused=%v dns=%v tcp=%v tls=%v server=%v ttfb=%v total=%v\\n",
        resp.Proto, resp.Status, reused, dns, conn, tlsDur,
        firstByte.Sub(wrote), firstByte.Sub(start), total)
    return nil
}

func main() {
    url := "https://example.com/"
    if len(os.Args) > 1 {
        url = os.Args[1]
    }
    client := &http.Client{Timeout: 10 * time.Second}
    for i := 0; i < 2; i++ { // second request reuses the pooled connection
        if err := timedGet(client, url); err != nil {
            fmt.Println("error:", err)
            os.Exit(1)
        }
    }
}`,
      lang: 'go'
    },
    {
      t: 'Debug: a Kubernetes service is unreachable from another namespace',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>Work the path: DNS → Service ClusterIP → EndpointSlices → pod IP:port → process.</li><li>Test from a debug pod in the <em>caller's</em> namespace and from the target namespace.</li><li>Suspects: selector/label mismatch, targetPort, bind address, readiness, NetworkPolicy (ingress on target, egress on caller incl. DNS), short name vs FQDN across namespaces.</li></ul>`,
      solution: `From caller namespace (web):
  kubectl -n web run t --rm -it --image=nicolaka/netshoot -- bash
  dig +short orders                      # empty! short name resolves only in the caller's ns
  dig +short orders.shop.svc.cluster.local   # 10.96.45.12 -> use the FQDN / "orders.shop"
  nc -zv -w3 orders.shop 8080            # timed out

Service and endpoints:
  kubectl -n shop get endpointslices -l kubernetes.io/service-name=orders
  -> endpoints present and ready (selector OK)

Direct to pod from the same namespace (shop):
  kubectl -n shop run t2 --rm -it --image=nicolaka/netshoot -- nc -zv -w3 10.244.2.31 8080  # OK
From web namespace to the pod IP: timed out => something namespace-specific => NetworkPolicy.

  kubectl -n shop get networkpolicy -o yaml
  -> ingress allows only podSelector app=frontend WITHOUT a namespaceSelector, which matches
     pods in the shop namespace only.
Fix: add namespaceSelector { kubernetes.io/metadata.name: web } together with the podSelector
in the same "from" element (AND), verify, and also confirm the caller's egress policy allows
TCP 8080 to shop and UDP/TCP 53 to kube-dns.`
    },
    {
      t: 'Debug: p99 latency spikes on calls between two services',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>p50 is 5 ms, p99 jumps to 200 ms, 1 s or 5 s — the spike values are clues (min RTO 200 ms, SYN retry 1 s, DNS timeout 5 s).</li><li>Check retransmissions (<code>nstat</code>, <code>ss -ti</code>), conntrack drops, DNS latency, connection pool waits, CPU throttling.</li><li>Use httptrace / tracing spans to see which phase is slow.</li></ul>`,
      solution: `Map spike sizes to mechanisms:
  ~200 ms -> TCP retransmission timeout (min RTO 200 ms) after packet loss
  ~1 s / 3 s -> SYN retransmit (lost SYN or SYN-ACK, accept queue overflow)
  ~5 s   -> DNS resolver timeout (conntrack race, CoreDNS overload, ndots amplification)
  ~40 ms -> Nagle + delayed ACK
  irregular 100 ms multiples -> CPU throttling (CFS quota period 100 ms)

Investigate:
  nstat -az | grep -E 'TcpRetransSegs|TcpExtListenOverflows|TcpExtTCPTimeouts'
  conntrack -S | grep -E 'drop|insert_failed'; dmesg | grep conntrack
  ss -ti dst <peer> | grep -E 'retrans|rto'
  httptrace / OpenTelemetry spans: is the time in DNS, connect, TLS or server?
  cat /sys/fs/cgroup/cpu.stat (nr_throttled, throttled_usec) in the pod
  client pool metrics: waits for idle connections (MaxConnsPerHost too low?)

Typical fixes: NodeLocal DNSCache + ndots, larger accept backlog, raise CPU limits or remove
them, tune conntrack max, reuse connections, hedged requests for idempotent reads, and fix
the lossy hop/NIC (ENA allowance exceeded counters in AWS: ethtool -S eth0 | grep exceeded).`
    },
    {
      t: 'Debug: cross-region replication throughput far below link capacity',
      d: 'hard',
      type: 'debug',
      hint: `<ul><li>Measure with iperf3: one stream vs <code>-P 8</code>; note RTT.</li><li>Compute BDP and compare with socket buffer limits (<code>tcp_rmem</code>/<code>tcp_wmem</code>, <code>rmem_max</code>).</li><li>Check retransmissions, congestion control algorithm, per-flow limits, MTU across the path.</li></ul>`,
      solution: `Measure:
  iperf3 -c peer -t 30        -> 380 Mbit/s, RTT 90 ms (ping)
  iperf3 -c peer -t 30 -P 8   -> 2.9 Gbit/s  => per-flow limit, not link capacity
BDP for 5 Gbit/s at 90 ms = 5e9 * 0.09 / 8 = ~56 MB; tcp_rmem max = 6 MB =>
  max single-flow rate = 6 MB / 0.09 s = ~533 Mbit/s (matches).
Also check: ss -ti (cwnd small? retrans?), sysctl tcp_congestion_control (cubic suffers with
loss), path MTU (fragmentation/black hole), cloud limits: AWS caps one flow (5-tuple) at
5 Gbit/s outside a cluster placement group, and inter-region / internet-gateway traffic has
an aggregate cap (5 Gbit/s on instances with < 32 vCPUs) => even 8 streams cannot exceed
that, so check the instance size too (ethtool -S eth0 | grep allowance_exceeded).

Fixes:
  sysctl -w net.core.rmem_max=134217728 net.core.wmem_max=134217728
  sysctl -w net.ipv4.tcp_rmem='4096 87380 134217728' net.ipv4.tcp_wmem='4096 65536 134217728'
  sysctl -w net.core.default_qdisc=fq net.ipv4.tcp_congestion_control=bbr
  Use parallel streams in the replication tool (multipart/parallel transfers), compression,
  and verify again with iperf3 and the application's own throughput metrics.`
    },
    {
      t: 'Debug: TLS errors for some clients only after a certificate renewal',
      d: 'medium',
      type: 'debug',
      hint: `<ul><li>Browsers work; a Java/Go/Python service, an old Android device or curl in a slim container fails with "unknown authority" or "unable to get local issuer certificate".</li><li>Is the server sending the full chain (leaf + intermediates)? Browsers can fetch or cache missing intermediates; most libraries cannot.</li><li>Did the issuing CA hierarchy change (new intermediate or root)? Is the client's trust store old?</li><li>Check SNI, the SAN list and which IPs/LB listeners got the new certificate.</li></ul>`,
      solution: `Reproduce exactly what a strict client sees
  openssl s_client -connect api.example.com:443 -servername api.example.com -showcerts </dev/null
  -> "Verify return code: 21 (unable to verify the first certificate)" and only ONE cert in
     the chain => the intermediate is missing (server configured with the leaf only, e.g.
     cert.pem instead of fullchain.pem).
  openssl s_client ... | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
  for ip in $(dig +short api.example.com); do
    echo | openssl s_client -connect $ip:443 -servername api.example.com 2>/dev/null \\
      | openssl x509 -noout -enddate; done      # one LB node / region still on the old cert?

Common causes
1. Incomplete chain: browsers "fix" it via AIA fetching or cached intermediates; Go, Java,
   Python and curl do not. Fix: serve fullchain (leaf + intermediates, not the root).
2. New CA hierarchy (e.g. a new intermediate or a root the client does not trust yet):
   old Android/Java trust stores and minimal container images (missing ca-certificates)
   fail. Fix: update trust stores/base images; pick a chain with broad compatibility.
3. SNI-less clients get the default certificate of the listener (wrong name). Fix: send
   SNI (old clients, health checkers), or make the default cert cover them.
4. Hostname not in the SAN list of the new certificate (a SAN was dropped on renewal).
5. Some nodes/listeners still serve the old (now expired) certificate.
6. Clients pinning the old certificate or public key.
Prevention: automated renewal with fullchain, synthetic checks from strict clients (Go/curl
in a minimal image), alerting on expiry per endpoint/IP, and CT-log monitoring.`
    }
  ],
  interviewFocus: [
    {
      q: 'Users report the site is "slow". How do you find out where the time goes?',
      a: `<ol>
<li><strong>Scope it</strong>: all users or some (region, ISP, browser, logged-in)? All pages or some endpoints? Since when — any deploy or config change? Check RUM data (TTFB, LCP by geography) and synthetic checks.</li>
<li><strong>Split client-side vs server-side</strong>: if server-side latency metrics (p50/p99 per endpoint) are flat while RUM TTFB rose, look at the network/edge; if server metrics rose, look at the backend.</li>
<li><strong>Break down a request</strong>: <code>curl -w</code> / browser DevTools timing / Go <code>httptrace</code>: DNS, TCP, TLS, TTFB, download. Compare from several locations.
<ul>
<li>DNS slow → resolver/authoritative/TTL issues.</li>
<li>Connect/TLS slow → distance (no CDN/edge termination), packet loss, overloaded LB, large certificate chains, no resumption.</li>
<li>TTFB slow → backend: tracing spans show which service/DB call dominates.</li>
<li>Download slow → payload size, compression, throughput (loss, BDP).</li>
</ul></li>
<li><strong>Backend deep dive</strong>: distributed tracing to find the slow span; check saturation (CPU, throttling, connection pools, DB locks), GC, retries, and downstream timeouts.</li>
<li><strong>Network deep dive</strong>: retransmission counters, mtr for loss, LB metrics (surge queue, target latency), conntrack/NAT errors.</li>
<li>Fix, then verify with the same measurement; add an SLO alert so it is caught earlier next time.</li>
</ol>`
    },
    {
      q: 'An application in a pod cannot connect to a database outside the cluster. Walk me through your debugging.',
      a: `<ol>
<li><strong>Read the exact error</strong>: <code>no such host</code> (DNS), <code>i/o timeout</code> (packets dropped), <code>connection refused</code> (reached host, no listener), <code>reset</code>, TLS error, or authentication error (network is fine!).</li>
<li><strong>DNS from the pod</strong>: <code>dig db.internal.example.com</code> — private hosted zone visible from the VPC? CoreDNS forwarding correctly? ndots issues?</li>
<li><strong>L3/L4 from the pod</strong>: <code>nc -zv -w3 db-host 5432</code>. Then from the node itself (<code>kubectl debug node/...</code>). If the node works but the pod fails: NetworkPolicy egress, pod SNAT/masquerade configuration, or security groups for pods.</li>
<li><strong>Cloud network</strong>: DB security group allows the source? With SNAT the source is the <em>node</em> IP; with VPC CNI it is the <em>pod</em> IP — rules must match the right one. Route tables, NACL ephemeral ports, peering/Transit Gateway routes, overlapping CIDRs. VPC Flow Logs show ACCEPT/REJECT.</li>
<li><strong>TLS</strong>: <code>openssl s_client -starttls postgres -connect db:5432</code> to check certs/CA bundle in the image.</li>
<li><strong>Database side</strong>: max connections reached, <code>pg_hba.conf</code>/allow-lists, listening address.</li>
<li><strong>Packet capture</strong> on pod and node if still unclear: do SYNs leave? Do SYN-ACKs come back?</li>
</ol>`
    },
    {
      q: 'What metrics and signals would you monitor to detect network problems in a microservices platform?',
      a: `<ul>
<li><strong>Golden signals per hop</strong> (from mesh/LB/gateway): request rate, error rate by status/reason (e.g. Envoy response flags UF/UH/UT), latency percentiles; upstream connect failures and timeouts.</li>
<li><strong>TCP health</strong> (node exporter / eBPF): retransmission rate, RTO events, listen overflows/drops, resets sent/received, TIME_WAIT/CLOSE_WAIT counts, ephemeral port usage.</li>
<li><strong>Conntrack and NAT</strong>: conntrack usage vs max, insert failures, NAT gateway port allocation errors, idle timeouts.</li>
<li><strong>DNS</strong>: CoreDNS request rate, latency, SERVFAIL/NXDOMAIN ratios, cache hit rate, upstream errors; resolver throttling counters.</li>
<li><strong>Interfaces/cloud limits</strong>: NIC drops, bandwidth/pps allowance exceeded counters (AWS ENA <code>*_allowance_exceeded</code>), cross-AZ traffic volume (cost and latency).</li>
<li><strong>TLS</strong>: certificate expiry, handshake errors, mTLS failures.</li>
<li><strong>Edge</strong>: CDN hit ratio, edge vs origin latency, WAF blocks, DDoS events.</li>
<li><strong>Synthetics</strong>: blackbox probes (DNS, TCP, HTTP) from multiple regions and from inside the cluster.</li>
</ul>
<p>Tie alerts to SLOs (error budget burn) rather than raw thresholds, and keep dashboards that follow the request path so on-call can bisect quickly.</p>`
    },
    {
      q: 'How do you prove whether a problem is in the network or in the application?',
      a: `<p>Collect evidence at the boundary between them:</p>
<ul>
<li><strong>Packet captures on both ends</strong> of the suspect hop: if the request packet arrives at the server promptly and the response leaves late, the delay is in the application (or the host's CPU). If packets are retransmitted, never arrive, arrive reordered, or a RST appears that neither endpoint sent, it is the network or a middlebox.</li>
<li><strong>Socket statistics</strong>: <code>ss -ti</code> retransmits and RTT; growing <code>Recv-Q</code> on the server means the application is not reading fast enough (app problem); growing <code>Send-Q</code> with retransmissions means the network or peer is not accepting data.</li>
<li><strong>Isolated tests</strong>: <code>iperf3</code> or <code>nc</code> between the same hosts. If raw TCP is healthy while the app is slow, the network is likely fine.</li>
<li><strong>Tracing spans and server-side timing</strong> (<code>Server-Timing</code> header, access logs with upstream time): server processing vs total time reveals the split.</li>
<li><strong>Compare</strong>: same request from a host in the same subnet vs across AZs/regions; the difference isolates the path contribution.</li>
</ul>
<p>Presenting this evidence ends the "it's the network" / "it's the app" ping-pong between teams.</p>`
    }
  ],
  quiz: [
    { q: 'What does "connection refused" mean at the TCP level?', a: 'The SYN was answered with a RST: the host is reachable but nothing is listening on that IP and port (or a firewall REJECT rule sent a reset).' },
    { q: 'How does traceroute discover each hop?', a: 'It sends probes with increasing TTL; each router that decrements TTL to zero returns an ICMP Time Exceeded message, revealing its address and RTT.' },
    { q: 'In curl -w timings, how do you compute TLS handshake time?', a: 'time_appconnect minus time_connect.' },
    { q: 'What does curl --resolve do?', a: 'Overrides DNS for a host:port with a given IP while keeping the Host header and SNI unchanged - useful to test a specific backend or LB.' },
    { q: 'Why is openssl s_client -servername important?', a: 'It sends SNI; without it the server may present a default certificate, giving misleading results.' },
    { q: 'What Wireshark display filter shows TCP retransmissions?', a: 'tcp.analysis.retransmission' },
    { q: 'Why might a containerised app be unreachable even though it is running and listening?', a: 'It is bound to 127.0.0.1 instead of 0.0.0.0, so only connections from inside its own network namespace succeed.' },
    { q: 'What is a typical p99 latency spike of about 5 seconds often caused by in Kubernetes?', a: 'DNS resolver timeouts (default 5 s), e.g. from the conntrack race on parallel A/AAAA queries or overloaded CoreDNS.' },
    { q: 'An EC2 instance rated "up to 25 Gbit/s" moves a single scp at about 5 Gbit/s. Is something broken?', a: 'No. AWS limits a single flow (5-tuple) to 5 Gbit/s outside a cluster placement group (up to 10 Gbit/s inside one); instance bandwidth is an aggregate across flows. Use parallel streams, a placement group or ENA Express on supported instances.' }
  ],
  resources: [
    { title: 'High Performance Browser Networking — Primer on Latency and Bandwidth', url: 'https://hpbn.co/primer-on-latency-and-bandwidth/', type: 'book' },
    { title: 'MDN — How browsers work: navigation and page rendering', url: 'https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work', type: 'docs' },
    { title: 'Cloudflare Learning — What is latency?', url: 'https://www.cloudflare.com/learning/performance/glossary/what-is-latency/', type: 'article' },
    { title: 'RFC 792 — Internet Control Message Protocol (ICMP)', url: 'https://datatracker.ietf.org/doc/html/rfc792', type: 'docs' }
  ]
}
  ],
  flashcards: [
    { q: 'List the OSI layers from 1 to 7.', a: 'Physical, Data Link, Network, Transport, Session, Presentation, Application.', d: 1 },
    { q: 'What is the default TCP MSS on a 1500-byte MTU IPv4 path?', a: '1460 bytes (1500 - 20 IP - 20 TCP); 1448 with TCP timestamps.', d: 1 },
    { q: 'L4 vs L7 load balancer in one line each?', a: 'L4 balances connections using IPs/ports without parsing payloads; L7 terminates the connection, parses HTTP/gRPC and balances individual requests with content-based routing.', d: 1 },
    { q: 'What are the RFC 1918 private ranges?', a: '10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16.', d: 1 },
    { q: 'How many usable IPs does an AWS /20 subnet have?', a: '4091 (4096 minus the 5 addresses AWS reserves per subnet).', d: 2 },
    { q: 'Who holds TIME_WAIT and for how long on Linux?', a: 'The side that closes first (active closer), for 60 seconds (2 x MSL).', d: 2 },
    { q: 'What does a growing number of CLOSE_WAIT sockets mean?', a: 'The peer closed but the local application never called close() - a socket leak (in Go, often an unclosed resp.Body).', d: 2 },
    { q: 'How do you fix ephemeral port exhaustion to a single upstream?', a: 'Reuse connections (keep-alive pools, MaxIdleConnsPerHost), enable tcp_tw_reuse, widen ip_local_port_range, add destination/source IPs. Never tcp_tw_recycle.', d: 2 },
    { q: 'Flow control vs congestion control?', a: 'Flow control (rwnd) protects the receiver buffer; congestion control (cwnd: slow start, CUBIC, BBR) protects the network. In-flight data <= min(rwnd, cwnd).', d: 2 },
    { q: 'How does BBR differ from CUBIC?', a: 'CUBIC is loss-based (backs off on packet loss, fills buffers); BBR is model-based, pacing at estimated bottleneck bandwidth and min RTT, so it tolerates random loss and keeps queues short.', d: 3 },
    { q: 'Three key benefits of QUIC over TCP+TLS?', a: '1-RTT combined handshake (0-RTT resumption), independent streams without transport head-of-line blocking, and connection migration via connection IDs.', d: 2 },
    { q: 'Does HTTP/2 eliminate head-of-line blocking?', a: 'Only at the HTTP layer. A lost TCP segment still stalls all streams on the connection; HTTP/3 over QUIC removes transport-level HOL blocking.', d: 2 },
    { q: 'Which HTTP methods are idempotent?', a: 'GET, HEAD, OPTIONS, PUT, DELETE (and TRACE). POST is not; PATCH is not guaranteed. Make POST retry-safe with an Idempotency-Key.', d: 1 },
    { q: '502 vs 504 at a gateway?', a: '502: the upstream returned an invalid response or the connection failed/reset. 504: the upstream did not respond before the gateway timeout.', d: 1 },
    { q: 'Cache-Control no-cache vs no-store?', a: 'no-cache: may be stored but must be revalidated before every use. no-store: must never be stored.', d: 1 },
    { q: 'What triggers a CORS preflight request?', a: 'Non-simple requests: methods other than GET/HEAD/POST, non-safelisted headers such as Authorization, or Content-Type like application/json. The browser sends OPTIONS first.', d: 2 },
    { q: 'What is the DNS resolution chain on a cold cache?', a: 'Stub resolver -> recursive resolver -> root server -> TLD server -> authoritative server; answers cached per TTL at each layer.', d: 1 },
    { q: 'Why is a CNAME not allowed at the zone apex?', a: 'A CNAME must be the only record at its name, but the apex needs SOA and NS records. Use ALIAS/ANAME/CNAME flattening.', d: 2 },
    { q: 'How long is an NXDOMAIN cached?', a: 'For the lower of the SOA record TTL and the SOA minimum field (RFC 2308 negative caching).', d: 2 },
    { q: 'What problem does ndots:5 cause in Kubernetes pods?', a: 'External names with fewer than 5 dots are first tried with every search domain (A and AAAA each), multiplying DNS queries and latency. Use FQDNs with a trailing dot, lower ndots, or NodeLocal DNSCache.', d: 3 },
    { q: 'Why use consistent hashing in a load balancer or cache tier?', a: 'Adding or removing a node remaps only about 1/N of keys (vs almost all with hash mod N), preserving cache affinity. Virtual nodes smooth distribution; bounded-load variants handle hot keys.', d: 2 },
    { q: 'What is the power of two choices algorithm and why is it good?', a: 'Pick two random backends and use the less loaded. It gives near-optimal balance and avoids herding when many LB instances have stale load views (Envoy LEAST_REQUEST default).', d: 3 },
    { q: 'How do you avoid 502s during Kubernetes rolling updates?', a: 'preStop sleep so endpoints are removed before shutdown, graceful shutdown on SIGTERM (http.Server.Shutdown), adequate terminationGracePeriodSeconds, readiness gates, LB deregistration delay, maxUnavailable 0.', d: 2 },
    { q: 'TLS termination vs passthrough vs re-encryption?', a: 'Termination: LB decrypts, plaintext to backends. Passthrough: L4 forwards encrypted bytes, backend terminates. Re-encryption: LB terminates then opens new TLS/mTLS to the backend.', d: 2 },
    { q: 'What is Direct Server Return (DSR)?', a: 'The LB forwards only inbound packets; backends own the VIP on a loopback and reply directly to clients, saving LB bandwidth. L4 only.', d: 3 },
    { q: 'API gateway vs service mesh?', a: 'Gateway: north-south, consumer-aware (auth, quotas, transformation, versioning). Mesh: east-west, workload identity, mTLS, retries, telemetry between services.', d: 2 },
    { q: 'What are ztunnel and waypoint in Istio ambient mode?', a: 'ztunnel: per-node L4 proxy providing mTLS (HBONE) and L4 policy for all pods. Waypoint: optional Envoy proxy adding L7 features per namespace or service account.', d: 3 },
    { q: 'What is CDN origin shielding?', a: 'All edge misses go through one designated tier/PoP, so the origin sees roughly one request per object instead of one per PoP; combine with request collapsing.', d: 2 },
    { q: 'Security group vs network ACL in AWS?', a: 'Security groups: stateful, ENI-level, allow-only, can reference other SGs. NACLs: stateless, subnet-level, allow and deny, ordered rules, need ephemeral port rules for return traffic.', d: 1 },
    { q: 'Which curl -w variables give DNS, TCP, TLS and TTFB?', a: 'time_namelookup (DNS), time_connect (TCP done), time_appconnect (TLS done), time_starttransfer (TTFB); all cumulative from the start, so subtract to get each phase.', d: 2 },
    { q: 'Besides TTL and the IPv4 checksum, what can change in a packet along the path?', a: 'DSCP can be re-marked, ECN set to CE by a congested router, addresses/ports rewritten by NAT, IPv4 packets fragmented if DF is clear, and the TCP MSS option clamped by middleboxes. The L2 header changes every hop.', d: 2 },
    { q: 'What single-flow throughput limit does AWS EC2 apply?', a: 'One flow (5-tuple) is capped at 5 Gbit/s outside a cluster placement group and up to 10 Gbit/s inside one; instance bandwidth is an aggregate across flows. ENA Express raises single-flow limits on supported instances.', d: 2 },
    { q: 'What are the four DHCP messages and what follows before the first packet leaves the subnet?', a: 'Discover, Offer, Request, Ack (DORA, UDP 67/68). The host then ARPs for its default gateway MAC (and may send gratuitous ARP / ARP probe to detect duplicates).', d: 1 },
    { q: 'Which BBR version does mainline Linux ship as tcp_bbr?', a: 'Historically BBRv1. BBRv3 (loss- and ECN-aware, fairer to CUBIC) runs at Google and is specified in the IETF CCWG draft, but is out-of-tree; check your kernel before assuming v3 behaviour.', d: 3 },
    { q: 'Why might a domain return SERVFAIL only for some users after a DNS provider migration?', a: 'DNSSEC: the parent still publishes a DS for the old provider key, so validating resolvers reject the new signatures; non-validating resolvers still work. dig +cd confirms a validation failure.', d: 3 },
    { q: 'What does hybrid post-quantum key exchange in TLS 1.3 mean today?', a: 'The key share combines classical X25519 with ML-KEM-768 (X25519MLKEM768), on by default in current browsers, major CDNs and Go 1.24+. It protects against harvest-now-decrypt-later; certificates are still classical.', d: 3 },
    { q: 'Gateway API maturity in one line?', a: 'Gateway, GatewayClass, HTTPRoute, ReferenceGrant GA since v1.0; GRPCRoute and GAMMA mesh support Standard since v1.1; BackendTLSPolicy Standard since v1.4; TCPRoute/UDPRoute still Experimental.', d: 2 },
    { q: 'What makes WireGuard routing different from a normal VPN?', a: 'Cryptokey routing: each peer public key is bound to AllowedIPs. Outbound, the destination IP selects the peer; inbound, packets whose inner source is not in that peer AllowedIPs are dropped.', d: 3 }
  ]
});
