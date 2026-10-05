/* =============================================================
   BRAND.JS — the little conversation on ask-monica(.es).html
   =============================================================
   Plain script, no libraries, works from a double-click (file://).
   - Each question button copies the question into the thread as a
     bubble, shows three spark dots for a moment, then swaps in the answer
     stored in the matching <template id="a-…"> in the page.
   - The skin button flips body[data-skin] between daylight and night and
     remembers the choice (localStorage, wrapped in try/catch).
   Nothing here is an AI: the answers are fixed text written ahead of time.
   ============================================================= */
(function () {
  "use strict";

  var body = document.body;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var T = body.dataset; // the page's few words, in its own language (data-t-…)

  /* ---- skin ---- */
  var skinBtn = document.getElementById("skinBtn");
  function setSkin(skin) {
    body.setAttribute("data-skin", skin);
    if (skinBtn) {
      var toNight = skin === "daylight";
      skinBtn.setAttribute("aria-pressed", String(skin === "night"));
      skinBtn.setAttribute("aria-label", toNight ? T.tToNightLabel : T.tToDayLabel);
      skinBtn.querySelector("[data-skin-label]").textContent = toNight ? T.tNight : T.tDay;
      skinBtn.querySelector("[data-skin-icon]").textContent = toNight ? "☾" : "☀";
    }
  }
  var saved = null;
  try { saved = localStorage.getItem("brandSkin"); } catch (e) { /* private mode */ }
  var params = new URLSearchParams(window.location.search);
  // ?skin=night or ?skin=daylight forces a skin (used for screenshots)
  if (params.get("skin") === "night" || params.get("skin") === "daylight") saved = params.get("skin");
  setSkin(saved === "night" ? "night" : "daylight");
  if (skinBtn) {
    skinBtn.addEventListener("click", function () {
      var next = body.getAttribute("data-skin") === "night" ? "daylight" : "night";
      setSkin(next);
      try { localStorage.setItem("brandSkin", next); } catch (e) { /* ignore */ }
    });
  }

  /* ---- conversation ---- */
  var thread = document.getElementById("thread");
  var hint = document.getElementById("hint");
  var chips = document.querySelectorAll(".b-chip");
  if (!thread || !chips.length) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function reveal(node) {
    node.classList.add("b-rise");
    if (!reduced) node.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function ask(chip) {
    var id = chip.getAttribute("data-q");
    var tpl = document.getElementById("a-" + id);
    if (!tpl) return;

    // asked before: take the visitor to that answer instead of repeating it
    var existing = thread.querySelector('[data-answer="' + id + '"]');
    if (existing) {
      existing.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      existing.focus({ preventScroll: true });
      return;
    }

    var q = el("p", "b-msg b-msg--q", chip.textContent.replace(/\s*✓$/, ""));
    thread.appendChild(q);
    reveal(q);
    chip.classList.add("is-asked");

    var typing = el("div", "b-msg b-msg--a");
    typing.setAttribute("aria-hidden", "true");
    typing.innerHTML = '<span class="b-typing"><i class="b-spark"></i><i class="b-spark"></i><i class="b-spark"></i></span>';
    thread.appendChild(typing);
    reveal(typing);

    window.setTimeout(function () {
      var answer = el("article", "b-msg b-msg--a");
      answer.setAttribute("data-answer", id);
      answer.setAttribute("tabindex", "-1");
      var who = el("p", "b-who");
      who.innerHTML = '<i class="b-spark" aria-hidden="true"></i>';
      who.appendChild(document.createTextNode(T.tWho || "Mónica"));
      answer.appendChild(who);
      answer.appendChild(tpl.content.cloneNode(true));
      thread.replaceChild(answer, typing);
      reveal(answer);
      if (hint) hint.textContent = T.tMore;
    }, reduced ? 0 : 750);
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () { ask(chip); });
  });

  // ?ask=ai,proud opens those answers straight away (used for screenshots)
  var open = params.get("ask");
  if (open) {
    reduced = true;
    open.split(",").forEach(function (id) {
      var chip = document.querySelector('.b-chip[data-q="' + id + '"]');
      if (chip) ask(chip);
    });
  }
})();
