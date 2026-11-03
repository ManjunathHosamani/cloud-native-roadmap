# Contributing content

All learning content lives in `web/js/data/`, one file per roadmap. Each file is a
plain browser script (no modules, no build step) that calls `registerRoadmap({...})`.
Run the validator after every change:

```bash
node scripts/validate-content.js                 # all files
node scripts/validate-content.js web/js/data/kubernetes.js   # one file
```

## Roadmap schema

```js
registerRoadmap({
  id: 'kubernetes',          // unique slug: [a-z0-9-]+
  order: 20,                 // sidebar order (Go = 10)
  title: 'Kubernetes & Containers',
  short: 'Kubernetes',       // sidebar label (<= 16 chars)
  icon: '☸️',
  color: '#326CE5',          // accent colour (hex)
  desc: 'One-line description shown on the dashboard.',
  unit: 'Module',            // label for modules: 'Module' or 'Week'
  modules: [ /* Module, see below */ ],
  flashcards: [ { q: 'Question?', a: 'Short answer.', d: 1 } ]   // d: 1 easy, 2 medium, 3 hard
});
```

## Module schema

```js
{
  n: 1,                                   // module number, unique & ascending within the roadmap
  title: 'Kubernetes Architecture',
  summary: 'One or two sentences on what this module covers and why it matters.',
  topics: [{
    title: 'Control Plane Components',
    def: 'HTML lesson body…',               // allowed tags listed below
    interview: 'Plain-text interview tip.', // NO HTML (it is escaped)
    examples: [{ label: 'Inspect control plane', lang: 'bash', code: 'kubectl get pods -n kube-system' }]
  }],
  problems: [{
    t: 'Design a URL shortener',           // title, unique within the module
    d: 'medium',                           // easy | medium | hard
    type: 'design',                        // coding | design | hands-on | debug | concept
    hint: 'HTML approach / key points…',   // shown behind a "Hint" toggle
    solution: 'code or config…',           // optional, shown in <pre> behind "Solution"
    lang: 'go',                            // optional language of solution
    url: 'https://…'                       // optional external practice link
  }],
  interviewFocus: [{ q: 'Deep interview question?', a: 'HTML model answer…' }],
  quiz: [{ q: 'Quick check?', a: 'Plain-text short answer.' }],
  resources: [{ title: 'Kubernetes Docs — Pods', url: 'https://kubernetes.io/docs/concepts/workloads/pods/', type: 'docs' }]
                                          // type: docs | video | article | book | course
}
```

### Optional fields
- `module.group` — groups modules under a heading in the sidebar and overview (e.g. "Core Go (Weeks 1–8)").
- `problem.ex` — a second practice link (Exercism); `problem.id` — explicit progress id (legacy data only).
- Roadmap-level (used by `go.js`): `idPrefix` (legacy progress-id prefix), `tracks` (company tracks:
  `{key: {name, icon, color, desc, resources, weeks: [{week, title, problems: [string]}]}}`) and
  `practice` (`{title, items: [{t, n, cat, d, url}]}`).

### HTML rules (`def`, `hint`, `interviewFocus[].a`)
Allowed tags: `strong em b i code br p ul ol li table thead tbody tr th td pre kbd sub sup`.
No attributes, no `<script>`, no inline event handlers, no links (put links in `resources`).
Escape `<` and `>` inside text as `&lt;` / `&gt;` (e.g. `map[string]&lt;T&gt;`).

### Plain-text fields
`interview`, `quiz[].a`, `flashcards[].a`, `examples[].code`, `solution` are rendered escaped —
write them as plain text (newlines preserved in code).

### Quality bar
- Accurate and current (Kubernetes 1.30+, Go 1.22+, TLS 1.3, OAuth 2.1 / OIDC practices).
- Interview-oriented: every topic ends with what interviewers actually probe.
- Problems are the *most important* ones for the area, ordered easy → hard.
- Resources must be real, stable URLs (official docs preferred).

### Progress IDs
Checkbox IDs are derived from roadmap id + module `n` + array index. **Never reorder or
delete existing topics/problems** in a published module — append instead, or users lose progress.

## Visuals: animated diagrams and interactive labs

Visual explainers live in `web/js/visuals/<roadmap>.js` (one file per roadmap) and are
rendered by `web/js/diagrams.js`. A diagram is attached to **one topic or one problem**
by exact title and appears inside that lesson, in the 🎬 gallery (`#/visuals`) and in search.
Interactive labs (`kind: 'widget'`) are code in `web/js/widgets.js`, attached in `visuals/labs.js`.

Ids are global: prefix them with the roadmap (`go-`, `k8s-`, `cloud-`, `sec-`, `net-`, `sd-`, `ca-`, `stor-`, `lab-`).
The validator checks references, geometry (overlaps, edges crossing nodes, text that does not fit) and text lengths.

