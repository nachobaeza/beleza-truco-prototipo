/* =====================================================================
   Beleza Truco · design-system.js
   Arma la página del sistema de diseño con los cimientos (tokens.css,
   cards.js). Sin módulos: se carga como <script src>. Todo el texto de
   interfaz va en pt-BR (DESIGN §10); los comentarios, en español.
   ===================================================================== */
(function () {
  'use strict';
  var BT = window.BT;
  var SYM = { ouros: '♦', espadas: '♠', copas: '♥', paus: '♣' };
  var SUIT_PT = { ouros: 'ouros', espadas: 'espadas', copas: 'copas', paus: 'paus' };

  function $(id) { return document.getElementById(id); }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  /* Carta envuelta en <span class="card …"> para sombras/estados por contexto */
  function card(o, cls, style) {
    return '<span class="card ' + (cls || '') + '"' + (style ? ' style="' + style + '"' : '') + '>' + BT.cardSVG(o) + '</span>';
  }
  function back(w, cls, style) { return card({ back: true, w: w }, cls, style); }

  /* Íconos de línea (sin emoji; trazo 1,5 px, latón/tinta) */
  var ICO = {
    exit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    wifiOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9a16 16 0 0 1 18 0"/><path d="M6.5 12.5a11 11 0 0 1 11 0"/><path d="M10 16a5 5 0 0 1 4 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/><path d="M3 3l18 18" stroke="#D9414E"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M5 12l5 5 9-10"/></svg>',
    seat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    wink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 10h2M14 10h2"/><path d="M8 15c1.5 1.5 6.5 1.5 8 0"/></svg>',
    brow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M7 8l3-1M14 7l3 1"/><circle cx="9" cy="11" r=".8" fill="currentColor"/><circle cx="15" cy="11" r=".8" fill="currentColor"/><path d="M9 16h6"/></svg>',
    cheek: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/><path d="M9 15h5"/><circle cx="16.5" cy="14" r="2"/></svg>',
    tongue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/><path d="M8 14h8"/><path d="M11 14v3a1.5 1.5 0 0 0 3 0v-3"/></svg>'
  };
  /* Emotes propios (6): trazo, sin color de marca ajeno */
  var EMOTES = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 14c1.5 2 6.5 2 8 0"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 15c1.5-2 6.5-2 8 0"/><path d="M8 9l2 1M16 9l-2 1"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 13h8"/><path d="M7 9h4M13 9h4"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="15" r="2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.4 6 .8-4.3 4.2 1 6-5.3-2.9L6.7 19.4l1-6L3.4 9.2l6-.8z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11v8M7 11l4-7a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2l-1.5 6a2 2 0 0 1-2 1.5H7"/></svg>'
  ];

  /* ------------------------------------------------------------------
     Helpers de componentes (se reutilizan en §6, §7 y §8)
     ------------------------------------------------------------------ */
  function stampSVG(text, color, small) {
    /* Sello con borde irregular: un path (no un rectángulo). Ancho según el texto. */
    var fs = small ? 40 : 56;
    var w = Math.round(text.length * fs * 0.52) + 36, hh = Math.round(fs * 1.05) + 16;
    var j = function (n) { return (Math.sin(n * 12.9898) * 43758.5453) % 1 * 3; };
    var p = 'M6 ' + (8 + j(1)) + ' L' + (w / 3) + ' ' + (4 + j(2)) + ' L' + (w * 2 / 3) + ' ' + (7 + j(3)) + ' L' + (w - 5) + ' ' + (5 + j(4)) +
      ' L' + (w - 3) + ' ' + (hh / 2 + j(5)) + ' L' + (w - 6) + ' ' + (hh - 5 + j(6)) + ' L' + (w * 2 / 3) + ' ' + (hh - 3 + j(7)) + ' L' + (w / 3) + ' ' + (hh - 7 + j(8)) +
      ' L4 ' + (hh - 4 + j(9)) + ' L' + (7 + j(10)) + ' ' + (hh / 2) + ' Z';
    return '<span class="stamp-svg' + (small ? ' small' : '') + '" style="color:' + color + '"><svg width="' + w + '" height="' + hh + '" viewBox="0 0 ' + w + ' ' + hh + '">' +
      '<path class="plate" d="' + p + '"/>' +
      '<text x="' + (w / 2) + '" y="' + (hh / 2 + fs * 0.34) + '" text-anchor="middle">' + esc(text) + '</text></svg></span>';
  }

  function placar(o) {
    o = o || {};
    var us = o.us == null ? 7 : o.us, them = o.them == null ? 9 : o.them, vale = o.vale == null ? 1 : o.vale;
    var dots = o.dots || ['', '', ''];
    var dotsHtml = function (team) { return '<div class="dots">' + dots.map(function (d) { return '<i class="' + (d === 'tie' ? 'tie' : d === team ? team : '') + '"></i>'; }).join('') + '</div>'; };
    var manilha = o.manilha == null ? '7' : o.manilha;
    var have = o.have || ['paus'];
    var center;
    if (o.special) {
      center = '<span class="special">' + esc(o.special) + '</span><div class="vale"><span class="lbl">Vale</span><span class="v num">' + vale + '</span></div>';
    } else {
      center = '<div class="vale' + (o.pending ? ' pending' : '') + (o.pulse ? ' pulse' : '') + '"><span class="lbl">Vale</span><span class="v num">' + (o.pending ? '1 → 3' : vale) + '</span></div>';
    }
    var chip;
    if (o.mineiro) {
      chip = '<span class="chip chip-manilha">Manilhas fixas <span class="suits"><b class="have">4♣</b><b class="red have">7♥</b><b class="have">A♠</b><b class="red have">7♦</b></span></span>';
    } else {
      chip = '<span class="chip chip-manilha">Manilha <b>' + manilha + '</b> <span class="suits">' + ['paus', 'copas', 'espadas', 'ouros'].map(function (s) { return '<b class="' + (have.indexOf(s) >= 0 ? 'have ' : '') + (s === 'copas' || s === 'ouros' ? 'red' : '') + '">' + SYM[s] + '</b>'; }).join('') + '</span></span>';
    }
    if (o.one) {
      return '<div class="placar one' + (o.cls ? ' ' + o.cls : '') + '">' +
        '<div class="side us"><span class="ava"></span><div class="col"><span class="lbl">Você</span><span class="pts num">' + us + '</span>' + dotsHtml('us') + '</div></div>' +
        '<div class="center">' + center + chip + '</div>' +
        '<div class="side them"><div class="col"><span class="lbl">Ele</span><span class="pts num">' + them + '</span>' + dotsHtml('them') + '</div><span class="ava"></span></div></div>';
    }
    return '<div class="placar' + (o.cls ? ' ' + o.cls : '') + '">' +
      '<div class="side us"><span class="lbl">Nós</span><span class="pts num">' + us + '</span>' + dotsHtml('us') + '</div>' +
      '<div class="center">' + center + chip + '</div>' +
      '<div class="side them"><span class="lbl">Eles</span><span class="pts num">' + them + '</span>' + dotsHtml('them') + '</div></div>';
  }

  function timerRing(frac, me) {
    var r = me ? 30 : 26, c = 2 * Math.PI * r, size = me ? 64 : 56;
    return '<svg class="timer" viewBox="0 0 ' + size + ' ' + size + '"><circle class="track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '"/>' +
      '<circle class="prog" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - frac)).toFixed(1) + '"/></svg>';
  }

  function avatar(o) {
    o = o || {};
    var cls = 'avatar ' + (o.team || 'us') + (o.me ? ' me' : '') + (o.active ? ' active' : '') + (o.last5 ? ' last5' : '') + (o.side === 'left' ? ' left' : '');
    var s = '<div class="' + cls + '"><div class="ring">' + timerRing(o.frac == null ? 1 : o.frac, !!o.me) +
      '<div class="face">' + (o.icon ? o.icon : esc(o.initials || 'VC')) + '</div>';
    if (o.timer != null) s += '<span class="badge-timer num">' + o.timer + '</span>';
    if (o.mao) s += '<span class="badge-mao">mão</span>';
    if (o.bubble) s += '<span class="bubble">' + esc(o.bubble) + '</span>';
    if (o.chat) s += '<span class="bubble chat">' + esc(o.chat) + '</span>';
    if (o.shout) s += '<span class="bubble shout">' + esc(o.shout) + '</span>';
    if (o.offline) s += '<span class="offline">' + ICO.wifiOff + '</span>';
    if (o.count) s += '<span class="counter">' + back(22) + back(22) + back(22) + '</span>';
    s += '</div><span class="pill pill-name">' + esc(o.name || 'Você') + '</span>';
    if (o.recon) s += '<span class="recon">Reconectando… <span class="num">' + o.recon + ' s</span></span>';
    return s + '</div>';
  }

  function botonera(cfg, o) {
    o = o || {};
    var map = {
      turno:  ['<button class="btn btn-ghost-run">Correr</button>', '<button class="btn btn-ghost-brass">Jogar coberta</button>', '<button class="btn btn-truco">' + (o.call || 'Truco!') + '</button>'],
      turno1: ['<button class="btn btn-ghost-run">Correr</button>', '<span class="slot-empty"></span>', '<button class="btn btn-truco">Truco!</button>'],
      resposta: ['<button class="btn btn-ghost-run">Correr</button>', '<button class="btn btn-ghost-ok">Aceitar</button>', '<button class="btn btn-truco">' + (o.call || 'Seis!') + '</button>'],
      onze:   ['<button class="btn btn-ghost-run btn-stack">Correr <span class="key" style="color:var(--run-text)">eles +1</span></button>', '<span class="slot-empty"></span>', '<button class="btn btn-fill-ok btn-stack">Jogar <span class="key" style="color:var(--ok)">vale 3</span></button>'],
      doze:   ['<button class="btn btn-ghost-run">Correr</button>', '<button class="btn btn-ghost-ok">Aceitar</button>', '<span class="slot-empty"></span>'],
      ferro:  ['<button class="btn btn-ghost-run">Correr</button>', '<span class="slot-empty"></span>', '<span class="slot-empty"></span>'],
      desktop: ['<button class="btn btn-ghost-run">Correr <span class="key">C</span></button>', '<button class="btn btn-ghost-brass">Coberta</button>', '<button class="btn btn-truco">Truco! <span class="key" style="color:var(--lamp-edge)">T</span></button>']
    };
    var s = '<div class="botonera' + (o.dimmed ? ' dimmed' : '') + '">' + map[cfg].join('');
    if (o.dimmed) s += '<span class="vez">Vez de ' + esc(o.who || 'Rival 1') + '</span>';
    if (o.waiting) s += '<span class="waiting-bar">Aguardando resposta de ' + esc(o.who || 'Rival 1') + '…</span>';
    return s + '</div>';
  }

  function banco(o) {
    o = o || {};
    var vazas = o.vazas || [];
    var s = '<div class="banco' + (o.them ? ' them' : '') + '">';
    vazas.forEach(function (v) {
      s += '<div class="vaza">' + back(28, 'on-table') + back(28, 'on-table') + card({ rank: v.rank, suit: v.suit, w: 28, manilha: !!v.manilha, zap: !!v.zap }, 'on-table') + '<i class="dot ' + (v.dot || '') + '"></i></div>';
    });
    return s + '</div>';
  }

  function viraGroup(o) {
    o = o || {};
    return '<span class="vira-group">' +
      '<span class="deck">' + back(48, 'on-table') + back(48, 'on-table') + back(48, 'on-table') + back(48, 'on-table') + '</span>' +
      (o.none ? '' : '<span class="vira">' + card({ rank: o.rank || '7', suit: o.suit || 'copas', w: 48 }, 'on-table') + '</span><span class="chip chip-vira vira-tab">Vira</span>' + (o.line ? '<span class="vira-line' + (o.draw ? ' draw' : '') + '"></span>' : '')) +
      '</span>';
  }

  function hand(cards, cls) {
    return '<div class="hand ' + (cls || '') + '">' + cards.map(function (c, i) { return card(c, 'in-hand' + (c.touched ? ' touched' : '')); }).join('') + '</div>';
  }

  function headerMesa() {
    return '<div class="mesa-header"><span class="icon-btn" aria-label="Sair">' + ICO.exit + '</span><span class="chip">Paulista · 2x2 · <b>R$ 2,00</b> · taxa 7 %</span><span class="icon-btn" aria-label="Ajustes">' + ICO.gear + '</span></div>';
  }

  function chatPop(o) {
    o = o || {};
    var frases = ['Mandou bem!', 'Casinha de caboclo…', 'A primeira vai à missa', 'Branca pra nós', 'Que sorte, hein', 'Vem que vem', 'Boa, parceiro'];
    var s = '<div class="surface-2 chat-pop"><h5>Frases</h5><div class="phrases">' + frases.map(function (f) { return '<span class="phrase">' + f + '</span>'; }).join('') + '</div>' +
      '<h5>Emotes</h5><div class="emotes">' + EMOTES.map(function (e) { return '<span class="emote" style="color:var(--gold)">' + e + '</span>'; }).join('') + '</div>';
    if (o.sinais !== false) {
      var sig = [['Piscar', ICO.wink, 'zap'], ['Sobrancelha', ICO.brow, 'copas'], ['Bochecha', ICO.cheek, 'espadilha'], ['Língua', ICO.tongue, 'pica-fumo']];
      s += '<h5>Sinais · só o parceiro sabe o que significam</h5><div class="sinais">' + sig.map(function (g) { return '<span class="sinal">' + g[1] + g[0] + (o.meaning ? '<span class="meaning">= ' + g[2] + '</span>' : '') + '</span>'; }).join('') + '</div>';
      if (o.cooldown) s += '<span class="cooldown">Aguarde 3 s para sinalizar de novo</span>';
    }
    return s + '</div>';
  }

  function resultCard(win, o) {
    o = o || {};
    var title = win ? '<span class="title-v">Vitória</span>' : '<span class="title-d">Derrota</span>';
    return '<div class="result">' + title +
      '<div class="score"><span class="us">' + (win ? 12 : o.us == null ? 9 : o.us) + '</span><span class="x">×</span><span class="them">' + (win ? (o.them == null ? 9 : o.them) : 12) + '</span></div>' +
      '<div class="rows"><div><span>Mãos</span><b>' + (win ? '7 ganhas · 5 perdidas' : '5 ganhas · 7 perdidas') + '</b></div><div><span>Trucos aceitos</span><b>' + (win ? 3 : 2) + '</b></div>' +
      (o.abandon ? '<div><span>Motivo</span><b>' + esc(o.abandon) + '</b></div>' : '') +
      '<div><span>Valor líquido (taxa 7 %)</span><b class="net">' + (win ? 'R$ 3,72' : '− R$ 2,00') + '</b></div></div>' +
      (win ? '<span class="quote">Mandou bem!</span>' : '<span class="quote">No truco, a sorte muda a cada mão.</span>') +
      '<div class="actions"><button class="btn btn-ghost-brass">Voltar</button><button class="btn ' + (win ? 'btn-fill-ok' : 'btn-ghost-ok') + '">Jogar de novo</button></div>' +
      '<span class="link">Revanche</span></div>';
  }

  function settingsModal() {
    var sw = function (on) { return '<span class="switch' + (on ? ' on' : '') + '"></span>'; };
    var seg = function (opts, on) { return '<span class="seg">' + opts.map(function (x, i) { return '<span class="' + (i === on ? 'on' : '') + '">' + x + '</span>'; }).join('') + '</span>'; };
    return '<div class="settings"><h4>Ajustes</h4>' +
      '<div class="row"><span>Voz</span>' + seg(['1', '2', '3', '4'], 0) + '</div>' +
      '<div class="row"><span>Música</span>' + sw(false) + '</div>' +
      '<div class="row"><span>Ambiente</span>' + sw(false) + '</div>' +
      '<div class="sep"></div>' +
      '<div class="row"><span>Velocidade das animações</span>' + seg(['Lenta', 'Normal', 'Rápida'], 1) + '</div>' +
      '<div class="row"><span>Animações</span>' + sw(true) + '</div>' +
      '<div class="row"><span>Háptico</span>' + sw(true) + '</div>' +
      '<div class="sep"></div>' +
      '<div class="row"><span>Tamanho da fonte</span>' + seg(['1', '1,15', '1,3'], 0) + '</div>' +
      '<div class="row"><span>Tamanho dos botões</span>' + seg(['1', '1,15'], 0) + '</div>' +
      '<div class="row"><span>Régua de força</span>' + sw(false) + '</div>' +
      '<div class="row"><span>Alto contraste</span>' + sw(false) + '</div>' +
      '</div>';
  }

  /* expone los helpers para mesa.html y para las secciones de abajo */
  window.DS = { card: card, back: back, stampSVG: stampSVG, placar: placar, avatar: avatar, botonera: botonera, banco: banco, viraGroup: viraGroup, hand: hand, headerMesa: headerMesa, chatPop: chatPop, resultCard: resultCard, settingsModal: settingsModal, ICO: ICO };

  /* ==================================================================
     0 · Dirección: demo de la luz
     ================================================================== */
  (function lightDemo() {
    var box = $('light-demo'), seg = $('light-seg'), val = $('light-val'), note = $('light-note');
    $('light-stamp').innerHTML = stampSVG('Truco!', 'var(--lamp)');
    var MAP = { '': ['.16', 'repouso'], 'is-truco-pending': ['.26', 'pedido pendente · sobe 300 ms, desce 600 ms'], 'is-onze': ['.24', 'mão de onze · 250 ms, fica'], 'is-ferro': ['.08', 'mão de ferro às escuras · 500 ms'], 'is-victory': ['.30', 'vitória · 400 ms, fica'], 'is-defeat': ['.10', 'derrota · 400 ms'], 'is-manilha-played': ['.16 → .22 → .16', 'manilha jogada · a lâmpada treme 300 ms'], 'is-offline': ['.16 → .06 → .16', 'conexão perdida · pisca uma vez'] };
    var STATES = ['is-truco-pending', 'is-onze', 'is-ferro', 'is-victory', 'is-defeat'];
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var st = b.getAttribute('data-state');
      if (b.getAttribute('data-once')) {
        box.classList.remove(st); void box.offsetWidth; box.classList.add(st);
        setTimeout(function () { box.classList.remove(st); }, 700);
      } else {
        STATES.forEach(function (c) { box.classList.remove(c); });
        if (st) box.classList.add(st);
        Array.prototype.forEach.call(seg.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
      }
      val.textContent = MAP[st][0]; note.textContent = MAP[st][1];
    });
  })();

  /* ==================================================================
     1 · Color: fichas
     ================================================================== */
  (function swatches() {
    var groups = [
      ['§1.1 Ambiente e superfícies', [
        ['--bg-bar', '#14100C', 'Fundo de toda a app fora do pano. Quase preto quente, sempre com grão.'],
        ['--felt-hi', '#1E5A44', 'Pano, centro iluminado. Tem que se ler verde a 40 % de brilho.'],
        ['--felt-lo', '#0D3025', 'Pano, borda em sombra. Vinheta radial com centro em 50 % 35 %.'],
        ['--felt-edge', '#082019', 'Fio do pano, 2 px + sombra interna.'],
        ['--rail', 'linear-gradient(180deg,#2A2118,#3B2E20)', 'Borda "de móvel" da mesa. Sem veio de madeira: cor e luz.', 'grad'],
        ['--brass-line', '#8C7342', 'Filete de latão dentro do rail; brilho #D9BE7A só no arco superior.', 'line'],
        ['--surface-1', '#1E1813', 'Placar, botoeira, chips, header.'],
        ['--surface-2', '#27201A', 'Popovers, tooltips, cartão de resultado. Com blur 16 px.'],
        ['--border-brass', 'rgba(233,196,106,.14)', 'Borda de 1 px das superfícies.', 'line'],
        ['--scrim', 'rgba(10,7,5,.62)', 'Sobre a mesa no resultado e na reconexão. Nunca tapa a mão própria.'],
        ['--felt-hi-contrast', '#256A50', 'Alto contraste: substitui --felt-hi e apaga o grão.']
      ]],
      ['§1.2 Texto', [
        ['--ink-hi', '#F3E9D6', 'Texto principal (papel de cardápio). 14,2:1', 'text', 'on-surface'],
        ['--ink-mid', '#B9AB93', 'Secundário: etiquetas, nomes fora de turno. 8,1:1', 'text', 'on-surface'],
        ['--ink-lo', '#7E7462', 'Terciário, desabilitado, pé legal. 4,0:1 (≥ 12 px)', 'text', 'on-surface'],
        ['--ink-on-gold', '#2A1E0C', 'Texto sobre --lamp (botão TRUCO). 9,6:1', 'text', 'on-lamp']
      ]],
      ['§1.3 Dourado: a luz (nunca área grande)', [
        ['--gold', '#E9C46A', 'Nomes da nossa dupla, pontos de NÓS, VALE, títulos, anel, tinta da manilha.', 'text', 'on-surface'],
        ['--gold-hot', '#FFE3A1', 'Núcleo quente: highlights de 1–2 px, moldura do zap, foco.', 'text', 'on-surface'],
        ['--gold-deep', '#B8903F', 'Sombra do dourado: fim dos degradês, dourado sobre creme.', 'text', 'on-surface'],
        ['--brass', '#8C7342', 'Latão apagado: filetes, bordas, aba VIRA, inativos, pé legal.', 'text', 'on-surface'],
        ['--brass-dim', '#5C4C2C', 'Latão em sombra: separadores, sombra dura dos selos.', 'text', 'on-surface'],
        ['--gold-gradient', '135° hot → gold → deep', 'O único "dourado metálico": VITÓRIA.', 'grad']
      ]],
      ['§1.4 Ação e estado', [
        ['--lamp', '#FFB13B', 'TRUCO! SEIS! NOVE! DOZE! e o selo do grito. Cota: só aí.'],
        ['--lamp-hot', '#FFD98A', 'Degradê lamp-hot → lamp em hover/press.'],
        ['--lamp-edge', '#C97F12', 'Borda do botão TRUCO.', 'line'],
        ['--run', '#D9414E', 'CORRER / NÃO QUERO, últimos 5 s, TÔ FORA!, derrota. Botão fantasma.'],
        ['--run-text', '#FF6B75', 'Perigo em texto e toasts. 5,6:1', 'text', 'on-surface'],
        ['--ok', '#6FD39A', 'ACEITAR / JOGAR, halo da carta ganhadora, DESCE!, "+3".'],
        ['--ok-deep', '#2E8A5C', 'Fundo da pílula "Nós levamos a rodada".'],
        ['--tie', '#F6D35B', 'Empate: ponto âmbar, filete das duas cartas, EMPACHOU!'],
        ['--chip', 'rgba(20,16,12,.72) + borda --brass', 'Chips de estado. Valor em --gold.'],
        ['--team-us', '= --gold', 'NÓS: anel, pontos, ponto do banco. Nós estamos sob a lâmpada.', 'text', 'on-surface'],
        ['--team-them', '#5AA9D6', 'ELES: a única cor fria. Nunca em botões nem fundos.', 'text', 'on-surface'],
        ['--team-them-deep', '#2B5F7A', 'Fundo da pílula "Eles levaram a rodada".'],
        ['--timer', 'gold → run (5 s)', 'Anel do avatar ativo; transição de cor 300 ms.', 'grad-timer'],
        ['--focus', 'gold-hot 2 px', 'Foco de teclado / acessibilidade, offset 2 px.', 'line']
      ]],
      ['§1.5 Cartas', [
        ['--card-face', '#F4EAD5', 'Cara de carta comum. Papel creme.'],
        ['--card-face-2', '#EADFC6', 'Vinheta de 2 % para as bordas da cara.'],
        ['--card-edge', 'rgba(28,26,23,.30)', 'Borda de 1 px da carta.', 'line', 'on-card'],
        ['--ink-black', '#1C1A17', 'Paus ♣ e espadas ♠, índices. Só dentro de cartas.', 'text', 'on-card'],
        ['--ink-red', '#B8302C', 'Copas ♥ e ouros ♦. Vermelho tijolo. Só dentro de cartas.', 'text', 'on-card'],
        ['--ink-brass', '#A8863F', 'Segunda tinta dos emblemas Q/J/K.', 'text', 'on-card'],
        ['--manilha-face', '#1C1A17', 'Cara da manilha (carta invertida): negro quente de latão.'],
        ['--manilha-ink', '= --gold', 'Índice, pip, emblema e régua da manilha.', 'text', 'on-manilha'],
        ['--manilha-ring', '= --card-face 1,5 px', 'Filete exterior creme da manilha.', 'line', 'on-manilha'],
        ['--zap-frame', '= --gold-hot 1,5 px', 'Moldura interior acesa só no zap.', 'line', 'on-manilha'],
        ['--back-green', '#0E3B2C', 'Dorso: fundo.'],
        ['--back-pattern', '#155241', 'Dorso: trama de pips, contraste baixo.'],
        ['--back-gold', '#C9A85C', 'Dorso: medalhão central com monograma.'],
        ['--back-frame', '#F4EAD5', 'Dorso: moldura creme de 6 % com filete --brass.']
      ]]
    ];
    var out = '';
    groups.forEach(function (g) {
      out += '<div class="ds-sub">' + g[0] + '</div><div class="sw-grid">';
      g[1].forEach(function (t) {
        var name = t[0], hex = t[1], role = t[2], kind = t[3] || 'fill', bgc = t[4] || '';
        var colorBox;
        var v = name.indexOf('=') === 0 ? name : 'var(' + name + ')';
        if (name === '--rail') colorBox = '<div class="color" style="background:var(--rail)"></div>';
        else if (name === '--gold-gradient') colorBox = '<div class="color" style="background:var(--gold-gradient)"></div>';
        else if (name === '--chip') colorBox = '<div class="color on-felt"><span class="chip">Mineiro</span></div>';
        else if (name === '--timer') colorBox = '<div class="color" style="background:linear-gradient(90deg,var(--gold) 70%,var(--run))"></div>';
        else if (name === '--scrim') colorBox = '<div class="color on-felt"><div style="position:absolute;inset:0;background:var(--scrim)"></div></div>';
        else if (kind === 'text') colorBox = '<div class="color ' + (bgc === 'on-lamp' ? '' : bgc) + '" style="' + (bgc === 'on-lamp' ? 'background:var(--lamp);display:flex;align-items:center;justify-content:center' : '') + '"><span class="sample-text" style="color:var(' + name + ')">Aa 12</span></div>';
        else if (kind === 'line') colorBox = '<div class="color ' + (bgc || 'on-surface') + '"><span class="sample-line" style="background:var(' + name + ');height:' + (name === '--focus' ? '2px' : '1.5px') + '"></span></div>';
        else colorBox = '<div class="color" style="background:var(' + name + ')"></div>';
        out += '<div class="sw">' + colorBox + '<div class="info"><div class="name">' + name + '</div><div class="hex">' + esc(hex) + '</div><div class="role">' + role + '</div></div></div>';
      });
      out += '</div>';
    });
    $('swatches').innerHTML = out;
    var line = ['--bg-bar', '--felt-hi', '--felt-lo', '--surface-1', '--ink-hi', '--gold', '--brass', '--lamp', '--run', '--ok', '--tie', '--team-them', '--card-face', '--ink-black', '--ink-red', '--back-green'];
    $('palette-line').innerHTML = line.map(function (t) { return '<i style="background:var(' + t + ')" title="' + t + '"></i>'; }).join('');
  })();

  /* ==================================================================
     2 · Luz y grano: glows
     ================================================================== */
  (function glows() {
    var out = '';
    out += '<figure>' + card({ rank: '3', suit: 'espadas', w: 56 }, 'on-table winner') + '<figcaption>--glow-win<code>carta ganhadora · 150 ms</code></figcaption></figure>';
    out += '<figure>' + card({ rank: '2', suit: 'copas', w: 56 }, 'on-table winner-them') + '<figcaption>--glow-win-them<code>ganhadora de ELES</code></figcaption></figure>';
    out += '<figure><span style="display:inline-flex;gap:8px">' + card({ rank: 'A', suit: 'paus', w: 56 }, 'on-table tied') + card({ rank: 'A', suit: 'ouros', w: 56 }, 'on-table tied') + '</span><figcaption>--glow-tie<code>as duas empatadas · 1,2 s</code></figcaption></figure>';
    out += '<figure><span class="stamp-ring" id="glow-stamp">' + card({ rank: 'Q', suit: 'paus', w: 56, manilha: true, zap: true }, 'on-table') + '<span class="ring"></span></span><figcaption>--glow-stamp<code>anel .7 → 1.5, 400 ms (toque)</code></figcaption></figure>';
    out += '<figure><span class="ring-demo"></span><figcaption>--glow-timer-run<code>anel nos últimos 5 s</code></figcaption></figure>';
    out += '<figure><button class="btn btn-truco">Truco!</button><figcaption>botão TRUCO<code>a única sombra de cor</code></figcaption></figure>';
    out += '<figure><span id="glow-deal">' + card({ rank: '7', suit: 'ouros', w: 56, manilha: true }, 'on-table') + '</span><figcaption>--glow-manilha-deal<code>destello 0 → 40 % → 0 (toque)</code></figcaption></figure>';
    $('glow-row').innerHTML = out;
    $('glow-stamp').addEventListener('click', function () { var e = this; e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); });
    $('glow-deal').addEventListener('click', function () {
      var svg = this.querySelector('svg');
      svg.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.4) drop-shadow(0 0 8px rgba(255,227,161,.4))' }, { filter: 'brightness(1)' }], { duration: 300, easing: 'ease-in-out' });
    });
    $('tg-grain').addEventListener('click', function () {
      var on = !this.classList.contains('on'); this.classList.toggle('on', on);
      document.documentElement.style.setProperty('--grain-bar', on ? '.03' : '0');
      document.documentElement.style.setProperty('--grain-felt', on ? '.05' : '0');
      this.textContent = on ? 'Grão ligado na página' : 'Grão desligado na página';
    });
  })();

  /* ==================================================================
     3 · Tipografía: escala
     ================================================================== */
  (function typeScale() {
    var rows = [
      ['--t-legal', '10 / 400 / 1,3', 'O jogo pode ser viciante. Jogue com responsabilidade. 18+.', 'font:var(--t-legal);color:var(--ink-lo)'],
      ['--t-chip', '12 / 700 / 1 · .04em · caixa alta', 'Paulista · 2x2 · R$ 2,00 · taxa 7 %', 'font:var(--t-chip);letter-spacing:var(--t-chip-ls);text-transform:uppercase'],
      ['--t-label', '11 / 500 / 1 · .06em · caixa alta', 'Nós · Vale · Eles · Vez de Rival 1', 'font:var(--t-label);letter-spacing:var(--t-label-ls);text-transform:uppercase;color:var(--ink-mid)'],
      ['--t-body', '14 / 500 / 1,4', 'Tempo esgotado: o sistema jogou por você.', 'font:var(--t-body)'],
      ['--t-chicana', '14 / 600 / 1,4', 'No truco, a sorte muda a cada mão.', 'font:var(--t-chicana)'],
      ['--t-name', '13 / 800 / 1', 'Você · Rival 1 · Parceiro · Rival 2', 'font:var(--t-name)'],
      ['--t-button', '14 / 700 / 1 · .04em · caixa alta', 'Aceitar · Correr · Jogar coberta · Jogar', 'font:var(--t-button);letter-spacing:var(--t-button-ls);text-transform:uppercase'],
      ['--t-button-truco', '20 / Londrina 900 / 1 · .02em', 'Truco! · Seis! · Nove! · Doze!', 'font:var(--t-button-truco);letter-spacing:var(--t-button-truco-ls);text-transform:uppercase;color:var(--lamp)'],
      ['--t-pill', '14 / 700 / 1 · .02em', 'NÓS LEVAMOS A RODADA', 'font:var(--t-pill);letter-spacing:var(--t-pill-ls);text-transform:uppercase'],
      ['--t-timer', '12 / 800 / 1 · tabular', '18 · 05 · 1/3', 'font:var(--t-timer)'],
      ['--t-score', '32 / 800 / 1 · −.01em · tabular', '07 · 09 · 11 · 12', 'font:var(--t-score);letter-spacing:var(--t-score-ls);color:var(--gold)'],
      ['--t-value', '36 / 800 / 1 · −.01em · tabular (desktop 44)', '1 · 3 · 6 · 9 · 12', 'font:var(--t-value);letter-spacing:var(--t-value-ls);color:var(--gold)'],
      ['--t-banner', '32 / Londrina 900 / 1 · .01em', 'Ganhamos a mão · +3', 'font:var(--t-banner);letter-spacing:var(--t-banner-ls);text-transform:uppercase;color:var(--gold)'],
      ['--t-banner-big', '40 / Londrina 900 / 1', 'Mão de onze', 'font:var(--t-banner-big);letter-spacing:var(--t-banner-ls);text-transform:uppercase;color:var(--gold)'],
      ['--t-stamp', '56 / Londrina 900 / .9 (desktop 72)', 'Truco!', 'font:var(--t-stamp);letter-spacing:var(--t-stamp-ls);text-transform:uppercase;color:var(--lamp);text-shadow:var(--shadow-stamp)'],
      ['--t-victory', '72 / Londrina 900 / .9 (desktop 96)', 'Vitória', 'font:var(--t-victory);letter-spacing:var(--t-victory-ls);text-transform:uppercase;background:var(--gold-gradient);-webkit-background-clip:text;background-clip:text;color:transparent'],
      ['--t-card-index', '18 % da altura / 800 · −.02em', '7 · Q · 3 (27 px na mão, 15 na cruz, 7 no banco)', 'font:800 27px/1 var(--font-ui);letter-spacing:-.02em'],
      ['--t-card-figure', '46 % da altura / Fraunces 700', 'Q J K A (70 px na mão, 38 na cruz)', "font:700 46px/1 var(--font-figure);font-variation-settings:'SOFT' 0,'WONK' 0"]
    ];
    $('type-scale').innerHTML = rows.map(function (r) { return '<div class="row"><div class="k">' + r[0] + '<small>' + r[1] + '</small></div><div class="v" style="' + r[3] + '">' + esc(r[2]) + '</div></div>'; }).join('');
  })();

  /* ==================================================================
     4 · Espaciado, radios, sombras
     ================================================================== */
  (function spacing() {
    $('space-row').innerHTML = [['--s-1', 4], ['--s-2', 8], ['--s-3', 12], ['--s-4', 16], ['--s-6', 24], ['--s-8', 32], ['--s-12', 48], ['--margin-screen', 24], ['--margin-felt', 14], ['--gap-buttons', 8]].map(function (s) {
      return '<figure><span class="bar-s" style="width:' + s[1] + 'px"></span><figcaption>' + s[0] + ' · ' + s[1] + '</figcaption></figure>';
    }).join('');
    $('radius-row').innerHTML = [['--r-chip', '6px'], ['--r-panel', '8px'], ['--r-card-ui', '12px'], ['--r-modal', '16px'], ['--r-pill', '999px'], ['--r-card', '7 %'], ['pano', '72 / 60 (celular) · 96 / 80 (desktop)']].map(function (r) {
      var br = r[1].indexOf('px') > 0 ? r[1] : r[0] === '--r-card' ? '7%' : '18px 18px 14px 14px';
      return '<figure><span class="box" style="border-radius:' + br + '"></span><figcaption>' + r[0] + '<br>' + r[1] + '</figcaption></figure>';
    }).join('');
    $('shadow-row').innerHTML =
      '<figure>' + card({ rank: '7', suit: 'paus', w: 56 }, 'on-table') + '<figcaption>repouso na mesa<br>0 2px 4px .35</figcaption></figure>' +
      '<figure>' + card({ rank: '7', suit: 'paus', w: 56 }, 'in-hand') + '<figcaption>na mão<br>0 8px 20px .55</figcaption></figure>' +
      '<figure>' + card({ rank: '7', suit: 'paus', w: 56 }, 'on-table touched') + '<figcaption>levantada<br>0 12px 24px .5</figcaption></figure>' +
      '<figure>' + stampSVG('Desce!', 'var(--ok)', true) + '<figcaption>selo: sombra dura<br>2px 2px 0 --brass-dim · tilt −6°</figcaption></figure>' +
      '<figure><span class="surface-2" style="padding:12px 16px;font:var(--t-body)">superfície: borda + blur, sem sombra</span><figcaption>--surface-2<br>nenhuma sombra</figcaption></figure>';
    $('touch-row').innerHTML = [['--h-button', 52], ['--h-avatar-me', 56], ['--h-avatar', 48], ['--h-touch-min', 44], ['--h-chat', 40]].map(function (s) {
      return '<figure><span class="bar-s" style="width:' + s[1] + 'px;height:' + s[1] + 'px;border-radius:8px;opacity:.35"></span><figcaption>' + s[0] + ' · ' + s[1] + '</figcaption></figure>';
    }).join('');
  })();

  /* ==================================================================
     5 · Cartas
     ================================================================== */
  (function cards() {
    var rule = false;
    function c(o, cls) { o.rule = rule; return card(o, cls); }

    function render() {
      $('anatomy').innerHTML =
        '<div class="stage">' + c({ rank: '7', suit: 'paus', w: 200 }, 'in-hand') +
        '<span class="callout r" style="left:236px;top:40px">índice Gabarito 800 · 18 %</span>' +
        '<span class="callout r" style="left:236px;top:78px">pip chico · 9 %</span>' +
        '<span class="callout r" style="left:236px;top:160px">pip único · 38 % do largo</span>' +
        '<span class="callout r" style="left:236px;top:286px">régua de força · 1,5 %</span>' +
        '<span class="callout r" style="left:236px;top:308px">índice espelhado · 180° · 55 %</span>' +
        '<span class="callout r" style="left:236px;top:14px">raio 7 % · borda 1 px</span>' +
        '</div>' +
        '<ol><li><b>Proporção 0,68</b> (largura/altura): três cartas em leque cabem em 390 px.</li>' +
        '<li><b>Dois índices</b> Gabarito 800, 18 % da altura, tinta do naipe; o de baixo girado 180° a 55 %.</li>' +
        '<li><b>Pip único</b> centrado, 38 % da largura: a 56 px é a única coisa que se lê. Sem numeral fantasma.</li>' +
        '<li><b>Pips próprios</b>, "traço de carimbo": contorno levemente irregular, sem brilho, mesmo peso nos quatro.</li>' +
        '<li><b>Q J K A</b>: letra Fraunces 700 a 46 % + emblema geométrico a duas tintas (abanico · lança · coroa · pip com filete). O remate muda por naipe: círculos ♣, pontas ♠, arcos ♥, losangos ♦.</li>' +
        '<li><b>2 e 3</b>: pip único + um / dois pips pequenos em cima. Não há 8, 9 nem 10: nenhum índice tem dois caracteres.</li>' +
        '<li><b>Régua de força</b> (10 segmentos, 11 na manilha) apagada por padrão em mesas com dinheiro.</li></ol>';

      var deck = '';
      BT.SUITS.forEach(function (suit) {
        deck += '<div class="cap">' + SUIT_PT[suit] + ' ' + SYM[suit] + '</div><div class="row">';
        BT.RANKS.forEach(function (rank) { deck += c({ rank: rank, suit: suit, w: 104 }, 'in-hand'); });
        deck += '</div>';
      });
      $('deck-grid').innerHTML = deck;

      var m = '';
      m += '<figure>' + c({ rank: '7', suit: 'copas', w: 104 }, 'in-hand') + '<figcaption>vira 7♥ (carta comum)</figcaption></figure>';
      [['ouros', 1], ['espadas', 2], ['copas', 3], ['paus', 4]].forEach(function (s) {
        m += '<figure>' + c({ rank: 'Q', suit: s[0], w: 104, manilha: true, zap: s[0] === 'paus' }, 'in-hand') + '<figcaption>Q' + SYM[s[0]] + ' · ' + s[1] + (s[1] === 1 ? ' ponto' : ' pontos') + (s[0] === 'paus' ? ' · zap, moldura acesa' : s[0] === 'ouros' ? ' · pica-fumo' : s[0] === 'espadas' ? ' · espadilha' : ' · copas') + '</figcaption></figure>';
      });
      m += '<figure>' + c({ rank: 'Q', suit: 'paus', w: 104 }, 'in-hand') + '<figcaption>Q♣ comum, para comparar</figcaption></figure>';
      $('manilhas').innerHTML = m;

      $('mineiro').innerHTML = BT.MINEIRO_FIXED.map(function (f) {
        var nick = f.suit === 'paus' ? 'zap' : f.suit === 'copas' ? 'copas' : f.suit === 'espadas' ? 'espadilha' : 'pica-fumo';
        return '<figure>' + c({ rank: f.rank, suit: f.suit, w: 104, manilha: true, zap: f.suit === 'paus' }, 'in-hand') + '<figcaption>' + f.rank + SYM[f.suit] + ' · ' + nick + '</figcaption></figure>';
      }).join('') + '<figure><span class="chip">Manilhas fixas <b>4♣ 7♥ A♠ 7♦</b></span><figcaption>chip do placar em mineiro</figcaption></figure>';

      $('backs').innerHTML = [[104, 'mão 104'], [56, 'cruz / coberta 56'], [48, 'baralho / vira 48'], [28, 'banco 28'], [22, 'contador 22']].map(function (b) {
        return '<figure>' + card({ back: true, w: b[0] }, 'in-hand') + '<figcaption>' + b[1] + '</figcaption></figure>';
      }).join('');

      $('rule-on').innerHTML = ['4', '7', 'Q', 'K', '3'].map(function (r, i) {
        return '<figure>' + card({ rank: r, suit: BT.SUITS[i % 4], w: 104, rule: true }, 'in-hand') + '<figcaption>' + r + ' · ' + BT.STRENGTH[r] + '/10</figcaption></figure>';
      }).join('') + '<figure>' + card({ rank: 'Q', suit: 'paus', w: 104, rule: true, manilha: true, zap: true }, 'in-hand') + '<figcaption>manilha · 11/11</figcaption></figure>';

      function readingRow(w) {
        var out = '';
        ['4', '7', 'Q', 'J', 'K', 'A', '2', '3'].forEach(function (r, i) { out += c({ rank: r, suit: BT.SUITS[i % 4], w: w }, 'on-table'); });
        out += '<span style="width:12px"></span>';
        BT.SUITS.forEach(function (suit) { out += c({ rank: 'Q', suit: suit, w: w, manilha: true, zap: suit === 'paus' }, 'on-table'); });
        out += '<span style="width:12px"></span>' + back(w, 'on-table');
        return out;
      }
      $('read56').innerHTML = readingRow(56);
      $('read28').innerHTML = readingRow(28);
      var ob = '';
      [56, 28].forEach(function (w) {
        [{ rank: 'Q', suit: 'paus', manilha: true, zap: true }, { rank: 'Q', suit: 'ouros', manilha: true }, { rank: '3', suit: 'copas' }].forEach(function (o) {
          o.w = w;
          ob += '<span class="on-back">' + back(w, 'on-table') + '<span class="over">' + c(o, 'on-table') + '</span></span>';
        });
        ob += '<span style="width:24px"></span>';
      });
      $('read-back').innerHTML = ob;
    }
    $('tg-rule').addEventListener('change', function (e) { rule = e.target.checked; render(); });
    render();
  })();

  /* ==================================================================
     Ajustes globales de la página
     ================================================================== */
  $('tg-contrast').addEventListener('change', function (e) {
    if (e.target.checked) document.documentElement.setAttribute('data-contrast', 'high'); else document.documentElement.removeAttribute('data-contrast');
  });
  $('tg-motion').addEventListener('change', function (e) {
    if (e.target.checked) document.documentElement.setAttribute('data-motion', 'off'); else document.documentElement.removeAttribute('data-motion');
  });

  /* Navegación: resalta la sección visible */
  (function nav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('#nav a'));
    var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var i = secs.indexOf(en.target);
          links.forEach(function (a, k) { a.classList.toggle('on', k === i); });
          if (window.innerWidth < 1024) links[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  })();
})();

