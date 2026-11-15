// Character figures and first-person viewmodels. Figures are jointed builds on
// named proportion constants (1.82 m overall) — silhouette and team placement
// first. The same proportions define the hitboxes: head box above the torso.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { TEX } from './textures.js';

const mat = (colour, rough = 0.82) => new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: 0.05, envMapIntensity: 0.35 });
const box = (w, h, d, colour, x, y, z, rough) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(colour, rough));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};
const gunmetal = () => new THREE.MeshStandardMaterial({
  map: TEX.brass?.map ?? null, roughnessMap: TEX.brass?.rough ?? null,
  color: PALETTE.petrol, roughness: 1, metalness: 0.72, envMapIntensity: 0.6,
});
const brassMat = () => new THREE.MeshStandardMaterial({
  map: TEX.brass?.map ?? null, roughnessMap: TEX.brass?.rough ?? null,
  color: PALETTE.brass, roughness: 0.62, metalness: 0.9, envMapIntensity: 1,
});

// Named proportions (metres). Hip at 0.94, shoulders at 1.50, crown at 1.82.
const P = { boot: 0.12, thigh: 0.42, shin: 0.40, torsoH: 0.56, torsoW: 0.46, torsoD: 0.28, shoulderW: 0.62, headH: 0.26 };
const TEAM_LOOK = {
  siphon: { coat: PALETTE.petrol, limb: PALETTE.petrolLight, plate: PALETTE.coral, shell: PALETTE.petrol, band: PALETTE.coral, pack: PALETTE.coralDark, visor: PALETTE.petrol },
  still: { coat: PALETTE.ivory, limb: PALETTE.plumLight, plate: PALETTE.plum, shell: PALETTE.plum, band: PALETTE.brass, pack: PALETTE.plum, visor: PALETTE.plum },
};

