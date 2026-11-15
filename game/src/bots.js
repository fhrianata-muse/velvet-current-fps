// Bot brains: an explicit state machine the judge can read — route, hold, investigate,
// engage, plant, defend, defuse — over the map's hand-authored nav graph. Perception is
// bounded: a 100-degree view cone, 35 m sight with wall occlusion, 300-450 ms reaction,
// bursts of 3-5 rounds, and sound stimuli (shots 28 m, footsteps 9 m, blasts 35 m).
// Teammates share a sighting after a 0.7 s callout; each bot needs its own LOS to shoot.
import { NODES, NODE_BY_ID, findRoute, nearestNode, raycastBoxes, SITES } from './map.js';
import { moveActor, eyeOf } from './player.js';
import { fireWeapon, startReload } from './weapons.js';
import { attackTeam } from './state.js';

export function initBrain(bot, rng) {
  bot.brain = {
    state: 'route',
    route: [],
    routeIdx: 0,
    holdNode: null,
    faceYaw: 0,
    target: null,
    lastSeen: null, // { x, z, t }
    seenAt: -9,
    reactT: 0,
    burstLeft: 0,
    pauseT: 0,
    perceptT: rng() * 0.1,
    soundT: -9,
    investigate: null,
    scanDir: 1,
    stuckT: 0,
    lastX: bot.pos.x,
    lastZ: bot.pos.z,
    intent: null, // 'plant' | 'defuse' | null — game.js runs the channel
    coverNode: null,
  };
  bot.rngOffset = rng() * 10;
}

function setRoute(bot, toNodeId) {
  const from = nearestNode(bot.pos.x, bot.pos.z);
  bot.brain.route = findRoute(from, toNodeId);
  bot.brain.routeIdx = 0;
  // Skip the first node when already standing on it.
  const first = NODE_BY_ID.get(bot.brain.route[0]);
  if (first && Math.hypot(first.x - bot.pos.x, first.z - bot.pos.z) < 1.2) bot.brain.routeIdx = 1;
}

function losClear(boxes, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.01) return true;
  const hit = raycastBoxes(boxes, from.x, from.y, from.z, dx / dist, dy / dist, dz / dist, dist);
  return !hit || hit.dist > dist - 0.45;
}

function canSee(match, bot, other, boxes) {
  if (!other.alive) return false;
  const eye = eyeOf(bot);
  const dx = other.pos.x - bot.pos.x;
  const dz = other.pos.z - bot.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 35) return false;
  if (dist > 2) {
    // 100-degree view cone around the bot's facing.
    const fx = -Math.sin(bot.yaw);
    const fz = -Math.cos(bot.yaw);
    const dot = (fx * dx + fz * dz) / (dist || 1);
    if (dot < Math.cos((100 * Math.PI / 180) / 2)) return false;
  }
  const chest = { x: other.pos.x, y: other.groundY + 1.1, z: other.pos.z };
  const head = { x: other.pos.x, y: other.groundY + 1.6, z: other.pos.z };
  return losClear(boxes, eye, chest) || losClear(boxes, eye, head);
}

// Assign round roles once, at the buy phase. Attackers: the carrier takes the chosen
// site lane, the other attacker takes a second lane then rotates in. Defenders hold
// one per site plus mid/gallery.
export function assignPlans(match, rng) {
  const atk = attackTeam(match.round);
  const siteId = rng() < 0.55 ? 'A' : 'B';
  match.planSite = siteId;
  const laneFor = { A: ['doorA', 'ck4'], B: ['doorB', 'sv4'] };
  const altLane = siteId === 'A' ? 'B' : 'A';
  for (const bot of match.actors) {
    if (bot.isPlayer) continue;
    const b = bot.brain;
    b.intent = null;
    b.target = null;
    b.lastSeen = null;
    if (bot.team === atk) {
      if (match.device.carrier === bot) {
        setRoute(bot, siteId === 'A' ? 'siteA' : 'siteB');
        b.state = 'route';
        b.goalNode = siteId === 'A' ? 'siteA' : 'siteB';
      } else {
        setRoute(bot, altLane === 'A' ? 'siteA' : 'siteB');
        b.state = 'route';
        b.goalNode = altLane === 'A' ? 'siteA' : 'siteB';
        b.rotateTo = siteId === 'A' ? 'siteA' : 'siteB';
      }
      void laneFor;
    } else {
      const holds = ['holdA1', 'holdB1', 'galW'];
      const idx = match.actors.filter((a) => a.team !== atk && !a.isPlayer).indexOf(bot);
      const hold = holds[Math.min(idx, 2)] ?? 'holdM';
      b.holdNode = hold;
      b.faceYaw = NODE_BY_ID.get(hold)?.face ?? Math.PI;
      setRoute(bot, hold);
      b.state = 'route';
      b.goalNode = hold;
    }
  }
}

