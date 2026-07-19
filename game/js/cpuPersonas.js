const CpuPersonas = (() => {
  const personas = {
    little_timmy: {
      id: 'little_timmy',
      name: 'Little Timmy',
      difficulty: 'Easy',
      description: 'Low strategy, missed tempo plays, and inconsistent targeting.',
      mistakeRate: 0.48,
      shopChance: 0.38,
      deployChance: 0.56,
      actionChance: 0.34,
      abilityChance: 0.32,
      abilityBudget: 1,
      playerAttackChance: 0.44,
      maxDeploys: 1,
      actionBudget: 1,
      faceBias: 0.42,
      preferredHeroes: ['Cheatah', 'Slendeer', 'Stall-Wart', 'Aster Roid'],
      preferredActions: ['Sidestep', 'Anemic Potion', 'Gas Potion'],
      roleWeights: { Speed: 4, Durability: 2, Strength: 2 },
    },
    average_joe: {
      id: 'average_joe',
      name: 'Average Joe',
      difficulty: 'Medium-Easy',
      description: 'Balanced play that deploys, buys, cleanses, and attacks with decent target priority.',
      mistakeRate: 0.16,
      shopChance: 0.82,
      deployChance: 0.88,
      actionChance: 0.68,
      abilityChance: 0.72,
      abilityBudget: 1,
      playerAttackChance: 0.82,
      maxDeploys: 2,
      actionBudget: 2,
      faceBias: 0.34,
      preferredHeroes: ['De-Terminator', 'Sir Ringe', 'Giant-Tessa', 'Chicki Barstooli', 'Stall-Wart'],
      preferredActions: ['Cleanse', 'Vitalize', 'Impede', 'Anemic Potion', 'Sidestep'],
      roleWeights: { Durability: 5, Strength: 4, Balanced: 3, IQ: 2 },
    },
    quick_rick: {
      id: 'quick_rick',
      name: 'Quick Rick',
      difficulty: 'Medium',
      description: 'Speed pressure, Accelerate turns, and fast board development.',
      mistakeRate: 0.10,
      shopChance: 0.88,
      deployChance: 0.94,
      actionChance: 0.78,
      abilityChance: 0.84,
      abilityBudget: 2,
      playerAttackChance: 0.9,
      maxDeploys: 3,
      actionBudget: 3,
      faceBias: 0.68,
      preferredHeroes: ['Cheatah', 'Slendeer', 'Zoomstick', 'Yeast Priest', 'Tyrantosaurus'],
      preferredActions: ['Accelerate', 'Sidestep', 'Impede', 'Augment', 'Fondue'],
      roleWeights: { Speed: 7, Mana: 4, Strength: 3, Agility: 2 },
    },
    clean_gene: {
      id: 'clean_gene',
      name: 'Clean Gene',
      difficulty: 'Medium',
      description: 'Sustain plan built around Cleanse, healing, Sidestep, and defensive captains.',
      mistakeRate: 0.11,
      shopChance: 0.9,
      deployChance: 0.86,
      actionChance: 0.82,
      abilityChance: 0.8,
      abilityBudget: 2,
      playerAttackChance: 0.7,
      maxDeploys: 2,
      actionBudget: 3,
      faceBias: 0.22,
      preferredHeroes: ['Iron Maid', 'Aplombinable', 'Equinox', 'De-Terminator', 'Yeast Priest', 'Stall-Wart'],
      preferredActions: ['Cleanse', 'Vitalize', 'Sidestep', 'Fondue', 'Cryofreeze'],
      roleWeights: { Durability: 7, Legendary: 4, Mana: 4, Balanced: 3, Agility: 2 },
    },
  };

  function get(id) {
    return personas[id] ?? personas.little_timmy;
  }

  function all() {
    return Object.values(personas);
  }

  return { get, all };
})();
