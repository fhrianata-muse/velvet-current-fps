// Seeded canvas textures (tile, terrazzo, panels, plaster, mosaic, brass) with
// bump/roughness partners, plus a painted equirect canvas for PMREM light.
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
function grime(x, w, h, y0, alpha) {
  const g = x.createLinearGradient(0, y0, 0, h);
  g.addColorStop(0, 'rgba(18,26,22,0)'); g.addColorStop(1, `rgba(18,26,22,${alpha})`);
  x.fillStyle = g; x.fillRect(0, y0, w, h - y0);
}

// Basin ceramic: 8x8 tiles per canvas, colour and bump modes.
function tileCanvas(mode) {
  const rng = makeRng(mode === 'color' ? 4101 : 4102);
  return cnv(1024, 1024, (x) => {
    x.fillStyle = mode === 'color' ? '#8f8672' : '#2a2a2a';
    x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const px = i * 128, py = j * 128, v = jit(rng, 0.05);
      if (mode === 'color') {
        x.fillStyle = `hsl(${174 + jit(rng, 6)},42%,${32 + v * 100}%)`;
        x.fillRect(px + 3, py + 3, 122, 122);
        x.fillStyle = 'rgba(255,246,220,0.20)'; x.fillRect(px + 3, py + 3, 122, 4);
        x.fillStyle = 'rgba(8,20,18,0.22)'; x.fillRect(px + 3, py + 120, 122, 5);
        for (let s = 0; s < 22; s++) {
          x.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
          x.fillRect(px + rng() * 128, py + rng() * 128, 2, 2);
        }
      } else { // bump: bright tile, dark grout, bevel shading
        const g = 205 + v * 60;
        x.fillStyle = `rgb(${g},${g},${g})`;
        x.fillRect(px + 3, py + 3, 122, 122);
        x.fillStyle = '#f2f2f2'; x.fillRect(px + 3, py + 3, 122, 3);
        x.fillStyle = '#6a6a6a'; x.fillRect(px + 3, py + 121, 122, 4);
      }
    }
    if (mode === 'color') grime(x, 1024, 1024, 800, 0.20);
  });
}

function terrazzoCanvas() {
  const rng = makeRng(5207);
  return cnv(1024, 1024, (x) => {
    x.fillStyle = '#e6dcc2'; x.fillRect(0, 0, 1024, 1024);
    const chipCols = ['#287f78', '#d97668', '#b58a45', '#493447', '#18343d', '#f4ecd8'];
    for (let i = 0; i < 620; i++) {
      x.fillStyle = chipCols[(rng() * chipCols.length) | 0];
      x.globalAlpha = 0.5 + rng() * 0.5;
      const s = 2 + rng() * 9, px = rng() * 1024, py = rng() * 1024;
      x.beginPath(); x.moveTo(px, py);
      x.lineTo(px + s, py + s * 0.4); x.lineTo(px + s * 0.5, py + s); x.closePath(); x.fill();
    }
    x.globalAlpha = 1;
    x.fillStyle = '#a8843e';
    x.fillRect(0, 510, 1024, 4); x.fillRect(510, 0, 4, 1024);
    x.fillStyle = 'rgba(60,50,30,0.16)'; x.fillRect(0, 514, 1024, 3); x.fillRect(514, 0, 3, 1024);
  });
}

// Deco wall panel: plaster, brass insets, stepped crest, jade dado.
function panelCanvas() {
  const rng = makeRng(6311);
  return cnv(1024, 1024, (x) => {
    x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 1024, 1024);
    speck(x, rng, 4200, ['rgba(120,105,70,1)', 'rgba(255,255,255,1)'], 0.05);
    x.strokeStyle = '#8a6c33'; x.lineWidth = 5; x.strokeRect(46, 46, 932, 932);
    x.strokeStyle = '#c8a354'; x.lineWidth = 2; x.strokeRect(66, 66, 892, 892);
    x.fillStyle = '#8a6c33';
    x.fillRect(412, 92, 200, 20); x.fillRect(442, 122, 140, 16); x.fillRect(472, 148, 80, 14);
    x.fillStyle = '#27655e'; x.fillRect(0, 768, 1024, 256);
    x.fillStyle = 'rgba(0,0,0,0.28)';
    x.fillRect(0, 806, 1024, 5); x.fillRect(0, 856, 1024, 5); x.fillRect(0, 906, 1024, 5);
    x.fillStyle = 'rgba(255,244,214,0.20)'; x.fillRect(0, 762, 1024, 6);
    grime(x, 1024, 1024, 880, 0.22);
  });
}

