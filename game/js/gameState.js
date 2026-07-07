// ─── Game State Manager ───────────────────────────────────────────────────────
// Central source of truth for all live game data.

const GameState = (() => {
  // ── Private State ──────────────────────────────────────────────────────────
  let _rules = {};
  let _data  = {};

  let _players = {};      // keyed by 'p1' | 'p2'
  let _currentTurn = 'p1';
  let _currentPhase = 'rolloff'; // 'rolloff' | 'etiquette' | 'combat'
  let _mana = 0;
  let _lastRoll = null;
  let _actionStack = [];  // for response resolution (LIFO)
  let _instanceCounter = 0;
  let _turnNumber = 1;
  // Per-turn trackers (reset in advanceTurn)
  let _actionCardsPlayedThisTurn = 0;
  let _shopPurchasesThisTurn = 0;

  // ── Init ───────────────────────────────────────────────────────────────────
  function init(gameData) {
    _data  = gameData;
    _rules = gameData.rules;

    _players = {
      p1: _createPlayerState('p1', 'Player 1'),
      p2: _createPlayerState('p2', 'Player 2'),
    };

    _currentTurn  = 'p1';
    _currentPhase = 'rolloff';
    _mana         = 0;
    _lastRoll     = null;
    _actionStack  = [];
    _instanceCounter = 0;
    _turnNumber = 1;
    _actionCardsPlayedThisTurn = 0;
    _shopPurchasesThisTurn = 0;

    _saveToStorage();
  }

  function _createPlayerState(id, label) {
    return {
      id,
      label,
      hp: _rules.startingPlayerHP ?? 20,
      hand: { heroes: [], actions: [] },
      board: [],
      graveyard: [],
      drawPile: [],
      discardedForManaThisTurn: { hero: 0, action: 0 },
      rolloffRoll: null,
    };
  }

  // ── Accessors ──────────────────────────────────────────────────────────────
  function getPlayerState(playerId) {
    return _players[playerId];
  }

  function getOpponentId(playerId) {
    return playerId === 'p1' ? 'p2' : 'p1';
  }

  function getPlayerLabel(playerId) {
    return _players[playerId]?.label ?? playerId;
  }

  // Optional custom names entered at game start (party mode)
  function setPlayerLabel(playerId, label) {
    const clean = (label ?? '').trim().slice(0, 16); // keep names HUD-sized
    if (_players[playerId] && clean) {
      _players[playerId].label = clean;
      _saveToStorage();
    }
  }

  function getMana() { return _mana; }

  function setMana(value) {
    _mana = Math.max(0, value);
    _saveToStorage();
  }

  function spendMana(amount) {
    if (_mana < amount) return false;
    _mana -= amount;
    _saveToStorage();
    return true;
  }

  function gainMana(amount) {
    _mana += amount;
    _saveToStorage();
  }

  // ── Turn / Phase ───────────────────────────────────────────────────────────
  function setPhase(phase) {
    _currentPhase = phase;
    _saveToStorage();
  }

  function advanceTurn() {
    const endingTurn = _currentTurn;
    _tickEvents = [];

    // End-of-turn expiry happens for the player who just acted. This keeps
    // Cripple/Impede active during the affected player's actual turn.
    [...(_players[endingTurn]?.board ?? [])].forEach(char => expireTurnStatuses(char));

    _currentTurn = getOpponentId(_currentTurn);
    _turnNumber++;
    _mana = 0;
    _lastRoll = null;
    _actionCardsPlayedThisTurn = 0;
    _shopPurchasesThisTurn = 0;

    // Reset per-turn state for new active player
    const p = _players[_currentTurn];
    p.discardedForManaThisTurn = { hero: 0, action: 0 };

    // Untap all characters for the new player
    p.board.forEach(c => { c.tapped = false; c.hasAttackedThisTurn = false; c.hasUsedAbilityThisTurn = false; });

    // Tick timed statuses for the new player's board.
    // Iterate over a COPY — poison deaths splice the live board array.
    [...p.board].forEach(char => applyTurnStartStatuses(char));

    _saveToStorage();
  }

  // Events produced by the latest status tick (poison damage, expiries, deaths)
  // — consumed by PhaseManager for toasts + hit effects.
  let _tickEvents = [];
  function consumeTickEvents() { const e = _tickEvents; _tickEvents = []; return e; }

  // ── Roll ───────────────────────────────────────────────────────────────────
  function setLastRoll(value) {
    _lastRoll = value;
    _saveToStorage();
  }

  function getLastRoll() { return _lastRoll; }

  // ── Character Instances ────────────────────────────────────────────────────
  function _createCharacterInstance(heroData) {
    _instanceCounter++;
    return {
      instanceId: `char_${_instanceCounter}`,
      id: heroData.id,
      name: heroData.name,
      maxHp: heroData.hp,
      currentHp: heroData.hp,
      baseAttack: heroData.baseAttack,
      abilities: heroData.abilities ?? [],
      passives: heroData.passives ?? [],
      tapped: false,
      hasAttackedThisTurn: false,
      hasUsedAbilityThisTurn: false,
      statuses: [],
      damageTokens: 0,
    };
  }

  // ── Deploy / Play ──────────────────────────────────────────────────────────
  function deployHero(playerId, cardId) {
    const p = _players[playerId];
    const idx = p.hand.heroes.findIndex(c => c.id === cardId);
    if (idx === -1) return { ok: false, error: 'Card not in hand' };

    const card = p.hand.heroes[idx];
    if (_mana < card.manaCost) return { ok: false, error: 'Not enough mana' };

    if (!spendMana(card.manaCost)) return { ok: false, error: 'Mana spend failed' };

    p.hand.heroes.splice(idx, 1);
    const instance = _createCharacterInstance(card);
    // Preserve full hero data on the instance for ability lookups
    instance._sourceCard = card;
    // Attach a playable ability (role-based, flavored) — heroes in data have none
    if (!instance.abilities?.length && typeof HeroAbilities !== 'undefined') {
      instance.abilities = HeroAbilities.getFor(card);
    }
    p.board.push(instance);

    _saveToStorage();
    return { ok: true, instance };
  }

  // Validate an action card WITHOUT spending anything — used by the targeting
  // flow so a cancelled/invalid play never costs mana or the card.
  function canPlayAction(playerId, cardId) {
    const p = _players[playerId];
    const card = p.hand.actions.find(c => c.id === cardId);
    if (!card) return { ok: false, error: 'Card not in hand' };

    const isFree = card.manaCost === 0 || card.type === 'free';
    if (!isFree) {
      if (_actionCardsPlayedThisTurn >= (_rules.combat?.actionCardsPerTurn ?? 1)) {
        return { ok: false, error: 'Only one paid action card per turn' };
      }
      if (_mana < card.manaCost) return { ok: false, error: 'Not enough mana' };
    }
    return { ok: true, card, isFree };
  }

  // Commit the play: spend mana, remove from hand, count it, graveyard it.
  // Called by AbilityDispatcher AFTER a target has been confirmed.
  function commitPlayAction(playerId, cardId) {
    const check = canPlayAction(playerId, cardId);
    if (!check.ok) return check;

    const p = _players[playerId];
    const idx = p.hand.actions.findIndex(c => c.id === cardId);
    const card = p.hand.actions[idx];

    if (!check.isFree) {
      if (!spendMana(card.manaCost)) return { ok: false, error: 'Mana spend failed' };
      _actionCardsPlayedThisTurn++;
    }
    p.hand.actions.splice(idx, 1);
    p.graveyard.push(card);
    _saveToStorage();
    return { ok: true, card };
  }

  // Legacy immediate-play path (admin/testing): commit + resolve with no target.
  function playAction(playerId, cardId, target = null) {
    const r = commitPlayAction(playerId, cardId);
    if (!r.ok) return r;
    AbilityDispatcher.executeActionEffect(r.card, playerId, target);
    return { ok: true };
  }

  // ── Discard for Mana ───────────────────────────────────────────────────────
  function discardForMana(playerId, cardId, cardType) {
    const p = _players[playerId];
    const limit = _rules.mana?.maxDiscardRefundPerTurn?.[cardType] ?? 1;
    const used  = p.discardedForManaThisTurn[cardType] ?? 0;
    if (used >= limit) return { ok: false, error: `Already discarded a ${cardType} for mana this turn` };

    const hand = cardType === 'hero' ? p.hand.heroes : p.hand.actions;
    const idx  = hand.findIndex(c => c.id === cardId);
    if (idx === -1) return { ok: false, error: 'Card not in hand' };

    const card = hand[idx];
    hand.splice(idx, 1);
    p.graveyard.push(card);
    p.discardedForManaThisTurn[cardType]++;
    gainMana(card.manaCost);

    _saveToStorage();
    return { ok: true, refund: card.manaCost };
  }

  // ── HP Manipulation ────────────────────────────────────────────────────────
  function damagePlayer(playerId, amount) {
    const p = _players[playerId];
    p.hp = Math.max(0, p.hp - amount);
    _saveToStorage();
    return p.hp;
  }

  function healPlayer(playerId, amount) {
    const p = _players[playerId];
    p.hp += amount;
    _saveToStorage();
    return p.hp;
  }

  function damageCharacter(instanceId, amount) {
    const { char } = _findChar(instanceId);
    if (!char) return null;
    char.currentHp -= amount;
    if (char.currentHp <= 0) _killCharacter(instanceId);
    _saveToStorage();
    return char.currentHp;
  }

  function healCharacter(instanceId, amount) {
    const { char } = _findChar(instanceId);
    if (!char) return null;
    char.currentHp = Math.min(char.maxHp, char.currentHp + amount);
    _saveToStorage();
    return char.currentHp;
  }

  function _killCharacter(instanceId) {
    for (const p of Object.values(_players)) {
      const idx = p.board.findIndex(c => c.instanceId === instanceId);
      if (idx !== -1) {
        const [dead] = p.board.splice(idx, 1);
        p.graveyard.push(dead._sourceCard ?? { id: dead.id, name: dead.name });
        return;
      }
    }
  }

  // ── Tap State ──────────────────────────────────────────────────────────────
  function tapCharacter(instanceId) {
    const { char } = _findChar(instanceId);
    if (!char) return false;
    char.tapped = true;
    _saveToStorage();
    return true;
  }

  function untapCharacter(instanceId) {
    const { char } = _findChar(instanceId);
    if (!char) return false;
    char.tapped = false;
    _saveToStorage();
    return true;
  }

  // ── Status Effects ─────────────────────────────────────────────────────────
  function applyStatus(instanceId, statusId) {
    const { char } = _findChar(instanceId);
    if (!char) return false;

    const def = _data.statusEffects.find(s => s.id === statusId);
    if (!def) return false;

    const existing = char.statuses.findIndex(s => s.id === statusId);

    if (existing !== -1) {
      if (def.stackBehavior === 'stack') {
        char.statuses[existing].stacks = (char.statuses[existing].stacks ?? 1) + 1;
      } else if (def.stackBehavior === 'replace') {
        char.statuses[existing] = { ...def, remainingDuration: def.duration };
      } else if (def.stackBehavior === 'cancel') {
        char.statuses.splice(existing, 1);
      }
    } else {
      char.statuses.push({ ...def, remainingDuration: def.duration, stacks: 1 });
    }

    _saveToStorage();
    return true;
  }

  function removeStatus(instanceId, statusId) {
    const { char } = _findChar(instanceId);
    if (!char) return false;
    char.statuses = char.statuses.filter(s => s.id !== statusId);
    _saveToStorage();
    return true;
  }

  // Damage-over-time statuses: id → damage per stack per tick
  const _DOT_STATUSES = { status_poisoned: 1, status_example_timed: 1 };

  function applyTurnStartStatuses(char) {
    // Apply damage-over-time effects at the start of the affected player's turn.
    for (const s of char.statuses) {
      const dot = _DOT_STATUSES[s.id];
      if (!dot) continue;
      const dmg = dot * (s.stacks ?? 1);
      char.currentHp -= dmg;
      const died = char.currentHp <= 0;
      _tickEvents.push({
        instanceId: char.instanceId, charName: char.name,
        statusName: s.name, symbol: s.symbol, damage: dmg, died,
      });
      if (died) { _killCharacter(char.instanceId); return; } // dead — stop ticking
    }
  }

  function expireTurnStatuses(char) {
    const toRemove = [];
    char.statuses.forEach(s => {
      if (s.type === 'timed' && s.remainingDuration != null) {
        s.remainingDuration--;
        if (s.remainingDuration <= 0) toRemove.push(s.id);
      }
    });
    char.statuses = char.statuses.filter(s => !toRemove.includes(s.id));
  }

  // ── Effective Attack — base attack modified by statuses ───────────────────
  function getEffectiveAttack(charOrId) {
    const char = typeof charOrId === 'string' ? _findChar(charOrId).char : charOrId;
    if (!char) return 0;
    let atk = char.baseAttack ?? 0;
    for (const s of char.statuses ?? []) {
      if (s.id === 'status_augmented') atk += 2 * (s.stacks ?? 1);
      if (s.id === 'status_anemic')    atk -= 2 * (s.stacks ?? 1);
    }
    return Math.max(0, atk);
  }

  // Statuses that prevent a character from attacking / using abilities
  const _NO_ATTACK  = ['status_crippled', 'status_impeded', 'status_frozen'];
  const _NO_ABILITY = ['status_impaired', 'status_impeded', 'status_frozen'];

  function canCharacterAttack(charOrId) {
    const char = typeof charOrId === 'string' ? _findChar(charOrId).char : charOrId;
    if (!char) return { ok: false, reason: 'Not found' };
    const block = char.statuses?.find(s => _NO_ATTACK.includes(s.id));
    if (block) return { ok: false, reason: `${char.name} is ${block.name} and cannot attack!` };
    return { ok: true };
  }

  function canCharacterUseAbility(charOrId) {
    const char = typeof charOrId === 'string' ? _findChar(charOrId).char : charOrId;
    if (!char) return { ok: false, reason: 'Not found' };
    const block = char.statuses?.find(s => _NO_ABILITY.includes(s.id));
    if (block) return { ok: false, reason: `${char.name} is ${block.name} and cannot use abilities!` };
    return { ok: true };
  }

  function hasStatus(instanceId, statusId) {
    const { char } = _findChar(instanceId);
    return char?.statuses.some(s => s.id === statusId) ?? false;
  }

  // ── Shop / Hand ───────────────────────────────────────────────────────────
  function addCardToHand(playerId, card, type) {
    const p = _players[playerId];
    const hand = type === 'hero' ? p.hand.heroes : p.hand.actions;
    const limit = _rules.handLimits?.[type] ?? 5;
    if (hand.length >= limit) return { ok: false, error: 'Hand full' };
    hand.push(card);
    _saveToStorage();
    return { ok: true };
  }

  function recordShopPurchase() {
    _shopPurchasesThisTurn++;
    _saveToStorage();
  }

  function getShopPurchasesThisTurn() { return _shopPurchasesThisTurn; }
  function getActionCardsPlayedThisTurn() { return _actionCardsPlayedThisTurn; }
  function getTurnNumber() { return _turnNumber; }

  // ── Roll-Off ──────────────────────────────────────────────────────────────
  function setRolloffRoll(playerId, roll) {
    _players[playerId].rolloffRoll = roll;
    _saveToStorage();
  }

  function getRolloffRolls() {
    return { p1: _players.p1.rolloffRoll, p2: _players.p2.rolloffRoll };
  }

  function setFirstPlayer(playerId) {
    _currentTurn = playerId;
    _saveToStorage();
  }

  // ── Lookup Helpers ─────────────────────────────────────────────────────────
  function _findChar(instanceId) {
    for (const [pid, p] of Object.entries(_players)) {
      const char = p.board.find(c => c.instanceId === instanceId);
      if (char) return { char, playerId: pid };
    }
    return { char: null, playerId: null };
  }

  function getCharacter(instanceId) {
    return _findChar(instanceId).char;
  }

  function getCharacterOwner(instanceId) {
    return _findChar(instanceId).playerId;
  }

  function getAllBoardCharacters() {
    return [
      ..._players.p1.board.map(c => ({ ...c, ownerId: 'p1' })),
      ..._players.p2.board.map(c => ({ ...c, ownerId: 'p2' })),
    ];
  }

  // ── Persistence ───────────────────────────────────────────────────────────
  function _saveToStorage() {
    try {
      localStorage.setItem('gameState', JSON.stringify({
        players: _players,
        currentTurn: _currentTurn,
        currentPhase: _currentPhase,
        mana: _mana,
        lastRoll: _lastRoll,
        instanceCounter: _instanceCounter,
        turnNumber: _turnNumber,
        actionCardsPlayedThisTurn: _actionCardsPlayedThisTurn,
        shopPurchasesThisTurn: _shopPurchasesThisTurn,
      }));
    } catch (_) { /* storage unavailable — non-fatal */ }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem('gameState');
      if (!raw) return false;
      const saved = JSON.parse(raw);
      _players = saved.players;
      _currentTurn = saved.currentTurn;
      _currentPhase = saved.currentPhase;
      _mana = saved.mana;
      _lastRoll = saved.lastRoll;
      _instanceCounter = saved.instanceCounter ?? 0;
      _turnNumber = saved.turnNumber ?? 1;
      _actionCardsPlayedThisTurn = saved.actionCardsPlayedThisTurn ?? 0;
      _shopPurchasesThisTurn = saved.shopPurchasesThisTurn ?? 0;
      return true;
    } catch (_) { return false; }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    init,
    getPlayerState,
    getOpponentId,
    getPlayerLabel,
    setPlayerLabel,
    getMana,
    setMana,
    spendMana,
    gainMana,
    get currentTurn() { return _currentTurn; },
    get currentPhase() { return _currentPhase; },
    setPhase,
    advanceTurn,
    setLastRoll,
    getLastRoll,
    deployHero,
    playAction,
    canPlayAction,
    commitPlayAction,
    consumeTickEvents,
    getEffectiveAttack,
    canCharacterAttack,
    canCharacterUseAbility,
    discardForMana,
    damagePlayer,
    healPlayer,
    damageCharacter,
    healCharacter,
    tapCharacter,
    untapCharacter,
    applyStatus,
    removeStatus,
    hasStatus,
    getCharacter,
    getCharacterOwner,
    getAllBoardCharacters,
    addCardToHand,
    recordShopPurchase,
    getShopPurchasesThisTurn,
    getActionCardsPlayedThisTurn,
    getTurnNumber,
    setRolloffRoll,
    getRolloffRolls,
    setFirstPlayer,
    loadFromStorage,
  };
})();
