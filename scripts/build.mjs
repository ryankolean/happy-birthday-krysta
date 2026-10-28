// Builds site/ from data/*.yml and docs/*.md.
// data/ is the source of truth. Never hand-edit anything under site/.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { marked } from 'marked';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site');

const load = (f) => yaml.load(readFileSync(join(root, 'data', f), 'utf8'));
const trip = load('trip.yml');
const travelers = load('travelers.yml');
const flights = load('flights.yml');
const lodging = load('lodging.yml');
const placesDoc = load('places.yml');
const geocache = JSON.parse(readFileSync(join(root, 'data', 'geocache.json'), 'utf8'));
const itinerary = load('itinerary.yml');
const budget = load('budget.yml');
const tasks = load('tasks.yml');

// ---------- helpers ----------

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const usd = (n) => (n == null ? 'TBD' : '$' + Number(n).toLocaleString('en-US'));

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// js-yaml turns unquoted ISO dates into Date objects, so accept both forms.
// Always read in UTC so no timezone shifts the calendar day.
const parts = (v) => {
  let y, m, d;
  if (v instanceof Date) {
    y = v.getUTCFullYear();
    m = v.getUTCMonth() + 1;
    d = v.getUTCDate();
  } else {
    [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
  }
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};
const iso = (v) => {
  const p = parts(v);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
};
const shortDate = (iso) => {
  const p = parts(iso);
  return `${DOW[p.dow].slice(0, 3)} ${p.d} ${MON[p.m - 1]}`;
};
const longDate = (iso) => {
  const p = parts(iso);
  return `${DOW[p.dow]} ${p.d} ${MON[p.m - 1]} ${p.y}`;
};

const tidy = (s) => String(s ?? '').replace(/\s*\n\s*/g, ' ').trim();

// data/ and docs/ are written for whoever edits the repo, but the site is read
// by people who just want the page. Every reference to a source file becomes a
// link to the page built from it.
const PAGE_REFS = [
  [/(?:docs\/)?nye\.md/g, 'nye.html', "the New Year's Eve options"],
  [/(?:docs\/)?dining\.md/g, 'dining.html', 'the birthday page'],
  [/(?:docs\/)?open-questions\.md/g, 'open-questions.html', 'the open questions'],
  [/(?:docs\/)?decisions\.md/g, 'decisions.html', 'the decision log'],
  [/data\/tasks\.yml/g, 'tasks.html', 'the to do list'],
  [/data\/flights\.yml/g, 'index.html#flights', 'the flights table'],
  [/data\/places\.yml/g, 'map.html', 'the map'],
];

// Runs on text that has already been escaped, so anything it inserts is the
// only markup present. Pass skipAnchors for rendered markdown, which already
// contains links that must not be rewritten from the inside.
function linkify(html, skipAnchors) {
  const sub = (chunk) => {
    let out = chunk;
    for (const [re, href, label] of PAGE_REFS) {
      out = out.replace(re, `<a href="${href}">${label}</a>`);
    }
    return out;
  };
  if (!skipAnchors) return sub(html);
  return html
    .split(/(<a\b[^>]*>.*?<\/a>)/gs)
    .map((part, i) => (i % 2 ? part : sub(part)))
    .join('');
}

// Note text: collapse, escape, then linkify. Used everywhere a YAML note or
// detail string reaches the page.
const nt = (s) => linkify(esc(tidy(s)));

const PAGES = [
  { file: 'index.html', label: 'The trip' },
  { file: 'itinerary.html', label: 'Itinerary' },
  { file: 'stays.html', label: 'Accommodations' },
  { file: 'map.html', label: 'Map' },
  { file: 'costs.html', label: 'Costs' },
  { file: 'dining.html', label: 'Birthday' },
  { file: 'nye.html', label: "New Year's Eve" },
  { file: 'decisions.html', label: 'Decisions' },
  { file: 'open-questions.html', label: 'Open questions' },
  { file: 'tasks.html', label: 'To do' },
];

function shell({ title, current, body }) {
  const nav = PAGES.map(
    (p) =>
      `<a href="${p.file}"${p.file === current ? ' aria-current="page"' : ''}>${esc(p.label)}</a>`
  ).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="assets/style.css?v=${CSS_HASH}">
</head>
<body>
<nav class="topnav"><div class="navinner">${nav}</div></nav>
<div class="wrap">
${body}
<footer>
  <p>Built from <code>data/</code> in <a href="https://github.com/ryankolean/happy-birthday-krysta">ryankolean/happy-birthday-krysta</a>. Lodging and flights last verified ${esc(iso(trip.verified))}. Nothing is booked yet.</p>
  <p>Figures marked <span class="tag quoted">quoted</span> are live prices from the operator's own site. <span class="tag estimate">estimate</span> is a real market price for a comparable thing, never quoted for us. <span class="tag open">open</span> means undecided and the number is a placeholder.</p>
</footer>
</div>
</body>
</html>
`;
}

// ---------- stylesheet ----------

const CSS = `:root {
  color-scheme: light;
  --paper: #FCFCFA;
  --raise: #FFFFFF;
  --ink: #11211F;
  --body: #2B3B38;
  --muted: #6B7A76;
  --teal: #0F5C57;
  --teal-soft: #E4EFED;
  --marigold: #A85C04;
  --marigold-soft: #FBEEDC;
  --sea: #1F6E88;
  --rule: #E2E5E0;
  --rule-firm: #CBD2CE;
  --f-display: "Instrument Serif", Georgia, "Times New Roman", serif;
  --f-body: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --f-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --pin-stroke: #11211F;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --paper: #0C1413; --raise: #14201E; --ink: #EDF0EC; --body: #C5D0CC;
    --muted: #8FA09B; --teal: #5FC2B8; --teal-soft: #15302D;
    --marigold: #F0A23E; --marigold-soft: #33240E; --sea: #6FB8D2;
    --rule: #1E2A28; --rule-firm: #2C3B38;
    --pin-stroke: #FCFCFA;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: #0C1413; --raise: #14201E; --ink: #EDF0EC; --body: #C5D0CC;
  --muted: #8FA09B; --teal: #5FC2B8; --teal-soft: #15302D;
  --marigold: #F0A23E; --marigold-soft: #33240E; --sea: #6FB8D2;
  --rule: #1E2A28; --rule-firm: #2C3B38;
  --pin-stroke: #FCFCFA;
}

* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  background: var(--paper);
  color: var(--body);
  font-family: var(--f-body);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; }
[hidden] { display: none !important; }

/* nav */
.topnav {
  position: sticky;
  top: env(safe-area-inset-top, 0px);
  z-index: 10;
  background: var(--paper);
  border-bottom: 1px solid var(--rule-firm);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.navinner {
  display: flex;
  gap: 2px;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
  white-space: nowrap;
}
.topnav a {
  flex: none;
  padding: 13px 12px;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
}
.topnav a:hover { color: var(--ink); }
.topnav a[aria-current="page"] { color: var(--teal); border-bottom-color: var(--teal); }

.wrap {
  max-width: 960px;
  margin: 0 auto;
  padding-left: 20px;
  padding-right: 20px;
  padding-block: 0 64px;
}

/* masthead */
.masthead { padding-block: 48px 32px; border-bottom: 2px solid var(--ink); }
.eyebrow {
  font-family: var(--f-mono);
  font-size: 11px; font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--teal); margin: 0 0 16px;
}
h1 {
  font-family: var(--f-display); font-weight: 400;
  font-size: clamp(2.4rem, 7.5vw, 3.9rem);
  line-height: 1.03; letter-spacing: -0.015em;
  color: var(--ink); text-wrap: balance; margin: 0 0 18px;
}
h1 em { font-style: italic; color: var(--marigold); }
.dateline { display: flex; flex-wrap: wrap; gap: 10px 30px; font-family: var(--f-mono); font-size: 13px; }
.dateline b {
  display: block; font-family: var(--f-body);
  font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--muted); margin-bottom: 2px;
}

