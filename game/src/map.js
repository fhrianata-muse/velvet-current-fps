// Saintmere Hall: a 48 x 40 m glass-roofed library-mansion. One data table of boxes
// drives everything — visible mesh, movement colliders and shot occlusion — so what
// the player sees is exactly what blocks bullets. The Grand Hall runs down the middle
// under a skylight; the Library (Site A) fills the west wing, the Statue Gallery
// (Site B) the east; a gallery balcony with twin staircases closes the hall's north
// end. A hand-authored nav graph carries the bots; hold points carry facings.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { TEX, signTexture, gaugeTexture } from './textures.js';

// Box: center x/z, width/depth, base height y0, height h, palette key or raw colour.
// opts: tex (force a canvas skin), noCollide is implicit — only table boxes collide.
const B = (x, z, w, d, y0, h, mat, opts = {}) => ({ x, z, w, d, y0, h, mat, ...opts });

export const SITES = {
  A: { id: 'A', name: 'The Library', x0: -22.5, x1: -12.5, z0: -18.5, z1: -12.5, socket: { x: -17.5, z: -15.5 } },
  B: { id: 'B', name: 'The Gallery', x0: 12.5, x1: 22.5, z0: -18.5, z1: -12.5, socket: { x: 16.5, z: -14.5 } },
};
export const SPAWNS = {
  // Attackers muster in front of the porter's desk, clear of it, facing the doors.
  siphon: [{ x: -3, z: 13.8 }, { x: 0, z: 14.2 }, { x: 3, z: 13.8 }],
  still: [{ x: -3, z: -17.5 }, { x: 0, z: -18.5 }, { x: 3, z: -17.5 }],
};

function buildBoxTable() {
  const boxes = [];
  const wall = (x, z, w, d, mat = 'ivory') => boxes.push(B(x, z, w, d, 0, 4.6, mat));
  // Perimeter
  wall(0, -20.2, 48.8, 0.6); wall(0, 20.2, 48.8, 0.6);
  wall(-24.2, 0, 0.6, 40.8); wall(24.2, 0, 0.6, 40.8);
  // South line z=12: vestibule doors west / mid / east
  wall(-18, 12, 12, 0.5, 'ivoryDim'); wall(-4, 12, 4, 0.5, 'ivoryDim');
  wall(4, 12, 4, 0.5, 'ivoryDim'); wall(18, 12, 12, 0.5, 'ivoryDim');
  // Porter's desk in the vestibule (walnut, chest high) — the buy counter.
  boxes.push(B(0, 15.2, 7, 1.1, 0, 1.1, 'wood'));
  boxes.push(B(0, 15.2, 7.4, 0.25, 1.1, 0.12, 'brassDark'));
  // Wing side walls x=+-11.5 with mid connector doors at z in [-2,2]
  wall(-11.5, -7, 0.5, 10, 'ivory'); wall(-11.5, 7, 0.5, 10, 'ivory');
  wall(11.5, -7, 0.5, 10, 'ivory'); wall(11.5, 7, 0.5, 10, 'ivory');
  // North line z=-12: lane ends and site doors.
  wall(-21.5, -12, 5, 0.5, 'ivory'); wall(-13, -12, 4, 0.5, 'ivory');
  wall(-4.5, -12, 5, 0.5, 'ivory'); wall(4.5, -12, 5, 0.5, 'ivory');
  wall(13, -12, 4, 0.5, 'ivory'); wall(21.5, -12, 5, 0.5, 'ivory');
  // Conservatory side walls x=+-8, z[-20,-12], doors z[-17,-14] to the sites
  wall(-8, -18.5, 0.5, 3, 'ivoryDim'); wall(-8, -12.7, 0.5, 1, 'ivoryDim');
  wall(8, -18.5, 0.5, 3, 'ivoryDim'); wall(8, -12.7, 0.5, 1, 'ivoryDim');
  // Conservatory tables (defender spawn furniture)
  boxes.push(B(-4, -18.6, 3, 1.2, 0, 1.0, 'wood')); boxes.push(B(4, -18.6, 3, 1.2, 0, 1.0, 'wood'));
  // Library shelf banks down the west lane (staggered, waist-to-head cover)
  const shelf = (x, z) => boxes.push(B(x, z, 3.2, 1.2, 0, 1.9, 'wood'));
  shelf(-20.6, 4); shelf(-13.4, -1); shelf(-20.6, -6); shelf(-13.4, -9.5);
  boxes.push(B(-17, 8.5, 4.5, 1.0, 0, 1.05, 'wood')); // long reading table
  // Statue pedestals
  boxes.push(B(-3, -2.5, 3, 3, 0, 1.12, 'ivory', { tex: 'marble' }));
  boxes.push(B(3, 0.5, 3, 3, 0, 1.12, 'ivory', { tex: 'marble' }));
  boxes.push(B(-3, -2.5, 3.3, 0.3, 1.12, 0.1, 'brass')); // pedestal cap trim
  boxes.push(B(3, 0.5, 3.3, 0.3, 1.12, 0.1, 'brass'));
  // Monument pedestal.
  boxes.push(B(0, -1, 1.7, 1.7, 0, 2.0, 'ivory', { tex: 'marble' }));
  // Low bookcases and benches either side of the hall
  boxes.push(B(-9.2, 3.5, 1.6, 1.6, 0, 1.2, 'wood'));
  boxes.push(B(9.2, -4.5, 1.6, 1.6, 0, 1.2, 'wood'));
  boxes.push(B(-12.8, -6.5, 1.6, 1.6, 0, 0.8, 'plum'));
  boxes.push(B(9.2, 6.5, 1.6, 1.6, 0, 0.8, 'plum'));
  // Gallery parapet (y=2 deck): two firing openings on the south edge
  const parapet = (x, w) => boxes.push(B(x, -8.8, w, 0.35, 2, 1.0, 'ivoryDim'));
  parapet(-6, 4); parapet(0.5, 3); parapet(6.5, 3);
  boxes.push(B(0, -12.4, 16, 0.35, 2, 1.0, 'ivoryDim')); // gallery north rail
  // Balcony base walls seal the undercroft.
  boxes.push(B(0, -5.6, 15.6, 0.35, 0, 2, 'ivory', { tex: 'panel' }));
  for (const sx of [-4.25, 4.25]) boxes.push(B(sx, -12.4, 6.1, 0.35, 0, 2, 'ivory', { tex: 'panel' }));
  boxes.push(B(-7.6, -10.5, 0.5, 4, 0, 2, 'ivory')); // gallery supports
  boxes.push(B(7.6, -10.5, 0.5, 4, 0, 2, 'ivory'));
  // Library: marble plant plinth and the card-catalogue cabinet
  boxes.push(B(-19, -13.2, 1.2, 3.2, 0, 1.0, 'ivory', { tex: 'marble' }));
  boxes.push(B(-20.5, -12.8, 3.4, 0.4, 0, 2.6, 'wood', { tex: 'catalog' }));
  // Gallery: a glass display case on the back wall, a statue pedestal
  boxes.push(B(21, -16.5, 1.4, 3.0, 0, 1.6, 'glass'));
  boxes.push(B(20.5, -17.8, 2.6, 1.6, 0, 1.3, 'ivory', { tex: 'marble' }));
  // East lane: a statue pedestal and a second display case, plus the dogleg teeth
  boxes.push(B(20.4, 3.5, 2.6, 3, 0, 1.5, 'ivory', { tex: 'marble' }));
  boxes.push(B(13.8, -2.5, 1.8, 3, 0, 1.5, 'glass'));
  wall(20.5, -6, 7, 0.5, 'ivory'); // dogleg tooth from the east
  wall(15, 1.2, 6, 0.5, 'ivory'); // dogleg tooth from the west
  // Vestibule waiting benches
  boxes.push(B(-7.5, 17.5, 3, 1, 0, 0.9, 'wood'));
  boxes.push(B(7.5, 17.5, 3, 1, 0, 0.9, 'wood'));
  return boxes;
}

