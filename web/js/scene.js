import * as THREE from "three";
import { OrbitControls } from "../vendor/OrbitControls.js";

const EARTH_R = 1.6;
const MOON_R = 1.05;
const MARS_R = 1.22;
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TEX = new URL("../../assets/textures/", import.meta.url);

function latLonToVector3(lat, lon, radius) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
}

function loadTex(name, colorSpace = THREE.SRGBColorSpace) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      new URL(name, TEX).href,
      (t) => {
        t.colorSpace = colorSpace;
        t.anisotropy = 8;
        resolve(t);
      },
      undefined,
      reject
    );
  });
}

function makeGlow(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(200,220,255,0.65)");
  grd.addColorStop(0.55, "rgba(120,160,255,0.2)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft atmospheric shell */
function atmosphere(radius, color, intensity = 0.18) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: intensity,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
}

/** Build a detailed lunar-module / probe style lander */
function createLander(goldAccent = false) {
  const g = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({
    color: goldAccent ? 0xcfc4a8 : 0xb8b0a4,
    metalness: 0.35,
    roughness: 0.72,
  });
  const foil = new THREE.MeshStandardMaterial({
    color: goldAccent ? 0xc9a84a : 0x8a929c,
    metalness: 0.78,
    roughness: 0.38,
    emissive: goldAccent ? 0x2a1c04 : 0x080a0c,
    emissiveIntensity: 0.12,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.55, roughness: 0.55 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, metalness: 0.3, roughness: 0.75 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.028, 8), hull);
  base.position.y = 0.024;
  g.add(base);

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.07, 0.008, 8), foil);
  deck.position.y = 0.008;
  g.add(deck);

  const ascent = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.036, 8), hull);
  ascent.position.y = 0.055;
  g.add(ascent);

  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, 0.006), dark);
  hatch.position.set(0, 0.055, 0.036);
  g.add(hatch);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.024, 0.003), foil);
    panel.position.set(Math.cos(ang) * 0.048, 0.032, Math.sin(ang) * 0.048);
    panel.lookAt(0, 0.032, 0);
    g.add(panel);
  }

  const legMat = new THREE.MeshStandardMaterial({ color: 0x6a727a, metalness: 0.65, roughness: 0.45 });
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cx = Math.cos(ang);
    const sz = Math.sin(ang);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.04, 6), legMat);
    upper.position.set(cx * 0.04, 0.035, sz * 0.04);
    upper.rotation.z = cx * 0.55;
    upper.rotation.x = sz * 0.55;
    g.add(upper);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.0045, 0.038, 6), legMat);
    lower.position.set(cx * 0.055, 0.016, sz * 0.055);
    lower.rotation.z = cx * 0.35;
    lower.rotation.x = sz * 0.35;
    g.add(lower);

    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.0035, 0.036), dark);
    strut.position.set(cx * 0.03, 0.028, sz * 0.03);
    strut.lookAt(cx * 0.06, 0.008, sz * 0.06);
    g.add(strut);

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.005, 10), black);
    pad.position.set(cx * 0.07, 0.0025, sz * 0.07);
    g.add(pad);
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.04, 6), dark);
  mast.position.set(-0.02, 0.085, 0.01);
  g.add(mast);
  const dish = new THREE.Mesh(new THREE.CircleGeometry(0.016, 16), foil);
  dish.position.set(-0.02, 0.105, 0.01);
  dish.rotation.x = -0.9;
  g.add(dish);

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.014, 10), dark);
  nozzle.position.y = -0.002;
  g.add(nozzle);

  // Tiny status LED — subtle, not neon
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.004, 10, 10),
    new THREE.MeshStandardMaterial({
      color: goldAccent ? 0xd4a84a : 0x5ab8c8,
      emissive: goldAccent ? 0xa87820 : 0x2a7080,
      emissiveIntensity: 0.45,
    })
  );
  beacon.position.y = 0.098;
  g.add(beacon);
  g.userData.beacon = beacon;
  return g;
}

