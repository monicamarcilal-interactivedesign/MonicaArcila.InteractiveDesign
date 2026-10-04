/* =============================================================
   PROJECTS-BOARD.JS — the Projects section
   =============================================================
   Three jobs, all for the #case-studies section:

   1. THE HERO. The opening statement is split into words and each word
      is nudged up along a gentle arc (and tilted to follow it), so the
      paragraph looks bent over the big star behind it. The star turns a
      little as you scroll.

   2. THE BOARD. One card per project, laid out in a balanced grid that
      is bigger than the window. You drag it around:
        - desktop: any direction (with momentum), sideways wheel/trackpad,
          or the arrow keys; focusing a card brings it into view
        - phones: sideways only, so up/down still scrolls the page
      The card area's edges glow where more cards are hidden.
      If every card fits on screen (a short filter result) there's nothing
      to pan — so you can drag the cards to rearrange them instead
      (keyboard: Alt + arrow keys).

   3. THE FILTER. The category chips show/hide cards and the grid
      re-balances itself (rows x columns) for however many are left.

   Cards stay real links: a click opens the project, a drag never does.
   Everything respects prefers-reduced-motion, and the section still works
   as a plain list of cards if this script never runs.
   ============================================================= */

(function () {

const section = document.getElementById("case-studies");
const board = document.getElementById("projectsBoard");
const canvas = document.getElementById("projectsCanvas");
if (!section || !board || !canvas) return;

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const phoneQuery = window.matchMedia("(max-width: 700px)");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* -------------------------------------------------------------
   1. THE HERO
   ------------------------------------------------------------- */
const hero = section.querySelector(".projects-hero");
const statement = document.getElementById("projectsStatement");
let words = [];

function splitWords() {
  if (!statement || statement.dataset.split) return;
  statement.dataset.split = "1";
  const frag = document.createDocumentFragment();
  statement.childNodes.forEach((node) => {
    const emClass = node.nodeType === 1 ? node.className : "";
    const text = node.textContent;
    text.split(/(\s+)/).forEach((piece) => {
      if (!piece) return;
      if (/^\s+$/.test(piece)) {
        frag.appendChild(document.createTextNode(" "));
        return;
      }
      const span = document.createElement("span");
      span.className = "pword" + (emClass ? " " + emClass : "");
      span.textContent = piece;
      frag.appendChild(span);
    });
  });
  statement.textContent = "";
  statement.appendChild(frag);
  words = Array.from(statement.querySelectorAll(".pword"));
}

// Each word rides an arc: highest in the middle of the paragraph's width,
// dipping toward the edges and tilted to follow the curve — the paragraph
// looks wrapped over a dome. Gentle on purpose (readability comes first),
// applied per word so line breaking is untouched, and deliberately not
// scaled: a scaled word grows over the space beside it and the words run
// together.
function bend() {
  if (!words.length) return;
  const box = statement.getBoundingClientRect();
  if (!box.width) return;
  words.forEach((w) => (w.style.transform = ""));
  const half = box.width / 2;
  const cx = box.left + half;
  const amp = clamp(box.width * 0.04, 6, 34);
  const rects = words.map((w) => w.getBoundingClientRect());
  words.forEach((w, i) => {
    const u = clamp((rects[i].left + rects[i].width / 2 - cx) / half, -1, 1);
    const y = -amp * (1 - u * u);
    const tilt = (Math.atan((2 * amp * u) / half) * 180) / Math.PI;
    w.style.transform = `translateY(${y.toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
  });
}

function initHero() {
  if (!hero || !statement) return;
  splitWords();
  bend();
  // Re-bend whenever the paragraph's size changes — including the moment
  // the section first becomes visible (it starts hidden) and once the web
  // fonts have loaded and changed the word widths.
  if (window.ResizeObserver) new ResizeObserver(bend).observe(statement);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(bend);

  if (reduced) return;
  // The star turns a little with the page scroll.
  let ticking = false;
  const spin = () => {
    ticking = false;
    hero.style.setProperty("--rot", `${(window.scrollY * 0.07).toFixed(2)}deg`);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(spin);
      }
    },
    { passive: true }
  );
  spin();
}

/* -------------------------------------------------------------
   2. THE BOARD
   ------------------------------------------------------------- */
const filterBar = section.querySelector(".filter");
const statusEl = section.querySelector(".filter__status");
const liveEl = document.getElementById("boardLive");
const hintText = board.querySelector(".board__hint-text");
const cards = Array.from(canvas.querySelectorAll(".pcard"));

// Featured projects first (they're the strongest), otherwise the order
// they're written in.
let order = cards
  .map((card, i) => ({ card, i }))
  .sort((a, b) => (b.card.hasAttribute("data-featured") ? 1 : 0) - (a.card.hasAttribute("data-featured") ? 1 : 0) || a.i - b.i)
  .map((x) => x.card);

let filter = "all";
let pos = { x: 0, y: 0 };
let vel = { x: 0, y: 0 };
let metrics = { cw: 0, ch: 0, bw: 0, bh: 0, minX: 0, minY: 0, maxX: 0, maxY: 0, panX: false, panY: false, cols: 1, rows: 1 };
let mode = "pan"; // "pan" (more cards than fit) or "arrange" (they all fit)
let inertiaId = 0;
let suppressClick = false;

const isVisibleCard = (card) => filter === "all" || card.dataset.category.split(" ").includes(filter);
const visibleCards = () => order.filter(isVisibleCard);

function applyPos() {
  canvas.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
  // Glow along each edge that still has hidden cards beyond it.
  const hide = {
    l: metrics.panX ? clamp(-pos.x / 140, 0, 1) : 0,
    r: metrics.panX ? clamp((metrics.cw + pos.x - metrics.bw) / 140, 0, 1) : 0,
    t: metrics.panY ? clamp(-pos.y / 140, 0, 1) : 0,
    b: metrics.panY ? clamp((metrics.ch + pos.y - metrics.bh) / 140, 0, 1) : 0,
  };
  for (const k of Object.keys(hide)) board.style.setProperty(`--edge-${k}`, hide[k].toFixed(2));
}

function setPos(x, y) {
  pos.x = metrics.panX ? clamp(x, metrics.minX, metrics.maxX) : metrics.minX;
  pos.y = metrics.panY ? clamp(y, metrics.minY, metrics.maxY) : metrics.minY;
  applyPos();
}

// Shows the cards that match the filter in a balanced rows x columns
// grid, sizes the board, decides pan vs arrange mode. `animate` slides the
// cards from where they were to where they are now (FLIP).
function layout(animate) {
  const bw = board.clientWidth;
  if (!bw) return; // hidden (another section is showing) — the ResizeObserver brings us back
  const phone = phoneQuery.matches;
  const show = visibleCards();
  const n = show.length;

  const before = new Map();
  if (animate && !reduced) show.forEach((c) => !c.hidden && before.set(c, c.getBoundingClientRect()));

  order.forEach((c) => {
    c.hidden = !isVisibleCard(c);
    canvas.appendChild(c);
  });

  // Balanced: roughly 1.7 columns per row on a wide window; on phones a
  // sideways-only sheet of one or two rows.
  const rows = phone ? (n > 6 ? 2 : 1) : Math.max(1, Math.round(Math.sqrt(n / 1.7)));
  const cols = Math.max(1, Math.ceil(n / rows));
  canvas.style.setProperty("--cols", cols);

  const cw = canvas.offsetWidth;
  const ch = canvas.offsetHeight;
  const bh = phone ? ch : Math.min(ch, Math.max(480, Math.round(window.innerHeight * 0.82)));
  board.style.height = `${bh}px`;

  const fitsX = cw <= bw + 1;
  const fitsY = ch <= bh + 1;
  metrics = {
    cw, ch, bw, bh, rows, cols,
    panX: !fitsX,
    panY: !fitsY,
    minX: fitsX ? (bw - cw) / 2 : bw - cw,
    maxX: fitsX ? (bw - cw) / 2 : 0,
    minY: fitsY ? (bh - ch) / 2 : bh - ch,
    maxY: fitsY ? (bh - ch) / 2 : 0,
  };
  const previousMode = mode;
  mode = fitsX && fitsY ? "arrange" : "pan";
  // The glowing hint comes back whenever what you can do changes.
  if (animate && mode !== previousMode) board.classList.remove("is-touched");
  board.classList.toggle("is-arrange", mode === "arrange");
  board.classList.toggle("is-xonly", phone);
  if (hintText) hintText.textContent = mode === "arrange" ? "drag cards to rearrange" : phone ? "swipe to explore" : "drag to explore";

  stopInertia();
  setPos(animate ? 0 : pos.x, animate ? 0 : pos.y);

  if (animate && !reduced) {
    show.forEach((c) => {
      const last = c.getBoundingClientRect();
      const first = before.get(c);
      if (first) {
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (dx || dy) {
          c.style.transition = "none";
          c.style.transform = `translate(${dx}px, ${dy}px)`;
          requestAnimationFrame(() => {
            c.style.transition = "transform 0.6s cubic-bezier(0.45, 0, 0.25, 1)";
            c.style.transform = "";
          });
        }
      } else {
        c.classList.remove("is-entering");
        void c.offsetWidth;
        c.classList.add("is-entering");
      }
    });
  }
  updateStatus();
}

function updateStatus() {
  const shown = visibleCards().length;
  if (statusEl) statusEl.textContent = `Showing ${shown} of ${cards.length} projects` + (mode === "arrange" ? " — drag the cards to rearrange them." : "");
}

// A short, reusable FLIP: run `change` (which reorders the DOM) and glide
// every card from its old spot to its new one.
function flip(change) {
  const els = Array.from(canvas.children).filter((c) => !c.hidden);
  const first = new Map(els.map((c) => [c, c.getBoundingClientRect()]));
  change();
  if (reduced) return;
  els.forEach((c) => {
    if (c.classList.contains("is-dragging")) return;
    const last = c.getBoundingClientRect();
    const f = first.get(c);
    const dx = f.left - last.left;
    const dy = f.top - last.top;
    if (!dx && !dy) return;
    c.style.transition = "none";
    c.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
      c.style.transition = "transform 0.4s cubic-bezier(0.45, 0, 0.25, 1)";
      c.style.transform = "";
    });
  });
}

/* ---- panning with momentum ---- */
function stopInertia() {
  if (inertiaId) cancelAnimationFrame(inertiaId);
  inertiaId = 0;
}

function startInertia() {
  stopInertia();
  let last = performance.now();
  const step = (now) => {
    const dt = Math.min(34, now - last);
    last = now;
    let moving = false;
    for (const axis of ["x", "y"]) {
      const lo = axis === "x" ? metrics.minX : metrics.minY;
      const hi = axis === "x" ? metrics.maxX : metrics.maxY;
      const canPan = axis === "x" ? metrics.panX : metrics.panY;
      if (!canPan) continue;
      if (pos[axis] < lo || pos[axis] > hi) {
        // Past the edge: ease back (a soft rubber band).
        const target = clamp(pos[axis], lo, hi);
        pos[axis] += (target - pos[axis]) * Math.min(1, 0.014 * dt * 1.6);
        vel[axis] = 0;
        if (Math.abs(target - pos[axis]) > 0.4) moving = true;
        else pos[axis] = target;
      } else {
        vel[axis] *= Math.pow(0.95, dt / 16.7);
        pos[axis] += vel[axis] * dt;
        if (Math.abs(vel[axis]) > 0.02) moving = true;
      }
    }
    applyPos();
    inertiaId = moving ? requestAnimationFrame(step) : 0;
  };
  inertiaId = requestAnimationFrame(step);
}

const rubber = (v, lo, hi) => (v > hi ? hi + (v - hi) * 0.35 : v < lo ? lo + (v - lo) * 0.35 : v);

let drag = null;

function touched() {
  board.classList.add("is-touched");
}

board.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const card = e.target.closest(".pcard");
  if (mode === "arrange" && !card) return;
  stopInertia();
  drag = {
    id: e.pointerId,
    sx: e.clientX,
    sy: e.clientY,
    px: pos.x,
    py: pos.y,
    card: mode === "arrange" ? card : null,
    moved: false,
    samples: [{ t: performance.now(), x: e.clientX, y: e.clientY }],
  };
});

board.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.sx;
  const dy = e.clientY - drag.sy;
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    // Only now take over the pointer, so a plain click on a card link still
    // reaches the link.
    try {
      board.setPointerCapture(drag.id);
    } catch (err) {
      /* fine */
    }
    board.classList.add("is-dragging");
    touched();
    if (drag.card) startCardDrag(e);
  }
  e.preventDefault();
  if (drag.card) {
    moveCardDrag(e);
    return;
  }
  const now = performance.now();
  drag.samples.push({ t: now, x: e.clientX, y: e.clientY });
  while (drag.samples.length > 2 && now - drag.samples[0].t > 90) drag.samples.shift();
  const x = metrics.panX ? rubber(drag.px + dx, metrics.minX, metrics.maxX) : pos.x;
  // Phones: sideways only — up/down is the page's.
  const y = metrics.panY && !phoneQuery.matches ? rubber(drag.py + dy, metrics.minY, metrics.maxY) : pos.y;
  pos.x = x;
  pos.y = y;
  applyPos();
});

function endDrag(e, cancelled) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  board.classList.remove("is-dragging");
  if (!d.moved) return;
  suppressClick = true;
  setTimeout(() => (suppressClick = false), 60);
  try {
    board.releasePointerCapture(d.id);
  } catch (err) {
    /* fine */
  }
  if (d.card) {
    dropCardDrag();
    return;
  }
  if (cancelled) {
    startInertia();
    return;
  }
  const s = d.samples;
  const a = s[0];
  const b = s[s.length - 1];
  const span = Math.max(1, b.t - a.t);
  vel.x = metrics.panX ? (b.x - a.x) / span : 0;
  vel.y = metrics.panY && !phoneQuery.matches ? (b.y - a.y) / span : 0;
  if (reduced) {
    vel.x = vel.y = 0;
    setPos(pos.x, pos.y);
  } else {
    startInertia();
  }
}
board.addEventListener("pointerup", (e) => endDrag(e, false));
board.addEventListener("pointercancel", (e) => endDrag(e, true));

// A drag never opens a project.
board.addEventListener(
  "click",
  (e) => {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true
);
// No native image/link dragging fighting ours.
canvas.addEventListener("dragstart", (e) => e.preventDefault());

// Sideways wheel / trackpad swipe (or Shift + wheel) pans; plain vertical
// wheel is left alone so the page keeps scrolling.
board.addEventListener(
  "wheel",
  (e) => {
    if (mode !== "pan" || !metrics.panX || e.ctrlKey) return;
    let dx = e.deltaX;
    if (e.shiftKey && !dx) dx = e.deltaY;
    if (!dx) return;
    if (e.deltaMode === 1) dx *= 16;
    const nx = clamp(pos.x - dx, metrics.minX, metrics.maxX);
    if (nx === pos.x) return;
    e.preventDefault();
    stopInertia();
    touched();
    setPos(nx, pos.y);
  },
  { passive: false }
);

// Keyboard: arrows pan the board when it has focus.
board.addEventListener("keydown", (e) => {
  const card = e.target.closest(".pcard");
  if (card && e.altKey && mode === "arrange" && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
    e.preventDefault();
    moveCardByKey(card, e.key);
    return;
  }
  if (e.target !== board || mode !== "pan") return;
  const step = 140;
  const move = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
  if (!move) return;
  e.preventDefault();
  touched();
  easePos(pos.x + move[0], pos.y + move[1]);
});

function easePos(x, y) {
  stopInertia();
  if (!reduced) {
    canvas.style.transition = "transform 0.45s cubic-bezier(0.45, 0, 0.25, 1)";
    window.setTimeout(() => (canvas.style.transition = ""), 480);
  }
  setPos(x, y);
}

// Tabbing to a card that's off-screen brings it into view.
board.addEventListener("focusin", (e) => {
  const card = e.target.closest(".pcard");
  if (!card || mode !== "pan") return;
  const b = board.getBoundingClientRect();
  const r = card.getBoundingClientRect();
  const m = 24;
  let dx = 0;
  let dy = 0;
  if (r.left < b.left + m) dx = b.left + m - r.left;
  else if (r.right > b.right - m) dx = b.right - m - r.right;
  if (r.top < b.top + m) dy = b.top + m - r.top;
  else if (r.bottom > b.bottom - m) dy = b.bottom - m - r.bottom;
  if (dx || dy) easePos(pos.x + dx, pos.y + dy);
});
// The browser may try to scroll the clipped board itself to reveal focus;
// we move the canvas instead.
board.addEventListener("scroll", () => {
  board.scrollLeft = 0;
  board.scrollTop = 0;
});

/* ---- arrange mode: drag a card to a new place ---- */
let cardDrag = null;

function startCardDrag(e) {
  const card = drag.card;
  const r = card.getBoundingClientRect();
  const slot = document.createElement("li");
  slot.className = "pcard pcard-slot";
  slot.setAttribute("aria-hidden", "true");
  canvas.insertBefore(slot, card);
  cardDrag = { card, slot, offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, h: r.height };
  card.classList.add("is-dragging");
  card.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
  // position: fixed inside the translated canvas would be relative to the
  // canvas, so the card moves out to <body> while it's held.
  document.body.appendChild(card);
}

function moveCardDrag(e) {
  const d = cardDrag;
  if (!d) return;
  d.card.style.left = `${e.clientX - d.offX}px`;
  d.card.style.top = `${e.clientY - d.offY}px`;
  const cr = canvas.getBoundingClientRect();
  const cs = getComputedStyle(canvas);
  const pad = parseFloat(cs.paddingLeft) || 0;
  const gap = parseFloat(cs.columnGap) || 0;
  const col = clamp(Math.floor((e.clientX - cr.left - pad + gap / 2) / (d.w + gap)), 0, metrics.cols - 1);
  const row = clamp(Math.floor((e.clientY - cr.top - pad + gap / 2) / (d.h + gap)), 0, metrics.rows - 1);
  const items = Array.from(canvas.children).filter((c) => !c.hidden && c !== d.slot);
  const idx = clamp(row * metrics.cols + col, 0, items.length);
  if (items[idx] === d.slot.nextElementSibling || (idx === items.length && !d.slot.nextElementSibling)) return;
  flip(() => canvas.insertBefore(d.slot, items[idx] || null));
}

function dropCardDrag() {
  const d = cardDrag;
  cardDrag = null;
  if (!d) return;
  const finish = () => {
    d.card.classList.remove("is-dragging");
    d.card.style.cssText = "";
    canvas.replaceChild(d.card, d.slot);
    const domOrder = Array.from(canvas.children).filter((c) => c.classList.contains("pcard") && !c.hidden);
    order = [...domOrder, ...order.filter((c) => !domOrder.includes(c))];
    const pos1 = domOrder.indexOf(d.card) + 1;
    if (liveEl) liveEl.textContent = `${d.card.querySelector(".pcard__title").textContent} moved to position ${pos1} of ${domOrder.length}.`;
  };
  if (reduced) {
    finish();
    return;
  }
  const to = d.slot.getBoundingClientRect();
  d.card.style.transition = "left 0.35s cubic-bezier(0.45, 0, 0.25, 1), top 0.35s cubic-bezier(0.45, 0, 0.25, 1), transform 0.35s ease";
  d.card.style.left = `${to.left}px`;
  d.card.style.top = `${to.top}px`;
  window.setTimeout(finish, 370);
}

function moveCardByKey(card, key) {
  const list = Array.from(canvas.children).filter((c) => !c.hidden && c.classList.contains("pcard"));
  const i = list.indexOf(card);
  const delta = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : key === "ArrowUp" ? -metrics.cols : metrics.cols;
  const j = clamp(i + delta, 0, list.length - 1);
  if (j === i) return;
  flip(() => {
    const target = list[j];
    if (j > i) target.after(card);
    else target.before(card);
  });
  card.focus();
  const domOrder = Array.from(canvas.children).filter((c) => c.classList.contains("pcard") && !c.hidden);
  order = [...domOrder, ...order.filter((c) => !domOrder.includes(c))];
  if (liveEl) liveEl.textContent = `${card.querySelector(".pcard__title").textContent} moved to position ${j + 1} of ${list.length}.`;
}

/* ---- the skills banner only runs while its card is on screen ---- */
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.target.classList.toggle("is-live", en.isIntersecting)),
    { root: board, threshold: 0.05 }
  );
  cards.forEach((c) => io.observe(c));
} else {
  cards.forEach((c) => c.classList.add("is-live"));
}
// Duplicate each skills list once so the banner can loop seamlessly.
cards.forEach((card) => {
  const wrap = card.querySelector(".pcard__skills");
  const group = wrap && wrap.querySelector(".pgroup");
  if (!group) return;
  const track = document.createElement("div");
  track.className = "pcard__track";
  group.replaceWith(track);
  track.appendChild(group);
  const copy = group.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  track.appendChild(copy);
});

/* -------------------------------------------------------------
   3. THE FILTER
   ------------------------------------------------------------- */
if (filterBar) {
  const buttons = Array.from(filterBar.querySelectorAll(".filter__button"));
  buttons.forEach((button) =>
    button.addEventListener("click", () => {
      filter = button.dataset.filter;
      buttons.forEach((b) => b.setAttribute("aria-pressed", b.dataset.filter === filter));
      layout(true);
    })
  );
  filterBar.hidden = false;
}

/* ---- start ---- */
board.classList.add("board--js");
initHero();
let layoutQueued = false;
function queueLayout() {
  if (layoutQueued) return;
  layoutQueued = true;
  requestAnimationFrame(() => {
    layoutQueued = false;
    layout(false);
  });
}
layout(false);
// The section starts hidden; this lays it out the moment it's shown, and
// again whenever the window is resized or turned.
if (window.ResizeObserver) new ResizeObserver(queueLayout).observe(board);
window.addEventListener("resize", queueLayout);
phoneQuery.addEventListener && phoneQuery.addEventListener("change", queueLayout);

})();
