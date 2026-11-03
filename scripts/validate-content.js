#!/usr/bin/env node
// Validates roadmap content (web/js/data) and visuals (web/js/visuals) against CONTRIBUTING.md.
// Usage: node scripts/validate-content.js [file ...]   (default: everything)
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DATA_DIR = path.join(__dirname, '..', 'web', 'js', 'data');
const ALLOWED_TAGS = new Set(['strong', 'em', 'b', 'i', 'code', 'br', 'p', 'ul', 'ol', 'li', 'table', 'thead',
  'tbody', 'tr', 'th', 'td', 'pre', 'kbd', 'sub', 'sup']);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const PROBLEM_TYPES = new Set(['coding', 'design', 'hands-on', 'debug', 'concept']);
const RESOURCE_TYPES = new Set(['docs', 'video', 'article', 'book', 'course']);

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isUrl = (v) => isStr(v) && /^https:\/\/[^\s"'<>]+$/.test(v);

function checkHtml(where, html) {
  if (!isStr(html)) return err(where, 'must be a non-empty string');
  // Browsers only start a tag when '<' is immediately followed by a letter or '/'.
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const tag = m[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) err(where, `disallowed tag <${tag}>`);
    if (m[3].trim() && m[3].trim() !== '/') err(where, `attributes not allowed on <${tag}>`);
  }
  // Unbalanced tags (ignoring void tags) — cheap structural sanity check.
  const stack = [];
  const voids = new Set(['br']);
  tagRe.lastIndex = 0;
  while ((m = tagRe.exec(html))) {
    const tag = m[2].toLowerCase();
    if (voids.has(tag) || m[3].trim() === '/') continue;
    if (m[1] === '/') {
      if (stack[stack.length - 1] === tag) stack.pop();
      else return err(where, `unbalanced closing </${tag}>`);
    } else stack.push(tag);
  }
  if (stack.length) err(where, `unclosed <${stack.join('>, <')}>`);
}

function checkPlain(where, text) {
  if (!isStr(text)) return err(where, 'must be a non-empty string');
  if (/<\/?(strong|code|br|em|b|ul|li|p)>/i.test(text)) warn(where, 'looks like HTML in a plain-text field');
}

function checkTopic(where, t) {
  if (typeof t === 'string') return; // legacy topic string (Go weeks)
  if (!isStr(t.title)) err(where, 'topic.title required');
  checkHtml(where + '.def', t.def);
  if (t.interview !== undefined) checkPlain(where + '.interview', t.interview);
  (t.examples || []).forEach((ex, i) => {
    const w = `${where}.examples[${i}]`;
    if (!isStr(ex.label)) err(w, 'label required');
    if (!isStr(ex.code)) err(w, 'code required');
    if (/\t/.test(ex.code || '')) warn(w, 'contains tab characters; use spaces');
  });
}

function checkProblem(where, p, titles) {
  if (typeof p === 'string') return;
  if (!isStr(p.t)) return err(where, 'problem.t required');
  if (titles.has(p.t)) err(where, `duplicate problem title "${p.t}"`);
  titles.add(p.t);
  if (p.d !== undefined && !DIFFICULTIES.has(p.d)) err(where, `bad difficulty "${p.d}"`);
  if (p.type !== undefined && !PROBLEM_TYPES.has(p.type)) err(where, `bad type "${p.type}"`);
  if (p.hint !== undefined) checkHtml(where + '.hint', p.hint);
  if (p.solution !== undefined && !isStr(p.solution)) err(where, 'solution must be a string');
  if (p.url !== undefined && !isUrl(p.url)) err(where, `bad url "${p.url}"`);
  if (p.ex !== undefined && !isUrl(p.ex)) err(where, `bad ex url "${p.ex}"`);
}

