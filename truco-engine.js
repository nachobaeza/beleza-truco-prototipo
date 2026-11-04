/* ============================================================================
   Beleza Truco · truco-engine.js
   Motor de reglas del truco paulista y mineiro, SIN DOM.
   Se carga como <script src="truco-engine.js"> (expone window.TrucoEngine) o
   con require() en node (module.exports) para los tests.

   Fuentes: investigacion/reglas-y-estados-de-la-mesa.md (§1-§8, §13),
   investigacion/00-Sintesis-referencias.md §5 ("Reglas por defecto que el
   prototipo asume") y DESIGN.md §9 (IDs de estado E-xx) y §10 (vocabulario).

   Decisiones documentadas (donde las fuentes se contradicen mandan las
   "reglas por defecto"):
   - Tres rodadas empatadas → MANO ANULADA: nadie puntúa (Joga Truco, Jogos do
     Rei, MegaJogos, reglamento UFFS). El mão rota igual. En mão de ferro eso
     significa "vai outra" mão de ferro, porque el marcador sigue 11 a 11.
   - Correr sin pedido pendiente, en el propio turno: permitido (Joga Truco);
     el rival suma el valor vigente de la mano. No permitido en mão de ferro.
     Es una intención distinta de "responder a un pedido": va por run(seat).
     respond(seat, 'correr') sólo responde a un pedido pendiente; si no hay
     pedido y el parceiro ya respondió en esta rodada, bloquea con el toast
     "Seu parceiro já respondeu." (una respuesta que llega con latencia nunca
     se convierte en un correr voluntario que regala el valor ya aumentado).
   - Mão de onze en 2v2: basta UNO para jogar; para correr tienen que correr
     los dos (Jogos do Rei). En el prototipo, si el humano está en la dupla,
     el bot espera la decisión del humano (pendingBotSeat devuelve null).
   - Pedido en 2v2: vale la primera respuesta de cualquiera de la dupla rival.
     Si el humano está en la dupla que responde, responde él (el motor no
     le pide al bot compañero).
   - Pedido: sólo en turno propio y antes de bajar carta; después de un
     aumento aceptado sólo puede subir el lado que aceptó (nadie pide dos
     veces seguidas). Pedir congela la mano hasta la respuesta.
   - Jugada automática por tiempo: carta más débil (en ferro, una al azar) o
     correr del pedido pendiente / de la mão de onze. Cuenta automáticas
     seguidas: 2.ª avisa (E-62), 3.ª = abandono (E-63) y fin de partida.
   - Puntos por encima de 12 no cuentan (se recortan a 12).

   API (ver también el README al final del archivo):
     const g = new TrucoEngine.Game({variant:'paulista'|'mineiro',
                                     mode:'1v1'|'2v2', seed:123, humanSeat:0});
     g.on('E-11 cardPlayed', fn) · g.on('*', (name, payload) => …) · g.off()
     g.start()
     g.play(seat, cardIndex, {coberta})
     g.call(seat)                       → pide el siguiente escalón
     g.respond(seat, 'aceitar'|'aumentar'|'correr')  → SÓLO responde a un pedido
     g.run(seat)                        → correr voluntario de la mano (turno propio)
     g.onzeDecision(seat, 'jogar'|'correr')
     g.timeoutPlay(seat)                → jugada automática (E-61)
     g.botAct(seat) / g.pendingBotSeat() / TrucoEngine.bot(seat, state, rng)
     g.state({viewer}) → snapshot serializable
     g.legalActions(seat)
     g.nextHand()                       → sólo si autoNextHand:false
   ============================================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.TrucoEngine = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  /* ----------------------------------------------------------------------
     1. Constantes del juego
     ---------------------------------------------------------------------- */

  // Orden de las cartas comunes, de la más débil a la más fuerte (índice = fuerza 0..9).
  const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
  // Orden de los palos entre manilhas, del más débil al más fuerte.
  const SUITS = ['ouros', 'espadas', 'copas', 'paus'];
  const SUIT_LETTER = { ouros: 'o', espadas: 'e', copas: 'c', paus: 'p' };
  const SUIT_SYMBOL = { ouros: '♦', espadas: '♠', copas: '♥', paus: '♣' };
  const SUIT_NICK = { ouros: 'pica-fumo', espadas: 'espadilha', copas: 'copas', paus: 'zap' };
  const RANK_NAME = {
    '4': 'quatro', '5': 'cinco', '6': 'seis', '7': 'sete', 'Q': 'dama',
    'J': 'valete', 'K': 'rei', 'A': 'ás', '2': 'dois', '3': 'três'
  };
  const TEAM_NAMES = ['NÓS', 'ELES'];
  const TEAM_NAMES_1V1 = ['VOCÊ', 'ELE'];
  const MAX_AUTOPLAYS = 3;

  // Vocabulario por modo (DESIGN §10): en 2v2 se habla en plural (nós / eles),
  // en 1v1 en singular (você / ele). El equipo 0 es siempre el del humano y
  // habla en 1.ª persona ("Corri", "Corremos"); el 1 en 3.ª ("Ele correu",
  // "Eles correram"). Único lugar donde se conjuga: el resto del motor (y la
  // UI, vía state().vocab) lo consume de acá.
  function vocab(n) {
    const one = n === 2;
    return {
      us: one ? 'você' : 'nós',
      them: one ? 'ele' : 'eles',
      // texto del botón/aria CORRER: a quién le da los puntos
      themGain: one ? 'ele ganha' : 'eles ganham',
      ran: [one ? 'Corri' : 'Corremos', one ? 'Ele correu!' : 'Eles correram!'],
      accepted: [one ? 'Aceitei!' : 'Aceitamos!', one ? 'Aceitou!' : 'Aceitaram!'],
      wonHand: one ? 'GANHEI A MÃO' : 'GANHAMOS A MÃO',
      lostHand: one ? 'PERDI A MÃO' : 'PERDEMOS A MÃO'
    };
  }
  // 'Ele' / 'Eles' / 'Você' con mayúscula inicial para arrancar una frase.
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  const VARIANTS = {
    paulista: {
      chain: [1, 3, 6, 9, 12],
      names: ['', 'TRUCO', 'SEIS', 'NOVE', 'DOZE'],
      special: 11,          // umbral de la mão de onze / ferro
      specialName: 'MÃO DE ONZE',
      fixedManilhas: null   // manilha = siguiente a la vira
    },
    mineiro: {
      chain: [2, 4, 6, 10, 12],
      names: ['', 'TRUCO', 'SEIS', 'DEZ', 'DOZE'],
      special: 10,
      specialName: 'MÃO DE DEZ',
      // zap > copeta > espadilha > pica-fumo (fuerzas 13, 12, 11, 10)
      fixedManilhas: ['4p', '7c', 'Ae', '7o']
    }
  };

  // Textos exactos de DESIGN §9 fila I (bloqueos suaves)
  const TOAST = {
    notYourTurn: 'Não é sua vez.',
    cobertaRound1: 'Carta coberta só a partir da 2ª rodada.',
    onlyAccepterRaises: 'Só o lado que aceitou pode aumentar.',
    awaitResponse: 'Aguarde a resposta ao seu pedido.',
    noTrucoOnze: 'Na mão de onze não se pede truco.',
    noTrucoFerro: 'Na mão de ferro não há truco nem carta coberta.',
    partnerAnswered: 'Seu parceiro já respondeu.',
    autoPlay: 'Tempo esgotado: o sistema jogou por você',
    autoPlayWarning: 'Mais uma jogada automática e você sai da mesa (derrota)'
  };

  /* ----------------------------------------------------------------------
     2. RNG inyectable (mulberry32) y mazo
     ---------------------------------------------------------------------- */

  function makeRng(seed) {
    if (typeof seed === 'function') return seed;
    let a = (seed === undefined || seed === null)
      ? (Math.floor(Math.random() * 0xffffffff) >>> 0)
      : (seed >>> 0);
    return function rng() {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCard(rank, suit) {
    return { id: rank + SUIT_LETTER[suit], rank: rank, suit: suit };
  }

  function makeDeck() {
    const deck = [];
    for (const suit of SUITS) for (const rank of RANKS) deck.push(makeCard(rank, suit));
    return deck; // 40 cartas
  }

  function shuffle(deck, rng) {
    const d = deck.slice();
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = d[i]; d[i] = d[j]; d[j] = tmp;
    }
    return d;
  }

  function parseCard(id) {
    const rank = id[0];
    const suit = SUITS.find((s) => SUIT_LETTER[s] === id[1]);
    if (RANKS.indexOf(rank) < 0 || !suit) throw new Error('Carta inválida: ' + id);
    return makeCard(rank, suit);
  }

  /* ----------------------------------------------------------------------
     3. Fuerza de las cartas
     ---------------------------------------------------------------------- */

  // Rango de la manilha paulista a partir de la vira (ciclo 4 5 6 7 Q J K A 2 3 → 4).
  function manilhaRankFor(viraRank) {
    const i = RANKS.indexOf(viraRank);
    if (i < 0) throw new Error('Vira inválida: ' + viraRank);
    return RANKS[(i + 1) % RANKS.length];
  }

  // ctx = { variant, manilhaRank }. Devuelve 0..9 comunes, 10..13 manilhas.
  function cardStrength(card, ctx) {
    const v = VARIANTS[ctx.variant];
    if (v.fixedManilhas) {
      const k = v.fixedManilhas.indexOf(card.id);
      if (k >= 0) return 13 - k;
      return RANKS.indexOf(card.rank);
    }
    if (card.rank === ctx.manilhaRank) return 10 + SUITS.indexOf(card.suit);
    return RANKS.indexOf(card.rank);
  }

  function isManilha(card, ctx) { return cardStrength(card, ctx) >= 10; }

  function isZap(card, ctx) { return isManilha(card, ctx) && card.suit === 'paus'; }

  // Compara dos cartas: >0 si a gana, <0 si b gana, 0 empate.
  function compareCards(a, b, ctx) { return cardStrength(a, ctx) - cardStrength(b, ctx); }

  function manilhaIds(ctx) {
    const v = VARIANTS[ctx.variant];
    if (v.fixedManilhas) return v.fixedManilhas.slice();
    // de la más fuerte a la más débil: paus, copas, espadas, ouros
    return SUITS.slice().reverse().map((s) => ctx.manilhaRank + SUIT_LETTER[s]);
  }

  function cardInfo(card, ctx) {
    const s = cardStrength(card, ctx);
    const m = s >= 10;
    return {
      id: card.id,
      rank: card.rank,
      suit: card.suit,
      symbol: SUIT_SYMBOL[card.suit],
      strength: s,
      isManilha: m,
      isZap: m && card.suit === 'paus',
      name: RANK_NAME[card.rank] + ' de ' + card.suit + (m ? ' (manilha)' : ''),
      nick: m ? SUIT_NICK[card.suit] : null
    };
  }

  /* ----------------------------------------------------------------------
     4. Resultado de la mano a partir de las rodadas (reglas de empate)
        rounds: [{ tie:boolean, winnerTeam:0|1|null }]
        Devuelve { done, winnerTeam } · winnerTeam null con done = mano anulada.
     ---------------------------------------------------------------------- */

  function handOutcome(rounds) {
    const n = rounds.length;
    if (n === 0) return { done: false, winnerTeam: null };
    const r1 = rounds[0];
    if (r1.tie) {
      // Empate en la 1.ª: decide la 2.ª; si también empata, la 3.ª; si las tres empatan, anulada.
      if (n < 2) return { done: false, winnerTeam: null };
      if (!rounds[1].tie) return { done: true, winnerTeam: rounds[1].winnerTeam };
      if (n < 3) return { done: false, winnerTeam: null };
      return { done: true, winnerTeam: rounds[2].tie ? null : rounds[2].winnerTeam };
    }
    // La 1.ª tuvo ganador A.
    const A = r1.winnerTeam;
    if (n < 2) return { done: false, winnerTeam: null };
    if (rounds[1].tie || rounds[1].winnerTeam === A) return { done: true, winnerTeam: A };
    // Una para cada lado: decide la 3.ª; si empata, gana quien ganó la 1.ª.
    if (n < 3) return { done: false, winnerTeam: null };
    return { done: true, winnerTeam: rounds[2].tie ? A : rounds[2].winnerTeam };
  }

  /* ----------------------------------------------------------------------
     5. La partida
     ---------------------------------------------------------------------- */

  class Game {
    constructor(opts) {
      opts = opts || {};
      this.variant = opts.variant || 'paulista';
      if (!VARIANTS[this.variant]) throw new Error('Variante desconocida: ' + this.variant);
      this.mode = opts.mode || '2v2';
      if (this.mode !== '1v1' && this.mode !== '2v2') throw new Error('Modo desconocido: ' + this.mode);
      this.n = this.mode === '1v1' ? 2 : 4;
      this.humanSeat = (opts.humanSeat === undefined) ? 0 : opts.humanSeat; // null = todos bots
      this.seed = opts.seed;
      this.rng = makeRng(opts.seed);
      this.target = opts.target || 12;
      this.autoNextHand = opts.autoNextHand !== false;
      this.ferroAsClaras = !!opts.ferroAsClaras;
      this.maxHands = opts.maxHands || 1000; // red de seguridad contra bucles
      this.names = opts.names || (this.n === 2
        ? ['Você', 'Rival']
        : ['Você', 'Rival 1', 'Parceiro', 'Rival 2']);
      // Opciones para demos y tests: primer mão fijo, marcador inicial y mazo armado.
      this.firstMao = (typeof opts.mao === 'number') ? opts.mao : null;
      // opts.deck: array de ids (sólo mano 1) o función (handNumber, rng) → array de ids | null.
      // El mazo se reparte desde el índice 0: una carta por asiento desde el mão, tres vueltas, y después la vira.
      this.deckFn = typeof opts.deck === 'function' ? opts.deck
        : Array.isArray(opts.deck) ? ((num) => (num === 1 ? opts.deck : null)) : null;

      this.V = VARIANTS[this.variant];
      this.W = vocab(this.n); // vocabulario del modo (plural en 2v2, singular en 1v1)
      this.listeners = {};
      this.phase = 'lobby'; // lobby · onze · playing · awaitingResponse · handEnd · matchEnd
      this.pontos = [0, 0];
      if (Array.isArray(opts.pontos)) this.pontos = [opts.pontos[0] | 0, opts.pontos[1] | 0];
      else if (opts.pontos && typeof opts.pontos === 'object') this.pontos = [opts.pontos.nos | 0, opts.pontos.eles | 0];
      this.handNumber = 0;
      this.mao = null;
      this.hand = null;
      this.winner = null;
      this.autoPlays = new Array(this.n).fill(0);
      this.history = [];
      this.stats = { handsWon: [0, 0], accepted: 0, ran: [0, 0] };
    }

    /* ---- eventos ------------------------------------------------------- */

    on(name, fn) {
      (this.listeners[name] = this.listeners[name] || []).push(fn);
      return this;
    }

    off(name, fn) {
      if (!name) { this.listeners = {}; return this; }
      if (!fn) { delete this.listeners[name]; return this; }
      this.listeners[name] = (this.listeners[name] || []).filter((f) => f !== fn);
      return this;
    }

    emit(name, payload) {
      payload = payload || {};
      (this.listeners[name] || []).slice().forEach((fn) => fn(payload, name));
      (this.listeners['*'] || []).slice().forEach((fn) => fn(name, payload));
    }

    toast(text, seat, code) {
      this.emit('I toast', { text: text, seat: seat, code: code });
      return { ok: false, reason: code, toast: text };
    }

    /* ---- helpers de asientos ------------------------------------------- */

    teamOf(seat) { return seat % 2; }
    teamSeats(team) {
      const out = [];
      for (let s = 0; s < this.n; s++) if (s % 2 === team) out.push(s);
      return out;
    }
    partnerOf(seat) { return this.n === 4 ? (seat + 2) % 4 : null; }
    nextSeat(seat) { return (seat + 1) % this.n; }
    isBot(seat) { return seat !== this.humanSeat; }
    teamName(team) { return (this.n === 2 ? TEAM_NAMES_1V1 : TEAM_NAMES)[team]; }
    // 'nós'/'eles' en 2v2 · 'você'/'ele' en 1v1 (minúscula, para frases).
    teamWord(team) { return team === 0 ? this.W.us : this.W.them; }
    // "Corri. Ele +1" / "Corremos. Eles +1" / "Ele correu! +1" / "Eles correram! +1"
    _ranText(team, points) {
      return team === 0
        ? this.W.ran[0] + '. ' + cap(this.W.them) + ' +' + points
        : this.W.ran[1] + ' +' + points;
    }
    ctx() { return { variant: this.variant, manilhaRank: this.hand ? this.hand.manilhaRank : null }; }
    pontosObj() { return { nos: this.pontos[0], eles: this.pontos[1] }; }

    /* ---- arranque ------------------------------------------------------ */

    start() {
      if (this.phase !== 'lobby') throw new Error('La partida ya empezó');
      this.emit('E-02 matchStart', {
        variant: this.variant, mode: this.mode, seats: this.n,
        humanSeat: this.humanSeat, names: this.names.slice(), target: this.target,
        chain: this.V.chain.slice(), chainNames: this.V.names.slice()
      });
      this.mao = this.firstMao !== null ? this.firstMao : Math.floor(this.rng() * this.n);
      this.emit('E-03 maoSorteada', { seat: this.mao, name: this.names[this.mao], team: this.teamOf(this.mao) });
      this._newHand();
      return this;
    }

    // Sólo hace falta si la partida se creó con autoNextHand:false.
    nextHand() {
      if (this.phase !== 'handEnd') return { ok: false, reason: 'phase' };
      this._newHand();
      return { ok: true };
    }

    _newHand() {
      if (this.handNumber >= this.maxHands) throw new Error('Demasiadas manos: posible bucle');
      this.handNumber++;
      const th = this.V.special;
      const a = this.pontos[0] >= th, b = this.pontos[1] >= th;
      const special = (a && b) ? 'ferro' : (a || b) ? 'onze' : 'normal';
      const order = [];
      for (let i = 0; i < this.n; i++) order.push((this.mao + i) % this.n);
      const pe = order[this.n - 1];

      let deck = null;
      if (this.deckFn) {
        const ids = this.deckFn(this.handNumber, this.rng);
        if (ids) {
          deck = ids.map(parseCard);
          const seen = {};
          deck.forEach((c) => { if (seen[c.id]) throw new Error('Carta repetida en el mazo armado: ' + c.id); seen[c.id] = true; });
          makeDeck().forEach((c) => { if (!seen[c.id]) deck.push(c); }); // completa con las que faltan
        }
      }
      if (!deck) deck = shuffle(makeDeck(), this.rng);
      const cards = [];
      for (let s = 0; s < this.n; s++) cards.push([]);
      let k = 0;
      for (let c = 0; c < 3; c++) for (const s of order) cards[s].push(deck[k++]);
      let vira = null, manilhaRank = null;
      if (!this.V.fixedManilhas) {
        vira = deck[k++];
        manilhaRank = manilhaRankFor(vira.rank);
      }

      const h = this.hand = {
        number: this.handNumber,
        mao: this.mao,
        pe: pe,
        order: order,
        special: special,
        onzeTeam: special === 'onze' ? (a ? 0 : 1) : null,
        onzeDecisions: {},
        blind: special === 'ferro',
        vira: vira,
        manilhaRank: manilhaRank,
        cards: cards,
        dealt: cards.map((h) => h.slice()),
        value: special === 'onze' ? this.V.chain[1] : this.V.chain[0],
        level: 0,
        lastCallerTeam: null,
        pending: null,
        lastResponse: null,
        requestSerial: 0,
        round: null,
        rounds: [],
        result: null
      };
      const ctx = this.ctx();
      h.manilhaIds = manilhaIds(ctx);

      const dealCards = {};
      for (let s = 0; s < this.n; s++) dealCards[s] = cards[s].map((c) => cardInfo(c, ctx));
      this.emit('E-04 deal', {
        hand: h.number, mao: h.mao, pe: h.pe, order: order.slice(),
        cards: dealCards, vira: vira ? cardInfo(vira, ctx) : null,
        special: special, blind: h.blind, value: h.value, pontos: this.pontosObj()
      });
      this.emit('E-05 manilha', {
        rank: manilhaRank, fixed: !!this.V.fixedManilhas, ids: h.manilhaIds.slice(),
        vira: vira ? cardInfo(vira, ctx) : null,
        nicks: { paus: 'zap', copas: 'copas', espadas: 'espadilha', ouros: 'pica-fumo' },
        label: this.V.fixedManilhas ? 'MANILHAS FIXAS' : 'MANILHA ' + manilhaRank
      });

      if (special === 'ferro') {
        this.emit('E-30 maoDeFerro', {
          value: h.value, blind: !this.ferroAsClaras, pontos: this.pontosObj(),
          text: 'MÃO DE FERRO · quem ganhar leva a partida'
        });
        this.phase = 'playing';
        this._startRound(0, h.mao);
        return;
      }
      if (special === 'onze') {
        this.phase = 'onze';
        const seats = this.teamSeats(h.onzeTeam);
        const teamCards = {};
        seats.forEach((s) => { teamCards[s] = cards[s].map((c) => cardInfo(c, ctx)); });
        this.emit('E-20 maoDeOnze', {
          team: h.onzeTeam, teamName: this.teamName(h.onzeTeam), seats: seats,
          value: h.value, runValue: this.V.chain[0], cards: teamCards,
          otherTeam: 1 - h.onzeTeam, text: this.V.specialName,
          rule: this.n === 4 ? 'Basta um aceitar para jogar; para correr, os dois' : null
        });
        return;
      }
      this.phase = 'playing';
      this._startRound(0, h.mao);
    }

    _startRound(index, opener) {
      const h = this.hand;
      h.round = { index: index, opener: opener, turn: opener, plays: [] };
      this._emitTurn();
    }

    _emitTurn() {
      const h = this.hand, r = h.round, seat = r.turn;
      const la = this.legalActions(seat);
      this.emit('E-10 turn', {
        seat: seat, team: this.teamOf(seat), name: this.names[seat], isBot: this.isBot(seat),
        round: r.index + 1, opener: r.opener, opensRound: r.plays.length === 0,
        canCall: la.canCall, callName: la.callName, callValue: la.callValue,
        canCoberta: la.canCoberta, canRun: la.canRun, value: h.value
      });
    }

    /* ---- jugar carta --------------------------------------------------- */

    play(seat, cardIndex, opts) {
      opts = opts || {};
      const h = this.hand;
      if (this.phase === 'awaitingResponse') {
        return this.toast(this.teamOf(seat) === h.pending.team ? TOAST.awaitResponse : TOAST.notYourTurn, seat,
          this.teamOf(seat) === h.pending.team ? 'awaitResponse' : 'notYourTurn');
      }
      if (this.phase !== 'playing') return { ok: false, reason: 'phase' };
      const r = h.round;
      if (r.turn !== seat) return this.toast(TOAST.notYourTurn, seat, 'notYourTurn');
      const coberta = !!opts.coberta;
      if (coberta && h.special === 'ferro') return this.toast(TOAST.noTrucoFerro, seat, 'ferro');
      if (coberta && r.index === 0) return this.toast(TOAST.cobertaRound1, seat, 'cobertaRound1');
      const hand = h.cards[seat];
      if (!(cardIndex >= 0 && cardIndex < hand.length)) return { ok: false, reason: 'badIndex' };

      const card = hand.splice(cardIndex, 1)[0];
      const ctx = this.ctx();
      const strength = coberta ? -1 : cardStrength(card, ctx);
      r.plays.push({ seat: seat, card: card, coberta: coberta, strength: strength });
      if (!opts._auto) this.autoPlays[seat] = 0;

      const hidden = coberta || h.blind;
      const info = cardInfo(card, ctx);
      this.emit('E-11 cardPlayed', {
        seat: seat, team: this.teamOf(seat), name: this.names[seat], round: r.index + 1,
        card: hidden ? null : info, cardIndex: cardIndex, coberta: coberta, hidden: h.blind,
        isManilha: hidden ? false : info.isManilha, isZap: hidden ? false : info.isZap,
        remaining: hand.length, auto: !!opts._auto
      });

      if (r.plays.length === this.n) this._resolveRound();
      else { r.turn = this.nextSeat(seat); this._emitTurn(); }
      return { ok: true, card: info, coberta: coberta };
    }

    _resolveRound() {
      const h = this.hand, r = h.round, ctx = this.ctx();
      const plays = r.plays;
      const revealed = plays.map((p) => ({
        seat: p.seat, team: this.teamOf(p.seat), coberta: p.coberta,
        card: p.coberta ? null : cardInfo(p.card, ctx)
      }));
      if (h.blind) {
        this.emit('E-32 ferroReveal', { round: r.index + 1, plays: revealed });
      }
      let max = -2;
      plays.forEach((p) => { if (p.strength > max) max = p.strength; });
      const top = plays.filter((p) => p.strength === max);
      const teams = {};
      top.forEach((p) => { teams[this.teamOf(p.seat)] = true; });
      const tie = max < 0 || Object.keys(teams).length > 1;
      const result = {
        index: r.index, opener: r.opener, tie: tie,
        winnerTeam: tie ? null : this.teamOf(top[0].seat),
        winnerSeat: tie ? null : top[0].seat,
        tiedSeats: tie ? top.map((p) => p.seat) : [],
        nextOpener: top[0].seat,
        plays: revealed
      };
      h.rounds.push(result);

      if (tie) {
        const hint = r.index === 0 ? 'Quem ganhar a 2ª leva a mão'
          : (r.index === 1 && h.rounds[0].tie) ? 'Quem ganhar a 3ª leva a mão' : null;
        this.emit('E-14 roundTied', {
          round: r.index + 1, seats: result.tiedSeats,
          cards: top.map((p) => p.coberta ? null : cardInfo(p.card, ctx)),
          nextOpener: result.nextOpener, hint: hint, plays: revealed, text: 'EMPACHOU!'
        });
      } else {
        this.emit('E-13 roundWon', {
          round: r.index + 1, winnerSeat: result.winnerSeat, winnerTeam: result.winnerTeam,
          winnerName: this.names[result.winnerSeat], teamName: this.teamName(result.winnerTeam),
          card: cardInfo(top[0].card, ctx), plays: revealed
        });
      }

      const outcome = handOutcome(h.rounds);
      if (outcome.done) {
        this._finishHand(outcome.winnerTeam, outcome.winnerTeam === null ? 0 : h.value,
          outcome.winnerTeam === null ? 'annulled' : 'rounds');
        return;
      }
      this._startRound(r.index + 1, result.nextOpener);
    }

    _finishHand(winnerTeam, points, reason) {
      const h = this.hand;
      if (winnerTeam !== null) {
        this.pontos[winnerTeam] = Math.min(this.target, this.pontos[winnerTeam] + points);
        this.stats.handsWon[winnerTeam]++;
      }
      h.result = { winnerTeam: winnerTeam, points: points, reason: reason };
      h.round = null;
      this.history.push({
        hand: h.number, mao: h.mao, special: h.special, winnerTeam: winnerTeam,
        points: points, reason: reason, value: h.value, level: h.level,
        rounds: h.rounds.map((r) => ({ tie: r.tie, winnerTeam: r.winnerTeam }))
      });
      this.emit('E-18 handEnd', {
        hand: h.number, winnerTeam: winnerTeam,
        teamName: winnerTeam === null ? null : this.teamName(winnerTeam),
        points: points, pontos: this.pontosObj(), reason: reason, value: h.value,
        special: h.special, annulled: winnerTeam === null,
        text: winnerTeam === null ? 'MÃO ANULADA'
          : (winnerTeam === 0 ? this.W.wonHand + ' · +' + points : this.W.lostHand)
      });
      if (winnerTeam !== null && this.pontos[winnerTeam] >= this.target) {
        this._endMatch(winnerTeam, 'points');
        return;
      }
      this.mao = this.nextSeat(this.mao); // el mão rota cada mano (también en la anulada)
      this.phase = 'handEnd';
      if (this.autoNextHand) this._newHand();
    }

    _endMatch(winnerTeam, reason) {
      this.phase = 'matchEnd';
      this.winner = winnerTeam;
      this.emit('E-40 matchEnd', {
        winnerTeam: winnerTeam, teamName: this.teamName(winnerTeam), pontos: this.pontosObj(),
        hands: this.handNumber, handsWon: this.stats.handsWon.slice(), reason: reason,
        humanWon: this.humanSeat === null ? null : this.teamOf(this.humanSeat) === winnerTeam,
        text: this.humanSeat !== null && this.teamOf(this.humanSeat) === winnerTeam ? 'VITÓRIA' : 'DERROTA'
      });
    }

    /* ---- pedidos ------------------------------------------------------- */

    call(seat, opts) {
      opts = opts || {};
      const h = this.hand, team = this.teamOf(seat);
      if (this.phase === 'awaitingResponse') {
        return team === h.pending.team
          ? this.toast(TOAST.awaitResponse, seat, 'awaitResponse')
          : this.toast(TOAST.notYourTurn, seat, 'notYourTurn');
      }
      if (this.phase === 'onze') return this.toast(TOAST.noTrucoOnze, seat, 'onze');
      if (this.phase !== 'playing') return { ok: false, reason: 'phase' };
      if (h.special === 'onze') return this.toast(TOAST.noTrucoOnze, seat, 'onze');
      if (h.special === 'ferro') return this.toast(TOAST.noTrucoFerro, seat, 'ferro');
      if (h.round.turn !== seat) return this.toast(TOAST.notYourTurn, seat, 'notYourTurn');
      if (h.lastCallerTeam === team) return this.toast(TOAST.onlyAccepterRaises, seat, 'onlyAccepterRaises');
      if (h.level >= 4) return { ok: false, reason: 'maxLevel' };
      if (!opts._auto) this.autoPlays[seat] = 0;
      this._openRequest(seat, h.level + 1, false);
      return { ok: true, pending: this._pendingInfo() };
    }

    _openRequest(seat, level, raised) {
      const h = this.hand, team = this.teamOf(seat);
      h.requestSerial++;
      h.pending = {
        seat: seat, team: team, level: level, name: this.V.names[level],
        valueIfAccepted: this.V.chain[level], valueIfRun: h.value,
        serial: h.requestSerial, raised: raised
      };
      h.lastCallerTeam = team;
      this.phase = 'awaitingResponse';
      const responders = this._responders();
      this.emit('E-15 called', {
        seat: seat, team: team, name: this.names[seat], level: level, levelName: h.pending.name,
        text: h.pending.name + '!', valueIfAccepted: h.pending.valueIfAccepted,
        valueIfRun: h.pending.valueIfRun, raised: raised, respondingTeam: 1 - team, responders: responders
      });
      this.emit('E-16 awaitingResponse', {
        respondingTeam: 1 - team, seats: responders, callerSeat: seat,
        level: level, levelName: h.pending.name, valueIfAccepted: h.pending.valueIfAccepted,
        valueIfRun: h.pending.valueIfRun, canRaise: level < 4,
        raiseName: level < 4 ? this.V.names[level + 1] : null,
        text: 'Aguardando resposta de ' + responders.map((s) => this.names[s]).join(' / ') + '…'
      });
    }

    // Asientos que pueden responder, empezando por el siguiente rival en el orden.
    _responders() {
      const p = this.hand.pending;
      const out = [];
      let s = this.nextSeat(p.seat);
      for (let i = 0; i < this.n; i++, s = this.nextSeat(s)) if (this.teamOf(s) !== p.team) out.push(s);
      return out;
    }

    _pendingInfo() {
      const p = this.hand && this.hand.pending;
      if (!p) return null;
      return {
        seat: p.seat, team: p.team, level: p.level, name: p.name,
        valueIfAccepted: p.valueIfAccepted, valueIfRun: p.valueIfRun,
        respondingTeam: 1 - p.team, raised: p.raised
      };
    }

    // ¿El parceiro de `seat` ya respondió al último pedido, en esta misma rodada?
    // Es el caso real con servidor: el parceiro aceptó y la respuesta del otro
    // llega con latencia. Esa respuesta tardía se bloquea con el toast, nunca se
    // reinterpreta como otra cosa.
    _partnerAnswered(seat) {
      const h = this.hand, lr = h && h.lastResponse;
      if (!lr || !h.round) return false;
      return lr.team === this.teamOf(seat) && lr.seat !== seat &&
        lr.serial === h.requestSerial && lr.round === h.round.index;
    }

    // Correr voluntario de la mano (sin pedido pendiente), en el propio turno
    // (Joga Truco). El rival suma el valor vigente de la mano. Intención
    // distinta de responder a un pedido: eso va por respond().
    run(seat, opts) {
      opts = opts || {};
      const h = this.hand, team = this.teamOf(seat);
      if (!h) return { ok: false, reason: 'phase' };
      if (this.phase === 'awaitingResponse') {
        // Con un pedido abierto no hay correr voluntario: el que pidió espera,
        // el que responde usa respond(seat, 'correr').
        return team === h.pending.team
          ? this.toast(TOAST.awaitResponse, seat, 'awaitResponse')
          : { ok: false, reason: 'pending' };
      }
      if (this.phase !== 'playing') return { ok: false, reason: 'phase' };
      if (h.round.turn !== seat) return this.toast(TOAST.notYourTurn, seat, 'notYourTurn');
      if (h.special === 'ferro') return this.toast(TOAST.noTrucoFerro, seat, 'ferro');
      if (!opts._auto) this.autoPlays[seat] = 0;
      const points = h.value;
      this.stats.ran[team]++;
      this.emit('E-19 ran', {
        seat: seat, team: team, name: this.names[seat], points: points, toTeam: 1 - team,
        voluntary: true, level: h.level, levelName: h.level ? this.V.names[h.level] : null,
        text: this._ranText(team, points)
      });
      this._finishHand(1 - team, points, 'ran');
      return { ok: true, points: points };
    }

    // Responde SÓLO a un pedido pendiente (aceitar / aumentar / correr).
    respond(seat, answer, opts) {
      opts = opts || {};
      const h = this.hand, team = this.teamOf(seat);
      if (!h) return { ok: false, reason: 'phase' };

      if (this.phase !== 'awaitingResponse') {
        // Primero el bloqueo de la dupla: si el parceiro ya respondió en esta
        // rodada, cualquier respuesta tardía (también 'correr') muere acá con
        // el toast y el valor de la mano queda intacto.
        if (this.phase === 'playing' && this._partnerAnswered(seat)) {
          return this.toast(TOAST.partnerAnswered, seat, 'partnerAnswered');
        }
        // COMPAT (hasta que la UI migre a run()): respond(seat, 'correr') sin
        // pedido pendiente se trata como correr voluntario. Un correr que no es
        // respuesta a nada ni choca con la dupla es, por definición, voluntario.
        if (this.phase === 'playing' && answer === 'correr') return this.run(seat, opts);
        return { ok: false, reason: 'noPending' };
      }
      const p = h.pending;
      if (team === p.team) return this.toast(TOAST.awaitResponse, seat, 'awaitResponse');
      if (!opts._auto) this.autoPlays[seat] = 0;
      const round = h.round ? h.round.index : null;

      if (answer === 'aceitar') {
        h.value = p.valueIfAccepted;
        h.level = p.level;
        h.lastResponse = { seat: seat, team: team, serial: p.serial, round: round, answer: 'aceitar' };
        h.pending = null;
        this.phase = 'playing';
        this.stats.accepted++;
        this.emit('E-17 accepted', {
          seat: seat, team: team, name: this.names[seat], value: h.value, level: h.level,
          levelName: this.V.names[h.level], canRaiseTeam: team, text: 'DESCE!',
          // quién aceptó, conjugado por modo: 'Aceitei!' / 'Aceitou!' (1v1) · 'Aceitamos!' / 'Aceitaram!' (2v2)
          toastText: this.W.accepted[team] + ' Mão valendo ' + h.value
        });
        this._emitTurn();
        return { ok: true, value: h.value };
      }
      if (answer === 'aumentar') {
        if (p.level >= 4) return { ok: false, reason: 'maxLevel' };
        // Subir implica aceptar el escalón pedido: el valor vigente pasa a ser ese.
        h.value = p.valueIfAccepted;
        h.level = p.level;
        h.lastResponse = { seat: seat, team: team, serial: p.serial, round: round, answer: 'aumentar' };
        this._openRequest(seat, p.level + 1, true);
        return { ok: true, pending: this._pendingInfo() };
      }
      if (answer === 'correr') {
        const points = p.valueIfRun;
        h.lastResponse = { seat: seat, team: team, serial: p.serial, round: round, answer: 'correr' };
        h.pending = null;
        this.stats.ran[team]++;
        this.emit('E-19 ran', {
          seat: seat, team: team, name: this.names[seat], points: points, toTeam: p.team,
          voluntary: false, level: p.level, levelName: p.name, auto: !!opts._auto,
          text: this._ranText(team, points)
        });
        this._finishHand(p.team, points, 'ran');
        return { ok: true, points: points };
      }
      return { ok: false, reason: 'badAnswer' };
    }

    /* ---- mão de onze --------------------------------------------------- */

    onzeDecision(seat, decision, opts) {
      opts = opts || {};
      const h = this.hand, team = this.teamOf(seat);
      if (this.phase !== 'onze') return { ok: false, reason: 'phase' };
      if (team !== h.onzeTeam) return this.toast(TOAST.notYourTurn, seat, 'notYourTurn');
      if (h.onzeDecisions[seat]) return { ok: false, reason: 'alreadyDecided' };
      if (decision !== 'jogar' && decision !== 'correr') return { ok: false, reason: 'badDecision' };
      if (!opts._auto) this.autoPlays[seat] = 0;
      h.onzeDecisions[seat] = decision;

      if (decision === 'jogar') {
        this.phase = 'playing';
        this.emit('E-21 onzePlaying', {
          team: team, seat: seat, name: this.names[seat], value: h.value,
          chip: this.V.specialName.charAt(0) + this.V.specialName.slice(1).toLowerCase() + ' · vale ' + h.value
        });
        this._startRound(0, h.mao);
        return { ok: true, playing: true };
      }
      const seats = this.teamSeats(team);
      const allRan = seats.every((s) => h.onzeDecisions[s] === 'correr');
      if (!allRan) return { ok: true, waiting: seats.filter((s) => !h.onzeDecisions[s]) };
      const points = this.V.chain[0];
      this.stats.ran[team]++;
      // 1.ª persona si corrimos nosotros: 'Corri da mão de onze. +1 para ele' /
      // 'Corremos da mão de onze. +1 para eles'; si corrieron ellos:
      // 'Ele correu da mão de onze. +1 para você' / 'Eles correram da mão de onze. +1 para nós'.
      const who = team === 0 ? this.W.ran[0] : this.W.ran[1].replace('!', '');
      this.emit('E-22 onzeRan', {
        team: team, toTeam: 1 - team, points: points,
        text: who + ' da ' + this.V.specialName.toLowerCase() + '. +' + points + ' para ' + this.teamWord(1 - team)
      });
      this._finishHand(1 - team, points, 'onzeRan');
      return { ok: true, points: points };
    }

    /* ---- jugada automática por tiempo ---------------------------------- */

    timeoutPlay(seat) {
      const h = this.hand, team = this.teamOf(seat);
      if (!h || this.phase === 'matchEnd' || this.phase === 'lobby') return { ok: false, reason: 'phase' };
      let action = null, cardIndex = null, cardInfoOut = null;

      if (this.phase === 'awaitingResponse') {
        if (team === h.pending.team) return { ok: false, reason: 'notResponder' };
        action = 'correr';
      } else if (this.phase === 'onze') {
        if (team !== h.onzeTeam || h.onzeDecisions[seat]) return { ok: false, reason: 'notDecider' };
        action = 'onzeCorrer';
      } else if (this.phase === 'playing') {
        if (h.round.turn !== seat) return { ok: false, reason: 'notYourTurn' };
        const hand = h.cards[seat];
        if (h.blind) {
          cardIndex = Math.floor(this.rng() * hand.length);
        } else {
          const ctx = this.ctx();
          cardIndex = 0;
          for (let i = 1; i < hand.length; i++) {
            if (cardStrength(hand[i], ctx) < cardStrength(hand[cardIndex], ctx)) cardIndex = i;
          }
          cardInfoOut = cardInfo(hand[cardIndex], ctx);
        }
        action = 'play';
      } else {
        return { ok: false, reason: 'phase' };
      }

      const count = ++this.autoPlays[seat];
      this.emit('E-61 autoPlay', {
        seat: seat, team: team, name: this.names[seat], action: action, cardIndex: cardIndex,
        card: cardInfoOut, count: count, max: MAX_AUTOPLAYS, text: TOAST.autoPlay,
        counter: count + '/' + MAX_AUTOPLAYS
      });

      let result;
      if (action === 'play') result = this.play(seat, cardIndex, { _auto: true });
      else if (action === 'correr') result = this.respond(seat, 'correr', { _auto: true });
      else result = this.onzeDecision(seat, 'correr', { _auto: true });

      if (this.phase !== 'matchEnd') {
        if (count === MAX_AUTOPLAYS - 1) {
          this.emit('E-62 autoPlayWarning', { seat: seat, count: count, max: MAX_AUTOPLAYS, text: TOAST.autoPlayWarning });
        } else if (count >= MAX_AUTOPLAYS) {
          this.emit('E-63 abandoned', {
            seat: seat, team: team, name: this.names[seat], winnerTeam: 1 - team,
            text: seat === this.humanSeat ? 'Você abandonou a partida (derrota)'
              : this.names[seat] + ' abandonou · vitória de ' + this.teamName(1 - team)
          });
          this._endMatch(1 - team, 'abandon');
        }
      }
      return { ok: true, action: action, cardIndex: cardIndex, count: count, result: result };
    }

    /* ---- bots ---------------------------------------------------------- */

    // Qué bot tiene que actuar ahora (null si le toca al humano o no hay nada que hacer).
    pendingBotSeat() {
      const h = this.hand;
      if (!h) return null;
      if (this.phase === 'playing') {
        const s = h.round.turn;
        return this.isBot(s) ? s : null;
      }
      if (this.phase === 'awaitingResponse') {
        const responders = this._responders();
        if (responders.some((s) => !this.isBot(s))) return null; // responde el humano
        return responders[0];
      }
      if (this.phase === 'onze') {
        const seats = this.teamSeats(h.onzeTeam).filter((s) => !h.onzeDecisions[s]);
        if (seats.some((s) => !this.isBot(s))) return null; // decide el humano primero
        return seats.length ? seats[0] : null;
      }
      return null;
    }

    // Ejecuta la acción del bot en ese asiento. La UI lo llama con el delay que quiera.
    botAct(seat) {
      const action = bot(seat, this.state({ viewer: seat }), this.rng);
      if (!action) return { ok: false, reason: 'noAction', action: null };
      let result;
      switch (action.type) {
        case 'play': result = this.play(seat, action.cardIndex, { coberta: !!action.coberta }); break;
        case 'call': result = this.call(seat); break;
        case 'respond': result = this.respond(seat, action.answer); break;
        case 'run': result = this.run(seat); break;
        case 'onze': result = this.onzeDecision(seat, action.decision); break;
        default: result = { ok: false, reason: 'badAction' };
      }
      return { ok: !!result.ok, action: action, result: result };
    }

    /* ---- acciones legales y snapshot ----------------------------------- */

    legalActions(seat) {
      const h = this.hand;
      const la = {
        seat: seat, team: this.teamOf(seat), phase: this.phase,
        isTurn: false, canPlay: false, canCoberta: false,
        canCall: false, callName: null, callValue: null, callBlocked: null,
        canRun: false, runGives: null,
        canRespond: false, canRaise: false, raiseName: null, raiseValue: null,
        acceptValue: null, runValueIfPending: null,
        canOnze: false, onzeWaiting: false
      };
      if (!h) return la;
      const team = la.team;
      if (this.phase === 'playing') {
        la.isTurn = h.round.turn === seat;
        la.canPlay = la.isTurn;
        la.canCoberta = la.isTurn && h.round.index >= 1 && h.special !== 'ferro';
        la.canRun = la.isTurn && h.special !== 'ferro';
        la.runGives = h.value;
        if (la.isTurn && h.special === 'normal' && h.level < 4) {
          if (h.lastCallerTeam === team) la.callBlocked = TOAST.onlyAccepterRaises;
          else {
            la.canCall = true;
            la.callName = this.V.names[h.level + 1];
            la.callValue = this.V.chain[h.level + 1];
          }
        } else if (la.isTurn && h.special === 'onze') la.callBlocked = TOAST.noTrucoOnze;
        else if (la.isTurn && h.special === 'ferro') la.callBlocked = TOAST.noTrucoFerro;
      } else if (this.phase === 'awaitingResponse') {
        const p = h.pending;
        if (team !== p.team) {
          la.canRespond = true;
          la.acceptValue = p.valueIfAccepted;
          la.runValueIfPending = p.valueIfRun;
          if (p.level < 4) {
            la.canRaise = true;
            la.raiseName = this.V.names[p.level + 1];
            la.raiseValue = this.V.chain[p.level + 1];
          }
        }
      } else if (this.phase === 'onze') {
        if (team === h.onzeTeam) {
          la.canOnze = !h.onzeDecisions[seat];
          la.onzeWaiting = !!h.onzeDecisions[seat];
        }
      }
      return la;
    }

    _visibleTo(viewer, seat) {
      const h = this.hand;
      if (viewer === 'all') return true;
      if (viewer === null || viewer === undefined) return false;
      if (h.blind) return this.ferroAsClaras && seat === viewer;
      if (seat === viewer) return true;
      if (h.special === 'onze' && this.teamOf(viewer) === h.onzeTeam && this.teamOf(seat) === this.teamOf(viewer)) return true;
      return false;
    }

    // Snapshot serializable. viewer: asiento (default humanSeat) o 'all' (todo visible, para tests/debug).
    state(opts) {
      opts = opts || {};
      const viewer = (opts.viewer === undefined) ? (this.humanSeat === null ? 'all' : this.humanSeat) : opts.viewer;
      const h = this.hand, ctx = this.ctx();
      const snap = {
        variant: this.variant, mode: this.mode, seats: this.n, humanSeat: this.humanSeat,
        viewer: viewer, phase: this.phase, target: this.target,
        pontos: this.pontosObj(), teamNames: [this.teamName(0), this.teamName(1)],
        // vocabulario del modo para la UI: {us, them, themGain, ran, accepted, wonHand, lostHand}
        vocab: Object.assign({}, this.W),
        names: this.names.slice(), winner: this.winner,
        chain: this.V.chain.slice(), chainNames: this.V.names.slice(),
        specialThreshold: this.V.special, autoPlays: this.autoPlays.slice(),
        hand: null, round: null, players: [],
        actions: (typeof viewer === 'number' && h) ? this.legalActions(viewer) : null
      };
      if (!h) return snap;
      snap.hand = {
        number: h.number, mao: h.mao, pe: h.pe, order: h.order.slice(),
        special: h.special, specialName: h.special === 'onze' ? this.V.specialName : (h.special === 'ferro' ? 'MÃO DE FERRO' : null),
        onzeTeam: h.onzeTeam, onzeDecisions: Object.assign({}, h.onzeDecisions),
        blind: h.blind && !this.ferroAsClaras,
        vira: h.vira ? cardInfo(h.vira, ctx) : null,
        manilha: { rank: h.manilhaRank, fixed: !!this.V.fixedManilhas, ids: h.manilhaIds.slice() },
        value: h.value, level: h.level, levelName: h.level ? this.V.names[h.level] : null,
        canRaiseTeam: h.lastCallerTeam === null ? null : 1 - h.lastCallerTeam,
        lastCallerTeam: h.lastCallerTeam,
        pending: this._pendingInfo(),
        lastResponse: h.lastResponse ? Object.assign({}, h.lastResponse) : null,
        result: h.result ? Object.assign({}, h.result) : null
      };
      snap.round = {
        index: h.round ? h.round.index : null,
        number: h.round ? h.round.index + 1 : null,
        opener: h.round ? h.round.opener : null,
        turn: h.round ? h.round.turn : null,
        plays: h.round ? h.round.plays.map((p) => ({
          seat: p.seat, team: this.teamOf(p.seat), coberta: p.coberta, hidden: h.blind,
          card: (p.coberta || h.blind) ? null : cardInfo(p.card, ctx)
        })) : [],
        results: h.rounds.map((r) => ({
          index: r.index, number: r.index + 1, tie: r.tie, winnerTeam: r.winnerTeam,
          winnerSeat: r.winnerSeat, tiedSeats: r.tiedSeats.slice(), opener: r.opener,
          plays: r.plays.map((p) => Object.assign({}, p))
        }))
      };
      for (let s = 0; s < this.n; s++) {
        const vis = this._visibleTo(viewer, s);
        snap.players.push({
          seat: s, team: this.teamOf(s), name: this.names[s], isBot: this.isBot(s),
          isMao: h.mao === s, isPe: h.pe === s, isTurn: !!(h.round && h.round.turn === s),
          count: h.cards[s].length, visible: vis,
          cards: vis ? h.cards[s].map((c) => cardInfo(c, ctx)) : null,
          partner: this.partnerOf(s)
        });
      }
      return snap;
    }
  }

  /* ----------------------------------------------------------------------
     6. Bot: heurística sobre el snapshot (sin acceso al estado interno)
        Devuelve { type:'play', cardIndex, coberta } | { type:'call' } |
        { type:'respond', answer } | { type:'run' } | { type:'onze', decision } | null
     ---------------------------------------------------------------------- */

  function bot(seat, s, rng) {
    rng = rng || Math.random;
    const me = s.players[seat];
    const team = seat % 2;
    const la = s.actions && s.actions.seat === seat ? s.actions : null;
    if (!me || !la) return null;
    const cards = me.cards || [];
    const strengths = cards.map((c) => c.strength);
    const strong = cards.filter((c) => c.strength >= 8).length;   // 2, 3 o manilha
    const manilhas = cards.filter((c) => c.isManilha).length;
    const maxS = strengths.length ? Math.max.apply(null, strengths) : -1;
    const power = strengths.length ? strengths.reduce((a, b) => a + b, 0) / strengths.length : 0;
    const r1 = s.round.results[0];
    const wonFirst = !!(r1 && r1.winnerTeam === team);
    const lostFirst = !!(r1 && r1.winnerTeam === 1 - team);

    // Mão de onze / de dez: jogar con mano decente, correr con mano floja.
    if (s.phase === 'onze') {
      if (!la.canOnze) return null;
      const good = maxS >= 9 || power >= 6 || (strong >= 1 && power >= 5);
      const decision = good ? 'jogar' : (rng() < 0.15 ? 'jogar' : 'correr');
      return { type: 'onze', decision: decision };
    }

    // Responder a un pedido según la fuerza que queda en la mano.
    if (s.phase === 'awaitingResponse') {
      if (!la.canRespond) return null;
      const score = power + (wonFirst ? 2 : 0) - (lostFirst ? 2 : 0) + manilhas * 1.5;
      if (score >= 9 && la.canRaise && rng() < 0.35) return { type: 'respond', answer: 'aumentar' };
      if (score >= 4.5 || (strong >= 1 && !lostFirst)) return { type: 'respond', answer: 'aceitar' };
      if (rng() < 0.12) return { type: 'respond', answer: 'aceitar' }; // paga el farol
      return { type: 'respond', answer: 'correr' };
    }

    if (s.phase !== 'playing' || !la.canPlay) return null;

    // Pedir truco con ≥ 2 cartas fuertes (o 1 fuerte y la 1.ª ganada); farol 10 %.
    if (la.canCall) {
      const want = strong >= 2 || (strong >= 1 && wonFirst) || (manilhas >= 1 && cards.length <= 2 && wonFirst);
      if (want && rng() < 0.6) return { type: 'call' };
      // Farol: 10 % de las manos, decidido en la primera jugada de la mano (no en cada turno).
      if (!want && cards.length === 3 && rng() < 0.10) return { type: 'call' };
    }

    // Correr de una mano perdida (1.ª perdida y nada en la mano), con poca probabilidad.
    if (la.canRun && lostFirst && maxS <= 3 && rng() < 0.3) return { type: 'run' };

    // Elegir carta. A ciegas (mão de ferro) no se ven ni las propias: una al azar.
    if (s.hand.blind || !me.cards) {
      if (me.count === 0) return null;
      return { type: 'play', cardIndex: Math.floor(rng() * me.count), coberta: false };
    }
    const n = cards.length;
    if (n === 0) return null;

    const byStrength = cards.map((c, i) => i).sort((a, b) => strengths[a] - strengths[b]); // asc
    const lowest = byStrength[0], highest = byStrength[n - 1];
    const plays = s.round.plays;
    let rivalBest = -Infinity, partnerBest = -Infinity;
    plays.forEach((p) => {
      const st = p.coberta || !p.card ? -1 : p.card.strength;
      if (p.team === team) partnerBest = Math.max(partnerBest, st);
      else rivalBest = Math.max(rivalBest, st);
    });
    const cobertaOk = la.canCoberta;
    let pick, coberta = false;

    if (plays.length === 0) {
      // Abro la rodada: fuerte si tengo manilha o 3; si no, la más alta igual (a primeira vai à missa).
      pick = highest;
      if (n > 1 && rng() < 0.15) pick = byStrength[n - 2];
    } else if (partnerBest > rivalBest) {
      // El compañero va ganando: guardo la alta y tiro la más baja (coberta si puedo y es floja).
      pick = lowest;
      coberta = cobertaOk && strengths[pick] <= 5 && rng() < 0.6;
    } else {
      const beating = byStrength.filter((i) => strengths[i] > rivalBest);
      const equal = byStrength.filter((i) => strengths[i] === rivalBest);
      if (beating.length) {
        pick = beating[0]; // la más baja que gana
        if (beating.length > 1 && rng() < 0.1) pick = beating[1];
      } else if (equal.length && (wonFirst || s.round.index === 0)) {
        pick = equal[0]; // empatar conviene (ganamos la 1.ª) o difiere la decisión
      } else {
        pick = lowest;
        coberta = cobertaOk && rng() < 0.7;
      }
    }
    return { type: 'play', cardIndex: pick, coberta: coberta };
  }

  /* ----------------------------------------------------------------------
     7. Exportación
     ---------------------------------------------------------------------- */

  return {
    Game: Game,
    bot: bot,
    RANKS: RANKS,
    SUITS: SUITS,
    SUIT_SYMBOL: SUIT_SYMBOL,
    SUIT_NICK: SUIT_NICK,
    VARIANTS: VARIANTS,
    TOAST: TOAST,
    TEAM_NAMES: TEAM_NAMES,
    TEAM_NAMES_1V1: TEAM_NAMES_1V1,
    vocab: vocab,
    makeRng: makeRng,
    makeDeck: makeDeck,
    shuffle: shuffle,
    parseCard: parseCard,
    cardStrength: cardStrength,
    compareCards: compareCards,
    isManilha: isManilha,
    isZap: isZap,
    manilhaRankFor: manilhaRankFor,
    manilhaIds: manilhaIds,
    cardInfo: cardInfo,
    handOutcome: handOutcome
  };
});

