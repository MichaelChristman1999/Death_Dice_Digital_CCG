// ─── Card Shop System ─────────────────────────────────────────────────────────

const ShopSystem = (() => {
  let _rules   = {};
  let _heroes  = [];
  let _actions = [];
  let _offers  = { turnNumber: null, heroes: [], actions: [] };

  function init(rules, heroes, actions) {
    _rules   = rules;
    _heroes  = heroes;
    _actions = actions;
    _offers  = { turnNumber: null, heroes: [], actions: [] };
  }

  function open() {
    if (!PhaseManager.canShop()) { showToast('Cannot shop right now.', 'warn'); return; }
    if (GameState.hasPlayerStatus?.(GameState.currentTurn, 'status_locked_out')) {
      showToast('Shop closed.', 'warn');
      return;
    }
    const overlay = document.getElementById('overlay-shop');
    if (!overlay) return;
    _renderShop();
    overlay.classList.remove('hidden');
  }

  function close() {
    document.getElementById('overlay-shop')?.classList.add('hidden');
    document.getElementById('btn-shop-close')?.removeEventListener('click', close);
  }

  function _costBands(type) {
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

  function _weightedCostOffers(cards, type, count) {
    const pool = cards.slice();
    const picks = [];
    while (pool.length && picks.length < count) {
      const rows = _costBands(type)
        .map(band => ({
          band,
          cards: pool.filter(card => (card.manaCost ?? 0) >= band.min && (card.manaCost ?? 0) <= band.max),
        }))
        .filter(row => row.cards.length);

      if (!rows.length) {
        const fallback = type === 'action' ? _weightedActionPick(pool) : pool[Math.floor(Math.random() * pool.length)];
        picks.push(fallback);
        pool.splice(pool.findIndex(card => card.id === fallback.id), 1);
        continue;
      }

      const total = rows.reduce((sum, row) => sum + row.band.weight, 0);
      let roll = Math.random() * total;
      let pickedRow = rows[rows.length - 1];
      for (const row of rows) {
        roll -= row.band.weight;
        if (roll <= 0) { pickedRow = row; break; }
      }

      const picked = type === 'action'
        ? _weightedActionPick(pickedRow.cards)
        : pickedRow.cards[Math.floor(Math.random() * pickedRow.cards.length)];
      picks.push(picked);
      pool.splice(pool.findIndex(card => card.id === picked.id), 1);
    }
    return picks;
  }

  function _weightedActionPick(cards) {
    const weights = _rules.actionSpawnWeights ?? { common: 60, 'semi-common': 30, rare: 10 };
    const rows = cards.map(card => ({
      card,
      weight: Math.max(1, weights[card.rarity ?? 'semi-common'] ?? 10),
    }));
    const total = rows.reduce((sum, row) => sum + row.weight, 0);
    let roll = Math.random() * total;
    for (const row of rows) {
      roll -= row.weight;
      if (roll <= 0) return row.card;
    }
    return rows[rows.length - 1].card;
  }

  function _renderShop() {
    const heroCost   = _rules.shopCosts?.hero   ?? 2;
    const actionCost = _rules.shopCosts?.action ?? 1;
    const mana       = GameState.getMana();
    const playerId   = GameState.currentTurn;
    const p          = GameState.getPlayerState(playerId);

    const heroLimit   = _rules.handLimits?.hero   ?? 8;
    const actionLimit = _rules.handLimits?.action ?? 8;
    const heroFull    = p.hand.heroes.length  >= heroLimit;
    const actionFull  = p.hand.actions.length >= actionLimit;

    const foresight = GameState.hasIQCaptain?.(playerId) ?? false;
    const { heroes: shopHeroes, actions: shopActions } = _getOffersForTurn(foresight);

    // Mana display in header
    const manaVal = document.getElementById('shop-mana-val');
    if (manaVal) manaVal.textContent = mana;

    // Hero grid
    const heroGrid = document.getElementById('shop-heroes');
    if (heroGrid) {
      heroGrid.innerHTML = '';
      heroGrid.classList.toggle('foresight', foresight);
      shopHeroes.forEach(card => {
        heroGrid.appendChild(_buildShopItem(card, 'hero', heroCost, mana, heroFull, playerId));
      });
    }

    // Action grid
    const actionGrid = document.getElementById('shop-actions');
    if (actionGrid) {
      actionGrid.innerHTML = '';
      actionGrid.classList.toggle('foresight', foresight);
      shopActions.forEach(card => {
        actionGrid.appendChild(_buildShopItem(card, 'action', actionCost, mana, actionFull, playerId));
      });
    }

    // Wire close button
    const closeBtn = document.getElementById('btn-shop-close');
    if (closeBtn) {
      closeBtn.onclick = close;
    }
  }

  function _getOffersForTurn(foresight = false) {
    const turnNumber = GameState.getTurnNumber?.() ?? 1;
    const offerKey = `${turnNumber}:${foresight ? 'foresight' : 'normal'}`;
    if (_offers.turnNumber !== offerKey) {
      const heroIdsInUse = GameState.getAllHeroIdsInUse?.({ includeGraveyard: true }) ?? new Set();
      const count = foresight ? 12 : 4;
      const heroPool = _heroes.filter(h => !heroIdsInUse.has(h.id));
      _offers = {
        turnNumber: offerKey,
        heroes: _weightedCostOffers(heroPool, 'hero', count),
        actions: _weightedCostOffers(_actions, 'action', count),
      };
      if (foresight) showToast('Foresight shop open.', 'info');
    }
    return _offers;
  }

  function _buildShopItem(card, type, cost, mana, handFull, playerId) {
    const el = document.createElement('div');
    el.className = 'shop-item';

    const purchaseLimit = type === 'hero'
      ? (_rules.shopLimits?.heroPerTurn ?? 1)
      : (_rules.shopLimits?.actionPerTurn ?? 1);
    const alreadyBought = GameState.getShopPurchasesThisTurn(type) >= purchaseLimit;
    const p = GameState.getPlayerState(playerId);
    const duplicateAction = type === 'action'
      && (p.hand.actions?.filter(c => c.id === card.id).length ?? 0) >= 2;
    const duplicateHero = type === 'hero'
      && (GameState.getAllHeroIdsInUse?.({ includeGraveyard: true })?.has(card.id) ?? false);
    const canAfford     = mana >= cost;
    const needsActionDiscard = type === 'action' && handFull;
    const canBuy        = canAfford && !handFull && !alreadyBought && !duplicateAction && !duplicateHero;

    // ── Card preview art ───────────────────────────────────────────────────────
    const artDiv = document.createElement('div');
    artDiv.className = 'shop-item-art';
    if (type === 'hero' && card.imageAsset) {
      const img = document.createElement('img');
      img.src     = 'assets/cards/DD Character V7/' + card.imageAsset;
      img.alt     = card.name;
      img.loading = 'lazy';
      artDiv.appendChild(img);
    } else if (type === 'action' && card.imageAsset) {
      const img = document.createElement('img');
      img.src     = 'assets/cards/Action Card Test Export/' + card.imageAsset;
      img.alt     = card.name;
      img.loading = 'lazy';
      artDiv.appendChild(img);
    } else {
      artDiv.innerHTML = `<div class="no-art-shop">✦</div>`;
    }
    el.appendChild(artDiv);

    // ── Cost badge overlaid on art ─────────────────────────────────────────────
    const costBadge = document.createElement('div');
    costBadge.className = 'shop-cost-badge';
    costBadge.textContent = `${cost}◆`;
    el.appendChild(costBadge);

    // ── Stats row (heroes only) ────────────────────────────────────────────────
    if (type === 'hero') {
      const stats = document.createElement('div');
      stats.className = 'shop-item-stats';
      stats.innerHTML = `<span class="stat-hp">♥${card.hp ?? '?'}</span><span class="stat-atk">⚔${card.baseAttack ?? '?'}</span>`;
      el.appendChild(stats);
    }

    // ── Body ──────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'shop-item-body';

    const nameEl = document.createElement('div');
    nameEl.className = 'shop-item-name';
    nameEl.textContent = card.name;
    body.appendChild(nameEl);

    if (type === 'action' && card.description) {
      const desc = document.createElement('div');
      desc.className = 'shop-item-desc';
      desc.textContent = card.description.slice(0, 70) + (card.description.length > 70 ? '…' : '');
      body.appendChild(desc);
    }

    const warnEl = document.createElement('div');
    warnEl.className = 'shop-item-warn';
    warnEl.textContent = handFull ? 'Hand full'
      : alreadyBought              ? `1 ${type}/turn`
      : duplicateAction            ? '2 copies max'
      : duplicateHero              ? 'Hero already used'
      : !canAfford                 ? 'Not enough mana'
      : '';
    if (warnEl.textContent) body.appendChild(warnEl);

    const btn = document.createElement('button');
    btn.className = 'menu-btn primary';
    btn.textContent = needsActionDiscard ? 'Discard' : 'Buy';
    btn.disabled = !(canBuy || needsActionDiscard);
    btn.addEventListener('click', () => {
      if (needsActionDiscard) {
        HandManager.promptForcedActionDiscard?.(playerId);
        return;
      }
      _buy(card, type, cost, playerId);
    });
    body.appendChild(btn);
    el.appendChild(body);

    return el;
  }

  function _buy(card, type, cost, playerId) {
    const purchaseLimit = type === 'hero'
      ? (_rules.shopLimits?.heroPerTurn ?? 1)
      : (_rules.shopLimits?.actionPerTurn ?? 1);
    if (GameState.getShopPurchasesThisTurn(type) >= purchaseLimit) {
      showToast(`Already bought a ${type}.`, 'warn');
      return;
    }

    if (!GameState.spendMana(cost, playerId)) {
      showToast('Not enough mana.', 'warn');
      return;
    }

    const result = GameState.addCardToHand(playerId, card, type);
    if (!result.ok) {
      GameState.gainMana(cost, playerId); // refund
      showToast(result.error, 'warn');
      return;
    }

    GameState.recordShopPurchase(type);
    showToast(`Bought ${card.name}!`, 'info');
    HandManager.promptDiscardIfOverLimit(playerId);
    close();
    renderBoard();
  }

  function getOffersForCpu(playerId = GameState.currentTurn) {
    const foresight = GameState.hasIQCaptain?.(playerId) ?? false;
    return _getOffersForTurn(foresight);
  }

  function buyForCpu(playerId = GameState.currentTurn, type = 'action', scoreFn = null) {
    if (GameState.hasPlayerStatus?.(playerId, 'status_locked_out')) return { ok: false, error: 'Shop closed' };
    const cost = type === 'hero' ? (_rules.shopCosts?.hero ?? 2) : (_rules.shopCosts?.action ?? 1);
    const limit = type === 'hero' ? (_rules.shopLimits?.heroPerTurn ?? 1) : (_rules.shopLimits?.actionPerTurn ?? 1);
    if (GameState.getShopPurchasesThisTurn(type) >= limit) return { ok: false, error: 'Turn limit reached' };
    if (GameState.getMana(playerId) < cost) return { ok: false, error: 'Not enough mana' };

    const p = GameState.getPlayerState(playerId);
    const handLimit = _rules.handLimits?.[type] ?? 8;
    const hand = type === 'hero' ? p.hand.heroes : p.hand.actions;
    if (hand.length >= handLimit) return { ok: false, error: 'Hand full' };

    const offers = getOffersForCpu(playerId);
    const list = type === 'hero' ? offers.heroes : offers.actions;
    const usedHeroes = GameState.getAllHeroIdsInUse?.({ includeGraveyard: true }) ?? new Set();
    const candidates = list.filter(card => {
      if (type === 'hero') return !usedHeroes.has(card.id);
      return (p.hand.actions?.filter(c => c.id === card.id).length ?? 0) < 2;
    });
    if (!candidates.length) return { ok: false, error: 'No legal offers' };

    const pick = candidates
      .map(card => ({ card, score: Number(scoreFn?.(card, type) ?? 0) }))
      .sort((a, b) => b.score - a.score)[0]?.card;
    if (!pick) return { ok: false, error: 'No pick' };

    _buy(pick, type, cost, playerId);
    return { ok: true, card: pick };
  }

  return { init, open, close, getOffersForCpu, buyForCpu };
})();
