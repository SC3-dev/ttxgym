#!/usr/bin/env node
/*
 * The places an exercise gets set — a server hall, an ambulance, a high street,
 * a treatment works — drawn rather than photographed.
 *
 * Photographs of these subjects are almost all licensed CC BY or CC BY-SA on the
 * free-media sites, which means an obligation that follows every copy of every
 * scenario anyone downloads and lands on facilitators who never agreed to it.
 * Generated imagery does not remove that problem so much as trade it for an
 * unsettled question about training data. Drawing them removes it outright:
 * there is no third party in the file.
 *
 * They are deliberately schematic. A tabletop needs a picture that says "this is
 * a hospital" in the two seconds before someone starts reading the stage text,
 * and a flat illustration does that at least as well as a photograph of a
 * hospital nobody in the room recognises.
 *
 *   node tools/build-scenes.js
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'lib', 'exercise_data', 'scenes');
const W = 1200, H = 750;

/* One dusk palette across every scene, so a gallery of them looks like a set
   rather than fifteen unrelated drawings. */
const C = {
  sky: '#1d2536', skyLow: '#2b3purple', ground: '#151a24', groundLit: '#1c2331',
  wall: '#2a3242', wallDark: '#222936', wallLight: '#37415466',
  lit: '#f5c26b', litDim: '#8a6a3a', glass: '#24406b', glassLit: '#3d6fb5',
  metal: '#4a5568', metalDark: '#333b49', line: '#5a6578',
  blue: '#2e7de0', teal: '#3ec9c8', amber: '#f5a623', red: '#e05252',
  white: '#e8ecf2', road: '#1b2029', kerb: '#39404e',
};
C.skyLow = '#33405c';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" `
  + `width="${W}" height="${H}" role="img">\n${body}\n</svg>\n`;

const r = (x, y, w, h, fill, o) => {
  const a = o || {};
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"`
    + `${a.rx != null ? ` rx="${a.rx}"` : ''}`
    + `${a.stroke ? ` stroke="${a.stroke}" stroke-width="${a.sw || 2}"` : ''}`
    + `${a.opacity != null ? ` opacity="${a.opacity}"` : ''}`
    + `${a.transform ? ` transform="${a.transform}"` : ''}/>`;
};
const p = (d, fill, o) => {
  const a = o || {};
  return `<path d="${d}" fill="${fill || 'none'}"`
    + `${a.stroke ? ` stroke="${a.stroke}" stroke-width="${a.sw || 2}"` : ''}`
    + `${a.cap ? ` stroke-linecap="${a.cap}"` : ''}`
    + `${a.opacity != null ? ` opacity="${a.opacity}"` : ''}/>`;
};
const c = (cx, cy, rad, fill, o) => {
  const a = o || {};
  return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}"`
    + `${a.stroke ? ` stroke="${a.stroke}" stroke-width="${a.sw || 2}"` : ''}`
    + `${a.opacity != null ? ` opacity="${a.opacity}"` : ''}/>`;
};
const ln = (x1, y1, x2, y2, stroke, sw, o) => {
  const a = o || {};
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw || 2}"`
    + `${a.dash ? ` stroke-dasharray="${a.dash}"` : ''}${a.cap ? ` stroke-linecap="${a.cap}"` : ''}`
    + `${a.opacity != null ? ` opacity="${a.opacity}"` : ''}/>`;
};

/* ── shared furniture ────────────────────────────────────────────────────── */

const sky = (horizon) =>
  `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">`
  + `<stop offset="0" stop-color="${C.sky}"/><stop offset="1" stop-color="${C.skyLow}"/>`
  + `</linearGradient></defs>`
  + r(0, 0, W, horizon, 'url(#sky)')
  + r(0, horizon, W, H - horizon, C.ground);

// a scattering of stars, so the sky is not a flat slab
const stars = (n, maxY) => Array.from({ length: n }, (_, i) => {
  const x = (i * 197 % W), y = (i * 83 % (maxY - 30)) + 14;
  return c(x, y, i % 4 === 0 ? 1.6 : 1, C.white, { opacity: 0.18 + (i % 5) * 0.06 });
}).join('');

// a grid of windows, some of them on
const windows = (x, y, w, h, cols, rows, lit) => {
  const gw = w / cols, gh = h / rows, pw = gw * 0.56, ph = gh * 0.5;
  let out = '';
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const on = ((i * 7 + j * 13) % 10) < lit;
    out += r(x + i * gw + (gw - pw) / 2, y + j * gh + (gh - ph) / 2, pw, ph,
      on ? C.lit : C.glass, { rx: 1, opacity: on ? 0.9 : 0.6 });
  }
  return out;
};

