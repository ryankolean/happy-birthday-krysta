# swipe-deck

A framework-free `<swipe-deck>` web component: a stack of cards you swipe right for yes and left for no, with buttons, undo and arrow keys as well. One file, no dependencies, works in any page that can load an ES module.

```html
<swipe-deck yes-label="Yes" no-label="Nope"></swipe-deck>
<script type="module">
  import './swipe-deck.js';
  const deck = document.querySelector('swipe-deck');
  deck.adapter = {
    load: () => fetch(API + '/me', { headers }).then((r) => r.json()), // { name, votes: { id: 1 | -1 } }
    save: (id, vote) => fetch(API + '/me', { method: 'PUT', headers, body: JSON.stringify({ id, vote }) }),
  };
  deck.items = [{ id: 'orinoco', html: '<h3>Orinoco</h3>' }]; // html is not escaped for you
</script>
```

- **Events:** `swipe-deck:vote` `{ id, vote }` (vote 0 is an undo), `swipe-deck:done` `{ votes }`, `swipe-deck:error` `{ error }`.
- **Methods:** `vote(1 | -1)`, `undo()`, `restart()`. Property `votes` is the current answers.
- **Theming:** set `--sd-yes`, `--sd-no`, `--sd-card-bg`, `--sd-card-border`, `--sd-ink`, `--sd-muted`, `--sd-radius` and `--sd-height` on `swipe-deck`. The defaults have zero specificity, so any rule of yours wins.
- **Storage:** the adapter is the only thing that knows where votes go. Leave it off and votes stay in memory, or point it at `worker/swipe-votes`, a Cloudflare Worker and KV store that serves any number of decks from any site listed in its `ALLOWED_ORIGINS`.

In this repo the build copies it to `site/assets/swipe-deck.js`, and `swipe.html` is the worked example.
