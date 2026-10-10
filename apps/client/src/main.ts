import Phaser from 'phaser';
import { combatAllowedAt, regionAt, landmarksOnMap, importMap, validateMaps, rules, monsters, items, npcs, questRules, explorationRules, landmarks, type WorldMap, type NpcId } from '@eldoria/content';
import { nameSchema, type Direction } from '@eldoria/protocol';
import { Simulation, LocalGateway, type Snapshot, type SaveData } from '@eldoria/domain';
import {createTileLayer} from './tile-layer';
import { CityGuide } from './city-guide';
import { TownView, townAssetKeys } from './town-view';
import { CombatEffects } from './combat-effects';
import { OfflineStorage } from './storage';
import {VirtualJoystick} from './virtual-joystick';
import {renderActionIcons} from './action-icons';
import './style.css';

function element<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Brak elementu ${selector}`);
  return node;
}
const ui = {
  menu: element('#menu'), hud: element('#hud'), loading: element('#loading'),
  name: element<HTMLInputElement>('#name'), nameError: element('#name-error'),
  hp: element<HTMLProgressElement>('#hp'), mana: element<HTMLProgressElement>('#mana'),
  hpLabel: element('#hp-label'), playerName: element('#player-name'), mapName: element('#map-name'),
  message: element('#message'), rewards: element('#rewards'), objective: element('#objective'),
  potionCount: element('#potion-count'), targetLabel: element('#target-label'), complete: element('#complete'),
};
let maps: WorldMap[] = [];
let gateway: LocalGateway | undefined;
let snapshot: Snapshot | undefined;
let unsubscribe: (() => void) | undefined;
let playing = false;
let walkingOnly = false;
let adventure = false;
let colorful = false;
let worldEpoch = 0;
let cityGuide:CityGuide|undefined;
let guidedNpc:NpcId|undefined;
const colorfulKeys = ['tree','house','pine','well','rat','beetle','wolf','loot','flowers','rocks','barrel','sign','mira','oren','borin'];
const graphicsChoice = element<HTMLSelectElement>('#graphics-style');
try { graphicsChoice.value = localStorage.getItem('eldoria.graphics') === 'classic' ? 'classic' : 'colorful'; } catch { /* The preview works even when preferences cannot be stored. */ }
function chooseGraphics(): void {
  colorful = graphicsChoice.value === 'colorful';
  document.body.classList.toggle('colorful-world',colorful);
  try { localStorage.setItem('eldoria.graphics',colorful ? 'colorful' : 'classic'); } catch { /* Offline save errors are reported separately by the save adapter. */ }
}
function art(key: string): string { return colorful ? `colorful-${key}` : key; }
let lastSavedSignature = '';
let lastSaveTime = 0;
let lastSavedMap = '';
function saveLocation(mapId:string,p:{x:number;y:number}):string {return `${mapId}:${regionAt(maps.find(m=>m.id===mapId)!,p)?.id??mapId}`;}
let lastSavedEconomy = '';
const npcDialog = element<HTMLDialogElement>('#npc-dialog');
const storage = new OfflineStorage({ getItem: key => localStorage.getItem(key), setItem: (key,value) => localStorage.setItem(key,value) }, input => Simulation.restore(maps.filter(m => ['eldoria','vareon','forest'].includes(m.id)), input, { now: () => performance.now() }).exportSave());
const bagDialog = element<HTMLDialogElement>('#bag');
let completionDismissed = false;
let bagSignature = '';
const pointerDirections = new Map<number, Direction>();
const heldKeys = new Map<string, Direction>();
const joystick = new VirtualJoystick(element('#joystick'), () => playing && ui.complete.hidden && !bagDialog.open && !npcDialog.open, (id, d) => {
  if (d) pointerDirections.set(id, d); else pointerDirections.delete(id);
  movement();
});
function resetInput(): void { pointerDirections.clear(); heldKeys.clear(); joystick.reset(); }
function direction(): Direction | undefined { return [...pointerDirections.values()].at(-1) ?? [...heldKeys.values()].at(-1); }
function movement(): void {
  const d = direction();
  if (!ui.complete.hidden || bagDialog.open || npcDialog.open) return;
  if (d && playing && !document.hidden && !(window.innerWidth <= 700 && window.innerHeight > window.innerWidth)) gateway?.send({ type: 'Move', direction: d });
}
const movementTimer = window.setInterval(movement, rules.tickMs);

class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create(): void { this.scene.start('Preload'); }
}
class Preload extends Phaser.Scene {
  constructor() { super('Preload'); }
  preload(): void {
    const base = `${import.meta.env.BASE_URL}assets/`;
    this.load.spritesheet('tiles', `${base}tiles.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('wanderer', `${base}wanderer.png`, { frameWidth: 32, frameHeight: 48 });
    for (const key of ['tree', 'house', 'rat', 'beetle', 'wolf']) this.load.image(key, `${base}${key}.png`);
    this.load.spritesheet('colorful-tiles',`${base}styles/colorful/tiles.png`,{frameWidth:32,frameHeight:32});
    this.load.spritesheet('colorful-wanderer',`${base}styles/colorful/wanderer.png`,{frameWidth:32,frameHeight:48});
    for (const kind of ['rat','beetle','wolf']) this.load.spritesheet(`colorful-${kind}`,`${base}styles/colorful/${kind}-walk.png`,{frameWidth:32,frameHeight:32});
    for (const key of colorfulKeys.filter(k => !['rat','beetle','wolf'].includes(k))) this.load.image(`colorful-${key}`,`${base}styles/colorful/${key}.png`);
    for (const key of townAssetKeys) this.load.image(`town-${key}`,`${base}town/${key}.png`);
    for (const key of ['courtyard', 'grove', 'eldoria', 'vareon', 'forest']) this.load.json(key, `${base}${key}.json`);
    this.load.on('loaderror', () => { ui.loading.textContent = 'Nie udało się załadować świata. Odśwież stronę i sprawdź połączenie.'; });
  }
  create(): void {
    try {
      maps = ['courtyard', 'grove', 'eldoria', 'vareon', 'forest'].map(id => importMap(this.cache.json.get(id)));
      validateMaps(maps, new Set(['tiles.png']));
      cityGuide=new CityGuide(maps.find(m=>m.id==='eldoria')!,element('#city-guide-content'),id=>{
        guidedNpc=id;bagDialog.close();resetInput();if(snapshot)updateUI(snapshot);
      });
      for (const key of ['tiles', 'wanderer', 'tree', 'house', 'rat', 'beetle', 'wolf', 'colorful-tiles','colorful-wanderer',...colorfulKeys.map(k=>`colorful-${k}`),...townAssetKeys.map(k=>`town-${k}`)]) {
        if (!this.textures.exists(key)) throw new Error(`Brak grafiki ${key}`);
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      for (const [index, d] of ['down', 'left', 'right', 'up'].entries()) {
        for (const prefix of ['', 'colorful-']) this.anims.create({ key: `${prefix}walk-${d}`, frames: this.anims.generateFrameNumbers(`${prefix}wanderer`, { start: index * 3, end: index * 3 + 2 }), frameRate: 10, repeat: -1 });
      }
      for (const kind of ['rat','beetle','wolf']) for (const [facing,start] of [['front',0],['side',3]] as const) this.anims.create({key:`colorful-${kind}-${facing}`,frames:this.anims.generateFrameNumbers(`colorful-${kind}`,{start,end:start+2}),frameRate:9,repeat:-1});
      this.scene.start('World'); this.scene.start('Menu');
    } catch (error) { ui.loading.textContent = `Błąd zawartości: ${error instanceof Error ? error.message : 'nieznany'}`; }
  }
}
class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }
  create(): void { ui.loading.hidden = true; ui.menu.hidden = false; refreshSaveMenu(); }
}
class World extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Sprite;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private creatureSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private creatureViews = new Map<string, { position: string; until: number; side: boolean; tween?: Phaser.Tweens.Tween }>();
  private effects!: CombatEffects;
  private town!: TownView;
  private epoch = -1;
  private lastCombatId = 0;
  private actionUntil = 0;
  private actionKind: 'melee' | 'spell' = 'melee';
  private bars!: Phaser.GameObjects.Graphics;
  private mapId = '';
  private colorful = false;
  private playerPosition = '';
  private movingUntil = 0;
  private movingTween?: Phaser.Tweens.Tween;
  constructor() { super('World'); }
  create(): void {
    this.effects = new CombatEffects(this); this.town = new TownView(this);
    this.bars = this.add.graphics().setDepth(10000);
    this.hero = this.add.sprite(13 * 32 + 16, 11 * 32 + 32, 'wanderer', 0).setOrigin(.5, 1);
    this.hero.setDepth(this.hero.y);
    this.renderMap(maps[0]!);
    this.cameras.main.startFollow(this.hero, true, .12, .12);
    this.resize();
    this.scale.on('resize', this.resize, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.resize, this); this.effects.clear(); this.town.clear(); });
  }
  private resize(): void {
    const w = this.scale.width, h = this.scale.height;
    const top = playing ? (h <= 600 ? 60 : 76) : 0;
    const bottom = playing ? (h <= 600 ? 104 : 168) : 0;
    this.cameras.main.setViewport(0, top, w, Math.max(1, h - top - bottom)).setZoom(w >= 1000 && h >= 600 ? 2 : 1).setRoundPixels(true);
  }
  private renderMap(map: WorldMap): void {
    this.mapId = map.id; this.colorful = colorful;
    this.effects.clear();
    this.movingTween?.stop(); this.movingUntil = 0; this.actionUntil = 0;
    for (const view of this.creatureViews.values()) view.tween?.stop();
    this.creatureViews.clear();
    this.hero.anims.stop(); this.hero.setTexture(art('wanderer'),0);
    for (const object of this.objects) object.destroy();
    this.objects = []; this.creatureSprites.clear(); this.bars.clear();
    for(const [data,depth]of [[map.ground,-100],[map.details,-90],[map.above,9999]] as const) {
      if(data.some(Boolean))this.objects.push(createTileLayer(this,art('tiles'),map.width,map.height,(x,y)=>{
        const gid=data[y*map.width+x]!;
        return gid?gid-1+(colorful?(((x*73856093)^(y*19349663))>>>0)%4*4:0):-1;
      },depth));
    }
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const index = y * map.width + x;
      if (colorful && map.ground[index] === 2) {
        // Reuse native grass pixels at the path boundary; no fractional scaling.
        for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
          if (x+dx < 0 || y+dy < 0 || x+dx >= map.width || y+dy >= map.height || map.ground[(y+dy)*map.width+x+dx] !== 1) continue;
          for (let strip=0;strip<4;strip++) {
            const size=2+((x*3+y+strip)%3), offset=strip*8;
            const horizontal=dy !== 0;
            const cx=horizontal ? offset : dx<0 ? 0 : 32-size;
            const cy=horizontal ? dy<0 ? 0 : 32-size : offset;
            this.objects.push(this.add.image(x*32,y*32,art('tiles'),((x+y+strip)%4)*4).setOrigin(0).setDepth(-85).setCrop(cx,cy,horizontal?6:size,horizontal?size:6));
          }
        }
      }
    }
    for (const d of map.decorations) this.objects.push(this.add.image(d.x * 32 + 16, d.y * 32 + 32, art(colorful && d.kind === 'tree' && (d.x+d.y)%3===0 ? 'pine' : d.kind)).setOrigin(.5, 1).setDepth(d.y * 32 + 33));
    if (colorful) for (const d of map.decorations.filter(d => d.kind === 'house')) this.objects.push(this.add.image((d.x+1)*32+16,d.y*32+32,art('barrel')).setOrigin(.5,1).setDepth(d.y*32+34));
    this.town.build(map);
    for (const n of map.npcs) {
      const talk = () => { if (playing && !bagDialog.open && !npcDialog.open) gateway?.send({ type:'Interact', npcId:n.id }); };
      const sprite = this.add.sprite(n.x*32+16,n.y*32+32,colorful ? art(n.id) : 'wanderer',0).setOrigin(.5,1).setDepth(n.y*32+32).setInteractive({useHandCursor:true});
      if (!colorful) sprite.setTint(({mira:0xe2b779,oren:0x9cd6bc,borin:0xd3a4a2})[n.id]);
      sprite.on('pointerdown',talk); this.objects.push(sprite); this.town.registerInterior(sprite,n);
      const label = this.add.text(n.x*32+16,n.y*32-20,npcs[n.id].name,{fontFamily:'monospace',fontSize:'11px',color:'#efe2ac',backgroundColor:'#213b32'}).setOrigin(.5).setDepth(n.y*32+34).setInteractive({useHandCursor:true});
      label.on('pointerdown',talk); this.objects.push(label); this.town.registerInterior(label,n);
    }

    for (const l of landmarks.filter(l => landmarksOnMap(map.id,l.mapId))) {
      // Original native-size geometric sign, readable in both graphics modes.
      const sign = this.add.graphics().setDepth(l.y*32+32);
      sign.fillStyle(0x71502e).fillRect(l.x*32+14,l.y*32+5,4,23);
      sign.fillStyle(0xd3b66d).fillRect(l.x*32+4,l.y*32+2,24,12);
      sign.lineStyle(1,0x493821).strokeRect(l.x*32+4,l.y*32+2,24,12);
      sign.lineStyle(2,0x356e60).strokeTriangle(l.x*32+12,l.y*32+5,l.x*32+20,l.y*32+8,l.x*32+12,l.y*32+11);
      const inspect = () => { if (playing && !bagDialog.open && !npcDialog.open) gateway?.send({type:'Interact'}); };
      sign.setInteractive(new Phaser.Geom.Rectangle(l.x*32,l.y*32,32,32),Phaser.Geom.Rectangle.Contains).on('pointerdown',inspect);
      sign.input!.cursor = 'pointer'; this.objects.push(sign);
      const label = this.add.text(l.x*32+16,l.y*32-10,l.name,{fontFamily:'monospace',fontSize:'10px',color:'#ffe3a2',backgroundColor:'#213b32'}).setOrigin(.5).setDepth(l.y*32+34).setInteractive({useHandCursor:true});
      label.on('pointerdown',inspect); this.objects.push(label);
    }
    for (const p of map.portals) {
      const enter = () => {
        if (playing && ui.complete.hidden && !bagDialog.open && !npcDialog.open) gateway?.send({ type: 'Interact' });
      };
      const glow = this.add.graphics().setDepth(-10);
      glow.setInteractive(new Phaser.Geom.Ellipse(p.x * 32 + 16, p.y * 32 + 16, 48, 48), Phaser.Geom.Ellipse.Contains);
      glow.input!.cursor = 'pointer';
      glow.on('pointerdown', enter);
      glow.lineStyle(2, 0xd1c785, .9).strokeEllipse(p.x * 32 + 16, p.y * 32 + 16, 27, 18);
      glow.fillStyle(0xa7c7a0, .5).fillEllipse(p.x * 32 + 16, p.y * 32 + 16, 17, 10);
      this.objects.push(glow);
      const label = this.add.text(p.x * 32 + 16, p.y * 32 - 14, ({grove:'DO ZAGAJNIKA',courtyard:'NA DZIEDZINIEC',forest:'DO LASU',vareon:'DO VAREON'})[p.targetMapId] ?? 'BRAMA', { fontFamily: 'monospace', fontSize: '10px', color: '#efe2ac', backgroundColor: '#213b32' }).setOrigin(.5).setInteractive({ useHandCursor: true });
      label.on('pointerdown', enter);
      this.objects.push(label);
    }
    this.cameras.main.setBounds(0, 0, map.width * 32, map.height * 32);
    this.playerPosition = '';
  }
  update(): void {
    const s = snapshot;
    if (!s) return;
    this.resize();
    const newWorld = this.epoch !== worldEpoch;
    if (newWorld) { this.epoch = worldEpoch; this.lastCombatId = 0; }
    if (!playing) { this.effects.clear(); ui.hud.dataset.effects = '0'; return; }
    const changedMap = this.mapId !== s.mapId;
    if (newWorld || changedMap || this.colorful !== colorful) this.renderMap(maps.find(m => m.id === s.mapId)!);
    ui.hud.dataset.building = this.town.update(s.player);
    const position = `${s.player.x},${s.player.y}`;
    if (position !== this.playerPosition) {
      const previous=this.playerPosition.split(',').map(Number);
      const first = this.playerPosition === '' || Math.abs(s.player.x-previous[0]!) + Math.abs(s.player.y-previous[1]!) > 1;
      this.playerPosition = position;
      this.movingTween?.stop();
      const x = s.player.x * 32 + 16, y = s.player.y * 32 + 32;
      if (first) { this.movingUntil=0; this.hero.setPosition(x, y); this.cameras.main.centerOn(x, y); }
      else {
        this.movingTween = this.tweens.add({ targets: this.hero, x, y, duration: rules.stepMs, ease: 'Linear' });
        this.movingUntil = this.time.now + rules.stepMs;
      }
    }
    this.hero.setDepth(this.hero.y);
    if (this.time.now < this.actionUntil) {
      this.hero.anims.stop(); this.hero.setFrame(['down','left','right','up'].indexOf(s.direction)*3 + (this.actionKind === 'melee' ? 2 : 1));
    } else if (this.time.now < this.movingUntil) this.hero.play(`${colorful ? 'colorful-' : ''}walk-${s.direction}`, true);
    else { this.hero.anims.stop(); this.hero.setFrame(['down', 'left', 'right', 'up'].indexOf(s.direction) * 3); }
    this.bars.clear();
    for (const loot of s.loot.filter(l => l.mapId === s.mapId)) {
      this.bars.fillStyle(colorful ? 0xffd660 : 0xdac083).fillCircle(loot.x * 32 + 16, loot.y * 32 + 24, 5);
      this.bars.lineStyle(1, 0x594b33).strokeCircle(loot.x * 32 + 16, loot.y * 32 + 24, 5);
    }
    for (const creature of s.creatures) {
      let sprite = this.creatureSprites.get(creature.id);
      if (!sprite) {
        sprite = this.add.sprite(creature.x * 32 + 16, creature.y * 32 + 32, art(creature.kind)).setOrigin(.5, 1).setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => { if (playing && ui.complete.hidden && !bagDialog.open && !npcDialog.open) gateway?.send({ type: 'Select', targetId: creature.id }); });
        this.creatureSprites.set(creature.id, sprite); this.objects.push(sprite);
      }
      const revived = !sprite.visible && creature.hp > 0;
      sprite.setVisible(creature.hp > 0);
      let view = this.creatureViews.get(creature.id);
      const creaturePosition = `${creature.x},${creature.y}`;
      if (!view) { view = {position:creaturePosition,until:0,side:false}; this.creatureViews.set(creature.id,view); }
      if (creature.hp === 0) { view.tween?.stop(); sprite.anims.stop(); view.until = 0; continue; }
      if (revived) { view.tween?.stop(); sprite.setPosition(creature.x*32+16,creature.y*32+32); view.position = creaturePosition; view.until = 0; }
      if (view.position !== creaturePosition) {
        const [oldX] = view.position.split(',').map(Number);
        view.side = creature.x !== oldX; sprite.setFlipX(view.side && creature.x < oldX!);
        view.position = creaturePosition; view.until = this.time.now + rules.stepMs*2;
        view.tween?.stop(); view.tween = this.tweens.add({targets:sprite,x:creature.x*32+16,y:creature.y*32+32,duration:rules.stepMs*2,ease:'Linear'});
      }
      if (colorful && this.time.now < view.until) sprite.play(`colorful-${creature.kind}-${view.side ? 'side' : 'front'}`,true);
      else { sprite.anims.stop(); sprite.setFrame(colorful && view.side ? 3 : 0); }
      sprite.setDepth(sprite.y);
      const selected = creature.id === s.selectedId;
      if (selected) this.bars.lineStyle(1, 0xefd18a).strokeEllipse(sprite.x, sprite.y - 3, 28, 13);
      this.bars.fillStyle(0x263c35).fillRect(sprite.x - 12, sprite.y - 30, 24, 3);
      this.bars.fillStyle(selected ? 0xdac083 : 0x9ba582).fillRect(sprite.x - 12, sprite.y - 30, 24 * creature.hp / monsters[creature.kind].hp, 3);
    }
    for (const event of s.combatEvents) {
      if (event.id <= this.lastCombatId) continue;
      this.lastCombatId = event.id;
      if (event.mapId !== s.mapId) continue;
      const source = event.sourceId === 'player' ? this.hero : this.creatureSprites.get(event.sourceId);
      const target = event.targetId === 'player' ? this.hero : this.creatureSprites.get(event.targetId);
      this.effects.play(event, source, target);
      if (event.sourceId === 'player') { this.actionUntil = this.time.now + 280; this.actionKind = event.kind === 'spell' ? 'spell' : 'melee'; }
      ui.hud.dataset.combat = event.kind; ui.hud.dataset.combatId = String(event.id);
    }
    this.effects.update(); ui.hud.dataset.effects = String(this.effects.count);
  }
}
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#31483d', pixelArt: true, antialias: false, roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [Boot, Preload, Menu, World], banner: false,
  input: { activePointers: 4 }, fps: { target: 60, forceSetTimeOut: false },
});
function updateUI(s: Snapshot): void {
  snapshot = s;
  ui.hp.max = s.maxHp; ui.mana.max = s.maxMana; ui.hp.value = s.hp; ui.mana.value = s.mana;
  ui.hpLabel.textContent = `${s.hp} HP · ${s.mana} MP`;
  ui.playerName.textContent = `${s.name} · poz. ${s.level}`;
  ui.mapName.textContent = regionAt(maps.find(m=>m.id===s.mapId)!,s.player)?.label ?? ({courtyard:'DZIEDZINIEC WZORCOWY',grove:'ZAGAJNIK WZORCOWY',vareon:'VAREON',forest:'MROCZNY LAS'})[s.mapId] ?? s.mapId;
  ui.objective.textContent = adventure ? s.quest.status === 'available' ? 'Mira →' : s.quest.status === 'claimed' ? '✓' : `${s.quest.kills} / 5` : `${s.defeatedKinds.length} / 3`;
  element('#objective-title').textContent = adventure ? 'NIEPOKÓJ ZA BRAMĄ' : 'PRÓBA WĘDROWCA';
  if (adventure && ['available','claimed'].includes(s.quest.status) && ['active','ready'].includes(s.exploration.status)) {
    element('#objective-title').textContent = explorationRules.title.toUpperCase();
    ui.objective.textContent = `${s.exploration.found.length} / 3`;
  }
  ui.message.textContent = s.message;
  ui.rewards.textContent = `${s.exp} EXP · ${s.gold} złota`;
  ui.potionCount.textContent = `Q · ${s.potions} SZT.`;
  const target = s.creatures.find(c => c.id === s.selectedId && c.hp > 0);
  const map = maps.find(m => m.id === s.mapId)!;
  const distance = (p: { x: number; y: number }) => Math.abs(p.x - s.player.x) + Math.abs(p.y - s.player.y);
  const portal = [...map.portals].sort((a, b) => distance(a) - distance(b))[0];
  const gateHint = s.mapId==='eldoria' ? combatAllowedAt(map,s.player) ? 'Vareon ↓ · wróć pieszo' : 'Las ↑ · przejdź pieszo przez bramę' : portal ? `Brama ${portal.x > s.player.x ? '→' : portal.x < s.player.x ? '←' : ''}${portal.y > s.player.y ? '↓' : portal.y < s.player.y ? '↑' : ''} · ${distance(portal)} kratek · Przejdź (F)` : '';
  const interact = element<HTMLButtonElement>('#interact');
  element('#interact-label').textContent = adventure ? 'Rozmowa' : 'Przejdź';
  const nearbyNpc = map.npcs.find(n => distance(n) <= 1);
  const nearbyLandmark = landmarks.find(l => landmarksOnMap(s.mapId,l.mapId) && distance(l) <= 1);
  interact.classList.toggle('ready', !!nearbyLandmark || !!nearbyNpc || !!portal && distance(portal) <= 1);
  interact.title = adventure ? 'F: rozmowa / zbadaj odkrycie. Brama jest zwykłą drogą.' : portal && distance(portal) <= 1 ? 'Brama w zasięgu — kliknij Przejdź lub bramę' : 'Podejdź obok bramy; można też kliknąć ją na mapie';
  if (adventure && !combatAllowedAt(map,s.player)) ui.targetLabel.textContent = `${s.quest.status === 'available' ? nearbyNpc?.id==='mira' ? 'Porozmawiaj z Mirą obok (F)' : 'Wróć do Miry po zadanie (F)' : s.quest.status === 'ready' ? 'Wróć do Miry po nagrodę (F)' : s.quest.status === 'claimed' ? 'Zadanie ukończone · Oren leczy, Borin handluje' : 'Pokonaj 5 stworzeń w lesie'} · ${gateHint}`;
  else if (walkingOnly) ui.targetLabel.textContent = `Spacer bez potworów · ${gateHint}`;
  else if (!combatAllowedAt(map,s.player)) ui.targetLabel.textContent = `Bezpieczny dziedziniec · Potwory za bramą · ${gateHint}`;
  else if (adventure && s.quest.status === 'ready') ui.targetLabel.textContent = `Zadanie gotowe — wróć do Miry · ${gateHint}`;
  else if (target) ui.targetLabel.textContent = `${monsters[target.kind].name} · ${target.hp} HP · ${target.x > s.player.x ? '→' : target.x < s.player.x ? '←' : ''}${target.y > s.player.y ? '↓' : target.y < s.player.y ? '↑' : ''} ${distance(target)} kratek`;
  else {
    const count = s.creatures.filter(c => c.hp > 0).length;
    ui.targetLabel.textContent = count ? `Potwory: ${count} · Dotknij stworzenia lub wybierz Cel (T)` : 'Potwory odradzają się — zaczekaj lub rozpocznij nową próbę';
    if(adventure)ui.targetLabel.textContent += ` · ${gateHint}`;
  }
  if (adventure && s.exploration.status !== 'available' && s.exploration.status !== 'claimed') {
    const next = landmarks.find(l => !s.exploration.found.includes(l.id));
    const explorationHint = s.exploration.status === 'ready' ? 'Szlak 3/3 — wróć do Miry po nagrodę' : (s.mapId === 'forest' || s.mapId==='eldoria') && next ? `Szlak ${s.exploration.found.length}/3 · ${next.name} ${next.x > s.player.x ? '→' : next.x < s.player.x ? '←' : ''}${next.y > s.player.y ? '↓' : next.y < s.player.y ? '↑' : ''} · ${distance(next)} kratek · F: zbadaj` : `Szlak ${s.exploration.found.length}/3 · miejsca w Mrocznym Lesie`;
    if (!target) ui.targetLabel.textContent = `${explorationHint} · ${gateHint}`;
  }
  if (nearbyLandmark && !target) ui.targetLabel.textContent = `${nearbyLandmark.name} · F / Rozmowa: zbadaj · ${s.exploration.found.includes(nearbyLandmark.id) ? 'odkryte' : 'niezbadane'}`;
  if(s.dialog===guidedNpc)guidedNpc=undefined;
  if(adventure&&guidedNpc) {
    const npc=map.npcs.find(n=>n.id===guidedNpc)!;
    ui.targetLabel.textContent=`${npcs[npc.id].name} · ${npcs[npc.id].role} ${npc.x>s.player.x?'→':npc.x<s.player.x?'←':''}${npc.y>s.player.y?'↓':npc.y<s.player.y?'↑':''} · ${distance(npc)} kratek · F: rozmowa`;
  }
  ui.complete.hidden = !s.complete || completionDismissed;
  if (!ui.complete.hidden) resetInput();
  if (bagDialog.open) renderBag(s);
  renderNpc(s);
  if (playing && adventure) autosave(s);
  // Accessible state for UI tests; never used to decide simulation outcomes.
  ui.hud.dataset.position = `${s.player.x},${s.player.y}`;
  ui.hud.dataset.map = s.mapId;
  ui.hud.dataset.region = regionAt(map,s.player)?.id ?? s.mapId;
  ui.hud.dataset.graphics = colorful ? 'colorful' : 'classic';
}
function activate(simulation: Simulation): void {
  chooseGraphics(); worldEpoch++; guidedNpc=undefined;
  delete ui.hud.dataset.combat; delete ui.hud.dataset.combatId;
  unsubscribe?.(); gateway?.disconnect(); resetInput();
  completionDismissed = false; ui.complete.hidden = true;
  gateway = new LocalGateway(simulation);
  playing = true; ui.menu.hidden = true; ui.hud.hidden = false;
  element('#save-status').textContent = adventure ? 'Przygoda offline · zapis lokalny' : 'Próba i spacer nie są zapisywane';
  lastSavedSignature = ''; lastSaveTime = performance.now(); lastSavedMap = ''; lastSavedEconomy = '';
  unsubscribe = gateway.subscribe(updateUI); gateway.connect();
}
function start(name: string): void {
  walkingOnly = element<HTMLInputElement>('#walk-mode').checked;
  adventure = !walkingOnly && element<HTMLSelectElement>('#mode').value === 'adventure';
  const samples = maps.filter(m => ['courtyard','grove'].includes(m.id));
  const startingMaps = adventure ? maps.filter(m => ['eldoria','vareon','forest'].includes(m.id)) : walkingOnly ? samples : [...samples].reverse();
  activate(new Simulation(startingMaps, name, { now: () => performance.now() }, walkingOnly ? [] : undefined));
}
element<HTMLFormElement>('#start-form').addEventListener('submit', event => {
  event.preventDefault(); const result = nameSchema.safeParse(ui.name.value);
  if (!result.success) { ui.nameError.textContent = 'Imię musi mieć od 3 do 16 znaków po usunięciu spacji.'; return; }
  ui.nameError.textContent = ''; ui.name.blur(); start(result.data);
});
element('#menu-button').addEventListener('click', () => {
  if (adventure) saveNow();
  playing = false; resetInput(); gateway?.disconnect(); unsubscribe?.();
  ui.hud.hidden = true; ui.menu.hidden = false; refreshSaveMenu();
});
element('#continue').addEventListener('click', () => { completionDismissed = true; ui.complete.hidden = true; });
element('#again').addEventListener('click', () => start(snapshot?.name ?? 'Wędrowiec'));
for (const [id, type] of [['attack', 'Attack'], ['cast', 'Cast'], ['potion', 'UseItem'], ['interact', 'Interact'], ['loot', 'Loot']] as const) {
  const button = element(`#${id}`);
  const act = () => { if (playing && ui.complete.hidden && !bagDialog.open && !npcDialog.open) gateway?.send({ type }); };
  button.addEventListener('pointerdown', event => { event.preventDefault(); act(); });
  button.addEventListener('click', event => { if (event.detail === 0) act(); });
}
renderActionIcons();
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direction]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); const d = button.dataset.direction as Direction;
    if (playing && ui.complete.hidden && !bagDialog.open && !npcDialog.open) { pointerDirections.set(event.pointerId, d); button.setPointerCapture(event.pointerId); movement(); }
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, event => pointerDirections.delete((event as PointerEvent).pointerId));
}
const keyDirections: Record<string, Direction> = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
window.addEventListener('keydown', event => {
  if (!playing || event.target instanceof HTMLInputElement) return;
  const key = event.key.toLowerCase();
  if (key === 't' && !event.repeat && !bagDialog.open && !npcDialog.open) { event.preventDefault(); cycleTarget(); return; }
  if (key === 'i' && !event.repeat) { event.preventDefault(); toggleBag(); return; }
  if (!ui.complete.hidden || bagDialog.open || npcDialog.open) return;
  const d = keyDirections[key];
  if (d) { event.preventDefault(); heldKeys.set(key, d); if (!event.repeat) movement(); return; }
  const type = ({ ' ': 'Attack', e: 'Cast', q: 'UseItem', f: 'Interact', r: 'Loot' } as const)[key as ' ' | 'e' | 'q' | 'f' | 'r'];
  if (type && !event.repeat) { event.preventDefault(); gateway?.send({ type }); }
});
window.addEventListener('keyup', event => { heldKeys.delete(event.key.toLowerCase()); });
window.addEventListener('blur', resetInput);
window.addEventListener('resize', resetInput);
document.addEventListener('visibilitychange', () => {
  resetInput();
  if (document.hidden) { if (adventure) saveNow(); gateway?.disconnect(); }
  else if (playing && gateway) { unsubscribe = gateway.subscribe(updateUI); gateway.connect(); }
});
window.addEventListener('pagehide', () => { if (adventure) saveNow(); clearInterval(movementTimer); gateway?.disconnect(); game.destroy(true); });

