// ─── Effect Engine — action cards + character abilities ──────────────────────
// Fully implemented: every action card and every character ability resolves
// with real game effects, click-to-target selection, and clear feedback.
//
// Targets are explicit objects: { type: 'character'|'player', id } — never
// resolved via DOM queries (the board is a PixiJS canvas).

const AbilityDispatcher = (() => {

  const _statusName = (sid) => StatusEngine.getDef(sid)?.name ?? sid;
  const _statusSym  = (sid) => StatusEngine.getDef(sid)?.symbol ?? '';

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
      const r = GameState.commitPlayAction(ownerId, card.id);
      if (!r.ok) { showToast(r.error, 'warn'); return; }
      executeActionEffect(card, ownerId, target);
      renderBoard();
      PhaseManager.checkWin?.();
    };

    switch (card.targetType) {
      case 'single_enemy': {
        if (enemyChars.length === 0) {
          // Damage cards fall through to the enemy player; status cards need a body
          if (card.effect === 'deal_damage') {
            return _pickTarget(ownerId, 'enemy_any', null,
              `${card.name}: choose a target`, commit);
          }
          showToast('No enemy characters to target.', 'warn'); return;
        }
        return _pickTarget(ownerId, 'enemy_chars', null,
          `${card.name}: click an enemy character`, commit);
      }

      case 'single_enemy_with_status': {
        const valid = enemyChars.filter(c => (c.statuses?.length ?? 0) > 0);
        if (valid.length === 0) { showToast('Exploit needs an enemy with a status effect on it.', 'warn'); return; }
        return _pickTarget(ownerId, 'enemy_chars', (c) => (c.statuses?.length ?? 0) > 0,
          `${card.name}: click an enemy with a status effect`, commit);
      }

      case 'single_ally': {
        const allowSelfPlayer = card.effect === 'heal'; // e.g. Vitalize: "or yourself"
        if (allyChars.length === 0 && !allowSelfPlayer) {
          showToast('You have no characters on the board.', 'warn'); return;
        }
        return _pickTarget(ownerId, allowSelfPlayer ? 'ally_or_self' : 'ally_chars', null,
          `${card.name}: click a friendly ${allowSelfPlayer ? 'character (or your own HP icon)' : 'character'}`, commit);
      }

      // Everything else resolves immediately, no target click needed
      default:
        return commit(null);
    }
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

    switch (card.effect) {
      case 'deal_damage': {
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          GameState.damageCharacter(target.id, value);
          PixiBoard?.showHitEffect?.('character', target.id, value);
          showToast(`💥 ${card.name} hits ${t?.name ?? 'enemy'} for ${value}!`, 'combat');
        } else if (target?.type === 'player') {
          GameState.damagePlayer(target.id, value);
          PixiBoard?.showHitEffect?.('player', target.id, value);
          showToast(`💥 ${card.name} hits ${GameState.getPlayerLabel(target.id)} for ${value}!`, 'combat');
        }
        break;
      }

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
          StatusEngine.apply(target.id, sid);
          showToast(`${_statusSym(sid)} ${t?.name ?? 'Target'} is now ${_statusName(sid)}!`, 'combat');
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

      case 'cascade_damage': { // Bombs Away — AOE to all enemy characters
        const enemies = [...GameState.getPlayerState(oppId).board];
        if (enemies.length === 0) { showToast('💣 Bombs Away… but the enemy board is empty!', 'info'); break; }
        enemies.forEach(c => {
          GameState.damageCharacter(c.instanceId, value);
          PixiBoard?.showHitEffect?.('character', c.instanceId, value);
        });
        showToast(`💣 ${card.name}: ${value} damage to ALL ${enemies.length} enemy characters!`, 'combat');
        break;
      }

      case 'random_effect': { // Cheese Potion — d6 chaos table
        _cheesePotion(playerId, oppId);
        break;
      }

      case 'control_character': { // Love Potion — charmed enemy turns on its owner
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          if (t) {
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
        GameState.damagePlayer(playerId, 2);
        PixiBoard?.showHitEffect?.('player', playerId, 2);
        showToast('🧀 Rolled 6 — it was WAY past its date. You take 2 damage. 🤢', 'warn');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHARACTER ABILITIES — full use flow
  // ══════════════════════════════════════════════════════════════════════════
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
      case 'single_ally': {
        if (GameState.getPlayerState(ownerId).board.length === 0) { showToast('No friendly characters.', 'warn'); return; }
        return _pickTarget(ownerId, 'ally_chars', null, `${ability.abilityName}: click a friendly character`, confirm);
      }
      case 'single_enemy': {
        if (GameState.getPlayerState(oppId).board.length === 0) { showToast('No enemy characters to target.', 'warn'); return; }
        return _pickTarget(ownerId, 'enemy_chars', null, `${ability.abilityName}: click an enemy character`, confirm);
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
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          GameState.damageCharacter(target.id, value);
          PixiBoard?.showHitEffect?.('character', target.id, value);
          showToast(`⚡ ${char.name} uses ${ability.abilityName} — ${value} damage to ${t?.name}!`, 'combat');
        } else if (target?.type === 'player') {
          GameState.damagePlayer(target.id, value);
          PixiBoard?.showHitEffect?.('player', target.id, value);
          showToast(`⚡ ${char.name} uses ${ability.abilityName} — ${value} damage to ${GameState.getPlayerLabel(target.id)}!`, 'combat');
        }
        break;
      }

      case 'heal': {
        if (ability.targetType === 'all_allies') {
          const allies = GameState.getPlayerState(ownerId).board;
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
        if (sid && target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          StatusEngine.apply(target.id, sid);
          showToast(`${_statusSym(sid)} ${char.name}: ${t?.name} is now ${_statusName(sid)}!`, 'combat');
        }
        break;
      }

      case 'duel': {
        if (target?.type === 'character') {
          const t = GameState.getCharacter(target.id);
          showToast(`⚔ ${char.name} challenges ${t?.name} to a duel!`, 'combat');
          DuelSystem.start(char.instanceId, target.id, (winnerId, loserId) => {
            if (loserId) {
              const loser = GameState.getCharacter(loserId);
              GameState.damageCharacter(loserId, value);
              PixiBoard?.showHitEffect?.('character', loserId, value);
              showToast(`⚔ ${loser?.name ?? 'The loser'} takes ${value} duel damage!`, 'combat');
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
