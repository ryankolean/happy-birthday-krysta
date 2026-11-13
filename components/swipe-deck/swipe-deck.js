// <swipe-deck>: a stack of cards to swipe yes (right) or no (left), with an
// optional details side that slides up over the card.
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
//   deck.items = [{ id: 'orinoco', html: '<h3>Orinoco</h3>', details: '<p>...</p>' }];
//
// Card html and details are inserted as markup, so the host is responsible for
// escaping anything it did not write itself. The front of a card does not
// scroll, so keep it short and put the rest in `details`.
//
// Gestures: drag right for yes, left for no. With details, drag up or tap the
// card to open them, and drag the handle down or tap it to close. Keyboard:
// left and right arrows vote, up and down open and close details, Backspace or
// u undoes.
//
// Events: 'swipe-deck:vote' { id, vote }, 'swipe-deck:details' { id, open },
// 'swipe-deck:error' { error }, 'swipe-deck:done' { votes }. Labels can be
// changed with the no-label, yes-label, undo-label, details-label and
// details-hint attributes. Colours and sizes follow the CSS custom properties
// at the top of STYLE.

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
.sd-stage { position: relative; height: var(--sd-height); }
.sd-card {
  position: absolute; inset: 0; overflow: hidden; touch-action: none;
  background: var(--sd-card-bg); color: var(--sd-ink);
  border: 1px solid var(--sd-card-border); border-radius: var(--sd-radius);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.3, 1.15), opacity 0.28s ease;
  will-change: transform; cursor: grab; z-index: 3;
}
.sd-card[data-depth="1"] { transform: translateY(10px) scale(0.96); z-index: 2; }
.sd-card[data-depth="2"] { transform: translateY(20px) scale(0.92); opacity: 0.7; z-index: 1; }
.sd-card[data-depth="3"] { transform: translateY(30px) scale(0.88); opacity: 0; z-index: 0; }
.sd-card:not([data-depth="0"]) { pointer-events: none; }
.sd-card.sd-drag { transition: none; cursor: grabbing; }
.sd-front { position: absolute; inset: 0; padding: 18px 18px 22px; overflow: hidden; }
.sd-hint {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 0 10px; text-align: center;
  font: 600 12px/1 system-ui, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-muted);
  background: linear-gradient(to bottom, transparent, var(--sd-card-bg) 55%); pointer-events: none;
}
.sd-hint::before {
  content: ""; display: block; width: 8px; height: 8px; margin: 0 auto 6px;
  border-left: 2px solid currentColor; border-top: 2px solid currentColor; transform: rotate(45deg);
  animation: sd-nudge 1.8s ease-in-out infinite;
}
@keyframes sd-nudge { 0%, 60%, 100% { transform: translateY(0) rotate(45deg); } 30% { transform: translateY(-4px) rotate(45deg); } }
.sd-details {
  position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column;
  background: var(--sd-card-bg); transform: translateY(100%); visibility: hidden;
  transition: transform 0.34s cubic-bezier(0.2, 0.8, 0.3, 1), visibility 0s linear 0.34s;
}
.sd-card.sd-open .sd-details { transform: none; visibility: visible; transition-delay: 0s; }
.sd-card.sd-open { cursor: default; }
.sd-details.sd-drag { transition: none; }
.sd-grab {
  flex: none; height: 30px; display: flex; align-items: center; justify-content: center;
  cursor: grab; touch-action: none; border-bottom: 1px solid var(--sd-card-border);
}
.sd-grab::before { content: ""; width: 44px; height: 5px; border-radius: 3px; background: var(--sd-card-border); }
.sd-body { flex: 1; overflow: auto; overscroll-behavior: contain; touch-action: pan-y; padding: 14px 18px 22px; user-select: text; -webkit-user-select: text; }
.sd-stamp {
  position: absolute; top: 16px; padding: 4px 10px; border: 3px solid; border-radius: 6px;
  font: 700 20px/1 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase;
  opacity: 0; pointer-events: none; z-index: 4; background: var(--sd-card-bg);
}
.sd-stamp--yes { left: 16px; color: var(--sd-yes); border-color: var(--sd-yes); transform: rotate(-12deg); }
.sd-stamp--no { right: 16px; color: var(--sd-no); border-color: var(--sd-no); transform: rotate(12deg); }
.sd-controls { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 18px; }
.sd-btn {
  font: 600 15px/1 system-ui, sans-serif; border-radius: 999px; cursor: pointer;
  border: 2px solid currentColor; background: var(--sd-card-bg); padding: 14px 20px; min-width: 64px;
}
.sd-btn:focus-visible { outline: 3px solid var(--sd-ink); outline-offset: 2px; }
.sd-btn:disabled { opacity: 0.35; cursor: default; }
.sd-btn[hidden] { display: none; }
.sd-btn--no { color: var(--sd-no); }
.sd-btn--yes { color: var(--sd-yes); }
.sd-btn--undo, .sd-btn--info { color: var(--sd-muted); padding: 10px 12px; font-size: 13px; min-width: 0; }
.sd-btn--info[aria-expanded="true"] { color: var(--sd-ink); }
.sd-progress { text-align: center; font: 13px/1.4 system-ui, sans-serif; color: var(--sd-muted); margin-top: 10px; }
.sd-empty {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; gap: 10px; border: 2px dashed var(--sd-card-border); border-radius: var(--sd-radius);
  color: var(--sd-muted); font: 15px/1.5 system-ui, sans-serif; padding: 24px;
}
@media (prefers-reduced-motion: reduce) {
  .sd-card, .sd-details { transition: none; }
  .sd-hint::before { animation: none; }
}
`;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

class SwipeDeck extends HTMLElement {
  constructor() {
    super();
    this._items = [];
    this._votes = {};
    this._history = []; // { id, vote } in the order cast, for undo
    this._adapter = null;
    this._ready = false;
    this._els = new Map(); // id -> card element currently in the stack
    this._open = false;
    this._back = null; // { id, vote } of an undone card, so it flies back in from its side
  }

  set items(list) { this._items = Array.isArray(list) ? list.slice() : []; this._reset(); this._render(); }
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
      .finally(() => { this._ready = true; this._reset(); this._render(); });
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
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Swipe right for yes, left for no, up for details');
    this.innerHTML =
      '<div class="sd-stage" aria-live="polite"></div>' +
      '<div class="sd-controls">' +
      '<button type="button" class="sd-btn sd-btn--no"></button>' +
      '<button type="button" class="sd-btn sd-btn--undo"></button>' +
      '<button type="button" class="sd-btn sd-btn--info" aria-expanded="false"></button>' +
      '<button type="button" class="sd-btn sd-btn--yes"></button>' +
      '</div><div class="sd-progress"></div>';
    this._stage = this.querySelector('.sd-stage');
    this._progress = this.querySelector('.sd-progress');
    const [no, undo, info, yes] = this.querySelectorAll('.sd-btn');
    no.textContent = this.getAttribute('no-label') || 'Nope';
    yes.textContent = this.getAttribute('yes-label') || 'Yes';
    undo.textContent = this.getAttribute('undo-label') || 'Undo';
    info.textContent = this.getAttribute('details-label') || 'Details';
    no.addEventListener('click', () => this.vote(-1));
    yes.addEventListener('click', () => this.vote(1));
    undo.addEventListener('click', () => this.undo());
    info.addEventListener('click', () => this.details(!this._open));
    this._btns = { no, yes, undo, info };
    this.addEventListener('keydown', (e) => {
      if (e.target.closest('a, input, textarea, select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); this.vote(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.vote(-1); }
      else if (e.key === 'ArrowUp' && this._top()?.details) { e.preventDefault(); this.details(true); }
      else if (e.key === 'ArrowDown' && this._open) { e.preventDefault(); this.details(false); }
      else if (e.key === 'Escape' && this._open) { e.preventDefault(); this.details(false); }
      else if (e.key === 'Backspace' || e.key === 'u') { e.preventDefault(); this.undo(); }
    });
    this._render();
  }

  // Cards still to see, in the order given.
  _queue() { return this._items.filter((it) => !(it.id in this._votes)); }
  _top() { return this._queue()[0]; }
  _reset() { this._els.clear(); this._open = false; if (this._stage) this._stage.textContent = ''; }

  // Shows every card again. Saved votes stand until each card is swiped again.
  restart() { this._history = []; this._votes = {}; this._reset(); this._render(); }

  // Opens or closes the details side of the top card.
  details(open) {
    const top = this._top();
    const card = top && this._els.get(top.id);
    if (!card || !top.details || open === this._open) return;
    this._open = open;
    card.classList.toggle('sd-open', open);
    const panel = card.querySelector('.sd-details');
    panel.style.transform = '';
    panel.setAttribute('aria-hidden', String(!open));
    if (open) panel.querySelector('.sd-body').scrollTop = 0;
    this._syncButtons();
    this._emit('swipe-deck:details', { id: top.id, open });
  }

  vote(v) {
    const top = this._top();
    if (!top || !this._ready || this._flying) return;
    const card = this._els.get(top.id);
    const commit = () => {
      this._flying = false;
      this._votes[top.id] = v;
      this._history.push({ id: top.id, vote: v });
      if (card) { card.remove(); this._els.delete(top.id); }
      this._open = false;
      this._persist(top.id, v);
      this._emit('swipe-deck:vote', { id: top.id, vote: v });
      this._render();
      if (!this._queue().length) this._emit('swipe-deck:done', { votes: this.votes });
    };
    if (!card || reduced()) return commit();
    this._flying = true;
    card.classList.remove('sd-drag');
    card.style.transform = `translateX(${v * 140}%) rotate(${v * 20}deg)`;
    card.style.opacity = '0';
    card.querySelector(v > 0 ? '.sd-stamp--yes' : '.sd-stamp--no').style.opacity = '1';
    setTimeout(commit, 260);
  }

  // Sets one card's answer directly, for a picks list beside the deck: 1 yes,
  // -1 no, 0 clears it and puts the card back in the stack.
  set(id, v) {
    if (!this._ready || this._flying || !this._items.some((it) => it.id === id)) return;
    if (v === 0) delete this._votes[id];
    else this._votes[id] = v;
    this._history = this._history.filter((h) => h.id !== id);
    this._reset();
    this._persist(id, v);
    this._emit('swipe-deck:vote', { id, vote: v });
    this._render();
  }

  undo() {
    const last = this._history.pop();
    if (!last || this._flying) return;
    delete this._votes[last.id];
    this._back = last;
    this._open = false;
    this._persist(last.id, 0);
    this._emit('swipe-deck:vote', { id: last.id, vote: 0 });
    this._render();
  }

  _persist(id, v) {
    if (!this._adapter || !this._adapter.save) return;
    Promise.resolve(this._adapter.save(id, v)).catch((error) => this._emit('swipe-deck:error', { error, id, vote: v }));
  }

  _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true })); }

  _card(it) {
    const card = document.createElement('article');
    card.className = 'sd-card';
    const hint = this.getAttribute('details-hint') || 'Swipe up for details';
    card.innerHTML =
      '<span class="sd-stamp sd-stamp--yes" aria-hidden="true">Yes</span>' +
      '<span class="sd-stamp sd-stamp--no" aria-hidden="true">Nope</span>' +
      `<div class="sd-front">${it.html}</div>` +
      (it.details
        ? `<div class="sd-hint" aria-hidden="true"></div>` +
          `<div class="sd-details" aria-hidden="true"><div class="sd-grab" role="button" tabindex="-1" aria-label="Close details"></div>` +
          `<div class="sd-body">${it.details}</div></div>`
        : '');
    const h = card.querySelector('.sd-hint');
    if (h) h.textContent = hint;
    this._drag(card, it);
    return card;
  }

  _render() {
    if (!this._stage) return;
    const queue = this._queue();
    const total = this._items.length;
    if (!this._ready || !queue.length) {
      this._els.clear();
      this._stage.textContent = '';
      if (!this._ready) {
        this._stage.innerHTML = '<div class="sd-empty">Loading...</div>';
      } else {
        const yes = this._items.filter((it) => this._votes[it.id] > 0).length;
        this._stage.innerHTML =
          `<div class="sd-empty"><strong>All done.</strong><span>${yes} yes of ${total}.</span>` +
          `<button type="button" class="sd-btn sd-btn--undo">Swipe them all again</button></div>`;
        this._stage.querySelector('button').addEventListener('click', () => this.restart());
      }
    } else {
      this._stage.querySelector('.sd-empty')?.remove();
      const show = queue.slice(0, 3);
      const keep = new Set(show.map((it) => it.id));
      for (const [id, el] of this._els) if (!keep.has(id)) { el.remove(); this._els.delete(id); }
      show.forEach((it, depth) => {
        let el = this._els.get(it.id);
        const back = this._back && this._back.id === it.id ? this._back : null;
        if (!el) {
          el = this._card(it);
          this._els.set(it.id, el);
          if (back && !reduced()) {
            // An undone card flies back in from the side it left by.
            el.dataset.depth = '0';
            el.classList.add('sd-drag');
            el.style.transform = `translateX(${back.vote * 140}%) rotate(${back.vote * 20}deg)`;
            el.style.opacity = '0';
          } else {
            el.dataset.depth = '3'; // enters from behind the stack
          }
          this._stage.appendChild(el);
          void el.offsetWidth;
          el.classList.remove('sd-drag');
          el.style.transform = '';
          el.style.opacity = '';
        }
        el.dataset.depth = String(depth);
        if (depth === 0) el.removeAttribute('aria-hidden');
        else { el.setAttribute('aria-hidden', 'true'); el.classList.remove('sd-open'); }
      });
      this._back = null;
    }
    this._progress.textContent = total ? `${total - queue.length} of ${total} swiped` : '';
    this._syncButtons();
  }

  _syncButtons() {
    if (!this._btns) return;
    const queue = this._queue();
    this._btns.no.disabled = this._btns.yes.disabled = !queue.length || !this._ready;
    this._btns.undo.disabled = !this._history.length;
    const has = !!(this._ready && queue[0] && queue[0].details);
    this._btns.info.hidden = !has;
    this._btns.info.setAttribute('aria-expanded', String(has && this._open));
  }

  // Pointer handling on one card. The front takes horizontal drags as votes
  // and an upward drag or a tap as "open details". The handle on the details
  // side takes a downward drag or a tap as "close".
  _drag(card, it) {
    const front = card.querySelector('.sd-front');
    const panel = card.querySelector('.sd-details');
    const grab = card.querySelector('.sd-grab');
    const yes = card.querySelector('.sd-stamp--yes');
    const no = card.querySelector('.sd-stamp--no');
    const isTop = () => card.dataset.depth === '0' && !this._flying;
    let x0 = 0, y0 = 0, dx = 0, dy = 0, id = null, axis = null;

    const start = (e) => { id = e.pointerId; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; axis = null; };

    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !isTop() || this._open || e.target.closest('a, button')) return;
      start(e);
    });
    card.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id || this._open) return;
      dx = e.clientX - x0;
      dy = e.clientY - y0;
      if (axis === null && Math.hypot(dx, dy) > 8) {
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        card.setPointerCapture(id);
        card.classList.add('sd-drag');
      }
      if (axis === 'x') {
        card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
        const k = Math.min(1, Math.abs(dx) / 100);
        yes.style.opacity = dx > 0 ? String(k) : '0';
        no.style.opacity = dx < 0 ? String(k) : '0';
      } else if (axis === 'y') {
        // Resist the drag, and only lift if there is something to lift to.
        const lift = it.details ? Math.max(-90, Math.min(16, dy * 0.35)) : Math.max(-12, Math.min(12, dy * 0.15));
        card.style.transform = `translateY(${lift}px)`;
        if (panel && dy < 0) panel.style.transform = `translateY(calc(100% + ${Math.max(dy, -160)}px))`;
        if (panel) panel.style.visibility = dy < 0 ? 'visible' : '';
      }
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      card.classList.remove('sd-drag');
      if (axis === 'x' && Math.abs(dx) > Math.min(110, card.offsetWidth * 0.3)) { this.vote(dx > 0 ? 1 : -1); return; }
      card.style.transform = '';
      yes.style.opacity = no.style.opacity = '0';
      if (panel) { panel.style.transform = ''; panel.style.visibility = ''; }
      const tap = axis === null && e.type === 'pointerup';
      if (it.details && ((axis === 'y' && dy < -50) || tap)) this.details(true);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);

    if (!grab) return;
    let gid = null, gy = 0, gdy = 0;
    grab.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !this._open) return;
      e.stopPropagation();
      gid = e.pointerId; gy = e.clientY; gdy = 0;
      grab.setPointerCapture(gid);
      panel.classList.add('sd-drag');
    });
    grab.addEventListener('pointermove', (e) => {
      if (e.pointerId !== gid) return;
      gdy = Math.max(0, e.clientY - gy);
      panel.style.transform = `translateY(${gdy}px)`;
    });
    const gend = (e) => {
      if (e.pointerId !== gid) return;
      gid = null;
      panel.classList.remove('sd-drag');
      if (gdy > 60 || (gdy < 6 && e.type === 'pointerup')) this.details(false);
      else panel.style.transform = '';
    };
    grab.addEventListener('pointerup', gend);
    grab.addEventListener('pointercancel', gend);
  }
}

if (!customElements.get('swipe-deck')) customElements.define('swipe-deck', SwipeDeck);
export { SwipeDeck };
