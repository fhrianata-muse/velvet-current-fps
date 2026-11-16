// Gunplay: hitscan; spread grows with movement and sustained fire.
import { WEAPONS, GRENADE } from './state.js';
import { raycastBoxes } from './map.js';
import { actorHitboxes, rayAabb } from './figures.js';

export function newWeapon(id) {
	const def = WEAPONS[id];
	return { def, mag: def.mag, reserve: def.reserve, cooldown: 0, bloom: 0, bloomIdle: 0, reloading: 0 };
}

export function refill(w) {
	w.mag = w.def.mag;
	w.reserve = w.def.reserve;
	w.reloading = 0;
	w.bloom = 0;
}

export function spreadRad(w, speed, crouch) {
	const moveFrac = Math.min(1, speed / 4.2);
	let deg = w.def.spreadBase + w.def.spreadMove * moveFrac * moveFrac + w.bloom;
	if (crouch) deg *= 0.65;
	return (deg * Math.PI) / 180;
}

export function stepWeapon(w, dt) {
	if (w.cooldown > 0) w.cooldown -= dt;
	if (w.reloading > 0) {
		w.reloading -= dt;
		if (w.reloading <= 0) {
			const need = w.def.mag - w.mag;
			const take = Math.min(need, w.reserve);
			w.mag += take;
			w.reserve -= take;
		}
	}

	if (w.bloomIdle > 0) w.bloomIdle -= dt;
	else if (w.bloom > 0) w.bloom = Math.max(0, w.bloom - 3 * dt);
}

export function startReload(w, events, actor) {
	if (w.reloading > 0 || w.mag >= w.def.mag || w.reserve <= 0) return false;
	w.reloading = w.def.reload;
	events.push({ kind: 'reload-start', actor });
	return true;
}

function applyDamage(match, target, amount, attacker, head, events) {
	if (!target.alive) return;
	target.health -= amount;
	events.push({ kind: 'damage', target, attacker, amount, head });
	if (target.health <= 0) {
		target.health = 0;
		target.alive = false;
		target.deadTime = 0;
		if (match.device.carrier === target) { const d = match.device; d.state = 'dropped'; d.pos = { x: target.pos.x, z: target.pos.z }; d.carrier = null; }
		if (attacker && attacker !== target) {
			attacker.money = Math.min(9000, (attacker.money ?? 0) + 200);
			attacker.kills = (attacker.kills ?? 0) + 1;
		}
		events.push({ kind: 'kill', target, attacker, head });
	}
}

export function fireWeapon(match, shooter, origin, dir, boxes, rng, events) {
	const w = shooter.weapon;
	const def = w.def;
	if (w.cooldown > 0 || w.reloading > 0) return;
	if (w.mag <= 0) {
		events.push({ kind: 'dry', actor: shooter });
		w.cooldown = 0.3;
		return;
	}
	w.mag -= 1;
	w.cooldown = 60 / def.rpm;
	w.bloom = Math.min(def.bloomCap, w.bloom + def.bloomPerShot);
	w.bloomIdle = 0.12;
	shooter.recoilPitch = (shooter.recoilPitch || 0) + def.recoil;
	shooter.recoilYaw = (shooter.recoilYaw || 0) + (rng() - 0.5) * 0.4 * (def.recoil / 0.7);
	const speed = Math.hypot(shooter.vel.x, shooter.vel.z);
	const spread = spreadRad(w, speed, shooter.crouch);
	const pellets = def.pellets ?? 1;
	events.push({ kind: 'shot', actor: shooter, weapon: def.id });
	match.sounds.push({ x: shooter.pos.x, z: shooter.pos.z, radius: 28, kind: 'shot', team: shooter.team, t: match.time });
	for (let p = 0; p < pellets; p++) {

		const a = rng() * Math.PI * 2;
		const r = Math.sqrt(rng()) * spread;
		const ux = Math.abs(dir.y) > 0.9 ? 1 : 0;
		const t1 = norm3(cross3(dir, { x: ux, y: ux ? 0 : 1, z: 0 }));
		const t2 = cross3(dir, t1);
		const d = norm3({
			x: dir.x + t1.x * Math.cos(a) * r + t2.x * Math.sin(a) * r,
			y: dir.y + t1.y * Math.cos(a) * r + t2.y * Math.sin(a) * r,
			z: dir.z + t1.z * Math.cos(a) * r + t2.z * Math.sin(a) * r,
		});
		const wall = raycastBoxes(boxes, origin.x, origin.y, origin.z, d.x, d.y, d.z, def.range);
		let bestDist = wall ? wall.dist : def.range;
		let bestActor = null;
		let bestPart = null;
		for (const other of match.actors) {
			if (other === shooter || !other.alive) continue;
			const hb = actorHitboxes(other);
			for (const part of ['head', 'torso', 'legs']) {
				const dist = rayAabb(origin.x, origin.y, origin.z, d.x, d.y, d.z, hb[part]);
				if (dist < bestDist) { bestDist = dist; bestActor = other; bestPart = part; }
			}
		}
		const end = { x: origin.x + d.x * bestDist, y: origin.y + d.y * bestDist, z: origin.z + d.z * bestDist };
		events.push({ kind: 'tracer', from: origin, to: end, hitActor: bestActor, head: bestPart === 'head' });
		if (bestActor) {
			const mult = bestPart === 'head' ? def.headMult : bestPart === 'legs' ? 0.6 : 1;
			applyDamage(match, bestActor, def.damage * mult, shooter, bestPart === 'head', events);
		} else if (wall) {
			events.push({ kind: 'impact', point: end });
		}
	}
}

