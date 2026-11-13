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
const flightTracker = load('flight-tracker.yml');
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

// An artist roster entry becomes a linked handle plus what they draw. The
// handle is the whole link text because that is what you search in Instagram
// and what you would type into a DM.
const igUrl = (h) => 'https://www.instagram.com/' + encodeURIComponent(String(h).replace(/^@/, '')) + '/';
const artistLine = (a) =>
  `<a href="${esc(igUrl(a.handle))}">@${esc(String(a.handle).replace(/^@/, ''))}</a>` +
  (a.name ? ` ${esc(a.name)}` : '') +
  (a.does ? `. ${nt(a.does)}` : '');
const artistList = (list) =>
  !list || !list.length ? '' : `<ul class="artists">${list.map((a) => `<li>${artistLine(a)}</li>`).join('')}</ul>`;

const PAGES = [
  { file: 'index.html', label: 'The trip' },
  { file: 'itinerary.html', label: 'Itinerary' },
  { file: 'flights.html', label: 'Flights' },
  { file: 'stays.html', label: 'Accommodations' },
  { file: 'map.html', label: 'Map' },
  { file: 'tacos.html', label: 'Taco walk' },
  { file: 'results.html', label: 'Taco votes' },
  { file: 'riviera-map.html', label: 'Puerto Morelos map' },
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
  <p>Built from <code>data/</code> in <a href="https://github.com/ryankolean/happy-birthday-krysta">ryankolean/happy-birthday-krysta</a>. Lodging and flights last verified ${esc(iso(trip.verified))}. Casa KM is booked and partly paid, and all three of Ryan and Krysta's flights are ticketed. Everything else is still open.</p>
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
  /* The guide's own red. Fixed, because it is a badge colour with white
     stars on it in both themes; the text version gets its own token so it
     can be lifted off a dark background without wrecking that contrast. */
  --michelin: #C9372C;
  --michelin-ink: #C9372C;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --paper: #0C1413; --raise: #14201E; --ink: #EDF0EC; --body: #C5D0CC;
    --muted: #8FA09B; --teal: #5FC2B8; --teal-soft: #15302D;
    --marigold: #F0A23E; --marigold-soft: #33240E; --sea: #6FB8D2;
    --rule: #1E2A28; --rule-firm: #2C3B38;
    --pin-stroke: #FCFCFA;
    --michelin-ink: #F08878;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: #0C1413; --raise: #14201E; --ink: #EDF0EC; --body: #C5D0CC;
  --muted: #8FA09B; --teal: #5FC2B8; --teal-soft: #15302D;
  --marigold: #F0A23E; --marigold-soft: #33240E; --sea: #6FB8D2;
  --rule: #1E2A28; --rule-firm: #2C3B38;
  --pin-stroke: #FCFCFA;
  --michelin-ink: #F08878;
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

/* Artist rosters: one linked handle per line, in the fallback table and in a
   map popup. The handle is the link text, so it stays scannable at popup size. */
ul.artists { margin: 8px 0 0; padding-left: 0; list-style: none; }
ul.artists li { margin-bottom: 6px; padding-left: 10px; border-left: 2px solid var(--rule); }
ul.artists li:last-child { margin-bottom: 0; }
ul.artists a { font-family: var(--f-mono); font-size: 0.92em; }

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
.mappin { position: relative; line-height: 0; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45)); }
.mappin svg { display: block; }
.leaflet-marker-icon:focus-visible { outline: 2px solid var(--marigold); outline-offset: 2px; }

/* Badges hang off the shoulders of a pin rather than sitting inside it. The
   head is about nine units of twenty four across and the category glyph has
   that space. Right shoulder is what the Michelin guide awarded, left shoulder
   is what the kitchen is known for. */
.pinbadges { position: absolute; top: -3px; display: flex; gap: 2px; pointer-events: none; }
.pinbadges--mich { right: -6px; }
.pinbadges--prot { left: -6px; }
.pinbadge {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px; line-height: 0;
  /* Same ring the pin silhouette carries, so a badge separates from the pin
     under it in both themes rather than only on a pale background. */
  box-shadow: 0 0 0 1.5px var(--pin-stroke), 0 1px 2px rgba(0, 0, 0, 0.3);
}
.pinbadge--mich { background: var(--michelin); color: #FCFCFA; padding: 1.5px 2.5px; gap: 1px; }
.pinbadge--star { background: var(--marigold); color: var(--paper); padding: 2.5px; }
.pinbadge--prot { background: var(--paper); color: var(--ink); width: 16px; height: 16px; }

/* The same badges inline, in a popup or a table cell, where there is room for
   the words as well. The class is ptag, not tag, because tag is already the
   price status pill on the costs and tasks pages and a second rule on that
   name reaches every one of them. */
.ptags { display: flex; flex-wrap: wrap; gap: 5px; margin: 7px 0 0; }
.ptag {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--f-mono); font-size: 10px; font-weight: 500;
  letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.5;
  color: var(--body); background: var(--raise);
  border: 1px solid var(--rule-firm); border-radius: 2px; padding: 2px 6px;
}
.ptag .pinbadge { box-shadow: none; }

/* Where to look a place up. One row of labelled links, in a popup and in the
   table, so a pin always offers somewhere to go rather than a dead end. */
.plinks { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0 0; }
.plink {
  font-family: var(--f-mono); font-size: 10.5px; font-weight: 500;
  letter-spacing: 0.03em; line-height: 1.5;
  color: var(--teal); text-decoration: none;
  border: 1px solid var(--rule-firm); border-radius: 2px; padding: 2px 7px;
  white-space: nowrap;
}
.plink:hover { border-color: var(--teal); }
.ptag .pinbadge--prot { box-shadow: inset 0 0 0 1px var(--rule-firm); }
.ptag--mich { color: var(--michelin-ink); border-color: var(--michelin-ink); background: transparent; }
.legend-row--key { gap: 13px; margin-block: 0 16px; align-items: center; }
.keyitem {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--f-body); font-size: 12px; color: var(--muted);
}
.keyitem .pinbadge { box-shadow: none; }
.keyitem .pinbadge--prot { box-shadow: inset 0 0 0 1px var(--rule-firm); }

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
.legitem--solo { border-color: var(--teal); box-shadow: inset 0 0 0 1px var(--teal); }
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

