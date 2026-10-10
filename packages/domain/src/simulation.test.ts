import { describe, it, expect, vi } from 'vitest';
import courtyard from '../../../apps/client/public/assets/courtyard.json';
import grove from '../../../apps/client/public/assets/grove.json';
import { importMap, rules } from '@eldoria/content';
import { Simulation, LocalGateway, type Spawn } from './index';
function setup(spawns: Spawn[] = [{ id: 'rat', kind: 'rat', x: 14, y: 11 }]) {
  let time = 0;
  const maps = [importMap(grove), importMap(courtyard)];
  const simulation = new Simulation(maps, 'Tester', { now: () => time }, spawns);
  return { simulation, maps, advance: (ms: number) => { time += ms; simulation.tick(); }, setTime: (ms: number) => { time = ms; } };
}
describe('grid simulation', () => {
  it('validates name and commands, rejecting HTML-independent extra properties and diagonals', () => {
    const t = setup(); const before = t.simulation.snapshot().player;
    t.simulation.send({ type: 'Move', direction: 'diagonal' });
    t.simulation.send({ type: 'Move', direction: 'up', gold: 1000 });
    expect(t.simulation.snapshot().player).toEqual(before);
    expect(t.simulation.snapshot().gold).toBe(0);
    expect(() => new Simulation(t.maps, '  ', { now: () => 0 })).toThrow();
  });
  it('allows exactly one cardinal step per 200ms and blocks creatures/walls', () => {
    const t = setup();
    t.simulation.send({ type: 'Move', direction: 'right' });
    expect(t.simulation.snapshot().player).toEqual({ x: 13, y: 11 });
    t.simulation.send({ type: 'Move', direction: 'up' });
    t.simulation.send({ type: 'Move', direction: 'left' });
    expect(t.simulation.snapshot().player).toEqual({ x: 13, y: 10 });
    t.advance(199); t.simulation.send({ type: 'Move', direction: 'left' });
    expect(t.simulation.snapshot().player.x).toBe(13);
    t.advance(1); t.simulation.send({ type: 'Move', direction: 'left' });
    expect(t.simulation.snapshot().player.x).toBe(12);
    for (let i = 0; i < 30; i++) { t.advance(200); t.simulation.send({ type: 'Move', direction: 'left' }); }
    expect(t.simulation.snapshot().player.x).toBe(1);
  });
  it('requires explicit interaction near portal and makes five round trips', () => {
    const t = setup([]);
    t.simulation.send({ type: 'Interact' }); expect(t.simulation.snapshot().mapId).toBe('grove');
    for (let leg = 0; leg < 10; leg++) {
      for (let i = 0; i < 7; i++) { t.advance(200); t.simulation.send({ type: 'Move', direction: 'up' }); }
      expect(t.simulation.snapshot().player).toEqual({ x: 13, y: 4 });
      const previous = t.simulation.snapshot().mapId;
      t.simulation.send({ type: 'Interact' });
      expect(t.simulation.snapshot().mapId).not.toBe(previous);
      expect(t.simulation.snapshot().player).toEqual({ x: 13, y: 11 });
      t.simulation.send({ type: 'Interact' }); expect(t.simulation.snapshot().player.y).toBe(11);
    }
  });
  it('does not expose mutable internal snapshots', () => {
    const t = setup(); const snapshot = t.simulation.snapshot(); snapshot.player.x = 999; snapshot.creatures[0]!.hp = 0;
    expect(t.simulation.snapshot().player.x).toBe(13); expect(t.simulation.snapshot().creatures[0]?.hp).toBe(30);
  });
});
describe('training combat', () => {
  it('automatically attacks adjacent enemies; respects cooldown and pays once per death', () => {
    const t = setup(); const sim = t.simulation;
    sim.send({ type: 'Attack' }); expect(sim.snapshot().creatures[0]?.hp).toBe(18);
    sim.send({ type: 'Select', targetId: 'rat' }); sim.send({ type: 'Attack' });
    expect(sim.snapshot().creatures[0]?.hp).toBe(18);
    sim.send({ type: 'Attack' }); expect(sim.snapshot().creatures[0]?.hp).toBe(18);
    t.advance(800); sim.send({ type: 'Attack' }); t.advance(800); sim.send({ type: 'Attack' });
    sim.send({ type: 'Loot' });
    expect(sim.snapshot()).toMatchObject({ kills: 1, exp: 10, gold: 1 });
    sim.send({ type: 'Select', targetId: 'rat' }); sim.send({ type: 'Attack' });
    expect(sim.snapshot()).toMatchObject({ kills: 1, exp: 10, gold: 1 });
    t.advance(rules.respawnMs - 1); expect(sim.snapshot().creatures[0]?.hp).toBe(0);
    t.advance(1); expect(sim.snapshot().creatures[0]?.hp).toBe(30);
  });
  it('rejects melee outside range and spells through a wall', () => {
    const t = setup([{ id: 'rat', kind: 'rat', x: 13, y: 8 }]);
    t.simulation.send({ type: 'Select', targetId: 'rat' });
    t.simulation.send({ type: 'Attack' }); expect(t.simulation.snapshot().creatures[0]?.hp).toBe(30);
    t.maps[0]!.collision[10 * 28 + 13] = 1;
    t.simulation.send({ type: 'Cast' }); expect(t.simulation.snapshot().mana).toBe(42);
    expect(t.simulation.snapshot().creatures[0]?.hp).toBe(30);
    expect(t.simulation.snapshot().combatEvents.at(-1)).toMatchObject({kind:'spell',targetId:null,damage:0});
  });
  it('uses mana, spell cooldown and timed regeneration', () => {
    const t = setup(); const sim = t.simulation;
    sim.send({ type: 'Select', targetId: 'rat' }); sim.send({ type: 'Cast' }); sim.send({ type: 'Cast' });
    expect(sim.snapshot().mana).toBe(42); expect(sim.snapshot().creatures[0]?.hp).toBe(12);
    t.advance(1500); sim.send({ type: 'Cast' }); expect(sim.snapshot().mana).toBe(34);
    t.advance(500); expect(sim.snapshot().mana).toBe(35);
  });
  it('preserves potions at full HP, caps healing and enforces cooldown', () => {
    const t = setup([{ id: 'wolf', kind: 'wolf', x: 14, y: 11 }]); const sim = t.simulation;
    // Full health must preserve the potion when no enemy is present.
    const neutral = setup([]); neutral.simulation.send({ type: 'UseItem' }); expect(neutral.simulation.snapshot().potions).toBe(3);
    t.advance(1200); expect(sim.snapshot().hp).toBe(93);
    sim.send({ type: 'UseItem' }); expect(sim.snapshot()).toMatchObject({ hp: 100, potions: 2 });
    t.advance(1200); sim.send({ type: 'UseItem' }); expect(sim.snapshot()).toMatchObject({ hp: 93, potions: 2 });
    t.advance(1800); sim.send({ type: 'UseItem' }); expect(sim.snapshot()).toMatchObject({ hp: 100, potions: 1 });
  });
  it('returns dead player safely with full stats', () => {
    const t = setup([{ id: 'wolf', kind: 'wolf', x: 14, y: 11 }]);
    for (let i = 0; i < 15; i++) t.advance(1200);
    expect(t.simulation.snapshot()).toMatchObject({ hp: 100, mana: 50, mapId: 'courtyard', player: { x: 13, y: 11 } });
    expect(t.simulation.snapshot().message).toContain('Omdlenie');
  });
  it('rejects a clock that moves backwards', () => { const t = setup(); t.setTime(-1); expect(() => t.simulation.tick()).toThrow(/monotoniczny/); });
});
describe('LocalGateway lifecycle', () => {
  it('starts once, unsubscribes and disconnects without leaking ticks', () => {
    vi.useFakeTimers();
    try {
      const t = setup([]); const gateway = new LocalGateway(t.simulation); const listener = vi.fn();
      const unsubscribe = gateway.subscribe(listener); gateway.connect(); gateway.connect();
      listener.mockClear(); vi.advanceTimersByTime(100); expect(listener).toHaveBeenCalledTimes(2);
      unsubscribe(); listener.mockClear(); vi.advanceTimersByTime(100); expect(listener).not.toHaveBeenCalled();
      gateway.disconnect(); expect(vi.getTimerCount()).toBe(0);
      gateway.connect(); gateway.disconnect(); expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
});

describe('loot and equipment boundaries', () => {
  it('picks up nearby loot once and leaves distant loot untouched', () => {
    const t = setup(); const sim = t.simulation;
    sim.send({ type: 'Select', targetId: 'rat' });
    for (let i = 0; i < 3; i++) { sim.send({ type: 'Attack' }); t.advance(800); }
    const lootId = sim.snapshot().loot[0]!.id;
    expect(sim.snapshot().gold).toBe(0);
    sim.send({ type: 'Move', direction: 'left' });
    sim.send({ type: 'Loot', lootId }); expect(sim.snapshot().gold).toBe(0);
    t.advance(200); sim.send({ type: 'Move', direction: 'right' });
    sim.send({ type: 'Loot', lootId }); sim.send({ type: 'Loot', lootId });
    expect(sim.snapshot().gold).toBe(1); expect(sim.snapshot().loot).toHaveLength(0);
  });
  it('keeps both gold and material on the ground when the bag is full', () => {
    let now = 0;
    const sim = new Simulation([importMap(grove), importMap(courtyard)], 'Tester', { now: () => now }, [{ id: 'beetle', kind: 'beetle', x: 14, y: 11 }], Array.from({ length: 20 }, () => ({ itemId: 'sword', quantity: 1 })));
    sim.send({ type: 'Select', targetId: 'beetle' });
    for (let i = 0; i < 3; i++) { sim.send({ type: 'Cast' }); now += 1500; }
    expect(sim.snapshot().loot).toHaveLength(1);
    sim.send({ type: 'Loot' }); sim.send({ type: 'Loot' });
    expect(sim.snapshot().loot).toHaveLength(1); expect(sim.snapshot().gold).toBe(0); expect(sim.snapshot().inventory).toHaveLength(20);
    sim.send({ type: 'Unequip', slot: 'armor' }); expect(sim.snapshot().equipment.armor).toBe('tunic');
  });
  it('equips from bag atomically; missing equipment cannot be forged', () => {
    const t = setup(); const sim = t.simulation;
    sim.send({ type: 'Unequip', slot: 'weapon' });
    expect(sim.snapshot().equipment.weapon).toBeNull();
    sim.send({ type: 'Select', targetId: 'rat' }); sim.send({ type: 'Attack' });
    expect(sim.snapshot().creatures[0]!.hp).toBe(30);
    sim.send({ type: 'Equip', itemId: 'sword' });
    expect(sim.snapshot().equipment.weapon).toBe('sword');
    expect(sim.snapshot().inventory.some(s => s.itemId === 'sword')).toBe(false);
    sim.send({ type: 'Equip', itemId: 'sword' }); expect(sim.snapshot().inventory).toHaveLength(1);
  });
  it('cannot use a potion with an empty bag', () => {
    let now = 0;
    const sim = new Simulation([importMap(grove), importMap(courtyard)], 'Tester', { now: () => now }, [{ id: 'wolf', kind: 'wolf', x: 14, y: 11 }], []);
    now = 1200; sim.tick(); sim.send({ type: 'UseItem' });
    expect(sim.snapshot()).toMatchObject({ hp: 93, potions: 0 });
  });
  it('forbids combat in safe courtyard and preserves deaths across portal travel', () => {
    const safe = new Simulation([importMap(courtyard), importMap(grove)], 'Tester', { now: () => 0 });
    safe.send({ type: 'Attack' }); expect(safe.snapshot().creatures).toHaveLength(0); expect(safe.snapshot().message).toContain('nie ma walki');
    const t = setup(); const sim = t.simulation;
    sim.send({ type: 'Select', targetId: 'rat' });
    for (let i = 0; i < 3; i++) { sim.send({ type: 'Attack' }); t.advance(800); }
    for (let leg = 0; leg < 2; leg++) {
      for (let i = 0; i < 7; i++) { t.advance(200); sim.send({ type: 'Move', direction: 'up' }); }
      sim.send({ type: 'Interact' });
    }
    expect(sim.snapshot().creatures[0]!.hp).toBe(0); expect(sim.snapshot().loot).toHaveLength(1); expect(sim.snapshot().exp).toBe(10);
  });
});

describe('monster AI and resource exhaustion', () => {
  it('leashes the wolf, restores HP at spawn and gives no EXP for returning', () => {
    const t = setup([{ id: 'wolf', kind: 'wolf', x: 14, y: 11 }]); const sim = t.simulation;
    sim.send({ type: 'Select', targetId: 'wolf' }); sim.send({ type: 'Attack' });
    expect(sim.snapshot().creatures[0]!.hp).toBe(60);
    for (let i = 0; i < 8; i++) { t.advance(200); sim.send({ type: 'Move', direction: 'down' }); }
    for (let i = 0; i < 13; i++) { t.advance(200); sim.send({ type: 'Move', direction: 'right' }); }
    let returning = false;
    for (let i = 0; i < 80; i++) {
      t.advance(400); if (sim.snapshot().creatures[0]!.state === 'return') returning = true;
    }
    expect(returning).toBe(true);
    expect(sim.snapshot().creatures[0]).toMatchObject({ x: 14, y: 11, hp: 70, state: 'idle' });
    expect(sim.snapshot().exp).toBe(0);
  });
  it('nearby rats pursue without provocation and a blocked chase never teleports', () => {
    const t = setup([{ id: 'rat', kind: 'rat', x: 13, y: 8 }]);
    t.advance(3000); expect(t.simulation.snapshot().creatures[0]).toMatchObject({state:'chase',x:13,y:9});
    const map = t.maps[0]!;
    for (const [x,y] of [[12,9],[14,9],[13,8],[13,10]]) map.collision[y!*28+x!] = 1;
    t.advance(3000);
    expect(t.simulation.snapshot().creatures[0]).toMatchObject({ x: 13, y: 9 });
  });
});

describe('progression', () => {
  it('levels at 100 EXP, carries surplus and restores increased maximum stats', () => {
    const t = setup(); const sim = t.simulation;
    for (let kill = 0; kill < 10; kill++) {
      sim.send({ type: 'Select', targetId: 'rat' });
      for (let hit = 0; hit < 3; hit++) { sim.send({ type: 'Attack' }); t.advance(800); }
      if (kill < 9) t.advance(20000);
    }
    expect(sim.snapshot()).toMatchObject({ level: 2, maxHp: 110, maxMana: 55, hp: 110, mana: 55, exp: 0 });
    t.advance(20000); sim.send({ type: 'Select', targetId: 'rat' });
    for (let hit = 0; hit < 3; hit++) { sim.send({ type: 'Attack' }); t.advance(800); }
    expect(sim.snapshot()).toMatchObject({ level: 2, exp: 10 });
  });
});

describe('mana boundary', () => {
  it('rejects another spell when mana is below eight, without damaging the target', () => {
    const positions = [[14,11], [12,11], [13,10], [13,12], [15,11], [11,11], [13,9]];
    const t = setup(positions.map(([x,y], i) => ({ id: `rat-${i}`, kind: 'rat', x: x!, y: y! })));
    for (let i = 0; i < 6; i++) {
      t.simulation.send({ type: 'Select', targetId: `rat-${i}` }); t.simulation.send({ type: 'Cast' }); t.advance(1500);
    }
    expect(t.simulation.snapshot().mana).toBeLessThan(8);
    t.simulation.send({ type: 'Select', targetId: 'rat-6' }); t.simulation.send({ type: 'Cast' });
    expect(t.simulation.snapshot().creatures[6]?.hp).toBe(30);
    expect(t.simulation.snapshot().message).toContain('Za mało many');
  });
});
