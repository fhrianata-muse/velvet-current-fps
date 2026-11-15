// Saintmere Hall — boot and the one loop. A fixed 60 Hz simulation (state.js STEP)
import * as THREE from 'three';
import { PALETTE, makeRng } from './palette.js';
import { createMatch, STEP, attackTeam } from './state.js';
import { buildMap, SITES } from './map.js';
import { createFigure, createViewmodel, createDevice } from './figures.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { createActors, resetRound, stepMatch, buyItem, equipSlot } from './game.js';
import { fireWeapon, startReload, throwGrenade, spreadRad, newWeapon } from './weapons.js';
import { eyeOf, lookDir } from './player.js';
import { initTextures, envTexture } from './textures.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '7', 10) || 7;
const rng = makeRng(seed * 1000 + 17);

// ---------- Scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(shot ? 1 : Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.getElementById('game').appendChild(renderer.domElement);

initTextures(renderer.capabilities.getMaxAnisotropy());
const scene = new THREE.Scene();
// Image-based light from the painted sky canvas (core PMREM, no addons).
const envTex = envTexture();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromEquirectangular(envTex).texture;
scene.environmentIntensity = 0.55;
scene.background = envTex;
scene.backgroundIntensity = 1.0;
scene.fog = new THREE.Fog(0xe6edf2, 80, 160);
const camera = new THREE.PerspectiveCamera(73, window.innerWidth / window.innerHeight, 0.05, 160);
scene.add(camera);
const vmLight = new THREE.PointLight(0xfff1cf, 2.6, 4.5, 1.4); // viewmodel fill light
camera.add(vmLight);

const hemi = new THREE.HemisphereLight(0xaecfe8, 0xd9d2b0, 0.42); // cool sky fill under the warm key
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff6e6, 3.5);
sun.position.set(12, 32, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34; sun.shadow.camera.bottom = -34;
sun.shadow.camera.far = 100;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);
// Practicals: warm accents.
for (const [x, y, z, c, i, d] of [
  [0, 3.4, 16, 0xfff1cf, 14, 14], [0, 3.4, -16, 0xfff1cf, 14, 14],
  [-17, 3.4, -15, 0xffe2b0, 12, 14], [18, 3.4, -15, 0xffe2b0, 12, 14],
  [0, 5.2, -1, 0xffdf9e, 18, 16],
]) {
  const p = new THREE.PointLight(c, i, d, 1.6);
  p.position.set(x, y, z);
  scene.add(p);
}

const world = buildMap(scene);
const boxes = world.boxes;

// ---------- Match ----------
const match = createMatch(rng);
createActors(match);
const events = [];
resetRound(match, events);
events.length = 0;

const player = match.actors.find((a) => a.isPlayer);
const figures = new Map();
const teamCount = { siphon: 0, still: 0 };
for (const a of match.actors) if (!a.isPlayer) a.teamIdx = teamCount[a.team]++;
// Roles rotate with the round.
let figRound = match.round;
function buildFigure(a) {
  const fig = createFigure(a.team, (a.teamIdx + figRound - 1) % 3);
  fig.setGun(a.weapon.def.id);
  a.figure = fig;
  scene.add(fig.group);
  figures.set(a.id, fig);
}
for (const a of match.actors) if (!a.isPlayer) buildFigure(a);
function rebuildFigures() {
  for (const a of match.actors) {
    if (a.isPlayer) continue;
    scene.remove(figures.get(a.id).group);
    buildFigure(a);
  }
}
const deviceMesh = createDevice();
scene.add(deviceMesh.group);
// Amber light thrown by the planted Leech.
const deviceLight = new THREE.PointLight(0xff9500, 0, 4.5, 1.8);
scene.add(deviceLight);
const grenadeMeshes = [];
{
  const geo = new THREE.SphereGeometry(0.09, 10, 8);
  const mat = new THREE.MeshLambertMaterial({ color: PALETTE.brass });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    scene.add(m);
    grenadeMeshes.push(m);
  }
}
let viewmodel = null;
let viewmodelId = null;
function syncViewmodel() {
  const id = player.weapon.def.id;
  if (id === viewmodelId) return;
  if (viewmodel) camera.remove(viewmodel.group);
  viewmodel = createViewmodel(id);
  viewmodelId = id;
  camera.add(viewmodel.group);
}
syncViewmodel();

