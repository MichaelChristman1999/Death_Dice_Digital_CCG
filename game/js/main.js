// â”€â”€â”€ main.js â€” boot, screen management, PixiBoard bridge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TOUCH_ENABLED = false;

const SCREENS = {
  MENU:  'screen-menu',
  GAME:  'screen-game',
  ADMIN: 'screen-admin',
  RULES: 'screen-rules',
};

// â”€â”€â”€ Boot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function boot() {
  const data = (typeof GAME_DATA_INLINE !== 'undefined') ? GAME_DATA_INLINE : null;
  if (!data) {
    try {
      const [h, a, s, r] = await Promise.all([
        fetchJSON('data/heroes.json'), fetchJSON('data/actions.json'),
        fetchJSON('data/statusEffects.json'), fetchJSON('data/gameRules.json'),
      ]);
      Object.assign(data ?? {}, { heroes: h, actions: a, statusEffects: s, rules: r });
    } catch(e) {
      showError('Could not load game data. Make sure data/gameData.js is present.');
      return;
    }
  }

  // Expose as global so phaseManager.js / rollEngine.js can reference GameData
  window.GameData = data;
  if (typeof SoundManager !== 'undefined') SoundManager.init?.();

  bindMenuButtons();
  showScreen(SCREENS.MENU);
}

