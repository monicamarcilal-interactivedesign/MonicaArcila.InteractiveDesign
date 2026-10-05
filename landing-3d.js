/* =============================================================
   LANDING-3D.JS — the 3D lotus on the home page's landing screen
   =============================================================
   Renders Mónica's own lotus model into #lotusCanvas, full-bleed
   behind the landing screen's 2D layers (glow, vignette, orbs, motto —
   see the LANDING STAGE section of styles.css for how those stack).

   This is a separate file from script.js on purpose: script.js is
   deliberately kept small and readable ("just five small jobs"), and
   a Three.js scene — loading a model, lighting it, animating a camera
   — is a different kind of complexity worth keeping apart from that.

   Everything this file does is reached through one small object:

     window.lotusScene = {
       ready,     // Promise — resolves once the model has loaded
       activate,  // () => Promise — plays the click→zoom→rotate
                  //   sequence, resolves once the camera move ends
       settle,    // () => Promise — the flower then sinks a little
       reset,     // () => void — tweens back to the idle side view
       refresh,   // () => void — redraws at the current size (after the
                  //   landing screen was hidden)
       coreOffsetY, // () => px the open flower's centre sinks below
                  //   the screen's middle (where the orbs flow out of)
     };

   script.js job 5 calls these and nothing else — it doesn't know or
   care whether the model is a .glb or a raw .obj+textures.

   PROGRESSIVE ENHANCEMENT: if this script never runs (WebGL unsupported,
   the CDN unreachable), #lotusCanvas just sits there empty. Nothing else
   on the page depends on it loading — the orb/section navigation in
   script.js guards every call to window.lotusScene with `?.` and a
   same-tick fallback. The same scene runs on phones and tablets as on
   desktop (2026-10-04); if WebGL or the model can't load, html.no-webgl
   swaps in a static image instead (see .lotus-still in styles.css).

   NOT an ES module (deliberately): see the comment above this file's
   <script> tag in index.html for why. `THREE` below is a plain global,
   already defined by the classic Three.js build loaded just before this
   file. Everything else in this file is wrapped in one IIFE so none of
   its own names leak into — or collide with — script.js's globals (it
   already tried to declare its own top-level `prefersReducedMotion`,
   same as script.js does, before this was added).
   ============================================================= */

