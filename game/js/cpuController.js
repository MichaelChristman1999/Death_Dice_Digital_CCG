const CpuController = (() => {
  const NEGATIVE_STATUSES = new Set([
    'status_anemic',
    'status_burning',
    'status_charmed',
    'status_crippled',
    'status_cursed',
    'status_drunk',
    'status_frozen',
    'status_haunted',
    'status_impaired',
    'status_impeded',
    'status_jinxed',
    'status_locked_out',
    'status_poisoned',
    'status_rabies',
    'status_shocked',
    'status_virus',
  ]);

  let _playerId = 'p2';
  let _persona = null;
  let _busy = false;
  let _token = 0;

  function configure({ playerId = 'p2', persona } = {}) {
    _playerId = playerId;
    _persona = persona ?? CpuPersonas.get('little_timmy');
    _busy = false;
    _token++;
  }

  function cancel() {
    _busy = false;
    _token++;
  }

  async function takeTurn() {
    if (_busy || !_persona || GameState.currentTurn !== _playerId || !PhaseManager.canAct?.()) return;
    _busy = true;
    const myToken = ++_token;
    try {
      showToast(`${_persona.name} is thinking...`, 'info');
      await _sleep(_pace(520), myToken);
      if (!_isLive(myToken)) return;

      if (GameState.currentPhase === 'combat') {
        await _shopPhase(myToken, 'early');
        await _deployPhase(myToken);
        _assignCaptain();
        await _actionPhase(myToken, 'before_attacks');
        await _abilityPhase(myToken, 'before_attacks');
        await _attackPhase(myToken);
        await _playerAttackPhase(myToken);
        await _abilityPhase(myToken, 'after_attacks');
        await _actionPhase(myToken, 'after_attacks');
        await _shopPhase(myToken, 'late');
      } else {
        await _deployPhase(myToken);
        _assignCaptain();
        await _shopPhase(myToken, 'etiquette');
      }

      if (!_isLive(myToken) || PhaseManager.checkWin?.()) return;
      await _sleep(_pace(520), myToken);
      if (_isLive(myToken) && GameState.currentTurn === _playerId && PhaseManager.canEndTurn?.()) {
        PhaseManager.handleEndTurn();
        renderBoard?.();
      }
    } finally {
      _busy = false;
    }
  }

  function _pace(ms) {
    const jitter = Math.floor(Math.random() * 220);
    return ms + jitter;
  }

  function _sleep(ms, token) {
    return new Promise(resolve => {
      setTimeout(() => resolve(_isLive(token)), ms);
    });
  }

  function _isLive(token) {
    return token === _token && GameState.currentTurn === _playerId;
  }

  function _roll(chance) {
    return Math.random() < chance;
  }

  function _mistake() {
    return _roll(_persona?.mistakeRate ?? 0);
  }

  function _text(card) {
    return [
      card?.name,
      card?.classType,
      card?.archetype,
      card?.role,
      card?.docAbility,
      card?.description,
      ...(card?.statusApplied ?? []),
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function _normName(name) {
    return String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function _nameMatches(card, names = []) {
    const own = _normName(card?.name);
    return names.some(name => own.includes(_normName(name)));
  }

  function _scoreHero(card) {
    if (!card) return -999;
    let score = (card.baseAttack ?? 0) * 1.8 + (card.hp ?? 0) * 0.45 - (card.manaCost ?? 0) * 0.3;
    const role = card.classType ?? '';
    const weights = _persona?.roleWeights ?? {};
    Object.entries(weights).forEach(([key, value]) => {
      if (new RegExp(key, 'i').test(role)) score += value;
    });
    if (_nameMatches(card, _persona?.preferredHeroes)) score += 7;

    const txt = _text(card);
    if (/safeguard|overhealth|respawn|cleanse|heal/.test(txt)) score += _persona?.id === 'clean_gene' ? 5 : 2;
    if (/accelerate|extra action|speed|zoom/.test(txt)) score += _persona?.id === 'quick_rick' ? 6 : 2;
    if (/impede|cripple|anemic|damage/.test(txt)) score += _persona?.id === 'average_joe' ? 3 : 1;

    const own = GameState.getPlayerState(_playerId);
    const enemy = GameState.getPlayerState(GameState.getOpponentId(_playerId));
    if ((own?.hp ?? 0) < (enemy?.hp ?? 0) && /Durability|Legendary/i.test(role)) score += 3;
    return score;
  }

  function _scoreAction(card) {
    if (!card) return -999;
    let score = 1 + (card.manaCost === 0 ? 2 : 0);
    if (_nameMatches(card, _persona?.preferredActions)) score += 7;
    const txt = _text(card);
    if (/cleanse|vitalize|heal|sidestep/.test(txt)) score += _persona?.id === 'clean_gene' ? 6 : 2;
    if (/accelerate|augment/.test(txt)) score += _persona?.id === 'quick_rick' ? 6 : 2;
    if (/impede|anemic|cripple|damage|rabies/.test(txt)) score += _persona?.id === 'average_joe' ? 4 : 2;
    if (card.effect === 'cascade_damage') score += 5;
    return score;
  }

  function _scoreAbility(char, ability) {
    if (!char || !ability) return -999;
    let score = 0;
    const value = ability.effectValue ?? 0;
    const cost = ability.manaCost ?? 0;
    if (cost > GameState.getMana(_playerId)) return -999;
    if (/damage|duel|impede|cripple|anemic|rabies|poison|burn|shock|charm/i.test(`${ability.effect} ${ability.description ?? ''}`)) {
      score += 5 + value;
    }
    if (/heal|cleanse|vitalize|bless/i.test(`${ability.effect} ${ability.description ?? ''}`)) {
      score += _persona?.id === 'clean_gene' ? 8 : 3;
      if (!_mostWoundedAlly() && !_debuffedAlly()) score -= 4;
    }
    if (/accelerate|augment|mana|draw|zoom/i.test(`${ability.effect} ${ability.description ?? ''}`)) {
      score += _persona?.id === 'quick_rick' ? 7 : 3;
    }
    if (ability.effect === 'shop_lock') score += 4;
    if (_persona?.preferredHeroes?.some(name => _normName(char.name).includes(_normName(name)))) score += 2;
    score -= cost * 0.35;
    return score;
  }

  async function _shopPhase(token, timing) {
    if (!_isLive(token) || !ShopSystem?.buyForCpu || !PhaseManager.canShop?.()) return;
    if (GameState.hasPlayerStatus?.(_playerId, 'status_locked_out')) return;
    if (timing === 'late' && GameState.getMana(_playerId) <= 1) return;
    if (!_roll(_persona?.shopChance ?? 0.6) || _mistake()) return;

    const buyHeroFirst = _persona?.id !== 'clean_gene' || GameState.getPlayerState(_playerId).board.length === 0;
    const steps = buyHeroFirst ? ['hero', 'action'] : ['action', 'hero'];

    for (const type of steps) {
      if (!_isLive(token)) return;
      const result = ShopSystem.buyForCpu(_playerId, type, card => type === 'hero' ? _scoreHero(card) : _scoreAction(card));
      if (result?.ok) await _sleep(_pace(360), token);
    }
  }

  async function _deployPhase(token) {
    const p = GameState.getPlayerState(_playerId);
    if (!p || !_roll(_persona?.deployChance ?? 0.7)) return;

    let deployed = 0;
    const maxDeploys = Math.max(1, _persona?.maxDeploys ?? 1);
    while (_isLive(token) && deployed < maxDeploys && p.hand.heroes.length && p.board.length < (GameData.rules?.fieldLimits?.heroes ?? 5)) {
      if (_mistake() && deployed > 0) break;
      const candidates = p.hand.heroes
        .filter(card => card._freeCast || GameState.getMana(_playerId) >= (card.manaCost ?? 0))
        .sort((a, b) => _scoreHero(b) - _scoreHero(a));
      const pick = candidates[0];
      if (!pick) break;
      const result = GameState.deployHero(_playerId, pick.id);
      if (!result?.ok) break;
      deployed++;
      showToast(`${_persona.name} deploys ${result.instance.name}.`, 'info');
      if (!p.captainId || _scoreHero(result.instance) >= _scoreHero(GameState.getCaptain(_playerId))) {
        GameState.setCaptain(_playerId, result.instance.instanceId);
      }
      renderBoard?.();
      await _sleep(_pace(420), token);
    }
  }

  function _assignCaptain() {
    const p = GameState.getPlayerState(_playerId);
    if (!p?.board?.length) return;
    const current = GameState.getCaptain(_playerId);
    const best = [...p.board].sort((a, b) => _scoreHero(b) - _scoreHero(a))[0];
    if (best && best.instanceId !== current?.instanceId) {
      GameState.setCaptain(_playerId, best.instanceId);
      showToast(`${_persona.name} makes ${best.name} captain.`, 'info');
      renderBoard?.();
    }
  }

  async function _actionPhase(token, timing) {
    if (!_isLive(token) || GameState.currentPhase !== 'combat') return;
    if (!_roll(_persona?.actionChance ?? 0.5)) return;
    const p = GameState.getPlayerState(_playerId);
    if (!p?.hand?.actions?.length) return;

    let played = 0;
    const budget = Math.max(1, _persona?.actionBudget ?? 1);
    const cards = [...p.hand.actions].sort((a, b) => _scoreAction(b) - _scoreAction(a));
    for (const card of cards) {
      if (!_isLive(token) || played >= budget) return;
      const check = GameState.canPlayAction(_playerId, card.id);
      if (!check?.ok) continue;
      const target = _targetForAction(card, timing);
      if (target === null) continue;

      const committed = GameState.commitPlayAction(_playerId, card.id);
      if (!committed?.ok) continue;
      AbilityDispatcher.executeActionEffect(committed.card, _playerId, target);
      showToast(`${_persona.name} plays ${committed.card.name}.`, 'info');
      played++;
      renderBoard?.();
      if (PhaseManager.checkWin?.()) return;
      await _sleep(_pace(520), token);
    }
  }

  async function _abilityPhase(token, timing) {
    if (!_isLive(token) || GameState.currentPhase !== 'combat') return;
    if (!_roll(_persona?.abilityChance ?? _persona?.actionChance ?? 0.55)) return;
    const p = GameState.getPlayerState(_playerId);
    if (!p?.board?.length) return;

    const candidates = p.board
      .map(char => ({ char, ability: char.abilities?.[0] }))
      .filter(row => row.ability && (GameState.canCharacterUseAbility?.(row.char)?.ok ?? true))
      .map(row => ({ ...row, score: _scoreAbility(row.char, row.ability) }))
      .filter(row => row.score > -100)
      .sort((a, b) => b.score - a.score);

    let used = 0;
    const budget = Math.max(1, _persona?.abilityBudget ?? 1);
    for (const { char, ability } of candidates) {
      if (!_isLive(token) || used >= budget) return;
      if (_mistake() && used > 0) return;
      const target = _targetForAbility(char, ability, timing);
      if (target === false) continue;
      const result = AbilityDispatcher.executeAbilityEffect?.(char.instanceId, 0, target, { silent: true });
      if (!result?.ok) continue;
      showToast(`${_persona.name} uses ${ability.abilityName}.`, 'info');
      used++;
      renderBoard?.();
      if (PhaseManager.checkWin?.()) return;
      await _sleep(_pace(560), token);
    }
  }

  function _targetForAction(card, timing) {
    const effect = card.effect;
    if (card.id === 'action_reveal') return null;
    if (effect === 'draw_cards' || effect === 'gain_mana' || effect === 'random_effect') return { type: 'player', id: _playerId };
    if (card.id === 'action_abstain' || card.id === 'action_blood_mana') return { type: 'player', id: _playerId };

    if (effect === 'heal') {
      return _mostWoundedAlly() ?? (_persona.id === 'clean_gene' ? { type: 'player', id: _playerId } : null);
    }
    if (effect === 'remove_status') {
      return _debuffedAlly() ?? (_persona.id === 'little_timmy' && _mistake() ? { type: 'player', id: _playerId } : null);
    }
    if (effect === 'accelerate' || effect === 'augment') {
      if (timing === 'after_attacks' && effect === 'accelerate') return null;
      return _bestAllyTarget(true) ?? { type: 'player', id: _playerId };
    }
    if (effect === 'sidestep') {
      return _bestAllyTarget(false) ?? { type: 'player', id: _playerId };
    }
    if (effect === 'cascade_damage') {
      return _bestEnemyTarget({ preferPlayer: false }) ?? { type: 'player', id: GameState.getOpponentId(_playerId) };
    }
    if (['apply_status', 'rabies', 'control_character', 'deal_damage', 'multi_damage'].includes(effect)) {
      return _bestEnemyTarget({ preferPlayer: _persona?.faceBias > 0.55 });
    }
    return _bestEnemyTarget({ preferPlayer: false });
  }

  function _targetForAbility(char, ability, timing) {
    if (!ability) return null;
    if (['gain_mana', 'cheatah_reroll', 'cheatah_code', 'roid_rage', 'zoomstick', 'meowrox', 'swift_squall', 'breakback_breakdance', 'sleuth_seance'].includes(ability.effect)) {
      return { type: 'character', id: char.instanceId };
    }
    if (ability.targetType === 'self') return { type: 'character', id: char.instanceId };
    if (ability.targetType === 'all_allies' || ability.targetType === 'all_enemies') return null;
    if (ability.targetType === 'enemy_player' || ability.effect === 'shop_lock' || ability.effect === 'apply_player_status') {
      return { type: 'player', id: GameState.getOpponentId(_playerId) };
    }
    if (ability.effect === 'heal') {
      return _mostWoundedAlly() ?? false;
    }
    if (ability.targetType === 'single_ally') {
      return _bestAllyTarget(/attack|damage|accelerate|augment/i.test(ability.description ?? ''));
    }
    if (ability.effect === 'duel' || ability.effect === 'copy_enemy_ability') {
      return _bestEnemyCharacterTarget() ?? false;
    }
    if (['deal_damage', 'deal_damage_apply_status', 'apply_status', 'stinging_barbs', 'caffeine_rush', 'lapis_lazuli', 'titaness_toss', 'avian_flu', 'say_cheese'].includes(ability.effect)) {
      return _bestEnemyTarget({ preferPlayer: _persona?.faceBias > 0.5 || /player/i.test(ability.description ?? '') });
    }
    return _bestEnemyTarget({ preferPlayer: false });
  }

  function _hasNegative(entity) {
    return (entity?.statuses ?? []).some(s => NEGATIVE_STATUSES.has(s.id));
  }

  function _debuffedAlly() {
    const p = GameState.getPlayerState(_playerId);
    const char = p.board.find(_hasNegative);
    if (char) return { type: 'character', id: char.instanceId };
    return _hasNegative(p) ? { type: 'player', id: _playerId } : null;
  }

  function _mostWoundedAlly() {
    const p = GameState.getPlayerState(_playerId);
    const wounded = p.board
      .filter(c => (c.currentHp ?? c.hp ?? 0) < (c.maxHp ?? c.hp ?? 0))
      .sort((a, b) => ((b.maxHp ?? b.hp ?? 0) - (b.currentHp ?? b.hp ?? 0)) - ((a.maxHp ?? a.hp ?? 0) - (a.currentHp ?? a.hp ?? 0)))[0];
    if (wounded) return { type: 'character', id: wounded.instanceId };
    const maxHp = GameData.rules?.startingPlayerHP ?? 40;
    return (p.hp ?? maxHp) < maxHp ? { type: 'player', id: _playerId } : null;
  }

  function _bestAllyTarget(preferAttacker) {
    const p = GameState.getPlayerState(_playerId);
    if (!p?.board?.length) return null;
    const candidates = [...p.board].sort((a, b) => {
      const aScore = (preferAttacker ? GameState.getEffectiveAttack(a) : (a.currentHp ?? 0)) + (a.instanceId === p.captainId ? 3 : 0);
      const bScore = (preferAttacker ? GameState.getEffectiveAttack(b) : (b.currentHp ?? 0)) + (b.instanceId === p.captainId ? 3 : 0);
      return bScore - aScore;
    });
    return { type: 'character', id: candidates[0].instanceId };
  }

  function _bestEnemyTarget({ preferPlayer = false } = {}) {
    const oppId = GameState.getOpponentId(_playerId);
    const enemy = GameState.getPlayerState(oppId);
    if (!enemy) return null;

    const safeguard = GameState.getSafeguardCaptain?.(oppId, { type: 'player', id: oppId });
    if (safeguard) return { type: 'character', id: safeguard.instanceId };

    if (preferPlayer && _roll(_persona?.faceBias ?? 0.3)) return { type: 'player', id: oppId };
    if (!enemy.board.length) return { type: 'player', id: oppId };

    const target = [...enemy.board].sort((a, b) => {
      const aHp = a.currentHp ?? a.hp ?? 0;
      const bHp = b.currentHp ?? b.hp ?? 0;
      const aThreat = GameState.getEffectiveAttack(a) * 2 + aHp * 0.25 + (enemy.captainId === a.instanceId ? 4 : 0);
      const bThreat = GameState.getEffectiveAttack(b) * 2 + bHp * 0.25 + (enemy.captainId === b.instanceId ? 4 : 0);
      if (_persona?.id === 'clean_gene') return bThreat - aThreat;
      return aHp - bHp || bThreat - aThreat;
    })[0];
    return target ? { type: 'character', id: target.instanceId } : { type: 'player', id: oppId };
  }

  function _bestEnemyCharacterTarget() {
    const oppId = GameState.getOpponentId(_playerId);
    const enemy = GameState.getPlayerState(oppId);
    if (!enemy?.board?.length) return null;
    const target = [...enemy.board].sort((a, b) => {
      const aScore = GameState.getEffectiveAttack(a) * 2 + (a.currentHp ?? 0) * 0.2 + (enemy.captainId === a.instanceId ? 4 : 0);
      const bScore = GameState.getEffectiveAttack(b) * 2 + (b.currentHp ?? 0) * 0.2 + (enemy.captainId === b.instanceId ? 4 : 0);
      return bScore - aScore;
    })[0];
    return target ? { type: 'character', id: target.instanceId } : null;
  }

  async function _attackPhase(token) {
    if (!_isLive(token) || GameState.currentPhase !== 'combat') return;
    const p = GameState.getPlayerState(_playerId);
    const attackers = [...p.board];
    for (const char of attackers) {
      if (!_isLive(token)) return;
      const liveChar = GameState.getCharacter(char.instanceId);
      if (!liveChar) continue;
      const gate = GameState.canCharacterAttack?.(liveChar) ?? { ok: true };
      if (!gate.ok) continue;
      if (_mistake() && _persona.id === 'little_timmy') continue;

      const target = _bestEnemyTarget({ preferPlayer: _roll(_persona?.faceBias ?? 0.35) });
      if (!target) continue;
      CombatEngine.resolveDirectAttack(liveChar.instanceId, target.type, target.id);
      if (PhaseManager.checkWin?.()) return;
      await _sleep(_pace(610), token);
    }
  }

  async function _playerAttackPhase(token) {
    if (!_isLive(token) || GameState.currentPhase !== 'combat') return;
    if (!_roll(_persona?.playerAttackChance ?? 0.6)) return;
    const check = GameState.canPlayerBaseAttack?.(_playerId);
    if (!check?.ok) return;
    const target = _bestEnemyTarget({ preferPlayer: _roll(_persona?.faceBias ?? 0.35) });
    if (!target) return;
    CombatEngine.resolvePlayerBaseAttack(_playerId, target);
    await _sleep(_pace(460), token);
  }

  return { configure, cancel, takeTurn };
})();