function renderBag(s: Snapshot): void {
  element('#city-guide').hidden=!adventure;cityGuide?.update(s.mapId,s.player);
  const signature = JSON.stringify([s.inventory, s.equipment, s.gold, s.exp, s.exploration]);
  if (signature === bagSignature) return;
  bagSignature = signature;
  element('#chronicle').hidden = !adventure;
  const chronicle = element('#chronicle-text'); chronicle.replaceChildren();
  const progress = document.createElement('p');
  progress.textContent = s.exploration.status === 'available' ? 'Porozmawiaj z Mirą i przyjmij zadanie. Odkrycia sprzed przyjęcia nie liczą się.' : s.exploration.status === 'claimed' ? 'Szlak odkryty — nagroda odebrana.' : `Odkrycia: ${s.exploration.found.length}/3. ${s.exploration.status === 'ready' ? 'Wróć do Miry po nagrodę.' : 'Zbadaj oznaczone miejsca w lesie (F).'}`;
  chronicle.append(progress);
  for (const l of landmarks) {
    const note = document.createElement('p');
    note.textContent = s.exploration.found.includes(l.id) ? `✓ ${l.name}: ${l.text}` : `◇ ${l.name} — jeszcze nieodkryte`;
    chronicle.append(note);
  }
  const equipment = element('#equipment'); equipment.replaceChildren();
  for (const slot of ['weapon', 'armor'] as const) {
    const row = document.createElement('div'); row.className = 'equipment-row';
    const label = document.createElement('span'); const id = s.equipment[slot];
    label.textContent = `${slot === 'weapon' ? 'Broń' : 'Pancerz'}: ${id ? items[id].name : 'brak'}`;
    const button = document.createElement('button'); button.textContent = 'Zdejmij'; button.disabled = !id;
    button.addEventListener('click', () => gateway?.send({ type: 'Unequip', slot }));
    row.append(label, button); equipment.append(row);
  }
  element('#bag-gold').textContent = `${s.gold} złota · ${s.inventory.length}/20 pól · ${s.exp} EXP`;
  const slots = element('#bag-slots'); slots.replaceChildren();
  for (let i = 0; i < 20; i++) {
    const cell = document.createElement('div'); cell.className = 'bag-slot';
    const stack = s.inventory[i];
    if (stack) {
      const label = document.createElement('span'); label.textContent = `${items[stack.itemId].name} ×${stack.quantity}`; cell.append(label);
      if (stack.itemId === 'sword' || stack.itemId === 'tunic') {
        const button = document.createElement('button'); button.textContent = 'Załóż';
        button.addEventListener('click', () => gateway?.send({ type: 'Equip', itemId: stack.itemId })); cell.append(button);
      }
    } else cell.textContent = '·';
    slots.append(cell);
  }
}
function toggleBag(): void {
  resetInput();
  if (bagDialog.open) bagDialog.close();
  else if (snapshot && playing && !npcDialog.open) { renderBag(snapshot); bagDialog.showModal(); }
}
for(const [id,action]of [['bag-button',toggleBag],['close-bag',()=>bagDialog.close()]] as const){
  const button=element(`#${id}`);
  button.addEventListener('pointerdown',event=>{event.preventDefault();action();});
  button.addEventListener('click',event=>{if(event.detail===0)action();});
}
bagDialog.addEventListener('close', resetInput);

