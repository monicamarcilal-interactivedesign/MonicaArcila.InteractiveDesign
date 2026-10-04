/* =============================================================
   SCRIPT.JS  —  a tiny bit of JavaScript
   =============================================================
   This file does just five small jobs. You probably don't need to
   touch it, but here's what it does so nothing feels like magic.
   ============================================================= */

/* -------------------------------------------------------------
   1. MOBILE MENU
   On small screens, tapping the hamburger button shows/hides the
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
   3. ABOUT SECTION — MOUSE-REACTIVE BACKGROUND
   The soft colour blobs behind the About section (see #about::before
   in styles.css) drift toward the mouse. We ease the movement each
   frame instead of snapping straight to the cursor, so it glides.
   Skipped entirely if the visitor has asked for reduced motion.
   ------------------------------------------------------------- */
const aboutSection = document.getElementById("about");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (aboutSection && !prefersReducedMotion) {
  let targetX = 50;
  let targetY = 40;
  let currentX = targetX;
  let currentY = targetY;
  let animationFrame = null;

  const glide = () => {
    // Move a fraction of the remaining distance each frame (easing).
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    aboutSection.style.setProperty("--mx", `${currentX}%`);
    aboutSection.style.setProperty("--my", `${currentY}%`);

    const closeEnough =
      Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1;
    animationFrame = closeEnough ? null : requestAnimationFrame(glide);
  };

  aboutSection.addEventListener("mousemove", (event) => {
    const rect = aboutSection.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width) * 100;
    targetY = ((event.clientY - rect.top) / rect.height) * 100;
    if (!animationFrame) {
      animationFrame = requestAnimationFrame(glide);
    }
  });
}

/* -------------------------------------------------------------
   4. PROJECT CATEGORY FILTER
   The pill buttons above the Personal Projects list. Each project
   row has a data-category (e.g. "ux"); clicking a button shows only
   the rows in that category ("all" shows everything). The buttons
   start hidden in the HTML and are revealed here, so if JavaScript
   is off the full list is still visible.
   ------------------------------------------------------------- */
const filterBar = document.querySelector(".filter");
const projectRows = document.querySelectorAll(".project-row");
const filterStatus = document.querySelector(".filter__status");

if (filterBar && projectRows.length) {
  const filterButtons = filterBar.querySelectorAll(".filter__button");

  const applyFilter = (category) => {
    let shown = 0;
    projectRows.forEach((row) => {
      // A row can belong to several categories: data-category="ux game".
      const matches =
        category === "all" || row.dataset.category.split(" ").includes(category);
      row.hidden = !matches;
      if (matches) shown += 1;
    });
    filterButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.filter === category);
    });
    filterStatus.textContent = `Showing ${shown} of ${projectRows.length} projects`;
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.filter));
  });

  filterBar.hidden = false;
  applyFilter("all");
}

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
const trailBuds = document.querySelectorAll(".growth-trail__bud");
const portalToggle = document.getElementById("portalToggle");
const heroSection = document.getElementById("hero");
const landingStage = document.getElementById("landingStage");
const lotusCanvas = document.getElementById("lotusCanvas");
const lotusStartCta = document.getElementById("lotusStartCta");
const orbCluster = document.getElementById("orbCluster");
const siteFooter = document.getElementById("siteFooter");
const growthTrail = document.querySelector(".growth-trail");
const lotusStill = document.querySelector(".lotus-still");

if (trailBuds.length && heroSection) {
  const sectionMeta = Array.from(trailBuds).map((bud) => ({
    id: bud.dataset.section,
    label: bud.querySelector("span").textContent,
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
    if (siteFooter) siteFooter.hidden = false;
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
