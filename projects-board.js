/* =============================================================
   PROJECTS-BOARD.JS — the Projects section
   =============================================================
   Three jobs, all for the #case-studies section:

   1. THE HERO. A banner for the opening statement. Under it a route runs
      from Medellín to Wellington; an orb travels it and each discipline
      lights up as the orb reaches its stop.

   2. THE BOARD. One card per project, laid out in a balanced grid that
      is bigger than the window. You drag it around:
        - desktop: sideways or up/down, one direction per drag (with
          momentum), sideways wheel/trackpad,
          or the arrow keys; focusing a card brings it into view
        - phones: sideways only, so up/down still scrolls the page
      The card area fades out at an edge where more cards are hidden.
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

// The page language, so the words this file writes follow it.
const ES = (document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;

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

// The banner's route: the first time the banner is in view the curves draw
// themselves, then an orb travels from Medellín to Wellington and each
// discipline lights up as the orb reaches its stop. When the orb arrives
// everything stays lit for a moment, fades, and the journey starts again.
// It only runs while the banner is on screen. With reduced motion (or no
// IntersectionObserver) the finished route shows and everything is lit.
function initHero() {
  if (!hero) return;
  const main = hero.querySelector("#routeMain");
  const orb = hero.querySelector(".route__orb");
  const stops = Array.from(hero.querySelectorAll(".route__stops circle"));
  const links = Array.from(hero.querySelectorAll(".route__links line"));
  const chips = Array.from(hero.querySelectorAll(".route__skills li"));
  const labels = Array.from(hero.querySelectorAll(".route__labels text"));
  const lightAll = (on) => {
    stops.forEach((s, i) => {
      s.classList.toggle("is-lit", on);
      s.style.color = s.getAttribute("fill");
      if (links[i]) links[i].classList.toggle("is-lit", on);
      if (chips[i]) chips[i].classList.toggle("is-lit", on);
      if (labels[i]) labels[i].classList.toggle("is-lit", on);
    });
  };

  // Seat each label exactly under its point: find how far along the label
  // path the point's x position is, and start the (centred) text there.
  const lp = hero.querySelector("#routeLabelPath");
  if (lp && lp.getTotalLength) {
    const lpLen = lp.getTotalLength();
    stops.forEach((s, i) => {
      const tp = labels[i] && labels[i].querySelector("textPath");
      if (!tp) return;
      const x = +s.getAttribute("cx");
      let lo = 0;
      let hi = lpLen;
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        if (lp.getPointAtLength(mid).x < x) lo = mid;
        else hi = mid;
      }
      tp.setAttribute("startOffset", `${((lo / lpLen) * 100).toFixed(2)}%`);
    });
  }

  if (reduced || !("IntersectionObserver" in window) || !main || !main.getTotalLength) {
    hero.classList.add("is-static");
    lightAll(true);
    return;
  }

  // How far along the route (0..1) each stop sits, from its x position.
  const total = main.getTotalLength();
  const progress = stops.map((s) => {
    const x = +s.getAttribute("cx");
    let lo = 0;
    let hi = total;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (main.getPointAtLength(mid).x < x) lo = mid;
      else hi = mid;
    }
    return lo / total;
  });

  const TRAVEL = 7500;
  const HOLD = 0; // everything fades the moment the orb reaches Wellington
  const GAP = 1500;
  let start = 0;
  let rafId = 0;
  let lit = 0;

  const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

  const frame = (now) => {
    if (!start) start = now;
    if (now < start) {
      rafId = requestAnimationFrame(frame);
      return;
    }
    const t = now - start;
    if (t < TRAVEL) {
      const p = ease(t / TRAVEL);
      const pt = main.getPointAtLength(p * total);
      orb.setAttribute("cx", pt.x.toFixed(1));
      orb.setAttribute("cy", pt.y.toFixed(1));
      orb.classList.add("is-on");
      while (lit < stops.length && p >= progress[lit]) {
        stops[lit].classList.add("is-lit");
        stops[lit].style.color = stops[lit].getAttribute("fill");
        if (links[lit]) links[lit].classList.add("is-lit");
        if (chips[lit]) chips[lit].classList.add("is-lit");
        if (labels[lit]) labels[lit].classList.add("is-lit");
        lit++;
      }
    } else if (t < TRAVEL + HOLD) {
      orb.classList.remove("is-on");
    } else if (t < TRAVEL + HOLD + GAP) {
      orb.classList.remove("is-on");
      if (lit) {
        lightAll(false);
        lit = 0;
      }
    } else {
      start = now;
    }
    rafId = requestAnimationFrame(frame);
  };

  const run = () => {
    if (!start) start = performance.now() + 1600; // let the curves draw first
    if (!rafId) rafId = requestAnimationFrame(frame);
  };
  const halt = () => {
    cancelAnimationFrame(rafId);
    rafId = 0;
    start = 0;
    lightAll(false);
    lit = 0;
    orb.classList.remove("is-on");
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          hero.classList.add("is-in");
          run();
        } else {
          halt();
        }
      });
    },
    { threshold: 0.25 }
  );
  io.observe(hero);
}

// The banner is a full screen of its own, so the nav (top bar and side
// trail) stays out of its way: while the banner covers the top of the
// window the page gets .is-banner (which hides them), and as soon as the
// banner's line has scrolled past they fade in. Also tells the CSS how tall
// the top bar is, so the banner can reach right up behind it.
function initBannerNav() {
  if (!hero) return;
  const header = document.querySelector(".site-header");
  let queued = false;
  // The banner is exactly one screen tall and starts at the very top of the
  // page, whatever the window size or top-bar height: measure where it
  // naturally sits, pull it up by that much, and make it as tall as the
  // window, so its line is always at the bottom edge of the screen.
  const fit = () => {
    if (hero.offsetParent === null) return;
    hero.style.marginTop = "0px";
    const natural = hero.getBoundingClientRect().top + window.scrollY;
    hero.style.marginTop = `${-natural}px`;
    hero.style.minHeight = `${window.innerHeight}px`;
    hero.style.setProperty("--top", `${natural}px`);
  };
  const update = () => {
    queued = false;
    const h = header ? header.offsetHeight : 0;
    if (h) document.documentElement.style.setProperty("--header-h", `${h}px`);
    const r = hero.getBoundingClientRect();
    const showing = hero.offsetParent !== null && r.height > 0;
    document.body.classList.toggle("is-banner", showing && r.bottom > h);
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", () => {
    fit();
    queue();
  });
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      fit();
      queue();
    }).observe(hero);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  fit();
  update();
}


/* -------------------------------------------------------------
   2. THE BOARD
   ------------------------------------------------------------- */
