// Character figures and first-person viewmodels, all built from boxes in the palette.
// The Siphon read narrow and petrol-dark with coral bands; The Stillguard read broad
// and ivory with plum armour and a jade visor slit — silhouette first, colour second.
// The same proportions define the hitboxes: a separate head box above the torso box.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const mat = (colour) => new THREE.MeshLambertMaterial({ color: colour });
const box = (w, h, d, colour, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(colour));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

const TEAM_LOOK = {
  siphon: { coat: PALETTE.petrol, limb: PALETTE.petrolLight, head: PALETTE.petrol, band: PALETTE.coral, pack: PALETTE.brass },
  still: { coat: PALETTE.ivory, limb: PALETTE.plumLight, head: PALETTE.ivory, band: PALETTE.jade, pack: PALETTE.plum },
};

export function createFigure(team) {
  const look = TEAM_LOOK[team];
  const g = new THREE.Group();
  const legL = box(0.17, 0.8, 0.2, look.limb, -0.13, 0.4, 0);
  const legR = box(0.17, 0.8, 0.2, look.limb, 0.13, 0.4, 0);
  const torso = box(0.52, 0.65, 0.3, look.coat, 0, 1.12, 0);
  const chest = box(0.56, 0.3, 0.34, look.band, 0, 1.24, 0);
  const head = box(0.3, 0.34, 0.3, look.head, 0, 1.62, 0);
  const visor = box(0.26, 0.07, 0.02, team === 'still' ? PALETTE.jade : PALETTE.coral, 0, 1.64, -0.16);
  const armL = box(0.13, 0.55, 0.15, look.limb, -0.34, 1.12, -0.05);
  const armR = box(0.13, 0.55, 0.15, look.limb, 0.34, 1.12, -0.05);
  const pack = box(0.36, 0.42, 0.16, look.pack, 0, 1.18, 0.22);
  const gun = box(0.09, 0.16, 0.62, PALETTE.petrol, 0.3, 1.18, -0.42);
  g.add(legL, legR, torso, chest, head, visor, armL, armR, pack, gun);
  return {
    group: g,
    // walk: leg swing phase; crouch: 0..1 compression; dead: 0..1 fall to the floor.
    pose(walk, crouch, dead, time) {
      const swing = Math.sin(walk) * 0.5;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.7;
      armR.rotation.x = -0.5; // gun arm stays levelled
      const drop = crouch * 0.5;
      torso.position.y = 1.12 - drop;
      chest.position.y = 1.24 - drop;
      head.position.y = 1.62 - drop;
      visor.position.y = 1.64 - drop;
      armL.position.y = 1.12 - drop;
      armR.position.y = 1.12 - drop;
      pack.position.y = 1.18 - drop;
      gun.position.y = 1.18 - drop;
      legL.scale.y = 1 - crouch * 0.55;
      legR.scale.y = 1 - crouch * 0.55;
      legL.position.y = 0.4 * (1 - crouch * 0.55);
      legR.position.y = 0.4 * (1 - crouch * 0.55);
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

// First-person viewmodels: one shared receiver kit, four silhouettes.
export function createViewmodel(weaponId) {
  const g = new THREE.Group();
  const dark = mat(PALETTE.petrol);
  const brass = mat(PALETTE.brass);
  if (weaponId === 'pip9') {
    g.add(box(0.07, 0.13, 0.24, PALETTE.ivory, 0, 0, -0.1));
    g.add(box(0.06, 0.1, 0.1, dark.color.getHex(), 0, -0.1, -0.04));
  } else if (weaponId === 'rill24') {
    g.add(box(0.08, 0.14, 0.42, dark.color.getHex(), 0, 0, -0.16));
    g.add(box(0.07, 0.16, 0.12, PALETTE.coral, 0, -0.13, -0.2));
    g.add(box(0.05, 0.05, 0.2, brass.color.getHex(), 0, 0.03, -0.42));
  } else if (weaponId === 'knell8') {
    g.add(box(0.09, 0.15, 0.5, dark.color.getHex(), 0, 0, -0.2));
    g.add(box(0.11, 0.11, 0.3, PALETTE.copper, 0, 0.01, -0.3));
    g.add(box(0.08, 0.08, 0.16, brass.color.getHex(), 0, -0.08, -0.18));
  } else {
    // Bastion-5: long petrol receiver, brass fittings, ivory top plate, raised sight.
    g.add(box(0.08, 0.15, 0.58, PALETTE.petrolLight, 0, 0, -0.24));
    g.add(box(0.06, 0.18, 0.1, dark.color.getHex(), 0, -0.14, -0.16));
    g.add(box(0.04, 0.04, 0.3, brass.color.getHex(), 0, 0.02, -0.6));
    g.add(box(0.03, 0.09, 0.03, brass.color.getHex(), 0, 0.11, -0.3));
    g.add(box(0.09, 0.03, 0.4, PALETTE.ivory, 0, 0.09, -0.24));
  }
  // Hands/sleeves in the player's team colours are added by main (sleeve box).
  const sleeve = box(0.09, 0.09, 0.22, PALETTE.petrol, 0.02, -0.12, -0.28);
  g.add(sleeve);
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.34),
    new THREE.MeshBasicMaterial({ color: PALETTE.opal, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  flash.position.set(0, 0.03, -0.72);
  g.add(flash);
  g.position.set(0.26, -0.22, -0.45);
  return { group: g, flash };
}

// The Pulse Leech: a brass tripod that opens on a regulator socket. Its coral column
// drains as the fuse burns; while carried it rides folded on the carrier's back.
export function createDevice() {
  const g = new THREE.Group();
  const base = box(0.5, 0.12, 0.5, PALETTE.brass, 0, 0.06, 0);
  g.add(base);
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
