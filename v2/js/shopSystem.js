// ─── Card Shop System ─────────────────────────────────────────────────────────

const ShopSystem = (() => {
  let _rules   = {};
  let _heroes  = [];
  let _actions = [];

  function init(rules, heroes, actions) {
    _rules   = rules;
    _heroes  = heroes;
    _actions = actions;
  }

  function open() {
    if (!PhaseManager.canShop()) { showToast('Cannot shop right now.', 'warn'); return; }
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

  function _renderShop() {
    const heroCost   = _rules.shopCosts?.hero   ?? 2;
    const actionCost = _rules.shopCosts?.action ?? 1;
    const mana       = GameState.getMana();
    const playerId   = GameState.currentTurn;
    const p          = GameState.getPlayerState(playerId);

    const heroLimit   = _rules.handLimits?.hero   ?? 5;
    const actionLimit = _rules.handLimits?.action ?? 5;
    const heroFull    = p.hand.heroes.length  >= heroLimit;
    const actionFull  = p.hand.actions.length >= actionLimit;

    const shopHeroes  = _shuffle(_heroes).slice(0, 4);
    const shopActions = _shuffle(_actions).slice(0, 4);

    // Mana display in header
    const manaVal = document.getElementById('shop-mana-val');
    if (manaVal) manaVal.textContent = mana;

    // Hero grid
    const heroGrid = document.getElementById('shop-heroes');
    if (heroGrid) {
      heroGrid.innerHTML = '';
      shopHeroes.forEach(card => {
        heroGrid.appendChild(_buildShopItem(card, 'hero', heroCost, mana, heroFull, playerId));
      });
    }

    // Action grid
    const actionGrid = document.getElementById('shop-actions');
    if (actionGrid) {
      actionGrid.innerHTML = '';
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

  function _buildShopItem(card, type, cost, mana, handFull, playerId) {
    const el = document.createElement('div');
    el.className = 'shop-item';

    const purchaseLimit = _rules.shopLimits?.purchasesPerTurn ?? 1;
    const alreadyBought = GameState.getShopPurchasesThisTurn() >= purchaseLimit;
    const canAfford     = mana >= cost;
    const canBuy        = canAfford && !handFull && !alreadyBought;

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
      : alreadyBought              ? '1 purchase/turn'
      : !canAfford                 ? 'Not enough mana'
      : '';
    if (warnEl.textContent) body.appendChild(warnEl);

    const btn = document.createElement('button');
    btn.className = 'menu-btn primary';
    btn.textContent = 'Buy';
    btn.disabled = !canBuy;
    btn.addEventListener('click', () => _buy(card, type, cost, playerId));
    body.appendChild(btn);
    el.appendChild(body);

    return el;
  }

  function _buy(card, type, cost, playerId) {
    if (!GameState.spendMana(cost)) {
      showToast('Not enough mana.', 'warn');
      return;
    }

    const result = GameState.addCardToHand(playerId, card, type);
    if (!result.ok) {
      GameState.gainMana(cost); // refund
      showToast(result.error, 'warn');
      return;
    }

    GameState.recordShopPurchase();
    showToast(`Bought ${card.name}!`, 'info');
    HandManager.promptDiscardIfOverLimit(playerId);
    close();
    renderBoard();
  }

  return { init, open, close };
})();
