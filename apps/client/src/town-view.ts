import Phaser from 'phaser';
import {createTileLayer} from './tile-layer';
import type {WorldMap,TownBuilding} from '@eldoria/content';
import {insideBuilding,nearBuilding} from './building-visibility';
const floorKeys=['paving','stone-floor','wood-floor'];
export const townAssetKeys=[...floorKeys,'wall-h','wall-v','roof','door','counter','altar','bookcase','forge','bed','lamp','crates','stall','fountain'];
/** A view of Tiled geometry. Roof visibility never changes domain collisions. */
export class TownView {
  private objects:Phaser.GameObjects.GameObject[]=[];
  private roofs=new Map<string,Phaser.GameObjects.Container>();
  private doors=new Map<string,Phaser.GameObjects.Image[]>();
  private interiors=new Map<string,Phaser.GameObjects.Components.Visible[]>();
  private buildings:TownBuilding[]=[];
  private current='';
  get visibleRoofs():string[] {return [...this.roofs].filter(([,roof])=>roof.visible).map(([id])=>id);}
  constructor(private scene:Phaser.Scene) {}
  clear():void {
    for(const o of this.objects)o.destroy();this.objects=[];this.roofs.clear();this.doors.clear();this.interiors.clear();this.buildings=[];this.current='';
  }
  build(map:WorldMap):void {
    this.clear();this.buildings=map.buildings;
    for(const [i,key]of floorKeys.entries())if(map.cityGround.includes(i+5))this.objects.push(createTileLayer(this.scene,`town-${key}`,map.width,map.height,(x,y)=>map.cityGround[y*map.width+x]===i+5?0:-1,-95));
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++) {
      const i=y*map.width+x,wall=map.cityWalls[i]!;
      if(wall)this.objects.push(this.scene.add.image(x*32,y*32,`town-${wall===8?'wall-h':'wall-v'}`).setOrigin(0).setDepth(y*32+32));
    }
    for(const b of map.buildings) {
      const roof=this.scene.add.container(0,0).setDepth(9998);
      for(let y=b.y;y<b.y+b.height;y++)for(let x=b.x;x<b.x+b.width;x++)roof.add(this.scene.add.image(x*32,y*32,'town-roof').setOrigin(0));
      const outline=this.scene.add.graphics().lineStyle(3,0x493226).strokeRect(b.x*32,b.y*32,b.width*32,b.height*32);roof.add(outline);
      // Raised ridge, shaded slope and eaves make the exterior read as a roof from the street.
      const x=b.x*32,y=b.y*32,w=b.width*32,h=b.height*32;
      const shape=this.scene.add.graphics();
      shape.fillStyle(0x3c2528,.25).fillRect(x,y+h/2,w,h/2);
      shape.lineStyle(4,0xf2b075).lineBetween(x+3,y+h/2,x+w-3,y+h/2);
      shape.lineStyle(3,0x542d2d).lineBetween(x,y+h-2,x+w,y+h-2);
      roof.add(shape);
      this.roofs.set(b.id,roof);this.objects.push(roof);
      for(const d of b.doors) {
        const door=this.scene.add.image(d.x*32+16,d.y*32+32,'town-door').setOrigin(.5,1).setDepth(d.y*32+34);
        this.objects.push(door);const doors=this.doors.get(b.id)??[];doors.push(door);this.doors.set(b.id,doors);
      }
      const d=b.doors[0]!;
      const label=this.scene.add.text(d.x*32+16,(d.y+1)*32+3,b.label,{fontFamily:'monospace',fontSize:'10px',color:'#ffe5a3',backgroundColor:'#233d34'}).setOrigin(.5,0).setDepth(9999);
      this.objects.push(label);
    }
    for(const p of map.townProps) {
      const prop=this.scene.add.image((p.x+p.width/2)*32,p.y*32+32,`town-${p.kind}`).setOrigin(.5,1).setDepth(p.y*32+33);
      this.objects.push(prop);
      if(p.buildingId)this.addInterior(p.buildingId,prop);
    }
    // Roof groups initially cover their rooms; first snapshot reveals the correct room.
    this.update({x:-1,y:-1});
  }
  private addInterior(id:string,object:Phaser.GameObjects.Components.Visible):void {
    const list=this.interiors.get(id)??[];list.push(object);this.interiors.set(id,list);
  }
  registerInterior(object:Phaser.GameObjects.Components.Visible,p:{x:number;y:number}):void {
    const b=this.buildings.find(b=>insideBuilding(b,p));if(b)this.addInterior(b.id,object);
    this.current=''; // Apply visibility again after NPC creation.
  }
  update(player:{x:number;y:number}):string {
    const id=this.buildings.find(b=>insideBuilding(b,player))?.id??'outside';
    const revealed=new Set(this.buildings.filter(b=>nearBuilding(b,player)).map(b=>b.id));
    const signature=[id,...revealed].join(',');
    if(signature!==this.current) {
      this.current=signature;
      for(const [key,roof]of this.roofs)roof.setVisible(!revealed.has(key));
      // Approaching reveals the room and its occupants, without changing collisions or talk range.
      for(const [key,doors]of this.doors)for(const door of doors)door.setDepth(revealed.has(key)?door.y+2:9999);
      for(const [key,objects]of this.interiors)for(const o of objects)o.setVisible(revealed.has(key));
    }
    return id;
  }
}
