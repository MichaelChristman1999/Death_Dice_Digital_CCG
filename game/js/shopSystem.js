// ─── Card Shop System ─────────────────────────────────────────────────────────

const ShopSystem = (() => {
  let _rules   = {};
  let _heroes  = [];
  let _actions = [];
  let _offers  = { turnNumber: null, heroes: [], actions: [] };
  let _activePage = 'hero';

  const SHOP_PROFILES = {
    order: {
      label: 'Order',
      hero: [{ min: 1, max: 3, weight: 1 }],
      action: [{ min: 0, max: 2, weight: 1 }],
    },
    robust: {
      label: 'Robust',
      hero: [{ min: 1, max: 3, weight: 60 }, { min: 4, max: 5, weight: 40 }],
      action: [{ min: 0, max: 2, weight: 60 }, { min: 3, max: 4, weight: 40 }],
    },
    vulnerable: {
      label: 'Vulnerable',
      hero: [{ min: 1, max: 3, weight: 50 }, { min: 4, max: 5, weight: 50 }],
      action: [{ min: 0, max: 2, weight: 50 }, { min: 3, max: 4, weight: 50 }],
    },
    critical: {
      label: 'Critical',
      hero: [{ min: 1, max: 3, weight: 40 }, { min: 4, max: 5, weight: 40 }, { min: 6, max: 7, weight: 10 }],
      action: [{ min: 0, max: 2, weight: 40 }, { min: 3, max: 4, weight: 40 }],
    },
    near_death: {
      label: 'Near-Death',
      hero: [{ min: 1, max: 3, weight: 30 }, { min: 4, max: 5, weight: 40 }, { min: 6, max: 7, weight: 30 }],
      action: [{ min: 0, max: 2, weight: 30 }, { min: 3, max: 4, weight: 40 }],
    },
  };
  const PROFILE_BY_RANK = ['order', 'robust', 'vulnerable', 'critical', 'near_death'];
  const HP_RANK = { robust: 1, vulnerable: 2, critical: 3, near_death: 4 };

  function init(rules, heroes, actions) {
    _rules   = rules;
    _heroes  = heroes;
    _actions = actions;
    _offers  = { turnNumber: null, heroes: [], actions: [] };
    _activePage = 'hero';
  }

  function open() {
    if (!PhaseManager.canShop()) { showToast('Cannot shop right now.', 'warn'); return; }
    if (GameState.hasAbstainedThisTurn?.(GameState.currentTurn)) {
      showToast('Abstaining locks the shop this turn.', 'warn');
      return;
    }
    if (GameState.hasPlayerOrCaptainStatus?.(GameState.currentTurn, 'status_locked_out')) {
      showToast('Shop closed.', 'warn');
      return;
    }
    const overlay = document.getElementById('overlay-shop');
    if (!overlay) return;
    _wireShopTabs();
    _renderShop();
    overlay.classList.remove('hidden');
  }

  function close() {
    document.getElementById('overlay-shop')?.classList.add('hidden');
    document.getElementById('btn-shop-close')?.removeEventListener('click', close);
  }

  function _wireShopTabs() {
    if (_wireShopTabs.done) return;
    document.querySelectorAll('[data-shop-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        _activePage = btn.dataset.shopPage === 'action' ? 'action' : 'hero';
        _syncShopPages();
      });
    });
    _wireShopTabs.done = true;
  }

  function _syncShopPages() {
    document.querySelectorAll('[data-shop-page]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shopPage === _activePage);
    });
    document.querySelectorAll('[data-shop-page-panel]').forEach(panel => {
      panel.classList.toggle('hidden', panel.dataset.shopPagePanel !== _activePage);
    });
  }

  function _costBands(type, playerId = GameState.currentTurn) {
    const profile = _shopProfile(playerId);
    return profile[type] ?? SHOP_PROFILES.order[type];
  }

  function _shopProfile(playerId = GameState.currentTurn) {
    const phaseProfile = GameState.getCardPoolProfile?.() ?? { phase: 'order', round: 0 };
    const maxHp = _rules.startingPlayerHP ?? 40;
    const playerHp = GameState.getPlayerState?.(playerId)?.hp ?? maxHp;
    if (phaseProfile.phase !== 'chaos' || playerHp > maxHp) {
      return { id: 'order', rank: 0, ...SHOP_PROFILES.order };
    }

    const opponentId = GameState.getOpponentId?.(playerId);
    const activeRank = _hpShopRank(playerId);
    const opponentRank = _hpShopRank(opponentId);
    const roundRank = _roundShopRank(phaseProfile.round ?? 1);
    let rank = roundRank;

    if (activeRank < opponentRank) {
      rank = Math.min(rank, activeRank);
    } else if (activeRank > opponentRank) {
      const gap = activeRank - opponentRank;
      rank = gap >= 2
        ? Math.min(4, activeRank + gap)
        : Math.max(rank, activeRank);
    }

    const id = PROFILE_BY_RANK[rank] ?? 'robust';
    return { id, rank, ...SHOP_PROFILES[id] };
  }

  function _hpShopRank(playerId) {
    const maxHp = _rules.startingPlayerHP ?? 40;
    const hp = GameState.getPlayerState?.(playerId)?.hp ?? maxHp;
    if (hp > maxHp) return 0;
    const tierId = GameState.getPlayerHpTier?.(playerId)?.id ?? 'robust';
    return HP_RANK[tierId] ?? 1;
  }

  function _roundShopRank(round) {
    if (round <= 3) return 1;
    if (round <= 6) return 2;
    if (round <= 9) return 3;
    return 4;
  }

  function _weightedCostOffers(cards, type, count, playerId = GameState.currentTurn) {
    const pool = cards.slice();
    const picks = [];
    while (pool.length && picks.length < count) {
      const rows = _costBands(type, playerId)
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
    const mana       = GameState.getMana();
    const playerId   = GameState.currentTurn;
    const p          = GameState.getPlayerState(playerId);

    const heroFieldFull = (p.board?.length ?? 0) >= (_rules.fieldLimits?.heroes ?? 5);

    const foresight = GameState.hasIQCaptain?.(playerId) ?? false;
    const { heroes: shopHeroes, actions: shopActions, profile } = _getOffersForTurn(foresight, playerId);

    // Mana display in header
    const manaVal = document.getElementById('shop-mana-val');
    if (manaVal) manaVal.textContent = mana;
    const profileVal = document.getElementById('shop-profile-val');
    if (profileVal) profileVal.textContent = profile?.label ?? 'Order';

    // Hero grid
    const heroGrid = document.getElementById('shop-heroes');
    if (heroGrid) {
      heroGrid.innerHTML = '';
      heroGrid.classList.toggle('foresight', foresight);
      shopHeroes.forEach(card => {
        heroGrid.appendChild(_buildShopItem(card, 'hero', mana, heroFieldFull, playerId));
      });
    }

    // Action grid
    const actionGrid = document.getElementById('shop-actions');
    if (actionGrid) {
      actionGrid.innerHTML = '';
      actionGrid.classList.toggle('foresight', foresight);
      shopActions.forEach(card => {
        actionGrid.appendChild(_buildShopItem(card, 'action', mana, false, playerId));
      });
    }

    _syncShopPages();

    // Wire close button
    const closeBtn = document.getElementById('btn-shop-close');
    if (closeBtn) {
      closeBtn.onclick = close;
    }
  }

  function _getOffersForTurn(foresight = false, playerId = GameState.currentTurn) {
    const turnNumber = GameState.getTurnNumber?.() ?? 1;
    const profile = _shopProfile(playerId);
    const offerKey = `${turnNumber}:${playerId}:${profile.id}:${foresight ? 'foresight' : 'normal'}`;
    if (_offers.turnNumber !== offerKey) {
      const heroIdsInUse = GameState.getAllHeroIdsInUse?.({ includeGraveyard: true }) ?? new Set();
      const count = foresight ? 12 : 4;
      const heroPool = _heroes.filter(h => !heroIdsInUse.has(h.id));
      _offers = {
        turnNumber: offerKey,
        profile,
        heroes: _weightedCostOffers(heroPool, 'hero', count, playerId),
        actions: _weightedCostOffers(_actions, 'action', count, playerId),
      };
      if (foresight) showToast('Foresight shop open.', 'info');
    }
    return _offers;
  }

  function _buildShopItem(card, type, _mana, blockedBySpace, playerId) {
    const el = document.createElement('div');
    el.className = 'shop-item';

    const cost = _shopCardCost(card, type);
    const purchaseLimit = _purchaseLimit(type);
    const alreadyBought = GameState.getShopPurchasesThisTurn(type) >= purchaseLimit;
    const gate = type === 'hero'
      ? _canDeployShopHero(playerId, card, blockedBySpace)
      : _canCastShopAction(playerId, card);
    const canBuy = gate.ok && !alreadyBought;

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

    if (typeof expandCard === 'function') {
      const infoBtn = document.createElement('button');
      infoBtn.className = 'shop-info-btn';
      infoBtn.type = 'button';
      infoBtn.title = `Preview ${card.name}`;
      infoBtn.setAttribute('aria-label', `Preview ${card.name}`);
      infoBtn.textContent = 'i';
      infoBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        expandCard(card, type);
      });
      el.appendChild(infoBtn);
    }

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
    warnEl.textContent = alreadyBought ? `1 ${type}/turn` : (gate.ok ? '' : gate.error ?? '');
    if (warnEl.textContent) body.appendChild(warnEl);

    const btn = document.createElement('button');
    btn.className = 'menu-btn primary';
    btn.textContent = type === 'hero' ? 'Deploy' : 'Cast';
    btn.disabled = !canBuy;
    btn.addEventListener('click', () => _buy(card, type, playerId));
    body.appendChild(btn);
    el.appendChild(body);

    return el;
  }

  function _shopCardCost(card, type) {
    const fallback = type === 'hero' ? _rules.shopCosts?.hero : _rules.shopCosts?.action;
    return Math.max(0, Number(card?.manaCost ?? fallback ?? 0));
  }

  function _purchaseLimit(type, playerId = GameState.currentTurn) {
    return GameState.getShopPurchaseLimit?.(type, playerId) ?? (type === 'hero'
      ? (_rules.shopLimits?.heroPerTurn ?? 1)
      : (_rules.shopLimits?.actionPerTurn ?? 1));
  }

  function _turnLimitReached(type, playerId = GameState.currentTurn) {
    return GameState.getShopPurchasesThisTurn(type) >= _purchaseLimit(type, playerId);
  }

  function _canDeployShopHero(playerId, card, fieldFull = false) {
    if (!card) return { ok: false, error: 'No card' };
    if (GameState.hasAbstainedThisTurn?.(playerId)) return { ok: false, error: 'Shop locked by Abstain' };
    if (GameState.hasPlayerOrCaptainStatus?.(playerId, 'status_locked_out')) return { ok: false, error: 'Shop closed' };
    if (GameState.hasPlayerOrCaptainStatus?.(playerId, 'status_virus')) return { ok: false, error: 'Virus blocks hero buys' };
    if (_turnLimitReached('hero', playerId)) return { ok: false, error: 'Hero shop limit reached' };
    if (!(PhaseManager.canDeploy?.() ?? false)) return { ok: false, error: 'Cannot deploy now' };
    if (fieldFull || (GameState.getPlayerState(playerId)?.board?.length ?? 0) >= (_rules.fieldLimits?.heroes ?? 5)) {
      return { ok: false, error: 'Field full' };
    }
    if ((GameState.getHeroCardsDeployedThisTurn?.() ?? 0) >= (GameState.getHeroCardLimit?.(playerId) ?? 1)) {
      return { ok: false, error: 'Hero cast limit' };
    }
    if (GameState.getAllHeroIdsInUse?.({ includeGraveyard: true })?.has(card.id)) {
      return { ok: false, error: 'Hero already used' };
    }
    if ((GameState.getMana?.(playerId) ?? 0) < _shopCardCost(card, 'hero')) {
      return { ok: false, error: 'Not enough mana' };
    }
    return { ok: true };
  }

  function _canCastShopAction(playerId, card) {
    if (!card) return { ok: false, error: 'No card' };
    if (GameState.hasAbstainedThisTurn?.(playerId)) return { ok: false, error: 'Shop locked by Abstain' };
    if (GameState.hasPlayerOrCaptainStatus?.(playerId, 'status_locked_out')) return { ok: false, error: 'Shop closed' };
    if (_turnLimitReached('action', playerId)) return { ok: false, error: 'Action shop limit reached' };
    if (card.manaCost === 0 || card.type === 'free') {
      if (!(PhaseManager.canPlayFreeActionCards?.() ?? false)) return { ok: false, error: 'Chaos only' };
    } else {
      if (playerId !== GameState.currentTurn) return { ok: false, error: 'Not your turn' };
      if (!(PhaseManager.canPlayPaidActionCards?.() ?? false)) return { ok: false, error: 'Chaos only' };
    }
    const staged = _stageCard(playerId, card, 'action');
    const check = GameState.canPlayAction(playerId, staged.id);
    _removeStagedCard(playerId, staged, 'action');
    return check.ok ? { ok: true } : { ok: false, error: check.error ?? 'Cannot cast' };
  }

  function _canQueueCpuShopAction(playerId, card) {
    if (GameState.currentPhase !== 'combat') return { ok: false, error: 'Chaos only' };
    if (playerId !== GameState.currentTurn) return { ok: false, error: 'Not your turn' };
    if (!(PhaseManager.canPlayPaidActionCards?.() ?? false)) return { ok: false, error: 'Chaos only' };
    const staged = _stageCard(playerId, card, 'action', { _shopPaid: true });
    const check = GameState.canPlayAction(playerId, staged.id);
    _removeStagedCard(playerId, staged, 'action');
    return check.ok ? { ok: true } : { ok: false, error: check.error ?? 'Cannot cast' };
  }

  function _stageCard(playerId, card, type, extra = {}) {
    const staged = { ...card, ...extra, _shopPurchase: true };
    const p = GameState.getPlayerState(playerId);
    const hand = type === 'hero' ? p.hand.heroes : p.hand.actions;
    hand.unshift(staged);
    return staged;
  }

  function _removeStagedCard(playerId, staged, type) {
    const p = GameState.getPlayerState(playerId);
    const hand = type === 'hero' ? p.hand.heroes : p.hand.actions;
    const idx = hand.indexOf(staged);
    if (idx !== -1) {
      hand.splice(idx, 1);
      return;
    }
    const fallback = hand.findIndex(c => c?._shopPurchase && c.id === staged.id);
    if (fallback !== -1) hand.splice(fallback, 1);
  }

  function _buy(card, type, playerId) {
    return type === 'hero' ? _buyHero(card, playerId) : _buyAction(card, playerId);
  }

  function _buyHero(card, playerId) {
    const gate = _canDeployShopHero(playerId, card);
    if (!gate.ok) {
      showToast(gate.error, 'warn');
      _renderShop();
      return { ok: false, error: gate.error };
    }

    const staged = _stageCard(playerId, card, 'hero');
    const result = GameState.deployHero(playerId, staged.id);
    if (!result.ok) {
      _removeStagedCard(playerId, staged, 'hero');
      showToast(result.error, 'warn');
      _renderShop();
      return result;
    }

    GameState.recordShopPurchase('hero');
    showToast(`Deployed ${card.name}!`, 'info');
    close();
    renderBoard();
    return { ok: true, card, instance: result.instance };
  }

  function _buyAction(card, playerId) {
    const gate = _canCastShopAction(playerId, card);
    if (!gate.ok) {
      showToast(gate.error, 'warn');
      _renderShop();
      return { ok: false, error: gate.error };
    }

    const staged = _stageCard(playerId, card, 'action');
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      _removeStagedCard(playerId, staged, 'action');
      renderBoard?.();
    };
    const committed = () => {
      finished = true;
      GameState.recordShopPurchase('action');
      showToast(`Cast ${card.name} from shop.`, 'info');
    };

    close();
    const result = AbilityDispatcher.playCard(staged, playerId, {
      onCommitted: committed,
      onCancelled: cleanup,
    });
    if (result?.ok === false) cleanup();
    return result ?? { ok: true, card: staged };
  }

  function getOffersForCpu(playerId = GameState.currentTurn) {
    const foresight = GameState.hasIQCaptain?.(playerId) ?? false;
    return _getOffersForTurn(foresight, playerId);
  }

  function buyForCpu(playerId = GameState.currentTurn, type = 'action', scoreFn = null) {
    if (GameState.hasPlayerOrCaptainStatus?.(playerId, 'status_locked_out')) return { ok: false, error: 'Shop closed' };
    if (type === 'hero' && GameState.hasPlayerOrCaptainStatus?.(playerId, 'status_virus')) return { ok: false, error: 'Virus blocks hero buys' };
    if (GameState.hasAbstainedThisTurn?.(playerId)) return { ok: false, error: 'Shop locked by Abstain' };
    if (_turnLimitReached(type, playerId)) return { ok: false, error: 'Turn limit reached' };

    const p = GameState.getPlayerState(playerId);
    if (type === 'hero' && (p.board?.length ?? 0) >= (_rules.fieldLimits?.heroes ?? 5)) {
      return { ok: false, error: 'Field full' };
    }
    if (type === 'action' && (p.hand.actions?.length ?? 0) >= (_rules.handLimits?.action ?? 8)) {
      return { ok: false, error: 'Hand full' };
    }

    const offers = getOffersForCpu(playerId);
    const list = type === 'hero' ? offers.heroes : offers.actions;
    const usedHeroes = GameState.getAllHeroIdsInUse?.({ includeGraveyard: true }) ?? new Set();
    const candidates = list.filter(card => {
      if ((GameState.getMana(playerId) ?? 0) < _shopCardCost(card, type)) return false;
      if (type === 'hero') {
        return !usedHeroes.has(card.id)
          && (GameState.getHeroCardsDeployedThisTurn?.() ?? 0) < (GameState.getHeroCardLimit?.(playerId) ?? 1);
      }
      return (p.hand.actions?.filter(c => c.id === card.id).length ?? 0) < 2
        && _canQueueCpuShopAction(playerId, card).ok;
    });
    if (!candidates.length) return { ok: false, error: 'No legal offers' };

    const pick = candidates
      .map(card => ({ card, score: Number(scoreFn?.(card, type) ?? 0) }))
      .sort((a, b) => b.score - a.score)[0]?.card;
    if (!pick) return { ok: false, error: 'No pick' };

    if (type === 'hero') return _buyHero(pick, playerId);

    const cost = _shopCardCost(pick, 'action');
    if (!GameState.spendMana(cost, playerId)) return { ok: false, error: 'Not enough mana' };
    const result = GameState.addCardToHand(playerId, { ...pick, _shopPaid: true }, 'action');
    if (!result.ok) {
      GameState.gainMana(cost, playerId);
      return result;
    }
    GameState.recordShopPurchase('action');
    showToast(`${GameState.getPlayerLabel?.(playerId) ?? 'CPU'} buys ${pick.name}.`, 'info');
    renderBoard?.();
    return { ok: true, card: result.card };
  }

  return { init, open, close, getOffersForCpu, buyForCpu };
})();
