// ─── Death Dice V2 — Action Card Pool ─────────────────────────────────────────
// Every card has TWO lives:
//   CAST  — play it now for the printed effect (may need a target)
//   RIG   — 1 mana, face-down onto a Death Row slot; when ANYONE rolls that
//           number it EXECUTES with the amplified effect (auto-resolving, no
//           mid-roll decisions — the fire moment stays fast and dramatic)
//
// Effects receive the V2 core API (C) — damage/heal/draw/steal/etc. All
// player references are seat indexes. `roller` = whoever triggered the slot.

const V2_CARDS = [
  {
    id: 'abstain', name: 'Abstain', art: 'Action Card_Abstain.jpg', cost: 0,
    castTarget: 'none',
    castText: 'Draw 2 cards.',
    rigText:  'EXECUTE: every other player discards 1 at random. You draw 2.',
    cast: (C, me) => { C.draw(me, 2); },
    rigged: (C, owner, roller) => {
      C.players().forEach((p, i) => { if (i !== owner) C.discardRandom(i, 1); });
      C.draw(owner, 2);
    },
  },
  {
    id: 'drain', name: 'Anemic Potion', art: 'Action Card_Anemic Potion.jpg', cost: 1,
    castTarget: 'player',
    castText: 'Steal 2 HP from a player (they lose 2, you heal 2).',
    rigText:  'EXECUTE: drain ALL of the roller\'s mana this turn — you bank it as HP.',
    cast: (C, me, t) => { C.damage(t, 2, 'Anemic Potion'); C.heal(me, 2); },
    rigged: (C, owner, roller) => {
      const m = C.getMana();
      C.setMana(0);
      C.heal(owner, Math.min(4, m));
      C.toast(`🧛 ${C.name(owner)} drains ${C.name(roller)}'s ${m} mana into HP!`);
    },
  },
  {
    id: 'augment', name: 'Augment', art: 'Action Card_Augment.jpg', cost: 1,
    castTarget: 'player',
    castText: 'A player of your choice gains +3 mana right now.',
    rigText:  'EXECUTE: the roller gains +3 mana — and you draw 2 cards. (A public bribe.)',
    cast: (C, me, t) => {
      C.giveMana(t, 3);
      C.toast(`⚡ ${C.name(me)} boosts ${C.name(t)} +3 mana!`);
    },
    rigged: (C, owner, roller) => {
      C.giveMana(roller, 3);
      C.draw(owner, 2);
      C.toast(`🤝 Bribe pays out: ${C.name(roller)} +3 mana, ${C.name(owner)} draws 2!`);
    },
  },
  {
    id: 'bloodmana', name: 'Blood Mana', art: 'Action Card_Blood Mana.jpg', cost: 0,
    castTarget: 'none',
    castText: 'Pay 2 HP: gain 3 mana.',
    rigText:  'EXECUTE: the roller bleeds 2 HP — you gain 2 mana (even off-turn, it banks).',
    cast: (C, me) => { C.damage(me, 2, 'Blood Mana'); C.gainManaFor(me, 3); },
    rigged: (C, owner, roller) => {
      C.damage(roller, 2, 'Blood Mana trap');
      C.gainManaFor(owner, 2);
    },
  },
  {
    id: 'bombs', name: 'Bombs Away', art: 'Action Card_Bombs Away.jpg', cost: 2,
    castTarget: 'player',
    castText: 'Deal 2 damage to a player.',
    rigText:  'EXECUTE: 3 damage to EVERY player except you. Table nuke.',
    cast: (C, me, t) => { C.damage(t, 2, 'Bombs Away'); },
    rigged: (C, owner) => {
      C.toast('💣 BOMBS AWAY — the whole table eats it!');
      C.players().forEach((p, i) => { if (i !== owner) C.damage(i, 3, 'Bombs Away'); });
    },
  },
  {
    id: 'cheese', name: 'Cheese Potion', art: 'Action Card_Cheese Potion.jpg', cost: 0,
    castTarget: 'none',
    castText: 'Roll on the Chaos Table. Anything can happen.',
    rigText:  'EXECUTE: DOUBLE chaos — roll on the Chaos Table twice.',
    cast: (C, me) => { C.chaosTable(me); },
    rigged: (C, owner) => { C.chaosTable(owner); C.chaosTable(owner); },
  },
  {
    id: 'cleanse', name: 'Cleanse', art: 'Action Card_Cleanse.jpg', cost: 1,
    castTarget: 'slot',
    castText: 'Defuse: discard ALL cards on one Death Row slot.',
    rigText:  'EXECUTE: the entire Death Row detonates harmlessly — every slot is wiped.',
    cast: (C, me, slot) => { C.wipeSlot(slot); },
    rigged: (C) => { C.wipeAllSlots(); C.toast('✨ CLEANSE — Death Row wiped clean!'); },
  },
  {
    id: 'cripple', name: 'Cripple', art: 'Action Card_Cripple.jpg', cost: 1,
    castTarget: 'player',
    castText: 'A player gets −3 mana on their next roll (min 0).',
    rigText:  'EXECUTE: the roller\'s turn ends IMMEDIATELY. No cards, no shop, gone.',
    cast: (C, me, t) => { C.addManaDebt(t, 3); C.toast(`🦵 ${C.name(t)}'s next roll is crippled (−3 mana)!`); },
    rigged: (C, owner, roller) => {
      C.toast(`⛓ HANDCUFFED! ${C.name(roller)}'s turn ends on the spot!`);
      C.forceEndTurn();
    },
  },
  {
    id: 'riot', name: 'Damage Potion', art: 'Action Card_Damage Potion.jpg', cost: 1,
    castTarget: 'player',
    castText: 'Deal 3 damage to a player.',
    rigText:  'EXECUTE: 5 damage to the roller. The classic landmine.',
    cast: (C, me, t) => { C.damage(t, 3, 'Riot Punch'); },
    rigged: (C, owner, roller) => { C.damage(roller, 5, 'Riot Punch trap'); },
  },
  {
    id: 'drunk', name: 'Drunk Potion', art: 'Action Card_Drunk Potion.jpg', cost: 1,
    castTarget: 'player',
    castText: 'A player rolls TWO dice next turn and must keep the LOWER.',
    rigText:  'EXECUTE: the roller instantly re-rolls — the new number replaces this one AND fires its own slot.',
    cast: (C, me, t) => { C.setDrunk(t); C.toast(`🍺 ${C.name(t)} is drunk — next roll keeps the LOWER of two dice!`); },
    rigged: (C, owner, roller) => {
      C.toast('🍺 CHAOS REWIND — the roll happens again!');
      C.queueReroll();
    },
  },
  {
    id: 'exploit', name: 'Exploit', art: 'Action Card_Exploit.jpg', cost: 1,
    castTarget: 'player',
    castText: 'Steal 2 mana from the active pool if it isn\'t yours — or 2 HP from any player.',
    rigText:  'EXECUTE: steal a random card from the roller\'s hand.',
    cast: (C, me, t) => { C.damage(t, 2, 'Exploit'); C.heal(me, 1); },
    rigged: (C, owner, roller) => { C.stealRandomCard(owner, roller); },
  },
  {
    id: 'gas', name: 'Gas Potion', art: 'Action Card_Gas Potion.jpg', cost: 1,
    castTarget: 'player',
    castText: 'Poison a player: 1 damage at the start of their next 3 turns.',
    rigText:  'EXECUTE: gas cloud — 2 damage to the roller AND both seat neighbours.',
    cast: (C, me, t) => { C.addDot(t, 1, 3, 'Gas'); C.toast(`☠ ${C.name(t)} is gassed — 1 dmg for 3 turns!`); },
    rigged: (C, owner, roller) => {
      C.toast('☁ GAS CLOUD! The roller and neighbours choke!');
      C.neighbours(roller).concat([roller]).forEach(i => C.damage(i, 2, 'Gas cloud'));
    },
  },
  {
    id: 'imp', name: 'Imp-Aired', art: 'Action Card_Imp-Aired.jpg', cost: 1,
    castTarget: 'player',
    castText: 'Peek at a player\'s hand and steal a card of your choice.',
    rigText:  'EXECUTE: the roller plays their whole next turn with their hand REVEALED.',
    cast: (C, me, t) => { C.peekAndSteal(me, t); },
    rigged: (C, owner, roller) => { C.setRevealed(roller); C.toast(`👁 ${C.name(roller)}'s hand will be PUBLIC next turn!`); },
  },
  {
    id: 'impede', name: 'Impede', art: 'Action Card_Impede.jpg', cost: 1,
    castTarget: 'slot',
    castText: 'Freeze one Death Row slot — it cannot fire or be rigged until your next turn.',
    rigText:  'EXECUTE: the roller cannot RIG cards or CALL IT on their next turn.',
    cast: (C, me, slot) => { C.freezeSlot(slot, me); },
    rigged: (C, owner, roller) => { C.setRigBlocked(roller); C.toast(`⛔ ${C.name(roller)} is blocked from rigging next turn!`); },
  },
  {
    id: 'tribute', name: 'Love Potion', art: 'Action Card_Love Potion.jpg', cost: 1,
    castTarget: 'player',
    castText: 'A player must give you a card of THEIR choice. Tribute, publicly.',
    rigText:  'EXECUTE: the roller gives 2 random cards to whoever has the LEAST HP.',
    cast: (C, me, t) => { C.demandTribute(me, t); },
    rigged: (C, owner, roller) => {
      const poorest = C.poorestPlayer();
      C.transferRandomCards(roller, poorest, 2);
      C.toast(`💕 Charity strike! ${C.name(roller)} gives 2 cards to ${C.name(poorest)}!`);
    },
  },
  {
    id: 'reveal', name: 'Reveal', art: 'Action Card_Reveal.jpg', cost: 0,
    castTarget: 'none',
    castText: 'Secretly peek at every face-down card on Death Row.',
    rigText:  'EXECUTE: flip ALL Death Row cards face-up. Everyone\'s plans, exposed.',
    cast: (C, me) => { C.peekDeathRow(me); },
    rigged: (C) => { C.exposeDeathRow(); C.toast('👁 DEATH ROW EXPOSED — every card flips face-up!'); },
  },
  {
    id: 'vitalize', name: 'Vitalize', art: 'Action Card_Vitalize.jpg', cost: 1,
    castTarget: 'none',
    castText: 'Heal yourself 3 HP.',
    rigText:  'EXECUTE: the roller heals 4 HP. A blessing… or bait.',
    cast: (C, me) => { C.heal(me, 3); },
    rigged: (C, owner, roller) => { C.heal(roller, 4); C.toast(`💖 Blessing fires — ${C.name(roller)} heals 4!`); },
  },
];

// Draw pile helper — flat pool with light duplication for a party-sized deck
function V2_buildDeck() {
  const deck = [];
  V2_CARDS.forEach(c => { deck.push(c.id, c.id, c.id); }); // 3 copies each = 51 cards
  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function V2_cardById(id) { return V2_CARDS.find(c => c.id === id); }
