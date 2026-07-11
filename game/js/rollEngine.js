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

  function resolveDieEvent(playerId, roll) {
    const previousRequired = _storedRequired;
    const result = {
      roll,
      previousRequired,
      nextRequired: roll,
      playerDamage: 0,
      characterHits: [],
    };

    if (playerId && previousRequired !== null && roll < previousRequired) {
      const baseDamage = previousRequired - roll;
      const playerBefore = GameState.getPlayerState?.(playerId)?.hp ?? 0;
      const playerHp = GameState.damagePlayer(playerId, baseDamage);
      result.playerDamage = Math.max(0, playerBefore - Math.max(0, playerHp ?? playerBefore));

      if (_rules.dice?.roll5Bomb && previousRequired === 5) {
        const board = [...(GameState.getPlayerState?.(playerId)?.board ?? [])];
        board.forEach(char => {
          const before = char.currentHp ?? 0;
          const hp = GameState.damageCharacter(char.instanceId, baseDamage);
          const damage = Math.max(0, before - Math.max(0, hp ?? before));
          result.characterHits.push({ instanceId: char.instanceId, damage });
        });
      }
    }

    if (_rules.dice?.roll6ResetsRequired && roll === _rules.dice.sides) {
      result.nextRequired = null;
    }
    setRequired(result.nextRequired);
    return result;
  }

  function rollEvent(playerId, maxSides = null) {
    return resolveDieEvent(playerId, rollDie(maxSides));
  }

  // ── Mana Setting ──────────────────────────────────────────────────────────
  // Mana pool gains the roll value and carries over.
  function applyRollMana(roll) {
    GameState.gainMana(roll);
  }

  // ── Damage Application ────────────────────────────────────────────────────
  function applyRollDamage(roll, targetPlayerId) {
    const req = _storedRequired;
    if (req === null || roll >= req) return 0;
    const dmg = req - roll;
    const before = GameState.getPlayerState?.(targetPlayerId)?.hp ?? 0;
    const hp = GameState.damagePlayer(targetPlayerId, dmg);
    return Math.max(0, before - Math.max(0, hp ?? before));
  }

  // ── Duel Roll (used by DuelSystem) ────────────────────────────────────────
  function rollForDuel(playerId = null) {
    return rollEvent(playerId);
  }

  return {
    init,
    rollDie,
    rollTurnStart,
    setRequired,
    getRequired,
    resolveDieEvent,
    rollEvent,
    applyRollMana,
    applyRollDamage,
    rollForDuel,
  };
})();
