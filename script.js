/* =============================================================
   SCRIPT.JS  —  a tiny bit of JavaScript
   =============================================================
   This file does just five small jobs. You probably don't need to
   touch it, but here's what it does so nothing feels like magic.
   ============================================================= */

/* -------------------------------------------------------------
   1. MOBILE MENU
   (Retired 2026-10-04: the hamburger menu was replaced by the lotus nav.)
   Kept only so an old page that still has a hamburger button keeps working: it shows/hides the
   navigation links.
   ------------------------------------------------------------- */
const toggle = document.querySelector(".nav__toggle");
const links = document.querySelector(".nav__links");

if (toggle && links) {
  toggle.addEventListener("click", () => {
    // Add or remove the "open" class that makes the menu visible.
    const isOpen = links.classList.toggle("nav__links--open");
    // Tell screen readers whether the menu is open, and match the label to it.
    toggle.setAttribute("aria-expanded", isOpen);
    toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  // Close the menu again after tapping a link.
  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("nav__links--open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    });
  });
}

/* -------------------------------------------------------------
   2. AUTOMATIC YEAR IN THE FOOTER
   Fills in the current year so you never have to update it.
   ------------------------------------------------------------- */
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

/* -------------------------------------------------------------
   3. ABOUT CARD — A COLOUR GLOW THAT FOLLOWS THE MOUSE
   Over the About card, a soft glow follows the mouse and shifts hue as it
   goes (blue → violet → pink → warm red, never yellow or green, so the
   text on top stays readable). We ease the movement each frame instead of
   snapping to the cursor, so it glides. A tap on the photo swaps it to the
   second picture on touch screens (a mouse just hovers). Skipped for the
   glow when the visitor has asked for reduced motion.
   ------------------------------------------------------------- */
const aboutCard = document.getElementById("aboutCard");
const aboutPhoto = document.getElementById("aboutPhoto");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (aboutPhoto) {
  // A tap swaps the picture on touch screens; a mouse just hovers.
  aboutPhoto.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse") return;
    aboutPhoto.classList.toggle("is-swapped");
    if (aboutCard) aboutCard.classList.toggle("is-glint", aboutPhoto.classList.contains("is-swapped"));
  });
  // While the mouse is over the photo, the sun in the corner glistens.
  aboutPhoto.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse" && aboutCard) aboutCard.classList.add("is-glint");
  });
  aboutPhoto.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && aboutCard) aboutCard.classList.remove("is-glint");
  });
}

if (aboutCard && !prefersReducedMotion) {
  let targetX = 50;
  let targetY = 40;
  let currentX = targetX;
  let currentY = targetY;
  let animationFrame = null;

  const hueFor = (x, y) => 230 + x * 1.3 + y * 0.35; // 230 (blue) … ~360 (red)

  const glide = () => {
    // Move a fraction of the remaining distance each frame (easing).
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    aboutCard.style.setProperty("--mx", `${currentX.toFixed(1)}%`);
    aboutCard.style.setProperty("--my", `${currentY.toFixed(1)}%`);
    aboutCard.style.setProperty("--hue", hueFor(currentX, currentY).toFixed(1));

    const closeEnough =
      Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1;
    animationFrame = closeEnough ? null : requestAnimationFrame(glide);
  };

  const follow = (event) => {
    const rect = aboutCard.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width) * 100;
    targetY = ((event.clientY - rect.top) / rect.height) * 100;
    if (!animationFrame) {
      animationFrame = requestAnimationFrame(glide);
    }
  };
  aboutCard.addEventListener("pointermove", follow);
  aboutCard.addEventListener("pointerdown", follow);
}

/* -------------------------------------------------------------
   6. PROFESSIONAL EXPERIENCE — THE STICKER COLUMN
   The column scrolls on its own (wheel or touch). This adds (a) a faint
   trail: while it is moving, each sticker leaves a ghost of itself behind,
   which eases away once it stops (it sets --trail, or --trail-x for the
   sideways strip, and the CSS turns that into shadows); and (b) on touch
   screens, a first tap on a sticker shows what I did on it and a second
   tap opens the post.
   ------------------------------------------------------------- */
