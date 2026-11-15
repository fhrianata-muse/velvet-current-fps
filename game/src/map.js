// The Ninth Bath: a 48 x 40 m Art Deco municipal bathhouse. One data table of boxes
// drives everything — the visible mesh, the movement colliders and the shot occlusion —
// so what the player sees is exactly what blocks bullets. Floors and ramps give the
// ground height (deck 0, drained pool -1, gallery +2). A hand-authored nav graph of
// nodes and edges carries the bots; hold points carry the facing a defender watches.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { TEX, signTexture, gaugeTexture } from './textures.js';

// Box: center x/z, width/depth, base height y0, height h, palette key or raw colour.
// opts: noCollide (decoration), emissive.
const B = (x, z, w, d, y0, h, mat, opts = {}) => ({ x, z, w, d, y0, h, mat, ...opts });

export const SITES = {
  A: { id: 'A', name: 'Heater Court', x0: -22.5, x1: -12.5, z0: -18.5, z1: -12.5, socket: { x: -17.5, z: -15.5 } },
  B: { id: 'B', name: 'The Dynamo', x0: 12.5, x1: 22.5, z0: -18.5, z1: -12.5, socket: { x: 16.5, z: -14.5 } },
};
export const SPAWNS = {
  // Attackers muster in front of the buy counter, clear of it, facing the doors.
  siphon: [{ x: -3, z: 13.8 }, { x: 0, z: 14.2 }, { x: 3, z: 13.8 }],
  still: [{ x: -3, z: -17.5 }, { x: 0, z: -18.5 }, { x: 3, z: -17.5 }],
};