/* taco walk */
.tw-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-block: 0 16px; }
.tw-status { font-size: 13px; color: var(--teal); }
.tw-btn {
  font-family: var(--f-body); font-size: 13px; font-weight: 500; line-height: 1.2;
  color: var(--ink); background: var(--raise);
  border: 1px solid var(--rule-firm); border-radius: 2px; padding: 8px 12px; cursor: pointer;
}
.tw-btn:hover:not(:disabled) { border-color: var(--teal); }
.tw-btn:focus-visible { outline: 2px solid var(--marigold); outline-offset: 2px; }
.tw-btn:disabled { opacity: 0.35; cursor: default; }
.tw-btn--main { color: var(--teal); background: var(--teal-soft); border-color: var(--teal); font-weight: 600; }
.tw-btn--sm { min-width: 40px; min-height: 36px; padding: 6px 10px; }
.tw-totals { display: flex; flex-wrap: wrap; gap: 6px 22px; font-family: var(--f-mono); font-size: 14px; color: var(--ink); margin-block: 0 4px; }
.tw-totals b { display: block; font-family: var(--f-body); font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.tw-map { margin-block: 4px 8px; }
.tw-pop { margin: 8px 0 0; }
.tw-num {
  position: absolute; left: 50%; bottom: -9px; transform: translateX(-50%);
  min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px;
  background: var(--ink); color: var(--paper);
  font-family: var(--f-mono); font-size: 10.5px; font-weight: 600; line-height: 17px; text-align: center;
  box-shadow: 0 0 0 1.5px var(--paper); pointer-events: none;
}
.tw-num--key, .tw-num--list { position: static; transform: none; display: inline-block; }
.tw-num--list { flex: none; min-width: 26px; height: 26px; line-height: 26px; font-size: 13px; margin-top: 2px; }
.mappin.tw-off { opacity: 0.5; }
.tw-faded { opacity: 0.5; display: inline-flex; }
.tw-stops, .tw-sugg { list-style: none; padding: 0; margin: 0; }
.tw-leg { font-family: var(--f-mono); font-size: 12px; color: var(--muted); padding: 6px 0 6px 12px; margin-left: 12px; border-left: 2px dashed var(--rule-firm); }
.tw-card, .tw-sg { background: var(--raise); border: 1px solid var(--rule-firm); border-radius: 2px; padding: 12px 14px; font-size: 14px; }
.tw-sg { margin-bottom: 8px; }
.tw-top { display: flex; gap: 10px; align-items: flex-start; }
.tw-name { flex: 1; min-width: 0; }
.tw-name strong { color: var(--ink); font-size: 15px; }
.tw-meta { font-size: 12.5px; color: var(--muted); }
.tw-ctl { display: flex; gap: 4px; flex: none; }
.tw-order, .tw-bk { margin: 8px 0 0; font-size: 13.5px; }
.tw-order b { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-right: 4px; }
.tw-hours { display: flex; flex-wrap: wrap; gap: 4px 6px; margin: 8px 0 0; }
.tw-h { font-family: var(--f-mono); font-size: 11px; border: 1px solid var(--rule-firm); border-radius: 2px; padding: 1px 6px; }
.tw-h--ok { color: var(--teal); border-color: var(--teal); }
.tw-h--bad { color: var(--michelin-ink); border-color: var(--michelin-ink); }
.tw-h--unk { color: var(--marigold); border-color: var(--marigold); }
.tw-src { flex-basis: 100%; font-size: 11.5px; color: var(--muted); }
.tw-card details { margin: 8px 0 0; font-size: 13.5px; }
.tw-card summary { cursor: pointer; color: var(--teal); }
.tw-card details p { margin: 6px 0 0; }
.tw-votes { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin: 8px 0 0; }
.tw-v { font-family: var(--f-mono); font-size: 11px; font-weight: 600; border-radius: 2px; padding: 1px 6px; }
.tw-v--yes { color: var(--paper); background: var(--teal); }
.tw-v--no { color: var(--michelin-ink); border: 1px solid var(--michelin-ink); }
.tw-vn { font-size: 12px; color: var(--muted); }

/* swipe deck, themed onto the site's tokens */
swipe-deck {
  --sd-yes: var(--teal); --sd-no: var(--michelin-ink); --sd-card-bg: var(--raise);
  --sd-card-border: var(--rule-firm); --sd-ink: var(--ink); --sd-muted: var(--muted);
  --sd-radius: 4px; --sd-height: min(460px, 58vh);
  margin-block: 8px 28px;
}
swipe-deck .sd-btn { font-family: var(--f-body); }
.sw-card { margin: -18px -18px 0; }
.sw-band {
  position: relative; height: 132px; display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--band) 22%, var(--raise));
  border-bottom: 1px solid color-mix(in srgb, var(--band) 45%, var(--raise));
}
.sw-band .legpin { filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25)); }
.sw-badges { position: absolute; left: 14px; bottom: 12px; display: flex; gap: 6px; }
.sw-badges .pinbadge { transform: scale(1.5); transform-origin: left bottom; margin-right: 8px; }
.sw-mich {
  position: absolute; right: 12px; top: 12px; display: inline-flex; align-items: center; gap: 2px;
  font-family: var(--f-mono); font-size: 10.5px; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--paper); background: var(--michelin-ink); border-radius: 2px; padding: 4px 7px;
}
.sw-card h3, .sw-det h4 { text-transform: none; letter-spacing: normal; font-family: var(--f-display); font-weight: 400; font-size: 30px; line-height: 1.1; color: var(--ink); margin: 16px 18px 4px; }
.sw-meta { font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--teal); margin: 0 18px; }
.sw-known { font-size: 16px; line-height: 1.45; margin: 12px 18px 0; color: var(--ink); }
.sw-get { font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 14px 18px 6px; }
.sw-order { list-style: none; padding: 0; margin: 0 18px; display: flex; flex-wrap: wrap; gap: 6px; }
.sw-order li { font-size: 13.5px; line-height: 1.2; border: 1px solid var(--rule-firm); border-radius: 999px; padding: 6px 11px; background: var(--paper); }
.sw-det h4 { margin: 0 0 4px; font-size: 26px; }
.sw-det .sw-known, .sw-det .sw-order { margin-inline: 0; }
.sw-det h5 { font-family: var(--f-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--teal); margin: 18px 0 6px; }
.sw-det p { font-size: 14px; line-height: 1.55; margin: 6px 0 0; }
.sw-week { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 2px 12px; font-size: 13px; }
.sw-week span { display: inline-block; width: 36px; color: var(--muted); }
.sw-week .is-day { font-weight: 700; }
.sw-src { font-size: 12px !important; color: var(--muted); }
.sw-det .ptags, .sw-det .plinks { margin-top: 16px; }
.sw-msg { max-width: 420px; margin-inline: auto; }
.sw-picks { max-width: 560px; margin: 8px auto 28px; }
.sw-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 24px; }
.sw-cols h3 { margin: 12px 0 6px; }
.sw-cols h3 .n { font-family: var(--f-mono); font-weight: 400; color: var(--muted); }
.sw-pl { list-style: none; padding: 0; margin: 0; }
.sw-pl li + li { border-top: 1px solid var(--rule); }
.sw-pl button {
  all: unset; box-sizing: border-box; cursor: pointer; width: 100%; display: flex; justify-content: space-between;
  align-items: baseline; gap: 12px; padding: 9px 2px; font-size: 15px; color: var(--ink);
}
.sw-pl button span { font-family: var(--f-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); white-space: nowrap; }
.sw-pl button:hover span, .sw-pl button:focus-visible span { color: var(--teal); }
.sw-pl button:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
.sw-pl .none { padding: 9px 2px; color: var(--muted); font-size: 14px; }
.rs-list { list-style: none; padding: 0; margin: 0; counter-reset: rs; }
.rs-row { border-top: 1px solid var(--rule); padding: 14px 0; }
.rs-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.rs-head strong { font-family: var(--f-display); font-weight: 400; font-size: 22px; line-height: 1.15; }
.rs-head strong::before { counter-increment: rs; content: counter(rs) ". "; color: var(--muted); }
.rs-score { font-family: var(--f-mono); font-size: 12px; white-space: nowrap; color: var(--muted); }
.rs-meta { font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--teal); margin: 2px 0 8px; }
.rs-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--rule); }
.rs-bar .y { background: var(--teal); }
.rs-bar .n { background: var(--michelin-ink); }
.rs-who { margin: 8px 0 0; font-size: 14px; line-height: 1.5; }
.rs-who b { font-family: var(--f-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-right: 6px; }
.rs-who .y { color: var(--teal); }
.rs-who .n { color: var(--michelin-ink); }
.rs-zero strong { color: var(--muted); }
@media (max-width: 480px) {
  .tw-top { flex-wrap: wrap; }
  .tw-ctl { flex-basis: 100%; justify-content: flex-end; }
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
<td><span class="tag estimate">not booked</span><br><small>quoted ${esc(iso(jade.repriced))}</small></td>
<td class="n"><small>${usd(jadeRec.direct_usd ?? jadeRec.flexible_usd)}</small></td>
<td class="n"><strong>${usd(jadeRec.direct_per_person_usd ?? jadeRec.flexible_per_person_usd)}</strong></td></tr>
</tbody></table></div>`;

  b += `<p class="lede" style="margin-top:14px">Everywhere we might eat, drink or go is plotted on <a href="map.html">the map</a>, colour coded and with the walk from the house.</p>

<h3>Beds at ${esc(casakm.name)}, so nobody is surprised</h3>
<p>${casakm.bedrooms} bedrooms and ${casakm.baths} bathrooms: ${esc(casakm.bed_config.map((x) => x.bed).join(', ').toLowerCase())}, and every bedroom has its own full bathroom. ${nt(casakm.room_plan)} Checkout is ${esc(casakm.checkout_time)} and the rooftop is private.</p>
<p><a href="${esc(casakm.url)}">View ${esc(casakm.name)}</a> &middot; <a href="${esc(jade.url)}">View Dreams Jade</a> &middot; <a href="stays.html">Full booking details</a></p>

<div class="note warn">
  <div class="nh">Two things worth knowing</div>
  <p><strong>The beach build is settled: four Ocean View Kings.</strong> ${nt(jade.layout_problem)}</p>
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
  <div class="nh">Krysta and Ryan are booked on all three legs</div>
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
<thead><tr><th>Block</th><th class="n">Doing both legs</th><th class="n">City only<br><small>own room</small></th></tr></thead><tbody>
<tr><td>Mexico City</td><td class="n">${usd(budget.cdmx.per_person)}</td><td class="n">${usd(budget.cdmx.per_person_own_lodging)}</td></tr>
<tr><td>Riviera Maya</td><td class="n">${usd(budget.riviera.per_person)}</td><td class="n">n/a</td></tr>
<tr class="sum"><td>What you owe Ryan</td><td class="n">${usd(budget.per_person.both_legs)}</td><td class="n">${usd(budget.per_person.city_only)}</td></tr>
<tr><td>Flights</td><td class="n">Your own</td><td class="n">Your own</td></tr>
<tr><td>Drinks and tip at Pujol<br><small>Estimated, but owed to Ryan</small></td><td class="n">${usd(budget.cdmx.owed_estimates_per_person)}</td><td class="n">${usd(budget.cdmx.owed_estimates_per_person)}</td></tr>
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

  const bc = budget.set_amount_back_check;

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

<h2>Where ${esc(usd(budget.per_person.both_legs))} comes from</h2>
<p class="lede">${nt(bc.method)}</p>
<div class="scroller"><table>
<caption>Checked ${esc(longDate(bc.checked))}. Every total is a charge on Ryan's card.</caption>
<thead><tr><th>What</th><th class="n">Whole charge</th><th class="n">Split</th><th class="n">Each</th></tr></thead>
<tbody>${bc.lines.map((l) => `<tr><td>${esc(l.what)}</td><td class="n"><small>${usd(l.total_usd)}</small></td><td class="n">${l.heads}</td><td class="n">${usd(l.per_person_usd)}</td></tr>`).join('')}
<tr class="sum"><td>Charged to Ryan in total</td><td class="n">${usd(bc.charges_total_usd)}</td><td class="n"></td><td class="n">${usd(bc.sum_of_shares_usd)}</td></tr>
<tr class="pick"><td colspan="3"><strong>Carried on this page as</strong><br><small>${nt(bc.rounding_note)}</small></td><td class="n"><strong>${usd(bc.carried_as)}</strong></td></tr>
</tbody></table></div>

<div class="note">
  <div class="nh">It reconciles</div>
  <p>${nt(bc.reconciles)}</p>
  <p>Not in it: ${nt(bc.what_is_not_in_it)}</p>
</div>

<div class="note warn">
  <div class="nh">Nobody settles with a hotel or a venue directly</div>
  <p>${nt(bc.the_model_this_proves)}</p>
</div>

<h2>Flights</h2>
<p class="lede"><strong>Everybody books and pays for their own flights.</strong> No fare appears in any total on this page and no flight money goes through Ryan.</p>
<p>${nt(f.note)}</p>

<div class="note">
  <div class="nh">The one flight worth coordinating</div>
  <p>${nt(f.mex_cun_callout)}</p>
</div>

<div class="note">
  <div class="nh">Krysta and Ryan are booked on all three legs</div>
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

<div class="note warn">
  <div class="nh">Pujol will cost more than the line above says</div>
  <p>That line is the set menu only. Pujol has no beverage pairing, so drinks are ordered a la carte and the tip is on top, and the whole bill goes on Ryan's card on the day. Drinks and tip are estimated at <strong>${usd(budget.cdmx.owed_estimates[0].per_person)} each</strong>, somewhere in the range ${esc(budget.cdmx.owed_estimates[0].per_person_range)}, which makes the realistic Pujol figure about <strong>${usd(budget.cdmx.pujol_all_in_estimate_per_person)} a head</strong> rather than ${usd(budget.cdmx.lines[1].per_person)}.</p>
  <p>It stays out of the total because it is an estimate and estimates never enter a total on this page. That is the rule working, not an oversight. Just do not read the total as the final Pujol number.</p>
</div>
${estTable('Estimated, and owed to Ryan rather than spent by you. His card takes the whole Pujol bill.', budget.cdmx.owed_estimates, budget.cdmx.owed_estimates_per_person)}

<h3>What you will spend on the ground in the city</h3>
${estTable('Your own money, not money owed to Ryan. Shown so the week does not surprise anybody.', budget.cdmx.estimates, budget.cdmx.estimates_per_person)}

<div class="note warn">
  <div class="nh">The lodging line is committed, and it rose</div>
  <p>${nt(budget.cdmx.lines[0].note)}</p>
  <p>Payment dates and the refund cliff are on <a href="stays.html">the accommodations page</a>.</p>
</div>

<h2>Riviera Maya</h2>
<p class="lede">${esc(jade.name)}, ${r.travelers} people as ${esc(r.group_shape)}. All-inclusive. Four Ocean View Junior Suites with King beds, quoted direct by the resort on ${esc(iso(jade.repriced))}. The build is decided, nothing is booked.</p>

<div class="note warn">
  <div class="nh">Four rooms, four Kings, one category</div>
  <p>${nt(jade.layout_problem)}</p>
  <p>${nt(jade.layout_recommended)}</p>
</div>

<div class="scroller"><table>
<caption>The build, decided 2 November. Booked whole and split ${r.travelers} ways.</caption>
<thead><tr><th>Item</th><th>Status</th><th class="n">Each</th></tr></thead>
<tbody>${costRows(r.lines)}
<tr class="sum"><td colspan="2">Riviera Maya, what you owe Ryan</td><td class="n">${usd(r.per_person)}</td></tr>
</tbody></table></div>

<h3>The ${r.layout_options.length} builds that work, priced</h3>
<p>Every one of these gives all six a bed of their own with nobody on a sofa. They differ on how many rooms and how good a view, not on whether they work.</p>
<div class="scroller"><table>
<caption>Booking.com prices seen 28 October for ${esc(shortDate(jade.checkin))} to ${esc(shortDate(jade.checkout))}, all-inclusive, 16% VAT added on top. Split ${r.travelers} ways. Only the highlighted row has a real quote behind it, and that quote is cheaper than every figure in these columns.</caption>
<thead><tr><th>Layout</th><th class="n">Non-refundable</th><th class="n">Each</th><th class="n">Flexible</th><th class="n">Each</th><th class="n">Quoted direct</th></tr></thead><tbody>
${r.layout_options.map((o) => `<tr${o.recommended ? ' class="pick"' : ''}><td><strong>${esc(o.label)}</strong><br><small>${esc(o.sleeps)}</small><br><small>${nt(o.verdict)}</small></td>
<td class="n"><small>${usd(o.nonrefundable_total)}</small></td><td class="n">${usd(o.nonrefundable_per_person)}</td>
<td class="n"><small>${usd(o.flexible_total)}</small></td><td class="n">${usd(o.flexible_per_person)}</td>
<td class="n">${o.direct_per_person ? `<small>${usd(o.direct_total)}</small><br><strong>${usd(o.direct_per_person)}</strong>` : '<small>not quoted</small>'}</td></tr>`).join('')}
</tbody></table></div>
<p><strong>Terms:</strong> ${nt(jade.flexible_terms)} ${nt(jade.rate_choice.note)}</p>

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
  <div class="dateline"><div><b>Booked so far</b>Casa KM, and 2 of 7 on the long-haul flights</div></div>
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

  // This page is the two places and nothing else. Every figure it used to
  // carry, the room by room catalogue, the six alternative builds and the
  // payment schedule, was the working behind a decision that is now made, and
  // the money all lives on the costs page where one set amount answers it.
  let b = `<header class="masthead">
  <p class="eyebrow">Two places, and only two</p>
  <h1>Where we are staying</h1>
  <div class="dateline">
    <div><b>Mexico City</b>${esc(shortDate(casakm.checkin))} to ${esc(shortDate(casakm.checkout))}, ${casakm.nights} nights</div>
    <div><b>Riviera Maya</b>${esc(shortDate(jade.checkin))} to ${esc(shortDate(jade.checkout))}, ${jade.nights} nights</div>
  </div>
</header>

<p class="lede">Casa KM in Mexico City, booked ${esc(iso(casakm.booked))}. Dreams Jade in Puerto Morelos, quoted direct and not booked yet. What either one costs and when the money moves are on <a href="costs.html">the costs page</a>. This page is the two places.</p>

<h2><span class="num">01</span>${esc(casakm.name)}<span class="tag ok">booked</span></h2>
<p class="lede">${esc(casakm.subtitle)}. ${esc(casakm.neighborhood)}, Mexico City.</p>

<p><a class="bigline" href="${esc(casakm.url)}">Open the Airbnb listing</a></p>

<div class="scroller"><table><tbody>
<tr><th>Check in</th><td>${esc(longDate(casakm.checkin))}, from ${esc(casakm.checkin_time)}</td></tr>
<tr><th>Check out</th><td>${esc(longDate(casakm.checkout))}, before ${esc(casakm.checkout_time)}</td></tr>
<tr><th>Nights</th><td>${casakm.nights}</td></tr>
<tr><th>Guests</th><td>${casakm.guests} of us, and ${casakm.capacity} is the hard maximum</td></tr>
<tr><th>Layout</th><td>${casakm.bedrooms} bedrooms, ${casakm.beds} beds, ${casakm.baths} bathrooms<br><small>${esc(casakm.baths_note)}</small></td></tr>
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

<div class="note">
  <div class="nh">Worth knowing</div>
  ${bullets(casakm.flags)}
</div>

<h2><span class="num">02</span>${esc(jade.name)}<span class="tag estimate">not booked</span></h2>
<p class="lede">Puerto Morelos, between Cancun and Playa del Carmen. ${jade.adults} of us, as ${esc(jade.group_shape)}. ${esc(jade.board)} Scored ${jade.review_score} on ${jade.review_count} reviews.</p>

<p><a class="bigline" href="${esc(jade.url)}">Open the listing</a></p>

<div class="scroller"><table><tbody>
<tr><th>Check in</th><td>${esc(longDate(jade.checkin))}, from ${esc(jade.checkin_time)}</td></tr>
<tr><th>Check out</th><td>${esc(longDate(jade.checkout))}, before ${esc(jade.checkout_time)}</td></tr>
<tr><th>Nights</th><td>${jade.nights}</td></tr>
<tr><th>Guests</th><td>${jade.adults} adults, as ${esc(jade.group_shape)}</td></tr>
<tr><th>Board</th><td>${esc(jade.board)}</td></tr>
<tr><th>Reservations</th><td>Hyatt Inclusive Collection ${esc(jade.contact.hyatt_inclusive_us)}<br>Resort direct ${esc(jade.contact.resort_direct)}</td></tr>
</tbody></table></div>

<div class="note">
  <div class="nh">Why a resort and not a residence</div>
  <p>${nt(jade.why_this_property)}</p>
</div>

<div class="note">
  <div class="nh">Four rooms, four Kings, one category</div>
  <p>${nt(jade.layout_recommended)}</p>
</div>

<h3>Why 3 January and not earlier</h3>
<p>${nt(jade.why_jan_3)}</p>

<div class="note">
  <div class="nh">Nobody settles with either place directly</div>
  <p>Both legs sit inside the one set amount everybody pays Ryan, and his card answers every hotel and resort bill on this trip. The derivation, the figure and the dates are on <a href="costs.html">the costs page</a>; the booking deadlines are on <a href="tasks.html">the to do list</a>.</p>
</div>`;

  return shell({ title: 'Where we are staying', current: 'stays.html', body: b });
}

// ---------- map ----------

// Teardrop pin silhouette, same geometry 4pm-detroit uses (src/lib/map-pin.ts).
// The tip sits at y=21 in a 24 unit box, which is what sets the icon anchor.
const PIN_PATH =
  'M12 21C12 21 18.5 13.8 18.5 9.5C18.5 5.36 15.59 2 12 2C8.41 2 5.5 5.36 5.5 9.5C5.5 13.8 12 21 12 21Z';

// Five pointed star, centred in its own 24 unit box like the glyphs below.
// It used to be drawn inside the pin head as a cut out; the category glyph has
// that space now, so a star is a badge on the pin's shoulder instead.
const STAR_GLYPH =
  'M12 2L14.47 8.6L21.51 8.91L15.99 13.3L17.88 20.09L12 16.2L6.12 20.09L8.01 13.3L2.49 8.91L9.53 8.6Z';

// Category glyphs, drawn in the head of every pin so colour is no longer the
// only thing telling a taqueria from a museum. Each glyph is authored in its
// own 0 0 24 24 box and scaled into wherever it is drawn, which keeps these
// numbers editable. The head has about 9.4 units of clear space, so every
// feature here is at least 3 units across: anything finer vanishes at pin size.
// A part written as { d, hole: true } is filled with whatever is behind the
// glyph, which is how a snout reads as a snout instead of a blob.
const CAT_GLYPH = {
  // Pitched roof over a box.
  stay: ['M12 2.6L22.4 11.6h-3.4V21H5V11.6H1.6z'],
  // Cloche: dome, base, knob.
  fine: [
    'M3 16a9 9 0 0 1 18 0z',
    'M1.4 16.6h21.2v3.4H1.4z',
    'M12 2.4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  ],
  // Mug with a handle. Casual here is cafes and bakeries as much as lunch.
  casual: [
    'M3 6h12.6v8.4a4.6 4.6 0 0 1-4.6 4.6H7.6A4.6 4.6 0 0 1 3 14.4z',
    'M16.8 8.4h1.4a4 4 0 0 1 0 8h-1.4z',
  ],
  // Martini glass. The stem is 3.2 units so it survives the scale down.
  bar: ['M2.4 3.6h19.2L13.6 12.8V19h3.8v2.4H6.6V19h3.8v-6.2z'],
  // Market bag, handle above the body.
  market: [
    'M3.6 8h16.8l1.4 12.8H2.2z',
    'M7.7 8.4a4.3 4.3 0 0 1 8.6 0h-3a1.3 1.3 0 0 0-2.6 0z',
  ],
  // Folded shell seen from the side, filling in the fold. A half disc with
  // scallops along the flat edge was tried first and read as a cloud.
  taco: [
    'M2.4 16.6a9.6 9.6 0 0 1 19.2 0h-3.8a5.8 5.8 0 0 0-11.6 0z',
    'M6.4 16.6a2.9 2.9 0 0 1 5.8 0z',
    'M11.8 16.6a2.9 2.9 0 0 1 5.8 0z',
  ],
  // Two stacked triangles and a trunk.
  spot: ['M12 2.4L19.2 12.4H4.8z', 'M12 9.6L21.4 21.2H2.6z', 'M10.4 20h3.2v3.2h-3.2z'],
};

// What a kitchen is known for. Four, because four is what was asked for, and
// each one is an animal rather than a cut: a cut of meat at this size is a
// brown blob, while an outline with ears or a tail fan still reads. The label
// is what the popup and the table print, so Steak rather than Beef.
const PROTEIN = {
  seafood: {
    label: 'Seafood',
    // A fish, not the shrimp this was first drawn as. A shrimp needs legs and
    // antennae to read as a shrimp, and at this size they close up: the curl
    // that survived looked like the digit 3. A fish reads at eleven pixels.
    parts: [
      'M5.8 12a7.6 6.4 0 1 1 15.2 0 7.6 6.4 0 1 1-15.2 0z',
      'M7.4 12L1.2 6.6v10.8z',
      { d: 'M18 8.1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z', hole: true },
    ],
  },
  chicken: {
    label: 'Chicken',
    parts: [
      'M4.8 15.2a6.8 6.8 0 0 1 13.6 0 6.8 6.8 0 0 1-13.6 0z',
      'M16.8 4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z',
      'M19.8 6.2L23.4 7.8l-3.6 1.8z',
      'M13.6 3.4a1.9 1.9 0 0 1 3.8 0z',
      'M4.4 10.6l3 3.6-5 1.4z',
    ],
  },
  beef: {
    label: 'Steak',
    // Cow: square head, horns out to the sides, muzzle below.
    parts: [
      'M5.4 8.6h13.2v6a6.6 6.6 0 0 1-13.2 0z',
      'M8.6 15.2h6.8v3a3.4 3.4 0 0 1-6.8 0z',
      'M5.6 9.2L1 5.6l0.4 5.6z',
      'M18.4 9.2L23 5.6l-0.4 5.6z',
    ],
  },
  pork: {
    label: 'Pork',
    // Pig: round head, ears up, snout punched out of the middle.
    parts: [
      'M12 5.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4z',
      'M5.6 7.4L3.2 1.6l6 2.4z',
      'M18.4 7.4L20.8 1.6l-6 2.4z',
      { d: 'M12 12.6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', hole: true },
      'M10.4 15.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z',
      'M13.6 15.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z',
    ],
  },
};

// Pin sizes. Bumped from 28 and 36 when the glyphs went in: at 28 the head
// could only hold about 11 pixels of glyph, which is under what a four part
// silhouette needs.
const PIN_SIZE = { base: 30, big: 38 };

// White or near black on the category colour, whichever has the contrast.
// Every colour in places.yml today is dark enough to take white; this is here
// so a retuned palette cannot silently produce an unreadable glyph.
const glyphInk = (hex) => {
  const ch = (i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(ch(0)) + 0.7152 * lin(ch(1)) + 0.0722 * lin(ch(2));
  return L > 0.35 ? '#11211F' : '#FCFCFA';
};

// protein takes a scalar or a list, because most places are known for one
// thing and writing a one item list for all of them reads badly in the yaml.
const proteinList = (p) =>
  p.protein == null ? [] : Array.isArray(p.protein) ? p.protein : [p.protein];

// A typo in either field would otherwise just render nothing, which is the
// failure mode that cost a round of work when `artists` was added. Fail here.
for (const p of placesDoc.places) {
  const m = p.michelin;
  if (m != null) {
    const ok = (Number.isInteger(m) && m >= 1 && m <= 3) || m === 'bib' || m === 'listed';
    if (!ok) throw new Error(`${p.name}: michelin must be 1, 2, 3, bib or listed, got ${JSON.stringify(m)}`);
  }
  for (const k of proteinList(p)) {
    if (!PROTEIN[k]) {
      throw new Error(`${p.name}: unknown protein ${JSON.stringify(k)}. Known: ${Object.keys(PROTEIN).join(', ')}`);
    }
  }
}

// One glyph as markup. The map markers build the same thing with DOM calls
// instead, off these same constants, so the two cannot show different shapes.
const glyphHtml = (parts, fill, bg, cx, cy, scale) =>
  `<g transform="translate(${cx} ${cy}) scale(${scale}) translate(-12 -12)">` +
  parts
    .map((part) => {
      const d = typeof part === 'string' ? part : part.d;
      const isHole = typeof part !== 'string' && part.hole;
      return `<path d="${d}" fill="${isHole ? bg : fill}"/>`;
    })
    .join('') +
  `</g>`;

const legendPin = (key, colour, size = 22) =>
  `<svg class="legpin" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
  `<path d="${PIN_PATH}" fill="${esc(colour)}" stroke="var(--pin-stroke)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
  (CAT_GLYPH[key] ? glyphHtml(CAT_GLYPH[key], glyphInk(colour), esc(colour), 12, 9.2, 0.4) : '') +
  `</svg>`;

const starSvg = (size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_GLYPH}" fill="currentColor"/></svg>`;

const michBadgeHtml = (n) =>
  `<span class="pinbadge pinbadge--mich" title="${n} Michelin star${n > 1 ? 's' : ''}">${starSvg(8).repeat(n)}</span>`;

const starBadgeHtml = () =>
  `<span class="pinbadge pinbadge--star" title="Settled on">${starSvg(8)}</span>`;

const protBadgeHtml = (k) =>
  `<span class="pinbadge pinbadge--prot" title="${esc(PROTEIN[k].label)}">` +
  `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">` +
  `${glyphHtml(PROTEIN[k].parts, 'currentColor', 'var(--paper)', 12, 12, 0.72)}</svg></span>`;

// Every place should carry at least one way to look it up: its own site, its
// Instagram, wherever it takes bookings, or failing those the write up the
// entry came from. `url` is the main one and `links` is a plain list of extra
// URLs, because a label that can be derived from the host is a label nobody
// has to type or keep consistent.
const LINK_LABELS = [
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(x|twitter)\.com$/, 'X'],
  [/(^|\.)youtube\.com$/, 'YouTube'],
  [/(^|\.)opentable\.(com|com\.mx|mx)$/, 'OpenTable'],
  [/(^|\.)resy\.com$/, 'Resy'],
  [/(^|\.)exploretock\.com$/, 'Tock'],
  [/(^|\.)mesa247\.mx$/, 'Mesa 247'],
  [/(^|\.)bookenda\.com$/, 'Bookenda'],
  [/(^|\.)sevenrooms\.com$/, 'SevenRooms'],
  [/(^|\.)airbnb\.com$/, 'Airbnb'],
  [/(^|\.)booking\.com$/, 'Booking.com'],
  [/(^|\.)wa\.me$/, 'WhatsApp'],
  [/(^|\.)whatsapp\.com$/, 'WhatsApp'],
  [/(^|\.)linktr\.ee$/, 'Link tree'],
  [/(^|\.)guide\.michelin\.com$/, 'Michelin guide'],
  [/(^|\.)(google\.[a-z.]+|maps\.google\.[a-z.]+|goo\.gl|g\.page|maps\.app\.goo\.gl)$/, 'Google Maps'],
  [/(^|\.)tripadvisor\.[a-z.]+$/, 'Tripadvisor'],
  [/(^|\.)yelp\.com$/, 'Yelp'],
  [/(^|\.)chilango\.com$/, 'Chilango'],
  [/(^|\.)timeout(mexico)?\.[a-z.]+$/, 'Time Out'],
  [/(^|\.)theinfatuation\.com$/, 'The Infatuation'],
  [/(^|\.)atlasobscura\.com$/, 'Atlas Obscura'],
  [/(^|\.)frommers\.com$/, "Frommer's"],
  [/(^|\.)fodors\.com$/, "Fodor's"],
  [/(^|\.)inah\.gob\.mx$/, 'INAH'],
  [/\.gob\.mx$/, 'Official page'],
];

const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return 'Link';
  }
};

