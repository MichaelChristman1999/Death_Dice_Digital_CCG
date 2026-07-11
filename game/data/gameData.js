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
    "manaCost": 2,
    "hp": 10,
    "baseAttack": 2,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Balanced",
    "archetype": "Seducer",
    "docAbility": "Chocolate & Clams (2 mana): Inflict enemy with Charmed status to prevent them from attacking caster for 3 turns. Message should display for Charmed status being inflicted and separate message telling an enemy player that they can’t attack enemy that Charmed them (if they try to attack player/Afrodisiac).",
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
    "manaCost": 2,
    "hp": 6,
    "baseAttack": 3,
    "role": "Fighter",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "IQ",
    "archetype": "Omniscient",
    "docAbility": "Lapis Lazuli (3 mana): Deal 1 damage to player/hero & inflict Impaired and Crippled statuses (for up to 3 turns). There should be a message conveying that the enemy is both",
    "rolePassive": {
      "name": "Foresight",
      "description": "Preview and buy from the next two shop rows."
    }
  },
  {
    "id": "hero_aster_roid",
    "name": "Aster Roid",
    "imageAsset": "DD_Aster_Roid.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 10,
    "baseAttack": 6,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Strength",
    "archetype": "Juggernaut",
    "docAbility": "Roid Rage (4 mana): Deal 8 dmg to enemy & heal player/Aster Roid +6 HP (can overheal), but inflicted with",
    "rolePassive": {
      "name": "Crit-Hit",
      "description": "Twenty-five percent chance to double outgoing damage."
    }
  },
  {
    "id": "hero_baller_ina",
    "name": "Baller-ina",
    "imageAsset": "DD_Baller-ina.png",
    "stage": "S1",
    "manaCost": 1,
    "hp": 6,
    "baseAttack": 2,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Agility",
    "archetype": "Athlete",
    "docAbility": "Basket-Ballad (2 mana): Duel enemy to deal 3 damage and gain Sidestep for player &",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "Roll 4-6 to dodge damage while captain."
    }
  },
  {
    "id": "hero_bearzerk",
    "name": "Bearzerk",
    "imageAsset": "DD_Bearzerk.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 12,
    "baseAttack": 6,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Strength",
    "archetype": "Predator",
    "docAbility": "Bearzerker Rampage (5 mana): Deal 8 damage to up to 2 enemies (up to 8 to player & do same to another enemy hero if it kills)). Player can only be damaged up to 8 (wording was intentional there). As with any potential multi-target ability with durability hero (while they are in other player’s captain slot), it will deal x1.5 dmg (with rounding up) to a blocking durability hero if they interrupt it from dealing dmg to multiple targets.",
    "rolePassive": {
      "name": "Crit-Hit",
      "description": "Twenty-five percent chance to double outgoing damage."
    }
  },
  {
    "id": "hero_beeatrice",
    "name": "Buzz Kill",
    "imageAsset": "DD_Buzz_Kill.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 6,
    "baseAttack": 3,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Agility",
    "archetype": "Insect",
    "docAbility": "Stinging Barbs (3 mana): Deal 2 dmg to 2 enemies (4 dmg if debuffed). This ability allows you to select 2 enemies and debuffs are any negative status effects. The Cripple multiplier when an enemy inflicted with Cripple is attacked is slightly lowered to x1.5 for 6 dmg.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "Roll 4-6 to dodge damage while captain."
    }
  },
  {
    "id": "hero_breast_knuckle",
    "name": "Breast Knuckle",
    "imageAsset": "DD_Breast_Knuckle.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 8,
    "baseAttack": 4,
    "role": "Fighter",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Technique",
    "archetype": "Brawler",
    "docAbility": "Bust Thrust (3 mana): Duel enemy, dealing 5 dmg & inflict Cripple status if win. The Cripple takes effect for 2 turns after the initial dmg).",
    "rolePassive": {
      "name": "Duelist",
      "description": "Win captain duels on rolls of 3-6."
    }
  },
  {
    "id": "hero_bro_chill",
    "name": "Aplombinable",
    "imageAsset": "DD_Aplombinable.png",
    "stage": "S1",
    "manaCost": 5,
    "hp": 14,
    "baseAttack": 5,
    "role": "Control",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Legendary",
    "docAbility": "Chill Out (5 mana): Cleanse all debuffs & heal +4 HP to player/all heroes. Aplomb (Passive): 1 out of 2 chance to Cleanse player/hero & heal +1",
    "rolePassive": {
      "name": "Invocation",
      "description": "Roll 4-6 to draw a free hero card."
    }
  },
  {
    "id": "hero_cath_eine",
    "name": "Cath-eine",
    "imageAsset": "DD_Cath-eine.png",
    "stage": "S1",
    "manaCost": 1,
    "hp": 6,
    "baseAttack": 1,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Agility",
    "archetype": "Neurotic",
    "docAbility": "Caffeine Rush (2 mana): Gain Accelerated status (for 2 turns) and deal 2 damage to an enemy (with your base attack also going up to 2 from 1 damage).",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "Roll 4-6 to dodge damage while captain."
    }
  },
  {
    "id": "hero_cheatah",
    "name": "Cheatah",
    "imageAsset": "DD_Cheatah.png",
    "stage": "S2",
    "manaCost": 2,
    "hp": 8,
    "baseAttack": 2,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Speed",
    "archetype": "Thief",
    "docAbility": "Cheetah Code (3 mana): Gain one free rule bypass within next 2 turns (this can include choosing to re-roll the die, bypass the 1 action and/or hero card cast limit, can bypass the 5 hero on field limit (with a 6th for an exception to rule), bypassing the 1 action/and or hero card shop purchase limit, clicking on health HUD or hero card to heal +2 HP (can overheal) before using ability or base attack, clicking on hero card or player to play ability or base attack after using ability or base attack, and bypassing the one strict discard limit). There should be a message that displays a player can bypass one rule. There should also be a variety of messages conveying what the player just did or if they already used a cheat, clicking on Cheatah should display a caption in the box: You already used a cheat within last 2 turns and can’t use it again right now. The one caveat is that Cheatah even when accelerated and having enough mana won’t be able to cheat again until the 2 turns passed. Cheats don’t bypass mana deficits (not having enough mana).",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action while captain."
    }
  },
  {
    "id": "hero_chicki_barstooli",
    "name": "Chicki Barstooli",
    "imageAsset": "DD_Chicki_Barstooli.png",
    "stage": "S1",
    "manaCost": 1,
    "hp": 4,
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
    "classType": "Passive",
    "archetype": "Boozer",
    "docAbility": "Petite Petulance (passive): Any damage taken results in dealing double damage for 3 turns (only applies to Barstooli and player unless she’s in captain slot).",
    "rolePassive": {
      "name": "Imbue",
      "description": "Share this hero passive for at least three turns."
    }
  },
  {
    "id": "hero_copy_cat",
    "name": "Copy-Cat",
    "imageAsset": "DD_Copy-Cat.png",
    "stage": "S2",
    "manaCost": 1,
    "hp": 2,
    "baseAttack": 2,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Agility",
    "archetype": "Multiplier",
    "docAbility": "Meowrox (1 mana): Copy & cast it action card for free or clone self (overrides the action card limit and Copy-Cat clone is an exception to the no-duplicate heroes rule). The clone (like having a second Copy-Cat on field) will be deployed and count towards the max 5 hero on field limit.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "Roll 4-6 to dodge damage while captain."
    }
  },
  {
    "id": "hero_cut_lass",
    "name": "Cut-Lass",
    "imageAsset": "DD_Cut-Lass.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 8,
    "baseAttack": 4,
    "role": "Duelist",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Technique",
    "archetype": "Thief",
    "docAbility": "Booty Brawl (2 mana): Duel enemy, dealing 4 dmg, gain +2 mana, and purloin (steal) 1 action card (to cast for free if you win).",
    "rolePassive": {
      "name": "Duelist",
      "description": "Win captain duels on rolls of 3-6."
    }
  },
  {
    "id": "hero_determinator",
    "name": "De-Terminator",
    "imageAsset": "DD_De-Terminator.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 12,
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
    "classType": "Durability",
    "archetype": "Mercenary",
    "docAbility": "De-Termination (Passive): Avoid death once with 6 overhealth when you fall to critical (25% or less) HP (also applies 6 healable overhealth to player if they fall to 10 (25%) or less HP). De-Terminator falling to 0-3 activates this one time and not again. It won’t protect player unless if they fall 10 or below at same time De-Terminator falls below 25% HP and De-Terminator is in the captain slot.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Protect player and heroes; multi-target hits redirect harder."
    }
  },
  {
    "id": "hero_disc_jockey",
    "name": "Disc Jockey",
    "imageAsset": "DD_Disc_Jockey.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 8,
    "baseAttack": 1,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Speed",
    "archetype": "Medic",
    "docAbility": "Ambient Heal (2 mana): Heal player/all heroes for up to 3 HP. (can’t overheal, won’t heal Anemic heroes/player or spend ability if there is no one to heal).",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action while captain."
    }
  },
  {
    "id": "hero_dread_locks",
    "name": "Dread-Locks",
    "imageAsset": "DD_Dread_Locks.png",
    "stage": "S2",
    "manaCost": 2,
    "hp": 10,
    "baseAttack": 3,
    "role": "Control",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Balanced",
    "archetype": "Thief",
    "docAbility": "Locked Out (3 mana): Lock the shop from an enemy for 2 turns. Display a message that tells victim player the shop is closed for the turn if they try accessing the shop.",
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
    "manaCost": 6,
    "hp": 16,
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
    "classType": "Legendary",
    "archetype": "Celestial",
    "docAbility": "Swift Squall (6 mana): Accelerate all allies for next 3 turns.Stellar Stability (Passive): Cleanse up to 2 debuffs & heal 2 HP to all allies upon die roll success.",
    "rolePassive": {
      "name": "Invocation",
      "description": "Roll 4-6 to draw a free hero card."
    }
  },
  {
    "id": "hero_fryborg",
    "name": "Fry-Borg",
    "imageAsset": "DD_Fry-Borg.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 12,
    "baseAttack": 4,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Technique",
    "archetype": "Greaser",
    "docAbility": "Sci-Fry (4 mana): Duel enemy, deal 3 dmg and inflicting Burning status (player/hero take 3 dmg & lose action card in hand each turn) for up to 2 turns. Display message for Burning status being inflicted and separate message one of enemy’s cards burning up losing a card when it happens.",
    "rolePassive": {
      "name": "Duelist",
      "description": "Win captain duels on rolls of 3-6."
    }
  },
  {
    "id": "hero_geezer_freezer",
    "name": "Geezer Freezer",
    "imageAsset": "DD_Geezer_Freezer.png",
    "stage": "S2",
    "manaCost": 2,
    "hp": 10,
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
    "classType": "Passive",
    "archetype": "Subzero",
    "docAbility": "Frozen Assets (Passive): Deal 2 damage & inflict Frozen status to enemy if debuffed/purloined.",
    "rolePassive": {
      "name": "Imbue",
      "description": "Share this hero passive for at least three turns."
    }
  },
  {
    "id": "hero_ghoulia",
    "name": "Ghoulia",
    "imageAsset": "DD_Ghoulia.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 6,
    "baseAttack": 3,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Agility",
    "archetype": "Ghoul",
    "docAbility": "Sonic Shreik (3 mana): Deal 3 damage & inflict Impeded status on player & up to 1 hero.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "Roll 4-6 to dodge damage while captain."
    }
  },
  {
    "id": "hero_giant_jess",
    "name": "Giant-Tessa",
    "imageAsset": "DD_Giant_Tessa.png",
    "stage": "S3",
    "manaCost": 3,
    "hp": 8,
    "baseAttack": 5,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Strength",
    "archetype": "Kaiju",
    "docAbility": "Titan Toss (4 mana): Deal 6 dmg to 2 enemies. A durability hero in captain slot and another hero get hit if durability hero card is captain (prioritizes first enemy selected by player if this occurs).",
    "rolePassive": {
      "name": "Crit-Hit",
      "description": "Twenty-five percent chance to double outgoing damage."
    }
  },
  {
    "id": "hero_goosebump",
    "name": "Goose-Bump",
    "imageAsset": "DD_Goose_Bump.png",
    "stage": "S1",
    "manaCost": 1,
    "hp": 4,
    "baseAttack": 3,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Speed",
    "archetype": "Infector",
    "docAbility": "Serrated Bite (2 mana): Deal 3 damage & inflict Rabies status (Cripple that has 1 out of 2 chance to spread to another hero/player the next turn).",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action while captain."
    }
  },
  {
    "id": "hero_gorgon_zola",
    "name": "Gorgon-Zola",
    "imageAsset": "DD_Gorgon_Zola.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 12,
    "baseAttack": 2,
    "role": "Control",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Mana",
    "archetype": "Gourmand",
    "docAbility": "Say Cheese! (4 mana): Impede & inflict Edible status (for next 2 turns) to enemy hero. Edible status heals hero or player for 50% of their damage to enemy (like a lifesteal).",
    "rolePassive": {
      "name": "Enchant",
      "description": "Roll 4-6 to gain three mana beyond cap."
    }
  },
  {
    "id": "hero_hip_hop_papa",
    "name": "Hip-Hop Papa",
    "imageAsset": "DD_Hip_Hop_Papa.png",
    "stage": "S2",
    "manaCost": 2,
    "hp": 8,
    "baseAttack": 2,
    "role": "Duelist",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Mana",
    "archetype": "Dancer",
    "docAbility": "Breakback Breakdance (2 mana): Deal 3 dmg (that can’t be Safeguarded) to enemy player/all heroes if roll 4-6. Rolling 1-3 deals 3 dmg, Impedes Hip-Hop Papa, & prevents player from using base attack for next turn, displaying a message reading that You and Papa broke their backs attempting a breakdance.",
    "rolePassive": {
      "name": "Enchant",
      "description": "Roll 4-6 to gain three mana beyond cap."
    }
  },
  {
    "id": "hero_in_specter",
    "name": "In-Specter",
    "imageAsset": "DD_In-Specter.png",
    "stage": "S1",
    "manaCost": 1,
    "hp": 8,
    "baseAttack": 1,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "IQ",
    "archetype": "Investigator",
    "docAbility": "Sleuth Seance (3 mana): Draw &/or cast any action card you want for free. This will open up a separate window (not the Shop) with all 20 current action cards in it. If hand limit reaches max 8, player will be forced to discard one of their other action cards. In-Specter can choose to cast this free action card at any time (unless purloined by Cut-Lass’s Booty Brawl duel).",
    "rolePassive": {
      "name": "Foresight",
      "description": "Preview and buy from the next two shop rows."
    }
  },
  {
    "id": "hero_iron_maid",
    "name": "Iron Maid",
    "imageAsset": "DD_Iron_Maid.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 18,
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
    "classType": "Durability",
    "archetype": "Caregiver",
    "docAbility": "Vacuum Cleaner (Passive): Cleanse 2 debuffs & Absorb up to 6 dmg (a turn including during enemy turn). Absorbent status description should say when clicking on Iron Maid’s card that any absorbed dmg gets transferred to healing spread across team (lower heroes on field more healing per teammate). There should be separate messages for her cleansing debuffs, absorbing damage, and healing given to teammates.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Protect player and heroes; multi-target hits redirect harder."
    }
  },
  {
    "id": "hero_juju_jitsu",
    "name": "Juju-Jitsu",
    "imageAsset": "DD_Juju_Jitsu.png",
    "stage": "S1",
    "manaCost": 4,
    "hp": 10,
    "baseAttack": 4,
    "role": "Fighter",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Technique",
    "archetype": "Shaman",
    "docAbility": "Vooduel (4 mana): Duel enemy, dealing 5 dmg & inflict Jinxed (player/hero dueled take 3 dmg if Juju-Jitsu is attacked for 3 turns). There should be a display message for Jinxed being inflicted & consequence for attacking",
    "rolePassive": {
      "name": "Duelist",
      "description": "Win captain duels on rolls of 3-6."
    }
  },
  {
    "id": "hero_kevlard",
    "name": "Kev-Lard",
    "imageAsset": "DD_Kev-Lard.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 12,
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
    "classType": "Durability",
    "archetype": "Gourmand",
    "docAbility": "Lard Guard (Passive): Provides 8 armor (which halves base attack dmg) with 1 out of 3 chance to reflect damage. There should be separate messages displayed for reflecting damage back at an enemy hero or just the player if there are no heroes on field and armor halving damage received.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Protect player and heroes; multi-target hits redirect harder."
    }
  },
  {
    "id": "hero_lassquach",
    "name": "Lassquatch",
    "imageAsset": "DD_Lassquatch.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 8,
    "baseAttack": 5,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Strength",
    "archetype": "Conservator",
    "docAbility": "Sass-Squash (4 mana): Impede & deal 8 dmg to enemy (12 dmg if player/Lassquatch half or less HP).",
    "rolePassive": {
      "name": "Crit-Hit",
      "description": "Twenty-five percent chance to double outgoing damage."
    }
  },
  {
    "id": "hero_lone_wolf",
    "name": "Lone Wolf",
    "imageAsset": "DD_Lone_Wolf.png",
    "stage": "S2",
    "manaCost": 2,
    "hp": 8,
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
    "classType": "Passive",
    "archetype": "Mercenary",
    "docAbility": "Solo El Lobo (Passive): Base attack deals x3 dmg if only hero on field. There should be a message communicating Lone Wolf’s base attack is more powerful due to being the only hero left.",
    "rolePassive": {
      "name": "Imbue",
      "description": "Share this hero passive for at least three turns."
    }
  },
  {
    "id": "hero_marionetta",
    "name": "Marionetta",
    "imageAsset": "DD_Marionetta.png",
    "stage": "S3",
    "manaCost": 2,
    "hp": 6,
    "baseAttack": 2,
    "role": "Control",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "IQ",
    "archetype": "Schemer",
    "docAbility": "Puppeteer (4 mana): Control an enemy hero card, gaining access to their abilities for 2 turns (the controlled enemy hero card appears on field on far right and is an exception to hero on field limit rule). The enemy stays controlled for the duration even if",
    "rolePassive": {
      "name": "Foresight",
      "description": "Preview and buy from the next two shop rows."
    }
  },
  {
    "id": "hero_mob_barley",
    "name": "Don Vino",
    "imageAsset": "DD_Don_Vino.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 10,
    "baseAttack": 5,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Legendary",
    "archetype": "Boozer",
    "docAbility": "Tapped Out (6 mana): All enemy heroes Impeded & enemy player/heroes take 3 dmg. Wasted: Any die event fail inflicts enemy with Drunk (Anemic, then Poison if already drunk) when deployed.",
    "rolePassive": {
      "name": "Invocation",
      "description": "Roll 4-6 to draw a free hero card."
    }
  },
  {
    "id": "hero_mr_immutable",
    "name": "Mr. Immutable",
    "imageAsset": "DD_Mr._Immutable.png",
    "stage": "S3",
    "manaCost": 4,
    "hp": 16,
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
    "classType": "Durability",
    "archetype": "Paragon",
    "docAbility": "Immutability (Passive): Hero (& player while in captain slot) are immune to debuffs. Mr. Immutable at start of turn or next turn while in captain slot cleanses any debuffs a player would still have prior. Any multi-target debuff abilities will still be inflicted to other heroes. Single-target debuffs won’t work on Mr. Immutable and have to be spent on another enemy hero/player.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Protect player and heroes; multi-target hits redirect harder."
    }
  },
  {
    "id": "hero_mumma_mia",
    "name": "Mumma Mia",
    "imageAsset": "DD_Mumma_Mia.png",
    "stage": "S2",
    "manaCost": 6,
    "hp": 10,
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
    "classType": "Legendary",
    "archetype": "Cryptic",
    "docAbility": "Out of the Tomb (6 mana): Baby deployed for 3 turns (4 HP & 1 base attack dmg), healing 3 HP and cleansing all debuffs from player/all heroes. Baby on field is exception to hero on field limit. Mummy Scorned (Passive): When baby dies, she deals 6 dmg (that can’t be Safeguarded or dodged) & inflicts Cursed status to all enemies. Cursed status makes player roll only 1-2 on die & enemies Impaired (dealing half dmg rounded up) for 3 turns.",
    "rolePassive": {
      "name": "Invocation",
      "description": "Roll 4-6 to draw a free hero card."
    }
  },
  {
    "id": "hero_prowl_ball",
    "name": "Prowl Ball",
    "imageAsset": "DD_Prowl_Ball.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 10,
    "baseAttack": 3,
    "role": "Duelist",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Balanced",
    "archetype": "Pitcher",
    "docAbility": "Claw Strikeout (3 mana): 2 out of 3 (roll 3-6) chance (die event window for this when ability is casted) to deal 4 dmg & Impede enemy hero (bypasses Safeguard).",
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
    "manaCost": 2,
    "hp": 10,
    "baseAttack": 3,
    "role": "Fighter",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Balanced",
    "archetype": "Amplifier",
    "docAbility": "Strike a Chord (3 mana): Deal 3 dmg (along with Impede) to enemy (5 dmg & Impedes a Safeguarding durability hero).",
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
    "manaCost": 2,
    "hp": 4,
    "baseAttack": 1,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "IQ",
    "archetype": "Architect",
    "docAbility": "Goldberg Chain (3 mana): Deal 2 dmg & Impair all enemy heroes on field for next turn (deals 3 dmg & Impairs durability hero if they’re Safeguarding). The ability will also damage the player if there are no heroes on the field to target.",
    "rolePassive": {
      "name": "Foresight",
      "description": "Preview and buy from the next two shop rows."
    }
  },
  {
    "id": "hero_shell_shocked",
    "name": "Shell-Shock",
    "imageAsset": "DD_Shell-Shock.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 12,
    "baseAttack": 4,
    "role": "Tank",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Mana",
    "archetype": "Marine",
    "docAbility": "Static Splash (5 mana): Deal 4 dmg & Impede all enemy player/heroes. Durability hero Safeguarding takes 8 dmg &",
    "rolePassive": {
      "name": "Enchant",
      "description": "Roll 4-6 to gain three mana beyond cap."
    }
  },
  {
    "id": "hero_shish_ke_bob",
    "name": "Shish-Ke-Bob",
    "imageAsset": "DD_Shish-Ke-Bob.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 10,
    "baseAttack": 3,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Balanced",
    "archetype": "Foodie",
    "docAbility": "Kebab Skewer (3 mana): 2 out of 3 chance to deal 3 dmg & inflict Anemic (for 3 turns) on enemy hero/player.",
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
    "manaCost": 2,
    "hp": 8,
    "baseAttack": 2,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "IQ",
    "archetype": "Chemist",
    "docAbility": "Biotic Syringe (3 mana): Deal 3 dmg & inflict Anemic to enemy OR heal 3 HP & cleanse 1 debuff from player/hero. This move provides versatile utility.",
    "rolePassive": {
      "name": "Foresight",
      "description": "Preview and buy from the next two shop rows."
    }
  },
  {
    "id": "hero_slendeer",
    "name": "Slendeer",
    "imageAsset": "DD_Slendeer.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 8,
    "baseAttack": 2,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Speed",
    "archetype": "Conservator",
    "docAbility": "Deer Dash (2 mana): Deal 3 dmg while Accelerating & Cleansing self (of one debuff).",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action while captain."
    }
  },
  {
    "id": "hero_stallwart",
    "name": "Stall-Wart",
    "imageAsset": "DD_Stall-Wart.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 10,
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
    "classType": "Durability",
    "archetype": "Guardian",
    "docAbility": "Stalliwog (Passive): Provides 10 shield health (regenerates +2 each turn he’s not hit by enemy).",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Protect player and heroes; multi-target hits redirect harder."
    }
  },
  {
    "id": "hero_trollnet",
    "name": "Cyber-Trolly",
    "imageAsset": "DD_Cyber_Trolly.png",
    "stage": "S2",
    "manaCost": 2,
    "hp": 10,
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
    "classType": "Passive",
    "archetype": "Provocateur",
    "docAbility": "Troll-jan Virus (Passive): If enemy fails die roll/event after debuff, they get inflicted with Virus (disabling hero/action card casts in their hand for 2 turns). There should be a message displayed for an inflicted virus and a separate message displayed whenever a player tries to cast a hero or action card with",
    "rolePassive": {
      "name": "Imbue",
      "description": "Share this hero passive for at least three turns."
    }
  },
  {
    "id": "hero_trophy_wife",
    "name": "Trophy Wife",
    "imageAsset": "DD_Trophy_Wife.png",
    "stage": "S2",
    "manaCost": 1,
    "hp": 6,
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
    "classType": "Passive",
    "archetype": "Fitness",
    "docAbility": "Prized Possession (Passive): Draw action card that’s free to cast for successful die rolls (includes events).",
    "rolePassive": {
      "name": "Imbue",
      "description": "Share this hero passive for at least three turns."
    }
  },
  {
    "id": "hero_tyrantosaurus",
    "name": "Tyrantosaurus",
    "imageAsset": "DD_Tyrantosaurus.png",
    "stage": "S3",
    "manaCost": 4,
    "hp": 12,
    "baseAttack": 6,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Strength",
    "archetype": "Conqueror",
    "docAbility": "Dino Dominion (6 mana): Deal 10 dmg to enemy player/hero, Trapping another enemy hero if it kills. A trapped enemy will be on the other player’s field appearing tapped. The trapped enemy hero will be killed in 3 turns if Tyrantosaurus isn’t killed by then. If Tyrantosaurus is killed, the trapped hero is set free. There should be messages to convey those extra circumstances.Tyrantosaurus",
    "rolePassive": {
      "name": "Crit-Hit",
      "description": "Twenty-five percent chance to double outgoing damage."
    }
  },
  {
    "id": "hero_val_cano",
    "name": "Volley-Cano",
    "imageAsset": "DD_Volley-Cano.png",
    "stage": "S2",
    "manaCost": 6,
    "hp": 12,
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
    "classType": "Legendary",
    "archetype": "Volcan",
    "docAbility": "Volcanic Volley: Deal 8 dmg to an enemy & inflict Burning status (3 turns). Temperature Tantrum (Passive): Deal 5 dmg to all enemies & inflict Burning status if critical (25% but not 0)",
    "rolePassive": {
      "name": "Invocation",
      "description": "Roll 4-6 to draw a free hero card."
    }
  },
  {
    "id": "hero_wei_fu",
    "name": "Wife-Fu",
    "imageAsset": "DD_Wife-Fu.png",
    "stage": "S2",
    "manaCost": 2,
    "hp": 6,
    "baseAttack": 3,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Technique",
    "archetype": "Ninja",
    "docAbility": "Widow’s Fury (3 mana): Duel enemy, deal 3 dmg, Cripple, &",
    "rolePassive": {
      "name": "Duelist",
      "description": "Win captain duels on rolls of 3-6."
    }
  },
  {
    "id": "hero_wind_breaker",
    "name": "Wind Breaker",
    "imageAsset": "DD_Wind_Breaker.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 2,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Mana",
    "archetype": "Gaseous",
    "docAbility": "Pass Gas (4 mana): Next turn die becomes 5 (bomb) & inflicts Poison to all enemy heroes/player if they fail. It deals 8 dmg & Impedes a Safeguarding durability hero. The bomb cancels/defuses if it goes back to player who casted Wind Breaker’s ability and player’s mana is half-refunded (2 mana back) if enemy player rolled 5-6. There should be a message that tells the enemy player about the gas bomb and a separate message if it would’ve gone back to the player who casted, bomb is cancelled and 2 mana was refunded back to them.",
    "rolePassive": {
      "name": "Enchant",
      "description": "Roll 4-6 to gain three mana beyond cap."
    }
  },
  {
    "id": "hero_yeast_priest",
    "name": "Yeast Priest",
    "imageAsset": "DD_Yeast_Priest.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 8,
    "baseAttack": 2,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Mana",
    "archetype": "Pious",
    "docAbility": "Daily Bread (3 mana): Heal 3 HP & cleanse (1 debuff) from player/all heroes.",
    "rolePassive": {
      "name": "Enchant",
      "description": "Roll 4-6 to gain three mana beyond cap."
    }
  },
  {
    "id": "hero_zoom_stick",
    "name": "Zoomstick",
    "imageAsset": "DD_Zoomstick.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 6,
    "baseAttack": 2,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "classType": "Speed",
    "archetype": "Infector",
    "docAbility": "Accelero (3 mana): Accelerate player/all heroes & Impede all enemies (lasts 2 turns).",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action while captain."
    }
  }
],

