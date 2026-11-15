// Seeded canvas textures for Saintmere Hall: marble, carpet, book spines, panels,
import * as THREE from 'three';
import { makeRng } from './palette.js';

let MAXA = 4;
export const TEX = {};
function cnv(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  return c;
}
function tx(canvas, rx, ry, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = MAXA;
  return t;
}
const jit = (rng, amt) => (rng() - 0.5) * 2 * amt;
function speck(x, rng, n, cols, aMax, sMax = 2) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = cols[(rng() * cols.length) | 0];
    x.globalAlpha = 0.03 + rng() * aMax;
    x.fillRect(rng() * x.canvas.width, rng() * x.canvas.height, 1 + rng() * sMax, 1 + rng() * sMax);
  }
  x.globalAlpha = 1;
}

// Warm ivory marble: 2x2 slabs per canvas, gold-grey veining, hairline grout.
function marbleCanvas(mode) {
  const rng = makeRng(mode === 'color' ? 4101 : 4102);
  return cnv(1024, 1024, (x) => {
    x.fillStyle = mode === 'color' ? '#c9bb9c' : '#333';
    x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const px = i * 512, py = j * 512, v = jit(rng, 0.03);
      if (mode === 'color') {
        x.fillStyle = `hsl(43,32%,${74 + v * 100}%)`;
        x.fillRect(px + 3, py + 3, 506, 506);
        for (let s = 0; s < 7; s++) { // veins wander diagonally, branching faintly
          x.strokeStyle = `rgba(122,102,64,${0.16 + rng() * 0.20})`;
          x.lineWidth = 1 + rng() * 2.2;
          x.beginPath();
          let vx = px + rng() * 512, vy = py;
          x.moveTo(vx, vy);
          while (vy < py + 512) { vx += jit(rng, 46); vy += 40 + rng() * 60; x.lineTo(vx, vy); }
          x.stroke();
        }
        speck(x, rng, 260, ['rgba(120,100,60,1)', 'rgba(255,255,255,1)'], 0.05);
      } else {
        const g = 208 + v * 50;
        x.fillStyle = `rgb(${g},${g},${g})`;
        x.fillRect(px + 3, py + 3, 506, 506);
      }
    }
  });
}

// Forest-green carpet: gold diamond lattice, medallion diamonds, double border.
function carpetCanvas() {
  const rng = makeRng(5207);
  return cnv(1024, 1024, (x) => {
    x.fillStyle = '#1e463c'; x.fillRect(0, 0, 1024, 1024);
    speck(x, rng, 9000, ['rgba(6,20,14,1)', 'rgba(214,230,200,1)'], 0.06);
    x.strokeStyle = 'rgba(201,162,39,0.4)'; x.lineWidth = 3;
    for (let i = -4; i < 9; i++) {
      x.beginPath(); x.moveTo(i * 256, 0); x.lineTo(i * 256 + 1024, 1024); x.stroke();
      x.beginPath(); x.moveTo(i * 256, 1024); x.lineTo(i * 256 + 1024, 0); x.stroke();
    }
    x.fillStyle = 'rgba(201,162,39,0.30)';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = 128 + i * 256, cy = 128 + j * 256;
      x.beginPath(); x.moveTo(cx, cy - 44); x.lineTo(cx + 44, cy); x.lineTo(cx, cy + 44); x.lineTo(cx - 44, cy); x.closePath(); x.fill();
    }
    x.strokeStyle = '#c9a227'; x.lineWidth = 10; x.strokeRect(26, 26, 972, 972);
    x.lineWidth = 3; x.strokeRect(58, 58, 908, 908);
  });
}

// Book spines: four shelf rows of cloth bindings in muted classics — forest,
function booksCanvas() {
  const rng = makeRng(6311);
  const cols = ['#1e463c', '#2c3a55', '#c08a3e', '#bfa880', '#6b4a2f', '#274e3a', '#4a3220', '#3d5a80'];
  return cnv(1024, 608, (x) => {
    x.fillStyle = '#241407'; x.fillRect(0, 0, 1024, 608);
    for (let r = 0; r < 4; r++) {
      const y0 = r * 152;
      x.fillStyle = '#120a04'; x.fillRect(0, y0, 1024, 138);
      let bx = 6;
      while (bx < 1000) {
        const w = 17 + rng() * 26, lean = rng() < 0.06 ? jit(rng, 5) : 0;
        x.fillStyle = cols[(rng() * cols.length) | 0];
        x.globalAlpha = 0.82 + rng() * 0.18;
        x.fillRect(bx, y0 + 8 + Math.abs(lean), w, 128 - Math.abs(lean));
        x.globalAlpha = 1;
        x.fillStyle = 'rgba(226,190,90,0.85)';
        x.fillRect(bx + 2, y0 + 26, w - 4, 3); x.fillRect(bx + 2, y0 + 108, w - 4, 3);
        if (rng() < 0.4) x.fillRect(bx + 2, y0 + 62, w - 4, 2);
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(bx + w - 2, y0 + 8, 2, 128);
        bx += w + 1.5;
      }
      x.fillStyle = '#503722'; x.fillRect(0, y0 + 138, 1024, 14); // walnut shelf board
      x.fillStyle = 'rgba(255,220,160,0.20)'; x.fillRect(0, y0 + 138, 1024, 3);
    }
  });
}

