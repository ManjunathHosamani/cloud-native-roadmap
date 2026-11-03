// Interactive labs attached to topics. Widgets are implemented in js/widgets.js.
'use strict';

registerDiagram({
  id: 'lab-cidr', roadmap: 'networking', module: 2, topic: 'CIDR & Subnetting (Worked Examples)', kind: 'widget', widget: 'cidr',
  title: 'Subnet calculator: see the network and host bits',
  desc: 'Type any IPv4 CIDR to see its range, mask and usable hosts, then split it into smaller subnets the way you would when planning a VPC.',
  config: { cidr: '192.168.10.0/24', split: 4 },
});
registerDiagram({
  id: 'lab-cidr-cloud', roadmap: 'cloud', module: 4, topic: 'VPC / VNet Fundamentals and CIDR Planning', kind: 'widget', widget: 'cidr',
  title: 'Plan a VPC: carve a /16 into subnets',
  desc: 'Split the VPC range into per-AZ public and private subnets. Remember that AWS and Azure reserve 5 addresses in every subnet.',
  config: { cidr: '10.0.0.0/16', split: 8 },
});
registerDiagram({
  id: 'lab-hashring', roadmap: 'system-design', module: 4, topic: 'Consistent Hashing with Virtual Nodes', kind: 'widget', widget: 'hashring',
  title: 'Consistent hashing ring vs hash % N',
  desc: 'Add and remove servers and count how many keys move. Then raise the number of virtual nodes and watch the load even out.',
  config: { vnodes: 1 },
});
registerDiagram({
  id: 'lab-hashring-storage', roadmap: 'storage', module: 6, topic: 'Consistent Hashing, Partitioning and Rebalancing', kind: 'widget', widget: 'hashring',
  title: 'Rebalancing with a hash ring',
  desc: 'Adding a storage node should move only about 1/N of the data. Compare that with naive hash % N partitioning.',
  config: { vnodes: 4 },
});
registerDiagram({
  id: 'lab-rate-limiter', roadmap: 'system-design', module: 7, topic: 'Rate Limiting Algorithms', kind: 'widget', widget: 'rate-limiter',
  title: 'Rate limiter playground: token bucket vs windows',
  desc: 'Send single requests and bursts against each algorithm and see which ones are allowed and why.',
  config: { algo: 'token', limit: 5, window: 5 },
});
registerDiagram({
  id: 'lab-jwt', roadmap: 'security', module: 4, topic: 'JWT, JWS and JWE Structure', kind: 'widget', widget: 'jwt',
  title: 'JWT decoder and HS256 signature check',
  desc: 'Decode the three parts of a JWT, check its claims, then tamper with the payload and watch the signature check fail. The sample secret is "demo-secret".',
  config: {},
});
registerDiagram({
  id: 'lab-lru', roadmap: 'system-design', module: 3, topic: 'Eviction Policies: LRU, LFU, TTL and Friends', kind: 'widget', widget: 'lru',
  title: 'LRU vs LFU eviction, step by step',
  desc: 'Call get and put on keys and watch the recency or frequency order and which key gets evicted. Try the scan button in both modes.',
  config: { capacity: 3 },
});
registerDiagram({
  id: 'lab-lb', roadmap: 'networking', module: 6, topic: 'Load Balancing Algorithms', kind: 'widget', widget: 'lb',
  title: 'Load-balancing algorithms under a slow backend',
  desc: 'Requests take time to finish, so active connections build up. Mark a backend slow and compare how each algorithm spreads the load.',
  config: { algo: 'rr' },
});
registerDiagram({
  id: 'lab-quorum', roadmap: 'system-design', module: 5, topic: 'Quorums, Consensus (Raft) & Leader Election', kind: 'widget', widget: 'quorum',
  title: 'Quorum reads and writes (N, W, R)',
  desc: 'Change N, W and R, fail replicas and see when reads are guaranteed to overlap the latest write.',
  config: { n: 3, w: 2, r: 2 },
});
registerDiagram({
  id: 'lab-quorum-storage', roadmap: 'storage', module: 6, topic: 'Quorum Reads and Writes', kind: 'widget', widget: 'quorum',
  title: 'Quorum calculator: R + W > N',
  desc: 'See which quorum settings survive replica failures and which ones can return stale data.',
  config: { n: 5, w: 3, r: 3 },
});
registerDiagram({
  id: 'lab-go-channel', roadmap: 'go', module: 5, topic: 'Channels: buffered/unbuffered', kind: 'widget', widget: 'go-channel',
  title: 'Go channel simulator: blocking, buffering and close',
  desc: 'Start sending and receiving goroutines against a channel and watch who blocks, where values wait, and what close() does.',
  config: { capacity: 0 },
});
registerDiagram({
  id: 'lab-hpa', roadmap: 'kubernetes', module: 7, topic: 'Pod Autoscaling: HPA, VPA & KEDA', kind: 'widget', widget: 'hpa',
  title: 'HPA calculator: how many replicas will I get?',
  desc: 'Enter the current replicas and metric to see the HPA formula, tolerance band, min/max clamping and scale-up/down behaviour.',
  config: { replicas: 4, metric: 90, target: 60 },
});
registerDiagram({
  id: 'lab-latency', roadmap: 'system-design', module: 1, topic: 'Latency Numbers Every Engineer Should Know', kind: 'widget', widget: 'latency',
  title: 'Latency numbers, to scale',
  desc: 'Compare cache, memory, disk and network latency on a log or linear scale, or translated into human time.',
  config: {},
});
registerDiagram({
  id: 'lab-latency-ca', roadmap: 'computer-architecture', module: 3, topic: 'The Memory Hierarchy & Latency Numbers', kind: 'widget', widget: 'latency',
  title: 'The memory hierarchy in numbers',
  desc: 'Each level of the hierarchy is roughly an order of magnitude slower than the one above it. Toggle human time to feel the gap.',
  config: {},
});
registerDiagram({
  id: 'lab-nines', roadmap: 'system-design', module: 1, topic: 'SLA, SLO, SLI and Availability Nines', kind: 'widget', widget: 'nines',
  title: 'Availability: nines, downtime and composite SLOs',
  desc: 'Turn an SLO into an error budget, then combine components in series and in parallel to see the availability of the whole request path.',
  config: { slo: 99.9 },
});
registerDiagram({
  id: 'lab-backoff', roadmap: 'system-design', module: 7, topic: 'Resilience Patterns: Timeouts, Retries, Circuit Breakers, Bulkheads', kind: 'widget', widget: 'backoff',
  title: 'Exponential backoff: why jitter matters',
  desc: 'Simulate many clients retrying after an outage. Switch between jitter strategies and watch the waves of retries flatten.',
  config: { mode: 'none' },
});
registerDiagram({
  id: 'lab-backoff-go', roadmap: 'go', module: 11, topic: 'Resilience: Timeouts, Retries, Circuit Breakers, Rate Limits, Idempotency', kind: 'widget', widget: 'backoff',
  title: 'Retry timing for a Go client: backoff + jitter',
  desc: 'Pick the retry strategy your Go client should use and see how it spreads load on a recovering dependency.',
  config: { mode: 'full' },
});
registerDiagram({
  id: 'lab-estimate', roadmap: 'system-design', module: 1, topic: 'Back-of-the-Envelope Estimation', kind: 'widget', widget: 'estimate',
  title: 'Back-of-the-envelope calculator',
  desc: 'Turn users and usage into QPS, storage and bandwidth, with the arithmetic shown so you can practise doing it out loud.',
  config: {},
});
registerDiagram({
  id: 'lab-raid', roadmap: 'storage', module: 3, topic: 'RAID Levels 0, 1, 5, 6 and 10', kind: 'widget', widget: 'raid',
  title: 'RAID visualiser: stripes, mirrors, parity and failures',
  desc: 'Pick a RAID level and disk count, see how blocks are laid out, then fail disks to find out when the array survives.',
  config: { level: 5, disks: 4, size: 8 },
});
