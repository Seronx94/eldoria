import { combatRules,skillRequired,skillPower,inventoryRules,depotOnMap,depotRules,combatAllowedAt, landmarksOnMap, legacyTownPositionAllowed, items,onlineRules, monsters, rules, npcs, questRules, explorationRules, landmarks, shopRules, sampleSpawns,professions,spells,professionRules,defaultActions,actionAllowed,emptySpellCooldowns,type CombatVisual, type NpcId, type MonsterKind, type WorldMap } from '@eldoria/content';
import { commandSchema,defaultSkills,type Skills, nameSchema,defaultLootSettings,type LootSettings,defaultAppearance,type Appearance,professionSchema, type Command, type Direction,type Profession,type SpellId,type ActionId,type Weapon } from '@eldoria/protocol';
import { addItems, countItem, removeItem, inventorySchema, type Stack } from './inventory';
export { addItems, countItem, removeItem, inventorySchema, type Stack } from './inventory';
import { saveSchema, type SaveData } from './save';
export { saveSchema, type SaveData } from './save';
import {characterProgressSchema,type CharacterProgress} from './character-progress';
export {characterProgressSchema,type CharacterProgress} from './character-progress';
export interface Loot extends Point { id: string; mapId: string; gold: number; items: Stack[] }
export interface Point { x: number; y: number }
export interface Creature extends Point {
  id: string; kind: MonsterKind; hp: number; spawn: Point;
  state: 'idle' | 'chase' | 'attack' | 'return' | 'dead';
  lastAttack: number; lastMove: number; diedAt: number;
}
export interface CombatEvent {
  id: number; mapId: string; kind: 'melee' | 'ranged' | 'spell' | 'monster';
  effect:CombatVisual;abilityId:SpellId|'attack'|null;radius:number;healing:number;
  hits:{targetId:string;to:Point;damage:number}[];
  sourceId: string; targetId: string | null; direction: Direction; from: Point; to: Point; damage: number;
}
export interface Snapshot {
  skills:Skills;combatMs:number;
  appearance:Appearance;profession:Profession;actionSlots:[ActionId,ActionId,ActionId,ActionId];
  stash:Stack[];lootSettings:LootSettings;depotOpen:boolean;
  attackCooldown:number;spellCooldowns:Record<SpellId,number>;guardMs:number;
  exploration: SaveData['exploration'];
  combatEvents: CombatEvent[];
  dialog: NpcId | null; quest: { status: 'available' | 'active' | 'ready' | 'claimed'; kills: number };
  name: string; mapId: string; player: Point; direction: Direction;
  hp: number; mana: number; maxHp: number; maxMana: number; level: number; potions: number; exp: number; gold: number;
  kills: number; defeatedKinds: MonsterKind[]; selectedId: string | null; creatures: Creature[];
  inventory: Stack[]; equipment: { weapon: Weapon | null; armor: 'tunic' | null }; loot: Loot[];
  message: string; eventId: number; complete: boolean;
}
export interface PublicPlayer {
  id:string;name:string;profession:Profession;appearance:Appearance;mapId:string;player:Point;direction:Direction;hp:number;maxHp:number;level:number;
}
export interface OnlineSnapshot extends Snapshot {selfId:string;players:PublicPlayer[];}
interface SharedState {
  players:Map<string,Simulation>;creatures:Map<string,Creature[]>;loot:Loot[];events:CombatEvent[];sequence:number;lootSequence:number;patrol:Map<string,number>;
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
  private combatUntil=0;
  private patrolDue = new Map<string, number>();
  private creatureMaps = new Map<string, Creature[]>();
  private lastMove = -Infinity;
  private lastAttack = -Infinity;
  private lastSpell = -Infinity;
  private lastSpells=new Map<SpellId,number>();
  private guardUntil=0;
  private lastPotion = -Infinity;
  private lastMana: number;
  private time: number;
  constructor(private maps: WorldMap[], name: string, private clock: Clock, private spawns?: Spawn[], initialInventory: Stack[] = [{ itemId: 'potion', quantity: 3 }], profession:Profession='knight',private online?:{id:string;world:SharedState}) {
    const map = maps[0];
    if (!map?.spawns.entry) throw new Error('Brak mapy startowej');
    this.time = clock.now(); this.lastMana = this.time;
    profession=professionSchema.parse(profession);
    this.state = {skills:defaultSkills(),combatMs:0, stash:[],lootSettings:defaultLootSettings(),depotOpen:false,appearance:defaultAppearance(),profession:'knight',actionSlots:defaultActions('knight'),attackCooldown:0,spellCooldowns:emptySpellCooldowns(),guardMs:0,exploration: {status:'available',found:[]}, combatEvents: [], dialog: null, quest: { status: 'available', kills: 0 }, name: nameSchema.parse(name), mapId: map.id, player: { ...map.spawns.entry }, direction: 'down', hp: rules.maxHp, mana: rules.maxMana, maxHp: rules.maxHp, maxMana: rules.maxMana, level: 1, potions: countItem(initialInventory, 'potion'), inventory: inventorySchema.parse(initialInventory), equipment: { weapon: 'sword', armor: 'tunic' }, loot: [], exp: 0, gold: 0, kills: 0, defeatedKinds: [], selectedId: null, creatures: [], message: ['vareon','eldoria'].includes(map.id) ? 'Witaj w Vareon. Mira stoi obok — wybierz Rozmowa (F).' : map.combatAllowed ? 'Próba Wędrowca: szczur, żuk i wilk. Przytrzymaj atak podstawowy i zbierz łup.' : 'Dziedziniec jest bezpieczny. Idź w górę do świecącej bramy i wybierz Przejdź.', eventId: 0, complete: false };
    this.state.profession=profession;this.state.actionSlots=defaultActions(profession);this.state.equipment.weapon=professions[profession].weapon;
    if(online){this.creatureMaps=online.world.creatures;this.patrolDue=online.world.patrol;}
    this.spawnCreatures();
    if(online)this.state.player=this.freeArrival(map,map.spawns.entry)??(()=>{throw new Error('Brak miejsca na start');})();
  }
  private syncShared():void {
    if(!this.online)return;
    this.state.loot=this.online.world.loot;this.state.combatEvents=this.online.world.events;
  }
  private map(): WorldMap { return this.maps.find(m => m.id === this.state.mapId)!; }
  private notify(message: string): void { this.state.message = message; this.state.eventId++; }
  private combat(kind: CombatEvent['kind'], sourceId: string, targetId: string | null, from: Point, to: Point, damage: number,extra:Partial<Pick<CombatEvent,'effect'|'abilityId'|'hits'|'radius'|'healing'>>={}): void {
    if(damage>0)this.combatUntil=this.time+combatRules.logoutLockMs;
    const id=this.online?++this.online.world.sequence:++this.combatSequence;
    const actorId=this.online?.id??'player';
    this.syncShared();
    this.state.combatEvents.push({ id, mapId: this.state.mapId, kind, sourceId, targetId, direction: this.state.direction, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, damage,effect:kind==='monster'?'claw':'sword',abilityId:sourceId==='player'?'attack':null,radius:0,healing:0,hits:targetId&&damage>0?[{targetId:targetId==='player'?actorId:targetId,to:{x:to.x,y:to.y},damage}]:[],...extra });
    const event=this.state.combatEvents.at(-1)!;if(this.online){if(event.sourceId==='player')event.sourceId=actorId;if(event.targetId==='player')event.targetId=actorId;}
    this.state.combatEvents = this.state.combatEvents.slice(this.online?-64:-16);
    if(this.online)this.online.world.events=this.state.combatEvents;
  }
  private walkable(point: Point): boolean {
    const m = this.map();
    return point.x >= 0 && point.y >= 0 && point.x < m.width && point.y < m.height && m.collision[point.y * m.width + point.x] === 0;
  }
  private occupied(point: Point, except?: string): boolean {
    return [...(this.online?.world.players.values()??[])].some(p=>p!==this&&p.state.mapId===this.state.mapId&&distance(p.state.player,point)===0)||this.map().npcs.some(n => distance(n, point) === 0) || this.state.creatures.some(c => c.id !== except && c.hp > 0 && distance(c, point) === 0);
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
  private remaining(last:number,period:number):number {return Math.max(0,Math.ceil(period-(this.time-last)));}
  private spellCooldowns():Record<SpellId,number> {
    const result=emptySpellCooldowns();for(const id of Object.keys(spells) as SpellId[])result[id]=this.remaining(this.lastSpells.get(id)??-Infinity,spells[id].cooldown);return result;
  }
  snapshot(): Snapshot { this.syncShared();return {...structuredClone(this.state),combatMs:Math.min(combatRules.logoutLockMs,Math.max(0,Math.ceil(this.combatUntil-this.time))),attackCooldown:this.remaining(this.lastAttack,professions[this.state.profession].attackMs),spellCooldowns:this.spellCooldowns(),guardMs:Math.min(professionRules.guardMs,Math.max(0,this.guardUntil-this.time))}; }
  send(input: unknown): void {
    const parsed = commandSchema.safeParse(input);
    if (!parsed.success) { this.notify('Nieprawidłowa komenda.'); return; }
    this.tick();
    this.command(parsed.data);
    if(this.online)this.online.world.loot=this.state.loot;
  }
  private command(command: Command): void {
    const now = this.time;
    const s = this.state;
    if(command.type==='SetLootSettings'){s.lootSettings=command.settings;this.collectNearby();this.notify('Zmieniono automatyczne zbieranie.');return;}
    if(command.type==='ClearTarget'){s.selectedId=null;return;}
    if(command.type==='CloseDepot'){s.depotOpen=false;return;}
    if(command.type==='OpenDepot'){
      if(s.dialog||!this.nearDepot()){this.notify('Podejdź do skrzynki depo w gospodzie.');return;}
      s.depotOpen=true;this.notify('Depo: przenoś przedmioty pomiędzy plecakiem i stashem.');return;
    }
    if(command.type==='StashTransfer'){
      if(!s.depotOpen||s.dialog||!this.nearDepot()){this.notify('Otwórz depo przy skrzynce.');return;}
      const depositing=command.direction==='deposit',source=depositing?s.inventory:s.stash,destination=depositing?s.stash:s.inventory;
      const remainder=removeItem(source,command.itemId,command.quantity,depositing?inventoryRules.slots:depotRules.slots);
      if(!remainder){this.notify('Nie masz tylu przedmiotów.');return;}
      const added=addItems(destination,[{itemId:command.itemId,quantity:command.quantity}],depositing?depotRules.slots:inventoryRules.slots);
      if(!added){this.notify(depositing?'Stash jest pełny.':'Plecak jest pełny.');return;}
      s.inventory=depositing?remainder:added;s.stash=depositing?added:remainder;s.potions=countItem(s.inventory,'potion');
      this.notify(depositing?'Odłożono do stashu.':'Pobrano ze stashu.');return;
    }
    if(s.depotOpen&&['Move','Attack','Cast','Select','UseItem','Loot','Interact','Equip','Unequip'].includes(command.type))return;
    if(command.type==='SetAppearance'){s.appearance={...command.appearance};this.notify('Zmieniono kolory postaci.');return;}
    if(command.type==='SetActionSlot'){
      if(!actionAllowed(s.profession,command.actionId)){this.notify('Ta umiejętność należy do innej profesji.');return;}
      s.actionSlots[command.slot]=command.actionId;this.notify('Zmieniono pasek akcji.');return;
    }
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
        if(s.gold+command.quantity*shopRules.materialPrice>depotRules.maxGold){this.notify('Limit złota — sprzedaż anulowana.');return;}
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
      if(s.gold+loot.gold>depotRules.maxGold){this.notify('Limit złota — łup pozostaje na ziemi.');return;}
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
      if(command.itemId!=='tunic'&&command.itemId!==professions[s.profession].weapon){this.notify('To broń innej profesji.');return;}
      const slot = items[command.itemId].slot;
      const without = removeItem(s.inventory, command.itemId, 1);
      if (!without) { this.notify('Nie masz tego przedmiotu w plecaku.'); return; }
      const previous = s.equipment[slot];
      const inventory = previous ? addItems(without, [{ itemId: previous, quantity: 1 }]) : without;
      if (!inventory) { this.notify('Brak miejsca na poprzednie wyposażenie.'); return; }
      s.inventory = inventory;
      if (command.itemId!=='tunic') s.equipment.weapon = command.itemId; else s.equipment.armor = 'tunic';
      this.notify('Założono wyposażenie.'); return;
    }
    if (command.type === 'Move') {
      if (now - this.lastMove < rules.stepMs) return;
      s.direction = command.direction;
      const v = vectors[command.direction];
      const next = { x: s.player.x + v.x, y: s.player.y + v.y };
      if (!this.walkable(next) || this.occupied(next)) { this.notify('Przejście zablokowane.'); return; }
      s.player = next; this.lastMove = now; this.collectNearby();return;
    }
    if (command.type === 'Interact') {
      if(!command.npcId&&this.nearDepot()){s.depotOpen=true;this.notify('Otwarto depo.');return;}
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
      this.notify(target.id === 'forest' ? 'Mroczny Las. Przytrzymaj atak podstawowy w zasięgu przeciwnika; cel jest opcjonalny.' : target.id === 'vareon' ? 'Vareon. Wróć do Miry, odpocznij u Orena lub odwiedź Borina.' : 'Przejście do drugiej sceny wzorcowej.'); return;
    }
    if (command.type === 'UseItem') {
      if (s.hp >= s.maxHp) { this.notify('Masz pełne zdrowie — mikstura pozostaje w plecaku.'); return; }
      if (s.potions <= 0) { this.notify('Brak mikstur.'); return; }
      if (now - this.lastPotion < rules.potionMs) { this.notify('Mikstura odnawia się przez 3 sekundy.'); return; }
      s.inventory = removeItem(s.inventory, 'potion', 1)!; s.potions = countItem(s.inventory, 'potion'); s.hp = Math.min(s.maxHp, s.hp + rules.potionHeal); this.lastPotion = now;
      this.notify('Odzyskano zdrowie.'); return;
    }
    if (!combatAllowedAt(this.map(),s.player)) { this.notify('Strefa bezpieczna — tutaj nie ma walki.'); return; }
    if(command.type!=='Attack'&&command.type!=='Cast')return;
    const profile=professions[s.profession],casting=command.type==='Cast';
    const spellId=casting?(command.spellId??profile.spells[0]!):undefined;
    const spell=spellId?spells[spellId]:undefined;
    if(spell&&spell.profession!==s.profession){this.notify('Ta umiejętność należy do innej profesji.');return;}
    if(spell&&s.level<spell.level){this.notify(`${spell.name}: wymagany poziom ${spell.level}.`);return;}
    if(!casting&&s.equipment.weapon!==profile.weapon){this.notify('Załóż broń swojej profesji w plecaku.');return;}
    if(now-(spellId?this.lastSpells.get(spellId)??-Infinity:this.lastAttack)<(spell?.cooldown??profile.attackMs))return;
    if(spell&&s.mana<spell.mana){this.notify('Za mało many.');return;}
    if(spell?.mode==='heal'&&s.hp===s.maxHp){this.notify('Masz pełne zdrowie — nie zużyto many.');return;}
    const locked=s.creatures.find(c=>c.id===s.selectedId&&c.hp>0);
    if(locked&&((!casting&&profile.range>1)||spell?.mode==='target'||spell?.mode==='area')){
      if(!combatAllowedAt(this.map(),locked)||distance(locked,s.player)>(spell?.range??profile.range)||!this.lineOfSight(s.player,locked)){this.notify('Wybrany cel poza zasięgiem albo za przeszkodą.');return;}
    }
    if(spellId&&spell){this.train('magic',spell.mana);s.mana-=spell.mana;this.lastSpells.set(spellId,now);if(spellId===profile.spells[0])this.lastSpell=now;}else this.lastAttack=now;
    const effect=spell?.effect??profile.effect;
    const kind=casting?'spell':profile.range===1?'melee':'ranged';
    if(spell?.mode==='guard'||spell?.mode==='heal'){
      const healing=spell.mode==='heal'?Math.min(professionRules.mendHp,s.maxHp-s.hp):0;
      s.hp+=healing;if(spell.mode==='guard')this.guardUntil=now+professionRules.guardMs;
      this.combat('spell','player',null,s.player,s.player,0,{effect,abilityId:spellId!,healing});
      this.notify(healing?`${spell.name}: +${healing} HP.`:`${spell.name}: osłona na 4 sekundy.`);return;
    }
    const range=spell?.range??profile.range;
    const eligible=(c:Creature)=>c.hp>0&&combatAllowedAt(this.map(),c)&&distance(c,s.player)<=range&&this.lineOfSight(s.player,c);
    const selected=s.creatures.find(c=>c.id===s.selectedId&&eligible(c));
    const target=selected??s.creatures.filter(eligible).sort((a,b)=>distance(a,s.player)-distance(b,s.player)||a.id.localeCompare(b.id))[0];
    let to={...s.player};
    if(spell?.mode!=='self-area'){
      if(target){to={x:target.x,y:target.y};const dx=to.x-s.player.x,dy=to.y-s.player.y;s.direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
      else for(let i=0;i<range;i++){const v=vectors[s.direction],next={x:to.x+v.x,y:to.y+v.y};if(!this.walkable(next)||!combatAllowedAt(this.map(),next))break;to=next;}
    }
    const targets=spell&&(spell.mode==='area'||spell.mode==='self-area')?s.creatures.filter(c=>c.hp>0&&combatAllowedAt(this.map(),c)&&distance(c,to)<=spell.radius&&distance(c,s.player)<=range+spell.radius&&this.lineOfSight(s.player,c)):(target?[target]:[]);
    const attackSkill=s.profession==='knight'?'melee':s.profession==='archer'?'distance':'magic';
    const hits=targets.map(c=>({targetId:c.id,to:{x:c.x,y:c.y},damage:this.hit(c,(spell?.damage??profile.damage)+skillPower(casting?'magic':attackSkill,s.skills[casting?'magic':attackSkill].level),now)}));
    if(!casting&&hits.length&&s.profession!=='mage')this.train(attackSkill,1);
    this.combat(kind,'player',spell?.mode==='area'?target?.id??null:hits[0]?.targetId??null,s.player,to,hits[0]?.damage??0,{effect,abilityId:spellId??'attack',radius:spell?.radius??0,hits});
    if(!hits.length)this.notify(casting?`${spell!.name} ${spell!.mode==='self-area'?'wokół postaci':'w kierunku patrzenia'} (${spell!.mana} many).`:`${profile.attackName}: atak bez trafienia. Podejdź w zasięg.`);
    else if(targets.every(c=>c.hp>0))this.notify(`${spell?.name??profile.attackName}: ${hits.reduce((n,h)=>n+h.damage,0)} obrażeń.`);
  }
  private train(kind:keyof Skills,amount:number):void {
    const skill=this.state.skills[kind];if(skill.level===100)return;skill.progress+=amount;
    while(skill.level<100&&skill.progress>=skillRequired(kind,skill.level,this.state.profession)){skill.progress-=skillRequired(kind,skill.level,this.state.profession);skill.level++;}
    if(skill.level===100)skill.progress=0;
  }
  private hit(target:Creature,power:number,now:number):number {
    const s=this.state,damage=Math.max(1,power-monsters[target.kind].defense);
    target.hp=Math.max(0,target.hp-damage);target.state='chase';
    if (target.hp === 0) {
      target.state = 'dead'; target.diedAt = now; s.selectedId = null;
      this.gainExp(monsters[target.kind].exp); s.kills++;
      if (['forest','eldoria'].includes(s.mapId) && s.quest.status === 'active') {
        s.quest.kills = Math.min(questRules.kills, s.quest.kills + 1);
        if (s.quest.kills === questRules.kills) s.quest.status = 'ready';
      }
      s.loot.push({ id: this.online?`world:${++this.online.world.lootSequence}`:`${s.mapId}:${target.id}:${s.eventId}`, mapId: s.mapId, x: target.x, y: target.y, gold: monsters[target.kind].gold, items: target.kind === 'rat' ? [] : [{ itemId: target.kind === 'wolf' ? 'skin' : 'chitin', quantity: 1 }] });
      if (!s.defeatedKinds.includes(target.kind)) s.defeatedKinds.push(target.kind);
      s.complete = s.mapId === 'grove' && s.defeatedKinds.length === 3;
      this.notify(s.complete ? 'Próba ukończona! Pokonano 3 stworzenia. Wróć do menu, aby rozpocząć nową próbę.' : ['forest','eldoria'].includes(s.mapId) ? `Pokonano ${monsters[target.kind].name.toLowerCase()}. ${s.quest.status === 'ready' ? 'Wróć do Miry po nagrodę.' : s.quest.status === 'active' ? `Zadanie: ${s.quest.kills}/5.` : 'Przyjmij zadanie u Miry.'}` : `Pokonano ${monsters[target.kind].name.toLowerCase()}. Próba: ${s.defeatedKinds.length}/3.`);
    }
    return damage;
  }
  private freeArrival(map: WorldMap, spawn: Point): Point | undefined {
    const actors = this.creatureMaps.get(map.id)?.filter(c => c.hp > 0) ?? map.monsterSpawns;
    const queue = [{ ...spawn }], seen = new Set<string>();
    for (let budget = 0; queue.length && budget < 512; budget++) {
      const p = queue.shift()!, key = `${p.x},${p.y}`;
      if (seen.has(key) || p.x < 0 || p.y < 0 || p.x >= map.width || p.y >= map.height || map.collision[p.y*map.width+p.x] !== 0) continue;
      seen.add(key);
      if (![...map.npcs,...actors].some(a => distance(a,p) === 0)&&![...(this.online?.world.players.values()??[])].some(a=>a!==this&&a.state.mapId===map.id&&distance(a.state.player,p)===0)) return p;
      for (const v of Object.values(vectors)) queue.push({x:p.x+v.x,y:p.y+v.y});
    }
    return undefined;
  }
  exportSave(): SaveData {
    const s = this.state, now = this.time;
    const remaining = (last: number, period: number) => Math.max(0, Math.ceil(period - (now-last)));
    return saveSchema.parse({
      version: 1, cityRevision: (this.maps.find(m=>m.id==='eldoria')??this.maps.find(m=>m.id==='vareon'))?.layoutRevision ?? 1, mode: 'offline',appearance:s.appearance, profession:s.profession,actionSlots:s.actionSlots,spellCooldowns:this.spellCooldowns(),guardIn:Math.min(professionRules.guardMs,Math.max(0,Math.ceil(this.guardUntil-now))), name: s.name, mapId: s.mapId, player: s.player, direction: s.direction,
      skills:s.skills,combatIn:Math.min(combatRules.logoutLockMs,Math.max(0,Math.ceil(this.combatUntil-now))),level: s.level, hp: s.hp, mana: s.mana, exp: s.exp, gold: s.gold, kills: s.kills, quest: s.quest, exploration: s.exploration, stash:s.stash,lootSettings:s.lootSettings, inventory: s.inventory, equipment: s.equipment,
      cooldowns: { move: remaining(this.lastMove,rules.stepMs), attack: remaining(this.lastAttack,rules.attackMs), spell: remaining(this.lastSpell,rules.spellMs), potion: remaining(this.lastPotion,rules.potionMs), mana: remaining(this.lastMana,rules.manaRegenMs) },
      maps: [...this.creatureMaps].map(([mapId, creatures]) => ({ mapId, creatures: creatures.map(c => ({ id:c.id, kind:c.kind, x:c.x, y:c.y, hp:c.hp, state:c.state, attackIn:remaining(c.lastAttack,rules.monsterAttackMs), moveIn:remaining(c.lastMove,rules.stepMs*2), respawnIn: c.hp === 0 ? remaining(c.diedAt,rules.respawnMs) : 0 })) })),
      loot: s.loot, eventId: s.eventId,
    });
  }
  exportProgress():CharacterProgress {return characterProgressSchema.parse(this.exportSave());}
  restoreProgress(input:unknown):void {
    const data=characterProgressSchema.parse(input),m=this.maps.find(m=>m.id===data.mapId);
    if(!m||data.player.x>=m.width||data.player.y>=m.height||m.collision[data.player.y*m.width+data.player.x])throw new Error('Nieprawidłowa pozycja postaci');
    const s=this.state;
    Object.assign(s,{name:data.name,profession:data.profession,skills:data.skills,appearance:data.appearance,actionSlots:data.actionSlots??defaultActions(data.profession),mapId:data.mapId,player:data.player,direction:data.direction,level:data.level,hp:data.hp,mana:data.mana,exp:data.exp,gold:data.gold,kills:data.kills,quest:data.quest,exploration:data.exploration,stash:data.stash,lootSettings:data.lootSettings,inventory:data.inventory,equipment:data.equipment,eventId:data.eventId,maxHp:rules.maxHp+(data.level-1)*10,maxMana:rules.maxMana+(data.level-1)*5,potions:countItem(data.inventory,'potion')});
    this.spawnCreatures();s.player=this.freeArrival(m,data.player)??(()=>{throw new Error('Brak miejsca dla postaci');})();
    this.combatUntil=this.time+data.combatIn;this.guardUntil=this.time+data.guardIn;
    this.lastAttack=this.time+data.cooldowns.attack-professions[data.profession].attackMs;this.lastPotion=this.time+data.cooldowns.potion-rules.potionMs;
    this.lastMove=this.time+data.cooldowns.move-rules.stepMs;this.lastMana=this.time+data.cooldowns.mana-rules.manaRegenMs;
    for(const id of Object.keys(spells) as SpellId[])this.lastSpells.set(id,this.time+(data.spellCooldowns?.[id]??0)-spells[id].cooldown);
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
    const sim = new Simulation(maps, data.name, clock,undefined,undefined,data.profession);
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
    sim.state = { ...sim.state,skills:data.skills, name:data.name,appearance:data.appearance,profession:data.profession,actionSlots:data.actionSlots, mapId:data.mapId, player:data.player, direction:data.direction, level:data.level, hp:data.hp, mana:data.mana, maxHp:rules.maxHp+(data.level-1)*10, maxMana:rules.maxMana+(data.level-1)*5, exp:data.exp, gold:data.gold, kills:data.kills, quest:data.quest, exploration:data.exploration, stash:data.stash,lootSettings:data.lootSettings, inventory:data.inventory, potions:countItem(data.inventory,'potion'), equipment:data.equipment, loot:data.loot, eventId:data.eventId, selectedId:null, dialog:null, complete:false, creatures:sim.creatureMaps.get(data.mapId)!, message:relocated ? 'Vareon przebudowano — wznowiono przy wartowni. Postęp i wyposażenie zachowano.' : 'Wznowiono przygodę offline.' };
    for(const id of Object.keys(spells) as SpellId[])sim.lastSpells.set(id,now+data.spellCooldowns[id]-spells[id].cooldown);
    sim.guardUntil=now+data.guardIn;sim.combatUntil=now+data.combatIn;
    sim.lastMove = now+data.cooldowns.move-rules.stepMs;
    sim.lastAttack = now+data.cooldowns.attack-rules.attackMs;
    sim.lastSpell = now+data.cooldowns.spell-rules.spellMs;
    sim.lastPotion = now+data.cooldowns.potion-rules.potionMs;
    sim.lastMana = now+data.cooldowns.mana-rules.manaRegenMs;
    return sim;
  }
  private nearDepot():boolean {
    const depot=depotOnMap(this.state.mapId);return !!depot&&distance(depot,this.state.player)<=depotRules.range;
  }
  private collectNearby():void {
    const s=this.state,settings=s.lootSettings;if(!settings.enabled)return;
    let changed=false;
    for(const loot of s.loot){
      if(loot.mapId!==s.mapId||Math.max(Math.abs(loot.x-s.player.x),Math.abs(loot.y-s.player.y))>rules.autoLootRange)continue;
      if(settings.gold&&loot.gold>0&&s.gold+loot.gold<=depotRules.maxGold){s.gold+=loot.gold;loot.gold=0;changed=true;}
      const remaining:Stack[]=[];
      for(const stack of loot.items){
        const inventory=settings.itemIds.includes(stack.itemId)?addItems(s.inventory,[stack]):null;
        if(inventory){s.inventory=inventory;changed=true;}else remaining.push(stack);
      }
      loot.items=remaining;
    }
    s.loot=s.loot.filter(loot=>loot.gold>0||loot.items.length>0);s.potions=countItem(s.inventory,'potion');
    if(changed)this.notify('Automatycznie zebrano łup.');
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
    this.time = now;this.syncShared();
    const s = this.state;
    const manaTicks = Math.floor((now - this.lastMana) / rules.manaRegenMs);
    if (manaTicks > 0) { s.mana = Math.min(s.maxMana, s.mana + manaTicks); this.lastMana += manaTicks * rules.manaRegenMs; }
    for (const c of s.creatures) {
      if(this.online){
        const players=[...this.online.world.players.values()].filter(p=>p.state.mapId===s.mapId);
        const target=players.filter(p=>combatAllowedAt(p.map(),p.state.player)&&p.lineOfSight(c,p.state.player)).sort((a,b)=>distance(a.state.player,c)-distance(b.state.player,c)||a.online!.id.localeCompare(b.online!.id))[0]??players[0];
        // Exactly one actor context advances each shared creature, even when clients send rapidly.
        if(target!==this)continue;
      }
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
            const damage = Math.max(1, monsters[c.kind].damage - (s.equipment.armor ? rules.playerDefense : 2) - (now<this.guardUntil?professionRules.guardDefense:0));
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
    this.guardUntil=0;this.combatUntil=0;
    const m = this.maps.find(m => m.id==='eldoria') ?? this.maps.find(m => !m.combatAllowed) ?? this.maps[0]!;
    this.state.mapId = m.id; this.state.player = this.online?(this.freeArrival(m,m.spawns.entry!)??{...m.spawns.entry!}):{ ...m.spawns.entry! };
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

/** One transient authoritative world, with private actor resources and shared creatures/loot. */
export class SharedWorld {
  private shared:SharedState={players:new Map(),creatures:new Map(),loot:[],events:[],sequence:0,lootSequence:0,patrol:new Map()};
  constructor(private maps:WorldMap[],private clock:Clock){}
  join(id:string,name:string,profession:Profession,progress?:CharacterProgress):void {
    if(this.shared.players.has(id))throw new Error('Powtórzona sesja');
    const sim=new Simulation(this.maps,name,this.clock,undefined,undefined,profession,{id,world:this.shared});if(progress)sim.restoreProgress(progress);this.shared.players.set(id,sim);
  }
  progress(id:string):CharacterProgress {const sim=this.shared.players.get(id);if(!sim)throw new Error('Nie ma postaci');return sim.exportProgress();}
  leave(id:string):void {this.shared.players.delete(id);}
  send(id:string,command:unknown):void {this.shared.players.get(id)?.send(command);}
  tick():void {for(const sim of this.shared.players.values())sim.tick();}
  snapshot(id:string):OnlineSnapshot {
    const actor=this.shared.players.get(id);if(!actor)throw new Error('Nie ma sesji');const own=actor.snapshot();
    const players=[...this.shared.players].filter(([other])=>other!==id).map(([other,sim])=>{
      const s=sim.snapshot();return {id:other,name:s.name,profession:s.profession,appearance:s.appearance,mapId:s.mapId,player:s.player,direction:s.direction,hp:s.hp,maxHp:s.maxHp,level:s.level};
    }).filter(s=>s.mapId===own.mapId&&Math.max(Math.abs(s.player.x-own.player.x),Math.abs(s.player.y-own.player.y))<=onlineRules.interestRadius);
    const remap=(target:string)=>target===id?'player':target;
    own.combatEvents=own.combatEvents.map(e=>({...e,sourceId:remap(e.sourceId),targetId:e.targetId?remap(e.targetId):null,hits:e.hits.map(h=>({...h,targetId:remap(h.targetId)}))}));
    own.creatures=own.creatures.map(c=>({...c,lastAttack:Number.isFinite(c.lastAttack)?c.lastAttack:0,lastMove:Number.isFinite(c.lastMove)?c.lastMove:0}));
    return {...own,selfId:id,players};
  }
}
export {onlineSnapshotSchema,onlinePacketSchema} from './online-snapshot';
