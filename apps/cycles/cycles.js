/* Cycle viewer: a sampled persistence diagram (left) and the representative cycle of a chosen point
   among the real atoms around it (right). Plain JavaScript and canvas, no libraries, no network.
   Data: data.js (window.CYCLE_DATA). Embedded in the deck as an iframe; also works opened on its own. */
(() => {
  'use strict';
  const D = window.CYCLE_DATA;
  const GREEN = '#3DDC97', VIOLET = '#B794F6', TEXT = '#EDF1FA', AXIS = '#AAB5CC', FRAME = '#6A7694', BG = '#0B1120';
  const $ = id => document.getElementById(id);
  const embedded = window.parent !== window;
  if (!embedded) document.body.classList.add('standalone');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state = { T: 5000, d: 1, b: 'long' };
  let yaw = 0.6, pitch = 0.35, drag = null, autoTour = !reduceMotion;

  const OPTIONS = {
    gT: { key: 'T', items: [[5000, '5000 K'], [10000, '10000 K']] },
    gD: { key: 'd', items: [[1, 'H1 loop'], [2, 'H2 void']] },
    gB: { key: 'b', items: [['short', 'short-lived'], ['mid', 'middle'], ['long', 'long-lived']] },
  };
  const color = () => (state.T === 5000 ? GREEN : VIOLET);
  const current = () => D.X.find(e => e.T === state.T && e.d === state.d && e.b === state.b);
  const examples = () => D.X.filter(e => e.T === state.T && e.d === state.d);

  /* ---------------------------------------------------------------- buttons */
  function drawButtons() {
    for (const id in OPTIONS) {
      const g = $(id), o = OPTIONS[id];
      g.innerHTML = '';
      o.items.forEach(([value, label]) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.className = state[o.key] === value ? 'on' : '';
        b.setAttribute('aria-pressed', state[o.key] === value);
        b.addEventListener('click', () => { setAuto(false); state[o.key] = value; drawButtons(); drawDiagram(); });
        g.appendChild(b);
      });
    }
    const g = $('gA'); g.innerHTML = '';
    const b = document.createElement('button');
    b.textContent = autoTour ? 'auto: on' : 'auto: off';
    b.className = autoTour ? 'on' : '';
    b.setAttribute('aria-pressed', autoTour);
    b.addEventListener('click', () => { setAuto(!autoTour); });
    g.appendChild(b);
  }
  function setAuto(on) { autoTour = on; drawButtons(); }

  /* ---------------------------------------------------------------- persistence diagram (square axes) */
  const PD = { W: 470, H: 450, left: 74, top: 14, size: 370 };
  function extent() {           // axis limit that holds every sampled point, rounded up
    const S = D.S[state.T + '_' + state.d];
    let m = 0;
    for (let i = 1; i < S.length; i += 2) m = Math.max(m, S[i] / 10);
    examples().forEach(e => { m = Math.max(m, e.de); });
    const step = m > 6 ? 2 : 1;
    return { E: Math.ceil(m / step) * step, step };
  }
  const px = (v, E) => PD.left + v / E * PD.size;
  const py = (v, E) => PD.top + PD.size - v / E * PD.size;

  function drawDiagram() {
    const c = $('pd').getContext('2d'), { E, step } = extent();
    c.clearRect(0, 0, PD.W, PD.H);
    c.lineWidth = 2; c.strokeStyle = FRAME; c.strokeRect(PD.left, PD.top, PD.size, PD.size);
    c.font = "25px 'LM Roman'"; c.fillStyle = TEXT;
    for (let v = 0; v <= E; v += step) {
      c.textAlign = 'center'; c.fillText(v, px(v, E), PD.top + PD.size + 28);
      c.textAlign = 'right'; c.fillText(v, PD.left - 8, py(v, E) + 8);
    }
    c.textAlign = 'center'; c.fillText('birth (Å²)', PD.left + PD.size / 2, PD.H - 4);
    c.save(); c.translate(20, PD.top + PD.size / 2); c.rotate(-Math.PI / 2); c.fillText('death (Å²)', 0, 0); c.restore();
    c.strokeStyle = AXIS; c.beginPath(); c.moveTo(px(0, E), py(0, E)); c.lineTo(px(E, E), py(E, E)); c.stroke();

    const S = D.S[state.T + '_' + state.d];
    c.fillStyle = color(); c.globalAlpha = 0.45;
    for (let i = 0; i < S.length; i += 2) { c.beginPath(); c.arc(px(S[i] / 10, E), py(S[i + 1] / 10, E), 4, 0, 2 * Math.PI); c.fill(); }
    c.globalAlpha = 1;
    examples().forEach(e => {
      const on = e.b === state.b;
      c.beginPath(); c.arc(px(e.bi, E), py(e.de, E), on ? 11 : 7, 0, 2 * Math.PI);
      c.fillStyle = on ? color() : BG; c.fill(); c.lineWidth = 3; c.strokeStyle = TEXT; c.stroke();
    });
    const e = current();
    c.setLineDash([6, 6]); c.lineWidth = 2; c.strokeStyle = color(); c.beginPath();
    c.moveTo(px(e.bi, E), py(e.de, E)); c.lineTo(px(e.bi, E), py(0, E));
    c.moveTo(px(e.bi, E), py(e.de, E)); c.lineTo(px(0, E), py(e.de, E));
    c.stroke(); c.setLineDash([]);
  }

  /* ---------------------------------------------------------------- 3-D atoms */
  function rotate(p) {
    const [x, y, z] = p.map(v => v / 10), cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const a = x * cy + z * sy, b = -x * sy + z * cy;
    return [a, y * cp - b * sp, y * sp + b * cp];
  }
  const triples = a => { const o = []; for (let i = 0; i < a.length; i += 3) o.push([a[i], a[i + 1], a[i + 2]]); return o; };

  /* One depth-sorted list of everything (atoms, cycle edges, void faces), drawn back to front, so an atom
     behind the cycle is hidden by it and an atom in front covers it. Drawing the cycle first and all atoms
     on top made atoms behind a void look as if they were inside it. Depth is also shown by fog. */
  function drawAtoms() {
    const c = $('atoms').getContext('2d'), W = 860, H = 450, e = current(), k = 44;
    c.clearRect(0, 0, W, H);
    const P = q => [W / 2 + q[0] * k, H / 2 - q[1] * k - 18];
    const V = triples(e.V).map(rotate), A = triples(e.A).map(rotate), F = [];
    for (let i = 0; i < e.F.length; i += e.K) F.push(e.F.slice(i, i + e.K));
    const zs = [...V, ...A].map(q => q[2]), zmin = Math.min(...zs), zmax = Math.max(...zs);
    const near = z => (z - zmin) / Math.max(1e-6, zmax - zmin);          // 0 = farthest, 1 = nearest
    const items = [];
    A.forEach(q => items.push({ z: q[2], kind: 'atom', q, on: false }));
    V.forEach(q => items.push({ z: q[2], kind: 'atom', q, on: true }));
    if (e.K === 3) F.forEach(f => items.push({ z: f.reduce((s, j) => s + V[j][2], 0) / 3 - 0.05, kind: 'face', f }));
    const seen = new Set();
    F.forEach(f => {
      const n = f.length;
      for (let i = 0; i < (n === 2 ? 1 : n); i++) {
        const a = f[i], b = f[(i + 1) % n], key = Math.min(a, b) + '-' + Math.max(a, b);
        if (seen.has(key)) continue; seen.add(key);
        items.push({ z: (V[a][2] + V[b][2]) / 2 - 0.02, kind: 'edge', a, b });
      }
    });
    items.sort((x, y) => x.z - y.z);
    const col = color();
    for (const it of items) {
      if (it.kind === 'face') {
        c.beginPath(); it.f.forEach((j, i) => { const p = P(V[j]); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
        c.closePath(); c.fillStyle = col; c.globalAlpha = 0.16 + 0.12 * near(it.z); c.fill(); c.globalAlpha = 1;
      } else if (it.kind === 'edge') {
        const p = P(V[it.a]), q = P(V[it.b]);
        c.lineWidth = 3; c.strokeStyle = col; c.globalAlpha = 0.55 + 0.4 * near(it.z);
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); c.globalAlpha = 1;
      } else {
        const { q, on } = it, p = P(q), r = (on ? 15 : 10) * (1 + q[2] * 0.05), fog = near(q[2]);
        const g = c.createRadialGradient(p[0] - r * 0.3, p[1] - r * 0.3, r * 0.1, p[0], p[1], r);
        g.addColorStop(0, on ? '#FFFFFF' : '#F3F5FA'); g.addColorStop(1, on ? col : '#8C98B3');
        c.beginPath(); c.arc(p[0], p[1], r, 0, 2 * Math.PI); c.fillStyle = g;
        c.globalAlpha = on ? 1 : 0.35 + 0.55 * fog; c.fill(); c.globalAlpha = 1;
        c.lineWidth = 1.5; c.strokeStyle = on ? BG : '#6B7892'; c.stroke();
      }
    }
    c.fillStyle = TEXT; c.font = "bold 27px 'LM Roman'"; c.textAlign = 'left';
    c.fillText((state.d === 1 ? 'Loop' : 'Void') + ' of ' + e.n + ' atoms · born ' + e.bi + ' · dies ' + e.de + ' Å²', 8, H - 12);
  }

  /* ---------------------------------------------------------------- interaction */
  const tour = [];
  [[5000, 1], [10000, 1], [5000, 2], [10000, 2]].forEach(([T, d]) => ['short', 'mid', 'long'].forEach(b => tour.push({ T, d, b })));
  let tourIndex = 2;
  setInterval(() => {
    if (!autoTour || drag || document.hidden) return;
    tourIndex = (tourIndex + 1) % tour.length; state = { ...tour[tourIndex] }; drawButtons(); drawDiagram();
  }, 3500);

  $('pd').addEventListener('click', ev => {
    const r = $('pd').getBoundingClientRect(), x = (ev.clientX - r.left) * PD.W / r.width, y = (ev.clientY - r.top) * PD.H / r.height;
    const { E } = extent();
    let best = null, bd = Infinity;
    examples().forEach(e => { const dx = px(e.bi, E) - x, dy = py(e.de, E) - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = e; } });
    if (best && bd < 45 * 45) { setAuto(false); state.b = best.b; drawButtons(); drawDiagram(); }
  });
  const atoms = $('atoms');
  atoms.addEventListener('pointerdown', ev => { drag = { x: ev.clientX, y: ev.clientY }; atoms.setPointerCapture(ev.pointerId); atoms.style.cursor = 'grabbing'; });
  atoms.addEventListener('pointermove', ev => {
    if (!drag) return;
    yaw += (ev.clientX - drag.x) * 0.01;
    pitch = Math.max(-1.5, Math.min(1.5, pitch + (ev.clientY - drag.y) * 0.01));
    drag = { x: ev.clientX, y: ev.clientY };
  });
  const endDrag = () => { drag = null; atoms.style.cursor = 'grab'; };
  atoms.addEventListener('pointerup', endDrag); atoms.addEventListener('pointercancel', endDrag);

  // inside the deck, pass navigation keys up so the presenter keeps control of the slides
  if (embedded) addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.key === 'Tab') return;
    window.parent.postMessage({ deckKey: ev.key }, '*'); ev.preventDefault();
  });

  // standalone: scale the 1350 px layout to the window
  function fit() { if (!embedded) $('app').style.transform = 'scale(' + Math.min(1, (innerWidth - 32) / 1350) + ')'; }
  addEventListener('resize', fit); fit();

  drawButtons(); drawDiagram();
  document.fonts.load("25px 'LM Roman'").then(() => document.fonts.load("bold 27px 'LM Roman'")).then(drawDiagram);
  (function frame() { if (!drag && !reduceMotion) yaw += 0.005; drawAtoms(); requestAnimationFrame(frame); })();
})();