const wheels = (xs, y, rad) => xs.map(x =>
  c(x, y, rad, '#12161e') + c(x, y, rad * 0.45, C.metal)).join('');

// the flat blue light bar every British emergency vehicle carries
const lightBar = (x, y, w) =>
  r(x, y, w, 9, '#1a2740', { rx: 3 })
  + r(x + 4, y + 1.5, w / 2 - 6, 6, C.blue, { rx: 2 })
  + r(x + w / 2 + 2, y + 1.5, w / 2 - 6, 6, '#7fb4ff', { rx: 2 });

// the yellow-and-green chequer on an NHS ambulance, the yellow-and-blue on a
// police car: same idea, two rows of offset squares
const battenburg = (x, y, w, h, a, b) => {
  const n = Math.round(w / (h / 2));
  const cw = w / n, ch = h / 2;
  let out = '';
  for (let i = 0; i < n; i++) {
    out += r(x + i * cw, y, cw, ch, i % 2 ? a : b);
    out += r(x + i * cw, y + ch, cw, ch, i % 2 ? b : a);
  }
  return out;
};

const road = (y) =>
  r(0, y, W, H - y, C.road)
  + r(0, y, W, 6, C.kerb)
  + ln(0, y + (H - y) / 2, W, y + (H - y) / 2, C.line, 5, { dash: '54 40', opacity: 0.45 });

const caption = (s) =>
  r(0, H - 54, W, 54, '#0d1016', { opacity: 0.55 })
  + `<text x="34" y="${H - 20}" font-family="'Segoe UI',system-ui,sans-serif" font-size="21"`
  + ` fill="${C.white}" opacity="0.8">${esc(s)}</text>`;

module.exports = { W, H, C, svg, r, p, c, ln, sky, stars, windows, wheels, lightBar,
                   battenburg, road, caption, esc, DIR };

/* ── vehicles ────────────────────────────────────────────────────────────── */

const ambulance = () => svg(
  sky(470) + stars(50, 440)
  + r(0, 380, W, 92, C.wallDark)                        // a low building line behind
  + windows(60, 400, 400, 46, 10, 1, 4)
  + windows(700, 400, 420, 46, 10, 1, 3)
  + road(470)
  + `<g transform="translate(210,268)">`
  + r(0, 74, 800, 168, '#f2f4f7', { rx: 16 })           // body
  + r(150, 20, 640, 110, '#f2f4f7', { rx: 14 })         // box
  + r(0, 74, 175, 96, '#f2f4f7', { rx: 16 })            // cab
  + p('M24 92 L150 92 L150 160 L14 160 Z', C.glass)     // windscreen
  + r(196, 46, 120, 74, C.glass, { rx: 5 })             // side window
  + battenburg(150, 150, 640, 58, '#f5d400', '#0f9d58')
  + r(150, 208, 640, 12, '#0f9d58')
  + lightBar(300, 8, 340)
  + r(560, 60, 190, 34, '#c8102e', { rx: 4 })
  + `<text x="655" y="86" text-anchor="middle" font-family="'Segoe UI',sans-serif"`
  + ` font-size="26" font-weight="700" fill="#fff">AMBULANCE</text>`
  + wheels([230, 660], 250, 46)
  + `</g>`
  + caption('Ambulance')
);

const fireEngine = () => svg(
  sky(470) + stars(40, 430)
  + r(0, 360, W, 112, C.wallDark)
  + windows(80, 382, 340, 56, 8, 1, 5)
  + r(760, 300, 360, 172, '#232b3a')
  + windows(780, 320, 320, 60, 7, 1, 6)
  + road(470)
  + `<g transform="translate(180,240)">`
  + r(0, 96, 840, 168, '#c8102e', { rx: 14 })
  + r(0, 96, 200, 96, '#c8102e', { rx: 14 })
  + p('M22 112 L170 112 L170 182 L12 182 Z', C.glass)
  + r(230, 118, 580, 92, '#a50d24', { rx: 6 })
  + [0, 1, 2].map(i => r(250 + i * 190, 132, 160, 64, '#8e0a1e', { rx: 4 })).join('')
  + r(210, 44, 620, 22, C.metal, { rx: 6 })             // ladder
  + [0, 1, 2, 3, 4, 5, 6, 7].map(i => r(240 + i * 74, 44, 8, 22, C.metalDark)).join('')
  + battenburg(0, 232, 840, 32, '#f5d400', '#c8102e')
  + lightBar(300, 78, 300)
  + wheels([190, 640], 272, 48)
  + `</g>`
  + p('M980 470 q -30 -90 20 -150 q 40 60 10 150 Z', C.amber, { opacity: 0.35 })
  + caption('Fire and rescue')
);

