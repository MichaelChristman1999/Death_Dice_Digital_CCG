// ─── Status Effect Engine ─────────────────────────────────────────────────────
// Phase 1: Core status infrastructure. Full effect routing wired in Phase 2.

const StatusEngine = (() => {
  let _defs = {};   // statusId → definition

  function init(statusEffects) {
    _defs = {};
    statusEffects.forEach(s => { _defs[s.id] = s; });
  }

  function getDef(statusId) { return _defs[statusId] ?? null; }

  // ── Apply ──────────────────────────────────────────────────────────────────
  function apply(instanceId, statusId) {
    return GameState.applyStatus(instanceId, statusId);
  }

  // ── Remove ─────────────────────────────────────────────────────────────────
  function remove(instanceId, statusId) {
    return GameState.removeStatus(instanceId, statusId);
  }

  function removeAll(instanceId) {
    const char = GameState.getCharacter(instanceId);
    if (!char) return;
    char.statuses.forEach(s => remove(instanceId, s.id));
  }

  // All debuff-type statuses — everything Cleanse should strip
  const NEGATIVE_IDS = [
    'status_poisoned', 'status_anemic', 'status_crippled', 'status_impaired',
    'status_impeded', 'status_drunk', 'status_charmed', 'status_edible',
    'status_frozen', 'status_rabies', 'status_locked_out', 'status_example_timed', 'status_example_permanent',
  ];

  function removeAllNegative(instanceId) {
    const char = GameState.getCharacter(instanceId);
    if (!char) return 0;
    const before = char.statuses.length;
    NEGATIVE_IDS.forEach(id => remove(instanceId, id));
    return before - char.statuses.length; // how many were removed
  }

  function has(instanceId, statusId) {
    return GameState.hasStatus(instanceId, statusId);
  }

  // ── Trigger Scan ──────────────────────────────────────────────────────────
  // Call this whenever a game event fires (on_attacked, on_attack, etc.)
  // Returns list of triggered effects that need resolution.
  function checkTriggers(eventType, context) {
    const results = [];
    GameState.getAllBoardCharacters().forEach(char => {
      char.statuses.forEach(status => {
        if (status.type === 'conditional' && status.trigger === eventType) {
          results.push({ char, status, context });
        }
      });
    });
    return results;
  }

  // ── Per-Turn Tick ─────────────────────────────────────────────────────────
  // Called by GameState.advanceTurn via tickStatuses on each character.
  // This stub is here to centralise any extra per-tick logic (e.g. timed damage).
  function tickTurnStart(instanceId) {
    const char = GameState.getCharacter(instanceId);
    if (!char) return;

    char.statuses.forEach(status => {
      if (status.type === 'timed') {
        // Example: Burning deals 1 damage per tick
        // Phase 2: route to effect library based on status definition
        if (status.id === 'status_example_timed') {
          GameState.damageCharacter(instanceId, 1);
        }
      }
    });
  }

  // ── Special Immunity Flags ────────────────────────────────────────────────
  // Phase 2: Characters like Mr. Immutable set _immune = true on their instance.
  function isImmune(instanceId) {
    const char = GameState.getCharacter(instanceId);
    return char?._statusImmune === true;
  }

  return {
    init,
    getDef,
    apply,
    remove,
    removeAll,
    removeAllNegative,
    has,
    checkTriggers,
    tickTurnStart,
    isImmune,
  };
})();
