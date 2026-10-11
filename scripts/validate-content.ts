import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { importMap, validateMaps, landmarks, landmarksOnMap,depotsOnMap } from '@eldoria/content';
const source = resolve('assets/source');
const output = resolve('apps/client/public/assets');
for(const kind of ['rat','beetle','wolf'])for(const directory of [source,output]){
  const png=readFileSync(resolve(directory,'styles/colorful',`${kind}-walk.png`));
  if(png.readUInt32BE(16)!==288||png.readUInt32BE(20)!==32)throw new Error(`Brak dziewięciu klatek kierunkowych potwora: ${kind}`);
}
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
  for(const map of maps)for(const depot of depotsOnMap(map.id)){
    const stand=depot.stand;
    if(map.collision[depot.y*map.width+depot.x]!==1||map.collision[stand.y*map.width+stand.x]!==0||!map.buildings.some(b=>b.purpose==='inn'&&depot.x>b.x&&depot.x<b.x+b.width-1&&depot.y>b.y&&depot.y<b.y+b.height-1))throw new Error(`Nieprawidłowe stanowisko depo: ${map.id}/${depot.id}`);
    const queue=[map.spawns.entry!],seen=new Set<string>();let reached=false;
    for(let i=0;i<queue.length;i++){const p=queue[i]!,key=`${p.x},${p.y}`;if(seen.has(key)||p.x<0||p.y<0||p.x>=map.width||p.y>=map.height||map.collision[p.y*map.width+p.x]!==0||map.npcs.some(n=>n.x===p.x&&n.y===p.y))continue;seen.add(key);if(p.x===stand.x&&p.y===stand.y){reached=true;break;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:p.x+dx!,y:p.y+dy!});}
    if(!reached)throw new Error(`Niedostępne stanowisko depo: ${map.id}/${depot.id}`);
  }
  validateMaps(maps, new Set(readdirSync(directory)));
  for(const map of maps.filter(m=>['eldoria','catacombs','shop-upper','nivora'].includes(m.id))){
    const queue=[map.spawns.entry!],seen=new Set<string>();
    for(let i=0;i<queue.length;i++){
      const p=queue[i]!,key=`${p.x},${p.y}`;
      if(seen.has(key)||p.x<0||p.y<0||p.x>=map.width||p.y>=map.height||map.collision[p.y*map.width+p.x]!==0||map.npcs.some(n=>n.x===p.x&&n.y===p.y))continue;
      seen.add(key);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:p.x+dx!,y:p.y+dy!});
    }
    for(const portal of map.portals)if(!seen.has(`${portal.x},${portal.y}`))throw new Error(`${map.id}: niedostępne przejście ${portal.id}`);
  }

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