// ─── ACTION CARDS ─────────────────────────────────────────────────────────────
actions: [
  {
    "id": "action_abstain",
    "name": "Abstain",
    "imageAsset": "Action_Card_Abstain.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "draw_cards",
    "effectValue": 2,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "self",
    "statusApplied": ["status_abstaining"],
    "description": "Draw 2 action cards and become immune to Charmed, Love Potion, and Drunk until your next turn."
  },
  {
    "id": "action_anemic_potion",
    "name": "Anemic Potion",
    "imageAsset": "Action_Card_Anemic_Potion.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_anemic"],
    "description": "Inflict Anti-Heal — prevent this enemy from receiving healing for 2 turns."
  },
  {
    "id": "action_augment",
    "name": "Augment",
    "imageAsset": "Action_Card_Augment.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "augment",
    "effectValue": 2,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "ally_any",
    "statusApplied": ["status_augmented"],
    "description": "Gain 2 mana and give a friendly hero or player +2 damage for 2 turns."
  },
  {
    "id": "action_accelerate",
    "name": "Accelerate",
    "imageAsset": "Action_Card_Accelerate.png",
    "manaCost": 2,
    "type": "paid",
    "effect": "accelerate",
    "effectValue": 3,
    "rarity": "common",
    "stackable": false,
    "targetType": "ally_any",
    "statusApplied": ["status_accelerated"],
    "description": "Give a friendly hero or player +1 action for 3 turns. Cancels Impede."
  },
  {
    "id": "action_blood_mana",
    "name": "Blood Mana",
    "imageAsset": "Action_Card_Blood_Mana.jpg",
    "manaCost": 0,
    "type": "free",
    "effect": "heal",
    "effectValue": -5,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "self",
    "statusApplied": [],
    "description": "Sacrifice 5 HP to gain 5 mana. Cannot be used at 5 HP or less."
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
    "statusApplied": [],
    "description": "Deal 4 damage to all enemy heroes and the enemy player. Safeguard cannot block it."
  },
  {
    "id": "action_cheese_potion",
    "name": "Cheese Potion",
    "imageAsset": "Action_Card_Cheese_Potion.jpg",
    "manaCost": 0,
    "type": "free",
    "effect": "random_effect",
    "effectValue": 0,
    "rarity": "common",
    "stackable": false,
    "targetType": "random",
    "statusApplied": [],
    "description": "Roll for a random cheese effect. Enemy-damage results also hit the enemy player; self-damage cannot trigger if it would defeat you."
  },
  {
    "id": "action_cleanse",
    "name": "Cleanse",
    "imageAsset": "Action_Card_Cleanse.jpg",
    "manaCost": 1,
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
    "statusApplied": ["status_crippled"],
    "description": "Cripple an enemy hero or player; they take double damage while Crippled."
  },
  {
    "id": "action_cryofreeze",
    "name": "Cryofreeze",
    "imageAsset": "Action_Card_Cryofreeze.png",
    "manaCost": 2,
    "type": "paid",
    "effect": "cryofreeze",
    "effectValue": 5,
    "rarity": "rare",
    "stackable": false,
    "targetType": "self",
    "statusApplied": ["status_frozen"],
    "description": "Roll a die. 4-6 grants frozen armor. 1-3 damages your team and freezes your next casts."
  },
  {
    "id": "action_damage_potion",
    "name": "Damage Potion",
    "imageAsset": "Action_Card_Damage_Potion.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "multi_damage",
    "effectValue": 3,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [],
    "description": "Deal 3 damage to up to 2 enemy targets."
  },
  {
    "id": "action_drunk_potion",
    "name": "Drunk Potion",
    "imageAsset": "Action_Card_Drunk_Potion.jpg",
    "manaCost": 0,
    "type": "free",
    "effect": "apply_status",
    "effectValue": 0,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "enemy_player",
    "statusApplied": ["status_drunk"],
    "description": "Inflict Drunk on the enemy player for their next 2 turns; their die can only roll 1-3."
  },
  {
    "id": "action_rabies",
    "name": "Rabies",
    "imageAsset": "Action_Card_Rabies.png",
    "manaCost": 2,
    "type": "paid",
    "effect": "rabies",
    "effectValue": 0,
    "rarity": "rare",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": ["status_rabies", "status_poisoned", "status_crippled"],
    "description": "Poison and Cripple an enemy, then spread Rabies to another random enemy."
  },
  {
    "id": "action_gas_potion",
    "name": "Gas Potion",
    "imageAsset": "Action_Card_Gas_Potion.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "rarity": "common",
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_poisoned"],
    "description": "Poison an enemy — deal 1 damage at the start of each of their turns for 3 turns."
  },
  {
    "id": "action_imp_aired",
    "name": "Imp-Aired",
    "imageAsset": "Action_Card_Imp-Aired.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "rarity": "common",
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_impaired"],
    "description": "A mischievous imp weakens an enemy hero's base attack by 2, or by 1 if their base attack is 2. Cannot affect heroes already at 1 base attack."
  },
  {
    "id": "action_impede",
    "name": "Impede",
    "imageAsset": "Action_Card_Impede.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "rarity": "rare",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": ["status_impeded"],
    "description": "Slow an enemy — they cannot attack or use abilities until your next turn."
  },
  {
    "id": "action_love_potion",
    "name": "Love Potion",
    "imageAsset": "Action_Card_Love_Potion.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "control_character",
    "effectValue": 1,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_charmed"],
    "description": "An enemy falls head over heels — they immediately attack their own player, then swoon (tapped)."
  },
  {
    "id": "action_reveal",
    "name": "Reveal",
    "imageAsset": "Action_Card_Reveal.jpg",
    "manaCost": 0,
    "type": "free",
    "effect": "draw_cards",
    "effectValue": 0,
    "rarity": "common",
    "stackable": false,
    "targetType": "opponent",
    "statusApplied": [],
    "description": "Peek at your opponent's hand — see all cards they're currently holding."
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
    "statusApplied": ["status_sidestep"],
    "description": "A friendly hero or player gets a 1/2 dodge chance against the next attack or debuff."
  },
  {
    "id": "action_vitalize",
    "name": "Vitalize",
    "imageAsset": "Action_Card_Vitalize.jpg",
    "manaCost": 1,
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
    "type": "conditional",
    "duration": null,
    "stackBehavior": "replace",
    "trigger": "targeted_by_shish_ke_bob",
    "symbol": "🍖",
    "description": "Can be consumed by Shish-Ke-Bob."
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
    "duration": 2,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "⬆",
    "description": "Base attack increased by 2."
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
    "description": "Takes 1 damage at the start of each turn."
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
    "description": "Under opponent's control for 1 turn."
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
    "playerBaseAttack": 2,
    "actionsPerTurn": 1,
    "baseAttackCountsAsAction": true,
    "abilityCountsAsAction": true,
    "acceleratedActionsAllowed": 2,
    "canUseAbilityOnDeployTurn": true,
    "actionCardsPerTurn": 1,
    "freeActionCardsUnlimited": true,
    "freeActionsAllowedOnOpponentTurn": true
  },
  "phases": ["rolloff", "etiquette", "combat"],
  "etiquetteRules": { "abilitiesAllowed": false, "actionCardsAllowed": false, "attacksAllowed": false, "shopAllowed": true, "deployAllowed": true }
}

}; // end GAME_DATA_INLINE
