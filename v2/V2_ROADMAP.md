# Death Dice V2 — Incorporation Roadmap

> How the Vision & Design Philosophy document (DESIGN.md) reshapes the game.
> V1 stays intact at `game/` (port 5500). V2 evolves here (port 5501).

---

## The honest audit: where V1 fights the GDD

| GDD demand | V1 reality | Verdict |
|---|---|---|
| Multiplayer party game, table politics | 2-player hot-seat duel | **Rebuild.** Politics/kingmaking/alliances mathematically require 3+ players |
| Dice are the heart, table-wide tension | Dice = personal mana faucet + under-roll penalty | **Re-aim.** Rolls must matter to everyone at the table |
| Bluffing, hidden info, reading people | Zero hidden info beyond hand contents | **Add.** Face-down cards, secret objectives, wagers |
| Reaction cards central (mezzo layer) | "Free cards anytime" rule exists but no interrupt system | **Build.** Reaction windows are the fun layer |
| Blue Shell — leader pressure | Nothing targets the leader | **Add.** Bounty system |
| Constant comeback potential | Behind = just losing | **Add.** Desperation mechanics |
| Heroes are personalities, not stat blocks | Role-template abilities (Support heals 3…) | **Redesign.** Archetype kits with signature moments + weaknesses |
| Fast decisions, no spreadsheet math | Attack modifiers, status stacking, durations | **Diet.** Smaller numbers, fewer modifiers |
| 15–25 min matches | Untested at length | Measure once N-player exists |

**What carries forward untouched:** all card art, the 3D dice, drawn stat gems +
status pills, canvas targeting system, effect engine, seat-panel UI (built for
N players already), auto-roll countdown, toasts/juice. The fork re-aims the
game; it does not restart it.

---

## V2 mechanics — each traced to a pillar

### Phase 1 — The Table (enables everything else)
- **N-player core (2–8):** `players[]` array replaces hardcoded p1/p2; turn
  ring; seat row across the top (one compact seat per opponent); pick-a-victim
  targeting on every attack/card. *Pillar: Social Gameplay First.*
- Pass-the-device hot-seat flow for now; architecture keeps state serializable
  so Discord/network play stays possible later.

### Phase 2 — Dice Drama
- **Table wagers:** before the active player rolls, every other player may
  wager (a card or 1 HP) on OVER/UNDER 3.5. Right = draw; wrong = pay. Ten
  seconds of table-wide screaming per roll. *Maximum Drama + Social.*
- **Table Quake on 6s:** rolling a 6 still resets the requirement AND triggers
  a global event (everyone discards/draws/takes 1…) from a chaos table.
  *Controlled Chaos.*
- **Push-your-luck reroll:** after seeing your roll, you may reroll ONCE at the
  cost of 2 HP. Bad roll → interesting decision, exactly as the GDD demands.
  *Controlled Chaos + Drama.*

### Phase 3 — Bluffing & Reactions (the mezzo layer)
- **Trap cards:** some action cards can be played FACE-DOWN in front of you;
  they trigger on a condition (attacked, targeted, wagered against). Bluff by
  placing duds. *Bluffing / hidden information.*
- **Reaction windows:** when an attack or big card is declared, play pauses —
  any player may throw a reaction card ("Not today!", redirects, taxes).
  *Reaction cards, interaction, counterplay.*
- **The Deal:** free action — publicly gift a card to any player. Alliance
  fuel; betrayal fuel. Zero rules text, maximum politics. *Social First.*

### Phase 4 — Blue Shell & Comebacks
- **The Bounty Skull:** the current leader (HP + board) visibly wears it.
  Damaging them draws you a card; killing their character pays two. Leading
  feels dangerous, never unfair. *Blue Shell.*
- **Desperation:** lowest-HP player rolls TWO dice and keeps either, and shops
  at a discount. Last place always believes. *Comeback Potential.*

### Phase 5 — Heroes as Personalities
- Replace role templates with **archetype kits** — The Gambler (coin-flip
  payoffs), The Coward (thrives while hiding), The Revenge King (grows when
  hit), The Wildcard (random chaos), The Leech, The Showman… Each kit = one
  signature moment + one public weakness, written fantasy-first.
- The 50 existing hero arts distribute across kits; names/flavor stay.
  *Hero Philosophy.* (The earlier per-hero ability outline is superseded by
  this document's philosophy — personalities over ability lists.)

### Phase 6 — Ghosts, Metrics, Simulation
- **Ghost hand:** eliminated players draw small reaction-only hands — dead but
  never gone, still yelling in Discord. *"Never feel eliminated."*
- **Excitement telemetry:** log lead changes, reactions played, comebacks,
  damage swings → on-screen post-game "Match Story" recap (already a party
  feature by itself).
- **Personality bots** (Aggressive/Greedy/Vengeful/Chaotic/Political) driving a
  headless simulator that maximizes the Excitement Index. *Simulation
  Philosophy.*

---

## Numbers diet (Fast Decisions)
- HP 20 → **15** (faster games, every hit is scarier)
- Damage values 1–4 only; attack modifiers capped at ±2
- One status per character at a time (newest replaces) — no stacking math
- Hand limit stays small; turns should be < 45 seconds

## The test for every future mechanic
**"Will this make people yell in Discord?"** — if unclear, prototype it in a
chaos table entry first; promote it only if it produces stories.