/* number tiles */
.totals {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 1px; background: var(--rule-firm);
  border: 1px solid var(--rule-firm); margin-block: 32px 12px;
}
.tot { background: var(--raise); padding: 22px 20px 20px; }
.tot.lead { background: var(--teal-soft); }
.tot .k { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
.tot .v {
  font-family: var(--f-mono); font-size: 1.8rem; font-weight: 500;
  font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
  color: var(--ink); line-height: 1;
}
.tot .n { font-size: 12.5px; color: var(--muted); margin-top: 9px; line-height: 1.45; }
.caveat { font-size: 13px; color: var(--muted); margin: 0 0 8px; }

/* sections */
h2 {
  font-family: var(--f-display); font-weight: 400;
  font-size: clamp(1.65rem, 4.4vw, 2.15rem);
  line-height: 1.12; letter-spacing: -0.01em; color: var(--ink);
  text-wrap: balance; margin: 54px 0 6px; padding-top: 22px;
  border-top: 1px solid var(--rule-firm);
}
h2:first-child { margin-top: 0; border-top: none; padding-top: 0; }
h2 .num { font-family: var(--f-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.1em; color: var(--teal); display: block; margin-bottom: 10px; }
h3 { font-family: var(--f-body); font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink); margin: 32px 0 12px; }
.lede { font-size: 16.5px; color: var(--body); max-width: 64ch; margin: 0 0 24px; }
p { max-width: 68ch; }

/* tables */
.scroller { overflow-x: auto; margin-block: 16px 8px; }
table { width: 100%; border-collapse: collapse; font-size: 14.5px; min-width: 440px; }
caption { text-align: left; font-size: 12px; color: var(--muted); padding-bottom: 10px; }
th {
  text-align: left; font-size: 10px; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
  padding: 0 12px 9px 0; border-bottom: 1px solid var(--rule-firm); white-space: nowrap;
}
td { padding: 11px 12px 11px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }
th:last-child, td:last-child { padding-right: 0; }
td.n, th.n { text-align: right; font-family: var(--f-mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
tr.sum td { border-top: 2px solid var(--ink); border-bottom: none; font-weight: 600; color: var(--ink); padding-top: 13px; }
tr.pick td { background: var(--teal-soft); }
td strong, th strong { color: var(--ink); }
td small { color: var(--muted); }

/* tags */
.tag {
  display: inline-block; font-family: var(--f-mono);
  font-size: 10px; font-weight: 500; letter-spacing: 0.04em;
  text-transform: uppercase; padding: 2px 7px; border-radius: 2px; white-space: nowrap;
}
.tag.quoted, .tag.ok { background: var(--teal-soft); color: var(--teal); }
.tag.open { background: var(--marigold-soft); color: var(--marigold); }
.tag.estimate { background: var(--rule); color: var(--muted); }
.tag.done { background: var(--teal-soft); color: var(--teal); }
.tag.todo { background: var(--marigold-soft); color: var(--marigold); }

/* calendar */
.cal {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
  gap: 1px; background: var(--rule-firm);
  border: 1px solid var(--rule-firm); margin-block: 18px 12px;
}
.day { background: var(--raise); padding: 13px 13px 15px; border-top: 3px solid var(--rule-firm); min-height: 108px; }
.day.cdmx { border-top-color: var(--teal); }
.day.riviera { border-top-color: var(--sea); }
.day.birthday { border-top-color: var(--marigold); background: var(--marigold-soft); }
.day .dnum { font-family: var(--f-mono); font-size: 11px; font-weight: 500; color: var(--muted); letter-spacing: 0.04em; margin-bottom: 7px; }
.day .dwhat { font-size: 13px; line-height: 1.4; color: var(--ink); font-weight: 500; }
.day .dsub { font-size: 11.5px; line-height: 1.4; color: var(--muted); margin-top: 5px; }
.day.birthday .dwhat { color: var(--marigold); font-weight: 600; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 12px; color: var(--muted); margin-bottom: 10px; }
.legend span { display: flex; align-items: center; gap: 7px; }
.legend i { width: 16px; height: 3px; display: block; flex: none; }

/* itinerary blocks */
.block { padding: 24px 0; border-bottom: 1px solid var(--rule); }
.block:last-child { border-bottom: none; }
.bhead { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; margin-bottom: 6px; }
.bdate { font-family: var(--f-mono); font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--teal); }
.btitle { font-family: var(--f-display); font-size: 1.45rem; line-height: 1.15; color: var(--ink); }
.block.birthday .bdate { color: var(--marigold); }
.bsum { font-size: 14px; color: var(--muted); margin: 0 0 14px; }
.runs { list-style: none; margin: 0; padding: 0; }
.runs li {
  display: grid; grid-template-columns: 82px 1fr; gap: 4px 16px;
  padding: 8px 0; border-top: 1px dotted var(--rule-firm); font-size: 14.5px;
}
.runs li:first-child { border-top: none; }
.runs .t { font-family: var(--f-mono); font-size: 12.5px; font-weight: 500; color: var(--muted); padding-top: 2px; font-variant-numeric: tabular-nums; }
.runs .d strong { color: var(--ink); font-weight: 600; }
.runs .d small { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; line-height: 1.45; }
@media (max-width: 520px) {
  .runs li { grid-template-columns: 1fr; }
  .runs .t { padding-top: 0; }
}

/* notes */
.note { background: var(--teal-soft); border-left: 3px solid var(--teal); padding: 16px 18px; margin-block: 20px; font-size: 14.5px; }
.note.warn { background: var(--marigold-soft); border-left-color: var(--marigold); }
.note p { margin: 0; max-width: 62ch; }
.note p + p { margin-top: 9px; }
.note .nh { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 7px; }
.note ul { margin: 8px 0 0; padding-left: 20px; }
.note li { margin-bottom: 4px; }

/* task list */
ol.tasks { list-style: none; margin: 0; padding: 0; counter-reset: t; }
ol.tasks li {
  counter-increment: t;
  display: grid;
  grid-template-columns: 36px 1fr;
  column-gap: 16px;
  row-gap: 0;
  align-items: start;
  padding: 20px 0 22px;
  border-bottom: 1px solid var(--rule);
  font-size: 14.5px;
}
ol.tasks li:last-child { border-bottom: none; }
ol.tasks li::before {
  content: counter(t, decimal-leading-zero);
  grid-column: 1;
  grid-row: 1;
  font-family: var(--f-mono); font-size: 11.5px; font-weight: 500;
  color: var(--teal); padding-top: 3px;
}
/* Every span sits in the text column. Without this the browser auto-flows a
   task with no date into the 36px number column and renders it one word per
   line. */
ol.tasks li > span { grid-column: 2; min-width: 0; }
ol.tasks .tt {
  color: var(--ink); font-weight: 600; line-height: 1.45;
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px 9px;
}
ol.tasks .when {
  justify-self: start;
  margin-top: 9px;
  font-family: var(--f-mono); font-size: 10.5px; font-weight: 500;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--marigold);
  background: var(--marigold-soft);
  border-radius: 2px;
  padding: 3px 8px;
}
ol.tasks .tw {
  color: var(--body); font-size: 13.5px; margin-top: 9px;
  line-height: 1.65; max-width: 66ch;
}
@media (max-width: 520px) {
  ol.tasks li { grid-template-columns: 28px 1fr; column-gap: 12px; }
  ol.tasks .tw { font-size: 13px; }
}

a { color: var(--teal); text-decoration-thickness: 1px; text-underline-offset: 2px; }
a:focus-visible { outline: 2px solid var(--marigold); outline-offset: 2px; }
code { font-family: var(--f-mono); font-size: 0.88em; background: var(--rule); padding: 1px 5px; border-radius: 2px; }
pre { overflow-x: auto; background: var(--raise); border: 1px solid var(--rule-firm); padding: 14px; font-size: 13px; }
pre code { background: none; padding: 0; }
blockquote { margin: 18px 0; padding: 2px 0 2px 18px; border-left: 3px solid var(--rule-firm); color: var(--muted); font-style: italic; }
hr { border: none; border-top: 1px solid var(--rule-firm); margin: 32px 0; }

/* markdown pages */
.prose h1 { font-size: clamp(2rem, 6vw, 2.9rem); margin-bottom: 24px; }
.prose h2 { font-size: clamp(1.5rem, 4vw, 1.95rem); }
.prose h3 { font-family: var(--f-body); font-size: 15px; text-transform: none; letter-spacing: 0; font-weight: 600; margin-top: 28px; }
.prose table { min-width: 380px; }
.prose > .scroller { margin-block: 18px; }
.prose ul, .prose ol { max-width: 66ch; padding-left: 22px; }
.prose li { margin-bottom: 6px; }
.prose strong { color: var(--ink); }

/* map */
#map {
  height: clamp(380px, 62vh, 620px);
  width: 100%;
  border: 1px solid var(--rule-firm);
  background: var(--raise);
  z-index: 0;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .leaflet-tile {
    filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88) saturate(0.6);
  }
}
:root[data-theme="dark"] .leaflet-tile {
  filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88) saturate(0.6);
}
.leaflet-container { font-family: var(--f-body); font-size: 13px; }

/* Scale bar. Leaflet's default is a thin grey hairline that disappears on the
   dark tiles, so it gets the page's own surface and type. */
.leaflet-container .leaflet-control-scale { margin: 0 0 12px 12px; }
/* Leaflet's own stylesheet loads after this one, so these need the extra
   specificity to win on background and border. */
.leaflet-container .leaflet-control-scale-line {
  background: var(--raise);
  border: 1px solid var(--rule-firm);
  border-top: none;
  color: var(--ink);
  font-family: var(--f-mono);
  font-size: 10.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1.5;
  padding: 1px 6px 2px;
  text-shadow: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.leaflet-container .leaflet-control-scale-line:not(:first-child) {
  border-top: 1px solid var(--rule-firm);
  border-bottom: none;
  margin-top: -1px;
}
.leaflet-popup-content { font-size: 13px; line-height: 1.5; }
.leaflet-popup-content strong { font-size: 14px; }

/* Pins. The drop shadow is what keeps a pin legible when its fill lands on a
   tile of a similar tone, in either theme. */
.mappin { line-height: 0; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45)); }
.mappin svg { display: block; }
.leaflet-marker-icon:focus-visible { outline: 2px solid var(--marigold); outline-offset: 2px; }

