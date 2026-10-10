import Phaser from 'phaser';
import { importMap, validateMaps, rules, monsters, items, type WorldMap } from '@eldoria/content';
import { nameSchema, type Direction } from '@eldoria/protocol';
import { Simulation, LocalGateway, type Snapshot } from '@eldoria/domain';
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
const bagDialog = element<HTMLDialogElement>('#bag');
let completionDismissed = false;
let bagSignature = '';
const pointerDirections = new Map<number, Direction>();
const heldKeys = new Map<string, Direction>();
function resetInput(): void { pointerDirections.clear(); heldKeys.clear(); }
function direction(): Direction | undefined { return [...pointerDirections.values()].at(-1) ?? [...heldKeys.values()].at(-1); }
function movement(): void {
  const d = direction();
  if (!ui.complete.hidden || bagDialog.open) return;
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
    for (const key of ['courtyard', 'grove']) this.load.json(key, `${base}${key}.json`);
    this.load.on('loaderror', () => { ui.loading.textContent = 'Nie udało się załadować świata. Odśwież stronę i sprawdź połączenie.'; });
  }
  create(): void {
    try {
      maps = ['courtyard', 'grove'].map(id => importMap(this.cache.json.get(id)));
      validateMaps(maps, new Set(['tiles.png']));
      for (const key of ['tiles', 'wanderer', 'tree', 'house', 'rat', 'beetle', 'wolf']) {
        if (!this.textures.exists(key)) throw new Error(`Brak grafiki ${key}`);
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      for (const [index, d] of ['down', 'left', 'right', 'up'].entries()) {
        this.anims.create({ key: `walk-${d}`, frames: this.anims.generateFrameNumbers('wanderer', { start: index * 3, end: index * 3 + 2 }), frameRate: 10, repeat: -1 });
      }
      this.scene.start('World'); this.scene.start('Menu');
    } catch (error) { ui.loading.textContent = `Błąd zawartości: ${error instanceof Error ? error.message : 'nieznany'}`; }
  }
}
class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }
  create(): void { ui.loading.hidden = true; ui.menu.hidden = false; }
}
class World extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Sprite;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private creatureSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private bars!: Phaser.GameObjects.Graphics;
  private mapId = '';
  private playerPosition = '';
  private movingUntil = 0;
  private movingTween?: Phaser.Tweens.Tween;
  constructor() { super('World'); }
  create(): void {
    this.bars = this.add.graphics().setDepth(10000);
    this.hero = this.add.sprite(13 * 32 + 16, 11 * 32 + 32, 'wanderer', 0).setOrigin(.5, 1);
    this.hero.setDepth(this.hero.y);
    this.renderMap(maps[0]!);
    this.cameras.main.startFollow(this.hero, true, .12, .12);
    this.resize();
    this.scale.on('resize', this.resize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.resize, this));
  }
  private resize(): void {
    const w = this.scale.width, h = this.scale.height;
    const top = playing ? (h <= 600 ? 60 : 76) : 0;
    const bottom = playing ? (h <= 600 ? 104 : 168) : 0;
    this.cameras.main.setViewport(0, top, w, Math.max(1, h - top - bottom)).setZoom(w >= 1000 && h >= 600 ? 2 : 1).setRoundPixels(true);
  }
  private renderMap(map: WorldMap): void {
    this.mapId = map.id;
    for (const object of this.objects) object.destroy();
    this.objects = []; this.creatureSprites.clear(); this.bars.clear();
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const index = y * map.width + x;
      for (const [data, depth] of [[map.ground, -100], [map.details, -90], [map.above, 9999]] as const) {
        const gid = data[index];
        if (gid) this.objects.push(this.add.image(x * 32, y * 32, 'tiles', gid - 1).setOrigin(0).setDepth(depth));
      }
    }
    for (const d of map.decorations) this.objects.push(this.add.image(d.x * 32 + 16, d.y * 32 + 32, d.kind).setOrigin(.5, 1).setDepth(d.y * 32 + 33));
    for (const p of map.portals) {
      const enter = () => {
        if (playing && ui.complete.hidden && !bagDialog.open) gateway?.send({ type: 'Interact' });
      };
      const glow = this.add.graphics().setDepth(-10);
      glow.setInteractive(new Phaser.Geom.Ellipse(p.x * 32 + 16, p.y * 32 + 16, 48, 48), Phaser.Geom.Ellipse.Contains);
      glow.input!.cursor = 'pointer';
      glow.on('pointerdown', enter);
      glow.lineStyle(2, 0xd1c785, .9).strokeEllipse(p.x * 32 + 16, p.y * 32 + 16, 27, 18);
      glow.fillStyle(0xa7c7a0, .5).fillEllipse(p.x * 32 + 16, p.y * 32 + 16, 17, 10);
      this.objects.push(glow);
      const label = this.add.text(p.x * 32 + 16, p.y * 32 - 14, p.targetMapId === 'grove' ? 'DO ZAGAJNIKA' : 'NA DZIEDZINIEC', { fontFamily: 'monospace', fontSize: '10px', color: '#efe2ac', backgroundColor: '#213b32' }).setOrigin(.5).setInteractive({ useHandCursor: true });
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
    const changedMap = this.mapId !== s.mapId;
    if (changedMap) this.renderMap(maps.find(m => m.id === s.mapId)!);
    const position = `${s.player.x},${s.player.y}`;
    if (position !== this.playerPosition) {
      const first = this.playerPosition === '';
      this.playerPosition = position;
      this.movingTween?.stop();
      const x = s.player.x * 32 + 16, y = s.player.y * 32 + 32;
      if (first) { this.hero.setPosition(x, y); this.cameras.main.centerOn(x, y); }
      else {
        this.movingTween = this.tweens.add({ targets: this.hero, x, y, duration: rules.stepMs, ease: 'Linear' });
        this.movingUntil = this.time.now + rules.stepMs;
      }
    }
    this.hero.setDepth(this.hero.y);
    if (this.time.now < this.movingUntil) this.hero.play(`walk-${s.direction}`, true);
    else { this.hero.anims.stop(); this.hero.setFrame(['down', 'left', 'right', 'up'].indexOf(s.direction) * 3); }
    this.bars.clear();
    for (const loot of s.loot.filter(l => l.mapId === s.mapId)) {
      this.bars.fillStyle(0xdac083).fillCircle(loot.x * 32 + 16, loot.y * 32 + 24, 5);
      this.bars.lineStyle(1, 0x594b33).strokeCircle(loot.x * 32 + 16, loot.y * 32 + 24, 5);
    }
    for (const creature of s.creatures) {
      let sprite = this.creatureSprites.get(creature.id);
      if (!sprite) {
        sprite = this.add.sprite(creature.x * 32 + 16, creature.y * 32 + 32, creature.kind).setOrigin(.5, 1).setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => { if (playing && ui.complete.hidden && !bagDialog.open) gateway?.send({ type: 'Select', targetId: creature.id }); });
        this.creatureSprites.set(creature.id, sprite); this.objects.push(sprite);
      }
      sprite.setVisible(creature.hp > 0);
      if (creature.hp === 0) continue;
      sprite.x += (creature.x * 32 + 16 - sprite.x) * .25;
      sprite.y += (creature.y * 32 + 32 - sprite.y) * .25;
      sprite.setDepth(sprite.y);
      const selected = creature.id === s.selectedId;
      if (selected) this.bars.lineStyle(1, 0xefd18a).strokeEllipse(sprite.x, sprite.y - 3, 28, 13);
      this.bars.fillStyle(0x263c35).fillRect(sprite.x - 12, sprite.y - 30, 24, 3);
      this.bars.fillStyle(selected ? 0xdac083 : 0x9ba582).fillRect(sprite.x - 12, sprite.y - 30, 24 * creature.hp / monsters[creature.kind].hp, 3);
    }
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
  ui.mapName.textContent = s.mapId === 'courtyard' ? 'DZIEDZINIEC WZORCOWY' : 'ZAGAJNIK WZORCOWY';
  ui.objective.textContent = `${s.defeatedKinds.length} / 3`;
  ui.message.textContent = s.message;
  ui.rewards.textContent = `${s.exp} EXP · ${s.gold} złota (próba)`;
  ui.potionCount.textContent = `Q · ${s.potions} SZT.`;
  const target = s.creatures.find(c => c.id === s.selectedId && c.hp > 0);
  const map = maps.find(m => m.id === s.mapId)!;
  const distance = (p: { x: number; y: number }) => Math.abs(p.x - s.player.x) + Math.abs(p.y - s.player.y);
  const portal = [...map.portals].sort((a, b) => distance(a) - distance(b))[0];
  const gateHint = portal ? `Brama ${portal.x > s.player.x ? '→' : portal.x < s.player.x ? '←' : ''}${portal.y > s.player.y ? '↓' : portal.y < s.player.y ? '↑' : ''} · ${distance(portal)} kratek · Przejdź (F)` : '';
  const interact = element<HTMLButtonElement>('#interact');
  interact.classList.toggle('ready', !!portal && distance(portal) <= 1);
  interact.title = portal && distance(portal) <= 1 ? 'Brama w zasięgu — kliknij Przejdź lub bramę' : 'Podejdź obok bramy; można też kliknąć ją na mapie';
  if (walkingOnly) ui.targetLabel.textContent = `Spacer bez potworów · ${gateHint}`;
  else if (!map.combatAllowed) ui.targetLabel.textContent = `Bezpieczny dziedziniec · Potwory za bramą · ${gateHint}`;
  else if (target) ui.targetLabel.textContent = `${monsters[target.kind].name} · ${target.hp} HP · ${target.x > s.player.x ? '→' : target.x < s.player.x ? '←' : ''}${target.y > s.player.y ? '↓' : target.y < s.player.y ? '↑' : ''} ${distance(target)} kratek`;
  else {
    const count = s.creatures.filter(c => c.hp > 0).length;
    ui.targetLabel.textContent = count ? `Potwory: ${count} · Dotknij stworzenia lub wybierz Cel (T)` : 'Potwory odradzają się — zaczekaj lub rozpocznij nową próbę';
  }
  ui.complete.hidden = !s.complete || completionDismissed;
  if (!ui.complete.hidden) resetInput();
  if (bagDialog.open) renderBag(s);
  // Accessible state for UI tests; never used to decide simulation outcomes.
  ui.hud.dataset.position = `${s.player.x},${s.player.y}`;
  ui.hud.dataset.map = s.mapId;
}
function start(name: string): void {
  unsubscribe?.(); gateway?.disconnect(); resetInput();
  walkingOnly = element<HTMLInputElement>('#walk-mode').checked;
  const startingMaps = walkingOnly ? maps : [...maps.filter(m => m.combatAllowed), ...maps.filter(m => !m.combatAllowed)];
  gateway = new LocalGateway(new Simulation(startingMaps, name, { now: () => performance.now() }, walkingOnly ? [] : undefined));
  unsubscribe = gateway.subscribe(updateUI); gateway.connect();
  completionDismissed = false; ui.complete.hidden = true; playing = true; ui.menu.hidden = true; ui.hud.hidden = false;
}
element<HTMLFormElement>('#start-form').addEventListener('submit', event => {
  event.preventDefault(); const result = nameSchema.safeParse(ui.name.value);
  if (!result.success) { ui.nameError.textContent = 'Imię musi mieć od 3 do 16 znaków po usunięciu spacji.'; return; }
  ui.nameError.textContent = ''; ui.name.blur(); start(result.data);
});
element('#menu-button').addEventListener('click', () => {
  playing = false; resetInput(); gateway?.disconnect(); unsubscribe?.();
  ui.hud.hidden = true; ui.menu.hidden = false;
});
element('#continue').addEventListener('click', () => { completionDismissed = true; ui.complete.hidden = true; });
element('#again').addEventListener('click', () => start(snapshot?.name ?? 'Wędrowiec'));
for (const [id, type] of [['attack', 'Attack'], ['cast', 'Cast'], ['potion', 'UseItem'], ['interact', 'Interact'], ['loot', 'Loot']] as const) {
  const button = element(`#${id}`);
  const act = () => { if (playing && ui.complete.hidden && !bagDialog.open) gateway?.send({ type }); };
  button.addEventListener('pointerdown', event => { event.preventDefault(); act(); });
  button.addEventListener('click', event => { if (event.detail === 0) act(); });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direction]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); const d = button.dataset.direction as Direction;
    if (playing && ui.complete.hidden && !bagDialog.open) { pointerDirections.set(event.pointerId, d); button.setPointerCapture(event.pointerId); movement(); }
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, event => pointerDirections.delete((event as PointerEvent).pointerId));
}
const keyDirections: Record<string, Direction> = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
window.addEventListener('keydown', event => {
  if (!playing || event.target instanceof HTMLInputElement) return;
  const key = event.key.toLowerCase();
  if (key === 't' && !event.repeat && !bagDialog.open) { event.preventDefault(); cycleTarget(); return; }
  if (key === 'i' && !event.repeat) { event.preventDefault(); toggleBag(); return; }
  if (!ui.complete.hidden || bagDialog.open) return;
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
  if (document.hidden) gateway?.disconnect();
  else if (playing && gateway) { unsubscribe = gateway.subscribe(updateUI); gateway.connect(); }
});
window.addEventListener('pagehide', () => { clearInterval(movementTimer); gateway?.disconnect(); game.destroy(true); });

function renderBag(s: Snapshot): void {
  const signature = JSON.stringify([s.inventory, s.equipment, s.gold, s.exp]);
  if (signature === bagSignature) return;
  bagSignature = signature;
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
  else if (snapshot && playing) { renderBag(snapshot); bagDialog.showModal(); }
}
element('#bag-button').addEventListener('click', toggleBag);
element('#close-bag').addEventListener('click', () => bagDialog.close());
bagDialog.addEventListener('close', resetInput);

function cycleTarget(): void {
  if (!playing || !snapshot || bagDialog.open || !ui.complete.hidden) return;
  const living = snapshot.creatures.filter(c => c.hp > 0);
  const index = living.findIndex(c => c.id === snapshot?.selectedId);
  const target = living[(index + 1) % living.length];
  if (target) gateway?.send({ type: 'Select', targetId: target.id });
}
element('#cycle-target').addEventListener('pointerdown', event => { event.preventDefault(); cycleTarget(); });
element('#cycle-target').addEventListener('click', event => { if (event.detail === 0) cycleTarget(); });