const filterBar = section.querySelector(".filter");
const statusEl = section.querySelector(".filter__status");
const liveEl = document.getElementById("boardLive");
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
  // How much is still hidden beyond each edge (0..1) — the board fades there.
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
  mode = fitsX && fitsY ? "arrange" : "pan";
  board.classList.toggle("is-arrange", mode === "arrange");
  board.classList.toggle("is-xonly", phone);
  // The navigator is only useful when there's somewhere to go.

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
  if (statusEl) statusEl.textContent = ES
      ? `Mostrando ${shown} de ${cards.length} proyectos` + " · el color de una tarjeta es su categoría principal" + (mode === "arrange" ? " — arrastra las tarjetas para reordenarlas." : ".")
      : `Showing ${shown} of ${cards.length} projects` + " · a card's colour is its main category" + (mode === "arrange" ? " — drag the cards to rearrange them." : ".");
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
    // One direction at a time: whichever way the drag starts (sideways or
    // up/down) is the only way this drag moves the board. If the board can
    // only slide one way, that way is used.
    const canY = metrics.panY && !phoneQuery.matches;
    drag.axis = !canY ? "x" : !metrics.panX ? "y" : Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    // Only now take over the pointer, so a plain click on a card link still
    // reaches the link.
    try {
      board.setPointerCapture(drag.id);
    } catch (err) {
      /* fine */
    }
    board.classList.add("is-dragging");
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
  const x = metrics.panX && drag.axis === "x" ? rubber(drag.px + dx, metrics.minX, metrics.maxX) : pos.x;
  // Phones: sideways only — up/down is the page's.
  const y = metrics.panY && !phoneQuery.matches && drag.axis === "y" ? rubber(drag.py + dy, metrics.minY, metrics.maxY) : pos.y;
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
  vel.x = metrics.panX && d.axis === "x" ? clamp((b.x - a.x) / span, -3, 3) : 0;
  vel.y = metrics.panY && !phoneQuery.matches && d.axis === "y" ? clamp((b.y - a.y) / span, -3, 3) : 0;
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
// No native image/link dragging fighting ours. A link is draggable by
// default, and a real mouse that grabs a card (a link) started the
// browser's own drag-and-drop and ended our pan — which is why the board
// could only be grabbed by the empty space between the cards. The links
// are made undraggable, and any drag the browser still tries is cancelled.
canvas.querySelectorAll("a, img").forEach((el) => el.setAttribute("draggable", "false"));
board.addEventListener("dragstart", (e) => e.preventDefault());
// A mouse press on the board shouldn't select text or start a native drag.
board.addEventListener("mousedown", (e) => {
  if (e.button === 0 && e.target.closest(".pcard")) e.preventDefault();
});

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
    if (liveEl) liveEl.textContent = ES ? `${d.card.querySelector(".pcard__title").textContent} movida a la posición ${pos1} de ${domOrder.length}.` : `${d.card.querySelector(".pcard__title").textContent} moved to position ${pos1} of ${domOrder.length}.`;
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
  if (liveEl) liveEl.textContent = ES ? `${card.querySelector(".pcard__title").textContent} movida a la posición ${j + 1} de ${list.length}.` : `${card.querySelector(".pcard__title").textContent} moved to position ${j + 1} of ${list.length}.`;
}