const policeCar = () => svg(
  sky(470) + stars(46, 440)
  + r(0, 330, W, 142, C.wallDark)
  + windows(70, 352, 480, 58, 12, 1, 4)
  + windows(660, 352, 460, 58, 12, 1, 5)
  + road(470)
  + `<g transform="translate(230,300)">`
  + p('M10 150 q 30 -70 90 -76 L300 62 q 70 -58 170 -58 q 100 0 168 58 L640 80 q 78 12 88 70 Z', '#f2f4f7')
  + p('M330 68 q 58 -44 140 -44 q 82 0 140 44 Z', C.glass)
  + r(120, 96, 150, 54, '#f2f4f7', { rx: 6 })
  + battenburg(20, 104, 700, 44, '#f5d400', '#1a4fa0')
  + lightBar(330, -6, 220)
  + wheels([200, 580], 152, 42)
  + `</g>`
  + caption('Police')
);

const lorry = () => svg(
  sky(470) + stars(36, 430)
  + p(`M0 470 L0 398 Q 300 338 620 390 Q 900 434 ${W} 394 L${W} 470 Z`, '#222b3a')
  + road(470)
  + `<g transform="translate(110,246)">`
  + r(252, 4, 726, 184, '#dfe4ec', { rx: 6 })                       // trailer
  + r(252, 4, 726, 22, '#c6ccd8', { rx: 6 })
  + [0, 1, 2, 3, 4].map(i => ln(300 + i * 138, 30, 300 + i * 138, 182, '#c6ccd8', 3)).join('')
  + r(268, 150, 694, 38, '#c6ccd8')
  + r(430, 66, 360, 60, '#2f6fd0', { rx: 4, opacity: 0.85 })        // livery panel
  + r(0, 54, 246, 134, '#2f6fd0', { rx: 14 })                       // cab
  + p('M20 70 L168 70 L178 128 L14 128 Z', C.glass)
  + r(0, 150, 246, 38, '#24549f', { rx: 6 })
  + r(2, 96, 22, 40, '#24549f', { rx: 4 })
  + r(236, 92, 30, 96, '#39435a', { rx: 3 })                        // the gap behind the cab
  + wheels([116, 712, 806, 900], 196, 40)
  + r(252, 186, 726, 10, '#9aa3b2', { rx: 4 })
  + `</g>`
  + caption('Delivery and logistics')
);

/* ── places ──────────────────────────────────────────────────────────────── */

const highStreet = () => {
  const shops = [
    [40, 250, '#3b4256', '#e05252'], [290, 200, '#333c4e', '#f5a623'],
    [500, 270, '#3a4356', '#3ec9c8'], [730, 220, '#323a4c', '#2e7de0'],
    [950, 250, '#3b4256', '#8ac926'],
  ];
  return svg(
    sky(560) + stars(60, 500)
    + shops.map(([x, h, wall, sign]) => {
      const w = x === 950 ? 210 : 230, top = 560 - h;
      return r(x, top, w, h, wall)
        + r(x, top, w, 10, C.wallDark)
        + windows(x + 16, top + 22, w - 32, h - 150, 3, Math.max(1, Math.round((h - 150) / 56)), 5)
        + r(x + 10, 560 - 126, w - 20, 34, sign, { rx: 3, opacity: 0.85 })   // fascia
        + r(x + 16, 560 - 86, w - 32, 86, C.glassLit, { opacity: 0.55 })     // shopfront
        + r(x + w / 2 - 22, 560 - 72, 44, 72, C.wallDark, { rx: 2 });        // door
    }).join('')
    + r(0, 560, W, 26, C.kerb)
    + road(586)
    + [140, 420, 700, 980].map(x =>
      ln(x, 430, x, 560, C.metal, 5) + c(x, 424, 9, C.lit, { opacity: 0.9 })
      + c(x, 424, 26, C.lit, { opacity: 0.12 })).join('')
    + caption('High street')
  );
};

const hospital = () => svg(
  sky(600) + stars(48, 520)
  + r(150, 236, 900, 364, '#2e374a')
  + r(150, 236, 900, 16, '#39435a')
  + windows(190, 276, 820, 230, 14, 4, 6)
  + r(470, 470, 260, 130, '#39435a')                    // entrance block
  + r(500, 506, 200, 94, C.glassLit, { opacity: 0.6 })
  + r(440, 408, 320, 46, '#151b26', { rx: 5 })
  + `<text x="600" y="440" text-anchor="middle" font-family="'Segoe UI',sans-serif"`
  + ` font-size="28" font-weight="700" fill="${C.white}" opacity="0.9">HOSPITAL</text>`
  + r(806, 300, 96, 300, '#e05252', { opacity: 0.12 })
  + r(838, 330, 32, 96, C.red, { rx: 3 }) + r(806, 362, 96, 32, C.red, { rx: 3 })
  + r(0, 600, W, 150, C.groundLit)
  + r(180, 640, 300, 8, C.kerb) + r(720, 640, 300, 8, C.kerb)
  + `<text x="600" y="672" text-anchor="middle" font-family="'Segoe UI',sans-serif"`
  + ` font-size="19" fill="${C.amber}" opacity="0.75">A &amp; E  ·  AMBULANCES ONLY</text>`
  + caption('Hospital')
);

