// Match orchestration: the round loop, the economy, the win rules.
import { RULES, WEAPONS, GRENADE, attackTeam, otherTeam } from './state.js';
import { SPAWNS, SITES } from './map.js';
import { newWeapon, refill, stepWeapon, stepGrenades } from './weapons.js';
import { initBrain, assignPlans, assignRetake, stepBot } from './bots.js';
import { stepPlayer } from './player.js';

export function createActors(match) {
	const actors = [];
	const mk = (id, team, isPlayer) => ({
		id, team, isPlayer,
		alive: true, health: 100, kills: 0,
		pos: { x: 0, z: 0 }, vel: { x: 0, z: 0 }, groundY: 0,
		yaw: 0, pitch: 0, crouch: false, speed: 0,
		weapon: newWeapon('pip9'), primaryId: null, primaryState: null,
		grenades: 0, money: RULES.startMoney,
		stepPhase: 0, stepT: 0, deadTime: 0, recoilPitch: 0, recoilYaw: 0,
		brain: null, figure: null, intent: null, walkPhase: 0,
	});
	actors.push(mk('you', 'siphon', true));
	actors.push(mk('siphon-2', 'siphon', false));
	actors.push(mk('siphon-3', 'siphon', false));
	actors.push(mk('still-1', 'still', false));
	actors.push(mk('still-2', 'still', false));
	actors.push(mk('still-3', 'still', false));
	for (const a of actors) if (!a.isPlayer) initBrain(a, match.rng);
	match.actors = actors;
	return actors;
}

export function resetRound(match, events) {
	const atk = attackTeam(match.round);
	const spawns = { [atk]: SPAWNS.siphon, [otherTeam(atk)]: SPAWNS.still };
	const counts = { siphon: 0, still: 0 };
	for (const a of match.actors) {
		const list = spawns[a.team];
		const spot = list[counts[a.team]++ % list.length];
		a.pos.x = spot.x; a.pos.z = spot.z;
		a.vel.x = 0; a.vel.z = 0;
		a.yaw = a.team === atk ? 0 : Math.PI;
		a.pitch = 0;
		a.crouch = false;
		a.intent = null;
		if (!a.alive) {

			a.weapon = newWeapon('pip9');
			a.primaryId = null;
			a.primaryState = null;
			a.grenades = 0;
		} else {
			refill(a.weapon);
			if (a.primaryState) refill(a.primaryState);
		}
		a.alive = true;
		a.health = 100;
		a.deadTime = 0;
	}
	match.device.state = 'carried';
	match.device.site = null;
	match.device.pos = null;
	match.device.fuse = 0;
	const attackers = match.actors.filter((a) => a.team === atk);
	const player = attackers.find((a) => a.isPlayer);
	match.device.carrier = player ?? attackers[Math.floor(match.rng() * attackers.length)];
	match.channel = null;
	match.grenades = [];
	match.sounds = [];
	match.phase = 'buy';
	match.phaseTime = RULES.buySeconds;
	match.result = null;
	assignPlans(match, match.rng);

	for (const a of match.actors) {
		if (a.isPlayer) continue;
		botBuy(a);
		if (a.primaryState) { a.weapon = a.primaryState; }
	}
	events.push({ kind: 'round-start', round: match.round, attackTeam: atk });
}

function botBuy(a) {
	if (!a.primaryId && a.money >= WEAPONS.bastion5.price) {
		a.money -= WEAPONS.bastion5.price;
		a.primaryId = 'bastion5';
		a.primaryState = newWeapon('bastion5');
	} else if (!a.primaryId && a.money >= WEAPONS.rill24.price) {
		a.money -= WEAPONS.rill24.price;
		a.primaryId = 'rill24';
		a.primaryState = newWeapon('rill24');
	}
	if (a.grenades === 0 && a.money >= GRENADE.price + 400) {
		a.money -= GRENADE.price;
		a.grenades = 1;
	}
}

