import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { importMap, validateMaps } from '@eldoria/content';
const source = resolve('assets/source');
const output = resolve('apps/client/public/assets');
const names = readdirSync(source).filter(n => n.endsWith('.tmj'));
if (!names.length) throw new Error('Brak map Tiled');
for (const directory of [source, output]) {
  const maps = names.map(name => {
    const data = readFileSync(resolve(directory, directory === source ? name : name.replace('.tmj', '.json')), 'utf8');
    return importMap(JSON.parse(data));
  });
  validateMaps(maps, new Set(readdirSync(directory)));
}
for (const name of readdirSync(source, { recursive: true }).filter((n): n is string => typeof n === 'string' && n.endsWith('.png'))) {
  if (!readFileSync(resolve(source, name)).equals(readFileSync(resolve(output, name)))) throw new Error(`Nieaktualny eksport PNG: ${name}`);
}
for (const name of names) {
  if (readFileSync(resolve(source, name), 'utf8') !== readFileSync(resolve(output, name.replace('.tmj', '.json')), 'utf8')) throw new Error(`Nieaktualny eksport mapy: ${name}`);
}
console.log(`OK: ${names.length} mapy źródłowe i eksporty, PNG, spawny, portale, transformacje.`);
