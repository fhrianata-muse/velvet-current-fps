// All sound is synthesized with WebAudio: no audio files, no network. Dry mechanical
// gun reports, tile footsteps, the Pulse Leech's rising pulse and a low turbine hum.
// The context is created lazily on the first user gesture (browser autoplay policy);
// in staged captures it simply stays silent.
export function createAudio() {
  let ctx = null;
  let master = null;
  let hum = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return true;
  }

  function noiseBuffer(seconds) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // A short filtered noise burst: the body of every gunshot and the explosion.
  function burst({ dur = 0.12, freq = 1800, gain = 0.5, type = 'lowpass', sweepTo = 0 }) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t);
  }

  // A pitched blip for mechanical and UI cues.
  function tone({ freq = 440, dur = 0.08, gain = 0.2, type = 'square', slideTo = 0, delay = 0 }) {
    if (!ensure()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    unlock() { ensure(); },
    shot(kind) {
      if (kind === 'knell8') burst({ dur: 0.22, freq: 900, gain: 0.8, sweepTo: 120 });
      else if (kind === 'pip9') burst({ dur: 0.09, freq: 2400, gain: 0.45, sweepTo: 300 });
      else burst({ dur: 0.13, freq: 1700, gain: 0.6, sweepTo: 200 });
      tone({ freq: 160, dur: 0.05, gain: 0.15, type: 'triangle' });
    },
    enemyShot() { burst({ dur: 0.1, freq: 1200, gain: 0.22, sweepTo: 250 }); },
    dryFire() { tone({ freq: 900, dur: 0.03, gain: 0.12 }); },
    reloadStart() { tone({ freq: 500, dur: 0.04, gain: 0.15 }); tone({ freq: 320, dur: 0.04, gain: 0.15, delay: 0.09 }); },
    reloadEnd() { tone({ freq: 700, dur: 0.04, gain: 0.18 }); tone({ freq: 1050, dur: 0.05, gain: 0.18, delay: 0.07 }); },
    hit() { tone({ freq: 1500, dur: 0.04, gain: 0.2, type: 'sine' }); },
    headshot() { tone({ freq: 2100, dur: 0.06, gain: 0.25, type: 'sine' }); },
    hurt() { burst({ dur: 0.08, freq: 500, gain: 0.3 }); },
    step() { burst({ dur: 0.05, freq: 700, gain: 0.06 }); },
    throwWhoosh() { burst({ dur: 0.18, freq: 900, gain: 0.12, type: 'bandpass', sweepTo: 2400 }); },
    bounce() { tone({ freq: 240, dur: 0.04, gain: 0.15, type: 'triangle' }); },
    explosion() {
      burst({ dur: 0.7, freq: 3000, gain: 0.9, sweepTo: 60 });
      tone({ freq: 70, dur: 0.6, gain: 0.5, type: 'sine', slideTo: 34 });
    },
    plantBeep(step) { tone({ freq: 620 + step * 160, dur: 0.07, gain: 0.2, type: 'sine' }); },
    planted() { tone({ freq: 880, dur: 0.1, gain: 0.22 }); tone({ freq: 1174, dur: 0.12, gain: 0.22, delay: 0.11 }); tone({ freq: 1568, dur: 0.16, gain: 0.22, delay: 0.23 }); },
    pulse(urgency) { tone({ freq: 980 + urgency * 500, dur: 0.05, gain: 0.1 + urgency * 0.1, type: 'sine' }); },
    defuseTick() { tone({ freq: 1320, dur: 0.04, gain: 0.14, type: 'sine' }); },
    buy() { tone({ freq: 1046, dur: 0.05, gain: 0.16 }); tone({ freq: 1568, dur: 0.07, gain: 0.16, delay: 0.06 }); },
    denied() { tone({ freq: 220, dur: 0.09, gain: 0.16, type: 'sawtooth' }); },
    roundWin() { tone({ freq: 523, dur: 0.12, gain: 0.2, type: 'triangle' }); tone({ freq: 784, dur: 0.18, gain: 0.2, type: 'triangle', delay: 0.12 }); },
    roundLose() { tone({ freq: 392, dur: 0.12, gain: 0.2, type: 'triangle' }); tone({ freq: 262, dur: 0.2, gain: 0.2, type: 'triangle', delay: 0.12 }); },
    startHum() {
      if (!ensure() || hum) return;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 160;
      const g = ctx.createGain();
      g.gain.value = 0.035;
      osc.connect(filter).connect(g).connect(master);
      osc.start();
      hum = osc;
    },
  };
}
