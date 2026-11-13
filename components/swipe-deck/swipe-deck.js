// <swipe-deck>: a stack of cards to swipe yes (right) or no (left).
//
// No framework and no dependencies, so it drops into any page. It knows
// nothing about tacos or about where votes go: the host page hands it cards
// and an adapter, and listens for events.
//
//   const deck = document.querySelector('swipe-deck');
//   deck.adapter = {
//     load: () => Promise<{ name?, votes: { [id]: 1 | -1 } }>,
//     save: (id, vote) => Promise<void>,          // vote is 1, -1, or 0 to clear
//   };
//   deck.items = [{ id: 'orinoco', html: '<h3>Orinoco</h3>...' }];
//
// Card html is inserted as markup, so the host is responsible for escaping
// anything it did not write itself.
//
// Events: 'swipe-deck:vote' { id, vote }, 'swipe-deck:error' { error },
// 'swipe-deck:done' { votes }. Keyboard: left and right arrows vote,
// Backspace or u undoes. Labels can be changed with the no-label, yes-label
// and undo-label attributes. Colours and sizes follow the CSS custom
// properties at the top of STYLE.

// Defaults sit under :where() so they carry no specificity: any host rule on
// swipe-deck wins, whichever stylesheet loads first.
const STYLE = `
:where(swipe-deck) {
  --sd-yes: #2E8B6F; --sd-no: #C9372C; --sd-card-bg: #fff; --sd-card-border: #CBD2CE;
  --sd-ink: #11211F; --sd-muted: #6B7A76; --sd-radius: 14px; --sd-height: 440px;
}
swipe-deck {
  display: block; max-width: 420px; margin-inline: auto; user-select: none; -webkit-user-select: none;
}
.sd-stage { position: relative; height: var(--sd-height); touch-action: pan-y; }
.sd-card {
  position: absolute; inset: 0; overflow: auto; overscroll-behavior: contain;
  background: var(--sd-card-bg); color: var(--sd-ink);
  border: 1px solid var(--sd-card-border); border-radius: var(--sd-radius);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18); padding: 18px 18px 22px;
  transition: transform 0.28s ease, opacity 0.28s ease; will-change: transform; cursor: grab;
}
.sd-card[data-depth="1"] { transform: translateY(10px) scale(0.96); }
.sd-card[data-depth="2"] { transform: translateY(20px) scale(0.92); opacity: 0.7; }
.sd-card[data-depth="1"], .sd-card[data-depth="2"] { pointer-events: none; }
.sd-card.sd-drag { transition: none; cursor: grabbing; }
.sd-stamp {
  position: absolute; top: 16px; padding: 4px 10px; border: 3px solid; border-radius: 6px;
  font: 700 20px/1 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase;
  opacity: 0; pointer-events: none; z-index: 1; background: var(--sd-card-bg);
}
.sd-stamp--yes { left: 16px; color: var(--sd-yes); border-color: var(--sd-yes); transform: rotate(-12deg); }
.sd-stamp--no { right: 16px; color: var(--sd-no); border-color: var(--sd-no); transform: rotate(12deg); }
.sd-controls { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 18px; }
.sd-btn {
  font: 600 15px/1 system-ui, sans-serif; border-radius: 999px; cursor: pointer;
  border: 2px solid currentColor; background: var(--sd-card-bg); padding: 14px 22px; min-width: 64px;
}
.sd-btn:focus-visible { outline: 3px solid var(--sd-ink); outline-offset: 2px; }
.sd-btn:disabled { opacity: 0.35; cursor: default; }
.sd-btn--no { color: var(--sd-no); }
.sd-btn--yes { color: var(--sd-yes); }
.sd-btn--undo { color: var(--sd-muted); padding: 10px 14px; font-size: 13px; }
.sd-progress { text-align: center; font: 13px/1.4 system-ui, sans-serif; color: var(--sd-muted); margin-top: 10px; }
.sd-empty {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; gap: 10px; border: 2px dashed var(--sd-card-border); border-radius: var(--sd-radius);
  color: var(--sd-muted); font: 15px/1.5 system-ui, sans-serif; padding: 24px;
}
@media (prefers-reduced-motion: reduce) { .sd-card { transition: none; } }
`;

class SwipeDeck extends HTMLElement {
  constructor() {
    super();
    this._items = [];
    this._votes = {};
    this._history = [];
    this._adapter = null;
    this._ready = false;
  }

  set items(list) { this._items = Array.isArray(list) ? list.slice() : []; this._render(); }
  get items() { return this._items.slice(); }
  get votes() { return { ...this._votes }; }

  set adapter(a) {
    this._adapter = a;
    if (!a || !a.load) { this._ready = true; this._render(); return; }
    this._ready = false;
    this._render();
    Promise.resolve(a.load())
      .then((r) => { this._votes = { ...((r && r.votes) || {}) }; })
      .catch((error) => this._emit('swipe-deck:error', { error }))
      .finally(() => { this._ready = true; this._render(); });
  }