export function buyItem(match, actor, itemId, events) {
	if (match.phase !== 'buy' || !actor.alive) return false;
	if (itemId === 'grenade') {
		if (actor.grenades > 0 || actor.money < GRENADE.price) return false;
		actor.money -= GRENADE.price;
		actor.grenades = 1;
		events.push({ kind: 'buy', actor, item: 'Clatterbox' });
		return true;
	}
	const def = WEAPONS[itemId];
	if (!def || itemId === 'pip9') return false;
	if (actor.primaryId === itemId || actor.money < def.price) return false;
	actor.money -= def.price;
	actor.primaryId = itemId;
	actor.primaryState = newWeapon(itemId);
	actor.weapon = actor.primaryState;
	events.push({ kind: 'buy', actor, item: def.name });
	return true;
}

export function equipSlot(actor, slot) {
	if (slot === 'primary' && actor.primaryState) actor.weapon = actor.primaryState;
	if (slot === 'sidearm') {
		if (actor.primaryState && actor.weapon === actor.primaryState) {

		}
		if (!actor.sidearmState) actor.sidearmState = actor.primaryId ? newWeapon('pip9') : actor.weapon;
		actor.weapon = actor.sidearmState;
	}
}

function teamAlive(match, team) {
	return match.actors.filter((a) => a.team === team && a.alive).length;
}

function endRound(match, winner, reason, events) {
	match.phase = 'result';
	match.phaseTime = RULES.resultSeconds;
	match.score[winner]++;
	match.result = { winner, reason };
	match.channel = null;
	for (const a of match.actors) {
		a.money = Math.min(RULES.maxMoney, a.money + (a.team === winner ? RULES.winPay : RULES.lossPay));
	}
	events.push({ kind: 'round-end', winner, reason });
}

function resolveRound(match, events) {
	const atk = attackTeam(match.round);
	const def = otherTeam(atk);
	if (match.device.state === 'exploded') { endRound(match, atk, 'Pulse Leech detonated', events); return; }
	if (match.device.state === 'defused') { endRound(match, def, 'Pulse Leech defused', events); return; }
	if (match.phase === 'live') {
		if (teamAlive(match, atk) === 0) { endRound(match, def, 'Attackers eliminated', events); return; }
		if (teamAlive(match, def) === 0) { endRound(match, atk, 'Defenders eliminated', events); return; }
		if (match.phaseTime <= 0) { endRound(match, def, 'Time expired', events); return; }
	}
	if (match.phase === 'planted') {

		if (teamAlive(match, def) === 0) { endRound(match, atk, 'Defenders eliminated', events); return; }
		if (match.device.fuse <= 0) {
			match.device.state = 'exploded';
			events.push({ kind: 'explosion', point: { x: match.device.pos.x, y: 1, z: match.device.pos.z } });
			endRound(match, atk, 'Pulse Leech detonated', events);
		}
	}
}