function checkModule(where, m, nums) {
  if (!Number.isInteger(m.n)) return err(where, 'module.n must be an integer');
  if (nums.has(m.n)) err(where, `duplicate module number ${m.n}`);
  nums.add(m.n);
  if (!isStr(m.title)) err(where, 'module.title required');
  if (!Array.isArray(m.topics) || !m.topics.length) err(where, 'module.topics must be non-empty');
  (m.topics || []).forEach((t, i) => checkTopic(`${where}.topics[${i}]`, t));
  if (!Array.isArray(m.problems) || !m.problems.length) warn(where, 'module has no problems');
  const titles = new Set();
  (m.problems || []).forEach((p, i) => checkProblem(`${where}.problems[${i}]`, p, titles));
  (m.interviewFocus || []).forEach((f, i) => {
    if (!isStr(f.q)) err(`${where}.interviewFocus[${i}]`, 'q required');
    checkHtml(`${where}.interviewFocus[${i}].a`, f.a);
  });
  (m.quiz || []).forEach((q, i) => {
    if (!isStr(q.q) || !isStr(q.a)) err(`${where}.quiz[${i}]`, 'q and a required');
  });
  (m.resources || []).forEach((r, i) => {
    const w = `${where}.resources[${i}]`;
    if (!isStr(r.title)) err(w, 'title required');
    if (!isUrl(r.url)) err(w, `bad url "${r.url}"`);
    if (r.type !== undefined && !RESOURCE_TYPES.has(r.type)) err(w, `bad type "${r.type}"`);
  });
}