const supermarket = () => svg(
  /* Straight-on rather than in perspective: the receding version turned the
     shelves into floating grids of colour and lost the tills entirely. */
  r(0, 0, W, H, '#1a202c')
  + r(0, 0, W, 126, '#232b3a')
  + [0, 1, 2, 3, 4, 5].map(i => r(80 + i * 185, 42, 130, 13, C.lit, { rx: 6, opacity: 0.85 })
    + p(`M${80 + i * 185} 55 L${62 + i * 185} 126 L${228 + i * 185} 126 L${210 + i * 185} 55 Z`,
        C.lit, { opacity: 0.05 })).join('')
  + r(0, 126, W, 330, '#1f2735')
  + // aisle gondolas in flat elevation, with a visible gap between them
  [0, 1, 2, 3].map(i => {
    const x = 46 + i * 296, w = 244;
    return r(x, 178, w, 268, '#303a4b', { rx: 4 })
      + r(x, 178, w, 22, '#3c4759', { rx: 4 })
      + r(x + 54, 182, w - 108, 14, C.teal, { rx: 2, opacity: 0.35 })   // aisle sign
      + [0, 1, 2, 3].map(k => {
        const y = 210 + k * 60;
        return r(x + 8, y, w - 16, 52, '#252e3d', { rx: 2 })
          + r(x + 8, y + 50, w - 16, 5, '#3c4759')
          + Array.from({ length: 7 }, (_, j) =>
            r(x + 14 + j * ((w - 28) / 7), y + 8, (w - 28) / 7 - 6, 40,
              [C.teal, C.amber, C.red, C.blue, '#8ac926', '#b07de0', '#e08a3e'][(i + k + j) % 7],
              { rx: 2, opacity: 0.55 })).join('');
      }).join('');
  }).join('')
  + r(0, 446, W, 26, '#242d3c')
  + // the checkout run, the thing the picture is actually for
  r(0, 472, W, 278, '#263040')
  + [0, 1, 2].map(i => {
    const x = 70 + i * 390;
    return r(x, 560, 320, 44, '#39435a', { rx: 6 })                   // belt
      + [0, 1, 2, 3, 4, 5].map(j => ln(x + 24 + j * 50, 560, x + 24 + j * 50, 604, '#2e384a', 4)).join('')
      + r(x, 604, 320, 96, '#2e3849', { rx: 6 })                      // unit
      + r(x + 16, 616, 288, 12, '#39435a', { rx: 6 })
      + r(x + 196, 470, 124, 96, '#141a24', { rx: 6 })                // screen on a post
      + r(x + 206, 480, 104, 72, C.glassLit, { rx: 3, opacity: 0.75 })
      + [0, 1, 2].map(j => r(x + 214, 488 + j * 18, 62 - j * 14, 8, C.white, { rx: 3, opacity: 0.35 })).join('')
      + r(x + 244, 566, 28, 40, '#39435a')
      + r(x + 24, 520, 108, 44, '#1d2531', { rx: 5 })                 // scanner well
      + r(x + 32, 528, 92, 28, C.teal, { rx: 3, opacity: 0.4 })
      + c(x + 78, 542, 6, C.red, { opacity: 0.85 })
      + r(x + 150, 700, 20, 50, '#232c3b') + r(x + 240, 700, 20, 50, '#232c3b');
  }).join('')
  + caption('Retail and checkout')
);

