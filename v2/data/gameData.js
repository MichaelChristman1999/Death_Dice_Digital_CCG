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
    "stage": "S1", "manaCost": 2, "hp": 10, "baseAttack": 3, "role": "Support",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_aegalien",
    "name": "Aegalien",
    "imageAsset": "DD_Aegalien.png",
    "stage": "S1", "manaCost": 2, "hp": 10, "baseAttack": 3, "role": "Fighter",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_aster_roid",
    "name": "Aster Roid",
    "imageAsset": "DD_Aster Roid.png",
    "stage": "S2", "manaCost": 3, "hp": 12, "baseAttack": 4, "role": "Ranged",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_baller_ina",
    "name": "Baller-Ina",
    "imageAsset": "DD_Baller Ina.png",
    "stage": "S1", "manaCost": 2, "hp": 8, "baseAttack": 3, "role": "Agile",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_bearzerk",
    "name": "Bearzerk",
    "imageAsset": "DD_Bearzerk.png",
    "stage": "S2", "manaCost": 3, "hp": 14, "baseAttack": 5, "role": "Brute",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_beeatrice",
    "name": "Beeatrice",
    "imageAsset": "DD_Beeatrice.png",
    "stage": "S1", "manaCost": 2, "hp": 9, "baseAttack": 2, "role": "Support",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_breast_knuckle",
    "name": "Breast Knuckle",
    "imageAsset": "DD_Breast Knuckle.png",
    "stage": "S1", "manaCost": 2, "hp": 11, "baseAttack": 4, "role": "Fighter",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_bro_chill",
    "name": "Bro Chill",
    "imageAsset": "DD_Bro Chill.png",
    "stage": "S1", "manaCost": 1, "hp": 8, "baseAttack": 2, "role": "Control",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_cath_eine",
    "name": "Cath-Eine",
    "imageAsset": "DD_Cath Eine.png",
    "stage": "S1", "manaCost": 2, "hp": 9, "baseAttack": 3, "role": "Support",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_cheatah",
    "name": "Cheatah",
    "imageAsset": "DD_Cheatah.png",
    "stage": "S2", "manaCost": 3, "hp": 10, "baseAttack": 4, "role": "Trickster",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_chicki_barstooli",
    "name": "Chicki Barstooli",
    "imageAsset": "DD_Chicki Barstooli.png",
    "stage": "S1", "manaCost": 2, "hp": 10, "baseAttack": 3, "role": "Fighter",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_copy_cat",
    "name": "Copy Cat",
    "imageAsset": "DD_Copy Cat.png",
    "stage": "S2", "manaCost": 3, "hp": 9, "baseAttack": 3, "role": "Trickster",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_cut_lass",
    "name": "Cut Lass",
    "imageAsset": "DD_Cut Lass.png",
    "stage": "S1", "manaCost": 2, "hp": 10, "baseAttack": 4, "role": "Duelist",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_determinator",
    "name": "Determinator",
    "imageAsset": "DD_Determinator.png",
    "stage": "S2", "manaCost": 3, "hp": 13, "baseAttack": 4, "role": "Tank",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_disc_jockey",
    "name": "Disc Jockey",
    "imageAsset": "DD_Disc Jockey.png",
    "stage": "S1", "manaCost": 2, "hp": 9, "baseAttack": 3, "role": "Support",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_dread_locks",
    "name": "Dread Locks",
    "imageAsset": "DD_Dread Locks.png",
    "stage": "S2", "manaCost": 3, "hp": 11, "baseAttack": 3, "role": "Control",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_equinox",
    "name": "Equinox",
    "imageAsset": "DD_Equinox.png",
    "stage": "S3", "manaCost": 5, "hp": 16, "baseAttack": 5, "role": "Leader",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_fryborg",
    "name": "Fryborg",
    "imageAsset": "DD_Fryborg.png",
    "stage": "S2", "manaCost": 3, "hp": 12, "baseAttack": 4, "role": "Ranged",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_geezer_freezer",
    "name": "Geezer Freezer",
    "imageAsset": "DD_Geezer Freezer.png",
    "stage": "S2", "manaCost": 3, "hp": 14, "baseAttack": 3, "role": "Tank",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_ghoulia",
    "name": "Ghoulia",
    "imageAsset": "DD_Ghoulia.png",
    "stage": "S1", "manaCost": 2, "hp": 9, "baseAttack": 3, "role": "Trickster",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_giant_jess",
    "name": "Giant Jess",
    "imageAsset": "DD_Giant Jess.png",
    "stage": "S3", "manaCost": 5, "hp": 18, "baseAttack": 6, "role": "Brute",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_goosebump",
    "name": "Goosebump",
    "imageAsset": "DD_Goosebump.png",
    "stage": "S1", "manaCost": 2, "hp": 8, "baseAttack": 3, "role": "Agile",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_gorgon_zola",
    "name": "Gorgon Zola",
    "imageAsset": "DD_Gorgon Zola.png",
    "stage": "S2", "manaCost": 3, "hp": 11, "baseAttack": 3, "role": "Control",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_hip_hop_papa",
    "name": "Hip Hop Papa",
    "imageAsset": "DD_Hip Hop Papa.png",
    "stage": "S2", "manaCost": 3, "hp": 12, "baseAttack": 3, "role": "Duelist",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_in_specter",
    "name": "In-Specter",
    "imageAsset": "DD_In-Specter.png",
    "stage": "S1", "manaCost": 2, "hp": 8, "baseAttack": 2, "role": "Support",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_iron_maid",
    "name": "Iron Maid",
    "imageAsset": "DD_Iron Maid.png",
    "stage": "S2", "manaCost": 3, "hp": 13, "baseAttack": 4, "role": "Tank",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_juju_jitsu",
    "name": "Juju Jitsu",
    "imageAsset": "DD_Juju Jitsu.png",
    "stage": "S1", "manaCost": 2, "hp": 10, "baseAttack": 4, "role": "Fighter",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_kevlard",
    "name": "Kevlard",
    "imageAsset": "DD_Kevlard.png",
    "stage": "S2", "manaCost": 3, "hp": 16, "baseAttack": 3, "role": "Tank",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_lassquach",
    "name": "Lassquach",
    "imageAsset": "DD_Lassquach.png",
    "stage": "S1", "manaCost": 2, "hp": 10, "baseAttack": 3, "role": "Trickster",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_lone_wolf",
    "name": "Lone Wolf",
    "imageAsset": "DD_Lone Wolf.png",
    "stage": "S2", "manaCost": 3, "hp": 11, "baseAttack": 5, "role": "Agile",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_marionetta",
    "name": "Marionetta",
    "imageAsset": "DD_Marionetta.png",
    "stage": "S3", "manaCost": 4, "hp": 10, "baseAttack": 3, "role": "Control",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_mob_barley",
    "name": "Mob Barley",
    "imageAsset": "DD_Mob Barley.png",
    "stage": "S2", "manaCost": 3, "hp": 12, "baseAttack": 4, "role": "Brute",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_mr_immutable",
    "name": "Mr. Immutable",
    "imageAsset": "DD_Mr. Immutable.png",
    "stage": "S3", "manaCost": 4, "hp": 14, "baseAttack": 3, "role": "Tank",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_mumma_mia",
    "name": "Mumma Mia",
    "imageAsset": "DD_Mumma Mia.png",
    "stage": "S2", "manaCost": 3, "hp": 11, "baseAttack": 3, "role": "Support",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_prowl_ball",
    "name": "Prowl Ball",
    "imageAsset": "DD_Prowl Ball.png",
    "stage": "S1", "manaCost": 2, "hp": 10, "baseAttack": 3, "role": "Duelist",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_riff_wrath",
    "name": "Riff Wrath",
    "imageAsset": "DD_Riff Wrath.png",
    "stage": "S2", "manaCost": 3, "hp": 11, "baseAttack": 4, "role": "Fighter",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_ruby_goldberg",
    "name": "Ruby Goldberg",
    "imageAsset": "DD_Ruby Goldberg.png",
    "stage": "S2", "manaCost": 3, "hp": 10, "baseAttack": 3, "role": "Ranged",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_shell_shocked",
    "name": "Shell Shocked",
    "imageAsset": "DD_Shell Shocked.png",
    "stage": "S2", "manaCost": 3, "hp": 15, "baseAttack": 3, "role": "Tank",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_shish_ke_bob",
    "name": "Shish-Ke-Bob",
    "imageAsset": "DD_Shish-Ke-Bob.png",
    "stage": "S1", "manaCost": 2, "hp": 10, "baseAttack": 3, "role": "Ranged",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_sir_ringe",
    "name": "Sir Ringe",
    "imageAsset": "DD_Sir Ringe.png",
    "stage": "S1", "manaCost": 2, "hp": 9, "baseAttack": 3, "role": "Support",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_slendeer",
    "name": "Slendeer",
    "imageAsset": "DD_Slendeer.png",
    "stage": "S1", "manaCost": 2, "hp": 8, "baseAttack": 3, "role": "Agile",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_stallwart",
    "name": "Stallwart",
    "imageAsset": "DD_Stallwart.png",
    "stage": "S2", "manaCost": 3, "hp": 16, "baseAttack": 3, "role": "Tank",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_trollnet",
    "name": "Trollnet",
    "imageAsset": "DD_Trollnet.png",
    "stage": "S2", "manaCost": 3, "hp": 12, "baseAttack": 4, "role": "Control",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_trophy_wife",
    "name": "Trophy Wife",
    "imageAsset": "DD_Trophy Wife.png",
    "stage": "S2", "manaCost": 3, "hp": 10, "baseAttack": 3, "role": "Duelist",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_tyrantosaurus",
    "name": "Tyrantosaurus",
    "imageAsset": "DD_Tyrantosaurus.png",
    "stage": "S3", "manaCost": 5, "hp": 18, "baseAttack": 6, "role": "Brute",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_val_cano",
    "name": "Val Cano",
    "imageAsset": "DD_Val Cano.png",
    "stage": "S2", "manaCost": 3, "hp": 12, "baseAttack": 4, "role": "Ranged",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_wei_fu",
    "name": "Wei Fu",
    "imageAsset": "DD_Wei Fu.png",
    "stage": "S2", "manaCost": 3, "hp": 10, "baseAttack": 4, "role": "Agile",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_wind_breaker",
    "name": "Wind Breaker",
    "imageAsset": "DD_Wind Breaker.png",
    "stage": "S2", "manaCost": 3, "hp": 11, "baseAttack": 3, "role": "Ranged",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_yeast_priest",
    "name": "Yeast Priest",
    "imageAsset": "DD_Yeast Priest.png",
    "stage": "S1", "manaCost": 2, "hp": 9, "baseAttack": 2, "role": "Support",
    "passives": [], "abilities": [], "flavorText": ""
  },
  {
    "id": "hero_zoom_stick",
    "name": "Zoom Stick",
    "imageAsset": "DD_Zoom Stick.png",
    "stage": "S1", "manaCost": 2, "hp": 8, "baseAttack": 3, "role": "Support",
    "passives": [], "abilities": [], "flavorText": ""
  }
],