function checkRoadmap(file, r, ids) {
  const where = `${path.basename(file)}[${r && r.id}]`;
  if (!r || !/^[a-z0-9-]+$/.test(r.id || '')) return err(where, 'id must match [a-z0-9-]+');
  if (ids.has(r.id)) err(where, `duplicate roadmap id "${r.id}"`);
  ids.add(r.id);
  for (const k of ['title', 'short', 'icon', 'desc']) if (!isStr(r[k])) err(where, `${k} required`);
  if (!/^#[0-9a-fA-F]{6}$/.test(r.color || '')) err(where, 'color must be #rrggbb');
  if (!Number.isInteger(r.order)) err(where, 'order must be an integer');
  if (!Array.isArray(r.modules) || !r.modules.length) err(where, 'modules must be non-empty');
  const nums = new Set();
  (r.modules || []).forEach((m) => checkModule(`${where}.m${m.n}`, m, nums));
  (r.flashcards || []).forEach((f, i) => {
    if (!isStr(f.q) || !isStr(f.a)) err(`${where}.flashcards[${i}]`, 'q and a required');
    if (f.d !== undefined && ![1, 2, 3].includes(f.d)) err(`${where}.flashcards[${i}]`, 'd must be 1|2|3');
  });
  return {
    id: r.id,
    modules: (r.modules || []).length,
    topics: (r.modules || []).reduce((s, m) => s + (m.topics || []).length, 0),
    problems: (r.modules || []).reduce((s, m) => s + (m.problems || []).length, 0),
    qa: (r.modules || []).reduce((s, m) => s + (m.interviewFocus || []).length + (m.quiz || []).length, 0),
    flashcards: (r.flashcards || []).length,
  };
}

// ===== Visuals (web/js/visuals/*.js) ==========================================
// Layout constants mirror web/js/diagrams.js.
const G = { CW: 160, CH: 84, PX: 12, PY: 14 };
const S = { COL: 170, PAD: 16 };
const COLORS = new Set(['blue', 'green', 'orange', 'purple', 'red', 'yellow', 'teal', 'gray']);
const SHAPES = new Set(['box', 'db', 'pill', 'diamond', 'circle']);
const KINDS = new Set(['graph', 'sequence', 'widget']);
// Rendered text width estimate (px, deliberately conservative). Emoji count double.
const wide = (cp) => cp >= 0x1f000 || (cp >= 0x2600 && cp <= 0x27bf);
const tw = (s, px) => [...String(s)].reduce((n, ch) => n + (wide(ch.codePointAt(0)) ? 2 : 1), 0) * px * 0.58;
const rectOf = (n) => ({ x: n.x * G.CW + G.PX, y: n.y * G.CH + G.PY, w: (n.w || 1) * G.CW - 2 * G.PX, h: (n.h || 1) * G.CH - 2 * G.PY });
const inter = (a, b, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const inside = (p, r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
const num = (v) => typeof v === 'number' && Number.isFinite(v);

function checkCaption(where, text, max) {
  checkPlain(where, text);
  if (isStr(text) && text.length > max) err(where, `too long (${text.length} > ${max} chars)`);
}

function checkGraph(where, d) {
  if (!Array.isArray(d.nodes) || d.nodes.length < 2 || d.nodes.length > 24) return err(where, 'graph needs 2-24 nodes');
  const ids = new Set();
  let W = 0, H = 0;
  d.nodes.concat(d.groups || []).forEach((n) => {
    const w = `${where}.${n.id}`;
    if (!/^[A-Za-z0-9_-]+$/.test(n.id || '')) err(w, 'id must match [A-Za-z0-9_-]+');
    if (ids.has(n.id)) err(w, 'duplicate node/group id');
    ids.add(n.id);
    if (!num(n.x) || !num(n.y) || n.x < 0 || n.y < 0) err(w, 'x and y must be numbers >= 0');
    if ((n.w !== undefined && !(num(n.w) && n.w > 0)) || (n.h !== undefined && !(num(n.h) && n.h > 0))) err(w, 'w/h must be positive numbers');
    if (n.color !== undefined && !COLORS.has(n.color)) err(w, `bad color "${n.color}"`);
    W = Math.max(W, n.x + (n.w || 1)); H = Math.max(H, n.y + (n.h || 1));
  });
  if (W > 8) err(where, `grid is ${W} columns wide (max 8)`);
  if (H > 9) err(where, `grid is ${H} rows tall (max 9)`);
  const nodes = Object.fromEntries(d.nodes.map((n) => [n.id, n]));
  d.nodes.forEach((n) => {
    const w = `${where}.${n.id}`;
    const r = rectOf(n);
    const label = (n.icon ? n.icon + ' ' : '') + (n.label || n.id);
    if (n.shape !== undefined && !SHAPES.has(n.shape)) err(w, `bad shape "${n.shape}"`);
    const room = n.shape === 'diamond' || n.shape === 'circle' ? r.w * 0.7 : r.w - 10;
    if (tw(label, 12.5) > room) err(w, `label "${label}" is too wide for w=${n.w || 1} (~${Math.round(tw(label, 12.5))}px > ${Math.round(room)}px): shorten it or widen the node`);
    if (n.sub !== undefined && tw(n.sub, 10.5) > room) err(w, `sub "${n.sub}" is too wide (~${Math.round(tw(n.sub, 10.5))}px > ${Math.round(room)}px)`);
    if (r.h < (n.sub ? 40 : 24)) err(w, `node too short for its text (h=${n.h})`);
    if (n.info !== undefined) checkCaption(w + '.info', n.info, 420);
    for (const k of ['enter', 'exit']) {
      if (n[k] !== undefined && !(Number.isInteger(n[k]) && n[k] >= 1 && n[k] <= (d.steps || []).length)) err(w, `${k} must be a step number 1..${(d.steps || []).length}`);
    }
  });
  for (let i = 0; i < d.nodes.length; i++) {
    for (let j = i + 1; j < d.nodes.length; j++) {
      if (inter(rectOf(d.nodes[i]), rectOf(d.nodes[j]), 2)) err(where, `nodes "${d.nodes[i].id}" and "${d.nodes[j].id}" overlap`);
    }
  }
  (d.groups || []).forEach((g) => {
    const gr = { x: g.x * G.CW + 6, y: g.y * G.CH + 7, w: (g.w || 1) * G.CW - 12, h: (g.h || 1) * G.CH - 14 };
    if (!isStr(g.label)) err(`${where}.${g.id}`, 'group label required');
    d.nodes.forEach((n) => {
      const r = rectOf(n);
      const full = r.x >= gr.x && r.y >= gr.y && r.x + r.w <= gr.x + gr.w && r.y + r.h <= gr.y + gr.h;
      if (inter(r, gr) && !full) err(`${where}.${g.id}`, `node "${n.id}" straddles the group border: put it fully inside or outside`);
    });
  });
  const eids = new Set();
  (d.edges || []).forEach((e, i) => {
    const w = `${where}.edges[${i}]`;
    if (!nodes[e.from] || !nodes[e.to]) return err(w, `unknown node in ${e.from} -> ${e.to}`);
    if (e.from === e.to) return err(w, 'self-loop not supported');
    const id = e.id || e.from + '>' + e.to;
    if (eids.has(id)) err(w, `duplicate edge ${id} (give it an id)`);
    eids.add(id);
    if (e.curve !== undefined && !(num(e.curve) && Math.abs(e.curve) <= 140)) err(w, 'curve must be a number in [-140, 140]');
    if (e.label !== undefined && (!isStr(e.label) || e.label.length > 24)) err(w, 'label must be a string of at most 24 chars');
    // The edge must not run through other nodes, and its label must not sit on a node.
    const a = rectOf(nodes[e.from]), b = rectOf(nodes[e.to]);
    const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const len = Math.hypot(cb.x - ca.x, cb.y - ca.y) || 1;
    const bend = e.curve || 0;
    const c = { x: (ca.x + cb.x) / 2 - ((cb.y - ca.y) / len) * bend, y: (ca.y + cb.y) / 2 + ((cb.x - ca.x) / len) * bend };
    const pt = (t) => ({ x: (1 - t) * (1 - t) * ca.x + 2 * (1 - t) * t * c.x + t * t * cb.x, y: (1 - t) * (1 - t) * ca.y + 2 * (1 - t) * t * c.y + t * t * cb.y });
    d.nodes.forEach((n) => {
      if (n.id === e.from || n.id === e.to) return;
      const r = rectOf(n);
      const shrunk = { x: r.x + 4, y: r.y + 4, w: r.w - 8, h: r.h - 8 };
      for (let t = 0.02; t < 0.98; t += 0.02) {
        if (inside(pt(t), shrunk)) { err(w, `edge ${e.from} -> ${e.to} passes through node "${n.id}" (move nodes or add a curve)`); break; }
      }
    });
    if (e.label) {
      const m = pt(0.5);
      const lw = tw(e.label, 10.5) + 10;
      const lr = { x: m.x - lw / 2, y: m.y - 8, w: lw, h: 16 };
      d.nodes.forEach((n) => { if (inter(lr, rectOf(n))) err(w, `label "${e.label}" overlaps node "${n.id}" (shorten it or space the nodes)`); });
    }
  });
  if (!Array.isArray(d.steps) || !d.steps.length || d.steps.length > 16) return err(where, 'graph needs 1-16 steps');
  d.steps.forEach((st, i) => {
    const w = `${where}.steps[${i}]`;
    checkCaption(w + '.caption', st.caption, 300);
    (st.active || []).forEach((id) => { if (!ids.has(id) && !eids.has(id)) err(w, `active refers to unknown id "${id}"`); });
    (st.flows || []).forEach((f) => {
      if (!nodes[f.from] || !nodes[f.to]) err(w, `flow refers to unknown node ${f.from} -> ${f.to}`);
      if (f.label !== undefined && (!isStr(f.label) || f.label.length > 18)) err(w, `flow label must be at most 18 chars ("${f.label}")`);
      if (f.color !== undefined && !COLORS.has(f.color)) err(w, `bad flow color "${f.color}"`);
    });
    if (!(st.active || []).length && !(st.flows || []).length) warn(w, 'step highlights nothing (add active or flows)');
  });
}

function checkSequence(where, d) {
  if (!Array.isArray(d.actors) || d.actors.length < 2 || d.actors.length > 6) return err(where, 'sequence needs 2-6 actors');
  const ax = {};
  d.actors.forEach((a, i) => {
    const w = `${where}.${a.id}`;
    if (!/^[A-Za-z0-9_-]+$/.test(a.id || '')) err(w, 'id must match [A-Za-z0-9_-]+');
    if (ax[a.id] !== undefined) err(w, 'duplicate actor id');
    ax[a.id] = S.PAD + S.COL * i + S.COL / 2;
    const label = (a.icon ? a.icon + ' ' : '') + (a.label || a.id);
    if (tw(label, 12.5) > S.COL - 30) err(w, `label "${label}" too wide (max ~19 chars)`);
    if (a.sub !== undefined && tw(a.sub, 10.5) > S.COL - 30) err(w, `sub "${a.sub}" too wide (max ~22 chars)`);
    if (a.color !== undefined && !COLORS.has(a.color)) err(w, `bad color "${a.color}"`);
    if (a.info !== undefined) checkCaption(w + '.info', a.info, 420);
  });
  if (!Array.isArray(d.steps) || !d.steps.length) return err(where, 'sequence needs steps');
  const msgs = d.steps.filter((s) => !s.section);
  if (!msgs.length || msgs.length > 18) err(where, 'sequence needs 1-18 messages');
  d.steps.forEach((st, i) => {
    const w = `${where}.steps[${i}]`;
    if (st.section !== undefined) {
      if (!isStr(st.section) || st.section.length > 40) err(w, 'section must be a string of at most 40 chars');
      return;
    }
    if (ax[st.from] === undefined || ax[st.to] === undefined) return err(w, `unknown actor in ${st.from} -> ${st.to}`);
    if (!isStr(st.label)) err(w, 'label required');
    checkCaption(w + '.caption', st.caption, 300);
    const room = st.from === st.to
      ? S.COL - 46
      : Math.abs(ax[st.to] - ax[st.from]) - 22;
    if (isStr(st.label) && tw(st.label, 11.5) > room) err(w, `label "${st.label}" too wide for the gap (~${Math.round(tw(st.label, 11.5))}px > ${Math.round(room)}px): shorten it or reorder actors`);
  });
}

function checkVisual(where, d, ctx) {
  if (!d || !/^[a-z0-9-]+$/.test(d.id || '')) return err(where, 'id must match [a-z0-9-]+');
  where = `${where}[${d.id}]`;
  if (ctx.ids.has(d.id)) err(where, 'duplicate diagram id');
  ctx.ids.add(d.id);
  if (!KINDS.has(d.kind)) return err(where, 'kind must be graph | sequence | widget');
  if (!isStr(d.title) || d.title.length > 80) err(where, 'title required (max 80 chars)');
  if (d.desc !== undefined) checkCaption(where + '.desc', d.desc, 300);
  const rm = ctx.roadmaps[d.roadmap];
  if (!rm) return err(where, `unknown roadmap "${d.roadmap}"`);
  const m = (rm.modules || []).find((x) => x.n === d.module);
  if (!m) return err(where, `roadmap ${d.roadmap} has no module ${d.module}`);
  if (!!d.topic === !!d.problem) return err(where, 'set exactly one of topic or problem (exact title)');
  if (d.topic && !m.topics.some((t) => (typeof t === 'string' ? t : t.title) === d.topic)) err(where, `module ${d.module} has no topic titled "${d.topic}"`);
  if (d.problem && !(m.problems || []).some((p) => (typeof p === 'string' ? p : p.t) === d.problem)) err(where, `module ${d.module} has no problem titled "${d.problem}"`);
  if (d.kind === 'graph') checkGraph(where, d);
  else if (d.kind === 'sequence') checkSequence(where, d);
  else if (!ctx.widgets.has(d.widget)) err(where, `unknown widget "${d.widget}" (known: ${[...ctx.widgets].join(', ')})`);
  ctx.count[d.roadmap] = (ctx.count[d.roadmap] || 0) + 1;
}

function loadScript(file, ctx) {
  vm.createContext(ctx);
  try {
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
    return true;
  } catch (e) {
    err(path.basename(file), `failed to evaluate: ${e.message}`);
    return false;
  }
}

const listJs = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => path.join(dir, f)) : []);

function main() {
  const VIS_DIR = path.join(__dirname, '..', 'web', 'js', 'visuals');
  const args = process.argv.slice(2).map((f) => path.resolve(f));
  const isVis = (f) => path.dirname(f) === VIS_DIR;
  const dataTargets = args.length ? args.filter((f) => !isVis(f)) : listJs(DATA_DIR);
  const visTargets = args.length ? args.filter(isVis) : listJs(VIS_DIR);

  // All roadmaps are always loaded: visuals are checked against their topics.
  const roadmaps = {};
  const ids = new Set();
  const stats = [];
  for (const file of listJs(DATA_DIR)) {
    const registered = [];
    if (!loadScript(file, { registerRoadmap: (r) => registered.push(r), console })) continue;
    const validate = dataTargets.includes(file);
    if (validate && !registered.length) err(path.basename(file), 'did not call registerRoadmap()');
    registered.forEach((r) => {
      if (r && r.id) roadmaps[r.id] = r;
      if (!validate) return;
      const s = checkRoadmap(file, r, ids);
      if (s) stats.push(s);
    });
  }

  const widgets = new Set();
  loadScript(path.join(__dirname, '..', 'web', 'js', 'widgets.js'), { registerWidget: (name) => widgets.add(name), console, window: {}, document: {} });
  const vctx = { ids: new Set(), roadmaps, widgets, count: {} };
  // Ids must be unique across all visuals files, so every file is loaded; only targets are reported.
  for (const file of listJs(VIS_DIR)) {
    const registered = [];
    const before = errors.length;
    const beforeW = warnings.length;
    loadScript(file, { registerDiagram: (d) => registered.push(d), console });
    registered.forEach((d) => checkVisual(path.basename(file), d, vctx));
    if (!visTargets.includes(file)) { errors.length = before; warnings.length = beforeW; }
  }

  stats.forEach((s) => { s.visuals = vctx.count[s.id] || 0; });
  if (stats.length) console.table(stats);
  else if (Object.keys(vctx.count).length) console.table(vctx.count);
  warnings.forEach((w) => console.warn('WARN ', w));
  errors.forEach((e) => console.error('ERROR', e));
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}

main();
