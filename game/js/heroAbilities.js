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
      targetType: 'single_enemy', statusApplied: [],
      description: 'Deal 3 damage to an enemy character.',
    },
    Brute: {
      abilityName: 'Smash', manaCost: 2, effect: 'deal_damage', effectValue: 4,
      targetType: 'single_enemy', statusApplied: [],
      description: 'Deal 4 damage to an enemy character.',
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
      targetType: 'single_enemy', statusApplied: ['status_crippled'],
      description: 'Cripple an enemy so it cannot attack next turn.',
    },
    Trickster: {
      abilityName: 'Sabotage', manaCost: 1, effect: 'apply_status', effectValue: 0,
      targetType: 'single_enemy', statusApplied: ['status_poisoned'],
      description: 'Poison an enemy for 3 turns.',
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
    if (card.id === 'hero_cheatah') {
      return {
        abilityName: 'Cheetah Code',
        manaCost: 4,
        effect: 'cheatah_reroll',
        effectValue: 0,
        targetType: 'self',
        statusApplied: [],
        description: 'Roll the event die and gain that much mana, bypassing the mana cap.',
      };
    }

    if (card.id === 'hero_aster_roid') {
      return {
        abilityName: 'Roid Rage',
        manaCost: 4,
        effect: 'apply_status',
        effectValue: 0,
        targetType: 'self',
        statusApplied: ['status_stimulated', 'status_anemic', 'status_crippled'],
        description: card.docAbility || 'Stim Aster Roid for 3 turns.',
      };
    }

    if (card.id === 'hero_dread_locks') {
      return {
        abilityName: 'Locked Out',
        manaCost: 3,
        effect: 'shop_lock',
        effectValue: 0,
        targetType: 'enemy_player',
        statusApplied: ['status_locked_out'],
        description: 'Lock the enemy shop for 2 turns.',
      };
    }

    if (card.id === 'hero_goosebump') {
      return {
        abilityName: 'Avian Flu',
        manaCost: 3,
        effect: 'deal_damage_apply_status',
        effectValue: 4,
        targetType: 'enemy_any',
        statusApplied: ['status_rabies'],
        description: card.docAbility || 'Deal 4 damage and inflict Rabies on an enemy hero or player.',
      };
    }

    if (card.id === 'hero_mob_barley') {
      return {
        abilityName: 'Tapped Out',
        manaCost: 6,
        effect: 'deal_damage_apply_status',
        effectValue: 3,
        targetType: 'all_enemies',
        statusApplied: ['status_impeded'],
        description: 'Deal 3 damage and Impede all enemy heroes.',
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
        description: card.docAbility || 'Accelerate all allies and Impede all enemies for 2 turns.',
      };
    }

    if (card.id === 'hero_copy_cat') {
      return {
        abilityName: 'Meowrox',
        manaCost: 1,
        effect: 'copy_enemy_ability',
        effectValue: 0,
        targetType: 'single_enemy',
        statusApplied: [],
        description: card.docAbility || 'Copy an enemy character ability and turn it back on them.',
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
    if (card.docAbility) return card.docAbility;
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
      ability.targetType = allEnemies ? 'all_enemies' : (enemyAny ? 'enemy_any' : 'single_enemy');
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
      ability.targetType = selfBuff ? 'self' : (allAllies ? 'all_allies' : (allEnemies ? 'all_enemies' : (enemyAny ? 'enemy_any' : 'single_enemy')));
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
