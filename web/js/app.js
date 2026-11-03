// Cloud-Native Engineering Roadmap — SPA engine.
// Hash router, rendering, progress state (localStorage + optional server sync),
// search, flashcards. No inline handlers: all events are delegated (CSP-safe).
(function () {
  'use strict';

  // ===== Utilities ===========================================================
  const $ = (id) => document.getElementById(id);
  const esc = (s) => (s == null ? '' : String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
  const attr = esc;
  const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);
  const today = () => new Date().toISOString().slice(0, 10);
  const DIFF = { 1: 'easy', 2: 'medium', 3: 'hard' };
  const TYPE_ICON = { coding: '💻', design: '📐', 'hands-on': '🛠️', debug: '🐞', concept: '💡' };
  const RES_ICON = { docs: '📘', video: '▶️', article: '📰', book: '📗', course: '🎓' };

  // ===== Content model =======================================================
  const roadmaps = ROADMAPS.slice().sort((a, b) => a.order - b.order);
  const byId = Object.fromEntries(roadmaps.map((r) => [r.id, r]));

  const prefixOf = (rm) => rm.idPrefix || rm.id + '_m';
  const unitAbbr = (rm) => (rm.unit === 'Week' ? 'W' : 'M');
  const topicId = (rm, m, i) => prefixOf(rm) + m.n + '_topic_' + i;
  const problemId = (rm, m, p, i) => (p && p.id) || prefixOf(rm) + m.n + '_prob_' + i;
  const trackProbId = (key, week, i) => 'trk_' + key + '_' + week + '_' + i;
  const lcId = (i) => 'wlc_prob_' + i;

  // Topics/problems may be legacy strings or objects — normalise once.
  roadmaps.forEach((rm) => rm.modules.forEach((m) => {
    m.topics = m.topics.map((t) => (typeof t === 'string' ? { title: t } : t));
    m.problems = (m.problems || []).map((p) => (typeof p === 'string' ? { t: p } : p));
  }));

  function moduleItems(rm, m) {
    const ids = m.topics.map((_, i) => topicId(rm, m, i));
    m.problems.forEach((p, i) => ids.push(problemId(rm, m, p, i)));
    return ids;
  }
  const countDone = (ids) => ids.reduce((n, id) => n + (state.checks[id] ? 1 : 0), 0);
  function moduleProgress(rm, m) {
    const ids = moduleItems(rm, m);
    return { done: countDone(ids), total: ids.length };
  }
  function roadmapProgress(rm) {
    return rm.modules.reduce((acc, m) => {
      const p = moduleProgress(rm, m);
      acc.done += p.done; acc.total += p.total;
      return acc;
    }, { done: 0, total: 0 });
  }
  function overallProgress() {
    return roadmaps.reduce((acc, rm) => {
      const p = roadmapProgress(rm);
      acc.done += p.done; acc.total += p.total;
      return acc;
    }, { done: 0, total: 0 });
  }
  const allFlashcards = () => roadmaps.flatMap((rm) => (rm.flashcards || []).map((f) => Object.assign({ rid: rm.id }, f)));

  // Visual explainers (js/diagrams.js). Absent when the script is not loaded.
  const V = window.Visuals || { all: [], forTopic: () => [], forProblem: () => [], html: () => '' };
  const visualsHtml = (list) => list.map((d) => V.html(d)).join('');
  const moduleVisualCount = (rm, m) => V.all.filter((d) => d.roadmap === rm.id && d.module === m.n).length;

  // First unfinished topic in the roadmap (falls back to the first unfinished problem).
  function nextUp(rm) {
    for (const m of rm.modules) {
      const i = m.topics.findIndex((_, k) => !state.checks[topicId(rm, m, k)]);
      if (i >= 0) return { m, label: m.topics[i].title, href: href.module(rm, m), target: 'tc-' + topicId(rm, m, i) };
    }
    for (const m of rm.modules) {
      const i = m.problems.findIndex((p, k) => !state.checks[problemId(rm, m, p, k)]);
      if (i >= 0) return { m, label: m.problems[i].t, href: href.module(rm, m, 'practice'), target: 'pb-' + problemId(rm, m, m.problems[i], i) };
    }
    return null;
  }

  // ===== State ===============================================================
  const STORAGE_KEY = 'cnr_state_v3';
  const LEGACY_KEY = 'go_roadmap_v2';

  function blankState() {
    return { version: 3, checks: {}, notes: {}, srs: {}, streak: { lastDate: null, count: 0 }, prefs: { track: 'google', theme: 'dark', fc: 'all' }, updatedAt: null };
  }

  // Accepts v3 state or the legacy v2 shape and returns a well-formed v3 state.
  function normalizeState(s) {
    const out = blankState();
    if (!s || typeof s !== 'object') return out;
    out.checks = Object.assign({}, s.checks);
    out.notes = Object.assign({}, s.notes);
    out.srs = s.srs && typeof s.srs === 'object' ? Object.assign({}, s.srs) : {};
    if (s.streak && typeof s.streak === 'object') out.streak = { lastDate: s.streak.lastDate || null, count: s.streak.count | 0 };
    out.prefs = Object.assign(out.prefs, s.prefs);
    out.updatedAt = s.updatedAt || null;
    if (s.version !== 3) {
      // v2: track problem ids were "w{week}_tprob_{i}" (shared by all tracks).
      // Attribute them to the track that was active, which is the best information available.
      const track = s.activeTrack || 'google';
      out.prefs.track = track;
      Object.keys(out.checks).forEach((id) => {
        const m = /^w(\d+)_tprob_(\d+)$/.exec(id);
        if (m) {
          if (out.checks[id]) out.checks[trackProbId(track, m[1], m[2])] = true;
          delete out.checks[id];
        }
      });
    }
    return out;
  }

  function loadLocal() {
    try {
      const v3 = localStorage.getItem(STORAGE_KEY);
      if (v3) return normalizeState(JSON.parse(v3));
      const v2 = localStorage.getItem(LEGACY_KEY);
      if (v2) return normalizeState(JSON.parse(v2));
    } catch (e) { console.warn('could not read saved progress', e); }
    return blankState();
  }

  let state = loadLocal();

  function save() {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { toast('Could not save locally: ' + e.message, 'error'); }
    sync.schedule();
  }

  // ===== Server sync =========================================================
  // When served by the Go backend, progress is mirrored to SQLite. The newest
  // copy (by updatedAt) wins on load. Opened from file:// it stays local-only.
  const sync = {
    online: false,
    timer: null,
    failures: 0,
    serverVersion: null,
    async init() {
      if (location.protocol === 'file:') return this.badge();
      try {
        const res = await fetch('api/v1/state', { cache: 'no-store', headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const body = await res.json();
        this.online = true;
        const remote = body && body.state && Object.keys(body.state).length ? normalizeState(body.state) : null;
        if (remote && !remote.updatedAt && body.updatedAt) remote.updatedAt = body.updatedAt;
        const ts = (s) => Date.parse(s) || 0;
        this.checkVersion();
        if (remote && (!state.updatedAt || ts(remote.updatedAt) > ts(state.updatedAt))) {
          state = remote;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          render();
        } else if (state.updatedAt) {
          this.push();
        }
      } catch (e) {
        this.online = false;
      }
      this.badge();
    },
    schedule() {
      if (!this.online) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.push(), 600);
    },
    async push(keepalive) {
      clearTimeout(this.timer);
      this.timer = null;
      try {
        const res = await fetch('api/v1/state', {
          method: 'PUT', keepalive: !!keepalive,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        if (this.failures) { this.failures = 0; this.checkVersion(); } // the server is back, maybe upgraded
        this.badge();
      } catch (e) {
        // Keep retrying with backoff (e.g. while the server restarts during an upgrade).
        // Progress is safe in localStorage meanwhile.
        this.badge('error');
        this.timer = setTimeout(() => this.push(), Math.min(30000, 2000 * Math.pow(2, this.failures++)));
      }
    },
    // Offers a reload when the server runs a different release than this page.
    async checkVersion() {
      if (!this.online) return;
      try {
        const res = await fetch('api/v1/version', { cache: 'no-store' });
        if (!res.ok) return;
        const v = (await res.json()).version;
        this.serverVersion = v;
        const bar = $('updateBar');
        if (bar && v && v !== 'dev' && typeof APP_VERSION === 'string' && v !== APP_VERSION) {
          $('updateMsg').textContent = 'The app was upgraded to v' + v + ' (this page is v' + APP_VERSION + '). Reload to get the latest content — your progress is saved.';
          bar.hidden = false;
        }
      } catch (e) { /* offline: try again later */ }
    },
    flush() { if (this.online && (this.timer || this.failures)) this.push(true); },
    badge(status) {
      const b = $('syncBadge');
      if (!b) return;
      b.className = 'sync-badge' + (status === 'error' ? ' err' : this.online ? ' ok' : '');
      b.textContent = status === 'error' ? 'Sync error' : this.online ? 'Synced' : 'Local';
      b.title = this.online ? 'Progress is saved in this browser and on the server' : 'Progress is saved in this browser only';
    },
  };

  // ===== Router ==============================================================
  // #/                               dashboard
  // #/flashcards                     flashcards (spaced-repetition review + browse)
  // #/visuals[/{rid}]                gallery of diagrams and interactive labs
  // #/r/{rid}                        roadmap overview
  // #/r/{rid}/m/{n}[/{tab}]          module (tab: study | practice | qa | notes)
  // #/r/{rid}/track/{key}/{week}     company track week
  // #/r/{rid}/practice               practice list (LeetCode)
  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (!parts.length) return { view: 'dashboard' };
    if (parts[0] === 'flashcards') return { view: 'flashcards' };
    if (parts[0] === 'visuals') return { view: 'visuals', rid: byId[parts[1]] ? parts[1] : null };
    if (parts[0] === 'r' && byId[parts[1]]) {
      const rm = byId[parts[1]];
      if (parts[2] === 'm') {
        const m = rm.modules.find((x) => String(x.n) === parts[3]);
        if (m) return { view: 'module', rm, m, tab: ['study', 'practice', 'qa', 'notes'].includes(parts[4]) ? parts[4] : 'study' };
      }
      if (parts[2] === 'track' && rm.tracks && rm.tracks[parts[3]]) {
        const tr = rm.tracks[parts[3]];
        const w = tr.weeks.find((x) => String(x.week) === parts[4]) || tr.weeks[0];
        return { view: 'track', rm, key: parts[3], tr, w };
      }
      if (parts[2] === 'practice' && rm.practice) return { view: 'practice', rm };
      return { view: 'roadmap', rm };
    }
    return { view: 'notfound' };
  }

  const href = {
    roadmap: (rm) => '#/r/' + rm.id,
    module: (rm, m, tab) => '#/r/' + rm.id + '/m/' + m.n + (tab && tab !== 'study' ? '/' + tab : ''),
    track: (rm, key, week) => '#/r/' + rm.id + '/track/' + key + '/' + week,
    practice: (rm) => '#/r/' + rm.id + '/practice',
  };

  let route = parseRoute();

  // ===== Rendering: shell ====================================================
  function render() {
    route = parseRoute();
    if (route.view !== 'dashboard' && route.view !== 'notfound' && state.prefs.lastRoute !== location.hash) {
      // Navigation is a local preference: persist it without bumping updatedAt or syncing.
      state.prefs.lastRoute = location.hash;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* quota: ignore */ }
    }
    renderSidebar();
    renderContent();
    updateHeaderProgress();
  }

  function updateHeaderProgress() {
    const p = overallProgress();
    const v = pct(p.done, p.total);
    $('overallPct').textContent = v + '%';
    $('overallFill').style.width = v + '%';
    $('streakBadge').textContent = '🔥 ' + (state.streak.count || 0) + ' day streak';
  }

  function navLink(hrefStr, badge, label, opts) {
    opts = opts || {};
    const active = opts.active ? ' active' : '';
    const pctHtml = opts.pct !== undefined ? '<span class="nav-pct">' + opts.pct + '%</span>' : '';
    const style = opts.color ? ' style="--c:' + attr(opts.color) + '"' : '';
    return '<a class="nav-item' + active + (opts.cls ? ' ' + opts.cls : '') + '" href="' + attr(hrefStr) + '"' + style +
      (opts.active ? ' aria-current="page"' : '') + '><span class="nav-badge">' + badge + '</span><span class="nav-label">' +
      esc(label) + '</span>' + pctHtml + '</a>';
  }

  function renderSidebar() {
    const r = route;
    const activeRm = r.rm;
    let h = '<div class="nav-grp">';
    h += navLink('#/', '🏠', 'Dashboard', { active: r.view === 'dashboard' });
    const due = srsQueue('all', state.prefs.srsQuiz).due;
    h += navLink('#/flashcards', '🃏', 'Review & Flashcards' + (due ? ' (' + due + ' due)' : ''), { active: r.view === 'flashcards' });
    if (V.all.length) h += navLink('#/visuals', '🎬', 'Visual Explainers', { active: r.view === 'visuals' });
    h += '</div><div class="nav-grp"><div class="nav-lbl">Roadmaps</div>';
    roadmaps.forEach((rm) => {
      const p = roadmapProgress(rm);
      const isActive = activeRm === rm;
      h += navLink(href.roadmap(rm), esc(rm.icon), rm.short, { active: isActive && r.view === 'roadmap', pct: pct(p.done, p.total), color: rm.color, cls: 'rm-item' + (isActive ? ' open' : '') });
      if (!isActive) return;
      h += '<div class="nav-sub" style="--c:' + attr(rm.color) + '">';
      let group = null;
      rm.modules.forEach((m) => {
        if (m.group && m.group !== group) { group = m.group; h += '<div class="nav-sublbl">' + esc(group) + '</div>'; }
        const mp = moduleProgress(rm, m);
        h += navLink(href.module(rm, m), unitAbbr(rm) + m.n, m.title, { active: r.view === 'module' && r.m === m, pct: pct(mp.done, mp.total) });
      });
      if (rm.practice) {
        h += '<div class="nav-sublbl">Practice</div>';
        h += navLink(href.practice(rm), 'LC', rm.practice.title, { active: r.view === 'practice' });
      }
      if (rm.tracks) {
        h += '<div class="nav-sublbl">Company tracks</div>';
        Object.keys(rm.tracks).forEach((key) => {
          const tr = rm.tracks[key];
          const open = r.view === 'track' && r.key === key;
          h += navLink(href.track(rm, key, tr.weeks[0].week), esc(tr.icon), tr.name, { active: false, color: tr.color, cls: open ? 'open' : '' });
          if (open) {
            tr.weeks.forEach((w, i) => {
              h += navLink(href.track(rm, key, w.week), 'T' + (i + 1), w.title, { active: r.w === w, cls: 'nav-deep' });
            });
          }
        });
      }
      h += '</div>';
    });
    h += '</div>';
    $('sidebarNav').innerHTML = h;
  }

  function setChrome(crumbs, tabs) {
    $('breadcrumb').innerHTML = crumbs.map((c, i) => (i === crumbs.length - 1 || !c.href
      ? '<span>' + esc(c.label) + '</span>'
      : '<a href="' + attr(c.href) + '">' + esc(c.label) + '</a>')).join('<span class="sep">/</span>');
    $('topbarTabs').innerHTML = (tabs || []).map((t) => '<a role="tab" class="tab' + (t.active ? ' active' : '') +
      '" aria-selected="' + !!t.active + '" href="' + attr(t.href) + '">' + t.label + '</a>').join('');
  }

  function renderContent() {
    const area = $('content');
    const views = { dashboard: viewDashboard, flashcards: viewFlashcards, visuals: viewVisuals, roadmap: viewRoadmap, module: viewModule, track: viewTrack, practice: viewPractice, notfound: viewNotFound };
    area.innerHTML = views[route.view](route);
    area.scrollTop = 0;
  }

  // ===== Views ===============================================================
  function progressBar(p, color) {
    return '<div class="bar"><div class="bar-fill" style="width:' + p + '%' + (color ? ';background:' + attr(color) : '') + '"></div></div>';
  }

  function viewDashboard() {
    setChrome([{ label: 'Dashboard' }]);
    const p = overallProgress();
    const cards = allFlashcards();
    const counts = roadmaps.reduce((a, rm) => {
      rm.modules.forEach((m) => { a.topics += m.topics.length; a.problems += m.problems.length; });
      return a;
    }, { topics: 0, problems: 0 });

    let h = '<header class="pg-hdr"><h1>🚀 Cloud-Native Engineering Roadmap</h1>' +
      '<p class="sub">Go, Kubernetes, Cloud, Security, Networking, System Design, Computer Architecture and Storage — structured for senior backend interviews.</p></header>';
    h += '<div class="stat-grid">' +
      stat(pct(p.done, p.total) + '%', 'Overall progress') +
      stat(p.done + ' / ' + p.total, 'Items completed') +
      stat(counts.topics + ' · ' + counts.problems, 'Topics · Problems') +
      stat((state.streak.count || 0) + ' 🔥', 'Day streak') + '</div>';

    if (state.prefs.lastRoute && state.prefs.lastRoute !== '#/') {
      h += '<a class="resume" href="' + attr(state.prefs.lastRoute) + '">↩ Continue where you left off</a>';
    }
    const q = srsQueue('all', state.prefs.srsQuiz);
    if (q.due) {
      h += '<a class="next-up due-card" href="#/flashcards"><b>🧠 Review</b><span>' + q.due + ' card' + (q.due === 1 ? ' is' : 's are') +
        ' due today. Spaced review keeps what you studied from fading.</span>→</a>';
    }

    h += '<h2 class="sec-title">Roadmaps</h2><div class="card-grid">';
    roadmaps.forEach((rm) => {
      const rp = roadmapProgress(rm);
      const topics = rm.modules.reduce((n, m) => n + m.topics.length, 0);
      const probs = rm.modules.reduce((n, m) => n + m.problems.length, 0);
      const vis = V.all.filter((d) => d.roadmap === rm.id).length;
      const nu = rp.done ? nextUp(rm) : null;
      h += '<a class="rm-card" href="' + href.roadmap(rm) + '" style="--c:' + attr(rm.color) + '">' +
        '<div class="rm-card-top"><span class="rm-icon">' + esc(rm.icon) + '</span><span class="rm-pct">' + pct(rp.done, rp.total) + '%</span></div>' +
        '<h3>' + esc(rm.title) + '</h3><p>' + esc(rm.desc) + '</p>' +
        '<div class="rm-meta">' + rm.modules.length + ' ' + esc(rm.unit.toLowerCase()) + 's · ' + topics + ' topics · ' + probs + ' problems' + (vis ? ' · ' + vis + ' visuals' : '') + '</div>' +
        (nu ? '<div class="rm-meta">▶ Next: ' + esc(unitAbbr(rm) + nu.m.n + ' · ' + nu.label) + '</div>' : '') +
        progressBar(pct(rp.done, rp.total), rm.color) + '</a>';
    });
    h += '</div>';

    if (cards.length) {
      h += '<h2 class="sec-title">Quick flashcard</h2>' + flashcardWidget(cards);
    }
    return h;
  }

  const stat = (v, l) => '<div class="stat"><div class="stat-val">' + v + '</div><div class="stat-lbl">' + esc(l) + '</div></div>';

  function viewRoadmap(r) {
    const rm = r.rm;
    setChrome([{ label: 'Dashboard', href: '#/' }, { label: rm.title }]);
    const rp = roadmapProgress(rm);
    let h = '<header class="pg-hdr" style="--c:' + attr(rm.color) + '"><h1><span class="rm-icon">' + esc(rm.icon) + '</span> ' + esc(rm.title) + '</h1>' +
      '<p class="sub">' + esc(rm.desc) + '</p><div class="pg-prog">' + progressBar(pct(rp.done, rp.total), rm.color) +
      '<span>' + rp.done + ' / ' + rp.total + ' completed</span></div></header>';

    const nu = nextUp(rm);
    if (nu) {
      h += '<a class="next-up" style="--c:' + attr(rm.color) + '" href="' + attr(nu.href) + '" data-focus="' + attr(nu.target) + '"><b>' + (rp.done ? '▶ Next up' : '▶ Start here') + '</b><span>' +
        esc(unitAbbr(rm) + nu.m.n + ' · ' + nu.m.title + ' — ' + nu.label) + '</span>→</a>';
    }

    let group = null;
    h += '<div class="module-list">';
    rm.modules.forEach((m) => {
      if (m.group && m.group !== group) {
        group = m.group;
        h += '</div><h2 class="sec-title">' + esc(group) + '</h2><div class="module-list">';
      }
      const mp = moduleProgress(rm, m);
      h += '<a class="module-card" href="' + href.module(rm, m) + '" style="--c:' + attr(rm.color) + '">' +
        '<span class="mod-num">' + unitAbbr(rm) + m.n + '</span><div class="mod-body"><h3>' + esc(m.title) + '</h3>' +
        (m.summary ? '<p>' + esc(m.summary) + '</p>' : '<p>' + esc(m.topics.map((t) => t.title).slice(0, 4).join(' · ')) + '</p>') +
        '<div class="mod-meta">' + m.topics.length + ' topics · ' + m.problems.length + ' problems · ' +
        ((m.interviewFocus || []).length + (m.quiz || []).length) + ' Q&amp;A' + (moduleVisualCount(rm, m) ? ' · 🎬 ' + moduleVisualCount(rm, m) + ' visuals' : '') +
        '</div>' + progressBar(pct(mp.done, mp.total), rm.color) +
        '</div></a>';
    });
    h += '</div>';

    if (rm.practice) {
      const done = rm.practice.items.filter((_, i) => state.checks[lcId(i)]).length;
      h += '<h2 class="sec-title">Practice</h2><div class="module-list"><a class="module-card" href="' + href.practice(rm) + '">' +
        '<span class="mod-num">LC</span><div class="mod-body"><h3>' + esc(rm.practice.title) + '</h3><p>Must-solve problems for Go interviews.</p>' +
        '<div class="mod-meta">' + done + ' / ' + rm.practice.items.length + ' solved</div></div></a></div>';
    }
    if (rm.tracks) {
      h += '<h2 class="sec-title">Company tracks</h2><p class="hint-text">Optional 8-week tracks to specialise for a target company after the core weeks.</p><div class="card-grid">';
      Object.keys(rm.tracks).forEach((key) => {
        const tr = rm.tracks[key];
        const ids = tr.weeks.flatMap((w) => w.problems.map((_, i) => trackProbId(key, w.week, i)));
        const tp = pct(countDone(ids), ids.length);
        h += '<a class="rm-card" href="' + href.track(rm, key, tr.weeks[0].week) + '" style="--c:' + attr(tr.color) + '">' +
          '<div class="rm-card-top"><span class="rm-icon">' + esc(tr.icon) + '</span><span class="rm-pct">' + tp + '%</span></div>' +
          '<h3>' + esc(tr.name) + '</h3><p>' + esc(tr.desc) + '</p>' + progressBar(tp, tr.color) + '</a>';
      });
      h += '</div>';
    }
    return h;
  }

  function viewModule(r) {
    const { rm, m, tab } = r;
    const label = rm.unit + ' ' + m.n;
    const tabs = [
      { id: 'study', label: '📖 Study' },
      { id: 'practice', label: '💻 Practice' },
      { id: 'qa', label: '❓ Q&amp;A' },
      { id: 'notes', label: '📁 Resources &amp; Notes' },
    ].map((t) => ({ label: t.label, href: href.module(rm, m, t.id), active: t.id === tab }));
    setChrome([{ label: 'Dashboard', href: '#/' }, { label: rm.short, href: href.roadmap(rm) }, { label: label + ': ' + m.title }], tabs);

    const mp = moduleProgress(rm, m);
    let h = '<header class="pg-hdr" style="--c:' + attr(rm.color) + '"><div class="eyebrow">' + esc(rm.icon + ' ' + rm.title) + '</div>' +
      '<h1>' + esc(label + ': ' + m.title) + '</h1>' + (m.summary ? '<p class="sub">' + esc(m.summary) + '</p>' : '') +
      '<div class="meta"><span class="tag">' + m.topics.length + ' topics</span><span class="tag">' + m.problems.length + ' problems</span>' +
      '<span class="tag">' + ((m.interviewFocus || []).length + (m.quiz || []).length) + ' Q&amp;A</span>' +
      '<span class="tag tag-prog">' + pct(mp.done, mp.total) + '% done</span></div></header>';

    if (tab === 'study') h += tabStudy(rm, m);
    else if (tab === 'practice') h += tabPractice(rm, m);
    else if (tab === 'qa') h += tabQA(rm, m);
    else h += tabNotes(rm, m);

    const i = rm.modules.indexOf(m);
    const prev = rm.modules[i - 1];
    const next = rm.modules[i + 1];
    h += '<nav class="pager">' +
      (prev ? '<a href="' + href.module(rm, prev, tab) + '">← ' + esc(unitAbbr(rm) + prev.n + ' ' + prev.title) + '</a>' : '<span></span>') +
      (next ? '<a href="' + href.module(rm, next, tab) + '">' + esc(unitAbbr(rm) + next.n + ' ' + next.title) + ' →</a>' : '<span></span>') + '</nav>';
    return h;
  }

  function codeBlock(code, lang, label) {
    return '<div class="code"><div class="code-hdr"><span class="lang">' + esc(lang || 'text') + '</span><span class="code-lbl">' + esc(label || '') +
      '</span><button type="button" class="btn-xs" data-action="copy">Copy</button></div><pre><code>' + esc(code) + '</code></pre></div>';
  }

  function checkbox(id, label) {
    return '<input type="checkbox" class="chk" data-check="' + attr(id) + '"' + (state.checks[id] ? ' checked' : '') + ' aria-label="' + attr('Mark done: ' + label) + '">';
  }

  function tabStudy(rm, m) {
    // Open the first unfinished topic so returning learners land where they stopped.
    const firstOpen = m.topics.findIndex((_, i) => !state.checks[topicId(rm, m, i)]);
    let h = '<div class="study-tools"><button type="button" class="btn-xs" data-action="expand-all">Expand all</button>' +
      '<button type="button" class="btn-xs" data-action="collapse-all">Collapse all</button></div>';
    m.topics.forEach((t, i) => {
      const id = topicId(rm, m, i);
      const vis = V.forTopic(rm.id, m.n, t.title);
      const open = i === firstOpen;
      h += '<section class="topic' + (state.checks[id] ? ' done' : '') + (open ? ' open' : '') + '" id="tc-' + attr(id) + '">' +
        '<div class="topic-hdr" data-action="toggle" data-target="tc-' + attr(id) + '" role="button" tabindex="0" aria-expanded="' + open + '">' +
        '<span class="topic-num">' + (i + 1) + '</span><h3 class="topic-title">' + esc(t.title) + '</h3>' +
        (vis.length ? '<span class="topic-badge" title="Has visual explainers">🎬 ' + vis.length + '</span>' : '') + checkbox(id, t.title) +
        '<span class="chev" aria-hidden="true">▾</span></div><div class="topic-body">';
      h += t.def ? '<div class="prose">' + t.def + '</div>' : '<div class="prose muted">Study this topic using the resources tab and official documentation.</div>';
      h += visualsHtml(vis);
      if (t.interview) h += '<div class="callout"><div class="callout-lbl">🎯 Interview tip</div>' + esc(t.interview) + '</div>';
      (t.examples || []).forEach((ex) => { h += codeBlock(ex.code, ex.lang, ex.label); });
      h += '<div class="topic-foot"><button type="button" class="btn-xs primary" data-action="done-next" data-id="' + attr(id) + '">' +
        (i < m.topics.length - 1 ? '✓ Mark done &amp; next topic' : '✓ Mark done') + '</button></div>';
      h += '</div></section>';
    });
    if ((m.interviewFocus || []).length) {
      h += '<h2 class="sec-title">🎯 Interview focus</h2>';
      m.interviewFocus.forEach((f, i) => { h += qaItem('if-' + rm.id + '-' + m.n + '-' + i, 'Q' + (i + 1), f.q, '<div class="prose">' + f.a + '</div>', 'focus'); });
    }
    return h;
  }

  function qaItem(id, num, q, answerHtml, cls) {
    return '<div class="qa ' + (cls || '') + '" id="' + attr(id) + '"><div class="qa-q" data-action="toggle" data-target="' + attr(id) +
      '" role="button" tabindex="0" aria-expanded="false"><span class="qn">' + esc(num) + '</span><span>' + esc(q) + '</span></div><div class="qa-a">' + answerHtml + '</div></div>';
  }

  function problemCard(p, id, num, vis) {
    vis = vis || [];
    const d = p.d ? '<span class="diff ' + attr(p.d) + '">' + esc(p.d) + '</span>' : '';
    const type = p.type ? '<span class="ptype" title="' + attr(p.type) + '">' + (TYPE_ICON[p.type] || '') + ' ' + esc(p.type) + '</span>' : '';
    let acts = '';
    if (p.url) acts += '<a class="plink lc" href="' + attr(p.url) + '" target="_blank" rel="noopener noreferrer">' + (/leetcode\.com/.test(p.url) ? '🟠 LeetCode' : '🔗 Practice') + '</a>';
    if (p.ex) acts += '<a class="plink ex" href="' + attr(p.ex) + '" target="_blank" rel="noopener noreferrer">🟣 Exercism</a>';
    if (p.hint) acts += '<button type="button" class="btn-xs" data-action="toggle" data-target="hint-' + attr(id) + '">💡 Hint</button>';
    if (vis.length) acts += '<button type="button" class="btn-xs" data-action="toggle" data-target="vis-' + attr(id) + '">🎬 Diagram</button>';
    if (p.solution) acts += '<button type="button" class="btn-xs" data-action="toggle" data-target="sol-' + attr(id) + '">👁 Solution</button>';
    let h = '<div class="prob' + (state.checks[id] ? ' done' : '') + '" id="pb-' + attr(id) + '"><div class="prob-hdr"><span class="prob-num">' + num + '</span>' +
      '<span class="prob-title">' + esc(p.t) + '</span>' + type + d + checkbox(id, p.t) + '</div>';
    if (acts) h += '<div class="prob-acts">' + acts + '</div>';
    if (p.hint) h += '<div class="reveal prose" id="hint-' + attr(id) + '">' + p.hint + '</div>';
    if (vis.length) h += '<div class="reveal" id="vis-' + attr(id) + '">' + visualsHtml(vis) + '</div>';
    if (p.solution) h += '<div class="reveal" id="sol-' + attr(id) + '">' + codeBlock(p.solution, p.lang, 'Reference solution') + '</div>';
    return h + '</div>';
  }

  function tabPractice(rm, m) {
    if (!m.problems.length) return '<p class="muted">No problems for this module yet.</p>';
    let h = '<p class="hint-text">The most important problems for this module, ordered roughly easy → hard. Try before revealing hints or solutions.</p>';
    m.problems.forEach((p, i) => { h += problemCard(p, problemId(rm, m, p, i), i + 1, V.forProblem(rm.id, m.n, p.t)); });
    return h;
  }

  function tabQA(rm, m) {
    let h = '';
    if ((m.quiz || []).length) {
      h += '<h2 class="sec-title">Quick check (' + m.quiz.length + ')</h2><p class="hint-text">Answer out loud first, then reveal.</p>';
      m.quiz.forEach((q, i) => { h += qaItem('qz-' + rm.id + '-' + m.n + '-' + i, 'Q' + (i + 1), q.q, esc(q.a)); });
    }
    if ((m.interviewFocus || []).length) {
      h += '<h2 class="sec-title">Interview focus (' + m.interviewFocus.length + ')</h2>';
      m.interviewFocus.forEach((f, i) => { h += qaItem('if-' + rm.id + '-' + m.n + '-' + i, 'Q' + (i + 1), f.q, '<div class="prose">' + f.a + '</div>', 'focus'); });
    }
    return h || '<p class="muted">No questions for this module yet.</p>';
  }

  function resourceList(resources) {
    if (!resources || !resources.length) return '';
    return '<ul class="res-list">' + resources.map((r) => '<li><a href="' + attr(r.url) + '" target="_blank" rel="noopener noreferrer">' +
      (RES_ICON[r.type] || '🔗') + ' ' + esc(r.title) + '</a></li>').join('') + '</ul>';
  }

  function noteArea(id, placeholder) {
    return '<textarea class="note" data-note="' + attr(id) + '" placeholder="' + attr(placeholder) + '">' + esc(state.notes[id] || '') +
      '</textarea><span class="note-saved" id="saved-' + attr(id) + '">✓ Saved</span>';
  }

  function tabNotes(rm, m) {
    let h = '';
    if ((m.resources || []).length) h += '<h2 class="sec-title">Resources</h2>' + resourceList(m.resources);
    // Legacy Go notes used "weeknote_{n}" — keep that key so existing notes appear.
    const noteId = rm.id === 'go' ? 'weeknote_' + m.n : 'note_' + rm.id + '_' + m.n;
    h += '<h2 class="sec-title">📝 Your notes</h2>' + noteArea(noteId, 'Notes for ' + rm.unit + ' ' + m.n + '…');
    return h;
  }

  function viewTrack(r) {
    const { rm, key, tr, w } = r;
    const idx = tr.weeks.indexOf(w);
    setChrome([{ label: 'Dashboard', href: '#/' }, { label: rm.short, href: href.roadmap(rm) }, { label: tr.name + ' track' }, { label: 'T' + (idx + 1) + ': ' + w.title }]);
    let h = '<header class="pg-hdr" style="--c:' + attr(tr.color) + '"><div class="eyebrow">' + esc(tr.icon + ' ' + tr.name + ' track — ' + tr.desc) + '</div>' +
      '<h1>T' + (idx + 1) + ': ' + esc(w.title) + '</h1></header>';
    h += '<div class="week-pills">' + tr.weeks.map((x, i) => '<a class="pill' + (x === w ? ' active' : '') + '" href="' + href.track(rm, key, x.week) + '">T' + (i + 1) + '</a>').join('') + '</div>';
    w.problems.forEach((p, i) => { h += problemCard({ t: p }, trackProbId(key, w.week, i), i + 1); });
    if ((tr.resources || []).length) h += '<h2 class="sec-title">Track resources</h2>' + resourceList(tr.resources);
    h += '<h2 class="sec-title">📝 Notes</h2>' + noteArea('tracknote_' + key + '_' + w.week, 'Notes for this track week…');
    return h;
  }

  function viewPractice(r) {
    const rm = r.rm;
    setChrome([{ label: 'Dashboard', href: '#/' }, { label: rm.short, href: href.roadmap(rm) }, { label: rm.practice.title }]);
    const items = rm.practice.items;
    const done = items.filter((_, i) => state.checks[lcId(i)]).length;
    let h = '<header class="pg-hdr"><h1>🏆 ' + esc(rm.practice.title) + '</h1><p class="sub">' + done + ' / ' + items.length + ' solved — click a title to open it on LeetCode.</p></header>';
    items.forEach((p, i) => {
      const id = lcId(i);
      h += '<div class="prob' + (state.checks[id] ? ' done' : '') + '"><div class="prob-hdr"><span class="prob-num">#' + p.n + '</span>' +
        '<a class="prob-title" href="' + attr(p.url) + '" target="_blank" rel="noopener noreferrer">' + esc(p.t) + '</a>' +
        '<span class="ptype">' + esc(p.cat) + '</span><span class="diff ' + attr(p.d) + '">' + esc(p.d) + '</span>' + checkbox(id, p.t) + '</div></div>';
    });
    h += '<h2 class="sec-title">📝 LeetCode notes</h2>' + noteArea('lc_notes', 'Patterns, strategies, weak areas…');
    return h;
  }

  function viewVisuals(r) {
    setChrome([{ label: 'Dashboard', href: '#/' }, { label: 'Visual Explainers' }]);
    const counts = {};
    V.all.forEach((d) => { counts[d.roadmap] = (counts[d.roadmap] || 0) + 1; });
    const rid = r.rid || (roadmaps.find((rm) => counts[rm.id]) || {}).id;
    let h = '<header class="pg-hdr"><h1>🎬 Visual Explainers</h1><p class="sub">' + V.all.length + ' animated diagrams and interactive labs. ' +
      'Press ▶ Play to animate, step with ◀ ▶ (or the arrow keys), click boxes marked ● for details, and ⤢ to go full screen.</p></header>';
    h += '<div class="week-pills">' + roadmaps.filter((rm) => counts[rm.id]).map((rm) => '<a class="pill' + (rm.id === rid ? ' active' : '') +
      '" href="#/visuals/' + attr(rm.id) + '">' + esc(rm.icon + ' ' + rm.short) + ' (' + counts[rm.id] + ')</a>').join('') + '</div>';
    const rm = byId[rid];
    if (!rm) return h + '<p class="muted">No visuals yet.</p>';
    rm.modules.forEach((m) => {
      const list = V.all.filter((d) => d.roadmap === rm.id && d.module === m.n);
      if (!list.length) return;
      h += '<h2 class="sec-title">' + esc(unitAbbr(rm) + m.n + ' · ' + m.title) + '</h2>';
      list.forEach((d) => {
        let link;
        if (d.topic) {
          const i = m.topics.findIndex((t) => t.title === d.topic);
          link = '<a href="' + href.module(rm, m) + '" data-focus="tc-' + attr(topicId(rm, m, i)) + '">📖 ' + esc(d.topic) + '</a>';
        } else {
          const i = m.problems.findIndex((p) => p.t === d.problem);
          link = '<a href="' + href.module(rm, m, 'practice') + '" data-focus="pb-' + attr(problemId(rm, m, m.problems[i], i)) + '">💻 ' + esc(d.problem) + '</a>';
        }
        h += '<div class="vis-item"><div class="vis-where">From lesson: ' + link + '</div>' + V.html(d) + '</div>';
      });
    });
    return h;
  }

  function viewNotFound() {
    setChrome([{ label: 'Not found' }]);
    return '<div class="empty"><h1>Page not found</h1><p>That link does not match any roadmap content.</p><a class="btn" href="#/">Go to dashboard</a></div>';
  }

  // ===== Flashcards ==========================================================
  let fcIndex = 0;
  let fcOrder = null;

  function filteredCards() {
    const f = state.prefs.fc || 'all';
    const cards = allFlashcards();
    return f === 'all' ? cards : cards.filter((c) => c.rid === f);
  }

  function flashcardWidget(cards) {
    if (!cards.length) return '<p class="muted">No flashcards.</p>';
    if (!fcOrder || fcOrder.length !== cards.length) fcOrder = cards.map((_, i) => i);
    fcIndex = ((fcIndex % cards.length) + cards.length) % cards.length;
    const c = cards[fcOrder[fcIndex]];
    const rm = byId[c.rid];
    const dl = DIFF[c.d] || 'medium';
    return '<div class="fc" id="flashcard"><div class="fc-meta"><span class="tag" style="--c:' + attr(rm.color) + '">' + esc(rm.icon + ' ' + rm.short) + '</span>' +
      '<span class="diff ' + dl + '">' + dl + '</span><span class="fc-count">' + (fcIndex + 1) + ' / ' + cards.length + '</span></div>' +
      '<div class="fc-q">' + esc(c.q) + '</div><div class="fc-a" id="fcAnswer">' + esc(c.a) + '</div>' +
      '<div class="fc-btns"><button type="button" class="btn" data-action="fc-prev" aria-label="Previous card">←</button>' +
      '<button type="button" class="btn primary" data-action="fc-reveal">Show answer</button>' +
      '<button type="button" class="btn" data-action="fc-next" aria-label="Next card">→</button>' +
      '<button type="button" class="btn" data-action="fc-shuffle">🔀 Shuffle</button></div></div>';
  }

  function viewFlashcards() {
    const review = state.prefs.fcMode !== 'browse';
    setChrome([{ label: 'Dashboard', href: '#/' }, { label: 'Review & Flashcards' }]);
    const f = state.prefs.fc || 'all';
    const withQuiz = !!state.prefs.srsQuiz;
    let h = '<header class="pg-hdr"><h1>🃏 Review &amp; Flashcards</h1><p class="sub">' + (review
      ? 'Spaced repetition: cards you know come back less often, cards you miss come back soon. A few minutes a day beats cramming. Keyboard: <kbd>Space</kbd> reveal, <kbd>1</kbd> again, <kbd>2</kbd> good, <kbd>3</kbd> easy.'
      : 'Flip through every card in order or shuffled. Keyboard: <kbd>Space</kbd> reveal, <kbd>←</kbd>/<kbd>→</kbd> navigate.') + '</p></header>';
    h += '<div class="week-pills">' + ['review', 'browse'].map((mo) => '<button type="button" class="pill' + ((mo === 'review') === review ? ' active' : '') +
      '" data-action="fc-mode" data-value="' + mo + '">' + (mo === 'review' ? '🧠 Spaced review' : '📚 Browse') + '</button>').join('') + '</div>';
    const count = (rid) => (review ? reviewCards(rid, withQuiz) : rid === 'all' ? allFlashcards() : allFlashcards().filter((c) => c.rid === rid)).length;
    h += '<div class="week-pills"><button type="button" class="pill' + (f === 'all' ? ' active' : '') + '" data-action="fc-filter" data-value="all">All (' + count('all') + ')</button>';
    roadmaps.forEach((rm) => {
      const n = count(rm.id);
      if (n) h += '<button type="button" class="pill' + (f === rm.id ? ' active' : '') + '" data-action="fc-filter" data-value="' + attr(rm.id) + '">' + esc(rm.icon + ' ' + rm.short) + ' (' + n + ')</button>';
    });
    h += '</div>';
    if (!review) return h + flashcardWidget(filteredCards());
    h += '<label class="hint-text"><input type="checkbox" class="chk" data-pref="srsQuiz"' + (withQuiz ? ' checked' : '') +
      '> Also review the quick-check questions from every module</label>';
    return h + '<div id="srsBox">' + srsWidget() + '</div>';
  }

  // ===== Spaced repetition (Leitner boxes) ==================================
  // state.srs[key] = { b: box 0..6, due: 'YYYY-MM-DD' }. Box b is next shown after SRS_DAYS[b] days.
  const SRS_DAYS = [0, 1, 3, 7, 16, 35, 90];
  const NEW_PER_SESSION = 10;
  const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const hashKey = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  const reviewCache = {};
  function reviewCards(filter, withQuiz) {
    const ck = filter + '|' + !!withQuiz;
    if (reviewCache[ck]) return reviewCache[ck];
    const out = [];
    roadmaps.forEach((rm) => {
      if (filter !== 'all' && rm.id !== filter) return;
      (rm.flashcards || []).forEach((f) => out.push({ key: 'f:' + rm.id + ':' + hashKey(f.q), rid: rm.id, q: f.q, a: f.a, src: 'Flashcard' }));
      if (withQuiz) rm.modules.forEach((m) => (m.quiz || []).forEach((q) => out.push({
        key: 'q:' + rm.id + ':' + hashKey(q.q), rid: rm.id, q: q.q, a: q.a, src: unitAbbr(rm) + m.n + ' ' + m.title + ' · quick check',
      })));
    });
    return (reviewCache[ck] = out);
  }

  function srsQueue(filter, withQuiz) {
    const t = today();
    const cards = reviewCards(filter, withQuiz);
    let due = 0, fresh = 0, learned = 0;
    cards.forEach((c) => {
      const s = state.srs[c.key];
      if (!s) fresh++;
      else if (s.due <= t) due++;
      else learned++;
    });
    return { cards, due, fresh, learned };
  }

  let srsSession = null;
  function srsSessionFor(filter, withQuiz) {
    const sig = filter + '|' + !!withQuiz;
    if (srsSession && srsSession.sig === sig) return srsSession;
    const t = today();
    const cards = reviewCards(filter, withQuiz);
    const due = cards.filter((c) => state.srs[c.key] && state.srs[c.key].due <= t)
      .sort((a, b) => (state.srs[a.key].due < state.srs[b.key].due ? -1 : 1));
    const fresh = cards.filter((c) => !state.srs[c.key]).slice(0, NEW_PER_SESSION);
    srsSession = { sig, queue: due.concat(fresh), done: 0 };
    return srsSession;
  }

  function srsWidget() {
    const f = state.prefs.fc || 'all';
    const withQuiz = !!state.prefs.srsQuiz;
    const q = srsQueue(f, withQuiz);
    const sess = srsSessionFor(f, withQuiz);
    let h = '<div class="srs-stats"><span class="tag" style="--c:var(--purple)">Due ' + q.due + '</span><span class="tag">New ' + q.fresh +
      '</span><span class="tag tag-prog">Scheduled ' + q.learned + '</span><span class="tag" style="--c:var(--dim)">Reviewed this session ' + sess.done + '</span></div>';
    const c = sess.queue[0];
    if (!c) {
      const next = q.cards.map((x) => state.srs[x.key] && state.srs[x.key].due).filter(Boolean).sort()[0];
      return h + '<div class="fc"><div class="fc-q">🎉 All caught up for now.</div><p class="hint-text">' +
        (next ? 'Next review is due on ' + esc(next) + '.' : 'Start with a batch of new cards.') + '</p>' +
        (q.fresh ? '<div class="fc-btns"><button type="button" class="btn primary" data-action="srs-more">Learn ' + Math.min(NEW_PER_SESSION, q.fresh) + ' new cards</button></div>' : '') + '</div>';
    }
    const rm = byId[c.rid];
    const s = state.srs[c.key];
    const b = s ? s.b : 0;
    const days = (n) => (n <= 0 ? '<1d' : n + 'd');
    return h + '<div class="fc" id="srsCard"><div class="fc-meta"><span class="tag" style="--c:' + attr(rm.color) + '">' + esc(rm.icon + ' ' + rm.short) + '</span>' +
      '<span class="ptype">' + esc(c.src) + '</span><span class="fc-count">' + (s ? 'Box ' + b : 'New') + ' · ' + sess.queue.length + ' left</span></div>' +
      '<div class="fc-q">' + esc(c.q) + '</div><div class="fc-a srs-ans">' + esc(c.a) + '</div>' +
      '<div class="fc-btns srs-show"><button type="button" class="btn primary" data-action="srs-reveal">Show answer</button></div>' +
      '<div class="srs-grade"><button type="button" class="btn again" data-action="srs-grade" data-value="0">1 · Again<small>' + days(0) + '</small></button>' +
      '<button type="button" class="btn good" data-action="srs-grade" data-value="1">2 · Good<small>' + days(SRS_DAYS[Math.min(b + 1, 6)]) + '</small></button>' +
      '<button type="button" class="btn easy" data-action="srs-grade" data-value="2">3 · Easy<small>' + days(SRS_DAYS[Math.min(b + 2, 6)]) + '</small></button></div></div>';
  }

  function srsReveal() {
    const card = $('srsCard');
    if (!card) return;
    card.classList.add('revealed');
    card.querySelector('.srs-ans').classList.add('show');
  }

  function srsGrade(grade) {
    const card = $('srsCard');
    if (!card || !card.classList.contains('revealed') || !srsSession) return;
    const c = srsSession.queue.shift();
    const prev = state.srs[c.key];
    const b = prev ? prev.b : 0;
    if (grade === 0) {
      state.srs[c.key] = { b: 0, due: today() };
      srsSession.queue.splice(Math.min(3, srsSession.queue.length), 0, c); // see it again shortly
    } else {
      const nb = Math.min(b + grade, SRS_DAYS.length - 1);
      state.srs[c.key] = { b: nb, due: addDays(SRS_DAYS[nb]) };
    }
    srsSession.done++;
    save();
    $('srsBox').innerHTML = srsWidget();
    renderSidebar();
  }

  function refreshFlashcard() {
    const el = $('flashcard');
    if (!el) return;
    const cards = route.view === 'flashcards' ? filteredCards() : allFlashcards();
    el.outerHTML = flashcardWidget(cards);
  }

  // ===== Search ==============================================================
  let searchIndex = null;
  let results = [];
  let activeResult = -1;
  const CAT_LABEL = { module: 'Modules', topic: 'Topics', visual: 'Visual explainers', problem: 'Problems', qa: 'Q&A', flash: 'Flashcards', track: 'Company tracks' };

  function buildSearchIndex() {
    const idx = [];
    const add = (cat, text, meta, hrefStr, target, rm) => idx.push({ cat, text, meta, href: hrefStr, target, icon: rm ? rm.icon : '', lower: (text + ' ' + meta).toLowerCase() });
    roadmaps.forEach((rm) => {
      rm.modules.forEach((m) => {
        const where = rm.short + ' · ' + unitAbbr(rm) + m.n + ' ' + m.title;
        add('module', unitAbbr(rm) + m.n + ': ' + m.title, rm.title, href.module(rm, m), null, rm);
        m.topics.forEach((t, i) => add('topic', t.title, where, href.module(rm, m), 'tc-' + topicId(rm, m, i), rm));
        m.problems.forEach((p, i) => add('problem', p.t, where, href.module(rm, m, 'practice'), 'pb-' + problemId(rm, m, p, i), rm));
        (m.interviewFocus || []).forEach((f, i) => add('qa', f.q, where + ' · Interview focus', href.module(rm, m, 'qa'), 'if-' + rm.id + '-' + m.n + '-' + i, rm));
        (m.quiz || []).forEach((q, i) => add('qa', q.q, where + ' · Quick check', href.module(rm, m, 'qa'), 'qz-' + rm.id + '-' + m.n + '-' + i, rm));
      });
      Object.keys(rm.tracks || {}).forEach((key) => {
        const tr = rm.tracks[key];
        tr.weeks.forEach((w, wi) => {
          w.problems.forEach((p, i) => add('track', p, tr.name + ' · T' + (wi + 1) + ' ' + w.title, href.track(rm, key, w.week), 'pb-' + trackProbId(key, w.week, i), rm));
        });
      });
      if (rm.practice) rm.practice.items.forEach((p) => add('problem', '#' + p.n + ' ' + p.t, rm.practice.title + ' · ' + p.d + ' · ' + p.cat, href.practice(rm), null, rm));
      (rm.flashcards || []).forEach((f) => add('flash', f.q, rm.short + ' flashcard', '#/flashcards', null, rm));
    });
    V.all.forEach((d) => {
      const rm = byId[d.roadmap];
      const m = rm && rm.modules.find((x) => x.n === d.module);
      if (!m) return;
      const i = d.topic ? m.topics.findIndex((t) => t.title === d.topic) : m.problems.findIndex((p) => p.t === d.problem);
      const target = d.topic ? 'tc-' + topicId(rm, m, i) : 'vis-' + problemId(rm, m, m.problems[i], i);
      add('visual', '🎬 ' + d.title, rm.short + ' · ' + unitAbbr(rm) + m.n + ' · ' + (d.topic || d.problem), href.module(rm, m, d.topic ? 'study' : 'practice'), target, rm);
    });
    return idx;
  }

  function openSearch() {
    searchIndex = searchIndex || buildSearchIndex();
    const ov = $('searchOverlay');
    ov.hidden = false;
    const inp = $('searchInput');
    inp.value = '';
    runSearch('');
    inp.focus();
  }
  function closeSearch() { $('searchOverlay').hidden = true; }

  function highlight(text, terms) {
    let h = esc(text);
    terms.forEach((t) => {
      if (t.length < 2) return;
      h = h.replace(new RegExp('(' + esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    });
    return h;
  }

  function runSearch(query) {
    const box = $('searchResults');
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      results = []; activeResult = -1;
      box.innerHTML = '<div class="search-empty">' + (q ? 'Keep typing…' : 'Search ' + searchIndex.length + ' items across ' + roadmaps.length + ' roadmaps') + '</div>';
      return;
    }
    const terms = q.split(/\s+/);
    const pri = { module: 6, topic: 5, visual: 5, problem: 4, qa: 3, flash: 2, track: 1 };
    results = searchIndex.filter((it) => terms.every((t) => it.lower.includes(t))).map((it) => {
      const tl = it.text.toLowerCase();
      return { it, score: (tl.includes(q) ? 100 : 0) + (tl.startsWith(q) ? 50 : 0) + terms.filter((t) => tl.includes(t)).length * 10 + pri[it.cat] };
    }).sort((a, b) => b.score - a.score).slice(0, 60).map((x) => x.it);
    activeResult = results.length ? 0 : -1;
    if (!results.length) { box.innerHTML = '<div class="search-empty">No results for “' + esc(query) + '”</div>'; return; }

    const order = ['module', 'topic', 'visual', 'problem', 'qa', 'flash', 'track'];
    const ranked = [];
    let h = '';
    order.forEach((cat) => {
      const items = results.filter((r) => r.cat === cat);
      if (!items.length) return;
      h += '<div class="search-cat">' + CAT_LABEL[cat] + ' (' + items.length + ')</div>';
      items.forEach((it) => {
        const i = ranked.push(it) - 1;
        h += '<div class="search-item' + (i === 0 ? ' active' : '') + '" role="option" data-action="search-open" data-idx="' + i + '">' +
          '<span class="si-icon">' + esc(it.icon) + '</span><div class="si-info"><div class="si-title">' + highlight(it.text, terms) + '</div>' +
          '<div class="si-meta">' + esc(it.meta) + '</div></div><span class="si-arrow">→</span></div>';
      });
    });
    results = ranked;
    box.innerHTML = h;
  }

  function moveResult(delta) {
    if (!results.length) return;
    activeResult = Math.max(0, Math.min(results.length - 1, activeResult + delta));
    document.querySelectorAll('.search-item').forEach((el) => {
      const on = Number(el.dataset.idx) === activeResult;
      el.classList.toggle('active', on);
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function openResult(i) {
    const it = results[i];
    if (!it) return;
    closeSearch();
    if (location.hash === it.href) render(); else location.hash = it.href;
    if (it.target) focusTarget(it.target);
  }

  // Opens, scrolls to and briefly highlights an element after the next render.
  function focusTarget(id) {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('open');
      const card = el.closest('.prob');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' }); else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1800);
    }, 60);
  }

  // ===== Progress, notes, streak, import/export ==============================
  function setCheck(id, on) {
    if (on) state.checks[id] = true; else delete state.checks[id];
    save();
    document.querySelectorAll('[data-check="' + CSS.escape(id) + '"]').forEach((cb) => {
      cb.checked = on;
      const card = cb.closest('.topic, .prob');
      if (card) card.classList.toggle('done', on);
    });
    renderSidebar();
    updateHeaderProgress();
  }

  const noteTimers = {};
  function saveNote(id, value) {
    if (value) state.notes[id] = value; else delete state.notes[id];
    clearTimeout(noteTimers[id]);
    noteTimers[id] = setTimeout(() => {
      save();
      const el = $('saved-' + id);
      if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1200); }
    }, 400);
  }

  function updateStreak() {
    const t = today();
    if (state.streak.lastDate === t) return;
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.streak = { lastDate: t, count: state.streak.lastDate === y ? (state.streak.count || 0) + 1 : 1 };
    save();
  }

  function exportProgress() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'roadmap-progress-' + today() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Progress exported', 'ok');
  }

  function importProgress(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.checks !== 'object') throw new Error('not a progress export');
        if (!confirm('Replace your current progress with the imported file?')) return;
        state = normalizeState(data);
        save();
        render();
        toast('Progress imported: ' + Object.keys(state.checks).length + ' completed items', 'ok');
      } catch (e) {
        toast('Import failed: ' + e.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  function resetProgress() {
    if (!confirm('Clear all checkmarks? Notes and streak are kept. Export first if you may want them back.')) return;
    state.checks = {};
    save();
    render();
    toast('Progress reset', 'ok');
  }

  let toastTimer = null;
  function toast(msg, type) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 2800);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.prefs.theme === 'light' ? 'light' : 'dark';
  }

  async function copyCode(btn) {
    const code = btn.closest('.code').querySelector('code').textContent;
    try {
      await navigator.clipboard.writeText(code);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
  }

  // ===== Events ==============================================================
  const actions = {
    toggle(el) {
      const target = $(el.dataset.target);
      if (!target) return;
      const open = target.classList.toggle('open');
      if (el.hasAttribute('aria-expanded')) el.setAttribute('aria-expanded', String(open));
    },
    copy: copyCode,
    'open-search': openSearch,
    'close-search': closeSearch,
    'close-search-backdrop'(el, e) { if (e.target === el) closeSearch(); },
    'search-open'(el) { openResult(Number(el.dataset.idx)); },
    'fc-reveal'() { const a = $('fcAnswer'); if (a) a.classList.toggle('show'); },
    'fc-next'() { fcIndex++; refreshFlashcard(); },
    'fc-prev'() { fcIndex--; refreshFlashcard(); },
    'fc-shuffle'() {
      const n = (route.view === 'flashcards' ? filteredCards() : allFlashcards()).length;
      fcOrder = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [fcOrder[i], fcOrder[j]] = [fcOrder[j], fcOrder[i]]; }
      fcIndex = 0;
      refreshFlashcard();
    },
    'fc-filter'(el) { state.prefs.fc = el.dataset.value; fcIndex = 0; fcOrder = null; srsSession = null; save(); renderContent(); },
    'fc-mode'(el) { state.prefs.fcMode = el.dataset.value; save(); renderContent(); },
    'srs-reveal': srsReveal,
    'srs-grade'(el) { srsGrade(Number(el.dataset.value)); },
    'srs-more'() {
      const f = state.prefs.fc || 'all';
      const s = srsSessionFor(f, !!state.prefs.srsQuiz);
      s.queue = reviewCards(f, !!state.prefs.srsQuiz).filter((c) => !state.srs[c.key]).slice(0, NEW_PER_SESSION);
      $('srsBox').innerHTML = srsWidget();
    },
    'expand-all'() { document.querySelectorAll('.topic').forEach((t) => t.classList.add('open')); },
    'collapse-all'() { document.querySelectorAll('.topic').forEach((t) => t.classList.remove('open')); },
    'done-next'(el) {
      const id = el.dataset.id;
      if (!state.checks[id]) setCheck(id, true);
      const sec = $('tc-' + id);
      sec.classList.remove('open');
      sec.querySelector('.topic-hdr').setAttribute('aria-expanded', 'false');
      const next = sec.nextElementSibling;
      if (next && next.classList.contains('topic')) {
        next.classList.add('open');
        next.querySelector('.topic-hdr').setAttribute('aria-expanded', 'true');
        next.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast('Module topics done — try the Practice tab next', 'ok');
      }
    },
    'toggle-theme'() { state.prefs.theme = state.prefs.theme === 'light' ? 'dark' : 'light'; applyTheme(); save(); },
    'toggle-sidebar'() { $('app').classList.toggle('nav-open'); },
    'close-sidebar'() { $('app').classList.remove('nav-open'); },
    export: exportProgress,
    import() { $('importFile').click(); },
    reset: resetProgress,
    reload() { sync.flush(); setTimeout(() => location.reload(), 150); },
    'dismiss-update'() { $('updateBar').hidden = true; },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el && actions[el.dataset.action]) {
      // Clicking a checkbox inside a toggle header must not collapse the card.
      if (e.target.matches('input.chk')) return;
      actions[el.dataset.action](el, e);
    }
    if (e.target.closest('.sidebar a')) $('app').classList.remove('nav-open');
    const focusLink = e.target.closest('a[data-focus]');
    if (focusLink) focusTarget(focusLink.dataset.focus);
  });

  document.addEventListener('change', (e) => {
    if (e.target.matches('input.chk[data-check]')) setCheck(e.target.dataset.check, e.target.checked);
    else if (e.target.matches('input[data-pref]')) { state.prefs[e.target.dataset.pref] = e.target.checked; srsSession = null; save(); renderContent(); }
    else if (e.target.id === 'importFile' && e.target.files[0]) { importProgress(e.target.files[0]); e.target.value = ''; }
  });

  document.addEventListener('input', (e) => {
    if (e.target.matches('textarea[data-note]')) saveNote(e.target.dataset.note, e.target.value);
    else if (e.target.id === 'searchInput') runSearch(e.target.value);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if ($('searchOverlay').hidden) openSearch(); else closeSearch();
      return;
    }
    if (!$('searchOverlay').hidden) {
      if (e.key === 'Escape') closeSearch();
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveResult(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveResult(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); openResult(activeResult); }
      return;
    }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-action]')) {
      e.preventDefault();
      actions[e.target.dataset.action](e.target, e);
      return;
    }
    if (!typing && $('srsCard') && route.view === 'flashcards') {
      if (e.key === ' ') { e.preventDefault(); srsReveal(); }
      else if (['1', '2', '3'].includes(e.key)) srsGrade(Number(e.key) - 1);
    }
    if (!typing && $('flashcard') && route.view === 'flashcards') {
      if (e.key === ' ') { e.preventDefault(); actions['fc-reveal'](); }
      else if (e.key === 'ArrowRight') actions['fc-next']();
      else if (e.key === 'ArrowLeft') actions['fc-prev']();
    }
    if (e.key === 'Escape') $('app').classList.remove('nav-open');
  });

  window.addEventListener('hashchange', () => { render(); $('content').focus({ preventScroll: true }); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sync.flush(); else sync.checkVersion();
  });
  setInterval(() => { if (document.visibilityState === 'visible') sync.checkVersion(); }, 5 * 60 * 1000);

  // ===== Boot ================================================================
  if (typeof APP_VERSION === 'string') { $('appVersion').textContent = 'v' + APP_VERSION; }
  applyTheme();
  render();
  // Streak must be updated only after the server copy has been considered:
  // updating it first would stamp a fresh updatedAt on an empty local state,
  // making it look newer than the server and overwrite real progress.
  sync.init().then(() => { updateStreak(); updateHeaderProgress(); });
})();
