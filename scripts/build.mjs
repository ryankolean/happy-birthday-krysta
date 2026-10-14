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
  [/(?:docs\/)?dining\.md/g, 'dining.html', 'the birthday dinner options'],
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
  { file: 'dining.html', label: 'Birthday dinner' },
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
${tile('Per person, full trip', usd(budget.per_person.full_trip), 'Everything below, for the 6 doing both legs.', true)}
${tile('Flights', usd(flights.per_person_usd.full_trip), 'Four nonstop legs. ' + usd(flights.per_person_usd.city_only) + ' if you fly home from Mexico City.')}
${tile('Mexico City', usd(budget.cdmx.per_person), 'Five nights, including your share of the house.')}
${tile('Riviera Maya', usd(budget.riviera.per_person), 'Five nights, including your share of the residence.')}
</div>
<p class="caveat">All figures are per person. Excludes ${esc(budget.excludes.join(', '))}. Peso figures converted at ${esc(trip.exchange_rate.range)} MXN/USD.</p>

<div class="note warn">
  <div class="nh">Read this if you are flying home from Mexico City</div>
  <p>${nt(budget.flag_for_couple_b)}</p>
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
<p class="lede">All verified available on the operators' own booking engines. Nothing is booked. Mexico City is down to two options and priced at 7 sharing.</p>`;

  const fives = lodging.properties.find((p) => p.id === 'fives');
  const casakm = lodging.cdmx_front_runner;
  const alt = lodging.cdmx_alternative;

  b += `<div class="scroller"><table>
<caption>Lodging is booked whole and split evenly. Both columns shown so the arithmetic is visible.</caption>
<thead><tr><th>Property</th><th>Dates</th><th>Found</th><th class="n">Whole place</th><th class="n">Each</th></tr></thead><tbody>
<tr class="pick"><td><strong>${esc(casakm.name)}</strong><br><small>${esc(casakm.neighborhood)}, ${casakm.bedrooms}BR, ${casakm.baths} baths, private rooftop &middot; front runner</small></td>
<td>${esc(shortDate(casakm.checkin))} to ${esc(shortDate(casakm.checkout))}<br><small>${casakm.guests} guests</small></td>
<td><span class="tag ok">available</span><br><small>${casakm.rating} from ${casakm.reviews} reviews</small></td>
<td class="n"><small>${usd(casakm.total_usd)}</small></td>
<td class="n"><strong>${usd(casakm.per_person_usd)}</strong></td></tr>
<tr><td><strong>${esc(alt.short_name)}</strong><br><small>${esc(alt.neighborhood)}, ${alt.bedrooms}BR, ${alt.baths} baths, no roof &middot; the alternative</small></td>
<td>${esc(shortDate(alt.checkin))} to ${esc(shortDate(alt.checkout))}<br><small>${alt.guests} guests</small></td>
<td><span class="tag ok">available</span><br><small>${alt.rating} from ${alt.reviews} reviews</small></td>
<td class="n"><small>${usd(alt.total_usd)}</small></td>
<td class="n"><strong>${usd(alt.per_person_usd)}</strong></td></tr>
<tr><td><strong>${esc(fives.room_type)}</strong><br><small>${esc(fives.name)}, ${fives.size_sqft} sq ft, sleeps ${fives.max_occupancy}</small></td>
<td>${esc(shortDate(fives.checkin))} to ${esc(shortDate(fives.checkout))}<br><small>${fives.adults} adults</small></td>
<td><span class="tag ok">${esc(fives.inventory_seen)} left</span><br><small>${esc(fives.discount_live)} off, plus ${fives.loyalty_discount.percent}% loyalty</small></td>
<td class="n"><small>${usd(fives.rates_usd.room_only_flexible)}</small></td>
<td class="n"><strong>${usd(fives.rates_per_person_usd.room_only_flexible)}</strong></td></tr>
</tbody></table></div>`;

  b += `<p class="lede" style="margin-top:14px">Everywhere we might eat, drink or go is plotted on <a href="map.html">the map</a>, colour coded and with the walk from the house.</p>

<h3>Beds at ${esc(casakm.name)}, so nobody is surprised</h3>
<p>${casakm.bedrooms} bedrooms and ${casakm.baths} bathrooms: ${esc(casakm.bed_config.map((x) => x.bed).join(', ').toLowerCase())}, and every bedroom has its own full bathroom. ${nt(casakm.room_plan)} Checkout is ${esc(casakm.checkout_time)} and the rooftop is private.</p>
<p><a href="${esc(casakm.url)}">View ${esc(casakm.name)}</a> &middot; <a href="${esc(alt.url)}">View ${esc(alt.short_name)}</a> &middot; <a href="${esc(fives.url)}">View The Fives</a> &middot; <a href="stays.html">Compare them side by side</a></p>

<div class="note warn">
  <div class="nh">Two things worth knowing</div>
  <p><strong>The beach is cheaper than we had budgeted.</strong> ${nt(fives.tax_breakdown_seen.note)}</p>
  <p><strong>Both Mexico City options stop refunding on 22 December.</strong> ${esc(casakm.cancellation.actual)}. ${nt(casakm.cancellation.warning)}</p>
</div>`;

  // flights
  b += `<h2 id="flights"><span class="num">03</span>Flights</h2>
<p class="lede">Every leg is nonstop. Priced ${esc(iso(flights.priced))}, nothing booked. Delta where Delta flies it.</p>
<div class="scroller"><table>
<thead><tr><th>Date</th><th>Route</th><th>Flight</th><th>Times</th><th class="n">Per person</th></tr></thead><tbody>`;
  for (const f of flights.flights) {
    b += `<tr><td>${esc(shortDate(f.date))}</td><td>${esc(f.route)}<br><small>${esc(f.who)}</small></td><td>${f.number ? `<strong>${esc(f.number)}</strong>` : esc(f.carrier)}</td><td>${esc(f.depart)} to ${esc(f.arrive)}</td><td class="n">${usd(f.price_usd)}</td></tr>`;
  }
  b += `<tr class="sum"><td colspan="4">Your flights, doing both legs</td><td class="n">${usd(flights.per_person_usd.full_trip)}</td></tr>
<tr class="sum"><td colspan="4">Your flights, flying home from Mexico City</td><td class="n">${usd(flights.per_person_usd.city_only)}</td></tr>
</tbody></table></div>
<p>${nt(flights.afternoon_departure_problem)}</p>
<div class="note">
  <div class="nh">The one real risk on the outbound</div>
  <p>${nt(flights.flights[0].risk)}</p>
</div>`;

  // costs summary
  b += `<h2 id="costs"><span class="num">04</span>What it costs you</h2>
<p class="lede">Three blocks: flights, the city, the beach. Full line by line breakdown on the <a href="costs.html">costs page</a>.</p>
<div class="scroller"><table>
<thead><tr><th>Block</th><th class="n">Doing both legs</th><th class="n">City only</th></tr></thead><tbody>
<tr><td>Flights</td><td class="n">${usd(flights.per_person_usd.full_trip)}</td><td class="n">${usd(flights.per_person_usd.city_only)}</td></tr>
<tr><td>Mexico City</td><td class="n">${usd(budget.cdmx.per_person)}</td><td class="n">${usd(budget.cdmx.per_person)}</td></tr>
<tr><td>Riviera Maya</td><td class="n">${usd(budget.riviera.per_person)}</td><td class="n">n/a</td></tr>
<tr class="sum"><td>Per person</td><td class="n">${usd(budget.per_person.full_trip)}</td><td class="n">${usd(budget.per_person.city_only)}</td></tr>
</tbody></table></div>

<div class="note">
  <div class="nh">The meal plan at the beach is now a close call</div>
  <p>${nt(budget.riviera.alternative_all_inclusive.note)}</p>
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
  const fives = lodging.properties.find((p) => p.id === 'fives');

  let b = `<header class="masthead">
  <p class="eyebrow">Line by line, per person</p>
  <h1>What it costs you</h1>
  <div class="dateline">
    <div><b>Doing both legs</b>${esc(usd(budget.per_person.full_trip))}</div>
    <div><b>City only</b>${esc(usd(budget.per_person.city_only))}</div>
    <div><b>Rate used</b>${esc(budget.rate_mxn_per_usd)} MXN/USD</div>
  </div>
