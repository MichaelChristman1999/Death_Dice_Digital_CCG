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
    const limit = _rules.handLimits?.hero ?? 8;
    if (p.hand.heroes.length >= limit) return { ok: false, error: 'Hero hand full' };
    if (_allHeroes.length === 0) return { ok: false, error: 'No heroes available' };

    // Pick a random hero not already used anywhere.
    const inUse = GameState.getAllHeroIdsInUse?.({ includeGraveyard: true }) ?? new Set();
    const available = _allHeroes.filter(h => !inUse.has(h.id));
    if (available.length === 0) return { ok: false, error: 'No new heroes available' };

    const card = _pickWeightedByManaCost(available, 'hero');
    return GameState.addCardToHand(playerId, card, 'hero');
  }

  function drawAction(playerId, options = {}) {
    const p     = GameState.getPlayerState(playerId);
    const limit = _rules.handLimits?.action ?? 8;
    if (p.hand.actions.length >= limit) {
      promptForcedActionDiscard(playerId);
      return { ok: false, error: 'Discard an action first' };
    }
    if (_allActions.length === 0) return { ok: false, error: 'No actions available' };

    let available = _allActions.filter(card =>
      p.hand.actions.filter(c => c.id === card.id).length < 2
    );
    if (options.startingHand) {
      const duplicateChance = options.duplicateChance ?? _rules.startingHand?.duplicateActionChance ?? 0.3;
      if (Math.random() >= duplicateChance) {
        const uniqueOnly = available.filter(card => !p.hand.actions.some(c => c.id === card.id));
        if (uniqueOnly.length) available = uniqueOnly;
      }
    }
    if (available.length === 0) return { ok: false, error: 'No action copies available' };

    const card = _pickWeightedByManaCost(available, 'action');
    return GameState.addCardToHand(playerId, card, 'action');
  }

  function drawStartingAction(playerId) {
    return drawAction(playerId, {
      startingHand: true,
      duplicateChance: _rules.startingHand?.duplicateActionChance ?? 0.3,
    });
  }

  function drawFromPile(playerId) {
    const check = GameState.canDrawFromPile?.(playerId);
    if (!check?.ok) return check ?? { ok: false, error: 'Draw pile unavailable' };

    const choice = _pickDrawPileCard(playerId);
    if (!choice) return { ok: false, error: 'No drawable cards fit your hand' };

    const paid = GameState.commitDrawFromPile?.(playerId);
    if (!paid?.ok) return paid ?? { ok: false, error: 'Draw pile unavailable' };

    const added = GameState.addCardToHand(playerId, choice.card, choice.type);
    if (!added.ok) return added;

    return { ok: true, card: added.card, type: choice.type, cost: paid.cost };
  }

  function _pickDrawPileCard(playerId) {
    const p = GameState.getPlayerState(playerId);
    const heroFull = (p.hand.heroes?.length ?? 0) >= (_rules.handLimits?.hero ?? 8);
    const actionFull = (p.hand.actions?.length ?? 0) >= (_rules.handLimits?.action ?? 8);
    const usedHeroes = GameState.getAllHeroIdsInUse?.({ includeGraveyard: true }) ?? new Set();
    const availableHeroes = heroFull
      ? []
      : _allHeroes.filter(h => !usedHeroes.has(h.id));
    const availableActions = actionFull
      ? []
      : _allActions.filter(card =>
          card.id !== 'action_junk'
          && !/^action_junk/.test(card.id ?? '')
          && p.hand.actions.filter(c => c.id === card.id).length < 2
        );

    const lowActions = availableActions
      .filter(card => (card.manaCost ?? 0) >= 0 && (card.manaCost ?? 0) <= 2)
      .map(card => ({ type: 'action', card }));
    const midCards = [
      ...availableHeroes
        .filter(card => (card.manaCost ?? 0) >= 2 && (card.manaCost ?? 0) <= 4)
        .map(card => ({ type: 'hero', card })),
      ...availableActions
        .filter(card => (card.manaCost ?? 0) >= 3 && (card.manaCost ?? 0) <= 4)
        .map(card => ({ type: 'action', card })),
    ];
    const rareCards = [
      ...availableHeroes
        .filter(card => (card.manaCost ?? 0) >= 5 && (card.manaCost ?? 0) <= 7)
        .map(card => ({ type: 'hero', card })),
    ];
    if (!actionFull) rareCards.push({ type: 'action', card: _makeJunkCard() });

    const rows = [
      { weight: 60, cards: lowActions },
      { weight: 30, cards: midCards },
      { weight: 10, cards: rareCards },
    ].filter(row => row.cards.length);
    if (!rows.length) return null;

    const total = rows.reduce((sum, row) => sum + row.weight, 0);
    let roll = Math.random() * total;
    let pickedRow = rows[rows.length - 1];
    for (const row of rows) {
      roll -= row.weight;
      if (roll <= 0) { pickedRow = row; break; }
    }
    return pickedRow.cards[Math.floor(Math.random() * pickedRow.cards.length)];
  }

  function _makeJunkCard() {
    return {
      id: `action_junk_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      _baseId: 'action_junk',
      name: 'Junk',
      imageAsset: 'Junk.png',
      manaCost: 0,
      type: 'free',
      effect: 'junk_damage',
      effectValue: 2,
      rarity: 'junk',
      stackable: true,
      targetType: 'enemy_any',
      statusApplied: [],
      description: 'Free clutter. Deal 1-2 random damage to an enemy target.',
    };
  }

  function _getCostBands(type) {
    const profile = GameState.getCardPoolProfile?.() ?? { phase: 'order', round: 0 };
    if (profile.phase !== 'chaos') {
      return type === 'hero'
        ? [{ min: 2, max: 3, weight: 1 }]
        : [{ min: 0, max: 2, weight: 1 }];
    }

    const round = profile.round ?? 1;
    if (type === 'action') {
      return round <= 3
        ? [{ min: 0, max: 2, weight: 80 }, { min: 3, max: 4, weight: 20 }]
        : [{ min: 0, max: 2, weight: 50 }, { min: 3, max: 4, weight: 50 }];
    }

    if (round <= 3) return [{ min: 2, max: 3, weight: 80 }, { min: 4, max: 5, weight: 20 }];
    if (round <= 6) return [{ min: 2, max: 3, weight: 60 }, { min: 4, max: 5, weight: 40 }];
    if (round <= 9) return [{ min: 2, max: 3, weight: 50 }, { min: 4, max: 5, weight: 40 }, { min: 6, max: 7, weight: 10 }];
    return [{ min: 2, max: 3, weight: 40 }, { min: 4, max: 5, weight: 40 }, { min: 6, max: 7, weight: 20 }];
  }

  function _pickWeightedByManaCost(cards, type) {
    const bands = _getCostBands(type);
    const rows = bands
      .map(band => ({
        band,
        cards: cards.filter(card => (card.manaCost ?? 0) >= band.min && (card.manaCost ?? 0) <= band.max),
      }))
      .filter(row => row.cards.length);

    if (!rows.length) {
      return type === 'action'
        ? _pickWeightedAction(cards)
        : cards[Math.floor(Math.random() * cards.length)];
    }

    const total = rows.reduce((sum, row) => sum + row.band.weight, 0);
    let roll = Math.random() * total;
    let pickedRow = rows[rows.length - 1];
    for (const row of rows) {
      roll -= row.band.weight;
      if (roll <= 0) { pickedRow = row; break; }
    }

    return type === 'action'
      ? _pickWeightedAction(pickedRow.cards)
      : pickedRow.cards[Math.floor(Math.random() * pickedRow.cards.length)];
  }

  function _pickWeightedAction(cards) {
    const weights = _rules.actionSpawnWeights ?? { common: 60, 'semi-common': 30, rare: 10 };
    const weighted = cards.map(card => ({
      card,
      weight: Math.max(1, weights[card.rarity ?? 'semi-common'] ?? 10),
    }));
    const total = weighted.reduce((sum, row) => sum + row.weight, 0);
    let roll = Math.random() * total;
    for (const row of weighted) {
      roll -= row.weight;
      if (roll <= 0) return row.card;
    }
    return weighted[weighted.length - 1].card;
  }

  // ── Discard ────────────────────────────────────────────────────────────────
  function discard(playerId, cardId, type) {
    return GameState.discardForMana(playerId, cardId, type);
  }

  // ── Force Discard Prompt ──────────────────────────────────────────────────
  // Show a modal forcing the player to discard down to hand limit.
  function promptDiscardIfOverLimit(playerId) {
    const p      = GameState.getPlayerState(playerId);
    const limits = _rules.handLimits ?? { hero: 8, action: 8 };
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

  function promptForcedActionDiscard(playerId) {
    const p = GameState.getPlayerState(playerId);
    const limit = _rules.handLimits?.action ?? 8;
    if ((p?.hand?.actions?.length ?? 0) < limit) return false;

    const modal = document.getElementById('modal-discard');
    if (!modal) return false;

    const list = modal.querySelector('.discard-list');
    list.innerHTML = '';
    p.hand.actions.forEach(card => {
      const btn = document.createElement('button');
      btn.className = 'btn-secondary discard-option';
      btn.textContent = `Discard action: ${card.name}`;
      btn.addEventListener('click', () => {
        const result = GameState.forceDiscardFromHand?.(playerId, card.id, 'action');
        showToast(result?.ok ? 'Action discarded.' : 'Discard failed.', result?.ok ? 'info' : 'warn');
        modal.classList.add('hidden');
        renderBoard();
      });
      list.appendChild(btn);
    });
    modal.classList.remove('hidden');
    showToast('Discard action first.', 'warn');
    return true;
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
    drawStartingAction,
    drawFromPile,
    discard,
    promptDiscardIfOverLimit,
    promptForcedActionDiscard,
    revealTopN,
    getHeroById,
    getActionById,
  };
})();
