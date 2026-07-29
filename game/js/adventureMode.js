const AdventureMode = (() => {
  const state = {
    active: false,
    humanPlayerId: 'p1',
    cpuPlayerId: 'p2',
    persona: null,
    selectedPersonaId: null,
    rolloffTimer: null,
    turnTimer: null,
  };

  function openMenu() {
    reset({ keepOverlay: true });
    _renderPersonaChoices();
    _setSelectedPersona(null);
    document.getElementById('overlay-adventure')?.classList.remove('hidden');
    document.getElementById('input-adventure-name')?.focus();
  }

  function closeMenu() {
    document.getElementById('overlay-adventure')?.classList.add('hidden');
  }

  function start(personaId = null) {
    const selectedId = personaId ?? state.selectedPersonaId;
    const persona = selectedId ? CpuPersonas.get(selectedId) : _randomPersona();
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
    state.selectedPersonaId = null;
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

  function _renderPersonaChoices() {
    const listEl = document.getElementById('adventure-persona-list');
    if (!listEl || listEl.dataset.rendered === 'true') return;

    const personas = CpuPersonas.all?.() ?? [];
    personas.forEach(persona => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'menu-btn secondary adventure-persona';
      btn.dataset.cpuPersona = persona.id;
      btn.setAttribute('aria-pressed', 'false');

      const difficulty = document.createElement('span');
      difficulty.textContent = persona.difficulty;
      const name = document.createElement('strong');
      name.textContent = persona.name;
      const description = document.createElement('small');
      description.textContent = persona.description;

      btn.append(difficulty, name, description);
      btn.addEventListener('click', () => _setSelectedPersona(persona.id));
      listEl.appendChild(btn);
    });
    listEl.dataset.rendered = 'true';
  }

  function _setSelectedPersona(personaId) {
    state.selectedPersonaId = personaId;
    document.querySelectorAll('[data-cpu-persona]').forEach(btn => {
      const selected = btn.dataset.cpuPersona === personaId;
      btn.classList.toggle('selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    const startBtn = document.getElementById('btn-adventure-start');
    if (startBtn) {
      const persona = personaId ? CpuPersonas.get(personaId) : null;
      startBtn.textContent = persona ? `Start vs ${persona.name}` : 'Start Random Game';
    }
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
