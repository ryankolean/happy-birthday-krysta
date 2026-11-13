// Swipe votes. A tiny store behind the <swipe-deck> component: each person
// has a private token, each token maps to a display name, and each person's
// votes on a deck are one KV value. Nothing here knows about tacos, so the
// same worker serves any deck on any site listed in ALLOWED_ORIGINS.
//
//   GET  /v1/:deck/tally   public   { voters, items: { id: { yes: [names], no: [names] } } }
//   GET  /v1/:deck/me      token    { name, votes: { id: 1 | -1 } }
//   PUT  /v1/:deck/me      token    body { id, vote: 1 | -1 | 0 }, 0 clears
//
// Config:
//   TOKENS           secret, JSON object of token -> display name
//   ALLOWED_ORIGINS  var, comma separated list of origins allowed by CORS
//   VOTES            KV namespace

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX_ITEMS = 500;

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const h = {
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

function who(req, env) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.get('Authorization') || '');
  if (!m) return null;
  let tokens;
  try { tokens = JSON.parse(env.TOKENS || '{}'); } catch { return null; }
  const name = Object.prototype.hasOwnProperty.call(tokens, m[1]) ? tokens[m[1]] : null;
  return typeof name === 'string' && name ? name : null;
}

const key = (deck, name) => `v:${deck}:${name}`;

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    const parts = new URL(req.url).pathname.split('/').filter(Boolean);
    if (parts.length !== 3 || parts[0] !== 'v1' || !SLUG.test(parts[1])) return json({ error: 'not found' }, 404, h);
    const [, deck, what] = parts;

    if (what === 'tally' && req.method === 'GET') {
      const items = {};
      let voters = 0;
      let cursor;
      do {
        const page = await env.VOTES.list({ prefix: `v:${deck}:`, cursor });
        for (const k of page.keys) {
          const name = k.name.slice(`v:${deck}:`.length);
          const votes = (await env.VOTES.get(k.name, 'json')) || {};
          if (Object.keys(votes).length) voters++;
          for (const [id, v] of Object.entries(votes)) {
            const row = (items[id] ||= { yes: [], no: [] });
            (v > 0 ? row.yes : row.no).push(name);
          }
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return json({ voters, items }, 200, h);
    }

    if (what !== 'me') return json({ error: 'not found' }, 404, h);
    const name = who(req, env);
    if (!name) return json({ error: 'unknown link' }, 401, h);

    if (req.method === 'GET') {
      return json({ name, votes: (await env.VOTES.get(key(deck, name), 'json')) || {} }, 200, h);
    }

    if (req.method === 'PUT') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
      const { id, vote } = body || {};
      if (typeof id !== 'string' || !SLUG.test(id)) return json({ error: 'bad id' }, 400, h);
      if (![1, -1, 0].includes(vote)) return json({ error: 'vote must be 1, -1 or 0' }, 400, h);
      const votes = (await env.VOTES.get(key(deck, name), 'json')) || {};
      if (vote === 0) delete votes[id];
      else {
        if (!(id in votes) && Object.keys(votes).length >= MAX_ITEMS) return json({ error: 'too many items' }, 400, h);
        votes[id] = vote;
      }
      await env.VOTES.put(key(deck, name), JSON.stringify(votes));
      return json({ name, votes }, 200, h);
    }

    return json({ error: 'method not allowed' }, 405, h);
  },
};