const linkLabel = (u) => {
  const host = hostOf(u);
  if (host === 'Link') return 'Link';
  for (const [re, label] of LINK_LABELS) if (re.test(host)) return label;
  // Anything else is the place's own site, which is what an unrecognised host
  // almost always is here. The publications that turn up as a source rather
  // than a venue are named in the table above, so this fallback does not put
  // the word Website on a listicle. A host with a dot left in it, like
  // limantour.tv or a ticketing subdomain, is still their own site and reads
  // the same way; the only time a host is printed is to tell two of them
  // apart, which linkList handles.
  return 'Website';
};

// The one link that can always be generated rather than researched. It is a
// search, not a claim about a listing id, so it cannot rot the way a copied
// place URL does, and what it lands on carries the phone, the hours and
// whatever website the business itself has registered. Skipped only on the
// stay pin, which is deliberately the middle of a neighbourhood: pointing a
// map search at it would undo the whole reason it is vague. Everywhere else
// an approximate pin just means the street number did not geocode, and a
// search on the name is exactly what fixes that.
const mapsSearch = (p) =>
  p.category === 'stay' && p.precision === 'approximate'
    ? null
    : 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent([p.name, p.address].filter(Boolean).join(', '));

// encodeURI on a string that already carries percent escapes turns %2C into
// %252C and breaks the link. The generated map search is encoded at the point
// it is built, so only a hand written URL gets encoded here.
const safeUrl = (u) => (/%[0-9A-Fa-f]{2}/.test(u) ? u : encodeURI(u));

const linkList = (p) => {
  const all = [p.url, ...(Array.isArray(p.links) ? p.links : p.links ? [p.links] : []), mapsSearch(p)]
    .filter(Boolean)
    .filter((u, i, a) => a.indexOf(u) === i);
  if (!all.length) return '';
  // Two links that both land on an unrecognised host would otherwise both read
  // Website, which tells you nothing about which is which. When that happens
  // the host is printed instead.
  const labels = all.map(linkLabel);
  const shown = labels.map((l, i) =>
    labels.filter((x) => x === l).length > 1 ? hostOf(all[i]) : l
  );
  return `<div class="plinks">${all
    .map((u, i) => `<a class="plink" href="${esc(safeUrl(u))}">${esc(shown[i])}</a>`)
    .join('')}</div>`;
};

const michWords = (m) =>
  typeof m === 'number'
    ? `${['', 'One', 'Two', 'Three'][m]} Michelin star${m > 1 ? 's' : ''}`
    : m === 'bib'
      ? 'Michelin Bib Gourmand'
      : m === 'listed'
        ? 'In the Michelin guide'
        : '';

// The badge row a popup and a table cell both carry. Pre-escaped, because the
// popup version goes through innerHTML.
const tagsHtml = (p) => {
  const out = [];
  if (p.michelin != null) {
    out.push(
      `<span class="ptag ptag--mich">` +
        (typeof p.michelin === 'number' ? starSvg(10).repeat(p.michelin) : '') +
        esc(michWords(p.michelin)) +
        `</span>`
    );
  }
  for (const k of proteinList(p)) {
    out.push(`<span class="ptag">${protBadgeHtml(k)} Known for ${esc(PROTEIN[k].label.toLowerCase())}</span>`);
  }
  return out.length ? `<div class="ptags">${out.join('')}</div>` : '';
};

// Two maps from one places.yml. `region` defaults to cdmx; Puerto Morelos
// entries carry `region: riviera`. Distances on each map are from that
// region's own `stay` pin.
const MAPS = {
  cdmx: { file: 'map.html', title: 'Where everything is', base: 'the house', openViewKm: 4, fallback: [19.4185, -99.1626] },
  riviera: { file: 'riviera-map.html', title: 'Puerto Morelos', base: 'the resort', openViewKm: 6, fallback: [20.8478, -86.8756] },
};