// ---------- Transient effects (pooled) ----------
const fx = {
  tracers: [],
  flashes: [],
  impacts: [],
  boom: null,
};
{
  const tGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]);
  for (let i = 0; i < 24; i++) {
    const line = new THREE.Line(tGeo.clone(), new THREE.LineBasicMaterial({ color: PALETTE.opal, transparent: true, opacity: 0 }));
    line.visible = false;
    line.frustumCulled = false;
    scene.add(line);
    fx.tracers.push({ line, ttl: 0 });
  }
  const fGeo = new THREE.SphereGeometry(0.16, 8, 6);
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(fGeo, new THREE.MeshBasicMaterial({ color: PALETTE.opal, transparent: true, opacity: 0 }));
    s.visible = false;
    scene.add(s);
    fx.flashes.push({ mesh: s, ttl: 0 });
  }
  const boomMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0 }));
  boomMesh.visible = false;
  scene.add(boomMesh);
  fx.boom = { mesh: boomMesh, ttl: 0 };
  const flashLight = new THREE.PointLight(0xffe9bb, 0, 18, 1.8);
  scene.add(flashLight);
  fx.light = flashLight;
}
function spawnTracer(from, to) {
  const t = fx.tracers.find((x) => x.ttl <= 0) ?? fx.tracers[0];
  const pos = t.line.geometry.attributes.position;
  pos.setXYZ(0, from.x, from.y, from.z);
  if (shot) to = { x: from.x + (to.x - from.x) * 0.15, y: from.y + (to.y - from.y) * 0.15, z: from.z + (to.z - from.z) * 0.15 }; // stills: a short muzzle streak, never a full-length hairline
  pos.setXYZ(1, to.x, to.y, to.z);
  pos.needsUpdate = true;
  t.line.visible = true;
  t.ttl = 0.09;
}
function spawnFlash(point, scale = 1) {
  const f = fx.flashes.find((x) => x.ttl <= 0) ?? fx.flashes[0];
  f.mesh.position.set(point.x, point.y, point.z);
  f.mesh.scale.setScalar(scale);
  f.mesh.visible = true;
  f.ttl = 0.07;
  fx.light.position.set(point.x, point.y + 0.4, point.z);
  fx.light.intensity = 26;
}
function stepFx(dt) {
  for (const t of fx.tracers) {
    if (t.ttl > 0) { t.ttl -= dt; t.line.material.opacity = Math.max(0, t.ttl / 0.09) * 0.75; if (t.ttl <= 0) t.line.visible = false; }
  }
  for (const f of fx.flashes) {
    if (f.ttl > 0) { f.ttl -= dt; f.mesh.material.opacity = Math.max(0, f.ttl / 0.07); if (f.ttl <= 0) f.mesh.visible = false; }
  }
  if (fx.boom.ttl > 0) {
    fx.boom.ttl -= dt;
    const k = 1 - fx.boom.ttl / 0.5;
    fx.boom.mesh.scale.setScalar(1 + k * 6);
    fx.boom.mesh.material.opacity = Math.max(0, 0.55 * (1 - k));
    if (fx.boom.ttl <= 0) fx.boom.mesh.visible = false;
  }
  if (fx.light.intensity > 0) fx.light.intensity = Math.max(0, fx.light.intensity - dt * 260);
  if (match.shake > 0) match.shake = Math.max(0, match.shake - dt * 2.2);
}

// ---------- Audio + HUD wiring ----------
const audio = createAudio();
const hud = createHud();
let bannerText = { win: 'ROUND WON', lose: 'ROUND LOST' };

