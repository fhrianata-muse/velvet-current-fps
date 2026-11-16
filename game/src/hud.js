// The HUD: borderless angled strips and wedges in the modern tactical
// language, plus live system readouts — minimap, radio comms, killfeed,
// scoreboard — fed only by real match state and events. Reads state; the
// only writes are buy requests, forwarded to game.js by callback.
import { WEAPONS, GRENADE, RULES, attackTeam } from './state.js';
import { SITES } from './map.js';

const $ = (id) => document.getElementById(id);
const NAMES = { you: 'You', 'siphon-2': 'Wick', 'siphon-3': 'Sorrel', 'still-1': 'Marrow', 'still-2': 'Tamsin', 'still-3': 'Craddock' };
const ROLE_NAMES = { siphon: ['Rifleman', 'Heavy', 'Scout'], still: ['Officer', 'Marksman', 'Breacher'] };
const TEAM_CSS = { siphon: '#7fd6a8', still: '#e8c97a' };
const BUY_ITEMS = [
	{ item: 'rill24', key: '2' },
	{ item: 'bastion5', key: '3' },
	{ item: 'knell8', key: '4' },
	{ item: 'grenade', key: '5' },
];
const nameOf = (a) => NAMES[a.id] ?? a.id;
function roleOf(a, round) {
	if (a.isPlayer) return 'Rifleman';
	const i = (((a.teamIdx ?? 0) + round - 1) % 3 + 3) % 3;
	return ROLE_NAMES[a.team][i];
}
function zoneOf(p) {
	if (p.x < -11.5) return p.z < -12 ? 'the Library' : 'the west lane';
	if (p.x > 11.5) return p.z < -12 ? 'the Gallery' : 'the east lane';
	if (p.z < -12) return 'the north end';
	if (p.z > 12) return 'the vestibule';
	return 'the hall';
}
// Minimap transform: the hall is 48.8 x 41 m; 150 px across.
const MK = 150 / 48.8;
const mx = (x) => (x + 24.4) * MK;
const mz = (z) => (z + 20.5) * MK;

