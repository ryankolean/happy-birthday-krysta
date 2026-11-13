// Makes one private swipe link per person in Mexico City and pushes the token
// map to the swipe-votes worker as its TOKENS secret.
//
// The tokens are the only thing standing between a stranger and a vote, and
// this repo is world readable, so they never touch a tracked file: the links
// go to private/swipe-links.md, which is gitignored, and the map goes straight
// to Cloudflare over stdin.
//
// Running it again rotates every token and kills every old link, which is the
// fix if a link gets forwarded somewhere it should not. Votes are stored under
// first names, not tokens, so they survive a rotation.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const travelers = yaml.load(readFileSync(join(root, 'data', 'travelers.yml'), 'utf8'));
const tour = yaml.load(readFileSync(join(root, 'data', 'taco-tour.yml'), 'utf8'));

const names = travelers.groups.filter((g) => g.legs.includes('cdmx')).flatMap((g) => g.first_names || []);
if (new Set(names).size !== names.length) throw new Error('two travelers share a first name; votes are keyed by first name');

const tokens = {};
const rows = names.map((n) => {
  const t = randomBytes(18).toString('base64url');
  tokens[t] = n;
  return `| ${n} | ${tour.swipe.site}swipe.html#t=${t} |`;
});

execFileSync('npx', ['--yes', 'wrangler@4', 'secret', 'put', 'TOKENS'], {
  cwd: join(root, 'worker', 'swipe-votes'),
  input: JSON.stringify(tokens),
  stdio: ['pipe', 'inherit', 'inherit'],
});

mkdirSync(join(root, 'private'), { recursive: true });
writeFileSync(
  join(root, 'private', 'swipe-links.md'),
  `# Taco swipe links\n\nMade ${new Date().toISOString().slice(0, 10)}. One per person, send each privately. ` +
    `Anyone holding a link votes as that person. Rerun \`npm run swipe:links\` to rotate them all.\n\n` +
    `| Person | Link |\n|---|---|\n${rows.join('\n')}\n`
);
console.log(`swipe:links  ${names.length} links written to private/swipe-links.md and pushed to the worker.`);
