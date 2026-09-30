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
       reset,     // () => void — tweens back to the idle side view
     };

   script.js job 5 calls these three and nothing else — it doesn't
   know or care whether the model is a .glb or a raw .obj+textures.

   PROGRESSIVE ENHANCEMENT: if this script never runs (module loading
   blocked, WebGL unsupported, the CDN unreachable), #lotusCanvas just
   sits there empty. Nothing else on the page depends on it loading —
   the orb/section navigation in script.js guards every call to
   window.lotusScene with `?.` and a same-tick fallback, and on phones
   (≤900px) this file's canvas is hidden by CSS and a static image
   takes its place instead (see .lotus-still in styles.css).
   ============================================================= */

import * as THREE from "three";

const canvas = document.getElementById("lotusCanvas");

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
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

let tweenToken = 0;
function tween(durationMs, onUpdate) {
  return new Promise((resolve) => {
    const token = ++tweenToken;
    const start = performance.now();
    const step = (now) => {
      if (token !== tweenToken) return; // superseded by a newer tween — stop silently
      const t = Math.min((now - start) / durationMs, 1);
      onUpdate(easeInOutCubic(t));
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

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);
}

function resizeRenderer() {
  if (!renderer || !canvas) return;
  const { clientWidth, clientHeight } = canvas;
  if (!clientWidth || !clientHeight) return;
  renderer.setSize(clientWidth, clientHeight, false);
  if (camera) {
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }
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
  // export, without needing to hand-tune per material.
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8747f8, 0.9); // --color-violet, ties the lighting to the site's palette
  rim.position.set(-3, 1, -2);
  scene.add(rim);
}

/* -------------------------------------------------------------
   4. LOADING — branches on MODEL_CONFIG.type; everything past this
   function works with a plain THREE.Object3D regardless of format.
   ------------------------------------------------------------- */
async function loadLotusModel() {
  if (MODEL_CONFIG.type === "glb") {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().loadAsync(MODEL_CONFIG.glb.url);
    return gltf.scene;
  }

  const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
  const obj = await new OBJLoader().loadAsync(MODEL_CONFIG.obj.url);
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
const IDLE_DIST_FACTOR = 2.4;
const END_DIST_FACTOR = 1.5;

function setCamera(polar, azimuth, distFactor) {
  const dist = modelRadius * distFactor;
  camera.position.setFromSphericalCoords(dist, polar, azimuth).add(modelCenter);
  camera.lookAt(modelCenter);
}

function frameCameraToModel() {
  const box = new THREE.Box3().setFromObject(model);
  box.getCenter(modelCenter);
  model.position.sub(modelCenter); // recentre the geometry itself to the world origin
  modelCenter.set(0, 0, 0);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  modelRadius = Math.max(sphere.radius, 0.01);
  setCamera(IDLE_POLAR, idleAngle, IDLE_DIST_FACTOR);
}

/* -------------------------------------------------------------
   6. IDLE LOOP — slow auto-rotation so the flower never reads as a
   frozen image while waiting to be clicked. Cancellable so activate()
   can take over cleanly instead of fighting it.
   ------------------------------------------------------------- */
function startIdleLoop() {
  if (prefersReducedMotion) {
    render();
    return;
  }
  const step = () => {
    idleAngle += 0.0025; // ~1 full turn every ~42s
    setCamera(IDLE_POLAR, idleAngle, IDLE_DIST_FACTOR);
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
   7. ACTIVATE / RESET — the two authored camera paths.
   ------------------------------------------------------------- */
async function activate() {
  await ready;
  stopIdleLoop();

  if (prefersReducedMotion) {
    // Skip the ride, not the destination — jump straight to the end
    // framing with a brief cross-fade instead of the full camera tween.
    model.rotation.y = THREE.MathUtils.degToRad(50);
    setCamera(END_POLAR, idleAngle + END_AZIMUTH_SWEEP, END_DIST_FACTOR);
    render();
    await tween(150, () => render());
    return;
  }

  // Phase A — anticipation: a small scale pulse, a tactile "acknowledged".
  await tween(250, (t) => {
    const s = 1 + Math.sin(t * Math.PI) * 0.04;
    model.scale.setScalar(s);
    render();
  });
  model.scale.setScalar(1);

  // Phase B — zoom + rotate: camera orbits in toward a near-top view
  // while the flower spins on its own Y axis — the two together are
  // what reads as "the flower turns on its own axis as the camera
  // closes in", not just a push-in.
  const startAzimuth = idleAngle;
  await tween(1800, (t) => {
    const polar = THREE.MathUtils.lerp(IDLE_POLAR, END_POLAR, t);
    const azimuth = THREE.MathUtils.lerp(startAzimuth, startAzimuth + END_AZIMUTH_SWEEP, t);
    setCamera(polar, azimuth, THREE.MathUtils.lerp(IDLE_DIST_FACTOR, END_DIST_FACTOR, t));
    model.rotation.y = THREE.MathUtils.lerp(0, THREE.MathUtils.degToRad(50), t);
    render();
  });
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
  if (prefersReducedMotion) {
    model.rotation.y = 0;
    setCamera(IDLE_POLAR, idleAngle, IDLE_DIST_FACTOR);
    render();
    startIdleLoop();
    return;
  }
  const fromPolar = END_POLAR;
  const fromAzimuth = idleAngle + END_AZIMUTH_SWEEP;
  const fromRotationY = model.rotation.y;
  await tween(700, (t) => {
    setCamera(
      THREE.MathUtils.lerp(fromPolar, IDLE_POLAR, t),
      THREE.MathUtils.lerp(fromAzimuth, idleAngle, t),
      THREE.MathUtils.lerp(END_DIST_FACTOR, IDLE_DIST_FACTOR, t)
    );
    model.rotation.y = THREE.MathUtils.lerp(fromRotationY, 0, t);
    render();
  });
  model.rotation.y = 0;
  startIdleLoop();
}

/* -------------------------------------------------------------
   8. INIT — runs immediately; window.lotusScene exists right away
   even before the model has finished loading (activate()/reset() both
   just await `ready` internally).
   ------------------------------------------------------------- */
let ready;

function init() {
  // Mobile never shows the 3D scene (see the max-width:900px rule in
  // styles.css) — skip downloading a multi-megabyte model there
  // entirely rather than fetching it just to hide it. Checked once at
  // load, same as how the rest of the site's desktop/mobile split
  // already works (not re-checked on resize).
  const isMobile = window.matchMedia("(max-width: 900px)").matches;

  if (!canvas || isMobile) {
    // Still expose a no-op-ish API so script.js's optional calls don't
    // throw — script.js's own triggerLanding() has a same-tick fallback
    // for exactly this (no 3D scene) case.
    ready = Promise.reject(new Error(isMobile ? "mobile — 3D scene skipped" : "no #lotusCanvas on this page"));
    ready.catch(() => {});
    return;
  }

  try {
    initRenderer();
  } catch (error) {
    // WebGL unavailable — fall back the same way the mobile layout
    // does, regardless of screen size.
    document.documentElement.classList.add("no-webgl");
    ready = Promise.reject(error);
    ready.catch(() => {});
    return;
  }

  buildScene();

  ready = loadLotusModel()
    .then((loaded) => {
      model = loaded;
      scene.add(model);
      frameCameraToModel();
      startIdleLoop();
    })
    .catch((error) => {
      console.error("Lotus model failed to load:", error);
      document.documentElement.classList.add("no-webgl"); // reuse the same fallback styling
      throw error;
    });
}

init();

window.lotusScene = { ready, activate, reset };
// `ready` above is captured before the async chain settles is fine —
// callers await window.lotusScene.ready directly; re-assign so it's
// always the live promise rather than whatever it was at this exact line.
Object.defineProperty(window.lotusScene, "ready", { get: () => ready });
