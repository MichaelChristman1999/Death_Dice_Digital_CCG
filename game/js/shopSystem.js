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

  function _shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function _weightedActionOffers(count) {
    const weights = _rules.actionSpawnWeights ?? { common: 60, 'semi-common': 30, rare: 10 };
    const pool = _actions.slice();
    const picks = [];
    while (pool.length && picks.length < count) {
      const rows = pool.map(card => ({
        card,
        weight: Math.max(1, weights[card.rarity ?? 'semi-common'] ?? 10),
      }));
      const total = rows.reduce((sum, row) => sum + row.weight, 0);
      let roll = Math.random() * total;
      let picked = rows[rows.length - 1].card;
      for (const row of rows) {
        roll -= row.weight;
        if (roll <= 0) { picked = row.card; break; }
      }
      picks.push(picked);
      pool.splice(pool.findIndex(card => card.id === picked.id), 1);
    }
    return picks;
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
      _offers = {
        turnNumber: offerKey,
        heroes: _shuffle(_heroes.filter(h => !heroIdsInUse.has(h.id))).slice(0, count),
        actions: _weightedActionOffers(count),
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