// Floors: flat regions with a top height. Ramps interpolate along one axis.
const FLOORS = [
  { x0: -24, x1: 24, z0: -20, z1: 20, top: 0 },
  { x0: -8, x1: 8, z0: -12.5, z1: -8.6, top: 2 }, // gallery balcony deck
];
const RAMPS = [
  { x0: -11.4, x1: -8, z0: -12.4, z1: -5.6, axis: 'z', at0: -5.6, h0: 0, at1: -12.4, h1: 2 }, // west staircase
  { x0: 8, x1: 11.4, z0: -12.4, z1: -5.6, axis: 'z', at0: -5.6, h0: 0, at1: -12.4, h1: 2 }, // east staircase
  { x0: -1.2, x1: 1.2, z0: -14.6, z1: -12.4, axis: 'z', at0: -14.6, h0: 0, at1: -12.4, h1: 2 }, // balcony centre steps
];

export function groundHeight(x, z, feetY) {
  let best = -Infinity;
  for (const f of FLOORS) {
    if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && f.top <= feetY + 0.55 && f.top > best) best = f.top;
  }
  for (const r of RAMPS) {
    if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) continue;
    const at = r.axis === 'z' ? z : x;
    const t = (at - r.at0) / (r.at1 - r.at0);
    if (t < 0 || t > 1) continue;
    const h = r.h0 + (r.h1 - r.h0) * t;
    if (h <= feetY + 0.55 && h > best) best = h;
  }
  return best === -Infinity ? 0 : best;
}

// Nav graph.
export const NODES = [
  { id: 'vest', x: 0, z: 10.5 }, { id: 'doorW', x: -9, z: 8.5 }, { id: 'doorM', x: 0, z: 10.5 },
  { id: 'doorE', x: 9, z: 8.5 }, { id: 'ck1', x: -17, z: 6 }, { id: 'ck2', x: -17, z: 2 },
  { id: 'ck3', x: -17, z: -5 }, { id: 'ck4', x: -17, z: -10 }, { id: 'doorA', x: -17, z: -13 },
  { id: 'siteA', x: -17.5, z: -15.5 }, { id: 'holdA1', x: -20.5, z: -15.3, face: Math.PI },
  { id: 'holdA2', x: -13.2, z: -15.3, face: -Math.PI / 2 },
  { id: 'poolS', x: 0, z: 7.2 }, { id: 'poolW', x: -3, z: -4.6 }, { id: 'poolE', x: 3, z: 2.6 },
  { id: 'poolN', x: 0, z: -7 }, { id: 'deckW', x: -9.2, z: 0 }, { id: 'deckE', x: 9.2, z: 0 },
  { id: 'connW', x: -11.5, z: 0 }, { id: 'connE', x: 11.5, z: 0 },
  { id: 'rampW', x: -9.7, z: -9 }, { id: 'rampE', x: 9.7, z: -9 },
  { id: 'galW', x: -5, z: -10.6, face: Math.PI }, { id: 'galE', x: 5, z: -10.6, face: Math.PI },
  { id: 'galS', x: 0, z: -13.4 }, { id: 'off', x: 0, z: -17 }, { id: 'offW', x: -10.5, z: -13.8 },
  { id: 'offE', x: 10.5, z: -13.8 }, { id: 'sv1', x: 17, z: 8 }, { id: 'sv2', x: 17, z: 3.4 },
  { id: 'sv0', x: 11.7, z: 1.5 }, { id: 'svE', x: 19.5, z: 1.2 },
  { id: 'sv3', x: 15.8, z: -3.8 }, { id: 'sv4', x: 17, z: -8.6 }, { id: 'doorB', x: 17, z: -13 },
  { id: 'siteB', x: 16.5, z: -14.5 }, { id: 'holdB1', x: 13.4, z: -17.6, face: Math.PI / 2 },
  { id: 'holdB2', x: 21.5, z: -13.4, face: Math.PI },
  { id: 'holdM', x: 0, z: -13.2, face: Math.PI },
];
const EDGES = [
  ['vest', 'doorW'], ['vest', 'doorM'], ['vest', 'doorE'],
  ['connW', 'ck1'], ['ck1', 'ck2'], ['ck2', 'ck3'], ['ck3', 'ck4'], ['ck4', 'doorA'], ['doorA', 'siteA'],
  ['siteA', 'holdA2'], ['siteA', 'holdA1'],
  ['doorM', 'poolS'], ['poolS', 'poolW'], ['poolS', 'poolE'], ['poolW', 'poolN'], ['poolE', 'poolN'],
  ['doorM', 'deckW'], ['doorM', 'deckE'], ['deckW', 'connW'], ['deckE', 'connE'],
  ['connW', 'ck2'],
  ['rampW', 'galW'], ['rampE', 'galE'], ['galW', 'galE'], ['galW', 'galS'], ['galE', 'galS'],
  ['galS', 'off'], ['galS', 'holdM'], ['off', 'offW'], ['off', 'offE'],
  ['offW', 'siteA'], ['offW', 'holdA2'], ['offE', 'siteB'], ['offE', 'holdB1'],
  ['connE', 'sv0'], ['sv0', 'sv2'], ['sv1', 'sv2'], ['sv2', 'svE'], ['svE', 'sv3'], ['sv3', 'sv4'], ['sv4', 'doorB'], ['doorB', 'siteB'],
  ['doorB', 'holdB1'], ['siteB', 'holdB2'], ['doorB', 'holdB2'], ['poolW', 'deckW'], ['poolE', 'deckE'],
];
export const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));
export const ADJ = new Map(NODES.map((n) => [n.id, []]));
for (const [a, b] of EDGES) { ADJ.get(a).push(b); ADJ.get(b).push(a); }

