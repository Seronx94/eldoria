import Phaser from 'phaser';
import { depotOnMap,combatAllowedAt, regionAt, landmarksOnMap, importMap, validateMaps, rules, monsters, items, npcs, shopRules,questRules, explorationRules, landmarks,professions,spells, type WorldMap, type NpcId } from '@eldoria/content';
import { nameSchema,professionSchema,defaultAppearance, type Direction,type ActionId } from '@eldoria/protocol';
import { Simulation, LocalGateway, type Snapshot, type OnlineSnapshot,type SaveData } from '@eldoria/domain';
import {createTileLayer} from './tile-layer';
import { CityGuide } from './city-guide';
import { TownView, townAssetKeys } from './town-view';
import { CombatEffects } from './combat-effects';
import { OfflineStorage } from './storage';
import {VirtualJoystick} from './virtual-joystick';
import {renderActionIcons,actionIcon} from './action-icons';
import {renderInventory,itemIcon} from './inventory-view';
import {OnlineGateway} from './online-gateway';
import {RemotePlayers} from './remote-players';
import {AccountUI} from './account-ui';
import {skillNames,skillRequired} from '@eldoria/content';
import {PublicVitals} from './public-vitals';
import {healthDisplay} from './health-display';
import {HeroVitals,loadVitalsStyle,type VitalsStyle} from './hero-vitals';
import {DepotView} from './depot-view';
import {creatureFacing,creatureFrames} from './creature-facing';
import {ActionBar,actionName} from './action-bar';
import {HeroAppearance} from './hero-appearance';
import {exportSave} from './export-save';
import {outfitParts,outfitLabels,originalColors} from './outfit-colors';
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
let gateway: LocalGateway|OnlineGateway|undefined;
let onlineMode=false;
let snapshot: Snapshot | undefined;
let unsubscribe: (() => void) | undefined;
let playing = false;
let walkingOnly = false;
let adventure = false;
let colorful = false;
let worldEpoch = 0;
let cityGuide:CityGuide|undefined;
let guidedNpc:NpcId|undefined;
let guidedDepot=false;
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
let vitalsStyle:VitalsStyle=loadVitalsStyle();
const vitalsChoice=element<HTMLSelectElement>('#vitals-style');vitalsChoice.value=vitalsStyle;
vitalsChoice.addEventListener('change',()=>{vitalsStyle=vitalsChoice.value==='arcs'?'arcs':'bars';try{localStorage.setItem('eldoria.vitals',vitalsStyle);}catch{/* Keep session preference without storage. */}});
const depotDialog=element<HTMLDialogElement>('#depot-dialog');
const depotView=new DepotView(depotDialog,c=>gateway?.send(c));
depotDialog.addEventListener('close',resetInput);
const bagDialog = element<HTMLDialogElement>('#bag');
const settingsDialog=element<HTMLDialogElement>('#settings-dialog');
let completionDismissed = false;
let bagSignature = '';
const pointerDirections = new Map<number, Direction>();
const heldKeys = new Map<string, Direction>();
const attackPointers = new Set<number>();
const attackKeys=new Set<string>();
const actionButtons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot]'));
const actionBar=new ActionBar(actionButtons);
const joystick = new VirtualJoystick(element('#joystick'), () => playing && ui.complete.hidden && !settingsDialog.open && !bagDialog.open && !npcDialog.open && !depotDialog.open, (id, d) => {
  if (d) pointerDirections.set(id, d); else pointerDirections.delete(id);
  movement();
});
function resetInput(): void { pointerDirections.clear(); heldKeys.clear(); attackPointers.clear(); attackKeys.clear(); joystick.reset(); }
function direction(): Direction | undefined { return [...pointerDirections.values()].at(-1) ?? [...heldKeys.values()].at(-1); }
let nextMovementAt=0;
function movement(): void {
  const d = direction();
  if (!ui.complete.hidden || settingsDialog.open || bagDialog.open || npcDialog.open || depotDialog.open) return;
  if (d && playing && performance.now()>=nextMovementAt && !document.hidden && !(window.innerWidth <= 700 && window.innerHeight > window.innerWidth)) {
    gateway?.send({ type: 'Move', direction: d });
    nextMovementAt=performance.now()+rules.stepMs;
  }
}
const movementTimer = window.setInterval(() => {
  if ((attackKeys.size || attackPointers.size > 0) && playing && !document.hidden && ui.complete.hidden && !settingsDialog.open && !bagDialog.open && !npcDialog.open && !depotDialog.open && !(window.innerWidth <= 700 && window.innerHeight > window.innerWidth)) gateway?.send({type:'Attack'});
}, rules.tickMs);

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
    for(const profession of ['archer','mage'])this.load.spritesheet(`colorful-${profession}`,`${base}styles/professions/${profession}.png`,{frameWidth:32,frameHeight:48});
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
        guidedNpc=id;guidedDepot=false;bagDialog.close();resetInput();if(snapshot)updateUI(snapshot);
      });
      for (const key of ['tiles', 'wanderer', 'tree', 'house', 'rat', 'beetle', 'wolf', 'colorful-tiles','colorful-wanderer','colorful-archer','colorful-mage',...colorfulKeys.map(k=>`colorful-${k}`),...townAssetKeys.map(k=>`town-${k}`)]) {
        if (!this.textures.exists(key)) throw new Error(`Brak grafiki ${key}`);
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      for (const kind of ['rat','beetle','wolf']) for (const [facing,start] of [['down',0],['right',3],['left',3],['up',6]] as const) this.anims.create({key:`colorful-${kind}-${facing}`,frames:this.anims.generateFrameNumbers(`colorful-${kind}`,{start,end:start+2}),frameRate:9,repeat:-1});
      this.scene.start('World'); this.scene.start('Menu');
    } catch (error) { ui.loading.textContent = `Błąd zawartości: ${error instanceof Error ? error.message : 'nieznany'}`; }
  }
}
class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }
  create(): void { ui.loading.hidden = true; ui.menu.hidden = false; refreshSaveMenu(); }
}
class World extends Phaser.Scene {
  private vitals!:HeroVitals;
  private remote!:RemotePlayers;
  private publicVitals=new Map<string,PublicVitals>();
  private hero!: Phaser.GameObjects.Sprite;
  private appearance!:HeroAppearance;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private creatureSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private creatureViews = new Map<string, { position: string; until: number; facing: Direction; tween?: Phaser.Tweens.Tween }>();
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
    this.vitals=new HeroVitals(this);this.remote=new RemotePlayers(this);
    this.appearance=new HeroAppearance(this);
    this.effects = new CombatEffects(this); this.town = new TownView(this);
    this.bars = this.add.graphics().setDepth(10000);
    this.hero = this.add.sprite(13 * 32 + 16, 11 * 32 + 32, 'outfit', 0).setOrigin(.5, 1);
    this.hero.setDepth(this.hero.y);
    this.renderMap(maps[0]!);
    this.cameras.main.startFollow(this.hero, true, .12, .12);
    this.resize();
    this.scale.on('resize', this.resize, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.resize, this); this.effects.clear(); this.town.clear(); });
  }
  private resize(): void {
    const w = this.scale.width, h = this.scale.height;
    const compact=matchMedia('(pointer:coarse)').matches||h<=600;
    const top = playing&&!compact?76:0;
    const bottom = playing ? (h <= 600 ? 104 : 168) : 0;
    this.cameras.main.setViewport(0, top, w, Math.max(1, h - top - bottom)).setZoom(w >= 1000 && h >= 600 ? 2 : 1).setRoundPixels(true);
  }
  private renderMap(map: WorldMap): void {
    this.mapId = map.id; this.colorful = colorful;
    this.effects.clear();
    this.movingTween?.stop(); this.movingUntil = 0; this.actionUntil = 0;
    for (const view of this.creatureViews.values()) view.tween?.stop();
    this.creatureViews.clear();this.remote.clear();
    for(const vitals of this.publicVitals.values())vitals.destroy();this.publicVitals.clear();
    this.hero.anims.stop(); this.hero.setTexture('outfit',0);
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
      const talk = () => { if (playing && !settingsDialog.open && !bagDialog.open && !npcDialog.open && !depotDialog.open) gateway?.send({ type:'Interact', npcId:n.id }); };
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
      const inspect = () => { if (playing && !settingsDialog.open && !bagDialog.open && !npcDialog.open && !depotDialog.open) gateway?.send({type:'Interact'}); };
      sign.setInteractive(new Phaser.Geom.Rectangle(l.x*32,l.y*32,32,32),Phaser.Geom.Rectangle.Contains).on('pointerdown',inspect);
      sign.input!.cursor = 'pointer'; this.objects.push(sign);
      const label = this.add.text(l.x*32+16,l.y*32-10,l.name,{fontFamily:'monospace',fontSize:'10px',color:'#ffe3a2',backgroundColor:'#213b32'}).setOrigin(.5).setDepth(l.y*32+34).setInteractive({useHandCursor:true});
      label.on('pointerdown',inspect); this.objects.push(label);
    }
    for (const p of map.portals) {
      const enter = () => {
        if (playing && ui.complete.hidden && !settingsDialog.open && !bagDialog.open && !npcDialog.open && !depotDialog.open) gateway?.send({ type: 'Interact' });
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
    const depot=depotOnMap(map.id);
    if(depot){
      const x=depot.x*32,y=depot.y*32,g=this.add.graphics().setDepth(y+31);
      g.fillStyle(0x192832,.7).fillEllipse(x+16,y+29,30,10);g.fillStyle(0x523129).fillRect(x+2,y+8,28,22);
      g.fillStyle(0xb9894c).fillRect(x+4,y+10,24,17);g.fillStyle(0xd9b36b).fillRect(x+4,y+8,24,5);
      g.lineStyle(2,0x332a24).lineBetween(x+3,y+16,x+29,y+16);g.fillStyle(0xe9d087).fillRect(x+13,y+14,6,7);
      g.setInteractive(new Phaser.Geom.Rectangle(x,y,32,32),Phaser.Geom.Rectangle.Contains).on('pointerdown',()=>{if(playing&&!settingsDialog.open && !bagDialog.open&&!npcDialog.open&&!depotDialog.open)gateway?.send({type:'OpenDepot'});});
      const label=this.add.text(x+16,y-4,'DEPO',{fontFamily:'monospace',fontSize:'9px',color:'#f6df9b',stroke:'#18222b',strokeThickness:2}).setOrigin(.5,1).setDepth(y+32);
      this.objects.push(g,label);
    }

  }
  update(): void {
    movement();
    const s = snapshot;
    if (!s) return;
    this.resize();
    const newWorld = this.epoch !== worldEpoch;
    if (newWorld) { this.epoch = worldEpoch; this.lastCombatId = onlineMode?(s.combatEvents.at(-1)?.id??0):0; }
    if (!playing) { this.vitals.hide();this.remote.clear();for(const vitals of this.publicVitals.values())vitals.hide();this.effects.clear(); ui.hud.dataset.effects = '0'; return; }
    this.appearance.update(s,colorful);
    const changedMap = this.mapId !== s.mapId;
    if (newWorld || changedMap || this.colorful !== colorful) this.renderMap(maps.find(m => m.id === s.mapId)!);
    ui.hud.dataset.building = this.town.update(s.player);
    ui.hud.dataset.roofs = this.town.visibleRoofs.join(',');
    const position = `${s.player.x},${s.player.y}`;
    if (position !== this.playerPosition) {
      const previous=this.playerPosition.split(',').map(Number);
      const first = this.playerPosition === '' || Math.abs(s.player.x-previous[0]!) + Math.abs(s.player.y-previous[1]!) > 1;
      this.playerPosition = position;
      this.movingTween?.stop();
      const x = s.player.x * 32 + 16, y = s.player.y * 32 + 32;
      if (first) { this.movingUntil=0; this.hero.setPosition(x, y); this.cameras.main.centerOn(x, y); }
      else {
        this.movingTween = this.tweens.add({ targets: this.hero, x, y, duration: rules.stepMs+20, ease: 'Linear' });
        this.movingUntil = this.time.now + rules.stepMs+20;
      }
    }
    this.vitals.show();this.vitals.draw(s,this.hero.x,this.hero.y,vitalsStyle);ui.hud.dataset.vitalsStyle=vitalsStyle;
    this.hero.setDepth(this.hero.y);
    ui.hud.dataset.heroProfession=s.profession;ui.hud.dataset.heroTexture=this.hero.texture.key;
    if (this.time.now < this.actionUntil) {
      this.hero.anims.stop(); this.hero.setFrame(['down','left','right','up'].indexOf(s.direction)*3 + (this.actionKind === 'melee' ? 2 : 1));
    } else if (this.time.now < this.movingUntil) this.hero.play(`hero-walk-${s.direction}`, true);
    else { this.hero.anims.stop(); this.hero.setFrame(['down', 'left', 'right', 'up'].indexOf(s.direction) * 3); }
    ui.hud.dataset.heroFrame=String(this.hero.frame.name);ui.hud.dataset.heroNick=s.name;
    ui.hud.dataset.heroHp=String(s.hp/s.maxHp);ui.hud.dataset.heroNameColor=healthDisplay(s.hp,s.maxHp).css;ui.hud.dataset.heroMana=String(s.mana/s.maxMana);
    ui.hud.dataset.heroPosition=`${this.hero.x.toFixed(3)},${this.hero.y.toFixed(3)}`;
    this.remote.update('players'in s?(s as OnlineSnapshot).players:[],colorful);ui.hud.dataset.remotePlayers=JSON.stringify(this.remote.poses);
    this.bars.clear();
    if(s.guardMs>0)this.bars.lineStyle(2,0x98c7ef,.6+Math.sin(this.time.now/180)*.2).strokeEllipse(this.hero.x,this.hero.y-10,34,28);
    for (const loot of s.loot.filter(l => l.mapId === s.mapId)) {
      this.bars.fillStyle(colorful ? 0xffd660 : 0xdac083).fillCircle(loot.x * 32 + 16, loot.y * 32 + 24, 5);
      this.bars.lineStyle(1, 0x594b33).strokeCircle(loot.x * 32 + 16, loot.y * 32 + 24, 5);
    }
    for (const creature of s.creatures) {
      let sprite = this.creatureSprites.get(creature.id);
      if (!sprite) {
        sprite = this.add.sprite(creature.x * 32 + 16, creature.y * 32 + 32, art(creature.kind)).setOrigin(.5, 1).setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => { if (playing && ui.complete.hidden && !settingsDialog.open && !bagDialog.open && !npcDialog.open && !depotDialog.open) gateway?.send(snapshot?.selectedId===creature.id?{type:'ClearTarget'}:{ type: 'Select', targetId: creature.id }); });
        this.publicVitals.set(creature.id,new PublicVitals(this));
        this.creatureSprites.set(creature.id, sprite); this.objects.push(sprite);
      }
      const revived = !sprite.visible && creature.hp > 0;
      sprite.setVisible(creature.hp > 0);
      let view = this.creatureViews.get(creature.id);
      const creaturePosition = `${creature.x},${creature.y}`;
      if (!view) { view = {position:creaturePosition,until:0,facing:'down'}; this.creatureViews.set(creature.id,view); }
      if (creature.hp === 0) { this.publicVitals.get(creature.id)!.hide();view.tween?.stop(); sprite.anims.stop(); view.until = 0; continue; }
      if (revived) { view.tween?.stop(); sprite.setPosition(creature.x*32+16,creature.y*32+32); view.position = creaturePosition; view.until = 0; }
      if (view.position !== creaturePosition) {
        const [oldX,oldY] = view.position.split(',').map(Number);
        view.facing=creatureFacing({x:oldX!,y:oldY!},creature,view.facing);
        view.position = creaturePosition; view.until = this.time.now + rules.stepMs*2;
        view.tween?.stop(); view.tween = this.tweens.add({targets:sprite,x:creature.x*32+16,y:creature.y*32+32,duration:rules.stepMs*2,ease:'Linear'});
      }
      const pose=creatureFrames[view.facing];sprite.setFlipX(colorful&&pose.flipX);
      if (colorful && this.time.now < view.until) sprite.play(`colorful-${creature.kind}-${view.facing}`,true);
      else { sprite.anims.stop(); sprite.setFrame(colorful ? pose.start : 0); }
      sprite.setDepth(sprite.y);
      const selected = creature.id === s.selectedId;
      if (selected) this.bars.lineStyle(1, 0xefd18a).strokeEllipse(sprite.x, sprite.y - 3, 28, 13);
      this.publicVitals.get(creature.id)!.draw(monsters[creature.kind].name,creature.hp,monsters[creature.kind].hp,sprite.x,sprite.y,selected);
    }
    // Read-only diagnostics of the actual rendered frames, useful when checking directional art.
    ui.hud.dataset.creaturePoses=JSON.stringify(s.creatures.filter(c=>c.hp>0).map(c=>{
      const sprite=this.creatureSprites.get(c.id)!,view=this.creatureViews.get(c.id)!;
      const camera=this.cameras.main;
      // This unrotated camera zooms around the viewport centre.
      const screen={x:camera.x+camera.width/2+(sprite.x-camera.scrollX-camera.width/2)*camera.zoom,y:camera.y+camera.height/2+(sprite.y-16-camera.scrollY-camera.height/2)*camera.zoom};
      return {id:c.id,x:c.x,y:c.y,screenX:screen.x,screenY:screen.y,vitalsVisible:this.publicVitals.get(c.id)!.presentation.visible,vitalsColor:this.publicVitals.get(c.id)!.presentation.color,facing:view.facing,frame:Number(sprite.frame.name),flip:sprite.flipX,animation:sprite.anims.isPlaying?sprite.anims.currentAnim?.key:null};
    }));
    for (const event of s.combatEvents) {
      if (event.id <= this.lastCombatId) continue;
      this.lastCombatId = event.id;
      if (event.mapId !== s.mapId) continue;
      const source = event.sourceId === 'player' ? this.hero : this.remote.sprite(event.sourceId)??this.creatureSprites.get(event.sourceId);
      const target = event.targetId === 'player' ? this.hero : event.targetId ? this.remote.sprite(event.targetId)??this.creatureSprites.get(event.targetId) : undefined;
      this.effects.play(event, source, target,id=>id==='player'?this.hero:this.remote.sprite(id)??this.creatureSprites.get(id));
      this.remote.action(event.sourceId,event.effect);
      if (event.sourceId === 'player') { ui.hud.dataset.playerCombatTarget=event.targetId??'';ui.hud.dataset.playerCombatKind=event.kind; this.actionUntil = this.time.now + 280; this.actionKind = event.kind === 'spell' ? 'spell' : 'melee'; }
      ui.hud.dataset.combatDamage = String(event.damage); ui.hud.dataset.combatTarget = event.targetId ?? '';
      ui.hud.dataset.combat = event.kind; ui.hud.dataset.combatId = String(event.id);
      ui.hud.dataset.combatEffect=event.effect;ui.hud.dataset.combatRange=String(Math.abs(event.from.x-event.to.x)+Math.abs(event.from.y-event.to.y));
    }
    this.effects.update(); ui.hud.dataset.effects = String(this.effects.count);ui.hud.dataset.effectTypes=this.effects.types.join(',');
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
  actionBar.update(s);
  ui.hp.max = s.maxHp; ui.mana.max = s.maxMana; ui.hp.value = s.hp; ui.mana.value = s.mana;
  ui.hpLabel.textContent = `${s.hp} HP · ${s.mana} MP`;
  ui.playerName.textContent = `${s.name} · ${professions[s.profession].name} ${s.level}`;
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
  ui.hud.dataset.selectedId=s.selectedId??'';
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
    ui.targetLabel.textContent = count ? `Potwory: ${count} · Przytrzymaj ${professions[s.profession].attackName} · Cel (T) opcjonalny` : 'Potwory odradzają się — zaczekaj lub rozpocznij nową próbę';
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
  const depot=depotOnMap(s.mapId);
  if(s.depotOpen)guidedDepot=false;
  if(depot&&(guidedDepot||Math.abs(s.player.x-depot.x)+Math.abs(s.player.y-depot.y)<=1))ui.targetLabel.textContent=`Depo · gospoda na południowym zachodzie ${depot.x>s.player.x?'→':depot.x<s.player.x?'←':''}${depot.y>s.player.y?'↓':depot.y<s.player.y?'↑':''} · ${Math.abs(s.player.x-depot.x)+Math.abs(s.player.y-depot.y)} kratek · F: otwórz stash`;
  ui.complete.hidden = !s.complete || completionDismissed;
  if (!ui.complete.hidden) resetInput();
  if (bagDialog.open) renderBag(s);
  renderNpc(s);depotView.update(s);if(s.depotOpen)resetInput();
  if (playing && adventure && !onlineMode) autosave(s);
  element('#settings-character').textContent=`${s.name} · ${professions[s.profession].name} · lvl: ${s.level}`;
  element('#combat-status').textContent=s.combatMs>0?`Walka: wylogowanie za ${Math.ceil(s.combatMs/1000)} s od ostatniego trafienia.`:'Poza walką — można bezpiecznie wyjść.';
  ui.hud.dataset.combatMs=String(s.combatMs);ui.hud.dataset.skills=JSON.stringify(s.skills);
  renderSkills(s);
  // Accessible state for UI tests; never used to decide simulation outcomes.
  ui.hud.dataset.position = `${s.player.x},${s.player.y}`;
  ui.hud.dataset.map = s.mapId;
  ui.hud.dataset.region = regionAt(map,s.player)?.id ?? s.mapId;
  ui.hud.dataset.graphics = colorful ? 'colorful' : 'classic';
  ui.hud.dataset.profession=s.profession;ui.hud.dataset.actionSlots=s.actionSlots.join(',');
}
function activate(simulation: Simulation): void {activateGateway(new LocalGateway(simulation),false);element<HTMLSelectElement>('#profession').value=simulation.snapshot().profession;}
function activateGateway(next:LocalGateway|OnlineGateway,isOnline:boolean):void {
  chooseGraphics(); worldEpoch++; guidedNpc=undefined;guidedDepot=false;

  delete ui.hud.dataset.playerCombatTarget;delete ui.hud.dataset.playerCombatKind;delete ui.hud.dataset.selectedId;
  delete ui.hud.dataset.combat; delete ui.hud.dataset.combatId; delete ui.hud.dataset.combatDamage; delete ui.hud.dataset.combatTarget;
  delete ui.hud.dataset.combatEffect;delete ui.hud.dataset.effectTypes;
  unsubscribe?.(); gateway?.disconnect(); resetInput();
  completionDismissed = false; ui.complete.hidden = true;
  element<HTMLSelectElement>('#connection-mode').value=isOnline?'online':'offline';syncConnectionChoices();
  gateway=next;onlineMode=isOnline;snapshot=undefined;ui.hud.dataset.connection=isOnline?'connecting':'offline';element<HTMLButtonElement>('#save-button').disabled=isOnline;
  playing = true; ui.menu.hidden = true; ui.hud.hidden = false;
  element('#save-status').textContent = isOnline?'Online · postać na koncie · checkpoint co 5 s':adventure ? 'Przygoda offline · zapis lokalny' : 'Próba i spacer nie są zapisywane';
  lastSavedSignature = ''; lastSaveTime = performance.now(); lastSavedMap = ''; lastSavedEconomy = '';
  unsubscribe = gateway.subscribe(updateUI); gateway.connect();
}
function syncConnectionChoices():void {const online=element<HTMLSelectElement>('#connection-mode').value==='online';element<HTMLSelectElement>('#mode').disabled=online;element<HTMLInputElement>('#walk-mode').disabled=online;}
element('#connection-mode').addEventListener('change',syncConnectionChoices);
function start(name: string): void {
  if(element<HTMLSelectElement>('#connection-mode').value==='online'){
    const id=accountUI?.character(name);if(!id){ui.nameError.textContent='Zaloguj się, stwórz postać i wybierz Graj w panelu konta.';return;}startOnline(id);return;
  }
  walkingOnly = element<HTMLInputElement>('#walk-mode').checked;
  adventure = !walkingOnly && element<HTMLSelectElement>('#mode').value === 'adventure';
  const samples = maps.filter(m => ['courtyard','grove'].includes(m.id));
  const startingMaps = adventure ? maps.filter(m => ['eldoria','vareon','forest'].includes(m.id)) : walkingOnly ? samples : [...samples].reverse();
  activate(new Simulation(startingMaps, name, { now: () => performance.now() }, walkingOnly ? [] : undefined,undefined,professionSchema.parse(element<HTMLSelectElement>('#profession').value)));
}
element<HTMLFormElement>('#start-form').addEventListener('submit', event => {
  event.preventDefault(); const result = nameSchema.safeParse(ui.name.value);
  if (!result.success) { ui.nameError.textContent = 'Imię musi mieć od 3 do 16 znaków po usunięciu spacji.'; return; }
  ui.nameError.textContent = ''; ui.name.blur(); start(result.data);
});
async function leaveGame():Promise<boolean> {
  resetInput();
  if(playing&&gateway instanceof OnlineGateway&&!await gateway.requestLogout())return false;
  if(adventure&&!onlineMode)saveNow();stopGame();void accountUI?.refresh();return true;
}
function stopGame():void {playing=false;resetInput();gateway?.disconnect();unsubscribe?.();settingsDialog.close();bagDialog.close();npcDialog.close();depotDialog.close();ui.hud.hidden=true;ui.menu.hidden=false;refreshSaveMenu();}
function startOnline(id:string):void {
  adventure=true;walkingOnly=false;
  const endpoint=import.meta.env.VITE_ONLINE_URL as string|undefined??`${location.protocol==='https:'?'wss':'ws'}://${location.host}/online`;
  const next=new OnlineGateway(endpoint,id,(message,failed)=>{
    if(gateway!==next)return;element('#save-status').textContent=message;element('#settings-status').textContent=message;
    ui.hud.dataset.connection=failed?'disconnected':message.startsWith('Łączenie')?'connecting':'online';
    if(failed){stopGame();ui.nameError.textContent=message;void accountUI?.refresh();}
  });activateGateway(next,true);
}
element('#menu-button').addEventListener('click',()=>{void leaveGame();});
element('#settings-leave').addEventListener('click',()=>{void leaveGame();});
element('#settings-logout').addEventListener('click',()=>{void accountUI?.logout();});
element('#settings-button').addEventListener('click',()=>{resetInput();element<HTMLSelectElement>('#settings-vitals-style').value=vitalsStyle;element<HTMLSelectElement>('#settings-graphics-style').value=graphicsChoice.value;element('#settings-status').textContent='';element('#settings-logout').hidden=!onlineMode;settingsDialog.showModal();});
element('#close-settings').addEventListener('click',()=>settingsDialog.close());settingsDialog.addEventListener('close',resetInput);
element('#settings-vitals-style').addEventListener('change',()=>{vitalsChoice.value=element<HTMLSelectElement>('#settings-vitals-style').value;vitalsChoice.dispatchEvent(new Event('change'));});
element('#settings-graphics-style').addEventListener('change',()=>{graphicsChoice.value=element<HTMLSelectElement>('#settings-graphics-style').value;chooseGraphics();});
element('#settings-appearance').addEventListener('click',()=>{settingsDialog.close();toggleBag();element<HTMLDetailsElement>('#appearance').open=true;});
const accountUI=new AccountUI(startOnline,leaveGame,message=>{if(onlineMode&&playing)stopGame();ui.nameError.textContent=message;});
let skillSignature='';
function renderSkills(s:Snapshot):void {
 const signature=JSON.stringify([s.profession,s.skills]);if(signature===skillSignature)return;skillSignature=signature;
 const list=element('#skills-list');list.replaceChildren();for(const kind of ['melee','distance','magic'] as const){const skill=s.skills[kind],required=skillRequired(kind,skill.level,s.profession),card=document.createElement('div'),label=document.createElement('strong'),progress=document.createElement('progress'),detail=document.createElement('span');card.className='skill-card';label.textContent=`${skillNames[kind]}: ${skill.level}`;progress.max=required;progress.value=skill.progress;progress.setAttribute('aria-label',skillNames[kind]);detail.textContent=skill.level===100?'Maksymalny poziom':`${skill.progress} / ${required} · ${Math.floor(skill.progress/required*100)}%`;card.append(label,detail,progress);list.append(card);}
}

