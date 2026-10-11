import Phaser from 'phaser';
import {healthDisplay} from './health-display';
import {createNameplate} from './nameplate';
/** Public presentation accepts health only. Owner mana/arcs belong to HeroVitals. */
export class PublicVitals {
 private graphics:Phaser.GameObjects.Graphics;
 private name:Phaser.GameObjects.Text;
 private hpBounds={top:0,bottom:0,centerX:0};
 constructor(scene:Phaser.Scene,fontSize=11){
  this.graphics=scene.add.graphics().setDepth(10001);
  this.name=createNameplate(scene,fontSize,10002);
 }
 draw(label:string,hp:number,maxHp:number,x:number,y:number,selected:boolean,actorHeight=32):void {
  const health=healthDisplay(hp,maxHp),visible=hp>0&&(selected||hp<maxHp);
  this.graphics.clear().setVisible(visible);this.name.setColor(health.css).setVisible(visible);
  if(!visible)return;
  x=Math.round(x);y=Math.round(y);
  const top=y-actorHeight-7;
  this.name.setText(label).setColor(health.css).setPosition(x,top-4);
  this.hpBounds={top,bottom:top+4,centerX:x};
  this.graphics.fillStyle(0x0c1920,.9).fillRect(x-13,top,26,4);
  this.graphics.fillStyle(health.color).fillRect(x-12,top+1,Math.round(24*health.ratio),2);
 }
 get presentation():{visible:boolean;color:string;nameBottom:number;hpTop:number;hpBottom:number;centerX:number} {return {visible:this.name.visible&&this.graphics.visible,color:String(this.name.style.color),nameBottom:this.name.getBounds().bottom,hpTop:this.hpBounds.top,hpBottom:this.hpBounds.bottom,centerX:this.hpBounds.centerX};}
 hide():void {this.graphics.setVisible(false);this.name.setVisible(false);}
 destroy():void {this.graphics.destroy();this.name.destroy();}
}
