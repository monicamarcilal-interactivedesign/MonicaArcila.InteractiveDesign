/* =============================================================
   LANDING-FX.JS — the 2D light show behind and around the landing flower
   =============================================================
   Three plain 2D canvases (no libraries), all inside #landingStage:

     #fxDroplets  big soft colour "droplets" drifting behind the flower —
                  each one a dense, bright head with a long tail that
                  thins out behind it, like a drop of colour pulled
                  through the dark. Fades in when the stage wakes up
                  (.is-awake, set by script.js on click).
     #fxDust      faint dust and little four-point stars, always there.
     #fxLines     the connections: bundles of thin curves linking every
                  orb to the others and to the motto words Designing /
                  felt / valued. They GROW one connection at a time like
                  stems (growLines), then keep glowing, with small lights
                  travelling along them, forever.

   script.js drives it through window.landingFx:
     setActive(bool)  run/stop the loop (stopped while a section is open)
     growLines()      start growing the connections
     clearLines()     remove them again (back to the idle landing)

   Everything is cheap on purpose (the droplet canvas is drawn at about a
   about half of the resolution — it's soft anyway; fewer strands, particles
   and a lower pixel ratio on touch screens) and stays still for anyone
   with prefers-reduced-motion.
   ============================================================= */

(function () {

const stage = document.getElementById("landingStage");
const cDrop = document.getElementById("fxDroplets");
const cDust = document.getElementById("fxDust");
const cLines = document.getElementById("fxLines");
if (!stage || !cDrop || !cDust || !cLines) return;

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(pointer: coarse)").matches;
const DPR = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
const DROP_SCALE = isTouch ? 0.5 : 0.45;
// What the quality governor (section 5) changes if a device struggles.
let dprNow = DPR;

// Phones: the travelling lights get a small canvas of their own on top of the
// frozen connections, so only they are redrawn (see drawPulses).
let cPulse = null;
let pulseCtx = null;
if (isTouch) {
  cPulse = document.createElement("canvas");
  cPulse.id = "fxPulses";
  cPulse.className = cLines.className.replace("is-frozen", "").trim();
  cPulse.setAttribute("aria-hidden", "true");
  cPulse.style.zIndex = "8";
  cLines.after(cPulse);
  pulseCtx = cPulse.getContext("2d");
}

const dropCtx = cDrop.getContext("2d");
const dustCtx = cDust.getContext("2d");
const lineCtx = cLines.getContext("2d");

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

let W = 0;
let H = 0;

/* -------------------------------------------------------------
   1. DUST AND STARS
   ------------------------------------------------------------- */
const DUST_COLOURS = [[255, 255, 255], [165, 240, 255], [195, 175, 255]];
let dust = [];

function seedDust() {
  const count = clamp(Math.round((W * H) / (isTouch ? 11000 : 7500)), 40, 200);
  dust = [];
  for (let i = 0; i < count; i++) {
    dust.push({
      x: rand(0, W),
      y: rand(0, H),
      r: 0.4 + Math.pow(Math.random(), 2) * 1.3,
      vx: rand(-3, 3),
      vy: -rand(1.5, 7),
      twinkle: rand(0, 6.28),
      speed: rand(0.4, 1.6),
      alpha: rand(0.25, 0.85),
      colour: DUST_COLOURS[(Math.random() * DUST_COLOURS.length) | 0],
      star: Math.random() < 0.07,
    });
  }
}

function drawDust(t, dt) {
  dustCtx.clearRect(0, 0, W, H);
  for (const p of dust) {
    if (!reduced) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < -4) p.y = H + 4;
      if (p.x < -4) p.x = W + 4;
      if (p.x > W + 4) p.x = -4;
    }
    const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * p.speed + p.twinkle);
    const a = p.alpha * tw;
    const [r, g, b] = p.colour;
    dustCtx.fillStyle = `rgba(${r},${g},${b},${a})`;
    dustCtx.beginPath();
    dustCtx.arc(p.x, p.y, p.r * (p.star ? 1.5 : 1), 0, 6.2832);
    dustCtx.fill();
    if (p.star) {
      const len = 3 + p.r * 5 * tw;
      dustCtx.strokeStyle = `rgba(${r},${g},${b},${a * 0.8})`;
      dustCtx.lineWidth = 0.6;
      dustCtx.beginPath();
      dustCtx.moveTo(p.x - len, p.y);
      dustCtx.lineTo(p.x + len, p.y);
      dustCtx.moveTo(p.x, p.y - len);
      dustCtx.lineTo(p.x, p.y + len);
      dustCtx.stroke();
    }
  }
}

