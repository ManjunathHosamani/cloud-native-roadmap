// Visual explainers: renders graph and sequence diagrams (animated SVG) and
// interactive widgets, and drives their step-by-step playback.
// Diagrams are plain data (js/visuals/*.js → registerDiagram); widgets are code
// (js/widgets.js → registerWidget). All events are delegated (CSP-safe).
(function () {
  'use strict';

  // Layout constants — keep in sync with scripts/validate-content.js.
  const G = { CW: 160, CH: 84, PX: 12, PY: 14 };            // graph grid cell and node inset
  const S = { COL: 170, PAD: 16, TOP: 66, ROW: 46, SELF: 58, SECTION: 36 }; // sequence layout
  const COLORS = ['blue', 'green', 'orange', 'purple', 'red', 'yellow', 'teal', 'gray'];

  const esc = (s) => (s == null ? '' : String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r1 = (v) => Math.round(v * 10) / 10;

  const byId = {};
  const index = {};
  DIAGRAMS.forEach((d) => {
    byId[d.id] = d;
    const key = d.roadmap + '|' + d.module + '|' + (d.problem ? 'p|' + d.problem : 't|' + d.topic);
    (index[key] = index[key] || []).push(d);
  });

  // ===== Graph geometry ======================================================
  function nodeRect(n) {
    return { x: n.x * G.CW + G.PX, y: n.y * G.CH + G.PY, w: (n.w || 1) * G.CW - 2 * G.PX, h: (n.h || 1) * G.CH - 2 * G.PY };
  }
  const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

  // Point where the ray from the node centre towards p leaves the node outline.
  function clip(r, shape, p) {
    const c = center(r);
    const dx = p.x - c.x, dy = p.y - c.y;
    if (!dx && !dy) return c;
    const hw = r.w / 2 + 2, hh = r.h / 2 + 2;
    let t;
    if (shape === 'diamond') t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
    else if (shape === 'circle') t = 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh));
    else t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return { x: c.x + dx * t, y: c.y + dy * t };
  }

  // Quadratic curve between two nodes; `bend` offsets the control point sideways (px).
  function link(a, b, bend) {
    const ra = nodeRect(a), rb = nodeRect(b);
    const ca = center(ra), cb = center(rb);
    const len = Math.hypot(cb.x - ca.x, cb.y - ca.y) || 1;
    const ctrl = { x: (ca.x + cb.x) / 2 - ((cb.y - ca.y) / len) * (bend || 0), y: (ca.y + cb.y) / 2 + ((cb.x - ca.x) / len) * (bend || 0) };
    const p0 = clip(ra, a.shape, bend ? ctrl : cb);
    const p2 = clip(rb, b.shape, bend ? ctrl : ca);
    const c = bend ? ctrl : { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 };
    return { p0, c, p2 };
  }
  const bez = (g, t) => ({
    x: (1 - t) * (1 - t) * g.p0.x + 2 * (1 - t) * t * g.c.x + t * t * g.p2.x,
    y: (1 - t) * (1 - t) * g.p0.y + 2 * (1 - t) * t * g.c.y + t * t * g.p2.y,
  });
  const pathD = (g) => 'M' + r1(g.p0.x) + ' ' + r1(g.p0.y) + ' Q' + r1(g.c.x) + ' ' + r1(g.c.y) + ' ' + r1(g.p2.x) + ' ' + r1(g.p2.y);
  const reverse = (g) => ({ p0: g.p2, c: g.c, p2: g.p0 });

  function gridSize(d) {
    let w = d.w || 0, h = d.h || 0;
    (d.nodes || []).concat(d.groups || []).forEach((n) => {
      w = Math.max(w, n.x + (n.w || 1));
      h = Math.max(h, n.y + (n.h || 1));
    });
    return { w, h };
  }

  const nodeMap = (d) => Object.fromEntries((d.nodes || []).map((n) => [n.id, n]));
  const edgeId = (e) => e.id || e.from + '>' + e.to;

  // ===== Graph rendering =====================================================
  function textWidth(s, px) { return String(s).length * px * 0.58; }

  function labelBox(x, y, text, cls) {
    const w = textWidth(text, 10.5) + 10;
    return '<g class="' + cls + '"><rect x="' + r1(x - w / 2) + '" y="' + r1(y - 8) + '" width="' + r1(w) + '" height="16" rx="4"/>' +
      '<text x="' + r1(x) + '" y="' + r1(y + 3.5) + '">' + esc(text) + '</text></g>';
  }

  function nodeShape(n, r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    switch (n.shape) {
      case 'db': {
        const ry = Math.min(8, r.h / 6);
        return '<path class="dg-shape" d="M' + r.x + ' ' + (r.y + ry) + ' A' + r.w / 2 + ' ' + ry + ' 0 0 1 ' + (r.x + r.w) + ' ' + (r.y + ry) +
          ' V' + (r.y + r.h - ry) + ' A' + r.w / 2 + ' ' + ry + ' 0 0 1 ' + r.x + ' ' + (r.y + r.h - ry) + ' Z"/>' +
          '<path class="dg-shape-line" d="M' + r.x + ' ' + (r.y + ry) + ' A' + r.w / 2 + ' ' + ry + ' 0 0 0 ' + (r.x + r.w) + ' ' + (r.y + ry) + '"/>';
      }
      case 'diamond':
        return '<polygon class="dg-shape" points="' + cx + ',' + r.y + ' ' + (r.x + r.w) + ',' + cy + ' ' + cx + ',' + (r.y + r.h) + ' ' + r.x + ',' + cy + '"/>';
      case 'circle':
        return '<ellipse class="dg-shape" cx="' + cx + '" cy="' + cy + '" rx="' + r.w / 2 + '" ry="' + r.h / 2 + '"/>';
      case 'pill':
        return '<rect class="dg-shape" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="' + r.h / 2 + '"/>';
      default:
        return '<rect class="dg-shape" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="8"/>';
    }
  }

  function nodeSvg(n) {
    const r = nodeRect(n);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2 + (n.shape === 'db' ? 3 : 0);
    const label = (n.icon ? n.icon + ' ' : '') + (n.label || n.id);
    let h = '<g class="dg-node c-' + (COLORS.includes(n.color) ? n.color : 'gray') + (n.ghost ? ' ghost' : '') + (n.info ? ' has-info' : '') + (n.enter ? ' gone' : '') +
      '" data-n="' + esc(n.id) + '"' + (n.info ? ' data-dga="node" tabindex="0" role="button" aria-label="' + esc(label + ': details') + '"' : '') + '>';
    h += nodeShape(n, r);
    if (n.sub) {
      h += '<text class="dg-label" x="' + cx + '" y="' + r1(cy - 3) + '">' + esc(label) + '</text>';
      h += '<text class="dg-sub" x="' + cx + '" y="' + r1(cy + 12) + '">' + esc(n.sub) + '</text>';
    } else {
      h += '<text class="dg-label" x="' + cx + '" y="' + r1(cy + 4.5) + '">' + esc(label) + '</text>';
    }
    if (n.info) h += '<circle class="dg-info-dot" cx="' + (r.x + r.w - 7) + '" cy="' + (r.y + 7) + '" r="3.5"/>';
    return h + '</g>';
  }

  function graphSvg(d, uid) {
    const size = gridSize(d);
    const W = size.w * G.CW, H = size.h * G.CH;
    const nodes = nodeMap(d);
    let h = '<svg class="dg-svg" viewBox="0 0 ' + W + ' ' + H + '" style="--minw:' + Math.round(W * 0.62) + 'px;--maxw:' + Math.round(W * 1.25) + 'px" role="img" aria-label="' + esc(d.title) + '">';
    h += markers(uid);
    (d.groups || []).forEach((g) => {
      // The label sits on the top border (like a fieldset legend) so it never covers nodes.
      const x = g.x * G.CW + 6, y = g.y * G.CH + 7, w = (g.w || 1) * G.CW - 12, hh = (g.h || 1) * G.CH - 14;
      const label = g.label || g.id;
      h += '<g class="dg-group c-' + (COLORS.includes(g.color) ? g.color : 'gray') + '" data-n="' + esc(g.id) + '"><rect class="dg-gbox" x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="12"/>' +
        '<rect class="dg-gtab" x="' + (x + 10) + '" y="' + (y - 7) + '" width="' + r1(textWidth(label, 11) + 12) + '" height="14" rx="4"/>' +
        '<text class="dg-glabel" x="' + (x + 16) + '" y="' + (y + 4) + '">' + esc(label) + '</text></g>';
    });
    (d.edges || []).forEach((e) => {
      const g = link(nodes[e.from], nodes[e.to], e.curve);
      const later = nodes[e.from].enter || nodes[e.to].enter;
      h += '<g class="dg-edge' + (e.dashed ? ' dashed' : '') + (later ? ' gone' : '') + '" data-e="' + esc(edgeId(e)) + '"><path d="' + pathD(g) + '" marker-end="url(#' + uid + '-a)"' +
        (e.both ? ' marker-start="url(#' + uid + '-s)"' : '') + '/>';
      if (e.label) { const m = bez(g, 0.5); h += labelBox(m.x, m.y, e.label, 'dg-elabel'); }
      h += '</g>';
    });
    (d.nodes || []).forEach((n) => { h += nodeSvg(n); });
    return h + '<g class="dg-tokens"></g></svg>';
  }

  function markers(uid) {
    const m = (id, cls, d) => '<marker id="' + uid + '-' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="' + cls + '" d="' + d + '"/></marker>';
    const tri = 'M0 0 L10 5 L0 10 z';
    return '<defs>' + m('a', 'dg-ah', tri) + m('s', 'dg-ah', tri) + m('o', 'dg-ah on', tri) + m('so', 'dg-ah on', tri) + '</defs>';
  }

  // ===== Sequence rendering ==================================================
  function seqLayout(d) {
    const ax = {};
    d.actors.forEach((a, i) => { ax[a.id] = S.PAD + S.COL * i + S.COL / 2; });
    let y = S.TOP + 18;
    const rows = d.steps.map((st) => {
      if (st.section) { const row = { y: y + 8 }; y += S.SECTION; return row; }
      const self = st.from === st.to;
      const row = { y: y + 14, self };
      y += self ? S.SELF : S.ROW;
      return row;
    });
    return { ax, rows, W: S.PAD * 2 + S.COL * d.actors.length, H: y + 16 };
  }

  function seqSvg(d, uid) {
    const L = seqLayout(d);
    let h = '<svg class="dg-svg" viewBox="0 0 ' + L.W + ' ' + L.H + '" style="--minw:' + Math.round(L.W * 0.62) + 'px;--maxw:' + Math.round(L.W * 1.1) + 'px" role="img" aria-label="' + esc(d.title) + '">' + markers(uid);
    d.actors.forEach((a) => {
      const x = L.ax[a.id];
      const label = (a.icon ? a.icon + ' ' : '') + (a.label || a.id);
      h += '<g class="dg-actor c-' + (COLORS.includes(a.color) ? a.color : 'gray') + (a.info ? ' has-info' : '') + '" data-n="' + esc(a.id) + '"' +
        (a.info ? ' data-dga="node" tabindex="0" role="button" aria-label="' + esc(label + ': details') + '"' : '') + '>' +
        '<line class="dg-life" x1="' + x + '" y1="' + (S.TOP - 6) + '" x2="' + x + '" y2="' + (L.H - 8) + '"/>' +
        '<rect class="dg-shape" x="' + (x - S.COL / 2 + 10) + '" y="10" width="' + (S.COL - 20) + '" height="' + (S.TOP - 22) + '" rx="8"/>' +
        '<text class="dg-label" x="' + x + '" y="' + (a.sub ? 30 : 37) + '">' + esc(label) + '</text>' +
        (a.sub ? '<text class="dg-sub" x="' + x + '" y="45">' + esc(a.sub) + '</text>' : '') +
        (a.info ? '<circle class="dg-info-dot" cx="' + (x + S.COL / 2 - 17) + '" cy="17" r="3.5"/>' : '') + '</g>';
    });
    let mi = 0;
    d.steps.forEach((st, i) => {
      const row = L.rows[i];
      if (st.section) {
        h += '<g class="dg-section"><line x1="' + S.PAD + '" y1="' + row.y + '" x2="' + (L.W - S.PAD) + '" y2="' + row.y + '"/>' +
          labelBox(L.W / 2, row.y, st.section, 'dg-slabel') + '</g>';
        return;
      }
      const x1 = L.ax[st.from], x2 = L.ax[st.to], y = row.y;
      h += '<g class="dg-msg' + (st.reply ? ' reply' : '') + '" data-m="' + mi + '">';
      if (row.self) {
        h += '<path d="M' + x1 + ' ' + y + ' H' + (x1 + 34) + ' V' + (y + 20) + ' H' + (x1 + 4) + '" marker-end="url(#' + uid + '-a)"/>' +
          (st.from === d.actors[d.actors.length - 1].id
            ? '<text class="dg-mlabel self left" x="' + (x1 - 8) + '" y="' + (y + 14) + '">' + esc(st.label) + '</text>'
            : '<text class="dg-mlabel self" x="' + (x1 + 40) + '" y="' + (y + 14) + '">' + esc(st.label) + '</text>');
      } else {
        const dir = x2 > x1 ? 1 : -1;
        h += '<path d="M' + (x1 + dir * 4) + ' ' + y + ' H' + (x2 - dir * 4) + '" marker-end="url(#' + uid + '-a)"/>' +
          '<text class="dg-mlabel" x="' + (x1 + x2) / 2 + '" y="' + (y - 7) + '">' + esc(st.label) + '</text>';
      }
      h += '<text class="dg-mnum" x="' + (Math.min(x1, x2) + (row.self ? -14 : 10)) + '" y="' + (y - 6) + '">' + (mi + 1) + '</text></g>';
      mi++;
    });
    return h + '<g class="dg-tokens"></g></svg>';
  }

  // ===== Component markup ====================================================
  let uidSeq = 0;
  const KIND_LABEL = { graph: '🎬 Animated diagram', sequence: '🎬 Animated sequence', widget: '🧪 Interactive lab' };

  function stepList(d) { return d.kind === 'sequence' ? d.steps.filter((s) => !s.section) : d.steps || []; }

  function html(d) {
    const uid = 'dg' + (++uidSeq);
    const head = '<figcaption class="dg-hdr"><span class="dg-kind">' + KIND_LABEL[d.kind] + '</span><strong class="dg-title">' + esc(d.title) + '</strong>' +
      '<button type="button" class="dg-icon" data-dga="expand" title="Expand (Esc to close)" aria-label="Expand diagram">⤢</button></figcaption>';
    if (d.kind === 'widget') {
      const w = WIDGETS[d.widget];
      return '<figure class="dg dg-widget" id="' + uid + '" data-dg="' + esc(d.id) + '">' + head +
        (d.desc ? '<p class="dg-desc">' + esc(d.desc) + '</p>' : '') +
        '<div class="dg-wbody" data-widget="' + esc(d.widget) + '">' + (w ? w.render(d.config || {}, uid) : '<p class="muted">Widget unavailable.</p>') + '</div></figure>';
    }
    const steps = stepList(d);
    const hasInfo = (d.nodes || d.actors || []).some((n) => n.info);
    const intro = (d.desc || '') + (hasInfo ? ' Click a highlighted box (●) for details.' : '');
    return '<figure class="dg" id="' + uid + '" data-dg="' + esc(d.id) + '" data-step="0" tabindex="0" aria-roledescription="animated diagram">' + head +
      '<div class="dg-canvas">' + (d.kind === 'sequence' ? seqSvg(d, uid) : graphSvg(d, uid)) + '</div>' +
      '<div class="dg-cap" aria-live="polite"><span class="dg-badge">Overview</span><span class="dg-txt">' + esc(intro) + '</span></div>' +
      '<div class="dg-info" hidden></div>' +
      '<div class="dg-ctrl">' +
      '<button type="button" class="btn-xs" data-dga="restart" title="Back to overview" aria-label="Back to overview">⏮</button>' +
      '<button type="button" class="btn-xs" data-dga="prev" title="Previous step (←)" aria-label="Previous step">◀</button>' +
      '<button type="button" class="btn-xs primary dg-play" data-dga="play" title="Play / pause (Space)">▶ Play</button>' +
      '<button type="button" class="btn-xs" data-dga="next" title="Next step (→)" aria-label="Next step">▶</button>' +
      '<span class="dg-count">0 / ' + steps.length + '</span>' +
      '<div class="dg-progress"><div></div></div>' +
      '<button type="button" class="btn-xs" data-dga="speed" title="Playback speed">1×</button>' +
      '<button type="button" class="btn-xs" data-dga="text" title="Show every step as text">☰ Steps</button></div>' +
      '<ol class="dg-steps" hidden>' + steps.map((s) => '<li>' + esc(s.caption || s.label) + '</li>').join('') + '</ol></figure>';
  }

  // ===== Playback ============================================================
  const runtime = new WeakMap();
  function rt(root) {
    let r = runtime.get(root);
    if (!r) { r = { step: 0, playing: false, timer: null, raf: null, speed: 1 }; runtime.set(root, r); }
    return r;
  }
  const defOf = (root) => byId[root.dataset.dg];

  function setStep(root, s, animate) {
    const d = defOf(root);
    const steps = stepList(d);
    const r = rt(root);
    s = Math.max(0, Math.min(steps.length, s));
    r.step = s;
    root.dataset.step = s;
    const st = s ? steps[s - 1] : null;
    root.querySelector('.dg-badge').textContent = s ? 'Step ' + s : 'Overview';
    const hasInfo = (d.nodes || d.actors || []).some((n) => n.info);
    root.querySelector('.dg-txt').textContent = st ? (st.caption || st.label) : (d.desc || '') + (hasInfo ? ' Click a highlighted box (●) for details.' : '');
    root.querySelector('.dg-count').textContent = s + ' / ' + steps.length;
    root.querySelector('.dg-progress > div').style.width = (steps.length ? (s / steps.length) * 100 : 0) + '%';
    clearTokens(root);
    if (d.kind === 'sequence') applySeq(root, d, s, st, animate);
    else applyGraph(root, d, s, st, animate);
  }

  function applyGraph(root, d, s, st, animate) {
    const uid = root.id;
    const flows = (st && st.flows) || [];
    const active = new Set((st && st.active) || []);
    flows.forEach((f) => { active.add(f.from); active.add(f.to); });
    const flowEdges = new Set();
    flows.forEach((f) => { flowEdges.add(f.from + '>' + f.to); flowEdges.add(f.to + '>' + f.from); });
    // The overview (step 0) shows the starting state: nodes that enter later are hidden.
    const visible = (n) => (n.enter || 0) <= s && (!n.exit || s < n.exit);
    const shown = {};
    (d.nodes || []).forEach((n) => { shown[n.id] = visible(n); });
    root.querySelectorAll('.dg-node, .dg-group').forEach((el) => {
      const id = el.dataset.n;
      el.classList.toggle('on', active.has(id));
      el.classList.toggle('dim', active.size > 0 && !active.has(id) && !el.classList.contains('dg-group'));
      el.classList.toggle('gone', shown[id] === false);
    });
    (d.edges || []).forEach((e) => {
      const el = root.querySelector('[data-e="' + CSS.escape(edgeId(e)) + '"]');
      if (!el) return;
      const on = active.has(edgeId(e)) || flowEdges.has(e.from + '>' + e.to);
      el.classList.toggle('on', on);
      el.classList.toggle('dim', active.size > 0 && !on);
      el.classList.toggle('gone', shown[e.from] === false || shown[e.to] === false);
      const p = el.querySelector('path');
      p.setAttribute('marker-end', 'url(#' + uid + (on ? '-o' : '-a') + ')');
      if (e.both) p.setAttribute('marker-start', 'url(#' + uid + (on ? '-so' : '-s') + ')');
    });
    if (!flows.length) return;
    const nodes = nodeMap(d);
    const paths = flows.map((f) => {
      const e = (d.edges || []).find((x) => x.from === f.from && x.to === f.to);
      const back = (d.edges || []).find((x) => x.from === f.to && x.to === f.from);
      const g = e ? link(nodes[e.from], nodes[e.to], e.curve) : back ? reverse(link(nodes[back.from], nodes[back.to], back.curve)) : link(nodes[f.from], nodes[f.to], 0);
      return { at: (t) => bez(g, t), label: f.label, color: f.color };
    });
    runTokens(root, paths, animate);
  }

  function applySeq(root, d, s, st, animate) {
    const uid = root.id;
    root.querySelectorAll('.dg-msg').forEach((el) => {
      const i = Number(el.dataset.m);
      const state = !s ? '' : i < s - 1 ? 'past' : i === s - 1 ? 'on' : 'future';
      el.classList.toggle('past', state === 'past');
      el.classList.toggle('on', state === 'on');
      el.classList.toggle('future', state === 'future');
      el.querySelector('path').setAttribute('marker-end', 'url(#' + uid + (state === 'on' ? '-o' : '-a') + ')');
    });
    root.querySelectorAll('.dg-actor').forEach((el) => {
      el.classList.toggle('on', !!st && (el.dataset.n === st.from || el.dataset.n === st.to));
    });
    if (!st) return;
    const L = seqLayout(d);
    const msgs = d.steps.map((x, i) => ({ x, row: L.rows[i] })).filter((m) => !m.x.section);
    const row = msgs[s - 1].row;
    const x1 = L.ax[st.from], x2 = L.ax[st.to];
    const at = row.self
      ? (t) => (t < 0.33 ? { x: x1 + 34 * (t / 0.33), y: row.y } : t < 0.66 ? { x: x1 + 34, y: row.y + 20 * ((t - 0.33) / 0.33) } : { x: x1 + 34 - 30 * ((t - 0.66) / 0.34), y: row.y + 20 })
      : (t) => ({ x: x1 + (x2 - x1) * t, y: row.y });
    runTokens(root, [{ at, label: null, color: null }], animate);
  }

  // Tokens: dots that travel along a path. Several can move at once (parallel flows).
  function clearTokens(root) {
    const r = rt(root);
    if (r.raf) cancelAnimationFrame(r.raf);
    r.raf = null;
    const layer = root.querySelector('.dg-tokens');
    if (layer) layer.innerHTML = '';
  }

  function runTokens(root, paths, animate) {
    const layer = root.querySelector('.dg-tokens');
    const r = rt(root);
    const NS = 'http://www.w3.org/2000/svg';
    const toks = paths.map((p) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'dg-tok' + (p.color && COLORS.includes(p.color) ? ' c-' + p.color : ''));
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', '6.5');
      g.appendChild(c);
      if (p.label) {
        // Put the label on the side the token comes from, so that where it stops
        // (at the target node's border) the label does not cover the node's text.
        const w = textWidth(p.label, 10.5) + 10;
        const a = p.at(0.85), b = p.at(1);
        const x0 = b.x > a.x + 1 ? -9 - w : 9;
        const bg = document.createElementNS(NS, 'rect');
        bg.setAttribute('x', String(x0)); bg.setAttribute('y', '-8'); bg.setAttribute('width', String(w)); bg.setAttribute('height', '16'); bg.setAttribute('rx', '8');
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', String(x0 + w / 2)); t.setAttribute('y', '3.5'); t.textContent = p.label;
        g.appendChild(bg); g.appendChild(t);
      }
      layer.appendChild(g);
      return { g, p };
    });
    const place = (t) => toks.forEach(({ g, p }) => { const pt = p.at(t); g.setAttribute('transform', 'translate(' + r1(pt.x) + ' ' + r1(pt.y) + ')'); });
    if (!animate || reducedMotion()) { place(animate ? 1 : 0.5); return; }
    const dur = 1100 / r.speed;
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const frame = (now) => {
      if (!root.isConnected) return;
      const t = Math.min(1, (now - t0) / dur);
      place(ease(t));
      r.raf = t < 1 ? requestAnimationFrame(frame) : null;
    };
    place(0);
    r.raf = requestAnimationFrame(frame);
  }

  function dwell(root) {
    const d = defOf(root);
    const st = stepList(d)[rt(root).step - 1];
    const text = st ? st.caption || st.label || '' : '';
    return Math.max(1900, Math.min(7500, 1500 + text.length * 38)) / rt(root).speed;
  }

  function setPlaying(root, on) {
    const r = rt(root);
    r.playing = on;
    clearTimeout(r.timer);
    const btn = root.querySelector('.dg-play');
    const total = stepList(defOf(root)).length;
    btn.textContent = on ? '⏸ Pause' : r.step >= total ? '↻ Replay' : '▶ Play';
    root.classList.toggle('playing', on);
    if (on) r.timer = setTimeout(() => tick(root), r.step === 0 ? 0 : dwell(root));
  }

  function tick(root) {
    const r = rt(root);
    if (!root.isConnected || !r.playing) return;
    const total = stepList(defOf(root)).length;
    if (r.step >= total) { setPlaying(root, false); return; }
    setStep(root, r.step + 1, true);
    if (r.step >= total) { r.timer = setTimeout(() => setPlaying(root, false), dwell(root)); return; }
    r.timer = setTimeout(() => tick(root), dwell(root));
  }

  function togglePlay(root) {
    const r = rt(root);
    if (r.playing) { setPlaying(root, false); return; }
    if (r.step >= stepList(defOf(root)).length) setStep(root, 0, false);
    setPlaying(root, true);
  }

  function showInfo(root, id) {
    const d = defOf(root);
    const n = (d.nodes || d.actors || []).find((x) => x.id === id);
    const box = root.querySelector('.dg-info');
    if (!n || !n.info) return;
    if (!box.hidden && box.dataset.n === id) { box.hidden = true; root.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel')); return; }
    box.dataset.n = id;
    box.innerHTML = '<strong>' + esc((n.icon ? n.icon + ' ' : '') + (n.label || n.id)) + '</strong> — ' + esc(n.info);
    box.hidden = false;
    root.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel'));
    const el = root.querySelector('[data-n="' + CSS.escape(id) + '"]');
    if (el) el.classList.add('sel');
  }

  function toggleExpand(root, force) {
    const on = root.classList.toggle('dg-full', force);
    document.body.classList.toggle('dg-lock', !!document.querySelector('.dg-full'));
    if (on) root.focus({ preventScroll: true });
  }

  const SPEEDS = [1, 1.5, 2, 0.5];
  const ops = {
    play: togglePlay,
    next(root) { setPlaying(root, false); setStep(root, rt(root).step + 1, true); },
    prev(root) { setPlaying(root, false); setStep(root, rt(root).step - 1, true); },
    restart(root) { setPlaying(root, false); setStep(root, 0, false); },
    speed(root, el) {
      const r = rt(root);
      r.speed = SPEEDS[(SPEEDS.indexOf(r.speed) + 1) % SPEEDS.length];
      el.textContent = r.speed + '×';
    },
    text(root, el) {
      const list = root.querySelector('.dg-steps');
      list.hidden = !list.hidden;
      el.classList.toggle('active', !list.hidden);
    },
    expand(root) { toggleExpand(root); },
    node(root, el) { showInfo(root, el.dataset.n); },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-dga]');
    const root = e.target.closest('.dg');
    if (!root) return;
    if (el && ops[el.dataset.dga]) { ops[el.dataset.dga](root, el, e); return; }
    if (root.classList.contains('dg-widget')) widgetEvent(root, e, 'click');
  });
  ['input', 'change'].forEach((type) => document.addEventListener(type, (e) => {
    const root = e.target.closest && e.target.closest('.dg-widget');
    if (root) widgetEvent(root, e, type);
  }));
  document.addEventListener('keydown', (e) => {
    const root = e.target.closest && e.target.closest('.dg');
    if (e.key === 'Escape') { const full = document.querySelector('.dg-full'); if (full) { toggleExpand(full, false); e.stopPropagation(); } return; }
    if (!root || root.classList.contains('dg-widget') || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.dga === 'node') { e.preventDefault(); showInfo(root, e.target.dataset.n); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); ops.next(root); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); ops.prev(root); }
    else if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); togglePlay(root); }
  }, true);

  function widgetEvent(root, e, type) {
    const body = root.querySelector('.dg-wbody');
    const w = WIDGETS[body.dataset.widget];
    const d = defOf(root);
    if (!w) return;
    if (type === 'click') {
      const btn = e.target.closest('[data-wa]');
      if (btn && w.onAction) w.onAction(body, btn.dataset.wa, btn, d.config || {});
    } else if (w.onInput) {
      w.onInput(body, e, d.config || {});
    }
  }

  // ===== Public API ==========================================================
  window.Visuals = {
    all: DIAGRAMS,
    get: (id) => byId[id],
    forTopic: (rid, n, title) => index[rid + '|' + n + '|t|' + title] || [],
    forProblem: (rid, n, title) => index[rid + '|' + n + '|p|' + title] || [],
    html,
    esc,
  };
})();
