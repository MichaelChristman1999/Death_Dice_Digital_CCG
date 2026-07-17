// ─── Dice Animation System ────────────────────────────────────────────────────
// All dice display is handled by the PixiBoard in-canvas HUD.
// No HTML overlay — the persistent panel in the canvas IS the dice display.

const DiceAnimation = (() => {

  function roll(result, label, onDone) {
    if (typeof SoundManager !== 'undefined') SoundManager.play?.('diceRoll');
    // PixiBoard.showDiceRoll handles the in-canvas flash + calls onDone when done
    if (typeof PixiBoard !== 'undefined' && PixiBoard.showDiceRoll) {
      PixiBoard.showDiceRoll(result, label, onDone);
    } else {
      setTimeout(() => { onDone?.(); }, 900);
    }
  }

  function init() {}
  return { roll, init };
})();