export function createHud() {
	const els = {
		round: $('round-label'), phase: null, timer: $('timer'),
		scoreA: $('score-a'), scoreB: $('score-b'), aliveA: $('alive-a'), aliveB: $('alive-b'),
		pipsA: $('pips-a'), pipsB: $('pips-b'),
		objective: $('objective-line'), moneyNum: $('money-num'), moneyDelta: $('money-delta'),
		minimap: $('minimap'), comms: $('comms'), killfeed: $('killfeed'),
		healthpod: $('healthpod'), healthNum: $('health-num'), healthFill: $('health-fill'), teamTag: $('team-tag'),
		ammoMag: $('ammo-mag'), ammoReserve: $('ammo-reserve'), ammoLine: $('ammo-line'),
		weaponName: $('weapon-name'), slot1: $('slot-1'), slot2: $('slot-2'), slot5: $('slot-5'),
		crosshair: $('crosshair'), hitmarker: $('hitmarker'),
		interact: $('interact'), interactFill: $('interact-fill'), interactLabel: $('interact-label'),
		banner: $('banner'), bannerTitle: $('banner-title'), bannerSub: $('banner-sub'),
		scoreboard: $('scoreboard'),
		vignette: $('vignette'), buy: $('buymenu'), buyRows: $('buy-rows'),
		buyBalance: $('buy-balance'), buyTimer: $('buy-timer'), buyRound: $('buy-round'),
		buyResult: $('buy-result'), overlay: $('overlay'), overlayTitle: $('overlay-title'),
		overlayCopy: $('overlay-copy'), play: $('play'), botstates: $('botstates'),
	};
	const mm = els.minimap.getContext('2d');
	const mmStatic = document.createElement('canvas');
	mmStatic.width = 150; mmStatic.height = 126;
	let bannerUntil = 0;
	let hitUntil = 0;
	let hurtT = -9;
	let hurtHeavy = false;
	let buyHandler = null;
	let prevMoney = null;
	let deltaUntil = 0;
	let prevScore = { siphon: 0, still: 0 };
	let history = [];
	let comms = [];
	let kills = [];
	let lastComms = '';
	let lastKills = '';
	let lastMapT = -1;
	let contactRound = -1;
	let sbSig = '';
	const prevAlive = new Map();
	const deaths = new Map();

	for (let i = 0; i < 7; i++) {
		els.pipsA.appendChild(document.createElement('span')).className = 'pip';
		els.pipsB.appendChild(document.createElement('span')).className = 'pip';
	}
	// Build the buy rows once.
	for (const { item, key } of BUY_ITEMS) {
		const def = item === 'grenade' ? GRENADE : WEAPONS[item];
		const stats = item === 'grenade' ? 'Grenade · blast radius 5 m'
			: `${def.role} · dmg ${def.damage} · rpm ${def.rpm}${def.pellets ? ` · ${def.pellets} pellets` : ''}`;
		const row = document.createElement('div');
		row.className = 'brow';
		row.dataset.item = item;
		row.innerHTML = `<span class="key">${key}</span><div class="bn"><b>${def.name}</b><span>${stats}</span></div>` +
			`<span class="own"></span><div class="bp num">¤ ${def.price}</div>`;
		row.addEventListener('click', () => { if (buyHandler) buyHandler(item); });
		els.buyRows.appendChild(row);
	}

	function fmtTime(s) {
		s = Math.max(0, Math.ceil(s));
		return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
	}

	return {
		els,
		onPlay(cb) { els.play.addEventListener('click', cb); },
		onBuy(cb) { buyHandler = cb; },
		showOverlay(title, copy, button) {
			els.overlayTitle.textContent = title;
			els.overlayCopy.textContent = copy;
			els.play.textContent = button;
			els.overlay.hidden = false;
		},
		hideOverlay() { els.overlay.hidden = true; },
		banner(title, sub, seconds, now, tone = 'n') {
			els.bannerTitle.textContent = title;
			els.bannerSub.textContent = sub ?? '';
			els.banner.classList.toggle('ta', tone === 'a');
			els.banner.classList.toggle('tb', tone === 'b');
			bannerUntil = now + seconds;
		},
		hitmark(now, head, kill = false) {
			hitUntil = now + (kill ? 0.4 : 0.2);
			els.hitmarker.classList.toggle('kill', kill);
			els.hitmarker.style.filter = head ? 'brightness(1.7)' : '';
		},
		hurt(now, amount) { hurtT = now; hurtHeavy = amount > 40; },
		say(match, actor, text) {
			if (!actor) return;
			const nm = nameOf(actor);
			const room = 39 - nm.length;
			if (text.length > room) text = `${text.slice(0, room - 1)}…`;
			comms.push({ h: `<b style="color:${TEAM_CSS[actor.team]}">${nm.toUpperCase()}</b> ${text}`, t: match.time });
			if (comms.length > 4) comms.shift();
		},
		contact(match, target) {
			if (contactRound === match.round) return;
			contactRound = match.round;
			const speaker = target.isPlayer
				? match.actors.find((a) => !a.isPlayer && a.team === target.team && a.alive)
				: target;
			this.say(match, speaker, `Contact — ${zoneOf(target.pos)}!`);
		},
		kill(match, attacker, target, head) {
			if (!attacker || !target) return;
			const w = attacker.weapon?.def?.name ?? '—';
			kills.unshift({
				h: `<b style="color:${TEAM_CSS[attacker.team]}">${nameOf(attacker).toUpperCase()}</b><span>${w}${head ? ' ×' : ''}</span><b style="color:${TEAM_CSS[target.team]}">${nameOf(target).toUpperCase()}</b>`,
				t: match.time, own: attacker.isPlayer,
			});
			if (kills.length > 5) kills.pop();
		},
		setMap(boxes) {
			const g = mmStatic.getContext('2d');
			g.fillStyle = 'rgba(233,226,208,0.07)';
			g.fillRect(0, 0, 150, 126);
			for (const s of Object.values(SITES)) {
				g.fillStyle = 'rgba(201,162,39,0.14)';
				g.fillRect(mx(s.x0), mz(s.z0), (s.x1 - s.x0) * MK, (s.z1 - s.z0) * MK);
			}
			g.fillStyle = 'rgba(233,226,208,0.42)';
			for (const b of boxes) {
				if (b.y0 < 1.5 && b.h >= 0.9) g.fillRect(mx(b.x - b.w / 2), mz(b.z - b.d / 2), b.w * MK, b.d * MK);
			}
		},
		toggleBotStates() { els.botstates.hidden = !els.botstates.hidden; },

		update(match, player, spreadPx, now) {
			const atk = attackTeam(match.round);
			const phaseText = {
				buy: 'Buy phase', live: 'Live', planted: 'Leech planted', result: 'Round over', over: 'Match over',
			}[match.phase];
			els.round.textContent = `Round ${match.round} · ${phaseText}`;
			const clock = match.phase === 'planted' ? match.device.fuse : match.phaseTime;
			els.timer.textContent = fmtTime(clock);
			els.timer.classList.toggle('hot', clock <= 10 && match.phase !== 'buy');
			els.scoreA.textContent = match.score.siphon;
			els.scoreB.textContent = match.score.still;
			// Round history -> win pips.
			if (match.score.siphon < prevScore.siphon || match.score.still < prevScore.still) history = [];
			if (match.score.siphon > prevScore.siphon) history.push('a');
			if (match.score.still > prevScore.still) history.push('b');
			prevScore = { siphon: match.score.siphon, still: match.score.still };
			for (let i = 0; i < 7; i++) {
				els.pipsA.children[i].className = 'pip' + (history[i] === 'a' ? ' wa' : i === history.length ? ' cur' : '');
				els.pipsB.children[i].className = 'pip' + (history[i] === 'b' ? ' wb' : i === history.length ? ' cur' : '');
			}
			const aliveA = match.actors.filter((a) => a.team === 'siphon' && a.alive).length;
			const aliveB = match.actors.filter((a) => a.team === 'still' && a.alive).length;
			els.aliveA.textContent = `${aliveA} ALIVE`;
			els.aliveB.textContent = `${aliveB} ALIVE`;
			// Objective line.
			if (match.device.state === 'planted') {
				els.objective.textContent = `Pulse Leech planted at ${match.device.site} — ${fmtTime(match.device.fuse)}`;
			} else if (match.device.state === 'dropped') {
				els.objective.textContent = 'Pulse Leech dropped — recover it';
			} else if (match.device.state === 'exploded') {
				els.objective.textContent = 'Pulse Leech detonated';
			} else if (match.device.state === 'defused') {
				els.objective.textContent = 'Pulse Leech defused';
			} else {
				const carrier = match.device.carrier;
				const who = carrier ? (carrier.isPlayer ? 'you carry it' : `${nameOf(carrier)} carries it`) : '';
				els.objective.textContent = `Pulse Leech → Site ${match.planSite ?? '?'} (${who})`;
			}
			// Money + gain flash.
			els.moneyNum.textContent = player.money;
			if (prevMoney !== null && player.money > prevMoney) {
				els.moneyDelta.textContent = `+${player.money - prevMoney}`;
				deltaUntil = now + 1.2;
			}
			prevMoney = player.money;
			els.moneyDelta.style.opacity = now < deltaUntil ? 1 : 0;
			// Health pod.
			const hp = Math.max(0, Math.ceil(player.health));
			els.healthNum.textContent = hp;
			els.healthFill.style.width = `${Math.max(0, player.health)}%`;
			els.healthpod.classList.toggle('warn', hp <= 59 && hp > 29);
			els.healthpod.classList.toggle('low', hp <= 29);
			els.teamTag.textContent = `${player.team === 'siphon' ? 'Siphon' : 'Stillguard'} · ${player.team === atk ? 'Attack' : 'Defend'}`;
			// Ammo pod + weapon slots.
			const w = player.weapon;
			els.ammoMag.textContent = w.reloading > 0 ? '——' : w.mag;
			els.ammoMag.classList.toggle('low', w.reloading <= 0 && w.mag <= 5 && w.mag > 0);
			els.ammoReserve.textContent = w.reserve;
			els.ammoLine.classList.toggle('empty', w.mag === 0);
			els.weaponName.textContent = `${w.def.name}${w.reloading > 0 ? ' — reloading' : ''}`;
			els.slot1.className = 'slot' + (w.def.id === 'pip9' ? ' on' : '');
			els.slot2.textContent = player.primaryId ? `2 ${WEAPONS[player.primaryId].name.toUpperCase()}` : '2 —';
			els.slot2.className = 'slot' + (player.primaryId && w.def.id === player.primaryId ? ' on' : '');
			els.slot5.textContent = `5 CLATTERBOX ×${player.grenades}`;
			els.slot5.className = 'slot' + (player.grenades > 0 ? '' : ' off');
			els.crosshair.style.setProperty('--gap', `${spreadPx.toFixed(1)}px`);
			els.hitmarker.classList.toggle('on', now < hitUntil);
			els.banner.classList.toggle('on', now < bannerUntil);
			// Damage vignette: hit flash decays; critical health holds a floor.
			const flash = Math.max(0, 1 - (now - hurtT) / 0.6) * (hurtHeavy ? 0.95 : 0.65);
			const crit = player.alive && hp <= 25 ? 0.3 : 0;
			els.vignette.style.opacity = Math.max(flash, crit).toFixed(2);
			els.vignette.classList.toggle('heavy', hurtHeavy || crit > 0);
			// Interaction strip: own channel, or a teammate's.
      const ch = match.channel;
      if (ch) {
        els.interact.hidden = false;
        const frac = Math.min(1, ch.t / ch.need);
        els.interactFill.style.width = `${frac * 100}%`;
        els.interactFill.style.background = `hsl(${Math.round(ch.kind === 'defuse' ? 158 - frac * 115 : 16 + frac * 27)} 85% 52%)`;
        els.interact.classList.toggle('defuse', ch.kind === 'defuse');
        const what = ch.kind === 'plant' ? 'Planting the Pulse Leech' : 'Defusing the Pulse Leech';
        els.interactLabel.textContent = ch.actor.isPlayer ? `${what} — ${Math.round(frac * 100)}%`
          : `${nameOf(ch.actor)} is ${ch.kind === 'plant' ? 'planting' : 'defusing'} — ${Math.round(frac * 100)}%`;
      } else {
        els.interact.hidden = true;
      }
      // Comms log (newest last, kept 8 s).
      const cl = comms.filter((c) => now - c.t < 8).map((c) => c.h).join('\n');
      if (cl !== lastComms) {
        lastComms = cl;
        els.comms.innerHTML = comms.filter((c) => now - c.t < 8).map((c) => `<div>${c.h}</div>`).join('');
      }
      // Killfeed (kept 5 s).
      const kl = kills.filter((k) => now - k.t < 5).map((k) => k.h).join('\n');
      if (kl !== lastKills) {
        lastKills = kl;
        els.killfeed.innerHTML = kills.filter((k) => now - k.t < 5)
          .map((k) => `<div class="kf${k.own ? ' own' : ''}">${k.h}</div>`).join('');
      }
      // Minimap at ~8 Hz.
      if (now - lastMapT > 0.12) {
        lastMapT = now;
        mm.clearRect(0, 0, 150, 126);
        mm.drawImage(mmStatic, 0, 0);
        const d = match.device;
        if ((d.state === 'planted' || d.state === 'dropped') && d.pos) {
          mm.save();
          mm.translate(mx(d.pos.x), mz(d.pos.z));
          mm.rotate(Math.PI / 4);
          mm.fillStyle = '#e8622a';
          mm.fillRect(-3, -3, 6, 6);
          mm.restore();
        }
        for (const a of match.actors) {
          if (!a.alive || a.isPlayer) continue;
          mm.beginPath();
          mm.arc(mx(a.pos.x), mz(a.pos.z), 2.6, 0, 7);
          mm.fillStyle = a.team === 'siphon' ? '#3fae7c' : '#c9a227';
          mm.fill();
        }
        if (player.alive) {
          mm.save();
          mm.translate(mx(player.pos.x), mz(player.pos.z));
          mm.rotate(Math.atan2(-Math.sin(player.yaw), Math.cos(player.yaw)));
          mm.beginPath();
          mm.moveTo(0, -5.5); mm.lineTo(3.6, 4.2); mm.lineTo(-3.6, 4.2); mm.closePath();
          mm.fillStyle = '#f8f0e1';
          mm.fill();
          mm.restore();
        }
        // Site labels last, over the dots, with a dark halo.
        mm.font = '700 11px Arial';
        mm.lineWidth = 3;
        mm.strokeStyle = 'rgba(5,9,8,.85)';
        mm.fillStyle = '#e8c97a';
        for (const s of Object.values(SITES)) {
          mm.strokeText(s.id, mx(s.x0) + 4, mz(s.z0) + 13);
          mm.fillText(s.id, mx(s.x0) + 4, mz(s.z0) + 13);
        }
      }
      // Deaths tally (for the scoreboard), from alive transitions.
      for (const a of match.actors) {
        if (prevAlive.get(a.id) && !a.alive) deaths.set(a.id, (deaths.get(a.id) ?? 0) + 1);
        prevAlive.set(a.id, a.alive);
      }
      if (match.round === 1 && !match.score.siphon && !match.score.still && match.actors.every((a) => !a.kills)) deaths.clear();
      // Scoreboard on the result phase.
      const showSb = match.phase === 'result' || match.phase === 'over';
      els.scoreboard.hidden = !showSb;
      if (showSb) {
        const sig = `${match.round}|${match.score.siphon}|${match.score.still}|` +
          match.actors.map((a) => `${a.kills ?? 0}.${deaths.get(a.id) ?? 0}.${a.alive ? 1 : 0}`).join('|');
        if (sig !== sbSig) {
          sbSig = sig;
          const rows = (team) => match.actors.filter((a) => a.team === team).map((a) =>
            `<div class="sb-row${a.alive ? '' : ' dead'}${a.isPlayer ? ' me' : ''}"><span>${nameOf(a)} <i>${roleOf(a, match.round)}</i></span><span class="kd">${a.kills ?? 0} / ${deaths.get(a.id) ?? 0}</span></div>`).join('');
          els.scoreboard.innerHTML =
            `<div class="sb-head">SIPHON ${match.score.siphon} — ${match.score.still} STILLGUARD</div>` +
            `<div class="sb-sub">Round ${match.round}${match.result ? ` · ${match.result.reason}` : ''} · K / D</div>` +
            `<div class="sb-team">The Siphon</div>${rows('siphon')}<div class="sb-team">The Stillguard</div>${rows('still')}`;
        }
      }
      // Buy menu.
      const showBuy = match.phase === 'buy' && player.alive;
      els.buy.hidden = !showBuy;
      if (showBuy) {
        els.buyBalance.textContent = `¤ ${player.money}`;
        els.buyTimer.textContent = Math.ceil(match.phaseTime);
        els.buyRound.textContent = match.round;
        els.buyResult.textContent = match.result
          ? `Last round: ${match.result.winner === 'siphon' ? 'Siphon' : 'Stillguard'} — ${match.result.reason} · win ¤${RULES.winPay} / loss ¤${RULES.lossPay}`
          : 'First round — everyone starts on ¤800 and a Pip-9.';
        for (const row of els.buyRows.children) {
          const item = row.dataset.item;
          const def = item === 'grenade' ? GRENADE : WEAPONS[item];
          const owned = item === 'grenade' ? player.grenades > 0 : player.primaryId === item;
          row.classList.toggle('owned', owned);
          row.classList.toggle('cant', !owned && player.money < def.price);
          row.querySelector('.own').textContent = owned ? 'OWNED' : '';
        }
      }
      // Bot-state overlay (Tab).
      if (!els.botstates.hidden) {
        els.botstates.textContent = match.actors
          .filter((a) => !a.isPlayer)
          .map((a) => `${a.id}  ${a.alive ? (a.brain?.state ?? '?').toUpperCase() : 'DEAD'}  ${a.weapon.def.name}`)
          .join('\n');
      }
    },
  };
}
