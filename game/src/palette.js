// Saintmere Hall's art palette: a bright grand-library interior — warm ivory
export const PALETTE = {
  forest: 0x1a5c3d,
  forestDark: 0x14332b,
  teal: 0x2e5a55, // Siphon
  tealDark: 0x22423e,
  orange: 0xe07b2a, // Siphon accent
  ivory: 0xede6d6,
  ivoryDim: 0xd8cbae,
  brass: 0xc0a062,
  brassDark: 0x8a6d3b,
  gold: 0xc9a227, // Stillguard accent
  charcoal: 0x262b36, // Stillguard
  charcoalLight: 0x39404e,
  armour: 0x1d212b,
  petrol: 0x2b2f36,
  petrolLight: 0x454c57,
  navy: 0x2c3a55,
  ochre: 0xc08a3e,
  tan: 0xbfa880,
  opal: 0xfff3d6,
  copper: 0xa87b4f,
  wood: 0x6b4a2f,
  oakDark: 0x4a3220,
  sky: 0xb9cfda,
  winSky: 0xdcebf5,
  floor: 0xe7dfce,
  deckEdge: 0x6b4a2f,
  amber: 0xe8a33d,
  skin: 0xd9a878,
  mask: 0xa34a38, // Scout mask, red-brown
};

// Deterministic RNG (mulberry32) for bot jitter and staged captures.
export function makeRng(seed) {
  let a = seed | 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
