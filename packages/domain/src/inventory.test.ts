import { describe, it, expect } from 'vitest';
import { addItems, removeItem, countItem, inventorySchema, type Stack } from './inventory';
describe('20-slot inventory', () => {
  it('merges to 99 and spills into next slot', () => {
    const original: Stack[] = [{ itemId: 'potion', quantity: 98 }];
    const added = addItems(original, [{ itemId: 'potion', quantity: 3 }]);
    expect(added).toEqual([{ itemId: 'potion', quantity: 99 }, { itemId: 'potion', quantity: 2 }]);
    expect(original[0]?.quantity).toBe(98);
  });
  it('rejects full bag atomically while allowing a partial stack', () => {
    const bag: Stack[] = Array.from({ length: 19 }, () => ({ itemId: 'sword', quantity: 1 }));
    bag.push({ itemId: 'potion', quantity: 98 });
    expect(addItems(bag, [{ itemId: 'skin', quantity: 1 }])).toBeNull();
    expect(addItems(bag, [{ itemId: 'potion', quantity: 2 }])).toBeNull();
    expect(addItems(bag, [{ itemId: 'potion', quantity: 1 }])?.at(-1)?.quantity).toBe(99);
    expect(bag.at(-1)?.quantity).toBe(98);
  });
  it('removes across stacks, never producing a negative balance', () => {
    const bag: Stack[] = [{ itemId: 'potion', quantity: 1 }, { itemId: 'potion', quantity: 2 }];
    expect(removeItem(bag, 'potion', 2)).toEqual([{ itemId: 'potion', quantity: 1 }]);
    expect(removeItem(bag, 'potion', 4)).toBeNull();
    expect(countItem(bag, 'potion')).toBe(3);
  });
  it('rejects invalid/negative quantities, oversized bags and equipment stacks', () => {
    expect(() => addItems([], [{ itemId: 'potion', quantity: -1 }])).toThrow();
    expect(() => removeItem([], 'potion', 0)).toThrow();
    expect(inventorySchema.safeParse([{ itemId: 'sword', quantity: 2 }]).success).toBe(false);
    expect(inventorySchema.safeParse(Array.from({ length: 21 }, () => ({ itemId: 'sword', quantity: 1 }))).success).toBe(false);
  });
});
