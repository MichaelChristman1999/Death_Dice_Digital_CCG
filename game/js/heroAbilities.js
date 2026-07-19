// Hero Abilities - playable prototype mechanics derived from each card's doc text.
//
// Ability shape consumed by AbilityDispatcher:
//   { abilityName, manaCost, effect, effectValue, targetType, statusApplied, description }

const HeroAbilities = (() => {

  const ROLE_TEMPLATES = {
    Support: {
      abilityName: 'Mend', manaCost: 1, effect: 'heal', effectValue: 3,
      targetType: 'single_ally', statusApplied: [],
      description: 'Heal a friendly character for 3 HP.',
    },
    Fighter: {
      abilityName: 'Strike', manaCost: 2, effect: 'deal_damage', effectValue: 3,
      targetType: 'enemy_any', statusApplied: [],
      description: 'Deal 3 damage to an enemy hero or player.',
    },
    Brute: {
      abilityName: 'Smash', manaCost: 2, effect: 'deal_damage', effectValue: 4,
      targetType: 'enemy_any', statusApplied: [],
      description: 'Deal 4 damage to an enemy hero or player.',
    },
    Ranged: {
      abilityName: 'Snipe', manaCost: 1, effect: 'deal_damage', effectValue: 2,
      targetType: 'enemy_any', statusApplied: [],
      description: 'Deal 2 damage to any enemy character or player.',
    },
    Tank: {
      abilityName: 'Taunt', manaCost: 1, effect: 'apply_status', effectValue: 0,
      targetType: 'self', statusApplied: ['status_taunt'],
      description: 'Enemies must attack this character for 2 turns.',
    },
    Control: {
      abilityName: 'Lockdown', manaCost: 2, effect: 'apply_status', effectValue: 0,
      targetType: 'enemy_any', statusApplied: ['status_crippled'],
      description: 'Cripple an enemy hero or player.',
    },
    Trickster: {
      abilityName: 'Sabotage', manaCost: 1, effect: 'apply_status', effectValue: 0,
      targetType: 'enemy_any', statusApplied: ['status_poisoned'],
      description: 'Poison an enemy hero or player.',
    },
    Agile: {
      abilityName: 'Adrenaline', manaCost: 1, effect: 'apply_status', effectValue: 0,
      targetType: 'self', statusApplied: ['status_augmented'],
      description: 'Gain +2 attack for 2 turns.',
    },
    Duelist: {
      abilityName: 'Challenge', manaCost: 2, effect: 'duel', effectValue: 4,
      targetType: 'single_enemy', statusApplied: [],
      description: 'Duel an enemy character. The loser takes 4 damage.',
    },
    Leader: {
      abilityName: 'Rally', manaCost: 2, effect: 'heal', effectValue: 2,
      targetType: 'all_allies', statusApplied: [],
      description: 'Heal all friendly characters 2 HP.',
    },
  };

  const STATUS_PATTERNS = [
    [/stim/i, 'status_stimulated'],
    [/burning|burn\b/i, 'status_burning'],
    [/frozen|freeze/i, 'status_frozen'],
    [/haunted|haunt/i, 'status_haunted'],
    [/shocked|shock/i, 'status_shocked'],
    [/jinxed|jinx/i, 'status_jinxed'],
    [/cursed|curse/i, 'status_cursed'],
    [/blessed|bless/i, 'status_blessed'],
    [/virus/i, 'status_virus'],
    [/rabies/i, 'status_rabies'],
    [/crippl/i, 'status_crippled'],
    [/impede|slowed|slow\b/i, 'status_impeded'],
    [/migraine|madness|confused|impaired|imprison/i, 'status_impaired'],
    [/anemic|weakened/i, 'status_anemic'],
    [/augment|augmented|adrenaline|amplif|boost|x2|x3/i, 'status_augmented'],
    [/poison|gas|gassed|fumigated|plaqued|plagued|oozing|greasy/i, 'status_poisoned'],
    [/drunk|wasted/i, 'status_drunk'],
    [/love|charm|hypnot/i, 'status_charmed'],
    [/edible/i, 'status_edible'],
    [/accelerate|accelerated/i, 'status_accelerated'],
    [/sidestep/i, 'status_sidestep'],
    [/taunt/i, 'status_taunt'],
  ];

  function getFor(card) {
    const special = _specialFor(card);
    if (special) return [special];

    const fallback = _fallbackFor(card);
    const doc = _sourceText(card);
    const parsed = doc ? _fromDocText(doc, fallback) : null;
    return [parsed ?? fallback];
  }

  function _specialFor(card) {
    if (card.id === 'hero_afrodisiac') {
      return {
        abilityName: 'Chocolate Clams',
        manaCost: 3,
        effect: 'apply_status',
        effectValue: 0,
        targetType: 'enemy_any',
        statusApplied: ['status_charmed'],
        description: card.heroAbility || card.docAbility || 'Inflict Charmed on an enemy hero or player for 1 turn.',
      };
    }

    if (card.id === 'hero_aegalien') {
      return {
        abilityName: 'Lapis Lazuli',
        manaCost: 4,
        effect: 'lapis_lazuli',
        effectValue: 3,
        targetType: 'enemy_any',
        statusApplied: ['status_impaired', 'status_crippled'],
        description: card.heroAbility || card.docAbility || 'Deal 3 damage, Impair, then Cripple if possible.',
      };
    }

    if (card.id === 'hero_cheatah') {
      return {
        abilityName: 'Cheetah Code',
        manaCost: 4,
        effect: 'cheatah_code',
        effectValue: 0,
        targetType: 'self',
        statusApplied: ['status_accelerated', 'status_cheatah_code'],
        description: card.heroAbility || card.docAbility || 'Accelerate Cheatah and your player, then block the next failed Death Die damage for +4 mana.',
      };
    }

    if (card.id === 'hero_aster_roid') {
      return {
        abilityName: 'Roid Rage',
        manaCost: 4,
        effect: 'roid_rage',
        effectValue: 0,
        targetType: 'self',
        statusApplied: ['status_damage_boost', 'status_anemic'],
        description: card.heroAbility || card.docAbility || 'Gain x1.5 damage, +8 overhealth cap, and cannot be healed for 3 turns.',
      };
    }

    if (card.id === 'hero_baller_ina') {
      return {
        abilityName: 'Basket-Ballad',
        manaCost: 2,
        effect: 'duel',
        effectValue: 5,
        targetType: 'single_enemy',
        statusApplied: [],
        description: card.heroAbility || card.docAbility || 'Duel an enemy hero. If Baller-ina wins, she and your player gain Sidestep.',
      };
    }

    if (card.id === 'hero_bearzerk') {
      return {
        abilityName: 'Bearzerker Rampage',
        manaCost: 6,
        effect: 'bearzerk_rampage',
        effectValue: 5,
        targetType: 'all_enemies',
        statusApplied: [],
        description: card.heroAbility || card.docAbility || 'Deal 5 damage to all enemy heroes and player. Heal 2 HP for each enemy hero killed.',
      };
    }

    if (card.id === 'hero_beeatrice') {
      return {
        abilityName: 'Stinging Barbs',
        manaCost: 4,
        effect: 'stinging_barbs',
        effectValue: 3,
        targetType: 'enemy_any',
        statusApplied: [],
        description: card.heroAbility || card.docAbility || 'Deal 3 damage to an enemy hero or player, or 6 if that target is debuffed.',
      };
    }

    if (card.id === 'hero_breast_knuckle') {
      return {
        abilityName: 'Bust Thrust',
        manaCost: 4,
        effect: 'duel',
        effectValue: 7,
        targetType: 'single_enemy',
        statusApplied: ['status_impeded', 'status_crippled'],
        description: card.heroAbility || card.docAbility || 'Duel an enemy hero. If Breast Knuckle wins, Impede and Cripple the loser, then give Breast Knuckle and your player +4 armor.',
      };
    }

    if (card.id === 'hero_bro_chill') {
      return {
        abilityName: 'Chill Out!',
        manaCost: 5,
        effect: 'heal',
        effectValue: 3,
        targetType: 'all_allies',
        statusApplied: [],
        description: card.heroAbility || card.docAbility || 'Cleanse and heal 3 HP to all allied heroes and player.',
      };
    }

    if (card.id === 'hero_cath_eine') {
      return {
        abilityName: 'Caffeine Rush',
        manaCost: 3,
        effect: 'caffeine_rush',
        effectValue: 4,
        targetType: 'enemy_any',
        statusApplied: ['status_accelerated', 'status_sidestep'],
        description: card.heroAbility || card.docAbility || 'Cath-eine gains Accelerated and Sidestep, then deals 4 damage to an enemy hero or player.',
      };
    }

    if (card.id === 'hero_cut_lass') {
      return {
        abilityName: 'Booty Brawl',
        manaCost: 3,
        effect: 'duel',
        effectValue: 6,
        targetType: 'single_enemy',
        statusApplied: [],
        description: card.heroAbility || card.docAbility || 'Duel an enemy hero. On a win, deal 6 damage and loot up to 2 mana plus 1 action card.',
      };
    }

    if (card.id === 'hero_disc_jockey') {
      return {
        abilityName: 'Ambient Heal',
        manaCost: 3,
        effect: 'heal',
        effectValue: 6,
        targetType: 'all_allies',
        statusApplied: [],
        description: card.heroAbility || card.docAbility || 'Cleanse debuffed allies and heal all allied heroes and player for up to 6 HP.',
      };
    }

    if (card.id === 'hero_dread_locks') {
      return {
        abilityName: 'Deadlock',
        manaCost: 3,
        effect: 'duel',
        effectValue: 4,
        targetType: 'single_enemy',
        statusApplied: [],
        description: card.heroAbility || card.docAbility || 'Duel an enemy hero. On a win, deal 4 damage and lock the enemy shop and Draw Pile for 3 turns.',
      };
    }

    if (card.id === 'hero_goosebump') {
      return {
        abilityName: 'Avian Flu',
        manaCost: 4,
        effect: 'avian_flu',
        effectValue: 5,
        targetType: 'enemy_any',
        statusApplied: ['status_rabies', 'status_damage_boost'],
        description: card.heroAbility || card.docAbility || 'Gain +4 overhealth and Damage Boost, then deal 5 damage and inflict Rabies on an enemy hero or player.',
      };
    }

    if (card.id === 'hero_mob_barley') {
      return {
        abilityName: 'Tapped Out',
        manaCost: 6,
        effect: 'deal_damage_apply_status',
        effectValue: 4,
        targetType: 'all_enemies',
        statusApplied: ['status_impeded'],
        description: card.heroAbility || card.docAbility || 'Deal 4 damage and Impede all enemy heroes and player.',
      };
    }

    if (card.id === 'hero_equinox') {
      return {
        abilityName: 'Swift Squall',
        manaCost: 6,
        effect: 'swift_squall',
        effectValue: 0,
        targetType: 'all_allies',
        statusApplied: ['status_accelerated', 'status_augmented', 'status_sidestep'],
        description: card.heroAbility || card.docAbility || 'Give all allied heroes and player Accelerated, Augmented, and Sidestep for 3 turns.',
      };
    }

    if (card.id === 'hero_fryborg') {
      return {
        abilityName: 'Sci-Fry',
        manaCost: 5,
        effect: 'duel',
        effectValue: 5,
        targetType: 'single_enemy',
        statusApplied: ['status_burning'],
        description: card.heroAbility || card.docAbility || 'Duel an enemy hero. On a win, deal 5 damage and inflict Burning.',
      };
    }

    if (card.id === 'hero_ghoulia') {
      return {
        abilityName: 'Ex-Hex',
        manaCost: 4,
        effect: 'deal_damage_apply_status',
        effectValue: 4,
        targetType: 'enemy_any',
        statusApplied: ['status_haunted'],
        description: card.heroAbility || card.docAbility || 'Deal 4 damage and inflict Haunted on an enemy hero or player.',
      };
    }

    if (card.id === 'hero_giant_jess') {
      return {
        abilityName: 'Titaness Toss',
        manaCost: 5,
        effect: 'titaness_toss',
        effectValue: 7,
        targetType: 'enemy_any',
        statusApplied: ['status_augmented'],
        description: card.heroAbility || card.docAbility || 'Gain 4 overhealth and +2 base attack, then deal 7 damage to up to 2 enemies.',
      };
    }

    if (card.id === 'hero_gorgon_zola') {
      return {
        abilityName: 'Say Cheese!',
        manaCost: 5,
        effect: 'say_cheese',
        effectValue: 3,
        targetType: 'enemy_any',
        statusApplied: ['status_edible'],
        description: card.heroAbility || card.docAbility || 'Deal 3 damage and inflict Edible on an enemy hero or player. Has a 1/3 chance to spread.',
      };
    }

    if (card.id === 'hero_hip_hop_papa') {
      return {
        abilityName: 'Breakback Breakdance',
        manaCost: 4,
        effect: 'breakback_breakdance',
        effectValue: 5,
        targetType: 'self',
        statusApplied: ['status_impeded'],
        description: card.heroAbility || card.docAbility || '1/2 chance to deal 5 damage to all enemies and Impede enemy player/captain. On failure, Hip-Hop Papa and your player take 5 damage and are Impeded.',
      };
    }

    if (card.id === 'hero_in_specter') {
      return {
        abilityName: 'Sleuth Seance',
        manaCost: 3,
        effect: 'sleuth_seance',
        effectValue: 1,
        targetType: 'self',
        statusApplied: ['status_haunted'],
        description: card.heroAbility || card.docAbility || 'Draw a free action card. If the enemy has that action in hand, inflict Haunted on the enemy player/captain.',
      };
    }

    if (card.id === 'hero_juju_jitsu') {
      return {
        abilityName: 'Vooduel',
        manaCost: 5,
        effect: 'duel',
        effectValue: 6,
        targetType: 'single_enemy',
        statusApplied: ['status_jinxed'],
        description: card.heroAbility || card.docAbility || 'Duel an enemy hero. If Juju-Jitsu wins, the loser takes 6 damage and Jinxed.',
      };
    }

    if (card.id === 'hero_zoom_stick') {
      return {
        abilityName: 'Ala Ka-Zoom',
        manaCost: 3,
        effect: 'zoomstick',
        effectValue: 0,
        targetType: 'self',
        statusApplied: ['status_accelerated', 'status_impeded'],
        description: card.heroAbility || card.docAbility || 'Accelerate all allies and Impede all enemies for 2 turns.',
      };
    }

    if (card.id === 'hero_copy_cat') {
      return {
        abilityName: 'Meowrox',
        manaCost: 0,
        effect: 'meowrox',
        effectValue: 0,
        targetType: 'self',
        statusApplied: [],
        description: card.heroAbility || card.docAbility || 'Gain 4 overhealth and create a Copy if there is room. If the field is full, your first action card becomes free to cast.',
      };
    }

    return null;
  }

  function _fallbackFor(card) {
    const tpl = ROLE_TEMPLATES[card.role] ?? ROLE_TEMPLATES.Fighter;
    const ability = { ...tpl, statusApplied: [...(tpl.statusApplied ?? [])] };
    const flavorName = _flavorName(card);
    if (flavorName) ability.abilityName = flavorName;
    return ability;
  }

  function _sourceText(card) {
    if (card.heroAbility || card.docAbility) return card.heroAbility || card.docAbility;
    const key = (card.name ?? '').toLowerCase().trim();
    const flavor = (typeof CHARACTER_ABILITIES !== 'undefined') ? CHARACTER_ABILITIES[key] : null;
    return flavor?.ability1 ?? flavor?.passive ?? '';
  }

  function _flavorName(card) {
    const text = _sourceText(card);
    if (!text) return '';
    return _abilityNameFromText(text);
  }

  function _fromDocText(text, fallback) {
    if (/passive/i.test(text) && !/\(\s*\d+/.test(text)) return null;

    const abilityName = _abilityNameFromText(text) || fallback.abilityName;
    const manaCost = _cost(text, fallback.manaCost);
    const directText = _statusScanText(text);
    const damage = _damage(directText, 0);
    const statuses = _statuses(text);
    const status = statuses[0] ?? null;
    const lower = directText.toLowerCase();
    const heals = /heal|regen|restore|cleanse/.test(lower);
    const damages = /deal|damage|dmg|attack/.test(lower) && damage > 0;
    const duels = /duel|challenge/.test(lower);
    const allEnemies = /all enemies|all enemy|2 enemies|two enemies|each enemy|enemies who|enemy player\/heroes|enemy heroes\/player|all en-?\s*emies/.test(lower);
    const allAllies = /all allies|all ally|all heroes|player\/all heroes|player & all heroes|player and all heroes|whole team|your team|allie\(s\)|allies|teammates/.test(lower);
    const enemyAny = /hero\/player|player\/hero|player\/heroes|heroes\/player|enemy player|their hp|player icon|player\/all heroes/.test(lower);
    const selfBuff = /grant self|to you|drink|your next attack|amplify the next attack/.test(lower);
    const draws = /draw|steal|peek|reveal/.test(lower) && !damages && !status;
    const gainsMana = /gain\s*\+?\d*\s*mana|\+\d+\s*mana|mana bonus/.test(lower) && !damages;

    const ability = {
      abilityName,
      manaCost,
      effect: fallback.effect,
      effectValue: damage,
      targetType: fallback.targetType,
      statusApplied: statuses,
      description: text,
    };

    if (duels && damages) {
      ability.effect = 'duel';
      ability.targetType = 'single_enemy';
      return ability;
    }

    if (damages) {
      ability.effect = status ? 'deal_damage_apply_status' : 'deal_damage';
      ability.targetType = allEnemies ? 'all_enemies' : 'enemy_any';
      return ability;
    }

    if (heals) {
      ability.effect = 'heal';
      ability.effectValue = damage || _healAmount(text, fallback.effectValue);
      ability.targetType = allAllies ? 'all_allies' : 'single_ally';
      return ability;
    }

    if (draws) {
      ability.effect = 'draw_cards';
      ability.effectValue = 1;
      ability.targetType = 'self';
      return ability;
    }

    if (gainsMana) {
      ability.effect = 'gain_mana';
      ability.effectValue = _manaAmount(text, 3);
      ability.targetType = 'self';
      return ability;
    }

    if (status) {
      ability.effect = 'apply_status';
      ability.effectValue = 0;
      ability.targetType = selfBuff ? 'self' : (allAllies ? 'all_allies' : (allEnemies ? 'all_enemies' : 'enemy_any'));
      return ability;
    }

    return { ...fallback, abilityName, manaCost, description: text };
  }

  function _cost(text, fallback) {
    const m = text.match(/\(\s*(\d+)\s*(?:mana)?\s*\)/i);
    return m ? Number(m[1]) : fallback;
  }

  function _damage(text, fallback = 0) {
    const normalized = text.replace(/\s+/g, ' ');
    const direct = normalized.match(/(?:deal|dealing|deals)\s*(\d+)/i);
    if (direct) return Number(direct[1]);
    const generic = normalized.match(/(\d+)\s*(?:dmg|damage)/i);
    if (generic) return Number(generic[1]);
    return fallback ?? 0;
  }

  function _healAmount(text, fallback = 2) {
    const normalized = text.replace(/\s+/g, ' ');
    const m = normalized.match(/heal\s*(?:for\s*)?(\d+)|heal[^.]*?\bfor\s*(\d+)|healing\s*(?:for\s*)?(\d+)|regen\s*(\d+)|restore\s*(\d+)/i);
    return Number(m?.[1] ?? m?.[2] ?? m?.[3] ?? m?.[4] ?? m?.[5] ?? fallback);
  }

  function _manaAmount(text, fallback = 3) {
    const m = text.match(/gain\s*\+?(\d+)\s*mana|\+(\d+)\s*mana/i);
    return Number(m?.[1] ?? m?.[2] ?? fallback);
  }

  function _abilityNameFromText(text) {
    const lead = String(text || '')
      .replace(/^\s*Ability\s*:\s*/i, '')
      .replace(/^\s*Ability\s+/i, '')
      .replace(/^\s*Hero Passive\s*:\s*/i, '');
    return lead.split(/\(/)[0].replace(/:$/, '').replace(/\s+/g, ' ').trim();
  }

  function _statuses(text) {
    const direct = _statusScanText(text);
    const ids = [];
    for (const [re, id] of STATUS_PATTERNS) {
      if (re.test(direct) && !ids.includes(id)) ids.push(id);
    }
    return ids;
  }

  function _statusScanText(text) {
    return String(text || '').split(/\b[A-Z][A-Za-z-]+\s*\((?:hero passive|buff\/debuff|buff|debuff|debuffed|status|sustain|dodge event|duel event|theft|denial|spawn|bomb|denominator|deflection|bondage)\)\s*:/i)[0];
  }

  return { getFor, ROLE_TEMPLATES };
})();
