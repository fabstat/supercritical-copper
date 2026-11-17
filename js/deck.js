/* A small, dependency-free presentation engine in the spirit of reveal.js.
   Markup:  <div class="reveal"><div class="slides"><section> ... <aside class="notes">...</aside></section> ... </div></div>
   Slides are 1920 x 1080 and scaled to fit. Works from file:// and from any static host (GitHub Pages).

   Keys   → ↓ Space PageDown Enter  next        ← ↑ PageUp Backspace  previous      Home / End  first / last
          digits + pause            jump to slide           O or Esc  overview         F  full screen
          N  notes beside the slide (one screen)            S  speaker window (two screens)
          T  start / pause the talk timer                   B or .  black screen        ?  this help
   URL    #/7 opens slide 7.   index.html?view=speaker is the speaker window (opened with S).
   Print  the browser's Print → Save as PDF gives one slide per page (set margins to none, background graphics on). */
(() => {
  'use strict';
  const slidesEl = document.querySelector('.reveal .slides');
  const sections = [...slidesEl.children].filter(n => n.tagName === 'SECTION');
  const N = sections.length;
  const firstBackup = sections.findIndex(s => s.dataset.backup !== undefined);
  const params = new URLSearchParams(location.search);
  const isSpeaker = params.get('view') === 'speaker';
  const $ = id => document.getElementById(id);

  const notesOf = s => { const a = s.querySelector('aside.notes'); return a ? a.textContent.trim() : ''; };
  const titleOf = s => { const h = s.querySelector('h1,h2,h3'); return h ? h.textContent.trim() : s.id; };

  let cur = 0;
  let peer = null;                 // the other window (speaker <-> audience)

  /* ---------------------------------------------------------------- scaling */
  function fit() {
    if (isSpeaker) return;
    const notes = document.body.classList.contains('notes');
    const w = innerWidth * (notes ? 0.62 : 1), h = innerHeight;
    slidesEl.style.transform = 'scale(' + Math.min(w / 1920, h / 1080) + ')';
  }

  /* ---------------------------------------------------------------- static copies of a slide (overview, speaker view) */
  function copyOf(i, live) {
    const s = sections[i].cloneNode(true);
    s.classList.remove('present');
    s.removeAttribute('id');
    if (!live) s.querySelectorAll('iframe').forEach(f => {   // do not start a second copy of an interactive app
      const ph = document.createElement('div');
      ph.className = 'x-embed-placeholder'; ph.style.cssText = f.style.cssText; ph.textContent = 'interactive';
      f.replaceWith(ph);
    });
    return s;
  }
  function mount(box, i, live) {
    box.innerHTML = '';
    if (i < 0 || i >= N) return;
    const holder = document.createElement('div');
    holder.className = 'thumb'; holder.style.cssText = 'position:absolute;inset:0;aspect-ratio:auto';
    const inner = document.createElement('div');
    inner.appendChild(copyOf(i, live)); holder.appendChild(inner); box.appendChild(holder);
    const scale = () => { inner.style.transform = 'scale(' + box.clientWidth / 1920 + ')'; };
    scale(); requestAnimationFrame(scale);
  }

  /* ---------------------------------------------------------------- navigation */
  function show(i, opts = {}) {
    cur = Math.max(0, Math.min(N - 1, i));
    if (!isSpeaker) sections.forEach((s, k) => {
      const on = k === cur;
      s.classList.toggle('present', on);
      s.setAttribute('aria-hidden', !on);
      s.inert = !on;
    });
    const label = '<b>' + (cur + 1) + '</b> / ' + N + (firstBackup >= 0 && cur >= firstBackup ? ' · backup' : '');
    $('counter').innerHTML = label;
    $('progress').firstElementChild.style.width = ((cur + 1) / N * 100) + '%';
    $('np-title').textContent = titleOf(sections[cur]);
    $('np-text').textContent = notesOf(sections[cur]) || '(no notes)';
    $('np-next').textContent = cur + 1 < N ? 'Next: ' + titleOf(sections[cur + 1]) : 'End of deck';
    document.querySelectorAll('.cell').forEach((c, k) => c.classList.toggle('current', k === cur));
    if (isSpeaker) {
      mount($('sp-current'), cur, false); mount($('sp-next'), cur + 1, false);
      $('sp-title').textContent = (cur + 1) + '. ' + titleOf(sections[cur]);
      $('sp-notes').textContent = notesOf(sections[cur]) || '(no notes)';
      $('sp-count').innerHTML = label;
    }
    if (opts.hash !== false) history.replaceState(null, '', location.pathname + location.search + '#/' + (cur + 1));
    if (opts.sync !== false && peer && !peer.closed) peer.postMessage({ deck: 'goto', i: cur }, '*');
  }
  const next = () => show(cur + 1), prev = () => show(cur - 1);

  let digits = '', digitTimer = null;
  function onKey(k, ev) {
    if (document.body.classList.contains('help') && k !== '?') { document.body.classList.remove('help'); return true; }
    switch (k) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter': next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': prev(); break;
      case 'Home': show(0); break;
      case 'End': show(N - 1); break;
      case 'o': case 'O': case 'Escape': toggleOverview(); break;
      case 'f': case 'F': document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); break;
      case 'n': case 'N': if (!isSpeaker) { document.body.classList.toggle('notes'); fit(); } break;
      case 's': case 'S': if (!isSpeaker) openSpeaker(); break;
      case 't': case 'T': toggleClock(); break;
      case 'b': case 'B': case '.': document.body.classList.toggle('blank'); break;
      case '?': document.body.classList.toggle('help'); break;
      default:
        if (/^[0-9]$/.test(k)) {
          digits += k; clearTimeout(digitTimer);
          digitTimer = setTimeout(() => { show(parseInt(digits, 10) - 1); digits = ''; }, 700);
        } else return false;
    }
    if (ev) ev.preventDefault();
    return true;
  }
  addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.target.closest && ev.target.closest('input,textarea,select,button')) return;
    onKey(ev.key, ev);
  });

  // messages: keys forwarded by an embedded app, and the speaker/audience link
  addEventListener('message', ev => {
    const d = ev.data || {};
    if (typeof d.deckKey === 'string') onKey(d.deckKey);
    else if (d.deck === 'goto') show(d.i, { sync: false });
    else if (d.deck === 'hello') { peer = ev.source; show(cur); }
  });

  // click: left fifth goes back, the rest goes forward (not inside interactive content)
  slidesEl.addEventListener('click', ev => {
    if (ev.target.closest('iframe,a,button,input')) return;
    const r = slidesEl.getBoundingClientRect();
    (ev.clientX - r.left) / r.width < 0.2 ? prev() : next();
  });
  // swipe
  let touch = null;
  addEventListener('touchstart', ev => { touch = ev.touches[0]; }, { passive: true });
  addEventListener('touchend', ev => {
    if (!touch) return;
    const dx = ev.changedTouches[0].clientX - touch.clientX, dy = ev.changedTouches[0].clientY - touch.clientY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? next() : prev();
    touch = null;
  }, { passive: true });
  addEventListener('hashchange', () => { const m = location.hash.match(/(\d+)/); if (m) show(parseInt(m[1], 10) - 1, { hash: false }); });

  /* ---------------------------------------------------------------- timer */
  let t0 = null, elapsed = 0;
  function toggleClock() {
    if (t0) { elapsed += Date.now() - t0; t0 = null; } else t0 = Date.now();
  }
  function tick() {
    const s = Math.floor((elapsed + (t0 ? Date.now() - t0 : 0)) / 1000);
    const txt = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    $('np-clock').textContent = txt;
    if (isSpeaker) { $('sp-clock').textContent = txt; $('sp-wall').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  }
  setInterval(tick, 500);
  $('np-clock').addEventListener('click', toggleClock);
  if ($('sp-clock')) $('sp-clock').addEventListener('click', toggleClock);

  /* ---------------------------------------------------------------- overview */
  let overviewBuilt = false;
  function buildOverview() {
    const box = $('overview');
    sections.forEach((s, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell' + (firstBackup >= 0 && i >= firstBackup ? ' backup' : '');
      const th = document.createElement('div'); th.className = 'thumb';
      const inner = document.createElement('div'); inner.appendChild(copyOf(i, false)); th.appendChild(inner);
      const p = document.createElement('p'); p.innerHTML = '<b>' + (i + 1) + '</b>&nbsp; '; p.appendChild(document.createTextNode(titleOf(s)));
      cell.append(th, p);
      cell.addEventListener('click', () => { show(i); toggleOverview(false); });
      box.appendChild(cell);
    });
    overviewBuilt = true;
  }
  function scaleOverview() { document.querySelectorAll('#overview .thumb').forEach(t => { if (t.clientWidth) t.firstElementChild.style.transform = 'scale(' + t.clientWidth / 1920 + ')'; }); }
  function toggleOverview(on) {
    if (!overviewBuilt) buildOverview();
    document.body.classList.toggle('overview', on);
    requestAnimationFrame(() => { scaleOverview(); const c = document.querySelector('.cell.current'); if (c) c.scrollIntoView({ block: 'nearest' }); });
    show(cur, { hash: false, sync: false });
  }

  /* ---------------------------------------------------------------- speaker window */
  function openSpeaker() {
    const url = location.href.split('#')[0].split('?')[0] + '?view=speaker#/' + (cur + 1);
    peer = window.open(url, 'deck-speaker', 'width=1280,height=800');
  }
  if (isSpeaker) {
    document.body.classList.add('speaker');
    document.title = 'Speaker view · ' + document.title;
    if (window.opener) { peer = window.opener; peer.postMessage({ deck: 'hello' }, '*'); }
    addEventListener('resize', () => show(cur, { hash: false, sync: false }));
  }

  /* ---------------------------------------------------------------- idle hint */
  let idle = null;
  const wake = () => { document.body.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => document.body.classList.add('idle'), 3000); };
  addEventListener('mousemove', wake); wake();

  addEventListener('resize', () => { fit(); scaleOverview(); });
  fit();
  const m = location.hash.match(/(\d+)/);
  show(m ? parseInt(m[1], 10) - 1 : 0, { hash: false, sync: false });
  document.fonts.ready.then(() => { scaleOverview(); if (isSpeaker) show(cur, { hash: false, sync: false }); });
})();
