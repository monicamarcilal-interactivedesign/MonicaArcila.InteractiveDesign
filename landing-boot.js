/* =============================================================
   LANDING-BOOT.JS — loads the 3D lotus only when it is wanted (2026-10-06)
   =============================================================
   Why: Three.js (about 600 KB), the model (3.9 to 9.6 MB), the shader
   compile and the first renders are a lot of work, and on a phone they used
   to happen before anything but a hint showed (a mobile speed test measured
   a 34 second largest paint and 28 seconds of blocked time). Now:

     1. The page paints at once with a light still image of the flower
        (html.lotus-poster, set in the page head; see styles.css).
     2. The 3D scene (Three.js, its GLTF loader, then landing-3d.js and the
        model) is loaded by load3D():
          - on the first touch, click, key press, wheel or mouse move;
          - or about 6 seconds after the page has loaded, if nobody has
            touched it;
          - or at once when anything asks for the scene: activate(),
            jumpToSettled(), a link to #lotus, or reading lotusScene.ready.
        With the browser's data-saver on, only a touch, click or key does it.
     3. Tapping the still flower loads the scene and the sequence begins by
        itself when it is ready (start({ autoBegin: true })).
     4. When the 3D flower is ready the still fades out. If the scripts, WebGL
        or the model fail, html.no-webgl takes over as before.

   window.lotusScene keeps the same public API as before, so script.js and
   landing-fx.js did not change except where they are noted.
   ============================================================= */
(function () {
  "use strict";

  var THREE_URL = "https://unpkg.com/three@0.140.0/build/three.min.js";
  var GLTF_URL = "https://unpkg.com/three@0.140.0/examples/js/loaders/GLTFLoader.js";
  var SCENE_URL = "landing-3d.js?v=20261006b";

  var root = document.documentElement;
  var canvas = document.getElementById("lotusCanvas");
  var impl = null;
  var loading = false;
  var autoBegin = false;
  var pendingTier = null;
  var resolveReady;
  var rejectReady;
  var ready = new Promise(function (resolve, reject) {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(function () {}); // the callers that await it handle a failure themselves

  function fail(error) {
    if (error) console.warn("lotus: 3D scene not loaded", error);
    root.classList.add("no-webgl");
    root.classList.remove("lotus-poster", "lotus-poster-out");
    rejectReady(error || new Error("3D scene not available"));
  }

  function addScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error("could not load " + src));
      };
      document.head.appendChild(s);
    });
  }

  function load3D() {
    if (loading) return;
    loading = true;
    if (!canvas) {
      fail(new Error("no #lotusCanvas on this page"));
      return;
    }
    // the hint shows that something is happening while the scripts download
    var hint = document.getElementById("lotusHint");
    if (hint && autoBegin) hint.textContent = document.documentElement.lang.indexOf("es") === 0 ? "Cargando…" : "Loading…";

    addScript(THREE_URL)
      .then(function () { return addScript(GLTF_URL); })
      .then(function () { return addScript(SCENE_URL); })
      .then(function () {
        impl = window.__lotusImpl;
        if (!impl) throw new Error("scene module did not start");
        if (pendingTier !== null) impl.setQuality(pendingTier);
        impl.start({ autoBegin: autoBegin });
        impl.ready.then(resolveReady, rejectReady);
      })
      .catch(fail);
  }

  /* ---- public API (same names as before) ---- */
  window.lotusScene = {
    start: function (options) {
      if (options && options.autoBegin) {
        autoBegin = true;
        if (impl) impl.start({ autoBegin: true });
      }
      load3D();
    },
    activate: function () {
      load3D();
      return ready.then(function () { return impl.activate(); });
    },
    settle: function () {
      return ready.then(function () { return impl.settle(); }, function () {});
    },
    reset: function () {
      return ready.then(function () { return impl.reset(); }, function () {});
    },
    jumpToSettled: function () {
      load3D();
      return ready.then(function () { return impl.jumpToSettled(); }, function () {});
    },
    refresh: function () {
      if (impl) impl.refresh();
    },
    coreOffsetY: function () {
      return impl ? impl.coreOffsetY() : 0;
    },
    setQuality: function (tier) {
      if (impl) impl.setQuality(tier);
      else pendingTier = tier;
    },
  };
  Object.defineProperty(window.lotusScene, "ready", {
    get: function () {
      load3D();
      return ready;
    },
  });

  /* ---- when to load ---- */
  if (!canvas) return;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var go = function () { load3D(); };
  var types = saveData ? ["pointerdown", "touchstart", "keydown"] : ["pointerdown", "touchstart", "keydown", "wheel", "mousemove"];
  types.forEach(function (type) {
    window.addEventListener(type, go, { once: true, passive: true });
  });
  if (!saveData) {
    var afterLoad = function () { window.setTimeout(go, 6000); };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
  }
})();