function actorName(a) { return a.isPlayer ? 'You' : a.id; }

function processEvents(now) {
  for (const e of events) {
    switch (e.kind) {
      case 'shot': {
        // Bots get a world-space muzzle flash.
        if (!e.actor.isPlayer) spawnFlash(muzzleOf(e.actor), 1);
        if (e.actor.isPlayer) {
          audio.shot(e.weapon);
          if (viewmodel) viewmodel.flash.material.opacity = 0.95;
        } else {
          const d = Math.hypot(e.actor.pos.x - player.pos.x, e.actor.pos.z - player.pos.z);
          if (d < 26) audio.enemyShot();
        }
        break;
      }
      case 'tracer': spawnTracer(e.from, e.to); break;
      case 'impact': spawnFlash(e.point, 0.4); break;
      case 'dry': if (e.actor.isPlayer) audio.dryFire(); break;
      case 'reload-start': if (e.actor.isPlayer) audio.reloadStart(); break;
      case 'damage':
        if (e.attacker?.isPlayer) { hud.hitmark(now, e.head); if (e.head) audio.headshot(); else audio.hit(); }
        if (e.target.isPlayer) {
          audio.hurt();
          hud.els.vignette.style.boxShadow = 'inset 0 0 120px rgba(146,44,32,0.55)';
          setTimeout(() => { hud.els.vignette.style.boxShadow = 'inset 0 0 120px rgba(146,44,32,0)'; }, 130);
        }
        break;
      case 'kill':
        hud.feed(match, `<b>${actorName(e.attacker)}</b> ▸ ${actorName(e.target)}${e.head ? ' (headshot)' : ''}`);
        if (e.target.isPlayer) hud.banner('YOU ARE DOWN', 'Spectating until the round ends', 2.2, now);
        break;
      case 'throw': if (e.actor.isPlayer) audio.throwWhoosh(); break;
      case 'bounce': audio.bounce(); break;
      case 'explosion':
        audio.explosion();
        fx.boom.mesh.position.set(e.point.x, e.point.y + 0.4, e.point.z);
        fx.boom.mesh.visible = true;
        fx.boom.ttl = 0.5;
        match.shake = Math.min(1, match.shake + 0.7);
        break;
      case 'plant-beep': audio.plantBeep(e.step); break;
      case 'planted':
        audio.planted();
        hud.feed(match, `Pulse Leech planted at <b>Site ${e.site}</b>`);
        hud.banner('LEECH PLANTED', `Site ${e.site} — ${attackTeam(match.round) === player.team ? 'defend it' : 'defuse it'}`, 2.4, now);
        break;
      case 'defused':
        hud.feed(match, 'Pulse Leech <b>defused</b>');
        hud.banner('LEECH DEFUSED', '', 2.2, now);
        break;
      case 'pulse': audio.pulse(e.urgency); break;
      case 'defuse-tick': audio.defuseTick(); break;
      case 'buy': if (e.actor.isPlayer) { audio.buy(); hud.feed(match, `Bought <b>${e.item}</b>`); } break;
      case 'round-start':
        hud.banner(`ROUND ${e.round}`, player.team === e.attackTeam ? 'Your team attacks' : 'Your team defends', 2.2, now);
        break;
      case 'round-end': {
        const won = e.winner === player.team;
        if (won) audio.roundWin(); else audio.roundLose();
        hud.banner(won ? bannerText.win : bannerText.lose, e.reason, 3.2, now);
        hud.feed(match, `<b>${e.winner === 'siphon' ? 'Siphon' : 'Stillguard'}</b> take the round — ${e.reason}`);
        break;
      }
      case 'match-end':
        hud.showOverlay(
          e.winner === player.team ? 'THE HALL IS YOURS' : 'THE STILLGUARD HOLD',
          `Final score — Siphon ${match.score.siphon}, Stillguard ${match.score.still}. Click to play again.`,
          'Play again',
        );
        break;
      case 'footstep': if (e.actor.isPlayer) audio.step(); break;
      case 'pickup': hud.feed(match, `<b>${actorName(e.actor)}</b> recovered the Pulse Leech`); break;
      default: break;
    }
  }
  events.length = 0;
}