function stepChannel(match, dt, events) {
	for (const a of match.actors) if (a.brain) a.intent = a.brain.intent;
	const ch = match.channel;
	if (ch) {
		const a = ch.actor;
		const moved = Math.hypot(a.pos.x - ch.x, a.pos.z - ch.z) > 0.6;
		if (!a.alive || moved || a.intent !== ch.kind) {
			match.channel = null;
			events.push({ kind: 'channel-stop', actor: a, channelKind: ch.kind });
		} else {
			ch.t += dt;
			if (ch.kind === 'plant' && Math.floor(ch.t) > Math.floor(ch.t - dt)) {
				events.push({ kind: 'plant-beep', step: Math.floor(ch.t) });
			}
			if (ch.kind === 'defuse' && Math.floor(ch.t * 2) > Math.floor((ch.t - dt) * 2)) {
				events.push({ kind: 'defuse-tick' });
			}
			if (ch.t >= ch.need) {
				match.channel = null;
				if (ch.kind === 'plant') {
					const site = SITES[ch.site];
					match.device.state = 'planted';
					match.device.site = ch.site;
					match.device.pos = { x: site.socket.x, z: site.socket.z };
					match.device.fuse = RULES.fuseSeconds;
					match.device.carrier = null;
					a.money = Math.min(RULES.maxMoney, a.money + RULES.plantPay);
					match.phase = 'planted';
					events.push({ kind: 'planted', actor: a, site: ch.site });
					assignRetake(match);
				} else {
					match.device.state = 'defused';
					events.push({ kind: 'defused', actor: a });
				}
			}
			return;
		}
	}
	if (match.phase === 'live') {
		for (const a of match.actors) {
			if (!a.alive || a.intent !== 'plant') continue;
			const siteId = match.planSite;
			const site = SITES[siteId];
			if (Math.hypot(a.pos.x - site.socket.x, a.pos.z - site.socket.z) < 1.8) {
				match.channel = { actor: a, kind: 'plant', t: 0, need: RULES.plantSeconds, site: siteId, x: a.pos.x, z: a.pos.z };
				events.push({ kind: 'channel-start', actor: a, channelKind: 'plant' });
				break;
			}
		}
	} else if (match.phase === 'planted') {
		for (const a of match.actors) {
			if (!a.alive || a.intent !== 'defuse') continue;
			const site = SITES[match.device.site];
			if (Math.hypot(a.pos.x - site.socket.x, a.pos.z - site.socket.z) < 1.8) {
				match.channel = { actor: a, kind: 'defuse', t: 0, need: RULES.defuseSeconds, site: match.device.site, x: a.pos.x, z: a.pos.z };
				events.push({ kind: 'channel-start', actor: a, channelKind: 'defuse' });
				break;
			}
		}
	}
}

export function stepMatch(match, dt, ctx) {
	const { boxes, events, input } = ctx;
	match.time += dt;
	const player = match.actors.find((a) => a.isPlayer);

	if (match.phase === 'buy' || match.phase === 'result') {
		match.phaseTime -= dt;

		if (player.alive && input) stepPlayer(match, player, input, dt, boxes, events);
		for (const a of match.actors) {
			stepWeapon(a.weapon, dt);
			if (a.primaryState && a.primaryState !== a.weapon) stepWeapon(a.primaryState, dt);
		}
		if (match.phaseTime <= 0) {
			if (match.phase === 'buy') {
				match.phase = 'live';
				match.phaseTime = RULES.liveSeconds;
				events.push({ kind: 'phase', phase: 'live' });
			} else {
				match.round++;
				if (match.score.siphon >= RULES.roundsToWin || match.score.still >= RULES.roundsToWin) {
					match.phase = 'over';
					match.winner = match.score.siphon > match.score.still ? 'siphon' : 'still';
					events.push({ kind: 'match-end', winner: match.winner });
				} else {
					resetRound(match, events);
				}
			}
		}
		return;
	}
	if (match.phase === 'over') return;

	if (match.phase === 'live') match.phaseTime -= dt;
	if (match.phase === 'planted') {
		match.device.fuse -= dt;
		const urgency = 1 - match.device.fuse / RULES.fuseSeconds;
		match.pulseT = (match.pulseT || 0) - dt;
		if (match.pulseT <= 0) {
			match.pulseT = Math.max(0.25, 0.9 - urgency * 0.6);
			events.push({ kind: 'pulse', urgency });
		}
	}
	if (player.alive && input) stepPlayer(match, player, input, dt, boxes, events);
	for (const a of match.actors) {
		if (!a.alive) { a.deadTime += dt; continue; }
		if (!a.isPlayer) stepBot(match, a, dt, { boxes, events });
		stepWeapon(a.weapon, dt);
		if (a.primaryState && a.primaryState !== a.weapon) stepWeapon(a.primaryState, dt);
		if (a.sidearmState && a.sidearmState !== a.weapon) stepWeapon(a.sidearmState, dt);
	}
	stepChannel(match, dt, events);
	stepGrenades(match, dt, boxes, events);

	if (match.sounds.length > 40) match.sounds.splice(0, match.sounds.length - 40);
	resolveRound(match, events);
}