/* ---- colour means something: the category on every card ----
   The card's border/glow is its main category; this small label says
   which one in words (and names a second category if it has one). */
const CATEGORY_NAMES = ES
  ? { ux: "UX e investigación", immersive: "Inmersivo y VR", game: "Juegos y narrativa", ai: "Diseño con IA", motion: "3D y movimiento" }
  : { ux: "UX & Research", immersive: "Immersive & VR", game: "Game & Narrative", ai: "AI-Driven Design", motion: "3D & Motion" };
const CATEGORY_COLOURS = { ux: "#4d7dff", immersive: "#8f5cff", game: "#f887fa", ai: "#22d3ee", motion: "#fd7069" };
cards.forEach((card) => {
  const body = card.querySelector(".pcard__body");
  if (!body || body.querySelector(".pcard__kicker")) return;
  const kicker = document.createElement("p");
  kicker.className = "pcard__kicker";
  [card.dataset.cat, card.dataset.cat2].forEach((key) => {
    if (!key || !CATEGORY_NAMES[key]) return;
    const span = document.createElement("span");
    span.style.setProperty("--k", CATEGORY_COLOURS[key]);
    span.textContent = CATEGORY_NAMES[key];
    kicker.appendChild(span);
  });
  body.prepend(kicker);
});

/* ---- hovering a category chip lights up the cards that belong to it ---- */
function preview(category) {
  if (!category || category === "all") {
    board.classList.remove("is-previewing");
    return;
  }
  cards.forEach((c) => c.classList.toggle("is-match", c.dataset.category.split(" ").includes(category)));
  board.classList.add("is-previewing");
}
if (filterBar) {
  filterBar.querySelectorAll(".filter__button").forEach((b) => {
    b.addEventListener("pointerenter", () => preview(b.dataset.filter));
    b.addEventListener("focus", () => preview(b.dataset.filter));
    b.addEventListener("pointerleave", () => preview());
    b.addEventListener("blur", () => preview());
  });
}

