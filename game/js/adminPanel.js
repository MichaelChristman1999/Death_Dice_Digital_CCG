// ─── Admin Panel ──────────────────────────────────────────────────────────────
// Phase 3: Full editor. Phase 1: live override + password gate.

const AdminPanel = (() => {
  const PASSWORD = 'admin'; // temporary playtest password; change before shipping
  let _returnScreen = 'screen-menu';

  function open(returnScreen = 'screen-menu') {
    _returnScreen = returnScreen || 'screen-menu';
    _renderTabs();
    _activateTab('tab-override');
    _syncAvailability();
    _refreshLog();
  }

  // ── Tab Navigation ────────────────────────────────────────────────────────
  function _renderTabs() {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => _activateTab(btn.dataset.tab));
    });
    _buildOverridePanel();
  }

  function _activateTab(tabId) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');
  }

  // ── Live Override Panel ───────────────────────────────────────────────────
  function _buildOverridePanel() {
    const panel = document.getElementById('tab-override');
    if (!panel || panel.dataset.built) return;
    panel.dataset.built = '1';

    panel.innerHTML = `
      <h2>Live Game Override</h2>
      <p id="adm-live-warning" class="muted"></p>

      <section>
        <h3>Player HP</h3>
        <div class="admin-row">
          <label>Player 1 HP: <input type="number" id="adm-p1-hp" min="0" max="999" value="40"></label>
          <button class="btn-secondary" data-live-only="1" onclick="AdminPanel._setHP('p1')">Set</button>
        </div>
        <div class="admin-row">
          <label>Player 2 HP: <input type="number" id="adm-p2-hp" min="0" max="999" value="40"></label>
          <button class="btn-secondary" data-live-only="1" onclick="AdminPanel._setHP('p2')">Set</button>
        </div>
      </section>

      <section>
        <h3>Force Roll</h3>
        <div class="admin-row">
          <label>Force next roll to: <input type="number" id="adm-force-roll" min="1" max="6" value="1"></label>
          <button class="btn-secondary" onclick="AdminPanel._forceRoll()">Queue</button>
        </div>
      </section>

      <section>
        <h3>Mana</h3>
        <div class="admin-row">
          <label>Set current mana: <input type="number" id="adm-mana" min="0" max="99" value="3"></label>
          <button class="btn-secondary" data-live-only="1" onclick="AdminPanel._setMana()">Set</button>
        </div>
      </section>

      <section>
        <h3>Draw Cards</h3>
        <div class="admin-row">
          <select id="adm-draw-player"><option value="p1">Player 1</option><option value="p2">Player 2</option></select>
          <select id="adm-draw-type"><option value="hero">Hero</option><option value="action">Action</option></select>
          <button class="btn-secondary" data-live-only="1" onclick="AdminPanel._drawCard()">Draw</button>
        </div>
      </section>

      <section>
        <h3>Phase</h3>
        <div class="admin-row">
          <button class="btn-secondary" onclick="AdminPanel._setPhase('etiquette')">→ Order</button>
          <button class="btn-secondary" onclick="AdminPanel._setPhase('combat')">→ Chaos</button>
        </div>
      </section>

      <section>
        <h3>Game State Log</h3>
        <pre id="adm-state-log" style="max-height:200px;overflow:auto;background:#111;padding:8px;font-size:11px;"></pre>
        <button class="btn-secondary" onclick="AdminPanel._refreshLog()">Refresh</button>
      </section>

      <div class="admin-footer">
        <button class="btn-secondary" id="btn-admin-close">Close Admin</button>
      </div>
    `;

    document.getElementById('btn-admin-close').addEventListener('click', () => {
      showScreen(_returnScreen && _returnScreen !== SCREENS.ADMIN ? _returnScreen : SCREENS.MENU);
    });
    _syncAvailability();
  }

  // ── Override Actions ──────────────────────────────────────────────────────
  function _hasLiveGame() {
    if (typeof GameState === 'undefined') return false;
    const p1 = GameState.getPlayerState?.('p1');
    const p2 = GameState.getPlayerState?.('p2');
    return !!(p1?.hand && p2?.hand);
  }

  function _requireLiveGame(actionName) {
    if (_hasLiveGame()) return true;
    showToast(`${actionName} needs an active game. Start a game first.`, 'warn');
    _syncAvailability();
    return false;
  }

  function _syncAvailability() {
    const live = _hasLiveGame();
    document.querySelectorAll('#tab-override [data-live-only="1"], #tab-override button[onclick^="AdminPanel._setPhase"]').forEach(el => {
      el.disabled = !live;
    });

    const warning = document.getElementById('adm-live-warning');
    if (!warning) return;
    warning.textContent = live
      ? 'Live game detected. Overrides are enabled.'
      : 'No active game yet. Force Roll can be queued before starting; HP, mana, draw, and phase overrides unlock once a game is running.';
  }

  function _safeRenderBoard() {
    if (_hasLiveGame() && typeof renderBoard === 'function') {
      renderBoard();
    }
  }

  function _setHP(playerId) {
    if (!_requireLiveGame('HP override')) return;
    const val = parseInt(document.getElementById(`adm-${playerId}-hp`).value, 10);
    if (isNaN(val)) return;
    GameState.getPlayerState(playerId).hp = val;
    _safeRenderBoard();
    showToast(`${playerId} HP set to ${val}`, 'info');
  }

  let _forcedRoll = null;

  function _forceRoll() {
    const val = parseInt(document.getElementById('adm-force-roll').value, 10);
    if (isNaN(val)) return;
    _forcedRoll = val;
    showToast(`Next roll forced to ${val}`, 'info');
  }

  function consumeForcedRoll() {
    if (_forcedRoll === null) return null;
    const v = _forcedRoll;
    _forcedRoll = null;
    return v;
  }

  function _setMana() {
    if (!_requireLiveGame('Mana override')) return;
    const val = parseInt(document.getElementById('adm-mana').value, 10);
    if (isNaN(val)) return;
    GameState.setMana(val);
    _safeRenderBoard();
  }

  function _drawCard() {
    if (!_requireLiveGame('Draw card')) return;
    const pid  = document.getElementById('adm-draw-player').value;
    const type = document.getElementById('adm-draw-type').value;
    if (type === 'hero') HandManager.drawHero(pid);
    else HandManager.drawAction(pid);
    _safeRenderBoard();
  }

  function _setPhase(phase) {
    if (!_requireLiveGame('Phase override')) return;
    GameState.setPhase(phase);
    _safeRenderBoard();
    showToast(`Phase → ${phase}`, 'info');
  }

  function _refreshLog() {
    const raw = localStorage.getItem('gameState');
    document.getElementById('adm-state-log').textContent = raw
      ? JSON.stringify(JSON.parse(raw), null, 2)
      : '(no saved state)';
  }

  return {
    PASSWORD,
    open,
    _setHP,
    _forceRoll,
    consumeForcedRoll,
    _setMana,
    _drawCard,
    _setPhase,
    _refreshLog,
  };
})();