// Panelled wall: near-white so material tint decides the room — cream field,
function panelCanvas() {
  const rng = makeRng(7417);
  return cnv(1024, 1024, (x) => {
    x.fillStyle = '#eadfc4'; x.fillRect(0, 0, 1024, 1024);
    speck(x, rng, 3600, ['rgba(120,100,60,1)', 'rgba(255,255,255,1)'], 0.05);
    x.strokeStyle = 'rgba(146,116,58,0.75)'; x.lineWidth = 9; x.strokeRect(52, 52, 920, 700);
    x.strokeStyle = 'rgba(180,148,80,0.8)'; x.lineWidth = 3; x.strokeRect(84, 84, 856, 636);
    x.beginPath(); x.arc(512, 268, 118, 0, 7); x.lineWidth = 8; x.stroke();
    x.beginPath(); x.arc(512, 268, 84, 0, 7); x.lineWidth = 3; x.stroke();
    x.fillStyle = 'rgba(146,116,58,0.5)';
    x.beginPath(); x.arc(512, 268, 26, 0, 7); x.fill();
    x.fillStyle = 'rgba(90,72,40,0.20)'; x.fillRect(0, 776, 1024, 248);
    x.fillStyle = 'rgba(146,116,58,0.65)'; x.fillRect(0, 768, 1024, 8);
    x.fillStyle = 'rgba(60,45,20,0.30)'; x.fillRect(0, 990, 1024, 34);
  });
}

// Walnut: warm brown grain with long streaks and the odd knot.
function woodCanvas() {
  const rng = makeRng(8521);
  return cnv(512, 512, (x) => {
    x.fillStyle = '#77552f'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 130; i++) {
      x.fillStyle = rng() > 0.5 ? 'rgba(46,26,10,0.16)' : 'rgba(214,164,96,0.13)';
      x.fillRect(0, rng() * 512, 512, 1 + rng() * 3);
    }
    for (let i = 0; i < 5; i++) {
      const kx = rng() * 512, ky = rng() * 512;
      x.strokeStyle = 'rgba(40,22,8,0.4)'; x.lineWidth = 2;
      x.beginPath(); x.ellipse(kx, ky, 8 + rng() * 10, 4 + rng() * 5, 0.3, 0, 7); x.stroke();
    }
    speck(x, rng, 500, ['rgba(30,16,4,1)'], 0.08);
  });
}

// Card catalogue: a grid of small drawers, each with a brass pull and label.
function catalogCanvas() {
  const rng = makeRng(9533);
  return cnv(1024, 768, (x) => {
    x.fillStyle = '#3a2410'; x.fillRect(0, 0, 1024, 768);
    const cw = 1024 / 6, ch = 768 / 5;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) {
      const px = i * cw, py = j * ch, v = jit(rng, 0.05);
      x.fillStyle = `hsl(27,42%,${30 + v * 100}%)`;
      x.fillRect(px + 5, py + 5, cw - 10, ch - 10);
      x.strokeStyle = 'rgba(24,12,2,0.6)'; x.lineWidth = 3; x.strokeRect(px + 12, py + 12, cw - 24, ch - 24);
      x.fillStyle = '#e6d9b8'; x.fillRect(px + cw / 2 - 30, py + 26, 60, 22);
      x.fillStyle = '#c9a227'; x.fillRect(px + cw / 2 - 16, py + ch - 52, 32, 12);
      x.fillStyle = 'rgba(60,40,8,0.8)'; x.fillRect(px + cw / 2 - 3, py + 32, 6, 10);
    }
  });
}

// Plaster: near-white (tints true), speckle, streaks, grime.
function plasterCanvas() {
  const rng = makeRng(7417 + 9);
  return cnv(1024, 1024, (x) => {
    x.fillStyle = '#f3ead9'; x.fillRect(0, 0, 1024, 1024);
    speck(x, rng, 8000, ['rgba(110,95,60,1)', 'rgba(255,255,255,1)'], 0.22);
    for (let i = 0; i < 36; i++) {
      x.fillStyle = `rgba(90,80,55,${0.10 + rng() * 0.18})`;
      x.fillRect(rng() * 1024, rng() * 300, 2 + rng() * 4, 260 + rng() * 500);
    }
    const g = x.createLinearGradient(0, 760, 0, 1024);
    g.addColorStop(0, 'rgba(18,26,22,0)'); g.addColorStop(1, 'rgba(18,26,22,0.30)');
    x.fillStyle = g; x.fillRect(0, 760, 1024, 264);
  });
}