// After a plant, defenders converge: nearest defuses, the rest cover.
export function assignRetake(match) {
  const defTeam = match.device.site ? match.actors.find((a) => a.alive && a.team !== attackTeam(match.round))?.team : null;
  if (!defTeam) return;
  const siteNode = match.device.site === 'A' ? 'siteA' : 'siteB';
  const defenders = match.actors.filter((a) => a.alive && !a.isPlayer && a.team === defTeam);
  defenders.sort((p, q) => dist2(p, NODE_BY_ID.get(siteNode)) - dist2(q, NODE_BY_ID.get(siteNode)));
  defenders.forEach((bot, i) => {
    const b = bot.brain;
    if (i === 0) {
      setRoute(bot, siteNode);
      b.state = 'route';
      b.goalNode = siteNode;
      b.intent = 'defuse';
    } else {
      const cover = match.device.site === 'A' ? 'doorA' : 'doorB';
      setRoute(bot, i === 1 ? cover : 'off');
      b.state = 'route';
      b.goalNode = i === 1 ? cover : 'off';
      b.intent = null;
    }
  });
  // Attackers settle onto the planted device.
  for (const bot of match.actors) {
    if (bot.isPlayer || !bot.alive || bot.team !== attackTeam(match.round)) continue;
    const b = bot.brain;
    const post = match.device.site === 'A' ? 'holdA2' : 'holdB2';
    setRoute(bot, post);
    b.state = 'route';
    b.goalNode = post;
    b.intent = null;
  }
}

function dist2(a, n) {
  if (!n) return 0;
  return (a.pos.x - n.x) ** 2 + (a.pos.z - n.z) ** 2;
}

function moveToward(match, bot, tx, tz, dt, boxes, crouch = false) {
  const dx = tx - bot.pos.x;
  const dz = tz - bot.pos.z;
  const d = Math.hypot(dx, dz);
  bot.crouch = crouch;
  if (d < 0.25) { moveActor(boxes, bot, 0, 0, dt); return true; }
  const targetYaw = Math.atan2(-dx, -dz);
  bot.yaw = turnToward(bot.yaw, targetYaw, dt * 7);
  moveActor(boxes, bot, dx / d, dz / d, dt);
  // Stuck detection: commanded to move but barely moving (a wedged bot's speed
  // reads ~0, so speed must not gate this) — skip the blocked waypoint; at the
  // route's end, re-route from the nearest node instead.
  const moved = Math.hypot(bot.pos.x - bot.brain.lastX, bot.pos.z - bot.brain.lastZ);
  if (moved < 0.02) bot.brain.stuckT += dt; else bot.brain.stuckT = 0;
  bot.brain.lastX = bot.pos.x;
  bot.brain.lastZ = bot.pos.z;
  if (bot.brain.stuckT > 1) {
    bot.brain.stuckT = 0;
    if (bot.brain.routeIdx < bot.brain.route.length - 1) bot.brain.routeIdx++;
    else setRoute(bot, bot.brain.goalNode ?? nearestNode(bot.pos.x, bot.pos.z));
  }
  return d < 0.7;
}

export function turnToward(yaw, target, maxStep) {
  let d = target - yaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return target;
  return yaw + Math.sign(d) * maxStep;
}

function followRoute(match, bot, dt, boxes) {
  const b = bot.brain;
  if (b.routeIdx >= b.route.length) return true;
  const node = NODE_BY_ID.get(b.route[b.routeIdx]);
  if (!node) return true;
  if (moveToward(match, bot, node.x, node.z, dt, boxes)) {
    b.routeIdx++;
    return b.routeIdx >= b.route.length;
  }
  return false;
}

