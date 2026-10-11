import { z } from 'zod';
import { items, inventoryRules,depotRules, type ItemId } from '@eldoria/content';
const itemId = z.enum(['sword','bow','wand','tunic', 'potion', 'skin', 'chitin']);
export const stackSchema = z.object({ itemId, quantity: z.number().int().min(1).max(99) }).strict();
export type Stack = z.infer<typeof stackSchema>;
const listSchema = (slots:number)=>z.array(stackSchema).max(slots).refine(stacks => stacks.every(s => s.quantity <= items[s.itemId].stack), 'Przekroczony limit stosu');
export const inventorySchema=listSchema(inventoryRules.slots);
export const stashSchema=listSchema(depotRules.slots);
export function addItems(inventory: Stack[], additions: Stack[],capacity:number=inventoryRules.slots): Stack[] | null {
  const bag = structuredClone(listSchema(capacity).parse(inventory));
  for (const entry of z.array(stackSchema).parse(additions)) {
    let left = entry.quantity;
    const limit = items[entry.itemId].stack;
    for (const stack of bag) if (stack.itemId === entry.itemId) {
      const quantity = Math.min(limit - stack.quantity, left);
      stack.quantity += quantity; left -= quantity;
    }
    while (left > 0) {
      if (bag.length >= capacity) return null;
      const quantity = Math.min(left, limit); bag.push({ itemId: entry.itemId, quantity }); left -= quantity;
    }
  }
  return bag;
}
export function countItem(inventory: Stack[], id: ItemId): number { return inventory.filter(s => s.itemId === id).reduce((sum, s) => sum + s.quantity, 0); }
export function removeItem(inventory: Stack[], id: ItemId, quantity: number,capacity:number=inventoryRules.slots): Stack[] | null {
  z.number().int().positive().parse(quantity); itemId.parse(id); listSchema(capacity).parse(inventory);
  if (countItem(inventory, id) < quantity) return null;
  const bag = structuredClone(inventory);
  let remaining = quantity;
  for (const stack of bag) if (stack.itemId === id) {
    const removed = Math.min(stack.quantity, remaining); stack.quantity -= removed; remaining -= removed;
  }
  return bag.filter(stack => stack.quantity > 0);
}
