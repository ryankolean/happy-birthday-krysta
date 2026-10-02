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
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --paper: #0C1413; --raise: #14201E; --ink: #EDF0EC; --body: #C5D0CC;
    --muted: #8FA09B; --teal: #5FC2B8; --teal-soft: #15302D;
    --marigold: #F0A23E; --marigold-soft: #33240E; --sea: #6FB8D2;
    --rule: #1E2A28; --rule-firm: #2C3B38;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: #0C1413; --raise: #14201E; --ink: #EDF0EC; --body: #C5D0CC;
  --muted: #8FA09B; --teal: #5FC2B8; --teal-soft: #15302D;
  --marigold: #F0A23E; --marigold-soft: #33240E; --sea: #6FB8D2;
  --rule: #1E2A28; --rule-firm: #2C3B38;
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
${tile('Whole trip, all 8', usd(budget.grand_total), 'Flights, lodging, the anchor dinners and the booked activities.', true)}
${tile('Per person, full trip', usd(budget.per_person.full_trip), 'The 6 doing Mexico City and the beach.')}
${tile('Per person, city only', usd(budget.per_person.city_only), 'The 2 flying home on 3 January. See the note below.')}
</div>
<p class="caveat">Excludes ${esc(trip.totals_usd.excludes.join(', '))}. Peso figures converted at ${esc(trip.exchange_rate.range)} MXN/USD.</p>

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
<thead><tr><th>Property</th><th>Dates</th><th>Found</th><th class="n">Price</th></tr></thead><tbody>
<tr><td><strong>${esc(oasis.name)}</strong><br><small>${esc(oasis.neighborhood)}, ${oasis.bedrooms}BR, ${oasis.baths} baths, private rooftop</small></td>
<td>${esc(shortDate(oasis.checkin))} to ${esc(shortDate(oasis.checkout))}<br><small>${oasis.guests} guests</small></td>
<td><span class="tag ok">available</span><br><small>Flagged "rare find, usually booked"</small></td>
<td class="n">${usd(oasis.total_usd)}</td></tr>
<tr><td><strong>${esc(fives.room_type)}</strong><br><small>${esc(fives.name)}, ${fives.size_sqft} sq ft, sleeps ${fives.max_occupancy}</small></td>
<td>${esc(shortDate(fives.checkin))} to ${esc(shortDate(fives.checkout))}<br><small>${fives.adults} adults</small></td>
<td><span class="tag ok">${esc(fives.inventory_seen)} left</span><br><small>${esc(fives.discount_live)} off, plus ${fives.loyalty_discount.percent}% loyalty</small></td>
<td class="n">${usd(fives.rates_usd.room_only_nonrefundable)}</td></tr>
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
  b += `<tr class="sum"><td colspan="4">Flights for all 8</td><td class="n">${usd(flights.total_usd)}</td></tr>
</tbody></table></div>
<p>${esc(tidy(flights.afternoon_departure_problem))}</p>
<div class="note">
  <div class="nh">The one real risk on the outbound</div>
  <p>${esc(tidy(flights.flights[0].risk))}</p>
</div>`;

  // costs summary
  b += `<h2><span class="num">04</span>What it costs</h2>
<p class="lede">Three blocks: flights, the city, the beach. Full line by line breakdown on the <a href="costs.html">costs page</a>.</p>
<div class="scroller"><table>
<thead><tr><th>Block</th><th>People</th><th class="n">Total</th><th class="n">Per person</th></tr></thead><tbody>
<tr><td>Flights</td><td>8</td><td class="n">${usd(flights.total_usd)}</td><td class="n">${usd(flights.per_person_full_trip)} / ${usd(flights.per_person_city_only)}</td></tr>
<tr><td>Mexico City</td><td>${budget.cdmx.travelers}</td><td class="n">${usd(budget.cdmx.subtotal)}</td><td class="n">${usd(budget.cdmx.per_person)}</td></tr>
<tr><td>Riviera Maya</td><td>${budget.riviera.travelers}</td><td class="n">${usd(budget.riviera.subtotal)}</td><td class="n">${usd(budget.riviera.per_person)}</td></tr>
<tr class="sum"><td colspan="2">Whole trip</td><td class="n">${usd(budget.grand_total)}</td><td class="n">${usd(budget.per_person.full_trip)}</td></tr>
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
    .map(
      (l) =>
        `<tr><td><strong>${esc(l.item)}</strong>${l.note ? `<br><small>${esc(tidy(l.note))}</small>` : ''}</td><td><span class="tag ${esc(l.status)}">${esc(l.status)}</span></td><td class="n">${usd(l.group)}</td><td class="n">${usd(l.per_person)}</td></tr>`
    )
    .join('');
}

function buildCosts() {
  const r = budget.riviera;
  const fives = lodging.properties.find((p) => p.id === 'fives');

  let b = `<header class="masthead">
  <p class="eyebrow">Line by line</p>
  <h1>What it costs</h1>
  <div class="dateline">
    <div><b>Whole trip</b>${esc(usd(budget.grand_total))}</div>
    <div><b>Per person, full trip</b>${esc(usd(budget.per_person.full_trip))}</div>
    <div><b>Per person, city only</b>${esc(usd(budget.per_person.city_only))}</div>
    <div><b>Rate used</b>${esc(budget.rate_mxn_per_usd)} MXN/USD</div>
  </div>