export function createFigure(team) {
  const L = TEAM_LOOK[team];
  const g = new THREE.Group();
  const leg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(0.11 * side, P.boot + P.thigh + P.shin, 0);
    const thigh = box(0.17, P.thigh, 0.19, L.limb, 0, -P.thigh / 2, 0);
    const knee = new THREE.Group(); knee.position.y = -P.thigh;
    const shin = box(0.15, P.shin, 0.17, L.limb, 0, -P.shin / 2, 0);
    const boot = box(0.16, P.boot, 0.27, PALETTE.petrol, 0, -P.shin + P.boot / 2, -0.04);
    knee.add(shin, boot); hip.add(thigh, knee); g.add(hip);
    return { hip, knee };
  };
  const legL = leg(-1), legR = leg(1);
  const upper = new THREE.Group();
  upper.position.y = P.boot + P.thigh + P.shin; // 0.94
  g.add(upper);
  const torso = box(P.torsoW, P.torsoH, P.torsoD, L.coat, 0, P.torsoH / 2, 0);
  const plate = box(0.36, 0.38, 0.05, L.plate, 0, 0.32, -0.155);
  const stripe = team === 'still'
    ? box(0.07, 0.30, 0.02, PALETTE.ivory, 0, 0.32, -0.185)
    : box(0.30, 0.07, 0.02, PALETTE.ivory, 0, 0.32, -0.185);
  const padL = box(0.16, 0.13, 0.30, L.plate, -0.23, 0.50, 0);
  const padR = box(0.16, 0.13, 0.30, L.plate, 0.23, 0.50, 0);
  const pack = box(0.34, 0.40, 0.15, L.pack, 0, 0.30, 0.215);
  const strapL = box(0.07, 0.44, 0.02, PALETTE.petrol, -0.13, 0.32, -0.15);
  const strapR = box(0.07, 0.44, 0.02, PALETTE.petrol, 0.13, 0.32, -0.15);
  const pouch = box(0.34, 0.11, 0.05, PALETTE.petrol, 0, 0.08, -0.155);
  upper.add(torso, plate, stripe, padL, padR, pack, strapL, strapR, pouch);
  // Head: skull, team helmet shell with brim, ivory face plane, visor slit.
  const headG = new THREE.Group();
  headG.position.y = P.torsoH + 0.06;
  upper.add(headG);
  const skull = box(0.24, 0.22, 0.25, PALETTE.ivory, 0, 0.13, 0);
  const shell = box(0.28, 0.13, 0.30, L.shell, 0, 0.235, 0);
  const brim = box(0.28, 0.03, 0.12, L.shell, 0, 0.175, -0.19);
  const band = box(0.29, 0.05, 0.31, L.band, 0, 0.175, 0);
  const visor = box(0.17, 0.045, 0.02, L.visor, 0, 0.15, -0.135);
  visor.material = new THREE.MeshStandardMaterial({ color: L.visor, roughness: 0.35, metalness: 0.2, emissive: team === 'still' ? PALETTE.brass : 0x000000, emissiveIntensity: 0.7, envMapIntensity: 0.5 });
  headG.add(skull, shell, brim, band, visor);
  // Arms jointed at shoulder and elbow, posed onto the gun.
  const arm = (side, reach) => {
    const sh = new THREE.Group();
    sh.position.set(0.285 * side, 0.47, 0);
    const up = box(0.14, 0.30, 0.15, L.limb, 0, -0.15, 0);
    const el = new THREE.Group(); el.position.y = -0.30;
    const fore = box(0.12, 0.27, 0.13, L.limb, 0, -0.135, 0);
    const hand = box(0.10, 0.09, 0.10, PALETTE.petrol, 0, -0.29, 0);
    el.add(fore, hand); sh.add(up, el); upper.add(sh);
    sh.rotation.x = reach[0]; el.rotation.x = reach[1];
    return { sh, el };
  };
  arm(1, [-0.62, -0.85]); // trigger arm
  arm(-1, [-0.95, -0.55]); // support arm, further forward
  // The bot's own gun: the world build of its weapon class, swapped by setGun.
  const gunAnchor = new THREE.Group();
  gunAnchor.position.set(0.14, 0.30, -0.18);
  gunAnchor.scale.setScalar(0.78);
  upper.add(gunAnchor);
  let gunId = null;
  const setGun = (id) => {
    if (id === gunId) return;
    gunId = id;
    while (gunAnchor.children.length) gunAnchor.remove(gunAnchor.children[0]);
    const built = buildGun(id, false).group;
    built.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    gunAnchor.add(built);
  };
  setGun('bastion5');
  return {
    group: g,
    setGun,
    // walk: leg swing phase; crouch: 0..1 compression; dead: 0..1 fall to the floor.
    pose(walk, crouch, dead, time) {
      const swing = Math.sin(walk) * 0.5;
      legL.hip.rotation.x = swing - crouch * 0.75;
      legR.hip.rotation.x = -swing - crouch * 0.55;
      legL.knee.rotation.x = Math.max(0, -swing) * 0.8 + crouch * 1.0;
      legR.knee.rotation.x = Math.max(0, swing) * 0.8 + crouch * 0.85;
      upper.position.y = P.boot + P.thigh + P.shin - crouch * 0.44;
      upper.rotation.x = crouch * 0.16;
      g.rotation.x = dead * -Math.PI / 2 * 0.92;
      g.position.y = (g.userData.groundY ?? 0) + dead * 0.25 + (dead ? 0 : Math.abs(Math.sin(walk)) * 0.03);
      g.traverse((o) => { if (o.material) o.material.transparent = dead > 0.9; });
      void time;
    },
  };
}

// Hitboxes in world space for an actor standing at pos (feet at groundY).
export function actorHitboxes(actor) {
  const gy = actor.groundY;
  const c = actor.crouch ? 0.5 : 0;
  return {
    head: { x: actor.pos.x, y: gy + 1.62 - c, z: actor.pos.z, hx: 0.17, hy: 0.18, hz: 0.17 },
    torso: { x: actor.pos.x, y: gy + 1.1 - c * 0.8, z: actor.pos.z, hx: 0.3, hy: 0.42, hz: 0.22 },
    legs: { x: actor.pos.x, y: gy + 0.4, z: actor.pos.z, hx: 0.26, hy: 0.4, hz: 0.2 },
  };
}

// Ray vs one AABB (center + half extents). Returns distance or Infinity.
export function rayAabb(ox, oy, oz, dx, dy, dz, b) {
  let tmin = 0;
  let tmax = Infinity;
  const axes = [
    [ox, dx, b.x - b.hx, b.x + b.hx],
    [oy, dy, b.y - b.hy, b.y + b.hy],
    [oz, dz, b.z - b.hz, b.z + b.hz],
  ];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return Infinity;
    } else {
      let t1 = (lo - o) / d;
      let t2 = (hi - o) / d;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}