// Pin construction in the browser, shared by the map and the taco walk so a
// pin cannot look different on the two pages. Every value it reads is a
// build-time constant above.
const PIN_JS = `  var SVG_NS = 'http://www.w3.org/2000/svg';
  var PIN_PATH = ${JSON.stringify(PIN_PATH)};
  var STAR_GLYPH = ${JSON.stringify(STAR_GLYPH)};
  var CAT_GLYPH = ${JSON.stringify(CAT_GLYPH)};
  var PROTEIN = ${JSON.stringify(PROTEIN)};
  var PIN_SIZE = ${JSON.stringify(PIN_SIZE)};

  // Built with DOM APIs rather than innerHTML. Every value here is either a
  // constant or a colour from our own data, but this keeps pin construction
  // unambiguously safe. Same approach as 4pm-detroit's map-view client.
  function svgBox(size) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    return svg;
  }

  // Glyphs are authored in their own 0 0 24 24 box, so each one is scaled and
  // centred wherever it lands. A part flagged hole gets the background colour,
  // which is what makes the pig's snout read as a snout.
  function glyphInto(svg, parts, fill, bg, cx, cy, scale) {
    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform',
      'translate(' + cx + ' ' + cy + ') scale(' + scale + ') translate(-12 -12)');
    parts.forEach(function (part) {
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', typeof part === 'string' ? part : part.d);
      path.setAttribute('fill', typeof part === 'object' && part.hole ? bg : fill);
      g.appendChild(path);
    });
    svg.appendChild(g);
  }

  function starEl(size) {
    var svg = svgBox(size);
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', STAR_GLYPH);
    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
    return svg;
  }

  function badge(cls, title) {
    var b = document.createElement('span');
    b.className = 'pinbadge ' + cls;
    b.title = title;
    return b;
  }

  function badgeRow(cls, kids) {
    var row = document.createElement('div');
    row.className = 'pinbadges ' + cls;
    kids.forEach(function (k) { row.appendChild(k); });
    return row;
  }

  function buildPinEl(p, colour, ink) {
    var big = p.c === 'stay' || p.star;
    var size = big ? PIN_SIZE.big : PIN_SIZE.base;
    var el = document.createElement('div');
    el.className = 'mappin' + (big ? ' mappin--big' : '') + (p.star ? ' mappin--star' : '');

    var svg = svgBox(size);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    var pin = document.createElementNS(SVG_NS, 'path');
    pin.setAttribute('d', PIN_PATH);
    // An approximate location is drawn hollow and dashed, so it cannot be
    // mistaken for a pin we can actually stand behind.
    pin.setAttribute('fill', p.approx ? 'none' : colour);
    pin.setAttribute('stroke', p.approx ? colour : 'var(--pin-stroke)');
    pin.setAttribute('stroke-width', p.approx ? '2.5' : '2');
    if (p.approx) pin.setAttribute('stroke-dasharray', '3 2');
    svg.appendChild(pin);

    // The category glyph in the head. A hollow approximate pin has no filled
    // body for a cut out to sit on, so there the glyph takes the colour.
    if (CAT_GLYPH[p.c]) {
      glyphInto(svg, CAT_GLYPH[p.c], p.approx ? colour : ink, colour, 12, 9.2, 0.4);
    }
    el.appendChild(svg);

    // Badges hang off the shoulders. A starred place used to carry its star
    // inside the head; the glyph has that space now, so the star became a
    // badge alongside whatever the guide says.
    var right = [];
    if (p.star) {
      var sb = badge('pinbadge--star', 'Settled on');
      sb.appendChild(starEl(8));
      right.push(sb);
    }
    if (typeof p.mich === 'number') {
      var mb = badge('pinbadge--mich', p.mich + ' Michelin star' + (p.mich > 1 ? 's' : ''));
      for (var i = 0; i < p.mich; i++) mb.appendChild(starEl(8));
      right.push(mb);
    }
    if (right.length) el.appendChild(badgeRow('pinbadges--mich', right));

    // Two discs is the cap. A third is wider than the pin and starts covering
    // the pin next to it; the popup and the table list every one.
    var left = (p.prot || []).slice(0, 2).map(function (k) {
      if (!PROTEIN[k]) return null;
      var b = badge('pinbadge--prot', PROTEIN[k].label);
      var g = svgBox(16);
      glyphInto(g, PROTEIN[k].parts, 'currentColor', 'var(--paper)', 12, 12, 0.72);
      b.appendChild(g);
      return b;
    }).filter(Boolean);
    if (left.length) el.appendChild(badgeRow('pinbadges--prot', left));

    return el;
  }
`;