async function fetchJSON(p) {
  const r = await fetch(p);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${p}`);
  return r.json();
}

// â”€â”€â”€ Screen management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function readSavedGame() {
  try {
    const raw = localStorage.getItem('gameState');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function isSavedGameFinished(saved) {
  if (!saved) return false;
  if (saved.currentPhase === 'ended' || saved.phaseStep === 'ended') return true;
  return Object.values(saved.players ?? {}).some(p => (p?.hp ?? 1) <= 0);
}

function hasResumableSavedGame() {
  const saved = readSavedGame();
  return !!saved && !isSavedGameFinished(saved);
}

function openNamePrompt() {
  document.getElementById('overlay-names')?.classList.remove('hidden');
  document.getElementById('input-name-p1')?.focus();
}

function hideGameOverlays() {
  PhaseManager?.pause?.();
  [
    'overlay-options',
    'overlay-exit-confirm',
    'overlay-save-choice',
    'overlay-adventure',
    'overlay-shop',
    'overlay-graveyard',
    'modal-card',
    'modal-discard',
    'modal-duel',
    'dice-overlay',
    'overlay-rolloff',
    'overlay-win',
  ].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  ActionUI?.closeCharPanel?.();
}

// â”€â”€â”€ Menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function bindMenuButtons() {
  // Play â†’ optional name entry â†’ start
  document.getElementById('btn-play')?.addEventListener('click', () => {
    AdventureMode?.reset?.();
    if (hasResumableSavedGame()) {
      document.getElementById('overlay-save-choice')?.classList.remove('hidden');
    } else {
      openNamePrompt();
    }
  });
  document.getElementById('btn-adventure')?.addEventListener('click', () => {
    AdventureMode?.openMenu?.();
  });
  document.getElementById('btn-adventure-start')?.addEventListener('click', () => {
    AdventureMode?.start?.();
  });
  document.querySelectorAll('[data-cpu-persona]').forEach(btn => {
    btn.addEventListener('click', () => AdventureMode?.start?.(btn.dataset.cpuPersona));
  });
  document.getElementById('btn-adventure-back')?.addEventListener('click', () => {
    AdventureMode?.closeMenu?.();
  });
  document.getElementById('btn-names-start')?.addEventListener('click', () => {
    document.getElementById('overlay-names')?.classList.add('hidden');
    startGame();
  });
  document.getElementById('btn-save-choice-continue')?.addEventListener('click', () => {
    AdventureMode?.reset?.();
    document.getElementById('overlay-save-choice')?.classList.add('hidden');
    startGame({ resume: true });
  });
  document.getElementById('btn-save-choice-new')?.addEventListener('click', () => {
    AdventureMode?.reset?.();
    document.getElementById('overlay-save-choice')?.classList.add('hidden');
    try { localStorage.removeItem('gameState'); } catch (_) {}
    openNamePrompt();
  });
  // Enter key in either name field also starts the game
  ['input-name-p1', 'input-name-p2'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-names-start')?.click();
    });
  });
  document.getElementById('input-adventure-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-adventure-start')?.click();
  });
  document.getElementById('btn-admin')?.addEventListener('click', promptAdmin);
  document.getElementById('btn-rules')?.addEventListener('click', () => {
    showRulesPage(0);
    showScreen(SCREENS.RULES);
  });
  document.getElementById('btn-rules-back')?.addEventListener('click', () => showScreen(SCREENS.MENU));
  document.getElementById('btn-rules-prev')?.addEventListener('click', () => showRulesPage((showRulesPage.current ?? 0) - 1));
  document.getElementById('btn-rules-next')?.addEventListener('click', () => showRulesPage((showRulesPage.current ?? 0) + 1));
}

function showRulesPage(index = 0) {
  const pages = [...document.querySelectorAll('.rules-page')];
  if (!pages.length) return;
  const next = Math.max(0, Math.min(index, pages.length - 1));
  showRulesPage.current = next;
  pages.forEach((page, i) => page.classList.toggle('hidden', i !== next));
  const label = document.getElementById('rules-page-label');
  if (label) label.textContent = `Page ${next + 1} / ${pages.length}`;
  const prev = document.getElementById('btn-rules-prev');
  const btnNext = document.getElementById('btn-rules-next');
  if (prev) prev.disabled = next === 0;
  if (btnNext) btnNext.disabled = next === pages.length - 1;
}

function promptAdmin() {
  const pw = prompt('Enter admin password:');
  if (pw === AdminPanel.PASSWORD) {
    const currentScreen = document.querySelector('.screen.active')?.id ?? SCREENS.MENU;
    AdminPanel.open(currentScreen);
    showScreen(SCREENS.ADMIN);
  }
  else if (pw !== null) alert('Incorrect password.');
}

// â”€â”€â”€ Start game â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function startGame(options = {}) {
  const data = window.GameData ?? GAME_DATA_INLINE;
  let resumeMode = !!options.resume;
  const adventureMode = !!options.adventure;

  GameState.init(data, { skipSave: resumeMode });
  if (resumeMode) {
    resumeMode = GameState.loadFromStorage();
    if (!resumeMode) GameState.init(data);
  }

  // Optional player names from the pre-game prompt
  if (!resumeMode && adventureMode) {
    AdventureMode?.configureGame?.(options.cpuPersonaId);
  } else if (!resumeMode) {
    const n1 = document.getElementById('input-name-p1')?.value;
    const n2 = document.getElementById('input-name-p2')?.value;
    if (n1) GameState.setPlayerLabel('p1', n1);
    if (n2) GameState.setPlayerLabel('p2', n2);
  }
  const l1 = document.getElementById('rolloff-name-p1');
  const l2 = document.getElementById('rolloff-name-p2');
  if (l1) l1.textContent = GameState.getPlayerLabel('p1');
  if (l2) l2.textContent = GameState.getPlayerLabel('p2');

  HandManager.init(data.rules, data.heroes, data.actions);
  ShopSystem.init(data.rules, data.heroes, data.actions);
  RollEngine.init(data.rules);
  StatusEngine.init(data.statusEffects);

  // Deal starting hands
  if (!resumeMode) {
    const sh = data.rules.startingHand?.hero   ?? 3;
    const sa = data.rules.startingHand?.action ?? 4;
    for (const pid of ['p1', 'p2']) {
      for (let i = 0; i < sh; i++) HandManager.drawHero(pid);
      for (let i = 0; i < sa; i++) HandManager.drawStartingAction?.(pid) ?? HandManager.drawAction(pid);
    }
  }

  // â”€â”€ CRITICAL: show screen FIRST so the pixi container has real dimensions â”€â”€
  showScreen(SCREENS.GAME);
  bindGameButtons();

  // Init synchronously â€” reading clientWidth forces layout, so dimensions are
  // valid immediately. (Was requestAnimationFrame, but rAF never fires in a
  // hidden/background tab, which left the game running with NO canvas at all.)
  {
    const container = document.getElementById('pixi-container');
    void container.clientWidth; // force layout
    PixiBoard.init(container, {
      onDeploy: ({ card, owner }) => {
        if (AdventureMode?.isCpuPlayer?.(owner)) return;
        if (!PhaseManager.canDeploy?.()) return showToast('Cannot deploy now', 'warn');
        if (GameState.getMana() < (card.manaCost ?? 0)) return showToast('Not enough mana', 'warn');
        const r = GameState.deployHero(owner, card.id);
        if (r?.ok) renderBoard();
        else showToast(r?.error ?? 'Deploy failed', 'warn');
      },
      onAttack: ({ char, owner, target }) => {
        if (AdventureMode?.isCpuPlayer?.(owner)) return;
        if (!target) return;
        if (target.type === 'char') {
          CombatEngine?.resolveDirectAttack?.(char.instanceId, 'character', target.char.instanceId);
        } else if (target.type === 'player') {
          CombatEngine?.resolveDirectAttack?.(char.instanceId, 'player', target.pid);
        }
      },
      // Action card clicked in hand â†’ full play flow (phase check, targeting, resolve)
      onActionPlay: ({ card, owner }) => {
        if (AdventureMode?.isCpuPlayer?.(owner)) return;
        AbilityDispatcher?.playCard?.(card, owner);
      },
      // Right-click a hand card â†’ discard it for its mana value
      onDiscardMana: ({ card, type, owner }) => {
        if (AdventureMode?.isCpuPlayer?.(owner)) return;
        if (!(PhaseManager?.canAct?.() ?? false)) {
          showToast('Discard after your turn starts.', 'warn');
          return;
        }
        const r = GameState?.discardForMana?.(owner, card.id, type);
        if (r?.ok) {
          showToast(`Discarded ${card.name} for ${r.refund} mana`, 'info');
          renderBoard();
        } else {
          showToast(r?.error ?? 'Cannot discard', 'warn');
        }
      },
      onDrawPile: ({ owner }) => {
        if (AdventureMode?.isCpuPlayer?.(owner)) return;
        handleDrawPile(owner);
      },
    });

    if (resumeMode) PhaseManager.resumeFromState?.();
    else PhaseManager.start();
    renderBoard();
    AdventureMode?.onGameStarted?.();
  }
}

// â”€â”€â”€ Game action buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function bindGameButtons() {
  if (bindGameButtons._done) return;
  bindGameButtons._done = true;

  document.getElementById('btn-roll')    ?.addEventListener('click', () => {
    if (AdventureMode?.isCpuTurn?.()) return;
    PhaseManager.handleRoll();
  });
  document.getElementById('btn-end-turn')?.addEventListener('click', () => {
    if (AdventureMode?.isCpuTurn?.()) return;
    PhaseManager.handleEndTurn();
    renderBoard();
  });
  document.getElementById('btn-shop')?.addEventListener('click', () => {
    if (AdventureMode?.isCpuTurn?.()) return;
    ShopSystem.open();
  });
  document.getElementById('btn-graveyard')?.addEventListener('click', () => {
    openGraveyardModal(GameState?.currentTurn ?? 'p1');
  });
  bindGraveyardModal();
  document.getElementById('btn-options')?.addEventListener('click', () => {
    document.getElementById('overlay-options')?.classList.remove('hidden');
  });
  document.getElementById('btn-options-resume')?.addEventListener('click', () => {
    document.getElementById('overlay-options')?.classList.add('hidden');
    document.getElementById('overlay-exit-confirm')?.classList.add('hidden');
  });
  document.getElementById('btn-options-save-exit')?.addEventListener('click', () => {
    hideGameOverlays();
    AdventureMode?.reset?.();
    showScreen(SCREENS.MENU);
  });
  document.getElementById('btn-options-exit-nosave')?.addEventListener('click', () => {
    document.getElementById('overlay-options')?.classList.add('hidden');
    document.getElementById('overlay-exit-confirm')?.classList.remove('hidden');
  });
  document.getElementById('btn-exit-confirm-no')?.addEventListener('click', () => {
    document.getElementById('overlay-exit-confirm')?.classList.add('hidden');
    document.getElementById('overlay-options')?.classList.remove('hidden');
  });
  document.getElementById('btn-exit-confirm-yes')?.addEventListener('click', () => {
    try { localStorage.removeItem('gameState'); } catch (_) {}
    hideGameOverlays();
    AdventureMode?.reset?.();
    showScreen(SCREENS.MENU);
  });

  document.getElementById('btn-rolloff-p1')?.addEventListener('click', () => PhaseManager.handleRolloffRoll('p1'));
  document.getElementById('btn-rolloff-p2')?.addEventListener('click', () => PhaseManager.handleRolloffRoll('p2'));

  document.getElementById('btn-win-menu')?.addEventListener('click', () => {
    document.getElementById('overlay-win')?.classList.add('hidden');
    AdventureMode?.reset?.();
    showScreen(SCREENS.MENU);
  });
  document.getElementById('btn-win-again')?.addEventListener('click', () => {
    document.getElementById('overlay-win')?.classList.add('hidden');
    try { localStorage.removeItem('gameState'); } catch (_) {}
    if (AdventureMode?.isActive?.()) AdventureMode.start();
    else startGame();
  });

  DiceAnimation.init();
}

// â”€â”€â”€ Render board â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ─── Match Piles ────────────────────────────────────────────────────────────
function handleDrawPile(owner = GameState.currentTurn) {
  if (!(PhaseManager?.canAct?.() ?? false)) {
    showToast('Draw after your turn starts.', 'warn');
    return;
  }
  const result = HandManager.drawFromPile?.(owner);
  if (result?.ok) {
    const costText = result.cost > 0 ? ` for ${result.cost} mana` : ' for free';
    showToast(`Draw Pile: drew ${result.card?.name ?? 'a card'}${costText}.`, 'info');
    HandManager.promptDiscardIfOverLimit?.(owner);
    renderBoard();
  } else {
    showToast(result?.error ?? 'Draw pile unavailable.', 'warn');
  }
}

const GRAVEYARD_PAGE_SIZE = 8;
const graveyardView = { playerId: 'p1', page: 0 };

function bindGraveyardModal() {
  if (bindGraveyardModal._done) return;
  bindGraveyardModal._done = true;

  document.getElementById('btn-graveyard-close')?.addEventListener('click', () => {
    document.getElementById('overlay-graveyard')?.classList.add('hidden');
  });
  document.getElementById('btn-graveyard-prev')?.addEventListener('click', () => {
    graveyardView.page = Math.max(0, graveyardView.page - 1);
    renderGraveyardModal();
  });
  document.getElementById('btn-graveyard-next')?.addEventListener('click', () => {
    graveyardView.page += 1;
    renderGraveyardModal();
  });
  document.querySelectorAll('[data-graveyard-player]').forEach(btn => {
    btn.addEventListener('click', () => {
      graveyardView.playerId = btn.dataset.graveyardPlayer;
      graveyardView.page = 0;
      renderGraveyardModal();
    });
  });
}

function openGraveyardModal(playerId = GameState.currentTurn) {
  graveyardView.playerId = playerId;
  graveyardView.page = 0;
  renderGraveyardModal();
  document.getElementById('overlay-graveyard')?.classList.remove('hidden');
}

function renderGraveyardModal() {
  const playerId = graveyardView.playerId;
  const cards = GameState.getHeroGraveyard?.(playerId) ?? [];
  const pages = Math.max(1, Math.ceil(cards.length / GRAVEYARD_PAGE_SIZE));
  graveyardView.page = Math.max(0, Math.min(graveyardView.page, pages - 1));
  const pageCards = cards.slice(
    graveyardView.page * GRAVEYARD_PAGE_SIZE,
    (graveyardView.page + 1) * GRAVEYARD_PAGE_SIZE
  );

  document.querySelectorAll('[data-graveyard-player]').forEach(btn => {
    const active = btn.dataset.graveyardPlayer === playerId;
    btn.classList.toggle('active', active);
    btn.textContent = GameState.getPlayerLabel?.(btn.dataset.graveyardPlayer) ?? btn.dataset.graveyardPlayer;
  });

  const subtitle = document.getElementById('graveyard-subtitle');
  if (subtitle) subtitle.textContent = `${GameState.getPlayerLabel?.(playerId) ?? playerId}: ${cards.length} fallen hero${cards.length === 1 ? '' : 'es'}`;

  const grid = document.getElementById('graveyard-grid');
  if (grid) {
    grid.innerHTML = '';
    if (!pageCards.length) {
      const empty = document.createElement('div');
      empty.className = 'graveyard-empty';
      empty.textContent = 'No fallen heroes yet';
      grid.appendChild(empty);
    } else {
      pageCards.forEach(card => grid.appendChild(_graveyardCard(card)));
    }
  }

  const label = document.getElementById('graveyard-page-label');
  if (label) label.textContent = `Page ${graveyardView.page + 1} / ${pages}`;
  const prev = document.getElementById('btn-graveyard-prev');
  const next = document.getElementById('btn-graveyard-next');
  if (prev) prev.disabled = graveyardView.page <= 0;
  if (next) next.disabled = graveyardView.page >= pages - 1;
}

function _graveyardCard(card) {
  const btn = document.createElement('button');
  btn.className = 'graveyard-card';
  btn.type = 'button';
  const art = card.imageAsset
    ? `<img src="assets/cards/DD Character V7/${card.imageAsset}" alt="${_escapeHtml(card.name ?? 'Hero')}">`
    : '<div class="no-art-shop">Hero</div>';
  btn.innerHTML = `${art}<span>${_escapeHtml(card.name ?? 'Hero')}</span>`;
  btn.addEventListener('click', () => expandCard(card, 'hero'));
  return btn;
}

function _escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderBoard() {
  ActionUI?.closeCharPanel?.(); // stale panel would show outdated state
  PixiBoard.render();
}

// â”€â”€â”€ Mana animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function animateManaGain(amount) {
  PixiBoard.animateManaGain(amount);
}

// â”€â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 400);
  }, 2800);
}

// â”€â”€â”€ Card detail (HTML modal over canvas) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function expandCard(card, type) {
  const modal   = document.getElementById('modal-card');
  const content = document.getElementById('modal-card-content');
  if (!modal || !content) return;

  if (type === 'hero') {
    const ip   = card.imageAsset ? `assets/cards/DD Character V7/${card.imageAsset}` : null;
    const name = card.name || card.imageAsset?.replace(/^DD_/,'').replace(/\.png$/i,'') || 'Hero';
    const passiveOnly = /^(Passive|Durability)$/i.test(card.roleType ?? '');
    const rawPassives = card.heroPassive ?? card.passives ?? [];
    const passiveRows = Array.isArray(rawPassives) ? [...rawPassives] : [rawPassives];
    const heroAbilityText = card.heroAbility ?? card.docAbility;
    if (passiveOnly && heroAbilityText && passiveRows.length === 0) {
      passiveRows.push({ name: 'Passive', description: heroAbilityText });
    }
    const docAbilityHtml = heroAbilityText && !passiveOnly ? `<div class="card-detail-section"><h3>Card Ability</h3>
            <div class="ability-desc">${heroAbilityText}</div>
          </div>` : '';
    const passiveHtml = passiveRows.length ? `<div class="card-detail-section"><h3>Passives</h3>
            ${passiveRows.map(p => `<div class="passive-row"><div class="passive-name">- ${p.name}</div><div class="passive-desc">${p.description}</div></div>`).join('')}
          </div>` : '';
    const rolePassiveHtml = _rolePassiveHtml(card);
    const statusGlossaryHtml = _statusGlossaryHtml(card);
    content.innerHTML = `
      <div class="card-detail-layout">
        <div class="card-detail-art">
          ${ip ? `<img src="${ip}" alt="${name}">` : '<div class="no-art">ðŸŽ´</div>'}
        </div>
        <div class="card-detail-info">
          <div class="card-detail-name">${name}</div>
          <div class="card-detail-meta">
            <span class="meta-badge mana">â—† ${card.manaCost ?? 0}</span>
            <span class="meta-badge hp">â™¥ ${card.hp ?? '?'}</span>
            <span class="meta-badge atk">âš” ${card.baseAttack ?? '?'}</span>
            ${card.stage  ? `<span class="meta-badge stage">${card.stage}</span>`  : ''}
            ${card.roleType ? `<span class="meta-badge stage">${card.roleType}</span>` : ''}
            ${card.archetype ? `<span class="meta-badge role">${card.archetype}</span>` : ''}
            ${card.role   ? `<span class="meta-badge role">${card.role}</span>`    : ''}
          </div>
          ${rolePassiveHtml}
          ${docAbilityHtml}
          ${passiveHtml}
          ${card.abilities?.length ? `<div class="card-detail-section"><h3>Abilities</h3>
            ${card.abilities.map(a => `<div class="ability-row">
              <div class="ability-row-header">
                <div class="ability-mana-cost">${a.manaCost}</div>
                <div class="ability-name">${a.abilityName}</div>
                <div class="ability-target">[${a.targetType}]</div>
              </div>
              <div class="ability-desc">${a.description ?? a.effect}${a.damageFormula ? ' Â· ' + a.damageFormula : ''}</div>
            </div>`).join('')}
          </div>` : ''}
          ${statusGlossaryHtml}
          ${card.flavorText ? `<div class="card-detail-section"><div class="flavor-text">"${card.flavorText}"</div></div>` : ''}
        </div>
      </div>`;
  } else {
    const aip = `assets/cards/Action Card Test Export/${card.imageAsset ?? 'Action_Card.jpg'}`;
    const statusGlossaryHtml = _statusGlossaryHtml(card);
    content.innerHTML = `
      <div class="card-detail-layout">
        <div class="card-detail-art action-art">
          <img src="${aip}" alt="${card.name}">
        </div>
        <div class="card-detail-info">
          <div class="card-detail-name">${card.name}</div>
          <div class="card-detail-meta">
            <span class="meta-badge mana">${card.manaCost === 0 ? 'Free' : 'â—† ' + card.manaCost}</span>
            <span class="meta-badge role">${card.type ?? ''}</span>
            <span class="meta-badge stage">${card.targetType ?? ''}</span>
          </div>
          <p style="color:var(--text-dim,#8888aa);line-height:1.75;margin-top:16px;">${card.description ?? ''}</p>
          ${statusGlossaryHtml}
        </div>
      </div>`;
  }

  document.getElementById('btn-modal-card-close')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  }, { once: true });

  modal.classList.remove('hidden');
}

function _statusGlossaryHtml(card) {
  const defs = GameData?.statusEffects ?? [];
  const source = [
    card?.description,
    card?.heroAbility,
    card?.docAbility,
    ...(card?.statusApplied ?? []),
    ...(card?.abilities ?? []).map(a => `${a.description ?? ''} ${(a.statusApplied ?? []).join(' ')}`),
    ...((Array.isArray(card?.heroPassive ?? card?.passives)
      ? (card?.heroPassive ?? card?.passives)
      : ((card?.heroPassive ?? card?.passives) ? [card?.heroPassive ?? card?.passives] : []))
      .map(p => `${p.name ?? ''} ${p.description ?? ''}`)),
  ].join(' ');
  const found = defs.filter(def => {
    const bare = (def.id ?? '').replace(/^status_/, '').replace(/_/g, ' ');
    return (card?.statusApplied ?? []).includes(def.id)
      || new RegExp(`\\b${def.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(source)
      || new RegExp(`\\b${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(source);
  });
  if (!found.length) return '';
  return `<div class="card-detail-section status-glossary"><h3>Status Effects</h3>
    ${found.map(def => `<button class="status-desc-row" type="button">
      <span>${def.name}</span><small>${def.description}</small>
    </button>`).join('')}
  </div>`;
}

function _rolePassiveHtml(cardOrRole) {
  const role = typeof cardOrRole === 'string' ? cardOrRole : cardOrRole?.roleType;
  const passive = typeof cardOrRole === 'object' ? cardOrRole?.rolePassive : null;
  const map = {
    Agility: ['Evasive Maneuver', 'Roll 4-6 to dodge captain/player damage.'],
    Balanced: ['Enact', 'Roll 4-6 after turn roll to draw an action.'],
    Durability: ['Safeguard', 'Captain redirects damage from allies and player.'],
    IQ: ['Foresight', 'Preview two future shop rows while captain.'],
    Legendary: ['Invocation', 'Roll 4-6 after turn roll to draw a hero.'],
    Mana: ['Enchant', 'Roll 4-6 to add 3 mana beyond cap.'],
    Passive: ['Imbue', 'Share passive pressure for three turns.'],
    Speed: ['Enhanced Reflex', 'Gain one extra action while captain.'],
    Strength: ['Crit-Hit Chance', 'Captain attacks can critically hit.'],
    Technique: ['Duelist', 'Captain gains stronger duel odds.'],
  };
  const row = passive ? [passive.name, passive.description] : map[role];
  if (!row?.[0]) return '';
  return `<div class="card-detail-section role-passive"><h3>Role Passive</h3>
    <div class="passive-row"><div class="passive-name">${row[0]}</div><div class="passive-desc">${row[1]}</div></div>
  </div>`;
}

// â”€â”€â”€ Error screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showError(msg) {
  document.body.innerHTML =
    `<div style="padding:2rem;color:#e85050;font-family:monospace;font-size:1rem;">${msg}</div>`;
}

// â”€â”€â”€ Global no-ops (referenced by old HTML inline handlers) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function handleBoardDrop() {}

// â”€â”€â”€ Touch stub â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function initTouchControls() { /* TOUCH_ENABLED = false */ }

// â”€â”€â”€ Boot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('DOMContentLoaded', boot);
