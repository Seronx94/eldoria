import { z } from 'zod';
export const directionSchema = z.enum(['down', 'left', 'right', 'up']);
export type Direction = z.infer<typeof directionSchema>;
export const professionSchema=z.enum(['knight','archer','mage']);
export type Profession=z.infer<typeof professionSchema>;
export const weaponSchema=z.enum(['sword','bow','wand']);
export type Weapon=z.infer<typeof weaponSchema>;
export const spellSchema=z.enum(['blade-wave','spin','guard','power-shot','volley','mend','spark','fireball','frost']);
export type SpellId=z.infer<typeof spellSchema>;
export const actionSchema=z.enum(['attack','potion',...spellSchema.options]);
export type ActionId=z.infer<typeof actionSchema>;
const outfitColor=z.string().regex(/^#[0-9a-f]{6}$/i).toLowerCase().nullable();
export const appearanceSchema=z.object({hair:outfitColor,body:outfitColor,legs:outfitColor,feet:outfitColor}).strict();
export type Appearance=z.infer<typeof appearanceSchema>;
export function defaultAppearance():Appearance {return {hair:null,body:null,legs:null,feet:null};}
export const itemIdSchema=z.enum(['sword','bow','wand','tunic','potion','skin','chitin']);
export const lootSettingsSchema=z.object({enabled:z.boolean(),gold:z.boolean(),itemIds:z.array(itemIdSchema).max(7).refine(ids=>new Set(ids).size===ids.length)}).strict();
export type LootSettings=z.infer<typeof lootSettingsSchema>;
export function defaultLootSettings():LootSettings {return {enabled:true,gold:true,itemIds:[...itemIdSchema.options]};}
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Move'), direction: directionSchema }).strict(),
  z.object({ type: z.literal('Select'), targetId: z.string().min(1).max(80) }).strict(),
  z.object({ type: z.literal('Attack') }).strict(),
  z.object({type:z.literal('ClearTarget')}).strict(),
  z.object({type:z.literal('SetLootSettings'),settings:lootSettingsSchema}).strict(),
  z.object({type:z.literal('OpenDepot')}).strict(),
  z.object({type:z.literal('CloseDepot')}).strict(),
  z.object({type:z.literal('StashTransfer'),direction:z.enum(['deposit','withdraw']),itemId:itemIdSchema,quantity:z.number().int().min(1).max(99)}).strict(),
  z.object({ type: z.literal('Cast'),spellId:spellSchema.optional() }).strict(),
  z.object({type:z.literal('SetAppearance'),appearance:appearanceSchema}).strict(),
  z.object({ type:z.literal('SetActionSlot'),slot:z.number().int().min(0).max(3),actionId:actionSchema }).strict(),
  z.object({ type: z.literal('UseItem') }).strict(),
  z.object({ type: z.literal('Interact'), npcId: z.enum(['mira', 'oren', 'borin']).optional() }).strict(),
  z.object({ type: z.literal('CloseDialog') }).strict(),
  z.object({ type: z.literal('Heal') }).strict(),
  z.object({ type: z.literal('AcceptQuest'), questId: z.literal('exploration').optional() }).strict(),
  z.object({ type: z.literal('ClaimReward'), questId: z.literal('exploration').optional() }).strict(),
  z.object({ type: z.literal('Buy'), quantity: z.number().int().min(1).max(99) }).strict(),
  z.object({ type: z.literal('Sell'), itemId: z.enum(['skin', 'chitin']), quantity: z.number().int().min(1).max(99) }).strict(),
  z.object({ type: z.literal('Loot'), lootId: z.string().min(1).max(100).optional() }).strict(),
  z.object({ type: z.literal('Equip'), itemId: z.enum(['sword','bow','wand','tunic']) }).strict(),
  z.object({ type: z.literal('Unequip'), slot: z.enum(['weapon', 'armor']) }).strict(),
]);
export type Command = z.infer<typeof commandSchema>;
export const nameSchema = z.string().trim().min(3, 'Imię: 3–16 znaków').max(16, 'Imię: 3–16 znaków');
export const PROTOCOL_VERSION = 1;
