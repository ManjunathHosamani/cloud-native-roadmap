// Interactive labs ("kind: 'widget'" visuals). Each lab registers
//   registerWidget(name, { render(cfg, uid) -> html, onAction(body, action, el, cfg), onInput(body, event, cfg) })
// diagrams.js delegates events: clicks on [data-wa] call onAction, input/change events call onInput.
// Per-instance state lives on the .dg-wbody element (body._s). Nothing here touches the DOM at load time.
(function () {
  'use strict';

  // ===== Helpers =============================================================
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const COLORS = ['blue', 'green', 'orange', 'purple', 'teal', 'red', 'yellow', 'gray'];
  const wi = (b, name) => b.querySelector('[data-wi="' + name + '"]');
  const val = (b, name, d) => { const el = wi(b, name); const n = el ? parseFloat(el.value) : NaN; return Number.isFinite(n) ? n : d; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fmt = (n, d) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d == null ? 2 : d });
  const out = (b) => b.querySelector('.w-out');
  const stateOf = (b, init) => b._s || (b._s = init());
  const kv = (k, v, cls) => '<div class="w-kv"><span>' + esc(k) + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</b></div>';
  const field = (label, inner) => '<label class="w-f"><span>' + esc(label) + '</span>' + inner + '</label>';
  const numIn = (name, value, extra) => '<input class="w-in w-num" type="number" data-wi="' + name + '" value="' + value + '"' + (extra || '') + '>';
  const rangeIn = (name, value, min, max, step) => '<input class="w-in" type="range" data-wi="' + name + '" value="' + value + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '">';
  const select = (name, opts, cur) => '<select class="w-in" data-wi="' + name + '">' + opts.map((o) => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  const btn = (action, label, extra, cls) => '<button type="button" class="btn-xs' + (cls ? ' ' + cls : '') + '" data-wa="' + action + '"' + (extra || '') + '>' + label + '</button>';
  const logHtml = (lines) => '<div class="w-log">' + (lines.length ? lines.map((l) => '<div class="' + (l.cls || '') + '">' + esc(l.t) + '</div>').join('') : '<div>No events yet.</div>') + '</div>';
  const pushLog = (s, t, cls, max) => { s.log.unshift({ t, cls }); s.log.length = Math.min(s.log.length, max || 10); };

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    // murmur3 finalizer: FNV-1a alone spreads short, similar keys ("key1", "key2") poorly around the ring.
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  // mulberry32: tiny seeded PRNG so simulations are reproducible.
  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dur(sec) {
    const a = Math.abs(sec);
    if (a < 1e-6) return fmt(sec * 1e9, 1) + ' ns';
    if (a < 1e-3) return fmt(sec * 1e6, 1) + ' µs';
    if (a < 1) return fmt(sec * 1e3, 1) + ' ms';
    if (a < 60) return fmt(sec, 1) + ' s';
    if (a < 3600) return fmt(sec / 60, 1) + ' min';
    if (a < 86400) return fmt(sec / 3600, 1) + ' h';
    if (a < 86400 * 365) return fmt(sec / 86400, 1) + ' days';
    return fmt(sec / (86400 * 365), 1) + ' years';
  }
  function bytes(b) {
    const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    let i = 0;
    while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; }
    return fmt(b, b < 10 ? 2 : b < 100 ? 1 : 0) + ' ' + u[i];
  }
  function si(n) {
    const u = ['', 'K', 'M', 'B', 'T'];
    let i = 0;
    while (Math.abs(n) >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return fmt(n, n < 10 ? 2 : n < 100 ? 1 : 0) + u[i];
  }
  // Starts a repeating timer for this widget instance; it stops itself once the widget leaves the page
  // or when fn() returns false.
  function ticker(b, fn, ms) {
    if (b._t) return;
    b._t = setInterval(() => {
      if (!b.isConnected || fn() === false) { clearInterval(b._t); b._t = null; }
    }, ms);
  }

  // ===== 1. CIDR / subnet calculator =========================================
  const ipStr = (n) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  function parseCidr(s) {
    const m = /^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*\/\s*(\d{1,2})\s*$/.exec(s || '');
    if (!m) return null;
    const o = m.slice(1, 5).map(Number);
    const p = Number(m[5]);
    if (o.some((x) => x > 255) || p > 32) return null;
    const ip = (o[0] * 16777216 + o[1] * 65536 + o[2] * 256 + o[3]) >>> 0;
    const mask = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
    const net = (ip & mask) >>> 0;
    const bc = (net | (~mask >>> 0)) >>> 0;
    return { ip, p, mask, net, bc, size: Math.pow(2, 32 - p) };
  }
  function ipKind(n) {
    const inR = (base, p) => ((n & (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0)) >>> 0) === base;
    if (inR(0x0a000000, 8) || inR(0xac100000, 12) || inR(0xc0a80000, 16)) return 'Private (RFC 1918)';
    if (inR(0x64400000, 10)) return 'Carrier-grade NAT (RFC 6598)';
    if (inR(0x7f000000, 8)) return 'Loopback';
    if (inR(0xa9fe0000, 16)) return 'Link-local (169.254/16)';
    if (inR(0xe0000000, 4)) return 'Multicast';
    return 'Public';
  }
  function bitsHtml(n, p) {
    let h = '';
    for (let i = 0; i < 32; i++) {
      if (i && i % 8 === 0) h += '<i class="sep">.</i>';
      h += '<i class="' + (i < p ? 'n' : 'h') + '">' + ((n >>> (31 - i)) & 1) + '</i>';
    }
    return h;
  }
  function cidrView(text, split) {
    const c = parseCidr(text);
    if (!c) return '<p class="w-bad">Enter an IPv4 CIDR such as 10.0.0.0/24 (octets 0–255, prefix 0–32).</p>';
    const usable = c.p === 32 ? 1 : c.p === 31 ? 2 : c.size - 2;
    const first = c.p >= 31 ? c.net : c.net + 1;
    const last = c.p >= 31 ? c.bc : c.bc - 1;
    let h = '';
    if (c.ip !== c.net) h += '<p class="w-warn">Host bits are set: ' + esc(ipStr(c.ip)) + ' is inside the network ' + esc(ipStr(c.net) + '/' + c.p) + '.</p>';
    h += '<div class="w-grid">' + kv('Network', ipStr(c.net) + '/' + c.p) + kv('Broadcast', c.p >= 31 ? '— (none)' : ipStr(c.bc)) +
      kv('Netmask', ipStr(c.mask)) + kv('Wildcard', ipStr(~c.mask >>> 0)) + kv('First usable', ipStr(first)) + kv('Last usable', ipStr(last)) +
      kv('Usable hosts', fmt(usable, 0) + (c.p === 31 ? ' (RFC 3021 point-to-point)' : c.p === 32 ? ' (single host route)' : '')) +
      kv('Total addresses', fmt(c.size, 0) + ' = 2^' + (32 - c.p)) + kv('Type', esc(ipKind(c.net))) + '</div>';
    h += '<div class="cidr-bits"><div><span>Address</span><span class="w-mono">' + bitsHtml(c.ip, c.p) + '</span></div>' +
      '<div><span>Mask</span><span class="w-mono">' + bitsHtml(c.mask, c.p) + '</span></div></div>' +
      '<p class="w-note"><span class="cidr-key n">network bits (' + c.p + ')</span> <span class="cidr-key h">host bits (' + (32 - c.p) + ')</span> — ' +
      'the network address has all host bits 0, the broadcast address all host bits 1. Each extra prefix bit halves the block. AWS and Azure reserve 5 addresses in every subnet, so a cloud /24 has 251 usable.</p>';
    const k = Math.log2(split);
    const np = c.p + k;
    h += '<div class="w-sub">Split ' + esc(ipStr(c.net) + '/' + c.p) + ' into ' + split + ' subnets</div>';
    if (np > 32) return h + '<p class="w-bad">Not possible: /' + c.p + ' has only ' + (32 - c.p) + ' host bits; ' + split + ' subnets need ' + k + '.</p>';
    const size = Math.pow(2, 32 - np);
    const rows = [];
    for (let i = 0; i < Math.min(split, 16); i++) {
      const n = c.net + i * size;
      const u = np === 32 ? 1 : np === 31 ? 2 : size - 2;
      rows.push('<tr><td class="w-mono">' + ipStr(n) + '/' + np + '</td><td class="w-mono">' + ipStr(np >= 31 ? n : n + 1) + ' – ' + ipStr(np >= 31 ? n + size - 1 : n + size - 2) + '</td><td>' + fmt(u, 0) + '</td></tr>');
    }
    h += '<p class="w-note">Borrow ' + k + ' host bit' + (k > 1 ? 's' : '') + ' → prefix /' + np + ', ' + fmt(size, 0) + ' addresses each.</p>' +
      '<table class="w-table"><thead><tr><th>Subnet</th><th>Usable range</th><th>Hosts</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>' +
      (split > 16 ? '<p class="w-note">…and ' + (split - 16) + ' more.</p>' : '');
    return h;
  }
  registerWidget('cidr', {
    render(cfg) {
      const c = cfg.cidr || '10.0.0.0/24';
      const split = cfg.split || 4;
      return '<div class="w-row">' + field('CIDR', '<input class="w-in mono" data-wi="cidr" value="' + esc(c) + '" spellcheck="false" size="18">') +
        field('Split into', select('split', [2, 4, 8, 16, 32, 64].map((n) => [n, n + ' subnets']), split)) + '</div>' +
        '<div class="w-row">' + ['192.168.1.0/24', '10.0.0.0/16', '172.16.5.77/20', '10.1.2.0/31', '100.64.0.0/10'].map((p) => btn('preset', esc(p), ' data-v="' + p + '"')).join('') + '</div>' +
        '<div class="w-out">' + cidrView(c, split) + '</div>';
    },
    onInput(b) { out(b).innerHTML = cidrView(wi(b, 'cidr').value, val(b, 'split', 4)); },
    onAction(b, a, el) { if (a === 'preset') { wi(b, 'cidr').value = el.dataset.v; this.onInput(b); } },
  });

  // ===== 2. Consistent hashing ring ==========================================
  const RING_KEYS = Array.from({ length: 48 }, (_, i) => 'key' + (i + 1));
  const LETTERS = 'ABCDEFGH';
  const nodeColor = (n) => COLORS[LETTERS.indexOf(n)];
  function ringPoints(nodes, v) {
    const pts = [];
    nodes.forEach((n) => { for (let i = 0; i < v; i++) pts.push({ pos: fnv1a(n + '#vn' + i), node: n }); });
    return pts.sort((a, b) => a.pos - b.pos);
  }
  function ringAssign(nodes, v) {
    const pts = ringPoints(nodes, v);
    const map = {};
    RING_KEYS.forEach((k) => {
      const h = fnv1a(k);
      const p = pts.find((x) => x.pos >= h) || pts[0]; // first point clockwise, wrapping around
      map[k] = p.node;
    });
    return map;
  }
  function modAssign(nodes) {
    const map = {};
    RING_KEYS.forEach((k) => { map[k] = nodes[fnv1a(k) % nodes.length]; });
    return map;
  }
  function ringInit(cfg) { return { nodes: ['A', 'B', 'C'], v: cfg.vnodes || 1, last: null }; }
  function ringChange(s, nodes, v, label) {
    const before = ringAssign(s.nodes, s.v);
    const after = ringAssign(nodes, v);
    const moved = RING_KEYS.filter((k) => before[k] !== after[k]);
    let modMoved = null;
    if (nodes.length !== s.nodes.length) {
      const mb = modAssign(s.nodes), ma = modAssign(nodes);
      modMoved = RING_KEYS.filter((k) => mb[k] !== ma[k]).length;
    }
    s.nodes = nodes; s.v = v;
    s.last = { label, moved, modMoved };
  }
  function ringView(s) {
    const pts = ringPoints(s.nodes, s.v);
    const map = ringAssign(s.nodes, s.v);
    const C = 150, R = 118, KR = 96;
    const xy = (pos, r) => { const a = (pos / 4294967296) * 2 * Math.PI - Math.PI / 2; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
    const moved = new Set(s.last ? s.last.moved : []);
    let svg = '<svg class="w-svg ring" viewBox="0 0 300 300" role="img" aria-label="Hash ring"><circle class="ring-c" cx="150" cy="150" r="' + R + '"/>';
    pts.forEach((p) => {
      const [x, y] = xy(p.pos, R);
      svg += '<g class="c-' + nodeColor(p.node) + '"><circle class="ring-vn" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (s.v > 10 ? 3.5 : 6) + '"/>';
      if (s.v <= 3) { const [lx, ly] = xy(p.pos, R + 15); svg += '<text class="ring-lbl" x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '">' + p.node + '</text>'; }
      svg += '</g>';
    });
    RING_KEYS.forEach((k) => {
      const [x, y] = xy(fnv1a(k), KR);
      svg += '<circle class="ring-key c-' + nodeColor(map[k]) + (moved.has(k) ? ' mv' : '') + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (moved.has(k) ? 5 : 3.6) + '"><title>' + k + ' → ' + map[k] + '</title></circle>';
    });
    svg += '<text class="ring-mid" x="150" y="146">' + s.nodes.length + ' nodes × ' + s.v + ' vnode' + (s.v > 1 ? 's' : '') + '</text><text class="ring-mid sub" x="150" y="162">' + RING_KEYS.length + ' keys (inner dots)</text></svg>';
    const counts = {};
    s.nodes.forEach((n) => { counts[n] = 0; });
    RING_KEYS.forEach((k) => { counts[map[k]]++; });
    const ideal = RING_KEYS.length / s.nodes.length;
    const max = Math.max.apply(null, Object.values(counts));
    let bars = '<div class="ring-bars">' + s.nodes.map((n) => '<div class="ring-bar c-' + nodeColor(n) + '"><span>' + n + '</span><div class="w-bar"><i style="width:' + (counts[n] / RING_KEYS.length) * 100 + '%"></i></div><b>' + counts[n] + '</b>' +
      (s.nodes.length > 1 ? '<button type="button" class="btn-xs" data-wa="remove" data-v="' + n + '" aria-label="Remove node ' + n + '">✕</button>' : '') + '</div>').join('') + '</div>';
    bars += '<p class="w-note">Ideal ≈ ' + fmt(ideal, 1) + ' keys per node; the busiest node has ' + max + ' (' + fmt(max / ideal, 2) + '× ideal). More virtual nodes smooth this out.</p>';
    let msg = '';
    if (s.last) {
      msg = '<p class="ring-msg"><b>' + esc(s.last.label) + ':</b> consistent hashing moved <b class="w-ok">' + s.last.moved.length + ' / ' + RING_KEYS.length + '</b> keys (highlighted)';
      if (s.last.modMoved !== null) msg += '; <code>hash % N</code> would have moved <b class="w-bad">' + s.last.modMoved + ' / ' + RING_KEYS.length + '</b>';
      msg += '.</p>';
    }
    return '<div class="ring-wrap">' + svg + '<div>' + msg + bars + '</div></div>';
  }
  registerWidget('hashring', {
    render(cfg) {
      const s = ringInit(cfg);
      return '<div class="w-row">' + btn('add', '➕ Add node', '', 'primary') + field('Virtual nodes per server', rangeIn('vnodes', s.v, 1, 50)) + '<span class="w-mono ring-vv">' + s.v + '</span></div>' +
        '<div class="w-out">' + ringView(s) + '</div>' +
        '<p class="w-note">Servers and keys are hashed onto the same ring (FNV-1a + a mixing step). A key belongs to the first server point clockwise from it, so adding or removing a server only moves the keys in its arcs, about 1/N of them. With <code>hash % N</code>, changing N remaps almost every key.</p>';
    },
    onAction(b, a, el, cfg) {
      const s = stateOf(b, () => ringInit(cfg));
      if (a === 'add') {
        const next = LETTERS.split('').find((l) => !s.nodes.includes(l));
        if (!next) return;
        ringChange(s, s.nodes.concat(next), s.v, 'Added node ' + next);
      } else if (a === 'remove') {
        ringChange(s, s.nodes.filter((n) => n !== el.dataset.v), s.v, 'Removed node ' + el.dataset.v);
      }
      out(b).innerHTML = ringView(s);
    },
    onInput(b, e, cfg) {
      if (e.target.dataset.wi !== 'vnodes') return;
      const s = stateOf(b, () => ringInit(cfg));
      const v = clamp(Math.round(val(b, 'vnodes', 1)), 1, 50);
      b.querySelector('.ring-vv').textContent = v;
      if (v !== s.v) ringChange(s, s.nodes, v, 'Virtual nodes → ' + v);
      out(b).innerHTML = ringView(s);
    },
  });

  // ===== 3. Rate limiter =====================================================
  const RL_ALGOS = [['token', 'Token bucket'], ['fixed', 'Fixed window counter'], ['log', 'Sliding window log'], ['counter', 'Sliding window counter']];
  const nowS = () => Date.now() / 1000;
  function rlInit(cfg, algo, limit, win) {
    const t = nowS();
    return { algo: algo || cfg.algo || 'token', limit: limit || cfg.limit || 5, win: win || cfg.window || 5, tokens: limit || cfg.limit || 5, last: t, t0: t,
      count: 0, prev: 0, winStart: Math.floor(t / (win || cfg.window || 5)) * (win || cfg.window || 5), times: [], ok: 0, rej: 0, log: [] };
  }
  function rlRefresh(s, t) {
    s.tokens = Math.min(s.limit, s.tokens + (t - s.last) * (s.limit / s.win));
    s.last = t;
    const ws = Math.floor(t / s.win) * s.win;
    if (ws !== s.winStart) { s.prev = ws - s.winStart === s.win ? s.count : 0; s.count = 0; s.winStart = ws; }
    s.times = s.times.filter((x) => x > t - s.win);
  }
  function rlRequest(s) {
    const t = nowS();
    rlRefresh(s, t);
    let ok, detail;
    if (s.algo === 'token') { ok = s.tokens >= 1; detail = 'tokens ' + fmt(s.tokens, 1) + (ok ? ' → ' + fmt(s.tokens - 1, 1) : ' < 1'); if (ok) s.tokens -= 1; }
    else if (s.algo === 'fixed') { ok = s.count < s.limit; detail = 'window count ' + s.count + '/' + s.limit; if (ok) s.count++; }
    else if (s.algo === 'log') { ok = s.times.length < s.limit; detail = s.times.length + ' requests in the last ' + s.win + 's'; if (ok) s.times.push(t); }
    else {
      const frac = (t - s.winStart) / s.win;
      const est = s.prev * (1 - frac) + s.count;
      ok = est < s.limit; detail = 'estimate ' + fmt(est, 2) + ' (limit ' + s.limit + ')';
      if (ok) s.count++;
    }
    if (ok) s.ok++; else s.rej++;
    pushLog(s, 't=' + (t - s.t0).toFixed(2) + 's  ' + (ok ? '✓ 200 allowed' : '✗ 429 Too Many Requests') + '  — ' + detail, ok ? 'w-ok' : 'w-bad', 12);
  }
  function slots(n, fills) {
    return '<div class="rl-slots">' + Array.from({ length: n }, (_, i) => '<span class="rl-slot"><i style="width:' + clamp(fills(i), 0, 1) * 100 + '%"></i></span>').join('') + '</div>';
  }
  function rlView(s) {
    const t = nowS();
    rlRefresh(s, t);
    let h = '<div class="w-grid">' + kv('Allowed', s.ok, 'w-ok') + kv('Rejected (429)', s.rej, 'w-bad') + kv('Nominal rate', s.limit + ' per ' + s.win + 's') + '</div>';
    if (s.algo === 'token') {
      h += '<div class="w-sub">Bucket: ' + fmt(s.tokens, 2) + ' / ' + s.limit + ' tokens, refilling ' + fmt(s.limit / s.win, 2) + '/s</div>' + slots(s.limit, (i) => s.tokens - i) +
        '<p class="w-note">Each request takes one token. Bursts up to the bucket size are allowed, then requests are limited to the refill rate. Used by AWS API Gateway, Envoy and golang.org/x/time/rate.</p>';
    } else if (s.algo === 'fixed') {
      const frac = (t - s.winStart) / s.win;
      h += '<div class="w-sub">Current window: ' + s.count + ' / ' + s.limit + ' used, ' + fmt(s.win * (1 - frac), 1) + 's until reset</div>' + slots(s.limit, (i) => (i < s.count ? 1 : 0)) +
        '<div class="w-bar rl-win"><i style="width:' + frac * 100 + '%"></i></div>' +
        '<p class="w-note">Cheap (one counter per key, e.g. Redis INCR + EXPIRE), but a client can send ' + s.limit + ' at the end of one window and ' + s.limit + ' at the start of the next: 2× the limit in a moment.</p>';
    } else if (s.algo === 'log') {
      let svg = '<svg class="w-svg rl-tl" viewBox="0 0 400 40"><line x1="0" y1="20" x2="400" y2="20"/>';
      s.times.forEach((x) => { const px = ((x - (t - s.win)) / s.win) * 400; svg += '<line class="tick" x1="' + px.toFixed(1) + '" y1="6" x2="' + px.toFixed(1) + '" y2="34"/>'; });
      svg += '<text x="4" y="38" class="l">−' + s.win + 's</text><text x="396" y="38" class="r">now</text></svg>';
      h += '<div class="w-sub">' + s.times.length + ' / ' + s.limit + ' accepted requests in the sliding ' + s.win + 's window</div>' + svg +
        '<p class="w-note">Exact: it keeps a timestamp per accepted request (e.g. a Redis sorted set) and evicts old ones. The cost is memory proportional to the limit, per client.</p>';
    } else {
      const frac = (t - s.winStart) / s.win;
      const est = s.prev * (1 - frac) + s.count;
      h += '<div class="w-sub">estimate = prev × (1 − elapsed) + current = ' + s.prev + ' × ' + fmt(1 - frac, 2) + ' + ' + s.count + ' = <b>' + fmt(est, 2) + '</b> / ' + s.limit + '</div>' +
        slots(s.limit, (i) => est - i) +
        '<p class="w-note">Two counters per key approximate a sliding window by weighting the previous window. It fixes the fixed-window boundary burst at almost no cost; Cloudflare reported 0.003% error.</p>';
    }
    return h + logHtml(s.log);
  }
  registerWidget('rate-limiter', {
    render(cfg) {
      const s = rlInit(cfg);
      return '<div class="w-row">' + field('Algorithm', select('algo', RL_ALGOS, s.algo)) + field('Limit', numIn('limit', s.limit, ' min="1" max="20"')) +
        field('Window (s)', numIn('win', s.win, ' min="1" max="30"')) + '</div>' +
        '<div class="w-row">' + btn('send', 'Send request', '', 'primary') + btn('burst', 'Burst ×10') + btn('reset', 'Reset') + '</div>' +
        '<div class="w-out">' + rlView(s) + '</div>';
    },
    onAction(b, a, el, cfg) {
      let s = stateOf(b, () => rlInit(cfg, wi(b, 'algo').value, val(b, 'limit', 5), val(b, 'win', 5)));
      if (a === 'reset') s = b._s = rlInit(cfg, wi(b, 'algo').value, clamp(val(b, 'limit', 5), 1, 20), clamp(val(b, 'win', 5), 1, 30));
      if (a === 'send') rlRequest(s);
      if (a === 'burst') for (let i = 0; i < 10; i++) rlRequest(s);
      out(b).innerHTML = rlView(s);
      ticker(b, () => { out(b).innerHTML = rlView(b._s); }, 200);
    },
    onInput(b, e, cfg) {
      b._s = rlInit(cfg, wi(b, 'algo').value, clamp(Math.round(val(b, 'limit', 5)), 1, 20), clamp(val(b, 'win', 5), 1, 30));
      out(b).innerHTML = rlView(b._s);
    },
  });

  // ===== 4. JWT decoder ======================================================
  const JWT_SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJzdWIiOiJ1c2VyLTQyIiwiYXVkIjoib3JkZXJzLWFwaSIsIm5hbWUiOiJBZGEgTG92ZWxhY2UiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjcyMjU2MDAsImV4cCI6MTc2NzIyNjUwMH0.SKOdGpgFVITGEqdgLJ6OQyhLVmJSMdIVoB6l9Xn2H5o';
  const JWT_SECRET = 'demo-secret';
  function b64urlDecode(s) {
    if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('not base64url');
    const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
    const bin = atob(pad);
    return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
  }
  const b64urlBytes = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64urlStr = (str) => b64urlBytes(new TextEncoder().encode(str));
  async function hmac(alg, secret, data) {
    const hash = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' }[alg];
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash }, false, ['sign']);
    return b64urlBytes(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  }
  function jwtParse(token) {
    const parts = token.trim().split('.');
    if (parts.length === 5) return { error: 'This is a JWE (5 parts): the payload is encrypted and cannot be read without the decryption key.' };
    if (parts.length !== 3) return { error: 'A JWS has 3 base64url parts separated by dots: header.payload.signature.' };
    try {
      return { parts, header: JSON.parse(b64urlDecode(parts[0])), payload: JSON.parse(b64urlDecode(parts[1])) };
    } catch (e) {
      return { error: 'Could not decode: ' + e.message };
    }
  }
  function jwtView(token, initial) {
    const j = jwtParse(token);
    if (j.error) return '<p class="w-bad">' + esc(j.error) + '</p>';
    const p = j.payload, hd = j.header, now = Date.now() / 1000;
    const date = (s) => (typeof s === 'number' ? new Date(s * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC') : '—');
    let h = '<div class="jwt-tok w-mono"><span class="j-h">' + esc(j.parts[0]) + '</span>.<span class="j-p">' + esc(j.parts[1]) + '</span>.<span class="j-s">' + esc(j.parts[2]) + '</span></div>';
    h += '<div class="jwt-cols"><div><div class="w-sub"><span class="j-h">●</span> Header</div><pre class="w-pre">' + esc(JSON.stringify(hd, null, 2)) + '</pre></div>' +
      '<div><div class="w-sub"><span class="j-p">●</span> Payload (claims)</div><pre class="w-pre">' + esc(JSON.stringify(p, null, 2)) + '</pre></div></div>';
    const rows = [];
    const claim = (k, desc, v, status) => rows.push('<tr><td class="w-mono">' + k + '</td><td>' + desc + '</td><td class="w-mono">' + esc(v) + '</td><td>' + (status || '') + '</td></tr>');
    if ('iss' in p) claim('iss', 'issuer — must equal the expected IdP', p.iss);
    if ('aud' in p) claim('aud', 'audience — must include this API', Array.isArray(p.aud) ? p.aud.join(', ') : p.aud);
    if ('sub' in p) claim('sub', 'subject (user id)', p.sub);
    if ('iat' in p) claim('iat', 'issued at', date(p.iat));
    if ('nbf' in p) claim('nbf', 'not before', date(p.nbf), p.nbf > now ? '<b class="w-bad">not yet valid</b>' : '<span class="w-ok">ok</span>');
    claim('exp', 'expires', 'exp' in p ? date(p.exp) : 'missing', !('exp' in p) ? '<b class="w-bad">no expiry!</b>' : p.exp < now ? '<b class="w-bad">expired ' + dur(now - p.exp) + ' ago</b>' : '<span class="w-ok">valid for ' + dur(p.exp - now) + '</span>');
    h += '<table class="w-table"><thead><tr><th>Claim</th><th>Meaning</th><th>Value</th><th>Check</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
    const warn = [];
    const alg = String(hd.alg || '');
    if (alg.toLowerCase() === 'none') warn.push('<b class="w-bad">alg: none</b> means the token is unsigned. Verifiers must reject it; accepting it is a classic JWT attack.');
    if (/^HS/.test(alg)) warn.push('HS* is symmetric: every service that can verify the token can also mint one. Prefer RS256/ES256/EdDSA when many services verify.');
    warn.push('Pin the expected algorithm on the verifier: never trust the header\'s alg. This prevents RS256→HS256 confusion attacks.');
    if (hd.kid) warn.push('kid "' + esc(hd.kid) + '" selects the verification key from the issuer\'s JWKS.');
    h += '<ul class="w-list">' + warn.map((w) => '<li>' + w + '</li>').join('') + '</ul>';
    h += '<div class="jwt-verify w-note">Signature: ' + (/^HS(256|384|512)$/.test(alg) ? (initial ? 'not checked yet. Click <b>Verify signature</b> to check it with the secret above.' : 'checking…') : alg.toLowerCase() === 'none' ? '<b class="w-bad">none</b>' :
      'verifying ' + esc(alg) + ' needs the issuer\'s public key (from its JWKS); not checked here.') + '</div>';
    h += '<p class="w-note">Decoding is not verification. Anyone can read a JWS payload, so never put secrets in it. A server must verify the signature and then check exp, nbf, iss and aud.</p>';
    return h;
  }
  async function jwtVerify(b) {
    const token = wi(b, 'token').value;
    const j = jwtParse(token);
    const box = b.querySelector('.jwt-verify');
    if (!box || j.error || !/^HS(256|384|512)$/.test(String(j.header.alg))) return;
    const seq = (b._jv = (b._jv || 0) + 1);
    if (!(typeof crypto !== 'undefined' && crypto.subtle)) { box.innerHTML = 'Signature: cannot check here (Web Crypto needs https:// or localhost).'; return; }
    try {
      const sig = await hmac(j.header.alg, wi(b, 'secret').value, j.parts[0] + '.' + j.parts[1]);
      if (seq !== b._jv || !box.isConnected) return;
      box.innerHTML = 'Signature (' + esc(j.header.alg) + ' with the secret above): ' + (sig === j.parts[2]
        ? '<b class="w-ok">✓ valid</b>. The header and payload were not modified.'
        : '<b class="w-bad">✗ invalid</b>. The token was modified, or the secret is wrong.');
    } catch (e) {
      box.textContent = 'Signature: check failed (' + e.message + ').';
    }
  }
  registerWidget('jwt', {
    render(cfg) {
      return '<textarea class="w-in mono" data-wi="token" spellcheck="false" rows="4" aria-label="JWT">' + esc(cfg.token || JWT_SAMPLE) + '</textarea>' +
        '<div class="w-row">' + field('HMAC secret', '<input class="w-in mono" data-wi="secret" value="' + esc(cfg.secret || JWT_SECRET) + '" spellcheck="false">') +
        btn('verify', '✓ Verify signature', '', 'primary') + btn('mint', '✍ Sign a fresh token (exp +15 min)') + btn('tamper', '✎ Tamper: role → superadmin') + btn('sample', 'Reset sample') + '</div>' +
        '<div class="w-out">' + jwtView(cfg.token || JWT_SAMPLE, true) + '</div>';
    },
    onInput(b) { out(b).innerHTML = jwtView(wi(b, 'token').value); jwtVerify(b); },
    async onAction(b, a) {
      const ta = wi(b, 'token');
      if (a === 'sample') ta.value = JWT_SAMPLE;
      if (a === 'tamper') {
        const j = jwtParse(ta.value);
        if (!j.error) { j.payload.role = 'superadmin'; ta.value = j.parts[0] + '.' + b64urlStr(JSON.stringify(j.payload)) + '.' + j.parts[2]; }
      }
      if (a === 'mint') {
        if (!(typeof crypto !== 'undefined' && crypto.subtle)) { out(b).insertAdjacentHTML('afterbegin', '<p class="w-bad">Web Crypto is unavailable here.</p>'); return; }
        const j = jwtParse(ta.value);
        const now = Math.floor(Date.now() / 1000);
        const payload = Object.assign(j.error ? { sub: 'user-42' } : j.payload, { iat: now, exp: now + 900 });
        const head = b64urlStr(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + b64urlStr(JSON.stringify(payload));
        ta.value = head + '.' + (await hmac('HS256', wi(b, 'secret').value, head));
      }
      this.onInput(b);
    },
  });

  // ===== 5. LRU / LFU cache ==================================================
  const CACHE_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
  function lruInit(cfg) { return { cap: cfg.capacity || 3, mode: 'lru', items: [], tick: 0, hits: 0, misses: 0, evicted: null, log: [] }; }
  function lruVictim(s) {
    if (!s.items.length) return null;
    if (s.mode === 'lru') return s.items[s.items.length - 1];
    return s.items.reduce((v, it) => (it.f < v.f || (it.f === v.f && it.t < v.t) ? it : v));
  }
  function lruTouch(s, it) { it.t = ++s.tick; it.f++; s.items.splice(s.items.indexOf(it), 1); s.items.unshift(it); }
  function lruGet(s, k) {
    const it = s.items.find((x) => x.k === k);
    s.evicted = null;
    if (it) { s.hits++; lruTouch(s, it); pushLog(s, 'get(' + k + ') → hit' + (s.mode === 'lfu' ? ', freq ' + it.f : ', moved to MRU'), 'w-ok'); }
    else { s.misses++; pushLog(s, 'get(' + k + ') → miss (the app would now load it and call put)', 'w-bad'); }
  }
  function lruPut(s, k) {
    const it = s.items.find((x) => x.k === k);
    s.evicted = null;
    if (it) { lruTouch(s, it); pushLog(s, 'put(' + k + ') → updated in place'); return; }
    let msg = 'put(' + k + ') → inserted';
    if (s.items.length >= s.cap) {
      const v = lruVictim(s);
      s.items.splice(s.items.indexOf(v), 1);
      s.evicted = v.k;
      msg += ', evicted ' + v.k + (s.mode === 'lru' ? ' (least recently used)' : ' (lowest frequency ' + v.f + ')');
    }
    s.items.unshift({ k, f: 1, t: ++s.tick });
    pushLog(s, msg, s.evicted ? 'w-warn' : '');
  }
  function lruView(s) {
    const list = s.mode === 'lru' ? s.items : s.items.slice().sort((a, b) => b.f - a.f || b.t - a.t);
    const victim = s.items.length >= s.cap ? lruVictim(s) : null;
    const total = s.hits + s.misses;
    let h = '<div class="w-grid">' + kv('Hits', s.hits, 'w-ok') + kv('Misses', s.misses, 'w-bad') + kv('Hit ratio', total ? fmt((s.hits / total) * 100, 0) + '%' : '—') + kv('Size', s.items.length + ' / ' + s.cap) + '</div>';
    h += '<div class="w-sub">' + (s.mode === 'lru' ? 'Recency order: MRU → LRU' : 'Frequency order (ties broken by recency)') + '</div><div class="w-chips lru-list">';
    h += list.length ? list.map((it) => '<span class="w-chip' + (victim === it ? ' victim' : '') + '">' + it.k + (s.mode === 'lfu' ? ' <small>×' + it.f + '</small>' : '') + '</span>').join('<span class="lru-arrow">→</span>') : '<span class="w-note">empty</span>';
    h += (s.evicted ? '<span class="w-chip out">' + s.evicted + '</span>' : '') + '</div>';
    if (victim) h += '<p class="w-note">Next eviction victim: <b class="w-warn">' + victim.k + '</b>.</p>';
    h += '<p class="w-note">' + (s.mode === 'lru'
      ? 'O(1) LRU = hash map + doubly linked list (Go: map[string]*list.Element with container/list). A one-off scan of new keys flushes hot entries out.'
      : 'LFU keeps keys that are popular over time and resists scans, but old hot keys can linger. Real systems use approximations: Redis allkeys-lfu, W-TinyLFU in Caffeine and Ristretto.') + '</p>';
    return h + logHtml(s.log);
  }
  registerWidget('lru', {
    render(cfg) {
      const s = lruInit(cfg);
      const row = (op) => '<div class="w-row"><span class="w-mono lru-op">' + op + '(</span>' + CACHE_KEYS.map((k) => btn(op, k, ' data-v="' + k + '"')).join('') + '<span class="w-mono lru-op">)</span></div>';
      return '<div class="w-row">' + field('Policy', select('mode', [['lru', 'LRU — least recently used'], ['lfu', 'LFU — least frequently used']], 'lru')) +
        field('Capacity', select('cap', [[2, '2'], [3, '3'], [4, '4'], [5, '5']], s.cap)) + btn('scan', 'Scan C→F (put)') + btn('hot', 'Hot key A ×3 (get)') + btn('reset', 'Reset') + '</div>' +
        row('put') + row('get') + '<div class="w-out">' + lruView(s) + '</div>';
    },
    onAction(b, a, el, cfg) {
      const s = stateOf(b, () => Object.assign(lruInit(cfg), { mode: wi(b, 'mode').value, cap: val(b, 'cap', 3) }));
      if (a === 'get') lruGet(s, el.dataset.v);
      else if (a === 'put') lruPut(s, el.dataset.v);
      else if (a === 'scan') ['C', 'D', 'E', 'F'].forEach((k) => lruPut(s, k));
      else if (a === 'hot') for (let i = 0; i < 3; i++) lruGet(s, 'A');
      else if (a === 'reset') b._s = Object.assign(lruInit(cfg), { mode: wi(b, 'mode').value, cap: val(b, 'cap', 3) });
      out(b).innerHTML = lruView(b._s);
    },
    onInput(b, e, cfg) {
      b._s = Object.assign(lruInit(cfg), { mode: wi(b, 'mode').value, cap: val(b, 'cap', 3) });
      out(b).innerHTML = lruView(b._s);
    },
  });

  // ===== 6. Load balancing algorithms ========================================
  const LB_ALGOS = [['rr', 'Round robin'], ['wrr', 'Weighted round robin'], ['lc', 'Least connections'], ['iphash', 'IP hash'], ['p2c', 'Power of two choices']];
  const LB_NOTES = {
    rr: 'Each backend gets the next request in turn, whatever its load. A slow backend piles up connections.',
    wrr: 'Smooth weighted round robin (as in Nginx): a backend with weight 3 gets 3 of every 6 requests, interleaved rather than in bursts.',
    lc: 'Sends each request to the backend with the fewest active connections, so a slow backend automatically gets less traffic.',
    iphash: 'hash(client IP) % N: the same client always reaches the same backend (cheap stickiness), but load follows the client mix and most clients remap when N changes.',
    p2c: 'Pick two backends at random and use the less loaded one. It is almost as good as least connections without global state, which is why Envoy and Finagle use it.',
  };
  function lbInit(cfg) {
    return { algo: cfg.algo || 'rr', be: [0, 1, 2, 3].map((i) => ({ name: 's' + (i + 1), w: 1, slow: false, active: [], total: 0 })), rr: 0, cur: [0, 0, 0, 0], n: 0, pending: 0, log: [], rand: rng(42) };
  }
  function lbPick(s, ip) {
    const be = s.be;
    if (s.algo === 'rr') return s.rr++ % be.length;
    if (s.algo === 'wrr') {
      const total = be.reduce((a, x) => a + x.w, 0);
      if (!total) return s.rr++ % be.length;
      let best = -1;
      be.forEach((x, i) => { s.cur[i] += x.w; if (x.w > 0 && (best < 0 || s.cur[i] > s.cur[best])) best = i; });
      s.cur[best] -= total;
      return best;
    }
    if (s.algo === 'lc') {
      const min = Math.min.apply(null, be.map((x) => x.active.length));
      const ties = be.map((x, i) => i).filter((i) => be[i].active.length === min);
      return ties[s.rr++ % ties.length];
    }
    if (s.algo === 'iphash') return fnv1a(ip) % be.length;
    const a = Math.floor(s.rand() * be.length);
    let b2 = Math.floor(s.rand() * (be.length - 1));
    if (b2 >= a) b2++;
    return be[b2].active.length < be[a].active.length ? b2 : a;
  }
  function lbSend(s) {
    const ip = '10.0.0.' + (1 + Math.floor(s.rand() * 6));
    const i = lbPick(s, ip);
    const x = s.be[i];
    const ms = (x.slow ? 6000 : 800) * (0.8 + 0.4 * s.rand());
    x.active.push(Date.now() + ms);
    x.total++;
    s.n++;
    pushLog(s, '#' + s.n + '  ' + ip + ' → ' + x.name + (x.slow ? ' (slow)' : ''), '', 8);
  }
  function lbUpdate(b) {
    const s = b._s;
    const now = Date.now();
    s.be.forEach((x) => { x.active = x.active.filter((t) => t > now); });
    if (s.pending > 0) { lbSend(s); s.pending--; }
    const max = Math.max(4, Math.max.apply(null, s.be.map((x) => x.active.length)));
    s.be.forEach((x, i) => {
      const row = b.querySelector('[data-lb="' + i + '"]');
      row.querySelector('.lb-act i').style.width = (x.active.length / max) * 100 + '%';
      row.querySelector('.lb-actn').textContent = x.active.length;
      row.querySelector('.lb-tot').textContent = x.total;
    });
    out(b).innerHTML = logHtml(s.log);
    return s.pending > 0 || s.be.some((x) => x.active.length > 0);
  }
  registerWidget('lb', {
    render(cfg) {
      const s = lbInit(cfg);
      const rows = s.be.map((x, i) => '<tr data-lb="' + i + '" class="c-' + COLORS[i] + '"><td class="w-mono">' + x.name + '</td><td>' + numIn('w' + i, 1, ' min="0" max="5" aria-label="weight of ' + x.name + '"') + '</td>' +
        '<td><input type="checkbox" class="chk" data-wi="slow' + i + '" aria-label="' + x.name + ' is slow"></td>' +
        '<td><div class="lb-actc"><div class="w-bar lb-act"><i style="width:0%"></i></div><b class="lb-actn">0</b></div></td><td class="lb-tot">0</td></tr>').join('');
      return '<div class="w-row">' + field('Algorithm', select('algo', LB_ALGOS, s.algo)) + btn('one', 'Send 1', '', 'primary') + btn('many', 'Send 30 (over 3s)') + btn('reset', 'Reset') + '</div>' +
        '<table class="w-table lb-table"><thead><tr><th>Backend</th><th>Weight</th><th>Slow</th><th>Active connections</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<p class="w-note lb-note">' + esc(LB_NOTES[s.algo]) + ' Tip: mark one backend slow, send 30 requests, then compare round robin with least connections.</p>' +
        '<div class="w-out">' + logHtml([]) + '</div>';
    },
    onAction(b, a, el, cfg) {
      const s = stateOf(b, () => lbInit(cfg));
      this.sync(b, s);
      if (a === 'one') lbSend(s);
      if (a === 'many') s.pending += 30;
      if (a === 'reset') {
        b._s = lbInit(cfg);
        this.sync(b, b._s);
      }
      lbUpdate(b);
      ticker(b, () => lbUpdate(b), 100);
    },
    onInput(b, e, cfg) {
      const s = stateOf(b, () => lbInit(cfg));
      this.sync(b, s);
      b.querySelector('.lb-note').textContent = LB_NOTES[s.algo] + (s.algo !== 'wrr' && s.be.some((x) => x.w !== 1) ? ' (Weights only affect weighted round robin.)' : '');
    },
    sync(b, s) {
      const algo = wi(b, 'algo').value;
      if (algo !== s.algo) { s.algo = algo; s.cur = [0, 0, 0, 0]; }
      s.be.forEach((x, i) => { x.w = clamp(Math.round(val(b, 'w' + i, 1)), 0, 5); x.slow = wi(b, 'slow' + i).checked; });
    },
  });

  // ===== 7. Quorum reads and writes ==========================================
  function qInit(cfg) { return { n: cfg.n || 3, w: cfg.w || 2, r: cfg.r || 2, down: [] }; }
  function qView(s) {
    const live = Array.from({ length: s.n }, (_, i) => i).filter((i) => !s.down.includes(i));
    const wOk = live.length >= s.w, rOk = live.length >= s.r;
    const wSet = wOk ? live.slice(0, s.w) : [];
    const rSet = rOk ? live.slice(live.length - s.r) : [];
    const overlap = wSet.filter((i) => rSet.includes(i));
    let h = '<div class="q-reps">';
    for (let i = 0; i < s.n; i++) {
      const cls = s.down.includes(i) ? 'down' : (wSet.includes(i) ? ' inw' : '') + (rSet.includes(i) ? ' inr' : '');
      const ver = s.down.includes(i) ? '💀' : wSet.includes(i) ? 'v2' : 'v1';
      h += '<button type="button" class="q-rep ' + cls + '" data-wa="toggle" data-v="' + i + '" title="Click to mark replica ' + (i + 1) + ' up/down"><span>R' + (i + 1) + '</span><b>' + ver + '</b></button>';
    }
    h += '</div><p class="w-note q-legend"><span class="q-k inw">write set (has v2)</span> <span class="q-k inr">read set</span> <span class="q-k both">both</span> — worst case: the read contacts the replicas furthest from the write. Click a replica to fail it.</p>';
    const strong = s.r + s.w > s.n;
    const line = (ok, text) => '<li class="' + (ok ? 'w-ok' : 'w-bad') + '">' + (ok ? '✓ ' : '✗ ') + text + '</li>';
    h += '<ul class="w-list q-facts">' +
      line(strong, 'R + W = ' + (s.r + s.w) + (strong ? ' > ' : ' ≤ ') + 'N = ' + s.n + (strong ? ': every read quorum overlaps the latest write quorum, so reads see the newest version.' : ': a read can miss the latest write and return stale data (eventual consistency).')) +
      line(s.w > s.n / 2, 'W = ' + s.w + (s.w > s.n / 2 ? ' > N/2: two conflicting writes cannot both reach a quorum.' : ' ≤ N/2: concurrent writes can succeed on disjoint replicas, so conflicts need resolution (LWW, vector clocks).')) +
      '<li>Writes tolerate ' + (s.n - s.w) + ' failed replica' + (s.n - s.w === 1 ? '' : 's') + '; reads tolerate ' + (s.n - s.r) + '.</li></ul>';
    h += '<div class="w-grid">' + kv('Live replicas', live.length + ' / ' + s.n) + kv('Write (needs W=' + s.w + ')', wOk ? '✓ succeeds' : '✗ fails', wOk ? 'w-ok' : 'w-bad') +
      kv('Read (needs R=' + s.r + ')', rOk ? (overlap.length ? '✓ returns v2' : '⚠ may return stale v1') : '✗ fails', rOk ? (overlap.length ? 'w-ok' : 'w-warn') : 'w-bad') + '</div>';
    h += '<p class="w-note">The latency of each operation is set by the slowest of the W (or R) fastest replies. Sloppy quorums with hinted handoff (Dynamo, Cassandra) keep writes available during failures but weaken the R+W>N guarantee.</p>';
    return h;
  }
  registerWidget('quorum', {
    render(cfg) {
      const s = qInit(cfg);
      return '<div class="w-row">' + field('N replicas', rangeIn('n', s.n, 1, 7)) + '<b class="w-mono q-v" data-v="n">' + s.n + '</b>' +
        field('W', rangeIn('w', s.w, 1, s.n)) + '<b class="w-mono q-v" data-v="w">' + s.w + '</b>' +
        field('R', rangeIn('r', s.r, 1, s.n)) + '<b class="w-mono q-v" data-v="r">' + s.r + '</b></div>' +
        '<div class="w-row">' + [[3, 2, 2, 'Dynamo-style 3/2/2'], [3, 3, 1, 'Fast reads W=N'], [3, 1, 3, 'Fast writes R=N'], [3, 1, 1, 'Eventual 3/1/1'], [5, 3, 3, 'N=5 majority']]
          .map((p) => btn('preset', p[3], ' data-v="' + p.slice(0, 3).join(',') + '"')).join('') + '</div>' +
        '<div class="w-out">' + qView(s) + '</div>';
    },
    onAction(b, a, el, cfg) {
      const s = stateOf(b, () => qInit(cfg));
      if (a === 'toggle') {
        const i = Number(el.dataset.v);
        s.down = s.down.includes(i) ? s.down.filter((x) => x !== i) : s.down.concat(i);
      } else if (a === 'preset') {
        const [n, w, r] = el.dataset.v.split(',').map(Number);
        Object.assign(s, { n, w, r, down: [] });
        this.syncInputs(b, s);
      }
      out(b).innerHTML = qView(s);
    },
    onInput(b, e, cfg) {
      const s = stateOf(b, () => qInit(cfg));
      s.n = val(b, 'n', 3);
      s.w = clamp(val(b, 'w', 2), 1, s.n);
      s.r = clamp(val(b, 'r', 2), 1, s.n);
      s.down = s.down.filter((i) => i < s.n);
      this.syncInputs(b, s);
      out(b).innerHTML = qView(s);
    },
    syncInputs(b, s) {
      ['n', 'w', 'r'].forEach((k) => {
        const el = wi(b, k);
        if (k !== 'n') el.max = s.n;
        el.value = s[k];
        b.querySelector('.q-v[data-v="' + k + '"]').textContent = s[k];
      });
    },
  });

  // ===== 8. Go channel simulator =============================================
  function chInit(cap) { return { cap, buf: [], sendq: [], recvq: [], closed: false, g: 0, v: 0, log: [] }; }
  function chSend(s) {
    const g = ++s.g, v = ++s.v * 10;
    const who = 'G' + g + ': ch <- ' + v;
    if (s.closed) { pushLog(s, who + '   // panic: send on closed channel (the whole program crashes)', 'w-bad', 12); return; }
    if (s.recvq.length) { const r = s.recvq.shift(); pushLog(s, who + '   // receiver G' + r + ' was waiting: direct hand-off, both continue', 'w-ok', 12); return; }
    if (s.buf.length < s.cap) { s.buf.push(v); pushLog(s, who + '   // buffered (len ' + s.buf.length + '/' + s.cap + '), G' + g + ' continues', '', 12); return; }
    s.sendq.push({ g, v });
    pushLog(s, who + '   // ' + (s.cap ? 'buffer full' : 'unbuffered, no receiver ready') + ' → G' + g + ' blocks (parked on sendq)', 'w-warn', 12);
  }
  function chRecv(s) {
    const g = ++s.g;
    const who = 'G' + g + ': v, ok := <-ch';
    if (s.buf.length) {
      const v = s.buf.shift();
      let extra = '';
      if (s.sendq.length) { const w = s.sendq.shift(); s.buf.push(w.v); extra = '; blocked G' + w.g + ' wakes and its ' + w.v + ' moves into the buffer'; }
      pushLog(s, who + '   // ' + v + ', true (from buffer' + extra + ')', 'w-ok', 12);
      return;
    }
    if (s.sendq.length) { const w = s.sendq.shift(); pushLog(s, who + '   // ' + w.v + ', true (taken directly from blocked G' + w.g + ', which continues)', 'w-ok', 12); return; }
    if (s.closed) { pushLog(s, who + '   // 0, false (closed and drained: zero value)', 'w-warn', 12); return; }
    s.recvq.push(g);
    pushLog(s, who + '   // nothing to receive → G' + g + ' blocks (parked on recvq)', 'w-warn', 12);
  }
  function chClose(s) {
    if (s.closed) { pushLog(s, 'close(ch)   // panic: close of closed channel', 'w-bad', 12); return; }
    s.closed = true;
    let msg = 'close(ch)   // closed';
    if (s.recvq.length) msg += '; blocked receivers ' + s.recvq.map((g) => 'G' + g).join(', ') + ' wake with (0, false)';
    if (s.sendq.length) msg += '; blocked senders ' + s.sendq.map((x) => 'G' + x.g).join(', ') + ' panic: send on closed channel';
    if (s.buf.length) msg += '; ' + s.buf.length + ' buffered value(s) can still be received';
    s.recvq = []; s.sendq = [];
    pushLog(s, msg, 'w-warn', 12);
  }
  function chView(s) {
    let h = '<div class="w-mono ch-code">ch := make(chan int' + (s.cap ? ', ' + s.cap : '') + ')   <span class="w-note">// len(ch)=' + s.buf.length + ' cap(ch)=' + s.cap + (s.closed ? ' — closed' : '') + '</span></div>';
    h += '<div class="ch-lanes"><div class="ch-q"><div class="w-sub">sendq: blocked senders</div><div class="w-chips">' + (s.sendq.length ? s.sendq.map((x) => '<span class="w-chip c-orange">G' + x.g + ' ←' + x.v + '</span>').join('') : '<span class="w-note">none</span>') + '</div></div>';
    h += '<div class="ch-buf' + (s.closed ? ' closed' : '') + '"><div class="w-sub">buf (ring buffer, FIFO)</div><div class="ch-slots">' +
      (s.cap ? Array.from({ length: s.cap }, (_, i) => '<span class="ch-slot' + (i < s.buf.length ? ' full' : '') + '">' + (i < s.buf.length ? s.buf[i] : '') + '</span>').join('') : '<span class="w-note">no buffer: sender and receiver must meet (rendezvous)</span>') + '</div></div>';
    h += '<div class="ch-q"><div class="w-sub">recvq: blocked receivers</div><div class="w-chips">' + (s.recvq.length ? s.recvq.map((g) => '<span class="w-chip c-blue">G' + g + '</span>').join('') : '<span class="w-note">none</span>') + '</div></div></div>';
    return h + logHtml(s.log) + '<p class="w-note">The queue names match the runtime\'s hchan struct (buf, sendq, recvq). Only the sender should close a channel; receiving from a closed channel never blocks, and sending to one panics.</p>';
  }
  registerWidget('go-channel', {
    render(cfg) {
      const cap = cfg.capacity || 0;
      return '<div class="w-row">' + field('Capacity', rangeIn('cap', cap, 0, 5)) + '<b class="w-mono ch-capv">' + cap + '</b>' +
        btn('send', '▶ go send', '', 'primary') + btn('recv', '◀ go receive') + btn('close', 'close(ch)') + btn('reset', 'Reset') + '</div>' +
        '<div class="w-out">' + chView(chInit(cap)) + '</div>';
    },
    onAction(b, a, el, cfg) {
      const s = stateOf(b, () => chInit(val(b, 'cap', 0)));
      if (a === 'send') chSend(s);
      else if (a === 'recv') chRecv(s);
      else if (a === 'close') chClose(s);
      else if (a === 'reset') b._s = chInit(val(b, 'cap', 0));
      out(b).innerHTML = chView(b._s);
    },
    onInput(b) {
      const cap = val(b, 'cap', 0);
      b.querySelector('.ch-capv').textContent = cap;
      b._s = chInit(cap);
      out(b).innerHTML = chView(b._s);
    },
  });

  // ===== 9. Kubernetes HPA calculator ========================================
  function hpaView(b, cfg) {
    const g = (k, d) => (b ? val(b, k, d) : d);
    const cur = Math.max(1, Math.round(g('replicas', cfg.replicas || 4)));
    const metric = Math.max(0, g('metric', cfg.metric || 90));
    const target = Math.max(0.0001, g('target', cfg.target || 60));
    const min = Math.max(1, Math.round(g('min', 2)));
    const max = Math.max(min, Math.round(g('max', 10)));
    const tol = Math.max(0, g('tol', 0.1));
    const ratio = metric / target;
    const inBand = Math.abs(ratio - 1) <= tol;
    const raw = cur * ratio;
    const desired = inBand ? cur : Math.ceil(raw);
    const clamped = clamp(desired, min, max);
    const upLimit = Math.max(cur * 2, cur + 4);
    const final = clamped > cur ? Math.min(clamped, upLimit) : clamped;
    let h = '<div class="hpa-formula w-mono">desired = ceil(current × metric / target) = ceil(' + cur + ' × ' + fmt(metric) + ' / ' + fmt(target) + ') = ceil(' + fmt(raw, 2) + ') = <b>' + Math.ceil(raw) + '</b></div>';
    h += '<ul class="w-list">' +
      '<li>Ratio ' + fmt(ratio, 3) + ': ' + (inBand ? '<b class="w-warn">within the ±' + fmt(tol * 100, 0) + '% tolerance band (' + fmt(1 - tol, 2) + '–' + fmt(1 + tol, 2) + '), so no scaling</b>. This prevents flapping on small changes.' : 'outside the ±' + fmt(tol * 100, 0) + '% tolerance band, so the HPA acts.') + '</li>' +
      '<li>Clamped to [minReplicas ' + min + ', maxReplicas ' + max + '] → ' + clamped + (clamped !== desired && !inBand ? ' <b class="w-warn">(hit a bound)</b>' : '') + '.</li>' +
      (clamped > cur ? '<li>Scale up: the default policy allows max(100%, +4 pods) per 15s, at most ' + upLimit + ' pods in this step' + (final < clamped ? ' → <b>' + final + '</b> now; the rest follows on later syncs' : '') + '.</li>' : '') +
      (clamped < cur ? '<li>Scale down: the HPA uses the <b>highest</b> recommendation from the last 300s (stabilization window), so it shrinks to ' + clamped + ' only if load stays low for 5 minutes.</li>' : '') +
      '</ul>';
    const n = Math.max(cur, final);
    h += '<div class="hpa-pods">' + Array.from({ length: n }, (_, i) => '<span class="hpa-pod ' + (i < Math.min(cur, final) ? 'keep' : i < cur ? 'rm' : 'add') + '"></span>').join('') + '</div>';
    h += '<p class="w-note"><span class="hpa-pod keep"></span> kept <span class="hpa-pod add"></span> added <span class="hpa-pod rm"></span> removed. For CPU utilisation the metric is the average usage as a percentage of the Pods\' <b>requests</b>; Pods without requests break this. Not-ready Pods and missing metrics are treated conservatively.</p>';
    return h;
  }
  registerWidget('hpa', {
    render(cfg) {
      return '<div class="w-row">' + field('Current replicas', numIn('replicas', cfg.replicas || 4, ' min="1" max="50"')) + field('Current metric (avg/pod)', numIn('metric', cfg.metric || 90, ' min="0"')) +
        field('Target', numIn('target', cfg.target || 60, ' min="1"')) + field('Min', numIn('min', 2, ' min="1"')) + field('Max', numIn('max', 10, ' min="1"')) +
        field('Tolerance', numIn('tol', 0.1, ' min="0" max="0.5" step="0.05"')) + '</div>' +
        '<div class="w-out">' + hpaView(null, cfg) + '</div>';
    },
    onInput(b, e, cfg) { out(b).innerHTML = hpaView(b, cfg); },
  });

  // ===== 10. Latency numbers =================================================
  const LAT = [
    ['L1 cache reference', 0.5, 'cpu'], ['Branch mispredict', 5, 'cpu'], ['L2 cache reference', 7, 'cpu'], ['Mutex lock/unlock', 25, 'cpu'],
    ['Main memory reference', 100, 'mem'], ['Compress 1 KB (Snappy)', 3000, 'cpu'], ['Send 1 KB over 1 Gbps', 10000, 'net'],
    ['Read 4 KB randomly from SSD', 150000, 'disk'], ['Read 1 MB sequentially from RAM', 250000, 'mem'], ['Round trip in same datacenter', 500000, 'net'],
    ['Read 1 MB sequentially from SSD', 1000000, 'disk'], ['HDD seek', 10000000, 'disk'], ['Read 1 MB sequentially from HDD', 20000000, 'disk'],
    ['Packet CA → Netherlands → CA', 150000000, 'net'],
  ];
  const LAT_COLOR = { cpu: 'blue', mem: 'green', disk: 'orange', net: 'purple' };
  function latView(human, scale) {
    const lo = Math.log10(0.1), hi = Math.log10(LAT[LAT.length - 1][1]);
    const maxV = LAT[LAT.length - 1][1];
    let h = '<div class="lat-rows">';
    LAT.forEach(([name, ns, kind]) => {
      const w = scale === 'log' ? ((Math.log10(ns) - lo) / (hi - lo)) * 100 : Math.max((ns / maxV) * 100, 0.15);
      h += '<div class="lat-row c-' + LAT_COLOR[kind] + '"><span class="lat-name">' + esc(name) + '</span><div class="w-bar"><i style="width:' + w.toFixed(2) + '%"></i></div>' +
        '<b class="lat-val">' + (human ? dur(ns) : dur(ns / 1e9)) + '</b></div>';
    });
    h += '</div><p class="w-note"><span class="lat-key c-blue">CPU</span> <span class="lat-key c-green">memory</span> <span class="lat-key c-orange">storage</span> <span class="lat-key c-purple">network</span> — ' +
      (human ? 'Scaled so that 1 ns = 1 s: if an L1 hit took half a second, a cross-ocean round trip would take almost 5 years. ' : '') +
      (scale === 'linear' ? 'On a linear scale everything except disk and the WAN is invisible: that is the point. ' : 'Each grid step is 10× slower. ') +
      'These are the classic Jeff Dean / Peter Norvig figures (~2012). Modern NVMe and networks are faster, but the orders of magnitude, and the lesson to avoid disk and network round trips on hot paths, still hold.</p>';
    return h;
  }
  registerWidget('latency', {
    render() {
      return '<div class="w-row">' + field('Scale', select('scale', [['log', 'Logarithmic'], ['linear', 'Linear']], 'log')) +
        '<label class="w-f inline"><input type="checkbox" class="chk" data-wi="human"> <span>Scale to human time (1 ns = 1 s)</span></label></div>' +
        '<div class="w-out">' + latView(false, 'log') + '</div>';
    },
    onInput(b) { out(b).innerHTML = latView(wi(b, 'human').checked, wi(b, 'scale').value); },
  });

  // ===== 11. Availability nines ==============================================
  function ninesDowntime(slo) {
    const f = clamp(1 - slo / 100, 0, 1);
    return '<div class="w-grid">' + [['Per year (365 d)', 365 * 86400], ['Per month (30 d)', 30 * 86400], ['Per week', 7 * 86400], ['Per day', 86400]]
      .map(([k, sec]) => kv(k, dur(f * sec))).join('') + '</div>';
  }
  function ninesComposite(rows) {
    let total = 1;
    const lines = rows.map((r) => {
      const a = clamp(r.a / 100, 0, 1);
      const eff = 1 - Math.pow(1 - a, Math.max(1, r.n));
      total *= eff;
      return '<tr><td>' + esc(r.name) + '</td><td class="w-mono">' + (r.n > 1 ? '1 − (1 − ' + fmt(a, 5) + ')^' + r.n : fmt(a, 5)) + '</td><td class="w-mono">' + fmt(eff * 100, 5) + '%</td></tr>';
    });
    return '<table class="w-table"><thead><tr><th>Component</th><th>Effective availability</th><th>As %</th></tr></thead><tbody>' + lines.join('') + '</tbody></table>' +
      '<p class="nz-total">Overall (all in series) = product = <b class="w-mono">' + fmt(total * 100, 4) + '%</b> → about ' + dur((1 - total) * 365 * 86400) + ' of downtime per year.</p>' +
      '<p class="w-note">Components in series multiply, so the chain is weaker than its weakest link. Redundant replicas in parallel give 1 − (1 − a)^n, which is only true if failures are independent; shared zones, configs and deploys break that assumption.</p>';
  }
  function ninesRowsHtml(rows) {
    return rows.map((r, i) => '<div class="w-row nz-row">' + '<input class="w-in" data-wi="name' + i + '" value="' + esc(r.name) + '" aria-label="Component name" size="12">' +
      field('availability %', numIn('a' + i, r.a, ' min="0" max="100" step="0.01"')) + field('replicas', numIn('n' + i, r.n, ' min="1" max="9"')) +
      btn('del', '✕', ' data-v="' + i + '" aria-label="Remove component"') + '</div>').join('');
  }
  const NINES_ROWS = () => [{ name: 'Load balancer', a: 99.99, n: 1 }, { name: 'App instance', a: 99.5, n: 3 }, { name: 'Database', a: 99.95, n: 1 }];
  registerWidget('nines', {
    render(cfg) {
      const slo = cfg.slo || 99.9;
      return '<div class="w-row">' + field('SLO %', numIn('slo', slo, ' min="0" max="100" step="0.001"')) + [99, 99.9, 99.95, 99.99, 99.999].map((p) => btn('preset', p + '%', ' data-v="' + p + '"')).join('') + '</div>' +
        '<div class="nz-down">' + ninesDowntime(slo) + '</div>' +
        '<div class="w-sub">Composite availability of a request path</div><div class="nz-rows">' + ninesRowsHtml(NINES_ROWS()) + '</div>' +
        '<div class="w-row">' + btn('add', '➕ Add component') + '</div><div class="w-out">' + ninesComposite(NINES_ROWS()) + '</div>';
    },
    readRows(b) {
      return Array.from(b.querySelectorAll('.nz-row')).map((_, i) => ({ name: wi(b, 'name' + i).value, a: val(b, 'a' + i, 99.9), n: clamp(Math.round(val(b, 'n' + i, 1)), 1, 9) }));
    },
    onInput(b) {
      b.querySelector('.nz-down').innerHTML = ninesDowntime(val(b, 'slo', 99.9));
      out(b).innerHTML = ninesComposite(this.readRows(b));
    },
    onAction(b, a, el) {
      if (a === 'preset') wi(b, 'slo').value = el.dataset.v;
      if (a === 'add' || a === 'del') {
        const rows = this.readRows(b);
        if (a === 'add' && rows.length < 6) rows.push({ name: 'Cache', a: 99.9, n: 2 });
        if (a === 'del' && rows.length > 1) rows.splice(Number(el.dataset.v), 1);
        b.querySelector('.nz-rows').innerHTML = ninesRowsHtml(rows);
      }
      this.onInput(b);
    },
  });

  // ===== 12. Exponential backoff with jitter =================================
  const JITTERS = [['none', 'No jitter'], ['full', 'Full jitter'], ['equal', 'Equal jitter'], ['decorrelated', 'Decorrelated jitter']];
  function backoffDelays(mode, base, cap, attempts, rand) {
    const out2 = [];
    let prev = base;
    for (let a = 0; a < attempts; a++) {
      const exp = Math.min(cap, base * Math.pow(2, a));
      let d;
      if (mode === 'none') d = exp;
      else if (mode === 'full') d = rand() * exp;
      else if (mode === 'equal') d = exp / 2 + rand() * (exp / 2);
      else { d = Math.min(cap, base + rand() * (prev * 3 - base)); prev = d; }
      out2.push(d);
    }
    return out2;
  }
  function backoffView(b, cfg) {
    const g = (k, d) => (b ? val(b, k, d) : d);
    const base = Math.max(1, g('base', 100)), cap = Math.max(base, g('cap', 5000)), attempts = clamp(Math.round(g('attempts', 6)), 1, 10);
    const mode = b ? wi(b, 'mode').value : cfg.mode || 'none';
    const seed = (b && b._seed) || 7;
    const CL = 10, HIST = 300, BUCKETS = 50;
    const all = Array.from({ length: HIST }, (_, c) => {
      let t = 0;
      return backoffDelays(mode, base, cap, attempts, rng(seed * 1000 + c)).map((d) => (t += d));
    });
    const maxT = Math.max.apply(null, all.map((x) => x[x.length - 1])) || 1;
    const W = 600, L = 64, rowH = 14, top = 10;
    const histTop = top + CL * rowH + 24, histH = 70, H = histTop + histH + 22;
    const X = (t) => L + (t / maxT) * (W - L - 10);
    let svg = '<svg class="w-svg bo-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Retry timeline">';
    for (let c = 0; c < CL; c++) {
      const y = top + c * rowH + rowH / 2;
      svg += '<text class="bo-lbl" x="' + (L - 6) + '" y="' + (y + 3.5) + '">client ' + (c + 1) + '</text><line class="bo-row" x1="' + L + '" y1="' + y + '" x2="' + (W - 10) + '" y2="' + y + '"/>';
      all[c].forEach((t) => { svg += '<circle class="bo-dot" cx="' + X(t).toFixed(1) + '" cy="' + y + '" r="3.6"/>'; });
    }
    const counts = new Array(BUCKETS).fill(0);
    all.forEach((ts) => ts.forEach((t) => { counts[Math.min(BUCKETS - 1, Math.floor((t / maxT) * BUCKETS))]++; }));
    // Peak load is measured in fixed 10 ms windows so runs with different spans compare fairly.
    const fine = {};
    all.forEach((ts) => ts.forEach((t) => { const k = Math.floor(t / 10); fine[k] = (fine[k] || 0) + 1; }));
    const peak = Math.max.apply(null, Object.values(fine));
    const bw = (W - L - 10) / BUCKETS;
    counts.forEach((n, i) => {
      const hgt = Math.min(1, n / HIST) * histH; // full height = every client in the same slot

      svg += '<rect class="bo-bar" x="' + (L + i * bw + 0.5).toFixed(1) + '" y="' + (histTop + histH - hgt).toFixed(1) + '" width="' + Math.max(1, bw - 1).toFixed(1) + '" height="' + hgt.toFixed(1) + '"/>';
    });
    svg += '<text class="bo-lbl" x="' + (L - 6) + '" y="' + (histTop + 12) + '">server</text><text class="bo-lbl" x="' + (L - 6) + '" y="' + (histTop + 24) + '">load</text>' +
      '<text class="bo-axis" x="' + L + '" y="' + (H - 6) + '">0</text><text class="bo-axis r" x="' + (W - 10) + '" y="' + (H - 6) + '">' + dur(maxT / 1000) + '</text></svg>';
    const formula = { none: 'sleep = min(cap, base × 2^attempt)', full: 'sleep = random(0, min(cap, base × 2^attempt))', equal: 'temp = min(cap, base × 2^attempt); sleep = temp/2 + random(0, temp/2)', decorrelated: 'sleep = min(cap, random(base, previous × 3))' }[mode];
    return '<div class="w-mono hpa-formula">' + formula + '</div>' + svg +
      '<p class="w-note">Top: retry times for 10 clients that all failed at t=0, for example when a dependency came back after an outage. Bottom: retries per time slot across ' + HIST + ' clients; the busiest 10 ms window receives <b>' + peak + '</b> retries (a full-height bar means all ' + HIST + ' clients in one slot). ' +
      (mode === 'none' ? 'Without jitter every client retries at the same moments: synchronized waves (a thundering herd) that can knock the service over again.' : 'Jitter spreads retries out, so the recovering service sees a smooth load. AWS recommends full or decorrelated jitter.') +
      ' Also cap the total retries (a retry budget) and retry only idempotent operations.</p>';
  }
  registerWidget('backoff', {
    render(cfg) {
      return '<div class="w-row">' + field('Jitter', select('mode', JITTERS, cfg.mode || 'none')) + field('Base (ms)', numIn('base', 100, ' min="1"')) +
        field('Cap (ms)', numIn('cap', 5000, ' min="1"')) + field('Attempts', numIn('attempts', 6, ' min="1" max="10"')) + btn('seed', '🎲 Re-roll') + '</div>' +
        '<div class="w-out">' + backoffView(null, cfg) + '</div>';
    },
    onInput(b, e, cfg) { out(b).innerHTML = backoffView(b, cfg); },
    onAction(b, a, el, cfg) { if (a === 'seed') { b._seed = 1 + Math.floor(Math.random() * 1e6); out(b).innerHTML = backoffView(b, cfg); } },
  });

  // ===== 13. Back-of-the-envelope estimation =================================
  const EST_FIELDS = [['dau', 'Daily active users', 10000000], ['rpu', 'Requests / user / day', 20], ['ratio', 'Reads per write', 10], ['size', 'Bytes per write', 1000],
    ['years', 'Retention (years)', 5], ['peak', 'Peak / average', 3], ['rf', 'Replication factor', 3]];
  function estView(b, cfg) {
    const v = {};
    EST_FIELDS.forEach(([k, , d]) => { v[k] = Math.max(0, b ? val(b, k, d) : (cfg[k] != null ? cfg[k] : d)); });
    const reqDay = v.dau * v.rpu;
    const writesDay = reqDay / (v.ratio + 1);
    const readsDay = reqDay - writesDay;
    const wq = writesDay / 86400, rq = readsDay / 86400;
    const ingest = writesDay * v.size;
    const storage = ingest * 365 * v.years * v.rf;
    const line = (label, expr, res) => '<tr><td>' + label + '</td><td class="w-mono">' + expr + '</td><td class="w-mono"><b>' + res + '</b></td></tr>';
    return '<table class="w-table est"><tbody>' +
      line('Requests/day', si(v.dau) + ' × ' + fmt(v.rpu), si(reqDay)) +
      line('Writes/day', si(reqDay) + ' / (' + fmt(v.ratio) + ' + 1)', si(writesDay)) +
      line('Average QPS', si(reqDay) + ' / 86,400 s', si(reqDay / 86400) + ' (' + si(wq) + ' writes, ' + si(rq) + ' reads)') +
      line('Peak QPS', si(reqDay / 86400) + ' × ' + fmt(v.peak), si((reqDay / 86400) * v.peak) + ' (' + si(wq * v.peak) + ' w, ' + si(rq * v.peak) + ' r)') +
      line('Ingest/day', si(writesDay) + ' × ' + bytes(v.size), bytes(ingest)) +
      line('Storage', bytes(ingest) + ' × 365 × ' + fmt(v.years) + ' y × RF ' + fmt(v.rf), bytes(storage)) +
      line('Write bandwidth (avg)', si(wq) + '/s × ' + bytes(v.size), bytes(wq * v.size) + '/s') +
      line('Read bandwidth (peak)', si(rq * v.peak) + '/s × ' + bytes(v.size), bytes(rq * v.peak * v.size) + '/s') +
      '</tbody></table><p class="w-note">Interview shortcuts: a day has about 10^5 seconds (86,400), so 1M requests/day ≈ 12 QPS. Round aggressively and state your assumptions. ' +
      'Then sanity-check against capacity: one Postgres primary handles roughly 10^3–10^4 writes/s, one Redis node about 10^5 ops/s, and one server 10^4+ simple HTTP requests/s.</p>';
  }
  registerWidget('estimate', {
    render(cfg) {
      return '<div class="w-row est-in">' + EST_FIELDS.map(([k, label, d]) => field(label, numIn(k, cfg[k] != null ? cfg[k] : d, ' min="0"'))).join('') + '</div>' +
        '<div class="w-out">' + estView(null, cfg) + '</div>';
    },
    onInput(b, e, cfg) { out(b).innerHTML = estView(b, cfg); },
  });

  // ===== 14. RAID levels =====================================================
  const RAID = {
    0: { min: 2, name: 'RAID 0 (striping)', usable: (n) => n, tol: () => '0 — any disk failure loses the array', wp: () => '1', read: (n) => n + '× (all disks)' },
    1: { min: 2, name: 'RAID 1 (mirroring)', usable: () => 1, tol: (n) => (n - 1) + ' (all but one disk)', wp: (n) => n + ' (every mirror is written)', read: (n) => 'up to ' + n + '×' },
    5: { min: 3, name: 'RAID 5 (single distributed parity)', usable: (n) => n - 1, tol: () => '1 disk', wp: () => '4 (read data, read parity, write data, write parity)', read: (n) => (n - 1) + '×' },
    6: { min: 4, name: 'RAID 6 (dual parity P+Q)', usable: (n) => n - 2, tol: () => 'any 2 disks', wp: () => '6', read: (n) => (n - 2) + '×' },
    10: { min: 4, name: 'RAID 10 (stripe of mirrors)', usable: (n) => n / 2, tol: (n) => '1 guaranteed; up to ' + n / 2 + ' if each is in a different mirror pair', wp: () => '2', read: (n) => n + '×' },
  };
  function raidLayout(level, n) {
    const rows = [];
    let d = 1;
    for (let r = 0; r < 4; r++) {
      const row = new Array(n);
      if (level === 0) for (let i = 0; i < n; i++) row[i] = { t: 'd', l: 'D' + d++ };
      else if (level === 1) { for (let i = 0; i < n; i++) row[i] = { t: i ? 'm' : 'd', l: 'D' + d }; d++; }
      else if (level === 10) { const k = n / 2; for (let p = 0; p < k; p++) { row[2 * p] = { t: 'd', l: 'D' + (d + p) }; row[2 * p + 1] = { t: 'm', l: 'D' + (d + p) }; } d += k; }
      else {
        const P = n - 1 - (r % n);
        const Q = level === 6 ? (P + 1) % n : -1;
        row[P] = { t: 'p', l: 'P' + (r + 1) };
        if (Q >= 0) row[Q] = { t: 'q', l: 'Q' + (r + 1) };
        for (let i = 0; i < n; i++) if (!row[i]) row[i] = { t: 'd', l: 'D' + d++ };
      }
      rows.push(row);
    }
    return rows;
  }
  function raidSurvives(level, n, failed) {
    const f = failed.length;
    if (level === 0) return f === 0;
    if (level === 1) return f < n;
    if (level === 5) return f <= 1;
    if (level === 6) return f <= 2;
    for (let p = 0; p < n / 2; p++) if (failed.includes(2 * p) && failed.includes(2 * p + 1)) return false;
    return true;
  }
  function raidView(s) {
    const R = RAID[s.level];
    const rows = raidLayout(s.level, s.n);
    const alive = raidSurvives(s.level, s.n, s.failed);
    let h = '<div class="raid-grid" style="grid-template-columns:repeat(' + s.n + ',minmax(0,1fr))">';
    for (let i = 0; i < s.n; i++) {
      const dead = s.failed.includes(i);
      h += '<div class="raid-disk' + (dead ? ' dead' : '') + (s.level === 10 ? ' pair' + (Math.floor(i / 2) % 2) : '') + '"><button type="button" class="btn-xs" data-wa="fail" data-v="' + i + '" title="Click to fail or replace this disk">' + (dead ? '❌' : '💽') + ' Disk ' + (i + 1) + '</button>' +
        rows.map((row) => '<span class="raid-blk ' + row[i].t + '">' + row[i].l + '</span>').join('') + '</div>';
    }
    h += '</div><p class="w-note raid-legend"><span class="raid-blk d">D</span> data <span class="raid-blk m">D</span> mirror copy <span class="raid-blk p">P</span> parity <span class="raid-blk q">Q</span> second parity. Click a disk to fail it.</p>';
    const status = !s.failed.length ? '<b class="w-ok">Optimal</b>' : alive ? '<b class="w-warn">Degraded</b>: lost blocks are rebuilt from ' + (s.level === 1 || s.level === 10 ? 'the mirror' : 'parity') + ' on reads, and a rebuild onto a replacement disk is needed' : '<b class="w-bad">Failed</b>: data is lost. Restore from backup.';
    h += '<div class="w-grid">' + kv('Usable capacity', fmt(R.usable(s.n) * s.size) + ' TB of ' + fmt(s.n * s.size) + ' TB (' + fmt((R.usable(s.n) / s.n) * 100, 0) + '%)') +
      kv('Survives', esc(R.tol(s.n))) + kv('Write penalty (I/Os per write)', esc(R.wp(s.n))) + kv('Read throughput', esc(R.read(s.n))) + '</div>';
    h += '<p class="raid-status">Status: ' + status + '</p>';
    h += '<p class="w-note">' + (s.level === 5 && s.size >= 4 ? 'Rebuild risk: rebuilding a ' + s.size + ' TB disk reads every surviving disk in full; one unrecoverable read error or a second failure during that window loses the array. That is why large disks favour RAID 6 or RAID 10. ' : '') +
      'RAID is not a backup: deletion, corruption and ransomware are mirrored instantly.</p>';
    return h;
  }
  registerWidget('raid', {
    render(cfg) {
      const s = { level: cfg.level || 5, n: cfg.disks || 4, size: cfg.size || 4, failed: [] };
      return '<div class="w-row">' + field('Level', select('level', Object.keys(RAID).map((k) => [k, RAID[k].name]), s.level)) +
        field('Disks', rangeIn('n', s.n, 2, 8)) + '<b class="w-mono raid-nv">' + s.n + '</b>' + field('Disk size (TB)', numIn('size', s.size, ' min="1" max="30"')) + '</div>' +
        '<div class="w-out">' + raidView(s) + '</div>';
    },
    read(b, keepFailed) {
      const level = Number(wi(b, 'level').value);
      let n = val(b, 'n', 4);
      n = Math.max(n, RAID[level].min);
      if (level === 10 && n % 2) n++;
      if (n > 8) n = 8;
      wi(b, 'n').value = n;
      b.querySelector('.raid-nv').textContent = n;
      const prev = b._s;
      const failed = keepFailed && prev && prev.n === n && prev.level === level ? prev.failed : [];
      return (b._s = { level, n, size: Math.max(1, val(b, 'size', 4)), failed });
    },
    onInput(b) { out(b).innerHTML = raidView(this.read(b, true)); },
    onAction(b, a, el) {
      const s = b._s || this.read(b, true);
      const i = Number(el.dataset.v);
      if (a === 'fail') s.failed = s.failed.includes(i) ? s.failed.filter((x) => x !== i) : s.failed.concat(i);
      out(b).innerHTML = raidView(s);
    },
  });
})();