// One bot step. ctx: { boxes, events }.
export function stepBot(match, bot, dt, ctx) {
  const { boxes, events } = ctx;
  const b = bot.brain;
  const rng = match.rng;
  if (!bot.alive) return;
  b.intent = null;

  // --- Perception at 10 Hz, staggered per bot ---
  b.perceptT -= dt;
  if (b.perceptT <= 0) {
    b.perceptT = 0.1;
    let seen = null;
    for (const other of match.actors) {
      if (other.team === bot.team || !other.alive) continue;
      if (canSee(match, bot, other, boxes)) { seen = other; break; }
    }
    if (seen) {
      if (b.target !== seen) { b.target = seen; b.reactT = 0.3 + rng() * 0.15; b.burstLeft = 0; b.pauseT = 0; }
      b.lastSeen = { x: seen.pos.x, z: seen.pos.z, t: match.time };
      b.seenAt = match.time;
      // Callout: teammates learn the position 0.7 s later (delivered via match time).
      for (const mate of match.actors) {
        if (mate.isPlayer || mate === bot || mate.team !== bot.team || !mate.brain) continue;
        mate.brain.pendingCallout = { x: seen.pos.x, z: seen.pos.z, at: match.time + 0.7 };
      }
    }
    // Sounds: newest stimulus inside its radius pulls an investigation.
    for (let i = match.sounds.length - 1; i >= 0; i--) {
      const s = match.sounds[i];
      if (s.team === bot.team || s.t <= b.soundT) continue;
      const d = Math.hypot(s.x - bot.pos.x, s.z - bot.pos.z);
      if (d <= s.radius) {
        b.soundT = s.t;
        if (!b.target && b.state !== 'plant' && b.state !== 'defuse') {
          b.investigate = { x: s.x + (rng() - 0.5) * 4, z: s.z + (rng() - 0.5) * 4, t: match.time };
        }
        break;
      }
    }
    if (b.pendingCallout && match.time >= b.pendingCallout.at) {
      if (!b.target) b.investigate = { x: b.pendingCallout.x, z: b.pendingCallout.z, t: match.time };
      b.pendingCallout = null;
    }
  }

  // Lost sight for 1.5 s: drop the target, keep the last known position.
  if (b.target && match.time - b.seenAt > 1.5) {
    b.target = null;
    if (b.lastSeen) b.investigate = { x: b.lastSeen.x, z: b.lastSeen.z, t: match.time };
  }

  // --- Objective overrides ---
  const atk = attackTeam(match.round);
  if (match.phase === 'planted' && bot.team !== atk) {
    // Retake behaviour is assigned by assignRetake; carriers of intent head to site.
    if (b.intent !== 'defuse' && b.goalNode !== (match.device.site === 'A' ? 'siteA' : 'siteB')) {
      // fallthrough to route following below
    }
  }
  if (match.device.state === 'dropped' && bot.team === atk && !match.device.carrier) {
    const near = match.actors
      .filter((a) => a.alive && a.team === atk)
      .sort((p, q) => dist2(p, match.device.pos) - dist2(q, match.device.pos))[0];
    if (near === bot) {
      b.state = 'route';
      b.goalNode = null;
      if (moveToward(match, bot, match.device.pos.x, match.device.pos.z, dt, boxes)) {
        match.device.carrier = bot;
        match.device.state = 'carried';
        events.push({ kind: 'pickup', actor: bot });
        setRoute(bot, match.planSite === 'A' ? 'siteA' : 'siteB');
        b.goalNode = match.planSite === 'A' ? 'siteA' : 'siteB';
      }
      return;
    }
  }

  // --- Engage ---
  if (b.target && b.target.alive) {
    b.state = 'engage';
    const t = b.target;
    const dx = t.pos.x - bot.pos.x;
    const dz = t.pos.z - bot.pos.z;
    const dist = Math.hypot(dx, dz);
    const targetYaw = Math.atan2(-dx, -dz);
    bot.yaw = turnToward(bot.yaw, targetYaw, dt * 9);
    // Aim at the chest, with the bot's aim error and its accumulated recoil.
    const eye = eyeOf(bot);
    const err = (0.8 + (bot.recoilPitch || 0)) * Math.PI / 180;
    const aimY = t.groundY + 1.15 + (rng() - 0.5) * 0.2;
    const dir = {
      x: dx / dist + (rng() - 0.5) * err,
      y: (aimY - eye.y) / dist + (rng() - 0.5) * err * 0.5,
      z: dz / dist + (rng() - 0.5) * err,
    };
    const dl = Math.hypot(dir.x, dir.y, dir.z) || 1;
    dir.x /= dl; dir.y /= dl; dir.z /= dl;
    bot.pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
    // Brake to shoot: accuracy pays for stillness.
    moveActor(boxes, bot, 0, 0, dt);
    if (bot.recoilPitch) bot.recoilPitch = Math.max(0, bot.recoilPitch - dt * 6);
    if (b.reactT > 0) { b.reactT -= dt; return; }
    if (bot.weapon.mag === 0) { startReload(bot.weapon, events, bot); return; }
    if (bot.weapon.reloading > 0) return;
    if (b.pauseT > 0) { b.pauseT -= dt; return; }
    if (b.burstLeft <= 0) { b.burstLeft = 3 + Math.floor(rng() * 3); }
    fireWeapon(match, bot, eye, dir, boxes, rng, events);
    if (events.some((e) => e.kind === 'shot' && e.actor === bot)) {
      b.burstLeft--;
      if (b.burstLeft <= 0) b.pauseT = 0.25 + rng() * 0.2;
    }
    return;
  }

  // --- Plant / defuse intent at the socket ---
  const site = SITES[match.planSite] ?? SITES.A;
  if (match.phase === 'live' && bot.team === atk && match.device.carrier === bot) {
    const s = SITES[match.planSite];
    if (bot.pos.x > s.x0 && bot.pos.x < s.x1 && bot.pos.z > s.z0 && bot.pos.z < s.z1) {
      if (Math.hypot(bot.pos.x - s.socket.x, bot.pos.z - s.socket.z) > 1.6) {
        b.state = 'route';
        moveToward(match, bot, s.socket.x, s.socket.z, dt, boxes);
        return;
      }
      b.state = 'plant';
      b.intent = 'plant';
      moveActor(boxes, bot, 0, 0, dt);
      bot.yaw = turnToward(bot.yaw, Math.PI, dt * 5); // watch the approach while planting
      return;
    }
  }
  if (match.phase === 'planted' && bot.team !== atk) {
    const s = SITES[match.device.site];
    const d = Math.hypot(bot.pos.x - s.socket.x, bot.pos.z - s.socket.z);
    const isDefuser = match.actors
      .filter((a) => a.alive && a.team === bot.team)
      .sort((p, q) => dist2(p, s.socket) - dist2(q, s.socket))[0] === bot;
    if (isDefuser) {
      if (d > 1.6) {
        b.state = 'route';
        moveToward(match, bot, s.socket.x, s.socket.z, dt, boxes);
        return;
      }
      b.state = 'defuse';
      b.intent = 'defuse';
      moveActor(boxes, bot, 0, 0, dt);
      return;
    }
  }

  // --- Investigate ---
  if (b.investigate && match.time - b.investigate.t < 6) {
    b.state = 'investigate';
    const stop = 3;
    const dx = b.investigate.x - bot.pos.x;
    const dz = b.investigate.z - bot.pos.z;
    if (Math.hypot(dx, dz) > stop) {
      moveToward(match, bot, b.investigate.x, b.investigate.z, dt, boxes);
      return;
    }
    // Arrived: look toward the stimulus for a moment, then give up.
    bot.yaw = turnToward(bot.yaw, Math.atan2(-dx, -dz), dt * 4);
    moveActor(boxes, bot, 0, 0, dt);
    if (match.time - b.investigate.t > 3) b.investigate = null;
    return;
  }
  b.investigate = null;

  // --- Route / hold ---
  if (b.state !== 'hold' || !b.holdNode || reachedHold(bot)) {
    const done = followRoute(match, bot, dt, boxes);
    if (done) {
      if (bot.team !== atk && match.phase !== 'planted') {
        b.state = 'hold';
        b.holdNode = b.goalNode ?? b.holdNode;
      } else if (bot.team === atk && b.rotateTo && b.goalNode !== b.rotateTo) {
        // The off-lane attacker rotates to the plan site once arrived.
        setRoute(bot, b.rotateTo);
        b.goalNode = b.rotateTo;
        b.rotateTo = null;
      } else {
        b.state = 'hold';
      }
    } else {
      b.state = 'route';
    }
  }
  if (b.state === 'hold') {
    moveActor(boxes, bot, 0, 0, dt);
    const node = NODE_BY_ID.get(b.holdNode ?? '');
    const face = node?.face ?? b.faceYaw ?? Math.PI;
    // Scan a 40-degree arc around the authored facing.
    const scan = Math.sin(match.time * 0.6 + bot.rngOffset) * 0.35;
    bot.yaw = turnToward(bot.yaw, face + scan, dt * 3);
    bot.crouch = bot.team !== atk; // defenders hold crouched behind cover
  }
  void site;
}

function reachedHold(bot) {
  const node = NODE_BY_ID.get(bot.brain.holdNode ?? '');
  if (!node) return false;
  return Math.hypot(node.x - bot.pos.x, node.z - bot.pos.z) < 1;
}