/* -------------------------------------------------------------
   2. COLOUR DROPLETS
   Each droplet moves along a smooth looping path (two sine waves at
   different speeds). Its tail is that same path sampled further back in
   time, drawn as overlapping soft discs that shrink and fade — so the
   colour is condensed at the head and flows out behind it.
   ------------------------------------------------------------- */
const DROPLETS = [
  { rgb: [135, 71, 248],  cx: 0.50, cy: 0.45, ax: 0.46, ay: 0.38, t1: 31, t2: 43, p1: 0.0, p2: 1.3, size: 1.0,  strength: 1.0 },
  { rgb: [77, 125, 255],  cx: 0.55, cy: 0.60, ax: 0.44, ay: 0.33, t1: 37, t2: 29, p1: 2.1, p2: 0.4, size: 0.9,  strength: 1.0 },
  { rgb: [34, 211, 238],  cx: 0.45, cy: 0.50, ax: 0.40, ay: 0.40, t1: 41, t2: 34, p1: 4.0, p2: 2.2, size: 0.75, strength: 0.8 },
  { rgb: [248, 135, 250], cx: 0.60, cy: 0.35, ax: 0.38, ay: 0.30, t1: 27, t2: 39, p1: 5.2, p2: 3.1, size: 0.8,  strength: 0.8 },
  { rgb: [253, 112, 105], cx: 0.72, cy: 0.30, ax: 0.22, ay: 0.20, t1: 47, t2: 36, p1: 1.0, p2: 5.0, size: 0.7,  strength: 0.55 },
];
const TRAIL_SECONDS = 7.5;
const TRAIL_STEPS = 44;
let trailSteps = TRAIL_STEPS; // fewer, stronger steps if the device struggles
let dropEvery = isTouch ? 2 : 1; // redraw the droplets every n-th frame (they move very slowly)
let dropCount = 0;
let lineCount = 0;
let lineAcc = 0;
// On phones the show is drawn once and then left alone: the droplets and
// the dust are still pictures, and the connections grow and then stay as a
// finished picture that only glows (a CSS fade on the canvas, which costs
// the phone nothing). See section 3 and the .is-frozen rule in styles.css.
let linesFrozen = false;
let dropsStatic = false;
let dustStatic = false;
const STILL_TIME = 20; // the moment in the droplets' paths that is drawn on phones

function dropletAt(d, t) {
  return {
    x: W * (d.cx + d.ax * Math.sin((6.2832 / d.t1) * t + d.p1)),
    y: H * (d.cy + d.ay * Math.sin((6.2832 / d.t2) * t + d.p2)),
  };
}

