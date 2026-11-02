// Fails if a surname from private/roster.md appears in any git-tracked file.
//
// Why this exists: on 1 November 2026 CLAUDE.md leaked a real surname in the
// very paragraph that bans surnames, because the verification at the time
// only scanned data/ and site/. This scans everything git tracks.
//
// It cannot run in CI. private/roster.md is gitignored, so the runner has no
// list to check against, and the whole point is that the list never leaves
// this machine. Run it locally before you push. If the roster is missing it
// skips rather than failing, so a fresh clone is not blocked.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const roster = join(root, 'private', 'roster.md');

if (!existsSync(roster)) {
  console.log('check:pii  private/roster.md not found, nothing to check against. Skipped.');
  process.exit(0);
}

// The roster's Person column is the 4th cell of each table row.
const surnames = new Set();
let people = 0;
for (const line of readFileSync(roster, 'utf8').split('\n')) {
  if (!line.trim().startsWith('|')) continue;
  const cells = line.split('|').map((c) => c.trim());
  const person = cells[4];
  if (!person || person === 'Person' || /^-+$/.test(person)) continue;
  const words = person.split(/\s+/).filter(Boolean);
  if (words.length < 2) continue;
  people += 1;
  for (const w of words.slice(1)) {
    if (w.length >= 3) surnames.add(w);
  }
}

if (people === 0) {
  console.error('check:pii  FAILED to parse any people out of private/roster.md.');
  console.error('           The table format changed, so this check is blind. Fix it before pushing.');
  process.exit(1);
}

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const hits = [];
for (const rel of tracked) {
  let text;
  try {
    text = readFileSync(join(root, rel), 'utf8');
  } catch {
    continue; // binary or unreadable, skip
  }
  const lines = text.split('\n');
  for (const name of surnames) {
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes(name)) hits.push({ rel, line: i + 1, name, text: lines[i].trim().slice(0, 120) });
    }
  }
}

if (hits.length) {
  console.error('check:pii  FAIL. A surname from private/roster.md is in a tracked file.\n');
  for (const h of hits) console.error(`  ${h.rel}:${h.line}  ${h.name}\n    ${h.text}`);
  console.error(`\n${hits.length} occurrence(s). Surnames belong in private/roster.md only.`);
  process.exit(1);
}

console.log(`check:pii  OK. ${surnames.size} surname(s) from ${people} people, ${tracked.length} tracked files, 0 hits.`);