/* ============================================================================
   README corto para la UI

   Eventos (nombre → payload principal):
   'E-02 matchStart'   {variant, mode, seats, humanSeat, names, target, chain, chainNames}
   'E-03 maoSorteada'  {seat, name, team}
   'E-04 deal'         {hand, mao, pe, order, cards:{seat:[card]}, vira, special, blind, value, pontos}
   'E-05 manilha'      {rank, fixed, ids, vira, nicks, label}
   'E-10 turn'         {seat, team, name, isBot, round, opener, opensRound, canCall, callName, callValue, canCoberta, canRun, value}
   'E-11 cardPlayed'   {seat, team, round, card|null, cardIndex, coberta, hidden, isManilha, isZap, remaining, auto}
   'E-13 roundWon'     {round, winnerSeat, winnerTeam, winnerName, teamName, card, plays}
   'E-14 roundTied'    {round, seats, cards, nextOpener, hint, plays, text:'EMPACHOU!'}
   'E-15 called'       {seat, team, level, levelName, text, valueIfAccepted, valueIfRun, raised, respondingTeam, responders}
   'E-16 awaitingResponse' {respondingTeam, seats, callerSeat, level, levelName, valueIfAccepted, valueIfRun, canRaise, raiseName, text}
   'E-17 accepted'     {seat, team, value, level, levelName, canRaiseTeam, text:'DESCE!', toastText}
   'E-19 ran'          {seat, team, points, toTeam, voluntary, level, levelName, text}
                       voluntary:true viene de run(seat) (correr de la mano en turno propio);
                       voluntary:false viene de respond(seat,'correr') (correr de un pedido)
   'E-18 handEnd'      {hand, winnerTeam|null, teamName, points, pontos, reason:'rounds'|'ran'|'onzeRan'|'annulled', value, special, annulled, text}
   'E-20 maoDeOnze'    {team, teamName, seats, value, runValue, cards:{seat:[card]}, otherTeam, text, rule}
   'E-21 onzePlaying'  {team, seat, value, chip}
   'E-22 onzeRan'      {team, toTeam, points, text}
   'E-30 maoDeFerro'   {value, blind, pontos, text}
   'E-32 ferroReveal'  {round, plays:[{seat, team, card}]}
   'E-40 matchEnd'     {winnerTeam, teamName, pontos, hands, handsWon, reason:'points'|'abandon', humanWon, text}
   'E-61 autoPlay'     {seat, action:'play'|'correr'|'onzeCorrer', cardIndex, card, count, max, text, counter:'1/3'}
   'E-62 autoPlayWarning' {seat, count, max, text}
   'E-63 abandoned'    {seat, team, winnerTeam, text}
   'I toast'           {text, seat, code}

   Cada carta en los payloads y en state() es {id:'7c', rank:'7', suit:'copas', symbol:'♥',
   strength:0..13, isManilha, isZap, name:'sete de copas', nick:'copas'|null}.
   Equipos: 0 = NÓS (asientos 0 y 2), 1 = ELES (asientos 1 y 3). En 1v1: asientos 0 y 1.

   Vocabulario por modo (DESIGN §10): todos los textos del motor se conjugan
   con TrucoEngine.vocab(n) (también en state().vocab y g.teamWord(team)):
     2v2: nós / eles · 'Corremos. Eles +1' · 'Eles correram! +1' · 'GANHAMOS A MÃO' · 'Aceitaram!'
     1v1: você / ele · 'Corri. Ele +1'     · 'Ele correu! +1'     · 'GANHEI A MÃO'   · 'Aceitou!'
   vocab.themGain ('eles ganham' / 'ele ganha') está pensado para el aria del botón CORRER.
   ============================================================================ */
