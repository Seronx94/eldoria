import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { importMap, validateMaps, landmarks, landmarksOnMap } from '@eldoria/content';
const source = resolve('assets/source');
const output = resolve('apps/client/public/assets');
const town = JSON.parse(readFileSync(resolve('assets/design/town-atlas.json'), 'utf8')) as { assets: { name: string; width: number; height: number }[] };
for (const asset of town.assets) {
  for (const directory of [source, output]) {
    const png = readFileSync(resolve(directory, 'town', `${asset.name}.png`));
    if (png.readUInt32BE(16) !== asset.width || png.readUInt32BE(20) !== asset.height) throw new Error(`Nieprawidłowy rozmiar PNG miasta: ${asset.name}`);
  }
}
const names = readdirSync(source).filter(n => n.endsWith('.tmj'));
if (!names.length) throw new Error('Brak map Tiled');
for (const directory of [source, output]) {
  const maps = names.map(name => {
    const data = readFileSync(resolve(directory, directory === source ? name : name.replace('.tmj', '.json')), 'utf8');
    return importMap(JSON.parse(data));
  });
  validateMaps(maps, new Set(readdirSync(directory)));
  if (new Set(landmarks.map(l=>l.id)).size !== landmarks.length) throw new Error('Powtórzone ID odkrycia');
  for (const l of landmarks) {
    const matching=maps.filter(m=>landmarksOnMap(m.id,l.mapId));
    if(!matching.length)throw new Error(`Brak mapy odkrycia: ${l.id}`);
    for(const map of matching) {
      if (l.x < 0 || l.y < 0 || l.x >= map.width || l.y >= map.height || map.collision[l.y*map.width+l.x] !== 0 || [...map.npcs,...map.portals].some(p=>Math.abs(p.x-l.x)+Math.abs(p.y-l.y)<=2)) throw new Error(`Nieprawidłowe miejsce odkrycia: ${l.id}`);
    }
  }
}
for (const name of readdirSync(source, { recursive: true }).filter((n): n is string => typeof n === 'string' && n.endsWith('.png'))) {
  if (!readFileSync(resolve(source, name)).equals(readFileSync(resolve(output, name)))) throw new Error(`Nieaktualny eksport PNG: ${name}`);
}
for (const name of names) {
  if (readFileSync(resolve(source, name), 'utf8') !== readFileSync(resolve(output, name.replace('.tmj', '.json')), 'utf8')) throw new Error(`Nieaktualny eksport mapy: ${name}`);
}
console.log(`OK: ${names.length} mapy źródłowe i eksporty, PNG, spawny, portale, odkrycia, transformacje.`);