function blob(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
  g.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.4})`);
  g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// (A cached-sprite version was tried on 2026-10-05 and dropped: stamping an
// 8-bit disc loses the faint end of the tails, which the gradient's own
// dithering keeps, so the look changed.)
function drawDroplets(t) {
  dropCtx.clearRect(0, 0, W, H);
  dropCtx.globalCompositeOperation = "lighter";
  const headR = Math.max(W, H) * 0.115;
  const time = reduced ? 20 : t;
  // With fewer steps each one is stronger, so the tail keeps its density.
  const boost = TRAIL_STEPS / trailSteps;
  for (const d of DROPLETS) {
    for (let i = trailSteps; i >= 0; i--) {
      const s = i / trailSteps; // 0 = head, 1 = tail tip
      const pos = dropletAt(d, time - s * TRAIL_SECONDS);
      const r = headR * d.size * (0.3 + 0.7 * Math.pow(1 - s, 1.2));
      const a = 0.075 * boost * d.strength * Math.pow(1 - s, 1.05);
      blob(dropCtx, pos.x, pos.y, r, d.rgb, a);
    }
    const head = dropletAt(d, time);
    blob(dropCtx, head.x, head.y, headR * d.size * 0.85, d.rgb, 0.34 * d.strength);
  }
  dropCtx.globalCompositeOperation = "source-over";
}

/* -------------------------------------------------------------
   3. THE CONNECTIONS
   ------------------------------------------------------------- */
const ORB_RGB = {
  about: [244, 150, 37],
  skills: [249, 96, 202],
  "case-studies": [164, 113, 240],
  experience: [0, 255, 189],
  contact: [63, 228, 250],
};
const WORD_RGB = [205, 232, 255];

// Orb-to-orb first (the sun outward, then round the ring), then orbs to
// the three motto words.
const CONNECTIONS = [
  ["o:about", "o:skills"], ["o:about", "o:case-studies"], ["o:about", "o:experience"], ["o:about", "o:contact"],
  ["o:skills", "o:case-studies"], ["o:case-studies", "o:experience"], ["o:experience", "o:contact"], ["o:contact", "o:skills"],
  ["o:skills", "o:experience"], ["o:case-studies", "o:contact"],
  ["w:designing", "o:skills"], ["w:designing", "o:about"], ["w:designing", "o:case-studies"],
  ["w:felt", "o:about"], ["w:felt", "o:contact"], ["w:felt", "o:experience"],
  ["w:valued", "o:about"], ["w:valued", "o:contact"], ["w:valued", "o:experience"],
];
const WORD_IDS = { designing: "wordDesigning", felt: "wordFelt", valued: "wordValued" };

const STRANDS = 6;
const STAGGER = isTouch ? 0.3 : 0.36; // seconds between one connection starting and the next
const GROW = 1.7; // seconds for a strand to grow its full length
const STRAND_DELAY = 0.09;

let conns = [];
let linesStart = 0;
let linesOn = false;
let linesPending = false;
let nodes = {}; // resolved each frame

function resolveNodes() {
  const stageRect = stage.getBoundingClientRect();
  nodes = {};
  stage.querySelectorAll(".orb").forEach((orb) => {
    const id = [...orb.classList].find((c) => c.startsWith("orb--")).slice(5);
    const img = orb.querySelector(".orb__img") || orb;
    const r = img.getBoundingClientRect();
    nodes["o:" + id] = { x: r.left + r.width / 2 - stageRect.left, y: r.top + r.height / 2 - stageRect.top, rgb: ORB_RGB[id] };
  });
  for (const key of Object.keys(WORD_IDS)) {
    const el = document.getElementById(WORD_IDS[key]);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    // The right-hand end of the word, a touch beyond it, at mid-height —
    // where the mockups' lines leave the lettering.
    nodes["w:" + key] = { x: r.right + 6 - stageRect.left, y: r.top + r.height * 0.52 - stageRect.top, rgb: WORD_RGB };
  }
}

function buildConnections() {
  conns = CONNECTIONS.map(([a, b], i) => {
    const curv = (Math.random() < 0.5 ? -1 : 1) * rand(0.1, 0.3);
    const strands = [];
    for (let k = 0; k < STRANDS; k++) {
      strands.push({ f: STRANDS === 1 ? 0 : (k / (STRANDS - 1) - 0.5) * 2, sway: rand(0, 6.28) });
    }
    return {
      a, b, strands, curv,
      spread: rand(0.08, 0.17),
      start: i * STAGGER,
      phase: rand(0, 6.28),
      pulse: { strand: (Math.random() * STRANDS) | 0, t: 0, wait: rand(0.5, 3), dir: Math.random() < 0.5 ? 1 : -1, speed: rand(0.16, 0.28) },
    };
  });
}

function controlPoints(A, B, conn, strand, t) {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  // A slow sway so the bundles breathe instead of sitting rigid.
  const sway = reduced ? 0 : Math.sin(t * 0.5 + strand.sway) * 0.012;
  const o1 = (conn.curv + strand.f * conn.spread + sway) * L;
  const o2 = (conn.curv * 0.8 - strand.f * conn.spread * 0.7 - sway) * L;
  return [
    { x: A.x + dx * 0.3 + nx * o1, y: A.y + dy * 0.3 + ny * o1 },
    { x: A.x + dx * 0.7 + nx * o2, y: A.y + dy * 0.7 + ny * o2 },
  ];
}

function bez(A, c1, c2, B, u) {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return { x: a * A.x + b * c1.x + c * c2.x + d * B.x, y: a * A.y + b * c1.y + c * c2.y + d * B.y };
}

function traceCurve(A, c1, c2, B, from, to, steps) {
  for (let i = 0; i <= steps; i++) {
    const p = bez(A, c1, c2, B, from + ((to - from) * i) / steps);
    if (i === 0) lineCtx.moveTo(p.x, p.y);
    else lineCtx.lineTo(p.x, p.y);
  }
}

function strokeCurve(A, c1, c2, B, from, to, steps) {
  lineCtx.beginPath();
  traceCurve(A, c1, c2, B, from, to, steps);
  lineCtx.stroke();
}

// Phones (and any device the governor has stepped down) get the same lines
// drawn more cheaply: one stroke per bundle and fewer segments per curve.
const lean = () => isTouch || tier >= 1;

const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

function drawLines(t, dt) {
  if (linesFrozen) return;
  lineCtx.clearRect(0, 0, W, H);
  if (!linesOn) return;
  resolveNodes();
  // The growth is timed on the animation frames' own clock (set on the first
  // frame after growLines), so it cannot be thrown off by two different clocks.
  if (linesPending) {
    linesStart = t;
    linesPending = false;
  }
  const elapsed = reduced ? 1e6 : t - linesStart;
  // On phones, once every bundle has grown, draw one last, finished frame
  // and freeze it.
  const lastConn = conns[conns.length - 1];
  const finalFrame = isTouch && !!lastConn && elapsed >= lastConn.start + (STRANDS - 1) * STRAND_DELAY + GROW + 0.3;
  lineCtx.globalCompositeOperation = "lighter";
  lineCtx.lineCap = "round";

  for (const conn of conns) {
    const A = nodes[conn.a];
    const B = nodes[conn.b];
    if (!A || !B) continue;
    const local = elapsed - conn.start;
    if (local <= 0) continue;

    const glow = finalFrame ? 0.9 : 0.72 + 0.28 * Math.sin(t * 0.8 + conn.phase); // the forever-breathing glow
    const grad = lineCtx.createLinearGradient(A.x, A.y, B.x, B.y);
    grad.addColorStop(0, rgba(A.rgb, 0.9));
    grad.addColorStop(1, rgba(B.rgb, 0.9));
    lineCtx.strokeStyle = grad;
    lineCtx.lineWidth = 1;
    lineCtx.globalAlpha = 0.8 * glow;

    let fullyGrown = true;
    let mid = null;
    // The finished frame is drawn once, so it gets the full-quality version
    // (every strand on its own, 34 segments) and its curves are kept for
    // the travelling lights.
    const batch = lean() && !finalFrame;
    const frozen = { A, B, strands: [] };
    if (finalFrame) conn.frozen = frozen;
    if (batch) lineCtx.beginPath();
    conn.strands.forEach((strand, k) => {
      const g = clamp((local - k * STRAND_DELAY) / GROW, 0, 1);
      if (g < 1) fullyGrown = false;
      if (g <= 0) return;
      const [c1, c2] = controlPoints(A, B, conn, strand, t);
      if (finalFrame) frozen.strands[k] = [c1, c2];
      if (batch) traceCurve(A, c1, c2, B, 0, easeSine(g), Math.max(5, Math.ceil(16 * g)));
      else strokeCurve(A, c1, c2, B, 0, easeSine(g), finalFrame ? 34 : Math.max(6, Math.ceil(26 * g)));
      if (k === (STRANDS >> 1) && g >= 1) mid = { A, c1, c2, B };
    });
    if (batch) lineCtx.stroke();

    lineCtx.globalAlpha = 1;

    // A node where the bundle crosses its middle, once it's fully grown.
    if (mid) {
      const p = bez(mid.A, mid.c1, mid.c2, mid.B, 0.5);
      const na = finalFrame ? 0.85 : 0.55 + 0.45 * Math.sin(t * 1.3 + conn.phase * 2);
      blob(lineCtx, p.x, p.y, 7, A.rgb, 0.35 * na);
      lineCtx.fillStyle = rgba([235, 245, 255], 0.8 * na);
      lineCtx.beginPath();
      lineCtx.arc(p.x, p.y, 1.5, 0, 6.2832);
      lineCtx.fill();
    }

    // A word end gets a small glowing node as soon as its first
    // connection starts.
    for (const end of [conn.a, conn.b]) {
      if (end[0] !== "w") continue;
      const n = nodes[end];
      const fade = clamp(local / 1.2, 0, 1) * (finalFrame ? 0.85 : 0.7 + 0.3 * Math.sin(t * 1.1 + conn.phase));
      blob(lineCtx, n.x, n.y, 11, WORD_RGB, 0.5 * fade);
      lineCtx.fillStyle = rgba([240, 250, 255], 0.9 * fade);
      lineCtx.beginPath();
      lineCtx.arc(n.x, n.y, 2.2, 0, 6.2832);
      lineCtx.fill();
    }

    // Lights travelling along the bundle, orb to orb / orb to word.
    if (fullyGrown && !reduced && !isTouch) {
      const p = conn.pulse;
      if (p.wait > 0) {
        p.wait -= dt;
      } else {
        p.t += dt * p.speed;
        if (p.t > 1.12) {
          p.t = 0;
          p.wait = rand(0.4, 3.2);
          p.strand = (Math.random() * STRANDS) | 0;
          p.dir = Math.random() < 0.5 ? 1 : -1;
        } else {
          const strand = conn.strands[p.strand];
          const [c1, c2] = controlPoints(A, B, conn, strand, t);
          // dir 1 runs A -> B; dir -1 runs B -> A by mirroring the parameter.
          const head = clamp(p.t, 0, 1);
          const tail = clamp(p.t - 0.16, 0, 1);
          const u0 = p.dir === 1 ? tail : 1 - tail;
          const u1 = p.dir === 1 ? head : 1 - head;
          const src = p.dir === 1 ? A.rgb : B.rgb;
          lineCtx.strokeStyle = rgba(src, 0.16);
          lineCtx.lineWidth = 5;
          strokeCurve(A, c1, c2, B, u0, u1, 10);
          lineCtx.strokeStyle = rgba([235, 248, 255], 0.85);
          lineCtx.lineWidth = 1.5;
          strokeCurve(A, c1, c2, B, u0, u1, 10);
          const hp = bez(A, c1, c2, B, u1);
          blob(lineCtx, hp.x, hp.y, 9, src, 0.6);
        }
      }
    }
  }
  lineCtx.globalCompositeOperation = "source-over";
  if (finalFrame) {
    linesFrozen = true;
    cLines.classList.add("is-frozen");
  }
}

function pulseCurve(ctx, A, c1, c2, B, from, to, steps) {
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const p = bez(A, c1, c2, B, from + ((to - from) * i) / steps);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

// Phones: lights travelling along the frozen bundles, on their own canvas.
function drawPulses(t, dt) {
  pulseCtx.clearRect(0, 0, W, H);
  if (!linesFrozen || reduced) return;
  pulseCtx.globalCompositeOperation = "lighter";
  pulseCtx.lineCap = "round";
  for (const conn of conns) {
    const f = conn.frozen;
    if (!f) continue;
    const p = conn.pulse;
    if (p.wait > 0) {
      p.wait -= dt;
      continue;
    }
    p.t += dt * p.speed;
    if (p.t > 1.12) {
      p.t = 0;
      p.wait = rand(0.4, 3.2);
      p.strand = (Math.random() * STRANDS) | 0;
      p.dir = Math.random() < 0.5 ? 1 : -1;
      continue;
    }
    const [c1, c2] = f.strands[p.strand];
    const head = clamp(p.t, 0, 1);
    const tail = clamp(p.t - 0.16, 0, 1);
    const u0 = p.dir === 1 ? tail : 1 - tail;
    const u1 = p.dir === 1 ? head : 1 - head;
    const src = p.dir === 1 ? f.A.rgb : f.B.rgb;
    pulseCtx.strokeStyle = rgba(src, 0.16);
    pulseCtx.lineWidth = 5;
    pulseCurve(pulseCtx, f.A, c1, c2, f.B, u0, u1, 10);
    pulseCtx.strokeStyle = rgba([235, 248, 255], 0.85);
    pulseCtx.lineWidth = 1.5;
    pulseCurve(pulseCtx, f.A, c1, c2, f.B, u0, u1, 10);
    const hp = bez(f.A, c1, c2, f.B, u1);
    blob(pulseCtx, hp.x, hp.y, 9, src, 0.6);
  }
  pulseCtx.globalCompositeOperation = "source-over";
}

/* -------------------------------------------------------------
   4. THE LOOP, SIZING AND THE PUBLIC API
   ------------------------------------------------------------- */
let running = false;
let rafId = 0;
let lastT = 0;
let lastAwake = -1e9;

function size() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return false;
  if (w === W && h === H) return true;
  W = w;
  H = h;
  const canvases = [[cDust, dustCtx, dprNow], [cLines, lineCtx, dprNow], [cDrop, dropCtx, DROP_SCALE]];
  if (cPulse) canvases.push([cPulse, pulseCtx, Math.min(dprNow, 1.25)]);
  for (const [c, ctx, k] of canvases) {
    c.width = Math.round(W * k);
    c.height = Math.round(H * k);
    ctx.setTransform(k, 0, 0, k, 0, 0);
  }
  seedDust();
  linesFrozen = false;
  cLines.classList.remove("is-frozen");
  dropsStatic = false;
  dustStatic = false;
  return true;
}

/* -------------------------------------------------------------
   5. QUALITY GOVERNOR (2026-10-05, after the landing lagged on a phone)
   Nothing changes on a device that keeps up. If more than 60 percent of
   the last 90 frames took longer than 45 ms (under about 22 frames a
   second; a phone locked to 30 fps in low-power mode does not count), the
   show steps down one tier and never back up until the page is reloaded:
     tier 1  droplets redrawn every 3rd frame with 28 steps instead of 44
             (each a little stronger, so the tails look the same), and the
             3D flower drawn at a pixel ratio of at most 1.25
     tier 2  droplets every 4th frame with 16 steps, dust and connection
             canvases and the flower at pixel ratio 1, and the blurs on the
             droplets and the glow behind the flower made smaller
             (html.fx-lite in styles.css)
   The tier is kept for the browser session (sessionStorage) so coming
   back from a project page does not start slow again. To compare on a
   phone, add ?fxtier=0, ?fxtier=1 or ?fxtier=2 to the address: that
   forces a tier and switches the governor off.
   ------------------------------------------------------------- */
const TIER_KEY = "fxTier";
let tier = 0;
let governorOn = true;
const recent = [];
let lastTierChange = 0;

function applyTier(n) {
  tier = n;
  trailSteps = [TRAIL_STEPS, 28, 16][n];
  dropEvery = [isTouch ? 2 : 1, 3, 4][n];
  dprNow = n >= 2 ? 1 : DPR;
  document.documentElement.classList.toggle("fx-lite", n >= 2);
  W = 0; // makes size() rebuild the canvases at the new resolution
  try {
    if (window.lotusScene && window.lotusScene.setQuality) window.lotusScene.setQuality(n);
  } catch (error) {
    console.warn("landing-fx: quality", error);
  }
}

function watchFrameRate(raw, t) {
  if (!governorOn || reduced || tier >= 2) return;
  // A tab that was in the background, or a hitch while the model decodes,
  // says nothing about how fast the show runs.
  if (document.hidden || raw > 0.5) {
    recent.length = 0;
    return;
  }
  recent.push(raw);
  if (recent.length > 90) recent.shift();
  if (recent.length < 90 || t - lastTierChange < 3) return;
  const slow = recent.filter((v) => v > 0.045).length;
  if (slow / recent.length > 0.6) {
    lastTierChange = t;
    recent.length = 0;
    applyTier(tier + 1);
    try {
      sessionStorage.setItem(TIER_KEY, String(tier));
    } catch (error) { /* private mode: it just starts at tier 0 next time */ }
  }
}

(function startTier() {
  let n = 0;
  const forced = new URLSearchParams(window.location.search).get("fxtier");
  if (forced !== null && /^[0-2]$/.test(forced)) {
    governorOn = false;
    n = Number(forced);
  } else {
    try {
      n = Number(sessionStorage.getItem(TIER_KEY)) || 0;
    } catch (error) {
      n = 0;
    }
  }
  if (n > 0 || document.documentElement.classList.contains("fx-lite")) applyTier(Math.min(2, n));
})();

function frame(now) {
  rafId = 0;
  if (!running) return;
  if (!size()) {
    rafId = requestAnimationFrame(frame);
    return;
  }
  const t = now / 1000;
  const dt = lastT ? Math.min(t - lastT, 0.1) : 0.016;
  if (lastT) watchFrameRate(t - lastT, t);
  lastT = t;

  if (stage.classList.contains("is-awake")) lastAwake = t;
  // Each layer is drawn on its own, so a problem in one can never stop the
  // others, and the loop always carries on to the next frame.
  try {
    // Keep drawing droplets while they fade out after a reset, then stop.
    if (t - lastAwake < 3.8) {
      // The droplets take 30-40 s per loop, so on a struggling device they
      // are redrawn only every n-th frame; the canvas keeps what is on it.
      if (isTouch) {
        if (!dropsStatic) {
          drawDroplets(STILL_TIME);
          dropsStatic = true;
        }
      } else if (++dropCount >= dropEvery) {
        dropCount = 0;
        drawDroplets(t);
      }
    } else {
      dropCtx.clearRect(0, 0, W, H);
      dropsStatic = false;
    }
  } catch (error) {
    console.warn("landing-fx: droplets", error);
  }
  try {
    if (!isTouch) drawDust(t, dt);
    else if (!dustStatic) {
      drawDust(1.7, 0);
      dustStatic = true;
    }
  } catch (error) {
    console.warn("landing-fx: dust", error);
  }
  try {
    // The lines only breathe and sway, so on a phone they are redrawn every
    // other frame (30 a second) with the time that passed; the canvas keeps
    // what is on it in between.
    lineAcc += dt;
    if (!lean() || ++lineCount % 2 === 1) {
      drawLines(t, lineAcc);
      if (pulseCtx) drawPulses(t, lineAcc);
      lineAcc = 0;
    }
  } catch (error) {
    console.warn("landing-fx: connections", error);
  }
  rafId = requestAnimationFrame(frame);
}

function setActive(on) {
  if (on === running) return;
  running = on;
  if (on) {
    lastT = 0;
    if (!rafId) rafId = requestAnimationFrame(frame);
  } else if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function growLines() {
  linesFrozen = false;
  cLines.classList.remove("is-frozen");
  buildConnections();
  linesPending = true;
  linesOn = true;
}

// Start the connections if they are not already there (a safety net: the
// finished landing always has them).
function ensureLines() {
  if (!linesOn) growLines();
}

function clearLines() {
  linesFrozen = false;
  cLines.classList.remove("is-frozen");
  linesOn = false;
  linesPending = false;
  conns = [];
  if (W) lineCtx.clearRect(0, 0, W, H);
  if (W && pulseCtx) pulseCtx.clearRect(0, 0, W, H);
}

window.addEventListener("resize", size);
window.landingFx = { setActive, growLines, clearLines, ensureLines };

// script.js runs before this deferred file loads, so its own setActive
// calls from the first scene switch found nothing — start here instead,
// if the landing screen is what's showing.
setActive(!stage.hidden);

})();
