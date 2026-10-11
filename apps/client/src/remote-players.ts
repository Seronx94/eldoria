import Phaser from 'phaser';
import {movementDuration,type CombatVisual} from '@eldoria/content';
import type {PublicPlayer} from '@eldoria/domain';
import {PublicVitals} from './public-vitals';
import {recolorOutfit} from './outfit-colors';
interface View {sprite:Phaser.GameObjects.Sprite;vitals:PublicVitals;texture:Phaser.Textures.CanvasTexture;signature:string;position:string;until:number;tween?:Phaser.Tweens.Tween;actionUntil:number;}
/** Remote actors render public health only; never draw owner mana/arcs. */
export class RemotePlayers {
 private views=new Map<string,View>();
 constructor(private scene:Phaser.Scene){}
 sprite(id:string):Phaser.GameObjects.Sprite|undefined {return this.views.get(id)?.sprite;}
 action(id:string,effect:CombatVisual):void {const view=this.views.get(id);if(view){view.actionUntil=this.scene.time.now+280;view.sprite.anims.stop();view.sprite.setFrame(['down','left','right','up'].indexOf(view.sprite.getData('direction') as string)*3+(effect==='sword'?2:1));}}
 update(players:PublicPlayer[],colorful:boolean,owner?:{x:number;y:number}):void {
  const ids=new Set(players.map(p=>p.id));for(const [id,view]of this.views)if(!ids.has(id)){this.remove(id,view);}
  for(const p of players){
   let view=this.views.get(p.id);
   if(!view){
    const key=`remote-${p.id}`,texture=this.scene.textures.createCanvas(key,96,192);if(!texture)throw new Error('Brak tekstury gracza');texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    for(let row=0;row<4;row++)for(let col=0;col<3;col++)texture.add(row*3+col,0,col*32,row*48,32,48);
    for(const [row,d]of ['down','left','right','up'].entries())this.scene.anims.create({key:`${key}-${d}`,frames:this.scene.anims.generateFrameNumbers(key,{start:row*3,end:row*3+2}),frameRate:10,repeat:-1});
    view={sprite:this.scene.add.sprite(p.player.x*32+16,p.player.y*32+32,key,0).setOrigin(.5,1),vitals:new PublicVitals(this.scene,12),texture,signature:'',position:'',until:0,actionUntil:0};this.views.set(p.id,view);
   }
   const source=p.profession==='knight'?(colorful?'colorful-wanderer':'wanderer'):`colorful-${p.profession}`,signature=JSON.stringify([source,p.appearance]);
   if(view.signature!==signature){view.signature=signature;const ctx=view.texture.context;ctx.clearRect(0,0,96,192);ctx.imageSmoothingEnabled=false;ctx.drawImage(this.scene.textures.get(source).getSourceImage() as CanvasImageSource,0,0);const data=ctx.getImageData(0,0,96,192);data.data.set(recolorOutfit(data.data,p.profession,p.appearance));ctx.putImageData(data,0,0);view.texture.refresh();}
   const position=`${p.player.x},${p.player.y}`,x=p.player.x*32+16,y=p.player.y*32+32;
   if(position!==view.position){const previous=view.position.split(',').map(Number);view.tween?.stop();if(view.position&&Math.hypot(view.sprite.x-x,view.sprite.y-y)<=64){view.tween=this.scene.tweens.add({targets:view.sprite,x,y,duration:movementDuration({x:previous[0]!,y:previous[1]!},p.player)+20,ease:'Linear'});view.until=this.scene.time.now+movementDuration({x:previous[0]!,y:previous[1]!},p.player)+20;}else view.sprite.setPosition(x,y);view.position=position;}
   view.sprite.setData('direction',p.direction).setDepth(view.sprite.y);
   if(this.scene.time.now>=view.actionUntil){if(this.scene.time.now<view.until)view.sprite.play(`remote-${p.id}-${p.direction}`,true);else{view.sprite.anims.stop();view.sprite.setFrame(['down','left','right','up'].indexOf(p.direction)*3);}}
   const sharesOwner=p.player.x===owner?.x&&p.player.y===owner?.y;
   const firstOnTile=players.find(other=>other.player.x===p.player.x&&other.player.y===p.player.y)?.id===p.id;
   view.vitals.draw(`${p.name} · lvl: ${p.level}`,p.hp,p.maxHp,view.sprite.x,view.sprite.y,!sharesOwner&&firstOnTile,view.sprite.displayHeight);
  }
 }
 clear():void {for(const [id,view]of this.views)this.remove(id,view);}
 private remove(id:string,view:View):void {view.tween?.stop();view.sprite.destroy();view.vitals.destroy();for(const d of ['down','left','right','up'])this.scene.anims.remove(`remote-${id}-${d}`);this.scene.textures.remove(`remote-${id}`);this.views.delete(id);}
 get poses():{id:string;x:number;y:number;headTop:number;hpVisible:boolean;nameColor:string;label:string;nameBottom:number;hpTop:number;hpBottom:number;centerX:number}[]{return [...this.views].map(([id,v])=>{const p=v.vitals.presentation;return {id,x:v.sprite.x,y:v.sprite.y,headTop:v.sprite.getBounds().top,hpVisible:p.visible,nameColor:p.color,label:p.label,nameBottom:p.nameBottom,hpTop:p.hpTop,hpBottom:p.hpBottom,centerX:p.centerX};});}
}
