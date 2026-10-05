/* =============================================================
   SKILLS-WHEEL.JS — the Skills section as a wheel
   =============================================================
   The pink Skills orb is a spiral rosette, so the section is a rosette
   too: the orb in the middle and eight petals around it, one per area of
   skills (the same leaf shape as the lotus navigation). Choose a petal and
   its skills open in a glass panel; choose a skill and the projects where
   it was used appear as links.

   It is built from the plain lists that are already in index.html
   (.skills__group), so without JavaScript the section still shows them as
   cards. The links between skills and projects live in PROJECTS_FOR
   below, keyed "area-skill" (both counted from 1), so the same table
   works in English and in Spanish.
   ============================================================= */
(function () {
  "use strict";

  var section = document.getElementById("skills");
  var plain = section && section.querySelector(".skills");
  if (!plain) return;
  var groups = Array.prototype.slice.call(plain.querySelectorAll(".skills__group"));
  if (groups.length < 2) return;

  var es = (document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var TEXT = es
    ? {
        label: "Rueda de habilidades",
        hint: "Toca una habilidad para ver en qué proyectos la usé.",
        where: "Dónde la usé",
        none: "Esta habilidad no tiene un proyecto propio; viene del conjunto de mi trabajo.",
        area: "Área",
        prev: "Área anterior",
        next: "Área siguiente",
      }
    : {
        label: "Skills wheel",
        hint: "Pick a skill to see the projects where I used it.",
        where: "Where I used it",
        none: "This skill has no project of its own; it comes from my work as a whole.",
        area: "Area",
        prev: "Previous area",
        next: "Next area",
      };

  // slug -> short names (en, es). The page address is read from the project cards.
  var NAMES = {
    siata: ["SIATA", "SIATA"],
    museum: ["A Night at the Museum", "Una noche en el museo"],
    nuris: ["Nuri's Greenhouse", "Nuri's Greenhouse"],
    meldiria: ["Meldiria", "Meldiria"],
    choices: ["Life-crisis quiz", "Quiz de crisis de vida"],
    feeling: ["El Feeling", "El Feeling"],
    hugger: ["Hugger Island", "Hugger Island"],
    consumer: ["Consumer Behaviour", "Comportamiento del consumidor"],
    hansel: ["Hansel & Gretel", "Hansel & Gretel"],
    surviving: ["Surviving Amongst Nature", "Surviving Amongst Nature"],
    wine: ["Nature's Embodiment of Wine", "Nature's Embodiment of Wine"],
    capitanas: ["Capitanas del Fuego", "Capitanas del Fuego"],
    reel: ["3D reel", "Reel 3D"],
    ciudades: ["Ciudades Posibles", "Ciudades Posibles"],
    vr: ["VR & Emotion Research", "VR y emociones"],
    experience: ["Professional Experience", "Experiencia profesional"],
  };
  var HREF_PART = {
    siata: "project-siata",
    museum: "project-night-at-the-museum",
    nuris: "project-nuris-greenhouse",
    meldiria: "project-meldiria",
    choices: "project-designing-choices",
    feeling: "project-el-feeling",
    hugger: "project-hugger-island",
    consumer: "project-consumer-behaviour",
    hansel: "project-hansel-gretel",
    surviving: "project-surviving-amongst-nature",
    wine: "project-natures-embodiment-of-wine",
    capitanas: "project-capitanas-del-fuego",
    reel: "project-3d-reel",
    ciudades: "project-ciudades-posibles",
    vr: "project-vr-emotion-research",
  };

  var PROJECTS_FOR = {
    "1-1": "siata hugger ciudades feeling",
    "1-2": "hugger ciudades feeling consumer",
    "1-3": "siata hugger feeling consumer",
    "1-4": "siata ciudades",
    "1-5": "siata",
    "1-6": "siata",
    "1-7": "feeling",
    "1-8": "hugger consumer",
    "1-9": "siata hugger",
    "2-1": "feeling siata choices",
    "2-2": "siata choices feeling",
    "2-3": "choices museum feeling",
    "2-4": "feeling",
    "2-5": "feeling",
    "2-6": "siata",
    "2-7": "choices",
    "2-8": "siata choices",
    "3-1": "museum hansel meldiria vr",
    "3-2": "nuris",
    "3-3": "hansel meldiria museum",
    "3-4": "hansel",
    "3-5": "hansel meldiria museum",
    "3-6": "museum vr",
    "3-7": "hansel meldiria museum",
    "3-8": "museum",
    "4-1": "museum",
    "4-2": "vr",
    "4-3": "vr museum",
    "4-4": "vr",
    "4-5": "nuris museum",
    "4-6": "nuris",
    "4-7": "nuris museum",
    "5-1": "meldiria ciudades",
    "5-2": "choices hansel",
    "5-3": "meldiria",
    "5-4": "meldiria",
    "5-5": "museum hansel meldiria",
    "5-6": "experience",
    "6-1": "surviving wine",
    "6-2": "surviving wine",
    "6-3": "hansel meldiria museum nuris",
    "6-4": "choices",
    "6-5": "surviving nuris",
    "6-6": "choices surviving wine siata",
    "7-1": "reel",
    "7-2": "reel",
    "7-3": "reel",
    "7-4": "reel",
    "7-5": "capitanas",
    "7-6": "capitanas",
    "7-7": "experience",
    "7-8": "ciudades experience consumer feeling",
    "7-9": "siata feeling",
    "7-10": "experience",
    "8-1": "capitanas hugger",
    "8-2": "hugger capitanas",
    "8-3": "experience",
    "8-4": "experience",
    "8-5": "experience",
    "8-6": "museum experience",
    "8-7": "capitanas ciudades",
    "8-8": "museum hansel",
  };

  // Where each project page lives (read from the cards on this page, so the
  // Spanish page links to the Spanish pages).
  var pageFor = function (slug) {
    if (slug === "experience") return "#experience";
    var part = HREF_PART[slug];
    var link = part && document.querySelector('.pcard__link[href^="' + part + '"]');
    return link ? link.getAttribute("href") : null;
  };

  /* ---- read the plain lists ---- */
  var data = groups.map(function (group, gi) {
    return {
      num: (group.querySelector(".skills__number") || {}).textContent || String(gi + 1).padStart(2, "0"),
      title: (group.querySelector(".skills__title") || {}).textContent || "",
      items: Array.prototype.map.call(group.querySelectorAll(".skills__list li"), function (li, ii) {
        return { text: li.textContent.trim(), key: gi + 1 + "-" + (ii + 1) };
      }),
    };
  });

  /* ---- build the wheel ---- */
  var N = data.length;
  var root = document.createElement("div");
  root.className = "skwheel";
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", TEXT.label);

  var stage = document.createElement("div");
  stage.className = "skwheel__stage";

  var svgNS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "skwheel__stems");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  var defs = document.createElementNS(svgNS, "defs");
  defs.innerHTML =
    '<linearGradient id="skStem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f960ca"/><stop offset="1" stop-color="#8f5cff"/></linearGradient>';
  svg.appendChild(defs);
  var stems = [];
  data.forEach(function (d, i) {
    var a = (i / N) * Math.PI * 2;
    var line = document.createElementNS(svgNS, "path");
    var x = 50 + Math.sin(a) * 38;
    var y = 50 - Math.cos(a) * 38;
    // a gentle curve, like the stems on the landing screen
    var cx = 50 + Math.sin(a + 0.35) * 22;
    var cy = 50 - Math.cos(a + 0.35) * 22;
    line.setAttribute("d", "M50 50 Q" + cx.toFixed(2) + " " + cy.toFixed(2) + " " + x.toFixed(2) + " " + y.toFixed(2));
    line.setAttribute("class", "skwheel__stem");
    svg.appendChild(line);
    stems.push(line);
  });
  stage.appendChild(svg);

  var core = document.createElement("span");
  core.className = "skwheel__core";
  core.setAttribute("aria-hidden", "true");
  core.innerHTML = '<img src="assets/site/orb-skills.png" alt="" width="254" height="246" decoding="async" />';
  stage.appendChild(core);

  var petals = data.map(function (d, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "skwheel__petal";
    var ang = (i / N) * Math.PI * 2;
    b.style.setProperty("--a", (i / N) * 360 + "deg");
    b.style.left = (50 + Math.sin(ang) * 39).toFixed(2) + "%";
    b.style.top = (50 - Math.cos(ang) * 39).toFixed(2) + "%";
    b.title = d.title;
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", TEXT.area + " " + d.num + ": " + d.title);
    b.innerHTML =
      '<span class="skwheel__leaf" aria-hidden="true"><i></i><i></i></span>' +
      '<span class="skwheel__num" aria-hidden="true">' + d.num + "</span>" +
      '<span class="skwheel__name" aria-hidden="true">' + d.title + "</span>";
    stage.appendChild(b);
    return b;
  });
  root.appendChild(stage);

  var panel = document.createElement("div");
  panel.className = "skwheel__panel";
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML =
    '<p class="skwheel__count"></p><h3 class="skwheel__title"></h3>' +
    '<ul class="skwheel__chips"></ul>' +
    '<div class="skwheel__where"><p class="skwheel__where-label"></p><ul class="skwheel__links"></ul></div>';
  root.appendChild(panel);

  var elCount = panel.querySelector(".skwheel__count");
  var elTitle = panel.querySelector(".skwheel__title");
  var elChips = panel.querySelector(".skwheel__chips");
  var elWhereLabel = panel.querySelector(".skwheel__where-label");
  var elLinks = panel.querySelector(".skwheel__links");

  var current = -1;
  var chipIndex = -1;

  var showLinks = function (item) {
    elLinks.innerHTML = "";
    if (!item) {
      elWhereLabel.textContent = TEXT.hint;
      return;
    }
    var slugs = (PROJECTS_FOR[item.key] || "").split(" ").filter(Boolean);
    elWhereLabel.textContent = slugs.length ? TEXT.where + ": " + item.text : TEXT.none;
    slugs.forEach(function (slug) {
      var href = pageFor(slug);
      if (!href) return;
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = href;
      a.textContent = NAMES[slug][es ? 1 : 0];
      a.className = "skwheel__link";
      li.appendChild(a);
      elLinks.appendChild(li);
    });
  };

  var select = function (i, focus) {
    i = ((i % N) + N) % N;
    current = i;
    chipIndex = -1;
    petals.forEach(function (p, k) {
      var on = k === i;
      p.setAttribute("aria-pressed", on ? "true" : "false");
      p.tabIndex = on ? 0 : -1;
      stems[k].classList.toggle("is-on", on);
    });
    root.style.setProperty("--sel", (i / N) * 360 + "deg");
    var d = data[i];
    panel.classList.remove("is-in");
    void panel.offsetWidth;
    panel.classList.add("is-in");
    elCount.textContent = d.num + " / " + String(N).padStart(2, "0");
    elTitle.textContent = d.title;
    elChips.innerHTML = "";
    d.items.forEach(function (item, k) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "skwheel__chip";
      b.textContent = item.text;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        chipIndex = k;
        Array.prototype.forEach.call(elChips.querySelectorAll(".skwheel__chip"), function (c, n) {
          c.setAttribute("aria-pressed", n === k ? "true" : "false");
        });
        showLinks(item);
      });
      li.appendChild(b);
      elChips.appendChild(li);
    });
    showLinks(null);
    if (focus) petals[i].focus();
  };

  petals.forEach(function (p, i) {
    p.addEventListener("click", function () {
      select(i, false);
    });
    p.addEventListener("keydown", function (e) {
      var step = 0;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") step = 1;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") step = -1;
      if (!step) return;
      e.preventDefault();
      select(i + step, true);
    });
  });

  // Previous / next arrows under the wheel (a clear control on touch screens).
  var arrows = document.createElement("div");
  arrows.className = "skwheel__arrows";
  arrows.innerHTML =
    '<button type="button" class="skwheel__arrow" data-d="-1" aria-label="' + TEXT.prev + '">‹</button>' +
    '<button type="button" class="skwheel__arrow" data-d="1" aria-label="' + TEXT.next + '">›</button>';
  arrows.addEventListener("click", function (e) {
    var b = e.target.closest(".skwheel__arrow");
    if (b) select(current + Number(b.dataset.d), false);
  });
  stage.appendChild(arrows);

  select(0, false);

  // Put the wheel in and hide the plain cards (they stay in the page for
  // anyone without JavaScript).
  plain.parentNode.insertBefore(root, plain);
  plain.classList.add("is-replaced");
  if (!reduced) root.classList.add("is-alive");
})();
