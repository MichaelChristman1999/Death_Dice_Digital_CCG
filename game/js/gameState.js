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
  let _actionCardsResolvedThisTurn = 0;
  let _heroCardsDeployedThisTurn = 0;
  let _playerBaseAttacksThisTurn = 0;
  let _characterActionsThisTurn = 0;
  let _drawPileDrawsThisTurn = 0;
  let _shopPurchasesThisTurn = { hero: 0, action: 0 };
  const _MANA_CAP_EXCEPTION_SOURCES = new Set(['cheatah_reroll', 'augment', 'mana_enchant']);
  const _QUEUED_STATUS_IDS = new Set();
  const _NEGATIVE_STATUS_IDS = new Set([
    'status_poisoned', 'status_anemic', 'status_crippled', 'status_impaired',
    'status_impeded', 'status_drunk', 'status_charmed', 'status_edible',
    'status_frozen', 'status_rabies', 'status_locked_out', 'status_burning',
    'status_haunted', 'status_shocked', 'status_cursed', 'status_virus',
    'status_jinxed', 'status_example_timed', 'status_example_permanent',
  ]);
  const _STATUS_CANCELS = {
    status_accelerated: ['status_impeded', 'status_frozen'],
    status_impeded: [],
    status_burning: ['status_frozen'],
    status_frozen: ['status_burning', 'status_accelerated'],
    status_blessed: ['status_cursed'],
    status_cursed: ['status_blessed'],
  };
  const _POSITIVE_SHARED_STATUS_IDS = new Set([
    'status_accelerated', 'status_augmented', 'status_blessed', 'status_sidestep',
    'status_damage_boost', 'status_vitalized',
  ]);
  const _BUFF_STATUS_IDS = new Set([
    'status_accelerated', 'status_augmented', 'status_blessed',
    'status_sidestep', 'status_stimulated', 'status_damage_boost', 'status_vitalized',
    'status_cheatah_code',
  ]);
  const _RABIES_PRECEDENCE_STATUS_IDS = new Set(['status_poisoned', 'status_crippled']);
  const _SAFEGUARD_BLOCK_STATUS_IDS = new Set([
    'status_charmed', 'status_impeded', 'status_haunted',
    'status_shocked', 'status_frozen',
  ]);
  const _CHARMED_LINK_DAMAGE_SOURCES = new Set([
    'death_die_failed_roll',
    'bombs_away',
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
    _actionCardsResolvedThisTurn = 0;
    _heroCardsDeployedThisTurn = 0;
    _playerBaseAttacksThisTurn = 0;
    _characterActionsThisTurn = 0;
    _drawPileDrawsThisTurn = 0;
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
      heroGraveyard: [],
      discardPile: [],
      drawPile: [],
      forceField: 0,
      verglas: 0,
      discardedForManaThisTurn: { hero: 0, action: 0 },
      abstainedThisTurn: false,
      enchantSucceededThisTurn: false,
      pendingBomb: null,
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
    clearForceField(endingTurn);
    if (_players[endingTurn]) _players[endingTurn].abstainedThisTurn = false;

    _currentTurn = getOpponentId(_currentTurn);
    _turnNumber++;
    _lastRoll = null;
    _actionCardsPlayedThisTurn = 0;
    _actionCardsResolvedThisTurn = 0;
    _heroCardsDeployedThisTurn = 0;
    _playerBaseAttacksThisTurn = 0;
    _characterActionsThisTurn = 0;
    _drawPileDrawsThisTurn = 0;
    _shopPurchasesThisTurn = { hero: 0, action: 0 };

    // Reset per-turn state for new active player
    const p = _players[_currentTurn];
    p.discardedForManaThisTurn = { hero: 0, action: 0 };
    p.abstainedThisTurn = false;
    p.enchantSucceededThisTurn = false;

    // Untap all characters for the new player unless a lockout status keeps them tapped.
    p.board.forEach(c => {
      const locked = (c.statuses ?? []).some(s => ['status_frozen'].includes(s.id));
      c.tapped = locked;
      c.hasAttackedThisTurn = false;
      c.hasUsedAbilityThisTurn = false;
      c.actionsTakenThisTurn = 0;
    });

    // Tick timed statuses for the new player's board.
    // Iterate over a COPY — poison deaths splice the live board array.
    applyPlayerTurnStartStatuses(_currentTurn);
    if (p.hp > 0) [...p.board].forEach(char => applyTurnStartStatuses(char));
    resolveTurnStartHeroPassives(_currentTurn);

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

  function _playerOrCaptainHasStatus(playerId, statusId) {
    const captain = getCaptain(playerId);
    return hasPlayerStatus(playerId, statusId)
      || (captain && hasStatus(captain.instanceId, statusId));
  }

  function hasPlayerOrCaptainStatus(playerId, statusId) {
    return !!_playerOrCaptainHasStatus(playerId, statusId);
  }

  function isPlayerAccelerated(playerId = _currentTurn) {
    return !_playerOrCaptainHasStatus(playerId, 'status_drunk')
      && !!_playerOrCaptainHasStatus(playerId, 'status_accelerated');
  }

  function hasAbstainedThisTurn(playerId = _currentTurn) {
    return !!_players[playerId]?.abstainedThisTurn;
  }

  function hasTakenMajorActionThisTurn(playerId = _currentTurn) {
    const p = _players[playerId];
    if (!p) return false;
    const heroActed = (p.board ?? []).some(c => c.hasAttackedThisTurn || c.hasUsedAbilityThisTurn);
    return _actionCardsResolvedThisTurn > 0
      || _heroCardsDeployedThisTurn > 0
      || _playerBaseAttacksThisTurn > 0
      || _characterActionsThisTurn > 0
      || getShopPurchasesThisTurn('hero') > 0
      || getShopPurchasesThisTurn('action') > 0
      || heroActed;
  }

  function markPlayerAbstained(playerId = _currentTurn) {
    const p = _players[playerId];
    if (!p) return false;
    p.abstainedThisTurn = true;
    _saveToStorage();
    return true;
  }

  function markEnchantSucceeded(playerId = _currentTurn, succeeded = true) {
    const p = _players[playerId];
    if (!p) return false;
    p.enchantSucceededThisTurn = !!succeeded;
    _saveToStorage();
    return true;
  }

  function hasEnchantSucceededThisTurn(playerId = _currentTurn) {
    return !!_players[playerId]?.enchantSucceededThisTurn;
  }

  function passBombToPlayer(targetPlayerId, bomb = {}) {
    const p = _players[targetPlayerId];
    if (!p) return false;
    p.pendingBomb = {
      casterId: bomb.casterId ?? getOpponentId(targetPlayerId),
      refundMana: Math.max(0, Number(bomb.refundMana ?? 0)),
      requiredRoll: Math.max(1, Number(bomb.requiredRoll ?? 5)),
      createdTurn: _turnNumber,
    };
    _saveToStorage();
    return true;
  }

  function consumePendingBomb(playerId = _currentTurn) {
    const p = _players[playerId];
    if (!p?.pendingBomb) return null;
    const bomb = p.pendingBomb;
    p.pendingBomb = null;
    _saveToStorage();
    return bomb;
  }

  function getPendingBomb(playerId = _currentTurn) {
    return _players[playerId]?.pendingBomb ?? null;
  }

  function _stripStatusIds(statuses = [], ids = new Set()) {
    const before = statuses.length;
    const kept = statuses.filter(s => !ids.has(s.id));
    return { kept, removed: before - kept.length };
  }

  function _removeStatusIdsInPlace(statuses = [], ids = new Set()) {
    const before = statuses.length;
    for (let i = statuses.length - 1; i >= 0; i--) {
      if (ids.has(statuses[i].id)) statuses.splice(i, 1);
    }
    return before - statuses.length;
  }

  function _extendStatusDuration(statuses = [], statusId, amount = 1) {
    const status = statuses.find(s => s.id === statusId);
    if (!status) return false;
    const current = status.remainingDuration ?? status.duration ?? 1;
    status.remainingDuration = Math.max(1, current + amount);
    if (typeof status.duration === 'number') status.duration = Math.max(status.duration, status.remainingDuration);
    return true;
  }

  function _hasActiveSafeguardCaptain(playerId) {
    const captain = getCaptain(playerId);
    if (!captain || !hasDurabilityCaptain(playerId)) return false;
    return !(captain.statuses ?? []).some(s => _SAFEGUARD_BLOCK_STATUS_IDS.has(s.id));
  }

  function _rollDieFallback() {
    return (typeof RollEngine !== 'undefined' && RollEngine.rollDie)
      ? RollEngine.rollDie()
      : Math.floor(Math.random() * 6) + 1;
  }

  function _ironMaidNegatesRabies(playerId) {
    const maid = (_players[playerId]?.board ?? []).find(c => /Iron Maid/i.test(c.name ?? ''));
    if (!maid) return false;
    const roll = _rollDieFallback();
    if (roll <= 2) {
      try { showToast?.(`${maid.name}'s Vacuum Cleaner negates Rabies.`, 'info'); } catch (_) {}
      return true;
    }
    return false;
  }

  function _sidestepChargesForCharacter(char) {
    const statuses = char?.statuses ?? [];
    return statuses.some(s => s.id === 'status_accelerated') && !statuses.some(s => s.id === 'status_drunk') ? 2 : 1;
  }

  function _sidestepChargesForPlayer(playerId) {
    return isPlayerAccelerated(playerId) ? 2 : 1;
  }

  function _makeStatusInstance(def, statusId, options = {}) {
    const status = { ...def, remainingDuration: def.duration, stacks: 1 };
    if (options.sourcePlayerId) status.sourcePlayerId = options.sourcePlayerId;
    if (options.sourceCharacterId) status.sourceCharacterId = options.sourceCharacterId;
    if (options.sourceCardId) status.sourceCardId = options.sourceCardId;
    if (options.sourceName) status.sourceName = options.sourceName;
    if (statusId === 'status_sidestep') {
      status.remainingCharges = options.playerId
        ? _sidestepChargesForPlayer(options.playerId)
        : _sidestepChargesForCharacter(options.char);
    }
    return status;
  }

  function _consumeStatusCharge(statuses = [], statusId) {
    const idx = statuses.findIndex(s => s.id === statusId);
    if (idx === -1) return null;
    const status = statuses[idx];
    if (status.remainingCharges != null) {
      status.remainingCharges--;
      if (status.remainingCharges <= 0) statuses.splice(idx, 1);
    } else {
      statuses.splice(idx, 1);
    }
    return status;
  }

  function _charmedStatusesOnTarget(target) {
    if (target?.type === 'player') {
      return (_players[target.id]?.statuses ?? []).filter(s => s.id === 'status_charmed');
    }
    if (target?.type === 'character') {
      return (getCharacter(target.id)?.statuses ?? []).filter(s => s.id === 'status_charmed');
    }
    return [];
  }

  function _charmedStatusProtectsTarget(status, target) {
    if (!status || !target) return false;
    if (target.type === 'player') return !!status.sourcePlayerId && status.sourcePlayerId === target.id;
    if (target.type !== 'character') return false;
    if (status.sourceCharacterId && status.sourceCharacterId === target.id) return true;
    if (!status.sourcePlayerId) return false;
    const captain = getCaptain(status.sourcePlayerId);
    return captain?.instanceId === target.id;
  }

  function isCharmedActionBlocked(actor, target) {
    if (!actor || !target) return false;
    return _charmedStatusesOnTarget(actor).some(status => _charmedStatusProtectsTarget(status, target));
  }

  function _targetsCharmedBy(protectedTarget) {
    const targets = [];
    for (const [playerId, p] of Object.entries(_players)) {
      (p.statuses ?? [])
        .filter(status => status.id === 'status_charmed' && _charmedStatusProtectsTarget(status, protectedTarget))
        .forEach(() => targets.push({ type: 'player', id: playerId }));
      (p.board ?? []).forEach(char => {
        (char.statuses ?? [])
          .filter(status => status.id === 'status_charmed' && _charmedStatusProtectsTarget(status, protectedTarget))
          .forEach(() => targets.push({ type: 'character', id: char.instanceId }));
      });
    }
    const seen = new Set();
    return targets.filter(target => {
      const key = `${target.type}:${target.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return !(target.type === protectedTarget.type && target.id === protectedTarget.id);
    });
  }

  function _mirrorLinkedCharmedDamage(protectedTarget, amount, options = {}) {
    if (options.ignoreCharmedMirror || !_CHARMED_LINK_DAMAGE_SOURCES.has(options.source)) return [];
    const linked = _targetsCharmedBy(protectedTarget);
    const hits = [];
    linked.forEach(target => {
      if (target.type === 'player') {
        const before = _players[target.id]?.hp ?? 0;
        const hp = damagePlayer(target.id, amount, {
          ...options,
          source: options.source,
          ignoreSidestep: true,
          roleEvasion: false,
          splashCaptain: true,
          ignoreCharmedMirror: true,
        });
        hits.push({ ...target, actualDamage: Math.max(0, before - Math.max(0, hp ?? before)), hp });
      } else if (target.type === 'character') {
        const char = getCharacter(target.id);
        const before = char?.currentHp ?? 0;
        const hp = damageCharacter(target.id, amount, {
          ...options,
          source: options.source,
          ignoreSidestep: true,
          roleEvasion: false,
          ignoreCharmedMirror: true,
        });
        hits.push({ ...target, actualDamage: Math.max(0, before - Math.max(0, hp ?? before)), hp });
      }
    });
    if (hits.length) {
      try { showToast?.('Charmed link shares the die damage.', 'combat'); } catch (_) {}
    }
    return hits;
  }

  function clearPlayerAndCaptainStatuses(playerId, statusIds = []) {
    const p = _players[playerId];
    if (!p) return 0;
    const ids = statusIds instanceof Set ? statusIds : new Set(statusIds);
    let removed = 0;
    const player = _stripStatusIds(p.statuses ?? [], ids);
    p.statuses = player.kept;
    removed += player.removed;

    const captain = getCaptain(playerId);
    if (captain) {
      const cap = _stripStatusIds(captain.statuses ?? [], ids);
      captain.statuses = cap.kept;
      removed += cap.removed;
    }

    if (removed > 0) _saveToStorage();
    return removed;
  }

  function clearPlayerAndCaptainBuffs(playerId) {
    return clearPlayerAndCaptainStatuses(playerId, _BUFF_STATUS_IDS);
  }

  function getPlayerVerglas(playerId) {
    return _players[playerId]?.verglas ?? 0;
  }

  function getCharacterVerglas(instanceId) {
    return getCharacter(instanceId)?.verglas ?? 0;
  }

  function addPlayerVerglas(playerId, amount, options = {}) {
    const p = _players[playerId];
    if (!p) return 0;
    p.verglas = Math.max(0, (p.verglas ?? 0) + Math.max(0, amount));
    if (options.shareCaptain !== false) {
      const captain = getCaptain(playerId);
      if (captain) addCharacterVerglas(captain.instanceId, amount);
    }
    _saveToStorage();
    return p.verglas;
  }

  function addCharacterVerglas(instanceId, amount) {
    const char = getCharacter(instanceId);
    if (!char) return 0;
    char.verglas = Math.max(0, (char.verglas ?? 0) + Math.max(0, amount));
    _saveToStorage();
    return char.verglas;
  }

  function grantCharacterOverhealth(instanceId, amount, maxBonus = amount) {
    const char = getCharacter(instanceId);
    if (!char) return { gained: 0, currentHp: 0, maxHp: 0 };
    const baseMax = char._baseMaxHp ?? char._sourceCard?.hp ?? char.hp ?? char.maxHp ?? 0;
    char._baseMaxHp = baseMax;
    const cap = baseMax + Math.max(0, Number(maxBonus) || 0);
    const beforeMax = char.maxHp ?? baseMax;
    const beforeHp = char.currentHp ?? beforeMax;
    char.maxHp = Math.min(cap, Math.max(beforeMax, baseMax) + Math.max(0, Number(amount) || 0));
    const gained = Math.max(0, char.maxHp - beforeMax);
    char.currentHp = Math.min(char.maxHp, beforeHp + gained);
    _saveToStorage();
    return { gained, currentHp: char.currentHp, maxHp: char.maxHp };
  }

  function _cleanseNegativeCharacter(instanceId) {
    const { char } = _findChar(instanceId);
    if (!char) return 0;
    const stripped = _stripStatusIds(char.statuses ?? [], _NEGATIVE_STATUS_IDS);
    char.statuses = stripped.kept;
    return stripped.removed;
  }

  function _cleanseNegativePlayer(playerId) {
    const p = _players[playerId];
    if (!p) return 0;
    const stripped = _stripStatusIds(p.statuses ?? [], _NEGATIVE_STATUS_IDS);
    p.statuses = stripped.kept;
    return stripped.removed;
  }

  function resolveAplombPassive(playerId, roll) {
    const p = _players[playerId];
    const hero = p?.board?.find(c => c.id === 'hero_bro_chill');
    if (!p || !hero) return { triggered: false };
    if (Number(roll) < 4) return { triggered: false, heroName: hero.name, roll };

    const removed = _cleanseNegativePlayer(playerId) + _cleanseNegativeCharacter(hero.instanceId);
    const beforePlayer = p.hp ?? 0;
    const beforeHero = hero.currentHp ?? 0;
    const playerHp = healPlayer(playerId, 2, { overheal: false });
    const heroHp = healCharacter(hero.instanceId, 2);
    const healedPlayer = Math.max(0, (playerHp ?? beforePlayer) - beforePlayer);
    const healedHero = Math.max(0, (heroHp ?? beforeHero) - beforeHero);
    _saveToStorage();
    return {
      triggered: true,
      heroName: hero.name,
      removed,
      healedPlayer,
      healedHero,
    };
  }

  function resolveEquinoxPassive(playerId, roll) {
    const p = _players[playerId];
    const hero = p?.board?.find(c => c.id === 'hero_equinox');
    if (!p || !hero || Number(roll) < 4) return { triggered: false };

    const beforePlayer = p.hp ?? 0;
    const playerHp = healPlayer(playerId, 4, { overheal: true, overhealCap: 4 });
    let healed = Math.max(0, (playerHp ?? beforePlayer) - beforePlayer);
    (p.board ?? []).forEach(ally => {
      const before = ally.currentHp ?? 0;
      const hp = healCharacter(ally.instanceId, 4, { overheal: true, overhealCap: 4 });
      healed += Math.max(0, (hp ?? before) - before);
    });
    _saveToStorage();
    return { triggered: true, heroName: hero.name, healed };
  }

  function resolveFailedRollHeroPassives(failedPlayerId) {
    const enemyId = getOpponentId(failedPlayerId);
    const enemyBoard = _players[enemyId]?.board ?? [];
    const messages = [];

    const cyber = enemyBoard.find(c => c.id === 'hero_trollnet');
    if (cyber && Math.random() < 0.5) {
      const result = applyStatusToTarget({ type: 'player', id: failedPlayerId }, 'status_virus', {
        splashCaptain: true,
        ignoreSidestep: true,
        allowSafeguard: false,
      });
      if (result.applied) messages.push(`${cyber.name} infects ${getPlayerLabel(failedPlayerId)} with Virus.`);
    }

    const vino = enemyBoard.find(c => c.id === 'hero_mob_barley');
    if (vino && Math.random() < 0.5) {
      const result = applyStatusToTarget({ type: 'player', id: failedPlayerId }, 'status_drunk', {
        splashCaptain: true,
        ignoreSidestep: true,
        allowSafeguard: false,
      });
      if (result.applied) messages.push(`${vino.name}'s Wasted passive inflicts Drunk.`);
    }

    return { triggered: messages.length > 0, messages };
  }

  function resolveTurnStartHeroPassives(playerId) {
    const p = _players[playerId];
    if (!p?.board?.length) return { triggered: false, messages: [] };
    const messages = [];

    for (const hero of p.board) {
      if (hero.id !== 'hero_iron_maid') continue;
      hero._vacuumCounter = (hero._vacuumCounter ?? 0) + 1;
      if (hero._vacuumCounter < 2) continue;
      hero._vacuumCounter = 0;

      const removed = _cleanseNegativePlayer(playerId)
        + p.board.reduce((sum, ally) => sum + _cleanseNegativeCharacter(ally.instanceId), 0);
      const beforePlayer = p.hp ?? 0;
      const playerHp = healPlayer(playerId, 3, { overheal: false, ignoreVitalized: true });
      let healed = Math.max(0, (playerHp ?? beforePlayer) - beforePlayer);
      for (const ally of p.board) {
        const before = ally.currentHp ?? 0;
        const hp = healCharacter(ally.instanceId, 3, { overheal: false, ignoreVitalized: true });
        healed += Math.max(0, (hp ?? before) - before);
      }
      messages.push(`Vacuum Cleaner cleansed ${removed} and healed ${healed} HP.`);
    }

    if (messages.length) {
      messages.forEach(msg => { try { showToast?.(msg, 'info'); } catch (_) {} });
      _saveToStorage();
    }
    return { triggered: messages.length > 0, messages };
  }

  function _asArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }

  function _heroPassiveRows(heroData) {
    return _asArray(heroData.heroPassive ?? heroData.passives);
  }

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
      heroAbility: heroData.heroAbility ?? heroData.docAbility ?? '',
      heroPassive: _heroPassiveRows(heroData),
      healthTypes: heroData.healthTypes ?? [],
      statusEffectsEvents: heroData.statusEffectsEvents ?? [],
      abilities: heroData.abilities ?? [],
      passives: _heroPassiveRows(heroData),
      tapped: false,
      hasAttackedThisTurn: false,
      hasUsedAbilityThisTurn: false,
      actionsTakenThisTurn: 0,
      statuses: [],
      damageTokens: 0,
      verglas: 0,
    };
    _applyInnatePassives(instance, heroData);
    return instance;
  }

  function _applyInnatePassives(instance, heroData) {
    const passiveText = [
      ..._heroPassiveRows(heroData).map(p => `${p.name ?? ''} ${p.description ?? ''}`),
      heroData.heroAbility ?? heroData.docAbility ?? '',
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

    const startingVerglas = {
      hero_geezer_freezer: 10,
      hero_iron_maid: 12,
      hero_kevlard: 20,
    }[heroData.id];
    if (startingVerglas) instance.verglas = Math.max(instance.verglas ?? 0, startingVerglas);
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
    if (hasAbstainedThisTurn(playerId)) {
      return { ok: false, error: 'Abstaining blocks hero casts this turn' };
    }
    if (_playerOrCaptainHasStatus(playerId, 'status_virus')) {
      return { ok: false, error: 'Virus blocks hero casts' };
    }
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
    if (_currentPhase === 'combat' && getChaosRound() === 1) ensureRoundOneForceFields();

    _saveToStorage();
    return { ok: true, instance };
  }

  function spawnCopyCharacter(playerId, sourceInstanceId) {
    const p = _players[playerId];
    const source = getCharacter(sourceInstanceId);
    if (!p || !source) return { ok: false, error: 'Copy-Cat not found' };
    const fieldCap = Math.max(_rules.fieldLimits?.heroes ?? 5, 6);
    if ((p.board?.length ?? 0) >= fieldCap) return { ok: false, error: 'No room for a Copy' };

    const baseCard = source._sourceCard ?? GameData.heroes.find(h => h.id === 'hero_copy_cat') ?? source;
    const copyCard = {
      ...baseCard,
      id: 'hero_copy_cat_copy',
      name: 'Copy',
      manaCost: 0,
      hp: 8,
      baseAttack: 2,
      role: baseCard.role ?? 'Trickster',
      roleType: baseCard.roleType ?? 'Agility',
      heroAbility: baseCard.heroAbility ?? baseCard.docAbility,
      docAbility: baseCard.docAbility ?? baseCard.heroAbility,
      passives: [],
      abilities: [],
    };
    const instance = _createCharacterInstance(copyCard);
    instance._sourceCard = copyCard;
    instance._spawnedBy = sourceInstanceId;
    instance._isCopySpawn = true;
    if (!instance.abilities?.length && typeof HeroAbilities !== 'undefined') {
      instance.abilities = HeroAbilities.getFor({ ...copyCard, id: 'hero_copy_cat' });
    }
    p.board.push(instance);
    _saveToStorage();
    return { ok: true, instance };
  }

  function deploySetupCaptain(playerId) {
    const p = _players[playerId];
    if (!p) return { ok: false, error: 'Player not found' };
    if (p.captainId || (p.board?.length ?? 0) > 0) return { ok: false, error: 'Captain slot already occupied' };
    if ((p.hand.heroes?.length ?? 0) <= 0) return { ok: false, error: 'No hero in hand' };
    if (p.board.length >= (_rules.fieldLimits?.heroes ?? 5)) return { ok: false, error: 'Hero field full' };

    const [card] = p.hand.heroes.splice(0, 1);
    const instance = _createCharacterInstance(card);
    instance._sourceCard = card;
    if (!instance.abilities?.length && typeof HeroAbilities !== 'undefined' && _shouldAutoAssignAbility(card)) {
      instance.abilities = HeroAbilities.getFor(card);
    }
    p.board.push(instance);
    p.captainId = instance.instanceId;
    _activateCaptainRolePassive(playerId, instance);
    _saveToStorage();
    return { ok: true, instance };
  }

  function reorderBoardCharacter(playerId, instanceId, targetIndex) {
    const p = _players[playerId];
    if (!p?.board?.length) return { ok: false, error: 'No board' };
    const visual = _boardVisualOrder(p);
    const from = visual.findIndex(c => c.instanceId === instanceId);
    if (from === -1) return { ok: false, error: 'Hero not found' };
    const moving = visual[from];
    let to = Math.max(0, Math.min(Math.round(Number(targetIndex) || 0), visual.length - 1));

    if (p.captainId && visual.length > 2) {
      const next = visual.slice();
      const captainIndex = next.findIndex(c => c.instanceId === p.captainId);
      if (to === captainIndex) to = from < captainIndex ? captainIndex - 1 : captainIndex + 1;
      to = Math.max(0, Math.min(to, next.length - 1));

      if (to !== from) {
        next[from] = null;
        const occupant = next[to];
        if (occupant) {
          const nonCaptain = visual.filter(c => c.instanceId !== p.captainId);
          const targetNonCaptainIndex = nonCaptain.findIndex(c => c.instanceId === occupant.instanceId);
          const mirrorId = nonCaptain[nonCaptain.length - 1 - targetNonCaptainIndex]?.instanceId;
          const mirrorIndex = mirrorId === moving.instanceId
            ? from
            : (mirrorId ? next.findIndex(c => c?.instanceId === mirrorId) : from);
          const displaced = mirrorIndex >= 0 ? next[mirrorIndex] : null;
          if (mirrorIndex >= 0 && mirrorIndex !== to) next[mirrorIndex] = occupant;
          if (from !== to && displaced && displaced.instanceId !== moving.instanceId) next[from] = displaced;
        }
        next[to] = moving;
        p.board = next.filter(Boolean);
      }
    } else {
      visual.splice(from, 1);
      to = Math.max(0, Math.min(to, visual.length));
      visual.splice(to, 0, moving);
      p.board = visual;
    }

    _saveToStorage();
    return { ok: true, from, to };
  }

  function _boardVisualOrder(playerState) {
    const board = [...(playerState?.board ?? [])];
    const captain = playerState?.captainId
      ? board.find(c => c.instanceId === playerState.captainId)
      : null;
    if (!captain) return board;

    const others = board.filter(c => c.instanceId !== captain.instanceId);
    const leftCount = Math.ceil(others.length / 2);
    return [
      ...others.slice(0, leftCount),
      captain,
      ...others.slice(leftCount),
    ];
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
    return new RegExp(roleName, 'i').test(captain.roleType || captain._sourceCard?.roleType || '');
  }

  function _captainHasStatus(playerId, statusId) {
    const captain = getCaptain(playerId);
    return !!captain && hasStatus(captain.instanceId, statusId);
  }

  function hasSpeedCaptain(playerId) {
    return hasCaptainClass(playerId, 'Speed') && !_captainHasStatus(playerId, 'status_impeded');
  }

  function hasManaCaptain(playerId) {
    return hasCaptainClass(playerId, 'Mana');
  }

  function hasIQCaptain(playerId) {
    return hasCaptainClass(playerId, 'IQ');
  }

  function hasDurabilityCaptain(playerId) {
    return hasCaptainClass(playerId, 'Durability') && !_captainHasStatus(playerId, 'status_impeded');
  }

  function hasAgilityCaptain(playerId) {
    return hasCaptainClass(playerId, 'Agility')
      && !_captainHasStatus(playerId, 'status_impeded')
      && !_playerOrCaptainHasStatus(playerId, 'status_charmed');
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

    const prepaid = card._shopPaid === true;
    const naturallyFree = card.manaCost === 0 || card.type === 'free';
    const isFree = card._freeCast === true || prepaid || naturallyFree;
    const freeCardsUnlimited = _rules.combat?.freeActionCardsUnlimited !== false;
    const countsAsAction = card._freeCast !== true && !(naturallyFree && freeCardsUnlimited);
    if (hasAbstainedThisTurn(playerId)) {
      return { ok: false, error: 'Abstaining blocks action cards this turn' };
    }
    if (_playerOrCaptainHasStatus(playerId, 'status_virus')) {
      return { ok: false, error: 'Virus blocks action cards' };
    }
    if (card.id === 'action_abstain' && hasTakenMajorActionThisTurn(playerId)) {
      return { ok: false, error: 'Abstain must be played before your major actions' };
    }
    const actionLimit = getActionCardLimit(playerId);
    if (countsAsAction && _actionCardsPlayedThisTurn >= actionLimit) {
      return { ok: false, error: 'Only one action card per turn' };
    }
    if (card.id === 'action_blood_mana') {
      const captain = getCaptain(playerId);
      const baseGain = card.effectValue ?? 4;
      const doubled = hasPlayerStatus(playerId, 'status_crippled')
        || hasPlayerStatus(playerId, 'status_rabies')
        || (captain && (hasStatus(captain.instanceId, 'status_crippled') || hasStatus(captain.instanceId, 'status_rabies')));
      const currentMana = getMana(playerId);
      const projectedMana = Math.max(currentMana, Math.min(getMaxMana(), currentMana + baseGain * (doubled ? 2 : 1)));
      const backlash = 4 + Math.max(0, projectedMana - 6);
      if (hasManaCaptain(playerId) && hasEnchantSucceededThisTurn(playerId)) {
        return { ok: false, error: 'Blood Mana is disabled after successful Enchant' };
      }
      if (hasPlayerStatus(playerId, 'status_augmented') || (captain && hasStatus(captain.instanceId, 'status_augmented'))) {
        return { ok: false, error: 'Blood Mana is disabled while Augmented' };
      }
      if (p.hp <= previewPlayerDamage(playerId, backlash, { ignoreModifiers: true })) {
        return { ok: false, error: 'Blood Mana would defeat you' };
      }
    }
    if (card.id === 'action_cryofreeze') {
      const failDamage = Math.max(0, previewPlayerDamage(playerId, 2, { source: 'cryofreeze_fail' }) - (p.verglas ?? 0));
      if (p.hp <= failDamage) return { ok: false, error: 'Cryofreeze fail damage would defeat you' };
    }
    if (hasPlayerStatus(playerId, 'status_frozen') && card.id !== 'action_accelerate') {
      return { ok: false, error: 'Frozen blocks cards' };
    }
    if (!isFree) {
      if (getMana(playerId) < card.manaCost) return { ok: false, error: 'Not enough mana' };
    }
    return { ok: true, card, isFree, countsAsAction };
  }

  function getActionCardLimit(playerId = _currentTurn) {
    let limit = _rules.combat?.actionCardsPerTurn ?? 1;
    if (isPlayerAccelerated(playerId)) limit++;
    if (hasSpeedCaptain(playerId)) limit++;
    return limit;
  }

  function getHeroCardLimit(playerId = _currentTurn) {
    let limit = _rules.combat?.heroCardsPerTurn ?? 1;
    if (isPlayerAccelerated(playerId)) limit++;
    return limit;
  }

  function getShopPurchaseLimit(type = 'action', playerId = _currentTurn) {
    const limits = _rules.shopLimits ?? {};
    let limit = type === 'hero'
      ? (limits.heroPerTurn ?? limits.purchasesPerTurn ?? 1)
      : (limits.actionPerTurn ?? limits.purchasesPerTurn ?? 1);
    if (isPlayerAccelerated(playerId)) limit++;
    return limit;
  }

  function getDiscardForManaLimit(cardType = 'action', playerId = _currentTurn) {
    const discardRules = _rules.mana?.discardForMana ?? {};
    let limit = cardType === 'hero'
      ? (discardRules.maxHeroPerTurn ?? 1)
      : (discardRules.maxActionPerTurn ?? 1);
    if (isPlayerAccelerated(playerId)) limit++;
    return limit;
  }

  function getPlayerHpTier(playerId = _currentTurn) {
    const p = _players[playerId];
    const maxHp = _rules.startingPlayerHP ?? 40;
    const pct = Math.max(0, Math.min(1, (p?.hp ?? maxHp) / Math.max(1, maxHp)));
    if (pct > 0.75) return { id: 'robust', label: 'Robust', pct };
    if (pct > 0.50) return { id: 'vulnerable', label: 'Vulnerable', pct };
    if (pct > 0.25) return { id: 'critical', label: 'Critical', pct };
    return { id: 'near_death', label: 'Near-Death', pct };
  }

  function getPlayerBaseAttackDamage(playerId = _currentTurn) {
    let damage = _rules.combat?.playerBaseAttack ?? 4;
    const buffsActive = !_playerOrCaptainHasStatus(playerId, 'status_drunk');
    if (buffsActive && hasPlayerStatus(playerId, 'status_augmented')) damage += 2;
    if (buffsActive && hasPlayerStatus(playerId, 'status_blessed')) damage *= 2;
    if (buffsActive && hasPlayerStatus(playerId, 'status_stimulated')) damage *= 3;
    if (buffsActive && hasPlayerStatus(playerId, 'status_damage_boost')) damage = Math.ceil(damage * 1.5);
    if (hasPlayerStatus(playerId, 'status_cursed')) damage = Math.ceil(damage / 2);
    if (hasPlayerStatus(playerId, 'status_edible')) damage = Math.ceil(damage / 2);
    if (_playerOrCaptainHasStatus(playerId, 'status_impaired')) damage = Math.floor(damage / 2);
    if (hasPlayerStatus(playerId, 'status_anemic')) damage = Math.max(0, damage - 2);
    return Math.max(1, damage);
  }

  function _rollPlayerBaseAttackDamage(playerId = _currentTurn) {
    const baseDamage = getPlayerBaseAttackDamage(playerId);
    const tier = getPlayerHpTier(playerId);
    let roll = null;
    let doubled = false;

    if (tier.id === 'near_death') {
      doubled = true;
    } else if (tier.id === 'vulnerable' || tier.id === 'critical') {
      roll = (typeof RollEngine !== 'undefined' && RollEngine.rollDie)
        ? RollEngine.rollDie()
        : Math.floor(Math.random() * 6) + 1;
      doubled = tier.id === 'vulnerable' ? roll >= 5 : roll >= 3;
    }

    return {
      damage: doubled ? baseDamage * 2 : baseDamage,
      baseDamage,
      doubled,
      hpTier: tier.id,
      hpTierLabel: tier.label,
      hpBonusRoll: roll,
    };
  }

  function getPlayerBaseAttackLimit(playerId = _currentTurn) {
    let limit = 1;
    if (isPlayerAccelerated(playerId)) limit++;
    return limit;
  }

  function canPlayerBaseAttack(playerId = _currentTurn) {
    if (playerId !== _currentTurn) return { ok: false, error: 'Not your turn' };
    if (_currentPhase !== 'combat' || _phaseStep !== 'main') return { ok: false, error: 'Combat only' };
    if (hasAbstainedThisTurn(playerId)) return { ok: false, error: 'Abstaining blocks player attack this turn' };
    if ((_players[playerId]?.board?.length ?? 0) > 0) return { ok: false, error: 'Player base attack requires an empty field' };
    if (_playerBaseAttacksThisTurn >= getPlayerBaseAttackLimit(playerId)) return { ok: false, error: 'Base attack already used' };
    const blocker = (_players[playerId]?.statuses ?? [])
      .find(s => ['status_frozen', 'status_haunted', 'status_shocked'].includes(s.id));
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
    const resolvedDamage = _rollPlayerBaseAttackDamage(playerId);
    _playerBaseAttacksThisTurn++;
    _saveToStorage();
    return { ...check, ...resolvedDamage };
  }

  function markPlayerBaseAttackSpent(playerId = _currentTurn) {
    if (playerId !== _currentTurn) return false;
    _playerBaseAttacksThisTurn = Math.min(
      getPlayerBaseAttackLimit(playerId),
      _playerBaseAttacksThisTurn + 1
    );
    _saveToStorage();
    return true;
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
    _actionCardsResolvedThisTurn++;
    p.hand.actions.splice(idx, 1);
    p.discardPile.push(card);
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
    const limit = getDiscardForManaLimit(cardType, playerId);
    const used  = p.discardedForManaThisTurn[cardType] ?? 0;
    if (used >= limit) return { ok: false, error: `Already discarded a ${cardType}` };

    const hand = cardType === 'hero' ? p.hand.heroes : p.hand.actions;
    const idx  = hand.findIndex(c => c.id === cardId);
    if (idx === -1) return { ok: false, error: 'Card not in hand' };

    const card = hand[idx];
    const refund = _getDiscardRefund(card, cardType);
    hand.splice(idx, 1);
    p.discardPile.push(card);
    p.discardedForManaThisTurn[cardType]++;
    gainMana(refund, playerId);

    _saveToStorage();
    return { ok: true, refund };
  }

  function _getDiscardRefund(card, cardType) {
    if (card?._baseId === 'action_junk' || /^action_junk/.test(card?.id ?? '')) return 0;
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
    p.discardPile.push(card);
    _saveToStorage();
    return { ok: true, card };
  }

  function getDrawPileCost(playerId = _currentTurn) {
    const cfg = _rules.drawPile ?? {};
    if (_currentPhase === 'etiquette') return cfg.orderCost ?? 0;
    return cfg.chaosCost ?? 1;
  }

  function getDrawPileDrawsThisTurn() {
    return _drawPileDrawsThisTurn;
  }

  function getDrawPileLimit(playerId = _currentTurn) {
    let limit = _rules.drawPile?.maxPerTurn ?? 1;
    if (isPlayerAccelerated(playerId)) limit++;
    return limit;
  }

  function canDrawFromPile(playerId = _currentTurn) {
    const p = _players[playerId];
    if (!p) return { ok: false, error: 'Player not found' };
    if (playerId !== _currentTurn) return { ok: false, error: 'Not your turn' };
    if (_currentPhase === 'rolloff' || _phaseStep !== 'main') return { ok: false, error: 'Draw after your turn starts' };
    if (_playerOrCaptainHasStatus(playerId, 'status_locked_out')) return { ok: false, error: 'Draw Pile is locked' };
    if (_playerOrCaptainHasStatus(playerId, 'status_virus')) return { ok: false, error: 'Virus blocks the Draw Pile' };
    if (_drawPileDrawsThisTurn >= getDrawPileLimit(playerId)) return { ok: false, error: 'Draw pile already used' };
    const heroFull = (p.hand.heroes?.length ?? 0) >= (_rules.handLimits?.hero ?? 8);
    const actionFull = (p.hand.actions?.length ?? 0) >= (_rules.handLimits?.action ?? 8);
    if (heroFull && actionFull) return { ok: false, error: 'Both hands are full' };
    const cost = getDrawPileCost(playerId);
    if (getMana(playerId) < cost) return { ok: false, error: 'Not enough mana', cost };
    return { ok: true, cost, drawsRemaining: Math.max(0, getDrawPileLimit(playerId) - _drawPileDrawsThisTurn) };
  }

  function commitDrawFromPile(playerId = _currentTurn) {
    const check = canDrawFromPile(playerId);
    if (!check.ok) return check;
    if (check.cost > 0 && !spendMana(check.cost, playerId)) {
      return { ok: false, error: 'Not enough mana', cost: check.cost };
    }
    _drawPileDrawsThisTurn++;
    _saveToStorage();
    return { ...check, ok: true };
  }

  // ── HP Manipulation ────────────────────────────────────────────────────────
  function getPlayerForceField(playerId) {
    return _players[playerId]?.forceField ?? 0;
  }

  function clearForceField(playerId) {
    const p = _players[playerId];
    if (!p) return 0;
    const before = p.forceField ?? 0;
    p.forceField = 0;
    if (before > 0) _saveToStorage();
    return before;
  }

  function consumeAugmentDeathDieShield(playerId) {
    const p = _players[playerId];
    if (!p) return false;

    const stripOne = (statuses = [], statusId) => {
      const before = statuses.length;
      const kept = statuses.filter(s => s.id !== statusId);
      return { kept, removed: before !== kept.length };
    };

    const captain = getCaptain(playerId);
    const playerCheat = stripOne(p.statuses ?? [], 'status_cheatah_code');
    const captainCheat = captain ? stripOne(captain.statuses ?? [], 'status_cheatah_code') : { kept: [], removed: false };
    if (playerCheat.removed || captainCheat.removed) {
      p.statuses = playerCheat.kept;
      if (captain) captain.statuses = captainCheat.kept;
      const gained = gainMana(4, playerId, { source: 'cheatah_reroll' });
      try { showToast?.(`Cheetah Code ignores failed Death Die damage and grants +${gained} mana.`, 'info'); } catch (_) {}
      _saveToStorage();
      return true;
    }

    let consumed = false;
    const stripAugment = (statuses = []) => {
      const before = statuses.length;
      const kept = statuses.filter(s => s.id !== 'status_augmented');
      if (kept.length !== before) consumed = true;
      return kept;
    };

    p.statuses = stripAugment(p.statuses ?? []);
    if (captain) captain.statuses = stripAugment(captain.statuses ?? []);

    if (consumed) {
      try { showToast?.('Augment absorbs the failed Death Die damage.', 'info'); } catch (_) {}
      _saveToStorage();
    }
    return consumed;
  }

  function ensureRoundOneForceField(playerId) {
    const p = _players[playerId];
    const opp = _players[getOpponentId(playerId)];
    if (!p || !opp) return 0;
    if (_currentPhase !== 'combat' || getChaosRound() !== 1) return p.forceField ?? 0;
    if ((p.board?.length ?? 0) > 0 || (opp.board?.length ?? 0) === 0) return p.forceField ?? 0;
    if ((p.forceField ?? 0) <= 0) {
      p.forceField = 10;
      try { showToast?.(`${getPlayerLabel(playerId)} gains a 10 HP force field.`, 'info'); } catch (_) {}
      _saveToStorage();
    }
    return p.forceField ?? 0;
  }

  function ensureRoundOneForceFields() {
    ensureRoundOneForceField('p1');
    ensureRoundOneForceField('p2');
  }

  function _absorbPlayerForceField(playerId, amount) {
    const p = _players[playerId];
    if (!p || amount <= 0) return { damage: amount, absorbed: 0 };
    ensureRoundOneForceField(playerId);
    const shield = p.forceField ?? 0;
    if (shield <= 0) return { damage: amount, absorbed: 0 };
    const absorbed = Math.min(shield, amount);
    p.forceField = Math.max(0, shield - absorbed);
    if (absorbed > 0) {
      try { showToast?.(`Force field absorbs ${absorbed} damage.`, 'combat'); } catch (_) {}
    }
    return { damage: amount - absorbed, absorbed };
  }

  const _VERGLAS_HALF_SOURCES = new Set([
    'base_attack', 'player_base_attack', 'death_die_failed_roll',
    'bombs_away', 'poison_dot',
  ]);

  function _adjustDamageForVerglas(amount, source = null) {
    if (amount <= 0) return 0;
    if (source === 'burning_dot' || source === 'burning') return amount * 2;
    if (_VERGLAS_HALF_SOURCES.has(source)) return Math.ceil(amount / 2);
    return amount;
  }

  function _absorbPlayerVerglas(playerId, amount, options = {}) {
    const p = _players[playerId];
    if (!p || amount <= 0 || (p.verglas ?? 0) <= 0) return { damage: amount, absorbed: 0 };
    const adjusted = _adjustDamageForVerglas(amount, options.source ?? null);
    const absorbed = Math.min(p.verglas ?? 0, adjusted);
    p.verglas = Math.max(0, (p.verglas ?? 0) - absorbed);
    if (absorbed > 0) {
      try { showToast?.(`Verglas absorbs ${absorbed} damage.`, 'combat'); } catch (_) {}
      _resolveFrozenAssets({ type: 'player', id: playerId }, options);
    }
    return { damage: Math.max(0, adjusted - absorbed), absorbed };
  }

  function _absorbCharacterVerglas(instanceId, amount, options = {}) {
    const char = getCharacter(instanceId);
    if (!char || amount <= 0 || (char.verglas ?? 0) <= 0) return { damage: amount, absorbed: 0 };
    const adjusted = _adjustDamageForVerglas(amount, options.source ?? null);
    const absorbed = Math.min(char.verglas ?? 0, adjusted);
    char.verglas = Math.max(0, (char.verglas ?? 0) - absorbed);
    if (absorbed > 0) {
      try { showToast?.(`${char.name}'s Verglas absorbs ${absorbed} damage.`, 'combat'); } catch (_) {}
      _resolveFrozenAssets({ type: 'character', id: instanceId }, options);
    }
    return { damage: Math.max(0, adjusted - absorbed), absorbed };
  }

  function _resolveFrozenAssets(protectedTarget, options = {}) {
    if (options.source === 'frozen_assets' || options.source === 'deflection') return false;
    const ownerId = protectedTarget.type === 'player'
      ? protectedTarget.id
      : getCharacterOwner(protectedTarget.id);
    if (!ownerId) return false;
    const geezer = (_players[ownerId]?.board ?? []).find(c => c.id === 'hero_geezer_freezer');
    if (!geezer) return false;
    if (protectedTarget.type === 'character' && protectedTarget.id !== geezer.instanceId) return false;

    const attacker = options.attacker ?? _inferRetaliateSource(ownerId, options.source);
    if (!attacker) return false;
    const hit = damageTarget(attacker, 2, {
      source: 'frozen_assets',
      ignoreSidestep: true,
      roleEvasion: false,
      allowSafeguard: false,
      ignoreCharmedMirror: true,
    });
    applyStatusToTarget(attacker, 'status_frozen', {
      sourcePlayerId: ownerId,
      sourceCharacterId: geezer.instanceId,
      sourceName: geezer.name,
      ignoreSidestep: true,
      allowSafeguard: false,
      deflection: true,
    });
    try { showToast?.(`${geezer.name}'s Frozen Assets hits back for ${hit?.actualDamage ?? 2} and Freezes the attacker.`, 'combat'); } catch (_) {}
    return true;
  }

  function damagePlayer(playerId, amount, options = {}) {
    const p = _players[playerId];
    if (options.source === 'death_die_failed_roll' && consumeAugmentDeathDieShield(playerId)) return p.hp;
    if (!options.ignoreSidestep && _tryPlayerSidestep(playerId, 'attack')) return p.hp;
    if (options.roleEvasion && _tryRoleEvasion(playerId, 'player', playerId)) return p.hp;
    const incoming = previewPlayerDamage(playerId, amount, options);
    const shielded = _absorbPlayerForceField(playerId, incoming);
    const verglas = _absorbPlayerVerglas(playerId, shielded.damage, options);
    const dmg = verglas.damage;
    p.hp = Math.max(0, p.hp - dmg);
    if (options.splashCaptain && dmg > 0) _splashDamageToCaptain(playerId, amount, options);
    if (incoming > 0) _mirrorLinkedCharmedDamage({ type: 'player', id: playerId }, incoming, options);
    _saveToStorage();
    return p.hp;
  }

  function _splashDamageToCaptain(playerId, amount, options = {}) {
    const captain = getCaptain(playerId);
    if (!captain) return;
    const before = captain.currentHp ?? 0;
    const hp = damageCharacter(captain.instanceId, amount, {
      source: options.source ?? null,
      ignoreSidestep: options.ignoreSidestep ?? false,
      ignoreModifiers: options.ignoreModifiers ?? false,
      roleEvasion: false,
      attacker: options.attacker ?? null,
      ignoreCharmedMirror: options.ignoreCharmedMirror ?? false,
    });
    const after = Math.max(0, hp ?? captain.currentHp ?? 0);
    const actual = Math.max(0, before - after);
    if (actual > 0) {
      try { PixiBoard?.showHitEffect?.('character', captain.instanceId, actual); } catch (_) {}
    }
  }

  function healPlayer(playerId, amount, options = {}) {
    const p = _players[playerId];
    if (hasPlayerStatus(playerId, 'status_anemic') || hasPlayerStatus(playerId, 'status_cursed')) return p.hp;
    let healAmount = Math.max(0, amount);
    if (!options.ignoreVitalized && _playerOrCaptainHasStatus(playerId, 'status_vitalized')) healAmount *= 2;
    const maxHp = _rules.startingPlayerHP ?? 40;
    const cap = options.overhealCap != null
      ? maxHp + Math.max(0, Number(options.overhealCap) || 0)
      : (options.overheal === false ? maxHp : null);
    p.hp = cap == null ? p.hp + healAmount : Math.min(cap, p.hp + healAmount);
    _saveToStorage();
    return p.hp;
  }

  function damageCharacter(instanceId, amount, options = {}) {
    const { char } = _findChar(instanceId);
    if (!char) return null;
    const ownerId = getCharacterOwner(instanceId);
    if (_tryKevLardDeflectDamage(char, ownerId, amount, options)) return char.currentHp;
    if (!options.ignoreSidestep && _tryCharacterSidestep(instanceId, 'attack')) return char.currentHp;
    const captain = getCaptain(ownerId);
    if (options.roleEvasion && captain?.instanceId === instanceId && _tryRoleEvasion(ownerId, 'character', instanceId)) {
      return char.currentHp;
    }
    const incoming = previewCharacterDamage(instanceId, amount, options);
    const verglas = _absorbCharacterVerglas(instanceId, incoming, options);
    const dmg = verglas.damage;
    char.currentHp -= dmg;
    if (incoming > 0) _mirrorLinkedCharmedDamage({ type: 'character', id: instanceId }, incoming, options);
    if (dmg > 0 && options.source !== 'retaliate' && char.id === 'hero_chicki_barstooli' && char.currentHp > 0) {
      applyStatus(instanceId, 'status_damage_boost', { ignoreSidestep: true, sharePlayer: false });
      _tryChickiRetaliate(char, options.attacker ?? _inferRetaliateSource(ownerId, options.source));
    }
    if (char.currentHp <= 0) _killCharacter(instanceId);
    _saveToStorage();
    return char.currentHp;
  }

  function _tryChickiRetaliate(chicki, attacker) {
    if (!attacker || Math.random() >= 0.5) return false;
    const attackerOwner = attacker.type === 'player'
      ? attacker.id
      : getCharacterOwner(attacker.id);
    if (!attackerOwner) return false;
    const hit = damageTarget({ type: 'player', id: attackerOwner }, 4, {
      source: 'retaliate',
      ignoreCharmedMirror: true,
      splashCaptain: true,
    });
    try {
      const label = hit?.safeguarded
        ? getCharacter(hit.id)?.name
        : getPlayerLabel(attackerOwner);
      showToast?.(`${chicki.name} retaliates against ${label ?? 'the attacker'} for ${hit?.actualDamage ?? 4}.`, 'combat');
    } catch (_) {}
    return true;
  }

  function _inferRetaliateSource(ownerId, source = null) {
    if (!_currentTurn || ownerId === _currentTurn) return null;
    const passiveSources = new Set([
      'poison_dot', 'rabies_dot', 'burning_dot', 'death_die_failed_roll',
      'bombs_away', 'retaliate', 'frozen_assets', 'deflection', 'jinxed_backlash',
    ]);
    if (passiveSources.has(source)) return null;
    return { type: 'player', id: _currentTurn };
  }

  function _tryKevLardDeflectDamage(char, ownerId, amount, options = {}) {
    if (!char || char.id !== 'hero_kevlard') return false;
    if (options.deflection || options.source === 'deflection') return false;
    const attacker = options.attacker ?? _inferRetaliateSource(ownerId, options.source);
    if (!attacker || Math.random() >= (1 / 3)) return false;
    const hit = damageTarget(attacker, Math.max(1, amount), {
      source: 'deflection',
      ignoreSidestep: true,
      roleEvasion: false,
      allowSafeguard: false,
      ignoreCharmedMirror: true,
      deflection: true,
    });
    try { showToast?.(`${char.name} deflects ${hit?.actualDamage ?? amount} damage.`, 'combat'); } catch (_) {}
    return true;
  }

  function _tryKevLardDeflectStatus(char, ownerId, statusId, options = {}) {
    if (!char || char.id !== 'hero_kevlard') return false;
    if (options.deflection || options.source === 'deflection') return false;
    if (!_NEGATIVE_STATUS_IDS.has(statusId)) return false;
    const attacker = options.attacker ?? _inferRetaliateSource(ownerId, options.source);
    if (!attacker || Math.random() >= (1 / 3)) return false;
    applyStatusToTarget(attacker, statusId, {
      ...options,
      allowSafeguard: false,
      ignoreSidestep: true,
      splashCaptain: attacker.type === 'player',
      deflection: true,
    });
    try { showToast?.(`${char.name} deflects ${_data.statusEffects.find(s => s.id === statusId)?.name ?? 'the debuff'}.`, 'combat'); } catch (_) {}
    return true;
  }

  function healCharacter(instanceId, amount, options = {}) {
    const { char } = _findChar(instanceId);
    if (!char) return null;
    if ((char.statuses ?? []).some(s => s.id === 'status_anemic' || s.id === 'status_cursed')) return char.currentHp;
    let healAmount = Math.max(0, amount);
    if (!options.ignoreVitalized && (char.statuses ?? []).some(s => s.id === 'status_vitalized')) healAmount *= 2;
    const cap = options.overhealCap != null
      ? char.maxHp + Math.max(0, Number(options.overhealCap) || 0)
      : (options.overheal ? null : char.maxHp);
    char.currentHp = cap == null ? char.currentHp + healAmount : Math.min(cap, char.currentHp + healAmount);
    _saveToStorage();
    return char.currentHp;
  }

  function targetHasStatus(target, statusId) {
    if (!target || !statusId) return false;
    if (target.type === 'player') return hasPlayerStatus(target.id, statusId);
    if (target.type === 'character') return hasStatus(target.id, statusId);
    return false;
  }

  function resolveEdibleLifesteal(attacker, actualDamage, options = {}) {
    if (!attacker || actualDamage <= 0) return 0;
    const lethal = !!options.lethal;
    let heal = Math.max(1, Math.ceil(actualDamage / 2));
    if (lethal) heal *= 2;

    if (attacker.type === 'character') {
      const before = getCharacter(attacker.id)?.currentHp ?? 0;
      const after = healCharacter(attacker.id, heal, { overheal: lethal }) ?? before;
      return Math.max(0, after - before);
    }

    if (attacker.type === 'player') {
      const p = _players[attacker.id];
      if (!p || hasPlayerStatus(attacker.id, 'status_anemic') || hasPlayerStatus(attacker.id, 'status_cursed')) return 0;
      const maxHp = _rules.startingPlayerHP ?? 40;
      const before = p.hp;
      p.hp = lethal ? p.hp + heal : Math.min(maxHp, p.hp + heal);
      _saveToStorage();
      return Math.max(0, p.hp - before);
    }

    return 0;
  }

  function previewPlayerDamage(playerId, amount, options = {}) {
    let dmg = amount;
    if (!options.ignoreModifiers) {
      if (hasPlayerStatus(playerId, 'status_crippled') || hasPlayerStatus(playerId, 'status_rabies') || hasPlayerStatus(playerId, 'status_cursed')) dmg *= 2;
      if (!_playerOrCaptainHasStatus(playerId, 'status_drunk') && hasPlayerStatus(playerId, 'status_blessed')) dmg = Math.ceil(dmg / 2);
    }
    return Math.max(0, dmg);
  }

  function previewCharacterDamage(instanceId, amount, options = {}) {
    const { char } = _findChar(instanceId);
    const statuses = char?.statuses ?? [];
    let dmg = amount;
    if (!options.ignoreModifiers) {
      if (statuses.some(s => s.id === 'status_crippled' || s.id === 'status_rabies' || s.id === 'status_frozen' || s.id === 'status_cursed')) dmg *= 2;
      if (!statuses.some(s => s.id === 'status_drunk') && statuses.some(s => s.id === 'status_blessed')) dmg = Math.ceil(dmg / 2);
    }
    return Math.max(0, dmg);
  }

  function getSafeguardCaptain(playerId, target = null) {
    const captain = getCaptain(playerId);
    if (!captain || !hasDurabilityCaptain(playerId)) return null;
    if (target?.type === 'character' && target.id === captain.instanceId) return null;
    if ((captain.statuses ?? []).some(s => _SAFEGUARD_BLOCK_STATUS_IDS.has(s.id))) return null;
    if ((captain.statuses ?? []).some(s => s.id === 'status_drunk')) {
      const roll = (typeof RollEngine !== 'undefined' && RollEngine.rollDie)
        ? RollEngine.rollDie()
        : Math.floor(Math.random() * 6) + 1;
      if (roll <= 3) {
        try { showToast?.(`${captain.name}'s Drunk Safeguard failed.`, 'warn'); } catch (_) {}
        return null;
      }
    }
    return captain;
  }

  function _captainSlotRoutesToPlayer(target) {
    if (target?.type !== 'character') return null;
    const ownerId = getCharacterOwner(target.id);
    const captain = ownerId ? getCaptain(ownerId) : null;
    if (!captain || captain.instanceId !== target.id) return null;
    return hasDurabilityCaptain(ownerId) ? null : ownerId;
  }

  function damageTarget(target, amount, options = {}) {
    if (!target) return null;
    const captainSlotOwner = options.captainSlotRoutesToPlayer !== false
      ? _captainSlotRoutesToPlayer(target)
      : null;
    if (captainSlotOwner) {
      return damageTarget(
        { type: 'player', id: captainSlotOwner },
        amount,
        { ...options, allowSafeguard: false, splashCaptain: true, captainSlotRoutesToPlayer: false }
      );
    }
    const ownerId = target.type === 'player' ? target.id : getCharacterOwner(target.id);
    const safeguard = options.allowSafeguard !== false
      ? getSafeguardCaptain(ownerId, target)
      : null;

    if (safeguard) {
      const redirected = options.safeguardDamage ?? Math.ceil(amount * 1.5);
      const before = safeguard.currentHp ?? 0;
      const hp = damageCharacter(safeguard.instanceId, redirected, {
        roleEvasion: false,
        source: options.source ?? null,
        ignoreModifiers: options.ignoreModifiers ?? false,
        attacker: options.attacker ?? null,
      });
      const after = Math.max(0, hp ?? safeguard.currentHp ?? 0);
      const actual = Math.max(0, before - after);
      _resolveJinxBacklash(options.attacker, { type: 'character', id: safeguard.instanceId }, actual, options);
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
        ignoreSidestep: options.ignoreSidestep ?? false,
        ignoreModifiers: options.ignoreModifiers ?? false,
        source: options.source ?? null,
        attacker: options.attacker ?? null,
      });
      const actual = Math.max(0, before - Math.max(0, hp ?? before));
      _resolveJinxBacklash(options.attacker, target, actual, options);
      return { type: 'player', id: target.id, ownerId, amount, actualDamage: actual, hp };
    }

    const before = getCharacter(target.id)?.currentHp ?? 0;
    const hp = damageCharacter(target.id, amount, {
      roleEvasion: options.roleEvasion ?? true,
      ignoreModifiers: options.ignoreModifiers ?? false,
      source: options.source ?? null,
      attacker: options.attacker ?? null,
    });
    const actual = Math.max(0, before - Math.max(0, hp ?? before));
    _resolveJinxBacklash(options.attacker, target, actual, options);
    return { type: 'character', id: target.id, ownerId, amount, actualDamage: actual, hp };
  }

  function _resolveJinxBacklash(attacker, damagedTarget, actualDamage, options = {}) {
    if (!attacker || actualDamage <= 0 || options.source === 'jinxed_backlash') return false;
    const statuses = attacker.type === 'player'
      ? (_players[attacker.id]?.statuses ?? [])
      : (getCharacter(attacker.id)?.statuses ?? []);
    const jinx = statuses.find(s => s.id === 'status_jinxed' && _jinxSourceMatchesTarget(s, damagedTarget));
    if (!jinx) return false;
    const hit = damageTarget(attacker, actualDamage, {
      source: 'jinxed_backlash',
      ignoreSidestep: true,
      roleEvasion: false,
      allowSafeguard: false,
      ignoreCharmedMirror: true,
      deflection: true,
    });
    try { showToast?.(`Jinxed backlash returns ${hit?.actualDamage ?? actualDamage} damage.`, 'combat'); } catch (_) {}
    return true;
  }

  function _jinxSourceMatchesTarget(jinx, target) {
    if (!jinx || !target) return false;
    if (target.type === 'character') return jinx.sourceCharacterId === target.id;
    if (target.type !== 'player') return false;
    if (jinx.sourcePlayerId === target.id) return true;
    const captain = getCaptain(target.id);
    return !!captain && jinx.sourceCharacterId === captain.instanceId;
  }

  function applyStatusToTarget(target, statusId, options = {}) {
    if (!target || !statusId) return { applied: false };
    const captainSlotOwner = options.captainSlotRoutesToPlayer !== false
      ? _captainSlotRoutesToPlayer(target)
      : null;
    if (captainSlotOwner) {
      return applyStatusToTarget(
        { type: 'player', id: captainSlotOwner },
        statusId,
        { ...options, allowSafeguard: false, splashCaptain: true, captainSlotRoutesToPlayer: false }
      );
    }
    const isNegative = _NEGATIVE_STATUS_IDS.has(statusId);
    const ownerId = target.type === 'player' ? target.id : getCharacterOwner(target.id);
    const safeguard = options.allowSafeguard !== false && isNegative
      ? getSafeguardCaptain(ownerId, target)
      : null;

    if (safeguard) {
      const applied = applyStatus(safeguard.instanceId, statusId, { ...options, sharePlayer: false });
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
        ...options,
        splashCaptain: options.splashCaptain ?? isNegative,
      });
      return { type: 'player', id: target.id, ownerId, statusId, applied };
    }

    const applied = applyStatus(target.id, statusId, options);
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
        if (dead.id === 'hero_determinator') {
          const tier = getPlayerHpTier(playerId)?.id;
          if (tier === 'critical' || tier === 'near_death') {
            const before = p.hp ?? 0;
            healPlayer(playerId, 12, { overheal: true, overhealCap: 12 });
            const gained = Math.max(0, (p.hp ?? before) - before);
            if (gained > 0) {
              try { showToast?.(`De-Termination grants ${gained} overhealth.`, 'info'); } catch (_) {}
            }
          }
        }
        if (p.captainId === dead.instanceId) _autoBackfillCaptain(p.id ?? playerId, p);
        p.heroGraveyard.push(dead._sourceCard ?? { id: dead.id, name: dead.name });
        p.graveyard = p.heroGraveyard;
        return;
      }
    }
  }

  // ── Tap State ──────────────────────────────────────────────────────────────
  function getCharacterActionLimit(charOrId) {
    const char = typeof charOrId === 'string' ? _findChar(charOrId).char : charOrId;
    if (!char) return 1;
    if ((char.statuses ?? []).some(s => s.id === 'status_drunk')) return 1;
    return (char.statuses ?? []).some(s => s.id === 'status_accelerated') ? 2 : 1;
  }

  function getCharacterActionsTaken(charOrId) {
    const char = typeof charOrId === 'string' ? _findChar(charOrId).char : charOrId;
    if (!char) return 0;
    if (char.actionsTakenThisTurn == null) {
      char.actionsTakenThisTurn = (char.tapped || char.hasAttackedThisTurn || char.hasUsedAbilityThisTurn) ? 1 : 0;
    }
    return Math.max(0, Number(char.actionsTakenThisTurn) || 0);
  }

  function getCharacterActionsRemaining(charOrId) {
    const char = typeof charOrId === 'string' ? _findChar(charOrId).char : charOrId;
    if (!char) return 0;
    return Math.max(0, getCharacterActionLimit(char) - getCharacterActionsTaken(char));
  }

  function tapCharacter(instanceId, options = {}) {
    const { char, playerId } = _findChar(instanceId);
    if (!char) return false;
    if (options.actionType === 'attack') char.hasAttackedThisTurn = true;
    if (options.actionType === 'ability') char.hasUsedAbilityThisTurn = true;
    const limit = getCharacterActionLimit(char);
    const nextTaken = options.forceTap
      ? Math.max(limit, getCharacterActionsTaken(char) + 1)
      : getCharacterActionsTaken(char) + 1;
    char.actionsTakenThisTurn = nextTaken;
    char.tapped = nextTaken >= limit;
    if (options.recordAction !== false && playerId === _currentTurn) _characterActionsThisTurn++;
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
    const ownerId = getCharacterOwner(instanceId);

    const def = _data.statusEffects.find(s => s.id === statusId);
    if (!def) return false;
    if (statusId === 'status_frozen' && (char.verglas ?? 0) > 0) return false;
    if (_NEGATIVE_STATUS_IDS.has(statusId) && !options.ignoreSidestep && _tryCharacterSidestep(instanceId, 'debuff')) return false;
    if (char._statusImmune && _NEGATIVE_STATUS_IDS.has(statusId)) return false;
    if (_tryKevLardDeflectStatus(char, ownerId, statusId, options)) return false;
    if (_playerStatusBlocksCharacterStatus(ownerId, statusId)) return false;
    if (statusId === 'status_accelerated' && char.statuses?.some(s => s.id === 'status_charmed')) return false;
    if (statusId === 'status_sidestep' && char.statuses?.some(s => s.id === 'status_edible' || s.id === 'status_charmed')) return false;
    if (statusId === 'status_sidestep' && _hasActiveSafeguardCaptain(ownerId)) return false;
    if (_RABIES_PRECEDENCE_STATUS_IDS.has(statusId) && char.statuses?.some(s => s.id === 'status_rabies')) {
      const extended = _extendStatusDuration(char.statuses, 'status_rabies', 1);
      if (extended) {
        try { showToast?.(`${char.name}'s Rabies is extended.`, 'combat'); } catch (_) {}
        _saveToStorage();
      }
      return extended;
    }
    if (statusId === 'status_rabies' && _ironMaidNegatesRabies(ownerId)) return false;
    if (statusId === 'status_rabies') _removeStatusIdsInPlace(char.statuses ?? [], _RABIES_PRECEDENCE_STATUS_IDS);

    _removeCancelingStatuses(char.statuses, statusId);
    if (statusId === 'status_edible' || statusId === 'status_charmed') _removeStatusIdsInPlace(char.statuses ?? [], new Set(['status_sidestep']));
    if (statusId === 'status_accelerated') {
      char.actionsTakenThisTurn = Math.min(getCharacterActionsTaken(char), 1);
      char.tapped = false;
      const sidestep = char.statuses?.find(s => s.id === 'status_sidestep');
      if (sidestep) sidestep.remainingCharges = Math.max(sidestep.remainingCharges ?? 1, 2);
    }

    const existing = char.statuses.findIndex(s => s.id === statusId);
    const nextStatus = () => _makeStatusInstance(def, statusId, { ...options, char });

    if (existing !== -1) {
      if (def.stackBehavior === 'stack') {
        char.statuses[existing].stacks = (char.statuses[existing].stacks ?? 1) + 1;
      } else if (_QUEUED_STATUS_IDS.has(statusId)) {
        char.statuses[existing].queued = (char.statuses[existing].queued ?? 0) + 1;
        try { showToast?.(`${def.name} queued.`, 'info'); } catch (_) {}
      } else if (def.stackBehavior === 'replace') {
        char.statuses[existing] = nextStatus();
      } else if (def.stackBehavior === 'cancel') {
        char.statuses.splice(existing, 1);
      }
    } else {
      const limit = _rules.statusLimits?.character ?? 6;
      if (char.statuses.length >= limit) {
        try { showToast?.(`${char.name} status slots full.`, 'warn'); } catch (_) {}
        return false;
      }
      char.statuses.push(nextStatus());
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
    if (statusId === 'status_accelerated' && hasPlayerStatus(playerId, 'status_charmed')) return false;
    if (statusId === 'status_sidestep' && (hasPlayerStatus(playerId, 'status_edible') || hasPlayerStatus(playerId, 'status_charmed'))) return false;
    if (statusId === 'status_sidestep' && _hasActiveSafeguardCaptain(playerId)) return false;
    if (statusId === 'status_frozen' && (_players[playerId]?.verglas ?? 0) > 0) return false;
    const def = _data.statusEffects.find(s => s.id === statusId);
    if (!def) return false;
    if (statusId === 'status_frozen' && (p.verglas ?? 0) > 0) return false;
    if (_NEGATIVE_STATUS_IDS.has(statusId) && !options.ignoreSidestep && _tryPlayerSidestep(playerId, 'debuff')) return false;
    p.statuses ??= [];
    if (_RABIES_PRECEDENCE_STATUS_IDS.has(statusId) && hasPlayerStatus(playerId, 'status_rabies')) {
      const extended = _extendStatusDuration(p.statuses, 'status_rabies', 1);
      if (extended) {
        try { showToast?.(`${getPlayerLabel(playerId)}'s Rabies is extended.`, 'combat'); } catch (_) {}
        _saveToStorage();
      }
      return extended;
    }
    if (statusId === 'status_rabies' && _ironMaidNegatesRabies(playerId)) return false;
    if (statusId === 'status_rabies') _removeStatusIdsInPlace(p.statuses, _RABIES_PRECEDENCE_STATUS_IDS);
    _removeCancelingStatuses(p.statuses, statusId);
    if (statusId === 'status_edible' || statusId === 'status_charmed') _removeStatusIdsInPlace(p.statuses ?? [], new Set(['status_sidestep']));
    if (statusId === 'status_accelerated') {
      const sidestep = p.statuses?.find(s => s.id === 'status_sidestep');
      if (sidestep) sidestep.remainingCharges = Math.max(sidestep.remainingCharges ?? 1, 2);
    }
    const existing = p.statuses.findIndex(s => s.id === statusId);
    const nextStatus = () => _makeStatusInstance(def, statusId, { ...options, playerId });
    if (existing !== -1) {
      if (def.stackBehavior === 'stack') {
        p.statuses[existing].stacks = (p.statuses[existing].stacks ?? 1) + 1;
      } else if (_QUEUED_STATUS_IDS.has(statusId)) {
        p.statuses[existing].queued = (p.statuses[existing].queued ?? 0) + 1;
        try { showToast?.(`${def.name} queued.`, 'info'); } catch (_) {}
      } else if (def.stackBehavior === 'replace') {
        p.statuses[existing] = nextStatus();
      } else if (def.stackBehavior === 'cancel') {
        p.statuses.splice(existing, 1);
      }
    } else {
      const limit = _rules.statusLimits?.player ?? 6;
      if (p.statuses.length >= limit) {
        try { showToast?.(`${getPlayerLabel(playerId)} status slots full.`, 'warn'); } catch (_) {}
        return false;
      }
      p.statuses.push(nextStatus());
    }
    if ((options.shareCaptain ?? true) && _POSITIVE_SHARED_STATUS_IDS.has(statusId)) {
      _sharePositiveStatusToCaptain(playerId, statusId);
    }
    if (options.splashCaptain && _NEGATIVE_STATUS_IDS.has(statusId)) {
      _splashStatusToCaptain(playerId, statusId, options);
    }
    _saveToStorage();
    return true;
  }

  function _splashStatusToCaptain(playerId, statusId, options = {}) {
    const captain = getCaptain(playerId);
    if (!captain) return;
    const applied = applyStatus(captain.instanceId, statusId, { ...options, sharePlayer: false });
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

  function _targetHasRabies(sourceTarget) {
    if (sourceTarget?.type === 'player') return _playerOrCaptainHasStatus(sourceTarget.id, 'status_rabies');
    if (sourceTarget?.type === 'character') return hasStatus(sourceTarget.id, 'status_rabies');
    return false;
  }

  function _targetHasVitalized(sourceTarget) {
    if (sourceTarget?.type === 'player') return _playerOrCaptainHasStatus(sourceTarget.id, 'status_vitalized');
    if (sourceTarget?.type === 'character') return hasStatus(sourceTarget.id, 'status_vitalized');
    return false;
  }

  function _targetHasPoison(sourceTarget) {
    if (sourceTarget?.type === 'player') return hasPlayerStatus(sourceTarget.id, 'status_poisoned');
    if (sourceTarget?.type === 'character') return hasStatus(sourceTarget.id, 'status_poisoned');
    return false;
  }

  function _rabiesSpreadPool(sourceTarget) {
    if (!sourceTarget) return [];
    const ownerId = sourceTarget.type === 'player'
      ? sourceTarget.id
      : getCharacterOwner(sourceTarget.id);
    if (!ownerId) return [];

    const pool = [
      ...(_players[ownerId]?.board ?? [])
        .filter(c => !(sourceTarget.type === 'character' && c.instanceId === sourceTarget.id))
        .map(c => ({ type: 'character', id: c.instanceId, name: c.name })),
      { type: 'player', id: ownerId, name: getPlayerLabel(ownerId) },
    ];
    return pool.filter(t => !(t.type === sourceTarget.type && t.id === sourceTarget.id));
  }

  function spreadRabiesFromTarget(sourceTarget, options = {}) {
    if (!_targetHasRabies(sourceTarget)) return { spread: false, reason: 'not_rabid' };
    if (options.requireVitalized && !_targetHasVitalized(sourceTarget)) return { spread: false, reason: 'not_vitalized' };
    const chance = options.chance ?? (options.requireVitalized ? 1 : 0.5);
    if (chance < 1 && Math.random() >= chance) return { spread: false, reason: 'missed' };

    const pool = _rabiesSpreadPool(sourceTarget)
      .filter(t => !targetHasStatus(t, 'status_rabies'));
    if (!pool.length) return { spread: false, reason: 'no_target' };

    const target = pool[Math.floor(Math.random() * pool.length)];
    const result = applyStatusToTarget(target, 'status_rabies', {
      allowSafeguard: false,
      splashCaptain: target.type === 'player',
      captainSlotRoutesToPlayer: true,
    });
    if (result?.applied) {
      const label = result.type === 'player'
        ? getPlayerLabel(result.id)
        : getCharacter(result.id)?.name;
      try { showToast?.(`Rabies spreads to ${label ?? target.name ?? 'a target'}.`, 'combat'); } catch (_) {}
    }
    return { ...result, spread: !!result?.applied };
  }

  function spreadPoisonFromTarget(sourceTarget, options = {}) {
    if (!_targetHasPoison(sourceTarget)) return { spread: false, reason: 'not_poisoned' };
    const chance = options.chance ?? 0.5;
    if (chance < 1 && Math.random() >= chance) return { spread: false, reason: 'missed' };

    const pool = _rabiesSpreadPool(sourceTarget)
      .filter(t => !targetHasStatus(t, 'status_poisoned'));
    if (!pool.length) return { spread: false, reason: 'no_target' };

    const target = pool[Math.floor(Math.random() * pool.length)];
    const result = applyStatusToTarget(target, 'status_poisoned', {
      allowSafeguard: false,
      splashCaptain: target.type === 'player',
      captainSlotRoutesToPlayer: true,
    });
    if (result?.applied) {
      const label = result.type === 'player'
        ? getPlayerLabel(result.id)
        : getCharacter(result.id)?.name;
      try { showToast?.(`Poison spreads to ${label ?? target.name ?? 'a target'}.`, 'combat'); } catch (_) {}
    }
    return { ...result, spread: !!result?.applied };
  }

  function canPlayerReceiveStatus(playerId, statusId) {
    if (!_players[playerId] || !statusId) return false;
    const charmBlockedByAbstain = statusId === 'status_charmed' && hasPlayerStatus(playerId, 'status_abstaining');
    if (isPlayerImmuneToStatus(playerId, statusId) && !charmBlockedByAbstain) return false;
    if (statusId === 'status_accelerated' && hasPlayerStatus(playerId, 'status_charmed')) return false;
    if (statusId === 'status_sidestep' && (hasPlayerStatus(playerId, 'status_edible') || hasPlayerStatus(playerId, 'status_charmed'))) return false;
    if (statusId === 'status_sidestep' && _hasActiveSafeguardCaptain(playerId)) return false;
    if (_RABIES_PRECEDENCE_STATUS_IDS.has(statusId) && hasPlayerStatus(playerId, 'status_rabies')) return true;
    const statuses = _players[playerId].statuses ?? [];
    const exists = statuses.some(s => s.id === statusId);
    if (exists) return true;
    if (statuses.length >= (_rules.statusLimits?.player ?? 6)) return false;
    return true;
  }

  function isPlayerImmuneToStatus(playerId, statusId) {
    if (!playerId) return false;
    if (_NEGATIVE_STATUS_IDS.has(statusId) && getCaptain(playerId)?._statusImmune) return true;
    return ['status_charmed', 'status_drunk', 'status_hypnotized'].includes(statusId)
      && hasPlayerStatus(playerId, 'status_abstaining');
  }

  function _playerStatusBlocksCharacterStatus(playerId, statusId) {
    return !!playerId
      && ['status_charmed', 'status_drunk', 'status_hypnotized'].includes(statusId)
      && hasPlayerStatus(playerId, 'status_abstaining');
  }

  function _rollSidestep(label, reason, options = {}) {
    const drunkPenaltyRoll = options.drunk ? _rollDieFallback() : null;
    const dodged = !options.drunk || drunkPenaltyRoll >= 4;
    try {
      if (options.drunk) showToast?.(`Drunk Sidestep check rolled ${drunkPenaltyRoll}.`, 'info');
      showToast?.(dodged ? `${label} Sidestepped ${reason}.` : `${label} failed Sidestep.`, dodged ? 'info' : 'warn');
    } catch (_) {}
    return dodged;
  }

  function _tryPlayerSidestep(playerId, reason) {
    const p = _players[playerId];
    if (!p?.statuses?.some(s => s.id === 'status_sidestep')) return false;
    if (hasPlayerStatus(playerId, 'status_edible')) {
      try { showToast?.('Edible blocks dodge.', 'warn'); } catch (_) {}
      return false;
    }
    if (hasPlayerStatus(playerId, 'status_charmed')) {
      try { showToast?.('Charmed blocks dodge.', 'warn'); } catch (_) {}
      return false;
    }
    if (hasPlayerStatus(playerId, 'status_impeded')) {
      try { showToast?.('Impede blocks dodge.', 'warn'); } catch (_) {}
      return false;
    }
    _consumeStatusCharge(p.statuses, 'status_sidestep');
    _saveToStorage();
    return _rollSidestep(getPlayerLabel(playerId), reason, { drunk: hasPlayerStatus(playerId, 'status_drunk') });
  }

  function _tryCharacterSidestep(instanceId, reason) {
    const { char } = _findChar(instanceId);
    if (!char?.statuses?.some(s => s.id === 'status_sidestep')) return false;
    if (char.statuses?.some(s => s.id === 'status_edible')) {
      try { showToast?.('Edible blocks dodge.', 'warn'); } catch (_) {}
      return false;
    }
    if (char.statuses?.some(s => s.id === 'status_charmed')) {
      try { showToast?.('Charmed blocks dodge.', 'warn'); } catch (_) {}
      return false;
    }
    if (char.statuses?.some(s => s.id === 'status_impeded')) {
      try { showToast?.('Impede blocks dodge.', 'warn'); } catch (_) {}
      return false;
    }
    _consumeStatusCharge(char.statuses, 'status_sidestep');
    _saveToStorage();
    return _rollSidestep(char.name, reason, { drunk: char.statuses?.some(s => s.id === 'status_drunk') });
  }

  function _tryRoleEvasion(playerId, targetType, targetId) {
    if (!hasAgilityCaptain(playerId)) return false;
    const captain = getCaptain(playerId);
    if (targetType === 'character' && targetId !== captain?.instanceId) return false;
    if (hasPlayerStatus(playerId, 'status_impeded') || captain?.statuses?.some(s => s.id === 'status_impeded')) return false;
    if (hasPlayerStatus(playerId, 'status_charmed') || captain?.statuses?.some(s => s.id === 'status_charmed')) return false;
    if (hasPlayerStatus(playerId, 'status_edible') || captain?.statuses?.some(s => s.id === 'status_edible')) return false;
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
  const _DOT_STATUSES = { status_poisoned: 3, status_rabies: 4, status_burning: 4, status_haunted: 2, status_example_timed: 1 };

  function applyTurnStartStatuses(char) {
    // Apply damage-over-time effects at the start of the affected player's turn.
    for (const s of char.statuses) {
      const dot = _DOT_STATUSES[s.id];
      if (!dot) continue;
      const before = char.currentHp ?? 0;
      const source = s.id === 'status_poisoned' ? 'poison_dot'
        : (s.id === 'status_rabies' ? 'rabies_dot' : (s.id === 'status_burning' ? 'burning_dot' : s.id));
      const hpAfter = damageCharacter(char.instanceId, dot * (s.stacks ?? 1), {
        source,
        ignoreSidestep: true,
        roleEvasion: false,
        ignoreModifiers: s.id === 'status_rabies',
      });
      const dmg = Math.max(0, before - Math.max(0, hpAfter ?? before));
      const died = !getCharacter(char.instanceId) || (hpAfter ?? before) <= 0;
      _tickEvents.push({
        instanceId: char.instanceId, charName: char.name,
        statusName: s.name, symbol: s.symbol, damage: dmg, died,
      });
      if (s.id === 'status_poisoned' && !died) spreadPoisonFromTarget({ type: 'character', id: char.instanceId }, { chance: 0.5 });
      if (s.id === 'status_rabies' && !died) spreadRabiesFromTarget({ type: 'character', id: char.instanceId }, { chance: 0.5 });
      if (died) return; // dead — stop ticking
    }
  }

  function applyPlayerTurnStartStatuses(playerId) {
    const p = _players[playerId];
    if (!p?.statuses?.length) return;
    for (const s of p.statuses) {
      const dot = _DOT_STATUSES[s.id];
      if (!dot) continue;
      const before = p.hp;
      const source = s.id === 'status_poisoned' ? 'poison_dot'
        : (s.id === 'status_rabies' ? 'rabies_dot' : (s.id === 'status_burning' ? 'burning_dot' : s.id));
      const hpAfter = damagePlayer(playerId, dot * (s.stacks ?? 1), {
        source,
        ignoreSidestep: true,
        roleEvasion: false,
        splashCaptain: false,
        ignoreModifiers: s.id === 'status_rabies',
      });
      const dmg = Math.max(0, before - Math.max(0, hpAfter ?? before));
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
      if (s.id === 'status_poisoned' && !died) spreadPoisonFromTarget({ type: 'player', id: playerId }, { chance: 0.5 });
      if (s.id === 'status_rabies' && !died) spreadRabiesFromTarget({ type: 'player', id: playerId }, { chance: 0.5 });
      if (s.id === 'status_burning' && !died) _tryBurningActionDiscard(playerId);
      if (died) return;
    }
  }

  function _tryBurningActionDiscard(playerId) {
    const p = _players[playerId];
    const actions = p?.hand?.actions ?? [];
    if (!actions.length || Math.random() >= (1 / 3)) return false;
    const idx = Math.floor(Math.random() * actions.length);
    const [card] = actions.splice(idx, 1);
    p.discardPile.push(card);
    try { showToast?.(`Burning destroys ${card.name ?? 'an action card'}.`, 'combat'); } catch (_) {}
    _saveToStorage();
    return true;
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
    const buffsActive = !(char.statuses ?? []).some(s => s.id === 'status_drunk');
    const impaired = (char.statuses ?? []).some(s => s.id === 'status_impaired');
    for (const s of char.statuses ?? []) {
      if (buffsActive && s.id === 'status_augmented') atk += 2;
      if (buffsActive && s.id === 'status_blessed') atk *= 2;
      if (buffsActive && s.id === 'status_stimulated') atk *= 3;
      if (buffsActive && s.id === 'status_damage_boost') {
        atk = Math.ceil(atk * (char.id === 'hero_chicki_barstooli' ? 2 : 1.5));
      }
      if (s.id === 'status_cursed') atk = Math.ceil(atk / 2);
      if (s.id === 'status_edible') atk = Math.ceil(atk / 2);
    }
    if (impaired) atk = Math.floor(atk / 2);
    return Math.max(1, atk);
  }

  // Statuses that prevent a character from attacking / using abilities
  const _NO_ATTACK  = ['status_frozen', 'status_haunted', 'status_shocked'];
  const _NO_ABILITY = ['status_frozen', 'status_haunted', 'status_shocked'];

  function canCharacterAttack(charOrId) {
    const char = typeof charOrId === 'string' ? _findChar(charOrId).char : charOrId;
    if (!char) return { ok: false, reason: 'Not found' };
    if (getCharacterActionsRemaining(char) <= 0) {
      return { ok: false, reason: `${char.name} has already spent their action${getCharacterActionLimit(char) > 1 ? 's' : ''}.` };
    }
    const block = char.statuses?.find(s => _NO_ATTACK.includes(s.id));
    if (block) return { ok: false, reason: `${char.name} is ${block.name} and cannot attack!` };
    return { ok: true };
  }

  function canCharacterUseAbility(charOrId) {
    const char = typeof charOrId === 'string' ? _findChar(charOrId).char : charOrId;
    if (!char) return { ok: false, reason: 'Not found' };
    if (getCharacterActionsRemaining(char) <= 0) {
      return { ok: false, reason: `${char.name} has already spent their action${getCharacterActionLimit(char) > 1 ? 's' : ''}.` };
    }
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
  function getHeroGraveyard(playerId) {
    const p = _players[playerId];
    return p?.heroGraveyard ?? (p?.graveyard ?? []).filter(c => (c?.id ?? '').startsWith('hero_'));
  }
  function getDiscardPile(playerId) {
    return _players[playerId]?.discardPile ?? [];
  }
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
        p.heroGraveyard?.forEach(c => { if ((c.id ?? '').startsWith('hero_')) ids.add(c.id); });
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
        actionCardsResolvedThisTurn: _actionCardsResolvedThisTurn,
        heroCardsDeployedThisTurn: _heroCardsDeployedThisTurn,
        playerBaseAttacksThisTurn: _playerBaseAttacksThisTurn,
        characterActionsThisTurn: _characterActionsThisTurn,
        drawPileDrawsThisTurn: _drawPileDrawsThisTurn,
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
        p.forceField ??= 0;
        p.verglas ??= 0;
        p.heroGraveyard ??= (p.graveyard ?? []).filter(c => (c?.id ?? '').startsWith('hero_'));
        p.discardPile ??= (p.graveyard ?? []).filter(c => !(c?.id ?? '').startsWith('hero_'));
        p.graveyard = p.heroGraveyard;
        p.board.forEach(c => {
          c.roleType ??= c._sourceCard?.roleType ?? '';
          c.archetype ??= c._sourceCard?.archetype ?? '';
          c.role ??= c._sourceCard?.role ?? '';
          c.manaCost ??= c._sourceCard?.manaCost ?? 0;
          c.verglas ??= 0;
          c.actionsTakenThisTurn ??= (c.tapped || c.hasAttackedThisTurn || c.hasUsedAbilityThisTurn) ? 1 : 0;
        });
        if (p.captainId && !p.board.some(c => c.instanceId === p.captainId)) p.captainId = null;
        p.graveyard ??= p.heroGraveyard;
        p.discardedForManaThisTurn ??= { hero: 0, action: 0 };
        p.abstainedThisTurn ??= false;
        p.enchantSucceededThisTurn ??= false;
        p.pendingBomb ??= null;
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
      _actionCardsResolvedThisTurn = saved.actionCardsResolvedThisTurn ?? _actionCardsPlayedThisTurn;
      _heroCardsDeployedThisTurn = saved.heroCardsDeployedThisTurn ?? 0;
      _playerBaseAttacksThisTurn = saved.playerBaseAttacksThisTurn
        ?? (saved.playerBaseAttackUsedThisTurn ? 1 : 0);
      _characterActionsThisTurn = saved.characterActionsThisTurn ?? 0;
      _drawPileDrawsThisTurn = saved.drawPileDrawsThisTurn ?? 0;
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
    spawnCopyCharacter,
    deploySetupCaptain,
    reorderBoardCharacter,
    setCaptain,
    getCaptain,
    getCaptainRoleType,
    hasCaptainClass,
    hasPlayerOrCaptainStatus,
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
    isPlayerAccelerated,
    hasAbstainedThisTurn,
    hasTakenMajorActionThisTurn,
    markPlayerAbstained,
    markEnchantSucceeded,
    hasEnchantSucceededThisTurn,
    passBombToPlayer,
    consumePendingBomb,
    getPendingBomb,
    clearPlayerAndCaptainStatuses,
    clearPlayerAndCaptainBuffs,
    getActionCardLimit,
    getHeroCardLimit,
    getShopPurchaseLimit,
    getDiscardForManaLimit,
    getPlayerHpTier,
    getPlayerBaseAttackDamage,
    getPlayerBaseAttackLimit,
    canPlayerBaseAttack,
    commitPlayerBaseAttack,
    markPlayerBaseAttackSpent,
    consumeTickEvents,
    getEffectiveAttack,
    canCharacterAttack,
    canCharacterUseAbility,
    discardForMana,
    forceDiscardFromHand,
    getDrawPileCost,
    getDrawPileDrawsThisTurn,
    getDrawPileLimit,
    canDrawFromPile,
    commitDrawFromPile,
    getPlayerForceField,
    clearForceField,
    ensureRoundOneForceField,
    ensureRoundOneForceFields,
    getPlayerVerglas,
    getCharacterVerglas,
    addPlayerVerglas,
    addCharacterVerglas,
    grantCharacterOverhealth,
    resolveAplombPassive,
    resolveEquinoxPassive,
    resolveFailedRollHeroPassives,
    damagePlayer,
    damageTarget,
    getSafeguardCaptain,
    hasActiveSafeguardCaptain: _hasActiveSafeguardCaptain,
    spreadRabiesFromTarget,
    spreadPoisonFromTarget,
    previewPlayerDamage,
    healPlayer,
    damageCharacter,
    previewCharacterDamage,
    healCharacter,
    targetHasStatus,
    resolveEdibleLifesteal,
    getCharacterActionLimit,
    getCharacterActionsTaken,
    getCharacterActionsRemaining,
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
    isCharmedActionBlocked,
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
    getHeroGraveyard,
    getDiscardPile,
    getTurnNumber,
    getChaosRound,
    getCardPoolProfile,
    setRolloffRoll,
    getRolloffRolls,
    setFirstPlayer,
    loadFromStorage,
  };
})();
