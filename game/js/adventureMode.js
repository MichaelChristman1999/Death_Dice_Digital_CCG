const AdventureMode = (() => {
  const state = {
    active: false,
    humanPlayerId: 'p1',
    cpuPlayerId: 'p2',
    persona: null,
    rolloffTimer: null,
    turnTimer: null,
  };

  function openMenu() {
    reset({ keepOverlay: true });
    document.getElementById('overlay-adventure')?.classList.remove('hidden');
    document.getElementById('input-adventure-name')?.focus();
  }

  function closeMenu() {
    document.getElementById('overlay-adventure')?.classList.add('hidden');
  }

  function start(personaId = null) {
    const persona = personaId ? CpuPersonas.get(personaId) : _randomPersona();
    reset({ keepOverlay: true });
    state.active = true;
    state.persona = persona;
    closeMenu();
    try { localStorage.removeItem('gameState'); } catch (_) {}
    startGame({ adventure: true, cpuPersonaId: persona.id });
  }

  function configureGame(personaId) {
    const persona = CpuPersonas.get(personaId ?? state.persona?.id);
    state.active = true;
    state.persona = persona;

    const nameInput = document.getElementById('input-adventure-name')?.value?.trim()
      || document.getElementById('input-name-p1')?.value?.trim();
    GameState.setPlayerLabel(state.humanPlayerId, nameInput || 'You');
    GameState.setPlayerLabel(state.cpuPlayerId, persona.name);
    CpuController.configure({ playerId: state.cpuPlayerId, persona });
  }

  function reset(options = {}) {
    _clearTimers();
    CpuController?.cancel?.();
    state.active = false;
    state.persona = null;
    if (!options.keepOverlay) closeMenu();
  }

  function isActive() {
    return state.active;
  }

  function isCpuPlayer(playerId) {
    return state.active && playerId === state.cpuPlayerId;
  }

  function isHumanPlayer(playerId) {
    return state.active && playerId === state.humanPlayerId;
  }

  function isCpuTurn() {
    return state.active && GameState.currentTurn === state.cpuPlayerId;
  }

  function onGameStarted() {
    onRolloffUpdate();
    onPhaseStep();
  }

  function onRolloffShown() {
    onRolloffUpdate();
  }

  function onRolloffUpdate() {
    if (!state.active || !PhaseManager.isRolloff?.()) return;
    const rolls = GameState.getRolloffRolls?.() ?? {};
    if (rolls[state.cpuPlayerId] == null) {
      _scheduleRolloff();
    }
  }

  function onPhaseStep() {
    if (!state.active || !isCpuTurn()) return;
    if (PhaseManager.canRoll?.()) {
      _scheduleTurn(() => PhaseManager.handleRoll?.(), 720);
    } else if (PhaseManager.canAct?.()) {
      _scheduleTurn(() => CpuController.takeTurn?.(), 920);
    }
  }

  function onTurnReady() {
    if (!state.active || !isCpuTurn() || !PhaseManager.canAct?.()) return;
    _scheduleTurn(() => CpuController.takeTurn?.(), 760);
  }

  function _scheduleRolloff() {
    clearTimeout(state.rolloffTimer);
    state.rolloffTimer = setTimeout(() => {
      if (!state.active || !PhaseManager.isRolloff?.()) return;
      const rolls = GameState.getRolloffRolls?.() ?? {};
      if (rolls[state.cpuPlayerId] == null) {
        PhaseManager.handleRolloffRoll?.(state.cpuPlayerId);
      }
    }, 650);
  }

  function _scheduleTurn(fn, delay) {
    clearTimeout(state.turnTimer);
    state.turnTimer = setTimeout(() => {
      if (!state.active || !isCpuTurn()) return;
      fn();
    }, delay);
  }

  function _clearTimers() {
    clearTimeout(state.rolloffTimer);
    clearTimeout(state.turnTimer);
    state.rolloffTimer = null;
    state.turnTimer = null;
  }

  function _randomPersona() {
    const list = CpuPersonas.all?.() ?? [CpuPersonas.get('little_timmy')];
    return list[Math.floor(Math.random() * list.length)] ?? CpuPersonas.get('little_timmy');
  }

  return {
    openMenu,
    closeMenu,
    start,
    configureGame,
    reset,
    isActive,
    isCpuPlayer,
    isHumanPlayer,
    isCpuTurn,
    onGameStarted,
    onRolloffShown,
    onRolloffUpdate,
    onPhaseStep,
    onTurnReady,
  };
})();
