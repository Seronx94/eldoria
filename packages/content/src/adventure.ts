export const npcs = {
  mira: { name: 'Mira', role: 'Strażniczka bramy', text: 'Za bramą rośnie niepokój. Pokonaj pięć leśnych stworzeń i wróć do mnie. Liczą się zwycięstwa po przyjęciu zadania.' },
  oren: { name: 'Oren', role: 'Uzdrowiciel', text: 'Odpocznij, Wędrowcze. Przywrócę Twoje zdrowie i manę bez opłaty.' },
  borin: { name: 'Borin', role: 'Kupiec przy kuźni', text: 'Mikstura kosztuje 5 złota. Skóry wilka i chitynę kupuję po 2 złota za sztukę.' },
} as const;
export type NpcId = keyof typeof npcs;
export const questRules = { title: 'Niepokój za bramą', kills: 5, exp: 50, gold: 20, potions: 2 } as const;
export const shopRules = { potionPrice: 5, materialPrice: 2 } as const;
export const sampleSpawns = [
  { id: 'rat-1', kind: 'rat', x: 14, y: 9 },
  { id: 'beetle-1', kind: 'beetle', x: 18, y: 11 },
  { id: 'wolf-1', kind: 'wolf', x: 22, y: 16 },
] as const;