// ---- Guns: extruded side profiles, one clean silhouette per class — angled
// stock, curved grip and magazine, segmented rail, perforated handguard, two-tone
// steel, brass/coral accents. Shape x runs toward the muzzle, y is up; one builder
// serves the detailed viewmodel and the plainer bot-held world gun.
function prof(pts, thick, m, bev = 0.004) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => {
    if (p.length > 2) s.quadraticCurveTo(p[0], p[1], p[2], p[3]);
    else if (i === 0) s.moveTo(p[0], p[1]);
    else s.lineTo(p[0], p[1]);
  });
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.006, thick - bev * 2), bevelEnabled: true,
    bevelThickness: bev, bevelSize: bev * 0.75, bevelSegments: 1, curveSegments: 8,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-thick / 2, 0, 0);
  return new THREE.Mesh(geo, m);
}

function buildGun(id, detail) {
  const g = new THREE.Group();
  const gm = gunmetal(), br = brassMat();
  const dark = mat(PALETTE.petrol, 0.58), ivory = mat(PALETTE.ivory, 0.55), coral = mat(PALETTE.coral, 0.55);
  const copper = mat(PALETTE.copper, 0.38);
  const worn = new THREE.MeshStandardMaterial({ map: TEX.brass?.map ?? null, color: 0x9c6b3f, roughness: 0.82, metalness: 0.12, envMapIntensity: 0.4 });
  const gripTex = new THREE.MeshStandardMaterial({ map: TEX.wood?.map ?? null, color: PALETTE.petrol, roughness: 0.9, metalness: 0.04, envMapIntensity: 0.25 });
  const lens = new THREE.MeshStandardMaterial({ color: PALETTE.coral, emissive: PALETTE.coral, emissiveIntensity: 0.85, roughness: 0.35 });
  const B = (w, h, d, m, x, y, z, rx = 0) => {
    const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    q.position.set(x, y, z); q.rotation.x = rx; g.add(q); return q;
  };
  const CY = (r, len, m, x, y, z, ax = 'z') => {
    const q = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), m);
    if (ax === 'z') q.rotation.x = Math.PI / 2; else if (ax === 'x') q.rotation.z = Math.PI / 2;
    q.position.set(x, y, z); g.add(q); return q;
  };
  const P = (pts, t, m) => { const q = prof(pts, t, m); g.add(q); return q; };
  // Segmented top rail between shape-x a..b (solid strip on world guns).
  const rail = (a, b, y, t) => {
    if (!detail) { B(t * 0.7, 0.014, b - a, dark, 0, y, -(a + b) / 2); return; }
    const n = Math.max(2, Math.round((b - a) / 0.045));
    for (let i = 0; i < n; i++) B(t * 0.62, 0.016, 0.024, dark, 0, y, -(a + (i + 0.5) * ((b - a) / n)));
  };
  // Perforation slots on both handguard cheeks.
  const slots = (a, b, y, t, n) => {
    if (!detail) return;
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) B(0.004, 0.02, 0.032, dark, s * (t / 2 + 0.001), y, -(a + (i + 0.5) * ((b - a) / n)));
  };
  const bead = (x, y) => { const q = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), br); q.position.set(0, y, -x); g.add(q); };
  let muzzle = 0.3;
  if (id === 'pip9') {
    // Long slide, raked stippled grip, brass window and base plate.
    P([[0, 0.078], [0.225, 0.078], [0.238, 0.058], [0.238, 0.02], [0.13, 0.014], [0.122, -0.014], [0.158, -0.05, 0.118, -0.056], [0.104, -0.148], [0.09, -0.16, 0.07, -0.16], [0.03, -0.164], [0.006, -0.1, 0, -0.04], [0, 0.02]], 0.05, gm);
    CY(0.014, 0.03, dark, 0, 0.047, -0.245);
    rail(0.03, 0.21, 0.085, 0.028);
    B(0.03, 0.02, 0.032, dark, 0, 0.09, -0.016);
    bead(0.222, 0.09);
    CY(0.006, 0.056, coral, 0, -0.004, -0.03, 'x');
    if (detail) {
      for (const s of [-1, 1]) {
        B(0.004, 0.016, 0.05, br, s * 0.026, 0.047, -0.13);
        B(0.004, 0.105, 0.052, gripTex, s * 0.026, -0.104, -0.064, -0.15);
      }
      B(0.012, 0.034, 0.01, dark, 0, -0.042, -0.128);
    }
    B(0.046, 0.012, 0.058, br, 0, -0.167, -0.052, -0.15);
    muzzle = 0.28;
  } else if (id === 'rill24') {
    // Profiled receiver, skeleton stock, red-dot, twin mags.
    P([[-0.03, 0.08], [0.40, 0.08], [0.46, 0.055], [0.575, 0.04], [0.585, 0.005], [0.56, -0.03], [0.40, -0.042], [0.05, -0.048], [-0.03, -0.02]], 0.068, gm);
    B(0.03, 0.018, 0.15, dark, 0, 0.042, 0.098);
    B(0.03, 0.018, 0.15, dark, 0, -0.024, 0.098);
    B(0.056, 0.132, 0.026, dark, 0, 0.009, 0.178);
    P([[0.10, -0.04], [0.145, -0.045], [0.135, -0.15], [0.095, -0.155], [0.082, -0.05]], 0.042, dark);
    P([[0.245, -0.04], [0.30, -0.04], [0.315, -0.09], [0.328, -0.155, 0.305, -0.195], [0.26, -0.19], [0.238, -0.11, 0.238, -0.045]], 0.046, gm);
    B(0.045, 0.11, 0.05, dark, 0, -0.088, -0.475);
    CY(0.015, 0.1, dark, 0, 0.012, -0.615);
    B(0.046, 0.046, 0.05, dark, 0, 0.012, -0.668);
    rail(0.0, 0.38, 0.087, 0.05);
    slots(0.44, 0.56, 0.005, 0.068, 4);
    B(0.03, 0.02, 0.05, dark, 0, 0.1, -0.22);
    CY(0.027, 0.075, dark, 0, 0.126, -0.22);
    CY(0.02, 0.006, lens, 0, 0.126, -0.181);
    if (detail) {
      for (let i = 0; i < 3; i++) {
        B(0.004, 0.018, 0.03, coral, 0.025, -0.09 - i * 0.036, -0.272 - i * 0.009);
        B(0.052, 0.012, 0.056, gm, 0, -0.052 - i * 0.034, -0.475);
      }
      B(0.05, 0.014, 0.03, br, 0, 0.072, 0.045);
    }
    muzzle = 0.7;
  } else if (id === 'knell8') {
    // Copper barrel, ribbed pump, worn stock, shell buttons.
    P([[-0.02, 0.062], [0.26, 0.062], [0.30, 0.028], [0.30, -0.02], [0.03, -0.048], [-0.02, -0.01]], 0.07, gm);
    P([[-0.315, -0.085], [-0.32, 0.045], [-0.21, 0.07, -0.09, 0.058], [0.0, 0.048], [0.0, -0.028], [-0.13, -0.042], [-0.23, -0.06, -0.315, -0.085]], 0.052, worn);
    B(0.058, 0.138, 0.02, dark, 0, -0.018, 0.324);
    CY(0.031, 0.62, copper, 0, 0.032, -0.36);
    CY(0.037, 0.035, copper, 0, 0.032, -0.685);
    CY(0.019, 0.44, dark, 0, -0.018, -0.32);
    CY(0.043, 0.17, mat(PALETTE.coralDark, 0.65), 0, -0.018, -0.40);
    rail(0.02, 0.2, 0.069, 0.04);
    bead(0.655, 0.072);
    if (detail) {
      for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.005, 6, 14), dark);
        ring.position.set(0, -0.018, -0.345 - i * 0.038); g.add(ring);
        B(0.004, 0.014, 0.02, i === 3 ? coral : br, 0.037, 0.012, -0.08 - i * 0.045);
      }
    }
    muzzle = 0.71;
  } else {
    // Bastion-5: full stock, vented handguard, aperture sight.
    P([[-0.02, 0.068], [0.30, 0.068], [0.615, 0.052], [0.65, 0.018], [0.65, -0.028], [0.30, -0.052], [0.0, -0.058], [-0.02, -0.02]], 0.064, gm);
    P([[-0.245, -0.06], [-0.25, 0.04], [-0.17, 0.068, -0.07, 0.062], [0.0, 0.055], [0.0, -0.015], [-0.11, -0.028], [-0.19, -0.045, -0.245, -0.06]], 0.05, dark);
    B(0.056, 0.112, 0.02, dark, 0, -0.008, 0.254);
    P([[0.015, -0.05], [0.055, -0.052], [0.048, -0.145], [0.008, -0.148], [-0.002, -0.06]], 0.04, dark);
    P([[0.155, -0.05], [0.205, -0.05], [0.222, -0.12], [0.232, -0.185, 0.205, -0.215], [0.16, -0.205], [0.148, -0.12, 0.148, -0.055]], 0.044, gm);
    CY(0.014, 0.26, dark, 0, 0.01, -0.76);
    B(0.042, 0.042, 0.085, gm, 0, 0.01, -0.885);
    rail(0.02, 0.30, 0.075, 0.045);
    slots(0.36, 0.58, 0.0, 0.064, 4);
    B(0.045, 0.04, 0.05, dark, 0, 0.094, -0.03);
    B(0.006, 0.045, 0.006, dark, 0, 0.082, -0.60);
    bead(0.60, 0.108);
    if (detail) {
      CY(0.024, 0.02, br, 0, 0.01, -0.665); CY(0.024, 0.02, br, 0, 0.01, -0.71);
      B(0.044, 0.01, 0.018, dark, 0, 0.01, -0.862); B(0.044, 0.01, 0.018, dark, 0, 0.01, -0.9);
      B(0.048, 0.01, 0.02, dark, 0, -0.112, -0.2, 0.35); B(0.048, 0.01, 0.02, dark, 0, -0.168, -0.222, 0.5);
      for (let i = 0; i < 2; i++) B(0.004, 0.02, 0.024, coral, 0.024, -0.082 - i * 0.05, -0.186 - i * 0.013);
      CY(0.007, 0.068, br, 0, 0.0, -0.08, 'x'); CY(0.007, 0.068, br, 0, -0.01, -0.24, 'x');
      CY(0.01, 0.03, br, 0.045, 0.03, -0.03, 'x');
      B(0.004, 0.03, 0.11, ivory, 0.027, 0.026, 0.16);
      for (let i = 0; i < 3; i++) B(0.03, 0.006, 0.05, dark, 0, 0.056, -0.42 - i * 0.08);
    }
    muzzle = 0.93;
  }
  return { group: g, muzzle };
}

