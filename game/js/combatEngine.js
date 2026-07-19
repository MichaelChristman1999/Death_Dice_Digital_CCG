// ─── Combat Resolution Engine ─────────────────────────────────────────────────

const CombatEngine = (() => {
  // State for a pending attack declaration
  let _pending = {
    attackerId:  null,
    attackOwner: null,
    targetType:  null,  // 'player' | 'character'
    targetId:    null,  // playerId or instanceId
    blockerId:   null,
  };

  function _reset() {
    _pending = { attackerId: null, attackOwner: null, targetType: null, targetId: null, blockerId: null };
    _clearAttackHighlights();
  }

  // ── Step 1: Declare Attacker ───────────────────────────────────────────────
  function declareAttack(instanceId) {
    if (!PhaseManager.canAct()) return;
    if (GameState.currentPhase !== 'combat') {
      showToast('Attacks are not allowed during the Order Phase.', 'warn');
      return;
    }

    const char = GameState.getCharacter(instanceId);
    if (!char) return;
    if (GameState.getCharacterOwner(instanceId) !== GameState.currentTurn) {
      showToast('You can only attack with your own characters.', 'warn'); return;
    }
    const gate = GameState.canCharacterAttack?.(char) ?? { ok: true };
    if (!gate.ok) { showToast(gate.reason, 'warn'); return; }

    _pending.attackerId  = instanceId;
    _pending.attackOwner = GameState.currentTurn;
    _pending.blockerId   = null;
    _pending.targetType  = null;
    _pending.targetId    = null;

    _highlightAttacker(instanceId);
    _promptAttackTarget();
  }

  // ── Step 2: Choose Attack Target ──────────────────────────────────────────
  function _promptAttackTarget() {
    showToast('Choose a target: click an enemy character or the enemy player HP to attack directly.', 'info');
    _setAttackTargetMode(true);
  }

  function _setAttackTargetMode(on) {
    const opponentId = GameState.getOpponentId(_pending.attackOwner);
    const oppZone = document.getElementById(`zone-${opponentId}`);
    if (!oppZone) return;

    if (on) {
      // Enemy characters become clickable targets
      oppZone.querySelectorAll('.character-card').forEach(el => {
        el.classList.add('attack-target');
        el.addEventListener('click', _onTargetCharacterClick, { once: true });
      });
      // Enemy HP is a direct attack target
      const hpEl = oppZone.querySelector('.player-hp');
      if (hpEl) {
        hpEl.classList.add('attack-target');
        hpEl.addEventListener('click', _onTargetPlayerClick, { once: true });
      }
    } else {
      oppZone.querySelectorAll('.attack-target').forEach(el => el.classList.remove('attack-target'));
    }
  }

  function _onTargetCharacterClick(e) {
    const el = e.currentTarget;
    const instanceId = el.dataset.charId;
    _pending.targetType = 'character';
    _pending.targetId   = instanceId;
    _setAttackTargetMode(false);
    _promptBlock();
  }

  function _onTargetPlayerClick(e) {
    const opponentId = GameState.getOpponentId(_pending.attackOwner);
    _pending.targetType = 'player';
    _pending.targetId   = opponentId;
    _setAttackTargetMode(false);
    _promptBlock();
  }

  // ── Step 3: Defender Can Block ────────────────────────────────────────────
  function _promptBlock() {
    const defenderId = GameState.getOpponentId(_pending.attackOwner);
    const defState   = GameState.getPlayerState(defenderId);
    const untappedDefenders = defState.board.filter(c => !c.tapped);

    if (untappedDefenders.length === 0) {
      // No blockers available — resolve immediately
      resolveAttack();
      return;
    }

    showToast(`${GameState.getPlayerLabel(defenderId)}: click one of your characters to block, or click Resolve to let it through.`, 'info');
    _setBlockMode(true, defenderId);
  }

  function _setBlockMode(on, defenderId) {
    const defZone = document.getElementById(`zone-${defenderId}`);
    if (!defZone) return;

    const resolveBtn = document.getElementById('btn-resolve');
    if (on) {
      defZone.querySelectorAll('.character-card:not(.tapped)').forEach(el => {
        el.classList.add('block-target');
        el.addEventListener('click', _onBlockerClick, { once: true });
      });
      if (resolveBtn) {
        resolveBtn.classList.remove('hidden');
        resolveBtn.addEventListener('click', resolveAttack, { once: true });
      }
    } else {
      defZone.querySelectorAll('.block-target').forEach(el => el.classList.remove('block-target'));
      if (resolveBtn) resolveBtn.classList.add('hidden');
    }
  }

  function _resolveEdibleHeal(attacker, declaredTarget, hit) {
    if (!hit || hit.actualDamage <= 0) return;
    const actualTarget = { type: hit.type, id: hit.id };
    const wasEdible = GameState.targetHasStatus?.(declaredTarget, 'status_edible')
      || GameState.targetHasStatus?.(actualTarget, 'status_edible');
    if (!wasEdible) return;

    const lethal = hit.type === 'player'
      ? (hit.hp ?? GameState.getPlayerState?.(hit.id)?.hp ?? 1) <= 0
      : (hit.hp ?? GameState.getCharacter?.(hit.id)?.currentHp ?? 0) <= 0 || !GameState.getCharacter?.(hit.id);
    const healed = GameState.resolveEdibleLifesteal?.(attacker, hit.actualDamage, { lethal }) ?? 0;
    if (healed > 0) {
      const attackerName = attacker.type === 'player'
        ? GameState.getPlayerLabel(attacker.id)
        : GameState.getCharacter(attacker.id)?.name;
      showToast(`${attackerName ?? 'Attacker'} heals ${healed} from Edible.`, 'info');
    }
  }

  function _onBlockerClick(e) {
    const el = e.currentTarget;
    _pending.blockerId = el.dataset.charId;
    const defenderId = GameState.getOpponentId(_pending.attackOwner);
    _setBlockMode(false, defenderId);
    showToast(`${GameState.getCharacter(_pending.blockerId).name} is blocking!`, 'info');
    resolveAttack();
  }

  // ── Direct resolve (called by PixiBoard drag-drop — skips HTML targeting flow) ──
  function resolveDirectAttack(attackerId, targetType, targetId) {
    if (!PhaseManager.canAct()) return;
    if (GameState.currentPhase !== 'combat') {
      showToast('Attacks are not allowed during the Order Phase.', 'warn');
      return;
    }
    const attacker = GameState.getCharacter(attackerId);
    if (!attacker) return;
    if (GameState.getCharacterOwner(attackerId) !== GameState.currentTurn) {
      showToast('You can only attack with your own characters.', 'warn'); return;
    }
    const gate = GameState.canCharacterAttack?.(attacker) ?? { ok: true };
    if (!gate.ok) { showToast(gate.reason, 'warn'); return; }

    const ownerId = GameState.currentTurn;
    const oppId   = GameState.getOpponentId(ownerId);

    // Taunt: while an enemy taunter is up, ALL attacks must go at it
    const taunter = GameState.getPlayerState(oppId).board
      .find(c => c.statuses?.some(s => s.id === 'status_taunt'));
    if (taunter && !(targetType === 'character' && targetId === taunter.instanceId)) {
      showToast(`${taunter.name} is taunting — you must attack it!`, 'warn');
      return;
    }

    // Drunk: the attack goes at a RANDOM target instead of the declared one
    if (attacker.statuses?.some(s => s.id === 'status_drunk')) {
      const pool = [
        ...GameState.getPlayerState(oppId).board.map(c => ({ type: 'character', id: c.instanceId, name: c.name })),
        { type: 'player', id: oppId, name: GameState.getPlayerLabel(oppId) },
        ...GameState.getPlayerState(ownerId).board
          .filter(c => c.instanceId !== attackerId)
          .map(c => ({ type: 'character', id: c.instanceId, name: c.name })),
      ];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      showToast(`${attacker.name} is DRUNK and stumbles into ${pick.name}!`, 'combat');
      targetType = pick.type;
      targetId   = pick.id;
    }

    if (GameState.isCharmedActionBlocked?.(
      { type: 'character', id: attackerId },
      { type: targetType, id: targetId }
    )) {
      showToast(`${attacker.name} is Charmed and cannot target the charmer.`, 'warn');
      return;
    }

    _pending.attackerId  = attackerId;
    _pending.attackOwner = ownerId;
    _pending.targetType  = targetType;
    _pending.targetId    = targetId;
    _pending.blockerId   = null;
    resolveAttack();
  }

  // ── Step 4: Resolve ───────────────────────────────────────────────────────
  function resolveAttack() {
    const { attackerId, attackOwner, targetType, targetId, blockerId } = _pending;
    if (!attackerId) return;

    const attacker = GameState.getCharacter(attackerId);
    if (!attacker) { _reset(); return; }

    // Effective attack — includes Augmented (+2) / Anemic (−2) modifiers
    const baseAttackDamage = GameState.getEffectiveAttack?.(attacker) ?? attacker.baseAttack;
    const attackDamage = GameState.applyCaptainDamageBonus?.(attackOwner, baseAttackDamage) ?? baseAttackDamage;

    if (blockerId) {
      // ── Blocked ──────────────────────────────────────────────────────────
      const blocker = GameState.getCharacter(blockerId);
      if (blocker) {
        const blockDamage = GameState.getEffectiveAttack?.(blocker) ?? blocker.baseAttack;
        const blockerBefore = blocker.currentHp ?? 0;
        const attackerBefore = attacker.currentHp ?? 0;
        const blockerHp = GameState.damageCharacter(blockerId, attackDamage, {
          source: 'base_attack',
          attacker: { type: 'character', id: attackerId },
        });
        const attackerHp = GameState.damageCharacter(attackerId, blockDamage, {
          source: 'base_attack',
          attacker: { type: 'character', id: blockerId },
        });
        const blockerActual = Math.max(0, blockerBefore - Math.max(0, blockerHp ?? blockerBefore));
        const attackerActual = Math.max(0, attackerBefore - Math.max(0, attackerHp ?? attackerBefore));
        PixiBoard?.showHitEffect?.('character', blockerId,  blockerActual);
        PixiBoard?.showHitEffect?.('character', attackerId, attackerActual);
        showToast(
          `${attacker.name} attacks ${blocker.name}! ${blockerActual} vs ${attackerActual} damage.`,
          'combat'
        );
        _resolveEdibleHeal(
          { type: 'character', id: attackerId },
          { type: 'character', id: blockerId },
          { type: 'character', id: blockerId, actualDamage: blockerActual, hp: blockerHp }
        );
      }
    } else if (targetType === 'player') {
      // ── Unblocked direct attack ───────────────────────────────────────────
      const hit = GameState.damageTarget?.({ type: 'player', id: targetId }, attackDamage, {
        source: 'base_attack',
        attacker: { type: 'character', id: attackerId },
      })
        ?? { type: 'player', id: targetId, actualDamage: attackDamage, hp: GameState.damagePlayer(targetId, attackDamage, { splashCaptain: true }) };
      PixiBoard?.showHitEffect?.(hit.type, hit.id, hit.actualDamage);
      showToast(hit.safeguarded
        ? `${attacker.name} hits Safeguard.`
        : `${attacker.name} attacks ${GameState.getPlayerLabel(targetId)} for ${hit.actualDamage}! HP → ${hit.hp}`,
        'combat');
      _resolveEdibleHeal(
        { type: 'character', id: attackerId },
        { type: 'player', id: targetId },
        hit
      );
    } else if (targetType === 'character') {
      // ── Unblocked character attack ────────────────────────────────────────
      const target = GameState.getCharacter(targetId);
      if (target) {
        // Retort-style statuses reflect damage back at the attacker
        const retort = target.statuses?.find(s => s.trigger === 'on_attacked');
        const hit = GameState.damageTarget?.({ type: 'character', id: targetId }, attackDamage, {
          source: 'base_attack',
          attacker: { type: 'character', id: attackerId },
        })
          ?? { type: 'character', id: targetId, actualDamage: GameState.previewCharacterDamage?.(targetId, attackDamage) ?? attackDamage };
        PixiBoard?.showHitEffect?.(hit.type, hit.id, hit.actualDamage);
        showToast(hit.safeguarded
          ? `${attacker.name} hits Safeguard.`
          : `${attacker.name} attacks ${target.name} for ${hit.actualDamage}!`,
          'combat');
        _resolveEdibleHeal(
          { type: 'character', id: attackerId },
          { type: 'character', id: targetId },
          hit
        );
        if (retort) {
          const before = attacker.currentHp ?? 0;
          const hp = GameState.damageCharacter(attackerId, 2);
          const retortDamage = Math.max(0, before - Math.max(0, hp ?? before));
          PixiBoard?.showHitEffect?.('character', attackerId, retortDamage);
          showToast(`⚡ ${target.name}'s ${retort.name} strikes back for ${retortDamage}!`, 'combat');
        }
      }
    }

    GameState.spreadRabiesFromTarget?.(
      { type: 'character', id: attackerId },
      { requireVitalized: true, chance: 1 }
    );

    // Tap attacker and mark as attacked.
    GameState.tapCharacter(attackerId, { actionType: 'attack' });

    _reset();
    renderBoard();
    PhaseManager.checkWin?.();
  }

  function resolvePlayerBaseAttack(attackerPlayerId, target) {
    if (!target) {
      showToast('Player attack cancelled.', 'info');
      return;
    }

    if (GameState.isCharmedActionBlocked?.({ type: 'player', id: attackerPlayerId }, target)) {
      showToast(`${GameState.getPlayerLabel(attackerPlayerId)} is Charmed and cannot target the charmer.`, 'warn');
      return;
    }

    const check = GameState.commitPlayerBaseAttack?.(attackerPlayerId);
    if (!check?.ok) {
      showToast(check?.error ?? 'Player attack unavailable.', 'warn');
      return;
    }

    const baseDamage = check.damage ?? GameState.getPlayerBaseAttackDamage?.() ?? 4;
    const damage = GameState.applyCaptainDamageBonus?.(attackerPlayerId, baseDamage) ?? baseDamage;
    const hpBonusText = check.doubled
      ? ` ${check.hpTierLabel ?? 'HP range'} pressure doubles the hit.`
      : '';
    if (target?.type === 'character') {
      const targetChar = GameState.getCharacter(target.id);
      const hit = GameState.damageTarget?.(target, damage, {
        source: 'player_base_attack',
        attacker: { type: 'player', id: attackerPlayerId },
      })
        ?? { type: 'character', id: target.id, actualDamage: damage };
      PixiBoard?.showHitEffect?.(hit.type, hit.id, hit.actualDamage);
      showToast(hit.safeguarded
        ? `${GameState.getPlayerLabel(attackerPlayerId)} hits Safeguard.`
        : `${GameState.getPlayerLabel(attackerPlayerId)} attacks ${targetChar?.name ?? 'target'} for ${hit.actualDamage}.${hpBonusText}`,
        'combat');
      _resolveEdibleHeal(
        { type: 'player', id: attackerPlayerId },
        target,
        hit
      );
    } else if (target?.type === 'player') {
      const hit = GameState.damageTarget?.(target, damage, {
        source: 'player_base_attack',
        attacker: { type: 'player', id: attackerPlayerId },
      })
        ?? { type: 'player', id: target.id, actualDamage: damage, hp: GameState.damagePlayer(target.id, damage, { splashCaptain: true }) };
      PixiBoard?.showHitEffect?.(hit.type, hit.id, hit.actualDamage);
      showToast(hit.safeguarded
        ? `${GameState.getPlayerLabel(attackerPlayerId)} hits Safeguard.`
        : `${GameState.getPlayerLabel(attackerPlayerId)} attacks ${GameState.getPlayerLabel(target.id)} for ${hit.actualDamage}. HP → ${hit.hp}`,
        'combat');
      _resolveEdibleHeal(
        { type: 'player', id: attackerPlayerId },
        target,
        hit
      );
    }

    GameState.spreadRabiesFromTarget?.(
      { type: 'player', id: attackerPlayerId },
      { requireVitalized: true, chance: 1 }
    );

    renderBoard();
    PhaseManager.checkWin?.();
  }

  // ── Highlight Helpers ─────────────────────────────────────────────────────
  function _highlightAttacker(instanceId) {
    document.querySelectorAll('.character-card.attacking').forEach(el => el.classList.remove('attacking'));
    document.querySelector(`.character-card[data-char-id="${instanceId}"]`)?.classList.add('attacking');
  }

  function _clearAttackHighlights() {
    document.querySelectorAll('.attacking, .attack-target, .block-target').forEach(el => {
      el.classList.remove('attacking', 'attack-target', 'block-target');
    });
  }

  return {
    declareAttack,
    resolveAttack,
    resolveDirectAttack,
    resolvePlayerBaseAttack,
  };
})();