const stickerScroll = document.getElementById("stickersScroll");
if (stickerScroll) {
  stickerScroll.querySelectorAll(".sticker").forEach((sticker) => {
    const note = sticker.querySelector(".sticker__role-text");
    if (note && note.textContent.length > 110) sticker.classList.add("sticker--long");
  });

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let lastTop = stickerScroll.scrollTop;
    let lastLeft = stickerScroll.scrollLeft;
    let trailY = 0;
    let trailX = 0;
    let wantY = 0;
    let wantX = 0;
    let frame = 0;
    const clampTrail = (v) => Math.max(-34, Math.min(34, v));

    const settle = () => {
      // Move toward what the scroll just asked for, then let it fade to nothing.
      trailY += (wantY - trailY) * 0.35;
      trailX += (wantX - trailX) * 0.35;
      wantY *= 0.82;
      wantX *= 0.82;
      stickerScroll.style.setProperty("--trail", trailY.toFixed(2));
      stickerScroll.style.setProperty("--trail-x", trailX.toFixed(2));
      if (Math.abs(trailY) > 0.2 || Math.abs(trailX) > 0.2 || Math.abs(wantY) > 0.2 || Math.abs(wantX) > 0.2) {
        frame = requestAnimationFrame(settle);
      } else {
        frame = 0;
        stickerScroll.style.setProperty("--trail", "0");
        stickerScroll.style.setProperty("--trail-x", "0");
      }
    };

    stickerScroll.addEventListener(
      "scroll",
      () => {
        wantY = clampTrail((stickerScroll.scrollTop - lastTop) * 1.6);
        wantX = clampTrail((stickerScroll.scrollLeft - lastLeft) * 1.6);
        lastTop = stickerScroll.scrollTop;
        lastLeft = stickerScroll.scrollLeft;
        if (!frame) frame = requestAnimationFrame(settle);
      },
      { passive: true }
    );
  }


  // ---- the reader for stickers that are files, not web pages ----
  // A sticker with data-video plays that video (muted, looping, with controls,
  // its still as the poster); otherwise its pages open as stacked pictures.
  const viewer = document.getElementById("viewer");
  const viewerPages = document.getElementById("viewerPages");
  const viewerTitle = document.getElementById("viewerTitle");
  const viewerKicker = document.getElementById("viewerKicker");
  const viewerCaption = document.getElementById("viewerCaption");
  let viewerOpener = null;
  const openViewer = (link) => {
    if (!viewer || !viewer.showModal) return false; // old browser: the link opens the first page
    viewerOpener = link;
    viewerTitle.textContent = link.dataset.title || "";
    viewerKicker.textContent = link.dataset.kicker || "";
    viewerKicker.hidden = !link.dataset.kicker;
    viewerCaption.textContent = link.dataset.caption || "";
    viewerCaption.hidden = !link.dataset.caption;
    viewerPages.textContent = "";
    const pages = link.dataset.pages.split(",");
    viewer.classList.toggle("viewer--single", pages.length === 1);
    if (link.dataset.video) {
      const video = document.createElement("video");
      video.src = link.dataset.video;
      video.poster = `assets/stickers/${pages[0]}.jpg`;
      video.muted = true;
      video.loop = true;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("aria-label", link.dataset.alt || "Video");
      video.addEventListener("error", () => video.removeAttribute("controls")); // the poster stays
      viewerPages.appendChild(video);
    } else {
      pages.forEach((name, i, all) => {
        const img = document.createElement("img");
        img.src = `assets/stickers/${name}.jpg`;
        img.alt = `${link.dataset.alt || "Page"}${all.length > 1 ? `, page ${i + 1} of ${all.length}` : ""}`;
        img.loading = i < 2 ? "eager" : "lazy";
        img.decoding = "async";
        viewerPages.appendChild(img);
      });
    }
    viewerPages.scrollTop = 0;
    viewer.showModal();
    return true;
  };
  if (viewer) {
    document.getElementById("viewerClose").addEventListener("click", () => viewer.close());
    // a click on the dimmed area outside the panel closes it
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer) viewer.close();
    });
    viewer.addEventListener("close", () => {
      if (viewer.open) return; // reopened before this (late) event arrived
      viewerPages.querySelectorAll("video").forEach((v) => {
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
      viewerPages.textContent = "";
      if (viewerOpener) viewerOpener.focus();
    });
  }

  stickerScroll.addEventListener("dragstart", (event) => event.preventDefault());

  stickerScroll.addEventListener(
    "click",
    (event) => {
      const sticker = event.target.closest(".sticker");
      // No hover on touch screens: first tap = read, second tap = open.
      if (sticker && window.matchMedia("(hover: none)").matches && !sticker.classList.contains("is-open")) {
        event.preventDefault();
        stickerScroll.querySelectorAll(".sticker.is-open").forEach((s) => s.classList.remove("is-open"));
        sticker.classList.add("is-open");
        return;
      }
      // Stickers that are files (newsletter, backing) open the reader here.
      const link = event.target.closest("a[data-pages]");
      if (link && openViewer(link)) event.preventDefault();
    },
    true
  );
}

