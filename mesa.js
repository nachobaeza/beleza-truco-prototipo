/* =====================================================================
   Beleza Truco · mesa.js
   La mesa jugable (modo demo contra bots). Une el motor (truco-engine.js)
   con la vista (mesa.html + mesa.css) siguiendo DESIGN §6–§10.

   Arquitectura:
   - El motor emite eventos E-xx de forma síncrona en ráfagas. Cada evento
     se encola en una cadena de promesas (enqueue) y se anima en orden.
   - Cuando la cola queda vacía (onIdle) se sincronizan los controles con
     g.state() y, si le toca a un bot, se lo programa con delay humano.
   - El humano es el asiento 0 (abajo). Sus acciones llaman al motor
     directamente; la respuesta llega como eventos y se anima igual.
   - La luz es una máquina de estados: clases is-* en <body> (tokens.css).
   - Sin módulos ES: todo vive en un IIFE y usa window.BT / window.TrucoEngine.
   ===================================================================== */
(function () {
  'use strict';

  var BT = window.BT, TE = window.TrucoEngine;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), body = document.body;

  /* Dinero de la mesa (§6.14 chip del header y §6.18 tarjeta de resultado): una sola fuente para que no diverjan.
     MESA_VALUE = lo que pone cada jugador (R$); TAXA = comisión sobre el pozo. Fórmula para los programadores:
       pozo        = MESA_VALUE × n jugadores
       neto        = pozo × (1 − TAXA)                       ← lo que cobra el LADO ganador
       por jugador = neto / (n / 2)                          ← en 2v2 se divide con el parceiro; en 1v1 es todo */
  var MESA_VALUE = 2, TAXA = 0.07;
  function brl(x) { return 'R$ ' + x.toFixed(2).replace('.', ','); }
  function pct(x) { return String(Math.round(x * 100)) + ' %'; }

  /* -------------------------------------------------------------------
     1. Ajustes (persisten en localStorage) · DESIGN §6.20
     ------------------------------------------------------------------- */
  var DEFAULTS = { variant: 'paulista', mode: '2v2', speed: '1', motion: 'auto', contrast: 'normal', rule: 'off', font: '1', seed: '' };
  var settings = loadSettings();

  function loadSettings() {
    try {
      var raw = localStorage.getItem('bt-mesa-settings');
      var s = raw ? JSON.parse(raw) : {};
      return Object.assign({}, DEFAULTS, s);
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function saveSettings() { try { localStorage.setItem('bt-mesa-settings', JSON.stringify(settings)); } catch (e) { /* sin storage */ } }

  var reducedMotionMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  /* Animações: 'auto' sigue al sistema (prefers-reduced-motion), 'on' fuerza, 'off' apaga. */
  function motionOff() { return settings.motion === 'off' || (settings.motion === 'auto' && reducedMotionMQ.matches); }
  /* Factor de velocidad del usuario (lenta 1,4 · normal 1 · rápida ,7): §8.1 --speed. */
  function userSpeed() { return parseFloat(settings.speed) || 1; }
  /* ms(): duración de un MOVIMIENTO (vuelo, sello, deslizamiento). Con reduce-motion vale 0. */
  function ms(x) { return motionOff() ? 0 : Math.max(0, x * userSpeed()); }
  /* hold(): tiempo de LECTURA (banner, píldora, sello quieto). Nunca se anula: sólo escala con la velocidad. */
  function hold(x) { return Math.max(0, x * userSpeed()); }
  function wait(x) { return new Promise(function (r) { setTimeout(r, x); }); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  var userGesture = false;
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, function () { userGesture = true; }, { passive: true, once: true }); });
  function vib(t) { if (userGesture && navigator.vibrate) { try { navigator.vibrate(t); } catch (e) { /* no háptico */ } } }
  /* Las animaciones WAAPI no disparan onfinish en pestañas ocultas: resolvemos por onfinish o por timeout, lo que llegue primero. */
  function animDone(anim, dur) {
    return new Promise(function (resolve) {
      var done = false, fin = function () { if (!done) { done = true; resolve(); } };
      anim.onfinish = fin; anim.oncancel = fin;
      setTimeout(fin, dur + 60);
    });
  }
  /* Tokens de tokens.css leídos una vez (sombras de carta y easings) para no repetir literales en las animaciones JS */
  var TOK = {};
  function cssVar(name) {
    if (!(name in TOK)) TOK[name] = (getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim();
    return TOK[name];
  }

  function applySettings() {
    document.documentElement.setAttribute('data-motion', settings.motion);
    document.documentElement.setAttribute('data-contrast', settings.contrast);
    document.documentElement.style.setProperty('--speed', motionOff() ? '0.01' : settings.speed);
    document.documentElement.style.setProperty('--font-size-multiplier', settings.font);
    /* data-variant / data-mode del escenario se atan a la PARTIDA (newGame), no a los ajustes: cambiar el select
       en mitad de una partida no debe esconder asientos ni la vira de la partida en curso. */
    $('set-variant').value = settings.variant;
    $('set-mode').value = settings.mode;
    $('set-speed').value = settings.speed;
    $('set-motion').value = settings.motion;
    $('set-contrast').value = settings.contrast;
    $('set-rule').value = settings.rule;
    $('set-font').value = settings.font;
    $('set-seed').value = settings.seed;
  }

  /* -------------------------------------------------------------------
     2. Layout: escenario escalado · DESIGN §7
     ------------------------------------------------------------------- */
  var LAYOUT = {
    mobile: {
      W: 390, H: 844,
      /* abanico ±8° (no ±10): con 10° la esquina de la 3.ª carta se montaba sobre el botón de chat (334–374 × 592–632) */
      hand: { left: 98, w: 104, h: 153, xs: { 3: [150, 215, 280], 2: [182.5, 247.5], 1: [215] }, rot: { 3: [-8, 0, 8], 2: [-4, 4], 1: [0] } },
      seats: { '2v2': { 1: [342, 350], 2: [195, 211], 3: [48, 350] }, '1v1': { 1: [195, 211] } },
      me: [46, 640],
      slotW: 56, slot1v1W: 64, deckW: 48, miniW: 28, backW: 22,
      chipBottom: 167
    },
    desktop: {
      W: 1440, H: 900,
      hand: { left: 584, w: 120, h: 176, xs: { 3: [644, 720, 796], 2: [682, 758], 1: [720] }, rot: { 3: [-8, 0, 8], 2: [-4, 4], 1: [0] } },
      seats: { '2v2': { 1: [1110, 440], 2: [720, 190], 3: [330, 440] }, '1v1': { 1: [720, 190] } },
      me: [420, 760],
      slotW: 72, slot1v1W: 72, deckW: 60, miniW: 36, backW: 28,
      chipBottom: 102
    }
  };
  var layout = 'mobile', scale = 1;
  function L() { return LAYOUT[layout]; }

  function fitStage() {
    /* clientWidth/clientHeight y no innerWidth/innerHeight: en Chrome móvil, si el documento desbordaba, inner* ya venía
       inflado por el zoom-out automático. El body es fixed (mesa.css), así que el documento nunca desborda. */
    var de = document.documentElement;
    var vw = de.clientWidth || window.innerWidth, vh = de.clientHeight || window.innerHeight, prev = layout;
    if (vw >= 1024) { layout = 'desktop'; scale = Math.min(vw / 1440, vh / 900); }
    else if (vw >= 600) { layout = 'mobile'; scale = Math.min(430 / 390, vh / 844); } /* §7.2: composición vertical a 430 px */
    else { layout = 'mobile'; scale = Math.min(vw / 390, vh / 844); }
    var W = LAYOUT[layout].W, Hh = LAYOUT[layout].H;
    stage.setAttribute('data-layout', layout);
    stage.style.setProperty('--scale', String(scale));
    stage.style.setProperty('--ox', ((vw - W * scale) / 2) + 'px');
    stage.style.setProperty('--oy', ((vh - Hh * scale) / 2) + 'px');
    relayout(prev !== layout);
  }

  function relayout(layoutChanged) {
    var Lx = L(), mode = g ? g.mode : settings.mode; /* la partida en curso manda, no el select de ajustes */
    var seats = Lx.seats[mode];
    [1, 2, 3].forEach(function (s) {
      var el = $('seat-' + s);
      var pos = seats[s];
      if (!pos) { el.hidden = true; return; }
      el.hidden = false;
      el.style.setProperty('--cx', pos[0] + 'px');
      el.style.setProperty('--cy', pos[1] + 'px');
      var counter = el.querySelector('.counter');
      if (counter) {
        /* §6.6 dorsos "hacia adentro": parceiro a la derecha; rivales hacia el centro de la mesa. En desktop al lado
           del avatar (left/right); en celular arriba del avatar, corridos al centro (in-r / in-l) para no pisar los slots. */
        var cls = (s === 2 || mode === '1v1') ? 'right' : layout === 'desktop' ? (s === 1 ? 'left' : 'right') : (s === 1 ? 'in-l' : 'in-r');
        counter.className = 'counter ' + cls;
      }
    });
    $('seat-0').style.setProperty('--cx', Lx.me[0] + 'px');
    $('seat-0').style.setProperty('--cy', Lx.me[1] + 'px');
    drawBrass(false);
    layoutHand();
    if (layoutChanged) renderStaticCards();
    requestAnimationFrame(positionViraLine);
  }

  /* Filete de latón del paño (superelipse aproximada: radios distintos arriba/abajo) */
  function brassPath(W, H, inset, rt, rb) {
    var x0 = inset, y0 = inset, x1 = W - inset, y1 = H - inset;
    return 'M' + (x0 + rt) + ' ' + y0 + ' H' + (x1 - rt) + ' A' + rt + ' ' + rt + ' 0 0 1 ' + x1 + ' ' + (y0 + rt) +
      ' V' + (y1 - rb) + ' A' + rb + ' ' + rb + ' 0 0 1 ' + (x1 - rb) + ' ' + y1 + ' H' + (x0 + rb) +
      ' A' + rb + ' ' + rb + ' 0 0 1 ' + x0 + ' ' + (y1 - rb) + ' V' + (y0 + rt) + ' A' + rt + ' ' + rt + ' 0 0 1 ' + (x0 + rt) + ' ' + y0 + ' Z';
  }
  function drawBrass(animate) {
    var frame = $('frame'), W = frame.offsetWidth, H = frame.offsetHeight;
    var rail = layout === 'desktop' ? 14 : 10, inset = rail - 3;
    var rt = (layout === 'desktop' ? 96 : 72) + 3, rb = (layout === 'desktop' ? 80 : 60) + 3;
    var p = $('brass-path'), h = $('brass-hi-path');
    p.setAttribute('d', brassPath(W, H, inset, rt, rb));
    var x0 = inset, y0 = inset, x1 = W - inset;
    h.setAttribute('d', 'M' + x0 + ' ' + (y0 + rt) + ' A' + rt + ' ' + rt + ' 0 0 1 ' + (x0 + rt) + ' ' + y0 + ' H' + (x1 - rt) + ' A' + rt + ' ' + rt + ' 0 0 1 ' + x1 + ' ' + (y0 + rt));
    if (animate && !motionOff()) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      var a = p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms(480), easing: cssVar('--ease-standard'), fill: 'forwards' });
      animDone(a, ms(480)).then(function () { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; });
    }
  }

  /* Rect de un elemento en coordenadas del escenario (deshace la escala) */
  function rectOf(el) {
    var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale,
      cx: (r.left - s.left) / scale + r.width / scale / 2, cy: (r.top - s.top) / scale + r.height / scale / 2 };
  }

  /* -------------------------------------------------------------------
     3. Cartas (SVG de cards.js) y helpers de DOM
     ------------------------------------------------------------------- */
  function cardHTML(card, w) {
    return BT.cardSVG({ rank: card.rank, suit: card.suit, w: w, manilha: !!card.isManilha, zap: !!card.isZap, rule: settings.rule === 'on', label: false });
  }
  function backHTML(w) { return BT.cardSVG({ back: true, w: w, label: false }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function playedEl(card, w, tilt) {
    var e = el('div', 'played', card ? cardHTML(card, w) : backHTML(w));
    e.style.setProperty('--tilt', (tilt || 0) + 'deg');
    if (card) e.setAttribute('aria-label', card.name); else e.setAttribute('aria-label', 'carta coberta');
    return e;
  }

  /* Re-renderiza las cartas estáticas (mazo, dorsos) al cambiar de layout o de régua */
  function renderStaticCards() {
    var Lx = L();
    clear($('deck'));
    for (var i = 0; i < 4; i++) $('deck').appendChild(el('div', 'back', backHTML(Lx.deckW)));
    document.querySelectorAll('.hand .card').forEach(function (c) {
      var card = c._card;
      c.innerHTML = card ? cardHTML(card, Lx.hand.w) : backHTML(Lx.hand.w);
    });
    document.querySelectorAll('.counter .mini-back').forEach(function (b) { b.innerHTML = backHTML(Lx.backW); });
    document.querySelectorAll('.slot .played, .carril .played').forEach(function (p) {
      var card = p._card; p.innerHTML = card ? cardHTML(card, Lx.slotW) : backHTML(Lx.slotW);
    });
    document.querySelectorAll('.vaza .mini').forEach(function (m) {
      var card = m._card; m.innerHTML = card ? cardHTML(card, Lx.miniW) : backHTML(Lx.miniW);
    });
    if ($('vira-card')._card) $('vira-card').innerHTML = cardHTML($('vira-card')._card, Lx.deckW);
  }

  /* -------------------------------------------------------------------
     4. Vuelo de cartas (Web Animations API) · DESIGN §8.2
        La carta es un objeto: la sombra crece con la elevación y baja al caer.
     ------------------------------------------------------------------- */
  function fly(o) {
    /* o = { html, from:{cx,cy,w,h}, to:{cx,cy,w,h}, dur, rotFrom, rotTo, shadowEnd } */
    if (motionOff()) return wait(hold(150)).then(function () { if (o.onDone) o.onDone(); });
    var f = el('div', 'flyer', o.html);
    f.style.width = o.from.w + 'px'; f.style.height = o.from.h + 'px';
    f.style.transformOrigin = '50% 50%';
    $('fx').appendChild(f);
    var s = o.to.w / o.from.w;
    var t0 = 'translate(' + (o.from.cx - o.from.w / 2) + 'px,' + (o.from.cy - o.from.h / 2) + 'px) rotate(' + (o.rotFrom || 0) + 'deg) scale(1)';
    var t1 = 'translate(' + (o.to.cx - o.from.w / 2) + 'px,' + (o.to.cy - o.from.h / 2) + 'px) rotate(' + (o.rotTo || 0) + 'deg) scale(' + s + ')';
    /* §4: en vuelo la sombra crece de "en mesa" a "levantada" y baja al caer (tokens --shadow-card-*) */
    var shadowTable = cssVar('--shadow-card-table'), shadowLift = cssVar('--shadow-card-lift');
    var shadowEnd = o.shadowEnd || shadowTable;
    var anim = f.animate([
      { transform: t0, boxShadow: shadowTable, offset: 0 },
      { boxShadow: shadowLift, offset: .5 },
      { transform: t1, boxShadow: shadowEnd, offset: 1 }
    ], { duration: ms(o.dur || 380), easing: o.easing || cssVar('--ease-enter'), fill: 'forwards' });
    return animDone(anim, ms(o.dur || 380)).then(function () { if (o.onDone) o.onDone(); f.remove(); });
  }

  /* -------------------------------------------------------------------
     5. Componentes de feedback: luz, sello, banner, píldora, toast, burbuja
     ------------------------------------------------------------------- */
  var LIGHT_STATES = ['is-truco-pending', 'is-onze', 'is-ferro', 'is-victory', 'is-defeat', 'is-offline'];
  function setLight(cls) {
    LIGHT_STATES.forEach(function (c) { body.classList.remove(c); });
    if (cls) body.classList.add(cls);
  }
  function lampTremble() {
    body.classList.remove('is-manilha-played'); void body.offsetWidth;
    body.classList.add('is-manilha-played');
    setTimeout(function () { body.classList.remove('is-manilha-played'); }, ms(600) + 20);
  }
  function shake() {
    if (motionOff()) return;
    stage.classList.remove('is-shaking'); void stage.offsetWidth;
    stage.classList.add('is-shaking');
    setTimeout(function () { stage.classList.remove('is-shaking'); }, ms(250) + 20);
  }

  /* Sello de grito: SVG con borde irregular (un path, no un rectángulo) */
  function stampShape() {
    return '<svg class="bg" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true"><path d="M6 10 Q 40 4, 100 6 T 194 9 Q 198 30, 195 50 T 193 72 Q 150 78, 100 75 T 7 71 Q 2 50, 5 30 T 6 10 Z"/></svg>';
  }
  var stampHold = null;
  function showStamp(text, kind, opts) {
    opts = opts || {};
    var wrap = $('stamp');
    /* §8.2 E-17 / §8.3.4: el sello anterior (TRUCO! sostenido) sale en 100 ms mientras el nuevo (DESCE!, TÔ FORA!)
       entra en el mismo cuadro; nunca se quita en un cuadro. */
    clearStamp(false);
    var s = el('div', 'sello enter ' + kind + (opts.small ? ' small' : '') + (opts.low ? ' low' : ''), stampShape() + '<span class="txt">' + text + '</span>');
    wrap.appendChild(s);
    vib(opts.haptic || 0);
    if (opts.hold) { stampHold = s; return Promise.resolve(); }
    var dur = opts.duration || 1200;
    return wait(hold(dur)).then(function () { if (s.parentNode) { s.classList.add('exit'); return wait(ms(100)).then(function () { s.remove(); }); } });
  }
  function clearStamp(immediate) {
    var wrap = $('stamp');
    Array.prototype.slice.call(wrap.children).forEach(function (c) {
      if (immediate) c.remove();
      else if (!c.classList.contains('exit')) { c.classList.add('exit'); setTimeout(function () { c.remove(); }, ms(100) + 10); }
    });
    stampHold = null;
  }

  function showBanner(title, opts) {
    opts = opts || {};
    var b = $('banner');
    clear(b);
    var t = el('div', 'title ' + (opts.cls || ''), title);
    b.appendChild(t);
    if (opts.sub) b.appendChild(el('div', 'sub', opts.sub));
    b.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: ms(200), easing: cssVar('--ease-enter'), fill: 'forwards' });
    var holdMs = opts.hold || 1400, myGen = gen;
    return wait(hold(holdMs)).then(function () {
      if (myGen !== gen) return; /* empezó otra partida mientras esperábamos: no tocar el DOM nuevo */
      var a = b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(300), easing: cssVar('--ease-exit'), fill: 'forwards' });
      return animDone(a, ms(300)).then(function () { if (myGen === gen) clear(b); });
    });
  }

  var pillTimer = null;
  function showPill(team, text) {
    var p = $('pill');
    p.className = 'pill pill-rodada ' + (team === 0 ? 'pill-us from-us' : team === 1 ? 'pill-them from-them' : 'pill-tie from-tie');
    p.textContent = text;
    var dx = team === 0 ? '-24px' : team === 1 ? '24px' : '0';
    p.animate([{ opacity: 0, transform: 'translateX(' + dx + ')' }, { opacity: 1, transform: 'none' }], { duration: ms(130), easing: cssVar('--ease-overshoot'), fill: 'forwards' });
    clearTimeout(pillTimer);
    pillTimer = setTimeout(function () {
      p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(200), easing: cssVar('--ease-exit'), fill: 'forwards' });
    }, hold(1200));
  }

  /* Un solo toast a la vez (§6.17): el anterior sale con fundido (200 ms, §8.3.4) mientras entra el nuevo; así nunca
     se apilan dos sobre las pilas del banco. Si hay un sello .low en la misma franja y mi slot está vacío, sube (.up). */
  function fadeToast(t) {
    if (!t || t.classList.contains('exit')) return;
    t.classList.add('exit');
    setTimeout(function () { t.remove(); }, ms(200) + 10);
  }
  function toast(text, kind, extraHTML) {
    var box = $('toasts');
    Array.prototype.slice.call(box.children).forEach(fadeToast);
    box.classList.toggle('up', !!document.querySelector('.sello.low:not(.exit)') && !$('slot-0').querySelector('.played'));
    var t = el('div', 'toast enter ' + (kind || ''), text + (extraHTML || ''));
    box.appendChild(t);
    setTimeout(function () { fadeToast(t); }, 2500);
  }
  /* Plural pt-BR: "1 mão" / "2 mãos" */
  function maos(n) { return n === 1 ? '1 mão' : n + ' mãos'; }

  function bubble(seat, text, kind, opts) {
    opts = opts || {};
    var s = $('seat-' + seat); if (!s) return;
    var old = s.querySelector('.bubble:not(.exit)' + (opts.replaceAll ? '' : ':not(.persist)'));
    if (old) fadeBubble(old);
    var b = el('div', 'bubble enter ' + (kind || ''), text);
    s.appendChild(b);
    if (!opts.persist && !opts.hold) setTimeout(function () { fadeBubble(b); }, opts.ttl || 3000);
    return b;
  }
  /* §8.3.4: la burbuja sale en 120 ms (clase .exit) antes de quitarse del DOM, tanto al cumplir el ttl como al ser
     reemplazada o limpiada. Las que ya están saliendo no se tocan (los selectores las excluyen con :not(.exit)). */
  function fadeBubble(b) {
    if (!b || b.classList.contains('exit')) return;
    b.classList.add('exit');
    setTimeout(function () { b.remove(); }, ms(120) + 10);
  }
  function clearBubbles(seat, selector) {
    var s = seat == null ? document : $('seat-' + seat);
    if (!s) return;
    s.querySelectorAll((selector || '.bubble') + ':not(.exit)').forEach(fadeBubble);
  }

  /* -------------------------------------------------------------------
     6. Construcción de asientos, placar y mano
     ------------------------------------------------------------------- */
  function buildSeats(st) {
    var n = st.seats;
    for (var s = 0; s < 4; s++) {
      var seat = $('seat-' + s);
      clear(seat);
      seat.classList.remove('active', 'last-5s', 'is-mao', 'has-auto');
      if (s >= n) { seat.hidden = true; continue; }
      seat.hidden = false;
      var name = st.names[s];
      var av = el('div', 'avatar', name.charAt(0).toUpperCase());
      av.setAttribute('aria-hidden', 'true');
      seat.appendChild(av);
      var ring = el('div', 'ring', '<svg viewBox="0 0 64 64"><circle class="track" cx="32" cy="32" r="29.5"/><circle class="bar" cx="32" cy="32" r="29.5"/></svg>');
      seat.appendChild(ring);
      seat.appendChild(el('span', 'pill pill-name', name));
      seat.appendChild(el('span', 'mao-badge', 'mão'));
      if (s === 0) {
        seat.appendChild(el('span', 'timer-badge num', '20'));
        seat.appendChild(el('span', 'auto-count', ''));
        seat.setAttribute('aria-label', name + ' (você)');
      } else {
        seat.appendChild(el('div', 'counter', ''));
        seat.setAttribute('aria-label', name + ' · ' + (s % 2 === 0 ? 'parceiro' : 'rival'));
      }
    }
    relayout(false);
  }

  function setCounter(seat, count, hidden) {
    var c = $('seat-' + seat).querySelector('.counter'); if (!c) return;
    clear(c);
    for (var i = 0; i < count; i++) {
      var b = el('div', 'mini-back', backHTML(L().backW));
      if (hidden) b.style.visibility = 'hidden';
      c.appendChild(b);
    }
  }

  function layoutHand() {
    var hand = $('hand'), slots = hand.querySelectorAll('.hand-slot'), n = slots.length;
    if (!n) return;
    var Lx = L().hand, xs = Lx.xs[n] || Lx.xs[3], rot = Lx.rot[n] || Lx.rot[3];
    slots.forEach(function (sl, i) {
      sl.style.setProperty('--hx', (xs[i] - Lx.left - Lx.w / 2) + 'px');
      var c = sl.querySelector('.card'); if (c) c.style.setProperty('--rot', rot[i] + 'deg');
    });
  }

  function buildHand(cards, hidden) {
    var hand = $('hand');
    clear(hand);
    cards.forEach(function (card, i) {
      var sl = el('div', 'hand-slot');
      var b = el('button', 'card' + (hidden ? ' hidden-card' : ''), card ? cardHTML(card, L().hand.w) : backHTML(L().hand.w));
      b.type = 'button';
      b._card = card || null;
      b.dataset.id = card ? card.id : ('x' + i);
      b.setAttribute('aria-label', card ? card.name : 'carta coberta');
      b.addEventListener('click', onCardTap);
      sl.appendChild(b);
      hand.appendChild(sl);
    });
    layoutHand();
  }

  function handCards() { return Array.prototype.slice.call(document.querySelectorAll('#hand .card')); }

  /* -------------------------------------------------------------------
     7. Placar
     ------------------------------------------------------------------- */
  function setPontos(nos, eles, animate) {
    var a = $('pts-us'), b = $('pts-them');
    [[a, nos], [b, eles]].forEach(function (pair) {
      var e = pair[0], v = String(pair[1]);
      if (e.textContent !== v) {
        if (animate) { e.classList.remove('roll'); void e.offsetWidth; e.classList.add('roll'); setTimeout(function () { e.textContent = v; }, ms(180)); }
        else e.textContent = v;
      }
    });
  }
  var valeBlink = null;
  function setVale(v, opts) {
    opts = opts || {};
    var e = $('vale');
    clearInterval(valeBlink); valeBlink = null;
    e.classList.remove('pending');
    if (opts.pending) {
      /* "1 → 3" parpadea mientras el pedido está pendiente */
      var a = String(opts.from), b = String(v), on = true;
      e.textContent = a + '→' + b;
      e.classList.add('pending');
      return;
    }
    if (opts.animate && e.textContent !== String(v)) {
      e.classList.add('pulse'); e.classList.remove('roll'); void e.offsetWidth; e.classList.add('roll');
      setTimeout(function () { e.textContent = String(v); }, ms(180));
      setTimeout(function () { e.classList.remove('pulse'); }, ms(250));
    } else e.textContent = String(v);
  }
  /* Etiqueta del VALE: "VALE" o, en mano especial, dos renglones intencionales ("MÃO DE ONZE" / "VALE") al lado del
     dígito. Antes E-21 pisaba la etiqueta con "MÃO DE ONZE · VALE 3" y el valor aparecía dos veces. */
  function setValeLabel(special) {
    var lab = $('vale-label'), row = lab.parentNode;
    var variant = g ? g.variant : settings.variant;
    var top = special === 'onze' ? (variant === 'mineiro' ? 'MÃO DE DEZ' : 'MÃO DE ONZE') : special === 'ferro' ? 'MÃO DE FERRO' : null;
    clear(lab);
    if (top) { lab.appendChild(el('span', 'top', top)); lab.appendChild(el('span', '', 'VALE')); }
    else lab.textContent = 'VALE';
    row.classList.toggle('special', !!top);
  }
  function setRoundDots(results) {
    ['us', 'them'].forEach(function (k) {
      var dots = $('dots-' + k).querySelectorAll('i');
      dots.forEach(function (d, i) {
        var r = results[i];
        d.className = '';
        if (!r) return;
        if (r.tie) d.className = 'tie';
        else if (r.winnerTeam === (k === 'us' ? 0 : 1)) d.className = k;
      });
    });
  }
  function popDot(index, team, tie) {
    var keys = tie ? ['us', 'them'] : [team === 0 ? 'us' : 'them'];
    keys.forEach(function (k) {
      var d = $('dots-' + k).querySelectorAll('i')[index]; if (!d) return;
      d.className = (tie ? 'tie' : k) + ' pop';
    });
  }
  function setManilhaChip(info) {
    var chip = $('chip-manilha');
    if (info.fixed) {
      chip.classList.add('fixed');
      chip.innerHTML = 'MANILHAS FIXAS <b>4♣ 7♥ A♠ 7♦</b>';
    } else {
      chip.classList.remove('fixed');
      chip.innerHTML = 'MANILHA <b id="manilha-rank">' + (info.rank || '–') + '</b> <span class="suits" id="manilha-suits"><i data-s="paus">♣</i><i data-s="copas">♥</i><i data-s="espadas">♠</i><i data-s="ouros">♦</i></span>';
    }
  }
  function markMySuits() {
    var st = g ? g.state() : null; if (!st || !st.players[0] || !st.players[0].cards) return;
    var have = {};
    st.players[0].cards.forEach(function (c) { if (c.isManilha) have[c.suit] = true; });
    document.querySelectorAll('#chip-manilha .suits i').forEach(function (i) { i.classList.toggle('have', !!have[i.dataset.s]); });
  }

  /* Guía VIRA → chip MANILHA (§5.5): sale de la pestaña en dirección al chip y se desvanece en VIRA_LINE_LEN px,
     antes de llegar al slot del parceiro (el chip la remata con un tick de 4 px, mesa.css). Usa g.variant, no el select. */
  var VIRA_LINE_LEN = 56;
  /* En 1v1 celular la pestaña está al costado de la vira y la guía de 56 px atravesaba por detrás de la carta jugada por el
     rival (slot 253–347) y se leía como un hilo clavado bajo la carta: se acorta a 20 px (muere antes de y 347). */
  function viraLineLen() { return (layout === 'mobile' && (g ? g.mode : settings.mode) === '1v1') ? 20 : VIRA_LINE_LEN; }
  function positionViraLine() {
    var line = $('vira-line-l'), grad = $('vira-grad');
    var variant = g ? g.variant : settings.variant;
    if (variant === 'mineiro' || $('vira').classList.contains('hidden')) { line.classList.remove('shown'); stage.classList.remove('vira-shown'); return; }
    var tab = rectOf($('vira').querySelector('.vira-tab')), chip = rectOf($('chip-manilha'));
    var len = viraLineLen();
    var x1 = tab.cx, y1 = tab.y, dx = chip.cx - x1, dy = (chip.y + chip.h) - y1, d = Math.hypot(dx, dy) || 1;
    var x2 = x1 + dx / d * len, y2 = y1 + dy / d * len;
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    grad.setAttribute('x1', x1); grad.setAttribute('y1', y1); grad.setAttribute('x2', x2); grad.setAttribute('y2', y2);
  }
  function drawViraLine() {
    positionViraLine();
    var line = $('vira-line-l');
    if ((g ? g.variant : settings.variant) === 'mineiro') return;
    line.classList.add('shown'); stage.classList.add('vira-shown');
    if (motionOff()) return;
    var len = viraLineLen();
    line.style.strokeDasharray = len;
    line.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms(240), easing: cssVar('--ease-standard'), fill: 'forwards' });
  }

  /* -------------------------------------------------------------------
     8. Cola de eventos del motor
     ------------------------------------------------------------------- */
  var g = null, gen = 0, chain = Promise.resolve(), pending = 0, botTimer = null, forceCallOnce = false, pendingForce = null;
  var view = { hand: null, mao: null, pe: null, blind: false, carrilOpen: false, vazas: [], tieHint: null };

  function enqueue(fn) {
    var myGen = gen;
    pending++;
    chain = chain.then(function () { if (myGen !== gen) return; return fn(); })
      .catch(function (e) { console.error(e); })
      .then(function () {
        /* Si entre medio empezó otra partida, este contador ya no es el nuestro: no lo tocamos. */
        if (myGen !== gen) return;
        pending--;
        if (pending === 0) onIdle();
      });
  }
  function busy() { return pending > 0; }

  /* Después de CADA acción del humano: si el motor no emitió ningún evento (p. ej. onzeDecision 'correr' en 2v2 con el
     parceiro todavía sin decidir devuelve {ok, waiting} en silencio) la cola sigue vacía y onIdle no se dispararía nunca:
     ni se sincronizan los controles ni se programa al bot. Lo forzamos acá. */
  function afterHumanAction() { if (!busy()) onIdle(); }

  function onIdle() {
    if (!g) return;
    syncControls();
    if (g.phase === 'matchEnd' || g.phase === 'lobby' || g.phase === 'handEnd') return;
    var b = g.pendingBotSeat();
    if (b !== null && botTimer === null) {
      var myGen = gen;
      var delay = rand(600, 1400) * userSpeed();
      if (settings.speed === '0.7') delay = rand(350, 800);
      botTimer = setTimeout(function () {
        botTimer = null;
        if (myGen !== gen || !g || busy()) { if (myGen === gen && g && busy()) { /* se reprograma en el próximo onIdle */ } return; }
        doBot(b);
      }, delay);
    }
  }

  function doBot(seat) {
    if (g.pendingBotSeat() !== seat) return;
    if (forceCallOnce && g.phase === 'playing') {
      forceCallOnce = false;
      var r = g.call(seat);
      if (r.ok) return;
    }
    g.botAct(seat);
  }

  /* -------------------------------------------------------------------
     9. Manejadores de eventos (E-xx) · cada uno devuelve una promesa
     ------------------------------------------------------------------- */
  var H = {};

  H['E-02 matchStart'] = function (p) {
    stage.setAttribute('data-phase', 'start');
    buildSeats(g.state());
    $('label-us').textContent = p.mode === '1v1' ? 'VOCÊ' : 'NÓS';
    $('label-them').textContent = p.mode === '1v1' ? 'ELE' : 'ELES';
    /* §6.5: avatares de 20 px del placar (sólo visibles en 1v1): iniciales de los dos jugadores */
    var names = g.state().names;
    $('pl-av-us').textContent = (names[0] || '?').charAt(0);
    $('pl-av-them').textContent = (names[1] || '?').charAt(0);
    $('chip-variante').textContent = p.variant === 'mineiro' ? 'Mineiro' : 'Paulista';
    $('chip-modo').textContent = p.mode === '1v1' ? '1x1' : '2x2';
    $('chip-valor').textContent = brl(MESA_VALUE); $('chip-taxa').textContent = pct(TAXA);
    setPontos(g.pontos[0], g.pontos[1], false);
    setVale(p.chain[0]);
    setValeLabel('normal');
    setManilhaChip({ fixed: p.variant === 'mineiro', rank: null });
    clear($('bank-us')); clear($('bank-them')); clear($('carril')); clear($('hand'));
    document.querySelectorAll('.slot').forEach(clear);
    $('vira').classList.add('hidden'); $('vira-card')._card = null; $('vira-line-l').classList.remove('shown');
    $('result').hidden = true;
    setLight(null);
    view.vazas = [];
    drawBrass(true);
    /* E-02: "A partida vai começar em 3… 2… 1" */
    var b = $('banner'); clear(b);
    b.appendChild(el('div', 'sub', 'A partida vai começar em'));
    var c = el('div', 'count', '3'); b.appendChild(c);
    b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(200), fill: 'forwards' });
    return wait(hold(450)).then(function () { c.textContent = '2'; return wait(hold(450)); })
      .then(function () { c.textContent = '1'; return wait(hold(450)); })
      .then(function () { var a = b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(200), fill: 'forwards' }); return animDone(a, ms(200)).then(function () { clear(b); }); });
  };

  H['E-03 maoSorteada'] = function (p) {
    document.querySelectorAll('.seat').forEach(function (s) { s.classList.remove('is-mao'); });
    $('seat-' + p.seat).classList.add('is-mao');
    return wait(ms(120));
  };

  H['E-04 deal'] = function (p) {
    stage.setAttribute('data-phase', 'dealing');
    view.hand = p; view.mao = p.mao; view.pe = p.pe; view.blind = p.blind; view.vazas = [];
    document.querySelectorAll('.seat').forEach(function (s) { s.classList.remove('is-mao'); });
    $('seat-' + p.mao).classList.add('is-mao');
    clearBubbles(null, '.bubble.persist');
    setRoundDots([]);
    setVale(p.value);
    setValeLabel(p.special);
    drawSinais(); /* §6.15: el significado de los sinais se sortea por MANO, no por partida */
    $('chip-manilha').classList.toggle('onze', p.special !== 'normal');
    document.querySelectorAll('.slot').forEach(clear);
    clear($('carril'));
    clear($('bank-us')); clear($('bank-them'));
    $('vira').classList.add('hidden'); $('vira-line-l').classList.remove('shown');
    $('hand').className = 'hand';
    /* A ciegas (mão de ferro) mis cartas viajan y se muestran como dorsos, aunque el payload las traiga. */
    var myCards = (p.cards[0] && !p.blind) ? p.cards[0].slice() : [null, null, null];
    buildHand(myCards, true);
    var n = g.n;
    for (var s = 1; s < n; s++) setCounter(s, 3, true);
    var deckR = rectOf($('deck'));
    var Lx = L();
    var stagger = n === 2 ? 90 : 55; /* §8.2: stagger 90, total ≤ 1 s → con 12 cartas se acorta a 55 */
    var k = 0, jobs = [];
    for (var round = 0; round < 3; round++) {
      p.order.forEach(function (seat) {
        var delay = (k++) * stagger, rr = round;
        jobs.push(wait(ms(delay)).then(function () { return dealOne(seat, rr, deckR, Lx); }));
      });
    }
    return Promise.all(jobs).then(function () {
      if (p.vira) return flipVira(p.vira);
    });
  };

  function dealOne(seat, k, deckR, Lx) {
    var target, html, shadowEnd;
    if (seat === 0) {
      var card = handCards()[k]; if (!card) return Promise.resolve();
      target = rectOf(card.parentNode);
      html = card._card ? cardHTML(card._card, Lx.hand.w) : backHTML(Lx.hand.w);
      shadowEnd = cssVar('--shadow-card-hand');
      return fly({ html: html, from: deckR, to: target, dur: 380, rotFrom: rand(-15, 15), rotTo: parseFloat(card.style.getPropertyValue('--rot')) || 0, shadowEnd: shadowEnd,
        onDone: function () { card.classList.remove('hidden-card'); } });
    }
    var backs = $('seat-' + seat).querySelectorAll('.counter .mini-back');
    var b = backs[k]; if (!b) return Promise.resolve();
    target = rectOf(b);
    return fly({ html: backHTML(Lx.backW), from: deckR, to: target, dur: 380, rotFrom: rand(-15, 15), rotTo: 0,
      onDone: function () { b.style.visibility = ''; } });
  }

  function flipVira(card) {
    var v = $('vira'), vc = $('vira-card');
    vc._card = card;
    vc.innerHTML = cardHTML(card, L().deckW);
    v.classList.remove('hidden');
    vc.classList.remove('flipping'); void vc.offsetWidth; vc.classList.add('flipping');
    return wait(ms(250));
  }

  H['E-05 manilha'] = function (p) {
    setManilhaChip(p);
    markMySuits();
    drawViraLine();
    var any = false;
    handCards().forEach(function (c) { if (c._card && c._card.isManilha) { any = true; c.classList.add('deal-glow'); setTimeout(function () { c.classList.remove('deal-glow'); }, ms(300) + 20); } });
    if (any) vib(10);
    return wait(ms(any ? 300 : 120));
  };

  H['E-10 turn'] = function (p) {
    stage.setAttribute('data-phase', 'playing');
    if (view.blind) setLight('is-ferro');
    if (p.seat === 0) { $('bar').classList.remove('bar-enter'); void $('bar').offsetWidth; $('bar').classList.add('bar-enter'); }
    return wait(ms(80));
  };

  H['E-11 cardPlayed'] = function (p) {
    var Lx = L(), slot = $('slot-' + p.seat), slotR = rectOf(slot);
    var tilt = rand(-4, 4), html, from, dur;
    var w = (g.n === 2 && layout === 'mobile') ? Lx.slot1v1W : Lx.slotW;
    var showCard = p.card; /* null si coberta o a ciegas */
    if (p.seat === 0) {
      var cards = handCards();
      var cardEl = null;
      if (p.card) cardEl = cards.filter(function (c) { return c._card && c._card.id === p.card.id; })[0];
      if (!cardEl) cardEl = cards[p.cardIndex] || cards[0];
      if (cardEl) {
        from = rectOf(cardEl.parentNode);
        cardEl.classList.add('flying');
        var sl = cardEl.parentNode;
        setTimeout(function () { sl.remove(); layoutHand(); }, ms(60)); /* recentrado 160 ms vía transición */
      } else from = rectOf($('seat-0'));
      html = showCard ? cardHTML(showCard, w) : backHTML(w);
      dur = 280;
    } else {
      var backs = $('seat-' + p.seat).querySelectorAll('.counter .mini-back');
      var b = backs[backs.length - 1];
      from = b ? rectOf(b) : rectOf($('seat-' + p.seat));
      if (b) b.remove();
      html = showCard ? cardHTML(showCard, w) : backHTML(w);
      dur = 440;
    }
    $('hand').classList.remove('coberta-armed');
    $('btn-coberta').setAttribute('aria-pressed', 'false');
    var played = playedEl(showCard, w, tilt);
    played._card = showCard || null;
    return fly({ html: html, from: from, to: slotR, dur: dur, rotFrom: 0, rotTo: tilt, shadowEnd: cssVar('--shadow-card-table'),
      onDone: function () { clear(slot); slot.appendChild(played); } })
      .then(function () {
        if (p.isManilha) {
          /* Estampada (§8.2): scale 1,6 → 1 con sacudón, anillo --glow-stamp desde 320 ms, lámpara tiembla */
          played.classList.add('stamped');
          var ring = el('div', 'glow-ring'); slot.appendChild(ring);
          setTimeout(function () { ring.classList.add('go'); setTimeout(function () { ring.remove(); }, ms(400) + 20); }, ms(320));
          lampTremble(); vib(15);
          if (p.isZap) toast('Saiu o ZAP');
          return wait(hold(520));
        }
        return wait(ms(40));
      });
  };

  H['E-13 roundWon'] = function (p) {
    var st = g.state();
    var winnerEl = $('slot-' + p.winnerSeat).querySelector('.played');
    document.querySelectorAll('.slot .played').forEach(function (e) { e.classList.add('loser'); });
    if (winnerEl) { winnerEl.classList.remove('loser'); winnerEl.classList.add('winner'); if (p.winnerTeam === 1) winnerEl.classList.add('them'); }
    /* Texto corto: la píldora entra en 136 px desde su lado del placar sin pisar al parceiro/rival (mesa.css .pill-rodada) */
    var text = g.n === 2 ? (p.winnerTeam === 0 ? 'VOCÊ LEVOU' : 'ELE LEVOU') : (p.winnerTeam === 0 ? 'NÓS LEVAMOS' : 'ELES LEVARAM');
    showPill(p.winnerTeam, text);
    popDot(p.round - 1, p.winnerTeam, false);
    if (p.winnerSeat !== 0 && Math.random() < 0.25) bubble(p.winnerSeat, p.winnerTeam === 0 ? 'Mandou bem!' : 'Casal maior!', '', { ttl: 2500 });
    return wait(hold(500)).then(function () { return slideToBank(p.winnerTeam, p.plays, p.winnerSeat, p.round, false); });
  };

  H['E-14 roundTied'] = function (p) {
    p.seats.forEach(function (s) { var e = $('slot-' + s).querySelector('.played'); if (e) e.classList.add('tied'); });
    popDot(p.round - 1, null, true);
    showPill(null, 'EMPACHOU!');
    showStamp('EMPACHOU!', 'tie', { small: true, duration: 1100 });
    /* la píldora de empate vive en la franja de los toasts (entre los bancos): el aviso espera a que salga */
    if (p.hint) { var myGen = gen; setTimeout(function () { if (myGen === gen) toast(p.hint); }, hold(1200) + ms(200)); }
    /* La vaza empatada va al banco del lado que abrió la rodada (decisión del prototipo) */
    var st = g.state();
    var openerTeam = (p.plays[0] ? p.plays[0].team : 0);
    return wait(hold(1200)).then(function () { return slideToBank(openerTeam, p.plays, null, p.round, true, p.seats); });
  };

  /* Las cartas de la cruz se encogen a mini y se deslizan al banco (§8.2: 360 ms, stagger 40) */
  function slideToBank(team, plays, winnerSeat, round, tie, tied) {
    var bank = $(team === 0 ? 'bank-us' : 'bank-them'), Lx = L();
    var vaza = el('button', 'vaza'); vaza.type = 'button';
    vaza.style.visibility = 'hidden';
    vaza.setAttribute('aria-label', 'Rodada ' + round + (tie ? ' · empate' : ' · ' + (team === 0 ? 'nós' : 'eles')));
    /* La ganadora queda arriba de la pila; en empate quedan arriba las empatadas (para que el banco muestre QUÉ empató) */
    var tiedSeats = {};
    (tied || []).forEach(function (s) { tiedSeats[s] = true; });
    var onTop = function (pl) { return tie ? (tiedSeats[pl.seat] ? 1 : 0) : (pl.seat === winnerSeat ? 1 : 0); };
    var ordered = plays.slice().sort(function (a, b) { return onTop(a) - onTop(b); });
    ordered.forEach(function (pl) {
      var m = el('div', 'mini', pl.card ? cardHTML(pl.card, Lx.miniW) : backHTML(Lx.miniW));
      m._card = pl.card || null; vaza.appendChild(m);
    });
    var dot = el('i', 'dot ' + (tie ? 'tie' : team === 1 ? 'them' : '')); vaza.appendChild(dot);
    vaza._data = { round: round, team: team, tie: tie, plays: plays, winnerSeat: winnerSeat };
    vaza.addEventListener('click', function (ev) { ev.stopPropagation(); openBankPop(vaza); });
    bank.appendChild(vaza);
    var target = rectOf(vaza); target = { cx: target.x + Lx.miniW / 2 + 2, cy: target.y + Lx.miniW / .68 / 2 + 2, w: Lx.miniW, h: Lx.miniW / .68 };
    var jobs = [];
    ordered.forEach(function (pl, i) {
      var slot = $('slot-' + pl.seat), played = slot.querySelector('.played'); if (!played) return;
      var from = rectOf(slot);
      var html = pl.card ? cardHTML(pl.card, Lx.miniW) : backHTML(Lx.miniW);
      played.style.opacity = '0';
      jobs.push(wait(ms(i * 40)).then(function () { return fly({ html: html, from: from, to: target, dur: 360, rotFrom: parseFloat(played.style.getPropertyValue('--tilt')) || 0, rotTo: 0, easing: cssVar('--ease-standard') }); }));
    });
    return Promise.all(jobs).then(function () {
      document.querySelectorAll('.slot').forEach(clear);
      vaza.style.visibility = '';
      vaza.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(120), fill: 'forwards' });
      return wait(ms(80));
    });
  }

  H['E-15 called'] = function (p) {
    stage.setAttribute('data-phase', 'pending');
    stopTimer();
    /* Si vuelve a pedir, su "ACEITOU"/"CORREU" anterior ya no informa nada y se cruzaba con el grito */
    clearBubbles(p.seat, '.bubble.persist');
    bubble(p.seat, p.text, 'shout', { hold: true });
    setLight('is-truco-pending');
    shake(); vib(20);
    /* asked-to-me (pide el otro equipo): sello chico en la franja libre entre los bancos, para que no tape las cartas
       jugadas que necesito leer para decidir. asked-by-me: queda en la cruz (no tengo nada que leer). */
    var toMe = p.team !== 0;
    showStamp(p.text, 'truco', { hold: true, small: toMe, low: toMe });
    setVale(p.valueIfAccepted, { pending: true, from: p.valueIfRun });
    $('hand').classList.add('locked');
    return wait(hold(300));
  };

  H['E-16 awaitingResponse'] = function (p) {
    $('bar-wait-text').textContent = p.text;
    return wait(ms(50));
  };

  H['E-17 accepted'] = function (p) {
    setLight(view.blind ? 'is-ferro' : null);
    clearBubbles(null, '.bubble.shout');
    bubble(p.seat, 'ACEITOU', 'persist', { persist: true });
    showStamp(p.text, 'ok', { duration: 1200 });
    setVale(p.value, { animate: true });
    toast(p.toastText);
    $('hand').classList.remove('locked');
    stage.setAttribute('data-phase', 'playing');
    return wait(hold(700));
  };

  H['E-19 ran'] = function (p) {
    setLight(null);
    stopTimer(); dimBar('');
    clearBubbles(null, '.bubble.shout');
    bubble(p.seat, 'CORREU', 'persist', { persist: true });
    showStamp('TÔ FORA!', 'run', { duration: 1200 });
    toast(p.text);
    setVale(g.hand ? g.hand.value : p.points);
    return wait(hold(900));
  };

  /* §6.8: durante el cierre de mano la barra queda dimmed (nunca desaparece) y con texto vacío o "Fim da mão":
     así el jugador ve que no hay nada que tocar mientras se recogen las cartas. */
  function dimBar(text) {
    var bar = $('bar');
    bar.classList.remove('waiting'); bar.classList.add('dimmed');
    $('bar-dim-text').textContent = text || '';
    $('btn-correr').classList.remove('confirm'); clearTimeout(correrConfirm); correrConfirm = null;
  }

  H['E-18 handEnd'] = function (p) {
    stage.setAttribute('data-phase', 'handEnd');
    stopTimer(); dimBar('Fim da mão');
    $('hand').classList.remove('my-turn', 'idle');
    document.querySelectorAll('.seat').forEach(function (s) { s.classList.remove('active', 'last-5s'); });
    var cls = p.annulled ? 'sober' : (p.winnerTeam === 0 ? '' : 'sober');
    var myGen = gen;
    var bannerP = showBanner(p.text, { cls: cls, hold: 1400 });
    var collectP = wait(hold(350)).then(function () { if (myGen === gen) return collectAll(); });
    setTimeout(function () { if (myGen === gen) setPontos(p.pontos.nos, p.pontos.eles, true); }, hold(500));
    return Promise.all([bannerP, collectP]).then(function () {
      if (myGen !== gen) return; /* ya empezó otra partida: no pedirle la mano siguiente al motor viejo */
      clearBubbles(null, '.bubble.persist');
      $('chip-manilha').classList.remove('onze');
      if (g.phase === 'handEnd') g.nextHand(); /* mano nueva ≤ 4 s */
    });
  };

  /* Recogida hacia el pé (§8.2: 450 ms, stagger 40): cruz, banco, mi mano y contadores, todo boca abajo */
  function collectAll() {
    var Lx = L(), pe = view.pe != null ? view.pe : 0;
    var to = rectOf($('seat-' + pe)); to = { cx: to.cx, cy: to.cy, w: Lx.backW, h: Lx.backW / .68 };
    var items = [];
    document.querySelectorAll('.slot .played, .carril .played').forEach(function (e) { items.push(e); });
    document.querySelectorAll('.vaza').forEach(function (e) { items.push(e); });
    handCards().forEach(function (e) { items.push(e.parentNode); });
    document.querySelectorAll('.counter .mini-back').forEach(function (e) { items.push(e); });
    var jobs = items.map(function (e, i) {
      var from = rectOf(e);
      e.style.opacity = '0';
      return wait(ms(i * 40)).then(function () { return fly({ html: backHTML(from.w), from: from, to: to, dur: 450, rotFrom: 0, rotTo: rand(-15, 15), easing: cssVar('--ease-exit') }); });
    });
    return Promise.all(jobs).then(function () {
      document.querySelectorAll('.slot').forEach(clear);
      clear($('carril')); clear($('bank-us')); clear($('bank-them')); clear($('hand'));
      for (var s = 1; s < 4; s++) setCounter(s, 0);
      $('vira').classList.add('hidden'); $('vira-line-l').classList.remove('shown');
      return wait(ms(100));
    });
  }

  H['E-20 maoDeOnze'] = function (p) {
    stage.setAttribute('data-phase', 'onze');
    setLight('is-onze');
    var mine = p.team === 0;
    var bannerP = showBanner(p.text, { cls: 'big', sub: mine ? (p.rule || 'Jogar vale ' + p.value + ' · correr dá ' + p.runValue) : 'Eles estão olhando as cartas…', hold: 2000 });
    var carrilP = Promise.resolve();
    if (mine && g.n === 4 && p.cards[2]) {
      /* Las 3 cartas del parceiro bajan boca arriba al carril (flip 400, stagger 80) */
      carrilP = wait(ms(400)).then(function () { return showCarril(p.cards[2]); });
    }
    return Promise.all([bannerP, carrilP]);
  };

  function showCarril(cards) {
    var Lx = L(), carril = $('carril'), w = Lx.slotW;
    clear(carril);
    var backs = $('seat-2').querySelectorAll('.counter .mini-back');
    var jobs = [];
    cards.forEach(function (card, i) {
      var pl = playedEl(card, w, 0); pl._card = card; pl.style.visibility = 'hidden'; carril.appendChild(pl);
    });
    var targets = Array.prototype.slice.call(carril.children).map(rectOf);
    cards.forEach(function (card, i) {
      var b = backs[i], from = b ? rectOf(b) : rectOf($('seat-2'));
      if (b) b.style.visibility = 'hidden';
      jobs.push(wait(ms(i * 80)).then(function () {
        return fly({ html: cardHTML(card, w), from: from, to: targets[i], dur: 400, rotFrom: 0, rotTo: 0, onDone: function () { carril.children[i].style.visibility = ''; carril.children[i].classList.add('flip'); } });
      }));
    });
    view.carrilOpen = true;
    return Promise.all(jobs);
  }
  function hideCarril() {
    if (!view.carrilOpen) return Promise.resolve();
    view.carrilOpen = false;
    var carril = $('carril'), Lx = L();
    var backs = $('seat-2').querySelectorAll('.counter .mini-back');
    var jobs = Array.prototype.slice.call(carril.children).map(function (pl, i) {
      var from = rectOf(pl), b = backs[i], to = b ? rectOf(b) : rectOf($('seat-2'));
      pl.style.opacity = '0';
      return wait(ms(i * 60)).then(function () { return fly({ html: backHTML(Lx.backW), from: from, to: to, dur: 400, onDone: function () { if (b) b.style.visibility = ''; } }); });
    });
    return Promise.all(jobs).then(function () { clear(carril); });
  }

  H['E-21 onzePlaying'] = function (p) {
    stage.setAttribute('data-phase', 'playing');
    /* la etiqueta ya la puso E-04 ("MÃO DE ONZE" / "VALE"): p.chip traía el valor repetido ("… VALE 3  3") */
    setValeLabel('onze');
    return hideCarril();
  };
  H['E-22 onzeRan'] = function (p) { setLight(null); stopTimer(); dimBar(''); toast(p.text); return hideCarril().then(function () { return wait(hold(600)); }); };

  H['E-30 maoDeFerro'] = function (p) {
    stage.setAttribute('data-phase', 'ferro');
    setLight('is-ferro');
    $('hand').classList.add('locked');
    return showBanner('MÃO DE FERRO', { cls: 'big', sub: 'quem ganhar leva a partida' + (p.blind ? ' · às escuras' : ''), hold: 2000 });
  };

  H['E-32 ferroReveal'] = function (p) {
    /* Revelación: las cartas de la cruz giran a la vez (rotateY 400) y la luz vuelve */
    setLight(null);
    var w = (g.n === 2 && layout === 'mobile') ? L().slot1v1W : L().slotW;
    p.plays.forEach(function (pl) {
      var slot = $('slot-' + pl.seat), old = slot.querySelector('.played'); if (!old || !pl.card) return;
      var tilt = parseFloat(old.style.getPropertyValue('--tilt')) || 0;
      old.classList.add('flip');
      setTimeout(function () { old.innerHTML = cardHTML(pl.card, w); old._card = pl.card; old.setAttribute('aria-label', pl.card.name); }, ms(200));
    });
    return wait(hold(450));
  };

  H['E-40 matchEnd'] = function (p) {
    stage.setAttribute('data-phase', 'matchEnd');
    stopTimer();
    setLight(p.humanWon ? 'is-victory' : 'is-defeat');
    dimBar('Fim da partida');
    $('hand').classList.remove('my-turn', 'idle');
    document.querySelectorAll('.seat').forEach(function (s) { s.classList.remove('active', 'last-5s'); });
    var myGen = gen;
    /* Si en estos 400 ms arrancó otra partida (Sair, Nova partida), la tarjeta vieja no debe aparecer sobre la mesa nueva */
    return wait(hold(400)).then(function () { if (myGen === gen) showResult(p); });
  };

  H['E-61 autoPlay'] = function (p) {
    if (p.seat === 0) {
      toast(p.text, 'toast-danger', '<span class="counter-chip">' + p.counter + '</span>');
      var s = $('seat-0'); s.classList.add('has-auto'); s.querySelector('.auto-count').textContent = p.counter;
    }
    return wait(ms(100));
  };
  H['E-62 autoPlayWarning'] = function (p) { if (p.seat === 0) toast(p.text, 'toast-danger'); return wait(ms(100)); };
  H['E-63 abandoned'] = function (p) { toast(p.text, 'toast-danger'); return wait(ms(300)); };
  H['I toast'] = function (p) { if (p.seat === 0 || p.seat == null) toast(p.text); return Promise.resolve(); };

  function handle(name, payload) {
    var fn = H[name];
    return fn ? fn(payload) : Promise.resolve();
  }

  /* -------------------------------------------------------------------
     10. Sincronización de controles con el estado (idempotente)
     ------------------------------------------------------------------- */
  function syncControls() {
    if (!g) return;
    var st = g.state(), la = st.actions || {}, bar = $('bar'), hand = $('hand');
    var mustAct = false, activeSeat = null, key = null;
    bar.classList.remove('dimmed', 'waiting');
    $('btn-correr').hidden = false; $('btn-coberta').hidden = true; $('btn-aceitar').hidden = true; $('btn-jogar').hidden = true; $('btn-truco').hidden = true; $('bar-note').hidden = true;
    $('btn-truco').classList.remove('blocked'); $('btn-truco').removeAttribute('title');
    /* §6.7: el botón TRUCO no existe en la mão de onze ni en la mão de ferro (ni después del doze). La MISMA regla vale
       en turno y fuera de turno, para que la barra no cambie de 2 a 3 huecos en cada cambio de turno; el hueco lo ocupa
       el chip "SEM TRUCO" en las manos especiales (nunca un hueco en blanco, §6.8). */
    var noTruco = !st.hand || st.hand.special !== 'normal' || st.hand.level >= 4;

    $('btn-correr').classList.remove('blocked'); $('btn-correr').removeAttribute('title');
    if (!$('btn-correr').classList.contains('confirm')) { $('btn-correr').textContent = ''; $('btn-correr').append('CORRER', keySpan('C')); }

    if (st.phase === 'playing') {
      activeSeat = st.round.turn;
      if (la.isTurn) {
        mustAct = true; key = 'play-' + st.hand.number + '-' + st.round.number;
        bar.setAttribute('data-config', 'turno');
        $('btn-coberta').hidden = false;
        $('btn-coberta').classList.toggle('blocked', !la.canCoberta);
        if (st.hand.special === 'ferro') $('btn-coberta').title = TE.TOAST.noTrucoFerro; else $('btn-coberta').removeAttribute('title');
        /* en mão de ferro no se corre: el botón lo dice (bloqueado) en vez de mentir con aspecto activo */
        $('btn-correr').classList.toggle('blocked', !la.canRun);
        if (!la.canRun && st.hand.special === 'ferro') $('btn-correr').title = TE.TOAST.noTrucoFerro;
        $('btn-correr').setAttribute('aria-label', 'Correr: eles ganham ' + la.runGives);
        if (la.canCall) {
          $('btn-truco').hidden = false; $('btn-truco').textContent = ''; $('btn-truco').append(la.callName + '!', keySpan('T'));
          $('btn-truco').setAttribute('aria-label', 'Pedir ' + la.callName.toLowerCase() + ' (vale ' + la.callValue + ')');
        } else if (la.callBlocked && !noTruco) {
          $('btn-truco').hidden = false; $('btn-truco').classList.add('blocked'); $('btn-truco').title = la.callBlocked;
          $('btn-truco').textContent = ''; $('btn-truco').append(st.chainNames[st.hand.level + 1] + '!', keySpan('T'));
        }
        $('bar-note').hidden = !(st.hand.special !== 'normal');
        hand.classList.add('my-turn'); hand.classList.toggle('idle', !motionOff());
      } else {
        bar.setAttribute('data-config', 'turno');
        bar.classList.add('dimmed'); $('bar-dim-text').textContent = 'Vez de ' + st.names[st.round.turn];
        $('btn-coberta').hidden = false;
        $('btn-truco').hidden = noTruco;
        if (!noTruco) { $('btn-truco').textContent = ''; $('btn-truco').append((st.chainNames[st.hand.level + 1] || 'TRUCO') + '!', keySpan('T')); }
        $('bar-note').hidden = !(st.hand.special !== 'normal');
        hand.classList.remove('my-turn', 'idle');
      }
    } else if (st.phase === 'awaitingResponse') {
      var pnd = st.hand.pending;
      /* el anillo de turno va a quien responde de verdad: el humano si puede, si no el bot que el motor señala
         (antes firstResponder marcaba al parceiro y startTimer sumaba a seat-0: dos anillos a la vez) */
      activeSeat = la.canRespond ? 0 : g.pendingBotSeat();
      if (la.canRespond) {
        mustAct = true; key = 'resp-' + st.hand.number + '-' + pnd.level;
        bar.setAttribute('data-config', 'resposta');
        $('btn-aceitar').hidden = false; $('btn-aceitar').setAttribute('aria-label', 'Aceitar: mão vale ' + la.acceptValue);
        $('btn-correr').setAttribute('aria-label', 'Correr: eles ganham ' + la.runValueIfPending);
        if (la.canRaise) { $('btn-truco').hidden = false; $('btn-truco').textContent = ''; $('btn-truco').append(la.raiseName + '!', keySpan('T')); $('btn-truco').setAttribute('aria-label', 'Aumentar para ' + la.raiseName.toLowerCase() + ' (vale ' + la.raiseValue + ')'); }
      } else {
        bar.classList.add('waiting');
      }
      hand.classList.remove('my-turn', 'idle');
    } else if (st.phase === 'onze') {
      bar.setAttribute('data-config', 'onze');
      if (la.canOnze) {
        mustAct = true; key = 'onze-' + st.hand.number; activeSeat = 0;
        $('btn-jogar').hidden = false; $('btn-jogar').textContent = ''; $('btn-jogar').append('JOGAR', keySpan('A'));
        $('btn-jogar').setAttribute('aria-label', 'Jogar a mão de onze (vale ' + st.hand.value + ')');
        $('btn-correr').setAttribute('aria-label', 'Correr: eles ganham ' + st.chain[0]);
        /* durante la decisión las cartas NO suben como jugables: sólo el carril y los dos botones */
        hand.classList.remove('my-turn', 'idle');
      } else {
        bar.classList.add('waiting');
        $('bar-wait-text').textContent = la.onzeWaiting ? 'Aguardando o parceiro…' : 'Eles estão olhando as cartas…';
        hand.classList.remove('my-turn', 'idle');
      }
    } else {
      bar.classList.add('dimmed'); $('bar-dim-text').textContent = st.phase === 'matchEnd' ? 'Fim da partida' : '';
      /* fin de partida: sólo la píldora centrada; un CORRER atenuado a la izquierda + 134 px vacíos leía como botón roto */
      if (st.phase === 'matchEnd') $('btn-correr').hidden = true;
      hand.classList.remove('my-turn', 'idle');
    }
    hand.classList.toggle('locked', !!(st.hand && st.hand.blind) || st.phase === 'awaitingResponse');

    document.querySelectorAll('.seat').forEach(function (s) { s.classList.toggle('active', activeSeat !== null && activeSeat !== undefined && Number(s.dataset.seat) === activeSeat); });
    /* §8.2: +3 s sólo a quien abre la MANO (1.ª rodada, sin jugadas), no cualquier rodada */
    var opensHand = st.phase === 'playing' && st.round.number === 1 && st.round.plays.length === 0;
    if (mustAct) startTimer(key, window.MESA && window.MESA.timerSeconds ? window.MESA.timerSeconds : (opensHand ? 23 : 20));
    else stopTimer();
  }
  function keySpan(k) { var s = el('span', 'key', k); s.setAttribute('aria-hidden', 'true'); return s; }

  /* -------------------------------------------------------------------
     11. Timer (20 s lineal, +3 s al que abre; últimos 5 s en --run)
     ------------------------------------------------------------------- */
  var timer = { key: null, anim: null, tick: null, end: 0, expired: null };
  function startTimer(key, seconds) {
    if (timer.key === key) return;
    /* El timer venció mientras la cola estaba ocupada: la jugada automática quedó pendiente. Si sigue siendo la misma
       decisión, la ejecutamos ahora en vez de regalar otros 20 s. */
    if (timer.expired === key) { timer.expired = null; if (g && !busy()) { g.timeoutPlay(0); return; } }
    stopTimer();
    timer.key = key; timer.expired = null;
    var seat = $('seat-0'), circle = seat.querySelector('.ring circle.bar'), badge = seat.querySelector('.timer-badge');
    if (!circle) return;
    var len = 2 * Math.PI * 29.5;
    circle.style.strokeDasharray = len;
    circle.style.strokeDashoffset = 0;
    seat.classList.remove('last-5s'); /* la clase .active la maneja sólo syncControls */
    var total = seconds * 1000;
    timer.end = Date.now() + total;
    timer.anim = circle.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: len }], { duration: total, easing: 'linear', fill: 'forwards' });
    var lastSec = seconds;
    badge.textContent = seconds;
    timer.tick = setInterval(function () {
      /* Con el modal de Ajustes abierto el timer se PAUSA de verdad (anillo y contador): elegir velocidad no puede
         costar una jugada automática. Sólo en la demo: en producción el servidor no pausa (anotar en DESIGN §6.20). */
      if (!$('settings').hidden) {
        timer.end += 200;
        if (timer.anim && timer.anim.playState === 'running') timer.anim.pause();
        return;
      }
      if (timer.anim && timer.anim.playState === 'paused') timer.anim.play();
      var left = Math.max(0, timer.end - Date.now()), sec = Math.ceil(left / 1000);
      if (sec !== lastSec) {
        lastSec = sec; badge.textContent = sec;
        if (sec <= 5 && sec > 0) { seat.classList.add('last-5s'); vib(10); }
      }
      if (left <= 0) {
        var k = timer.key;
        stopTimer();
        if (g && !busy()) g.timeoutPlay(0); else timer.expired = k;
      }
    }, 200);
  }
  function stopTimer() {
    if (timer.anim) { timer.anim.cancel(); timer.anim = null; }
    clearInterval(timer.tick); timer.tick = null; timer.key = null;
    var seat = $('seat-0'); if (seat) seat.classList.remove('last-5s');
  }

  /* -------------------------------------------------------------------
     12. Acciones del humano
     ------------------------------------------------------------------- */
  /* Cerrojo contra el doble toque: entre el toque y g.play() pasan 150 ms (animación "touched"); un segundo toque o
     tecla en esa ventana encolaba OTRA jugada con un índice ya corrido (jugada no intencional en mesa con plata). */
  var tapLock = false;
  function onCardTap(ev) {
    var btn = ev.currentTarget;
    if (!g || tapLock || busy()) return;
    closePops();
    var st = g.state(), la = st.actions;
    if (st.phase === 'onze') { toast('Decida: JOGAR ou CORRER'); return; }
    if (st.phase === 'awaitingResponse' || !la.isTurn) { g.play(0, 0); afterHumanAction(); return; /* el motor emite el toast correcto */ }
    var idx = handCards().indexOf(btn);
    if (idx < 0) return;
    var coberta = $('btn-coberta').getAttribute('aria-pressed') === 'true';
    if (coberta && !la.canCoberta) { g.play(0, idx, { coberta: true }); afterHumanAction(); return; }
    tapLock = true;
    btn.classList.add('touched');
    wait(ms(150)).then(function () {
      btn.classList.remove('touched');
      tapLock = false;
      /* recalcular: la mano pudo cambiar en estos 150 ms */
      idx = handCards().indexOf(btn);
      if (idx < 0 || !btn.isConnected || busy()) return;
      var r = g.play(0, idx, { coberta: coberta });
      if (r.ok) stopTimer(); else syncControls();
      afterHumanAction();
    });
  }
  function playIndex(i) { var c = handCards()[i]; if (c && !tapLock) c.click(); }

  $('btn-coberta').addEventListener('click', function () {
    if (!g || busy()) return;
    var st = g.state(), la = st.actions, sp = st.hand && st.hand.special;
    if (!la.canCoberta) {
      /* el texto sale del estado: en mão de ferro el motivo es la ferro, no la rodada */
      toast(sp === 'ferro' ? TE.TOAST.noTrucoFerro : la.isTurn ? TE.TOAST.cobertaRound1 : TE.TOAST.notYourTurn);
      return;
    }
    var on = $('btn-coberta').getAttribute('aria-pressed') !== 'true';
    $('btn-coberta').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('hand').classList.toggle('coberta-armed', on);
  });
  $('btn-truco').addEventListener('click', function () {
    if (!g || busy()) return;
    var st = g.state(), la = st.actions;
    if (st.phase === 'awaitingResponse' && la.canRaise) { stopTimer(); g.respond(0, 'aumentar'); afterHumanAction(); return; }
    if (la.callBlocked) { toast(la.callBlocked); return; }
    stopTimer();
    var r = g.call(0);
    if (!r.ok) syncControls();
    afterHumanAction();
  });
  /* CORRER voluntario (en mi turno, sin pedido pendiente) regala de 1 a 12 puntos: pide confirmación (segundo toque
     dentro de 1,5 s). Responder a un pedido o decidir en la mão de onze son decisiones explícitas: van directo. */
  var correrConfirm = null;
  $('btn-correr').addEventListener('click', function () {
    if (!g || busy()) return;
    var st = g.state(), la = st.actions, btn = $('btn-correr');
    if (st.phase === 'playing') {
      if (!la.canRun) { toast(la.isTurn ? TE.TOAST.noTrucoFerro : TE.TOAST.notYourTurn); return; }
      if (!btn.classList.contains('confirm')) {
        btn.classList.add('confirm'); btn.textContent = 'CONFIRMAR?';
        correrConfirm = setTimeout(function () { btn.classList.remove('confirm'); btn.textContent = ''; btn.append('CORRER', keySpan('C')); correrConfirm = null; }, 1500);
        return;
      }
      clearTimeout(correrConfirm); correrConfirm = null;
      btn.classList.remove('confirm'); btn.textContent = ''; btn.append('CORRER', keySpan('C'));
    }
    stopTimer();
    if (st.phase === 'onze') g.onzeDecision(0, 'correr');
    else g.respond(0, 'correr');
    afterHumanAction();
  });
  $('btn-aceitar').addEventListener('click', function () { if (!g || busy()) return; stopTimer(); g.respond(0, 'aceitar'); afterHumanAction(); });
  $('btn-jogar').addEventListener('click', function () { if (!g || busy()) return; stopTimer(); g.onzeDecision(0, 'jogar'); afterHumanAction(); });

  /* Atajos de teclado (desktop): T · A · C · 1 2 3. Sólo disparan botones visibles y con la barra activa. */
  function keyClick(id) {
    var btn = $(id), bar = $('bar');
    if (btn.hidden || bar.classList.contains('dimmed') || bar.classList.contains('waiting')) return;
    btn.click();
  }
  document.addEventListener('keydown', function (ev) {
    if (!$('settings').hidden || ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT') return;
    var k = ev.key.toLowerCase();
    if (k === 't') keyClick('btn-truco');
    else if (k === 'a') { if (!$('btn-aceitar').hidden) keyClick('btn-aceitar'); else if (!$('btn-jogar').hidden) keyClick('btn-jogar'); }
    else if (k === 'c') keyClick('btn-correr');
    else if (k === '1' || k === '2' || k === '3') playIndex(Number(k) - 1);
    else if (k === 'escape') { closePops(); $('settings').hidden = true; }
  });

  /* -------------------------------------------------------------------
     13. Resultado (§6.18)
     ------------------------------------------------------------------- */
  function showResult(p) {
    var r = $('result'), title = $('result-title'), card = $('result-card');
    var won = p.humanWon;
    title.textContent = won ? 'VITÓRIA' : 'DERROTA';
    title.className = 'result-title ' + (won ? 'victory' : 'defeat');
    /* Dinero como dato y según el resultado (§6.18/§10, voz neutra): el que pierde no "recibe" nada.
       POR JUGADOR (ver MESA_VALUE/TAXA arriba): en 2v2 el neto del pozo es de la DUPLA y cada ganador cobra la mitad;
       antes la tarjeta prometía el neto entero (R$ 7,44) cuando se cobran R$ 3,72. */
    var n = g.n, pot = MESA_VALUE * n, winners = n / 2, mine = pot * (1 - TAXA) / winners;
    var mesaTxt = 'mesa ' + brl(MESA_VALUE) + ' × ' + n + ', taxa ' + pct(TAXA);
    var money = !won ? 'Você perde ' + brl(MESA_VALUE)
      : n === 2 ? 'Você recebe ' + brl(mine) + ' (' + mesaTxt + ')'
      : 'Você recebe ' + brl(mine) + ' · sua parte da mesa (' + mesaTxt + ', dividida com o parceiro)';
    card.innerHTML =
      '<div class="score"><span class="us">' + p.pontos.nos + '</span><span class="x">×</span><span class="them">' + p.pontos.eles + '</span></div>' +
      '<div class="line">' + maos(p.hands) + ' · ' + (n === 2 ? 'você' : 'nós') + ' ' + p.handsWon[0] + ' · ' + (n === 2 ? 'ele' : 'eles') + ' ' + p.handsWon[1] + (p.reason === 'abandon' ? ' · abandono' : '') + '</div>' +
      '<div class="line">' + money + '</div>' +
      '<div class="line motto">' + (won ? 'Mandou bem!' : 'No truco, a sorte muda a cada mão.') + '</div>' +
      '<div class="actions"><button class="btn btn-ghost-ok" id="res-again" type="button">JOGAR DE NOVO</button><button class="btn btn-ghost-brass" id="res-back" type="button">VOLTAR</button><button class="btn btn-ghost-brass" id="res-rev" type="button">Revanche</button></div>';
    r.hidden = false;
    $('res-again').addEventListener('click', function () { newGame(); });
    $('res-back').addEventListener('click', function () { newGame(); });
    $('res-rev').addEventListener('click', function () { if (settings.seed !== '') { settings.seed = String((parseInt(settings.seed, 10) || 0) + 1); saveSettings(); applySettings(); } newGame(); });
  }

  /* -------------------------------------------------------------------
     14. Popovers: banco y chat
     ------------------------------------------------------------------- */
  function closePops() { $('bank-pop').hidden = true; $('chat-pop').hidden = true; $('btn-chat').setAttribute('aria-expanded', 'false'); }
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest('.popover') && !ev.target.closest('.vaza') && !ev.target.closest('#btn-chat')) closePops();
  });

  function openBankPop(vaza) {
    var d = vaza._data, pop = $('bank-pop'), Lx = L();
    closePops();
    pop.innerHTML = '<div class="cap">Rodada ' + d.round + ' · ' + (d.tie ? 'empachou' : (d.team === 0 ? (g.n === 2 ? 'você' : 'nós') : (g.n === 2 ? 'ele' : 'eles'))) + '</div><div class="cards"></div>';
    var box = pop.querySelector('.cards');
    d.plays.forEach(function (pl) {
      var e = el('div', 'played' + (pl.seat === d.winnerSeat ? ' winner' + (d.team === 1 ? ' them' : '') : ''), pl.card ? cardHTML(pl.card, Lx.slotW) : backHTML(Lx.slotW));
      e.title = g.names[pl.seat] + (pl.card ? ' · ' + pl.card.name : ' · coberta');
      box.appendChild(e);
    });
    var r = rectOf(vaza);
    pop.hidden = false;
    var w = pop.offsetWidth, W = L().W;
    var left = Math.max(12, Math.min(W - w - 12, r.cx - w / 2));
    pop.style.left = left + 'px'; pop.style.top = (r.y - pop.offsetHeight - 8) + 'px';
  }

  var PHRASES = ['Boa!', 'Mandou bem!', 'Vish…', 'Casal maior!', 'Saiu o ZAP', 'Tô fora dessa', 'Vai, parceiro!'];
  var EMOTES = ['KKK', 'UI!', 'ÉÉÉ', 'BORA', 'OPA', 'HMM'];
  var SINAIS = ['piscar', 'sobrancelha', 'bochecha', 'língua'];
  var sinalTable = [];
  function drawSinais() {
    var m = ['zap', 'copas', 'espadilha', 'pica-fumo'].slice();
    for (var i = m.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = m[i]; m[i] = m[j]; m[j] = t; }
    sinalTable = m;
  }
  $('btn-chat').addEventListener('click', function (ev) {
    ev.stopPropagation();
    var pop = $('chat-pop');
    if (!pop.hidden) { closePops(); return; }
    closePops();
    pop.innerHTML = '';
    var g1 = el('div', 'group'); PHRASES.forEach(function (t) { var b = el('button', 'say', t); b.type = 'button'; b.addEventListener('click', function () { say(t, ''); }); g1.appendChild(b); });
    var g2 = el('div', 'group'); EMOTES.forEach(function (t) { var b = el('button', 'say emote', t); b.type = 'button'; b.addEventListener('click', function () { say(t, 'emote'); }); g2.appendChild(b); });
    pop.appendChild(el('div', 'cap', 'Frases')); pop.appendChild(g1);
    pop.appendChild(el('div', 'cap', 'Emotes')); pop.appendChild(g2);
    if (g && g.n === 4) {
      var g3 = el('div', 'group');
      SINAIS.forEach(function (t, i) { var b = el('button', 'say sinal', t + '<b>' + sinalTable[i] + '</b>'); b.type = 'button'; b.setAttribute('aria-label', 'Sinal: ' + t + ' (significa ' + sinalTable[i] + ' só para sua dupla)'); b.addEventListener('click', function () { say(t, 'sinal'); }); g3.appendChild(b); });
      pop.appendChild(el('div', 'cap', 'Sinais · significado sorteado nesta mão, só sua dupla vê')); pop.appendChild(g3);
    }
    pop.hidden = false;
    $('btn-chat').setAttribute('aria-expanded', 'true');
  });
  function say(text, kind) {
    closePops();
    var seat = $('seat-0');
    if (kind === 'sinal') { seat.classList.remove('signal'); void seat.offsetWidth; seat.classList.add('signal'); setTimeout(function () { seat.classList.remove('signal'); }, 1600); }
    bubble(0, text, kind === 'emote' ? 'emote' : '', { ttl: 3000 });
    $('btn-chat').classList.add('cooldown');
    setTimeout(function () { $('btn-chat').classList.remove('cooldown'); }, 2500);
  }

  /* -------------------------------------------------------------------
     15. Ajustes y panel de demo
     ------------------------------------------------------------------- */
  $('btn-ajustes').addEventListener('click', function () { closePops(); $('settings').hidden = false; $('set-variant').focus(); });
  $('settings-close').addEventListener('click', function () { $('settings').hidden = true; });
  $('settings-scrim').addEventListener('click', function () { $('settings').hidden = true; });
  /* newGame limpia los toasts: el aviso va DESPUÉS (antes se encolaba y se borraba en el mismo tick, nunca se veía) */
  $('btn-sair').addEventListener('click', function () { newGame(); toast('Demo: nova partida'); });

  ['variant', 'mode', 'speed', 'motion', 'contrast', 'rule', 'font', 'seed'].forEach(function (k) {
    $('set-' + k).addEventListener('change', function (ev) {
      settings[k] = ev.target.value; saveSettings(); applySettings();
      if (k === 'rule') renderStaticCards();
      if (k === 'variant' || k === 'mode') { $('force-note').textContent = 'Aplica na próxima partida (Nova partida).'; }
      if (k === 'font') relayout(false);
    });
  });
  $('set-new').addEventListener('click', function () { $('settings').hidden = true; newGame(); });

  $('force-onze').addEventListener('click', function () { $('settings').hidden = true; newGame({ pontos: [settings.variant === 'mineiro' ? 10 : 11, 5] }); toast('Demo: mão de onze forçada'); });
  $('force-ferro').addEventListener('click', function () { $('settings').hidden = true; var t = settings.variant === 'mineiro' ? 10 : 11; newGame({ pontos: [t, t] }); toast('Demo: mão de ferro forçada'); });
  $('force-truco').addEventListener('click', function () { $('settings').hidden = true; pendingForce = 'call'; newGame({ mao: 1 }); toast('Demo: o rival vai pedir truco'); });
  $('force-tie').addEventListener('click', function () { $('settings').hidden = true; newGame({ mao: 0, deck: tieDeck(settings.mode) }); toast('Demo: jogue o 3 para empatar'); });

  /* Mazo armado para el empate: yo abro con un 3, el rival tiene otro 3 y nada que lo supere.
     Se reparte una carta por asiento desde el mão (0), tres vueltas, y después la vira (Ac → manilha 2, que nadie tiene). */
  function tieDeck(mode) {
    if (mode === '1v1') return ['3o', '3p', '4e', '4o', '5e', '5o', 'Ac'];
    return ['3o', '3p', '6o', '6c', '4e', '4o', '6e', '6p', '5e', '5o', 'Kc', 'Ko', 'Ac'];
  }

  /* -------------------------------------------------------------------
     16. Partida nueva
     ------------------------------------------------------------------- */
  function newGame(extra) {
    gen++;
    clearTimeout(botTimer); botTimer = null;
    stopTimer(); clearStamp(true); clearBubbles(null);
    clearInterval(valeBlink);
    pending = 0; chain = Promise.resolve();
    tapLock = false; timer.expired = null;
    $('fx').innerHTML = '';
    $('result').hidden = true; clear($('result-card')); $('result-title').className = 'result-title';
    clear($('banner')); clear($('toasts'));
    closePops();
    forceCallOnce = (pendingForce === 'call'); pendingForce = null;
    drawSinais();
    var opts = Object.assign({
      variant: settings.variant, mode: settings.mode, humanSeat: 0, autoNextHand: false,
      seed: settings.seed === '' ? undefined : parseInt(settings.seed, 10)
    }, extra || {});
    g = new TE.Game(opts);
    g.on('*', function (name, payload) { enqueue(function () { return handle(name, payload); }); });
    stage.setAttribute('data-variant', settings.variant);
    stage.setAttribute('data-mode', settings.mode);
    buildSeats(g.state());
    relayout(false);
    g.start();
  }

  /* -------------------------------------------------------------------
     17. Arranque
     ------------------------------------------------------------------- */
  window.MESA = { game: function () { return g; }, newGame: newGame, settings: settings, timerSeconds: null /* sólo para pruebas: fuerza la duración del timer */, busy: function () { return busy(); }, _banner: function (t, o) { return showBanner(t, o); } };
  applySettings();
  renderStaticCards();
  fitStage();
  window.addEventListener('resize', fitStage);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitStage);
  if (reducedMotionMQ.addEventListener) reducedMotionMQ.addEventListener('change', function () { syncControls(); });
  /* Entrada a la mesa (§8.2): placar y barra entran y 8 → 0 */
  [$('placar'), $('bar')].forEach(function (e, i) {
    e.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: ms(350), delay: ms(60 * i), easing: cssVar('--ease-enter'), fill: 'backwards' });
  });
  newGame();

})();
