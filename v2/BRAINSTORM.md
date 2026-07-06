# Death Dice V2 — Mechanics Brainstorm (2026-06-13)

> Divergent design session. DESIGN.md holds the pillars; this holds the ideas.
> Status tags: [CORE] recommended first build · [LAYER] expansion · [WILD] unproven swing

---

## The founding insight

The roll-requirement rule (beat the previous roll or take the difference) makes
roll outcomes cluster UPWARD across a round until a 6 resets it. Therefore a
shared 1–6 trigger rail is not uniform randomness — **each slot has a
personality**:

- Slots 5–6: fire during greed streaks — the "everyone's pushing" numbers
- Slots 1–2: fire only when someone busts — rigging them is a bet on failure
- Slot 6: doubly hot — chased for mana/reset AND feared if trapped

The existing dice rule gives the rail a strategy landscape for free.

---

## [CORE] DEATH ROW — the shared trigger rail

Six numbered slots in the table center. Instead of casting an action card, you
may **rig** it: place face-down on a slot, pay 1 mana. When ANY player rolls
that number, the top card of that slot **executes**: revealed, resolved by its
owner (owner picks targets at trigger time), then discarded.

Rules that make it sing:
- **Any roll triggers** — including the owner's own. Sweat is universal.
- **Stacking:** multiple cards per slot; only the TOP executes per trigger →
  burying an enemy's card is a play; the 6-slot becomes a bidding war.
- **Face-down:** duds are legal. Rig nothing-cards to warp roll psychology.
- **Executions may target the roller** (recommended) — the rail is a loaded gun
  pointed at the table.

Pillars: Maximum Drama (every roll = potential detonation), Social (threats,
begging, negotiation over slots), Controlled Chaos (players CHOSE what's rigged
— randomness only chooses WHEN), Bluffing (face-down + duds).

## [CORE] Dual-use cards (the modular answer)

No printed trigger numbers (a "3s deck" would play itself — kills
repeatability). Every action card has two lives:
1. **Cast now** — printed effect.
2. **Rig to Death Row** — executes AMPLIFIED (+1 damage / +1 draw / wider
   targets, per-card "Rigged:" line).

Delayed = stronger. One decision, endless texture, same 17-card pool.
Modularity through placement, not printing.

## [CORE] The Kitty — jackpot comeback pot

When a player takes failed-roll damage, the SAME amount drops into a central
mana pot. Rolling EXACTLY the required number claims the whole pot. Busting
feeds the jackpot; the table audibly counts it up. Last place always has a
lottery ticket. (Comeback pillar; zero new UI surface beyond a pot counter.)

## [CORE] Call It — free showboating

Before your roll, publicly call a number. Hit: double mana + draw a card.
Miss: nothing (pride). Pure Discord-yelling generator, near-zero rules cost.

---

## [LAYER] Insurance
Before a roll resolves its Death Row trigger, any player may pay 1 mana for
immunity to THIS execution — but paying signals you fear the slot.
Information leak as a price. Mind-games squared.

## [LAYER] Table wagers (from roadmap, still in)
Others wager 1 HP/card on OVER/UNDER 3.5 before each roll. Stacks cleanly
with Death Row: you can bet on the number AND dread the slot.

## [LAYER] Ghost Justice — dead players run fate
Eliminated players get a small ghost deck. Each round, a ghost rolls THEIR die
and places a ghost card on that slot (face-down, marked with their skull).
Dead but never gone; Death Row stays fed late-game; "never feel eliminated."

## [LAYER] Corpse slots — graveyard haunting
When a character dies, its card lies on the slot matching the roll/turn number
of its death. If that slot fires again: resurrect at 1 HP, enraged (+2 atk this
turn). Your dead haunt a number; the table fears the 3 forever.

## [LAYER] Overtime — escalation clock
After turn 12: every roll triggers its slot AND the slot below. Late game
becomes a minefield; matches end in fireworks (also enforces the 15–25 min
target as escalation, not a timer).

---

## [WILD] The Reaper
Neutral figure. Every rolled 1 moves it one step toward the current leader;
on arrival: 5 damage, returns to center. The table can FEED it 1s on purpose
(deliberately rolling into bust range = political sacrifice). Blue Shell as a
character on the board.

## [WILD] Dead Man's Hand
Your hand is visible to the player on your LEFT only. Neighbor espionage,
whisper politics, built-in Discord DM culture. (Needs UX care in hot-seat.)

## [WILD] Final Duel
When only two players remain: both roll TWO dice, both trigger. Ending as
chaos crescendo.

## [WILD] Shout cards
Cards that activate by literally saying the phrase before the roller's result
resolves (honor system, Uno-style). Discord-native, zero code beyond a toast.

---

## Recommended first playable

Death Row + dual-use rigging + The Kitty + Call It.
One new board element, three rules, complete drama engine.
Then layer: Insurance → wagers → Ghost Justice → Overtime.

## Open questions (settle by playtest, not theory)
1. Rig cost: flat 1 mana vs. priced per slot (6 costs more?)
2. Executions target roller: always allowed (recommended) or owner-only-others?
3. Rail capacity: infinite stacking vs. 2-card cap per slot?
4. Do rigged cards expire (round timer) or persist until fired?
5. Hot-seat hidden info: how to hide rig identity when passing one device
   (proposal: rig menu shows only card COUNT per slot to non-owners)