const factory = () => svg(
  r(0, 0, W, H, '#161b25')
  + r(0, 0, W, 158, '#1d2432')
  + [0, 1, 2, 3, 4, 5].map(i => r(70 + i * 190, 48, 150, 12, C.lit, { rx: 6, opacity: 0.8 })
    + p(`M${70 + i * 190} 60 L${58 + i * 190} 158 L${244 + i * 190} 158 L${220 + i * 190} 60 Z`,
        C.lit, { opacity: 0.045 })).join('')
  + r(0, 158, W, 300, '#1b2230')                                   // back wall
  + [0, 1, 2, 3].map(i => r(60 + i * 300, 196, 190, 96, '#232c3b', { rx: 3 })
    + windows(70 + i * 300, 206, 170, 76, 3, 2, 4)).join('')
  + p(`M0 750 L250 440 L950 440 L${W} 750 Z`, '#212836')           // floor
  + [0.3, 0.62].map(f => ln(250 - 250 * f + 0, 440 + (750 - 440) * f,
      950 + 250 * f, 440 + (750 - 440) * f, '#262f3d', 3)).join('')
  + // three machining cells along the back
  [0, 1, 2].map(i => {
    const x = 150 + i * 360;
    return r(x, 262, 210, 196, '#2b3444', { rx: 8 })
      + r(x + 18, 286, 174, 104, '#171d28', { rx: 4 })
      + r(x + 28, 296, 154, 84, [C.blue, C.teal, C.blue][i], { rx: 2, opacity: 0.4 })
      + [0, 1, 2].map(j => r(x + 34 + j * 52, 306, 36, 10, C.white, { rx: 2, opacity: 0.35 })).join('')
      + r(x + 30, 406, 150, 18, C.amber, { rx: 9, opacity: 0.75 })
      + c(x + 186, 282, 7, C.teal) + c(x + 186, 302, 7, C.amber, { opacity: 0.55 })
      // a jointed arm, which is what says "production line" fastest
      + p(`M${x + 105} 458 L${x + 105} 388 L${x + 168} 344 L${x + 214} 366`,
          null, { stroke: C.metal, sw: 11, cap: 'round' })
      + c(x + 105, 388, 10, C.metalDark) + c(x + 168, 344, 9, C.metalDark)
      + c(x + 214, 366, 7, C.amber, { opacity: 0.8 });
  }).join('')
  + // conveyor across the front, carrying something
  p(`M40 604 L${W - 40} 604 L${W - 40} 648 L40 648 Z`, '#39435a')
  + p(`M40 648 L${W - 40} 648 L${W - 40} 664 L40 664 Z`, '#2b3444')
  + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => ln(70 + i * 130, 604, 70 + i * 130, 648, '#2b3444', 3)).join('')
  + [0, 1, 2, 3, 4, 5, 6].map(i => r(96 + i * 156, 556, 96, 48, '#4a5568', { rx: 4 })
    + r(104 + i * 156, 564, 80, 32, [C.teal, C.amber, C.blue][i % 3], { rx: 2, opacity: 0.45 })).join('')
  + [130, 600, 1070].map(x => r(x - 12, 664, 24, 66, '#2b3444')).join('')
  + caption('Production floor')
);

/* ── infrastructure ──────────────────────────────────────────────────────── */

const serverHall = () => {
  /* Two banks of racks either side of a cold aisle, drawn as a straight
     one-point perspective: each bank is a row of trapezoids getting shorter and
     narrower towards the vanishing point, with a column of status lights down
     the face of each so it reads as equipment rather than as furniture. */
  const VX = 600, VY = 330;                 // where the aisle goes to
  const bank = (side) => {
    let out = '';
    for (let i = 0; i < 8; i++) {
      const t0 = i / 8, t1 = (i + 1) / 8;
      const k = f => 0.1 + f * 0.62;        // how far along the aisle
      const edge = f => side < 0 ? 40 + (VX - 130 - 40) * k(f) : W - 40 - (VX - 130 - 40) * k(f);
      const top = f => 150 + (VY - 150) * k(f);
      const bot = f => 700 - (700 - VY - 40) * k(f);
      const x0 = edge(t0), x1 = edge(t1);
      const face = i % 2 ? '#262f3f' : '#2b3545';
      out += p(`M${x0} ${top(t0)} L${x1} ${top(t1)} L${x1} ${bot(t1)} L${x0} ${bot(t0)} Z`, face);
      out += p(`M${x0} ${top(t0)} L${x1} ${top(t1)} L${x1} ${bot(t1)} L${x0} ${bot(t0)} Z`,
        null, { stroke: '#161c26', sw: 2 });
      // status lights, thinning with distance
      const n = 10 - i;
      for (let j = 0; j < n; j++) {
        const f = (j + 0.5) / n;
        const yy = top(t0) + (bot(t0) - top(t0)) * f;
        const rr = Math.max(1.4, 4 - i * 0.35);
        const cx = x0 + (x1 - x0) * (side < 0 ? 0.72 : 0.28);
        out += c(cx, yy, rr, (i + j) % 5 === 0 ? C.amber : C.teal, { opacity: 0.95 - i * 0.06 });
        out += r(Math.min(x0, x1) + 6, yy - rr, Math.abs(x1 - x0) - 12, rr * 0.9,
          '#1b2230', { opacity: 0.8 });
      }
    }
    return out;
  };
  return svg(
    r(0, 0, W, H, '#0e121a')
    + r(0, 0, W, 200, '#141a24')
    + [0, 1, 2, 3, 4].map(i =>
      r(VX - 60 - i * 3, 50 + i * 30, 120 + i * 6, 9, C.lit, { rx: 4, opacity: 0.75 - i * 0.12 })).join('')
    + p(`M40 700 L${VX - 130} ${VY + 40} L${VX + 130} ${VY + 40} L${W - 40} 700 Z`, '#1a212d')
    + p(`M40 700 L${VX - 130} ${VY + 40} L${VX + 130} ${VY + 40} L${W - 40} 700 Z`,
        null, { stroke: '#232c3a', sw: 2 })
    + [0.25, 0.5, 0.75].map(f =>
      ln(40 + (VX - 170) * f, 700 - (700 - VY - 40) * f,
         W - 40 - (VX - 170) * f, 700 - (700 - VY - 40) * f, '#212a37', 2)).join('')
    + bank(-1) + bank(1)
    + r(VX - 130, VY - 10, 260, 50, '#1b2534')
    + r(VX - 96, VY + 2, 192, 26, C.glassLit, { rx: 3, opacity: 0.45 })
    + caption('Data hall')
  );
};