/** Rover-style hardware for Mars */
function createRover(accentWarm = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: accentWarm ? 0xb85a2e : 0xa89880,
    metalness: 0.28,
    roughness: 0.68,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x262a30, metalness: 0.4, roughness: 0.6 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.048), bodyMat);
  chassis.position.y = 0.03;
  g.add(chassis);

  const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.006, 0.01), dark);
  rocker.position.set(0, 0.018, 0.02);
  g.add(rocker);
  const rocker2 = rocker.clone();
  rocker2.position.z = -0.02;
  g.add(rocker2);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.048, 8), dark);
  mast.position.set(0.015, 0.056, 0);
  g.add(mast);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.014, 0.014), dark);
  head.position.set(0.015, 0.082, 0);
  g.add(head);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.006, 10),
    new THREE.MeshStandardMaterial({
      color: 0x101214,
      emissive: accentWarm ? 0x402010 : 0x1a3040,
      emissiveIntensity: 0.25,
      metalness: 0.85,
      roughness: 0.3,
    })
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.set(0.028, 0.082, 0);
  g.add(lens);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.005, 0.005), dark);
  arm.position.set(-0.04, 0.028, 0.02);
  arm.rotation.z = 0.35;
  g.add(arm);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.25, roughness: 0.78 });
  const cleat = new THREE.MeshStandardMaterial({ color: 0x343840, metalness: 0.3, roughness: 0.7 });
  for (const [x, z] of [
    [-0.028, 0.022],
    [0, 0.024],
    [0.028, 0.022],
    [-0.028, -0.022],
    [0, -0.024],
    [0.028, -0.022],
  ]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.012, z);
    g.add(w);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.0015, 6, 12), cleat);
    rim.rotation.y = Math.PI / 2;
    rim.position.copy(w.position);
    g.add(rim);
  }

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.003, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x1a2238,
      metalness: 0.7,
      roughness: 0.35,
      emissive: 0x081020,
      emissiveIntensity: 0.15,
    })
  );
  panel.position.set(0, 0.044, 0);
  g.add(panel);

  for (let i = -1; i <= 1; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.002, 0.004, 0.036),
      new THREE.MeshBasicMaterial({ color: 0x243858 })
    );
    line.position.set(i * 0.022, 0.046, 0);
    g.add(line);
  }

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.0035, 8, 8),
    new THREE.MeshStandardMaterial({
      color: accentWarm ? 0xc89040 : 0xc85830,
      emissive: accentWarm ? 0x805020 : 0x602818,
      emissiveIntensity: 0.4,
    })
  );
  beacon.position.set(-0.025, 0.05, 0);
  g.add(beacon);
  g.userData.beacon = beacon;
  return g;
}