</header>

<p class="lede">Every figure on this page is what one person pays. Lodging also shows the whole-place price, because a house and a resort residence are booked whole and then split evenly.</p>

<h2>Flights</h2>
<div class="scroller"><table>
<thead><tr><th>Who</th><th>Legs</th><th>Status</th><th class="n">Each</th></tr></thead><tbody>
<tr><td><strong>Doing both legs</strong></td><td>Detroit to Mexico City, Mexico City to Cancun, Cancun to Detroit</td><td><span class="tag ${esc(budget.flights.status)}">${esc(budget.flights.status)}</span></td><td class="n">${usd(budget.flights.per_person_full_trip)}</td></tr>
<tr><td><strong>City only</strong></td><td>Detroit to Mexico City, Mexico City to Detroit</td><td><span class="tag ${esc(budget.flights.status)}">${esc(budget.flights.status)}</span></td><td class="n">${usd(budget.flights.per_person_city_only)}</td></tr>
</tbody></table></div>
<p>${nt(budget.flights.note)} Flight numbers, times and the alternatives considered are in <a href="index.html#flights">the flights table on the front page</a>.</p>

<h2>Mexico City</h2>
<p class="lede">${nt(budget.cdmx.lodging_note)}</p>
<div class="scroller"><table>
<caption>Lodging splits ${budget.cdmx.lodging_travelers} ways. Every other line is an ${budget.cdmx.travelers} person trip.</caption>
<thead><tr><th>Item</th><th>Status</th><th class="n">Each</th></tr></thead>
<tbody>${costRows(budget.cdmx.lines)}
<tr class="sum"><td colspan="2">Mexico City, per person</td><td class="n">${usd(budget.cdmx.per_person)}</td></tr>
</tbody></table></div>

