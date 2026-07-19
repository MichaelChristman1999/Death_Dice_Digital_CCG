// ─── Effect Engine — action cards + character abilities ──────────────────────
// Fully implemented: every action card and every character ability resolves
// with real game effects, click-to-target selection, and clear feedback.
//
// Targets are explicit objects: { type: 'character'|'player', id } — never
// resolved via DOM queries (the board is a PixiJS canvas).

const AbilityDispatcher = (() => {

  const _statusName = (sid) => StatusEngine.getDef(sid)?.name ?? sid;
  const _statusSym  = (sid) => StatusEngine.getDef(sid)?.symbol ?? '';
  const NEGATIVE_IDS = new Set([
    'status_poisoned', 'status_anemic', 'status_crippled', 'status_impaired',
    'status_impeded', 'status_drunk', 'status_charmed', 'status_edible',
    'status_frozen', 'status_rabies', 'status_locked_out', 'status_burning',
    'status_haunted', 'status_shocked', 'status_cursed', 'status_virus',
    'status_jinxed', 'status_example_timed', 'status_example_permanent',
  ]);

  const _hasNegative = (char) => (char?.statuses ?? []).some(s => NEGATIVE_IDS.has(s.id));
  const _hasStatus = (char, statusId) => (char?.statuses ?? []).some(s => s.id === statusId);
  const _targetHasNegative = (target) => {
    if (target?.type === 'player') return _playerHasNegative(target.id);
    if (target?.type === 'character') return _hasNegative(GameState.getCharacter(target.id));
    return false;
  };
  const _isAnemic = (char) => _hasStatus(char, 'status_anemic');
  const _isDamaged = (char) => !!char && char.currentHp < char.maxHp && !_isAnemic(char);
  const _healBlockReason = (char) => `${char?.name ?? 'That target'} is inflicted with Anemic and can't be healed.`;
  const _impairBlockReason = () => "Can't impair enemy hero as base attack is already min value.";
  const _playerIsDamaged = (pid) => {
    const p = GameState.getPlayerState(pid);
    const maxHp = GameData?.rules?.startingPlayerHP ?? 40;
    return !!p && p.hp < maxHp;
  };
  const _targetIsCriticalOrNearDeath = (target) => {
    if (target?.type === 'player') {
      const tier = GameState.getPlayerHpTier?.(target.id)?.id;
      return tier === 'critical' || tier === 'near_death';
    }
    const char = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
    if (!char) return false;
    return (char.currentHp ?? char.maxHp ?? 0) / Math.max(1, char.maxHp ?? 1) <= 0.5;
  };
  const _playerHasNegative = (pid) =>
    (GameState.getPlayerState(pid)?.statuses ?? []).some(s => NEGATIVE_IDS.has(s.id));
  const _outgoingDamage = (playerId, amount, source = null) => {
    if (amount <= 0) return 0;
    let damage = GameState.applyCaptainDamageBonus?.(playerId, amount) ?? amount;
    if (source?.type === 'character' && GameState.hasStatus?.(source.id, 'status_edible')) {
      damage = Math.ceil(damage / 2);
    } else if (source?.type === 'player' && GameState.hasPlayerStatus?.(source.id, 'status_edible')) {
      damage = Math.ceil(damage / 2);
    }
    const drunk = source?.type === 'character'
      ? GameState.hasStatus?.(source.id, 'status_drunk')
      : (source?.type === 'player' ? GameState.hasPlayerStatus?.(source.id, 'status_drunk') : false);
    const boosted = source?.type === 'character'
      ? GameState.hasStatus?.(source.id, 'status_damage_boost')
      : (source?.type === 'player' ? GameState.hasPlayerStatus?.(source.id, 'status_damage_boost') : false);
    if (!drunk && boosted) damage = Math.ceil(damage * 1.5);
    const captain = GameState.getCaptain?.(playerId);
    const impaired = source?.type === 'character'
      ? GameState.hasStatus?.(source.id, 'status_impaired')
      : (source?.type === 'player'
        ? GameState.hasPlayerStatus?.(source.id, 'status_impaired')
        : (GameState.hasPlayerStatus?.(playerId, 'status_impaired') || (captain && GameState.hasStatus?.(captain.instanceId, 'status_impaired'))));
    if (impaired) damage = Math.floor(damage / 2);
    return Math.max(1, damage);
  };

  function _cleanseCharacter(instanceId, options = {}) {
    const except = new Set(options.except ?? []);
    const limit = options.limit ?? Infinity;
    const char = GameState.getCharacter(instanceId);
    if (!char) return 0;
    let ids = [...new Set((char.statuses ?? [])
      .map(s => s.id)
      .filter(id => NEGATIVE_IDS.has(id) && !except.has(id)))];
    if (ids.includes('status_rabies') && ids.some(id => id !== 'status_rabies')) {
      const roll = (typeof RollEngine !== 'undefined' && RollEngine.rollDie)
        ? RollEngine.rollDie()
        : Math.floor(Math.random() * 6) + 1;
      if (roll <= 3) {
        ids = ids.filter(id => id !== 'status_rabies');
        showToast?.('Rabies resisted Cleanse.', 'warn');
      }
    }
    ids = ids.slice(0, limit);
    ids.forEach(id => StatusEngine.remove(instanceId, id));
    return ids.length;
  }

  function _cleansePlayer(playerId, options = {}) {
    const except = new Set(options.except ?? []);
    const limit = options.limit ?? Infinity;
    const p = GameState.getPlayerState(playerId);
    if (!p) return 0;
    let ids = [...new Set((p.statuses ?? [])
      .map(s => s.id)
      .filter(id => NEGATIVE_IDS.has(id) && !except.has(id)))];
    if (ids.includes('status_rabies') && ids.some(id => id !== 'status_rabies')) {
      const roll = (typeof RollEngine !== 'undefined' && RollEngine.rollDie)
        ? RollEngine.rollDie()
        : Math.floor(Math.random() * 6) + 1;
      if (roll <= 3) {
        ids = ids.filter(id => id !== 'status_rabies');
        showToast?.('Rabies resisted Cleanse.', 'warn');
      }
    }
    ids = ids.slice(0, limit);
    ids.forEach(id => GameState.removePlayerStatus?.(playerId, id));
    return ids.length;
  }

  function _spendSidestepOffense(target) {
    if (target?.type === 'character') {
      const char = GameState.getCharacter(target.id);
      const owner = char ? GameState.getCharacterOwner?.(target.id) : null;
      if (owner === GameState.currentTurn) GameState.tapCharacter?.(target.id, { actionType: 'ability', recordAction: false });
      return;
    }
    if (target?.type === 'player' && target.id === GameState.currentTurn) {
      GameState.markPlayerBaseAttackSpent?.(target.id);
    }
  }

  function _vitalizeCharacterOnly(instanceId, baseValue) {
    const char = GameState.getCharacter(instanceId);
    if (!char) return { target: null, healed: 0, cleansed: 0, refreshed: false };
    const already = _hasStatus(char, 'status_vitalized');
    let healed = 0;
    let cleansed = 0;
    if (!already) {
      cleansed = _cleanseCharacter(instanceId, { except: ['status_rabies'], limit: 2 });
      const healAmount = _targetIsCriticalOrNearDeath({ type: 'character', id: instanceId }) ? 12 : baseValue;
      const before = GameState.getCharacter(instanceId)?.currentHp ?? 0;
      const after = GameState.healCharacter(instanceId, healAmount, {
        overheal: true,
        overhealCap: 4,
        ignoreVitalized: true,
      }) ?? before;
      healed = Math.max(0, after - before);
    }
    GameState.applyStatus?.(instanceId, 'status_vitalized', { sharePlayer: false });
    return { target: char.name, healed, cleansed, refreshed: already };
  }

  function _vitalizePlayerOnly(playerId, baseValue) {
    const player = GameState.getPlayerState(playerId);
    if (!player) return { target: null, healed: 0, cleansed: 0, refreshed: false };
    const already = GameState.hasPlayerStatus?.(playerId, 'status_vitalized');
    let healed = 0;
    let cleansed = 0;
    if (!already) {
      cleansed = _cleansePlayer(playerId, { except: ['status_rabies'], limit: 2 });
      const healAmount = _targetIsCriticalOrNearDeath({ type: 'player', id: playerId }) ? 12 : baseValue;
      const before = player.hp ?? 0;
      const after = GameState.healPlayer(playerId, healAmount, {
        overheal: true,
        overhealCap: 4,
        ignoreVitalized: true,
      }) ?? before;
      healed = Math.max(0, after - before);
    }
    GameState.applyPlayerStatus?.(playerId, 'status_vitalized', { shareCaptain: false, splashCaptain: false });
    return { target: GameState.getPlayerLabel(playerId), healed, cleansed, refreshed: already };
  }

  function _applyVitalize(target, baseValue) {
    const results = [];
    if (target?.type === 'player') {
      results.push(_vitalizePlayerOnly(target.id, baseValue));
      const captain = GameState.getCaptain?.(target.id);
      if (captain) results.push(_vitalizeCharacterOnly(captain.instanceId, baseValue));
    } else if (target?.type === 'character') {
      const owner = GameState.getCharacterOwner?.(target.id);
      const captain = owner ? GameState.getCaptain?.(owner) : null;
      if (captain?.instanceId === target.id) {
        results.push(_vitalizePlayerOnly(owner, baseValue));
        results.push(_vitalizeCharacterOnly(target.id, baseValue));
      } else {
        results.push(_vitalizeCharacterOnly(target.id, baseValue));
      }
    }

    const healed = results.reduce((sum, row) => sum + (row.healed ?? 0), 0);
    const cleansed = results.reduce((sum, row) => sum + (row.cleansed ?? 0), 0);
    const refreshed = results.filter(row => row.refreshed).length;
    showToast(`Vitalize: healed ${healed}, cleansed ${cleansed}, refreshed ${refreshed} target${refreshed === 1 ? '' : 's'}.`, 'info');
  }

  function _canReceiveStatus(char, statusId) {
    if (!statusId) return true;
    if (!char) return false;
    if (char._statusImmune && NEGATIVE_IDS.has(statusId)) return false;
    const ownerId = GameState.getCharacterOwner?.(char.instanceId);
    if (statusId !== 'status_charmed'
      && ['status_drunk', 'status_hypnotized'].includes(statusId)
      && GameState.hasPlayerStatus?.(ownerId, 'status_abstaining')) return false;
    if (statusId === 'status_accelerated' && _hasStatus(char, 'status_charmed')) return false;
    if (statusId === 'status_sidestep' && (_hasStatus(char, 'status_edible') || _hasStatus(char, 'status_charmed'))) return false;
    if (statusId === 'status_sidestep' && GameState.hasActiveSafeguardCaptain?.(ownerId)) return false;
    if (statusId === 'status_frozen' && (char.verglas ?? 0) > 0) return false;
    if (['status_poisoned', 'status_crippled'].includes(statusId) && _hasStatus(char, 'status_rabies')) return true;
    if (_hasStatus(char, statusId)) {
      const behavior = StatusEngine.getDef(statusId)?.stackBehavior;
      return ['replace', 'stack', 'cancel'].includes(behavior);
    }
    return true;
  }

  function _alreadyHasStatus(statusId) {
    return (char) => _canReceiveStatus(char, statusId);
  }

  function _cardTargetFilter(card) {
    if (card.effect === 'remove_status') return _hasNegative;
    if (card.effect === 'heal') return card.id === 'action_vitalize' ? (() => true) : _isDamaged;
    if (card.effect === 'accelerate') return (char) => !_hasStatus(char, 'status_charmed');
    if (card.effect === 'cheese_potion') return (char) => _canReceiveStatus(char, 'status_edible');
    if (card.effect === 'apply_status') return (char) => _canReceiveStatus(char, card.statusApplied?.[0]);
    return null;
  }

  function _abilityTargetFilter(ability) {
    if (ability.effect === 'heal') return _isDamaged;
    if (ability.effect === 'apply_status') {
      return (char) => _canReceiveStatus(char, ability.statusApplied?.[0]);
    }
    return null;
  }

  function _charmSourceOptions(playerId, source = {}) {
    return {
      sourcePlayerId: playerId,
      sourceCharacterId: source.instanceId ?? null,
      sourceCardId: source.cardId ?? source.id ?? null,
      sourceName: source.name ?? null,
    };
  }

  function _targetOwnerId(target) {
    if (target?.type === 'player') return target.id;
    if (target?.type === 'character') return GameState.getCharacterOwner?.(target.id);
    return null;
  }

  function _targetIsAbstaining(target) {
    const ownerId = _targetOwnerId(target);
    return !!ownerId && GameState.hasPlayerStatus?.(ownerId, 'status_abstaining');
  }

  function _offensiveAction(card) {
    return ['apply_status', 'control_character', 'deal_damage', 'multi_damage', 'cheese_potion', 'rabies', 'pass_bomb', 'cascade_damage'].includes(card?.effect);
  }

  function _offensiveAbility(ability) {
    return ['deal_damage', 'deal_damage_apply_status', 'apply_status', 'apply_player_status', 'shop_lock', 'duel', 'copy_enemy_ability', 'zoomstick', 'bearzerk_rampage', 'stinging_barbs', 'caffeine_rush', 'lapis_lazuli', 'titaness_toss', 'avian_flu', 'say_cheese', 'breakback_breakdance'].includes(ability?.effect);
  }

  function _charmedActionBlock(actor, target, label = 'That target') {
    if (!target || !GameState.isCharmedActionBlocked?.(actor, target)) return null;
    return `${label} is protected by Charmed.`;
  }

  function _afterCharmApplied(playerId, result, sourceLabel = 'Charm') {
    if (!result?.applied) return 0;
    const before = GameState.getPlayerState?.(playerId)?.hp ?? 0;
    const hp = GameState.healPlayer?.(playerId, 1, { overheal: false }) ?? before;
    const healed = Math.max(0, hp - before);
    if (healed > 0) showToast(`${sourceLabel}: ${GameState.getPlayerLabel(playerId)} heals 1.`, 'info');
    return healed;
  }

  function _maybeCharmAbstainBacklash(playerId, target, label = 'Love Potion') {
    if (!_targetIsAbstaining(target)) return false;
    if (Math.random() >= (1 / 3)) {
      showToast(`${label}: Abstain resists the charm.`, 'warn');
      return false;
    }
    const hit = GameState.damageTarget?.(target, 2, {
      allowSafeguard: false,
      ignoreSidestep: true,
      roleEvasion: false,
      source: 'charm_abstain_backlash',
      splashCaptain: target?.type === 'player',
    }) ?? _fallbackDamageTarget(target, 2);
    _showDamageHit(hit);
    showToast(`${label}: Abstain backlash deals ${hit?.actualDamage ?? 2}.`, 'combat');
    return true;
  }

  function _abilityCanTargetPlayer(ability) {
    return ability?.targetType === 'enemy_any'
      || (ability?.targetType === 'single_enemy'
        && ['deal_damage', 'deal_damage_apply_status', 'apply_status'].includes(ability?.effect));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION CARDS — full play flow (validate → target → commit → resolve)
  // ══════════════════════════════════════════════════════════════════════════
  function playCard(card, ownerId, options = {}) {
    const isFree = card._freeCast === true || card._shopPaid === true || card.manaCost === 0 || card.type === 'free';
    const fail = (message, tone = 'warn') => {
      showToast(message, tone);
      options.onCancelled?.();
      return { ok: false, error: message };
    };
    const pickTarget = (mode, filter, banner, onConfirm) =>
      _pickTarget(ownerId, mode, filter, banner, onConfirm, options.onCancelled);

    // Phase gating
    if (isFree) {
      if (!PhaseManager.canPlayFreeActionCards()) {
        return fail('Action cards can only be played in the Chaos Phase after rolling the Death Die.');
      }
    } else {
      if (ownerId !== GameState.currentTurn) return fail('Not your turn.');
      if (!PhaseManager.canPlayPaidActionCards()) {
        return fail('Action cards can only be played in the Chaos Phase after rolling the Death Die.');
      }
    }

    // Cost / per-turn limit validation (nothing is spent yet)
    const check = GameState.canPlayAction(ownerId, card.id);
    if (!check.ok) return fail(check.error);

    const oppId = GameState.getOpponentId(ownerId);
    const enemyChars = GameState.getPlayerState(oppId).board;
    const allyChars  = GameState.getPlayerState(ownerId).board;

    // Resolve targeting requirements per card
    const commit = (target) => {
      const targetGate = _canResolveActionTarget(card, ownerId, oppId, target);
      if (!targetGate.ok) return fail(targetGate.reason);
      const r = GameState.commitPlayAction(ownerId, card.id);
      if (!r.ok) return fail(r.error);
      executeActionEffect(card, ownerId, target);
      options.onCommitted?.({ card, ownerId, target, result: r });
      renderBoard();
      PhaseManager.checkWin?.();
      return { ok: true, card };
    };

    switch (card.targetType) {
      case 'single_enemy': {
        const filter = _cardTargetFilter(card);
        const validEnemies = filter ? enemyChars.filter(filter) : enemyChars;
        if (validEnemies.length === 0) {
          // Damage cards fall through to the enemy player; status cards need a body
          if (card.effect === 'deal_damage' && !filter) {
            return pickTarget('enemy_any', null,
              `${card.name}: choose a target`, commit);
          }
          return fail(filter ? `No valid enemy characters for ${card.name}.` : 'No enemy characters to target.');
        }
        return pickTarget('enemy_chars', filter,
          `${card.name}: click an enemy character`, commit);
      }

      case 'enemy_any': {
        const filter = _cardTargetFilter(card);
        const validEnemies = filter ? enemyChars.filter(filter) : enemyChars;
        const statusId = card.statusApplied?.[0];
        const playerIsValid = (card.effect === 'apply_status' || card.effect === 'cheese_potion')
          ? (GameState.canPlayerReceiveStatus?.(oppId, statusId) ?? false)
          : true;
        if (validEnemies.length === 0 && !playerIsValid) {
          return fail(`No valid enemy targets for ${card.name}.`);
        }
        return pickTarget('enemy_any', filter,
          `${card.name}: choose an enemy hero or player`, commit);
      }

      case 'enemy_player':
        return commit({ type: 'player', id: oppId });

      case 'single_enemy_with_status': {
        const valid = enemyChars.filter(c => (c.statuses?.length ?? 0) > 0);
        if (valid.length === 0) return fail(`${card.name} needs a statused enemy.`);
        return pickTarget('enemy_chars', (c) => (c.statuses?.length ?? 0) > 0,
          `${card.name}: click an enemy with a status effect`, commit);
      }

      case 'single_ally': {
        const filter = _cardTargetFilter(card);
        const validAllies = filter ? allyChars.filter(filter) : allyChars;
        const allowSelfPlayer = card.effect === 'heal'; // e.g. Vitalize: "or yourself"
        const selfIsValid = allowSelfPlayer && _playerIsDamaged(ownerId);
        if (validAllies.length === 0 && !selfIsValid) {
          return fail(filter ? `No valid friendly targets for ${card.name}.` : 'You have no characters on the board.');
        }
        return pickTarget(allowSelfPlayer ? 'ally_or_self' : 'ally_chars', filter,
          `${card.name}: click a friendly ${allowSelfPlayer ? 'character (or your own HP icon)' : 'character'}`, commit);
      }

      case 'ally_any': {
        const filter = _cardTargetFilter(card);
        const validAllies = filter ? allyChars.filter(filter) : allyChars;
        const selfIsValid = card.effect === 'remove_status'
          ? _playerHasNegative(ownerId)
          : true;
        if (validAllies.length === 0 && !selfIsValid) {
          return fail(`No valid targets for ${card.name}.`);
        }
        return pickTarget('ally_any', filter,
          `${card.name}: choose ally or player`, commit);
      }

      // Everything else resolves immediately, no target click needed
      default: {
        const ready = _canResolveImmediateAction(card, ownerId, oppId);
        if (!ready.ok) return fail(ready.reason);
        return commit(null);
      }
    }
  }

  function _canResolveImmediateAction(card, ownerId, oppId) {
    if (card.id === 'action_blood_mana' || card.id === 'action_reveal') return { ok: true };
    if (card.targetType === 'all_enemies' && card.effect !== 'cascade_damage') {
      if (GameState.getPlayerState(oppId).board.length === 0) {
        return { ok: false, reason: `${card.name} needs at least one enemy character on the board.` };
      }
    }
    if (card.effect === 'draw_cards') {
      const p = GameState.getPlayerState(ownerId);
      const limit = GameData?.rules?.handLimits?.action ?? 8;
      if ((p?.hand?.actions?.length ?? 0) >= limit) {
        return { ok: false, reason: 'Your action hand is full.' };
      }
    }
    return { ok: true };
  }

  function _canResolveActionTarget(card, ownerId, oppId, target) {
    if (card.id === 'action_blood_mana' || card.id === 'action_reveal') return { ok: true };
    if (card.effect === 'cascade_damage') return _canResolveImmediateAction(card, ownerId, oppId);
    if (_offensiveAction(card)) {
      const charmBlock = _charmedActionBlock({ type: 'player', id: ownerId }, target, card.name);
      if (charmBlock) return { ok: false, reason: charmBlock };
    }

    if (card.effect === 'remove_status') {
      if (target?.type === 'player') {
        return _playerHasNegative(target.id)
          ? { ok: true }
          : { ok: false, reason: `${GameState.getPlayerLabel(target.id)} has no debuffs.` };
      }
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      return _hasNegative(t)
        ? { ok: true }
        : { ok: false, reason: `${card.name} needs a friendly character with a negative status.` };
    }

    if (card.effect === 'heal') {
      if (target?.type === 'player') {
        return (card.id === 'action_vitalize' || _playerIsDamaged(target.id))
          ? { ok: true }
          : { ok: false, reason: `${GameState.getPlayerLabel(target.id)} is already at full HP.` };
      }
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      if (card.id !== 'action_vitalize' && _isAnemic(t)) return { ok: false, reason: _healBlockReason(t) };
      return (card.id === 'action_vitalize' || _isDamaged(t))
        ? { ok: true }
        : { ok: false, reason: `${t?.name ?? 'That target'} is already at full HP.` };
    }

    if (card.effect === 'apply_status') {
      const statusId = card.statusApplied?.[0];
      if (target?.type === 'player') {
        return GameState.canPlayerReceiveStatus?.(target.id, statusId)
          ? { ok: true }
          : { ok: false, reason: `${card.name} needs an enemy player that does not already have that status.` };
      }
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      return t && _canReceiveStatus(t, statusId)
        ? { ok: true }
        : { ok: false, reason: `${card.name} needs an enemy that does not already have that status.` };
    }

    if (card.effect === 'cheese_potion') {
      if (target?.type === 'player') {
        return GameState.canPlayerReceiveStatus?.(target.id, 'status_edible')
          ? { ok: true }
          : { ok: false, reason: `${card.name} needs an enemy player that can become Edible.` };
      }
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      return t && _canReceiveStatus(t, 'status_edible')
        ? { ok: true }
        : { ok: false, reason: `${card.name} needs an enemy that can become Edible.` };
    }

    if (card.effect === 'augment') {
      if (target?.type === 'player') {
        return target.id === ownerId
          ? { ok: true }
          : { ok: false, reason: 'Augment must target your own player or hero.' };
      }
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      const targetOwner = t ? GameState.getCharacterOwner?.(t.instanceId) : null;
      return t && targetOwner === ownerId
        ? { ok: true }
        : { ok: false, reason: 'Augment must target your own player or hero.' };
    }

    if (['accelerate', 'sidestep', 'rabies'].includes(card.effect)) {
      const statusId = card.statusApplied?.[0];
      if (target?.type === 'player') {
        if (card.effect === 'accelerate' && GameState.hasPlayerStatus?.(target.id, 'status_charmed')) {
          return { ok: false, reason: 'Accelerate cannot target Charmed players.' };
        }
        return GameState.canPlayerReceiveStatus?.(target.id, statusId) || GameState.hasPlayerStatus?.(target.id, statusId)
          ? { ok: true }
          : { ok: false, reason: `${card.name} needs a valid player target.` };
      }
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      if (card.effect === 'accelerate' && _hasStatus(t, 'status_charmed')) {
        return { ok: false, reason: 'Accelerate cannot target Charmed heroes.' };
      }
      return t && (_canReceiveStatus(t, statusId) || _hasStatus(t, statusId))
        ? { ok: true }
        : { ok: false, reason: `${card.name} needs a valid target.` };
    }

    if (card.effect === 'control_character') {
      if (target?.type === 'player') {
        return (!GameState.isPlayerImmuneToStatus?.(target.id, 'status_charmed') || _targetIsAbstaining(target))
          ? { ok: true }
          : { ok: false, reason: `${GameState.getPlayerLabel(target.id)} is Abstaining and immune to Love Potion.` };
      }
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      const owner = t ? GameState.getCharacterOwner?.(t.instanceId) : null;
      return t && (!GameState.isPlayerImmuneToStatus?.(owner, 'status_charmed') || _targetIsAbstaining(target))
        ? { ok: true }
        : { ok: false, reason: `${owner ? GameState.getPlayerLabel(owner) : 'That player'} is Abstaining and immune to Love Potion.` };
    }

    return { ok: true };
  }

  // Enter PixiBoard target mode; onPick(null) = cancelled (no cost)
  function _pickTarget(ownerId, mode, filter, banner, onConfirm, onCancel = null) {
    ActionUI?.showTargetBanner?.(banner);
    PixiBoard.enterTargetMode({ ownerId, mode, filter }, (target) => {
      ActionUI?.hideTargetBanner?.();
      if (!target) {
        showToast('Cancelled.', 'info');
        onCancel?.();
        return;
      }
      onConfirm(target);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION CARD EFFECT RESOLUTION
  // ══════════════════════════════════════════════════════════════════════════
  function executeActionEffect(card, playerId, target) {
    const oppId = GameState.getOpponentId(playerId);
    const value = card.effectValue ?? 0;

    // ── Special cards first ──────────────────────────────────────────────────
    if (card.id === 'action_blood_mana') {
      const captain = GameState.getCaptain?.(playerId);
      const doubled = GameState.hasPlayerStatus?.(playerId, 'status_crippled')
        || GameState.hasPlayerStatus?.(playerId, 'status_rabies')
        || (captain && (GameState.hasStatus?.(captain.instanceId, 'status_crippled') || GameState.hasStatus?.(captain.instanceId, 'status_rabies')));
      const gainAmount = Math.max(1, value || 4) * (doubled ? 2 : 1);
      const beforeMana = GameState.getMana?.(playerId) ?? 0;
      const targetMana = Math.max(beforeMana, Math.min(GameState.getMaxMana?.() ?? 12, beforeMana + gainAmount));
      const afterSet = GameState.setMana?.(targetMana, playerId) ?? targetMana;
      const gained = Math.max(0, afterSet - beforeMana);
      const afterMana = GameState.getMana?.(playerId) ?? 0;
      const backlash = 4 + Math.max(0, afterMana - 6);
      const before = GameState.getPlayerState?.(playerId)?.hp ?? 0;
      const hp = GameState.damagePlayer(playerId, backlash, { ignoreSidestep: true, ignoreModifiers: true, source: 'blood_mana_backlash' });
      const actual = Math.max(0, before - Math.max(0, hp ?? before));
      PixiBoard?.showHitEffect?.('player', playerId, actual);
      showToast(`Blood Mana: +${gained} mana${doubled ? ' doubled' : ''}, then ${actual} backlash damage.`, 'combat');
      return;
    }

    if (card.id === 'action_bombs_away' || card.effect === 'pass_bomb') {
      const targetPlayer = target?.type === 'player' ? target.id : oppId;
      const passed = GameState.passBombToPlayer?.(targetPlayer, {
        casterId: playerId,
        refundMana: Math.ceil((card.manaCost ?? 0) / 2),
        requiredRoll: 5,
      });
      showToast(passed
        ? `Bombs Away: ${GameState.getPlayerLabel?.(targetPlayer) ?? 'Enemy'} must roll 5-6 to defuse next turn.`
        : 'Bombs Away fizzled.',
        passed ? 'combat' : 'warn');
      return;
    }

    if (card.id === 'action_reveal') {
      ActionUI?.showRevealModal?.(oppId);
      showToast('👁 Revealing opponent\'s hand…', 'info');
      return;
    }

    if (card.effect === 'junk_damage' || card._baseId === 'action_junk' || /^action_junk/.test(card.id ?? '')) {
      const damage = 1 + Math.floor(Math.random() * 2);
      const hit = target
        ? (GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage))
        : null;
      if (hit) {
        _showDamageHit(hit);
        showToast(`Junk hits for ${damage}.`, 'combat');
      }
      return;
    }

    if (card.id === 'action_abstain') {
      GameState.markPlayerAbstained?.(playerId);
      const cleansed = GameState.clearPlayerAndCaptainStatuses?.(playerId, [
        'status_charmed', 'status_drunk', 'status_hypnotized',
      ]) ?? 0;
      const removedBuffs = GameState.clearPlayerAndCaptainBuffs?.(playerId) ?? 0;
      GameState.applyPlayerStatus?.(playerId, 'status_abstaining', { shareCaptain: false, splashCaptain: false });
      const captain = GameState.getCaptain?.(playerId);
      if (captain) {
        captain.hasAttackedThisTurn = true;
        captain.hasUsedAbilityThisTurn = true;
        GameState.tapCharacter?.(captain.instanceId, { recordAction: false, forceTap: true });
      }
      const n = Math.max(1, value || 2);
      let drawn = 0;
      for (let i = 0; i < n; i++) if (HandManager.drawAction(playerId).ok) drawn++;
      const cleanup = cleansed + removedBuffs;
      showToast(`Abstain: drew ${drawn} action card${drawn === 1 ? '' : 's'}, removed ${cleanup} status${cleanup === 1 ? '' : 'es'}, and locks shop/casts this turn.`, 'info');
      return;
    }

    switch (card.effect) {
      case 'accelerate': {
        const sid = 'status_accelerated';
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          if (t?.statuses?.some(s => s.id === 'status_charmed')) {
            showToast('Charmed heroes cannot be Accelerated.', 'warn');
            return;
          }
          GameState.applyStatus?.(target.id, sid);
          showToast(`${t?.name ?? 'Ally'} accelerated.`, 'info');
        } else if (target?.type === 'player') {
          if (GameState.hasPlayerStatus?.(target.id, 'status_charmed')) {
            showToast('Charmed players cannot be Accelerated.', 'warn');
            return;
          }
          GameState.applyPlayerStatus?.(target.id, sid);
          showToast(`${GameState.getPlayerLabel(target.id)} accelerated.`, 'info');
        }
        break;
      }

      case 'augment': {
        const sid = card.statusApplied?.[0] ?? 'status_augmented';
        const gained = GameState.gainMana?.(value || 2, playerId, { source: 'augment' }) ?? 0;
        const results = [];
        if (target?.type === 'character') {
          results.push(_applyStatusToTarget(target, sid, { allowSafeguard: false, splashCaptain: false }));
        } else {
          results.push({
            type: 'player',
            id: playerId,
            applied: GameState.applyPlayerStatus?.(playerId, sid, { shareCaptain: true, splashCaptain: false }) ?? false,
          });
          const captain = GameState.getCaptain?.(playerId);
          if (captain && !GameState.hasStatus?.(captain.instanceId, sid)) {
            results.push(_applyStatusToTarget({ type: 'character', id: captain.instanceId }, sid, { allowSafeguard: false, splashCaptain: false }));
          }
        }
        const applied = results.filter(r => r.applied).length;
        showToast(`Augment: +${gained} mana and +2 attack on ${applied} target${applied === 1 ? '' : 's'}.`, 'info');
        break;
      }

      case 'cascade_damage': {
        const damage = _outgoingDamage(playerId, value);
        const enemies = [...GameState.getPlayerState(oppId).board];
        enemies.forEach(c => _showDamageHit(
          GameState.damageTarget?.({ type: 'character', id: c.instanceId }, damage, { allowSafeguard: false })
            ?? _fallbackDamageTarget({ type: 'character', id: c.instanceId }, damage)
        ));
        const playerHit = GameState.damageTarget?.({ type: 'player', id: oppId }, damage, { allowSafeguard: false, splashCaptain: false })
          ?? _fallbackDamageTarget({ type: 'player', id: oppId }, damage);
        _showDamageHit(playerHit);
        const captain = GameState.getCaptain?.(oppId);
        if (captain) GameState.applyStatus?.(captain.instanceId, 'status_impeded', { sharePlayer: false });
        showToast(`${card.name}: ${damage} damage to all enemies.`, 'combat');
        break;
      }

      case 'cryofreeze': {
        const event = RollEngine.rollEvent?.(playerId) ?? { roll: RollEngine.rollDie() };
        _showDieEventDamage(event, playerId);
        const roll = event.roll;
        const own = GameState.getPlayerState(playerId);
        const captain = GameState.getCaptain?.(playerId);
        if (roll >= 4) {
          GameState.addPlayerVerglas?.(playerId, value, { shareCaptain: true });
          showToast(`Cryofreeze: +${value} Verglas to ${GameState.getPlayerLabel(playerId)}${captain ? ` and ${captain.name}` : ''}.`, 'info');
        } else {
          const failDamage = Math.ceil(1 * 1.5);
          const beforePlayer = own.hp ?? 0;
          const hp = GameState.damagePlayer(playerId, failDamage, {
            ignoreSidestep: true,
            source: 'cryofreeze_fail',
            splashCaptain: false,
          });
          const actual = Math.max(0, beforePlayer - Math.max(0, hp ?? beforePlayer));
          PixiBoard?.showHitEffect?.('player', playerId, actual);
          GameState.applyPlayerStatus?.(playerId, 'status_frozen', { splashCaptain: false });
          if (captain) {
            const before = captain.currentHp ?? 0;
            const nextHp = GameState.damageCharacter?.(captain.instanceId, failDamage, {
              ignoreSidestep: true,
              roleEvasion: false,
              source: 'cryofreeze_fail',
            });
            const capActual = Math.max(0, before - Math.max(0, nextHp ?? before));
            PixiBoard?.showHitEffect?.('character', captain.instanceId, capActual);
            StatusEngine.apply(captain.instanceId, 'status_frozen');
          }
          showToast('Cryofreeze failed: player and captain take 2 and may Freeze.', 'warn');
        }
        break;
      }

      case 'cheese_potion': {
        const result = _applyStatusToTarget(target, 'status_edible', { splashCaptain: true });
        if (!result?.applied) {
          showToast('Cheese Potion missed.', 'warn');
          break;
        }
        const damage = _outgoingDamage(playerId, value);
        const hit = GameState.damageTarget?.(
          { type: result.type, id: result.id },
          damage,
          { allowSafeguard: false, roleEvasion: false }
        ) ?? _fallbackDamageTarget({ type: result.type, id: result.id }, damage);
        _showDamageHit(hit);
        showToast(`Cheese Potion hits ${_targetLabel(result)} for ${hit.actualDamage} and makes them Edible.`, 'combat');
        break;
      }

      case 'deal_damage': {
        const damage = _outgoingDamage(playerId, value);
        /*
        if (false) {
          const enemies = [...GameState.getPlayerState(oppId).board];
          enemies.forEach(enemy => {
            const dmg = GameState.previewCharacterDamage?.(enemy.instanceId, value) ?? value;
            GameState.damageCharacter(enemy.instanceId, value);
            PixiBoard?.showHitEffect?.('character', enemy.instanceId, dmg);
          });
          showToast(`⚡ ${char.name} uses ${ability.abilityName} — ${value} damage to all enemies!`, 'combat');
        } else */ if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          const hit = GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage);
          _showDamageHit(hit);
          showToast(hit.safeguarded ? `${card.name} hits Safeguard.` : `${card.name} hits ${t?.name ?? 'enemy'}.`, 'combat');
        } else if (target?.type === 'player') {
          const hit = GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage);
          _showDamageHit(hit);
          showToast(hit.safeguarded ? `${card.name} hits Safeguard.` : `${card.name} hits player.`, 'combat');
        }
        break;
      }

      case 'multi_damage': {
        const damage = _outgoingDamage(playerId, value);
        const procRoll = (typeof RollEngine !== 'undefined' && RollEngine.rollDie)
          ? RollEngine.rollDie()
          : Math.floor(Math.random() * 6) + 1;
        const proc = procRoll >= 6;
        const applyDamagePotionProc = (hitTarget) => {
          if (!proc || !hitTarget) return;
          const burn = _applyStatusToTarget(hitTarget, 'status_burning', { splashCaptain: true });
          if (burn.applied) showToast(`Damage Potion ignites ${_targetLabel(burn)}.`, 'combat');
        };
        const boostCaster = () => {
          if (!proc) return;
          GameState.applyPlayerStatus?.(playerId, 'status_damage_boost', { shareCaptain: true, splashCaptain: false });
          showToast('Damage Potion rolled 6: your player/captain gain Damage Boost.', 'info');
        };
        const pool = [
          ...GameState.getPlayerState(oppId).board.map(c => ({ type: 'character', id: c.instanceId, name: c.name })),
          { type: 'player', id: oppId, name: GameState.getPlayerLabel(oppId) },
        ];
        const hits = [];
        if (target) hits.push(target);
        const remaining = pool.filter(t => !(t.type === target?.type && t.id === target?.id));
        if (remaining.length) hits.push(remaining[Math.floor(Math.random() * remaining.length)]);

        const safeguard = GameState.getSafeguardCaptain?.(oppId, hits[0]);
        if (safeguard) {
          const hit = GameState.damageTarget?.(hits[0], damage, { safeguardDamage: 5, multiTarget: true, source: 'damage_potion' })
            ?? _fallbackDamageTarget({ type: 'character', id: safeguard.instanceId }, 5);
          _showDamageHit(hit);
          applyDamagePotionProc({ type: hit.type, id: hit.id });
          boostCaster();
          showToast(`Damage Potion d6 rolled ${procRoll}. Safeguard stops second hit.`, 'combat');
          break;
        }

        hits.slice(0, 2).forEach(hitTarget => {
          const hit = GameState.damageTarget?.(hitTarget, damage, { source: 'damage_potion' }) ?? _fallbackDamageTarget(hitTarget, damage);
          _showDamageHit(hit);
          applyDamagePotionProc({ type: hit.type, id: hit.id });
        });
        boostCaster();
        showToast(`Damage Potion hits ${hits.length}; d6 rolled ${procRoll}.`, 'combat');
        break;
      }

      /*
      case '__unused_action_damage_status': {
        const sid = ability.statusApplied?.[0];
        if (ability.targetType === 'all_enemies') {
          const enemies = [...GameState.getPlayerState(oppId).board];
          enemies.forEach(enemy => {
            const dmg = GameState.previewCharacterDamage?.(enemy.instanceId, value) ?? value;
            GameState.damageCharacter(enemy.instanceId, value);
            if (sid) StatusEngine.apply(enemy.instanceId, sid);
            PixiBoard?.showHitEffect?.('character', enemy.instanceId, dmg);
          });
          showToast(`⚡ ${char.name} uses ${ability.abilityName} — ${value} damage${sid ? ` and ${_statusName(sid)}` : ''} to all enemies!`, 'combat');
        } else if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          const dmg = GameState.previewCharacterDamage?.(target.id, value) ?? value;
          GameState.damageCharacter(target.id, value);
          if (sid) StatusEngine.apply(target.id, sid);
          PixiBoard?.showHitEffect?.('character', target.id, dmg);
          showToast(`⚡ ${char.name} uses ${ability.abilityName} — ${value} damage${sid ? ` and ${_statusName(sid)}` : ''} to ${t?.name}!`, 'combat');
        }
        break;
      }

      */
      case 'heal': {
        if (card.id === 'action_vitalize') {
          _applyVitalize(target, value || 8);
          break;
        }
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          GameState.healCharacter(target.id, value, { overheal: card.id === 'action_vitalize' });
          showToast(`${card.name} heals ${t?.name ?? 'ally'} ${value}.`, 'info');
        } else if (target?.type === 'player') {
          GameState.healPlayer(target.id, value);
          showToast(`${card.name} heals ${GameState.getPlayerLabel(target.id)} ${value}.`, 'info');
        }
        break;
      }

      case 'apply_status': {
        const sid = card.statusApplied?.[0];
        let result = null;
        const gasWasPoisoned = card.id === 'action_gas_potion'
          && GameState.targetHasStatus?.(target, 'status_poisoned');
        if (sid && target?.type === 'character') {
          result = _applyStatusToTarget(target, sid);
          const t = GameState.getCharacter(result.id ?? target.id);
          if (result.applied) {
            showToast(`${_statusSym(sid)} ${t?.name ?? 'Target'} is now ${_statusName(sid)}!`, 'combat');
          }
        } else if (sid && target?.type === 'player') {
          result = _applyStatusToTarget(target, sid, { splashCaptain: true });
          if (result.applied) {
            const label = result.type === 'player'
              ? GameState.getPlayerLabel(result.id)
              : GameState.getCharacter(result.id)?.name;
            showToast(`${_statusSym(sid)} ${label ?? 'Target'} is now ${_statusName(sid)}!`, 'combat');
          }
        }
        if (result?.applied && card.id === 'action_anemic_potion' && value > 0) {
          const damage = _outgoingDamage(playerId, value);
          _showDamageHit(GameState.damageTarget?.({ type: result.type, id: result.id }, damage)
            ?? _fallbackDamageTarget({ type: result.type, id: result.id }, damage));
        }
        if (result?.applied && card.id === 'action_cripple' && value > 0) {
          const damage = _outgoingDamage(playerId, value);
          const hit = GameState.damageTarget?.(
            { type: result.type, id: result.id },
            damage,
            { allowSafeguard: false, roleEvasion: false, ignoreModifiers: true }
          ) ?? _fallbackDamageTarget({ type: result.type, id: result.id }, damage);
          _showDamageHit(hit);
          showToast(`Cripple deals ${hit.actualDamage} initial damage.`, 'combat');
        }
        if (result?.applied && card.id === 'action_drunk_potion' && value > 0) {
          const damage = _outgoingDamage(playerId, value);
          const hit = GameState.damageTarget?.(
            { type: result.type, id: result.id },
            damage,
            {
              allowSafeguard: false,
              roleEvasion: false,
              source: 'drunk_potion',
              splashCaptain: result.type === 'player',
            }
          ) ?? _fallbackDamageTarget({ type: result.type, id: result.id }, damage);
          _showDamageHit(hit);
          showToast(`Drunk Potion deals ${hit.actualDamage} initial damage.`, 'combat');
        }
        if (result?.applied && ['action_gas_potion', 'action_impede', 'action_imp_aired'].includes(card.id) && value > 0) {
          const damage = _outgoingDamage(playerId, value);
          const hit = GameState.damageTarget?.(
            { type: result.type, id: result.id },
            damage,
            {
              allowSafeguard: false,
              roleEvasion: false,
              source: card.id,
              splashCaptain: result.type === 'player',
            }
          ) ?? _fallbackDamageTarget({ type: result.type, id: result.id }, damage);
          _showDamageHit(hit);
          showToast(`${card.name} deals ${hit.actualDamage} initial damage.`, 'combat');
        }
        if (result?.applied && card.id === 'action_gas_potion') {
          const landed = { type: result.type, id: result.id };
          const detonated = gasWasPoisoned && Math.random() < 0.5
            ? _detonateGasTarget(landed)
            : false;
          if (!detonated && Math.random() < 0.5) {
            GameState.spreadPoisonFromTarget?.(landed, { chance: 1 });
          }
        }
        if (result?.applied && card.id === 'action_impede') {
          _resolveImpedeShockCombo({ type: result.type, id: result.id });
        }
        break;
      }

      case 'remove_status': {
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          const healUnit = _targetIsCriticalOrNearDeath(target) ? 2 : 1;
          const removed = _cleanseCharacter(target.id);
          const healed = removed * healUnit;
          if (healed > 0) GameState.healCharacter(target.id, healed);
          showToast(removed > 0 ? `Cleansed ${t?.name} and healed ${healed}.` : 'No debuffs found.', 'info');
        } else if (target?.type === 'player') {
          const healUnit = _targetIsCriticalOrNearDeath(target) ? 2 : 1;
          const removedPlayer = _cleansePlayer(target.id);
          const captain = GameState.getCaptain?.(target.id);
          const removedCaptain = captain ? _cleanseCharacter(captain.instanceId) : 0;
          const playerHealed = removedPlayer * healUnit;
          const captainHealUnit = captain && _targetIsCriticalOrNearDeath({ type: 'character', id: captain.instanceId }) ? 2 : 1;
          const captainHealed = removedCaptain * captainHealUnit;
          if (playerHealed > 0) GameState.healPlayer(target.id, playerHealed, { overheal: false });
          if (captain && captainHealed > 0) GameState.healCharacter(captain.instanceId, captainHealed);
          const healed = playerHealed + captainHealed;
          showToast(removedPlayer + removedCaptain > 0
            ? `Cleansed ${GameState.getPlayerLabel(target.id)}${captain ? ` and ${captain.name}` : ''}, then healed ${healed}.`
            : 'No debuffs found.',
            'info');
        }
        break;
      }

      case 'draw_cards': {
        const n = Math.max(1, value);
        let drawn = 0;
        for (let i = 0; i < n; i++) if (HandManager.drawAction(playerId).ok) drawn++;
        showToast(drawn > 0 ? `🃏 Drew ${drawn} action card${drawn > 1 ? 's' : ''}!` : 'Hand is full — no card drawn.', 'info');
        break;
      }

      case 'random_effect': { // Cheese Potion — d6 chaos table
        _cheesePotion(playerId, oppId);
        break;
      }

      case 'rabies': {
        _applyRabies(target, oppId);
        break;
      }

      case 'sidestep': {
        const sid = 'status_sidestep';
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          const applied = StatusEngine.apply(target.id, sid);
          if (applied) _spendSidestepOffense(target);
          showToast(applied ? `${t?.name ?? 'Ally'} readies Sidestep.` : 'Sidestep is disabled.', applied ? 'info' : 'warn');
        } else if (target?.type === 'player') {
          const applied = GameState.applyPlayerStatus?.(target.id, sid);
          if (applied) _spendSidestepOffense(target);
          showToast(applied ? `${GameState.getPlayerLabel(target.id)} readies Sidestep.` : 'Sidestep is disabled.', applied ? 'info' : 'warn');
        }
        break;
      }

      case 'control_character': {
        const sourceOptions = _charmSourceOptions(playerId, { id: card.id, name: card.name });
        if (target?.type === 'player') {
          const result = _applyStatusToTarget(target, 'status_charmed', { ...sourceOptions, splashCaptain: true });
          if (result.applied) {
            showToast(`Love Potion: ${_targetLabel(result)} is Charmed and cannot target the charmer.`, 'combat');
            _afterCharmApplied(playerId, result, 'Love Potion');
          } else {
            _maybeCharmAbstainBacklash(playerId, target, 'Love Potion');
          }
        } else if (target?.type === 'character') {
          const result = _applyStatusToTarget(target, 'status_charmed', sourceOptions);
          const charmed = result.type === 'character' ? GameState.getCharacter(result.id) : null;
          if (result.applied && charmed) {
            showToast(`Love Potion: ${charmed.name} is Charmed and cannot target the charmer.`, 'combat');
            _afterCharmApplied(playerId, result, 'Love Potion');
          } else if (!result.applied) {
            _maybeCharmAbstainBacklash(playerId, target, 'Love Potion');
          }
        }
        break;
      }
      default:
        console.warn(`[AbilityDispatcher] Unknown card effect: ${card.effect}`);
        showToast(`${card.name} fizzles… (unknown effect)`, 'warn');
    }
  }

  function _applyStatusToTarget(target, statusId, options = {}) {
    if (GameState.applyStatusToTarget) return GameState.applyStatusToTarget(target, statusId, options);
    if (target?.type === 'character') {
      const applied = StatusEngine.apply(target.id, statusId);
      return { type: 'character', id: target.id, statusId, applied };
    }
    if (target?.type === 'player') {
      const applied = GameState.applyPlayerStatus?.(target.id, statusId, { splashCaptain: options.splashCaptain ?? true });
      return { type: 'player', id: target.id, statusId, applied };
    }
    return { applied: false };
  }

  function _applyStatusesToTarget(target, statusIds = [], options = {}) {
    let last = { applied: false };
    (statusIds ?? []).forEach(statusId => {
      if (!statusId) return;
      last = _applyStatusToTarget(target, statusId, options);
      if (last?.type && last?.id) target = { type: last.type, id: last.id };
    });
    return last;
  }

  function _abilityHitsEnemyPlayer(ability) {
    return /player|heroes\/player|player\/heroes/i.test(ability?.description ?? '');
  }

  function _applyRabies(target, oppId) {
    if (!target) return;
    const result = _applyStatusToTarget(target, 'status_rabies');
    showToast(result?.applied ? 'Rabies applied.' : 'Rabies failed to take hold.', result?.applied ? 'combat' : 'warn');
  }

  function _detonateGasTarget(target) {
    if (!target) return false;
    if (target.type === 'character') {
      const char = GameState.getCharacter(target.id);
      const ownerId = GameState.getCharacterOwner?.(target.id);
      if (!char || !ownerId) return false;
      const before = char.currentHp ?? 0;
      const lethal = before + (char.verglas ?? 0);
      const hp = GameState.damageCharacter?.(target.id, lethal, {
        ignoreSidestep: true,
        roleEvasion: false,
        ignoreModifiers: true,
        source: 'gas_detonation',
      });
      const actual = Math.max(0, before - Math.max(0, hp ?? before));
      PixiBoard?.showHitEffect?.('character', target.id, actual);
      const playerBefore = GameState.getPlayerState?.(ownerId)?.hp ?? 0;
      const playerHp = GameState.damagePlayer?.(ownerId, 5, {
        ignoreSidestep: true,
        roleEvasion: false,
        splashCaptain: false,
        ignoreModifiers: true,
        source: 'gas_detonation',
      });
      const playerActual = Math.max(0, playerBefore - Math.max(0, playerHp ?? playerBefore));
      PixiBoard?.showHitEffect?.('player', ownerId, playerActual);
      showToast(`Gas detonates: ${char.name} is eliminated and ${GameState.getPlayerLabel(ownerId)} takes ${playerActual}.`, 'combat');
      return true;
    }

    if (target.type === 'player') {
      const before = GameState.getPlayerState?.(target.id)?.hp ?? 0;
      const hp = GameState.damagePlayer?.(target.id, 5, {
        ignoreSidestep: true,
        roleEvasion: false,
        splashCaptain: false,
        ignoreModifiers: true,
        source: 'gas_detonation',
      });
      const actual = Math.max(0, before - Math.max(0, hp ?? before));
      PixiBoard?.showHitEffect?.('player', target.id, actual);
      showToast(`Gas detonates on ${GameState.getPlayerLabel(target.id)} for ${actual}.`, 'combat');
      return true;
    }

    return false;
  }

  function _resolveImpedeShockCombo(target) {
    if (target?.type !== 'character') return false;
    const char = GameState.getCharacter(target.id);
    const ownerId = GameState.getCharacterOwner?.(target.id);
    if (!char || !ownerId) return false;
    if (!GameState.hasStatus?.(target.id, 'status_impeded') || !GameState.hasStatus?.(target.id, 'status_shocked')) return false;
    if (Math.random() >= (2 / 3)) {
      showToast(`${char.name} resists the Impede/Shock overload.`, 'warn');
      return false;
    }

    const before = char.currentHp ?? 0;
    const lethal = before + (char.verglas ?? 0);
    const hp = GameState.damageCharacter?.(target.id, lethal, {
      ignoreSidestep: true,
      roleEvasion: false,
      ignoreModifiers: true,
      source: 'impede_shock_overload',
    });
    const actual = Math.max(0, before - Math.max(0, hp ?? before));
    PixiBoard?.showHitEffect?.('character', target.id, actual);
    const playerBefore = GameState.getPlayerState?.(ownerId)?.hp ?? 0;
    const playerHp = GameState.damagePlayer?.(ownerId, 7, {
      ignoreSidestep: true,
      roleEvasion: false,
      splashCaptain: false,
      ignoreModifiers: true,
      source: 'impede_shock_overload',
    });
    const playerActual = Math.max(0, playerBefore - Math.max(0, playerHp ?? playerBefore));
    PixiBoard?.showHitEffect?.('player', ownerId, playerActual);
    showToast(`Impede/Shock overload eliminates ${char.name} and deals ${playerActual} to ${GameState.getPlayerLabel(ownerId)}.`, 'combat');
    return true;
  }

  function _showDieEventDamage(event, playerId) {
    if (!event || !playerId) return;
    if (event.playerDamage) {
      PixiBoard?.showHitEffect?.('player', playerId, event.playerDamage);
      showToast('Die consequence hits.', 'combat');
    }
    event.characterHits?.forEach(hit => {
      PixiBoard?.showHitEffect?.('character', hit.instanceId, hit.damage);
    });
    if (event.characterHits?.length) showToast('Bomb hits field.', 'combat');
  }

  function _showDamageHit(hit) {
    if (!hit) return;
    PixiBoard?.showHitEffect?.(hit.type, hit.id, hit.actualDamage ?? hit.amount ?? 0);
  }

  function _targetLabel(target) {
    if (target?.type === 'player') return GameState.getPlayerLabel(target.id);
    if (target?.type === 'character') return GameState.getCharacter(target.id)?.name ?? 'target';
    return 'target';
  }

  function _poisonEnemyTeam(oppId, primaryResult) {
    let spread = 0;
    GameState.getPlayerState(oppId).board.forEach(enemy => {
      if (primaryResult?.type === 'character' && primaryResult.id === enemy.instanceId) return;
      const result = _applyStatusToTarget({ type: 'character', id: enemy.instanceId }, 'status_poisoned', { allowSafeguard: false });
      if (result.applied) spread++;
    });
    if (primaryResult?.type !== 'player') {
      const result = _applyStatusToTarget({ type: 'player', id: oppId }, 'status_poisoned', { allowSafeguard: false, splashCaptain: false });
      if (result.applied) spread++;
    }
    if (spread > 0) showToast(`Gas Potion fumes Poison ${spread} additional target${spread === 1 ? '' : 's'}.`, 'combat');
  }

  function _fallbackDamageTarget(target, amount) {
    if (target?.type === 'player') {
      const actual = GameState.previewPlayerDamage?.(target.id, amount) ?? amount;
      const hp = GameState.damagePlayer(target.id, amount, { splashCaptain: true });
      return { type: 'player', id: target.id, amount, actualDamage: actual, hp };
    }
    if (target?.type === 'character') {
      const actual = GameState.previewCharacterDamage?.(target.id, amount) ?? amount;
      const hp = GameState.damageCharacter(target.id, amount);
      return { type: 'character', id: target.id, amount, actualDamage: actual, hp };
    }
    return null;
  }

  // Cheese Potion chaos table — every result does something real
  function _cheesePotion(playerId, oppId) {
    const event = RollEngine.rollEvent?.(playerId) ?? { roll: RollEngine.rollDie() };
    _showDieEventDamage(event, playerId);
    const roll = event.roll;
    const enemies = GameState.getPlayerState(oppId).board;
    const randEnemy = enemies.length ? enemies[Math.floor(Math.random() * enemies.length)] : null;

    switch (roll) {
      case 1: {
        const damage = _outgoingDamage(playerId, 3);
        if (randEnemy) {
          _showDamageHit(GameState.damageTarget?.({ type: 'player', id: oppId }, damage)
            ?? _fallbackDamageTarget({ type: 'player', id: oppId }, damage));
          const hit = GameState.damageTarget?.({ type: 'character', id: randEnemy.instanceId }, damage)
            ?? _fallbackDamageTarget({ type: 'character', id: randEnemy.instanceId }, damage);
          _showDamageHit(hit);
          showToast(`Cheese shrapnel: ${randEnemy.name} takes ${hit.actualDamage} damage.`, 'combat');
        } else {
          const hit = GameState.damageTarget?.({ type: 'player', id: oppId }, damage)
            ?? _fallbackDamageTarget({ type: 'player', id: oppId }, damage);
          _showDamageHit(hit);
          showToast(`Cheese shrapnel: ${GameState.getPlayerLabel(oppId)} takes ${hit.actualDamage}.`, 'combat');
        }
        break;
      }
      case 2:
        GameState.healPlayer(playerId, 3);
        showToast('Cheese Potion: you heal 3 HP.', 'info');
        break;
      case 3:
        GameState.gainMana(2);
        showToast('Cheese Potion: +2 mana.', 'info');
        break;
      case 4:
        HandManager.drawAction(playerId);
        showToast('Cheese Potion: drew 1 action card.', 'info');
        break;
      case 5:
        if (randEnemy) {
          const result = _applyStatusToTarget({ type: 'character', id: randEnemy.instanceId }, 'status_poisoned');
          const edible = result.applied
            ? _applyStatusToTarget({ type: result.type, id: result.id }, 'status_edible', { allowSafeguard: false })
            : { applied: false };
          const statusTarget = result.type === 'character' ? GameState.getCharacter(result.id) : null;
          showToast(result.applied
            ? `Moldy bits: ${statusTarget?.name ?? randEnemy.name} is Poisoned${edible.applied ? ' and Edible' : ''}.`
            : 'Moldy bits missed.',
            'combat');
        } else {
          const damage = _outgoingDamage(playerId, 2);
          const hit = GameState.damageTarget?.({ type: 'player', id: oppId }, damage)
            ?? _fallbackDamageTarget({ type: 'player', id: oppId }, damage);
          _applyStatusToTarget({ type: 'player', id: oppId }, 'status_edible');
          _showDamageHit(hit);
          showToast(`Moldy bits: ${GameState.getPlayerLabel(oppId)} takes ${hit.actualDamage} and becomes Edible.`, 'combat');
        }
        break;
      default:
        {
          const selfDmg = GameState.previewPlayerDamage?.(playerId, 2) ?? 2;
          const selfHp = GameState.getPlayerState(playerId)?.hp ?? 0;
          if (selfHp <= selfDmg) {
            showToast('Cheese Potion backfire would be lethal, so it fizzles.', 'warn');
            break;
          }
          const before = selfHp;
          const hp = GameState.damagePlayer(playerId, 2, { ignoreSidestep: true });
          const actual = Math.max(0, before - Math.max(0, hp ?? before));
          PixiBoard?.showHitEffect?.('player', playerId, actual);
          showToast('Regular cheese backfire.', 'warn');
        }
    }
  }
  // CHARACTER ABILITIES — full use flow
  // ══════════════════════════════════════════════════════════════════════════
  function _canResolveAbilityTarget(ability, ownerId, oppId, target, actorId = null) {
    if (_offensiveAbility(ability)) {
      if (target) {
        const charmBlock = actorId
          ? _charmedActionBlock({ type: 'character', id: actorId }, target, ability.abilityName)
          : null;
        if (charmBlock) return { ok: false, reason: charmBlock };
      }
    }

    if (ability.targetType === 'all_enemies') {
      const enemies = GameState.getPlayerState(oppId).board;
      if (_offensiveAbility(ability) && actorId) {
        const protectedTargets = [
          { type: 'player', id: oppId },
          ...enemies.map(enemy => ({ type: 'character', id: enemy.instanceId })),
        ].filter(target => GameState.isCharmedActionBlocked?.({ type: 'character', id: actorId }, target));
        if (protectedTargets.length) return { ok: false, reason: `${ability.abilityName} is blocked by Charmed.` };
      }
      const filter = _abilityTargetFilter(ability);
      const valid = filter ? enemies.filter(filter) : enemies;
      return valid.length > 0 || _abilityHitsEnemyPlayer(ability)
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs at least one valid enemy character.` };
    }

    if (ability.targetType === 'all_allies' && ability.effect === 'heal') {
      const hasSustain = /cleanse/i.test(ability.description ?? '') || (ability.statusApplied ?? []).length > 0;
      const wounded = GameState.getPlayerState(ownerId).board.filter(_isDamaged);
      return hasSustain || wounded.length > 0 || _playerIsDamaged(ownerId)
        ? { ok: true }
        : { ok: false, reason: 'No allies need healing.' };
    }

    if (ability.effect === 'draw_cards') {
      if (GameState.hasPlayerOrCaptainStatus?.(ownerId, 'status_locked_out')) {
        return { ok: false, reason: 'Locked Out blocks action-card draws.' };
      }
      const p = GameState.getPlayerState(ownerId);
      const limit = GameData?.rules?.handLimits?.action ?? 8;
      return (p?.hand?.actions?.length ?? 0) < limit
        ? { ok: true }
        : { ok: false, reason: 'Your action hand is full.' };
    }

    if (ability.effect === 'gain_mana'
      || ability.effect === 'cheatah_reroll'
      || ability.effect === 'cheatah_code'
      || ability.effect === 'roid_rage'
      || ability.effect === 'zoomstick'
      || ability.effect === 'meowrox'
      || ability.effect === 'swift_squall'
      || ability.effect === 'sleuth_seance') return { ok: true };

    if (ability.effect === 'breakback_breakdance') {
      const hp = GameState.getPlayerState(ownerId)?.hp ?? 0;
      return hp > 5
        ? { ok: true }
        : { ok: false, reason: 'Breakback Breakdance would knock you out.' };
    }

    if (ability.effect === 'bearzerk_rampage') {
      const enemies = GameState.getPlayerState(oppId).board;
      return enemies.length > 0 || _abilityHitsEnemyPlayer(ability)
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy field or player target.` };
    }

    if (['stinging_barbs', 'caffeine_rush', 'lapis_lazuli', 'titaness_toss', 'avian_flu', 'say_cheese'].includes(ability.effect)) {
      return target?.type === 'character' || target?.type === 'player'
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy hero or player.` };
    }

    if (ability.effect === 'heal') {
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      if (_isAnemic(t)) return { ok: false, reason: _healBlockReason(t) };
      return _isDamaged(t)
        ? { ok: true }
        : { ok: false, reason: `${t?.name ?? 'That target'} is already at full HP.` };
    }

    if (ability.effect === 'deal_damage_apply_status') {
      if (ability.targetType === 'all_enemies') return { ok: true };
      if (_abilityCanTargetPlayer(ability)) return target?.type === 'character' || target?.type === 'player'
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy hero or player.` };
      return target?.type === 'character'
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy character.` };
    }

    if (ability.effect === 'apply_status') {
      if (ability.targetType === 'self') return { ok: true };
      if (ability.targetType === 'all_allies') return { ok: true };
      if (_abilityCanTargetPlayer(ability) && target?.type === 'player') {
        const statusId = ability.statusApplied?.[0];
        return GameState.canPlayerReceiveStatus?.(target.id, statusId)
          ? { ok: true }
          : { ok: false, reason: `${ability.abilityName} needs a valid player target.` };
      }
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      const statusId = ability.statusApplied?.[0];
      return t && _canReceiveStatus(t, statusId)
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs a valid target that can receive that status.` };
    }

    if (ability.effect === 'apply_player_status' || ability.effect === 'shop_lock') {
      const sid = ability.statusApplied?.[0];
      return target?.type === 'player' && GameState.canPlayerReceiveStatus?.(target.id, sid)
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy player that can receive that status.` };
    }

    if (ability.effect === 'copy_enemy_ability') {
      return target?.type === 'character'
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy character to copy.` };
    }

    if (ability.effect === 'deal_damage' && _abilityCanTargetPlayer(ability)) {
      return target?.type === 'character' || target?.type === 'player'
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy hero or player.` };
    }

    if ((ability.effect === 'deal_damage' || ability.effect === 'duel') && ability.targetType === 'single_enemy') {
      return target?.type === 'character'
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy character.` };
    }

    return { ok: true };
  }

  function executeAbilityEffect(instanceId, abilityIndex = 0, target = null, options = {}) {
    if (!PhaseManager.canUseAbilities()) {
      if (!options.silent) showToast('Abilities can only be used in the Chaos Phase after rolling the Death Die.', 'warn');
      return { ok: false, error: 'Abilities can only be used in the Chaos Phase after rolling the Death Die.' };
    }
    const char = GameState.getCharacter(instanceId);
    if (!char) return { ok: false, error: 'Hero not found' };
    const ownerId = GameState.getCharacterOwner(instanceId);
    if (ownerId !== GameState.currentTurn) {
      if (!options.silent) showToast('Not your character.', 'warn');
      return { ok: false, error: 'Not your character.' };
    }
    const abilityGate = GameState.canCharacterUseAbility(char);
    if (!abilityGate.ok) {
      if (!options.silent) showToast(abilityGate.reason, 'warn');
      return { ok: false, error: abilityGate.reason };
    }

    const ability = char.abilities?.[abilityIndex];
    if (!ability) {
      if (!options.silent) showToast(`${char.name} has no ability.`, 'warn');
      return { ok: false, error: `${char.name} has no ability.` };
    }
    if (GameState.getMana(ownerId) < ability.manaCost) {
      const error = `Need ${ability.manaCost} mana (have ${GameState.getMana(ownerId)}).`;
      if (!options.silent) showToast(error, 'warn');
      return { ok: false, error };
    }

    const oppId = GameState.getOpponentId(ownerId);
    const targetGate = _canResolveAbilityTarget(ability, ownerId, oppId, target, instanceId);
    if (!targetGate.ok) {
      if (!options.silent) showToast(targetGate.reason, 'warn');
      return { ok: false, error: targetGate.reason };
    }
    if (!GameState.spendMana(ability.manaCost, ownerId)) {
      if (!options.silent) showToast('Not enough mana.', 'warn');
      return { ok: false, error: 'Not enough mana.' };
    }
    GameState.tapCharacter(instanceId, { actionType: 'ability' });
    _resolveAbility(char, ability, ownerId, oppId, target);
    renderBoard();
    PhaseManager.checkWin?.();
    return { ok: true, ability, target };
  }

  function useAbility(instanceId, abilityIndex = 0) {
    if (!PhaseManager.canUseAbilities()) {
      showToast('Abilities can only be used in the Chaos Phase after rolling the Death Die.', 'warn'); return;
    }
    const char = GameState.getCharacter(instanceId);
    if (!char) return;
    const ownerId = GameState.getCharacterOwner(instanceId);
    if (ownerId !== GameState.currentTurn) { showToast('Not your character.', 'warn'); return; }
    const abilityGate = GameState.canCharacterUseAbility(char);
    if (!abilityGate.ok) { showToast(abilityGate.reason, 'warn'); return; }

    const ability = char.abilities?.[abilityIndex];
    if (!ability) { showToast(`${char.name} has no ability.`, 'warn'); return; }
    if (GameState.getMana(ownerId) < ability.manaCost) {
      showToast(`Need ${ability.manaCost} mana (have ${GameState.getMana(ownerId)}).`, 'warn'); return;
    }

    const oppId = GameState.getOpponentId(ownerId);

    // Resolve — mana is spent and the character taps ONLY on confirm
    const confirm = (target) => {
      executeAbilityEffect(instanceId, abilityIndex, target);
    };

    switch (ability.targetType) {
      case 'self':
        return confirm({ type: 'character', id: instanceId });
      case 'all_allies':
        return confirm(null); // handled in resolution
      case 'all_enemies': {
        const ready = _canResolveAbilityTarget(ability, ownerId, oppId, null, instanceId);
        if (!ready.ok) { showToast(ready.reason, 'warn'); return; }
        return confirm(null);
      }
      case 'enemy_player':
        return confirm({ type: 'player', id: oppId });
      case 'single_ally': {
        const filter = _abilityTargetFilter(ability);
        const allies = GameState.getPlayerState(ownerId).board;
        const valid = filter ? allies.filter(filter) : allies;
        if (valid.length === 0) { showToast(filter ? `No valid friendly targets for ${ability.abilityName}.` : 'No friendly characters.', 'warn'); return; }
        return _pickTarget(ownerId, 'ally_chars', filter, `${ability.abilityName}: click a friendly character`, confirm);
      }
      case 'single_enemy': {
        const filter = _abilityTargetFilter(ability);
        const enemies = GameState.getPlayerState(oppId).board;
        const valid = filter ? enemies.filter(filter) : enemies;
        const allowPlayer = _abilityCanTargetPlayer(ability);
        const playerValid = allowPlayer && (!filter || GameState.canPlayerReceiveStatus?.(oppId, ability.statusApplied?.[0]));
        if (valid.length === 0 && !playerValid) { showToast(filter ? `No valid enemy targets for ${ability.abilityName}.` : 'No enemy characters to target.', 'warn'); return; }
        return _pickTarget(ownerId, allowPlayer ? 'enemy_any' : 'enemy_chars', filter, `${ability.abilityName}: click an enemy ${allowPlayer ? 'hero or HP icon' : 'character'}`, confirm);
      }
      case 'enemy_any':
        return _pickTarget(ownerId, 'enemy_any', null, `${ability.abilityName}: click an enemy character or their HP icon`, confirm);
      default:
        return confirm(null);
    }
  }

  function _resolveAbility(char, ability, ownerId, oppId, target) {
    const value = ability.effectValue ?? 0;

    switch (ability.effect) {
      case 'deal_damage': {
        const damage = _outgoingDamage(ownerId, value, { type: 'character', id: char.instanceId });
        if (ability.targetType === 'all_enemies') {
          const enemies = [...GameState.getPlayerState(oppId).board];
          enemies.forEach(enemy => {
            _showDamageHit(GameState.damageTarget?.({ type: 'character', id: enemy.instanceId }, damage, { multiTarget: true })
              ?? _fallbackDamageTarget({ type: 'character', id: enemy.instanceId }, damage));
          });
          if (_abilityHitsEnemyPlayer(ability)) {
            _showDamageHit(GameState.damageTarget?.({ type: 'player', id: oppId }, damage, { multiTarget: true })
              ?? _fallbackDamageTarget({ type: 'player', id: oppId }, damage));
          }
          showToast(`${char.name} uses ${ability.abilityName}: ${damage} damage to all enemies!`, 'combat');
        } else if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          const hit = GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage);
          _showDamageHit(hit);
          showToast(hit.safeguarded ? `${char.name} hits Safeguard.` : `${char.name} hits ${t?.name}.`, 'combat');
        } else if (target?.type === 'player') {
          const hit = GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage);
          _showDamageHit(hit);
          showToast(hit.safeguarded ? `${char.name} hits Safeguard.` : `${char.name} hits player.`, 'combat');
        }
        break;
      }

      case 'deal_damage_apply_status': {
        const statuses = ability.statusApplied ?? [];
        const sid = statuses[0];
        const statusOptions = statuses.includes('status_charmed')
          ? _charmSourceOptions(ownerId, { instanceId: char.instanceId, name: char.name })
          : {};
        const damage = _outgoingDamage(ownerId, value, { type: 'character', id: char.instanceId });
        if (ability.targetType === 'all_enemies') {
          const enemies = [...GameState.getPlayerState(oppId).board];
          enemies.forEach(enemy => {
            const hit = GameState.damageTarget?.({ type: 'character', id: enemy.instanceId }, damage, { multiTarget: true })
              ?? _fallbackDamageTarget({ type: 'character', id: enemy.instanceId }, damage);
            const result = _applyStatusesToTarget({ type: hit.type, id: hit.id }, statuses, { ...statusOptions, allowSafeguard: false });
            if (sid === 'status_charmed') _afterCharmApplied(ownerId, result, ability.abilityName);
            _showDamageHit(hit);
          });
          if (_abilityHitsEnemyPlayer(ability)) {
            const hit = GameState.damageTarget?.({ type: 'player', id: oppId }, damage, { multiTarget: true })
              ?? _fallbackDamageTarget({ type: 'player', id: oppId }, damage);
            const result = _applyStatusesToTarget({ type: hit.type, id: hit.id }, statuses, { ...statusOptions, allowSafeguard: false, splashCaptain: true });
            if (sid === 'status_charmed') _afterCharmApplied(ownerId, result, ability.abilityName);
            _showDamageHit(hit);
          }
          showToast(`${char.name} uses ${ability.abilityName}: ${damage} damage${sid ? ` and ${_statusName(sid)}` : ''} to all enemies!`, 'combat');
        } else if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          const hit = GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage);
          const result = _applyStatusesToTarget({ type: hit.type, id: hit.id }, statuses, { ...statusOptions, allowSafeguard: false });
          if (sid === 'status_charmed') _afterCharmApplied(ownerId, result, ability.abilityName);
          _showDamageHit(hit);
          showToast(hit.safeguarded ? `${char.name} hits Safeguard.` : `${char.name} hits ${t?.name}.`, 'combat');
        } else if (target?.type === 'player') {
          const hit = GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage);
          const result = _applyStatusesToTarget({ type: hit.type, id: hit.id }, statuses, { ...statusOptions, allowSafeguard: false, splashCaptain: true });
          if (sid === 'status_charmed') _afterCharmApplied(ownerId, result, ability.abilityName);
          _showDamageHit(hit);
          showToast(hit.safeguarded ? `${char.name} hits Safeguard.` : `${char.name} hits player.`, 'combat');
        }
        break;
      }

      case 'heal': {
        if (ability.targetType === 'all_allies') {
          const allies = GameState.getPlayerState(ownerId).board;
          const shouldCleanse = /cleanse/i.test(ability.description ?? '');
          allies.forEach(c => {
            if (value > 0) GameState.healCharacter(c.instanceId, value);
            if (shouldCleanse) _cleanseCharacter(c.instanceId);
            _applyStatusesToTarget({ type: 'character', id: c.instanceId }, ability.statusApplied ?? [], { allowSafeguard: false });
          });
          if (value > 0) GameState.healPlayer(ownerId, value);
          if (shouldCleanse) _cleansePlayer(ownerId);
          _applyStatusesToTarget({ type: 'player', id: ownerId }, ability.statusApplied ?? [], { allowSafeguard: false, splashCaptain: false });
          showToast(`${char.name} uses ${ability.abilityName}: allies and player heal ${value} HP.`, 'info');
        } else if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          GameState.healCharacter(target.id, value);
          showToast(`💖 ${char.name} heals ${t?.name} for ${value} HP!`, 'info');
        }
        break;
      }

      case 'apply_status': {
        const statuses = ability.statusApplied ?? [];
        const sid = statuses[0];
        const statusOptions = statuses.includes('status_charmed')
          ? _charmSourceOptions(ownerId, { instanceId: char.instanceId, name: char.name })
          : {};
        if (sid && ability.targetType === 'all_allies') {
          const allies = [...GameState.getPlayerState(ownerId).board];
          allies.forEach(ally => _applyStatusesToTarget({ type: 'character', id: ally.instanceId }, statuses, { allowSafeguard: false }));
          _applyStatusesToTarget({ type: 'player', id: ownerId }, statuses, { allowSafeguard: false, splashCaptain: false });
          showToast(`${_statusSym(sid)} ${char.name}: allies gain ${_statusName(sid)}.`, 'info');
        } else if (sid && ability.targetType === 'all_enemies') {
          const enemies = [...GameState.getPlayerState(oppId).board].filter(_alreadyHasStatus(sid));
          const safeguard = GameState.getSafeguardCaptain?.(oppId, null);
          if (safeguard && enemies.some(enemy => enemy.instanceId !== safeguard.instanceId)) {
            const result = _applyStatusesToTarget({ type: 'character', id: enemies[0]?.instanceId }, statuses, statusOptions);
            if (sid === 'status_charmed') _afterCharmApplied(ownerId, result, ability.abilityName);
            showToast(result.applied
              ? `${_statusSym(sid)} Safeguard absorbs ${_statusName(sid)}.`
              : `Safeguard attempted to absorb ${_statusName(sid)}.`,
              'combat');
          } else {
            enemies.forEach(enemy => {
              const result = _applyStatusesToTarget({ type: 'character', id: enemy.instanceId }, statuses, { ...statusOptions, allowSafeguard: false });
              if (sid === 'status_charmed') _afterCharmApplied(ownerId, result, ability.abilityName);
            });
            showToast(`${_statusSym(sid)} ${char.name}: ${enemies.length} enemy character${enemies.length === 1 ? '' : 's'} now ${_statusName(sid)}!`, 'combat');
          }
        } else if (sid && target?.type === 'character') {
          const result = _applyStatusesToTarget(target, statuses, statusOptions);
          const t = GameState.getCharacter(result.id ?? target.id);
          if (sid === 'status_charmed') {
            if (result.applied) _afterCharmApplied(ownerId, result, ability.abilityName);
            else _maybeCharmAbstainBacklash(ownerId, target, ability.abilityName);
          }
          showToast(`${_statusSym(sid)} ${char.name}: ${t?.name} is now ${_statusName(sid)}!`, 'combat');
        } else if (sid && target?.type === 'player') {
          const result = _applyStatusesToTarget(target, statuses, { ...statusOptions, splashCaptain: true });
          const label = result.type === 'player' ? GameState.getPlayerLabel(result.id) : GameState.getCharacter(result.id)?.name;
          if (sid === 'status_charmed') {
            if (result.applied) _afterCharmApplied(ownerId, result, ability.abilityName);
            else _maybeCharmAbstainBacklash(ownerId, target, ability.abilityName);
          }
          showToast(`${_statusSym(sid)} ${char.name}: ${label ?? 'target'} is now ${_statusName(sid)}!`, 'combat');
        }
        break;
      }

      case 'apply_player_status': {
        const statuses = ability.statusApplied ?? [];
        const sid = statuses[0];
        if (sid && target?.type === 'player') {
          const result = _applyStatusesToTarget(target, statuses, { splashCaptain: true });
          if (result.applied) {
            const label = result.type === 'player'
              ? GameState.getPlayerLabel(result.id)
              : GameState.getCharacter(result.id)?.name;
            showToast(`${_statusSym(sid)} ${label ?? 'Target'} is now ${_statusName(sid)}!`, 'combat');
          }
        }
        break;
      }

      case 'roid_rage': {
        const over = GameState.grantCharacterOverhealth?.(char.instanceId, 8, 8) ?? { gained: 0 };
        _applyStatusToTarget({ type: 'character', id: char.instanceId }, 'status_damage_boost', { allowSafeguard: false });
        _applyStatusToTarget({ type: 'character', id: char.instanceId }, 'status_anemic', { allowSafeguard: false, ignoreSidestep: true });
        const refreshed = GameState.getCharacter(char.instanceId);
        const anemic = refreshed?.statuses?.find(s => s.id === 'status_anemic');
        if (anemic) {
          anemic.remainingDuration = Math.max(anemic.remainingDuration ?? 1, 3);
          anemic.duration = Math.max(anemic.duration ?? 1, 3);
          GameState.grantCharacterOverhealth?.(char.instanceId, 0, 8);
        }
        showToast(`${char.name} uses ${ability.abilityName}: x1.5 damage and +${over.gained ?? 0} overhealth.`, 'combat');
        break;
      }

      case 'cheatah_code': {
        _applyStatusToTarget({ type: 'character', id: char.instanceId }, 'status_accelerated', { allowSafeguard: false });
        _applyStatusToTarget({ type: 'player', id: ownerId }, 'status_accelerated', { allowSafeguard: false, splashCaptain: false });
        _applyStatusToTarget({ type: 'player', id: ownerId }, 'status_cheatah_code', { allowSafeguard: false, splashCaptain: false });
        showToast(`${char.name} uses ${ability.abilityName}: accelerated and ready to cheat the next failed Death Die.`, 'info');
        break;
      }

      case 'bearzerk_rampage': {
        const damage = _outgoingDamage(ownerId, value, { type: 'character', id: char.instanceId });
        const enemies = [...GameState.getPlayerState(oppId).board];
        let killed = 0;
        enemies.forEach(enemy => {
          const hit = GameState.damageTarget?.({ type: 'character', id: enemy.instanceId }, damage, { multiTarget: true })
            ?? _fallbackDamageTarget({ type: 'character', id: enemy.instanceId }, damage);
          _showDamageHit(hit);
          if (!GameState.getCharacter(enemy.instanceId)) killed++;
        });
        const playerHit = GameState.damageTarget?.({ type: 'player', id: oppId }, damage, { multiTarget: true, splashCaptain: true })
          ?? _fallbackDamageTarget({ type: 'player', id: oppId }, damage);
        _showDamageHit(playerHit);
        const beforeHeal = GameState.getCharacter(char.instanceId)?.currentHp ?? 0;
        const healed = killed > 0 ? Math.max(0, (GameState.healCharacter?.(char.instanceId, killed * 2) ?? beforeHeal) - beforeHeal) : 0;
        showToast(`${char.name} rampages for ${damage} damage and heals ${healed} HP.`, 'combat');
        break;
      }

      case 'stinging_barbs': {
        const base = value || 3;
        const enemies = [...GameState.getPlayerState(oppId).board];
        const second = enemies.find(enemy => target?.type !== 'character' || enemy.instanceId !== target.id);
        const singleHeavy = !second;
        const hitOne = (nextTarget) => {
          const debuffed = _targetHasNegative(nextTarget);
          const amount = base * (singleHeavy ? 2 : 1) * (debuffed ? 2 : 1);
          const damage = _outgoingDamage(ownerId, amount, { type: 'character', id: char.instanceId });
          const hit = GameState.damageTarget?.(nextTarget, damage) ?? _fallbackDamageTarget(nextTarget, damage);
          _showDamageHit(hit);
          return hit?.actualDamage ?? damage;
        };
        const total = hitOne(target) + (second ? hitOne({ type: 'character', id: second.instanceId }) : 0);
        showToast(`${char.name} uses ${ability.abilityName}: ${total} total damage.`, 'combat');
        break;
      }

      case 'caffeine_rush': {
        _applyStatusToTarget({ type: 'character', id: char.instanceId }, 'status_accelerated', { allowSafeguard: false });
        _applyStatusToTarget({ type: 'character', id: char.instanceId }, 'status_sidestep', { allowSafeguard: false });
        const damage = _outgoingDamage(ownerId, value, { type: 'character', id: char.instanceId });
        const hit = GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage);
        _showDamageHit(hit);
        showToast(`${char.name} uses ${ability.abilityName}: accelerates, gains Sidestep, and hits for ${hit?.actualDamage ?? damage}.`, 'combat');
        break;
      }

      case 'lapis_lazuli': {
        const damage = _outgoingDamage(ownerId, value, { type: 'character', id: char.instanceId });
        const hit = GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage);
        const routedTarget = hit?.type && hit?.id ? { type: hit.type, id: hit.id } : target;
        _showDamageHit(hit);
        _applyStatusToTarget(routedTarget, 'status_impaired', { allowSafeguard: false, splashCaptain: routedTarget?.type === 'player' });
        const blockedCripple = GameState.targetHasStatus?.(routedTarget, 'status_crippled')
          || GameState.targetHasStatus?.(routedTarget, 'status_rabies');
        if (!blockedCripple) {
          _applyStatusToTarget(routedTarget, 'status_crippled', { allowSafeguard: false, splashCaptain: routedTarget?.type === 'player' });
        }
        showToast(`${char.name} uses ${ability.abilityName}: ${hit?.actualDamage ?? damage} damage, Impaired${blockedCripple ? '' : ', and Crippled'}.`, 'combat');
        break;
      }

      case 'titaness_toss': {
        const over = GameState.grantCharacterOverhealth?.(char.instanceId, 4, 4) ?? { gained: 0 };
        _applyStatusToTarget({ type: 'character', id: char.instanceId }, 'status_augmented', { allowSafeguard: false });
        const damage = _outgoingDamage(ownerId, value || 7, { type: 'character', id: char.instanceId });
        const declared = [];
        if (target) declared.push(target);
        const safeguard = GameState.getSafeguardCaptain?.(oppId, { type: 'player', id: oppId });
        if (safeguard && !declared.some(t => t.type === 'character' && t.id === safeguard.instanceId)) {
          declared.push({ type: 'character', id: safeguard.instanceId });
        }
        const pool = [
          ...GameState.getPlayerState(oppId).board.map(enemy => ({ type: 'character', id: enemy.instanceId })),
          { type: 'player', id: oppId },
        ].filter(next => !declared.some(t => t.type === next.type && t.id === next.id));
        if (declared.length < 2 && pool.length) declared.push(pool[0]);
        let total = 0;
        declared.slice(0, 2).forEach(nextTarget => {
          const hit = GameState.damageTarget?.(nextTarget, damage, {
            attacker: { type: 'character', id: char.instanceId },
            source: 'titaness_toss',
            multiTarget: true,
          }) ?? _fallbackDamageTarget(nextTarget, damage);
          total += hit?.actualDamage ?? damage;
          _showDamageHit(hit);
        });
        showToast(`${char.name} uses ${ability.abilityName}: +${over.gained ?? 0} overhealth, +2 attack, ${total} total damage.`, 'combat');
        break;
      }

      case 'avian_flu': {
        const over = GameState.grantCharacterOverhealth?.(char.instanceId, 4, 4) ?? { gained: 0 };
        _applyStatusToTarget({ type: 'character', id: char.instanceId }, 'status_damage_boost', { allowSafeguard: false });
        const damage = _outgoingDamage(ownerId, value || 5, { type: 'character', id: char.instanceId });
        const hit = GameState.damageTarget?.(target, damage, {
          attacker: { type: 'character', id: char.instanceId },
          source: 'avian_flu',
        }) ?? _fallbackDamageTarget(target, damage);
        const routedTarget = hit?.type && hit?.id ? { type: hit.type, id: hit.id } : target;
        _applyStatusToTarget(routedTarget, 'status_rabies', {
          sourcePlayerId: ownerId,
          sourceCharacterId: char.instanceId,
          sourceName: char.name,
          splashCaptain: routedTarget?.type === 'player',
        });
        _showDamageHit(hit);
        showToast(`${char.name} uses ${ability.abilityName}: +${over.gained ?? 0} overhealth, Damage Boost, and ${hit?.actualDamage ?? damage} damage with Rabies.`, 'combat');
        break;
      }

      case 'say_cheese': {
        const damage = _outgoingDamage(ownerId, value || 3, { type: 'character', id: char.instanceId });
        const hit = GameState.damageTarget?.(target, damage, {
          attacker: { type: 'character', id: char.instanceId },
          source: 'say_cheese',
        }) ?? _fallbackDamageTarget(target, damage);
        const routedTarget = hit?.type && hit?.id ? { type: hit.type, id: hit.id } : target;
        _applyStatusToTarget(routedTarget, 'status_edible', {
          sourcePlayerId: ownerId,
          sourceCharacterId: char.instanceId,
          sourceName: char.name,
          splashCaptain: routedTarget?.type === 'player',
        });
        _showDamageHit(hit);

        const spreadPool = [
          ...GameState.getPlayerState(oppId).board.map(enemy => ({ type: 'character', id: enemy.instanceId })),
          { type: 'player', id: oppId },
        ].filter(next => next.type !== routedTarget?.type || next.id !== routedTarget?.id);
        let spread = null;
        if (spreadPool.length && Math.random() < (1 / 3)) {
          spread = spreadPool[Math.floor(Math.random() * spreadPool.length)];
          _applyStatusToTarget(spread, 'status_edible', {
            sourcePlayerId: ownerId,
            sourceCharacterId: char.instanceId,
            sourceName: char.name,
            splashCaptain: spread.type === 'player',
          });
        }
        showToast(`${char.name} uses ${ability.abilityName}: ${hit?.actualDamage ?? damage} damage and Edible${spread ? ' spread.' : '.'}`, 'combat');
        break;
      }

      case 'breakback_breakdance': {
        const success = Math.random() < 0.5;
        const damage = _outgoingDamage(ownerId, value || 5, { type: 'character', id: char.instanceId });
        if (success) {
          let total = 0;
          [...GameState.getPlayerState(oppId).board].forEach(enemy => {
            const hit = GameState.damageTarget?.({ type: 'character', id: enemy.instanceId }, damage, {
              attacker: { type: 'character', id: char.instanceId },
              source: 'breakback_breakdance',
              allowSafeguard: false,
              multiTarget: true,
            }) ?? _fallbackDamageTarget({ type: 'character', id: enemy.instanceId }, damage);
            total += hit?.actualDamage ?? damage;
            _showDamageHit(hit);
          });
          const playerHit = GameState.damageTarget?.({ type: 'player', id: oppId }, damage, {
            attacker: { type: 'character', id: char.instanceId },
            source: 'breakback_breakdance',
            allowSafeguard: false,
            splashCaptain: true,
            multiTarget: true,
          }) ?? _fallbackDamageTarget({ type: 'player', id: oppId }, damage);
          total += playerHit?.actualDamage ?? damage;
          _showDamageHit(playerHit);
          _applyStatusToTarget({ type: 'player', id: oppId }, 'status_impeded', {
            allowSafeguard: false,
            splashCaptain: true,
            sourcePlayerId: ownerId,
            sourceCharacterId: char.instanceId,
            sourceName: char.name,
          });
          showToast(`${char.name} lands ${ability.abilityName}: ${total} total damage and enemy player/captain Impeded.`, 'combat');
        } else {
          _applyStatusToTarget({ type: 'character', id: char.instanceId }, 'status_impeded', { allowSafeguard: false, ignoreSidestep: true });
          _applyStatusToTarget({ type: 'player', id: ownerId }, 'status_impeded', { allowSafeguard: false, splashCaptain: false, ignoreSidestep: true });
          const selfBefore = char.currentHp ?? 0;
          const selfHp = GameState.damageCharacter?.(char.instanceId, 5, {
            attacker: { type: 'character', id: char.instanceId },
            source: 'breakback_fail',
            ignoreSidestep: true,
            roleEvasion: false,
          });
          const playerBefore = GameState.getPlayerState(ownerId)?.hp ?? 0;
          const playerHp = GameState.damagePlayer?.(ownerId, 5, {
            source: 'breakback_fail',
            ignoreSidestep: true,
            roleEvasion: false,
            splashCaptain: false,
          });
          PixiBoard?.showHitEffect?.('character', char.instanceId, Math.max(0, selfBefore - Math.max(0, selfHp ?? selfBefore)));
          PixiBoard?.showHitEffect?.('player', ownerId, Math.max(0, playerBefore - Math.max(0, playerHp ?? playerBefore)));
          showToast(`${char.name} botches ${ability.abilityName}: Hip-Hop Papa and player take 5 and are Impeded.`, 'warn');
        }
        break;
      }

      case 'sleuth_seance': {
        if (GameState.hasPlayerOrCaptainStatus?.(ownerId, 'status_locked_out')) {
          showToast('Locked Out blocks Sleuth Seance.', 'warn');
          break;
        }
        const drawn = HandManager.drawAction(ownerId);
        if (!drawn.ok || !drawn.card) {
          showToast(drawn.error ?? 'No action card could be drawn.', 'warn');
          break;
        }
        drawn.card._freeCast = true;
        GameState.setMana?.(GameState.getMana?.(ownerId) ?? 0, ownerId);
        const matched = GameState.getPlayerState(oppId)?.hand?.actions?.some(card => card.id === drawn.card.id);
        if (matched) {
          _applyStatusToTarget({ type: 'player', id: oppId }, 'status_haunted', {
            sourcePlayerId: ownerId,
            sourceCharacterId: char.instanceId,
            sourceName: char.name,
            splashCaptain: true,
          });
        }
        showToast(`${char.name} uses ${ability.abilityName}: drew ${drawn.card.name} free${matched ? ' and Haunted the enemy.' : '.'}`, 'info');
        break;
      }

      case 'zoomstick': {
        const allies = [...GameState.getPlayerState(ownerId).board];
        const enemies = [...GameState.getPlayerState(oppId).board];
        allies.forEach(ally => _applyStatusToTarget({ type: 'character', id: ally.instanceId }, 'status_accelerated', { allowSafeguard: false }));
        _applyStatusToTarget({ type: 'player', id: ownerId }, 'status_accelerated', { allowSafeguard: false, splashCaptain: false });
        enemies.forEach(enemy => _applyStatusToTarget({ type: 'character', id: enemy.instanceId }, 'status_impeded', { allowSafeguard: false }));
        _applyStatusToTarget({ type: 'player', id: oppId }, 'status_impeded', { splashCaptain: true });
        showToast(`${char.name} uses ${ability.abilityName}: allies accelerate, enemies are impeded.`, 'combat');
        break;
      }

      case 'swift_squall': {
        const statuses = ability.statusApplied?.length
          ? ability.statusApplied
          : ['status_accelerated', 'status_augmented', 'status_sidestep'];
        const allies = [...GameState.getPlayerState(ownerId).board];
        allies.forEach(ally => {
          statuses.forEach(sid => _applyStatusToTarget({ type: 'character', id: ally.instanceId }, sid, { allowSafeguard: false }));
        });
        statuses.forEach(sid => _applyStatusToTarget({ type: 'player', id: ownerId }, sid, { allowSafeguard: false, splashCaptain: false }));
        showToast(`${char.name} uses ${ability.abilityName}: allies gain Accelerated, Augmented, and Sidestep.`, 'info');
        break;
      }

      case 'meowrox': {
        const over = GameState.grantCharacterOverhealth?.(char.instanceId, 4, 4) ?? { gained: 0 };
        const spawn = GameState.spawnCopyCharacter?.(ownerId, char.instanceId);
        if (spawn?.ok) {
          showToast(`${char.name} uses ${ability.abilityName}: +${over.gained ?? 0} overhealth and a Copy joins the field.`, 'info');
          break;
        }

        const firstAction = GameState.getPlayerState(ownerId)?.hand?.actions?.[0];
        if (firstAction) {
          firstAction._freeCast = true;
          GameState.setMana?.(GameState.getMana?.(ownerId) ?? 0, ownerId);
          showToast(`${char.name} uses ${ability.abilityName}: +${over.gained ?? 0} overhealth. ${firstAction.name} becomes free to cast.`, 'info');
        } else {
          showToast(`${char.name} uses ${ability.abilityName}: +${over.gained ?? 0} overhealth.`, 'info');
        }
        break;
      }

      case 'shop_lock': {
        const sid = ability.statusApplied?.[0] ?? 'status_locked_out';
        if (target?.type === 'player') {
          const result = _applyStatusToTarget(target, sid, { splashCaptain: true });
          if (result.applied) {
            showToast(result.safeguarded ? 'Safeguard absorbs Locked Out.' : 'Shop locked.', 'combat');
          }
        }
        break;
      }

      case 'draw_cards': {
        if (GameState.hasPlayerOrCaptainStatus?.(ownerId, 'status_locked_out')) {
          showToast('Locked Out blocks action-card draws.', 'warn');
          break;
        }
        const n = Math.max(1, value || 1);
        let drawn = 0;
        for (let i = 0; i < n; i++) if (HandManager.drawAction(ownerId).ok) drawn++;
        showToast(drawn > 0 ? `${char.name} uses ${ability.abilityName} — drew ${drawn} action card${drawn === 1 ? '' : 's'}!` : 'Hand is full — no card drawn.', 'info');
        break;
      }

      case 'gain_mana': {
        const n = Math.max(1, value || 1);
        const source = /Cheatah/i.test(char.name ?? '')
          ? 'cheatah_reroll'
          : (char.statuses?.some(s => s.id === 'status_augmented') ? 'augment' : null);
        const gained = GameState.gainMana(n, ownerId, source ? { source } : undefined);
        showToast(`${char.name} uses ${ability.abilityName} — gained ${gained} mana!`, 'info');
        break;
      }

      case 'cheatah_reroll': {
        const event = RollEngine.rollEvent?.(ownerId) ?? { roll: RollEngine.rollDie() };
        _showDieEventDamage(event, ownerId);
        const gained = GameState.gainMana(event.roll, ownerId, { source: 'cheatah_reroll' });
        showToast(`${char.name} cheats the die: rolled ${event.roll}, gained ${gained} mana.`, 'info');
        break;
      }

      case 'copy_enemy_ability': {
        if (target?.type !== 'character') break;
        const copied = GameState.getCharacter(target.id);
        if (!copied) break;

        const sourceAbility = (copied.abilities ?? []).find(a =>
          ['deal_damage', 'deal_damage_apply_status', 'apply_status'].includes(a.effect)
        );

        if (sourceAbility?.effect === 'apply_status') {
          const sid = sourceAbility.statusApplied?.[0];
          if (sid && _canReceiveStatus(copied, sid)) {
            _applyStatusToTarget({ type: 'character', id: copied.instanceId }, sid, { allowSafeguard: false });
            showToast(`${char.name} copies ${copied.name}'s ${sourceAbility.abilityName}: ${_statusName(sid)} applied back to ${copied.name}!`, 'combat');
          } else {
            const dmg = _outgoingDamage(ownerId, Math.max(1, GameState.getEffectiveAttack(copied)), { type: 'character', id: char.instanceId });
            const hit = GameState.damageTarget?.({ type: 'character', id: copied.instanceId }, dmg, { allowSafeguard: false })
              ?? _fallbackDamageTarget({ type: 'character', id: copied.instanceId }, dmg);
            _showDamageHit(hit);
            showToast(`${char.name} copies ${copied.name}'s passive pressure: ${copied.name} takes ${hit.actualDamage} damage!`, 'combat');
          }
          break;
        }

        const copiedDamage = sourceAbility?.effectValue ?? GameState.getEffectiveAttack(copied);
        const dmg = _outgoingDamage(ownerId, Math.max(1, copiedDamage || copied.baseAttack || 1), { type: 'character', id: char.instanceId });
        const hit = GameState.damageTarget?.({ type: 'character', id: copied.instanceId }, dmg, { allowSafeguard: false })
          ?? _fallbackDamageTarget({ type: 'character', id: copied.instanceId }, dmg);
        const sid = sourceAbility?.statusApplied?.[0];
        if (sid && _canReceiveStatus(copied, sid)) _applyStatusToTarget({ type: 'character', id: copied.instanceId }, sid, { allowSafeguard: false });
        _showDamageHit(hit);
        showToast(`${char.name} copies ${copied.name}: ${copied.name} takes ${hit.actualDamage}${sid ? ` and ${_statusName(sid)}` : ''}!`, 'combat');
        break;
      }

      case 'duel': {
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          showToast(`${char.name} challenges ${t?.name} to a duel!`, 'combat');
          DuelSystem.start(char.instanceId, target.id, (winnerId, loserId) => {
            if (loserId) {
              const loser = GameState.getCharacter(loserId);
              const damage = _outgoingDamage(ownerId, value, { type: 'character', id: char.instanceId });
              const hit = GameState.damageTarget?.({ type: 'character', id: loserId }, damage, { allowSafeguard: false })
                ?? _fallbackDamageTarget({ type: 'character', id: loserId }, damage);
              const sourceWon = winnerId === char.instanceId;
              if (sourceWon) {
                _applyStatusesToTarget({ type: 'character', id: loserId }, ability.statusApplied ?? [], {
                  allowSafeguard: false,
                  sourcePlayerId: ownerId,
                  sourceCharacterId: char.instanceId,
                  sourceName: char.name,
                });
              }
              _showDamageHit(hit);
              showToast(`Duel: ${loser?.name ?? 'The loser'} takes ${hit.actualDamage} damage!`, 'combat');

              if (sourceWon && ability.abilityName === 'Basket-Ballad') {
                const selfHadSidestep = GameState.hasStatus?.(char.instanceId, 'status_sidestep');
                const playerHadSidestep = GameState.hasPlayerStatus?.(ownerId, 'status_sidestep');
                _applyStatusToTarget({ type: 'character', id: char.instanceId }, 'status_sidestep', { allowSafeguard: false });
                _applyStatusToTarget({ type: 'player', id: ownerId }, 'status_sidestep', { allowSafeguard: false, splashCaptain: false });
                const fallback = selfHadSidestep && playerHadSidestep
                  ? GameState.getPlayerState(ownerId).board.find(ally => ally.instanceId !== char.instanceId && !GameState.hasStatus?.(ally.instanceId, 'status_sidestep'))
                  : null;
                if (fallback) _applyStatusToTarget({ type: 'character', id: fallback.instanceId }, 'status_sidestep', { allowSafeguard: false });
                showToast(`${char.name} wins Basket-Ballad: Sidestep gained${fallback ? `, with ${fallback.name} catching the extra dodge` : ''}.`, 'info');
              }

              if (sourceWon && ability.abilityName === 'Bust Thrust') {
                GameState.addCharacterVerglas?.(char.instanceId, 4);
                GameState.addPlayerVerglas?.(ownerId, 4, { shareCaptain: false });
                showToast(`${char.name} wins Bust Thrust: +4 armor to Breast Knuckle and player.`, 'info');
              }

              if (sourceWon && ability.abilityName === 'Booty Brawl') {
                const availableMana = GameState.getMana?.(oppId) ?? 0;
                const stolenMana = Math.min(2, availableMana);
                if (stolenMana > 0 && GameState.spendMana?.(stolenMana, oppId)) {
                  GameState.gainMana?.(stolenMana, ownerId);
                }

                let stolenCard = null;
                if (!GameState.hasPlayerOrCaptainStatus?.(ownerId, 'status_locked_out')) {
                  const enemyActions = GameState.getPlayerState(oppId)?.hand?.actions ?? [];
                  if (enemyActions.length && (GameState.getPlayerState(ownerId)?.hand?.actions?.length ?? 0) < (GameData?.rules?.handLimits?.action ?? 8)) {
                    const idx = enemyActions.findIndex(card => (card.manaCost ?? 0) > 0);
                    const [card] = enemyActions.splice(idx >= 0 ? idx : 0, 1);
                    const added = GameState.addCardToHand?.(ownerId, card, 'action');
                    if (added?.ok) stolenCard = added.card;
                    else enemyActions.unshift(card);
                  }
                }

                showToast(`${char.name} wins Booty Brawl: looted ${stolenMana} mana${stolenCard ? ` and ${stolenCard.name}` : ''}.`, 'info');
              }

              if (sourceWon && ability.abilityName === 'Deadlock') {
                const result = _applyStatusToTarget({ type: 'player', id: oppId }, 'status_locked_out', {
                  splashCaptain: false,
                  allowSafeguard: false,
                  ignoreSidestep: true,
                });
                showToast(result.applied ? `${char.name} wins Deadlock: enemy shop and Draw Pile locked.` : 'Deadlock failed to apply.', 'combat');
              }
            }
            renderBoard();
            PhaseManager.checkWin?.();
          });
        }
        break;
      }
      default:
        console.warn(`[AbilityDispatcher] Unknown ability effect: ${ability.effect}`);
    }
  }

  // ── Back-compat shims ───────────────────────────────────────────────────────
  function use(instanceId, abilityIndex) { useAbility(instanceId, abilityIndex); }

  return { playCard, useAbility, use, executeActionEffect, executeAbilityEffect };
})();