const rackCabinet = () => svg(
  r(0, 0, W, H, '#151a24')
  + r(320, 60, 560, 660, '#20design', { rx: 10 }).replace('#20design', '#202836')
  + r(340, 80, 520, 620, '#151b26', { rx: 6 })
  + Array.from({ length: 13 }, (_, i) => {
    const y = 96 + i * 46;
    const kind = i % 4;
    return r(352, y, 496, 38, kind === 3 ? '#1b2230' : '#2b3443', { rx: 3 })
      + (kind === 3
        ? Array.from({ length: 12 }, (_, j) =>
          r(368 + j * 40, y + 10, 26, 18, '#121721', { rx: 2 })
          + c(374 + j * 40, y + 30, 2.6, j % 3 ? C.teal : C.amber, { opacity: 0.9 })).join('')
        : r(368, y + 12, 200, 14, '#39435a', { rx: 3 })
          + [0, 1, 2, 3, 4, 5].map(j => c(620 + j * 34, y + 19, 4,
            (i + j) % 6 === 0 ? C.amber : C.teal, { opacity: 0.85 })).join(''));
  }).join('')
  + // the cable loom down the side, which is what a rack actually looks like
  [0, 1, 2, 3, 4, 5, 6, 7].map(i =>
    p(`M${860 + i * 4} ${140 + i * 60} C 940 ${150 + i * 60}, 960 ${260 + i * 40}, 900 ${700}`,
      null, { stroke: [C.blue, C.teal, '#8ac926', C.amber][i % 4], sw: 3, opacity: 0.55 })).join('')
  + r(320, 60, 560, 14, '#39435a', { rx: 6 })
  + caption('Rack and cabling')
);

const office = () => svg(
  r(0, 0, W, H, '#1a202c')
  + r(0, 0, W, 130, '#212838')
  + [0, 1, 2, 3, 4, 5].map(i => r(70 + i * 190, 46, 140, 12, C.lit, { rx: 6, opacity: 0.8 })).join('')
  + r(0, 130, W, 150, '#243048')                        // window wall
  + [0, 1, 2, 3, 4, 5, 6].map(i => r(30 + i * 170, 150, 140, 110, C.glassLit, { rx: 2, opacity: 0.5 })
    + ln(30 + i * 170 + 70, 150, 30 + i * 170 + 70, 260, '#1b2230', 3)).join('')
  + p(`M0 750 L180 300 L1020 300 L${W} 750 Z`, '#212939')
  + [0, 1, 2].map(row => {
    const y = 330 + row * 130, scale = 1 + row * 0.24;
    return [0, 1, 2, 3].map(i => {
      const w = 190 * scale, gap = 40 * scale;
      const x = W / 2 - (2 * w + 1.5 * gap) + i * (w + gap);
      return r(x, y, w, 16 * scale, '#39435a', { rx: 3 })          // desk
        + r(x + 10, y - 40 * scale, 78 * scale, 46 * scale, '#161c27', { rx: 3 })
        + r(x + 14, y - 36 * scale, 70 * scale, 38 * scale,
          [C.blue, C.teal, C.glassLit][(row + i) % 3], { rx: 2, opacity: 0.45 })
        + r(x + 100 * scale, y - 12 * scale, 60 * scale, 12 * scale, '#2b3443', { rx: 2 })
        + r(x + 6, y + 16 * scale, 10 * scale, 40 * scale, '#2b3443')
        + r(x + w - 16 * scale, y + 16 * scale, 10 * scale, 40 * scale, '#2b3443')
        + r(x - 6, y - 70 * scale, w + 12, 30 * scale, '#2a3purple', { rx: 3, opacity: 0.5 })
          .replace('#2a3purple', '#2a3446');
    }).join('');
  }).join('')
  + caption('Office floor')
);

