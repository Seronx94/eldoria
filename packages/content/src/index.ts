export const rules = {
  tileSize: 32, stepMs: 200, tickMs: 50,
  maxHp: 100, maxMana: 50, playerDefense: 3,
  attackDamage: 12, attackMs: 800,
  spellDamage: 18, spellMs: 1500, spellCost: 8, spellRange: 4,
  potionHeal: 40, potionMs: 3000, monsterAttackMs: 1200,
  respawnMs: 20000, manaRegenMs: 2000,
} as const;
export const monsters = {
  rat: { name: 'Szczur', hp: 30, damage: 4, defense: 0, exp: 10, gold: 1, aggressive: false },
  beetle: { name: 'Żuk', hp: 45, damage: 6, defense: 1, exp: 15, gold: 2, aggressive: false },
  wolf: { name: 'Wilk', hp: 70, damage: 10, defense: 2, exp: 25, gold: 3, aggressive: true },
} as const;
export type MonsterKind = keyof typeof monsters;
export { importMap, validateMaps, type WorldMap, type RawMap } from './maps';

export { items, inventoryRules, type ItemId } from './items';
