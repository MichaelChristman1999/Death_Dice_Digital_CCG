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
    'status_frozen', 'status_example_timed', 'status_example_permanent',
  ]);

  const _hasNegative = (char) => (char?.statuses ?? []).some(s => NEGATIVE_IDS.has(s.id));
  const _hasStatus = (char, statusId) => (char?.statuses ?? []).some(s => s.id === statusId);
  const _isAnemic = (char) => _hasStatus(char, 'status_anemic');
  const _isDamaged = (char) => !!char && char.currentHp < char.maxHp && !_isAnemic(char);
  const _healBlockReason = (char) => `${char?.name ?? 'That target'} is inflicted with Anemic and can't be healed.`;
  const _impairBlockReason = () => "Can't impair enemy hero as base attack is already min value.";
  const _playerIsDamaged = (pid) => {
    const p = GameState.getPlayerState(pid);
    const maxHp = GameData?.rules?.startingPlayerHP ?? 20;
    return !!p && p.hp < maxHp;
  };

  function _canReceiveStatus(char, statusId) {
    if (!statusId) return true;
    if (!char) return false;
    if (char._statusImmune && NEGATIVE_IDS.has(statusId)) return false;
    const ownerId = GameState.getCharacterOwner?.(char.instanceId);
    if (GameState.isPlayerImmuneToStatus?.(ownerId, statusId)) return false;
    if (statusId === 'status_impaired' && (char.baseAttack ?? 0) <= 1) return false;
    return !_hasStatus(char, statusId);
  }

  function _alreadyHasStatus(statusId) {
    return (char) => _canReceiveStatus(char, statusId);
  }

  function _cardTargetFilter(card) {
    if (card.effect === 'remove_status') return _hasNegative;
    if (card.effect === 'heal') return _isDamaged;
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
        if (valid.length === 0) { showToast('Exploit needs an enemy with a status effect on it.', 'warn'); return; }
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
      const limit = GameData?.rules?.handLimits?.action ?? 5;
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
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      return _hasNegative(t)
        ? { ok: true }
        : { ok: false, reason: `${card.name} needs a friendly character with a negative status.` };
    }

    if (card.effect === 'heal') {
      if (target?.type === 'player') {
        return _playerIsDamaged(target.id)
          ? { ok: true }
          : { ok: false, reason: `${GameState.getPlayerLabel(target.id)} is already at full HP.` };
      }
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      if (_isAnemic(t)) return { ok: false, reason: _healBlockReason(t) };
      return _isDamaged(t)
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
      GameState.damagePlayer(playerId, 3);
      GameState.gainMana(3);
      PixiBoard?.showHitEffect?.('player', playerId, 3);
      showToast('🩸 Blood Mana: sacrificed 3 HP for 3 mana!', 'combat');
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
      case 'cascade_damage': {
        const enemies = [...GameState.getPlayerState(oppId).board];
        enemies.forEach(c => {
          const dmg = GameState.previewCharacterDamage?.(c.instanceId, value) ?? value;
          GameState.damageCharacter(c.instanceId, value);
          PixiBoard?.showHitEffect?.('character', c.instanceId, dmg);
        });
        const playerDmg = GameState.previewPlayerDamage?.(oppId, value) ?? value;
        GameState.damagePlayer(oppId, value);
        PixiBoard?.showHitEffect?.('player', oppId, playerDmg);
        showToast(`${card.name}: ${value} damage to all enemy characters and ${playerDmg} to ${GameState.getPlayerLabel(oppId)}!`, 'combat');
        break;
      }

      case 'deal_damage': {
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
          const dmg = GameState.previewCharacterDamage?.(target.id, value) ?? value;
          GameState.damageCharacter(target.id, value);
          PixiBoard?.showHitEffect?.('character', target.id, dmg);
          showToast(`💥 ${card.name} hits ${t?.name ?? 'enemy'} for ${dmg}!`, 'combat');
        } else if (target?.type === 'player') {
          const dmg = GameState.previewPlayerDamage?.(target.id, value) ?? value;
          GameState.damagePlayer(target.id, value);
          PixiBoard?.showHitEffect?.('player', target.id, dmg);
          showToast(`💥 ${card.name} hits ${GameState.getPlayerLabel(target.id)} for ${dmg}!`, 'combat');
        }
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
          GameState.healCharacter(target.id, value);
          showToast(`💖 ${card.name} heals ${t?.name ?? 'ally'} for ${value}!`, 'info');
        } else if (target?.type === 'player') {
          GameState.healPlayer(target.id, value);
          showToast(`💖 ${card.name} heals ${GameState.getPlayerLabel(target.id)} for ${value} HP!`, 'info');
        }
        break;
      }

      case 'apply_status': {
        const sid = card.statusApplied?.[0];
        if (sid && target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          if (StatusEngine.apply(target.id, sid)) {
            showToast(`${_statusSym(sid)} ${t?.name ?? 'Target'} is now ${_statusName(sid)}!`, 'combat');
          }
        } else if (sid && target?.type === 'player') {
          if (GameState.applyPlayerStatus?.(target.id, sid)) {
            showToast(`${_statusSym(sid)} ${GameState.getPlayerLabel(target.id)} is now ${_statusName(sid)}!`, 'combat');
          }
        }
        break;
      }

      case 'remove_status': { // Cleanse — strip all negative statuses
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          const removed = StatusEngine.removeAllNegative(target.id);
          showToast(removed > 0
            ? `✨ Cleansed ${removed} status effect${removed > 1 ? 's' : ''} from ${t?.name}!`
            : `${t?.name} had nothing to cleanse — mana well spent?`, 'info');
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

      case 'control_character': { // Love Potion — charmed enemy turns on its owner
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          if (t && _canReceiveStatus(t, 'status_charmed')) {
            const dmg = GameState.getEffectiveAttack(t);
            StatusEngine.apply(target.id, 'status_charmed');
            GameState.damagePlayer(oppId, dmg);
            GameState.tapCharacter(target.id);
            PixiBoard?.showHitEffect?.('player', oppId, dmg);
            showToast(`💕 ${t.name} is charmed — and attacks its own player for ${dmg}!`, 'combat');
          }
        }
        break;
      }

      default:
        console.warn(`[AbilityDispatcher] Unknown card effect: ${card.effect}`);
        showToast(`${card.name} fizzles… (unknown effect)`, 'warn');
    }
  }

  // Cheese Potion chaos table — every result does something real
  function _cheesePotion(playerId, oppId) {
    const roll = RollEngine.rollDie();
    const enemies = GameState.getPlayerState(oppId).board;
    const randEnemy = enemies.length ? enemies[Math.floor(Math.random() * enemies.length)] : null;

    switch (roll) {
      case 1:
        if (randEnemy) {
          const playerDmg = GameState.previewPlayerDamage?.(oppId, 3) ?? 3;
          GameState.damagePlayer(oppId, 3);
          PixiBoard?.showHitEffect?.('player', oppId, playerDmg);
        }
        if (randEnemy) {
          GameState.damageCharacter(randEnemy.instanceId, 3);
          PixiBoard?.showHitEffect?.('character', randEnemy.instanceId, 3);
          showToast(`🧀 Rolled 1 — cheese shrapnel! ${randEnemy.name} takes 3 damage!`, 'combat');
        } else {
          GameState.damagePlayer(oppId, 3);
          PixiBoard?.showHitEffect?.('player', oppId, 3);
          showToast(`🧀 Rolled 1 — cheese shrapnel! ${GameState.getPlayerLabel(oppId)} takes 3!`, 'combat');
        }
        break;
      case 2:
        GameState.healPlayer(playerId, 3);
        showToast('🧀 Rolled 2 — nourishing gouda! You heal 3 HP.', 'info');
        break;
      case 3:
        GameState.gainMana(2);
        showToast('🧀 Rolled 3 — fermented power! +2 mana.', 'info');
        break;
      case 4:
        HandManager.drawAction(playerId);
        showToast('🧀 Rolled 4 — a card was hiding in the cheese! Drew 1.', 'info');
        break;
      case 5:
        if (randEnemy) {
          StatusEngine.apply(randEnemy.instanceId, 'status_poisoned');
          showToast(`🧀 Rolled 5 — moldy bits! ${randEnemy.name} is Poisoned ☠`, 'combat');
        } else {
          GameState.damagePlayer(oppId, 2);
          PixiBoard?.showHitEffect?.('player', oppId, 2);
          showToast(`🧀 Rolled 5 — moldy bits! ${GameState.getPlayerLabel(oppId)} takes 2!`, 'combat');
        }
        break;
      default: // 6
        {
          const selfDmg = GameState.previewPlayerDamage?.(playerId, 2) ?? 2;
          const selfHp = GameState.getPlayerState(playerId)?.hp ?? 0;
          if (selfHp <= selfDmg) {
            showToast('Cheese Potion/Fondue backfire would be lethal, so it fizzles instead.', 'warn');
            break;
          }
        }
        const selfDmg = GameState.previewPlayerDamage?.(playerId, 2) ?? 2;
        GameState.damagePlayer(playerId, 2);
        PixiBoard?.showHitEffect?.('player', playerId, selfDmg);
        showToast('🧀 Rolled 6 — it was WAY past its date. You take 2 damage. 🤢', 'warn');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHARACTER ABILITIES — full use flow
  // ══════════════════════════════════════════════════════════════════════════
  function _canResolveAbilityTarget(ability, ownerId, oppId, target) {
    if (ability.targetType === 'all_enemies') {
      const enemies = GameState.getPlayerState(oppId).board;
      const filter = _abilityTargetFilter(ability);
      const valid = filter ? enemies.filter(filter) : enemies;
      return valid.length > 0
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs at least one valid enemy character.` };
    }

    if (ability.targetType === 'all_allies' && ability.effect === 'heal') {
      const wounded = GameState.getPlayerState(ownerId).board.filter(_isDamaged);
      return wounded.length > 0
        ? { ok: true }
        : { ok: false, reason: 'No allies need healing.' };
    }

    if (ability.effect === 'draw_cards') {
      const p = GameState.getPlayerState(ownerId);
      const limit = GameData?.rules?.handLimits?.action ?? 5;
      return (p?.hand?.actions?.length ?? 0) < limit
        ? { ok: true }
        : { ok: false, reason: 'Your action hand is full.' };
    }

    if (ability.effect === 'gain_mana') return { ok: true };

    if (ability.effect === 'heal') {
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      if (_isAnemic(t)) return { ok: false, reason: _healBlockReason(t) };
      return _isDamaged(t)
        ? { ok: true }
        : { ok: false, reason: `${t?.name ?? 'That target'} is already at full HP.` };
    }

    if (ability.effect === 'deal_damage_apply_status') {
      if (ability.targetType === 'all_enemies') return { ok: true };
      return target?.type === 'character'
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs an enemy character.` };
    }

    if (ability.effect === 'apply_status') {
      if (ability.targetType === 'self') return { ok: true };
      const t = target?.type === 'character' ? GameState.getCharacter(target.id) : null;
      const statusId = ability.statusApplied?.[0];
      if (statusId === 'status_impaired' && t && (t.baseAttack ?? 0) <= 1) {
        return { ok: false, reason: _impairBlockReason() };
      }
      return t && _canReceiveStatus(t, statusId)
        ? { ok: true }
        : { ok: false, reason: `${ability.abilityName} needs a valid target that can receive that status.` };
    }

    if (ability.effect === 'apply_player_status') {
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
        if (ability.targetType === 'all_enemies') {
          const enemies = [...GameState.getPlayerState(oppId).board];
          enemies.forEach(enemy => {
            GameState.damageCharacter(enemy.instanceId, value);
            PixiBoard?.showHitEffect?.('character', enemy.instanceId, value);
          });
          showToast(`${char.name} uses ${ability.abilityName}: ${value} damage to all enemies!`, 'combat');
        } else if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          const dmg = GameState.previewCharacterDamage?.(target.id, value) ?? value;
          GameState.damageCharacter(target.id, value);
          PixiBoard?.showHitEffect?.('character', target.id, dmg);
          showToast(`⚡ ${char.name} uses ${ability.abilityName} — ${value} damage to ${t?.name}!`, 'combat');
        } else if (target?.type === 'player') {
          const dmg = GameState.previewPlayerDamage?.(target.id, value) ?? value;
          GameState.damagePlayer(target.id, value);
          PixiBoard?.showHitEffect?.('player', target.id, dmg);
          showToast(`⚡ ${char.name} uses ${ability.abilityName} — ${value} damage to ${GameState.getPlayerLabel(target.id)}!`, 'combat');
        }
        break;
      }

      case 'deal_damage_apply_status': {
        const sid = ability.statusApplied?.[0];
        if (ability.targetType === 'all_enemies') {
          const enemies = [...GameState.getPlayerState(oppId).board];
          enemies.forEach(enemy => {
            GameState.damageCharacter(enemy.instanceId, value);
            if (sid) StatusEngine.apply(enemy.instanceId, sid);
            PixiBoard?.showHitEffect?.('character', enemy.instanceId, value);
          });
          showToast(`${char.name} uses ${ability.abilityName}: ${value} damage${sid ? ` and ${_statusName(sid)}` : ''} to all enemies!`, 'combat');
        } else if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          GameState.damageCharacter(target.id, value);
          if (sid) StatusEngine.apply(target.id, sid);
          PixiBoard?.showHitEffect?.('character', target.id, value);
          showToast(`${char.name} uses ${ability.abilityName}: ${value} damage${sid ? ` and ${_statusName(sid)}` : ''} to ${t?.name}!`, 'combat');
        }
        break;
      }

      case 'heal': {
        if (ability.targetType === 'all_allies') {
          const allies = GameState.getPlayerState(ownerId).board.filter(_isDamaged);
          allies.forEach(c => GameState.healCharacter(c.instanceId, value));
          showToast(`💖 ${char.name} uses ${ability.abilityName} — all allies heal ${value} HP!`, 'info');
        } else if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          GameState.healCharacter(target.id, value);
          showToast(`💖 ${char.name} heals ${t?.name} for ${value} HP!`, 'info');
        }
        break;
      }

      case 'apply_status': {
        const sid = ability.statusApplied?.[0];
        if (sid && ability.targetType === 'all_enemies') {
          const enemies = [...GameState.getPlayerState(oppId).board].filter(_alreadyHasStatus(sid));
          enemies.forEach(enemy => StatusEngine.apply(enemy.instanceId, sid));
          showToast(`${_statusSym(sid)} ${char.name}: ${enemies.length} enemy character${enemies.length === 1 ? '' : 's'} now ${_statusName(sid)}!`, 'combat');
        } else if (sid && target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          StatusEngine.apply(target.id, sid);
          showToast(`${_statusSym(sid)} ${char.name}: ${t?.name} is now ${_statusName(sid)}!`, 'combat');
        }
        break;
      }

      case 'apply_player_status': {
        const sid = ability.statusApplied?.[0];
        if (sid && target?.type === 'player' && GameState.applyPlayerStatus?.(target.id, sid)) {
          showToast(`${_statusSym(sid)} ${GameState.getPlayerLabel(target.id)} is now ${_statusName(sid)}!`, 'combat');
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
        GameState.gainMana(n);
        showToast(`${char.name} uses ${ability.abilityName} — gained ${n} mana!`, 'info');
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
            StatusEngine.apply(copied.instanceId, sid);
            showToast(`${char.name} copies ${copied.name}'s ${sourceAbility.abilityName}: ${_statusName(sid)} applied back to ${copied.name}!`, 'combat');
          } else {
            const dmg = Math.max(1, GameState.getEffectiveAttack(copied));
            const actual = GameState.previewCharacterDamage?.(copied.instanceId, dmg) ?? dmg;
            GameState.damageCharacter(copied.instanceId, dmg);
            PixiBoard?.showHitEffect?.('character', copied.instanceId, actual);
            showToast(`${char.name} copies ${copied.name}'s passive pressure: ${copied.name} takes ${actual} damage!`, 'combat');
          }
          break;
        }

        const copiedDamage = sourceAbility?.effectValue ?? GameState.getEffectiveAttack(copied);
        const dmg = Math.max(1, copiedDamage || copied.baseAttack || 1);
        const actual = GameState.previewCharacterDamage?.(copied.instanceId, dmg) ?? dmg;
        GameState.damageCharacter(copied.instanceId, dmg);
        const sid = sourceAbility?.statusApplied?.[0];
        if (sid && _canReceiveStatus(copied, sid)) StatusEngine.apply(copied.instanceId, sid);
        PixiBoard?.showHitEffect?.('character', copied.instanceId, actual);
        showToast(`${char.name} copies ${copied.name}: ${copied.name} takes ${actual}${sid ? ` and ${_statusName(sid)}` : ''}!`, 'combat');
        break;
      }

      case 'duel': {
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          showToast(`⚔ ${char.name} challenges ${t?.name} to a duel!`, 'combat');
          DuelSystem.start(char.instanceId, target.id, (winnerId, loserId) => {
            if (loserId) {
              const loser = GameState.getCharacter(loserId);
              const dmg = GameState.previewCharacterDamage?.(loserId, value) ?? value;
              GameState.damageCharacter(loserId, value);
              const sid = ability.statusApplied?.[0];
              if (sid) StatusEngine.apply(loserId, sid);
              PixiBoard?.showHitEffect?.('character', loserId, dmg);
              showToast(`⚔ ${loser?.name ?? 'The loser'} takes ${dmg} duel damage!`, 'combat');
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
