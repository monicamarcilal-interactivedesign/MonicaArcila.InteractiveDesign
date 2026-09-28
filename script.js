/* =============================================================
   SCRIPT.JS  —  a tiny bit of JavaScript
   =============================================================
   This file does just six small jobs. You probably don't need to
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
   5. DARK / LIGHT THEME TOGGLE
   Dark is the default (set in styles.css). Clicking the button in the
   header flips a "data-theme" attribute on <html>, which is all the
   CSS needs to swap every colour token at once. The choice is
   remembered (localStorage) so it stays the same as you move between
   pages — wrapped in try/catch because some browsers (private windows,
   blocked site data) refuse to read or write it.
   ------------------------------------------------------------- */
(() => {
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");

  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem("theme");
  } catch (error) {
    savedTheme = null;
  }
  if (savedTheme === "light") {
    root.setAttribute("data-theme", "light");
  }

  if (themeToggle) {
    const syncLabel = () => {
      const isLight = root.getAttribute("data-theme") === "light";
      themeToggle.textContent = isLight ? "Light" : "Dark";
      themeToggle.setAttribute("aria-pressed", String(isLight));
    };
    syncLabel();

    themeToggle.addEventListener("click", () => {
      const isLight = root.getAttribute("data-theme") === "light";
      const nextTheme = isLight ? "dark" : "light";
      root.setAttribute("data-theme", nextTheme);
      try {
        localStorage.setItem("theme", nextTheme);
      } catch (error) {
        /* Not essential — the toggle still works for this page view. */
      }
      syncLabel();
    });
  }
})();

/* -------------------------------------------------------------
   6. HOME PAGE NAVIGATION — scenes, the growth trail, and the lotus
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
const lotusToggle = document.getElementById("lotusToggle");
const orbCluster = document.getElementById("orbCluster");
const orbLines = document.getElementById("orbLines");

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

  /* ---- the lotus + its 5 orbs ---- */
  let lotusState = "closed"; // closed | animating | open
  const WIGGLE_MS = 480;
  const POP_MS = 950;
  const CLOSE_MS = 500;

  const clearOrbLines = () => {
    if (!orbLines) return;
    orbLines.classList.remove("is-visible");
    orbLines.innerHTML = "";
  };

  const drawOrbLines = () => {
    if (!orbLines || !orbCluster) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    orbLines.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    orbLines.innerHTML =
      '<defs><linearGradient id="orbLineGradient" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="var(--color-violet)" /><stop offset="100%" stop-color="var(--color-accent)" />' +
      "</linearGradient></defs>";

    const centerOf = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const addLine = (p1, p2, opacity) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", p1.x);
      line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x);
      line.setAttribute("y2", p2.y);
      line.setAttribute("stroke", "url(#orbLineGradient)");
      line.setAttribute("stroke-width", "1");
      line.setAttribute("opacity", opacity);
      orbLines.appendChild(line);
    };

    const orbEls = Array.from(orbCluster.querySelectorAll(".orb"));
    const orbCenters = orbEls.map(centerOf);
    for (let i = 0; i < orbCenters.length; i++) {
      for (let j = i + 1; j < orbCenters.length; j++) {
        addLine(orbCenters[i], orbCenters[j], 0.3);
      }
    }

    const wordEls = ["wordDesigning", "wordFelt", "wordValued"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    wordEls.forEach((word) => {
      const wp = centerOf(word);
      let nearest = null;
      let nearestDist = Infinity;
      orbCenters.forEach((oc) => {
        const d = Math.hypot(oc.x - wp.x, oc.y - wp.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = oc;
        }
      });
      if (nearest) addLine(wp, nearest, 0.55);
    });
  };

  const positionOrbsAtLotus = () => {
    if (!lotusToggle || !orbCluster) return;
    const orbs = Array.from(orbCluster.querySelectorAll(".orb"));
    // Reset first so getBoundingClientRect reads each orb's real resting
    // spot, not wherever it was left transformed to last time.
    orbs.forEach((orb) => {
      orb.style.setProperty("--ox", "0px");
      orb.style.setProperty("--oy", "0px");
    });
    const lotusRect = lotusToggle.getBoundingClientRect();
    const lotusCenter = { x: lotusRect.left + lotusRect.width / 2, y: lotusRect.top + lotusRect.height / 2 };
    orbs.forEach((orb) => {
      const r = orb.getBoundingClientRect();
      const orbCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      orb.style.setProperty("--ox", `${lotusCenter.x - orbCenter.x}px`);
      orb.style.setProperty("--oy", `${lotusCenter.y - orbCenter.y}px`);
    });
  };

  const openOrbs = () => {
    if (!orbCluster) return;
    positionOrbsAtLotus();
    void orbCluster.offsetWidth; // force layout so the start position is registered before animating
    orbCluster.classList.remove("is-closing");
    orbCluster.classList.add("is-visible");
    window.setTimeout(() => {
      drawOrbLines();
      if (orbLines) orbLines.classList.add("is-visible");
    }, POP_MS);
  };

  const closeOrbs = () => {
    if (!orbCluster) return;
    clearOrbLines();
    orbCluster.classList.add("is-closing");
    window.setTimeout(() => {
      orbCluster.classList.remove("is-visible", "is-closing");
    }, CLOSE_MS);
  };

  const resetLanding = () => {
    // Always closed again when you arrive at/return to the landing screen.
    lotusState = "closed";
    if (lotusToggle) {
      lotusToggle.classList.remove("is-open", "is-wiggling");
      lotusToggle.setAttribute("aria-pressed", "false");
    }
    if (orbCluster) orbCluster.classList.remove("is-visible", "is-closing");
    clearOrbLines();
  };

  if (lotusToggle && orbCluster) {
    const triggerLotus = () => {
      if (lotusState === "animating") return;
      const opening = lotusState === "closed";
      lotusState = "animating";
      lotusToggle.classList.add("is-wiggling");
      window.setTimeout(() => {
        lotusToggle.classList.remove("is-wiggling");
        lotusToggle.classList.toggle("is-open", opening);
        lotusToggle.setAttribute("aria-pressed", String(opening));
        if (opening) openOrbs();
        else closeOrbs();
        lotusState = opening ? "open" : "closed";
      }, WIGGLE_MS);
    };
    lotusToggle.addEventListener("mouseenter", triggerLotus);
    lotusToggle.addEventListener("click", triggerLotus);

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      if (!orbCluster.classList.contains("is-visible")) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(drawOrbLines, 150);
    });
  }

  /* ---- scene switching ---- */
  const showSection = (id) => {
    if (!sectionMeta.some((section) => section.id === id)) return;
    heroSection.hidden = true;
    resetLanding();
    if (lotusToggle) lotusToggle.hidden = true;
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
    heroSection.hidden = false;
    resetLanding();
    if (lotusToggle) lotusToggle.hidden = false;
    activeId = null;
    updateTrail();
    window.scrollTo(0, 0);
  };

  if (portalToggle) {
    portalToggle.addEventListener("click", showLanding);
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
  let requestedId = location.hash.slice(1);
  if (requestedId in legacyAliases) requestedId = legacyAliases[requestedId];

  if (requestedId && sectionMeta.some((section) => section.id === requestedId)) {
    showSection(requestedId);
  } else {
    showLanding();
  }
}
