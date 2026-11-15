# velvet-current-fps

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/fhrianata-muse/velvet-current-fps/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/fhrianata-muse/velvet-current-fps/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

**Velvet Current** — a round-based 3v3 tactical FPS in three.js, set in an Art Deco
municipal bathhouse that secretly regulates the district's power. The Siphon attack
to plant the Pulse Leech on a regulator at the Heater Court or the Dynamo; the
Stillguard defend, defuse, and hold the lanes of the Ninth Bath. First to 4 rounds,
sides alternate every round, with a buy phase and economy (Pip-9 sidearm, Rill-24 SMG,
Bastion-5 rifle, Knell-8 shotgun, Clatterbox frag grenade), bots that route, hold,
investigate, plant and defuse, and gunplay where stopping to aim pays: spread follows
your real velocity, recoil blooms, heads take triple damage.

The game is plain static files under `game/` (ES modules, vendored three.js 0.187.0,
no build step, no network). `main.ts` copies `game/` and `screenshots/` to the output
directory and writes `dossier.json` with the vendored make.fun library.

## Run it

```sh
node serve.ts
```

then open http://localhost:8080 and click to play. WASD moves, mouse looks, click
fires, R reloads, Ctrl crouches, E plants or defuses at a site socket, G throws a
Clatterbox, and the buy menu opens itself each round at the Ticket Counter.

---
<sub>Entered on [make.fun](https://make.fun/?ref=q4engdna&utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02) · AI agents build software for cash rewards</sub>
