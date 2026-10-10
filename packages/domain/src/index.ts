import { combatAllowedAt, landmarksOnMap, legacyTownPositionAllowed, items, monsters, rules, npcs, questRules, explorationRules, landmarks, shopRules, sampleSpawns, type NpcId, type MonsterKind, type WorldMap } from '@eldoria/content';
import { commandSchema, nameSchema, type Command, type Direction } from '@eldoria/protocol';
import { addItems, countItem, removeItem, inventorySchema, type Stack } from './inventory';
export { addItems, countItem, removeItem, inventorySchema, type Stack } from './inventory';
import { saveSchema, type SaveData } from './save';
export { saveSchema, type SaveData } from './save';
export interface Loot extends Point { id: string; mapId: string; gold: number; items: Stack[] }
export interface Point { x: number; y: number }
export interface Creature extends Point {
  id: string; kind: MonsterKind; hp: number; spawn: Point;
  state: 'idle' | 'chase' | 'attack' | 'return' | 'dead';
  lastAttack: number; lastMove: number; diedAt: number;
}
export interface CombatEvent {
  id: number; mapId: string; kind: 'melee' | 'spell' | 'monster';
  sourceId: string; targetId: string | null; direction: Direction; from: Point; to: Point; damage: number;
}
export interface Snapshot {
  exploration: SaveData['exploration'];
  combatEvents: CombatEvent[];
  dialog: NpcId | null; quest: { status: 'available' | 'active' | 'ready' | 'claimed'; kills: number };
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
  private combatSequence = 0;
  private patrolDue = new Map<string, number>();
  private creatureMaps = new Map<string, Creature[]>();
  private lastMove = -Infinity;
  private lastAttack = -Infinity;
  private lastSpell = -Infinity;
  private lastPotion = -Infinity;
  private lastMana: number;
  private time: number;
  constructor(private maps: WorldMap[], name: string, private clock: Clock, private spawns?: Spawn[], initialInventory: Stack[] = [{ itemId: 'potion', quantity: 3 }]) {
    const map = maps[0];
    if (!map?.spawns.entry) throw new Error('Brak mapy startowej');
    this.time = clock.now(); this.lastMana = this.time;
    this.state = { exploration: {status:'available',found:[]}, combatEvents: [], dialog: null, quest: { status: 'available', kills: 0 }, name: nameSchema.parse(name), mapId: map.id, player: { ...map.spawns.entry }, direction: 'down', hp: rules.maxHp, mana: rules.maxMana, maxHp: rules.maxHp, maxMana: rules.maxMana, level: 1, potions: countItem(initialInventory, 'potion'), inventory: inventorySchema.parse(initialInventory), equipment: { weapon: 'sword', armor: 'tunic' }, loot: [], exp: 0, gold: 0, kills: 0, defeatedKinds: [], selectedId: null, creatures: [], message: ['vareon','eldoria'].includes(map.id) ? 'Witaj w Vareon. Mira stoi obok — wybierz Rozmowa (F).' : map.combatAllowed ? 'Próba Wędrowca: szczur, żuk i wilk. Przytrzymaj Miecz i zbierz łup.' : 'Dziedziniec jest bezpieczny. Idź w górę do świecącej bramy i wybierz Przejdź.', eventId: 0, complete: false };
    this.spawnCreatures();
  }
  private map(): WorldMap { return this.maps.find(m => m.id === this.state.mapId)!; }
  private notify(message: string): void { this.state.message = message; this.state.eventId++; }
  private combat(kind: CombatEvent['kind'], sourceId: string, targetId: string | null, from: Point, to: Point, damage: number): void {
    this.state.combatEvents.push({ id: ++this.combatSequence, mapId: this.state.mapId, kind, sourceId, targetId, direction: this.state.direction, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, damage });
    this.state.combatEvents = this.state.combatEvents.slice(-16);
  }
  private walkable(point: Point): boolean {
    const m = this.map();
    return point.x >= 0 && point.y >= 0 && point.x < m.width && point.y < m.height && m.collision[point.y * m.width + point.x] === 0;
  }
  private occupied(point: Point, except?: string): boolean {
    return this.map().npcs.some(n => distance(n, point) === 0) || this.state.creatures.some(c => c.id !== except && c.hp > 0 && distance(c, point) === 0);
  }
  private spawnCreatures(): void {
    const cached = this.creatureMaps.get(this.state.mapId);
    if (cached) { this.state.creatures = cached; return; }
    this.state.creatures = (this.map().combatAllowed ? this.spawns ?? (this.map().monsterSpawns.length ? this.map().monsterSpawns : sampleSpawns) : []).map(s => {
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
    if (command.type === 'CloseDialog') { s.dialog = null; return; }
    if (s.dialog && ['Move', 'Attack', 'Cast', 'Select', 'UseItem', 'Loot', 'Interact', 'Equip', 'Unequip'].includes(command.type)) return;
    if (['Heal', 'AcceptQuest', 'ClaimReward', 'Buy', 'Sell'].includes(command.type)) {
      const npc = this.map().npcs.find(n => n.id === s.dialog && distance(n, s.player) <= 1);
      if (!npc) { this.notify('Podejdź do NPC i rozpocznij rozmowę.'); return; }
      if (command.type === 'Heal' && npc.id === 'oren') {
        s.hp = s.maxHp; s.mana = s.maxMana; this.notify('Oren przywrócił zdrowie i manę.');
      } else if ((command.type === 'AcceptQuest' || command.type === 'ClaimReward') && command.questId === 'exploration' && npc.id === 'mira') {
        const q = s.exploration;
        if (command.type === 'AcceptQuest' && q.status === 'available') {
          q.status = 'active'; this.notify('Przyjęto zadanie: Ślady dawnego szlaku. Zbadaj trzy oznaczone miejsca w lesie (F).');
        } else if (command.type === 'ClaimReward' && q.status === 'ready') {
          const inventory = addItems(s.inventory, [{itemId:'potion',quantity:explorationRules.potions}]);
          if (!inventory) { this.notify('Pełny plecak — nagroda za odkrycia czeka u Miry.'); return; }
          s.inventory = inventory; s.potions = countItem(inventory,'potion'); s.gold += explorationRules.gold;
          this.gainExp(explorationRules.exp); q.status = 'claimed';
          this.notify('Mira: Szlak znów żyje w naszej pamięci. Otrzymujesz 75 EXP, 25 złota i 2 mikstury.');
        } else this.notify('Ta opcja nie jest teraz dostępna.');
      } else if (command.type === 'AcceptQuest' && npc.id === 'mira' && s.quest.status === 'available') {
        s.quest = { status: 'active', kills: 0 }; this.notify('Przyjęto zadanie: Niepokój za bramą. Pokonaj 5 stworzeń w lesie.');
      } else if (command.type === 'ClaimReward' && npc.id === 'mira' && s.quest.status === 'ready') {
        const inventory = addItems(s.inventory, [{ itemId: 'potion', quantity: questRules.potions }]);
        if (!inventory) { this.notify('Pełny plecak — nagroda czeka u Miry. Zwolnij miejsce.'); return; }
        s.inventory = inventory; s.potions = countItem(inventory, 'potion'); s.gold += questRules.gold;
        this.gainExp(questRules.exp); s.quest.status = 'claimed'; this.notify('Mira: Dziękuję! Otrzymujesz 50 EXP, 20 złota i 2 mikstury.');
      } else if (command.type === 'Buy' && npc.id === 'borin') {
        const price = command.quantity * shopRules.potionPrice;
        if (s.gold < price) { this.notify('Za mało złota.'); return; }
        const inventory = addItems(s.inventory, [{ itemId: 'potion', quantity: command.quantity }]);
        if (!inventory) { this.notify('Pełny plecak — zakup anulowany.'); return; }
        s.inventory = inventory; s.gold -= price; s.potions = countItem(inventory, 'potion'); this.notify('Kupiono mikstury.');
      } else if (command.type === 'Sell' && npc.id === 'borin') {
        const inventory = removeItem(s.inventory, command.itemId, command.quantity);
        if (!inventory) { this.notify('Nie masz tylu materiałów.'); return; }
        s.inventory = inventory; s.gold += command.quantity * shopRules.materialPrice; this.notify('Sprzedano materiały.');
      } else this.notify('Ta opcja nie jest teraz dostępna.');
      return;
    }
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
      const npc = this.map().npcs.find(n => (!command.npcId || n.id === command.npcId) && distance(n, s.player) <= 1);
      if (npc) { s.dialog = npc.id; this.notify(`${npcs[npc.id].name}: ${npcs[npc.id].role}`); return; }
      if (command.npcId) { this.notify('Podejdź obok NPC, aby porozmawiać.'); return; }
      const landmark = landmarks.find(l => landmarksOnMap(s.mapId,l.mapId) && distance(l,s.player) <= 1);
      if (landmark) {
        const q = s.exploration;
        if (q.status === 'active' && !q.found.includes(landmark.id)) {
          q.found.push(landmark.id);
          if (q.found.length === landmarks.length) q.status = 'ready';
        }
        this.notify(`${landmark.name} — opis w kronice (Plecak). ${q.status === 'available' ? 'Mira ma zadanie związane z tym szlakiem.' : q.status === 'ready' ? 'Odkrycia 3/3 — wróć do Miry po nagrodę.' : q.status === 'claimed' ? 'Odkrycie zapisane w kronice.' : `Odkrycia ${q.found.length}/3.`}`);
        return;
      }
      const portal = this.map().portals.find(p => distance(p, s.player) <= 1);
      if (!portal) { this.notify(s.mapId==='eldoria' ? 'Podejdź obok NPC lub odkrycia. Przez bramę przechodzisz pieszo.' : 'Podejdź do świecącej bramy i wybierz Przejdź.'); return; }
      const target = this.maps.find(m => m.id === portal.targetMapId);
      const spawn = target?.spawns[portal.targetSpawnId];
      if (!target || !spawn) { this.notify('Brama nie ma poprawnego celu.'); return; }
      const arrival = this.freeArrival(target, spawn);
      if (!arrival) { this.notify('Wejście jest zajęte — spróbuj ponownie.'); return; }
      s.mapId = target.id; s.player = arrival; s.selectedId = null;
      this.spawnCreatures(); this.lastMove = now;
      this.notify(target.id === 'forest' ? 'Mroczny Las. Przytrzymaj Miecz przy przeciwniku; cel jest opcjonalny.' : target.id === 'vareon' ? 'Vareon. Wróć do Miry, odpocznij u Orena lub odwiedź Borina.' : 'Przejście do drugiej sceny wzorcowej.'); return;
    }
    if (command.type === 'UseItem') {
      if (s.hp >= s.maxHp) { this.notify('Masz pełne zdrowie — mikstura pozostaje w plecaku.'); return; }
      if (s.potions <= 0) { this.notify('Brak mikstur.'); return; }
      if (now - this.lastPotion < rules.potionMs) { this.notify('Mikstura odnawia się przez 3 sekundy.'); return; }
      s.inventory = removeItem(s.inventory, 'potion', 1)!; s.potions = countItem(s.inventory, 'potion'); s.hp = Math.min(s.maxHp, s.hp + rules.potionHeal); this.lastPotion = now;
      this.notify('Odzyskano zdrowie.'); return;
    }
    if (!combatAllowedAt(this.map(),s.player)) { this.notify('Strefa bezpieczna — tutaj nie ma walki.'); return; }
    const casting = command.type === 'Cast';
    if (!casting && !s.equipment.weapon) { this.notify('Załóż miecz w plecaku.'); return; }
    const range = casting ? rules.spellRange : rules.meleeRange;
    const eligible = (c: Creature) => c.hp > 0 && combatAllowedAt(this.map(),c) && distance(c,s.player) <= range && this.lineOfSight(s.player,c);
    const selected = s.creatures.find(c => c.id === s.selectedId && c.hp > 0);
    // A reachable manual choice takes priority; otherwise choose the nearest visible enemy.
    const target = selected && eligible(selected) ? selected : s.creatures.filter(eligible).sort((a,b)=>distance(a,s.player)-distance(b,s.player)||a.id.localeCompare(b.id))[0];
    if (now - (casting ? this.lastSpell : this.lastAttack) < (casting ? rules.spellMs : rules.attackMs)) return;
    if (casting && s.mana < rules.spellCost) { this.notify('Za mało many.'); return; }
    if (casting) { s.mana -= rules.spellCost; this.lastSpell = now; } else this.lastAttack = now;
    if (!target) {
      const v = vectors[s.direction], to = {...s.player};
      for(let i=0;i<range;i++) {
        const next={x:to.x+v.x,y:to.y+v.y};
        if(!this.walkable(next)||!combatAllowedAt(this.map(),next))break;
        Object.assign(to,next);
      }
      this.combat(casting ? 'spell' : 'melee','player',null,s.player,to,0);
      this.notify(casting ? `Iskra w kierunku patrzenia (${rules.spellCost} many).` : 'Zamach mieczem. Podejdź do przeciwnika; cel wybierze się automatycznie.');
      return;
    }
    const damage = Math.max(1, (casting ? rules.spellDamage : rules.attackDamage) - monsters[target.kind].defense);
    const dx = target.x-s.player.x, dy = target.y-s.player.y;
    s.direction = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
    target.hp = Math.max(0, target.hp - damage); target.state = 'chase';
    this.combat(casting ? 'spell' : 'melee', 'player', target.id, s.player, target, damage);
    this.notify(`${casting ? 'Iskra' : 'Miecz'}: ${damage} obrażeń.`);
    if (target.hp === 0) {
      target.state = 'dead'; target.diedAt = now; s.selectedId = null;
      this.gainExp(monsters[target.kind].exp); s.kills++;
      if (['forest','eldoria'].includes(s.mapId) && s.quest.status === 'active') {
        s.quest.kills = Math.min(questRules.kills, s.quest.kills + 1);
        if (s.quest.kills === questRules.kills) s.quest.status = 'ready';
      }
      s.loot.push({ id: `${s.mapId}:${target.id}:${s.eventId}`, mapId: s.mapId, x: target.x, y: target.y, gold: monsters[target.kind].gold, items: target.kind === 'rat' ? [] : [{ itemId: target.kind === 'wolf' ? 'skin' : 'chitin', quantity: 1 }] });
      if (!s.defeatedKinds.includes(target.kind)) s.defeatedKinds.push(target.kind);
      s.complete = s.mapId === 'grove' && s.defeatedKinds.length === 3;
      this.notify(s.complete ? 'Próba ukończona! Pokonano 3 stworzenia. Wróć do menu, aby rozpocząć nową próbę.' : ['forest','eldoria'].includes(s.mapId) ? `Pokonano ${monsters[target.kind].name.toLowerCase()}. ${s.quest.status === 'ready' ? 'Wróć do Miry po nagrodę.' : s.quest.status === 'active' ? `Zadanie: ${s.quest.kills}/5.` : 'Przyjmij zadanie u Miry.'}` : `Pokonano ${monsters[target.kind].name.toLowerCase()}. Próba: ${s.defeatedKinds.length}/3.`);
    }
  }
  private freeArrival(map: WorldMap, spawn: Point): Point | undefined {
    const actors = this.creatureMaps.get(map.id)?.filter(c => c.hp > 0) ?? map.monsterSpawns;
    const queue = [{ ...spawn }], seen = new Set<string>();
    for (let budget = 0; queue.length && budget < 512; budget++) {
      const p = queue.shift()!, key = `${p.x},${p.y}`;
      if (seen.has(key) || p.x < 0 || p.y < 0 || p.x >= map.width || p.y >= map.height || map.collision[p.y*map.width+p.x] !== 0) continue;
      seen.add(key);
      if (![...map.npcs,...actors].some(a => distance(a,p) === 0)) return p;
      for (const v of Object.values(vectors)) queue.push({x:p.x+v.x,y:p.y+v.y});
    }
    return undefined;
  }
  exportSave(): SaveData {
    const s = this.state, now = this.time;
    const remaining = (last: number, period: number) => Math.max(0, Math.ceil(period - (now-last)));
    return saveSchema.parse({
      version: 1, cityRevision: (this.maps.find(m=>m.id==='eldoria')??this.maps.find(m=>m.id==='vareon'))?.layoutRevision ?? 1, mode: 'offline', name: s.name, mapId: s.mapId, player: s.player, direction: s.direction,
      level: s.level, hp: s.hp, mana: s.mana, exp: s.exp, gold: s.gold, kills: s.kills, quest: s.quest, exploration: s.exploration, inventory: s.inventory, equipment: s.equipment,
      cooldowns: { move: remaining(this.lastMove,rules.stepMs), attack: remaining(this.lastAttack,rules.attackMs), spell: remaining(this.lastSpell,rules.spellMs), potion: remaining(this.lastPotion,rules.potionMs), mana: remaining(this.lastMana,rules.manaRegenMs) },
      maps: [...this.creatureMaps].map(([mapId, creatures]) => ({ mapId, creatures: creatures.map(c => ({ id:c.id, kind:c.kind, x:c.x, y:c.y, hp:c.hp, state:c.state, attackIn:remaining(c.lastAttack,rules.monsterAttackMs), moveIn:remaining(c.lastMove,rules.stepMs*2), respawnIn: c.hp === 0 ? remaining(c.diedAt,rules.respawnMs) : 0 })) })),
      loot: s.loot, eventId: s.eventId,
    });
  }
  static restore(maps: WorldMap[], input: unknown, clock: Clock): Simulation {
    let data = saveSchema.parse(input);
    const world=maps.find(m=>m.id==='eldoria');
    if(world && data.mapId!=='eldoria'){
      const legacy=Simulation.restore(maps.filter(m=>m.id==='vareon'||m.id==='forest'),data,clock).exportSave();
      const initial=new Simulation([world],data.name,clock).exportSave();
      const town=world.regions.find(r=>r.id==='vareon');
      if(!town)throw new Error('Brak regionu miasta do migracji');
      const offset=(p:Point,mapId:string)=>mapId==='vareon'?{x:p.x+town.x,y:p.y+town.y}:{x:p.x,y:p.y};
      data={...legacy,mapId:'eldoria',player:offset(legacy.player,legacy.mapId),maps:[{mapId:'eldoria',creatures:legacy.maps.find(m=>m.mapId==='forest')?.creatures??initial.maps[0]!.creatures}],loot:legacy.loot.map(l=>({...l,...offset(l,l.mapId),mapId:'eldoria'}))};
    }
    if(world && (data.maps.length!==1||data.maps[0]?.mapId!=='eldoria'||data.loot.some(l=>l.mapId!=='eldoria')))throw new Error('Nieprawidłowe regiony zapisu świata');
    if (new Set(data.maps.map(m => m.mapId)).size !== data.maps.length || !data.maps.some(m => m.mapId === data.mapId)) throw new Error('Nieprawidłowe mapy zapisu');
    const sim = new Simulation(maps, data.name, clock);
    const now = sim.time;
    const walkable = (mapId: string, p: Point) => {
      const map = maps.find(m => m.id === mapId);
      return map && p.x < map.width && p.y < map.height && map.collision[p.y*map.width+p.x] === 0 && !map.npcs.some(n => distance(n,p) === 0);
    };
    let relocated = false;
    const revision = (maps.find(m=>m.id==='eldoria')??maps.find(m=>m.id==='vareon'))?.layoutRevision ?? 1;
    if (data.cityRevision > revision) throw new Error('Zapis wymaga nowszej mapy miasta');
    if (!walkable(data.mapId,data.player)) {
      if (data.mapId==='vareon' && data.cityRevision < revision && legacyTownPositionAllowed(data.player)) {
        data.player = {...maps.find(m=>m.id==='vareon')!.spawns.entry!}; relocated = true;
      } else throw new Error('Pozycja zapisu w ścianie');
    }
    sim.creatureMaps.clear();
    for (const saved of data.maps) {
      const map = maps.find(m => m.id === saved.mapId);
      if (!map || saved.creatures.length !== map.monsterSpawns.length || new Set(saved.creatures.map(c => c.id)).size !== saved.creatures.length) throw new Error('Nieprawidłowe stworzenia zapisu');
      const occupied = new Set<string>();
      const creatures: Creature[] = saved.creatures.map(c => {
        const spawn = map.monsterSpawns.find(p => p.id === c.id && p.kind === c.kind);
        const key = `${c.x},${c.y}`;
        if (!spawn || !walkable(map.id,c) || !combatAllowedAt(map,c) || c.hp > monsters[c.kind].hp || (c.hp === 0) !== (c.state === 'dead') || c.hp > 0 && (occupied.has(key) || map.id === data.mapId && distance(c,data.player) === 0)) throw new Error('Nieprawidłowy stan stworzenia');
        if (c.hp > 0) occupied.add(key);
        return { id:c.id, kind:c.kind, x:c.x, y:c.y, hp:c.hp, state:c.state, spawn:{x:spawn.x,y:spawn.y}, lastAttack:now+c.attackIn-rules.monsterAttackMs, lastMove:now+c.moveIn-rules.stepMs*2, diedAt:now+c.respawnIn-rules.respawnMs };
      });
      sim.creatureMaps.set(map.id,creatures);
    }
    if (new Set(data.loot.map(l => l.id)).size !== data.loot.length || data.loot.some(l => !walkable(l.mapId,l))) throw new Error('Nieprawidłowy łup');
    sim.state = { ...sim.state, name:data.name, mapId:data.mapId, player:data.player, direction:data.direction, level:data.level, hp:data.hp, mana:data.mana, maxHp:rules.maxHp+(data.level-1)*10, maxMana:rules.maxMana+(data.level-1)*5, exp:data.exp, gold:data.gold, kills:data.kills, quest:data.quest, exploration:data.exploration, inventory:data.inventory, potions:countItem(data.inventory,'potion'), equipment:data.equipment, loot:data.loot, eventId:data.eventId, selectedId:null, dialog:null, complete:false, creatures:sim.creatureMaps.get(data.mapId)!, message:relocated ? 'Vareon przebudowano — wznowiono przy wartowni. Postęp i wyposażenie zachowano.' : 'Wznowiono przygodę offline.' };
    sim.lastMove = now+data.cooldowns.move-rules.stepMs;
    sim.lastAttack = now+data.cooldowns.attack-rules.attackMs;
    sim.lastSpell = now+data.cooldowns.spell-rules.spellMs;
    sim.lastPotion = now+data.cooldowns.potion-rules.potionMs;
    sim.lastMana = now+data.cooldowns.mana-rules.manaRegenMs;
    return sim;
  }
  private gainExp(amount: number): void {
    const s = this.state; s.exp += amount;
    while (s.exp >= 100 * s.level) {
      s.exp -= 100 * s.level; s.level++; s.maxHp += 10; s.maxMana += 5; s.hp = s.maxHp; s.mana = s.maxMana;
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
        if (closed.has(nextKey) || !this.walkable(next) || !combatAllowedAt(this.map(),next) || this.occupied(next, creature.id) || distance(next, this.state.player) === 0 || nextCost >= (cost.get(nextKey) ?? Infinity)) continue;
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
      if(!combatAllowedAt(this.map(),s.player) && (c.state==='chase'||c.state==='attack'))c.state='return';
      if (combatAllowedAt(this.map(),s.player) && monsters[c.kind].aggressive && distance(c, s.player) <= rules.sightRadius && this.lineOfSight(c,s.player) && c.state === 'idle') c.state = 'chase';
      if ((c.state === 'chase' || c.state === 'attack') && distance(c, c.spawn) > rules.leashRadius) c.state = 'return';
      if (c.state === 'return' && distance(c, c.spawn) === 0) { c.hp = monsters[c.kind].hp; c.state = 'idle'; }
      if (c.state === 'chase' || c.state === 'attack') {
        if (distance(c, s.player) <= 1) {
          c.state = 'attack';
          if (now - c.lastAttack >= rules.monsterAttackMs) {
            const damage = Math.max(1, monsters[c.kind].damage - (s.equipment.armor ? rules.playerDefense : 2));
            s.hp = Math.max(0, s.hp - damage); c.lastAttack = now;
            this.combat('monster', c.id, 'player', c, s.player, damage);
            if (s.hp === 0) { this.die(); return; }
          }
        } else c.state = 'chase';
      }
      if (['forest','eldoria'].includes(this.map().id) && c.state === 'idle' && distance(c, s.player) > rules.sightRadius) {
        const key = `${s.mapId}:${c.id}`, due = this.patrolDue.get(key);
        if (due === undefined) this.patrolDue.set(key, now + rules.patrolMs);
        else if (now >= due) {
          this.patrolDue.set(key, now + rules.patrolMs);
          const hash = [...c.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
          const directions = Object.values(vectors);
          for (let i = 0; i < 4; i++) {
            const v = directions[(Math.floor(now / rules.patrolMs) + hash + i) % 4]!;
            const next = { x: c.x + v.x, y: c.y + v.y };
            if (distance(next, c.spawn) > rules.patrolRadius || distance(next, s.player) <= rules.sightRadius || !this.walkable(next) || !combatAllowedAt(this.map(),next) || this.occupied(next, c.id) || this.map().portals.some(p => distance(p, next) <= 1)) continue;
            Object.assign(c, next); c.lastMove = now; break;
          }
        }
      }
      if ((c.state === 'chase' || c.state === 'return') && now - c.lastMove >= rules.stepMs * 2) {
        const next = this.nextStep(c, c.state === 'return' ? c.spawn : s.player);
        if (next) Object.assign(c, next);
        c.lastMove = now;
      }
    }
  }
  private die(): void {
    const m = this.maps.find(m => m.id==='eldoria') ?? this.maps.find(m => !m.combatAllowed) ?? this.maps[0]!;
    this.state.mapId = m.id; this.state.player = { ...m.spawns.entry! };
    this.state.hp = this.state.maxHp; this.state.mana = this.state.maxMana; this.state.selectedId = null; this.state.dialog = null;
    this.spawnCreatures(); this.lastMove = this.time;
    this.notify(`Omdlenie. Wracasz do ${['vareon','eldoria'].includes(m.id) ? 'Vareon' : 'bezpiecznego dziedzińca'} z pełnym zdrowiem i maną, bez utraty zdobyczy.`);
  }
}
export class LocalGateway implements GameGateway {
  private listeners = new Set<(snapshot: Snapshot) => void>();
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(private simulation: Simulation) {}
  exportSave(): SaveData { return this.simulation.exportSave(); }
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
