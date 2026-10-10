import { z } from 'zod';
export const directionSchema = z.enum(['down', 'left', 'right', 'up']);
export type Direction = z.infer<typeof directionSchema>;
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Move'), direction: directionSchema }).strict(),
  z.object({ type: z.literal('Select'), targetId: z.string().min(1).max(80) }).strict(),
  z.object({ type: z.literal('Attack') }).strict(),
  z.object({ type: z.literal('Cast') }).strict(),
  z.object({ type: z.literal('UseItem') }).strict(),
  z.object({ type: z.literal('Interact'), npcId: z.enum(['mira', 'oren', 'borin']).optional() }).strict(),
  z.object({ type: z.literal('CloseDialog') }).strict(),
  z.object({ type: z.literal('Heal') }).strict(),
  z.object({ type: z.literal('AcceptQuest') }).strict(),
  z.object({ type: z.literal('ClaimReward') }).strict(),
  z.object({ type: z.literal('Buy'), quantity: z.number().int().min(1).max(99) }).strict(),
  z.object({ type: z.literal('Sell'), itemId: z.enum(['skin', 'chitin']), quantity: z.number().int().min(1).max(99) }).strict(),
  z.object({ type: z.literal('Loot'), lootId: z.string().min(1).max(100).optional() }).strict(),
  z.object({ type: z.literal('Equip'), itemId: z.enum(['sword', 'tunic']) }).strict(),
  z.object({ type: z.literal('Unequip'), slot: z.enum(['weapon', 'armor']) }).strict(),
]);
export type Command = z.infer<typeof commandSchema>;
export const nameSchema = z.string().trim().min(3, 'Imię: 3–16 znaków').max(16, 'Imię: 3–16 znaków');
export const PROTOCOL_VERSION = 1;