function muzzleOf(actor) {
  const eye = eyeOf(actor);
  const dir = lookDir(actor);
  return { x: eye.x + dir.x * 0.7, y: eye.y - 0.12 + dir.y * 0.7, z: eye.z + dir.z * 0.7 };
}

// ---------- Player actions ----------
const input = createInput(renderer.domElement, (locked) => {
  if (shot) return;
  if (!locked && match.phase !== 'over' && started) {
    hud.showOverlay('Saintmere Hall', 'Paused — click to return to the hall.', 'Resume');
  } else if (locked) {
    hud.hideOverlay();
  }
});
let started = false;
hud.onPlay(() => {
  audio.unlock();
  audio.startHum();
  if (match.phase === 'over') {
    match.score.siphon = 0; match.score.still = 0; match.round = 1;
    for (const a of match.actors) a.money = 800;
    resetRound(match, events);
  }
  started = true;
  hud.hideOverlay();
  renderer.domElement.requestPointerLock();
});
hud.onBuy((item) => {
  if (!buyItem(match, player, item, events)) audio.denied();
  processEvents(match.time);
});

let prevFiring = false;
function playerActions(dt) {
  const s = input.state;
  if (!player.alive || match.phase === 'over') return;
  // Intent: plant or defuse by holding E in the right place.
  player.intent = null;
  if (s.interactHeld) {
    const atk = attackTeam(match.round);
    if (match.phase === 'live' && player.team === atk && match.device.carrier === player) {
      const site = SITES[match.planSite];
      if (Math.hypot(player.pos.x - site.socket.x, player.pos.z - site.socket.z) < 1.8) player.intent = 'plant';
    }
    if (match.phase === 'planted' && player.team !== atk && match.device.site) {
      const site = SITES[match.device.site];
      if (Math.hypot(player.pos.x - site.socket.x, player.pos.z - site.socket.z) < 1.8) player.intent = 'defuse';
    }
  }
  // Firing.
  const firing = s.firing && s.locked || (shot ? s.firing : false);
  const edge = firing && !prevFiring;
  prevFiring = firing;
  if (match.phase === 'live' || match.phase === 'planted') {
    const w = player.weapon;
    if ((w.def.auto && firing) || (!w.def.auto && edge)) {
      const before = w.mag;
      fireWeapon(match, player, eyeOf(player), lookDir(player), boxes, rng, events);
      if (w.mag === before && w.mag <= 0) { /* dry fire event already pushed */ }
    }
  }
  if (input.takePressed('KeyR')) startReload(player.weapon, events, player);
  if (input.takePressed('KeyG') && (match.phase === 'live' || match.phase === 'planted')) {
    throwGrenade(match, player, eyeOf(player), lookDir(player), events);
  }
  if (match.phase === 'buy') {
    const map = { Digit2: 'rill24', Digit3: 'bastion5', Digit4: 'knell8', Digit5: 'grenade' };
    for (const [code, item] of Object.entries(map)) {
      if (input.takePressed(code)) { if (!buyItem(match, player, item, events)) audio.denied(); }
    }
  } else {
    if (input.takePressed('Digit1')) equipSlot(player, 'sidearm');
    if (input.takePressed('Digit2')) equipSlot(player, 'primary');
  }
  if (input.takePressed('Tab')) hud.toggleBotStates();
}

// Scripted stand-in input for staged captures.
function scriptedInput(keys = []) {
  const set = new Set(keys);
  return {
    state: { keys: set, firing: false, locked: false, interactHeld: set.has('KeyE'), pressed: new Set() },
    takeLook: () => ({ dx: 0, dy: 0 }),
    takePressed: () => false,
    clearPressed: () => {},
  };
}

