import { z } from 'zod';
import { rules } from '@eldoria/content';
import { directionSchema, nameSchema } from '@eldoria/protocol';
import { inventorySchema } from './inventory';
const integer = (max: number) => z.number().int().min(0).max(max);
const point = z.object({ x: integer(255), y: integer(255) }).strict();
export const questSchema = z.object({ status: z.enum(['available', 'active', 'ready', 'claimed']), kills: integer(5) }).strict().refine(q => q.status === 'available' ? q.kills === 0 : q.status === 'active' ? q.kills < 5 : q.kills === 5, 'Nieprawidłowy postęp zadania');
export const saveSchema = z.object({
  version: z.literal(1), mode: z.literal('offline'), name: nameSchema,
  mapId: z.enum(['vareon', 'forest']), player: point, direction: directionSchema,
  level: z.number().int().min(1).max(100), hp: z.number().int().min(1).max(1090), mana: integer(545),
  exp: integer(9999), gold: integer(10000000), kills: integer(10000000),
  quest: questSchema, inventory: inventorySchema,
  equipment: z.object({ weapon: z.literal('sword').nullable(), armor: z.literal('tunic').nullable() }).strict(),
  cooldowns: z.object({ move: integer(rules.stepMs), attack: integer(rules.attackMs), spell: integer(rules.spellMs), potion: integer(rules.potionMs), mana: integer(rules.manaRegenMs) }).strict(),
  maps: z.array(z.object({ mapId: z.enum(['vareon', 'forest']), creatures: z.array(z.object({
    id: z.string().min(1).max(80), kind: z.enum(['rat', 'beetle', 'wolf']), x: integer(255), y: integer(255), hp: integer(70),
    state: z.enum(['idle', 'chase', 'attack', 'return', 'dead']), attackIn: integer(rules.monsterAttackMs), moveIn: integer(rules.stepMs*2), respawnIn: integer(rules.respawnMs),
  }).strict()).max(12) }).strict()).min(1).max(2),
  loot: z.array(z.object({ id: z.string().min(1).max(100), mapId: z.enum(['vareon', 'forest']), x: integer(255), y: integer(255), gold: integer(3), items: inventorySchema }).strict()).max(1000),
  eventId: integer(1000000000),
}).strict().superRefine((s, ctx) => {
  if (s.hp > rules.maxHp + (s.level-1)*10 || s.mana > rules.maxMana + (s.level-1)*5 || s.exp >= 100*s.level) ctx.addIssue({ code: 'custom', message: 'Nieprawidłowe statystyki poziomu' });
});
export type SaveData = z.infer<typeof saveSchema>;
