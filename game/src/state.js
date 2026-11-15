// The one home for match state and the tuning numbers the brief fixes. Everything else
// reads and writes through this object; nothing keeps a private copy of the score, the
// clock or the economy, so a round can be resolved in exactly one place (game.js).

export const STEP = 1 / 60; // fixed-step simulation, 60 Hz, apart from rendering

export const RULES = {
  teamSize: 3,
  roundsToWin: 4,
  buySeconds: 10,
  liveSeconds: 90,
  resultSeconds: 4,
  plantSeconds: 3,
  defuseSeconds: 5,
  fuseSeconds: 30,
  startMoney: 800,
  maxMoney: 9000,
  winPay: 2400,
  lossPay: 1900,
  killPay: 200,
  plantPay: 300,
};

export const MOVE = {
  walkSpeed: 4.2,
  crouchSpeed: 2.1,
  accel: 24,
  brake: 32,
  radius: 0.3,
  eyeStand: 1.65,
  eyeCrouch: 1.05,
  heightStand: 1.8,
  heightCrouch: 1.25,
};

// Weapon table. Damage is body/head; the head multiplier is 3x for every gun.
// spreadBase/spreadMove are half-angles in degrees; bloom decays.
export const WEAPONS = {
  pip9: {
    id: 'pip9', name: 'Pip-9', role: 'Sidearm', price: 0,
    damage: 28, headMult: 3, rpm: 300, auto: false, mag: 12, reserve: 48,
    reload: 1.5, spreadBase: 0.35, spreadMove: 2.0, bloomPerShot: 0.2, bloomCap: 1.2,
    recoil: 0.45, range: 60,
  },
  rill24: {
    id: 'rill24', name: 'Rill-24', role: 'SMG', price: 1200,
    damage: 24, headMult: 3, rpm: 750, auto: true, mag: 28, reserve: 84,
    reload: 1.9, spreadBase: 0.5, spreadMove: 2.2, bloomPerShot: 0.22, bloomCap: 1.6,
    recoil: 0.35, range: 45,
  },
  bastion5: {
    id: 'bastion5', name: 'Bastion-5', role: 'Rifle', price: 1800,
    damage: 34, headMult: 3, rpm: 600, auto: true, mag: 24, reserve: 72,
    reload: 2.1, spreadBase: 0.2, spreadMove: 2.5, bloomPerShot: 0.3, bloomCap: 1.8,
    recoil: 0.7, range: 80,
  },
  knell8: {
    id: 'knell8', name: 'Knell-8', role: 'Shotgun', price: 1400,
    damage: 11, headMult: 3, rpm: 70, auto: false, mag: 6, reserve: 24,
    reload: 2.6, spreadBase: 2.6, spreadMove: 3.0, bloomPerShot: 0.4, bloomCap: 2.0,
    recoil: 1.6, range: 22, pellets: 8,
  },
};
export const WEAPON_ORDER = ['pip9', 'rill24', 'bastion5', 'knell8'];

export const GRENADE = {
  id: 'clatterbox', name: 'Clatterbox', price: 300,
  throwSpeed: 18, fuse: 1.8, radius: 5, maxDamage: 100,
};

// createMatch returns a fresh match state. Actors are filled in by game.js:
// { id, team, isPlayer, alive, health, pos, vel, yaw, pitch, crouch, weapon state,
//   money, hasDevice, bot brain fields, figure handle }.
export function createMatch(rng) {
  return {
    rng,
    phase: 'buy', // buy | live | planted | result | over
    phaseTime: RULES.buySeconds,
    round: 1,
    score: { siphon: 0, still: 0 },
    playerTeam: 'siphon', // the player's side this round; swaps every round
    actors: [],
    device: { state: 'carried', site: null, pos: null, carrier: null, fuse: 0 },
    channel: null, // { actor, kind: 'plant'|'defuse', t, need, site }
    grenades: [], // live projectiles { pos, vel, fuse, owner }
    sounds: [], // stimuli { pos, radius, kind, team, t }
    feed: [], // HUD event lines { text, t }
    result: null, // { winner, reason, pay }
    winner: null,
    time: 0,
    shake: 0,
  };
}

export function otherTeam(team) {
  return team === 'siphon' ? 'still' : 'siphon';
}

// Whose turn it is to attack this round: The Siphon attack on odd rounds.
export function attackTeam(round) {
  return round % 2 === 1 ? 'siphon' : 'still';
}