function buildBoxTable() {
  const boxes = [];
  const wall = (x, z, w, d, mat = 'petrol') => boxes.push(B(x, z, w, d, 0, 4.6, mat));
  // Perimeter
  wall(0, -20.2, 48.8, 0.6); wall(0, 20.2, 48.8, 0.6);
  wall(-24.2, 0, 0.6, 40.8); wall(24.2, 0, 0.6, 40.8);
  // South line z=12: vestibule doors west / mid / east
  wall(-18, 12, 12, 0.5, 'coralDark'); wall(-4, 12, 4, 0.5, 'coralDark');
  wall(4, 12, 4, 0.5, 'coralDark'); wall(18, 12, 12, 0.5, 'coralDark');
  // Buy counter in the vestibule (brass, chest high)
  boxes.push(B(0, 15.2, 7, 1.1, 0, 1.1, 'brass'));
  boxes.push(B(0, 15.2, 7.4, 0.25, 1.1, 0.12, 'brassDark'));
  // Cloakroom / Service Walk side walls x=+-11.5 with mid connector doors at z in [-2,2]
  wall(-11.5, -7, 0.5, 10, 'petrolLight'); wall(-11.5, 7, 0.5, 10, 'petrolLight');
  wall(11.5, -7, 0.5, 10, 'petrolLight'); wall(11.5, 7, 0.5, 10, 'petrolLight');
  // North line z=-12: lane ends. Cloakroom->A door x[-19,-15]; office doors; Walk->B door x[15,19]
  wall(-21.5, -12, 5, 0.5, 'petrolLight'); wall(-13, -12, 4, 0.5, 'petrolLight');
  wall(-4.5, -12, 5, 0.5, 'petrolLight'); wall(4.5, -12, 5, 0.5, 'petrolLight');
  wall(13, -12, 4, 0.5, 'petrolLight'); wall(21.5, -12, 5, 0.5, 'petrolLight');
  // Office side walls x=+-8, z[-20,-12], doors z[-17,-14] to the sites
  wall(-8, -18.5, 0.5, 3, 'ivoryDim'); wall(-8, -13, 0.5, 2, 'ivoryDim');
  wall(8, -18.5, 0.5, 3, 'ivoryDim'); wall(8, -13, 0.5, 2, 'ivoryDim');
  // Office desks
  boxes.push(B(-4, -16, 3, 1.2, 0, 1.0, 'plum')); boxes.push(B(4, -16, 3, 1.2, 0, 1.0, 'plum'));
  // Cloakroom locker banks (staggered, waist-to-head cover)
  const locker = (x, z, vert) => boxes.push(B(x, z, vert ? 1.2 : 3.2, vert ? 3.2 : 1.2, 0, 1.9, 'petrolLight'));
  locker(-20.6, 4, false); locker(-13.4, -1, false); locker(-20.6, -6, false); locker(-13.4, -9.5, false);
  boxes.push(B(-17, 8.5, 4.5, 1.0, 0, 1.05, 'jadeDark')); // bench cover
  // Grand Basin rim and maintenance islands (islands rise from the pool floor)
  boxes.push(B(-3, -2.5, 3, 3, -1, 1.12, 'jade'));
  boxes.push(B(3, 0.5, 3, 3, -1, 1.12, 'jade'));
  boxes.push(B(-3, -2.5, 3.3, 0.3, 0.12, 0.5, 'brass')); // island trim
  boxes.push(B(3, 0.5, 3.3, 0.3, 0.12, 0.5, 'brass'));
  // Central fountain column in the basin: breaks the spawn-to-spawn sightline.
  boxes.push(B(0, -1, 1.7, 1.7, -1, 2.6, 'ivoryDim'));
  // Deck cover crates either side of the basin
  boxes.push(B(-9.2, 3.5, 1.6, 1.6, 0, 1.2, 'plum'));
  boxes.push(B(9.2, -4.5, 1.6, 1.6, 0, 1.2, 'plum'));
  boxes.push(B(-9.2, -6.5, 1.6, 1.6, 0, 0.8, 'jadeDark'));
  boxes.push(B(9.2, 6.5, 1.6, 1.6, 0, 0.8, 'jadeDark'));
  // Gallery parapet (y=2 deck): two firing openings on the south edge
  const parapet = (x, w) => boxes.push(B(x, -8.8, w, 0.35, 2, 1.0, 'ivoryDim'));
  parapet(-6, 4); parapet(0.5, 3); parapet(6.5, 3);
  boxes.push(B(0, -12.4, 16, 0.35, 2, 1.0, 'ivoryDim')); // gallery north rail
  boxes.push(B(-7.6, -10.5, 0.5, 4, 0, 2, 'petrol')); // gallery supports
  boxes.push(B(7.6, -10.5, 0.5, 4, 0, 2, 'petrol'));
  // Heater Court: plant plinth and gauge board (cylinders added as meshes below)
  boxes.push(B(-15.6, -15.5, 1.2, 3.2, 0, 1.0, 'jadeDark'));
  boxes.push(B(-20.5, -12.8, 3.4, 0.4, 0, 2.6, 'brassDark'));
  // Dynamo: service cabinet shielding the plant spot, pump housings
  boxes.push(B(15.4, -14.8, 1.4, 3.0, 0, 1.6, 'petrolLight'));
  boxes.push(B(20.5, -17.8, 2.6, 1.6, 0, 1.3, 'jadeDark'));
  // Service Walk: pump housings and the dogleg teeth
  boxes.push(B(20.4, 3.5, 2.6, 3, 0, 1.5, 'jade'));
  boxes.push(B(13.8, -2.5, 1.8, 3, 0, 1.5, 'jade'));
  wall(20.5, -6, 7, 0.5, 'petrolLight'); // dogleg tooth from the east
  wall(15, 1.2, 6, 0.5, 'petrolLight'); // dogleg tooth from the west
  // Vestibule side benches
  boxes.push(B(-7.5, 17.5, 3, 1, 0, 0.9, 'plum'));
  boxes.push(B(7.5, 17.5, 3, 1, 0, 0.9, 'plum'));
  return boxes;
}

