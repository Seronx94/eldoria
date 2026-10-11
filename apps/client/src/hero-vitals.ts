import Phaser from 'phaser';
import {healthDisplay} from './health-display';
import type {Snapshot} from '@eldoria/domain';
export type VitalsStyle='bars'|'arcs';
export function loadVitalsStyle():VitalsStyle {try{return localStorage.getItem('eldoria.vitals')==='arcs'?'arcs':'bars';}catch{return 'bars';}}
export class HeroVitals {
  private graphics:Phaser.GameObjects.Graphics;
  private name:Phaser.GameObjects.Text;
  constructor(scene:Phaser.Scene){
    this.graphics=scene.add.graphics().setDepth(10003);
    this.name=scene.add.text(0,0,'',{fontFamily:'monospace',fontSize:'11px',color:'#ffe8b1',stroke:'#101e23',strokeThickness:3}).setOrigin(.5,1).setDepth(10004);
  }
  draw(s:Snapshot,x:number,y:number,style:VitalsStyle):void {
    const health=healthDisplay(s.hp,s.maxHp);
    this.name.setText(s.name).setColor(health.css).setPosition(Math.round(x),Math.round(y-59));
    const g=this.graphics;g.clear();
    const hp=health.ratio,mana=Phaser.Math.Clamp(s.mana/s.maxMana,0,1);
    if(style==='bars'){
      for(const [offset,value,color]of [[-54,hp,health.color],[-47,mana,0x569bff]]){
        g.fillStyle(0x0c1920,.9).fillRect(Math.round(x)-23,Math.round(y+offset!)-1,46,6);
        g.fillStyle(color!).fillRect(Math.round(x)-22,Math.round(y+offset!),Math.round(44*value!),4);
      }
    }else{
      for(const [start,value,color]of [[Math.PI*.65,hp,health.color],[-Math.PI*.35,mana,0x569bff]]){
        const end=start!+Math.PI*.7;
        g.lineStyle(7,0x0c1920,.9).beginPath().arc(Math.round(x),Math.round(y-24),28,start!,end).strokePath();
        if(value!>0)g.lineStyle(5,color!).beginPath().arc(Math.round(x),Math.round(y-24),28,start!,start!+Math.PI*.7*value!).strokePath();
      }
    }
  }
  hide():void {this.name.setVisible(false);this.graphics.setVisible(false);}
  show():void {this.name.setVisible(true);this.graphics.setVisible(true);}
}
