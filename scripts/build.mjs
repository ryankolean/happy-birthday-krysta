// Builds site/ from data/*.yml and docs/*.md.
// data/ is the source of truth. Never hand-edit anything under site/.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
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

const PAGES = [
  { file: 'index.html', label: 'The trip' },
  { file: 'itinerary.html', label: 'Itinerary' },
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
<link rel="stylesheet" href="assets/style.css">
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
  counter-increment: t; display: grid; grid-template-columns: 30px 1fr;
  gap: 2px 14px; padding: 15px 0; border-bottom: 1px solid var(--rule); font-size: 14.5px;
}
ol.tasks li::before {
  content: counter(t, decimal-leading-zero);
  font-family: var(--f-mono); font-size: 11.5px; font-weight: 500; color: var(--teal); padding-top: 4px;
}
ol.tasks .tt { color: var(--ink); font-weight: 600; }
ol.tasks .tw { color: var(--muted); font-size: 13.5px; margin-top: 3px; line-height: 1.5; }
.when { font-family: var(--f-mono); font-size: 11px; color: var(--marigold); font-weight: 500; }

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

.swatch {
  display: inline-block; width: 11px; height: 11px; border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg); margin-right: 9px; vertical-align: baseline;
}

footer { margin-top: 52px; padding-top: 22px; border-top: 1px solid var(--rule-firm); font-size: 12.5px; color: var(--muted); }
footer p { max-width: 70ch; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;

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
  <p>${esc(tidy(budget.flag_for_couple_b))}</p>
</div>`;

  // calendar
  b += `<h2><span class="num">01</span>The eleven days at a glance</h2>
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
  b += `<h2><span class="num">02</span>Where we are staying</h2>
<p class="lede">Both verified available on ${esc(iso(trip.verified))} on the operators' own booking engines. Neither is booked.</p>`;

  const oasis = lodging.properties.find((p) => p.id === 'oasis');
  const fives = lodging.properties.find((p) => p.id === 'fives');

  b += `<div class="scroller"><table>
<caption>Lodging is booked whole and split evenly. Both columns shown so the arithmetic is visible.</caption>
<thead><tr><th>Property</th><th>Dates</th><th>Found</th><th class="n">Whole place</th><th class="n">Each</th></tr></thead><tbody>
<tr><td><strong>${esc(oasis.name)}</strong><br><small>${esc(oasis.neighborhood)}, ${oasis.bedrooms}BR, ${oasis.baths} baths, private rooftop</small></td>
<td>${esc(shortDate(oasis.checkin))} to ${esc(shortDate(oasis.checkout))}<br><small>${oasis.guests} guests</small></td>
<td><span class="tag ok">available</span><br><small>Flagged "rare find, usually booked"</small></td>
<td class="n"><small>${usd(oasis.total_usd)}</small></td>
<td class="n"><strong>${usd(oasis.per_person_usd)}</strong></td></tr>
<tr><td><strong>${esc(fives.room_type)}</strong><br><small>${esc(fives.name)}, ${fives.size_sqft} sq ft, sleeps ${fives.max_occupancy}</small></td>
<td>${esc(shortDate(fives.checkin))} to ${esc(shortDate(fives.checkout))}<br><small>${fives.adults} adults</small></td>
<td><span class="tag ok">${esc(fives.inventory_seen)} left</span><br><small>${esc(fives.discount_live)} off, plus ${fives.loyalty_discount.percent}% loyalty</small></td>
<td class="n"><small>${usd(fives.rates_usd.room_only_flexible)}</small></td>
<td class="n"><strong>${usd(fives.rates_per_person_usd.room_only_flexible)}</strong></td></tr>
</tbody></table></div>`;

  b += `<h3>Beds at the Oasis, so nobody is surprised</h3>
<p>${oasis.bedrooms} bedrooms and ${oasis.baths} bathrooms: ${esc(oasis.bed_config.map((x) => x.bed).join(', ').toLowerCase())}. Three couples take three rooms, the two singles get their own rooms each, and there is a bedroom spare. Checkout is ${esc(oasis.checkout_time)} and the rooftop is private.</p>
<p><a href="${esc(oasis.url)}">View the Oasis listing</a> &middot; <a href="${esc(fives.url)}">View The Fives</a></p>

<div class="note warn">
  <div class="nh">Two things worth knowing</div>
  <p><strong>The beach is cheaper than we had budgeted.</strong> ${esc(tidy(fives.tax_breakdown_seen.note))}</p>
  <p><strong>The Airbnb cancellation terms are tighter than the badge suggests.</strong> ${esc(oasis.cancellation.actual)}. ${esc(tidy(oasis.cancellation.warning))}</p>
</div>`;

  // flights
  b += `<h2><span class="num">03</span>Flights</h2>
<p class="lede">Every leg is nonstop. Priced ${esc(iso(flights.priced))}, nothing booked. Delta where Delta flies it.</p>
<div class="scroller"><table>
<thead><tr><th>Date</th><th>Route</th><th>Flight</th><th>Times</th><th class="n">Per person</th></tr></thead><tbody>`;
  for (const f of flights.flights) {
    b += `<tr><td>${esc(shortDate(f.date))}</td><td>${esc(f.route)}<br><small>${esc(f.who)}</small></td><td>${f.number ? `<strong>${esc(f.number)}</strong>` : esc(f.carrier)}</td><td>${esc(f.depart)} to ${esc(f.arrive)}</td><td class="n">${usd(f.price_usd)}</td></tr>`;
  }
  b += `<tr class="sum"><td colspan="4">Your flights, doing both legs</td><td class="n">${usd(flights.per_person_usd.full_trip)}</td></tr>
<tr class="sum"><td colspan="4">Your flights, flying home from Mexico City</td><td class="n">${usd(flights.per_person_usd.city_only)}</td></tr>
</tbody></table></div>
<p>${esc(tidy(flights.afternoon_departure_problem))}</p>
<div class="note">
  <div class="nh">The one real risk on the outbound</div>
  <p>${esc(tidy(flights.flights[0].risk))}</p>
</div>`;

  // costs summary
  b += `<h2><span class="num">04</span>What it costs you</h2>
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
  <p>${esc(tidy(budget.riviera.alternative_all_inclusive.note))}</p>
</div>`;

  // what needs doing
  b += `<h2><span class="num">05</span>What still has to happen</h2>
<p class="lede">The first five are this week, and the first two because waiting makes them worse rather than just more expensive. Everything else is on the <a href="tasks.html">to do page</a>.</p>
<ol class="tasks">`;
  for (const t of tasks.this_week) {
    b += `<li><span class="tt">${esc(t.title)}</span><span class="tw">${esc(tidy(t.why_now))}</span></li>`;
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
        b += `<li><span class="t">${esc(e.time)}</span><span class="d"><strong>${esc(e.what)}</strong>${e.detail ? `<small>${esc(tidy(e.detail))}</small>` : ''}${e.why ? `<small>${esc(tidy(e.why))}</small>` : ''}</span></li>`;
      }
      b += `</ul>`;
    }
    if (d.plan_status) b += `<div class="note"><p>${esc(tidy(d.plan_status))}</p></div>`;
    if (d.notes) b += `<div class="note"><ul>${d.notes.map((n) => `<li>${esc(tidy(n))}</li>`).join('')}</ul></div>`;
    if (d.warnings) {
      b += `<div class="note warn"><div class="nh">Watch out</div><ul>${d.warnings.map((w) => `<li>${esc(tidy(w))}</li>`).join('')}</ul></div>`;
    }
    b += `</div>`;
  }
  b += `</div>`;

  if (itinerary.does_not_fit) {
    b += `<h2>What does not fit, and why</h2>
<div class="scroller"><table><thead><tr><th>Item</th><th>Why not</th></tr></thead><tbody>`;
    for (const x of itinerary.does_not_fit) {
      b += `<tr><td><strong>${esc(x.item)}</strong></td><td>${esc(tidy(x.why))}</td></tr>`;
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
      return `<tr><td><strong>${esc(l.item)}</strong>${unit}${l.note ? `<br><small>${esc(tidy(l.note))}</small>` : ''}</td><td><span class="tag ${esc(l.status)}">${esc(l.status)}</span></td><td class="n">${usd(l.per_person)}</td></tr>`;
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

<h2>Mexico City</h2>
<div class="scroller"><table>
<thead><tr><th>Item</th><th>Status</th><th class="n">Each</th></tr></thead>
<tbody>${costRows(budget.cdmx.lines)}
<tr class="sum"><td colspan="2">Mexico City, per person</td><td class="n">${usd(budget.cdmx.per_person)}</td></tr>
</tbody></table></div>

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
  <p>${esc(tidy(r.alternative_all_inclusive.note))}</p>
</div>

<h3>Optional at the beach</h3>
<div class="scroller"><table><thead><tr><th>Item</th><th>Status</th><th class="n">Each</th></tr></thead><tbody>
${r.optional.map((o) => `<tr><td><strong>${esc(o.item)}</strong>${o.note ? `<br><small>${esc(tidy(o.note))}</small>` : ''}</td><td><span class="tag ${esc(o.status)}">${esc(o.status)}</span></td><td class="n">${usd(o.per_person)}</td></tr>`).join('')}
</tbody></table></div>

<h2>Splitting it</h2>
<ul>${budget.split_mechanism.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>

<h2>What is already committed if we cancel</h2>
<div class="scroller"><table><thead><tr><th>What</th><th>Terms</th></tr></thead><tbody>
${budget.non_refundable_exposure.map((x) => `<tr><td><strong>${esc(x.what)}</strong></td><td>${esc(x.terms)}</td></tr>`).join('')}
</tbody></table></div>

<div class="note warn">
  <div class="nh">For the two leaving after Mexico City</div>
  <p>${esc(tidy(budget.flag_for_couple_b))}</p>
</div>`;

  return shell({ title: 'What it costs', current: 'costs.html', body: b });
}

// ---------- tasks page ----------

function taskBlock(title, list, showWhen) {
  if (!list || !list.length) return '';
  let s = `<h2>${esc(title)}</h2><ol class="tasks">`;
  for (const t of list) {
    const text = tidy(t.why_now || t.why || t.detail || '');
    s += `<li><span class="tt">${esc(t.title)}${t.status ? ` <span class="tag ${esc(t.status)}">${esc(t.status)}</span>` : ''}</span>${showWhen && t.date ? `<span class="when">${esc(longDate(t.date))}</span>` : ''}<span class="tw">${esc(text)}</span></li>`;
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
    categories: cats,
    // Escaped at build time: these strings go straight into popup innerHTML,
    // and a name with an apostrophe or an angle bracket would otherwise break it.
    places: resolved.map((p) => ({
      n: esc(p.name),
      c: p.category,
      lat: p.lat,
      lon: p.lon,
      hood: esc(p.neighborhood || ''),
      note: esc(tidy(p.note || '')),
      booking: esc(tidy(p.booking || '')),
      url: encodeURI(p.url || ''),
      approx: p.precision === 'approximate',
      km: Math.round(p.km * 10) / 10,
      walk: p.walkMin,
    })),
  };

  const counts = {};
  for (const p of resolved) counts[p.c || p.category] = (counts[p.c || p.category] || 0) + 1;

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
      lists += `<tr><td><strong>${esc(p.name)}</strong>${p.url ? `<br><a href="${esc(p.url)}">listing</a>` : ''}</td><td>${esc(p.neighborhood || '')}${p.precision === 'approximate' ? '<br><small>approximate</small>' : ''}</td><td class="n">${esc(dist)}</td><td>${esc(tidy(p.note || ''))}${p.booking ? `<br><small>${esc(tidy(p.booking))}</small>` : ''}</td></tr>`;
    }
    lists += `</tbody></table></div>`;
  }

  const body = `<header class="masthead">
  <p class="eyebrow">${resolved.length} places mapped</p>
  <h1>Where everything is</h1>
  <div class="dateline">
    <div><b>Base</b>Roma Norte</div>
    <div><b>Dashed ring</b>1 km from the house</div>
    <div><b>Hollow pin</b>Approximate location</div>
  </div>
</header>

<p class="lede">Dinner options, bars, markets and the house, colour coded. Tap a pin for details, or tap a colour below to show and hide that group.</p>

<div class="legend-row">${legend}</div>
<div id="map" role="application" aria-label="Map of trip locations"></div>
<p class="caveat" id="faraway"></p>
<p class="caveat">Map data from OpenStreetMap. The house pin is the middle of Roma Norte: Airbnb only shows an approximate area until a booking is confirmed, and the exact address deliberately stays out of this repo.</p>
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

  // Fit to the walkable cluster. A couple of places sit far south or in
  // Polanco, and including them shrinks Roma Norte to an unreadable blob.
  var near = DATA.places.filter(function (p) { return p.km <= 3; })
                        .map(function (p) { return [p.lat, p.lon]; });
  if (near.length > 1) map.fitBounds(near, { padding: [40, 40] });
  else if (bounds.length) map.fitBounds(bounds, { padding: [40, 40] });

  // Named below the map rather than in the attribution bar: with ten of them
  // the line spanned the full width and sat on top of the scale.
  var far = DATA.places.filter(function (p) { return p.km > 3; });
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
  const html = marked.parse(md).replace(/<table>/g, '<div class="scroller"><table>').replace(/<\/table>/g, '</table></div>');
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
writeFileSync(join(out, 'map.html'), buildMap());
writeFileSync(join(out, 'tasks.html'), buildTasks());
writeFileSync(join(out, 'dining.html'), buildDoc('dining.md', 'dining.html', 'Birthday dinner options'));
writeFileSync(join(out, 'nye.html'), buildDoc('nye.md', 'nye.html', "New Year's Eve"));
writeFileSync(join(out, 'decisions.html'), buildDoc('decisions.md', 'decisions.html', 'Decision log'));
writeFileSync(join(out, 'open-questions.html'), buildDoc('open-questions.md', 'open-questions.html', 'Open questions'));

const built = readdirSync(out).filter((f) => f.endsWith('.html'));
console.log(`built ${built.length} pages into site/: ${built.join(', ')}`);
