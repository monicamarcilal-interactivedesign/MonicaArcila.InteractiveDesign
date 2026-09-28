/* =============================================================
   SCRIPT.JS  —  a tiny bit of JavaScript
   =============================================================
   This file does just eight small jobs. You probably don't need to
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
   6. GROWTH TRAIL (home page only)
   Watches each section with an IntersectionObserver and marks its
   bud: "is-current" for whichever section fills the middle of the
   screen right now, "is-bloomed" for every section above it (already
   scrolled past). Sections below stay dashed but are still real
   links — clicking one jumps straight there. Does nothing on pages
   that don't have the trail in their HTML.
   ------------------------------------------------------------- */
const trailBuds = document.querySelectorAll(".growth-trail__bud");

if (trailBuds.length) {
  const sectionEls = Array.from(trailBuds)
    .map((bud) => document.getElementById(bud.dataset.section))
    .filter(Boolean);

  const setCurrent = (currentIndex) => {
    trailBuds.forEach((bud, index) => {
      bud.classList.toggle("is-current", index === currentIndex);
      bud.classList.toggle("is-bloomed", index < currentIndex);
    });
  };

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = sectionEls.indexOf(entry.target);
        if (index !== -1) setCurrent(index);
      });
    },
    { rootMargin: "-40% 0px -40% 0px" } // "current" = crossing the middle band of the screen
  );

  sectionEls.forEach((section) => sectionObserver.observe(section));
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

/* -------------------------------------------------------------
   8. PORTAL OVERLAY (home page only)
   The ✦ button above the growth trail opens a map: the current
   section as a big circle, the other six arranged around it in a
   ring. Positions are computed fresh each time it opens (job 6 keeps
   the trail's "is-current" class up to date, so this just reads it).
   Clicking a satellite follows its link and closes the overlay.
   ------------------------------------------------------------- */
const portalToggle = document.getElementById("portalToggle");
const portalOverlay = document.getElementById("portalOverlay");
const portalInner = portalOverlay ? portalOverlay.querySelector(".portal") : null;

if (portalToggle && portalOverlay && portalInner && trailBuds.length) {
  const sectionMeta = Array.from(trailBuds).map((bud) => ({
    href: bud.getAttribute("href"),
    label: bud.querySelector("span").textContent,
  }));

  const buildPortal = () => {
    let currentIndex = Array.from(trailBuds).findIndex((bud) =>
      bud.classList.contains("is-current")
    );
    if (currentIndex === -1) currentIndex = 0;

    const radius = 190;
    const others = sectionMeta.filter((_, index) => index !== currentIndex);

    let html = `<button class="portal__close" type="button" data-close aria-label="Close the map">&times;</button>`;
    html += `<div class="portal__node portal__current"><small>You are here</small><strong>${sectionMeta[currentIndex].label}</strong></div>`;

    others.forEach((section, index) => {
      const angle = (index / others.length) * 2 * Math.PI - Math.PI / 2;
      const x = Math.round(Math.cos(angle) * radius);
      const y = Math.round(Math.sin(angle) * radius);
      html += `<a href="${section.href}" class="portal__node portal__satellite" style="--tx:${x}px;--ty:${y}px">${section.label}</a>`;
    });

    portalInner.innerHTML = html;
  };

  const openPortal = () => {
    buildPortal();
    portalOverlay.hidden = false;
    portalToggle.setAttribute("aria-expanded", "true");
  };

  const closePortal = () => {
    portalOverlay.hidden = true;
    portalToggle.setAttribute("aria-expanded", "false");
  };

  portalToggle.addEventListener("click", openPortal);

  portalOverlay.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) closePortal();
  });

  portalInner.addEventListener("click", (event) => {
    if (event.target.closest(".portal__satellite")) closePortal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !portalOverlay.hidden) closePortal();
  });
}