<div class="note">
  <div class="nh">If we take ${esc(budget.cdmx.alternative_lodging.item)} instead</div>
  <p>${nt(budget.cdmx.alternative_lodging.note)}</p>
  <p>Both options are compared side by side on <a href="stays.html">the accommodations page</a>.</p>
</div>

<h2>Riviera Maya</h2>
<p class="lede">${esc(fives.name)}, one ${esc(fives.room_type)}: ${fives.size_sqft} sq ft, sleeps up to ${fives.max_occupancy}. Quoted live, taxes included. A ${esc(fives.discount_live)} discount is running and a further ${fives.loyalty_discount.percent}% comes off through their loyalty programme.</p>
<div class="scroller"><table>
<caption>The residence is booked whole and split ${r.travelers} ways. Per person in bold.</caption>
<thead><tr><th>Rate option</th><th class="n">Non-refundable</th><th class="n">Each</th><th class="n">Flexible</th><th class="n">Each</th></tr></thead><tbody>
<tr class="pick"><td><strong>Room only</strong> <small>then eat in Puerto Morelos</small></td>
<td class="n"><small>${usd(fives.rates_usd.room_only_nonrefundable)}</small></td><td class="n"><strong>${usd(fives.rates_per_person_usd.room_only_nonrefundable)}</strong></td>
<td class="n"><small>${usd(fives.rates_usd.room_only_flexible)}</small></td><td class="n"><strong>${usd(fives.rates_per_person_usd.room_only_flexible)}</strong></td></tr>
<tr><td>All inclusive instead</td>
<td class="n"><small>${usd(fives.rates_usd.all_inclusive_nonrefundable)}</small></td><td class="n"><strong>${usd(fives.rates_per_person_usd.all_inclusive_nonrefundable)}</strong></td>
<td class="n"><small>${usd(fives.rates_usd.all_inclusive_flexible)}</small></td><td class="n"><strong>${usd(fives.rates_per_person_usd.all_inclusive_flexible)}</strong></td></tr>
</tbody></table></div>
<p><strong>Flexible terms:</strong> ${esc(fives.flexible_terms)}.</p>

