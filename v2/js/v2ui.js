// ─── Death Dice V2 — UI (pure DOM + GSAP) ────────────────────────────────────
// Seats · Death Row rail · Kitty · hand · targeting · execution drama.
// No canvas: DOM renders crisply, animates with GSAP, and is testable.

const V2UI = (() => {

  const SEAT_COLORS = ['#ff4433', '#9b59ff', '#33bbff', '#ffcc22', '#33dd77', '#ff66aa', '#ff8833', '#66ffee'];
  const ART_DIR = 'assets/cards/Action%20Card%20Test%20Export/';

  let _countdownTimer = null;
  let _target = null; // { mode:'player'|'slot', onPick, validSlots?:[], label }

  const $ = (id) => document.getElementById(id);
  const S = () => V2.state();

  // ══════════════════════════════════════════════════════════════════════════
  // GAME FLOW HOOKS (called by core)
  // ══════════════════════════════════════════════════════════════════════════
  function beginRollPhase() {
    _clearTarget();
    _setButtons({ roll: true, call: true, insure: V2.FEATURES.insurance, end: false });
    if (V2.FEATURES.wagers) _renderWagerStrip();
    _setHint('🎲 Rolling soon — 🎯 Call It to gamble on your number');
    let n = 3;
    const p = V2.active();
    V2Dice.showCountdown(p.name, n);
    clearInterval(_countdownTimer);
    _countdownTimer = setInterval(() => {
      n--;
      if (n <= 0) { rollNow(); }
      else V2Dice.showCountdown(p.name, n);
    }, 1000);
  }

  // Wager strip — every OTHER player gets ▲/▼ buttons during the countdown
  // (parked behind V2.FEATURES.wagers — too frantic for one shared screen)
  function _renderWagerStrip() {
    _removeWagerStrip();
    const s = S();
    const others = s.players.filter(p => p.alive && p.idx !== s.activeIdx);
    if (!others.length) return;
    const el = document.createElement('div');
    el.id = 'v2-wagers';
    el.innerHTML = `<div class="wg-title">💸 SIDE BETS — over/under 3½</div>
      <div class="wg-row">${others.map(p => `
        <div class="wg-chip" data-idx="${p.idx}" style="--seat-col:${SEAT_COLORS[p.idx]}">
          <span>${p.name}</span>
          <button class="wg-btn" data-dir="over">▲</button>
          <button class="wg-btn" data-dir="under">▼</button>
        </div>`).join('')}</div>`;
    document.body.appendChild(el);
    el.querySelectorAll('.wg-btn').forEach(b => b.addEventListener('click', () => {
      const chip = b.closest('.wg-chip');
      const r = V2.placeWager(Number(chip.dataset.idx), b.dataset.dir);
      if (r.ok) {
        chip.classList.add('locked');
        chip.querySelectorAll('.wg-btn').forEach(x => { x.disabled = true; });
        b.classList.add('picked');
      }
    }));
  }
  function _removeWagerStrip() { $('v2-wagers')?.remove(); }

  function rollNow() {
    clearInterval(_countdownTimer); _countdownTimer = null;
    V2Dice.hideCountdown();
    _closeCallIt();
    _removeWagerStrip();
    _setHint('');
    _setButtons({ roll: false, call: false, insure: false, end: false });
    const p = V2.active();
    const { roll, pair, drunk } = V2.computeRoll();
    const note = drunk ? `drunk: rolled ${pair.join(' & ')}, keeps ${roll}` :
      (S().requirement != null ? `needs ${S().requirement}+` : '');
    V2FX?.sfx?.('roll');
    V2Dice.roll(roll, { name: p.name, note }, () => V2.resolveRoll(roll));
  }

  function animateReroll(roll, cb) {
    V2Dice.quickRoll(roll, cb);
  }

  function enterMainPhase() {
    _setButtons({ roll: false, call: false, insure: false, end: true });
    _setHint(`◆ ${S().mana} mana — click a card to CAST it or RIG it onto Death Row, then End Turn`);
    refresh();
  }

  // Contextual hint bar — one line that always says what to do next
  function _setHint(text) {
    let el = $('v2-hint');
    if (!el) {
      el = document.createElement('div');
      el.id = 'v2-hint';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.toggle('visible', !!text);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  function refresh() {
    if (!S()) return;
    _renderSeats();
    _renderDeathRow();
    _renderSide();
    _renderHand();
  }

  function _renderSeats() {
    const host = $('v2-seats'); if (!host) return;
    host.innerHTML = '';
    S().players.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'seat' + (i === S().activeIdx ? ' active' : '') + (p.alive ? '' : ' dead');
      el.dataset.idx = i;
      el.style.setProperty('--seat-col', SEAT_COLORS[i]);
      const pct = Math.max(0, p.hp / V2.MAX_HP * 100);
      const badges = [
        ...p.dots.map(d => `<span class="sb dot" title="${d.label}">☠${d.turns}</span>`),
        p.drunk ? '<span class="sb drunk">🍺</span>' : '',
        p.rigBlocked ? '<span class="sb block">⛔</span>' : '',
        p.revealed ? '<span class="sb reveal">👁</span>' : '',
        p.banked ? `<span class="sb bank">+${p.banked}◆</span>` : '',
        p.manaDebt ? `<span class="sb debt">−${p.manaDebt}◆</span>` : '',
        p.called != null ? `<span class="sb call">🎯${p.called}</span>` : '',
      ].join('');
      el.innerHTML = `
        <div class="seat-name">${p.name}</div>
        <div class="seat-hp"><div class="seat-hp-fill" style="width:${pct}%"></div><span>${p.alive ? p.hp : '💀'}</span></div>
        <div class="seat-meta">🂠 ${p.hand.length}${badges ? ' ' + badges : ''}</div>`;
      el.addEventListener('click', () => {
        if (_target?.mode === 'player' && p.alive) {
          const cb = _target.onPick; _clearTarget(); cb(i);
        }
      });
      host.appendChild(el);
    });
    if (_target?.mode === 'player') host.classList.add('targeting');
    else host.classList.remove('targeting');
  }

  function _renderDeathRow() {
    const host = $('v2-deathrow'); if (!host) return;
    host.innerHTML = '';
    S().deathRow.forEach((slot, k) => {
      const n = k + 1;
      const el = document.createElement('div');
      el.className = 'dr-slot'
        + (slot.frozenBy != null ? ' frozen' : '')
        + (slot.cards.length ? ' loaded' : '')
        + (_target?.mode === 'slot' && (!_target.validSlots || _target.validSlots.includes(n)) ? ' pickable' : '');
      el.dataset.slot = n;

      const stack = slot.cards.map((c, ci) => {
        const col = SEAT_COLORS[c.owner];
        if (c.faceUp) {
          const card = V2_cardById(c.cardId);
          return `<div class="dr-card up" style="--oc:${col}" title="${card.name}: ${card.rigText}">${card.name}</div>`;
        }
        return `<div class="dr-card down" style="--oc:${col}" title="Rigged by ${V2.state().players[c.owner].name}"></div>`;
      }).join('');

      el.innerHTML = `
        <div class="dr-num">${n}</div>
        <div class="dr-stack">${stack || '<div class="dr-empty">—</div>'}</div>
        ${slot.frozenBy != null ? '<div class="dr-ice">🧊</div>' : ''}`;
      el.addEventListener('click', () => {
        if (_target?.mode === 'slot' && (!_target.validSlots || _target.validSlots.includes(n))) {
          const cb = _target.onPick; _clearTarget(); cb(n);
        }
      });
      host.appendChild(el);
    });
  }

  function _renderSide() {
    const req = $('v2-req'), kitty = $('v2-kitty'), mana = $('v2-mana'),
          turn = $('v2-turnlabel'), reaper = $('v2-reaper');
    if (req)  req.innerHTML  = S().requirement != null
      ? `BEAT <b>${S().requirement}</b> OR BLEED` : 'FRESH ROLL — <b>NO BAR</b>';
    if (kitty) kitty.innerHTML = `💰 KITTY <b>${S().kitty}</b>`;
    if (mana) mana.innerHTML = `◆ MANA <b>${S().mana}</b>`;
    if (turn) turn.innerHTML = `${V2.active().name}'s turn${S().overtime ? ' <b class="ot">⚡OT</b>' : ''}`;
    if (reaper) {
      const L = V2.reaperLeader();
      const steps = S().reaper.steps;
      reaper.innerHTML = `💀 REAPER <b>${'●'.repeat(steps)}${'○'.repeat(3 - steps)}</b>`
        + (L != null ? ` → <span style="color:${SEAT_COLORS[L]}">${S().players[L].name}</span>` : '');
      reaper.classList.toggle('hot', steps === 2);
    }
  }

  function _renderHand() {
    const host = $('v2-hand'); if (!host) return;
    host.innerHTML = '';
    const p = V2.active();
    if (!p.alive) return;
    p.hand.forEach((id, hi) => {
      const card = V2_cardById(id);
      const el = document.createElement('div');
      el.className = 'v2card';
      // One readable effect line; the rig details live in the action sheet
      const rigTeaser = card.rigText.replace(/^EXECUTE:\s*/, '');
      el.innerHTML = `
        <img src="${ART_DIR}${encodeURIComponent(card.art).replace(/%2F/g, '/')}" alt="">
        <div class="v2card-cost">${card.cost}</div>
        <div class="v2card-body">
          <div class="v2card-cast">${card.castText}</div>
          <div class="v2card-rig" title="${rigTeaser}">💣 ${rigTeaser.length > 44 ? rigTeaser.slice(0, 44) + '…' : rigTeaser}</div>
        </div>`;
      el.addEventListener('click', () => { V2FX?.sfx?.('click'); _openCardSheet(hi, card); });
      host.appendChild(el);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CARD PLAY FLOW
  // ══════════════════════════════════════════════════════════════════════════
  function _openCardSheet(handIdx, card) {
    if (S().phase !== 'main') { toast('Roll first!', 'warn'); return; }
    _closeSheet();
    const sheet = document.createElement('div');
    sheet.id = 'v2-sheet';
    const canCast = S().mana >= card.cost;
    const canRig  = S().mana >= V2.RIG_COST && !V2.active().rigBlocked;
    sheet.innerHTML = `
      <div class="sheet-title">${card.name}</div>
      <button class="menu-btn primary" id="sheet-cast" ${canCast ? '' : 'disabled'}>⚡ Cast — ${card.cost}◆<span>${card.castText}</span></button>
      <button class="menu-btn secondary" id="sheet-rig" ${canRig ? '' : 'disabled'}>💣 Rig to Death Row — ${V2.RIG_COST}◆<span>${card.rigText}</span></button>
      <button class="menu-btn secondary" id="sheet-cancel">✕ Cancel</button>`;
    document.body.appendChild(sheet);
    $('sheet-cancel').onclick = _closeSheet;
    $('sheet-cast').onclick = () => { _closeSheet(); _castFlow(handIdx, card); };
    $('sheet-rig').onclick = () => { _closeSheet(); _rigFlow(handIdx, card); };
    // click-away closes
    setTimeout(() => document.addEventListener('pointerdown', _sheetAway, true), 0);
  }
  function _sheetAway(e) {
    const sheet = $('v2-sheet');
    if (sheet && !sheet.contains(e.target)) _closeSheet();
  }
  function _closeSheet() {
    document.removeEventListener('pointerdown', _sheetAway, true);
    $('v2-sheet')?.remove();
  }

  function _castFlow(handIdx, card) {
    if (card.castTarget === 'player') {
      _setTarget('player', `${card.name}: click a player`, (t) => {
        const r = V2.castCard(handIdx, t);
        if (!r.ok) toast(r.error, 'warn');
      });
    } else if (card.castTarget === 'slot') {
      _setTarget('slot', `${card.name}: click a Death Row slot`, (n) => {
        const r = V2.castCard(handIdx, n);
        if (!r.ok) toast(r.error, 'warn');
      });
    } else {
      const r = V2.castCard(handIdx, null);
      if (!r.ok) toast(r.error, 'warn');
    }
  }

  function _rigFlow(handIdx) {
    const valid = S().deathRow.map((sl, k) => sl.frozenBy == null ? k + 1 : null).filter(Boolean);
    _setTarget('slot', 'Choose a slot to RIG (face-down)', (n) => {
      const r = V2.rigCard(handIdx, n);
      if (!r.ok) toast(r.error, 'warn');
      else {
        V2FX?.sfx?.('rig');
        V2FX?.particlesAt?.(document.querySelector(`.dr-slot[data-slot="${n}"]`), 'ember', 14);
        toast(`💣 Card rigged to slot ${n} — face-down…`, 'phase');
      }
    }, valid);
  }

  function _setTarget(mode, label, onPick, validSlots) {
    _target = { mode, onPick, validSlots };
    $('v2-banner').textContent = `🎯 ${label} (Esc cancels)`;
    $('v2-banner').classList.add('visible');
    refresh();
  }
  function _clearTarget() {
    _target = null;
    $('v2-banner')?.classList.remove('visible');
    document.querySelector('#v2-seats')?.classList.remove('targeting');
    refresh();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (_target) { _clearTarget(); toast('Cancelled', 'info'); } _closeSheet(); _closeCallIt(); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CALL IT
  // ══════════════════════════════════════════════════════════════════════════
  function openCallIt() {
    if (S().phase !== 'await') return;
    _closeCallIt();
    const el = document.createElement('div');
    el.id = 'v2-callit';
    el.innerHTML = `<div class="sheet-title">🎯 CALL YOUR NUMBER</div>
      <div class="callit-row">${[1,2,3,4,5,6].map(n => `<button class="callit-n" data-n="${n}">${n}</button>`).join('')}</div>`;
    document.body.appendChild(el);
    el.querySelectorAll('.callit-n').forEach(b => b.addEventListener('click', () => {
      V2.callIt(Number(b.dataset.n));
      _closeCallIt();
      refresh();
    }));
  }
  function _closeCallIt() { $('v2-callit')?.remove(); }

  // ══════════════════════════════════════════════════════════════════════════
  // DEATH ROW EXECUTION DRAMA
  // ══════════════════════════════════════════════════════════════════════════
  function showExecute(slotNum, card, ownerIdx, rollerIdx, done, fizzled = false) {
    const ov = document.createElement('div');
    ov.className = 'v2-execute' + (fizzled ? ' fizzled' : '');
    ov.innerHTML = `
      <div class="ex-inner">
        <div class="ex-head">${fizzled ? '🛡 INSURED — EXECUTION FIZZLES' : `💀 DEATH ROW — SLOT ${slotNum} EXECUTES`}</div>
        <div class="ex-card">
          <img src="${ART_DIR}${encodeURIComponent(card.art)}" alt="">
          ${fizzled ? '<div class="ex-stamp">FIZZLED</div>' : ''}
        </div>
        <div class="ex-name">${card.name}</div>
        <div class="ex-owner">rigged by <b style="color:${SEAT_COLORS[ownerIdx]}">${V2.state().players[ownerIdx].name}</b></div>
        <div class="ex-text">${fizzled ? 'The premium pays off. Nothing happens.' : card.rigText.replace(/^EXECUTE:\s*/, '')}</div>
      </div>`;
    document.body.appendChild(ov);

    // the moment must LAND: boom, embers from the fired slot, screen shake
    V2FX?.sfx?.(fizzled ? 'fizzle' : 'execute');
    const slotEl = document.querySelector(`.dr-slot[data-slot="${slotNum}"]`);
    V2FX?.particlesAt?.(slotEl, fizzled ? 'frost' : 'ember', 36);
    if (!fizzled) V2FX?.shake?.(9);

    gsap.fromTo(ov, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    const cardEl = ov.querySelector('.ex-card');
    gsap.fromTo(cardEl, { rotationY: 180, scale: 0.4 }, { rotationY: 0, scale: 1, duration: 0.5, ease: 'back.out(1.6)' });
    gsap.fromTo(ov.querySelector('.ex-head'), { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, delay: 0.1 });
    if (fizzled) {
      gsap.fromTo(ov.querySelector('.ex-stamp'),
        { scale: 3, opacity: 0, rotation: -18 },
        { scale: 1, opacity: 1, rotation: -12, duration: 0.25, delay: 0.55, ease: 'power3.in' });
    }

    const finish = () => {
      gsap.to(ov, { opacity: 0, duration: 0.25, onComplete: () => { ov.remove(); done?.(); } });
    };
    setTimeout(finish, fizzled ? 1700 : 2100);
    // FAILSAFE for hidden tabs (gsap won't tick): force-finish
    setTimeout(() => { if (document.body.contains(ov)) { ov.remove(); done?.(); } }, 3200);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODALS: peeks, steals, tribute
  // ══════════════════════════════════════════════════════════════════════════
  function _pickModal(title, sub, items, onPick, cancelable = true) {
    const ov = document.createElement('div');
    ov.className = 'v2-modal';
    ov.innerHTML = `
      <div class="v2-modal-box">
        <div class="sheet-title">${title}</div>
        ${sub ? `<div class="v2-modal-sub">${sub}</div>` : ''}
        <div class="v2-modal-items">
          ${items.map((it, i) => `<button class="v2-modal-item" data-i="${i}">${it}</button>`).join('')}
        </div>
        ${cancelable ? '<button class="menu-btn secondary" id="vm-cancel">✕ Close</button>' : ''}
      </div>`;
    document.body.appendChild(ov);
    ov.querySelectorAll('.v2-modal-item').forEach(b => b.addEventListener('click', () => {
      ov.remove(); onPick?.(Number(b.dataset.i));
    }));
    ov.querySelector('#vm-cancel')?.addEventListener('click', () => { ov.remove(); onPick?.(null); });
  }

  function peekDeathRow(me) {
    const rows = [];
    S().deathRow.forEach((sl, k) => {
      sl.cards.forEach(c => {
        const card = V2_cardById(c.cardId);
        rows.push(`SLOT ${k + 1} · <b>${card.name}</b> (by ${S().players[c.owner].name}) — ${card.rigText.replace(/^EXECUTE:\s*/, '')}`);
      });
    });
    _pickModal('👁 Death Row — your eyes only', `${S().players[me].name} peeks…`,
      rows.length ? rows : ['Death Row is empty. Paranoia unfounded.'], null);
  }

  function peekAndSteal(me, t) {
    const tp = S().players[t];
    if (!tp.hand.length) { toast(`${tp.name} has no cards!`, 'info'); return; }
    _pickModal(`🦝 Steal from ${tp.name}`, 'Pick a card to take:',
      tp.hand.map(id => { const c = V2_cardById(id); return `<b>${c.name}</b> — ${c.castText}`; }),
      (i) => {
        if (i == null) return;
        const id = tp.hand.splice(i, 1)[0];
        S().players[me].hand.push(id);
        toast(`🦝 ${S().players[me].name} steals ${V2_cardById(id).name}!`, 'combat');
        refresh();
      });
  }

  function demandTribute(me, t) {
    const tp = S().players[t];
    if (!tp.hand.length) { toast(`${tp.name} has nothing to give!`, 'info'); return; }
    _pickModal(`💕 ${tp.name}, pay tribute`, `Choose which card to hand to ${S().players[me].name} (device to ${tp.name}!)`,
      tp.hand.map(id => { const c = V2_cardById(id); return `<b>${c.name}</b> — ${c.castText}`; }),
      (i) => {
        if (i == null) i = Math.floor(Math.random() * tp.hand.length);
        const id = tp.hand.splice(i, 1)[0];
        S().players[me].hand.push(id);
        toast(`💕 Tribute paid: ${V2_cardById(id).name}`, 'combat');
        refresh();
      }, false);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FEEDBACK
  // ══════════════════════════════════════════════════════════════════════════
  function hitFx(i, amt) {
    const seat = document.querySelector(`.seat[data-idx="${i}"]`);
    if (!seat) return;
    V2FX?.sfx?.(amt >= 4 ? 'bighit' : 'hit');
    V2FX?.particlesAt?.(seat, 'blood', Math.min(40, 12 + amt * 5));
    if (amt >= 4) V2FX?.shake?.(6);
    const fx = document.createElement('div');
    fx.className = 'seat-hit';
    fx.textContent = `−${amt}`;
    seat.appendChild(fx);
    gsap.fromTo(fx, { y: 0, opacity: 1, scale: 0.6 }, {
      y: -34, opacity: 0, scale: 1.4, duration: 1.0, ease: 'power1.out',
      onComplete: () => fx.remove(),
    });
    gsap.fromTo(seat, { x: -4 }, { x: 4, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => gsap.set(seat, { x: 0 }) });
  }

  function healFx(i, amt) {
    const seat = document.querySelector(`.seat[data-idx="${i}"]`);
    if (!seat) return;
    V2FX?.sfx?.('heal');
    V2FX?.particlesAt?.(seat, 'heal', 16);
    const fx = document.createElement('div');
    fx.className = 'seat-hit heal';
    fx.textContent = `+${amt}`;
    seat.appendChild(fx);
    gsap.fromTo(fx, { y: 0, opacity: 1, scale: 0.6 }, {
      y: -30, opacity: 0, scale: 1.3, duration: 1.0, ease: 'power1.out',
      onComplete: () => fx.remove(),
    });
  }

  function toast(message, type = 'info') {
    const container = $('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
    setTimeout(() => { el.classList.remove('visible'); setTimeout(() => el.remove(), 400); }, 3200);
  }

  function showWin(p) {
    clearInterval(_countdownTimer);
    V2Dice.hideCountdown();
    _setHint('');
    V2FX?.sfx?.('win');
    V2FX?.musicStop?.();
    V2FX?.particles?.('confetti', innerWidth / 2, innerHeight * 0.3, 80);
    const ov = document.createElement('div');
    ov.className = 'v2-modal';
    ov.innerHTML = `
      <div class="v2-modal-box win">
        <div class="win-crown">👑</div>
        <div class="sheet-title">${p ? p.name + ' SURVIVES DEATH DICE!' : 'EVERYBODY DIED.'}</div>
        <button class="menu-btn primary" onclick="location.reload()">⚔ Again!</button>
      </div>`;
    document.body.appendChild(ov);
  }

  function _setButtons({ roll, call, insure, end }) {
    if ($('btn-v2-roll'))   $('btn-v2-roll').disabled   = !roll;
    if ($('btn-v2-call'))   $('btn-v2-call').disabled   = !call;
    if ($('btn-v2-insure')) $('btn-v2-insure').disabled = !insure || V2.active()?.insured;
    if ($('btn-v2-end'))    $('btn-v2-end').disabled    = !end;
    $('btn-v2-roll')?.classList.toggle('needs-roll', !!roll);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BOOT
  // ══════════════════════════════════════════════════════════════════════════
  function startGame(names) {
    V2FX?.init?.();       // AudioContext needs a user gesture — this IS one
    V2FX?.musicStart?.();
    V2.newGame(names);
    $('screen-setup').classList.remove('active');
    $('screen-game').classList.add('active');
    refresh();
    V2.startTurn();
  }

  function initSetupScreen() {
    const list = $('setup-list');
    const addRow = (val = '') => {
      if (list.children.length >= 8) return;
      const row = document.createElement('div');
      row.className = 'setup-row';
      row.innerHTML = `<input type="text" maxlength="14" placeholder="Player ${list.children.length + 1}" value="${val}">
        <button class="setup-del">✕</button>`;
      row.querySelector('.setup-del').onclick = () => { if (list.children.length > 2) row.remove(); _renum(); };
      list.appendChild(row);
      _renum();
    };
    const _renum = () => {
      [...list.children].forEach((r, i) => r.querySelector('input').placeholder = `Player ${i + 1}`);
      $('setup-count').textContent = `${list.children.length} players`;
    };
    addRow(); addRow(); // minimum 2
    $('btn-setup-add').onclick = () => addRow();
    $('btn-setup-start').onclick = () => {
      const names = [...list.querySelectorAll('input')].map((inp, i) => inp.value || `Player ${i + 1}`);
      startGame(names);
    };
  }

  function init() {
    $('btn-play').onclick = () => {
      $('screen-menu').classList.remove('active');
      $('screen-setup').classList.add('active');
    };
    $('btn-v2-roll').onclick = rollNow;
    $('btn-v2-call').onclick = () => { V2FX?.sfx?.('click'); openCallIt(); };
    if ($('btn-v2-insure')) {
      if (!V2.FEATURES.insurance) $('btn-v2-insure').style.display = 'none';
      else $('btn-v2-insure').onclick = () => { V2.buyInsurance(); _setButtons({ roll: true, call: true, insure: false, end: false }); };
    }
    $('btn-v2-end').onclick = () => { V2FX?.sfx?.('click'); V2.endTurn(); };
    $('btn-v2-mute').onclick = () => {
      V2FX?.setMuted?.(!V2FX.isMuted());
      $('btn-v2-mute').textContent = V2FX.isMuted() ? '🔇 Sound' : '🔊 Sound';
    };
    initSetupScreen();
  }
  document.addEventListener('DOMContentLoaded', init);

  return {
    refresh, toast, hitFx, healFx, showWin, showExecute,
    beginRollPhase, enterMainPhase, animateReroll,
    peekDeathRow, peekAndSteal, demandTribute,
  };
})();