// Brushed brass: streaks, scratches, patina, wear strip. Its luminance is
function brassCanvas() {
  const rng = makeRng(9533 + 9);
  return cnv(512, 512, (x) => {
    x.fillStyle = '#d8b96a';
    x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 280; i++) {
      x.fillStyle = rng() > 0.5 ? 'rgba(255,240,200,0.07)' : 'rgba(80,55,15,0.07)';
      x.fillRect(0, rng() * 512, 512, 1);
    }
    x.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      x.strokeStyle = 'rgba(255,246,214,0.35)';
      const px = rng() * 512, py = rng() * 512, a = rng() * 0.6 - 0.3, l = 12 + rng() * 46;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    for (let i = 0; i < 5; i++) {
      x.fillStyle = 'rgba(70,95,80,0.05)';
      x.beginPath(); x.arc(rng() * 512, rng() * 512, 10 + rng() * 26, 0, 7); x.fill();
    }
    x.fillStyle = 'rgba(255,244,205,0.20)'; x.fillRect(0, 0, 512, 56); // polished wear strip
  });
}

// Wayfinding sign: deep-teal field, gold border, ivory capitals, team tab.
export function signTexture(text, tab) {
  return tx(cnv(1024, 256, (x) => {
    x.fillStyle = '#14332b'; x.fillRect(0, 0, 1024, 256);
    x.strokeStyle = '#c9a227'; x.lineWidth = 8; x.strokeRect(14, 14, 996, 228);
    x.lineWidth = 2; x.strokeRect(34, 34, 956, 188);
    x.fillStyle = tab; x.fillRect(58, 78, 100, 100);
    x.fillStyle = '#f2ead8';
    x.font = '700 118px Georgia, serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 560, 134);
  }), 1, 1);
}

// Regulator dial / wall clock face: ticks, numerals, gilt arc, crimson hand.
export function gaugeTexture() {
  return tx(cnv(512, 512, (x) => {
    x.fillStyle = '#ece1c4'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill();
    x.strokeStyle = '#c9a227'; x.lineWidth = 16; x.beginPath(); x.arc(256, 256, 240, 0, 7); x.stroke();
    x.strokeStyle = '#c9a227'; x.lineWidth = 20;
    x.beginPath(); x.arc(256, 256, 208, -0.5, 0.65); x.stroke();
    x.fillStyle = '#26303a'; x.strokeStyle = '#26303a';
    x.font = '700 44px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5, c1 = Math.cos(a), s1 = Math.sin(a);
      x.lineWidth = i % 2 ? 4 : 8;
      x.beginPath(); x.moveTo(256 + c1 * 168, 256 + s1 * 168); x.lineTo(256 + c1 * 198, 256 + s1 * 198); x.stroke();
      x.fillText(String(i * 10), 256 + c1 * 128, 256 + s1 * 128);
    }
    const na = Math.PI * 0.75 + 0.68 * Math.PI * 1.5;
    x.strokeStyle = '#8a6d3b'; x.lineWidth = 10;
    x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.cos(na) * 176, 256 + Math.sin(na) * 176); x.stroke();
    x.fillStyle = '#c9a227'; x.beginPath(); x.arc(256, 256, 30, 0, 7); x.fill();
    x.fillStyle = '#26303a'; x.beginPath(); x.arc(256, 256, 12, 0, 7); x.fill();
  }), 1, 1);
}

// Painted sky for PMREM + background: pale-blue zenith, bright warm horizon
export function envTexture() {
  const c = cnv(1024, 512, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#9fc6e8'); g.addColorStop(0.34, '#cfe6f5');
    g.addColorStop(0.5, '#fdf6e3'); g.addColorStop(0.58, '#f3e5c3');
    g.addColorStop(0.75, '#d9c49a'); g.addColorStop(1, '#a98f66');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    const rng = makeRng(1177);
    for (let i = 0; i < 11; i++) {
      const px = rng() * 1024, py = 205 + rng() * 70;
      const r = x.createRadialGradient(px, py, 2, px, py, 52 + rng() * 46);
      r.addColorStop(0, 'rgba(255,252,238,0.95)'); r.addColorStop(1, 'rgba(255,252,238,0)');
      x.fillStyle = r; x.fillRect(px - 100, py - 100, 200, 200);
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function initTextures(aniso) {
  MAXA = Math.max(4, aniso || 4);
  const marbleC = marbleCanvas('color');
  TEX.marble = { map: tx(marbleC, 0.25, 0.25), bump: tx(marbleCanvas('bump'), 0.25, 0.25, false) };
  TEX.carpet = { map: tx(carpetCanvas(), 1 / 3.2, 1 / 3.2) };
  TEX.books = { map: tx(booksCanvas(), 1, 1) };
  TEX.panel = { map: tx(panelCanvas(), 1 / 2.4, 1 / 2.4) };
  TEX.wood = { map: tx(woodCanvas(), 0.5, 0.5) };
  TEX.catalog = { map: tx(catalogCanvas(), 1 / 3.4, 1 / 2.6) };
  TEX.plaster = { map: tx(plasterCanvas(), 1 / 2, 1 / 2) };
  const brassC = brassCanvas();
  TEX.brass = { map: tx(brassC, 1, 1), rough: tx(brassC, 1, 1, false) };
  return TEX;
}
