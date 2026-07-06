// ─── Death Dice V2 — Core Engine ──────────────────────────────────────────────
// Character-less party core: 2–8 players, dice, action cards, DEATH ROW.
// Pure state + rules. All DOM work lives in v2ui.js / v2dice.js (optional-
// chained so the core also runs headless for tests/sims).

const V2 = (() => {

  const MAX_HP = 15;
  const HAND_LIMIT = 7;
  const START_HAND = 4;
  const RIG_COST = 1;

  // Feature flags — playtesting showed three simultaneous pre-roll decisions
  // overwhelmed new players. Wagers + insurance are parked (code intact),
  // leaving ONE optional pre-roll choice: Call It.
  const FEATURES = { wagers: false, insurance: false };

  // ── State ───────────────────────────────────────────────────────────────────
  let S = null;

  function newGame(names) {
    const players = names.map((n, i) => ({
      idx: i,
      name: (n || `Player ${i + 1}`).trim().slice(0, 14) || `Player ${i + 1}`,
      hp: MAX_HP,
      hand: [],            // card ids
      banked: 0,           // mana granted off-turn, cashes at next roll
      manaDebt: 0,         // subtracted from next roll's mana
      dots: [],            // [{dmg, turns, label}]
      drunk: false,        // next roll: two dice, keep lower
      rigBlocked: false,   // cannot rig / Call It on their next turn
      revealed: false,     // hand is public during their next turn
      called: null,        // Call It number for the pending roll
      insured: false,      // this roll's Death Row executions fizzle vs them
      alive: true,
    }));

    S = {
      players,
      activeIdx: 0,
      requirement: null,   // must beat this or bleed the difference
      mana: 0,
      kitty: 0,            // failed-roll damage feeds it; exact-match claims it
      deck: V2_buildDeck(),
      discard: [],
      deathRow: Array.from({ length: 6 }, () => ({ cards: [], frozenBy: null })),
      phase: 'setup',      // setup | await | main | over
      turnCount: 0,
      rerollQueued: false,
      rerollChain: 0,
      forceEnd: false,
      wagers: {},          // seatIdx → 'over'|'under' on the pending roll
      reaper: { steps: 0 },// every rolled 1 advances it; at 3 it strikes the leader
      overtime: false,     // late game: every roll fires its slot AND the one below
    };

    players.forEach(p => { for (let i = 0; i < START_HAND; i++) _drawCard(p.idx); });
    return S;
  }

  const state  = () => S;
  const active = () => S.players[S.activeIdx];
  const alive  = () => S.players.filter(p => p.alive);

  // ── Deck ────────────────────────────────────────────────────────────────────
  function _drawCard(i) {
    const p = S.players[i];
    if (!p?.alive) return false;
    if (p.hand.length >= HAND_LIMIT) return false;
    if (S.deck.length === 0) {
      if (S.discard.length === 0) return false;
      S.deck = S.discard; S.discard = [];
      for (let k = S.deck.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [S.deck[k], S.deck[j]] = [S.deck[j], S.deck[k]];
      }
    }
    p.hand.push(S.deck.pop());
    return true;
  }

  // ── Turn flow ───────────────────────────────────────────────────────────────
  function startTurn() {
    if (S.phase === 'over') return;
    const p = active();
    S.turnCount++;
    S.mana = 0;
    S.phase = 'await';
    S.rerollChain = 0;
    S.forceEnd = false;
    S.wagers = {};

    // OVERTIME — after ~4 rounds each, the endgame becomes a minefield
    if (!S.overtime && S.turnCount > S.players.length * 4) {
      S.overtime = true;
      V2FX?.banner?.('⚡ OVERTIME — DOUBLE EXECUTIONS ⚡', 'gold', 'six', { type: 'ember', count: 50 });
      V2UI?.toast?.('Every roll now fires its slot AND the slot below!', 'phase');
    }

    // thaw slots frozen by this player (they lasted "until your next turn")
    S.deathRow.forEach(sl => { if (sl.frozenBy === p.idx) sl.frozenBy = null; });

    // damage-over-time ticks
    const dead = [];
    p.dots = p.dots.filter(d => {
      _hurt(p.idx, d.dmg, d.label);
      d.turns--;
      return d.turns > 0 && p.alive;
    });
    if (!p.alive) { V2UI?.refresh?.(); _advanceOrWin(); return; }

    _drawCard(p.idx);
    V2UI?.refresh?.();
    V2UI?.beginRollPhase?.(); // countdown + Call It window (UI drives the timing)
  }

  // The UI/dice layer asks for the roll value first (to animate the real number)
  function computeRoll() {
    const p = active();
    const d1 = 1 + Math.floor(Math.random() * 6);
    if (p.drunk) {
      const d2 = 1 + Math.floor(Math.random() * 6);
      return { roll: Math.min(d1, d2), pair: [d1, d2], drunk: true };
    }
    return { roll: d1, pair: [d1], drunk: false };
  }

  function resolveRoll(roll) {
    if (S.phase !== 'await' && !S.rerollQueued) return;
    S.rerollQueued = false;
    const p = active();
    if (p.drunk) { p.drunk = false; V2UI?.toast?.(`🍺 ${p.name} kept the LOWER die!`, 'warn'); }

    // Call It payoff
    if (p.called != null) {
      if (p.called === roll) {
        V2FX?.banner?.(`🎯 ${p.name} CALLED IT!`, 'gold', 'six', { type: 'gold' });
        S.mana += roll;
        _drawCard(p.idx);
      } else {
        V2UI?.toast?.(`🙈 ${p.name} called ${p.called}… rolled ${roll}.`, 'info');
      }
      p.called = null;
    }

    // Requirement: beat it or bleed the difference (which feeds THE KITTY)
    let damage = 0, claimedKitty = 0;
    if (S.requirement != null) {
      if (roll === S.requirement && S.kitty > 0) {
        claimedKitty = S.kitty;
        S.mana += claimedKitty;
        S.kitty = 0;
        V2FX?.banner?.(`💰 ${p.name} CLAIMS THE KITTY +${claimedKitty}◆`, 'gold', 'coin', { type: 'gold', count: 40 });
      } else if (roll < S.requirement) {
        damage = S.requirement - roll;
        _hurt(p.idx, damage, 'failed roll');
        S.kitty += damage;
        V2FX?.banner?.(`🩸 ${p.name} BUSTS −${damage} HP`, 'blood', 'hit');
        V2UI?.toast?.(`The Kitty grows to ${S.kitty}`, 'info');
      }
    }

    // Mana: roll + banked − debts
    S.mana += Math.max(0, roll + p.banked - p.manaDebt);
    if (p.banked)   { V2UI?.toast?.(`🏦 ${p.name} cashes ${p.banked} banked mana`, 'info'); p.banked = 0; }
    if (p.manaDebt) { p.manaDebt = 0; }

    // New requirement (6 resets)
    S.requirement = (roll === 6) ? null : roll;
    if (roll === 6) V2FX?.banner?.('👑 A SIX — BAR RESET', 'gold', 'six', { type: 'gold', count: 30 });

    S.phase = 'main';
    S.lastRoll = { roll, damage, claimedKitty, by: p.idx };

    // Table wagers pay out (over/under 3.5)
    _resolveWagers(roll);

    // THE REAPER — every rolled 1 draws it closer to the leader
    if (roll === 1) _reaperStep();

    if (!p.alive) { V2UI?.refresh?.(); _advanceOrWin(); return; }

    // ── DEATH ROW CHECK (Overtime fires the slot below as well) ─────────────
    const afterFires = () => {
      p.insured = false; // insurance covers the whole roll, then expires
      V2UI?.refresh?.();
      if (S.phase === 'over') return;
      if (S.forceEnd || !active().alive) { endTurn(); return; }
      V2UI?.enterMainPhase?.();
    };
    _fireSlot(roll, p.idx, () => {
      const second = roll === 1 ? 6 : roll - 1;
      if (S.overtime && S.phase !== 'over'
          && S.deathRow[second - 1].cards.length && S.deathRow[second - 1].frozenBy == null) {
        V2UI?.toast?.(`⚡ OVERTIME — slot ${second} fires too!`, 'phase');
        _fireSlot(second, p.idx, afterFires);
      } else afterFires();
    });
  }

  // ── Wagers: other players bet over/under 3.5 during the countdown ─────────
  function placeWager(idx, dir) {
    if (!FEATURES.wagers) return { ok: false };
    if (S.phase !== 'await') return { ok: false };
    if (idx === S.activeIdx || !S.players[idx]?.alive) return { ok: false };
    if (S.wagers[idx]) return { ok: false, error: 'Already wagered' };
    S.wagers[idx] = dir; // 'over' | 'under'
    V2UI?.refresh?.();
    return { ok: true };
  }

  function _resolveWagers(roll) {
    const isOver = roll >= 4;
    Object.entries(S.wagers).forEach(([idx, dir]) => {
      const i = Number(idx);
      const p = S.players[i];
      if (!p?.alive) return;
      const won = (dir === 'over') === isOver;
      if (won) {
        _drawCard(i);
        V2UI?.toast?.(`💸 ${p.name} called ${dir.toUpperCase()} — right! Draws a card.`, 'info');
      } else {
        _hurt(i, 1, 'bad wager');
        V2UI?.toast?.(`💸 ${p.name} called ${dir.toUpperCase()} — wrong! −1 HP.`, 'warn');
      }
    });
    S.wagers = {};
  }

  // ── Insurance: the roller pre-pays to fizzle this roll's executions ───────
  function buyInsurance() {
    if (!FEATURES.insurance) return { ok: false };
    const p = active();
    if (S.phase !== 'await' || p.insured) return { ok: false };
    p.insured = true;
    p.manaDebt += 2; // premium comes out of the incoming roll
    V2UI?.toast?.(`🛡 ${p.name} buys INSURANCE (−2◆ from this roll)… what do they know?`, 'phase');
    V2UI?.refresh?.();
    return { ok: true };
  }

  // ── The Reaper: Blue Shell with a scythe ───────────────────────────────────
  function reaperLeader() {
    return alive().slice().sort((a, b) =>
      b.hp - a.hp || b.hand.length - a.hand.length || a.idx - b.idx)[0]?.idx ?? null;
  }

  function _reaperStep() {
    S.reaper.steps++;
    const L = reaperLeader();
    if (L == null) return;
    if (S.reaper.steps >= 3) {
      S.reaper.steps = 0;
      V2FX?.banner?.(`💀 THE REAPER STRIKES ${S.players[L].name.toUpperCase()}`, 'dark', 'reaper', { type: 'dark', count: 45 });
      V2FX?.shake?.(10);
      _hurt(L, 5, 'The Reaper');
    } else {
      V2FX?.sfx?.('reaper');
      V2UI?.toast?.(`💀 The Reaper stirs (${S.reaper.steps}/3)… eyeing ${S.players[L].name}`, 'warn');
    }
  }

  function _fireSlot(n, rollerIdx, done) {
    const slot = S.deathRow[n - 1];
    if (!slot || slot.cards.length === 0 || slot.frozenBy != null || S.phase === 'over') {
      done?.(); return;
    }
    const entry = slot.cards.pop(); // TOP card executes
    const card = V2_cardById(entry.cardId);
    S.discard.push(entry.cardId);

    // INSURED roller: the execution fizzles — card is still consumed
    if (S.players[rollerIdx]?.insured) {
      V2UI?.toast?.(`🛡 INSURED! ${card.name} fizzles harmlessly!`, 'phase');
      if (V2UI?.showExecute) V2UI.showExecute(n, card, entry.owner, rollerIdx, done, true);
      else done?.();
      V2UI?.refresh?.();
      return;
    }

    const runEffect = () => {
      if (S.phase !== 'over') {
        try { card.rigged(CardAPI, entry.owner, rollerIdx); }
        catch (e) { console.error('[DeathRow] execute error', e); }
      }
      V2UI?.refresh?.();
      // chained reroll (Drunk Potion) — capped so it can't loop forever
      if (S.rerollQueued && S.rerollChain < 2 && S.phase !== 'over') {
        S.rerollChain++;
        S.rerollQueued = false;
        const { roll } = computeRoll();
        V2UI?.animateReroll?.(roll, () => { _resolveChainedRoll(roll, done); });
        return;
      }
      done?.();
    };

    if (V2UI?.showExecute) V2UI.showExecute(n, card, entry.owner, rollerIdx, runEffect);
    else runEffect();
  }

  // A chained reroll only re-fires Death Row + updates requirement (no re-mana)
  function _resolveChainedRoll(roll, done) {
    const p = active();
    S.requirement = (roll === 6) ? null : roll;
    V2UI?.toast?.(`🎲 Rewound roll: ${roll}!`, 'combat');
    _fireSlot(roll, p.idx, done);
  }

  function endTurn() {
    if (S.phase === 'over') return;
    const p = active();
    p.revealed = false;
    p.rigBlocked = false;
    p.called = null;
    S.mana = 0;
    _advanceOrWin();
  }

  function _advanceOrWin() {
    const living = alive();
    if (living.length <= 1) {
      S.phase = 'over';
      V2UI?.showWin?.(living[0] ?? null);
      return;
    }
    let i = S.activeIdx;
    do { i = (i + 1) % S.players.length; } while (!S.players[i].alive);
    S.activeIdx = i;
    startTurn();
  }

  // ── Player actions ──────────────────────────────────────────────────────────
  function castCard(handIdx, target) {
    const p = active();
    if (S.phase !== 'main') return { ok: false, error: 'Roll first' };
    const cardId = p.hand[handIdx];
    const card = V2_cardById(cardId);
    if (!card) return { ok: false, error: 'No card' };
    if (S.mana < card.cost) return { ok: false, error: `Need ${card.cost} mana` };

    S.mana -= card.cost;
    p.hand.splice(handIdx, 1);
    S.discard.push(cardId);
    try { card.cast(CardAPI, p.idx, target); }
    catch (e) { console.error('[cast] error', e); }
    V2UI?.refresh?.();
    if (S.phase !== 'over' && (!active().alive || S.forceEnd)) endTurn();
    return { ok: true };
  }

  function rigCard(handIdx, slotNum) {
    const p = active();
    if (S.phase !== 'main') return { ok: false, error: 'Roll first' };
    if (p.rigBlocked) return { ok: false, error: 'You are BLOCKED from rigging this turn!' };
    if (S.mana < RIG_COST) return { ok: false, error: `Rigging costs ${RIG_COST} mana` };
    const slot = S.deathRow[slotNum - 1];
    if (!slot) return { ok: false, error: 'Bad slot' };
    if (slot.frozenBy != null) return { ok: false, error: `Slot ${slotNum} is FROZEN` };

    const cardId = p.hand[handIdx];
    if (!V2_cardById(cardId)) return { ok: false, error: 'No card' };

    S.mana -= RIG_COST;
    p.hand.splice(handIdx, 1);
    slot.cards.push({ cardId, owner: p.idx, faceUp: false });
    V2UI?.refresh?.();
    return { ok: true };
  }

  function callIt(n) {
    const p = active();
    if (S.phase !== 'await') return { ok: false };
    if (p.rigBlocked) { V2UI?.toast?.('⛔ Blocked — no Call It this turn!', 'warn'); return { ok: false }; }
    p.called = n;
    V2UI?.toast?.(`🎯 ${p.name} CALLS ${n}! Double mana + a card if it hits!`, 'phase');
    return { ok: true };
  }

  // ── Damage / heal (single funnel: win checks live here) ─────────────────────
  function _hurt(i, amt, src) {
    const p = S.players[i];
    if (!p?.alive || amt <= 0) return;
    p.hp = Math.max(0, p.hp - amt);
    V2UI?.hitFx?.(i, amt);
    if (p.hp === 0) {
      p.alive = false;
      S.discard.push(...p.hand);
      p.hand = [];
      V2FX?.banner?.(`💀 ${p.name.toUpperCase()} IS DEAD`, 'blood', 'death');
      V2FX?.shake?.(12);
      // their rigged cards STAY on Death Row — dead men's traps still fire
    }
  }

  function _mend(i, amt) {
    const p = S.players[i];
    if (!p?.alive || amt <= 0) return;
    p.hp = Math.min(MAX_HP, p.hp + amt);
    V2UI?.healFx?.(i, amt);
  }

  // ── Card API — what card effects are allowed to touch ──────────────────────
  const CardAPI = {
    players: () => S.players.filter(p => p.alive),
    name: (i) => S.players[i]?.name ?? '?',
    toast: (m, t) => V2UI?.toast?.(m, t ?? 'combat'),

    damage: (i, amt, src) => { _hurt(i, amt, src); },
    heal:   (i, amt) => { _mend(i, amt); },

    draw: (i, n = 1) => { let got = 0; for (let k = 0; k < n; k++) if (_drawCard(i)) got++; if (got) V2UI?.toast?.(`🃏 ${CardAPI.name(i)} draws ${got}`, 'info'); },
    discardRandom: (i, n = 1) => {
      const p = S.players[i]; if (!p?.alive) return;
      for (let k = 0; k < n && p.hand.length; k++) {
        const j = Math.floor(Math.random() * p.hand.length);
        S.discard.push(p.hand.splice(j, 1)[0]);
      }
    },

    getMana: () => S.mana,
    setMana: (m) => { S.mana = Math.max(0, m); },
    // mana for the ACTIVE pool if it's their turn, otherwise banked for later
    giveMana: (i, n) => { if (i === S.activeIdx) S.mana += n; else { S.players[i].banked += n; } },
    gainManaFor: (i, n) => { CardAPI.giveMana(i, n); },
    addManaDebt: (i, n) => { S.players[i].manaDebt += n; },

    addDot: (i, dmg, turns, label) => { S.players[i].dots.push({ dmg, turns, label }); },
    setDrunk: (i) => { S.players[i].drunk = true; },
    setRigBlocked: (i) => { S.players[i].rigBlocked = true; },
    setRevealed: (i) => { S.players[i].revealed = true; },
    queueReroll: () => { S.rerollQueued = true; },
    forceEndTurn: () => { S.forceEnd = true; },

    neighbours: (i) => {
      const living = S.players.filter(p => p.alive).map(p => p.idx);
      if (living.length <= 1) return [];
      const pos = living.indexOf(i);
      if (pos === -1) return [];
      const L = living[(pos - 1 + living.length) % living.length];
      const R = living[(pos + 1) % living.length];
      return L === R ? [L] : [L, R];
    },
    poorestPlayer: () => alive().reduce((a, b) => (b.hp < a.hp ? b : a)).idx,

    stealRandomCard: (to, from) => {
      const f = S.players[from];
      if (!f?.hand.length) { V2UI?.toast?.(`${CardAPI.name(from)} had nothing to steal!`, 'info'); return; }
      const j = Math.floor(Math.random() * f.hand.length);
      const id = f.hand.splice(j, 1)[0];
      if (S.players[to].hand.length < HAND_LIMIT) S.players[to].hand.push(id);
      else S.discard.push(id);
      V2UI?.toast?.(`🦝 ${CardAPI.name(to)} steals a card from ${CardAPI.name(from)}!`, 'combat');
    },
    transferRandomCards: (from, to, n) => {
      for (let k = 0; k < n; k++) {
        const f = S.players[from];
        if (!f?.hand.length) break;
        const j = Math.floor(Math.random() * f.hand.length);
        const id = f.hand.splice(j, 1)[0];
        if (S.players[to].hand.length < HAND_LIMIT) S.players[to].hand.push(id);
        else S.discard.push(id);
      }
    },

    wipeSlot: (n) => {
      const sl = S.deathRow[n - 1]; if (!sl) return;
      sl.cards.forEach(c => S.discard.push(c.cardId));
      sl.cards = [];
      V2UI?.toast?.(`✨ Slot ${n} defused!`, 'info');
    },
    wipeAllSlots: () => { for (let n = 1; n <= 6; n++) CardAPI.wipeSlot(n); },
    freezeSlot: (n, byIdx) => {
      const sl = S.deathRow[n - 1]; if (!sl) return;
      sl.frozenBy = byIdx;
      V2UI?.toast?.(`🧊 Slot ${n} is FROZEN until ${CardAPI.name(byIdx)}'s next turn!`, 'phase');
    },
    exposeDeathRow: () => { S.deathRow.forEach(sl => sl.cards.forEach(c => { c.faceUp = true; })); },

    // UI-dependent flows (fall back gracefully when headless)
    peekDeathRow: (me) => { V2UI?.peekDeathRow ? V2UI.peekDeathRow(me) : null; },
    peekAndSteal: (me, t) => {
      if (V2UI?.peekAndSteal) V2UI.peekAndSteal(me, t);
      else CardAPI.stealRandomCard(me, t);
    },
    demandTribute: (me, t) => {
      if (V2UI?.demandTribute) V2UI.demandTribute(me, t);
      else CardAPI.transferRandomCards(t, me, 1);
    },

    chaosTable: (me) => {
      const r = 1 + Math.floor(Math.random() * 6);
      const others = alive().map(p => p.idx).filter(i => i !== me);
      switch (r) {
        case 1: {
          if (others.length) {
            const t = others[Math.floor(Math.random() * others.length)];
            V2UI?.toast?.(`🧀 Chaos [1]: shrapnel! ${CardAPI.name(t)} takes 2!`, 'combat');
            _hurt(t, 2, 'Chaos');
          }
          break;
        }
        case 2: CardAPI.giveMana(me, 2); V2UI?.toast?.('🧀 Chaos [2]: +2 mana!', 'info'); break;
        case 3: CardAPI.draw(me, 2); V2UI?.toast?.('🧀 Chaos [3]: cards from the void!', 'info'); break;
        case 4: {
          // everyone passes a random card to the left — party classic
          const living = alive().map(p => p.idx);
          const taken = living.map(i => {
            const h = S.players[i].hand;
            return h.length ? h.splice(Math.floor(Math.random() * h.length), 1)[0] : null;
          });
          living.forEach((i, k) => {
            const from = taken[(k + 1) % living.length];
            if (from) S.players[i].hand.push(from);
          });
          V2UI?.toast?.('🧀 Chaos [4]: EVERYONE passes a card left!', 'phase');
          break;
        }
        case 5:
          V2UI?.toast?.('🧀 Chaos [5]: gas leak — EVERYONE takes 1!', 'combat');
          alive().forEach(p => _hurt(p.idx, 1, 'Chaos'));
          break;
        default:
          _mend(me, 2); S.kitty += 2;
          V2UI?.toast?.('🧀 Chaos [6]: heal 2 — and the Kitty fattens by 2!', 'info');
      }
    },
  };

  return {
    newGame, state, active, startTurn, computeRoll, resolveRoll,
    castCard, rigCard, callIt, endTurn,
    placeWager, buyInsurance, reaperLeader,
    RIG_COST, MAX_HP, FEATURES,
  };
})();
