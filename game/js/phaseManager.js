// ─── Phase Manager ────────────────────────────────────────────────────────────
// Flow: Roll-Off → Etiquette (one round) → Combat (until winner)

const PhaseManager = (() => {
  const STEPS = {
    ROLLOFF:    'rolloff',    // pre-game: determine first player
    AWAIT_ROLL: 'await_roll', // start of a turn: waiting for dice
    MAIN:       'main',       // active turn: can deploy, attack, shop
    ENDED:      'ended',      // game over
  };

  let _step = STEPS.ROLLOFF;
  let _rolloffDone = { p1: false, p2: false };
  let _etiquetteRoundDone = { p1: false, p2: false };

  function _setStep(step) {
    _step = step;
    GameState.setPhaseStep?.(step);
  }

  // ── Start ──────────────────────────────────────────────────────────────────
  function start() {
    _setStep(STEPS.ROLLOFF);
    _rolloffDone = { p1: false, p2: false };
    _etiquetteRoundDone = { p1: false, p2: false };
    GameState.setPhase('rolloff');
    RollEngine.setRequired(null);
    _showRolloffOverlay();
    _updateUI();
  }

  function resumeFromState() {
    const savedStep = GameState.getPhaseStep?.() ?? STEPS.AWAIT_ROLL;
    const isKnownStep = Object.values(STEPS).includes(savedStep);
    _setStep(isKnownStep ? savedStep : STEPS.AWAIT_ROLL);

    const rolls = GameState.getRolloffRolls();
    _rolloffDone = { p1: rolls.p1 != null, p2: rolls.p2 != null };
    _etiquetteRoundDone = { p1: false, p2: false };

    if (_step === STEPS.ROLLOFF) {
      _showRolloffOverlay();
    } else {
      document.getElementById('overlay-rolloff')?.classList.add('hidden');
      _updateUI();
      if (_step === STEPS.AWAIT_ROLL) _startAutoRoll();
      if (_step === STEPS.ENDED) _checkWinCondition();
    }
  }

  // ── Roll-Off ───────────────────────────────────────────────────────────────
  function _showRolloffOverlay() {
    const overlay = document.getElementById('overlay-rolloff');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    _updateRolloffUI();
  }

  function handleRolloffRoll(playerId) {
    if (_step !== STEPS.ROLLOFF) return;
    if (_rolloffDone[playerId]) return;

    const roll = RollEngine.rollDie();
    GameState.setRolloffRoll(playerId, roll);
    _rolloffDone[playerId] = true;
    _updateRolloffUI();

    // Both players have rolled
    if (_rolloffDone.p1 && _rolloffDone.p2) {
      const rolls = GameState.getRolloffRolls();
      if (rolls.p1 === rolls.p2) {
        // Tie — reset and re-roll
        showToast('Tie! Roll again.', 'warn');
        setTimeout(() => {
          _rolloffDone = { p1: false, p2: false };
          GameState.setRolloffRoll('p1', null);
          GameState.setRolloffRoll('p2', null);
          _updateRolloffUI();
        }, 1200);
        return;
      }

      const winner = rolls.p1 >= rolls.p2 ? 'p1' : 'p2';
      GameState.setFirstPlayer(winner);

      const winnerLabel = GameState.getPlayerLabel(winner);
      _updateRolloffResult(`${winnerLabel} goes first!`);

      setTimeout(() => {
        document.getElementById('overlay-rolloff')?.classList.add('hidden');
        _beginEtiquette();
      }, 1800);
    }
  }

  function _updateRolloffUI() {
    const rolls = GameState.getRolloffRolls();
    const el = document.getElementById('overlay-rolloff');
    if (!el) return;

    const p1Roll = el.querySelector('#rolloff-p1-roll');
    const p2Roll = el.querySelector('#rolloff-p2-roll');
    const p1Btn  = el.querySelector('#btn-rolloff-p1');
    const p2Btn  = el.querySelector('#btn-rolloff-p2');

    if (p1Roll) p1Roll.textContent = rolls.p1 ?? '?';
    if (p2Roll) p2Roll.textContent = rolls.p2 ?? '?';
    if (p1Btn)  p1Btn.disabled = _rolloffDone.p1;
    if (p2Btn)  p2Btn.disabled = _rolloffDone.p2;
  }

  function _updateRolloffResult(msg) {
    const el = document.getElementById('rolloff-result');
    if (el) el.textContent = msg;
  }

  // ── Begin Etiquette ────────────────────────────────────────────────────────
  function _beginEtiquette() {
    GameState.setPhase('etiquette');
    _setStep(STEPS.AWAIT_ROLL);
    _etiquetteRoundDone = { p1: false, p2: false };
    showToast('Etiquette Phase begins. Deploy characters and use the shop.', 'phase');
    _updateUI();
    renderBoard();
    _startAutoRoll();
  }

  // ── Auto-roll countdown ─────────────────────────────────────────────────────
  // The roll isn't a decision — it just starts your turn. So it fires
  // automatically after a short countdown; the Roll button skips the wait.
  let _autoRollTimer = null;

  function _startAutoRoll() {
    _cancelAutoRoll();
    const name = GameState.getPlayerLabel(GameState.currentTurn);
    let n = 3;
    ActionUI?.showRollCountdown?.(name, n);
    _autoRollTimer = setInterval(() => {
      n--;
      if (n <= 0) {
        _cancelAutoRoll();
        handleRoll();
      } else {
        ActionUI?.showRollCountdown?.(name, n);
      }
    }, 1000);
  }

  function _cancelAutoRoll() {
    if (_autoRollTimer) { clearInterval(_autoRollTimer); _autoRollTimer = null; }
    ActionUI?.hideRollCountdown?.();
  }

  // ── Roll Handler (auto-fired by countdown, or Roll Now button) ─────────────
  function handleRoll() {
    if (_step !== STEPS.AWAIT_ROLL) return;
    _cancelAutoRoll();

    const activePlayer = GameState.currentTurn;
    const forced = AdminPanel.consumeForcedRoll?.();
    const drunkCap = GameState.hasPlayerStatus?.(activePlayer, 'status_drunk') ? 3 : null;
    const rawRoll  = forced ?? RollEngine.rollDie(drunkCap);
    const roll     = drunkCap ? Math.min(rawRoll, drunkCap) : rawRoll;

    GameState.setLastRoll(roll);

    const required = RollEngine.getRequired();
    let damage = 0;
    let bombDamage = 0;

    if (required !== null && roll < required) {
      const baseDamage = required - roll;
      const before = GameState.getPlayerState?.(activePlayer)?.hp ?? 0;
      const hit = GameState.damageTarget?.({ type: 'player', id: activePlayer }, baseDamage)
        ?? { hp: GameState.damagePlayer(activePlayer, baseDamage), actualDamage: 0 };
      damage = hit.actualDamage ?? Math.max(0, before - Math.max(0, hit.hp ?? before));
      if (GameData.rules.dice?.roll5Bomb && required === 5) {
        bombDamage = baseDamage;
        [...GameState.getPlayerState(activePlayer).board].forEach(char => {
          const beforeHp = char.currentHp ?? 0;
          const hpAfter = GameState.damageCharacter(char.instanceId, bombDamage);
          const actual = Math.max(0, beforeHp - Math.max(0, hpAfter ?? beforeHp));
          PixiBoard?.showHitEffect?.('character', char.instanceId, actual);
        });
      }
    }

    // Mana pool carries over, capped by rules. Mana captains can Enchant beyond cap.
    const rollManaGained = GameState.gainMana(roll, activePlayer);
    const roleResults = _resolveCaptainRollPassives(activePlayer);
    const enchantMana = roleResults.enchantMana;
    const manaGained = rollManaGained + enchantMana;

    const nextRequired = (GameData.rules.dice?.roll6ResetsRequired && roll === GameData.rules.dice.sides)
      ? null : roll;
    RollEngine.setRequired(nextRequired);

    _setStep(STEPS.MAIN);

    // Structured info → dice overlay renders a punchy result readout
    const info = { name: GameState.getPlayerLabel(activePlayer).toUpperCase(), roll, mana: manaGained, damage };

    DiceAnimation.roll(roll, info, () => {
      if (bombDamage) showToast('Bomb hits your field!', 'combat');
      roleResults.messages.forEach(msg => showToast(msg, 'info'));
      animateManaGain(manaGained);
      _updateUI();
      renderBoard();
      _checkWinCondition();
    });
  }

  function _resolveCaptainRollPassives(playerId) {
    const messages = [];
    let enchantMana = 0;

    if (GameState.hasManaCaptain?.(playerId)) {
      const r = RollEngine.rollDie();
      if (r >= 4) {
        enchantMana = GameState.gainMana(3, playerId, { source: 'mana_enchant' });
        messages.push(`Enchant +${enchantMana} mana.`);
      } else {
        messages.push('Enchant failed.');
      }
    }

    if (GameState.hasCaptainClass?.(playerId, 'Balanced')) {
      const r = RollEngine.rollDie();
      if (r >= 4) {
        const drawn = HandManager.drawAction(playerId);
        if (drawn.ok && drawn.card) drawn.card._freeCast = true;
        messages.push(drawn.ok ? 'Enact drew action.' : 'Enact no room.');
      } else {
        messages.push('Enact missed.');
      }
    }

    if (GameState.hasCaptainClass?.(playerId, 'Legendary')) {
      const r = RollEngine.rollDie();
      if (r >= 4) {
        const drawn = HandManager.drawHero(playerId);
        if (drawn.ok && drawn.card) drawn.card._freeCast = true;
        messages.push(drawn.ok ? 'Invocation drew hero.' : 'Invocation no room.');
      } else {
        messages.push('Invocation missed.');
      }
    }

    return { enchantMana, messages };
  }

  // ── End Turn ───────────────────────────────────────────────────────────────
  function handleEndTurn() {
    if (_step !== STEPS.MAIN) return;

    const currentPlayer = GameState.currentTurn;

    if (GameState.currentPhase === 'etiquette') {
      _etiquetteRoundDone[currentPlayer] = true;
      if (_etiquetteRoundDone.p1 && _etiquetteRoundDone.p2) {
        GameState.setPhase('combat');
        showToast('Combat Phase begins!', 'phase');
      }
    }

    GameState.advanceTurn();
    _setStep(STEPS.AWAIT_ROLL);
    _updateUI();
    renderBoard();
    _startAutoRoll();

    // Report status ticks (poison damage, deaths) that fired on turn change
    const ticks = GameState.consumeTickEvents?.() ?? [];
    ticks.forEach((ev, i) => {
      setTimeout(() => {
        showToast(
          ev.died
            ? `${ev.symbol ?? ''} ${ev.charName} succumbed to ${ev.statusName}!`
            : `${ev.symbol ?? ''} ${ev.charName} takes ${ev.damage} ${ev.statusName} damage`,
          'combat'
        );
        if (!ev.died) PixiBoard?.showHitEffect?.('character', ev.instanceId, ev.damage);
      }, 400 + i * 500);
    });
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  function canRoll()    { return _step === STEPS.AWAIT_ROLL; }
  function canEndTurn() { return _step === STEPS.MAIN; }
  function canAct()     { return _step === STEPS.MAIN; }
  function isRolloff()  { return _step === STEPS.ROLLOFF; }

  function canUseAbilities() {
    return canAct() && GameState.currentPhase === 'combat';
  }

  function canPlayPaidActionCards() {
    return canAct() && GameState.currentPhase === 'combat';
  }

  function canPlayFreeActionCards() {
    // Free action cards can be played any time (including opponent's turn),
    // but not during roll-off
    return _step !== STEPS.ROLLOFF && _step !== STEPS.ENDED;
  }

  function canAttack() {
    return canAct() && GameState.currentPhase === 'combat';
  }

  function canShop() {
    return canAct();
  }

  function canDeploy() {
    return canAct();
  }

  function pause() {
    _cancelAutoRoll();
    _updateUI();
  }

  // ── Win Condition ─────────────────────────────────────────────────────────
  // Public: call after ANY damage source (combat, abilities, cards, poison)
  function checkWin() { return _checkWinCondition(); }

  function _checkWinCondition() {
    for (const pid of ['p1', 'p2']) {
      if (GameState.getPlayerState(pid).hp <= 0) {
        const winner = GameState.getOpponentId(pid);
        _cancelAutoRoll(); // no countdown over the victory screen
        _showWinScreen(GameState.getPlayerLabel(winner));
        _setStep(STEPS.ENDED);
        return true;
      }
    }
    return false;
  }

  function _showWinScreen(winnerLabel) {
    const el = document.getElementById('overlay-win');
    if (el) {
      const msg = el.querySelector('.win-message');
      if (msg) msg.textContent = `${winnerLabel} wins!`;
      el.classList.remove('hidden');
    }
  }

  // ── UI Helpers ────────────────────────────────────────────────────────────
  function _updateUI() {
    const rollBtn = document.getElementById('btn-roll');
    const endBtn  = document.getElementById('btn-end-turn');
    const shopBtn = document.getElementById('btn-shop');
    if (rollBtn) rollBtn.disabled = !canRoll();
    if (endBtn)  endBtn.disabled  = !canEndTurn();
    if (shopBtn) shopBtn.disabled = !canShop();
  }

  return {
    start,
    resumeFromState,
    handleRoll,
    handleEndTurn,
    handleRolloffRoll,
    checkWin,
    pause,
    canRoll,
    canEndTurn,
    canAct,
    canAttack,
    canShop,
    canDeploy,
    canUseAbilities,
    canPlayPaidActionCards,
    canPlayFreeActionCards,
    isRolloff,
  };
})();

// ─── Toast Helper ─────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}