// Plaster: near-white (tints true), speckle, streaks, grime.
function plasterCanvas() {
  const rng = makeRng(7417);
  return cnv(1024, 1024, (x) => {
    x.fillStyle = '#f3ead9'; x.fillRect(0, 0, 1024, 1024);
    speck(x, rng, 8000, ['rgba(110,95,60,1)', 'rgba(255,255,255,1)'], 0.22);
    for (let i = 0; i < 36; i++) {
      x.fillStyle = `rgba(90,80,55,${0.10 + rng() * 0.18})`;
      x.fillRect(rng() * 1024, rng() * 300, 2 + rng() * 4, 260 + rng() * 500);
    }
    grime(x, 1024, 1024, 760, 0.34);
  });
}

// Sunburst mosaic: 24 wedges in tessera bands, brass rings, coral heart.
function mosaicCanvas() {
  const rng = makeRng(8521);
  return cnv(1024, 1024, (x) => {
    x.fillStyle = '#7d7460'; x.fillRect(0, 0, 1024, 1024);
    const cols = ['#2b857c', '#e8dfc8', '#2b857c', '#cfc4a6'];
    const bands = [120, 168, 222, 282, 348, 420, 498];
    for (let b = 0; b < bands.length - 1; b++) for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2;
      x.fillStyle = cols[(i + b) % 4];
      x.globalAlpha = 0.92 + jit(rng, 0.08);
      x.beginPath(); x.arc(512, 512, bands[b + 1], a0, a1); x.arc(512, 512, bands[b], a1, a0, true); x.closePath(); x.fill();
    }
    x.globalAlpha = 1;
    x.strokeStyle = '#8f8672'; x.lineWidth = 3;
    for (const r of bands) { x.beginPath(); x.arc(512, 512, r, 0, 7); x.stroke(); }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      x.beginPath(); x.moveTo(512 + Math.cos(a) * 120, 512 + Math.sin(a) * 120);
      x.lineTo(512 + Math.cos(a) * 498, 512 + Math.sin(a) * 498); x.stroke();
    }
    x.fillStyle = '#b58a45'; x.beginPath(); x.arc(512, 512, 506, 0, 7); x.fill();
    x.fillStyle = '#27655e'; x.beginPath(); x.arc(512, 512, 498, 0, 7); x.fill();
    x.fillStyle = '#d97668'; x.beginPath(); x.arc(512, 512, 118, 0, 7); x.fill();
    x.fillStyle = '#e8dfc8'; x.beginPath(); x.arc(512, 512, 44, 0, 7); x.fill();
    x.fillStyle = '#b58a45'; x.beginPath(); x.arc(512, 512, 20, 0, 7); x.fill();
  });
}

// Brushed brass: streaks, scratches, patina, wear strip. Its luminance is
// also the roughness map (bright wear = polished).
function brassCanvas() {
  const rng = makeRng(9533);
  return cnv(512, 512, (x) => {
    x.fillStyle = '#cfa85e';
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
    x.fillStyle = 'rgba(255,244,205,0.20)'; x.fillRect(0, 0, 512, 56);
    x.strokeStyle = 'rgba(255,250,225,0.5)';
    for (let i = 0; i < 55; i++) {
      const px = rng() * 512, py = rng() * 56;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + 8 + rng() * 22, py + jit(rng, 3)); x.stroke();
    }
  });
}

