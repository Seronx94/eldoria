import Phaser from 'phaser';
import type { CombatEvent } from '@eldoria/domain';
type Sprite = Phaser.GameObjects.Sprite;
interface Effect { root: Phaser.GameObjects.Container; born: number; duration: number; draw: (age: number) => void }
/** Presentation of confirmed domain events; never applies damage or changes positions. */
export class CombatEffects {
  private effects: Effect[] = [];
  private flashes = new Map<Sprite, number>();
  constructor(private scene: Phaser.Scene) {}
  get types():string[] {return [...new Set(this.effects.map(e=>e.root.name))];}
  get count(): number { return this.effects.length; }
  clear(): void {
    for (const effect of this.effects) effect.root.destroy();
    for (const sprite of this.flashes.keys()) if (sprite.active) sprite.clearTint();
    this.effects = []; this.flashes.clear();
  }
  private add(duration: number, draw: (graphics: Phaser.GameObjects.Graphics, age: number, root: Phaser.GameObjects.Container) => void,name=""): void {
    if (this.effects.length >= 32) this.effects.shift()!.root.destroy();
    const graphics = this.scene.add.graphics();
    const root = this.scene.add.container(0, 0, [graphics]).setDepth(10001);
    root.name=name;this.effects.push({ root, born: this.scene.time.now, duration, draw: age => { graphics.clear(); draw(graphics, age, root); } });
  }
  play(event: CombatEvent, source: Sprite | undefined, target: Sprite | undefined,resolveTarget:(id:string)=>Sprite|undefined=()=>target): void {
    const sx=source?.x??event.from.x*32+16,sy=(source?.y??event.from.y*32+32)-18;
    const area=['fireball','volley','spin','frost'].includes(event.effect);
    const tx=area?event.to.x*32+16:target?.x??event.to.x*32+16,ty=area?event.to.y*32+16:(target?.y??event.to.y*32+32)-16;
    const angle=event.targetId===null?({up:-Math.PI/2,down:Math.PI/2,left:Math.PI,right:0})[event.direction]:Math.atan2(ty-sy,tx-sx);
    const color=event.effect==='frost'?0x8eeaff:event.effect==='heal'?0x9bf09b:event.effect==='guard'?0x8abcec:event.effect==='bolt'?0xc6a2ff:event.effect==='blade-wave'?0xffdf8e:0xffb759;
    if(event.kind==='spell'&&!['spin','guard','heal','frost'].includes(event.effect))this.add(400,(g,age)=>{
      const p=age/400;g.lineStyle(2,color,1-p).strokeEllipse(sx,sy+16,28+p*14,12+p*6);
      for(let i=0;i<6;i++){const a=i*Math.PI/3+p*Math.PI*2;g.fillStyle(color,1-p).fillRect(Math.round(sx+Math.cos(a)*12)-1,Math.round(sy+Math.sin(a)*6-p*18)-1,3,3);}
    },event.effect);
    const projectiles=['arrow','power-arrow','bolt','blade-wave','spark','fireball'];
    if(projectiles.includes(event.effect)){
      const flight=Math.min(420,150+Math.hypot(tx-sx,ty-sy)),burst=event.effect==='fireball'?380:220;
      this.add(flight+burst,(g,age)=>{
        if(age<flight){
          const p=age/flight,x=Math.round(sx+(tx-sx)*p),y=Math.round(sy+(ty-sy)*p);
          if(event.effect==='arrow'||event.effect==='power-arrow'){
            // Bow and drawing string are visible at the source; the arrow points along its flight.
            const v=(r:number,a=angle)=>({x:Math.round(sx+Math.cos(a)*r),y:Math.round(sy+Math.sin(a)*r)});
            const a=v(13,angle-1),b=v(21),c=v(13,angle+1);
            g.lineStyle(3,0xc59b5e).lineBetween(a.x,a.y,b.x,b.y).lineBetween(b.x,b.y,c.x,c.y);
            g.lineStyle(1,0xf8ecca).lineBetween(a.x,a.y,Math.round(sx),Math.round(sy)).lineBetween(Math.round(sx),Math.round(sy),c.x,c.y);
            g.lineStyle(event.effect==='power-arrow'?3:2,color).lineBetween(Math.round(x-Math.cos(angle)*14),Math.round(y-Math.sin(angle)*14),x,y);
            for(const side of [-1,1])g.lineStyle(2,0xf6f2d8).lineBetween(x,y,Math.round(x-Math.cos(angle+side*.55)*7),Math.round(y-Math.sin(angle+side*.55)*7));
            if(event.effect==='power-arrow')g.lineStyle(2,0xffec95,.7).strokeCircle(x,y,6);
          }else if(event.effect==='blade-wave'){
            g.lineStyle(3,color).beginPath().arc(x,y,12,angle-.9,angle+.9).strokePath();
            g.lineStyle(1,0xffffdf).beginPath().arc(x,y,8,angle-.9,angle+.9).strokePath();
          }else{
            for(let tail=4;tail>=0;tail--){const t=Math.max(0,p-tail*.06),xx=Math.round(sx+(tx-sx)*t),yy=Math.round(sy+(ty-sy)*t);g.fillStyle(tail?color:0xfff6e0,1-tail*.15).fillRect(xx-2,yy-2,tail?3:event.effect==='fireball'?10:5,tail?3:event.effect==='fireball'?10:5);}
            if(event.effect==='bolt'){g.lineStyle(3,0x98643e).lineBetween(sx,sy+8,sx+Math.cos(angle)*13,sy+Math.sin(angle)*13);g.fillStyle(0xbceaff).fillCircle(sx+Math.cos(angle)*14,sy+Math.sin(angle)*14,4);}
          }
        }else{
          const p=(age-flight)/burst,radius=event.effect==='fireball'?event.radius*32:16;
          if(event.effect==='fireball')g.lineStyle(3,0xff904a,1-p).strokeCircle(tx,ty,6+p*radius);
          for(let i=0;i<10;i++){const a=i*Math.PI/5,r=4+p*radius;g.fillStyle(i%2?color:0xfff4cc,1-p).fillRect(Math.round(tx+Math.cos(a)*r)-2,Math.round(ty+Math.sin(a)*r)-2,4,4);}
        }
      },event.effect);
    }else if(event.effect==='spin')this.add(550,(g,age)=>{
      const p=age/550;g.lineStyle(2,color,1-p).strokeEllipse(sx,sy+14,64,32);
      for(let i=0;i<2;i++){const a=p*Math.PI*4+i*Math.PI;g.lineStyle(3,0xfff3c5,1-p).lineBetween(sx+Math.cos(a)*12,sy+Math.sin(a)*12,sx+Math.cos(a)*32,sy+Math.sin(a)*32);}
    },event.effect);
    else if(event.effect==='frost')this.add(700,(g,age)=>{
      const p=age/700,r=p*event.radius*32;g.lineStyle(2,color,1-p).strokeEllipse(sx,sy+16,r*2,r);
      for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.round(sx+Math.cos(a)*r),y=Math.round(sy+Math.sin(a)*r*.6);g.lineStyle(2,color,1-p).lineBetween(x-4,y,x+4,y).lineBetween(x,y-6,x,y+6);g.fillStyle(0xf3ffff,1-p).fillRect(x-2,y-2,4,4);}
    },event.effect);
    else if(event.effect==='volley')this.add(650,(g,age)=>{
      const p=age/650;g.lineStyle(2,color,1-p).strokeEllipse(tx,ty+12,event.radius*64,event.radius*32);
      for(let i=0;i<7;i++){const x=tx+((i*17)%57)-28,y=ty-60+Math.min(1,p*1.8)*72+((i*13)%23)-12;g.lineStyle(2,0xf8d591,1-p).lineBetween(x,y-14,x,y);g.lineStyle(2,0xebf4dd,1-p).lineBetween(x-4,y-5,x,y).lineBetween(x+4,y-5,x,y);}
    },event.effect);
    else if(event.effect==='guard'||event.effect==='heal')this.add(800,(g,age)=>{
      const p=age/800;g.lineStyle(2,color,1-p).strokeEllipse(sx,sy+16,34+p*10,16+p*5);
      if(event.effect==='guard'){g.lineStyle(3,color,1-p).strokePoints([{x:sx-12,y:sy-14},{x:sx+12,y:sy-14},{x:sx+12,y:sy+3},{x:sx,y:sy+16},{x:sx-12,y:sy+3}],true);}
      else for(let i=0;i<5;i++){const x=sx+Math.cos(i*1.2+p*5)*16,y=sy+8-p*36;g.lineStyle(2,color,1-p).lineBetween(x-3,y,x+3,y).lineBetween(x,y-3,x,y+3);}
    },event.effect);
    else this.add(280,(g,age)=>{
      const p=age/280;
      if(event.effect==='sword'){
        const swing=angle-1.1+p*2.2;for(let i=0;i<6;i++){const a=swing-i*.12;g.fillStyle(0xffe8a3,(1-p)*(1-i/7)).fillRect(Math.round(sx+Math.cos(a)*24)-2,Math.round(sy+Math.sin(a)*24)-2,4,4);}
        g.lineStyle(3,0xe5f4ee).lineBetween(sx+Math.cos(swing)*8,sy+Math.sin(swing)*8,sx+Math.cos(swing)*25,sy+Math.sin(swing)*25);g.fillStyle(0xe6b75b).fillRect(sx+Math.cos(swing)*7-2,sy+Math.sin(swing)*7-2,4,4);
      }else for(let claw=0;claw<3;claw++)g.lineStyle(2,0xffb28e,1-p).lineBetween(tx-7+claw*5,ty-10,tx-12+claw*5,ty+4);
    },event.effect);
    for(const hit of event.hits)this.showHit(hit.damage,resolveTarget(hit.targetId),hit.to,event.kind==='monster');
    if(event.healing>0)this.number(sx,sy-18,`+${event.healing}`,'#a7f2ac');
  }
  private showHit(damage:number,target:Sprite|undefined,to:{x:number;y:number},monster:boolean):void {
    if(damage<=0)return;
    if(target?.active){target.setTintFill(0xffedd0);this.flashes.set(target,this.scene.time.now+100);}
    this.number(target?.x??to.x*32+16,(target?.y??to.y*32+32)-34,`−${damage}`,monster?'#ffb09e':'#fff0b1');
  }
  private number(x:number,y:number,value:string,color:string):void {
    const text=this.scene.add.text(Math.round(x),Math.round(y),value,{fontFamily:'monospace',fontSize:'12px',color,stroke:'#17251f',strokeThickness:3}).setOrigin(.5);
    const root=this.scene.add.container(0,0,[text]).setDepth(10002);root.name='hit';
    if(this.effects.length>=32)this.effects.shift()!.root.destroy();
    this.effects.push({root,born:this.scene.time.now,duration:550,draw:age=>{text.y=Math.round(y)-Math.floor(age/35);text.setAlpha(Math.min(1,(550-age)/150));}});
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
