// ─── Hero Abilities — playable ability for every hero ────────────────────────
// Every deployed character gets ONE activated ability, derived from its role.
// Flavor names are pulled from CHARACTER_ABILITIES so each hero keeps its
// personality, while the mechanics stay simple and consistent for party play.
//
// Ability shape (consumed by AbilityDispatcher):
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
      description: 'Deal 2 damage to any enemy — character or player.',
    },
    Tank: {
      abilityName: 'Taunt', manaCost: 1, effect: 'apply_status', effectValue: 0,
      targetType: 'self', statusApplied: ['status_taunt'],
      description: 'Enemies must attack this character for 2 turns.',
    },
    Control: {
      abilityName: 'Lockdown', manaCost: 2, effect: 'apply_status', effectValue: 0,
      targetType: 'single_enemy', statusApplied: ['status_crippled'],
      description: 'Cripple an enemy — it cannot attack next turn.',
    },
    Trickster: {
      abilityName: 'Sabotage', manaCost: 1, effect: 'apply_status', effectValue: 0,
      targetType: 'single_enemy', statusApplied: ['status_poisoned'],
      description: 'Poison an enemy — 1 damage per turn for 3 turns.',
    },
    Agile: {
      abilityName: 'Adrenaline', manaCost: 1, effect: 'apply_status', effectValue: 0,
      targetType: 'self', statusApplied: ['status_augmented'],
      description: 'Pump up — +2 attack for 2 turns.',
    },
    Duelist: {
      abilityName: 'Challenge', manaCost: 2, effect: 'duel', effectValue: 4,
      targetType: 'single_enemy', statusApplied: [],
      description: 'Duel an enemy character — the loser takes 4 damage.',
    },
    Leader: {
      abilityName: 'Rally', manaCost: 2, effect: 'heal', effectValue: 2,
      targetType: 'all_allies', statusApplied: [],
      description: 'Heal ALL friendly characters 2 HP.',
    },
  };

  /** Build the ability list for a hero card (role template + flavor name). */
  function getFor(card) {
    const tpl = ROLE_TEMPLATES[card.role] ?? ROLE_TEMPLATES.Fighter;
    const ability = { ...tpl, statusApplied: [...(tpl.statusApplied ?? [])] };

    // Use the hero's flavor ability name from CHARACTER_ABILITIES when available
    const key = (card.name ?? '').toLowerCase().trim();
    const flavor = (typeof CHARACTER_ABILITIES !== 'undefined') ? CHARACTER_ABILITIES[key] : null;
    if (flavor?.ability1) {
      const flavorName = flavor.ability1.split(/—|â€”|\(/)[0].replace(/:$/, '').trim();
      if (flavorName) ability.abilityName = flavorName;
    }
    return [ability];
  }

  return { getFor, ROLE_TEMPLATES };
})();