// ---------- Staged captures ----------
function givePrimary(actor, id, magFrac = 1) {
  actor.primaryId = id;
  actor.primaryState = newWeapon(id);
  actor.primaryState.mag = Math.max(1, Math.round(actor.primaryState.def.mag * magFrac));
  actor.weapon = actor.primaryState;
}
function place(actor, x, z, yaw) {
  actor.pos.x = x; actor.pos.z = z;
  actor.vel.x = 0; actor.vel.z = 0;
  actor.yaw = yaw; actor.pitch = 0;
  actor.groundY = 0;
}
function stageShot(n) {
  const allies = match.actors.filter((a) => !a.isPlayer && a.team === 'siphon');
  const enemies = match.actors.filter((a) => a.team === 'still');
  const stillInput = scriptedInput();
  if (n === '1') {
    // Grand Hall firefight, round 1.
    match.phase = 'live'; match.phaseTime = 74;
    givePrimary(player, 'bastion5', 0.7);
    player.health = 62;
    place(player, -0.6, 6.4, 0.45);
    player.pitch = -0.02;
    place(allies[0], -6.4, 1.8, -1.1);
    place(allies[1], 3.2, 5.2, -0.7);
    place(enemies[0], -3.3, -0.3, 2.6);
    place(enemies[1], 4.9, 1.8, Math.PI);
    place(enemies[2], 10.8, -3.5, Math.PI);
    for (let i = 0; i < 30; i++) stepMatch(match, STEP, { boxes, events, input: stillInput });
    events.length = 0;
    // One live exchange, frozen mid-burst.
    const e = enemies.find((x) => x.alive) ?? enemies[0];
    e.yaw = Math.atan2(-(player.pos.x - e.pos.x), -(player.pos.z - e.pos.z));
    e.pitch = -0.10; // rounds land on the player's torso line, face clear
    e.health = 100;
    player.health = 100;
    const burst = (a) => { for (let i = 0; i < 3; i++) { a.weapon.cooldown = 0; fireWeapon(match, a, eyeOf(a), lookDir(a), boxes, rng, events); } };
    burst(e); burst(player);
    processEvents(match.time);
    match.feed.length = 0; // no stale feed lines
    player.alive = true;
    player.health = 62; // pin the staged state last: in the fight, not fresh, not dead
    e.alive = true; e.health = 70; e.deadTime = 0; // the shooter stays up, mid-burst
    for (const a of match.actors) if (!a.alive) a.deadTime = 0.6; // a fallen figure sells the fight
    place(allies[1], -1.8, 0.8, 0.95); // second ally advancing into the sightline
    allies[1].walkPhase = 2.4; // mid-stride
    player.crouch = true; // lower camera, looking up the hall
  } else if (n === '2') {
    // Plant channel at Site A.
    match.phase = 'live'; match.phaseTime = 58;
    match.planSite = 'A';
    match.device.carrier = player;
    givePrimary(player, 'bastion5', 0.85);
    place(player, -18.9, -13.8, -0.7);
    player.pitch = -0.1;
    player.intent = 'plant';
    place(allies[0], -12.9, -16.2, -Math.PI / 2);
    place(allies[1], -9.2, 0, -1.4);
    place(enemies[0], 0, -17, Math.PI);
    place(enemies[1], 5, -10.6, Math.PI);
    place(enemies[2], 17, 3, Math.PI);
    match.channel = { actor: player, kind: 'plant', t: 1.5, need: 3, site: 'A', x: player.pos.x, z: player.pos.z };
    const holdE = scriptedInput(['KeyE']);
    holdE.state.interactHeld = true;
    player.intent = 'plant';
    for (let i = 0; i < 12; i++) { player.intent = 'plant'; stepMatch(match, STEP, { boxes, events, input: holdE }); }
    events.length = 0;
    player.intent = 'plant';
    // The covering ally opens fire down the east door.
    const cover = allies[0];
    givePrimary(cover, 'rill24', 0.9);
    cover.yaw = -1.51; cover.pitch = -0.03; // onto the Stillguard at the far door
    for (let i = 0; i < 3; i++) { cover.weapon.cooldown = 0; fireWeapon(match, cover, eyeOf(cover), lookDir(cover), boxes, rng, events); }
    processEvents(match.time);
    for (const a of match.actors) if (!a.alive) a.deadTime = 0.6;
  } else if (n === '3') {
    // Retake at Site B, round 2.
    match.round = 2;
    match.score.siphon = 1; match.score.still = 0;
    match.phase = 'planted';
    match.planSite = 'B';
    match.device.state = 'planted';
    match.device.site = 'B';
    match.device.pos = { x: SITES.B.socket.x, z: SITES.B.socket.z };
    match.device.fuse = 18.4;
    match.device.carrier = null;
    givePrimary(player, 'rill24', 0.8);
    place(player, 17.2, -11.6, 0.24);
    place(allies[0], 16.5, -16.2, Math.PI);
    allies[0].intent = 'defuse';
    place(allies[1], 9.2, -4.5, -0.8);
    place(enemies[0], 13.6, -15.8, Math.PI + 0.4);
    place(enemies[1], 21.5, -13.6, Math.PI);
    enemies[2].alive = false; enemies[2].health = 0;
    match.channel = { actor: allies[0], kind: 'defuse', t: 2.3, need: 5, site: 'B', x: allies[0].pos.x, z: allies[0].pos.z };
    for (let i = 0; i < 12; i++) { allies[0].intent = 'defuse'; stepMatch(match, STEP, { boxes, events, input: stillInput }); }
    events.length = 0;
    allies[0].intent = 'defuse';
  } else if (n === '4') {
    // Buy phase at the porter's desk, round 3.
    match.round = 3;
    match.score.siphon = 1; match.score.still = 1;
    match.phase = 'buy'; match.phaseTime = 8;
    match.result = { winner: 'still', reason: 'Pulse Leech defused' };
    player.money = 2650;
    givePrimary(player, 'bastion5', 1);
    place(player, 0, 18.2, 0);
    place(allies[0], -3.4, 19.4, 0.3);
    place(allies[1], 3.4, 19.4, -0.3);
    place(enemies[0], -3, -17.5, Math.PI);
    place(enemies[1], 0, -18.5, Math.PI);
    place(enemies[2], 3, -17.5, Math.PI);
  }
}