function buildMap(region = 'cdmx') {
  const cfg = MAPS[region];
  const cats = placesDoc.categories;

  // Attach coordinates and drop anything still unresolved, so the map never
  // shows a pin we cannot stand behind.
  const resolved = [];
  const unresolved = [];
  for (const p of placesDoc.places.filter((q) => (q.region || 'cdmx') === region)) {
    const hit = p.lat && p.lon ? { lat: p.lat, lon: p.lon } : geocache[p.address];
    if (hit) resolved.push({ ...p, lat: hit.lat, lon: hit.lon });
    else unresolved.push(p);
  }

  const stay = resolved.find((p) => p.category === 'stay');

  // Opening view radius. Was 3 km when the house was in Roma Norte and the
  // cluster sat on top of it. From Del Valle Norte the Roma and Condesa
  // venues are 2.2 to 3.8 km out, so 3 km cropped most of them off.
  const OPEN_VIEW_KM = cfg.openViewKm;

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
    center: stay ? [stay.lat, stay.lon] : cfg.fallback,
    base: cfg.base,
    openViewKm: OPEN_VIEW_KM,
    // Glyph ink is settled here rather than in the browser, so the markers and
    // the legend read it off the same number.
    categories: Object.fromEntries(
      Object.entries(cats).map(([k, c]) => [k, { label: c.label, color: c.color, ink: glyphInk(c.color) }])
    ),
    // Escaped at build time: these strings go straight into popup innerHTML,
    // and a name with an apostrophe or an angle bracket would otherwise break it.
    places: resolved.map((p) => ({
      n: esc(p.name),
      c: p.category,
      lat: p.lat,
      lon: p.lon,
      hood: esc(p.neighborhood || ''),
      note: nt(p.note || ''),
      artistsNote: nt(p.artists_note || ''),
      artists: artistList(p.artists),
      booking: nt(p.booking || ''),
      tags: tagsHtml(p),
      links: linkList(p),
      mich: p.michelin == null ? null : p.michelin,
      prot: proteinList(p),
      url: encodeURI(p.url || ''),
      approx: p.precision === 'approximate',
      star: p.starred === true,
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
        legendPin(key, c.color) +
        `${esc(c.label)} <span class="cnt">${counts[key] || 0}</span></button>`
    )
    .join('');

  // What the badges mean. Without this the discs are a guessing game, and the
  // glyph in the pin head is only learnable from the legend above.
  const badgeKey =
    `<div class="legend-row legend-row--key">` +
    `<span class="keyitem">${michBadgeHtml(1)} one Michelin star</span>` +
    `<span class="keyitem">${michBadgeHtml(2)} two</span>` +
    Object.keys(PROTEIN)
      .map((k) => `<span class="keyitem">${protBadgeHtml(k)} ${esc(PROTEIN[k].label.toLowerCase())}</span>`)
      .join('') +
    `<span class="keyitem">${starBadgeHtml()} settled on</span>` +
    `</div>`;

  // Grouped list under the map, so the page still works if tiles fail to load.
  let lists = '';
  for (const [key, c] of Object.entries(cats)) {
    const inCat = resolved.filter((p) => p.category === key);
    if (!inCat.length) continue;
    lists += `<h3><span class="swatch" style="background:${esc(c.color)}"></span>${esc(c.label)}</h3>
<div class="scroller"><table><thead><tr><th>Place</th><th>Where</th><th class="n">From ${esc(cfg.base)}</th><th>Notes</th></tr></thead><tbody>`;
    for (const p of inCat.slice().sort((a, b) => a.km - b.km)) {
      const dist =
        p.category === 'stay'
          ? ''
          : p.walkMin
            ? `${p.walkMin} min walk`
            : `${(Math.round(p.km * 10) / 10).toFixed(1)} km`;
      lists += `<tr><td><strong>${esc(p.name)}</strong>${p.starred ? ' <span aria-label="starred">&#9733;</span>' : ''}${linkList(p)}</td><td>${esc(p.neighborhood || '')}${p.precision === 'approximate' ? '<br><small>approximate</small>' : ''}</td><td class="n">${esc(dist)}</td><td>${tagsHtml(p)}${nt(p.note || '')}${p.artists_note ? `<br><br>${nt(p.artists_note)}` : ''}${artistList(p.artists)}${p.booking ? `<br><small>${nt(p.booking)}</small>` : ''}</td></tr>`;
    }
    lists += `</tbody></table></div>`;
  }

  const body = `<header class="masthead">
  <p class="eyebrow">${resolved.length} places mapped</p>
  <h1>${esc(cfg.title)}</h1>
  <div class="dateline">
    <div><b>Base</b>${esc(stay ? stay.neighborhood : 'Mexico City')}</div>
    <div><b>Walkable</b>${walkable} of ${others.length}</div>
    <div><b>Dashed ring</b>1 km from ${esc(cfg.base)}</div>
  </div>
</header>

<p class="lede">Dinner options, bars, markets and ${esc(cfg.base)}. Each pin is coloured by type and carries a glyph in its head saying what it is. Stars on a pin's right shoulder are Michelin stars; a disc on its left is what the kitchen is known for. Tap a pin for details. Tap a colour below to show only that group, and tap the same colour again to bring the rest back. A gold star badge is a place we have settled on.</p>

<div class="legend-row">${legend}</div>
${badgeKey}
<p class="caveat">Michelin badges come from the guide's own Mexico selection, read on 10 November 2026: every restaurant it lists in the Mexico City boroughs and in Puerto Morelos. A place here with no badge is not in the guide. The protein discs are not a sweep like that, and mark the places whose notes already say what the order is.</p>
<div id="map" role="application" aria-label="Map of trip locations"></div>
<p class="caveat" id="faraway"></p>
${region === 'cdmx' ? `<p class="caveat">Map data from OpenStreetMap. ${esc(stay ? stay.name : 'The house')} is not booked yet, and Airbnb only shows an approximate area until it is, so the house pin is their published circle rather than a street address. The exact address deliberately stays out of this repo.</p>

<div class="note warn">
  <div class="nh">What basing in ${esc(stay ? stay.neighborhood : 'this area')} costs in walking</div>
  <p><strong>${walkable} of ${others.length}</strong> places are within a 2.5 km walk and ${nearView} sit inside the opening view. From the Oasis it was 48 of 67, because that house stood inside the Roma and Condesa restaurant cluster instead of ${romaKm} km south of it.</p>
  <p>${rosettaWalk} Budget for rides in the evenings: an Uber across that gap runs roughly MX$60 to MX$90.</p>
  <p><strong>These walks are a worst case, not the real ones.</strong> The pin is the middle of ${esc(stay ? stay.neighborhood : 'the neighbourhood')} rather than the house, on purpose, and it sits about half a kilometre further from Roma than the flat actually does. Measured from the listing's own circle, 27 of ${others.length} are inside a 2.5 km walk rather than ${walkable}. Treat the figures below as the pessimistic end until the booking is confirmed.</p>
</div>` : `<p class="caveat">Map data from OpenStreetMap. Distances are straight-line from ${esc(stay ? stay.name : 'the resort')}; most of these are a short taxi, not a walk.</p>`}
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

${PIN_JS}
  var bounds = [];
  DATA.places.forEach(function (p) {
    var cat = DATA.categories[p.c] || {};
    var colour = cat.color || '#666';
    var big = p.c === 'stay' || p.star;
    var size = big ? PIN_SIZE.big : PIN_SIZE.base;
    var marker = L.marker([p.lat, p.lon], {
      icon: L.divIcon({
        html: buildPinEl(p, colour, cat.ink || '#FCFCFA'),
        className: '',
        iconSize: [size, size],
        // The silhouette's tip is at y=21 of 24, so the anchor is 21/24 down.
        iconAnchor: [size / 2, Math.round(size * (21 / 24))],
        popupAnchor: [0, -Math.round(size * (21 / 24)) + 4]
      }),
      alt: p.n,
      riseOnHover: true
    });

    var html = '<strong>' + p.n + '</strong>' + (p.star ? ' <span title="Starred">&#9733;</span>' : '');
    if (p.hood) html += '<br><span style="opacity:.7">' + p.hood + '</span>';
    if (p.c !== 'stay') {
      html += '<br><span style="opacity:.7">' +
        (p.walk ? p.walk + ' min walk' : p.km + ' km') + ' from ' + DATA.base + '</span>';
    }
    if (p.tags) html += p.tags;
    if (p.note) html += '<br><br>' + p.note;
    if (p.artistsNote) html += '<br><br>' + p.artistsNote;
    if (p.artists) html += p.artists;
    if (p.booking) html += '<br><br><em>' + p.booking + '</em>';
    if (p.links) html += p.links;
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

  // One category at a time. Tapping a colour shows only that group, and
  // tapping the same one again brings every group back. Toggling groups off
  // one by one meant seven taps to answer "where are the taco places", which
  // is the question the legend actually gets used for.
  var solo = null;

  function applyFilter() {
    Object.keys(groups).forEach(function (k) {
      var show = solo === null || solo === k;
      if (show) map.addLayer(groups[k]); else map.removeLayer(groups[k]);
    });
    document.querySelectorAll('.legitem').forEach(function (b) {
      var vis = solo === null || solo === b.dataset.cat;
      b.setAttribute('aria-pressed', vis ? 'true' : 'false');
      b.classList.toggle('legitem--solo', solo === b.dataset.cat);
    });
  }

  document.querySelectorAll('.legitem').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.dataset.cat;
      solo = solo === k ? null : k;
      applyFilter();
    });
  });

  map.on('click', function () { map.scrollWheelZoom.enable(); });
  map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
})();
</script>`;

  return shell({ title: cfg.title, current: cfg.file, body });
}

// ---------- taco walk ----------

// The TRAVEL-28 walk as an editable route. The seed lives in
// data/taco-tour.yml; every stop on it and every suggestion is a taco entry in
// places.yml, so the page can never offer a place the map does not have.
// Edits stay with the viewer: the route rides in the page address, so a copied
// link carries it, and the browser remembers the last one. No backend.
const tacoTour = load('taco-tour.yml');

const HOURS_RE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
for (const p of placesDoc.places) {
  if (p.hours == null) continue;
  if (typeof p.hours !== 'object') throw new Error(`${p.name}: hours must be a map of weekday to "HH:MM-HH:MM"`);
  for (const [d, v] of Object.entries(p.hours)) {
    if (!WEEKDAYS.includes(d)) throw new Error(`${p.name}: hours day ${JSON.stringify(d)} is not one of ${WEEKDAYS.join(', ')}`);
    if (!HOURS_RE.test(String(v))) throw new Error(`${p.name}: hours.${d} must be "HH:MM-HH:MM", got ${JSON.stringify(v)}`);
  }
}
for (const p of placesDoc.places) {
  if (p.known_for != null && typeof p.known_for !== 'string') throw new Error(`${p.name}: known_for must be one line of text`);
  if (p.order != null && !(Array.isArray(p.order) && p.order.every((o) => typeof o === 'string' && o)))
    throw new Error(`${p.name}: order must be a list of dishes`);
  if (p.price_mxn != null && !/^\d+(-\d+)?$/.test(String(p.price_mxn))) throw new Error(`${p.name}: price_mxn must look like "35" or "35-60"`);
}

const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function buildTacos() {
  const byName = new Map(placesDoc.places.map((p) => [p.name, p]));
  const pos = (p) => (p.lat && p.lon ? { lat: p.lat, lon: p.lon } : geocache[p.address]);

  for (const s of tacoTour.stops) {
    for (const n of [s.name, s.backup].filter(Boolean)) {
      const p = byName.get(n);
      if (!p) throw new Error(`taco-tour.yml: ${JSON.stringify(n)} is not a name in places.yml`);
      if (!pos(p)) throw new Error(`taco-tour.yml: ${n} has no coordinates yet, run npm run geocode`);
    }
  }

  const tacos = placesDoc.places.filter((p) => p.category === 'taco' && (p.region || 'cdmx') === 'cdmx' && pos(p));
  const unplaced = placesDoc.places.filter((p) => p.category === 'taco' && (p.region || 'cdmx') === 'cdmx' && !pos(p));
  const stay = placesDoc.places.find((p) => p.category === 'stay' && (p.region || 'cdmx') === 'cdmx');
  const stayPos = stay && pos(stay);
  const cats = placesDoc.categories;

  const ids = new Set();
  const payload = {
    tour: {
      date: iso(tacoTour.date),
      meet: String(tacoTour.meet),
      dwell: tacoTour.dwell_min,
      factor: tacoTour.street_factor,
      kmh: tacoTour.walk_kmh,
      rideOver: tacoTour.ride_over_km,
      seed: tacoTour.stops.map((s) => slug(s.name)),
      api: SWIPE_API,
    },
    stay: stayPos ? { n: esc(stay.name), hood: esc(stay.neighborhood || ''), lat: stayPos.lat, lon: stayPos.lon } : null,
    colour: cats.taco.color,
    ink: glyphInk(cats.taco.color),
    stayColour: cats.stay.color,
    stayInk: glyphInk(cats.stay.color),
    places: tacos.map((p) => {
      const id = slug(p.name);
      if (ids.has(id)) throw new Error(`two taco places share the id ${id}; rename one`);
      ids.add(id);
      const seed = tacoTour.stops.find((s) => s.name === p.name);
      const backupOf = tacoTour.stops.find((s) => s.backup === p.name);
      const q = pos(p);
      return {
        id,
        n: esc(p.name),
        c: 'taco',
        lat: q.lat,
        lon: q.lon,
        hood: esc(p.neighborhood || ''),
        note: nt(p.note || ''),
        tags: tagsHtml(p),
        links: linkList(p),
        mich: p.michelin == null ? null : p.michelin,
        prot: proteinList(p),
        approx: p.precision === 'approximate',
        hours: p.hours || null,
        hoursSrc: esc(p.hours_source || ''),
        order: seed?.order ? esc(seed.order) : '',
        at: seed?.at ? String(seed.at) : null,
        slot: seed ? tacoTour.stops.indexOf(seed) : -1,
        backup: seed?.backup ? slug(seed.backup) : null,
        backupFor: backupOf ? esc(backupOf.name) : '',
      };
    }),
  };

  const d = new Date(tacoTour.date);
  const dayName = DOW[d.getUTCDay()];
  const nextDay = new Date(d.getTime() + 86400000);

  const badgeKey =
    `<div class="legend-row legend-row--key">` +
    `<span class="keyitem">${michBadgeHtml(1)} Michelin star</span>` +
    Object.keys(PROTEIN)
      .map((k) => `<span class="keyitem">${protBadgeHtml(k)} ${esc(PROTEIN[k].label.toLowerCase())}</span>`)
      .join('') +
    `<span class="keyitem"><span class="tw-num tw-num--key">1</span> on the route</span>` +
    `<span class="keyitem"><span class="tw-faded">${legendPin('taco', cats.taco.color, 18)}</span> not on it, tap to add</span>` +
    `</div>`;

  const body = `<header class="masthead">
  <p class="eyebrow">Self-guided, nothing booked</p>
  <h1>The taco walk</h1>
  <div class="dateline">
    <div><b>Day</b>${esc(dayName)} ${esc(shortDate(iso(tacoTour.date)))}</div>
    <div><b>Meet</b>${esc(String(tacoTour.meet))}, ${esc(stay ? stay.neighborhood : 'Del Valle')}</div>
    <div><b>Route</b><span id="tw-head">${tacoTour.stops.length} stops</span></div>
  </div>
</header>

<p class="lede">A canasta breakfast near the house, then a walk up through Roma Sur into Roma Norte. Add, drop and reorder stops below and the walking recomputes. Your version lives in this page's address, so <strong>copy the link</strong> to share it; nobody else's route changes until they open yours.</p>

<div class="tw-bar">
  <button type="button" class="tw-btn tw-btn--main" id="tw-copy">Copy link to this route</button>
  <button type="button" class="tw-btn" id="tw-reset">Reset to the plan</button>
  <span class="tw-status" id="tw-status" role="status" aria-live="polite"></span>
</div>

<div class="tw-totals" id="tw-totals"></div>

${badgeKey}
<div id="map" class="tw-map" role="application" aria-label="Map of the taco walk"></div>
<p class="caveat">Walking is straight-line distance times ${esc(String(tacoTour.street_factor))} at ${esc(String(tacoTour.walk_kmh))} km/h, so treat every minute as a decent guess, not a route. A leg over ${esc(String(tacoTour.ride_over_km))} km is shown as a ride. Each stop gets ${esc(String(tacoTour.dwell_min))} minutes, and the planned stops are not reached before their planned time, so the slack in the plan shows up as waiting. Hollow dashed pins are approximate locations.</p>

<section class="tw-group" id="tw-group" hidden>
  <h2>What the group swiped</h2>
  <p class="caveat">Everyone has a personal link to <a href="swipe.html">swipe yes or no</a> on every taco place; Ryan sends them out. Counts can trail a new swipe by about a minute. Who said what is on <a href="results.html">the taco votes page</a>. <span id="tw-voters"></span></p>
  <ol class="tw-sugg" id="tw-group-list"></ol>
</section>

<h2>The route</h2>
<ol class="tw-stops" id="tw-stops"></ol>

<h2>Suggestions</h2>
<p class="caveat">Every taco place on the map that is not on your route, cheapest first: the extra walking it costs to slot it in at its best position. Hours are checked at the time you would arrive on ${esc(dayName)} ${esc(shortDate(iso(tacoTour.date)))}, and for ${esc(DOW[nextDay.getUTCDay()])} ${esc(shortDate(iso(nextDay.toISOString().slice(0, 10))))} in case the day slips.</p>
<ol class="tw-sugg" id="tw-sugg"></ol>
<p><button type="button" class="tw-btn" id="tw-more" hidden>Show all</button></p>

<div class="note warn">
  <div class="nh">Before anyone goes</div>
  <ul>${tacoTour.notes.map((n) => `<li>${nt(n)}</li>`).join('')}</ul>
</div>

<div class="note">
  <div class="nh">Still waiting on a Maps link</div>
  <p>${tacoTour.unverified.map((n) => esc(n)).join(', ')}. None of these turned up as a Mexico City listing. Send the Google Maps link or Instagram handle and each one becomes a pin: add it to <code>data/places.yml</code> with <code>category: taco</code> and an address, run <code>npm run geocode</code> and <code>npm run build</code>, and it appears in the suggestions above, ranked by detour.</p>
  ${unplaced.length ? `<p>On file but not yet geocoded: ${unplaced.map((p) => esc(p.name)).join(', ')}.</p>` : ''}
</div>

<noscript><p class="caveat">The route editor needs JavaScript. The plan is ${tacoTour.stops.map((s) => esc(s.name)).join(', then ')}.</p></noscript>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
  integrity="sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb" crossorigin="anonymous">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
  integrity="sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO" crossorigin="anonymous"></script>
<script>
(function () {
  var DATA = ${JSON.stringify(payload)};
  var T = DATA.tour;
  var BY = {};
  DATA.places.forEach(function (p) { BY[p.id] = p; });
  var STORE = 'taco-walk-route';
  var DOWS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var DOW_LONG = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };

  // ---------- state ----------

  function clean(list) {
    var seen = {};
    return list.filter(function (id) {
      if (!BY[id] || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }
  function fromHash() {
    var m = /(?:^|[#&])r=([^&]*)/.exec(location.hash);
    if (!m) return null;
    return clean(decodeURIComponent(m[1]).split('.').filter(Boolean));
  }
  function fromStore() {
    try { var v = localStorage.getItem(STORE); return v ? clean(v.split('.')) : null; } catch (e) { return null; }
  }
  var route = fromHash() || fromStore() || T.seed.slice();

  function isSeed() { return route.join('.') === T.seed.join('.'); }
  function save() {
    var h = isSeed() ? '' : '#r=' + route.join('.');
    try { history.replaceState(null, '', location.pathname + location.search + h); } catch (e) { location.hash = h; }
    try { if (isSeed()) localStorage.removeItem(STORE); else localStorage.setItem(STORE, route.join('.')); } catch (e) {}
  }

  // ---------- geometry and time ----------

  function crow(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var h = Math.pow(Math.sin(dLat / 2), 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.pow(Math.sin(dLon / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function km(a, b) { return crow(a, b) * T.factor; }
  // A ride is a pickup wait plus city traffic at about 18 km/h.
  function leg(a, b) {
    var k = km(a, b);
    var ride = k > T.rideOver;
    return { km: k, ride: ride, min: ride ? Math.round(8 + (k / 18) * 60) : Math.ceil((k / T.kmh) * 60) };
  }
  function toMin(hhmm) { var s = hhmm.split(':'); return +s[0] * 60 + +s[1]; }
  function clock(m) {
    m = ((Math.round(m) % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }
  function fmtKm(k) { return k < 1 ? Math.round(k * 1000 / 10) * 10 + ' m' : k.toFixed(1) + ' km'; }
  function fmtMin(m) { return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : ''); }

  // Arrival time at each stop in a list, meeting at T.meet at the first one.
  // The ride from the house to stop one is not counted: the plan already says
  // meet there.
  function schedule(list) {
    var t = toMin(T.meet), out = [], walkKm = 0, walkMin = 0, rides = 0;
    for (var i = 0; i < list.length; i++) {
      var l = i ? leg(BY[list[i - 1]], BY[list[i]]) : null;
      if (l) {
        t += l.min;
        if (l.ride) rides++; else { walkKm += l.km; walkMin += l.min; }
      }
      var wait = 0;
      // Only while the stop is still in its planned slot: moved, its planned
      // time means nothing and would just strand the group.
      if (BY[list[i]].at && BY[list[i]].slot === i && toMin(BY[list[i]].at) > t) { wait = toMin(BY[list[i]].at) - t; t += wait; }
      out.push({ id: list[i], arrive: t, leg: l, wait: wait });
      t += T.dwell;
    }
    return { stops: out, end: t, walkKm: walkKm, walkMin: walkMin, rides: rides };
  }

  // ---------- hours ----------

  var D0 = new Date(T.date + 'T12:00:00Z');
  var DAY0 = DOWS[D0.getUTCDay()];
  var DAY1 = DOWS[(D0.getUTCDay() + 1) % 7];

  function span(str) {
    var p = str.split('-'), o = toMin(p[0]), c = toMin(p[1]);
    if (c <= o) c += 1440;
    return [o, c];
  }
  // open | closed | unknown, at minute m of weekday day. The previous day's
  // hours count too, because a stand open until 04:00 is still open at 01:00.
  function openAt(hours, day, m) {
    if (!hours) return { state: 'unknown' };
    var di = DOWS.indexOf(day), prev = DOWS[(di + 6) % 7];
    if (hours[prev]) { var sp = span(hours[prev]); if (m + 1440 >= sp[0] && m + 1440 < sp[1]) return { state: 'open', until: sp[1] - 1440 }; }
    if (!hours[day]) return { state: 'unknown' };
    var s = span(hours[day]);
    if (m >= s[0] && m < s[1]) return { state: 'open', until: s[1], soon: s[1] - m < T.dwell };
    return { state: 'closed', opens: m < s[0] ? s[0] : null };
  }
  function hoursLine(p, m) {
    var parts = [[DAY0, true], [DAY1, false]].map(function (d) {
      var r = openAt(p.hours, d[0], m), lbl = DOW_LONG[d[0]] + ' ' + clock(m) + ': ';
      if (r.state === 'unknown') return '<span class="tw-h tw-h--unk">' + lbl + 'hours unknown</span>';
      if (r.state === 'closed') return '<span class="tw-h tw-h--bad">' + lbl + 'closed' + (r.opens != null ? ', opens ' + clock(r.opens) : '') + '</span>';
      return '<span class="tw-h ' + (r.soon ? 'tw-h--bad' : 'tw-h--ok') + '">' + lbl + 'open' + (r.soon ? ', closes ' + clock(r.until) : ' to ' + clock(r.until)) + '</span>';
    });
    return '<div class="tw-hours">' + parts.join('') +
      (p.hoursSrc ? '<span class="tw-src">' + p.hoursSrc + '</span>' : '') +
      '<span class="tw-src">31 Dec: regular hours only, many places shut in the afternoon.</span></div>';
  }

  // ---------- suggestions ----------

  // Cheapest place to slot each off-route taco place into: before the first
  // stop, between any two, or after the last. Cost is extra walking.
  function suggestions() {
    var onRoute = {};
    route.forEach(function (id) { onRoute[id] = true; });
    return DATA.places.filter(function (p) { return !onRoute[p.id]; }).map(function (p) {
      var best = null;
      for (var i = 0; i <= route.length; i++) {
        var a = i ? BY[route[i - 1]] : null, b = i < route.length ? BY[route[i]] : null;
        var add = (a ? km(a, p) : 0) + (b ? km(p, b) : 0) - (a && b ? km(a, b) : 0);
        if (!a && !b) add = 0;
        if (!best || add < best.add) best = { at: i, add: add, a: a, b: b };
      }
      return { p: p, at: best.at, add: Math.max(0, best.add), a: best.a, b: best.b };
    }).sort(function (x, y) { return x.add - y.add; });
  }

  // ---------- map ----------

  var mapEl = document.getElementById('map');
  var map = null, layer = null;
${PIN_JS}
  if (window.L && mapEl) {
    map = L.map(mapEl, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.control.scale({ position: 'bottomleft', metric: true, imperial: true, maxWidth: 150 }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
  } else if (mapEl) {
    mapEl.innerHTML = '<p style="padding:20px">Map could not load. The route below still works.</p>';
  }

  var fitted = false;
  function drawMap(sched) {
    if (!map) return;
    layer.clearLayers();
    var size = PIN_SIZE.base, anchor = [size / 2, Math.round(size * (21 / 24))];
    var pos = {};
    route.forEach(function (id, i) { pos[id] = i + 1; });

    if (DATA.stay) {
      var sEl = buildPinEl({ c: 'stay', approx: true, prot: [] }, DATA.stayColour, DATA.stayInk);
      L.marker([DATA.stay.lat, DATA.stay.lon], {
        icon: L.divIcon({ html: sEl, className: '', iconSize: [size, size], iconAnchor: anchor }),
        alt: 'The house, approximate', keyboard: false
      }).bindTooltip('The house (approximate area)', { direction: 'top', offset: [0, -20] }).addTo(layer);
    }

    // Route line, dashed where a leg is a ride.
    sched.stops.forEach(function (s, i) {
      if (!i) return;
      var a = BY[route[i - 1]], b = BY[s.id];
      L.polyline([[a.lat, a.lon], [b.lat, b.lon]], {
        color: DATA.colour, weight: 3, opacity: 0.85, dashArray: s.leg.ride ? '2 8' : null
      }).addTo(layer);
    });

    DATA.places.forEach(function (p) {
      var n = pos[p.id];
      var el = buildPinEl(p, DATA.colour, DATA.ink);
      if (n) {
        var num = document.createElement('span');
        num.className = 'tw-num';
        num.textContent = String(n);
        el.appendChild(num);
      } else {
        el.classList.add('tw-off');
      }
      var m = L.marker([p.lat, p.lon], {
        icon: L.divIcon({ html: el, className: '', iconSize: [size, size], iconAnchor: anchor, popupAnchor: [0, -anchor[1] + 4] }),
        alt: p.n, riseOnHover: true, zIndexOffset: n ? 1000 : 0
      });
      var html = '<strong>' + p.n + '</strong>' + (p.hood ? '<br><span style="opacity:.7">' + p.hood + '</span>' : '') +
        (p.tags || '') +
        '<div class="tw-pop"><button type="button" class="tw-btn tw-btn--main" data-act="' + (n ? 'drop' : 'add') + '" data-id="' + p.id + '">' +
        (n ? 'Drop stop ' + n : 'Add to the route') + '</button></div>' +
        (p.links || '');
      m.bindPopup(html, { maxWidth: 260 });
      m.bindTooltip((n ? n + '. ' : '') + p.n, { direction: 'top', offset: [0, -20] });
      m.addTo(layer);
    });

    if (!fitted) {
      var pts = route.map(function (id) { return [BY[id].lat, BY[id].lon]; });
      if (DATA.stay) pts.push([DATA.stay.lat, DATA.stay.lon]);
      if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30] });
      else map.setView(pts[0] || [19.41, -99.16], 14);
      fitted = true;
    }
  }

  // ---------- group swipes ----------

  // Fetched once. Off the network the page still works, it just shows no
  // votes.
  var TALLY = null;
  if (T.api && window.fetch) {
    fetch(T.api + '/tally').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && j.items) { TALLY = j; render(); }
    }).catch(function () {});
  }
  function chip(id) {
    var t = TALLY && TALLY.items[id];
    if (!t || (!t.yes.length && !t.no.length)) return '';
    return '<div class="tw-votes"><span class="tw-v tw-v--yes" title="' + (t.yes.join(', ') || 'nobody') + '">' + t.yes.length + ' yes</span>' +
      '<span class="tw-v tw-v--no" title="' + (t.no.join(', ') || 'nobody') + '">' + t.no.length + ' no</span>' +
      (t.yes.length ? '<span class="tw-vn">' + t.yes.join(', ') + '</span>' : '') + '</div>';
  }
  function renderGroup() {
    var box = document.getElementById('tw-group');
    if (!TALLY) { box.hidden = true; return; }
    box.hidden = false;
    document.getElementById('tw-voters').textContent = TALLY.voters + ' of the group ' + (TALLY.voters === 1 ? 'has' : 'have') + ' swiped so far.';
    var rows = DATA.places.map(function (p) {
      var t = TALLY.items[p.id] || { yes: [], no: [] };
      return { p: p, y: t.yes.length, n: t.no.length };
    }).filter(function (r) { return r.y || r.n; }).sort(function (a, b) { return (b.y - b.n) - (a.y - a.n) || b.y - a.y; });
    document.getElementById('tw-group-list').innerHTML = rows.length ? rows.map(function (r) {
      var i = route.indexOf(r.p.id);
      return '<li class="tw-sg"><div class="tw-top"><div class="tw-name"><strong>' + r.p.n + '</strong>' +
        '<div class="tw-meta">' + (i > -1 ? 'Stop ' + (i + 1) + ' on your route' : 'Not on your route') + (r.p.hood ? ' &middot; ' + r.p.hood : '') + '</div></div>' +
        (i < 0 ? '<div class="tw-ctl">' + btn('add', r.p.id, 'Add', 'Add ' + r.p.n + ' to the route') + '</div>' : '') +
        '</div>' + chip(r.p.id) + '</li>';
    }).join('') : '<li class="caveat">No swipes yet.</li>';
  }

  // ---------- lists ----------

  var stopsEl = document.getElementById('tw-stops');
  var suggEl = document.getElementById('tw-sugg');
  var totalsEl = document.getElementById('tw-totals');
  var headEl = document.getElementById('tw-head');
  var moreBtn = document.getElementById('tw-more');
  var showAll = false;
  var SUGG_SHOWN = 6;

  function btn(act, id, label, title, disabled) {
    return '<button type="button" class="tw-btn tw-btn--sm" data-act="' + act + '" data-id="' + id + '"' +
      (title ? ' title="' + title + '" aria-label="' + title + '"' : '') + (disabled ? ' disabled' : '') + '>' + label + '</button>';
  }

  function render() {
    var sched = schedule(route);

    headEl.textContent = route.length + ' stop' + (route.length === 1 ? '' : 's');
    totalsEl.innerHTML = route.length
      ? '<div><b>Walking</b>' + fmtKm(sched.walkKm) + '</div>' +
        '<div><b>On foot</b>' + fmtMin(sched.walkMin) + '</div>' +
        '<div><b>Rides</b>' + sched.rides + '</div>' +
        '<div><b>Done by</b>' + clock(sched.end) + '</div>'
      : '<div><b>Route</b>empty, add a stop from the suggestions</div>';

    stopsEl.innerHTML = sched.stops.map(function (s, i) {
      var p = BY[s.id];
      var legHtml = s.leg
        ? '<div class="tw-leg">' + (s.leg.ride ? 'Ride, about ' : 'Walk ') + fmtKm(s.leg.km) + ', ' + s.leg.min + ' min</div>'
        : (DATA.stay ? '<div class="tw-leg">' + fmtKm(km(DATA.stay, p)) + ' from the house pin' + (km(DATA.stay, p) > T.rideOver ? ', a ride' : '') + '</div>' : '');
      var bk = p.backup && BY[p.backup] && route.indexOf(p.backup) < 0 ? BY[p.backup] : null;
      return '<li class="tw-stop">' + legHtml +
        '<div class="tw-card">' +
        '<div class="tw-top"><span class="tw-num tw-num--list">' + (i + 1) + '</span>' +
        '<div class="tw-name"><strong>' + p.n + '</strong>' + (p.approx ? ' <small>approximate</small>' : '') +
        '<div class="tw-meta">' + clock(s.arrive) + ' to ' + clock(s.arrive + T.dwell) + (p.hood ? ' &middot; ' + p.hood : '') + '</div>' +
        (s.wait >= 5 ? '<div class="tw-meta">Planned for ' + p.at + ', so ' + fmtMin(s.wait) + ' of slack before it</div>' : '') + '</div>' +
        '<div class="tw-ctl">' +
        btn('up', p.id, '&uarr;', 'Move ' + p.n + ' earlier', i === 0) +
        btn('down', p.id, '&darr;', 'Move ' + p.n + ' later', i === route.length - 1) +
        btn('drop', p.id, 'Drop', 'Drop ' + p.n) +
        '</div></div>' +
        (p.tags || '') + chip(p.id) +
        (p.order ? '<p class="tw-order"><b>Order</b> ' + p.order + '</p>' : '') +
        hoursLine(p, s.arrive) +
        (bk ? '<p class="tw-bk">Backup: <strong>' + bk.n + '</strong>, ' + fmtKm(km(p, bk)) + ' away. ' + btn('swap', p.id, 'Swap in', 'Swap ' + p.n + ' for ' + bk.n) + '</p>' : '') +
        (p.note ? '<details><summary>Notes</summary><p>' + p.note + '</p></details>' : '') +
        (p.links || '') +
        '</div></li>';
    }).join('');

    var sugg = suggestions();
    var shown = showAll ? sugg : sugg.slice(0, SUGG_SHOWN);
    suggEl.innerHTML = shown.map(function (s) {
      var p = s.p;
      var trial = route.slice(); trial.splice(s.at, 0, p.id);
      var arrive = schedule(trial).stops[s.at].arrive;
      var where = !route.length ? 'Start here'
        : s.a && s.b ? 'Between ' + (s.at) + ' and ' + (s.at + 1)
        : s.a ? 'After stop ' + route.length : 'Before stop 1';
      var cost = s.add < 0.05 ? 'on the way, no extra walking'
        : s.add > T.rideOver ? 'a ride, ' + fmtKm(s.add) + ' extra'
        : '+' + fmtKm(s.add) + ', about +' + Math.ceil((s.add / T.kmh) * 60) + ' min walking';
      return '<li class="tw-sg">' +
        '<div class="tw-top"><div class="tw-name"><strong>' + p.n + '</strong>' +
        '<div class="tw-meta">' + where + ' &middot; ' + cost + (p.hood ? ' &middot; ' + p.hood : '') + '</div>' +
        (p.backupFor ? '<div class="tw-meta">The plan\\'s backup for ' + p.backupFor + '</div>' : '') +
        '</div><div class="tw-ctl">' + btn('add', p.id, 'Add', 'Add ' + p.n + ' to the route') + '</div></div>' +
        (p.tags || '') + chip(p.id) + hoursLine(p, arrive) + '</li>';
    }).join('');
    moreBtn.hidden = sugg.length <= SUGG_SHOWN;
    moreBtn.textContent = showAll ? 'Show fewer' : 'Show all ' + sugg.length;

    renderGroup();
    drawMap(sched);
  }

  // ---------- actions ----------

  function act(a, id) {
    var i = route.indexOf(id);
    if (a === 'up' && i > 0) { route.splice(i, 1); route.splice(i - 1, 0, id); }
    else if (a === 'down' && i > -1 && i < route.length - 1) { route.splice(i, 1); route.splice(i + 1, 0, id); }
    else if (a === 'drop' && i > -1) route.splice(i, 1);
    else if (a === 'swap' && i > -1 && BY[id].backup) route[i] = BY[id].backup;
    else if (a === 'add' && i < 0) {
      var s = suggestions().filter(function (x) { return x.p.id === id; })[0];
      route.splice(s ? s.at : route.length, 0, id);
    } else return;
    if (map) map.closePopup();
    save();
    render();
    var f = document.querySelector('[data-act="' + a + '"][data-id="' + id + '"]');
    if (f && (a === 'up' || a === 'down')) f.focus();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button[data-act]');
    if (b && !b.disabled) act(b.getAttribute('data-act'), b.getAttribute('data-id'));
  });

  var statusEl = document.getElementById('tw-status');
  function say(msg) { statusEl.textContent = msg; setTimeout(function () { statusEl.textContent = ''; }, 4000); }

  document.getElementById('tw-copy').addEventListener('click', function () {
    var url = location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { say('Copied. Paste it in the group chat.'); },
        function () { window.prompt('Copy this link:', url); });
    } else window.prompt('Copy this link:', url);
  });
  document.getElementById('tw-reset').addEventListener('click', function () {
    route = T.seed.slice(); save(); render(); say('Back to the plan.');
  });
  moreBtn.addEventListener('click', function () { showAll = !showAll; render(); });
  window.addEventListener('hashchange', function () {
    var r = fromHash(); route = r || T.seed.slice(); render();
  });

  save();
  render();
})();
</script>`;

  return shell({ title: 'The taco walk', current: 'tacos.html', body });
}

// ---------- taco swipe ----------

// One deck of every taco place, swiped yes or no from a personal link. The
// deck itself is components/swipe-deck, which knows nothing about this trip;
// this page supplies the cards and an adapter that talks to the swipe-votes
// worker. The token arrives in the address once, moves to the browser's
// storage and leaves the address, so a screenshot or a forwarded tab does
// not carry it.
// SWIPE_API points the pages at another copy of the worker, such as
// `wrangler dev` on localhost, so the deck can be tested without real links.
const SWIPE_API = process.env.SWIPE_API || tacoTour.swipe?.api || null;
const SWIPE_JS = readFileSync(join(root, 'components', 'swipe-deck', 'swipe-deck.js'), 'utf8');
const SWIPE_HASH = createHash('sha256').update(SWIPE_JS).digest('hex').slice(0, 8);

const DAY_SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

// Every Mexico City taco place in deck order: the plan first, in order, then
// its backups, then everything else. The deck and the results page share it.
function swipePlaces() {
  const pos = (p) => (p.lat && p.lon ? { lat: p.lat, lon: p.lon } : geocache[p.address]);
  const tacos = placesDoc.places.filter((p) => p.category === 'taco' && (p.region || 'cdmx') === 'cdmx' && pos(p));
  const planIdx = (p) => tacoTour.stops.findIndex((s) => s.name === p.name);
  const backupOf = (p) => tacoTour.stops.find((s) => s.backup === p.name);
  const rank = (p) => (planIdx(p) > -1 ? planIdx(p) : backupOf(p) ? 100 : 200);
  return tacos
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
    .map(({ p }) => ({
      p,
      id: slug(p.name),
      role: planIdx(p) > -1 ? `Stop ${planIdx(p) + 1} on the plan` : backupOf(p) ? `Backup for ${backupOf(p).name}` : 'Not on the plan',
    }));
}

function buildTacoSwipe() {
  const tourDate = new Date(`${iso(tacoTour.date)}T12:00:00Z`);
  const tourDay = WEEKDAYS[tourDate.getUTCDay()];
  const tourDayLabel = `${DAY_SHORT[tourDay]} ${tourDate.getUTCDate()} ${tourDate.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`;
  const places = swipePlaces();
  const cards = places
    .map(({ p, role }) => {
      const seed = tacoTour.stops.find((s) => s.name === p.name);
      const order = p.order || [];
      const colour = placesDoc.categories.taco.color;
      const hoursToday = p.hours?.[tourDay];
      const week = p.hours
        ? `<ul class="sw-week">${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
            .map((d) => `<li${d === tourDay ? ' class="is-day"' : ''}><span>${DAY_SHORT[d]}</span>${esc(p.hours[d] || 'not on file')}</li>`)
            .join('')}</ul>` +
          (p.hours_source ? `<p class="sw-src">${esc(p.hours_source)}</p>` : '')
        : '<p>Not on file. Check Maps or Instagram before going.</p>';
      return {
        id: slug(p.name),
        html:
          `<div class="sw-card">` +
          `<div class="sw-band" style="--band:${esc(colour)}">${legendPin('taco', colour, 76)}` +
          `<div class="sw-badges">${proteinList(p).map(protBadgeHtml).join('')}</div>` +
          (p.michelin != null ? `<span class="sw-mich">${typeof p.michelin === 'number' ? starSvg(11).repeat(p.michelin) : ''}${esc(michWords(p.michelin))}</span>` : '') +
          `</div>` +
          `<h3>${esc(p.name)}</h3>` +
          `<p class="sw-meta">${[p.neighborhood, role].filter(Boolean).map(esc).join(' &middot; ')}</p>` +
          (p.known_for ? `<p class="sw-known">${esc(p.known_for)}</p>` : '') +
          (order.length
            ? `<p class="sw-get">Get</p><ul class="sw-order">${order.slice(0, 3).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>`
            : seed?.order ? `<p class="sw-get">Get</p><p class="sw-known">${esc(seed.order)}</p>` : '') +
          `</div>`,
        details:
          `<div class="sw-det">` +
          `<h4>${esc(p.name)}</h4>` +
          (p.known_for ? `<p class="sw-known">${esc(p.known_for)}</p>` : '') +
          (order.length || seed?.order
            ? `<h5>What to order</h5>` +
              (order.length ? `<ul class="sw-order">${order.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : '') +
              (seed?.order && !seed.order.split(',').every((x) => order.some((o) => o.toLowerCase().includes(x.trim().toLowerCase())))
                ? `<p>${order.length ? 'Plan says: ' : ''}${esc(seed.order)}</p>`
                : '')
            : '') +
          (p.price_mxn ? `<h5>Price</h5><p>About ${esc(p.price_mxn)} MXN a taco.</p>` : '') +
          `<h5>Hours${hoursToday ? `, ${esc(hoursToday)} on ${esc(tourDayLabel)}` : ''}</h5>${week}` +
          `<h5>On the plan</h5><p>${esc(role)}${seed?.at ? `, arriving ${esc(seed.at)}` : ''}.</p>` +
          (p.note ? `<h5>Notes</h5><p>${nt(p.note)}</p>` : '') +
          tagsHtml(p) +
          linkList(p) +
          `</div>`,
      };
    });

  const body = `<header class="masthead">
  <p class="eyebrow">Taco walk, ${esc(shortDate(iso(tacoTour.date)))}</p>
  <h1 id="sw-hi">Swipe the tacos</h1>
</header>

<p class="lede sw-msg" id="sw-lede">Right for yes, left for nope, up (or tap) for what to order, hours and the rest. Every taco place we have on the map, the plan's stops first. Your swipes save as you go and show up on <a href="results.html">the taco votes page</a> for everyone.</p>
<div class="note warn sw-msg" id="sw-err" hidden><p></p></div>

<swipe-deck yes-label="Yes" no-label="Nope" undo-label="Undo" details-label="Details" details-hint="Swipe up for the order" aria-label="Taco places: swipe or use the arrow keys, right for yes, left for nope, up for details"></swipe-deck>

<p class="caveat sw-msg">Keyboard: right arrow yes, left arrow nope, up arrow details, down arrow back, Backspace undo.</p>

<section class="sw-picks" id="sw-picks" hidden>
  <h2>Your picks</h2>
  <p class="caveat">Tap one to flip it. Everyone's together are on <a href="results.html">the taco votes page</a>.</p>
  <div class="sw-cols">
    <div><h3>Yes <span class="n" id="sw-yes-n"></span></h3><ul class="sw-pl" id="sw-yes"></ul></div>
    <div><h3>Nope <span class="n" id="sw-no-n"></span></h3><ul class="sw-pl" id="sw-no"></ul></div>
  </div>
</section>

<script type="module">
  import './assets/swipe-deck.js?v=${SWIPE_HASH}';
  var API = ${JSON.stringify(SWIPE_API)};
  var CARDS = ${JSON.stringify(cards)};
  var NAMES = ${JSON.stringify(Object.fromEntries(places.map((x) => [x.id, x.p.name])))};
  var KEY = 'swipe-token';
  var deck = document.querySelector('swipe-deck');
  var errBox = document.getElementById('sw-err');
  // Your answers, kept apart from the deck because "swipe them all again"
  // empties the deck's copy while the saved votes stand.
  var MINE = {};
  function pickItem(id, to) {
    var name = NAMES[id].replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    return '<li><button type="button" data-id="' + id + '" aria-label="' + name + ', change to ' + to + '">' + name + '<span>to ' + to + '</span></button></li>';
  }
  function renderPicks() {
    var ids = CARDS.map(function (c) { return c.id; }).filter(function (id) { return id in MINE; });
    var yes = ids.filter(function (id) { return MINE[id] > 0; });
    var no = ids.filter(function (id) { return MINE[id] < 0; });
    document.getElementById('sw-picks').hidden = !ids.length;
    document.getElementById('sw-yes-n').textContent = yes.length;
    document.getElementById('sw-no-n').textContent = no.length;
    document.getElementById('sw-yes').innerHTML = yes.map(function (id) { return pickItem(id, 'nope'); }).join('') || '<li class="none">None yet.</li>';
    document.getElementById('sw-no').innerHTML = no.map(function (id) { return pickItem(id, 'yes'); }).join('') || '<li class="none">None yet.</li>';
  }
  function fail(msg) { errBox.hidden = false; errBox.querySelector('p').textContent = msg; }

  var m = /(?:^|[#&])t=([A-Za-z0-9_-]+)/.exec(location.hash);
  var token = null;
  try {
    if (m) localStorage.setItem(KEY, m[1]);
    token = localStorage.getItem(KEY);
  } catch (e) { token = m ? m[1] : null; }
  if (m) history.replaceState(null, '', location.pathname + location.search);
  // A link opened on a tab already showing this page only changes the hash.
  window.addEventListener('hashchange', function () { if (/[#&]t=/.test(location.hash)) location.reload(); });

  if (!token) {
    deck.hidden = true;
    fail('This page needs your personal link. Ryan is sending one to each of us; open it on the phone you will use and it will remember you.');
  } else {
    var auth = { Authorization: 'Bearer ' + token };
    deck.adapter = {
      load: function () {
        return fetch(API + '/me', { headers: auth }).then(function (r) {
          if (r.status === 401) {
            try { localStorage.removeItem(KEY); } catch (e) {}
            throw new Error('That link no longer works. Ask Ryan for a fresh one.');
          }
          if (!r.ok) throw new Error('Could not load your swipes (' + r.status + ').');
          return r.json();
        }).then(function (j) {
          document.getElementById('sw-hi').textContent = 'Swipe the tacos, ' + j.name;
          MINE = Object.assign({}, j.votes || {});
          renderPicks();
          return j;
        });
      },
      save: function (id, vote) {
        return fetch(API + '/me', {
          method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
          body: JSON.stringify({ id: id, vote: vote })
        }).then(function (r) { if (!r.ok) throw new Error('save ' + r.status); });
      }
    };
    deck.items = CARDS;
    deck.addEventListener('swipe-deck:error', function (e) {
      var er = e.detail.error;
      fail(er && er.message && !/^save/.test(er.message) ? er.message : 'A swipe did not save. Check your connection and swipe that one again.');
      if (/no longer works/.test(er && er.message)) deck.hidden = true;
    });
    deck.addEventListener('swipe-deck:vote', function (e) {
      errBox.hidden = true;
      if (e.detail.vote) MINE[e.detail.id] = e.detail.vote; else delete MINE[e.detail.id];
      renderPicks();
    });
    deck.addEventListener('swipe-deck:done', function () {
      document.getElementById('sw-lede').innerHTML = 'All swiped. Your picks are below, and <a href="results.html">the taco votes page</a> has the whole group.';
    });
    document.getElementById('sw-picks').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]');
      if (b) deck.set(b.dataset.id, MINE[b.dataset.id] > 0 ? -1 : 1);
    });
    deck.focus({ preventScroll: true });
  }
</script>`;

  return shell({ title: 'Swipe the tacos', current: 'tacos.html', body });
}

// Public, no token: the tally endpoint is open, and it holds first names only.
function buildTacoResults() {
  const places = swipePlaces().map(({ p, id, role }) => ({ id, n: p.name, hood: p.neighborhood || '', role }));
  const people = travelers.groups.filter((g) => g.legs.includes('cdmx')).flatMap((g) => g.first_names || []);
  const body = `<header class="masthead">
  <p class="eyebrow">Taco walk, ${esc(shortDate(iso(tacoTour.date)))}</p>
  <h1>Taco votes</h1>
</header>

<p class="lede">How the group swiped every taco place, most yeses first. Everyone swipes on their own <a href="swipe.html">personal link</a>, which also lists your own picks once you have made some. A new swipe can take about a minute to show up here.</p>
<div class="note" id="rs-status"><p>Loading the votes...</p></div>
<p id="rs-who" class="caveat" hidden></p>
<ol class="rs-list" id="rs-list"></ol>
<p class="caveat">The route itself is on <a href="tacos.html">the taco walk</a>, where any place here can be added to it.</p>

<script>
  var API = ${JSON.stringify(SWIPE_API)};
  var PLACES = ${JSON.stringify(places)};
  var PEOPLE = ${JSON.stringify(people)};
  function e(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function status(msg) { var b = document.getElementById('rs-status'); b.hidden = !msg; b.querySelector('p').textContent = msg || ''; }
  function render(t) {
    var voted = {};
    Object.keys(t.items).forEach(function (id) { t.items[id].yes.concat(t.items[id].no).forEach(function (n) { voted[n] = 1; }); });
    var waiting = PEOPLE.filter(function (n) { return !voted[n]; });
    var count = PEOPLE.length - waiting.length;
    var who = document.getElementById('rs-who');
    who.hidden = false;
    who.textContent = count + ' of ' + PEOPLE.length + ' have swiped.' + (waiting.length ? ' Still to swipe: ' + waiting.join(', ') + '.' : ' Everyone is in.');
    var rows = PLACES.map(function (p, i) {
      var v = t.items[p.id] || { yes: [], no: [] };
      return { p: p, i: i, yes: v.yes, no: v.no };
    }).sort(function (a, b) { return b.yes.length - a.yes.length || a.no.length - b.no.length || a.i - b.i; });
    document.getElementById('rs-list').innerHTML = rows.map(function (r) {
      var y = r.yes.length, n = r.no.length, all = Math.max(count, y + n, 1);
      return '<li class="rs-row' + (y + n ? '' : ' rs-zero') + '">' +
        '<div class="rs-head"><strong>' + e(r.p.n) + '</strong><span class="rs-score">' + y + ' yes &middot; ' + n + ' no</span></div>' +
        '<div class="rs-meta">' + e([r.p.hood, r.p.role].filter(Boolean).join(' · ')) + '</div>' +
        '<div class="rs-bar" role="img" aria-label="' + y + ' yes, ' + n + ' no"><span class="y" style="width:' + (100 * y / all) + '%"></span><span class="n" style="width:' + (100 * n / all) + '%"></span></div>' +
        (y + n
          ? '<p class="rs-who">' + (y ? '<span class="y"><b>Yes</b>' + r.yes.map(e).join(', ') + '</span>' : '') + (y && n ? '<br>' : '') +
            (n ? '<span class="n"><b>No</b>' + r.no.map(e).join(', ') + '</span>' : '') + '</p>'
          : '<p class="rs-who">No votes yet.</p>') +
        '</li>';
    }).join('');
  }
  if (!API || !window.fetch) status('Votes are not connected on this copy of the site.');
  else fetch(API + '/tally').then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (t) { status(''); render(t); })
    .catch(function () { status('Could not load the votes. Check your connection and reload.'); });
</script>`;
  return shell({ title: 'Taco votes', current: 'results.html', body });
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

// ---------- flights tracker ----------

function buildFlights() {
  const tz = flightTracker.timezones || {};
  const all = flightTracker.bookings || [];
  const booked = all.filter((b) => b.status === 'booked');
  const waiting = all.filter((b) => b.status === 'pending');
  const selfRun = all.filter((b) => b.status === 'own_arrangement');
  const heads = booked.reduce((n, b) => n + (b.size || 0), 0);
  const selfHeads = selfRun.reduce((n, b) => n + (b.size || 0), 0);
  const total = all.reduce((n, b) => n + (b.size || 0), 0) - selfHeads;

  let b = `<header class="masthead">
  <p class="eyebrow">Updated ${esc(iso(flightTracker.updated))}</p>
  <h1>Who is on which flight</h1>
  <div class="dateline">
    <div><b>Booked</b>${heads} of ${total}</div>
    <div><b>Still to report</b>${total - heads}</div>
    <div><b>Paid so far</b>${usd(flightTracker.pricing_rollup?.paid_so_far_usd)}</div>
  </div>
</header>
<p class="lede">Every time shown is the local clock at that airport. Nothing here is converted into your own time zone, because the only times that matter are the ones on the departure board in front of you.</p>`;

  // the clock explainer
  b += `<h2><span class="num">01</span>What time it actually is</h2>
<div class="scroller"><table>
<caption>Local clock at each airport across this trip.</caption>
<thead><tr><th>Airport</th><th>Zone</th><th class="n">Offset</th><th>Why</th></tr></thead><tbody>`;
  for (const [code, z] of Object.entries(tz)) {
    b += `<tr><td><strong>${esc(code)}</strong></td><td><code>${esc(z.tz)}</code></td><td class="n">UTC${esc(z.offset_on_trip)}</td><td><small>${esc(z.note)}</small></td></tr>`;
  }
  b += `</tbody></table></div>
<div class="note">
  <div class="nh">Detroit, Atlanta and Cancun share a clock. Mexico City and Los Angeles do not</div>
  <p>Across these dates Detroit and Atlanta are on EST and Cancun never leaves UTC-5, so those three read the same. Mexico City sits an hour behind them and Los Angeles sits three hours behind. That is why the outbound looks like a 3 hour 50 minute hop on the clock when it is really 4 hours 50 in the air, why the flight home from Cancun reads honestly, and why the Atlanta to Los Angeles leg reads as a two hour hop when it is five hours in the air.</p>
</div>`;

  // booked
  b += `<h2><span class="num">02</span>Booked</h2>`;
  for (const g of booked) {
    // Somebody can be ticketed without telling us the fare. Everyone pays for
    // their own seats, so that is a normal state and not a gap to fill with
    // "TBD each".
    const money =
      g.paid_per_person_usd != null
        ? `<p><strong>${esc(g.cabin)}.</strong> ${usd(g.paid_usd_total)} for ${g.size}, ${usd(g.paid_per_person_usd)} each. Booked ${esc(iso(g.booked_on))}.</p>`
        : `<p><strong>Booked ${esc(iso(g.booked_on))}.</strong> ${nt(g.pricing?.note)}</p>`;
    b += `<div class="note">
  <div class="nh">${esc(g.label)}, ${g.size} ${g.size === 1 ? 'seat' : 'seats'}</div>
  <p>${nt(g.ticket)}</p>
  ${money}
</div>
<div class="scroller"><table>
<caption>${esc(g.label)}. Times are local to each airport.</caption>
<thead><tr><th>Flight</th><th>Date</th><th>Route</th><th>Departs</th><th>Arrives</th><th class="n">In the air</th></tr></thead><tbody>`;
    for (const s of g.segments || []) {
      const metal = [s.aircraft, s.operated_by && `operated by ${s.operated_by}`]
        .filter(Boolean)
        .join(', ');
      // One booking can hold two cabins. Krysta and Ryan fly Comfort out and
      // First home on the same record, so the cabin belongs on the segment
      // rather than once at the top of the group.
      const cabin = s.cabin ? `<br><small><strong>${esc(s.cabin)}</strong></small>` : '';
      b += `<tr><td><strong>${esc(s.flight)}</strong>${cabin}<br><small>${esc(metal)}</small></td>
<td>${esc(shortDate(s.date))}</td>
<td>${esc(s.from)} to ${esc(s.to)}<br><small>${s.stops === 0 ? 'nonstop' : esc(String(s.stops)) + ' stop'}</small></td>
<td><strong>${esc(s.depart_local)}</strong><br><small>local in ${esc(s.from)}</small></td>
<td><strong>${esc(s.arrive_local)}</strong><br><small>local in ${esc(s.to)}</small></td>
<td class="n">${esc(s.elapsed)}</td></tr>`;
    }
    b += `</tbody></table></div>`;
    if (g.arrives_with_the_hosts) {
      b += `<div class="note"><div class="nh">He lands fifteen minutes after Krysta and Ryan</div><p>${nt(g.arrives_with_the_hosts)}</p></div>`;
    }
    if (g.atl_connection_is_tight) {
      b += `<div class="note warn"><div class="nh">An hour and twenty five minutes at Atlanta</div><p>${nt(g.atl_connection_is_tight)}</p></div>`;
    }
    if (g.still_to_book) {
      b += `<div class="note"><div class="nh">Still to book</div><p>${nt(g.still_to_book)}</p></div>`;
    }
  }

  // waiting
  b += `<h2><span class="num">03</span>Still to report</h2>
<p class="lede">These are the people whose flights nobody has yet. If that is you, the list further down is everything needed.</p>
<div class="scroller"><table>
<thead><tr><th>Who</th><th class="n">Seats</th><th>Legs they need</th><th class="n">Budget each</th><th>Status</th></tr></thead><tbody>`;
  for (const g of waiting) {
    const p = g.pricing || {};
    b += `<tr><td><strong>${esc(g.label)}</strong>${g.note ? `<br><small>${nt(g.note)}</small>` : ''}</td>
<td class="n">${g.size}</td>
<td><small>${(g.legs_needed || []).map((l) => esc(l)).join(', ')}</small></td>
<td class="n">${usd(p.expected_per_person_usd)}${p.warning ? '<br><small>weak number</small>' : ''}</td>
<td><span class="tag open">${esc(g.status)}</span></td></tr>`;
  }
  b += `</tbody></table></div>`;
  for (const g of selfRun) {
    b += `<div class="note">
  <div class="nh">${esc(g.label)} is arranging their own</div>
  <p>${nt(g.note)}</p>
</div>`;
  }

  // pricing
  const pr = flightTracker.pricing_reference || {};
  const roll = flightTracker.pricing_rollup || {};
  b += `<h2><span class="num">04</span>What a seat costs now</h2>
<p class="lede">Nobody owes this to anybody. Everyone books and pays for their own flights, so these are reference figures to sanity check a quote against before you buy.</p>
<div class="scroller"><table>
<caption>Per person, one way each, priced ${esc(iso(pr.as_of))}. <span class="tag quoted">quoted</span></caption>
<thead><tr><th>Leg</th><th class="n">Per person</th></tr></thead><tbody>
<tr><td>DTW to MEX, 29 Dec</td><td class="n">${usd(pr.beach_bound_reference?.legs?.out)}</td></tr>
<tr><td>MEX to CUN, 3 Jan<br><small>Aeromexico Basic plus a prepaid bag</small></td><td class="n">${usd(pr.beach_bound_reference?.legs?.to_beach)}</td></tr>
<tr><td>CUN to DTW, 8 Jan</td><td class="n">${usd(pr.beach_bound_reference?.legs?.home)}</td></tr>
<tr class="sum"><td>Budget per person</td><td class="n"><strong>${usd(pr.beach_bound_reference?.per_person_usd)}</strong></td></tr>
</tbody></table></div>
<div class="note">
  <div class="nh">The cheap outbound fare is gone</div>
  <p>${nt(pr.the_890_is_gone)}</p>
</div>
<div class="note">
  <div class="nh">Bags</div>
  <p>${nt(pr.bags)}</p>
</div>
<div class="scroller"><table>
<caption>Where the trip's air spend stands, across the ${roll.travellers_tracked} whose flights we coordinate.</caption>
<thead><tr><th>&nbsp;</th><th class="n">USD</th></tr></thead><tbody>
<tr><td>Paid so far</td><td class="n">${usd(roll.paid_so_far_usd)}</td></tr>
<tr><td>Still to be spent</td><td class="n">${usd(roll.expected_remaining_usd)}</td></tr>
<tr class="sum"><td>Expected total, air only</td><td class="n"><strong>${usd(roll.expected_trip_total_usd)}</strong></td></tr>
</tbody></table></div>
<p>${nt(roll.note)}</p>`;

  // coordination
  const co = flightTracker.coordination || {};
  b += `<h2><span class="num">05</span>The Cancun leg, and the bag trap</h2>`;
  if (co.mex_cun_2027_01_03) {
    b += `<div class="note"><div class="nh">Be on the same aircraft</div><p>${nt(co.mex_cun_2027_01_03)}</p></div>`;
  }
  if (co.mex_cun_baggage) {
    b += `<div class="note"><div class="nh">Read this before you book the Cancun hop</div><p>${nt(co.mex_cun_baggage)}</p></div>`;
  }
  const bl = flights.booking_links || {};
  const beach = (flights.flights || []).find((l) => l.id === 'to_beach') || {};
  const rej = beach.rejected_main_cabin || {};
  const href = (u) => esc(String(u || '').trim());
  if (beach.hosts_ticketed) {
    b += `<div class="note">
  <div class="nh">Krysta and Ryan are already on this flight</div>
  <p>${nt(beach.hosts_ticketed)}</p>
</div>`;
  }
  b += `<div class="note">
  <div class="nh">Book it</div>
  <p>These open Aeromexico's own booking engine already set to this route and date, so the fares load straight away. Pick <strong>${esc(beach.number || beach.carrier)}</strong>, the <strong>${esc(beach.depart)}</strong> departure, and the <strong>AM Plus Classic</strong> fare. Delta cannot sell this route at all, so do not go looking for it there.</p>
  <ul>
    <li><a href="${href(bl.mex_cun_two)}">Mexico City to Cancun, 3 January, for 2</a></li>
    <li><a href="${href(bl.mex_cun_six)}">Mexico City to Cancun, 3 January, for 6</a></li>
  </ul>
  <p>For a different party size, change <code>A2</code> near the end of the link to the number of adults. The fare comes back identical at 1, 2 and 6, so the count does not move the per-person price.</p>
</div>
<div class="scroller"><table>
<caption>Per person, priced on aeromexico.com ${esc(iso(beach.repriced || flights.priced))}. Every fare sold on this departure, not just the one to buy. <span class="tag quoted">quoted</span></caption>
<thead><tr><th>Fare</th><th class="n">Each</th><th>Checked bag</th><th>Departure</th></tr></thead><tbody>
<tr class="pick"><td><strong>AM Plus Classic</strong><br><small>the plan, bag and legroom seat included</small></td><td class="n">${usd(beach.price_usd)}</td><td>Included</td><td><strong>${esc(beach.depart)}</strong></td></tr>
<tr><td>Main Basic<br><small>plus a bag bought online, about $27</small></td><td class="n">${usd(rej.ladder_usd?.basic)}</td><td>Extra</td><td><strong>${esc(beach.depart)}</strong></td></tr>
<tr><td>Main Flex<br><small>the expensive one, and still no bag</small></td><td class="n">${usd(rej.ladder_usd?.flex)}</td><td>Extra</td><td><strong>${esc(beach.depart)}</strong></td></tr>
</tbody></table></div>
<div class="note">
  <div class="nh">No Main Cabin fare includes a checked bag</div>
  <p>${nt(rej.why)}</p>
</div>
<div class="note">
  <div class="nh">Why the Cancun hop moved an hour later</div>
  <p>${nt(beach.why_the_time_moved)}</p>
</div>
`;
  if (co.dtw_mex_2026_12_29) {
    b += `<div class="note"><div class="nh">Do not book the outbound as one group</div><p>${nt(co.dtw_mex_2026_12_29)}</p></div>`;
  }

  // what to send
  b += `<h2><span class="num">06</span>What to send Ryan</h2>
<div class="note">
  <div class="nh">For each leg you have booked</div>
  <ul>`;
  for (const item of flightTracker.collect_from_everyone || []) {
    b += `<li>${nt(item)}</li>`;
  }
  b += `</ul>
</div>
<div class="note">
  <div class="nh">Not confirmation numbers</div>
  <p>Flight numbers and times are fine to share and fine to keep here. Record locators are not: this page is generated from a file in a git repository, and anybody holding a locator and a surname can change or cancel a booking. Keep yours to yourself.</p>
</div>`;

  return shell({ title: 'Who is on which flight', current: 'flights.html', body: b });
}

// ---------- write ----------

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'assets'), { recursive: true });

writeFileSync(join(out, 'assets', 'style.css'), CSS);
writeFileSync(join(out, '.nojekyll'), '');
writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

writeFileSync(join(out, 'index.html'), buildIndex());
writeFileSync(join(out, 'itinerary.html'), buildItinerary());
writeFileSync(join(out, 'flights.html'), buildFlights());
writeFileSync(join(out, 'costs.html'), buildCosts());
writeFileSync(join(out, 'stays.html'), buildStays());
writeFileSync(join(out, 'map.html'), buildMap('cdmx'));
writeFileSync(join(out, 'riviera-map.html'), buildMap('riviera'));
writeFileSync(join(out, 'tacos.html'), buildTacos());
writeFileSync(join(out, 'swipe.html'), buildTacoSwipe());
writeFileSync(join(out, 'results.html'), buildTacoResults());
writeFileSync(join(out, 'assets', 'swipe-deck.js'), SWIPE_JS);
writeFileSync(join(out, 'tasks.html'), buildTasks());
writeFileSync(join(out, 'dining.html'), buildDoc('dining.md', 'dining.html', 'The birthday'));
writeFileSync(join(out, 'nye.html'), buildDoc('nye.md', 'nye.html', "New Year's Eve"));
writeFileSync(join(out, 'decisions.html'), buildDoc('decisions.md', 'decisions.html', 'Decision log'));
writeFileSync(join(out, 'open-questions.html'), buildDoc('open-questions.md', 'open-questions.html', 'Open questions'));

const built = readdirSync(out).filter((f) => f.endsWith('.html'));
console.log(`built ${built.length} pages into site/: ${built.join(', ')}`);