</header>

<h2>Mexico City, ${budget.cdmx.travelers} people</h2>
<div class="scroller"><table>
<thead><tr><th>Item</th><th>Status</th><th class="n">Group</th><th class="n">Per person</th></tr></thead>
<tbody>${costRows(budget.cdmx.lines)}
<tr class="sum"><td colspan="2">Mexico City</td><td class="n">${usd(budget.cdmx.subtotal)}</td><td class="n">${usd(budget.cdmx.per_person)}</td></tr>
</tbody></table></div>

<h2>Riviera Maya, ${r.travelers} people</h2>
<p class="lede">${esc(fives.name)}, one ${esc(fives.room_type)}: ${fives.size_sqft} sq ft, sleeps up to ${fives.max_occupancy}. Quoted live, taxes included. A ${esc(fives.discount_live)} discount is running and a further ${fives.loyalty_discount.percent}% comes off through their loyalty programme.</p>
<div class="scroller"><table>
<thead><tr><th>Rate option</th><th class="n">Non-refundable</th><th class="n">Flexible</th></tr></thead><tbody>
<tr class="pick"><td><strong>Room only</strong> <small>then eat in Puerto Morelos</small></td><td class="n">${usd(fives.rates_usd.room_only_nonrefundable)}</td><td class="n">${usd(fives.rates_usd.room_only_flexible)}</td></tr>
<tr><td>All inclusive instead</td><td class="n">${usd(fives.rates_usd.all_inclusive_nonrefundable)}</td><td class="n">${usd(fives.rates_usd.all_inclusive_flexible)}</td></tr>
</tbody></table></div>
<p><strong>Flexible terms:</strong> ${esc(fives.flexible_terms)}.</p>

<div class="scroller"><table>
<caption>Recommended build: ${esc(r.recommended_build)}.</caption>
<thead><tr><th>Item</th><th>Status</th><th class="n">Group</th><th class="n">Per person</th></tr></thead>
<tbody>${costRows(r.lines)}
<tr class="sum"><td colspan="2">Riviera Maya</td><td class="n">${usd(r.subtotal)}</td><td class="n">${usd(r.per_person)}</td></tr>
</tbody></table></div>

<div class="note">
  <div class="nh">Room only or all inclusive</div>
  <p>${esc(tidy(r.alternative_all_inclusive.note))}</p>
</div>

<h3>Optional at the beach</h3>
<div class="scroller"><table><thead><tr><th>Item</th><th>Status</th><th class="n">Group</th></tr></thead><tbody>
${r.optional.map((o) => `<tr><td><strong>${esc(o.item)}</strong>${o.note ? `<br><small>${esc(tidy(o.note))}</small>` : ''}</td><td><span class="tag ${esc(o.status)}">${esc(o.status)}</span></td><td class="n">${usd(o.group)}</td></tr>`).join('')}
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
writeFileSync(join(out, 'tasks.html'), buildTasks());
writeFileSync(join(out, 'dining.html'), buildDoc('dining.md', 'dining.html', 'Birthday dinner options'));
writeFileSync(join(out, 'nye.html'), buildDoc('nye.md', 'nye.html', "New Year's Eve"));
writeFileSync(join(out, 'decisions.html'), buildDoc('decisions.md', 'decisions.html', 'Decision log'));
writeFileSync(join(out, 'open-questions.html'), buildDoc('open-questions.md', 'open-questions.html', 'Open questions'));

const built = readdirSync(out).filter((f) => f.endsWith('.html'));
console.log(`built ${built.length} pages into site/: ${built.join(', ')}`);