function createSpacecraft() {
  const craft = new THREE.Group();

  const white = new THREE.MeshStandardMaterial({ color: 0xf0f4fa, metalness: 0.78, roughness: 0.22 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x222830, metalness: 0.85, roughness: 0.22 });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x6ae0ff,
    metalness: 0.65,
    roughness: 0.25,
    emissive: 0x1a5080,
    emissiveIntensity: 0.65,
  });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4aa2a, metalness: 0.9, roughness: 0.25 });
  const heat = new THREE.MeshStandardMaterial({ color: 0x4a3020, metalness: 0.4, roughness: 0.7 });

  // Command module
  const cm = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65), white);
  cm.rotation.z = -Math.PI / 2;
  cm.position.x = 0.2;
  craft.add(cm);

  const heatShield = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), heat);
  heatShield.rotation.y = Math.PI / 2;
  heatShield.position.x = 0.265;
  craft.add(heatShield);

  // Tunnel / docking
  const dock = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.04, 12), dark);
  dock.rotation.z = Math.PI / 2;
  dock.position.x = 0.12;
  craft.add(dock);

  // Service module body
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.072, 0.22, 16), white);
  sm.rotation.z = Math.PI / 2;
  sm.position.x = -0.04;
  craft.add(sm);

  // SM panel strips
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.002), dark);
    strip.position.set(-0.04, Math.cos(ang) * 0.07, Math.sin(ang) * 0.07);
    strip.lookAt(-0.04, 0, 0);
    craft.add(strip);
  }

  // Engine bell housing
  const bellHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.06, 14), dark);
  bellHousing.rotation.z = Math.PI / 2;
  bellHousing.position.x = -0.2;
  craft.add(bellHousing);

  // High-gain antenna
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), dark);
  boom.position.set(0.02, 0.1, 0);
  boom.rotation.z = 0.4;
  craft.add(boom);
  const dish = new THREE.Mesh(new THREE.CircleGeometry(0.042, 20), gold);
  dish.position.set(0.05, 0.13, 0);
  dish.rotation.x = -1.0;
  craft.add(dish);
  const dishBack = new THREE.Mesh(
    new THREE.CircleGeometry(0.042, 20),
    new THREE.MeshStandardMaterial({ color: 0x333840, metalness: 0.7, roughness: 0.4 })
  );
  dishBack.position.copy(dish.position);
  dishBack.position.y -= 0.002;
  dishBack.rotation.copy(dish.rotation);
  dishBack.rotateX(Math.PI);
  craft.add(dishBack);

  // Solar arrays — wider, with frames
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x0e1838,
    metalness: 0.95,
    roughness: 0.1,
    emissive: 0x0a2058,
    emissiveIntensity: 0.5,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xc8d0dc, metalness: 0.7, roughness: 0.3 });
  for (const z of [1, -1]) {
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.02), dark);
    hinge.position.set(-0.02, 0, z * 0.085);
    craft.add(hinge);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.006, 0.14), frameMat);
    frame.position.set(-0.02, 0, z * 0.175);
    craft.add(frame);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.004, 0.12), panelMat);
    panel.position.set(-0.02, 0.004, z * 0.175);
    craft.add(panel);

    for (let i = -2; i <= 2; i++) {
      const cell = new THREE.Mesh(
        new THREE.BoxGeometry(0.002, 0.005, 0.11),
        new THREE.MeshBasicMaterial({ color: 0x3a70b0 })
      );
      cell.position.set(-0.02 + i * 0.045, 0.007, z * 0.175);
      craft.add(cell);
    }
  }

  // RCS quads
  for (const [y, z] of [
    [0.055, 0.045],
    [-0.055, 0.045],
    [0.055, -0.045],
    [-0.055, -0.045],
  ]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 0.022), dark);
    pod.position.set(0.1, y, z);
    craft.add(pod);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.012, 6), accent);
    nozzle.rotation.y = Math.PI / 2;
    nozzle.position.set(0.12, y, z);
    craft.add(nozzle);
  }

  // Main engine nozzle + plume
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.048, 0.07, 14), dark);
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.x = -0.28;
  craft.add(nozzle);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.22, 14),
    new THREE.MeshBasicMaterial({
      color: 0x7af0ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  flame.rotation.z = Math.PI / 2;
  flame.position.x = -0.44;
  craft.add(flame);

  const flameCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.02, 0.14, 10),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  flameCore.rotation.z = Math.PI / 2;
  flameCore.position.x = -0.38;
  craft.add(flameCore);

  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.28, 12),
    new THREE.MeshBasicMaterial({
      color: 0x4080ff,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  flameOuter.rotation.z = Math.PI / 2;
  flameOuter.position.x = -0.5;
  craft.add(flameOuter);

  const trail = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlow(),
      color: 0x6ae0ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  trail.scale.set(1.2, 0.65, 1);
  trail.position.x = -0.7;
  craft.add(trail);

  craft.userData.flame = flame;
  craft.userData.flameCore = flameCore;
  craft.userData.flameOuter = flameOuter;
  craft.userData.trail = trail;
  craft.visible = false;
  craft.scale.setScalar(1.2);
  return craft;
}

function placeHardware(planetMesh, features, radius, kind) {
  const group = new THREE.Group();
  const pickables = [];

  for (const feature of features) {
    const p = feature.properties;
    const isHighlight =
      p.id === "apollo11-lm-descent" || p.id === "perseverance" || p.id === "curiosity";
    const model =
      kind === "moon" ? createLander(isHighlight) : createRover(isHighlight);

    const pos = latLonToVector3(p.lat, p.lon, radius * 1.002);
    model.position.copy(pos);

    // Orient upright on sphere + slight random yaw
    const normal = pos.clone().normalize();
    model.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    model.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);

    // Small surface-scale hardware (was ~3.5 — too huge / gamey)
    const baseScale = kind === "moon" ? (isHighlight ? 0.78 : 0.62) : (isHighlight ? 0.7 : 0.55);
    model.scale.setScalar(baseScale);

    model.traverse((ch) => {
      if (ch.isMesh) {
        ch.userData = { feature: p, kind: "asset" };
        pickables.push(ch);
      }
    });
    model.userData = { feature: p, kind: "asset" };
    pickables.push(model);

    // Soft beacon glow above site
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlow(),
        color: kind === "moon" ? (isHighlight ? 0xe0b85a : 0x7ab8c8) : 0xd46840,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.position.copy(pos.clone().multiplyScalar(1.018));
    glow.scale.setScalar(isHighlight ? 0.085 : 0.055);
    glow.userData = { feature: p, kind: "asset" };
    pickables.push(glow);

    // Ground ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.012, 0.016, 28),
      new THREE.MeshBasicMaterial({
        color: kind === "moon" ? 0x6aa8b8 : 0xc86840,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.position.copy(pos.clone().multiplyScalar(1.0008));
    ring.lookAt(0, 0, 0);
    ring.userData = { feature: p, kind: "asset" };
    pickables.push(ring);

    group.add(model, glow, ring);
  }

  planetMesh.add(group);
  group.visible = false;
  return { group, pickables };
}

function buildStarfield() {
  const group = new THREE.Group();
  const glow = makeGlow(64);

  // Dense distant stars
  const count = REDUCED ? 2000 : 6000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 80 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    const tint = Math.random();
    col[i * 3] = tint > 0.7 ? 1 : tint > 0.4 ? 0.75 : 0.85;
    col[i * 3 + 1] = tint > 0.7 ? 0.9 : 0.92;
    col[i * 3 + 2] = tint > 0.7 ? 0.75 : 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  group.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.16,
        map: glow,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        sizeAttenuation: true,
        opacity: 0.75,
      })
    )
  );

  // Bright foreground stars
  const bright = REDUCED ? 80 : 220;
  const bp = new Float32Array(bright * 3);
  for (let i = 0; i < bright; i++) {
    const r = 40 + Math.random() * 70;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    bp[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    bp[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    bp[i * 3 + 2] = r * Math.cos(phi);
  }
  const bgeo = new THREE.BufferGeometry();
  bgeo.setAttribute("position", new THREE.BufferAttribute(bp, 3));
  group.add(
    new THREE.Points(
      bgeo,
      new THREE.PointsMaterial({
        size: 0.55,
        map: glow,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0xffffff,
      })
    )
  );

  return group;
}

export async function createUniverse(canvas, { moonFeatures, marsFeatures, onAssetClick }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !REDUCED,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.0022);

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.05, 600);
  camera.position.set(0, 0.35, 5.6);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.048;
  controls.enablePan = false;
  controls.minDistance = 1.65;
  controls.maxDistance = 7;
  controls.enabled = false;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.85;

  // Lights — cinematic sun + rim on pure black
  scene.add(new THREE.AmbientLight(0x121825, 0.22));
  const sun = new THREE.DirectionalLight(0xfff5e6, 2.9);
  sun.position.set(8, 3.2, 5);
  scene.add(sun);
  const sunFill = new THREE.DirectionalLight(0x7080b0, 0.4);
  sunFill.position.set(-5, -1, -3);
  scene.add(sunFill);
  const rim = new THREE.PointLight(0x6ae0ff, 0.45, 90);
  rim.position.set(-6, 2, -5);
  scene.add(rim);
  const warm = new THREE.PointLight(0xff8a5c, 0.22, 100);
  warm.position.set(5, -2, -8);
  scene.add(warm);

  // Load textures
  const [earthDay, earthSpec, earthClouds, moonMap, marsMap, galaxyMap] = await Promise.all([
    loadTex("earth_day.jpg"),
    loadTex("earth_specular.jpg", THREE.NoColorSpace),
    loadTex("earth_clouds.jpg"),
    loadTex("moon.jpg"),
    loadTex("mars.jpg"),
    loadTex("galaxy.jpg"),
  ]);

  // Galaxy sky dome
  const galaxy = new THREE.Mesh(
    new THREE.SphereGeometry(280, 64, 48),
    new THREE.MeshBasicMaterial({
      map: galaxyMap,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      transparent: true,
      opacity: 0.55,
      color: new THREE.Color(0x6a7a90),
    })
  );
  scene.add(galaxy);

  const stars = buildStarfield();
  scene.add(stars);

  // Soft dark nebulae (keep black-space feel)
  const nebulae = new THREE.Group();
  const glowMap = makeGlow(128);
  [
    [0x3a2a60, 0.07, [-30, 8, -50], 42],
    [0x1a4060, 0.06, [34, -10, -60], 48],
    [0x402818, 0.04, [6, 14, -70], 50],
    [0x203050, 0.05, [-18, -12, -45], 32],
  ].forEach(([col, op, pos, sc]) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowMap,
        color: col,
        transparent: true,
        opacity: op,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    s.position.set(...pos);
    s.scale.setScalar(sc);
    nebulae.add(s);
  });
  scene.add(nebulae);

  // —— Earth ——
  const earthGroup = new THREE.Group();
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R, 96, 96),
    new THREE.MeshPhongMaterial({
      map: earthDay,
      specularMap: earthSpec,
      specular: new THREE.Color(0x444444),
      shininess: 22,
      bumpMap: earthDay,
      bumpScale: 0.012,
    })
  );
  earthGroup.add(earth);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.015, 64, 64),
    new THREE.MeshPhongMaterial({
      map: earthClouds,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  earthGroup.add(clouds);
  earthGroup.add(atmosphere(EARTH_R * 1.07, 0x6ab0ff, 0.2));
  // Fresnel-ish inner atmosphere
  earthGroup.add(atmosphere(EARTH_R * 1.03, 0xa8d8ff, 0.08));
  scene.add(earthGroup);

  // —— Moon ——
  const moonGroup = new THREE.Group();
  moonGroup.position.set(24, 2.0, -9);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(MOON_R, 80, 80),
    new THREE.MeshStandardMaterial({
      map: moonMap,
      roughness: 0.92,
      metalness: 0.03,
      bumpMap: moonMap,
      bumpScale: 0.028,
    })
  );
  moonGroup.add(moon);
  moonGroup.add(atmosphere(MOON_R * 1.04, 0xc8d0e0, 0.05));
  scene.add(moonGroup);
  const moonAssets = placeHardware(moon, moonFeatures, MOON_R, "moon");

  // —— Mars ——
  const marsGroup = new THREE.Group();
  marsGroup.position.set(46, -1.2, -16);
  const mars = new THREE.Mesh(
    new THREE.SphereGeometry(MARS_R, 80, 80),
    new THREE.MeshStandardMaterial({
      map: marsMap,
      roughness: 0.88,
      metalness: 0.05,
      bumpMap: marsMap,
      bumpScale: 0.024,
    })
  );
  marsGroup.add(mars);
  marsGroup.add(atmosphere(MARS_R * 1.05, 0xff7a4a, 0.12));
  scene.add(marsGroup);
  const marsAssets = placeHardware(mars, marsFeatures, MARS_R, "mars");

  const craft = createSpacecraft();
  scene.add(craft);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clock = new THREE.Clock();

  let mode = "earth";
  let fly = null;
  let onFlyDone = null;

  const homePos = {
    moon: new THREE.Vector3(24, 2.0, -9),
    mars: new THREE.Vector3(46, -1.2, -16),
  };

  function resize() {
    const parent = canvas.parentElement || canvas;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", resize);
  // Observe TV screen size changes
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => resize()).observe(canvas.parentElement || canvas);
  }

  function resetBodiesHome() {
    earthGroup.visible = true;
    earthGroup.position.set(0, 0, 0);
    earthGroup.scale.setScalar(1);
    moonGroup.position.copy(homePos.moon);
    marsGroup.position.copy(homePos.mars);
    moonAssets.group.visible = false;
    marsAssets.group.visible = false;
  }

  function setEarthView() {
    mode = "earth";
    fly = null;
    craft.visible = false;
    controls.enabled = false;
    controls.autoRotate = false;
    resetBodiesHome();
    camera.fov = 40;
    camera.updateProjectionMatrix();
    camera.position.set(0, 0.35, 5.6);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    scene.fog.density = 0.0022;
    controls.update();
  }

  function enterOrbit(dest) {
    mode = dest;
    craft.visible = false;
    earthGroup.visible = false;
    moonGroup.position.set(0, 0, 0);
    marsGroup.position.set(0, 0, 0);

    // Cinematic low-drone framing
    camera.fov = 38;
    camera.updateProjectionMatrix();
    scene.fog.density = 0.012;

    if (dest === "moon") {
      marsGroup.position.copy(homePos.mars);
      moonAssets.group.visible = true;
      marsAssets.group.visible = false;
      camera.position.set(1.1, 0.85, 2.55);
      controls.minDistance = 1.55;
      controls.maxDistance = 4.8;
      controls.target.set(0, 0.05, 0);
    } else {
      moonGroup.position.copy(homePos.moon);
      marsAssets.group.visible = true;
      moonAssets.group.visible = false;
      camera.position.set(1.25, 0.95, 2.75);
      controls.minDistance = 1.7;
      controls.maxDistance = 5.2;
      controls.target.set(0, 0.08, 0);
    }

    controls.enabled = true;
    controls.autoRotate = !REDUCED;
    controls.autoRotateSpeed = dest === "mars" ? 0.35 : 0.42;
    controls.update();
  }

  function beginFlight(from, to, done) {
    if (mode === "flying") return;
    mode = "flying";
    onFlyDone = done;
    controls.enabled = false;
    controls.autoRotate = false;
    moonAssets.group.visible = false;
    marsAssets.group.visible = false;
    craft.visible = true;
    scene.fog.density = 0.002;
    camera.fov = 48;
    camera.updateProjectionMatrix();

    if (to === "earth") {
      resetBodiesHome();
      earthGroup.visible = true;
      if (from === "moon") moonGroup.position.set(7, 1, -3.5);
      if (from === "mars") marsGroup.position.set(9, -0.4, -4.5);
      fly = {
        t: 0,
        duration: REDUCED ? 0.4 : 2.6,
        from,
        to: "earth",
        startCam: camera.position.clone(),
        endCam: new THREE.Vector3(0, 0.35, 5.6),
        mid: new THREE.Vector3(3.5, 1.4, 3.5),
        returnHome: true,
        startMoon: moonGroup.position.clone(),
        startMars: marsGroup.position.clone(),
      };
      craft.position.copy(camera.position);
      return;
    }

    earthGroup.visible = from === "earth";
    earthGroup.position.set(0, 0, 0);
    earthGroup.scale.setScalar(1);

    if (from === "earth") {
      moonGroup.position.copy(homePos.moon);
      marsGroup.position.copy(homePos.mars);
    } else if (from === "moon") {
      moonGroup.position.set(0, 0, 0);
      earthGroup.visible = false;
      marsGroup.position.set(20, -1, -7);
    } else if (from === "mars") {
      marsGroup.position.set(0, 0, 0);
      earthGroup.visible = false;
      moonGroup.position.set(-16, 2, -5);
    }

    const endCam =
      to === "mars" ? new THREE.Vector3(1.25, 0.95, 2.75) : new THREE.Vector3(1.1, 0.85, 2.55);
    const mid =
      to === "mars" ? new THREE.Vector3(11, 2.4, 9) : new THREE.Vector3(7.5, 1.6, 6.5);

    fly = {
      t: 0,
      duration: REDUCED ? 0.45 : to === "mars" && from === "earth" ? 4.2 : 3.4,
      from,
      to,
      startCam: camera.position.clone(),
      endCam,
      mid,
      moveMoon: to === "moon",
      moveMars: to === "mars",
      fromMoon: from === "moon",
      fromMars: from === "mars",
      hideEarthAt: to === "mars" ? 0.5 : 0.72,
      startMoon: moonGroup.position.clone(),
      startMars: marsGroup.position.clone(),
    };
    craft.position.copy(camera.position);
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (mode !== "moon" && mode !== "mars") return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const list = mode === "moon" ? moonAssets.pickables : marsAssets.pickables;
    const hits = raycaster.intersectObjects(list, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj && !obj.userData?.feature) obj = obj.parent;
      if (obj?.userData?.feature) {
        onAssetClick?.(obj.userData.feature);
        break;
      }
    }
  });

  controls.addEventListener("start", () => {
    controls.autoRotate = false;
  });
  controls.addEventListener("end", () => {
    if ((mode === "moon" || mode === "mars") && !REDUCED) controls.autoRotate = true;
  });

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    galaxy.rotation.y += dt * 0.003;
    stars.rotation.y += dt * 0.006;
    nebulae.rotation.y -= dt * 0.004;

    if (mode === "earth") {
      earth.rotation.y += dt * 0.045;
      clouds.rotation.y += dt * 0.06;
      moon.rotation.y += dt * 0.03;
      mars.rotation.y += dt * 0.04;
      moonGroup.position.x = homePos.moon.x + Math.sin(t * 0.07) * 0.3;
      marsGroup.position.y = homePos.mars.y + Math.cos(t * 0.05) * 0.22;
      if (!REDUCED) {
        camera.position.x = Math.sin(t * 0.1) * 0.16;
        camera.position.y = 0.35 + Math.sin(t * 0.15) * 0.05;
        camera.lookAt(0, 0, 0);
      }
    }

    if (mode === "flying" && fly) {
      fly.t += dt / fly.duration;
      const u = Math.min(fly.t, 1);
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

      const a = fly.startCam.clone().lerp(fly.mid, e);
      const b = fly.mid.clone().lerp(fly.endCam, e);
      camera.position.lerpVectors(a, b, e);

      if (fly.returnHome) {
        moonGroup.position.lerpVectors(fly.startMoon, homePos.moon, e);
        marsGroup.position.lerpVectors(fly.startMars, homePos.mars, e);
        earthGroup.scale.setScalar(0.75 + e * 0.25);
        camera.lookAt(0, 0, 0);
      } else {
        if (fly.moveMoon) {
          moonGroup.position.lerpVectors(fly.startMoon, new THREE.Vector3(0, 0, 0), e);
          camera.lookAt(moonGroup.position);
        }
        if (fly.moveMars) {
          const start = fly.fromMoon || fly.fromMars ? fly.startMars : homePos.mars;
          marsGroup.position.lerpVectors(start, new THREE.Vector3(0, 0, 0), e);
          camera.lookAt(marsGroup.position);
        }
        if (fly.fromMoon && fly.to === "mars") {
          moonGroup.position.lerpVectors(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-18, 2, -7), e);
        }
        if (fly.fromMars && fly.to === "moon") {
          marsGroup.position.lerpVectors(new THREE.Vector3(0, 0, 0), new THREE.Vector3(20, -1, -7), e);
        }
        if (fly.from === "earth") {
          earthGroup.position.lerpVectors(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-15, -1, 4), e);
          earthGroup.scale.setScalar(1 - e * 0.42);
          if (e > fly.hideEarthAt) earthGroup.visible = false;
        }
      }

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      craft.position.copy(camera.position).addScaledVector(forward, 1.55);
      craft.lookAt(camera.position.clone().addScaledVector(forward, 10));
      craft.rotateY(Math.PI);
      craft.rotateZ(Math.sin(t * 6) * 0.06);
      const flicker = 0.55 + Math.sin(t * 40) * 0.3;
      craft.userData.flame.material.opacity = flicker;
      craft.userData.flameCore.material.opacity = 0.7 + Math.sin(t * 50) * 0.25;
      if (craft.userData.flameOuter) {
        craft.userData.flameOuter.material.opacity = 0.18 + Math.sin(t * 22) * 0.08;
      }
      craft.userData.trail.material.opacity = 0.4 + e * 0.45;
      craft.userData.trail.scale.set(1.0 + e * 0.9, 0.5 + e * 0.45, 1);

      stars.rotation.y += dt * (0.6 + e * 1.8);
      galaxy.rotation.y += dt * 0.15;
      earth.rotation.y += dt * 0.15;
      moon.rotation.y += dt * 0.2;
      mars.rotation.y += dt * 0.18;

      if (u >= 1) {
        craft.visible = false;
        camera.fov = 38;
        camera.updateProjectionMatrix();
        if (fly.to === "earth") setEarthView();
        else enterOrbit(fly.to);
        onFlyDone?.(fly.to);
        onFlyDone = null;
        fly = null;
      }
    }

    if (mode === "moon" || mode === "mars") {
      const assets = mode === "moon" ? moonAssets.group : marsAssets.group;
      assets.children.forEach((ch) => {
        if (ch.userData?.beacon) {
          ch.userData.beacon.material.emissiveIntensity = 0.35 + Math.sin(t * 1.6) * 0.12;
        }
        if (ch.isSprite) {
          ch.material.opacity = 0.22 + Math.sin(t * 1.4 + ch.id) * 0.08;
        }
      });
      if (mode === "moon") moon.rotation.y += dt * 0.012;
      else mars.rotation.y += dt * 0.015;
      controls.update();
    }

    renderer.render(scene, camera);
  }

  function resetZoom() {
    if (mode === "moon") {
      camera.position.set(1.1, 0.85, 2.55);
      controls.target.set(0, 0.05, 0);
    } else if (mode === "mars") {
      camera.position.set(1.25, 0.95, 2.75);
      controls.target.set(0, 0.08, 0);
    } else {
      camera.position.set(0, 0.35, 5.6);
      controls.target.set(0, 0, 0);
    }
    if (mode === "earth") camera.lookAt(0, 0, 0);
    controls.update();
    return getZoomLevel();
  }

  function getZoomLevel() {
    const dist = camera.position.distanceTo(controls.target);
    const ref = mode === "earth" ? 5.6 : (controls.minDistance + controls.maxDistance) / 2;
    return Math.max(0.4, Math.min(3.5, ref / Math.max(dist, 0.01)));
  }

  function zoomBy(factor) {
    const offset = camera.position.clone().sub(controls.target);
    if (offset.lengthSq() < 1e-6) offset.set(0, 0.35, 5.6);
    const minD = mode === "earth" ? 2.8 : controls.minDistance + 0.02;
    const maxD = mode === "earth" ? 9.5 : controls.maxDistance - 0.02;
    const next = THREE.MathUtils.clamp(offset.length() * factor, minD, maxD);
    offset.setLength(next);
    camera.position.copy(controls.target).add(offset);
    if (mode === "earth") camera.lookAt(controls.target);
    else controls.update();
    return getZoomLevel();
  }

  setEarthView();
  resize();
  animate();

  return {
    beginFlight,
    returnToEarth: () => beginFlight(mode === "flying" ? "earth" : mode, "earth"),
    getMode: () => mode,
    setEarthView,
    zoomIn: () => zoomBy(0.82),
    zoomOut: () => zoomBy(1.22),
    resetZoom,
    getZoomLevel,
  };
}
