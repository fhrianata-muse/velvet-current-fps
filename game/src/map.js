// The Ninth Bath: a 48 x 40 m Art Deco municipal bathhouse. One data table of boxes
// drives everything — the visible mesh, the movement colliders and the shot occlusion —
// so what the player sees is exactly what blocks bullets. Floors and ramps give the
// ground height (deck 0, drained pool -1, gallery +2). A hand-authored nav graph of
// nodes and edges carries the bots; hold points carry the facing a defender watches.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

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
  boxes.push(B(0, -1, 1.7, 1.7, -1, 2.6, 'brassDark'));
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

const MAT_CACHE = new Map();
function material(colour, emissive = 0) {
  const key = colour * 1000 + emissive;
  if (!MAT_CACHE.has(key)) {
    MAT_CACHE.set(key, new THREE.MeshLambertMaterial({
      color: colour,
      emissive: emissive ? colour : 0x000000,
      emissiveIntensity: emissive ? 0.9 : 0,
    }));
  }
  return MAT_CACHE.get(key);
}

export function buildMap(scene) {
  const boxes = buildBoxTable();
  const group = new THREE.Group();
  const boxGeoCache = new Map();
  const geoFor = (w, h, d) => {
    const key = `${w}|${h}|${d}`;
    if (!boxGeoCache.has(key)) boxGeoCache.set(key, new THREE.BoxGeometry(w, h, d));
    return boxGeoCache.get(key);
  };
  for (const b of boxes) {
    const mesh = new THREE.Mesh(geoFor(b.w, b.h, b.d), material(PALETTE[b.mat] ?? b.mat));
    mesh.position.set(b.x, b.y0 + b.h / 2, b.z);
    mesh.castShadow = false;
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
  const poolFloor = new THREE.Mesh(geoFor(14, 0.1, 14), material(PALETTE.jadeDark));
  poolFloor.position.set(0, -1.05, -1); poolFloor.receiveShadow = true; group.add(poolFloor);
  // Sunburst mosaic: flat brass/ivory/coral strips radiating on the pool floor.
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const strip = new THREE.Mesh(
      geoFor(0.5, 0.04, 5.6),
      material(i % 3 === 0 ? PALETTE.brass : i % 3 === 1 ? PALETTE.ivoryDim : PALETTE.coralDark),
    );
    strip.position.set(Math.sin(ang) * 3.1, -0.98, -1 + Math.cos(ang) * 3.1);
    strip.rotation.y = ang;
    group.add(strip);
  }
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
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16), material(PALETTE.ivory, 0));
    gauge.rotation.x = Math.PI / 2; gauge.position.set(cx, 2.6, cz + 1.12); group.add(gauge);
    boxes.push(B(cx, cz, 2.2, 2.2, 0, 4.4, 'copper'));
  }
  // Site B turbine: a six-metre wheel that turns slowly behind the socket.
  const turbine = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.28, 10, 36), material(PALETTE.jade));
  turbine.add(ring);
  for (let i = 0; i < 6; i++) {
    const bar = new THREE.Mesh(geoFor(0.35, 5.6, 0.3), material(PALETTE.brass));
    bar.rotation.z = (i / 6) * Math.PI;
    turbine.add(bar);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.6, 16), material(PALETTE.petrol));
  hub.rotation.x = Math.PI / 2; turbine.add(hub);
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
  scene.add(group);
  return { boxes, turbine };
}