// ─── ACTION CARDS ─────────────────────────────────────────────────────────────
actions: [
  {
    "id": "action_abstain",
    "name": "Abstain",
    "imageAsset": "Action Card_Abstain.jpg",
    "manaCost": 0,
    "type": "free",
    "effect": "draw_cards",
    "effectValue": 1,
    "stackable": false,
    "targetType": "self",
    "statusApplied": [],
    "description": "Pass your action this turn to draw 1 card. Can be played any time."
  },
  {
    "id": "action_anemic_potion",
    "name": "Anemic Potion",
    "imageAsset": "Action Card_Anemic Potion.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_anemic"],
    "description": "Drain an enemy's strength — reduce their base attack by 2 for 2 turns."
  },
  {
    "id": "action_augment",
    "name": "Augment",
    "imageAsset": "Action Card_Augment.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "stackable": false,
    "targetType": "single_ally",
    "statusApplied": ["status_augmented"],
    "description": "Boost a friendly character — +2 attack for 2 turns."
  },
  {
    "id": "action_blood_mana",
    "name": "Blood Mana",
    "imageAsset": "Action Card_Blood Mana.jpg",
    "manaCost": 0,
    "type": "free",
    "effect": "heal",
    "effectValue": -3,
    "stackable": false,
    "targetType": "self",
    "statusApplied": [],
    "description": "Sacrifice 3 of your HP to gain 3 mana. Can be played any time."
  },
  {
    "id": "action_bombs_away",
    "name": "Bombs Away",
    "imageAsset": "Action Card_Bombs Away.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "cascade_damage",
    "effectValue": 2,
    "stackable": false,
    "targetType": "all_enemies",
    "statusApplied": [],
    "description": "Deal 2 damage to all enemy characters on the board."
  },
  {
    "id": "action_cheese_potion",
    "name": "Cheese Potion",
    "imageAsset": "Action Card_Cheese Potion.jpg",
    "manaCost": 0,
    "type": "free",
    "effect": "random_effect",
    "effectValue": 0,
    "stackable": false,
    "targetType": "random",
    "statusApplied": [],
    "description": "Something chaotic happens. Could be wonderful. Could be terrible. Who knows."
  },
  {
    "id": "action_cleanse",
    "name": "Cleanse",
    "imageAsset": "Action Card_Cleanse.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "remove_status",
    "effectValue": 0,
    "stackable": false,
    "targetType": "single_ally",
    "statusApplied": [],
    "description": "Remove all negative status effects from a friendly character."
  },
  {
    "id": "action_cripple",
    "name": "Cripple",
    "imageAsset": "Action Card_Cripple.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_crippled"],
    "description": "Prevent an enemy character from attacking for 1 turn."
  },
  {
    "id": "action_damage_potion",
    "name": "Damage Potion",
    "imageAsset": "Action Card_Damage Potion.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "deal_damage",
    "effectValue": 4,
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": [],
    "description": "Hurl a vial of pure hurt. Deal 4 damage to an enemy character."
  },
  {
    "id": "action_drunk_potion",
    "name": "Drunk Potion",
    "imageAsset": "Action Card_Drunk Potion.jpg",
    "manaCost": 0,
    "type": "free",
    "effect": "apply_status",
    "effectValue": 0,
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_drunk"],
    "description": "Enemy character attacks a random target (ally or enemy) next turn."
  },
  {
    "id": "action_exploit",
    "name": "Exploit",
    "imageAsset": "Action Card_Exploit.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "deal_damage",
    "effectValue": 5,
    "stackable": false,
    "targetType": "single_enemy_with_status",
    "statusApplied": [],
    "description": "Deal 5 damage to an enemy that already has a status effect on it."
  },
  {
    "id": "action_gas_potion",
    "name": "Gas Potion",
    "imageAsset": "Action Card_Gas Potion.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_poisoned"],
    "description": "Poison an enemy — deal 1 damage at the start of each of their turns for 3 turns."
  },
  {
    "id": "action_imp_aired",
    "name": "Imp-Aired",
    "imageAsset": "Action Card_Imp-Aired.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_impaired"],
    "description": "A mischievous imp tampers with an enemy — they cannot use abilities for 2 turns."
  },
  {
    "id": "action_impede",
    "name": "Impede",
    "imageAsset": "Action Card_Impede.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "apply_status",
    "effectValue": 0,
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_impeded"],
    "description": "Slow an enemy — they cannot attack or use abilities until your next turn."
  },
  {
    "id": "action_love_potion",
    "name": "Love Potion",
    "imageAsset": "Action Card_Love Potion.jpg",
    "manaCost": 2,
    "type": "paid",
    "effect": "control_character",
    "effectValue": 1,
    "stackable": false,
    "targetType": "single_enemy",
    "statusApplied": ["status_charmed"],
    "description": "An enemy falls head over heels — they immediately attack their own player, then swoon (tapped)."
  },
  {
    "id": "action_reveal",
    "name": "Reveal",
    "imageAsset": "Action Card_Reveal.jpg",
    "manaCost": 0,
    "type": "free",
    "effect": "draw_cards",
    "effectValue": 0,
    "stackable": false,
    "targetType": "opponent",
    "statusApplied": [],
    "description": "Peek at your opponent's hand — see all cards they're currently holding."
  },
  {
    "id": "action_vitalize",
    "name": "Vitalize",
    "imageAsset": "Action Card_Vitalize.jpg",
    "manaCost": 1,
    "type": "paid",
    "effect": "heal",
    "effectValue": 4,
    "stackable": false,
    "targetType": "single_ally",
    "statusApplied": [],
    "description": "Restore 4 HP to a friendly character or 4 HP to yourself."
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
    "duration": 1,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "⚡",
    "description": "May use one additional action this turn."
  },
  {
    "id": "status_anemic",
    "name": "Anemic",
    "type": "timed",
    "duration": 2,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "🩸",
    "description": "Base attack reduced by 2."
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
    "description": "Cannot attack this turn."
  },
  {
    "id": "status_drunk",
    "name": "Drunk",
    "type": "timed",
    "duration": 1,
    "stackBehavior": "replace",
    "trigger": "on_attack",
    "symbol": "🍺",
    "description": "Attacks a random target instead of the declared one."
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
    "description": "Cannot use abilities."
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
    "id": "status_taunt",
    "name": "Taunting",
    "type": "timed",
    "duration": 2,
    "stackBehavior": "replace",
    "trigger": null,
    "symbol": "🛡",
    "description": "Enemies must attack this character."
  }
],

// ─── RULES ────────────────────────────────────────────────────────────────────
rules: {
  "startingPlayerHP": 20,
  "startingHand": { "hero": 3, "action": 4 },
  "handLimits": { "hero": 5, "action": 5 },
  "shopCosts": { "hero": 2, "action": 1 },
  "shopLimits": { "purchasesPerTurn": 1 },
  "dice": { "sides": 6, "damageRule": "difference", "roll6ResetsRequired": true, "roll6ManaValue": 6 },
  "mana": {
    "sourceIsRoll": true,
    "discardForMana": { "enabled": true, "maxHeroPerTurn": 1, "maxActionPerTurn": 1, "refundFullCost": true }
  },
  "combat": {
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
