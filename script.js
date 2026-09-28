/* =============================================================
   SCRIPT.JS  —  a tiny bit of JavaScript
   =============================================================
   This file does just seven small jobs. You probably don't need to
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
   6. HOME PAGE NAVIGATION — scenes, the growth trail and the portal
   Replaces plain scrolling between sections with a "jump to a scene"
   model: only one section is visible at a time, so moving between
   them is never scroll-only. The portal is the very first thing you
   see on a fresh visit (desktop, no #section in the address) — pick a
   sphere to enter the site. Once inside, the ✦ button above the
   growth trail reopens the portal to jump anywhere else. The trail's
   buds track every section visited this browsing session, in any
   order, not scroll position — see updateTrail() below.

   PROGRESSIVE ENHANCEMENT: if this script doesn't run, nothing gets
   hidden — every section is right there in the HTML, and the page is
   simply one long scrolling document, exactly like before. Nothing
   here is the only way to use the site.
   ------------------------------------------------------------- */
const trailBuds = document.querySelectorAll(".growth-trail__bud");
const portalToggle = document.getElementById("portalToggle");
const portalOverlay = document.getElementById("portalOverlay");
const portalInner = portalOverlay ? portalOverlay.querySelector(".portal") : null;

if (trailBuds.length && portalToggle && portalOverlay && portalInner) {
  const sectionMeta = Array.from(trailBuds).map((bud) => ({
    id: bud.dataset.section,
    label: bud.querySelector("span").textContent,
  }));
  const homeSections = sectionMeta
    .map((section) => document.getElementById(section.id))
    .filter(Boolean);

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

  let activeId = null; // null = the portal is the landing screen, nothing chosen yet

  const updateTrail = () => {
    const visited = getVisited();
    trailBuds.forEach((bud) => {
      const id = bud.dataset.section;
      bud.classList.toggle("is-current", id === activeId);
      bud.classList.toggle("is-bloomed", id !== activeId && visited.has(id));
    });
  };

  const ringPosition = (index, total, radius) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius) };
  };

  const buildPortal = () => {
    const radius = 190;
    let html = activeId !== null
      ? `<button class="portal__close" type="button" data-close aria-label="Close the map">&times;</button>`
      : "";

    if (activeId === null) {
      // Landing: no "current" section yet, so all seven spheres share one ring.
      sectionMeta.forEach((section, index) => {
        const { x, y } = ringPosition(index, sectionMeta.length, radius);
        html += `<a href="#${section.id}" class="portal__node portal__satellite" style="--tx:${x}px;--ty:${y}px">${section.label}</a>`;
      });
      html += `<div class="portal__node portal__current"><small>Choose where to start</small><strong>Mónica Arcila</strong></div>`;
    } else {
      const current = sectionMeta.find((section) => section.id === activeId);
      const others = sectionMeta.filter((section) => section.id !== activeId);
      html += `<div class="portal__node portal__current"><small>You are here</small><strong>${current.label}</strong></div>`;
      others.forEach((section, index) => {
        const { x, y } = ringPosition(index, others.length, radius);
        html += `<a href="#${section.id}" class="portal__node portal__satellite" style="--tx:${x}px;--ty:${y}px">${section.label}</a>`;
      });
    }

    portalInner.innerHTML = html;
  };

  const openPortal = () => {
    buildPortal();
    portalOverlay.hidden = false;
    portalToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };

  const closePortal = () => {
    if (activeId === null) return; // landing has nowhere to "close" back to yet
    portalOverlay.hidden = true;
    portalToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  const showSection = (id) => {
    if (!sectionMeta.some((section) => section.id === id)) return;
    homeSections.forEach((section) => {
      section.hidden = section.id !== id;
    });
    activeId = id;
    markVisited(id);
    updateTrail();
    portalOverlay.hidden = true;
    portalToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    history.replaceState(null, "", "#" + id);
    window.scrollTo(0, 0);
  };

  // Any link to #hero, #work, #seedbeds... anywhere on the page (header
  // nav, the mobile menu, the growth trail, the portal's own spheres)
  // switches scenes instead of the browser's default anchor scroll.
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    if (!sectionMeta.some((section) => section.id === id)) return;
    event.preventDefault();
    showSection(id);
  });

  portalToggle.addEventListener("click", openPortal);

  portalOverlay.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) closePortal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !portalOverlay.hidden) closePortal();
  });

  // Start on the portal (desktop, nothing requested yet) or jump straight
  // to whatever section the URL names — e.g. a project page's "back to
  // projects" link pointing at index.html#work. Phones skip the portal's
  // ring (no room for it) and open on Hero; the hamburger menu still
  // switches scenes exactly the same way underneath.
  const requestedId = location.hash.slice(1);
  const isWideEnoughForPortal = window.matchMedia("(min-width: 901px)").matches;

  if (requestedId && sectionMeta.some((section) => section.id === requestedId)) {
    showSection(requestedId);
  } else if (isWideEnoughForPortal) {
    homeSections.forEach((section) => {
      section.hidden = true;
    });
    updateTrail();
    openPortal();
  } else {
    showSection("hero");
  }
}

/* -------------------------------------------------------------
   7. LOTUS TOGGLE (home page only)
   Closed by default. The first hover or click opens it and it stays
   open; the next hover or click closes it again. Always starts
   closed again on reload — nothing is saved. A <button> already
   responds to Enter/Space on its own, so there's no extra keyboard
   handling to write here.
   ------------------------------------------------------------- */
const lotusToggle = document.getElementById("lotusToggle");

if (lotusToggle) {
  const toggleLotus = () => {
    const isOpen = lotusToggle.classList.toggle("is-open");
    lotusToggle.setAttribute("aria-pressed", String(isOpen));
  };
  lotusToggle.addEventListener("mouseenter", toggleLotus);
  lotusToggle.addEventListener("click", toggleLotus);
}