// ---------- Sync + loop ----------
const camTmp = { x: 0, y: 0, z: 0 };
function syncScene(now) {
  if (match.round !== figRound) { figRound = match.round; rebuildFigures(); }
  for (const a of match.actors) {
    if (a.isPlayer) continue;
    const fig = figures.get(a.id);
    fig.setGun(a.weapon.def.id); // the held model follows the bot's bought class
    const g = fig.group;
    g.position.set(a.pos.x, a.groundY, a.pos.z);
    g.userData.groundY = a.groundY;
    g.rotation.y = a.yaw;
    a.walkPhase = (a.walkPhase || 0) + (a.speed || 0) * 0.016 * 2.4;
    fig.pose(a.alive ? a.walkPhase : 0, a.crouch ? 1 : 0, a.alive ? 0 : Math.min(1, a.deadTime * 2), now);
    g.visible = true;
  }
  // Device: carried, dropped, or on the socket.
  const d = match.device;
  const planting = match.channel?.kind === 'plant' ? match.channel : null;
  deviceLight.intensity = 0;
  if (planting) {
    // Mid-plant the Leech is on the socket, opening.
    const s = SITES[planting.site].socket;
    deviceLight.position.set(s.x, 1.1, s.z);
    deviceLight.intensity = 5;
    deviceMesh.group.position.set(s.x, 0, s.z);
    deviceMesh.group.rotation.y = 0;
    deviceMesh.setPlanted(0.3 + 0.7 * (planting.t / planting.need));
    deviceMesh.group.visible = true;
  } else if (d.state === 'carried' && d.carrier) {
    const c = d.carrier;
    deviceMesh.group.position.set(c.pos.x + Math.sin(c.yaw) * 0.3, c.groundY + 1.15, c.pos.z + Math.cos(c.yaw) * 0.3);
    deviceMesh.group.rotation.y = c.yaw;
    deviceMesh.setCarried();
    deviceMesh.group.visible = !c.isPlayer;
  } else if (d.state === 'planted' || d.state === 'defused' || d.state === 'exploded') {
    deviceLight.position.set(d.pos.x, 1.1, d.pos.z);
    deviceLight.intensity = 5;
    deviceMesh.group.position.set(d.pos.x, 0, d.pos.z);
    deviceMesh.group.rotation.y = 0;
    deviceMesh.setPlanted(Math.max(0, d.fuse) / 30);
    deviceMesh.group.visible = true;
  } else if (d.state === 'dropped' && d.pos) {
    deviceMesh.group.position.set(d.pos.x, 0, d.pos.z);
    deviceMesh.setCarried();
    deviceMesh.group.visible = true;
  }
  // Grenades.
  grenadeMeshes.forEach((m, i) => {
    const g = match.grenades[i];
    m.visible = !!g;
    if (g) m.position.set(g.x, g.y, g.z);
  });
  // The armillary turns, slowly.
  world.turbine.rotation.z += 0.0016;
  // Camera: the player's eye, with recoil shake and a death drop.
  const eye = eyeOf(player);
  const drop = player.alive ? 0 : 0.9;
  camTmp.x = eye.x + (Math.random() - 0.5) * match.shake * 0.05;
  camTmp.y = eye.y - drop + (Math.random() - 0.5) * match.shake * 0.05;
  camTmp.z = eye.z;
  camera.position.set(camTmp.x, camTmp.y, camTmp.z);
  camera.rotation.set(0, 0, 0);
  camera.rotateY(player.yaw);
  camera.rotateX(player.pitch);
  // Viewmodel life: recoil kick, reload dip, muzzle flash fade.
  syncViewmodel();
  if (viewmodel) {
    const w = player.weapon;
    const kick = (player.recoilPitch || 0) * 0.012;
    viewmodel.group.position.set(0.26, -0.22 - (w.reloading > 0 ? 0.09 : 0) + kick * 0.4, -0.45 + kick);
    viewmodel.group.rotation.x = kick + (w.reloading > 0 ? -0.5 : 0);
    if (!shot && viewmodel.flash.material.opacity > 0) viewmodel.flash.material.opacity = Math.max(0, viewmodel.flash.material.opacity - 0.35);
    viewmodel.group.visible = player.alive;
  }
}

