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
  siphon: { coat: PALETTE.petrol, limb: PALETTE.petrolLight, plate: PALETTE.coral, shell: PALETTE.petrol, band: PALETTE.coral, pack: PALETTE.brass, visor: PALETTE.petrol },
  still: { coat: PALETTE.ivory, limb: PALETTE.plumLight, plate: PALETTE.jade, shell: PALETTE.jade, band: PALETTE.jade, pack: PALETTE.plum, visor: PALETTE.jade },
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
  visor.material = new THREE.MeshStandardMaterial({ color: L.visor, roughness: 0.35, metalness: 0.2, emissive: team === 'still' ? PALETTE.jade : 0x000000, emissiveIntensity: 0.7, envMapIntensity: 0.5 });
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
  // The bot's own gun, held level in both hands.
  const gun = new THREE.Group();
  gun.position.set(0.14, 0.28, -0.34);
  const grecv = box(0.07, 0.13, 0.44, PALETTE.petrol, 0, 0, -0.1);
  const gbar = box(0.04, 0.04, 0.30, PALETTE.petrol, 0, 0.02, -0.44);
  const gmag = box(0.05, 0.15, 0.08, PALETTE.petrol, 0, -0.12, -0.16);
  gmag.rotation.x = 0.25;
  gun.add(grecv, gbar, gmag);
  upper.add(gun);
  return {
    group: g,
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

// First-person viewmodels: manufactured objects, not boxes — panelled receivers
// in scratched gunmetal, vented handguards, curved magazines, brass fittings.
export function createViewmodel(weaponId) {
  const g = new THREE.Group();
  const gm = gunmetal(), br = brassMat();
  const B = (w, h, d, m, x, y, z, rx = 0) => {
    const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    q.position.set(x, y, z); q.rotation.x = rx; g.add(q); return q;
  };
  const CY = (r, len, m, x, y, z) => {
    const q = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), m);
    q.rotation.x = Math.PI / 2; q.position.set(x, y, z); g.add(q); return q;
  };
  const dark = mat(PALETTE.petrol, 0.6), ivory = mat(PALETTE.ivory, 0.55);
  let muzzleZ = -0.72;
  if (weaponId === 'pip9') {
    B(0.056, 0.075, 0.23, ivory, 0, 0.045, -0.12);
    for (let i = 0; i < 3; i++) B(0.058, 0.02, 0.012, dark, 0, 0.05, 0.0 + i * 0.03);
    B(0.05, 0.07, 0.2, gm, 0, -0.02, -0.1);
    B(0.052, 0.11, 0.07, dark, 0, -0.1, 0.03, 0.3);
    B(0.054, 0.09, 0.02, ivory, 0, -0.1, 0.045, 0.3);
    CY(0.008, 0.02, br, 0, 0.095, -0.22);
    muzzleZ = -0.3;
  } else if (weaponId === 'rill24') {
    B(0.075, 0.13, 0.36, gm, 0, 0, -0.14);
    B(0.078, 0.045, 0.24, dark, 0, 0.03, -0.14);
    CY(0.046, 0.2, gm, 0, 0.01, -0.4);
    for (let i = 0; i < 3; i++) B(0.02, 0.095, 0.03, dark, 0, 0.01, -0.33 - i * 0.07);
    CY(0.017, 0.12, dark, 0, 0.01, -0.55);
    CY(0.026, 0.025, br, 0, 0.01, -0.49);
    const coral = mat(PALETTE.coral, 0.6);
    for (let i = 0; i < 3; i++) B(0.055, 0.075, 0.042, coral, 0, -0.1 - i * 0.062, -0.17 - i * 0.016, 0.18 + i * 0.16);
    B(0.04, 0.1, 0.05, dark, 0, -0.09, 0.05, 0.3);
    B(0.03, 0.03, 0.16, dark, 0, 0.02, 0.14);
    B(0.008, 0.045, 0.008, br, 0, 0.09, -0.42);
    muzzleZ = -0.62;
  } else if (weaponId === 'knell8') {
    B(0.08, 0.13, 0.34, gm, 0, 0, -0.1);
    CY(0.03, 0.52, mat(PALETTE.copper, 0.4), 0, 0.025, -0.42);
    CY(0.042, 0.15, mat(PALETTE.coralDark, 0.65), 0, -0.01, -0.36);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.006, 6, 14), dark);
      ring.position.set(0, -0.01, -0.31 - i * 0.05); g.add(ring);
    }
    CY(0.009, 0.02, br, 0, 0.075, -0.66);
    B(0.06, 0.1, 0.07, dark, 0, -0.1, 0.02, 0.3);
    B(0.065, 0.11, 0.18, dark, 0, -0.01, 0.16);
    muzzleZ = -0.7;
  } else {
    // Bastion-5 rifle, ~0.72 m of manufactured object.
    B(0.078, 0.145, 0.46, gm, 0, 0, -0.18);
    B(0.08, 0.05, 0.3, dark, 0, 0.028, -0.18);
    B(0.03, 0.016, 0.4, dark, 0, 0.082, -0.18);
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) B(0.004, 0.014, 0.014, br, s * 0.041, -0.01 + i * 0.05, -0.08 - i * 0.14);
    B(0.07, 0.11, 0.26, gm, 0, 0.005, -0.5);
    for (let i = 0; i < 3; i++) B(0.034, 0.006, 0.05, dark, 0, 0.063, -0.4 - i * 0.08);
    CY(0.016, 0.24, dark, 0, 0.012, -0.72);
    CY(0.025, 0.02, br, 0, 0.012, -0.64); CY(0.025, 0.02, br, 0, 0.012, -0.7);
    B(0.046, 0.046, 0.07, dark, 0, 0.012, -0.85);
    for (let i = 0; i < 3; i++) B(0.056, 0.08, 0.042, gm, 0, -0.105 - i * 0.058, -0.155 - i * 0.02, 0.16 + i * 0.17);
    B(0.058, 0.02, 0.05, dark, 0, -0.295, -0.215, 0.5);
    B(0.05, 0.11, 0.06, dark, 0, -0.105, 0.03, 0.32);
    for (const s of [-1, 1]) B(0.004, 0.08, 0.045, ivory, s * 0.027, -0.105, 0.03, 0.32);
    B(0.06, 0.105, 0.2, gm, 0, -0.005, 0.15);
    B(0.056, 0.034, 0.13, dark, 0, 0.062, 0.16);
    CY(0.011, 0.032, br, 0.048, 0.03, -0.04).rotation.z = Math.PI / 2;
    B(0.05, 0.045, 0.018, dark, 0, 0.1, -0.04);
    B(0.008, 0.05, 0.008, dark, 0, 0.095, -0.56);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), br);
    bead.position.set(0, 0.122, -0.56); g.add(bead);
    muzzleZ = -0.9;
  }
  const sleeve = box(0.09, 0.09, 0.22, PALETTE.petrol, 0.02, -0.12, -0.28);
  g.add(sleeve);
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.34),
    new THREE.MeshBasicMaterial({ color: PALETTE.opal, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  flash.position.set(0, 0.03, muzzleZ);
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
