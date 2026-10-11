import { z } from 'zod';
import { rules,professions,spells,professionRules,defaultActions,actionAllowed,emptySpellCooldowns } from '@eldoria/content';
import { directionSchema, nameSchema,appearanceSchema,defaultAppearance,lootSettingsSchema,defaultLootSettings,professionSchema,weaponSchema,actionSchema } from '@eldoria/protocol';
import { inventorySchema,stashSchema } from './inventory';
const integer = (max: number) => z.number().int().min(0).max(max);
const point = z.object({ x: integer(255), y: integer(255) }).strict();
const spellCooldownSchema=z.object({
  'blade-wave':integer(spells['blade-wave'].cooldown),spin:integer(spells.spin.cooldown),guard:integer(spells.guard.cooldown),
  'power-shot':integer(spells['power-shot'].cooldown),volley:integer(spells.volley.cooldown),mend:integer(spells.mend.cooldown),
  spark:integer(spells.spark.cooldown),fireball:integer(spells.fireball.cooldown),frost:integer(spells.frost.cooldown),
}).strict();
export const questSchema = z.object({ status: z.enum(['available', 'active', 'ready', 'claimed']), kills: integer(5) }).strict().refine(q => q.status === 'available' ? q.kills === 0 : q.status === 'active' ? q.kills < 5 : q.kills === 5, 'Nieprawidłowy postęp zadania');
export const explorationSchema = z.object({
  status: z.enum(['available', 'active', 'ready', 'claimed']),
  found: z.array(z.enum(['trail', 'camp', 'stone'])).max(3),
}).strict().refine(q => new Set(q.found).size === q.found.length && (q.status === 'available' ? q.found.length === 0 : q.status === 'active' ? q.found.length < 3 : q.found.length === 3), 'Nieprawidłowy postęp eksploracji');
export const saveSchema = z.object({
  version: z.literal(1), cityRevision: z.number().int().min(1).max(2).default(1), mode: z.literal('offline'), name: nameSchema,
  appearance:appearanceSchema.default(defaultAppearance),profession:professionSchema.default('knight'),actionSlots:z.tuple([actionSchema,actionSchema,actionSchema,actionSchema]).optional(),
  spellCooldowns:spellCooldownSchema.optional(),guardIn:integer(professionRules.guardMs).default(0),
  mapId: z.enum(['vareon', 'forest', 'eldoria']), player: point, direction: directionSchema,
  level: z.number().int().min(1).max(100), hp: z.number().int().min(1).max(1090), mana: integer(545),
  exp: integer(9999), gold: integer(10000000), kills: integer(10000000),
  quest: questSchema, exploration: explorationSchema.default({status:'available',found:[]}), inventory: inventorySchema,
  stash:stashSchema.default([]),lootSettings:lootSettingsSchema.default(defaultLootSettings),
  equipment: z.object({ weapon: weaponSchema.nullable(), armor: z.literal('tunic').nullable() }).strict(),
  cooldowns: z.object({ move: integer(rules.stepMs), attack: integer(rules.attackMs), spell: integer(rules.spellMs), potion: integer(rules.potionMs), mana: integer(rules.manaRegenMs) }).strict(),
  maps: z.array(z.object({ mapId: z.enum(['vareon', 'forest', 'eldoria']), creatures: z.array(z.object({
    id: z.string().min(1).max(80), kind: z.enum(['rat', 'beetle', 'wolf']), x: integer(255), y: integer(255), hp: integer(70),
    state: z.enum(['idle', 'chase', 'attack', 'return', 'dead']), attackIn: integer(rules.monsterAttackMs), moveIn: integer(rules.stepMs*2), respawnIn: integer(rules.respawnMs),
  }).strict()).max(12) }).strict()).min(1).max(2),
  loot: z.array(z.object({ id: z.string().min(1).max(100), mapId: z.enum(['vareon', 'forest', 'eldoria']), x: integer(255), y: integer(255), gold: integer(3), items: inventorySchema }).strict()).max(1000),
  eventId: integer(1000000000),
}).strict().superRefine((s, ctx) => {
  if (s.hp > rules.maxHp + (s.level-1)*10 || s.mana > rules.maxMana + (s.level-1)*5 || s.exp >= 100*s.level) ctx.addIssue({ code: 'custom', message: 'Nieprawidłowe statystyki poziomu' });
  if(s.equipment.weapon&&s.equipment.weapon!==professions[s.profession].weapon)ctx.addIssue({code:'custom',message:'Broń innej profesji'});
  if(s.actionSlots?.some(action=>!actionAllowed(s.profession,action)))ctx.addIssue({code:'custom',message:'Umiejętność innej profesji'});
  if(s.profession!=='knight'&&s.guardIn>0)ctx.addIssue({code:'custom',message:'Osłona innej profesji'});
  if(s.spellCooldowns)for(const id of Object.keys(spells) as (keyof typeof spells)[])if(spells[id].profession!==s.profession&&s.spellCooldowns[id]>0)ctx.addIssue({code:'custom',message:'Cooldown innej profesji'});
}).transform(s=>{
  const legacyCooldowns=emptySpellCooldowns();legacyCooldowns[professions[s.profession].spells[0]!]=s.cooldowns.spell;
  return {...s,actionSlots:s.actionSlots??defaultActions(s.profession),spellCooldowns:s.spellCooldowns??legacyCooldowns};
});
export type SaveData = z.infer<typeof saveSchema>;
