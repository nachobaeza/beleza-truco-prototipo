/* =====================================================================
   Beleza Truco · cards.js
   El mazo de 40 cartas como SVG generado por código. Implementa DESIGN §5:
   proporción 0,68 · radio 7 % · dos índices Gabarito · pip único · pips
   "trazo de carimbo" propios · figuras Q/J/K/A en Fraunces con emblema
   geométrico a dos tintas · régua de força · manilha invertida · zap · dorso.

   Uso:  window.BT.cardSVG({ rank:'7', suit:'paus', w:104 })  →  string <svg>
   Sin módulos ES: se carga como <script src="cards.js"> y expone window.BT.
   Los colores salen de tokens.css (var(--x, fallback)) para que la carta
   siga siendo correcta aunque el CSS no esté cargado.
   ===================================================================== */
(function () {
  'use strict';

  var SUITS = ['ouros', 'espadas', 'copas', 'paus'];
  var RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

  /* Fuerza de las comunes (régua de força, §5.3): 4→1 … 3→10. Manilha → 11. */
  var STRENGTH = { '4': 1, '5': 2, '6': 3, '7': 4, 'Q': 5, 'J': 6, 'K': 7, 'A': 8, '2': 9, '3': 10 };

  /* Orden entre manilhas (§5.4): ouros 1 · espadas 2 · copas 3 · paus 4 */
  var MANILHA_ORDER = { ouros: 1, espadas: 2, copas: 3, paus: 4 };

  /* Vocabulario pt-BR (§10) para la etiqueta accesible */
  var RANK_NAME = { '4': 'quatro', '5': 'cinco', '6': 'seis', '7': 'sete', 'Q': 'dama', 'J': 'valete', 'K': 'rei', 'A': 'ás', '2': 'dois', '3': 'três' };

  /* Tintas (§1.5). Rojo tijolo para copas/ouros, negro cálido para espadas/paus. */
  var INK = {
    ouros:   'var(--ink-red, #B8302C)',
    copas:   'var(--ink-red, #B8302C)',
    espadas: 'var(--ink-black, #1C1A17)',
    paus:    'var(--ink-black, #1C1A17)'
  };
  var C = {
    face:      'var(--card-face, #F4EAD5)',
    face2:     'var(--card-face-2, #EADFC6)',
    edge:      'var(--card-edge, rgba(28,26,23,.30))',
    brass:     'var(--ink-brass, #A8863F)',
    gold:      'var(--gold, #E9C46A)',
    goldDeep:  'var(--gold-deep, #B8903F)',
    goldHot:   'var(--gold-hot, #FFE3A1)',
    mFace:     'var(--manilha-face, #1C1A17)',
    mRing:     'var(--manilha-ring, #F4EAD5)',
    backGreen: 'var(--back-green, #0E3B2C)',
    backPat:   'var(--back-pattern, #155241)',
    backGold:  'var(--back-gold, #C9A85C)',
    backFrame: 'var(--back-frame, #F4EAD5)',
    fontUI:    "var(--font-ui, 'Gabarito', system-ui, sans-serif)",
    fontFig:   "var(--font-figure, 'Fraunces', Georgia, serif)",
    fontDisp:  "var(--font-display, 'Londrina Solid', 'Arial Narrow', Impact, sans-serif)"   /* sólo el monograma del dorso (§3.1: la marca grita) */
  };

  /* Geometría del viewBox: 68 × 100 (proporción 0,68) */
  var VW = 68, VH = 100;
  var RADIUS = VW * 0.07;          /* 4,76: radio 7 % del ancho */
  var CX = VW / 2, CY = VH / 2;

  /* ------------------------------------------------------------------
     Los cuatro pips, dibujados a mano en una caja 0..100 ("trazo de
     carimbo": contorno levemente asimétrico, sin brillo, mismo grosor en
     los cuatro gracias al stroke redondo del mismo color que el relleno).
     ------------------------------------------------------------------ */
  var PIP_PATH = {
    /* ♠ hoja de dos arcos + tallo recto */
    espadas: 'M50 5 C 57 19, 91 37, 92 59 C 93 75, 79 85, 66 81 C 58 78, 54 72, 52 66 L 56 94 L 44 94 L 48 66 C 46 72, 42 78, 33 81 C 21 85, 7 76, 8 60 C 9 38, 43 20, 50 5 Z',
    /* ♥ dos arcos + punta */
    copas:   'M50 93 C 31 75, 7 57, 7 33 C 7 17, 18 7, 30 7 C 40 7, 47 13, 50 21 C 53 13, 60 6, 71 7 C 83 8, 94 17, 93 33 C 92 57, 69 75, 50 93 Z',
    /* ♦ rombo 60/120 (lados levemente convexos, como tinta que se expande) */
    ouros:   'M50 4 Q 66 28, 77 50 Q 65 72, 50 96 Q 35 72, 23 50 Q 35 28, 50 4 Z',
    /* ♣ tres círculos en triángulo + tallo (un solo path con arcos) */
    paus:    'M29 31 A21 21 0 1 0 71 31 A21 21 0 1 0 29 31 Z ' +
             'M7.5 61 A20.5 20.5 0 1 0 48.5 61 A20.5 20.5 0 1 0 7.5 61 Z ' +
             'M50.5 62 A21.5 21.5 0 1 0 93.5 62 A21.5 21.5 0 1 0 50.5 62 Z ' +
             'M46 48 L 42.5 95 L 57.5 95 L 54 48 Z'   /* mismo sentido de giro que los círculos: sin huecos de winding */
  };

  function pip(suit, cx, cy, size, color, extraAttrs) {
    var s = size / 100;
    return '<g transform="translate(' + r2(cx - size / 2) + ' ' + r2(cy - size / 2) + ') scale(' + r4(s) + ')"' + (extraAttrs || '') + '>' +
      '<path d="' + PIP_PATH[suit] + '" style="fill:' + color + ';stroke:' + color + ';stroke-width:3;stroke-linejoin:round;stroke-linecap:round"/>' +
      '</g>';
  }

  /* Pip con filete exterior de otra tinta (A: pip grande con filete --ink-brass) */
  function pipOutlined(suit, cx, cy, size, fill, strokeColor, strokeUnits) {
    var s = size / 100;
    var sw = strokeUnits / s;   /* el stroke se expresa en la caja 0..100 para que valga strokeUnits en el viewBox */
    return '<g transform="translate(' + r2(cx - size / 2) + ' ' + r2(cy - size / 2) + ') scale(' + r4(s) + ')">' +
      '<path d="' + PIP_PATH[suit] + '" style="fill:none;stroke:' + strokeColor + ';stroke-width:' + r2(sw * 2 + 3) + ';stroke-linejoin:round"/>' +
      '<path d="' + PIP_PATH[suit] + '" style="fill:' + fill + ';stroke:' + fill + ';stroke-width:3;stroke-linejoin:round"/>' +
      '</g>';
  }

  /* ------------------------------------------------------------------
     Remate por palo (§5.3): círculos en paus, puntas en espadas, arcos en
     copas, rombos en ouros. (x,y) es el punto del remate; "dir" el ángulo
     hacia donde apunta (en grados, 0 = arriba).
     ------------------------------------------------------------------ */
  function terminal(suit, x, y, size, color, dir) {
    var rot = ' transform="translate(' + r2(x) + ' ' + r2(y) + ') rotate(' + (dir || 0) + ')"';
    var st = ' style="fill:' + color + '"';
    var h = size;
    switch (suit) {
      case 'paus':
        return '<circle cx="0" cy="0" r="' + r2(h * 0.55) + '"' + st + rot + '/>';
      case 'espadas':
        return '<path d="M0 ' + r2(-h) + ' L ' + r2(h * 0.6) + ' ' + r2(h * 0.4) + ' L ' + r2(-h * 0.6) + ' ' + r2(h * 0.4) + ' Z"' + st + rot + '/>';
      case 'copas':
        return '<path d="M' + r2(-h * 0.65) + ' ' + r2(h * 0.35) + ' A ' + r2(h * 0.65) + ' ' + r2(h * 0.65) + ' 0 0 1 ' + r2(h * 0.65) + ' ' + r2(h * 0.35) + ' Z"' + st + rot + '/>';
      case 'ouros':
      default:
        return '<path d="M0 ' + r2(-h) + ' L ' + r2(h * 0.6) + ' 0 L 0 ' + r2(h) + ' L ' + r2(-h * 0.6) + ' 0 Z"' + st + rot + '/>';
    }
  }

  /* ------------------------------------------------------------------
     Emblemas geométricos de Q / J / K (§5.3, dos tintas: palo + latón).
     Zona: centrados en x=34, entre y≈13 y y=46 (sobre la letra).
     ------------------------------------------------------------------ */
  function emblemQ(suit, ink, brass) {
    /* Abanico de tres hojas: el más ancho y bajo. Pip chico en la base. */
    var ox = CX, oy = 41;    /* origen del abanico */
    var out = '';
    var leaves = [[-72, 15], [0, 11.5], [72, 15]];   /* [ángulo, largo]: las laterales más largas → el más ancho */
    for (var i = 0; i < leaves.length; i++) {
      var a = leaves[i][0], len = leaves[i][1];
      out += '<g transform="translate(' + ox + ' ' + oy + ') rotate(' + a + ')">' +
        '<path d="M0 -3 C 4.5 -6, 5.5 ' + r2(-len * 0.72) + ', 0 ' + r2(-len) + ' C -5.5 ' + r2(-len * 0.72) + ', -4.5 -6, 0 -3 Z" style="fill:' + brass + '"/>' +
        terminal(suit, 0, -len - 1.2, 1.9, ink, 0) +
        '</g>';
    }
    out += pip(suit, ox, oy + 2.5, 9, ink);
    return out;
  }

  function emblemJ(suit, ink, brass) {
    /* Lanza vertical con el pip como punta: la figura más alta (J > Q). */
    var x = CX;
    var out = '';
    out += '<rect x="' + r2(x - 1.3) + '" y="21" width="2.6" height="25" rx="1.3" style="fill:' + brass + '"/>';          /* asta */
    out += '<rect x="' + r2(x - 8.5) + '" y="35.5" width="17" height="2.4" rx="1.2" style="fill:' + brass + '"/>';        /* guarda */
    out += terminal(suit, x - 9.5, 36.7, 1.9, ink, -90);
    out += terminal(suit, x + 9.5, 36.7, 1.9, ink, 90);
    out += pip(suit, x, 17.5, 10, ink);                                                                                     /* punta */
    return out;
  }

  function emblemK(suit, ink, brass) {
    /* Corona de tres triángulos con el pip como joya. */
    var x = CX, base = 44;
    var out = '';
    out += '<path d="M' + r2(x - 14) + ' ' + base + ' L ' + r2(x - 14) + ' ' + (base - 3) + ' L ' + r2(x - 9.5) + ' 29 L ' + r2(x - 4.5) + ' ' + (base - 3) +
      ' L ' + x + ' 24 L ' + r2(x + 4.5) + ' ' + (base - 3) + ' L ' + r2(x + 9.5) + ' 29 L ' + r2(x + 14) + ' ' + (base - 3) + ' L ' + r2(x + 14) + ' ' + base + ' Z" style="fill:' + brass + '"/>';
    out += '<rect x="' + r2(x - 14) + '" y="' + (base - 1.2) + '" width="28" height="1.2" style="fill:' + ink + '"/>';  /* filete de la base */
    out += terminal(suit, x - 9.5, 27.6, 1.7, ink, 0);
    out += terminal(suit, x, 22.5, 1.7, ink, 0);
    out += terminal(suit, x + 9.5, 27.6, 1.7, ink, 0);
    out += pip(suit, x, 37, 8.5, ink);                                                                                     /* joya */
    return out;
  }

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  function r2(n) { return Math.round(n * 100) / 100; }
  function r4(n) { return Math.round(n * 10000) / 10000; }
  function uid() { return 'bt' + Math.random().toString(36).slice(2, 8); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function roundedRect(x, y, w, h, rx, style, extra) {
    return '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(w) + '" height="' + r2(h) + '" rx="' + r2(rx) + '" ry="' + r2(rx) + '" style="' + style + '"' + (extra || '') + '/>';
  }

  /* ------------------------------------------------------------------
     cardSVG(opts)
       rank    '4'…'3' (ver RANKS)         suit  'ouros'|'espadas'|'copas'|'paus'
       w       ancho en px (alto = w/0,68)  manilha  true → carta invertida (§5.4)
       zap     true → marco interior encendido (sólo tiene sentido con manilha)
       dots    0..4 puntos de oro (si es manilha y no se pasa, se deduce del palo)
       back    true → dorso (§5.6)         rule   true → régua de força encendida
       label   true → <title> + aria-label en pt-BR
       cls     clases CSS extra para el <svg> (opcional; p. ej. sombra por contexto)
     Devuelve un string <svg> con viewBox 0 0 68 100 escalado por w.
     ------------------------------------------------------------------ */
  function cardSVG(opts) {
    opts = opts || {};
    var w = Number(opts.w) || 104;
    var h = w / 0.68;
    var id = uid();
    var px = function (n) { return n * VW / w; };   /* px CSS → unidades del viewBox */
    var label = opts.label !== false;

    var rank = String(opts.rank || '7').toUpperCase();
    var suit = SUITS.indexOf(opts.suit) >= 0 ? opts.suit : 'paus';
    if (RANKS.indexOf(rank) < 0) rank = '7';

    var open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VW + ' ' + VH + '" width="' + r2(w) + '" height="' + r2(h) + '" class="bt-card' +
      (opts.back ? ' is-back' : '') + (opts.manilha ? ' is-manilha' : '') + (opts.zap ? ' is-zap' : '') +
      (opts.cls ? ' ' + esc(opts.cls) : '') + '"' +
      ' data-rank="' + esc(rank) + '" data-suit="' + esc(suit) + '"';

    /* ========================= DORSO (§5.6) ========================= */
    if (opts.back) {
      var frame = VW * 0.06;                 /* marco crema del 6 % del ancho */
      var med = VW * 0.28 / 2;               /* medallón: 28 % del ancho → radio */
      var titleBack = label ? '<title>carta coberta</title>' : '';
      var s = open + (label ? ' role="img" aria-label="carta coberta"' : ' aria-hidden="true"') + '>' + titleBack +
        '<defs>' +
        '<pattern id="' + id + '-pat" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">' +
          pip('espadas', 4, 4, 5.2, C.backPat) + pip('copas', 12, 4, 5.2, C.backPat) +
          pip('ouros', 4, 12, 5.2, C.backPat) + pip('paus', 12, 12, 5.2, C.backPat) +
        '</pattern>' +
        '<clipPath id="' + id + '-clip">' + roundedRect(frame, frame, VW - 2 * frame, VH - 2 * frame, RADIUS - frame, '') + '</clipPath>' +
        '</defs>' +
        /* borde + marco crema */
        roundedRect(px(.5), px(.5), VW - px(1), VH - px(1), RADIUS, 'fill:' + C.backFrame + ';stroke:' + C.edge + ';stroke-width:' + r2(px(1))) +
        /* campo verde con trama */
        roundedRect(frame, frame, VW - 2 * frame, VH - 2 * frame, RADIUS - frame, 'fill:' + C.backGreen) +
        '<g clip-path="url(#' + id + '-clip)"><rect x="0" y="0" width="' + VW + '" height="' + VH + '" style="fill:url(#' + id + '-pat)"/></g>' +
        /* filete interior de latón 1 px */
        roundedRect(frame + px(.5), frame + px(.5), VW - 2 * frame - px(1), VH - 2 * frame - px(1), RADIUS - frame, 'fill:none;stroke:' + C.brass + ';stroke-width:' + r2(px(1)) + ';opacity:.9') +
        /* medallón central (28 % del ancho, §5.6): UN solo filete de 1 px --back-gold sobre --back-green,
           sin segundo anillo, y el monograma en Londrina Solid 900 (la letra de letrero: la marca grita, §3.1;
           Fraunces queda sólo para Q J K A). Dos anillos + serif se leían como ficha de casino (revisión 1). */
        '<circle cx="' + CX + '" cy="' + CY + '" r="' + r2(med) + '" style="fill:' + C.backGreen + ';stroke:' + C.backGold + ';stroke-width:' + r2(px(1)) + ';opacity:.92"/>' +
        '<text x="' + CX + '" y="' + r2(CY + 0.4) + '" text-anchor="middle" dominant-baseline="central" style="font-family:' + C.fontDisp + ";font-weight:900;font-size:" + r2(med * 1.7) + 'px;fill:' + C.backGold + '">B</text>' +
        '</svg>';
      return s;
    }

    /* ========================= CARA ========================= */
    var manilha = !!opts.manilha;
    var zap = !!opts.zap;
    var ink = manilha ? C.gold : INK[suit];          /* tinta del palo; en manilha todo oro */
    var brass = manilha ? C.goldDeep : C.brass;      /* segunda tinta; en manilha, oro profundo (sigue siendo oro) */
    var face = manilha ? C.mFace : C.face;
    var dots = manilha ? (opts.dots == null ? MANILHA_ORDER[suit] : Math.max(0, Math.min(4, opts.dots | 0))) : 0;

    var name = RANK_NAME[rank] + ' de ' + suit + (manilha ? (zap ? ' (manilha, zap)' : ' (manilha)') : '');
    var s = open + (label ? ' role="img" aria-label="' + esc(name) + '"' : ' aria-hidden="true"') + '>';
    if (label) s += '<title>' + esc(name) + '</title>';

    /* defs: viñeta de la cara (2 % hacia los bordes: papel, no plástico) */
    s += '<defs>' +
      '<radialGradient id="' + id + '-face" cx="50%" cy="42%" r="70%">' +
        '<stop offset="55%" style="stop-color:' + face + '"/>' +
        '<stop offset="100%" style="stop-color:' + (manilha ? '#171512' : C.face2) + '"/>' +
      '</radialGradient>' +
      '</defs>';

    /* --- capa face: cara + borde (manilha: filete exterior crema 1,5 px) --- */
    var edgeW = manilha ? px(1.5) : px(1);
    s += roundedRect(edgeW / 2, edgeW / 2, VW - edgeW, VH - edgeW, RADIUS - edgeW / 2,
      'fill:url(#' + id + '-face);stroke:' + (manilha ? C.mRing : C.edge) + ';stroke-width:' + r2(edgeW));

    /* --- capa zap: marco interior encendido a 4 % del borde --- */
    if (zap) {
      var inset = VW * 0.04 + edgeW;
      s += roundedRect(inset, inset, VW - 2 * inset, VH - 2 * inset, Math.max(1.5, RADIUS - inset),
        'fill:none;stroke:' + C.goldHot + ';stroke-width:' + r2(px(1.5)));
    }

    /* --- capa rule: régua de força, 10 segmentos (11 llena en manilha) --- */
    if (opts.rule) {
      var segs = manilha ? 11 : 10;
      var filled = manilha ? 11 : STRENGTH[rank];
      var ruleX = 6, ruleW = 38, ruleY = 91.5, ruleH = 1.5, gap = 0.7;
      var segW = (ruleW - gap * (segs - 1)) / segs;
      var ruleAlpha = manilha ? .55 : 'var(--rank-rule-alpha, .22)';   /* TOKEN NUEVO: sobre negro el 22 % no se ve; .55 en manilha */
      var emptyAlpha = manilha ? .18 : .08;
      s += '<g class="bt-rule">';
      for (var i = 0; i < segs; i++) {
        s += '<rect x="' + r2(ruleX + i * (segW + gap)) + '" y="' + ruleY + '" width="' + r2(segW) + '" height="' + ruleH + '" style="fill:' + ink + ';opacity:' + (i < filled ? ruleAlpha : emptyAlpha) + '"/>';
      }
      s += '</g>';
    }

    /* --- capa index: Gabarito 800, 18 % del alto + pip chico al 9 % --- */
    var indexGroup = '<text x="5.5" y="18.2" style="font-family:' + C.fontUI + ';font-weight:800;font-size:18px;letter-spacing:-.02em;fill:' + ink + '">' + rank + '</text>' +
      pip(suit, 11, 26, 9, ink);
    s += '<g class="bt-index">' + indexGroup + '</g>';
    /* índice espejado abajo-derecha, girado 180°, al 55 % (en la Q baja a .45: la cola de Fraunces pasa a
       ~2 unidades de su esquina y así no compiten; revisión 1) */
    s += '<g class="bt-index bt-index-mirror" transform="rotate(180 ' + CX + ' ' + CY + ')" style="opacity:' + (rank === 'Q' ? '.45' : '.55') + '">' + indexGroup + '</g>';

    /* --- capa pip / figure --- */
    var isFigure = (rank === 'Q' || rank === 'J' || rank === 'K' || rank === 'A');
    if (!isFigure) {
      s += pip(suit, CX, CY, VW * 0.38, ink);                          /* pip único centrado, 38 % del ancho */
      if (rank === '2') s += pip(suit, CX, 29, 9, ink);                 /* duque: un pip chico encima */
      if (rank === '3') s += pip(suit, CX - 7, 29, 9, ink) + pip(suit, CX + 7, 29, 9, ink);  /* terno: dos */
    } else {
      /* letra Fraunces 700 al 46 % del alto, abajo del emblema. Las cuatro letras comparten el mismo centro
         (CX − 2,5: la tinta de K/J cae 0,75 a la derecha del ancla) para que Q J K A queden alineadas.
         La Q de Fraunces tiene cola abajo-derecha (baja 7 unidades por debajo de la línea base, entre x +4 y
         +16,5 del centro, medido): en vez de correrla a la izquierda, se sube 2 unidades (el bowl queda 2 por
         encima de la base de K: 3 px a 104, invisible) y se recorta la letra 2 unidades antes del índice
         espejado (que arranca en x ≈ 49,4) para que la punta de la cola nunca lo toque. */
      var lx = CX - 2.5, ly = rank === 'Q' ? 75 : 77;
      var figClip = '';
      if (rank === 'Q') {
        var mirrorLeft = VW - (5.5 + 13.1);   /* 68 − (x del índice + ancho de "Q" en Gabarito 800 18 px) ≈ 49,4 */
        s += '<defs><clipPath id="' + id + '-q"><rect x="0" y="0" width="' + r2(mirrorLeft - 2) + '" height="' + VH + '"/></clipPath></defs>';
        figClip = ' clip-path="url(#' + id + '-q)"';
      }
      s += '<text x="' + r2(lx) + '" y="' + ly + '" text-anchor="middle"' + figClip + ' style="font-family:' + C.fontFig + ';font-weight:700;font-size:46px;font-variation-settings:\'SOFT\' 0,\'WONK\' 0;fill:' + ink + '">' + rank + '</text>';
      if (rank === 'Q') s += '<g class="bt-emblem">' + emblemQ(suit, ink, brass) + '</g>';
      if (rank === 'J') s += '<g class="bt-emblem">' + emblemJ(suit, ink, brass) + '</g>';
      if (rank === 'K') s += '<g class="bt-emblem">' + emblemK(suit, ink, brass) + '</g>';
      if (rank === 'A') s += '<g class="bt-emblem">' + pipOutlined(suit, CX, 27.5, VW * 0.46, ink, brass, px(1.5)) + '</g>';  /* pip 46 % con filete latón */
    }

    /* --- capa dots: orden entre manilhas, esquina superior derecha --- */
    if (manilha && dots > 0) {
      /* 3 px reales, pero acotados en unidades del viewBox: nunca menos de 2,4 (a 104 px) ni más de 4,5
         (a 28 px, 3 px serían 7,3 unidades y los 4 puntos del zap llegaban hasta el índice). Paso 1,4·d:
         los 4 puntos ocupan como máximo x 38–61,5 y el índice termina en x ≈ 20 (revisión 1). */
      var d = Math.min(Math.max(px(3), 2.4), 4.5);
      var step = d * 1.4;
      s += '<g class="bt-dots">';
      for (var k = 0; k < dots; k++) {
        s += '<circle cx="' + r2(VW - 6.5 - d / 2 - k * step) + '" cy="' + r2(6.8 + d / 2) + '" r="' + r2(d / 2) + '" style="fill:' + C.gold + '"/>';
      }
      s += '</g>';
    }

    s += '</svg>';
    return s;
  }

  /* ------------------------------------------------------------------
     Utilidades de reglas (§5.4 / reglas-y-estados): qué valor es manilha
     para una vira (paulista) y las cuatro fijas de mineiro.
     ------------------------------------------------------------------ */
  function manilhaFor(vira) {
    var i = RANKS.indexOf(String(vira).toUpperCase());
    return i < 0 ? null : RANKS[(i + 1) % RANKS.length];
  }
  var MINEIRO_FIXED = [
    { rank: '4', suit: 'paus' },     /* zap */
    { rank: '7', suit: 'copas' },
    { rank: 'A', suit: 'espadas' },  /* espadilha */
    { rank: '7', suit: 'ouros' }     /* pica-fumo */
  ];

  window.BT = {
    SUITS: SUITS,
    RANKS: RANKS,
    STRENGTH: STRENGTH,
    MANILHA_ORDER: MANILHA_ORDER,
    MINEIRO_FIXED: MINEIRO_FIXED,
    cardSVG: cardSVG,
    manilhaFor: manilhaFor
  };
})();
