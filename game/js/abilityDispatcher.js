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
  const _isAnemic = (char) => _hasStatus(char, 'status_anemic');
  const _isDamaged = (char) => !!char && char.currentHp < char.maxHp && !_isAnemic(char);
  const _healBlockReason = (char) => `${char?.name ?? 'That target'} is inflicted with Anemic and can't be healed.`;
  const _impairBlockReason = () => "Can't impair enemy hero as base attack is already min value.";
  const _playerIsDamaged = (pid) => {
    const p = GameState.getPlayerState(pid);
    const maxHp = GameData?.rules?.startingPlayerHP ?? 40;
    return !!p && p.hp < maxHp;
  };
  const _playerHasNegative = (pid) =>
    (GameState.getPlayerState(pid)?.statuses ?? []).some(s => NEGATIVE_IDS.has(s.id));
  const _outgoingDamage = (playerId, amount) =>
    GameState.applyCaptainDamageBonus?.(playerId, amount) ?? amount;

  function _cleanseCharacter(instanceId, options = {}) {
    const except = new Set(options.except ?? []);
    const char = GameState.getCharacter(instanceId);
    if (!char) return 0;
    const ids = [...new Set((char.statuses ?? [])
      .map(s => s.id)
      .filter(id => NEGATIVE_IDS.has(id) && !except.has(id)))];
    ids.forEach(id => StatusEngine.remove(instanceId, id));
    return ids.length;
  }

  function _cleansePlayer(playerId, options = {}) {
    const except = new Set(options.except ?? []);
    const p = GameState.getPlayerState(playerId);
    if (!p) return 0;
    const ids = [...new Set((p.statuses ?? [])
      .map(s => s.id)
      .filter(id => NEGATIVE_IDS.has(id) && !except.has(id)))];
    ids.forEach(id => GameState.removePlayerStatus?.(playerId, id));
    return ids.length;
  }

  function _canReceiveStatus(char, statusId) {
    if (!statusId) return true;
    if (!char) return false;
    if (char._statusImmune && NEGATIVE_IDS.has(statusId)) return false;
    const ownerId = GameState.getCharacterOwner?.(char.instanceId);
    if (['status_charmed', 'status_drunk'].includes(statusId) && GameState.hasPlayerStatus?.(ownerId, 'status_abstaining')) return false;
    if (statusId === 'status_impaired' && (char.baseAttack ?? 0) <= 1) return false;
    return !_hasStatus(char, statusId);
  }

  function _alreadyHasStatus(statusId) {
    return (char) => _canReceiveStatus(char, statusId);
  }

  function _cardTargetFilter(card) {
    if (card.effect === 'remove_status') return _hasNegative;
    if (card.effect === 'heal') return card.id === 'action_vitalize' ? (() => true) : _isDamaged;
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

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION CARDS — full play flow (validate → target → commit → resolve)
  // ══════════════════════════════════════════════════════════════════════════
  function playCard(card, ownerId) {
    const isFree = card.manaCost === 0 || card.type === 'free';

    // Phase gating
    if (isFree) {
      if (!PhaseManager.canPlayFreeActionCards()) {
        showToast('Cannot play cards right now.', 'warn'); return;
      }
    } else {
      if (ownerId !== GameState.currentTurn) { showToast('Not your turn.', 'warn'); return; }
      if (!PhaseManager.canPlayPaidActionCards()) {
        showToast('Paid action cards can only be played in the Combat phase, after rolling.', 'warn'); return;
      }
    }

    // Cost / per-turn limit validation (nothing is spent yet)
    const check = GameState.canPlayAction(ownerId, card.id);
    if (!check.ok) { showToast(check.error, 'warn'); return; }

    const oppId = GameState.getOpponentId(ownerId);
    const enemyChars = GameState.getPlayerState(oppId).board;
    const allyChars  = GameState.getPlayerState(ownerId).board;

    // Resolve targeting requirements per card
    const commit = (target) => {
      const targetGate = _canResolveActionTarget(card, ownerId, oppId, target);
      if (!targetGate.ok) { showToast(targetGate.reason, 'warn'); return; }
      const r = GameState.commitPlayAction(ownerId, card.id);
      if (!r.ok) { showToast(r.error, 'warn'); return; }
      executeActionEffect(card, ownerId, target);
      renderBoard();
      PhaseManager.checkWin?.();
    };

    switch (card.targetType) {
      case 'single_enemy': {
        const filter = _cardTargetFilter(card);
        const validEnemies = filter ? enemyChars.filter(filter) : enemyChars;
        if (validEnemies.length === 0) {
          // Damage cards fall through to the enemy player; status cards need a body
          if (card.effect === 'deal_damage' && !filter) {
            return _pickTarget(ownerId, 'enemy_any', null,
              `${card.name}: choose a target`, commit);
          }
          showToast(filter ? `No valid enemy characters for ${card.name}.` : 'No enemy characters to target.', 'warn'); return;
        }
        return _pickTarget(ownerId, 'enemy_chars', filter,
          `${card.name}: click an enemy character`, commit);
      }

      case 'enemy_any': {
        const filter = _cardTargetFilter(card);
        const validEnemies = filter ? enemyChars.filter(filter) : enemyChars;
        const statusId = card.statusApplied?.[0];
        const playerIsValid = card.effect === 'apply_status'
          ? (GameState.canPlayerReceiveStatus?.(oppId, statusId) ?? false)
          : true;
        if (validEnemies.length === 0 && !playerIsValid) {
          showToast(`No valid enemy targets for ${card.name}.`, 'warn'); return;
        }
        return _pickTarget(ownerId, 'enemy_any', filter,
          `${card.name}: choose an enemy hero or player`, commit);
      }

      case 'enemy_player':
        return commit({ type: 'player', id: oppId });

      case 'single_enemy_with_status': {
        const valid = enemyChars.filter(c => (c.statuses?.length ?? 0) > 0);
        if (valid.length === 0) { showToast(`${card.name} needs a statused enemy.`, 'warn'); return; }
        return _pickTarget(ownerId, 'enemy_chars', (c) => (c.statuses?.length ?? 0) > 0,
          `${card.name}: click an enemy with a status effect`, commit);
      }

      case 'single_ally': {
        const filter = _cardTargetFilter(card);
        const validAllies = filter ? allyChars.filter(filter) : allyChars;
        const allowSelfPlayer = card.effect === 'heal'; // e.g. Vitalize: "or yourself"
        const selfIsValid = allowSelfPlayer && _playerIsDamaged(ownerId);
        if (validAllies.length === 0 && !selfIsValid) {
          showToast(filter ? `No valid friendly targets for ${card.name}.` : 'You have no characters on the board.', 'warn'); return;
        }
        return _pickTarget(ownerId, allowSelfPlayer ? 'ally_or_self' : 'ally_chars', filter,
          `${card.name}: click a friendly ${allowSelfPlayer ? 'character (or your own HP icon)' : 'character'}`, commit);
      }

      case 'ally_any': {
        const filter = _cardTargetFilter(card);
        const validAllies = filter ? allyChars.filter(filter) : allyChars;
        const selfIsValid = card.effect === 'remove_status'
          ? _playerHasNegative(ownerId)
          : true;
        if (validAllies.length === 0 && !selfIsValid) {
          showToast(`No valid targets for ${card.name}.`, 'warn'); return;
        }
        return _pickTarget(ownerId, 'ally_any', filter,
          `${card.name}: choose ally or player`, commit);
      }

      // Everything else resolves immediately, no target click needed
      default: {
        const ready = _canResolveImmediateAction(card, ownerId, oppId);
        if (!ready.ok) { showToast(ready.reason, 'warn'); return; }
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
      if (_isAnemic(t)) return { ok: false, reason: _healBlockReason(t) };
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
      if (statusId === 'status_impaired' && t && (t.baseAttack ?? 0) <= 1) {
        return { ok: false, reason: _impairBlockReason() };
      }
      return t && _canReceiveStatus(t, statusId)
        ? { ok: true }
        : { ok: false, reason: `${card.name} needs an enemy that does not already have that status.` };
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
        return GameState.canPlayerReceiveStatus?.(target.id, statusId) || GameState.hasPlayerStatus?.(target.id, statusId)
          ? { ok: true }
          : { ok: false, reason: `${card.name} needs a valid player target.` };
      }
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      return t && (_canReceiveStatus(t, statusId) || _hasStatus(t, statusId))
        ? { ok: true }
        : { ok: false, reason: `${card.name} needs a valid target.` };
    }

    if (card.effect === 'control_character') {
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      const owner = t ? GameState.getCharacterOwner?.(t.instanceId) : null;
      return t && !GameState.isPlayerImmuneToStatus?.(owner, 'status_charmed')
        ? { ok: true }
        : { ok: false, reason: `${owner ? GameState.getPlayerLabel(owner) : 'That player'} is Abstaining and immune to Love Potion.` };
    }

    return { ok: true };
  }

  // Enter PixiBoard target mode; onPick(null) = cancelled (no cost)
  function _pickTarget(ownerId, mode, filter, banner, onConfirm) {
    ActionUI?.showTargetBanner?.(banner);
    PixiBoard.enterTargetMode({ ownerId, mode, filter }, (target) => {
      ActionUI?.hideTargetBanner?.();
      if (!target) { showToast('Cancelled.', 'info'); return; }
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
      GameState.damagePlayer(playerId, 5);
      const gained = GameState.gainMana(5, playerId, { source: 'blood_mana' });
      PixiBoard?.showHitEffect?.('player', playerId, 5);
      showToast(`Blood Mana: +${gained} mana.`, 'combat');
      return;
    }
    if (card.id === 'action_reveal') {
      ActionUI?.showRevealModal?.(oppId);
      showToast('👁 Revealing opponent\'s hand…', 'info');
      return;
    }

    if (card.id === 'action_abstain') {
      GameState.applyPlayerStatus?.(playerId, 'status_abstaining');
      const n = Math.max(1, value || 2);
      let drawn = 0;
      for (let i = 0; i < n; i++) if (HandManager.drawAction(playerId).ok) drawn++;
      showToast(`Abstain: drew ${drawn} action card${drawn === 1 ? '' : 's'} and became immune to Love Potion.`, 'info');
      return;
    }

    switch (card.effect) {
      case 'accelerate': {
        const sid = 'status_accelerated';
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          GameState.applyStatus?.(target.id, sid);
          showToast(`${t?.name ?? 'Ally'} accelerated.`, 'info');
        } else if (target?.type === 'player') {
          GameState.applyPlayerStatus?.(target.id, sid);
          showToast(`${GameState.getPlayerLabel(target.id)} accelerated.`, 'info');
        }
        break;
      }

      case 'augment': {
        const sid = card.statusApplied?.[0] ?? 'status_augmented';
        const gained = GameState.gainMana?.(value || 2, playerId, { source: 'augment' }) ?? 0;
        const result = _applyStatusToTarget(target, sid, { allowSafeguard: false, splashCaptain: false });
        const targetName = target?.type === 'player'
          ? GameState.getPlayerLabel(target.id)
          : GameState.getCharacter(target?.id)?.name;
        showToast(result.applied
          ? `Augment: +${gained} mana and ${targetName ?? 'target'} doubles attack damage.`
          : `Augment: +${gained} mana, but the buff did not land.`,
          'info');
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
        if (roll >= 4) {
          GameState.healPlayer(playerId, value);
          own.board.forEach(c => GameState.healCharacter(c.instanceId, value, { overheal: true }));
          showToast(`Cryofreeze armor: +${value}.`, 'info');
        } else {
          GameState.damagePlayer(playerId, 1);
          PixiBoard?.showHitEffect?.('player', playerId, 1);
          GameState.applyPlayerStatus?.(playerId, 'status_frozen');
          own.board.forEach(c => {
            GameState.damageCharacter(c.instanceId, 1);
            StatusEngine.apply(c.instanceId, 'status_frozen');
            PixiBoard?.showHitEffect?.('character', c.instanceId, 1);
          });
          showToast('Frozen next turn.', 'warn');
        }
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
          const hit = GameState.damageTarget?.(hits[0], damage, { safeguardDamage: 5, multiTarget: true })
            ?? _fallbackDamageTarget({ type: 'character', id: safeguard.instanceId }, 5);
          _showDamageHit(hit);
          showToast('Safeguard stops second hit.', 'combat');
          break;
        }

        hits.slice(0, 2).forEach(hitTarget => _showDamageHit(
          GameState.damageTarget?.(hitTarget, damage) ?? _fallbackDamageTarget(hitTarget, damage)
        ));
        showToast(`Damage Potion hits ${hits.length}.`, 'combat');
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
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          GameState.healCharacter(target.id, value, { overheal: card.id === 'action_vitalize' });
          if (card.id === 'action_vitalize') _cleanseCharacter(target.id, { except: ['status_rabies'] });
          showToast(`${card.name} heals ${t?.name ?? 'ally'} ${value}.`, 'info');
        } else if (target?.type === 'player') {
          GameState.healPlayer(target.id, value);
          if (card.id === 'action_vitalize') _cleansePlayer(target.id, { except: ['status_rabies'] });
          showToast(`${card.name} heals ${GameState.getPlayerLabel(target.id)} ${value}.`, 'info');
        }
        break;
      }

      case 'apply_status': {
        const sid = card.statusApplied?.[0];
        if (sid && target?.type === 'character') {
          const result = _applyStatusToTarget(target, sid);
          const t = GameState.getCharacter(result.id ?? target.id);
          if (result.applied) {
            showToast(`${_statusSym(sid)} ${t?.name ?? 'Target'} is now ${_statusName(sid)}!`, 'combat');
          }
        } else if (sid && target?.type === 'player') {
          const result = _applyStatusToTarget(target, sid, { splashCaptain: true });
          if (result.applied) {
            const label = result.type === 'player'
              ? GameState.getPlayerLabel(result.id)
              : GameState.getCharacter(result.id)?.name;
            showToast(`${_statusSym(sid)} ${label ?? 'Target'} is now ${_statusName(sid)}!`, 'combat');
          }
        }
        break;
      }

      case 'remove_status': {
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          const removed = _cleanseCharacter(target.id);
          showToast(removed > 0 ? `Cleansed ${t?.name}.` : 'No debuffs found.', 'info');
        } else if (target?.type === 'player') {
          const removed = _cleansePlayer(target.id);
          showToast(removed > 0 ? `Cleansed ${GameState.getPlayerLabel(target.id)}.` : 'No debuffs found.', 'info');
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
          StatusEngine.apply(target.id, sid);
          showToast(`${t?.name ?? 'Ally'} sidesteps.`, 'info');
        } else if (target?.type === 'player') {
          GameState.applyPlayerStatus?.(target.id, sid);
          showToast(`${GameState.getPlayerLabel(target.id)} sidesteps.`, 'info');
        }
        break;
      }

      case 'control_character': {
        if (target?.type === 'character') {
          const result = _applyStatusToTarget(target, 'status_charmed');
          const charmed = result.type === 'character' ? GameState.getCharacter(result.id) : null;
          if (result.applied && charmed) {
            const dmg = _outgoingDamage(playerId, GameState.getEffectiveAttack(charmed));
            const hit = GameState.damageTarget?.({ type: 'player', id: oppId }, dmg)
              ?? _fallbackDamageTarget({ type: 'player', id: oppId }, dmg);
            GameState.tapCharacter(charmed.instanceId);
            _showDamageHit(hit);
            showToast(`Love Potion: ${charmed.name} turns on their own player.`, 'combat');
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
    ['status_poisoned', 'status_crippled', 'status_rabies'].forEach(sid => _applyStatusToTarget(target, sid));
    const pool = [
      ...GameState.getPlayerState(oppId).board.map(c => ({ type: 'character', id: c.instanceId, name: c.name })),
      { type: 'player', id: oppId, name: GameState.getPlayerLabel(oppId) },
    ].filter(t => !(t.type === target.type && t.id === target.id));
    if (pool.length) {
      const spread = pool[Math.floor(Math.random() * pool.length)];
      ['status_poisoned', 'status_crippled', 'status_rabies'].forEach(sid => _applyStatusToTarget(spread, sid));
      showToast('Rabies spreads.', 'combat');
    } else {
      showToast('Rabies applied.', 'combat');
    }
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
        if (GameState.hasPlayerStatus?.(playerId, 'status_impeded')) {
          showToast('Impede blocks cheese attack.', 'warn');
          break;
        }
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
          const statusTarget = result.type === 'character' ? GameState.getCharacter(result.id) : null;
          showToast(result.applied ? `Moldy bits: ${statusTarget?.name ?? randEnemy.name} is Poisoned.` : 'Moldy bits missed.', 'combat');
        } else {
          const damage = _outgoingDamage(playerId, 2);
          const hit = GameState.damageTarget?.({ type: 'player', id: oppId }, damage)
            ?? _fallbackDamageTarget({ type: 'player', id: oppId }, damage);
          _showDamageHit(hit);
          showToast(`Moldy bits: ${GameState.getPlayerLabel(oppId)} takes ${hit.actualDamage}.`, 'combat');
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
          const hp = GameState.damagePlayer(playerId, 2);
          const actual = Math.max(0, before - Math.max(0, hp ?? before));
          PixiBoard?.showHitEffect?.('player', playerId, actual);
          showToast('Regular cheese backfire.', 'warn');
        }
    }
  }
  // CHARACTER ABILITIES — full use flow
  // ══════════════════════════════════════════════════════════════════════════
  function _canResolveAbilityTarget(ability, ownerId, oppId, target) {
    if (ability.targetType === 'all_enemies') {
      const enemies = GameState.getPlayerState(oppId).board;
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
      const p = GameState.getPlayerState(ownerId);
      const limit = GameData?.rules?.handLimits?.action ?? 8;
      return (p?.hand?.actions?.length ?? 0) < limit
        ? { ok: true }
        : { ok: false, reason: 'Your action hand is full.' };
    }

    if (ability.effect === 'gain_mana' || ability.effect === 'cheatah_reroll' || ability.effect === 'zoomstick') return { ok: true };

    if (ability.effect === 'heal') {
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      if (_isAnemic(t)) return { ok: false, reason: _healBlockReason(t) };
      return _isDamaged(t)
        ? { ok: true }
        : { ok: false, reason: `${t?.name ?? 'That target'} is already at full HP.` };
    }

    if (ability.effect === 'deal_damage_apply_status') {
      if (ability.targetType === 'all_enemies') return { ok: true };
      if (ability.targetType === 'enemy_any') return target?.type === 'character' || target?.type === 'player'
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy hero or player.` };
      return target?.type === 'character'
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy character.` };
    }

    if (ability.effect === 'apply_status') {
      if (ability.targetType === 'self') return { ok: true };
      if (ability.targetType === 'all_allies') return { ok: true };
      if (ability.targetType === 'enemy_any' && target?.type === 'player') return { ok: true };
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      const statusId = ability.statusApplied?.[0];
      if (statusId === 'status_impaired' && t && (t.baseAttack ?? 0) <= 1) {
        return { ok: false, reason: _impairBlockReason() };
      }
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

    if ((ability.effect === 'deal_damage' || ability.effect === 'duel') && ability.targetType === 'single_enemy') {
      return target?.type === 'character'
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy character.` };
    }

    return { ok: true };
  }

  function useAbility(instanceId, abilityIndex = 0) {
    if (!PhaseManager.canUseAbilities()) {
      showToast('Abilities can only be used in the Combat phase, after rolling.', 'warn'); return;
    }
    const char = GameState.getCharacter(instanceId);
    if (!char) return;
    const ownerId = GameState.getCharacterOwner(instanceId);
    if (ownerId !== GameState.currentTurn) { showToast('Not your character.', 'warn'); return; }
    if (char.tapped || char.hasAttackedThisTurn || char.hasUsedAbilityThisTurn) {
      showToast(`${char.name} has already acted this turn.`, 'warn'); return;
    }
    const abilityGate = GameState.canCharacterUseAbility(char);
    if (!abilityGate.ok) { showToast(abilityGate.reason, 'warn'); return; }

    const ability = char.abilities?.[abilityIndex];
    if (!ability) { showToast(`${char.name} has no ability.`, 'warn'); return; }
    if (GameState.getMana() < ability.manaCost) {
      showToast(`Need ${ability.manaCost} mana (have ${GameState.getMana()}).`, 'warn'); return;
    }

    const oppId = GameState.getOpponentId(ownerId);

    // Resolve — mana is spent and the character taps ONLY on confirm
    const confirm = (target) => {
      const targetGate = _canResolveAbilityTarget(ability, ownerId, oppId, target);
      if (!targetGate.ok) { showToast(targetGate.reason, 'warn'); return; }
      if (!GameState.spendMana(ability.manaCost)) { showToast('Not enough mana.', 'warn'); return; }
      char.hasUsedAbilityThisTurn = true;
      GameState.tapCharacter(instanceId); // ability = the character's action
      _resolveAbility(char, ability, ownerId, oppId, target);
      renderBoard();
      PhaseManager.checkWin?.();
    };

    switch (ability.targetType) {
      case 'self':
        return confirm({ type: 'character', id: instanceId });
      case 'all_allies':
        return confirm(null); // handled in resolution
      case 'all_enemies': {
        const ready = _canResolveAbilityTarget(ability, ownerId, oppId, null);
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
        if (valid.length === 0) { showToast(filter ? `No valid enemy targets for ${ability.abilityName}.` : 'No enemy characters to target.', 'warn'); return; }
        return _pickTarget(ownerId, 'enemy_chars', filter, `${ability.abilityName}: click an enemy character`, confirm);
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
        const damage = _outgoingDamage(ownerId, value);
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
        const damage = _outgoingDamage(ownerId, value);
        if (ability.targetType === 'all_enemies') {
          const enemies = [...GameState.getPlayerState(oppId).board];
          enemies.forEach(enemy => {
            const hit = GameState.damageTarget?.({ type: 'character', id: enemy.instanceId }, damage, { multiTarget: true })
              ?? _fallbackDamageTarget({ type: 'character', id: enemy.instanceId }, damage);
            _applyStatusesToTarget({ type: hit.type, id: hit.id }, statuses, { allowSafeguard: false });
            _showDamageHit(hit);
          });
          if (_abilityHitsEnemyPlayer(ability)) {
            const hit = GameState.damageTarget?.({ type: 'player', id: oppId }, damage, { multiTarget: true })
              ?? _fallbackDamageTarget({ type: 'player', id: oppId }, damage);
            _applyStatusesToTarget({ type: hit.type, id: hit.id }, statuses, { allowSafeguard: false, splashCaptain: true });
            _showDamageHit(hit);
          }
          showToast(`${char.name} uses ${ability.abilityName}: ${damage} damage${sid ? ` and ${_statusName(sid)}` : ''} to all enemies!`, 'combat');
        } else if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          const hit = GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage);
          _applyStatusesToTarget({ type: hit.type, id: hit.id }, statuses, { allowSafeguard: false });
          _showDamageHit(hit);
          showToast(hit.safeguarded ? `${char.name} hits Safeguard.` : `${char.name} hits ${t?.name}.`, 'combat');
        } else if (target?.type === 'player') {
          const hit = GameState.damageTarget?.(target, damage) ?? _fallbackDamageTarget(target, damage);
          _applyStatusesToTarget({ type: hit.type, id: hit.id }, statuses, { allowSafeguard: false, splashCaptain: true });
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
        if (sid && ability.targetType === 'all_allies') {
          const allies = [...GameState.getPlayerState(ownerId).board];
          allies.forEach(ally => _applyStatusesToTarget({ type: 'character', id: ally.instanceId }, statuses, { allowSafeguard: false }));
          _applyStatusesToTarget({ type: 'player', id: ownerId }, statuses, { allowSafeguard: false, splashCaptain: false });
          showToast(`${_statusSym(sid)} ${char.name}: allies gain ${_statusName(sid)}.`, 'info');
        } else if (sid && ability.targetType === 'all_enemies') {
          const enemies = [...GameState.getPlayerState(oppId).board].filter(_alreadyHasStatus(sid));
          const safeguard = GameState.getSafeguardCaptain?.(oppId, null);
          if (safeguard && enemies.some(enemy => enemy.instanceId !== safeguard.instanceId)) {
            const result = _applyStatusesToTarget({ type: 'character', id: enemies[0]?.instanceId }, statuses);
            showToast(result.applied
              ? `${_statusSym(sid)} Safeguard absorbs ${_statusName(sid)}.`
              : `Safeguard attempted to absorb ${_statusName(sid)}.`,
              'combat');
          } else {
            enemies.forEach(enemy => _applyStatusesToTarget({ type: 'character', id: enemy.instanceId }, statuses, { allowSafeguard: false }));
            showToast(`${_statusSym(sid)} ${char.name}: ${enemies.length} enemy character${enemies.length === 1 ? '' : 's'} now ${_statusName(sid)}!`, 'combat');
          }
        } else if (sid && target?.type === 'character') {
          const result = _applyStatusesToTarget(target, statuses);
          const t = GameState.getCharacter(result.id ?? target.id);
          showToast(`${_statusSym(sid)} ${char.name}: ${t?.name} is now ${_statusName(sid)}!`, 'combat');
        } else if (sid && target?.type === 'player') {
          const result = _applyStatusesToTarget(target, statuses, { splashCaptain: true });
          const label = result.type === 'player' ? GameState.getPlayerLabel(result.id) : GameState.getCharacter(result.id)?.name;
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
            const dmg = _outgoingDamage(ownerId, Math.max(1, GameState.getEffectiveAttack(copied)));
            const hit = GameState.damageTarget?.({ type: 'character', id: copied.instanceId }, dmg, { allowSafeguard: false })
              ?? _fallbackDamageTarget({ type: 'character', id: copied.instanceId }, dmg);
            _showDamageHit(hit);
            showToast(`${char.name} copies ${copied.name}'s passive pressure: ${copied.name} takes ${hit.actualDamage} damage!`, 'combat');
          }
          break;
        }

        const copiedDamage = sourceAbility?.effectValue ?? GameState.getEffectiveAttack(copied);
        const dmg = _outgoingDamage(ownerId, Math.max(1, copiedDamage || copied.baseAttack || 1));
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
              const damage = _outgoingDamage(ownerId, value);
              const hit = GameState.damageTarget?.({ type: 'character', id: loserId }, damage, { allowSafeguard: false })
                ?? _fallbackDamageTarget({ type: 'character', id: loserId }, damage);
              _applyStatusesToTarget({ type: 'character', id: loserId }, ability.statusApplied ?? [], { allowSafeguard: false });
              _showDamageHit(hit);
              showToast(`Duel: ${loser?.name ?? 'The loser'} takes ${hit.actualDamage} damage!`, 'combat');
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

  return { playCard, useAbility, use, executeActionEffect };
})();
