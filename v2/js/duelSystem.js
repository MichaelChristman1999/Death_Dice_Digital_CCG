// ─── Duel Sub-System ──────────────────────────────────────────────────────────
// Phase 1: Scaffold only. Full duel mechanics wired in Phase 2 when characters
// that use duels (Hip-Hop-Papa, Cutlass, Breast Knuckle, etc.) are added.

const DuelSystem = (() => {

  // Kick off a duel between two characters.
  // onResult(winnerId, loserId, p1Roll, p2Roll) is called with results.
  function start(char1InstanceId, char2InstanceId, onResult) {
    const modal = document.getElementById('modal-duel');
    if (!modal) {
      // Fallback: resolve immediately with random rolls
      _resolve(char1InstanceId, char2InstanceId, onResult, modal);
      return;
    }

    const c1 = GameState.getCharacter(char1InstanceId);
    const c2 = GameState.getCharacter(char2InstanceId);

    modal.querySelector('.duel-p1-name').textContent = c1?.name ?? 'Player 1';
    modal.querySelector('.duel-p2-name').textContent = c2?.name ?? 'Player 2';
    modal.querySelector('.duel-p1-roll').textContent = '?';
    modal.querySelector('.duel-p2-roll').textContent = '?';
    modal.querySelector('.duel-result').textContent  = '';

    modal.classList.remove('hidden');

    const rollBtn = modal.querySelector('#btn-duel-roll');
    rollBtn.disabled = false;
    rollBtn.onclick = () => {
      rollBtn.disabled = true;
      _resolve(char1InstanceId, char2InstanceId, onResult, modal);
    };
  }

  function _resolve(c1Id, c2Id, onResult, modal) {
    const roll1 = RollEngine.rollForDuel();
    const roll2 = RollEngine.rollForDuel();

    if (modal) {
      modal.querySelector('.duel-p1-roll').textContent = roll1;
      modal.querySelector('.duel-p2-roll').textContent = roll2;
    }

    let winnerId, loserId;
    if (roll1 > roll2)      { winnerId = c1Id; loserId = c2Id; }
    else if (roll2 > roll1) { winnerId = c2Id; loserId = c1Id; }
    else                    { winnerId = null;  loserId = null; } // tie

    const resultText = winnerId
      ? `${GameState.getCharacter(winnerId)?.name ?? winnerId} wins the duel!`
      : 'Tie — no effect.';

    if (modal) {
      modal.querySelector('.duel-result').textContent = resultText;
      const closeBtn = modal.querySelector('#btn-duel-close');
      if (closeBtn) {
        closeBtn.onclick = () => {
          modal.classList.add('hidden');
          onResult?.(winnerId, loserId, roll1, roll2);
        };
      }
    } else {
      showToast(resultText, 'combat');
      onResult?.(winnerId, loserId, roll1, roll2);
    }
  }

  return { start };
})();
