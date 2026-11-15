// Actor movement, shared by the player and the bots: acceleration and braking, a
// collision circle resolved per axis against the map's box table, crouching with an
// eye-height change, and ground height from the floor/ramp table (deck, pool, gallery).
// Accuracy follows the real velocity this produces, so moving fire is honestly worse.
import { MOVE } from './state.js';
import { groundHeight, circleBlocked } from './map.js';

export function eyeOf(actor) {
  return {
    x: actor.pos.x,
    y: actor.groundY + (actor.crouch ? MOVE.eyeCrouch : MOVE.eyeStand),
    z: actor.pos.z,
  };
}

export function lookDir(actor) {
  const cp = Math.cos(actor.pitch);
  return {
    x: -Math.sin(actor.yaw) * cp,
    y: Math.sin(actor.pitch),
    z: -Math.cos(actor.yaw) * cp,
  };
}

// Advance one actor. wishX/wishZ are a desired velocity direction (length <= 1).
export function moveActor(boxes, actor, wishX, wishZ, dt) {
  const maxSpeed = actor.crouch ? MOVE.crouchSpeed : MOVE.walkSpeed;
  const tx = wishX * maxSpeed;
  const tz = wishZ * maxSpeed;
  const accelerating = Math.abs(tx) > 0.01 || Math.abs(tz) > 0.01;
  const rate = accelerating ? MOVE.accel : MOVE.brake;
  const dvx = tx - actor.vel.x;
  const dvz = tz - actor.vel.z;
  const dv = Math.hypot(dvx, dvz);
  const maxDv = rate * dt;
  if (dv > 0) {
    const s = Math.min(1, maxDv / dv);
    actor.vel.x += dvx * s;
    actor.vel.z += dvz * s;
  }
  const height = actor.crouch ? MOVE.heightCrouch : MOVE.heightStand;
  // Per-axis integration so actors slide along walls instead of sticking.
  const nx = actor.pos.x + actor.vel.x * dt;
  if (!circleBlocked(boxes, nx, actor.pos.z, MOVE.radius, actor.groundY, height)) actor.pos.x = nx;
  else actor.vel.x = 0;
  const nz = actor.pos.z + actor.vel.z * dt;
  if (!circleBlocked(boxes, actor.pos.x, nz, MOVE.radius, actor.groundY, height)) actor.pos.z = nz;
  else actor.vel.z = 0;
  actor.pos.x = Math.max(-23.6, Math.min(23.6, actor.pos.x));
  actor.pos.z = Math.max(-19.6, Math.min(19.6, actor.pos.z));
  actor.groundY = groundHeight(actor.pos.x, actor.pos.z, actor.groundY);
  actor.speed = Math.hypot(actor.vel.x, actor.vel.z);
  // Footstep stimuli and walk-cycle phase.
  if (actor.speed > 2.5) {
    actor.stepPhase = (actor.stepPhase || 0) + actor.speed * dt * 1.6;
    actor.stepT = (actor.stepT || 0) - dt;
  }
  return actor.speed;
}

// The player's own step: read the input state, turn the camera, build a wish direction.
export function stepPlayer(match, actor, input, dt, boxes, events) {
  const look = input.takeLook();
  const sens = 0.0021;
  actor.yaw -= look.dx * sens;
  actor.pitch -= look.dy * sens;
  actor.pitch = Math.max(-1.45, Math.min(1.45, actor.pitch));
  // Recoil recovery: the kick eases back after each shot.
  if (actor.recoilPitch) {
    actor.pitch += (actor.recoilPitch * Math.PI / 180) * Math.min(1, dt * 10) * 0.35;
    actor.recoilPitch *= Math.max(0, 1 - dt * 9);
    if (actor.recoilPitch < 0.01) actor.recoilPitch = 0;
  }
  const k = input.state.keys;
  actor.crouch = k.has('ControlLeft') || k.has('KeyC');
  let fx = 0;
  let fz = 0;
  if (k.has('KeyW')) fz += 1;
  if (k.has('KeyS')) fz -= 1;
  if (k.has('KeyA')) fx -= 1;
  if (k.has('KeyD')) fx += 1;
  const sin = Math.sin(actor.yaw);
  const cos = Math.cos(actor.yaw);
  // Forward is -z rotated by yaw; right is +x rotated by yaw.
  let wishX = (fx * cos - fz * sin);
  let wishZ = (-fx * sin - fz * cos);
  const len = Math.hypot(wishX, wishZ);
  if (len > 1) { wishX /= len; wishZ /= len; }
  moveActor(boxes, actor, wishX, wishZ, dt);
  if (actor.speed > 2.5) {
    if (actor.stepT <= 0) {
      actor.stepT = 0.34;
      events.push({ kind: 'footstep', actor });
      match.sounds.push({ x: actor.pos.x, z: actor.pos.z, radius: 9, kind: 'step', team: actor.team, t: match.time });
    }
  }
}