element('#continue').addEventListener('click', () => { completionDismissed = true; ui.complete.hidden = true; });
element('#again').addEventListener('click', () => start(snapshot?.name ?? 'Wędrowiec'));
function useAction(action:ActionId):void {
  if(!playing||!ui.complete.hidden||settingsDialog.open || bagDialog.open||npcDialog.open||depotDialog.open)return;
  gateway?.send(action==='attack'?{type:'Attack'}:action==='potion'?{type:'UseItem'}:{type:'Cast',spellId:action});
}
for(const [index,button] of actionButtons.entries()){
  const act=()=>{if(snapshot)useAction(snapshot.actionSlots[index]!);};
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();
    if(snapshot?.actionSlots[index]==='attack'&&playing&&ui.complete.hidden&&!settingsDialog.open && !bagDialog.open&&!npcDialog.open && !depotDialog.open){attackPointers.add(event.pointerId);button.setPointerCapture(event.pointerId);}
    act();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,event=>attackPointers.delete((event as PointerEvent).pointerId));
  button.addEventListener('click',event=>{if(event.detail===0)act();});
}
for (const [id, type] of [['potion', 'UseItem'], ['interact', 'Interact'], ['loot', 'Loot']] as const) {
  const button = element(`#${id}`);
  const act = () => { if (playing && ui.complete.hidden && !settingsDialog.open && !bagDialog.open && !npcDialog.open && !depotDialog.open) gateway?.send({ type }); };
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    act();
  });
  button.addEventListener('click', event => { if (event.detail === 0) act(); });
}
renderActionIcons();
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direction]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); const d = button.dataset.direction as Direction;
    if (playing && ui.complete.hidden && !settingsDialog.open && !bagDialog.open && !npcDialog.open && !depotDialog.open) { pointerDirections.set(event.pointerId, d); button.setPointerCapture(event.pointerId); movement(); }
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, event => pointerDirections.delete((event as PointerEvent).pointerId));
}
const keyDirections: Record<string, Direction> = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
window.addEventListener('keydown', event => {
  if (!playing || event.target instanceof HTMLInputElement) return;
  const key = event.key.toLowerCase();
  if(key==='escape'&&!settingsDialog.open && !bagDialog.open&&!npcDialog.open&&!depotDialog.open){gateway?.send({type:'ClearTarget'});return;}
  if (key === 't' && !event.repeat && !settingsDialog.open && !bagDialog.open && !npcDialog.open && !depotDialog.open) { event.preventDefault(); cycleTarget(); return; }
  if (key === 'i' && !event.repeat) { event.preventDefault(); toggleBag(); return; }
  if (!ui.complete.hidden || settingsDialog.open || bagDialog.open || npcDialog.open || depotDialog.open) return;
  if(/^[1-4]$/.test(key)&&snapshot){event.preventDefault();const action=snapshot.actionSlots[Number(key)-1]!;if(action==='attack')attackKeys.add(key);if(!event.repeat)useAction(action);return;}
  const d = keyDirections[key];
  if (d) { event.preventDefault(); heldKeys.set(key, d); if (!event.repeat) movement(); return; }
  const type = ({ ' ': 'Attack', e: 'Cast', q: 'UseItem', f: 'Interact', r: 'Loot' } as const)[key as ' ' | 'e' | 'q' | 'f' | 'r'];
  if (type) { event.preventDefault(); if(type === 'Attack') attackKeys.add(key); if(!event.repeat) gateway?.send({ type }); }
});
window.addEventListener('keyup', event => { heldKeys.delete(event.key.toLowerCase());attackKeys.delete(event.key.toLowerCase()); });
window.addEventListener('blur', resetInput);
window.addEventListener('resize', resetInput);
document.addEventListener('visibilitychange', () => {
  resetInput();
  if(onlineMode)return;
  if (document.hidden) { if (adventure&&!onlineMode) saveNow(); gateway?.disconnect(); }
  else if (playing && gateway) { unsubscribe = gateway.subscribe(updateUI); gateway.connect(); }
});
window.addEventListener('pagehide', () => { if (adventure&&!onlineMode) saveNow(); clearInterval(movementTimer); gateway?.disconnect(); game.destroy(true); });

