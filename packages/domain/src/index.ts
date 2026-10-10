import { items, monsters, rules, type MonsterKind, type WorldMap } from '@eldoria/content';
import { commandSchema, nameSchema, type Command, type Direction } from '@eldoria/protocol';
import { addItems, countItem, removeItem, inventorySchema, type Stack } from './inventory';
export { addItems, countItem, removeItem, inventorySchema, type Stack } from './inventory';
export interface Loot extends Point { id: string; mapId: string; gold: number; items: Stack[] }
export interface Point { x: number; y: number }
export interface Creature extends Point {
  id: string; kind: MonsterKind; hp: number; spawn: Point;
  state: 'idle' | 'chase' | 'attack' | 'return' | 'dead';
  lastAttack: number; lastMove: number; diedAt: number;
}
export interface Snapshot {
  name: string; mapId: string; player: Point; direction: Direction;
  hp: number; mana: number; maxHp: number; maxMana: number; level: number; potions: number; exp: number; gold: number;
  kills: number; defeatedKinds: MonsterKind[]; selectedId: string | null; creatures: Creature[];
  inventory: Stack[]; equipment: { weapon: 'sword' | null; armor: 'tunic' | null }; loot: Loot[];
  message: string; eventId: number; complete: boolean;
}
export interface Spawn extends Point { id: string; kind: MonsterKind }
export interface Clock { now(): number }
export interface GameGateway {
  connect(): void; send(command: unknown): void;
  subscribe(listener: (snapshot: Snapshot) => void): () => void; disconnect(): void;
}
const vectors: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export class Simulation {
  private state: Snapshot;
  private creatureMaps = new Map<string, Creature[]>();
  private lastMove = -Infinity;
  private lastAttack = -Infinity;
  private lastSpell = -Infinity;
  private lastPotion = -Infinity;
  private lastMana: number;
  private time: number;
  constructor(private maps: WorldMap[], name: string, private clock: Clock, private spawns: Spawn[] = [
    { id: 'rat-1', kind: 'rat', x: 14, y: 9 },
    { id: 'beetle-1', kind: 'beetle', x: 18, y: 11 },
    { id: 'wolf-1', kind: 'wolf', x: 22, y: 16 },
  ], initialInventory: Stack[] = [{ itemId: 'potion', quantity: 3 }]) {
    const map = maps[0];
    if (!map?.spawns.entry) throw new Error('Brak mapy startowej');
    this.time = clock.now(); this.lastMana = this.time;
    this.state = { name: nameSchema.parse(name), mapId: map.id, player: { ...map.spawns.entry }, direction: 'down', hp: rules.maxHp, mana: rules.maxMana, maxHp: rules.maxHp, maxMana: rules.maxMana, level: 1, potions: countItem(initialInventory, 'potion'), inventory: inventorySchema.parse(initialInventory), equipment: { weapon: 'sword', armor: 'tunic' }, loot: [], exp: 0, gold: 0, kills: 0, defeatedKinds: [], selectedId: null, creatures: [], message: map.combatAllowed ? 'Próba Wędrowca: szczur, żuk i wilk. Wybierz cel i zbierz łup.' : 'Dziedziniec jest bezpieczny. Idź w górę do świecącej bramy i wybierz Przejdź.', eventId: 0, complete: false };
    this.spawnCreatures();
  }
  private map(): WorldMap { return this.maps.find(m => m.id === this.state.mapId)!; }
  private notify(message: string): void { this.state.message = message; this.state.eventId++; }
  private walkable(point: Point): boolean {
    const m = this.map();
    return point.x >= 0 && point.y >= 0 && point.x < m.width && point.y < m.height && m.collision[point.y * m.width + point.x] === 0;
  }
  private occupied(point: Point, except?: string): boolean {
    return this.state.creatures.some(c => c.id !== except && c.hp > 0 && distance(c, point) === 0);
  }
  private spawnCreatures(): void {
    const cached = this.creatureMaps.get(this.state.mapId);
    if (cached) { this.state.creatures = cached; return; }
    this.state.creatures = (this.map().combatAllowed ? this.spawns : []).map(s => {
      if (!this.walkable(s)) throw new Error(`Nieprawidłowy spawn potwora ${s.id}`);
      return { ...s, hp: monsters[s.kind].hp, spawn: { x: s.x, y: s.y }, state: 'idle', lastAttack: -Infinity, lastMove: -Infinity, diedAt: 0 };
    });
    this.creatureMaps.set(this.state.mapId, this.state.creatures);
  }
  snapshot(): Snapshot { return structuredClone(this.state); }
  send(input: unknown): void {
    const parsed = commandSchema.safeParse(input);
    if (!parsed.success) { this.notify('Nieprawidłowa komenda.'); return; }
    this.tick();
    this.command(parsed.data);
  }
  private command(command: Command): void {
    const now = this.time;
    const s = this.state;
    if (command.type === 'Select') {
      if (s.creatures.some(c => c.id === command.targetId && c.hp > 0)) s.selectedId = command.targetId;
      return;
    }
    if (command.type === 'Loot') {
      const loot = s.loot.find(l => l.mapId === s.mapId && (command.lootId === undefined || command.lootId === l.id) && distance(l, s.player) <= 1);
      if (!loot) { this.notify('Podejdź obok sakiewki, aby odebrać łup.'); return; }
      const inventory = addItems(s.inventory, loot.items);
      if (!inventory) { this.notify('Pełny plecak — łup pozostaje na ziemi.'); return; }
      s.inventory = inventory; s.gold += loot.gold; s.loot = s.loot.filter(l => l.id !== loot.id);
      s.potions = countItem(s.inventory, 'potion'); this.notify('Odebrano łup.'); return;
    }
    if (command.type === 'Unequip') {
      const id = s.equipment[command.slot]; if (!id) return;
      const inventory = addItems(s.inventory, [{ itemId: id, quantity: 1 }]);
      if (!inventory) { this.notify('Pełny plecak — nie można zdjąć wyposażenia.'); return; }
      s.inventory = inventory; s.equipment[command.slot] = null; this.notify('Zdjęto wyposażenie.'); return;
    }
    if (command.type === 'Equip') {
      const slot = items[command.itemId].slot;
      const without = removeItem(s.inventory, command.itemId, 1);
      if (!without) { this.notify('Nie masz tego przedmiotu w plecaku.'); return; }
      const previous = s.equipment[slot];
      const inventory = previous ? addItems(without, [{ itemId: previous, quantity: 1 }]) : without;
      if (!inventory) { this.notify('Brak miejsca na poprzednie wyposażenie.'); return; }
      s.inventory = inventory;
      if (slot === 'weapon') s.equipment.weapon = 'sword'; else s.equipment.armor = 'tunic';
      this.notify('Założono wyposażenie.'); return;
    }
    if (command.type === 'Move') {
      if (now - this.lastMove < rules.stepMs) return;
      s.direction = command.direction;
      const v = vectors[command.direction];
      const next = { x: s.player.x + v.x, y: s.player.y + v.y };
      if (!this.walkable(next) || this.occupied(next)) { this.notify('Przejście zablokowane.'); return; }
      s.player = next; this.lastMove = now; return;
    }
    if (command.type === 'Interact') {
      const portal = this.map().portals.find(p => distance(p, s.player) <= 1);
      if (!portal) { this.notify('Podejdź do świecącej bramy i wybierz Przejdź.'); return; }
      const target = this.maps.find(m => m.id === portal.targetMapId);
      const spawn = target?.spawns[portal.targetSpawnId];
      if (!target || !spawn) { this.notify('Brama nie ma poprawnego celu.'); return; }
      s.mapId = target.id; s.player = { ...spawn }; s.selectedId = null;
      this.spawnCreatures(); this.lastMove = now;
      this.notify('Przejście do drugiej sceny wzorcowej.'); return;
    }
    if (command.type === 'UseItem') {
      if (s.hp >= s.maxHp) { this.notify('Masz pełne zdrowie — mikstura pozostaje w plecaku.'); return; }
      if (s.potions <= 0) { this.notify('Brak mikstur.'); return; }
      if (now - this.lastPotion < rules.potionMs) { this.notify('Mikstura odnawia się przez 3 sekundy.'); return; }
      s.inventory = removeItem(s.inventory, 'potion', 1)!; s.potions = countItem(s.inventory, 'potion'); s.hp = Math.min(s.maxHp, s.hp + rules.potionHeal); this.lastPotion = now;
      this.notify('Odzyskano zdrowie.'); return;
    }
    if (!this.map().combatAllowed) { this.notify('Na dziedzińcu nie ma walki.'); return; }
    const target = s.creatures.find(c => c.id === s.selectedId && c.hp > 0);
    if (!target) { this.notify('Dotknij szczura, aby wybrać cel.'); return; }
    const casting = command.type === 'Cast';
    if (!casting && !s.equipment.weapon) { this.notify('Załóż miecz w plecaku.'); return; }
    const range = casting ? rules.spellRange : 1;
    if (distance(target, s.player) > range) { this.notify('Cel poza zasięgiem. Podejdź bliżej.'); return; }
    if (casting && !this.lineOfSight(s.player, target)) { this.notify('Ściana zasłania cel.'); return; }
    if (now - (casting ? this.lastSpell : this.lastAttack) < (casting ? rules.spellMs : rules.attackMs)) return;
    if (casting && s.mana < rules.spellCost) { this.notify('Za mało many.'); return; }
    if (casting) { s.mana -= rules.spellCost; this.lastSpell = now; } else this.lastAttack = now;
    const damage = Math.max(1, (casting ? rules.spellDamage : rules.attackDamage) - monsters[target.kind].defense);
    target.hp = Math.max(0, target.hp - damage); target.state = 'chase';
    this.notify(`${casting ? 'Iskra' : 'Miecz'}: ${damage} obrażeń.`);
    if (target.hp === 0) {
      target.state = 'dead'; target.diedAt = now; s.selectedId = null;
      s.exp += monsters[target.kind].exp; s.kills++;
      while (s.exp >= 100 * s.level) {
        s.exp -= 100 * s.level; s.level++; s.maxHp += 10; s.maxMana += 5; s.hp = s.maxHp; s.mana = s.maxMana;
      }
      s.loot.push({ id: `${s.mapId}:${target.id}:${s.eventId}`, mapId: s.mapId, x: target.x, y: target.y, gold: monsters[target.kind].gold, items: target.kind === 'rat' ? [] : [{ itemId: target.kind === 'wolf' ? 'skin' : 'chitin', quantity: 1 }] });
      if (!s.defeatedKinds.includes(target.kind)) s.defeatedKinds.push(target.kind);
      s.complete = s.defeatedKinds.length === 3;
      this.notify(s.complete ? 'Próba ukończona! Pokonano 3 stworzenia. Wróć do menu, aby rozpocząć nową próbę.' : `Pokonano ${monsters[target.kind].name.toLowerCase()}. Próba: ${s.defeatedKinds.length}/3.`);
    }
  }
  private lineOfSight(a: Point, b: Point): boolean {
    let x = a.x, y = a.y;
    const dx = Math.abs(b.x - x), dy = -Math.abs(b.y - y), sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
    let error = dx + dy;
    while (x !== b.x || y !== b.y) {
      const twice = 2 * error;
      if (twice >= dy) { error += dy; x += sx; }
      if (twice <= dx) { error += dx; y += sy; }
      if (!this.walkable({ x, y })) return false;
    }
    return true;
  }
  private nextStep(creature: Creature, target: Point): Point | undefined {
    // Bounded A*: no teleport when blocked or the search budget is exhausted.
    const open: Point[] = [{ x: creature.x, y: creature.y }];
    const key = (p: Point) => `${p.x},${p.y}`;
    const previous = new Map<string, Point | null>([[key(creature), null]]);
    const cost = new Map<string, number>([[key(creature), 0]]);
    const closed = new Set<string>();
    let goal: Point | undefined;
    for (let expanded = 0; open.length && expanded < 512; expanded++) {
      open.sort((a, b) => (cost.get(key(a))! + distance(a, target)) - (cost.get(key(b))! + distance(b, target)));
      const current = open.shift()!;
      if (closed.has(key(current))) continue;
      closed.add(key(current));
      if (distance(current, target) <= (creature.state === 'return' ? 0 : 1)) { goal = current; break; }
      for (const v of Object.values(vectors)) {
        const next = { x: current.x + v.x, y: current.y + v.y }, nextKey = key(next);
        const nextCost = cost.get(key(current))! + 1;
        if (closed.has(nextKey) || !this.walkable(next) || this.occupied(next, creature.id) || distance(next, this.state.player) === 0 || nextCost >= (cost.get(nextKey) ?? Infinity)) continue;
        previous.set(nextKey, current); cost.set(nextKey, nextCost); open.push(next);
      }
    }
    if (!goal) return undefined;
    while (true) {
      const parent = previous.get(`${goal.x},${goal.y}`);
      if (!parent) return undefined;
      if (distance(parent, creature) === 0) return goal;
      goal = parent;
    }
  }
  tick(): void {
    const now = this.clock.now();
    if (!Number.isFinite(now) || now < this.time) throw new Error('Zegar musi być monotoniczny');
    this.time = now;
    const s = this.state;
    const manaTicks = Math.floor((now - this.lastMana) / rules.manaRegenMs);
    if (manaTicks > 0) { s.mana = Math.min(s.maxMana, s.mana + manaTicks); this.lastMana += manaTicks * rules.manaRegenMs; }
    for (const c of s.creatures) {
      if (c.hp === 0) {
        if (now - c.diedAt >= rules.respawnMs && distance(c.spawn, s.player) !== 0 && !this.occupied(c.spawn, c.id)) {
          Object.assign(c, c.spawn); c.hp = monsters[c.kind].hp; c.state = 'idle'; c.lastAttack = now;
        }
        continue;
      }
      if (monsters[c.kind].aggressive && distance(c, s.player) <= 6 && c.state === 'idle') c.state = 'chase';
      if ((c.state === 'chase' || c.state === 'attack') && distance(c, c.spawn) > 10) c.state = 'return';
      if (c.state === 'return' && distance(c, c.spawn) === 0) { c.hp = monsters[c.kind].hp; c.state = 'idle'; }
      if (c.state === 'chase' || c.state === 'attack') {
        if (distance(c, s.player) <= 1) {
          c.state = 'attack';
          if (now - c.lastAttack >= rules.monsterAttackMs) {
            s.hp = Math.max(0, s.hp - Math.max(1, monsters[c.kind].damage - (s.equipment.armor ? rules.playerDefense : 2))); c.lastAttack = now;
            if (s.hp === 0) { this.die(); return; }
          }
        } else c.state = 'chase';
      }
      if ((c.state === 'chase' || c.state === 'return') && now - c.lastMove >= rules.stepMs * 2) {
        const next = this.nextStep(c, c.state === 'return' ? c.spawn : s.player);
        if (next) Object.assign(c, next);
        c.lastMove = now;
      }
    }
  }
  private die(): void {
    const m = this.maps.find(m => !m.combatAllowed) ?? this.maps[0]!;
    this.state.mapId = m.id; this.state.player = { ...m.spawns.entry! };
    this.state.hp = this.state.maxHp; this.state.mana = this.state.maxMana; this.state.selectedId = null;
    this.spawnCreatures(); this.lastMove = this.time;
    this.notify('Omdlenie. Wracasz na dziedziniec z pełnym zdrowiem i maną, bez utraty zdobyczy.');
  }
}
export class LocalGateway implements GameGateway {
  private listeners = new Set<(snapshot: Snapshot) => void>();
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(private simulation: Simulation) {}
  connect(): void {
    if (this.timer) return;
    this.timer = setInterval(() => { this.simulation.tick(); this.emit(); }, rules.tickMs);
    this.emit();
  }
  send(command: unknown): void { this.simulation.send(command); this.emit(); }
  subscribe(listener: (snapshot: Snapshot) => void): () => void {
    this.listeners.add(listener); listener(this.simulation.snapshot()); return () => { this.listeners.delete(listener); };
  }
  private emit(): void { for (const listener of this.listeners) listener(this.simulation.snapshot()); }
  disconnect(): void { clearInterval(this.timer); this.timer = undefined; this.listeners.clear(); }
}