(function () {

// If the Three.js CDN scripts didn't arrive (offline, blocked), THREE is
// undefined and nothing below could run — use the same static fallback
// as a WebGL failure instead of throwing and leaving an empty canvas.
if (typeof THREE === "undefined" || typeof THREE.GLTFLoader === "undefined") {
  document.documentElement.classList.add("no-webgl");
  return;
}

const canvas = document.getElementById("lotusCanvas");
const landingStageEl = document.getElementById("landingStage");
const hintEl = document.getElementById("lotusHint");
// Phones and tablets: a touch screen taps rather than clicks, and gets a
// lower pixel-ratio cap (below) to keep the full-screen render affordable.
const isTouch = window.matchMedia("(pointer: coarse)").matches;
const LANDING_ES = (document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;

/* -------------------------------------------------------------
   1. MODEL CONFIG — swap the asset without touching anything else.
   Loaded from the repo's own raw GitHub URL, not a local relative
   path: browsers block a file:// page (i.e. double-clicking index.html)
   from fetching a local sibling binary asset, but a real https:// fetch
   works the same regardless of where the page itself was opened from.
   This only works once the repo is public (raw.githubusercontent.com
   404s on a private repo for anyone not authenticated as the owner —
   confirmed with curl while this was still private). Mónica's making it
   public, so this is set to the real URL now; if that hasn't taken
   effect yet for some reason, the fetch just fails gracefully into the
   same static-image fallback mobile gets (see the .no-webgl handling
   below) rather than breaking anything.
   ------------------------------------------------------------- */
const RAW_BASE =
  "https://raw.githubusercontent.com/monicamarcilal-interactivedesign/MonicaArcila.InteractiveDesign/main/assets/3d/lotus/";

const MODEL_CONFIG = {
  // "shaded" has its look baked into one texture (smaller download,
  // looks right without careful scene lighting) — "pbr" has separate
  // base-colour/normal/roughness/metalness maps and responds more to
  // the lights below. Swap the filename here to compare; nothing else
  // needs to change either way since both are .glb.
  type: "glb",
  glb: { url: RAW_BASE + "lotus-shaded.glb" },
  obj: {
    url: RAW_BASE + "base.obj",
    textures: {
      map: RAW_BASE + "texture_diffuse.png",
      normalMap: RAW_BASE + "texture_normal.png",
      roughnessMap: RAW_BASE + "texture_roughness.png",
      metalnessMap: RAW_BASE + "texture_metallic.png",
    },
  },
};

/* -------------------------------------------------------------
   2. EASING + TWEEN — one small hand-rolled helper. No Tween.js: there
   are exactly two authored camera paths (activate, reset) and one
   mesh-rotation value, not enough to justify a whole library on a
   no-build site.
   ------------------------------------------------------------- */
// A sine ease: gentler than a cubic at both ends, so every move starts and
// lands softly — Mónica asked for everything to flow, nothing bouncy.
function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

let tweenToken = 0;
function tween(durationMs, onUpdate) {
  return new Promise((resolve) => {
    const token = ++tweenToken;
    const start = performance.now();
    const step = (now) => {
      if (token !== tweenToken) return; // superseded by a newer tween — stop silently
      const t = Math.min((now - start) / durationMs, 1);
      onUpdate(easeInOutSine(t));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* -------------------------------------------------------------
   3. SCENE SETUP
   ------------------------------------------------------------- */
let renderer = null;
let scene = null;
let camera = null;
let model = null;
let modelCenter = new THREE.Vector3();
let modelRadius = 1;
let idleRafId = null;
let idleAngle = 0; // current azimuth while idling, so activate() continues smoothly rather than snapping
let lastCanvasW = 0;
let lastCanvasH = 0;
let modelHalfWidth = 1; // widest horizontal reach from the centre, for fitting narrow screens

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  // 3x phone screens would render ~2.25x the pixels of the 2x cap for no
  // visible gain on a flower that's softened and blurred anyway.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Without tone mapping, bright highlights just clip to flat white
  // instead of rolling off smoothly — that clipping is most of what was
  // reading as "harsh/oversaturated/cheap" rather than soft and filmic.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);
  // Also follow the canvas itself: if its on-screen size changes without a
  // window resize (a layout change, the window being restored from a small
  // size...), the drawing buffer must change with it, or the flower is a small
  // picture stretched up — soft and blocky.
  if (window.ResizeObserver) new ResizeObserver(resizeRenderer).observe(canvas);
}

function resizeRenderer() {
  if (!renderer || !canvas) return;
  const { clientWidth, clientHeight } = canvas;
  if (!clientWidth || !clientHeight) return;
  // The camera is created after the renderer, so this has to run even
  // when the size below turns out unchanged.
  if (camera) {
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    applyCoreShift();
  }
  // Mobile browsers fire resize constantly as the address bar slides in
  // and out — reallocating (and clearing) the drawing buffer each time
  // for an unchanged size would just flicker.
  // The pixel ratio can change on its own too (browser zoom, moving the
  // window to another screen): re-read it, and rebuild the buffer if so.
  const ratio = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
  const ratioChanged = ratio !== renderer.getPixelRatio();
  if (ratioChanged) renderer.setPixelRatio(ratio);
  if (!ratioChanged && clientWidth === lastCanvasW && clientHeight === lastCanvasH) return;
  lastCanvasW = clientWidth;
  lastCanvasH = clientHeight;
  renderer.setSize(clientWidth, clientHeight, false);
  // setSize() resizes (and clears) the drawing buffer immediately, but
  // doesn't redraw it — fine while the idle loop or a tween is already
  // calling render() every frame, but once "settled" nothing else is
  // rendering any more, so a resize at that point would otherwise leave
  // the canvas blank until the next click.
  render();
}

function buildScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  resizeRenderer();

  // A simple, generic 3-point-ish setup — reasonable for either the
  // "shaded" (already-lit-looking) or "pbr" (more light-dependent)
  // export, without needing to hand-tune per material. Softer than the
  // first pass: the "shaded" texture already carries its own baked-in
  // highlights, so a strong key light on top of that was double-exposing
  // them into harsh, blown-out specular pops. More ambient fill relative
  // to the key light flattens that contrast into something softer.
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 0.7);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8747f8, 0.45); // --color-violet, ties the lighting to the site's palette
  rim.position.set(-3, 1, -2);
  scene.add(rim);
}

/* -------------------------------------------------------------
   4. LOADING — branches on MODEL_CONFIG.type; everything past this
   function works with a plain THREE.Object3D regardless of format.
   ------------------------------------------------------------- */
async function loadLotusModel() {
  if (MODEL_CONFIG.type === "glb") {
    // load() instead of loadAsync() so the download progress can drive the
    // hint text — the model is ~10MB, a real wait on a phone's data.
    const gltf = await new Promise((resolve, reject) => {
      new THREE.GLTFLoader().load(MODEL_CONFIG.glb.url, resolve, (event) => {
        if (hintEl && event.lengthComputable && event.total) {
          hintEl.textContent = (LANDING_ES ? "Cargando " : "Loading ") + Math.round((event.loaded / event.total) * 100) + "%";
        }
      }, reject);
    });
    // The baked texture itself is a fairly hard, glossy neon — nudging
    // roughness up and metalness down softens the sharp specular
    // "sparkle" that was reading as rough/cheap, without touching the
    // texture (colour/identity) itself (2026-10-01, Mónica's call).
    gltf.scene.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mat = child.material;
      if (typeof mat.roughness === "number") mat.roughness = Math.min(1, mat.roughness + 0.3);
      if (typeof mat.metalness === "number") mat.metalness = Math.max(0, mat.metalness - 0.25);
    });
    return gltf.scene;
  }

  const obj = await new THREE.OBJLoader().loadAsync(MODEL_CONFIG.obj.url);
  const loader = new THREE.TextureLoader();
  const tex = (url) => {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const material = new THREE.MeshStandardMaterial({
    map: tex(MODEL_CONFIG.obj.textures.map),
    normalMap: loader.load(MODEL_CONFIG.obj.textures.normalMap),
    roughnessMap: loader.load(MODEL_CONFIG.obj.textures.roughnessMap),
    metalnessMap: loader.load(MODEL_CONFIG.obj.textures.metalnessMap),
    metalness: 1,
    roughness: 1,
  });
  obj.traverse((child) => {
    if (child.isMesh) child.material = material;
  });
  return obj;
}

/* -------------------------------------------------------------
   5. CAMERA FRAMING — computed from the model's own bounding sphere,
   not hardcoded units, so it's robust to whichever asset is loaded.
   Side view (idle) = polar 90°. Near-top (settled) = 28° off vertical
   — not 0°/flat, which flattens the petals into a disc and loses the
   "still a flower" silhouette.
   ------------------------------------------------------------- */
const IDLE_POLAR = Math.PI / 2;
const END_POLAR = THREE.MathUtils.degToRad(28);
const END_AZIMUTH_SWEEP = THREE.MathUtils.degToRad(15);
// Idle starts farther back (smaller flower, more room for the zoom to
// travel) and settles farther out too (2026-10-01, Mónica's call) — she
// wanted to almost see the whole flower once it's settled, not just a
// close crop of the centre.
const IDLE_DIST_FACTOR = 3.4;
const END_DIST_FACTOR = 2.0;
// On narrow (portrait) screens the distance factors above would crop the
// flower sideways — the camera's field of view is fixed vertically, so a
// tall thin screen sees very little width. These say how much of the
// screen's width the flower should span instead (idle: small, settled:
// nearly full width), and whichever needs the camera farther back wins.
// On landscape screens the distance factors already give a bigger
// distance than this, so desktop is unchanged.
const IDLE_FILL = 0.55;
const END_FILL = 0.86;

function fitDistance(fill) {
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return modelHalfWidth / (fill * tanHalfFov * camera.aspect);
}

function setCamera(polar, azimuth, distFactor, fill) {
  const dist = Math.max(modelRadius * distFactor, fitDistance(fill));
  camera.position.setFromSphericalCoords(dist, polar, azimuth).add(modelCenter);
  camera.lookAt(modelCenter);
}

// How far the flower sinks on screen in the last beat (as a fraction of the
// screen's height), so there's open space above it for the orbs to flow
// out into. Shifts the whole projection (setViewOffset) rather than the
// model, so the camera, framing and spin are all untouched. A little
// less on portrait screens, which have less height to spare.
const CORE_SHIFT = window.matchMedia("(max-aspect-ratio: 1/1)").matches ? 0.1 : 0.12;
let coreShiftFrac = 0; // 0 = centred, CORE_SHIFT = sunk

function applyCoreShift() {
  if (!camera || !canvas || !canvas.clientHeight) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const shiftPx = coreShiftFrac * h;
  if (shiftPx) {
    camera.setViewOffset(w, h, 0, -shiftPx, w, h);
  } else {
    camera.clearViewOffset();
  }
  // The glow behind the flower follows it down (styles.css --core-shift).
  document.documentElement.style.setProperty("--core-shift", `${CORE_SHIFT * h}px`);
}

// Where the open flower's centre ends up, as px below the screen's
// middle — the point script.js flows the orbs out of.
function coreOffsetY() {
  return canvas ? CORE_SHIFT * canvas.clientHeight : 0;
}

function frameCameraToModel() {
  const box = new THREE.Box3().setFromObject(model);
  box.getCenter(modelCenter);
  model.position.sub(modelCenter); // recentre the geometry itself to the world origin
  modelCenter.set(0, 0, 0);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  modelRadius = Math.max(sphere.radius, 0.01);
  // The flower is roughly round seen from above, so its widest horizontal
  // reach is the bigger of its x/z half-extents (a little padding for the
  // spin it does while zooming).
  modelHalfWidth = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 0.01) * 0.5 * 1.05;
  setCamera(IDLE_POLAR, idleAngle, IDLE_DIST_FACTOR, IDLE_FILL);
}

/* -------------------------------------------------------------
   6. IDLE LOOP — slow auto-rotation so the flower never reads as a
   frozen image while waiting to be clicked. Cancellable so activate()
   can take over cleanly instead of fighting it.
   ------------------------------------------------------------- */
function startIdleLoop() {
  // Paint immediately rather than waiting for the first rAF tick — a
  // backgrounded/inactive tab can delay or pause rAF entirely, which
  // would otherwise leave the canvas blank until it regains focus.
  render();
  // Never more than one loop: an unguarded second call used to leave the
  // first one running forever, and it kept pulling the camera back to the
  // idle side view while the zoom tried to hold the big flower.
  if (prefersReducedMotion || idleRafId !== null) return;
  const step = () => {
    idleAngle += 0.0025; // ~1 full turn every ~42s
    setCamera(IDLE_POLAR, idleAngle, IDLE_DIST_FACTOR, IDLE_FILL);
    render();
    idleRafId = requestAnimationFrame(step);
  };
  idleRafId = requestAnimationFrame(step);
}

function stopIdleLoop() {
  if (idleRafId !== null) {
    cancelAnimationFrame(idleRafId);
    idleRafId = null;
  }
}

function render() {
  if (renderer && scene && camera) renderer.render(scene, camera);
}

/* -------------------------------------------------------------
   7. THE AUTHORED MOVES — all eased with a sine curve, so every one
   starts and lands softly (Mónica asked for flow, not bounce).
     activate()  idle -> the big, near-top flower (the zoom)
     settle()    that flower sinks a little (the orbs flow out)
     reset()     all the way back to idle
   The camera's progress between idle (0) and the big flower (1) is kept
   in poseT, so reset() always starts from where the flower really is
   instead of assuming it's at the end.
   ------------------------------------------------------------- */
const ZOOM_MS = 3500;
const SETTLE_MS = 2600;
const END_ROTATION_Y = THREE.MathUtils.degToRad(50);
let poseT = 0; // 0 = idle side view ... 1 = the big near-top flower
let poseStartAz = 0; // the azimuth the zoom started from

function applyPose(p) {
  setCamera(
    THREE.MathUtils.lerp(IDLE_POLAR, END_POLAR, p),
    THREE.MathUtils.lerp(poseStartAz, poseStartAz + END_AZIMUTH_SWEEP, p),
    THREE.MathUtils.lerp(IDLE_DIST_FACTOR, END_DIST_FACTOR, p),
    THREE.MathUtils.lerp(IDLE_FILL, END_FILL, p)
  );
  model.rotation.y = THREE.MathUtils.lerp(0, END_ROTATION_Y, p);
}

async function activate() {
  await ready;
  stopIdleLoop();
  poseStartAz = idleAngle;

  if (prefersReducedMotion) {
    // Skip the ride, not the destination — jump straight to the end
    // framing with a brief cross-fade instead of the full camera tween.
    poseT = 1;
    applyPose(1);
    render();
    await tween(150, () => render());
    return;
  }

  // The camera glides in toward a near-top view while the flower turns
  // on its own Y axis — together they read as "the flower turns as we
  // close in", not just a push-in.
  await tween(ZOOM_MS, (t) => {
    poseT = t;
    applyPose(t);
    render();
  });
}

async function settle() {
  try {
    await ready;
  } catch {
    return;
  }
  const from = coreShiftFrac;
  if (prefersReducedMotion) {
    coreShiftFrac = CORE_SHIFT;
    applyCoreShift();
    render();
    return;
  }
  await tween(SETTLE_MS, (t) => {
    coreShiftFrac = THREE.MathUtils.lerp(from, CORE_SHIFT, t);
    applyCoreShift();
    render();
  });
}

// Jump straight to the finished pose (big near-top flower, sunk a little)
// with no ride: used when someone comes back to the lotus from another
// section or page, so they land on the finished screen, not the idle one.
async function jumpToSettled() {
  try {
    await ready;
  } catch {
    return;
  }
  stopIdleLoop();
  poseStartAz = idleAngle;
  poseT = 1;
  applyPose(1);
  coreShiftFrac = CORE_SHIFT;
  applyCoreShift();
  render();
}

async function reset() {
  // Fire-and-forget from script.js's point of view (its own type says
  // `() => void`) — swallow a failed load here instead of leaving an
  // unhandled rejection, same reasoning as activate()'s caller.
  try {
    await ready;
  } catch {
    return;
  }
  // Already idle (the common case when a section is opened before the
  // sequence ever played): nothing to undo — just make sure the idle
  // spin is running, once.
  if (poseT === 0 && coreShiftFrac === 0) {
    startIdleLoop();
    return;
  }
  stopIdleLoop();
  if (prefersReducedMotion) {
    poseT = 0;
    coreShiftFrac = 0;
    applyPose(0);
    applyCoreShift();
    render();
    startIdleLoop();
    return;
  }
  const fromPose = poseT;
  const fromShift = coreShiftFrac;
  await tween(900, (t) => {
    poseT = THREE.MathUtils.lerp(fromPose, 0, t);
    applyPose(poseT);
    coreShiftFrac = THREE.MathUtils.lerp(fromShift, 0, t);
    applyCoreShift();
    render();
  });
  poseT = 0;
  coreShiftFrac = 0;
  applyPose(0);
  applyCoreShift();
  startIdleLoop();
}

// Redraw at the right size — for when the landing screen is shown again
// after being hidden (a hidden canvas has no size, and a resize while it
// was hidden would otherwise be missed).
function refresh() {
  resizeRenderer();
  render();
}

/* -------------------------------------------------------------
   8. INIT — runs immediately; window.lotusScene exists right away
   even before the model has finished loading (activate()/reset() both
   just await `ready` internally).
   ------------------------------------------------------------- */
let ready;

function init() {
  if (!canvas) {
    // Still expose a no-op-ish API so script.js's optional calls don't
    // throw — script.js's own triggerLanding() has a same-tick fallback
    // for exactly this (no 3D scene) case.
    ready = Promise.reject(new Error("no #lotusCanvas on this page"));
    ready.catch(() => {});
    return;
  }

  try {
    initRenderer();
  } catch (error) {
    // WebGL unavailable — fall back to the static image + orbs layout.
    document.documentElement.classList.add("no-webgl");
    ready = Promise.reject(error);
    ready.catch(() => {});
    return;
  }

  buildScene();

  // Nothing to begin until the model is in — the hint shows download
  // progress meanwhile (see loadLotusModel) and the canvas ignores taps.
  if (landingStageEl) landingStageEl.classList.add("is-loading");
  if (hintEl) hintEl.textContent = LANDING_ES ? "Cargando…" : "Loading…";

  ready = loadLotusModel()
    .then((loaded) => {
      model = loaded;
      scene.add(model);
      frameCameraToModel();
      startIdleLoop();
      if (hintEl) hintEl.textContent = LANDING_ES ? (isTouch ? "Toca para empezar" : "Haz clic para empezar") : (isTouch ? "Tap to begin" : "Click to begin");
      if (landingStageEl) landingStageEl.classList.remove("is-loading");
    })
    .catch((error) => {
      console.error("Lotus model failed to load:", error);
      document.documentElement.classList.add("no-webgl"); // reuse the same fallback styling
      if (landingStageEl) landingStageEl.classList.remove("is-loading");
      throw error;
    });
}

init();

window.lotusScene = { ready, activate, settle, reset, refresh, coreOffsetY, jumpToSettled };
// `ready` above is captured before the async chain settles is fine —
// callers await window.lotusScene.ready directly; re-assign so it's
// always the live promise rather than whatever it was at this exact line.
Object.defineProperty(window.lotusScene, "ready", { get: () => ready });

})();