// Shortest path over the nav graph (BFS; the graph is tiny).
export function findRoute(fromId, toId) {
  if (fromId === toId) return [fromId];
  const prev = new Map([[fromId, null]]);
  const queue = [fromId];
  while (queue.length) {
    const cur = queue.shift();
    for (const next of ADJ.get(cur)) {
      if (prev.has(next)) continue;
      prev.set(next, cur);
      if (next === toId) {
        const path = [toId];
        let p = cur;
        while (p) { path.unshift(p); p = prev.get(p); }
        return path;
      }
      queue.push(next);
    }
  }
  return [fromId];
}
export function nearestNode(x, z) {
  let best = NODES[0];
  let bestD = Infinity;
  for (const n of NODES) {
    const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best.id;
}

// Ray vs the solid box table (slab test). Returns nearest { dist, x,y,z } or null.
export function raycastBoxes(boxes, ox, oy, oz, dx, dy, dz, maxDist) {
  let best = null;
  for (const b of boxes) {
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2;
    const y0 = b.y0, y1 = b.y0 + b.h;
    const z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
    let tmin = 0, tmax = maxDist;
    if (Math.abs(dx) < 1e-9) { if (ox < x0 || ox > x1) continue; }
    else {
      let t1 = (x0 - ox) / dx, t2 = (x1 - ox) / dx;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (Math.abs(dy) < 1e-9) { if (oy < y0 || oy > y1) continue; }
    else {
      let t1 = (y0 - oy) / dy, t2 = (y1 - oy) / dy;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (Math.abs(dz) < 1e-9) { if (oz < z0 || oz > z1) continue; }
    else {
      let t1 = (z0 - oz) / dz, t2 = (z1 - oz) / dz;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (!best || tmin < best.dist) {
      best = { dist: tmin, x: ox + dx * tmin, y: oy + dy * tmin, z: oz + dz * tmin };
    }
  }
  return best;
}

// Circle (actor) vs solid boxes on one axis: returns true when the move is blocked.
// A box blocks only when it rises above step height from the actor's feet and its top
// is below the actor's head — low cover can be stepped onto via groundHeight instead.
export function circleBlocked(boxes, x, z, radius, feetY, height) {
  for (const b of boxes) {
    const top = b.y0 + b.h;
    if (top <= feetY + 0.55 || b.y0 >= feetY + height) continue;
    const cx = Math.max(b.x - b.w / 2, Math.min(x, b.x + b.w / 2));
    const cz = Math.max(b.z - b.d / 2, Math.min(z, b.z + b.d / 2));
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

const METALS = new Set([PALETTE.brass, PALETTE.brassDark, PALETTE.copper]);
// Which canvas skin each palette colour wears; panel/plaster are tinted near-whites.
const TEXKEY = {
  [PALETTE.jade]: 'panel', [PALETTE.jadeDark]: 'panel',
  [PALETTE.petrol]: 'panel', [PALETTE.petrolLight]: 'panel',
  [PALETTE.ivory]: 'panel', [PALETTE.ivoryDim]: 'panel',
  [PALETTE.coral]: 'plaster', [PALETTE.coralDark]: 'plaster',
  [PALETTE.plum]: 'plaster', [PALETTE.plumLight]: 'plaster',
  [PALETTE.wood]: 'wood', [PALETTE.deckEdge]: 'wood',
  [PALETTE.brass]: 'brass', [PALETTE.brassDark]: 'brass', [PALETTE.copper]: 'brass',
  [PALETTE.floor]: 'marble',
};
const UNTINTED = new Set(['marble', 'carpet', 'books', 'wood', 'catalog', 'brass']);
const ENV_I = { marble: 0.38, panel: 0.3, plaster: 0.25, brass: 1.0, wood: 0.3, carpet: 0.15, books: 0.2, catalog: 0.3 };
const MAT_CACHE = new Map();
function material(colour, emissive = 0, texName) {
  const key = `${colour}|${emissive}|${texName ?? ''}`;
  if (!MAT_CACHE.has(key)) {
    if (colour === 'glass') { // display-case glass: bright, barely there, all reflection
      MAT_CACHE.set(key, new THREE.MeshStandardMaterial({
        color: PALETTE.sky, transparent: true, opacity: 0.28, roughness: 0.08,
        metalness: 0.1, envMapIntensity: 1.3, depthWrite: false,
      }));
      return MAT_CACHE.get(key);
    }
    const metal = METALS.has(colour);
    const tk = texName === 'none' ? null : (texName ?? TEXKEY[colour]);
    const t = tk && TEX[tk] ? TEX[tk] : null;
    const m = new THREE.MeshStandardMaterial({
      color: t && UNTINTED.has(tk) ? 0xffffff : colour,
      roughness: metal ? 0.38 : 0.88,
      metalness: metal ? 0.85 : 0.04,
      emissive: emissive ? colour : 0x000000,
      emissiveIntensity: emissive ? 0.9 : 0,
      envMapIntensity: ENV_I[tk] ?? 0.35,
    });
    if (t) {
      m.map = t.map;
      if (t.bump) { m.bumpMap = t.bump; m.bumpScale = 0.6; }
      if (t.rough) { m.roughnessMap = t.rough; m.roughness = tk === 'brass' ? 0.62 : 1; }
      if (tk === 'brass') m.color.set(colour); // tint brass to the fitting
    }
    MAT_CACHE.set(key, m);
  }
  return MAT_CACHE.get(key);
}

export function buildMap(scene) {
  const boxes = buildBoxTable();
  const group = new THREE.Group();
  const boxGeoCache = new Map();
  const geoFor = (w, h, d) => {
    const key = `${w}|${h}|${d}`;
    if (!boxGeoCache.has(key)) {
      const g = new THREE.BoxGeometry(w, h, d);
      // World-scale UVs: 1 uv unit = 1 metre per face, so texture repeat alone
      // sets real-world size and texel density is uniform everywhere.
      const uv = g.attributes.uv, nor = g.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
        const su = nx > 0.5 ? d : w, sv = ny > 0.5 ? d : h;
        uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
      }
      boxGeoCache.set(key, g);
    }
    return boxGeoCache.get(key);
  };
  for (const b of boxes) {
    const mesh = new THREE.Mesh(geoFor(b.w, b.h, b.d), material(PALETTE[b.mat] ?? b.mat, 0, b.tex));
    mesh.position.set(b.x, b.y0 + b.h / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  // Floors: one marble field in five slabs, plus the walnut gallery deck.
  for (const [w, d, x, z] of [[48, 12, 0, -14], [48, 14, 0, 13], [17, 14, -15.5, -1], [17, 14, 15.5, -1], [14, 14, 0, -1]]) {
    const slab = new THREE.Mesh(geoFor(w, 0.2, d), material(PALETTE.floor));
    slab.position.set(x, -0.1, z); slab.receiveShadow = true; group.add(slab);
  }
  const gallery = new THREE.Mesh(geoFor(16, 0.25, 3.9), material(PALETTE.deckEdge));
  gallery.position.set(0, 1.87, -10.55); gallery.receiveShadow = true; group.add(gallery);
  // Twin staircases: sloped beds under the ramps, marble treads, brass handrails.
  const slope = (x, z, w, len, drop, ang) => {
    const m = new THREE.Mesh(geoFor(w, 0.18, len), material(PALETTE.ivoryDim));
    m.position.set(x, drop, z); m.rotation.x = ang; group.add(m);
  };
  slope(-9.7, -9, 3.4, 7.6, 1, -0.28);
  slope(9.7, -9, 3.4, 7.6, 1, -0.28);
  const treadM = material(PALETTE.ivory, 0, 'marble');
  for (const sx of [-9.7, 9.7]) {
    for (let i = 0; i < 10; i++) {
      const tread = new THREE.Mesh(geoFor(3.3, 0.07, 0.62), treadM);
      tread.position.set(sx, 0.12 + i * 0.2, -6.05 - i * 0.68);
      tread.receiveShadow = true; group.add(tread);
    }
    for (const side of [-1.62, 1.62]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 7.4, 10), material(PALETTE.brass));
      rail.position.set(sx + side, 1.95, -9); rail.rotation.x = -(Math.PI / 2 - 0.286); group.add(rail);
      for (let i = 0; i < 3; i++) { // posts sized to meet the rail from the ramp bed
        const z = -6.6 - i * 2.6, bed = (-5.6 - z) / 6.8 * 2, top = 1.95 + 0.28 * ((-9 - z) / 0.96);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, top - bed + 0.12, 8), material(PALETTE.brass));
        post.position.set(sx + side, (bed + top) / 2, z); group.add(post);
      }
    }
  }
  // Balcony centre steps (conservatory down to the deck): eight marble treads.
  for (let i = 0; i < 8; i++) {
    const tread = new THREE.Mesh(geoFor(2.4, 0.07, 0.3), treadM);
    tread.position.set(0, 0.14 + i * 0.25, -14.45 + i * 0.27);
    group.add(tread);
  }
  // Library piers: the three shelf-room columns get a base, a gold band, a capital.
  for (const [cx, cz] of [[-21, -17.6], [-21, -13.6], [-13.6, -17.9]]) {
    boxes.push(B(cx, cz, 2.2, 2.2, 0, 4.4, 'ivory', { tex: 'marble' }));
    const pier = new THREE.Mesh(geoFor(2.2, 4.4, 2.2), treadM);
    pier.position.set(cx, 2.2, cz); pier.castShadow = true; pier.receiveShadow = true; group.add(pier);
  }
  // Site B armillary: a marble globe in gilt rings, turning over its stand.
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 1.5, 14), treadM);
  stand.position.set(19.5, 0.75, -17.8); stand.castShadow = true; group.add(stand);
  const turbine = new THREE.Group();
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1.02, 24, 18), material(PALETTE.ivoryDim, 0, 'panel'));
  globe.castShadow = true;
  turbine.add(globe);
  for (const [r, rx, rz] of [[1.42, 0.4, 0.2], [1.58, Math.PI / 2.3, 0.9], [1.74, 1.1, Math.PI / 3]]) {
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 10, 42), material(PALETTE.brass));
    ringM.rotation.set(rx, 0, rz); ringM.castShadow = true;
    turbine.add(ringM);
  }
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.9, 10), material(PALETTE.brass));
  axis.rotation.z = 0.42; turbine.add(axis);
  turbine.position.set(19.5, 2.9, -17.8);
  group.add(turbine);
  boxes.push(B(19.5, -18.6, 6.4, 0.8, 0, 6.2, 'ivory'));
  const backWall = new THREE.Mesh(geoFor(6.4, 6.2, 0.8), material(PALETTE.ivory));
  backWall.position.set(19.5, 3.1, -18.6); backWall.receiveShadow = true; group.add(backWall);
  // Chandelier over the hall: three gilt rings of candle bulbs under the skylight.
  const chand = new THREE.Group();
  const bulbGeo = new THREE.SphereGeometry(0.055, 8, 6);
  const bulbM = material(PALETTE.opal, 1);
  for (const [r, y, n] of [[1.9, 5.0, 10], [1.35, 5.32, 8], [0.85, 5.6, 6]]) {
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 8, 36), material(PALETTE.brass));
    ringM.rotation.x = Math.PI / 2; ringM.position.y = y; chand.add(ringM);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const bulb = new THREE.Mesh(bulbGeo, bulbM);
      bulb.position.set(Math.cos(a) * r, y + 0.1, Math.sin(a) * r); chand.add(bulb);
    }
  }
  chand.position.set(0, 0, -1);
  group.add(chand);
  // Site markers: floor rings at the sockets.
  for (const site of [SITES.A, SITES.B]) {
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 28), new THREE.MeshBasicMaterial({ color: PALETTE.coral, side: THREE.DoubleSide }));
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(site.socket.x, 0.03, site.socket.z);
    group.add(ringMesh);
  }

  // ---- Dressing kit (decoration only; nothing here joins the collision table).
  const ivoryM = material(PALETTE.ivory), brassM = material(PALETTE.brass), marbleM = treadM;
  const woodM = material(PALETTE.wood), darkM = material(PALETTE.petrol, 0, 'none');
  const clothM = material(PALETTE.plum, 0, 'plaster'), tealM = material(PALETTE.jade, 0, 'plaster');
  const carpetM = material(PALETTE.coral, 0, 'carpet');
  const add = (geo, m, x, y, z, ry = 0) => {
    const q = new THREE.Mesh(geo, m);
    q.position.set(x, y, z); q.rotation.y = ry;
    q.castShadow = true; q.receiveShadow = true; group.add(q); return q;
  };
  const bookStack = (x, y, z, n) => {
    const mats = [material(PALETTE.coral, 0, 'none'), tealM, material(PALETTE.plum, 0, 'none'), brassM];
    for (let i = 0; i < n; i++) add(geoFor(0.32 - i * 0.03, 0.045, 0.24), mats[i % 4], x, y + 0.025 + i * 0.047, z, (i % 3) * 0.3);
  };
  const tableLamp = (x, y, z) => {
    add(new THREE.CylinderGeometry(0.02, 0.035, 0.3, 8), brassM, x, y + 0.15, z);
    add(new THREE.CylinderGeometry(0.05, 0.12, 0.1, 12), bulbM, x, y + 0.34, z);
  };
  // Lathe columns: hall corners + vestibule pair, marble with entasis.
  const colPts = [[0.36, 0], [0.37, 0.07], [0.25, 0.18], [0.205, 0.6], [0.19, 1.6], [0.20, 2.7], [0.23, 3.2], [0.29, 3.36], [0.31, 3.5], [0.23, 3.58]]
    .map(([a, b]) => new THREE.Vector2(a, b));
  const colGeo = new THREE.LatheGeometry(colPts, 20);
  for (const [x, z] of [[-8.8, 6.4], [8.8, 6.4], [-8.8, -8.4], [8.8, -8.4], [-5.8, 16.8], [5.8, 16.8]]) add(colGeo, marbleM, x, 0, z);
  // Pilasters with brass heart-strips; teal skirting and ivory cornice.
  const pilGeo = geoFor(0.42, 3.4, 0.16), stripGeo = geoFor(0.06, 3.4, 0.05);
  const pilaster = (x, z, ry) => { add(pilGeo, ivoryM, x, 1.85, z, ry); add(stripGeo, brassM, x + Math.sin(ry) * 0.1, 1.85, z + Math.cos(ry) * 0.1, ry); };
  for (const x of [-18, -6, 6, 18]) { pilaster(x, -19.82, 0); pilaster(x, 12.34, 0); }
  for (const z of [-16, -8, 0, 8]) { pilaster(-23.82, z, Math.PI / 2); pilaster(23.82, z, Math.PI / 2); }
  pilaster(-4.5, -11.8, 0); pilaster(4.5, -11.8, 0);
  const skirt = (w, x, z, ry, corn) => {
    add(geoFor(w, 0.2, 0.09), material(PALETTE.jadeDark), x, 0.1, z, ry);
    if (corn) add(geoFor(w, 0.24, 0.2), ivoryM, x, 4.42, z, ry);
  };
  skirt(47, 0, -19.84, 0, true);
  skirt(39, -23.84, 0, Math.PI / 2, true); skirt(39, 23.84, 0, Math.PI / 2, false);
  // Carpet: the burgundy runner down the hall lane; rugs at both sites, vestibule.
  add(geoFor(3.2, 0.04, 20.4), carpetM, 0, 0.02, 1.5);
  add(geoFor(5.6, 0.04, 4.8), carpetM, -17.5, 0.02, -15.5);
  add(geoFor(5.6, 0.04, 4.8), carpetM, 17, 0.02, -15.2);
  add(geoFor(7.2, 0.04, 4.8), carpetM, 0, 0.02, 17.2);
  // Arched portals at the four doorways: jambs + a half-torus arch band.
  const archGeo = new THREE.TorusGeometry(0.95, 0.11, 10, 22, Math.PI);
  const jambGeo = geoFor(0.26, 2.15, 0.34);
  for (const [x, z] of [[0, 12], [-17, -12], [17, -12], [0, -12]]) {
    add(jambGeo, ivoryM, x - 1.05, 1.07, z); add(jambGeo, ivoryM, x + 1.05, 1.07, z);
    const arch = add(archGeo, ivoryM, x, 2.15, z);
    const lip = add(new THREE.TorusGeometry(1.09, 0.03, 8, 22, Math.PI), brassM, x, 2.15, z);
    arch.castShadow = lip.castShadow = false;
  }
  // Bookshelf faces: spine planes on the lane banks; tall units on A's north wall.
  const booksM = new THREE.MeshStandardMaterial({ map: TEX.books.map, roughness: 0.85, metalness: 0.02, envMapIntensity: 0.2 });
  const booksPlane = (w, h, x, y, z, ry) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), booksM);
    p.position.set(x, y, z); p.rotation.y = ry; p.receiveShadow = true; group.add(p);
  };
  for (const [lx, lz] of [[-20.6, 4], [-13.4, -1], [-20.6, -6], [-13.4, -9.5]]) {
    booksPlane(3.05, 1.76, lx, 0.95, lz + 0.615, 0);
    booksPlane(3.05, 1.76, lx, 0.95, lz - 0.615, Math.PI);
    add(geoFor(3.4, 0.09, 1.4), woodM, lx, 1.95, lz);
  }
  for (const sx of [-21.3, -18.2, -13.4]) {
    add(geoFor(2.9, 3.4, 0.34), woodM, sx, 1.7, -19.78);
    booksPlane(2.7, 3.15, sx, 1.62, -19.59, 0);
    add(geoFor(3.1, 0.1, 0.44), woodM, sx, 3.45, -19.78);
  }
  // Rolling ladder against the Library's tall shelves.
  const ladder = new THREE.Group();
  ladder.position.set(-18.2, 0, -19.1); ladder.rotation.x = -0.22; group.add(ladder);
  for (const s of [-0.5, 0.5]) {
    const r = new THREE.Mesh(geoFor(0.06, 3.3, 0.04), woodM);
    r.position.set(s, 1.65, 0); r.castShadow = true; ladder.add(r);
  }
  for (let i = 0; i < 6; i++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), brassM);
    rung.rotation.z = Math.PI / 2; rung.position.set(0, 0.35 + i * 0.5, 0); ladder.add(rung);
  }
  // Library piers get a base, a gilt band and a capital.
  for (const [cx, cz] of [[-21, -17.6], [-21, -13.6], [-13.6, -17.9]]) {
    add(geoFor(2.5, 0.28, 2.5), marbleM, cx, 0.14, cz);
    add(geoFor(2.32, 0.14, 2.32), brassM, cx, 3.85, cz);
    add(geoFor(2.6, 0.24, 2.6), marbleM, cx, 4.28, cz);
  }
  // Clocks and dials: gilt-rimmed faces over the conservatory, both sites.
  const dialM = new THREE.MeshStandardMaterial({ map: gaugeTexture(), roughness: 0.5, metalness: 0.1, envMapIntensity: 0.4 });
  const dialAt = (x, y, z, ry, r = 0.13) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(r, 18), dialM);
    d.position.set(x, y, z); d.rotation.y = ry; group.add(d); return d;
  };
  const clockAt = (x, y, z, ry) => {
    const rim = add(new THREE.TorusGeometry(0.34, 0.045, 8, 24), brassM, x, y, z, ry);
    rim.castShadow = false;
    dialAt(x + Math.sin(ry) * 0.02, y, z + Math.cos(ry) * 0.02, ry, 0.33);
  };
  clockAt(0, 3.4, -19.84, 0); clockAt(-15.2, 3.55, -19.86, 0); clockAt(19.5, 3.6, -19.86, 0);
  dialAt(-14.97, 0.62, -15.5, Math.PI / 2, 0.14); // regulator dial on the A plinth
  // Wayfinding signs over the doorways and the hall doors.
  const sign = (text, tab, x, z, ry) => {
    add(geoFor(2.6, 0.78, 0.1), darkM, x, 3.3, z, ry);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshStandardMaterial({ map: signTexture(text, tab), roughness: 0.6, metalness: 0.05, envMapIntensity: 0.3 }));
    p.position.set(x + Math.sin(ry) * 0.07, 3.3, z + Math.cos(ry) * 0.07); p.rotation.y = ry; group.add(p);
  };
  sign('GRAND HALL', '#c9a227', 0, 11.68, Math.PI);
  sign('ENTRANCE', '#c9a227', 0, 12.38, 0);
  sign('A · LIBRARY', '#9e2434', -17, -12.42, Math.PI);
  sign('B · GALLERY', '#1f4d46', 17, -12.42, Math.PI);
  // Porter's desk: walnut panels on its public face, a brass rail, desk lamps.
  for (const s of [-2.3, 0, 2.3]) add(geoFor(2.1, 0.86, 0.04), woodM, s, 0.55, 15.78);
  const rail2 = add(new THREE.CylinderGeometry(0.035, 0.035, 7.2, 10), brassM, 0, 1.26, 15.82);
  rail2.rotation.z = Math.PI / 2;
  tableLamp(-2.9, 1.22, 15.2); tableLamp(2.9, 1.22, 15.2);
  bookStack(0.4, 1.22, 15.25, 3);

  // Winged statues: lathed robe, gilt laurel, extruded wing profiles.
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.5, 0.12, 0.66, 0.62);
  wingShape.quadraticCurveTo(0.44, 0.55, 0.34, 0.38);
  wingShape.quadraticCurveTo(0.36, 0.72, 0.22, 0.92);
  wingShape.quadraticCurveTo(0.05, 0.5, 0, 0.22);
  wingShape.lineTo(0, 0);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.05, bevelEnabled: false, curveSegments: 6 });
  const robeGeo = new THREE.LatheGeometry(
    [[0.30, 0], [0.27, 0.08], [0.18, 0.45], [0.145, 0.8], [0.155, 0.95], [0.20, 1.02]]
      .map(([a, b]) => new THREE.Vector2(a, b)), 14);
  const statue = (x, y, z, s, ry = 0) => {
    const g2 = new THREE.Group();
    g2.position.set(x, y, z); g2.scale.setScalar(s); g2.rotation.y = ry; group.add(g2);
    const robe = new THREE.Mesh(robeGeo, marbleM); robe.castShadow = true; g2.add(robe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), marbleM);
    head.position.y = 1.16; head.castShadow = true; g2.add(head);
    const laurel = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 14), brassM);
    laurel.position.y = 1.24; laurel.rotation.x = Math.PI / 2.4; g2.add(laurel);
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 6, 16), brassM);
    sash.position.y = 0.78; sash.rotation.x = Math.PI / 2; g2.add(sash);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, marbleM);
      wing.position.set(side * 0.1, 0.72, -0.13);
      wing.rotation.set(0, side * 0.5, side * -0.45);
      wing.scale.x = side;
      wing.castShadow = true; g2.add(wing);
    }
  };
  statue(-3, 1.22, -2.5, 1.15); statue(3, 1.22, 0.5, 1.15);
  statue(0, 2.0, -1, 1.5);
  statue(20.5, 1.3, -17.8, 1.05, -0.5); statue(20.4, 1.5, 3.5, 1.0, -0.9);
  // Display cases: gilt posts and rim over the glass colliders, a vase inside.
  const vaseGeo = new THREE.LatheGeometry(
    [[0.02, 0], [0.13, 0.03], [0.16, 0.18], [0.08, 0.34], [0.1, 0.42]]
      .map(([a, b]) => new THREE.Vector2(a, b)), 14);
  const caseKit = (cx, cz, w, d, h) => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      add(geoFor(0.07, h, 0.07), brassM, cx + sx * (w / 2 - 0.035), h / 2, cz + sz * (d / 2 - 0.035));
    add(geoFor(w + 0.08, 0.07, d + 0.08), brassM, cx, h + 0.03, cz);
    add(geoFor(w * 0.4, h * 0.45, d * 0.4), marbleM, cx, h * 0.225, cz);
    add(vaseGeo, brassM, cx, h * 0.45, cz);
  };
  caseKit(21, -16.5, 1.4, 3.0, 1.6);
  caseKit(13.8, -2.5, 1.8, 3.0, 1.5);
  // Site A plinth: book stacks and a reading lamp beside the socket.
  bookStack(-19, 1.0, -14.3, 3); tableLamp(-19, 1.0, -12.1);
  // Low bookcases in the hall: spine faces, book stacks, a globe on the west one.
  for (const [cx, cz] of [[-9.2, 3.5], [9.2, -4.5]]) {
    booksPlane(1.45, 1.05, cx, 0.6, cz + 0.815, 0);
    booksPlane(1.45, 1.05, cx, 0.6, cz - 0.815, Math.PI);
    bookStack(cx - 0.4, 1.2, cz + 0.3, 3);
  }
  {
    add(new THREE.CylinderGeometry(0.03, 0.05, 0.22, 8), brassM, -8.6, 1.31, 3.2);
    const g = add(new THREE.SphereGeometry(0.3, 18, 14), material(PALETTE.ivoryDim, 0, 'panel'), -8.6, 1.68, 3.2);
    g.rotation.z = 0.42;
    const mer = add(new THREE.TorusGeometry(0.32, 0.015, 6, 24), brassM, -8.6, 1.68, 3.2);
    mer.rotation.set(0, 0.5, 0.42);
  }
  // Upholstered benches: a navy cushion on the low blocks, a book left behind.
  for (const [cx, cz] of [[-9.2, -6.5], [9.2, 6.5]]) {
    add(geoFor(1.7, 0.12, 1.7), clothM, cx, 0.86, cz);
    bookStack(cx + 0.3, 0.92, cz - 0.3, 2);
  }
  // The long reading table in the west lane: lamps and open book stacks.
  tableLamp(-18.6, 1.05, 8.5); tableLamp(-15.4, 1.05, 8.5);
  bookStack(-17, 1.05, 8.4, 3); bookStack(-16.2, 1.05, 8.65, 2);
  // Conservatory tables: potted plants, lamps, ledgers for the defenders.
  const plant = (x, z) => {
    add(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 10), darkM, x, 1.15, z);
    const f1 = add(new THREE.SphereGeometry(0.3, 10, 8), tealM, x, 1.5, z); f1.scale.y = 0.8;
  };
  plant(-4.6, -18.6); plant(4.6, -18.6);
  bookStack(-3.2, 1.0, -18.6, 3); bookStack(3.4, 1.0, -18.4, 2);
  tableLamp(-5.2, 1.0, -18.8); tableLamp(5.2, 1.0, -18.8);
  // Vestibule waiting benches: walnut slats, a navy cushion roll.
  const wbench = (cx) => {
    for (let i = 0; i < 3; i++) add(geoFor(2.9, 0.05, 0.24), woodM, cx, 0.94, 17.5 - 0.28 + i * 0.28);
    const bk = add(geoFor(2.9, 0.4, 0.05), woodM, cx, 1.28, 17.98);
    bk.rotation.x = 0.25;
    add(geoFor(0.7, 0.09, 0.5), clothM, cx - 0.8, 1.0, 17.5);
  };
  wbench(-7.5); wbench(7.5);
  // Queue rails guiding the line to the porter's desk.
  for (const sx of [-1, 1]) {
    for (const px of [0.55, 1.55, 2.55]) add(new THREE.CylinderGeometry(0.035, 0.045, 0.95, 10), brassM, sx * px, 0.48, 13.7);
    const qr1 = add(new THREE.CylinderGeometry(0.028, 0.028, 2.1, 8), brassM, sx * 1.55, 0.92, 13.7);
    qr1.rotation.z = Math.PI / 2;
    const qr2 = add(new THREE.CylinderGeometry(0.022, 0.022, 2.1, 8), brassM, sx * 1.55, 0.55, 13.7);
    qr2.rotation.z = Math.PI / 2;
  }
  // Gallery supports get a capital and a base so they read as columns.
  for (const sx of [-7.6, 7.6]) {
    add(geoFor(0.74, 0.18, 0.74), ivoryM, sx, 1.95, -10.5);
    add(geoFor(0.74, 0.16, 0.74), ivoryM, sx, 0.1, -10.5);
  }
  // Tall arched windows: ivory frame, bright sky glass, mullion cross, sill.
  const glassM = new THREE.MeshStandardMaterial({ color: PALETTE.sky, emissive: 0xeaf4fb, emissiveIntensity: 0.8, roughness: 0.35, metalness: 0.05, envMapIntensity: 0.5 });
  const win = (x, z, ry) => {
    const g2 = new THREE.Group();
    g2.position.set(x, 0, z); g2.rotation.y = ry; group.add(g2);
    const wl = (geo, m, lx, y, lz) => { const q = new THREE.Mesh(geo, m); q.position.set(lx, y, lz); g2.add(q); return q; };
    wl(geoFor(1.9, 3.0, 0.09), ivoryM, 0, 2.3, 0);
    wl(geoFor(1.9, 0.9, 0.09), ivoryM, 0, 4.0, 0);
    wl(new THREE.PlaneGeometry(1.58, 2.68), glassM, 0, 2.3, 0.055);
    wl(new THREE.CircleGeometry(0.79, 18, 0, Math.PI), glassM, 0, 3.64, 0.055);
    wl(new THREE.TorusGeometry(0.82, 0.055, 8, 18, Math.PI), ivoryM, 0, 3.64, 0.05);
    wl(geoFor(0.055, 2.68, 0.03), darkM, 0, 2.3, 0.07);
    wl(geoFor(1.58, 0.055, 0.03), darkM, 0, 2.3, 0.07);
  };
  for (const x of [-20, -14, -8, 8, 14, 20]) win(x, -19.86, 0);
  for (const x of [-16, -5.5, 5.5, 16]) win(x, 19.86, Math.PI);
  for (const z of [-14, -6, 6, 14]) { win(-23.86, z, Math.PI / 2); win(23.86, z, -Math.PI / 2); }
  win(-18, 12.3, 0); win(18, 12.3, 0);
  // Gilt medallions on the hall's north wall, the parapet and the vestibule.
  const medallion = (x, z, ry, y = 3.05) => {
    const g2 = new THREE.Group();
    g2.position.set(x, y, z); g2.rotation.y = ry; group.add(g2);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.52, 22), ivoryM); disc.position.z = 0.02; g2.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 24), brassM); ring.position.z = 0.03; g2.add(ring);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), brassM); boss.position.z = 0.05; g2.add(boss);
  };
  medallion(-13, -11.72, 0); medallion(-4.5, -11.72, 0); medallion(4.5, -11.72, 0); medallion(13, -11.72, 0);
  medallion(-4, -8.6, 0, 2.55); medallion(4, -8.6, 0, 2.55);
  medallion(-10.5, 19.86, Math.PI); medallion(10.5, 19.86, Math.PI);
  // Lintels over the doorways that have no arch: connectors, office doors, doors.
  const lintel = (x, z, ry) => {
    add(geoFor(2.7, 0.3, 0.5), ivoryM, x, 2.32, z, ry);
    add(geoFor(2.7, 0.07, 0.54), brassM, x, 2.14, z, ry);
  };
  lintel(-11.5, 0, Math.PI / 2); lintel(11.5, 0, Math.PI / 2);
  lintel(-8, -15.5, Math.PI / 2); lintel(8, -15.5, Math.PI / 2);
  lintel(-9, 12, 0); lintel(9, 12, 0);
  // Hanging lamps over each lane, the hall, both sites and the spawns.
  const lamp = (x, z) => {
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), darkM, x, 4.18, z);
    add(new THREE.CylinderGeometry(0.05, 0.17, 0.13, 12), darkM, x, 3.72, z);
    const bulb = add(geoFor(0.16, 0.07, 0.16), bulbM, x, 3.64, z);
    bulb.castShadow = false;
  };
  lamp(-17, 6); lamp(-17, -4); lamp(17, 6); lamp(17, -4);
  lamp(0, 4.5); lamp(0, -5.5); lamp(-17.5, -15.5); lamp(17, -15); lamp(0, -16); lamp(0, 16.8);
  // Skylight frame grid over the Grand Hall.
  const sky = [];
  sky.push(add(geoFor(15.4, 0.16, 0.34), darkM, 0, 5.9, 6.45));
  sky.push(add(geoFor(15.4, 0.16, 0.34), darkM, 0, 5.9, -8.45));
  sky.push(add(geoFor(0.34, 0.16, 15.2), darkM, -7.55, 5.9, -1));
  sky.push(add(geoFor(0.34, 0.16, 15.2), darkM, 7.55, 5.9, -1));
  for (const bx of [-3.8, 0, 3.8]) sky.push(add(geoFor(0.2, 0.13, 14.6), darkM, bx, 5.88, -1));
  for (const bz of [-4.5, 2.5]) sky.push(add(geoFor(14.8, 0.13, 0.2), darkM, 0, 5.88, bz));
  for (const m of sky) m.castShadow = false;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(14.8, 14.6),
    new THREE.MeshBasicMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
  glass.rotation.x = Math.PI / 2; glass.position.set(0, 5.86, -1); group.add(glass);
  scene.add(group);
  return { boxes, turbine };
}
