import Phaser from 'phaser';
import {healthDisplay} from './health-display';
/** Public presentation accepts health only. Owner mana/arcs belong to HeroVitals. */
export class PublicVitals {
 private graphics:Phaser.GameObjects.Graphics;
 private name:Phaser.GameObjects.Text;
 constructor(scene:Phaser.Scene){
  this.graphics=scene.add.graphics().setDepth(10001);
  this.name=scene.add.text(0,0,'',{fontFamily:'monospace',fontSize:'9px',stroke:'#101e23',strokeThickness:2}).setOrigin(.5,1).setDepth(10002);
 }
 draw(label:string,hp:number,maxHp:number,x:number,y:number,selected:boolean):void {
  const health=healthDisplay(hp,maxHp),visible=hp>0&&(selected||hp<maxHp);
  this.graphics.clear().setVisible(visible);this.name.setColor(health.css).setVisible(visible);
  if(!visible)return;
  x=Math.round(x);y=Math.round(y);
  this.name.setText(label).setColor(health.css).setPosition(x,y-35);
  this.graphics.fillStyle(0x0c1920,.9).fillRect(x-13,y-31,26,4);
  this.graphics.fillStyle(health.color).fillRect(x-12,y-30,Math.round(24*health.ratio),2);
 }
 get presentation():{visible:boolean;color:string} {return {visible:this.name.visible&&this.graphics.visible,color:String(this.name.style.color)};}
 hide():void {this.graphics.setVisible(false);this.name.setVisible(false);}
 destroy():void {this.graphics.destroy();this.name.destroy();}
}