function cross3(a, b) {
	return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function norm3(v) {
	const l = Math.hypot(v.x, v.y, v.z) || 1;
	return { x: v.x / l, y: v.y / l, z: v.z / l };
}

export function throwGrenade(match, actor, origin, dir, events) {
	if ((actor.grenades ?? 0) <= 0) return false;
	actor.grenades -= 1;
	match.grenades.push({
		x: origin.x, y: origin.y, z: origin.z,
		vx: dir.x * GRENADE.throwSpeed, vy: dir.y * GRENADE.throwSpeed + 2, vz: dir.z * GRENADE.throwSpeed,
		fuse: GRENADE.fuse, owner: actor, bounces: 0,
	});
	events.push({ kind: 'throw', actor });
	return true;
}

export function stepGrenades(match, dt, boxes, events) {
	for (let i = match.grenades.length - 1; i >= 0; i--) {
		const g = match.grenades[i];
		g.fuse -= dt;
		g.vy -= 18 * dt;
		let nx = g.x + g.vx * dt;
		let ny = g.y + g.vy * dt;
		let nz = g.z + g.vz * dt;

		for (const b of boxes) {
			if (ny < b.y0 || ny > b.y0 + b.h) continue;
			if (nx > b.x - b.w / 2 - 0.09 && nx < b.x + b.w / 2 + 0.09 && nz > b.z - b.d / 2 - 0.09 && nz < b.z + b.d / 2 + 0.09) {
				const penX = Math.min(Math.abs(nx - (b.x - b.w / 2)), Math.abs(nx - (b.x + b.w / 2)));
				const penZ = Math.min(Math.abs(nz - (b.z - b.d / 2)), Math.abs(nz - (b.z + b.d / 2)));
				if (penX < penZ) { g.vx = -g.vx * 0.45; nx = g.x; } else { g.vz = -g.vz * 0.45; nz = g.z; }
				if (g.bounces < 4) { events.push({ kind: 'bounce', point: { x: nx, y: ny, z: nz } }); g.bounces++; }
			}
		}
		g.x = nx; g.y = ny; g.z = nz;
		if (g.y < 0.12) {
			g.y = 0.12;
			g.vy = Math.abs(g.vy) > 1.5 ? -g.vy * 0.4 : 0;
			g.vx *= 0.8; g.vz *= 0.8;
		}
		if (g.fuse <= 0) {
			match.grenades.splice(i, 1);
			events.push({ kind: 'explosion', point: { x: g.x, y: g.y, z: g.z } });
			match.sounds.push({ x: g.x, z: g.z, radius: 35, kind: 'explosion', team: g.owner.team, t: match.time });
			for (const actor of match.actors) {
				if (!actor.alive) continue;
				const dx = actor.pos.x - g.x;
				const dz = actor.pos.z - g.z;
				const dy = (actor.groundY + 0.9) - g.y;
				const dist = Math.hypot(dx, dy, dz);
				if (dist > GRENADE.radius) continue;
				const blocked = raycastBoxes(boxes, g.x, g.y, g.z, dx / (dist || 1), dy / (dist || 1), dz / (dist || 1), dist);
				if (blocked && blocked.dist < dist - 0.4) continue;
				const amount = GRENADE.maxDamage * (1 - dist / GRENADE.radius);
				if (amount > 1) applyDamage(match, actor, amount, g.owner, false, events);
			}
		}
	}
}