// Wayfinding sign: ink field, brass border, ivory capitals, team tab.
export function signTexture(text, tab) {
  return tx(cnv(1024, 256, (x) => {
    x.fillStyle = '#16303a'; x.fillRect(0, 0, 1024, 256);
    x.strokeStyle = '#b58a45'; x.lineWidth = 8; x.strokeRect(14, 14, 996, 228);
    x.lineWidth = 2; x.strokeRect(34, 34, 956, 188);
    x.fillStyle = tab; x.fillRect(58, 78, 100, 100);
    x.fillStyle = '#e8dfc8';
    x.font = '700 118px Georgia, serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 560, 134);
  }), 1, 1);
}

// Instrument dial: ticks, numerals, coral danger arc, brass hub.
export function gaugeTexture() {
  return tx(cnv(512, 512, (x) => {
    x.fillStyle = '#e9e0c6'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill();
    x.strokeStyle = '#b58a45'; x.lineWidth = 16; x.beginPath(); x.arc(256, 256, 240, 0, 7); x.stroke();
    x.strokeStyle = '#d97668'; x.lineWidth = 20;
    x.beginPath(); x.arc(256, 256, 208, -0.5, 0.65); x.stroke();
    x.fillStyle = '#22343a'; x.strokeStyle = '#22343a';
    x.font = '700 44px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5, c1 = Math.cos(a), s1 = Math.sin(a);
      x.lineWidth = i % 2 ? 4 : 8;
      x.beginPath(); x.moveTo(256 + c1 * 168, 256 + s1 * 168); x.lineTo(256 + c1 * 198, 256 + s1 * 198); x.stroke();
      x.fillText(String(i * 10), 256 + c1 * 128, 256 + s1 * 128);
    }
    const na = Math.PI * 0.75 + 0.68 * Math.PI * 1.5;
    x.strokeStyle = '#a83c2e'; x.lineWidth = 10;
    x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.cos(na) * 176, 256 + Math.sin(na) * 176); x.stroke();
    x.fillStyle = '#b58a45'; x.beginPath(); x.arc(256, 256, 30, 0, 7); x.fill();
    x.fillStyle = '#22343a'; x.beginPath(); x.arc(256, 256, 12, 0, 7); x.fill();
  }), 1, 1);
}

// Painted sky for PMREM + background: opal crown, jade horizon, petrol floor.
export function envTexture() {
  const c = cnv(1024, 512, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#18343d'); g.addColorStop(0.34, '#2e5f5c');
    g.addColorStop(0.5, '#55836e'); g.addColorStop(0.58, '#2c6e66');
    g.addColorStop(0.68, '#27505e'); g.addColorStop(1, '#101f26');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    const rng = makeRng(1177);
    for (let i = 0; i < 9; i++) {
      const px = rng() * 1024, py = 218 + rng() * 60;
      const r = x.createRadialGradient(px, py, 2, px, py, 42 + rng() * 40);
      r.addColorStop(0, 'rgba(255,241,207,0.85)'); r.addColorStop(1, 'rgba(255,241,207,0)');
      x.fillStyle = r; x.fillRect(px - 90, py - 90, 180, 180);
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function initTextures(aniso) {
  MAXA = Math.max(4, aniso || 4);
  const tileC = tileCanvas('color');
  TEX.tile = { map: tx(tileC, 0.5, 0.5), bump: tx(tileCanvas('bump'), 0.5, 0.5, false), rough: tx(tileC, 0.5, 0.5, false) };
  TEX.terrazzo = { map: tx(terrazzoCanvas(), 0.25, 0.25) };
  TEX.panel = { map: tx(panelCanvas(), 1 / 2.4, 1 / 2.4) };
  TEX.plaster = { map: tx(plasterCanvas(), 1 / 2, 1 / 2) };
  TEX.mosaic = { map: tx(mosaicCanvas(), 1 / 14, 1 / 14) };
  const brassC = brassCanvas();
  TEX.brass = { map: tx(brassC, 1, 1), rough: tx(brassC, 1, 1, false) };
  return TEX;
}
