/* System Design (HLD & LLD) roadmap — see CONTRIBUTING.md for the schema. */
registerRoadmap({
  id: 'system-design',
  order: 60,
  title: 'System Design (HLD & LLD)',
  short: 'System Design',
  icon: '🏗️',
  color: '#A855F7',
  desc: 'Scalability, caching, data, distributed systems, classic HLD problems and low-level design in Go.',
  unit: 'Module',
  modules: [
    // ───────────────────────────── Module 1 ─────────────────────────────
    {
      n: 1,
      title: 'Foundations & Interview Framework',
      summary: 'How a system design interview is run and scored: a repeatable 4-step framework, crisp requirements, back-of-the-envelope math, latency intuition and the language of availability (SLA/SLO/SLI, nines). Everything later in the roadmap plugs into this skeleton.',
      topics: [
        {
          title: 'The 4-Step HLD Interview Framework',
          def: '<p>A 45–60 minute design round rewards <strong>structure and trade-off reasoning</strong>, not a memorised diagram. Use the same four steps every time and announce them so the interviewer can follow (and steer) you.</p>' +
            '<table><thead><tr><th>Step</th><th>Time</th><th>Output</th></tr></thead><tbody>' +
            '<tr><td>1. Requirements &amp; scope</td><td>~5–8 min</td><td>Functional features (3–5 max), non-functional targets (latency, availability, consistency, scale), explicit out-of-scope list</td></tr>' +
            '<tr><td>2. Estimation</td><td>~3–5 min</td><td>DAU, read/write QPS (avg + peak), storage over N years, bandwidth, cache size — only numbers that drive decisions</td></tr>' +
            '<tr><td>3. High-level design</td><td>~10–15 min</td><td>API (endpoints/RPCs), data model, box diagram: clients → LB/gateway → services → cache → DB/queue/blob store</td></tr>' +
            '<tr><td>4. Deep dives &amp; trade-offs</td><td>~15–20 min</td><td>2–3 hardest components (sharding key, hot keys, consistency, failure modes), bottlenecks, monitoring, evolution</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Senior signals:</strong> you drive the conversation, state assumptions out loud, quantify (&quot;~12K peak write QPS, so a single Postgres primary is fine for 2 years&quot;), offer two options and pick one with a reason, and proactively discuss failure (&quot;what happens when the cache cluster dies?&quot;).</p>' +
            '<p><strong>Anti-patterns:</strong> jumping to Kafka/Kubernetes before knowing requirements, designing for Google scale when the problem says 10K users, drawing 20 boxes without explaining data flow, and silence while thinking.</p>' +
            '<p>Coming from QA you already have a superpower: thinking in <em>failure modes and edge cases</em>. Use it explicitly in step 4.</p>',
          interview: 'Interviewers score four things: problem navigation (did you clarify and scope?), solution design (does it work end to end?), technical depth (can you go deep on 2-3 parts?) and communication. Say the framework out loud at the start, time-box each step, and always end deep dives with a bottleneck + mitigation.',
          examples: [{
            label: 'Whiteboard skeleton you can reuse',
            lang: 'text',
            code: [
              '1) REQUIREMENTS   FR: post, follow, feed      NFR: p99 < 200ms, 99.95%, eventual OK',
              '2) ESTIMATES      100M DAU, 1K write QPS, 100K read QPS, 5 TB/yr',
              '3) API + MODEL    POST /v1/posts  GET /v1/feed?cursor=   posts(id, user_id, ts, body)',
              '4) DIAGRAM',
              '   Client -> CDN -> LB -> API GW -> [Post Svc] -> Postgres (sharded by user_id)',
              '                                \\-> [Feed Svc] -> Redis (feed cache)',
              '                                          ^',
              '                       Kafka <- fan-out workers',
              '5) DEEP DIVES     celebrity fan-out, cache invalidation, shard hot spots',
              '6) WRAP-UP        monitoring (SLIs), failure modes, what changes at 10x'
            ].join('\n')
          }]
        },
        {
          title: 'Functional vs Non-Functional Requirements',
          def: '<p><strong>Functional requirements (FRs)</strong> describe <em>what</em> the system does: &quot;users can shorten a URL&quot;, &quot;users receive a push notification when mentioned&quot;. Keep them to the 3–5 features that define the core product and write them as user-facing verbs.</p>' +
            '<p><strong>Non-functional requirements (NFRs)</strong> describe <em>how well</em> it must do it. They drive almost every architectural choice:</p>' +
            '<table><thead><tr><th>NFR</th><th>Question to ask</th><th>Design impact</th></tr></thead><tbody>' +
            '<tr><td>Scale</td><td>DAU? read:write ratio? data growth?</td><td>Sharding, caching, replicas</td></tr>' +
            '<tr><td>Latency</td><td>p50/p99 target for the hot path?</td><td>Caches, CDNs, precomputation, async</td></tr>' +
            '<tr><td>Availability</td><td>How many nines? Multi-region?</td><td>Redundancy, failover, AP vs CP</td></tr>' +
            '<tr><td>Consistency</td><td>Can users see stale data? For how long?</td><td>Strong vs eventual, quorum, leader reads</td></tr>' +
            '<tr><td>Durability</td><td>Can we ever lose a write?</td><td>Replication factor, sync vs async, WAL</td></tr>' +
            '<tr><td>Security / compliance</td><td>PII? GDPR? PCI?</td><td>Encryption, data residency, audit logs</td></tr>' +
            '<tr><td>Cost</td><td>Budget constraints?</td><td>Tiered storage, cheaper consistency</td></tr>' +
            '</tbody></table>' +
            '<p>NFRs often <strong>conflict</strong>: strong consistency vs low latency across regions, durability vs write latency, freshness vs cache hit rate. Naming the conflict and choosing per feature (&quot;payments strongly consistent, likes count eventually consistent&quot;) is what separates senior answers.</p>' +
            '<p>Also capture <strong>out of scope</strong> items (auth, analytics, admin UI) so you do not get dragged into them.</p>',
          interview: 'Ask 4-6 targeted clarifying questions, then write FRs and NFRs on the board. A great move is to make NFRs measurable ("p99 read under 100 ms", "no lost payments") and to state per-feature consistency needs instead of one global choice.',
          examples: [{
            label: 'Requirements for a URL shortener',
            lang: 'text',
            code: [
              'Functional',
              '  - Create short URL for a long URL (optional custom alias, optional expiry)',
              '  - Redirect short URL -> long URL',
              '  - (stretch) click analytics',
              'Non-functional',
              '  - 100M new URLs/month, read:write = 100:1',
              '  - Redirect p99 < 50 ms, availability 99.99% (redirect path)',
              '  - Short codes must be unique and not guessable sequentially',
              '  - Eventual consistency OK for analytics, NOT for create -> redirect of same code',
              'Out of scope: user accounts, link-preview, spam detection'
            ].join('\n')
          }]
        },
        {
          title: 'Back-of-the-Envelope Estimation',
          def: '<p>Estimation shows you can reason about <strong>orders of magnitude</strong>. Round aggressively; precision is not the goal, decisions are (&quot;does this fit on one machine?&quot;).</p>' +
            '<p><strong>Powers of two / ten cheat sheet:</strong></p>' +
            '<table><thead><tr><th>Power</th><th>Approx</th><th>Unit</th></tr></thead><tbody>' +
            '<tr><td>2<sup>10</sup></td><td>1 thousand</td><td>1 KB</td></tr>' +
            '<tr><td>2<sup>20</sup></td><td>1 million</td><td>1 MB</td></tr>' +
            '<tr><td>2<sup>30</sup></td><td>1 billion</td><td>1 GB</td></tr>' +
            '<tr><td>2<sup>40</sup></td><td>1 trillion</td><td>1 TB</td></tr>' +
            '<tr><td>2<sup>50</sup></td><td>1 quadrillion</td><td>1 PB</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Core formulas:</strong></p>' +
            '<ul><li>1 day = 86,400 s ≈ <strong>10<sup>5</sup> s</strong>; so 1M requests/day ≈ 12 QPS, 1B/day ≈ 12K QPS.</li>' +
            '<li><strong>Avg QPS</strong> = DAU × actions per user per day / 86,400. <strong>Peak</strong> ≈ 2–3× average (10× for spiky events).</li>' +
            '<li><strong>Storage</strong> = writes/day × object size × retention days × replication factor (usually 3).</li>' +
            '<li><strong>Bandwidth</strong> = QPS × payload size (ingress for writes, egress for reads).</li>' +
            '<li><strong>Cache size</strong> ≈ 20% of daily read working set (80/20 rule).</li>' +
            '<li><strong>Servers</strong> ≈ peak QPS / per-server QPS (a typical stateless Go API node: 1K–10K simple RPS; a Postgres primary: ~5–20K simple writes/s on good hardware).</li></ul>' +
            '<p>Always write units, state assumptions, and then <em>interpret</em>: &quot;15 TB over 5 years — fits a sharded relational cluster; no need for exotic storage.&quot;</p>',
          interview: 'Do not spend more than 5 minutes. Interviewers care that you pick sensible assumptions, keep units straight, and use the numbers to justify a decision (sharding, caching, CDN). Say "roughly" and round to powers of ten.',
          examples: [{
            label: 'Twitter-like estimation worked out',
            lang: 'text',
            code: [
              'Assume 200M DAU, each posts 2 tweets/day, reads feed 20 times/day',
              'Write QPS  = 200M * 2 / 1e5      = 4,000/s   (peak ~10K/s)',
              'Read QPS   = 200M * 20 / 1e5     = 40,000/s  (peak ~100K/s)',
              'Tweet size = 300 B text + 200 B metadata = ~500 B',
              'Storage    = 400M tweets/day * 500 B = 200 GB/day',
              '             * 365 * 5 yrs ~= 365 TB, * 3 replicas ~= 1.1 PB',
              'Media      = 10% tweets with 1 MB image -> 40 TB/day -> blob store + CDN',
              'Egress     = 40K feed reads/s * 20 tweets * 500 B ~= 400 MB/s (text only)',
              'Conclusion: text in a sharded DB, media in object storage, feeds precomputed in cache'
            ].join('\n')
          }]
        },
        {
          title: 'Latency Numbers Every Engineer Should Know',
          def: '<p>These approximate numbers (popularised by Jeff Dean and Peter Norvig, refreshed for modern hardware) let you sanity-check designs: <em>is the network hop or the disk the real cost?</em></p>' +
            '<table><thead><tr><th>Operation</th><th>Approx latency</th></tr></thead><tbody>' +
            '<tr><td>L1 cache reference</td><td>~1 ns</td></tr>' +
            '<tr><td>Branch mispredict</td><td>~3–5 ns</td></tr>' +
            '<tr><td>L2 cache reference</td><td>~4–7 ns</td></tr>' +
            '<tr><td>Mutex lock/unlock (uncontended)</td><td>~20 ns</td></tr>' +
            '<tr><td>Main memory reference</td><td>~100 ns</td></tr>' +
            '<tr><td>Compress 1 KB (Snappy/zstd fast)</td><td>~2–3 µs</td></tr>' +
            '<tr><td>Send 1 KB over 1 Gbps network</td><td>~10 µs</td></tr>' +
            '<tr><td>Read 1 MB sequentially from memory</td><td>~10–50 µs (≈20–100 GB/s)</td></tr>' +
            '<tr><td>Random 4 KB read from NVMe SSD</td><td>~20–100 µs</td></tr>' +
            '<tr><td>Round trip within same datacenter / AZ</td><td>~0.5 ms</td></tr>' +
            '<tr><td>Read 1 MB sequentially from SSD</td><td>~0.2–1 ms</td></tr>' +
            '<tr><td>Cross-AZ round trip (same region)</td><td>~1–2 ms</td></tr>' +
            '<tr><td>HDD seek</td><td>~5–10 ms</td></tr>' +
            '<tr><td>Read 1 MB sequentially from HDD</td><td>~5–20 ms</td></tr>' +
            '<tr><td>Cross-continent round trip (US ↔ EU)</td><td>~80–150 ms</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Takeaways:</strong> a memory reference is ~5,000× faster than a same-DC network round trip; a same-DC hop costs ~0.5 ms so a request fanning out sequentially to 20 services pays ~10 ms just in hops; cross-region synchronous replication adds ~100 ms per write; sequential I/O beats random I/O (why Kafka and LSM-trees append); compress before sending over WAN.</p>',
          interview: 'You will rarely be asked to recite the table, but you will be asked "why is this slow?" or "can we do synchronous cross-region replication?". Quote the order of magnitude (memory ~100 ns, DC round trip ~0.5 ms, cross-continent ~100 ms) and derive the consequence.',
          examples: [{
            label: 'Latency budget for a 200 ms p99 API',
            lang: 'text',
            code: [
              'Client -> edge (TLS 1.3 resumed)     ~ 30 ms (user to nearest PoP)',
              'Edge -> region origin                 ~ 20 ms',
              'API gateway + auth (cached JWKS)      ~  2 ms',
              'Service -> Redis (same AZ) x2         ~  1 ms',
              'Service -> DB (indexed query)         ~  5 ms',
              'Fan-out to 3 services IN PARALLEL     ~ 15 ms (slowest wins)',
              'Serialization + business logic        ~  5 ms',
              '-----------------------------------------------',
              'Total ~ 80 ms p50; leave headroom for tail latency at p99'
            ].join('\n')
          }]
        },
        {
          title: 'SLA, SLO, SLI and Availability Nines',
          def: '<ul><li><strong>SLI</strong> (indicator): a measured ratio, e.g. <code>good requests / valid requests</code> where good = HTTP non-5xx and latency &lt; 300 ms.</li>' +
            '<li><strong>SLO</strong> (objective): internal target for an SLI over a window, e.g. 99.9% over 28 days. The remainder (0.1%) is the <strong>error budget</strong>.</li>' +
            '<li><strong>SLA</strong> (agreement): contractual promise to customers with penalties (credits). Always looser than the SLO so you breach the SLO first.</li></ul>' +
            '<table><thead><tr><th>Availability</th><th>Downtime / year</th><th>Downtime / 30 days</th><th>Downtime / day</th></tr></thead><tbody>' +
            '<tr><td>99% (two nines)</td><td>3.65 days</td><td>7.2 h</td><td>14.4 min</td></tr>' +
            '<tr><td>99.9%</td><td>8.76 h</td><td>43.2 min</td><td>1.44 min</td></tr>' +
            '<tr><td>99.95%</td><td>4.38 h</td><td>21.6 min</td><td>43 s</td></tr>' +
            '<tr><td>99.99%</td><td>52.6 min</td><td>4.3 min</td><td>8.6 s</td></tr>' +
            '<tr><td>99.999%</td><td>5.26 min</td><td>26 s</td><td>0.86 s</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Composite availability:</strong> components in <em>series</em> multiply (A × B: two 99.9% dependencies give ~99.8%); redundant components in <em>parallel</em> give 1 − (1 − A)<sup>n</sup> (two independent 99% replicas give 99.99%). So every synchronous dependency lowers your ceiling, and redundancy raises it — assuming failures are independent, which shared infrastructure often breaks.</p>' +
            '<p>Four nines leaves ~4 minutes a month: humans cannot react that fast, so it requires automated failover, progressive rollouts and fast rollback.</p>',
          interview: 'Expect "how many nines does this need and what does that imply?" Answer with downtime math, then architecture: 99.99% means no single points of failure, multi-AZ, automated failover, and canary deploys. Mention error budgets as the mechanism that balances reliability vs release velocity.',
          examples: [{
            label: 'Composite availability calculation',
            lang: 'text',
            code: [
              'Request path (series): LB 99.99% -> API 99.95% -> DB 99.95%',
              '  A = 0.9999 * 0.9995 * 0.9995 = 0.9989  (~99.89%, about 9.6 h/yr down)',
              '',
              'Make DB redundant: primary + standby, each 99.95%, independent failures',
              '  A_db = 1 - (0.0005)^2 = 0.99999975',
              '  A    = 0.9999 * 0.9995 * 0.99999975 = 0.9994  (~99.94%)',
              '',
              'Lesson: weakest series link dominates; add redundancy there first.'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'Convert DAU into average and peak QPS',
          d: 'easy',
          type: 'concept',
          hint: '<p><strong>Given:</strong> 50M DAU, each user makes 30 read and 3 write requests per day.</p><ul><li>Reads/day = 50M × 30 = 1.5B → 1.5B / 10<sup>5</sup> ≈ <strong>15K read QPS</strong>, peak (×2–3) ≈ 30–45K.</li><li>Writes/day = 150M → ≈ <strong>1.5K write QPS</strong>, peak ≈ 3–5K.</li><li>Read:write = 10:1 → read-heavy → caching and read replicas pay off.</li></ul><p>Always finish with the <em>decision</em> the numbers imply.</p>'
        },
        {
          t: 'Downtime budget for a given number of nines',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li>Downtime = (1 − availability) × period.</li><li>99.95% per 30 days: 0.0005 × 43,200 min = <strong>21.6 min</strong>.</li><li>99.99% per year: 0.0001 × 525,600 min ≈ <strong>52.6 min</strong>.</li><li>Discuss what consumes the budget: deploys, dependency outages, failovers. Planned maintenance usually counts unless excluded in the SLA.</li></ul>'
        },
        {
          t: 'Clarifying questions for "Design Instagram"',
          d: 'easy',
          type: 'design',
          hint: '<ol><li>Core features: upload photo/video, follow, home feed, likes/comments? Stories/DMs in scope?</li><li>Scale: DAU, uploads/day, average media size, read:write ratio.</li><li>Latency target for feed load; acceptable staleness of feed and counters.</li><li>Global or single region? Mobile-first?</li><li>Availability vs consistency per feature (uploads must not be lost; like counts can lag).</li><li>Out of scope: ads, search, recommendations ranking model.</li></ol><p>Then write FR/NFR lists and confirm before estimating.</p>'
        },
        {
          t: 'Write an availability calculator in Go',
          d: 'easy',
          type: 'coding',
          hint: '<ul><li>Series: product of availabilities.</li><li>Parallel (redundant, independent): <code>1 - Π(1 - a<sub>i</sub>)</code>.</li><li>Convert to downtime per year: <code>(1 - a) * 365 * 24 * 60</code> minutes.</li><li>Model a tier as a parallel group, the request path as a series of tiers.</li></ul>',
          solution: [
            'package main',
            '',
            'import "fmt"',
            '',
            '// Series returns availability of components that must ALL be up.',
            'func Series(as ...float64) float64 {',
            '    total := 1.0',
            '    for _, a := range as {',
            '        total *= a',
            '    }',
            '    return total',
            '}',
            '',
            '// Parallel returns availability of independent redundant replicas (any one up is enough).',
            'func Parallel(as ...float64) float64 {',
            '    allDown := 1.0',
            '    for _, a := range as {',
            '        allDown *= 1 - a',
            '    }',
            '    return 1 - allDown',
            '}',
            '',
            'func DowntimeMinutesPerYear(a float64) float64 {',
            '    return (1 - a) * 365 * 24 * 60',
            '}',
            '',
            'func main() {',
            '    lb := Parallel(0.999, 0.999)',
            '    api := Parallel(0.995, 0.995, 0.995)',
            '    db := Parallel(0.9995, 0.9995)',
            '    total := Series(lb, api, db)',
            '    fmt.Printf("availability=%.5f%% downtime=%.1f min/yr\\n", total*100, DowntimeMinutesPerYear(total))',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Storage estimate for a photo-sharing app over 5 years',
          d: 'medium',
          type: 'concept',
          hint: '<ul><li>Assume 500M DAU, 10% upload 1 photo/day → 50M photos/day.</li><li>Store 3 renditions: original 2 MB + medium 300 KB + thumbnail 30 KB ≈ 2.3 MB.</li><li>Per day: 50M × 2.3 MB ≈ 115 TB; per year ≈ 42 PB; 5 years ≈ <strong>210 PB</strong> before replication.</li><li>Metadata: 50M × 1 KB = 50 GB/day → ~90 TB over 5 years → sharded DB.</li><li>Decisions: object storage with erasure coding (≈1.5× overhead instead of 3×), lifecycle to cold tier, CDN for hot images.</li></ul>'
        },
        {
          t: 'Bandwidth and CDN sizing for video streaming',
          d: 'medium',
          type: 'concept',
          hint: '<ul><li>Assume 10M concurrent viewers at peak, average bitrate 3 Mbps (adaptive).</li><li>Egress = 10M × 3 Mbps = <strong>30 Tbps</strong> — impossible from one origin, hence CDN/edge caches (and ISP-embedded appliances like Netflix Open Connect).</li><li>With a 95% CDN hit ratio, origin egress ≈ 1.5 Tbps.</li><li>Ingress (uploads) is tiny by comparison; transcoding compute is the other big cost.</li></ul>'
        },
        {
          t: 'How many application servers do we need?',
          d: 'medium',
          type: 'concept',
          hint: '<ul><li>Peak 60K RPS. Load test says one Go pod sustains 2K RPS at target p99 with 60% CPU.</li><li>Raw: 60K / 2K = 30 pods. Add N+2 / AZ redundancy: if one of 3 AZs fails, the remaining two must carry 100%: 30 × 3/2 = <strong>45 pods</strong> (15 per AZ).</li><li>Add autoscaling headroom and deploy surge (maxSurge 25%).</li><li>Mention that the DB/cache, not stateless pods, is usually the real bottleneck.</li></ul>'
        },
        {
          t: 'Define SLIs and SLOs for a checkout API',
          d: 'medium',
          type: 'design',
          hint: '<ul><li><strong>Availability SLI:</strong> non-5xx checkout responses / valid requests (exclude 4xx caused by clients).</li><li><strong>Latency SLI:</strong> proportion of requests under 500 ms (p99 bucketed from histograms).</li><li><strong>Correctness SLI:</strong> orders whose payment and inventory states reconcile within 5 min.</li><li>SLO: 99.95% availability, 99% under 500 ms, over 28-day rolling window.</li><li>Error budget policy: freeze risky releases when budget burnt; multi-window burn-rate alerts (e.g. 2% in 1h, 5% in 6h).</li><li>SLA to merchants: 99.9% with service credits.</li></ul>'
        },
        {
          t: 'Run the full framework on "Design Pastebin"',
          d: 'hard',
          type: 'design',
          hint: '<ol><li><strong>Requirements:</strong> create paste (text up to 10 MB), read by key, expiry, optional private pastes; 10:1 read heavy, p99 read &lt; 100 ms.</li><li><strong>Estimates:</strong> 1M pastes/day ≈ 12 write QPS, 120 read QPS; avg 10 KB → 10 GB/day → ~18 TB in 5 years.</li><li><strong>API:</strong> <code>POST /pastes</code> → key; <code>GET /pastes/{key}</code>.</li><li><strong>Design:</strong> key generation service (base62 of a unique ID), metadata in a KV/SQL store, content in object storage, CDN + Redis for hot pastes.</li><li><strong>Deep dives:</strong> key collision avoidance, expiry via TTL + lazy deletion + background sweeper, abuse rate limiting, large paste streaming upload.</li><li><strong>Wrap-up:</strong> SLIs, failure of key service (pre-allocated ranges), cost of storage tiers.</li></ol>'
        }
      ],
      interviewFocus: [
        {
          q: 'Walk me through how you approach an open-ended system design question.',
          a: '<p>I use four time-boxed steps and say them up front:</p><ol><li><strong>Requirements</strong> — clarify 3–5 core features, scale, latency, availability, consistency; list out-of-scope items.</li><li><strong>Estimation</strong> — QPS (avg/peak), storage, bandwidth; only numbers that change decisions.</li><li><strong>High-level design</strong> — API contract, data model, then a box diagram tracing one read and one write end to end.</li><li><strong>Deep dives</strong> — pick the 2–3 riskiest areas (sharding, hot keys, consistency, failure), present alternatives with trade-offs, choose one, and close with monitoring and how it evolves at 10×.</li></ol><p>Throughout I state assumptions, check in with the interviewer, and keep the design as simple as the requirements allow.</p>'
        },
        {
          q: 'Your service depends synchronously on five services, each with 99.9% availability. What is your maximum availability and how would you improve it?',
          a: '<p>Series availability is the product: 0.999<sup>5</sup> ≈ <strong>99.5%</strong> (~44 h/yr) — worse than any single dependency.</p><p>Improvements:</p><ul><li><strong>Remove the synchronous dependency</strong> — make non-critical calls asynchronous (queue) or fire-and-forget.</li><li><strong>Graceful degradation</strong> — serve without recommendations or with cached/stale data when a dependency fails.</li><li><strong>Cache</strong> dependency responses so brief outages are absorbed.</li><li><strong>Timeouts + circuit breakers</strong> so a slow dependency does not consume all workers.</li><li><strong>Redundancy</strong> of the dependency itself (multi-AZ replicas).</li></ul><p>The key insight: availability of critical-path dependencies caps yours, so shrink the critical path.</p>'
        },
        {
          q: 'How do you decide whether a single database is enough?',
          a: '<p>Use estimation:</p><ul><li><strong>Write QPS:</strong> a well-tuned Postgres/MySQL primary handles roughly 5–20K simple writes/s; above that, consider sharding or a write-optimised store.</li><li><strong>Read QPS:</strong> scale with caching and read replicas before sharding.</li><li><strong>Dataset size:</strong> a few TB fits one node with NVMe; tens of TB and growing pushes toward partitioning.</li><li><strong>Working set:</strong> if hot data fits in RAM (buffer pool + Redis), latency stays low.</li></ul><p>Then say: &quot;Start with a single primary + replicas, choose a shard key now (e.g. <code>user_id</code>) so we can split later without changing the API.&quot; This shows pragmatism and foresight.</p>'
        },
        {
          q: 'What is the difference between SLA, SLO and SLI, and how do error budgets change engineering behaviour?',
          a: '<ul><li><strong>SLI</strong> is the measurement (fraction of good events).</li><li><strong>SLO</strong> is the internal target (99.9% over 28 days).</li><li><strong>SLA</strong> is the external contract with consequences, set looser than the SLO.</li></ul><p>The <strong>error budget</strong> is 1 − SLO. While budget remains, teams ship fast; when it is exhausted, policy shifts effort to reliability (release freeze, postmortem action items). It turns the dev-vs-ops argument into a shared, data-driven rule and stops both over-engineering (100% is the wrong target) and reckless shipping.</p>'
        },
        {
          q: 'Why does a p99 latency matter more than the average in a microservice architecture?',
          a: '<p>With fan-out, a user request touches many backends. If each has a 1% chance of being slow, a request fanning out to 100 backends has 1 − 0.99<sup>100</sup> ≈ <strong>63%</strong> chance of hitting at least one slow call (<em>tail at scale</em>). Averages hide this.</p><p>Mitigations: hedged requests (send a duplicate after the p95 delay), tight timeouts with fallbacks, reducing fan-out, load-aware balancing, and isolating noisy neighbours. Always set SLOs on percentiles from histograms, not on averages.</p>'
        }
      ],
      quiz: [
        { q: 'Roughly how many seconds are in a day, for estimation?', a: 'About 10^5 (86,400). So 1M requests/day is about 12 QPS.' },
        { q: 'What multiplier is typically used to go from average to peak QPS?', a: '2-3x for normal diurnal traffic; higher (5-10x) for spiky events like sales or live sports.' },
        { q: 'How much downtime per year does 99.99% allow?', a: 'About 52.6 minutes per year (about 4.3 minutes per 30 days).' },
        { q: 'Order of magnitude: main memory reference vs same-datacenter round trip?', a: 'Memory ~100 ns; datacenter round trip ~0.5 ms, about 5000x slower.' },
        { q: 'Two independent replicas each 99% available, either can serve. Combined availability?', a: '1 - 0.01^2 = 99.99%.' },
        { q: 'Which should be stricter: the SLO or the SLA?', a: 'The SLO. The SLA is looser so you detect and react to problems before breaching the contract.' },
        { q: 'Name three common non-functional requirements.', a: 'Any of: scalability, latency, availability, consistency, durability, security/compliance, cost, maintainability.' },
        { q: 'What is the 80/20 rule used for in estimation?', a: 'Sizing caches: about 20% of the data serves 80% of reads, so cache roughly 20% of the daily read working set.' }
      ],
      resources: [
        { title: 'System Design Primer (donnemartin)', url: 'https://github.com/donnemartin/system-design-primer', type: 'course' },
        { title: 'Google SRE Book — Service Level Objectives', url: 'https://sre.google/sre-book/service-level-objectives/', type: 'book' },
        { title: 'Google SRE Book — Embracing Risk (error budgets)', url: 'https://sre.google/sre-book/embracing-risk/', type: 'book' },
        { title: 'Latency Numbers Every Programmer Should Know (interactive)', url: 'https://colin-scott.github.io/personal_website/research/interactive_latency.html', type: 'article' }
      ]
    },
    // ───────────────────────────── Module 2 ─────────────────────────────
    {
      n: 2,
      title: 'Scalability & Load Balancing',
      summary: 'How systems grow from one box to thousands: vertical vs horizontal scaling, stateless services, L4/L7 load balancing and algorithms, autoscaling, why the database becomes the bottleneck, the scale cube as a vocabulary for all of it, and load shedding for when traffic outruns capacity.',
      topics: [
        {
          title: 'Vertical vs Horizontal Scaling',
          def: '<p><strong>Vertical scaling (scale up)</strong> means a bigger machine: more CPU, RAM, faster disks. <strong>Horizontal scaling (scale out)</strong> means more machines sharing the load.</p>' +
            '<table><thead><tr><th>Aspect</th><th>Vertical</th><th>Horizontal</th></tr></thead><tbody>' +
            '<tr><td>Complexity</td><td>Minimal — no code changes</td><td>Needs stateless design, LB, data partitioning</td></tr>' +
            '<tr><td>Ceiling</td><td>Hard limit (largest instance, e.g. a few hundred vCPUs / TBs RAM)</td><td>Near-linear if the design allows</td></tr>' +
            '<tr><td>Availability</td><td>Single point of failure</td><td>Redundancy built in; N+1 tolerance</td></tr>' +
            '<tr><td>Cost curve</td><td>Super-linear at the high end</td><td>Linear with commodity nodes</td></tr>' +
            '<tr><td>Downtime to scale</td><td>Often a restart / failover</td><td>Add nodes live</td></tr>' +
            '<tr><td>Consistency</td><td>Easy (one node, local transactions)</td><td>Harder (distributed state, replication lag)</td></tr>' +
            '<tr><td>Good fit</td><td>Relational primary DB, early-stage products</td><td>Stateless web/API tiers, caches, NoSQL</td></tr>' +
            '</tbody></table>' +
            '<p>Real systems use <strong>both</strong>: scale the DB primary vertically as far as is economical (it buys simplicity), and scale the stateless tier horizontally. Modern hardware is huge — a single Postgres on a large NVMe instance can serve a surprising amount of traffic — so the senior answer is &quot;scale up until it is costly or risky, but design so you <em>can</em> scale out&quot;.</p>' +
            '<p>Horizontal scaling only works if the work is <strong>partitionable</strong> and nodes do not need to coordinate on every request; coordination (locks, consensus, cross-shard transactions) is what kills linear scaling (see Amdahl and the Universal Scalability Law).</p>',
          interview: 'Do not dismiss vertical scaling as "not scalable" — interviewers like hearing that it is the cheapest first step and that the DB is often scaled up first. Then explain what must be true to scale out: stateless nodes, partitionable data, and minimal cross-node coordination.',
          examples: [{
            label: 'Why scale-out is not linear: Amdahl and USL arithmetic',
            lang: 'text',
            code: [
              'Amdahl\'s law: speedup(N) = 1 / (s + (1 - s) / N), s = serial (non-parallel) fraction',
              '  s = 5%:  N = 10 -> 6.9x    N = 100 -> 16.8x    N -> infinity: 20x ceiling',
              '',
              'Universal Scalability Law adds a coherency cost (nodes coordinating with each other):',
              '  C(N) = N / (1 + a(N - 1) + b * N(N - 1))',
              '  a = 0.05 (contention), b = 0.001 (coherency): peak at N* = sqrt((1 - a) / b) ~= 31 nodes,',
              '  after which adding nodes REDUCES throughput (locks, cross-shard transactions, cache invalidation)',
              '',
              'Check vertical headroom first:',
              '  Peak 8K writes/s; a large Postgres primary (64 vCPU, NVMe) does ~20K simple writes/s',
              '  -> 2.5x headroom: scale up now, pick a shard key (user_id) so scale-out stays possible later'
            ].join('\n')
          }]
        },
        {
          title: 'Stateless Services & Externalized State',
          def: '<p>A service is <strong>stateless</strong> when any instance can serve any request because no request-relevant state lives only in that instance&#39;s memory or disk. This is the precondition for horizontal scaling, rolling deploys, autoscaling and fast failover.</p>' +
            '<p><strong>Where state goes instead:</strong></p>' +
            '<ul><li><strong>Sessions</strong> → signed tokens (JWT with short expiry) or a shared store (Redis) keyed by session ID.</li>' +
            '<li><strong>Uploaded files</strong> → object storage (S3/GCS/Blob), never local disk.</li>' +
            '<li><strong>Caches</strong> → distributed cache; local in-process caches are fine only as a disposable L1.</li>' +
            '<li><strong>Background work</strong> → queues, not in-memory goroutine pools that die with the pod.</li>' +
            '<li><strong>Locks / leader election</strong> → etcd, ZooKeeper, DB advisory locks or Redis with fencing tokens.</li></ul>' +
            '<p><strong>Sticky sessions</strong> (LB pins a user to one node) are a workaround for stateful apps. They cause uneven load, lose sessions when a node dies, and complicate deploys. Prefer externalising state; keep stickiness only where it is a performance optimisation (e.g. cache locality, WebSocket connections) rather than a correctness requirement.</p>' +
            '<p>Note the trade-off: externalising state adds a network hop (~0.5 ms) and a new dependency that must itself be highly available. Truly stateful systems (databases, Kafka, WebSocket gateways) are scaled differently — by partitioning and replication.</p>',
          interview: 'A common probe: "a user logs in, the next request hits another server — what happens?" Answer with externalised sessions (Redis or stateless JWT) and explain why sticky sessions are a smell. Bonus: mention that WebSocket gateways are stateful by nature and need a connection registry.',
          examples: [{
            label: 'Stateless tier with externalized state',
            lang: 'text',
            code: [
              '              +-----------+',
              ' clients ---> |    LB     |  (no stickiness required)',
              '              +-----------+',
              '               /    |    \\',
              '         +------+ +------+ +------+',
              '         | api1 | | api2 | | api3 |   <- identical, disposable pods',
              '         +------+ +------+ +------+',
              '            |  \\     |     /  |',
              '            |   +---------+   |',
              '            |   |  Redis  |   |   sessions, rate-limit counters, cache',
              '            |   +---------+   |',
              '       +---------+       +---------+',
              '       |   DB    |       |   S3    |   durable data, user uploads',
              '       +---------+       +---------+'
            ].join('\n')
          }]
        },
        {
          title: 'Load Balancers: L4 vs L7 and Algorithms',
          def: '<p>A load balancer spreads traffic across healthy backends, hides topology, and is a natural place for TLS termination, health checks and connection draining.</p>' +
            '<table><thead><tr><th></th><th>L4 (transport)</th><th>L7 (application)</th></tr></thead><tbody>' +
            '<tr><td>Sees</td><td>IP, port, TCP/UDP</td><td>HTTP method, path, headers, cookies, gRPC service</td></tr>' +
            '<tr><td>Routing</td><td>Per connection</td><td>Per request (path/host/header routing, canaries)</td></tr>' +
            '<tr><td>Performance</td><td>Very high, low latency, can pass-through TLS</td><td>More CPU (parses, terminates TLS)</td></tr>' +
            '<tr><td>Features</td><td>Simple, protocol-agnostic</td><td>Retries, rewrites, auth, WAF, compression, rate limits</td></tr>' +
            '<tr><td>Examples</td><td>AWS NLB, IPVS, Maglev</td><td>AWS ALB, Envoy, NGINX, HAProxy (http mode)</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Algorithms:</strong></p>' +
            '<ul><li><strong>Round robin / weighted RR</strong> — simple; assumes uniform request cost.</li>' +
            '<li><strong>Least connections / least outstanding requests</strong> — adapts to slow backends and long-lived requests.</li>' +
            '<li><strong>Power of two choices</strong> — pick 2 random backends, choose the less loaded; near-optimal with no global state (used by Envoy, NGINX).</li>' +
            '<li><strong>Hash-based (IP, header, consistent hash / Maglev / ring hash)</strong> — affinity for caches or sessions; minimises remapping when backends change.</li>' +
            '<li><strong>Latency-aware (EWMA)</strong> — prefers fastest backends; watch for herding.</li></ul>' +
            '<p><strong>Gotcha:</strong> gRPC and HTTP/2 multiplex many requests over one long-lived TCP connection, so an L4 balancer pins all of a client&#39;s traffic to one backend. Use L7 (Envoy, a service mesh) or client-side balancing for gRPC.</p>' +
            '<p>The LB itself must not be a single point of failure: run it in pairs (VRRP/keepalived), as a managed regional service, or with anycast + ECMP.</p>',
          interview: 'Be ready for: "L4 or L7 here and why?", "how do health checks and connection draining work during a deploy?", and "why does gRPC load balance badly behind an NLB?". Mention power-of-two-choices for a senior-level touch.',
          examples: [{
            label: 'Minimal round-robin reverse proxy in Go',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "log"',
              '    "net/http"',
              '    "net/http/httputil"',
              '    "net/url"',
              '    "sync/atomic"',
              ')',
              '',
              'func main() {',
              '    targets := []string{"http://127.0.0.1:9001", "http://127.0.0.1:9002"}',
              '    proxies := make([]*httputil.ReverseProxy, len(targets))',
              '    for i, t := range targets {',
              '        u, err := url.Parse(t)',
              '        if err != nil {',
              '            log.Fatal(err)',
              '        }',
              '        proxies[i] = httputil.NewSingleHostReverseProxy(u)',
              '    }',
              '',
              '    var counter atomic.Uint64',
              '    lb := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
              '        i := (counter.Add(1) - 1) % uint64(len(proxies))',
              '        proxies[i].ServeHTTP(w, r)',
              '    })',
              '    log.Fatal(http.ListenAndServe(":8000", lb))',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Autoscaling',
          def: '<p>Autoscaling adjusts capacity to demand. It has two layers in Kubernetes: <strong>pods</strong> (HPA, KEDA) and <strong>nodes</strong> (Cluster Autoscaler, Karpenter).</p>' +
            '<ul><li><strong>Reactive</strong>: HPA computes <code>desired = ceil(current × currentMetric / targetMetric)</code>. Metrics: CPU, RPS per pod, p99 latency, or queue depth/lag (KEDA) for workers.</li>' +
            '<li><strong>Scheduled</strong>: pre-scale for known peaks (9 am logins, Black Friday).</li>' +
            '<li><strong>Predictive</strong>: forecast from historical patterns (AWS predictive scaling).</li></ul>' +
            '<table><thead><tr><th>Pitfall</th><th>Mitigation</th></tr></thead><tbody>' +
            '<tr><td>Cold start (JVM warm-up, cache fill, image pull ~30–120 s)</td><td>Keep headroom (target 60–70% CPU), min replicas, pre-pulled images; Go&#39;s fast startup helps</td></tr>' +
            '<tr><td>Flapping (scale up/down oscillation)</td><td>Stabilisation windows; scale out fast, scale in slowly</td></tr>' +
            '<tr><td>Scaling the wrong tier</td><td>More pods → more DB connections → DB melts; use connection poolers, scale on downstream-aware metrics</td></tr>' +
            '<tr><td>Spikes faster than scaling</td><td>Queue + load shedding + rate limiting; overprovision for flash events</td></tr>' +
            '<tr><td>Node provisioning lag</td><td>Overprovisioning with low-priority placeholder pods</td></tr>' +
            '</tbody></table>' +
            '<p>Autoscaling only works for <strong>stateless</strong> or well-partitioned workloads with graceful shutdown (handle SIGTERM, finish in-flight requests, deregister from the LB before exiting).</p>',
          interview: 'Interviewers ask "how do you handle a 10x spike in 1 minute?" — autoscaling alone is too slow. Combine headroom, queueing/backpressure, rate limiting and load shedding, plus pre-scaling for known events. Choose the scaling metric that reflects saturation (queue lag for consumers, RPS/concurrency for APIs).',
          examples: [{
            label: 'HPA with fast scale-out, slow scale-in (autoscaling/v2)',
            lang: 'yaml',
            code: [
              'apiVersion: autoscaling/v2',
              'kind: HorizontalPodAutoscaler',
              'metadata:',
              '  name: api',
              'spec:',
              '  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: api}',
              '  minReplicas: 6                  # headroom + survive losing one of three AZs',
              '  maxReplicas: 120',
              '  metrics:',
              '  - type: Resource',
              '    resource:',
              '      name: cpu',
              '      target: {type: Utilization, averageUtilization: 65}',
              '  - type: Pods                    # requests/s per pod, via a custom metrics adapter',
              '    pods:',
              '      metric: {name: http_requests_per_second}',
              '      target: {type: AverageValue, averageValue: "800"}',
              '  behavior:',
              '    scaleUp:',
              '      stabilizationWindowSeconds: 0',
              '      policies:',
              '      - {type: Percent, value: 100, periodSeconds: 30}   # may double every 30 s',
              '    scaleDown:',
              '      stabilizationWindowSeconds: 300                    # wait 5 min before shrinking',
              '      policies:',
              '      - {type: Percent, value: 10, periodSeconds: 60}    # then shrink at most 10%/min',
              '# Worked formula: 40 pods at 90% CPU, target 65% -> ceil(40 * 90 / 65) = 56 pods'
            ].join('\n')
          }]
        },
        {
          title: 'The Database as the Bottleneck',
          def: '<p>Once the app tier is stateless and autoscaled, the stateful data tier becomes the limiting factor. Typical symptoms: high CPU on the primary, lock contention, replication lag, connection exhaustion, slow queries growing with data.</p>' +
            '<p><strong>Playbook, roughly in order of cost:</strong></p>' +
            '<ol><li><strong>Fix queries</strong> — add/repair indexes, remove N+1 queries, paginate with keyset cursors, avoid <code>SELECT *</code>.</li>' +
            '<li><strong>Connection pooling</strong> — Go&#39;s <code>database/sql</code> pool per pod (<code>SetMaxOpenConns</code>) plus PgBouncer/RDS Proxy; 200 pods × 20 connections = 4,000 connections will overwhelm Postgres.</li>' +
            '<li><strong>Cache</strong> hot reads (Redis) — often removes 80–95% of read load.</li>' +
            '<li><strong>Read replicas</strong> — route read-only queries; handle replication lag (read-your-writes).</li>' +
            '<li><strong>Vertical scale</strong> the primary.</li>' +
            '<li><strong>Functional partitioning</strong> — separate databases per service/domain.</li>' +
            '<li><strong>Sharding</strong> — split write load by key; biggest complexity jump (cross-shard queries, rebalancing).</li>' +
            '<li><strong>Change the data store</strong> — e.g. a wide-column or distributed SQL database for write-heavy, globally distributed data.</li></ol>' +
            '<p>Also: move heavy analytics off OLTP into a warehouse via CDC, archive cold rows, and use async writes (queue) where latency allows.</p>',
          interview: 'When asked "the DB is at 90% CPU, what do you do?", go cheap to expensive: find the slow queries first (pg_stat_statements), pool connections, cache, add replicas, then partition. Jumping straight to sharding is a red flag.',
          examples: [{
            label: 'First 10 minutes of a hot Postgres: find the cause before scaling',
            lang: 'sql',
            code: [
              '-- 1) Top queries by total time (pg_stat_statements; PG 13+ column names)',
              'SELECT queryid, calls, round(total_exec_time) AS total_ms,',
              '       round(mean_exec_time::numeric, 2) AS mean_ms, rows, left(query, 80) AS query',
              'FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;',
              '',
              '-- 2) Connections: how many, and what are they waiting on?',
              'SELECT state, wait_event_type, count(*) FROM pg_stat_activity GROUP BY 1, 2 ORDER BY 3 DESC;',
              '',
              '-- 3) Buffer cache hit ratio (OLTP should be > 99%; lower = working set exceeds RAM)',
              'SELECT round(sum(blks_hit) * 100.0 / nullif(sum(blks_hit) + sum(blks_read), 0), 2) FROM pg_stat_database;',
              '',
              '-- 4) Is the planner using your index?',
              'EXPLAIN (ANALYZE, BUFFERS) SELECT ... ;',
              '',
              '-- Pool math: 200 pods x SetMaxOpenConns(20) = 4,000 connections -> Postgres thrashes.',
              '-- Cap at ~5 per pod and put PgBouncer (transaction mode) or RDS Proxy in front:',
              '-- ~100-200 real server connections serve thousands of client connections.'
            ].join('\n')
          }]
        },
        {
          title: 'The Scale Cube (X, Y, Z Axes)',
          def: '<p>From <em>The Art of Scalability</em> (Abbott &amp; Fisher), the scale cube gives three independent ways to scale:</p>' +
            '<table><thead><tr><th>Axis</th><th>What it means</th><th>Example</th><th>Trade-off</th></tr></thead><tbody>' +
            '<tr><td><strong>X</strong> — horizontal duplication</td><td>Run N identical clones behind a LB</td><td>30 replicas of the API pod; read replicas</td><td>Easy; does not reduce data size or code complexity</td></tr>' +
            '<tr><td><strong>Y</strong> — functional decomposition</td><td>Split by function/verb/noun into services</td><td>Orders, Payments, Catalog services (microservices)</td><td>Independent scaling and teams; network calls, distributed data</td></tr>' +
            '<tr><td><strong>Z</strong> — data partitioning</td><td>Each node handles a subset of data, same code</td><td>Shard users by <code>user_id</code>; per-tenant cells</td><td>Scales data and writes; routing, rebalancing, cross-shard queries</td></tr>' +
            '</tbody></table>' +
            '<p>Large systems use all three: Y-split into services, each service X-scaled, and data-heavy services Z-partitioned. A modern refinement is the <strong>cell-based architecture</strong> (used widely at AWS): Z-axis partitioning of the <em>entire stack</em> into independent cells, each serving a subset of customers, which limits blast radius.</p>',
          interview: 'Using the scale-cube vocabulary signals experience. When you propose microservices say "Y-axis split", when you shard say "Z-axis", and mention cells for blast-radius reduction. Always pair each axis with its cost.',
          examples: [{
            label: 'Scale cube applied to an e-commerce system',
            lang: 'text',
            code: [
              'Y-axis (split by function)',
              '   [Catalog]      [Orders]          [Payments]',
              '      |              |                  |',
              'X-axis (clones)      |                  |',
              '   x20 pods       x10 pods           x6 pods',
              '      |              |                  |',
              'Z-axis (partition data)',
              '   ES index       orders_shard_0..15  ledger per region',
              '   (replicas)     by hash(customer_id)'
            ].join('\n')
          }]
        },
        {
          title: 'Load Shedding, Backpressure & Admission Control',
          def: '<p>Autoscaling reacts in minutes; overload arrives in seconds. Past its capacity a service must keep serving <em>some</em> requests well rather than <em>all</em> requests badly. Without protection you get <strong>congestive collapse</strong>: queues grow, every request waits longer than its client&#39;s timeout, clients retry, and <strong>goodput</strong> (successful requests within SLO) falls to zero while CPU sits at 100%.</p>' +
            '<table><thead><tr><th>Technique</th><th>How</th><th>Notes</th></tr>' +
            '</thead><tbody>' +
            '<tr><td><strong>Concurrency limit</strong></td><td>Cap in-flight requests per instance (a semaphore); reject the excess immediately with 503</td><td>Size with Little&#39;s law: limit ≈ throughput × latency (2,000 RPS × 50 ms = 100). Adaptive limiters (AIMD/gradient, as in Netflix concurrency-limits or Envoy adaptive concurrency) find it automatically from latency</td></tr>' +
            '<tr><td><strong>Short, deadline-aware queues</strong></td><td>Queue briefly; drop requests that have waited too long or whose deadline already passed</td><td>Work for an abandoned request is pure waste. Under overload, LIFO or CoDel-style queues serve fresh requests that can still succeed</td></tr>' +
            '<tr><td><strong>Priority shedding</strong></td><td>Classify traffic (checkout &gt; browse &gt; prefetch/batch/bots) and shed the lowest class first</td><td>Needs a priority signal (header, route, tenant tier); protects revenue paths</td></tr>' +
            '<tr><td><strong>Client-side adaptive throttling</strong></td><td>Each client tracks requests vs accepts and rejects locally with probability max(0, (requests − K × accepts) / (requests + 1))</td><td>From the Google SRE book, K ≈ 2; spares the overloaded backend even the cost of saying no</td></tr>' +
            '<tr><td><strong>Rate limits / quotas</strong></td><td>Per tenant / API key token buckets at the edge</td><td>Fairness and noisy-neighbour protection</td></tr>' +
            '<tr><td><strong>Brownout</strong></td><td>Switch off expensive optional features (recommendations, personalisation, live counts) when saturated</td><td>Feature flags driven by saturation signals; degrade before you fail</td></tr>' +
            '<tr><td><strong>Retry budgets</strong></td><td>Retries limited to ~10% of requests; overload responses marked non-retryable or honoured via <code>Retry-After</code></td><td>Retries are the main amplifier during overload</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Backpressure</strong> is the cooperative form: a saturated component tells its upstream to slow down (a blocking bounded channel, HTTP/2 and gRPC flow control, pull-based consumers, 429 + <code>Retry-After</code>) instead of filling unbounded buffers. <strong>Shedding</strong> is the last line of defence when the upstream cannot slow down — end users and partners keep sending.</p>' +
            '<p><strong>Make rejection cheap and early:</strong> shed at the load balancer, gateway or the first middleware, before auth lookups, body parsing or DB calls; a rejection that costs as much as a success does not help. Return 503 + <code>Retry-After</code> for overload and 429 for quota, and alert on shed rate. Load-test past saturation to confirm goodput plateaus instead of collapsing.</p>',
          interview: 'When asked "what happens at 10x traffic?", say autoscaling is too slow on its own, then layer defences: per-tenant rate limits at the edge, per-instance concurrency limits that reject cheaply, short deadline-aware queues, priority shedding of non-critical traffic, retry budgets in clients and brownout of expensive features. Use the words goodput and congestive collapse, and size the limit with Little\'s law.',
          examples: [{
            label: 'Priority-aware concurrency limiter middleware (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "net/http"',
              '    "time"',
              ')',
              '',
              '// Shedder admits at most cap(all) concurrent requests and lets low-priority traffic use',
              '// only part of that capacity, so critical requests (checkout) still get in under overload.',
              'type Shedder struct {',
              '    all chan struct{} // semaphore for every request',
              '    low chan struct{} // smaller semaphore for X-Priority: low (prefetch, batch, bots)',
              '}',
              '',
              'func NewShedder(limit, lowLimit int) *Shedder {',
              '    return &Shedder{all: make(chan struct{}, limit), low: make(chan struct{}, lowLimit)}',
              '}',
              '',
              'func (s *Shedder) Wrap(next http.Handler) http.Handler {',
              '    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
              '        if r.Header.Get("X-Priority") == "low" {',
              '            select {',
              '            case s.low <- struct{}{}:',
              '                defer func() { <-s.low }()',
              '            default:',
              '                reject(w)',
              '                return',
              '            }',
              '        }',
              '        select {',
              '        case s.all <- struct{}{}: // admitted',
              '            defer func() { <-s.all }()',
              '            next.ServeHTTP(w, r)',
              '        default: // full: reject in microseconds instead of queueing until everyone times out',
              '            reject(w)',
              '        }',
              '    })',
              '}',
              '',
              'func reject(w http.ResponseWriter) {',
              '    w.Header().Set("Retry-After", "1")',
              '    http.Error(w, "overloaded", http.StatusServiceUnavailable)',
              '}',
              '',
              'func main() {',
              '    // Little\'s law: 2,000 RPS x 50 ms = 100 requests in flight at target load.',
              '    // Allow 150 in total (headroom), of which at most 60 may be low priority.',
              '    s := NewShedder(150, 60)',
              '    h := s.Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
              '        time.Sleep(50 * time.Millisecond)',
              '        w.Write([]byte("ok"))',
              '    }))',
              '    _ = h // http.ListenAndServe(":8080", h)',
              '}'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'Why are sticky sessions a scaling smell?',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li>Uneven load: heavy users pin to one node; new nodes get no existing traffic.</li><li>Node failure or deploy loses in-memory sessions → users logged out.</li><li>Autoscaling scale-in must drain long sessions.</li><li>Fix: externalise session state (Redis, signed tokens). Keep affinity only as an optimisation (cache locality, WebSockets).</li></ul>'
        },
        {
          t: 'Choose L4 or L7 for three scenarios',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li><strong>Raw TCP game server / MQTT / database proxy:</strong> L4 — protocol-agnostic, very low latency.</li><li><strong>HTTP API with path-based routing and canary releases:</strong> L7 — needs headers/paths.</li><li><strong>gRPC between services:</strong> L7 (Envoy/mesh) or client-side LB — HTTP/2 multiplexing defeats per-connection L4 balancing.</li><li>Note TLS: L4 can pass through (end-to-end TLS); L7 terminates and may re-encrypt.</li></ul>'
        },
        {
          t: 'Round-robin picker with health checks',
          d: 'easy',
          type: 'coding',
          hint: '<ul><li>Atomic counter for lock-free selection.</li><li>Skip unhealthy backends; give up after one full cycle.</li><li>Health flag updated by a background checker using <code>atomic.Bool</code>.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "errors"',
            '    "fmt"',
            '    "sync/atomic"',
            ')',
            '',
            'type Backend struct {',
            '    Addr    string',
            '    healthy atomic.Bool',
            '}',
            '',
            'type RoundRobin struct {',
            '    backends []*Backend',
            '    next     atomic.Uint64',
            '}',
            '',
            'var ErrNoBackend = errors.New("no healthy backend")',
            '',
            'func (rr *RoundRobin) Pick() (*Backend, error) {',
            '    n := uint64(len(rr.backends))',
            '    for i := uint64(0); i < n; i++ {',
            '        idx := (rr.next.Add(1) - 1) % n',
            '        if b := rr.backends[idx]; b.healthy.Load() {',
            '            return b, nil',
            '        }',
            '    }',
            '    return nil, ErrNoBackend',
            '}',
            '',
            'func main() {',
            '    rr := &RoundRobin{}',
            '    for _, a := range []string{"a:80", "b:80", "c:80"} {',
            '        b := &Backend{Addr: a}',
            '        b.healthy.Store(true)',
            '        rr.backends = append(rr.backends, b)',
            '    }',
            '    rr.backends[1].healthy.Store(false) // b is down',
            '    for i := 0; i < 4; i++ {',
            '        b, _ := rr.Pick()',
            '        fmt.Println(b.Addr) // a, c, a, c',
            '    }',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Smooth weighted round robin (NGINX algorithm)',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li>Each peer has <code>weight</code> and <code>current</code>.</li><li>On each pick: add <code>weight</code> to every peer&#39;s <code>current</code>, choose the max, subtract the total weight from the winner.</li><li>Produces an interleaved sequence (a a b a c a a for 5:1:1) instead of bursts.</li><li>Guard with a mutex; it is O(n) per pick, which is fine for tens of backends.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "sync"',
            ')',
            '',
            'type peer struct {',
            '    name    string',
            '    weight  int',
            '    current int',
            '}',
            '',
            'type SWRR struct {',
            '    mu    sync.Mutex',
            '    peers []*peer',
            '}',
            '',
            'func (s *SWRR) Add(name string, w int) { s.peers = append(s.peers, &peer{name: name, weight: w}) }',
            '',
            'func (s *SWRR) Next() string {',
            '    s.mu.Lock()',
            '    defer s.mu.Unlock()',
            '    total := 0',
            '    var best *peer',
            '    for _, p := range s.peers {',
            '        p.current += p.weight',
            '        total += p.weight',
            '        if best == nil || p.current > best.current {',
            '            best = p',
            '        }',
            '    }',
            '    if best == nil {',
            '        return ""',
            '    }',
            '    best.current -= total',
            '    return best.name',
            '}',
            '',
            'func main() {',
            '    s := &SWRR{}',
            '    s.Add("a", 5)',
            '    s.Add("b", 1)',
            '    s.Add("c", 1)',
            '    for i := 0; i < 7; i++ {',
            '        fmt.Print(s.Next(), " ") // a a b a c a a',
            '    }',
            '    fmt.Println()',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Power-of-two-choices least-loaded picker',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li>Track in-flight requests per backend with an atomic counter (increment on start, decrement on finish).</li><li>Pick two distinct random backends; choose the one with fewer in-flight requests.</li><li>Why it works: exponentially better max load than pure random, with no global coordination — ideal when many LB instances each have only a local view.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "math/rand/v2"',
            '    "sync/atomic"',
            ')',
            '',
            'type Backend struct {',
            '    Name     string',
            '    inflight atomic.Int64',
            '}',
            '',
            'type P2C struct{ backends []*Backend }',
            '',
            '// Acquire picks a backend and returns a release func to call when the request ends.',
            'func (p *P2C) Acquire() (*Backend, func()) {',
            '    n := len(p.backends)',
            '    a := p.backends[rand.IntN(n)]',
            '    b := a',
            '    if n > 1 {',
            '        for b == a {',
            '            b = p.backends[rand.IntN(n)]',
            '        }',
            '    }',
            '    chosen := a',
            '    if b.inflight.Load() < a.inflight.Load() {',
            '        chosen = b',
            '    }',
            '    chosen.inflight.Add(1)',
            '    return chosen, func() { chosen.inflight.Add(-1) }',
            '}',
            '',
            'func main() {',
            '    p := &P2C{backends: []*Backend{{Name: "x"}, {Name: "y"}, {Name: "z"}}}',
            '    b, release := p.Acquire()',
            '    defer release()',
            '    fmt.Println("routing to", b.Name)',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Zero-downtime deploys behind a load balancer',
          d: 'medium',
          type: 'design',
          hint: '<ol><li>Readiness probe gates traffic; liveness only restarts deadlocked processes.</li><li>On SIGTERM: fail readiness, wait for LB deregistration (preStop sleep ~5–10 s), stop accepting, finish in-flight requests with <code>http.Server.Shutdown(ctx)</code>, close DB pools, exit.</li><li>Rolling update with <code>maxUnavailable: 0</code>, <code>maxSurge: 25%</code>; or blue/green; or canary with automated rollback on SLO burn.</li><li>Backward-compatible DB migrations (expand → migrate → contract).</li><li>Long-lived connections (WebSockets/gRPC streams): drain with GOAWAY and client reconnect with jitter.</li></ol>'
        },
        {
          t: 'Autoscaling policy for a spiky ticket-sale API',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Known event → <strong>scheduled pre-scale</strong> 30 min before sale; warm caches.</li><li>HPA on RPS/concurrency per pod (CPU lags), fast scale-out, slow scale-in (stabilisation 5–10 min).</li><li>Node headroom via placeholder pods so pods do not wait for VMs.</li><li><strong>Admission control</strong>: virtual waiting room / queue tokens, rate limit per user, shed load (HTTP 429/503) before collapse.</li><li>Protect the DB: connection pooler, inventory reservations in Redis with atomic decrement, async order confirmation.</li></ul>'
        },
        {
          t: 'The DB is at 90% CPU — diagnose and fix',
          d: 'medium',
          type: 'design',
          hint: '<ol><li>Measure: top queries by total time (<code>pg_stat_statements</code>), lock waits, connection count, cache hit ratio.</li><li>Quick wins: missing indexes, N+1 queries, unbounded scans, offset pagination.</li><li>Pooling: cap per-pod pool, add PgBouncer.</li><li>Offload reads: Redis cache-aside, read replicas with lag-aware routing.</li><li>Offload analytics: CDC to a warehouse.</li><li>Only then: vertical scale, functional split, sharding.</li></ol>'
        },
        {
          t: 'Global traffic management across regions',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>GeoDNS / latency-based DNS</strong> (Route 53): simple, but TTL caching slows failover (minutes).</li><li><strong>Anycast</strong> (one IP announced from many PoPs via BGP): fast failover, used by CDNs and Global Accelerator / Cloud LB.</li><li>Health-checked regional endpoints; automatic failover policy.</li><li>Data layer decides what is possible: active-active needs multi-region writes (conflict resolution) or home-region routing per user.</li><li>Discuss capacity: each surviving region must absorb the failed region&#39;s traffic (N+1 regions).</li></ul>'
        },
        {
          t: 'Scale a web app from 1K to 10M users',
          d: 'hard',
          type: 'design',
          hint: '<ol><li><strong>1K:</strong> single server + DB; backups.</li><li><strong>10K:</strong> separate DB server; vertical scale; CDN for static assets.</li><li><strong>100K:</strong> LB + 2+ stateless app servers; sessions in Redis; DB primary + replica; monitoring.</li><li><strong>1M:</strong> cache-aside layer, read replicas, async jobs via queue, object storage for media, multi-AZ.</li><li><strong>10M:</strong> functional split into services (Y-axis), sharding hot tables (Z-axis), search index, autoscaling, multi-region read path, SLOs and on-call.</li></ol><p>At each step name the bottleneck that forced the change — that is the point of the exercise.</p>'
        }
      ],
      interviewFocus: [
        {
          q: 'How would you make a legacy stateful web application horizontally scalable?',
          a: '<ol><li><strong>Inventory state</strong>: in-memory sessions, local file uploads, in-process caches, cron jobs, in-memory locks.</li><li><strong>Externalise</strong>: sessions to Redis or signed tokens; files to object storage; caches to Redis (keep local cache as a disposable L1 with short TTL); scheduled jobs to a distributed scheduler with leader election; locks to a coordination service.</li><li><strong>Make instances disposable</strong>: config via env, graceful shutdown, readiness probes, idempotent startup.</li><li><strong>Introduce the LB</strong> without stickiness and test by killing instances under load.</li><li>Watch the new bottleneck: DB connections and the state store&#39;s availability.</li></ol>'
        },
        {
          q: 'Explain how you would load balance gRPC traffic between microservices.',
          a: '<p>gRPC uses HTTP/2, which multiplexes many RPCs over one long-lived TCP connection. An L4 balancer chooses a backend only when the connection is opened, so all RPCs from a client stick to one server and new pods get no traffic.</p><p>Options:</p><ul><li><strong>L7 proxy / service mesh</strong> (Envoy, Istio, Linkerd) balancing per request.</li><li><strong>Client-side balancing</strong>: gRPC resolver (DNS or xDS) returns all endpoints; <code>round_robin</code> or least-request policy in the client.</li><li><strong>Headless Kubernetes Service</strong> so DNS returns pod IPs, plus periodic re-resolution and <code>MaxConnectionAge</code> on servers to force rebalancing.</li></ul>'
        },
        {
          q: 'Compare least-connections, round robin, consistent hashing and power-of-two-choices.',
          a: '<table><thead><tr><th>Algorithm</th><th>Best for</th><th>Weakness</th></tr></thead><tbody><tr><td>Round robin</td><td>Uniform, short requests</td><td>Ignores backend load/speed</td></tr><tr><td>Least connections</td><td>Variable request duration</td><td>Needs shared view; new nodes get flooded</td></tr><tr><td>Consistent hashing</td><td>Cache/session affinity</td><td>Hot keys overload one node</td></tr><tr><td>Power of two choices</td><td>Many independent LBs, local info</td><td>Slightly less optimal than global least-loaded</td></tr></tbody></table><p>In practice: P2C/least-request for general traffic, consistent hashing (with bounded loads) when locality matters.</p>'
        },
        {
          q: 'Your autoscaling worked but the system still fell over during a spike. Why might that be?',
          a: '<ul><li><strong>Scaling lag</strong>: metrics scrape + HPA sync + node provisioning + image pull + warm-up can exceed the spike duration.</li><li><strong>Downstream saturation</strong>: more pods opened more DB connections; DB or cache became the bottleneck.</li><li><strong>Retry storms</strong>: clients retried timeouts without backoff, multiplying load.</li><li><strong>Wrong metric</strong>: CPU stayed low while threads blocked on I/O.</li><li><strong>Cold caches</strong> on new pods.</li></ul><p>Fixes: headroom and pre-scaling, load shedding and rate limiting, retries with exponential backoff + jitter + budgets, connection pooling, scaling on concurrency or queue lag.</p>'
        }
      ],
      quiz: [
        { q: 'What is the main precondition for horizontal scaling of an application tier?', a: 'The service must be stateless (state externalised) so any instance can serve any request.' },
        { q: 'Which LB layer can route by URL path?', a: 'L7 (application layer).' },
        { q: 'Why does gRPC often balance poorly behind an L4 load balancer?', a: 'HTTP/2 multiplexes all RPCs over one long-lived connection, and L4 balances per connection.' },
        { q: 'What is the Kubernetes HPA scaling formula?', a: 'desiredReplicas = ceil(currentReplicas * currentMetricValue / targetMetricValue).' },
        { q: 'Name the three axes of the scale cube.', a: 'X: cloning/duplication, Y: functional decomposition, Z: data partitioning.' },
        { q: 'Why scale out quickly but scale in slowly?', a: 'To avoid flapping and keep headroom for follow-up spikes; under-provisioning hurts users more than brief over-provisioning costs.' },
        { q: 'What is connection draining?', a: 'Stopping new requests to a backend while letting in-flight requests finish before removal.' },
        { q: 'What is congestive collapse?', a: 'Under overload, queues grow until requests exceed client timeouts; clients retry, so the server does work nobody waits for and goodput drops toward zero.' },
        { q: 'How do you size a per-instance concurrency limit?', a: 'Little\'s law: in-flight requests = throughput x latency, e.g. 2,000 RPS x 50 ms = 100, plus some headroom.' }
      ],
      resources: [
        { title: 'AWS Builders Library — Using load shedding to avoid overload', url: 'https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/', type: 'article' },
        { title: 'Kubernetes Docs — Horizontal Pod Autoscaling', url: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/', type: 'docs' },
        { title: 'gRPC Blog — Load Balancing', url: 'https://grpc.io/blog/grpc-load-balancing/', type: 'article' },
        { title: 'System Design Primer — Load balancer & scalability', url: 'https://github.com/donnemartin/system-design-primer#load-balancer', type: 'course' },
        { title: 'Google SRE Book — Handling Overload', url: 'https://sre.google/sre-book/handling-overload/', type: 'book' }
      ]
    },
    // ───────────────────────────── Module 3 ─────────────────────────────
    {
      n: 3,
      title: 'Caching',
      summary: 'Caching is the single highest-leverage tool for latency and read scalability — and a major source of subtle bugs. Learn the read/write patterns, eviction, invalidation, stampede and hot-key defences, Redis vs Memcached, CDN caching and multi-level cache hierarchies.',
      topics: [
        {
          title: 'Caching Patterns: Aside, Read-Through, Write-Through, Write-Behind, Refresh-Ahead',
          def: '<p>Where the cache sits relative to the database, and who is responsible for filling it, defines its consistency and failure behaviour.</p>' +
            '<table><thead><tr><th>Pattern</th><th>How it works</th><th>Pros</th><th>Cons</th></tr></thead><tbody>' +
            '<tr><td><strong>Cache-aside</strong> (lazy loading)</td><td>App reads cache; on miss reads DB and populates cache. Writes go to DB, then <em>delete</em> the cache key</td><td>Simple, cache only holds requested data, cache failure is non-fatal</td><td>Miss penalty (3 trips), stale window, race conditions</td></tr>' +
            '<tr><td><strong>Read-through</strong></td><td>Cache library/provider loads from DB on miss</td><td>App code simpler; central loading logic</td><td>Needs cache that supports loaders; same staleness issues</td></tr>' +
            '<tr><td><strong>Write-through</strong></td><td>Write goes to cache, which synchronously writes DB</td><td>Cache always fresh for written keys</td><td>Higher write latency; caches data that may never be read</td></tr>' +
            '<tr><td><strong>Write-behind</strong> (write-back)</td><td>Write to cache; flushed to DB asynchronously in batches</td><td>Very fast writes, absorbs bursts, coalesces updates</td><td>Data loss if cache dies before flush; complex ordering</td></tr>' +
            '<tr><td><strong>Write-around</strong></td><td>Writes go straight to DB; cache filled only on read</td><td>Avoids polluting cache with write-once data</td><td>First read after write is a miss</td></tr>' +
            '<tr><td><strong>Refresh-ahead</strong></td><td>Proactively refresh hot entries before TTL expiry</td><td>Hides miss latency for hot keys</td><td>Wasted work if predictions are wrong</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Default choice:</strong> cache-aside with TTL + delete-on-write. It degrades gracefully (cache down = slower, not broken). Use write-behind only for data that tolerates loss or has a durable log (e.g. counters, analytics), and write-through when read-after-write freshness on the cache matters.</p>' +
            '<p><strong>Why delete instead of update on write?</strong> Two concurrent writers updating cache can apply in the opposite order to the DB, leaving the cache permanently stale; deleting is idempotent and the next reader repopulates from the source of truth.</p>',
          interview: 'Name the pattern you choose and why, then volunteer its failure mode: "cache-aside; on write I update the DB then delete the key; the remaining race is bounded by a TTL". That one sentence shows you understand consistency, not just speed.',
          examples: [{
            label: 'Cache-aside in Go (read + write path)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "context"',
              '    "errors"',
              '    "fmt"',
              '    "time"',
              ')',
              '',
              'var ErrMiss = errors.New("cache miss")',
              '',
              'type Cache interface {',
              '    Get(ctx context.Context, key string) (string, error)',
              '    Set(ctx context.Context, key, val string, ttl time.Duration) error',
              '    Del(ctx context.Context, key string) error',
              '}',
              '',
              'type DB interface {',
              '    LoadUser(ctx context.Context, id string) (string, error)',
              '    SaveUser(ctx context.Context, id, data string) error',
              '}',
              '',
              'type UserRepo struct {',
              '    cache Cache',
              '    db    DB',
              '}',
              '',
              'func (r *UserRepo) Get(ctx context.Context, id string) (string, error) {',
              '    key := "user:" + id',
              '    if v, err := r.cache.Get(ctx, key); err == nil {',
              '        return v, nil // hit',
              '    }',
              '    v, err := r.db.LoadUser(ctx, id) // miss (or cache error): fall back to DB',
              '    if err != nil {',
              '        return "", err',
              '    }',
              '    _ = r.cache.Set(ctx, key, v, 10*time.Minute) // best effort',
              '    return v, nil',
              '}',
              '',
              'func (r *UserRepo) Update(ctx context.Context, id, data string) error {',
              '    if err := r.db.SaveUser(ctx, id, data); err != nil {',
              '        return err',
              '    }',
              '    return r.cache.Del(ctx, "user:"+id) // invalidate, do not update',
              '}',
              '',
              'func main() { fmt.Println("see UserRepo") }'
            ].join('\n')
          }]
        },
        {
          title: 'Eviction Policies: LRU, LFU, TTL and Friends',
          def: '<p>Caches are bounded; the eviction policy decides what to drop when full. TTL decides when data is too old even if space remains.</p>' +
            '<table><thead><tr><th>Policy</th><th>Evicts</th><th>Good for</th><th>Weakness</th></tr></thead><tbody>' +
            '<tr><td><strong>LRU</strong></td><td>Least recently used</td><td>Recency-driven workloads (sessions, feeds)</td><td>A one-off scan flushes hot items</td></tr>' +
            '<tr><td><strong>LFU</strong></td><td>Least frequently used</td><td>Stable popularity (product catalog)</td><td>Old popular items linger; needs decay</td></tr>' +
            '<tr><td><strong>FIFO</strong></td><td>Oldest inserted</td><td>Simple, cheap</td><td>Ignores access pattern</td></tr>' +
            '<tr><td><strong>Random</strong></td><td>Random key</td><td>Very cheap, surprisingly OK</td><td>Unpredictable</td></tr>' +
            '<tr><td><strong>W-TinyLFU</strong></td><td>Admission by frequency sketch + LRU windows</td><td>Mixed workloads (Caffeine, Ristretto)</td><td>More complex</td></tr>' +
            '<tr><td><strong>TTL</strong></td><td>Expired entries</td><td>Bounding staleness</td><td>Synchronised expiry → stampedes (add jitter)</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Redis specifics:</strong> <code>maxmemory-policy</code> options include <code>allkeys-lru</code>, <code>allkeys-lfu</code>, <code>volatile-lru</code> (only keys with TTL), <code>volatile-ttl</code> and <code>noeviction</code> (writes fail when full — right for Redis used as a primary store or queue). Redis LRU/LFU are <em>approximated</em> by sampling a few keys rather than maintaining an exact list, trading precision for memory.</p>' +
            '<p>Expiry is lazy (checked on access) plus active (periodic sampling), so memory is not freed exactly at TTL. Always add <strong>TTL jitter</strong> (e.g. 10 min ± 10%) so a batch of keys written together does not expire together.</p>' +
            '<p>An exact LRU is a hash map + doubly linked list, O(1) get/put — a classic LLD question (see Module 11).</p>',
          interview: 'Expect "LRU vs LFU for X?" and "implement LRU". Mention that a sequential scan pollutes LRU (scan resistance is why W-TinyLFU/2Q exist) and that Redis approximates LRU by sampling. Always pair TTLs with jitter.',
          examples: [{
            label: 'Redis eviction config + jittered TTLs in Go',
            lang: 'text',
            code: [
              '# redis.conf for a cache (not a primary store)',
              'maxmemory 12gb',
              'maxmemory-policy allkeys-lfu     # or allkeys-lru; noeviction for queues / primary data',
              'maxmemory-samples 10             # more samples = closer to true LRU/LFU, more CPU',
              '# inspect: INFO stats -> evicted_keys, keyspace_hits, keyspace_misses (hit ratio)',
              '',
              '// Go: spread expiries so keys written together do not expire together',
              'func jitteredTTL(base time.Duration, frac float64) time.Duration {',
              '    delta := time.Duration(float64(base) * frac * (2*rand.Float64() - 1)) // uniform in [-frac, +frac]',
              '    return base + delta',
              '}',
              '// rdb.Set(ctx, key, val, jitteredTTL(10*time.Minute, 0.1))  -> expires somewhere in 9m..11m'
            ].join('\n')
          }]
        },
        {
          title: 'Cache Invalidation & Consistency',
          def: '<p>&quot;There are only two hard things in computer science: cache invalidation and naming things.&quot; The cache is a <em>derived copy</em>; the question is how long it may disagree with the source of truth.</p>' +
            '<p><strong>Strategies:</strong></p>' +
            '<ul><li><strong>TTL only</strong> — simplest; staleness bounded by TTL. Fine for data where minutes of staleness are acceptable.</li>' +
            '<li><strong>Explicit delete on write</strong> — the writer deletes keys it affects. Problem: knowing every derived key (lists, aggregates).</li>' +
            '<li><strong>Event/CDC-driven invalidation</strong> — tail the DB change log (Debezium, DynamoDB Streams) and delete keys; decouples writers and catches writes from any service or script. Facebook&#39;s <em>mcsqueal</em> does this from MySQL binlogs.</li>' +
            '<li><strong>Versioned keys</strong> — embed a version (<code>product:42:v17</code>); bump the version on write; old entries age out. Great for immutable/CDN content.</li>' +
            '<li><strong>Write-through</strong> — cache updated on every write; still needs care across multiple writers.</li></ul>' +
            '<p><strong>The classic cache-aside race:</strong> (1) Reader A misses and reads value v1 from DB. (2) Writer B updates DB to v2 and deletes the key. (3) A writes the stale v1 to the cache — stale until TTL. Mitigations: short TTLs, <strong>leases</strong> (cache hands out a token on miss; a delete invalidates the token so the late set is rejected — Facebook memcache), <strong>delayed double delete</strong>, or version checks with CAS.</p>' +
            '<p>Also handle <strong>negative caching</strong> (cache &quot;not found&quot; briefly to stop repeated misses for non-existent keys — a defence against cache penetration attacks) and decide what happens on cache failure (fail open to DB with rate limiting).</p>',
          interview: 'Interviewers love the stale-set race. Draw the three-step interleaving, then offer leases or versioned writes as the real fix and TTL as the safety net. Mention CDC-based invalidation when many services write the same data.',
          examples: [{
            label: 'Versioned set-if-newer with tombstones (Redis Lua) closes the stale-set race',
            lang: 'lua',
            code: [
              '-- Writer, after committing row version V to the DB, leaves a tombstone instead of DEL:',
              '--   HSET user:42 v V tomb 1    +   EXPIRE user:42 60',
              '-- Reader, after loading the row (with its version) from the DB, fills through this script:',
              '-- KEYS[1] = key, ARGV[1] = version read from DB, ARGV[2] = value, ARGV[3] = ttl seconds',
              'local cur = redis.call(\'HGET\', KEYS[1], \'v\')',
              'if cur then',
              '  local tomb = redis.call(\'HGET\', KEYS[1], \'tomb\') == \'1\'',
              '  local new, old = tonumber(ARGV[1]), tonumber(cur)',
              '  if new < old or (new == old and not tomb) then',
              '    return 0                      -- stale (or duplicate) fill rejected',
              '  end',
              'end',
              'redis.call(\'HSET\', KEYS[1], \'v\', ARGV[1], \'data\', ARGV[2], \'tomb\', \'0\')',
              'redis.call(\'EXPIRE\', KEYS[1], ARGV[3])',
              'return 1',
              '-- The slow reader from the race carries v1 < V, so its late SET is refused.',
              '-- Versions: updated_at in microseconds, a row version column, or the commit LSN from CDC.'
            ].join('\n')
          }]
        },
        {
          title: 'Cache Stampede, Thundering Herd & Hot Keys',
          def: '<p>A <strong>cache stampede</strong> happens when a hot key expires (or the cache restarts) and thousands of concurrent requests all miss and hammer the DB to recompute the same value. A cold cache after a deploy or failover is the same problem at scale.</p>' +
            '<table><thead><tr><th>Technique</th><th>Idea</th><th>Trade-off</th></tr></thead><tbody>' +
            '<tr><td><strong>Request coalescing</strong> (singleflight)</td><td>Within a process, only one goroutine loads a key; others wait for its result</td><td>Per-instance only; N instances still send N loads</td></tr>' +
            '<tr><td><strong>Distributed lock / lease</strong></td><td>First misser acquires <code>SET key:lock NX PX 5000</code>, others wait or serve stale</td><td>Lock handling, timeouts</td></tr>' +
            '<tr><td><strong>Serve stale while revalidating</strong></td><td>Keep a soft TTL and hard TTL; after soft TTL serve old value and refresh in background</td><td>Brief staleness</td></tr>' +
            '<tr><td><strong>Probabilistic early expiration</strong> (XFetch)</td><td>Each reader recomputes early with probability rising as expiry nears</td><td>Some redundant recomputes</td></tr>' +
            '<tr><td><strong>TTL jitter</strong></td><td>Spread expiries</td><td>None really — always do it</td></tr>' +
            '<tr><td><strong>Cache warming</strong></td><td>Pre-load hot keys before traffic shift</td><td>Need to know the hot set</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Hot keys</strong> are the other face of the problem: a single key (celebrity profile, flash-sale item) gets so many requests that one cache shard saturates (a Redis shard does roughly 100K+ simple ops/s on one core). Fixes: a small <strong>in-process L1 cache</strong> with a short TTL (seconds), <strong>key replication</strong> (<code>hotkey#1..#N</code>, read a random copy, write all copies), reading from replicas, and detecting hot keys via sampling (<code>redis-cli --hotkeys</code> with LFU policy, or client-side metrics).</p>',
          interview: 'If you draw a cache in front of a DB, expect "what happens when a hot key expires?". Answer with singleflight per instance plus soft-TTL/stale-while-revalidate or a lease across instances, plus TTL jitter. For hot keys: local L1 cache and key splitting.',
          examples: [{
            label: 'Probabilistic early expiration (XFetch) in Go',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "fmt"',
              '    "math"',
              '    "math/rand/v2"',
              '    "time"',
              ')',
              '',
              'type entry struct {',
              '    value  string',
              '    delta  time.Duration // how long the last recompute took',
              '    expiry time.Time',
              '}',
              '',
              '// shouldRecompute implements XFetch (Vattani et al.): recompute early with a',
              '// probability that grows as expiry approaches. beta > 1 favours earlier refresh.',
              'func shouldRecompute(e entry, beta float64, now time.Time) bool {',
              '    // -ln(U) for U in (0,1] is an exponential random variable (always >= 0).',
              '    gap := time.Duration(float64(e.delta) * beta * -math.Log(1-rand.Float64()))',
              '    return now.Add(gap).After(e.expiry)',
              '}',
              '',
              'func main() {',
              '    e := entry{value: "v", delta: 200 * time.Millisecond, expiry: time.Now().Add(time.Second)}',
              '    early := 0',
              '    for i := 0; i < 10000; i++ {',
              '        if shouldRecompute(e, 1.0, time.Now()) {',
              '            early++',
              '        }',
              '    }',
              '    fmt.Printf("%.2f%% of readers would refresh now\\n", float64(early)/100)',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Distributed Caches: Redis vs Memcached',
          def: '<table><thead><tr><th>Aspect</th><th>Redis (and Valkey)</th><th>Memcached</th></tr></thead><tbody>' +
            '<tr><td>Data model</td><td>Strings, hashes, lists, sets, sorted sets, streams, bitmaps, HyperLogLog, geo</td><td>Opaque byte blobs (key → value)</td></tr>' +
            '<tr><td>Threading</td><td>Single-threaded command execution (I/O threads optional) — atomic ops, Lua scripts</td><td>Multi-threaded; scales vertically on many cores</td></tr>' +
            '<tr><td>Persistence</td><td>RDB snapshots, AOF log</td><td>None (pure cache)</td></tr>' +
            '<tr><td>Replication / HA</td><td>Replicas, Sentinel, Redis Cluster (16,384 hash slots)</td><td>None built in; client-side consistent hashing</td></tr>' +
            '<tr><td>Extras</td><td>Pub/sub, TTL per key, transactions, rate-limit primitives</td><td>Simple, predictable memory (slab allocator)</td></tr>' +
            '<tr><td>Use when</td><td>Need data structures, leaderboards, counters, locks, queues</td><td>Huge simple object cache, multi-core efficiency</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Redis Cluster</strong> shards keys by <code>CRC16(key) mod 16384</code> hash slots spread over primaries, each with replicas; failover is automatic. Multi-key operations need all keys in one slot — force co-location with <strong>hash tags</strong>: <code>{user:42}:cart</code> and <code>{user:42}:profile</code>. Replication is asynchronous, so acknowledged writes can be lost on failover; do not treat Redis as a strongly consistent store.</p>' +
            '<p><strong>Ecosystem note:</strong> after Redis changed its licence in 2024, the Linux Foundation fork <strong>Valkey</strong> became the default in several managed services (e.g. AWS ElastiCache/MemoryDB offer Valkey); Redis 8 later added an AGPL option. APIs remain compatible for interview purposes.</p>' +
            '<p><strong>Sizing:</strong> memory = keys × (key + value + ~50–100 B overhead); plan for a replica per shard and keep usage under ~70% to allow fragmentation and failover.</p>',
          interview: 'Know why you would pick each, how Redis Cluster shards (hash slots, hash tags), and that replication is async so Redis locks and counters can lose writes on failover. Interviewers also probe "what if the whole cache cluster goes down?" — answer: DB protection via rate limiting, circuit breaker, and gradual warm-up.',
          examples: [{
            label: 'Redis Cluster slots, hash tags and a sizing check',
            lang: 'bash',
            code: [
              '$ redis-cli -c MSET user:42:cart a user:42:profile b',
              '(error) CROSSSLOT Keys in request don\'t hash to the same slot',
              '$ redis-cli -c MSET {user:42}:cart a {user:42}:profile b      # only "user:42" is hashed',
              'OK',
              '$ redis-cli -c CLUSTER KEYSLOT {user:42}:cart                   # CRC16("user:42") mod 16384',
              '$ redis-cli --hotkeys                                           # needs an LFU maxmemory-policy',
              '',
              '# Sizing: 100M keys x (40 B key + 300 B value + ~70 B overhead) ~= 41 GB',
              '#   / 0.7 target fill ~= 58 GB of primaries -> 4 shards x 16 GB, + 1 replica each = 8 nodes',
              '#   Throughput: 4 shards x ~100K simple ops/s ~= 400K ops/s before pipelining',
              '# Memcached alternative: ~41 GB over 3 x 16 GB multi-threaded nodes, client-side consistent',
              '#   hashing, no replicas (a node loss = cold misses for ~1/3 of keys)'
            ].join('\n')
          }]
        },
        {
          title: 'CDN Caching & Multi-Level Caching',
          def: '<p>A <strong>CDN</strong> caches responses at edge PoPs close to users, cutting latency (tens of ms vs 100+ ms) and origin load. Static assets are the easy case; dynamic APIs can be cached too with care.</p>' +
            '<ul><li><code>Cache-Control: public, max-age=31536000, immutable</code> for content-hashed assets (<code>app.3f9a.js</code>) — never invalidate, just change the name.</li>' +
            '<li><code>s-maxage</code> sets shared-cache (CDN) TTL separately from browsers; <code>stale-while-revalidate</code> and <code>stale-if-error</code> serve old content during refresh or origin failure.</li>' +
            '<li><code>Cache-Control: private</code> or <code>no-store</code> for personalised or sensitive responses. <code>Vary</code> and the <strong>cache key</strong> (host, path, normalised query, selected headers) decide what is shared — a wrong cache key can leak one user&#39;s data to another.</li>' +
            '<li>Invalidation: purge by URL or surrogate key/tag; purges take seconds to propagate.</li>' +
            '<li><strong>Origin shield</strong>: a mid-tier cache in front of the origin so misses from hundreds of PoPs collapse into one fetch.</li></ul>' +
            '<p><strong>Multi-level caching</strong> stacks caches along the request path; each level is checked in order and a miss falls through to the next (note the in-process cache sits <em>after</em> the CDN on the path but is far faster than it):</p>' +
            '<table><thead><tr><th>Level</th><th>Example</th><th>Latency</th><th>Scope</th></tr></thead><tbody>' +
            '<tr><td>L0</td><td>Browser / mobile app cache</td><td>0</td><td>One user</td></tr>' +
            '<tr><td>L1</td><td>CDN edge</td><td>~10–30 ms from user</td><td>Region of users</td></tr>' +
            '<tr><td>L2</td><td>In-process cache in the service</td><td>~100 ns</td><td>One pod</td></tr>' +
            '<tr><td>L3</td><td>Redis/Memcached cluster</td><td>~0.5–1 ms</td><td>All pods</td></tr>' +
            '<tr><td>Source</td><td>Database / DB buffer pool</td><td>~1–10 ms</td><td>Truth</td></tr>' +
            '</tbody></table>' +
            '<p>Each level multiplies staleness and invalidation complexity: keep in-process TTLs short (seconds) and use pub/sub to broadcast invalidations if needed.</p>',
          interview: 'For read-heavy public content, start the design at the CDN. Be able to explain Cache-Control directives, immutable versioned assets, origin shield, and the danger of wrong cache keys leaking personalised data.',
          examples: [{
            label: 'Cache-Control per resource type',
            lang: 'http',
            code: [
              '# Fingerprinted static asset (app.3f9a.js, logo.8c1d.png): cache for a year, never revalidate',
              'Cache-Control: public, max-age=31536000, immutable',
              '',
              '# Product JSON shared by all users: CDN keeps it 60 s, browsers revalidate,',
              '# serve stale while refreshing and for a day if the origin is down',
              'Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=30, stale-if-error=86400',
              'Surrogate-Key: product-42 category-7     # purge by tag (Fastly; Cloudflare uses Cache-Tag)',
              '',
              '# Personalised page, cart, anything that sets cookies: never in a shared cache',
              'Cache-Control: private, no-store',
              '',
              '# Same URL varies by language: add only that header to the cache key',
              'Vary: Accept-Language'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'Pick a caching pattern for four scenarios',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li><strong>User profile reads (100:1):</strong> cache-aside + TTL + delete on write.</li><li><strong>Page view counters:</strong> write-behind — increment in Redis, flush to DB every few seconds; loss of a few increments acceptable.</li><li><strong>Shopping cart that must survive:</strong> Redis with AOF persistence or write-through to DB; not pure cache.</li><li><strong>Top-10 trending list recomputed hourly:</strong> refresh-ahead / precompute and write to cache.</li></ul>'
        },
        {
          t: 'Explain the stale-set race in cache-aside',
          d: 'easy',
          type: 'concept',
          hint: '<ol><li>Reader misses, reads v1 from DB (slow).</li><li>Writer writes v2 to DB, deletes cache key.</li><li>Reader sets v1 in cache → stale until TTL.</li></ol><p>Fixes: leases (token invalidated by delete), CAS with version, delayed double delete, short TTL as safety net. Also explain why <em>updating</em> the cache on write is worse than deleting (concurrent writers reorder).</p>'
        },
        {
          t: 'TTL cache with lazy and background expiry',
          d: 'easy',
          type: 'coding',
          hint: '<ul><li>Map of key → {value, expiresAt} guarded by <code>sync.RWMutex</code>.</li><li>Lazy: on <code>Get</code>, treat expired entries as missing.</li><li>Active: a janitor goroutine with <code>time.Ticker</code> sweeps expired keys; stop it with a <code>done</code> channel to avoid goroutine leaks.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "sync"',
            '    "time"',
            ')',
            '',
            'type item struct {',
            '    val       any',
            '    expiresAt time.Time',
            '}',
            '',
            'type TTLCache struct {',
            '    mu    sync.RWMutex',
            '    items map[string]item',
            '    done  chan struct{}',
            '}',
            '',
            'func NewTTLCache(sweep time.Duration) *TTLCache {',
            '    c := &TTLCache{items: make(map[string]item), done: make(chan struct{})}',
            '    go c.janitor(sweep)',
            '    return c',
            '}',
            '',
            'func (c *TTLCache) Set(k string, v any, ttl time.Duration) {',
            '    c.mu.Lock()',
            '    c.items[k] = item{val: v, expiresAt: time.Now().Add(ttl)}',
            '    c.mu.Unlock()',
            '}',
            '',
            'func (c *TTLCache) Get(k string) (any, bool) {',
            '    c.mu.RLock()',
            '    it, ok := c.items[k]',
            '    c.mu.RUnlock()',
            '    if !ok || time.Now().After(it.expiresAt) {',
            '        return nil, false // lazy expiry',
            '    }',
            '    return it.val, true',
            '}',
            '',
            'func (c *TTLCache) janitor(every time.Duration) {',
            '    t := time.NewTicker(every)',
            '    defer t.Stop()',
            '    for {',
            '        select {',
            '        case <-t.C:',
            '            now := time.Now()',
            '            c.mu.Lock()',
            '            for k, it := range c.items {',
            '                if now.After(it.expiresAt) {',
            '                    delete(c.items, k)',
            '                }',
            '            }',
            '            c.mu.Unlock()',
            '        case <-c.done:',
            '            return',
            '        }',
            '    }',
            '}',
            '',
            'func (c *TTLCache) Close() { close(c.done) }',
            '',
            'func main() {',
            '    c := NewTTLCache(50 * time.Millisecond)',
            '    defer c.Close()',
            '    c.Set("a", 1, 100*time.Millisecond)',
            '    v, ok := c.Get("a")',
            '    fmt.Println(v, ok) // 1 true',
            '    time.Sleep(150 * time.Millisecond)',
            '    _, ok = c.Get("a")',
            '    fmt.Println(ok) // false',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Implement request coalescing (singleflight)',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li>Map key → in-flight <code>*call</code> (WaitGroup + result + error), guarded by a mutex.</li><li>First caller creates the call, runs <code>fn</code>, stores the result, <code>wg.Done()</code>, removes the key.</li><li>Later callers find the call, release the lock, <code>wg.Wait()</code>, return the shared result.</li><li>Production: <code>golang.org/x/sync/singleflight</code> (also has <code>DoChan</code> and <code>Forget</code>).</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "sync"',
            '    "sync/atomic"',
            '    "time"',
            ')',
            '',
            'type call struct {',
            '    wg  sync.WaitGroup',
            '    val any',
            '    err error',
            '}',
            '',
            'type Group struct {',
            '    mu sync.Mutex',
            '    m  map[string]*call',
            '}',
            '',
            '// Do runs fn once per key among concurrent callers; shared reports whether',
            '// the result was produced by another caller.',
            'func (g *Group) Do(key string, fn func() (any, error)) (v any, err error, shared bool) {',
            '    g.mu.Lock()',
            '    if g.m == nil {',
            '        g.m = make(map[string]*call)',
            '    }',
            '    if c, ok := g.m[key]; ok {',
            '        g.mu.Unlock()',
            '        c.wg.Wait()',
            '        return c.val, c.err, true',
            '    }',
            '    c := &call{}',
            '    c.wg.Add(1)',
            '    g.m[key] = c',
            '    g.mu.Unlock()',
            '',
            '    c.val, c.err = fn()',
            '    c.wg.Done()',
            '',
            '    g.mu.Lock()',
            '    delete(g.m, key)',
            '    g.mu.Unlock()',
            '    return c.val, c.err, false',
            '}',
            '',
            'func main() {',
            '    var g Group',
            '    var dbHits atomic.Int32',
            '    var wg sync.WaitGroup',
            '    for i := 0; i < 100; i++ {',
            '        wg.Add(1)',
            '        go func() {',
            '            defer wg.Done()',
            '            g.Do("user:42", func() (any, error) {',
            '                dbHits.Add(1)',
            '                time.Sleep(50 * time.Millisecond) // slow DB',
            '                return "alice", nil',
            '            })',
            '        }()',
            '    }',
            '    wg.Wait()',
            '    fmt.Println("db hits:", dbHits.Load()) // typically 1',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Mitigate a hot key during a celebrity event',
          d: 'medium',
          type: 'design',
          hint: '<ul><li><strong>Detect</strong>: client-side sampling of key access, Redis LFU + <code>--hotkeys</code>, per-shard CPU alarms.</li><li><strong>L1 in-process cache</strong> with 1–5 s TTL: 100 pods each hitting Redis once per few seconds instead of 100K times.</li><li><strong>Key splitting</strong>: store N copies <code>post:9#0..#7</code> on different shards; readers pick random suffix; writers update all.</li><li><strong>Read from replicas</strong> for the hot shard.</li><li>For hot <em>write</em> keys (like counters): shard the counter into N sub-counters and sum on read, or buffer increments locally and flush.</li></ul>'
        },
        {
          t: 'Size a Redis cluster for 100M sessions',
          d: 'medium',
          type: 'concept',
          hint: '<ul><li>Session: key 40 B + value 500 B + overhead ~80 B ≈ 620 B → 100M × 620 B ≈ <strong>62 GB</strong>.</li><li>Keep usage ≤ 70% → ~90 GB of RAM across primaries; e.g. 6 primaries × 16 GB usable, each with 1 replica = 12 nodes.</li><li>Throughput: 50K req/s is easy for 6 shards (~100K+ ops/s each).</li><li>TTL = session lifetime with sliding renewal; eviction policy <code>volatile-lru</code>; persistence optional (losing sessions = re-login).</li></ul>'
        },
        {
          t: 'CDN strategy for an e-commerce product page',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Split the page: static shell + images (CDN, long TTL, versioned URLs) vs product data (short <code>s-maxage</code> 60 s + <code>stale-while-revalidate</code>) vs price/stock and cart (uncached or per-user API calls).</li><li>Purge product data by surrogate key on catalog updates.</li><li>Never cache responses with <code>Set-Cookie</code> or personalised data in a shared cache; correct cache keys and <code>Vary</code>.</li><li>Origin shield to collapse misses; image resizing at the edge.</li></ul>'
        },
        {
          t: 'Protect the DB when the whole cache cluster restarts',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Cold cache = every request misses → DB overload → cascading failure.</li><li>Defences: singleflight per instance, DB-side concurrency limiter/circuit breaker so excess requests fail fast or serve degraded responses.</li><li>Warm-up: replay recent hot keys from logs; shift traffic gradually.</li><li>Prevent full loss: replicas per shard, persistence (RDB), multi-AZ, avoid simultaneous restarts.</li></ul>'
        },
        {
          t: 'Keep caches consistent with the DB using CDC',
          d: 'hard',
          type: 'design',
          hint: '<ol><li>Writers only write the DB (single source of truth).</li><li>Debezium tails the WAL/binlog → Kafka topic per table, ordered per primary key (partition by key).</li><li>Invalidator consumers map row changes → cache keys (including derived keys, e.g. list pages) and delete them; idempotent and replayable.</li><li>Handle the stale-set race with versions: cache value carries row version (LSN or <code>updated_at</code>); set only if newer (Lua CAS).</li><li>Monitor consumer lag = staleness SLI; TTL as safety net.</li></ol>'
        },
        {
          t: 'Design a distributed cache service at large scale',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>API:</strong> get/set/delete with TTL, multi-get.</li><li><strong>Partitioning:</strong> consistent hashing with virtual nodes (client library or proxy such as mcrouter/twemproxy/Envoy).</li><li><strong>Replication:</strong> async replica per shard; regional pools for hot data.</li><li><strong>Eviction:</strong> per-node LRU/W-TinyLFU, slab allocation to limit fragmentation.</li><li><strong>Consistency:</strong> leases to stop stale sets and thundering herds; CDC-driven invalidation across regions.</li><li><strong>Failure:</strong> gutter pool for failed nodes, client timeouts ~ms, no automatic rehash storms.</li><li>Reference: Facebook&#39;s &quot;Scaling Memcache at Facebook&quot; (NSDI 2013).</li></ul>'
        }
      ],
      interviewFocus: [
        {
          q: 'How do you prevent a cache stampede on a very hot key?',
          a: '<ol><li><strong>TTL jitter</strong> so related keys do not expire together.</li><li><strong>Request coalescing</strong> (singleflight) per instance so only one goroutine loads.</li><li><strong>Cross-instance protection</strong>: a short Redis lock/lease (<code>SET k:lock NX PX</code>); losers wait briefly or serve the stale value.</li><li><strong>Soft + hard TTL</strong> (stale-while-revalidate) or <strong>XFetch</strong> probabilistic early refresh so the key is refreshed <em>before</em> it disappears.</li><li><strong>Refresh-ahead</strong> for a known hot set.</li></ol><p>And protect the DB anyway with a concurrency limiter in case the cache is lost entirely.</p>'
        },
        {
          q: 'Cache-aside: should you update or delete the cache on write? Should you write the DB or the cache first?',
          a: '<p><strong>Write DB first, then delete the cache key.</strong></p><ul><li>Cache first then DB: if the DB write fails, the cache holds a value that never existed; and readers can repopulate the old value before the DB commits.</li><li>Update vs delete: two writers W1, W2 can commit to the DB as W1→W2 but update the cache as W2→W1, leaving the cache permanently wrong. Delete is idempotent and order-insensitive.</li></ul><p>The remaining stale-set race (slow reader sets an old value after the delete) is closed by leases/versioned CAS and bounded by TTL. If the delete itself fails, retry via an outbox or CDC-based invalidation.</p>'
        },
        {
          q: 'When would you NOT add a cache?',
          a: '<ul><li>Low read:write ratio — invalidation churn exceeds benefit.</li><li>Strong consistency required (balances, inventory decrements) — read the source of truth or use a strongly consistent store.</li><li>Uniformly random access over a dataset much larger than RAM — hit ratio would be poor.</li><li>The DB already serves the load within SLO — caching adds a dependency, staleness bugs and operational cost.</li><li>Security/compliance concerns about copying sensitive data.</li></ul><p>Always measure hit ratio; a cache under ~80% hit ratio for hot paths deserves scrutiny.</p>'
        },
        {
          q: 'Compare Redis and Memcached and explain Redis Cluster sharding.',
          a: '<p>Memcached is a multi-threaded, pure in-memory blob cache with no persistence or replication — simple and efficient. Redis offers rich data structures, persistence, replication, Lua scripting and pub/sub, with single-threaded command execution giving atomic operations.</p><p>Redis Cluster splits the keyspace into <strong>16,384 hash slots</strong> (<code>CRC16(key) mod 16384</code>), assigns slot ranges to primaries, and redirects clients with <code>MOVED</code>/<code>ASK</code> during resharding. Multi-key commands require keys in the same slot, achieved with hash tags (<code>{user:1}</code>). Replication is asynchronous, so a failover can lose acknowledged writes — hence Redis-based locks need fencing tokens for correctness.</p>'
        },
        {
          q: 'Design the caching layers for a read-heavy global news site.',
          a: '<ul><li><strong>CDN</strong> for article HTML/JSON with short <code>s-maxage</code> (30–60 s) and <code>stale-while-revalidate</code>; images and assets immutable with content hashes.</li><li><strong>Origin shield</strong> to collapse PoP misses.</li><li><strong>Service L1</strong> in-process cache (seconds) for hot articles and config.</li><li><strong>Redis</strong> for rendered fragments, counters, personalised sections keyed by user segment, not user.</li><li><strong>Invalidation</strong>: CMS publish event → purge CDN by surrogate key + delete Redis keys.</li><li><strong>Breaking news</strong>: expect stampedes — pre-warm, coalesce, and serve stale on origin errors (<code>stale-if-error</code>).</li></ul>'
        }
      ],
      quiz: [
        { q: 'In cache-aside, who populates the cache?', a: 'The application, on a cache miss, after reading from the database.' },
        { q: 'What is the main risk of write-behind caching?', a: 'Data loss if the cache fails before dirty entries are flushed to the database.' },
        { q: 'Why add jitter to TTLs?', a: 'To avoid many keys expiring at the same moment and causing a synchronized stampede on the database.' },
        { q: 'How many hash slots does Redis Cluster use?', a: '16,384, assigned via CRC16(key) mod 16384.' },
        { q: 'What does stale-while-revalidate do?', a: 'Lets a cache serve a stale response while it fetches a fresh one in the background.' },
        { q: 'What is negative caching?', a: 'Caching "not found" results briefly so repeated lookups for missing keys do not hit the database.' },
        { q: 'Which Redis maxmemory policy should a Redis used as a durable queue use?', a: 'noeviction, so writes fail rather than silently dropping data.' },
        { q: 'How do you co-locate related keys in Redis Cluster?', a: 'Use hash tags: only the part inside {braces} is hashed, e.g. {user:42}:cart.' }
      ],
      resources: [
        { title: 'AWS Builders Library — Caching challenges and strategies', url: 'https://aws.amazon.com/builders-library/caching-challenges-and-strategies/', type: 'article' },
        { title: 'Scaling Memcache at Facebook (NSDI 2013)', url: 'https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala', type: 'article' },
        { title: 'Redis Docs — Key eviction', url: 'https://redis.io/docs/latest/develop/reference/eviction/', type: 'docs' },
        { title: 'MDN — HTTP caching', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 4 ─────────────────────────────
    {
      n: 4,
      title: 'Databases & Data Scaling',
      summary: 'Choosing and scaling the data layer: SQL vs the NoSQL families, how indexes really work, replication topologies and lag, partitioning strategies, consistent hashing, resharding, denormalization, hot partitions and multi-tenant data isolation. Most HLD deep dives end up here.',
      topics: [
        {
          title: 'SQL vs NoSQL and the NoSQL Families',
          def: '<p><strong>Relational (SQL)</strong> databases give a flexible query language, joins, ACID transactions and strong schemas — the right default for most business data. <strong>NoSQL</strong> trades some of that for horizontal scale, flexible schemas or specialised access patterns. The real question is always: <em>what are the access patterns, consistency needs and scale?</em></p>' +
            '<table><thead><tr><th>Type</th><th>Model</th><th>Examples</th><th>Sweet spot</th><th>Watch out</th></tr></thead><tbody>' +
            '<tr><td>Relational</td><td>Tables, joins, ACID</td><td>PostgreSQL, MySQL</td><td>Transactions, complex queries, integrity</td><td>Write scale beyond one primary needs sharding</td></tr>' +
            '<tr><td>Distributed SQL</td><td>SQL over sharded consensus groups</td><td>Spanner, CockroachDB, YugabyteDB, TiDB</td><td>Global scale + transactions</td><td>Higher write latency, cost</td></tr>' +
            '<tr><td>Key-value</td><td>key → value</td><td>Redis, DynamoDB, etcd</td><td>Lookups by key, sessions, carts, config</td><td>No ad-hoc queries</td></tr>' +
            '<tr><td>Document</td><td>JSON-like docs</td><td>MongoDB, Couchbase, Firestore</td><td>Aggregates read together, evolving schema</td><td>Cross-document joins, duplication</td></tr>' +
            '<tr><td>Wide-column</td><td>Partition key + clustering columns</td><td>Cassandra, ScyllaDB, HBase, Bigtable</td><td>Massive write throughput, time-ordered data per key</td><td>Query-first modelling; no joins</td></tr>' +
            '<tr><td>Graph</td><td>Nodes + edges</td><td>Neo4j, Amazon Neptune</td><td>Multi-hop relationships, fraud rings</td><td>Sharding graphs is hard</td></tr>' +
            '<tr><td>Time-series</td><td>Timestamped points</td><td>Prometheus, InfluxDB, TimescaleDB</td><td>Metrics, IoT, downsampling, retention</td><td>High-cardinality labels</td></tr>' +
            '<tr><td>Search</td><td>Inverted index</td><td>Elasticsearch, OpenSearch</td><td>Full-text, faceting</td><td>Not a source of truth</td></tr>' +
            '</tbody></table>' +
            '<p>Most real systems are <strong>polyglot</strong>: Postgres for orders, Redis for sessions, Elasticsearch for search, S3 for blobs, a warehouse for analytics — kept in sync via events/CDC. The lines have blurred: Postgres has JSONB, MongoDB has multi-document ACID transactions, DynamoDB has transactions.</p>',
          interview: 'Never say "NoSQL because it scales". Say "access pattern X by key at Y writes/s with no cross-entity transactions, so a wide-column store partitioned by Z fits; orders need transactions so they stay in Postgres". Justify per data type.',
          examples: [{
            label: 'Same access patterns, two data models',
            lang: 'text',
            code: [
              'Access patterns: (1) get order by id   (2) a customer\'s orders, newest first   (3) revenue per day',
              '',
              'Relational (PostgreSQL)',
              '  customers(id PK, email UNIQUE, ...)',
              '  orders(id PK, customer_id FK, status, total_cents, created_at)',
              '  order_items(order_id FK, sku, qty, price_cents)',
              '  INDEX orders(customer_id, created_at DESC)            -- serves (2)',
              '  (3) = ad-hoc GROUP BY today, a warehouse tomorrow',
              '  + transactions across orders/items/inventory, constraints, joins, new queries without remodelling',
              '',
              'Key-value / wide-column (DynamoDB single-table design)',
              '  PK = CUSTOMER#123   SK = ORDER#2026-10-29T10:00Z#o987   -> (2) one Query, newest first',
              '  PK = ORDER#o987     SK = META | ITEM#sku1 | ITEM#sku2     -> (1) one Query returns order + items',
              '  (3) not served: stream changes (DynamoDB Streams / CDC) to a warehouse',
              '  + single-digit ms at any scale, no joins needed; - every new query shape needs a new key or GSI'
            ].join('\n')
          }]
        },
        {
          title: 'Indexing: B-Trees, LSM-Trees and Index Design',
          def: '<p>An index trades write cost and storage for faster reads. Two storage-engine families dominate:</p>' +
            '<table><thead><tr><th></th><th>B+tree</th><th>LSM-tree</th></tr></thead><tbody>' +
            '<tr><td>Used by</td><td>PostgreSQL, MySQL InnoDB, most RDBMS</td><td>Cassandra, ScyllaDB, RocksDB, LevelDB, HBase</td></tr>' +
            '<tr><td>Writes</td><td>In-place page updates (random I/O) + WAL</td><td>Append to memtable + WAL, flush sorted SSTables (sequential I/O)</td></tr>' +
            '<tr><td>Reads</td><td>O(log n), predictable</td><td>May check several SSTables; bloom filters help</td></tr>' +
            '<tr><td>Amplification</td><td>Write amplification from page writes</td><td>Compaction write amplification, read amplification</td></tr>' +
            '<tr><td>Best for</td><td>Read-heavy, mixed OLTP</td><td>Write-heavy, time-series, ingest</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Index design rules:</strong></p>' +
            '<ul><li><strong>Composite index leftmost prefix</strong>: index on <code>(tenant_id, status, created_at)</code> serves <code>WHERE tenant_id=? AND status=? ORDER BY created_at</code> but not <code>WHERE status=?</code> alone. Put equality columns first, then range/sort columns.</li>' +
            '<li><strong>Covering index</strong> (includes all selected columns) avoids heap lookups — index-only scans.</li>' +
            '<li><strong>Selectivity</strong> matters: an index on a boolean column rarely helps.</li>' +
            '<li>Every index slows writes and consumes memory; drop unused ones.</li>' +
            '<li><strong>Keyset pagination</strong> (<code>WHERE created_at &lt; ? ORDER BY created_at DESC LIMIT 20</code>) uses the index; <code>OFFSET 100000</code> scans and discards rows.</li></ul>' +
            '<p>In a sharded system, secondary indexes are either <strong>local</strong> (each shard indexes its own data → reads scatter-gather to all shards) or <strong>global</strong> (index partitioned by the indexed value → single-shard reads but writes update another partition, usually asynchronously).</p>',
          interview: 'Common probes: "why is this query slow?" (missing/unused index, OFFSET pagination, function on indexed column), "B-tree vs LSM?" (read vs write optimised), and "how do secondary indexes work when sharded?" (local scatter-gather vs global async).',
          examples: [{
            label: 'Index for a hot query + keyset pagination',
            lang: 'text',
            code: [
              '-- Query: latest orders for a tenant with a given status',
              'SELECT id, total, created_at FROM orders',
              ' WHERE tenant_id = $1 AND status = $2 AND created_at < $3',
              ' ORDER BY created_at DESC LIMIT 20;',
              '',
              '-- Equality columns first, then the sort/range column; INCLUDE makes it covering (Postgres 11+)',
              'CREATE INDEX CONCURRENTLY idx_orders_tenant_status_created',
              '  ON orders (tenant_id, status, created_at DESC) INCLUDE (total);',
              '',
              '-- Verify with: EXPLAIN (ANALYZE, BUFFERS) ... -> expect Index Only Scan'
            ].join('\n')
          }]
        },
        {
          title: 'Replication: Leader-Follower, Multi-Leader, Leaderless & Replication Lag',
          def: '<p>Replication keeps copies of data on multiple nodes for <strong>availability</strong>, <strong>read scaling</strong> and <strong>locality</strong>.</p>' +
            '<table><thead><tr><th>Topology</th><th>How writes work</th><th>Examples</th><th>Trade-offs</th></tr></thead><tbody>' +
            '<tr><td><strong>Single leader</strong></td><td>All writes to the leader; followers apply its log (sync or async)</td><td>Postgres, MySQL, MongoDB replica sets, Kafka partitions</td><td>Simple, no write conflicts; write throughput bounded by leader; failover needed</td></tr>' +
            '<tr><td><strong>Multi-leader</strong></td><td>Several leaders (e.g. one per region) accept writes and replicate to each other</td><td>Multi-region active-active setups, DynamoDB global tables (default eventual mode), CouchDB</td><td>Local writes in each region; <strong>conflicts</strong> (LWW, CRDTs, app-level merge)</td></tr>' +
            '<tr><td><strong>Leaderless</strong></td><td>Client/coordinator writes to N replicas, succeeds on W acks; reads from R</td><td>Cassandra, ScyllaDB, Riak, original Dynamo</td><td>High availability, tunable consistency; read repair, hinted handoff, anti-entropy (Merkle trees)</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Sync vs async:</strong> synchronous replicas guarantee no data loss on leader failure but add latency and reduce availability; async is fast but can lose the last writes on failover. A common compromise is <strong>semi-synchronous</strong> (one sync follower, rest async).</p>' +
            '<p><strong>Replication lag anomalies with async read replicas:</strong></p>' +
            '<ul><li><strong>Read-your-writes</strong> violated: user updates profile, refresh reads a lagging replica, change &quot;disappears&quot;. Fix: read own data from the leader for a short window after writing, or track the write&#39;s LSN/timestamp and read from a replica that has caught up.</li>' +
            '<li><strong>Monotonic reads</strong> violated: successive reads hit different replicas and time goes backwards. Fix: pin a user to one replica (hash user ID).</li>' +
            '<li><strong>Consistent prefix</strong>: seeing an answer before the question in partitioned systems. Fix: causally related writes to the same partition.</li></ul>' +
            '<p><strong>Failover hazards:</strong> lost async writes, split brain (two leaders), and stale leaders still accepting writes — prevented with consensus-based leader election and fencing.</p>',
          interview: 'Be ready to explain read-your-writes with replicas — it is the most common follow-up when you add read replicas. Also explain why async replication + automatic failover can lose acknowledged writes and how semi-sync or consensus (Raft) avoids it.',
          examples: [{
            label: 'Postgres: measure lag and implement read-your-writes with LSN tokens',
            lang: 'sql',
            code: [
              '-- On the primary: how far behind is each replica?',
              'SELECT application_name, state, sync_state,',
              '       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS bytes_behind, replay_lag',
              'FROM pg_stat_replication;',
              '',
              '-- Read-your-writes:',
              '-- 1) right after the user\'s write commits on the primary, capture the WAL position',
              'SELECT pg_current_wal_lsn();                         -- e.g. 3/5A1C2B8 -> store in session/cookie',
              '-- 2) before serving that user\'s read from a replica',
              'SELECT pg_last_wal_replay_lsn() >= \'3/5A1C2B8\'::pg_lsn AS caught_up;',
              '--    true -> read here; false -> wait a few ms or read from the primary',
              '-- MySQL equivalent: GTIDs + WAIT_FOR_EXECUTED_GTID_SET(); Aurora/managed proxies offer similar options'
            ].join('\n')
          }]
        },
        {
          title: 'Partitioning / Sharding Strategies & Resharding',
          def: '<p><strong>Sharding</strong> splits data across nodes so each holds a subset; it scales storage and write throughput (Z-axis). The <strong>shard key</strong> is the most important and least reversible decision.</p>' +
            '<table><thead><tr><th>Strategy</th><th>How</th><th>Pros</th><th>Cons</th></tr></thead><tbody>' +
            '<tr><td><strong>Range</strong></td><td>Contiguous key ranges per shard (A–F, G–M…)</td><td>Efficient range scans, ordered data</td><td>Hot spots on sequential keys (timestamps, auto-increment)</td></tr>' +
            '<tr><td><strong>Hash</strong></td><td><code>hash(key)</code> → shard (mod N or consistent hashing)</td><td>Even distribution</td><td>Range queries scatter to all shards</td></tr>' +
            '<tr><td><strong>Directory / lookup</strong></td><td>Lookup service maps key → shard</td><td>Flexible placement, move tenants individually</td><td>Extra hop; directory must be HA and cached</td></tr>' +
            '<tr><td><strong>Geo / entity</strong></td><td>By region or tenant</td><td>Data residency, locality</td><td>Uneven sizes (big tenants)</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Choosing a shard key:</strong> high cardinality, even access distribution, and aligned with the dominant query so most queries hit one shard (<code>user_id</code> for a user&#39;s data, <code>conversation_id</code> for chat). Compound keys (<code>tenant_id + hash</code>) can spread a giant tenant.</p>' +
            '<p><strong>Problems sharding introduces:</strong> cross-shard joins and transactions (avoid by design, or use sagas/2PC), global secondary indexes, globally unique IDs (Snowflake), uneven shards and <strong>celebrity hot spots</strong>, and operational complexity (backups, schema migrations per shard).</p>' +
            '<p><strong>Resharding without downtime:</strong></p>' +
            '<ol><li>Prefer <strong>many logical partitions</strong> (e.g. 1,024) mapped to fewer physical nodes; rebalancing then moves whole partitions instead of rehashing keys.</li>' +
            '<li>To split: snapshot-copy the partition to the new node, stream changes (CDC/replication) until caught up, briefly pause writes or use dual-writes, flip the routing map, verify, then delete old data.</li>' +
            '<li>Tools: Vitess resharding workflows, Citus shard moves, DynamoDB/Spanner/CockroachDB auto-split by size and load.</li></ol>',
          interview: 'Interviewers will ask "what is your shard key and why?" and then "what about a celebrity / huge tenant?" and "how do you add shards later?". Answer with key choice tied to queries, hot-spot mitigation (key salting, splitting hot partitions), and logical partitions for painless rebalancing.',
          examples: [{
            label: 'Logical partitions mapped to physical shards (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "fmt"',
              '    "hash/fnv"',
              ')',
              '',
              'const logicalPartitions = 1024 // fixed forever; only the partition -> shard map changes',
              '',
              'func partitionOf(key string) int {',
              '    h := fnv.New32a()',
              '    h.Write([]byte(key))',
              '    return int(h.Sum32() % logicalPartitions)',
              '}',
              '',
              '// Router maps logical partitions to physical shards. In production the map lives in',
              '// etcd or a config service and every app instance caches it (directory-based routing).',
              'type Router struct{ owner [logicalPartitions]string }',
              '',
              'func (r *Router) ShardFor(key string) string { return r.owner[partitionOf(key)] }',
              '',
              '// Move reassigns one partition after its data was copied and caught up via CDC.',
              'func (r *Router) Move(p int, to string) { r.owner[p] = to }',
              '',
              'func main() {',
              '    var r Router',
              '    for p := 0; p < logicalPartitions; p++ {',
              '        r.owner[p] = fmt.Sprintf("db-%d", p%4) // 4 physical shards x 256 partitions',
              '    }',
              '    p := partitionOf("tenant-42")',
              '    fmt.Println("tenant-42 -> partition", p, "->", r.ShardFor("tenant-42"))',
              '    r.Move(p, "db-4") // add a 5th shard by moving whole partitions; no key is rehashed',
              '    fmt.Println("after move ->", r.ShardFor("tenant-42"))',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Consistent Hashing with Virtual Nodes',
          def: '<p>With <code>hash(key) mod N</code>, changing N remaps almost every key (going from 4 to 5 nodes moves ~80% of keys) — a disaster for caches and data stores. <strong>Consistent hashing</strong> places nodes and keys on a hash ring (e.g. 0..2<sup>32</sup>−1); a key belongs to the first node clockwise. Adding or removing a node only moves keys between it and its neighbour: about <strong>1/N</strong> of keys.</p>' +
            '<p><strong>Virtual nodes (vnodes):</strong> each physical node is placed at many points (100–256) on the ring. Benefits:</p>' +
            '<ul><li>Much more even distribution (a few points per node leave big arcs).</li>' +
            '<li>When a node leaves, its load spreads across <em>many</em> nodes, not one neighbour.</li>' +
            '<li>Heterogeneous hardware: give bigger nodes more vnodes (weights).</li></ul>' +
            '<p><strong>Replication on the ring:</strong> store a key on the next R distinct physical nodes clockwise (Cassandra, Dynamo).</p>' +
            '<p><strong>Alternatives:</strong> <em>rendezvous (HRW) hashing</em> — score every node with <code>hash(key, node)</code>, pick the max; no ring, O(n) per lookup, great for small n. <em>Jump consistent hash</em> — O(1) memory, but nodes can only be added/removed at the end. <em>Maglev hashing</em> — lookup table for L4 LBs. <em>Consistent hashing with bounded loads</em> — caps any node at (1+ε) × average to handle hot keys (used in Vimeo/HAProxy).</p>' +
            '<p>Used by: Cassandra/ScyllaDB token rings, DynamoDB partitioning lineage, memcached client libraries, Envoy ring-hash/Maglev load balancing, CDNs.</p>',
          interview: 'Be able to draw the ring, explain why mod-N fails, why vnodes help, and code it in ~25 lines (sorted slice + binary search). Follow-ups: replication factor on the ring, hot keys (bounded loads), and rendezvous hashing as an alternative.',
          examples: [{
            label: 'Consistent hash ring with virtual nodes (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "fmt"',
              '    "hash/crc32"',
              '    "slices"',
              '    "strconv"',
              '    "sync"',
              ')',
              '',
              'type Ring struct {',
              '    mu     sync.RWMutex',
              '    vnodes int',
              '    hashes []uint32          // sorted positions on the ring',
              '    owner  map[uint32]string // position -> physical node',
              '}',
              '',
              'func NewRing(vnodes int) *Ring {',
              '    return &Ring{vnodes: vnodes, owner: make(map[uint32]string)}',
              '}',
              '',
              'func (r *Ring) Add(node string) {',
              '    r.mu.Lock()',
              '    defer r.mu.Unlock()',
              '    for i := 0; i < r.vnodes; i++ {',
              '        h := crc32.ChecksumIEEE([]byte(node + "#" + strconv.Itoa(i)))',
              '        r.owner[h] = node',
              '        r.hashes = append(r.hashes, h)',
              '    }',
              '    slices.Sort(r.hashes)',
              '}',
              '',
              'func (r *Ring) Remove(node string) {',
              '    r.mu.Lock()',
              '    defer r.mu.Unlock()',
              '    r.hashes = slices.DeleteFunc(r.hashes, func(h uint32) bool { return r.owner[h] == node })',
              '    for h, n := range r.owner {',
              '        if n == node {',
              '            delete(r.owner, h)',
              '        }',
              '    }',
              '}',
              '',
              'func (r *Ring) Get(key string) string {',
              '    r.mu.RLock()',
              '    defer r.mu.RUnlock()',
              '    if len(r.hashes) == 0 {',
              '        return ""',
              '    }',
              '    h := crc32.ChecksumIEEE([]byte(key))',
              '    i, _ := slices.BinarySearch(r.hashes, h) // first position >= h',
              '    if i == len(r.hashes) {',
              '        i = 0 // wrap around',
              '    }',
              '    return r.owner[r.hashes[i]]',
              '}',
              '',
              'func main() {',
              '    r := NewRing(160)',
              '    for _, n := range []string{"cache-a", "cache-b", "cache-c"} {',
              '        r.Add(n)',
              '    }',
              '    before := map[string]string{}',
              '    for i := 0; i < 10000; i++ {',
              '        k := "key" + strconv.Itoa(i)',
              '        before[k] = r.Get(k)',
              '    }',
              '    r.Add("cache-d")',
              '    moved := 0',
              '    for k, n := range before {',
              '        if r.Get(k) != n {',
              '            moved++',
              '        }',
              '    }',
              '    fmt.Printf("moved %.1f%% of keys (ideal ~25%%)\\n", float64(moved)/100)',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Denormalization & Choosing a Database',
          def: '<p><strong>Normalization</strong> removes duplication (one fact, one place) — great for write correctness. <strong>Denormalization</strong> deliberately duplicates data to make reads cheap: embedding the author name in each post, materialised feed tables, counters stored on the parent row, read models built from events (CQRS).</p>' +
            '<table><thead><tr><th></th><th>Normalized</th><th>Denormalized</th></tr></thead><tbody>' +
            '<tr><td>Reads</td><td>Joins, more work per read</td><td>Single lookup, fast</td></tr>' +
            '<tr><td>Writes</td><td>One place to update</td><td>Fan-out updates; risk of inconsistency</td></tr>' +
            '<tr><td>Storage</td><td>Minimal</td><td>Duplicated</td></tr>' +
            '<tr><td>Fits</td><td>OLTP with complex integrity</td><td>Read-heavy, NoSQL query-first models, sharded systems (no cross-shard joins)</td></tr>' +
            '</tbody></table>' +
            '<p>Keep denormalized copies consistent with transactions (same DB), or asynchronously via events/CDC and accept eventual consistency. Always know which copy is the source of truth.</p>' +
            '<p><strong>Choosing a database — a practical checklist:</strong></p>' +
            '<ol><li><strong>Access patterns</strong>: by key? range? ad-hoc filters? full-text? graph traversal?</li>' +
            '<li><strong>Consistency &amp; transactions</strong>: multi-row invariants (money, inventory) → relational / distributed SQL.</li>' +
            '<li><strong>Scale</strong>: write QPS and data size; single primary limits.</li>' +
            '<li><strong>Latency &amp; geography</strong>: multi-region writes?</li>' +
            '<li><strong>Data shape</strong>: relational, hierarchical documents, time-series, blobs (object storage, never the DB).</li>' +
            '<li><strong>Operational maturity</strong>: managed offering, team expertise, backup/restore, cost.</li></ol>' +
            '<p>Default to <strong>PostgreSQL</strong> unless a requirement clearly rules it out; it is a defensible, senior-sounding choice when justified with numbers.</p>',
          interview: 'For each entity in your design, name the store and the reason in one line. When you denormalize, say how the copies stay in sync and what staleness users might observe.',
          examples: [{
            label: 'Keeping denormalised copies honest (SQL)',
            lang: 'sql',
            code: [
              '-- Copies in the same database: update them in the SAME transaction',
              'BEGIN;',
              'INSERT INTO comments (id, post_id, author_id, author_name, body)   -- author_name copied for cheap reads',
              'VALUES ($1, $2, $3, $4, $5);',
              'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $2;    -- hot row? see Hot Partitions',
              'COMMIT;',
              '',
              '-- Copies elsewhere (search index, feed table, other services) are updated asynchronously',
              '-- via outbox/CDC and are eventually consistent.',
              '',
              '-- Safety net: a periodic reconciliation job finds and repairs drift',
              'UPDATE posts p SET comment_count = c.n',
              'FROM (SELECT post_id, count(*) AS n FROM comments GROUP BY post_id) c',
              'WHERE p.id = c.post_id AND p.comment_count <> c.n;'
            ].join('\n')
          }]
        },
        {
          title: 'Hot Partitions & Data Modelling for Skew',
          def: '<p>Partitioned stores (DynamoDB, Cassandra, Bigtable, sharded SQL, Kafka, Redis Cluster) scale only while load spreads evenly. A <strong>hot partition</strong> caps the whole system at the throughput of one node, however many nodes you add. Even <em>data size</em> is not enough; you need even <em>access</em>.</p>' +
            '<table><thead><tr><th>Cause</th><th>Example</th><th>Fix</th></tr>' +
            '</thead><tbody>' +
            '<tr><td>Monotonic key + range partitioning</td><td><code>created_at</code>, auto-increment or Snowflake ID as the range key: every insert hits the newest range</td><td>Hash the key, or prefix a bucket: <code>(hash(device_id) mod 32, ts)</code></td></tr>' +
            '<tr><td>Celebrity / whale entity</td><td>One user, tenant, product or chat with 1000× the traffic of the median</td><td><strong>Write sharding</strong>: key + suffix 0..N−1, read all N and merge; move whales to dedicated shards (directory placement)</td></tr>' +
            '<tr><td>Hot counter row</td><td>Likes on a viral post; stock of a flash-sale item</td><td>Sharded counters (N sub-rows, sum on read, cache the sum); buffer and flush increments; pre-split stock into buckets</td></tr>' +
            '<tr><td>Unbounded partition</td><td>A group chat&#39;s whole history in one partition</td><td>Time-bucket the partition key: <code>(conversation_id, month)</code>, <code>(sensor_id, day)</code></td></tr>' +
            '<tr><td>Low-cardinality key</td><td><code>status</code>, <code>country</code> or a boolean as partition key</td><td>Compose with a high-cardinality component; serve that query from an index instead</td></tr>' +
            '<tr><td>Temporal hot spot</td><td>Every tenant&#39;s nightly job writes &quot;today&quot; at 00:00</td><td>Jitter schedules; key by <code>(entity, day)</code>, not <code>(day)</code></td></tr>' +
            '</tbody></table>' +
            '<p><strong>Query-first modelling</strong> (wide-column, DynamoDB): list access patterns with their expected QPS first, then design a table or index per pattern so each is a single-partition read or write. Quote real per-partition limits: a DynamoDB partition serves about 3,000 read units and 1,000 write units per second — adaptive capacity and split-for-heat help, but a single <em>key</em> still cannot exceed that; a Cassandra partition should stay well under ~100 MB; a Kafka partition is read by one consumer per group; a Redis Cluster key lives on one shard (~100K ops/s).</p>' +
            '<p><strong>Detect before you fix:</strong> per-partition metrics (DynamoDB CloudWatch Contributor Insights, Cassandra <code>nodetool toppartitions</code>, Kafka per-partition lag, <code>redis-cli --hotkeys</code>), and load tests with realistic Zipf-distributed keys — uniform random test data hides every hot spot.</p>',
          interview: 'Whenever you pick a partition key, ask yourself out loud "what is the hottest value of this key and how hot can it get?". Then offer the matching fix: hash or bucket monotonic keys, write-shard whales and counters, time-bucket unbounded partitions, and isolate the biggest tenants. Quoting one concrete per-partition limit makes the answer credible.',
          examples: [{
            label: 'Three skew fixes with numbers',
            lang: 'text',
            code: [
              'Viral like counter: 200K likes/s at peak; one key sustains ~1K writes/s',
              '  write sharding, N = 256 sub-keys:',
              '    write: k = rand(0..255); UPDATE counters SET n = n + 1 WHERE pk = \'post#9#\' || k',
              '           256 sub-keys x ~1K writes/s = ~256K writes/s of capacity',
              '    read : SUM over the 256 sub-keys, or a job folds them into \'post#9#total\' every second (cached)',
              '  pick N = peak / per-key limit; start N at 1 and grow it only for keys detected as hot',
              '',
              'Chat history in Cassandra: bound partition size with a time bucket',
              '  PRIMARY KEY ((conversation_id, month_bucket), message_id)    -- one month of one chat',
              '  latest page: read the current bucket, step back one bucket if the page is not full',
              '',
              'Insert-heavy events table in a range-partitioned store',
              '  BAD : PRIMARY KEY (event_ts)                          -> all writes on the newest range',
              '  GOOD: PRIMARY KEY (hash(device_id) % 32, event_ts)    -> 32 ranges absorb writes in parallel;',
              '        a per-device query still touches exactly one range'
            ].join('\n')
          }]
        },
        {
          title: 'Multi-Tenancy: Isolation Models & Noisy Neighbours',
          def: '<p>A multi-tenant SaaS serves many customers (tenants) from shared infrastructure. The central decision is <strong>how much is shared</strong>: cost and operational simplicity versus isolation, compliance and blast radius.</p>' +
            '<table><thead><tr><th>Model</th><th>Shared</th><th>Pros</th><th>Cons</th><th>Fit</th></tr>' +
            '</thead><tbody>' +
            '<tr><td><strong>Silo</strong> (stack or DB per tenant)</td><td>Nothing but the control plane</td><td>Strong isolation, per-tenant backup/restore, residency, upgrade windows</td><td>Cost; thousands of databases to migrate and monitor</td><td>Enterprise and regulated tenants</td></tr>' +
            '<tr><td><strong>Bridge</strong> (schema per tenant)</td><td>Database cluster</td><td>Moderate isolation, simpler per-tenant restore</td><td>Migrations × N schemas; catalog bloat beyond ~10K tenants</td><td>Hundreds to low thousands of tenants</td></tr>' +
            '<tr><td><strong>Pool</strong> (shared tables + <code>tenant_id</code>)</td><td>Everything</td><td>Cheapest, simplest operations, easy cross-tenant analytics</td><td>One missing filter leaks data; noisy neighbours</td><td>The long tail of small tenants</td></tr>' +
            '<tr><td><strong>Cells</strong></td><td>A full stack per cell, tenants assigned to cells</td><td>Bounded blast radius; scale by adding cells</td><td>Cell router; moving tenants between cells</td><td>Large platforms, often combined: pool inside cells, whales in silos</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Isolation in a pooled model</strong> must be impossible to forget: <code>tenant_id</code> leads every primary key and index (and is the shard key), PostgreSQL <strong>row-level security</strong> filters rows in the database itself, repositories are tenant-scoped in code, per-tenant data keys (envelope encryption) enable crypto-shredding on offboarding, and automated tests attempt cross-tenant access.</p>' +
            '<p><strong>Noisy neighbours:</strong> one tenant&#39;s bulk import or traffic spike must not degrade everyone else. Use per-tenant rate limits and quotas at the edge, per-tenant concurrency limits (bulkheads) in workers, fair queuing (queues or partitions per tier with weighted round robin), per-tenant usage and cost metrics, and directory-based placement that moves whales to dedicated shards or silos.</p>' +
            '<p><strong>Tenant identity</strong> comes from the authenticated token (a <code>tenant_id</code> claim), never from a client-supplied header or query parameter, and is propagated in request context to every service, log line and trace; use it as a metric label only for bounded tiers, not raw IDs, to control cardinality.</p>',
          interview: 'State the tenancy model and why: pool for the long tail, silo or dedicated cells for regulated or whale tenants. Show how isolation is enforced (tenant_id in every key, row-level security, tenant taken from the token) and how noisy neighbours are contained (per-tenant quotas, fair queues, whale placement). Mention per-tenant keys for crypto-shredding on offboarding.',
          examples: [{
            label: 'Pooled tables with PostgreSQL row-level security',
            lang: 'sql',
            code: [
              '-- tenant_id leads every key (it is also the shard key)',
              'CREATE TABLE invoices (',
              '  tenant_id    uuid   NOT NULL,',
              '  id           bigint NOT NULL,',
              '  amount_cents bigint NOT NULL,',
              '  PRIMARY KEY (tenant_id, id)',
              ');',
              '',
              '-- The database itself refuses rows of other tenants',
              'ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;',
              'ALTER TABLE invoices FORCE ROW LEVEL SECURITY;        -- applies to the table owner too',
              'CREATE POLICY tenant_isolation ON invoices',
              '  USING      (tenant_id = current_setting(\'app.tenant_id\', true)::uuid)',
              '  WITH CHECK (tenant_id = current_setting(\'app.tenant_id\', true)::uuid);',
              '',
              '-- Per transaction, with the tenant taken from the verified JWT (never from user input)',
              'BEGIN;',
              'SELECT set_config(\'app.tenant_id\', $1, true);          -- true = local to this transaction',
              'SELECT * FROM invoices WHERE id = 42;                   -- other tenants\' rows are invisible',
              'COMMIT;',
              '-- Transaction-local settings stay safe behind PgBouncer in transaction-pooling mode.',
              '-- The application role must not be a superuser and must not have BYPASSRLS.'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'SQL or NoSQL for five data types',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li><strong>Bank ledger:</strong> relational (ACID, constraints) or distributed SQL if global.</li><li><strong>User sessions:</strong> KV (Redis/DynamoDB) with TTL.</li><li><strong>Chat messages (billions, by conversation, time-ordered):</strong> wide-column (Cassandra/ScyllaDB), partition = conversation_id + time bucket.</li><li><strong>Product catalog with varied attributes:</strong> document store or Postgres JSONB; Elasticsearch for search.</li><li><strong>Service metrics:</strong> time-series DB (Prometheus/Mimir, InfluxDB).</li></ul>'
        },
        {
          t: 'Keys moved: mod-N vs consistent hashing',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li>mod-N from 4 → 5 nodes: a key stays only if <code>h mod 4 == h mod 5</code>, i.e. ~1/5 of keys stay → <strong>~80% move</strong>.</li><li>Consistent hashing: only keys in the new node&#39;s arcs move → ~<strong>1/5 = 20%</strong>.</li><li>Consequence for caches: mod-N resizing = near-total cache flush = DB stampede.</li></ul>'
        },
        {
          t: 'Design a composite index for a slow query',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li>Query: <code>WHERE user_id=? AND created_at &gt; ? ORDER BY created_at DESC LIMIT 50</code>.</li><li>Index <code>(user_id, created_at DESC)</code>: equality first, then range/sort → no sort step, stops after 50 rows.</li><li>Index on <code>(created_at, user_id)</code> would scan a time range for all users — wrong order.</li><li>Verify with <code>EXPLAIN ANALYZE</code>; consider <code>INCLUDE</code> for a covering index.</li></ul>'
        },
        {
          t: 'Implement consistent hashing with virtual nodes',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li>Hash <code>node#i</code> for i in 0..vnodes to get ring positions; keep a sorted slice + map position → node.</li><li>Lookup: hash the key, binary search for the first position ≥ hash, wrap to 0.</li><li>Removal: drop that node&#39;s positions.</li><li>Extension: <code>GetN(key, r)</code> walks clockwise collecting r distinct nodes for replication.</li><li>See the worked example in the Consistent Hashing topic.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "hash/fnv"',
            '    "slices"',
            '    "strconv"',
            ')',
            '',
            'type Ring struct {',
            '    vnodes int',
            '    keys   []uint64',
            '    owner  map[uint64]string',
            '}',
            '',
            'func hash64(s string) uint64 {',
            '    h := fnv.New64a()',
            '    h.Write([]byte(s))',
            '    return h.Sum64()',
            '}',
            '',
            'func New(vnodes int, nodes ...string) *Ring {',
            '    r := &Ring{vnodes: vnodes, owner: map[uint64]string{}}',
            '    for _, n := range nodes {',
            '        for i := 0; i < vnodes; i++ {',
            '            h := hash64(n + "#" + strconv.Itoa(i))',
            '            r.owner[h] = n',
            '            r.keys = append(r.keys, h)',
            '        }',
            '    }',
            '    slices.Sort(r.keys)',
            '    return r',
            '}',
            '',
            '// GetN returns up to n distinct physical nodes clockwise from the key (replica set).',
            'func (r *Ring) GetN(key string, n int) []string {',
            '    if len(r.keys) == 0 {',
            '        return nil',
            '    }',
            '    i, _ := slices.BinarySearch(r.keys, hash64(key))',
            '    seen := map[string]bool{}',
            '    var out []string',
            '    for j := 0; j < len(r.keys) && len(out) < n; j++ {',
            '        node := r.owner[r.keys[(i+j)%len(r.keys)]]',
            '        if !seen[node] {',
            '            seen[node] = true',
            '            out = append(out, node)',
            '        }',
            '    }',
            '    return out',
            '}',
            '',
            'func main() {',
            '    r := New(100, "n1", "n2", "n3", "n4")',
            '    fmt.Println(r.GetN("user:42", 3)) // e.g. [n3 n1 n4]',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Read-your-writes with async read replicas',
          d: 'medium',
          type: 'design',
          hint: '<ul><li><strong>Leader window:</strong> after a user writes, route that user&#39;s reads to the leader for N seconds (store last-write time in session/cookie).</li><li><strong>LSN tracking:</strong> return the commit LSN/GTID to the client; reads go to a replica whose replayed LSN ≥ that value (or wait briefly), else leader.</li><li><strong>Route by data ownership:</strong> a user&#39;s own profile always from the leader; others&#39; profiles from replicas.</li><li>Monitor replica lag; remove replicas from rotation beyond a threshold.</li></ul>'
        },
        {
          t: 'Choose a shard key for a multi-tenant SaaS',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Most queries are tenant-scoped → <code>tenant_id</code> keeps tenant data together (single-shard queries, per-tenant backup/export).</li><li>Problem: tenant size is power-law distributed. Mitigations: directory-based placement (move big tenants to dedicated shards/cells), compound key <code>(tenant_id, hash(entity_id) mod k)</code> for the largest tenants.</li><li>Use many logical shards for rebalancing; keep a tenant → shard directory cached at the edge.</li><li>Compliance: geo-placement by tenant region.</li></ul>'
        },
        {
          t: 'Model a messaging timeline in Cassandra',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Query-first: &quot;latest 50 messages of conversation X, then page back&quot;.</li><li>Table <code>messages_by_conversation</code>: partition key <code>(conversation_id, bucket)</code> where bucket = month (bounds partition size, ideally &lt; 100 MB), clustering key <code>message_id DESC</code> (time-sortable ID like Snowflake/ULID).</li><li>Write: single partition insert; read: slice by clustering key.</li><li>Second query (&quot;conversations of user&quot;) → separate denormalised table <code>conversations_by_user</code> ordered by last activity.</li><li>Consistency: LOCAL_QUORUM writes/reads within a region.</li></ul>'
        },
        {
          t: 'Global secondary index in a sharded database',
          d: 'hard',
          type: 'design',
          hint: '<ul><li>Data sharded by <code>user_id</code>; need lookup by <code>email</code>.</li><li><strong>Local index</strong> → scatter-gather to all shards: OK for rare queries, bad at scale (tail latency).</li><li><strong>Global index table</strong> <code>email → user_id</code> sharded by email: single-shard lookup; maintain it asynchronously via CDC/outbox (eventual) or with a cross-shard transaction (strong but costly).</li><li>Uniqueness of email: write the index row first with a conditional insert as a reservation, then create the user; clean up on failure (saga).</li></ul>'
        },
        {
          t: 'Reshard a live database with zero downtime',
          d: 'hard',
          type: 'design',
          hint: '<ol><li>Introduce a routing layer (directory or Vitess-like proxy) if absent.</li><li>Provision new shards; <strong>backfill</strong> via snapshot.</li><li><strong>Stream changes</strong> (binlog/CDC) to new shards until lag ≈ 0.</li><li><strong>Verify</strong> with checksums/row counts per range; shadow reads comparing results.</li><li><strong>Cutover</strong>: brief write freeze per partition (seconds) or dual-write with idempotency, flip routing map, keep old shards read-only for rollback.</li><li>Clean up. Lesson: start with many logical partitions so future moves are copies, not rehashes.</li></ol>'
        },
        {
          t: 'Pick the data stores for a multi-region e-commerce platform',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Orders/payments:</strong> strongly consistent — distributed SQL (Spanner/CockroachDB) or regional Postgres with users homed to a region.</li><li><strong>Catalog:</strong> single writer region, replicated read-only to all regions + Elasticsearch per region + CDN.</li><li><strong>Cart:</strong> DynamoDB global tables / Redis per region (LWW acceptable; or merge carts as a set CRDT).</li><li><strong>Inventory:</strong> per-warehouse partition with reservations; avoid global locks.</li><li><strong>Analytics:</strong> CDC → Kafka → lakehouse/warehouse.</li><li>Discuss latency of cross-region consensus (~100 ms) vs anomaly risk, and data residency (GDPR).</li></ul>'
        }
      ],
      interviewFocus: [
        {
          q: 'How would you choose a shard key, and what goes wrong with a bad one?',
          a: '<p>Criteria: <strong>high cardinality</strong>, <strong>uniform load</strong> (not just uniform data size), and <strong>query alignment</strong> so the dominant queries touch one shard.</p><p>Bad keys and symptoms:</p><ul><li><strong>Monotonic keys</strong> (timestamp, auto-increment) with range sharding → all writes on the last shard.</li><li><strong>Low cardinality</strong> (country) → few giant shards, cannot split.</li><li><strong>Misaligned key</strong> → every query scatter-gathers, latency set by the slowest shard.</li><li><strong>Skewed entities</strong> (celebrity user, huge tenant) → hot shard.</li></ul><p>Mitigations: hash the key, add a salt/bucket for hot entities, directory-based placement for big tenants, and logical partitions for rebalancing.</p>'
        },
        {
          q: 'Explain consistent hashing and why virtual nodes are needed.',
          a: '<p>Nodes and keys hash onto a ring; each key maps to the next node clockwise. Membership changes only move keys adjacent to the changed node (~1/N), unlike mod-N which remaps almost everything.</p><p>With one point per node, arcs are uneven (some nodes own far more keys) and a departing node dumps its entire load on one neighbour. <strong>Virtual nodes</strong> place each node at 100+ points so load evens out statistically, a departing node&#39;s load spreads across many nodes, and weights handle heterogeneous hardware. Replication: pick the next R distinct physical nodes clockwise.</p>'
        },
        {
          q: 'Compare single-leader, multi-leader and leaderless replication.',
          a: '<table><thead><tr><th></th><th>Single leader</th><th>Multi-leader</th><th>Leaderless</th></tr></thead><tbody><tr><td>Write conflicts</td><td>None</td><td>Yes — need resolution</td><td>Yes — versions/LWW/CRDTs</td></tr><tr><td>Write availability</td><td>Leader failover gap</td><td>High (local leader)</td><td>High (any W replicas)</td></tr><tr><td>Consistency</td><td>Strong from leader</td><td>Eventual across leaders</td><td>Tunable (R + W &gt; N)</td></tr><tr><td>Use</td><td>Most OLTP</td><td>Multi-region, offline clients</td><td>High-write, always-on stores</td></tr></tbody></table><p>Leaderless repair: read repair, hinted handoff, Merkle-tree anti-entropy. Note that R + W &gt; N still does not give linearizability under all failure interleavings (sloppy quorums, concurrent writes).</p>'
        },
        {
          q: 'B-tree vs LSM-tree — when does each win?',
          a: '<p><strong>B+trees</strong> update pages in place; reads are a single O(log n) path, ideal for read-heavy OLTP with point and range lookups (Postgres, InnoDB). Random writes and page splits cost I/O.</p><p><strong>LSM-trees</strong> buffer writes in a memtable, flush immutable sorted SSTables sequentially and compact them in the background. They excel at write-heavy ingest and compress well (Cassandra, RocksDB), but reads may check multiple SSTables (mitigated by bloom filters), and compaction causes write amplification and latency spikes.</p><p>Rule of thumb: read-heavy, transactional → B-tree; write-heavy, append-mostly (logs, events, metrics, messages) → LSM.</p>'
        },
        {
          q: 'When is denormalization the right call, and how do you keep copies consistent?',
          a: '<p>When reads vastly outnumber writes and joins are expensive or impossible (sharded/NoSQL), e.g. storing <code>author_name</code> in each post, a precomputed feed, or a <code>comment_count</code> column.</p><p>Consistency options:</p><ul><li>Same-database transaction when copies live together (counter + row).</li><li>Asynchronous propagation via transactional outbox or CDC to derived tables/indexes — eventual, but reliable and replayable.</li><li>Periodic reconciliation jobs as a safety net.</li></ul><p>Document which copy is the source of truth and what staleness is acceptable; avoid denormalizing data that changes often and is read rarely.</p>'
        }
      ],
      quiz: [
        { q: 'Which sharding strategy supports efficient range scans?', a: 'Range-based partitioning.' },
        { q: 'Why is an auto-increment ID a bad range shard key?', a: 'All new writes go to the last range/shard, creating a write hot spot.' },
        { q: 'What does a composite index (a, b, c) NOT help with?', a: 'Queries that do not filter on the leftmost column a, e.g. WHERE b = ? alone.' },
        { q: 'What anomaly does read-your-writes prevent?', a: 'A user not seeing their own just-written data because the read went to a lagging replica.' },
        { q: 'What storage engine family does Cassandra use?', a: 'LSM-tree (memtable + SSTables + compaction).' },
        { q: 'What problem do virtual nodes solve in consistent hashing?', a: 'Uneven load distribution and dumping a failed node’s entire load on one neighbour.' },
        { q: 'Why is OFFSET pagination slow for deep pages?', a: 'The database must scan and discard all skipped rows; keyset pagination seeks directly via the index.' },
        { q: 'Name two leaderless repair mechanisms.', a: 'Read repair, hinted handoff, and anti-entropy with Merkle trees.' },
        { q: 'How do you scale a single counter that receives 200K increments per second?', a: 'Write sharding: split it into N sub-counters (keys with a suffix), increment a random one, and sum them on read or in a periodic aggregation.' },
        { q: 'Name the three classic multi-tenancy isolation models.', a: 'Silo (stack or database per tenant), bridge (schema per tenant) and pool (shared tables with a tenant_id column), often combined with cells.' }
      ],
      resources: [
        { title: 'Designing Data-Intensive Applications (Kleppmann)', url: 'https://dataintensive.net/', type: 'book' },
        { title: 'Use The Index, Luke — SQL indexing explained', url: 'https://use-the-index-luke.com/', type: 'article' },
        { title: 'Amazon Dynamo paper (SOSP 2007)', url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', type: 'article' },
        { title: 'Vitess Docs — Resharding', url: 'https://vitess.io/docs/user-guides/configuration-advanced/resharding/', type: 'docs' },
        { title: 'PostgreSQL Docs — Row Security Policies', url: 'https://www.postgresql.org/docs/current/ddl-rowsecurity.html', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 5 ─────────────────────────────
    {
      n: 5,
      title: 'Distributed Systems Concepts',
      summary: 'The theory that senior interviews probe: CAP and PACELC, the spectrum of consistency models, quorums, Raft consensus and leader election, logical clocks, idempotency and delivery semantics, and distributed transactions (2PC vs saga).',
      topics: [
        {
          title: 'CAP Theorem & PACELC',
          def: '<p><strong>CAP</strong> (Brewer, proven by Gilbert &amp; Lynch): when a <strong>network Partition</strong> occurs, a distributed data store must choose between <strong>Consistency</strong> (linearizability — every read sees the latest write) and <strong>Availability</strong> (every request to a non-failed node gets a non-error response). Partitions are not optional in real networks, so the real choice is <em>CP or AP during a partition</em>; &quot;CA&quot; only describes a single-node system.</p>' +
            '<p><strong>PACELC</strong> (Abadi) extends it: <em>if Partition</em> → A or C; <em>Else</em> (normal operation) → <strong>Latency or Consistency</strong>. This matters more day to day, because synchronous replication for consistency always costs latency.</p>' +
            '<table><thead><tr><th>System (typical config)</th><th>Partition</th><th>Else</th><th>Notes</th></tr></thead><tbody>' +
            '<tr><td>Cassandra, ScyllaDB, Dynamo-style</td><td>PA</td><td>EL</td><td>Tunable per query (QUORUM moves toward C)</td></tr>' +
            '<tr><td>DynamoDB</td><td>PA</td><td>EL</td><td>Eventually consistent reads by default; strongly consistent reads optional (in-region). Global tables default to multi-Region eventual consistency; the multi-Region strong consistency mode trades write latency for PC/EC behaviour</td></tr>' +
            '<tr><td>Spanner, CockroachDB, etcd, ZooKeeper</td><td>PC</td><td>EC</td><td>Consensus; minority side becomes unavailable</td></tr>' +
            '<tr><td>MongoDB (majority write/read concern)</td><td>PC</td><td>EC</td><td>Weaker concerns trade toward A/L</td></tr>' +
            '<tr><td>Single-leader Postgres + async replicas</td><td>PC for primary writes</td><td>EL for replica reads</td><td>Failover can lose async writes</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Practical framing:</strong> choose per operation. A shopping cart or social feed should stay available (AP + reconciliation); a payment, inventory decrement or username uniqueness check needs CP. CAP&#39;s &quot;C&quot; is linearizability — not the &quot;C&quot; in ACID (which means invariants hold).</p>',
          interview: 'Avoid "we pick CA". Say: partitions happen, so during a partition this feature prefers availability (or consistency) because of business impact X; and in normal operation (PACELC) we trade latency for consistency only where correctness demands it.',
          examples: [{
            label: 'Choosing consistency per operation (Cassandra CQL, DynamoDB)',
            lang: 'text',
            code: [
              '-- Cassandra, RF = 3 per DC: consistency is chosen per request',
              'CONSISTENCY LOCAL_QUORUM;      -- 2 of 3 local replicas: R + W > N within the DC',
              'SELECT balance FROM wallets WHERE user_id = 42;',
              'CONSISTENCY ONE;               -- fastest, may be stale: fine for a like counter',
              'SELECT likes FROM post_counters WHERE post_id = 7;',
              '',
              '-- Lightweight transaction (Paxos): CP behaviour for this one write, ~4 round trips',
              'INSERT INTO usernames (name, user_id) VALUES (\'ada\', 42) IF NOT EXISTS;',
              '',
              '# DynamoDB: eventually consistent reads by default; opt in per request',
              'aws dynamodb get-item --table-name Users --key \'{"pk":{"S":"USER#42"}}\' --consistent-read',
              '',
              'During a partition: LOCAL_QUORUM fails on the minority side (CP);',
              'ONE keeps answering with possibly stale data (AP). Same database, different choice per query.'
            ].join('\n')
          }]
        },
        {
          title: 'Consistency Models',
          def: '<p>A consistency model is a contract about what values reads may return under concurrency and replication. From strongest to weakest:</p>' +
            '<table><thead><tr><th>Model</th><th>Guarantee</th><th>Cost / example</th></tr></thead><tbody>' +
            '<tr><td><strong>Linearizable</strong> (strong, atomic)</td><td>Each operation appears to take effect instantly at one point between its start and end; respects real time. Once a write completes, every later read sees it</td><td>Consensus or single leader; etcd, Spanner, ZooKeeper writes</td></tr>' +
            '<tr><td><strong>Sequential</strong></td><td>All nodes see operations in one total order consistent with each client&#39;s program order, but not necessarily real-time order</td><td>Cheaper than linearizable; rarely exposed directly</td></tr>' +
            '<tr><td><strong>Causal</strong></td><td>Causally related operations (write → read → reply) are seen in the same order everywhere; concurrent ones may differ</td><td>Strongest model that stays available during partitions; MongoDB causal sessions</td></tr>' +
            '<tr><td><strong>Session guarantees</strong></td><td>Read-your-writes, monotonic reads, monotonic writes, writes-follow-reads — per client</td><td>Sticky sessions, version tokens</td></tr>' +
            '<tr><td><strong>Eventual</strong></td><td>If writes stop, replicas converge. No bound on staleness or ordering meanwhile</td><td>DNS, Cassandra ONE, async replicas</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Don&#39;t confuse with isolation levels:</strong> <em>serializability</em> is about multi-object transactions behaving as if executed one at a time (any order); <em>linearizability</em> is about single objects respecting real time. <strong>Strict serializability</strong> = both (Spanner, FoundationDB). CockroachDB defaults to serializable isolation with linearizable single-key operations, but does not promise strict serializability for every pair of transactions touching disjoint keys; PostgreSQL defaults to read committed, not serializable.</p>' +
            '<p><strong>Bounded staleness</strong> (e.g. Cosmos DB) is a useful middle ground: reads lag by at most K versions or T seconds.</p>' +
            '<p>Interview heuristic: user-visible anomalies to explain are &quot;my own update vanished&quot; (read-your-writes), &quot;time went backwards&quot; (monotonic reads), and &quot;reply before the question&quot; (causal).</p>',
          interview: 'Interviewers want you to pick the weakest model that keeps the product correct, and to name the anomaly users would see otherwise. Know the difference between linearizability and serializability — it is a favourite senior-level trap.',
          examples: [{
            label: 'What each anomaly looks like, and the fix',
            lang: 'text',
            code: [
              'Read-your-writes violation (async replica lagging 800 ms)',
              '  t=0    client -> primary  UPDATE profile SET bio=\'new\'   (ack at LSN 0/9A)',
              '  t=100  client -> replica  SELECT bio  -> \'old\'           (replica replayed only to 0/98)',
              '  Fix: session carries LSN 0/9A; use a replica only if its replay LSN >= 0/9A, else the primary',
              '',
              'Monotonic reads violation (two replicas, different lag)',
              '  t=0    read -> replica A (fresh) -> 12 comments',
              '  t=1    read -> replica B (stale) -> 10 comments           "time went backwards"',
              '  Fix: pin the session to one replica (hash user_id) or carry the highest version seen',
              '',
              'Causal violation (multi-leader or multi-partition)',
              '  Alice posts "Lost my keys"; Bob replies "Found them!"',
              '  Carol\'s region applies Bob\'s reply first -> answer before the question',
              '  Fix: causal consistency (version vectors, dependency tracking) or keep a thread in one partition',
              '',
              'Linearizability violation (stale leader)',
              '  Old leader paused by GC, still serves reads after a new leader committed x=2 -> returns x=1',
              '  Fix: read index / leader leases with bounded clock drift (Raft), or read from a quorum'
            ].join('\n')
          }]
        },
        {
          title: 'Quorums, Consensus (Raft) & Leader Election',
          def: '<p><strong>Quorums:</strong> with N replicas, a write waits for W acks and a read queries R replicas. If <strong>R + W &gt; N</strong>, every read set overlaps every write set, so a read sees at least one up-to-date copy (pick the newest by version). N=3, W=2, R=2 is the classic balance; W=1/R=N favours write latency; W=N/R=1 favours reads but any node down blocks writes. Caveats: sloppy quorums, concurrent writes and failed partial writes mean quorums alone do not give linearizability.</p>' +
            '<p><strong>Consensus</strong> lets nodes agree on a single sequence of values despite crashes — the basis of replicated state machines (etcd, Consul, CockroachDB, TiKV, Kafka KRaft). <strong>Raft</strong> splits the problem into:</p>' +
            '<ul><li><strong>Leader election</strong>: nodes are follower, candidate or leader. Time is divided into <em>terms</em>. A follower that hears no heartbeat within a <em>randomised</em> election timeout (e.g. 150–300 ms) becomes a candidate, increments the term and requests votes. Each node votes once per term and only for a candidate whose log is at least as up-to-date. Majority wins.</li>' +
            '<li><strong>Log replication</strong>: clients send commands to the leader, which appends and sends <code>AppendEntries</code>. An entry is <em>committed</em> once stored on a majority; then it is applied to the state machine.</li>' +
            '<li><strong>Safety</strong>: an elected leader always contains all committed entries; stale leaders discover a higher term and step down.</li></ul>' +
            '<p>A cluster of <strong>2f + 1</strong> nodes tolerates <strong>f</strong> failures (3 tolerate 1, 5 tolerate 2). Even sizes add cost without extra tolerance. Each write needs a majority round trip, so consensus clusters are small and latency-sensitive to geography.</p>' +
            '<p><strong>Leader election for your own services</strong>: do not implement Raft; use a lease on etcd/ZooKeeper/Consul or a Kubernetes <code>Lease</code> object, and protect side effects with <strong>fencing tokens</strong> (monotonic lease revision) because a paused old leader can wake up still believing it leads.</p>',
          interview: 'Expect "how does Raft elect a leader and why randomised timeouts?" (avoid split votes) and "why 5 nodes instead of 4?" (majority math). For application-level leader election, mention leases plus fencing tokens — that shows real production awareness.',
          examples: [{
            label: 'Raft leader election and commit (simplified)',
            lang: 'text',
            code: [
              'Term 7: A is leader     A ---heartbeat---> B, C, D, E',
              '',
              'A crashes. B times out first (randomised 150-300 ms):',
              '  B: term=8, state=candidate, votes for self',
              '  B ---RequestVote(term 8, lastLogIndex, lastLogTerm)---> C, D, E',
              '  C, D grant (B log is up-to-date, have not voted in term 8)',
              '  B has 3/5 votes -> leader for term 8',
              '',
              'Client write x=5 -> B appends entry (index 42, term 8)',
              '  B ---AppendEntries---> C, D, E   (C and D ack)',
              '  stored on B, C, D = majority -> committed -> apply -> reply to client',
              '',
              'A recovers with term 7, sees term 8 -> steps down to follower'
            ].join('\n')
          }]
        },
        {
          title: 'Clocks: Physical, Lamport, Vector and Hybrid',
          def: '<p><strong>Physical clocks lie.</strong> NTP keeps servers within milliseconds (sometimes worse), clocks drift, and they can jump backwards after a sync or leap second. Never order events across machines by wall-clock time, and never use wall time to measure durations — use a monotonic clock (Go&#39;s <code>time.Now()</code> carries a monotonic reading that <code>time.Since</code> uses).</p>' +
            '<table><thead><tr><th>Clock</th><th>How</th><th>Gives you</th><th>Limits</th></tr></thead><tbody>' +
            '<tr><td><strong>Lamport</strong></td><td>Counter; increment on each event; on receive set <code>max(local, msg) + 1</code></td><td>If a happened-before b then L(a) &lt; L(b); a total order with node-ID tiebreak</td><td>L(a) &lt; L(b) does NOT imply causality; cannot detect concurrency</td></tr>' +
            '<tr><td><strong>Vector</strong></td><td>One counter per node; merge element-wise max on receive</td><td>Detects concurrency exactly (neither vector dominates)</td><td>Size grows with number of nodes/clients</td></tr>' +
            '<tr><td><strong>Hybrid Logical Clock (HLC)</strong></td><td>Physical time + logical counter, never goes backwards</td><td>Close to wall time, causally consistent, fixed size</td><td>Still relies on bounded skew</td></tr>' +
            '<tr><td><strong>TrueTime</strong> (Spanner)</td><td>GPS + atomic clocks expose an uncertainty interval [earliest, latest]</td><td>External consistency via commit-wait</td><td>Special hardware</td></tr>' +
            '</tbody></table>' +
            '<p>Where they show up: vector clocks / version vectors for conflict detection in Dynamo-style stores and CRDT systems; HLC in CockroachDB, YugabyteDB and MongoDB cluster time; Lamport timestamps for total ordering in replicated logs. <strong>Last-writer-wins</strong> using wall clocks silently drops concurrent writes — acceptable for a cache, dangerous for user data.</p>',
          interview: 'Common asks: "why not just use timestamps to order events?" (skew, jumps), "Lamport vs vector clocks?" (ordering vs concurrency detection), and implementing a Lamport clock. Mention HLC and Spanner TrueTime commit-wait for a senior touch.',
          examples: [{
            label: 'Lamport clock in Go',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "fmt"',
              '    "sync"',
              ')',
              '',
              'type Lamport struct {',
              '    mu sync.Mutex',
              '    t  uint64',
              '}',
              '',
              '// Tick is called for a local event or before sending a message.',
              'func (c *Lamport) Tick() uint64 {',
              '    c.mu.Lock()',
              '    defer c.mu.Unlock()',
              '    c.t++',
              '    return c.t',
              '}',
              '',
              '// Observe is called when a message with timestamp remote is received.',
              'func (c *Lamport) Observe(remote uint64) uint64 {',
              '    c.mu.Lock()',
              '    defer c.mu.Unlock()',
              '    c.t = max(c.t, remote) + 1',
              '    return c.t',
              '}',
              '',
              'func main() {',
              '    var a, b Lamport',
              '    sent := a.Tick()             // A sends at 1',
              '    b.Tick()                     // B local event: 1',
              '    b.Tick()                     // B local event: 2',
              '    fmt.Println(b.Observe(sent)) // B receives: max(2,1)+1 = 3',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Idempotency & Delivery Semantics',
          def: '<p>Networks lose responses, so clients retry, and a retried request may already have succeeded. <strong>Idempotency</strong> — doing an operation twice has the same effect as once — is what makes retries safe.</p>' +
            '<table><thead><tr><th>Semantics</th><th>Meaning</th><th>How achieved</th></tr></thead><tbody>' +
            '<tr><td><strong>At-most-once</strong></td><td>Never duplicated, may be lost</td><td>Send once, no retries; ack before processing</td></tr>' +
            '<tr><td><strong>At-least-once</strong></td><td>Never lost, may be duplicated</td><td>Retry until ack; ack after processing</td></tr>' +
            '<tr><td><strong>Exactly-once</strong> (effectively-once)</td><td>Effect applied once</td><td>At-least-once delivery + idempotent/deduplicated processing, or atomic commit of output + offset</td></tr>' +
            '</tbody></table>' +
            '<p>True exactly-once <em>delivery</em> across an unreliable network is impossible (Two Generals); what systems offer is exactly-once <em>processing</em> within a boundary. Kafka&#39;s EOS combines idempotent producers (sequence numbers per partition) with transactions that atomically write outputs and consumer offsets — but side effects outside Kafka (emails, HTTP calls) still need idempotency.</p>' +
            '<p><strong>Techniques:</strong></p>' +
            '<ul><li><strong>Idempotency keys</strong> (Stripe-style): client sends a UUID per logical operation; server stores key → (request hash, status, response) for ~24 h; duplicates return the stored response; a concurrent duplicate gets 409 while in progress; same key with a different body is rejected.</li>' +
            '<li><strong>Natural idempotency</strong>: <code>PUT</code>/set-to-value, upserts, <code>DELETE</code>.</li>' +
            '<li><strong>Dedup tables</strong> keyed by message ID, written in the same transaction as the business change.</li>' +
            '<li><strong>Conditional writes / versions</strong>: <code>UPDATE ... WHERE version = 7</code>.</li></ul>',
          interview: 'Whenever you add retries or a queue, say "consumers are idempotent" and explain how (dedup key in the same transaction). For payments, describe idempotency keys end to end, including concurrent duplicates and request fingerprint mismatch.',
          examples: [{
            label: 'Idempotency-key middleware (in-memory sketch)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "bytes"',
              '    "net/http"',
              '    "net/http/httptest"',
              '    "sync"',
              ')',
              '',
              'type stored struct {',
              '    done   bool',
              '    status int',
              '    body   []byte',
              '}',
              '',
              'type IdemStore struct {',
              '    mu sync.Mutex',
              '    m  map[string]*stored // production: Redis/DB with TTL + request hash',
              '}',
              '',
              'func (s *IdemStore) Middleware(next http.Handler) http.Handler {',
              '    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
              '        key := r.Header.Get("Idempotency-Key")',
              '        if key == "" || r.Method != http.MethodPost {',
              '            next.ServeHTTP(w, r)',
              '            return',
              '        }',
              '        s.mu.Lock()',
              '        if e, ok := s.m[key]; ok {',
              '            s.mu.Unlock()',
              '            if !e.done {',
              '                http.Error(w, "request in progress", http.StatusConflict)',
              '                return',
              '            }',
              '            w.WriteHeader(e.status) // replay stored response',
              '            w.Write(e.body)',
              '            return',
              '        }',
              '        e := &stored{}',
              '        s.m[key] = e',
              '        s.mu.Unlock()',
              '',
              '        rec := httptest.NewRecorder()',
              '        next.ServeHTTP(rec, r)',
              '',
              '        s.mu.Lock()',
              '        if rec.Code >= 500 {',
              '            delete(s.m, key) // allow retry of server failures',
              '        } else {',
              '            e.done, e.status, e.body = true, rec.Code, bytes.Clone(rec.Body.Bytes())',
              '        }',
              '        s.mu.Unlock()',
              '        w.WriteHeader(rec.Code)',
              '        w.Write(rec.Body.Bytes())',
              '    })',
              '}',
              '',
              'func main() {',
              '    s := &IdemStore{m: map[string]*stored{}}',
              '    pay := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
              '        w.WriteHeader(http.StatusCreated)',
              '        w.Write([]byte("charged"))',
              '    })',
              '    http.Handle("/payments", s.Middleware(pay))',
              '    // http.ListenAndServe(":8080", nil)',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Distributed Transactions: 2PC vs Saga',
          def: '<p>When one business operation spans multiple databases or services, you need either atomic commit or a compensating workflow.</p>' +
            '<p><strong>Two-phase commit (2PC):</strong> a coordinator asks all participants to <em>prepare</em> (durably lock and promise to commit); if all vote yes it sends <em>commit</em>, otherwise <em>abort</em>. It gives atomicity and isolation, but it is <strong>blocking</strong>: if the coordinator dies after participants prepared, they hold locks &quot;in doubt&quot; until it recovers. It also couples availability (any participant down = no commits) and adds round trips. Used inside databases (XA, Spanner&#39;s 2PC over Paxos groups, which removes the single-coordinator failure problem).</p>' +
            '<p><strong>Saga:</strong> a sequence of local transactions, each publishing an event/command that triggers the next; on failure, run <strong>compensating transactions</strong> in reverse (refund, release inventory).</p>' +
            '<table><thead><tr><th></th><th>2PC</th><th>Saga</th></tr></thead><tbody>' +
            '<tr><td>Atomicity</td><td>Yes (all or nothing)</td><td>Eventually, via compensation</td></tr>' +
            '<tr><td>Isolation</td><td>Yes (locks)</td><td>No — intermediate states visible</td></tr>' +
            '<tr><td>Availability</td><td>Low; blocking on coordinator failure</td><td>High; steps are async and retryable</td></tr>' +
            '<tr><td>Latency</td><td>Locks held across network round trips</td><td>Short local transactions</td></tr>' +
            '<tr><td>Complexity</td><td>In the infrastructure</td><td>In the application (compensations, idempotency)</td></tr>' +
            '<tr><td>Fit</td><td>Within one DB / tightly coupled stores</td><td>Across microservices</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Saga styles:</strong> <em>choreography</em> (services react to each other&#39;s events — simple, but flow is implicit) vs <em>orchestration</em> (a central orchestrator, e.g. Temporal or AWS Step Functions, drives steps — explicit, easier to monitor). Handle the lack of isolation with <strong>semantic locks</strong> (order state PENDING), commutative updates, and putting the irreversible <strong>pivot step</strong> (charging the card) as late as possible.</p>',
          interview: 'Default to sagas across services and explain compensations, idempotent steps and the isolation gap. Know exactly why 2PC blocks (in-doubt participants holding locks after coordinator failure). Bonus: transactional outbox to publish saga events reliably.',
          examples: [{
            label: 'Minimal saga orchestrator with compensations (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "context"',
              '    "errors"',
              '    "fmt"',
              ')',
              '',
              'type Step struct {',
              '    Name       string',
              '    Do         func(context.Context) error',
              '    Compensate func(context.Context) error // must be idempotent and retryable; nil after the pivot',
              '}',
              '',
              '// Run executes steps in order; on failure it compensates completed steps in reverse.',
              '// A real orchestrator (Temporal, Step Functions, a saga state table) persists progress',
              '// after every step, so a crash resumes the saga instead of restarting or forgetting it.',
              'func Run(ctx context.Context, steps []Step) error {',
              '    for i, s := range steps {',
              '        if err := s.Do(ctx); err != nil {',
              '            for j := i - 1; j >= 0; j-- {',
              '                if steps[j].Compensate == nil {',
              '                    continue',
              '                }',
              '                if cerr := steps[j].Compensate(ctx); cerr != nil {',
              '                    // compensation failed: retry later / page a human, never silently drop',
              '                    return errors.Join(err, fmt.Errorf("compensate %s: %w", steps[j].Name, cerr))',
              '                }',
              '            }',
              '            return fmt.Errorf("saga aborted at %s: %w", s.Name, err)',
              '        }',
              '    }',
              '    return nil',
              '}',
              '',
              'func main() {',
              '    say := func(msg string) func(context.Context) error {',
              '        return func(context.Context) error { fmt.Println(msg); return nil }',
              '    }',
              '    err := Run(context.Background(), []Step{',
              '        {Name: "order", Do: say("order PENDING"), Compensate: say("order CANCELLED")},',
              '        {Name: "inventory", Do: say("stock reserved"), Compensate: say("stock released")},',
              '        {Name: "payment", Do: func(context.Context) error { return errors.New("card declined") }},',
              '    })',
              '    fmt.Println(err) // saga aborted at payment: card declined',
              '}'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'CP or AP? Classify five features',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li><strong>Username uniqueness:</strong> CP — duplicates are unacceptable.</li><li><strong>Like counter:</strong> AP — approximate is fine.</li><li><strong>Bank transfer:</strong> CP (or saga with strong local steps).</li><li><strong>Shopping cart:</strong> AP with merge (Dynamo paper motivation).</li><li><strong>Distributed lock / leader election:</strong> CP (etcd/ZooKeeper).</li></ul><p>Justify each by the business cost of the anomaly.</p>'
        },
        {
          t: 'Quorum configurations for N = 3 and N = 5',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li>N=3: W=2, R=2 → overlap, tolerates 1 node down for both reads and writes.</li><li>N=3: W=3, R=1 → fast reads, but one node down blocks writes.</li><li>N=3: W=1, R=1 → R+W=2 ≤ 3, no overlap → eventual.</li><li>N=5: W=3, R=3 → tolerates 2 failures.</li><li>Raft: 2f+1 nodes tolerate f failures; 4 nodes tolerate only 1, same as 3.</li></ul>'
        },
        {
          t: 'Implement vector clocks with a compare function',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li>Represent as <code>map[string]uint64</code> (node → counter).</li><li><code>Increment(node)</code> on local event; <code>Merge(other)</code> element-wise max on receive.</li><li>Compare: a ≤ b if every entry of a ≤ b. If a ≤ b and a ≠ b → a happened-before b; if neither ≤ the other → <strong>concurrent</strong> (conflict to resolve).</li></ul>',
          solution: [
            'package main',
            '',
            'import "fmt"',
            '',
            'type VClock map[string]uint64',
            '',
            'type Order int',
            '',
            'const (',
            '    Equal Order = iota',
            '    Before',
            '    After',
            '    Concurrent',
            ')',
            '',
            'func (v VClock) Increment(node string) { v[node]++ }',
            '',
            'func (v VClock) Merge(o VClock) {',
            '    for n, c := range o {',
            '        if c > v[n] {',
            '            v[n] = c',
            '        }',
            '    }',
            '}',
            '',
            'func (v VClock) Copy() VClock {',
            '    c := VClock{}',
            '    for k, x := range v {',
            '        c[k] = x',
            '    }',
            '    return c',
            '}',
            '',
            'func Compare(a, b VClock) Order {',
            '    aLess, bLess := false, false',
            '    keys := map[string]struct{}{}',
            '    for k := range a {',
            '        keys[k] = struct{}{}',
            '    }',
            '    for k := range b {',
            '        keys[k] = struct{}{}',
            '    }',
            '    for k := range keys {',
            '        switch {',
            '        case a[k] < b[k]:',
            '            aLess = true',
            '        case a[k] > b[k]:',
            '            bLess = true',
            '        }',
            '    }',
            '    switch {',
            '    case aLess && bLess:',
            '        return Concurrent',
            '    case aLess:',
            '        return Before',
            '    case bLess:',
            '        return After',
            '    }',
            '    return Equal',
            '}',
            '',
            'func main() {',
            '    a := VClock{}',
            '    a.Increment("A") // {A:1}',
            '    b := a.Copy()',
            '    b.Increment("B") // {A:1,B:1}',
            '    a.Increment("A") // {A:2}',
            '',
            '    // true: {A:2} vs {A:1,B:1} are conflicting versions',
            '    fmt.Println(Compare(a, b) == Concurrent)',
            '    b.Merge(a)',
            '    b.Increment("B")',
            '    fmt.Println(Compare(a, b) == Before) // true',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Why exactly-once delivery is impossible — and what to do instead',
          d: 'medium',
          type: 'concept',
          hint: '<ul><li>Sender cannot distinguish &quot;message lost&quot; from &quot;ack lost&quot; (Two Generals) → must choose retry (dupes) or not (loss).</li><li>Achieve <strong>effectively-once</strong>: at-least-once delivery + idempotent consumer (dedup ID stored atomically with the effect).</li><li>Kafka EOS: idempotent producer + transactions covering output topics and consumer offsets; <code>read_committed</code> consumers.</li><li>External side effects (email, payment API) need their own idempotency keys.</li></ul>'
        },
        {
          t: 'Distributed lock with fencing tokens',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Problem: client A acquires a lease, pauses (GC/VM stall) past expiry, B acquires, A wakes and writes → corruption.</li><li>Fix: lock service issues a monotonically increasing <strong>fencing token</strong> with each grant (etcd revision, ZooKeeper zxid).</li><li>The storage/resource rejects writes with a token lower than the highest seen.</li><li>Redis single-instance locks (<code>SET NX PX</code>) are fine for efficiency (avoiding duplicate work) but not correctness; Redlock is debated (Kleppmann vs antirez) — use a consensus store for correctness.</li></ul>'
        },
        {
          t: 'Leader election for a singleton cron worker',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Run 3 replicas; only the leader schedules jobs.</li><li>Use a lease in etcd (<code>concurrency.NewElection</code>), Consul session or Kubernetes <code>coordination.k8s.io/Lease</code> (client-go <code>leaderelection</code>).</li><li>Lease TTL ~10–15 s, renew every few seconds; on renew failure stop work immediately.</li><li>Jobs must still be idempotent (two leaders can overlap briefly) and use fencing tokens for side effects.</li><li>Alternative: avoid a leader — each job row claimed with <code>SELECT ... FOR UPDATE SKIP LOCKED</code>.</li></ul>'
        },
        {
          t: 'Design idempotent payment creation',
          d: 'medium',
          type: 'design',
          hint: '<ol><li>Client generates <code>Idempotency-Key</code> per checkout attempt.</li><li>Server inserts <code>(key, request_hash, status=IN_PROGRESS)</code> with a unique constraint; conflict → load existing.</li><li>Existing + completed → return stored response; in progress → 409/retry-after; hash mismatch → 422.</li><li>Call the payment provider with the same key (providers dedupe too).</li><li>Store result and response atomically; TTL ~24 h.</li><li>Crash recovery: a sweeper reconciles IN_PROGRESS records with the provider.</li></ol>'
        },
        {
          t: 'Coordinator crash in two-phase commit',
          d: 'hard',
          type: 'concept',
          hint: '<ul><li><strong>Before prepare:</strong> participants time out and abort — safe.</li><li><strong>After all voted yes, before decision reached them:</strong> participants are <em>in doubt</em>; they cannot commit or abort unilaterally and keep holding locks → blocking.</li><li><strong>After decision logged:</strong> on recovery coordinator re-sends decision from its log.</li><li>Mitigations: replicate the coordinator&#39;s log with consensus (Spanner-style), participant-to-participant termination protocol (cooperative), 3PC (impractical under partitions), or avoid 2PC via sagas.</li></ul>'
        },
        {
          t: 'Saga for e-commerce checkout',
          d: 'hard',
          type: 'design',
          hint: '<ol><li>Order Service: create order PENDING (semantic lock).</li><li>Inventory: reserve items (compensation: release).</li><li>Payment: authorise card — the <strong>pivot</strong>; after it succeeds the saga only moves forward.</li><li>Shipping: create shipment (retry until success).</li><li>Order: mark CONFIRMED.</li></ol><p>Orchestrated with Temporal/Step Functions or a state machine table; each step idempotent; events published via transactional outbox; timeouts trigger compensations; failures surfaced to ops via DLQ. Discuss isolation anomalies (oversell) and why authorise-then-capture helps.</p>'
        },
        {
          t: 'Walk through Raft under a network partition',
          d: 'hard',
          type: 'concept',
          hint: '<ul><li>5 nodes, leader L in minority side {L, B}; majority side {C, D, E}.</li><li>L cannot commit new entries (no majority) — clients time out; uncommitted entries may later be discarded.</li><li>Majority side elects a new leader with a higher term and continues committing.</li><li>When healed, L sees the higher term, steps down, and its conflicting uncommitted entries are overwritten.</li><li>Reads: a leader must confirm leadership (read index / heartbeat round, or leases with bounded clock drift) before serving linearizable reads — otherwise a deposed leader could serve stale data.</li></ul>'
        }
      ],
      interviewFocus: [
        {
          q: 'Explain the CAP theorem precisely and how it applies to a real design decision.',
          a: '<p>CAP says that in the presence of a <strong>network partition</strong>, a replicated system cannot guarantee both <strong>linearizable consistency</strong> and <strong>availability</strong> (every non-failed node answers). Since partitions will happen, we choose behaviour during them: CP systems reject or block requests on the minority side; AP systems keep serving and reconcile later.</p><p>Example: in a ride-sharing app, the driver location stream is AP (stale positions are fine), while trip payment capture is CP. PACELC adds that even without partitions, stronger consistency costs latency — e.g. synchronous cross-region replication adds ~100 ms per write, so we keep it only for money movement.</p>'
        },
        {
          q: 'What is the difference between linearizability and serializability?',
          a: '<ul><li><strong>Linearizability</strong>: a recency guarantee on <em>single objects</em> — once a write completes, all subsequent reads (in real time) see it; operations appear atomic at a point in time.</li><li><strong>Serializability</strong>: an isolation guarantee on <em>transactions over many objects</em> — the outcome equals <em>some</em> serial order, which need not match real time.</li><li><strong>Strict serializability</strong>: both — serial order consistent with real time (Spanner).</li></ul><p>Example: a serializable DB may legally let a read-only transaction see a slightly old snapshot; a linearizable register may not.</p>'
        },
        {
          q: 'How does Raft guarantee that committed entries are never lost?',
          a: '<ul><li>An entry is committed only when stored on a <strong>majority</strong>.</li><li>A candidate needs votes from a majority, and voters refuse candidates whose log is less up-to-date (compare last term, then last index).</li><li>Any two majorities intersect, so the winning candidate&#39;s log must contain every committed entry (<em>Leader Completeness</em>).</li><li>A leader only counts replicas to commit entries from its <strong>current term</strong>; earlier-term entries become committed indirectly — this prevents a subtle overwrite scenario.</li><li>Followers with conflicting entries have them overwritten by the leader&#39;s log (only uncommitted entries can conflict).</li></ul>'
        },
        {
          q: 'Your consumer processes payment events at-least-once. How do you avoid double charging?',
          a: '<ol><li>Each event carries a stable unique ID (e.g. <code>payment_id</code>).</li><li>The consumer writes the business effect and a row in <code>processed_events(event_id PRIMARY KEY)</code> <strong>in the same DB transaction</strong>; a duplicate violates the key and is skipped.</li><li>Calls to external providers carry an idempotency key derived from the payment ID, so provider-side retries are deduped too.</li><li>Commit the consumer offset only after the transaction commits; replays are then harmless.</li><li>Reconciliation job compares ledger vs provider reports daily.</li></ol>'
        },
        {
          q: 'When would you use 2PC instead of a saga?',
          a: '<p>Use 2PC (or a database that does it for you) when the data lives in tightly coupled stores under your control, the transaction is short, and you need atomicity <em>and isolation</em> — e.g. a distributed SQL database committing across shards, or an internal ledger across two partitions where intermediate states must never be visible.</p><p>Use a saga across autonomous services, long-running workflows, or third-party systems (payment providers cannot participate in your 2PC). Accept eventual consistency, design compensations, and mitigate missing isolation with pending states and late pivot steps.</p>'
        }
      ],
      quiz: [
        { q: 'In CAP, what does C mean precisely?', a: 'Linearizability: every read returns the most recent completed write.' },
        { q: 'What does PACELC add to CAP?', a: 'Else (no partition), systems trade Latency against Consistency.' },
        { q: 'For N replicas, what quorum condition guarantees read/write overlap?', a: 'R + W > N.' },
        { q: 'How many node failures does a 5-node Raft cluster tolerate?', a: 'Two (it needs a majority of 3).' },
        { q: 'Why does Raft use randomised election timeouts?', a: 'To make split votes unlikely, so one candidate usually times out first and wins.' },
        { q: 'Can Lamport timestamps detect concurrent events?', a: 'No. Vector clocks are needed to detect concurrency.' },
        { q: 'What is a compensating transaction?', a: 'A saga step that semantically undoes a previously committed local transaction, e.g. a refund.' },
        { q: 'What makes 2PC blocking?', a: 'Prepared participants cannot decide alone if the coordinator fails, so they hold locks until it recovers.' }
      ],
      resources: [
        { title: 'Raft consensus — paper, visualisation and resources', url: 'https://raft.github.io/', type: 'docs' },
        { title: 'Jepsen — Consistency models map', url: 'https://jepsen.io/consistency', type: 'article' },
        { title: 'Martin Kleppmann — How to do distributed locking', url: 'https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html', type: 'article' },
        { title: 'microservices.io — Saga pattern', url: 'https://microservices.io/patterns/data/saga.html', type: 'article' }
      ]
    },
    // ───────────────────────────── Module 6 ─────────────────────────────
    {
      n: 6,
      title: 'Asynchronous Processing & Messaging',
      summary: 'Decoupling producers and consumers in time: queues vs pub/sub vs log-based streams, Kafka internals that interviewers probe, delivery guarantees, retries, DLQs and backpressure, event-driven architecture, the transactional outbox with CDC, delayed/scheduled jobs, and idempotent consumers that make exactly-once effects real.',
      topics: [
        {
          title: 'Message Queues vs Pub/Sub vs Log-Based Streams',
          def: '<p>All three move messages asynchronously, but their consumption model differs fundamentally.</p>' +
            '<table><thead><tr><th></th><th>Message queue</th><th>Pub/Sub (topic fan-out)</th><th>Log-based stream</th></tr></thead><tbody>' +
            '<tr><td>Delivery</td><td>Each message to <strong>one</strong> competing consumer</td><td>Each message to <strong>every</strong> subscription</td><td>Each consumer group reads the whole log; within a group, one consumer per partition</td></tr>' +
            '<tr><td>After consumption</td><td>Deleted on ack</td><td>Deleted per subscription on ack</td><td>Retained (time/size); consumers track offsets</td></tr>' +
            '<tr><td>Replay</td><td>No</td><td>Limited (some offer seek)</td><td>Yes — rewind offsets, add new consumers later</td></tr>' +
            '<tr><td>Ordering</td><td>Best effort (FIFO variants exist)</td><td>Usually none</td><td>Strict per partition</td></tr>' +
            '<tr><td>Per-message features</td><td>Ack/nack, visibility timeout, delay, priority, DLQ</td><td>Filtering, push endpoints</td><td>Minimal: offsets only; DLQ is your job</td></tr>' +
            '<tr><td>Examples</td><td>RabbitMQ, Amazon SQS, Azure Service Bus queues</td><td>Amazon SNS, Google Pub/Sub, NATS</td><td>Apache Kafka, Kinesis, Pulsar, Redpanda</td></tr>' +
            '<tr><td>Best for</td><td>Task distribution, work queues</td><td>Notifications, fan-out to many services</td><td>Event streaming, CDC, analytics, event sourcing, high throughput</td></tr>' +
            '</tbody></table>' +
            '<p>Common combinations: SNS → multiple SQS queues (fan-out with per-consumer buffering and retries); Kafka as the event backbone with per-service consumer groups. <strong>Why async at all?</strong> Absorb bursts (load levelling), decouple availability (producer works while consumer is down), enable fan-out, and move slow work (emails, transcoding) off the request path. Costs: eventual consistency, harder debugging, duplicate handling and operational overhead.</p>',
          interview: 'State what consumption semantics you need — competing consumers, fan-out, or replayable ordered log — and pick accordingly. Saying "Kafka" for a simple background-job queue is a mild red flag; SQS/RabbitMQ is often the better fit.',
          examples: [{
            label: 'Fan-out with per-consumer queues and a DLQ (SNS + SQS, AWS CLI)',
            lang: 'bash',
            code: [
              '# Pub/sub fan-out: one topic, one queue per consuming service; each queue buffers,',
              '# retries and dead-letters independently of the others',
              'aws sns create-topic --name user-signed-up',
              'aws sqs create-queue --queue-name email-dlq',
              'aws sqs create-queue --queue-name email-svc --attributes file://email-svc.json',
              'aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs \\',
              '  --notification-endpoint "$EMAIL_QUEUE_ARN" --attributes RawMessageDelivery=true',
              '# (plus a queue policy that allows the topic to sqs:SendMessage)',
              '',
              '# email-svc.json: redeliver after 60 s if not deleted; after 5 receives move to the DLQ',
              '{ "VisibilityTimeout": "60",',
              '  "RedrivePolicy": "{\\"deadLetterTargetArn\\":\\"arn:aws:sqs:eu-west-1:123456789012:email-dlq\\",\\"maxReceiveCount\\":\\"5\\"}" }',
              '',
              '# Within email-svc: competing consumers (queue semantics, each message to one worker).',
              '# Log alternative: ONE Kafka topic, a consumer group per service, replay by resetting offsets.'
            ].join('\n')
          }]
        },
        {
          title: 'Kafka Essentials: Partitions, Consumer Groups, Offsets, Ordering',
          def: '<ul><li><strong>Topic</strong> = named log split into <strong>partitions</strong>; each partition is an ordered, append-only, immutable sequence with increasing <strong>offsets</strong>. Partitions are the unit of parallelism and ordering.</li>' +
            '<li><strong>Keys</strong>: producers hash the key (murmur2) to pick a partition, so all events for a key (e.g. <code>order_id</code>) land in one partition and stay <strong>ordered</strong>. No ordering across partitions.</li>' +
            '<li><strong>Consumer groups</strong>: each partition is assigned to exactly one consumer in a group; max useful parallelism = number of partitions. Different groups read independently (fan-out). Rebalances reassign partitions when members join/leave (cooperative-sticky assignor; the new consumer rebalance protocol from KIP-848 reduces stop-the-world pauses).</li>' +
            '<li><strong>Offsets</strong>: committed per group/partition in the internal <code>__consumer_offsets</code> topic. Commit <em>after</em> processing = at-least-once; before = at-most-once.</li>' +
            '<li><strong>Replication</strong>: each partition has a leader and followers; the <strong>ISR</strong> (in-sync replicas) are followers caught up. Durable config: replication factor 3, <code>acks=all</code>, <code>min.insync.replicas=2</code>, <code>unclean.leader.election.enable=false</code>.</li>' +
            '<li><strong>Idempotent producer</strong> (default since Kafka 3.0) removes duplicates from producer retries; <strong>transactions</strong> enable exactly-once read-process-write within Kafka.</li>' +
            '<li><strong>Retention</strong> by time/size, or <strong>log compaction</strong> (keep latest value per key — changelog/state topics).</li>' +
            '<li><strong>KRaft</strong>: Kafka 4.0 removed ZooKeeper; metadata is managed by a Raft quorum of controllers.</li></ul>' +
            '<p><strong>Partition count:</strong> roughly max(target throughput / per-partition producer throughput, target throughput / per-consumer throughput), plus headroom. Adding partitions later changes the key → partition mapping and breaks per-key ordering during the transition, so over-provision moderately up front.</p>',
          interview: 'Classic probes: "how do you guarantee ordering per user?" (key by user ID, one partition), "how many consumers can a group use?" (at most partitions), "what are acks=all and min.insync.replicas?", and "what happens on rebalance?" (duplicates if offsets not committed — consumers must be idempotent).',
          examples: [{
            label: 'Partitions and consumer groups',
            lang: 'text',
            code: [
              'Topic "orders" (key = order_id), 4 partitions, RF=3',
              '',
              '  P0: [0][1][2][3][4][5]...        Group "billing"   (3 consumers)',
              '  P1: [0][1][2][3]...               c1 <- P0, P1',
              '  P2: [0][1][2][3][4]...            c2 <- P2',
              '  P3: [0][1][2]...                  c3 <- P3',
              '',
              '                                   Group "analytics" (1 consumer)',
              '                                    a1 <- P0, P1, P2, P3  (independent offsets)',
              '',
              'Ordering: guaranteed within a partition (per order_id), not across partitions.',
              'A 5th consumer in "billing" would sit idle: parallelism <= partitions.'
            ].join('\n')
          }]
        },
        {
          title: 'Delivery Semantics, Retries, DLQs & Backpressure',
          def: '<p>Most production messaging is <strong>at-least-once</strong>: messages can be redelivered after consumer crashes, timeouts or rebalances. Therefore <strong>consumers must be idempotent</strong> (dedup by message ID or naturally idempotent writes).</p>' +
            '<p><strong>Retries and dead-letter queues:</strong></p>' +
            '<ul><li>Classify failures: <em>transient</em> (timeout, 503) → retry with exponential backoff + jitter; <em>permanent</em> (validation error, unknown schema) → do not retry, route to a <strong>DLQ</strong>.</li>' +
            '<li>A <strong>poison message</strong> that always fails must not block the queue or partition forever. SQS: <code>maxReceiveCount</code> → redrive to DLQ. Kafka: retry topics with increasing delays (<code>orders.retry.1m</code>, <code>orders.retry.10m</code>) then <code>orders.dlq</code>; note this sacrifices strict ordering for that key.</li>' +
            '<li>DLQs need alerting, inspection tooling and a <strong>redrive</strong> path once fixed.</li>' +
            '<li>SQS <strong>visibility timeout</strong> must exceed processing time (extend it for long jobs) or messages are redelivered while still being processed.</li></ul>' +
            '<p><strong>Backpressure</strong> means slowing producers when consumers cannot keep up, instead of letting unbounded buffers grow until memory or latency explodes.</p>' +
            '<table><thead><tr><th>Mechanism</th><th>Example</th></tr></thead><tbody>' +
            '<tr><td>Bounded buffers that block</td><td>Go buffered channel: send blocks when full</td></tr>' +
            '<tr><td>Pull-based consumption</td><td>Kafka consumers fetch at their own pace; lag grows instead of crashing</td></tr>' +
            '<tr><td>Credit/flow control</td><td>HTTP/2 and gRPC window sizes, Reactive Streams demand</td></tr>' +
            '<tr><td>Reject/shed</td><td>Return 429/503 when queue depth exceeds a threshold</td></tr>' +
            '<tr><td>Scale consumers</td><td>KEDA scales on queue depth / consumer lag</td></tr>' +
            '</tbody></table>' +
            '<p>Monitor <strong>queue depth / consumer lag</strong> and <strong>age of oldest message</strong> — they are the key SLIs of an async system.</p>',
          interview: 'When you introduce a queue, proactively cover: idempotent consumers, retry with backoff, DLQ with alerting and redrive, and what metric tells you the system is falling behind (lag, oldest-message age). Mention that unbounded queues just move the failure.',
          examples: [{
            label: 'Bounded worker pool with backpressure (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "context"',
              '    "fmt"',
              '    "sync"',
              '    "time"',
              ')',
              '',
              'type Job struct{ ID int }',
              '',
              'func main() {',
              '    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)',
              '    defer cancel()',
              '',
              '    jobs := make(chan Job, 10) // bounded: producers block when full',
              '    var wg sync.WaitGroup',
              '    for w := 1; w <= 3; w++ {',
              '        wg.Add(1)',
              '        go func(id int) {',
              '            defer wg.Done()',
              '            for j := range jobs {',
              '                time.Sleep(20 * time.Millisecond) // simulate work',
              '                fmt.Printf("worker %d done job %d\\n", id, j.ID)',
              '            }',
              '        }(w)',
              '    }',
              '',
              '    for i := 0; i < 30; i++ {',
              '        select {',
              '        case jobs <- Job{ID: i}: // blocks -> natural backpressure',
              '        case <-ctx.Done():',
              '            fmt.Println("deadline reached: shedding job", i)',
              '        }',
              '    }',
              '    close(jobs)',
              '    wg.Wait()',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Event-Driven Architecture',
          def: '<p>In event-driven architecture (EDA), services publish <strong>facts that happened</strong> (<code>OrderPlaced</code>, <code>PaymentCaptured</code>) and others react, instead of calling each other synchronously. Martin Fowler distinguishes several styles:</p>' +
            '<table><thead><tr><th>Style</th><th>Event contains</th><th>Pros</th><th>Cons</th></tr></thead><tbody>' +
            '<tr><td><strong>Event notification</strong></td><td>Just an ID + type (&quot;order 42 changed&quot;)</td><td>Small, loose coupling</td><td>Consumers call back for data → load and coupling</td></tr>' +
            '<tr><td><strong>Event-carried state transfer</strong></td><td>The relevant state</td><td>Consumers keep local copies, no callbacks, resilient</td><td>Data duplication, larger events, schema coupling</td></tr>' +
            '<tr><td><strong>Event sourcing</strong></td><td>Events are the source of truth</td><td>Full audit/history, replay, temporal queries</td><td>Complexity, event versioning, snapshots</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Commands vs events:</strong> a command (<code>ChargeCard</code>) asks one handler to do something and may be rejected; an event (<code>CardCharged</code>) is an immutable fact broadcast to anyone interested. Name events in past tense.</p>' +
            '<p><strong>Design concerns:</strong></p>' +
            '<ul><li><strong>Schema evolution</strong>: use Avro/Protobuf/JSON Schema with a schema registry; only backward-compatible changes (add optional fields), version topics for breaking changes.</li>' +
            '<li><strong>Ordering</strong>: partition by aggregate ID.</li>' +
            '<li><strong>Idempotency and duplicates</strong> everywhere.</li>' +
            '<li><strong>Observability</strong>: propagate trace context in message headers (W3C <code>traceparent</code>); flows are invisible otherwise.</li>' +
            '<li><strong>Eventual consistency in the UI</strong>: show &quot;processing&quot; states, use polling/websockets for completion.</li></ul>' +
            '<p>EDA shines for fan-out, integration and auditability; it hurts when a user needs an immediate, consistent answer — keep those paths synchronous.</p>',
          interview: 'Explain why you made an interaction async (decoupling, fan-out, burst absorption) and how the user experiences the eventual consistency. Distinguish events from commands, and mention schema evolution plus trace propagation — practical concerns interviewers like.',
          examples: [{
            label: 'An event envelope worth copying (CloudEvents, annotated)',
            lang: 'text',
            code: [
              '{',
              '  "specversion": "1.0",',
              '  "id": "8f2c1e5a-6b1d-4f7e-9a0c-2d3e4f5a6b7c",   <- unique: consumers dedupe on it',
              '  "source": "/orders-service",',
              '  "type": "com.shop.order.placed.v1",              <- past tense fact, versioned',
              '  "subject": "order/o987",                          <- aggregate id = message key -> per-order ordering',
              '  "time": "2026-10-29T10:00:00Z",',
              '  "datacontenttype": "application/json",',
              '  "dataschema": "https://schemas.shop.example/order-placed/v1.json",   <- registry-checked',
              '  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",   <- trace across the hop',
              '  "data": {                                         <- event-carried state: no call-back needed',
              '    "orderId": "o987", "customerId": "c123", "totalCents": 4599, "currency": "EUR",',
              '    "items": [ { "sku": "sku1", "qty": 2 } ]',
              '  }',
              '}',
              'Evolution rule: add optional fields freely; renaming/removing/changing meaning = new type (.v2)'
            ].join('\n')
          }]
        },
        {
          title: 'Transactional Outbox & Change Data Capture',
          def: '<p><strong>The dual-write problem:</strong> a service must update its DB <em>and</em> publish an event. Doing both directly is not atomic: DB commit succeeds then publish fails (event lost), or publish succeeds then commit rolls back (phantom event). Distributed transactions across DB and broker are rarely available or desirable.</p>' +
            '<p><strong>Transactional outbox:</strong> in the <em>same local transaction</em> as the business change, insert the event into an <code>outbox</code> table. A separate <strong>relay</strong> publishes outbox rows to the broker and marks them sent (or deletes them). Delivery is at-least-once, so consumers dedupe by event ID.</p>' +
            '<p><strong>Relay options:</strong></p>' +
            '<ul><li><strong>Polling publisher</strong>: <code>SELECT ... FROM outbox WHERE sent_at IS NULL ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED</code>; simple, adds DB load and latency.</li>' +
            '<li><strong>Log tailing (CDC)</strong>: Debezium reads the WAL/binlog and streams outbox inserts to Kafka (Debezium outbox event router). Low latency, no polling, preserves commit order.</li></ul>' +
            '<p><strong>Change Data Capture (CDC)</strong> more generally streams every row change from the DB log: used to feed search indexes, caches, data warehouses and other services without touching application code. Caveat: raw table changes expose your internal schema to consumers — prefer outbox events (a deliberate public contract) for inter-service integration, raw CDC for internal derived data.</p>' +
            '<p>The inverse problem — consuming a message and updating the DB exactly once — is solved by the <strong>inbox</strong> pattern: record processed message IDs in the same transaction as the effect.</p>',
          interview: 'If your design writes to a DB and publishes an event, the interviewer will ask "what if the publish fails?". Answer with the transactional outbox plus a CDC or polling relay, at-least-once delivery, and idempotent consumers (inbox table).',
          examples: [{
            label: 'Outbox write + polling relay (Go, database/sql)',
            lang: 'go',
            code: [
              'package outbox',
              '',
              'import (',
              '    "context"',
              '    "database/sql"',
              ')',
              '',
              'type Publisher interface {',
              '    Publish(ctx context.Context, topic, key string, payload []byte) error',
              '}',
              '',
              '// PlaceOrder writes the order and its event atomically.',
              'func PlaceOrder(ctx context.Context, db *sql.DB, orderID string, payload []byte) error {',
              '    tx, err := db.BeginTx(ctx, nil)',
              '    if err != nil {',
              '        return err',
              '    }',
              '    defer tx.Rollback() // no-op after Commit',
              '    if _, err := tx.ExecContext(ctx,',
              '        `INSERT INTO orders (id, status) VALUES ($1, \'PLACED\')`, orderID); err != nil {',
              '        return err',
              '    }',
              '    if _, err := tx.ExecContext(ctx,',
              '        `INSERT INTO outbox (aggregate_id, topic, payload) VALUES ($1, \'orders\', $2)`,',
              '        orderID, payload); err != nil {',
              '        return err',
              '    }',
              '    return tx.Commit()',
              '}',
              '',
              '// RelayOnce publishes a batch of pending events; run it in a loop or ticker.',
              'func RelayOnce(ctx context.Context, db *sql.DB, pub Publisher) error {',
              '    tx, err := db.BeginTx(ctx, nil)',
              '    if err != nil {',
              '        return err',
              '    }',
              '    defer tx.Rollback()',
              '    rows, err := tx.QueryContext(ctx, `SELECT id, aggregate_id, topic, payload FROM outbox',
              '        WHERE sent_at IS NULL ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED`)',
              '    if err != nil {',
              '        return err',
              '    }',
              '    type evt struct {',
              '        id         int64',
              '        key, topic string',
              '        payload    []byte',
              '    }',
              '    var batch []evt',
              '    for rows.Next() {',
              '        var e evt',
              '        if err := rows.Scan(&e.id, &e.key, &e.topic, &e.payload); err != nil {',
              '            rows.Close()',
              '            return err',
              '        }',
              '        batch = append(batch, e)',
              '    }',
              '    rows.Close()',
              '    for _, e := range batch {',
              '        if err := pub.Publish(ctx, e.topic, e.key, e.payload); err != nil {',
              '            return err // rollback; rows retried later (at-least-once)',
              '        }',
              '        if _, err := tx.ExecContext(ctx, `UPDATE outbox SET sent_at = now() WHERE id = $1`, e.id); err != nil {',
              '            return err',
              '        }',
              '    }',
              '    return tx.Commit()',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Scheduled & Delayed Jobs',
          def: '<p>Many products need work to happen <em>later</em>: send a reminder in 24 h, cancel an unpaid order after 15 min, retry a webhook in 10 min, run a nightly report.</p>' +
            '<table><thead><tr><th>Approach</th><th>How</th><th>Strengths</th><th>Limits</th></tr></thead><tbody>' +
            '<tr><td><strong>Broker delay</strong></td><td>SQS <code>DelaySeconds</code>, RabbitMQ delayed exchange plugin</td><td>Zero extra infra</td><td>SQS max 15 min; cannot cancel easily</td></tr>' +
            '<tr><td><strong>DB table + poller</strong></td><td><code>jobs(run_at, status)</code> indexed on <code>run_at</code>; workers claim with <code>FOR UPDATE SKIP LOCKED</code></td><td>Durable, transactional, cancellable, simple</td><td>Polling load; DB becomes queue at very high scale</td></tr>' +
            '<tr><td><strong>Redis sorted set</strong></td><td><code>ZADD delayed score=run_at</code>; workers atomically pop due items (Lua)</td><td>Fast, millions of timers</td><td>Durability depends on Redis persistence</td></tr>' +
            '<tr><td><strong>Timing wheel</strong></td><td>Hierarchical circular buckets in memory (Kafka purgatory, Netty)</td><td>O(1) insert/expire for huge timer counts</td><td>In-memory; needs persistence layer</td></tr>' +
            '<tr><td><strong>Managed schedulers / workflows</strong></td><td>EventBridge Scheduler, Cloud Tasks, Temporal timers</td><td>Durable, scalable, observable</td><td>Vendor coupling, cost</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Correctness checklist:</strong></p>' +
            '<ul><li>Jobs run <strong>at least once</strong> → handlers idempotent; use a job ID as dedup key.</li>' +
            '<li><strong>Exactly one scheduler</strong> for cron-style triggers (leader election), or make triggers idempotent (unique <code>(job, scheduled_time)</code> key).</li>' +
            '<li><strong>Visibility/lease timeout</strong> so crashed workers&#39; jobs are reclaimed.</li>' +
            '<li>Handle <strong>missed runs</strong> after downtime (catch up or skip), time zones and DST for user-facing schedules.</li>' +
            '<li>Spread load: avoid every tenant&#39;s job at 00:00 — add jitter.</li></ul>',
          interview: 'Know at least two implementations (DB + SKIP LOCKED, Redis ZSET) and their trade-offs, mention the 15-minute SQS delay limit, and always cover duplicate execution, worker crashes (leases) and cron leader election.',
          examples: [{
            label: 'Durable delayed jobs in Postgres: claim with a lease and SKIP LOCKED',
            lang: 'sql',
            code: [
              'CREATE TABLE jobs (',
              '  id          bigserial PRIMARY KEY,',
              '  run_at      timestamptz NOT NULL,',
              '  status      text NOT NULL DEFAULT \'pending\',   -- pending | running | done | dead',
              '  attempts    int  NOT NULL DEFAULT 0,',
              '  lease_until timestamptz,',
              '  payload     jsonb NOT NULL,',
              '  dedup_key   text UNIQUE                        -- e.g. \'cancel-unpaid:o987\' -> idempotent enqueue',
              ');',
              'CREATE INDEX jobs_due ON jobs (run_at) WHERE status IN (\'pending\', \'running\');',
              '',
              '-- Worker: claim up to 10 due jobs, or jobs whose lease expired because a worker crashed',
              'UPDATE jobs SET status = \'running\', attempts = attempts + 1,',
              '                lease_until = now() + interval \'60 seconds\'',
              'WHERE id IN (',
              '  SELECT id FROM jobs',
              '  WHERE (status = \'pending\' AND run_at <= now())',
              '     OR (status = \'running\' AND lease_until < now())',
              '  ORDER BY run_at',
              '  LIMIT 10',
              '  FOR UPDATE SKIP LOCKED                         -- concurrent workers never claim the same row',
              ')',
              'RETURNING id, payload, attempts;',
              '',
              '-- success : UPDATE jobs SET status = \'done\' WHERE id = $1 AND status = \'running\';',
              '-- failure : UPDATE jobs SET status = \'pending\',',
              '--             run_at = now() + interval \'1 minute\' * power(2, attempts) WHERE id = $1;',
              '-- cancel  : UPDATE jobs SET status = \'done\' WHERE dedup_key = $1 AND status = \'pending\';'
            ].join('\n')
          }]
        },
        {
          title: 'Idempotent Consumers & Exactly-Once in Practice',
          def: '<p>Every real pipeline is at-least-once somewhere: a consumer crashes after writing to the database but before committing its offset, a rebalance hands the partition to another consumer, an SQS visibility timeout expires mid-processing, a producer retries after a lost ack. &quot;Exactly-once&quot; in practice means <strong>exactly-once effects</strong>: duplicates still arrive, but they change nothing.</p>' +
            '<table><thead><tr><th>Where the effect lands</th><th>Technique</th><th>Notes</th></tr>' +
            '</thead><tbody>' +
            '<tr><td>Your database</td><td><strong>Inbox / dedup table</strong>: insert the message ID and apply the change in one transaction; a duplicate ID inserts nothing and is skipped</td><td>Ack or commit the offset only after the DB commit. The ID must be stable across redeliveries (assigned by the producer, e.g. the outbox row ID), never generated by the consumer</td></tr>' +
            '<tr><td>Your database, ordered stream</td><td>Store the last applied offset or aggregate version in the same transaction; ignore anything at or below it</td><td>Also lets the consumer resume from its own DB rather than the broker&#39;s committed offset</td></tr>' +
            '<tr><td>State that can be overwritten</td><td><strong>Natural idempotency</strong>: upsert / set-to-value with a version guard (<code>UPDATE ... SET v = $new WHERE version &lt; $ver</code>)</td><td>Avoid blind increments (<code>+1</code>) unless they are deduplicated</td></tr>' +
            '<tr><td>Kafka to Kafka</td><td><strong>Kafka transactions</strong>: consume-transform-produce where output records and consumer offsets commit atomically; downstream reads with <code>read_committed</code></td><td>Exactly-once only inside Kafka; external side effects are not covered</td></tr>' +
            '<tr><td>External API (payment, email, SMS)</td><td>Pass an <strong>idempotency key</strong> derived from the event ID; the provider deduplicates</td><td>If the provider has no keys: record intent, call, record result, and reconcile UNKNOWN outcomes</td></tr>' +
            '<tr><td>Stream processors</td><td>Flink checkpoints with two-phase-commit sinks; Kafka Streams <code>exactly_once_v2</code></td><td>End to end only if the sink is transactional or idempotent</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Pitfalls:</strong> dedup windows that are too short (a Redis set of IDs with a TTL forgets them — size it to the longest redelivery or replay you might do; SQS FIFO deduplicates only within 5 minutes); dedup that is not atomic with the effect (check-then-process races between two consumers during a rebalance); side effects fired <em>before</em> the transaction commits; and treating the consumer offset as the only source of progress.</p>' +
            '<p><strong>Ordering interacts with idempotency:</strong> if events for one aggregate can arrive out of order (retries, retry topics, several partitions), carry a version or sequence number and apply only newer versions; otherwise an old <code>Updated</code> event replayed after a newer one silently reverts state.</p>',
          interview: 'Never claim exactly-once delivery. Say: delivery is at-least-once; effects are exactly-once because the consumer records the event ID in the same transaction as the change and commits the offset afterwards; Kafka transactions cover Kafka-to-Kafka; external calls carry idempotency keys. Then mention dedup windows and version guards for out-of-order events.',
          examples: [{
            label: 'Inbox-pattern consumer: claim the event ID and apply the effect atomically (Go)',
            lang: 'go',
            code: [
              'package consumer',
              '',
              'import (',
              '    "context"',
              '    "database/sql"',
              ')',
              '',
              'type Event struct {',
              '    ID      string // stable, producer-assigned (e.g. the outbox row UUID), identical on every redelivery',
              '    OrderID string',
              '    Amount  int64',
              '}',
              '',
              '// Handle applies the event at most once, however many times the broker delivers it.',
              '// The caller acks the message / commits the offset ONLY after Handle returns nil.',
              'func Handle(ctx context.Context, db *sql.DB, e Event) error {',
              '    tx, err := db.BeginTx(ctx, nil)',
              '    if err != nil {',
              '        return err',
              '    }',
              '    defer tx.Rollback() // no-op after Commit',
              '',
              '    // 1) Claim the event ID. A duplicate hits the primary key and inserts 0 rows.',
              '    res, err := tx.ExecContext(ctx,',
              '        `INSERT INTO processed_events (event_id, processed_at) VALUES ($1, now())',
              '         ON CONFLICT (event_id) DO NOTHING`, e.ID)',
              '    if err != nil {',
              '        return err',
              '    }',
              '    if n, err := res.RowsAffected(); err != nil {',
              '        return err',
              '    } else if n == 0 {',
              '        return nil // already applied: just ack',
              '    }',
              '',
              '    // 2) The business effect, in the SAME transaction as the claim.',
              '    if _, err := tx.ExecContext(ctx,',
              '        `UPDATE orders SET paid_cents = paid_cents + $1, status = \'PAID\' WHERE id = $2`,',
              '        e.Amount, e.OrderID); err != nil {',
              '        return err // rollback also releases the claim, so a redelivery retries cleanly',
              '    }',
              '    return tx.Commit()',
              '}'
            ].join('\n')
          }, {
            label: 'Kafka exactly-once read-process-write settings',
            lang: 'text',
            code: [
              'producer : enable.idempotence=true, acks=all, transactional.id=<stable id per producer instance>',
              'consumer : isolation.level=read_committed, enable.auto.commit=false',
              'loop     : poll -> beginTransaction -> produce outputs',
              '           -> sendOffsetsToTransaction(offsets, consumerGroupMetadata) -> commitTransaction',
              '           (abort on error; the batch is re-read and re-processed, outputs are never half-visible)',
              'Kafka Streams: processing.guarantee=exactly_once_v2',
              'Go clients   : franz-go (kgo, GroupTransactSession) and confluent-kafka-go expose the same flow',
              'Scope        : Kafka topics only. A database write or HTTP call inside the loop still needs the inbox',
              '               table or an idempotency key.'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'Queue, pub/sub or stream? Pick for four scenarios',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li><strong>Thumbnail generation jobs:</strong> queue (SQS/RabbitMQ) — competing workers, per-message retries, DLQ.</li><li><strong>&quot;User signed up&quot; consumed by email, analytics, CRM:</strong> pub/sub fan-out (SNS → SQS per consumer) or Kafka topic with a group per service.</li><li><strong>Clickstream at 1M events/s for analytics + replay:</strong> Kafka/Kinesis log.</li><li><strong>DB changes feeding search index:</strong> CDC → Kafka (ordered per key, replayable).</li></ul>'
        },
        {
          t: 'Guarantee per-customer ordering in Kafka',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li>Use <code>customer_id</code> as the message key → same partition → ordered.</li><li>Producer: idempotence on (default), <code>acks=all</code>; with idempotence, ordering is preserved even with up to 5 in-flight requests.</li><li>Consumer: process a partition sequentially (or per-key parallelism inside the consumer, preserving key order).</li><li>Beware: retry topics and DLQs break ordering for that key; adding partitions remaps keys.</li></ul>'
        },
        {
          t: 'Estimate Kafka partition count',
          d: 'medium',
          type: 'concept',
          hint: '<ul><li>Target 200 MB/s ingest; one partition sustains ~10 MB/s produce in your benchmark; one consumer processes ~5 MB/s.</li><li>Producer bound: 200/10 = 20; consumer bound: 200/5 = <strong>40</strong> → choose ~48–60 for headroom and future growth.</li><li>Too many partitions: more open files, longer leader elections, larger rebalance cost — keep it in the hundreds per topic, not tens of thousands, unless needed.</li></ul>'
        },
        {
          t: 'Retry with backoff and dead-letter queue',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Classify errors: transient vs permanent.</li><li>In-process retries for quick blips (3 attempts in total = 2 retries, 100 ms → 400 ms with jitter).</li><li>Then publish to tiered retry topics/queues with delays (1 min, 10 min, 1 h); include attempt count and original metadata in headers.</li><li>After max attempts → DLQ with error reason; alert on DLQ depth; build a redrive tool.</li><li>Ensure idempotency since retries duplicate; document ordering impact.</li></ul>'
        },
        {
          t: 'Consumer lag keeps growing — diagnose it',
          d: 'medium',
          type: 'debug',
          hint: '<ol><li>Is lag uniform or on one partition? One partition → hot key or poison message stuck in retries.</li><li>Check processing time per message (downstream DB slow? external API throttled?).</li><li>Consumers ≥ partitions? Extra consumers are idle; consider more partitions.</li><li>Frequent rebalances (<code>max.poll.interval.ms</code> exceeded by slow batches) → reduce <code>max.poll.records</code>, process asynchronously with care, use static membership.</li><li>Fixes: batch DB writes, parallelise per key within a partition, scale consumers with KEDA on lag, shed non-critical work.</li></ol>'
        },
        {
          t: 'Bounded concurrent processor with graceful shutdown',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li>Read from a source channel; run up to N handlers concurrently using a semaphore (buffered channel).</li><li>On context cancel: stop taking new messages, wait for in-flight handlers, then return.</li><li>Ack only after successful handling (at-least-once).</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "context"',
            '    "fmt"',
            '    "sync"',
            '    "time"',
            ')',
            '',
            'type Msg struct {',
            '    ID  int',
            '    Ack func()',
            '}',
            '',
            'func Run(ctx context.Context, in <-chan Msg, n int, handle func(context.Context, Msg) error) {',
            '    sem := make(chan struct{}, n)',
            '    var wg sync.WaitGroup',
            '    defer wg.Wait() // drain in-flight work before returning',
            '    for {',
            '        select {',
            '        case <-ctx.Done():',
            '            return',
            '        case m, ok := <-in:',
            '            if !ok {',
            '                return',
            '            }',
            '            sem <- struct{}{} // blocks when n handlers busy: backpressure',
            '            wg.Add(1)',
            '            go func() {',
            '                defer func() { <-sem; wg.Done() }()',
            '                if err := handle(context.WithoutCancel(ctx), m); err == nil {',
            '                    m.Ack()',
            '                } // else: no ack -> redelivered later',
            '            }()',
            '        }',
            '    }',
            '}',
            '',
            'func main() {',
            '    ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)',
            '    defer cancel()',
            '    in := make(chan Msg)',
            '    go func() {',
            '        defer close(in)',
            '        for i := 0; i < 20; i++ {',
            '            id := i',
            '            select {',
            '            case in <- Msg{ID: id, Ack: func() { fmt.Println("acked", id) }}:',
            '            case <-ctx.Done():',
            '                return',
            '            }',
            '        }',
            '    }()',
            '    Run(ctx, in, 4, func(ctx context.Context, m Msg) error {',
            '        time.Sleep(50 * time.Millisecond)',
            '        return nil',
            '    })',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Cancel unpaid orders after 15 minutes',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Option A: SQS message with <code>DelaySeconds=900</code> carrying order ID; handler checks status and cancels if still PENDING (idempotent, conditional update).</li><li>Option B: <code>expires_at</code> column + poller every 30 s using <code>SKIP LOCKED</code>; cancellable naturally since status is checked.</li><li>Option C: Temporal workflow with a timer racing the payment signal.</li><li>Release inventory reservation in the same transaction/saga step; emit <code>OrderCancelled</code> via outbox.</li><li>Race with late payment: conditional state transition (<code>UPDATE ... WHERE status=\'PENDING\'</code>); refund if payment arrives after cancel.</li></ul>'
        },
        {
          t: 'Reprocess six hours of events after a consumer bug',
          d: 'hard',
          type: 'design',
          hint: '<ul><li>Kafka retention must cover the window (plan retention ≥ worst-case detection time).</li><li>Deploy fixed consumer; reset group offsets to a timestamp (<code>kafka-consumer-groups --reset-offsets --to-datetime</code>) or run a separate replay group writing to the same sinks.</li><li>Effects must be idempotent/upserts keyed by event ID, or write to a new versioned table and swap.</li><li>Throttle replay to protect downstream; side effects (emails) must be suppressed during replay (flag in context).</li><li>Verify with reconciliation counts.</li></ul>'
        },
        {
          t: 'Design a reliable event pipeline for order processing',
          d: 'hard',
          type: 'design',
          hint: '<ol><li>Order service writes order + outbox in one transaction; Debezium streams outbox to Kafka topic <code>orders</code> keyed by order ID.</li><li>Inventory, Payment, Notification services each have their own consumer group; each uses an inbox table for dedup and commits offsets after DB commit.</li><li>Saga orchestration for checkout; compensations on failures.</li><li>Schema registry with backward-compatible Protobuf/Avro.</li><li>Retry topics + DLQ, alerting on lag and DLQ depth; trace context in headers.</li><li>Replay strategy and retention, and a reconciliation job as a safety net.</li></ol>'
        }
      ],
      interviewFocus: [
        {
          q: 'Explain the dual-write problem and how the transactional outbox solves it.',
          a: '<p>Updating a DB and publishing to a broker are two separate systems with no shared transaction. Any crash between them causes lost events (DB committed, publish failed) or ghost events (published, DB rolled back), making downstream state diverge.</p><p>The <strong>outbox</strong> writes the event into an <code>outbox</code> table within the <em>same</em> local transaction as the business data, so both commit or neither does. A relay (polling with <code>SKIP LOCKED</code>, or CDC via Debezium) publishes rows to the broker and marks them sent. The relay can publish twice after a crash, so delivery is at-least-once and consumers dedupe by event ID (inbox table). Ordering per aggregate is preserved by keying on aggregate ID.</p>'
        },
        {
          q: 'How does Kafka achieve durability and what settings would you use for financial events?',
          a: '<ul><li><strong>Replication factor 3</strong> across racks/AZs.</li><li><strong>acks=all</strong>: leader waits for all in-sync replicas.</li><li><strong>min.insync.replicas=2</strong>: if fewer than 2 replicas are in sync, produces fail rather than accepting under-replicated writes.</li><li><strong>unclean.leader.election.enable=false</strong>: never elect an out-of-sync replica (no silent data loss).</li><li><strong>Idempotent producer</strong> + transactions for exactly-once read-process-write.</li><li>Consumers commit offsets after processing; <code>isolation.level=read_committed</code>.</li></ul><p>Trade-off: higher produce latency and reduced write availability when two replicas are down — the right call for money.</p>'
        },
        {
          q: 'When should you NOT make something asynchronous?',
          a: '<ul><li>The user needs an immediate, consistent answer (login, balance check, seat confirmation shown on screen).</li><li>The operation is fast and the dependency is reliable — a queue adds latency, infra and failure modes.</li><li>Strict request/response semantics with validation errors the caller must act on.</li><li>Debuggability matters more than decoupling for a small team.</li></ul><p>A good pattern is a synchronous core (accept and validate, persist intent) with asynchronous side effects (emails, analytics, search indexing), returning <code>202 Accepted</code> plus a status resource for long work.</p>'
        },
        {
          q: 'What is backpressure and how would you implement it end to end?',
          a: '<p>Backpressure propagates &quot;slow down&quot; from a saturated consumer back to producers so the system degrades gracefully instead of exhausting memory or exploding latency.</p><ul><li><strong>In-process</strong>: bounded channels/semaphores; when full, block or reject.</li><li><strong>Between services</strong>: concurrency limits (adaptive, e.g. Netflix concurrency-limits), 429/503 with <code>Retry-After</code>, gRPC flow control.</li><li><strong>Through brokers</strong>: pull-based consumers naturally apply backpressure; monitor lag and autoscale consumers; cap producer rates for non-critical traffic.</li><li><strong>At the edge</strong>: rate limiting and load shedding by priority.</li></ul><p>The key is that every buffer is bounded and every overflow has a defined behaviour.</p>'
        },
        {
          q: 'Compare RabbitMQ/SQS-style queues with Kafka for a background job system.',
          a: '<table><thead><tr><th></th><th>SQS / RabbitMQ</th><th>Kafka</th></tr></thead><tbody><tr><td>Per-message ack &amp; retry</td><td>Native (visibility timeout, nack, DLQ)</td><td>Offset-based; retries/DLQ built by you</td></tr><tr><td>Slow message impact</td><td>Only that message</td><td>Blocks its partition (head-of-line)</td></tr><tr><td>Scaling consumers</td><td>Any number of competing consumers</td><td>Limited by partitions</td></tr><tr><td>Replay</td><td>No</td><td>Yes</td></tr><tr><td>Throughput</td><td>High</td><td>Very high, batched</td></tr></tbody></table><p>For heterogeneous, independent jobs with variable durations, a queue fits better. For ordered event streams, replay and multiple independent consumers, Kafka wins. (Kafka <strong>share groups</strong> — KIP-932 &quot;Queues for Kafka&quot;, early access in 4.0 and maturing through the 4.x line — add queue-like consumption with per-record acks and more consumers than partitions; check your broker and managed-service version before relying on them.)</p>'
        },
        {
          q: 'Your consumer writes to Postgres and must not double-apply events, even across rebalances and replays. Walk me through the design.',
          a: '<ol><li>Producers attach a stable event ID (the outbox row ID), so every redelivery carries the same ID.</li><li>The consumer opens a transaction, inserts the ID into <code>processed_events</code> with <code>ON CONFLICT DO NOTHING</code>; zero rows inserted means a duplicate, so it skips.</li><li>The business change runs in the <em>same</em> transaction; commit, then commit the Kafka offset (or ack the SQS message). A crash between the two only causes a redelivery that is now a no-op.</li><li>Out-of-order events for one aggregate are guarded by a version column (<code>WHERE version &lt; $new</code>), so a replayed old event cannot revert newer state.</li><li>External side effects (emails, payments) carry an idempotency key derived from the event ID.</li><li>The dedup table is retained at least as long as the longest replay you might run, and pruned by a job.</li></ol><p>Kafka transactions alone would not help here because the effect lands outside Kafka.</p>'
        }
      ],
      quiz: [
        { q: 'In Kafka, what determines the maximum parallelism of a consumer group?', a: 'The number of partitions in the topic.' },
        { q: 'Where is ordering guaranteed in Kafka?', a: 'Within a single partition only.' },
        { q: 'What is a dead-letter queue?', a: 'A queue/topic where messages that repeatedly fail processing are moved for inspection and later redrive.' },
        { q: 'What does the SQS visibility timeout do?', a: 'Hides a received message from other consumers for a period; if not deleted in time it becomes visible again and is redelivered.' },
        { q: 'What is the maximum SQS per-message delay?', a: '15 minutes (900 seconds).' },
        { q: 'What problem does the transactional outbox solve?', a: 'The dual-write problem: atomically persisting state and the event that announces it.' },
        { q: 'What is log compaction in Kafka?', a: 'Retention that keeps at least the latest record for each key, suitable for changelog/state topics.' },
        { q: 'Commit offsets before or after processing for at-least-once?', a: 'After processing.' },
        { q: 'What makes an inbox/dedup table safe against duplicate deliveries?', a: 'The message ID is inserted in the same database transaction as the business change, so a duplicate fails the unique key and changes nothing; the offset is committed only after the commit.' }
      ],
      resources: [
        { title: 'Apache Kafka Documentation', url: 'https://kafka.apache.org/documentation/', type: 'docs' },
        { title: 'microservices.io — Transactional outbox', url: 'https://microservices.io/patterns/data/transactional-outbox.html', type: 'article' },
        { title: 'Martin Fowler — What do you mean by "Event-Driven"?', url: 'https://martinfowler.com/articles/201701-event-driven.html', type: 'article' },
        { title: 'Debezium Documentation', url: 'https://debezium.io/documentation/', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 7 ─────────────────────────────
    {
      n: 7,
      title: 'Microservices & API Design',
      summary: 'Designing service boundaries and the contracts between them: monolith vs microservices, decomposition, API gateways and service discovery, REST vs gRPC vs GraphQL, versioning and pagination, rate limiting algorithms, resilience patterns, and CQRS/event sourcing.',
      topics: [
        {
          title: 'Monolith vs Microservices & Service Decomposition',
          def: '<table><thead><tr><th>Aspect</th><th>(Modular) monolith</th><th>Microservices</th></tr></thead><tbody>' +
            '<tr><td>Deployment</td><td>One unit; simple pipeline</td><td>Independent deploys per service</td></tr>' +
            '<tr><td>Scaling</td><td>Whole app scales together</td><td>Scale hot services independently</td></tr>' +
            '<tr><td>Data</td><td>One DB, ACID transactions, joins</td><td>Database per service; eventual consistency, sagas</td></tr>' +
            '<tr><td>Failure modes</td><td>In-process calls, few partial failures</td><td>Network failures, latency, cascading failures</td></tr>' +
            '<tr><td>Team autonomy</td><td>Coordination on one codebase</td><td>Teams own services end to end (Conway&#39;s law)</td></tr>' +
            '<tr><td>Operational cost</td><td>Low</td><td>High: observability, CI/CD, platform, on-call</td></tr>' +
            '<tr><td>Best for</td><td>Small/medium teams, early products, unclear domains</td><td>Many teams, well-understood domains, divergent scaling needs</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Decomposition guidelines:</strong></p>' +
            '<ul><li>Split along <strong>business capabilities</strong> / DDD <strong>bounded contexts</strong> (Catalog, Ordering, Payments, Shipping) — not technical layers (&quot;DB service&quot;, &quot;validation service&quot;).</li>' +
            '<li>High cohesion inside, loose coupling between: a feature change should usually touch one service.</li>' +
            '<li><strong>Database per service</strong>; other services access data only via APIs or events. A shared database is a distributed monolith in disguise.</li>' +
            '<li>Avoid chatty synchronous chains (A → B → C → D): each hop multiplies latency and failure probability. Prefer async events or data replication for reads.</li>' +
            '<li>Migrate incrementally with the <strong>strangler fig</strong> pattern: route slices of traffic from the monolith to new services behind a facade/gateway.</li></ul>' +
            '<p>The pragmatic senior answer: start with a <strong>modular monolith</strong> with strict module boundaries; extract services when a module needs independent scaling, release cadence or team ownership.</p>',
          interview: 'Do not default to microservices. Interviewers reward "modular monolith first, extract when there is a reason" plus clear criteria for boundaries (bounded contexts, data ownership, team ownership). Mention the distributed-monolith anti-pattern.',
          examples: [{
            label: 'A modular monolith in Go that can be split later',
            lang: 'text',
            code: [
              'shop/                          one deployable, strict module boundaries',
              '  cmd/shop/main.go             composition root: wires modules together',
              '  internal/catalog/',
              '    api.go                     exported interface = the ONLY thing other modules may call',
              '    service.go store.go        private; owns tables catalog_*',
              '  internal/ordering/',
              '    api.go                     type Service interface { PlaceOrder(ctx, PlaceOrder) (OrderID, error) }',
              '    service.go                 depends on catalog.API (an interface), never on catalog tables',
              '  internal/payments/           PCI scope -> first extraction candidate',
              '  internal/platform/           shared kernel: config, logging, DB pool, outbox',
              '',
              'Rules (enforce in CI with an import linter such as depguard or go-arch-lint):',
              '  - a module imports other modules only through their api.go',
              '  - a module never reads another module\'s tables (schema per module)',
              '  - cross-module side effects go through in-process events + outbox',
              'Extracting payments later = swap the in-process payments.API for a gRPC client that',
              'satisfies the same interface, and move its schema to its own database.'
            ].join('\n')
          }]
        },
        {
          title: 'API Gateway & Service Discovery',
          def: '<p>An <strong>API gateway</strong> is the single entry point for external clients. Typical responsibilities:</p>' +
            '<ul><li>Routing and request aggregation (one client call → several backend calls).</li>' +
            '<li>Authentication (JWT/OIDC validation), coarse authorization, API keys.</li>' +
            '<li>Rate limiting and quotas, request size limits, WAF integration.</li>' +
            '<li>TLS termination, protocol translation (REST ↔ gRPC), response caching, compression.</li>' +
            '<li>Observability: access logs, metrics, trace IDs.</li></ul>' +
            '<p>Keep business logic out of the gateway. The <strong>Backend-for-Frontend (BFF)</strong> variant gives each client type (web, iOS, partner API) its own tailored gateway. Examples: Kong, Envoy Gateway, AWS API Gateway, Apigee, NGINX.</p>' +
            '<p><strong>Service discovery</strong> answers &quot;where are the healthy instances of service X right now?&quot; in a world of autoscaling and ephemeral IPs.</p>' +
            '<table><thead><tr><th>Model</th><th>How</th><th>Examples</th></tr></thead><tbody>' +
            '<tr><td>Server-side</td><td>Client calls a stable virtual address; LB/proxy picks an instance</td><td>Kubernetes Service (ClusterIP + kube-proxy), AWS ALB</td></tr>' +
            '<tr><td>Client-side</td><td>Client queries a registry and balances itself</td><td>gRPC xDS/DNS resolvers, Consul, Eureka</td></tr>' +
            '<tr><td>Service mesh</td><td>Sidecar or node proxy handles discovery, mTLS, retries</td><td>Istio, Linkerd, Consul Connect</td></tr>' +
            '</tbody></table>' +
            '<p>Registries rely on health checks and heartbeats/TTLs so dead instances are removed. In Kubernetes, discovery is mostly DNS (<code>orders.prod.svc.cluster.local</code>) and EndpointSlices updated from readiness probes.</p>' +
            '<p><strong>Kubernetes edge note:</strong> the <strong>Gateway API</strong> (<code>Gateway</code> + <code>HTTPRoute</code>/<code>GRPCRoute</code>) is the successor to <code>Ingress</code>, with role separation (platform team owns the Gateway, app teams own routes) and built-in weighted traffic splitting for canaries. The community ingress-nginx controller was retired in March 2026, so new designs should target a Gateway API implementation (Envoy Gateway, Istio, Cilium, cloud controllers).</p>',
          interview: 'Expect "what belongs in the gateway vs the service?" (cross-cutting concerns vs business logic) and "how does service A find B in Kubernetes?" (DNS → Service → EndpointSlices; readiness gates membership). Mention the gateway must itself be HA and not a bottleneck.',
          examples: [{
            label: 'Kubernetes Gateway API route with a weighted canary',
            lang: 'yaml',
            code: [
              'apiVersion: gateway.networking.k8s.io/v1',
              'kind: HTTPRoute',
              'metadata:',
              '  name: orders',
              '  namespace: shop',
              'spec:',
              '  parentRefs:',
              '  - name: public-gw              # Gateway owned by the platform team (listeners, TLS certs)',
              '    namespace: infra',
              '  hostnames: ["api.shop.example"]',
              '  rules:',
              '  - matches:',
              '    - path: {type: PathPrefix, value: /v1/orders}',
              '    backendRefs:                 # canary: 95/5 split between two Services',
              '    - {name: orders-v1, port: 8080, weight: 95}',
              '    - {name: orders-v2, port: 8080, weight: 5}',
              '    timeouts: {request: 2s}',
              '  - matches:',
              '    - path: {type: PathPrefix, value: /v1/catalog}',
              '    backendRefs:',
              '    - {name: catalog, port: 8080}',
              '# Discovery behind the route: Service orders-v1 -> EndpointSlices of Ready pods,',
              '# also resolvable in-cluster as orders-v1.shop.svc.cluster.local'
            ].join('\n')
          }]
        },
        {
          title: 'REST vs gRPC vs GraphQL, Versioning & Pagination',
          def: '<table><thead><tr><th></th><th>REST (JSON/HTTP)</th><th>gRPC (Protobuf/HTTP/2)</th><th>GraphQL</th></tr></thead><tbody>' +
            '<tr><td>Contract</td><td>OpenAPI (optional)</td><td>Strict .proto, code generation</td><td>Typed schema, introspection</td></tr>' +
            '<tr><td>Payload</td><td>Text JSON, verbose</td><td>Binary, compact, fast</td><td>JSON, exactly the requested fields</td></tr>' +
            '<tr><td>Streaming</td><td>SSE / WebSockets separately</td><td>Unary, server, client, bidirectional</td><td>Subscriptions</td></tr>' +
            '<tr><td>Caching</td><td>HTTP caching/CDN works naturally</td><td>Custom</td><td>Hard (POST, varied queries); persisted queries help</td></tr>' +
            '<tr><td>Browser support</td><td>Native</td><td>Needs gRPC-Web / Connect</td><td>Native</td></tr>' +
            '<tr><td>Best for</td><td>Public APIs, CRUD resources</td><td>Internal service-to-service, low latency, polyglot</td><td>Client-driven aggregation for many UIs</td></tr>' +
            '<tr><td>Pitfalls</td><td>Over/under-fetching</td><td>LB of long-lived connections, debugging binary</td><td>N+1 resolvers (use DataLoader), query cost limits, authz per field</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Versioning:</strong> prefer <em>additive, backward-compatible</em> evolution (new optional fields; never change meaning or remove). For breaking changes use a new major version: URI (<code>/v2/orders</code>, most common and explicit), header/media type, or new Protobuf package (<code>orders.v2</code>). In Protobuf never reuse field numbers — mark removed ones <code>reserved</code>. Announce deprecation with <code>Deprecation</code>/<code>Sunset</code> headers and track usage before removing.</p>' +
            '<p><strong>Pagination:</strong></p>' +
            '<ul><li><strong>Offset/limit</strong>: simple, supports jumping to page N; slow for deep pages and shows duplicates/skips when data changes.</li>' +
            '<li><strong>Cursor (keyset)</strong>: <code>?limit=50&amp;cursor=opaque</code> where the cursor encodes the last item&#39;s sort key + unique ID; stable and O(page) via the index. Default for feeds and large tables.</li>' +
            '<li>Always cap <code>limit</code>, use a deterministic order with a unique tie-breaker, and make cursors opaque (base64) so you can change internals.</li></ul>',
          interview: 'A typical answer: "REST for the public API (cacheable, universal), gRPC internally (typed contracts, streaming, deadlines), GraphQL only if many clients need different shapes". Show cursor pagination and additive versioning; mention idempotency keys for POST.',
          examples: [{
            label: 'Opaque cursor pagination contract',
            lang: 'text',
            code: [
              'GET /v1/users/42/orders?limit=20',
              '200 OK',
              '{',
              '  "data": [ { "id": "ord_981", "created_at": "2026-10-01T10:00:00Z" }, ... ],',
              '  "next_cursor": "eyJjIjoiMjAyNi0wOS0yOVQwODoxMjowMFoiLCJpZCI6Im9yZF85NjIifQ"',
              '}',
              '',
              'cursor = base64({"c":"2026-09-29T08:12:00Z","id":"ord_962"})',
              '',
              'SQL for next page (index on (user_id, created_at DESC, id DESC)):',
              '  SELECT ... FROM orders WHERE user_id = 42',
              '    AND (created_at, id) < ($c, $id)',
              '  ORDER BY created_at DESC, id DESC LIMIT 21;   -- 21st row => has_more'
            ].join('\n')
          }]
        },
        {
          title: 'Rate Limiting Algorithms',
          def: '<p>Rate limiting protects services from abuse and overload and enforces fair usage/quotas. Limits are keyed by user, API key, IP or tenant, and enforced at the gateway or in a shared store (Redis) for distributed services. Rejected requests return <strong>429 Too Many Requests</strong> with <code>Retry-After</code>.</p>' +
            '<table><thead><tr><th>Algorithm</th><th>How</th><th>Bursts</th><th>Memory</th><th>Notes</th></tr></thead><tbody>' +
            '<tr><td><strong>Token bucket</strong></td><td>Bucket of capacity B refilled at r tokens/s; each request takes a token</td><td>Allows bursts up to B</td><td>O(1): tokens + last refill</td><td>Most common (AWS, Stripe, Go <code>x/time/rate</code>)</td></tr>' +
            '<tr><td><strong>Leaky bucket</strong></td><td>Requests enter a FIFO queue drained at a constant rate</td><td>Smooths output; queue absorbs bursts</td><td>O(queue)</td><td>Good for shaping traffic to a fragile downstream</td></tr>' +
            '<tr><td><strong>Fixed window counter</strong></td><td>Counter per key per window (e.g. per minute)</td><td>Up to 2× limit at window edges</td><td>O(1)</td><td>Simplest; <code>INCR</code> + <code>EXPIRE</code> in Redis</td></tr>' +
            '<tr><td><strong>Sliding window log</strong></td><td>Store timestamps of requests; count those in last T</td><td>Exact</td><td>O(requests)</td><td>Redis sorted set; expensive at high limits</td></tr>' +
            '<tr><td><strong>Sliding window counter</strong></td><td>Weighted blend of previous and current window counts</td><td>Approximate, smooth</td><td>O(1)</td><td>Great accuracy/cost balance (Cloudflare)</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Distributed concerns:</strong> make check-and-increment atomic (Redis Lua script or <code>INCR</code>), avoid a Redis round trip on every request for very high QPS (local token buckets with periodic sync, or approximate per-node limits = global / N), decide <strong>fail-open vs fail-closed</strong> when the limiter store is down (usually fail-open with local fallback), and expose quota headers. Many APIs send <code>X-RateLimit-Limit</code>/<code>-Remaining</code>/<code>-Reset</code> (or the early-draft <code>RateLimit-Limit</code> trio); the current IETF HTTPAPI draft consolidates them into two structured fields, <code>RateLimit-Policy</code> (the quota) and <code>RateLimit</code> (remaining units and reset), always alongside <code>Retry-After</code> on a 429.</p>',
          interview: 'Be ready to compare the five algorithms, explain the fixed-window boundary burst, and code token bucket or sliding window. For the distributed version discuss atomicity (Lua), latency of a central store, fail-open policy and multi-region limits.',
          examples: [{
            label: 'Sliding window counter limiter (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "fmt"',
              '    "sync"',
              '    "time"',
              ')',
              '',
              'type window struct {',
              '    start      time.Time',
              '    prev, curr int',
              '}',
              '',
              'type SlidingWindow struct {',
              '    mu    sync.Mutex',
              '    limit int',
              '    size  time.Duration',
              '    byKey map[string]*window',
              '    nowFn func() time.Time',
              '}',
              '',
              'func NewSlidingWindow(limit int, size time.Duration) *SlidingWindow {',
              '    return &SlidingWindow{limit: limit, size: size, byKey: map[string]*window{}, nowFn: time.Now}',
              '}',
              '',
              'func (s *SlidingWindow) Allow(key string) bool {',
              '    s.mu.Lock()',
              '    defer s.mu.Unlock()',
              '    now := s.nowFn()',
              '    w, ok := s.byKey[key]',
              '    if !ok {',
              '        w = &window{start: now.Truncate(s.size)}',
              '        s.byKey[key] = w',
              '    }',
              '    // Roll windows forward.',
              '    if elapsed := now.Sub(w.start); elapsed >= s.size {',
              '        if elapsed >= 2*s.size {',
              '            w.prev = 0',
              '        } else {',
              '            w.prev = w.curr',
              '        }',
              '        w.curr = 0',
              '        w.start = now.Truncate(s.size)',
              '    }',
              '    // Weight the previous window by how much of it still overlaps.',
              '    frac := float64(now.Sub(w.start)) / float64(s.size)',
              '    estimate := float64(w.prev)*(1-frac) + float64(w.curr)',
              '    if estimate >= float64(s.limit) {',
              '        return false',
              '    }',
              '    w.curr++',
              '    return true',
              '}',
              '',
              'func main() {',
              '    l := NewSlidingWindow(5, time.Second)',
              '    for i := 0; i < 7; i++ {',
              '        fmt.Println(i, l.Allow("user-1"))',
              '    }',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Resilience Patterns: Timeouts, Retries, Circuit Breakers, Bulkheads',
          def: '<p>In a distributed system, partial failure is normal. These patterns stop one slow or failing dependency from taking everything down (cascading failure).</p>' +
            '<table><thead><tr><th>Pattern</th><th>Purpose</th><th>Key details</th></tr></thead><tbody>' +
            '<tr><td><strong>Timeouts</strong></td><td>Bound how long a caller waits</td><td>Every network call needs one; propagate <strong>deadlines</strong> (Go <code>context</code>, gRPC deadlines) so downstream work stops when the caller has given up; set from the dependency&#39;s p99.9, not a guess</td></tr>' +
            '<tr><td><strong>Retries</strong></td><td>Ride out transient failures</td><td>Only idempotent operations; <strong>exponential backoff + full jitter</strong>; cap attempts; <strong>retry budgets</strong> (e.g. ≤ 10% extra load); retry at one layer only to avoid multiplicative storms: amplification = (attempts per layer)<sup>layers</sup>, so 3 layers that each <em>retry</em> 3 times (1 + 3 = 4 attempts) send 4<sup>3</sup> = <strong>64×</strong> the load to the bottom service (27× only if &quot;3&quot; means 3 total attempts)</td></tr>' +
            '<tr><td><strong>Circuit breaker</strong></td><td>Fail fast when a dependency is unhealthy</td><td>Closed → (error rate over threshold) → Open (reject immediately) → after cool-down Half-open (allow trial requests) → Closed on success</td></tr>' +
            '<tr><td><strong>Bulkhead</strong></td><td>Isolate resources so one dependency cannot exhaust all</td><td>Separate connection pools/semaphores/goroutine limits per dependency or tenant; cells at the architecture level</td></tr>' +
            '<tr><td><strong>Fallback / degradation</strong></td><td>Keep core function working</td><td>Cached or default response, hide non-critical widgets, queue for later</td></tr>' +
            '<tr><td><strong>Load shedding</strong></td><td>Protect yourself under overload</td><td>Reject early (cheap) by priority; adaptive concurrency limits</td></tr>' +
            '<tr><td><strong>Hedged requests</strong></td><td>Cut tail latency</td><td>Send a second request after p95 delay; cancel the loser; only for idempotent reads</td></tr>' +
            '</tbody></table>' +
            '<p>Libraries: Go has <code>sony/gobreaker</code>, <code>failsafe-go</code>, and <code>x/time/rate</code>; service meshes (Envoy/Istio) provide outlier detection, retries and timeouts as configuration. Test these behaviours with fault injection and chaos experiments.</p>',
          interview: 'A favourite question: "service B is slow, and now service A is down too — why and how do you fix it?" Answer: no/too-long timeouts exhausted A\'s goroutines/connections; add deadlines, circuit breaker, bulkhead pools, retry budgets with jittered backoff, and graceful degradation.',
          examples: [{
            label: 'Retry with exponential backoff, full jitter and context',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "context"',
              '    "errors"',
              '    "fmt"',
              '    "math/rand/v2"',
              '    "time"',
              ')',
              '',
              'var ErrPermanent = errors.New("permanent")',
              '',
              '// Retry calls op at most maxAttempts times in total: 1 initial call + (maxAttempts-1) retries.',
              '// Stacked layers multiply: 3 layers with maxAttempts=4 (3 retries) => 4*4*4 = 64x load at the bottom.',
              'func Retry(ctx context.Context, maxAttempts int, base, maxDelay time.Duration, op func(context.Context) error) error {',
              '    var err error',
              '    for i := 0; i < maxAttempts; i++ {',
              '        if err = op(ctx); err == nil || errors.Is(err, ErrPermanent) {',
              '            return err',
              '        }',
              '        if i == maxAttempts-1 {',
              '            break // no sleep after the final attempt',
              '        }',
              '        backoff := min(maxDelay, base<<i)                   // exponential, capped',
              '        sleep := time.Duration(rand.Int64N(int64(backoff))) // full jitter',
              '        select {',
              '        case <-time.After(sleep):',
              '        case <-ctx.Done():',
              '            return errors.Join(err, ctx.Err())',
              '        }',
              '    }',
              '    return err',
              '}',
              '',
              'func main() {',
              '    ctx, cancel := context.WithTimeout(context.Background(), time.Second)',
              '    defer cancel()',
              '    calls := 0',
              '    // 5 attempts = 1 call + up to 4 retries',
              '    err := Retry(ctx, 5, 50*time.Millisecond, 400*time.Millisecond, func(context.Context) error {',
              '        calls++',
              '        if calls < 3 {',
              '            return errors.New("503 unavailable")',
              '        }',
              '        return nil',
              '    })',
              '    fmt.Println(calls, err) // 3 <nil>',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Saga, CQRS & Event Sourcing',
          def: '<p><strong>Saga</strong> (see Module 5): a business transaction across services as a sequence of local transactions with compensations. <em>Orchestration</em> (central coordinator such as Temporal) is easier to reason about and monitor for complex flows; <em>choreography</em> (services react to events) suits simple flows with few steps.</p>' +
            '<p><strong>CQRS</strong> (Command Query Responsibility Segregation) separates the write model (commands that enforce invariants, normalised) from one or more read models (denormalised projections optimised per query: search index, materialised views, caches). Read models are updated asynchronously from events/CDC, so they are <em>eventually consistent</em>.</p>' +
            '<ul><li><strong>Use when</strong>: read and write workloads differ hugely, many query shapes, or complex domain logic on writes.</li>' +
            '<li><strong>Cost</strong>: two models, sync pipeline, staleness the UI must handle (e.g. read-your-writes by returning the updated entity from the command).</li></ul>' +
            '<p><strong>Event sourcing</strong> stores the sequence of domain events (<code>Deposited 100</code>, <code>Withdrew 30</code>) as the source of truth; current state = fold over events. Commands load the aggregate by replaying its events (or snapshot + tail), validate, and append new events with an <strong>optimistic concurrency</strong> check on the expected version.</p>' +
            '<table><thead><tr><th>Benefits</th><th>Costs</th></tr></thead><tbody>' +
            '<tr><td>Complete audit trail; temporal queries (&quot;state at 3 pm?&quot;)</td><td>Event schema evolution (upcasters) forever</td></tr>' +
            '<tr><td>Rebuild/replay new projections from history</td><td>Snapshots needed for long streams</td></tr>' +
            '<tr><td>Natural fit with CQRS and event-driven integration</td><td>GDPR erasure (crypto-shredding), steep learning curve</td></tr>' +
            '</tbody></table>' +
            '<p>Event sourcing almost always implies CQRS (you cannot query an event log efficiently), but CQRS does not require event sourcing. Ledgers, order lifecycles and collaborative editing are good fits; simple CRUD is not.</p>',
          interview: 'Interviewers test whether you know when NOT to use these. Describe CQRS as separate read projections fed by events, with staleness handled in the UX, and event sourcing as append-only events with optimistic concurrency and snapshots. Mention ledgers as the canonical fit.',
          examples: [{
            label: 'CQRS with event-sourced write side',
            lang: 'text',
            code: [
              '  Command API                         Query API',
              '      |                                    ^',
              '      v                                    |',
              ' [Order aggregate] --append--> [Event store]   [Read DB / ES index]',
              '   (validate,        (orders-42: v1..v7,        ^ (denormalised views:',
              '    expected v7)      optimistic concurrency)    |   order history, search)',
              '                           |                     |',
              '                           +---> Kafka --> [Projector] (idempotent, replayable)',
              '',
              'Rebuild a projection: reset projector offset to 0 and replay all events.'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'Identify service boundaries for an e-commerce monolith',
          d: 'easy',
          type: 'design',
          hint: '<ul><li>Map bounded contexts: Identity, Catalog, Search, Cart, Ordering, Payments, Inventory, Shipping, Notifications.</li><li>Each owns its data; &quot;Product&quot; means different things in Catalog (description) vs Inventory (stock) vs Ordering (price snapshot).</li><li>Extract first: modules with distinct scaling (Search), different change cadence, or risk isolation (Payments, PCI scope).</li><li>Keep together things that change together and need transactions.</li></ul>'
        },
        {
          t: 'Choose REST, gRPC or GraphQL for four APIs',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li><strong>Public partner API:</strong> REST + OpenAPI (ubiquitous, cacheable, easy to consume).</li><li><strong>Internal high-QPS service mesh:</strong> gRPC (Protobuf, deadlines, streaming).</li><li><strong>Mobile + web apps needing different shapes of the same data:</strong> GraphQL or BFFs.</li><li><strong>Live price ticker to browsers:</strong> WebSockets/SSE (or gRPC-Web server streaming).</li></ul>'
        },
        {
          t: 'Retry helper with exponential backoff and jitter',
          d: 'easy',
          type: 'coding',
          hint: '<ul><li>Delay = random(0, min(cap, base × 2<sup>attempt</sup>)) — &quot;full jitter&quot; (AWS Architecture Blog) avoids synchronised retry waves.</li><li>Name the limit precisely: <code>maxAttempts</code> counts the first call; <code>maxAttempts = 4</code> means 3 retries.</li><li>Stop on success, on non-retryable errors, or when the context is done.</li><li>Only wrap idempotent operations; see the example in the Resilience Patterns topic.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "context"',
            '    "errors"',
            '    "fmt"',
            '    "math/rand/v2"',
            '    "time"',
            ')',
            '',
            'type Retryable interface{ Temporary() bool }',
            '',
            'func isRetryable(err error) bool {',
            '    var r Retryable',
            '    return errors.As(err, &r) && r.Temporary()',
            '}',
            '',
            '// Do makes at most maxAttempts calls in total (the first call counts), i.e. maxAttempts-1 retries.',
            'func Do(ctx context.Context, maxAttempts int, op func() error) error {',
            '    const base, ceiling = 100 * time.Millisecond, 5 * time.Second',
            '    for attempt := 0; ; attempt++ {',
            '        err := op()',
            '        if err == nil || !isRetryable(err) || attempt+1 >= maxAttempts {',
            '            return err',
            '        }',
            '        d := time.Duration(rand.Int64N(int64(min(ceiling, base<<attempt))))',
            '        t := time.NewTimer(d)',
            '        select {',
            '        case <-t.C:',
            '        case <-ctx.Done():',
            '            t.Stop()',
            '            return ctx.Err()',
            '        }',
            '    }',
            '}',
            '',
            'type tempErr struct{}',
            '',
            'func (tempErr) Error() string   { return "temporary" }',
            'func (tempErr) Temporary() bool { return true }',
            '',
            'func main() {',
            '    n := 0',
            '    err := Do(context.Background(), 4, func() error { // 4 attempts = 3 retries',
            '        n++',
            '        if n < 3 {',
            '            return tempErr{}',
            '        }',
            '        return nil',
            '    })',
            '    fmt.Println(n, err)',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Design cursor-based pagination for a feed API',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Sort key must be unique and stable: <code>(created_at DESC, id DESC)</code>.</li><li>Cursor = opaque base64 of the last item&#39;s <code>(created_at, id)</code>, optionally signed/encrypted to prevent tampering.</li><li>Fetch <code>limit + 1</code> rows to compute <code>has_more</code>.</li><li>Composite index matches the order; row-value comparison <code>(created_at, id) &lt; (?, ?)</code>.</li><li>Trade-offs vs offset: no random page access, but stable under inserts and O(limit).</li></ul>'
        },
        {
          t: 'Implement a circuit breaker in Go',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li>States: Closed, Open, HalfOpen.</li><li>Closed: count consecutive failures; at threshold → Open with timestamp.</li><li>Open: reject with <code>ErrOpen</code> until cool-down elapses → HalfOpen.</li><li>HalfOpen: allow a single probe; success → Closed (reset), failure → Open again.</li><li>Guard state with a mutex; do not hold the lock while calling the dependency.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "errors"',
            '    "fmt"',
            '    "sync"',
            '    "time"',
            ')',
            '',
            'type State int',
            '',
            'const (',
            '    Closed State = iota',
            '    Open',
            '    HalfOpen',
            ')',
            '',
            'var ErrOpen = errors.New("circuit open")',
            '',
            'type Breaker struct {',
            '    mu          sync.Mutex',
            '    state       State',
            '    failures    int',
            '    threshold   int',
            '    coolDown    time.Duration',
            '    openedAt    time.Time',
            '    probeActive bool',
            '}',
            '',
            'func New(threshold int, coolDown time.Duration) *Breaker {',
            '    return &Breaker{threshold: threshold, coolDown: coolDown}',
            '}',
            '',
            'func (b *Breaker) allow() error {',
            '    b.mu.Lock()',
            '    defer b.mu.Unlock()',
            '    switch b.state {',
            '    case Open:',
            '        if time.Since(b.openedAt) < b.coolDown {',
            '            return ErrOpen',
            '        }',
            '        b.state = HalfOpen',
            '        fallthrough',
            '    case HalfOpen:',
            '        if b.probeActive {',
            '            return ErrOpen // only one trial request at a time',
            '        }',
            '        b.probeActive = true',
            '    }',
            '    return nil',
            '}',
            '',
            'func (b *Breaker) record(err error) {',
            '    b.mu.Lock()',
            '    defer b.mu.Unlock()',
            '    wasProbe := b.state == HalfOpen',
            '    b.probeActive = false',
            '    if err == nil {',
            '        b.state, b.failures = Closed, 0',
            '        return',
            '    }',
            '    b.failures++',
            '    if wasProbe || b.failures >= b.threshold {',
            '        b.state, b.openedAt = Open, time.Now()',
            '    }',
            '}',
            '',
            'func (b *Breaker) Call(fn func() error) error {',
            '    if err := b.allow(); err != nil {',
            '        return err',
            '    }',
            '    err := fn() // lock NOT held during the call',
            '    b.record(err)',
            '    return err',
            '}',
            '',
            'func main() {',
            '    b := New(3, 100*time.Millisecond)',
            '    fail := func() error { return errors.New("boom") }',
            '    for i := 0; i < 5; i++ {',
            '        fmt.Println(b.Call(fail)) // boom x3, then circuit open',
            '    }',
            '    time.Sleep(120 * time.Millisecond)',
            '    fmt.Println(b.Call(func() error { return nil })) // probe succeeds -> closed',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Ship a breaking API change safely',
          d: 'medium',
          type: 'design',
          hint: '<ol><li>Try to avoid it: add a new field/endpoint instead of changing semantics.</li><li>If unavoidable: introduce <code>/v2</code> (or <code>orders.v2</code> proto package) alongside v1; share the domain layer, adapt at the edge.</li><li>Instrument v1 usage per client; publish deprecation timeline; send <code>Deprecation</code>/<code>Sunset</code> headers.</li><li>Contract tests (Pact) and consumer-driven checks in CI; for Protobuf run <code>buf breaking</code>.</li><li>Remove v1 only when traffic is ~0; keep reserved field numbers forever.</li></ol>'
        },
        {
          t: 'Design a Backend-for-Frontend layer',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>One BFF per client type (web, mobile), owned by the client team.</li><li>Aggregates calls in parallel with per-call timeouts; partial responses when non-critical calls fail.</li><li>Translates internal gRPC to client-friendly JSON; shapes payloads for slow mobile networks.</li><li>Shared concerns (auth, rate limits) stay in the edge gateway in front.</li><li>Risk: duplicated logic across BFFs — keep domain logic in services.</li></ul>'
        },
        {
          t: 'Prevent retry storms in a deep call chain',
          d: 'hard',
          type: 'design',
          hint: '<ul><li>Problem: in A → B → C → D, three callers (A, B, C) each <em>retry</em> 3 times, i.e. make up to 4 attempts. Attempts multiply per layer: 4 × 4 × 4 = <strong>64×</strong> the original load on D during an incident (27× if the policy is 3 <em>total</em> attempts). Always say which you mean: &quot;max attempts&quot; includes the first call, &quot;retries&quot; does not.</li><li>Retry at <strong>one</strong> layer (usually closest to the failure or at the edge), not all.</li><li><strong>Retry budgets</strong>: per-client token bucket allowing retries ≤ 10–20% of requests.</li><li><strong>Deadline propagation</strong>: downstream stops when the caller&#39;s deadline passes; do not retry if remaining budget is too small.</li><li>Circuit breakers + server-side load shedding with <code>Retry-After</code>; mark overload errors as non-retryable.</li><li>Jittered exponential backoff on clients.</li></ul>'
        },
        {
          t: 'Migrate a monolith with the strangler fig pattern',
          d: 'hard',
          type: 'design',
          hint: '<ol><li>Put a routing facade (gateway) in front of the monolith.</li><li>Pick a seam with clear boundaries and high value (e.g. Notifications or Search).</li><li>Build the new service; sync data via CDC from the monolith DB (anti-corruption layer translates models).</li><li>Shadow traffic and compare responses; then route a percentage via the gateway (canary).</li><li>Move data ownership: new service becomes the writer; monolith reads via API or replicated view.</li><li>Delete dead code; repeat. Track that each step is reversible.</li></ol>'
        },
        {
          t: 'Event-sourced bank account with CQRS read model',
          d: 'hard',
          type: 'design',
          hint: '<ul><li>Events: <code>AccountOpened</code>, <code>MoneyDeposited</code>, <code>MoneyWithdrawn</code>, <code>TransferInitiated</code>...</li><li>Write: load events for <code>account-123</code> (snapshot every N events), validate balance invariant, append with expected version (optimistic concurrency; conflict → reload and retry).</li><li>Event store: Postgres table with unique <code>(stream_id, version)</code>, or EventStoreDB / Kafka + compacted snapshots.</li><li>Read models: balance view, statement history, fraud features — projected asynchronously, idempotent by event version.</li><li>Transfers between accounts: saga or process manager; GDPR: crypto-shredding of personal data.</li></ul>'
        }
      ],
      interviewFocus: [
        {
          q: 'When would you choose a modular monolith over microservices?',
          a: '<p>When the team is small (one or two pizza teams), the domain boundaries are still being discovered, or the system lacks the platform maturity (CI/CD, observability, on-call) to operate dozens of services. A modular monolith gives in-process calls, ACID transactions and simple deploys, while strict module boundaries (separate packages, no cross-module table access, internal APIs) keep the option to extract later.</p><p>I would extract a service when a module has a distinct scaling profile, needs independent release cadence, belongs to a separate team, or needs isolation for security/compliance (e.g. payments under PCI).</p>'
        },
        {
          q: 'Explain how a circuit breaker works and how you would tune it.',
          a: '<p>States: <strong>Closed</strong> (calls pass; failures counted over a rolling window), <strong>Open</strong> (calls fail immediately for a cool-down period, protecting both caller resources and the struggling dependency), <strong>Half-open</strong> (a few trial calls; success closes, failure re-opens).</p><p>Tuning: trip on <em>error rate</em> over a minimum request volume (e.g. ≥ 50% of ≥ 20 requests in 10 s) rather than raw counts; count timeouts as failures; cool-down a few seconds with jitter; limit half-open probes. Pair with a fallback, emit metrics/alerts on state changes, and scope breakers per dependency (and possibly per endpoint/host) so one bad host does not open the circuit for all.</p>'
        },
        {
          q: 'Compare token bucket and sliding window rate limiting; which would you use for a public API?',
          a: '<p><strong>Token bucket</strong> allows bursts up to bucket size while enforcing an average rate; state is two numbers per key; easy to implement atomically in Redis with Lua. <strong>Sliding window counter</strong> enforces a smooth limit per window with O(1) state and avoids fixed-window edge bursts, with a small approximation error.</p><p>For a public API I would use token bucket per API key (bursty clients are normal, and it maps to &quot;N requests/s with burst B&quot; in docs), enforced at the gateway with Redis, plus coarse per-IP fixed-window limits for abuse, fail-open with local limits if Redis is unavailable, and standard 429 + <code>Retry-After</code> headers.</p>'
        },
        {
          q: 'How does CQRS change consistency guarantees, and how do you handle that in the UI?',
          a: '<p>Writes go to the command model; read models update asynchronously, so a user may not immediately see their own change (read-your-writes violation). Mitigations:</p><ul><li>Return the updated state (or version) in the command response and render it optimistically.</li><li>Pass the write&#39;s version to the query; the read side waits briefly until its projection reaches that version, or falls back to the write model.</li><li>Show pending/processing states and push updates via WebSocket/SSE when projections complete.</li><li>Monitor projection lag as an SLI.</li></ul>'
        },
        {
          q: 'A downstream dependency became slow and your whole service went down. Walk through what happened and the fixes.',
          a: '<p>Root cause chain: calls to the slow dependency had no (or long) timeouts → goroutines and connections piled up waiting → connection pools and memory were exhausted → healthy endpoints that did not even use that dependency also failed → upstream retries multiplied the load.</p><p>Fixes:</p><ul><li>Deadlines on every call, propagated via <code>context</code>.</li><li><strong>Bulkheads</strong>: dedicated pools/semaphores per dependency so it can only consume its share.</li><li><strong>Circuit breaker</strong> to fail fast and allow recovery.</li><li><strong>Fallbacks</strong>: cached/default data, feature degradation.</li><li><strong>Retry budgets</strong> with jittered backoff; load shedding at the edge.</li><li>Verify with fault-injection tests (latency injection) in staging and game days.</li></ul>'
        }
      ],
      quiz: [
        { q: 'What is the strangler fig pattern?', a: 'Incrementally replacing parts of a legacy system by routing functionality to new services behind a facade until the old system can be removed.' },
        { q: 'Why is a shared database between microservices an anti-pattern?', a: 'It couples services through schema and data, preventing independent deployment and ownership (a distributed monolith).' },
        { q: 'What problem does the fixed window rate limiter have?', a: 'Up to twice the limit can pass around a window boundary.' },
        { q: 'What are the three circuit breaker states?', a: 'Closed, Open, Half-open.' },
        { q: 'What is a bulkhead?', a: 'Isolating resources (pools, threads, semaphores) per dependency or tenant so one failure cannot exhaust everything.' },
        { q: 'Why add jitter to retry backoff?', a: 'To desynchronise clients so retries do not arrive in synchronized waves.' },
        { q: 'Does CQRS require event sourcing?', a: 'No. Event sourcing usually implies CQRS, but CQRS can use any mechanism to update read models.' },
        { q: 'In Protobuf, what must you do when removing a field?', a: 'Mark its field number (and name) as reserved so it is never reused.' },
        { q: 'Three layers each retry a failed call 3 times. What is the worst-case load on the bottom service?', a: '64x: each layer makes up to 4 attempts (1 + 3 retries) and attempts multiply per layer, 4 x 4 x 4. It is 27x only if "3" means 3 total attempts.' }
      ],
      resources: [
        { title: 'Martin Fowler — Microservices', url: 'https://martinfowler.com/articles/microservices.html', type: 'article' },
        { title: 'Martin Fowler — CQRS', url: 'https://martinfowler.com/bliki/CQRS.html', type: 'article' },
        { title: 'AWS Builders Library — Timeouts, retries and backoff with jitter', url: 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/', type: 'article' },
        { title: 'Google Cloud — API Design Guide', url: 'https://cloud.google.com/apis/design', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 8 ─────────────────────────────
    {
      n: 8,
      title: 'Reliability, Observability & Security in Design',
      summary: 'Designing for failure and for operability: redundancy and failover, multi-AZ and multi-region topologies, disaster recovery (RTO/RPO), SLOs with burn-rate alerting, logs/metrics/traces, chaos engineering, and security built into the architecture (edge authN/authZ, zero trust, encryption and privacy).',
      topics: [
        {
          title: 'Redundancy, Failover & Multi-AZ / Multi-Region',
          def: '<p><strong>Redundancy</strong> removes single points of failure (SPOFs): every tier — LB, app, cache, DB, queue, DNS, even the deploy pipeline and secrets store — needs at least N+1 capacity in independent failure domains. <strong>Failover</strong> moves traffic or leadership to a healthy replica; it must be automatic (humans are too slow for four nines) and regularly exercised.</p>' +
            '<p><strong>Failure domains:</strong> host → rack → availability zone (separate power/network, ~1–2 ms apart) → region (hundreds of km, tens–hundreds of ms apart). Multi-AZ is the baseline for production; multi-region protects against regional outages and serves global latency, at much higher cost and complexity.</p>' +
            '<table><thead><tr><th></th><th>Active-passive</th><th>Active-active</th></tr></thead><tbody>' +
            '<tr><td>Traffic</td><td>One region serves; standby receives replicated data</td><td>All regions serve traffic</td></tr>' +
            '<tr><td>Writes</td><td>Single writer; async replication to standby</td><td>Writes in multiple regions → conflicts, or partition users by home region</td></tr>' +
            '<tr><td>Failover</td><td>Promote standby + switch DNS/routing (minutes); risk of losing async-replicated writes</td><td>Shift traffic away from failed region (seconds–minutes)</td></tr>' +
            '<tr><td>Capacity</td><td>Standby can be smaller (warm) but must scale fast</td><td>Each region must absorb the failed region&#39;s load (N+1)</td></tr>' +
            '<tr><td>Confidence</td><td>Standby path rarely exercised → failover may fail</td><td>All paths exercised daily</td></tr>' +
            '<tr><td>Cost/complexity</td><td>Lower</td><td>Higher: data replication, conflict resolution, global routing</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Hard parts:</strong> data (replication lag, split brain — fence the old primary), dependencies that are secretly single-region (auth, config, CI), stateful connections, and <em>static stability</em>: the surviving side should not need to call a control plane (e.g. to launch instances) during the failure — pre-provision capacity.</p>',
          interview: 'Go failure domain by failure domain: what happens if a pod, a node, an AZ, a region dies? Interviewers like hearing "static stability" (pre-provisioned capacity, no control-plane dependency during failover), N+1 regional capacity, and fencing to avoid split brain.',
          examples: [{
            label: 'Static stability: capacity math for losing a failure domain',
            lang: 'text',
            code: [
              'Goal: survive the loss of one failure domain WITHOUT launching anything new.',
              '',
              'Peak 60K RPS, one pod = 2K RPS at target latency -> 30 pods of real work',
              '  2 AZs, lose 1: survivor carries 100%  -> 30 per AZ = 60 pods   (+100% overhead)',
              '  3 AZs, lose 1: two carry 100%         -> 15 per AZ = 45 pods   (+50% overhead)',
              '  General: N domains, tolerate 1 -> provision N / (N - 1) x peak',
              '',
              'Active-active regions: 3 regions, tolerate 1 -> each region runs at <= 66% of capacity at peak',
              'Database: primary + synchronous standby in another AZ (RPO 0), async replica in the DR region (RPO = lag)',
              '',
              'Hidden single points of failure to check:',
              '  one NAT gateway, a cache cluster in one AZ, the IdP or secrets store in one region,',
              '  the CI/CD system, the DNS provider, a single Kafka controller quorum, one engineer\'s laptop'
            ].join('\n')
          }]
        },
        {
          title: 'Disaster Recovery: RTO, RPO & Strategies',
          def: '<ul><li><strong>RTO</strong> (Recovery Time Objective): maximum acceptable time to restore service after a disaster.</li>' +
            '<li><strong>RPO</strong> (Recovery Point Objective): maximum acceptable data loss, measured in time (&quot;we can lose at most 5 minutes of writes&quot;).</li></ul>' +
            '<table><thead><tr><th>Strategy</th><th>Setup</th><th>RPO</th><th>RTO</th><th>Cost</th></tr></thead><tbody>' +
            '<tr><td><strong>Backup &amp; restore</strong></td><td>Periodic backups/snapshots copied to another region</td><td>Hours (backup interval); minutes with PITR log shipping</td><td>Hours</td><td>$</td></tr>' +
            '<tr><td><strong>Pilot light</strong></td><td>Data continuously replicated; minimal core infra off or scaled to zero</td><td>Seconds–minutes</td><td>Tens of minutes</td><td>$$</td></tr>' +
            '<tr><td><strong>Warm standby</strong></td><td>Scaled-down full copy running in DR region</td><td>Seconds–minutes</td><td>Minutes</td><td>$$$</td></tr>' +
            '<tr><td><strong>Multi-site active-active</strong></td><td>Full production in 2+ regions</td><td>Near zero (sync) to seconds (async)</td><td>Near zero</td><td>$$$$</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Key practices:</strong></p>' +
            '<ul><li>Backups are worthless until <strong>restores are tested</strong> regularly (and timed against RTO).</li>' +
            '<li>Protect against logical disasters (bad migration, ransomware, accidental <code>DELETE</code>) — replication faithfully copies those. Use point-in-time recovery, immutable/WORM backups, and separate accounts.</li>' +
            '<li>Infrastructure as code so the DR environment can be rebuilt deterministically.</li>' +
            '<li>Runbooks and regular DR drills (game days); measure actual RTO/RPO.</li>' +
            '<li>Tier systems: not everything needs the same RTO/RPO; set them per business impact.</li></ul>' +
            '<p>RPO near zero across regions requires synchronous replication (adds cross-region RTT to each write) or a consensus-based multi-region database.</p>',
          interview: 'Always ask for RTO/RPO per system and map them to a strategy and cost. Mention that replication is not backup (it replicates mistakes), and that untested restores are the classic DR failure.',
          examples: [{
            label: 'Does backup and restore meet RTO? Do the arithmetic',
            lang: 'text',
            code: [
              'Target: RTO 2 h for a 6 TB database',
              '  restore from object storage at ~400 MB/s: 6e12 / 4e8 = 15,000 s ~= 4.2 h',
              '  + WAL replay to the chosen point in time (PITR):        30-60 min',
              '  + app cutover, DNS, validation:                          ~30 min',
              '  => ~5.5 h > 2 h  -> backup and restore cannot meet it: use a warm standby / cross-region replica',
              '',
              'RPO check',
              '  async cross-region replica, p99 lag 2 s -> lose ~the last 2 s of writes on regional failover',
              '  nightly snapshot only                    -> lose up to 24 h',
              '  snapshot + continuous WAL archiving      -> lose ~minutes',
              '',
              'Tiering worksheet',
              '  Tier 0  payments ledger : RPO 0 in-region / seconds cross-region, RTO < 5 min -> hot standby or active-active',
              '  Tier 1  catalog, search : RPO 15 min (rebuildable),  RTO 30 min            -> pilot light / warm standby',
              '  Tier 2  analytics       : RPO 24 h,                  RTO 24 h              -> backup and restore'
            ].join('\n')
          }]
        },
        {
          title: 'SLOs, Error Budgets & Alerting',
          def: '<p>Building on Module 1: pick a few <strong>user-centric SLIs</strong> per user journey (availability, latency, freshness, correctness), set SLOs a bit stricter than what users notice, and manage reliability with the <strong>error budget</strong>.</p>' +
            '<p><strong>Alert on symptoms, not causes.</strong> Page when users are (or soon will be) impacted — SLO burn — rather than on CPU at 80% or a single pod restart. Cause-based signals go to dashboards and tickets.</p>' +
            '<p><strong>Burn rate</strong> = how fast you consume the error budget relative to plan (1.0 = exactly exhaust the budget at the end of the window). For a 99.9% / 30-day SLO, the Google SRE Workbook recommends multi-window, multi-burn-rate alerts:</p>' +
            '<table><thead><tr><th>Severity</th><th>Burn rate</th><th>Long window</th><th>Short window</th><th>Budget consumed</th></tr></thead><tbody>' +
            '<tr><td>Page</td><td>14.4</td><td>1 h</td><td>5 min</td><td>2% in 1 h</td></tr>' +
            '<tr><td>Page</td><td>6</td><td>6 h</td><td>30 min</td><td>5% in 6 h</td></tr>' +
            '<tr><td>Ticket</td><td>1</td><td>3 days</td><td>6 h</td><td>10% in 3 days</td></tr>' +
            '</tbody></table>' +
            '<p>The short window makes alerts reset quickly once the problem is fixed. This gives high precision (few false pages) and good recall.</p>' +
            '<p><strong>Error budget policy</strong> (agreed with product): when the budget is exhausted, freeze risky launches and prioritise reliability work; when plenty remains, take more risk (faster rollouts, experiments). Also track dependency SLOs — you cannot be more available than your critical dependencies without redundancy or degradation.</p>',
          interview: 'Know how to compute downtime from an SLO and how burn-rate alerts work (14.4x for 1 h = 2% of a 30-day budget). Saying "we page on SLO burn, not on CPU" is a strong senior signal.',
          examples: [{
            label: 'Burn-rate alert (PromQL, 99.9% SLO)',
            lang: 'text',
            code: [
              '# error ratio over a window',
              '#   sum(rate(http_requests_total{job="checkout",code=~"5.."}[1h]))',
              '# / sum(rate(http_requests_total{job="checkout"}[1h]))',
              '',
              '# Page: burn rate 14.4 over 1h AND over 5m (fast burn)',
              '(',
              '  job:slo_errors_per_request:ratio_rate1h{job="checkout"} > (14.4 * 0.001)',
              'and',
              '  job:slo_errors_per_request:ratio_rate5m{job="checkout"} > (14.4 * 0.001)',
              ')',
              'or',
              '(',
              '  job:slo_errors_per_request:ratio_rate6h{job="checkout"} > (6 * 0.001)',
              'and',
              '  job:slo_errors_per_request:ratio_rate30m{job="checkout"} > (6 * 0.001)',
              ')'
            ].join('\n')
          }]
        },
        {
          title: 'Observability: Logs, Metrics & Traces',
          def: '<table><thead><tr><th>Signal</th><th>What</th><th>Strengths</th><th>Pitfalls</th><th>Tools</th></tr></thead><tbody>' +
            '<tr><td><strong>Metrics</strong></td><td>Numeric time series with labels</td><td>Cheap, aggregatable, alerting, dashboards</td><td>High-cardinality labels (user_id) explode cost</td><td>Prometheus, Mimir, CloudWatch</td></tr>' +
            '<tr><td><strong>Logs</strong></td><td>Timestamped events, ideally structured JSON</td><td>Rich detail for debugging, audit</td><td>Volume/cost, PII leakage, unstructured text</td><td>Loki, Elasticsearch, Cloud Logging</td></tr>' +
            '<tr><td><strong>Traces</strong></td><td>Causal tree of spans across services for one request</td><td>Find where latency/errors occur in distributed calls</td><td>Sampling decisions, context propagation gaps</td><td>OpenTelemetry, Jaeger, Tempo</td></tr>' +
            '</tbody></table>' +
            '<p><strong>What to measure:</strong></p>' +
            '<ul><li><strong>RED</strong> for request-driven services: Rate, Errors, Duration (histograms, not averages).</li>' +
            '<li><strong>USE</strong> for resources: Utilisation, Saturation, Errors (CPU, memory, connection pools, queues).</li>' +
            '<li><strong>Four golden signals</strong> (Google SRE): latency, traffic, errors, saturation.</li>' +
            '<li>Async systems: queue depth, consumer lag, age of oldest message, DLQ size.</li></ul>' +
            '<p><strong>Design for observability:</strong> propagate W3C <code>traceparent</code> through HTTP, gRPC and message headers; include <code>trace_id</code> in every log line to pivot between signals; use <strong>OpenTelemetry</strong> SDKs and the Collector to stay vendor-neutral; use exemplars to link metric spikes to traces; sample traces smartly (tail-based sampling keeps all errors and slow requests). Profiling (continuous pprof) is increasingly treated as a fourth signal.</p>' +
            '<p>Observability is what lets you answer questions you did not anticipate — important when debugging emergent behaviour of distributed systems.</p>',
          interview: 'In the wrap-up of any HLD answer, name the 3–5 SLIs you would dashboard and alert on, and how a request is traced end to end (trace context through queues too). Mention cardinality control — a real-world cost issue interviewers appreciate.',
          examples: [{
            label: 'Go middleware: request ID, structured access log, latency',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "crypto/rand"',
              '    "encoding/hex"',
              '    "log/slog"',
              '    "net/http"',
              '    "os"',
              '    "time"',
              ')',
              '',
              'type statusRecorder struct {',
              '    http.ResponseWriter',
              '    status int',
              '}',
              '',
              'func (r *statusRecorder) WriteHeader(code int) {',
              '    r.status = code',
              '    r.ResponseWriter.WriteHeader(code)',
              '}',
              '',
              'func newID() string {',
              '    b := make([]byte, 8)',
              '    _, _ = rand.Read(b)',
              '    return hex.EncodeToString(b)',
              '}',
              '',
              'func Observe(log *slog.Logger, next http.Handler) http.Handler {',
              '    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
              '        id := r.Header.Get("X-Request-ID")',
              '        if id == "" {',
              '            id = newID()',
              '        }',
              '        w.Header().Set("X-Request-ID", id)',
              '        rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}',
              '        start := time.Now()',
              '        next.ServeHTTP(rec, r)',
              '        log.LogAttrs(r.Context(), slog.LevelInfo, "http_request",',
              '            slog.String("request_id", id),',
              '            slog.String("method", r.Method),',
              '            slog.String("route", r.Pattern), // Go 1.23+: matched pattern, low cardinality',
              '            slog.Int("status", rec.status),',
              '            slog.Duration("latency", time.Since(start)),',
              '        )',
              '    })',
              '}',
              '',
              'func main() {',
              '    log := slog.New(slog.NewJSONHandler(os.Stdout, nil))',
              '    mux := http.NewServeMux()',
              '    mux.HandleFunc("GET /orders/{id}", func(w http.ResponseWriter, r *http.Request) {',
              '        w.Write([]byte("order " + r.PathValue("id")))',
              '    })',
              '    _ = Observe(log, mux) // http.ListenAndServe(":8080", Observe(log, mux))',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Chaos Engineering & Resilience Testing',
          def: '<p><strong>Chaos engineering</strong> is the discipline of experimenting on a system to build confidence in its ability to withstand turbulent conditions in production (Principles of Chaos). It turns resilience <em>claims</em> in your design (&quot;we fail over automatically&quot;) into verified facts — a natural extension of a QA mindset.</p>' +
            '<p><strong>The method:</strong></p>' +
            '<ol><li>Define <strong>steady state</strong> via business-level SLIs (orders per minute, success rate, p99).</li>' +
            '<li>Form a <strong>hypothesis</strong>: &quot;If one AZ loses network, checkout success stays above 99.5%.&quot;</li>' +
            '<li><strong>Inject</strong> realistic faults: kill pods/instances, add latency or packet loss, fail a dependency, exhaust CPU/disk, expire certificates, break DNS, fail over the DB.</li>' +
            '<li><strong>Minimise blast radius</strong>: start in staging, then a small percentage of production traffic, with automatic abort conditions.</li>' +
            '<li><strong>Learn and fix</strong>: every surprise is a bug in the design or the runbook.</li></ol>' +
            '<table><thead><tr><th>Technique</th><th>Examples</th></tr></thead><tbody>' +
            '<tr><td>Infrastructure faults</td><td>Chaos Monkey, AWS Fault Injection Service, Azure Chaos Studio</td></tr>' +
            '<tr><td>Kubernetes faults</td><td>Chaos Mesh, LitmusChaos (pod kill, network delay, IO faults)</td></tr>' +
            '<tr><td>Application-level faults</td><td>Envoy/Istio fault injection (delays, aborts), feature-flagged failure modes</td></tr>' +
            '<tr><td>Organisational</td><td>Game days, DR drills, on-call simulations</td></tr>' +
            '</tbody></table>' +
            '<p>Complementary practices: load and soak testing, failover drills, dependency-failure tests in CI (Toxiproxy), and <strong>blameless postmortems</strong> that feed action items back into design.</p>',
          interview: 'With a QA background, this is your differentiator: describe a concrete experiment (hypothesis, steady-state metric, fault, blast radius, abort criteria, learning). Interviewers value candidates who verify resilience rather than assume it.',
          examples: [{
            label: 'A latency experiment as code (Chaos Mesh)',
            lang: 'yaml',
            code: [
              '# Hypothesis: 300 ms extra latency on half of the payment pods keeps checkout success >= 99.5%',
              '# (checkout has a 1 s deadline, a circuit breaker and an async fallback queue)',
              'apiVersion: chaos-mesh.org/v1alpha1',
              'kind: NetworkChaos',
              'metadata:',
              '  name: payments-latency',
              '  namespace: chaos',
              'spec:',
              '  action: delay',
              '  mode: fixed-percent',
              '  value: "50"',
              '  selector:',
              '    namespaces: [shop]',
              '    labelSelectors: {app: payments}',
              '  delay:',
              '    latency: 300ms',
              '    jitter: 50ms',
              '  duration: 10m',
              '# Abort criterion (outside the CR): an alert on checkout success < 98% for 2 min deletes this object.',
              '# Observe: checkout p99, breaker state changes, fallback queue depth, which alerts fired (or did not).'
            ].join('\n')
          }]
        },
        {
          title: 'Security in Design: AuthN/AuthZ at the Edge, Zero Trust, Encryption & Privacy',
          def: '<p><strong>Authentication at the edge:</strong> users authenticate with an identity provider via <strong>OIDC</strong> (Authorization Code + PKCE — the OAuth 2.1 direction; implicit flow is deprecated). The gateway validates access tokens (JWT signature via cached JWKS, <code>iss</code>, <code>aud</code>, <code>exp</code>), rejects bad traffic early, and forwards identity to services. Keep access tokens short-lived; use refresh-token rotation; prefer opaque tokens + introspection when instant revocation matters.</p>' +
            '<p><strong>Authorization</strong> belongs close to the data: the gateway enforces coarse scopes, services enforce fine-grained rules. Models: <strong>RBAC</strong> (roles), <strong>ABAC</strong> (attributes/policies, e.g. OPA/Cedar), <strong>ReBAC</strong> (relationships, Google Zanzibar style — SpiceDB, OpenFGA) for sharing models like Google Drive.</p>' +
            '<p><strong>Zero trust between services:</strong> never trust the network. Use <strong>mTLS</strong> with workload identities (SPIFFE/SPIRE, service mesh) so every call is authenticated and encrypted; propagate end-user context with signed tokens (token exchange) rather than trusting headers; least-privilege IAM per workload.</p>' +
            '<table><thead><tr><th>Concern</th><th>Design choice</th></tr></thead><tbody>' +
            '<tr><td>In transit</td><td>TLS 1.3 everywhere, HSTS at the edge, mTLS internally</td></tr>' +
            '<tr><td>At rest</td><td>Disk/DB encryption with KMS; <strong>envelope encryption</strong> (data key per object, wrapped by a KMS key) enabling rotation and crypto-shredding</td></tr>' +
            '<tr><td>Sensitive fields</td><td>Application-level encryption or <strong>tokenization</strong> (card numbers → vault, reduces PCI scope)</td></tr>' +
            '<tr><td>Secrets</td><td>Secrets manager / Vault, short-lived dynamic credentials, never in images or git</td></tr>' +
            '<tr><td>Privacy</td><td>Data minimisation, PII classification, masking in logs, retention limits, GDPR deletion/export flows, data residency</td></tr>' +
            '<tr><td>Abuse</td><td>WAF, rate limiting, bot detection, input validation, audit logs</td></tr>' +
            '</tbody></table>',
          interview: 'In HLD answers, spend one or two minutes on security: OIDC at the edge with JWT validation in the gateway, service-level authorization, mTLS between services, encryption in transit and at rest with KMS envelope encryption, PII minimisation and audit logging. Do not invent custom crypto or auth.',
          examples: [{
            label: 'Envelope encryption with AES-256-GCM and a KMS interface (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "crypto/aes"',
              '    "crypto/cipher"',
              '    "crypto/rand"',
              '    "errors"',
              '    "fmt"',
              ')',
              '',
              '// KMS is the only component that ever holds the key-encryption key (KEK).',
              'type KMS interface {',
              '    GenerateDataKey() (plaintext, wrapped []byte, err error) // e.g. AWS KMS GenerateDataKey',
              '    Decrypt(wrapped []byte) ([]byte, error)',
              '}',
              '',
              '// Envelope is what you store: ciphertext plus the wrapped (encrypted) data key.',
              'type Envelope struct {',
              '    WrappedDEK, Nonce, Ciphertext []byte',
              '}',
              '',
              'func gcmFor(key []byte) (cipher.AEAD, error) {',
              '    block, err := aes.NewCipher(key) // 32-byte key -> AES-256',
              '    if err != nil {',
              '        return nil, err',
              '    }',
              '    return cipher.NewGCM(block)',
              '}',
              '',
              '// Seal encrypts locally with a fresh DEK; aad binds the ciphertext to its owner',
              '// (tenant/object ID) so a blob cannot be swapped onto another record.',
              'func Seal(kms KMS, plaintext, aad []byte) (*Envelope, error) {',
              '    dek, wrapped, err := kms.GenerateDataKey()',
              '    if err != nil {',
              '        return nil, err',
              '    }',
              '    gcm, err := gcmFor(dek)',
              '    if err != nil {',
              '        return nil, err',
              '    }',
              '    nonce := make([]byte, gcm.NonceSize())',
              '    if _, err := rand.Read(nonce); err != nil {',
              '        return nil, err',
              '    }',
              '    return &Envelope{wrapped, nonce, gcm.Seal(nil, nonce, plaintext, aad)}, nil',
              '}',
              '',
              'func Open(kms KMS, e *Envelope, aad []byte) ([]byte, error) {',
              '    dek, err := kms.Decrypt(e.WrappedDEK) // one KMS call; cache DEKs briefly for hot objects',
              '    if err != nil {',
              '        return nil, err',
              '    }',
              '    gcm, err := gcmFor(dek)',
              '    if err != nil {',
              '        return nil, err',
              '    }',
              '    return gcm.Open(nil, e.Nonce, e.Ciphertext, aad)',
              '}',
              '',
              '// localKMS stands in for a real KMS/HSM in this demo: it wraps DEKs with AES-GCM under a KEK.',
              '// Deleting the KEK (or a tenant\'s DEKs) makes every copy unreadable: crypto-shredding.',
              'type localKMS struct{ kek []byte }',
              '',
              'func (k localKMS) GenerateDataKey() ([]byte, []byte, error) {',
              '    dek := make([]byte, 32)',
              '    if _, err := rand.Read(dek); err != nil {',
              '        return nil, nil, err',
              '    }',
              '    gcm, err := gcmFor(k.kek)',
              '    if err != nil {',
              '        return nil, nil, err',
              '    }',
              '    nonce := make([]byte, gcm.NonceSize())',
              '    if _, err := rand.Read(nonce); err != nil {',
              '        return nil, nil, err',
              '    }',
              '    return dek, gcm.Seal(nonce, nonce, dek, nil), nil // nonce || wrapped DEK',
              '}',
              '',
              'func (k localKMS) Decrypt(w []byte) ([]byte, error) {',
              '    gcm, err := gcmFor(k.kek)',
              '    if err != nil {',
              '        return nil, err',
              '    }',
              '    if len(w) < gcm.NonceSize() {',
              '        return nil, errors.New("bad wrapped key")',
              '    }',
              '    return gcm.Open(nil, w[:gcm.NonceSize()], w[gcm.NonceSize():], nil)',
              '}',
              '',
              'func main() {',
              '    kek := make([]byte, 32)',
              '    rand.Read(kek)',
              '    kms := localKMS{kek: kek}',
              '    env, _ := Seal(kms, []byte("card fingerprint 4242"), []byte("tenant-7/customer-42"))',
              '    pt, err := Open(kms, env, []byte("tenant-7/customer-42"))',
              '    fmt.Println(string(pt), err)',
              '    _, err = Open(kms, env, []byte("tenant-8/customer-42")) // wrong context',
              '    fmt.Println(err)                                          // cipher: message authentication failed',
              '}'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'Map backup strategies to RTO and RPO',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li>Nightly snapshot to another region: RPO ≤ 24 h, RTO = restore time (hours for TBs).</li><li>Snapshot + continuous WAL archiving (PITR): RPO ≈ minutes, RTO hours.</li><li>Async cross-region replica (warm standby): RPO = replication lag (seconds), RTO = promotion + DNS (minutes).</li><li>Synchronous multi-region consensus DB: RPO ≈ 0, RTO ≈ seconds — but every write pays cross-region latency.</li></ul>'
        },
        {
          t: 'Pick a DR strategy for three systems',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li><strong>Internal analytics dashboard:</strong> backup &amp; restore (RTO 24 h acceptable).</li><li><strong>Customer-facing catalog:</strong> warm standby or pilot light; data rebuildable from source; RTO 15–30 min.</li><li><strong>Payments ledger:</strong> multi-AZ synchronous replication + cross-region replica, RPO ≈ 0 within region, tested failover, immutable backups.</li><li>Justify each by business impact per hour of downtime vs cost.</li></ul>'
        },
        {
          t: 'Decide what to log, measure and trace for a checkout API',
          d: 'easy',
          type: 'design',
          hint: '<ul><li><strong>Metrics:</strong> RED per route (rate, 5xx ratio, latency histogram), dependency latency, payment provider errors, orders/min (business SLI), pool saturation.</li><li><strong>Logs:</strong> structured, one access log per request with trace_id, user/tenant ID (pseudonymised), error details; no card data or tokens.</li><li><strong>Traces:</strong> spans for gateway, checkout, inventory, payment, DB; propagate through Kafka headers; tail-sample errors/slow.</li><li><strong>Alerts:</strong> SLO burn rate on checkout success and latency.</li></ul>'
        },
        {
          t: 'Burn-rate alert thresholds for a 99.9% SLO',
          d: 'medium',
          type: 'concept',
          hint: '<ul><li>Budget = 0.1% of requests over 30 days (720 h).</li><li>Burn rate b consumes b × (window / 720 h) of the budget.</li><li>2% in 1 h → b = 0.02 × 720 / 1 = <strong>14.4</strong> → alert when 1 h error ratio &gt; 14.4 × 0.1% = 1.44%.</li><li>5% in 6 h → b = <strong>6</strong>; 10% in 3 days → b = <strong>1</strong> (ticket).</li><li>Add short windows (1/12 of long) so alerts clear quickly after recovery.</li></ul>'
        },
        {
          t: 'Write observability middleware in Go',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li>Wrap <code>http.ResponseWriter</code> to capture status.</li><li>Reuse incoming request ID or generate one; return it in a response header.</li><li>Log with <code>log/slog</code> JSON: method, route pattern (low cardinality), status, latency.</li><li>Extension: record a latency histogram (Prometheus client) and start an OpenTelemetry span; put the span&#39;s trace ID in logs.</li><li>The solution below adds RED counters via stdlib <code>expvar</code> (served at <code>/debug/vars</code>); see the Observability topic for the logging variant.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "expvar"',
            '    "log/slog"',
            '    "net/http"',
            '    "os"',
            '    "strconv"',
            '    "time"',
            ')',
            '',
            'var (',
            '    requests  = expvar.NewMap("http_requests_total")     // key: route|status',
            '    latencyMs = expvar.NewMap("http_latency_ms_sum")     // key: route',
            '    inflight  = expvar.NewInt("http_requests_in_flight") // saturation',
            ')',
            '',
            'type recorder struct {',
            '    http.ResponseWriter',
            '    status int',
            '}',
            '',
            'func (r *recorder) WriteHeader(c int) { r.status = c; r.ResponseWriter.WriteHeader(c) }',
            '',
            'func RED(log *slog.Logger, next http.Handler) http.Handler {',
            '    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
            '        inflight.Add(1)',
            '        defer inflight.Add(-1)',
            '        rec := &recorder{ResponseWriter: w, status: http.StatusOK}',
            '        start := time.Now()',
            '        next.ServeHTTP(rec, r)',
            '        route := r.Pattern // set by ServeMux after routing (Go 1.23+)',
            '        if route == "" {',
            '            route = "unmatched"',
            '        }',
            '        elapsed := time.Since(start)',
            '        requests.Add(route+"|"+strconv.Itoa(rec.status), 1)',
            '        latencyMs.Add(route, elapsed.Milliseconds())',
            '        if rec.status >= 500 {',
            '            log.Error("request failed", "route", route, "status", rec.status, "latency", elapsed)',
            '        }',
            '    })',
            '}',
            '',
            'func main() {',
            '    log := slog.New(slog.NewJSONHandler(os.Stdout, nil))',
            '    mux := http.NewServeMux()',
            '    mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) })',
            '    mux.Handle("GET /debug/vars", expvar.Handler())',
            '    _ = RED(log, mux) // http.ListenAndServe(":8080", RED(log, mux))',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Cross-region failover for PostgreSQL',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Primary + sync standby in another AZ (RPO 0 within region); async replica in DR region.</li><li>Failover controller (Patroni + etcd, or managed RDS/Aurora Global Database) decides promotion; <strong>fence</strong> the old primary (revoke network/IAM, STONITH) to avoid split brain.</li><li>Applications connect via a DNS name/proxy that is repointed; short DNS TTL; connection retry logic.</li><li>Accept RPO = replication lag for regional failover; quantify it and monitor it.</li><li>Runbook + quarterly drills; plan failback (resync old primary as a replica).</li></ul>'
        },
        {
          t: 'Design authentication and authorization for microservices',
          d: 'medium',
          type: 'design',
          hint: '<ol><li>OIDC login (Auth Code + PKCE) at an IdP; SPA/mobile gets short-lived access token + rotating refresh token.</li><li>Gateway validates JWT (JWKS cached, check <code>iss</code>/<code>aud</code>/<code>exp</code>), applies rate limits and coarse scopes.</li><li>Services receive a verified identity (token exchange to an internal token with narrowed audience); enforce fine-grained authZ via a policy engine (OPA) or ReBAC service.</li><li>Service-to-service: mTLS with SPIFFE IDs via mesh; authZ policies on which service may call which.</li><li>Audit logs for sensitive actions; revocation via short TTLs and session invalidation.</li></ol>'
        },
        {
          t: 'Plan a chaos experiment for AZ failure',
          d: 'medium',
          type: 'design',
          hint: '<ul><li><strong>Steady state:</strong> checkout success ≥ 99.5%, p99 &lt; 400 ms.</li><li><strong>Hypothesis:</strong> losing AZ-b causes no SLO breach; pods reschedule; DB fails over within 60 s.</li><li><strong>Fault:</strong> blackhole network for AZ-b subnets (AWS FIS) in staging, then in prod during business hours with on-call ready.</li><li><strong>Abort:</strong> automatic rollback if success &lt; 98% for 2 min.</li><li><strong>Observe:</strong> failover time, error spikes, capacity in remaining AZs, alerts that fired (or did not).</li><li><strong>Outcome:</strong> tickets for each gap; repeat regularly.</li></ul>'
        },
        {
          t: 'Envelope encryption with key rotation and crypto-shredding',
          d: 'hard',
          type: 'design',
          hint: '<ul><li>For each tenant (or object), generate a data encryption key (DEK) via KMS <code>GenerateDataKey</code>; encrypt data locally with AES-256-GCM; store the wrapped DEK alongside the ciphertext.</li><li>Key encryption key (KEK) lives in KMS/HSM and never leaves it; decrypt = KMS unwrap DEK (cache plaintext DEKs briefly in memory).</li><li>Rotation: rotate KEK (KMS keeps old versions for unwrap); re-wrap DEKs lazily or in background — no need to re-encrypt bulk data.</li><li>Crypto-shredding: delete a tenant&#39;s DEK/KEK to make all their data (including backups) unreadable — useful for GDPR erasure.</li><li>Audit KMS usage; least-privilege IAM on decrypt.</li></ul>'
        },
        {
          t: 'Active-active multi-region user profile service',
          d: 'hard',
          type: 'design',
          hint: '<ul><li>Global routing: anycast/latency-based DNS to nearest healthy region.</li><li>Data options: (a) <strong>home-region</strong> per user — writes forwarded to home region, reads local from replicas (no conflicts); (b) multi-leader with LWW per field or CRDTs (conflicts on concurrent edits); (c) distributed SQL (Spanner/CockroachDB) with regional leaseholders — consistent but higher write latency.</li><li>Uniqueness constraints (username/email) need a single global authority or consensus.</li><li>Capacity: N+1 regions; failover drills; caches per region with event-driven invalidation.</li><li>Data residency: pin EU users&#39; data to EU regions.</li></ul>'
        }
      ],
      interviewFocus: [
        {
          q: 'Compare active-passive and active-active multi-region architectures. Which would you choose for a payments platform?',
          a: '<p>Active-passive keeps a single writer and replicates to a standby region; it is simpler and avoids write conflicts, but failover is slower, may lose async-replicated writes, and the standby path is rarely exercised. Active-active serves traffic everywhere, offers lower latency and continuously tested failover, but requires conflict-free data design and N+1 capacity.</p><p>For payments I would run <strong>active-active for stateless and read paths</strong>, with ledger writes either (a) on a consensus-based multi-region database accepting the added write latency, or (b) partitioned by home region (each account has one writer region) with a tested, fenced regional failover. Money movement must not rely on last-writer-wins. Idempotency keys make client retries across a failover safe.</p>'
        },
        {
          q: 'What is the difference between RTO and RPO, and how do they drive architecture?',
          a: '<p><strong>RTO</strong> is how long we may be down; <strong>RPO</strong> is how much recent data we may lose. RPO drives the <em>data replication</em> choice: hours → periodic backups; minutes → log shipping/PITR; seconds → async replication; zero → synchronous replication or consensus (paying write latency). RTO drives the <em>standby readiness</em>: hours → restore from backup with IaC; minutes → warm standby with automated promotion; near zero → active-active. Both should be set per system based on cost of downtime/data loss, then verified with drills.</p>'
        },
        {
          q: 'How would you design alerting so on-call engineers are not overwhelmed?',
          a: '<ul><li>Page only on <strong>user-facing symptoms</strong>: SLO burn-rate alerts (multi-window, multi-burn-rate).</li><li>Route cause-based signals (high CPU, single pod restart, disk 70%) to dashboards or tickets; auto-remediate where possible.</li><li>Every page must be actionable, with a runbook link and owner; review noisy alerts weekly and delete or fix them.</li><li>Deduplicate and group alerts by service/incident; set inhibition rules (a region outage suppresses downstream alerts).</li><li>Track pages per shift and alert precision as metrics of on-call health.</li></ul>'
        },
        {
          q: 'How does distributed tracing work across synchronous and asynchronous boundaries?',
          a: '<p>Each request gets a <strong>trace ID</strong>; each unit of work is a <strong>span</strong> with a parent span ID, timing and attributes. The context is propagated in W3C <code>traceparent</code>/<code>tracestate</code> headers over HTTP and gRPC metadata by OpenTelemetry instrumentation. For async messaging, the producer injects the context into <strong>message headers</strong>; the consumer extracts it and starts a span linked to (or child of) the producer span, so a trace spans the queue hop. Spans are exported to a collector, sampled (head-based by probability or tail-based to keep errors/slow traces), and stored in Jaeger/Tempo. Logs carry the trace ID to correlate signals.</p>'
        },
        {
          q: 'Where should authentication and authorization happen in a microservices architecture?',
          a: '<p><strong>Authentication</strong> happens once at the edge: the gateway validates the user&#39;s OIDC/JWT token (or session) and rejects anonymous or invalid requests early. Services must still verify identity cryptographically — via a signed internal token or mTLS-authenticated propagation — rather than trusting a plain header, because the network is not trusted (zero trust).</p><p><strong>Authorization</strong> is layered: coarse checks (scopes, API plans) at the gateway; fine-grained, data-dependent checks (&quot;can user X edit document Y?&quot;) inside the owning service, possibly delegated to a policy engine (OPA/Cedar) or a relationship-based service (Zanzibar-style). Service-to-service authorization uses workload identity (SPIFFE) with allow-lists of callers.</p>'
        }
      ],
      quiz: [
        { q: 'What does RPO measure?', a: 'The maximum acceptable amount of data loss, expressed as time.' },
        { q: 'Which DR strategy keeps a scaled-down but fully running copy in another region?', a: 'Warm standby.' },
        { q: 'Why is replication not a backup?', a: 'Replication copies logical errors and deletions too; backups with point-in-time recovery let you go back before the mistake.' },
        { q: 'What does RED stand for?', a: 'Rate, Errors, Duration.' },
        { q: 'What burn rate consumes 2% of a 30-day budget in one hour?', a: '14.4.' },
        { q: 'What is static stability?', a: 'The ability to keep operating during a failure without depending on control-plane actions, e.g. by pre-provisioning capacity.' },
        { q: 'What is envelope encryption?', a: 'Encrypting data with a data key, and encrypting (wrapping) that data key with a master key held in a KMS/HSM.' },
        { q: 'Which OAuth flow should browser and mobile apps use?', a: 'Authorization Code with PKCE.' }
      ],
      resources: [
        { title: 'Google SRE Workbook — Alerting on SLOs', url: 'https://sre.google/workbook/alerting-on-slos/', type: 'book' },
        { title: 'AWS — Disaster recovery options in the cloud', url: 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html', type: 'docs' },
        { title: 'Principles of Chaos Engineering', url: 'https://principlesofchaos.org/', type: 'article' },
        { title: 'OpenTelemetry Documentation', url: 'https://opentelemetry.io/docs/', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 9 ─────────────────────────────
    {
      n: 9,
      title: 'HLD Classic Problems',
      summary: 'The reusable building blocks behind most interview questions (ID generation, fan-out, geo-indexing, real-time delivery, blob storage + CDN, search indexes, probabilistic sketches) and 17 classic designs, each with a structured approach: requirements, estimates, core components, data model, trade-offs and bottlenecks.',
      topics: [
        {
          title: 'Unique ID Generation: Snowflake, UUIDv7 and Friends',
          def: '<p>Distributed systems need IDs that are unique without a central bottleneck, ideally <strong>roughly time-sortable</strong> (good B-tree locality, natural ordering for feeds/chat) and compact.</p>' +
            '<table><thead><tr><th>Approach</th><th>Size</th><th>Sortable</th><th>Coordination</th><th>Notes</th></tr></thead><tbody>' +
            '<tr><td>DB auto-increment</td><td>64-bit</td><td>Yes</td><td>Single DB</td><td>SPOF and write bottleneck; leaks volume</td></tr>' +
            '<tr><td>Ticket server / range allocation</td><td>64-bit</td><td>Roughly</td><td>Fetch a block of 1,000 IDs at a time</td><td>Flickr ticket servers; etcd/DB hands out ranges</td></tr>' +
            '<tr><td>UUIDv4</td><td>128-bit</td><td>No</td><td>None</td><td>Random → B-tree page splits, poor locality</td></tr>' +
            '<tr><td><strong>UUIDv7</strong> (RFC 9562)</td><td>128-bit</td><td>Yes (ms)</td><td>None</td><td>48-bit Unix ms timestamp + random bits; standard, index-friendly; native in PostgreSQL 18 (<code>uuidv7()</code>)</td></tr>' +
            '<tr><td>ULID / KSUID</td><td>128/160-bit</td><td>Yes</td><td>None</td><td>Lexicographically sortable string encodings</td></tr>' +
            '<tr><td><strong>Snowflake</strong></td><td>64-bit</td><td>Yes (ms)</td><td>Worker ID assignment only</td><td>Twitter design; fits in <code>BIGINT</code></td></tr>' +
            '</tbody></table>' +
            '<p><strong>Snowflake layout:</strong> 1 sign bit | 41 bits ms since a custom epoch (~69 years) | 10 bits worker ID (1,024 workers, often 5 DC + 5 machine) | 12 bits sequence (4,096 IDs per ms per worker → ~4M IDs/s/worker).</p>' +
            '<p><strong>Pitfalls:</strong> worker ID uniqueness (assign via etcd/ZooKeeper leases or StatefulSet ordinal), <strong>clock moving backwards</strong> (refuse or wait until the clock catches up), sequence exhaustion within a ms (spin to next ms), and IDs leaking creation time and volume (use a separate random public ID if that matters).</p>',
          interview: 'Know the Snowflake bit layout and its two failure modes (duplicate worker IDs, clock rollback). Mention UUIDv7 as the modern zero-coordination default when 128 bits are acceptable.',
          examples: [{
            label: 'Snowflake ID generator (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "errors"',
              '    "fmt"',
              '    "sync"',
              '    "time"',
              ')',
              '',
              'const (',
              '    workerBits   = 10',
              '    sequenceBits = 12',
              '    maxWorker    = -1 ^ (-1 << workerBits)   // 1023',
              '    maxSequence  = -1 ^ (-1 << sequenceBits) // 4095',
              ')',
              '',
              'var epoch = time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC).UnixMilli()',
              '',
              'type Snowflake struct {',
              '    mu       sync.Mutex',
              '    worker   int64',
              '    lastMs   int64',
              '    sequence int64',
              '}',
              '',
              'func NewSnowflake(worker int64) (*Snowflake, error) {',
              '    if worker < 0 || worker > maxWorker {',
              '        return nil, errors.New("worker id out of range")',
              '    }',
              '    return &Snowflake{worker: worker}, nil',
              '}',
              '',
              'func (s *Snowflake) Next() (int64, error) {',
              '    s.mu.Lock()',
              '    defer s.mu.Unlock()',
              '    now := time.Now().UnixMilli()',
              '    if now < s.lastMs {',
              '        return 0, fmt.Errorf("clock moved backwards by %d ms", s.lastMs-now)',
              '    }',
              '    if now == s.lastMs {',
              '        s.sequence = (s.sequence + 1) & maxSequence',
              '        if s.sequence == 0 { // exhausted this ms: wait for the next one',
              '            for now <= s.lastMs {',
              '                now = time.Now().UnixMilli()',
              '            }',
              '        }',
              '    } else {',
              '        s.sequence = 0',
              '    }',
              '    s.lastMs = now',
              '    return (now-epoch)<<(workerBits+sequenceBits) | s.worker<<sequenceBits | s.sequence, nil',
              '}',
              '',
              'func main() {',
              '    g, _ := NewSnowflake(7)',
              '    a, _ := g.Next()',
              '    b, _ := g.Next()',
              '    fmt.Println(a, b, b > a) // strictly increasing per worker',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Fan-Out on Write vs Fan-Out on Read',
          def: '<p>Feeds, inboxes and timelines must combine content from many sources for each reader. The core decision is <em>when</em> to do that work.</p>' +
            '<table><thead><tr><th></th><th>Fan-out on write (push)</th><th>Fan-out on read (pull)</th></tr></thead><tbody>' +
            '<tr><td>How</td><td>On post, insert the post ID into every follower&#39;s precomputed feed (e.g. Redis list)</td><td>On feed load, fetch recent posts from everyone the user follows and merge</td></tr>' +
            '<tr><td>Read latency</td><td>Very fast — one key lookup</td><td>Slow — N queries + merge (k-way)</td></tr>' +
            '<tr><td>Write cost</td><td>O(followers) per post; huge for celebrities</td><td>O(1)</td></tr>' +
            '<tr><td>Wasted work</td><td>Feeds of inactive users</td><td>None</td></tr>' +
            '<tr><td>Freshness</td><td>Lag while fan-out runs (seconds)</td><td>Always current</td></tr>' +
            '<tr><td>Fits</td><td>Most users (few hundred followers), read-heavy</td><td>Celebrities, inactive users</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Hybrid (what Twitter/Instagram-style systems do):</strong> push for normal authors; for authors above a follower threshold (say 10K–100K), skip fan-out and <em>pull</em> their recent posts at read time, merging with the precomputed feed. Also skip pushing to users inactive for weeks and rebuild their feed on next login.</p>' +
            '<p>The same trade-off appears in group chat (write to each member&#39;s inbox vs read from the conversation), notifications, and activity streams. Store only <strong>IDs</strong> in feeds and hydrate content from caches, so edits/deletes are reflected and memory stays small.</p>',
          interview: 'Feed questions always reach the celebrity problem. Present push vs pull with costs, then the hybrid with a follower threshold, inactive-user handling, and ID-only feeds hydrated from caches.',
          examples: [{
            label: 'Hybrid feed: write path and read path',
            lang: 'text',
            code: [
              'WRITE: user U posts P',
              '  Post Svc -> posts DB (+ outbox) -> Kafka "posts"',
              '  Fan-out workers: if followers(U) < 10K:',
              '      for each active follower F: LPUSH feed:F P.id ; LTRIM feed:F 0 799',
              '    else: mark U as "celebrity" (no fan-out)',
              '',
              'READ: user F opens home feed',
              '  ids1 = LRANGE feed:F 0 199                       (precomputed)',
              '  ids2 = recent posts of celebrities F follows      (pull, cached per celebrity)',
              '  ids  = merge_by_time(ids1, ids2)[:50]',
              '  posts = multiGet(post cache, ids) -> hydrate authors, counts -> rank -> return'
            ].join('\n')
          }]
        },
        {
          title: 'Geo-Indexing: Geohash, Quadtree, S2 and H3',
          def: '<p>&quot;Find drivers/restaurants within 2 km&quot; cannot use a plain B-tree on (lat, lng) efficiently. Geo-indexes map 2D space to cells that can be indexed and sharded.</p>' +
            '<table><thead><tr><th>Index</th><th>Idea</th><th>Strengths</th><th>Weaknesses</th></tr></thead><tbody>' +
            '<tr><td><strong>Geohash</strong></td><td>Interleave lat/lng bits → base32 string; longer prefix = smaller cell (6 chars ≈ 1.2 × 0.6 km)</td><td>Works in any KV/SQL index as a string prefix; Redis GEO uses it</td><td>Edge effects: nearby points can have different prefixes → query the cell + 8 neighbours; cell sizes vary with latitude</td></tr>' +
            '<tr><td><strong>Quadtree</strong></td><td>Recursively split a region into 4 when it holds more than K points</td><td>Adapts to density (dense cities get small cells)</td><td>In-memory structure; rebalancing on updates; harder to shard</td></tr>' +
            '<tr><td><strong>S2</strong> (Google)</td><td>Project sphere onto cube faces, Hilbert curve → 64-bit cell IDs at 30 levels</td><td>Hierarchical, good locality, region coverings</td><td>More complex</td></tr>' +
            '<tr><td><strong>H3</strong> (Uber)</td><td>Hierarchical hexagonal grid</td><td>All neighbours equidistant — great for k-ring searches, surge pricing per cell</td><td>Hexagons do not nest perfectly across resolutions</td></tr>' +
            '<tr><td>R-tree / GiST</td><td>Bounding-box tree (PostGIS)</td><td>Arbitrary shapes, polygons, rich queries</td><td>Single-DB scale; heavy updates are costly</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Pattern for moving objects</strong> (drivers): keep only the latest location in memory (Redis GEO or an in-process index), keyed by cell, sharded by region/city; updates every few seconds overwrite; history goes asynchronously to a stream/warehouse. For static places (restaurants), a read-optimised index (PostGIS, Elasticsearch geo, or precomputed geohash tables) with caching works well.</p>',
          interview: 'Explain why a lat/lng B-tree is insufficient, then pick geohash (simple, Redis GEO) or H3/S2 (uniform neighbours, production-grade) and handle cell boundaries by searching neighbouring cells. For moving objects, separate hot latest-location state from history.',
          examples: [{
            label: 'Nearby search with geohash neighbours',
            lang: 'text',
            code: [
              'Driver update: GEOADD drivers:sf <lng> <lat> driver:42     (Redis GEO, geohash-scored ZSET)',
              'Rider search : GEOSEARCH drivers:sf FROMLONLAT <lng> <lat> BYRADIUS 2 km ASC COUNT 20',
              '',
              'Manual geohash approach for a ~500 m radius (precision 6 ~ 1.2 km x 0.6 km at the equator):',
              '  cell = geohash(lat, lng, 6)            e.g. "9q8yyk"',
              '  cells = [cell] + neighbours(cell)      9 cells, avoids boundary misses',
              '  the 3x3 block reaches only ~1 cell-width around the point, so cell size must be >= radius:',
              '  for a 2 km radius use precision 5 (~4.9 x 4.9 km) and let the distance filter trim the excess',
              '  candidates = union(index[c] for c in cells)',
              '  filter by exact haversine distance, rank by ETA, return top N'
            ].join('\n')
          }]
        },
        {
          title: 'Real-Time Delivery: WebSockets, SSE, Long Polling, Push',
          def: '<table><thead><tr><th>Technique</th><th>Direction</th><th>How</th><th>Use when</th></tr></thead><tbody>' +
            '<tr><td>Short polling</td><td>Client pulls</td><td>Request every N seconds</td><td>Rare updates, simplest; wasteful at scale</td></tr>' +
            '<tr><td>Long polling</td><td>Client pulls</td><td>Server holds request until data or timeout, client re-requests</td><td>Fallback where WebSockets are blocked; moderate frequency</td></tr>' +
            '<tr><td><strong>Server-Sent Events</strong></td><td>Server → client</td><td>One long HTTP response streaming <code>text/event-stream</code>; auto-reconnect with <code>Last-Event-ID</code></td><td>Feeds, notifications, dashboards, LLM token streaming</td></tr>' +
            '<tr><td><strong>WebSockets</strong></td><td>Bidirectional</td><td>HTTP upgrade to a persistent full-duplex TCP connection</td><td>Chat, multiplayer, collaborative editing, trading</td></tr>' +
            '<tr><td>Mobile push (APNs/FCM)</td><td>Server → device</td><td>Via OS vendor when app is backgrounded</td><td>Offline users, wake-ups</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Scaling persistent connections:</strong></p>' +
            '<ul><li>Connections are <strong>stateful</strong>: a dedicated gateway tier holds sockets (a tuned Go server can hold hundreds of thousands of mostly idle connections; budget memory per connection).</li>' +
            '<li>A <strong>connection registry</strong> (user → gateway node, in Redis with TTL) lets backend services route messages to the right gateway, or gateways subscribe to per-user pub/sub channels.</li>' +
            '<li>Load balancers must support long-lived connections (L4 or WebSocket-aware L7) with long idle timeouts; send heartbeats/pings to detect dead peers and keep NATs open.</li>' +
            '<li>Deploys and failures cause <strong>reconnect storms</strong>: drain gradually, and clients reconnect with exponential backoff + jitter, resuming from a cursor/sequence number to fetch missed messages.</li></ul>',
          interview: 'Justify the transport: SSE if only the server pushes, WebSockets for bidirectional low latency, push notifications for offline. Then cover the stateful gateway, connection registry, heartbeats, and reconnect storms with resume cursors.',
          examples: [{
            label: 'Server-Sent Events endpoint (Go stdlib)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "fmt"',
              '    "net/http"',
              '    "time"',
              ')',
              '',
              'func events(w http.ResponseWriter, r *http.Request) {',
              '    w.Header().Set("Content-Type", "text/event-stream")',
              '    w.Header().Set("Cache-Control", "no-cache")',
              '    rc := http.NewResponseController(w)',
              '    ticker := time.NewTicker(time.Second)',
              '    defer ticker.Stop()',
              '    for id := 1; ; id++ {',
              '        select {',
              '        case <-r.Context().Done(): // client went away',
              '            return',
              '        case t := <-ticker.C:',
              '            fmt.Fprintf(w, "id: %d\\nevent: tick\\ndata: %s\\n\\n", id, t.Format(time.RFC3339))',
              '            if err := rc.Flush(); err != nil {',
              '                return',
              '            }',
              '        }',
              '    }',
              '}',
              '',
              'func main() {',
              '    http.HandleFunc("GET /events", events)',
              '    // http.ListenAndServe(":8080", nil)  -> curl -N localhost:8080/events',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Blob Storage + CDN for Media',
          def: '<p>Never store large binary objects (images, video, documents) in your database or stream them through your API servers. Use <strong>object storage</strong> (S3, GCS, Azure Blob) for durability (S3 is designed for 11 nines) and cheap scale, with a <strong>CDN</strong> in front for delivery.</p>' +
            '<p><strong>Upload path:</strong></p>' +
            '<ol><li>Client asks the API for an upload; API authorises, creates a metadata row (status UPLOADING) and returns a <strong>pre-signed URL</strong> (short expiry, fixed key/content type/size).</li>' +
            '<li>Client uploads directly to object storage; large files use <strong>multipart upload</strong> (parallel, resumable parts; S3 parts 5 MiB–5 GiB, up to 10,000 parts).</li>' +
            '<li>Storage emits an event (S3 Event Notification → queue) → processing workers (virus scan, thumbnails, transcoding, metadata extraction) → status READY.</li></ol>' +
            '<p><strong>Download path:</strong> clients fetch via CDN URLs; private content uses <strong>signed URLs or signed cookies</strong> with short TTLs; immutable keys (content hash or version in the path) allow long cache lifetimes.</p>' +
            '<table><thead><tr><th>Concern</th><th>Technique</th></tr></thead><tbody>' +
            '<tr><td>Cost</td><td>Lifecycle rules to infrequent-access/archive tiers; delete orphaned uploads; abort incomplete multipart uploads</td></tr>' +
            '<tr><td>Dedup</td><td>Content-addressed keys (SHA-256) with reference counts</td></tr>' +
            '<tr><td>Variants</td><td>Pre-generate common sizes vs on-the-fly image resizing at the edge (cached)</td></tr>' +
            '<tr><td>Durability/DR</td><td>Versioning, cross-region replication, object lock for compliance</td></tr>' +
            '<tr><td>Security</td><td>Private buckets, scan uploads, validate content type, encryption with KMS</td></tr>' +
            '</tbody></table>',
          interview: 'Whenever media appears, say "metadata in the DB, bytes in object storage, uploads via pre-signed URLs, delivery via CDN with signed URLs". Then mention async processing on upload events and lifecycle tiering for cost.',
          examples: [{
            label: 'Media upload and delivery flow',
            lang: 'text',
            code: [
              '1. Client --POST /uploads {size, type}--> API --> DB: media(id, status=UPLOADING)',
              '   API --> client: presigned PUT URL (expires 15 min) / multipart upload ID',
              '2. Client --PUT parts--> S3 bucket "raw/"',
              '3. S3 event --> SQS --> workers: scan, transcode/resize --> S3 "processed/"',
              '                                      --> DB: status=READY, variants=[...]',
              '4. Viewer --> CDN (signed URL) --miss--> origin shield --> S3 "processed/"'
            ].join('\n')
          }]
        },
        {
          title: 'Search: Inverted Indexes, Ranking & the Indexing Pipeline',
          def: '<p>Full-text search (&quot;red trail running shoes size 10&quot;) cannot use B-tree indexes: <code>LIKE &#39;%shoe%&#39;</code> scans every row and knows nothing about relevance. Search engines — Lucene-based Elasticsearch, OpenSearch and Solr, as well as Postgres full-text search, Meilisearch and Typesense — are built on the <strong>inverted index</strong>.</p>' +
            '<ul><li><strong>Analysis</strong>: text becomes tokens via a tokenizer plus filters (lowercase, stop words, stemming, synonyms, n-grams for partial matches). The same analyzer must run at index time and at query time.</li><li><strong>Inverted index</strong>: term → <em>postings list</em> of (doc ID, term frequency, positions), sorted by doc ID and compressed (delta + variable-byte encoding). AND/OR queries intersect or union postings lists, using skip pointers; positions enable phrase queries.</li><li><strong>Ranking</strong>: <strong>BM25</strong> (term frequency with saturation × inverse document frequency, normalised by document length) is the default lexical score. Production systems add business signals (popularity, recency, conversion, stock) and often re-rank the top few hundred hits with a learning-to-rank model. <strong>Hybrid search</strong> adds vector similarity over embeddings via an ANN index (HNSW) and fuses both result lists, e.g. with reciprocal rank fusion.</li><li><strong>Segments</strong>: Lucene writes immutable segments (like LSM SSTables), searches all of them and merges them in the background; deletes are tombstones. A <em>refresh</em> (1 s by default in Elasticsearch) makes new documents searchable, so search is <strong>near-real-time</strong>, not read-your-writes.</li></ul>' +
            '<table><thead><tr><th>Concern</th><th>Design choice</th></tr>' +
            '</thead><tbody>' +
            '<tr><td>Source of truth</td><td>The primary database; the index is a derived, rebuildable view fed by CDC or outbox → Kafka → indexer</td></tr>' +
            '<tr><td>Scaling</td><td><strong>Document-partitioned</strong> shards (each holds whole documents): a query scatters to every shard, each returns its local top-K, a coordinator merges; replicas add read throughput and HA</td></tr>' +
            '<tr><td>Schema / analyzer changes</td><td>Build a new index version in the background, dual-write during the backfill, then atomically flip an alias (zero downtime)</td></tr>' +
            '<tr><td>Freshness vs throughput</td><td>Bulk indexing and a longer refresh interval during backfills; partial updates for fast-changing fields (price, stock)</td></tr>' +
            '<tr><td>Deep pagination</td><td><code>search_after</code> cursors instead of from/size beyond ~10K hits</td></tr>' +
            '<tr><td>Autocomplete</td><td>A separate structure: prefix trie / edge n-grams / completion suggester with precomputed top-K</td></tr>' +
            '</tbody></table>' +
            '<p>Term-partitioned (global) indexes, where each node owns a range of terms, make single-term lookups cheap but multi-term queries and document updates expensive; nearly every production engine partitions by document.</p>',
          interview: 'Say "the database stays the source of truth; search is a derived index fed by CDC". Explain analysis and postings lists, BM25 plus business signals, document-partitioned shards with scatter-gather top-K, near-real-time refresh, and alias-based reindexing. Bring up hybrid lexical plus vector retrieval only if relevance or semantic search comes up.',
          examples: [{
            label: 'A tiny inverted index with rarest-term-first AND queries (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "fmt"',
              '    "slices"',
              '    "strings"',
              ')',
              '',
              '// Index maps term -> postings list (sorted doc IDs). Real postings also hold term',
              '// frequency and positions (for BM25 and phrase queries) and are delta-compressed.',
              'type Index struct{ postings map[string][]int }',
              '',
              'func NewIndex() *Index { return &Index{postings: map[string][]int{}} }',
              '',
              '// analyze = tokenizer + lowercase filter. Real analyzers also stem ("running" -> "run"),',
              '// drop stop words and expand synonyms; the SAME analyzer must run at index and query time.',
              'func analyze(text string) []string {',
              '    return strings.FieldsFunc(strings.ToLower(text), func(r rune) bool {',
              '        return !(r >= \'a\' && r <= \'z\' || r >= \'0\' && r <= \'9\')',
              '    })',
              '}',
              '',
              '// Add indexes a document; doc IDs must arrive in increasing order to keep postings sorted.',
              'func (ix *Index) Add(docID int, text string) {',
              '    seen := map[string]bool{}',
              '    for _, t := range analyze(text) {',
              '        if !seen[t] {',
              '            seen[t] = true',
              '            ix.postings[t] = append(ix.postings[t], docID)',
              '        }',
              '    }',
              '}',
              '',
              '// intersect merges two sorted postings lists in O(len(a) + len(b)).',
              'func intersect(a, b []int) []int {',
              '    var out []int',
              '    i, j := 0, 0',
              '    for i < len(a) && j < len(b) {',
              '        switch {',
              '        case a[i] == b[j]:',
              '            out = append(out, a[i])',
              '            i++',
              '            j++',
              '        case a[i] < b[j]:',
              '            i++',
              '        default:',
              '            j++',
              '        }',
              '    }',
              '    return out',
              '}',
              '',
              '// SearchAND returns docs containing every term, intersecting from the rarest term first.',
              'func (ix *Index) SearchAND(query string) []int {',
              '    terms := analyze(query)',
              '    if len(terms) == 0 {',
              '        return nil',
              '    }',
              '    slices.SortFunc(terms, func(x, y string) int { return len(ix.postings[x]) - len(ix.postings[y]) })',
              '    res := ix.postings[terms[0]]',
              '    for _, t := range terms[1:] {',
              '        res = intersect(res, ix.postings[t])',
              '    }',
              '    return res',
              '}',
              '',
              'func main() {',
              '    ix := NewIndex()',
              '    ix.Add(1, "Red running shoes")',
              '    ix.Add(2, "Blue running jacket")',
              '    ix.Add(3, "Red trail running shoes, size 10")',
              '    fmt.Println(ix.SearchAND("red shoes"))   // [1 3]',
              '    fmt.Println(ix.SearchAND("running 10")) // [3]',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Probabilistic Data Structures: Bloom Filters, HyperLogLog, Count-Min Sketch',
          def: '<p>At scale, exact answers to &quot;have we seen this?&quot;, &quot;how many distinct?&quot; and &quot;how often?&quot; need memory proportional to the data. <strong>Sketches</strong> trade a small, bounded error for tiny fixed memory, and most of them <strong>merge</strong> across shards and time windows — which is why they appear in crawlers, analytics, caches and storage engines.</p>' +
            '<table><thead><tr><th>Structure</th><th>Answers</th><th>Error</th><th>Memory</th><th>Typical use</th></tr>' +
            '</thead><tbody>' +
            '<tr><td><strong>Bloom filter</strong></td><td>&quot;Possibly in the set&quot; / &quot;definitely not&quot;</td><td>False positives only (tunable); no false negatives; no deletes (counting or cuckoo filters allow them)</td><td>~9.6 bits per element at 1% false positives</td><td>Crawler seen-URLs, LSM SSTable lookups (skip disk reads), cache-penetration guard</td></tr>' +
            '<tr><td><strong>HyperLogLog</strong></td><td>Number of distinct elements</td><td>~1.04 / √m relative standard error (Redis: 0.81%)</td><td>Fixed: 12 KB in Redis for billions of items</td><td>Unique visitors, distinct queries, cardinality per dimension</td></tr>' +
            '<tr><td><strong>Count-Min Sketch</strong></td><td>Approximate frequency of an item</td><td>Overestimates only: by at most εN with probability 1 − δ</td><td>⌈e/ε⌉ × ⌈ln(1/δ)⌉ counters</td><td>Heavy hitters / top-K with a heap, hot-key detection, abuse detection</td></tr>' +
            '<tr><td><strong>t-digest / KLL / DDSketch</strong></td><td>Quantiles (p50, p99)</td><td>Small rank or relative error, accurate at the tails</td><td>A few KB</td><td>Latency percentiles merged across hosts (averaging per-host p99s is wrong)</td></tr>' +
            '<tr><td><strong>MinHash / SimHash</strong></td><td>Similarity of sets or documents</td><td>Probabilistic</td><td>Small signatures</td><td>Near-duplicate detection in crawlers and dedup pipelines</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Interview patterns:</strong> a web crawler checks a Bloom filter before the URL store (a false positive skips a few new URLs, which is acceptable); a top-K service keeps a Count-Min Sketch plus a min-heap of size K per time window and merges per-node sketches; a dashboard keeps one HyperLogLog per day and merges them for weekly uniques — impossible with plain daily counters, because the same user would be counted every day.</p>',
          interview: 'Reach for a sketch when exact state would not fit in memory and the product tolerates a bounded error. Name the error type (Bloom: false positives only; Count-Min: overestimates only; HyperLogLog: about 1% relative), the merge property, and size one with the formula on the spot.',
          examples: [{
            label: 'Sizing formulas and Redis commands',
            lang: 'text',
            code: [
              'Bloom filter: n items, false-positive rate p',
              '  bits m = -n ln(p) / (ln 2)^2        hash functions k = (m / n) ln 2',
              '  n = 1B URLs, p = 1%  -> m = 9.6e9 bits ~= 1.2 GB, k = 7',
              '  (exact set of 1B 8-byte URL hashes: ~8 GB plus overhead; of full URLs: ~100 GB)',
              '',
              'Count-Min Sketch for top-K: eps = 0.01%, delta = 0.1%',
              '  width = ceil(e / 0.0001) = 27,183    depth = ceil(ln 1000) = 7',
              '  -> ~190K counters x 4 B ~= 760 KB per window, mergeable by element-wise addition',
              '',
              'Redis (HyperLogLog is core; Bloom / CMS / Top-K are built into Redis 8, or Redis Stack modules)',
              '  PFADD   uniques:2026-10-29 user:42                 # 12 KB per key',
              '  PFCOUNT uniques:2026-10-29                          # ~0.81% standard error',
              '  PFMERGE uniques:wk44 uniques:2026-10-27 uniques:2026-10-28 uniques:2026-10-29',
              '  BF.ADD  seen-urls https://example.com/a             # Bloom filter',
              '  CMS.INCRBY query-freq "red shoes" 1                 # Count-Min Sketch; TOPK.ADD for heavy hitters'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'Design a URL shortener (TinyURL / bit.ly)',
          d: 'easy',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> create short link (optional alias, expiry), redirect, optional click analytics. NFR: redirect p99 &lt; 50 ms, 99.99% availability, codes not trivially enumerable.</li><li><strong>Estimates:</strong> 100M new links/month ≈ 40 writes/s; 100:1 reads ≈ 4K/s (peak ~10K). 7 base62 chars = 62<sup>7</sup> ≈ 3.5 trillion codes. 5 years × 1.2B links × 500 B ≈ 3 TB.</li><li><strong>Core components:</strong> API service; key generator (counter ranges per server from etcd/DB → base62, scrambled with a bijective permutation so codes are not sequential; or random 7 chars + conditional insert); KV store (DynamoDB/Cassandra) or Postgres; Redis cache for hot codes; analytics events → Kafka → OLAP.</li><li><strong>Data model:</strong> <code>links(code PK, long_url, owner_id, created_at, expires_at)</code>; secondary index on <code>owner_id</code> for user dashboards.</li><li><strong>Key trade-offs:</strong> 301 (browser caches, fewer hits, lose analytics) vs 302 (every click tracked); hash of URL (dedupes same URL, collisions) vs counter (no collisions, needs coordination) vs random (collision check).</li><li><strong>Bottlenecks:</strong> viral links → cache + CDN edge redirects; key service SPOF → pre-allocated ranges; abuse → rate limits, malware/phishing scanning, expiry cleanup by TTL.</li></ul>'
        },
        {
          t: 'Design a unique ID generator for a distributed system',
          d: 'medium',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> unique across DCs, 64-bit, roughly time-ordered, ≥ 10K IDs/s per node, no per-ID coordination, highly available.</li><li><strong>Estimates:</strong> 1M IDs/s globally across ~100 nodes → 10K/s/node, far below Snowflake&#39;s 4,096/ms/node.</li><li><strong>Core components:</strong> ID library embedded in services (no network hop) or a small ID service; worker-ID assignment via etcd/ZooKeeper leases or StatefulSet ordinals; NTP/chrony monitoring.</li><li><strong>Data model:</strong> Snowflake bits: 41 timestamp | 10 worker | 12 sequence (adjust: e.g. 5 DC bits + 5 machine bits).</li><li><strong>Key trade-offs:</strong> Snowflake (64-bit, sortable, needs worker IDs) vs UUIDv7 (zero coordination, 128-bit) vs DB ticket ranges (simple, central dependency) vs UUIDv4 (unsortable, index-unfriendly).</li><li><strong>Bottlenecks / failure modes:</strong> clock rollback (refuse/wait, alert), duplicate worker IDs after lease loss (fence by lease), sequence exhaustion within 1 ms (spin), epoch exhaustion after ~69 years, IDs revealing business volume.</li></ul>'
        },
        {
          t: 'Design a distributed rate limiter',
          d: 'medium',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> limits per API key/user/IP with multiple rules (e.g. 100/s and 10K/day), &lt; 2 ms overhead, consistent across N gateway nodes, HA, standard 429 headers.</li><li><strong>Estimates:</strong> 1M req/s across 50 gateways; 10M active keys × ~100 B ≈ 1 GB state.</li><li><strong>Core components:</strong> rules service (cached config), limiter middleware in the gateway, Redis Cluster executing an atomic Lua token-bucket script per request; metrics on throttles.</li><li><strong>Data model:</strong> <code>rl:{key}:{rule} → {tokens, last_refill_ms}</code> with TTL; hash tags so a key&#39;s rules share a slot.</li><li><strong>Key trade-offs:</strong> central Redis (accurate, +~0.5 ms RTT) vs local per-node limits (limit/N, fast, inaccurate with uneven LB) vs hybrid (nodes lease token batches from Redis); token bucket vs sliding window counter; fail-open (availability) vs fail-closed (protection); multi-region: per-region quotas or async-synced counters.</li><li><strong>Bottlenecks:</strong> one huge tenant&#39;s hot key → local batching; Redis outage → local fallback limits; clock differences → use Redis <code>TIME</code> inside the script.</li></ul>'
        },
        {
          t: 'Design a notification system',
          d: 'medium',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> push (APNs/FCM), SMS, email, in-app; templates and localisation; user preferences and quiet hours; scheduling; per-user frequency caps; at-least-once with dedup; delivery tracking.</li><li><strong>Estimates:</strong> 10M push + 5M email + 1M SMS per day; marketing bursts of 50M in an hour ≈ 14K/s.</li><li><strong>Core components:</strong> Notification API (idempotency key) → validation, preference and cap checks → priority queues per channel (OTP/transactional separate from marketing) → channel workers with provider adapters → third-party providers; template service; scheduler for delayed sends; webhook receiver for delivery/open events; DLQ + retries.</li><li><strong>Data model:</strong> <code>notifications(id, user_id, channel, template, params, status, attempts)</code>, <code>user_prefs(user_id, channel, opt_in, quiet_hours)</code>, <code>devices(user_id, token, platform, last_seen)</code>.</li><li><strong>Key trade-offs:</strong> separate queues per channel/priority to avoid head-of-line blocking; at-least-once + dedup by notification ID vs risk of double SMS; multiple SMS/email vendors for failover vs cost.</li><li><strong>Bottlenecks:</strong> provider rate limits (token bucket per provider), invalid device tokens (prune on feedback), campaign bursts (throttle, spread), PII in logs.</li></ul>'
        },
        {
          t: 'Design typeahead / search autocomplete',
          d: 'medium',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> top 5–10 suggestions per prefix, p99 &lt; 100 ms end to end, ranked by popularity with trending freshness (minutes to hours), filtered for offensive terms; personalisation optional.</li><li><strong>Estimates:</strong> 10M DAU × 10 searches × ~6 keystrokes ≈ 600M requests/day ≈ 7K QPS (peak ~20K); client debounce (~150 ms) cuts this significantly.</li><li><strong>Core components:</strong> client debounce + local cache; suggestion service holding an in-memory <strong>trie</strong> with precomputed top-K per node, sharded by prefix ranges; offline pipeline: query logs → Kafka → aggregation (Spark/Flink, time-decayed counts) → build trie snapshots → blue/green load; real-time trending overlay; CDN/browser caching for short prefixes.</li><li><strong>Data model:</strong> trie node {children, topK[(query, score)]} or KV <code>prefix → topK list</code> (Redis sorted sets).</li><li><strong>Key trade-offs:</strong> precomputed top-K (fast reads, memory, rebuild cost) vs query-time traversal; batch freshness vs streaming complexity; exact vs fuzzy matching (typo tolerance).</li><li><strong>Bottlenecks:</strong> very short prefixes are hottest → cache at edge; shard skew by first letter → shard on measured traffic; trie memory → cap depth, compress (radix tree).</li></ul>'
        },
        {
          t: 'Design a web crawler',
          d: 'medium',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> crawl ~1B pages/month, politeness (robots.txt, per-host rate limits), avoid duplicate URLs/content, prioritise and recrawl for freshness, store pages for indexing, robust to spider traps.</li><li><strong>Estimates:</strong> 1B / 2.6M s ≈ 400 pages/s (peak 1K); 500 KB avg → ~200 MB/s download; ~500 TB/month raw (compress, keep latest versions).</li><li><strong>Core components:</strong> seed URLs → <strong>URL frontier</strong> (front queues by priority, back queues per host for politeness — Mercator design) → fetchers (async HTTP, timeouts, DNS cache) → parser → content dedup (checksum/SimHash) → link extractor + URL normaliser → seen-URL filter (Bloom filter + KV) → frontier; blob storage for pages; metadata DB.</li><li><strong>Data model:</strong> <code>url_seen(hash)</code>, <code>host(next_fetch_at, robots_rules, crawl_delay)</code>, <code>page(url_hash, url, fetched_at, status, checksum, blob_ref)</code>.</li><li><strong>Key trade-offs:</strong> BFS vs priority (PageRank, change frequency); Bloom filter false positives (skip a few new URLs) vs exact set memory; partition work by host hash so politeness state is local to one node.</li><li><strong>Bottlenecks:</strong> DNS latency, slow/huge pages, traps (infinite calendars → depth/length limits), duplicate content across mirrors, storage costs.</li></ul>'
        },
        {
          t: 'Design a news feed (Twitter / Instagram home timeline)',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> post (text/media), follow, home timeline (reverse-chronological or ranked), feed load p99 &lt; 200 ms; seconds of staleness OK; likes/comments counts.</li><li><strong>Estimates:</strong> 300M DAU; 600M posts/day ≈ 7K writes/s; 30 feed loads/user/day ≈ 100K reads/s; avg 200 followers → ~1.4M feed inserts/s if pure push; celebrities with 100M followers.</li><li><strong>Core components:</strong> Post service (Snowflake IDs) → posts DB + outbox → Kafka; fan-out workers push post IDs into followers&#39; Redis feed lists (capped ~800); Feed service merges precomputed feed + celebrity pulls, hydrates via post/user caches, optional ranking service; media in object storage + CDN; counters service.</li><li><strong>Data model:</strong> <code>posts(post_id, author_id, body, media, created_at)</code> sharded by author; <code>follows</code> stored both directions (<code>followers_of</code>, <code>following_of</code>); <code>feed:{user_id}</code> list of post IDs.</li><li><strong>Key trade-offs:</strong> push vs pull vs <strong>hybrid</strong> (threshold on follower count); skip inactive users; ID-only feeds vs storing content; ranking vs chronological.</li><li><strong>Bottlenecks:</strong> celebrity write amplification, hot posts (replicate cache keys, local L1), like counters (sharded counters, async aggregation), feed cache misses for returning users (rebuild by pull).</li></ul>'
        },
        {
          t: 'Design a chat system (WhatsApp / Messenger)',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> 1:1 and group chat (≤ 500 members), delivery and read receipts, online presence, offline delivery with push, multi-device history sync, ordering per conversation; E2EE as a stretch.</li><li><strong>Estimates:</strong> 500M DAU × 40 msgs ≈ 20B msgs/day ≈ 230K/s (peak ~500K); 100 B avg → ~2 TB/day; ~100M concurrent connections → hundreds of gateway nodes.</li><li><strong>Core components:</strong> WebSocket gateways (stateful) + session registry (user/device → gateway); chat service assigns a per-conversation sequence number and persists before acking (&quot;sent&quot;); router delivers to recipients&#39; gateways (&quot;delivered&quot;); push service for offline devices; presence service (heartbeats, TTL keys, lazy fan-out to visible contacts); media via blob store + CDN.</li><li><strong>Data model:</strong> <code>messages(conversation_id, bucket, seq, message_id, sender_id, body, ts)</code> in Cassandra/ScyllaDB; <code>device_cursor(device_id, conversation_id, last_seq)</code> for sync; <code>conversation_members</code>.</li><li><strong>Key trade-offs:</strong> ordering by server-assigned sequence (single writer per conversation via Kafka partition) vs client timestamps; group fan-out on write (per-member inbox) vs on read (conversation log + cursors); presence accuracy vs fan-out cost.</li><li><strong>Bottlenecks:</strong> reconnect storms after deploys (drain, jittered backoff, resume from cursor), very large groups, hot partitions, multi-device E2EE key management.</li></ul>'
        },
        {
          t: 'Design a distributed key-value store (Dynamo-style)',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> <code>get/put/delete</code>, always-writable (high availability), tunable consistency, horizontal scale to PB, single-digit ms latency, survive node/AZ failures.</li><li><strong>Estimates:</strong> 1M ops/s, 100 TB logical × RF 3 = 300 TB → ~100 nodes with 4 TB NVMe each.</li><li><strong>Core components:</strong> consistent hashing ring with vnodes; replication to the next N distinct nodes across AZs; any node can coordinate; quorum reads/writes (R, W, N); gossip membership + phi-accrual failure detection; hinted handoff for temporarily down replicas; read repair + Merkle-tree anti-entropy; LSM storage engine (commit log, memtable, SSTables, compaction, bloom filters).</li><li><strong>Data model:</strong> key → (value, version: vector clock or timestamp, TTL, tombstone flag).</li><li><strong>Key trade-offs:</strong> AP leaderless with sloppy quorums (Dynamo/Cassandra) vs CP with a Raft group per range (TiKV/CockroachDB); LWW (simple, loses concurrent writes) vs vector clocks with client-side merge; compaction strategy (size-tiered vs leveled).</li><li><strong>Bottlenecks:</strong> hot keys, rebalancing bandwidth when nodes join, tombstone accumulation, large values (cap size; store blobs externally), GC/compaction latency spikes.</li></ul>'
        },
        {
          t: 'Design a distributed job scheduler',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> one-off and cron jobs, fire within ~1 s of schedule, at-least-once with retries/backoff, priorities, per-tenant quotas, job status/history, 10M+ jobs/day, no SPOF.</li><li><strong>Estimates:</strong> 10M/day ≈ 115/s average, but heavy peaks at :00 (e.g. 100K jobs due at midnight).</li><li><strong>Core components:</strong> Job API → jobs DB partitioned by <code>next_run_at</code> time bucket; scheduler instances own bucket partitions via leases (etcd) and load the next minute of due jobs into in-memory timers (timing wheel); when due, enqueue to priority queues (Kafka/SQS); workers execute with heartbeats and leases; results update status; cron jobs compute the next occurrence after each enqueue.</li><li><strong>Data model:</strong> <code>jobs(job_id, tenant, schedule, payload, next_run_at, status, attempts, lease_owner, lease_until, version)</code>, <code>job_runs(job_id, scheduled_for, started_at, result)</code> with unique <code>(job_id, scheduled_for)</code> for idempotency.</li><li><strong>Key trade-offs:</strong> DB polling with <code>SKIP LOCKED</code> (simple, fine to ~1K/s) vs partitioned in-memory timing wheels (precise, scalable); single leader vs partitioned schedulers; exactly-once impossible → idempotency keys.</li><li><strong>Bottlenecks:</strong> thundering herd at round times (jitter, pre-loading), long-running jobs (heartbeats, lease extension), worker crashes (lease expiry re-queue), noisy tenants (quotas), clock skew between schedulers.</li></ul>'
        },
        {
          t: 'Design a video streaming platform (YouTube / Netflix)',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> upload, transcode, stream with adaptive bitrate on many devices, startup &lt; 2 s, minimal rebuffering, global audience, view counts; recommendations out of scope.</li><li><strong>Estimates:</strong> ~500 hours uploaded per minute; each video stored as a bitrate ladder (240p–4K) × codecs (H.264, VP9/AV1) ≈ several × source size; egress dominates: 10M concurrent × 5 Mbps = 50 Tbps → CDN essential.</li><li><strong>Core components:</strong> resumable upload via pre-signed multipart → raw bucket → event → transcoding DAG (split into GOP-aligned chunks, parallel encode, package HLS/DASH segments of 2–6 s + manifests, thumbnails, DRM) → processed bucket (origin) → multi-tier CDN (and ISP-embedded caches like Netflix Open Connect); metadata service; playback API issues signed manifest URLs; player-side ABR algorithm.</li><li><strong>Data model:</strong> <code>videos(id, owner, title, status, duration)</code>, <code>renditions(video_id, resolution, codec, manifest_url)</code>; view events → Kafka → aggregated counts.</li><li><strong>Key trade-offs:</strong> pre-transcode all renditions (storage) vs just-in-time for the long tail (compute, latency); AV1 (better compression, costly encode) vs H.264 (universal); proactive pushing of popular titles to edges off-peak.</li><li><strong>Bottlenecks:</strong> transcoding queue during spikes (priority, autoscaled spot fleet), CDN misses for long-tail content, view-count hot keys (stream aggregation), copyright scanning.</li></ul>'
        },
        {
          t: 'Design file sync and storage (Google Drive / Dropbox)',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> upload/download, automatic sync across devices, version history, sharing with permissions, offline edits with conflict handling, files up to tens of GB, bandwidth efficiency.</li><li><strong>Estimates:</strong> 50M DAU, ~100M file changes/day ≈ 1.2K/s; tens of PB total storage, heavily dedupable.</li><li><strong>Core components:</strong> desktop/mobile client (file watcher, <strong>chunker</strong> ~4 MB blocks with SHA-256 hashes, local metadata DB); block service (&quot;which hashes are missing?&quot; → upload only those via pre-signed URLs); metadata service (namespaces, files, versions, block lists) on sharded SQL; per-namespace change journal; notification service (long polling/WebSocket) telling other devices to pull changes from their cursor.</li><li><strong>Data model:</strong> <code>file(id, namespace_id, path, latest_version)</code>, <code>file_version(file_id, version, block_hashes[], size, author)</code>, <code>block(hash, location, refcount)</code>, <code>journal(namespace_id, seq, op)</code>, <code>acl(namespace_id, principal, role)</code>.</li><li><strong>Key trade-offs:</strong> fixed-size vs content-defined chunking (CDC handles inserts mid-file better); conflicts: last-writer-wins vs &quot;conflicted copy&quot; files; strong consistency for metadata vs eventual for notifications; dedup vs per-user encryption (convergent encryption leaks equality).</li><li><strong>Bottlenecks:</strong> hot shared namespaces, millions of tiny files (batch metadata ops), cold data costs (tiering), large-file resumability.</li></ul>'
        },
        {
          t: 'Design a ride-sharing service (Uber / Lyft)',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> riders request rides, match a nearby driver within seconds, real-time driver locations, ETA and pricing (surge), trip lifecycle, payments; high availability, per-city scale.</li><li><strong>Estimates:</strong> 5M active drivers sending location every 4 s ≈ 1.25M location writes/s; 20M trips/day ≈ 230/s (peaks 1K+/s).</li><li><strong>Core components:</strong> location ingestion via persistent connections → in-memory geo index of latest positions (H3/S2 cells, sharded by city) with history streamed to Kafka; dispatch service (k-ring search of nearby available drivers, rank by ETA from routing service, offer with timeout, atomically lock driver); trip service (state machine on strongly consistent DB); surge pricing via stream processing of supply/demand per cell; payments; notifications.</li><li><strong>Data model:</strong> <code>driver_state(driver_id, status, cell, lat, lng, ts)</code> in memory/Redis with TTL; <code>trips(trip_id, rider_id, driver_id, state, pickup, dropoff, fare, version)</code> sharded by city/region.</li><li><strong>Key trade-offs:</strong> geohash vs quadtree vs H3; persist every location (too expensive) vs latest-in-memory + async history; matching optimality (batch matching every few seconds) vs speed (greedy nearest).</li><li><strong>Bottlenecks:</strong> hot cells (airports, stadiums), location write throughput, double-assignment races (CAS on driver status), regional failover (rebuild index from fresh location pings within seconds).</li></ul>'
        },
        {
          t: 'Design a payment system',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> accept card payments via PSPs, refunds, merchant payouts, double-entry ledger, reconciliation, no double charges or lost payments, full audit trail, PCI-DSS scope minimisation.</li><li><strong>Estimates:</strong> 1M transactions/day ≈ 12 TPS (peaks ~1K TPS on sale days) — low volume, extreme correctness.</li><li><strong>Core components:</strong> Payment API with <strong>idempotency keys</strong> → payment service (state machine CREATED → AUTHORIZED → CAPTURED → SETTLED / FAILED / REFUNDED) → PSP adapters (card data tokenised by PSP-hosted fields, so you never touch the PAN) → webhook handler (verify signatures, idempotent) → <strong>ledger service</strong> (append-only double-entry) → balances; outbox for events; reconciliation jobs comparing PSP settlement files with the ledger; payout scheduler.</li><li><strong>Data model:</strong> <code>payments(id, idempotency_key UNIQUE, merchant_id, amount_minor BIGINT, currency, status, psp_ref, version)</code>; <code>ledger_entries(id, txn_id, account_id, direction, amount_minor, created_at)</code> with Σdebits = Σcredits per txn; corrections via reversing entries, never updates.</li><li><strong>Key trade-offs:</strong> sync vs async PSP calls (timeouts produce UNKNOWN state → query PSP before retrying); strong consistency SQL (sharded by merchant/account) over NoSQL; integers in minor units, never floats; single vs multiple PSPs (routing, failover, cost).</li><li><strong>Bottlenecks:</strong> hot merchant balance rows (sub-accounts, batched postings), PSP outages (circuit breaker + fallback PSP), reconciliation breaks (alerting, manual workflow), webhook storms.</li></ul>'
        },
        {
          t: 'Design a full-text search service (product / document search)',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> keyword search over 500M products with filters (category, brand, price) and facet counts, typo tolerance, relevance with business signals, p99 &lt; 200 ms, changes searchable within ~5 s, 99.95% availability.</li><li><strong>Estimates:</strong> 500M docs × 2 KB ≈ 1 TB source; index ≈ 1–1.5× → ~1.5 TB primary, ×3 with two replicas ≈ 4.5 TB; peak 20K QPS; ~30 primary shards of ~50 GB each.</li><li><strong>Core components:</strong> catalog DB (source of truth) → outbox/CDC → Kafka → indexer workers (enrich with price, stock, popularity; bulk API) → search cluster (Elasticsearch/OpenSearch, document-partitioned shards + replicas) behind an index alias; query service (parse, spell-correct, build bool query: <code>must</code> text clauses, cached <code>filter</code> clauses), scatter-gather top-K, re-rank the top ~200 with a learning-to-rank model, cache hot queries; separate autocomplete service; click logs → ranking training pipeline.</li><li><strong>Data model:</strong> mapping with <code>title</code> (text, stemming + synonyms analyzer), <code>title.ngram</code> (partial match), <code>brand</code>/<code>category_path</code> (keyword, for filters and facets), <code>price</code> (scaled float), <code>popularity</code> (rank feature), <code>in_stock</code> (boolean); alias <code>products</code> → <code>products_v17</code>.</li><li><strong>Key trade-offs:</strong> refresh interval (freshness) vs indexing throughput; denormalising price/stock into the index (fast filtering, update churn) vs post-filtering from the DB; BM25 only vs hybrid with embeddings (better semantic recall, more cost and latency); shard count (too many = per-shard overhead and fan-out, too few = cannot grow).</li><li><strong>Bottlenecks:</strong> hot queries (result cache, CDN for anonymous traffic), deep pagination (<code>search_after</code>), analyzer changes (new index + backfill + alias flip), price-update storms (partial updates, separate fast-changing fields), scatter-gather tail latency (adaptive replica selection, per-shard timeouts returning partial results).</li></ul>'
        },
        {
          t: 'Design top-K trending / heavy hitters (e.g. most-viewed videos)',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> top 100 most-viewed videos (or hashtags) over the last 1 min, 1 h and 24 h, globally and per country; refreshed every few seconds; approximate is acceptable for short windows, exact counts needed daily for creator payouts.</li><li><strong>Estimates:</strong> 1M view events/s × ~100 B = 100 MB/s ingest; ~1B distinct videos, so exact per-window counters for all of them do not fit in one node&#39;s memory.</li><li><strong>Core components:</strong> clients → collectors (pre-aggregate locally for a second) → Kafka partitioned by <code>video_id</code> → stream processor (Flink) keeps per-key counts in 1-minute tumbling windows with watermarks for late events → per-partition top-K heap → aggregator merges partial top-Ks → Redis sorted sets for serving; batch path (Spark over the data lake) recomputes exact daily counts.</li><li><strong>Data model:</strong> <code>topk:{window}:{region}</code> ZSET of (video_id, count); per-minute buckets kept as full counts or as a Count-Min Sketch + top-N heap; OLAP table <code>views(video_id, minute, region, count)</code>.</li><li><strong>Key trade-offs:</strong> keyed partitioning makes per-partition top-Ks disjoint, so merging them is exact for one window; but combining per-minute top-Ks into an hourly top-K is <em>approximate</em> (an item ranked 101st every minute can be top-10 for the hour) — keep a larger top-N per bucket or full sketches; exact counts (large state) vs Count-Min Sketch + heap (tiny memory, overestimates); streaming plus batch reconciliation vs streaming only.</li><li><strong>Bottlenecks:</strong> a viral video makes one partition hot (local pre-aggregation, salted keys with two-stage aggregation), late and out-of-order events (watermarks, allowed lateness), bot inflation (dedupe per user/session window), read load (precompute and cache, never compute on request).</li></ul>'
        },
        {
          t: 'Design a ticket booking system (Ticketmaster)',
          d: 'hard',
          type: 'design',
          hint: '<ul><li><strong>Requirements:</strong> browse and search events, view a seat map, hold seats for ~10 min while paying, purchase, never sell a seat twice, fairness during massive on-sales (10M users for 50K seats), 99.99% on the purchase path.</li><li><strong>Estimates:</strong> normal ~1K QPS; an on-sale sends 10M users within minutes → 100K+ RPS on seat-map and hold endpoints for <em>one</em> event; only 50K seats can ever succeed.</li><li><strong>Core components:</strong> event catalog and search (read-heavy, cached, CDN); <strong>virtual waiting room</strong> at the edge (queue tokens, admit users at a rate matched to remaining inventory and backend capacity); seat-map service reading availability from Redis (bitmap per section) with seconds of staleness; booking service creating holds with an atomic conditional update on the seat rows (truth) — optionally a Redis <code>SET NX PX</code> fast path; hold expiry by <code>expires_at</code> with lazy checks plus a sweeper; payment with an idempotency key; on success seats → SOLD and tickets issued via outbox (email, QR code).</li><li><strong>Data model:</strong> <code>seats(event_id, seat_id, status AVAILABLE|HELD|SOLD, hold_id, hold_expires_at, version)</code> PK <code>(event_id, seat_id)</code>; <code>holds(id, user_id, event_id, seat_ids[], expires_at)</code>; <code>orders(id, hold_id UNIQUE, user_id, amount_minor, status, idempotency_key UNIQUE)</code>.</li><li><strong>Key trade-offs:</strong> pessimistic row locks vs conditional updates (<code>UPDATE seats SET status=&#39;HELD&#39; ... WHERE status=&#39;AVAILABLE&#39; OR hold_expires_at &lt; now()</code>, all-or-nothing in one transaction) vs Redis locks (fast, must reconcile with the DB); assigned seating vs general admission (a sharded counter per section with atomic decrement); waiting room order (FIFO vs randomised at the start) vs simplicity; live seat-map updates (SSE) vs polling a cached snapshot.</li><li><strong>Bottlenecks:</strong> the on-sale thundering herd (waiting room, static content at the CDN, per-user/IP rate limits, bot detection), hot rows for one event (partition by section, lock per section), hold-expiry races (conditional updates keyed by <code>hold_id</code>), slow payment providers (hold TTL covers payment; extend once), scalper bots.</li></ul>'
        }
      ],
      interviewFocus: [
        {
          q: 'How do you handle the celebrity (hot user) problem in a news feed?',
          a: '<p>Pure fan-out on write makes one post by a user with 100M followers trigger 100M cache writes, delaying everyone&#39;s feeds. Use a <strong>hybrid</strong>:</p><ul><li>Authors under a follower threshold: fan-out on write to active followers&#39; feed lists.</li><li>Celebrities: no fan-out; their recent posts are cached per celebrity and <strong>pulled and merged at read time</strong> for followers.</li><li>Inactive followers are skipped; their feeds are rebuilt on next login.</li><li>Hot posts themselves are replicated across cache shards and kept in an in-process L1 cache for reads/counters.</li></ul><p>This keeps writes bounded and reads fast (one list read + a few cached celebrity timelines).</p>'
        },
        {
          q: 'In a chat system, how do you guarantee message ordering and no message loss across reconnects?',
          a: '<ul><li><strong>Ordering</strong>: the server assigns a monotonically increasing <em>sequence number per conversation</em> (single writer per conversation, e.g. Kafka partition keyed by conversation ID or a counter in the conversation row). Clients sort by sequence, not by device clocks.</li><li><strong>No loss</strong>: the server persists before acking &quot;sent&quot;; the client retries with a client-generated message ID (idempotent dedup).</li><li><strong>Reconnects</strong>: each device stores the last sequence it has seen per conversation; on reconnect it asks for messages after that cursor (gap fill) before receiving live pushes.</li><li><strong>Receipts</strong>: delivered/read are just more events keyed by sequence (&quot;read up to 1042&quot;), cheap to aggregate.</li></ul>'
        },
        {
          q: 'How would you avoid double-booking a driver (or a seat, or an item) under concurrency?',
          a: '<p>Make the claim an <strong>atomic conditional state transition</strong> on a single authority:</p><ul><li>SQL: <code>UPDATE drivers SET status=\'ASSIGNED\', trip_id=$1 WHERE id=$2 AND status=\'AVAILABLE\'</code>; check rows affected = 1.</li><li>Redis: <code>SET driver:42:lock trip123 NX PX 10000</code> or a Lua CAS; time-bounded so abandoned offers expire.</li><li>Optimistic concurrency with a version column for multi-field updates.</li></ul><p>Then confirm with the driver within a timeout; on decline or timeout release the claim and try the next candidate. Never rely on &quot;check then write&quot; in application memory across instances.</p>'
        },
        {
          q: 'Walk through how a payment system avoids double charging when the PSP call times out.',
          a: '<ol><li>The client sends an <strong>idempotency key</strong>; the payment row is created with that key (unique constraint) before calling the PSP.</li><li>The PSP call carries an idempotency key derived from our payment ID, so a retried request is deduplicated by the PSP too.</li><li>On timeout the payment goes to <strong>UNKNOWN</strong>, not FAILED. A recovery worker queries the PSP for the payment status (or waits for the webhook) and transitions accordingly.</li><li>Webhooks are verified and processed idempotently (dedupe by event ID).</li><li>The ledger is append-only; any discrepancy found by daily <strong>reconciliation</strong> against PSP settlement reports is corrected with reversing entries.</li></ol>'
        },
        {
          q: 'What is a generic checklist you apply at the end of any HLD answer?',
          a: '<ul><li><strong>Bottlenecks</strong>: which component saturates first at 10× load? Hot keys/partitions?</li><li><strong>Failure modes</strong>: node, AZ, region, dependency outages; retries, timeouts, idempotency; data loss windows (RPO).</li><li><strong>Consistency</strong>: where eventual consistency is visible to users and how it is mitigated.</li><li><strong>Scaling path</strong>: sharding keys, caching layers, async pipelines.</li><li><strong>Observability</strong>: SLIs, dashboards, alerts, tracing.</li><li><strong>Security/privacy</strong>: authN/Z, encryption, PII, abuse/rate limiting.</li><li><strong>Cost</strong>: storage tiers, CDN egress, compute hot spots.</li></ul>'
        },
        {
          q: 'How would you keep a search index consistent with the primary database, and what freshness can you promise?',
          a: '<ul><li>The database is the source of truth; the index is a derived view. Changes flow through a transactional outbox or CDC (Debezium) into Kafka, keyed by document ID so updates to one document stay ordered.</li><li>Indexer workers consume, enrich (price, stock, popularity) and write with the bulk API; writes are idempotent upserts carrying the source version (external versioning), so replays and out-of-order deliveries cannot overwrite newer data.</li><li>Freshness = CDC lag + consumer lag + refresh interval (~1 s): typically a few seconds, so promise near-real-time and monitor end-to-end lag as an SLI. For read-your-writes in the UI, show the just-saved entity from the write response rather than from search.</li><li>Full rebuilds (mapping or analyzer changes) go to a new index version while live updates are dual-written, then an alias flips atomically.</li><li>A periodic reconciliation job compares counts or checksums per partition and repairs drift.</li></ul>'
        }
      ],
      quiz: [
        { q: 'How many bits does Snowflake use for timestamp, worker and sequence?', a: '41 bits timestamp (ms), 10 bits worker, 12 bits sequence (plus 1 unused sign bit).' },
        { q: 'Why is UUIDv7 better than UUIDv4 as a database primary key?', a: 'It is time-ordered, so inserts append to the B-tree instead of scattering, improving locality and reducing page splits.' },
        { q: 'When is fan-out on read preferable?', a: 'For authors with huge follower counts (celebrities) and for inactive readers.' },
        { q: 'Why query neighbouring geohash cells?', a: 'Nearby points just across a cell boundary can have different prefixes; searching the 8 neighbours avoids missing them.' },
        { q: 'SSE or WebSockets for a live sports score page?', a: 'SSE: traffic is server-to-client only, works over plain HTTP and auto-reconnects.' },
        { q: 'How should clients upload large files to object storage?', a: 'Directly via pre-signed URLs, using multipart upload for large files, not through the API servers.' },
        { q: 'Why should money be stored as integer minor units?', a: 'Floating point cannot represent decimal amounts exactly, causing rounding errors.' },
        { q: 'What is a URL frontier in a web crawler?', a: 'The prioritised, politeness-aware queue structure of URLs waiting to be fetched.' },
        { q: 'What is an inverted index?', a: 'A map from each term to a postings list of the documents (with frequencies and positions) that contain it; queries intersect or union these lists.' },
        { q: 'What error can a Bloom filter make?', a: 'False positives only: it may say an element is present when it is not, but never misses an element that was added.' }
      ],
      resources: [
        { title: 'System Design Primer — Solutions to system design questions', url: 'https://github.com/donnemartin/system-design-primer#system-design-interview-questions-with-solutions', type: 'course' },
        { title: 'RFC 9562 — UUIDs (including UUIDv7)', url: 'https://www.rfc-editor.org/rfc/rfc9562', type: 'docs' },
        { title: 'H3 — Uber hexagonal hierarchical geospatial index', url: 'https://h3geo.org/docs/', type: 'docs' },
        { title: 'Discord — How Discord stores trillions of messages', url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', type: 'article' }
      ]
    },
    // ───────────────────────────── Module 10 ─────────────────────────────
    {
      n: 10,
      title: 'LLD Fundamentals',
      summary: 'Low-level design in idiomatic Go: how OOP ideas map to packages, embedding and interfaces, SOLID with Go examples, just-enough UML, the design patterns that matter (creational, structural, behavioral) and concurrency concerns that LLD interviewers probe.',
      topics: [
        {
          title: 'OOP Concepts Mapped to Go',
          def: '<p>Go is object-oriented without classes or inheritance. Interviewers expect you to express OOP designs idiomatically rather than emulate Java.</p>' +
            '<table><thead><tr><th>OOP concept</th><th>Go mechanism</th><th>Notes</th></tr></thead><tbody>' +
            '<tr><td>Class</td><td><code>struct</code> + methods (value or pointer receivers)</td><td>Pointer receivers when mutating or the struct is large; be consistent per type</td></tr>' +
            '<tr><td><strong>Encapsulation</strong></td><td>Package-level visibility: <code>Exported</code> vs <code>unexported</code> identifiers</td><td>The <em>package</em> is the unit of encapsulation, not the type; expose constructors (<code>NewX</code>) that enforce invariants</td></tr>' +
            '<tr><td><strong>Inheritance</strong></td><td>None — use <strong>composition</strong> and <strong>struct embedding</strong></td><td>Embedding promotes methods (&quot;has-a&quot; with delegation sugar), but there is no virtual dispatch back to the outer type</td></tr>' +
            '<tr><td><strong>Polymorphism</strong></td><td><strong>Interfaces</strong>, satisfied implicitly</td><td>Small interfaces (<code>io.Reader</code>), defined where they are consumed</td></tr>' +
            '<tr><td>Abstract class</td><td>Interface + embedded helper struct for shared code</td><td>Or pass behaviour as function values</td></tr>' +
            '<tr><td>Generics</td><td>Type parameters (Go 1.18+)</td><td>For containers/algorithms; prefer interfaces for behaviour</td></tr>' +
            '<tr><td>Enum</td><td>Typed constants with <code>iota</code> + <code>String()</code></td><td>Validate at boundaries; no exhaustive switch checks by the compiler</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Idioms that show seniority:</strong> &quot;accept interfaces, return structs&quot;; keep interfaces to 1–3 methods; make the zero value useful (<code>sync.Mutex</code>, <code>bytes.Buffer</code>); avoid getters/setters unless they protect invariants; embed to reuse but never to fake an &quot;is-a&quot; hierarchy; errors are values, returned not thrown.</p>',
          interview: 'If asked "how do you do inheritance in Go?", answer: you do not — you compose. Show embedding for reuse and interfaces for polymorphism, and explain that embedding does not give virtual dispatch (a method on the embedded type cannot call the outer type\'s override).',
          examples: [{
            label: 'Encapsulation, embedding and interface polymorphism',
            lang: 'go',
            code: [
              'package main',
              '',
              'import "fmt"',
              '',
              '// Shape is a small, consumer-defined interface.',
              'type Shape interface {',
              '    Area() float64',
              '}',
              '',
              '// base holds shared state; unexported fields are encapsulated in the package.',
              'type base struct{ name string }',
              '',
              'func (b base) Name() string { return b.name }',
              '',
              'type Rect struct {',
              '    base // embedding: Rect gets Name() promoted',
              '    w, h float64',
              '}',
              '',
              'func NewRect(w, h float64) (*Rect, error) { // constructor enforces invariants',
              '    if w <= 0 || h <= 0 {',
              '        return nil, fmt.Errorf("invalid size %vx%v", w, h)',
              '    }',
              '    return &Rect{base: base{name: "rect"}, w: w, h: h}, nil',
              '}',
              '',
              'func (r *Rect) Area() float64 { return r.w * r.h }',
              '',
              'type Circle struct {',
              '    base',
              '    r float64',
              '}',
              '',
              'func (c Circle) Area() float64 { return 3.14159 * c.r * c.r }',
              '',
              'func main() {',
              '    r, _ := NewRect(2, 3)',
              '    shapes := []Shape{r, Circle{base{"circle"}, 1}} // implicit satisfaction',
              '    for _, s := range shapes {',
              '        fmt.Printf("%.2f\\n", s.Area())',
              '    }',
              '    fmt.Println(r.Name()) // promoted from base',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'SOLID Principles in Go',
          def: '<table><thead><tr><th>Principle</th><th>Meaning</th><th>Go expression</th></tr></thead><tbody>' +
            '<tr><td><strong>S</strong>ingle Responsibility</td><td>A module has one reason to change</td><td>Small, focused packages and types (<code>OrderRepository</code> vs <code>OrderPricing</code>); avoid <code>utils</code>/<code>common</code> grab-bags</td></tr>' +
            '<tr><td><strong>O</strong>pen/Closed</td><td>Open for extension, closed for modification</td><td>Add behaviour by adding a new type that satisfies an interface (new <code>PaymentMethod</code>) rather than editing a growing <code>switch</code></td></tr>' +
            '<tr><td><strong>L</strong>iskov Substitution</td><td>Implementations must honour the interface&#39;s contract</td><td>Every <code>io.Writer</code> must respect write semantics; do not return <code>nil, nil</code> where callers expect an error; do not panic on methods the interface implies</td></tr>' +
            '<tr><td><strong>I</strong>nterface Segregation</td><td>Clients should not depend on methods they do not use</td><td>Tiny interfaces (<code>io.Reader</code>, <code>io.Closer</code>) composed as needed (<code>io.ReadCloser</code>); define interfaces at the consumer</td></tr>' +
            '<tr><td><strong>D</strong>ependency Inversion</td><td>High-level policy depends on abstractions, not concrete details</td><td>Services take interfaces in constructors (<code>NewCheckout(repo OrderStore, pay Payer)</code>); wire concretes in <code>main</code></td></tr>' +
            '</tbody></table>' +
            '<p><strong>Why this matters for you:</strong> DIP plus small interfaces is what makes Go code <em>testable</em> — you can inject fakes for the database, clock, or HTTP client without mocking frameworks. That is a strong talking point with a QA automation background.</p>' +
            '<p><strong>Caveat:</strong> do not create interfaces preemptively for every struct (&quot;interface pollution&quot;). In Go, introduce an interface when there are two implementations or a consumer needs to substitute one (tests count).</p>',
          interview: 'Expect "give a Go example of each SOLID principle" or a code snippet to critique. Tie OCP to interfaces replacing switches, ISP to io.Reader-style small interfaces, and DIP to constructor injection that enables fakes in tests.',
          examples: [{
            label: 'Dependency inversion + interface segregation',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "errors"',
              '    "fmt"',
              '    "time"',
              ')',
              '',
              '// Consumer-defined, minimal interfaces (ISP).',
              'type Sender interface {',
              '    Send(to, msg string) error',
              '}',
              '',
              'type Clock interface{ Now() time.Time }',
              '',
              '// Reminder is high-level policy; it depends only on abstractions (DIP).',
              'type Reminder struct {',
              '    sender Sender',
              '    clock  Clock',
              '}',
              '',
              'func NewReminder(s Sender, c Clock) *Reminder { return &Reminder{sender: s, clock: c} }',
              '',
              'func (r *Reminder) Remind(user string, due time.Time) error {',
              '    if r.clock.Now().After(due) {',
              '        return errors.New("already overdue")',
              '    }',
              '    return r.sender.Send(user, "due at "+due.Format(time.Kitchen))',
              '}',
              '',
              '// Concrete details, swappable without touching Reminder (OCP).',
              'type EmailSender struct{}',
              '',
              'func (EmailSender) Send(to, msg string) error { fmt.Println("email", to, msg); return nil }',
              '',
              'type realClock struct{}',
              '',
              'func (realClock) Now() time.Time { return time.Now() }',
              '',
              '// In tests: a fake clock and a recording sender, no mocking library needed.',
              'type fakeSender struct{ sent []string }',
              '',
              'func (f *fakeSender) Send(to, msg string) error { f.sent = append(f.sent, to); return nil }',
              '',
              'func main() {',
              '    r := NewReminder(EmailSender{}, realClock{})',
              '    _ = r.Remind("ana@example.com", time.Now().Add(time.Hour))',
              '',
              '    fs := &fakeSender{}',
              '    _ = NewReminder(fs, realClock{}).Remind("bob", time.Now().Add(time.Minute))',
              '    fmt.Println(len(fs.sent)) // 1',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'UML Basics: Class & Sequence Diagrams (ASCII)',
          def: '<p>In LLD interviews you sketch just enough UML to communicate entities, relationships and interactions — usually as boxes and arrows on a whiteboard or in plain text.</p>' +
            '<p><strong>Class diagram relationships:</strong></p>' +
            '<table><thead><tr><th>Relationship</th><th>Notation</th><th>Meaning</th><th>Go mapping</th></tr></thead><tbody>' +
            '<tr><td>Association</td><td><code>A ---- B</code></td><td>A uses/knows B</td><td>Field or parameter of type B</td></tr>' +
            '<tr><td>Aggregation</td><td><code>A o--- B</code></td><td>A has B; B can exist independently</td><td>Field holding a pointer/ID to a shared B (Team has Players)</td></tr>' +
            '<tr><td>Composition</td><td><code>A *--- B</code></td><td>A owns B; B&#39;s lifecycle bound to A</td><td>A creates and exclusively holds B (Order owns LineItems)</td></tr>' +
            '<tr><td>Realization</td><td><code>A ..|&gt; I</code></td><td>A implements interface I</td><td>Implicit interface satisfaction</td></tr>' +
            '<tr><td>Inheritance</td><td><code>A --|&gt; B</code></td><td>A is-a B</td><td>Not in Go; use embedding/interfaces</td></tr>' +
            '<tr><td>Dependency</td><td><code>A ..&gt; B</code></td><td>A temporarily uses B</td><td>Function parameter/local variable</td></tr>' +
            '</tbody></table>' +
            '<p>Add <strong>multiplicity</strong> (<code>1</code>, <code>0..1</code>, <code>*</code>, <code>1..*</code>) on association ends, and visibility (<code>+</code> public, <code>-</code> private) on members.</p>' +
            '<p><strong>Sequence diagrams</strong> show the order of calls between objects for one use case (e.g. &quot;park a car&quot;): lifelines left to right, messages top to bottom, return values dashed. They are the best way to validate that your classes can actually carry out a flow and to reveal where concurrency control is needed.</p>' +
            '<p>Interview tip: draw the class diagram for core entities first (5–8 classes), then one sequence diagram for the most important flow.</p>',
          interview: 'Do not spend more than a few minutes on notation — clarity beats UML purity. Interviewers want correct relationships (composition vs aggregation), multiplicities, and one sequence diagram proving the main flow works.',
          examples: [{
            label: 'ASCII class + sequence diagram (parking lot)',
            lang: 'text',
            code: [
              'CLASS DIAGRAM',
              '+----------------+ 1     1..* +--------------+ 1    * +----------------+',
              '| ParkingLot     |*-----------| Level        |*-------| Spot           |',
              '| -levels        |            | -spots       |        | -id, -size     |',
              '| +Park(v) Ticket|            | +FindSpot(v) |        | -vehicle *Veh  |',
              '+----------------+            +--------------+        +----------------+',
              '        |                                                     o',
              '        | uses                                                | 0..1',
              '        v                                              +-------------+',
              '  <<interface>> PricingStrategy                         | Vehicle     |',
              '    +Fee(duration) Money   <|.. HourlyPricing           | -plate,-size|',
              '                                                        +-------------+',
              'SEQUENCE: Park(vehicle)',
              'Client      ParkingLot        Level           Spot',
              '  |--Park(v)--->|                |               |',
              '  |             |--FindSpot(v)-->|               |',
              '  |             |                |--TryOccupy(v)>|  (atomic)',
              '  |             |                |<----ok--------|',
              '  |             |<----spot-------|               |',
              '  |<--Ticket----|                |               |'
            ].join('\n')
          }]
        },
        {
          title: 'Creational Patterns: Factory, Builder, Singleton, Functional Options',
          def: '<table><thead><tr><th>Pattern</th><th>Intent</th><th>Idiomatic Go</th></tr></thead><tbody>' +
            '<tr><td><strong>Factory (function)</strong></td><td>Hide construction and choose an implementation</td><td><code>NewStorage(kind string) (Storage, error)</code> returning an interface; or a registry <code>map[string]func() Storage</code> populated in <code>init</code>/main (like <code>database/sql</code> drivers)</td></tr>' +
            '<tr><td><strong>Builder</strong></td><td>Construct complex objects step by step with validation</td><td>Fluent methods returning the builder plus <code>Build() (T, error)</code>; useful for query/request builders and test data builders</td></tr>' +
            '<tr><td><strong>Singleton</strong></td><td>One shared instance</td><td><code>sync.Once</code> (or <code>sync.OnceValue</code>, Go 1.21+) for lazy, thread-safe init — but prefer explicit dependency injection; global singletons hurt testability and hide dependencies</td></tr>' +
            '<tr><td><strong>Functional options</strong></td><td>Optional configuration with good defaults and backward-compatible APIs</td><td><code>NewServer(addr string, opts ...Option)</code> where <code>type Option func(*Server)</code>; used widely (gRPC, Zap-style loggers)</td></tr>' +
            '<tr><td>Prototype / Object pool</td><td>Clone / reuse expensive objects</td><td><code>sync.Pool</code> for temporary buffers (not for connections)</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Choosing:</strong> functional options for a public constructor with many optional knobs; a builder when construction is multi-step or needs cross-field validation; a factory when callers should not know the concrete type; avoid singletons except for truly process-wide resources (and even then, pass them explicitly).</p>',
          interview: 'Functional options are the Go-specific pattern interviewers most often ask to see. Also be ready to implement a thread-safe singleton with sync.Once and explain why you would usually inject the dependency instead.',
          examples: [{
            label: 'Functional options and a sync.Once singleton',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "fmt"',
              '    "sync"',
              '    "time"',
              ')',
              '',
              'type Server struct {',
              '    addr        string',
              '    readTimeout time.Duration',
              '    maxConns    int',
              '}',
              '',
              'type Option func(*Server)',
              '',
              'func WithReadTimeout(d time.Duration) Option { return func(s *Server) { s.readTimeout = d } }',
              'func WithMaxConns(n int) Option              { return func(s *Server) { s.maxConns = n } }',
              '',
              'func NewServer(addr string, opts ...Option) *Server {',
              '    s := &Server{addr: addr, readTimeout: 5 * time.Second, maxConns: 100} // defaults',
              '    for _, o := range opts {',
              '        o(s)',
              '    }',
              '    return s',
              '}',
              '',
              '// Lazy, thread-safe singleton (use sparingly).',
              'var getConfig = sync.OnceValue(func() map[string]string {',
              '    fmt.Println("loading config once")',
              '    return map[string]string{"env": "prod"}',
              '})',
              '',
              'func main() {',
              '    s := NewServer(":8080", WithMaxConns(500))',
              '    fmt.Printf("%+v\\n", *s)',
              '    fmt.Println(getConfig()["env"], getConfig()["env"]) // loads once',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Structural & Behavioral Patterns',
          def: '<p><strong>Structural</strong> patterns compose objects; <strong>behavioral</strong> patterns distribute responsibilities and communication.</p>' +
            '<table><thead><tr><th>Pattern</th><th>Intent</th><th>Go idiom / example</th></tr></thead><tbody>' +
            '<tr><td><strong>Adapter</strong></td><td>Make an incompatible API fit an expected interface</td><td>Wrap a vendor SDK to satisfy your <code>PaymentGateway</code> interface; <code>http.HandlerFunc</code> adapts a function to <code>http.Handler</code></td></tr>' +
            '<tr><td><strong>Decorator</strong></td><td>Add behaviour without changing the wrapped object</td><td>HTTP middleware <code>func(http.Handler) http.Handler</code>; <code>bufio.NewReader(r)</code>; caching/logging/metrics wrappers around a repository interface</td></tr>' +
            '<tr><td><strong>Facade</strong></td><td>Simple API over a complex subsystem</td><td>A <code>Checkout</code> service orchestrating inventory, pricing, payments</td></tr>' +
            '<tr><td><strong>Proxy</strong></td><td>Control access to an object (lazy, remote, protective, caching)</td><td>gRPC client stubs, <code>httputil.ReverseProxy</code>, a rate-limited client wrapper</td></tr>' +
            '<tr><td><strong>Strategy</strong></td><td>Swap algorithms at runtime</td><td>Interface or <code>func</code> type: pricing, eviction policy, load-balancing algorithm</td></tr>' +
            '<tr><td><strong>Observer</strong></td><td>Notify subscribers of events</td><td>Callback registry or channels per subscriber; beware slow subscribers (buffer/drop)</td></tr>' +
            '<tr><td><strong>State</strong></td><td>Behaviour changes with internal state</td><td>Each state a type implementing the same interface (vending machine, order lifecycle)</td></tr>' +
            '<tr><td><strong>Command</strong></td><td>Encapsulate a request as an object</td><td><code>Execute()/Undo()</code> for undo/redo, job queues, macro recording</td></tr>' +
            '<tr><td><strong>Chain of responsibility</strong></td><td>Pass a request along handlers until handled</td><td>Middleware chains, validation pipelines, approval workflows, logger levels</td></tr>' +
            '<tr><td>Template method / Iterator</td><td>Fixed algorithm skeleton / traversal</td><td>Function parameters for hooks; Go 1.23 range-over-func iterators (<code>iter.Seq</code>)</td></tr>' +
            '</tbody></table>' +
            '<p>Decorator vs proxy: both wrap the same interface; a decorator <em>adds behaviour</em>, a proxy <em>controls access</em>. Adapter changes the interface; facade simplifies many interfaces into one.</p>',
          interview: 'Name the pattern only after describing the problem it solves. Go favours function types over single-method interfaces for strategies and decorators; showing HTTP middleware as the decorator/chain-of-responsibility pattern lands well.',
          examples: [{
            label: 'Strategy (func type) + Decorator (wrapping an interface)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "fmt"',
              '    "time"',
              ')',
              '',
              '// Strategy as a function type.',
              'type PricingStrategy func(minutes int) int',
              '',
              'func Hourly(rate int) PricingStrategy {',
              '    return func(m int) int { return ((m + 59) / 60) * rate }',
              '}',
              '',
              'func FlatDaily(price int) PricingStrategy { return func(int) int { return price } }',
              '',
              '// Decorator: same interface, extra behaviour.',
              'type Store interface {',
              '    Get(key string) (string, error)',
              '}',
              '',
              'type dbStore struct{}',
              '',
              'func (dbStore) Get(key string) (string, error) { return "value-of-" + key, nil }',
              '',
              'type timedStore struct{ next Store }',
              '',
              'func (t timedStore) Get(key string) (string, error) {',
              '    start := time.Now()',
              '    v, err := t.next.Get(key)',
              '    fmt.Printf("Get(%s) took %s\\n", key, time.Since(start))',
              '    return v, err',
              '}',
              '',
              'func main() {',
              '    for _, s := range []PricingStrategy{Hourly(50), FlatDaily(300)} {',
              '        fmt.Println(s(130)) // 150, 300',
              '    }',
              '    var st Store = timedStore{next: dbStore{}}',
              '    v, _ := st.Get("user:1")',
              '    fmt.Println(v)',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Concurrency Considerations in LLD',
          def: '<p>Most LLD problems (parking lot, booking, rate limiter, cache) become interesting when multiple goroutines act at once. State your concurrency model explicitly.</p>' +
            '<table><thead><tr><th>Tool</th><th>Use for</th><th>Watch out</th></tr></thead><tbody>' +
            '<tr><td><code>sync.Mutex</code></td><td>Protecting shared state with short critical sections</td><td>Never hold while doing I/O or calling user callbacks</td></tr>' +
            '<tr><td><code>sync.RWMutex</code></td><td>Read-heavy state</td><td>Writer starvation is not an issue in Go, but RWMutex is slower than Mutex under low contention</td></tr>' +
            '<tr><td><code>sync/atomic</code></td><td>Counters, flags, pointers swapped wholesale</td><td>Only for single-word state; compound invariants need locks</td></tr>' +
            '<tr><td>Channels</td><td>Ownership transfer, pipelines, worker pools, signalling</td><td>Unbuffered vs buffered semantics, goroutine leaks, closing rules (only sender closes)</td></tr>' +
            '<tr><td>Actor / single owner goroutine</td><td>Serialising all mutations of an aggregate</td><td>Throughput limited to one goroutine; need request/response channels</td></tr>' +
            '<tr><td><code>context.Context</code></td><td>Cancellation and deadlines</td><td>Pass as first parameter; do not store in structs</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Design guidance:</strong></p>' +
            '<ul><li><strong>Lock granularity</strong>: one global lock is simple and correct; per-entity locks (per spot, per show, per account) increase throughput. Start simple, then refine where contention is real.</li>' +
            '<li><strong>Deadlock avoidance</strong>: acquire multiple locks in a consistent global order (e.g. by ID), or avoid holding more than one.</li>' +
            '<li><strong>Check-then-act</strong> must be atomic: &quot;if seat free then book&quot; inside one critical section or a CAS/conditional DB update.</li>' +
            '<li><strong>Optimistic vs pessimistic</strong>: version numbers + retry for low contention; locks/holds with TTL for high contention (seat holds).</li>' +
            '<li>Verify with <code>go test -race</code> and concurrent tests that hammer the API — a natural QA strength to highlight.</li></ul>',
          interview: 'Interviewers will ask "what happens if two users do X at the same time?". Identify the shared state, show the critical section, discuss lock granularity and ordering, and mention running tests with the race detector.',
          examples: [{
            label: 'Per-account locks with consistent ordering (deadlock-free transfer)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "errors"',
              '    "fmt"',
              '    "sync"',
              ')',
              '',
              'type Account struct {',
              '    ID      int',
              '    mu      sync.Mutex',
              '    balance int64',
              '}',
              '',
              'var ErrInsufficient = errors.New("insufficient funds")',
              '',
              '// Transfer locks both accounts in ID order so concurrent A->B and B->A cannot deadlock.',
              'func Transfer(from, to *Account, amount int64) error {',
              '    if from.ID == to.ID {',
              '        return errors.New("same account")',
              '    }',
              '    first, second := from, to',
              '    if second.ID < first.ID {',
              '        first, second = second, first',
              '    }',
              '    first.mu.Lock()',
              '    defer first.mu.Unlock()',
              '    second.mu.Lock()',
              '    defer second.mu.Unlock()',
              '    if from.balance < amount { // check-then-act inside the critical section',
              '        return ErrInsufficient',
              '    }',
              '    from.balance -= amount',
              '    to.balance += amount',
              '    return nil',
              '}',
              '',
              'func main() {',
              '    a, b := &Account{ID: 1, balance: 1000}, &Account{ID: 2, balance: 1000}',
              '    var wg sync.WaitGroup',
              '    for i := 0; i < 100; i++ {',
              '        wg.Add(2)',
              '        go func() { defer wg.Done(); _ = Transfer(a, b, 5) }()',
              '        go func() { defer wg.Done(); _ = Transfer(b, a, 5) }()',
              '    }',
              '    wg.Wait()',
              '    fmt.Println(a.balance + b.balance) // always 2000',
              '}'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'Map the four OOP pillars to Go',
          d: 'easy',
          type: 'concept',
          hint: '<ul><li><strong>Encapsulation:</strong> unexported fields + package boundary + constructors enforcing invariants.</li><li><strong>Abstraction:</strong> interfaces describing behaviour; hide implementation in unexported types.</li><li><strong>Inheritance:</strong> replaced by composition/embedding; explain promoted methods and lack of virtual dispatch.</li><li><strong>Polymorphism:</strong> implicit interface satisfaction; type switches only at boundaries.</li></ul>'
        },
        {
          t: 'Functional options for an HTTP client wrapper',
          d: 'easy',
          type: 'coding',
          hint: '<ul><li><code>type Option func(*Client) error</code> lets options validate input.</li><li>Apply defaults first, then options in order.</li><li>Return an error from the constructor if any option fails.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "errors"',
            '    "fmt"',
            '    "net/http"',
            '    "time"',
            ')',
            '',
            'type Client struct {',
            '    baseURL string',
            '    retries int',
            '    http    *http.Client',
            '}',
            '',
            'type Option func(*Client) error',
            '',
            'func WithRetries(n int) Option {',
            '    return func(c *Client) error {',
            '        if n < 0 || n > 10 {',
            '            return errors.New("retries must be 0..10")',
            '        }',
            '        c.retries = n',
            '        return nil',
            '    }',
            '}',
            '',
            'func WithTimeout(d time.Duration) Option {',
            '    return func(c *Client) error {',
            '        c.http.Timeout = d',
            '        return nil',
            '    }',
            '}',
            '',
            'func NewClient(baseURL string, opts ...Option) (*Client, error) {',
            '    c := &Client{baseURL: baseURL, retries: 2, http: &http.Client{Timeout: 3 * time.Second}}',
            '    for _, o := range opts {',
            '        if err := o(c); err != nil {',
            '            return nil, err',
            '        }',
            '    }',
            '    return c, nil',
            '}',
            '',
            'func main() {',
            '    c, err := NewClient("https://api.example.com", WithRetries(3), WithTimeout(time.Second))',
            '    fmt.Println(c.retries, c.http.Timeout, err)',
            '    _, err = NewClient("x", WithRetries(99))',
            '    fmt.Println(err)',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Spot the SOLID violations',
          d: 'easy',
          type: 'concept',
          hint: '<p>Given a <code>ReportService</code> that queries Postgres directly, formats PDF and CSV via a <code>switch format</code>, emails results via SMTP, and exposes a 15-method interface used by three callers:</p><ul><li><strong>SRP:</strong> data access, formatting and delivery are three reasons to change → split.</li><li><strong>OCP:</strong> the format <code>switch</code> must be edited for each new format → <code>Formatter</code> interface.</li><li><strong>ISP:</strong> callers depend on 15 methods they mostly do not use → small consumer-side interfaces.</li><li><strong>DIP:</strong> concrete Postgres/SMTP dependencies → inject <code>ReportStore</code> and <code>Sender</code> interfaces; enables unit tests with fakes.</li><li><strong>LSP:</strong> check any implementation that panics on &quot;unsupported&quot; methods.</li></ul>'
        },
        {
          t: 'Replace a type switch with the Strategy pattern',
          d: 'easy',
          type: 'coding',
          hint: '<ul><li>Before: <code>switch method { case &quot;card&quot;: ... case &quot;upi&quot;: ... }</code> in every function.</li><li>After: <code>PaymentMethod</code> interface with <code>Pay(amount)</code>; a registry maps names to implementations.</li><li>Adding a method = adding a type + registering it (OCP).</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            ')',
            '',
            'type PaymentMethod interface {',
            '    Pay(amountMinor int64) (string, error)',
            '}',
            '',
            'type Card struct{ Last4 string }',
            '',
            'func (c Card) Pay(a int64) (string, error) {',
            '    return fmt.Sprintf("card *%s charged %d", c.Last4, a), nil',
            '}',
            '',
            'type UPI struct{ VPA string }',
            '',
            'func (u UPI) Pay(a int64) (string, error) { return fmt.Sprintf("upi %s debited %d", u.VPA, a), nil }',
            '',
            'type Checkout struct{ methods map[string]PaymentMethod }',
            '',
            'func (c *Checkout) Register(name string, m PaymentMethod) { c.methods[name] = m }',
            '',
            'func (c *Checkout) Pay(name string, amount int64) (string, error) {',
            '    m, ok := c.methods[name]',
            '    if !ok {',
            '        return "", fmt.Errorf("unsupported payment method %q", name)',
            '    }',
            '    return m.Pay(amount)',
            '}',
            '',
            'func main() {',
            '    c := &Checkout{methods: map[string]PaymentMethod{}}',
            '    c.Register("card", Card{Last4: "4242"})',
            '    c.Register("upi", UPI{VPA: "ana@bank"})',
            '    for _, m := range []string{"card", "upi", "cash"} {',
            '        fmt.Println(c.Pay(m, 1999))',
            '    }',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Singleton in Go — implement it, then argue against it',
          d: 'medium',
          type: 'concept',
          hint: '<ul><li>Implementation: package-level <code>sync.Once</code> / <code>sync.OnceValue</code> for lazy, race-free init (double-checked locking by hand is error-prone).</li><li>Problems: hidden global dependency, hard to substitute in tests, init order surprises, shared mutable state across tests.</li><li>Prefer: construct once in <code>main</code> and inject (DIP). Acceptable singletons: truly immutable process-wide data, or wrappers around inherently global resources.</li></ul>'
        },
        {
          t: 'Composable middleware chain (Decorator + Chain of Responsibility)',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li><code>type Middleware func(http.Handler) http.Handler</code>.</li><li><code>Chain(h, m1, m2, m3)</code> should execute m1 → m2 → m3 → h (apply in reverse).</li><li>A middleware may short-circuit (auth failure) — the chain-of-responsibility aspect.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "net/http"',
            '    "net/http/httptest"',
            ')',
            '',
            'type Middleware func(http.Handler) http.Handler',
            '',
            'func Chain(h http.Handler, mws ...Middleware) http.Handler {',
            '    for i := len(mws) - 1; i >= 0; i-- {',
            '        h = mws[i](h)',
            '    }',
            '    return h',
            '}',
            '',
            'func Logging(next http.Handler) http.Handler {',
            '    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
            '        fmt.Println("->", r.Method, r.URL.Path)',
            '        next.ServeHTTP(w, r)',
            '    })',
            '}',
            '',
            'func Auth(next http.Handler) http.Handler {',
            '    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
            '        if r.Header.Get("Authorization") == "" {',
            '            http.Error(w, "unauthorized", http.StatusUnauthorized) // short-circuit',
            '            return',
            '        }',
            '        next.ServeHTTP(w, r)',
            '    })',
            '}',
            '',
            'func main() {',
            '    hello := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { fmt.Fprint(w, "hello") })',
            '    h := Chain(hello, Logging, Auth)',
            '',
            '    rec := httptest.NewRecorder()',
            '    h.ServeHTTP(rec, httptest.NewRequest("GET", "/x", nil))',
            '    fmt.Println(rec.Code) // 401',
            '',
            '    req := httptest.NewRequest("GET", "/x", nil)',
            '    req.Header.Set("Authorization", "Bearer t")',
            '    rec = httptest.NewRecorder()',
            '    h.ServeHTTP(rec, req)',
            '    fmt.Println(rec.Code, rec.Body.String()) // 200 hello',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Concurrent-safe event bus (Observer)',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li>Topics map to subscriber channels; guard the map with <code>sync.RWMutex</code>.</li><li>Publish must not block on a slow subscriber: buffered channels + drop (or count drops) when full.</li><li><code>Subscribe</code> returns an unsubscribe func that removes and closes the channel exactly once.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "sync"',
            ')',
            '',
            'type Event struct {',
            '    Topic string',
            '    Data  any',
            '}',
            '',
            'type Bus struct {',
            '    mu   sync.RWMutex',
            '    subs map[string]map[chan Event]struct{}',
            '}',
            '',
            'func NewBus() *Bus { return &Bus{subs: map[string]map[chan Event]struct{}{}} }',
            '',
            'func (b *Bus) Subscribe(topic string, buf int) (<-chan Event, func()) {',
            '    ch := make(chan Event, buf)',
            '    b.mu.Lock()',
            '    if b.subs[topic] == nil {',
            '        b.subs[topic] = map[chan Event]struct{}{}',
            '    }',
            '    b.subs[topic][ch] = struct{}{}',
            '    b.mu.Unlock()',
            '    var once sync.Once',
            '    return ch, func() {',
            '        once.Do(func() {',
            '            b.mu.Lock()',
            '            delete(b.subs[topic], ch)',
            '            b.mu.Unlock()',
            '            close(ch)',
            '        })',
            '    }',
            '}',
            '',
            '// Publish returns how many subscribers missed the event (slow consumers).',
            'func (b *Bus) Publish(e Event) (dropped int) {',
            '    b.mu.RLock()',
            '    defer b.mu.RUnlock()',
            '    for ch := range b.subs[e.Topic] {',
            '        select {',
            '        case ch <- e:',
            '        default:',
            '            dropped++',
            '        }',
            '    }',
            '    return dropped',
            '}',
            '',
            'func main() {',
            '    bus := NewBus()',
            '    ch, unsub := bus.Subscribe("order.created", 8)',
            '    bus.Publish(Event{Topic: "order.created", Data: 42})',
            '    fmt.Println((<-ch).Data)',
            '    unsub()',
            '    fmt.Println(bus.Publish(Event{Topic: "order.created", Data: 43})) // 0 subscribers',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Text editor with undo/redo (Command pattern)',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li><code>Command</code> interface with <code>Do(*Doc)</code> and <code>Undo(*Doc)</code>.</li><li>Two stacks: executing a new command pushes onto undo and clears redo; undo pops to redo and vice versa.</li><li>Commands store the data needed to reverse themselves (e.g. deleted text).</li></ul>',
          solution: [
            'package main',
            '',
            'import "fmt"',
            '',
            'type Doc struct{ text []rune }',
            '',
            'type Command interface {',
            '    Do(d *Doc)',
            '    Undo(d *Doc)',
            '}',
            '',
            'type Insert struct {',
            '    Pos  int',
            '    Text string',
            '}',
            '',
            'func (c Insert) Do(d *Doc) {',
            '    r := []rune(c.Text)',
            '    d.text = append(d.text[:c.Pos], append(r, d.text[c.Pos:]...)...)',
            '}',
            '',
            'func (c Insert) Undo(d *Doc) {',
            '    n := len([]rune(c.Text))',
            '    d.text = append(d.text[:c.Pos], d.text[c.Pos+n:]...)',
            '}',
            '',
            'type Delete struct {',
            '    Pos, N  int',
            '    removed []rune // captured on Do for Undo',
            '}',
            '',
            'func (c *Delete) Do(d *Doc) {',
            '    c.removed = append([]rune(nil), d.text[c.Pos:c.Pos+c.N]...)',
            '    d.text = append(d.text[:c.Pos], d.text[c.Pos+c.N:]...)',
            '}',
            '',
            'func (c *Delete) Undo(d *Doc) {',
            '    d.text = append(d.text[:c.Pos], append(c.removed, d.text[c.Pos:]...)...)',
            '}',
            '',
            'type Editor struct {',
            '    doc        Doc',
            '    undo, redo []Command',
            '}',
            '',
            'func (e *Editor) Exec(c Command) {',
            '    c.Do(&e.doc)',
            '    e.undo = append(e.undo, c)',
            '    e.redo = nil',
            '}',
            '',
            'func (e *Editor) Undo() {',
            '    if len(e.undo) == 0 {',
            '        return',
            '    }',
            '    c := e.undo[len(e.undo)-1]',
            '    e.undo = e.undo[:len(e.undo)-1]',
            '    c.Undo(&e.doc)',
            '    e.redo = append(e.redo, c)',
            '}',
            '',
            'func (e *Editor) Redo() {',
            '    if len(e.redo) == 0 {',
            '        return',
            '    }',
            '    c := e.redo[len(e.redo)-1]',
            '    e.redo = e.redo[:len(e.redo)-1]',
            '    c.Do(&e.doc)',
            '    e.undo = append(e.undo, c)',
            '}',
            '',
            'func main() {',
            '    var e Editor',
            '    e.Exec(Insert{0, "hello world"})',
            '    e.Exec(&Delete{Pos: 5, N: 6})',
            '    fmt.Println(string(e.doc.text)) // hello',
            '    e.Undo()',
            '    fmt.Println(string(e.doc.text)) // hello world',
            '    e.Redo()',
            '    fmt.Println(string(e.doc.text)) // hello',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Expense approval workflow (Chain of Responsibility)',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Handlers: <code>TeamLead</code> (≤ 1,000), <code>Manager</code> (≤ 10,000), <code>Director</code> (≤ 100,000), <code>CFO</code> (rest).</li><li>Each handler implements <code>Approve(req) (Decision, bool)</code>; returns handled=false to pass to <code>next</code>.</li><li>Build the chain from configuration so limits change without code changes (OCP).</li><li>Extensions: audit decorator around each handler; parallel approvals for high-risk categories; timeouts escalate to the next handler (state + scheduler).</li><li>Compare with a rules table: chain is better when handlers have side effects or complex logic.</li></ul>'
        },
        {
          t: 'Order lifecycle with the State pattern',
          d: 'hard',
          type: 'coding',
          hint: '<ul><li>States: Created → Paid → Shipped → Delivered; Cancelled allowed from Created/Paid (with refund from Paid).</li><li>Each state is a type implementing <code>OrderState</code> with methods for every event; invalid events return an error instead of panicking.</li><li>The <code>Order</code> context holds the current state and a mutex so concurrent events (pay vs cancel) are serialised.</li><li>Record transition history for auditing.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "sync"',
            ')',
            '',
            'type OrderState interface {',
            '    Name() string',
            '    Pay(o *Order) (OrderState, error)',
            '    Ship(o *Order) (OrderState, error)',
            '    Deliver(o *Order) (OrderState, error)',
            '    Cancel(o *Order) (OrderState, error)',
            '}',
            '',
            '// base rejects everything; concrete states override what they allow.',
            'type base struct{ name string }',
            '',
            'func (b base) Name() string { return b.name }',
            'func (b base) invalid(ev string) error {',
            '    return fmt.Errorf("cannot %s order in state %s", ev, b.name)',
            '}',
            'func (b base) Pay(*Order) (OrderState, error)     { return nil, b.invalid("pay") }',
            'func (b base) Ship(*Order) (OrderState, error)    { return nil, b.invalid("ship") }',
            'func (b base) Deliver(*Order) (OrderState, error) { return nil, b.invalid("deliver") }',
            'func (b base) Cancel(*Order) (OrderState, error)  { return nil, b.invalid("cancel") }',
            '',
            'type created struct{ base }',
            'type paid struct{ base }',
            'type shipped struct{ base }',
            'type delivered struct{ base }',
            'type cancelled struct{ base }',
            '',
            'var (',
            '    Created   OrderState = created{base{"CREATED"}}',
            '    Paid      OrderState = paid{base{"PAID"}}',
            '    Shipped   OrderState = shipped{base{"SHIPPED"}}',
            '    Delivered OrderState = delivered{base{"DELIVERED"}}',
            '    Cancelled OrderState = cancelled{base{"CANCELLED"}}',
            ')',
            '',
            'func (created) Pay(*Order) (OrderState, error)    { return Paid, nil }',
            'func (created) Cancel(*Order) (OrderState, error) { return Cancelled, nil }',
            'func (paid) Ship(*Order) (OrderState, error)      { return Shipped, nil }',
            'func (paid) Cancel(o *Order) (OrderState, error) {',
            '    o.log = append(o.log, "refund issued")',
            '    return Cancelled, nil',
            '}',
            'func (shipped) Deliver(*Order) (OrderState, error) { return Delivered, nil }',
            '',
            'type Order struct {',
            '    ID    string',
            '    mu    sync.Mutex',
            '    state OrderState',
            '    log   []string',
            '}',
            '',
            'func NewOrder(id string) *Order { return &Order{ID: id, state: Created} }',
            '',
            'func (o *Order) apply(ev string, f func(OrderState) (OrderState, error)) error {',
            '    o.mu.Lock()',
            '    defer o.mu.Unlock()',
            '    next, err := f(o.state)',
            '    if err != nil {',
            '        return err',
            '    }',
            '    o.log = append(o.log, fmt.Sprintf("%s: %s -> %s", ev, o.state.Name(), next.Name()))',
            '    o.state = next',
            '    return nil',
            '}',
            '',
            'type event func(OrderState, *Order) (OrderState, error)',
            '',
            'func (o *Order) fire(name string, ev event) error {',
            '    return o.apply(name, func(s OrderState) (OrderState, error) { return ev(s, o) })',
            '}',
            '',
            'func (o *Order) Pay() error     { return o.fire("pay", OrderState.Pay) }',
            'func (o *Order) Ship() error    { return o.fire("ship", OrderState.Ship) }',
            'func (o *Order) Deliver() error { return o.fire("deliver", OrderState.Deliver) }',
            'func (o *Order) Cancel() error  { return o.fire("cancel", OrderState.Cancel) }',
            '',
            'func main() {',
            '    o := NewOrder("o-1")',
            '    fmt.Println(o.Pay(), o.Ship(), o.Cancel()) // <nil> <nil> cannot cancel ... SHIPPED',
            '    fmt.Println(o.Deliver(), o.state.Name())',
            '    fmt.Println(o.log)',
            '}'
          ].join('\n'),
          lang: 'go'
        }
      ],
      interviewFocus: [
        {
          q: 'Go has no inheritance. How do you model an "is-a" hierarchy like Vehicle → Car/Truck/Bike?',
          a: '<p>Separate <em>behaviour</em> from <em>shared data</em>:</p><ul><li>Define a small <code>Vehicle</code> interface with the behaviour callers need (<code>Size() SpotSize</code>, <code>Plate() string</code>).</li><li>Put shared fields and helpers in a <code>vehicleBase</code> struct that concrete types <strong>embed</strong> (promoted methods give reuse).</li><li>Concrete types (<code>Car</code>, <code>Truck</code>) implement the type-specific methods.</li></ul><p>Caveat: embedding is not inheritance — methods on <code>vehicleBase</code> cannot call overridden methods of the outer type (no virtual dispatch). If shared logic needs type-specific behaviour, pass the interface into a function (<code>func Fee(v Vehicle, d time.Duration)</code>) instead of a template method on the base.</p>'
        },
        {
          q: 'Where should interfaces be defined in Go, and why does that matter for design?',
          a: '<p>Typically in the <strong>consuming</strong> package, sized to what that consumer needs (&quot;accept interfaces, return structs&quot;). Because satisfaction is implicit, the producer does not need to know about the interface.</p><ul><li>Keeps interfaces small (ISP) and avoids a fat &quot;repository interface&quot; mirroring every method.</li><li>Decouples packages: the consumer can substitute fakes in tests without the producer exporting mocks.</li><li>Avoids import cycles and premature abstraction.</li></ul><p>Exceptions: when you publish a plugin point with multiple implementations (e.g. <code>database/sql/driver</code>), define the interface alongside the framework.</p>'
        },
        {
          q: 'How do you approach an LLD interview question end to end?',
          a: '<ol><li><strong>Clarify scope</strong>: core use cases, actors, constraints (concurrency? persistence? scale?).</li><li><strong>Identify entities</strong> (nouns) and their responsibilities; behaviours (verbs) become methods.</li><li><strong>Relationships</strong>: composition/aggregation, multiplicities; draw a quick class diagram.</li><li><strong>Interfaces and patterns</strong> where variation exists (pricing strategy, state machine, observers).</li><li><strong>Walk a sequence</strong> for the main flow to validate the design.</li><li><strong>Code</strong> the core classes in Go, focusing on the critical logic and concurrency.</li><li><strong>Extend</strong>: discuss how new requirements fit (OCP), edge cases, and tests.</li></ol>'
        },
        {
          q: 'Mutex or channels for protecting shared state in an LLD solution?',
          a: '<p>Use a <strong>mutex</strong> when goroutines share access to state with short critical sections (a cache map, a parking lot&#39;s spot table) — it is simpler and faster. Use <strong>channels</strong> when you transfer ownership of data or coordinate work (pipelines, worker pools, an actor goroutine that owns an aggregate and processes commands sequentially).</p><p>Go proverb: &quot;Share memory by communicating&quot; is guidance, not dogma. In interviews, a clearly scoped mutex with atomic check-then-act is usually the clearest answer; mention <code>-race</code> testing and lock ordering for multi-entity operations.</p>'
        },
        {
          q: 'When are design patterns harmful?',
          a: '<ul><li>When they are applied before a need exists — factories with one product, strategies with one algorithm, interfaces with one implementation and no tests needing substitution.</li><li>When they import Java-isms into Go (abstract base classes via embedding, getters/setters everywhere, deep hierarchies).</li><li>When indirection hides simple control flow, making debugging harder.</li></ul><p>A senior answer: start with the simplest code, refactor toward a pattern when a second variation or a test seam appears, and name the pattern to communicate intent — not to show off.</p>'
        }
      ],
      quiz: [
        { q: 'What is the unit of encapsulation in Go?', a: 'The package (exported vs unexported identifiers).' },
        { q: 'Does struct embedding provide virtual dispatch?', a: 'No. Promoted methods run on the embedded value and cannot call the outer type’s methods polymorphically.' },
        { q: 'How do you implement a thread-safe lazy singleton in Go?', a: 'With sync.Once or sync.OnceValue/OnceValues.' },
        { q: 'Which pattern does HTTP middleware implement?', a: 'Decorator (and chain of responsibility when handlers can short-circuit).' },
        { q: 'Composition vs aggregation in UML?', a: 'Composition: the whole owns the part’s lifecycle. Aggregation: the part can exist independently.' },
        { q: 'What does "accept interfaces, return structs" mean?', a: 'Functions take minimal interfaces for flexibility and return concrete types so callers get full functionality.' },
        { q: 'How do you avoid deadlocks when locking two entities?', a: 'Always acquire locks in a consistent global order (e.g. by ID).' },
        { q: 'What is the functional options pattern?', a: 'A constructor accepting variadic func(*T) options that override defaults, giving extensible, backward-compatible configuration.' }
      ],
      resources: [
        { title: 'Refactoring.Guru — Design Patterns (with Go examples)', url: 'https://refactoring.guru/design-patterns/go', type: 'article' },
        { title: 'Effective Go', url: 'https://go.dev/doc/effective_go', type: 'docs' },
        { title: 'Go Code Review Comments (interfaces, receivers, naming)', url: 'https://go.dev/wiki/CodeReviewComments', type: 'docs' },
        { title: 'Dave Cheney — SOLID Go Design', url: 'https://dave.cheney.net/2016/08/20/solid-go-design', type: 'article' }
      ]
    },
    // ───────────────────────────── Module 11 ─────────────────────────────
    {
      n: 11,
      title: 'LLD Classic Problems',
      summary: 'The classic machine-coding / object-design rounds solved in idiomatic Go: a repeatable approach, entity modelling, testing your design, and 15 problems — each with entities, relationships, patterns and a compiling Go skeleton you can extend.',
      topics: [
        {
          title: 'The LLD Interview Approach',
          def: '<p>LLD (object design / machine coding) rounds last 45–90 minutes and assess whether you can turn fuzzy requirements into clean, extensible, correct code. A reliable flow:</p>' +
            '<table><thead><tr><th>Phase</th><th>Time</th><th>What to produce</th></tr></thead><tbody>' +
            '<tr><td>1. Clarify</td><td>5 min</td><td>Use cases, actors, scale/concurrency, in/out of scope (&quot;no persistence, single process, multiple concurrent users&quot;)</td></tr>' +
            '<tr><td>2. Entities</td><td>5–10 min</td><td>Nouns → types; verbs → methods; enums for states/kinds; class diagram with multiplicities</td></tr>' +
            '<tr><td>3. Interfaces &amp; patterns</td><td>5 min</td><td>Variation points (pricing, scheduling, split strategy) as interfaces; state machines; observers for notifications</td></tr>' +
            '<tr><td>4. Core flow</td><td>5 min</td><td>Sequence of the main use case; identify shared state and critical sections</td></tr>' +
            '<tr><td>5. Code</td><td>20–40 min</td><td>Compiling Go: types, constructors, core methods, error handling, concurrency control; a <code>main</code> or test demonstrating the flow</td></tr>' +
            '<tr><td>6. Extend &amp; test</td><td>5–10 min</td><td>How new requirements fit without rewrites; edge cases; tests you would write</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Scoring signals:</strong> correct abstractions (not too many, not too few), single responsibility per type, extensibility via interfaces (OCP), correctness under concurrency, readable naming, explicit error handling, and working code. Interviewers usually prefer a smaller design that runs over a grand design that does not.</p>' +
            '<p><strong>Go-specific tips:</strong> keep it in one package unless asked; use typed enums with <code>iota</code> and <code>String()</code>; return errors, never panic for business rules; inject time (<code>func() time.Time</code>) and randomness for testability; protect shared maps with a mutex.</p>',
          interview: 'Say your plan out loud: "I will clarify, list entities, sketch relationships, then code the core flow and handle concurrency". Ask before adding persistence or HTTP layers — most LLD rounds want in-memory domain logic.',
          examples: [{
            label: 'Reusable skeleton for any machine-coding round (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "errors"',
              '    "fmt"',
              '    "sync"',
              '    "time"',
              ')',
              '',
              '// 1) Typed enums with String() so logs and test failures are readable.',
              'type Status int',
              '',
              'const (',
              '    Available Status = iota',
              '    Reserved',
              ')',
              '',
              'func (s Status) String() string { return [...]string{"Available", "Reserved"}[s] }',
              '',
              '// 2) Domain errors that callers and tests check with errors.Is.',
              'var (',
              '    ErrNotFound    = errors.New("not found")',
              '    ErrUnavailable = errors.New("unavailable")',
              ')',
              '',
              '// 3) Variation points as small interfaces (Strategy), injected through the constructor.',
              'type Pricer interface{ Price(d time.Duration) int64 }',
              '',
              'type hourly struct{ centsPerHour int64 }',
              '',
              'func (h hourly) Price(d time.Duration) int64 {',
              '    return h.centsPerHour * int64((d+time.Hour-1)/time.Hour) // per started hour',
              '}',
              '',
              '// 4) Entities own their state; behaviour lives next to the data.',
              'type Resource struct {',
              '    ID     string',
              '    status Status',
              '}',
              '',
              '// 5) A service (facade) guards the aggregate with one lock; the clock is injected for tests.',
              'type Service struct {',
              '    mu        sync.Mutex',
              '    resources map[string]*Resource',
              '    pricer    Pricer',
              '    now       func() time.Time',
              '}',
              '',
              'func NewService(p Pricer, now func() time.Time) *Service {',
              '    return &Service{resources: map[string]*Resource{}, pricer: p, now: now}',
              '}',
              '',
              'func (s *Service) Add(id string) {',
              '    s.mu.Lock()',
              '    defer s.mu.Unlock()',
              '    s.resources[id] = &Resource{ID: id}',
              '}',
              '',
              'func (s *Service) Reserve(id string) error {',
              '    s.mu.Lock()',
              '    defer s.mu.Unlock()',
              '    r, ok := s.resources[id]',
              '    if !ok {',
              '        return fmt.Errorf("reserve %s: %w", id, ErrNotFound)',
              '    }',
              '    if r.status != Available { // check-then-act inside ONE critical section',
              '        return fmt.Errorf("reserve %s: %w", id, ErrUnavailable)',
              '    }',
              '    r.status = Reserved',
              '    return nil',
              '}',
              '',
              '// 6) main (or a table-driven test) demonstrates the core flow end to end.',
              'func main() {',
              '    s := NewService(hourly{centsPerHour: 250}, time.Now)',
              '    s.Add("r1")',
              '    fmt.Println(s.Reserve("r1"))                // <nil>',
              '    fmt.Println(s.Reserve("r1"))                // reserve r1: unavailable',
              '    fmt.Println(s.pricer.Price(90 * time.Minute)) // 500',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Entity Modelling: Entities, Value Objects, States and Relationships',
          def: '<p>Good LLD starts with a crisp domain model.</p>' +
            '<ul><li><strong>Entities</strong> have identity and lifecycle (<code>Booking</code>, <code>Member</code>, <code>Elevator</code>) — give them IDs.</li>' +
            '<li><strong>Value objects</strong> are defined by their values and are immutable (<code>Money{Amount int64; Currency string}</code>, <code>SeatID</code>, <code>Location</code>) — pass by value, compare with <code>==</code>.</li>' +
            '<li><strong>Enums/states</strong>: <code>SpotSize</code>, <code>BookingStatus</code>, <code>Direction</code> as typed constants; state transitions centralised (State pattern or a transition table).</li>' +
            '<li><strong>Services/managers</strong> orchestrate use cases across entities (<code>BookingService</code>) — keep business invariants inside entities where possible.</li>' +
            '<li><strong>Strategies/policies</strong> capture variation (<code>PricingStrategy</code>, <code>FinePolicy</code>, <code>Dispatcher</code>).</li></ul>' +
            '<table><thead><tr><th>Smell</th><th>Fix</th></tr></thead><tbody>' +
            '<tr><td>God class (<code>ParkingLotManager</code> does everything)</td><td>Split responsibilities: lot, level, spot allocation, pricing, payments</td></tr>' +
            '<tr><td>Anemic model (structs with only getters/setters)</td><td>Move behaviour to the entity owning the data (<code>spot.Occupy(v)</code>)</td></tr>' +
            '<tr><td>Floats for money</td><td>Integer minor units (<code>int64</code> cents)</td></tr>' +
            '<tr><td>Stringly-typed states</td><td>Typed enums + validation</td></tr>' +
            '<tr><td>Deep inheritance thinking</td><td>Interfaces + composition</td></tr>' +
            '<tr><td>Hidden <code>time.Now()</code> calls</td><td>Inject a clock</td></tr>' +
            '</tbody></table>' +
            '<p>Identify <strong>aggregates</strong> — clusters changed together under one lock or transaction (a Show and its seat states; an Account and its balance). Concurrency control usually maps 1:1 to aggregates.</p>',
          interview: 'Narrate the model: "Entities: X, Y, Z; value objects: Money, SeatID; X owns many Y (composition); variation in pricing → strategy; lifecycle → state machine". This structured narration is often worth as much as the code.',
          examples: [{
            label: 'Value object, typed enum and guarded state transitions (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "errors"',
              '    "fmt"',
              ')',
              '',
              '// Value object: immutable, compared by value, money in integer minor units.',
              'type Money struct {',
              '    Cents    int64',
              '    Currency string',
              '}',
              '',
              'func (m Money) Add(o Money) (Money, error) {',
              '    if m.Currency != o.Currency {',
              '        return Money{}, errors.New("currency mismatch")',
              '    }',
              '    return Money{Cents: m.Cents + o.Cents, Currency: m.Currency}, nil',
              '}',
              '',
              '// Typed enum for the lifecycle.',
              'type BookingStatus int',
              '',
              'const (',
              '    Held BookingStatus = iota',
              '    Confirmed',
              '    Cancelled',
              ')',
              '',
              'func (s BookingStatus) String() string { return [...]string{"Held", "Confirmed", "Cancelled"}[s] }',
              '',
              '// Entity: identity + lifecycle. All transitions are validated in ONE place.',
              'type Booking struct {',
              '    ID     string',
              '    Seats  []string // SeatIDs (value objects)',
              '    Total  Money',
              '    status BookingStatus',
              '}',
              '',
              'var allowed = map[BookingStatus][]BookingStatus{',
              '    Held:      {Confirmed, Cancelled},',
              '    Confirmed: {Cancelled},',
              '}',
              '',
              'func (b *Booking) transition(to BookingStatus) error {',
              '    for _, s := range allowed[b.status] {',
              '        if s == to {',
              '            b.status = to',
              '            return nil',
              '        }',
              '    }',
              '    return fmt.Errorf("booking %s: illegal transition %v -> %v", b.ID, b.status, to)',
              '}',
              '',
              'func (b *Booking) Confirm() error { return b.transition(Confirmed) }',
              'func (b *Booking) Cancel() error  { return b.transition(Cancelled) }',
              '',
              'func main() {',
              '    total, _ := Money{Cents: 1200, Currency: "EUR"}.Add(Money{Cents: 800, Currency: "EUR"})',
              '    b := &Booking{ID: "b1", Seats: []string{"A1", "A2"}, Total: total}',
              '    fmt.Println(b.Confirm(), b.Cancel()) // <nil> <nil>',
              '    fmt.Println(b.Confirm())             // booking b1: illegal transition Cancelled -> Confirmed',
              '    fmt.Println(Money{100, "EUR"} == Money{100, "EUR"}) // true: value semantics',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Testing and Extending an LLD Solution',
          def: '<p>Your QA background is an advantage here: interviewers increasingly ask &quot;how would you test this?&quot; and &quot;what changes if we add X?&quot;.</p>' +
            '<ul><li><strong>Table-driven tests</strong> for business rules (pricing, state transitions, split calculations) — enumerate valid and invalid transitions.</li>' +
            '<li><strong>Fake clocks</strong> for TTLs, rate limiters, fines and seat holds: inject <code>now func() time.Time</code> and advance it in tests rather than sleeping.</li>' +
            '<li><strong>Concurrency tests</strong>: launch many goroutines competing for one resource (last seat, one spot) and assert invariants (exactly one success, no negative balances); run with <code>go test -race</code>.</li>' +
            '<li><strong>Property-style checks</strong>: sum of balances in Splitwise is always zero; LRU size never exceeds capacity; tokens never exceed bucket capacity. Go&#39;s native fuzzing (<code>go test -fuzz</code>) can drive these.</li>' +
            '<li><strong>Interface seams</strong>: payment gateway, notifier and repository behind interfaces so tests inject fakes.</li></ul>' +
            '<p><strong>Extension checklist</strong> (show OCP): new vehicle type/spot size, new pricing rule, new split type, new elevator scheduling algorithm, new appender, persistence instead of in-memory maps (repository interface), distributed deployment (where would locks move? — DB conditional updates or a distributed lock).</p>',
          interview: 'Close every LLD answer with 3–4 concrete tests (including one concurrency test with -race) and one extension that fits without modifying existing types. It demonstrates both quality engineering and good design.',
          examples: [{
            label: 'Concurrency test pattern: exactly one winner',
            lang: 'go',
            code: [
              'package main',
              '',
              'import (',
              '    "fmt"',
              '    "sync"',
              '    "sync/atomic"',
              ')',
              '',
              'type Seat struct {',
              '    mu     sync.Mutex',
              '    booked bool',
              '}',
              '',
              'func (s *Seat) Book() bool {',
              '    s.mu.Lock()',
              '    defer s.mu.Unlock()',
              '    if s.booked {',
              '        return false',
              '    }',
              '    s.booked = true',
              '    return true',
              '}',
              '',
              '// In a real test file this is func TestBookOnce(t *testing.T) run with -race.',
              'func main() {',
              '    var seat Seat',
              '    var wins atomic.Int32',
              '    var wg sync.WaitGroup',
              '    start := make(chan struct{})',
              '    for i := 0; i < 1000; i++ {',
              '        wg.Add(1)',
              '        go func() {',
              '            defer wg.Done()',
              '            <-start // maximise contention',
              '            if seat.Book() {',
              '                wins.Add(1)',
              '            }',
              '        }()',
              '    }',
              '    close(start)',
              '    wg.Wait()',
              '    fmt.Println("winners:", wins.Load()) // must be exactly 1',
              '}'
            ].join('\n')
          }]
        },
        {
          title: 'Recurring Building Blocks Across LLD Problems',
          def: '<p>The same few mechanisms appear in most classic problems — recognise them and reuse them.</p>' +
            '<table><thead><tr><th>Building block</th><th>Where it appears</th><th>Go implementation</th></tr></thead><tbody>' +
            '<tr><td>State machine</td><td>Vending machine, order, elevator, booking</td><td>State interface per state, or transition table <code>map[State]map[Event]State</code></td></tr>' +
            '<tr><td>Strategy</td><td>Parking fees, split types, elevator dispatch, eviction policy</td><td>Interface or func type injected via constructor</td></tr>' +
            '<tr><td>Observer</td><td>Notifications in library, pub/sub, logger appenders</td><td>Slice of listeners or channels; non-blocking publish</td></tr>' +
            '<tr><td>Temporary hold with TTL</td><td>Seat booking, cart reservation, library holds</td><td>Hold record with <code>expiresAt</code>; lazy expiry on access + optional sweeper</td></tr>' +
            '<tr><td>Free-list / index for allocation</td><td>Parking spots, meeting rooms, IDs</td><td>Per-category stacks/heaps of free resources for O(1)/O(log n) allocation</td></tr>' +
            '<tr><td>O(1) cache structures</td><td>LRU/LFU caches</td><td>Hash map + doubly linked list (or <code>container/list</code>)</td></tr>' +
            '<tr><td>Composite tree</td><td>File system, org charts, menus</td><td>Node interface with leaf and container implementations</td></tr>' +
            '<tr><td>Append-only log + offsets</td><td>Pub/sub broker, audit, event sourcing</td><td>Slice of messages + per-consumer offset; condition/channel to wake waiters</td></tr>' +
            '</tbody></table>' +
            '<p>Concurrency granularity typically follows the aggregate: one mutex per show (BookMyShow), per lot or per level (parking), per topic (broker), per key bucket (rate limiter with sharded maps).</p>',
          interview: 'When you recognise a building block, name it ("this is a TTL hold, same as a cart reservation") and reuse a known-correct implementation. It speeds you up and signals breadth.',
          examples: [{
            label: 'Transition-table state machine with an observer hook (Go)',
            lang: 'go',
            code: [
              'package main',
              '',
              'import "fmt"',
              '',
              'type State string',
              'type Event string',
              '',
              '// FSM is a reusable transition table: state -> event -> next state. Vending machines,',
              '// order lifecycles, elevator doors and booking holds all fit this shape.',
              'type FSM struct {',
              '    state   State',
              '    table   map[State]map[Event]State',
              '    onEnter func(from, to State, e Event) // observer hook: logs, metrics, notifications',
              '}',
              '',
              'func (f *FSM) Fire(e Event) error {',
              '    next, ok := f.table[f.state][e]',
              '    if !ok {',
              '        return fmt.Errorf("event %q not allowed in state %q", e, f.state)',
              '    }',
              '    from := f.state',
              '    f.state = next',
              '    if f.onEnter != nil {',
              '        f.onEnter(from, next, e)',
              '    }',
              '    return nil',
              '}',
              '',
              'func main() {',
              '    door := &FSM{',
              '        state: "closed",',
              '        table: map[State]map[Event]State{',
              '            "closed":  {"open": "opening"},',
              '            "opening": {"opened": "open"},',
              '            "open":    {"close": "closing"},',
              '            "closing": {"closed": "closed", "obstacle": "opening"}, // safety: re-open',
              '        },',
              '        onEnter: func(from, to State, e Event) { fmt.Printf("%s --%s--> %s\\n", from, e, to) },',
              '    }',
              '    for _, e := range []Event{"open", "opened", "close", "obstacle", "opened", "close", "closed"} {',
              '        if err := door.Fire(e); err != nil {',
              '            fmt.Println(err)',
              '        }',
              '    }',
              '    fmt.Println(door.Fire("close")) // event "close" not allowed in state "closed"',
              '}'
            ].join('\n')
          }]
        }
      ],
      problems: [
        {
          t: 'Snake and Ladder game',
          d: 'easy',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Board</code> (size, jumps map for snakes and ladders), <code>Player</code> (name, position), <code>Dice</code> (interface), <code>Game</code> (players, turn, winner).</li><li><strong>Relationships:</strong> Game has one Board, one Dice, many Players (turn order queue).</li><li><strong>Patterns:</strong> Strategy for dice (random, fixed sequence for tests, multiple dice); validation in the Board constructor (snakes go down, ladders go up, no cell with both).</li><li><strong>Rules:</strong> must land exactly on the last cell; extensions: extra turn on 6, three 6s forfeits.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "math/rand/v2"',
            ')',
            '',
            'type Dice interface{ Roll() int }',
            '',
            'type RandomDice struct{ Faces int }',
            '',
            'func (d RandomDice) Roll() int { return rand.IntN(d.Faces) + 1 }',
            '',
            'type Board struct {',
            '    size  int',
            '    jumps map[int]int // snake head -> tail, ladder bottom -> top',
            '}',
            '',
            'func NewBoard(size int, snakes, ladders map[int]int) (*Board, error) {',
            '    b := &Board{size: size, jumps: map[int]int{}}',
            '    for h, t := range snakes {',
            '        if t >= h || h >= size {',
            '            return nil, fmt.Errorf("invalid snake %d->%d", h, t)',
            '        }',
            '        b.jumps[h] = t',
            '    }',
            '    for s, e := range ladders {',
            '        if _, dup := b.jumps[s]; dup || e <= s || e > size {',
            '            return nil, fmt.Errorf("invalid ladder %d->%d", s, e)',
            '        }',
            '        b.jumps[s] = e',
            '    }',
            '    return b, nil',
            '}',
            '',
            'func (b *Board) Move(pos, roll int) int {',
            '    next := pos + roll',
            '    if next > b.size {',
            '        return pos // must land exactly on the last cell',
            '    }',
            '    if j, ok := b.jumps[next]; ok {',
            '        return j',
            '    }',
            '    return next',
            '}',
            '',
            'type Player struct {',
            '    Name string',
            '    Pos  int',
            '}',
            '',
            'type Game struct {',
            '    board   *Board',
            '    dice    Dice',
            '    players []*Player',
            '    turn    int',
            '}',
            '',
            'func (g *Game) Play(maxTurns int) (*Player, bool) {',
            '    for i := 0; i < maxTurns; i++ {',
            '        p := g.players[g.turn]',
            '        p.Pos = g.board.Move(p.Pos, g.dice.Roll())',
            '        if p.Pos == g.board.size {',
            '            return p, true',
            '        }',
            '        g.turn = (g.turn + 1) % len(g.players)',
            '    }',
            '    return nil, false',
            '}',
            '',
            'func main() {',
            '    b, err := NewBoard(100, map[int]int{99: 10, 62: 18}, map[int]int{4: 56, 40: 83})',
            '    if err != nil {',
            '        panic(err)',
            '    }',
            '    g := &Game{board: b, dice: RandomDice{Faces: 6}, players: []*Player{{Name: "ana"}, {Name: "raj"}}}',
            '    if w, ok := g.Play(10000); ok {',
            '        fmt.Println("winner:", w.Name)',
            '    }',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Rate limiter (token bucket) LLD',
          d: 'easy',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>TokenBucket</code> (capacity, refill rate, tokens, last refill), <code>Limiter</code> (per-key buckets), <code>Rule</code> (capacity, rate) per client tier.</li><li><strong>Relationships:</strong> Limiter has many buckets (one per key), created lazily from the client&#39;s rule.</li><li><strong>Patterns:</strong> Strategy if multiple algorithms are needed (<code>Allower</code> interface: token bucket, sliding window); injected clock for tests.</li><li><strong>Details:</strong> refill lazily on each call (no background goroutine); float tokens for fractional rates; evict idle buckets to bound memory; per-bucket lock or sharded maps for throughput.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "sync"',
            '    "time"',
            ')',
            '',
            'type TokenBucket struct {',
            '    mu       sync.Mutex',
            '    capacity float64',
            '    rate     float64 // tokens per second',
            '    tokens   float64',
            '    last     time.Time',
            '    now      func() time.Time',
            '}',
            '',
            'func NewTokenBucket(capacity int, ratePerSec float64, now func() time.Time) *TokenBucket {',
            '    return &TokenBucket{capacity: float64(capacity), rate: ratePerSec,',
            '        tokens: float64(capacity), last: now(), now: now}',
            '}',
            '',
            'func (b *TokenBucket) AllowN(n int) bool {',
            '    b.mu.Lock()',
            '    defer b.mu.Unlock()',
            '    t := b.now()',
            '    b.tokens = min(b.capacity, b.tokens+t.Sub(b.last).Seconds()*b.rate) // lazy refill',
            '    b.last = t',
            '    if b.tokens >= float64(n) {',
            '        b.tokens -= float64(n)',
            '        return true',
            '    }',
            '    return false',
            '}',
            '',
            'type Rule struct {',
            '    Capacity int',
            '    Rate     float64',
            '}',
            '',
            'type Limiter struct {',
            '    mu      sync.Mutex',
            '    buckets map[string]*TokenBucket',
            '    rule    func(key string) Rule',
            '    now     func() time.Time',
            '}',
            '',
            'func (l *Limiter) Allow(key string) bool {',
            '    l.mu.Lock()',
            '    b, ok := l.buckets[key]',
            '    if !ok {',
            '        r := l.rule(key)',
            '        b = NewTokenBucket(r.Capacity, r.Rate, l.now)',
            '        l.buckets[key] = b',
            '    }',
            '    l.mu.Unlock() // per-bucket lock taken inside AllowN',
            '    return b.AllowN(1)',
            '}',
            '',
            'func main() {',
            '    clock := time.Unix(0, 0)',
            '    now := func() time.Time { return clock }',
            '    l := &Limiter{buckets: map[string]*TokenBucket{}, now: now,',
            '        rule: func(string) Rule { return Rule{Capacity: 3, Rate: 1} }}',
            '    for i := 0; i < 4; i++ {',
            '        fmt.Print(l.Allow("api-key-1"), " ") // true true true false',
            '    }',
            '    clock = clock.Add(2 * time.Second) // fake clock: 2 tokens refilled',
            '    fmt.Println(l.Allow("api-key-1"), l.Allow("api-key-1"), l.Allow("api-key-1"))',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Parking lot',
          d: 'easy',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>ParkingLot</code>, <code>Level</code> (optional), <code>Spot</code> (ID, size, occupant), <code>Vehicle</code> (plate, size), <code>Ticket</code> (ID, plate, spot, entry time), <code>PricingStrategy</code>, payment.</li><li><strong>Relationships:</strong> Lot *-- Levels *-- Spots (composition); Spot o-- 0..1 Vehicle; Ticket references Spot and Vehicle.</li><li><strong>Patterns:</strong> Strategy for pricing (hourly, flat, weekend); Factory for vehicle types; free lists per spot size for O(1) allocation; smallest-fitting-spot policy (also a strategy).</li><li><strong>Concurrency:</strong> one lot mutex (or per-level) so two cars never get the same spot; idempotent exit.</li><li><strong>Extensions:</strong> EV charging spots, reservations, multiple entry gates (each gate calls the same lot service), display boards (observer).</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "errors"',
            '    "fmt"',
            '    "sync"',
            '    "time"',
            ')',
            '',
            'type Size int',
            '',
            'const (',
            '    Small  Size = iota // motorcycle',
            '    Medium             // car',
            '    Large              // truck',
            ')',
            '',
            'type Vehicle struct {',
            '    Plate string',
            '    Size  Size',
            '}',
            '',
            'type Spot struct {',
            '    ID       string',
            '    Size     Size',
            '    occupant *Vehicle',
            '}',
            '',
            'type Ticket struct {',
            '    ID    int64',
            '    Plate string',
            '    Spot  *Spot',
            '    Entry time.Time',
            '}',
            '',
            'type PricingStrategy interface {',
            '    Fee(d time.Duration, s Size) int64',
            '}',
            '',
            'type Hourly map[Size]int64 // price per started hour, in cents',
            '',
            'func (h Hourly) Fee(d time.Duration, s Size) int64 {',
            '    hours := int64((d + time.Hour - 1) / time.Hour)',
            '    return max(1, hours) * h[s]',
            '}',
            '',
            'var ErrFull = errors.New("no spot available")',
            '',
            'type ParkingLot struct {',
            '    mu      sync.Mutex',
            '    free    map[Size][]*Spot',
            '    active  map[string]*Ticket // by plate',
            '    pricing PricingStrategy',
            '    nextID  int64',
            '    now     func() time.Time',
            '}',
            '',
            'func NewParkingLot(spots []*Spot, p PricingStrategy, now func() time.Time) *ParkingLot {',
            '    lot := &ParkingLot{free: map[Size][]*Spot{}, active: map[string]*Ticket{}, pricing: p, now: now}',
            '    for _, s := range spots {',
            '        lot.free[s.Size] = append(lot.free[s.Size], s)',
            '    }',
            '    return lot',
            '}',
            '',
            'func (l *ParkingLot) Park(v Vehicle) (*Ticket, error) {',
            '    l.mu.Lock()',
            '    defer l.mu.Unlock()',
            '    if _, dup := l.active[v.Plate]; dup {',
            '        return nil, fmt.Errorf("vehicle %s already parked", v.Plate)',
            '    }',
            '    for size := v.Size; size <= Large; size++ { // smallest spot that fits',
            '        if n := len(l.free[size]); n > 0 {',
            '            spot := l.free[size][n-1]',
            '            l.free[size] = l.free[size][:n-1]',
            '            spot.occupant = &v',
            '            l.nextID++',
            '            t := &Ticket{ID: l.nextID, Plate: v.Plate, Spot: spot, Entry: l.now()}',
            '            l.active[v.Plate] = t',
            '            return t, nil',
            '        }',
            '    }',
            '    return nil, ErrFull',
            '}',
            '',
            'func (l *ParkingLot) Leave(plate string) (int64, error) {',
            '    l.mu.Lock()',
            '    defer l.mu.Unlock()',
            '    t, ok := l.active[plate]',
            '    if !ok {',
            '        return 0, fmt.Errorf("no active ticket for %s", plate)',
            '    }',
            '    delete(l.active, plate)',
            '    t.Spot.occupant = nil',
            '    l.free[t.Spot.Size] = append(l.free[t.Spot.Size], t.Spot)',
            '    return l.pricing.Fee(l.now().Sub(t.Entry), t.Spot.Size), nil',
            '}',
            '',
            'func main() {',
            '    clock := time.Date(2026, 1, 1, 9, 0, 0, 0, time.UTC)',
            '    lot := NewParkingLot([]*Spot{{ID: "A1", Size: Small}, {ID: "B1", Size: Medium}},',
            '        Hourly{Small: 100, Medium: 200, Large: 500}, func() time.Time { return clock })',
            '    t, _ := lot.Park(Vehicle{"KA01", Medium})',
            '    _, err := lot.Park(Vehicle{"KA02", Medium})',
            '    fmt.Println(t.Spot.ID, err) // B1 no spot available',
            '    clock = clock.Add(90 * time.Minute)',
            '    fee, _ := lot.Leave("KA01")',
            '    fmt.Println("fee cents:", fee) // 400 (2 started hours)',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'LRU cache',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>LRU[K, V]</code> (capacity, map key → node, doubly linked list), <code>node</code> (key, value, prev, next).</li><li><strong>Relationships:</strong> map gives O(1) lookup; list keeps recency order (front = most recent, back = eviction candidate). Node stores its key so eviction can delete from the map.</li><li><strong>Patterns:</strong> sentinel node removes nil checks; generics for type safety; mutex for thread safety (Get mutates order, so even reads need the write lock).</li><li><strong>Extensions:</strong> TTL per entry, eviction callback (observer), sharded LRU for concurrency, LFU variant (frequency buckets), metrics (hit ratio).</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "sync"',
            ')',
            '',
            'type node[K comparable, V any] struct {',
            '    key        K',
            '    val        V',
            '    prev, next *node[K, V]',
            '}',
            '',
            'type LRU[K comparable, V any] struct {',
            '    mu    sync.Mutex',
            '    cap   int',
            '    items map[K]*node[K, V]',
            '    root  node[K, V] // sentinel: root.next = MRU, root.prev = LRU',
            '}',
            '',
            'func NewLRU[K comparable, V any](capacity int) *LRU[K, V] {',
            '    c := &LRU[K, V]{cap: capacity, items: make(map[K]*node[K, V], capacity)}',
            '    c.root.next, c.root.prev = &c.root, &c.root',
            '    return c',
            '}',
            '',
            'func (c *LRU[K, V]) unlink(n *node[K, V]) {',
            '    n.prev.next, n.next.prev = n.next, n.prev',
            '}',
            '',
            'func (c *LRU[K, V]) pushFront(n *node[K, V]) {',
            '    n.prev, n.next = &c.root, c.root.next',
            '    c.root.next.prev = n',
            '    c.root.next = n',
            '}',
            '',
            'func (c *LRU[K, V]) Get(k K) (V, bool) {',
            '    c.mu.Lock()',
            '    defer c.mu.Unlock()',
            '    n, ok := c.items[k]',
            '    if !ok {',
            '        var zero V',
            '        return zero, false',
            '    }',
            '    c.unlink(n)',
            '    c.pushFront(n)',
            '    return n.val, true',
            '}',
            '',
            'func (c *LRU[K, V]) Put(k K, v V) {',
            '    c.mu.Lock()',
            '    defer c.mu.Unlock()',
            '    if n, ok := c.items[k]; ok {',
            '        n.val = v',
            '        c.unlink(n)',
            '        c.pushFront(n)',
            '        return',
            '    }',
            '    if len(c.items) == c.cap {',
            '        lru := c.root.prev',
            '        c.unlink(lru)',
            '        delete(c.items, lru.key)',
            '    }',
            '    n := &node[K, V]{key: k, val: v}',
            '    c.items[k] = n',
            '    c.pushFront(n)',
            '}',
            '',
            'func main() {',
            '    c := NewLRU[string, int](2)',
            '    c.Put("a", 1)',
            '    c.Put("b", 2)',
            '    c.Get("a")    // a becomes most recent',
            '    c.Put("c", 3) // evicts b',
            '    _, okB := c.Get("b")',
            '    va, _ := c.Get("a")',
            '    fmt.Println(okB, va) // false 1',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Logger framework',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Level</code> enum, <code>Entry</code> (time, level, message, fields), <code>Logger</code> (min level, appenders), <code>Appender</code> interface (console, file, remote), <code>Formatter</code> interface (text, JSON).</li><li><strong>Relationships:</strong> Logger has many Appenders (fan-out, observer-like); each Appender has one Formatter.</li><li><strong>Patterns:</strong> Strategy (formatter), Decorator (<code>AsyncAppender</code> wraps any appender with a buffered channel), Chain of responsibility (level filtering / per-appender thresholds), optional default instance via <code>sync.Once</code>.</li><li><strong>Concerns:</strong> thread safety (mutex per writer), non-blocking async with bounded buffer and drop counter, graceful <code>Close()</code> flush, child loggers with context fields. In real Go code use <code>log/slog</code> with custom handlers.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "encoding/json"',
            '    "fmt"',
            '    "io"',
            '    "os"',
            '    "sync"',
            '    "sync/atomic"',
            '    "time"',
            ')',
            '',
            'type Level int',
            '',
            'const (',
            '    Debug Level = iota',
            '    Info',
            '    Warn',
            '    Error',
            ')',
            '',
            'func (l Level) String() string { return [...]string{"DEBUG", "INFO", "WARN", "ERROR"}[l] }',
            '',
            'type Entry struct {',
            '    Time  time.Time',
            '    Level Level',
            '    Msg   string',
            '}',
            '',
            'type Formatter interface{ Format(Entry) []byte }',
            '',
            'type TextFormatter struct{}',
            '',
            'func (TextFormatter) Format(e Entry) []byte {',
            '    return []byte(fmt.Sprintf("%s [%s] %s\\n", e.Time.Format(time.RFC3339), e.Level, e.Msg))',
            '}',
            '',
            'type JSONFormatter struct{}',
            '',
            'func (JSONFormatter) Format(e Entry) []byte {',
            '    b, _ := json.Marshal(map[string]any{"ts": e.Time, "level": e.Level.String(), "msg": e.Msg})',
            '    return append(b, \'\\n\')',
            '}',
            '',
            'type Appender interface{ Append(Entry) }',
            '',
            'type WriterAppender struct {',
            '    mu  sync.Mutex',
            '    w   io.Writer',
            '    fmt Formatter',
            '}',
            '',
            'func (a *WriterAppender) Append(e Entry) {',
            '    a.mu.Lock()',
            '    defer a.mu.Unlock()',
            '    a.w.Write(a.fmt.Format(e))',
            '}',
            '',
            '// AsyncAppender decorates any Appender with a bounded buffer.',
            'type AsyncAppender struct {',
            '    ch      chan Entry',
            '    wg      sync.WaitGroup',
            '    dropped atomic.Int64',
            '}',
            '',
            'func NewAsync(next Appender, buf int) *AsyncAppender {',
            '    a := &AsyncAppender{ch: make(chan Entry, buf)}',
            '    a.wg.Add(1)',
            '    go func() {',
            '        defer a.wg.Done()',
            '        for e := range a.ch {',
            '            next.Append(e)',
            '        }',
            '    }()',
            '    return a',
            '}',
            '',
            'func (a *AsyncAppender) Append(e Entry) {',
            '    select {',
            '    case a.ch <- e:',
            '    default:',
            '        a.dropped.Add(1) // never block the caller; expose as a metric',
            '    }',
            '}',
            '',
            'func (a *AsyncAppender) Close() { close(a.ch); a.wg.Wait() }',
            '',
            'type Logger struct {',
            '    min       Level',
            '    appenders []Appender',
            '}',
            '',
            'func (l *Logger) log(lv Level, format string, args ...any) {',
            '    if lv < l.min {',
            '        return',
            '    }',
            '    e := Entry{Time: time.Now(), Level: lv, Msg: fmt.Sprintf(format, args...)}',
            '    for _, a := range l.appenders {',
            '        a.Append(e)',
            '    }',
            '}',
            '',
            'func (l *Logger) Infof(f string, a ...any)  { l.log(Info, f, a...) }',
            'func (l *Logger) Debugf(f string, a ...any) { l.log(Debug, f, a...) }',
            '',
            'func main() {',
            '    async := NewAsync(&WriterAppender{w: os.Stdout, fmt: JSONFormatter{}}, 1024)',
            '    log := &Logger{min: Info, appenders: []Appender{',
            '        &WriterAppender{w: os.Stdout, fmt: TextFormatter{}},',
            '        async,',
            '    }}',
            '    log.Debugf("hidden")',
            '    log.Infof("order %d placed", 42)',
            '    async.Close() // flush before exit',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Vending machine (State pattern)',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Machine</code> (state, balance, inventory), <code>Slot</code> (code, product, price, quantity), <code>State</code> interface (Idle, HasMoney; optionally Dispensing, Maintenance), coin denominations.</li><li><strong>Relationships:</strong> Machine has many Slots and exactly one current State; states transition the machine.</li><li><strong>Patterns:</strong> State pattern — each state implements all events (<code>Insert</code>, <code>Select</code>, <code>Cancel</code>) and rejects invalid ones with errors; Strategy for change-making (greedy for canonical coin systems).</li><li><strong>Concurrency:</strong> physical machines are single-user, but guard with a mutex if exposed via an API.</li><li><strong>Edge cases:</strong> invalid coin, sold-out product, insufficient balance (stay in HasMoney), cancel refunds, exact change unavailable.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "errors"',
            '    "fmt"',
            '    "sync"',
            ')',
            '',
            'type Slot struct {',
            '    Product string',
            '    Price   int',
            '    Qty     int',
            '}',
            '',
            'type State interface {',
            '    Insert(m *Machine, coin int) error',
            '    Select(m *Machine, code string) (product string, change int, err error)',
            '    Cancel(m *Machine) (refund int)',
            '}',
            '',
            'type Machine struct {',
            '    mu      sync.Mutex',
            '    state   State',
            '    balance int',
            '    slots   map[string]*Slot',
            '}',
            '',
            'var validCoins = map[int]bool{1: true, 2: true, 5: true, 10: true}',
            '',
            'type idle struct{}',
            'type hasMoney struct{}',
            '',
            'func (idle) Insert(m *Machine, coin int) error {',
            '    if !validCoins[coin] {',
            '        return fmt.Errorf("invalid coin %d", coin)',
            '    }',
            '    m.balance += coin',
            '    m.state = hasMoney{}',
            '    return nil',
            '}',
            'func (idle) Select(*Machine, string) (string, int, error) {',
            '    return "", 0, errors.New("insert money first")',
            '}',
            'func (idle) Cancel(*Machine) int { return 0 }',
            '',
            'func (hasMoney) Insert(m *Machine, coin int) error {',
            '    if !validCoins[coin] {',
            '        return fmt.Errorf("invalid coin %d", coin)',
            '    }',
            '    m.balance += coin',
            '    return nil',
            '}',
            '',
            'func (hasMoney) Select(m *Machine, code string) (string, int, error) {',
            '    s, ok := m.slots[code]',
            '    switch {',
            '    case !ok:',
            '        return "", 0, fmt.Errorf("unknown code %s", code)',
            '    case s.Qty == 0:',
            '        return "", 0, fmt.Errorf("%s sold out", s.Product)',
            '    case m.balance < s.Price:',
            '        return "", 0, fmt.Errorf("insert %d more", s.Price-m.balance)',
            '    }',
            '    s.Qty--',
            '    change := m.balance - s.Price',
            '    m.balance = 0',
            '    m.state = idle{}',
            '    return s.Product, change, nil',
            '}',
            '',
            'func (hasMoney) Cancel(m *Machine) int {',
            '    r := m.balance',
            '    m.balance = 0',
            '    m.state = idle{}',
            '    return r',
            '}',
            '',
            '// Public API: lock, then delegate to the current state.',
            'func (m *Machine) Insert(coin int) error {',
            '    m.mu.Lock()',
            '    defer m.mu.Unlock()',
            '    return m.state.Insert(m, coin)',
            '}',
            '',
            'func (m *Machine) Select(code string) (string, int, error) {',
            '    m.mu.Lock()',
            '    defer m.mu.Unlock()',
            '    return m.state.Select(m, code)',
            '}',
            '',
            'func (m *Machine) Cancel() int {',
            '    m.mu.Lock()',
            '    defer m.mu.Unlock()',
            '    return m.state.Cancel(m)',
            '}',
            '',
            'func main() {',
            '    m := &Machine{state: idle{}, slots: map[string]*Slot{"A1": {"Cola", 15, 1}}}',
            '    fmt.Println(m.Select("A1")) // insert money first',
            '    m.Insert(10)',
            '    fmt.Println(m.Select("A1")) // insert 5 more',
            '    m.Insert(10)',
            '    fmt.Println(m.Select("A1")) // Cola 5 <nil>',
            '    m.Insert(5)',
            '    fmt.Println(m.Select("A1")) // Cola sold out',
            '    fmt.Println(m.Cancel())     // 5 refunded',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Library management system',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Book</code> (ISBN, title — catalogue entry), <code>Copy</code> (copy ID, ISBN, status), <code>Member</code> (ID, loan limit), <code>Loan</code> (copy, member, due date), hold queue per ISBN, <code>FinePolicy</code>.</li><li><strong>Relationships:</strong> Book 1 — * Copy (a title vs physical copies is the key modelling insight); Member 1 — * Loan; Loan → one Copy.</li><li><strong>Patterns:</strong> Strategy for fines (per-day, capped, member-tier), Observer/notifier when a held copy becomes available, repository interfaces for persistence.</li><li><strong>Rules:</strong> loan limit, no checkout of a copy on hold for someone else, FIFO hold queue, fines on late return.</li><li><strong>Concurrency:</strong> library-wide mutex is fine; per-ISBN locks if needed.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "errors"',
            '    "fmt"',
            '    "sync"',
            '    "time"',
            ')',
            '',
            'type CopyStatus int',
            '',
            'const (',
            '    Available CopyStatus = iota',
            '    OnLoan',
            '    OnHold',
            ')',
            '',
            'type Copy struct {',
            '    ID, ISBN string',
            '    Status   CopyStatus',
            '    HeldFor  string',
            '}',
            '',
            'type Loan struct {',
            '    CopyID, MemberID string',
            '    Due              time.Time',
            '}',
            '',
            'type FinePolicy func(late time.Duration) int64',
            '',
            'func PerDay(cents int64) FinePolicy {',
            '    return func(late time.Duration) int64 {',
            '        if late <= 0 {',
            '            return 0',
            '        }',
            '        return int64((late+24*time.Hour-1)/(24*time.Hour)) * cents',
            '    }',
            '}',
            '',
            'type Library struct {',
            '    mu      sync.Mutex',
            '    copies  map[string]*Copy // copyID -> copy',
            '    loans   map[string]*Loan // copyID -> active loan',
            '    perUser map[string]int',
            '    holds   map[string][]string // ISBN -> FIFO member queue',
            '    limit   int',
            '    fine    FinePolicy',
            '    notify  func(memberID, msg string)',
            '    now     func() time.Time',
            '}',
            '',
            'func (l *Library) Checkout(memberID, isbn string) (*Loan, error) {',
            '    l.mu.Lock()',
            '    defer l.mu.Unlock()',
            '    if l.perUser[memberID] >= l.limit {',
            '        return nil, errors.New("loan limit reached")',
            '    }',
            '    for _, c := range l.copies {',
            '        if c.ISBN != isbn {',
            '            continue',
            '        }',
            '        if c.Status == Available || (c.Status == OnHold && c.HeldFor == memberID) {',
            '            c.Status, c.HeldFor = OnLoan, ""',
            '            loan := &Loan{CopyID: c.ID, MemberID: memberID, Due: l.now().Add(14 * 24 * time.Hour)}',
            '            l.loans[c.ID] = loan',
            '            l.perUser[memberID]++',
            '            return loan, nil',
            '        }',
            '    }',
            '    l.holds[isbn] = append(l.holds[isbn], memberID)',
            '    return nil, errors.New("no copy available; hold placed")',
            '}',
            '',
            'func (l *Library) Return(copyID string) (fine int64, err error) {',
            '    l.mu.Lock()',
            '    defer l.mu.Unlock()',
            '    loan, ok := l.loans[copyID]',
            '    if !ok {',
            '        return 0, fmt.Errorf("copy %s is not on loan", copyID)',
            '    }',
            '    delete(l.loans, copyID)',
            '    l.perUser[loan.MemberID]--',
            '    c := l.copies[copyID]',
            '    if q := l.holds[c.ISBN]; len(q) > 0 {',
            '        c.Status, c.HeldFor = OnHold, q[0]',
            '        l.holds[c.ISBN] = q[1:]',
            '        l.notify(q[0], "your hold for "+c.ISBN+" is ready")',
            '    } else {',
            '        c.Status = Available',
            '    }',
            '    return l.fine(l.now().Sub(loan.Due)), nil',
            '}',
            '',
            'func main() {',
            '    clock := time.Date(2026, 3, 1, 10, 0, 0, 0, time.UTC)',
            '    lib := &Library{',
            '        copies:  map[string]*Copy{"c1": {ID: "c1", ISBN: "978-0"}},',
            '        loans:   map[string]*Loan{},',
            '        perUser: map[string]int{},',
            '        holds:   map[string][]string{},',
            '        limit:   3,',
            '        fine:    PerDay(25),',
            '        notify:  func(m, msg string) { fmt.Println("notify", m+":", msg) },',
            '        now:     func() time.Time { return clock },',
            '    }',
            '    lib.Checkout("ana", "978-0")',
            '    _, err := lib.Checkout("raj", "978-0")',
            '    fmt.Println(err)',
            '    clock = clock.Add(16 * 24 * time.Hour) // 2 days late',
            '    fmt.Println(lib.Return("c1"))          // notify raj; fine 50',
            '    _, err = lib.Checkout("raj", "978-0")',
            '    fmt.Println(err) // <nil>: held copy goes to raj',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'In-memory file system',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Node</code> interface (name, size), <code>Dir</code> (children map), <code>File</code> (content), <code>FS</code> (root, path resolution).</li><li><strong>Relationships:</strong> Dir *-- Nodes (composition, recursive tree).</li><li><strong>Patterns:</strong> <strong>Composite</strong> — <code>Size()</code> of a directory sums its children; Iterator/Visitor for traversal (find, du).</li><li><strong>Operations:</strong> <code>Mkdir</code> (create intermediate dirs, like <code>mkdir -p</code>), <code>WriteFile</code> (create or append), <code>ReadFile</code>, <code>Ls</code> (sorted; a file path lists just the file).</li><li><strong>Concurrency:</strong> <code>sync.RWMutex</code> on the FS (reads concurrent); finer: per-directory locks with top-down lock ordering. Extensions: permissions, rename/move, symlinks (cycle detection).</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "errors"',
            '    "fmt"',
            '    "slices"',
            '    "strings"',
            '    "sync"',
            ')',
            '',
            'type Node interface {',
            '    Name() string',
            '    Size() int',
            '}',
            '',
            'type File struct {',
            '    name    string',
            '    content []byte',
            '}',
            '',
            'func (f *File) Name() string { return f.name }',
            'func (f *File) Size() int    { return len(f.content) }',
            '',
            'type Dir struct {',
            '    name     string',
            '    children map[string]Node',
            '}',
            '',
            'func (d *Dir) Name() string { return d.name }',
            '',
            'func (d *Dir) Size() int { // Composite: aggregate over children',
            '    total := 0',
            '    for _, c := range d.children {',
            '        total += c.Size()',
            '    }',
            '    return total',
            '}',
            '',
            'type FS struct {',
            '    mu   sync.RWMutex',
            '    root *Dir',
            '}',
            '',
            'func NewFS() *FS { return &FS{root: &Dir{name: "/", children: map[string]Node{}}} }',
            '',
            'func split(path string) []string {',
            '    return strings.FieldsFunc(path, func(r rune) bool { return r == \'/\' })',
            '}',
            '',
            '// walk returns the directory for parts, creating missing dirs if create is true.',
            'func (fs *FS) walk(parts []string, create bool) (*Dir, error) {',
            '    cur := fs.root',
            '    for _, p := range parts {',
            '        n, ok := cur.children[p]',
            '        if !ok {',
            '            if !create {',
            '                return nil, fmt.Errorf("%s: no such directory", p)',
            '            }',
            '            n = &Dir{name: p, children: map[string]Node{}}',
            '            cur.children[p] = n',
            '        }',
            '        d, isDir := n.(*Dir)',
            '        if !isDir {',
            '            return nil, fmt.Errorf("%s: not a directory", p)',
            '        }',
            '        cur = d',
            '    }',
            '    return cur, nil',
            '}',
            '',
            'func (fs *FS) Mkdir(path string) error {',
            '    fs.mu.Lock()',
            '    defer fs.mu.Unlock()',
            '    _, err := fs.walk(split(path), true)',
            '    return err',
            '}',
            '',
            'func (fs *FS) WriteFile(path string, data []byte, appendMode bool) error {',
            '    fs.mu.Lock()',
            '    defer fs.mu.Unlock()',
            '    parts := split(path)',
            '    if len(parts) == 0 {',
            '        return errors.New("invalid path")',
            '    }',
            '    dir, err := fs.walk(parts[:len(parts)-1], true)',
            '    if err != nil {',
            '        return err',
            '    }',
            '    name := parts[len(parts)-1]',
            '    n, ok := dir.children[name]',
            '    if !ok {',
            '        n = &File{name: name}',
            '        dir.children[name] = n',
            '    }',
            '    f, isFile := n.(*File)',
            '    if !isFile {',
            '        return fmt.Errorf("%s is a directory", name)',
            '    }',
            '    if appendMode {',
            '        f.content = append(f.content, data...)',
            '    } else {',
            '        f.content = slices.Clone(data)',
            '    }',
            '    return nil',
            '}',
            '',
            'func (fs *FS) ReadFile(path string) ([]byte, error) {',
            '    fs.mu.RLock()',
            '    defer fs.mu.RUnlock()',
            '    parts := split(path)',
            '    if len(parts) == 0 {',
            '        return nil, errors.New("is a directory")',
            '    }',
            '    dir, err := fs.walk(parts[:len(parts)-1], false)',
            '    if err != nil {',
            '        return nil, err',
            '    }',
            '    f, ok := dir.children[parts[len(parts)-1]].(*File)',
            '    if !ok {',
            '        return nil, fmt.Errorf("%s: not a file", path)',
            '    }',
            '    return slices.Clone(f.content), nil',
            '}',
            '',
            'func (fs *FS) Ls(path string) ([]string, error) {',
            '    fs.mu.RLock()',
            '    defer fs.mu.RUnlock()',
            '    parts := split(path)',
            '    if len(parts) > 0 {',
            '        parent, err := fs.walk(parts[:len(parts)-1], false)',
            '        if err != nil {',
            '            return nil, err',
            '        }',
            '        if f, ok := parent.children[parts[len(parts)-1]].(*File); ok {',
            '            return []string{f.Name()}, nil',
            '        }',
            '    }',
            '    dir, err := fs.walk(parts, false)',
            '    if err != nil {',
            '        return nil, err',
            '    }',
            '    names := make([]string, 0, len(dir.children))',
            '    for name := range dir.children {',
            '        names = append(names, name)',
            '    }',
            '    slices.Sort(names)',
            '    return names, nil',
            '}',
            '',
            'func main() {',
            '    fs := NewFS()',
            '    fs.Mkdir("/a/b/c")',
            '    fs.WriteFile("/a/b/notes.txt", []byte("hello"), false)',
            '    fs.WriteFile("/a/b/notes.txt", []byte(" world"), true)',
            '    data, _ := fs.ReadFile("/a/b/notes.txt")',
            '    ls, _ := fs.Ls("/a/b")',
            '    fmt.Println(string(data), ls, fs.root.Size()) // hello world [c notes.txt] 11',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Elevator system',
          d: 'hard',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Controller</code> (elevators, dispatcher), <code>Elevator</code> (ID, current floor, direction, stop set, door state), <code>HallCall</code> (floor, direction), car call (destination), <code>Dispatcher</code> strategy.</li><li><strong>Relationships:</strong> Controller *-- Elevators; Controller uses one Dispatcher; each Elevator owns its stops.</li><li><strong>Patterns:</strong> Strategy for dispatching (nearest car, zoning, least-loaded, destination dispatch); State for elevator (Idle, MovingUp, MovingDown, DoorsOpen, Maintenance); <strong>LOOK</strong> scheduling inside an elevator: keep moving in the current direction while stops remain ahead, then reverse.</li><li><strong>Simulation:</strong> discrete <code>Step()</code> ticks make it deterministic and testable.</li><li><strong>Concurrency:</strong> requests arrive concurrently → controller mutex (or an event loop goroutine consuming a request channel).</li><li><strong>Extensions:</strong> capacity/weight, emergency mode, VIP floors, energy-saving parking.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "fmt"',
            '    "sync"',
            ')',
            '',
            'type Direction int',
            '',
            'const (',
            '    Idle Direction = iota',
            '    Up',
            '    Down',
            ')',
            '',
            'type Elevator struct {',
            '    ID    int',
            '    Floor int',
            '    Dir   Direction',
            '    stops map[int]bool',
            '}',
            '',
            'func (e *Elevator) hasStops(pred func(int) bool) bool {',
            '    for f := range e.stops {',
            '        if pred(f) {',
            '            return true',
            '        }',
            '    }',
            '    return false',
            '}',
            '',
            '// Step advances one tick using the LOOK algorithm.',
            'func (e *Elevator) Step() {',
            '    if e.stops[e.Floor] {',
            '        delete(e.stops, e.Floor)',
            '        fmt.Printf("elevator %d: doors open at %d\\n", e.ID, e.Floor)',
            '        return',
            '    }',
            '    above := e.hasStops(func(f int) bool { return f > e.Floor })',
            '    below := e.hasStops(func(f int) bool { return f < e.Floor })',
            '    switch {',
            '    case e.Dir != Down && above:',
            '        e.Dir = Up',
            '        e.Floor++',
            '    case below:',
            '        e.Dir = Down',
            '        e.Floor--',
            '    case above:',
            '        e.Dir = Up',
            '        e.Floor++',
            '    default:',
            '        e.Dir = Idle',
            '    }',
            '}',
            '',
            'type Dispatcher interface {',
            '    Pick(elevators []*Elevator, floor int, dir Direction) *Elevator',
            '}',
            '',
            '// NearestCar prefers idle cars or cars already heading toward the floor in the same direction.',
            'type NearestCar struct{}',
            '',
            'func (NearestCar) Pick(es []*Elevator, floor int, dir Direction) *Elevator {',
            '    var best *Elevator',
            '    bestCost := 1 << 30',
            '    for _, e := range es {',
            '        dist := max(e.Floor-floor, floor-e.Floor)',
            '        cost := dist',
            '        onTheWay := (e.Dir == Up && dir == Up && e.Floor <= floor) ||',
            '            (e.Dir == Down && dir == Down && e.Floor >= floor)',
            '        if e.Dir != Idle && !onTheWay {',
            '            cost += 100 // must finish current sweep first',
            '        }',
            '        if cost < bestCost {',
            '            best, bestCost = e, cost',
            '        }',
            '    }',
            '    return best',
            '}',
            '',
            'type Controller struct {',
            '    mu         sync.Mutex',
            '    elevators  []*Elevator',
            '    dispatcher Dispatcher',
            '}',
            '',
            'func NewController(n int, d Dispatcher) *Controller {',
            '    c := &Controller{dispatcher: d}',
            '    for i := 0; i < n; i++ {',
            '        c.elevators = append(c.elevators, &Elevator{ID: i, stops: map[int]bool{}})',
            '    }',
            '    return c',
            '}',
            '',
            'func (c *Controller) HallCall(floor int, dir Direction) int {',
            '    c.mu.Lock()',
            '    defer c.mu.Unlock()',
            '    e := c.dispatcher.Pick(c.elevators, floor, dir)',
            '    e.stops[floor] = true',
            '    return e.ID',
            '}',
            '',
            'func (c *Controller) CarCall(id, floor int) {',
            '    c.mu.Lock()',
            '    defer c.mu.Unlock()',
            '    c.elevators[id].stops[floor] = true',
            '}',
            '',
            'func (c *Controller) Step() {',
            '    c.mu.Lock()',
            '    defer c.mu.Unlock()',
            '    for _, e := range c.elevators {',
            '        e.Step()',
            '    }',
            '}',
            '',
            'func main() {',
            '    c := NewController(2, NearestCar{})',
            '    id := c.HallCall(5, Up)',
            '    for i := 0; i < 6; i++ {',
            '        c.Step()',
            '    }',
            '    c.CarCall(id, 2) // passenger goes down to 2',
            '    for i := 0; i < 4; i++ {',
            '        c.Step()',
            '    }',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'BookMyShow — seat booking with concurrency',
          d: 'hard',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Movie</code>, <code>Theatre</code>, <code>Screen</code>, <code>Seat</code> (row, number, category), <code>Show</code> (movie, screen, start), <code>ShowSeat</code> (per-show state: Available / Held(user, expiresAt) / Booked), <code>Hold</code>, <code>Booking</code>, payment gateway, pricing strategy.</li><li><strong>Relationships:</strong> Theatre *-- Screens *-- Seats; Show → one Screen; Show *-- ShowSeats (the aggregate that needs concurrency control).</li><li><strong>Patterns:</strong> Strategy for pricing (category, weekend, dynamic); State for booking lifecycle; Observer for notifications; repository interfaces.</li><li><strong>Concurrency (the core of this question):</strong> holds are <strong>all-or-nothing</strong> under a per-show lock; holds expire after a TTL (lazy expiry on access); confirm only if the hold is still valid, then payment; in a DB, use conditional updates (<code>UPDATE show_seats SET status=\'HELD\' ... WHERE status=\'AVAILABLE\' OR hold_expires_at &lt; now()</code>) or a unique constraint on <code>(show_id, seat_id)</code> in bookings; at scale, Redis <code>SET NX PX</code> per seat.</li><li><strong>Edge cases:</strong> payment succeeds after hold expiry (refund), double-click confirm (idempotent), partial seat availability.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "errors"',
            '    "fmt"',
            '    "sync"',
            '    "time"',
            ')',
            '',
            'type seatState struct {',
            '    booked    bool',
            '    heldBy    string // hold ID',
            '    expiresAt time.Time',
            '}',
            '',
            'type Hold struct {',
            '    ID, User  string',
            '    Seats     []string',
            '    ExpiresAt time.Time',
            '}',
            '',
            'var (',
            '    ErrUnavailable = errors.New("one or more seats unavailable")',
            '    ErrHoldExpired = errors.New("hold expired or unknown")',
            ')',
            '',
            '// ShowInventory is the aggregate guarded by one lock per show.',
            'type ShowInventory struct {',
            '    mu     sync.Mutex',
            '    seats  map[string]*seatState',
            '    holds  map[string]*Hold',
            '    nextID int',
            '    ttl    time.Duration',
            '    now    func() time.Time',
            '}',
            '',
            'func NewShow(seatIDs []string, ttl time.Duration, now func() time.Time) *ShowInventory {',
            '    s := &ShowInventory{seats: map[string]*seatState{}, holds: map[string]*Hold{}, ttl: ttl, now: now}',
            '    for _, id := range seatIDs {',
            '        s.seats[id] = &seatState{}',
            '    }',
            '    return s',
            '}',
            '',
            'func (s *ShowInventory) free(st *seatState, t time.Time) bool {',
            '    return !st.booked && (st.heldBy == "" || t.After(st.expiresAt)) // lazy expiry',
            '}',
            '',
            '// HoldSeats is all-or-nothing: either every requested seat is held or none.',
            'func (s *ShowInventory) HoldSeats(user string, ids []string) (*Hold, error) {',
            '    s.mu.Lock()',
            '    defer s.mu.Unlock()',
            '    t := s.now()',
            '    for _, id := range ids {',
            '        st, ok := s.seats[id]',
            '        if !ok || !s.free(st, t) {',
            '            return nil, fmt.Errorf("%w: %s", ErrUnavailable, id)',
            '        }',
            '    }',
            '    s.nextID++',
            '    h := &Hold{ID: fmt.Sprintf("h%d", s.nextID), User: user, Seats: ids, ExpiresAt: t.Add(s.ttl)}',
            '    for _, id := range ids {',
            '        *s.seats[id] = seatState{heldBy: h.ID, expiresAt: h.ExpiresAt}',
            '    }',
            '    s.holds[h.ID] = h',
            '    return h, nil',
            '}',
            '',
            '// Confirm converts a valid hold into a booking (call after payment authorisation).',
            'func (s *ShowInventory) Confirm(holdID string) error {',
            '    s.mu.Lock()',
            '    defer s.mu.Unlock()',
            '    h, ok := s.holds[holdID]',
            '    if !ok || s.now().After(h.ExpiresAt) {',
            '        return ErrHoldExpired // caller must void/refund the payment',
            '    }',
            '    for _, id := range h.Seats {',
            '        *s.seats[id] = seatState{booked: true}',
            '    }',
            '    delete(s.holds, holdID)',
            '    return nil',
            '}',
            '',
            'func main() {',
            '    clock := time.Date(2026, 5, 1, 18, 0, 0, 0, time.UTC)',
            '    show := NewShow([]string{"A1", "A2", "A3"}, 5*time.Minute, func() time.Time { return clock })',
            '',
            '    var wg sync.WaitGroup',
            '    results := make([]error, 2)',
            '    for i, user := range []string{"ana", "raj"} {',
            '        wg.Add(1)',
            '        go func() {',
            '            defer wg.Done()',
            '            _, results[i] = show.HoldSeats(user, []string{"A2", "A3"})',
            '        }()',
            '    }',
            '    wg.Wait()',
            '    fmt.Println(results) // exactly one nil',
            '',
            '    h, err := show.HoldSeats("kim", []string{"A1"})',
            '    fmt.Println(err)',
            '    clock = clock.Add(6 * time.Minute) // hold expires',
            '    fmt.Println(show.Confirm(h.ID))    // hold expired or unknown',
            '    _, err = show.HoldSeats("lee", []string{"A1"})',
            '    fmt.Println(err) // <nil>: expired hold released lazily',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Splitwise — expense sharing and settlement',
          d: 'hard',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>User</code>, <code>Group</code>, <code>Expense</code> (payer, amount, participants, split type), <code>SplitStrategy</code> (Equal, Exact, Percent), balance ledger, <code>Transfer</code> (settlement suggestion).</li><li><strong>Relationships:</strong> Group *-- Expenses; Expense → one payer, many participants; ledger aggregates net balances per user.</li><li><strong>Patterns:</strong> Strategy for split types (validation inside each), Factory to build a strategy from input, Observer for notifications.</li><li><strong>Correctness:</strong> integer cents; distribute equal-split remainders deterministically; invariant: Σ net balances = 0.</li><li><strong>Simplify debts:</strong> net each user, then greedily match the largest creditor with the largest debtor → at most n−1 transfers. (Finding the true minimum number of transfers is NP-hard; greedy is the expected answer.)</li><li><strong>Concurrency:</strong> ledger mutex; per-group locks at scale.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "cmp"',
            '    "errors"',
            '    "fmt"',
            '    "slices"',
            '    "sync"',
            ')',
            '',
            'type SplitStrategy interface {',
            '    Shares(total int64, users []string) (map[string]int64, error)',
            '}',
            '',
            'type Equal struct{}',
            '',
            'func (Equal) Shares(total int64, users []string) (map[string]int64, error) {',
            '    if len(users) == 0 {',
            '        return nil, errors.New("no participants")',
            '    }',
            '    n := int64(len(users))',
            '    out := map[string]int64{}',
            '    for i, u := range users {',
            '        out[u] = total / n',
            '        if int64(i) < total%n { // spread remainder cents',
            '            out[u]++',
            '        }',
            '    }',
            '    return out, nil',
            '}',
            '',
            'type Exact map[string]int64',
            '',
            'func (e Exact) Shares(total int64, _ []string) (map[string]int64, error) {',
            '    var sum int64',
            '    for _, v := range e {',
            '        sum += v',
            '    }',
            '    if sum != total {',
            '        return nil, fmt.Errorf("exact shares sum %d != total %d", sum, total)',
            '    }',
            '    return e, nil',
            '}',
            '',
            'type Transfer struct {',
            '    From, To string',
            '    Amount   int64',
            '}',
            '',
            'type Ledger struct {',
            '    mu  sync.Mutex',
            '    net map[string]int64 // > 0: is owed money; < 0: owes money',
            '}',
            '',
            'func (l *Ledger) AddExpense(payer string, total int64, users []string, s SplitStrategy) error {',
            '    shares, err := s.Shares(total, users)',
            '    if err != nil {',
            '        return err',
            '    }',
            '    l.mu.Lock()',
            '    defer l.mu.Unlock()',
            '    l.net[payer] += total',
            '    for u, amt := range shares {',
            '        l.net[u] -= amt',
            '    }',
            '    return nil',
            '}',
            '',
            '// Settle greedily matches largest creditor with largest debtor (<= n-1 transfers).',
            'func (l *Ledger) Settle() []Transfer {',
            '    l.mu.Lock()',
            '    defer l.mu.Unlock()',
            '    type bal struct {',
            '        user string',
            '        amt  int64',
            '    }',
            '    var cred, debt []bal',
            '    for u, v := range l.net {',
            '        if v > 0 {',
            '            cred = append(cred, bal{u, v})',
            '        } else if v < 0 {',
            '            debt = append(debt, bal{u, -v})',
            '        }',
            '    }',
            '    desc := func(a, b bal) int { return cmp.Compare(b.amt, a.amt) }',
            '    slices.SortFunc(cred, desc)',
            '    slices.SortFunc(debt, desc)',
            '    var out []Transfer',
            '    for i, j := 0, 0; i < len(cred) && j < len(debt); {',
            '        x := min(cred[i].amt, debt[j].amt)',
            '        out = append(out, Transfer{From: debt[j].user, To: cred[i].user, Amount: x})',
            '        cred[i].amt -= x',
            '        debt[j].amt -= x',
            '        if cred[i].amt == 0 {',
            '            i++',
            '        }',
            '        if debt[j].amt == 0 {',
            '            j++',
            '        }',
            '    }',
            '    return out',
            '}',
            '',
            'func main() {',
            '    l := &Ledger{net: map[string]int64{}}',
            '    l.AddExpense("ana", 3000, []string{"ana", "raj", "kim"}, Equal{})',
            '    l.AddExpense("raj", 1000, nil, Exact{"kim": 1000})',
            '    for _, t := range l.Settle() {',
            '        fmt.Printf("%s pays %s %d cents\\n", t.From, t.To, t.Amount)',
            '    }',
            '    // kim pays ana 2000 cents',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Pub/sub message broker',
          d: 'hard',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Broker</code>, <code>Topic</code> (append-only log, optionally partitions), <code>Message</code> (offset, key, value, timestamp), consumer group with committed offsets, subscriber/consumer.</li><li><strong>Relationships:</strong> Broker *-- Topics; Topic *-- Messages; each (group, topic) has one committed offset (per partition when partitioned).</li><li><strong>Patterns:</strong> Observer (wake waiting consumers), Iterator (offset cursor), Strategy for partition assignment (hash of key) and retention (time/size).</li><li><strong>Semantics:</strong> pull-based consumption with long polling; <strong>at-least-once</strong> — consumer commits after processing, so a crash replays from the last commit; per-key ordering via partitioning; retention trims old messages.</li><li><strong>Concurrency:</strong> RWMutex per topic; broadcast to waiters by closing and replacing a channel on each publish (no busy polling); <code>context</code> for poll timeouts.</li><li><strong>Extensions:</strong> partitions + group rebalancing, DLQ, ack timeouts (queue semantics), persistence via segment files.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "context"',
            '    "fmt"',
            '    "sync"',
            '    "time"',
            ')',
            '',
            'type Message struct {',
            '    Offset int64',
            '    Key    string',
            '    Value  []byte',
            '}',
            '',
            'type topic struct {',
            '    mu     sync.RWMutex',
            '    log    []Message',
            '    notify chan struct{} // closed on every publish to wake all waiters',
            '}',
            '',
            'type Broker struct {',
            '    mu      sync.Mutex',
            '    topics  map[string]*topic',
            '    offsets map[string]int64 // "group/topic" -> next offset to read',
            '}',
            '',
            'func NewBroker() *Broker {',
            '    return &Broker{topics: map[string]*topic{}, offsets: map[string]int64{}}',
            '}',
            '',
            'func (b *Broker) topic(name string) *topic {',
            '    b.mu.Lock()',
            '    defer b.mu.Unlock()',
            '    t, ok := b.topics[name]',
            '    if !ok {',
            '        t = &topic{notify: make(chan struct{})}',
            '        b.topics[name] = t',
            '    }',
            '    return t',
            '}',
            '',
            'func (b *Broker) Publish(topicName, key string, v []byte) int64 {',
            '    t := b.topic(topicName)',
            '    t.mu.Lock()',
            '    off := int64(len(t.log))',
            '    t.log = append(t.log, Message{Offset: off, Key: key, Value: v})',
            '    close(t.notify) // broadcast',
            '    t.notify = make(chan struct{})',
            '    t.mu.Unlock()',
            '    return off',
            '}',
            '',
            '// Poll long-polls for up to max messages after the group\'s committed offset.',
            'func (b *Broker) Poll(ctx context.Context, topicName, group string, max int) ([]Message, error) {',
            '    t := b.topic(topicName)',
            '    for {',
            '        b.mu.Lock()',
            '        from := b.offsets[group+"/"+topicName]',
            '        b.mu.Unlock()',
            '',
            '        t.mu.RLock()',
            '        if from < int64(len(t.log)) {',
            '            end := min(int64(len(t.log)), from+int64(max))',
            '            out := append([]Message(nil), t.log[from:end]...)',
            '            t.mu.RUnlock()',
            '            return out, nil',
            '        }',
            '        wait := t.notify',
            '        t.mu.RUnlock()',
            '',
            '        select {',
            '        case <-wait:',
            '        case <-ctx.Done():',
            '            return nil, ctx.Err()',
            '        }',
            '    }',
            '}',
            '',
            '// Commit records progress after processing (at-least-once).',
            'func (b *Broker) Commit(topicName, group string, nextOffset int64) {',
            '    b.mu.Lock()',
            '    defer b.mu.Unlock()',
            '    if k := group + "/" + topicName; nextOffset > b.offsets[k] {',
            '        b.offsets[k] = nextOffset',
            '    }',
            '}',
            '',
            'func main() {',
            '    br := NewBroker()',
            '    done := make(chan struct{})',
            '    go func() { // consumer in group "billing"',
            '        defer close(done)',
            '        ctx, cancel := context.WithTimeout(context.Background(), time.Second)',
            '        defer cancel()',
            '        for received := 0; received < 3; {',
            '            msgs, err := br.Poll(ctx, "orders", "billing", 10)',
            '            if err != nil {',
            '                fmt.Println("poll:", err)',
            '                return',
            '            }',
            '            for _, m := range msgs {',
            '                fmt.Println("billing got", m.Offset, string(m.Value))',
            '            }',
            '            received += len(msgs)',
            '            br.Commit("orders", "billing", msgs[len(msgs)-1].Offset+1)',
            '        }',
            '    }()',
            '    for i := 1; i <= 3; i++ {',
            '        br.Publish("orders", "o", []byte(fmt.Sprintf("order-%d", i)))',
            '    }',
            '    <-done',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Tic-tac-toe (N×N) with O(1) win check',
          d: 'easy',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Game</code> (board size n, cells, current turn, status, winner), <code>Mark</code> enum (Empty, X, O), <code>Status</code> enum (InProgress, Won, Draw); <code>Player</code> only if names, scores or AI strategies are needed.</li><li><strong>O(1) win check:</strong> keep running sums per row, per column and for both diagonals: +1 for X, −1 for O. After a move only that row, column and possibly the diagonals change; a line is complete when its absolute sum equals n. No board scan.</li><li><strong>Validation:</strong> in range, cell empty, game not over; return typed errors, do not panic.</li><li><strong>Draw:</strong> move count reaches n².</li><li><strong>Extensions:</strong> k-in-a-row on a large board (check outward from the last move in 4 directions instead), more than two players (a counter array per player), undo (Command pattern: store moves and reverse the sums), computer player (Strategy: random, minimax for 3×3).</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "errors"',
            '    "fmt"',
            ')',
            '',
            'type Mark int',
            '',
            'const (',
            '    Empty Mark = iota',
            '    X',
            '    O',
            ')',
            '',
            'func (m Mark) String() string { return [...]string{".", "X", "O"}[m] }',
            '',
            'type Status int',
            '',
            'const (',
            '    InProgress Status = iota',
            '    Won',
            '    Draw',
            ')',
            '',
            'var (',
            '    ErrGameOver   = errors.New("game is over")',
            '    ErrOutOfRange = errors.New("cell out of range")',
            '    ErrOccupied   = errors.New("cell occupied")',
            ')',
            '',
            '// Game keeps running sums per row, column and diagonal: +1 for X, -1 for O.',
            '// A line is complete when its absolute sum reaches n, so each move is checked in O(1).',
            'type Game struct {',
            '    n          int',
            '    cells      [][]Mark',
            '    rows, cols []int',
            '    diag, anti int',
            '    turn       Mark',
            '    moves      int',
            '    status     Status',
            '    winner     Mark',
            '}',
            '',
            'func NewGame(n int) *Game {',
            '    cells := make([][]Mark, n)',
            '    for i := range cells {',
            '        cells[i] = make([]Mark, n)',
            '    }',
            '    return &Game{n: n, cells: cells, rows: make([]int, n), cols: make([]int, n), turn: X}',
            '}',
            '',
            'func abs(v int) int {',
            '    if v < 0 {',
            '        return -v',
            '    }',
            '    return v',
            '}',
            '',
            '// Play places the current player\'s mark at (r, c) and returns the new status.',
            'func (g *Game) Play(r, c int) (Status, error) {',
            '    if g.status != InProgress {',
            '        return g.status, ErrGameOver',
            '    }',
            '    if r < 0 || r >= g.n || c < 0 || c >= g.n {',
            '        return g.status, ErrOutOfRange',
            '    }',
            '    if g.cells[r][c] != Empty {',
            '        return g.status, ErrOccupied',
            '    }',
            '    g.cells[r][c] = g.turn',
            '    d := 1',
            '    if g.turn == O {',
            '        d = -1',
            '    }',
            '    g.rows[r] += d',
            '    g.cols[c] += d',
            '    if r == c {',
            '        g.diag += d',
            '    }',
            '    if r+c == g.n-1 {',
            '        g.anti += d',
            '    }',
            '    g.moves++',
            '    switch {',
            '    case abs(g.rows[r]) == g.n || abs(g.cols[c]) == g.n || abs(g.diag) == g.n || abs(g.anti) == g.n:',
            '        g.status, g.winner = Won, g.turn',
            '    case g.moves == g.n*g.n:',
            '        g.status = Draw',
            '    default:',
            '        if g.turn == X {',
            '            g.turn = O',
            '        } else {',
            '            g.turn = X',
            '        }',
            '    }',
            '    return g.status, nil',
            '}',
            '',
            'func (g *Game) String() string {',
            '    s := ""',
            '    for _, row := range g.cells {',
            '        for _, m := range row {',
            '            s += m.String()',
            '        }',
            '        s += "\\n"',
            '    }',
            '    return s',
            '}',
            '',
            'func main() {',
            '    g := NewGame(3)',
            '    for _, mv := range [][2]int{{0, 0}, {1, 1}, {0, 1}, {2, 2}, {0, 2}} {',
            '        st, err := g.Play(mv[0], mv[1])',
            '        if err != nil {',
            '            fmt.Println(err)',
            '        }',
            '        if st == Won {',
            '            fmt.Printf("%v wins\\n%v", g.winner, g)',
            '        }',
            '    }',
            '    _, err := g.Play(2, 0)',
            '    fmt.Println(err) // game is over',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Meeting room scheduler with conflict detection',
          d: 'medium',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Room</code> (ID, capacity, its bookings), <code>Booking</code> (ID, room, organiser, interval), <code>Interval</code> value object (half-open [start, end) so back-to-back meetings do not clash), <code>Scheduler</code> (rooms, room-selection policy).</li><li><strong>Conflict rule:</strong> intervals a and b overlap iff <code>a.start &lt; b.end &amp;&amp; b.start &lt; a.end</code>.</li><li><strong>Data structure:</strong> per-room bookings sorted by start; a binary search for the first booking starting at or after the new end means only its predecessor can overlap → O(log n) check (insertion into a slice is O(n); use a balanced tree or skip list for very busy rooms).</li><li><strong>Room choice (Strategy):</strong> smallest room with enough capacity that is free (best fit) keeps big rooms for big meetings.</li><li><strong>Concurrency:</strong> one mutex per room; check and insert under the same lock, so two organisers can never both win the same slot, while different rooms book in parallel.</li><li><strong>Extensions:</strong> recurring meetings (expand occurrences and book all-or-nothing), cancellation, &quot;find the first free slot of 30 min for these attendees&quot; (merge busy intervals), notifications to attendees (Observer).</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "errors"',
            '    "fmt"',
            '    "slices"',
            '    "sync"',
            '    "time"',
            ')',
            '',
            'var ErrNoRoom = errors.New("no room available")',
            '',
            '// Interval is a half-open value object [Start, End): back-to-back meetings do not clash.',
            'type Interval struct{ Start, End time.Time }',
            '',
            'func (a Interval) Overlaps(b Interval) bool { return a.Start.Before(b.End) && b.Start.Before(a.End) }',
            '',
            'type Booking struct {',
            '    ID, RoomID, Organizer string',
            '    When                  Interval',
            '}',
            '',
            'type Room struct {',
            '    ID       string',
            '    Capacity int',
            '    mu       sync.Mutex',
            '    bookings []Booking // sorted by When.Start',
            '}',
            '',
            '// free reports whether iv fits; caller holds r.mu. Binary search finds the first booking',
            '// that starts at or after iv.End; only its predecessor can overlap: O(log n).',
            'func (r *Room) free(iv Interval) bool {',
            '    i, _ := slices.BinarySearchFunc(r.bookings, iv.End, func(b Booking, t time.Time) int {',
            '        return b.When.Start.Compare(t)',
            '    })',
            '    return i == 0 || !r.bookings[i-1].When.Overlaps(iv)',
            '}',
            '',
            'func (r *Room) insert(b Booking) { // caller holds r.mu',
            '    i, _ := slices.BinarySearchFunc(r.bookings, b.When.Start, func(x Booking, t time.Time) int {',
            '        return x.When.Start.Compare(t)',
            '    })',
            '    r.bookings = slices.Insert(r.bookings, i, b)',
            '}',
            '',
            'type Scheduler struct {',
            '    rooms []*Room // sorted by capacity ascending => first fit is the best fit',
            '    seq   int',
            '    seqMu sync.Mutex',
            '}',
            '',
            'func NewScheduler(rooms ...*Room) *Scheduler {',
            '    slices.SortFunc(rooms, func(a, b *Room) int { return a.Capacity - b.Capacity })',
            '    return &Scheduler{rooms: rooms}',
            '}',
            '',
            'func (s *Scheduler) nextID() string {',
            '    s.seqMu.Lock()',
            '    defer s.seqMu.Unlock()',
            '    s.seq++',
            '    return fmt.Sprintf("bk-%d", s.seq)',
            '}',
            '',
            '// Book reserves the smallest room with enough capacity that is free for iv.',
            '// Each room has its own lock, so bookings for different rooms proceed in parallel, and the',
            '// check and the insert happen under the same lock (no double booking).',
            'func (s *Scheduler) Book(organizer string, people int, iv Interval) (Booking, error) {',
            '    if !iv.Start.Before(iv.End) {',
            '        return Booking{}, errors.New("invalid interval")',
            '    }',
            '    for _, r := range s.rooms {',
            '        if r.Capacity < people {',
            '            continue',
            '        }',
            '        r.mu.Lock()',
            '        if r.free(iv) {',
            '            b := Booking{ID: s.nextID(), RoomID: r.ID, Organizer: organizer, When: iv}',
            '            r.insert(b)',
            '            r.mu.Unlock()',
            '            return b, nil',
            '        }',
            '        r.mu.Unlock()',
            '    }',
            '    return Booking{}, ErrNoRoom',
            '}',
            '',
            'func main() {',
            '    s := NewScheduler(&Room{ID: "board", Capacity: 12}, &Room{ID: "focus", Capacity: 4})',
            '    at := func(h, m int) time.Time { return time.Date(2026, 10, 29, h, m, 0, 0, time.UTC) }',
            '    b1, _ := s.Book("ana", 3, Interval{at(10, 0), at(11, 0)})',
            '    b2, _ := s.Book("bo", 3, Interval{at(10, 30), at(11, 30)}) // focus busy -> board',
            '    b3, _ := s.Book("cy", 2, Interval{at(11, 0), at(12, 0)})   // back-to-back in focus is fine',
            '    _, err := s.Book("di", 10, Interval{at(10, 45), at(11, 15)})',
            '    fmt.Println(b1.RoomID, b2.RoomID, b3.RoomID, err) // focus board focus no room available',
            '}'
          ].join('\n'),
          lang: 'go'
        },
        {
          t: 'Concurrent task scheduler (delayed and recurring jobs)',
          d: 'hard',
          type: 'coding',
          hint: '<ul><li><strong>Entities:</strong> <code>Task</code> (ID, run time, optional interval for recurring, function), <code>Scheduler</code> (min-heap of tasks ordered by run time, index by ID, bounded worker pool, wake-up channel).</li><li><strong>Dispatch loop:</strong> under the lock pop every task whose time has come; release the lock; hand tasks to workers through a semaphore (backpressure when all workers are busy); then sleep until the earliest remaining task <em>or</em> a wake-up signal (a new task may be earlier) <em>or</em> shutdown.</li><li><strong>Recurring tasks:</strong> fixed rate (next = scheduled time + interval, no drift) vs fixed delay (next = finish time + interval); say which you implement.</li><li><strong>Cancel:</strong> lazy deletion — mark the task cancelled and skip it when it surfaces (O(1)), or <code>heap.Remove</code> by index (O(log n)).</li><li><strong>Robustness:</strong> never run task code while holding the lock, recover panics per task, stop via <code>context</code> and wait for in-flight tasks with a <code>WaitGroup</code>, inject a clock for deterministic tests.</li><li><strong>Distributed extension:</strong> persist tasks (DB + <code>SKIP LOCKED</code> leases), partition the timeline across scheduler instances, at-least-once execution with idempotent tasks — see the HLD distributed job scheduler.</li></ul>',
          solution: [
            'package main',
            '',
            'import (',
            '    "container/heap"',
            '    "context"',
            '    "fmt"',
            '    "sync"',
            '    "time"',
            ')',
            '',
            'type Task struct {',
            '    ID       string',
            '    RunAt    time.Time',
            '    Every    time.Duration // 0 = one-off; > 0 = recurring at a fixed rate',
            '    Run      func(ctx context.Context)',
            '    canceled bool',
            '    index    int // position in the heap',
            '}',
            '',
            '// taskHeap is a min-heap ordered by RunAt (container/heap).',
            'type taskHeap []*Task',
            '',
            'func (h taskHeap) Len() int           { return len(h) }',
            'func (h taskHeap) Less(i, j int) bool { return h[i].RunAt.Before(h[j].RunAt) }',
            'func (h taskHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i]; h[i].index = i; h[j].index = j }',
            'func (h *taskHeap) Push(x any)        { t := x.(*Task); t.index = len(*h); *h = append(*h, t) }',
            'func (h *taskHeap) Pop() any {',
            '    old := *h',
            '    t := old[len(old)-1]',
            '    *h = old[:len(old)-1]',
            '    return t',
            '}',
            '',
            'type Scheduler struct {',
            '    mu    sync.Mutex',
            '    tasks taskHeap',
            '    byID  map[string]*Task',
            '    wake  chan struct{} // nudges the loop when an earlier task arrives',
            '    sem   chan struct{} // bounded worker pool',
            '    wg    sync.WaitGroup',
            '}',
            '',
            'func New(workers int) *Scheduler {',
            '    return &Scheduler{byID: map[string]*Task{}, wake: make(chan struct{}, 1), sem: make(chan struct{}, workers)}',
            '}',
            '',
            'func (s *Scheduler) Schedule(t *Task) {',
            '    s.mu.Lock()',
            '    heap.Push(&s.tasks, t)',
            '    s.byID[t.ID] = t',
            '    s.mu.Unlock()',
            '    select { // non-blocking: one pending wake-up is enough',
            '    case s.wake <- struct{}{}:',
            '    default:',
            '    }',
            '}',
            '',
            '// Cancel is lazy: the task stays in the heap and is skipped when it surfaces.',
            'func (s *Scheduler) Cancel(id string) {',
            '    s.mu.Lock()',
            '    defer s.mu.Unlock()',
            '    if t, ok := s.byID[id]; ok {',
            '        t.canceled = true',
            '        delete(s.byID, id)',
            '    }',
            '}',
            '',
            '// Run is the dispatch loop: sleep until the earliest task is due (or a new task wakes it),',
            '// pop due tasks, hand them to workers, and re-queue recurring ones. Never run task code',
            '// while holding the lock.',
            'func (s *Scheduler) Run(ctx context.Context) {',
            '    timer := time.NewTimer(time.Hour)',
            '    defer timer.Stop()',
            '    for {',
            '        s.mu.Lock()',
            '        var due []*Task',
            '        now := time.Now()',
            '        for s.tasks.Len() > 0 && !s.tasks[0].RunAt.After(now) {',
            '            t := heap.Pop(&s.tasks).(*Task)',
            '            if t.canceled {',
            '                continue',
            '            }',
            '            due = append(due, t)',
            '            if t.Every > 0 { // fixed rate: next slot from the scheduled time, not from now',
            '                next := &Task{ID: t.ID, RunAt: t.RunAt.Add(t.Every), Every: t.Every, Run: t.Run}',
            '                heap.Push(&s.tasks, next)',
            '                s.byID[t.ID] = next',
            '            } else {',
            '                delete(s.byID, t.ID)',
            '            }',
            '        }',
            '        wait := time.Hour',
            '        if s.tasks.Len() > 0 {',
            '            wait = time.Until(s.tasks[0].RunAt)',
            '        }',
            '        s.mu.Unlock()',
            '',
            '        for _, t := range due {',
            '            select {',
            '            case s.sem <- struct{}{}: // blocks when all workers are busy: backpressure',
            '            case <-ctx.Done():',
            '                s.wg.Wait()',
            '                return',
            '            }',
            '            s.wg.Add(1)',
            '            go func(t *Task) {',
            '                defer func() {',
            '                    if r := recover(); r != nil { // one bad task must not kill the scheduler',
            '                        fmt.Println("task", t.ID, "panicked:", r)',
            '                    }',
            '                    <-s.sem',
            '                    s.wg.Done()',
            '                }()',
            '                t.Run(ctx)',
            '            }(t)',
            '        }',
            '',
            '        timer.Reset(wait) // Go 1.23+: Reset on an unexpired timer is safe, no drain needed',
            '        select {',
            '        case <-timer.C:',
            '        case <-s.wake:',
            '        case <-ctx.Done():',
            '            s.wg.Wait() // graceful shutdown: let in-flight tasks finish',
            '            return',
            '        }',
            '    }',
            '}',
            '',
            'func main() {',
            '    ctx, cancel := context.WithTimeout(context.Background(), 350*time.Millisecond)',
            '    defer cancel()',
            '    s := New(4)',
            '    start := time.Now()',
            '    say := func(msg string) func(context.Context) {',
            '        return func(context.Context) { fmt.Printf("%3d ms %s\\n", time.Since(start).Milliseconds(), msg) }',
            '    }',
            '    s.Schedule(&Task{ID: "report", RunAt: start.Add(200 * time.Millisecond), Run: say("one-off report")})',
            '    s.Schedule(&Task{ID: "heartbeat", RunAt: start, Every: 100 * time.Millisecond, Run: say("heartbeat")})',
            '    s.Schedule(&Task{ID: "reminder", RunAt: start.Add(150 * time.Millisecond), Run: say("never runs")})',
            '    s.Cancel("reminder")',
            '    s.Run(ctx)',
            '}'
          ].join('\n'),
          lang: 'go'
        }
      ],
      interviewFocus: [
        {
          q: 'In BookMyShow, how do you prevent two users from booking the same seat, both in-memory and with a database?',
          a: '<p><strong>In-memory:</strong> the show&#39;s seat map is an aggregate guarded by one mutex; <code>HoldSeats</code> checks <em>all</em> requested seats and marks them held inside the same critical section (all-or-nothing), with an expiry so abandoned holds free up.</p><p><strong>With a database:</strong></p><ul><li>Conditional update: <code>UPDATE show_seats SET status=\'HELD\', hold_id=$1, expires_at=now()+interval \'5 min\' WHERE show_id=$2 AND seat_id = ANY($3) AND (status=\'AVAILABLE\' OR expires_at &lt; now())</code> in a transaction; if rows affected ≠ requested count, roll back.</li><li>Or <code>SELECT ... FOR UPDATE</code> on the seats in a consistent order (avoid deadlocks).</li><li>A unique constraint on <code>bookings(show_id, seat_id)</code> as the final safety net.</li></ul><p><strong>At scale:</strong> Redis <code>SET seat:{show}:{seat} hold NX PX 300000</code> per seat (with a Lua script for multi-seat atomicity), then persist the confirmed booking. Payment completes only if the hold is still valid; otherwise refund.</p>'
        },
        {
          q: 'Explain how your LRU cache achieves O(1) operations and how you would make it scale under heavy concurrency.',
          a: '<p>A hash map gives O(1) key → node lookup; a doubly linked list keeps recency order with O(1) unlink and push-to-front. Eviction removes the tail node and deletes its key from the map (the node stores its key for this reason).</p><p>Concurrency: every <code>Get</code> mutates recency, so a single mutex serialises all operations. To scale:</p><ul><li><strong>Sharding</strong>: N independent LRUs keyed by <code>hash(key) % N</code>, each with its own lock (approximate global LRU).</li><li><strong>Buffered recency updates</strong>: record accesses in a lock-free ring buffer and apply them in batches (Caffeine/Ristretto approach).</li><li>Use <strong>W-TinyLFU</strong> admission for better hit rates under scans.</li></ul>'
        },
        {
          q: 'How would you extend your parking lot design to support EV charging spots and dynamic pricing without modifying existing code?',
          a: '<ul><li>Spot capabilities become data: add a <code>Features</code> set (EV charger) to <code>Spot</code>, and a <code>SpotMatcher</code> strategy that selects spots satisfying a vehicle&#39;s requirements (size + EV). The default matcher keeps current behaviour.</li><li>Pricing is already a <code>PricingStrategy</code>; add <code>DynamicPricing</code> (occupancy-based multiplier) and a <code>CompositePricing</code> that adds EV charging fees per kWh — new types, no edits to <code>ParkingLot</code> (OCP).</li><li>Display boards subscribe to spot-state events (observer) to show free EV spots.</li><li>Tests: table-driven pricing tests with a fake clock; concurrency test that N cars never share a spot.</li></ul>'
        },
        {
          q: 'Which scheduling algorithm would you use for elevators and why?',
          a: '<p>Inside a car, <strong>LOOK</strong> (a variant of SCAN): keep moving in the current direction while there are stops ahead, then reverse. It avoids starvation (unlike nearest-request-first) and avoids travelling to the building ends needlessly (unlike pure SCAN).</p><p>Across cars, a <strong>dispatcher strategy</strong> assigns hall calls by cost: distance, whether the car is already moving toward the floor in the requested direction, current load and number of pending stops. Modern buildings use <strong>destination dispatch</strong> (passengers enter destination at the lobby) to group riders. Make the dispatcher an interface so policies can be swapped and simulated with deterministic <code>Step()</code> ticks.</p>'
        },
        {
          q: 'How do you test an LLD solution thoroughly in a short interview?',
          a: '<ul><li><strong>Table-driven unit tests</strong> for rules: pricing, state transitions (valid and invalid), split calculations.</li><li><strong>Fake clock</strong> injection to test TTLs and fines without sleeping.</li><li><strong>Concurrency test</strong>: many goroutines compete for one resource behind a start barrier; assert exactly one success; run with <code>go test -race</code>.</li><li><strong>Invariant checks</strong>: Splitwise balances sum to zero; LRU never exceeds capacity; tokens never exceed capacity — candidates for fuzz tests.</li><li><strong>Fakes</strong> for payment/notification interfaces to test failure paths (payment declined, notifier down).</li></ul>'
        }
      ],
      quiz: [
        { q: 'What two data structures give an O(1) LRU cache?', a: 'A hash map plus a doubly linked list.' },
        { q: 'Which pattern best models a vending machine?', a: 'The State pattern.' },
        { q: 'Which pattern fits a file system of files and directories?', a: 'Composite (directories contain nodes; size aggregates over children).' },
        { q: 'What scheduling algorithm keeps an elevator moving in one direction while stops remain ahead?', a: 'LOOK (a variant of SCAN).' },
        { q: 'How should seat holds in a booking system expire?', a: 'Store an expiry time per hold; treat expired holds as free on access (lazy expiry), optionally with a background sweeper.' },
        { q: 'What is the upper bound on transfers from greedy debt simplification in Splitwise?', a: 'n-1 transfers for n users with non-zero balances.' },
        { q: 'Why inject a clock into LLD components?', a: 'So time-dependent logic (TTL, fines, rate limits) can be tested deterministically without sleeping.' },
        { q: 'In a pull-based broker, when should a consumer commit its offset for at-least-once delivery?', a: 'After processing the messages successfully.' }
      ],
      resources: [
        { title: 'Awesome Low Level Design (problems and solutions)', url: 'https://github.com/ashishps1/awesome-low-level-design', type: 'course' },
        { title: 'Refactoring.Guru — State pattern', url: 'https://refactoring.guru/design-patterns/state', type: 'article' },
        { title: 'Go Blog — Introducing the Go Race Detector', url: 'https://go.dev/blog/race-detector', type: 'article' },
        { title: 'Go Docs — Tutorial: Getting started with fuzzing', url: 'https://go.dev/doc/tutorial/fuzz', type: 'docs' }
      ]
    }
  ],
  flashcards: [
    { q: 'What are the four steps of the HLD interview framework?', a: 'Requirements (functional + non-functional), back-of-the-envelope estimation, high-level design (API, data model, components), deep dives and trade-offs.', d: 1 },
    { q: 'Quick conversion: 1 million requests per day is roughly how many QPS?', a: 'About 12 QPS (1 day is about 10^5 seconds).', d: 1 },
    { q: 'Downtime allowed per year at 99.9% and 99.99%?', a: '99.9%: about 8.76 hours. 99.99%: about 52.6 minutes.', d: 1 },
    { q: 'Same-datacenter round trip vs cross-continent round trip?', a: 'About 0.5 ms vs about 100-150 ms.', d: 1 },
    { q: 'SLI vs SLO vs SLA?', a: 'SLI: the measured indicator. SLO: the internal target for it. SLA: the contractual promise with penalties, looser than the SLO.', d: 1 },
    { q: 'Availability of two independent 99.9% dependencies in series?', a: 'About 99.8% (0.999 x 0.999). Series availabilities multiply.', d: 2 },
    { q: 'L4 vs L7 load balancing in one line each?', a: 'L4 balances TCP/UDP connections by IP/port; L7 understands HTTP/gRPC and routes per request by path, headers or cookies.', d: 1 },
    { q: 'What is the power-of-two-choices load balancing algorithm?', a: 'Pick two random backends and send the request to the less loaded one; near-optimal balance with no global state.', d: 2 },
    { q: 'Scale cube axes?', a: 'X: clone instances behind a load balancer. Y: split by function (services). Z: partition data (sharding/cells).', d: 2 },
    { q: 'Cache-aside write path: what order and why?', a: 'Write the database first, then delete (not update) the cache key, so concurrent writers cannot leave a permanently stale value.', d: 2 },
    { q: 'Three defences against a cache stampede?', a: 'Request coalescing (singleflight), locks/leases or stale-while-revalidate, and probabilistic early expiration (XFetch), plus TTL jitter.', d: 2 },
    { q: 'How do you co-locate related keys in Redis Cluster?', a: 'Hash tags: only the substring inside {braces} is hashed to pick one of 16,384 slots.', d: 2 },
    { q: 'B-tree vs LSM-tree?', a: 'B-tree: in-place pages, read-optimised OLTP (Postgres, InnoDB). LSM: append memtable/SSTables with compaction, write-optimised (Cassandra, RocksDB).', d: 2 },
    { q: 'Why do virtual nodes matter in consistent hashing?', a: 'They even out key distribution and spread a departed node load across many nodes instead of one neighbour.', d: 2 },
    { q: 'How do you provide read-your-writes with async read replicas?', a: 'Read the user own data from the leader for a short window after writes, or route to replicas that have replayed past the write LSN.', d: 2 },
    { q: 'CAP: what is actually being chosen?', a: 'During a network partition, choose consistency (linearizability; reject some requests) or availability (serve possibly stale data).', d: 2 },
    { q: 'What does PACELC add?', a: 'Else, in normal operation, the trade-off is latency vs consistency.', d: 2 },
    { q: 'Quorum condition for read/write overlap?', a: 'R + W > N.', d: 1 },
    { q: 'How many failures does a Raft cluster of 2f+1 nodes tolerate?', a: 'f failures (3 nodes tolerate 1, 5 tolerate 2).', d: 2 },
    { q: 'Linearizability vs serializability?', a: 'Linearizability: real-time recency on single objects. Serializability: transactions equivalent to some serial order. Both together: strict serializability.', d: 3 },
    { q: 'Lamport clocks vs vector clocks?', a: 'Lamport gives an order consistent with causality but cannot detect concurrency; vector clocks detect concurrent events.', d: 3 },
    { q: 'How do you achieve effectively-once processing?', a: 'At-least-once delivery plus idempotent consumers (dedup ID stored atomically with the effect), or Kafka transactions within Kafka.', d: 2 },
    { q: 'Why is two-phase commit called blocking?', a: 'Participants that voted yes cannot decide alone if the coordinator fails, so they hold locks until it recovers.', d: 3 },
    { q: 'Kafka ordering guarantee and parallelism limit?', a: 'Ordered within a partition only; a consumer group can use at most one consumer per partition.', d: 2 },
    { q: 'What problem does the transactional outbox solve?', a: 'The dual-write problem: the state change and its event are committed in one local transaction; a relay or CDC publishes the event.', d: 2 },
    { q: 'Durable Kafka producer/topic settings?', a: 'Replication factor 3, acks=all, min.insync.replicas=2, idempotent producer, unclean leader election disabled.', d: 3 },
    { q: 'Token bucket vs fixed window rate limiting?', a: 'Token bucket allows bursts up to capacity at an average rate; fixed window is simple but can allow 2x the limit at window edges.', d: 2 },
    { q: 'Circuit breaker states?', a: 'Closed (normal), Open (fail fast), Half-open (trial requests decide whether to close or reopen).', d: 1 },
    { q: 'RTO vs RPO?', a: 'RTO: how long until service is restored. RPO: how much data (in time) may be lost.', d: 1 },
    { q: 'What burn rate pages for a 99.9% / 30-day SLO in the 1-hour window?', a: '14.4, which consumes 2% of the monthly error budget in one hour.', d: 3 },
    { q: 'Snowflake ID layout?', a: '1 sign bit, 41 bits millisecond timestamp, 10 bits worker ID, 12 bits per-ms sequence.', d: 2 },
    { q: 'Fan-out on write vs read for feeds?', a: 'Push precomputes followers feeds (fast reads, expensive for celebrities); pull merges at read time. Use a hybrid with a follower threshold.', d: 2 },
    { q: 'How does Go replace inheritance?', a: 'Composition via struct embedding for reuse and implicit interfaces for polymorphism; embedding has no virtual dispatch.', d: 1 },
    { q: 'Go idiom for many optional constructor parameters?', a: 'Functional options: NewX(required, opts ...Option) with type Option func(*X).', d: 1 },
    { q: 'How do you avoid deadlocks when locking two accounts or seats?', a: 'Acquire locks in a consistent global order (e.g. by ID), or use a single lock for the aggregate.', d: 2 },
    { q: 'Retries vs attempts: three stacked layers that each retry 3 times amplify load by how much?', a: '4^3 = 64x, because each layer makes 4 attempts (1 call + 3 retries). With 3 total attempts per layer it is 3^3 = 27x. Retry at one layer and use retry budgets.', d: 2 },
    { q: 'Load shedding vs backpressure?', a: 'Backpressure asks the upstream to slow down (bounded queues, flow control, 429 + Retry-After). Load shedding rejects excess work cheaply when the upstream cannot slow down, protecting goodput.', d: 2 },
    { q: 'Four fixes for a hot partition?', a: 'Hash or bucket monotonic keys, write-shard hot entities and counters (key + suffix), time-bucket unbounded partitions, and move whale tenants to dedicated shards.', d: 2 },
    { q: 'How do you enforce tenant isolation in a pooled (shared tables) model?', a: 'tenant_id leading every key, database row-level security with the tenant set per transaction, tenant taken from the verified token, tenant-scoped repositories, and cross-tenant tests.', d: 2 },
    { q: 'Exactly-once in practice?', a: 'At-least-once delivery plus exactly-once effects: dedup by a stable event ID in the same transaction as the change, Kafka transactions for Kafka-to-Kafka, idempotency keys for external APIs.', d: 3 },
    { q: 'How does a search engine find documents for "red shoes"?', a: 'Analyze the query into terms, look up each term\'s postings list in the inverted index, intersect them (rarest first), score with BM25 plus business signals, and merge top-K across shards.', d: 2 },
    { q: 'HyperLogLog vs Count-Min Sketch vs Bloom filter?', a: 'HLL estimates distinct counts (~1% error, 12 KB); CMS estimates item frequencies (overestimates only); Bloom answers set membership (false positives only).', d: 3 }
  ]
});