let accumulator = 0;
let lastTime = performance.now();
let frozen = false;
function frame(nowMs) {
  requestAnimationFrame(frame);
  const now = nowMs / 1000;
  let dt = (nowMs - lastTime) / 1000;
  lastTime = nowMs;
  if (dt > 0.25) dt = 0.25;
  if (!frozen) {
    accumulator += dt;
    while (accumulator >= STEP) {
      if (!shot) playerActions(STEP);
      stepMatch(match, STEP, { boxes, events, input });
      processEvents(match.time);
      accumulator -= STEP;
    }
  }
  stepFx(shot ? 0 : Math.min(dt, 0.05)); // staged captures keep their flashes and tracers
  syncScene(now);
  const spreadDeg = (spreadRad(player.weapon, player.speed || 0, player.crouch) * 180) / Math.PI;
  hud.update(match, player, 4 + spreadDeg * 7, match.time);
  renderer.render(scene, camera);
}

window.__velvet = { match, player, SITES, camera, scene, renderer, getViewmodel: () => viewmodel };
if (shot) {
  hud.hideOverlay();
  stageShot(shot);
  syncScene(0);
  hud.update(match, player, 6, match.time);
  renderer.render(scene, camera);
  renderer.render(scene, camera);
  frozen = true;
  window.__shotReady = true;
}
requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
