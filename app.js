/* =====================================================================
   Beleza Truco · app.js
   Capa compartida de las pantallas fuera de la mesa (home, lobby, caixa,
   ranking). Sin red: los datos son de muestra y viven acá para que las
   cuatro páginas cuenten la misma historia (mismo saldo, mismo jugador,
   mismas mesas). En producción todo esto lo manda el servidor (ver
   02-Spec-para-programadores § "Pantallas fuera de la mesa").
   Sin módulos ES: expone window.APP.
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Formato: R$ y porcentaje, igual que mesa.js (misma fuente de verdad)
     ------------------------------------------------------------------ */
  function brl(x) { return 'R$ ' + Number(x).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function pct(x) { return String(Math.round(x * 100)) + ' %'; }
  function num(x) { return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }

  /* ------------------------------------------------------------------
     Datos de muestra (una sola historia para las cuatro páginas)
     ------------------------------------------------------------------ */
  var ME = { name: 'Você', initial: 'V', level: 7, xp: 1340, xpNext: 2000, wins: 128, games: 240, manilhas: 412, zaps: 96, streak: 7, variant: 'Paulista', rankPos: 37, rankPts: 1215, cpf: '***.456.789-**', kyc: 'verificada' };
  var WALLET = { available: 48.20, reserved: 2.00, limits: { depMin: 10, depMax: 5000, wdMin: 20, wdMax: 5000, wdFee: 0 } };
  var ONLINE = { players: 1284, tables: 37 };

  var TABLES = [
    { id: 4821, variant: 'Paulista', mode: '2x2', value: 2, fee: .07, timer: 20, series: 1, seats: ['A', 'B', 'C', null], status: 'aguardando' },
    { id: 4817, variant: 'Paulista', mode: '1x1', value: 5, fee: .07, timer: 20, series: 3, seats: ['M', null], status: 'aguardando' },
    { id: 4809, variant: 'Mineiro',  mode: '2x2', value: 1, fee: .07, timer: 30, series: 1, seats: ['J', 'K', null, null], status: 'aguardando' },
    { id: 4802, variant: 'Paulista', mode: '2x2', value: 10, fee: .06, timer: 20, series: 5, seats: ['R', 'S', 'T', 'U'], status: 'em jogo' },
    { id: 4798, variant: 'Paulista', mode: '1x1', value: .5, fee: .08, timer: 10, series: 1, seats: [null, null], status: 'aguardando' },
    { id: 4791, variant: 'Mineiro',  mode: '1x1', value: 2, fee: .07, timer: 20, series: 1, seats: ['D', 'E'], status: 'em jogo' },
    { id: 4786, variant: 'Paulista', mode: '2x2', value: 20, fee: .06, timer: 20, series: 3, seats: ['F', null, 'G', null], status: 'aguardando' },
    { id: 4780, variant: 'Paulista', mode: '2x2', value: 1, fee: .07, timer: 20, series: 1, seats: ['H', 'I', 'L', 'N'], status: 'em jogo' }
  ];

  var HISTORY = [
    { t: 'Hoje · 21:48', kind: 'mesa',  text: 'Mesa #4815 · Paulista · 2x2 · R$ 2,00', sub: 'Você recebe R$ 3,72 · sua parte da mesa (R$ 2,00 × 4, taxa 7 %, dividida com o parceiro)', amt: 3.72, cls: 'ok' },
    { t: 'Hoje · 21:12', kind: 'mesa',  text: 'Mesa #4811 · Paulista · 2x2 · R$ 2,00', sub: 'Você perde R$ 2,00', amt: -2.00, cls: 'run' },
    { t: 'Hoje · 20:55', kind: 'hold',  text: 'Mesa #4811 · valor reservado', sub: 'R$ 2,00 reservados ao sentar · liberados no fim da partida', amt: 0, cls: 'lo', label: 'Reservado' },
    { t: 'Hoje · 19:30', kind: 'dep',   text: 'Depósito Pix', sub: 'Confirmado em 14 s · E2E 1a2b…9f0c', amt: 50.00, cls: 'ok' },
    { t: 'Ontem · 23:05', kind: 'wd',   text: 'Saque Pix · chave CPF', sub: 'Em processamento · até 1 dia útil', amt: -30.00, cls: 'lo', label: 'Processando' },
    { t: 'Ontem · 22:10', kind: 'mesa', text: 'Mesa #4790 · Mineiro · 1x1 · R$ 5,00', sub: 'Você recebe R$ 9,30 · sua parte da mesa (R$ 5,00 × 2, taxa 7 %)', amt: 9.30, cls: 'ok' },
    { t: '01/11 · 20:40', kind: 'mesa', text: 'Mesa #4702 · Paulista · 2x2 · R$ 1,00 · abandono', sub: 'Você perde R$ 1,00 · partida encerrada por abandono', amt: -1.00, cls: 'run' },
    { t: '31/10 · 18:02', kind: 'dep',  text: 'Depósito Pix', sub: 'Confirmado em 9 s', amt: 20.00, cls: 'ok' }
  ];

  var RANKING = [
    { pos: 1, name: 'Dudu Garcia', i: 'D', wins: 212, games: 301, pts: 3420 },
    { pos: 2, name: 'Tati Moraes', i: 'T', wins: 198, games: 290, pts: 3188 },
    { pos: 3, name: 'Zé do Zap', i: 'Z', wins: 187, games: 265, pts: 3045 },
    { pos: 4, name: 'Carla Nunes', i: 'C', wins: 171, games: 248, pts: 2760 },
    { pos: 5, name: 'Betão', i: 'B', wins: 164, games: 251, pts: 2602 },
    { pos: 6, name: 'Léo Prado', i: 'L', wins: 158, games: 230, pts: 2511 },
    { pos: 7, name: 'Marina S.', i: 'M', wins: 149, games: 221, pts: 2388 },
    { pos: 8, name: 'Kiko', i: 'K', wins: 141, games: 219, pts: 2260 },
    { pos: 9, name: 'Paulo H.', i: 'P', wins: 137, games: 200, pts: 2194 },
    { pos: 10, name: 'Ana Lima', i: 'A', wins: 130, games: 196, pts: 2071 }
  ];
  var REWARDS = [
    { who: '1º', amt: 500 }, { who: '2º', amt: 250 }, { who: '3º', amt: 100 }, { who: '4º a 10º', amt: 20 }
  ];

  /* ------------------------------------------------------------------
     Ícones (trazo 2, igual que los del header de la mesa)
     ------------------------------------------------------------------ */
  var ICO = {
    back: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M10 6 4 12l6 6M4 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    settings: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mesas: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
    caixa: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M7 15h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    ranking: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M7 20v-7M12 20V5M17 20v-10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    perfil: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* ------------------------------------------------------------------
     Navegación: barra de pestañas (celular) y topnav (desktop)
     ------------------------------------------------------------------ */
  var NAV = [
    { id: 'lobby', href: 'lobby.html', label: 'Mesas', ico: ICO.mesas },
    { id: 'caixa', href: 'caixa.html', label: 'Caixa', ico: ICO.caixa },
    { id: 'ranking', href: 'ranking.html', label: 'Ranking', ico: ICO.ranking },
    { id: 'perfil', href: 'ranking.html#perfil', label: 'Perfil', ico: ICO.perfil }
  ];
  function navHTML(current, cls, withIcons) {
    return NAV.map(function (n) {
      var cur = n.id === current ? ' aria-current="page"' : '';
      return '<a href="' + n.href + '"' + cur + '>' + (withIcons ? n.ico : '') + '<span>' + n.label + '</span></a>';
    }).join('');
  }
  function mountNav(current) {
    var tb = document.querySelector('.tabbar ul');
    if (tb) tb.innerHTML = NAV.map(function (n) {
      var cur = n.id === current ? ' aria-current="page"' : '';
      return '<li><a href="' + n.href + '"' + cur + '>' + n.ico + '<span>' + n.label + '</span></a></li>';
    }).join('');
    var tn = document.querySelector('.topnav');
    if (tn) tn.innerHTML = navHTML(current, '', true);
    var s = document.querySelector('.chip-saldo b');
    if (s) s.textContent = brl(WALLET.available);
  }

  /* ------------------------------------------------------------------
     Toasts (§6.17): 2,5 s, voz neutra
     ------------------------------------------------------------------ */
  function toast(text, cls) {
    var box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'toast' + (cls ? ' ' + cls : '');
    t.textContent = text;
    box.appendChild(t);
    setTimeout(function () { t.classList.add('exit'); setTimeout(function () { t.remove(); }, 220); }, 2500);
  }

  /* ------------------------------------------------------------------
     Modal (§6.20): abre/cierra, Esc, clic en el scrim, foco
     ------------------------------------------------------------------ */
  function modal(id) {
    var m = $(id); if (!m) return null;
    var opener = null;
    function open() { opener = document.activeElement; m.hidden = false; var f = m.querySelector('select, input, button:not([data-close])'); if (f) f.focus(); }
    function close() { m.hidden = true; if (opener && opener.focus) opener.focus(); }
    m.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
    var sc = m.querySelector('.scrim'); if (sc) sc.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !m.hidden) close(); });
    return { open: open, close: close, el: m };
  }

  /* ------------------------------------------------------------------
     Segmentados: un botón presionado por grupo; devuelve el valor
     ------------------------------------------------------------------ */
  function segment(el, onChange) {
    if (!el) return;
    el.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        el.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        if (onChange) onChange(b.dataset.v, b);
      });
    });
  }
  function segValue(el) { var b = el && el.querySelector('button[aria-pressed="true"]'); return b ? b.dataset.v : null; }

  /* ------------------------------------------------------------------
     Pestañas de página (data-tab → data-pane)
     ------------------------------------------------------------------ */
  function tabs(seg, onChange) {
    segment(seg, function (v) { show(v); if (onChange) onChange(v); });
    function show(v) {
      document.querySelectorAll('[data-pane]').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === v); });
    }
    var init = segValue(seg); if (init) show(init);
    return show;
  }

  /* ------------------------------------------------------------------
     Copiar al portapapeles con feedback neutro
     ------------------------------------------------------------------ */
  function copy(text, okText) {
    function done() { toast(okText || 'Copiado.', 'toast-ok'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else done();
  }

  /* ------------------------------------------------------------------
     QR de demostración: matriz 29×29 con patrones de posición y relleno
     determinista a partir del payload (NO es un QR válido: en producción
     el PSP devuelve la imagen o el payload EMV y se usa una librería).
     ------------------------------------------------------------------ */
  function qrSVG(payload, size) {
    var N = 29, h = 2166136261;
    for (var i = 0; i < payload.length; i++) { h ^= payload.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    function rnd() { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h & 0xffff) / 0xffff; }
    var m = [];
    for (var y = 0; y < N; y++) { m.push([]); for (var x = 0; x < N; x++) m[y].push(rnd() < .48 ? 1 : 0); }
    function finder(ox, oy) {
      for (var dy = -1; dy <= 7; dy++) for (var dx = -1; dx <= 7; dx++) {
        var yy = oy + dy, xx = ox + dx; if (yy < 0 || xx < 0 || yy >= N || xx >= N) continue;
        var on = (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6) && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
        m[yy][xx] = on ? 1 : 0;
      }
    }
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
    for (var t = 8; t < N - 8; t++) { m[6][t] = t % 2 === 0 ? 1 : 0; m[t][6] = t % 2 === 0 ? 1 : 0; }
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + N + ' ' + N + '" width="' + (size || 176) + '" height="' + (size || 176) + '" role="img" aria-label="QR Pix de demonstração">';
    for (var y2 = 0; y2 < N; y2++) for (var x2 = 0; x2 < N; x2++) if (m[y2][x2]) s += '<rect x="' + x2 + '" y="' + y2 + '" width="1" height="1" fill="var(--ink-black, #1C1A17)"/>';
    return s + '</svg>';
  }
  function pixPayload(amount) {
    var a = Number(amount).toFixed(2);
    return '00020126580014br.gov.bcb.pix0136a1b2c3d4-0000-4e5f-8a9b-belezatruco015204000053039865406' + a + '5802BR5913BELEZA TRUCO6009SAO PAULO62070503***6304' + ('0000' + Math.floor(Math.random() * 65535).toString(16).toUpperCase()).slice(-4);
  }

  /* ------------------------------------------------------------------
     Mesas: filtro y fila
     ------------------------------------------------------------------ */
  function tableChip(t) {
    return esc(t.variant) + ' · ' + esc(t.mode) + ' · <b>' + brl(t.value) + '</b> · taxa ' + pct(t.fee);
  }
  function seatsHTML(t) {
    return '<div class="seats" aria-label="' + t.seats.filter(Boolean).length + ' de ' + t.seats.length + ' lugares">' + t.seats.map(function (s, i) {
      var team = t.mode === '2x2' ? (i % 2 === 0 ? 'us' : '') : (i === 0 ? 'us' : '');
      return s ? '<span class="seat-mini ' + team + '">' + esc(s) + '</span>' : '<span class="seat-mini empty"></span>';
    }).join('') + '</div>';
  }
  function tableRow(t) {
    var n = t.seats.filter(Boolean).length, full = n === t.seats.length;
    var l2 = n + '/' + t.seats.length + ' · ' + (full ? 'Em jogo' : 'Aguardando') + ' · tempo ' + t.timer + ' s · ' + (t.series > 1 ? 'melhor de ' + t.series : 'partida única') + ' · #' + t.id;
    var btn = full ? '<button class="btn btn-ghost-brass" type="button" aria-label="Assistir mesa ' + t.id + '">Assistir</button>'
                   : '<button class="btn btn-ghost-ok" type="button" data-join="' + t.id + '" aria-label="Entrar na mesa ' + t.id + '">Entrar</button>';
    return '<li class="row' + (full ? ' full' : '') + '">' + seatsHTML(t) + '<div class="main"><span class="l1">' + tableChip(t) + '</span><span class="l2">' + l2 + '</span></div>' + btn + '</li>';
  }

  window.APP = {
    brl: brl, pct: pct, num: num, esc: esc, $: $,
    ME: ME, WALLET: WALLET, ONLINE: ONLINE, TABLES: TABLES, HISTORY: HISTORY, RANKING: RANKING, REWARDS: REWARDS, ICO: ICO,
    mountNav: mountNav, toast: toast, modal: modal, segment: segment, segValue: segValue, tabs: tabs, copy: copy,
    qrSVG: qrSVG, pixPayload: pixPayload, tableRow: tableRow, tableChip: tableChip, seatsHTML: seatsHTML
  };
})();
