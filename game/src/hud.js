// The HUD: DOM panels in the mansion instrument style; reads state only.
import { WEAPONS, GRENADE, RULES, attackTeam } from './state.js';

const $ = (id) => document.getElementById(id);

const BUY_ITEMS = [
  { item: 'rill24', key: '2' },
  { item: 'bastion5', key: '3' },
  { item: 'knell8', key: '4' },
  { item: 'grenade', key: '5' },
];

export function createHud() {
  const els = {
    round: $('round-label'), phase: $('phase-label'), timer: $('timer'),
    scoreA: $('score-a'), scoreB: $('score-b'), alive: $('alive-line'),
    objective: $('objective-line'), money: $('money'), feed: $('feed'),
    healthNum: $('health-num'), healthFill: $('health-fill'), teamTag: $('team-tag'),
    ammoMag: $('ammo-mag'), ammoReserve: $('ammo-reserve'), ammoLine: $('ammo-line'),
    weaponName: $('weapon-name'), grenade: $('grenade-line'),
    crosshair: $('crosshair'), hitmarker: $('hitmarker'),
    interact: $('interact'), ring: $('interact-ring'), interactPct: $('interact-pct'),
    interactLabel: $('interact-label'),
    banner: $('banner'), bannerTitle: $('banner-title'), bannerSub: $('banner-sub'),
    vignette: $('vignette'), buy: $('buymenu'), buyCards: $('buy-cards'),
    buyBalance: $('buy-balance'), buyTimer: $('buy-timer'), buyRound: $('buy-round'),
    buyResult: $('buy-result'), overlay: $('overlay'), overlayTitle: $('overlay-title'),
    overlayCopy: $('overlay-copy'), play: $('play'), botstates: $('botstates'),
  };
  let bannerUntil = 0;
  let hitUntil = 0;
  let lastFeed = [];
  let buyHandler = null;

  // Build the buy cards once.
  for (const { item, key } of BUY_ITEMS) {
    const def = item === 'grenade' ? GRENADE : WEAPONS[item];
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.item = item;
    card.innerHTML = `<span class="key">${key}</span><div class="name">${def.name}</div>` +
      `<div class="role">${def.role ?? 'Grenade'}</div><div class="price">¤ ${def.price}</div>` +
      `<div class="owned-line" style="font-size:11px;color:var(--jade)"></div>`;
    card.addEventListener('click', () => { if (buyHandler) buyHandler(item); });
    els.buyCards.appendChild(card);
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
    banner(title, sub, seconds, now) {
      els.bannerTitle.textContent = title;
      els.bannerSub.textContent = sub ?? '';
      els.banner.hidden = false;
      bannerUntil = now + seconds;
    },
    hitmark(now, head) {
      hitUntil = now + 0.12;
      els.hitmarker.style.filter = head ? 'brightness(1.6)' : '';
    },
    feed(match, text) {
      match.feed.unshift({ text, t: match.time });
      if (match.feed.length > 5) match.feed.pop();
    },
    toggleBotStates() { els.botstates.hidden = !els.botstates.hidden; },

    update(match, player, spreadPx, now) {
      const atk = attackTeam(match.round);
      els.round.textContent = `Round ${match.round}`;
      els.phase.textContent = {
        buy: 'Buy phase', live: 'Live', planted: 'Leech planted', result: 'Round over', over: 'Match over',
      }[match.phase];
      const clock = match.phase === 'planted' ? match.device.fuse : match.phaseTime;
      els.timer.textContent = fmtTime(clock);
      els.timer.classList.toggle('hot', clock <= 10 && match.phase !== 'buy');
      els.scoreA.textContent = match.score.siphon;
      els.scoreB.textContent = match.score.still;
      const aliveA = match.actors.filter((a) => a.team === 'siphon' && a.alive).length;
      const aliveB = match.actors.filter((a) => a.team === 'still' && a.alive).length;
      els.alive.textContent = `SIPHON ${aliveA} alive · STILLGUARD ${aliveB} alive`;
      // Objective line.
      if (match.device.state === 'planted') {
        els.objective.innerHTML = `Pulse Leech <b>planted at ${match.device.site}</b> — ${fmtTime(match.device.fuse)}`;
      } else if (match.device.state === 'dropped') {
        els.objective.innerHTML = 'Pulse Leech <b>dropped</b> — recover it';
      } else if (match.device.state === 'exploded') {
        els.objective.textContent = 'Pulse Leech detonated';
      } else if (match.device.state === 'defused') {
        els.objective.textContent = 'Pulse Leech defused';
      } else {
        const carrier = match.device.carrier;
        const who = carrier ? (carrier.isPlayer ? 'you carry it' : `${carrier.id} carries it`) : '';
        els.objective.textContent = `Pulse Leech → Site ${match.planSite ?? '?'} (${who})`;
      }
      els.money.textContent = `¤ ${player.money}`;
      els.healthNum.textContent = Math.ceil(player.health);
      els.healthFill.style.width = `${Math.max(0, player.health)}%`;
      els.healthFill.classList.toggle('low', player.health <= 30);
      els.teamTag.textContent = `The Siphon — ${player.team === atk ? 'Attack' : 'Defend'} · plant at ${match.planSite ?? '—'}`;
      const w = player.weapon;
      els.ammoMag.textContent = w.reloading > 0 ? '——' : w.mag;
      els.ammoReserve.textContent = w.reserve;
      els.ammoLine.classList.toggle('empty', w.mag === 0);
      els.weaponName.textContent = `${w.def.name}${w.reloading > 0 ? ' — reloading' : ''}`;
      els.grenade.textContent = `Clatterbox × ${player.grenades} — G to throw`;
      els.crosshair.style.setProperty('--gap', `${spreadPx.toFixed(1)}px`);
      els.hitmarker.classList.toggle('on', now < hitUntil);
      els.banner.hidden = now >= bannerUntil;
      // Interaction ring: own channel, or a teammate's.
      const ch = match.channel;
      if (ch && ch.actor.isPlayer) {
        els.interact.hidden = false;
        const frac = Math.min(1, ch.t / ch.need);
        els.ring.style.background = `conic-gradient(var(--ivory) ${frac * 360}deg, rgba(233,226,208,0.18) 0deg)`;
        els.interactPct.textContent = `${Math.round(frac * 100)}%`;
        els.interactLabel.textContent = ch.kind === 'plant' ? 'Planting the Pulse Leech' : 'Defusing the Pulse Leech';
      } else if (ch) {
        els.interact.hidden = false;
        const frac = Math.min(1, ch.t / ch.need);
        els.ring.style.background = `conic-gradient(var(--brass) ${frac * 360}deg, rgba(233,226,208,0.18) 0deg)`;
        els.interactPct.textContent = `${Math.round(frac * 100)}%`;
        els.interactLabel.textContent = ch.kind === 'plant' ? `${ch.actor.id} is planting` : `${ch.actor.id} is defusing`;
      } else {
        els.interact.hidden = true;
      }
      // Feed lines (newest first, kept 6 s).
      const lines = match.feed.filter((f) => now - f.t < 6).map((f) => f.text);
      if (lines.join('|') !== lastFeed.join('|')) {
        lastFeed = lines;
        els.feed.innerHTML = lines.map((t) => `<div>${t}</div>`).join('');
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
        for (const card of els.buyCards.children) {
          const item = card.dataset.item;
          const def = item === 'grenade' ? GRENADE : WEAPONS[item];
          const owned = item === 'grenade' ? player.grenades > 0 : player.primaryId === item;
          card.classList.toggle('owned', owned);
          card.classList.toggle('cant', !owned && player.money < def.price);
          card.querySelector('.owned-line').textContent = owned ? 'OWNED' : '';
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
