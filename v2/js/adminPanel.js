// ─── Admin Panel ──────────────────────────────────────────────────────────────
// Phase 3: Full editor. Phase 1: live override + password gate.

const AdminPanel = (() => {
  const PASSWORD = 'admin1234'; // change before shipping

  function open() {
    _renderTabs();
    _activateTab('tab-override');
  }

  // ── Tab Navigation ────────────────────────────────────────────────────────
  function _renderTabs() {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
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

      <section>
        <h3>Player HP</h3>
        <div class="admin-row">
          <label>Player 1 HP: <input type="number" id="adm-p1-hp" min="0" max="999" value="20"></label>
          <button class="btn-secondary" onclick="AdminPanel._setHP('p1')">Set</button>
        </div>
        <div class="admin-row">
          <label>Player 2 HP: <input type="number" id="adm-p2-hp" min="0" max="999" value="20"></label>
          <button class="btn-secondary" onclick="AdminPanel._setHP('p2')">Set</button>
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
          <button class="btn-secondary" onclick="AdminPanel._setMana()">Set</button>
        </div>
      </section>

      <section>
        <h3>Draw Cards</h3>
        <div class="admin-row">
          <select id="adm-draw-player"><option value="p1">Player 1</option><option value="p2">Player 2</option></select>
          <select id="adm-draw-type"><option value="hero">Hero</option><option value="action">Action</option></select>
          <button class="btn-secondary" onclick="AdminPanel._drawCard()">Draw</button>
        </div>
      </section>

      <section>
        <h3>Phase</h3>
        <div class="admin-row">
          <button class="btn-secondary" onclick="AdminPanel._setPhase('etiquette')">→ Etiquette</button>
          <button class="btn-secondary" onclick="AdminPanel._setPhase('combat')">→ Combat</button>
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
      showScreen(SCREENS.GAME);
    });
  }

  // ── Override Actions ──────────────────────────────────────────────────────
  function _setHP(playerId) {
    const val = parseInt(document.getElementById(`adm-${playerId}-hp`).value, 10);
    if (isNaN(val)) return;
    GameState.getPlayerState(playerId).hp = val;
    renderBoard();
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
    const val = parseInt(document.getElementById('adm-mana').value, 10);
    if (isNaN(val)) return;
    GameState.setMana(val);
    renderBoard();
  }

  function _drawCard() {
    const pid  = document.getElementById('adm-draw-player').value;
    const type = document.getElementById('adm-draw-type').value;
    if (type === 'hero') HandManager.drawHero(pid);
    else HandManager.drawAction(pid);
    renderBoard();
  }

  function _setPhase(phase) {
    GameState.setPhase(phase);
    renderBoard();
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
