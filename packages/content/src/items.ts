export const items = {
  sword: { name: 'Miecz treningowy', stack: 1, slot: 'weapon' },
  bow:{name:'Łuk treningowy',stack:1,slot:'weapon'},
  wand:{name:'Różdżka treningowa',stack:1,slot:'weapon'},
  tunic: { name: 'Tunika', stack: 1, slot: 'armor' },
  potion: { name: 'Mikstura HP', stack: 99, slot: null },
  skin: { name: 'Skóra wilka', stack: 99, slot: null },
  chitin: { name: 'Chityna', stack: 99, slot: null },
} as const;
export type ItemId = keyof typeof items;
export const inventoryRules = { slots: 20, maxStack: 99 } as const;
