// Velvet Current's art palette: one municipal bathhouse, seven colours, matte materials.
// Every mesh in the game takes its colour from this table so the scene reads at a glance:
// jade water-works, coral plaster, ivory tile, brass fittings, petrol shadow, plum cloth.
export const PALETTE = {
  jade: 0x287f78, // Basin Jade — pool tiles, regulator housings
  jadeDark: 0x1c5a55,
  coral: 0xd97668, // Faded Coral — plaster, Siphon bands, armed-device light
  coralDark: 0xa8564b,
  ivory: 0xe8dfc8, // Warm Ivory — tile borders, Stillguard coats, HUD text
  ivoryDim: 0xcfc4a6,
  brass: 0xb58a45, // Aged Brass — rails, fittings, weapon details
  brassDark: 0x86652f,
  petrol: 0x18343d, // Petrol Ink — structural shadow, Siphon uniforms
  petrolLight: 0x27505e,
  plum: 0x493447, // Bruised Plum — Stillguard armour, upholstery
  plumLight: 0x64455f,
  opal: 0xfff1cf, // Opal Light — lamps, muzzle glow
  copper: 0xa96f3f, // heater cylinders at Site A (brass family, hotter)
  floor: 0x24454c, // deep petrol deck
  deckEdge: 0x31565e,
};

// Deterministic RNG (mulberry32): the same seed drives bot jitter and staged captures,
// so a ?shot= frame is reproducible and the simulation never depends on wall-clock luck.
export function makeRng(seed) {
  let a = seed | 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