/* -------------------------------------------------------------
   7. CONTACT — A GLOWING ORB THAT FOLLOWS THE POINTER, A HEADLINE THAT BOUNCES
   (a) The background of the whole section reacts: a chain of glowing orbs,
       drawn like the colour droplets on the first screen, follows the
       pointer like thick liquid and leaves soft, swaying shapes behind it.
   (b) The letters of the headline bounce away from the lead orb as it
       passes, glowing in the site's palette, and settle back.
   (c) A button that copies the email address (with a quiet confirmation).
   Everything stays still for visitors who ask for reduced motion, and the
   background only runs while the section is on screen.
   ------------------------------------------------------------- */
const contactSection = document.getElementById("contact");
const contactReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- (a) + (b) the glowing orb that follows the pointer, and the headline it moves ----
   The whole background of the section reacts (the canvas is fixed behind the
   page, no panel). It is drawn like the colour droplets on the first screen:
   soft discs, strongest at the head, with a tail of shrinking, fading discs
   behind. A chain of three of them follows the pointer like a thick liquid
   (each one trails the one before, with its own lag and colour), and fast
   movement leaves soft shapes that sway, stretch and change colour, so a drag
   paints waves. The letters of the
   headline bounce away from the head as it passes (springs, with a travelling
   wave and a glow in the site's palette) and settle back. When the pointer is
   still or away, the orbs drift on their own, far from the words. */
const pondCanvas = document.getElementById("contactWater");
const snake = document.getElementById("contactSnake");
if (contactSection && pondCanvas && !contactReduced) {
  const ctx = pondCanvas.getContext("2d");
  const SCALE = 3; // the canvas is a third of the screen size: the discs are soft anyway
  let running = false;
  let frameId = 0;
  let pointerAt = -1e9;
  const pointer = { x: window.innerWidth * 0.7, y: window.innerHeight * 0.6 };

  const resize = () => {
    pondCanvas.width = Math.ceil(window.innerWidth / SCALE);
    pondCanvas.height = Math.ceil(window.innerHeight / SCALE);
    ctx.setTransform(1 / SCALE, 0, 0, 1 / SCALE, 0, 0); // draw in screen pixels
  };
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener(
    "pointermove",
    (event) => {
      if (!running) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointerAt = performance.now();
    },
    { passive: true }
  );

  // ---- the chain of orbs that follows the pointer ----
  const CHAIN = [
    { rgb: [143, 92, 255], k: 0.16, size: 1.0 }, // violet, quickest
    { rgb: [34, 211, 238], k: 0.09, size: 0.85 }, // cyan
    { rgb: [248, 135, 250], k: 0.055, size: 0.8 }, // pink, slowest
  ].map((o) => ({ ...o, x: pointer.x, y: pointer.y, hist: [] }));
  const HIST = 34;

  // ---- orbs that drift on their own (the first screen's droplets, thinner) ----
  const DRIFT = [
    { rgb: [135, 71, 248], cx: 0.62, cy: 0.62, ax: 0.3, ay: 0.28, t1: 31, t2: 43, p1: 0.0, p2: 1.3, size: 1.0 },
    { rgb: [77, 125, 255], cx: 0.5, cy: 0.7, ax: 0.42, ay: 0.2, t1: 37, t2: 29, p1: 2.1, p2: 0.4, size: 0.85 },
    { rgb: [248, 135, 250], cx: 0.7, cy: 0.55, ax: 0.26, ay: 0.3, t1: 27, t2: 39, p1: 5.2, p2: 3.1, size: 0.75 },
  ];
  const driftAt = (d, t) => ({
    x: window.innerWidth * (d.cx + d.ax * Math.sin((6.2832 / d.t1) * t + d.p1)),
    y: window.innerHeight * (d.cy + d.ay * Math.sin((6.2832 / d.t2) * t + d.p2)),
  });

  const blob = (x, y, r, rgb, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
    g.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.4})`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // A soft disc that can be stretched into an oval and turned (to follow the
  // direction of travel). Same soft, matte falloff as every other orb.
  const blobE = (x, y, r, sx, sy, angle, rgb, a) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(sx, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${a})`);
    g.addColorStop(0.5, `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${a * 0.4})`);
    g.addColorStop(1, `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  };

  // ---- waves: soft shapes a moving pointer leaves in the background ----
  // Each one is born where the lead orb is, carries on in the direction it
  // was going (slowing, swaying side to side like a wave), swells and
  // stretches, drifts through the palette as it ages, and fades. Nothing has
  // an edge: they are the same matte orbs as the rest.
  const waves = [];
  let lastWave = 0;

  // ---- the headline's letters ----
  const letters = [];
  const spring = [];
  const WHITE = [244, 241, 255];
  const PALETTE = [
    [143, 92, 255],
    [248, 135, 250],
    [253, 112, 105],
    [255, 209, 102],
    [34, 211, 238],
    [77, 125, 255],
  ];
  const paletteAt = (u) => {
    const n = PALETTE.length;
    const p = ((u % n) + n) % n;
    const i = Math.floor(p);
    const f = p - i;
    const a = PALETTE[i];
    const b = PALETTE[(i + 1) % n];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  if (snake) {
    const text = snake.textContent;
    snake.textContent = "";
    snake.setAttribute("aria-hidden", "true");
    // Letters are grouped in words that never break in the middle; the
    // spaces between words stay ordinary, breakable spaces.
    text.split(" ").forEach((word, w, all) => {
      const wordEl = document.createElement("span");
      wordEl.className = "snake__word";
      Array.from(word).forEach((ch) => {
        const span = document.createElement("span");
        span.className = "snake__ch";
        span.textContent = ch;
        wordEl.appendChild(span);
        letters.push(span);
        spring.push({ y: 0, v: 0, x: 0, dirty: false });
      });
      snake.appendChild(wordEl);
      if (w < all.length - 1) snake.appendChild(document.createTextNode(" "));
    });
    // the sentence stays readable for screen readers, on the heading itself
    snake.parentElement.setAttribute("aria-label", text);
  }

  let presence = 0; // 0 = the pointer is away, 1 = it is moving over the section
  let lastFrame = 0;

  const frame = (now) => {
    if (!running) return;
    frameId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastFrame) / 1000 || 0.016);
    lastFrame = now;
    const t = now / 1000;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const active = now - pointerAt < 2200;
    presence += ((active ? 1 : 0) - presence) * 0.06;

    // where the lead orb is heading: the pointer, or a slow wander of its own
    const home = driftAt(DRIFT[0], t);
    const target = active ? pointer : { x: home.x, y: home.y };
    let prevX = target.x;
    let prevY = target.y;
    let lead = null;
    CHAIN.forEach((o, i) => {
      const ox = o.x;
      const oy = o.y;
      o.x += (prevX - o.x) * o.k;
      o.y += (prevY - o.y) * o.k;
      o.hist.push({ x: o.x, y: o.y });
      if (o.hist.length > HIST) o.hist.shift();
      if (i === 0) lead = { x: o.x, y: o.y, vx: o.x - ox, vy: o.y - oy };
      prevX = o.x;
      prevY = o.y;
    });

    // a moving pointer leaves a wave behind
    const speed = Math.hypot(lead.vx, lead.vy);
    if (active && speed > 1.6 && now - lastWave > 85 && waves.length < 42) {
      lastWave = now;
      waves.push({
        x: lead.x,
        y: lead.y,
        vx: lead.vx * 0.55,
        vy: lead.vy * 0.55,
        angle: Math.atan2(lead.vy, lead.vx),
        born: now,
        life: 1900 + Math.random() * 900,
        size: 0.55 + Math.min(0.7, speed / 25) + Math.random() * 0.25,
        hue: t * 0.6 + Math.random() * 2.4,
        seed: Math.random() * 6.28,
      });
    }

    // ---- draw ----
    ctx.clearRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = "lighter";
    const headR = Math.max(vw, vh) * 0.085;
    // the orbs that drift on their own
    DRIFT.forEach((d) => {
      for (let i = 22; i >= 0; i--) {
        const s = i / 22;
        const pos = driftAt(d, t - s * 7);
        blob(pos.x, pos.y, headR * d.size * (0.3 + 0.7 * Math.pow(1 - s, 1.2)), d.rgb, 0.04 * Math.pow(1 - s, 1.05));
      }
      const head = driftAt(d, t);
      blob(head.x, head.y, headR * d.size * 0.85, d.rgb, 0.17);
    });
    // the orbs that follow the pointer: stronger while it moves
    const strength = 0.3 + 0.7 * presence;
    CHAIN.forEach((o) => {
      const n = o.hist.length;
      for (let j = 0; j < n; j++) {
        const s = j / n; // 0 = newest
        const pos = o.hist[n - 1 - j];
        blob(pos.x, pos.y, headR * o.size * (0.3 + 0.7 * Math.pow(1 - s, 1.2)), o.rgb, 0.06 * strength * Math.pow(1 - s, 1.05));
      }
      // the head is stretched a little along the direction of travel; kept dim: three overlap there
      const st = 1 + Math.min(0.7, speed / 16);
      blobE(o.x, o.y, headR * o.size * 0.85, st, 1 / Math.sqrt(st), Math.atan2(lead.vy, lead.vx), o.rgb, 0.15 * strength);
    });
    // the waves: swaying, stretching, changing colour, glistening
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      const age = (now - w.born) / w.life;
      if (age >= 1) {
        waves.splice(i, 1);
        continue;
      }
      // carry on, slowing, swaying across the direction of travel
      const sway = Math.sin(age * 9 + w.seed) * 0.9;
      w.x += w.vx - Math.sin(w.angle) * sway * (1 - age);
      w.y += w.vy + Math.cos(w.angle) * sway * (1 - age);
      w.vx *= 0.965;
      w.vy *= 0.965;
      const swell = 0.55 + 0.95 * (1 - Math.pow(1 - age, 2)); // grows, quickly at first
      const stretch = 1 + 0.9 * (1 - age) * Math.min(1, Math.hypot(w.vx, w.vy) / 3 + 0.4);
      const squash = 1 / Math.sqrt(stretch);
      const glisten = 0.78 + 0.22 * Math.sin(t * 8 + w.seed * 3);
      const fade = Math.pow(1 - age, 1.35) * Math.min(1, age * 7); // eases in, then away
      const rgb = paletteAt(w.hue + age * 1.8); // the colour keeps moving through the palette
      const r = headR * w.size * swell;
      blobE(w.x, w.y, r, stretch, squash, w.angle, rgb, 0.17 * fade * glisten * strength);
      // a small, soft, lighter glint inside it (matte: no hard highlight)
      blobE(w.x + Math.cos(w.angle) * r * 0.18, w.y + Math.sin(w.angle) * r * 0.18, r * 0.42, stretch * 0.9, squash, w.angle, [
        (rgb[0] + 255) / 2,
        (rgb[1] + 255) / 2,
        (rgb[2] + 255) / 2,
      ], 0.1 * fade * glisten * strength);
    }
    ctx.globalCompositeOperation = "source-over";

    // ---- the letters bounce away from the lead orb, glow, and settle ----
    letters.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - lead.x;
      const dy = cy - lead.y;
      const d = Math.hypot(dx, dy) || 1;
      const near = Math.exp(-Math.pow(d / (headR * 1.5), 2)) * presence;
      const s = spring[i];
      const targetY = -near * 0.2; // lifted, in em
      s.v += (targetY - s.y) * 0.2;
      s.v *= 0.78;
      s.y += s.v;
      const pushX = (dx / d) * near * 0.07;
      const wave = Math.sin(t * 7 - i * 0.55) * 0.13 * near;
      const settled = Math.abs(s.y) < 0.002 && Math.abs(s.v) < 0.002 && near < 0.01;
      if (settled) {
        if (s.dirty) {
          el.style.transform = "";
          el.style.color = "";
          el.style.textShadow = "";
          s.dirty = false;
        }
        return;
      }
      s.dirty = true;
      el.style.transform = `translate(${pushX.toFixed(3)}em, ${(s.y + wave).toFixed(3)}em) rotate(${(Math.cos(t * 7 - i * 0.55) * 6 * near).toFixed(2)}deg) scale(${(1 + near * 0.13).toFixed(3)})`;
      const c = paletteAt(t * 1.1 + i * 0.28);
      const mix = Math.min(1, near * 1.3);
      const col = `${Math.round(WHITE[0] + (c[0] - WHITE[0]) * mix)}, ${Math.round(WHITE[1] + (c[1] - WHITE[1]) * mix)}, ${Math.round(WHITE[2] + (c[2] - WHITE[2]) * mix)}`;
      el.style.color = `rgb(${col})`;
      // the glisten: a glow in the letter's colour that swells as the orb passes
      el.style.textShadow = `0 0 ${(6 + 16 * near).toFixed(1)}px rgba(${col}, ${(0.75 * near).toFixed(2)}), 0 2px 28px rgba(6, 4, 34, 0.7)`;
    });
  };

  const setRunning = (on) => {
    if (on && !running) {
      running = true;
      lastFrame = performance.now();
      frameId = requestAnimationFrame(frame);
    } else if (!on && running) {
      running = false;
      cancelAnimationFrame(frameId);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => setRunning(entries.some((en) => en.isIntersecting)), { threshold: 0.05 }).observe(contactSection);
  } else {
    setRunning(true);
  }
}

/* ---- (c) copy the address ---- */
const copyButton = document.getElementById("contactCopy");
const copiedNote = document.getElementById("contactCopied");
if (copyButton) {
  copyButton.addEventListener("click", async () => {
    const address = copyButton.dataset.address;
    let ok = false;
    try {
      await navigator.clipboard.writeText(address);
      ok = true;
    } catch (error) {
      // file:// pages and older browsers: the old way, through a hidden field
      const field = document.createElement("textarea");
      field.value = address;
      field.setAttribute("readonly", "");
      field.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(field);
      field.select();
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      field.remove();
    }
    if (copiedNote) {
      copiedNote.textContent = ok ? "Copied ✓" : `Copy it from here: ${address}`;
      window.setTimeout(() => (copiedNote.textContent = ""), 2600);
    }
  });
}

/* -------------------------------------------------------------
   4. PROJECT FILTER, THE CARD BOARD AND THE PROJECTS HERO
   Moved to projects-board.js (2026-10-04) when the Projects section
   became a draggable board of cards — it is a bigger job than this
   file is meant to hold.
   ------------------------------------------------------------- */

/* -------------------------------------------------------------
   5. HOME PAGE NAVIGATION — scenes, the growth trail, and the lotus
   Only one of the 5 sections (About, Contact, Skills, Experience,
   Case Studies) is visible at a time, so moving between them is
   never scroll-only. Hero isn't one of the 5 — it's the landing
   screen itself: eyebrow, motto, and the lotus. Closed by default,
   the lotus wiggles on the first hover/click, then opens and pops
   5 orbs out of itself, one per section; the next hover/click
   wiggles, then pops them back in and closes. Clicking an orb (or
   any nav link / growth-trail bud) shows that section full-screen,
   same as before. The ✦ button returns to the landing screen from
   inside any section. The growth trail's buds track every section
   visited this browsing session, in any order, not scroll position.

   PROGRESSIVE ENHANCEMENT: if this script doesn't run, nothing gets
   hidden — every section is right there in the HTML, and the page is
   simply one long scrolling document, exactly like before.
   ------------------------------------------------------------- */
const trailBuds = document.querySelectorAll(".lotus-nav__leaf");
const portalToggle = document.getElementById("portalToggle");
const heroSection = document.getElementById("hero");
const landingStage = document.getElementById("landingStage");
const lotusCanvas = document.getElementById("lotusCanvas");
const lotusStartCta = document.getElementById("lotusStartCta");
const orbCluster = document.getElementById("orbCluster");
const siteFooter = document.getElementById("siteFooter");
const growthTrail = document.querySelector(".lotus-nav");
const lotusStill = document.querySelector(".lotus-still");

if (trailBuds.length && heroSection) {
  const sectionMeta = Array.from(trailBuds).map((bud) => ({
    id: bud.dataset.section,
    label: bud.querySelector(".lotus-nav__label").textContent,
  }));
  const homeSections = sectionMeta
    .map((section) => document.getElementById(section.id))
    .filter(Boolean);

  // Old links (from before Projects + Research merged into Case Studies,
  // and before Hero stopped being a destination) still work.
  const legacyAliases = { work: "case-studies", seedbeds: "case-studies", hero: null };

  const getVisited = () => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem("visitedSections") || "[]"));
    } catch (error) {
      return new Set();
    }
  };

  const markVisited = (id) => {
    const visited = getVisited();
    visited.add(id);
    try {
      sessionStorage.setItem("visitedSections", JSON.stringify(Array.from(visited)));
    } catch (error) {
      /* Not essential — the trail still works for this page view. */
    }
  };

  let activeId = null; // null = landing on Hero, nothing chosen yet

  const updateTrail = () => {
    const visited = getVisited();
    trailBuds.forEach((bud) => {
      const id = bud.dataset.section;
      bud.classList.toggle("is-current", id === activeId);
      bud.classList.toggle("is-bloomed", id !== activeId && visited.has(id));
    });
    // Tells the nav's stem where to slide its light (the current leaf's position, -1 = none).
    if (growthTrail) {
      const current = Array.from(trailBuds).findIndex((b) => b.dataset.section === activeId);
      growthTrail.style.setProperty("--cur", current);
      growthTrail.classList.toggle("is-tracking", current >= 0);
    }
  };

  /* ---- the landing screen ----
     Click/tap the flower, and then (all slow, all eased, nothing bouncy):
       1. is-awake     the background lifts from black, colour droplets
                       drift in, the motto fades in, and the camera glides
                       in to a big near-top flower (landing-3d.js)
       2. is-settling  the flower sinks and dims, the five orbs flow out
                       of its open centre to their places, then
                       landing-fx.js grows glowing stems between them and
                       the motto words, which keep pulsing for good.
     The look of each state is the LANDING SCREEN section of styles.css. */
  let landingState = "idle"; // idle | activating | settled
  const ORB_FLOW_MS = 3300; // about how long the orbs' slow flow out takes
  const LINES_AFTER_MS = 1700; // the stems start growing this long after the orbs start moving
  const NO_SCENE_WAIT_MS = 2800; // without the 3D zoom, give the motto/background this long first

  // Anything scheduled below is cancelled (and a half-finished run is
  // ignored) if the visitor leaves the landing screen mid-sequence.
  let runId = 0;
  let timers = [];
  const later = (fn, ms) => {
    timers.push(window.setTimeout(fn, ms));
  };

  const positionOrbsAtLotus = () => {
    if (!orbCluster) return;
    const orbs = Array.from(orbCluster.querySelectorAll(".orb"));
    // Reset first so getBoundingClientRect reads each orb's real resting
    // spot, not wherever it was left transformed to last time.
    orbs.forEach((orb) => {
      orb.style.setProperty("--ox", "0px");
      orb.style.setProperty("--oy", "0px");
    });
    // The orbs flow out of the OPEN flower's centre — by now sunk a little
    // below the screen's middle (landing-3d.js reports how far).
    const clusterRect = orbCluster.getBoundingClientRect();
    const sink = window.lotusScene?.coreOffsetY?.() ?? 0;
    const origin = { x: clusterRect.left + clusterRect.width / 2, y: clusterRect.top + clusterRect.height / 2 + sink };
    orbs.forEach((orb) => {
      // The icon's centre — the orb's own box also includes its label.
      const r = (orb.querySelector(".orb__img") || orb).getBoundingClientRect();
      orb.style.setProperty("--ox", `${origin.x - (r.left + r.width / 2)}px`);
      orb.style.setProperty("--oy", `${origin.y - (r.top + r.height / 2)}px`);
    });
  };

  const openOrbs = () => {
    if (!orbCluster) return;
    positionOrbsAtLotus();
    void orbCluster.offsetWidth; // force layout so the start position is registered before animating
    orbCluster.classList.remove("is-closing");
    orbCluster.classList.add("is-visible");
  };

  const resetLanding = () => {
    // Always back to idle when you arrive at/return to the landing screen.
    runId += 1;
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
    landingState = "idle";
    if (landingStage) {
      landingStage.classList.remove("is-awake", "is-settling");
      delete landingStage.dataset.lotusState;
    }
    if (orbCluster) orbCluster.classList.remove("is-visible", "is-closing");
    window.landingFx?.clearLines();
    // landing-3d.js owns tweening the camera/flower back to its idle side
    // view — guarded since this file also runs on pages without the 3D
    // scene, and in case the module hasn't finished loading yet.
    window.lotusScene?.reset();
  };

  if (orbCluster) {
    // Guarded against double-firing (a second click mid-sequence, or the
    // canvas *and* the hidden CTA firing for the same interaction) by
    // landingState.
    const triggerLanding = () => {
      if (landingState !== "idle") return;
      landingState = "activating";
      const myRun = ++runId;
      if (landingStage) {
        landingStage.dataset.lotusState = "activating";
        landingStage.classList.add("is-awake");
      }

      // No 3D scene (the Three.js scripts or the model failed, or WebGL
      // is unsupported — window.lotusScene.ready rejects in all of those
      // cases): there's no zoom to wait for, so just give the background
      // and motto a moment before the orbs, rather than getting stuck.
      let hadScene = true;
      const activate = window.lotusScene?.activate;
      const zoomDone =
        typeof activate === "function"
          ? Promise.resolve(activate()).catch(() => {
              hadScene = false;
            })
          : Promise.resolve().then(() => {
              hadScene = false;
            });

      zoomDone
        .then(() => (hadScene ? null : new Promise((resolve) => later(resolve, NO_SCENE_WAIT_MS))))
        .then(() => {
          if (myRun !== runId) return; // left the landing screen meanwhile
          if (landingStage) landingStage.classList.add("is-settling");
          window.lotusScene?.settle?.();
          openOrbs();
          later(() => window.landingFx?.growLines(), LINES_AFTER_MS);
          later(() => {
            if (landingStage) landingStage.dataset.lotusState = "settled";
            landingState = "settled";
          }, ORB_FLOW_MS);
        });
    };
    if (lotusCanvas) {
      lotusCanvas.addEventListener("click", triggerLanding);
    }
    if (lotusStartCta) {
      lotusStartCta.addEventListener("click", triggerLanding);
    }
    // Fallback only (html.no-webgl): the static image stands in for the
    // flower, so tapping it should start the sequence just like the canvas.
    if (lotusStill) {
      lotusStill.addEventListener("click", triggerLanding);
    }
  }

  /* ---- scene switching ---- */
  const showSection = (id) => {
    if (!sectionMeta.some((section) => section.id === id)) return;
    // Hide the whole landing stage, not just #hero inside it — .landing-stage
    // reserves its own flow height (min-height, for the orb layout), so
    // hiding only #hero left that height behind as an empty gap above
    // whichever section was shown.
    if (landingStage) landingStage.hidden = true;
    if (siteFooter) {
      siteFooter.hidden = false;
      // The footer's Contact button is pointless on the Contact section itself.
      siteFooter.classList.toggle("is-contact", id === "contact");
    }
    // The side nav only appears once a section is actually open — not on
    // the lotus landing screen itself.
    if (growthTrail) growthTrail.hidden = false;
    // Phones use the top header instead of the side rail: it only shows once
    // a section is open, same as the side rail (see body.is-landing in styles.css).
    document.body.classList.remove("is-landing");
    // The landing's dust/droplet/connection animation has nothing to do
    // while a section is showing.
    window.landingFx?.setActive(false);
    // A finished landing (flower sunk, orbs out, connections grown) is left
    // exactly as it is, so coming back finds it where you left it instead
    // of replaying the intro. Anything half-played is reset cleanly.
    if (landingState !== "settled") resetLanding();
    homeSections.forEach((section) => {
      section.hidden = section.id !== id;
    });
    activeId = id;
    markVisited(id);
    updateTrail();
    window.scrollTo(0, 0);
  };

  const showLanding = () => {
    homeSections.forEach((section) => {
      section.hidden = true;
    });
    if (landingStage) landingStage.hidden = false;
    if (siteFooter) siteFooter.hidden = true;
    if (growthTrail) growthTrail.hidden = true;
    document.body.classList.add("is-landing");
    window.landingFx?.setActive(true);
    if (landingState === "settled") {
      // Back to the finished landing as it was left — just redraw the
      // flower (a hidden canvas has no size, so it may have missed a resize).
      window.lotusScene?.refresh?.();
    } else {
      resetLanding();
    }
    activeId = null;
    updateTrail();
    window.scrollTo(0, 0);
  };

  // On phones the header's name/logo is the way back to the lotus (the
  // side rail's lotus icon doesn't exist there). Same scene switch as the
  // desktop icon, instead of a page reload that would replay the whole
  // black intro.
  const navLogo = document.querySelector(".nav__logo");
  if (navLogo) {
    navLogo.addEventListener("click", (event) => {
      event.preventDefault();
      showLanding();
    });
  }

  if (portalToggle) {
    // It's a real <a href="index.html"> now (so the same markup works
    // as a plain home link on project pages) — prevent the reload here
    // and just switch scenes instead, since we're already on this page.
    portalToggle.addEventListener("click", (event) => {
      event.preventDefault();
      showLanding();
    });
  }

  // Any link to #about, #contact... anywhere on the page (header nav, the
  // mobile menu, the growth trail, an orb) switches scenes instead of the
  // browser's default anchor scroll.
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    let id = link.getAttribute("href").slice(1);
    if (id in legacyAliases) id = legacyAliases[id];
    if (!id || !sectionMeta.some((section) => section.id === id)) return;
    event.preventDefault();
    showSection(id);
  });

  // Land on whatever section the URL names (e.g. a project page's "back
  // to projects" link pointing at index.html#work, resolved through the
  // legacy alias above) — otherwise always the Hero/lotus landing screen.
  // Deliberately NOT updating the address bar on in-app navigation (see
  // showSection): a reload should always come back here, regardless of
  // which section was open before.
  const routeFromHash = () => {
    let requestedId = location.hash.slice(1);
    if (requestedId in legacyAliases) requestedId = legacyAliases[requestedId];

    if (requestedId && sectionMeta.some((section) => section.id === requestedId)) {
      showSection(requestedId);
    } else {
      showLanding();
    }
  };

  routeFromHash();

  // Covers arriving at a hash the page was already sitting on (e.g. typing
  // a new #section into the address bar without a full reload) — the
  // click-delegated navigation above handles every in-app link already.
  window.addEventListener("hashchange", routeFromHash);
}
