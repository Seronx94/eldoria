import { z } from 'zod';
const property = z.object({ name: z.string(), value: z.string() });
const objectSchema = z.object({
  id: z.number().int().positive(), name: z.string(), x: z.number().int().nonnegative(), y: z.number().int().nonnegative(),
  properties: z.array(property).default([])
});
const layer = z.object({ name: z.string(), type: z.enum(['tilelayer', 'objectgroup']), data: z.array(z.number().int().nonnegative()).optional(), objects: z.array(objectSchema).optional() });
const schema = z.object({
  orientation: z.literal('orthogonal'), infinite: z.literal(false),
  width: z.number().int().min(3).max(256), height: z.number().int().min(3).max(256),
  tilewidth: z.literal(32), tileheight: z.literal(32),
  properties: z.array(property), layers: z.array(layer),
  tilesets: z.array(z.object({ firstgid: z.literal(1), tilecount: z.literal(4), columns: z.literal(4), image: z.string(), tilewidth: z.literal(32), tileheight: z.literal(32) })).length(1)
});
export type RawMap = z.infer<typeof schema>;
export interface Point { x: number; y: number }
export interface WorldMap {
  id: string; combatAllowed: boolean; width: number; height: number; ground: number[]; details: number[]; above: number[]; collision: number[];
  spawns: Record<string, Point>;
  portals: (Point & { id: string; targetMapId: string; targetSpawnId: string })[];
  decorations: (Point & { kind: 'tree' | 'house' })[];
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
  // NPC IDs are validated even though the sample scene intentionally has no quest NPCs.
  for (const o of objects('NPCs')) { point(o); properties(o.properties, 'npcId'); }
  const decorations = objects('Decorations').map(o => ({ ...point(o), kind: z.enum(['tree', 'house']).parse(o.name) }));
  const image = raw.tilesets[0]!.image;
  if (image.startsWith('/') || image.includes('..') || image.includes(':') || !image.endsWith('.png')) throw new Error(`${id}: obraz musi być względnym PNG`);
  return { id, combatAllowed: raw.properties.find(p => p.name === 'combatAllowed')?.value !== 'false', width: raw.width, height: raw.height, ground: tileLayer('Ground'), details: tileLayer('Details'), above: tileLayer('Above'), collision: tileLayer('Collision'), spawns, portals, decorations, image };
}
export function validateMaps(maps: WorldMap[], images: ReadonlySet<string>): void {
  const ids = new Set(maps.map(m => m.id));
  if (ids.size !== maps.length) throw new Error('Powtórzone mapId');
  for (const map of maps) {
    if (!images.has(map.image)) throw new Error(`${map.id}: brak PNG ${map.image}`);
    for (const spawn of Object.values(map.spawns)) {
      if (map.collision[spawn.y * map.width + spawn.x] !== 0) throw new Error(`${map.id}: spawn w ścianie`);
    }
    for (const portal of map.portals) {
      const target = maps.find(m => m.id === portal.targetMapId);
      if (!target || !Object.hasOwn(target.spawns, portal.targetSpawnId)) throw new Error(`${map.id}: nieprawidłowy portal ${portal.id}`);
      if (map.collision[portal.y * map.width + portal.x] !== 0) throw new Error(`${map.id}: portal w ścianie`);
    }
  }
}