/* ---- the skills banner only runs while its card is on screen ---- */
const researchCards = Array.from(section.querySelectorAll(".rcard"));
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.target.classList.toggle("is-live", en.isIntersecting)),
    { root: board, threshold: 0.05 }
  );
  cards.forEach((c) => io.observe(c));
  // The research cards sit on the page, not in the board.
  const io2 = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.target.classList.toggle("is-live", en.isIntersecting)),
    { threshold: 0.05 }
  );
  researchCards.forEach((c) => io2.observe(c));
} else {
  cards.concat(researchCards).forEach((c) => c.classList.add("is-live"));
}

/* ---- cards that have a video: the video is the card's main picture ----
   Once the section is on screen, every card that is in view plays its clip
   (muted, on a loop); a card that scrolls or drags out of view pauses, so
   only what you can see is working. The still stays as the poster until
   the clip is really playing. Each clip loops just a short stretch of the
   video (data-loop="start,end" in seconds, default 2 to 9), so only a few
   seconds are ever streamed. Skipped for reduced motion and Data Saver,
   and a clip that can't load is dropped, leaving the picture. */
const clips = [];
cards.concat(researchCards).forEach((card) => {
  const link = card.querySelector("[data-video]");
  const media = card.querySelector(".pcard__media");
  if (!link || !media) return;
  const badge = document.createElement("span");
  badge.className = "pcard__play";
  badge.setAttribute("aria-hidden", "true");
  badge.textContent = ES ? "Vídeo" : "Video";
  media.appendChild(badge);
  const span = (link.dataset.loop || "2,9").split(",").map(Number);
  clips.push({ card, link, media, badge, video: null, broken: false, from: span[0] || 0, to: span[1] || 9 });
});

// ?novideo in the address keeps the clips off (handy when testing layout).
const saveData = !!(navigator.connection && navigator.connection.saveData) || /[?&]novideo/.test(location.search);

function playClip(clip) {
  if (reduced || saveData || clip.broken) return;
  if (!clip.video) {
    const v = document.createElement("video");
    v.className = "pcard__video";
    v.muted = true;
    v.preload = "metadata";
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("aria-hidden", "true");
    v.tabIndex = -1;
    const still = clip.media.querySelector("img");
    if (still && still.style.objectPosition) v.style.objectPosition = still.style.objectPosition;
    v.addEventListener("loadedmetadata", () => {
      // Start the loop part-way in (the first seconds are often a title or a black frame).
      v.currentTime = Math.min(clip.from, Math.max(0, (v.duration || clip.from) - 1));
    });
    v.addEventListener("playing", () => clip.media.classList.add("is-playing"));
    v.addEventListener("timeupdate", () => {
      if (v.currentTime >= Math.min(clip.to, v.duration || clip.to) - 0.05) v.currentTime = clip.from;
    });
    v.addEventListener("ended", () => {
      v.currentTime = clip.from;
      v.play().catch(() => {});
    });
    v.addEventListener("error", () => {
      clip.broken = true;
      clip.media.classList.remove("is-playing");
      v.remove();
      clip.badge.remove();
      clip.video = null;
    });
    v.src = clip.link.dataset.video;
    clip.media.insertBefore(v, clip.badge);
    clip.video = v;
  }
  const p = clip.video.play();
  if (p && p.catch) p.catch(() => {});
}

function stopClip(clip) {
  if (!clip.video) return;
  clip.video.pause();
}

if ("IntersectionObserver" in window) {
  // Observed against the page's viewport; the board's clipping is counted,
  // so a card dragged out of the board counts as out of view.
  const vio = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        const clip = clips.find((c) => c.card === en.target);
        if (!clip) return;
        if (en.isIntersecting) playClip(clip);
        else stopClip(clip);
      }),
    { threshold: 0.35 }
  );
  clips.forEach((c) => vio.observe(c.card));
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) clips.forEach(stopClip);
});

// Duplicate each skills list once so the banner can loop seamlessly.
cards.concat(researchCards).forEach((card) => {
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
initBannerNav();
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
