// Saintmere Hall's art palette: a bright marble library-mansion — warm ivory stone,
// soft gold, burgundy carpet, walnut, one sparing deep-teal accent. Team colours
// ride on the same table: Siphon crimson + charcoal, Stillguard ivory + navy/gold.
export const PALETTE = {
  jade: 0x1f4d46, // Deep Teal — panelled accent walls, skirting, Siphon-era green retired to trim
  jadeDark: 0x173a34,
  coral: 0x9e2434, // Crimson — carpet family, Siphon plates, armed-device light
  coralDark: 0x6e1420, // Burgundy — carpet field depth, Siphon packs
  ivory: 0xe9e2d0, // Warm Ivory Marble — walls, columns, Stillguard coats
  ivoryDim: 0xd6c9a8, // Aged Ivory — secondary stone, parapets
  brass: 0xc9a227, // Soft Gold — fittings, rails, Stillguard bands, weapon details
  brassDark: 0x8a6d1d,
  petrol: 0x2b2f36, // Charcoal — Siphon uniforms, ironwork, gunmetal
  petrolLight: 0x454c57,
  plum: 0x22355c, // Navy — Stillguard armour and limbs
  plumLight: 0x31497a,
  opal: 0xfff3d6, // Daylight Warm — lamp glass, muzzle glow
  copper: 0xa87b4f, // Bronze — barrel metal, warm fittings
  wood: 0x6b4a2f, // Walnut — shelves, tables, the porter's desk
  sky: 0xdcebf5, // Sky Daylight — window glass, display-case tint
  floor: 0xe9e2d0, // Marble deck (carries the marble canvas)
  deckEdge: 0x6b4a2f, // Gallery deck — walnut parquet
};

// Deterministic RNG (mulberry32): the same seed drives bot jitter and staged captures.
export function makeRng(seed) {
  let a = seed | 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