/* =====================================================================
   Parte 2 · §6 Componentes
   ===================================================================== */
(function () {
  'use strict';
  var BT = window.BT, DS = window.DS;
  var card = DS.card, back = DS.back, stampSVG = DS.stampSVG, placar = DS.placar, avatar = DS.avatar, botonera = DS.botonera, banco = DS.banco, viraGroup = DS.viraGroup, hand = DS.hand, ICO = DS.ICO;
  function $(id) { return document.getElementById(id); }
  function fig(html, cap) { return '<figure>' + html + '<figcaption>' + cap + '</figcaption></figure>'; }
  function comp(n, title, desc, body) { return '<div class="comp" id="c' + n + '"><h3><span class="n">' + (n < 10 ? '0' + n : n) + '</span>' + title + '</h3><p class="desc">' + desc + '</p>' + body + '</div>'; }
  DS.fig = fig;

  var out = '';

  /* 1 Carta */
  out += comp(1, 'Carta', 'Um <code>&lt;button class="card"&gt;</code> com rótulo acessível ("valete de paus (manilha)"). Nunca se pinta de cor para indicar estado: a manilha se marca no desenho, o turno no jogador.',
    '<div class="felt on-felt">' +
    fig(card({ rank: '7', suit: 'paus', w: 56 }, 'on-table'), 'rest') +
    fig(card({ rank: '7', suit: 'paus', w: 56 }, 'in-hand in-turn'), 'in-turn · +10 px') +
    fig(card({ rank: '7', suit: 'paus', w: 56 }, 'in-hand out-of-turn'), 'out-of-turn · .78') +
    fig(card({ rank: '7', suit: 'paus', w: 56 }, 'in-hand touched'), 'touched · 1,08 +12 px +4°') +
    fig(card({ rank: '7', suit: 'paus', w: 56 }, 'on-table played'), 'played · ±4°') +
    fig(back(56, 'on-table played'), 'coberta') +
    fig(card({ rank: 'Q', suit: 'copas', w: 56, manilha: true }, 'on-table'), 'is-manilha') +
    fig(card({ rank: 'Q', suit: 'paus', w: 56, manilha: true, zap: true }, 'on-table'), 'is-zap') +
    fig(card({ rank: '3', suit: 'espadas', w: 56 }, 'on-table winner'), 'winner · --glow-win') +
    fig(card({ rank: '4', suit: 'ouros', w: 56 }, 'on-table loser'), 'loser · .9') +
    fig(card({ rank: 'A', suit: 'copas', w: 56 }, 'on-table tied'), 'tied · --glow-tie') +
    fig(card({ rank: 'K', suit: 'paus', w: 28 }, 'on-table'), 'mini · banco 28×41') +
    fig(back(22, 'on-table'), 'back · contador 22×32') +
    '</div>');

  /* 2 Mano */
  out += comp(2, 'Mão', 'Três cartas 104×153, centros x 150 / 215 / 280, leque −10° / 0 / +10° (duas cartas ±5°, uma reta); recentrado 160 ms. Fora de turno a .78, sem elevação, sem idle.',
    '<div class="felt on-felt">' +
    fig(hand([{ rank: '3', suit: 'paus', w: 104 }, { rank: 'Q', suit: 'copas', w: 104, manilha: true }, { rank: '5', suit: 'ouros', w: 104 }], 'my-turn'), 'my-turn · +10 px, 100 %') +
    fig(hand([{ rank: '3', suit: 'paus', w: 104 }, { rank: 'Q', suit: 'copas', w: 104, manilha: true, touched: true }, { rank: '5', suit: 'ouros', w: 104 }], 'my-turn'), 'touched · a do meio') +
    fig(hand([{ rank: '3', suit: 'paus', w: 104 }, { rank: 'Q', suit: 'copas', w: 104, manilha: true }, { rank: '5', suit: 'ouros', w: 104 }], 'waiting'), 'waiting · .78') +
    fig(hand([{ rank: '3', suit: 'paus', w: 104 }, { rank: '5', suit: 'ouros', w: 104 }], 'my-turn two'), 'duas cartas · ±5°') +
    fig(hand([{ back: true, w: 104 }, { back: true, w: 104 }, { back: true, w: 104 }], 'waiting'), 'locked · mão de ferro') +
    '</div>');

  /* 3 Mazo */
  out += comp(3, 'Baralho (pilha central)', 'Quatro dorsos 48×70 empilhados com 1 px de deslocamento em (195, 380). Em mineiro, deslocado à esquerda, sem vira.',
    '<div class="felt on-felt">' + fig(viraGroup({ none: true }), 'full · mineiro (sem vira)') + fig(viraGroup({ rank: '7', suit: 'copas' }), 'full + vira') + '</div>');

  /* 4 Vira */
  out += comp(4, 'Vira', 'Sob o baralho, +22 px à direita e −8°, cara comum. Aba "VIRA" 28×14 que sai da borda superior e uma linha de 1 px <code>--brass</code> até o chip MANILHA do placar: ensina a relação vira → manilha sem texto.',
    '<div class="felt on-felt" style="padding-top:56px">' + fig(viraGroup({ rank: '7', suit: 'copas', line: true }), 'shown · com linha ao chip') +
    fig('<span class="vira-group"><span class="deck">' + back(48, 'on-table') + back(48, 'on-table') + back(48, 'on-table') + back(48, 'on-table') + '</span><span class="vira" style="transform:rotate(-8deg) rotateY(90deg)">' + card({ rank: '7', suit: 'copas', w: 48 }, 'on-table') + '</span></span>', 'flipping · 250 ms') +
    fig(viraGroup({ none: true }), 'none · mineiro') + '</div>' +
    '<div class="stack-v" style="margin-top:16px"><span style="position:relative;display:inline-block">' + placar({ us: 7, them: 9, vale: 1, manilha: '7', have: ['paus', 'ouros'] }) + '<span class="vira-line" style="left:171px;top:100%;bottom:auto;height:28px"></span></span><span class="ds-note" style="margin:0">A linha sobe da aba até o chip <b>MANILHA 7</b>; o naipe que tenho na mão fica em ouro, os outros em <code>--ink-lo</code>.</span></div>');

  /* 5 Placar */
  out += comp(5, 'Placar de transmissão', '342×68, <code>--surface-1</code>, raio 8. NÓS (etiqueta 11 + pontos 32 + 3 pontos de rodada) · centro (VALE 36 + chip MANILHA 96×20 com o naipe que tenho em ouro) · ELES espelhado em azul. Vocabulário: Rodadas (os pontos) · Tentos (VALE) · Pontos (os números).',
    '<div class="stack-v">' +
    '<div><div class="ds-sub" style="margin-top:0">rest · 2v2</div>' + placar({ us: 7, them: 9, vale: 1, have: ['paus'] }) + '</div>' +
    '<div><div class="ds-sub">round-dot · NÓS · ELES · empate (pop 180 ms)</div>' + placar({ us: 7, them: 9, vale: 3, dots: ['us', 'them', 'tie'], have: ['copas'] }) + '</div>' +
    '<div><div class="ds-sub">pending · VALE pisca "1 → 3"</div>' + placar({ us: 7, them: 9, pending: true }) + '</div>' +
    '<div><div class="ds-sub">value-change · pulso 250 ms + dígito roda (toque)</div><span id="placar-pulse" style="cursor:pointer">' + placar({ us: 7, them: 9, vale: 3, dots: ['us', '', ''] }) + '</span></div>' +
    '<div><div class="ds-sub">mao-especial · MÃO DE ONZE · VALE 3</div>' + placar({ us: 11, them: 5, vale: 3, special: 'Mão de onze' }) + '</div>' +
    '<div><div class="ds-sub">mineiro · MANILHAS FIXAS · VALE 2</div>' + placar({ us: 4, them: 6, vale: 2, mineiro: true }) + '</div>' +
    '<div><div class="ds-sub">1v1 · VOCÊ · ELE com avatares de 20 px</div>' + placar({ one: true, us: 7, them: 9, vale: 1, dots: ['us', '', ''] }) + '</div>' +
    '</div>');

  /* 6 Avatar */
  out += comp(6, 'Avatar com turno', 'Círculo 48 (alheios) / 56 (próprio) com anel de equipe 3 px; pílula de nome 13/800 embaixo; 3 dorsos 22×32 como contador de cartas; badge "mão". Nunca "robô" em mesas com dinheiro.',
    '<div class="felt on-felt" style="padding-top:40px;gap:28px 40px">' +
    fig(avatar({ name: 'Parceiro', initials: 'PA', team: 'us' }), 'idle · anel NÓS') +
    fig(avatar({ name: 'Rival 1', initials: 'R1', team: 'them', count: true, side: 'left' }), 'idle · ELES + contador') +
    fig(avatar({ name: 'Rival 1', initials: 'R1', team: 'them', active: true, frac: .7, timer: 14 }), 'active · anel 20 s + badge, 12 % maior') +
    fig(avatar({ name: 'Você', initials: 'VC', me: true, active: true, frac: .2, timer: 4, last5: true }), 'last-5s · --run, tique, vibração') +
    fig(avatar({ name: 'Parceiro', initials: 'PA', team: 'us', mao: true }), 'badge "mão"') +
    fig(avatar({ name: 'Rival 2', initials: 'R2', team: 'them', bubble: 'Aceitou' }), 'bubble-persistent · ACEITOU') +
    fig(avatar({ name: 'Parceiro', initials: 'PA', team: 'us', chat: 'Mandou bem!' }), 'bubble-chat · 3 s') +
    fig(avatar({ name: 'Rival 1', initials: 'R1', team: 'them', shout: 'Truco!' }), 'bolha de grito · 520 ms') +
    fig(avatar({ name: 'Parceiro', icon: ICO.wink, team: 'us' }), 'signal · sinal visível pros 4') +
    fig(avatar({ name: 'Rival 2', initials: 'R2', team: 'them', offline: true, recon: 18 }), 'disconnected · Reconectando… 18 s') +
    '</div>');

  /* 7 Botón TRUCO */
  out += comp(7, 'Botão TRUCO e sua cadeia', '134×52 preenchido <code>--lamp</code>, Londrina 900 20 px, borda <code>--lamp-edge</code>, a única sombra de cor. Sempre na posição direita da barra. Paulista TRUCO! → SEIS! → NOVE! → DOZE! (1 → 3 → 6 → 9 → 12); mineiro TRUCO! → SEIS! → DEZ! → DOZE! (2 → 4 → 6 → 10 → 12).',
    '<div class="states">' +
    fig('<button class="btn btn-truco">Truco!</button>', 'enabled') +
    fig('<button class="btn btn-truco" style="background:linear-gradient(180deg,var(--lamp-hot),var(--lamp));transform:scale(.98)">Truco!</button>', 'hover / press') +
    fig('<button class="btn btn-truco" disabled title="Só o lado que aceitou pode aumentar">Seis!</button>', 'disabled · .4 + tooltip') +
    fig('<span style="display:inline-flex;gap:8px"><button class="btn btn-truco" style="min-width:0">Seis!</button><button class="btn btn-truco" style="min-width:0">Nove!</button><button class="btn btn-truco" style="min-width:0">Doze!</button></span>', 'cadeia paulista') +
    fig('<span style="display:inline-flex;gap:8px"><button class="btn btn-truco" style="min-width:0">Seis!</button><button class="btn btn-truco" style="min-width:0">Dez!</button><button class="btn btn-truco" style="min-width:0">Doze!</button></span>', 'cadeia mineira') +
    fig('<span style="display:inline-block;width:134px;height:52px;border:1px dashed var(--brass-dim);border-radius:8px"></span>', 'hidden · doze, onze, ferro') +
    '</div>');

  /* 8 Botonera */
  out += comp(8, 'Botoeira', '342×52, <code>--surface-1</code>, três vãos de 100 / 100 / 134 com gap 8. Fora de turno não desaparece: apaga a .4 e diz "Vez de {nome}".',
    '<div class="stack-v">' +
    '<div><div class="ds-sub" style="margin-top:0">turno · CORRER · JOGAR COBERTA · TRUCO!</div>' + botonera('turno') + '</div>' +
    '<div><div class="ds-sub">turno · 1ª rodada (sem coberta)</div>' + botonera('turno1') + '</div>' +
    '<div><div class="ds-sub">resposta · CORRER · ACEITAR · SEIS!</div>' + botonera('resposta') + '</div>' +
    '<div><div class="ds-sub">mão de onze · CORRER (eles +1) · — · JOGAR (vale 3)</div>' + botonera('onze') + '</div>' +
    '<div><div class="ds-sub">doze · CORRER · ACEITAR · —</div>' + botonera('doze') + '</div>' +
    '<div><div class="ds-sub">dimmed · fora de turno</div>' + botonera('turno', { dimmed: true, who: 'Rival 1' }) + '</div>' +
    '<div><div class="ds-sub">waiting · filete que se desenha como barra de espera</div>' + botonera('turno', { waiting: true, who: 'Rival 2' }) + '</div>' +
    '<div><div class="ds-sub">desktop · atalhos T · A · C · 1 2 3 em --brass</div>' + botonera('desktop') + '</div>' +
    '</div>');

  /* 9 Overlay de pedido */
  out += comp(9, 'Overlay de pedido (sem modal)', '(a) bolha estampada sobre o avatar de quem pede · (b) selo 56 px sobre a cruz, que fica até a resposta · (c) luz a .26 · (d) botoeira em configuração resposta · (e) em 2v2, toast "Seu parceiro já respondeu".',
    '<div class="felt on-felt" style="padding-top:48px;gap:28px 48px">' +
    fig(avatar({ name: 'Rival 1', initials: 'R1', team: 'them', shout: 'Truco!', active: true, frac: .6, timer: 12 }), 'asked-to-me') +
    fig(stampSVG('Truco!', 'var(--lamp)'), 'selo · fica até a resposta') +
    fig(stampSVG('Desce!', 'var(--ok)'), 'accepted · DESCE!') +
    fig(stampSVG('Tô fora!', 'var(--run)'), 'ran · TÔ FORA!') +
    fig('<span class="toast">Eles correram! +1</span>', 'toast de corrida') +
    fig('<span class="toast">Seu parceiro já respondeu.</span>', '2v2 · primeira resposta vale') +
    '</div><div class="stack-v" style="margin-top:12px">' + botonera('resposta') + '</div>');

  /* 10 Sellos */
  out += comp(10, 'Selos de grito', 'Londrina 900 56 px, SVG com borda irregular (um path, não um retângulo), sombra dura <code>--brass-dim</code>, tilt −6°. Enter 150 ms · hold 1,2 s (ou até a resposta) · exit 100 ms.',
    '<div class="felt on-felt" style="gap:32px 48px">' +
    fig(stampSVG('Truco!', 'var(--lamp)'), 'TRUCO / SEIS / NOVE / DOZE · --lamp') +
    fig(stampSVG('Seis!', 'var(--lamp)'), 'SEIS!') +
    fig(stampSVG('Desce!', 'var(--ok)'), 'DESCE! · --ok') +
    fig(stampSVG('Tô fora!', 'var(--run)'), 'TÔ FORA! · --run') +
    fig(stampSVG('Empachou!', 'var(--tie)', true), 'EMPACHOU! · --tie · 40 px') +
    '</div>');

  /* 11 Píldora de rodada */
  out += comp(11, 'Pílula de rodada (lower third)', '32 px de altura, raio 999. Entra colada ao placar desde o lado da dupla que ganhou, nunca sobre a cruz. Visível ≤ 1,2 s.',
    '<div class="states">' + fig('<span class="pill pill-us">Nós levamos a rodada</span>', '--ok-deep') + fig('<span class="pill pill-them">Eles levaram a rodada</span>', '--team-them-deep') + fig('<span class="pill pill-tie">Empachou!</span>', '--tie') + '</div>');

  /* 12 Banner */
  out += comp(12, 'Banner de mão', '342×56 centrado sobre a cruz. 1,4 s (mão) · 2 s (especial).',
    '<div class="stack-v">' +
    '<div class="banner"><span class="big">Ganhamos a mão <span class="plus">· +3</span></span></div>' +
    '<div class="banner"><span class="sober">Perdemos a mão</span></div>' +
    '<div class="banner"><span class="bigger">Mão de onze</span><span class="sub">Vale 3 · não se pede truco nesta mão</span></div>' +
    '<div class="banner"><span class="bigger">Mão de dez</span><span class="sub">Mineiro · vale 4</span></div>' +
    '<div class="banner"><span class="big">Mão de ferro</span><span class="sub">quem ganhar leva a partida</span></div>' +
    '<div class="banner"><span class="sober">Mão anulada</span><span class="sub">três empates · vai outra</span></div>' +
    '</div>');

  /* 13 Banco */
  out += comp(13, 'Banco de vazas', 'NÓS à esquerda / ELES à direita, 90×44 cada. Cada vaza fechada = pilha de mini cartas 28×41 com a ganhadora em cima; ponto de 6 px da cor da dupla (ou <code>--tie</code>). Tocar uma pilha abre um popover com as 4 cartas.',
    '<div class="felt on-felt" style="gap:32px 48px">' +
    fig(banco({ vazas: [] }), 'empty') +
    fig(banco({ vazas: [{ rank: '3', suit: 'paus' }] }), '1 vaza · NÓS') +
    fig(banco({ vazas: [{ rank: '3', suit: 'paus' }, { rank: 'Q', suit: 'copas', manilha: true, dot: 'tie' }] }), '2 vazas · uma empatada') +
    fig(banco({ them: true, vazas: [{ rank: '2', suit: 'ouros', dot: 'them' }, { rank: 'A', suit: 'espadas', dot: 'them' }, { rank: 'K', suit: 'paus', dot: 'them' }] }), '3 vazas · ELES (espelhado)') +
    fig('<span class="surface-2 banco-popover">' + card({ rank: '3', suit: 'paus', w: 48 }, 'on-table winner') + card({ rank: '5', suit: 'ouros', w: 48 }, 'on-table loser') + card({ rank: 'K', suit: 'copas', w: 48 }, 'on-table loser') + back(48, 'on-table loser') + '</span>', 'popover · as 4 cartas da vaza') +
    '</div>');

  /* 14 Chips */
  out += comp(14, 'Chips', 'Dado, não gancho. Gabarito 700 12 px, caixa alta, valor em ouro.',
    '<div class="states">' + fig('<span class="chip">Paulista · 2x2 · <b>R$ 2,00</b> · taxa 7 %</span>', 'header de mesa 180×28') + fig('<span class="chip chip-small">Mineiro</span>', 'Mineiro 64×24') + fig('<span class="chip">Manilhas fixas <b>4♣ 7♥ A♠ 7♦</b></span>', 'manilhas fixas') + fig('<span class="chip">Mão de onze · <b>vale 3</b></span>', 'mão de onze') + fig('<span class="chip">Manilha <b>7</b> ♣ ♥ ♠ ♦</span>', 'MANILHA 7') + fig('<span class="chip chip-vira">Vira</span>', 'aba VIRA 28×14') + '</div>');

  /* 15 Chat */
  out += comp(15, 'Chat / emotes / sinais', 'Botão globo 40×40. Popover <code>--surface-2</code> com 7 frases + 6 emotes próprios + (2v2) 4 botões de sinal (piscar, sobrancelha, bochecha, língua) com significado sorteado por mão e legenda privada por dupla. Sem texto livre em mesas com dinheiro.',
    '<div class="states" style="align-items:flex-start">' + fig('<span class="btn-chat">' + ICO.chat + '</span>', 'closed') + fig(DS.chatPop({ meaning: true }), 'open · com legenda privada') + fig(DS.chatPop({ cooldown: true, meaning: false }), 'cooldown · 2–3 s') + '</div>');

  /* 16 Conexión */
  out += comp(16, 'Estado de conexão', 'Toast + contador privado, aviso de expulsão, sinal riscada sobre o rival, overlay próprio com o placar visível atrás, "Conexão restabelecida" com check. A luz pisca uma vez ao perder conexão.',
    '<div class="states" style="align-items:flex-start">' +
    fig('<span class="toast">Tempo esgotado: o sistema jogou por você <b class="num" style="color:var(--ink-lo);margin-left:6px">1/3</b></span>', '(a) jogada automática + 1/3') +
    fig('<span class="toast toast-danger">Mais uma jogada automática e você sai da mesa (derrota)</span>', '(b) aviso de expulsão') +
    fig(avatar({ name: 'Rival 2', initials: 'R2', team: 'them', offline: true, recon: 18 }), '(c) rival desconectado') +
    fig('<div class="surface-2 conn-overlay"><span class="spinner"></span><span class="title">Conexão perdida · tentando reconectar</span><span class="counter num">o sistema joga por você durante 60 s</span></div>', '(d) overlay próprio') +
    fig('<div class="surface-2 conn-overlay"><span class="title ok">' + ICO.check + ' Conexão restabelecida</span><span class="counter">estado sincronizado · vez de Rival 1</span></div>', '(e) restabelecida') +
    '</div>');

  /* 17 Toasts */
  out += comp(17, 'Toasts', '14/500 sobre <code>--surface-2</code>, raio 8, entram desde cima do pano em 200 ms, 2,5 s. Voz neutra em erros e dinheiro.',
    '<div class="states" style="align-items:flex-start">' +
    ['Não é sua vez.', 'Carta coberta só a partir da 2ª rodada.', 'Só o lado que aceitou pode aumentar.', 'Aguarde a resposta ao seu pedido.', 'Na mão de onze não se pede truco.', 'Na mão de ferro não há truco nem carta coberta.', 'Seu parceiro já respondeu.'].map(function (t) { return '<span class="toast">' + t + '</span>'; }).join('') +
    '<span class="toast toast-ok">Aceitaram! Mão valendo 3</span><span class="toast">Eles correram! +1</span><span class="toast toast-danger">Corremos. Eles +1</span>' +
    '</div>');

  /* 18 Resultado */
  out += comp(18, 'Cartão de resultado', '<code>--surface-2</code>, raio 12, filete <code>--brass</code>: marcador final, resumo de mãos, valor líquido de comissão (dado), botões JOGAR DE NOVO · VOLTAR · Revanche. Vitória: luz .30, VITÓRIA 72 em degradê. Derrota: luz .10, sóbria.',
    '<div class="states" style="align-items:flex-start;gap:24px"><figure><div class="bar is-victory" style="padding:32px 24px;border-radius:12px">' + DS.resultCard(true) + '</div><figcaption>vitória · luz .30</figcaption></figure><figure><div class="bar is-defeat" style="padding:32px 24px;border-radius:12px">' + DS.resultCard(false) + '</div><figcaption>derrota · luz .10</figcaption></figure></div>');

  /* 19 Pie legal */
  out += comp(19, 'Pé legal', '10/400 <code>--ink-lo</code>, centrado, em todas as telas.', '<p class="legal" style="padding:12px;border:1px dashed var(--brass-dim);border-radius:8px">O jogo pode ser viciante. Jogue com responsabilidade. 18+.</p>');

  /* 20 Ajustes */
  out += comp(20, 'Modal de ajustes', '<code>--surface-2</code> raio 16 sobre <code>--scrim</code>: voz (4), música, ambiente, velocidade de animação, háptico, animações, tamanho de fonte e botões, régua de força, alto contraste.',
    '<div class="states"><figure><div style="position:relative;padding:24px;border-radius:12px;overflow:hidden"><div class="felt" style="position:absolute;inset:0;border-radius:12px"></div><div class="scrim" style="border-radius:12px"></div><div style="position:relative">' + DS.settingsModal() + '</div></div><figcaption>sobre --scrim</figcaption></figure></div>');

  $('components').innerHTML = out;

  /* value-change: pulso al tocar */
  $('placar-pulse').addEventListener('click', function () {
    var v = this.querySelector('.vale'); v.classList.remove('pulse'); void v.offsetWidth; v.classList.add('pulse');
    var n = this.querySelector('.v'); var cur = parseInt(n.textContent, 10) || 1; var next = cur === 1 ? 3 : cur === 3 ? 6 : cur === 6 ? 9 : cur === 9 ? 12 : 1;
    n.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-12px)', opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = function () {
      n.textContent = next; n.animate([{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' });
    };
  });
})();

/* =====================================================================
   Parte 3 · §7 Mocks 390×844, §8 Motion, §9 Vocabulario, §10 Checklist
   ===================================================================== */
(function () {
  'use strict';
  var BT = window.BT, DS = window.DS;
  var card = DS.card, back = DS.back, stampSVG = DS.stampSVG, placar = DS.placar, avatar = DS.avatar, botonera = DS.botonera, banco = DS.banco, viraGroup = DS.viraGroup, hand = DS.hand, ICO = DS.ICO;
  function $(id) { return document.getElementById(id); }

  /* ==================================================================
     7 · Mocks: una mesa 390×844 según el mapa de §7.1, con capas
     opcionales por estado. Todo son los componentes reales.
     ================================================================== */
  function mesa(o) {
    o = o || {};
    var light = o.light || '';
    var s = '<div class="phone"><div class="mesa bar ' + light + '">';
    s += '<div class="m-header">' + DS.headerMesa() + '</div>';
    s += '<div class="m-placar">' + placar(o.placar || { us: 7, them: 9, vale: 1, have: ['paus'] }) + '</div>';
    /* paño */
    s += '<div class="m-felt felt">';
    if (o.empty) {
      /* E-01: asientos vacíos */
      s += '<div class="m-partner" style="display:flex;flex-direction:column;align-items:center;gap:6px"><span class="m-seat-empty">' + ICO.seat + '</span><span class="m-seat-label">Aguardando jogador…</span></div>';
      s += '<div class="m-rival-l" style="display:flex;flex-direction:column;align-items:center;gap:6px;left:8px"><span class="m-seat-empty">' + ICO.seat + '</span><span class="m-seat-label">Aguardando…</span></div>';
      s += '<div class="m-rival-r">' + avatar({ name: 'Rival 2', initials: 'R2', team: 'them' }) + '</div>';
      s += '<div class="m-center" style="display:flex;flex-direction:column;align-items:center;gap:10px;top:235px"><span class="t-score" style="color:var(--gold)">2/4</span><span class="t-label">sentados · tempo por jogada 20 s</span></div>';
    } else {
      s += '<div class="m-partner">' + avatar(o.partner || { name: 'Parceiro', initials: 'PA', team: 'us', count: true }) + '</div>';
      s += '<div class="m-rival-l">' + avatar(o.rivalL || { name: 'Rival 1', initials: 'R1', team: 'them', count: true }) + '</div>';
      s += '<div class="m-rival-r">' + avatar(o.rivalR || { name: 'Rival 2', initials: 'R2', team: 'them', count: true, side: 'left' }) + '</div>';
      s += '<div class="m-slot partner"></div><div class="m-slot left"></div><div class="m-slot right"></div><div class="m-slot me"></div>';
      s += '<div class="m-vira">' + viraGroup(o.vira || { rank: '7', suit: 'copas' }) + '</div>';
      s += '<div class="m-banco-us">' + banco(o.bancoUs || { vazas: [] }) + '</div>';
      s += '<div class="m-banco-them">' + banco(o.bancoThem || { them: true, vazas: [] }) + '</div>';
      if (o.partnerCards) s += '<div style="left:50%;top:92px;transform:translateX(-50%);display:flex;gap:6px">' + o.partnerCards.map(function (c) { c.w = 56; return card(c, 'on-table'); }).join('') + '</div>';
      if (o.center) s += '<div class="m-center">' + o.center + '</div>';
      if (o.banner) s += '<div class="m-banner">' + o.banner + '</div>';
    }
    s += '</div>';
    if (o.toast) s += '<span class="toast m-toast' + (o.toastCls ? ' ' + o.toastCls : '') + '">' + o.toast + '</span>';
    if (o.pill) s += '<div class="m-pill-rodada">' + o.pill + '</div>';
    /* zona del pulgar */
    s += '<div class="m-me">' + avatar(o.me || { name: 'Você', initials: 'VC', me: true, team: 'us', frac: 1 }) + '</div>';
    s += '<div class="m-chat"><span class="btn-chat">' + ICO.chat + '</span></div>';
    s += '<div class="m-hand">' + hand(o.hand || [{ rank: '3', suit: 'paus', w: 104 }, { rank: 'Q', suit: 'copas', w: 104, manilha: true }, { rank: '5', suit: 'ouros', w: 104 }], o.handCls || 'waiting') + '</div>';
    s += '<div class="m-botonera">' + (o.botonera || botonera('turno', { dimmed: true, who: 'Rival 1' })) + '</div>';
    s += '<div class="m-legal legal">O jogo pode ser viciante. Jogue com responsabilidade. 18+.</div>';
    if (o.scrim) s += '<div class="m-scrim scrim" style="' + (o.scrimStyle || 'bottom:270px') + '"></div>';  /* §1.1: el scrim nunca tapa la mano propia */
    if (o.overlay) s += '<div class="m-overlay" style="' + (o.overlayStyle || '') + '">' + o.overlay + '</div>';
    return s + '</div></div>';
  }

  var MOCKS = [
    { id: 'E-01', title: 'Esperando rivais', note: 'Assentos vazios com "Aguardando jogador…", 2/4, valor e taxa no chip.', html: mesa({ empty: true, hand: [], botonera: '<div class="botonera"><button class="btn btn-ghost-run">Sair</button><button class="btn btn-ghost-brass">Convidar</button><button class="btn btn-ghost-brass" style="color:var(--ink-hi)">Copiar link</button></div>', hand: [{ back: true, w: 104 }, { back: true, w: 104 }, { back: true, w: 104 }], placar: { us: 0, them: 0, vale: 1, have: [] } }) },
    { id: 'E-23', title: 'Mão de onze do rival', note: '"Eles estão olhando as cartas…"; minhas cartas visíveis mas bloqueadas; sem botão de truco; luz .24.', html: mesa({ light: 'is-onze', placar: { us: 5, them: 11, vale: 3, special: 'Mão de onze' }, rivalL: { name: 'Rival 1', initials: 'R1', team: 'them', active: true, frac: .6, timer: 12, count: true }, banner: '<div class="banner"><span class="big">Mão de onze deles</span><span class="sub">Eles estão olhando as cartas…</span></div>', botonera: botonera('ferro', { dimmed: true, who: 'Rival 1' }) }) },
    { id: 'E-30', title: 'Mão de ferro: anúncio', note: '11 a 11. Banner 2 s, luz .08 "às escuras"; depois minhas cartas ficam viradas para baixo.', html: mesa({ light: 'is-ferro', placar: { us: 11, them: 11, vale: 1, special: 'Mão de ferro' }, banner: '<div class="banner"><span class="big">Mão de ferro</span><span class="sub">quem ganhar leva a partida · vale 1</span></div>', hand: [{ back: true, w: 104 }, { back: true, w: 104 }, { back: true, w: 104 }], botonera: botonera('ferro', { dimmed: true, who: 'Parceiro' }), vira: { none: true } }) },
    { id: 'E-41', title: 'Série melhor de 3', note: '"Partida 1 de 3 · 1 × 0 · A próxima começa em 5 s". O placar de partida volta a 0 × 0.', html: mesa({ light: 'is-victory', scrim: true, placar: { us: 12, them: 9, vale: 1, have: [] }, overlay: '<div class="result"><span class="t-label" style="color:var(--gold)">Partida 1 de 3</span><div class="score"><span class="us">1</span><span class="x">×</span><span class="them">0</span></div><div class="rows"><div><span>Partida 1</span><b>12 × 9 · nós</b></div><div><span>Partida 2</span><b style="color:var(--ink-lo)">—</b></div><div><span>Partida 3</span><b style="color:var(--ink-lo)">—</b></div></div><span class="quote">A próxima começa em <b class="num" style="color:var(--gold)">5 s</b></span></div>', overlayStyle: 'top:270px' }) },
    { id: 'E-51', title: 'Tabela de sinais desta mão', note: 'Legenda privada por dupla, sorteada a cada mão; a dupla rival tem outra.', html: mesa({ overlay: '<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;width:342px"><div style="position:relative;right:-8px">' + DS.chatPop({ meaning: true }) + '</div></div>', overlayStyle: 'top:240px;left:24px', handCls: 'my-turn', botonera: botonera('turno'), me: { name: 'Você', initials: 'VC', me: true, team: 'us', active: true, frac: .8, timer: 16 } }) },
    { id: 'E-62', title: 'Aviso de expulsão', note: 'Duas jogadas automáticas seguidas: "Mais uma jogada automática e você sai da mesa (derrota)". Contador 2/3 privado.', html: mesa({ toast: 'Mais uma jogada automática e você sai da mesa (derrota) <b class="num" style="color:var(--ink-lo);margin-left:6px">2/3</b>', toastCls: 'toast-danger', handCls: 'my-turn', botonera: botonera('turno'), me: { name: 'Você', initials: 'VC', me: true, team: 'us', active: true, frac: .15, timer: 3, last5: true } }) },
    { id: 'E-63', title: 'Expulso / abandono', note: 'Para o expulso: "Você abandonou a partida (derrota)". Para os outros: "[nome] abandonou · vitória de NÓS".', html: mesa({ light: 'is-defeat', scrim: true, placar: { us: 7, them: 9, vale: 1, have: [] }, overlay: DS.resultCard(false, { us: 7, them: 9, abandon: 'Você abandonou a partida' }), overlayStyle: 'top:250px' }) },
    { id: 'E-64', title: 'Rival desconectado', note: 'Sinal riscada sobre o avatar + "Reconectando… 18 s". O jogo joga por ele a carta mais fraca enquanto houver banco de tempo.', html: mesa({ rivalL: { name: 'Rival 1', initials: 'R1', team: 'them', count: true, offline: true, recon: 18, active: true, frac: .5, timer: 10 }, botonera: botonera('turno', { dimmed: true, who: 'Rival 1' }) }) },
    { id: 'E-65', title: 'Eu desconectado', note: 'Overlay "Conexão perdida · tentando reconectar" com o placar visível atrás; a luz pisca uma vez; a mão própria não se tapa.', html: mesa({ scrim: true, scrimStyle: 'top:175px;bottom:270px', overlay: '<div class="surface-2 conn-overlay"><span class="spinner"></span><span class="title">Conexão perdida · tentando reconectar</span><span class="counter num">o sistema joga por você durante 60 s</span></div>', overlayStyle: 'top:330px' }) }
  ];

  $('mocks').innerHTML = MOCKS.map(function (m) {
    return '<div class="mock"><div class="cap"><b>' + m.id + '</b>' + m.title + '<small>' + m.note + '</small></div><div class="phone-wrap">' + m.html + '</div></div>';
  }).join('');

  /* Escala de los marcos cuando el contenedor es más angosto que 390 */
  function scalePhones() {
    var wraps = document.querySelectorAll('.phone-wrap');
    Array.prototype.forEach.call(wraps, function (w) {
      var avail = w.parentNode.getBoundingClientRect().width;
      var k = Math.min(1, avail / 390);
      w.style.height = Math.round(844 * k) + 'px';
      w.style.width = Math.round(390 * k) + 'px';
      w.firstElementChild.style.transform = k < 1 ? 'scale(' + k.toFixed(3) + ')' : '';
    });
  }
  window.addEventListener('resize', scalePhones);
  scalePhones();

  /* ==================================================================
     8 · Motion: demo con WAAPI (respeta --speed del select)
     ================================================================== */
  (function motion() {
    var stage = $('motion-stage'), deck = $('m-deck'), handArea = $('m-hand'), stampA = $('m-stamp'), slot = $('m-slot');
    var speedSel = $('mo-speed');
    function sp() { return parseFloat(speedSel.value) || 1; }
    speedSel.addEventListener('change', function () { document.documentElement.style.setProperty('--speed', speedSel.value); });
    deck.innerHTML = back(48, 'on-table') + back(48, 'on-table') + back(48, 'on-table') + back(48, 'on-table');
    var HAND = [{ rank: '3', suit: 'paus' }, { rank: 'Q', suit: 'copas', manilha: true }, { rank: '5', suit: 'ouros' }];
    var busy = false;
    function clearFly() { Array.prototype.forEach.call(stage.querySelectorAll('.fly'), function (e) { e.remove(); }); }
    function resetHand(cls) { handArea.innerHTML = hand(HAND.map(function (c) { return { rank: c.rank, suit: c.suit, manilha: c.manilha, w: 104 }; }), cls || 'my-turn'); }
    function rect(el) { var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; }
    resetHand();
    $('m-banco-us').innerHTML = banco({ vazas: [] });
    $('m-banco-them').innerHTML = banco({ them: true, vazas: [] });

    /* Reparto: stagger 90, vuelo 380, ±15° que se endereza, sombra crece y baja */
    $('mo-deal').addEventListener('click', function () {
      if (busy) return; busy = true; clearFly(); handArea.innerHTML = ''; $('m-banco-us').innerHTML = banco({ vazas: [] });
      var d = rect(deck), ha = rect(handArea);
      var targets = [[-65, -10], [0, 0], [65, 10]];
      var k = sp();
      HAND.forEach(function (c, i) {
        var el = document.createElement('span'); el.className = 'fly';
        el.innerHTML = (i === 1 ? card({ rank: c.rank, suit: c.suit, manilha: true, w: 104 }, 'in-hand') : card({ rank: c.rank, suit: c.suit, w: 104 }, 'in-hand'));
        stage.appendChild(el);
        var tx = ha.x + ha.w / 2 - 52 + targets[i][0], ty = ha.y + ha.h - 153;
        var sx = d.x + d.w / 2 - 52, sy = d.y + d.h / 2 - 76;
        el.animate([
          { transform: 'translate(' + sx + 'px,' + sy + 'px) scale(.46) rotate(' + (i % 2 ? 15 : -15) + 'deg)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.35))' },
          { transform: 'translate(' + ((sx + tx) / 2) + 'px,' + ((sy + ty) / 2 - 30) + 'px) scale(.8) rotate(' + (i % 2 ? 6 : -6) + 'deg)', filter: 'drop-shadow(0 12px 24px rgba(0,0,0,.5))', offset: .55 },
          { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(1) rotate(' + targets[i][1] + 'deg)', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.55))' }
        ], { duration: 380 * k, delay: i * 90 * k, easing: 'cubic-bezier(.05,.7,.1,1)', fill: 'forwards' });
      });
      setTimeout(function () {
        clearFly(); resetHand();
        /* manilha repartida: destello 300 ms */
        var m = handArea.querySelectorAll('.card')[1].querySelector('svg');
        m.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.5) drop-shadow(0 0 10px rgba(255,227,161,.45))' }, { filter: 'brightness(1)' }], { duration: 300 * k, easing: 'ease-in-out' });
        busy = false;
      }, (380 + 2 * 90 + 40) * k);
    });

    /* Vuelo de carta propia: 280 ms, al slot, cae con ±4°, sombra crece y baja */
    $('mo-fly').addEventListener('click', function () {
      if (busy) return; busy = true; clearFly();
      var cards = handArea.querySelectorAll('.card'); if (!cards.length) { resetHand(); cards = handArea.querySelectorAll('.card'); }
      var src = cards[2], r = rect(src), t = rect(slot), k = sp();
      var el = document.createElement('span'); el.className = 'fly'; el.innerHTML = card({ rank: '5', suit: 'ouros', w: 104 }, 'in-hand'); stage.appendChild(el);
      src.style.visibility = 'hidden';
      var tx = t.x + t.w / 2 - 52, ty = t.y + t.h / 2 - 76;
      el.animate([
        { transform: 'translate(' + r.x + 'px,' + r.y + 'px) rotate(10deg) scale(1)', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.55))' },
        { transform: 'translate(' + ((r.x + tx) / 2) + 'px,' + ((r.y + ty) / 2 - 24) + 'px) rotate(4deg) scale(.8)', filter: 'drop-shadow(0 12px 24px rgba(0,0,0,.5))', offset: .5 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) rotate(-4deg) scale(.538)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.35))' }
      ], { duration: 280 * k, easing: 'cubic-bezier(.05,.7,.1,1)', fill: 'forwards' });
      setTimeout(function () {
        /* recentrado de la mano 160 ms */
        handArea.innerHTML = hand([{ rank: '3', suit: 'paus', w: 104 }, { rank: 'Q', suit: 'copas', w: 104, manilha: true }], 'my-turn two');
        busy = false;
      }, 300 * k);
    });

    /* Manilha estampada: 520 ms, scale 1,6 → 1 con sacudón ±3 px, anillo, lámpara +.06 */
    $('mo-stamp').addEventListener('click', function () {
      if (busy) return; busy = true; clearFly();
      var k = sp(), t = rect(slot);
      var el = document.createElement('span'); el.className = 'fly'; el.innerHTML = '<span class="stamp-ring">' + card({ rank: 'Q', suit: 'paus', w: 56, manilha: true, zap: true }, 'on-table') + '<span class="ring"></span></span>'; stage.appendChild(el);
      el.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)';
      var inner = el.firstElementChild;
      inner.animate([
        { transform: 'scale(1.6)', opacity: 0, offset: 0 },
        { transform: 'scale(1)', opacity: 1, offset: .615 },
        { transform: 'translateX(-3px) scale(1)', offset: .74 },
        { transform: 'translateX(3px) scale(1)', offset: .88 },
        { transform: 'translateX(0) scale(1)', offset: 1 }
      ], { duration: 520 * k, easing: 'ease-out', fill: 'forwards' });
      setTimeout(function () { inner.classList.add('go'); }, 320 * k);
      stage.classList.add('is-manilha-played');
      setTimeout(function () { stage.classList.remove('is-manilha-played'); busy = false; }, 700 * k);
    });

    /* Deslizamiento al banco: las 4 cartas se encogen a 28×41 y van al banco NÓS, stagger 40, 360 ms */
    $('mo-slide').addEventListener('click', function () {
      if (busy) return; busy = true; clearFly();
      var k = sp(), t = rect(slot), b = rect($('m-banco-us'));
      var plays = [{ rank: '3', suit: 'paus', dx: 0, dy: 0, win: true }, { rank: '5', suit: 'ouros', dx: -70, dy: -50 }, { rank: 'K', suit: 'copas', dx: 70, dy: -50 }, { rank: '4', suit: 'espadas', dx: 0, dy: -100 }];
      var els = plays.map(function (p) {
        var el = document.createElement('span'); el.className = 'fly'; el.innerHTML = card({ rank: p.rank, suit: p.suit, w: 56 }, 'on-table' + (p.win ? ' winner' : ' loser')); stage.appendChild(el);
        el.style.transform = 'translate(' + (t.x + p.dx) + 'px,' + (t.y + p.dy) + 'px)';
        return el;
      });
      setTimeout(function () {
        els.forEach(function (el, i) {
          var p = plays[i];
          el.animate([
            { transform: 'translate(' + (t.x + p.dx) + 'px,' + (t.y + p.dy) + 'px) scale(1)' },
            { transform: 'translate(' + (b.x + 4) + 'px,' + (b.y + 2) + 'px) scale(.5)' }
          ], { duration: 360 * k, delay: (3 - i) * 40 * k, easing: 'cubic-bezier(.2,0,0,1)', fill: 'forwards' });
        });
        setTimeout(function () {
          clearFly();
          $('m-banco-us').innerHTML = banco({ vazas: [{ rank: '3', suit: 'paus' }] });
          var dot = $('m-banco-us').querySelector('.dot'); if (dot) dot.animate([{ transform: 'translateX(-50%) scale(0)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 180 * k, easing: 'cubic-bezier(.34,1.56,.64,1)' });
          busy = false;
        }, (360 + 160) * k);
      }, 450 * k);
    });

    /* Tabla §8.2 */
    var T = [
      ['Entrar na mesa', 'filete 480 · painéis 350, stagger 60', 'standard / enter', 'o brass-line do pano se desenha (stroke-dashoffset) em sentido horário; placar e pílulas entram y 8 → 0'],
      ['Reparto (E-04)', 'stagger 90 · voo 380 · flip vira 250 · total ≤ 1 s', 'enter', 'do baralho, 3 cartas por assento anti-horário desde o pé; rotação ±15° que se endireita; sombra 0 2px 4px → 0 12px 24px → 0 8px 20px; vira no final'],
      ['Manilha repartida (E-05)', '300', 'standard', '--glow-manilha-deal sobre a cara; linha VIRA → chip se desenha 240 ms; sfx'],
      ['Repouso da mão', 'loop 2,4 s', 'senoidal', '1–2 px vertical com fase própria; apagado fora de turno e com reduce-motion'],
      ['Meu turno (E-10)', 'anel 240 · mão 200 · barra 150', 'standard / enter', 'anel do avatar passa a --gold se desenhando; mão sobe 10 px e a 100 %; barra de .4 a 1'],
      ['Tocar carta', '150', 'overshoot', 'escala 1,08, +12 px, punch +4°, sombra levantada; háptico 0'],
      ['Jogar carta (E-11)', 'própria 280 · alheia 440 · recentrado 160', 'enter / standard', 'voo ao slot, sombra cresce e baixa, cai com ±4°; coberta viaja como dorso'],
      ['Manilha / zap jogada', '520 (tempos [0,.615,.74,.88,1]) · anel 400 desde 320 · lâmpada 300', 'easeIn / easeOut / easeInOut', 'estampada scale 1,6 → 1 com sacudida ±3 px; --glow-stamp; luz +.06 e volta; háptico 15 ms; voz "zap"'],
      ['Rodada ganha (E-13)', 'halo 150 · pílula 130 / 1,2 s · deslizamento 360, stagger 40 · ponto 180', 'overshoot / standard', '--glow-win + elevação 6 px; pílula colada ao placar; as 4 cartas encolhem a 28×41 e deslizam ao banco; ponto com pop. Nunca corte de 1 quadro'],
      ['Empate (E-14)', '1,2 s', '—', '--glow-tie nas duas; selo EMPACHOU! 40 px; ponto --tie; "Quem ganhar a 2ª leva a mão"'],
      ['Pedido TRUCO / SEIS / NOVE / DOZE (E-15)', 'bolha 520 · luz 300 ↑ / 600 ↓ · shake 250 (3 px) · selo 150 · barra 200', 'stamp / standard / pop', 'bolha estampada no avatar; luz .26; screen shake (único junto com a manilha); selo fica até a resposta; VALE pisca "1 → 3"; barra "Aguardando resposta de {nome}…"; háptico 20 ms'],
      ['Responder (E-16)', 'barra 200', 'enter, y 16 → 0', 'bolha + voz sobre quem pede; botoeira CORRER · ACEITAR · SEIS! inline, não tapa'],
      ['Aceito (E-17)', 'selo 140 / 1,2 s / 100 · pulso 250 · dígito 400', 'enter / exit / overshoot', 'DESCE! em --ok no mesmo quadro em que sai a botoeira; VALE pulsa e o dígito roda; bolha "ACEITOU" fica; o botão de subir passa ao lado que aceitou'],
      ['Correram (E-19)', 'selo 140 / 1,2 s / 100 · recolhida 420, stagger 40', 'enter / exit', 'TÔ FORA! em --run; toast "Eles correram! +1"; as cartas voltam ao baralho viradas sem se mostrar'],
      ['Fim de mão (E-18)', 'banner 1,4 s · recolhida 450, stagger 40 · pontos 400 · mão nova ≤ 4 s', 'exit / overshoot', 'banner sobre a cruz; cartas e banco se recolhem para o pé; pontos roda'],
      ['Mão de onze (E-20)', 'banner 2 s · luz 250 · flip 400, stagger 80 · barra 200', 'standard / pop', 'luz .24 e fica; as 3 cartas do parceiro baixam viradas para cima ao trilho sob seu avatar; botoeira CORRER (eles +1) · JOGAR (vale 3)'],
      ['Mão de ferro (E-30–32)', 'luz 500 · flip 400', 'standard', 'luz .08 "às escuras"; minhas 3 cartas viradas; na revelação as 4 giram juntas rotateY'],
      ['Timer', 'linear 20 s (+3 s a quem abre) · cor 300', 'linear', 'stroke-dashoffset contínuo, não por passos; últimos 5 s --run + tique + vibração 10 ms'],
      ['Jogada automática (E-61)', 'toast 2,5 s', 'pop', '"Tempo esgotado: o sistema jogou por você" + contador "1/3"'],
      ['Chat / emote / sinal', '200 · visível 3 s', 'pop', 'globo sobre o avatar; sinal como animação no avatar visível para os 4'],
      ['Modais / popovers', '200 abre · 160 fecha · popover 180', 'enter / exit / pop', 'opacity 0 → 1, scale .97 → 1, y 16 → 0 sobre --scrim'],
      ['Botões', '150', 'cubic-bezier(.4,0,.2,1)', 'hover escala 1,02; press .98'],
      ['Fim de partida (E-40)', 'luz 400 · título 300 · cartão +250 · botão +250 · total ≤ 1,2 s', 'enter', 'vitória: luz .30, VITÓRIA 72 com degradê; derrota: luz .10, sóbria. Sem confete nem partículas'],
      ['Conexão perdida / volta (E-64, E-65)', 'piscada 600 · volta 350', 'standard', 'a luz pisca uma vez; overlay com o placar visível atrás; check --ok ao voltar']
    ];
    $('motion-table').innerHTML = '<thead><tr><th>Evento</th><th>Duração (ms)</th><th>Easing</th><th>O que se move</th></tr></thead><tbody>' + T.map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td class="num">' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>'; }).join('') + '</tbody>';
    var TK = [['--motion-instant', '80ms'], ['--motion-short', '200ms'], ['--motion-medium', '320ms'], ['--motion-long', '480ms'], ['--motion-stamp', '520ms'], ['--hold-pill', '1200ms'], ['--hold-banner', '1400ms'], ['--ease-standard', 'cubic-bezier(.2,0,0,1)'], ['--ease-enter', 'cubic-bezier(.05,.7,.1,1)'], ['--ease-exit', 'cubic-bezier(.3,0,.8,.15)'], ['--ease-pop', 'cubic-bezier(.22,1,.36,1)'], ['--ease-overshoot', 'cubic-bezier(.34,1.56,.64,1)'], ['--speed', 'lenta 1,4 · normal 1 · rápida ,7 (multiplica todas as durações)']];
    $('motion-tokens').innerHTML = '<thead><tr><th>Token</th><th>Valor</th></tr></thead><tbody>' + TK.map(function (r) { return '<tr><td><code>' + r[0] + '</code></td><td class="num">' + r[1] + '</td></tr>'; }).join('') + '</tbody>';
  })();

  /* ==================================================================
     9 · Vocabulario y compliance
     ================================================================== */
  (function vocab() {
    function words(list, cls) { return '<div class="words">' + list.map(function (w) { return '<span class="' + (cls || '') + '">' + w + '</span>'; }).join('') + '</div>'; }
    $('vocab').innerHTML =
      '<div><h4>Botões · maiúsculas curtas</h4>' + words(['TRUCO!', 'SEIS!', 'NOVE!', 'DOZE!', 'DEZ! (mineiro)'], 'shout') + '<div style="height:8px"></div>' + words(['ACEITAR', 'CORRER', 'JOGAR COBERTA', 'JOGAR', 'NÃO QUERO', 'JOGAR DE NOVO', 'VOLTAR', 'SAIR']) + '</div>' +
      '<div><h4>Placar</h4>' + words(['NÓS / ELES', '1v1: VOCÊ / ELE', 'Rodadas (os pontos)', 'Tentos (VALE)', 'Pontos (os números)', 'MANILHA 7', 'MANILHAS FIXAS', 'VALE 1 / 3 / 6 / 9 / 12', 'mineiro 2 / 4 / 6 / 10 / 12']) + '<p>"Rodada" é a vaza; não se usa para numerar partidas.</p></div>' +
      '<div><h4>Gritos e avisos</h4>' + words(['TRUCO!', 'DESCE!', 'TÔ FORA!', 'EMPACHOU!', 'GANHAMOS A MÃO', 'MÃO DE ONZE', 'MÃO DE DEZ', 'MÃO DE FERRO', 'VITÓRIA'], 'shout') + '<div style="height:8px"></div>' + words(['PERDEMOS A MÃO', 'DERROTA', 'Nós levamos a rodada', 'Eles correram! +1', 'Saiu o ZAP', 'Casal maior!', 'Mandou bem!', 'No truco, a sorte muda a cada mão.']) + '</div>' +
      '<div><h4>Rede e tempo</h4>' + words(['Reconectando…', 'Conexão perdida · tentando reconectar', 'Conexão restabelecida', 'Tempo esgotado: o sistema jogou por você', 'Mais uma jogada automática e você sai da mesa (derrota)']) + '</div>' +
      '<div><h4>Bloqueios suaves (toasts)</h4>' + words(['Não é sua vez.', 'Carta coberta só a partir da 2ª rodada.', 'Só o lado que aceitou pode aumentar.', 'Aguarde a resposta ao seu pedido.', 'Na mão de onze não se pede truco.', 'Na mão de ferro não há truco nem carta coberta.', 'Seu parceiro já respondeu.']) + '</div>' +
      '<div><h4>Compliance · o que não entra</h4>' + words(['grátis', 'ganhe dinheiro', 'robô (em mesas com dinheiro)', 'botequim / boteco', 'moedas', 'fichas', 'confete', 'bebidas', 'R$ como gancho'], 'no') + '<p>O valor da mesa e a taxa são dado no chip do header, sem sinais nem verbos. Pé legal "O jogo pode ser viciante. Jogue com responsabilidade. 18+." em todas as telas.</p></div>';
  })();

  /* ==================================================================
     10 · Checklist §11
     ================================================================== */
  $('checklist').innerHTML = [
    '<b>Todo elemento recebe a mesma luz</b> (mais claro em cima, mais escuro embaixo)? Se um está iluminado ao contrário, está colado.',
    '<b>Há alguma área grande preenchida de dourado?</b> Tirar. ≤ 4 % da área em ouro a 100 %, medido em captura.',
    '<b>Há mais de 6 palavras em Londrina na tela?</b> Passar as sobrantes a Gabarito.',
    '<b>Há alguma textura</b> (madeira, couro, foto, ladrilho, azulejo)? Tirar: só grão e luz.',
    '<b>A manilha invertida se reconhece</b> no banco a 28×41 e na cruz a 56×82 sem halo, contra o pano e contra um dorso? Se não, plano B: cantoneira.',
    '<b>Lê-se VALE e o placar a 60 cm</b> com o celular na mão? Aumentar antes de decorar.',
    '<b>Há confete, moedas, fichas, raios ou brilho em loop?</b> Tirar: a celebração é a luz.',
    '<b>Alguma palavra promete dinheiro</b>, diz "grátis" ou "boteco"? Reescrever.',
    '<b>O âmbar --lamp existe fora do botão TRUCO e do selo?</b> Tirar.',
    '<b>Em escala de cinza o dourado aparece como área?</b> Então há demais.',
    '<b>Num Android de gama média a 40 % de brilho</b> o pano segue verde e o fundo não é marrom sujo? Se não, subir --felt-hi ou ativar alto contraste.',
    '<b>Algo desaparece em um quadro?</b> Animar.'
  ].map(function (t) { return '<li><span>' + t + '</span></li>'; }).join('');
})();
