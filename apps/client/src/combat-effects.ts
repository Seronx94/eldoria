import Phaser from 'phaser';
import type { CombatEvent } from '@eldoria/domain';
type Sprite = Phaser.GameObjects.Sprite;
interface Effect { root: Phaser.GameObjects.Container; born: number; duration: number; draw: (age: number) => void }
/** Presentation of confirmed domain events; never applies damage or changes positions. */
export class CombatEffects {
  private effects: Effect[] = [];
  private flashes = new Map<Sprite, number>();
  constructor(private scene: Phaser.Scene) {}
  get count(): number { return this.effects.length; }
  clear(): void {
    for (const effect of this.effects) effect.root.destroy();
    for (const sprite of this.flashes.keys()) if (sprite.active) sprite.clearTint();
    this.effects = []; this.flashes.clear();
  }
  private add(duration: number, draw: (graphics: Phaser.GameObjects.Graphics, age: number, root: Phaser.GameObjects.Container) => void): void {
    if (this.effects.length >= 32) this.effects.shift()!.root.destroy();
    const graphics = this.scene.add.graphics();
    const root = this.scene.add.container(0, 0, [graphics]).setDepth(10001);
    this.effects.push({ root, born: this.scene.time.now, duration, draw: age => { graphics.clear(); draw(graphics, age, root); } });
  }
  play(event: CombatEvent, source: Sprite | undefined, target: Sprite | undefined): void {
    const sx = source?.x ?? event.from.x * 32 + 16, sy = (source?.y ?? event.from.y * 32 + 32) - 18;
    const tx = target?.x ?? event.to.x * 32 + 16, ty = (target?.y ?? event.to.y * 32 + 32) - 16;
    const angle = Math.atan2(ty-sy,tx-sx);
    const projectileMs = event.kind === 'spell' ? Math.min(260, 110 + Math.hypot(tx-sx,ty-sy)) : 0;
    this.add(event.kind === 'spell' ? projectileMs + 220 : 280, (g, age) => {
      if (event.kind === 'spell' && age < projectileMs) {
        const progress = age / projectileMs;
        for (let tail = 4; tail >= 0; tail--) {
          const t = Math.max(0, progress-tail*.07), x = Math.round(sx+(tx-sx)*t), y = Math.round(sy+(ty-sy)*t);
          g.fillStyle(tail ? 0xff8f39 : 0xffefad, 1-tail*.15).fillRect(x-2,y-2,tail ? 3 : 5,tail ? 3 : 5);
        }
        g.fillStyle(0xffcc64).fillRect(Math.round(sx)-3,Math.round(sy)-3,6,6);
      } else if (event.kind === 'spell') {
        const p = (age-projectileMs)/220;
        for (let i=0;i<8;i++) {
          const a=i*Math.PI/4, radius=4+p*16;
          g.fillStyle(i%2 ? 0xffaa39 : 0xfff4be,1-p).fillRect(Math.round(tx+Math.cos(a)*radius)-2,Math.round(ty+Math.sin(a)*radius)-2,4,4);
        }
      } else if (event.kind === 'melee') {
        const p=age/280, swing=angle-1.1+p*2.2;
        for(let trail=0;trail<6;trail++) {
          const a=swing-trail*.12, r=24;
          g.fillStyle(0xffe8a3,(1-p)*(1-trail/7)).fillRect(Math.round(sx+Math.cos(a)*r)-2,Math.round(sy+Math.sin(a)*r)-2,4,4);
        }
        g.lineStyle(4,0x26323a).lineBetween(Math.round(sx+Math.cos(swing)*8),Math.round(sy+Math.sin(swing)*8),Math.round(sx+Math.cos(swing)*25),Math.round(sy+Math.sin(swing)*25));
        g.lineStyle(2,0xe5f4ee).lineBetween(Math.round(sx+Math.cos(swing)*8),Math.round(sy+Math.sin(swing)*8),Math.round(sx+Math.cos(swing)*25),Math.round(sy+Math.sin(swing)*25));
        g.fillStyle(0xe6b75b).fillRect(Math.round(sx+Math.cos(swing)*7)-2,Math.round(sy+Math.sin(swing)*7)-2,4,4);
      } else {
        const p=age/280;
        for(let claw=0;claw<3;claw++) g.lineStyle(2,0xffb28e,1-p).lineBetween(Math.round(tx)-7+claw*5,Math.round(ty)-10,Math.round(tx)-12+claw*5,Math.round(ty)+4);
      }
    });
    // The simulation resolves hits immediately; the brief flash reports that confirmed hit.
    if (target?.active) { target.setTintFill(0xffedd0); this.flashes.set(target,this.scene.time.now+100); }
    const text=this.scene.add.text(Math.round(tx),Math.round(ty)-18,`−${event.damage}`,{fontFamily:'monospace',fontSize:'12px',color:event.kind === 'monster' ? '#ffb09e' : '#fff0b1',stroke:'#17251f',strokeThickness:3}).setOrigin(.5);
    const root=this.scene.add.container(0,0,[text]).setDepth(10002);
    if(this.effects.length>=32)this.effects.shift()!.root.destroy();
    this.effects.push({root,born:this.scene.time.now,duration:550,draw:age=>{text.y=Math.round(ty)-18-Math.floor(age/35);text.setAlpha(Math.min(1,(550-age)/150));}});
  }
  update(): void {
    const now=this.scene.time.now;
    this.effects=this.effects.filter(effect=>{
      const age=now-effect.born;
      if(age>=effect.duration){effect.root.destroy();return false;}
      effect.draw(age);return true;
    });
    for(const [sprite,end] of this.flashes) if(now>=end || !sprite.active){if(sprite.active)sprite.clearTint();this.flashes.delete(sprite);}
  }
}
