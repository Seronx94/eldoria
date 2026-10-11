import { z } from 'zod';
const property = z.object({ name: z.string(), value: z.string() });
const objectSchema = z.object({
  id: z.number().int().positive(), name: z.string(), x: z.number().int().nonnegative(), y: z.number().int().nonnegative(),
  width: z.number().int().nonnegative().optional(), height: z.number().int().nonnegative().optional(),
  properties: z.array(property).default([])
});
const layer = z.object({ name: z.string(), type: z.enum(['tilelayer', 'objectgroup']), data: z.array(z.number().int().nonnegative()).optional(), objects: z.array(objectSchema).optional() });
const schema = z.object({
  orientation: z.literal('orthogonal'), infinite: z.literal(false),
  width: z.number().int().min(3).max(256), height: z.number().int().min(3).max(256),
  tilewidth: z.literal(32), tileheight: z.literal(32),
  properties: z.array(property), layers: z.array(layer),
  tilesets: z.tuple([z.object({ firstgid: z.literal(1), tilecount: z.literal(4), columns: z.literal(4), image: z.string(), tilewidth: z.literal(32), tileheight: z.literal(32) })]).rest(z.object({firstgid:z.number().int(),name:z.enum(['town-ground','town-walls']),tilewidth:z.literal(32),tileheight:z.literal(32),tilecount:z.number().int(),columns:z.literal(0),tiles:z.array(z.object({id:z.number().int(),image:z.string(),imagewidth:z.literal(32),imageheight:z.literal(32)}))}))
});
export type RawMap = z.infer<typeof schema>;
export interface Point { x: number; y: number }
export const townPropKinds = ['counter','altar','bookcase','forge','bed','lamp','crates','stall','fountain'] as const;
export interface TownBuilding extends Point { id:string; label:string; purpose:'guard'|'temple'|'shop'|'inn'|'home'|'workshop'; width:number; height:number; doors:Point[] }
export interface TownProp extends Point {width:number;kind:typeof townPropKinds[number];buildingId?:string}
export interface WorldRegion extends Point { id:string; label:string; width:number; height:number; combatAllowed:boolean }
export function regionAt(map:WorldMap,p:Point):WorldRegion|undefined { return map.regions.find(r=>p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height); }
export function combatAllowedAt(map:WorldMap,p:Point):boolean { return map.combatAllowed && (regionAt(map,p)?.combatAllowed ?? true); }
export function landmarksOnMap(mapId:string,landmarkMapId:string):boolean {return mapId===landmarkMapId || mapId==='eldoria' && landmarkMapId==='forest';}
export const sceneryKinds=['shrub','flowers','pebbles','bollard','ship','crystal','bones','snow-pine'] as const;
export interface WorldMap {
  scenery: (Point & {kind:typeof sceneryKinds[number]})[];
  regions:WorldRegion[];
  layoutRevision:number; cityGround:number[]; cityWalls:number[]; buildings:TownBuilding[]; townProps:TownProp[];
  id: string; combatAllowed: boolean; width: number; height: number; ground: number[]; details: number[]; above: number[]; collision: number[];
  spawns: Record<string, Point>;
  portals: (Point & { id: string; targetMapId: string; targetSpawnId: string })[];
  decorations: (Point & { kind: 'tree' | 'house' })[];
  npcs: (Point & { id: 'mira' | 'oren' | 'borin' })[];
  monsterSpawns: (Point & { id: string; kind: 'rat' | 'beetle' | 'wolf' })[];
  image: string;
}
function properties(values: z.infer<typeof property>[], key: string): string {
  const matches = values.filter(p => p.name === key);
  if (matches.length !== 1 || !matches[0]?.value) throw new Error(`Brak lub powtórzone ID: ${key}`);
  return matches[0].value;
}
export function importMap(input: unknown): WorldMap {
  const raw = schema.parse(input);
  const id = properties(raw.properties, 'mapId');
  const getLayer = (name: string) => {
    const matches = raw.layers.filter(l => l.name === name);
    if (matches.length !== 1 || !matches[0]) throw new Error(`${id}: brak lub powtórzona warstwa ${name}`);
    return matches[0];
  };
  const tileLayer = (name: string) => {
    const l = getLayer(name);
    if (l.type !== 'tilelayer' || l.data?.length !== raw.width * raw.height) throw new Error(`${id}: zły rozmiar ${name}`);
    if (l.data.some(gid => gid > (name === 'Collision' ? 1 : 4))) throw new Error(`${id}: nieobsługiwany kafelek/transformacja ${name}`);
    return l.data;
  };
  const objects = (name: string) => {
    const l = getLayer(name);
    if (l.type !== 'objectgroup' || !l.objects) throw new Error(`${id}: brak obiektów ${name}`);
    return l.objects;
  };
  const point = (o: z.infer<typeof objectSchema>): Point => {
    if (o.x % 32 || o.y % 32 || o.x >= raw.width * 32 || o.y >= raw.height * 32) throw new Error(`${id}: obiekt poza siatką ${o.name}`);
    return { x: o.x / 32, y: o.y / 32 };
  };
  const spawns: Record<string, Point> = {};
  for (const o of objects('Spawns')) {
    if (!o.name || Object.hasOwn(spawns, o.name)) throw new Error(`${id}: nieprawidłowy spawn`);
    spawns[o.name] = point(o);
  }
  if (!Object.hasOwn(spawns, 'entry')) throw new Error(`${id}: brak spawnu entry`);
  const portals = objects('Portals').map(o => ({ ...point(o), id: o.name, targetMapId: properties(o.properties, 'targetMapId'), targetSpawnId: properties(o.properties, 'targetSpawnId') }));
  if (new Set(portals.map(p => p.id)).size !== portals.length || portals.some(p => !p.id)) throw new Error(`${id}: nieprawidłowe ID portali`);
  const npcs = objects('NPCs').map(o => ({ ...point(o), id: z.enum(['mira', 'oren', 'borin']).parse(properties(o.properties, 'npcId')) }));
  if (new Set(npcs.map(n => n.id)).size !== npcs.length) throw new Error(`${id}: powtórzony npcId`);
  const monsterSpawns = objects('Spawns').filter(o => o.properties.some(p => p.name === 'monsterId')).map(o => ({ ...point(o), id: o.name, kind: z.enum(['rat', 'beetle', 'wolf']).parse(properties(o.properties, 'monsterId')) }));
  if (monsterSpawns.length > 12) throw new Error(`${id}: limit 12 potworów`);
  const decorations = objects('Decorations').map(o => ({ ...point(o), kind: z.enum(['tree', 'house']).parse(o.name) }));
  const optionalObjects = (name:string) => {
    const layers=raw.layers.filter(l=>l.name===name);
    if(layers.length>1 || layers[0] && layers[0].type!=='objectgroup') throw new Error(`${id}: nieprawidłowa warstwa ${name}`);
    return layers[0]?.objects ?? [];
  };
  const cityLayer = (name:string,min:number,max:number) => {
    const matches=raw.layers.filter(l=>l.name===name);
    if(matches.length===0) return Array<number>(raw.width*raw.height).fill(0);
    const l=matches[0];
    if(matches.length!==1 || l?.type!=='tilelayer' || l.data?.length!==raw.width*raw.height || l.data.some(v=>v!==0&&(v<min||v>max))) throw new Error(`${id}: nieprawidłowe kafelki ${name}`);
    return l.data;
  };
  const scenery=optionalObjects('Scenery').map(o=>({...point(o),kind:z.enum(sceneryKinds).parse(o.name)}));
  const regions=optionalObjects('Regions').map(o=>{
    const p=point(o),width=(o.width??0)/32,height=(o.height??0)/32;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||p.x+width>raw.width||p.y+height>raw.height)throw new Error(`${id}: nieprawidłowy region`);
    return {...p,id:o.name,label:properties(o.properties,'label'),width,height,combatAllowed:z.enum(['true','false']).parse(properties(o.properties,'combatAllowed'))==='true'};
  });
  if(new Set(regions.map(r=>r.id)).size!==regions.length||regions.some(r=>!r.id||regions.some(other=>other!==r&&r.x<other.x+other.width&&r.x+r.width>other.x&&r.y<other.y+other.height&&r.y+r.height>other.y)))throw new Error(`${id}: powtórzone/nakładające się regiony`);
  const buildings=optionalObjects('Buildings').map(o=>{
    const p=point(o), w=(o.width??0)/32, h=(o.height??0)/32;
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<5||h<5||w>24||h>24||p.x+w>raw.width||p.y+h>raw.height) throw new Error(`${id}: nieprawidłowy budynek ${o.name}`);
    const doors=[{x:p.x+Math.floor(w/2),y:p.y+h-1}];
    if(o.properties.find(p=>p.name==='passage')?.value==='true') doors.push({x:p.x+Math.floor(w/2),y:p.y});
    return {...p,id:o.name,label:properties(o.properties,'label'),purpose:z.enum(['guard','temple','shop','inn','home','workshop']).parse(properties(o.properties,'purpose')),width:w,height:h,doors};
  });
  const townProps=optionalObjects('TownProps').map(o=>({...point(o),kind:z.enum(townPropKinds).parse(o.name),width:z.coerce.number().int().min(1).max(3).parse(o.properties.find(p=>p.name==='footprintWidth')?.value??1),buildingId:o.properties.find(p=>p.name==='buildingId')?.value}));
  const cityGround=cityLayer('CityGround',5,7),cityWalls=cityLayer('CityWalls',8,9);
  if(raw.tilesets.length>1) {
    const expected=[['town-ground',5,['paving','stone-floor','wood-floor']],['town-walls',8,['wall-h','wall-v']]] as const;
    if(raw.tilesets.length!==3) throw new Error(`${id}: nieprawidłowe tilesety miasta`);
    for(let i=0;i<expected.length;i++) {
      const [name,firstgid,images]=expected[i]!, ts=raw.tilesets[i+1];
      if(!ts||!('tiles' in ts)||ts.name!==name||ts.firstgid!==firstgid||ts.tilecount!==images.length||ts.tiles.length!==images.length||ts.tiles.some((t,index)=>t.id!==index||t.image!==`town/${images[index]}.png`)) throw new Error(`${id}: nieprawidłowe tilesety miasta`);
    }
  } else if(cityGround.some(Boolean)||cityWalls.some(Boolean)||buildings.length||townProps.length) throw new Error(`${id}: brak tilesetów miasta`);
  const layoutRevision=Number(z.enum(['1','2','3']).parse(raw.properties.find(p=>p.name==='layoutRevision')?.value??'1'));
  const image = raw.tilesets[0]!.image;
  if (image.startsWith('/') || image.includes('..') || image.includes(':') || !image.endsWith('.png')) throw new Error(`${id}: obraz musi być względnym PNG`);
  return { scenery,regions,layoutRevision,cityGround,cityWalls,buildings,townProps,id, combatAllowed: raw.properties.find(p => p.name === 'combatAllowed')?.value !== 'false', width: raw.width, height: raw.height, ground: tileLayer('Ground'), details: tileLayer('Details'), above: tileLayer('Above'), collision: tileLayer('Collision'), spawns, portals, decorations, npcs, monsterSpawns, image };
}
export function validateMaps(maps: WorldMap[], images: ReadonlySet<string>): void {
  const ids = new Set(maps.map(m => m.id));
  if (ids.size !== maps.length) throw new Error('Powtórzone mapId');
  for (const map of maps) {
    if(map.id==='eldoria' && (combatAllowedAt(map,map.spawns.entry!)||!map.regions.some(r=>r.id==='forest'&&r.combatAllowed)||!map.regions.some(r=>r.id==='vareon'&&!r.combatAllowed)))throw new Error('Nieprawidłowe regiony ciągłego świata');
    if (!images.has(map.image)) throw new Error(`${map.id}: brak PNG ${map.image}`);
    for (const spawn of Object.values(map.spawns)) {
      if (map.collision[spawn.y * map.width + spawn.x] !== 0) throw new Error(`${map.id}: spawn w ścianie`);
    }
    if(new Set(map.buildings.map(b=>b.id)).size!==map.buildings.length || map.buildings.some(b=>!b.id)) throw new Error(`${map.id}: powtórzony budynek`);
    for(const b of map.buildings) {
      if(b.doors.some(p=>map.collision[p.y*map.width+p.x]!==0)) throw new Error(`${map.id}: zablokowane drzwi ${b.id}`);
      if(map.buildings.some(other=>other!==b&&b.x<other.x+other.width&&b.x+b.width>other.x&&b.y<other.y+other.height&&b.y+b.height>other.y)) throw new Error(`${map.id}: budynki nachodzą na siebie`);
    }
    for(const p of map.townProps) {
      if(p.buildingId && !map.buildings.some(b=>b.id===p.buildingId&&p.x>b.x&&p.x+p.width-1<b.x+b.width-1&&p.y>b.y&&p.y<b.y+b.height-1)) throw new Error(`${map.id}: wyposażenie poza budynkiem`);
    }
    if(map.monsterSpawns.some(p=>!combatAllowedAt(map,p)))throw new Error(`${map.id}: potwór w strefie bezpiecznej`);
    const positions = new Set<string>();
    for (const actor of [...map.npcs, ...map.monsterSpawns]) {
      const position = `${actor.x},${actor.y}`;
      if (positions.has(position) || map.collision[actor.y * map.width + actor.x] !== 0 || actor.x === map.spawns.entry?.x && actor.y === map.spawns.entry.y) throw new Error(`${map.id}: zajęty spawn NPC/potwora`);
      positions.add(position);
    }
    for (const portal of map.portals) {
      const target = maps.find(m => m.id === portal.targetMapId);
      if (!target || !Object.hasOwn(target.spawns, portal.targetSpawnId)) throw new Error(`${map.id}: nieprawidłowy portal ${portal.id}`);
      const arrival = target.spawns[portal.targetSpawnId]!;
      if ([...target.npcs,...target.monsterSpawns].some(a => a.x === arrival.x && a.y === arrival.y)) throw new Error(`${map.id}: portal do zajętego spawnu`);
      if (map.collision[portal.y * map.width + portal.x] !== 0) throw new Error(`${map.id}: portal w ścianie`);
    }
  }
}