### When a topic deserves a visual
Add one when movement or structure is the hard part to grasp from prose:
architecture and topology (who talks to whom), multi-party protocol flows (handshakes, OAuth),
ordered processes and lifecycles, state machines, data structures that change over time,
and side-by-side comparisons of layered stacks. Skip topics that are lists of facts or definitions.
One excellent diagram beats three average ones.

### Common fields
```js
registerDiagram({
  id: 'k8s-apply-end-to-end',
  roadmap: 'kubernetes', module: 3,
  topic: 'What Happens on kubectl apply — End to End',  // OR problem: 'Exact problem title'
  kind: 'graph',                                         // graph | sequence | widget
  title: 'kubectl apply → running Pod',                  // <= 80 chars
  desc: 'Overview caption shown before playing.',        // plain text, <= 300 chars
  ...
});
```
All text is plain text: no HTML.

### `kind: 'graph'`: architecture diagrams and flowcharts
Nodes sit on a grid. Each cell is 160×84 px; `x`/`y` are the cell column/row of the node's top-left corner,
and `w`/`h` are spans in cells (default 1; fractions like 0.5 are allowed). The grid can be at most **8 columns × 9 rows**;
keep it to 7 columns or fewer so the text stays readable.
```js
groups: [{ id: 'cp', label: 'Control plane', x: 1, y: 0, w: 3, h: 3, color: 'blue' }],  // dashed boundary
nodes: [{
  id: 'api', label: 'kube-apiserver', sub: 'authn·authz·admit',   // label <= ~17 chars per cell of width, sub <= ~20
  x: 2, y: 1, w: 1, h: 1,
  shape: 'box',            // box | db (cylinder) | pill | diamond (decision) | circle
  color: 'blue',           // blue green orange purple red yellow teal gray
  icon: '🧑‍💻',             // optional emoji prefix (counts as 2 chars)
  ghost: false,            // dashed outline: external, optional or "not yet created"
  info: 'Shown when the learner clicks the node (<= 420 chars).',
  enter: 3, exit: 6,       // optional: hidden before step 3 / from step 6 (build-up and failure animations)
}],
edges: [{ from: 'kubectl', to: 'api', label: 'HTTPS', dashed: false, both: false, curve: 0 }],
//  label <= 24 chars; both = arrowheads at both ends; curve = sideways bend in px (use ±30..60
//  for a second edge between the same two nodes, or to route around a node). Give it an id if two
//  edges share from/to.
steps: [{
  caption: 'What happens in this step and why it matters (plain text, <= 300 chars).',
  flows: [{ from: 'kubectl', to: 'api', label: 'Deployment', color: 'orange' }],  // animated tokens, label <= 18 chars
  active: ['etcd', 'api>etcd'],   // extra highlights: node ids, group ids or edge ids ("from>to")
}],
```
- A step highlights the endpoints of its flows plus anything in `active`; everything else dims.
- A flow follows the matching edge (in either direction), otherwise a straight line.
- Several flows in one step move at the same time, which is useful for parallel work or request/response.
- Rules of thumb: 4–12 nodes, 3–10 steps, a group for every trust/network/process boundary, and
  colours that carry meaning (for example clients gray, control plane blue, data green, failures red).
- Leave empty cells between nodes that edges must pass; the validator rejects edges that cross nodes.

### `kind: 'sequence'`: protocol and request flows
```js
actors: [{ id: 'c', label: 'Client', sub: 'browser', icon: '💻', color: 'blue', info: '…' }],  // 2–6 actors
steps: [
  { section: 'Round trip 1' },                                    // labelled divider (not a step)
  { from: 'c', to: 's', label: 'ClientHello', caption: '…' },     // request (solid)
  { from: 's', to: 'c', label: '200 OK', reply: true, caption: '…' }, // response (dashed)
  { from: 'c', to: 'c', label: 'verify sig', caption: '…' },      // self-message (local work)
]
```
Actor label <= ~19 chars, sub <= ~22. A message label must fit between the two lifelines, roughly
22 chars for adjacent actors and 47 for actors two apart; self-message labels can be about 18 chars.
Order actors so that the busiest pairs are adjacent. Up to 18 messages.

### `kind: 'widget'`: interactive labs
```js
registerDiagram({ id: 'lab-cidr', roadmap: 'networking', module: 2, topic: '…', kind: 'widget',
  widget: 'cidr', title: 'Subnet calculator', desc: '…', config: { cidr: '10.0.0.0/24' } });
```

### Checklist
1. `node scripts/validate-content.js web/js/visuals/<file>.js` reports 0 errors.
2. Open `#/visuals/<roadmap>` and play the diagram: no overlapping text, and the steps read as a story.
3. Captions teach. Say what happens **and why**, and include the detail interviewers probe.

## Releasing a change
Every user-visible change gets a version:
1. Add a line under **Unreleased** in `CHANGELOG.md`.
2. Bump the version: `make bump PART=minor` for new content or features, `PART=patch` for corrections. On Windows: `.\make bump minor`.
3. Run `make upgrade` to install it. Open browser tabs offer a reload, and progress is kept because content changes are append-only (see Progress IDs above).