let loadoutProfession='';
let spellbookSignature='';
function renderLoadout(s:Snapshot):void {
  const container=element('#loadout-slots');
  if(loadoutProfession!==`${s.profession}:${s.level}`){
    loadoutProfession=`${s.profession}:${s.level}`;container.replaceChildren();
    element('#profession-description').textContent=`${professions[s.profession].name} · ${professions[s.profession].attackName}, zasięg ${professions[s.profession].range}. Czary tej profesji mają własny koszt many i odnowienie.`;
    for(let index=0;index<4;index++){
      const label=document.createElement('label');label.textContent=`Pozycja ${index+1}`;
      const select=document.createElement('select');select.id=`action-choice-${index+1}`;
      for(const id of ['attack',...professions[s.profession].spells,'potion'] as ActionId[]){const option=document.createElement('option');option.value=id;option.textContent=actionName(s,id)+(id==='attack'||id==='potion'?'':` · poz. ${spells[id].level} · ${spells[id].mana} many, ${spells[id].cooldown/1000} s`);option.disabled=id!=='attack'&&id!=='potion'&&s.level<spells[id].level;select.append(option);}
      select.addEventListener('change',()=>gateway?.send({type:'SetActionSlot',slot:index,actionId:select.value}));label.append(select);container.append(label);
    }
  }
  for(let index=0;index<4;index++)element<HTMLSelectElement>(`#action-choice-${index+1}`).value=s.actionSlots[index]!;
  if(spellbookSignature===`${s.profession}:${s.level}`)return;
  spellbookSignature=`${s.profession}:${s.level}`;
  const book=element('#spellbook');book.replaceChildren();
  for(const id of professions[s.profession].spells){
    const spell=spells[id],card=document.createElement('div');card.className='spell-card';card.classList.toggle('locked',s.level<spell.level);
    const icon=document.createElement('span');icon.className='item-icon';icon.innerHTML=actionIcon(id);
    const text=document.createElement('span');text.textContent=`${spell.name} · poziom ${spell.level} · ${spell.mana} many · ${spell.cooldown/1000} s${s.level<spell.level?' · Zablokowany':' · Dostępny'}`;
    card.append(icon,text);book.append(card);
  }
}
function renderAppearance(s:Snapshot):void {
  element('#appearance-profession').textContent=professions[s.profession].name;
  for(const part of outfitParts){
    const input=element<HTMLInputElement>(`#outfit-${part}`);
    if(document.activeElement!==input)input.value=s.appearance[part]??originalColors[s.profession][part];
  }
}
for(const part of outfitParts){
  const input=element<HTMLInputElement>(`#outfit-${part}`);input.setAttribute('aria-label',outfitLabels[part]);
  input.addEventListener('change',()=>{if(snapshot)gateway?.send({type:'SetAppearance',appearance:{...snapshot.appearance,[part]:input.value}});});
}
element('#reset-outfit').addEventListener('click',()=>gateway?.send({type:'SetAppearance',appearance:defaultAppearance()}));
const lootEnabled=element<HTMLInputElement>('#auto-loot-enabled'),lootGold=element<HTMLInputElement>('#auto-loot-gold');
const lootFilter=element('#loot-filter');
for(const [id,item]of Object.entries(items)){
  const row=document.createElement('div');row.className='loot-row';row.dataset.name=item.name.toLocaleLowerCase('pl');
  const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.lootItem=id;input.setAttribute('aria-label',`Zbieraj: ${item.name}`);
  const icon=document.createElement('span');icon.className='item-icon';icon.innerHTML=itemIcon(id as keyof typeof items);label.append(input,icon,document.createTextNode(item.name));
  const select=document.createElement('select');select.dataset.lootDestination=id;select.setAttribute('aria-label',`Plecak dla: ${item.name}`);
  for(const [value,name]of [['main','Główny'],['supplies','Zapasy'],['materials','Materiały']]){const option=document.createElement('option');option.value=value!;option.textContent=name!;select.append(option);}
  row.append(label,select);lootFilter.append(row);
}
function filterLootCatalog():void {
  const query=element<HTMLInputElement>('#loot-search').value.trim().toLocaleLowerCase('pl');let visible=0;
  for(const row of lootFilter.querySelectorAll<HTMLElement>('.loot-row')){row.hidden=!row.dataset.name!.includes(query);if(!row.hidden)visible++;}
  element('#loot-count').textContent=`${visible} / ${Object.keys(items).length} przedmiotów w katalogu`;
}
element('#loot-search').addEventListener('input',filterLootCatalog);filterLootCatalog();
function sendLootSettings():void {
  const destinations=Object.fromEntries(Array.from(lootFilter.querySelectorAll<HTMLSelectElement>('select')).map(select=>[select.dataset.lootDestination,select.value]));
  gateway?.send({type:'SetLootSettings',settings:{enabled:lootEnabled.checked,gold:lootGold.checked,destinations,itemIds:Array.from(lootFilter.querySelectorAll<HTMLInputElement>('input:checked')).map(input=>input.dataset.lootItem)}});
}
for(const [id,checked]of [['loot-select-all',true],['loot-clear-all',false]] as const)element(`#${id}`).addEventListener('click',()=>{
  for(const row of lootFilter.querySelectorAll<HTMLElement>('.loot-row:not([hidden])'))row.querySelector<HTMLInputElement>('input')!.checked=checked;
  sendLootSettings();
});
function renderLootSettings(s:Snapshot):void {
  lootEnabled.checked=s.lootSettings.enabled;lootGold.checked=s.lootSettings.gold;
  for(const input of lootFilter.querySelectorAll<HTMLInputElement>('input'))input.checked=s.lootSettings.itemIds.includes(input.dataset.lootItem as keyof typeof items);
  for(const select of lootFilter.querySelectorAll<HTMLSelectElement>('select'))select.value=s.lootSettings.destinations?.[select.dataset.lootDestination as keyof typeof items]??'main';
}
element('#auto-loot').addEventListener('change',event=>{if((event.target as HTMLElement).id!=='loot-search')sendLootSettings();});
element('#bag-view').addEventListener('change',()=>{if(snapshot)renderInventory(snapshot,command=>gateway?.send(command));});
function renderBag(s: Snapshot): void {
  renderLoadout(s);renderAppearance(s);renderLootSettings(s);
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
  renderInventory(s,command=>gateway?.send(command));
}
function toggleBag(): void {
  resetInput();
  if (settingsDialog.open || bagDialog.open) bagDialog.close();
  else if (snapshot && playing && !npcDialog.open && !depotDialog.open) { renderBag(snapshot); bagDialog.showModal(); }
}
for(const [id,action]of [['bag-button',toggleBag],['close-bag',()=>bagDialog.close()]] as const){
  const button=element(`#${id}`);
  button.addEventListener('pointerdown',event=>{event.preventDefault();action();});
  button.addEventListener('click',event=>{if(event.detail===0)action();});
}
bagDialog.addEventListener('close', resetInput);