// Floors: flat regions with a top height. Ramps interpolate along one axis.
const FLOORS = [
  { x0: -24, x1: 24, z0: -20, z1: 20, top: 0 },
  { x0: -7, x1: 7, z0: -8, z1: 6, top: -1 }, // drained pool
  { x0: -8, x1: 8, z0: -12.5, z1: -8.6, top: 2 }, // gallery deck
];
const RAMPS = [
  { x0: -7, x1: 7, z0: 6, z1: 8.4, axis: 'z', at0: 8.4, h0: 0, at1: 6, h1: -1 }, // pool south steps
  { x0: -7, x1: 7, z0: -10.4, z1: -8, axis: 'z', at0: -10.4, h0: 0, at1: -8, h1: -1 }, // pool north ramp
  { x0: -11.4, x1: -8, z0: -12.4, z1: -5.6, axis: 'z', at0: -5.6, h0: 0, at1: -12.4, h1: 2 }, // west gallery ramp
  { x0: 8, x1: 11.4, z0: -12.4, z1: -5.6, axis: 'z', at0: -5.6, h0: 0, at1: -12.4, h1: 2 }, // east gallery ramp
  { x0: -1.2, x1: 1.2, z0: -14.6, z1: -12.4, axis: 'z', at0: -14.6, h0: 0, at1: -12.4, h1: 2 }, // gallery centre steps
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

// Nav graph. face = yaw a holder watches (radians, 0 = -z north, PI = +z south).
export const NODES = [
  { id: 'vest', x: 0, z: 16.8 }, { id: 'doorW', x: -9, z: 10.5 }, { id: 'doorM', x: 0, z: 10.5 },
  { id: 'doorE', x: 9, z: 10.5 }, { id: 'ck1', x: -17, z: 8 }, { id: 'ck2', x: -17, z: 2 },
  { id: 'ck3', x: -17, z: -5 }, { id: 'ck4', x: -17, z: -10 }, { id: 'doorA', x: -17, z: -13 },
  { id: 'siteA', x: -17.5, z: -15.5 }, { id: 'holdA1', x: -20.5, z: -13.4, face: Math.PI },
  { id: 'holdA2', x: -13.2, z: -17.6, face: -Math.PI / 2 },
  { id: 'poolS', x: 0, z: 7.2 }, { id: 'poolW', x: -3, z: -4.6 }, { id: 'poolE', x: 3, z: 2.6 },
  { id: 'poolN', x: 0, z: -7 }, { id: 'deckW', x: -9.2, z: 0 }, { id: 'deckE', x: 9.2, z: 0 },
  { id: 'connW', x: -11.5, z: 0 }, { id: 'connE', x: 11.5, z: 0 },
  { id: 'rampW', x: -9.7, z: -9 }, { id: 'rampE', x: 9.7, z: -9 },
  { id: 'galW', x: -5, z: -10.6, face: Math.PI }, { id: 'galE', x: 5, z: -10.6, face: Math.PI },
  { id: 'galS', x: 0, z: -13.4 }, { id: 'off', x: 0, z: -17 }, { id: 'offW', x: -6, z: -15.4 },
  { id: 'offE', x: 6, z: -15.4 }, { id: 'sv1', x: 17, z: 8 }, { id: 'sv2', x: 17, z: 3.4 },
  { id: 'sv3', x: 13.8, z: -3.8 }, { id: 'sv4', x: 17, z: -8.6 }, { id: 'doorB', x: 17, z: -13 },
  { id: 'siteB', x: 16.5, z: -14.5 }, { id: 'holdB1', x: 13.4, z: -17.6, face: Math.PI / 2 },
  { id: 'holdB2', x: 21.5, z: -13.4, face: Math.PI },
  { id: 'holdM', x: 0, z: -13.2, face: Math.PI },
];
const EDGES = [
  ['vest', 'doorW'], ['vest', 'doorM'], ['vest', 'doorE'],
  ['doorW', 'ck1'], ['ck1', 'ck2'], ['ck2', 'ck3'], ['ck3', 'ck4'], ['ck4', 'doorA'], ['doorA', 'siteA'],
  ['siteA', 'holdA1'], ['siteA', 'holdA2'], ['doorA', 'holdA1'],
  ['doorM', 'poolS'], ['poolS', 'poolW'], ['poolS', 'poolE'], ['poolW', 'poolN'], ['poolE', 'poolN'],
  ['poolN', 'galS'], ['doorM', 'deckW'], ['doorM', 'deckE'], ['deckW', 'connW'], ['deckE', 'connE'],
  ['connW', 'ck2'], ['connE', 'sv2'], ['deckW', 'rampW'], ['deckE', 'rampE'],
  ['rampW', 'galW'], ['rampE', 'galE'], ['galW', 'galE'], ['galW', 'galS'], ['galE', 'galS'],
  ['galS', 'off'], ['galS', 'holdM'], ['off', 'offW'], ['off', 'offE'],
  ['offW', 'siteA'], ['offW', 'holdA2'], ['offE', 'siteB'], ['offE', 'holdB1'],
  ['doorE', 'sv1'], ['sv1', 'sv2'], ['sv2', 'sv3'], ['sv3', 'sv4'], ['sv4', 'doorB'], ['doorB', 'siteB'],
  ['siteB', 'holdB1'], ['siteB', 'holdB2'], ['doorB', 'holdB2'], ['poolW', 'deckW'], ['poolE', 'deckE'],
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
    // X slab
    if (Math.abs(dx) < 1e-9) { if (ox < x0 || ox > x1) continue; }
    else {
      let t1 = (x0 - ox) / dx, t2 = (x1 - ox) / dx;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    // Y slab
    if (Math.abs(dy) < 1e-9) { if (oy < y0 || oy > y1) continue; }
    else {
      let t1 = (y0 - oy) / dy, t2 = (y1 - oy) / dy;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    // Z slab
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
// Which canvas skin each palette colour wears. Panel/plaster canvases are drawn
// near-white and tinted by colour; tile, terrazzo and brass carry their own hues.
const TEXKEY = {
  [PALETTE.jade]: 'tile', [PALETTE.jadeDark]: 'tile',
  [PALETTE.petrol]: 'panel', [PALETTE.petrolLight]: 'panel',
  [PALETTE.ivory]: 'panel', [PALETTE.ivoryDim]: 'panel',
  [PALETTE.coral]: 'plaster', [PALETTE.coralDark]: 'plaster',
  [PALETTE.plum]: 'plaster', [PALETTE.plumLight]: 'plaster',
  [PALETTE.brass]: 'brass', [PALETTE.brassDark]: 'brass', [PALETTE.copper]: 'brass',
  [PALETTE.floor]: 'terrazzo', [PALETTE.deckEdge]: 'panel',
};
const UNTINTED = new Set(['tile', 'terrazzo', 'brass', 'mosaic']);
const ENV_I = { tile: 0.4, plaster: 0.25, panel: 0.3, brass: 1.0, terrazzo: 0.35, lane: 0.3, mosaic: 0.4 };
const MAT_CACHE = new Map();
function material(colour, emissive = 0, texName) {
  const key = `${colour}|${emissive}|${texName ?? ''}`;
  if (!MAT_CACHE.has(key)) {
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
      if (tk === 'brass') m.color.set(colour); // brass canvas is a light base: tint to the fitting's hue
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
    const mesh = new THREE.Mesh(geoFor(b.w, b.h, b.d), material(PALETTE[b.mat] ?? b.mat));
    mesh.position.set(b.x, b.y0 + b.h / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  // Floors: deck, pool floor with sunburst mosaic, gallery deck.
  // Deck in four slabs around the pool cut-out, so the drained basin stays a real pit.
  for (const [w, d, x, z] of [[48, 12, 0, -14], [48, 14, 0, 13], [17, 14, -15.5, -1], [17, 14, 15.5, -1]]) {
    const slab = new THREE.Mesh(geoFor(w, 0.2, d), material(PALETTE.floor));
    slab.position.set(x, -0.1, z); slab.receiveShadow = true; group.add(slab);
  }
  const poolWallGeo = geoFor(0.25, 1, 14);
  for (const sx of [-7.1, 7.1]) {
    const pw = new THREE.Mesh(poolWallGeo, material(PALETTE.jadeDark));
    pw.position.set(sx, -0.5, -1); group.add(pw);
  }
  const poolFloor = new THREE.Mesh(geoFor(14, 0.1, 14), material(PALETTE.jadeDark, 0, 'mosaic'));
  poolFloor.position.set(0, -1.05, -1); poolFloor.receiveShadow = true; group.add(poolFloor);
  const gallery = new THREE.Mesh(geoFor(16, 0.25, 3.9), material(PALETTE.deckEdge));
  gallery.position.set(0, 1.87, -10.55); gallery.receiveShadow = true; group.add(gallery);
  // Pool steps and ramps as sloped boxes (visual only; floors handle the walking height).
  const slope = (x, z, w, len, drop, ang) => {
    const m = new THREE.Mesh(geoFor(w, 0.18, len), material(PALETTE.jade));
    m.position.set(x, drop, z); m.rotation.x = ang; group.add(m);
  };
  slope(0, 7.2, 14, 2.9, -0.5, 0.4);
  slope(0, -9.2, 14, 2.9, -0.5, -0.4);
  slope(-9.7, -9, 3.4, 7.6, 1, -0.28);
  slope(9.7, -9, 3.4, 7.6, 1, -0.28);
  // Site A heater cylinders: three copper towers with pipe runs and gauge discs.
  const cylGeo = new THREE.CylinderGeometry(1.1, 1.1, 4.4, 20);
  for (const [cx, cz] of [[-21, -17.6], [-21, -13.6], [-13.6, -17.9]]) {
    const cyl = new THREE.Mesh(cylGeo, material(PALETTE.copper));
    cyl.position.set(cx, 2.2, cz); cyl.castShadow = true; group.add(cyl);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.25, 20), material(PALETTE.brassDark));
    cap.position.set(cx, 4.5, cz); group.add(cap);
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.09, 20), material(PALETTE.brassDark));
    gauge.rotation.x = Math.PI / 2; gauge.position.set(cx, 2.6, cz + 1.12); group.add(gauge);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshStandardMaterial({ map: gaugeTexture(), roughness: 0.5, metalness: 0.1, envMapIntensity: 0.4 }));
    dial.position.set(cx, 2.6, cz + 1.17); group.add(dial);
    boxes.push(B(cx, cz, 2.2, 2.2, 0, 4.4, 'copper'));
  }
  // Site B turbine: a six-metre wheel that turns slowly behind the socket.
  const turbine = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.28, 12, 40), material(PALETTE.jade, 0, 'plaster'));
  ring.castShadow = true;
  turbine.add(ring);
  for (let i = 0; i < 6; i++) {
    const bar = new THREE.Mesh(geoFor(0.35, 5.6, 0.3), material(PALETTE.brass));
    bar.rotation.z = (i / 6) * Math.PI;
    bar.castShadow = true;
    turbine.add(bar);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.6, 16), material(PALETTE.petrol));
  hub.rotation.x = Math.PI / 2; hub.castShadow = true; turbine.add(hub);
  turbine.position.set(19.5, 3.1, -18.6);
  group.add(turbine);
  boxes.push(B(19.5, -18.6, 6.4, 0.8, 0, 6.2, 'petrol'));
  // Chandelier over the basin: three brass frames with opal light bars.
  const chand = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const y = 5.6 - i * 0.35;
    const s = 5 - i * 1.1;
    const frame = new THREE.Mesh(geoFor(s, 0.12, s * 0.6), material(PALETTE.brass));
    frame.position.y = y; chand.add(frame);
    const bar = new THREE.Mesh(geoFor(s * 0.8, 0.09, 0.3), material(PALETTE.opal, 1));
    bar.position.y = y - 0.12; chand.add(bar);
  }
  chand.position.set(0, 0, -1);
  group.add(chand);
  // Opal light bars on walls (emissive strips) — vestibule, office, lanes.
  const barGeo = geoFor(3.2, 0.12, 0.18);
  for (const [x, z, ry] of [[0, 19.8, 0], [0, -19.8, 0], [-23.8, 0, Math.PI / 2], [23.8, 0, Math.PI / 2], [-17, 11.7, 0], [17, 11.7, 0]]) {
    const barMesh = new THREE.Mesh(barGeo, material(PALETTE.opal, 1));
    barMesh.position.set(x, 3.6, z); barMesh.rotation.y = ry; group.add(barMesh);
  }
  // Site markers: floor rings at the sockets.
  for (const site of [SITES.A, SITES.B]) {
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 28), new THREE.MeshBasicMaterial({ color: PALETTE.coral, side: THREE.DoubleSide }));
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(site.socket.x, 0.03, site.socket.z);
    group.add(ringMesh);
  }
  // ---- Dressing kit (decoration only; nothing here joins the collision table).
  const ivoryM = material(PALETTE.ivory), brassM = material(PALETTE.brass), colM = material(PALETTE.ivory, 0, 'plaster');
  const darkM = material(PALETTE.petrol, 0, 'none');
  const add = (geo, m, x, y, z, ry = 0) => {
    const q = new THREE.Mesh(geo, m);
    q.position.set(x, y, z); q.rotation.y = ry;
    q.castShadow = true; q.receiveShadow = true; group.add(q); return q;
  };
  // Lathe columns: basin corners + vestibule pair.
  const colPts = [[0.36, 0], [0.37, 0.07], [0.25, 0.18], [0.205, 0.6], [0.19, 1.6], [0.20, 2.7], [0.23, 3.2], [0.29, 3.36], [0.31, 3.5], [0.23, 3.58]]
    .map(([a, b]) => new THREE.Vector2(a, b));
  const colGeo = new THREE.LatheGeometry(colPts, 20);
  for (const [x, z] of [[-8.8, 6.4], [8.8, 6.4], [-8.8, -8.4], [8.8, -8.4], [-5.8, 16.8], [5.8, 16.8]]) add(colGeo, colM, x, 0, z);
  // Pilasters with brass heart-strips; skirting/cornice on the long walls.
  const pilGeo = geoFor(0.42, 3.4, 0.16), stripGeo = geoFor(0.06, 3.4, 0.05);
  const pilaster = (x, z, ry) => { add(pilGeo, ivoryM, x, 1.85, z, ry); add(stripGeo, brassM, x + Math.sin(ry) * 0.1, 1.85, z + Math.cos(ry) * 0.1, ry); };
  for (const x of [-18, -6, 6, 18]) { pilaster(x, -19.82, 0); pilaster(x, 12.34, 0); }
  for (const z of [-16, -8, 0, 8]) { pilaster(-23.82, z, Math.PI / 2); pilaster(23.82, z, Math.PI / 2); }
  const skirt = (w, x, z, ry, corn) => {
    add(geoFor(w, 0.2, 0.09), material(PALETTE.jadeDark), x, 0.1, z, ry);
    if (corn) add(geoFor(w, 0.24, 0.2), ivoryM, x, 4.42, z, ry);
  };
  skirt(47, 0, -19.84, 0, true);
  skirt(39, -23.84, 0, Math.PI / 2, true); skirt(39, 23.84, 0, Math.PI / 2, false);
  // Brass nosing around the pool coping.
  add(geoFor(15.2, 0.07, 0.34), brassM, 0, 0.035, 6.28); add(geoFor(15.2, 0.07, 0.34), brassM, 0, 0.035, -8.28);
  add(geoFor(0.34, 0.07, 14.9), brassM, -7.28, 0.035, -1); add(geoFor(0.34, 0.07, 14.9), brassM, 7.28, 0.035, -1);
  // Arched portals at the four doorways: jambs + a half-torus arch band.
  const archGeo = new THREE.TorusGeometry(0.95, 0.11, 10, 22, Math.PI);
  const jambGeo = geoFor(0.26, 2.15, 0.34);
  for (const [x, z] of [[0, 12], [-17, -12], [17, -12], [0, -12]]) {
    add(jambGeo, ivoryM, x - 1.05, 1.07, z); add(jambGeo, ivoryM, x + 1.05, 1.07, z);
    const arch = add(archGeo, ivoryM, x, 2.15, z);
    const lip = add(new THREE.TorusGeometry(1.09, 0.03, 8, 22, Math.PI), brassM, x, 2.15, z);
    arch.castShadow = lip.castShadow = false;
  }
  // Pipe runs: cylinders, torus elbows, brass flanges (A wall, B wall).
  const pipeM = material(PALETTE.coral);
  const pipe = (x, y, z, len, axis) => {
    const p = add(new THREE.CylinderGeometry(0.09, 0.09, len, 14), pipeM, x, y, z);
    if (axis === 'x') p.rotation.z = Math.PI / 2; else if (axis === 'z') p.rotation.x = Math.PI / 2;
    return p;
  };
  const elbow = (x, y, z, rx, rz) => {
    const e = add(new THREE.TorusGeometry(0.34, 0.09, 10, 12, Math.PI / 2), pipeM, x, y, z);
    e.rotation.set(rx, 0, rz); return e;
  };
  const flange = (x, y, z, axis) => {
    const f = add(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 14), brassM, x, y, z);
    if (axis === 'x') f.rotation.z = Math.PI / 2; else if (axis === 'z') f.rotation.x = Math.PI / 2;
  };
  pipe(-17.5, 3.5, -19.8, 9, 'x'); elbow(-22, 3.5, -19.8, 0, Math.PI / 2); elbow(-13, 3.5, -19.8, 0, 0);
  pipe(-22, 2.6, -19.8, 1.8, 'y'); pipe(-13, 2.6, -19.8, 1.8, 'y');
  for (const fx of [-20, -17.5, -15]) flange(fx, 3.5, -19.8, 'x');
  pipe(23.8, 3.3, -15.5, 7, 'z'); elbow(23.8, 3.3, -19, 0, 0); pipe(23.8, 2.4, -19, 1.8, 'y');
  for (const fz of [-17, -14]) flange(23.8, 3.3, fz, 'z');
  // Locker door seams, vents and handles on the Cloakroom banks' lane faces.
  const seamGeo = geoFor(0.96, 1.68, 0.03), ventGeo = geoFor(0.34, 0.05, 0.02), gripGeo = geoFor(0.05, 0.16, 0.04);
  for (const [lx, lz] of [[-20.6, 4], [-13.4, -1], [-20.6, -6], [-13.4, -9.5]]) {
    for (const s of [-1.05, 0, 1.05]) {
      add(seamGeo, darkM, lx + s, 0.95, lz + 0.62);
      add(ventGeo, darkM, lx + s, 1.62, lz + 0.63);
      add(gripGeo, brassM, lx + s + 0.34, 0.95, lz + 0.64);
    }
  }
  // Gauge/valve clusters: plate, two dials, one coral valve wheel.
  const dialTex = gaugeTexture();
  const dialM = new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.5, metalness: 0.1, envMapIntensity: 0.4 });
  const cluster = (x, y, z, ry) => {
    const g2 = new THREE.Group();
    g2.position.set(x, y, z); g2.rotation.y = ry; group.add(g2);
    const plate = new THREE.Mesh(geoFor(0.95, 1.15, 0.08), darkM); g2.add(plate);
    for (const s of [-0.24, 0.24]) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 18), brassM);
      rim.rotation.x = Math.PI / 2; rim.position.set(s, 0.22, 0.05); g2.add(rim);
      const dial = new THREE.Mesh(new THREE.CircleGeometry(0.125, 18), dialM);
      dial.position.set(s, 0.22, 0.08); g2.add(dial);
    }
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.028, 8, 20), material(PALETTE.coral, 0, 'none'));
    wheel.position.set(0, -0.28, 0.09); g2.add(wheel);
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(geoFor(0.27, 0.03, 0.02), material(PALETTE.coral, 0, 'none'));
      spoke.position.set(0, -0.28, 0.09); spoke.rotation.z = (i / 3) * Math.PI; g2.add(spoke);
    }
  };
  cluster(-20.5, 1.7, -12.5, 0); cluster(19.15, 1.7, -17.8, -Math.PI / 2); cluster(-4, 1.7, -19.62, 0);
  // Wayfinding signs over the doorways and the counter.
  const sign = (text, tab, x, z, ry) => {
    add(geoFor(2.6, 0.78, 0.1), darkM, x, 3.3, z, ry);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshStandardMaterial({ map: signTexture(text, tab), roughness: 0.6, metalness: 0.05, envMapIntensity: 0.3 }));
    p.position.set(x + Math.sin(ry) * 0.07, 3.3, z + Math.cos(ry) * 0.07); p.rotation.y = ry; group.add(p);
  };
  sign('GRAND BASIN', '#287f78', 0, 11.68, Math.PI);
  sign('TICKETS', '#b58a45', 0, 12.38, 0);
  sign('A · HEAT', '#d97668', -17, -12.42, Math.PI);
  sign('B · DYNAMO', '#287f78', 17, -12.42, Math.PI);
  // Ticket counter: panelled front and a brass rail along its top edge.
  for (const s of [-2.3, 0, 2.3]) add(geoFor(2.1, 0.86, 0.04), ivoryM, s, 0.55, 14.62);
  const rail = add(new THREE.CylinderGeometry(0.035, 0.035, 7.2, 10), brassM, 0, 1.24, 14.66);
  rail.rotation.z = Math.PI / 2;

  scene.add(group);
  return { boxes, turbine };
}
