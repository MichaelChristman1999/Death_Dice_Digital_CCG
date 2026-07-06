// ─── Hand / Deck Manager ──────────────────────────────────────────────────────

const HandManager = (() => {
  let _rules = {};
  let _allHeroes  = [];
  let _allActions = [];

  function init(rules, heroes, actions) {
    _rules      = rules;
    _allHeroes  = heroes;
    _allActions = actions;
  }

  // ── Draw from "draw pile" (treated as the full card pool for now) ──────────
  // Phase 2: replace with a real shuffled deck per player.
  function drawHero(playerId) {
    const p     = GameState.getPlayerState(playerId);
    const limit = _rules.handLimits?.hero ?? 5;
    if (p.hand.heroes.length >= limit) return { ok: false, error: 'Hero hand full' };
    if (_allHeroes.length === 0) return { ok: false, error: 'No heroes available' };

    // Pick a random hero not already in hand or on board
    const inUse = new Set([
      ...p.hand.heroes.map(c => c.id),
      ...p.board.map(c => c.id),
    ]);
    const available = _allHeroes.filter(h => !inUse.has(h.id));
    if (available.length === 0) return { ok: false, error: 'No new heroes available' };

    const card = available[Math.floor(Math.random() * available.length)];
    return GameState.addCardToHand(playerId, card, 'hero');
  }

  function drawAction(playerId) {
    const p     = GameState.getPlayerState(playerId);
    const limit = _rules.handLimits?.action ?? 5;
    if (p.hand.actions.length >= limit) return { ok: false, error: 'Action hand full' };
    if (_allActions.length === 0) return { ok: false, error: 'No actions available' };

    const card = _allActions[Math.floor(Math.random() * _allActions.length)];
    return GameState.addCardToHand(playerId, card, 'action');
  }

  // ── Discard ────────────────────────────────────────────────────────────────
  function discard(playerId, cardId, type) {
    return GameState.discardForMana(playerId, cardId, type);
  }

  // ── Force Discard Prompt ──────────────────────────────────────────────────
  // Show a modal forcing the player to discard down to hand limit.
  function promptDiscardIfOverLimit(playerId) {
    const p      = GameState.getPlayerState(playerId);
    const limits = _rules.handLimits ?? { hero: 5, action: 5 };
    const heroOver   = p.hand.heroes.length  - limits.hero;
    const actionOver = p.hand.actions.length - limits.action;

    if (heroOver <= 0 && actionOver <= 0) return;

    const modal = document.getElementById('modal-discard');
    if (!modal) return;

    const list = modal.querySelector('.discard-list');
    list.innerHTML = '';

    const addOptions = (cards, type) => {
      cards.forEach(card => {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary discard-option';
        btn.textContent = `Discard: ${card.name} (${type})`;
        btn.addEventListener('click', () => {
          GameState.discardForMana(playerId, card.id, type);
          modal.classList.add('hidden');
          renderBoard();
        });
        list.appendChild(btn);
      });
    };

    if (heroOver > 0)   addOptions(p.hand.heroes,  'hero');
    if (actionOver > 0) addOptions(p.hand.actions, 'action');

    modal.classList.remove('hidden');
  }

  // ── Reveal Top N ──────────────────────────────────────────────────────────
  // Phase 2: In-Specter ability reveals top 5 of draw pile.
  function revealTopN(playerId, n) {
    const p = GameState.getPlayerState(playerId);
    return p.drawPile.slice(0, n);
  }

  // ── Card Lookup Helpers ───────────────────────────────────────────────────
  function getHeroById(id) { return _allHeroes.find(h => h.id === id) ?? null; }
  function getActionById(id) { return _allActions.find(a => a.id === id) ?? null; }

  return {
    init,
    drawHero,
    drawAction,
    discard,
    promptDiscardIfOverLimit,
    revealTopN,
    getHeroById,
    getActionById,
  };
})();