function cycleTarget(): void {
  if (!playing || !snapshot || settingsDialog.open || bagDialog.open || npcDialog.open || depotDialog.open || !ui.complete.hidden) return;
  const living = snapshot.creatures.filter(c => c.hp > 0);
  const index = living.findIndex(c => c.id === snapshot?.selectedId);
  if(index===living.length-1&&index>=0){gateway?.send({type:'ClearTarget'});return;}
  const target = living[index+1];
  if (target) gateway?.send({ type: 'Select', targetId: target.id });
}
element('#guide-depot').addEventListener('click',()=>{guidedDepot=true;guidedNpc=undefined;bagDialog.close();resetInput();if(snapshot)updateUI(snapshot);});
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
  const tradeRow=(itemId:keyof typeof items,label:string,command:Parameters<LocalGateway['send']>[0],disabled:boolean)=>{
    const row=document.createElement('div');row.className='trade-row';
    const icon=document.createElement('span');icon.className='item-icon';icon.innerHTML=itemIcon(itemId);
    const name=document.createElement('span');name.textContent=items[itemId].name;
    const button=document.createElement('button');button.textContent=label;button.disabled=disabled;button.addEventListener('click',()=>gateway?.send(command));row.append(icon,name,button);actions.append(row);
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
    tradeRow('potion',`Kup miksturę — ${shopRules.potionPrice} złota`,{type:'Buy',quantity:1},s.gold<shopRules.potionPrice);
    for (const itemId of ['skin','chitin'] as const) {
      const count = s.inventory.filter(i => i.itemId === itemId).reduce((sum,i) => sum+i.quantity,0);
      tradeRow(itemId,`Sprzedaj: ${items[itemId].name} — ${shopRules.materialPrice} złota`,{type:'Sell',itemId,quantity:1},count===0);
    }
  }
  if (!npcDialog.open && !depotDialog.open) npcDialog.showModal();
}
element('#close-npc').addEventListener('click', () => gateway?.send({type:'CloseDialog'}));
npcDialog.addEventListener('cancel', event => { event.preventDefault(); gateway?.send({type:'CloseDialog'}); });
npcDialog.addEventListener('close', resetInput);

