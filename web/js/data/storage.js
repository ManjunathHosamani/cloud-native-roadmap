// Storage Systems roadmap — disks, block/file/object storage, RAID, file systems,
// storage engines, distributed and cloud storage, backup & DR.
// Schema: see CONTRIBUTING.md. Validate with: node scripts/validate-content.js web/js/data/storage.js
registerRoadmap({
  id: 'storage',
  order: 80,
  title: 'Storage Systems',
  short: 'Storage',
  icon: '💾',
  color: '#06B6D4',
  desc: 'Disks, block/file/object storage, RAID, file systems, storage engines, distributed and cloud storage, backup & DR.',
  unit: 'Module',
  modules: [
    // ───────────────────────────── Module 1 ─────────────────────────────
    {
      n: 1,
      title: 'Storage Fundamentals',
      summary: 'How physical media (HDD, SATA SSD, NVMe) really work and the performance vocabulary every storage discussion uses: IOPS, throughput, latency, queue depth, block size. This is the foundation for reasoning about databases, cloud disks and Kubernetes volumes.',
      topics: [
        {
          title: 'Hard Disk Drives: Seeks, Rotation and Why Random I/O Hurts',
          def: '<p>An HDD stores bits magnetically on spinning <strong>platters</strong>. An actuator arm moves <strong>heads</strong> across concentric <strong>tracks</strong>, each split into <strong>sectors</strong> (512 B legacy; 4 KiB "Advanced Format" today, often exposed as 512e for compatibility).</p>' +
            '<p>The service time of one random I/O is <code>seek + rotational latency + transfer</code>:</p>' +
            '<table><thead><tr><th>Component (7,200 RPM drive)</th><th>Typical value</th></tr></thead><tbody>' +
            '<tr><td>Average seek (move the arm)</td><td>~4–9 ms</td></tr>' +
            '<tr><td>Average rotational latency (half a revolution = 60 s / 7200 / 2)</td><td>~4.17 ms</td></tr>' +
            '<tr><td>Transfer of 4 KiB at ~200 MB/s</td><td>~0.02 ms</td></tr>' +
            '<tr><td><strong>Total per random I/O</strong></td><td>~8–13 ms → <strong>~75–150 random IOPS</strong></td></tr>' +
            '</tbody></table>' +
            '<p>Sequential access avoids seeks and rotation waits, so the same drive streams <strong>~150–280 MB/s</strong>. That 100x+ gap between random and sequential is the single most influential fact in storage design: it is why databases append to a write-ahead log, why LSM-trees and log-structured file systems exist, and why HDDs today serve bulk capacity (backup targets, object-store capacity tiers, AWS <code>st1</code>/<code>sc1</code> volumes).</p>' +
            '<ul><li><strong>CMR vs SMR</strong>: shingled recording overlaps tracks for density but makes random writes very slow (zone read-modify-write). Avoid SMR in RAID arrays and databases.</li>' +
            '<li><strong>Zoned bit recording</strong>: outer tracks hold more sectors, so they are faster than inner tracks.</li>' +
            '<li><strong>NCQ</strong> (up to 32 queued commands) lets firmware reorder requests to shorten seeks: higher throughput, but higher per-request latency.</li>' +
            '<li>Annual failure rates of 1–2% are normal, so a single disk is persistent but never durable on its own.</li></ul>',
          interview: 'Be ready to derive about 100-150 IOPS for a 7,200 RPM drive from first principles (average seek plus half a rotation). Interviewers use this to check whether you understand why sequential access patterns (WAL, LSM-trees, log-structured file systems, Kafka segments) dominate storage design.',
          examples: [
            { label: 'Back-of-envelope HDD maths', lang: 'text', code: 'Rotation:  7200 RPM -> 120 rev/s -> 8.33 ms per revolution\nAvg rotational latency = 8.33 / 2           = 4.17 ms\nAvg seek (datasheet)                         = 8.5  ms\nTransfer 4 KiB @ 200 MB/s                    = 0.02 ms\n-----------------------------------------------------\nService time per random 4 KiB read          ~ 12.7 ms\nRandom IOPS  = 1000 / 12.7                   ~ 79 IOPS\nRandom MB/s  = 79 x 4 KiB                    ~ 0.3 MB/s\nSequential   = ~200 MB/s  -> ~600x faster than random 4 KiB' },
            { label: 'Is this disk rotational? (Linux)', lang: 'bash', code: '# ROTA=1 means spinning disk, 0 means SSD/NVMe\nlsblk -d -o NAME,SIZE,ROTA,MODEL,TRAN\n\n# Detailed health and attributes (smartmontools)\nsudo smartctl -a /dev/sda | grep -Ei "rotation|reallocated|pending|power_on"' }
          ]
        },
        {
          title: 'SSDs and NVMe: NAND, FTL, Write Amplification, TRIM and Wear Levelling',
          def: '<p>An SSD stores charge in <strong>NAND flash</strong> cells: SLC (1 bit/cell), MLC (2), TLC (3), QLC (4). More bits per cell = cheaper and denser but slower writes and fewer program/erase (P/E) cycles (SLC ~50–100k, TLC ~1–3k, QLC ~1k or less).</p>' +
            '<p>The defining constraint: NAND is <strong>read and programmed in pages</strong> (4–16 KiB) but <strong>erased only in whole blocks</strong> (hundreds of pages, several MiB), and a programmed page cannot be overwritten in place. The controller therefore runs a <strong>Flash Translation Layer (FTL)</strong>:</p>' +
            '<ul><li><strong>Out-of-place writes</strong>: every write lands on a fresh page; the FTL updates its logical block address (LBA) → physical page map and marks the old page invalid.</li>' +
            '<li><strong>Garbage collection (GC)</strong>: picks blocks with many invalid pages, copies the still-valid pages elsewhere, then erases the block.</li>' +
            '<li><strong>Write amplification factor (WAF)</strong> = bytes written to NAND / bytes written by the host. GC copying makes WAF &gt; 1; small random overwrites on a nearly full drive are the worst case and cause latency spikes.</li>' +
            '<li><strong>TRIM / discard</strong> (NVMe <em>Deallocate</em>) tells the drive which LBAs are free so GC does not copy dead data.</li>' +
            '<li><strong>Over-provisioning</strong>: hidden spare capacity gives GC room, lowering WAF and tail latency.</li>' +
            '<li><strong>Wear levelling</strong>: spreads P/E cycles across all blocks (even relocating cold static data). Endurance is rated in <strong>TBW</strong> or <strong>DWPD</strong> (drive writes per day).</li></ul>' +
            '<table><thead><tr><th></th><th>SATA SSD</th><th>NVMe SSD</th></tr></thead><tbody>' +
            '<tr><td>Interface / protocol</td><td>SATA III + AHCI (~600 MB/s link)</td><td>PCIe x4 (Gen4 ~7 GB/s, Gen5 ~14 GB/s)</td></tr>' +
            '<tr><td>Command queues</td><td>1 queue x 32 commands</td><td>up to 64K queues x 64K commands (per-CPU, lock-free)</td></tr>' +
            '<tr><td>Random 4 KiB read</td><td>~90–100K IOPS</td><td>~500K–1.5M+ IOPS</td></tr>' +
            '<tr><td>Read latency</td><td>~80–100 µs</td><td>~10–80 µs</td></tr>' +
            '</tbody></table>' +
            '<p>Cloud note: on AWS Nitro instances both EBS volumes and local instance-store disks appear as NVMe devices (<code>/dev/nvme1n1</code>), even though EBS is network-attached and has much higher latency than local NVMe.</p>',
          interview: 'Explain why an SSD slows down as it fills (GC has fewer free blocks, WAF rises, latency spikes), what TRIM does, and why NVMe beats SATA beyond raw bandwidth: many parallel queues mapped to CPU cores remove the single-queue AHCI bottleneck. Link it to software: LSM-trees and log-structured designs are flash-friendly because they write sequentially and never update in place.',
          examples: [
            { label: 'NVMe health, wear and TRIM', lang: 'bash', code: '# List NVMe devices and their namespaces\nsudo nvme list\n\n# Wear and endurance: percentage_used, data_units_written, media_errors\nsudo nvme smart-log /dev/nvme0n1\n\n# Does the device support discard? (non-zero DISC-GRAN / DISC-MAX)\nlsblk -D\n\n# Periodic TRIM is preferred over the "discard" mount option\nsudo fstrim -av\nsudo systemctl enable --now fstrim.timer' }
          ]
        },
        {
          title: 'IOPS, Throughput, Latency and Queue Depth (Little\'s Law)',
          def: '<ul><li><strong>Latency</strong>: time for one I/O to complete. Always discuss percentiles (p50, p99, p99.9), not averages.</li>' +
            '<li><strong>IOPS</strong>: completed I/O operations per second.</li>' +
            '<li><strong>Throughput / bandwidth</strong>: bytes per second. <code>throughput = IOPS x block size</code>.</li>' +
            '<li><strong>Queue depth (QD)</strong>: I/Os outstanding at the same time.</li></ul>' +
            '<p><strong>Little\'s Law</strong> (<code>L = λ x W</code>) ties them together: <code>outstanding I/Os = IOPS x latency</code>, so <code>IOPS = QD / latency</code>.</p>' +
            '<ul><li>A single-threaded synchronous writer (QD=1) on a network disk with 0.5 ms latency can never exceed 1 / 0.0005 = <strong>2,000 IOPS</strong>, however many IOPS you pay for.</li>' +
            '<li>To drive 16,000 IOPS at 0.5 ms you need about 16,000 x 0.0005 = <strong>QD 8</strong> (more threads, async I/O, io_uring).</li>' +
            '<li>Raising QD past the device\'s internal parallelism adds only queueing delay: IOPS flattens while latency climbs — the "knee" of the curve.</li></ul>' +
            '<table><thead><tr><th>Workload</th><th>Typical I/O</th><th>Usually bound by</th></tr></thead><tbody>' +
            '<tr><td>OLTP database pages</td><td>8–16 KiB random</td><td>IOPS and read latency</td></tr>' +
            '<tr><td>Transaction commit (WAL fsync)</td><td>small sequential + flush</td><td>write latency</td></tr>' +
            '<tr><td>Kafka / log append</td><td>large sequential</td><td>throughput</td></tr>' +
            '<tr><td>Analytics scans, backups</td><td>128 KiB – 1 MiB</td><td>throughput (MB/s)</td></tr>' +
            '</tbody></table>' +
            '<p>Cloud volumes cap <em>both</em> dimensions. An EBS gp3 volume at its 3,000 IOPS / 125 MiB/s baseline is IOPS-bound for 16 KiB I/Os (3,000 x 16 KiB ≈ 47 MiB/s) but throughput-bound for 256 KiB I/Os (125 MiB/s reached at ~500 IOPS). The EC2 instance type also has its own EBS bandwidth and IOPS ceiling.</p>',
          interview: 'Expect a numeric question such as "we provisioned 20K IOPS but only see 3K". Walk through: queue depth too low (Little\'s law, latency-bound), throughput cap hit by large blocks, instance-level EBS limits, exhausted burst credits, or the app doing synchronous fsync per request. Always mention tail latency.',
          examples: [
            { label: 'Little\'s law worked examples', lang: 'text', code: 'IOPS = QD / latency          QD = IOPS x latency          MB/s = IOPS x block size\n\n1) QD=1, latency 0.5 ms         -> 1 / 0.0005        =  2,000 IOPS (max)\n2) Target 50,000 IOPS @ 200 us  -> 50,000 x 0.0002   =  QD 10 needed\n3) 3,000 IOPS x 16 KiB          -> ~47 MiB/s  (IOPS-bound on gp3 baseline)\n4) 125 MiB/s / 256 KiB          -> ~500 IOPS  (throughput-bound on gp3 baseline)' }
          ]
        },
        {
          title: 'Block Size, Sequential vs Random I/O and the Linux I/O Stack',
          def: '<p>A <code>write()</code> travels: application → <strong>VFS</strong> → <strong>page cache</strong> → file system (block allocation, journal) → <strong>block layer</strong> (blk-mq, I/O scheduler, merging) → device driver → device (which may have its own volatile write cache).</p>' +
            '<ul><li><strong>Sizes to keep apart</strong>: logical/physical sector (512 B / 4 KiB), file-system block (usually 4 KiB), database page (PostgreSQL 8 KiB, InnoDB 16 KiB), application I/O size. Misalignment (e.g. partition not starting on a 1 MiB boundary) turns one write into two device writes.</li>' +
            '<li><strong>Torn writes</strong>: devices guarantee atomicity only for one sector (or a device-specific atomic unit). A 16 KiB InnoDB page can be half-written on power loss — hence InnoDB\'s doublewrite buffer and PostgreSQL\'s <code>full_page_writes</code>.</li>' +
            '<li><strong>Sequential vs random</strong>: on HDDs the gap is 100x+; on SSDs it is smaller but real — large sequential writes reduce FTL garbage collection and amortise per-I/O overhead.</li>' +
            '<li><strong>Read-ahead</strong>: the kernel prefetches subsequent blocks when it detects sequential reads (<code>blockdev --getra</code>).</li>' +
            '<li><strong>I/O schedulers</strong> (blk-mq): <code>none</code> (default for NVMe — the device is fast and parallel), <code>mq-deadline</code> (good for SATA/HDD), <code>bfq</code> (fairness, desktops), <code>kyber</code> (latency targets).</li>' +
            '<li><strong>Buffered vs direct I/O</strong>: <code>O_DIRECT</code> bypasses the page cache (needs aligned buffers). InnoDB (<code>innodb_flush_method=O_DIRECT</code>) and ScyllaDB use it because they run their own cache; PostgreSQL traditionally relies on the OS page cache and added asynchronous I/O (<code>io_method</code>, including io_uring) in version 18.</li></ul>',
          interview: 'Know every layer between write() and the media and which ones can cache or reorder data: page cache, I/O scheduler, device write cache. Mention torn pages and how InnoDB (doublewrite buffer) and PostgreSQL (full_page_writes) defend against them; that answer separates senior candidates from the rest.',
          examples: [
            { label: 'Inspect block devices, sector sizes and scheduler', lang: 'bash', code: 'lsblk -o NAME,SIZE,TYPE,ROTA,PHY-SEC,LOG-SEC,MIN-IO,SCHED,MOUNTPOINT\n\ncat /sys/block/nvme0n1/queue/scheduler        # [none] mq-deadline kyber bfq\ncat /sys/block/nvme0n1/queue/nr_requests\nsudo blockdev --getra /dev/nvme0n1           # read-ahead in 512-byte sectors\n\n# Live per-device stats every second (sysstat package)\niostat -xz 1' }
          ]
        },
        {
          title: 'Durability vs Persistence, the Latency Hierarchy and Storage Tiers',
          def: '<ul><li><strong>Persistence</strong>: data survives a process crash or power cycle because it reached non-volatile media.</li>' +
            '<li><strong>Durability</strong>: the probability that data survives over time despite media, node, rack, site and human failures. Achieved with redundancy (replication, erasure coding), checksums and backups. A single disk is persistent but not durable.</li>' +
            '<li><strong>Availability</strong>: the probability you can access the data right now. S3 Standard is designed for 99.999999999% (11 nines) durability but 99.99% availability — different promises.</li>' +
            '<li><strong>Acknowledged durability</strong>: when a system says "committed", has the data been fsynced, and on how many replicas?</li></ul>' +
            '<table><thead><tr><th>Medium / hop</th><th>Rough latency</th></tr></thead><tbody>' +
            '<tr><td>DRAM access</td><td>~100 ns</td></tr>' +
            '<tr><td>Local NVMe read</td><td>~10–100 µs</td></tr>' +
            '<tr><td>Network block volume (EBS, Azure Premium SSD)</td><td>~0.2–2 ms</td></tr>' +
            '<tr><td>HDD random read</td><td>~5–15 ms</td></tr>' +
            '<tr><td>Object store GET (first byte)</td><td>~10–100 ms</td></tr>' +
            '<tr><td>Archive retrieval (Glacier Deep Archive, Azure Archive)</td><td>hours</td></tr>' +
            '</tbody></table>' +
            '<table><thead><tr><th>Tier</th><th>Access pattern</th><th>AWS</th><th>Azure</th></tr></thead><tbody>' +
            '<tr><td>Hot</td><td>frequent, low latency</td><td>gp3/io2, S3 Standard, S3 Express One Zone</td><td>Premium SSD, Blob Hot</td></tr>' +
            '<tr><td>Warm</td><td>monthly</td><td>S3 Standard-IA</td><td>Blob Cool</td></tr>' +
            '<tr><td>Cold</td><td>quarterly, ms retrieval</td><td>S3 Glacier Instant Retrieval</td><td>Blob Cold</td></tr>' +
            '<tr><td>Archive</td><td>yearly / compliance</td><td>Glacier Flexible Retrieval, Deep Archive</td><td>Blob Archive</td></tr>' +
            '</tbody></table>' +
            '<p>Colder tiers cut $/GB-month but add retrieval fees, retrieval latency, minimum storage durations and per-object overhead — so tiering decisions depend on access frequency <em>and</em> object size.</p>',
          interview: 'Never conflate durability with availability. When asked to tier data, discuss access frequency, retrieval latency SLA, minimum storage duration charges, retrieval fees and per-object overheads (millions of tiny objects are poor candidates for IA or Glacier classes; batch them first).',
          examples: [
            { label: 'Write objects directly into a colder tier', lang: 'bash', code: '# AWS: upload straight to Standard-IA\naws s3 cp ./report-2025.parquet s3://my-bucket/reports/ --storage-class STANDARD_IA\n\n# Azure: upload a blob into the Cool tier\naz storage blob upload --account-name mystorageacct --container-name reports \\\n  --name report-2025.parquet --file ./report-2025.parquet --tier Cool --auth-mode login' }
          ]
        },
        {
          title: 'Zoned Storage: SMR, NVMe ZNS and Flexible Data Placement',
          def: '<p>The FTL hides flash\'s erase-before-write rule, but you pay for it with device-level write amplification, mapping-table DRAM and over-provisioning. <strong>Zoned storage</strong> exposes the constraint to the host instead, so software that already writes sequentially (LSM-trees, log-structured file systems, object-store chunk servers) can place data itself.</p><ul><li><strong>Zones</strong>: the LBA space is split into zones (hundreds of MiB to a few GiB). Each zone has a <strong>write pointer</strong>: writes must land exactly at it (sequential-write-required), reads can be random. Reusing a zone requires an explicit <strong>zone reset</strong> — the erase.</li><li><strong>Host-managed SMR HDDs</strong> (ZBC/ZAC command sets) came first: shingled tracks make in-place writes impossible. <em>Drive-managed</em> SMR hides this behind firmware and collapses under random writes — the reason SMR disks make terrible RAID members.</li><li><strong>NVMe ZNS</strong> (Zoned Namespaces, part of the NVMe 2.0 Zoned Command Set) applies the model to flash: device WAF close to 1, little or no over-provisioning, far less mapping DRAM, and predictable tail latency because the drive no longer garbage-collects behind your back. <strong>Zone Append</strong> lets many writers append concurrently; the device returns the LBA where each write landed. An <strong>open/active zone limit</strong> caps how many zones can be written at once.</li><li><strong>The host now does GC</strong>: copy live data out of a partially dead zone, then reset it. Linux supports zoned block devices natively, with <strong>F2FS</strong> and <strong>Btrfs</strong> zoned modes, <code>dm-zoned</code>, RocksDB on ZenFS, and SPDK.</li><li><strong>Flexible Data Placement (FDP)</strong>, NVMe TP4146 (2022), is the lighter alternative pushed by Meta and Google: the drive keeps its FTL and accepts random writes, but the host tags writes with a <strong>placement handle</strong> so data with similar lifetimes shares erase units. Those units die together and GC copies little — with only small software changes.</li></ul><table><thead><tr><th></th><th>Conventional SSD</th><th>FDP SSD</th><th>ZNS SSD</th></tr></thead><tbody><tr><td>Host write rules</td><td>any LBA, any order</td><td>any LBA, plus optional placement hints</td><td>sequential within a zone; explicit reset</td></tr><tr><td>Who does GC</td><td>drive</td><td>drive, helped by hints</td><td>host</td></tr><tr><td>Device WAF</td><td>1–5+ (workload, fullness)</td><td>close to 1 with good hints</td><td>~1</td></tr><tr><td>Software changes</td><td>none</td><td>small (pass hints)</td><td>zone-aware FS or engine</td></tr></tbody></table><p>Cloud relevance: you will not get ZNS disks on EBS or Azure Managed Disks, but hyperscalers use these ideas inside their fleets, and the principle — group data by lifetime, write sequentially, reclaim whole units — is exactly what LSM compaction, Kafka segments and log-structured object stores do in software.</p>',
          interview: 'Explain why ZNS removes device-level write amplification (the host writes each zone sequentially and resets whole zones, so the drive never copies live pages) and what it costs (host-side GC, open-zone limits, zone-aware software). Contrast with FDP: keep the FTL but tag writes by lifetime. Tie it to LSM-trees: SSTables of one level have similar lifetimes, which is exactly what zones and placement handles exploit.',
          examples: [
            {
              label: 'Inspect and use a zoned block device (Linux)',
              lang: 'bash',
              code: '# Is the device zoned? none | host-aware | host-managed\ncat /sys/block/nvme0n2/queue/zoned\nlsblk -z                                   # ZONED column for every device\n\n# Zone report: start, length, write pointer, condition\nsudo blkzone report /dev/nvme0n2 | head\nsudo nvme zns report-zones /dev/nvme0n2 -d 4\n\n# Reset (erase) the first zone; its data is gone\nsudo blkzone reset -o 0 -c 1 /dev/nvme0n2\n\n# F2FS on a zoned device (metadata on a small conventional device)\nsudo mkfs.f2fs -f -m -c /dev/nvme0n2 /dev/nvme0n1p3'
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Derive random IOPS for a 7,200 RPM HDD',
          d: 'easy', type: 'concept',
          hint: '<ul><li>RPM → seconds per revolution; average rotational latency is half a revolution.</li><li>Add the datasheet average seek and a tiny transfer time.</li><li>IOPS = 1 / service time. Compare with sequential MB/s.</li></ul>',
          solution: '7200 RPM = 120 rev/s -> 8.33 ms/rev -> 4.17 ms average rotational latency.\nAverage seek ~8.5 ms, transfer of 4 KiB ~0.02 ms.\nService time ~12.7 ms -> ~79 random IOPS (~0.3 MB/s at 4 KiB).\nSequential ~200 MB/s, i.e. hundreds of times faster.\nA 15K RPM drive: 2 ms rotation + ~3.5 ms seek -> ~180 IOPS.\nConclusion: design for sequential I/O on HDDs (logs, large blocks), keep random I/O on SSD.'
        },
        {
          t: 'Convert between IOPS, block size and throughput',
          d: 'easy', type: 'concept',
          hint: '<ul><li><code>MB/s = IOPS x block size</code>.</li><li>Answer: (a) 3,000 IOPS at 16 KiB; (b) IOPS needed for 1 GiB/s at 128 KiB; (c) a 125 MiB/s cap at 4 KiB vs 1 MiB I/Os.</li><li>Decide in each case whether IOPS or throughput is the binding limit.</li></ul>',
          solution: '(a) 3,000 x 16 KiB = 48,000 KiB/s ~ 47 MiB/s\n(b) 1 GiB/s / 128 KiB = 8,192 IOPS\n(c) 125 MiB/s / 4 KiB = 32,000 IOPS needed -> a 3,000 IOPS volume is IOPS-bound at ~12 MiB/s\n    125 MiB/s / 1 MiB  = 125 IOPS          -> throughput-bound long before the IOPS limit\n(Remember: EBS SSD volumes count I/Os up to 256 KiB as one operation; larger I/Os are split.)'
        },
        {
          t: 'Inventory the disks on a Linux host',
          d: 'easy', type: 'hands-on',
          hint: '<ul><li><code>lsblk</code> for topology, size, rotational flag, sector sizes and mount points.</li><li><code>nvme list</code> / <code>nvme smart-log</code> and <code>smartctl -a</code> for health and wear.</li><li><code>df -hT</code> and <code>findmnt</code> for file systems and mount options.</li><li>On AWS, map NVMe devices to EBS volume IDs (serial number = vol-id).</li></ul>',
          solution: 'lsblk -o NAME,SIZE,TYPE,ROTA,PHY-SEC,LOG-SEC,FSTYPE,MOUNTPOINT\nsudo nvme list                 # on Nitro, the SerialNumber column shows the EBS vol-xxxx id\nsudo nvme smart-log /dev/nvme0n1 | grep -E "percentage_used|media_errors|data_units_written"\nsudo smartctl -a /dev/sda      # SATA/SAS: reallocated / pending sectors\ndf -hT\nfindmnt -o TARGET,SOURCE,FSTYPE,OPTIONS'
        },
        {
          t: 'Explain why a 16K-IOPS volume delivers only 2K IOPS',
          d: 'medium', type: 'concept',
          hint: '<ul><li>Apply Little\'s law: IOPS = queue depth / latency.</li><li>What queue depth does a single synchronous thread generate?</li><li>List other caps: throughput limit, instance EBS limit, burst credits.</li><li>Propose fixes at the application and infrastructure level.</li></ul>',
          solution: 'The app issues one synchronous I/O at a time (QD=1) against a network volume with ~0.5 ms latency:\nIOPS = 1 / 0.0005 = 2,000. Provisioned IOPS are a ceiling, not a guarantee of speed.\nFixes:\n- Increase concurrency: more worker goroutines, async I/O (io_uring), batching, group commit.\n- Reduce latency: local NVMe instance store, io2 Block Express, same-AZ placement.\n- Check other limits: volume MiB/s cap with large blocks, instance-level EBS bandwidth/IOPS, gp2/st1 burst credits.\n- Verify with fio at QD 1, 8, 32 and iostat (aqu-sz, r_await, w_await).'
        },
        {
          t: 'Benchmark a disk with fio and interpret results',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>Use <code>--direct=1</code> to bypass the page cache, <code>--time_based</code> with a fixed runtime, and a test file larger than RAM caches.</li><li>Run separate jobs: 4K random read, 4K random write, 1M sequential read/write, and a QD=1 sync write (fsync latency).</li><li>Read IOPS, BW and completion-latency percentiles (clat p99/p99.9), not just averages.</li><li>Never point write tests at a device holding data.</li></ul>',
          solution: '# 4 KiB random read, QD 32 x 4 jobs (IOPS ceiling)\nfio --name=randread --filename=/mnt/data/fio.test --size=10G --rw=randread --bs=4k \\\n    --ioengine=libaio --iodepth=32 --numjobs=4 --direct=1 --runtime=60 --time_based --group_reporting\n\n# 1 MiB sequential write (throughput ceiling)\nfio --name=seqwrite --filename=/mnt/data/fio.test --size=10G --rw=write --bs=1M \\\n    --ioengine=libaio --iodepth=16 --direct=1 --runtime=60 --time_based\n\n# Database-commit style: 4 KiB writes with fdatasync after each (latency, QD 1)\nfio --name=walsync --filename=/mnt/data/wal.test --size=1G --rw=write --bs=4k \\\n    --ioengine=sync --fdatasync=1 --runtime=60 --time_based\n\nInterpreting:\n- "IOPS=" and "BW=" are the headline numbers; compare with the provisioned limits.\n- clat percentiles: a p99.9 10-50x the p50 indicates GC pauses, throttling or noisy neighbours.\n- If IOPS stops growing when iodepth doubles but latency doubles, you passed the knee of the curve.\n- The fdatasync job approximates commit latency: ~20-50 us on enterprise NVMe with power-loss protection,\n  ~0.5-2 ms on network block storage, several ms on consumer SSDs without PLP.\n- Repeat runs; first runs on fresh cloud volumes created from snapshots may be slow (lazy loading).'
        },
        {
          t: 'Diagnose a slow disk with iostat -x',
          d: 'medium', type: 'debug',
          hint: '<ul><li>Key columns: <code>r/s</code>, <code>w/s</code>, <code>rkB/s</code>, <code>wkB/s</code>, <code>r_await</code>, <code>w_await</code>, <code>aqu-sz</code>, <code>rareq-sz</code>, <code>%util</code>.</li><li><code>%util</code> near 100% is meaningful for HDDs but not for NVMe/network volumes that serve many requests in parallel.</li><li>Compare observed IOPS/MB/s with the provisioned limits to spot throttling.</li><li>Correlate with <code>vmstat</code> (wa column) and per-process I/O (<code>pidstat -d</code>, <code>iotop</code>).</li></ul>',
          solution: 'iostat -xz 1\nvmstat 1\npidstat -d 1\n\nReading the output:\n- High await with low aqu-sz: the device itself is slow (HDD seeks, throttled cloud volume, failing disk).\n- High await with high aqu-sz: queueing; demand exceeds device capability.\n- IOPS or MB/s flat-lined at exactly the provisioned value (e.g. 3000 w/s, 125 MB/s): cloud throttling.\n- Small rareq-sz/wareq-sz (4 KiB) on a throughput workload: the app is issuing tiny I/Os; batch them.\n- %util 100% on NVMe with low await: not saturated, %util only means "at least one I/O in flight".\nNext steps: check dmesg for I/O errors, CloudWatch VolumeQueueLength / throughput percentage, burst balance.'
        },
        {
          t: 'Explain write amplification and why a full SSD gets slow',
          d: 'medium', type: 'concept',
          hint: '<ul><li>Pages are programmed, blocks are erased; no in-place overwrite.</li><li>GC must copy valid pages before erasing — that copying is the amplification.</li><li>Fuller drive → blocks have more valid pages → more copying per freed block.</li><li>Mitigations: TRIM, over-provisioning, sequential/large writes, LSM-style software.</li></ul>',
          solution: 'WAF = NAND writes / host writes. Example: a block of 256 pages with 75% still valid must copy 192 pages to reclaim 64 -> each 64 host pages cost 256 NAND page writes, WAF = 4.\nAs the drive fills (or without TRIM, when the drive cannot know data is deleted) the valid ratio rises, GC runs more often and in the foreground, and writes stall behind erases -> p99 latency spikes and endurance (TBW) is consumed faster.\nMitigations: enable periodic fstrim, leave 10-20% free / over-provision, prefer large sequential writes, choose higher-endurance drives (DWPD) for write-heavy databases, monitor nvme smart-log percentage_used.'
        },
        {
          t: 'Tier 1 PB/year of application logs across hot, warm, cold and archive',
          d: 'medium', type: 'design',
          hint: '<ul><li>Define access patterns: last 7 days queried constantly, 30–90 days for incidents, 1–7 years for compliance.</li><li>Map each window to a storage class and justify by $/GB, retrieval latency and minimum duration.</li><li>Batch and compress small log lines into large objects (e.g. 128 MB Parquet/zstd) before tiering.</li><li>Automate with lifecycle rules; consider retrieval cost for audits.</li></ul>',
          solution: 'Hot (0-7 days): search cluster on SSD (e.g. OpenSearch on gp3) + raw copy in S3 Standard.\nWarm (7-90 days): S3 Standard-IA (30-day minimum) or Intelligent-Tiering if access is unpredictable.\nCold (90 days - 1 year): S3 Glacier Instant Retrieval (ms access, 90-day minimum) for rare incident lookups.\nArchive (1-7 years): Glacier Deep Archive (12-48 h retrieval, 180-day minimum) under Object Lock for compliance.\nAzure equivalent: Hot -> Cool -> Cold -> Archive blob tiers via lifecycle management.\nKey points: compress (5-10x for logs) and pack into large columnar objects to avoid per-object fees and minimum-size billing (128 KB for IA classes), partition by date for cheap pruning, set expiration at the end of retention, and budget for occasional bulk restores.'
        },
        {
          t: 'Write a Go tool comparing sequential vs random read latency',
          d: 'hard', type: 'coding',
          hint: '<ul><li>Open a large file (bigger than RAM, or drop caches first) and use <code>ReadAt</code> with 4 KiB blocks.</li><li>Sequential: offsets 0, 4K, 8K…; random: <code>rand.Int64N(blocks) * 4096</code> (<code>math/rand/v2</code>).</li><li>Record each latency, sort, and print p50/p99 and IOPS.</li><li>Discuss page-cache effects and why <code>O_DIRECT</code> needs aligned buffers.</li></ul>',
          solution: 'package main\n\n// Usage: go run . /mnt/data/bigfile   (file should be larger than RAM,\n// or run "sync; echo 3 | sudo tee /proc/sys/vm/drop_caches" between runs)\n\nimport (\n    "fmt"\n    "math/rand/v2"\n    "os"\n    "slices"\n    "time"\n)\n\nconst blockSize = 4096\n\nfunc main() {\n    if len(os.Args) != 2 {\n        fmt.Fprintln(os.Stderr, "usage: iobench <file>")\n        os.Exit(1)\n    }\n    f, err := os.Open(os.Args[1])\n    if err != nil {\n        panic(err)\n    }\n    defer f.Close()\n\n    fi, err := f.Stat()\n    if err != nil {\n        panic(err)\n    }\n    blocks := fi.Size() / blockSize\n    n := int64(20000)\n    if n > blocks/2 {\n        n = blocks / 2\n    }\n    buf := make([]byte, blockSize)\n\n    measure := func(name string, offset func(i int64) int64) {\n        lat := make([]time.Duration, 0, n)\n        start := time.Now()\n        for i := int64(0); i < n; i++ {\n            t := time.Now()\n            if _, err := f.ReadAt(buf, offset(i)); err != nil {\n                panic(err)\n            }\n            lat = append(lat, time.Since(t))\n        }\n        total := time.Since(start)\n        slices.Sort(lat)\n        fmt.Printf("%-10s iops=%8.0f p50=%-10v p99=%-10v p99.9=%v\\n", name,\n            float64(n)/total.Seconds(), lat[n/2], lat[n*99/100], lat[n*999/1000])\n    }\n\n    // Random first, on the second half of the file, so the sequential pass\n    // (first half) does not warm the cache for it.\n    half := blocks / 2\n    measure("random", func(int64) int64 { return (half + rand.Int64N(blocks-half)) * blockSize })\n    measure("sequential", func(i int64) int64 { return i * blockSize })\n}\n\n// Expected on HDD: sequential p50 ~ tens of us (read-ahead), random p50 ~ 5-12 ms.\n// On NVMe: random p50 ~ 50-100 us; sequential faster thanks to read-ahead.\n// For true device numbers use O_DIRECT (golang.org/x/sys/unix) with 4096-aligned buffers, or fio.',
          lang: 'go'
        },
        {
          t: 'Debug p99 commit-latency spikes on a cloud database volume',
          d: 'hard', type: 'debug',
          hint: '<ul><li>Separate device latency from queueing: compare <code>w_await</code> with <code>aqu-sz</code> during spikes.</li><li>Check provider metrics: throughput/IOPS at the cap, burst balance (gp2, st1), instance-level EBS limits.</li><li>Look for competing I/O: checkpoints, backups, compaction, log shipping on the same volume.</li><li>Consider fsync semantics and the WAL being on the same volume as data files.</li></ul>',
          solution: 'Investigation:\n1. iostat -x 1 during spikes: w_await jumps while w/s or wMB/s sits exactly at the provisioned limit -> throttling.\n2. CloudWatch: VolumeQueueLength, VolumeThroughputPercentage / IOPS exceeded checks, BurstBalance (gp2), EC2 EBSIOBalance% / EBSByteBalance% for burstable instance bandwidth.\n3. DB metrics: spikes aligned with checkpoints (PostgreSQL checkpoint_completion_target), autovacuum, nightly backups or pg_dump reading at full speed.\nFixes:\n- Move WAL to its own volume so commits are not queued behind checkpoint/data writes.\n- Migrate gp2 -> gp3 and provision IOPS/throughput explicitly; io2 Block Express for sub-ms consistency.\n- Pick an instance size with enough dedicated EBS bandwidth.\n- Smooth checkpoints (larger max_wal_size, checkpoint_completion_target=0.9), throttle backups, schedule compaction.\n- Alert on p99 not average latency.'
        },
        {
          t: 'Explain how ZNS or FDP lowers write amplification for an LSM engine',
          d: 'medium',
          type: 'concept',
          hint: '<ul><li>Where does device-level WAF come from when RocksDB runs on a conventional SSD?</li><li>SSTables are written sequentially and deleted whole after compaction: how do their lifetimes map onto erase blocks?</li><li>ZNS: place files of similar lifetime in the same zones and reset zones when files die.</li><li>FDP: tag writes per level with placement handles. Compare effort and risks.</li></ul>',
          solution: 'Conventional SSD: RocksDB writes the WAL and SSTables of several levels at the same time. The FTL interleaves them into the same erase blocks. When compaction deletes an L1 file, its pages sit in blocks that still hold long-lived L6 data, so GC must copy the live pages -> device WAF of 2-4 on top of RocksDB\'s own compaction write amplification (10-30x). Total NAND writes = application WA x device WAF.\n\nZNS: ZenFS (a RocksDB file-system plugin) maps files to zones and groups files with similar expected lifetime (same level) together. When compaction deletes them, whole zones become empty and are reset without copying -> device WAF ~1, no over-provisioning needed, no surprise GC pauses in p99. Costs: zone-aware file system, host-side GC for partially dead zones, the open-zone limit (caps concurrent flushes/compactions), less portability.\n\nFDP: keep the normal file system and FTL; give the WAL and each level its own placement handle (via io_uring NVMe passthrough or kernel write hints). Data of one level shares erase units, so it dies together and GC copies little. Most of the WAF reduction for a small code change, and wrong hints only cost efficiency, not correctness.\n\nSoundbite: both work because LSM files are written sequentially and die whole; the device stops guessing data lifetimes and the host tells it.'
        }
      ],
      interviewFocus: [
        {
          q: 'Why is sequential I/O faster than random I/O, even on SSDs?',
          a: '<p><strong>On HDDs</strong> random I/O pays a mechanical seek plus rotational latency (~8–12 ms) per request, while sequential I/O pays it once and then streams at the media rate — a 100x–1000x difference for small blocks.</p>' +
            '<p><strong>On SSDs</strong> there is no mechanics, but the gap remains (smaller) because:</p>' +
            '<ul><li>Large sequential writes fill whole erase blocks, so whole blocks later become invalid together and GC copies little → low write amplification. Random small overwrites scatter valid pages, increasing GC copying.</li>' +
            '<li>Per-I/O overhead (syscall, interrupt, FTL lookup, network round trip for cloud disks) is amortised over more bytes with large I/Os.</li>' +
            '<li>Read-ahead and controller prefetch help only predictable patterns.</li></ul>' +
            '<p><strong>Consequences in software</strong>: write-ahead logs, LSM-trees, log-structured file systems, Kafka segments and columnar files all convert random writes into sequential ones; B-trees mitigate random reads with large fan-out and caching.</p>'
        },
        {
          q: 'What limits the IOPS you actually get from a cloud block volume?',
          a: '<ol><li><strong>Volume limits</strong>: provisioned IOPS <em>and</em> throughput (gp3 baseline 3,000 IOPS / 125 MiB/s; io2 provisioned).</li>' +
            '<li><strong>Instance limits</strong>: every EC2/VM size has a maximum EBS/disk bandwidth and IOPS, and smaller sizes may only reach it in bursts.</li>' +
            '<li><strong>Latency x queue depth</strong>: by Little\'s law, IOPS = QD / latency. Network volumes have ~0.5–1 ms latency, so you need concurrency to use high IOPS.</li>' +
            '<li><strong>I/O size</strong>: large blocks hit the MiB/s cap; I/Os larger than 256 KiB are split into multiple operations on EBS SSD volumes.</li>' +
            '<li><strong>Burst models</strong>: gp2 credits, st1/sc1 throughput credits, burstable instance credits.</li>' +
            '<li><strong>Initialisation</strong>: volumes restored from snapshots are lazily loaded from S3; the first touch of each block is slow unless pre-warmed or Fast Snapshot Restore is used.</li></ol>' +
            '<p>Show you would measure with fio at several queue depths and confirm with provider metrics before buying more IOPS.</p>'
        },
        {
          q: 'How does an SSD\'s Flash Translation Layer work and why should a backend engineer care?',
          a: '<p>NAND pages cannot be overwritten; blocks must be erased first. The FTL hides this by writing out of place, keeping an LBA → physical map, running garbage collection, and levelling wear.</p>' +
            '<ul><li><strong>Performance</strong>: GC causes latency spikes under sustained random writes, especially on fuller drives — this shows up as p99 commit latency in your database.</li>' +
            '<li><strong>Endurance</strong>: write amplification multiplies with application-level amplification (an LSM compaction with WA 10 on an FTL with WAF 3 burns 30x the logical bytes).</li>' +
            '<li><strong>Durability</strong>: consumer SSDs may acknowledge flushes from volatile DRAM cache; enterprise drives have <strong>power-loss protection (PLP)</strong> capacitors, which also makes fsync fast.</li>' +
            '<li><strong>Security</strong>: deleting or overwriting a file does not erase NAND immediately — use crypto-erase / sanitize commands or encryption with key destruction.</li></ul>'
        },
        {
          q: 'Define persistence, durability and availability and give real-world numbers.',
          a: '<ul><li><strong>Persistence</strong>: survives restart/power loss (on non-volatile media after a flush).</li>' +
            '<li><strong>Durability</strong>: probability of not losing data over a period. S3 Standard and Azure LRS are designed for 11 nines per year; Azure GRS for 16 nines; a single EBS gp3 volume has an annual failure rate of 0.1–0.2% (io2: 0.001%).</li>' +
            '<li><strong>Availability</strong>: probability of serving requests now: S3 Standard designed for 99.99%, One Zone-IA 99.5%.</li></ul>' +
            '<p>A system can be durable but unavailable (region outage: data safe, inaccessible) or available but not durable (in-memory cache). Also distinguish <em>acknowledged</em> durability — how many fsynced copies exist when the client receives "OK" — which is set by fsync policy and replication mode (sync vs async).</p>'
        },
        {
          q: 'How would you benchmark storage before deploying a new database?',
          a: '<ol><li>Characterise the workload: page size, read/write ratio, random vs sequential, commit (fsync) rate, working-set size vs RAM.</li>' +
            '<li>Micro-benchmark with <strong>fio</strong>: 8/16 KiB random read/write at QD 1, 8, 32; 1 MiB sequential; 4 KiB write with <code>fdatasync=1</code> to model WAL commits. Use <code>direct=1</code>, time-based runs, files larger than cache, and repeat.</li>' +
            '<li>Record IOPS, MB/s and p50/p99/p99.9 latency; find the knee where latency rises without more IOPS.</li>' +
            '<li>Macro-benchmark with the real engine (pgbench, sysbench, YCSB) with production-like data size.</li>' +
            '<li>Test failure and noisy conditions: during backups, compaction, snapshot creation, rebuild/resync.</li>' +
            '<li>Validate against provider limits (volume + instance) and monitor in production with the same percentiles.</li></ol>'
        }
      ],
      quiz: [
        { q: 'Average rotational latency of a 7,200 RPM disk?', a: 'About 4.17 ms (half of the 8.33 ms revolution time).' },
        { q: 'State Little\'s law for storage.', a: 'Outstanding I/Os (queue depth) = IOPS x latency, so IOPS = queue depth / latency.' },
        { q: 'Why can an SSD not overwrite a page in place?', a: 'NAND must be erased before it is reprogrammed and erasure happens only at block granularity, so the FTL writes to a fresh page and remaps the address.' },
        { q: 'What does TRIM/discard do?', a: 'Tells the SSD which logical blocks are no longer in use so garbage collection does not copy dead data, lowering write amplification and latency.' },
        { q: 'Throughput of 4,000 IOPS at 64 KiB?', a: '4,000 x 64 KiB = 256,000 KiB/s, about 250 MiB/s.' },
        { q: 'Default Linux I/O scheduler for NVMe devices?', a: 'none - NVMe devices are fast and highly parallel, so the kernel does not reorder requests.' },
        { q: 'Durability vs availability for S3 Standard?', a: 'Designed for 99.999999999% (11 nines) durability and 99.99% availability; they measure different things.' },
        { q: 'What is a torn write?', a: 'A multi-sector page that is only partially written when power fails, leaving a mix of old and new data; databases defend with doublewrite buffers or full-page images in the WAL.' },
        {
          q: 'What is a zone write pointer?',
          a: 'In zoned storage (host-managed SMR, NVMe ZNS) each zone must be written sequentially at its write pointer; the host resets the whole zone to reuse it, so the device never garbage-collects it.'
        }
      ],
      resources: [
        { title: 'OSTEP — Hard Disk Drives (chapter 37)', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-disks.pdf', type: 'book' },
        { title: 'OSTEP — Flash-based SSDs (chapter 44)', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-ssd.pdf', type: 'book' },
        { title: 'fio documentation', url: 'https://fio.readthedocs.io/en/latest/fio_doc.html', type: 'docs' },
        { title: 'Amazon EBS volume types', url: 'https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html', type: 'docs' },
        {
          title: 'Zoned Storage documentation (zonedstorage.io)',
          url: 'https://zonedstorage.io/',
          type: 'docs'
        }
      ]
    },
    // ───────────────────────────── Module 2 ─────────────────────────────
    {
      n: 2,
      title: 'Block, File & Object Storage',
      summary: 'The three storage access models — block devices, shared file systems and HTTP object stores — how each works on the wire, their consistency semantics, and how to pick the right one in AWS, Azure and Kubernetes.',
      topics: [
        {
          title: 'Block Storage: LUNs, SAN, iSCSI, Fibre Channel and NVMe-oF',
          def: '<p><strong>Block storage</strong> exposes a raw array of fixed-size blocks addressed by LBA. The host sees a disk (<code>/dev/sdb</code>, <code>/dev/nvme1n1</code>) and puts its own file system or database on it. The storage system knows nothing about files.</p>' +
            '<ul><li><strong>LUN</strong> (logical unit number): a virtual disk carved from an array and presented to hosts. <strong>LUN masking</strong> and FC <strong>zoning</strong> control which hosts see which LUNs.</li>' +
            '<li><strong>SAN</strong>: a dedicated network carrying block protocols.</li></ul>' +
            '<table><thead><tr><th>Protocol</th><th>Transport</th><th>Notes</th></tr></thead><tbody>' +
            '<tr><td>Fibre Channel</td><td>dedicated FC fabric (16/32/64G)</td><td>lossless, low latency, expensive HBAs and switches</td></tr>' +
            '<tr><td>iSCSI</td><td>SCSI over TCP/IP (port 3260)</td><td>commodity Ethernet; initiator (host) ↔ target (array), identified by IQN</td></tr>' +
            '<tr><td>NVMe-oF</td><td>NVMe over RDMA (RoCE), FC or TCP</td><td>keeps NVMe\'s multi-queue model end to end; tens of µs added latency</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Semantics</strong>: single writer. Two hosts mounting the same ext4/XFS volume read-write will corrupt it, because each caches metadata independently. Shared block devices (EBS io1/io2 Multi-Attach, Azure shared disks) need a cluster-aware file system or application-level fencing (e.g. SCSI persistent reservations).</p>' +
            '<p><strong>Cloud</strong>: AWS EBS and Azure Managed Disks are network block storage, scoped to one AZ (Azure also offers ZRS disks replicated across zones). In Kubernetes they back <code>ReadWriteOnce</code> PersistentVolumes.</p>',
          interview: 'Stress that block storage gives the lowest latency and full control (any file system, raw devices for databases) but is single-host and zonal. If asked about sharing a block volume between nodes, mention Multi-Attach limits and that you need a cluster file system or fencing; otherwise choose file or object storage.',
          examples: [
            { label: 'Attach an iSCSI LUN on Linux', lang: 'bash', code: '# Discover targets on the array and log in\nsudo iscsiadm -m discovery -t sendtargets -p 10.0.0.50:3260\nsudo iscsiadm -m node -T iqn.2024-01.com.example:array1.lun7 -p 10.0.0.50:3260 --login\n\n# The LUN now appears as a local disk\nlsblk -o NAME,SIZE,TRAN,VENDOR,MODEL\nsudo mkfs.xfs /dev/sdc && sudo mount /dev/sdc /data' },
            { label: 'Create and attach an EBS volume', lang: 'bash', code: 'aws ec2 create-volume --availability-zone eu-west-1a --volume-type gp3 \\\n  --size 200 --iops 6000 --throughput 250 --encrypted\naws ec2 attach-volume --volume-id vol-0abc123 --instance-id i-0def456 --device /dev/sdf\n# Inside the Nitro instance it shows up as /dev/nvme1n1' }
          ]
        },
        {
          title: 'File Storage: NAS, NFSv3, NFSv4.x, SMB and POSIX Semantics',
          def: '<p><strong>File storage</strong> (NAS) exports a hierarchical namespace — directories, files, permissions, locks — over the network, so many clients can share it simultaneously.</p>' +
            '<table><thead><tr><th></th><th>NFSv3</th><th>NFSv4.0 / 4.1 / 4.2</th><th>SMB 3.x</th></tr></thead><tbody>' +
            '<tr><td>State</td><td>stateless server</td><td>stateful (open/lock state, leases)</td><td>stateful sessions</td></tr>' +
            '<tr><td>Locking</td><td>separate NLM/NSM side protocols</td><td>built into the protocol</td><td>built in (oplocks/leases)</td></tr>' +
            '<tr><td>Ports</td><td>portmapper + several</td><td>single TCP 2049 (firewall-friendly)</td><td>TCP 445</td></tr>' +
            '<tr><td>Security</td><td>AUTH_SYS (trust client UID/GID)</td><td>Kerberos (krb5/i/p), ACLs</td><td>AD/Kerberos, encryption, signing</td></tr>' +
            '<tr><td>Extras</td><td>—</td><td>delegations, compound ops; 4.1 sessions and pNFS; 4.2 server-side copy, sparse files</td><td>multichannel, transparent failover</td></tr>' +
            '</tbody></table>' +
            '<p><strong>POSIX vs network reality</strong>: local POSIX promises that a <code>read()</code> after a <code>write()</code> sees the new data, atomic <code>rename()</code>, advisory locks and so on. NFS relaxes this to <strong>close-to-open consistency</strong>: a client flushes dirty data on <code>close()</code> and revalidates on <code>open()</code>; in between, attribute and directory caches (<code>actimeo</code>, default up to 60 s for directories) can serve stale metadata. Locks can be lost if a client is partitioned past its lease.</p>' +
            '<p><strong>Cloud</strong>: AWS EFS (NFSv4.1, elastic, multi-AZ), FSx (Lustre, Windows File Server, NetApp ONTAP, OpenZFS); Azure Files (SMB and NFSv4.1), Azure NetApp Files. In Kubernetes these back <code>ReadWriteMany</code> volumes.</p>',
          interview: 'Know close-to-open consistency and attribute caching — it explains most "file written on pod A is not visible on pod B" bugs. Mention that NFSv4 put locking and state into the protocol, and that running databases on NFS is risky because of fsync/locking semantics and latency.',
          examples: [
            { label: 'Mount NFS and Amazon EFS', lang: 'bash', code: '# Generic NFSv4.1 mount\nsudo mount -t nfs4 -o vers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 \\\n  nas.example.com:/exports/shared /mnt/shared\n\n# Amazon EFS with the efs-utils helper (TLS in transit)\nsudo mount -t efs -o tls fs-0123456789abcdef0:/ /mnt/efs\n\n# Show negotiated options (vers, rsize, actimeo ...)\nnfsstat -m' }
          ]
        },
        {
          title: 'Object Storage: Buckets, Keys, Metadata, Versioning and Consistency',
          def: '<p><strong>Object storage</strong> stores immutable blobs (objects) identified by a <strong>key</strong> inside a <strong>bucket</strong> (Azure: container in a storage account), accessed via an HTTP API: <code>PUT</code>, <code>GET</code> (with byte ranges), <code>HEAD</code>, <code>DELETE</code>, <code>LIST</code>.</p>' +
            '<ul><li><strong>Flat namespace</strong>: <code>logs/2025/10/app.log</code> is one key; "folders" are just prefixes plus a <code>/</code> delimiter in LIST. Renaming a "folder" means copying every object. (Azure Data Lake Storage Gen2 adds a true hierarchical namespace.)</li>' +
            '<li><strong>Immutability</strong>: you replace whole objects; there are no in-place partial writes. This is what lets object stores scale and replicate cheaply.</li>' +
            '<li><strong>Metadata</strong>: system (size, ETag, Content-Type, storage class) and user-defined headers (<code>x-amz-meta-*</code>), plus tags for lifecycle and access policies.</li>' +
            '<li><strong>Versioning</strong>: every overwrite or delete creates a new version / delete marker — protection against accidental deletes and the basis for Object Lock.</li>' +
            '<li><strong>Access</strong>: IAM / bucket policies, Azure RBAC or SAS tokens, presigned URLs for direct client upload/download.</li></ul>' +
            '<p><strong>Consistency</strong>: since December 2020 Amazon S3 provides <strong>strong read-after-write consistency</strong> for PUT and DELETE of objects and for LIST, in all regions, at no cost. Azure Blob Storage is also strongly consistent. What you still do <em>not</em> get: transactions across objects, and locking — concurrent writers to the same key are last-writer-wins unless you use <strong>conditional writes</strong> (<code>If-None-Match: *</code> to create only if absent, <code>If-Match: &lt;etag&gt;</code> for compare-and-swap; S3 added both in 2024, Azure has supported ETag conditions for years).</p>',
          interview: 'Be precise: S3 is strongly consistent for object reads after writes and for listings, but it has no multi-object transactions or locks; use conditional writes (If-None-Match / If-Match) or an external lock/metadata store for coordination. Mention that bucket configuration changes are still eventually consistent.',
          examples: [
            { label: 'Core object operations', lang: 'bash', code: 'aws s3api put-object --bucket my-bucket --key reports/2025/q3.csv --body q3.csv \\\n  --metadata owner=finance --content-type text/csv\naws s3api head-object --bucket my-bucket --key reports/2025/q3.csv     # ETag, size, metadata\naws s3api get-object --bucket my-bucket --key reports/2025/q3.csv --range bytes=0-1023 part.csv\naws s3api list-objects-v2 --bucket my-bucket --prefix reports/2025/ --delimiter /\n\n# Create-only-if-absent (fails with 412 PreconditionFailed if the key exists)\naws s3api put-object --bucket my-bucket --key locks/job-42 --body owner.txt --if-none-match "*"' },
            { label: 'Conditional create in Go (aws-sdk-go-v2)', lang: 'go', code: 'func createOnce(ctx context.Context, c *s3.Client, bucket, key string, body []byte) (bool, error) {\n    _, err := c.PutObject(ctx, &s3.PutObjectInput{\n        Bucket:      aws.String(bucket),\n        Key:         aws.String(key),\n        Body:        bytes.NewReader(body),\n        IfNoneMatch: aws.String("*"), // only succeed if the key does not exist yet\n    })\n    var apiErr smithy.APIError\n    if errors.As(err, &apiErr) && apiErr.ErrorCode() == "PreconditionFailed" {\n        return false, nil // someone else created it first\n    }\n    return err == nil, err\n}' }
          ]
        },
        {
          title: 'Multipart Upload, Presigned URLs and Object-Store Performance',
          def: '<p><strong>Multipart upload</strong> splits a large object into parts uploaded independently and in parallel:</p>' +
            '<ol><li><code>CreateMultipartUpload</code> → returns an <code>UploadId</code>.</li>' +
            '<li><code>UploadPart</code> for parts 1..N (S3: 5 MiB–5 GiB each, last part may be smaller, max 10,000 parts) → each returns an ETag; retry only failed parts.</li>' +
            '<li><code>CompleteMultipartUpload</code> with the ordered list of part numbers and ETags → the object appears atomically.</li></ol>' +
            '<p>Use it above ~100 MB (the AWS CLI switches automatically at 8 MB). Incomplete uploads keep billing for stored parts — add a lifecycle rule <code>AbortIncompleteMultipartUpload</code>. Single <code>PUT</code> is limited to 5 GiB; with multipart the maximum object size is 50 TB (raised from 5 TB in December 2025). Azure\'s equivalent is block blobs: <code>Put Block</code> + <code>Put Block List</code>.</p>' +
            '<p><strong>Presigned URLs</strong> (Azure: SAS tokens) let browsers and mobile clients upload/download directly to the object store with a short-lived signed URL, keeping large payloads off your API servers.</p>' +
            '<p><strong>Performance model</strong>:</p>' +
            '<ul><li>S3 scales automatically per <strong>prefix</strong>: at least 3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second per partitioned prefix; spread hot keys across prefixes for more parallelism.</li>' +
            '<li>First-byte latency is tens of ms, so parallelise: many concurrent connections, byte-range GETs for large objects.</li>' +
            '<li>Avoid many tiny objects: per-request cost and latency dominate. Pack small records into larger files (Parquet, tar, segment files).</li>' +
            '<li>LIST is paginated (1,000 keys per page) and relatively slow — keep an index in a database rather than listing to find objects.</li>' +
            '<li><strong>S3 Express One Zone</strong> (directory buckets) trades multi-AZ resilience for consistently single-digit-ms latency and very high request rates without prefix warm-up. It uses session-based auth (<code>CreateSession</code>), supports appending to existing objects and an atomic <code>RenameObject</code> that general-purpose buckets lack, but LIST results are not in lexicographic order and data lives in one AZ. Use it for scratch data, caches, checkpoints and ML/analytics staging co-located with compute in the same AZ.</li></ul>',
          interview: 'For any upload-heavy design, say: presigned URLs so clients upload directly, multipart with parallel parts for large files, an AbortIncompleteMultipartUpload lifecycle rule, event notifications to trigger processing, and a metadata database instead of LIST for lookups.',
          examples: [
            { label: 'Low-level multipart upload with the AWS CLI', lang: 'bash', code: 'split -b 100M backup.tar part-\nUPLOAD_ID=$(aws s3api create-multipart-upload --bucket my-bucket --key backups/backup.tar \\\n  --query UploadId --output text)\n\naws s3api upload-part --bucket my-bucket --key backups/backup.tar \\\n  --part-number 1 --upload-id "$UPLOAD_ID" --body part-aa      # returns an ETag\n# ... repeat for each part (in parallel), collecting PartNumber + ETag into parts.json\n\naws s3api complete-multipart-upload --bucket my-bucket --key backups/backup.tar \\\n  --upload-id "$UPLOAD_ID" --multipart-upload file://parts.json\n\n# Find and clean up forgotten uploads\naws s3api list-multipart-uploads --bucket my-bucket' },
            { label: 'Presigned PUT URL in Go', lang: 'go', code: 'cfg, err := config.LoadDefaultConfig(ctx)\nif err != nil {\n    return err\n}\npresigner := s3.NewPresignClient(s3.NewFromConfig(cfg))\nreq, err := presigner.PresignPutObject(ctx, &s3.PutObjectInput{\n    Bucket:      aws.String("user-uploads"),\n    Key:         aws.String("raw/" + uuid.NewString() + ".jpg"),\n    ContentType: aws.String("image/jpeg"),\n}, s3.WithPresignExpires(15*time.Minute))\nif err != nil {\n    return err\n}\n// Return req.URL (and req.SignedHeader) to the client; it PUTs the file directly to S3.' }
          ]
        },
        {
          title: 'Choosing Block vs File vs Object (AWS, Azure, Kubernetes)',
          def: '<table><thead><tr><th></th><th>Block</th><th>File</th><th>Object</th></tr></thead><tbody>' +
            '<tr><td>Unit / addressing</td><td>block by LBA</td><td>path in a directory tree</td><td>key in a flat bucket</td></tr>' +
            '<tr><td>Interface</td><td>SCSI / NVMe device</td><td>POSIX via NFS / SMB</td><td>HTTP REST API / SDK</td></tr>' +
            '<tr><td>Sharing</td><td>one host (single writer)</td><td>many hosts concurrently</td><td>unlimited clients anywhere</td></tr>' +
            '<tr><td>Latency</td><td>lowest (sub-ms)</td><td>low ms</td><td>tens of ms</td></tr>' +
            '<tr><td>Updates</td><td>in place, any offset</td><td>in place, byte ranges</td><td>whole-object replace</td></tr>' +
            '<tr><td>Scale</td><td>TBs per volume</td><td>up to PBs, one namespace</td><td>effectively unlimited (exabytes)</td></tr>' +
            '<tr><td>Cost ($/GB)</td><td>highest</td><td>high</td><td>lowest, with cold tiers</td></tr>' +
            '<tr><td>AWS</td><td>EBS, instance store</td><td>EFS, FSx</td><td>S3</td></tr>' +
            '<tr><td>Azure</td><td>Managed Disks</td><td>Azure Files, Azure NetApp Files</td><td>Blob Storage / ADLS Gen2</td></tr>' +
            '<tr><td>Kubernetes</td><td>RWO PVC (EBS / Azure Disk CSI)</td><td>RWX PVC (EFS / Azure Files CSI)</td><td>app talks to the API (no PVC); optional Mountpoint for S3 / BlobFuse CSI</td></tr>' +
            '<tr><td>Typical use</td><td>databases, boot disks, Kafka brokers</td><td>shared content, home dirs, legacy apps, ML training data</td><td>backups, media, data lakes, logs, static web assets</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Rule of thumb</strong>: databases and anything needing low-latency random writes → block. Several pods that need the same POSIX tree → file. Large, write-once/read-many data accessed by many services or users → object. Cloud-native apps should prefer object storage for blobs and keep pods stateless.</p>',
          interview: 'Answer "which storage would you choose" by naming the access pattern (random small writes vs shared POSIX vs write-once blobs), the sharing requirement, latency and cost, then the concrete service. Mounting object storage as a file system (Mountpoint for S3, BlobFuse2) works for sequential reads but breaks POSIX expectations like random writes, appends and renames.',
          examples: [
            { label: 'Decision sketch', lang: 'text', code: 'Need a raw device / database / lowest latency? ------------> BLOCK  (EBS gp3/io2, Azure Premium SSD v2)\nSeveral hosts/pods must share a POSIX directory tree? -----> FILE   (EFS, FSx, Azure Files)\nWrite-once blobs, HTTP access, huge scale, cheap tiers? ---> OBJECT (S3, Azure Blob)\n\nKubernetes:\n  RWO  PVC -> block CSI (ebs.csi.aws.com, disk.csi.azure.com)\n  RWX  PVC -> file CSI  (efs.csi.aws.com, file.csi.azure.com)\n  Blobs    -> SDK + IAM (IRSA / EKS Pod Identity, Azure Workload Identity)' }
          ]
        }
      ],
      problems: [
        {
          t: 'Choose block vs file vs object storage for 5 workloads',
          d: 'easy', type: 'concept',
          hint: '<ul><li>Workloads: (1) PostgreSQL primary, (2) user profile photos, (3) WordPress uploads shared by 4 web pods, (4) nightly database backups kept 1 year, (5) Kafka broker logs.</li><li>Decide by access pattern, sharing, latency and cost.</li><li>Name the AWS and Azure service for each.</li></ul>',
          solution: '1) PostgreSQL primary -> BLOCK: low-latency random I/O and fsync; EBS gp3/io2 or Azure Premium SSD v2 (RWO PVC).\n2) Profile photos -> OBJECT: write-once, read by many, CDN in front; S3 / Azure Blob, presigned uploads.\n3) WordPress uploads shared by 4 pods -> FILE: shared POSIX directory; EFS / Azure Files (RWX). Better long-term: offload media to object storage via a plugin.\n4) Backups kept 1 year -> OBJECT with lifecycle to cold tiers + Object Lock (immutability).\n5) Kafka logs -> BLOCK (or local NVMe instance store): sequential throughput, one broker per volume; Kafka replicates across brokers itself; tiered storage can offload old segments to object storage.'
        },
        {
          t: 'Map AWS and Azure storage services to the three models',
          d: 'easy', type: 'concept',
          hint: '<ul><li>Block: EBS, instance store / Managed Disks, temporary disk.</li><li>File: EFS, FSx family / Azure Files, Azure NetApp Files.</li><li>Object: S3 (and Express One Zone) / Blob Storage, ADLS Gen2.</li><li>Note scope: AZ vs region for each.</li></ul>',
          solution: 'Block: AWS EBS (AZ-scoped; snapshots are regional in S3), EC2 instance store (ephemeral, local NVMe);\n       Azure Managed Disks (LRS zonal or ZRS across zones), VM temporary disk (ephemeral).\nFile:  AWS EFS (NFSv4.1, Regional multi-AZ or One Zone), FSx for Lustre / Windows File Server / NetApp ONTAP / OpenZFS;\n       Azure Files (SMB 3.x, NFSv4.1 on premium), Azure NetApp Files.\nObject: Amazon S3 (regional, >= 3 AZs except One Zone classes; S3 Express One Zone for single-digit ms);\n       Azure Blob Storage (LRS/ZRS/GRS/GZRS), ADLS Gen2 = Blob + hierarchical namespace.'
        },
        {
          t: 'Mount an NFS export and verify close-to-open behaviour',
          d: 'easy', type: 'hands-on',
          hint: '<ul><li>Mount the same export on two clients with <code>vers=4.1</code>.</li><li>Write a file on client A without closing it (e.g. keep a writer open); stat it on client B.</li><li>Close it on A, then open it on B.</li><li>Inspect options with <code>nfsstat -m</code>; try <code>actimeo=0</code> and compare.</li></ul>',
          solution: '# Both clients\nsudo mount -t nfs4 -o vers=4.1,hard nas:/exports/test /mnt/test\n# Client A: keep a file open while writing\nexec 3>/mnt/test/demo.txt; echo "hello" >&3\n# Client B: may show size 0 / old mtime (data not flushed, attributes cached)\nstat /mnt/test/demo.txt\n# Client A: close -> flush to server\nexec 3>&-\n# Client B: a fresh open() revalidates and sees the data\ncat /mnt/test/demo.txt\nLesson: NFS guarantees visibility only across close() -> open(). Coordinate writers and readers (rename a temp file into place when complete) instead of polling partially written files.'
        },
        {
          t: 'Upload a 20 GB file with S3 multipart upload',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>High-level: <code>aws s3 cp</code> uses multipart automatically; tune <code>multipart_chunksize</code> and <code>max_concurrent_requests</code>.</li><li>Low-level: create → upload-part (parallel) → complete.</li><li>Part size must be 5 MiB–5 GiB and at most 10,000 parts: 20 GB / 10,000 = 2 MB minimum, so 64–128 MiB parts are sensible.</li><li>Add a lifecycle rule to abort incomplete uploads.</li></ul>',
          solution: 'aws configure set default.s3.multipart_chunksize 128MB\naws configure set default.s3.max_concurrent_requests 16\naws s3 cp ./dump.tar s3://my-bucket/backups/dump.tar\n\n# Lifecycle: abort uploads that never completed after 7 days\ncat > lc.json <<EOF\n{"Rules":[{"ID":"abort-mpu","Status":"Enabled","Filter":{},\n  "AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}]}\nEOF\naws s3api put-bucket-lifecycle-configuration --bucket my-bucket --lifecycle-configuration file://lc.json\n\nWhy multipart: parallel throughput across connections, retry only failed parts, start uploading before the full size is known, and required above 5 GiB. Note the ETag of a multipart object is not the MD5 of the content; use additional checksums (e.g. --checksum-algorithm CRC32C / SHA256) for integrity verification.'
        },
        {
          t: 'Explain S3 consistency and build a safe concurrent writer',
          d: 'medium', type: 'concept',
          hint: '<ul><li>What is guaranteed since Dec 2020 (read-after-write, list-after-write)?</li><li>What happens with two simultaneous PUTs to one key?</li><li>Use <code>If-None-Match: *</code> for create-once and <code>If-Match: etag</code> for optimistic concurrency.</li><li>When do you still need an external coordinator (DynamoDB conditional writes, etcd)?</li></ul>',
          solution: 'Guarantees: after a successful PUT/DELETE, any subsequent GET/HEAD/LIST sees it (strong read-after-write, including overwrites and listings). Bucket-level config (policies, lifecycle) is eventually consistent.\nConcurrent PUTs to the same key: no locking, last writer (latest timestamp) wins and the other update is silently lost.\nSafe patterns:\n- Create-once (idempotent job output, leader lease objects): PUT with If-None-Match: * -> 412 if it exists.\n- Read-modify-write of a manifest: GET returns ETag -> modify -> PUT with If-Match: <etag> -> on 412 re-read and retry (optimistic concurrency, like a CAS loop).\n- Multi-object atomicity (e.g. table formats): write immutable data files with unique keys, then atomically swap a pointer (conditional PUT or a catalog DB). This is how Delta Lake / Iceberg commit.\n- Still use DynamoDB/etcd for leases with TTLs, fencing tokens and high-rate coordination.'
        },
        {
          t: 'Debug "file written by pod A is not visible in pod B" on an RWX volume',
          d: 'medium', type: 'debug',
          hint: '<ul><li>Is pod A still holding the file open / buffering writes in user space?</li><li>NFS attribute and directory caches (<code>acregmax</code>, <code>acdirmax</code>, <code>lookupcache</code>).</li><li>Is pod B polling with stat() instead of reopening?</li><li>Are the pods on different nodes and mounting the same PV, or different PVs?</li></ul>',
          solution: 'Checklist:\n1) Confirm both pods use the same PV/claim (kubectl get pvc,pv; same EFS/Azure Files share and path).\n2) Writer side: data still in the application buffer or page cache. Ensure the writer flushes and closes (bufio.Writer.Flush, f.Sync, f.Close).\n3) Reader side: NFS close-to-open means only a new open() revalidates. Directory listings are cached up to acdirmax (default 60 s); negative lookups (file did not exist) can be cached too.\n4) Fix: write to a temp name, fsync, close, then rename() into place (atomic on the server); readers open the final name. Or signal via a queue/event instead of polling the directory. Only as a last resort mount with actimeo=0 / lookupcache=positive (more GETATTR traffic, slower).\n5) For SMB (Azure Files): check oplock/lease caching and the cache= mount option.'
        },
        {
          t: 'Generate presigned upload and download URLs in Go',
          d: 'medium', type: 'coding',
          hint: '<ul><li>Use <code>s3.NewPresignClient</code> from aws-sdk-go-v2 with <code>PresignPutObject</code> / <code>PresignGetObject</code>.</li><li>Short expiry (minutes), fixed Content-Type, server-generated key (never trust client paths).</li><li>Credentials come from the default chain (IRSA / Pod Identity in EKS).</li><li>Expose it via a small <code>net/http</code> handler.</li></ul>',
          solution: 'package main\n\nimport (\n    "context"\n    "encoding/json"\n    "log"\n    "net/http"\n    "time"\n\n    "github.com/aws/aws-sdk-go-v2/aws"\n    "github.com/aws/aws-sdk-go-v2/config"\n    "github.com/aws/aws-sdk-go-v2/service/s3"\n    "github.com/google/uuid"\n)\n\nconst bucket = "user-uploads"\n\nfunc main() {\n    cfg, err := config.LoadDefaultConfig(context.Background())\n    if err != nil {\n        log.Fatal(err)\n    }\n    presign := s3.NewPresignClient(s3.NewFromConfig(cfg))\n\n    http.HandleFunc("POST /uploads", func(w http.ResponseWriter, r *http.Request) {\n        key := "raw/" + uuid.NewString() + ".jpg" // server-chosen key\n        req, err := presign.PresignPutObject(r.Context(), &s3.PutObjectInput{\n            Bucket:      aws.String(bucket),\n            Key:         aws.String(key),\n            ContentType: aws.String("image/jpeg"),\n        }, s3.WithPresignExpires(10*time.Minute))\n        if err != nil {\n            http.Error(w, "presign failed", http.StatusInternalServerError)\n            return\n        }\n        w.Header().Set("Content-Type", "application/json")\n        json.NewEncoder(w).Encode(map[string]any{"key": key, "url": req.URL, "method": req.Method, "headers": req.SignedHeader})\n    })\n\n    http.HandleFunc("GET /files/{key...}", func(w http.ResponseWriter, r *http.Request) {\n        // authorise the caller for this key first (omitted)\n        req, err := presign.PresignGetObject(r.Context(), &s3.GetObjectInput{\n            Bucket: aws.String(bucket),\n            Key:    aws.String(r.PathValue("key")),\n        }, s3.WithPresignExpires(5*time.Minute))\n        if err != nil {\n            http.Error(w, "presign failed", http.StatusInternalServerError)\n            return\n        }\n        http.Redirect(w, r, req.URL, http.StatusTemporaryRedirect)\n    })\n\n    log.Fatal(http.ListenAndServe(":8080", nil))\n}',
          lang: 'go'
        },
        {
          t: 'Explain why running a database on NFS or object storage is risky',
          d: 'medium', type: 'concept',
          hint: '<ul><li>fsync semantics and error reporting over the network.</li><li>Locking: lost locks after partitions, two instances opening the same files.</li><li>Latency per fsync and per random page read.</li><li>Object storage: no in-place updates, no append, no fsync.</li></ul>',
          solution: 'NFS:\n- Every commit fsync becomes a network round trip to the server plus the server\'s own stable write: commit latency rises from tens of microseconds to milliseconds.\n- Write errors may surface late (at close or fsync) and some clients/servers historically mishandled them; soft mounts can return EIO and corrupt data.\n- Advisory locks depend on leases; a partitioned client can lose its lock while still writing -> two writers (split brain). SQLite explicitly warns against network file systems.\n- PostgreSQL and MySQL support NFS only with hard mounts and careful configuration; most teams use block storage.\nObject storage: no partial writes, no append (outside special classes), no fsync or locking, and 10-100 ms latency per request, so engines must be redesigned around it (e.g. LSM SSTables uploaded as immutable objects, as in Neon, Snowflake, or RocksDB-Cloud).'
        },
        {
          t: 'Design storage for a photo-sharing app ingesting 50 million images per day',
          d: 'hard', type: 'design',
          hint: '<ul><li>Estimate: 50M/day ≈ 580/s average, ~3K/s peak; ~2 MB average → ~100 TB/day raw.</li><li>Direct-to-object uploads (presigned, multipart for large), never through app servers.</li><li>Event-driven processing (thumbnails, moderation) from object-created events.</li><li>Metadata in a database, CDN for reads, lifecycle tiering, durability and deletion (GDPR).</li></ul>',
          solution: 'Capacity: 50M x 2 MB = 100 TB/day raw (~36 PB/year) + ~3 resized variants (~10% extra). Requests: ~600 PUT/s avg, ~3,000/s peak; reads 10-100x higher -> served by CDN.\nWrite path:\n1) Client -> API: request upload; API authorises, creates a metadata row (status=PENDING), returns presigned PUT (or multipart) URL with server-generated key, e.g. raw/{userShard}/{uuid}.\n2) Client uploads directly to S3 / Azure Blob.\n3) ObjectCreated event -> SQS/EventBridge (Azure: Event Grid) -> worker pool: validate type, scan, strip EXIF, generate thumbnails to a derived/ prefix, update metadata (status=READY, sizes, checksum).\nRead path: CDN (CloudFront with Origin Access Control / Azure Front Door) -> bucket; signed cookies/URLs for private photos.\nMetadata: DynamoDB/Cosmos DB or sharded PostgreSQL keyed by photo id and user id; never LIST the bucket.\nScale: keys spread over many prefixes (S3 scales per prefix), retries with exponential backoff on 503 SlowDown.\nCost & lifecycle: originals to Standard-IA after 30 days and Glacier Instant Retrieval after 180 days (still ms access); thumbnails stay hot; intelligent tiering if access is unpredictable.\nDurability: versioning + replication to a second region for originals; Object Lock not needed but backups of metadata DB are.\nDeletion: delete metadata, then object + versions + CDN invalidation; lifecycle to expire noncurrent versions so GDPR erasure completes within the policy window.'
        }
      ],
      interviewFocus: [
        {
          q: 'Block vs file vs object storage: how do you choose?',
          a: '<p>Start from the <strong>access pattern</strong>, not the product:</p>' +
            '<ul><li><strong>Block</strong>: the host owns a raw device and builds a file system or database on it. Lowest latency, in-place random writes, fsync-friendly. Single writer, zonal, you manage capacity. → databases, Kafka, boot volumes (EBS, Azure Disk, RWO PVC).</li>' +
            '<li><strong>File</strong>: shared POSIX namespace over NFS/SMB for many clients. Familiar semantics (directories, rename, locks) but relaxed consistency (close-to-open), higher latency, throughput tied to provisioned or elastic modes. → shared content, lift-and-shift apps, ML training data, home directories (EFS, FSx, Azure Files, RWX PVC).</li>' +
            '<li><strong>Object</strong>: immutable blobs with metadata via HTTP. Practically unlimited scale and the cheapest $/GB, rich lifecycle, versioning and immutability, but tens-of-ms latency and whole-object updates. → backups, media, logs, data lakes, static assets (S3, Azure Blob).</li></ul>' +
            '<p>Strong answers add: cost per GB and per request, durability scope (AZ vs region), how Kubernetes consumes each (RWO / RWX / SDK + workload identity), and the anti-patterns (DB on NFS, tiny objects, treating S3 as a POSIX file system).</p>'
        },
        {
          q: 'What does strong consistency in S3 give you, and what does it not?',
          a: '<p><strong>Gives</strong>: after a successful PUT (new or overwrite) or DELETE, every subsequent GET, HEAD and LIST in that region reflects it. You no longer need tricks like S3Guard or "write a new key every time" to avoid stale reads.</p>' +
            '<p><strong>Does not give</strong>:</p>' +
            '<ul><li><strong>Isolation between writers</strong>: concurrent PUTs to one key are last-writer-wins. Use conditional writes (<code>If-None-Match</code>, <code>If-Match</code>) for CAS semantics.</li>' +
            '<li><strong>Multi-object transactions</strong>: writing a dataset of 100 objects is not atomic; readers can observe partial results. Table formats (Iceberg, Delta) solve this with an atomic manifest/pointer swap.</li>' +
            '<li><strong>Cross-region consistency</strong>: Cross-Region Replication is asynchronous (S3 RTC targets 99.99% of objects within 15 minutes).</li>' +
            '<li><strong>Immediate config propagation</strong>: bucket policies and lifecycle changes are eventually consistent.</li></ul>'
        },
        {
          q: 'NFSv3 vs NFSv4.1 vs SMB 3 — what changes for your application?',
          a: '<ul><li><strong>NFSv3</strong>: stateless server, locking via separate NLM/NSM daemons (fragile across failures), multiple ports, AUTH_SYS trusts client UIDs. Simple and still common.</li>' +
            '<li><strong>NFSv4.0/4.1</strong>: stateful with leases, byte-range locking built into the protocol, single port 2049, Kerberos and ACLs, delegations let clients cache aggressively; 4.1 adds sessions (exactly-once semantics for retries) and pNFS for parallel data access. EFS and Azure Files NFS use 4.1.</li>' +
            '<li><strong>SMB 3.x</strong>: Windows-native, AD integration, encryption, multichannel and transparent failover; Linux clients via CIFS.</li></ul>' +
            '<p>For the application: all of them provide close-to-open consistency rather than local POSIX semantics; metadata-heavy workloads (many small files, <code>ls</code> of huge directories, git checkouts) are slow because each operation is a round trip; locks are leases that can be lost on partitions; use <code>hard</code> mounts for data integrity.</p>'
        },
        {
          q: 'Why is object storage cheaper and more scalable than file storage?',
          a: '<ul><li><strong>Flat namespace</strong>: keys are hashed/range-partitioned across an index service; there is no directory tree to lock or keep consistent during renames.</li>' +
            '<li><strong>Immutability</strong>: objects are written once, so replicas and erasure-coded fragments never need in-place update coordination; caching is trivial.</li>' +
            '<li><strong>Simple stateless HTTP API</strong>: no open files, leases or locks per client; any frontend node can serve any request, so frontends scale horizontally.</li>' +
            '<li><strong>Erasure coding and dense HDDs</strong>: large immutable objects suit EC (1.3–1.5x overhead instead of 3x replication) on cheap high-capacity disks.</li>' +
            '<li><strong>Tiering</strong>: whole objects can be migrated to colder media transparently.</li></ul>' +
            '<p>The price is higher latency, no partial updates, and weaker semantics (no rename, no append, no locking), which applications must design around.</p>'
        },
        {
          q: 'How do Kubernetes workloads consume each storage type?',
          a: '<ul><li><strong>Block</strong>: a <code>PersistentVolumeClaim</code> with <code>ReadWriteOnce</code> (or <code>ReadWriteOncePod</code>) bound through a StorageClass to a CSI driver such as <code>ebs.csi.aws.com</code> or <code>disk.csi.azure.com</code>. The volume follows the pod only within its zone. Can also be consumed raw with <code>volumeMode: Block</code>.</li>' +
            '<li><strong>File</strong>: <code>ReadWriteMany</code> PVCs via <code>efs.csi.aws.com</code> or <code>file.csi.azure.com</code>; mounted by pods on many nodes and zones simultaneously.</li>' +
            '<li><strong>Object</strong>: normally no volume at all — the app uses the SDK with workload identity (EKS Pod Identity / IRSA, Azure Workload Identity). Mount-style CSI drivers (Mountpoint for S3, BlobFuse) exist for read-heavy legacy apps but do not offer full POSIX.</li></ul>' +
            '<p>Cloud-native best practice: keep pods stateless, put blobs in object storage, and isolate truly stateful components (databases, queues) on block storage or managed services.</p>'
        }
      ],
      quiz: [
        { q: 'What is a LUN?', a: 'A logical unit number: a virtual block device carved from a storage array and presented to hosts over a SAN protocol such as FC or iSCSI.' },
        { q: 'Which TCP port does NFSv4 use?', a: '2049 only; NFSv3 also needed portmapper and separate lock/mount daemons.' },
        { q: 'What is close-to-open consistency?', a: 'NFS clients flush changes on close() and revalidate cached data on open(), so a reader sees a writer\'s data only if it opens after the writer closed.' },
        { q: 'S3 multipart limits?', a: 'Parts of 5 MiB to 5 GiB (last part may be smaller), up to 10,000 parts; single PUT limited to 5 GiB; maximum object size 50 TB (5 TB before December 2025).' },
        { q: 'Since when is S3 strongly consistent?', a: 'December 2020: strong read-after-write for PUT/DELETE of objects and for LIST, in all regions.' },
        { q: 'How do you prevent two writers overwriting the same S3 key?', a: 'Conditional writes: If-None-Match: * for create-only, If-Match with the ETag for compare-and-swap; on 412 re-read and retry.' },
        { q: 'Kubernetes access mode typically backed by EBS or Azure Disk?', a: 'ReadWriteOnce (or ReadWriteOncePod); EFS and Azure Files back ReadWriteMany.' },
        { q: 'Why are S3 "folders" expensive to rename?', a: 'The namespace is flat; a folder is just a key prefix, so renaming means copying and deleting every object under it.' }
      ],
      resources: [
        { title: 'Amazon S3 User Guide — What is S3 (incl. consistency model)', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html', type: 'docs' },
        { title: 'Amazon S3 — Uploading objects using multipart upload', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html', type: 'docs' },
        { title: 'Amazon EFS — What is Amazon Elastic File System?', url: 'https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html', type: 'docs' },
        { title: 'Introduction to Azure Storage', url: 'https://learn.microsoft.com/azure/storage/common/storage-introduction', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 3 ─────────────────────────────
    {
      n: 3,
      title: 'RAID, Replication & Durability',
      summary: 'How storage systems survive failing disks, nodes and data centres: RAID levels and their write penalties, erasure coding, replication factors and failure domains, checksums against silent corruption, and how to reason about "eleven nines" quantitatively.',
      topics: [
        {
          title: 'RAID Levels 0, 1, 5, 6 and 10',
          def: '<p><strong>RAID</strong> (Redundant Array of Independent Disks) combines disks for performance (striping), redundancy (mirroring or parity) or both. For <em>N</em> disks of size <em>S</em>:</p>' +
            '<table><thead><tr><th>Level</th><th>Layout</th><th>Usable capacity</th><th>Survives</th><th>Write penalty</th><th>Min disks</th><th>Notes</th></tr></thead><tbody>' +
            '<tr><td>RAID 0</td><td>striping</td><td>N x S</td><td>0 failures</td><td>1</td><td>2</td><td>fastest, any failure loses everything</td></tr>' +
            '<tr><td>RAID 1</td><td>mirroring</td><td>S (2-way)</td><td>N − 1</td><td>2</td><td>2</td><td>fast reads, simple rebuild (copy)</td></tr>' +
            '<tr><td>RAID 5</td><td>striping + 1 distributed parity</td><td>(N − 1) x S</td><td>1</td><td>4</td><td>3</td><td>cheap, slow small writes, risky rebuilds on big disks</td></tr>' +
            '<tr><td>RAID 6</td><td>striping + 2 parities (P+Q)</td><td>(N − 2) x S</td><td>any 2</td><td>6</td><td>4</td><td>safe for large HDDs, slowest writes</td></tr>' +
            '<tr><td>RAID 10</td><td>stripe of mirrors</td><td>N/2 x S</td><td>1 guaranteed (up to N/2 if in different mirrors)</td><td>2</td><td>4</td><td>best for databases: fast writes and rebuilds</td></tr>' +
            '</tbody></table>' +
            '<ul><li><strong>Parity</strong>: RAID 5 stores <code>P = D1 XOR D2 XOR … XOR Dn</code>; any one missing block equals the XOR of the others. RAID 6 adds a second, Reed–Solomon-style syndrome <code>Q</code> so any two can be recovered.</li>' +
            '<li><strong>Write hole</strong>: a crash between writing data and parity leaves them inconsistent, silently corrupting a later rebuild. Mitigations: battery/flash-backed controller cache, mdadm write journal or partial parity log, or copy-on-write RAID-Z in ZFS.</li>' +
            '<li><strong>Hardware vs software</strong>: hardware controllers offload parity and offer protected cache; software RAID (Linux <code>mdadm</code>, ZFS, Storage Spaces) is transparent, portable and standard in the cloud era.</li>' +
            '<li><strong>RAID is not a backup</strong>: it does not protect against deletion, ransomware, corruption written by software, or losing the whole server.</li></ul>',
          interview: 'Memorise the table (capacity, tolerance, write penalty) — "calculate usable capacity and fault tolerance for RAID 6 with 8 x 4 TB" is a classic. Then show judgement: RAID 10 for write-heavy databases, RAID 6 for large-capacity HDD arrays, never RAID 5 with multi-TB HDDs, and always "RAID is not a backup".',
          examples: [
            { label: 'Software RAID with mdadm', lang: 'bash', code: '# RAID 10 across four NVMe devices\nsudo mdadm --create /dev/md0 --level=10 --raid-devices=4 /dev/nvme{1..4}n1\n# RAID 6 across eight HDDs\nsudo mdadm --create /dev/md1 --level=6 --raid-devices=8 /dev/sd{b..i}\n\ncat /proc/mdstat                 # state, rebuild/resync progress\nsudo mdadm --detail /dev/md1     # members, failed devices, layout\nsudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf' },
            { label: 'XOR parity in one picture', lang: 'text', code: 'Stripe:   D1 = 1011   D2 = 0110   D3 = 1100\nParity:   P  = D1 ^ D2 ^ D3 = 0001\n\nDisk with D2 dies -> D2 = D1 ^ D3 ^ P = 1011 ^ 1100 ^ 0001 = 0110  (recovered)\n\nSmall write to D1 (RAID 5 read-modify-write = 4 I/Os):\n  read old D1, read old P, P_new = P_old ^ D1_old ^ D1_new, write D1_new, write P_new' }
          ]
        },
        {
          title: 'Write Penalty, Effective IOPS and Rebuild Risk',
          def: '<p>A small random write to a parity array is a <strong>read-modify-write</strong>: RAID 5 reads old data and old parity, then writes new data and new parity (4 back-end I/Os); RAID 6 updates two parities (6 I/Os); mirrors write twice (2). Full-stripe sequential writes avoid the reads.</p>' +
            '<p><strong>Effective front-end IOPS</strong> = <code>raw IOPS / (read% + write% x penalty)</code>. Eight 180-IOPS disks (1,440 raw) at 70% reads / 30% writes deliver about 1,108 IOPS in RAID 10, 758 in RAID 5 and 576 in RAID 6.</p>' +
            '<p><strong>Rebuild risk</strong> is why RAID 5 fell out of favour:</p>' +
            '<ul><li>Rebuilding reads <em>every</em> surviving disk end to end. With 20 TB HDDs at ~150 MB/s under production load, that takes days.</li>' +
            '<li><strong>Unrecoverable read errors (URE)</strong>: consumer drives are specified at 1 per 10<sup>14</sup> bits (~12.5 TB read), enterprise at 10<sup>15</sup>–10<sup>16</sup>. Reading 24 TB during a RAID 5 rebuild on 10<sup>14</sup> drives gives <code>P(no URE) ≈ e<sup>−1.92</sup> ≈ 15%</code> on paper.</li>' +
            '<li><strong>Correlated failures</strong>: disks from the same batch, same age and same enclosure fail together, and the rebuild workload itself stresses them.</li>' +
            '<li>Performance degrades during rebuild (degraded reads reconstruct from parity).</li></ul>' +
            '<p>Modern answers: RAID 6 or triple parity for big HDDs, RAID 10 for performance, <strong>declustered / distributed RAID</strong> (and erasure-coded distributed storage like Ceph or S3) where many disks share the rebuild so it finishes in minutes to hours.</p>',
          interview: 'Show you can compute effective IOPS with the write penalty and explain why rebuild time, URE rates and correlated failures make single-parity RAID unsafe on large disks. The key insight interviewers want: durability depends on mean time to repair, so fast, parallel rebuilds matter as much as parity count.',
          examples: [
            { label: 'Effective IOPS calculator', lang: 'text', code: 'raw = 8 disks x 180 IOPS = 1,440    workload = 70% read / 30% write\n\nRAID 10 (penalty 2): 1440 / (0.7 + 0.3 x 2) = 1440 / 1.3 = ~1,108 IOPS\nRAID 5  (penalty 4): 1440 / (0.7 + 0.3 x 4) = 1440 / 1.9 = ~  758 IOPS\nRAID 6  (penalty 6): 1440 / (0.7 + 0.3 x 6) = 1440 / 2.5 = ~  576 IOPS\n\nURE during RAID 5 rebuild of 4 x 8 TB (read 3 x 8 TB = 1.92e14 bits):\n  URE 1e-14 : P(success) = e^(-1.92)  = ~15%\n  URE 1e-15 : P(success) = e^(-0.192) = ~83%' }
          ]
        },
        {
          title: 'Erasure Coding: Reed–Solomon k+m and Local Reconstruction Codes',
          def: '<p><strong>Erasure coding (EC)</strong> generalises parity: split data into <strong>k</strong> data fragments, compute <strong>m</strong> parity fragments, store all k+m on different disks/nodes/zones. With Reed–Solomon (an MDS code) <strong>any k of the k+m fragments</strong> reconstruct the data, so it survives any m losses.</p>' +
            '<table><thead><tr><th>Scheme</th><th>Raw overhead</th><th>Tolerates</th><th>Repair reads (one lost fragment)</th><th>Used by</th></tr></thead><tbody>' +
            '<tr><td>3x replication</td><td>3.0x</td><td>2 losses</td><td>1 fragment</td><td>HDFS default, Cassandra RF=3, Ceph replicated pools</td></tr>' +
            '<tr><td>RS(6,3)</td><td>1.5x</td><td>3 losses</td><td>6 fragments</td><td>HDFS EC policy RS-6-3-1024k</td></tr>' +
            '<tr><td>RS(10,4)</td><td>1.4x</td><td>4 losses</td><td>10 fragments</td><td>Facebook f4, many object stores</td></tr>' +
            '<tr><td>LRC(12,2,2)</td><td>1.33x</td><td>any 3 (some 4)</td><td>6 fragments (local group)</td><td>Azure Storage</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Trade-offs vs replication</strong>:</p>' +
            '<ul><li>Far lower storage cost for equal or better durability — why cloud object stores use EC for most data.</li>' +
            '<li>Higher <strong>repair traffic</strong>: rebuilding one fragment reads k fragments over the network. <strong>Local Reconstruction Codes</strong> add local parities so common single failures read fewer fragments.</li>' +
            '<li>CPU for encoding/decoding (fast with SIMD), extra latency, and <strong>degraded reads</strong> while a fragment is missing.</li>' +
            '<li>Poor fit for small objects and in-place updates (each update rewrites parity) — EC suits large immutable data; hot small data often stays replicated.</li>' +
            '<li><strong>Placement</strong>: fragments must span failure domains so that losing a whole domain loses at most m fragments, e.g. RS(6,3) as 3+3+3 across three AZs survives an AZ outage; RS(10,4) spread 5+5+4 does not.</li></ul>',
          interview: 'Compare 3x replication and RS(10,4) on overhead, tolerance, repair bandwidth and latency, then explain fragment placement across AZs. Mentioning LRC (Azure) and that small or frequently updated data stays replicated shows real-world depth.',
          examples: [
            { label: 'Reed–Solomon in Go (klauspost/reedsolomon)', lang: 'go', code: 'enc, err := reedsolomon.New(6, 3) // k=6 data, m=3 parity\nif err != nil {\n    return err\n}\nshards, err := enc.Split(data) // 9 equally sized shards (data padded)\nif err != nil {\n    return err\n}\nif err := enc.Encode(shards); err != nil { // fill the 3 parity shards\n    return err\n}\n\n// Simulate losing any 3 shards (e.g. one whole AZ)\nshards[0], shards[4], shards[7] = nil, nil, nil\nif err := enc.Reconstruct(shards); err != nil {\n    return err\n}\nok, _ := enc.Verify(shards) // true\nvar out bytes.Buffer\nerr = enc.Join(&out, shards, len(data)) // original bytes' },
            { label: 'Ceph erasure-coded pool', lang: 'bash', code: 'ceph osd erasure-code-profile set ec-4-2 k=4 m=2 crush-failure-domain=host\nceph osd pool create objects-ec 128 128 erasure ec-4-2\nceph osd pool set objects-ec allow_ec_overwrites true   # needed for RBD/CephFS on EC\nceph osd erasure-code-profile get ec-4-2' }
          ]
        },
        {
          title: 'Replication Factor, Failure Domains and Durability Math',
          def: '<p><strong>Replication factor (RF)</strong> is the number of full copies. RF=3 is the classic default (HDFS, Cassandra, Kafka, Ceph, etcd quorum) because it survives one failure during maintenance of another and allows majority quorums.</p>' +
            '<ul><li><strong>Failure domains</strong>: disk → host → rack → power/network zone → AZ → region. Replicas on the same rack die together; place them across domains (HDFS rack awareness, Ceph CRUSH rules, Kubernetes topology spread, S3 across ≥3 AZs).</li>' +
            '<li><strong>MTTR dominates</strong>: data is lost only if the remaining copies fail <em>before</em> repair completes. Parallel re-replication across hundreds of disks (minutes) beats a single-disk rebuild (days).</li>' +
            '<li><strong>Correlated failures</strong> (firmware bug, bad batch, power event, operator error, software bug that corrupts all replicas) dominate real data loss — so independence assumptions overstate durability, and backups remain necessary.</li></ul>' +
            '<p><strong>Back-of-envelope model</strong> (independent failures, AFR = 2%, repair window T):</p>' +
            '<table><thead><tr><th>Repair window</th><th>Annual P(loss) for one 3-replica set</th><th>≈ nines</th></tr></thead><tbody>' +
            '<tr><td>1 day</td><td>3 x 0.02 x (2 x 5.5e-5) x 5.5e-5 ≈ 3.6e-10</td><td>~9</td></tr>' +
            '<tr><td>1 hour</td><td>≈ 6e-13</td><td>~12</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Reading "11 nines"</strong>: 99.999999999% annual durability means an expected loss of 1 in 10<sup>11</sup> objects per year — storing 10 million objects, you would expect to lose one roughly every 10,000 years. It is a design target from such models, not a contractual SLA (S3\'s SLA covers availability, not durability).</p>' +
            '<p>Note the <strong>copyset</strong> effect: with random placement across a large cluster, almost any 3 simultaneous disk failures destroy <em>some</em> object; restricting placement to fewer replica sets lowers the frequency of loss events (at the cost of bigger events).</p>',
          interview: 'Walk through the durability estimate aloud: failure rate of the first replica, probability the others fail within the repair window, and how shrinking MTTR multiplies the nines. Then add the caveat that correlated failures and software bugs dominate, which is why replication does not replace backups.',
          examples: [
            { label: 'Durability estimate, step by step', lang: 'text', code: 'AFR per disk = 2%  -> daily failure probability p = 0.02 / 365 = 5.5e-5\nReplicas = 3 on independent disks, repair window = 1 day\n\nRate a first replica fails      : 3 x 0.02            = 0.06 / year\nP(one of other 2 fails in window): 2 x 5.5e-5         = 1.1e-4\nP(last one fails in window)      : 5.5e-5\nP(loss per year)                 : 0.06 x 1.1e-4 x 5.5e-5 = 3.6e-10  (~9.4 nines)\n\nShrink repair to 1 hour (p_hour = 2.3e-6):\n  0.06 x (2 x 2.3e-6) x 2.3e-6 = 6.3e-13  (~12 nines)  -> MTTR is the biggest lever' }
          ]
        },
        {
          title: 'Checksums, Silent Data Corruption and Scrubbing',
          def: '<p>Disks do not always fail loudly. <strong>Silent data corruption</strong> (bit rot) returns wrong data with no I/O error:</p>' +
            '<ul><li>Media decay and latent sector errors not caught by the drive ECC.</li>' +
            '<li><strong>Misdirected writes</strong> (data lands at the wrong LBA) and <strong>lost writes</strong> (drive acknowledges but never persists).</li>' +
            '<li>Firmware, controller, DMA, RAM (non-ECC) and network bugs; software bugs writing garbage.</li></ul>' +
            '<p>RAID alone cannot tell which copy is right — on a mismatch, mirror/parity checks only know the copies disagree. The fix is <strong>end-to-end checksums</strong> stored separately from the data they protect:</p>' +
            '<table><thead><tr><th>System</th><th>Mechanism</th></tr></thead><tbody>' +
            '<tr><td>ZFS / Btrfs</td><td>checksum in the parent block pointer (Merkle tree); self-heal from a good mirror/parity copy</td></tr>' +
            '<tr><td>Ceph BlueStore</td><td>crc32c per block on every read; deep-scrub compares replicas</td></tr>' +
            '<tr><td>HDFS</td><td>CRC32C per 512-byte chunk, verified by clients; DataNode block scanner</td></tr>' +
            '<tr><td>PostgreSQL</td><td>optional page checksums (<code>initdb --data-checksums</code>; default on since PostgreSQL 18)</td></tr>' +
            '<tr><td>S3 / Azure Blob</td><td>checksums on upload (Content-MD5, CRC32C, CRC64NVME, SHA-256) verified server-side; continuous background integrity checks</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Scrubbing</strong> periodically reads <em>all</em> data (including cold data nobody reads) and verifies checksums, repairing from redundancy before a second fault makes the error unrecoverable: <code>zpool scrub</code>, <code>ceph pg deep-scrub</code>, mdadm <code>check</code>, HDFS block scanner. Applications should also checksum end-to-end (e.g. hash on upload, verify on download).</p>',
          interview: 'Explain why a checksum must be stored away from the data (a misdirected write would carry a valid-looking embedded checksum) and why scrubbing exists (latent errors in cold data are discovered only during a rebuild otherwise). Mention concrete systems: ZFS self-healing, Ceph deep-scrub, HDFS CRC32C, S3 checksum headers.',
          examples: [
            { label: 'Scrub and check integrity', lang: 'bash', code: '# ZFS: read everything, verify checksums, repair from redundancy\nsudo zpool scrub tank && zpool status -v tank\n\n# Linux md RAID consistency check\necho check | sudo tee /sys/block/md0/md/sync_action\ncat /sys/block/md0/md/mismatch_cnt\n\n# Ceph\nceph pg deep-scrub 2.1f\nceph health detail | grep -i inconsistent\n\n# S3: upload with a full-object checksum the service verifies\naws s3api put-object --bucket my-bucket --key data.bin --body data.bin --checksum-algorithm CRC32C' }
          ]
        }
      ],
      problems: [
        {
          t: 'Calculate usable capacity and fault tolerance for RAID 6 with 8x4TB',
          d: 'easy', type: 'concept',
          hint: '<ul><li>RAID 6 reserves two disks\' worth of capacity for P and Q parity.</li><li>Convert TB (decimal) to TiB as an OS would report.</li><li>How many arbitrary disk failures can it survive? What is the write penalty?</li><li>Compare with RAID 10 and RAID 5 on the same disks.</li></ul>',
          solution: 'RAID 6: (8 - 2) x 4 TB = 24 TB usable (~21.8 TiB), 75% efficiency, survives any 2 disk failures, write penalty 6.\nRAID 5: 28 TB, survives 1, penalty 4 (risky rebuild on 4 TB HDDs).\nRAID 10: 16 TB, survives 1 guaranteed (up to 4 if each failure hits a different mirror), penalty 2.\nRAID 0: 32 TB, survives 0.\nRead performance for RAID 6 approaches 8 disks\' worth for random reads; small random writes are the weakness.'
        },
        {
          t: 'Pick a RAID level for three workloads',
          d: 'easy', type: 'concept',
          hint: '<ul><li>(a) OLTP database with heavy random writes on 4 SSDs; (b) 12 x 20 TB HDD backup target; (c) scratch space for a video render farm.</li><li>Weigh capacity efficiency, write penalty, rebuild time and consequences of loss.</li></ul>',
          solution: '(a) RAID 10: write penalty 2, fast rebuild (copy one mirror), predictable latency. Parity RAID on SSDs adds write amplification and latency.\n(b) RAID 6 (or ZFS RAID-Z2/Z3, or two RAID 6 groups): capacity-efficient and tolerates a second failure during multi-day rebuilds of 20 TB disks. Never RAID 5 here.\n(c) RAID 0: data is reproducible scratch, maximum throughput and capacity; accept total loss on any failure.\nIn every case: RAID is not a backup.'
        },
        {
          t: 'Compute effective IOPS with the RAID write penalty',
          d: 'medium', type: 'concept',
          hint: '<ul><li>12 x 15K RPM disks at ~180 IOPS each; workload 60% read / 40% write.</li><li>Effective = raw / (R + W x penalty).</li><li>How many disks would RAID 6 need to match RAID 10?</li></ul>',
          solution: 'Raw = 12 x 180 = 2,160 IOPS\nRAID 10: 2160 / (0.6 + 0.4 x 2) = 2160 / 1.4 = ~1,543\nRAID 5 : 2160 / (0.6 + 0.4 x 4) = 2160 / 2.2 = ~982\nRAID 6 : 2160 / (0.6 + 0.4 x 6) = 2160 / 3.0 = 720\nTo match 1,543 with RAID 6: raw needed = 1543 x 3.0 = 4,629 -> ~26 disks.\nCaveats: controller write-back cache and full-stripe writes reduce the effective penalty; SSDs change the absolute numbers but not the ratios.'
        },
        {
          t: 'Estimate the probability of an unrecoverable read error during a RAID 5 rebuild',
          d: 'medium', type: 'concept',
          hint: '<ul><li>Array: 6 x 12 TB, URE spec 1 in 10<sup>14</sup> bits.</li><li>The rebuild reads all surviving disks completely.</li><li>P(no error) = (1 − 10<sup>−14</sup>)<sup>bits</sup> ≈ e<sup>−bits x 10<sup>−14</sup></sup>.</li><li>Repeat for 10<sup>15</sup> and discuss why real-world rates differ from spec sheets.</li></ul>',
          solution: 'Bits read = 5 x 12 TB = 60 TB = 60e12 x 8 = 4.8e14 bits\nURE 1e-14: P(no URE) = e^(-4.8)  = ~0.8%  -> rebuild almost certainly hits an error\nURE 1e-15: P(no URE) = e^(-0.48) = ~62%\nSpec sheets are worst-case upper bounds; field rates are usually better, but a URE during a single-parity rebuild means at least a lost stripe (and with some controllers, a failed rebuild). Add correlated failures and multi-day rebuild times -> use RAID 6/RAID-Z2, smaller groups, enterprise drives, and regular scrubs that find latent errors before a rebuild.'
        },
        {
          t: 'Build, fail and rebuild a software RAID with mdadm',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>Use loop devices so no real disks are at risk.</li><li>Create RAID 5, put a file system on it, write a file and record its checksum.</li><li>Mark a member failed, remove it, add a replacement and watch <code>/proc/mdstat</code>.</li><li>Verify the checksum afterwards.</li></ul>',
          solution: 'for i in 1 2 3 4; do truncate -s 1G /tmp/d$i.img; sudo losetup /dev/loop$i /tmp/d$i.img; done\nsudo mdadm --create /dev/md9 --level=5 --raid-devices=3 /dev/loop1 /dev/loop2 /dev/loop3\nsudo mkfs.ext4 /dev/md9 && sudo mount /dev/md9 /mnt/r5\nsudo dd if=/dev/urandom of=/mnt/r5/blob bs=1M count=200 && sha256sum /mnt/r5/blob\n\nsudo mdadm /dev/md9 --fail /dev/loop2 --remove /dev/loop2   # degraded, still readable\ncat /proc/mdstat                                             # [U_U]\nsudo mdadm /dev/md9 --add /dev/loop4                          # rebuild starts\nwatch cat /proc/mdstat\nsha256sum /mnt/r5/blob                                       # unchanged\n\nCleanup: umount, mdadm --stop /dev/md9, losetup -d each loop device.'
        },
        {
          t: 'Implement XOR parity and recover a lost block in Go',
          d: 'medium', type: 'coding',
          hint: '<ul><li>Split data into k equal blocks (pad the last).</li><li>Parity = XOR of all data blocks byte by byte.</li><li>Recover a missing block by XOR-ing parity with the surviving blocks.</li><li>Add a test that removes each block in turn.</li></ul>',
          solution: 'package parity\n\nimport "errors"\n\n// Encode splits data into k blocks and returns k data blocks plus one parity block.\nfunc Encode(data []byte, k int) [][]byte {\n    size := (len(data) + k - 1) / k\n    blocks := make([][]byte, k+1)\n    for i := 0; i < k; i++ {\n        b := make([]byte, size) // zero padding for the last block\n        start := i * size\n        if start < len(data) {\n            copy(b, data[start:min(start+size, len(data))])\n        }\n        blocks[i] = b\n    }\n    parity := make([]byte, size)\n    for i := 0; i < k; i++ {\n        xorInto(parity, blocks[i])\n    }\n    blocks[k] = parity\n    return blocks\n}\n\n// Recover rebuilds at most one nil block (data or parity) in place.\nfunc Recover(blocks [][]byte) error {\n    missing, size := -1, 0\n    for i, b := range blocks {\n        if b == nil {\n            if missing != -1 {\n                return errors.New("more than one block missing: single parity cannot recover")\n            }\n            missing = i\n        } else {\n            size = len(b)\n        }\n    }\n    if missing == -1 {\n        return nil\n    }\n    out := make([]byte, size)\n    for i, b := range blocks {\n        if i != missing {\n            xorInto(out, b)\n        }\n    }\n    blocks[missing] = out\n    return nil\n}\n\nfunc xorInto(dst, src []byte) {\n    for i := range dst {\n        dst[i] ^= src[i]\n    }\n}\n\n// Test idea: for each i, copy blocks, set blocks[i] = nil, Recover, compare with original.\n// Extension: replace XOR with Reed-Solomon (github.com/klauspost/reedsolomon) to tolerate m losses.',
          lang: 'go'
        },
        {
          t: 'Compare 3x replication with RS(10,4) erasure coding for 1 PB',
          d: 'medium', type: 'design',
          hint: '<ul><li>Raw capacity, number of tolerated failures, repair network traffic, read latency, small-object behaviour.</li><li>Place fragments so a full AZ loss is survivable — does RS(10,4) over 3 AZs work?</li><li>Consider a hybrid: replicate hot/small data, erasure-code cold/large data.</li></ul>',
          solution: '3x replication: 3 PB raw, tolerates 2 losses, repair reads 1 copy (1x traffic), reads from any replica (low latency), fine for small objects and updates.\nRS(10,4): 1.4 PB raw (saves 1.6 PB, ~53%), tolerates 4 losses, repair reads 10 fragments (10x traffic per lost fragment), degraded reads need decode, poor for tiny objects (min fragment overhead) and in-place updates.\nAZ tolerance: 14 fragments over 3 AZs is at best 5/5/4 -> losing one AZ loses 5 > 4 fragments -> data unavailable. Options: RS(6,3) as 3/3/3 (1.5x), RS(9,6)-style codes, or LRC with zone-aware layouts; or replicate across AZs and EC within each AZ.\nHybrid (what large object stores do): new and small objects replicated; once cold and large, background-converted to EC; tiny objects packed into larger EC-coded extents.'
        },
        {
          t: 'Estimate annual durability of a 3-replica storage cluster',
          d: 'hard', type: 'concept',
          hint: '<ul><li>Inputs: AFR 2% per disk, repair window 1 day vs 1 hour, 3 replicas on independent disks.</li><li>P(loss) ≈ rate of first failure x P(second in window) x P(third in window).</li><li>Convert to "nines" and discuss what breaks the independence assumption.</li><li>Extend: how does cluster size and placement (copysets) change the chance that <em>some</em> object is lost?</li></ul>',
          solution: 'Daily per-disk failure probability p = 0.02 / 365 = 5.5e-5.\nOne replica set, 1-day repair: 3 x 0.02 x (2 x 5.5e-5) x 5.5e-5 = 3.6e-10 per year -> ~9.4 nines.\n1-hour repair: p_h = 2.3e-6 -> 0.06 x 4.6e-6 x 2.3e-6 = 6.3e-13 -> ~12 nines.\nTakeaways:\n- MTTR is the most powerful lever: parallel re-replication across many disks shrinks the window.\n- Adding a 4th replica or EC with m=4 multiplies by another tiny factor.\n- Real loss is driven by correlated events (same batch/firmware, rack power, AZ, software bug, operator delete); model them separately and keep independent backups.\n- In a cluster with millions of objects randomly placed, any 3 concurrent disk failures likely hit some object\'s full replica set; copyset-aware placement reduces the probability of any loss event.\n- 11 nines = expected loss of 1 in 1e11 objects/year: for 10M objects, about one object per 10,000 years.'
        },
        {
          t: 'Debug intermittent checksum failures when reading data-lake files',
          d: 'hard', type: 'debug',
          hint: '<ul><li>Determine where corruption happens: at write, at rest, in transit, or in the reader.</li><li>Compare stored checksums (S3 additional checksums, Parquet page CRCs) with recomputed ones.</li><li>Look for patterns: one host, one instance type, one client library version, multipart uploads.</li><li>Think about non-ECC memory, bad NICs, and buggy retry logic that concatenates partial bodies.</li></ul>',
          solution: 'Approach:\n1) Reproduce: re-download the same object several times and from different hosts. If the bytes differ between downloads -> transit/client problem; if consistently wrong -> written corrupt.\n2) Compare with the integrity metadata: HeadObject --checksum-mode ENABLED returns the stored CRC32C/SHA256; if the stored checksum matches the bad bytes, the writer uploaded corrupt data.\n3) Correlate writers: logs show all bad files written by one node -> run memtest/EDAC counters (non-ECC or failing DIMM), check NIC offload errors, kernel messages.\n4) Check client code: retries that append to a partially written buffer, concurrent writes to a shared buffer (data race - run go test -race), multipart part ordering mistakes.\n5) Prevention: compute a checksum at the source and send it with the upload (x-amz-checksum-*), the service rejects mismatches; verify on read; enable Parquet page checksums; keep versioning so earlier good versions can be restored; schedule integrity audits (scrubbing) over the lake.'
        }
      ],
      interviewFocus: [
        {
          q: 'RAID 5 vs RAID 6 vs RAID 10 — which would you choose and why?',
          a: '<ul><li><strong>RAID 10</strong>: 50% capacity, write penalty 2, rebuild = copy one disk (fast, low stress), excellent random write performance → OLTP databases, latency-sensitive workloads.</li>' +
            '<li><strong>RAID 6</strong>: N−2 capacity, survives any two failures, write penalty 6 → large HDD arrays, backup targets, archives where capacity matters and writes are mostly sequential (full-stripe).</li>' +
            '<li><strong>RAID 5</strong>: N−1 capacity, single parity, penalty 4. With multi-TB disks the multi-day rebuild must read every other disk without a URE or second failure — too risky for HDDs; acceptable only for small SSD sets or reproducible data.</li></ul>' +
            '<p>Add the modern context: in distributed systems the same role is played by replication and erasure coding across nodes and AZs, with declustered rebuilds in minutes. And RAID is never a backup.</p>'
        },
        {
          q: 'Replication vs erasure coding: when would you use each?',
          a: '<table><thead><tr><th></th><th>Replication (RF=3)</th><th>Erasure coding (e.g. RS 6+3, 10+4)</th></tr></thead><tbody>' +
            '<tr><td>Storage overhead</td><td>3x</td><td>1.3–1.5x</td></tr>' +
            '<tr><td>Read latency</td><td>read any one copy</td><td>read k fragments; decode on degraded reads</td></tr>' +
            '<tr><td>Write / update</td><td>simple, supports in-place updates</td><td>parity recompute; best for immutable data</td></tr>' +
            '<tr><td>Repair traffic</td><td>1x</td><td>k x per lost fragment (LRC reduces it)</td></tr>' +
            '<tr><td>Small objects</td><td>fine</td><td>inefficient; pack them first</td></tr>' +
            '</tbody></table>' +
            '<p>Use replication for hot, small, mutable data (databases, metadata, recent writes) and EC for large, cold, immutable data (object store bulk, HDFS cold data, backups). Many systems do both: write replicated, then convert to EC asynchronously.</p>'
        },
        {
          q: 'What is silent data corruption and how do storage systems defend against it?',
          a: '<p>Corruption that returns wrong data without an error: bit rot, misdirected or lost writes, firmware/controller bugs, bad RAM, software bugs. Disk ECC and RAID parity do not detect it reliably.</p>' +
            '<ul><li><strong>End-to-end checksums</strong> stored separately from the data (ZFS block pointers, Ceph BlueStore crc32c, HDFS CRC32C files, database page checksums).</li>' +
            '<li><strong>Verify on every read</strong> and repair from a redundant copy (self-healing).</li>' +
            '<li><strong>Scrubbing</strong> to find latent errors in cold data before redundancy is lost.</li>' +
            '<li><strong>Application-level checksums</strong> across hops (S3 <code>x-amz-checksum-crc32c</code>, Content-MD5) and ECC memory.</li>' +
            '<li><strong>Versioned backups</strong>, because corruption written by software is faithfully replicated.</li></ul>'
        },
        {
          q: 'How do you interpret "11 nines" of durability, and what really causes data loss?',
          a: '<p>99.999999999% annual durability = expected loss of 10<sup>−11</sup> of objects per year: with 10 million objects, one object every ~10,000 years. It comes from models of independent component failures, redundancy (EC across ≥3 AZs) and repair time; S3 states it as a design goal, not an SLA.</p>' +
            '<p>What actually loses data in practice:</p>' +
            '<ul><li>Humans and software: accidental deletes, bad lifecycle rules, buggy code overwriting objects, compromised credentials, ransomware.</li>' +
            '<li>Correlated failures: firmware bugs, region-wide events.</li></ul>' +
            '<p>So durability engineering is also versioning, Object Lock / immutable backups, cross-region and cross-account copies, least privilege and restore testing.</p>'
        }
      ],
      quiz: [
        { q: 'Usable capacity of RAID 10 with 8 x 2 TB?', a: '8 TB (half the raw capacity).' },
        { q: 'Write penalty of RAID 5 and RAID 6?', a: 'RAID 5: 4 back-end I/Os per small write; RAID 6: 6.' },
        { q: 'What is the RAID write hole?', a: 'A crash between writing data and parity leaves the stripe inconsistent, so a later reconstruction produces wrong data; fixed with protected cache, journals or copy-on-write (RAID-Z).' },
        { q: 'Overhead and tolerance of RS(10,4)?', a: '1.4x raw storage, tolerates any 4 lost fragments, reconstructs from any 10 of 14.' },
        { q: 'Why is repair traffic higher with erasure coding?', a: 'Rebuilding one fragment requires reading k surviving fragments, versus one copy for replication.' },
        { q: 'What is scrubbing?', a: 'Periodically reading all data and verifying checksums to detect and repair latent corruption before another failure removes the redundancy.' },
        { q: 'Biggest lever on durability for a replicated system?', a: 'Shorter mean time to repair (fast, parallel re-replication), plus placement across independent failure domains.' }
      ],
      resources: [
        { title: 'OSTEP — Redundant Arrays of Inexpensive Disks (RAID)', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-raid.pdf', type: 'book' },
        { title: 'OSTEP — Data Integrity and Protection', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-integrity.pdf', type: 'book' },
        { title: 'Ceph — Erasure Code', url: 'https://docs.ceph.com/en/latest/rados/operations/erasure-code/', type: 'docs' },
        { title: 'Amazon S3 — Data protection', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/DataDurability.html', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 4 ─────────────────────────────
    {
      n: 4,
      title: 'File Systems',
      summary: 'How a file system turns a block device into files and directories: inodes and extents, journaling and crash consistency, copy-on-write and snapshots, the page cache, and the fsync rules every database and durable Go service depends on.',
      topics: [
        {
          title: 'Inodes, Directories, Blocks and Extents',
          def: '<p>A Unix file system separates <strong>names</strong> from <strong>files</strong>:</p>' +
            '<ul><li>An <strong>inode</strong> holds a file\'s metadata: type and mode, owner, size, timestamps (atime/mtime/ctime), link count, and where its data lives. It does <em>not</em> contain the file name.</li>' +
            '<li>A <strong>directory</strong> is a special file mapping names → inode numbers (ext4 uses hashed HTree indexes for large directories; XFS uses B+trees).</li>' +
            '<li><strong>Hard links</strong> are extra directory entries for the same inode (same file system only); data is freed when the link count reaches 0 <em>and</em> no process has it open. <strong>Symlinks</strong> are small files containing a path.</li></ul>' +
            '<p><strong>Locating data</strong>: classic ext2/3 used block maps (12 direct pointers + indirect, double, triple indirect blocks). Modern file systems use <strong>extents</strong> — (logical start, physical start, length) runs — so a 1 GiB contiguous file needs a handful of entries instead of 262,144 pointers. <strong>Delayed allocation</strong> picks physical blocks at writeback time to produce bigger extents and less fragmentation.</p>' +
            '<p><strong>Classic gotchas in production</strong>:</p>' +
            '<ul><li><em>"No space left on device" while <code>df -h</code> shows free space</em>: inode exhaustion (millions of tiny files; ext4 fixes inode count at mkfs time — check <code>df -i</code>), or a deleted log file still held open by a process (<code>lsof +L1</code>).</li>' +
            '<li><code>df</code> and <code>du</code> disagree: open-but-deleted files, or files hidden under a mount point.</li>' +
            '<li>ext4 reserves 5% of blocks for root by default (<code>tune2fs -m</code>).</li></ul>',
          interview: 'Be ready to explain what lives in an inode vs a directory entry, why rename within a file system is cheap (it only edits directory entries), and the two classic "disk full but not full" causes: inode exhaustion and deleted-but-open files. These come up constantly in SRE-style debugging rounds.',
          examples: [
            { label: 'Inspect inodes, links and extents', lang: 'bash', code: 'stat app.log                    # inode number, links, size, blocks, timestamps\nls -li                          # inode numbers in a listing\ndf -hT; df -i                   # space and inode usage per file system\nsudo lsof +L1                   # deleted files still held open (space not freed)\nfilefrag -v bigfile.dat         # extents and fragmentation\nsudo debugfs -R "stat <12>" /dev/nvme1n1   # raw ext4 inode 12' }
          ]
        },
        {
          title: 'Crash Consistency and Journaling',
          def: '<p>Appending one block to a file requires updating at least three structures: the <strong>data block</strong>, the <strong>inode</strong> (size, pointers) and the <strong>free-space bitmap</strong>. A crash between these writes leaves the file system inconsistent (leaked blocks, inode pointing to garbage). Old systems ran <code>fsck</code> over the whole disk at boot — hours on large volumes.</p>' +
            '<p><strong>Journaling</strong> (write-ahead logging for the file system): first write the intended changes to a journal, then a <strong>commit record</strong>, then <strong>checkpoint</strong> them to their final locations; after a crash, replay committed transactions and discard incomplete ones. Recovery takes seconds.</p>' +
            '<table><thead><tr><th>ext4 mode</th><th>What is journaled</th><th>Crash behaviour</th><th>Cost</th></tr></thead><tbody>' +
            '<tr><td><code>data=journal</code></td><td>metadata and data</td><td>strongest; data written twice</td><td>slowest for large writes</td></tr>' +
            '<tr><td><code>data=ordered</code> (default)</td><td>metadata only, but data blocks are flushed <em>before</em> the metadata commit</td><td>no stale/garbage data exposed in files</td><td>good balance</td></tr>' +
            '<tr><td><code>data=writeback</code></td><td>metadata only, no ordering</td><td>file may contain stale old blocks after a crash</td><td>fastest</td></tr>' +
            '</tbody></table>' +
            '<p>XFS journals metadata only (logical logging, delayed logging) and relies on ordering and unwritten extents to avoid exposing stale data. Alternatives to journaling: <strong>copy-on-write</strong> (ZFS, Btrfs, APFS — never overwrite live data, so the on-disk tree is always consistent) and <strong>log-structured</strong> file systems (F2FS for flash).</p>' +
            '<p><strong>Important limit</strong>: journaling protects <em>file-system structure</em>, not your application data. Without <code>fsync</code>, recently written data can still be lost or a file can be left at its old contents — journaling just guarantees the file system mounts cleanly.</p>',
          interview: 'Explain the crash-consistency problem with the three-structure example, then the journal / commit / checkpoint protocol. Point out that ext4 data=ordered is the default and that journaling guarantees metadata consistency only; application durability still needs fsync. This exact distinction is a favourite follow-up.',
          examples: [
            { label: 'Journal settings in practice', lang: 'bash', code: 'findmnt -o TARGET,FSTYPE,OPTIONS /data      # e.g. rw,relatime,data=ordered (ext4)\nsudo dumpe2fs -h /dev/nvme1n1 | grep -i journal\n\n# XFS: external log on a faster device and log buffer tuning\nsudo mkfs.xfs -l logdev=/dev/nvme2n1p1,size=1g /dev/nvme1n1\nsudo mount -o logdev=/dev/nvme2n1p1,logbsize=256k /dev/nvme1n1 /data' }
          ]
        },
        {
          title: 'ext4 vs XFS vs Btrfs vs ZFS',
          def: '<table><thead><tr><th></th><th>ext4</th><th>XFS</th><th>Btrfs</th><th>ZFS (OpenZFS)</th></tr></thead><tbody>' +
            '<tr><td>Design</td><td>journaling, extents</td><td>journaling, B+trees, allocation groups</td><td>copy-on-write B-trees</td><td>copy-on-write, pooled storage</td></tr>' +
            '<tr><td>Max FS / file</td><td>1 EiB / 16 TiB (4 KiB blocks)</td><td>8 EiB / 8 EiB</td><td>16 EiB</td><td>effectively unlimited</td></tr>' +
            '<tr><td>Data checksums</td><td>no (metadata only)</td><td>no (metadata CRCs)</td><td>yes</td><td>yes, end to end</td></tr>' +
            '<tr><td>Snapshots</td><td>no (use LVM)</td><td>no (use LVM)</td><td>yes, subvolumes</td><td>yes, plus clones and send/receive</td></tr>' +
            '<tr><td>Built-in RAID / volume mgmt</td><td>no</td><td>no</td><td>yes (RAID 1/10 solid; RAID 5/6 not recommended)</td><td>yes: mirrors, RAID-Z1/2/3</td></tr>' +
            '<tr><td>Compression</td><td>no</td><td>no</td><td>zstd, lzo, zlib</td><td>lz4, zstd</td></tr>' +
            '<tr><td>Shrink</td><td>offline</td><td>cannot shrink</td><td>online</td><td>limited (vdev removal)</td></tr>' +
            '<tr><td>Strengths</td><td>simple, robust, universal default (Debian/Ubuntu)</td><td>parallel I/O, huge files, RHEL default</td><td>snapshots, compression, flexible (Fedora/SUSE)</td><td>integrity, snapshots, caching (ARC, L2ARC, SLOG)</td></tr>' +
            '</tbody></table>' +
            '<ul><li>For databases on cloud block volumes, <strong>ext4 or XFS</strong> are the safe defaults (managed services and most Kubernetes CSI drivers use them). XFS scales better with many parallel writers.</li>' +
            '<li><strong>ZFS</strong> shines on bare-metal storage servers (integrity, snapshots, replication via <code>zfs send</code>); it is CDDL-licensed, so it ships as a separate module, not in mainline Linux.</li>' +
            '<li>In Kubernetes, the CSI <code>fsType</code> parameter (often <code>ext4</code> or <code>xfs</code>) decides what is formatted on first attach.</li></ul>',
          interview: 'Do not just list features — tie them to workloads: XFS for large parallel I/O and big files, ext4 for general purpose, ZFS when integrity and snapshots matter on your own hardware, Btrfs for flexible snapshots. Mention that copy-on-write file systems need tuning (recordsize, nodatacow) for databases and VM images.',
          examples: [
            { label: 'Create and mount file systems', lang: 'bash', code: 'sudo mkfs.ext4 -L data -E lazy_itable_init=0 /dev/nvme1n1\nsudo mkfs.xfs -L data /dev/nvme1n1\nsudo mount -o noatime /dev/nvme1n1 /data\n# Persist in /etc/fstab by UUID, never by /dev/nvmeXn1 (names can change across reboots)\nsudo blkid /dev/nvme1n1\necho "UUID=<uuid> /data xfs noatime,nofail 0 2" | sudo tee -a /etc/fstab\n# Grow after enlarging a cloud volume\nsudo growpart /dev/nvme0n1 1; sudo xfs_growfs /data     # or: sudo resize2fs /dev/nvme1n1' }
          ]
        },
        {
          title: 'Copy-on-Write and Snapshots',
          def: '<p><strong>Copy-on-write (CoW)</strong> file systems never overwrite live blocks. A change writes new data blocks, then new copies of every metadata block on the path up to the root, and finally atomically switches the root pointer (ZFS <em>uberblock</em>, Btrfs superblock). Consequences:</p>' +
            '<ul><li><strong>Always-consistent on disk</strong>: a crash leaves either the old tree or the new one — no fsck, no torn metadata.</li>' +
            '<li><strong>Snapshots are O(1)</strong>: keep a reference to the old root; blocks are shared until modified. <strong>Clones</strong> are writable snapshots (instant dev/test copies of a database).</li>' +
            '<li><strong>Incremental replication</strong>: the difference between two snapshots is known exactly (<code>zfs send -i</code>, <code>btrfs send -p</code>).</li>' +
            '<li><strong>Checksums fit naturally</strong>: each pointer stores its child\'s checksum, forming a Merkle tree.</li></ul>' +
            '<p><strong>Costs</strong>: random overwrites (databases, VM images) fragment files and amplify writes, and snapshots retain old blocks so deleting data may not free space. Tuning: match ZFS <code>recordsize</code> to the DB page size (e.g. 16K for InnoDB, 8K–16K for PostgreSQL with compression), separate datasets for WAL, <code>chattr +C</code> (nodatacow) on Btrfs for VM images.</p>' +
            '<p><strong>Snapshots elsewhere</strong>: LVM thin snapshots (block-level CoW), storage-array snapshots, and cloud volume snapshots (EBS, Azure Managed Disk) which are incremental block copies stored in object storage. Kubernetes exposes them through <code>VolumeSnapshot</code>. A snapshot on the same pool or array is <em>not</em> a backup (Module 8).</p>',
          interview: 'Explain how CoW makes snapshots nearly free and crash consistency automatic, then the trade-off for random-overwrite workloads. Expect "why not use snapshots as backups?": same failure domain, same credentials, and crash-consistent rather than application-consistent unless you quiesce or rely on the database\'s WAL replay.',
          examples: [
            { label: 'ZFS datasets, snapshots, clones and replication', lang: 'bash', code: 'sudo zpool create tank mirror /dev/nvme1n1 /dev/nvme2n1\nsudo zfs create -o recordsize=16k -o compression=lz4 -o atime=off tank/mysql\n\nsudo zfs snapshot tank/mysql@pre-upgrade\nzfs list -t snapshot\nsudo zfs clone tank/mysql@pre-upgrade tank/mysql-test      # instant writable copy\nsudo zfs rollback tank/mysql@pre-upgrade                   # undo the upgrade\n\n# Incremental replication to another host\nsudo zfs send -i tank/mysql@mon tank/mysql@tue | ssh backup01 sudo zfs recv -F backup/mysql' }
          ]
        },
        {
          title: 'Page Cache, fsync and Durability Pitfalls',
          def: '<p><code>write()</code> normally just copies bytes into the <strong>page cache</strong> and marks pages dirty; it returns before anything reaches the disk. Kernel flusher threads write dirty pages back later (by default after ~30 s, <code>vm.dirty_expire_centisecs</code>, or when dirty memory crosses <code>vm.dirty_background_ratio</code>). A <em>process</em> crash loses nothing that was written; a <em>kernel</em> crash or power loss loses everything not yet flushed.</p>' +
            '<table><thead><tr><th>Call</th><th>Guarantee</th></tr></thead><tbody>' +
            '<tr><td><code>fsync(fd)</code></td><td>file data + all metadata on stable storage, and a device cache flush</td></tr>' +
            '<tr><td><code>fdatasync(fd)</code></td><td>data + metadata needed to read it (e.g. size), skips mtime → often one fewer write</td></tr>' +
            '<tr><td><code>O_DSYNC</code> / <code>O_SYNC</code></td><td>each write behaves like fdatasync / fsync</td></tr>' +
            '<tr><td><code>O_DIRECT</code></td><td>bypasses the page cache but is <em>not</em> durable on its own — still need fsync for metadata and device cache</td></tr>' +
            '<tr><td><code>sync_file_range</code></td><td>starts writeback only; no durability guarantee</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Pitfalls that lose "acknowledged" data</strong>:</p>' +
            '<ul><li><strong>New files</strong>: fsync on the file does not persist its directory entry — also fsync the <em>parent directory</em>.</li>' +
            '<li><strong>Atomic replace</strong>: write temp → fsync temp → <code>rename()</code> over the target (atomic on POSIX) → fsync directory. Skipping the first fsync can leave a zero-length file after a crash on some file systems.</li>' +
            '<li><strong>Ordering</strong>: without fsync between them, two writes may reach disk in any order (a commit record before its data).</li>' +
            '<li><strong>fsync errors</strong> ("fsyncgate", 2018): on Linux a failed writeback may mark pages clean and report the error once; retrying fsync can then "succeed" while the data is gone. PostgreSQL now PANICs and recovers from WAL on fsync failure (<code>data_sync_retry=off</code>).</li>' +
            '<li><strong>Lying hardware</strong>: drives with volatile write caches and no power-loss protection may ignore flushes. Enterprise SSDs with PLP make fsync both safe and fast.</li>' +
            '<li><strong>Configuration</strong>: PostgreSQL <code>fsync=off</code> (corruption risk) or <code>synchronous_commit=off</code> (lose last ~600 ms of commits, no corruption), MySQL <code>innodb_flush_log_at_trx_commit=2</code>, Redis <code>appendfsync everysec</code>.</li></ul>',
          interview: 'This is the core of "why could a committed write be lost?". Walk the path write() → page cache → device cache → media, then list the rules: fsync the file, fsync the directory for creates/renames, never retry a failed fsync, and know what each database durability knob trades away. Mention fsyncgate by name — interviewers love it.',
          examples: [
            { label: 'Crash-safe atomic file replace in Go', lang: 'go', code: '// WriteFileAtomic replaces path with data so that after a crash the file holds\n// either the complete old contents or the complete new contents (Linux/Unix).\nfunc WriteFileAtomic(path string, data []byte, perm os.FileMode) (err error) {\n    dir := filepath.Dir(path)\n    tmp, err := os.CreateTemp(dir, "."+filepath.Base(path)+".tmp-*") // same FS as target\n    if err != nil {\n        return err\n    }\n    defer func() {\n        if err != nil {\n            tmp.Close()\n            os.Remove(tmp.Name())\n        }\n    }()\n    if _, err = tmp.Write(data); err != nil {\n        return err\n    }\n    if err = tmp.Chmod(perm); err != nil {\n        return err\n    }\n    if err = tmp.Sync(); err != nil { // 1. data durable before it becomes visible\n        return err\n    }\n    if err = tmp.Close(); err != nil {\n        return err\n    }\n    if err = os.Rename(tmp.Name(), path); err != nil { // 2. atomic switch\n        return err\n    }\n    d, err := os.Open(dir)\n    if err != nil {\n        return err\n    }\n    defer d.Close()\n    return d.Sync() // 3. persist the directory entry (the rename itself)\n}' },
            { label: 'Watch dirty pages and writeback', lang: 'bash', code: 'grep -E "Dirty|Writeback" /proc/meminfo\nsysctl vm.dirty_background_ratio vm.dirty_ratio vm.dirty_expire_centisecs\n# Measure fsync latency like a database commit\nfio --name=fsync --filename=/data/fsync.test --size=256m --rw=write --bs=8k --ioengine=sync --fdatasync=1 --runtime=30 --time_based' }
          ]
        },
        {
          title: 'Distributed and Network File Systems',
          def: '<p>Sharing one namespace across many machines makes <strong>metadata</strong> (lookups, permissions, directory listings, locks) the hard part, because every operation needs a consistent answer.</p>' +
            '<table><thead><tr><th>System</th><th>Architecture</th><th>Typical use</th></tr></thead><tbody>' +
            '<tr><td>NFS / SMB servers, EFS, Azure Files</td><td>clients talk to a server (or scale-out service) speaking NFS/SMB</td><td>general shared storage, RWX volumes</td></tr>' +
            '<tr><td>CephFS</td><td>metadata servers (MDS) + data in RADOS objects; POSIX, kernel and FUSE clients</td><td>on-prem shared storage, Kubernetes RWX via Rook</td></tr>' +
            '<tr><td>Lustre (FSx for Lustre)</td><td>metadata servers (MDS/MDT) + object storage servers (OSS/OST), file striping</td><td>HPC, ML training at hundreds of GB/s</td></tr>' +
            '<tr><td>HDFS</td><td>NameNode (metadata in RAM) + DataNodes (128 MB blocks, 3 replicas); write-once/append, not POSIX</td><td>Hadoop/Spark batch analytics</td></tr>' +
            '<tr><td>JuiceFS and similar</td><td>metadata in a database (Redis, TiKV, PostgreSQL), data chunks in object storage</td><td>POSIX on top of S3/Blob</td></tr>' +
            '</tbody></table>' +
            '<ul><li><strong>Small files and metadata-heavy workloads</strong> (git checkouts, <code>npm install</code>, millions of tiny images) are slow on network file systems: each <code>stat</code>/<code>open</code> is a round trip, so a 1 ms latency x 100,000 files is 100 s.</li>' +
            '<li><strong>Throughput models</strong> differ: EFS Elastic vs Provisioned throughput, Azure Files premium scales with provisioned size, Lustre scales with OSTs and striping.</li>' +
            '<li><strong>Consistency</strong>: close-to-open (NFS), strong (CephFS with capabilities), single writer/append-only (HDFS).</li></ul>',
          interview: 'If asked to share data across pods or nodes, discuss metadata scalability, consistency model and small-file performance, not just capacity. A strong answer suggests restructuring: pack small files into archives or columnar files on object storage, cache locally (emptyDir / local NVMe), and keep shared file systems for genuinely shared POSIX needs.',
          examples: [
            { label: 'Measure metadata cost on a shared mount', lang: 'bash', code: '# Create 10,000 tiny files locally vs on NFS/EFS and compare\ntime (mkdir -p /tmp/t && cd /tmp/t && for i in $(seq 10000); do echo x > f$i; done)\ntime (mkdir -p /mnt/efs/t && cd /mnt/efs/t && for i in $(seq 10000); do echo x > f$i; done)\n\n# Per-operation NFS client statistics (getattr, lookup, open counts and latency)\nnfsiostat 5 /mnt/efs' }
          ]
        }
      ],
      problems: [
        {
          t: 'Explain what an inode stores and what a directory is',
          d: 'easy', type: 'concept',
          hint: '<ul><li>List inode fields; note the file name is absent.</li><li>A directory maps names to inode numbers.</li><li>Explain hard links vs symlinks and when data blocks are freed.</li><li>Why is <code>mv</code> within one file system instant but across file systems a copy?</li></ul>',
          solution: 'Inode: type/mode, uid/gid, size, timestamps (atime, mtime, ctime; birth time on ext4/XFS), link count, extent tree or block pointers, extended attributes/ACLs.\nDirectory: a file whose contents map name -> inode number.\nHard link: another name for the same inode (same FS only; link count++). Symlink: separate inode storing a path; can dangle or cross file systems.\nData is freed when link count == 0 and no open file descriptors remain.\nmv within a FS: rename() edits directory entries only (atomic, O(1)). Across FS: copy data + delete source (not atomic).'
        },
        {
          t: 'Fix "No space left on device" while df shows free space',
          d: 'easy', type: 'debug',
          hint: '<ul><li>Check inode usage with <code>df -i</code>.</li><li>Look for deleted-but-open files with <code>lsof +L1</code>.</li><li>Consider reserved blocks, quotas, and container overlay or tmpfs limits.</li><li>In Kubernetes, check the node\'s ephemeral storage and the PVC capacity separately.</li></ul>',
          solution: '1) df -i -> IUse% 100%: millions of tiny files (session files, cache, mail queue). Delete or archive them; long-term, reformat with more inodes (mkfs.ext4 -i / -N) or use XFS (dynamic inode allocation).\n2) sudo lsof +L1 -> a rotated log file still open by a process. Restart/HUP the process or truncate via /proc/<pid>/fd/<n>; fix logrotate (copytruncate or postrotate signal).\n3) Reserved blocks: ext4 keeps 5% for root; non-root writers see ENOSPC earlier (tune2fs -m 1 on data volumes).\n4) Quotas (repquota), a full tmpfs (/dev/shm, /run), or overlayfs upper dir on the node root disk.\n5) Kubernetes: container ephemeral-storage limit exceeded -> pod eviction; PVC full -> expand the PVC if the StorageClass has allowVolumeExpansion: true.'
        },
        {
          t: 'Choose a file system for four scenarios',
          d: 'easy', type: 'concept',
          hint: '<ul><li>(a) PostgreSQL on an EBS volume; (b) 200 TB NAS with nightly replication offsite; (c) developer laptop with frequent OS rollbacks; (d) a directory with 50 million small files.</li><li>Consider integrity, snapshots, parallelism and inode limits.</li></ul>',
          solution: '(a) XFS or ext4 with noatime; separate volume for WAL. CoW not needed (EBS snapshots + WAL archiving handle backups).\n(b) ZFS (RAID-Z2 vdevs, checksums + scrubs, snapshots, zfs send -i for incremental offsite replication).\n(c) Btrfs with snapper/timeshift snapshots of / (Fedora/openSUSE default style).\n(d) XFS (dynamic inode allocation, B+tree directories) or ext4 formatted with enough inodes and dir_index; better still, re-architect to pack small files into object storage or a database.'
        },
        {
          t: 'Explain why a write acknowledged by the DB may be lost without fsync',
          d: 'medium', type: 'concept',
          hint: '<ul><li>Trace write() → page cache → device write cache → media.</li><li>Distinguish process crash, kernel panic and power loss.</li><li>Name the database settings that skip or delay fsync.</li><li>Include the replication angle: async replicas can also lose acknowledged writes on failover.</li></ul>',
          solution: 'write() returns once bytes are in the kernel page cache (dirty pages). If the DB acknowledges the commit at that point:\n- Process crash: data survives (page cache belongs to the kernel and is flushed later).\n- Kernel panic or power loss: dirty pages (up to ~30 s by default) are gone -> acknowledged transactions vanish; worse, partial page writes can corrupt data files if WAL ordering is not enforced.\n- Even after the OS issues the write, a drive with a volatile cache and no power-loss protection may hold it in DRAM; only a flush/FUA (which fsync triggers) forces it to media.\nSettings that trade this away: PostgreSQL fsync=off (risk of corruption) and synchronous_commit=off (lose the last few hundred ms of commits, still consistent); MySQL innodb_flush_log_at_trx_commit=0/2 and sync_binlog != 1; MongoDB writeConcern without j:true; Redis appendfsync everysec/no; Kafka relies on replication (acks=all + min.insync.replicas) rather than per-message fsync.\nReplication: with asynchronous replicas, a commit acknowledged by the primary may not exist on the replica promoted after a failover.\nCorrect pattern: append to the WAL, fdatasync, then acknowledge (group commit batches many transactions per fsync to keep throughput).'
        },
        {
          t: 'Atomically replace a config file in Go',
          d: 'medium', type: 'coding',
          hint: '<ul><li>Create the temp file in the <em>same directory</em> (rename only works atomically within one file system).</li><li>Write, <code>Sync()</code>, <code>Close()</code>, <code>os.Rename</code>, then open the directory and <code>Sync()</code> it.</li><li>Clean up the temp file on any error.</li><li>Test by killing the process at random points and checking that the file is always old or new, never empty or partial.</li></ul>',
          solution: 'package atomicfile\n\nimport (\n    "os"\n    "path/filepath"\n)\n\n// WriteFile durably and atomically replaces path (Linux/Unix semantics).\nfunc WriteFile(path string, data []byte, perm os.FileMode) (err error) {\n    dir := filepath.Dir(path)\n    tmp, err := os.CreateTemp(dir, "."+filepath.Base(path)+".tmp-*")\n    if err != nil {\n        return err\n    }\n    defer func() {\n        if err != nil {\n            tmp.Close()\n            os.Remove(tmp.Name())\n        }\n    }()\n    if _, err = tmp.Write(data); err != nil {\n        return err\n    }\n    if err = tmp.Chmod(perm); err != nil {\n        return err\n    }\n    if err = tmp.Sync(); err != nil {\n        return err\n    }\n    if err = tmp.Close(); err != nil {\n        return err\n    }\n    if err = os.Rename(tmp.Name(), path); err != nil {\n        return err\n    }\n    d, err := os.Open(dir)\n    if err != nil {\n        return err\n    }\n    defer d.Close()\n    return d.Sync()\n}\n\n// Notes:\n// - Readers never see a partial file: they open either the old or the new inode.\n// - Without tmp.Sync(), some file systems can persist the rename before the data,\n//   leaving an empty file after a crash.\n// - Without the directory Sync(), the rename itself may be lost after a crash.\n// - Kubernetes ConfigMap volumes use the same idea: files are symlinks into a\n//   timestamped directory that is swapped atomically via a "..data" symlink rename.',
          lang: 'go'
        },
        {
          t: 'Take, roll back and replicate ZFS snapshots',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>Create a pool from loop/sparse files and a dataset with compression.</li><li>Write data, snapshot, modify, compare with <code>zfs diff</code>, roll back.</li><li>Clone a snapshot for a test copy.</li><li>Send a full then an incremental stream to a second pool.</li></ul>',
          solution: 'truncate -s 2G /tmp/z1 /tmp/z2 /tmp/z3\nsudo zpool create lab mirror /tmp/z1 /tmp/z2\nsudo zpool create bak /tmp/z3\nsudo zfs create -o compression=zstd lab/app\necho v1 | sudo tee /lab/app/config\nsudo zfs snapshot lab/app@s1\necho v2 | sudo tee /lab/app/config; sudo touch /lab/app/new\nsudo zfs diff lab/app@s1                       # M /lab/app/config, + /lab/app/new\nsudo zfs clone lab/app@s1 lab/app-test          # writable copy at s1\nsudo zfs send lab/app@s1 | sudo zfs recv bak/app\nsudo zfs snapshot lab/app@s2\nsudo zfs send -i @s1 lab/app@s2 | sudo zfs recv bak/app   # only changed blocks\nsudo zfs destroy lab/app-test\nsudo zfs rollback -r lab/app@s1                 # back to v1 (destroys later snapshots)\nzfs list -t all -o name,used,refer'
        },
        {
          t: 'Compare ext4 journaling modes after a crash',
          d: 'medium', type: 'concept',
          hint: '<ul><li>Scenario: an application appends 1 MB to a file and the machine loses power before any fsync.</li><li>What can the file contain after reboot under <code>data=journal</code>, <code>data=ordered</code> and <code>data=writeback</code>?</li><li>What changes if the application had called fdatasync?</li></ul>',
          solution: 'data=journal: data and metadata are committed together; after replay the file has either the old size or the new size with the new data (if the transaction committed). Most consistent, slowest.\ndata=ordered (default): data blocks are forced to disk before the metadata transaction commits, so if the new size is visible the data is real; otherwise the file has its old size. No garbage.\ndata=writeback: metadata may commit before data reaches disk -> after a crash the file can show the new size but contain stale blocks from deleted files (data leak, garbage).\nIn all modes without fsync the append may be entirely lost - journaling protects structure, not durability. With fdatasync returning success, the data and size are durable in every mode.'
        },
        {
          t: 'Explain fsyncgate and how a storage engine must handle fsync errors',
          d: 'hard', type: 'concept',
          hint: '<ul><li>What does Linux do with dirty pages whose writeback fails (e.g. a thin-provisioned volume runs out of space, or a transient SAN error)?</li><li>Why does "retry fsync until it succeeds" lose data?</li><li>Which fd receives the error if another process opened the file?</li><li>What did PostgreSQL change?</li></ul>',
          solution: 'In 2018 PostgreSQL developers found that on Linux, when background writeback of a dirty page fails, the kernel reports EIO on the next fsync but may mark the page clean (or drop it). A second fsync then returns success although the data never reached disk. Errors are tracked per file (errseq_t since Linux 4.13) and reported once to each open fd; historically an fd opened after the error could miss it.\nConsequences: an engine that retries fsync and continues (as PostgreSQL did, checkpoint retry) silently loses writes.\nCorrect handling:\n- Treat any fsync failure on data files as fatal: crash and recover from the WAL (PostgreSQL PANICs; the data_sync_retry setting, default off, was added in 2019 and back-patched to all supported versions).\n- Keep the WAL the source of truth so that replay can redo lost data-file writes.\n- Or use O_DIRECT + own buffer management so the engine still holds the data to rewrite (InnoDB, ScyllaDB approach).\n- Monitor kernel logs and thin-pool/volume capacity; ENOSPC on thin-provisioned storage is a classic trigger.'
        },
        {
          t: 'Tune storage for PostgreSQL on ZFS or XFS',
          d: 'hard', type: 'design',
          hint: '<ul><li>Separate WAL and data (different datasets or volumes).</li><li>XFS: noatime, enough readahead for scans, correct sector alignment.</li><li>ZFS: recordsize vs 8 KiB pages, compression, logbias, SLOG, ARC sizing vs <code>shared_buffers</code>.</li><li>Decide what full_page_writes and checksums mean on each.</li></ul>',
          solution: 'XFS (typical on cloud block volumes):\n- Data and WAL on separate volumes: commits (WAL fdatasync) do not queue behind checkpoint writes; size WAL volume for IOPS/latency, data for capacity + throughput.\n- mkfs.xfs defaults are fine; mount noatime; keep full_page_writes=on (torn pages possible); enable data checksums (default in PostgreSQL 18).\n- shared_buffers ~25% RAM, rest for page cache (PostgreSQL relies on it).\nZFS (bare metal / self-managed):\n- tank/pgdata: recordsize=16k-32k with compression=lz4/zstd (compression offsets read amplification of > 8k records), atime=off, xattr=sa, logbias=throughput.\n- tank/pgwal: recordsize=128k (sequential), on mirrors; optional SLOG on PLP NVMe to accelerate sync writes.\n- ZFS records are never torn (CoW), so some deployments set full_page_writes=off - document the decision; keep pg checksums or rely on ZFS checksums.\n- Cap ARC (zfs_arc_max) so ARC + shared_buffers do not double-cache and starve memory.\nBoth: test with pgbench and fio fdatasync jobs; verify recovery by pulling power in staging.'
        },
        {
          t: 'Debug a CI pipeline that is 10x slower on a shared file system',
          d: 'hard', type: 'debug',
          hint: '<ul><li>Profile the operation mix: metadata (stat/open/create) vs bulk data.</li><li>Use <code>strace -c</code>, <code>nfsiostat</code> or provider metrics to count operations and latency.</li><li>Compute: number of files x per-op latency.</li><li>Fix by moving small-file churn to local disk and keeping only artifacts on shared storage.</li></ul>',
          solution: 'Symptoms: npm install / go build / git checkout on an EFS or Azure Files RWX volume takes minutes instead of seconds.\nDiagnosis:\n- strace -f -c -e trace=file npm ci  -> hundreds of thousands of openat/stat/lstat calls.\n- nfsiostat shows GETATTR/LOOKUP/OPEN dominating with ~1-3 ms each: 300,000 ops x 2 ms = 10 minutes.\n- Throughput metrics are low, so this is latency-bound metadata, not bandwidth.\nFixes:\n- Use node-local storage for workspaces and caches (emptyDir on local NVMe, ephemeral volumes), restore dependency caches from object storage as one tarball.\n- Keep only final artifacts on shared/object storage.\n- If shared POSIX is required: FSx for Lustre / NetApp / Azure NetApp Files for low-latency metadata, increase parallelism, mount options (nconnect, larger actimeo for read-mostly trees).\n- Go modules: GOMODCACHE and GOCACHE on local disk, pre-populated from a cache image or artifact.'
        }
      ],
      interviewFocus: [
        {
          q: 'What exactly must happen for a write to be durable on Linux?',
          a: '<ol><li><code>write()</code> copies into the page cache — not durable.</li>' +
            '<li><code>fsync()</code>/<code>fdatasync()</code> writes dirty pages and required metadata, waits for completion and issues a cache flush (or FUA writes) so the device persists its volatile cache.</li>' +
            '<li>For new or renamed files, <code>fsync()</code> the parent directory too.</li>' +
            '<li>The device must honour flushes (enterprise SSDs with power-loss protection do; some consumer devices and misconfigured RAID caches do not).</li>' +
            '<li>Check the return value. On error, do not retry and continue: crash and recover from a log (fsyncgate).</li></ol>' +
            '<p>Databases build on this: WAL append + fdatasync before acknowledging a commit, with <strong>group commit</strong> to amortise one fsync across many transactions. Durability across machines additionally needs synchronous replication.</p>'
        },
        {
          q: 'Journaling vs copy-on-write: how does each keep a file system consistent after a crash?',
          a: '<ul><li><strong>Journaling</strong> (ext4, XFS, NTFS): log intended metadata (optionally data) changes, write a commit record, then apply in place (checkpoint). Recovery replays committed transactions. In-place updates keep files contiguous; data written twice in full-journal mode.</li>' +
            '<li><strong>Copy-on-write</strong> (ZFS, Btrfs, APFS): never modify live blocks; write new blocks and new parent pointers up to the root, then atomically switch the root. The on-disk state is always a valid tree; snapshots and checksums come almost free. Costs: fragmentation and write amplification for random overwrites, space held by snapshots.</li>' +
            '<li><strong>Log-structured</strong> (F2FS, and the idea behind LSM-trees): the whole disk is a log; cleaning/compaction reclaims space.</li></ul>' +
            '<p>Same pattern as databases: WAL (journaling) vs shadow paging / MVCC CoW (LMDB, ZFS) vs LSM.</p>'
        },
        {
          q: 'How does the Linux page cache affect application and database performance?',
          a: '<ul><li><strong>Reads</strong>: recently used file pages are served from RAM; a database working set that fits in buffer pool + page cache avoids disk entirely. Watch for <strong>double caching</strong> (PostgreSQL shared_buffers + page cache) and size them deliberately; InnoDB avoids it with O_DIRECT.</li>' +
            '<li><strong>Writes</strong>: absorbed as dirty pages and written back asynchronously; bursts are smoothed but, if dirty memory hits <code>vm.dirty_ratio</code>, writers are throttled — causing sudden stalls. Lowering dirty thresholds trades burst throughput for predictable latency.</li>' +
            '<li><strong>Containers</strong>: page cache is charged to the cgroup; a pod reading large files may look like it uses lots of memory (reclaimable). <code>memory.high</code>/limits can trigger reclaim and latency.</li>' +
            '<li><strong>Benchmarks</strong> that do not bypass or exceed the cache measure RAM, not disk.</li></ul>'
        },
        {
          q: 'Snapshots: how do copy-on-write snapshots work, and are they backups?',
          a: '<p>A CoW snapshot freezes a reference to the current block tree. New writes go to new blocks, so the snapshot shares all unchanged blocks and costs space only for blocks overwritten later. Cloud volume snapshots (EBS, Azure Disk) are incremental block copies stored in object storage.</p>' +
            '<p>They are <strong>not backups by themselves</strong> when they live in the same pool, array or account: a pool failure, a compromised admin or ransomware with delete rights removes data and snapshots together. They are also typically <em>crash-consistent</em>, not application-consistent. Turn snapshots into backups by copying them to separate storage, accounts and regions with immutability and retention policies — covered in Module 8.</p>'
        }
      ],
      quiz: [
        { q: 'Does an inode contain the file name?', a: 'No. Names live in directory entries that map names to inode numbers.' },
        { q: 'Two causes of ENOSPC when df shows free space?', a: 'Inode exhaustion (check df -i) and deleted files still held open by a process (check lsof +L1).' },
        { q: 'Default ext4 journaling mode?', a: 'data=ordered: only metadata is journaled, but data blocks are written before the metadata commit.' },
        { q: 'fsync vs fdatasync?', a: 'fdatasync skips metadata not needed to read the data (like mtime) but still persists size changes; fsync flushes all metadata.' },
        { q: 'Why fsync the directory after creating or renaming a file?', a: 'The directory entry is separate metadata; without syncing the directory the new name or rename may be lost after a crash.' },
        { q: 'Why are CoW snapshots cheap?', a: 'They keep a reference to the existing block tree; blocks are shared until modified, so creation is O(1) and space grows only with changes.' },
        { q: 'Is O_DIRECT durable?', a: 'No. It bypasses the page cache, but metadata and the device write cache still require fsync/fdatasync (or O_DSYNC).' }
      ],
      resources: [
        { title: 'OSTEP — File System Implementation', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf', type: 'book' },
        { title: 'OSTEP — Crash Consistency: FSCK and Journaling', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/file-journaling.pdf', type: 'book' },
        { title: 'Linux kernel docs — ext4 data structures and algorithms', url: 'https://www.kernel.org/doc/html/latest/filesystems/ext4/index.html', type: 'docs' },
        { title: 'OpenZFS documentation', url: 'https://openzfs.github.io/openzfs-docs/', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 5 ─────────────────────────────
    {
      n: 5,
      title: 'Database Storage Engines',
      summary: 'What sits under SQL and NoSQL databases: pages and buffer pools, B+trees vs LSM-trees and their read/write/space amplification, write-ahead logging and crash recovery, MVCC, clustered vs secondary indexes, and columnar formats — with PostgreSQL, InnoDB, RocksDB and Cassandra as running examples.',
      topics: [
        {
          title: 'Pages, Heap Files and the Buffer Pool',
          def: '<p>Disk-oriented databases store data in fixed-size <strong>pages</strong> (PostgreSQL 8 KiB, InnoDB 16 KiB, SQL Server 8 KiB) — the unit of I/O and caching.</p>' +
            '<ul><li><strong>Slotted page layout</strong>: a header (LSN of last change, checksum, free-space pointers), an array of <em>line pointers</em> growing forward, and tuples growing backward from the end. Rows are addressed by (page, slot) — PostgreSQL\'s <code>ctid</code> — so tuples can move within a page without changing their address.</li>' +
            '<li><strong>Buffer pool</strong>: an in-memory cache of pages (<code>shared_buffers</code> in PostgreSQL, typically ~25% of RAM; <code>innodb_buffer_pool_size</code>, typically 50–75% of RAM). Every read and write goes through it; pages are pinned while in use.</li>' +
            '<li><strong>Eviction</strong>: PostgreSQL uses clock-sweep; InnoDB uses LRU with a midpoint insertion (young/old sublists) so one big table scan does not flush the hot working set.</li>' +
            '<li><strong>Dirty pages</strong> are modified in memory and written back later by background writers and <strong>checkpoints</strong>; the WAL makes this safe (see the WAL topic).</li>' +
            '<li><strong>Double caching</strong>: PostgreSQL also relies on the OS page cache, whereas InnoDB usually uses <code>O_DIRECT</code> to cache only once.</li></ul>' +
            '<p>Performance intuition: the <strong>buffer pool hit ratio</strong> and whether the working set fits in RAM matter more than the disk for most OLTP systems. A miss on network block storage costs ~0.5–1 ms; a hit costs ~100 ns.</p>',
          interview: 'Explain the slotted page, the buffer pool and why databases manage their own cache instead of trusting the OS (control over eviction, write ordering with the WAL, prefetching). Mention EXPLAIN (ANALYZE, BUFFERS) or InnoDB buffer pool metrics as how you would verify cache behaviour.',
          examples: [
            { label: 'Look inside PostgreSQL pages and buffers', lang: 'sql', code: 'CREATE EXTENSION IF NOT EXISTS pageinspect;\nCREATE EXTENSION IF NOT EXISTS pg_buffercache;\n\n-- Header of page 0 (LSN, checksum, free space boundaries)\nSELECT * FROM page_header(get_raw_page(\'orders\', 0));\n-- Tuples in page 0 with visibility info (xmin/xmax)\nSELECT lp, t_xmin, t_xmax, t_ctid FROM heap_page_items(get_raw_page(\'orders\', 0));\n\n-- Which relations occupy shared_buffers right now?\nSELECT c.relname, count(*) AS buffers\nFROM pg_buffercache b JOIN pg_class c ON b.relfilenode = pg_relation_filenode(c.oid)\nGROUP BY c.relname ORDER BY buffers DESC LIMIT 10;\n\n-- Hits vs reads for one query\nEXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 42;' }
          ]
        },
        {
          title: 'B-Tree and B+Tree Internals',
          def: '<p>The <strong>B+tree</strong> is the default index (and, in InnoDB, the table itself). Internal nodes hold separator keys and child pointers; <strong>leaves</strong> hold keys plus values or row pointers and are linked left-to-right for range scans.</p>' +
            '<ul><li><strong>High fan-out</strong>: a 16 KiB page holds ~1,000 (key, pointer) pairs, so height grows as log<sub>1000</sub>(N): 3–4 levels index a billion rows. Upper levels stay cached, so a point lookup costs ~1 disk read.</li>' +
            '<li><strong>Inserts</strong> go to the correct leaf; a full leaf <strong>splits</strong> in two and pushes a separator up (splits can cascade to the root, which is how the tree grows). Deletes may merge/redistribute.</li>' +
            '<li><strong>Updates in place</strong>: changing one 100-byte row rewrites a whole 8–16 KiB page (plus WAL) → write amplification of ~100x at the page level, and random I/O spread over the index.</li>' +
            '<li><strong>Sequential vs random keys</strong>: monotonically increasing keys (BIGSERIAL, UUIDv7, ULID) append to the rightmost leaf — compact, cache-friendly. Random keys (UUIDv4) hit random leaves, causing splits, ~50–70% full pages and a working set equal to the whole index.</li>' +
            '<li><strong>Fill factor</strong> leaves free space for future updates (PostgreSQL <code>fillfactor</code>, used by HOT updates).</li>' +
            '<li><strong>Concurrency</strong>: latch crabbing / B-link trees (PostgreSQL\'s nbtree is a Lehman–Yao B-link tree) allow concurrent readers and writers.</li></ul>' +
            '<p>B+trees give <strong>predictable reads</strong> (one path, one place per key), efficient range scans and natural support for transactions with in-place locking — at the cost of random writes.</p>',
          interview: 'Be able to compute the height of a B+tree for a given row count and page size, explain page splits, and connect key choice to performance: random UUIDv4 primary keys cause page splits and cache misses; UUIDv7 or sequential IDs fix it. This is a very common senior backend question.',
          examples: [
            { label: 'B+tree height calculation', lang: 'text', code: 'Rows: 1,000,000,000     Page: 16 KiB\nInternal entry: 8-byte key + 6-byte pointer + overhead ~ 16 B  -> fan-out ~ 1,000\nLeaf: ~200-byte rows, ~15/16 full                             -> ~70 rows per leaf\n\nLeaves          = 1e9 / 70        ~ 14.3 million pages (~218 GiB)\nLevel above     = 14.3M / 1000    ~ 14,300 pages (~224 MiB, easily cached)\nLevel above     = 14,300 / 1000   ~ 15 pages\nRoot            = 1 page\nHeight = 4  -> with the top 3 levels in RAM, a point lookup = 1 random leaf read' }
          ]
        },
        {
          title: 'LSM-Trees: Memtables, SSTables, Compaction and Bloom Filters',
          def: '<p>A <strong>log-structured merge-tree</strong> turns random writes into sequential ones:</p>' +
            '<ol><li><strong>Write</strong>: append to the WAL (commit log), insert into an in-memory sorted <strong>memtable</strong> (skiplist). Acknowledge.</li>' +
            '<li><strong>Flush</strong>: a full memtable becomes immutable and is written sequentially as an <strong>SSTable</strong> — a sorted, immutable file with data blocks, a block index and a <strong>Bloom filter</strong>.</li>' +
            '<li><strong>Compaction</strong>: background merges of SSTables drop overwritten values and expired <strong>tombstones</strong> and keep the number of files bounded.</li>' +
            '<li><strong>Read</strong>: memtable → immutable memtables → L0 files → one file per level; Bloom filters (~10 bits/key ≈ 1% false positives) skip files that cannot contain the key.</li></ol>' +
            '<table><thead><tr><th>Compaction strategy</th><th>How</th><th>Write amp</th><th>Space amp</th><th>Read amp</th><th>Good for</th></tr></thead><tbody>' +
            '<tr><td>Leveled (RocksDB default, Cassandra LCS)</td><td>each level 10x the previous, non-overlapping files per level</td><td>high (10–30x)</td><td>low (~1.1x)</td><td>low</td><td>read-heavy, updates</td></tr>' +
            '<tr><td>Size-tiered / Universal (Cassandra STCS)</td><td>merge similar-sized files</td><td>low</td><td>high (up to 2x during compaction)</td><td>higher</td><td>write-heavy, inserts</td></tr>' +
            '<tr><td>Time-window (Cassandra TWCS) / FIFO</td><td>one bucket per time window, drop whole files on TTL</td><td>lowest</td><td>low with TTL</td><td>depends</td><td>time series with TTL</td></tr>' +
            '</tbody></table>' +
            '<p>Cassandra 5.0 adds the Unified Compaction Strategy (UCS) that can behave like tiered or leveled. <strong>Deletes</strong> are tombstones that must outlive replicas\' repair windows (<code>gc_grace_seconds</code>), so delete-heavy queue-like patterns cause tombstone-scan problems. RocksDB powers MyRocks, TiKV, CockroachDB (Pebble, a Go RocksDB-alike), Kafka Streams state stores and many more.</p>',
          interview: 'Draw the write path (WAL, memtable, flush, SSTable, compaction) and the read path with Bloom filters. Then discuss compaction strategy trade-offs in terms of read, write and space amplification, and name the operational pitfalls: write stalls when compaction falls behind, tombstones, and space headroom for size-tiered compaction.',
          examples: [
            { label: 'LSM write and read paths', lang: 'text', code: 'WRITE: client -> WAL append (sequential, fsync/group commit) -> memtable (skiplist) -> ack\n                                   memtable full -> immutable -> flush -> L0 SSTable\n\nL0:  [sst][sst][sst]          (overlapping key ranges)\nL1:  [a-f][g-m][n-z]          (non-overlapping, ~10x L0 target)\nL2:  [a-b][c-d] ... [y-z]     (~10x L1)\n          ^ compaction merges overlapping files downward, drops old versions/tombstones\n\nREAD(k): memtable -> immutable memtables -> each L0 file -> one file per level\n         bloom filter says "definitely not here" -> skip file (no disk I/O)' },
            { label: 'Choose compaction per table in Cassandra (CQL)', lang: 'sql', code: '-- Time series with TTL: whole SSTables expire together\nCREATE TABLE metrics.cpu (\n  host text, bucket date, ts timestamp, value double,\n  PRIMARY KEY ((host, bucket), ts)\n) WITH CLUSTERING ORDER BY (ts DESC)\n  AND default_time_to_live = 2592000\n  AND compaction = {\'class\': \'TimeWindowCompactionStrategy\',\n                    \'compaction_window_unit\': \'DAYS\', \'compaction_window_size\': 1};\n\n-- Read-heavy table with frequent updates\nALTER TABLE shop.carts WITH compaction = {\'class\': \'LeveledCompactionStrategy\'};' }
          ]
        },
        {
          title: 'Write-Ahead Logging and Crash Recovery',
          def: '<p>The <strong>WAL rule</strong>: a change must be recorded in a sequential, durable log <em>before</em> the modified data page may be written to disk, and a transaction is committed only when its commit record is durable. Data pages can then be flushed lazily and in any order.</p>' +
            '<ul><li>Each log record has a monotonically increasing <strong>LSN</strong>; every page stores the LSN of its latest change, so recovery knows which changes a page already contains.</li>' +
            '<li><strong>Commit</strong> = append commit record + <code>fdatasync</code> the WAL (or O_DSYNC writes). <strong>Group commit</strong> batches many transactions into one flush.</li>' +
            '<li><strong>Checkpoint</strong>: flush dirty pages and record a redo starting point, bounding recovery time and allowing old WAL to be recycled or archived.</li>' +
            '<li><strong>Recovery</strong> (ARIES-style): <em>analysis</em> (what was in flight), <em>redo</em> from the checkpoint (repeat history), <em>undo</em> uncommitted changes. InnoDB uses redo logs + undo logs; PostgreSQL only redoes — uncommitted tuple versions simply stay invisible thanks to MVCC and the commit-status log.</li>' +
            '<li><strong>Torn pages</strong>: PostgreSQL writes a full-page image to WAL on the first change after each checkpoint (<code>full_page_writes</code>); InnoDB uses the doublewrite buffer.</li></ul>' +
            '<p>The same log powers <strong>replication</strong> (PostgreSQL streaming replication ships WAL; MySQL ships the binlog), <strong>point-in-time recovery</strong> (archive WAL + base backup, Module 8) and <strong>change data capture</strong> (logical decoding, Debezium). Kafka and Raft logs are the same idea at system level: the log is the source of truth.</p>',
          interview: 'Narrate a COMMIT end to end: WAL record, fsync (group commit), acknowledgement, dirty page in the buffer pool flushed later by a checkpoint, and what recovery does if the machine crashes in between. Mention full-page writes or doublewrite for torn pages and that the WAL also drives replication and PITR.',
          examples: [
            { label: 'Observe WAL in PostgreSQL', lang: 'sql', code: 'SELECT pg_current_wal_lsn();                       -- current write position\nSELECT pg_walfile_name(pg_current_wal_lsn());      -- segment file name\nSHOW wal_level; SHOW synchronous_commit; SHOW full_page_writes;\n\n-- WAL generated by a statement\nEXPLAIN (ANALYZE, WAL) UPDATE orders SET status = \'shipped\' WHERE id < 10000;\n\n-- Cumulative WAL statistics (records, full-page images, bytes)\nSELECT wal_records, wal_fpi, wal_bytes FROM pg_stat_wal;' }
          ]
        },
        {
          title: 'MVCC, Clustered vs Secondary Indexes',
          def: '<p><strong>MVCC</strong> lets readers see a consistent snapshot without blocking writers by keeping multiple row versions:</p>' +
            '<table><thead><tr><th></th><th>PostgreSQL</th><th>InnoDB (MySQL)</th></tr></thead><tbody>' +
            '<tr><td>Where old versions live</td><td>in the table heap: UPDATE writes a new tuple; old one marked with <code>xmax</code></td><td>row updated in place; old versions reconstructed from <strong>undo logs</strong></td></tr>' +
            '<tr><td>Cleanup</td><td><strong>VACUUM</strong>/autovacuum removes dead tuples, freezes XIDs</td><td><strong>purge</strong> threads trim undo (history list length)</td></tr>' +
            '<tr><td>Failure mode</td><td>bloat, index bloat, transaction-ID wraparound if vacuum cannot keep up</td><td>undo growth and slow reads under long-running transactions</td></tr>' +
            '<tr><td>Update cost</td><td>new tuple + index entries in every index (unless a <strong>HOT</strong> update: no indexed column changed and room on the same page)</td><td>in-place + undo; secondary indexes updated only if their columns change</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Clustered vs secondary indexes</strong>:</p>' +
            '<ul><li><strong>InnoDB</strong>: the table <em>is</em> a B+tree clustered by primary key (rows in PK order in the leaves). Secondary index leaves store the <strong>PK value</strong>, so a secondary lookup is two B+tree traversals. Wide PKs bloat every secondary index; random PKs fragment the table.</li>' +
            '<li><strong>PostgreSQL</strong>: tables are unordered heaps; <em>every</em> index is secondary and points to a <code>ctid</code>. <code>CLUSTER</code> reorders once but is not maintained. <strong>Index-only scans</strong> avoid the heap when the visibility map says the page is all-visible; <code>INCLUDE</code> columns build covering indexes.</li>' +
            '<li><strong>Covering indexes</strong> in both engines avoid the extra lookup; composite index column order follows the leftmost-prefix rule.</li></ul>',
          interview: 'Contrast PostgreSQL (append new versions + VACUUM) with InnoDB (in-place + undo + purge), and connect each to an operational incident: autovacuum lag and bloat, XID wraparound, or long transactions blocking purge. Then explain why InnoDB secondary lookups cost two traversals and why PK choice matters.',
          examples: [
            { label: 'Spot bloat and long transactions (PostgreSQL)', lang: 'sql', code: '-- Dead tuples and last autovacuum per table\nSELECT relname, n_live_tup, n_dead_tup, last_autovacuum\nFROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;\n\n-- Oldest transactions holding back cleanup\nSELECT pid, now() - xact_start AS age, state, left(query, 60)\nFROM pg_stat_activity WHERE xact_start IS NOT NULL ORDER BY age DESC LIMIT 5;\n\n-- Distance to transaction-ID wraparound\nSELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC;\n\n-- Covering index enabling index-only scans\nCREATE INDEX CONCURRENTLY idx_orders_cust ON orders (customer_id) INCLUDE (status, total);' }
          ]
        },
        {
          title: 'Column Stores and Columnar Formats (Parquet)',
          def: '<p>Row stores keep each row together — ideal for OLTP (fetch/update one order). <strong>Column stores</strong> keep each column together — ideal for analytics that scan billions of rows but only a few columns.</p>' +
            '<p><strong>Parquet layout</strong>: file → <strong>row groups</strong> (typically 128 MiB–1 GiB) → <strong>column chunks</strong> → <strong>pages</strong> (~1 MiB), with a <strong>footer</strong> holding the schema and per-chunk statistics (min, max, null count; optional Bloom filters and page indexes).</p>' +
            '<ul><li><strong>Projection pushdown</strong>: read only the needed columns (5 of 100 columns ≈ 5% of the I/O).</li>' +
            '<li><strong>Predicate pushdown</strong>: skip row groups/pages whose min/max cannot match (<code>WHERE ts &gt;= \'2025-10-01\'</code>) — very effective when data is sorted or clustered by the filter column.</li>' +
            '<li><strong>Encodings</strong>: dictionary (low-cardinality strings), run-length + bit-packing, delta (timestamps, sorted IDs) — then general compression (Snappy, zstd). 5–10x smaller than CSV is common.</li>' +
            '<li><strong>Vectorised execution</strong>: engines process column batches with SIMD.</li></ul>' +
            '<table><thead><tr><th></th><th>Row store</th><th>Column store</th></tr></thead><tbody>' +
            '<tr><td>Examples</td><td>PostgreSQL, MySQL, Oracle</td><td>Parquet/ORC files, ClickHouse, Redshift, BigQuery, Snowflake, DuckDB</td></tr>' +
            '<tr><td>Point lookup / single-row update</td><td>fast</td><td>slow (touch every column file)</td></tr>' +
            '<tr><td>Scan + aggregate few columns</td><td>reads whole rows</td><td>reads only needed columns, compressed</td></tr>' +
            '<tr><td>Writes</td><td>row at a time</td><td>batched / immutable files, merges (ClickHouse MergeTree is LSM-like)</td></tr>' +
            '</tbody></table>' +
            '<p>Table formats (<strong>Apache Iceberg</strong>, Delta Lake, Hudi) add ACID commits, schema evolution and time travel on top of Parquet files in object storage — the modern "lakehouse".</p>',
          interview: 'Explain why columnar is faster for analytics (projection, predicate pushdown, compression, vectorisation) and why it is bad for OLTP. A strong answer mentions sorting or clustering data by common filters so min/max statistics prune effectively, and right-sizing files (avoid many tiny Parquet files on object storage).',
          examples: [
            { label: 'Write and inspect Parquet with DuckDB', lang: 'sql', code: '-- Write a sorted, zstd-compressed Parquet file with ~1M-row row groups\nCOPY (SELECT * FROM read_csv_auto(\'events.csv\') ORDER BY event_date, user_id)\n  TO \'events.parquet\' (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 1000000);\n\n-- Row groups, column chunks, encodings and min/max statistics\nSELECT row_group_id, path_in_schema, encodings, stats_min, stats_max, total_compressed_size\nFROM parquet_metadata(\'events.parquet\');\n\n-- Only two columns are read; row groups outside the date range are skipped\nSELECT user_id, count(*) FROM \'events.parquet\'\nWHERE event_date >= DATE \'2025-10-01\' GROUP BY user_id;' }
          ]
        },
        {
          title: 'Isolation Levels, Snapshot Isolation and MVCC Anomalies',
          def: '<p>MVCC decides <em>which version</em> of a row a transaction sees; the <strong>isolation level</strong> decides which anomalies remain possible. The SQL standard defines levels by forbidden phenomena, but engines implement them differently — always name the engine.</p><table><thead><tr><th>Anomaly</th><th>What happens</th><th>Prevented by</th></tr></thead><tbody><tr><td>Dirty read</td><td>reading another transaction\'s uncommitted write</td><td>Read Committed and above (PostgreSQL never allows it)</td></tr><tr><td>Non-repeatable read / read skew</td><td>the same row read twice gives different values, or two related rows are read at different moments (account A before a transfer, account B after)</td><td>one snapshot per transaction (Repeatable Read / Snapshot Isolation)</td></tr><tr><td>Phantom</td><td>re-running a range query returns new rows</td><td>snapshot reads (PostgreSQL RR) or gap / next-key locks (InnoDB locking reads)</td></tr><tr><td>Lost update</td><td>two read-modify-write cycles; the second overwrites the first</td><td>atomic <code>UPDATE … SET n = n - 1</code>, <code>SELECT … FOR UPDATE</code>, a version column (optimistic locking); PostgreSQL RR aborts the second writer</td></tr><tr><td>Write skew</td><td>two transactions read an overlapping set, each writes a <em>different</em> row, and together they break an invariant ("at least one doctor on call", double-booked room)</td><td>Serializable only — or explicit locks / a materialised conflict row</td></tr></tbody></table><p><strong>How a snapshot decides visibility</strong> (PostgreSQL): every tuple carries <code>xmin</code> (creating transaction) and <code>xmax</code> (deleting or updating transaction). A snapshot records the oldest still-running XID, the next XID to be assigned and the list of in-progress XIDs. A tuple is visible if its creator committed before the snapshot and its deleter had not; commit status comes from <code>pg_xact</code> (the commit log). Read Committed takes a fresh snapshot per <em>statement</em>; Repeatable Read keeps one per <em>transaction</em>. InnoDB builds the equivalent <strong>read view</strong> and walks the row\'s <strong>undo chain</strong> back to the version that view may see.</p><table><thead><tr><th></th><th>PostgreSQL</th><th>MySQL InnoDB</th></tr></thead><tbody><tr><td>Default level</td><td>Read Committed</td><td>Repeatable Read</td></tr><tr><td>Repeatable Read is…</td><td>true snapshot isolation; updating a row that changed since the snapshot fails with <code>could not serialize access</code> (retry)</td><td>a consistent snapshot for plain SELECTs, but <code>UPDATE</code> and locking reads act on the <em>latest committed</em> row with next-key locks — lost updates and write skew remain possible for read-then-write logic built on plain SELECTs</td></tr><tr><td>Serializable</td><td><strong>SSI</strong> (Serializable Snapshot Isolation): no extra blocking; tracks read/write dependencies with SIREAD locks and aborts one transaction of a dangerous cycle with SQLSTATE 40001</td><td>Repeatable Read where plain SELECTs become shared locking reads (with autocommit off) → more blocking and deadlocks</td></tr></tbody></table><p>Distributed SQL follows the same split: CockroachDB defaults to Serializable (Read Committed was added later), Spanner provides external consistency, YugabyteDB offers all three levels. Whatever the engine, <strong>Serializable means "be ready to retry"</strong>: wrap transactions in a retry loop with backoff, keep them short, and make them idempotent.</p>',
          interview: 'Interviewers usually ask which isolation level your database runs at and then give a scenario. Name the engine defaults (PostgreSQL Read Committed, InnoDB Repeatable Read), explain snapshots via xmin/xmax or InnoDB read views, and use write skew (on-call doctors, double-booked meeting room) to show why snapshot isolation is not serializable. Finish with fixes: SERIALIZABLE plus a retry loop, SELECT ... FOR UPDATE on the rows guarding the invariant, or a unique/exclusion constraint so the database enforces it.',
          examples: [
            {
              label: 'Write skew under REPEATABLE READ (two psql sessions)',
              lang: 'sql',
              code: 'CREATE TABLE doctors (name text PRIMARY KEY, on_call boolean NOT NULL);\nINSERT INTO doctors VALUES (\'alice\', true), (\'bob\', true);\n\n-- Session A                                   -- Session B\nBEGIN ISOLATION LEVEL REPEATABLE READ;         BEGIN ISOLATION LEVEL REPEATABLE READ;\nSELECT count(*) FROM doctors WHERE on_call;    SELECT count(*) FROM doctors WHERE on_call;\n-- 2: alice may leave                          -- 2: bob may leave\nUPDATE doctors SET on_call = false             UPDATE doctors SET on_call = false\n  WHERE name = \'alice\';                          WHERE name = \'bob\';\nCOMMIT;                                        COMMIT;\n-- Both commit and nobody is on call. They updated different rows,\n-- so snapshot isolation saw no write-write conflict.\n\n-- Same script with ISOLATION LEVEL SERIALIZABLE: one transaction fails with\n-- ERROR: could not serialize access due to read/write dependencies among transactions\n-- (SQLSTATE 40001) and must be retried; on retry it sees count = 1.'
            },
            {
              label: 'Generic serializable retry loop in Go (pgx v5)',
              lang: 'go',
              code: 'func withSerializableRetry(ctx context.Context, pool *pgxpool.Pool, fn func(pgx.Tx) error) error {\n    for attempt := 0; ; attempt++ {\n        err := pgx.BeginTxFunc(ctx, pool, pgx.TxOptions{IsoLevel: pgx.Serializable}, fn)\n        var pgErr *pgconn.PgError\n        retryable := errors.As(err, &pgErr) &&\n            (pgErr.Code == "40001" || pgErr.Code == "40P01") // serialization failure, deadlock\n        if !retryable || attempt == 5 {\n            return err\n        }\n        backoff := time.Duration(10<<attempt)*time.Millisecond + time.Duration(rand.IntN(10))*time.Millisecond\n        select {\n        case <-time.After(backoff):\n        case <-ctx.Done():\n            return ctx.Err()\n        }\n    }\n}\n// fn must be safe to run more than once: no external side effects inside the transaction.'
            }
          ]
        },
        {
          title: 'VACUUM, Freezing and Transaction-ID Wraparound',
          def: '<p>PostgreSQL\'s MVCC leaves the old version of every updated or deleted row in the heap. <strong>VACUUM</strong> is the garbage collector that makes this sustainable — the B-tree world\'s counterpart of LSM compaction — and it has three separate jobs:</p><ol><li><strong>Reclaim dead tuples</strong>: a tuple is dead once its deleter committed before the oldest snapshot still in use (the <strong>xmin horizon</strong>). VACUUM removes index entries pointing at dead tuples, then records the free heap space in the <strong>free space map</strong>. Later inserts reuse it, but the file normally does <em>not</em> shrink (only empty pages at the end are truncated).</li><li><strong>Maintain the visibility map</strong>: pages whose tuples are visible to everyone become <em>all-visible</em> (index-only scans skip the heap, later vacuums skip the page) and <em>all-frozen</em>.</li><li><strong>Freeze</strong>: XIDs are 32-bit and compared modulo 2<sup>32</sup>, so only ~2 billion transactions can be "in the past" at once. Tuples must be frozen (marked visible to everyone, independent of XID) before they are 2<sup>31</sup> transactions old, otherwise they would suddenly appear to be in the future — <strong>transaction-ID wraparound</strong>. As <code>age(datfrozenxid)</code> grows, PostgreSQL forces anti-wraparound autovacuums, then warns, and about 3 million XIDs before the limit refuses to assign new XIDs: the database is effectively read-only until a vacuum completes.</li></ol><p><strong>Autovacuum</strong> vacuums a table when dead tuples exceed <code>autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor x reltuples</code> — 50 + 20% by default, far too lazy for a billion-row table — and also after many inserts (visibility map and freezing for append-only tables). It is throttled by cost-based delay (<code>autovacuum_vacuum_cost_limit</code> / <code>_cost_delay</code>).</p><ul><li><strong>What blocks cleanup</strong>: anything holding the xmin horizon back — long-running or <em>idle in transaction</em> sessions, abandoned replication slots, standbys with <code>hot_standby_feedback = on</code> running long queries, forgotten prepared transactions. VACUUM then runs but removes nothing.</li><li><strong>VACUUM vs VACUUM FULL</strong>: plain VACUUM is online and does not shrink files; <code>VACUUM FULL</code> rewrites the table under an ACCESS EXCLUSIVE lock. Compact online with <strong>pg_repack</strong> (or pg_squeeze); rebuild bloated indexes with <code>REINDEX CONCURRENTLY</code>.</li><li><strong>Recent versions</strong>: PostgreSQL 14 added the vacuum <em>failsafe</em> (near wraparound it drops cost delays and index cleanup). PostgreSQL 17 replaced the dead-tuple array (capped at 1 GB) with a compact radix-tree store — much less memory and fewer index passes. PostgreSQL 18 added <em>eager freezing</em> of all-visible pages during normal vacuums (smoothing out the dreaded anti-wraparound full-table scan), <code>autovacuum_vacuum_max_threshold</code> to cap the scale-factor trigger on huge tables, and changing <code>autovacuum_max_workers</code> without a restart (up to <code>autovacuum_worker_slots</code>).</li><li><strong>Other engines</strong>: InnoDB <em>purge</em> threads trim undo logs (watch the history list length — long transactions grow it); LSM engines reclaim space by compaction and tombstone expiry; table formats on object storage need snapshot expiry and compaction. Every MVCC or append-only design has a garbage collector that someone must monitor.</li></ul>',
          interview: 'Explain the three jobs (reclaim dead tuples, visibility map, freezing) and why VACUUM rarely shrinks files. The classic incident question is "the table keeps growing although autovacuum is running": answer with the xmin horizon (long or idle-in-transaction sessions, stale replication slots, hot_standby_feedback, prepared transactions) and per-table autovacuum tuning. Know wraparound: 32-bit XIDs, freezing, age(datfrozenxid), and that PostgreSQL stops assigning XIDs near the limit.',
          examples: [
            {
              label: 'Find what blocks vacuum and how close wraparound is',
              lang: 'sql',
              code: '-- Sessions holding back the xmin horizon\nSELECT pid, state, backend_xmin, now() - xact_start AS xact_age, left(query, 50)\nFROM pg_stat_activity WHERE backend_xmin IS NOT NULL\nORDER BY age(backend_xmin) DESC LIMIT 5;\n\n-- Replication slots and prepared transactions can hold it back too\nSELECT slot_name, active, xmin, catalog_xmin,\n       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal\nFROM pg_replication_slots;\nSELECT gid, prepared, owner FROM pg_prepared_xacts;\n\n-- Oldest unfrozen tables (anti-wraparound vacuum starts at autovacuum_freeze_max_age = 200M)\nSELECT c.oid::regclass AS table, age(c.relfrozenxid) AS xid_age,\n       pg_size_pretty(pg_total_relation_size(c.oid)) AS size\nFROM pg_class c WHERE c.relkind IN (\'r\', \'m\', \'t\')\nORDER BY 2 DESC LIMIT 10;\n\n-- Running vacuums\nSELECT pid, relid::regclass, phase, heap_blks_scanned, heap_blks_total, index_vacuum_count\nFROM pg_stat_progress_vacuum;\n\n-- Make autovacuum keep up on one large, hot table\nALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.01,\n                        autovacuum_vacuum_insert_scale_factor = 0.02,\n                        autovacuum_vacuum_cost_limit = 2000);'
            }
          ]
        },
        {
          title: 'Lakehouse Table Formats and Object-Storage-Native Databases',
          def: '<p>Object storage is cheap, durable and elastic but offers no rename, no append (outside S3 Express One Zone) and no multi-object transactions. Two families of systems turn it into a database substrate anyway.</p><p><strong>1. Open table formats</strong> — <strong>Apache Iceberg</strong>, <strong>Delta Lake</strong>, Apache Hudi — make a prefix full of immutable Parquet files behave like an ACID table:</p><ul><li><strong>Iceberg metadata tree</strong>: <em>catalog</em> → current <code>metadata.json</code> (schema, partition spec, snapshot list) → <em>manifest list</em> (one per snapshot) → <em>manifests</em> (data files with partition values and per-column min/max/null counts) → Parquet <em>data files</em> and <em>delete files</em>. Query planning prunes partitions and files from metadata alone — no LIST over millions of objects.</li><li><strong>A commit is one atomic pointer swap</strong>: the writer writes new data and metadata files under unique names, then asks the catalog to move the table pointer from <code>v41.metadata.json</code> to <code>v42.metadata.json</code> <em>only if</em> it still points at v41 (compare-and-swap). The loser of a race re-reads, checks for logical conflicts and retries. Catalogs: Hive Metastore, AWS Glue, the Iceberg REST catalog (Apache Polaris, Unity Catalog, Amazon S3 Tables). Delta Lake writes numbered JSON commits to <code>_delta_log/</code> and needs put-if-absent, which S3 conditional writes (<code>If-None-Match: *</code>) now provide natively.</li><li><strong>Snapshot isolation and time travel</strong>: readers pin a snapshot; older snapshots stay queryable until expired (<code>VERSION AS OF</code> / <code>TIMESTAMP AS OF</code>).</li><li><strong>Row-level changes</strong>: <em>copy-on-write</em> rewrites affected files (slow writes, fast reads); <em>merge-on-read</em> writes delete files or deletion vectors (fast writes, readers merge until compaction).</li><li><strong>Maintenance is mandatory</strong> — the lakehouse\'s VACUUM: compact small files (<code>rewrite_data_files</code>), expire snapshots, remove orphan files from failed commits, rewrite manifests. Managed offerings (S3 Tables, Databricks, Snowflake-managed Iceberg) automate it.</li></ul><p><strong>2. Object-storage-native engines</strong> keep a small hot tier (memory, local NVMe, a replicated log) and put everything else in object storage, separating compute from storage:</p><table><thead><tr><th>System</th><th>Design</th></tr></thead><tbody><tr><td>Snowflake, BigQuery, Databricks, ClickHouse Cloud</td><td>columnar files in object storage; stateless compute clusters with local SSD caches scale independently of data</td></tr><tr><td>Aurora, Neon (PostgreSQL)</td><td>"the log is the database": compute ships WAL to a replicated log/page service that materialises pages; Neon tiers page layers to S3, enabling instant branching and scale-to-zero</td></tr><tr><td>WarpStream, Turbopuffer, SlateDB</td><td>brokers or LSM engines that write batches straight to object storage: no inter-AZ replication traffic, at the cost of write latency in the hundreds of ms</td></tr></tbody></table><p>Trade-offs to state in interviews: 10–100 ms per request forces batching and caching; per-request pricing punishes small objects; correctness hinges on one atomic primitive (a conditional PUT or a catalog CAS); and every write-optimised layout needs background compaction.</p>',
          interview: 'Describe the Iceberg metadata tree and the commit protocol: write immutable files, then compare-and-swap the table pointer in the catalog; losers re-check conflicts and retry. Then cover operations: small-file compaction, snapshot expiry, orphan cleanup, copy-on-write vs merge-on-read. For object-storage-native engines, weigh request latency and cost against durability, elasticity and the absence of a cross-AZ replication bill.',
          examples: [
            {
              label: 'Iceberg table, time travel and maintenance (Spark SQL)',
              lang: 'sql',
              code: '-- Hidden partitioning: queries filter on event_ts, Iceberg prunes days\nCREATE TABLE lake.sales.events (\n  event_id bigint, customer_id bigint, event_ts timestamp, amount decimal(12,2))\nUSING iceberg\nPARTITIONED BY (days(event_ts))\nTBLPROPERTIES (\'write.delete.mode\' = \'merge-on-read\',\n               \'write.target-file-size-bytes\' = \'536870912\');\n\n-- Snapshot history and time travel\nSELECT snapshot_id, committed_at, operation FROM lake.sales.events.snapshots\nORDER BY committed_at DESC LIMIT 5;\nSELECT count(*) FROM lake.sales.events TIMESTAMP AS OF \'2026-10-28 00:00:00\';\n\n-- Maintenance procedures (schedule them)\nCALL lake.system.rewrite_data_files(table => \'sales.events\', options => map(\'min-input-files\', \'5\'));\nCALL lake.system.expire_snapshots(table => \'sales.events\',\n     older_than => TIMESTAMP \'2026-10-01 00:00:00\', retain_last => 20);\nCALL lake.system.remove_orphan_files(table => \'sales.events\');'
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Compute the height of a B+tree for 1 billion rows',
          d: 'easy', type: 'concept',
          hint: '<ul><li>Estimate fan-out from page size and entry size (key + child pointer).</li><li>Estimate rows per leaf from row size and fill factor.</li><li>Divide repeatedly until one page remains.</li><li>How many disk reads per lookup if the upper levels are cached?</li></ul>',
          solution: '16 KiB pages, ~16-byte internal entries -> fan-out ~1,000; ~70 rows of 200 bytes per leaf.\n1e9 / 70 = 14.3M leaves -> 14.3K internal pages -> 15 pages -> root = 4 levels.\nTop three levels (~225 MiB) fit in the buffer pool, so a point lookup costs about 1 random read (~0.1 ms local NVMe, ~0.5-1 ms network disk).\nFor a secondary index with 8-byte keys and 6-byte TIDs, leaves hold ~500 entries, so even fewer levels.\nPage size matters: 8 KiB pages roughly halve fan-out but rarely add more than one level.'
        },
        {
          t: 'Explain why random UUID primary keys slow down InnoDB',
          d: 'easy', type: 'concept',
          hint: '<ul><li>InnoDB clusters rows by primary key.</li><li>Where does each new insert land with UUIDv4 vs an auto-increment or UUIDv7?</li><li>Think about page splits, fill factor and buffer pool working set.</li><li>Secondary indexes store the PK.</li></ul>',
          solution: 'With UUIDv4 every insert targets a random leaf of the clustered index: the whole table is the write working set, pages are read from disk just to insert, leaves split when full and end up ~50-70% full (more pages, more I/O, bigger backups), and redo/doublewrite volume rises.\nEach secondary index entry also stores the 16-byte (or 36-char string!) PK, inflating every index.\nFixes: BIGINT auto-increment or time-ordered IDs (UUIDv7, ULID, Snowflake IDs) stored as BINARY(16); inserts then append to the right edge, pages fill to ~94%, and the hot set is the last few pages. PostgreSQL suffers less (heap is unordered) but its PK B-tree index shows the same split/cache behaviour, so UUIDv7 helps there too (native uuidv7() since PostgreSQL 18).'
        },
        {
          t: 'Inspect pages, buffers and WAL in PostgreSQL',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>Create a table, insert 1M rows, then check <code>pg_relation_size</code> and number of pages.</li><li>Use <code>pageinspect</code> to see tuples and their xmin/xmax before and after an UPDATE.</li><li>Use <code>EXPLAIN (ANALYZE, BUFFERS, WAL)</code> to compare hits, reads and WAL bytes.</li><li>Run VACUUM and observe dead tuples disappear.</li></ul>',
          solution: 'CREATE TABLE t (id bigint PRIMARY KEY, v text);\nINSERT INTO t SELECT g, md5(g::text) FROM generate_series(1, 1000000) g;\nSELECT pg_size_pretty(pg_relation_size(\'t\')), pg_relation_size(\'t\') / 8192 AS pages;\n\nCREATE EXTENSION IF NOT EXISTS pageinspect;\nSELECT lp, t_xmin, t_xmax, t_ctid FROM heap_page_items(get_raw_page(\'t\', 0)) LIMIT 3;\nUPDATE t SET v = \'x\' WHERE id = 1;\nSELECT lp, t_xmin, t_xmax, t_ctid FROM heap_page_items(get_raw_page(\'t\', 0)) WHERE t_xmax <> 0 OR lp = 1;\n-- old version now has xmax set and t_ctid pointing at the new version\n\nEXPLAIN (ANALYZE, BUFFERS, WAL) UPDATE t SET v = \'y\' WHERE id <= 10000;\n-- Buffers: shared hit/read/dirtied; WAL: records, fpi (full-page images), bytes\n\nSELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = \'t\';\nVACUUM (VERBOSE) t;\nSELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = \'t\';',
          lang: 'sql'
        },
        {
          t: 'Explain WAL and crash recovery step by step',
          d: 'medium', type: 'concept',
          hint: '<ul><li>Follow one UPDATE: buffer pool page, WAL record with LSN, commit record, fsync, acknowledgement.</li><li>When does the data page reach disk?</li><li>The machine crashes before that: what does recovery do?</li><li>How are torn pages handled?</li></ul>',
          solution: '1) UPDATE modifies the page in the buffer pool (now dirty) and appends a WAL record (LSN 1000) describing the change; the page header records LSN 1000.\n2) COMMIT appends a commit record (LSN 1010) and flushes WAL up to 1010 (fdatasync, possibly shared with other commits = group commit). Only now is the client told "COMMIT".\n3) The dirty page stays in memory; a later checkpoint or background writer flushes it. WAL rule: WAL up to the page LSN must be durable before the page is written.\n4) Crash before the page flush: on restart, recovery starts at the last checkpoint\'s redo point and replays WAL records whose LSN > page LSN, recreating the update. Transactions without a commit record are rolled back (InnoDB via undo logs; PostgreSQL by marking them aborted - their tuples stay invisible).\n5) Torn page: if the crash happened mid-page-write, PostgreSQL restores the full-page image logged after the checkpoint (full_page_writes), InnoDB restores the page from the doublewrite buffer, then redo applies.\nRecovery time is bounded by checkpoint frequency (max_wal_size / checkpoint_timeout).'
        },
        {
          t: 'Diagnose PostgreSQL table bloat and autovacuum lag',
          d: 'medium', type: 'debug',
          hint: '<ul><li>Symptoms: table grows although row count is stable; sequential scans and index scans slow down.</li><li>Check <code>n_dead_tup</code>, <code>last_autovacuum</code>, long-running or idle-in-transaction sessions, replication slots and <code>hot_standby_feedback</code>.</li><li>Tune per-table autovacuum thresholds and cost limits.</li><li>Know how to reclaim space online.</li></ul>',
          solution: 'Diagnosis:\n- pg_stat_user_tables: n_dead_tup >> n_live_tup, last_autovacuum old or never.\n- pg_stat_activity: an "idle in transaction" session or long report query holds the xmin horizon -> VACUUM cannot remove tuples newer than it.\n- pg_replication_slots: an inactive slot or a standby with hot_standby_feedback=on holding back xmin.\n- pg_stat_progress_vacuum: vacuums running but throttled by autovacuum_vacuum_cost_limit.\nFixes:\n- Kill/limit long transactions (idle_in_transaction_session_timeout, statement_timeout), drop stale slots.\n- Per-table tuning for hot tables: ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_cost_limit = 2000);\n- More autovacuum_max_workers on large systems; lower fillfactor to enable HOT updates.\n- Reclaim existing bloat online with pg_repack (VACUUM FULL takes an exclusive lock). REINDEX CONCURRENTLY for bloated indexes.\n- Monitor age(datfrozenxid) to stay far from wraparound.'
        },
        {
          t: 'Size a Bloom filter for an SSTable',
          d: 'medium', type: 'concept',
          hint: '<ul><li>Formulae: <code>m = −n ln p / (ln 2)<sup>2</sup></code> bits and <code>k = (m/n) ln 2</code> hash functions.</li><li>Compute for n = 1 million keys and p = 1%, then p = 0.1%.</li><li>What does a false positive cost on the read path? Why do Bloom filters not help range scans?</li></ul>',
          solution: 'n = 1e6, p = 0.01: m = 1e6 x 4.605 / 0.4805 = 9.59e6 bits ~ 1.2 MB (~9.6 bits/key), k = 9.6 x 0.693 ~ 7 hashes.\np = 0.001: m ~ 14.4 bits/key (~1.8 MB), k ~ 10.\nRule of thumb: each extra ~4.8 bits/key cuts the false-positive rate 10x.\nCost of a false positive: a wasted index/data block read (possibly a disk I/O) for that SSTable. With 7 levels and 1% FPR, a lookup for a missing key costs ~0.07 wasted reads instead of 7.\nBloom filters answer only "is key k possibly present", so they do not help range scans (RocksDB prefix Bloom filters help for prefix seeks). Memory: filters for 1 billion keys at 10 bits/key = 1.25 GB - often kept in the block cache, partitioned for large datasets.'
        },
        {
          t: 'Choose a B-tree or LSM engine for three workloads',
          d: 'medium', type: 'design',
          hint: '<ul><li>(a) Banking ledger with many point reads and range queries; (b) IoT ingestion of 500K events/s with TTL 30 days; (c) user-profile store with 80% reads, frequent small updates.</li><li>Use read, write and space amplification to justify.</li><li>Name a concrete database for each.</li></ul>',
          solution: '(a) Ledger: B+tree (PostgreSQL / InnoDB). Predictable read latency, strong range scans, mature transactions and constraints. Write rate moderate; WAL makes writes sequential enough.\n(b) IoT ingest: LSM with time-window compaction (Cassandra/ScyllaDB TWCS, or a TSDB). Sequential writes absorb huge insert rates; whole SSTables drop at TTL expiry with almost no compaction cost. Partition by (device, day) to bound partitions.\n(c) Profiles: either works. B+tree for read-heavy with in-place updates (PostgreSQL, DynamoDB-like KV). If using an LSM (RocksDB/Cassandra), choose leveled compaction to keep read and space amplification low despite updates, and enough Bloom-filter bits.\nGeneral rule: write-heavy/append/TTL -> LSM; read-heavy with ranges and complex transactions -> B+tree; always benchmark with your key distribution.'
        },
        {
          t: 'Implement a simple append-only log-structured KV store in Go',
          d: 'hard', type: 'coding',
          hint: '<ul><li>Bitcask design: one append-only file of records <code>[crc32][keyLen][valLen][key][value]</code> and an in-memory hash index key → file offset.</li><li><code>Put</code> appends then fsyncs (or batches fsyncs); <code>Delete</code> appends a tombstone.</li><li>On <code>Open</code>, scan the file to rebuild the index; stop at the first bad CRC and truncate the torn tail.</li><li>Extension: compaction (rewrite live keys into a new file, fsync, rename, fsync dir) and segment files.</li></ul>',
          solution: 'package kv\n\nimport (\n    "bufio"\n    "encoding/binary"\n    "errors"\n    "hash/crc32"\n    "io"\n    "os"\n    "sync"\n)\n\nconst (\n    headerSize = 12         // crc32 | keyLen | valLen (little endian)\n    tombstone  = ^uint32(0) // valLen marker for deletes\n)\n\nvar (\n    ErrNotFound = errors.New("kv: key not found")\n    ErrCorrupt  = errors.New("kv: checksum mismatch")\n)\n\ntype Store struct {\n    mu    sync.RWMutex\n    f     *os.File\n    index map[string]int64 // key -> offset of its latest record\n    size  int64            // end of the valid log\n}\n\nfunc Open(path string) (*Store, error) {\n    f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o644)\n    if err != nil {\n        return nil, err\n    }\n    s := &Store{f: f, index: make(map[string]int64)}\n    if err := s.load(); err != nil {\n        f.Close()\n        return nil, err\n    }\n    return s, nil\n}\n\n// load replays the log to rebuild the index. A torn or corrupt tail\n// (crash during append) ends the scan and is truncated away.\nfunc (s *Store) load() error {\n    r := bufio.NewReader(io.NewSectionReader(s.f, 0, 1<<62))\n    hdr := make([]byte, headerSize)\n    var off int64\n    for {\n        if _, err := io.ReadFull(r, hdr); err != nil {\n            break\n        }\n        crc := binary.LittleEndian.Uint32(hdr[0:4])\n        kl := binary.LittleEndian.Uint32(hdr[4:8])\n        vl := binary.LittleEndian.Uint32(hdr[8:12])\n        n := kl\n        if vl != tombstone {\n            n += vl\n        }\n        if kl > 1<<16 || n > 64<<20 { // sanity limits guard against garbage\n            break\n        }\n        body := make([]byte, n)\n        if _, err := io.ReadFull(r, body); err != nil {\n            break\n        }\n        h := crc32.NewIEEE()\n        h.Write(hdr[4:])\n        h.Write(body)\n        if h.Sum32() != crc {\n            break\n        }\n        key := string(body[:kl])\n        if vl == tombstone {\n            delete(s.index, key)\n        } else {\n            s.index[key] = off\n        }\n        off += headerSize + int64(n)\n    }\n    s.size = off\n    return s.f.Truncate(off)\n}\n\nfunc (s *Store) appendRecord(key string, val []byte, del bool) (int64, error) {\n    vl := uint32(len(val))\n    if del {\n        vl, val = tombstone, nil\n    }\n    rec := make([]byte, headerSize+len(key)+len(val))\n    binary.LittleEndian.PutUint32(rec[4:8], uint32(len(key)))\n    binary.LittleEndian.PutUint32(rec[8:12], vl)\n    copy(rec[headerSize:], key)\n    copy(rec[headerSize+len(key):], val)\n    binary.LittleEndian.PutUint32(rec[0:4], crc32.ChecksumIEEE(rec[4:]))\n\n    off := s.size\n    if _, err := s.f.WriteAt(rec, off); err != nil {\n        return 0, err\n    }\n    // Durable before we acknowledge. Production: group commit (batch many\n    // Puts per fsync) and treat fsync failure as fatal (fsyncgate).\n    if err := s.f.Sync(); err != nil {\n        return 0, err\n    }\n    s.size += int64(len(rec))\n    return off, nil\n}\n\nfunc (s *Store) Put(key string, val []byte) error {\n    s.mu.Lock()\n    defer s.mu.Unlock()\n    off, err := s.appendRecord(key, val, false)\n    if err != nil {\n        return err\n    }\n    s.index[key] = off\n    return nil\n}\n\nfunc (s *Store) Delete(key string) error {\n    s.mu.Lock()\n    defer s.mu.Unlock()\n    if _, ok := s.index[key]; !ok {\n        return nil\n    }\n    if _, err := s.appendRecord(key, nil, true); err != nil {\n        return err\n    }\n    delete(s.index, key)\n    return nil\n}\n\nfunc (s *Store) Get(key string) ([]byte, error) {\n    s.mu.RLock()\n    defer s.mu.RUnlock()\n    off, ok := s.index[key]\n    if !ok {\n        return nil, ErrNotFound\n    }\n    hdr := make([]byte, headerSize)\n    if _, err := s.f.ReadAt(hdr, off); err != nil {\n        return nil, err\n    }\n    kl := int64(binary.LittleEndian.Uint32(hdr[4:8]))\n    vl := int64(binary.LittleEndian.Uint32(hdr[8:12]))\n    rec := make([]byte, headerSize+kl+vl)\n    if _, err := s.f.ReadAt(rec, off); err != nil {\n        return nil, err\n    }\n    if crc32.ChecksumIEEE(rec[4:]) != binary.LittleEndian.Uint32(rec[0:4]) {\n        return nil, ErrCorrupt // detect bit rot on read\n    }\n    return rec[headerSize+kl:], nil\n}\n\nfunc (s *Store) Close() error { return s.f.Close() }\n\n// Next steps (interview discussion):\n// - Compaction: copy live records to a new file, fsync, rename over the old\n//   file, fsync the directory, swap file + index under the lock.\n// - Segments: roll to a new file at N MB; compact closed segments in the\n//   background; write "hint files" (key -> offset) to speed up startup.\n// - Range scans need a sorted structure: memtable + SSTables = an LSM-tree.',
          lang: 'go'
        },
        {
          t: 'Tune compaction for a write-heavy time-series workload',
          d: 'hard', type: 'design',
          hint: '<ul><li>Workload: 300K writes/s, data queried mostly for the last 24 h, TTL 30 days, rare updates.</li><li>Compare leveled, size-tiered and time-window/FIFO compaction on write amp, space amp and TTL expiry cost.</li><li>Watch for write stalls (L0 file count, pending compaction bytes) and tombstones.</li><li>Think about partition/key design and disk headroom.</li></ul>',
          solution: 'Choice: time-window compaction (Cassandra/ScyllaDB TWCS, window = 1 day) or RocksDB FIFO/universal with TTL. Each window\'s SSTables are compacted together once, then never touched; when every row in an SSTable is past TTL the whole file is dropped - no tombstone scans, minimal write amplification.\nAvoid leveled: repeatedly rewrites data that never changes (write amp 10-30x) -> wasted disk bandwidth and SSD endurance.\nAvoid writing out-of-order timestamps or updating old rows (breaks window isolation, mixes windows in one SSTable, delays expiry). Do not mix TTLs in one table; use default_time_to_live rather than explicit deletes.\nKey design: partition by (series_id, day) so partitions stay bounded (< ~100 MB).\nRocksDB knobs: larger write_buffer_size and max_write_buffer_number to absorb bursts, raise level0_slowdown/stop triggers carefully, increase max_background_jobs, rate-limit compaction I/O, monitor pending-compaction-bytes and stall counters.\nCapacity: keep 30-50% free space for compaction temp files (size-tiered needs up to 2x the largest compaction).\nVerify with production-like load tests and watch p99 write latency during compaction.'
        },
        {
          t: 'Design the storage layout for a 10 TB analytics table on object storage',
          d: 'hard', type: 'design',
          hint: '<ul><li>Queries mostly filter by date and customer, aggregate a few of 120 columns.</li><li>Decide file format, compression, partitioning, sort order and target file size.</li><li>Avoid the small-files problem and over-partitioning.</li><li>Use a table format for atomic commits, compaction and schema evolution.</li></ul>',
          solution: 'Format: Parquet with zstd, managed by Apache Iceberg (or Delta Lake) so writers commit atomically and readers get snapshot isolation and time travel.\nPartitioning: by day (Iceberg hidden partitioning: days(event_ts)); NOT by customer (high cardinality -> millions of tiny files).\nWithin partitions: sort or z-order by customer_id (then event_ts) so Parquet min/max stats let engines skip most row groups for customer filters.\nFile size: 256 MB - 1 GB files, row groups ~128 MB, pages ~1 MB; run periodic compaction (rewrite_data_files) to merge small streaming files.\nColumns: dictionary encoding helps low-cardinality strings; avoid wide JSON blobs - extract hot fields to columns.\nExpected effect: a query on 1 day x 1 customer x 5 columns reads ~1/365 of partitions, a few row groups within them, and ~4% of column bytes: tens of MB instead of 10 TB.\nOperations: expire old snapshots, remove orphan files, lifecycle-tier old partitions, keep statistics fresh; engines: Spark/Trino/Athena/Synapse/DuckDB.'
        },
        {
          t: 'Reproduce write skew and fix it with SERIALIZABLE or explicit locks',
          d: 'medium',
          type: 'hands-on',
          hint: '<ul><li>Two psql sessions on the on-call <code>doctors</code> table, both at REPEATABLE READ: each checks that two doctors are on call, then takes itself off call.</li><li>Why does PostgreSQL detect no conflict? (Different rows are updated.)</li><li>Repeat at SERIALIZABLE and observe SQLSTATE 40001.</li><li>Alternatives: <code>SELECT … FOR UPDATE</code> on the rows the decision depends on, or materialise the conflict in one row both transactions must update.</li></ul>',
          solution: '-- REPEATABLE READ: both sessions read count = 2, update different rows, both commit -> 0 doctors on call.\n-- Snapshot isolation only detects write-write conflicts on the same row.\n\n-- Fix 1: SERIALIZABLE (SSI). Same steps; one transaction gets\n--   ERROR: could not serialize access due to read/write dependencies among transactions (40001)\n-- The application retries it; on retry it sees count = 1 and refuses.\nBEGIN ISOLATION LEVEL SERIALIZABLE;\nSELECT count(*) FROM doctors WHERE on_call;\nUPDATE doctors SET on_call = false WHERE name = \'alice\';\nCOMMIT;\n\n-- Fix 2: lock the rows that guard the invariant (works at READ COMMITTED)\nBEGIN;\nSELECT name FROM doctors WHERE on_call FOR UPDATE;   -- B blocks here until A commits\n-- application checks the count, then:\nUPDATE doctors SET on_call = false WHERE name = \'alice\';\nCOMMIT;\n-- After A commits, B\'s locking read re-checks the WHERE clause on the new row versions\n-- and returns only bob, so B refuses.\n\n-- Fix 3: materialise the conflict in one row with an atomic check-and-decrement\nUPDATE shifts SET on_call_count = on_call_count - 1\nWHERE shift_id = 7 AND on_call_count > 1;             -- 0 rows updated = refuse\n\n-- MySQL InnoDB: plain SELECTs at REPEATABLE READ allow the same anomaly;\n-- use SELECT ... FOR UPDATE (next-key locks) or SERIALIZABLE.'
        },
        {
          t: 'Rescue a PostgreSQL database approaching transaction-ID wraparound',
          d: 'hard',
          type: 'debug',
          hint: '<ul><li>Symptoms: "database must be vacuumed within N transactions" warnings, anti-wraparound autovacuums that never finish, <code>age(datfrozenxid)</code> above 1.5 billion.</li><li>First find what prevents freezing: old snapshots, prepared transactions, replication slots, one enormous table.</li><li>How do you make a vacuum finish fast enough?</li><li>Prevent recurrence with monitoring and table design.</li></ul>',
          solution: '1. Measure: SELECT datname, age(datfrozenxid) FROM pg_database; then age(relfrozenxid) per table. The hard limit is ~2^31 (2.1 billion); PostgreSQL stops assigning new XIDs about 3 million before it.\n2. Remove blockers, otherwise VACUUM cannot advance relfrozenxid:\n   - long or idle-in-transaction sessions: SELECT pg_terminate_backend(pid)\n   - orphaned prepared transactions: ROLLBACK PREPARED \'gid\'\n   - stale replication slots: SELECT pg_drop_replication_slot(\'old_slot\')\n   - standbys with hot_standby_feedback running long queries\n3. Freeze the oldest tables first, as fast as possible:\n   SET vacuum_cost_delay = 0; SET maintenance_work_mem = \'2GB\';\n   VACUUM (FREEZE, VERBOSE, INDEX_CLEANUP OFF) big_table;   -- skip index passes in an emergency\n   The failsafe (vacuum_failsafe_age, default 1.6 billion, PostgreSQL 14+) does similar things automatically.\n4. If writes are already refused: connect normally (VACUUM needs no new XID) and run plain VACUUM on the oldest tables. Single-user mode is no longer recommended on modern versions. Do not run VACUUM FULL: it needs an XID and takes far longer.\n5. Prevent: alert when age exceeds ~500M-1B; idle_in_transaction_session_timeout; max_slot_wal_keep_size and slot monitoring; insert-triggered autovacuum (13+) and eager freezing (18) for append-only tables; partition huge tables by time so old partitions are frozen once and then skipped.'
        },
        {
          t: 'Design a transactional commit protocol for a table on object storage',
          d: 'hard',
          type: 'design',
          hint: '<ul><li>Requirements: many concurrent writers (batch jobs, streaming ingest), readers never see half a commit, no database other than an optional catalog.</li><li>Data files are immutable with unique names: what is the single mutable thing?</li><li>Use S3 conditional writes (<code>If-None-Match: *</code> for put-if-absent, <code>If-Match</code> for compare-and-swap) or a catalog CAS; define conflict detection and retry.</li><li>Cover garbage collection, small files and readers holding old snapshots.</li></ul>',
          solution: 'Layout (Delta/Iceberg-style):\n  s3://lake/orders/data/<uuid>.parquet              immutable data files\n  s3://lake/orders/meta/<uuid>-manifest.json        file list + column stats\n  s3://lake/orders/_log/00000000000000000042.json   commit 42\n\nCommit (optimistic concurrency):\n1. Read the latest commit N (version-hint object or LIST _log/ from the last checkpoint), plan the change against snapshot N.\n2. Write all new data files and a manifest under unique names. Nothing references them yet, so they are invisible.\n3. PUT _log/<N+1>.json with If-None-Match: * (put-if-absent). Exactly one writer wins N+1: the linearization point.\n4. The loser gets 412: read N+1 and check for logical conflicts (did it delete or rewrite files I also rewrote? touch the same partitions under a stricter isolation level?). No conflict -> retry as N+2 reusing the data files; conflict -> abort and re-plan.\n\nReaders: read the latest commit (checkpoint files every ~10 commits avoid replaying thousands of log entries), reconstruct the file set, read only listed files -> snapshot isolation, never a partial commit.\nAlternative: Iceberg-style catalog CAS (REST catalog, Glue, S3 Tables) swapping the metadata pointer v41 -> v42.\n\nHousekeeping:\n- Compaction rewrites small files as an ordinary commit (conflicts only with concurrent deletes of the same files).\n- Snapshot expiry after the retention window (e.g. 7 days) makes old files unreferenced.\n- Orphan cleanup deletes unreferenced objects older than the longest possible write, so in-flight files are not removed.\n- Lifecycle rule to abort incomplete multipart uploads.\n\nFailures: crash after step 2 -> only orphans; crash after step 3 -> commit complete. Ordering comes from the log number, not clocks.\nLimits: commits per table are serialized (a few per second); batch streaming into micro-commits every 30-60 s and partition very hot tables.'
        }
      ],
      interviewFocus: [
        {
          q: 'B-tree vs LSM-tree: how do they differ and when would you choose each?',
          a: '<table><thead><tr><th></th><th>B+tree</th><th>LSM-tree</th></tr></thead><tbody>' +
            '<tr><td>Write path</td><td>update page in place (via buffer pool + WAL); random page writes</td><td>WAL + memtable, flushed as sorted immutable files; sequential writes</td></tr>' +
            '<tr><td>Write amplification</td><td>page-level: rewrite 8–16 KiB for a small change</td><td>compaction: data rewritten several times (leveled 10–30x, tiered less)</td></tr>' +
            '<tr><td>Read amplification</td><td>low and predictable: one root-to-leaf path</td><td>may check memtable + several SSTables; Bloom filters and caching help</td></tr>' +
            '<tr><td>Space amplification</td><td>fragmentation, ~50–70% full pages with random inserts</td><td>obsolete versions until compaction; low with leveled, up to 2x with tiered</td></tr>' +
            '<tr><td>Range scans</td><td>excellent (linked leaves)</td><td>good, but merge across levels</td></tr>' +
            '<tr><td>Latency profile</td><td>stable; checkpoints cause bursts</td><td>compaction debt can cause stalls and p99 spikes</td></tr>' +
            '<tr><td>Examples</td><td>PostgreSQL, InnoDB, SQL Server, LMDB</td><td>RocksDB, LevelDB, Cassandra, ScyllaDB, HBase, Pebble</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Choose LSM</strong> for write-heavy, append-mostly or TTL data (ingest, time series, logs, messaging state), especially on flash where sequential writes save endurance. <strong>Choose B+tree</strong> for read-heavy OLTP with ranges and complex transactions. Frame it with the <strong>RUM conjecture</strong>: you can optimise two of read, update and memory/space overhead at the expense of the third; compaction strategy is how LSMs move along that curve.</p>'
        },
        {
          q: 'Walk through what happens when you COMMIT a transaction in PostgreSQL.',
          a: '<ol><li>Each modified row produced a new tuple version in a buffer-pool page and a WAL record (with full-page image if first change since checkpoint).</li>' +
            '<li>COMMIT writes a commit record into the WAL buffer, then flushes WAL to disk up to that LSN (<code>fdatasync</code>; concurrent commits share one flush — group commit). With synchronous replication, it also waits for standby(s) to confirm per <code>synchronous_commit</code> (on, remote_write, remote_apply).</li>' +
            '<li>The transaction is marked committed in the commit log (pg_xact); its tuples become visible to new snapshots.</li>' +
            '<li>The client receives success. Data pages are still dirty in memory; the checkpointer/background writer flushes them later.</li>' +
            '<li>After a crash, redo from the last checkpoint rebuilds any changes missing from data files.</li></ol>' +
            '<p>Knobs: <code>synchronous_commit=off</code> acknowledges before the flush (may lose the last few hundred ms of commits but never corrupts); <code>fsync=off</code> is unsafe outside throwaway environments.</p>'
        },
        {
          q: 'How do MVCC implementations differ between PostgreSQL and InnoDB, and what problems does each cause?',
          a: '<ul><li><strong>PostgreSQL</strong> stores every version in the heap. UPDATE = insert new tuple + mark old one dead; indexes point to tuples, so non-HOT updates add entries in every index. VACUUM must reclaim dead tuples and freeze old transaction IDs (32-bit XIDs). Problems: <strong>bloat</strong>, index write amplification (Uber\'s 2016 migration post), <strong>XID wraparound</strong> emergencies, long transactions blocking cleanup.</li>' +
            '<li><strong>InnoDB</strong> updates rows in place in the clustered index and writes the previous version to <strong>undo logs</strong>; readers needing older snapshots walk the undo chain. Purge threads discard undo no longer needed. Problems: huge <strong>history list length</strong> and slow reads when a long transaction pins old snapshots; undo tablespace growth.</li></ul>' +
            '<p>Common lesson: <strong>long-running transactions are poison</strong> for MVCC databases — set timeouts, keep analytics on replicas (and beware <code>hot_standby_feedback</code> pushing the problem back to the primary).</p>'
        },
        {
          q: 'Clustered vs secondary indexes — what does this mean for primary-key and index design?',
          a: '<ul><li><strong>Clustered</strong> (InnoDB, SQL Server clustered index): rows are physically ordered by the key inside the B+tree leaves. PK range scans are sequential; inserts follow PK order. Every secondary index stores the PK as the row locator → two traversals per secondary lookup and wide PKs inflate all indexes.</li>' +
            '<li><strong>Heap + secondary</strong> (PostgreSQL): rows stored unordered; every index stores a physical TID. Updates that move a tuple require index maintenance unless HOT applies.</li></ul>' +
            '<p>Design consequences: use compact, monotonically increasing PKs (BIGINT, UUIDv7) rather than random UUIDv4; build <strong>covering indexes</strong> (InnoDB: secondary columns + PK; PostgreSQL: <code>INCLUDE</code>) for hot queries; order composite index columns by equality filters first, then range; drop unused indexes because each one multiplies write cost.</p>'
        },
        {
          q: 'Why are columnar formats so much faster for analytics, and when are they the wrong choice?',
          a: '<ul><li><strong>Less I/O</strong>: read only referenced columns (projection pushdown).</li>' +
            '<li><strong>Skip data</strong>: min/max statistics per row group/page and partition pruning skip blocks that cannot match (predicate pushdown) — far more effective when data is sorted by filter columns.</li>' +
            '<li><strong>Compression</strong>: values of one type and domain compress extremely well (dictionary, RLE, delta + zstd), reducing both storage and bandwidth.</li>' +
            '<li><strong>CPU efficiency</strong>: vectorised execution on column batches with SIMD, late materialisation.</li></ul>' +
            '<p><strong>Wrong choice</strong> for OLTP: single-row lookups and updates touch many column files; files are immutable so updates become rewrite or merge-on-read (Iceberg delete files, ClickHouse mutations). Many small files (streaming writes) destroy the benefits — compact them.</p>'
        },
        {
          q: 'Why is snapshot isolation not serializable, and how does PostgreSQL make it serializable?',
          a: '<p>Snapshot isolation gives each transaction a consistent snapshot and aborts on <strong>write-write</strong> conflicts on the same row (first committer wins). It never checks what a transaction <em>read</em>, so two transactions that read an overlapping set and write disjoint rows can both commit and break an invariant — <strong>write skew</strong> (on-call doctors, double-booked rooms, two withdrawals that together overdraw linked accounts). Read-only transactions can observe anomalies too.</p><p>PostgreSQL\'s <strong>Serializable Snapshot Isolation</strong> keeps snapshot reads but records read dependencies as non-blocking SIREAD locks. It detects the "dangerous structure" — two consecutive read-write anti-dependency edges in the dependency graph — and aborts one transaction with SQLSTATE 40001.</p><ul><li>Readers still never block writers; false positives are possible (locks are coarsened under memory pressure).</li><li>The application <strong>must retry</strong>: use a generic retry wrapper and keep transactions short and side-effect free.</li><li>Long reports can run as <code>SERIALIZABLE READ ONLY DEFERRABLE</code> to wait for a safe snapshot and never be aborted.</li><li>Alternatives: enforce invariants with constraints (unique, exclusion) or lock the guarding rows with <code>SELECT … FOR UPDATE</code>.</li></ul>'
        }
      ],
      quiz: [
        { q: 'Default page size of PostgreSQL and InnoDB?', a: 'PostgreSQL 8 KiB, InnoDB 16 KiB.' },
        { q: 'What is the WAL rule?', a: 'A change must be durably logged before the modified data page is written, and a transaction commits only once its commit record is durable.' },
        { q: 'What is a memtable?', a: 'The in-memory sorted structure (usually a skiplist) that buffers recent writes in an LSM-tree before they are flushed as an SSTable.' },
        { q: 'Why do LSM-trees use Bloom filters?', a: 'To skip SSTables that definitely do not contain a key, avoiding disk reads on point lookups (about 1% false positives at 10 bits per key).' },
        { q: 'Leveled vs size-tiered compaction in one line?', a: 'Leveled: lower read and space amplification, higher write amplification; size-tiered: lower write amplification, higher space and read amplification.' },
        { q: 'What does an InnoDB secondary index leaf store?', a: 'The indexed columns plus the primary key value, which is then used to look up the row in the clustered index.' },
        { q: 'What is a HOT update in PostgreSQL?', a: 'Heap-only tuple: when no indexed column changes and the new version fits on the same page, no new index entries are needed.' },
        { q: 'What is predicate pushdown in Parquet?', a: 'Using row-group and page min/max statistics (and Bloom filters) to skip data that cannot satisfy the query filter.' },
        {
          q: 'Default isolation level in PostgreSQL vs MySQL InnoDB?',
          a: 'PostgreSQL: Read Committed (a new snapshot per statement). InnoDB: Repeatable Read (one snapshot per transaction for plain reads, next-key locks for locking reads).'
        },
        {
          q: 'What is write skew?',
          a: 'Two transactions read an overlapping set of rows, each updates a different row, and together they break an invariant; snapshot isolation allows it, Serializable prevents it.'
        },
        {
          q: 'Why does transaction-ID wraparound threaten PostgreSQL?',
          a: '32-bit XIDs are compared modulo 2^32, so unfrozen tuples older than about 2 billion transactions would appear to be in the future; VACUUM must freeze them, and PostgreSQL stops assigning XIDs near the limit.'
        },
        {
          q: 'How does an Iceberg commit become atomic on object storage?',
          a: 'Writers add immutable data and metadata files, then the catalog atomically swaps the table pointer to the new metadata file only if it still points at the version they started from (compare-and-swap); losers retry.'
        }
      ],
      resources: [
        { title: 'PostgreSQL — Database Page Layout', url: 'https://www.postgresql.org/docs/current/storage-page-layout.html', type: 'docs' },
        { title: 'PostgreSQL — Write-Ahead Logging (WAL)', url: 'https://www.postgresql.org/docs/current/wal-intro.html', type: 'docs' },
        { title: 'RocksDB — Getting started and architecture docs', url: 'https://rocksdb.org/docs/getting-started.html', type: 'docs' },
        { title: 'MySQL 8.4 — The InnoDB Storage Engine', url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-storage-engine.html', type: 'docs' },
        {
          title: 'PostgreSQL — Transaction Isolation',
          url: 'https://www.postgresql.org/docs/current/transaction-iso.html',
          type: 'docs'
        },
        {
          title: 'PostgreSQL — Routine Vacuuming',
          url: 'https://www.postgresql.org/docs/current/routine-vacuuming.html',
          type: 'docs'
        },
        {
          title: 'Apache Iceberg — Table Spec',
          url: 'https://iceberg.apache.org/spec/',
          type: 'docs'
        }
      ]
    },
    // ───────────────────────────── Module 6 ─────────────────────────────
    {
      n: 6,
      title: 'Distributed Storage Systems',
      summary: 'How storage scales beyond one machine: replication strategies, quorums, consistent hashing and data placement, metadata services, the GFS/HDFS and Ceph architectures, and how to design an S3-like object store that rebalances and survives hot spots.',
      topics: [
        {
          title: 'Replication Strategies: Sync, Async, Consensus and Chain Replication',
          def: '<table><thead><tr><th>Strategy</th><th>How writes are acknowledged</th><th>Pros</th><th>Cons</th><th>Examples</th></tr></thead><tbody>' +
            '<tr><td>Single leader, async</td><td>leader commits locally, ships log later</td><td>low write latency</td><td>failover can lose acknowledged writes (RPO &gt; 0), stale reads on followers</td><td>PostgreSQL/MySQL async replicas</td></tr>' +
            '<tr><td>Single leader, sync / semi-sync</td><td>leader waits for ≥1 follower</td><td>no loss on single failure</td><td>latency of slowest required follower; availability tied to it</td><td>PostgreSQL <code>synchronous_standby_names</code>, MySQL semi-sync</td></tr>' +
            '<tr><td>Consensus (Raft / Paxos)</td><td>majority of replicas persisted the log entry</td><td>no loss, automatic safe failover, linearizable</td><td>needs majority (2f+1 nodes for f failures), extra round trip</td><td>etcd, CockroachDB, TiKV, Spanner, Kafka KRaft metadata</td></tr>' +
            '<tr><td>Chain replication</td><td>write enters the <strong>head</strong>, flows down the chain, the <strong>tail</strong> acknowledges; reads served by the tail</td><td>strong consistency, high throughput, simple recovery</td><td>latency grows with chain length; tail is a read hot spot (CRAQ lets any node serve clean reads)</td><td>Azure Storage stream layer (similar), HDFS write pipeline, FAWN, Hibari</td></tr>' +
            '<tr><td>Leaderless</td><td>client/coordinator writes to N replicas, waits for W</td><td>no failover, high availability</td><td>conflicts, read repair, weaker guarantees</td><td>Dynamo, Cassandra, Riak</td></tr>' +
            '</tbody></table>' +
            '<ul><li><strong>Replication lag</strong> anomalies with async followers: read-your-writes violations, monotonic-read violations. Fixes: read from leader after writes, session tokens/LSN waits.</li>' +
            '<li><strong>Split brain</strong>: two nodes believe they are leader. Prevent with quorum-based leader election, leases and <strong>fencing tokens</strong> (storage rejects writes with an old epoch).</li>' +
            '<li>Storage systems usually separate a small, strongly consistent <strong>control plane</strong> (configuration, membership via Paxos/Raft) from a high-throughput <strong>data plane</strong> (primary-backup or chain replication configured by that control plane).</li></ul>',
          interview: 'Frame replication as an RPO/latency/availability trade-off and name concrete systems. Interviewers probe failover: what happens to acknowledged writes on async replicas, how split brain is prevented (quorum election plus fencing tokens), and why consensus needs 2f+1 nodes.',
          examples: [
            { label: 'Chain replication', lang: 'text', code: '  write                                         ack\nclient ---> [HEAD] ---> [MID] ---> [TAIL] -------------> client\n                                       ^\n                         reads -------+   (tail has only fully replicated data)\n\nFailure handling (configured by a separate master / Paxos group):\n  head fails -> next node becomes head\n  tail fails -> predecessor becomes tail\n  middle fails -> predecessor links to successor, resends in-flight updates' }
          ]
        },
        {
          title: 'Quorum Reads and Writes',
          def: '<p>With <strong>N</strong> replicas, a write waits for <strong>W</strong> acknowledgements and a read queries <strong>R</strong> replicas. If <code>W + R &gt; N</code>, every read set overlaps every write set in at least one replica, so a read can see the latest successful write (using versions/timestamps to pick the newest).</p>' +
            '<table><thead><tr><th>N / W / R</th><th>Behaviour</th></tr></thead><tbody>' +
            '<tr><td>3 / 2 / 2</td><td>balanced; tolerates 1 replica down for reads and writes (Cassandra QUORUM)</td></tr>' +
            '<tr><td>3 / 3 / 1</td><td>fast reads; any replica down blocks writes</td></tr>' +
            '<tr><td>3 / 1 / 3</td><td>fast writes; reads need all replicas</td></tr>' +
            '<tr><td>3 / 1 / 1</td><td>fastest, eventual consistency, acknowledged writes can be lost (Cassandra ONE)</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Mechanisms around quorums</strong>: <em>read repair</em> (fix stale replicas seen during reads), <em>anti-entropy</em> with Merkle trees (Cassandra <code>nodetool repair</code>), <em>hinted handoff</em> and <em>sloppy quorums</em> (write to substitute nodes during failures — improves availability but breaks the overlap guarantee).</p>' +
            '<p><strong>Limits</strong> — quorums alone are not linearizable:</p>' +
            '<ul><li>A write in progress may be visible to one read and not to a later read.</li>' +
            '<li>A write that reached fewer than W replicas "fails" but is not rolled back and may later be read.</li>' +
            '<li>Last-write-wins with clock skew silently drops writes; concurrent writes need vector clocks / CRDTs or lightweight transactions (Cassandra Paxos-based LWT; Accord-based general transactions are planned for later Cassandra releases).</li></ul>' +
            '<p>Multi-DC: Cassandra <code>LOCAL_QUORUM</code> keeps latency local while tolerating a replica loss in each DC; <code>EACH_QUORUM</code> waits for a quorum in every DC.</p>',
          interview: 'State W + R > N, give two or three configurations with their failure behaviour, then show depth by explaining why it still is not linearizable (in-flight writes, sloppy quorums, LWW clock skew). Mention LOCAL_QUORUM for multi-region latency.',
          examples: [
            { label: 'Per-query consistency in Cassandra (cqlsh)', lang: 'sql', code: '-- In cqlsh: tune consistency per session or per statement\nCONSISTENCY LOCAL_QUORUM;\nINSERT INTO shop.orders (id, customer, total) VALUES (uuid(), \'c42\', 99.5);\nSELECT * FROM shop.orders WHERE id = 5b6962dd-3f90-4c93-8f61-eabfa4a803e2;\n\n-- Compare-and-set with a lightweight transaction (Paxos under the hood)\nUPDATE shop.inventory SET qty = 9 WHERE sku = \'A1\' IF qty = 10;' }
          ]
        },
        {
          title: 'Consistent Hashing, Partitioning and Rebalancing',
          def: '<p>With <code>hash(key) mod N</code>, changing N from 10 to 11 moves ~91% of keys. <strong>Consistent hashing</strong> maps nodes and keys onto a ring; a key belongs to the first node clockwise. Adding a node moves only ~1/N of keys (from its neighbour). <strong>Virtual nodes</strong> (many tokens per physical node) smooth the distribution, let heterogeneous nodes take proportional load, and spread a failed node\'s load across many peers.</p>' +
            '<table><thead><tr><th>Scheme</th><th>Idea</th><th>Used by</th></tr></thead><tbody>' +
            '<tr><td>Ring + vnodes</td><td>token ranges on a hash ring; replicas on next distinct nodes/racks</td><td>Dynamo, Cassandra, Riak</td></tr>' +
            '<tr><td>Rendezvous (HRW)</td><td>score each node with hash(key, node), pick the highest</td><td>many load balancers, caches</td></tr>' +
            '<tr><td>Jump consistent hash</td><td>O(1) memory, buckets numbered 0..N−1</td><td>sharded caches/storage</td></tr>' +
            '<tr><td>Fixed many partitions</td><td>create e.g. 4,096 partitions up front, move whole partitions</td><td>Ceph PGs, Kafka partitions, Elasticsearch shards, Couchbase vBuckets</td></tr>' +
            '<tr><td>Range partitioning</td><td>sorted key ranges split when large/hot</td><td>Bigtable, HBase, CockroachDB, TiKV, Spanner, S3 index</td></tr>' +
            '</tbody></table>' +
            '<ul><li><strong>Hash partitioning</strong>: even load, but range scans touch every partition.</li>' +
            '<li><strong>Range partitioning</strong>: efficient scans and splits, but monotonically increasing keys (timestamps) send all writes to the last range — add a hash prefix/salt or bucket.</li>' +
            '<li><strong>Rebalancing</strong>: move the minimum data, throttle bandwidth so client latency survives, prioritise <em>repair</em> (restoring redundancy) over <em>balance</em>, and add capacity in steps.</li>' +
            '<li><strong>Hot spots</strong>: a celebrity key or hot partition exceeds one node\'s capacity regardless of balance. Fixes: caching, read replicas for hot keys, key splitting/salting, adaptive partition splitting (DynamoDB, S3 prefixes).</li></ul>',
          interview: 'Quantify why mod-N fails and consistent hashing moves only about 1/N of keys, explain vnodes, then contrast hash vs range partitioning with a hot-spot example (monotonic timestamps on range partitions, celebrity keys on any scheme) and how you would rebalance safely.',
          examples: [
            { label: 'Consistent hash ring with virtual nodes', lang: 'text', code: '            0 / 2^64\n        N1#2      N3#0\n     N2#1            N1#0        key k -> hash(k) -> walk clockwise -> first vnode -> node\n    N3#2              N2#0       replicas = next distinct physical nodes (and racks/AZs)\n     N1#1            N3#1\n        N2#2      ...\nAdd N4 (with its vnodes): each N4 vnode takes a slice from its clockwise successor.\nTotal moved ~ 1/4 of keys, taken evenly from N1, N2 and N3.' }
          ]
        },
        {
          title: 'Metadata Services and the GFS / HDFS Architecture',
          def: '<p>Large storage systems split <strong>metadata</strong> (namespace, where data lives) from <strong>data</strong> (the bytes). <strong>GFS</strong> (2003) set the template:</p>' +
            '<ul><li>A single <strong>master</strong> holds the namespace and chunk → chunkserver mapping in memory, persists an <strong>operation log</strong> replicated to remote machines, and checkpoints it.</li>' +
            '<li><strong>Chunkservers</strong> store 64 MB chunks as local files, 3 replicas by default, placed across racks.</li>' +
            '<li>Clients ask the master only for locations, then talk to chunkservers directly — the master stays off the data path.</li>' +
            '<li>For mutations, the master grants a <strong>lease</strong> to one replica (the primary), which orders writes; data is pushed along a pipeline of replicas separately from control messages. <em>Record append</em> is at-least-once, so applications deduplicate.</li></ul>' +
            '<p><strong>HDFS</strong> follows the same design: <strong>NameNode</strong> (namespace + block map; fsimage + edit log), <strong>DataNodes</strong> (128 MB blocks, heartbeats and block reports), default replication 3 with rack awareness (first replica on the writer\'s node, second and third on two nodes of a different rack). Writes stream through a DataNode <strong>pipeline</strong>. Files are write-once/append-only — not POSIX.</p>' +
            '<ul><li><strong>NameNode HA</strong>: active + standby share edits through a quorum of <strong>JournalNodes</strong> (QJM); ZooKeeper failover controllers with fencing prevent split brain.</li>' +
            '<li><strong>Small-files problem</strong>: every file, directory and block costs ~150 bytes of NameNode heap — 100 million small files exhaust memory. Pack them (SequenceFiles, Parquet, HAR) or use federation/object storage.</li>' +
            '<li><strong>Evolution</strong>: Google replaced GFS with Colossus (metadata sharded in Bigtable); HDFS added federation and erasure coding; most new data lakes use object storage plus table formats.</li></ul>',
          interview: 'Explain the separation of metadata and data paths, why a single master is acceptable (metadata in RAM, clients cache locations, large chunks) and its limits (memory for small files, failover). Be ready to trace an HDFS write pipeline and rack-aware placement.',
          examples: [
            { label: 'HDFS operations', lang: 'bash', code: 'hdfs dfs -put events.parquet /data/events/\nhdfs fsck /data/events/events.parquet -files -blocks -locations   # blocks, replicas, racks\nhdfs dfsadmin -report                                              # DataNode capacity and health\nhdfs haadmin -getAllServiceState                                   # active / standby NameNodes\nhdfs ec -setPolicy -path /data/cold -policy RS-6-3-1024k           # erasure-code a cold directory' }
          ]
        },
        {
          title: 'Ceph: RADOS, CRUSH and Placement Groups',
          def: '<p><strong>Ceph</strong> is a unified software-defined storage system built on <strong>RADOS</strong> (Reliable Autonomic Distributed Object Store):</p>' +
            '<table><thead><tr><th>Component</th><th>Role</th></tr></thead><tbody>' +
            '<tr><td>OSD daemons</td><td>one per disk; store objects (BlueStore directly on the raw device, RocksDB for metadata), replicate, recover, scrub</td></tr>' +
            '<tr><td>MON</td><td>small Paxos cluster holding the authoritative cluster maps (OSD map, CRUSH map)</td></tr>' +
            '<tr><td>MGR</td><td>metrics, dashboard, orchestration modules (balancer, PG autoscaler)</td></tr>' +
            '<tr><td>MDS</td><td>metadata servers for CephFS (POSIX file system)</td></tr>' +
            '<tr><td>RGW / RBD</td><td>S3- and Swift-compatible object gateway / block devices (used by OpenStack, Kubernetes via Rook)</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Placement without a lookup table</strong>:</p>' +
            '<ol><li>An object name hashes to a <strong>placement group (PG)</strong>: <code>pg = hash(name) mod pg_num</code> (stable mod).</li>' +
            '<li><strong>CRUSH</strong>(pg, cluster map, rule) deterministically computes an ordered list of OSDs, honouring the failure-domain hierarchy (e.g. one replica per host or rack, weighted by capacity).</li>' +
            '<li>Any client with the current map computes the location itself and talks directly to the <strong>primary OSD</strong>, which replicates to the others and acknowledges once all OSDs in the acting set have persisted it.</li></ol>' +
            '<p>When an OSD fails or is added, the map changes, CRUSH remaps only the affected PGs, and OSDs <em>peer</em> and backfill autonomously. PGs keep metadata and recovery granular (aim for ~100 PGs per OSD; the autoscaler manages this). In Kubernetes, <strong>Rook</strong> operates Ceph and provides RBD (RWO) and CephFS (RWX) CSI drivers.</p>',
          interview: 'The key insight: Ceph replaces a central placement lookup with a deterministic, topology-aware function (CRUSH) computed by clients, with PGs as the unit of placement and recovery. Compare with HDFS (central NameNode block map) and with consistent hashing (CRUSH is a weighted, hierarchy-aware generalisation).',
          examples: [
            { label: 'Where does an object live?', lang: 'bash', code: 'ceph -s                                  # health, mons, OSDs, PG states\nceph osd tree                            # CRUSH hierarchy: root > rack > host > osd, weights\nceph osd map rbd my-object               # -> pg 2.6 -> up [3,1,5] acting [3,1,5], primary osd.3\nceph osd crush rule dump replicated_rule\nceph osd pool autoscale-status\nceph osd df tree                         # utilisation per OSD (spot imbalance)\nceph balancer status' }
          ]
        },
        {
          title: 'Designing an Object Store like S3',
          def: '<p>A production object store separates four concerns:</p>' +
            '<table><thead><tr><th>Layer</th><th>Responsibility</th><th>Key design choices</th></tr></thead><tbody>' +
            '<tr><td>Front end (stateless API)</td><td>HTTP/S3 API, authN/authZ, request routing, throttling, checksums</td><td>horizontally scaled behind load balancers; idempotent retries</td></tr>' +
            '<tr><td>Metadata / index</td><td>(bucket, key, version) → object locator, size, ETag, storage class</td><td>range-partitioned, replicated with consensus for strong read-after-write and LIST; partitions split when hot</td></tr>' +
            '<tr><td>Placement</td><td>choose storage nodes/volumes across failure domains (AZs)</td><td>capacity- and load-aware; avoids correlated hardware</td></tr>' +
            '<tr><td>Data / storage nodes</td><td>persist bytes</td><td>large append-only extents on HDD/SSD, erasure coding across AZs, end-to-end checksums</td></tr>' +
            '</tbody></table>' +
            '<p><strong>PUT path</strong>: authenticate → stream data, compute checksum → erasure-code into fragments → write fragments to storage nodes in ≥3 AZs (wait for enough to meet durability) → commit the index entry (this is the linearization point that makes the object visible) → 200 OK. Multipart: parts stored independently; Complete commits one index entry referencing all parts.</p>' +
            '<p><strong>GET path</strong>: index lookup → read k fragments (or replica) in parallel → verify checksum → stream; byte ranges map to fragment offsets.</p>' +
            '<p><strong>Background systems</strong> do most of the work: garbage collection of overwritten/deleted data, repair of lost fragments (prioritised by risk), scrubbing, lifecycle transitions and expirations, replication to other regions, usage metering. Small objects are packed into larger extents to keep EC efficient and per-object overhead low.</p>',
          interview: 'Structure the answer as front end, metadata, placement, data nodes, background services, then walk PUT and GET paths and failure scenarios (node, disk, AZ loss). Emphasise that the index commit is what provides strong read-after-write consistency, and that durability comes from EC across AZs plus repair, checksums and scrubbing.',
          examples: [
            { label: 'High-level object store architecture', lang: 'text', code: 'clients --HTTPS--> [ LB ] --> [ API front ends (stateless) ]\n                                  |  auth, throttle, checksum\n                  +---------------+----------------+\n                  v                                v\n        [ Metadata / index service ]      [ Placement service ]\n        bucket|key|version -> locator      picks nodes in 3 AZs\n        range partitions, Raft groups               |\n                  ^                                v\n                  |            [ Storage nodes: AZ-a | AZ-b | AZ-c ]\n                  |              append-only extents, RS(k,m) fragments\n                  |                                ^\n        [ Background: GC | repair | scrub | lifecycle | cross-region replication | metering ]' }
          ]
        },
        {
          title: 'Tiered Storage: Hot Local Disks, Cold Object Storage',
          def: '<p><strong>Tiered storage</strong> keeps the recent, hot part of a dataset on fast local or block storage and moves older, immutable chunks to object storage, while one API still serves both. It decouples retention from node disk size: "add brokers for disk" becomes "pay object-storage prices".</p><ul><li><strong>Why it fits log-structured systems</strong>: they already produce immutable units — Kafka log segments, LSM SSTables, ClickHouse parts, Lucene segments — so offloading is a copy of a closed file plus a metadata update, never an in-place change.</li><li><strong>Apache Kafka (KIP-405)</strong>, production-ready since Kafka 3.9: closed segments are copied by a <code>RemoteStorageManager</code> plugin (S3, GCS, Azure Blob) and tracked by a <code>RemoteLogMetadataManager</code> (an internal topic by default). <code>local.retention.ms/bytes</code> bounds the local tier and <code>retention.ms/bytes</code> the total. Consumers reading old offsets fetch remote segments transparently (higher latency, no page-cache help). Wins: small broker disks, broker replacement and rebalancing that move only the hot tail, cheap long retention. Limit: compacted topics cannot be tiered.</li><li><strong>Elsewhere</strong>: Redpanda and Confluent tiered storage, Pulsar offloaders (BookKeeper → S3), ClickHouse storage policies with an S3 disk and <code>TTL … TO VOLUME \'cold\'</code>, the Elasticsearch/OpenSearch frozen tier (searchable snapshots), Thanos/Mimir writing Prometheus blocks to object storage, Neon tiering page layers to S3.</li><li><strong>Design points</strong>: (1) keep metadata consistent with data — upload first, then publish metadata; delete remote objects only when metadata says they are unreferenced; (2) a local cache for remote reads sized for catch-up consumers and backfills; (3) upload large chunks (hundreds of MB) to keep request costs low; (4) the hot tier still needs replication until data is offloaded; (5) back up the tier metadata too — without it the objects are an unreadable pile.</li><li><strong>Diskless</strong> is the next step: WarpStream, AutoMQ, Bufstream and the proposed Kafka diskless topics (KIP-1150) write every batch straight to object storage, trading produce latency of hundreds of ms for stateless brokers and no inter-AZ replication traffic.</li></ul><table><thead><tr><th></th><th>All local (classic)</th><th>Tiered</th><th>Diskless</th></tr></thead><tbody><tr><td>Recent data</td><td>local disks, replicated x3</td><td>local disks, replicated x3</td><td>object storage</td></tr><tr><td>Old data</td><td>local disks, replicated x3</td><td>object storage (stored once)</td><td>object storage</td></tr><tr><td>Produce latency</td><td>ms</td><td>ms</td><td>hundreds of ms</td></tr><tr><td>Replacing a node</td><td>copy all retained data</td><td>copy the hot tail</td><td>nothing to copy</td></tr><tr><td>Cross-AZ replication cost</td><td>high</td><td>high for the hot tail</td><td>minimal</td></tr></tbody></table>',
          interview: 'Explain why tiering suits log-structured systems (immutable segments), the local vs total retention split, and the operational wins: smaller disks, fast broker replacement, cheap long retention. Then the costs: cold-read latency, request charges, keeping metadata and objects consistent, and that the hot tail still needs replication. Bonus points for comparing with diskless designs that trade latency for zero cross-AZ replication.',
          examples: [
            {
              label: 'Kafka tiered storage: 90 days total, 1 day on broker disks',
              lang: 'bash',
              code: '# server.properties (broker)\n#   remote.log.storage.system.enable=true\n#   remote.log.storage.manager.class.name=<RemoteStorageManager plugin, e.g. an S3 implementation>\n#   remote.log.metadata.manager.class.name=org.apache.kafka.server.log.remote.metadata.storage.TopicBasedRemoteLogMetadataManager\n\nkafka-topics.sh --bootstrap-server kafka:9092 --create --topic clickstream \\\n  --partitions 48 --replication-factor 3 \\\n  --config remote.storage.enable=true \\\n  --config local.retention.ms=86400000 \\\n  --config retention.ms=7776000000 \\\n  --config segment.bytes=536870912\n\n# Only closed segments are offloaded: segment size and segment.ms decide how soon'
            }
          ]
        }
      ],
      problems: [
        {
          t: 'Count keys moved when adding a node: mod-N vs consistent hashing',
          d: 'easy', type: 'concept',
          hint: '<ul><li>Start with 4 nodes and 1 million keys; add a 5th node.</li><li>With mod-N, a key stays only if <code>h mod 4 == h mod 5</code>.</li><li>With consistent hashing, only keys in the new node\'s ranges move.</li><li>Why do vnodes matter for how evenly the moved keys come from existing nodes?</li></ul>',
          solution: 'mod-N: a key stays put only when h mod 4 == h mod 5, i.e. for h mod 20 in {0,1,2,3} -> 4/20 = 20% stay, ~80% (800,000 keys) move.\nConsistent hashing: the new node should own ~1/5 of the ring -> ~20% (200,000 keys) move, all of them TO the new node; nothing moves between old nodes.\nWithout vnodes the new node takes its whole share from a single neighbour (unbalanced, one node streams all the data); with e.g. 256 vnodes per node it takes small slices from every existing node, so load and streaming work are spread evenly.'
        },
        {
          t: 'Pick N, W and R for three requirements',
          d: 'easy', type: 'concept',
          hint: '<ul><li>(a) Shopping cart that must accept writes during a node failure; (b) configuration read 1,000x more than written; (c) metrics where occasional loss is fine but latency must be minimal.</li><li>Use N = 3 and reason about availability and overlap.</li></ul>',
          solution: '(a) N=3, W=2, R=2 (QUORUM / LOCAL_QUORUM): overlap guaranteed, survives one replica down for both reads and writes; add hinted handoff for extra write availability and CRDT/merge logic for concurrent cart updates.\n(b) N=3, W=3, R=1: every replica has every write, so single-replica reads are current and fast; writes block if any replica is down (acceptable for rare config changes) - or use a consensus store like etcd.\n(c) N=3, W=1, R=1 (ONE): lowest latency, eventual consistency, a write acknowledged by one replica can be lost if that node dies before replicating.'
        },
        {
          t: 'Explain chain replication and when to prefer it over primary-backup',
          d: 'medium', type: 'concept',
          hint: '<ul><li>Where do writes enter, where are they acknowledged, where are reads served?</li><li>Why are tail reads strongly consistent?</li><li>Compare throughput and latency with a primary that fans out to all backups.</li><li>How does CRAQ improve read throughput?</li></ul>',
          solution: 'Writes enter at the head and propagate node to node; the tail acknowledges to the client. Reads go to the tail, which only holds updates that every replica has applied -> strong consistency (linearizable) without quorum reads.\nVs primary-backup with fan-out: the primary sends N-1 copies (its NIC is the bottleneck); in a chain each node sends one copy, spreading bandwidth -> higher write throughput for large data (HDFS pipelines use the same idea). Cost: write latency ~ chain length x hop latency.\nFailures are handled by an external configuration service (Paxos/ZooKeeper): remove failed node, splice the chain, resend unacknowledged updates.\nCRAQ: every node keeps clean/dirty versions; a node with a clean version answers reads locally, dirty ones ask the tail for the committed version -> reads scale across all replicas while keeping strong consistency.\nPrefer chain replication for storage data planes with large objects and read/write throughput needs; prefer Raft for small, latency-sensitive metadata where majority quorums tolerate slow nodes better.'
        },
        {
          t: 'Implement consistent hashing with virtual nodes in Go',
          d: 'medium', type: 'coding',
          hint: '<ul><li>Hash each <code>node#i</code> for i in 0..vnodes to a <code>uint64</code>; keep a sorted slice plus a map hash → node.</li><li>Lookup: binary-search the first vnode ≥ hash(key), wrap around.</li><li>Return N distinct physical nodes for replication.</li><li>Measure the fraction of keys that move when a node is added.</li></ul>',
          solution: 'package main\n\nimport (\n    "crypto/sha256"\n    "encoding/binary"\n    "fmt"\n    "slices"\n    "strconv"\n)\n\ntype Ring struct {\n    vnodes int\n    hashes []uint64          // sorted vnode positions\n    owner  map[uint64]string // vnode position -> physical node\n}\n\nfunc NewRing(vnodes int) *Ring {\n    return &Ring{vnodes: vnodes, owner: make(map[uint64]string)}\n}\n\n// hash must be stable across processes (unlike hash/maphash).\nfunc hash(s string) uint64 {\n    sum := sha256.Sum256([]byte(s))\n    return binary.BigEndian.Uint64(sum[:8])\n}\n\nfunc (r *Ring) Add(node string) {\n    for i := 0; i < r.vnodes; i++ {\n        h := hash(node + "#" + strconv.Itoa(i))\n        r.owner[h] = node\n        r.hashes = append(r.hashes, h)\n    }\n    slices.Sort(r.hashes)\n}\n\nfunc (r *Ring) Remove(node string) {\n    r.hashes = slices.DeleteFunc(r.hashes, func(h uint64) bool { return r.owner[h] == node })\n    for i := 0; i < r.vnodes; i++ {\n        delete(r.owner, hash(node+"#"+strconv.Itoa(i)))\n    }\n}\n\n// Get returns up to n distinct physical nodes clockwise from the key.\nfunc (r *Ring) Get(key string, n int) []string {\n    if len(r.hashes) == 0 {\n        return nil\n    }\n    i, _ := slices.BinarySearch(r.hashes, hash(key))\n    out := make([]string, 0, n)\n    seen := make(map[string]bool)\n    for j := 0; j < len(r.hashes) && len(out) < n; j++ {\n        node := r.owner[r.hashes[(i+j)%len(r.hashes)]]\n        if !seen[node] {\n            seen[node] = true\n            out = append(out, node)\n        }\n    }\n    return out\n}\n\nfunc main() {\n    r := NewRing(256)\n    for _, n := range []string{"node-a", "node-b", "node-c", "node-d"} {\n        r.Add(n)\n    }\n    const keys = 100000\n    before := make([]string, keys)\n    load := map[string]int{}\n    for k := 0; k < keys; k++ {\n        before[k] = r.Get("key-"+strconv.Itoa(k), 1)[0]\n        load[before[k]]++\n    }\n    fmt.Println("load with 4 nodes:", load)\n\n    r.Add("node-e")\n    moved := 0\n    for k := 0; k < keys; k++ {\n        if r.Get("key-"+strconv.Itoa(k), 1)[0] != before[k] {\n            moved++\n        }\n    }\n    fmt.Printf("moved after adding node-e: %.1f%% (ideal 20%%)\\n", 100*float64(moved)/keys)\n    fmt.Println("replicas for user:42 ->", r.Get("user:42", 3))\n}\n\n// Extensions: weight vnodes by capacity, place replicas in distinct racks/AZs,\n// guard with sync.RWMutex for concurrent use, compare with rendezvous hashing.',
          lang: 'go'
        },
        {
          t: 'Trace an HDFS write and a NameNode failover',
          d: 'medium', type: 'concept',
          hint: '<ul><li>Client → NameNode (create, addBlock) → DataNode pipeline → acks.</li><li>Where are the 3 replicas placed with rack awareness?</li><li>What happens if a DataNode in the pipeline fails mid-write?</li><li>How do JournalNodes, ZooKeeper and fencing make NameNode failover safe?</li></ul>',
          solution: 'Write:\n1) Client calls create() on the NameNode: permission checks, namespace entry logged to the edit log.\n2) For each 128 MB block, addBlock() returns a pipeline of 3 DataNodes: replica 1 on the writer\'s node (or a random node), replicas 2 and 3 on two different nodes of another rack.\n3) The client streams 64 KB packets to DN1, which forwards to DN2, which forwards to DN3; acks flow back along the pipeline. Each chunk carries CRC32C checksums.\n4) DataNode failure mid-write: the pipeline is rebuilt from the remaining nodes with a new generation stamp; the NameNode later re-replicates to restore 3 copies.\n5) close(): the NameNode completes the file once the minimum replicas are reported.\nFailover: the active NameNode writes edits to a quorum of JournalNodes (QJM, e.g. 3 or 5); the standby tails them so its namespace is hot. ZKFC monitors health via ZooKeeper; on failure the standby is elected, the old active is fenced (JournalNodes accept writes only from the newest epoch), and the standby becomes active after replaying remaining edits. DataNodes report blocks to both NameNodes, so the block map is already warm.'
        },
        {
          t: 'Map an object to its placement group and OSDs in Ceph',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>Use a test cluster (cephadm, MicroCeph or Rook on kind/minikube).</li><li><code>ceph osd map &lt;pool&gt; &lt;object&gt;</code> shows PG, up and acting sets.</li><li>Stop one OSD and watch PG states (degraded, remapped, backfilling).</li><li>Inspect the CRUSH hierarchy and rule.</li></ul>',
          solution: 'rados -p demo put obj1 /etc/hosts\nceph osd map demo obj1\n#  osdmap e57 pool \'demo\' (3) object \'obj1\' -> pg 3.d3f5c0b2 (3.12) -> up ([4,0,7], p4) acting ([4,0,7], p4)\nceph osd tree                       # confirm osd.4, osd.0, osd.7 are on different hosts (failure domain)\nceph osd crush rule dump replicated_rule\n\n# Simulate failure of the primary\nsudo systemctl stop ceph-osd@4      # (cephadm: ceph orch daemon stop osd.4)\nceph -s                             # PGs active+undersized+degraded\nceph osd map demo obj1              # acting set changes; a new primary is chosen\n# After mon_osd_down_out_interval (default 10 min) the OSD is marked out\n# and CRUSH remaps the PG to another host -> backfill restores 3 copies.\nceph pg 3.12 query | head -50       # peering and recovery state\nsudo systemctl start ceph-osd@4'
        },
        {
          t: 'Debug a hot partition in a distributed database',
          d: 'medium', type: 'debug',
          hint: '<ul><li>Symptoms: throttling or high latency on some requests while total utilisation is low.</li><li>Find the hot key(s): DynamoDB Contributor Insights, Cassandra <code>nodetool toppartitions</code>, S3 503 SlowDown by prefix.</li><li>Distinguish hot key (one item) from hot partition (key range).</li><li>Fix with key design, caching, write sharding or splitting.</li></ul>',
          solution: 'DynamoDB example: table provisioned at 40K WCU but ProvisionedThroughputExceeded errors at 5K WCU.\n- Each physical partition is limited to ~1,000 WCU / 3,000 RCU; adaptive capacity helps but a single partition key cannot exceed those limits.\n- CloudWatch Contributor Insights shows partition key "status#PENDING" receiving 60% of writes.\nFixes:\n- Write sharding: "status#PENDING#" + rand(0..N), query all N shards in parallel when reading.\n- Choose a high-cardinality key (order_id) and use a GSI with sharded keys for status queries.\n- Read-hot keys: DAX/ElastiCache, or replicate hot items under several keys.\nCassandra: nodetool toppartitions <ks> <table> 10000 and nodetool tablestats (max partition size); large partitions (>100 MB) -> add a time bucket to the partition key.\nS3: 503 SlowDown on one prefix -> spread keys across more prefixes, exponential backoff with jitter; S3 auto-partitions over time.\nGeneral: monitor per-partition metrics, not just cluster averages.'
        },
        {
          t: 'Explain why W + R > N quorums are not linearizable',
          d: 'hard', type: 'concept',
          hint: '<ul><li>Construct a timeline with a concurrent write and two sequential reads.</li><li>Consider partially failed writes and sloppy quorums.</li><li>What do last-write-wins timestamps do under clock skew?</li><li>What extra protocol (ABD read write-back, consensus) fixes it?</li></ul>',
          solution: 'N=3, W=2, R=2. Writer sets x=2 (old x=1). The write reaches replica A, still in flight to B and C.\n- Reader 1 queries A,B -> sees 2 (newest wins) and returns 2.\n- Reader 2 then queries B,C -> sees only 1 and returns 1.\nReader 2 started after Reader 1 finished but saw an older value -> violates linearizability, even though W + R > N.\nOther problems:\n- A write that reached only 1 replica returns failure to the client but is not rolled back; later reads may return it.\n- Sloppy quorums/hinted handoff write to substitute nodes, so the read and write sets may not overlap.\n- LWW by wall-clock timestamp: a node with a fast clock makes its write "win" forever; concurrent writes are silently discarded.\nFixes: readers write back the newest value to a quorum before returning (ABD algorithm) - gives linearizable reads/writes for registers; for read-modify-write or multi-key operations use consensus (Paxos/Raft, Cassandra LWT, DynamoDB conditional writes/transactions). Use vector clocks or CRDTs when accepting concurrent writes is desired.'
        },
        {
          t: 'Design an S3-like object store',
          d: 'hard', type: 'design',
          hint: '<ul><li>Requirements: PUT/GET/DELETE/LIST, versioning, strong read-after-write, 11 nines durability, 99.99% availability, exabyte scale, objects from bytes to TBs.</li><li>Components: API front end, metadata/index, placement, storage nodes, background services.</li><li>Durability: erasure coding across 3 AZs, checksums, scrubbing, repair.</li><li>Scale: partitioned index with splits, small-object packing, multipart, rate limiting.</li></ul>',
          solution: 'API layer: stateless HTTP servers; SigV4-style auth, bucket policies, throttling per prefix/account, request checksums; multipart endpoints.\nMetadata/index: key = (bucket, object key, version id) -> {locator list, size, ETag, checksum, storage class, timestamps}. Range-partitioned by bucket+key; each partition replicated with Raft/Paxos across 3 AZs; partitions split by size and by request rate (like S3 prefix scaling). This gives strongly consistent GET-after-PUT and LIST. Bucket metadata in a separate small, strongly consistent store.\nData plane: storage nodes with large HDDs; objects written into append-only extents (e.g. 1 GB). Large objects: chunk into e.g. 64 MB segments, each erasure-coded RS(6,3) with 3 fragments per AZ (survives an AZ loss + more). Small objects (< 1 MB): packed into shared extents, replicated initially, EC later.\nPUT: front end streams data -> placement picks nodes per AZ -> fragments written + checksummed -> after enough fragments are durable, commit index entry (the visibility point) -> 200 with ETag. Concurrent PUTs: last committed wins; conditional headers checked atomically at commit.\nGET: index lookup -> read k data fragments in parallel (hedge requests to cut tail latency) -> verify checksums -> stream; range reads map to fragment offsets.\nDELETE: write delete marker / remove version in index; GC reclaims extent space asynchronously (compaction of extents).\nBackground: repair service (prioritise objects with fewest remaining fragments), scrubber, GC/compaction, lifecycle transitions (EC to colder media/tape), cross-region replication via an event stream from the index, metering/billing.\nDurability math: RS(6,3) across AZs + fast repair + checksums -> > 11 nines (modelled); availability via stateless front ends, multi-AZ index quorums, degraded reads.\nCapacity: 1 EB raw at 1.5x overhead; ~30K HDDs of 20 TB per 600 PB; plan rebalancing and failure-domain-aware placement.'
        },
        {
          t: 'Plan rebalancing after adding 20% capacity to a 2 PB cluster',
          d: 'hard', type: 'design',
          hint: '<ul><li>How much data must move for even utilisation? (new share of capacity)</li><li>Estimate duration at a throttled rebalance bandwidth.</li><li>Order of operations to avoid moving data twice.</li><li>Protect client latency and keep repair higher priority than balancing.</li></ul>',
          solution: 'Data to move: new nodes should hold 0.4 / 2.4 of total capacity at equal utilisation. If the cluster stores 1.6 PB (80% full), the new nodes should end up with 1.6 x (0.4/2.4) ~ 267 TB. Cross-AZ/EC re-encoding may add overhead.\nDuration: throttled to 4 GB/s cluster-wide -> 267e12 / 4e9 ~ 67,000 s ~ 18.5 hours; at 1 GB/s ~ 3 days -> decide based on how full the cluster is.\nProcedure (Ceph-style, similar elsewhere):\n1) Set norebalance/nobackfill flags, add all new OSDs/nodes first so data moves only once.\n2) Optionally bring CRUSH weights up in steps (25%, 50%, 100%) to limit simultaneous movement.\n3) Unset flags; limit concurrency (osd_max_backfills, recovery sleep / HDFS balancer bandwidth / Cassandra stream throughput).\n4) Keep recovery (lost redundancy) at higher priority than rebalancing; pause rebalancing if a failure occurs.\n5) Watch client p99 latency, nearfull/backfillfull ratios (do not let any OSD exceed ~85%), network saturation between racks/AZs.\n6) Run off-peak, verify balance (ceph osd df, balancer in upmap mode) and finish with a scrub.\nLesson: add capacity before the cluster is > 75-80% full - rebalancing a nearly full cluster risks running OSDs out of space mid-move.'
        },
        {
          t: 'Design tiered storage for a Kafka cluster retaining 90 days of events',
          d: 'medium',
          type: 'design',
          hint: '<ul><li>Inputs: 200 MB/s produce, replication factor 3, 90-day retention; consumers are mostly real time, plus a few replay jobs per week.</li><li>Compute broker disk with and without tiering.</li><li>Pick local retention, segment size and a cache for remote reads.</li><li>Cover cost (storage, requests, cross-AZ), failure handling and what cannot be tiered.</li></ul>',
          solution: 'Without tiering: 200 MB/s x 86,400 s = 17.3 TB/day; x 90 days = 1.56 PB; x RF 3 = ~4.7 PB of broker disk plus headroom. Replacing one broker copies tens of TB.\n\nWith tiering (local.retention.ms = 1 day): local = 17.3 TB x 3 = ~52 TB, ~78 TB with 50% headroom -> e.g. 12 brokers x 6.5 TB.\nRemote: 1.56 PB stored once in S3 (the object store provides durability, no RF 3). Keep it in Standard, or lifecycle to Standard-IA after 30 days only if replays are rare (retrieval fees during replays).\nRequests: segment.bytes = 512 MB -> ~34K segment uploads/day plus index files: negligible PUT cost. Avoid tiny time-rolled segments on low-volume partitions.\nReads: real-time consumers hit the local tail and page cache. Replay jobs read remote segments sequentially; size remote fetch threads and the local cache, and apply client quotas so replays do not starve producers.\nFailure handling: uploads retry; a segment is deleted locally only after upload and metadata publication succeed; the broker deletes remote segments at retention (do not add an S3 expiration rule that could delete still-referenced data). Alert on remote copy lag and upload errors.\nNot tiered: compacted topics (changelogs, offsets-like state) stay local; keep them small.\nCross-AZ: hot-tail replication traffic remains; if that bill dominates, use follower fetching for consumers or a diskless design for cost-sensitive topics.'
        }
      ],
      interviewFocus: [
        {
          q: 'Design an S3-like object store: what are the core components and where does consistency come from?',
          a: '<ul><li><strong>Stateless API front ends</strong> (auth, throttling, checksums, multipart orchestration).</li>' +
            '<li><strong>Metadata/index service</strong>: (bucket, key, version) → locators. Range-partitioned, each partition a Raft/Paxos group across AZs; partitions split by size and request rate. Committing the index entry is the linearization point → strong read-after-write and consistent LIST.</li>' +
            '<li><strong>Placement</strong>: capacity- and failure-domain-aware choice of storage nodes.</li>' +
            '<li><strong>Storage nodes</strong>: append-only extents; erasure coding across 3 AZs (e.g. RS 6+3 laid out 3/3/3) and per-fragment checksums.</li>' +
            '<li><strong>Background services</strong>: repair (most-at-risk first), scrubbing, GC/extent compaction, lifecycle tiering, cross-region replication, metering.</li></ul>' +
            '<p>Walk the PUT and GET paths, then failure cases (disk, node, AZ, index partition leader) and scaling issues (hot prefixes, small objects, huge objects via multipart).</p>'
        },
        {
          q: 'Explain quorum reads and writes, and their limits.',
          a: '<p>N replicas; writes wait for W acks; reads ask R replicas; <code>W + R &gt; N</code> guarantees overlap so the newest acknowledged version is seen (pick by version/timestamp). Typical N=3, W=2, R=2 tolerates one replica down.</p>' +
            '<ul><li>Supporting mechanisms: read repair, Merkle-tree anti-entropy, hinted handoff.</li>' +
            '<li>Not linearizable by itself: in-flight writes can be seen then un-seen; failed partial writes persist; sloppy quorums break overlap; LWW with skewed clocks loses writes.</li>' +
            '<li>Fixes: ABD-style read write-back, or consensus/LWT for compare-and-set; CRDTs or vector clocks to merge concurrent updates.</li>' +
            '<li>Multi-region: <code>LOCAL_QUORUM</code> for latency with per-DC failure tolerance.</li></ul>'
        },
        {
          q: 'Consistent hashing vs range partitioning: what are the trade-offs?',
          a: '<table><thead><tr><th></th><th>Hash / consistent hashing</th><th>Range partitioning</th></tr></thead><tbody>' +
            '<tr><td>Load distribution</td><td>even by construction (with vnodes)</td><td>depends on key distribution; needs splitting</td></tr>' +
            '<tr><td>Range scans</td><td>scatter-gather to all partitions</td><td>efficient, contiguous</td></tr>' +
            '<tr><td>Hot spots</td><td>single hot key still hot</td><td>sequential keys hammer the last range</td></tr>' +
            '<tr><td>Rebalancing</td><td>add node → ~1/N keys move</td><td>split/merge and move ranges dynamically</td></tr>' +
            '<tr><td>Metadata</td><td>small (ring tokens)</td><td>range map / directory service needed</td></tr>' +
            '<tr><td>Examples</td><td>Dynamo, Cassandra, Riak, memcached clients</td><td>Bigtable/HBase, Spanner, CockroachDB, TiKV, S3 index</td></tr>' +
            '</tbody></table>' +
            '<p>Hybrid: hash a prefix (tenant or bucket) and range within it, or use many fixed partitions (Ceph PGs, Kafka) moved as units.</p>'
        },
        {
          q: 'How does Ceph place data without a central metadata lookup, and how does that compare to HDFS?',
          a: '<p>Ceph clients fetch the small cluster map from the monitors, hash the object name to a placement group, and run <strong>CRUSH</strong> to compute the ordered OSD list honouring failure domains and weights. No per-object lookup service is involved; the primary OSD coordinates replication and the OSDs peer and recover autonomously when the map changes.</p>' +
            '<p>HDFS keeps an explicit block → DataNode map in the NameNode\'s memory: simple and flexible placement, but the NameNode is a scalability limit (heap per file/block, small-files problem) and needs an HA setup. Ceph scales metadata for placement implicitly, though CephFS still needs MDS daemons for its POSIX namespace and S3 via RGW keeps bucket indexes in RADOS objects (which can become hot for huge buckets — hence index sharding).</p>'
        },
        {
          q: 'Synchronous, asynchronous, consensus and chain replication: how do you choose?',
          a: '<ul><li><strong>Async</strong>: lowest latency, RPO &gt; 0 on failover — fine for read replicas and cross-region DR copies.</li>' +
            '<li><strong>Sync / semi-sync</strong>: RPO 0 for single failures, but commit latency includes the replica round trip and availability depends on the replica (use quorum-sync with ≥2 candidates).</li>' +
            '<li><strong>Consensus (Raft/Paxos)</strong>: majority acknowledgement, automatic and safe leader election, linearizable — default for metadata and modern distributed SQL (2f+1 nodes for f failures).</li>' +
            '<li><strong>Chain</strong>: strong consistency with high throughput for bulk data; failure handling delegated to a consensus-backed configuration service.</li></ul>' +
            '<p>Tie it to requirements: RPO, write latency budget, read scaling, cross-AZ vs cross-region latency (sync across regions adds tens of ms per commit).</p>'
        }
      ],
      quiz: [
        { q: 'Quorum overlap condition?', a: 'W + R > N, so every read set intersects every acknowledged write set.' },
        { q: 'Fraction of keys moved when going from 4 to 5 nodes with consistent hashing?', a: 'About 1/5 (20%), all moving to the new node; with mod-N about 80% move.' },
        { q: 'Why use virtual nodes?', a: 'To even out load, weight heterogeneous nodes, and spread a failed or new node\'s data movement across many peers.' },
        { q: 'In chain replication, which node serves reads?', a: 'The tail, because it holds only updates applied by every replica (CRAQ also allows clean reads from other nodes).' },
        { q: 'Default HDFS block size and replication?', a: '128 MB blocks with replication factor 3 (rack-aware placement).' },
        { q: 'What does CRUSH compute?', a: 'The ordered list of OSDs for a placement group, deterministically from the cluster map and placement rules, honouring failure domains and weights.' },
        { q: 'What is a fencing token?', a: 'A monotonically increasing epoch attached to a leader\'s requests so storage rejects writes from a deposed leader, preventing split-brain corruption.' },
        {
          q: 'Why does tiered storage suit Kafka and LSM-based systems?',
          a: 'They produce immutable files (log segments, SSTables), so closed files can be copied to object storage and tracked in metadata without in-place updates; only the hot tail stays on replicated local disks.'
        }
      ],
      resources: [
        { title: 'Ceph Architecture', url: 'https://docs.ceph.com/en/latest/architecture/', type: 'docs' },
        { title: 'HDFS Architecture Guide', url: 'https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html', type: 'docs' },
        { title: 'Dynamo: Amazon\'s Highly Available Key-value Store (SOSP 2007)', url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', type: 'article' },
        { title: 'The Google File System (SOSP 2003)', url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp2003.pdf', type: 'article' },
        {
          title: 'KIP-405: Kafka Tiered Storage',
          url: 'https://cwiki.apache.org/confluence/display/KAFKA/KIP-405%3A+Kafka+Tiered+Storage',
          type: 'article'
        }
      ]
    },
    // ───────────────────────────── Module 7 ─────────────────────────────
    {
      n: 7,
      title: 'Cloud & Kubernetes Storage',
      summary: 'The storage services you will actually use — AWS EBS, EFS, S3, FSx and Azure Managed Disks, Files and Blob — and how Kubernetes consumes them through PersistentVolumes, StorageClasses, CSI drivers, StatefulSets and VolumeSnapshots, including the zonal pitfalls and the trade-offs of running databases on Kubernetes.',
      topics: [
        {
          title: 'AWS Block and File: EBS Volume Types, EFS and FSx',
          def: '<table><thead><tr><th>EBS type</th><th>Media</th><th>Performance model</th><th>Use for</th></tr></thead><tbody>' +
            '<tr><td><strong>gp3</strong></td><td>SSD</td><td>baseline 3,000 IOPS and 125 MiB/s at any size; IOPS and throughput provisioned independently of capacity (since late 2025 up to 64 TiB, 80,000 IOPS and 2,000 MiB/s per volume; previously 16 TiB, 16,000 IOPS and 1,000 MiB/s)</td><td>default for almost everything: boot, most databases</td></tr>' +
            '<tr><td>gp2 (legacy)</td><td>SSD</td><td>3 IOPS/GiB with burst credits</td><td>migrate to gp3 (cheaper, no credits)</td></tr>' +
            '<tr><td><strong>io2 Block Express</strong></td><td>SSD</td><td>provisioned IOPS up to 256,000 and 4,000 MiB/s, sub-ms latency, 99.999% durability, Multi-Attach</td><td>critical, latency-sensitive databases</td></tr>' +
            '<tr><td>st1 / sc1</td><td>HDD</td><td>throughput-oriented with burst credits</td><td>big sequential: logs, data warehouses / cold data</td></tr>' +
            '<tr><td>Instance store</td><td>local NVMe</td><td>millions of IOPS, µs latency, <em>ephemeral</em> (lost on stop/terminate)</td><td>caches, scratch, replicated databases (Cassandra, Kafka)</td></tr>' +
            '</tbody></table>' +
            '<ul><li>EBS volumes live in <strong>one AZ</strong> and attach to instances in that AZ. Durability is per volume (gp3 AFR 0.1–0.2%), so you still need snapshots.</li>' +
            '<li><strong>Snapshots</strong> are incremental, stored in S3 (regional), copyable across regions/accounts. Restored volumes load lazily — use Fast Snapshot Restore or pre-warm for latency-critical restores.</li>' +
            '<li><strong>Elastic Volumes</strong>: grow size or change type/IOPS/throughput online (then grow the file system). Modifications are rate-limited per volume (a cooldown between changes; check the current limit), and size can never shrink — plan changes instead of toggling them.</li>' +
            '<li>Instance limits: each instance type has a maximum EBS bandwidth/IOPS — a big volume on a small instance is capped.</li></ul>' +
            '<p><strong>EFS</strong>: managed NFSv4.1, Regional (multi-AZ) or One Zone, elastic capacity; throughput modes Elastic (recommended default), Provisioned, Bursting; storage classes Standard, Infrequent Access, Archive with lifecycle. <strong>FSx</strong>: for Lustre (HPC/ML, linked to S3), Windows File Server (SMB + AD), NetApp ONTAP (multi-protocol, snapshots, SnapMirror), OpenZFS.</p>',
          interview: 'Default to gp3 and explain why (performance decoupled from size, no burst credits); reach for io2 Block Express when you need guaranteed sub-millisecond latency or very high IOPS; mention instance limits and that EBS is zonal. For shared POSIX choose EFS, or FSx when you need Lustre/SMB/ONTAP features.',
          examples: [
            { label: 'Modify a live EBS volume and grow the file system', lang: 'bash', code: '# Raise performance and size without detaching\naws ec2 modify-volume --volume-id vol-0abc123 --volume-type gp3 --size 500 --iops 12000 --throughput 500\naws ec2 describe-volumes-modifications --volume-ids vol-0abc123 \\\n  --query "VolumesModifications[0].[ModificationState,Progress]"\n\n# Inside the instance: grow partition (if any) and file system\nsudo growpart /dev/nvme1n1 1   # only if partitioned\nsudo xfs_growfs /data          # XFS  (ext4: sudo resize2fs /dev/nvme1n1)\n\n# Incremental snapshot, copied to another region for DR\naws ec2 create-snapshot --volume-id vol-0abc123 --description "pg-data nightly"\naws ec2 copy-snapshot --source-region eu-west-1 --source-snapshot-id snap-0123 --region eu-central-1' }
          ]
        },
        {
          title: 'S3 Storage Classes and Lifecycle Policies',
          def: '<table><thead><tr><th>Class</th><th>AZs</th><th>Retrieval</th><th>Min duration</th><th>Typical use</th></tr></thead><tbody>' +
            '<tr><td>S3 Express One Zone</td><td>1 (directory buckets)</td><td>single-digit ms</td><td>—</td><td>latency-critical, ML/analytics scratch, co-located compute</td></tr>' +
            '<tr><td>S3 Standard</td><td>≥3</td><td>ms</td><td>—</td><td>hot data</td></tr>' +
            '<tr><td>S3 Intelligent-Tiering</td><td>≥3</td><td>ms (optional archive tiers: hours)</td><td>—</td><td>unknown/changing access; small monitoring fee per object; objects &lt;128 KB stay in the frequent tier</td></tr>' +
            '<tr><td>S3 Standard-IA</td><td>≥3</td><td>ms + per-GB retrieval fee</td><td>30 days</td><td>backups, older data read monthly</td></tr>' +
            '<tr><td>S3 One Zone-IA</td><td>1</td><td>ms + retrieval fee</td><td>30 days</td><td>re-creatable copies</td></tr>' +
            '<tr><td>Glacier Instant Retrieval</td><td>≥3</td><td>ms + higher retrieval fee</td><td>90 days</td><td>quarterly access, medical images, old media</td></tr>' +
            '<tr><td>Glacier Flexible Retrieval</td><td>≥3</td><td>minutes (expedited) to 5–12 h (bulk)</td><td>90 days</td><td>archives, DR copies</td></tr>' +
            '<tr><td>Glacier Deep Archive</td><td>≥3</td><td>12 h (standard) – 48 h (bulk)</td><td>180 days</td><td>compliance retention for years</td></tr>' +
            '</tbody></table>' +
            '<p>IA and Glacier Instant classes bill a minimum of 128 KB per object; archive classes add per-object metadata overhead. <strong>Lifecycle rules</strong> automate cost management per prefix or tag:</p>' +
            '<ul><li><strong>Transitions</strong> (e.g. Standard → Standard-IA at 30 days → Glacier Instant at 90 → Deep Archive at 365).</li>' +
            '<li><strong>Expiration</strong> of current versions; <strong>NoncurrentVersionExpiration</strong> to stop versioning from growing forever.</li>' +
            '<li><strong>AbortIncompleteMultipartUpload</strong> to clean up stray parts.</li>' +
            '<li>By default lifecycle does not transition objects smaller than 128 KB; small-object datasets should be packed first.</li></ul>' +
            '<p>Other key features: versioning, replication (CRR/SRR, with Replication Time Control), Object Lock (WORM), default encryption (SSE-S3, SSE-KMS), Block Public Access, S3 Storage Lens for usage analysis.</p>',
          interview: 'Match class to access frequency, retrieval SLA and object size, and mention the hidden costs: retrieval fees, minimum durations (early deletion charges), per-object overhead and request costs. Always add lifecycle rules for noncurrent versions and incomplete multipart uploads — interviewers love that operational detail.',
          examples: [
            { label: 'Lifecycle policy for versioned log data', lang: 'bash', code: 'cat > lifecycle.json <<\'EOF\'\n{\n  "Rules": [\n    {\n      "ID": "logs-tiering",\n      "Status": "Enabled",\n      "Filter": { "Prefix": "logs/" },\n      "Transitions": [\n        { "Days": 30,  "StorageClass": "STANDARD_IA" },\n        { "Days": 90,  "StorageClass": "GLACIER_IR" },\n        { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }\n      ],\n      "Expiration": { "Days": 2555 },\n      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },\n      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }\n    }\n  ]\n}\nEOF\naws s3api put-bucket-lifecycle-configuration --bucket acme-logs --lifecycle-configuration file://lifecycle.json\naws s3api get-bucket-lifecycle-configuration --bucket acme-logs' }
          ]
        },
        {
          title: 'Azure Storage: Managed Disks, Azure Files and Blob Tiers',
          def: '<table><thead><tr><th>Managed disk</th><th>Performance</th><th>Notes</th></tr></thead><tbody>' +
            '<tr><td>Standard HDD</td><td>low, variable</td><td>dev/test, backups</td></tr>' +
            '<tr><td>Standard SSD</td><td>moderate</td><td>web servers, light workloads</td></tr>' +
            '<tr><td>Premium SSD</td><td>fixed per size tier (P10, P30…), bursting</td><td>production; supports LRS and ZRS; usable as OS disk</td></tr>' +
            '<tr><td><strong>Premium SSD v2</strong></td><td>baseline 3,000 IOPS / 125 MB/s; IOPS, throughput and size set independently (up to 80,000 IOPS, 1,200 MB/s)</td><td>best price/performance for databases; data disks only, zonal</td></tr>' +
            '<tr><td>Ultra Disk</td><td>up to 400,000 IOPS and 10,000 MB/s, sub-ms</td><td>top-tier databases (SAP HANA, heavy OLTP)</td></tr>' +
            '</tbody></table>' +
            '<p><strong>Redundancy options</strong> (storage accounts): <strong>LRS</strong> (3 copies in one datacenter), <strong>ZRS</strong> (3 AZs), <strong>GRS / RA-GRS</strong> (LRS + async copy to the paired region, optional read access), <strong>GZRS / RA-GZRS</strong> (ZRS + paired region). Managed disks offer LRS or ZRS.</p>' +
            '<p><strong>Azure Files</strong>: managed SMB 3.x and NFSv4.1 shares; Standard (HDD) and Premium (SSD) with provisioned performance; Azure File Sync caches shares on Windows servers. <strong>Azure NetApp Files</strong> for high-performance NFS/SMB.</p>' +
            '<p><strong>Blob Storage</strong>: block blobs (general objects), append blobs (logs), page blobs (random-access, backing for disks). <strong>Access tiers</strong>: Hot, Cool (30-day minimum), Cold (90-day), Archive (180-day, offline — must be <strong>rehydrated</strong>, up to 15 h at standard priority or typically under 1 h at high priority for small blobs). <strong>Lifecycle management policies</strong> move blobs between tiers or delete them by age, last access or tags. <strong>ADLS Gen2</strong> = Blob + hierarchical namespace (atomic directory renames, POSIX ACLs) for analytics.</p>',
          interview: 'Map AWS to Azure fluently: EBS gp3 ≈ Premium SSD v2, io2 ≈ Ultra Disk, EFS ≈ Azure Files (NFS), S3 classes ≈ Blob Hot/Cool/Cold/Archive, S3 CRR ≈ GRS. Know the redundancy acronyms and that Archive-tier blobs are offline until rehydrated.',
          examples: [
            { label: 'Azure: disks, file shares and blob lifecycle', lang: 'bash', code: '# Premium SSD v2 data disk with independent IOPS/throughput (zonal)\naz disk create -g rg-db -n pgdata --zone 1 --sku PremiumV2_LRS --size-gb 512 \\\n  --disk-iops-read-write 8000 --disk-mbps-read-write 250\n\n# Premium NFS file share (FileStorage account)\naz storage account create -g rg-app -n acmefilesprem --sku Premium_ZRS --kind FileStorage\naz storage share-rm create -g rg-app --storage-account acmefilesprem -n shared --enabled-protocols NFS --quota 1024\n\n# Blob lifecycle: cool after 30 days, archive after 180, delete after 7 years\ncat > policy.json <<\'EOF\'\n{"rules":[{"enabled":true,"name":"logs","type":"Lifecycle","definition":{\n  "filters":{"blobTypes":["blockBlob"],"prefixMatch":["logs/"]},\n  "actions":{"baseBlob":{"tierToCool":{"daysAfterModificationGreaterThan":30},\n    "tierToArchive":{"daysAfterModificationGreaterThan":180},\n    "delete":{"daysAfterModificationGreaterThan":2555}}}}}]}\nEOF\naz storage account management-policy create -g rg-app --account-name acmelogs --policy @policy.json' }
          ]
        },
        {
          title: 'Kubernetes PV, PVC, StorageClass, Access Modes and CSI',
          def: '<ul><li><strong>PersistentVolume (PV)</strong>: a cluster resource representing a real volume (EBS, Azure Disk, NFS export…).</li>' +
            '<li><strong>PersistentVolumeClaim (PVC)</strong>: a namespaced request for storage (size, access mode, class). It binds 1:1 to a PV.</li>' +
            '<li><strong>StorageClass</strong>: the template for <em>dynamic provisioning</em> — provisioner (CSI driver), parameters (type, IOPS, fsType, encryption), <code>reclaimPolicy</code> (<code>Delete</code> or <code>Retain</code>), <code>allowVolumeExpansion</code>, <code>volumeBindingMode</code>.</li></ul>' +
            '<table><thead><tr><th>Access mode</th><th>Meaning</th><th>Typical backing</th></tr></thead><tbody>' +
            '<tr><td>ReadWriteOnce (RWO)</td><td>read-write by pods on <em>one node</em></td><td>EBS, Azure Disk, Ceph RBD</td></tr>' +
            '<tr><td>ReadWriteOncePod (RWOP)</td><td>read-write by exactly <em>one pod</em> (GA in 1.29)</td><td>CSI block drivers — prevents two pods on one node sharing a DB volume</td></tr>' +
            '<tr><td>ReadOnlyMany (ROX)</td><td>read-only by many nodes</td><td>NFS, pre-populated disks</td></tr>' +
            '<tr><td>ReadWriteMany (RWX)</td><td>read-write by many nodes</td><td>EFS, Azure Files, CephFS, NFS</td></tr>' +
            '</tbody></table>' +
            '<p><strong>CSI (Container Storage Interface)</strong> moves drivers out of Kubernetes core (in-tree EBS/Azure Disk plugins have been migrated to CSI). Flow: the <em>controller plugin</em> (Deployment with sidecars external-provisioner, external-attacher, external-resizer, external-snapshotter) calls <code>CreateVolume</code> and <code>ControllerPublishVolume</code> (attach to node, tracked as a <code>VolumeAttachment</code>); the <em>node plugin</em> (DaemonSet) runs <code>NodeStageVolume</code> (format + mount to a global path) and <code>NodePublishVolume</code> (bind-mount into the pod). <code>volumeMode: Block</code> exposes a raw device instead of a file system.</p>' +
            '<p>Also: <strong>VolumeAttributesClass</strong> (GA in Kubernetes 1.34) lets you change IOPS/throughput of a bound volume declaratively; <strong>generic ephemeral volumes</strong> give per-pod scratch PVCs that die with the pod; <strong>volume populators</strong> (GA in 1.33) fill a new PVC from any custom <code>dataSourceRef</code>; <strong>recovery from a failed expansion</strong> (GA in 1.34) lets you retry a resize with a smaller size instead of being stuck; <code>fsGroupChangePolicy: OnRootMismatch</code> avoids slow recursive chown on large volumes.</p>',
          interview: 'Explain the PVC → StorageClass → CSI CreateVolume → attach → stage → publish chain and which component does each step; interviewers often ask where a stuck volume is failing. Know the access modes precisely: RWO is per node, not per pod, which is why RWOP exists.',
          examples: [
            { label: 'gp3 StorageClass and a PVC (EKS, EBS CSI driver)', lang: 'yaml', code: 'apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: gp3-xfs\n  annotations:\n    storageclass.kubernetes.io/is-default-class: "true"\nprovisioner: ebs.csi.aws.com\nparameters:\n  type: gp3\n  iops: "6000"\n  throughput: "250"\n  encrypted: "true"\n  csi.storage.k8s.io/fstype: xfs\nreclaimPolicy: Retain            # keep the disk if the PVC is deleted (databases)\nallowVolumeExpansion: true\nvolumeBindingMode: WaitForFirstConsumer\n---\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: pgdata\nspec:\n  accessModes: ["ReadWriteOncePod"]\n  storageClassName: gp3-xfs\n  resources:\n    requests:\n      storage: 200Gi' },
            { label: 'Azure Disk StorageClass (Premium SSD v2)', lang: 'yaml', code: 'apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: premium-v2\nprovisioner: disk.csi.azure.com\nparameters:\n  skuName: PremiumV2_LRS\n  DiskIOPSReadWrite: "8000"\n  DiskMBpsReadWrite: "250"\n  cachingMode: None              # required for Premium SSD v2\nreclaimPolicy: Delete\nallowVolumeExpansion: true\nvolumeBindingMode: WaitForFirstConsumer' }
          ]
        },
        {
          title: 'Zonal Disks, WaitForFirstConsumer and StatefulSet Storage',
          def: '<p>Block volumes are <strong>zonal</strong>: an EBS volume in eu-west-1a can only attach to nodes in eu-west-1a. The provisioned PV carries <code>nodeAffinity</code> on <code>topology.kubernetes.io/zone</code>, which the scheduler must honour forever after.</p>' +
            '<ul><li><code>volumeBindingMode: Immediate</code> provisions as soon as the PVC exists — possibly in a zone where the pod cannot run (no capacity, taints, anti-affinity) → pod stuck Pending with <em>volume node affinity conflict</em>.</li>' +
            '<li><code>WaitForFirstConsumer</code> delays provisioning until a pod using the PVC is scheduled, so the volume is created in the zone the scheduler picked while honouring all pod constraints. Use it for every zonal storage class. <code>allowedTopologies</code> can restrict zones.</li>' +
            '<li>Consequence of zonality: if an AZ fails, pods with volumes there cannot move. Zone resilience must come from <strong>application replication</strong> (one replica per zone) or regional/ZRS storage (Azure ZRS disks, EFS Regional, Azure Files ZRS).</li>' +
            '<li>Cluster Autoscaler needs node groups per zone to scale up in the right AZ for a pinned volume (Karpenter handles topology natively).</li></ul>' +
            '<p><strong>StatefulSets</strong> give each replica a stable identity (<code>db-0</code>, <code>db-1</code>), ordered rollout, and its own PVC from <code>volumeClaimTemplates</code> (<code>data-db-0</code>…). Gotchas:</p>' +
            '<ul><li>PVCs are <strong>kept</strong> when pods or the StatefulSet are deleted — by design. <code>persistentVolumeClaimRetentionPolicy</code> (<code>whenDeleted</code>/<code>whenScaled</code>: Retain or Delete; GA in 1.32) automates cleanup.</li>' +
            '<li>You cannot change <code>volumeClaimTemplates</code> of an existing StatefulSet; to resize, patch each PVC (with <code>allowVolumeExpansion</code>), and delete/recreate the StatefulSet with <code>--cascade=orphan</code> if you want the template updated.</li>' +
            '<li>Spread replicas with <code>topologySpreadConstraints</code> on zones and protect them with a PodDisruptionBudget.</li></ul>',
          interview: 'The classic question is "why is my StatefulSet pod Pending after a node drain?" — answer with zonal PV node affinity, Immediate vs WaitForFirstConsumer, and capacity in the volume\'s AZ. Then explain that zone resilience for stateful apps comes from replicas in each zone, not from moving disks.',
          examples: [
            { label: 'StatefulSet with per-replica volumes spread across zones', lang: 'yaml', code: 'apiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: db\nspec:\n  serviceName: db\n  replicas: 3\n  selector:\n    matchLabels: { app: db }\n  persistentVolumeClaimRetentionPolicy:\n    whenDeleted: Retain\n    whenScaled: Retain\n  template:\n    metadata:\n      labels: { app: db }\n    spec:\n      topologySpreadConstraints:\n        - maxSkew: 1\n          topologyKey: topology.kubernetes.io/zone\n          whenUnsatisfiable: DoNotSchedule\n          labelSelector:\n            matchLabels: { app: db }\n      securityContext:\n        fsGroup: 999\n        fsGroupChangePolicy: OnRootMismatch\n      containers:\n        - name: db\n          image: postgres:17\n          env:\n            - name: PGDATA                 # subdirectory: ext4 volumes contain lost+found at the root\n              value: /var/lib/postgresql/data/pgdata\n          volumeMounts:\n            - name: data\n              mountPath: /var/lib/postgresql/data\n  volumeClaimTemplates:\n    - metadata:\n        name: data\n      spec:\n        accessModes: ["ReadWriteOnce"]\n        storageClassName: gp3-xfs\n        resources:\n          requests:\n            storage: 100Gi' }
          ]
        },
        {
          title: 'Volume Snapshots and Running Databases on Kubernetes',
          def: '<p><strong>CSI snapshots</strong> (GA since 1.20) use three objects mirroring PV/PVC/StorageClass: <code>VolumeSnapshotClass</code> (driver, deletionPolicy), <code>VolumeSnapshot</code> (namespaced request) and <code>VolumeSnapshotContent</code> (the real EBS/Azure snapshot). Restore by creating a PVC whose <code>dataSource</code> is the snapshot; clone by using another PVC as <code>dataSource</code>. Requires the snapshot CRDs and snapshot-controller in the cluster. Snapshots are <strong>crash-consistent</strong>; for application consistency, quiesce (fsfreeze, pre-hooks in Velero) or rely on the database\'s WAL recovery. <code>VolumeGroupSnapshot</code> (beta since 1.32, driver support still limited) snapshots several volumes — e.g. data and WAL — at one crash-consistent point in time.</p>' +
            '<p><strong>Running databases on Kubernetes</strong>:</p>' +
            '<table><thead><tr><th></th><th>Operator on Kubernetes (CloudNativePG, Percona, Strimzi, Vitess)</th><th>Managed service (RDS/Aurora, Azure Database, Cloud SQL)</th></tr></thead><tbody>' +
            '<tr><td>Control</td><td>full: versions, extensions, tuning, placement</td><td>limited to exposed parameters</td></tr>' +
            '<tr><td>Ops burden</td><td>you own upgrades, backups, failover testing, storage, on-call</td><td>provider handles patching, backups, HA</td></tr>' +
            '<tr><td>Portability / cost</td><td>same stack everywhere, no managed premium, dense packing</td><td>cloud-specific, premium pricing</td></tr>' +
            '<tr><td>Performance</td><td>can use local NVMe with replication</td><td>tuned storage (Aurora shared storage, io2)</td></tr>' +
            '</tbody></table>' +
            '<p>If you run them on Kubernetes: use a mature <strong>operator</strong>, one replica per zone with anti-affinity, PodDisruptionBudgets, Guaranteed QoS (requests = limits for memory), dedicated node pools, <code>Retain</code> reclaim policy, generous <code>terminationGracePeriodSeconds</code>, backups to object storage with WAL archiving (not only volume snapshots), and regular restore drills. Local NVMe (local PVs, TopoLVM, OpenEBS LVM) gives the best latency but data dies with the node, so it requires replication and automated rebuilds.</p>',
          interview: 'Give a balanced answer: Kubernetes is a fine platform for databases when you have operator maturity and platform skills; otherwise a managed service is cheaper in people-time. Show you know the storage specifics: zonal volumes, snapshot consistency, reclaim policy, PDBs, local NVMe trade-offs and backup to object storage.',
          examples: [
            { label: 'Snapshot a PVC and restore it into a new PVC', lang: 'yaml', code: 'apiVersion: snapshot.storage.k8s.io/v1\nkind: VolumeSnapshotClass\nmetadata:\n  name: ebs-snap\ndriver: ebs.csi.aws.com\ndeletionPolicy: Retain\n---\napiVersion: snapshot.storage.k8s.io/v1\nkind: VolumeSnapshot\nmetadata:\n  name: pgdata-2025-10-29\nspec:\n  volumeSnapshotClassName: ebs-snap\n  source:\n    persistentVolumeClaimName: pgdata\n---\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: pgdata-restored\nspec:\n  storageClassName: gp3-xfs\n  accessModes: ["ReadWriteOnce"]\n  dataSource:\n    apiGroup: snapshot.storage.k8s.io\n    kind: VolumeSnapshot\n    name: pgdata-2025-10-29\n  resources:\n    requests:\n      storage: 200Gi          # >= snapshot size' },
            { label: 'Inspect storage objects', lang: 'bash', code: 'kubectl get storageclass,pvc,pv -A\nkubectl get volumeattachments\nkubectl get volumesnapshot,volumesnapshotcontent -A\nkubectl describe pvc pgdata                 # events: provisioning, resizing\nkubectl get pv <pv-name> -o jsonpath="{.spec.nodeAffinity}"   # which zone the volume lives in\nkubectl get csidrivers' }
          ]
        }
      ],
      problems: [
        {
          t: 'Choose a cloud volume type for four workloads',
          d: 'easy', type: 'concept',
          hint: '<ul><li>(a) Boot volumes for a web fleet; (b) PostgreSQL needing 40K IOPS with consistent sub-ms latency; (c) 10 TB of sequential log processing; (d) Cassandra nodes with replication factor 3.</li><li>Give AWS and Azure answers.</li></ul>',
          solution: '(a) gp3 at baseline (3,000 IOPS / 125 MiB/s) | Azure Standard SSD or Premium SSD for prod.\n(b) io2 Block Express (provisioned 40K IOPS, sub-ms, 99.999% durability) or gp3 if within its limits and latency is acceptable | Azure Premium SSD v2 (set 40K IOPS) or Ultra Disk for the strictest latency.\n(c) st1 throughput-optimised HDD (or gp3 with high throughput) | Azure Standard HDD/SSD or Premium SSD v2 tuned for MB/s; consider object storage + Spark instead.\n(d) Local NVMe instance store (i4i/i7i-class instances) since Cassandra replicates across nodes/AZs; or gp3 for operational simplicity | Azure Lsv3-series local NVMe or Premium SSD v2.'
        },
        {
          t: 'Provision storage dynamically with a StorageClass and PVC',
          d: 'easy', type: 'hands-on',
          hint: '<ul><li>Apply a StorageClass with <code>WaitForFirstConsumer</code>, then a PVC — note it stays Pending.</li><li>Create a pod that mounts it; watch the PV get created in the pod\'s zone.</li><li>Inspect the PV\'s nodeAffinity and the VolumeAttachment.</li><li>Delete the PVC and observe the reclaim policy.</li></ul>',
          solution: 'kubectl apply -f storageclass.yaml -f pvc.yaml\nkubectl get pvc pgdata          # Pending: "waiting for first consumer to be created before binding"\nkubectl run writer --image=busybox --restart=Never --overrides=\'{"spec":{"volumes":[{"name":"d","persistentVolumeClaim":{"claimName":"pgdata"}}],"containers":[{"name":"c","image":"busybox","command":["sh","-c","echo hi > /d/x; sleep 3600"],"volumeMounts":[{"name":"d","mountPath":"/d"}]}]}}\'\nkubectl get pvc pgdata          # Bound\nkubectl get pv -o custom-columns=NAME:.metadata.name,ZONE:.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0]\nkubectl get volumeattachments   # attached to the pod\'s node\nkubectl delete pod writer; kubectl delete pvc pgdata\nkubectl get pv                  # Retain -> PV Released (disk kept); Delete -> PV and cloud disk removed'
        },
        {
          t: 'Write S3 lifecycle rules for a versioned log bucket',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>Requirements: hot 30 days, rarely read for a year, keep 7 years for compliance, versioning on.</li><li>Include transitions, expiration, noncurrent-version expiration and multipart cleanup.</li><li>Respect minimum durations (30/90/180 days) to avoid early-deletion fees.</li><li>Verify with <code>get-bucket-lifecycle-configuration</code> and Storage Lens/inventory.</li></ul>',
          solution: 'aws s3api put-bucket-versioning --bucket acme-logs --versioning-configuration Status=Enabled\n# Rules (see the lifecycle.json example in this module):\n#  Day 30  -> STANDARD_IA     (minimum 30 days in Standard before IA via lifecycle)\n#  Day 90  -> GLACIER_IR      (ms access for rare investigations)\n#  Day 365 -> DEEP_ARCHIVE    (180-day minimum, 12-48 h retrieval)\n#  Day 2555 (7 years) -> expire current version\n#  Noncurrent versions -> expire after 30 days (otherwise overwrites/deletes keep billing)\n#  Incomplete multipart uploads -> abort after 7 days\naws s3api put-bucket-lifecycle-configuration --bucket acme-logs --lifecycle-configuration file://lifecycle.json\nChecks: objects < 128 KB are not transitioned by default (pack logs into larger objects first); for legal retention add Object Lock rather than relying on lifecycle alone; expiring a current version in a versioned bucket only adds a delete marker - also expire noncurrent versions and expired delete markers.'
        },
        {
          t: 'Fix a pod stuck Pending with "volume node affinity conflict"',
          d: 'medium', type: 'debug',
          hint: '<ul><li>Read <code>kubectl describe pod</code> events and the PV\'s <code>nodeAffinity</code> zone.</li><li>Which nodes exist in that zone, and do they have capacity / matching taints and selectors?</li><li>Was the StorageClass using <code>Immediate</code> binding?</li><li>Options: add capacity in that zone, relax constraints, or snapshot and restore into another zone.</li></ul>',
          solution: 'kubectl describe pod db-1    # "0/6 nodes are available: 3 node(s) had volume node affinity conflict, 3 Insufficient memory"\nkubectl get pvc data-db-1 -o jsonpath="{.spec.volumeName}"\nkubectl get pv <pv> -o jsonpath="{.spec.nodeAffinity}"     # zone eu-west-1b\nkubectl get nodes -L topology.kubernetes.io/zone           # nodes in 1b are full or were drained/removed\nRoot causes:\n- The disk is in 1b but no schedulable node with enough resources exists in 1b (node group scaled in, spot capacity gone, autoscaler node group spans zones and adds nodes elsewhere).\n- Or the StorageClass used Immediate binding and provisioned in a zone that conflicts with the pod\'s nodeSelector/affinity.\nFixes:\n- Short term: add capacity in 1b (per-zone node groups for Cluster Autoscaler, or Karpenter which respects volume topology).\n- If the zone is unusable: snapshot the volume, restore a PVC in another zone, and point the replica at it (or let the database rebuild the replica from peers).\n- Long term: WaitForFirstConsumer for all zonal classes, topology spread for replicas, PDBs, and enough headroom per zone.'
        },
        {
          t: 'Expand a PVC online and raise its IOPS',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>The StorageClass needs <code>allowVolumeExpansion: true</code>.</li><li>Patch <code>spec.resources.requests.storage</code>; watch PVC conditions (resizing, FileSystemResizePending).</li><li>For performance: VolumeAttributesClass (if your driver supports it) or a cloud-side modify.</li><li>Remember EBS rate-limits modifications of the same volume (a cooldown between changes) and volumes can only grow, never shrink.</li></ul>',
          solution: 'kubectl patch pvc pgdata -p \'{"spec":{"resources":{"requests":{"storage":"400Gi"}}}}\'\nkubectl get pvc pgdata -w\nkubectl describe pvc pgdata   # events: ExternalExpanding -> Resizing -> FileSystemResizeSuccessful\n# File system growth happens online by the CSI node plugin for ext4/xfs.\n\n# Performance change via VolumeAttributesClass (GA in Kubernetes 1.34; EBS CSI supports it)\ncat <<EOF | kubectl apply -f -\napiVersion: storage.k8s.io/v1\nkind: VolumeAttributesClass\nmetadata:\n  name: gp3-fast\ndriverName: ebs.csi.aws.com\nparameters:\n  iops: "16000"\n  throughput: "600"\nEOF\nkubectl patch pvc pgdata -p \'{"spec":{"volumeAttributesClassName":"gp3-fast"}}\'\nNotes: shrinking is not supported; StatefulSet volumeClaimTemplates must be updated separately (patch each PVC); EBS enforces a cooldown between modifications, so combine size and performance changes.'
        },
        {
          t: 'Snapshot and restore a PVC with VolumeSnapshot',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>Check that snapshot CRDs, snapshot-controller and a VolumeSnapshotClass exist.</li><li>Write test data, create a VolumeSnapshot and wait for <code>readyToUse: true</code>.</li><li>Restore into a new PVC with <code>dataSource</code> and mount it in a pod.</li><li>Discuss crash-consistency and how you would make it application-consistent.</li></ul>',
          solution: 'kubectl get crd | grep snapshot.storage.k8s.io\nkubectl get volumesnapshotclass\nkubectl exec writer -- sh -c "date > /d/marker && sync"\nkubectl apply -f volumesnapshot.yaml\nkubectl get volumesnapshot pgdata-2025-10-29 -o jsonpath="{.status.readyToUse}"   # true\nkubectl apply -f pvc-restored.yaml   # dataSource: VolumeSnapshot\nkubectl run reader --image=busybox --restart=Never --overrides=\'{"spec":{"volumes":[{"name":"d","persistentVolumeClaim":{"claimName":"pgdata-restored"}}],"containers":[{"name":"c","image":"busybox","command":["cat","/d/marker"],"volumeMounts":[{"name":"d","mountPath":"/d"}]}]}}\'\nkubectl logs reader\nConsistency: the snapshot equals the disk state at an instant (like a power cut). Databases recover via WAL replay, but for multi-volume apps or app-level consistency use pre-snapshot hooks (fsfreeze, pg_backup_start/stop, Velero hooks) or VolumeGroupSnapshot. A snapshot in the same account/region is not a full backup - copy it cross-region/account (Module 8).'
        },
        {
          t: 'Debug a PVC stuck Pending and a Multi-Attach error',
          d: 'medium', type: 'debug',
          hint: '<ul><li>PVC Pending: default StorageClass? WaitForFirstConsumer (expected)? CSI driver installed and authorised (IAM)? Access mode supported?</li><li>Multi-Attach: an RWO volume still attached to another node (rolling Deployment, dead node).</li><li>Check events, CSI controller logs and <code>VolumeAttachment</code> objects.</li></ul>',
          solution: 'PVC Pending:\n- kubectl describe pvc -> "waiting for first consumer": normal with WaitForFirstConsumer until a pod uses it.\n- "no persistent volumes available and no storage class is set": no default StorageClass; set storageClassName.\n- "failed to provision volume ... UnauthorizedOperation": EBS CSI controller lacks IAM permissions (fix EKS Pod Identity/IRSA role); check kubectl logs -n kube-system deploy/ebs-csi-controller -c csi-provisioner.\n- Requesting ReadWriteMany from a block driver (EBS/Azure Disk) -> unsupported; use EFS/Azure Files.\nMulti-Attach error ("Volume is already exclusively attached to one node"):\n- Deployment with RollingUpdate and an RWO PVC: new pod lands on another node while the old pod still holds the disk -> use strategy Recreate, or a StatefulSet.\n- Old node crashed: the attach-detach controller waits (~6 min) before force-detaching; for a confirmed dead node apply the taint node.kubernetes.io/out-of-service=nodeshutdown:NoExecute (non-graceful node shutdown) to release volumes faster.\n- kubectl get volumeattachments | grep <pv> shows which node still holds it.\nUse ReadWriteOncePod for single-writer databases to make the intent explicit.'
        },
        {
          t: 'Choose the right storage for each component of a multi-zone web platform',
          d: 'medium', type: 'design',
          hint: '<ul><li>Components: stateless API pods, user uploads, PostgreSQL, Redis cache, Kafka, shared ML model files read by many pods.</li><li>For each, pick object / block (RWO) / file (RWX) / ephemeral / managed service, and how it survives an AZ failure.</li></ul>',
          solution: 'API pods: no PVCs; emptyDir for temp files; config via ConfigMaps/Secrets.\nUser uploads: S3 / Azure Blob via SDK + workload identity; presigned URLs; CDN in front. Survives AZ loss (regional service).\nPostgreSQL: managed (RDS Multi-AZ / Aurora, Azure Flexible Server zone-redundant HA) or CloudNativePG with 3 instances across zones on gp3/Premium SSD v2 RWO volumes + WAL archiving to object storage.\nRedis cache: in-memory, optional persistence; ElastiCache/Azure Cache multi-AZ, or a StatefulSet with replicas per zone; cache loss is tolerable.\nKafka: Strimzi with brokers spread across 3 zones (rack awareness = zone), one RWO volume per broker (or local NVMe), RF=3, min.insync.replicas=2; tiered storage to object storage for old segments. Or managed MSK / Event Hubs.\nShared ML models (read-mostly): bake into images or download from object storage at startup into an emptyDir; RWX EFS/Azure Files only if models change frequently; Mountpoint for S3 CSI for large read-only datasets.'
        },
        {
          t: 'Decide whether to run PostgreSQL on Kubernetes or a managed service',
          d: 'hard', type: 'design',
          hint: '<ul><li>Context: 40 microservices, 15 small PostgreSQL databases, two clouds (AWS + Azure), a 6-person platform team.</li><li>Compare operator-based (CloudNativePG) with RDS/Azure Database on cost, portability, HA/DR, upgrades, observability, skills.</li><li>If Kubernetes: specify storage, topology, backups and failure drills.</li></ul>',
          solution: 'Decision drivers: portability across two clouds and many small databases favour an operator (CloudNativePG) — one consistent API, GitOps-managed clusters, dense packing, no managed premium. Managed services win when the team is small, compliance demands provider certifications, or databases are large/critical and need features like Aurora storage.\nRecommendation for this context: CloudNativePG for the 15 small DBs if the platform team commits to owning it; keep the one or two most critical/large databases on managed services.\nKubernetes design:\n- 3 instances per cluster (primary + 2 replicas) spread across zones (topology spread), PDB maxUnavailable 1, anti-affinity, dedicated node pool, Guaranteed QoS.\n- Storage: gp3 / Premium SSD v2 RWO volumes, separate WAL volume, WaitForFirstConsumer, reclaimPolicy Retain, allowVolumeExpansion, alerting on PVC usage.\n- HA: operator-managed failover (quorum-based), synchronous replication for RPO 0 within region if latency allows.\n- Backups: continuous WAL archiving + base backups to S3/Blob (Barman Cloud plugin), retention policy, cross-region copy, immutable bucket; volume snapshots as fast-restore complement.\n- Operations: automated minor upgrades, monitoring (pg exporter, replication lag, WAL archive failures), quarterly restore and failover drills, documented runbooks.\nTrade-offs to state: you own on-call and upgrade risk; managed services reduce toil but cost ~1.5-3x per instance and differ across clouds.'
        },
        {
          t: 'Design zone-resilient stateful storage on EKS or AKS',
          d: 'hard', type: 'design',
          hint: '<ul><li>Requirement: survive the loss of one AZ with RPO ≈ 0 and RTO &lt; 5 minutes for a stateful service.</li><li>Zonal disks cannot move — where does redundancy come from?</li><li>Compare app-level replication, zone-redundant storage (Azure ZRS disks, EFS Regional) and managed services.</li><li>Include scheduling, capacity headroom and testing.</li></ul>',
          solution: 'Principle: a zonal RWO disk is a single-AZ failure domain; resilience must come from replication across zones or from zone-redundant storage.\nOption A - application replication (preferred for databases/queues): 3 replicas, one per zone (topologySpreadConstraints / Strimzi rack awareness), each with its own zonal disk; quorum/synchronous replication (Raft-based DBs, PostgreSQL synchronous_standby_names ANY 1, Kafka RF=3 + min.insync.replicas=2). AZ loss -> remaining replicas elect a leader in seconds, RPO 0.\nOption B - zone-redundant volumes: Azure ZRS managed disks (Premium SSD / Standard SSD ZRS) can attach in any zone of the region, so a single-instance pod can reschedule to another zone (higher write latency; check support for your disk type). On AWS, EFS Regional (NFS) for shared files; EBS has no cross-AZ volumes.\nOption C - managed: RDS Multi-AZ / Aurora, Azure Database zone-redundant HA.\nPlatform pieces: WaitForFirstConsumer classes, per-zone node groups (or Karpenter) with 33%+ headroom so survivors can absorb load, PDBs, readiness gates, client retry logic, DNS/Service endpoints updated automatically.\nVerify: chaos test by cordoning/draining all nodes in a zone or blocking its subnets; measure failover time and data loss; rebuild the lost replica afterwards (new PVC in a healthy zone, seeded from peers).'
        }
      ],
      interviewFocus: [
        {
          q: 'Walk through what happens from creating a PVC to a pod writing to the volume.',
          a: '<ol><li>PVC created referencing a StorageClass. With <code>WaitForFirstConsumer</code>, nothing happens until a pod using it is scheduled; the scheduler picks a node and annotates the PVC with the selected node.</li>' +
            '<li><strong>external-provisioner</strong> sidecar sees the PVC and calls the CSI controller <code>CreateVolume</code> with parameters and topology (zone) → the cloud disk is created; a PV is created with <code>nodeAffinity</code> and bound to the PVC.</li>' +
            '<li>The attach-detach controller creates a <code>VolumeAttachment</code>; <strong>external-attacher</strong> calls <code>ControllerPublishVolume</code> → the disk is attached to the node (shows up as <code>/dev/nvmeXn1</code>).</li>' +
            '<li>Kubelet calls the node plugin: <code>NodeStageVolume</code> (format if empty with fsType, mount at a global staging path) then <code>NodePublishVolume</code> (bind-mount into the pod\'s volume directory), applying fsGroup ownership.</li>' +
            '<li>Container starts with the mount. Deletion reverses the steps; reclaimPolicy decides whether the cloud disk is deleted.</li></ol>' +
            '<p>Knowing this chain lets you pinpoint failures: provisioning (IAM, quotas), attach (Multi-Attach, instance attachment limits), mount (fsType, permissions).</p>'
        },
        {
          q: 'Why is WaitForFirstConsumer important for zonal block storage?',
          a: '<p>With <code>Immediate</code> binding, the disk is created as soon as the PVC exists, in a zone chosen without knowledge of the pod\'s needs. If the pod later needs a node in a different zone (anti-affinity, resources, taints, zone spread), it can never run there: PV node affinity is fixed → Pending with <em>volume node affinity conflict</em>.</p>' +
            '<p><code>WaitForFirstConsumer</code> lets the scheduler choose the node first, considering all constraints, and then provisions the volume in that node\'s zone. It also enables correct topology-aware provisioning for local volumes. Remaining caveat: once created, the volume pins the pod to that zone forever, so you need per-zone capacity and application-level replication for zone failures.</p>'
        },
        {
          q: 'Should you run databases on Kubernetes?',
          a: '<p><strong>Yes, when</strong>: you have a mature operator (CloudNativePG, Percona, Vitess, Strimzi), platform engineers who understand storage and failure modes, a need for portability/multi-cloud or many small databases, and you test restores and failovers regularly.</p>' +
            '<p><strong>Prefer managed when</strong>: the team is small, the database is business-critical and large, or you need provider features (Aurora storage, cross-region replicas with one click, compliance attestations).</p>' +
            '<p>Storage specifics either way: RWO/RWOP volumes with WaitForFirstConsumer, Retain reclaim policy, separate WAL volume, one replica per zone, PDBs, Guaranteed QoS, backups to object storage with WAL archiving (snapshots are not enough), monitoring of replication lag and volume capacity, and a documented restore procedure.</p>'
        },
        {
          q: 'How do you optimise object storage cost without breaking retrieval SLAs?',
          a: '<ul><li><strong>Measure first</strong>: S3 Storage Lens, storage class analysis, Azure blob inventory / last-access tracking.</li>' +
            '<li><strong>Lifecycle by age/prefix/tag</strong>: Standard → IA (30 d) → Glacier Instant (90 d) → Deep Archive for compliance; Azure Hot → Cool → Cold → Archive.</li>' +
            '<li><strong>Intelligent-Tiering</strong> when access patterns are unknown (per-object monitoring fee; objects under 128 KB are not tiered).</li>' +
            '<li><strong>Respect constraints</strong>: minimum durations (30/90/180 days), retrieval fees and latency (Archive/Deep Archive take hours), per-object overheads — pack small files.</li>' +
            '<li><strong>Clean up</strong>: noncurrent versions, delete markers, incomplete multipart uploads, orphaned data, replicated copies you no longer need.</li>' +
            '<li>Keep the SLA explicit: anything that may be needed in minutes must not sit in a tier with hour-scale retrieval.</li></ul>'
        },
        {
          q: 'How do StatefulSets manage storage, and what are the common gotchas?',
          a: '<ul><li>Each replica gets a PVC from <code>volumeClaimTemplates</code> named <code>&lt;template&gt;-&lt;sts&gt;-&lt;ordinal&gt;</code>; when <code>db-1</code> is rescheduled it reattaches the same PVC — identity and data stick together.</li>' +
            '<li>PVCs are not deleted on scale-down or StatefulSet deletion unless <code>persistentVolumeClaimRetentionPolicy</code> says so — protecting data but leaking cost.</li>' +
            '<li><code>volumeClaimTemplates</code> are immutable; resizing means patching each PVC.</li>' +
            '<li>Zonal disks pin each ordinal to a zone; drains and zone capacity issues cause Pending pods.</li>' +
            '<li>Ordered, one-at-a-time rollouts can stall if a pod never becomes Ready (<code>podManagementPolicy: Parallel</code> and <code>maxUnavailable</code> for faster rollouts where safe).</li>' +
            '<li>Large volumes with <code>fsGroup</code> can make pod start slow — use <code>fsGroupChangePolicy: OnRootMismatch</code>.</li></ul>'
        }
      ],
      quiz: [
        { q: 'gp3 baseline performance?', a: '3,000 IOPS and 125 MiB/s regardless of volume size; more can be provisioned independently of capacity.' },
        { q: 'Minimum storage duration for S3 Standard-IA, Glacier Instant Retrieval and Deep Archive?', a: '30 days, 90 days and 180 days respectively.' },
        { q: 'Azure blob access tiers?', a: 'Hot, Cool (30-day minimum), Cold (90-day minimum) and Archive (180-day minimum, offline until rehydrated).' },
        { q: 'Difference between RWO and RWOP?', a: 'ReadWriteOnce allows read-write mounting by pods on a single node; ReadWriteOncePod restricts it to a single pod in the whole cluster.' },
        { q: 'What does WaitForFirstConsumer do?', a: 'Delays volume provisioning and binding until a pod using the PVC is scheduled, so the volume is created in a zone compatible with the pod.' },
        { q: 'Which CSI call attaches a volume to a node, and which mounts it into the pod?', a: 'ControllerPublishVolume attaches; NodeStageVolume mounts to a staging path and NodePublishVolume bind-mounts it into the pod.' },
        { q: 'Are StatefulSet PVCs deleted when the StatefulSet is deleted?', a: 'Not by default; persistentVolumeClaimRetentionPolicy can set whenDeleted/whenScaled to Delete.' },
        { q: 'Azure equivalents of EBS gp3, EFS and S3?', a: 'Premium SSD v2 (or Premium SSD), Azure Files, and Azure Blob Storage.' },
        {
          q: 'What does a VolumeAttributesClass let you change?',
          a: 'Mutable performance attributes such as IOPS and throughput of an already-provisioned volume, by pointing the PVC at another class (volumeAttributesClassName); GA in Kubernetes 1.34 and supported by drivers such as the EBS CSI driver.'
        }
      ],
      resources: [
        { title: 'Kubernetes — Persistent Volumes', url: 'https://kubernetes.io/docs/concepts/storage/persistent-volumes/', type: 'docs' },
        { title: 'Kubernetes — Storage Classes', url: 'https://kubernetes.io/docs/concepts/storage/storage-classes/', type: 'docs' },
        { title: 'Amazon S3 — Understanding and managing storage classes', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html', type: 'docs' },
        { title: 'Azure — Access tiers for blob data', url: 'https://learn.microsoft.com/azure/storage/blobs/access-tiers-overview', type: 'docs' }
      ]
    },
    // ───────────────────────────── Module 8 ─────────────────────────────
    {
      n: 8,
      title: 'Backup, Disaster Recovery & Data Lifecycle',
      summary: 'Protecting data against everything RAID and replication cannot: deletion, corruption, ransomware and region loss. RPO/RTO, backup types, snapshots vs backups, the 3-2-1-1-0 rule, immutable backups, point-in-time recovery, DR strategies, encryption with KMS, retention, GDPR deletion and restore testing.',
      topics: [
        {
          title: 'RPO, RTO and Disaster-Recovery Strategies',
          def: '<ul><li><strong>RPO (Recovery Point Objective)</strong>: maximum acceptable data loss, measured in time ("we can lose at most 5 minutes of writes"). Driven by backup/replication frequency.</li>' +
            '<li><strong>RTO (Recovery Time Objective)</strong>: maximum acceptable downtime until service is restored. Includes detection, decision, restore/failover, data validation, DNS/traffic switch and warm-up — not just the restore command.</li>' +
            '<li>Related: <strong>MTD</strong> (maximum tolerable downtime), <strong>RTA/RPA</strong> (actual achieved values, measured in drills).</li></ul>' +
            '<table><thead><tr><th>DR strategy (AWS terminology)</th><th>What runs in the DR region</th><th>Typical RPO</th><th>Typical RTO</th><th>Cost</th></tr></thead><tbody>' +
            '<tr><td>Backup &amp; restore</td><td>only backups (cross-region copies)</td><td>hours (backup interval)</td><td>hours to a day</td><td>$</td></tr>' +
            '<tr><td>Pilot light</td><td>data replicated live (DB replica, S3 CRR); compute off / defined as IaC</td><td>seconds to minutes</td><td>tens of minutes</td><td>$$</td></tr>' +
            '<tr><td>Warm standby</td><td>scaled-down but fully functional copy</td><td>seconds</td><td>minutes</td><td>$$$</td></tr>' +
            '<tr><td>Multi-site active/active</td><td>full production serving traffic</td><td>near zero</td><td>near zero (traffic shift)</td><td>$$$$</td></tr>' +
            '</tbody></table>' +
            '<ul><li>Classify systems into tiers (e.g. Tier 0 payments: RPO 0 / RTO 15 min; Tier 3 internal reporting: RPO 24 h / RTO 3 days) — not everything deserves active/active.</li>' +
            '<li><strong>Replication is not backup</strong>: replication (RAID, replicas, CRR) protects against hardware/site loss with low RPO but faithfully copies deletes, corruption and encryption by ransomware. Backups protect against logical failures with point-in-time history. You need both.</li>' +
            '<li>DR must cover dependencies: IAM, KMS keys, DNS, secrets, container images, IaC, runbooks and people.</li></ul>',
          interview: 'Define RPO and RTO crisply, then map them to a strategy and its cost. Senior answers stress that RTO includes detection and decision time, that replication does not replace backups, and that the achieved RPO/RTO must be proven by drills.',
          examples: [
            { label: 'Turning business requirements into RPO/RTO', lang: 'text', code: 'System              Impact of 1h outage   Data loss tolerance   RPO     RTO      Strategy\n------------------  --------------------  --------------------  ------  -------  ------------------------------\nPayments API        revenue + legal       none                  0       15 min   multi-AZ sync + warm standby DR\nProduct catalogue   lost sales            minutes               5 min   1 h      pilot light + PITR backups\nAnalytics lake      delayed reports       1 day (re-ingest)     24 h    3 days   backup & restore (CRR + lifecycle)\nInternal wiki       annoyance             1 day                 24 h    2 days   nightly backups to another region' }
          ]
        },
        {
          title: 'Backup Types: Full, Incremental, Differential and Synthetic Full',
          def: '<table><thead><tr><th>Type</th><th>Contains</th><th>Backup time / size</th><th>Restore needs</th></tr></thead><tbody>' +
            '<tr><td><strong>Full</strong></td><td>everything</td><td>slowest, largest</td><td>just the full</td></tr>' +
            '<tr><td><strong>Incremental</strong></td><td>changes since the <em>last backup of any type</em></td><td>fastest, smallest</td><td>full + every incremental in the chain</td></tr>' +
            '<tr><td><strong>Differential</strong></td><td>changes since the <em>last full</em></td><td>grows each day until next full</td><td>full + latest differential</td></tr>' +
            '<tr><td><strong>Synthetic full</strong></td><td>a full assembled on the backup system from the last full + incrementals</td><td>no extra load on the source</td><td>just the synthetic full</td></tr>' +
            '<tr><td><strong>Incremental-forever</strong></td><td>one initial full, then only block-level changes, deduplicated</td><td>minimal</td><td>repository reconstructs any point (AWS Backup, EBS snapshots, Veeam, restic, Kopia)</td></tr>' +
            '</tbody></table>' +
            '<ul><li><strong>Changed block tracking (CBT)</strong> lets hypervisors and cloud snapshots copy only modified blocks (EBS snapshots are block-incremental).</li>' +
            '<li><strong>Deduplication and compression</strong> make long retention affordable; content-defined chunking finds duplicates across hosts.</li>' +
            '<li><strong>Logical vs physical</strong> database backups: <code>pg_dump</code>/<code>mysqldump</code> are portable, version-independent and allow selective restore but are slow for TBs and give a single point in time; physical backups (<code>pg_basebackup</code>, pgBackRest, Percona XtraBackup) copy data files, are fast, support incremental and combine with WAL/binlog for PITR. PostgreSQL 17 added native incremental base backups (<code>pg_basebackup --incremental</code> + <code>pg_combinebackup</code>).</li>' +
            '<li><strong>Consistency</strong>: crash-consistent (point-in-time image, like a power cut), application-consistent (quiesced via VSS, fsfreeze or database backup APIs).</li></ul>',
          interview: 'Be ready for the classic: "which backups do you need to restore on Friday?" (incremental: full plus every incremental; differential: full plus Thursday\'s differential). Then show modern practice: incremental-forever with synthetic fulls, dedup, and physical backups plus WAL for databases.',
          examples: [
            { label: 'Restore chains for a weekly full', lang: 'text', code: 'Sun        Mon      Tue      Wed      Thu      Fri\nFULL       I1       I2       I3       I4       I5      <- incremental (changes since previous backup)\nFULL       D1       D2       D3       D4       D5      <- differential (changes since Sunday)\n\nRestore Friday night:\n  incremental : FULL + I1 + I2 + I3 + I4 + I5   (6 pieces; any missing piece breaks the chain)\n  differential: FULL + D5                        (2 pieces; D5 is the biggest differential)\n  synthetic   : FULL\' built on the backup server = FULL + I1..I5 (1 piece, no load on source)' }
          ]
        },
        {
          title: 'Snapshots vs Backups, the 3-2-1-1-0 Rule and Immutable Backups',
          def: '<table><thead><tr><th></th><th>Snapshot</th><th>Backup</th></tr></thead><tbody>' +
            '<tr><td>What</td><td>point-in-time image of a volume/file system, usually CoW or block-incremental</td><td>independent copy of data in a separate system</td></tr>' +
            '<tr><td>Location</td><td>same array/pool/account (cloud snapshots: same region and account by default)</td><td>different system, account, region, ideally immutable</td></tr>' +
            '<tr><td>Speed</td><td>seconds to create; fast restore</td><td>slower to create and restore</td></tr>' +
            '<tr><td>Protects against</td><td>bad deploys, accidental changes (quick rollback)</td><td>also array/account/region loss, ransomware, malicious admins</td></tr>' +
            '<tr><td>Weakness</td><td>shares failure domain and credentials with the source</td><td>restore time; must be tested</td></tr>' +
            '</tbody></table>' +
            '<p>A snapshot <em>becomes</em> a backup when it is copied to another failure and security domain (cross-region, cross-account, immutable vault).</p>' +
            '<p><strong>3-2-1-1-0 rule</strong>: <strong>3</strong> copies of data, on <strong>2</strong> different media/storage types, <strong>1</strong> off-site (other region), <strong>1</strong> offline, air-gapped or immutable, and <strong>0</strong> errors after automated restore verification.</p>' +
            '<p><strong>Ransomware-resilient backups</strong>: attackers with admin credentials delete backups first, then encrypt production. Defences:</p>' +
            '<ul><li><strong>Immutability (WORM)</strong>: S3 Object Lock (Governance mode can be bypassed with a special permission; <strong>Compliance mode</strong> cannot be shortened or removed by anyone, including root), legal holds; AWS Backup Vault Lock and logically air-gapped vaults; Azure immutable blob storage (time-based retention, legal hold) and Azure Backup immutable vaults with soft delete.</li>' +
            '<li><strong>Isolation</strong>: backups in a separate account/subscription with separate identities, no standing admin access, MFA and multi-party approval for destructive actions.</li>' +
            '<li><strong>Detection</strong>: alerts on mass deletion, backup policy changes, unusual change rates (encryption shows as near-100% changed blocks).</li>' +
            '<li><strong>Clean restore</strong>: keep enough retention to go back before the dwell time of the attacker; scan restored data.</li></ul>',
          interview: 'For "snapshot vs backup", answer with failure domains: a snapshot shares storage, account and credentials with the source, so it is a fast rollback tool, not a backup, until copied elsewhere and made immutable. Quote 3-2-1-1-0 and explain Object Lock compliance vs governance mode.',
          examples: [
            { label: 'S3 Object Lock in compliance mode', lang: 'bash', code: '# Object Lock requires versioning (enabled automatically); can also be enabled on existing buckets\naws s3api create-bucket --bucket acme-backups-vault --region eu-west-1 \\\n  --create-bucket-configuration LocationConstraint=eu-west-1 --object-lock-enabled-for-bucket\n\naws s3api put-object-lock-configuration --bucket acme-backups-vault --object-lock-configuration \\\n  \'{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"COMPLIANCE","Days":35}}}\'\n\naws s3 cp db-2025-10-29.tar.zst s3://acme-backups-vault/pg/\n# Deleting a specific version now fails with AccessDenied until retention expires:\naws s3api delete-object --bucket acme-backups-vault --key pg/db-2025-10-29.tar.zst --version-id <id>\n# (A delete without --version-id only adds a delete marker; the locked version survives.)\naws s3api put-object-legal-hold --bucket acme-backups-vault --key pg/db-2025-10-29.tar.zst \\\n  --version-id <id> --legal-hold Status=ON' }
          ]
        },
        {
          title: 'Point-in-Time Recovery with WAL Archiving',
          def: '<p><strong>Point-in-time recovery (PITR)</strong> combines a <strong>base backup</strong> (physical copy of the data directory taken while running) with the <strong>continuous archive of WAL</strong> segments generated since. Restoring = copy the base backup, then replay WAL up to a chosen target: a timestamp, transaction ID, LSN or named restore point — e.g. one second before someone ran <code>DROP TABLE</code>.</p>' +
            '<ul><li><strong>Archiving</strong>: <code>archive_mode = on</code> and <code>archive_command</code> / <code>archive_library</code> copy each completed 16 MB WAL segment to durable storage (tools: pgBackRest, WAL-G, Barman, or CloudNativePG\'s Barman Cloud plugin). <code>archive_timeout</code> forces a segment switch on quiet systems, bounding RPO.</li>' +
            '<li>The archive command must return success <em>only</em> if the file is durably stored, and must never overwrite an existing segment.</li>' +
            '<li><strong>Restore</strong>: place the base backup, set <code>restore_command</code> and <code>recovery_target_time</code>, create <code>recovery.signal</code>, start PostgreSQL; it replays WAL and pauses or promotes (<code>recovery_target_action</code>). A new <strong>timeline</strong> starts, so histories do not collide.</li>' +
            '<li><strong>RPO</strong> = WAL not yet archived (seconds to <code>archive_timeout</code>); add streaming replication to a standby for near-zero RPO. <strong>RTO</strong> = restore base backup (TBs at network speed) + replay WAL since the backup → frequent (incremental) base backups shorten it.</li>' +
            '<li>MySQL equivalent: physical backup (XtraBackup/Clone) + binlog replay with <code>mysqlbinlog --stop-datetime</code>. Managed services (RDS, Azure Database for PostgreSQL) do this for you with PITR typically to within the last few minutes.</li>' +
            '<li><strong>Delayed replica</strong> (<code>recovery_min_apply_delay = 1h</code>) gives a fast undo window for logical mistakes without a full restore.</li></ul>',
          interview: 'Explain base backup plus WAL archive, how archive_timeout bounds RPO and how restore time drives RTO for large databases. Mention timelines, verifying the archive is gap-free (pg_stat_archiver failures), and that a delayed replica or PITR handles logical errors that replication would copy instantly.',
          examples: [
            { label: 'PostgreSQL archiving and PITR (pgBackRest)', lang: 'bash', code: '# postgresql.conf\n#   archive_mode = on\n#   archive_command = \'pgbackrest --stanza=main archive-push %p\'\n#   archive_timeout = 60          # bound RPO on quiet systems\n#   wal_level = replica\n\npgbackrest --stanza=main stanza-create\npgbackrest --stanza=main check                       # verifies archiving end to end\npgbackrest --stanza=main --type=full backup           # weekly\npgbackrest --stanza=main --type=incr backup           # hourly / daily (block-level incremental)\npgbackrest --stanza=main info                         # backups and WAL range available\n\n# Restore to just before an accidental DROP at 14:03:00\nsudo systemctl stop postgresql\npgbackrest --stanza=main --delta --type=time "--target=2025-10-29 14:02:59+00" \\\n  --target-action=promote restore\nsudo systemctl start postgresql\n\n# Monitor archiving health\npsql -c "SELECT archived_count, failed_count, last_failed_wal, last_archived_time FROM pg_stat_archiver;"' }
          ]
        },
        {
          title: 'Encryption at Rest, KMS and Envelope Encryption',
          def: '<p><strong>Envelope encryption</strong> is how every cloud encrypts data at scale:</p>' +
            '<ol><li>Generate a random <strong>data encryption key (DEK)</strong>, e.g. AES-256, per object/volume/file.</li>' +
            '<li>Encrypt the data locally with the DEK (AES-GCM for authenticity).</li>' +
            '<li>Encrypt (wrap) the DEK with a <strong>key encryption key (KEK)</strong> that never leaves the <strong>KMS/HSM</strong> (AWS KMS, Azure Key Vault / Managed HSM, GCP KMS, HashiCorp Vault Transit).</li>' +
            '<li>Store the wrapped DEK next to the ciphertext; discard the plaintext DEK.</li></ol>' +
            '<p>Why: bulk data never travels to the KMS (fast, cheap), each object has its own key (limits blast radius), access is controlled and audited through KMS policies (CloudTrail / Azure Monitor logs every unwrap), and <strong>rotating the KEK</strong> only re-wraps small DEKs (AWS KMS automatic rotation keeps old key material so old DEKs still decrypt).</p>' +
            '<table><thead><tr><th>Option</th><th>Who holds keys</th><th>Notes</th></tr></thead><tbody>' +
            '<tr><td>SSE-S3 / Microsoft-managed keys</td><td>provider</td><td>default on S3 and Azure Storage; transparent</td></tr>' +
            '<tr><td>SSE-KMS / customer-managed keys (CMK) in Key Vault</td><td>your KMS key</td><td>key policies, audit, revocation; S3 Bucket Keys reduce KMS request costs</td></tr>' +
            '<tr><td>SSE-C</td><td>you supply the key per request</td><td>provider never stores it; AWS announced that new buckets block SSE-C by default from April 2026 (it must be explicitly allowed) after ransomware campaigns abused it to re-encrypt victim data with attacker-held keys</td></tr>' +
            '<tr><td>Client-side encryption</td><td>you, before upload</td><td>provider never sees plaintext</td></tr>' +
            '</tbody></table>' +
            '<p>Also: EBS/Managed Disk encryption (keys per volume via KMS/Key Vault), Kubernetes Secret encryption at rest with the <strong>KMS v2</strong> provider, database TDE. <strong>Crypto-shredding</strong>: destroy the key to make all data encrypted under it unreadable — useful for deletion in backups and decommissioning SSDs. Losing or deleting a KMS key also destroys your <em>backups</em> — protect keys (deletion waiting periods, cross-region replicas of keys, separate key admins).</p>',
          interview: 'Draw the envelope: DEK encrypts data, KEK in KMS wraps DEK, wrapped DEK stored with the data. Explain why (performance, blast radius, audit, cheap rotation) and the operational risk that deleting a KMS key silently destroys backups. Mention crypto-shredding for GDPR.',
          examples: [
            { label: 'Envelope encryption in Go (AES-256-GCM + a KMS interface)', lang: 'go', code: '// KMS abstracts AWS KMS (GenerateDataKey/Decrypt), Azure Key Vault (wrapKey/unwrapKey) or Vault Transit.\ntype KMS interface {\n    GenerateDataKey(ctx context.Context, keyID string) (plaintext, wrapped []byte, err error)\n    Decrypt(ctx context.Context, wrapped []byte) ([]byte, error)\n}\n\ntype Envelope struct {\n    KeyID      string\n    WrappedDEK []byte // stored next to the ciphertext\n    Nonce      []byte\n    Ciphertext []byte\n}\n\nfunc Seal(ctx context.Context, k KMS, keyID string, plaintext, aad []byte) (*Envelope, error) {\n    dek, wrapped, err := k.GenerateDataKey(ctx, keyID)\n    if err != nil {\n        return nil, err\n    }\n    defer clear(dek) // do not keep plaintext keys around\n    aead, err := newAEAD(dek)\n    if err != nil {\n        return nil, err\n    }\n    nonce := make([]byte, aead.NonceSize())\n    if _, err := rand.Read(nonce); err != nil {\n        return nil, err\n    }\n    return &Envelope{KeyID: keyID, WrappedDEK: wrapped, Nonce: nonce,\n        Ciphertext: aead.Seal(nil, nonce, plaintext, aad)}, nil\n}\n\nfunc Open(ctx context.Context, k KMS, env *Envelope, aad []byte) ([]byte, error) {\n    dek, err := k.Decrypt(ctx, env.WrappedDEK) // audited, policy-checked unwrap\n    if err != nil {\n        return nil, err\n    }\n    defer clear(dek)\n    aead, err := newAEAD(dek)\n    if err != nil {\n        return nil, err\n    }\n    return aead.Open(nil, env.Nonce, env.Ciphertext, aad)\n}\n\nfunc newAEAD(key []byte) (cipher.AEAD, error) {\n    block, err := aes.NewCipher(key) // 32-byte key -> AES-256\n    if err != nil {\n        return nil, err\n    }\n    return cipher.NewGCM(block)\n}' }
          ]
        },
        {
          title: 'Retention, Tiering, GDPR Deletion and Restore Testing',
          def: '<p><strong>Data lifecycle</strong> = create → use (hot) → age (warm/cold tiers) → archive → delete, governed by a <strong>retention schedule</strong> per data class (legal, financial, logs, PII, backups).</p>' +
            '<ul><li><strong>Retain as long as required, delete as soon as allowed</strong>: over-retention increases breach impact, storage cost and discovery scope.</li>' +
            '<li>Implement with lifecycle policies (S3, Azure Blob), backup retention rules (GFS: daily for 14 days, weekly for 8 weeks, monthly for 12 months, yearly for 7 years), TTLs in databases (Cassandra TTL, DynamoDB TTL), partition dropping for time-series tables.</li>' +
            '<li><strong>Legal holds</strong> suspend deletion for litigation regardless of schedule (S3 legal hold, Azure legal hold).</li></ul>' +
            '<p><strong>GDPR right to erasure (Art. 17)</strong>: respond without undue delay (normally within one month). Practical pattern:</p>' +
            '<ul><li>Delete from primary stores, caches, search indexes, analytics copies and logs within the deadline; track lineage so you know where PII lives.</li>' +
            '<li><strong>Backups</strong>: rewriting immutable backups is impractical; regulators generally accept that backup data is "put beyond use" (not restored into live systems, access-restricted) and expires with normal retention, <em>provided</em> you keep a <strong>deletion/suppression log</strong> and re-apply deletions after any restore.</li>' +
            '<li><strong>Crypto-shredding</strong>: encrypt each subject\'s data with a per-subject key; deleting the key erases the data everywhere, including backups.</li>' +
            '<li>Pseudonymise analytics data and minimise what you collect.</li></ul>' +
            '<p><strong>Restore testing</strong> — "a backup is only as good as the last successful restore":</p>' +
            '<ul><li>Automated, scheduled restores into an isolated environment (AWS Backup restore testing, CloudNativePG recovery clusters, scripted pgBackRest restores).</li>' +
            '<li>Validate content, not just exit codes: row counts, checksums, application smoke tests, <code>amcheck</code>/<code>pg_checksums</code>.</li>' +
            '<li>Measure achieved RTO/RPO and compare with targets; run regional DR game days; keep runbooks current; alert on backup job failures and on missing backups.</li></ul>',
          interview: 'When asked about deleting user data, mention lineage, deadlines, suppression lists re-applied after restores, and crypto-shredding. When asked about backups, always end with restore testing and measured RTO/RPO — interviewers treat "we never tested restores" as a red flag.',
          examples: [
            { label: 'Backup plan with retention, cross-region copy and a vault lock (AWS Backup)', lang: 'bash', code: 'cat > plan.json <<\'EOF\'\n{\n  "BackupPlanName": "prod-databases",\n  "Rules": [{\n    "RuleName": "daily-35d",\n    "TargetBackupVaultName": "prod-vault",\n    "ScheduleExpression": "cron(0 2 * * ? *)",\n    "Lifecycle": { "DeleteAfterDays": 35 },\n    "CopyActions": [{\n      "DestinationBackupVaultArn": "arn:aws:backup:eu-central-1:222233334444:backup-vault:dr-vault",\n      "Lifecycle": { "DeleteAfterDays": 35 }\n    }]\n  }]\n}\nEOF\naws backup create-backup-plan --backup-plan file://plan.json\n# WORM protection: nobody (including root) can delete recovery points early once the grace period ends\naws backup put-backup-vault-lock-configuration --backup-vault-name prod-vault \\\n  --min-retention-days 7 --max-retention-days 400 --changeable-for-days 3' }
          ]
        }
      ],
      problems: [
        {
          t: 'Define RPO and RTO for three business systems',
          d: 'easy', type: 'concept',
          hint: '<ul><li>Systems: card payments, an internal analytics dashboard, a customer support ticketing tool.</li><li>Ask: what does an hour of downtime cost? How much data can be re-created?</li><li>Pick a DR strategy for each and justify its cost.</li></ul>',
          solution: 'Card payments: RPO 0 (no lost transactions), RTO <= 15 min. Synchronous multi-AZ replication + warm standby or active/active in a second region; PITR backups for logical errors.\nAnalytics dashboard: RPO 24 h (data can be re-ingested from sources), RTO 1-3 days. Backup & restore with cross-region copies; infrastructure as code to rebuild.\nSupport ticketing: RPO 15 min, RTO 4 h. Pilot light: database replica in DR region (async), app tier defined in IaC and started on failover; or SaaS vendor SLA review.\nKey points: RPO drives replication/backup frequency; RTO drives standby readiness; cost rises steeply as both approach zero; validate with drills.'
        },
        {
          t: 'Compare storage and restore chains for full, incremental and differential schedules',
          d: 'easy', type: 'concept',
          hint: '<ul><li>1 TB database, 5% of data changes per day (assume different blocks each day), weekly full on Sunday, 4 weeks retention.</li><li>Compute weekly backup storage for incremental vs differential.</li><li>List what you need to restore Saturday\'s state in each scheme.</li><li>Where do synthetic fulls fit?</li></ul>',
          solution: 'Incremental: 1 TB full + 6 x 50 GB = 1.3 TB/week -> ~5.2 TB for 4 weeks. Restore Saturday = full + 6 incrementals (long chain, one bad piece breaks it).\nDifferential (upper bound, changes accumulate): 1 TB + (50+100+150+200+250+300) GB = 2.05 TB/week -> ~8.2 TB for 4 weeks. Restore Saturday = full + Saturday differential (2 pieces). (Overlapping changes make differentials smaller in practice.)\nSynthetic full: the backup system merges last full + incrementals into a new full without reading the source -> incremental-forever capture cost with a short restore chain. Dedup repositories (AWS Backup, Veeam, restic) make this the default.\nAdd compression (2-4x for databases) to all figures.'
        },
        {
          t: 'Explain snapshot vs backup using failure scenarios',
          d: 'easy', type: 'concept',
          hint: '<ul><li>Scenarios: bad schema migration, disk failure, storage array firmware bug, compromised cloud admin account, region outage.</li><li>For each, does a local snapshot save you? Does a cross-account immutable backup?</li></ul>',
          solution: 'Bad migration: snapshot yes (fast rollback) - backup also, slower.\nDisk failure: cloud snapshot yes (stored in S3, independent of the volume); on-prem array snapshot only if the array survives.\nArray/pool firmware bug or pool loss: snapshot NO (same pool) - backup yes.\nCompromised admin account / ransomware: snapshots NO (attacker deletes them with the same credentials) - immutable backup in a separate account with Object Lock / Vault Lock yes.\nRegion outage: snapshot NO unless copied cross-region - cross-region backup yes.\nConclusion: snapshots are a fast operational recovery tool; a backup is a copy in a different failure AND security domain, immutable and tested. Copying snapshots cross-account/region with locks turns them into backups.'
        },
        {
          t: 'Configure S3 Object Lock and prove that deletes are blocked',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>Create a bucket with Object Lock enabled and a default retention.</li><li>Compare Governance and Compliance modes with a test object.</li><li>Try deleting a version, shortening retention and bypassing governance.</li><li>Note that a plain delete creates a delete marker — what does that mean?</li></ul>',
          solution: 'aws s3api create-bucket --bucket lock-lab-123 --object-lock-enabled-for-bucket   # (add LocationConstraint outside us-east-1)\naws s3api put-object-lock-configuration --bucket lock-lab-123 --object-lock-configuration \'{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":1}}}\'\necho test > t.txt && aws s3api put-object --bucket lock-lab-123 --key t.txt --body t.txt   # note VersionId\naws s3api get-object-retention --bucket lock-lab-123 --key t.txt\naws s3api delete-object --bucket lock-lab-123 --key t.txt --version-id <v>                  # AccessDenied\naws s3api delete-object --bucket lock-lab-123 --key t.txt --version-id <v> --bypass-governance-retention   # works only with s3:BypassGovernanceRetention\naws s3api delete-object --bucket lock-lab-123 --key t.txt                                   # adds a delete marker; locked version still exists\n# Compliance mode: no one (including root) can delete the version or shorten retention until it expires - test with 1 day only!\nTakeaways: use COMPLIANCE for backup vaults; restrict s3:BypassGovernanceRetention and s3:PutBucketObjectLockConfiguration; lifecycle cannot delete locked versions early; combine with a separate account and CRR to a second locked bucket.'
        },
        {
          t: 'Perform point-in-time recovery of PostgreSQL',
          d: 'medium', type: 'hands-on',
          hint: '<ul><li>Enable WAL archiving to a local directory or S3, take a base backup.</li><li>Insert rows, note the time, then drop the table.</li><li>Restore the base backup to a new data directory with <code>restore_command</code> and <code>recovery_target_time</code>.</li><li>Verify the table is back and observe the new timeline.</li></ul>',
          solution: '# postgresql.conf: wal_level=replica, archive_mode=on,\n#   archive_command=\'test ! -f /archive/%f && cp %p /archive/%f\', archive_timeout=60\npg_basebackup -D /backups/base -Fp -X stream -c fast -P\npsql -c "CREATE TABLE important(id int); INSERT INTO important SELECT generate_series(1,1000);"\npsql -c "SELECT now();"            # e.g. 2025-10-29 10:15:00+00\npsql -c "DROP TABLE important;"\npsql -c "SELECT pg_switch_wal();"  # make sure the WAL with the DROP is archived\n\n# Restore into a new data directory\ncp -a /backups/base /var/lib/postgresql/pitr\ncat >> /var/lib/postgresql/pitr/postgresql.auto.conf <<EOF\nrestore_command = \'cp /archive/%f %p\'\nrecovery_target_time = \'2025-10-29 10:15:00+00\'\nrecovery_target_action = \'promote\'\nEOF\ntouch /var/lib/postgresql/pitr/recovery.signal\npg_ctl -D /var/lib/postgresql/pitr -o "-p 5433" start\npsql -p 5433 -c "SELECT count(*) FROM important;"   # 1000\npsql -p 5433 -c "SELECT timeline_id FROM pg_control_checkpoint();"   # new timeline (e.g. 2)\nProduction: use pgBackRest/WAL-G with S3 + encryption + retention, never cp without fsync, monitor pg_stat_archiver.'
        },
        {
          t: 'Implement envelope encryption in Go',
          d: 'medium', type: 'coding',
          hint: '<ul><li>Define a small <code>KMS</code> interface (GenerateDataKey, Decrypt) so AWS KMS, Key Vault or a test fake can plug in.</li><li>Encrypt with AES-256-GCM using a fresh DEK and random nonce; store the wrapped DEK with the ciphertext.</li><li>Use additional authenticated data (AAD), e.g. the object key, to bind ciphertext to context.</li><li>Zero plaintext keys after use and write a round-trip test with a fake KMS.</li></ul>',
          solution: 'package envelope\n\nimport (\n    "context"\n    "crypto/aes"\n    "crypto/cipher"\n    "crypto/rand"\n    "errors"\n)\n\ntype KMS interface {\n    GenerateDataKey(ctx context.Context, keyID string) (plaintext, wrapped []byte, err error)\n    Decrypt(ctx context.Context, wrapped []byte) ([]byte, error)\n}\n\ntype Envelope struct {\n    KeyID      string\n    WrappedDEK []byte\n    Nonce      []byte\n    Ciphertext []byte\n}\n\nfunc Seal(ctx context.Context, k KMS, keyID string, plaintext, aad []byte) (*Envelope, error) {\n    dek, wrapped, err := k.GenerateDataKey(ctx, keyID)\n    if err != nil {\n        return nil, err\n    }\n    defer clear(dek)\n    aead, err := newAEAD(dek)\n    if err != nil {\n        return nil, err\n    }\n    nonce := make([]byte, aead.NonceSize())\n    if _, err := rand.Read(nonce); err != nil {\n        return nil, err\n    }\n    return &Envelope{KeyID: keyID, WrappedDEK: wrapped, Nonce: nonce,\n        Ciphertext: aead.Seal(nil, nonce, plaintext, aad)}, nil\n}\n\nfunc Open(ctx context.Context, k KMS, env *Envelope, aad []byte) ([]byte, error) {\n    dek, err := k.Decrypt(ctx, env.WrappedDEK)\n    if err != nil {\n        return nil, err\n    }\n    defer clear(dek)\n    aead, err := newAEAD(dek)\n    if err != nil {\n        return nil, err\n    }\n    return aead.Open(nil, env.Nonce, env.Ciphertext, aad) // fails if data, nonce or AAD were tampered with\n}\n\nfunc newAEAD(key []byte) (cipher.AEAD, error) {\n    if len(key) != 32 {\n        return nil, errors.New("envelope: data key must be 256 bits")\n    }\n    block, err := aes.NewCipher(key)\n    if err != nil {\n        return nil, err\n    }\n    return cipher.NewGCM(block)\n}\n\n// LocalKMS wraps DEKs with an in-memory master key. FOR TESTS ONLY.\ntype LocalKMS struct{ Master []byte }\n\nfunc (l LocalKMS) GenerateDataKey(ctx context.Context, keyID string) ([]byte, []byte, error) {\n    dek := make([]byte, 32)\n    if _, err := rand.Read(dek); err != nil {\n        return nil, nil, err\n    }\n    aead, err := newAEAD(l.Master)\n    if err != nil {\n        return nil, nil, err\n    }\n    nonce := make([]byte, aead.NonceSize())\n    if _, err := rand.Read(nonce); err != nil {\n        return nil, nil, err\n    }\n    return dek, aead.Seal(nonce, nonce, dek, nil), nil // wrapped = nonce || ciphertext\n}\n\nfunc (l LocalKMS) Decrypt(ctx context.Context, wrapped []byte) ([]byte, error) {\n    aead, err := newAEAD(l.Master)\n    if err != nil {\n        return nil, err\n    }\n    n := aead.NonceSize()\n    if len(wrapped) < n {\n        return nil, errors.New("envelope: wrapped key too short")\n    }\n    return aead.Open(nil, wrapped[:n], wrapped[n:], nil)\n}\n\n// AWS KMS adapter (aws-sdk-go-v2/service/kms):\n//   out, err := client.GenerateDataKey(ctx, &kms.GenerateDataKeyInput{KeyId: aws.String(keyID), KeySpec: types.DataKeySpecAes256})\n//   return out.Plaintext, out.CiphertextBlob, err\n//   out, err := client.Decrypt(ctx, &kms.DecryptInput{CiphertextBlob: wrapped}); return out.Plaintext, err\n// Test: Seal then Open returns the plaintext; flipping one ciphertext byte or changing the AAD makes Open fail.',
          lang: 'go'
        },
        {
          t: 'Handle a GDPR erasure request when the data also lives in backups',
          d: 'medium', type: 'design',
          hint: '<ul><li>Find every copy: primary DB, replicas, caches, search, data lake, logs, third parties, backups.</li><li>What can be deleted immediately and what is "put beyond use"?</li><li>How do you make sure a restore does not resurrect the data?</li><li>How would crypto-shredding change the design?</li></ul>',
          solution: 'Process:\n1) Verify identity, log the request, deadline = one month.\n2) Use the data catalogue/lineage to locate PII for the subject: OLTP DB (and replicas automatically), Redis caches (invalidate), OpenSearch index (delete docs), data lake (Iceberg/Delta row-level delete + snapshot expiry + compaction so old files are physically removed), application logs (short retention or pseudonymised IDs), event streams (compacted topics with tombstones), processors/vendors (forward the request).\n3) Backups: immutable and short-lived (e.g. 35 days) - do not modify them; restrict access; they expire within the retention window. Record the subject ID in a suppression/deletion ledger stored outside the backups; every restore runbook re-applies pending deletions before the data goes live.\n4) Confirm to the user; keep minimal proof of deletion (request ID, date - no PII).\nCrypto-shredding alternative: encrypt each user\'s PII fields with a per-user DEK stored in a key table (wrapped by KMS); erasure = delete the user\'s key, instantly rendering every copy - including backups and lake files - unreadable. Trade-offs: key-management complexity, cannot index/search encrypted fields directly, must back up the key table carefully (with the same suppression logic).'
        },
        {
          t: 'Debug backups that "succeed" but cannot be restored',
          d: 'hard', type: 'debug',
          hint: '<ul><li>Look for silent gaps: archive_command that hides errors, lifecycle rules deleting WAL needed by the oldest base backup, retention mismatches.</li><li>Check encryption keys, credentials and permissions available in the restore environment.</li><li>Compare tool versions, missing config files, tablespaces and extensions.</li><li>Design verification so this is caught automatically.</li></ul>',
          solution: 'Common root causes found during a real restore:\n- archive_command = \'cp %p /mnt/archive/%f || true\' -> failures reported as success; WAL gap makes PITR impossible past the gap. Check pg_stat_archiver.failed_count and run pgbackrest check / wal-g wal-verify.\n- File-level copy (tar/rsync) of a running data directory without pg_backup_start/stop -> inconsistent backup.\n- An S3 lifecycle rule expires WAL after 7 days while base backups are kept 30 days -> old base backups cannot reach consistency.\n- KMS key used to encrypt backups was scheduled for deletion/disabled, or the DR account has no kms:Decrypt grant -> encrypted backups unreadable.\n- Restore host lacks extensions, tablespace paths, or the same major version; config files (pg_hba.conf, postgresql.conf) not backed up; secrets/certificates missing.\n- Backup job "succeeded" but backed up an empty mount (volume not mounted).\nFixes:\n- Use purpose-built tools (pgBackRest/WAL-G/Barman) with their verification commands; retention managed by the tool, not independent lifecycle rules.\n- Alert on archive failures, backup age, size anomalies (sudden drop/jump).\n- Key policies: deletion protection/waiting period, keys replicated to DR region, documented grants.\n- Automated weekly restore into an isolated environment + data validation (row counts, amcheck, app smoke tests), measuring RTO. Treat a failed restore test as a P1 incident.'
        },
        {
          t: 'Design backup and DR for a 10 TB PostgreSQL with RPO 5 min',
          d: 'hard', type: 'design',
          hint: '<ul><li>Requirements: RPO 5 min (region loss), RTO 1 h, protection against logical errors and ransomware, 35 days PITR, 1 year monthly retention.</li><li>Separate HA (replicas), DR (other region) and backup (history, immutability).</li><li>Estimate restore time for 10 TB and decide whether restore alone can meet RTO.</li><li>Specify tooling, schedules, storage classes, encryption, monitoring and testing.</li></ul>',
          solution: 'Layers:\n1) HA in-region: primary + 2 standbys across AZs, quorum synchronous replication (synchronous_standby_names = \'ANY 1 (s1, s2)\') -> RPO 0 for AZ loss, automatic failover (Patroni / CloudNativePG / RDS Multi-AZ) in < 1 min.\n2) DR region: asynchronous streaming standby (warm standby) -> RPO seconds, RTO minutes by promotion. Also continuous WAL archiving to object storage in the DR region (independent path) with archive_timeout = 60 s -> RPO <= ~1-2 min even if streaming breaks.\n3) Backups (logical errors, corruption, ransomware): pgBackRest/WAL-G from a standby (no primary load): weekly full, daily incremental (block-level), WAL archived continuously; zstd compression + encryption (KMS key with DR-region replica); repository in S3 / Azure Blob in a separate backup account with Object Lock COMPLIANCE 35 days and CRR to the DR region; monthly backups copied to Glacier Instant/Deep Archive (Azure Cool/Archive) for 1 year.\n4) Delayed standby (recovery_min_apply_delay = 1 h) for fast recovery from accidental DELETE/DROP without a 10 TB restore.\nRTO maths: restoring 10 TB at ~1 GB/s (parallel pgBackRest, large instance, gp3/io2 with high throughput) ~ 3 h + WAL replay -> restore alone does NOT meet 1 h. So region/AZ failures are handled by standby promotion (minutes); backups handle logical errors where a longer RTO is accepted, or the delayed replica provides < 1 h for recent mistakes.\nMonitoring: replication lag (seconds and bytes), archive lag/failures, backup age, repository size, Object Lock status.\nTesting: weekly automated restore of latest backup + PITR to a random timestamp into an isolated account, amcheck + row counts; quarterly regional failover drill measuring RPO/RTO; runbooks in Git.'
        },
        {
          t: 'Design ransomware-resilient backups for a multi-account cloud organisation',
          d: 'hard', type: 'design',
          hint: '<ul><li>Assume an attacker has admin in a production account for two weeks before detonating.</li><li>Isolation: separate backup account/subscription, separate identity, break-glass only.</li><li>Immutability: Vault Lock / Object Lock compliance, Azure immutable vaults; key protection.</li><li>Detection, retention long enough for dwell time, clean-room restore, and drills.</li></ul>',
          solution: 'Architecture:\n- Dedicated backup accounts (AWS Organizations OU) / subscriptions (Azure management group) with no trust from production identities; access only via break-glass roles with MFA and multi-party approval; SCPs/Azure Policy deny disabling backups, deleting vaults or changing lock settings.\n- AWS Backup with cross-account copy into a vault protected by Vault Lock (compliance), or a logically air-gapped vault; S3 Object Lock COMPLIANCE for application exports; Azure Backup immutable vault (locked) + soft delete + multi-user authorization via Resource Guard; Azure immutable blob policies.\n- Copies in a second region (3-2-1-1-0), plus a periodic offline/third-party copy for the crown jewels.\n- Encryption keys: CMKs owned by the backup account; key deletion requires waiting period + alarms; production principals cannot schedule deletion.\n- Retention >= expected dwell time (e.g. 35-90 days daily, monthly for a year) so a clean point predates compromise.\nDetection: GuardDuty/Defender alerts, CloudTrail/Activity Log alarms on DeleteRecoveryPoint, PutBackupVaultAccessPolicy, lifecycle changes; anomaly detection on change rate (encrypted data looks like 100% changed blocks) and backup size.\nRecovery: clean-room account/VNet, restore into isolated network, malware scan, validate, then reconnect; IaC to rebuild infrastructure; documented RTO per tier.\nProve it: quarterly ransomware game day restoring a tier-0 system from the locked vault with production credentials assumed compromised.'
        }
      ],
      interviewFocus: [
        {
          q: 'Snapshot vs backup: what is the difference and when is a snapshot enough?',
          a: '<p>A <strong>snapshot</strong> is a point-in-time image created by the storage layer (CoW or block-incremental). It is fast to create and restore but shares the <strong>failure domain</strong> (array, pool, sometimes account/region) and the <strong>security domain</strong> (same credentials) with the source. A <strong>backup</strong> is an independent copy in a different system, account and location, with its own retention and ideally immutability.</p>' +
            '<ul><li>Snapshot is enough for: quick rollback of a bad deploy or migration, cloning test environments, short-term protection between backups.</li>' +
            '<li>Not enough for: array/pool loss, account compromise, ransomware, region outage, long-term retention and compliance.</li></ul>' +
            '<p>Cloud nuance: EBS/Azure Disk snapshots live in regional object storage, so they survive disk failure, but still share account and region. Copy them cross-account and cross-region into a locked vault and test restores — then they are backups. Also note consistency: snapshots are crash-consistent unless the application is quiesced.</p>'
        },
        {
          q: 'Design backup and DR for a 10 TB PostgreSQL database with RPO 5 minutes and RTO 1 hour.',
          a: '<ul><li><strong>Separate concerns</strong>: HA (in-region replicas, sync quorum, automatic failover), DR (async standby in another region + independent WAL archive), backup (history for logical errors, ransomware).</li>' +
            '<li><strong>RPO 5 min</strong>: streaming replication to the DR region (seconds) plus WAL archiving with <code>archive_timeout = 60</code> as a second path; alert when lag approaches the budget.</li>' +
            '<li><strong>RTO 1 h</strong>: 10 TB restore takes hours even at 1 GB/s, so meet RTO by <strong>promoting a standby</strong>; use backups/PITR for logical recovery and a <strong>delayed replica</strong> for fast undo.</li>' +
            '<li><strong>Backups</strong>: pgBackRest/WAL-G from a standby, weekly full + daily incremental, encrypted with KMS, in a separate account with Object Lock and cross-region copy, tiered for long retention.</li>' +
            '<li><strong>Prove it</strong>: automated restore + PITR tests, regular failover drills, monitoring for archive failures and backup age.</li></ul>'
        },
        {
          q: 'How do you protect backups against ransomware?',
          a: '<ol><li><strong>Immutability</strong>: S3 Object Lock in Compliance mode, AWS Backup Vault Lock, Azure immutable storage / immutable Backup vaults — retention cannot be shortened even by root.</li>' +
            '<li><strong>Isolation</strong>: separate account/subscription and identity plane, no standing admin, MFA + multi-party approval for destructive operations, guardrail policies (SCP / Azure Policy).</li>' +
            '<li><strong>3-2-1-1-0</strong>: multiple copies, another region, one immutable/offline, zero verification errors.</li>' +
            '<li><strong>Key protection</strong>: KMS keys owned by the backup account; deletion waiting periods and alarms (attackers may try to destroy keys instead of data).</li>' +
            '<li><strong>Retention longer than attacker dwell time</strong>, plus detection of mass deletions and abnormal change rates.</li>' +
            '<li><strong>Clean-room restores</strong> and regular drills.</li></ol>'
        },
        {
          q: 'Explain envelope encryption and how key rotation works.',
          a: '<p>Data is encrypted locally with a random <strong>DEK</strong>; the DEK is wrapped by a <strong>KEK</strong> held in KMS/HSM and the wrapped DEK is stored with the ciphertext. To read, the service asks KMS to unwrap the DEK (policy-checked and audited), decrypts locally, and discards the DEK.</p>' +
            '<ul><li><strong>Benefits</strong>: bulk data never goes to KMS; per-object keys limit blast radius; centralised access control and audit; revocation by disabling the KEK.</li>' +
            '<li><strong>KEK rotation</strong>: new key material for new wraps; old material retained to unwrap existing DEKs (AWS KMS automatic rotation) — no bulk re-encryption needed. Optionally re-wrap DEKs lazily.</li>' +
            '<li><strong>DEK rotation</strong> (re-encrypting data) is needed only if a DEK is suspected compromised or by policy.</li>' +
            '<li><strong>Crypto-shredding</strong>: destroying a key renders all data under it unreadable — a deletion tool, and a risk if done accidentally to backup keys.</li></ul>'
        },
        {
          q: 'How do you prove that your backups actually work?',
          a: '<ul><li><strong>Automated restore tests</strong> on a schedule (e.g. weekly) into an isolated environment, including PITR to a random timestamp.</li>' +
            '<li><strong>Content validation</strong>: checksums, row counts versus production, <code>amcheck</code>/<code>pg_checksums</code>, application smoke tests — not just "job exit code 0".</li>' +
            '<li><strong>Measure</strong> achieved RTO and RPO against targets and trend them as data grows.</li>' +
            '<li><strong>Monitor</strong> backup age, size anomalies, WAL archive failures, vault lock status, key health.</li>' +
            '<li><strong>Game days</strong>: full regional failover and ransomware scenarios with runbooks, done by people other than the author.</li>' +
            '<li><strong>Treat failed restore tests as incidents</strong> with postmortems.</li></ul>'
        }
      ],
      quiz: [
        { q: 'RPO vs RTO?', a: 'RPO is the maximum acceptable data loss measured in time; RTO is the maximum acceptable time to restore service.' },
        { q: 'Incremental vs differential backup?', a: 'Incremental captures changes since the last backup of any type; differential captures changes since the last full backup.' },
        { q: 'What is a synthetic full backup?', a: 'A full backup assembled on the backup system from a previous full plus incrementals, without reading the source again.' },
        { q: 'What does 3-2-1-1-0 stand for?', a: '3 copies, 2 media types, 1 off-site, 1 offline or immutable, 0 errors after restore verification.' },
        { q: 'S3 Object Lock governance vs compliance mode?', a: 'Governance can be bypassed by users with special permission; compliance cannot be shortened or removed by anyone, including root, until retention expires.' },
        { q: 'What bounds RPO when using PostgreSQL WAL archiving alone?', a: 'WAL not yet archived: the current partially filled segment, bounded by archive_timeout, plus any archiving lag.' },
        { q: 'Why does envelope encryption make key rotation cheap?', a: 'Rotating the KEK only affects how small DEKs are wrapped; old key material still unwraps existing DEKs, so bulk data need not be re-encrypted.' },
        { q: 'What is crypto-shredding?', a: 'Deleting the encryption key so every copy of the data encrypted under it, including in backups, becomes unreadable.' }
      ],
      resources: [
        { title: 'PostgreSQL — Continuous Archiving and Point-in-Time Recovery', url: 'https://www.postgresql.org/docs/current/continuous-archiving.html', type: 'docs' },
        { title: 'Amazon S3 — Locking objects with Object Lock', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html', type: 'docs' },
        { title: 'AWS Whitepaper — Disaster recovery options in the cloud', url: 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html', type: 'docs' },
        { title: 'Azure — Immutable storage for blob data', url: 'https://learn.microsoft.com/azure/storage/blobs/immutable-storage-overview', type: 'docs' }
      ]
    }
  ],
  flashcards: [
    { q: 'Random IOPS of a 7,200 RPM HDD and why?', a: 'About 75-150: each random I/O pays an average seek (~4-9 ms) plus half a rotation (~4.17 ms).', d: 1 },
    { q: 'Little\'s law for storage?', a: 'Queue depth = IOPS x latency, so IOPS = QD / latency. QD 1 at 0.5 ms caps out at 2,000 IOPS.', d: 2 },
    { q: 'Throughput formula?', a: 'Throughput = IOPS x block size (e.g. 3,000 IOPS x 16 KiB = ~47 MiB/s).', d: 1 },
    { q: 'What is SSD write amplification?', a: 'NAND bytes written / host bytes written; caused by garbage collection copying valid pages before erasing blocks. Worse on full drives and with small random writes.', d: 2 },
    { q: 'What do TRIM and over-provisioning do?', a: 'TRIM tells the SSD which blocks are free; over-provisioning reserves hidden space. Both reduce GC copying, write amplification and latency spikes.', d: 2 },
    { q: 'NVMe vs SATA beyond bandwidth?', a: 'NVMe uses PCIe with up to 64K queues of 64K commands (per-CPU, lock-free) versus AHCI\'s single 32-command queue, so it delivers far more parallel IOPS and lower latency.', d: 2 },
    { q: 'Block vs file vs object in one line each?', a: 'Block: raw LBA device for one host (databases). File: shared POSIX tree over NFS/SMB (many hosts). Object: immutable blobs by key over HTTP (massive scale, cheapest).', d: 1 },
    { q: 'S3 consistency model?', a: 'Strong read-after-write for PUT/DELETE and LIST since Dec 2020; no multi-object transactions; use If-None-Match / If-Match conditional writes for concurrency control.', d: 2 },
    { q: 'NFS close-to-open consistency?', a: 'Writes are flushed on close() and caches revalidated on open(); other clients see changes only after they reopen the file.', d: 2 },
    { q: 'RAID 6 with 8 x 4 TB?', a: '24 TB usable, survives any 2 disk failures, write penalty 6.', d: 1 },
    { q: 'RAID write penalties?', a: 'RAID 0: 1, RAID 1/10: 2, RAID 5: 4, RAID 6: 6 back-end I/Os per small random write.', d: 1 },
    { q: 'RS(10,4) vs 3x replication?', a: 'RS(10,4): 1.4x overhead, tolerates 4 losses, repair reads 10 fragments. 3x: 3x overhead, tolerates 2 losses, repair reads 1 copy.', d: 2 },
    { q: 'Biggest lever on replicated-system durability?', a: 'Mean time to repair: fast, parallel re-replication shrinks the window in which further failures cause loss. Correlated failures still require backups.', d: 3 },
    { q: 'Why are checksums stored apart from data (ZFS)?', a: 'So misdirected or lost writes are detected: a block carrying its own checksum could look valid at the wrong location. Parent pointers holding child checksums form a Merkle tree.', d: 3 },
    { q: 'Steps for a crash-safe atomic file replace?', a: 'Write temp file in same dir -> fsync temp -> rename over target -> fsync the directory.', d: 2 },
    { q: 'What was fsyncgate?', a: 'Linux could mark pages clean after a failed writeback, so a retried fsync "succeeded" while data was lost. PostgreSQL now PANICs on fsync failure and recovers from WAL.', d: 3 },
    { q: 'ext4 data=ordered?', a: 'Default mode: only metadata is journaled, but data blocks are written before the metadata commit, so files never expose stale blocks after a crash.', d: 2 },
    { q: 'B+tree vs LSM-tree in one line?', a: 'B+tree: in-place page updates, low read amplification, random writes. LSM: sequential writes via memtable + SSTables + compaction, high write throughput, higher read/space amplification.', d: 2 },
    { q: 'Leveled vs size-tiered compaction?', a: 'Leveled: low read and space amp, high write amp (10-30x). Size-tiered: low write amp, higher space (up to 2x) and read amp.', d: 3 },
    { q: 'Bloom filter sizing rule of thumb?', a: 'About 10 bits per key gives ~1% false positives; each extra ~4.8 bits/key cuts it 10x.', d: 3 },
    { q: 'What is the WAL rule?', a: 'Log a change durably before writing the modified data page; a transaction is committed when its commit record is flushed.', d: 2 },
    { q: 'Why do random UUIDv4 primary keys hurt InnoDB?', a: 'Rows are clustered by PK, so random keys cause page splits, half-empty pages and a working set as large as the table; UUIDv7 or sequential IDs append at the right edge.', d: 2 },
    { q: 'Quorum condition and its main limitation?', a: 'W + R > N guarantees read/write overlap, but it is not linearizable on its own (in-flight writes, sloppy quorums, last-write-wins clock skew).', d: 3 },
    { q: 'How does Ceph locate an object?', a: 'hash(object) mod pg_num -> placement group, then CRUSH(PG, cluster map, rule) -> ordered OSD list; clients compute it without a lookup service.', d: 3 },
    { q: 'Why use WaitForFirstConsumer?', a: 'It provisions zonal volumes only after the pod is scheduled, so the disk lands in a zone where the pod can run, avoiding volume node affinity conflicts.', d: 2 },
    { q: 'RWO vs RWOP vs RWX?', a: 'RWO: read-write on one node; RWOP: exactly one pod; RWX: read-write from many nodes (EFS, Azure Files, CephFS).', d: 1 },
    { q: 'S3 minimum storage durations?', a: 'Standard-IA/One Zone-IA 30 days, Glacier Instant and Flexible 90 days, Deep Archive 180 days.', d: 2 },
    { q: 'Snapshot vs backup?', a: 'A snapshot shares the failure and security domain with its source (fast rollback); a backup is an independent, ideally immutable copy in another account/region, verified by restores.', d: 1 },
    { q: 'What is 3-2-1-1-0?', a: '3 copies, 2 media, 1 off-site, 1 offline or immutable, 0 errors after verified restores.', d: 1 },
    { q: 'Envelope encryption?', a: 'Data encrypted with a per-object DEK; the DEK is wrapped by a KEK in KMS/HSM and stored with the ciphertext. KEK rotation does not re-encrypt data.', d: 2 },
    { q: 'NVMe ZNS vs FDP?', a: 'ZNS: the host writes zones sequentially and resets them, does GC itself, device WAF ~1. FDP: the drive keeps its FTL but the host tags writes with placement handles so data with similar lifetimes shares erase units.', d: 3 },
    { q: 'Snapshot isolation vs Serializable?', a: 'SI: consistent snapshot, aborts only on write-write conflicts, allows write skew. Serializable (PostgreSQL SSI): also tracks read-write dependencies and aborts one transaction of a dangerous cycle; clients retry on SQLSTATE 40001.', d: 3 },
    { q: 'Three jobs of PostgreSQL VACUUM?', a: 'Remove dead tuples (and their index entries) so space can be reused, maintain the visibility map (all-visible / all-frozen), and freeze old XIDs to prevent wraparound.', d: 2 },
    { q: 'What prevents VACUUM from removing dead tuples?', a: 'Anything holding back the xmin horizon: long or idle-in-transaction sessions, stale replication slots, hot_standby_feedback from standbys, forgotten prepared transactions.', d: 2 },
    { q: 'Iceberg metadata tree?', a: 'Catalog pointer -> metadata.json (schema, partition spec, snapshots) -> manifest list -> manifests (data files + column stats) -> Parquet data and delete files.', d: 3 },
    { q: 'Copy-on-write vs merge-on-read in table formats?', a: 'CoW rewrites affected data files on update/delete (slow writes, fast reads); MoR writes delete files or deletion vectors that readers merge until compaction (fast writes, slower reads).', d: 2 },
    { q: 'Kafka tiered storage: local.retention vs retention?', a: 'local.retention.ms/bytes bounds what stays on broker disks; retention.ms/bytes is the total, with older closed segments served from object storage (KIP-405, production-ready since Kafka 3.9).', d: 2 }
  ]
});