function cycleTarget(): void {
  if (!playing || !snapshot || bagDialog.open || npcDialog.open || !ui.complete.hidden) return;
  const living = snapshot.creatures.filter(c => c.hp > 0);
  const index = living.findIndex(c => c.id === snapshot?.selectedId);
  const target = living[(index + 1) % living.length];
  if (target) gateway?.send({ type: 'Select', targetId: target.id });
}
element('#cycle-target').addEventListener('pointerdown', event => { event.preventDefault(); cycleTarget(); });
element('#cycle-target').addEventListener('click', event => { if (event.detail === 0) cycleTarget(); });

let npcSignature = '';
function renderNpc(s: Snapshot): void {
  if (!s.dialog) { if (npcDialog.open) npcDialog.close(); npcSignature = ''; return; }
  const signature = JSON.stringify([s.dialog,s.quest,s.exploration,s.gold,s.inventory,s.message]);
  if (signature === npcSignature) return;
  npcSignature = signature;
  resetInput();
  const npc = npcs[s.dialog];
  element('#npc-name').textContent = npc.name;
  element('#npc-role').textContent = npc.role;
  element('#npc-text').textContent = npc.text;
  element('#npc-message').textContent = s.message;
  const actions = element('#npc-actions'); actions.replaceChildren();
  const action = (label: string, command: Parameters<LocalGateway['send']>[0], disabled = false) => {
    const button = document.createElement('button'); button.textContent = label; button.disabled = disabled;
    button.addEventListener('click', () => gateway?.send(command)); actions.append(button);
  };
  if (s.dialog === 'mira') {
    const status = s.quest.status;
    element('#npc-text').textContent += `\n${questRules.title}: ${status === 'claimed' ? 'ukończone — nagroda odebrana' : `${s.quest.kills}/5`}`;
    if (status === 'available') action('Przyjmij zadanie',{type:'AcceptQuest'});
    else if (status === 'ready') action('Odbierz nagrodę',{type:'ClaimReward'});
    else if (status === 'active') element('#npc-text').textContent += '\nWróć po pokonaniu pięciu stworzeń.';
  }
  if (s.dialog === 'mira') {
    const q = s.exploration;
    element('#npc-text').textContent += `\n\n${explorationRules.title}: ${q.status === 'claimed' ? 'ukończone — nagroda odebrana' : `${q.found.length}/3`}\nZnajdź stary drogowskaz na północ od bramy, obóz na zachodzie i kamień pamięci na północnym wschodzie. Podejdź i zbadaj (F). Nagroda: 75 EXP, 25 złota, 2 mikstury.`;
    for (const l of landmarks) if (q.found.includes(l.id)) element('#npc-text').textContent += `\n✓ ${l.name}: ${l.text}`;
    if (q.status === 'available') action('Przyjmij: Ślady dawnego szlaku',{type:'AcceptQuest',questId:'exploration'});
    else if (q.status === 'ready') action('Odbierz nagrodę za szlak',{type:'ClaimReward',questId:'exploration'});
  }
  if (s.dialog === 'oren') action('Przywróć zdrowie i manę',{type:'Heal'});
  if (s.dialog === 'borin') {
    element('#npc-text').textContent += `\nTwoje złoto: ${s.gold}`;
    action('Kup miksturę — 5 złota',{type:'Buy',quantity:1},s.gold<5);
    for (const itemId of ['skin','chitin'] as const) {
      const count = s.inventory.filter(i => i.itemId === itemId).reduce((sum,i) => sum+i.quantity,0);
      action(`Sprzedaj: ${items[itemId].name} — 2 złota`,{type:'Sell',itemId,quantity:1},count===0);
    }
  }
  if (!npcDialog.open) npcDialog.showModal();
}
element('#close-npc').addEventListener('click', () => gateway?.send({type:'CloseDialog'}));
npcDialog.addEventListener('cancel', event => { event.preventDefault(); gateway?.send({type:'CloseDialog'}); });
npcDialog.addEventListener('close', resetInput);