<div class="scroller"><table>
<caption>Recommended build: ${esc(r.recommended_build)}.</caption>
<thead><tr><th>Item</th><th>Status</th><th class="n">Each</th></tr></thead>
<tbody>${costRows(r.lines)}
<tr class="sum"><td colspan="2">Riviera Maya, per person</td><td class="n">${usd(r.per_person)}</td></tr>
</tbody></table></div>

<div class="note">
  <div class="nh">Room only or all inclusive</div>
  <p>${nt(r.alternative_all_inclusive.note)}</p>
</div>

<h3>Optional at the beach</h3>
<div class="scroller"><table><thead><tr><th>Item</th><th>Status</th><th class="n">Each</th></tr></thead><tbody>
${r.optional.map((o) => `<tr><td><strong>${esc(o.item)}</strong>${o.note ? `<br><small>${nt(o.note)}</small>` : ''}</td><td><span class="tag ${esc(o.status)}">${esc(o.status)}</span></td><td class="n">${usd(o.per_person)}</td></tr>`).join('')}
</tbody></table></div>

<h2>Splitting it</h2>
<ul>${budget.split_mechanism.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>

<h2>What is already committed if we cancel</h2>
<div class="scroller"><table><thead><tr><th>What</th><th>Terms</th></tr></thead><tbody>
${budget.non_refundable_exposure.map((x) => `<tr><td><strong>${esc(x.what)}</strong></td><td>${esc(x.terms)}</td></tr>`).join('')}
</tbody></table></div>

<div class="note warn">
  <div class="nh">For the two leaving after Mexico City</div>
  <p>${nt(budget.flag_for_couple_b)}</p>
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
  const oasis = lodging.properties.find((p) => p.id === 'oasis');
  const fives = lodging.properties.find((p) => p.id === 'fives');
  const casakm = lodging.cdmx_front_runner;
  const alt = lodging.cdmx_alternative;
  const r = budget.riviera;

  const bullets = (arr) => `<ul>${arr.map((x) => `<li>${nt(x)}</li>`).join('')}</ul>`;

  let b = `<header class="masthead">
  <p class="eyebrow">Front runner picked ${esc(iso(casakm.verified))}, nothing booked yet</p>
  <h1>Where we are staying</h1>
  <div class="dateline">
    <div><b>Mexico City</b>${esc(shortDate(casakm.checkin))} to ${esc(shortDate(casakm.checkout))}, ${casakm.nights} nights</div>
    <div><b>Riviera Maya</b>${esc(shortDate(fives.checkin))} to ${esc(shortDate(fives.checkout))}, ${fives.nights} nights</div>
  </div>
</header>

<div class="scroller"><table>
<caption>Booked whole and split evenly. Mexico City is priced at ${casakm.guests} sharing. Per person in bold.</caption>
<thead><tr><th>Where</th><th>Dates</th><th>Who</th><th class="n">Whole place</th><th class="n">Each</th></tr></thead><tbody>
<tr class="pick"><td><strong>${esc(casakm.name)}</strong><br><small>${esc(casakm.neighborhood)}, Mexico City &middot; front runner</small></td>
<td>${esc(shortDate(casakm.checkin))} to ${esc(shortDate(casakm.checkout))}<br><small>${casakm.nights} nights</small></td>
<td>${casakm.guests} guests</td>
<td class="n"><small>${usd(casakm.total_usd)}</small></td><td class="n"><strong>${usd(casakm.per_person_usd)}</strong></td></tr>
<tr><td><strong>${esc(fives.name)}</strong><br><small>${esc(fives.room_type)}</small></td>
<td>${esc(shortDate(fives.checkin))} to ${esc(shortDate(fives.checkout))}<br><small>${fives.nights} nights</small></td>
<td>${fives.adults} adults</td>
<td class="n"><small>${usd(fives.rates_usd.room_only_flexible)}</small></td><td class="n"><strong>${usd(fives.rates_per_person_usd.room_only_flexible)}</strong></td></tr>
</tbody></table></div>

<h2><span class="num">01</span>${esc(casakm.name)}<span class="tag ok">front runner</span></h2>
<p class="lede">${esc(casakm.subtitle)}. ${esc(casakm.neighborhood)}, Mexico City. <strong>${usd(casakm.per_person_usd)} each</strong>, all in.</p>

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
<tr><td><a href="dining.html">Em</a>, Av. Amsterdam 76</td><td class="n">${casakm.distance_km.em} km</td></tr>
<tr><td><a href="dining.html">Pujol</a>, Polanco</td><td class="n">${casakm.distance_km.pujol} km</td></tr>
</tbody></table></div>
<p>Del Valle Norte reads as far out, but it is closer to Em and Parque Mexico than the Oasis is. Every venue is plotted on <a href="map.html">the map</a>.</p>

<h3>Why this one</h3>
${bullets(casakm.why_chosen)}

<div class="note warn">
  <div class="nh">Cancellation is the one weak spot</div>
  <p><strong>${esc(casakm.cancellation.actual)}</strong></p>
  <p>${nt(casakm.cancellation.warning)}</p>
</div>

<div class="note">
  <div class="nh">Worth knowing before we book</div>
  ${bullets(casakm.flags)}
</div>

<h2><span class="num">02</span>Mexico City, head to head</h2>
<p class="lede">Two options left on the table, both verified on their own listing pages at ${casakm.guests} guests for the same nights. The search grid prices listings that are not actually bookable, so nothing here comes from it.</p>

<div class="scroller"><table>
<thead><tr><th>&nbsp;</th><th>${esc(casakm.name)}</th><th>${esc(alt.short_name)}</th></tr></thead><tbody>
<tr><th>Each</th><td class="pick"><strong>${usd(casakm.per_person_usd)}</strong></td><td><strong>${usd(alt.per_person_usd)}</strong></td></tr>
<tr><th>Whole place</th><td>${usd(casakm.total_usd)}</td><td>${usd(alt.total_usd)}</td></tr>
<tr><th>Bedrooms</th><td>${casakm.bedrooms}</td><td>${alt.bedrooms}</td></tr>
<tr><th>Bathrooms</th><td>${casakm.baths}, one per bedroom</td><td>${alt.baths}, shared</td></tr>
<tr><th>Rated</th><td>${casakm.rating} from ${casakm.reviews}</td><td>${alt.rating} from ${alt.reviews}</td></tr>
<tr><th>Roof</th><td>Private rooftop with a grill</td><td>None</td></tr>
<tr><th>To Roma Norte</th><td>${casakm.distance_km.roma_norte_core.toFixed(1)} km</td><td>${alt.distance_km.roma_norte_core.toFixed(1)} km</td></tr>
<tr><th>To <a href="dining.html">Em</a></th><td>${casakm.distance_km.em.toFixed(1)} km</td><td>${alt.distance_km.em.toFixed(1)} km</td></tr>
<tr><th>Neighbourhood</th><td>${esc(casakm.neighborhood)}</td><td>${esc(alt.neighborhood)}</td></tr>
</tbody></table></div>

<p>${esc(alt.short_name)} costs <strong>${usd(alt.per_person_usd - casakm.per_person_usd)} more each</strong>, or ${usd(alt.total_usd - casakm.total_usd)} across the group. What that buys is the review record and the walk to dinner. What it gives up is a bathroom each, the rooftop, and keeping all four bedrooms behind one door.</p>

<h3>${esc(alt.name)}</h3>
<p class="lede">${esc(alt.neighborhood)}, Mexico City. <strong>${usd(alt.per_person_usd)} each</strong>, all in.</p>

<p><a class="bigline" href="${esc(alt.url)}">Open the Airbnb listing</a></p>

<div class="scroller"><table><tbody>
<tr><th>Check in</th><td>${esc(longDate(alt.checkin))}, from ${esc(alt.checkin_time)}</td></tr>
<tr><th>Check out</th><td>${esc(longDate(alt.checkout))}, before ${esc(alt.checkout_time)}</td></tr>
<tr><th>Guests</th><td>${alt.guests} of us, and it sleeps up to ${alt.capacity}</td></tr>
<tr><th>Layout</th><td>${alt.bedrooms} bedrooms, ${alt.beds} beds, ${alt.baths} bathrooms</td></tr>
<tr><th>Price</th><td><strong>${usd(alt.total_usd)}</strong> all in, <strong>${usd(alt.per_person_usd)} each</strong></td></tr>
<tr><th>Rated</th><td>${alt.rating} from ${alt.reviews} reviews</td></tr>
<tr><th>Outdoor</th><td>${esc(alt.roof)}</td></tr>
</tbody></table></div>

<h4>Guest scores</h4>
<div class="scroller"><table>
<thead><tr><th>Cleanliness</th><th>Accuracy</th><th>Check in</th><th>Communication</th><th>Location</th><th>Value</th></tr></thead>
<tbody><tr>
<td class="n">${alt.subscores.cleanliness}</td><td class="n">${alt.subscores.accuracy}</td><td class="n">${alt.subscores.checkin}</td>
<td class="n">${alt.subscores.communication}</td><td class="n">${alt.subscores.location}</td><td class="n">${alt.subscores.value}</td>
</tr></tbody></table></div>

<h4>Who sleeps where</h4>
<div class="scroller"><table><thead><tr><th>Bedroom</th><th>Bed</th><th>What else</th></tr></thead><tbody>
${alt.bed_config.map((x) => `<tr><td>${esc(x.bedroom)}</td><td><strong>${esc(x.bed)}</strong></td><td><small>${esc(x.extras)}</small></td></tr>`).join('')}
</tbody></table></div>
<p>${nt(alt.room_plan)}</p>

<h4>Why consider it</h4>
${bullets(alt.why_consider)}

<div class="note warn">
  <div class="nh">Worth knowing before we book</div>
  ${bullets(alt.flags)}
</div>

<div class="note">
  <div class="nh">Verdict</div>
  <p>${nt(alt.verdict)}</p>
</div>

<h2><span class="num">03</span>Why we are leaving ${esc(oasis.name)}</h2>
<p class="lede">It held the Mexico City slot until ${esc(iso(oasis.displaced_on))}. Its own reviews are what moved us off it.</p>

<p><a class="bigline" href="${esc(oasis.url)}">Open the old listing</a></p>

${bullets(oasis.displaced_because)}

<div class="note">
  <div class="nh">What it did have</div>
  <p>Six bedrooms and ${oasis.baths} bathrooms, a private rooftop, no quiet hours, and ${oasis.rating} from ${oasis.reviews} reviews. The bathroom count and the rooftop are the two things ${esc(casakm.name)} had to match, and it does.</p>
</div>

<h2><span class="num">04</span>${esc(fives.name)}</h2>
<p class="lede">One ${esc(fives.room_type)}, ${fives.size_sqft} sq ft, sleeps up to ${fives.max_occupancy}. Puerto Morelos, between Cancun and Playa del Carmen.</p>

<p><a class="bigline" href="${esc(fives.url)}">Open the resort site</a></p>

<div class="scroller"><table><tbody>
<tr><th>Check in</th><td>${esc(longDate(fives.checkin))}, from ${esc(fives.checkin_time)}</td></tr>
<tr><th>Check out</th><td>${esc(longDate(fives.checkout))}, before ${esc(fives.checkout_time)}</td></tr>
<tr><th>Nights</th><td>${fives.nights}</td></tr>
<tr><th>Guests</th><td>${fives.adults} adults</td></tr>
<tr><th>Room</th><td>${esc(fives.room_type)}, ${fives.size_sqft} sq ft</td></tr>
<tr><th>Availability seen</th><td>${esc(fives.inventory_seen)}, with a ${esc(fives.discount_live)} discount live</td></tr>
<tr><th>Reservations</th><td>${esc(fives.contact.email)}<br>US and Canada ${esc(fives.contact.us_can)}<br>Direct ${esc(fives.contact.direct)}</td></tr>
</tbody></table></div>

<h3>The four rate combinations</h3>
<div class="scroller"><table>
<caption>All taxes included. Split ${fives.adults} ways, per person in bold.</caption>
<thead><tr><th>Option</th><th class="n">Non-refundable</th><th class="n">Each</th><th class="n">Flexible</th><th class="n">Each</th></tr></thead><tbody>
<tr class="pick"><td><strong>Room only</strong> <small>then eat in the village</small></td>
<td class="n"><small>${usd(fives.rates_usd.room_only_nonrefundable)}</small></td><td class="n"><strong>${usd(fives.rates_per_person_usd.room_only_nonrefundable)}</strong></td>
<td class="n"><small>${usd(fives.rates_usd.room_only_flexible)}</small></td><td class="n"><strong>${usd(fives.rates_per_person_usd.room_only_flexible)}</strong></td></tr>
<tr><td>All inclusive</td>
<td class="n"><small>${usd(fives.rates_usd.all_inclusive_nonrefundable)}</small></td><td class="n"><strong>${usd(fives.rates_per_person_usd.all_inclusive_nonrefundable)}</strong></td>
<td class="n"><small>${usd(fives.rates_usd.all_inclusive_flexible)}</small></td><td class="n"><strong>${usd(fives.rates_per_person_usd.all_inclusive_flexible)}</strong></td></tr>
</tbody></table></div>
<p><strong>Recommended: ${esc(fives.recommended_rate)}.</strong> ${esc(fives.flexible_terms)}. A further ${fives.loyalty_discount.percent}% (${usd(fives.loyalty_discount.amount_usd)}) comes off through their loyalty programme, which ${nt(fives.loyalty_discount.note)}</p>

<div class="note">
  <div class="nh">Room only or all inclusive</div>
  <p>${nt(r.alternative_all_inclusive.note)}</p>
</div>

<h3>Why 3 January and not earlier</h3>
${bullets(fives.why_jan_3)}

<h3>Confirmed, so nobody has to ask again</h3>
${bullets(fives.no_traps_confirmed)}

<div class="note warn">
  <div class="nh">Still to confirm before booking</div>
  ${bullets(fives.open)}
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
writeFileSync(join(out, 'dining.html'), buildDoc('dining.md', 'dining.html', 'Birthday dinner options'));
writeFileSync(join(out, 'nye.html'), buildDoc('nye.md', 'nye.html', "New Year's Eve"));
writeFileSync(join(out, 'decisions.html'), buildDoc('decisions.md', 'decisions.html', 'Decision log'));
writeFileSync(join(out, 'open-questions.html'), buildDoc('open-questions.md', 'open-questions.html', 'Open questions'));

const built = readdirSync(out).filter((f) => f.endsWith('.html'));
console.log(`built ${built.length} pages into site/: ${built.join(', ')}`);