const waterWorks = () => {
  // a circular clarifier: a rim, water inside it, and the rotating bridge across
  const tank = (cx, cy, rad) => {
    const ry = rad * 0.4;
    return `<ellipse cx="${cx}" cy="${cy + 14}" rx="${rad + 8}" ry="${ry + 6}" fill="#151b25"/>`
      + `<ellipse cx="${cx}" cy="${cy}" rx="${rad}" ry="${ry}" fill="#4a5568"/>`
      + `<ellipse cx="${cx}" cy="${cy}" rx="${rad - 12}" ry="${ry - 10}" fill="#1d3d52"/>`
      + `<ellipse cx="${cx}" cy="${cy + 3}" rx="${rad - 26}" ry="${ry - 20}" fill="#2a6b8c" opacity="0.8"/>`
      + `<ellipse cx="${cx - rad * 0.22}" cy="${cy - 2}" rx="${rad * 0.34}" ry="${ry * 0.34}" fill="#3f8fb5" opacity="0.45"/>`
      + ln(cx - rad + 6, cy, cx + rad - 6, cy, '#6d7a8c', 6)
      + ln(cx - rad + 6, cy - 7, cx + rad - 6, cy - 7, '#8а99ab'.replace('а','a'), 2, { opacity: 0.5 })
      + r(cx - 16, cy - 30, 32, 30, '#4a5568', { rx: 3 })
      + c(cx, cy, 10, '#6d7a8c');
  };
  return svg(
    sky(430) + stars(44, 400)
    + p(`M0 430 L0 376 Q 260 340 520 368 Q 800 398 ${W} 362 L${W} 430 Z`, '#242e3d')
    + r(0, 430, W, 320, '#1e2733')
    + // plant building and pipe gallery behind
    r(690, 268, 260, 152, '#2b3444', { rx: 3 })
    + r(690, 268, 260, 14, '#39435a')
    + windows(708, 296, 224, 100, 4, 2, 5)
    + r(60, 396, 1080, 14, '#4a5568', { rx: 7 })
    + r(60, 410, 1080, 6, '#333b49', { rx: 3 })
    + [130, 330, 560, 820, 1040].map(x => r(x, 416, 16, 52, '#39435a')).join('')
    + [230, 470, 700, 930].map(x => c(x, 403, 15, '#5d6a7d') + r(x - 4, 384, 8, 20, '#39435a')).join('')
    + r(980, 300, 34, 120, '#39435a') + c(997, 296, 20, '#4a5568')
    + tank(270, 558, 200) + tank(680, 592, 158) + tank(985, 536, 120)
    + // handrail along the front
    ln(0, 700, W, 700, '#39435a', 4)
    + Array.from({ length: 16 }, (_, i) => ln(40 + i * 78, 700, 40 + i * 78, 730, '#39435a', 3)).join('')
    + caption('Water treatment')
  );
};

const pylons = () => svg(
  sky(520) + stars(56, 470)
  + p(`M0 520 L0 456 Q 300 412 640 446 Q 940 476 ${W} 438 L${W} 520 Z`, '#26303f')
  + r(0, 520, W, 230, '#1b2330')
  + [0, 1, 2, 3, 4, 5].map(i => ln(0, 548 + i * 34, W, 530 + i * 34, '#222b39', 2, { opacity: 0.7 })).join('')
  + [[250, 1, 0.95], [660, 0.72, 0.7], [980, 0.5, 0.5]].map(([x, s2, op]) => {
    const base = 520 + 40 * (1 - s2), top = base - 360 * s2, w = 104 * s2;
    const arm = (f, len) => {
      const y = top + (base - top) * f;
      return `<path d="M${x - len} ${y} L${x + len} ${y}"/>`
        + `<path d="M${x - len} ${y} l ${len * 0.22} ${-14 * s2} M${x + len} ${y} l ${-len * 0.22} ${-14 * s2}"/>`
        + `<circle cx="${x - len}" cy="${y + 5 * s2}" r="${3.4 * s2}" fill="${C.metal}" stroke="none"/>`
        + `<circle cx="${x + len}" cy="${y + 5 * s2}" r="${3.4 * s2}" fill="${C.metal}" stroke="none"/>`;
    };
    return `<g stroke="${C.line}" stroke-width="${4 * s2}" fill="none" opacity="${op}" stroke-linecap="round">`
      + `<path d="M${x - w} ${base} L${x - w * 0.24} ${top} L${x + w * 0.24} ${top} L${x + w} ${base}"/>`
      + `<path d="M${x - w * 0.24} ${top} L${x + w * 0.24} ${top}"/>`
      + [0.26, 0.5, 0.74].map((f, i) => arm(f, w * (0.5 + i * 0.34))).join('')
      + `<g stroke-width="${2.2 * s2}" opacity="0.8">`
      + [0.13, 0.38, 0.62, 0.86].map(f => {
        const y = top + (base - top) * f, ww = w * (0.24 + f * 0.76);
        return `<path d="M${x - ww} ${y} L${x + ww} ${y + 26 * s2}"/><path d="M${x + ww} ${y} L${x - ww} ${y + 26 * s2}"/>`;
      }).join('') + `</g></g>`;
  }).join('')
  + [[0.26, 0.5], [0.5, 0.34], [0.74, 0.18]].map(([f, sag]) => {
    const y1 = 160 + f * 360, y2 = 262 + f * 259, y3 = 340 + f * 180;
    return p(`M148 ${y1} Q 400 ${y1 + 70 * sag + 30} 660 ${y2}`, null, { stroke: C.line, sw: 2.4, opacity: 0.8 })
      + p(`M352 ${y1} Q 500 ${y1 + 70 * sag + 26} 660 ${y2}`, null, { stroke: C.line, sw: 2.4, opacity: 0.55 })
      + p(`M660 ${y2} Q 820 ${y2 + 40 * sag + 18} 980 ${y3}`, null, { stroke: C.line, sw: 1.8, opacity: 0.6 });
  }).join('')
  + caption('Transmission')
);