  connectedCallback() {
    if (!document.getElementById('swipe-deck-style')) {
      const s = document.createElement('style');
      s.id = 'swipe-deck-style';
      s.textContent = STYLE;
      document.head.appendChild(s);
    }
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this.setAttribute('role', 'group');
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Swipe right for yes, left for no');
    this.innerHTML =
      '<div class="sd-stage" aria-live="polite"></div>' +
      '<div class="sd-controls">' +
      '<button type="button" class="sd-btn sd-btn--no"></button>' +
      '<button type="button" class="sd-btn sd-btn--undo"></button>' +
      '<button type="button" class="sd-btn sd-btn--yes"></button>' +
      '</div><div class="sd-progress"></div>';
    this._stage = this.querySelector('.sd-stage');
    this._progress = this.querySelector('.sd-progress');
    const [no, undo, yes] = this.querySelectorAll('.sd-btn');
    no.textContent = this.getAttribute('no-label') || 'Nope';
    yes.textContent = this.getAttribute('yes-label') || 'Yes';
    undo.textContent = this.getAttribute('undo-label') || 'Undo';
    no.addEventListener('click', () => this.vote(-1));
    yes.addEventListener('click', () => this.vote(1));
    undo.addEventListener('click', () => this.undo());
    this._btns = { no, yes, undo };
    this.addEventListener('keydown', (e) => {
      if (e.target.closest('a, input, textarea, select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); this.vote(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.vote(-1); }
      else if (e.key === 'Backspace' || e.key === 'u') { e.preventDefault(); this.undo(); }
    });
    this._render();
  }

  // Cards still to see, in the order given.
  _queue() { return this._items.filter((it) => !(it.id in this._votes)); }

  // Shows every card again. Saved votes stand until each card is swiped again.
  restart() { this._history = []; this._votes = {}; this._render(); }

  vote(v) {
    const top = this._queue()[0];
    if (!top || !this._ready) return;
    const card = this._stage.querySelector('.sd-card[data-depth="0"]');
    const commit = () => {
      this._votes[top.id] = v;
      this._history.push(top.id);
      this._persist(top.id, v);
      this._emit('swipe-deck:vote', { id: top.id, vote: v });
      this._render();
      if (!this._queue().length) this._emit('swipe-deck:done', { votes: this.votes });
    };
    if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches) return commit();
    card.style.transform = `translateX(${v * 130}%) rotate(${v * 18}deg)`;
    card.style.opacity = '0';
    card.querySelector(v > 0 ? '.sd-stamp--yes' : '.sd-stamp--no').style.opacity = '1';
    setTimeout(commit, 220);
  }

  undo() {
    const id = this._history.pop();
    if (!id) return;
    delete this._votes[id];
    this._persist(id, 0);
    this._emit('swipe-deck:vote', { id, vote: 0 });
    this._render();
  }

  _persist(id, v) {
    if (!this._adapter || !this._adapter.save) return;
    Promise.resolve(this._adapter.save(id, v)).catch((error) => this._emit('swipe-deck:error', { error, id, vote: v }));
  }

  _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true })); }

  _render() {
    if (!this._stage) return;
    const queue = this._queue();
    const total = this._items.length;
    this._stage.textContent = '';
    if (!this._ready) {
      this._stage.innerHTML = '<div class="sd-empty">Loading...</div>';
    } else if (!queue.length) {
      const yes = this._items.filter((it) => this._votes[it.id] > 0).length;
      this._stage.innerHTML =
        `<div class="sd-empty"><strong>All done.</strong><span>${yes} yes of ${total}.</span>` +
        `<button type="button" class="sd-btn sd-btn--undo">Swipe them all again</button></div>`;
      this._stage.querySelector('button').addEventListener('click', () => this.restart());
    } else {
      queue.slice(0, 3).reverse().forEach((it, i, arr) => {
        const depth = arr.length - 1 - i;
        const card = document.createElement('article');
        card.className = 'sd-card';
        card.dataset.depth = String(depth);
        card.innerHTML =
          '<span class="sd-stamp sd-stamp--yes" aria-hidden="true">Yes</span>' +
          '<span class="sd-stamp sd-stamp--no" aria-hidden="true">Nope</span>' + it.html;
        if (depth === 0) this._drag(card);
        else card.setAttribute('aria-hidden', 'true');
        this._stage.appendChild(card);
      });
    }
    const done = total - queue.length;
    this._progress.textContent = total ? `${done} of ${total} swiped` : '';
    if (this._btns) {
      this._btns.no.disabled = this._btns.yes.disabled = !queue.length || !this._ready;
      this._btns.undo.disabled = !this._history.length;
    }
  }

  // Pointer drag on the top card. Horizontal only: a mostly vertical gesture
  // is left to scroll the card or the page.
  _drag(card) {
    let x0 = 0, y0 = 0, dx = 0, id = null, horiz = null;
    const yes = card.querySelector('.sd-stamp--yes');
    const no = card.querySelector('.sd-stamp--no');
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('a, button')) return;
      id = e.pointerId; x0 = e.clientX; y0 = e.clientY; dx = 0; horiz = null;
    });
    card.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      dx = e.clientX - x0;
      const dy = e.clientY - y0;
      if (horiz === null && Math.hypot(dx, dy) > 8) {
        horiz = Math.abs(dx) > Math.abs(dy);
        if (horiz) { card.setPointerCapture(id); card.classList.add('sd-drag'); }
        else { id = null; return; }
      }
      if (!horiz) return;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      const k = Math.min(1, Math.abs(dx) / 100);
      yes.style.opacity = dx > 0 ? String(k) : '0';
      no.style.opacity = dx < 0 ? String(k) : '0';
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      card.classList.remove('sd-drag');
      if (horiz && Math.abs(dx) > Math.min(110, card.offsetWidth * 0.3)) { this.vote(dx > 0 ? 1 : -1); return; }
      card.style.transform = '';
      yes.style.opacity = no.style.opacity = '0';
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }
}

if (!customElements.get('swipe-deck')) customElements.define('swipe-deck', SwipeDeck);
export { SwipeDeck };
