// ─── Dice / Roll Phase Engine ─────────────────────────────────────────────────

const RollEngine = (() => {
  let _rules = null;
  let _pendingRoll = null;        // roll result waiting to be resolved
  let _onRollResolved = null;     // callback(rollResult)

  function init(rules) {
    _rules = rules;
  }

  // ── Roll ───────────────────────────────────────────────────────────────────
  function rollDie(maxSides = null) {
    const sides = Math.max(1, Math.min(maxSides ?? (_rules.dice?.sides ?? 6), _rules.dice?.sides ?? 6));
    return Math.floor(Math.random() * sides) + 1;
  }

  // Called at the start of each turn. Returns { roll, damage, newRequired }
  function rollTurnStart() {
    const roll = rollDie();
    const previousRequired = getPreviousRequired();

    let damage = 0;
    let newRequired = roll;

    if (previousRequired !== null && roll < previousRequired) {
      damage = previousRequired - roll;
    }

    // Roll of 6 resets next player's required roll to null (fresh start)
    if (_rules.dice?.roll6ResetsRequired && roll === _rules.dice.sides) {
      newRequired = null;
    }

    _pendingRoll = { roll, damage, previousRequired, newRequired };
    GameState.setLastRoll(roll);

    return { ..._pendingRoll };
  }

  // Returns the roll value the active player must meet or exceed to avoid damage.
  // Stored as last roll on the previous player's turn.
  function getPreviousRequired() {
    // We use the last stored roll from the opponent's perspective.
    // PhaseManager tracks whose roll was last and passes it here.
    return _storedRequired;
  }

  let _storedRequired = null;

  function setRequired(value) {
    _storedRequired = value;
  }

  function getRequired() { return _storedRequired; }

  // ── Mana Setting ──────────────────────────────────────────────────────────
  // Mana = roll value for the current turn.
  function applyRollMana(roll) {
    GameState.setMana(roll);
  }

  // ── Damage Application ────────────────────────────────────────────────────
  function applyRollDamage(roll, targetPlayerId) {
    const req = _storedRequired;
    if (req === null || roll >= req) return 0;
    const dmg = req - roll;
    GameState.damagePlayer(targetPlayerId, dmg);
    return dmg;
  }

  // ── Duel Roll (used by DuelSystem) ────────────────────────────────────────
  function rollForDuel() {
    return rollDie();
  }

  return {
    init,
    rollDie,
    rollTurnStart,
    setRequired,
    getRequired,
    applyRollMana,
    applyRollDamage,
    rollForDuel,
  };
})();