.legend-row { display: flex; flex-wrap: wrap; gap: 8px; margin-block: 18px 12px; }
.legitem {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: var(--f-body); font-size: 12.5px; font-weight: 500;
  color: var(--ink); background: var(--raise);
  border: 1px solid var(--rule-firm); border-radius: 2px;
  padding: 6px 11px 6px 8px; cursor: pointer; line-height: 1;
}
.legpin { display: block; flex: none; }
.legitem .cnt { font-family: var(--f-mono); font-size: 11px; color: var(--muted); }
.legitem[aria-pressed="false"] { opacity: 0.4; }
.legitem[aria-pressed="false"] .legpin path { fill: none; stroke: var(--rule-firm); }
.legitem:hover { border-color: var(--teal); }

.bigline {
  display: inline-block;
  font-family: var(--f-body); font-size: 14px; font-weight: 600;
  color: var(--teal); background: var(--teal-soft);
  border: 1px solid var(--teal); border-radius: 2px;
  padding: 10px 16px; text-decoration: none;
}
.bigline:hover { background: var(--teal); color: var(--paper); }

.swatch {
  display: inline-block; width: 11px; height: 11px; border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg); margin-right: 9px; vertical-align: baseline;
}

footer { margin-top: 52px; padding-top: 22px; border-top: 1px solid var(--rule-firm); font-size: 12.5px; color: var(--muted); }
footer p { max-width: 70ch; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;

// Fingerprint the stylesheet so a deploy actually invalidates it. Without
// this, a returning visitor gets the cached CSS against the new HTML.
const CSS_HASH = createHash('sha256').update(CSS).digest('hex').slice(0, 8);

// ---------- index ----------

function tile(k, v, n, lead) {
  return `<div class="tot${lead ? ' lead' : ''}"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="n">${esc(n)}</div></div>`;
}

function buildIndex() {
  const cdmxLeg = trip.legs.find((l) => l.id === 'cdmx');
  const rivLeg = trip.legs.find((l) => l.id === 'riviera');

  let b = `<header class="masthead">
  <p class="eyebrow">Group briefing / updated ${esc(iso(trip.verified))}</p>
  <h1>Eleven days in Mexico for <em>Krysta's 35th</em></h1>
  <div class="dateline">
    <div><b>Dates</b>${esc(shortDate(trip.start))} to ${esc(shortDate(trip.end))} 2027</div>
    <div><b>Mexico City</b>${cdmxLeg.travelers} people, ${cdmxLeg.nights} nights</div>
    <div><b>Riviera Maya</b>${rivLeg.travelers} people, ${rivLeg.nights} nights</div>
    <div><b>The birthday</b>${esc(longDate(trip.birthday))}</div>
  </div>
</header>

<div class="totals">
${tile('You owe Ryan, both legs', usd(budget.per_person.both_legs), 'Shared bookings only, for the 6 doing both legs.', true)}
${tile('Mexico City', usd(budget.cdmx.per_person), 'Your share of the house, Pujol and lucha libre.')}
${tile('Riviera Maya', usd(budget.riviera.per_person), 'Your share of four all-inclusive rooms. Not booked yet.')}
${tile('Flights', 'Your own', 'Everybody books and pays for their own. No fare is in any figure here.')}
</div>
<p class="caveat">All figures are per person, and they are what you owe Ryan rather than what the trip costs you. Excludes ${esc(budget.excludes.join(', '))}. Peso figures converted at ${esc(trip.exchange_rate.range)} MXN/USD.</p>

<div class="note warn">
  <div class="nh">Read this if you are flying home from Mexico City</div>
  <p>${nt(budget.flag_for_solo_b)}</p>
</div>`;

  // calendar
  b += `<h2 id="calendar"><span class="num">01</span>The eleven days at a glance</h2>
<div class="legend">
  <span><i style="background:var(--teal)"></i>Mexico City</span>
  <span><i style="background:var(--sea)"></i>Riviera Maya</span>
  <span><i style="background:var(--marigold)"></i>The birthday</span>
  <span><i style="background:var(--rule-firm)"></i>Travel day</span>
</div>
<div class="cal">`;
  for (const d of itinerary.days) {
    const cls = d.kind === 'birthday' ? 'birthday' : d.kind === 'travel' ? '' : d.leg;
    b += `<div class="day ${cls}"><div class="dnum">${esc(shortDate(d.date))}</div><div class="dwhat">${esc(d.title)}</div>${d.summary ? `<div class="dsub">${esc(d.summary)}</div>` : ''}</div>`;
  }
  b += `</div>`;

  // lodging
  b += `<h2 id="lodging"><span class="num">02</span>Where we are staying</h2>
<p class="lede">Mexico City is booked. Dreams Jade is priced live and not booked.</p>`;

  const jade = lodging.properties.find((p) => p.id === 'jade');
  const casakm = lodging.cdmx_front_runner;
  const jadeRec = jade.combinations.find((c) => c.recommended);

  b += `<div class="scroller"><table>
<caption>Lodging is booked whole and split evenly. Both columns shown so the arithmetic is visible.</caption>
<thead><tr><th>Property</th><th>Dates</th><th>Found</th><th class="n">Whole place</th><th class="n">Each</th></tr></thead><tbody>
<tr class="pick"><td><strong>${esc(casakm.name)}</strong><br><small>${esc(casakm.neighborhood)}, ${casakm.bedrooms}BR, ${casakm.baths} baths, private rooftop</small></td>
<td>${esc(shortDate(casakm.checkin))} to ${esc(shortDate(casakm.checkout))}<br><small>${casakm.guests} guests</small></td>
<td><span class="tag ok">booked</span><br><small>${esc(iso(casakm.booked))}</small></td>
<td class="n"><small>${usd(casakm.total_usd)}</small></td>
<td class="n"><strong>${usd(casakm.per_person_usd)}</strong></td></tr>
<tr><td><strong>${esc(jadeRec.label)}</strong><br><small>${esc(jade.name)}, ${jade.adults} adults as ${esc(jade.group_shape)}</small></td>
<td>${esc(shortDate(jade.checkin))} to ${esc(shortDate(jade.checkout))}<br><small>${jade.nights} nights</small></td>
<td><span class="tag estimate">not booked</span><br><small>repriced ${esc(iso(jade.repriced))}</small></td>
<td class="n"><small>${usd(jadeRec.flexible_usd)}</small></td>
<td class="n"><strong>${usd(jadeRec.flexible_per_person_usd)}</strong></td></tr>
</tbody></table></div>`;

  b += `<p class="lede" style="margin-top:14px">Everywhere we might eat, drink or go is plotted on <a href="map.html">the map</a>, colour coded and with the walk from the house.</p>

<h3>Beds at ${esc(casakm.name)}, so nobody is surprised</h3>
<p>${casakm.bedrooms} bedrooms and ${casakm.baths} bathrooms: ${esc(casakm.bed_config.map((x) => x.bed).join(', ').toLowerCase())}, and every bedroom has its own full bathroom. ${nt(casakm.room_plan)} Checkout is ${esc(casakm.checkout_time)} and the rooftop is private.</p>
<p><a href="${esc(casakm.url)}">View ${esc(casakm.name)}</a> &middot; <a href="${esc(jade.url)}">View Dreams Jade</a> &middot; <a href="stays.html">Full booking details</a></p>

<div class="note warn">
  <div class="nh">Two things worth knowing</div>
  <p><strong>The fourth room is the expensive decision, not the view.</strong> ${nt(jade.layout_problem)}</p>
  <p><strong>Mexico City is committed.</strong> ${esc(casakm.cancellation.actual)}. ${nt(casakm.cancellation.warning)}</p>
</div>`;

  // flights
  b += `<h2 id="flights"><span class="num">03</span>Flights</h2>
<p class="lede"><strong>Everybody books and pays for their own flights.</strong> No fare is in any total on this site. The fares below were priced ${esc(iso(flights.priced))} and are a reference point, not a bill.</p>

<div class="note">
  <div class="nh">Be on the same Mexico City to Cancun flight</div>
  <p>${nt(budget.flights.mex_cun_callout)}</p>
</div>

<div class="note">
  <div class="nh">Krysta and Ryan have not booked yet</div>
  <p>${nt(budget.flights.krysta_and_ryan)}</p>
</div>

<div class="scroller"><table>
<caption>Reference fares, per person, one way. Not in any total.</caption>
<thead><tr><th>Date</th><th>Route</th><th>Flight</th><th>Times</th><th class="n">Per person</th></tr></thead><tbody>`;
  for (const f of flights.flights) {
    const pick = f.id === 'to_beach' ? ' class="pick"' : '';
    b += `<tr${pick}><td>${esc(shortDate(f.date))}</td><td>${esc(f.route)}<br><small>${esc(f.who)}</small></td><td>${f.number ? `<strong>${esc(f.number)}</strong>` : esc(f.carrier)}</td><td>${esc(f.depart)} to ${esc(f.arrive)}</td><td class="n">${usd(f.price_usd)}</td></tr>`;
  }
  b += `</tbody></table></div>
<p>${nt(flights.afternoon_departure_problem)}</p>
<div class="note">
  <div class="nh">The one real risk on the outbound</div>
  <p>${nt(flights.flights[0].risk)}</p>
</div>`;

  // costs summary
  b += `<h2 id="costs"><span class="num">04</span>What it costs you</h2>
<p class="lede">Two blocks, and they are what you owe Ryan rather than what the week costs you. Flights are yours. Full line by line breakdown on the <a href="costs.html">costs page</a>.</p>
<div class="scroller"><table>
<thead><tr><th>Block</th><th class="n">Doing both legs</th><th class="n">City only</th></tr></thead><tbody>
<tr><td>Mexico City</td><td class="n">${usd(budget.cdmx.per_person)}</td><td class="n">${usd(budget.cdmx.per_person)}</td></tr>
<tr><td>Riviera Maya</td><td class="n">${usd(budget.riviera.per_person)}</td><td class="n">n/a</td></tr>
<tr class="sum"><td>What you owe Ryan</td><td class="n">${usd(budget.per_person.both_legs)}</td><td class="n">${usd(budget.per_person.city_only)}</td></tr>
<tr><td>Flights</td><td class="n">Your own</td><td class="n">Your own</td></tr>
<tr><td>Food and transport on the ground<br><small>Estimated, your own money</small></td><td class="n">${usd(budget.cdmx.estimates_per_person + budget.riviera.estimates_per_person)}</td><td class="n">${usd(budget.cdmx.estimates_per_person)}</td></tr>
</tbody></table></div>

<div class="note warn">
  <div class="nh">Estimates are never added to a total</div>
  <p>${nt(budget.estimates_note)}</p>
</div>`;

  // what needs doing
  b += `<h2 id="todo"><span class="num">05</span>What still has to happen</h2>
<p class="lede">The first five are this week, and the first two because waiting makes them worse rather than just more expensive. Everything else is on the <a href="tasks.html">to do page</a>.</p>
<ol class="tasks">`;
  for (const t of tasks.this_week) {
    b += `<li><span class="tt">${esc(t.title)}</span><span class="tw">${nt(t.why_now)}</span></li>`;
  }
  b += `</ol>`;

  return shell({ title: "Krysta's 35th in Mexico", current: 'index.html', body: b });
}

// ---------- itinerary page ----------

function buildItinerary() {
  let b = `<header class="masthead">
  <p class="eyebrow">Day by day</p>
  <h1>The itinerary</h1>
  <div class="dateline"><div><b>Eleven days</b>${esc(shortDate(trip.start))} to ${esc(shortDate(trip.end))} 2027</div></div>
</header>

<div class="note">
  <div class="nh">The finding that shapes the whole week</div>
  <p>Of the five nights in Mexico City, three are already committed and one is a write-off. That is why the dinner list had to be cut.</p>
</div>
<div class="itin">`;

  for (const d of itinerary.days) {
    const cls = d.kind === 'birthday' ? ' birthday' : '';
    b += `<div class="block${cls}">
  <div class="bhead"><span class="bdate">${esc(shortDate(d.date))}</span><span class="btitle">${esc(d.title)}</span></div>`;
    if (d.summary) b += `<p class="bsum">${esc(d.summary)}</p>`;
    if (d.events) {
      b += `<ul class="runs">`;
      for (const e of d.events) {
        b += `<li><span class="t">${esc(e.time)}</span><span class="d"><strong>${esc(e.what)}</strong>${e.detail ? `<small>${nt(e.detail)}</small>` : ''}${e.why ? `<small>${nt(e.why)}</small>` : ''}</span></li>`;
      }
      b += `</ul>`;
    }
    if (d.plan_status) b += `<div class="note"><p>${nt(d.plan_status)}</p></div>`;
    if (d.notes) b += `<div class="note"><ul>${d.notes.map((n) => `<li>${nt(n)}</li>`).join('')}</ul></div>`;
    if (d.warnings) {
      b += `<div class="note warn"><div class="nh">Watch out</div><ul>${d.warnings.map((w) => `<li>${nt(w)}</li>`).join('')}</ul></div>`;
    }
    b += `</div>`;
  }
  b += `</div>`;

  if (itinerary.does_not_fit) {
    b += `<h2>What does not fit, and why</h2>
<div class="scroller"><table><thead><tr><th>Item</th><th>Why not</th></tr></thead><tbody>`;
    for (const x of itinerary.does_not_fit) {
      b += `<tr><td><strong>${esc(x.item)}</strong></td><td>${nt(x.why)}</td></tr>`;
    }
    b += `</tbody></table></div>`;
  }

  return shell({ title: 'The itinerary', current: 'itinerary.html', body: b });
}

// ---------- costs page ----------

function costRows(lines) {
  return lines
    .map((l) => {
      const unit = l.unit_price
        ? `<br><small>${usd(l.unit_price)} for the ${esc(l.unit_label || 'whole booking')}</small>`
        : '';
      return `<tr><td><strong>${esc(l.item)}</strong>${unit}${l.note ? `<br><small>${nt(l.note)}</small>` : ''}</td><td><span class="tag ${esc(l.status)}">${esc(l.status)}</span></td><td class="n">${usd(l.per_person)}</td></tr>`;
    })
    .join('');
}

function buildCosts() {
  const r = budget.riviera;
  const jade = lodging.properties.find((p) => p.id === 'jade');
  const f = budget.flights;

  const estTable = (caption, rows, total) => `<div class="scroller"><table>
<caption>${esc(caption)}</caption>
<thead><tr><th>Item</th><th>Status</th><th class="n">Each</th></tr></thead>
<tbody>${costRows(rows)}
<tr><td colspan="2"><em>Not added to any total above</em></td><td class="n"><em>${usd(total)}</em></td></tr>
</tbody></table></div>`;

  let b = `<header class="masthead">
  <p class="eyebrow">What you owe Ryan, per person</p>
  <h1>What it costs you</h1>
  <div class="dateline">
    <div><b>Doing both legs</b>${esc(usd(budget.per_person.both_legs))}</div>
    <div><b>City only</b>${esc(usd(budget.per_person.city_only))}</div>
    <div><b>Rate used</b>${esc(budget.rate_mxn_per_usd)} MXN/USD</div>
  </div>
</header>

<p class="lede">Every figure on this page is what one person pays. Lodging also shows the whole-place price, because a house and a resort residence are booked whole and then split evenly.</p>

<div class="note warn">
  <div class="nh">Estimates are not in any total on this page</div>
  <p>${nt(budget.estimates_note)}</p>
</div>

<h2>Flights</h2>
<p class="lede"><strong>Everybody books and pays for their own flights.</strong> No fare appears in any total on this page and no flight money goes through Ryan.</p>
<p>${nt(f.note)}</p>

<div class="note">
  <div class="nh">The one flight worth coordinating</div>
  <p>${nt(f.mex_cun_callout)}</p>
</div>

<div class="note">
  <div class="nh">Krysta and Ryan have not booked yet</div>
  <p>${nt(f.krysta_and_ryan)}</p>
</div>

<div class="scroller"><table>
<caption>Reference fares only, priced 25 September 2026. Not a bill, and not in any total.</caption>
<thead><tr><th>Leg</th><th class="n">Each, one way</th></tr></thead><tbody>
<tr><td>Detroit to Mexico City, 29 December</td><td class="n">${usd(f.reference_fares_usd.dtw_mex_29_dec)}</td></tr>
<tr class="pick"><td><strong>Mexico City to Cancun, 3 January</strong><br><small>The one to be on together</small></td><td class="n">${usd(f.reference_fares_usd.mex_cun_3_jan)}</td></tr>
<tr><td>Cancun to Detroit, 8 January</td><td class="n">${usd(f.reference_fares_usd.cun_dtw_8_jan)}</td></tr>
<tr><td>Mexico City to Detroit, 3 January, nonstop</td><td class="n">${usd(f.reference_fares_usd.mex_dtw_3_jan_nonstop)}</td></tr>
</tbody></table></div>
<p>Flight numbers, times and the alternatives considered are in <a href="index.html#flights">the flights table on the front page</a>.</p>

<h2>Mexico City</h2>
<p class="lede">${nt(budget.cdmx.lodging_note)}</p>
<div class="scroller"><table>
<caption>Booked and paid on Ryan's card. Lodging splits ${budget.cdmx.lodging_travelers} ways, the other two lines are priced for all ${budget.cdmx.travelers}.</caption>
<thead><tr><th>Item</th><th>Status</th><th class="n">Each</th></tr></thead>
<tbody>${costRows(budget.cdmx.lines)}
<tr class="sum"><td colspan="2">Mexico City, what you owe Ryan</td><td class="n">${usd(budget.cdmx.per_person)}</td></tr>
</tbody></table></div>

<h3>What you will spend on the ground in the city</h3>
${estTable('Your own money, not money owed to Ryan. Shown so the week does not surprise anybody.', budget.cdmx.estimates, budget.cdmx.estimates_per_person)}

<div class="note warn">
  <div class="nh">The lodging line is committed, and it rose</div>
  <p>${nt(budget.cdmx.lines[0].note)}</p>
  <p>Payment dates and the refund cliff are on <a href="stays.html">the accommodations page</a>.</p>
</div>

<h2>Riviera Maya</h2>
<p class="lede">${esc(jade.name)}, ${r.travelers} people as ${esc(r.group_shape)}. All-inclusive. Priced live on Booking.com on ${esc(iso(jade.repriced))} with 16% VAT added on top, nothing booked.</p>

<div class="note warn">
  <div class="nh">The fourth room costs more than the ocean view</div>
  <p>${nt(jade.layout_problem)}</p>
  <p>${nt(jade.layout_recommended)}</p>
</div>

<div class="scroller"><table>
<caption>Recommended build. Booked whole and split ${r.travelers} ways.</caption>
<thead><tr><th>Item</th><th>Status</th><th class="n">Each</th></tr></thead>
<tbody>${costRows(r.lines)}
<tr class="sum"><td colspan="2">Riviera Maya, what you owe Ryan</td><td class="n">${usd(r.per_person)}</td></tr>
</tbody></table></div>

<h3>The ${r.layout_options.length} builds that work, priced</h3>
<p>Every one of these gives all six a bed of their own with nobody on a sofa. They differ on how many rooms and how good a view, not on whether they work.</p>
<div class="scroller"><table>
<caption>Live ${esc(iso(jade.repriced))} for ${esc(shortDate(jade.checkin))} to ${esc(shortDate(jade.checkout))}, all-inclusive, 16% VAT added on top of the quoted price. Split ${r.travelers} ways, per person in bold.</caption>
<thead><tr><th>Layout</th><th class="n">Non-refundable</th><th class="n">Each</th><th class="n">Flexible</th><th class="n">Each</th></tr></thead><tbody>
${r.layout_options.map((o) => `<tr${o.recommended ? ' class="pick"' : ''}><td><strong>${esc(o.label)}</strong><br><small>${esc(o.sleeps)}</small><br><small>${nt(o.verdict)}</small></td>
<td class="n"><small>${usd(o.nonrefundable_total)}</small></td><td class="n">${usd(o.nonrefundable_per_person)}</td>
<td class="n"><small>${usd(o.flexible_total)}</small></td><td class="n"><strong>${usd(o.flexible_per_person)}</strong></td></tr>`).join('')}
</tbody></table></div>
<p><strong>Flexible terms:</strong> ${esc(jade.flexible_terms)}. ${nt(jade.rate_choice.note)}</p>

<div class="note warn">
  <div class="nh">Never put a single in an ocean front room</div>
  <p>${nt(r.single_occupancy_trap)}</p>
</div>

<div class="note warn">
  <div class="nh">Booking quotes this property before tax</div>
  <p>${nt(jade.tax_treatment.note)}</p>
</div>

<h3>What you will spend on the ground at the beach</h3>
${estTable('Your own money, not money owed to Ryan. Shown so the week does not surprise anybody.', r.estimates, r.estimates_per_person)}

<div class="note">
  <div class="nh">Food is in the rate now</div>
  <p>${nt(r.board_included.note)}</p>
</div>

<h2>Splitting it</h2>
<ul>${budget.split_mechanism.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>

<h2>What is already committed if we cancel</h2>
<div class="scroller"><table><thead><tr><th>What</th><th>Terms</th></tr></thead><tbody>
${budget.non_refundable_exposure.map((x) => `<tr><td><strong>${esc(x.what)}</strong></td><td>${nt(x.terms)}</td></tr>`).join('')}
</tbody></table></div>

<div class="note">
  <div class="nh">For the one leaving after Mexico City</div>
  <p>${nt(budget.flag_for_solo_b)}</p>
</div>`;

  return shell({ title: 'What it costs', current: 'costs.html', body: b });
}

// ---------- tasks page ----------

function taskBlock(title, list, showWhen) {
  if (!list || !list.length) return '';
  let s = `<h2>${esc(title)}</h2><ol class="tasks">`;
  for (const t of list) {
    s += `<li><span class="tt">${esc(t.title)}${t.status ? ` <span class="tag ${esc(t.status)}">${esc(t.status)}</span>` : ''}</span>${showWhen && t.date ? `<span class="when">${esc(longDate(t.date))}</span>` : ''}<span class="tw">${nt(t.why_now || t.why || t.detail || '')}</span></li>`;
  }
  return s + `</ol>`;
}

function buildTasks() {
  let b = `<header class="masthead">
  <p class="eyebrow">As of ${esc(iso(tasks.as_of))}</p>
  <h1>What still has to happen</h1>
  <div class="dateline"><div><b>Booked so far</b>Nothing</div></div>
</header>`;
  b += taskBlock('This week', tasks.this_week, false);
  b += taskBlock('On a date', tasks.dated, true);
  b += taskBlock('Decisions needed', tasks.decisions_needed, false);
  b += taskBlock('Housekeeping', tasks.housekeeping, false);
  b += taskBlock('Already settled', tasks.done, false);
  return shell({ title: 'What still has to happen', current: 'tasks.html', body: b });
}

// ---------- accommodations ----------

function buildStays() {
  const jade = lodging.properties.find((p) => p.id === 'jade');
  const casakm = lodging.cdmx_front_runner;
  const r = budget.riviera;

  const bullets = (arr) => `<ul>${arr.map((x) => `<li>${nt(x)}</li>`).join('')}</ul>`;
  const rec = jade.combinations.find((c) => c.recommended);

  let b = `<header class="masthead">
  <p class="eyebrow">Two places, and only two. Mexico City booked ${esc(iso(casakm.booked))}.</p>
  <h1>Where we are staying</h1>
  <div class="dateline">
    <div><b>Mexico City</b>${esc(shortDate(casakm.checkin))} to ${esc(shortDate(casakm.checkout))}, ${casakm.nights} nights</div>
    <div><b>Riviera Maya</b>${esc(shortDate(jade.checkin))} to ${esc(shortDate(jade.checkout))}, ${jade.nights} nights</div>
  </div>
</header>

<p class="lede">Casa KM in Mexico City is booked and partly paid. Dreams Jade in Puerto Morelos is priced live and not booked. Nothing else is under consideration, so nothing else is on this page.</p>

<div class="scroller"><table>
<caption>Booked whole and split evenly. Per person in bold.</caption>
<thead><tr><th>Where</th><th>Dates</th><th>Who</th><th class="n">Whole place</th><th class="n">Each</th></tr></thead><tbody>
<tr class="pick"><td><strong>${esc(casakm.name)}</strong><br><small>${esc(casakm.neighborhood)}, Mexico City &middot; booked</small></td>
<td>${esc(shortDate(casakm.checkin))} to ${esc(shortDate(casakm.checkout))}<br><small>${casakm.nights} nights</small></td>
<td>${casakm.guests} guests</td>
<td class="n"><small>${usd(casakm.total_usd)}</small></td><td class="n"><strong>${usd(casakm.per_person_usd)}</strong></td></tr>
<tr><td><strong>${esc(jade.name)}</strong><br><small>${esc(rec.label)} &middot; not booked</small></td>
<td>${esc(shortDate(jade.checkin))} to ${esc(shortDate(jade.checkout))}<br><small>${jade.nights} nights</small></td>
<td>${jade.adults} adults</td>
<td class="n"><small>${usd(rec.flexible_usd)}</small></td><td class="n"><strong>${usd(rec.flexible_per_person_usd)}</strong></td></tr>
</tbody></table></div>

<h2><span class="num">01</span>${esc(casakm.name)}<span class="tag ok">booked</span></h2>
<p class="lede">${esc(casakm.subtitle)}. ${esc(casakm.neighborhood)}, Mexico City. <strong>${usd(casakm.per_person_usd)} each</strong>, all in, and partly paid.</p>

<p><a class="bigline" href="${esc(casakm.url)}">Open the Airbnb listing</a></p>

<div class="scroller"><table><tbody>
<tr><th>Check in</th><td>${esc(longDate(casakm.checkin))}, from ${esc(casakm.checkin_time)}</td></tr>
<tr><th>Check out</th><td>${esc(longDate(casakm.checkout))}, before ${esc(casakm.checkout_time)}</td></tr>
<tr><th>Nights</th><td>${casakm.nights}</td></tr>
<tr><th>Guests</th><td>${casakm.guests} of us, and ${casakm.capacity} is the hard maximum</td></tr>
<tr><th>Layout</th><td>${casakm.bedrooms} bedrooms, ${casakm.beds} beds, ${casakm.baths} bathrooms<br><small>${esc(casakm.baths_note)}</small></td></tr>
<tr><th>Price</th><td><strong>${usd(casakm.total_usd)}</strong> all in, <strong>${usd(casakm.per_person_usd)} each</strong></td></tr>
<tr><th>Rated</th><td>${casakm.rating} from ${casakm.reviews} reviews</td></tr>
<tr><th>Also</th><td>Washer and dryer in unit, ${casakm.wifi_mbps} Mbps wifi, ${esc(casakm.parking)}</td></tr>
</tbody></table></div>

<h3>Who sleeps where</h3>
<div class="scroller"><table><thead><tr><th>Bedroom</th><th>Bed</th><th>What else</th></tr></thead><tbody>
${casakm.bed_config.map((x) => `<tr><td>${esc(x.bedroom)}</td><td><strong>${esc(x.bed)}</strong></td><td><small>${esc(x.extras)}</small></td></tr>`).join('')}
</tbody></table></div>
<p>${nt(casakm.room_plan)}</p>

<h3>The rooftop</h3>
<p>${nt(casakm.roof)}</p>

<h3>How far from everything</h3>
<div class="scroller"><table>
<caption>Straight line from the house, so real walking is a little longer.</caption>
<thead><tr><th>To</th><th class="n">Distance</th></tr></thead><tbody>
<tr><td>Roma Norte restaurant cluster</td><td class="n">${casakm.distance_km.roma_norte_core} km</td></tr>
<tr><td>Parque Mexico</td><td class="n">${casakm.distance_km.parque_mexico} km</td></tr>
<tr><td><a href="dining.html">Pujol</a>, Polanco</td><td class="n">${casakm.distance_km.pujol} km</td></tr>
</tbody></table></div>
<p>Del Valle Norte reads as far out, but most of the week is walkable from it. Every venue is plotted on <a href="map.html">the map</a>.</p>

<h3>Why this one</h3>
${bullets(casakm.why_chosen)}

<div class="note warn">
  <div class="nh">Cancellation, now that it is committed</div>
  <p><strong>${esc(casakm.cancellation.actual)}</strong></p>
  <p>${nt(casakm.cancellation.warning)}</p>
</div>

<div class="note">
  <div class="nh">Worth knowing</div>
  ${bullets(casakm.flags)}
</div>

<h2><span class="num">02</span>The Mexico City booking itself</h2>
<p class="lede">Confirmed ${esc(iso(casakm.booked))}. The confirmation code, street address and host phone are deliberately not on this site; they live in the repo's gitignored <code>private/</code> folder.</p>

<div class="scroller"><table>
<caption>What was actually charged, taxes included.</caption>
<thead><tr><th>Line</th><th class="n">Amount</th></tr></thead><tbody>
<tr><td>${esc(casakm.price_breakdown.nightly_usd.toFixed(2))} a night x ${casakm.price_breakdown.nights} nights</td><td class="n">${usd(casakm.price_breakdown.subtotal_usd)}</td></tr>
<tr><td>Taxes</td><td class="n">${usd(casakm.price_breakdown.taxes_usd)}</td></tr>
<tr class="sum"><td>Total</td><td class="n"><strong>${usd(casakm.price_breakdown.total_usd)}</strong></td></tr>
<tr class="pick"><td>Split ${casakm.guests} ways</td><td class="n"><strong>${usd(casakm.per_person_usd)} each</strong></td></tr>
</tbody></table></div>

<h3>When the money moves</h3>
<div class="scroller"><table>
<thead><tr><th>Date</th><th class="n">Amount</th><th>Status</th></tr></thead><tbody>
${casakm.payment_schedule.map((x) => `<tr><td>${esc(longDate(x.date))}</td><td class="n">${usd(x.amount_usd)}</td><td><span class="tag ${x.status === 'paid' ? 'ok' : 'estimate'}">${esc(x.status)}</span></td></tr>`).join('')}
</tbody></table></div>
<p>The second payment lands before the refund cliff, so deposits want collecting ahead of ${esc(longDate(casakm.payment_schedule[1].date))}, not after. Both dates are on <a href="tasks.html">the to do list</a>.</p>

<div class="note warn">
  <div class="nh">The rate rose before we booked</div>
  <p>${nt(casakm.rate_rose_before_booking)}</p>
</div>

<h3>House rules on the confirmation</h3>
<div class="scroller"><table><tbody>
<tr><th>Quiet hours</th><td><strong>${esc(casakm.house_rules.quiet_hours)}</strong></td></tr>
<tr><th>Maximum guests</th><td>${casakm.house_rules.max_guests}</td></tr>
<tr><th>Pets</th><td>${esc(casakm.house_rules.pets)}</td></tr>
</tbody></table></div>
<ul>${casakm.safety_on_confirmation.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>

<div class="note warn">
  <div class="nh">Quiet hours versus midnight on the roof</div>
  <p>The ${esc(casakm.house_rules.quiet_hours)} quiet hours appeared only on the confirmation, not in the listing's rules summary. Midnight on New Year's Eve sits inside that window and the property has exterior cameras, so <a href="nye.html">the New Year's Eve plan</a> is provisional until the host agrees in writing.</p>
</div>

<h2><span class="num">03</span>${esc(jade.name)}<span class="tag estimate">not booked</span></h2>
<p class="lede">Puerto Morelos, between Cancun and Playa del Carmen. ${jade.adults} of us, as ${esc(jade.group_shape)}. All-inclusive, scored ${jade.review_score} on ${jade.review_count} reviews. Repriced live on ${esc(iso(jade.repriced))}.</p>

<p><a class="bigline" href="${esc(jade.url)}">Open the listing</a></p>

<div class="note">
  <div class="nh">Why here instead of The Fives</div>
  <p>${nt(jade.why_this_property)}</p>
</div>

<div class="note warn">
  <div class="nh">The fourth room costs more than the ocean view</div>
  <p>${nt(jade.layout_problem)}</p>
  <p><strong>${nt(jade.layout_recommended)}</strong></p>
</div>

<h3>Every way six adults can sleep here without sharing a bed</h3>
<p>All ${jade.combinations.length} builds below give each person a bed of their own with nobody on a sofa. They differ on how many rooms we take and how good the view is.</p>
<div class="scroller"><table>
<caption>Live ${esc(iso(jade.repriced))}, ${esc(shortDate(jade.checkin))} to ${esc(shortDate(jade.checkout))}, all-inclusive, 16% VAT added on top of the quoted price. Split ${jade.adults} ways, per person in bold.</caption>
<thead><tr><th>Layout</th><th>Who sleeps where</th><th class="n">Non-refundable</th><th class="n">Each</th><th class="n">Flexible</th><th class="n">Each</th></tr></thead><tbody>
${jade.combinations.map((c) => `<tr${c.recommended ? ' class="pick"' : ''}><td><strong>${esc(c.label)}</strong><br><small>${c.units} unit${c.units > 1 ? 's' : ''}</small></td>
<td><small>${esc(c.rooms_detail)}</small><br><small>${nt(c.sleeps)}</small></td>
<td class="n"><small>${usd(c.nonrefundable_usd)}</small></td><td class="n">${usd(c.nonrefundable_per_person_usd)}</td>
<td class="n"><small>${usd(c.flexible_usd)}</small></td><td class="n"><strong>${usd(c.flexible_per_person_usd)}</strong></td></tr>`).join('')}
</tbody></table></div>
<p><strong>Recommended: ${esc(rec.label)} on the flexible rate, ${usd(rec.flexible_per_person_usd)} each.</strong> ${nt(jade.recommendation_note)}</p>

<div class="note warn">
  <div class="nh">Never put a single in an ocean front room</div>
  <p>${nt(jade.single_occupancy_rule.note)}</p>
</div>

<div class="note warn">
  <div class="nh">Booking quotes this property before tax</div>
  <p>${nt(jade.tax_treatment.note)}</p>
</div>

<div class="note">
  <div class="nh">Preferred Club, and a pricing quirk worth knowing</div>
  <p>${nt(jade.preferred_club.what)}</p>
  <p>${nt(jade.preferred_club.pricing_quirk)}</p>
</div>

<h3>Every room available on these dates</h3>
<div class="scroller"><table>
<caption>Per room for all ${jade.nights} nights, 16% VAT added on top of the price Booking displays. The single column is the one-adult rate for the same room: 80 percent on the four cheapest types and 100 percent on everything above them.</caption>
<thead><tr><th>Room</th><th>Beds</th><th class="n">Two people</th><th class="n">Flexible</th><th class="n">One person</th></tr></thead><tbody>
${jade.room_catalogue.map((c) => `<tr><td><strong>${esc(c.name)}</strong><br><small>up to ${c.max_adults} adults</small></td>
<td><small>${esc(c.beds)}</small></td>
<td class="n">${usd(c.nonrefundable.all_in_usd)}</td>
<td class="n"><small>${usd(c.flexible.all_in_usd)}</small></td>
<td class="n">${c.single_nonrefundable ? usd(c.single_nonrefundable.all_in_usd) + (c.single_discount_percent ? '' : ' <small>(no discount)</small>') : '<small>n/a</small>'}</td></tr>`).join('')}
</tbody></table></div>

<div class="scroller"><table><tbody>
<tr><th>Check in</th><td>${esc(longDate(jade.checkin))}, from ${esc(jade.checkin_time)}</td></tr>
<tr><th>Check out</th><td>${esc(longDate(jade.checkout))}, before ${esc(jade.checkout_time)}</td></tr>
<tr><th>Nights</th><td>${jade.nights}</td></tr>
<tr><th>Guests</th><td>${jade.adults} adults, as ${esc(jade.group_shape)}</td></tr>
<tr><th>Board</th><td>${esc(jade.board)}</td></tr>
<tr><th>Reservations</th><td>Hyatt Inclusive Collection ${esc(jade.contact.hyatt_inclusive_us)}<br>Resort direct ${esc(jade.contact.resort_direct)}</td></tr>
</tbody></table></div>

<div class="note">
  <div class="nh">Food is in the rate now</div>
  <p>${nt(r.board_included.note)}</p>
</div>

<div class="note">
  <div class="nh">Four rooms is not a group, and there is a better lever</div>
  <p>${nt(jade.group_booking)}</p>
  <p>${nt(jade.hyatt_prive.what)} ${nt(jade.hyatt_prive.caution)}</p>
</div>

<h3>Why 3 January and not earlier</h3>
<p>${nt(jade.why_jan_3)}</p>

<h3>Ask these on the call</h3>
${bullets(jade.ask_on_the_call)}

<div class="note warn">
  <div class="nh">Still open before booking</div>
  ${bullets(jade.open)}
</div>

<div class="note">
  <div class="nh">Deposits</div>
  <p>Both legs want money before they are held, and ${esc(casakm.name)} stops refunding entirely after 22 December. Collect from everyone first. The full cancellation position is on <a href="costs.html">the costs page</a>, and the booking deadlines are on <a href="tasks.html">the to do list</a>.</p>
</div>`;

  return shell({ title: 'Where we are staying', current: 'stays.html', body: b });
}

// ---------- map ----------

// Teardrop pin silhouette, same geometry 4pm-detroit uses (src/lib/map-pin.ts).
// The tip sits at y=21 in a 24 unit box, which is what sets the icon anchor.
const PIN_PATH =
  'M12 21C12 21 18.5 13.8 18.5 9.5C18.5 5.36 15.59 2 12 2C8.41 2 5.5 5.36 5.5 9.5C5.5 13.8 12 21 12 21Z';

function buildMap() {
  const cats = placesDoc.categories;

  // Attach coordinates and drop anything still unresolved, so the map never
  // shows a pin we cannot stand behind.
  const resolved = [];
  const unresolved = [];
  for (const p of placesDoc.places) {
    const hit = p.lat && p.lon ? { lat: p.lat, lon: p.lon } : geocache[p.address];
    if (hit) resolved.push({ ...p, lat: hit.lat, lon: hit.lon });
    else unresolved.push(p);
  }

  const stay = resolved.find((p) => p.category === 'stay');

  // Opening view radius. Was 3 km when the house was in Roma Norte and the
  // cluster sat on top of it. From Del Valle Norte the Roma and Condesa
  // venues are 2.2 to 3.8 km out, so 3 km cropped most of them off.
  const OPEN_VIEW_KM = 4;

  // Straight-line distance from the house. Real walking is longer, so the
  // minutes below are a floor, not a promise.
  const km = (a, b) => {
    const R = 6371;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  for (const p of resolved) {
    p.km = stay && p !== stay ? km(stay, p) : 0;
    // 4.5 km/h walking, rounded up. Anything past 2.5 km is not a walk.
    p.walkMin = p.km > 0 && p.km <= 2.5 ? Math.ceil((p.km / 4.5) * 60) : null;
  }

  const payload = {
    center: stay ? [stay.lat, stay.lon] : [19.4185, -99.1626],
    openViewKm: OPEN_VIEW_KM,
    categories: cats,
    // Escaped at build time: these strings go straight into popup innerHTML,
    // and a name with an apostrophe or an angle bracket would otherwise break it.
    places: resolved.map((p) => ({
      n: esc(p.name),
      c: p.category,
      lat: p.lat,
      lon: p.lon,
      hood: esc(p.neighborhood || ''),
      note: nt(p.note || ''),
      booking: nt(p.booking || ''),
      url: encodeURI(p.url || ''),
      approx: p.precision === 'approximate',
      km: Math.round(p.km * 10) / 10,
      walk: p.walkMin,
    })),
  };

  const counts = {};
  for (const p of resolved) counts[p.c || p.category] = (counts[p.c || p.category] || 0) + 1;

  // Walkability from wherever the house pin currently sits. Printed below the
  // map, because moving the base changes it and stale copy would not show.
  const others = resolved.filter((p) => p.category !== 'stay');
  const walkable = others.filter((p) => p.walkMin).length;
  // Rounded to 1dp first, because that is the value the payload carries and
  // therefore what the map actually fits and what the faraway line lists.
  const rkm = (p) => Math.round(p.km * 10) / 10;
  const nearView = others.filter((p) => rkm(p) <= OPEN_VIEW_KM).length;

  // Distance from the house to the Roma Norte restaurant cluster, and what
  // happened to the closest former doorstep walk. Both printed, so neither
  // can drift if the house pin moves again.
  const ROMA_CORE = { lat: 19.4178, lon: -99.1613 };
  const romaKm = stay ? (Math.round(km(stay, ROMA_CORE) * 10) / 10).toFixed(1) : 'some';
  const lostWalks = ['Bar Latosa', 'Margot', 'Ruido Bar', 'Pandora Rooftop']
    .filter((n) => { const q = others.find((x) => x.name === n); return q && !q.walkMin; });
  const rosetta = others.find((p) => p.name === 'Panaderia Rosetta');
  const rosettaWalk = rosetta
    ? `Concretely: Panaderia Rosetta goes from a 4 minute walk at the Oasis to ${rosetta.walkMin ? `${rosetta.walkMin} minutes` : 'a ride'}` +
      (lostWalks.length ? `, and ${lostWalks.join(', ')} all stop being walks.` : '.')
    : '';

  // Same pin silhouette the legend and the markers both draw, so a retuned
  // colour cannot make the two disagree. Lifted from 4pm-detroit's map-pin.ts.
  const legend = Object.entries(cats)
    .map(
      ([key, c]) =>
        `<button class="legitem" data-cat="${esc(key)}" aria-pressed="true">` +
        `<svg class="legpin" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
        `<path d="${PIN_PATH}" fill="${esc(c.color)}" stroke="var(--pin-stroke)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
        `${esc(c.label)} <span class="cnt">${counts[key] || 0}</span></button>`
    )
    .join('');

  // Grouped list under the map, so the page still works if tiles fail to load.
  let lists = '';
  for (const [key, c] of Object.entries(cats)) {
    const inCat = resolved.filter((p) => p.category === key);
    if (!inCat.length) continue;
    lists += `<h3><span class="swatch" style="background:${esc(c.color)}"></span>${esc(c.label)}</h3>
<div class="scroller"><table><thead><tr><th>Place</th><th>Where</th><th class="n">From the house</th><th>Notes</th></tr></thead><tbody>`;
    for (const p of inCat.slice().sort((a, b) => a.km - b.km)) {
      const dist =
        p.category === 'stay'
          ? ''
          : p.walkMin
            ? `${p.walkMin} min walk`
            : `${(Math.round(p.km * 10) / 10).toFixed(1)} km`;
      lists += `<tr><td><strong>${esc(p.name)}</strong>${p.url ? `<br><a href="${esc(p.url)}">listing</a>` : ''}</td><td>${esc(p.neighborhood || '')}${p.precision === 'approximate' ? '<br><small>approximate</small>' : ''}</td><td class="n">${esc(dist)}</td><td>${nt(p.note || '')}${p.booking ? `<br><small>${nt(p.booking)}</small>` : ''}</td></tr>`;
    }
    lists += `</tbody></table></div>`;
  }

  const body = `<header class="masthead">
  <p class="eyebrow">${resolved.length} places mapped</p>
  <h1>Where everything is</h1>
  <div class="dateline">
    <div><b>Base</b>${esc(stay ? stay.neighborhood : 'Mexico City')}</div>
    <div><b>Walkable</b>${walkable} of ${others.length}</div>
    <div><b>Dashed ring</b>1 km from the house</div>
  </div>
</header>

<p class="lede">Dinner options, bars, markets and the house, colour coded. Tap a pin for details, or tap a colour below to show and hide that group.</p>

<div class="legend-row">${legend}</div>
<div id="map" role="application" aria-label="Map of trip locations"></div>
<p class="caveat" id="faraway"></p>
<p class="caveat">Map data from OpenStreetMap. ${esc(stay ? stay.name : 'The house')} is not booked yet, and Airbnb only shows an approximate area until it is, so the house pin is their published circle rather than a street address. The exact address deliberately stays out of this repo.</p>

<div class="note warn">
  <div class="nh">What basing in ${esc(stay ? stay.neighborhood : 'this area')} costs in walking</div>
  <p><strong>${walkable} of ${others.length}</strong> places are within a 2.5 km walk and ${nearView} sit inside the opening view. From the Oasis it was 48 of 67, because that house stood inside the Roma and Condesa restaurant cluster instead of ${romaKm} km south of it.</p>
  <p>${rosettaWalk} Budget for rides in the evenings: an Uber across that gap runs roughly MX$60 to MX$90.</p>
  <p><strong>These walks are a worst case, not the real ones.</strong> The pin is the middle of ${esc(stay ? stay.neighborhood : 'the neighbourhood')} rather than the house, on purpose, and it sits about half a kilometre further from Roma than the flat actually does. Measured from the listing's own circle, 27 of ${others.length} are inside a 2.5 km walk rather than ${walkable}. Treat the figures below as the pessimistic end until the booking is confirmed.</p>
</div>
${unresolved.length ? `<div class="note warn"><div class="nh">Not yet on the map</div><p>${unresolved.map((p) => esc(p.name)).join(', ')}. Add a more specific address in <code>data/places.yml</code> and run <code>npm run geocode</code>.</p></div>` : ''}

<h2>Every place, by type</h2>
${lists}

<div class="note">
  <div class="nh">Adding more</div>
  <p>Append to <code>data/places.yml</code> with a name, category and address, then run <code>npm run geocode</code> and <code>npm run build</code>. Coordinates are cached in <code>data/geocache.json</code>, so nothing already resolved gets looked up twice.</p>
</div>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
  integrity="sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb" crossorigin="anonymous">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
  integrity="sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO" crossorigin="anonymous"></script>
<script>
(function () {
  var DATA = ${JSON.stringify(payload)};
  var el = document.getElementById('map');
  if (!window.L || !el) { if (el) el.innerHTML = '<p style="padding:20px">Map could not load. The full list is below.</p>'; return; }

  var map = L.map(el, { scrollWheelZoom: false }).setView(DATA.center, 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Both units: Mexico is metric, most of this group reads miles.
  L.control.scale({ position: 'bottomleft', metric: true, imperial: true, maxWidth: 150 }).addTo(map);

  var groups = {};
  Object.keys(DATA.categories).forEach(function (k) { groups[k] = L.layerGroup().addTo(map); });

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var PIN_PATH = ${JSON.stringify(PIN_PATH)};

  // Built with DOM APIs rather than innerHTML. Every value here is either a
  // constant or a colour from our own data, but this keeps pin construction
  // unambiguously safe. Same approach as 4pm-detroit's map-view client.
  function buildPinEl(colour, approx, big) {
    var el = document.createElement('div');
    el.className = 'mappin' + (big ? ' mappin--big' : '');

    var size = big ? 36 : 28;
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    var pin = document.createElementNS(SVG_NS, 'path');
    pin.setAttribute('d', PIN_PATH);
    // An approximate location is drawn hollow and dashed, so it cannot be
    // mistaken for a pin we can actually stand behind.
    pin.setAttribute('fill', approx ? 'none' : colour);
    pin.setAttribute('stroke', approx ? colour : 'var(--pin-stroke)');
    pin.setAttribute('stroke-width', approx ? '2.5' : '2');
    if (approx) pin.setAttribute('stroke-dasharray', '3 2');
    svg.appendChild(pin);

    el.appendChild(svg);
    return el;
  }

  var bounds = [];
  DATA.places.forEach(function (p) {
    var colour = (DATA.categories[p.c] || {}).color || '#666';
    var big = p.c === 'stay';
    var size = big ? 36 : 28;
    var marker = L.marker([p.lat, p.lon], {
      icon: L.divIcon({
        html: buildPinEl(colour, p.approx, big),
        className: '',
        iconSize: [size, size],
        // The silhouette's tip is at y=21 of 24, so the anchor is 21/24 down.
        iconAnchor: [size / 2, Math.round(size * (21 / 24))],
        popupAnchor: [0, -Math.round(size * (21 / 24)) + 4]
      }),
      alt: p.n,
      riseOnHover: true
    });

    var html = '<strong>' + p.n + '</strong>';
    if (p.hood) html += '<br><span style="opacity:.7">' + p.hood + '</span>';
    if (p.c !== 'stay') {
      html += '<br><span style="opacity:.7">' +
        (p.walk ? p.walk + ' min walk' : p.km + ' km') + ' from the house</span>';
    }
    if (p.note) html += '<br><br>' + p.note;
    if (p.booking) html += '<br><br><em>' + p.booking + '</em>';
    if (p.url) html += '<br><br><a href="' + p.url + '" target="_blank" rel="noopener">Open listing</a>';
    marker.bindPopup(html, { maxWidth: 260 });
    marker.bindTooltip(p.n, { direction: 'top', offset: [0, -4] });

    marker.addTo(groups[p.c] || map);
    bounds.push([p.lat, p.lon]);
  });

  // One kilometre ring around the house, which is roughly a 12 minute walk.
  var stay = DATA.places.filter(function (p) { return p.c === 'stay'; })[0];
  if (stay) {
    L.circle([stay.lat, stay.lon], {
      radius: 1000, color: DATA.categories.stay.color, weight: 1,
      dashArray: '5 6', fill: false, opacity: 0.7
    }).addTo(map);
  }

  // Fit to the house plus the main cluster. The far south and Polanco outliers
  // are excluded, because including them shrinks the cluster to an unreadable
  // blob. Radius comes from the build so it tracks wherever the house sits.
  var near = DATA.places.filter(function (p) { return p.km <= DATA.openViewKm; })
                        .map(function (p) { return [p.lat, p.lon]; });
  if (near.length > 1) map.fitBounds(near, { padding: [40, 40] });
  else if (bounds.length) map.fitBounds(bounds, { padding: [40, 40] });

  // Named below the map rather than in the attribution bar: with ten of them
  // the line spanned the full width and sat on top of the scale.
  var far = DATA.places.filter(function (p) { return p.km > DATA.openViewKm; });
  var farEl = document.getElementById('faraway');
  if (farEl) {
    if (far.length) {
      far.sort(function (a, b) { return a.km - b.km; });
      farEl.textContent =
        'Outside the opening view, zoom out to reach them: ' +
        far.map(function (p) { return p.n + ' (' + p.km + ' km)'; }).join(', ') + '.';
    } else {
      farEl.hidden = true;
    }
  }

  document.querySelectorAll('.legitem').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.dataset.cat;
      var on = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', on ? 'false' : 'true');
      if (on) map.removeLayer(groups[k]); else map.addLayer(groups[k]);
    });
  });

  map.on('click', function () { map.scrollWheelZoom.enable(); });
  map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
})();
</script>`;

  return shell({ title: 'Where everything is', current: 'map.html', body });
}

// ---------- markdown pages ----------

marked.setOptions({ gfm: true, breaks: false });

function buildDoc(mdFile, htmlFile, title) {
  const md = readFileSync(join(root, 'docs', mdFile), 'utf8');
  // Wrap tables so wide ones scroll instead of breaking the page.
  const html = linkify(
    marked.parse(md).replace(/<table>/g, '<div class="scroller"><table>').replace(/<\/table>/g, '</table></div>'),
    true
  );
  return shell({ title, current: htmlFile, body: `<div class="prose" style="padding-top:44px">${html}</div>` });
}

// ---------- write ----------

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'assets'), { recursive: true });

writeFileSync(join(out, 'assets', 'style.css'), CSS);
writeFileSync(join(out, '.nojekyll'), '');
writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

writeFileSync(join(out, 'index.html'), buildIndex());
writeFileSync(join(out, 'itinerary.html'), buildItinerary());
writeFileSync(join(out, 'costs.html'), buildCosts());
writeFileSync(join(out, 'stays.html'), buildStays());
writeFileSync(join(out, 'map.html'), buildMap());
writeFileSync(join(out, 'tasks.html'), buildTasks());
writeFileSync(join(out, 'dining.html'), buildDoc('dining.md', 'dining.html', 'The birthday'));
writeFileSync(join(out, 'nye.html'), buildDoc('nye.md', 'nye.html', "New Year's Eve"));
writeFileSync(join(out, 'decisions.html'), buildDoc('decisions.md', 'decisions.html', 'Decision log'));
writeFileSync(join(out, 'open-questions.html'), buildDoc('open-questions.md', 'open-questions.html', 'Open questions'));

const built = readdirSync(out).filter((f) => f.endsWith('.html'));
console.log(`built ${built.length} pages into site/: ${built.join(', ')}`);
