// ─── Inline Game Data ─────────────────────────────────────────────────────────
// All 50 heroes are populated from card filenames. Fill in real stats below.
// Rules + actions + status effects follow at the bottom.

const GAME_DATA_INLINE = {

// ─── HEROES ──────────────────────────────────────────────────────────────────
// Placeholder stats: fill in manaCost, hp, baseAttack, role, passives, abilities
heroes: [
  {
    "id": "hero_afrodisiac",
    "name": "Afrodisiac",
    "imageAsset": "DD_Afrodisiac.png",
    "stage": "S1",
    "manaCost": 4,
    "hp": 20,
    "baseAttack": 3,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Balanced",
    "archetype": "Seducer",
    "docAbility": "Ability: Chocolate Clams (3 mana): Inflict Charmed status on an enemy hero/player for 3 turns. Charmed (debuff): Enemy hero/player affected with Charmed status can’t attack, debuff, Safeguard or dodge attacks player and/or hero that inflicted it.",
    "rolePassive": {
      "name": "Enact",
      "description": "Roll 4-6 to draw and cast one free action."
    }
  },
  {
    "id": "hero_aegalien",
    "name": "Cerulien",
    "imageAsset": "DD_Cerulien.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 3,
    "role": "Fighter",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "IQ",
    "archetype": "Omniscient",
    "docAbility": "Ability: Lapis Lazuli (4 mana): Deal 2 dmg, also inflicting Impaired & Crippled statuses to enemy hero/player for 3 turns. Impaired (debuff): Impaired heroes/player deal only half dmg for the duration. Cripple (debuff): Crippled heroes/player receive x2 damage for the duration.",
    "rolePassive": {
      "name": "Foresight",
      "description": "Gain early 2-turn access to hero & action cards in the shop."
    }
  },
  {
    "id": "hero_aster_roid",
    "name": "Aster Roid",
    "imageAsset": "DD_Aster_Roid.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 20,
    "baseAttack": 6,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Strength",
    "archetype": "Juggernaut",
    "docAbility": "Ability: Roid Rage (4 mana): Stim player & Aster Roid for 3 turns. Stim (buff/debuff): Gain 50% overhealth & x3 attack damage, but you’re also inflicted with Anemic & Crippled statuses.",
    "rolePassive": {
      "name": "Crit-Hit Chance",
      "description": "Increased 1 / 3 crit-hit chance for all heroes & player."
    }
  },
  {
    "id": "hero_baller_ina",
    "name": "Baller-ina",
    "imageAsset": "DD_Baller-ina.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 12,
    "baseAttack": 2,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Agility",
    "archetype": "Athlete",
    "docAbility": "Ability: Basket-Ballad (2 mana): Duel enemy hero/player: deal 5 dmg & gain Sidestep if you win. Duel (duel event): Opens a duel window. Win condition triggers on a win. Tie results in neither player taking damage. Loss makes the hero who initiated duel take the number of damage that they lost by. Sidestep (dodge event): Incoming attack/debuff to a hero/player who activated Sidestep opens an event window. Rolling 1-3 results in a fail, rolling 4-6 results in a successful dodge.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "Captain and player have a 1/2 chance to dodge incoming attacks or debuffs with a 4-6 roll."
    }
  },
  {
    "id": "hero_bearzerk",
    "name": "Bearzerk",
    "imageAsset": "DD_Bearzerk.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 24,
    "baseAttack": 6,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Strength",
    "archetype": "Predator",
    "docAbility": "Ability: Bearzerker Rampage (6 mana): Deal 6 dmg to all enemy heroes/player & gain 1 HP for each killed.",
    "rolePassive": {
      "name": "Crit-Hit Chance",
      "description": "Increased 1 / 3 crit-hit chance for all heroes & player."
    }
  },
  {
    "id": "hero_beeatrice",
    "name": "Buzz Kill",
    "imageAsset": "DD_Buzz-Kill.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 3,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Agility",
    "archetype": "Insect",
    "docAbility": "Ability: Stinging Barbs (4 mana): Deal 3 to 2 enemies (6 if they were debuffed).",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "Captain and player have a 1/2 chance to dodge incoming attacks or debuffs with a 4-6 roll."
    }
  },
  {
    "id": "hero_breast_knuckle",
    "name": "Breast Knuckle",
    "imageAsset": "DD_Breast_Knuckle.png",
    "stage": "S1",
    "manaCost": 4,
    "hp": 20,
    "baseAttack": 4,
    "role": "Fighter",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Technique",
    "archetype": "Brawler",
    "docAbility": "Ability: Bust Thrust (4 mana): Duel enemy hero/player: deal 6 dmg, Impede, & Cripple if you win. Duel (duel event): Opens a duel window. Win condition triggers on a win. Tie results in neither player taking damage. Loss makes the hero who initiated duel take the number of damage that they lost by. Impeded (debuff): Impeded heroes/player can’t use attacks or abilities for the duration. Crippled (debuff): Crippled heroes/player receive x2 damage for the duration.",
    "rolePassive": {
      "name": "Duelist",
      "description": "2 / 3 chance for captain to win duels by rolling 3-6."
    }
  },
  {
    "id": "hero_bro_chill",
    "name": "Aplombinable",
    "imageAsset": "DD_Aplombinable.png",
    "stage": "S1",
    "manaCost": 6,
    "hp": 28,
    "baseAttack": 5,
    "role": "Control",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Legendary",
    "docAbility": "Ability: Chill Out! (5 mana): Cleanse & heal 3 HP to all ally heroes/player. Aplomb (Hero Passive): 1 / 2 chance (roll 4-6 on reg die) to Cleanse & 2 HP to player/Aplombinable. Cleanse (sustain): Ally player/heroes who are Cleansed remove all debuff effects inflicted on them.",
    "rolePassive": {
      "name": "Invocation",
      "description": "Legendary captain passives stay active as long as the hero is alive and deployed."
    }
  },
  {
    "id": "hero_cath_eine",
    "name": "Cath-eine",
    "imageAsset": "DD_Cath-eine.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 8,
    "baseAttack": 1,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Agility",
    "archetype": "Neurotic",
    "docAbility": "Ability: Caffeine Rush (3 mana): Gain Accelerate for 2 turns & Sidestep while dealing 2 dmg to enemy hero/player (+1 dmg to base attack). Accelerate (buff): Accelerated heroes/player can perform an extra action each turn (ability, base attack, action card cast player). Sidestep (dodge event): Incoming attack/debuff to a hero/player who activated Sidestep opens an event window. Rolling 1-3 results in a fail, rolling 4-6 results in a successful dodge.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "Captain and player have a 1/2 chance to dodge incoming attacks or debuffs with a 4-6 roll."
    }
  },
  {
    "id": "hero_cheatah",
    "name": "Cheatah",
    "imageAsset": "DD_Cheatah.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 16,
    "baseAttack": 2,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Speed",
    "archetype": "Thief",
    "docAbility": "Ability: Cheetah Code (4 mana): Rulebreak once this turn. Rulebreak allows you to Draw extra action or hero card, extra hand discard, extra character on field, re-roll die during any die roll & negate previous fail damage, heal 2 HP to hero card or player icon/HUD.",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action-card slot while this hero is captain."
    }
  },
  {
    "id": "hero_chicki_barstooli",
    "name": "Chicki Barstooli",
    "imageAsset": "DD_Chicki_Barstooli.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 8,
    "baseAttack": 2,
    "role": "Fighter",
    "passives": [
      {
        "name": "Petite Petulance",
        "description": "If you fail die roll or Event, you deal x3 damage for next 2 rounds."
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Passive",
    "archetype": "Boozer",
    "docAbility": "Petite Petulance (Hero Passive): Taking damage results in dealing x2 damage for 3 turns (only applies to Barstooli and player unless she’s in captain slot).",
    "rolePassive": {
      "name": "Imbue",
      "description": "Captain shares passive pressure with the player and allied heroes for 3 turns."
    }
  },
  {
    "id": "hero_copy_cat",
    "name": "Copy-Cat",
    "imageAsset": "DD_Copy-Cat.png",
    "stage": "S2",
    "manaCost": 2,
    "hp": 8,
    "baseAttack": 2,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Agility",
    "archetype": "Multiplier",
    "docAbility": "Ability: Meowrox (1 mana): Duplicate an action card to cast for free or click Copy-Cat to create Copy. Copy (spawn): Copy-Cat can copy himself to stay in the fray with his same Meowrox ability.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "Captain and player have a 1/2 chance to dodge incoming attacks or debuffs with a 4-6 roll."
    }
  },
  {
    "id": "hero_cut_lass",
    "name": "Cut-Lass",
    "imageAsset": "DD_Cut-Lass.png",
    "stage": "S1",
    "manaCost": 4,
    "hp": 16,
    "baseAttack": 4,
    "role": "Duelist",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Technique",
    "archetype": "Thief",
    "docAbility": "Ability: Booty Brawl (3 mana): Duel enemy: deal 4 dmg, Loot 2 mana & 1 action card from enemy if you win. Duel (duel event): Opens a duel window. Win condition triggers on a win. Tie results in neither player taking damage. Loss makes the hero who initiated duel take the number of damage that they lost by. Loot (theft): Choose to steal 1 action card from an enemy player’s hand & 2 mana from their mana pool.",
    "rolePassive": {
      "name": "Duelist",
      "description": "2 / 3 chance for captain to win duels by rolling 3-6."
    }
  },
  {
    "id": "hero_determinator",
    "name": "De-Terminator",
    "imageAsset": "DD_De-Terminator.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 28,
    "baseAttack": 4,
    "role": "Tank",
    "passives": [
      {
        "name": "De-Termination",
        "description": "You possess the robotic resilience to survive 1 lethal hit, allowing hero to regen 9 overhealth & if you die, respawn with 15 HP"
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Durability",
    "archetype": "Mercenary",
    "docAbility": "De-Termination (Hero Passive): Avoid death once: gain 6 overhealth when you fall to critical HP.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Captain absorbs damage and debuffs that would hit the player or other heroes, taking x1.5 damage rounded up."
    }
  },
  {
    "id": "hero_disc_jockey",
    "name": "Disc Jockey",
    "imageAsset": "DD_Disc_Jockey.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 20,
    "baseAttack": 1,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Speed",
    "archetype": "Medic",
    "docAbility": "Ability: Ambient Heal (3 mana): Heal player & all heroes for up to 4 HP.",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action-card slot while this hero is captain."
    }
  },
  {
    "id": "hero_dread_locks",
    "name": "Dread-Locks",
    "imageAsset": "DD_Dread-Locks.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 20,
    "baseAttack": 3,
    "role": "Control",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Balanced",
    "archetype": "Thief",
    "docAbility": "Ability: Locked-Out (3 mana): Duel enemy, deal 3 dmg & lock shop from enemy player for up to 3 turns if you win. Duel (duel event): Opens a duel window. Win condition triggers on a win. Tie results in neither player taking damage. Loss makes the hero who initiated duel take the number of damage that they lost by. Lock (denial): Locks deny a player access to the shop for the duration.",
    "rolePassive": {
      "name": "Enact",
      "description": "Roll 4-6 to draw and cast one free action."
    }
  },
  {
    "id": "hero_equinox",
    "name": "Equinox",
    "imageAsset": "DD_Equinox.png",
    "stage": "S3",
    "manaCost": 7,
    "hp": 32,
    "baseAttack": 5,
    "role": "Leader",
    "passives": [
      {
        "name": "Stellar Stability",
        "description": "Heal 2 HP & cleanse 2 debuffs for each successful die roll on your team Celestial Cavalry (6): Heal 4 HP & grant all allies ACCELERATED status"
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Legendary",
    "archetype": "Celestial",
    "docAbility": "Ability: Swift Squall (6 mana): Accelerate & Augment all ally heroes/player for next 3 turns. Stellar Stability (Hero Passive): Cleanse & heal 3 HP to all ally heroes/player upon successful die roll. Cleanse (sustain): Ally player/heroes who are Cleansed remove all debuff effects inflicted on them. Augment (buff): Augmented ally heroes & players deal x2 dmg for duration.",
    "rolePassive": {
      "name": "Invocation",
      "description": "Legendary captain passives stay active as long as the hero is alive and deployed."
    }
  },
  {
    "id": "hero_fryborg",
    "name": "Fry-Borg",
    "imageAsset": "DD_Fry-Borg.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 24,
    "baseAttack": 4,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Technique",
    "archetype": "Greaser",
    "docAbility": "Ability: Sci-Fry (4 mana): Duel enemy: deal 3 dmg & inflict Burning status to enemy player/hero if you win. Duel (duel event): Opens a duel window. Win condition triggers on a win. Tie results in neither player taking damage. Loss makes the hero who initiated duel take the number of damage that they lost by. Burning (debuff): Burning players/heroes take 3 damage every turn (friendly or enemy) & lose half their action cards. Frozen cancels this out.",
    "rolePassive": {
      "name": "Duelist",
      "description": "2 / 3 chance for captain to win duels by rolling 3-6."
    }
  },
  {
    "id": "hero_geezer_freezer",
    "name": "Geezer Freezer",
    "imageAsset": "DD_Geezer_Freezer.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 20,
    "baseAttack": 2,
    "role": "Tank",
    "passives": [
      {
        "name": "Frozen Assets",
        "description": "Deploy your freezer to act as a VAULT to hold x2 action, hero, and skill cards in your deck. (Place Vault equipment card by your hero)"
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Passive",
    "archetype": "Subzero",
    "docAbility": "Frozen Assets (Hero Passive): Deal 2 damage, also inflicting Frozen status to enemy hero/player if debuffed or looted. Frozen (debuff): Frozen heroes/player receive x2 dmg & can’t attack or use abilities.",
    "rolePassive": {
      "name": "Imbue",
      "description": "Captain shares passive pressure with the player and allied heroes for 3 turns."
    }
  },
  {
    "id": "hero_ghoulia",
    "name": "Ghoulia",
    "imageAsset": "DD_Ghoulia.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 3,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Agility",
    "archetype": "Ghoul",
    "docAbility": "Ability: Ex-Hex (4 mana): Deal 3 dmg & inflict Haunted status on enemy hero/player for up to 3 turns. Haunted (debuffed): Haunted heroes/players take 2 dmg each turn (friendly turns only) & can’t attack or use abilities.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "Captain and player have a 1/2 chance to dodge incoming attacks or debuffs with a 4-6 roll."
    }
  },
  {
    "id": "hero_giant_jess",
    "name": "Giant-Tessa",
    "imageAsset": "DD_Giant_Tessa.png",
    "stage": "S3",
    "manaCost": 4,
    "hp": 20,
    "baseAttack": 5,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Strength",
    "archetype": "Kaiju",
    "docAbility": "Ability: Titaness Toss: (4 mana): Deal 6 dmg to 2 enemies (Safeguarding hero protects 1).",
    "rolePassive": {
      "name": "Crit-Hit Chance",
      "description": "Increased 1 / 3 crit-hit chance for all heroes & player."
    }
  },
  {
    "id": "hero_goosebump",
    "name": "Goose-Bump",
    "imageAsset": "DD_Goose-Bump.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 8,
    "baseAttack": 3,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Speed",
    "archetype": "Infector",
    "docAbility": "Ability: Avian Flu (3 mana): Deal 4 dmg & inflict Rabies status on enemy hero/player (Augmented next 2 turns). Rabies (buff/debuff): Heroes/players with Rabies can spread Rabies to enemies attacked, but can’t be healed, receive x2 damage, take Poison damage each turn, & have a 1 / 2 chance to spread it to other heroes/player. Poisoned (debuff): Poisoned enemies take 2 dmg each friendly turn. Augment (buff): Augmented ally heroes & players deal x2 dmg for duration.",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action-card slot while this hero is captain."
    }
  },
  {
    "id": "hero_gorgon_zola",
    "name": "Gorgon-Zola",
    "imageAsset": "DD_Gorgon_Zola.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 24,
    "baseAttack": 2,
    "role": "Control",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Mana",
    "archetype": "Gourmand",
    "docAbility": "Ability: Say Cheese! (4 mana): Deal 1 dmg, also inflicting Edible status to enemy hero/player for 3 turns. Edible (debuff): Edible heroes/player can’t attack or use abilities & enemies can attack them to heal 2 HP (4 on lethal hits).",
    "rolePassive": {
      "name": "Enchant",
      "description": "1/2 chance to gain 3 mana from successful die rolls, bypassing the mana cap."
    }
  },
  {
    "id": "hero_hip_hop_papa",
    "name": "Hip-Hop Papa",
    "imageAsset": "DD_Hip_Hop_Papa.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 16,
    "baseAttack": 2,
    "role": "Duelist",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Mana",
    "archetype": "Dancer",
    "docAbility": "Ability: Breakback Breakdance (3 mana):1 / 2 chance to deal 4 dmg (Unblockable) & Impede all enemy heroes/player; 1 / 2 chance for Papa/player to be Impeded 2 turns & take 4 dmg. Impede:",
    "rolePassive": {
      "name": "Enchant",
      "description": "1/2 chance to gain 3 mana from successful die rolls, bypassing the mana cap."
    }
  },
  {
    "id": "hero_in_specter",
    "name": "In-Specter",
    "imageAsset": "DD_In-Specter.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 16,
    "baseAttack": 1,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "IQ",
    "archetype": "Investigator",
    "docAbility": "Ability: Sleuth Seance (3 mana): Draw & cast any action card you want for free.",
    "rolePassive": {
      "name": "Foresight",
      "description": "Gain early 2-turn access to hero & action cards in the shop."
    }
  },
  {
    "id": "hero_iron_maid",
    "name": "Iron Maid",
    "imageAsset": "DD_Iron_Maid.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 36,
    "baseAttack": 1,
    "role": "Tank",
    "passives": [
      {
        "name": "Iron Curtains",
        "description": "Your metallical mastery allows you to regen 1 HP each round & to also cleanse 2 Debuffs from any player on your team per round."
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Durability",
    "archetype": "Caregiver",
    "docAbility": "Vacuum Cleaner (Hero Passive): Cleanse & Absorb debuffs, healing all other heroes/player 2 HP for each. Absorb (sustain): Absorbed debuffs convert to 2 HP heal for each.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Captain absorbs damage and debuffs that would hit the player or other heroes, taking x1.5 damage rounded up."
    }
  },
  {
    "id": "hero_juju_jitsu",
    "name": "Juju-Jitsu",
    "imageAsset": "DD_Juju_Jitsu.png",
    "stage": "S1",
    "manaCost": 5,
    "hp": 16,
    "baseAttack": 4,
    "role": "Fighter",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Technique",
    "archetype": "Shaman",
    "docAbility": "Ability: Vooduel (4 mana): Duel enemy, dealing 4 dmg & inflict Jinxed status to enemy hero/player if you win. Jinxed (debuff): Jinxed heroes/player take the amount of damage they dealt to the hero/player that inflicted the jinx.",
    "rolePassive": {
      "name": "Duelist",
      "description": "2 / 3 chance for captain to win duels by rolling 3-6."
    }
  },
  {
    "id": "hero_kevlard",
    "name": "Kev-Lard",
    "imageAsset": "DD_Kev-Lard.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 40,
    "baseAttack": 2,
    "role": "Tank",
    "passives": [
      {
        "name": "Lard Guard",
        "description": "Your extremely high body fat provides you with 10 overhealth & you can also regen 5 HP if you roll a 6 (Place Adipose equipment card on hero)"
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Durability",
    "archetype": "Gourmand",
    "docAbility": "Lard Guard (Hero Passive): Hero has 8 armor & 1 out of 3 chance to Ricochet damage. Ricochet (deflection): Incoming damage activates die event window where 1-4 results in a fail taking damage, rolling 5-6 Ricochets successfully). Die event windows should have one die in the center instead of the two dies for duels.Die event windows when relevant should activate after reg die rolls at beginning of a player’s turn.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Captain absorbs damage and debuffs that would hit the player or other heroes, taking x1.5 damage rounded up."
    }
  },
  {
    "id": "hero_lassquach",
    "name": "Lassquatch",
    "imageAsset": "DD_Lassquatch.png",
    "stage": "S1",
    "manaCost": 4,
    "hp": 20,
    "baseAttack": 5,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Strength",
    "archetype": "Conservator",
    "docAbility": "Ability Sass-Squash (4 mana): Deal 6 dmg & Impede enemy hero/player (deal 12 if below half HP). Impeded (debuff): Impeded heroes/player can’t use attacks or abilities for the duration. Crippled (debuff): Crippled heroes/player receive x2 damage for the duration.",
    "rolePassive": {
      "name": "Crit-Hit Chance",
      "description": "Increased 1 / 3 crit-hit chance for all heroes & player."
    }
  },
  {
    "id": "hero_lone_wolf",
    "name": "Lone Wolf",
    "imageAsset": "DD_Lone_Wolf.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 16,
    "baseAttack": 2,
    "role": "Agile",
    "passives": [
      {
        "name": "Solo El Lobo",
        "description": "For each hero your team doesn’t have, you deal +1🩸with attacks. For each ally that is dead, deal +2🩸with any attack. (Place Fury status card on hero)."
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Passive",
    "archetype": "Mercenary",
    "docAbility": "Solo El Lobo (Hero Passive): Base attack & action card casts deal x2 dmg if only hero on field (x3 if player is 10 HP or below).",
    "rolePassive": {
      "name": "Imbue",
      "description": "Captain shares passive pressure with the player and allied heroes for 3 turns."
    }
  },
  {
    "id": "hero_marionetta",
    "name": "Marionetta",
    "imageAsset": "DD_Marionetta.png",
    "stage": "S3",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 2,
    "role": "Control",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "IQ",
    "archetype": "Schemer",
    "docAbility": "Ability: Puppeteer (4 mana): Hypnotizing an enemy hero card, making them join your side for 2 turns.",
    "rolePassive": {
      "name": "Foresight",
      "description": "Gain early 2-turn access to hero & action cards in the shop."
    }
  },
  {
    "id": "hero_mob_barley",
    "name": "Don Vino",
    "imageAsset": "DD_Don_Vino.png",
    "stage": "S2",
    "manaCost": 6,
    "hp": 24,
    "baseAttack": 5,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Legendary",
    "archetype": "Boozer",
    "docAbility": "Ability:Tapped Out (6 mana): All enemy heroes & player are Impeded & take 3 dmg. Wasted (Hero Passive): Die event fails will inflict enemy player/captain hero with Drunk status when Don Vino is deployed. Drunk (debuff): Drunk enemy heroes/players have a 1 / 2 chance to take self-damage/debuff on base attack/ability casts or lose action cards they attempt to cast.",
    "rolePassive": {
      "name": "Invocation",
      "description": "Legendary captain passives stay active as long as the hero is alive and deployed."
    }
  },
  {
    "id": "hero_mr_immutable",
    "name": "Mr. Immutable",
    "imageAsset": "DD_Mr._Immutable.png",
    "stage": "S3",
    "manaCost": 5,
    "hp": 32,
    "baseAttack": 3,
    "role": "Tank",
    "passives": [
      {
        "name": "Immutability",
        "description": "Your innate Immutability renders you immune to receiving any Debuffs (except for Influences), but also means you can’t receive buffs (except for Heals) either."
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Durability",
    "archetype": "Paragon",
    "docAbility": "Immutability (Hero Passive): Hero (& player while in captain slot) are immune to debuffs.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Captain absorbs damage and debuffs that would hit the player or other heroes, taking x1.5 damage rounded up."
    }
  },
  {
    "id": "hero_mumma_mia",
    "name": "Mumma Mia",
    "imageAsset": "DD_Mumma_Mia.png",
    "stage": "S2",
    "manaCost": 7,
    "hp": 24,
    "baseAttack": 6,
    "role": "Support",
    "passives": [
      {
        "name": "Out of Tomb",
        "description": "Choose who between self or one of your allies to give BABY equipment card to. Mommy’s Curse (5): Inflict Cursed status to enemy (which can’t be cleansed if BABY is killed)"
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Legendary",
    "archetype": "Cryptic",
    "docAbility": "Ability: Out of the Tomb (6 mana): Summon Baby which heals 3 HP and Cleanses from player/all heroes. Mummy Scorned (Hero Passive): When Baby is killed, deal 5 dmg (Unstoppable) & inflict Curse to all enemy heroes/player for 3 turns. Cursed (status): Player can only roll up to 3 on their die when Cursed, don’t recieve healing, tdeal half dmg, take x2 dmg, & die roll fails hurt all their heroes (Unstoppable).",
    "rolePassive": {
      "name": "Invocation",
      "description": "Legendary captain passives stay active as long as the hero is alive and deployed."
    }
  },
  {
    "id": "hero_prowl_ball",
    "name": "Prowl Ball",
    "imageAsset": "DD_Prowl_Ball.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 20,
    "baseAttack": 3,
    "role": "Duelist",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Balanced",
    "archetype": "Pitcher",
    "docAbility": "Ability: Claw Strikeout (3 mana): 2 out of 3 chance to deal 4 dmg & Impede enemy hero (Unblockable).",
    "rolePassive": {
      "name": "Enact",
      "description": "Roll 4-6 to draw and cast one free action."
    }
  },
  {
    "id": "hero_riff_wrath",
    "name": "Riff Wrath",
    "imageAsset": "DD_Riff_Wrath.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 20,
    "baseAttack": 3,
    "role": "Fighter",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Balanced",
    "archetype": "Amplifier",
    "docAbility": "Ability: Strike a Chord (3 mana): Deal 3 dmg (along with Impede) to enemy. Impeded (debuff): Impeded heroes/player can’t use attacks or abilities for the duration.",
    "rolePassive": {
      "name": "Enact",
      "description": "Roll 4-6 to draw and cast one free action."
    }
  },
  {
    "id": "hero_ruby_goldberg",
    "name": "Ruby Goldberg",
    "imageAsset": "DD_Ruby_Goldberg.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 8,
    "baseAttack": 1,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "IQ",
    "archetype": "Architect",
    "docAbility": "Ability: Goldberg Chain: Unleash a Stack that deals a base 1 dmg (+1 for each enemy (heroes & player) & Impairs durability hero if they’re Safeguarding). Stack (denominator): A Stack when deployed deals base 1 (with 1 player) adding +1 dmg per hero on field to attack the number of player/heroes. Shell-Shock (should be in Mana roll): Ability: Static Splash (5 mana): Deal 4 dmg & inflict Shocked status in all enemy player/heroes. Shocked (debuff): After regular die roll, die event window opens up for Shocked player/heroes to roll a die: Roll 1-2 will result in Shocked hero dying (regardless of remaining HP) and player being able to cast cards, abilities, or attack, Roll 3-4 will result in player & hero being Impeded and taking 3 dmg, and roll 5-6 to taking 1 dmg.",
    "rolePassive": {
      "name": "Foresight",
      "description": "Gain early 2-turn access to hero & action cards in the shop."
    }
  },
  {
    "id": "hero_shell_shocked",
    "name": "Shell-Shock",
    "imageAsset": "DD_Shell-Shock.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 24,
    "baseAttack": 4,
    "role": "Tank",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Mana",
    "archetype": "Marine",
    "docAbility": "Ability: Static Splash (5 mana): Deal 4 dmg & inflict Shocked status in all enemy player/heroes. Shocked (debuff): After regular die roll, die event window opens up for Shocked player/heroes to roll a die: Roll 1-2 will result in Shocked hero dying regardless of remaining HP and player being unable to cast cards, abilities, or attack, Roll 3-4 will result in player & hero being Impeded and taking 3 dmg, and roll 5-6 to taking 1 dmg.",
    "rolePassive": {
      "name": "Enchant",
      "description": "1/2 chance to gain 3 mana from successful die rolls, bypassing the mana cap."
    }
  },
  {
    "id": "hero_shish_ke_bob",
    "name": "Shish-Ke-Bob",
    "imageAsset": "DD_Shish-Ke-Bob.png",
    "stage": "S1",
    "manaCost": 4,
    "hp": 20,
    "baseAttack": 3,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Balanced",
    "archetype": "Foodie",
    "docAbility": "Ability: Kebab Skewer (3 mana): 2 out of 3 chance to deal 3 dmg, also inflicting Anemic & Impede (for 3 turns) on enemy hero/player. Anemic (debuff): Anemic players/heroes can’t receive healing. Anemic players/heroes can’t receive healing. Impeded (debuff): Impeded heroes/player can’t use attacks or abilities for the duration.",
    "rolePassive": {
      "name": "Enact",
      "description": "Roll 4-6 to draw and cast one free action."
    }
  },
  {
    "id": "hero_sir_ringe",
    "name": "Sir Ringe",
    "imageAsset": "DD_Sir_Ringe.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 16,
    "baseAttack": 2,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "IQ",
    "archetype": "Chemist",
    "docAbility": "Ability: Biotic Syringe (4 mana): Deal 4 dmg & inflict Anemic to enemy OR heal 4 HP & Cleanse player/hero. Cleanse (sustain): Ally player/heroes who are Cleansed remove all debuff effects inflicted on them. Anemic (debuff): Anemic players/heroes can’t receive healing.",
    "rolePassive": {
      "name": "Foresight",
      "description": "Gain early 2-turn access to hero & action cards in the shop."
    }
  },
  {
    "id": "hero_slendeer",
    "name": "Slendeer",
    "imageAsset": "DD_Slendeer.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 16,
    "baseAttack": 2,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Speed",
    "archetype": "Conservator",
    "docAbility": "Ability: Deer Dash (2 mana): Deal 3 dmg while Accelerating & Cleansing. Cleanse (sustain): Ally player/heroes who are Cleansed remove all debuff effects inflicted on them. Accelerated (buff): Accelerated heroes/player can perform an extra action each turn (ability, base attack, action card cast for player).",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action-card slot while this hero is captain."
    }
  },
  {
    "id": "hero_stallwart",
    "name": "Stall-Wart",
    "imageAsset": "DD_Stall-Wart.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 40,
    "baseAttack": 1,
    "role": "Tank",
    "passives": [
      {
        "name": "Stalliwog",
        "description": "Deploy your Swamp Shield to protect your team, providing 10 overhealth & regens 2 overhealth each round (Place Barrier equipment by hero)"
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Durability",
    "archetype": "Guardian",
    "docAbility": "Stalliwog (Hero Passive): Hero has 10 shield health. Shield health regenerates 5 HP every 2 turns.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Captain absorbs damage and debuffs that would hit the player or other heroes, taking x1.5 damage rounded up."
    }
  },
  {
    "id": "hero_trollnet",
    "name": "Cyber-Trolly",
    "imageAsset": "DD_Cyber-Trolly.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 24,
    "baseAttack": 2,
    "role": "Control",
    "passives": [
      {
        "name": "Trolljan Virus",
        "description": "Deploy Malware to inflict VIRUS status to first enemy that fails a die roll or Event during a round. (Place Malware Event at the center of the table)"
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Passive",
    "archetype": "Provocateur",
    "docAbility": "Trolljan Virus (Hero Passive): Hero & player immune to Impede & has 1 / 2 chance to inflict Virus when Reflecting debuff. Virus (debuff): Players infected by Virus can’t cast any cards or buy hero cards in shop. Reflect (deflection): Opens a die event window where other player rolls 1-3 to get reflected at or 4-6 to reflect back.",
    "rolePassive": {
      "name": "Imbue",
      "description": "Captain shares passive pressure with the player and allied heroes for 3 turns."
    }
  },
  {
    "id": "hero_trophy_wife",
    "name": "Trophy Wife",
    "imageAsset": "DD_Trophy_Wife.png",
    "stage": "S2",
    "manaCost": 2,
    "hp": 12,
    "baseAttack": 1,
    "role": "Duelist",
    "passives": [
      {
        "name": "Trophy Case",
        "description": "If you succeed on die roll, you can draw a free hero card. If you won a duel or succeeded on an Event, you can draw a free skill card & are rewarded an extra Event die"
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Passive",
    "archetype": "Fitness",
    "docAbility": "Prized Possession (Hero Passive): Successful die rolls lead to gain 3 mana & drawing action card that’s free to cast.",
    "rolePassive": {
      "name": "Imbue",
      "description": "Captain shares passive pressure with the player and allied heroes for 3 turns."
    }
  },
  {
    "id": "hero_tyrantosaurus",
    "name": "Tyrantosaurus",
    "imageAsset": "DD_Tyrantosaurus.png",
    "stage": "S3",
    "manaCost": 5,
    "hp": 24,
    "baseAttack": 6,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Strength",
    "archetype": "Conqueror",
    "docAbility": "Ability: Dino Dominion (6 mana): Deal 8 dmg to enemy player/hero, Capturing another enemy hero if it kills. Capture (bondage): [Captured enemy will be on the other player’s field to the far left. A Captured enemy hero will be killed in 3 turns if Tyrantosaurus isn’t killed by then. If Tyrantosaurus is killed, the Captured hero is set free. Captures are an exception to the 5 hero on field limit.",
    "rolePassive": {
      "name": "Crit-Hit Chance",
      "description": "Increased 1 / 3 crit-hit chance for all heroes & player."
    }
  },
  {
    "id": "hero_val_cano",
    "name": "Volley-Cano",
    "imageAsset": "DD_Volley-Cano.png",
    "stage": "S2",
    "manaCost": 7,
    "hp": 28,
    "baseAttack": 6,
    "role": "Ranged",
    "passives": [
      {
        "name": "Temperature Tantrum",
        "description": "Any damage you take will make your next attack deal +3 🩸& inflict BURNING status . Volcano Spike (6): All enemies who fail to roll a 5-6 will take 4🩸& be inflicted with BURNING status."
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Legendary",
    "archetype": "Volcan",
    "docAbility": "Ability: Volcanic Volley (6 mana): Deal 5 dmg & inflict Burning status to all enemy heroes & player (for 3 turns). Temperature Tantrum (Hero Passive): Deal 5 dmg to all enemies & inflict Burning status if critical (25% but not 0) HP. Burning (debuff): Burning players/heroes take 3 damage every turn (friendly or enemy) & lose half their action cards. Frozen cancels this out.",
    "rolePassive": {
      "name": "Invocation",
      "description": "Legendary captain passives stay active as long as the hero is alive and deployed."
    }
  },
  {
    "id": "hero_wei_fu",
    "name": "Wife-Fu",
    "imageAsset": "DD_Wife-Fu.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 3,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Technique",
    "archetype": "Ninja",
    "docAbility": "Ability: Měnghǔ chūjí (3 mana): Duel enemy, deal 3 dmg to enemy hero/player (or one-hit kill if at 25% or below). Duel (duel event): Opens a duel window. Win condition triggers on a win. Tie results in neither player taking damage. Loss makes the hero who initiated duel take the number of damage that they lost by.",
    "rolePassive": {
      "name": "Duelist",
      "description": "2 / 3 chance for captain to win duels by rolling 3-6."
    }
  },
  {
    "id": "hero_wind_breaker",
    "name": "Wind Breaker",
    "imageAsset": "DD_Wind_Breaker.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 24,
    "baseAttack": 2,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Mana",
    "archetype": "Gaseous",
    "docAbility": "Ability Pass Gas (4 mana): Die becomes Bomb for enemy player, dealing 3 dmg, Poisoning,& Impeding all enemy heroes & player if they fail. Bomb (bomb): A Bomb die event will have a player roll a die where failing results in all player/heroes taking damage & Impeded. Poisoned (debuff): Poisoned enemies take 2 dmg each friendly turn. Augment (buff): Augmented ally heroes & players deal x2 dmg for duration. Impeded (debuff): Impeded heroes/player can’t use attacks or abilities for the duration.",
    "rolePassive": {
      "name": "Enchant",
      "description": "1/2 chance to gain 3 mana from successful die rolls, bypassing the mana cap."
    }
  },
  {
    "id": "hero_yeast_priest",
    "name": "Yeast Priest",
    "imageAsset": "DD_Yeast_Priest.png",
    "stage": "S1",
    "manaCost": 4,
    "hp": 16,
    "baseAttack": 2,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Mana",
    "archetype": "Pious",
    "docAbility": "Ability: Daily Bread (3 mana): Heal 3 HP, Cleanse, & Bless player and all heroes for 3 turns. Cleanse (sustain): Ally player/heroes who are Cleansed remove all debuff effects inflicted on them. Blessed (buff): Blessed player/heroes will heal 2 HP, deal double damage, can receive overhealing, take half dmg, roll 4-6 on all dice, and Cleansed of debuffs following turn. Bless and Curse cancel out.",
    "rolePassive": {
      "name": "Enchant",
      "description": "1/2 chance to gain 3 mana from successful die rolls, bypassing the mana cap."
    }
  },
  {
    "id": "hero_zoom_stick",
    "name": "Zoomstick",
    "imageAsset": "DD_Zoomstick.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 2,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Speed",
    "archetype": "Infector",
    "docAbility": "Ability: Ala Ka-Zoom (3 mana): Accelerate player/all heroes & Impede all enemies for 2 turns. Accelerate (buff): Accelerated heroes/player can perform an extra action each turn (ability, base attack, action card cast player). Poisoned (debuff): Poisoned enemies take 2 dmg each friendly turn. Augment (buff): Augmented ally heroes & players deal x2 dmg for duration.",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action-card slot while this hero is captain."
    }
  }
],

// ─── ACTION CARDS ─────────────────────────────────────────────────────────────
actions: [
  {
    "id": "action_abstain",
    "name": "Abstain",
    "imageAsset": "Action_Card_Abstain.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "draw_cards",
    "effectValue": 2,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "self",
    "statusApplied": [
      "status_abstaining"
    ],
    "description": "Draw 2 action cards, remove Accelerated from your player and captain, and become immune to Charmed, Love Potion, and Drunk until your next turn."
  },
  {
    "id": "action_anemic_potion",
    "name": "Anemic Potion",
    "imageAsset": "Action_Card_Anemic_Potion.jpg",
    "manaCost": 3,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 2,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_anemic"
    ],
    "description": "Deal 2 damage and inflict Anti-Heal, preventing healing for 2 turns."
  },
  {
    "id": "action_augment",
    "name": "Augment",
    "imageAsset": "Action_Card_Augment.jpg",
    "manaCost": 0,
    "type": "paid",
    "effect": "augment",
    "effectValue": 2,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "self",
    "statusApplied": [
      "status_augmented"
    ],
    "description": "Gain 2 mana and Augment your player and captain hero for 3 turns, adding +2 damage while active."
  },
  {
    "id": "action_accelerate",
    "name": "Accelerate",
    "imageAsset": "Action_Card_Accelerate.png",
    "manaCost": 3,
    "type": "paid",
    "effect": "accelerate",
    "effectValue": 3,
    "rarity": "common",
    "stackable": false,
    "targetType": "ally_any",
    "statusApplied": [
      "status_accelerated"
    ],
    "description": "Give a friendly hero or player an extra action for 3 turns, untap them immediately, and cancel Impede."
  },
  {
    "id": "action_blood_mana",
    "name": "Blood Mana",
    "imageAsset": "Action_Card_Blood_Mana.jpg",
    "manaCost": 0,
    "type": "paid",
    "effect": "gain_mana",
    "effectValue": 5,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "self",
    "statusApplied": [],
    "description": "Gain 5 mana. If your mana pool rises above 6, take 10 damage. Cannot be used with Mana captain, Enchant, or Augmented active."
  },
  {
    "id": "action_bombs_away",
    "name": "Bombs Away",
    "imageAsset": "Action_Card_Bombs_Away.jpg",
    "manaCost": 4,
    "type": "paid",
    "effect": "cascade_damage",
    "effectValue": 4,
    "rarity": "rare",
    "stackable": false,
    "targetType": "all_enemies",
    "statusApplied": [
      "status_impeded"
    ],
    "description": "Deal 4 damage to all enemy heroes and the enemy player. Also Impedes the enemy captain, disarming Safeguard."
  },
  {
    "id": "action_cheese_potion",
    "name": "Cheese Potion",
    "imageAsset": "Action_Card_Cheese_Potion.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "random_effect",
    "effectValue": 0,
    "rarity": "common",
    "stackable": false,
    "targetType": "random",
    "statusApplied": [],
    "description": "Roll for a random cheese effect. Enemy results can also inflict Edible for 3 turns; self-damage cannot trigger if it would defeat you."
  },
  {
    "id": "action_cleanse",
    "name": "Cleanse",
    "imageAsset": "Action_Card_Cleanse.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "remove_status",
    "effectValue": 0,
    "rarity": "common",
    "stackable": false,
    "targetType": "ally_any",
    "statusApplied": [],
    "description": "Remove all negative status effects from a friendly hero or player, including Rabies."
  },
  {
    "id": "action_cripple",
    "name": "Cripple",
    "imageAsset": "Action_Card_Cripple.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "rarity": "rare",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_crippled"
    ],
    "description": "Cripple an enemy hero or player; they take double damage while Crippled."
  },
  {
    "id": "action_cryofreeze",
    "name": "Cryofreeze",
    "imageAsset": "Action_Card_Cryofreeze.png",
    "manaCost": 3,
    "type": "paid",
    "effect": "cryofreeze",
    "effectValue": 8,
    "rarity": "rare",
    "stackable": false,
    "targetType": "self",
    "statusApplied": [
      "status_frozen"
    ],
    "description": "Roll a die. 4-6 grants +8 frozen armor. 1-3 damages your team and freezes your next casts; cannot be used if the fail damage would defeat you."
  },
  {
    "id": "action_damage_potion",
    "name": "Damage Potion",
    "imageAsset": "Action_Card_Damage_Potion.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "multi_damage",
    "effectValue": 3,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [],
    "description": "Deal 3 damage to up to 2 enemy targets. Each hit has a 1/3 chance to inflict Burning."
  },
  {
    "id": "action_drunk_potion",
    "name": "Drunk Potion",
    "imageAsset": "Action_Card_Drunk_Potion.jpg",
    "manaCost": 3,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "enemy_player",
    "statusApplied": [
      "status_drunk"
    ],
    "description": "Inflict Drunk on the enemy player for their next 2 turns; their die can only roll 1-3."
  },
  {
    "id": "action_rabies",
    "name": "Rabies",
    "imageAsset": "Action_Card_Rabies.png",
    "manaCost": 3,
    "type": "paid",
    "effect": "rabies",
    "effectValue": 0,
    "rarity": "rare",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_rabies",
      "status_poisoned",
      "status_crippled"
    ],
    "description": "Poison and Cripple an enemy, then spread Rabies to another random enemy."
  },
  {
    "id": "action_gas_potion",
    "name": "Gas Potion",
    "imageAsset": "Action_Card_Gas_Potion.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "rarity": "common",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_poisoned"
    ],
    "description": "Poison an enemy for 3 turns. On a 1/3 roll, the fumes also Poison the rest of that enemy team."
  },
  {
    "id": "action_imp_aired",
    "name": "Imp-Aired",
    "imageAsset": "Action_Card_Imp-Aired.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "rarity": "common",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_impaired"
    ],
    "description": "A mischievous imp weakens an enemy hero's base attack by 2, or by 1 if their base attack is 2. Cannot affect heroes already at 1 base attack."
  },
  {
    "id": "action_impede",
    "name": "Impede",
    "imageAsset": "Action_Card_Impede.jpg",
    "manaCost": 3,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "rarity": "rare",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_impeded"
    ],
    "description": "Slow an enemy — they cannot attack or use abilities until your next turn."
  },
  {
    "id": "action_love_potion",
    "name": "Love Potion",
    "imageAsset": "Action_Card_Love_Potion.jpg",
    "manaCost": 3,
    "type": "paid",
    "effect": "control_character",
    "effectValue": 1,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_charmed"
    ],
    "description": "Inflict Charmed. Charmed targets cannot attack, use abilities, Safeguard, or Sidestep against you for 1 turn."
  },
  {
    "id": "action_reveal",
    "name": "Reveal",
    "imageAsset": "Action_Card_Reveal.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "draw_cards",
    "effectValue": 0,
    "rarity": "common",
    "stackable": false,
    "targetType": "opponent",
    "statusApplied": [],
    "description": "Peek at your opponent's hand and prepare future shop insight."
  },
  {
    "id": "action_sidestep",
    "name": "Sidestep",
    "imageAsset": "Action_Card_Sidestep.png",
    "manaCost": 0,
    "type": "free",
    "effect": "sidestep",
    "effectValue": 1,
    "rarity": "common",
    "stackable": false,
    "targetType": "ally_any",
    "statusApplied": [
      "status_sidestep"
    ],
    "description": "A friendly hero or player gets a 1/2 dodge chance against the next attack or debuff."
  },
  {
    "id": "action_vitalize",
    "name": "Vitalize",
    "imageAsset": "Action_Card_Vitalize.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "heal",
    "effectValue": 5,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "ally_any",
    "statusApplied": [],
    "description": "Restore 5 HP to a friendly hero or player. Can overheal and cleanses most debuffs."
  }
],

// ─── STATUS EFFECTS ───────────────────────────────────────────────────────────
statusEffects: [
  {
    "id": "status_example_timed",
    "name": "Burning",
    "type": "timed",
    "duration": 2,
    "stackBehavior": "stack",
    "trigger": null,
    "symbol": "🔥",
    "description": "Takes 1 damage at start of each turn for 2 turns."
  },
  {
    "id": "status_example_conditional",
    "name": "Retort",
    "type": "conditional",
    "duration": null,
    "stackBehavior": "replace",
    "trigger": "on_attacked",
    "symbol": "⚡",
    "description": "When attacked, deal 2 damage back to the attacker."
  },
  {
    "id": "status_example_permanent",
    "name": "Cursed",
    "type": "permanent",
    "duration": null,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "💀",
    "description": "Cannot benefit from healing."
  },
  {
    "id": "status_edible",
    "name": "Edible",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": "targeted_by_shish_ke_bob",
    "symbol": "🍖",
    "description": "Can be consumed by Shish-Ke-Bob and cannot attack while active."
  },
  {
    "id": "status_accelerated",
    "name": "Accelerated",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "⚡",
    "description": "May use one additional action this turn."
  },
  {
    "id": "status_frozen",
    "name": "Frozen",
    "type": "timed",
    "duration": 1,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "FRZ",
    "description": "Cannot attack, use abilities, or cast action cards."
  },
  {
    "id": "status_sidestep",
    "name": "Sidestep",
    "type": "conditional",
    "duration": 1,
    "stackBehavior": "replace",
    "trigger": "next_attack_or_debuff",
    "symbol": "SS",
    "description": "One 1/2 chance to dodge the next attack or debuff."
  },
  {
    "id": "status_rabies",
    "name": "Rabies",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": "start_of_turn",
    "symbol": "RAB",
    "description": "Poisoned and Crippled. Cleanse can remove it."
  },
  {
    "id": "status_anemic",
    "name": "Anemic",
    "type": "timed",
    "duration": 2,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "🩸",
    "description": "Healing is prevented while this status is active."
  },
  {
    "id": "status_augmented",
    "name": "Augmented",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "⬆",
    "description": "Adds +2 damage to attacks while active."
  },
  {
    "id": "status_crippled",
    "name": "Crippled",
    "type": "timed",
    "duration": 1,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "🦵",
    "description": "Takes double damage."
  },
  {
    "id": "status_drunk",
    "name": "Drunk",
    "type": "timed",
    "duration": 2,
    "stackBehavior": "replace",
    "trigger": "on_roll",
    "symbol": "🍺",
    "description": "Player die rolls are capped at 3."
  },
  {
    "id": "status_poisoned",
    "name": "Poisoned",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "stack",
    "trigger": "start_of_turn",
    "symbol": "☠",
    "description": "Takes 3 damage at the start of each turn."
  },
  {
    "id": "status_impaired",
    "name": "Impaired",
    "type": "timed",
    "duration": 2,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "🚫",
    "description": "Base attack is reduced by 2, or by 1 if base attack is 2."
  },
  {
    "id": "status_impeded",
    "name": "Impeded",
    "type": "timed",
    "duration": 1,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "⛔",
    "description": "Cannot attack or use abilities."
  },
  {
    "id": "status_charmed",
    "name": "Charmed",
    "type": "timed",
    "duration": 1,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "💕",
    "description": "Cannot attack, use abilities, Safeguard, or Sidestep against the caster for 1 turn."
  },
  {
    "id": "status_abstaining",
    "name": "Abstaining",
    "type": "timed",
    "duration": 2,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "✋",
    "description": "Immune to Charmed/Love Potion."
  },
  {
    "id": "status_taunt",
    "name": "Taunting",
    "type": "timed",
    "duration": 2,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "🛡",
    "description": "Enemies must attack this character."
  },
  {
    "id": "status_locked_out",
    "name": "Locked Out",
    "type": "timed",
    "duration": 2,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "LOCK",
    "description": "Cannot open the shop."
  },
  {
    "id": "status_imbued",
    "name": "Imbued",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "IMB",
    "description": "Shares passive pressure from a Passive captain."
  },
  {
    "id": "status_burning",
    "name": "Burning",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": "start_of_turn",
    "symbol": "BRN",
    "description": "Takes 3 damage each turn. Frozen cancels Burning."
  },
  {
    "id": "status_haunted",
    "name": "Haunted",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": "start_of_turn",
    "symbol": "HNT",
    "description": "Takes 2 damage on friendly turns and cannot attack or use abilities."
  },
  {
    "id": "status_shocked",
    "name": "Shocked",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": "after_roll",
    "symbol": "SHK",
    "description": "After the regular die roll, resolves a shock die event with severe failure outcomes."
  },
  {
    "id": "status_cursed",
    "name": "Cursed",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "CRS",
    "description": "Rolls are capped, healing is blocked, damage dealt is halved, and incoming damage is doubled."
  },
  {
    "id": "status_blessed",
    "name": "Blessed",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": "start_of_turn",
    "symbol": "BLS",
    "description": "Heals, deals double damage, can receive overhealing, takes half damage, and cleanses debuffs next turn."
  },
  {
    "id": "status_jinxed",
    "name": "Jinxed",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": "on_damage_dealt",
    "symbol": "JNX",
    "description": "Takes the amount of damage dealt to the hero or player that inflicted Jinxed."
  },
  {
    "id": "status_virus",
    "name": "Virus",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "VIR",
    "description": "Cannot cast cards or buy hero cards in the shop."
  },
  {
    "id": "status_stimulated",
    "name": "Stim",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "STM",
    "description": "Gains 50% overhealth and x3 attack damage, but also gains Anemic and Crippled."
  }
],

// ─── RULES ────────────────────────────────────────────────────────────────────
rules: {
  "startingPlayerHP": 40,
  "startingHand": { "hero": 1, "action": 2 },
  "handLimits": { "hero": 8, "action": 8 },
  "shopCosts": { "hero": 2, "action": 1 },
  "shopLimits": { "heroPerTurn": 1, "actionPerTurn": 1 },
  "dice": { "sides": 6, "damageRule": "difference", "roll6ResetsRequired": true, "roll5Bomb": true, "roll6ManaValue": 6 },
  "mana": {
    "maxPool": 12,
    "sourceIsRoll": true,
    "discardForMana": { "enabled": true, "maxHeroPerTurn": 1, "maxActionPerTurn": 1, "refundFullCost": false }
  },
  "statusLimits": {
    "player": 6,
    "character": 6
  },
  "fieldLimits": { "heroes": 5 },
  "actionSpawnWeights": {
    "common": 60,
    "semi-common": 30,
    "rare": 10
  },
  "combat": {
    "playerBaseAttack": 4,
    "actionsPerTurn": 1,
    "baseAttackCountsAsAction": false,
    "abilityCountsAsAction": true,
    "acceleratedActionsAllowed": 2,
    "canUseAbilityOnDeployTurn": true,
    "actionCardsPerTurn": 1,
    "heroCardsPerTurn": 1,
    "freeActionCardsUnlimited": false,
    "freeActionsAllowedOnOpponentTurn": true
  },
  "phases": ["rolloff", "etiquette", "combat"],
  "etiquetteRules": { "abilitiesAllowed": false, "actionCardsAllowed": false, "attacksAllowed": false, "shopAllowed": true, "deployAllowed": true }
}

}; // end GAME_DATA_INLINE
