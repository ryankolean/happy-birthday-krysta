// Fills in coordinates for anything in data/places.yml that does not have them.
//
//   npm run geocode
//
// Results land in data/geocache.json, keyed by the address string, so
// places.yml keeps its comments and nothing already resolved is looked up
// twice. Delete an entry from the cache to force a re-lookup.
//
// Uses OpenStreetMap's Nominatim, whose usage policy is one request per second
// and a real User-Agent. Both are honoured below. Do not run this in CI.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cachePath = join(root, 'data', 'geocache.json');

const UA = 'happy-birthday-krysta/1.0 (trip planning site; github.com/ryankolean/happy-birthday-krysta)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const places = yaml.load(readFileSync(join(root, 'data', 'places.yml'), 'utf8'));
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};

const todo = places.places.filter((p) => p.address && !cache[p.address]);

if (!todo.length) {
  console.log(`nothing to geocode, all ${places.places.length} places are cached`);
  process.exit(0);
}

console.log(`geocoding ${todo.length} of ${places.places.length} places`);

let ok = 0;
let failed = [];

for (const p of todo) {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
    encodeURIComponent(p.address);

  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (!json.length) {
      failed.push(`${p.name}: no match for "${p.address}"`);
    } else {
      cache[p.address] = {
        lat: Number(json[0].lat),
        lon: Number(json[0].lon),
        matched: json[0].display_name,
      };
      ok++;
      console.log(`  ok   ${p.name}`);
    }
  } catch (err) {
    failed.push(`${p.name}: ${err.message}`);
  }

  // Nominatim asks for no more than one request per second.
  await sleep(1100);
}

writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n');

console.log(`\nresolved ${ok}, cached total ${Object.keys(cache).length}`);
if (failed.length) {
  console.log(`\n${failed.length} could not be resolved. Add a more specific address, or set lat/lon by hand in data/places.yml:`);
  for (const f of failed) console.log(`  ${f}`);
}
