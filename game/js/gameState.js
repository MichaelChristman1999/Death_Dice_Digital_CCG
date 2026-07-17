// ─── Game State Manager ───────────────────────────────────────────────────────
// Central source of truth for all live game data.

const GameState = (() => {
  // ── Private State ──────────────────────────────────────────────────────────
  let _rules = {};
  let _data  = {};

  let _players = {};      // keyed by 'p1' | 'p2'
  let _currentTurn = 'p1';
  let _currentPhase = 'rolloff'; // 'rolloff' | 'etiquette' | 'combat'
  let _phaseStep = 'rolloff';
  let _mana = 0; // legacy save migration only; live mana lives on each player
  let _lastRoll = null;
  let _actionStack = [];  // for response resolution (LIFO)
  let _instanceCounter = 0;
  let _turnNumber = 1;
  // Per-turn trackers (reset in advanceTurn)
  let _actionCardsPlayedThisTurn = 0;
  let _heroCardsDeployedThisTurn = 0;
  let _playerBaseAttacksThisTurn = 0;
  let _shopPurchasesThisTurn = { hero: 0, action: 0 };
  const _MANA_CAP_EXCEPTION_SOURCES = new Set(['cheatah_reroll', 'augment', 'mana_enchant', 'blood_mana']);
  const _QUEUED_STATUS_IDS = new Set(['status_crippled', 'status_augmented']);
  const _NEGATIVE_STATUS_IDS = new Set([
    'status_poisoned', 'status_anemic', 'status_crippled', 'status_impaired',
    'status_impeded', 'status_drunk', 'status_charmed', 'status_edible',
    'status_frozen', 'status_rabies', 'status_locked_out', 'status_burning',
    'status_haunted', 'status_shocked', 'status_cursed', 'status_virus',
    'status_jinxed', 'status_example_timed', 'status_example_permanent',
  ]);
  const _STATUS_CANCELS = {
    status_accelerated: ['status_impeded'],
    status_impeded: ['status_accelerated'],
    status_burning: ['status_frozen'],
    status_frozen: ['status_burning'],
    status_blessed: ['status_cursed'],
    status_cursed: ['status_blessed'],
  };
  const _POSITIVE_SHARED_STATUS_IDS = new Set([
    'status_accelerated', 'status_augmented', 'status_blessed', 'status_sidestep',
  ]);
  const _SAFEGUARD_BLOCK_STATUS_IDS = new Set([
    'status_charmed', 'status_impeded', 'status_haunted',
    'status_edible', 'status_shocked', 'status_frozen',
  ]);

  // ── Init ───────────────────────────────────────────────────────────────────
  function init(gameData, options = {}) {
    _data  = gameData;
    _rules = gameData.rules;

    _players = {
      p1: _createPlayerState('p1', 'Player 1'),
      p2: _createPlayerState('p2', 'Player 2'),
    };

    _currentTurn  = 'p1';
    _currentPhase = 'rolloff';
    _phaseStep    = 'rolloff';
    _mana         = 0;
    _lastRoll     = null;
    _actionStack  = [];
    _instanceCounter = 0;
    _turnNumber = 1;
    _actionCardsPlayedThisTurn = 0;
    _heroCardsDeployedThisTurn = 0;
    _playerBaseAttacksThisTurn = 0;
    _shopPurchasesThisTurn = { hero: 0, action: 0 };

    if (!options.skipSave) _saveToStorage();
  }

  function _createPlayerState(id, label) {
    return {
      id,
      label,
      hp: _rules.startingPlayerHP ?? 40,
      mana: 0,
      statuses: [],
      hand: { heroes: [], actions: [] },
      board: [],
      captainId: null,
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

  function getMaxMana() {
    return _rules.mana?.maxPool ?? 12;
  }

  function canExceedManaCap(playerId = _currentTurn, source = null) {
    if (!source || !_MANA_CAP_EXCEPTION_SOURCES.has(source)) return false;
    if (source === 'mana_enchant') return hasManaCaptain(playerId);
    return true;
  }

  function _resolveManaArgs(playerIdOrOptions, maybeOptions) {
    if (typeof playerIdOrOptions === 'string') {
      return { playerId: playerIdOrOptions, ...(maybeOptions ?? {}) };
    }
    return { playerId: _currentTurn, ...(playerIdOrOptions ?? {}) };
  }

  function getMana(playerId = _currentTurn) {
    return _players[playerId]?.mana ?? 0;
  }

  function setMana(value, playerIdOrOptions, maybeOptions) {
    const { playerId, bypassCap = false, source = null } = _resolveManaArgs(playerIdOrOptions, maybeOptions);
    const p = _players[playerId];
    if (!p) return 0;
    const cap = (bypassCap || canExceedManaCap(playerId, source)) ? Number.POSITIVE_INFINITY : getMaxMana();
    p.mana = Math.max(0, Math.min(cap, value));
    _saveToStorage();
    return p.mana;
  }

  function spendMana(amount, playerId = _currentTurn) {
    const p = _players[playerId];
    if (!p || p.mana < amount) return false;
    p.mana -= amount;
    _saveToStorage();
    return true;
  }

  function gainMana(amount, playerIdOrOptions, maybeOptions) {
    const { playerId, bypassCap = false, source = null } = _resolveManaArgs(playerIdOrOptions, maybeOptions);
    const before = getMana(playerId);
    const after = setMana(before + amount, playerId, { bypassCap, source });
    _saveToStorage();
    return after - before;
  }

  // ── Turn / Phase ───────────────────────────────────────────────────────────
  function setPhase(phase) {
    _currentPhase = phase;
    _saveToStorage();
  }

  function setPhaseStep(step) {
    _phaseStep = step;
    _saveToStorage();
  }

  function getPhaseStep() { return _phaseStep; }

  function advanceTurn() {
    const endingTurn = _currentTurn;
    _tickEvents = [];

    // End-of-turn expiry happens for the player who just acted. This keeps
    // Cripple/Impede active during the affected player's actual turn.
    [...(_players[endingTurn]?.board ?? [])].forEach(char => expireTurnStatuses(char));
    expirePlayerStatuses(endingTurn);

    _currentTurn = getOpponentId(_currentTurn);
    _turnNumber++;
    _lastRoll = null;
    _actionCardsPlayedThisTurn = 0;
    _heroCardsDeployedThisTurn = 0;
    _playerBaseAttacksThisTurn = 0;
    _shopPurchasesThisTurn = { hero: 0, action: 0 };

    // Reset per-turn state for new active player
    const p = _players[_currentTurn];
    p.discardedForManaThisTurn = { hero: 0, action: 0 };

    // Untap all characters for the new player unless a lockout status keeps them tapped.
    p.board.forEach(c => {
      const locked = (c.statuses ?? []).some(s => ['status_impeded', 'status_frozen'].includes(s.id));
      c.tapped = locked;
      c.hasAttackedThisTurn = false;
      c.hasUsedAbilityThisTurn = false;
    });

    // Tick timed statuses for the new player's board.
    // Iterate over a COPY — poison deaths splice the live board array.
    applyPlayerTurnStartStatuses(_currentTurn);
    if (p.hp > 0) [...p.board].forEach(char => applyTurnStartStatuses(char));

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
    const instance = {
      instanceId: `char_${_instanceCounter}`,
      id: heroData.id,
      name: heroData.name,
      maxHp: heroData.hp,
      currentHp: heroData.hp,
      baseAttack: heroData.baseAttack,
      manaCost: heroData.manaCost ?? 0,
      role: heroData.role ?? '',
      roleType: heroData.roleType ?? '',
      archetype: heroData.archetype ?? '',
      abilities: heroData.abilities ?? [],
      passives: heroData.passives ?? [],
      tapped: false,
      hasAttackedThisTurn: false,
      hasUsedAbilityThisTurn: false,
      statuses: [],
      damageTokens: 0,
    };
    _applyInnatePassives(instance, heroData);
    return instance;
  }

  function _applyInnatePassives(instance, heroData) {
    const passiveText = [
      ...(heroData.passives ?? []).map(p => `${p.name ?? ''} ${p.description ?? ''}`),
      heroData.docAbility ?? '',
    ].join(' ');

    if (/Mr\.?\s*Immutable/i.test(heroData.name ?? '')) {
      instance._statusImmune = true;
    }

    if (/Durability/i.test(heroData.roleType ?? '')) {
      const overhealth = passiveText.match(/(\d+)\s*overhealth/i);
      if (overhealth) {
        const amount = Number(overhealth[1]);
        instance.maxHp += amount;
        instance.currentHp += amount;
      }

      const revive = passiveText.match(/respawn with\s*(\d+)\s*HP/i);
      if (revive) {
        instance._reviveHp = Number(revive[1]);
        instance._reviveUsed = false;
      }
    }
  }

  function _shouldAutoAssignAbility(heroData) {
    return !/^(Passive|Durability)$/i.test(heroData.roleType ?? '');
  }

  // ── Deploy / Play ──────────────────────────────────────────────────────────
  function deployHero(playerId, cardId) {
    const p = _players[playerId];
    const idx = p.hand.heroes.findIndex(c => c.id === cardId);
    if (idx === -1) return { ok: false, error: 'Card not in hand' };
    if (p.board.length >= (_rules.fieldLimits?.heroes ?? 5)) {
      return { ok: false, error: 'Hero field full' };
    }

    const card = p.hand.heroes[idx];
    const freeCast = card._freeCast === true;
    if (_heroCardsDeployedThisTurn >= getHeroCardLimit(playerId)) {
      return { ok: false, error: 'Only one hero card per turn' };
    }
    if (!freeCast && getMana(playerId) < card.manaCost) return { ok: false, error: 'Not enough mana' };

    if (!freeCast && !spendMana(card.manaCost, playerId)) return { ok: false, error: 'Mana spend failed' };

    p.hand.heroes.splice(idx, 1);
    const instance = _createCharacterInstance(card);
    // Preserve full hero data on the instance for ability lookups
    instance._sourceCard = card;
    // Attach a playable ability (role-based, flavored) — heroes in data have none
    if (!instance.abilities?.length && typeof HeroAbilities !== 'undefined' && _shouldAutoAssignAbility(card)) {
      instance.abilities = HeroAbilities.getFor(card);
    }
    p.board.push(instance);
    _heroCardsDeployedThisTurn++;

    _saveToStorage();
    return { ok: true, instance };
  }

  function reorderBoardCharacter(playerId, instanceId, targetIndex) {
    const p = _players[playerId];
    if (!p?.board?.length) return { ok: false, error: 'No board' };
    const from = p.board.findIndex(c => c.instanceId === instanceId);
    if (from === -1) return { ok: false, error: 'Hero not found' };
    const [card] = p.board.splice(from, 1);
    const to = Math.max(0, Math.min(targetIndex, p.board.length));
    p.board.splice(to, 0, card);
    _saveToStorage();
    return { ok: true, from, to };
  }

  function setCaptain(playerId, instanceId = null) {
    const p = _players[playerId];
    if (!p) return { ok: false, error: 'Player not found' };
    if (!instanceId) {
      p.captainId = null;
      _saveToStorage();
      return { ok: true, captain: null };
    }

    const captain = p.board.find(c => c.instanceId === instanceId);
    if (!captain) return { ok: false, error: 'Hero not on board' };
    p.captainId = instanceId;
    _activateCaptainRolePassive(playerId, captain);
    _saveToStorage();
    return { ok: true, captain };
  }

  function _activateCaptainRolePassive(playerId, captain) {
    const role = captain.roleType || captain._sourceCard?.roleType || '';
    const names = {
      Agility: 'Evasive Maneuver',
      Balanced: 'Enact',
      Durability: 'Safeguard',
      IQ: 'Foresight',
      Legendary: 'Invocation',
      Mana: 'Enchant',
      Passive: 'Imbue',
      Speed: 'Enhanced Reflex',
      Strength: 'Crit-Hit Chance',
      Technique: 'Duelist',
    };
    const key = Object.keys(names).find(k => new RegExp(k, 'i').test(role));
    if (!key) return;
    try { showToast?.(`${names[key]} active.`, 'info'); } catch (_) {}
    if (key === 'Passive') {
      const p = _players[playerId];
      applyPlayerStatus(playerId, 'status_imbued');
      p.board.filter(c => c.instanceId !== captain.instanceId)
        .forEach(c => applyStatus(c.instanceId, 'status_imbued'));
    }
  }

  function _autoBackfillCaptain(playerId, playerState) {
    const board = playerState?.board ?? [];
    if (!board.length) {
      playerState.captainId = null;
      return null;
    }

    const durabilityHeroes = board.filter(c => /Durability/i.test(c.roleType || c._sourceCard?.roleType || ''));
    const candidatePool = durabilityHeroes.length ? durabilityHeroes : board;
    const highestMaxHp = Math.max(...candidatePool.map(c => Number(c.maxHp ?? c.hp ?? 0)));
    const tiedCandidates = candidatePool.filter(c => Number(c.maxHp ?? c.hp ?? 0) === highestMaxHp);
    const nextCaptain = tiedCandidates[Math.floor(Math.random() * tiedCandidates.length)] ?? null;

    playerState.captainId = nextCaptain?.instanceId ?? null;
    if (nextCaptain) _activateCaptainRolePassive(playerId, nextCaptain);
    return nextCaptain;
  }

  function getCaptain(playerId) {
    const p = _players[playerId];
    if (!p?.captainId) return null;
    return p.board?.find(c => c.instanceId === p.captainId) ?? null;
  }

  function getCaptainRoleType(playerId) {
    const captain = getCaptain(playerId);
    return captain?.roleType || captain?._sourceCard?.roleType || '';
  }

  function hasCaptainClass(playerId, roleName) {
    const captain = getCaptain(playerId);
    if (!captain) return false;
    if (hasStatus(captain.instanceId, 'status_impeded')) return false;
    return new RegExp(roleName, 'i').test(captain.roleType || captain._sourceCard?.roleType || '');
  }

  function hasSpeedCaptain(playerId) {
    return hasCaptainClass(playerId, 'Speed');
  }

  function hasManaCaptain(playerId) {
    return hasCaptainClass(playerId, 'Mana');
  }

  function hasIQCaptain(playerId) {
    return hasCaptainClass(playerId, 'IQ');
  }

  function hasDurabilityCaptain(playerId) {
    return hasCaptainClass(playerId, 'Durability');
  }

  function hasAgilityCaptain(playerId) {
    return hasCaptainClass(playerId, 'Agility');
  }

  function applyCaptainDamageBonus(playerId, amount) {
    let next = amount;
    if (hasCaptainClass(playerId, 'Strength')) {
      const roll = (typeof RollEngine !== 'undefined' && RollEngine.rollDie)
        ? RollEngine.rollDie(6)
        : Math.floor(Math.random() * 6) + 1;
      if (roll >= 5) {
        next *= 2;
        try { showToast?.(`Crit-Hit rolled ${roll}!`, 'combat'); } catch (_) {}
      }
    }
    return next;
  }

  function tryManaEnchant(playerId = _currentTurn) {
    if (!hasManaCaptain(playerId)) return 0;
    if (Math.random() >= 0.5) return 0;
    return gainMana(3, playerId, { source: 'mana_enchant' });
  }

  // Validate an action card WITHOUT spending anything — used by the targeting
  // flow so a cancelled/invalid play never costs mana or the card.
  function canPlayAction(playerId, cardId) {
    const p = _players[playerId];
    const card = p.hand.actions.find(c => c.id === cardId);
    if (!card) return { ok: false, error: 'Card not in hand' };

    const isFree = card._freeCast === true || card.manaCost === 0 || card.type === 'free';
    const freeCardsUnlimited = _rules.combat?.freeActionCardsUnlimited !== false;
    const countsAsAction = card._freeCast !== true && !(isFree && freeCardsUnlimited);
    const actionLimit = getActionCardLimit(playerId);
    if (countsAsAction && _actionCardsPlayedThisTurn >= actionLimit) {
      return { ok: false, error: 'Only one action card per turn' };
    }
    if (card.id === 'action_blood_mana') {
      const captain = getCaptain(playerId);
      const wouldExceedSix = getMana(playerId) + (card.effectValue ?? 5) > 6;
      if (hasManaCaptain(playerId)) {
        return { ok: false, error: 'Blood Mana is disabled with a Mana captain' };
      }
      if (hasPlayerStatus(playerId, 'status_augmented') || (captain && hasStatus(captain.instanceId, 'status_augmented'))) {
        return { ok: false, error: 'Blood Mana is disabled while Augmented' };
      }
      if (wouldExceedSix && p.hp <= 10) {
        return { ok: false, error: 'Blood Mana would defeat you' };
      }
    }
    if (card.id === 'action_cryofreeze' && p.hp <= previewPlayerDamage(playerId, 1)) {
      return { ok: false, error: 'Cryofreeze fail damage would defeat you' };
    }
    if (hasPlayerStatus(playerId, 'status_frozen') && card.id !== 'action_accelerate') {
      return { ok: false, error: 'Frozen blocks cards' };
    }
    if (hasPlayerStatus(playerId, 'status_impeded')) {
      const attackEffects = new Set(['cascade_damage', 'deal_damage', 'multi_damage', 'rabies', 'control_character']);
      if (attackEffects.has(card.effect)) return { ok: false, error: 'Impeded blocks attacks' };
    }
    if (!isFree) {
      if (getMana(playerId) < card.manaCost) return { ok: false, error: 'Not enough mana' };
    }
    return { ok: true, card, isFree, countsAsAction };
  }

  function getActionCardLimit(playerId = _currentTurn) {
    let limit = _rules.combat?.actionCardsPerTurn ?? 1;
    const captain = getCaptain(playerId);
    if (hasPlayerStatus(playerId, 'status_accelerated') || (captain && hasStatus(captain.instanceId, 'status_accelerated'))) limit++;
    if (hasSpeedCaptain(playerId)) limit++;
    return limit;
  }

  function getHeroCardLimit(playerId = _currentTurn) {
    let limit = _rules.combat?.heroCardsPerTurn ?? 1;
    const captain = getCaptain(playerId);
    if (hasPlayerStatus(playerId, 'status_accelerated') || (captain && hasStatus(captain.instanceId, 'status_accelerated'))) limit++;
    return limit;
  }

  function getPlayerBaseAttackDamage(playerId = _currentTurn) {
    let damage = _rules.combat?.playerBaseAttack ?? 2;
    if (hasPlayerStatus(playerId, 'status_augmented')) damage += 2;
    if (hasPlayerStatus(playerId, 'status_blessed')) damage *= 2;
    if (hasPlayerStatus(playerId, 'status_stimulated')) damage *= 3;
    if (hasPlayerStatus(playerId, 'status_cursed')) damage = Math.ceil(damage / 2);
    if (hasPlayerStatus(playerId, 'status_impaired')) damage -= damage === 2 ? 1 : 2;
    if (hasPlayerStatus(playerId, 'status_anemic')) damage = Math.max(0, damage - 2);
    return Math.max(1, damage);
  }

  function getPlayerBaseAttackLimit(playerId = _currentTurn) {
    let limit = 1;
    if (hasPlayerStatus(playerId, 'status_accelerated')) limit++;
    return limit;
  }

  function canPlayerBaseAttack(playerId = _currentTurn) {
    if (playerId !== _currentTurn) return { ok: false, error: 'Not your turn' };
    if (_currentPhase !== 'combat' || _phaseStep !== 'main') return { ok: false, error: 'Combat only' };
    if ((_players[playerId]?.board?.length ?? 0) > 0) return { ok: false, error: 'Player base attack requires an empty field' };
    if (_playerBaseAttacksThisTurn >= getPlayerBaseAttackLimit(playerId)) return { ok: false, error: 'Base attack already used' };
    const blocker = (_players[playerId]?.statuses ?? [])
      .find(s => ['status_frozen', 'status_impeded', 'status_charmed', 'status_haunted', 'status_edible', 'status_shocked'].includes(s.id));
    if (blocker) return { ok: false, error: `${blocker.name} blocks player attack` };
    return {
      ok: true,
      damage: getPlayerBaseAttackDamage(playerId),
      attacksRemaining: Math.max(0, getPlayerBaseAttackLimit(playerId) - _playerBaseAttacksThisTurn),
    };
  }

  function commitPlayerBaseAttack(playerId = _currentTurn) {
    const check = canPlayerBaseAttack(playerId);
    if (!check.ok) return check;
    _playerBaseAttacksThisTurn++;
    _saveToStorage();
    return check;
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
      if (!spendMana(card.manaCost, playerId)) return { ok: false, error: 'Mana spend failed' };
    }
    if (check.countsAsAction) _actionCardsPlayedThisTurn++;
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
    const discardRules = _rules.mana?.discardForMana ?? {};
    const limit = cardType === 'hero'
      ? (discardRules.maxHeroPerTurn ?? 1)
      : (discardRules.maxActionPerTurn ?? 1);
    const used  = p.discardedForManaThisTurn[cardType] ?? 0;
    if (used >= limit) return { ok: false, error: `Already discarded a ${cardType}` };

    const hand = cardType === 'hero' ? p.hand.heroes : p.hand.actions;
    const idx  = hand.findIndex(c => c.id === cardId);
    if (idx === -1) return { ok: false, error: 'Card not in hand' };

    const card = hand[idx];
    const refund = _getDiscardRefund(card, cardType);
    hand.splice(idx, 1);
    p.graveyard.push(card);
    p.discardedForManaThisTurn[cardType]++;
    gainMana(refund, playerId);

    _saveToStorage();
    return { ok: true, refund };
  }

  function _getDiscardRefund(card, cardType) {
    if (cardType === 'action') return 1;
    const cost = card?.manaCost ?? 0;
    return cost <= 2 ? 1 : Math.ceil(cost / 2);
  }

  function forceDiscardFromHand(playerId, cardId, cardType = 'action') {
    const p = _players[playerId];
    const hand = cardType === 'hero' ? p?.hand?.heroes : p?.hand?.actions;
    if (!hand) return { ok: false, error: 'Hand not found' };
    const idx = hand.findIndex(c => c.id === cardId);
    if (idx === -1) return { ok: false, error: 'Card not in hand' };
    const [card] = hand.splice(idx, 1);
    p.graveyard.push(card);
    _saveToStorage();
    return { ok: true, card };
  }

  // ── HP Manipulation ────────────────────────────────────────────────────────
  function damagePlayer(playerId, amount, options = {}) {
    const p = _players[playerId];
    if (!options.ignoreSidestep && _tryPlayerSidestep(playerId, 'attack')) return p.hp;
    if (options.roleEvasion && _tryRoleEvasion(playerId, 'player', playerId)) return p.hp;
    const dmg = previewPlayerDamage(playerId, amount);
    p.hp = Math.max(0, p.hp - dmg);
    if (options.splashCaptain && dmg > 0) _splashDamageToCaptain(playerId, amount);
    _saveToStorage();
    return p.hp;
  }

  function _splashDamageToCaptain(playerId, amount) {
    const captain = getCaptain(playerId);
    if (!captain) return;
    const before = captain.currentHp ?? 0;
    const hp = damageCharacter(captain.instanceId, amount);
    const after = Math.max(0, hp ?? captain.currentHp ?? 0);
    const actual = Math.max(0, before - after);
    if (actual > 0) {
      try { PixiBoard?.showHitEffect?.('character', captain.instanceId, actual); } catch (_) {}
    }
  }

  function healPlayer(playerId, amount) {
    const p = _players[playerId];
    if (hasPlayerStatus(playerId, 'status_anemic') || hasPlayerStatus(playerId, 'status_cursed')) return p.hp;
    p.hp += amount;
    _saveToStorage();
    return p.hp;
  }

  function damageCharacter(instanceId, amount, options = {}) {
    const { char } = _findChar(instanceId);
    if (!char) return null;
    if (_tryCharacterSidestep(instanceId, 'attack')) return char.currentHp;
    const ownerId = getCharacterOwner(instanceId);
    const captain = getCaptain(ownerId);
    if (options.roleEvasion && captain?.instanceId === instanceId && _tryRoleEvasion(ownerId, 'character', instanceId)) {
      return char.currentHp;
    }
    const dmg = previewCharacterDamage(instanceId, amount);
    char.currentHp -= dmg;
    if (char.currentHp <= 0) _killCharacter(instanceId);
    _saveToStorage();
    return char.currentHp;
  }

  function healCharacter(instanceId, amount, options = {}) {
    const { char } = _findChar(instanceId);
    if (!char) return null;
    if ((char.statuses ?? []).some(s => s.id === 'status_anemic' || s.id === 'status_cursed')) return char.currentHp;
    char.currentHp = options.overheal
      ? char.currentHp + amount
      : Math.min(char.maxHp, char.currentHp + amount);
    _saveToStorage();
    return char.currentHp;
  }

  function previewPlayerDamage(playerId, amount) {
    let dmg = amount;
    if (hasPlayerStatus(playerId, 'status_crippled') || hasPlayerStatus(playerId, 'status_cursed')) dmg *= 2;
    if (hasPlayerStatus(playerId, 'status_blessed')) dmg = Math.ceil(dmg / 2);
    return Math.max(0, dmg);
  }

  function previewCharacterDamage(instanceId, amount) {
    const { char } = _findChar(instanceId);
    const statuses = char?.statuses ?? [];
    let dmg = amount;
    if (statuses.some(s => s.id === 'status_crippled' || s.id === 'status_frozen' || s.id === 'status_cursed')) dmg *= 2;
    if (statuses.some(s => s.id === 'status_blessed')) dmg = Math.ceil(dmg / 2);
    return Math.max(0, dmg);
  }

  function getSafeguardCaptain(playerId, target = null) {
    const captain = getCaptain(playerId);
    if (!captain || !hasDurabilityCaptain(playerId)) return null;
    if (target?.type === 'character' && target.id === captain.instanceId) return null;
    if ((captain.statuses ?? []).some(s => _SAFEGUARD_BLOCK_STATUS_IDS.has(s.id))) return null;
    return captain;
  }

  function damageTarget(target, amount, options = {}) {
    if (!target) return null;
    const ownerId = target.type === 'player' ? target.id : getCharacterOwner(target.id);
    const safeguard = options.allowSafeguard !== false
      ? getSafeguardCaptain(ownerId, target)
      : null;

    if (safeguard) {
      const redirected = options.safeguardDamage ?? Math.ceil(amount * 1.5);
      const before = safeguard.currentHp ?? 0;
      const hp = damageCharacter(safeguard.instanceId, redirected, { roleEvasion: false });
      const after = Math.max(0, hp ?? safeguard.currentHp ?? 0);
      const actual = Math.max(0, before - after);
      try { showToast?.('Safeguard blocks.', 'combat'); } catch (_) {}
      return {
        type: 'character',
        id: safeguard.instanceId,
        ownerId,
        amount: redirected,
        actualDamage: actual,
        safeguarded: true,
      };
    }

    if (target.type === 'player') {
      const player = _players[target.id];
      const before = player?.hp ?? 0;
      const hp = damagePlayer(target.id, amount, {
        splashCaptain: options.splashCaptain ?? true,
        roleEvasion: options.roleEvasion ?? true,
      });
      const actual = Math.max(0, before - Math.max(0, hp ?? before));
      return { type: 'player', id: target.id, ownerId, amount, actualDamage: actual, hp };
    }

    const before = getCharacter(target.id)?.currentHp ?? 0;
    const hp = damageCharacter(target.id, amount, { roleEvasion: options.roleEvasion ?? true });
    const actual = Math.max(0, before - Math.max(0, hp ?? before));
    return { type: 'character', id: target.id, ownerId, amount, actualDamage: actual, hp };
  }

  function applyStatusToTarget(target, statusId, options = {}) {
    if (!target || !statusId) return { applied: false };
    const isNegative = _NEGATIVE_STATUS_IDS.has(statusId);
    const ownerId = target.type === 'player' ? target.id : getCharacterOwner(target.id);
    const safeguard = options.allowSafeguard !== false && isNegative
      ? getSafeguardCaptain(ownerId, target)
      : null;

    if (safeguard) {
      const applied = applyStatus(safeguard.instanceId, statusId, { sharePlayer: false });
      try { showToast?.('Safeguard absorbs the status.', 'combat'); } catch (_) {}
      return {
        type: 'character',
        id: safeguard.instanceId,
        ownerId,
        statusId,
        applied,
        safeguarded: true,
      };
    }

    if (target.type === 'player') {
      const applied = applyPlayerStatus(target.id, statusId, {
        splashCaptain: options.splashCaptain ?? isNegative,
      });
      return { type: 'player', id: target.id, ownerId, statusId, applied };
    }

    const applied = applyStatus(target.id, statusId);
    return { type: 'character', id: target.id, ownerId, statusId, applied };
  }

  function _killCharacter(instanceId) {
    for (const [playerId, p] of Object.entries(_players)) {
      const idx = p.board.findIndex(c => c.instanceId === instanceId);
      if (idx !== -1) {
        const char = p.board[idx];
        if (char._reviveHp && !char._reviveUsed) {
          char._reviveUsed = true;
          char.maxHp = Math.max(char.maxHp, char._reviveHp);
          char.currentHp = char._reviveHp;
          char.statuses = [];
          _saveToStorage();
          return;
        }
        const [dead] = p.board.splice(idx, 1);
        if (p.captainId === dead.instanceId) _autoBackfillCaptain(p.id ?? playerId, p);
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
  function applyStatus(instanceId, statusId, options = {}) {
    const { char } = _findChar(instanceId);
    if (!char) return false;

    const def = _data.statusEffects.find(s => s.id === statusId);
    if (!def) return false;
    if (_NEGATIVE_STATUS_IDS.has(statusId) && _tryCharacterSidestep(instanceId, 'debuff')) return false;
    if (char._statusImmune && _NEGATIVE_STATUS_IDS.has(statusId)) return false;
    const ownerId = getCharacterOwner(instanceId);
    if (_playerStatusBlocksCharacterStatus(ownerId, statusId)) return false;
    if (statusId === 'status_impaired' && (char.baseAttack ?? 0) <= 1) return false;

    _removeCancelingStatuses(char.statuses, statusId);
    if (statusId === 'status_accelerated') {
      char.tapped = false;
      char.hasAttackedThisTurn = false;
      char.hasUsedAbilityThisTurn = false;
    }

    const existing = char.statuses.findIndex(s => s.id === statusId);

    if (existing !== -1) {
      if (def.stackBehavior === 'stack') {
        char.statuses[existing].stacks = (char.statuses[existing].stacks ?? 1) + 1;
      } else if (_QUEUED_STATUS_IDS.has(statusId)) {
        char.statuses[existing].queued = (char.statuses[existing].queued ?? 0) + 1;
        try { showToast?.(`${def.name} queued.`, 'info'); } catch (_) {}
      } else if (def.stackBehavior === 'replace') {
        char.statuses[existing] = { ...def, remainingDuration: def.duration };
      } else if (def.stackBehavior === 'cancel') {
        char.statuses.splice(existing, 1);
      }
    } else {
      const limit = _rules.statusLimits?.character ?? 6;
      if (char.statuses.length >= limit) {
        try { showToast?.(`${char.name} status slots full.`, 'warn'); } catch (_) {}
        return false;
      }
      char.statuses.push({ ...def, remainingDuration: def.duration, stacks: 1 });
    }

    const isCaptain = getCaptain(ownerId)?.instanceId === instanceId;
    if ((options.sharePlayer ?? true) && isCaptain && _POSITIVE_SHARED_STATUS_IDS.has(statusId)) {
      applyPlayerStatus(ownerId, statusId, { shareCaptain: false, splashCaptain: false });
    }

    _saveToStorage();
    return true;
  }

  function _removeCancelingStatuses(statuses = [], incomingStatusId) {
    const cancels = _STATUS_CANCELS[incomingStatusId];
    if (!cancels?.length) return false;
    const before = statuses.length;
    for (let i = statuses.length - 1; i >= 0; i--) {
      if (cancels.includes(statuses[i].id)) statuses.splice(i, 1);
    }
    return before !== statuses.length;
  }

  function removeStatus(instanceId, statusId) {
    const { char } = _findChar(instanceId);
    if (!char) return false;
    char.statuses = char.statuses.filter(s => s.id !== statusId);
    _saveToStorage();
    return true;
  }

  function removePlayerStatus(playerId, statusId) {
    const p = _players[playerId];
    if (!p?.statuses) return false;
    p.statuses = p.statuses.filter(s => s.id !== statusId);
    _saveToStorage();
    return true;
  }

  function applyPlayerStatus(playerId, statusId, options = {}) {
    const p = _players[playerId];
    if (!p) return false;
    if (isPlayerImmuneToStatus(playerId, statusId)) return false;
    const def = _data.statusEffects.find(s => s.id === statusId);
    if (!def) return false;
    if (_NEGATIVE_STATUS_IDS.has(statusId) && _tryPlayerSidestep(playerId, 'debuff')) return false;
    p.statuses ??= [];
    _removeCancelingStatuses(p.statuses, statusId);
    const existing = p.statuses.findIndex(s => s.id === statusId);
    if (existing !== -1) {
      if (def.stackBehavior === 'stack') {
        p.statuses[existing].stacks = (p.statuses[existing].stacks ?? 1) + 1;
      } else if (_QUEUED_STATUS_IDS.has(statusId)) {
        p.statuses[existing].queued = (p.statuses[existing].queued ?? 0) + 1;
        try { showToast?.(`${def.name} queued.`, 'info'); } catch (_) {}
      } else if (def.stackBehavior === 'replace') {
        p.statuses[existing] = { ...def, remainingDuration: def.duration };
      } else if (def.stackBehavior === 'cancel') {
        p.statuses.splice(existing, 1);
      }
    } else {
      const limit = _rules.statusLimits?.player ?? 6;
      if (p.statuses.length >= limit) {
        try { showToast?.(`${getPlayerLabel(playerId)} status slots full.`, 'warn'); } catch (_) {}
        return false;
      }
      p.statuses.push({ ...def, remainingDuration: def.duration, stacks: 1 });
    }
    if ((options.shareCaptain ?? true) && _POSITIVE_SHARED_STATUS_IDS.has(statusId)) {
      _sharePositiveStatusToCaptain(playerId, statusId);
    }
    if (options.splashCaptain && _NEGATIVE_STATUS_IDS.has(statusId)) {
      _splashStatusToCaptain(playerId, statusId);
    }
    _saveToStorage();
    return true;
  }

  function _splashStatusToCaptain(playerId, statusId) {
    const captain = getCaptain(playerId);
    if (!captain) return;
    const applied = applyStatus(captain.instanceId, statusId, { sharePlayer: false });
    if (applied) {
      try { showToast?.(`${captain.name} shares ${_data.statusEffects.find(s => s.id === statusId)?.name ?? 'status'}.`, 'combat'); } catch (_) {}
    }
  }

  function _sharePositiveStatusToCaptain(playerId, statusId) {
    const captain = getCaptain(playerId);
    if (!captain) return;
    applyStatus(captain.instanceId, statusId, { sharePlayer: false });
  }

  function hasPlayerStatus(playerId, statusId) {
    return _players[playerId]?.statuses?.some(s => s.id === statusId) ?? false;
  }

  function canPlayerReceiveStatus(playerId, statusId) {
    if (!_players[playerId] || !statusId) return false;
    if (isPlayerImmuneToStatus(playerId, statusId)) return false;
    const statuses = _players[playerId].statuses ?? [];
    const exists = statuses.some(s => s.id === statusId);
    if (!exists && statuses.length >= (_rules.statusLimits?.player ?? 6)) return false;
    return !hasPlayerStatus(playerId, statusId);
  }

  function isPlayerImmuneToStatus(playerId, statusId) {
    if (!playerId) return false;
    if (_NEGATIVE_STATUS_IDS.has(statusId) && getCaptain(playerId)?._statusImmune) return true;
    return ['status_charmed', 'status_drunk'].includes(statusId)
      && hasPlayerStatus(playerId, 'status_abstaining');
  }

  function _playerStatusBlocksCharacterStatus(playerId, statusId) {
    return !!playerId
      && ['status_charmed', 'status_drunk'].includes(statusId)
      && hasPlayerStatus(playerId, 'status_abstaining');
  }

  function _rollSidestep(label, reason) {
    const roll = (typeof RollEngine !== 'undefined' && RollEngine.rollDie)
      ? RollEngine.rollDie()
      : Math.floor(Math.random() * 6) + 1;
    const dodged = roll >= 4;
    try {
      showToast?.(`Sidestep rolled ${roll}.`, 'info');
      showToast?.(dodged ? `${label} dodged.` : `${label} failed dodge.`, dodged ? 'info' : 'warn');
    } catch (_) {}
    return dodged;
  }

  function _tryPlayerSidestep(playerId, reason) {
    const p = _players[playerId];
    if (!p?.statuses?.some(s => s.id === 'status_sidestep')) return false;
    if (hasPlayerStatus(playerId, 'status_impeded')) {
      try { showToast?.('Impede blocks dodge.', 'warn'); } catch (_) {}
      return false;
    }
    removePlayerStatus(playerId, 'status_sidestep');
    return _rollSidestep(getPlayerLabel(playerId), reason);
  }

  function _tryCharacterSidestep(instanceId, reason) {
    const { char } = _findChar(instanceId);
    if (!char?.statuses?.some(s => s.id === 'status_sidestep')) return false;
    if (char.statuses?.some(s => s.id === 'status_impeded')) {
      try { showToast?.('Impede blocks dodge.', 'warn'); } catch (_) {}
      return false;
    }
    removeStatus(instanceId, 'status_sidestep');
    return _rollSidestep(char.name, reason);
  }

  function _tryRoleEvasion(playerId, targetType, targetId) {
    if (!hasAgilityCaptain(playerId)) return false;
    const captain = getCaptain(playerId);
    if (targetType === 'character' && targetId !== captain?.instanceId) return false;
    const roll = (typeof RollEngine !== 'undefined' && RollEngine.rollDie)
      ? RollEngine.rollDie()
      : Math.floor(Math.random() * 6) + 1;
    const dodged = roll >= 4;
    try {
      showToast?.(`Evasion rolled ${roll}.`, 'info');
      if (dodged) showToast?.('Evasive Maneuver.', 'info');
    } catch (_) {}
    return dodged;
  }

  // Damage-over-time statuses: id → damage per stack per tick
  const _DOT_STATUSES = { status_poisoned: 3, status_burning: 3, status_haunted: 2, status_example_timed: 1 };

  function applyTurnStartStatuses(char) {
    // Apply damage-over-time effects at the start of the affected player's turn.
    for (const s of char.statuses) {
      const dot = _DOT_STATUSES[s.id];
      if (!dot) continue;
      const dmg = previewCharacterDamage(char.instanceId, dot * (s.stacks ?? 1));
      char.currentHp -= dmg;
      const died = char.currentHp <= 0;
      _tickEvents.push({
        instanceId: char.instanceId, charName: char.name,
        statusName: s.name, symbol: s.symbol, damage: dmg, died,
      });
      if (died) { _killCharacter(char.instanceId); return; } // dead — stop ticking
    }
  }

  function applyPlayerTurnStartStatuses(playerId) {
    const p = _players[playerId];
    if (!p?.statuses?.length) return;
    for (const s of p.statuses) {
      const dot = _DOT_STATUSES[s.id];
      if (!dot) continue;
      const dmg = previewPlayerDamage(playerId, dot * (s.stacks ?? 1));
      p.hp = Math.max(0, p.hp - dmg);
      const died = p.hp <= 0;
      _tickEvents.push({
        targetType: 'player',
        playerId,
        instanceId: playerId,
        charName: getPlayerLabel(playerId),
        statusName: s.name,
        symbol: s.symbol,
        damage: dmg,
        died,
      });
      if (died) return;
    }
  }

  function expireTurnStatuses(char) {
    char.statuses = _expireStatusList(char.statuses);
  }

  function expirePlayerStatuses(playerId) {
    const p = _players[playerId];
    if (!p?.statuses) return;
    p.statuses = _expireStatusList(p.statuses);
  }

  function _expireStatusList(statuses = []) {
    const kept = [];
    statuses.forEach(s => {
      if (s.type === 'timed' && s.remainingDuration != null) {
        s.remainingDuration--;
        if (s.remainingDuration <= 0) {
          if ((s.queued ?? 0) > 0) {
            const def = _data.statusEffects.find(row => row.id === s.id);
            kept.push({
              ...(def ?? s),
              remainingDuration: def?.duration ?? s.duration ?? 1,
              stacks: s.stacks ?? 1,
              queued: (s.queued ?? 0) - 1,
            });
          }
          return;
        }
      }
      kept.push(s);
    });
    return kept;
  }

  // ── Effective Attack — base attack modified by statuses ───────────────────
  function getEffectiveAttack(charOrId) {
    const char = typeof charOrId === 'string' ? _findChar(charOrId).char : charOrId;
    if (!char) return 0;
    let atk = char.baseAttack ?? 0;
    for (const s of char.statuses ?? []) {
      if (s.id === 'status_augmented') atk += 2;
      if (s.id === 'status_blessed') atk *= 2;
      if (s.id === 'status_stimulated') atk *= 3;
      if (s.id === 'status_cursed') atk = Math.ceil(atk / 2);
      if (s.id === 'status_impaired') atk -= (char.baseAttack ?? 0) === 2 ? 1 : 2;
    }
    return Math.max(1, atk);
  }

  // Statuses that prevent a character from attacking / using abilities
  const _NO_ATTACK  = ['status_impeded', 'status_frozen', 'status_charmed', 'status_haunted', 'status_edible', 'status_shocked'];
  const _NO_ABILITY = ['status_impeded', 'status_frozen', 'status_charmed', 'status_haunted', 'status_edible', 'status_shocked'];

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
    const limit = _rules.handLimits?.[type] ?? 8;
    if (hand.length >= limit) return { ok: false, error: 'Hand full' };
    if (type === 'action') {
      const copies = hand.filter(c => c.id === card.id).length;
      if (copies >= 2) return { ok: false, error: 'Max 2 copies in hand' };
    }
    if (type === 'hero' && getAllHeroIdsInUse({ includeGraveyard: true }).has(card.id)) {
      return { ok: false, error: 'Hero already in play' };
    }
    const handCard = { ...card };
    hand.push(handCard);
    _saveToStorage();
    return { ok: true, card: handCard };
  }

  function recordShopPurchase(type = 'action') {
    if (typeof _shopPurchasesThisTurn !== 'object') {
      _shopPurchasesThisTurn = { hero: 0, action: 0 };
    }
    _shopPurchasesThisTurn[type] = (_shopPurchasesThisTurn[type] ?? 0) + 1;
    _saveToStorage();
  }

  function getShopPurchasesThisTurn(type = null) {
    if (typeof _shopPurchasesThisTurn === 'number') return type ? _shopPurchasesThisTurn : _shopPurchasesThisTurn;
    if (type) return _shopPurchasesThisTurn[type] ?? 0;
    return (_shopPurchasesThisTurn.hero ?? 0) + (_shopPurchasesThisTurn.action ?? 0);
  }
  function getActionCardsPlayedThisTurn() { return _actionCardsPlayedThisTurn; }
  function getHeroCardsDeployedThisTurn() { return _heroCardsDeployedThisTurn; }
  function getPlayerBaseAttacksThisTurn() { return _playerBaseAttacksThisTurn; }
  function getTurnNumber() { return _turnNumber; }
  function getChaosRound() {
    if (_currentPhase !== 'combat') return 0;
    return Math.max(1, Math.floor(Math.max(0, _turnNumber - 3) / 2) + 1);
  }

  function getCardPoolProfile() {
    if (_currentPhase !== 'combat') return { phase: 'order', round: 0 };
    return { phase: 'chaos', round: getChaosRound() };
  }

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

  function getAllHeroIdsInUse(options = {}) {
    const ids = new Set();
    for (const p of Object.values(_players)) {
      p.hand?.heroes?.forEach(c => ids.add(c.id));
      p.board?.forEach(c => ids.add(c.id));
      if (options.includeGraveyard) {
        p.graveyard?.forEach(c => { if ((c.id ?? '').startsWith('hero_')) ids.add(c.id); });
      }
    }
    return ids;
  }

  // ── Persistence ───────────────────────────────────────────────────────────
  function _saveToStorage() {
    try {
      localStorage.setItem('gameState', JSON.stringify({
        players: _players,
        currentTurn: _currentTurn,
        currentPhase: _currentPhase,
        phaseStep: _phaseStep,
        mana: { p1: _players.p1?.mana ?? 0, p2: _players.p2?.mana ?? 0 },
        lastRoll: _lastRoll,
        instanceCounter: _instanceCounter,
        turnNumber: _turnNumber,
        actionCardsPlayedThisTurn: _actionCardsPlayedThisTurn,
        heroCardsDeployedThisTurn: _heroCardsDeployedThisTurn,
        playerBaseAttacksThisTurn: _playerBaseAttacksThisTurn,
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
      Object.values(_players ?? {}).forEach(p => {
        p.statuses ??= [];
        p.mana ??= 0;
        p.hand ??= { heroes: [], actions: [] };
        p.hand.heroes ??= [];
        p.hand.actions ??= [];
        p.board ??= [];
        p.captainId ??= null;
        p.board.forEach(c => {
          c.roleType ??= c._sourceCard?.roleType ?? '';
          c.archetype ??= c._sourceCard?.archetype ?? '';
          c.role ??= c._sourceCard?.role ?? '';
          c.manaCost ??= c._sourceCard?.manaCost ?? 0;
        });
        if (p.captainId && !p.board.some(c => c.instanceId === p.captainId)) p.captainId = null;
        p.graveyard ??= [];
        p.discardedForManaThisTurn ??= { hero: 0, action: 0 };
      });
      _currentTurn = saved.currentTurn;
      _currentPhase = saved.currentPhase;
      _phaseStep = saved.phaseStep ?? (saved.currentPhase === 'rolloff' ? 'rolloff' : 'await_roll');
      if (typeof saved.mana === 'number') {
        _players[_currentTurn].mana = saved.mana;
      } else if (saved.mana && typeof saved.mana === 'object') {
        _players.p1.mana = saved.mana.p1 ?? _players.p1.mana ?? 0;
        _players.p2.mana = saved.mana.p2 ?? _players.p2.mana ?? 0;
      }
      _lastRoll = saved.lastRoll;
      _instanceCounter = saved.instanceCounter ?? 0;
      _turnNumber = saved.turnNumber ?? 1;
      _actionCardsPlayedThisTurn = saved.actionCardsPlayedThisTurn ?? 0;
      _heroCardsDeployedThisTurn = saved.heroCardsDeployedThisTurn ?? 0;
      _playerBaseAttacksThisTurn = saved.playerBaseAttacksThisTurn
        ?? (saved.playerBaseAttackUsedThisTurn ? 1 : 0);
      _shopPurchasesThisTurn = typeof saved.shopPurchasesThisTurn === 'object'
        ? { hero: saved.shopPurchasesThisTurn.hero ?? 0, action: saved.shopPurchasesThisTurn.action ?? 0 }
        : { hero: 0, action: saved.shopPurchasesThisTurn ?? 0 };
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
    getMaxMana,
    canExceedManaCap,
    setMana,
    spendMana,
    gainMana,
    get currentTurn() { return _currentTurn; },
    get currentPhase() { return _currentPhase; },
    setPhase,
    setPhaseStep,
    getPhaseStep,
    advanceTurn,
    setLastRoll,
    getLastRoll,
    deployHero,
    reorderBoardCharacter,
    setCaptain,
    getCaptain,
    getCaptainRoleType,
    hasCaptainClass,
    hasSpeedCaptain,
    hasManaCaptain,
    hasIQCaptain,
    hasDurabilityCaptain,
    hasAgilityCaptain,
    applyCaptainDamageBonus,
    tryManaEnchant,
    playAction,
    canPlayAction,
    commitPlayAction,
    getActionCardLimit,
    getHeroCardLimit,
    getPlayerBaseAttackDamage,
    getPlayerBaseAttackLimit,
    canPlayerBaseAttack,
    commitPlayerBaseAttack,
    consumeTickEvents,
    getEffectiveAttack,
    canCharacterAttack,
    canCharacterUseAbility,
    discardForMana,
    forceDiscardFromHand,
    damagePlayer,
    damageTarget,
    getSafeguardCaptain,
    previewPlayerDamage,
    healPlayer,
    damageCharacter,
    previewCharacterDamage,
    healCharacter,
    tapCharacter,
    untapCharacter,
    applyStatusToTarget,
    applyStatus,
    applyPlayerStatus,
    removeStatus,
    removePlayerStatus,
    hasStatus,
    hasPlayerStatus,
    canPlayerReceiveStatus,
    isPlayerImmuneToStatus,
    getCharacter,
    getCharacterOwner,
    getAllBoardCharacters,
    getAllHeroIdsInUse,
    addCardToHand,
    recordShopPurchase,
    getShopPurchasesThisTurn,
    getActionCardsPlayedThisTurn,
    getHeroCardsDeployedThisTurn,
    getPlayerBaseAttacksThisTurn,
    getTurnNumber,
    getChaosRound,
    getCardPoolProfile,
    setRolloffRoll,
    getRolloffRolls,
    setFirstPlayer,
    loadFromStorage,
  };
})();
