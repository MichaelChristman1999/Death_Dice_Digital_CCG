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
    "heroAbility": "Chocolate Clams (3 mana): Inflict Charmed on an enemy hero or player for 1 turn.",
    "docAbility": "Chocolate Clams (3 mana): Inflict Charmed on an enemy hero or player for 1 turn.",
    "rolePassive": {
      "name": "Enact",
      "description": "After Death Die rolls, roll by HP tier to draw up to 2 free action cards."
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
    "heroAbility": "Lapis Lazuli (4 mana): Deal 3 damage and inflict Impaired, then Cripple if the target is not already Crippled or Rabid.",
    "docAbility": "Lapis Lazuli (4 mana): Deal 3 damage and inflict Impaired, then Cripple if the target is not already Crippled or Rabid.",
    "rolePassive": {
      "name": "Foresight",
      "description": "While captain, the shop shows the current row plus future hero and action rows."
    }
  },
  {
    "id": "hero_aster_roid",
    "name": "Aster Roid",
    "imageAsset": "DD_Aster_Roid.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 24,
    "baseAttack": 4,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Strength",
    "archetype": "Juggernaut",
    "heroAbility": "Roid Rage (4 mana): Aster Roid gains x1.5 damage for 3 turns, up to +8 overhealth, and cannot be healed during Roid Rage.",
    "docAbility": "Roid Rage (4 mana): Aster Roid gains x1.5 damage for 3 turns, up to +8 overhealth, and cannot be healed during Roid Rage.",
    "rolePassive": {
      "name": "Crit-Hit Chance",
      "description": "HP-tier chance to double outgoing damage, then Crit-Hit goes on a 2-turn cooldown."
    }
  },
  {
    "id": "hero_baller_ina",
    "name": "Baller-ina",
    "imageAsset": "DD_Baller-ina.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 12,
    "baseAttack": 3,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Agility",
    "archetype": "Athlete",
    "heroAbility": "Basket-Ballad (2 mana): Duel an enemy hero. The loser takes 5 damage. If Baller-ina wins, she and your player gain Sidestep.",
    "docAbility": "Basket-Ballad (2 mana): Duel an enemy hero. The loser takes 5 damage. If Baller-ina wins, she and your player gain Sidestep.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "HP-tier chance for the captain or player to dodge incoming damage or debuffs, up to 3 dodges per turn."
    }
  },
  {
    "id": "hero_bearzerk",
    "name": "Bearzerk",
    "imageAsset": "DD_Bearzerk.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 20,
    "baseAttack": 5,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Strength",
    "archetype": "Predator",
    "heroAbility": "Bearzerker Rampage (6 mana): Deal 5 damage to all enemy heroes and player. Heal 2 HP for each enemy hero killed.",
    "docAbility": "Bearzerker Rampage (6 mana): Deal 5 damage to all enemy heroes and player. Heal 2 HP for each enemy hero killed.",
    "rolePassive": {
      "name": "Crit-Hit Chance",
      "description": "HP-tier chance to double outgoing damage, then Crit-Hit goes on a 2-turn cooldown."
    }
  },
  {
    "id": "hero_beeatrice",
    "name": "Buzz-Kill",
    "imageAsset": "DD_Buzz-Kill.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 4,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Agility",
    "archetype": "Insect",
    "heroAbility": "Stinging Barbs (4 mana): Deal 3 damage to an enemy hero or player, or 6 damage if that target is debuffed.",
    "docAbility": "Stinging Barbs (4 mana): Deal 3 damage to an enemy hero or player, or 6 damage if that target is debuffed.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "HP-tier chance for the captain or player to dodge incoming damage or debuffs, up to 3 dodges per turn."
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
    "heroAbility": "Bust Thrust (4 mana): Duel an enemy hero. The loser takes 7 damage. If Breast Knuckle wins, Impede and Cripple the loser, then give Breast Knuckle and your player +4 armor.",
    "docAbility": "Bust Thrust (4 mana): Duel an enemy hero. The loser takes 7 damage. If Breast Knuckle wins, Impede and Cripple the loser, then give Breast Knuckle and your player +4 armor.",
    "rolePassive": {
      "name": "Duelist",
      "description": "Captain adds an HP-tier bonus to duel rolls: +2 Robust, +3 Vulnerable, +4 Critical, or +5 Near-Death."
    }
  },
  {
    "id": "hero_bro_chill",
    "name": "Aplombinable",
    "imageAsset": "DD_Aplombinable.png",
    "stage": "S1",
    "manaCost": 6,
    "hp": 24,
    "baseAttack": 4,
    "role": "Control",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Legendary",
    "heroAbility": "Chill Out! (5 mana): Cleanse and heal 3 HP to all allied heroes and player.",
    "heroPassive": {
      "name": "Aplomb",
      "description": "On your regular turn roll, a 4-6 Cleanses and heals 2 HP to Aplombinable and your player."
    },
    "docAbility": "Chill Out! (5 mana): Cleanse and heal 3 HP to all allied heroes and player.",
    "rolePassive": {
      "name": "Invocation",
      "description": "After Death Die rolls, roll by HP tier to draw up to 2 free hero cards."
    }
  },
  {
    "id": "hero_cath_eine",
    "name": "Cath-eine",
    "imageAsset": "DD_Cath-eine.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 12,
    "baseAttack": 2,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Agility",
    "archetype": "Neurotic",
    "heroAbility": "Caffeine Rush (3 mana): Cath-eine gains Accelerated and Sidestep, then deals 4 damage to an enemy hero or player.",
    "docAbility": "Caffeine Rush (3 mana): Cath-eine gains Accelerated and Sidestep, then deals 4 damage to an enemy hero or player.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "HP-tier chance for the captain or player to dodge incoming damage or debuffs, up to 3 dodges per turn."
    }
  },
  {
    "id": "hero_cheatah",
    "name": "Cheatah",
    "imageAsset": "DD_Cheatah.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 16,
    "baseAttack": 3,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Speed",
    "archetype": "Thief",
    "heroAbility": "Cheetah Code (4 mana): Accelerate Cheatah and your player. Your player also ignores the next failed Death Die damage and gains +4 mana, bypassing the mana cap.",
    "docAbility": "Cheetah Code (4 mana): Accelerate Cheatah and your player. Your player also ignores the next failed Death Die damage and gains +4 mana, bypassing the mana cap.",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action-card slot while this hero is captain. After Death Die rolls, roll by HP tier to Accelerate your player and allied heroes."
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
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Passive",
    "archetype": "Boozer",
    "heroPassive": {
      "name": "Petite Petulance",
      "description": "When Chicki Barstooli takes damage, she gains Damage Boost for 3 turns and has a 1/2 chance to Retaliate for 4 damage to the attacker."
    },
    "docAbility": "Petite Petulance (Hero Passive): When Chicki Barstooli takes damage, she gains Damage Boost for 3 turns and has a 1/2 chance to Retaliate for 4 damage to the attacker.",
    "rolePassive": {
      "name": "Imbue",
      "description": "When assigned captain, share passive pressure with the player and allied heroes for 3 turns. After Death Die rolls, roll by HP tier to refresh Imbued."
    }
  },
  {
    "id": "hero_copy_cat",
    "name": "Copy-Cat",
    "imageAsset": "DD_Copy-Cat.png",
    "stage": "S2",
    "manaCost": 1,
    "hp": 4,
    "baseAttack": 2,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Agility",
    "archetype": "Multiplier",
    "heroAbility": "Meowrox (0 mana): Give Copy-Cat 4 overhealth and create a Copy if there is room. If the field is full, your first action card becomes free to cast.",
    "docAbility": "Meowrox (0 mana): Give Copy-Cat 4 overhealth and create a Copy if there is room. If the field is full, your first action card becomes free to cast.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "HP-tier chance for the captain or player to dodge incoming damage or debuffs, up to 3 dodges per turn."
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
    "heroAbility": "Booty Brawl (3 mana): Duel an enemy hero. If Cut-Lass wins, the loser takes 6 damage and you loot up to 2 mana plus 1 action card.",
    "docAbility": "Booty Brawl (3 mana): Duel an enemy hero. If Cut-Lass wins, the loser takes 6 damage and you loot up to 2 mana plus 1 action card.",
    "rolePassive": {
      "name": "Duelist",
      "description": "Captain adds an HP-tier bonus to duel rolls: +2 Robust, +3 Vulnerable, +4 Critical, or +5 Near-Death."
    }
  },
  {
    "id": "hero_determinator",
    "name": "De-Terminator",
    "imageAsset": "DD_De-Terminator.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 28,
    "baseAttack": 3,
    "role": "Tank",
    "passives": [
      {
        "name": "De-Termination",
        "description": "Survive one lethal hit by respawning with 15 HP. If De-Terminator later dies while your player is near death or critical, your player gains 12 overhealth."
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Durability",
    "archetype": "Mercenary",
    "heroPassive": {
      "name": "De-Termination",
      "description": "Survive one lethal hit by respawning with 15 HP. If De-Terminator later dies while your player is near death or critical, your player gains 12 overhealth."
    },
    "docAbility": "De-Termination (Hero Passive): Survive one lethal hit by respawning with 15 HP. If De-Terminator later dies while your player is near death or critical, your player gains 12 overhealth.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Captain absorbs damage and debuffs that would hit the player or other heroes. Each protected target redirects one hit; the captain can resist disabling CC and regenerates at lower player HP tiers."
    }
  },
  {
    "id": "hero_disc_jockey",
    "name": "Disc Jockey",
    "imageAsset": "DD_Disc_Jockey.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 16,
    "baseAttack": 2,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Speed",
    "archetype": "Medic",
    "heroAbility": "Ambient Heal (3 mana): Cleanse debuffed allies and heal all allied heroes and player for up to 6 HP. No overheal.",
    "docAbility": "Ambient Heal (3 mana): Cleanse debuffed allies and heal all allied heroes and player for up to 6 HP. No overheal.",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action-card slot while this hero is captain. After Death Die rolls, roll by HP tier to Accelerate your player and allied heroes."
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
    "heroAbility": "Deadlock (3 mana): Duel an enemy hero. If Dread-Locks wins, the loser takes 4 damage and the enemy is Locked Out for 3 turns.",
    "docAbility": "Deadlock (3 mana): Duel an enemy hero. If Dread-Locks wins, the loser takes 4 damage and the enemy is Locked Out for 3 turns.",
    "rolePassive": {
      "name": "Enact",
      "description": "After Death Die rolls, roll by HP tier to draw up to 2 free action cards."
    }
  },
  {
    "id": "hero_equinox",
    "name": "Equinox",
    "imageAsset": "DD_Equinox.png",
    "stage": "S3",
    "manaCost": 7,
    "hp": 28,
    "baseAttack": 5,
    "role": "Leader",
    "passives": [
      {
        "name": "Stellar Stability",
        "description": "When your roll is 4-6, heal all allied heroes and player for 4 HP with overheal allowed."
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Legendary",
    "archetype": "Celestial",
    "heroPassive": {
      "name": "Stellar Stability",
      "description": "When your roll is 4-6, heal all allied heroes and player for 4 HP with overheal allowed."
    },
    "heroAbility": "Swift Squall (6 mana): Give all allied heroes and player Accelerated, Augmented, and Sidestep for 3 turns.",
    "docAbility": "Swift Squall (6 mana): Give all allied heroes and player Accelerated, Augmented, and Sidestep for 3 turns. Stellar Stability (Hero Passive): When your roll is 4-6, heal all allied heroes and player for 4 HP with overheal allowed.",
    "rolePassive": {
      "name": "Invocation",
      "description": "After Death Die rolls, roll by HP tier to draw up to 2 free hero cards."
    }
  },
  {
    "id": "hero_fryborg",
    "name": "Fry-Borg",
    "imageAsset": "DD_Fry-Borg.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 24,
    "baseAttack": 4,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Technique",
    "archetype": "Greaser",
    "heroAbility": "Sci-Fry (5 mana): Duel an enemy hero. If Fry-Borg wins, the loser takes 5 damage and Burning.",
    "docAbility": "Sci-Fry (5 mana): Duel an enemy hero. If Fry-Borg wins, the loser takes 5 damage and Burning.",
    "rolePassive": {
      "name": "Duelist",
      "description": "Captain adds an HP-tier bonus to duel rolls: +2 Robust, +3 Vulnerable, +4 Critical, or +5 Near-Death."
    }
  },
  {
    "id": "hero_geezer_freezer",
    "name": "Geezer Freezer",
    "imageAsset": "DD_Geezer_Freezer.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 20,
    "baseAttack": 3,
    "role": "Tank",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Passive",
    "archetype": "Subzero",
    "healthTypes": [
      { "name": "Health", "value": 10 },
      { "name": "Verglas", "value": 10 }
    ],
    "heroPassive": {
      "name": "Frozen Assets",
      "description": "When enemy damage chips away Geezer Freezer's Verglas, the attacker takes 2 damage and Frozen."
    },
    "docAbility": "Frozen Assets (Hero Passive): Deal 2 damage, also inflicting Frozen status to enemy hero/player if debuffed or looted. Frozen (debuff): Frozen heroes/player receive x2 dmg & can’t attack or use abilities.",
    "rolePassive": {
      "name": "Imbue",
      "description": "When assigned captain, share passive pressure with the player and allied heroes for 3 turns. After Death Die rolls, roll by HP tier to refresh Imbued."
    }
  },
  {
    "id": "hero_ghoulia",
    "name": "Ghoulia",
    "imageAsset": "DD_Ghoulia.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 4,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Agility",
    "archetype": "Ghoul",
    "heroAbility": "Ex-Hex (4 mana): Deal 4 damage and inflict Haunted on an enemy hero or player.",
    "docAbility": "Ability: Ex-Hex (4 mana): Deal 3 dmg & inflict Haunted status on enemy hero/player for up to 3 turns. Haunted (debuffed): Haunted heroes/players take 2 dmg each turn (friendly turns only) & can’t attack or use abilities.",
    "rolePassive": {
      "name": "Evasive Maneuver",
      "description": "HP-tier chance for the captain or player to dodge incoming damage or debuffs, up to 3 dodges per turn."
    }
  },
  {
    "id": "hero_giant_jess",
    "name": "Giant-Tessa",
    "imageAsset": "DD_Giant_Tessa.png",
    "stage": "S3",
    "manaCost": 4,
    "hp": 16,
    "baseAttack": 4,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Strength",
    "archetype": "Kaiju",
    "heroAbility": "Titaness Toss (5 mana): Gain 4 overhealth and +2 base attack, then deal 7 damage to up to 2 enemies.",
    "docAbility": "Ability: Titaness Toss: (4 mana): Deal 6 dmg to 2 enemies (Safeguarding hero protects 1).",
    "rolePassive": {
      "name": "Crit-Hit Chance",
      "description": "HP-tier chance to double outgoing damage, then Crit-Hit goes on a 2-turn cooldown."
    }
  },
  {
    "id": "hero_goosebump",
    "name": "Goose-Bump",
    "imageAsset": "DD_Goose-Bump.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 4,
    "baseAttack": 4,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Speed",
    "archetype": "Infector",
    "heroAbility": "Avian Flu (4 mana): Goose-Bump gains +4 overhealth and Damage Boost, then deals 5 damage and inflicts Rabies on an enemy hero or player.",
    "docAbility": "Ability: Avian Flu (3 mana): Deal 4 dmg & inflict Rabies status on enemy hero/player (Augmented next 2 turns). Rabies (buff/debuff): Heroes/players with Rabies can spread Rabies to enemies attacked, but can’t be healed, receive x2 damage, take Poison damage each turn, & have a 1 / 2 chance to spread it to other heroes/player. Poisoned (debuff): Poisoned enemies take 2 dmg each friendly turn. Augment (buff): Augmented ally heroes & players deal x2 dmg for duration.",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action-card slot while this hero is captain. After Death Die rolls, roll by HP tier to Accelerate your player and allied heroes."
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
    "heroAbility": "Say Cheese! (5 mana): Deal 3 damage and inflict Edible on an enemy hero or player. Has a 1/3 chance to spread.",
    "docAbility": "Ability: Say Cheese! (4 mana): Deal 1 dmg, also inflicting Edible status to enemy hero/player for 3 turns. Edible (debuff): Edible heroes/player can’t attack or use abilities & enemies can attack them to heal 2 HP (4 on lethal hits).",
    "rolePassive": {
      "name": "Enchant",
      "description": "After Death Die rolls, roll by HP tier to gain +3 mana on success or +2 after failed Death Die rolls."
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
    "heroAbility": "Breakback Breakdance (4 mana): 1/2 chance to deal 5 damage to all enemies and Impede the enemy player/captain. On failure, Hip-Hop Papa and your player are Impeded and take 5 damage.",
    "docAbility": "Ability: Breakback Breakdance (3 mana):1 / 2 chance to deal 4 dmg (Unblockable) & Impede all enemy heroes/player; 1 / 2 chance for Papa/player to be Impeded 2 turns & take 4 dmg. Impede:",
    "rolePassive": {
      "name": "Enchant",
      "description": "After Death Die rolls, roll by HP tier to gain +3 mana on success or +2 after failed Death Die rolls."
    }
  },
  {
    "id": "hero_in_specter",
    "name": "In-Specter",
    "imageAsset": "DD_In-Specter.png",
    "stage": "S1",
    "manaCost": 2,
    "hp": 20,
    "baseAttack": 2,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "IQ",
    "archetype": "Investigator",
    "heroAbility": "Sleuth Seance (3 mana): Draw a free action card. If the enemy has that action in hand, inflict Haunted on the enemy player/captain.",
    "docAbility": "Ability: Sleuth Seance (3 mana): Draw & cast any action card you want for free.",
    "rolePassive": {
      "name": "Foresight",
      "description": "While captain, the shop shows the current row plus future hero and action rows."
    }
  },
  {
    "id": "hero_iron_maid",
    "name": "Iron Maid",
    "imageAsset": "DD_Iron_Maid.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 36,
    "baseAttack": 2,
    "role": "Tank",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Durability",
    "archetype": "Caregiver",
    "healthTypes": [
      { "name": "Health", "value": 12 },
      { "name": "Armor", "value": 12 },
      { "name": "Shields", "value": 12 }
    ],
    "heroPassive": {
      "name": "Vacuum Cleaner",
      "description": "Every 2 friendly turns, Cleanse the player and all allied heroes, then heal them for 3 HP. Cannot overheal."
    },
    "docAbility": "Vacuum Cleaner (Hero Passive): Cleanse & Absorb debuffs, healing all other heroes/player 2 HP for each. Absorb (sustain): Absorbed debuffs convert to 2 HP heal for each.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Captain absorbs damage and debuffs that would hit the player or other heroes. Each protected target redirects one hit; the captain can resist disabling CC and regenerates at lower player HP tiers."
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
    "heroAbility": "Vooduel (5 mana): Duel an enemy hero. If Juju-Jitsu wins, the loser takes 6 damage and Jinxed.",
    "docAbility": "Ability: Vooduel (4 mana): Duel enemy, dealing 4 dmg & inflict Jinxed status to enemy hero/player if you win. Jinxed (debuff): Jinxed heroes/player take the amount of damage they dealt to the hero/player that inflicted the jinx.",
    "rolePassive": {
      "name": "Duelist",
      "description": "Captain adds an HP-tier bonus to duel rolls: +2 Robust, +3 Vulnerable, +4 Critical, or +5 Near-Death."
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
        "description": "Kev-Lard has a 1/3 chance to Deflect incoming enemy damage or debuffs."
      }
    ],
    "abilities": [],
    "flavorText": "",
    "roleType": "Durability",
    "archetype": "Gourmand",
    "healthTypes": [
      { "name": "Health", "value": 20 },
      { "name": "Armor", "value": 20 }
    ],
    "heroPassive": {
      "name": "Lard Guard",
      "description": "Kev-Lard has a 1/3 chance to Deflect incoming enemy damage or debuffs."
    },
    "docAbility": "Lard Guard (Hero Passive): Hero has 8 armor & 1 out of 3 chance to Ricochet damage. Ricochet (deflection): Incoming damage activates die event window where 1-4 results in a fail taking damage, rolling 5-6 Ricochets successfully). Die event windows should have one die in the center instead of the two dies for duels.Die event windows when relevant should activate after reg die rolls at beginning of a player’s turn.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Captain absorbs damage and debuffs that would hit the player or other heroes. Each protected target redirects one hit; the captain can resist disabling CC and regenerates at lower player HP tiers."
    }
  },
  {
    "id": "hero_lassquach",
    "name": "Lass-Squatch",
    "imageAsset": "DD_Lassquatch.png",
    "stage": "S1",
    "manaCost": 4,
    "hp": 16,
    "baseAttack": 4,
    "role": "Trickster",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Strength",
    "archetype": "Conservator",
    "heroAbility": "Sass-Squash (5 mana): Lass-Squatch gains 4 overhealth and +2 base attack, then deals 8 damage to an enemy hero/player or an allied hero.",
    "docAbility": "Ability Sass-Squash (4 mana): Deal 6 dmg & Impede enemy hero/player (deal 12 if below half HP). Impeded (debuff): Impeded heroes/player can’t use attacks or abilities for the duration. Crippled (debuff): Crippled heroes/player receive x2 damage for the duration.",
    "rolePassive": {
      "name": "Crit-Hit Chance",
      "description": "HP-tier chance to double outgoing damage, then Crit-Hit goes on a 2-turn cooldown."
    }
  },
  {
    "id": "hero_lone_wolf",
    "name": "Lone Wolf",
    "imageAsset": "DD_Lone_Wolf.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 3,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Passive",
    "archetype": "Mercenary",
    "heroPassive": {
      "name": "Solo El Lobo",
      "description": "When Lone Wolf is your only deployed hero, base attack scales with your player HP tier: x1.5 while Vulnerable, x2 while Critical, and x2.5 while Near-Death. If Imbued to the player, action-card attack damage shares this scaling."
    },
    "docAbility": "Solo El Lobo (Hero Passive): Base attack & action card casts deal x2 dmg if only hero on field (x3 if player is 10 HP or below).",
    "rolePassive": {
      "name": "Imbue",
      "description": "When assigned captain, share passive pressure with the player and allied heroes for 3 turns. After Death Die rolls, roll by HP tier to refresh Imbued."
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
    "heroAbility": "Puppeteer (4 mana): Hypnotize an enemy hero or player for 2 turns. Hypnotized heroes are disabled for their owner; Hypnotized players take 4 self-damage and cannot cast cards or use the Draw Pile.",
    "docAbility": "Ability: Puppeteer (4 mana): Hypnotizing an enemy hero card, making them join your side for 2 turns.",
    "rolePassive": {
      "name": "Foresight",
      "description": "While captain, the shop shows the current row plus future hero and action rows."
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
    "heroPassive": {
      "name": "Wasted",
      "description": "When an enemy fails a die roll while Don Vino is deployed, that enemy player and captain have a chance to become Drunk."
    },
    "heroAbility": "Tapped Out (6 mana): Deal 4 damage and Impede all enemy heroes and player.",
    "docAbility": "Tapped Out (6 mana): Deal 4 damage and Impede all enemy heroes and player. Wasted (Hero Passive): Failed enemy die rolls can inflict Drunk on the enemy player and captain.",
    "rolePassive": {
      "name": "Invocation",
      "description": "After Death Die rolls, roll by HP tier to draw up to 2 free hero cards."
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
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Durability",
    "archetype": "Paragon",
    "healthTypes": [
      { "name": "Health", "value": 16 },
      { "name": "Shields", "value": 16 }
    ],
    "heroPassive": {
      "name": "Immutability",
      "description": "Mr. Immutable is immune to debuffs. While captain, that debuff immunity also protects the player."
    },
    "docAbility": "Immutability (Hero Passive): Hero (& player while in captain slot) are immune to debuffs.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Captain absorbs damage and debuffs that would hit the player or other heroes. Each protected target redirects one hit; the captain can resist disabling CC and regenerates at lower player HP tiers."
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
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Legendary",
    "archetype": "Cryptic",
    "heroPassive": {
      "name": "Mummy Scorned",
      "description": "If Baby is killed, each player and hero takes 6 unstoppable damage and becomes Cursed."
    },
    "heroAbility": "Out of the Tomb (6 mana): Summon Baby for 3 friendly turns. Baby has 4 HP, 1 base attack, and heals plus cleanses allied heroes and player each friendly turn.",
    "docAbility": "Ability: Out of the Tomb (6 mana): Summon Baby which heals 3 HP and Cleanses from player/all heroes. Mummy Scorned (Hero Passive): When Baby is killed, deal 5 dmg (Unstoppable) & inflict Curse to all enemy heroes/player for 3 turns. Cursed (status): Player can only roll up to 3 on their die when Cursed, don’t recieve healing, tdeal half dmg, take x2 dmg, & die roll fails hurt all their heroes (Unstoppable).",
    "rolePassive": {
      "name": "Invocation",
      "description": "After Death Die rolls, roll by HP tier to draw up to 2 free hero cards."
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
    "heroAbility": "Claw Strikeout (3 mana): Duel an enemy hero. If Prowl Ball wins, the loser takes 6 damage and becomes Impeded. On a tie, refund 2 mana.",
    "docAbility": "Ability: Claw Strikeout (3 mana): 2 out of 3 chance to deal 4 dmg & Impede enemy hero (Unblockable).",
    "rolePassive": {
      "name": "Enact",
      "description": "After Death Die rolls, roll by HP tier to draw up to 2 free action cards."
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
    "heroAbility": "Strike a Chord! (3 mana): Duel an enemy hero. If Riff Wrath wins, the loser takes 5 damage and becomes Impeded, then Riff Wrath and your player become Augmented.",
    "docAbility": "Ability: Strike a Chord (3 mana): Deal 3 dmg (along with Impede) to enemy. Impeded (debuff): Impeded heroes/player can’t use attacks or abilities for the duration.",
    "rolePassive": {
      "name": "Enact",
      "description": "After Death Die rolls, roll by HP tier to draw up to 2 free action cards."
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
    "heroAbility": "Goldberg Chain (4 mana): Hit enemy heroes/player with scaling damage and Impaired. Damage starts at 1 with only the player and increases by 1 for each enemy hero or spawn on field, up to 6.",
    "docAbility": "Ability: Goldberg Chain: Unleash a Stack that deals a base 1 dmg (+1 for each enemy (heroes & player) & Impairs durability hero if they’re Safeguarding). Stack (denominator): A Stack when deployed deals base 1 (with 1 player) adding +1 dmg per hero on field to attack the number of player/heroes. Shell-Shock (should be in Mana roll): Ability: Static Splash (5 mana): Deal 4 dmg & inflict Shocked status in all enemy player/heroes. Shocked (debuff): After regular die roll, die event window opens up for Shocked player/heroes to roll a die: Roll 1-2 will result in Shocked hero dying (regardless of remaining HP) and player being able to cast cards, abilities, or attack, Roll 3-4 will result in player & hero being Impeded and taking 3 dmg, and roll 5-6 to taking 1 dmg.",
    "rolePassive": {
      "name": "Foresight",
      "description": "While captain, the shop shows the current row plus future hero and action rows."
    }
  },
  {
    "id": "hero_shell_shocked",
    "name": "Shell-Shock",
    "imageAsset": "DD_Shell-Shock.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 20,
    "baseAttack": 4,
    "role": "Tank",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Mana",
    "archetype": "Marine",
    "heroAbility": "Static Splash (5 mana): Deal 4 damage to all enemy heroes and player, then inflict Shocked and Impeded for 3 turns.",
    "docAbility": "Ability: Static Splash (5 mana): Deal 4 dmg & inflict Shocked status in all enemy player/heroes. Shocked (debuff): After regular die roll, die event window opens up for Shocked player/heroes to roll a die: Roll 1-2 will result in Shocked hero dying regardless of remaining HP and player being unable to cast cards, abilities, or attack, Roll 3-4 will result in player & hero being Impeded and taking 3 dmg, and roll 5-6 to taking 1 dmg.",
    "rolePassive": {
      "name": "Enchant",
      "description": "After Death Die rolls, roll by HP tier to gain +3 mana on success or +2 after failed Death Die rolls."
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
    "heroAbility": "Kebab Skewer (3 mana): Duel an enemy hero. If Shish-Ke-Bob wins, the loser takes 5 damage and becomes Anemic and Impeded for 3 turns.",
    "docAbility": "Ability: Kebab Skewer (3 mana): 2 out of 3 chance to deal 3 dmg, also inflicting Anemic & Impede (for 3 turns) on enemy hero/player. Anemic (debuff): Anemic players/heroes can’t receive healing. Anemic players/heroes can’t receive healing. Impeded (debuff): Impeded heroes/player can’t use attacks or abilities for the duration.",
    "rolePassive": {
      "name": "Enact",
      "description": "After Death Die rolls, roll by HP tier to draw up to 2 free action cards."
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
    "heroAbility": "Biotic Syringe (4 mana): Heal 4 HP and Cleanse an allied hero/player, or deal 4 damage and inflict Anemic on an enemy hero/player.",
    "docAbility": "Ability: Biotic Syringe (4 mana): Deal 4 dmg & inflict Anemic to enemy OR heal 4 HP & Cleanse player/hero. Cleanse (sustain): Ally player/heroes who are Cleansed remove all debuff effects inflicted on them. Anemic (debuff): Anemic players/heroes can’t receive healing.",
    "rolePassive": {
      "name": "Foresight",
      "description": "While captain, the shop shows the current row plus future hero and action rows."
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
    "heroAbility": "Deer Dash (2 mana): Slendeer Cleanses and Accelerates himself, then deals 4 damage to an enemy hero/player.",
    "docAbility": "Ability: Deer Dash (2 mana): Deal 3 dmg while Accelerating & Cleansing. Cleanse (sustain): Ally player/heroes who are Cleansed remove all debuff effects inflicted on them. Accelerated (buff): Accelerated heroes/player can perform an extra action each turn (ability, base attack, action card cast for player).",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action-card slot while this hero is captain. After Death Die rolls, roll by HP tier to Accelerate your player and allied heroes."
    }
  },
  {
    "id": "hero_stallwart",
    "name": "Stall-Wart",
    "imageAsset": "DD_Stall-Wart.png",
    "stage": "S2",
    "manaCost": 5,
    "hp": 16,
    "baseAttack": 2,
    "role": "Tank",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Durability",
    "archetype": "Guardian",
    "healthTypes": [
      { "name": "Health", "value": 16 },
      { "name": "Armor", "value": 12 },
      { "name": "Shields", "value": 12 }
    ],
    "heroPassive": {
      "name": "Stalliwog",
      "description": "Each friendly turn Stall-Wart survives increases his chance to gain 4 overhealth by +1/6. The chance resets after it succeeds."
    },
    "docAbility": "Stalliwog (Hero Passive): Hero has 10 shield health. Shield health regenerates 5 HP every 2 turns.",
    "rolePassive": {
      "name": "Safeguard",
      "description": "Captain absorbs damage and debuffs that would hit the player or other heroes. Each protected target redirects one hit; the captain can resist disabling CC and regenerates at lower player HP tiers."
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
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Passive",
    "archetype": "Provocateur",
    "heroPassive": {
      "name": "Trolljan Virus",
      "description": "Enemy player/captain has a 1/2 chance to be inflicted with Virus when they fail a die roll."
    },
    "docAbility": "Trolljan Virus (Hero Passive): Enemy player/captain has a 1/2 chance to be inflicted with Virus when they fail a die roll.",
    "rolePassive": {
      "name": "Imbue",
      "description": "When assigned captain, share passive pressure with the player and allied heroes for 3 turns. After Death Die rolls, roll by HP tier to refresh Imbued."
    }
  },
  {
    "id": "hero_trophy_wife",
    "name": "Trophy Wife",
    "imageAsset": "DD_Trophy_Wife.png",
    "stage": "S2",
    "manaCost": 2,
    "hp": 16,
    "baseAttack": 2,
    "role": "Duelist",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Passive",
    "archetype": "Fitness",
    "heroPassive": {
      "name": "Trophy Hoard",
      "description": "After a successful Death Die roll, Trophy Wife has a 1/3 chance to draw a non-Legendary hero card that is free to cast."
    },
    "docAbility": "Prized Possession (Hero Passive): Successful die rolls lead to gain 3 mana & drawing action card that’s free to cast.",
    "rolePassive": {
      "name": "Imbue",
      "description": "When assigned captain, share passive pressure with the player and allied heroes for 3 turns. After Death Die rolls, roll by HP tier to refresh Imbued."
    }
  },
  {
    "id": "hero_tyrantosaurus",
    "name": "Tyrantosaurus",
    "imageAsset": "DD_Tyrantosaurus.png",
    "stage": "S3",
    "manaCost": 5,
    "hp": 20,
    "baseAttack": 6,
    "role": "Brute",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Strength",
    "archetype": "Conqueror",
    "heroAbility": "Dino Dominion (6 mana): Deal 8 damage to an enemy hero/player. If this would defeat an enemy hero, Capture it for 3 turns instead.",
    "docAbility": "Ability: Dino Dominion (6 mana): Deal 8 dmg to enemy player/hero, Capturing another enemy hero if it kills. Capture (bondage): [Captured enemy will be on the other player’s field to the far left. A Captured enemy hero will be killed in 3 turns if Tyrantosaurus isn’t killed by then. If Tyrantosaurus is killed, the Captured hero is set free. Captures are an exception to the 5 hero on field limit.",
    "rolePassive": {
      "name": "Crit-Hit Chance",
      "description": "HP-tier chance to double outgoing damage, then Crit-Hit goes on a 2-turn cooldown."
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
    "heroPassive": {
      "name": "Temperature Tantrum",
      "description": "After Volley-Cano takes damage and survives, her next base attack deals +3 damage and inflicts Burning."
    },
    "heroAbility": "Volcanic Volley (6 mana): Deal 5 damage and inflict Burning on all enemy heroes and player.",
    "docAbility": "Ability: Volcanic Volley (6 mana): Deal 5 dmg & inflict Burning status to all enemy heroes & player (for 3 turns). Temperature Tantrum (Hero Passive): Deal 5 dmg to all enemies & inflict Burning status if critical (25% but not 0) HP. Burning (debuff): Burning players/heroes take 3 damage every turn (friendly or enemy) & lose half their action cards. Frozen cancels this out.",
    "rolePassive": {
      "name": "Invocation",
      "description": "After Death Die rolls, roll by HP tier to draw up to 2 free hero cards."
    }
  },
  {
    "id": "hero_wei_fu",
    "name": "Wife-Fu",
    "imageAsset": "DD_Wife-Fu.png",
    "stage": "S2",
    "manaCost": 3,
    "hp": 12,
    "baseAttack": 4,
    "role": "Agile",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Technique",
    "archetype": "Ninja",
    "heroAbility": "Menghu Chuji (4 mana): Duel an enemy hero or player/captain. If Wife-Fu wins, deal 5 damage, or defeat the target outright if it is Near-Death.",
    "docAbility": "Ability: Měnghǔ chūjí (3 mana): Duel enemy, deal 3 dmg to enemy hero/player (or one-hit kill if at 25% or below). Duel (duel event): Opens a duel window. Win condition triggers on a win. Tie results in neither player taking damage. Loss makes the hero who initiated duel take the number of damage that they lost by.",
    "rolePassive": {
      "name": "Duelist",
      "description": "Captain adds an HP-tier bonus to duel rolls: +2 Robust, +3 Vulnerable, +4 Critical, or +5 Near-Death."
    }
  },
  {
    "id": "hero_wind_breaker",
    "name": "Wind Breaker",
    "imageAsset": "DD_Wind_Breaker.png",
    "stage": "S2",
    "manaCost": 4,
    "hp": 20,
    "baseAttack": 2,
    "role": "Ranged",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Mana",
    "archetype": "Gaseous",
    "heroAbility": "Pass Gas (4 mana): Place a gas bomb on the enemy player. If they fail the next Death Die roll, the bomb damages the team, Poisons them, and Impedes only the player/captain.",
    "docAbility": "Ability Pass Gas (4 mana): Die becomes Bomb for enemy player, dealing 3 dmg, Poisoning,& Impeding all enemy heroes & player if they fail. Bomb (bomb): A Bomb die event will have a player roll a die where failing results in all player/heroes taking damage & Impeded. Poisoned (debuff): Poisoned enemies take 2 dmg each friendly turn. Augment (buff): Augmented ally heroes & players deal x2 dmg for duration. Impeded (debuff): Impeded heroes/player can’t use attacks or abilities for the duration.",
    "rolePassive": {
      "name": "Enchant",
      "description": "After Death Die rolls, roll by HP tier to gain +3 mana on success or +2 after failed Death Die rolls."
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
    "heroAbility": "Daily Bread (4 mana): Heal 6 HP, Cleanse, and Bless one allied hero/player. Targeting player or captain shares the effect with both.",
    "docAbility": "Ability: Daily Bread (3 mana): Heal 3 HP, Cleanse, & Bless player and all heroes for 3 turns. Cleanse (sustain): Ally player/heroes who are Cleansed remove all debuff effects inflicted on them. Blessed (buff): Blessed player/heroes will heal 2 HP, deal double damage, can receive overhealing, take half dmg, roll 4-6 on all dice, and Cleansed of debuffs following turn. Bless and Curse cancel out.",
    "rolePassive": {
      "name": "Enchant",
      "description": "After Death Die rolls, roll by HP tier to gain +3 mana on success or +2 after failed Death Die rolls."
    }
  },
  {
    "id": "hero_zoom_stick",
    "name": "Zoomstick",
    "imageAsset": "DD_Zoomstick.png",
    "stage": "S1",
    "manaCost": 3,
    "hp": 8,
    "baseAttack": 3,
    "role": "Support",
    "passives": [],
    "abilities": [],
    "flavorText": "",
    "roleType": "Speed",
    "archetype": "Infector",
    "heroAbility": "Ala Ka-Zoom (3 mana): Accelerate all allied heroes and player.",
    "docAbility": "Ability: Ala Ka-Zoom (3 mana): Accelerate all allied heroes and player.",
    "rolePassive": {
      "name": "Enhanced Reflex",
      "description": "Gain one extra action-card slot while this hero is captain. After Death Die rolls, roll by HP tier to Accelerate your player and allied heroes."
    }
  }
],

// ─── ACTION CARDS ─────────────────────────────────────────────────────────────
actions: [
  {
    "id": "action_abstain",
    "name": "Abstain",
    "imageAsset": "Action_Card_Abstain.jpg",
    "manaCost": 0,
    "type": "free",
    "effect": "draw_cards",
    "effectValue": 2,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "self",
    "statusApplied": [
      "status_abstaining"
    ],
    "description": "Free. Must be played before your major actions. Draw 2 action cards, cleanse Charmed/Drunk/Hypnotized from your player and captain, remove their buffs, prevent player/captain attacks this turn, lock shop purchases this turn, and gain immunity to those control statuses."
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
    "targetType": "ally_any",
    "statusApplied": [
      "status_augmented"
    ],
    "description": "Choose your player/captain or a friendly hero. Gain 2 mana and apply Augmented for 3 turns, adding +2 base attack. If your player/captain is Augmented, the next failed Death Die damage is prevented and Augment wears off."
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
    "description": "Give a friendly hero or player Accelerated for 3 turns. Accelerated heroes untap and can act again. Accelerated players/captains gain +1 action card, hero cast, player attack, draw, discard, and shop purchase. Cancels Impede, Frozen, and Drunk; cannot target Charmed characters."
  },
  {
    "id": "action_blood_mana",
    "name": "Blood Mana",
    "imageAsset": "Action_Card_Blood_Mana.jpg",
    "manaCost": 0,
    "type": "paid",
    "effect": "gain_mana",
    "effectValue": 4,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "self",
    "statusApplied": [],
    "description": "Gain 4 mana, doubled if you are Crippled or Rabid. Take 4 backlash damage, plus 1 for each mana above 6 after the gain. Cannot be used if backlash would defeat you, while Augmented, or after a successful Enchant this turn."
  },
  {
    "id": "action_bombs_away",
    "name": "Bombs Away",
    "imageAsset": "Action_Card_Bombs_Away.jpg",
    "manaCost": 4,
    "type": "paid",
    "effect": "pass_bomb",
    "effectValue": 4,
    "rarity": "rare",
    "stackable": false,
    "targetType": "enemy_player",
    "statusApplied": [
      "status_impeded"
    ],
    "description": "Pass a bomb to the enemy for their next Death Die roll. A 5-6 defuses it and refunds half this card's mana to you. A failed bomb roll deals double the difference and Impedes the recipient; Safeguard can absorb the bomb onto a Durability captain."
  },
  {
    "id": "action_cheese_potion",
    "name": "Cheese Potion",
    "imageAsset": "Action_Card_Cheese_Potion.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "cheese_potion",
    "effectValue": 3,
    "rarity": "common",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_edible"
    ],
    "description": "Deal 3 damage to an enemy hero or player and inflict Edible."
  },
  {
    "id": "action_cleanse",
    "name": "Cleanse",
    "imageAsset": "Action_Card_Cleanse.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "remove_status",
    "effectValue": 1,
    "rarity": "common",
    "stackable": false,
    "targetType": "ally_any",
    "statusApplied": [],
    "description": "Remove all debuffs from a friendly hero or player, then heal 1 HP per debuff removed, or 2 HP each if the target is Critical or Near-Death."
  },
  {
    "id": "action_cripple",
    "name": "Cripple",
    "imageAsset": "Action_Card_Cripple.jpg",
    "manaCost": 3,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 2,
    "rarity": "rare",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_crippled"
    ],
    "description": "Deal 2 damage to an enemy hero or player and inflict Crippled for 2 turns. Cripple does not apply to targets already Crippled or Rabid."
  },
  {
    "id": "action_cryofreeze",
    "name": "Cryofreeze",
    "imageAsset": "Action_Card_Cryofreeze.png",
    "manaCost": 3,
    "type": "paid",
    "effect": "cryofreeze",
    "effectValue": 12,
    "rarity": "rare",
    "stackable": false,
    "targetType": "self",
    "statusApplied": [
      "status_frozen"
    ],
    "description": "Roll a die. 4-6 grants +12 Verglas health to your player and captain. 1-3 deals 2 damage and inflicts Frozen on your player and captain only; cannot be used if the fail damage would defeat you."
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
    "description": "Deal 3 damage to up to 2 enemy targets. Roll a d6; on 6, hit targets burn and your player/captain gain a 3-turn x1.5 damage buff."
  },
  {
    "id": "action_drunk_potion",
    "name": "Drunk Potion",
    "imageAsset": "Action_Card_Drunk_Potion.jpg",
    "manaCost": 3,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 3,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_drunk"
    ],
    "description": "Deal 3 damage and inflict Drunk on an enemy hero or player/captain. Drunk caps player Death Die rolls at 3, halts buffs, can disable Safeguard, and weakens Sidestep."
  },
  {
    "id": "action_rabies",
    "name": "Rabies",
    "imageAsset": "Action_Card_Rabies.png",
    "manaCost": 4,
    "type": "paid",
    "effect": "rabies",
    "effectValue": 0,
    "rarity": "rare",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_rabies"
    ],
    "description": "Inflict Rabies. Rabid targets take 4 damage each turn, take double damage from other sources, resist Cleanse when other debuffs are present, and can spread Rabies."
  },
  {
    "id": "action_gas_potion",
    "name": "Gas Potion",
    "imageAsset": "Action_Card_Gas_Potion.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 1,
    "rarity": "common",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_poisoned"
    ],
    "description": "Deal 1 damage and Poison an enemy. Poison has a 1/2 chance to spread each turn. Casting Gas Potion on a Poisoned enemy has a 1/2 chance to detonate it."
  },
  {
    "id": "action_imp_aired",
    "name": "Imp-Paired",
    "imageAsset": "Action_Card_Imp-Aired.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 2,
    "rarity": "common",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_impaired"
    ],
    "description": "Deal 2 damage and Impair an enemy hero or player/captain. Impaired targets deal half outgoing damage, rounded down, from attacks, abilities, and action cards."
  },
  {
    "id": "action_impede",
    "name": "Impede",
    "imageAsset": "Action_Card_Impede.jpg",
    "manaCost": 3,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 2,
    "rarity": "rare",
    "stackable": false,
    "targetType": "enemy_any",
    "statusApplied": [
      "status_impeded"
    ],
    "description": "Deal 2 damage and Impede an enemy. Impeded targets cannot use Sidestep, Evasive Maneuver, or Safeguard, but can still attack and use most abilities."
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
    "description": "Inflict Charmed. Successful charms heal you 1. Abstaining targets resist, but have a 1/3 chance to take 2 damage."
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
    "description": "A friendly hero or player gets one guaranteed dodge against the next attack or debuff. Accelerated targets gain 2 dodges. Safeguard disables Sidestep."
  },
  {
    "id": "action_vitalize",
    "name": "Vitalize",
    "imageAsset": "Action_Card_Vitalize.jpg",
    "manaCost": 3,
    "type": "paid",
    "effect": "heal",
    "effectValue": 8,
    "rarity": "semi-common",
    "stackable": false,
    "targetType": "ally_any",
    "statusApplied": [
      "status_vitalized"
    ],
    "description": "Heal 8 HP, or 12 if critical, cleanse up to 2 non-Rabies debuffs, and grant Vitalized for 3 turns. Vitalized doubles later healing; recasts only refresh duration."
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
    "description": "Deals half base attack and ability damage. Sidestep and evasion are disabled. Successful base attacks against this target heal the attacker for half damage dealt, doubled with overheal if lethal."
  },
  {
    "id": "status_accelerated",
    "name": "Accelerated",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "⚡",
    "description": "Hero: untaps and may act again. Player/captain: +1 action card, hero cast, player attack, draw, discard, and shop purchase while active. Cancels Impede, Frozen, and Drunk."
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
    "description": "Guaranteed dodge against the next attack or debuff. Accelerated targets gain 2 charges. Drunk reduces the dodge to a 1/2 chance."
  },
  {
    "id": "status_rabies",
    "name": "Rabies",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": "start_of_turn",
    "symbol": "RAB",
    "description": "Takes 4 damage each turn, takes double damage from other sources, can spread Rabies each turn, and has a 1/2 chance to resist Cleanse when another debuff is present."
  },
  {
    "id": "status_vitalized",
    "name": "Vitalized",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "VIT",
    "description": "Receives double healing from later heals. Reapplying Vitalize refreshes this duration without another initial heal or Cleanse."
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
    "description": "Adds +2 base attack. On a player/captain, also prevents the next failed Death Die damage, then expires."
  },
  {
    "id": "status_cheatah_code",
    "name": "Cheetah Code",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": "next_failed_death_die",
    "symbol": "CC",
    "description": "Prevents the next failed Death Die damage and grants +4 mana, bypassing the mana cap."
  },
  {
    "id": "status_crippled",
    "name": "Crippled",
    "type": "timed",
    "duration": 2,
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
    "description": "Player die rolls are capped at 3. Buffs are halted while active, Safeguard has a 1/2 chance to fail, and Sidestep is harder to trigger."
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
    "description": "Outgoing damage from base attacks, abilities, and action cards is halved, rounded down."
  },
  {
    "id": "status_impeded",
    "name": "Impeded",
    "type": "timed",
    "duration": 1,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "⛔",
    "description": "Sidestep, Evasive Maneuver, and Safeguard are disabled. Attacks and most abilities are still allowed."
  },
  {
    "id": "status_charmed",
    "name": "Charmed",
    "type": "timed",
    "duration": 1,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "💕",
    "description": "Cannot target the charmer or their captain; disables Safeguard, Sidestep, and Evasive Maneuver for 1 turn."
  },
  {
    "id": "status_hypnotized",
    "name": "Hypnotized",
    "type": "timed",
    "duration": 2,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "HYP",
    "description": "Control is disrupted. Heroes cannot act for their owner, and players cannot cast cards or use the Draw Pile while Hypnotized."
  },
  {
    "id": "status_abstaining",
    "name": "Abstaining",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "✋",
    "description": "Immune to Charmed, Drunk, and Hypnotized control effects."
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
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "LOCK",
    "description": "Cannot open the shop or draw from the Draw Pile."
  },
  {
    "id": "status_imbued",
    "name": "Imbued",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "IMB",
    "description": "Shares passive pressure from a Passive captain for 3 turns. Passive captains can refresh this after Death Die rolls through Imbue."
  },
  {
    "id": "status_burning",
    "name": "Burning",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": "start_of_turn",
    "symbol": "BRN",
    "description": "Takes 4 damage each turn. Burning players have a 1/3 chance to lose an action card at turn start. Frozen cancels Burning."
  },
  {
    "id": "status_damage_boost",
    "name": "Damage Boost",
    "type": "timed",
    "duration": 3,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "DMG",
    "description": "Base attack and ability damage are multiplied by x1.5 while active."
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
    "description": "Cannot attack or use abilities. Takes 2 damage each friendly turn, can spread, and has a 1/3 chance to auto-eliminate Critical or Near-Death heroes."
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
    "description": "Cannot cast hero or action cards, buy hero cards in the shop, or use the Draw Pile."
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
  "startingHand": { "hero": 1, "action": 3, "duplicateActionChance": 0.3 },
  "handLimits": { "hero": 8, "action": 8 },
  "shopCosts": { "hero": 2, "action": 1 },
  "shopLimits": { "heroPerTurn": 1, "actionPerTurn": 1 },
  "drawPile": { "orderCost": 0, "chaosCost": 1, "maxPerTurn": 1 },
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