function saveNow(explicitRecovery = false): void {
  if (!(gateway instanceof LocalGateway) || !adventure || onlineMode) return;
  lastSaveTime = performance.now();
  if (snapshot) { lastSavedMap = saveLocation(snapshot.mapId,snapshot.player); lastSavedEconomy = JSON.stringify([snapshot.gold,snapshot.quest.status,snapshot.exploration,snapshot.profession,snapshot.actionSlots,snapshot.appearance]); }
  try {
    const data = gateway.exportSave();
    const error = storage.write(data,explicitRecovery);
    element('#save-status').textContent = error ?? 'Przygoda zapisana lokalnie';
    if (!error) { lastSaveTime = performance.now(); lastSavedSignature = persistentSignature(data); lastSavedMap = saveLocation(data.mapId,data.player); lastSavedEconomy = JSON.stringify([data.stash,data.lootSettings,data.inventory,data.gold,data.quest.status,data.exploration,data.profession,data.actionSlots,data.appearance]); }
  } catch { element('#save-status').textContent = 'Nie udało się zapisać. Wyeksportuj zapis lub zgłoś błąd.'; }
}
function persistentSignature(data: SaveData): string {
  return JSON.stringify([data.cityRevision,data.stash,data.lootSettings,data.appearance,data.profession,data.actionSlots,data.name,data.mapId,data.player,data.direction,data.level,data.skills,data.hp,data.mana,data.exp,data.gold,data.kills,data.quest,data.exploration,data.inventory,data.equipment,data.loot,data.maps.map(m => [m.mapId,m.creatures.map(c => [c.id,c.x,c.y,c.hp,c.state])])]);
}
function autosave(s: Snapshot): void {
  if(!(gateway instanceof LocalGateway)||onlineMode)return;
  const economy = JSON.stringify([s.stash,s.lootSettings,s.inventory,s.gold,s.quest.status,s.exploration,s.profession,s.actionSlots,s.appearance]);
  if (saveLocation(s.mapId,s.player) !== lastSavedMap || economy !== lastSavedEconomy || performance.now()-lastSaveTime >= 30000) {
    const data = gateway.exportSave();
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
element('#save-button').addEventListener('click', () => { if (adventure&&!onlineMode) saveNow(); else element('#save-status').textContent = 'Próba i spacer nie są zapisywane.'; });
element('#export-save').addEventListener('click', async () => {
  try {
    const data = adventure && gateway instanceof LocalGateway ? gateway.exportSave() : storage.load().data ?? storage.load().backup;
    if (!data) { element('#save-menu-status').textContent = 'Brak poprawnego zapisu do eksportu.'; return; }
    await exportSave(data);
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