function saveNow(explicitRecovery = false): void {
  if (!gateway || !adventure) return;
  lastSaveTime = performance.now();
  if (snapshot) { lastSavedMap = saveLocation(snapshot.mapId,snapshot.player); lastSavedEconomy = JSON.stringify([snapshot.gold,snapshot.quest.status,snapshot.exploration]); }
  try {
    const data = gateway.exportSave();
    const error = storage.write(data,explicitRecovery);
    element('#save-status').textContent = error ?? 'Przygoda zapisana lokalnie';
    if (!error) { lastSaveTime = performance.now(); lastSavedSignature = persistentSignature(data); lastSavedMap = saveLocation(data.mapId,data.player); lastSavedEconomy = JSON.stringify([data.gold,data.quest.status,data.exploration]); }
  } catch { element('#save-status').textContent = 'Nie udało się zapisać. Wyeksportuj zapis lub zgłoś błąd.'; }
}
function persistentSignature(data: SaveData): string {
  return JSON.stringify([data.cityRevision,data.name,data.mapId,data.player,data.direction,data.level,data.hp,data.mana,data.exp,data.gold,data.kills,data.quest,data.exploration,data.inventory,data.equipment,data.loot,data.maps.map(m => [m.mapId,m.creatures.map(c => [c.id,c.x,c.y,c.hp,c.state])])]);
}
function autosave(s: Snapshot): void {
  const economy = JSON.stringify([s.gold,s.quest.status,s.exploration]);
  if (saveLocation(s.mapId,s.player) !== lastSavedMap || economy !== lastSavedEconomy || performance.now()-lastSaveTime >= 30000) {
    const data = gateway?.exportSave();
    if (data && persistentSignature(data) !== lastSavedSignature) saveNow();
    else lastSaveTime = performance.now();
  }
}
function refreshSaveMenu(): void {
  const status = storage.load();
  element('#resume').hidden = !status.data;
  element('#recover').hidden = !status.backup;
  element('#save-menu-status').textContent = status.error ?? (status.data ? `Zapis: ${status.data.name} · poziom ${status.data.level} · ${status.data.mapId === 'eldoria' ? 'Eldoria' : status.data.mapId === 'vareon' ? 'Vareon' : 'Mroczny Las'}` : 'Brak zapisu przygody.');
}
function resumeSave(data: SaveData, recovery = false): void {
  adventure = true; walkingOnly = false;
  activate(Simulation.restore(maps.filter(m => ['eldoria','vareon','forest'].includes(m.id)),data,{now:() => performance.now()}));
  saveNow(recovery);
}
element('#resume').addEventListener('click', () => { const data = storage.load().data; if (data) resumeSave(data); });
element('#recover').addEventListener('click', () => { const data = storage.load().backup; if (data) resumeSave(data,true); });
element('#save-button').addEventListener('click', () => { if (adventure) saveNow(); else element('#save-status').textContent = 'Próba i spacer nie są zapisywane.'; });
element('#export-save').addEventListener('click', () => {
  try {
    const data = adventure && gateway ? gateway.exportSave() : storage.load().data ?? storage.load().backup;
    if (!data) { element('#save-menu-status').textContent = 'Brak poprawnego zapisu do eksportu.'; return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'eldoria-offline.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  } catch { element('#save-menu-status').textContent = 'Nie udało się wyeksportować zapisu.'; }
});
element<HTMLInputElement>('#import-save').addEventListener('change', async event => {
  const input = event.target as HTMLInputElement, file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error('Za duży plik');
    const simulation = Simulation.restore(maps.filter(m => ['eldoria','vareon','forest'].includes(m.id)),JSON.parse(await file.text()),{now:() => performance.now()});
    adventure = true; walkingOnly = false; activate(simulation); saveNow(true);
  } catch { element('#save-menu-status').textContent = 'Import odrzucony: niepoprawny lub nieobsługiwany zapis. Bieżące dane zachowano.'; }
  input.value = '';
});