const substation = () => svg(
  sky(500) + stars(40, 460)
  + r(0, 500, W, 250, '#1e2733')
  + [0, 1, 2, 3, 4, 5, 6].map(i => ln(0, 520 + i * 34, W, 512 + i * 34, '#232c3a', 2, { opacity: 0.5 })).join('')
  + // the brick cabinet on the corner of every estate
  r(380, 250, 440, 258, '#6b4a3f')
  + Array.from({ length: 13 }, (_, j) => Array.from({ length: 10 }, (_, i) =>
    r(382 + i * 44 + (j % 2 ? 22 : 0), 252 + j * 20, 40, 16, '#7a5548', { rx: 1, opacity: 0.55 })).join('')).join('')
  + r(372, 238, 456, 20, '#55403a', { rx: 3 })
  + r(520, 316, 160, 192, '#2f6f86', { rx: 2 })          // the blue steel door
  + ln(600, 316, 600, 508, '#25596b', 3)
  + c(578, 418, 5, '#1d4a5a') + c(622, 418, 5, '#1d4a5a')
  + r(700, 330, 78, 96, '#f5d400', { rx: 3 })            // danger of death sign
  + p('M739 344 L770 406 L708 406 Z', '#1a1a1a')
  + `<text x="739" y="398" text-anchor="middle" font-family="'Segoe UI',sans-serif"`
  + ` font-size="34" font-weight="700" fill="#f5d400">!</text>`
  + `<text x="739" y="420" text-anchor="middle" font-family="'Segoe UI',sans-serif"`
  + ` font-size="11" font-weight="700" fill="#1a1a1a">DANGER OF DEATH</text>`
  + r(340, 496, 520, 14, '#2a3purple').replace('#2a3purple', '#39424f')
  + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => r(150 + i * 110, 470, 8, 40, '#2b3444')).join('')
  + caption('Local substation')
);

/* ── write them out ──────────────────────────────────────────────────────── */

const SCENES = {
  'ambulance.svg': ambulance,
  'fire-and-rescue.svg': fireEngine,
  'police.svg': policeCar,
  'delivery-lorry.svg': lorry,
  'high-street.svg': highStreet,
  'hospital.svg': hospital,
  'supermarket.svg': supermarket,
  'production-floor.svg': factory,
  'data-hall.svg': serverHall,
  'rack-and-cabling.svg': rackCabinet,
  'office-floor.svg': office,
  'water-treatment.svg': waterWorks,
  'transmission.svg': pylons,
  'local-substation.svg': substation,
};

function build(opts) {
  const quiet = !!(opts && opts.quiet);
  fs.mkdirSync(DIR, { recursive: true });
  Object.entries(SCENES).forEach(([name, draw]) => {
    const out = draw();
    fs.writeFileSync(path.join(DIR, name), out);
    if (!quiet) console.log(`  ${name.padEnd(26)} ${(out.length / 1024).toFixed(1)} KB`);
  });
  if (!quiet) console.log(`\n${Object.keys(SCENES).length} scenes. Run tools/build-gallery.js to list them.`);
  return Object.keys(SCENES).length;
}

if (require.main === module) build();
module.exports.build = build;
module.exports.SCENES = SCENES;