// First-person viewmodel: the detailed build, sleeve, muzzle-flash plane.
export function createViewmodel(weaponId) {
  const built = buildGun(weaponId, true);
  const g = built.group;
  const sleeve = box(0.09, 0.09, 0.22, PALETTE.petrol, 0.02, -0.12, -0.28);
  g.add(sleeve);
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.34),
    new THREE.MeshBasicMaterial({ color: PALETTE.opal, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  flash.position.set(0, 0.03, -built.muzzle);
  g.add(flash);
  g.position.set(0.26, -0.22, -0.45);
  return { group: g, flash };
}

// The Pulse Leech: a brass tripod that opens on a regulator socket; its coral
// column drains as the fuse burns.
export function createDevice() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), brassMat());
  base.position.set(0, 0.06, 0); base.castShadow = true; g.add(base);
  for (let i = 0; i < 3; i++) {
    const leg = box(0.07, 0.5, 0.07, PALETTE.brassDark, Math.sin(i * 2.1) * 0.3, 0.25, Math.cos(i * 2.1) * 0.3);
    leg.rotation.z = Math.sin(i * 2.1) * 0.5;
    leg.rotation.x = -Math.cos(i * 2.1) * 0.5;
    g.add(leg);
  }
  const column = box(0.16, 1.1, 0.16, PALETTE.coral, 0, 0.65, 0);
  column.material = new THREE.MeshBasicMaterial({ color: PALETTE.coral });
  g.add(column);
  const tip = box(0.1, 0.14, 0.1, PALETTE.opal, 0, 1.28, 0);
  tip.material = new THREE.MeshBasicMaterial({ color: PALETTE.opal });
  g.add(tip);
  return {
    group: g,
    // frac: remaining fuse fraction while planted; carried hides the column.
    setPlanted(frac) {
      column.scale.y = Math.max(0.05, frac);
      column.position.y = 0.1 + 0.55 * Math.max(0.05, frac);
      g.visible = true;
    },
    setCarried() {
      column.scale.y = 0.25;
      column.position.y = 0.22;
      g.visible = true;
    },
  };
}
