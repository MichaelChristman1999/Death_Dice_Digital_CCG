// ─── Action UI — targeting banner, ability panel, reveal modal ───────────────
// HTML overlays that sit on top of the PixiJS canvas. Keeps party flow clear:
// every click-to-target action shows a banner telling the player what to do.

const ActionUI = (() => {

  // ── Global dismissal — AAA feel: overlays close on click-away and Escape ────
  document.addEventListener('pointerdown', (e) => {
    const panel = document.getElementById('char-panel');
    if (panel && !panel.contains(e.target)) closeCharPanel();
  }, true); // capture: runs even when the canvas swallows the event

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeCharPanel();
    const banner = document.getElementById('target-banner');
    if (banner?.classList.contains('visible')) {
      PixiBoard?.exitTargetMode?.();
      hideTargetBanner();
      showToast('Cancelled.', 'info');
    }
  });

  // ── Auto-roll countdown ("ADAM ROLLS IN 3…") ────────────────────────────────
  function showRollCountdown(name, n) {
    let el = document.getElementById('roll-countdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'roll-countdown';
      el.innerHTML = '<div class="rc-name"></div><div class="rc-num"></div><div class="rc-hint">press ROLL NOW to skip</div>';
      document.body.appendChild(el);
    }
    el.querySelector('.rc-name').textContent = `${name.toUpperCase()} ROLLS IN`;
    const num = el.querySelector('.rc-num');
    num.textContent = n;
    el.classList.add('visible');
    // number punch on every tick
    num.classList.remove('tick');
    void num.offsetWidth; // restart the CSS animation
    num.classList.add('tick');
  }

  function hideRollCountdown() {
    document.getElementById('roll-countdown')?.classList.remove('visible');
  }

  // ── Target instruction banner ───────────────────────────────────────────────
  function showTargetBanner(text) {
    let el = document.getElementById('target-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'target-banner';
      document.body.appendChild(el);
    }
    el.innerHTML = `🎯 ${text} <span class="tb-cancel">(click empty space to cancel)</span>`;
    el.classList.add('visible');
  }

  function hideTargetBanner() {
    document.getElementById('target-banner')?.classList.remove('visible');
  }

  // ── Character ability panel ─────────────────────────────────────────────────
  // Opened by clicking (not dragging) one of your deployed characters.
  function openCharPanel(char, owner) {
    closeCharPanel();

    const isOwnerTurn = owner === GameState.currentTurn;
    const src     = char._sourceCard ?? {};
    const ability = char.abilities?.[0];
    const mana    = GameState.getMana(owner);
    const acted   = char.tapped || char.hasAttackedThisTurn || char.hasUsedAbilityThisTurn;
    const inCombat = isOwnerTurn && PhaseManager.canUseAbilities();
    const gate    = GameState.canCharacterUseAbility(char);
    const atk     = GameState.getEffectiveAttack(char);
    const passives = (char.passives?.length ? [...char.passives] : [...(src.passives ?? [])]);
    const passiveOnly = /^(Passive|Durability)$/i.test(char.classType || src.classType || '');
    if (passiveOnly && src.docAbility && passives.length === 0) {
      passives.push({ name: 'Hero Passive', description: src.docAbility });
    }
    const passiveHtml = passives.map(p => `
      <div class="cp-ability passive">
        <div class="cp-ability-name">${p.name ?? 'Passive'}</div>
        <div class="cp-ability-desc">${p.description ?? ''}</div>
      </div>`).join('');
    const role = char.classType || src.classType || '';
    const rolePassive = src.rolePassive;
    const roleHtml = role ? `
      <div class="cp-ability role">
        <div class="cp-ability-name">${role}${rolePassive?.name ? ` - ${rolePassive.name}` : ''}</div>
        ${rolePassive?.description ? `<div class="cp-ability-desc">${rolePassive.description}</div>` : ''}
      </div>` : '';

    const canUse = isOwnerTurn && ability && !acted && inCombat && gate.ok && mana >= ability.manaCost;
    let hint = '';
    if (!isOwnerTurn)                   hint = '';
    else if (!ability && !passives.length)   hint = 'No active ability.';
    else if (acted)                     hint = 'Already acted this turn.';
    else if (!inCombat)                 hint = 'Abilities unlock in the Chaos Phase after rolling the Death Die.';
    else if (!gate.ok)                  hint = gate.reason;
    else if (ability && mana < ability.manaCost) hint = `Need ${ability.manaCost} ◆ (you have ${mana}).`;

    const panel = document.createElement('div');
    panel.id = 'char-panel';
    panel.innerHTML = `
      <div class="cp-head">
        <span class="cp-name">${char.name}</span>
        <span class="cp-stats">⚔${atk} · ♥${char.currentHp}/${char.maxHp}</span>
      </div>
      ${ability ? `
      <div class="cp-ability">
        <div class="cp-ability-name">◆${ability.manaCost} — ${ability.abilityName}</div>
        <div class="cp-ability-desc">${ability.description}</div>
      </div>` : ''}
      ${roleHtml}
      ${passiveHtml || (!ability ? '<div class="cp-ability-desc">This character has no active ability.</div>' : '')}
      ${hint ? `<div class="cp-hint">${hint}</div>` : ''}
      <div class="cp-actions">
        ${isOwnerTurn && ability ? `<button id="cp-use" class="menu-btn primary" ${canUse ? '' : 'disabled'}>⚡ Use Ability</button>` : ''}
        <button id="cp-close" class="menu-btn secondary">✕</button>
      </div>
      ${isOwnerTurn ? '<div class="cp-tip">Drag this card onto an enemy to attack</div>' : ''}`;
    document.body.appendChild(panel);

    panel.querySelector('#cp-close')?.addEventListener('click', closeCharPanel);
    panel.querySelector('#cp-use')?.addEventListener('click', () => {
      closeCharPanel();
      AbilityDispatcher.useAbility(char.instanceId, 0);
    });
  }

  function closeCharPanel() {
    document.getElementById('char-panel')?.remove();
  }

  // ── Reveal modal — peek at the opponent's hand ─────────────────────────────
  function showRevealModal(opponentId) {
    const p = GameState.getPlayerState(opponentId);
    const modal = document.getElementById('modal-card');
    const content = document.getElementById('modal-card-content');
    if (!modal || !content) return;

    const heroRows = p.hand.heroes.map(c =>
      `<div class="reveal-row"><span class="reveal-type hero">HERO</span> ${c.name} <span class="reveal-cost">◆${c.manaCost} · ♥${c.hp} · ⚔${c.baseAttack}</span></div>`
    ).join('');
    const actionRows = p.hand.actions.map(c =>
      `<div class="reveal-row"><span class="reveal-type action">ACTION</span> ${c.name} <span class="reveal-cost">${c.manaCost === 0 ? 'Free' : '◆' + c.manaCost}</span></div>`
    ).join('');

    content.innerHTML = `
      <div class="reveal-panel">
        <h2>👁 ${GameState.getPlayerLabel(opponentId)}'s Hand</h2>
        ${heroRows || '<div class="reveal-row muted">No hero cards</div>'}
        ${actionRows || '<div class="reveal-row muted">No action cards</div>'}
      </div>`;

    document.getElementById('btn-modal-card-close')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    }, { once: true });
    modal.classList.remove('hidden');
  }

  return { showTargetBanner, hideTargetBanner, openCharPanel, closeCharPanel,
           showRevealModal, showRollCountdown, hideRollCountdown };
})();
