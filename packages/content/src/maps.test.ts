import { describe, it, expect } from 'vitest';
import courtyard from '../../../apps/client/public/assets/courtyard.json';
import grove from '../../../apps/client/public/assets/grove.json';
import { importMap, validateMaps } from './maps';
function copy() { return structuredClone(courtyard); }
describe('Tiled content boundary', () => {
  it('accepts both editable sample exports and connected portals', () => {
    const maps = [importMap(courtyard), importMap(grove)];
    expect(() => validateMaps(maps, new Set(['tiles.png']))).not.toThrow();
    expect(maps[0]?.collision[12 * 28 + 3]).toBe(1);
    expect(maps[0]?.collision[8 * 28 + 6]).toBe(1);
    expect(maps[0]?.collision[5 * 28 + 6]).toBe(0);
  });
  it('rejects portals to nonexistent spawn/map', () => {
    const map = importMap(courtyard); map.portals[0]!.targetSpawnId = 'missing';
    expect(() => validateMaps([map, importMap(grove)], new Set(['tiles.png']))).toThrow(/portal/);
  });
  it('rejects missing PNG', () => expect(() => validateMaps([importMap(courtyard), importMap(grove)], new Set())).toThrow(/PNG/));
  it('rejects spawn inside wall', () => {
    const map = importMap(courtyard); map.collision[11 * 28 + 13] = 1;
    expect(() => validateMaps([map, importMap(grove)], new Set(['tiles.png']))).toThrow(/spawn w ścianie/);
  });
  it('rejects flipped GIDs, missing layers, external PNG and wrong dimensions', () => {
    const flipped = copy(); flipped.layers[0]!.data![0] = 2147483649;
    expect(() => importMap(flipped)).toThrow(/transformacja/);
    const missing = copy(); missing.layers = missing.layers.filter(l => l.name !== 'Collision');
    expect(() => importMap(missing)).toThrow(/Collision/);
    const external = copy(); external.tilesets[0]!.image = 'https://example.com/tiles.png';
    expect(() => importMap(external)).toThrow(/względnym/);
    const dimensions = copy(); dimensions.tilewidth = 16;
    expect(() => importMap(dimensions)).toThrow();
  });
});
