import Phaser from 'phaser';
import {createTileLayer} from './tile-layer';
import type {WorldMap} from '@eldoria/content';
/** Original pixel geometry, integer coordinates, batched terrain and small depth-sorted props. */
export function worldDetails(scene:Phaser.Scene,map:WorldMap):Phaser.GameObjects.GameObject[] {
  const views:Phaser.GameObjects.GameObject[]=[];
  const winter=map.id==='nivora',cave=map.id==='catacombs';
  if(cave){
    for(const wall of [false,true])views.push(createTileLayer(scene,'town-stone-floor',map.width,map.height,(x,y)=>(map.collision[y*map.width+x]===1)===wall?0:-1,-80).setTint(wall?0x45535f:0xb3b49a));
  }
  if(winter){
    const floor=scene.add.graphics().setDepth(-80);views.push(floor);
    const rect=(color:number,x:number,y:number,w:number,h:number)=>floor.fillStyle(color).fillRect(x,y,w,h);
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
      const i=y*map.width+x,X=x*32,Y=y*32,hash=(x*17+y*31)%5;
      if(winter){
        if(map.ground[i]===3||map.cityGround[i])continue;
        else{rect([0xd9e8e9,0xe5f0ef,0xd0e1e6,0xeaf2f1,0xdae7ed][hash]!,X,Y,32,32);rect(0xb9d5de,X+hash*3,Y+24,10,2);rect(0xf5faf5,X+7,Y+4,6,2);for(let p=0;p<12;p++){const px=(x*7+y*3+p*11)%30,py=(x*3+y*7+p*17)%30;rect(p%3===0?0xc9dde2:0xf0f7f3,X+px,Y+py,2+(p%3),2);}}
      }else{
        const wall=map.collision[i]===1;rect(wall?0x242b32:0x515554,X,Y,32,32);
        rect(wall?0x38424a:0x676960,X+2,Y+3,26,2);rect(wall?0x151d23:0x343e3e,X+14,Y+4,2,20);
        rect(wall?0x303b42:0x788074,X+3+hash,Y+25,16,2);
      }
    }
  }
  for(const d of map.scenery){
    const g=scene.add.graphics().setDepth(['flowers','pebbles','bones'].includes(d.kind)?-8:d.y*32+33);views.push(g);
    const X=d.x*32,Y=d.y*32;
    const r=(c:number,x:number,y:number,w:number,h:number)=>g.fillStyle(c).fillRect(X+x,Y+y,w,h);
    if(d.kind==='flowers'){
      for(const [x,y,c]of [[6,14,0xf7c574],[19,22,0xe48ac9],[24,9,0xf8eea5]]){r(0x365c38,x!,y!+3,2,7);r(c!,x!-2,y!,6,2);r(c!,x!,y!-2,2,6);r(0xffe5a2,x!,y!,2,2);}
    }else if(d.kind==='shrub'){
      r(0x1d422e,3,22,25,6);r(0x2b6037,5,12,21,12);r(0x488143,8,7,15,12);r(0x79a34b,10,9,5,3);r(0xa2b552,19,17,3,2);
    }else if(d.kind==='pebbles'||d.kind==='bones'){
      const c=d.kind==='bones'?0xc5c3a1:0x879182;r(0x354c3a,4,26,19,3);r(c,6,20,9,5);r(c,20,15,5,4);r(0xc3c7aa,8,20,4,2);
    }else if(d.kind==='crystal'){
      r(cave?0x223d43:0xb2cbd4,3,23,26,5);r(0x4889a8,8,10,7,16);r(0x85c7d2,10,5,3,18);r(0x5ba6c4,18,14,6,12);r(0xd3f1ec,19,10,2,13);
    }else if(d.kind==='snow-pine'){
      const pine=scene.add.image(X+16,Y+32,'colorful-pine').setOrigin(.5,1).setTint(0xb9dbe5).setDepth(Y+33);views.push(pine);g.setDepth(Y+34);
      r(0xe8f3ec,10,-60,12,3);r(0xe8f3ec,3,-45,27,3);r(0xd2e9e5,-8,-29,45,3);r(0xeaf5f3,-15,-10,59,3);r(0xb2cfda,2,29,27,2);
    }else if(d.kind==='bollard'){
      r(0x493c2d,8,10,15,19);r(0xba9565,8,7,15,7);r(0xe2c184,10,8,11,2);r(0x3e4848,9,14,13,4);
    }else if(d.kind==='ship'){
      // Hull, deck planks, railing, cabin, mast, sail, rope and lanterns.
      for(let row=0;row<30;row++){
        const inset=row<4?(4-row)*3:row>25?(row-25)*4:0;
        r(0x173e50,-5+inset,8+row*4,72-inset*2,4);r(0x392a25,inset,row*4,62-inset*2,4);r(0x805936,3+inset,row*4,56-inset*2,4);
      }
      r(0xb48a53,7,15,48,96);
      for(let y=9;y<113;y+=8){r(0x745539,7,y,48,2);r(0x8d693d,30+(y%3)*4,y,2,8);}
      r(0xe1bc7a,1,6,4,113);r(0xe1bc7a,57,6,4,113);r(0x4c382d,11,84,40,24);r(0x937b4b,13,86,36,18);r(0xcac78c,16,88,9,9);
      r(0x3b2f2d,30,-48,5,139);for(let row=0;row<15;row++){const span=20+Math.floor(Math.sin(row/14*Math.PI)*12);r(0xc7bfa6,34,-37+row*4,span,4);r(0xe8e4bd,35,-36+row*4,span-4,3);}r(0x666e69,46,-31,2,47);r(0x8d383b,30,-49,20,10);r(0xd57362,32,-47,12,2);r(0xe5c992,7,35,20,2);r(0xe5c992,35,35,20,2);
      r(0xada27f,7,42,22,2);r(0xada27f,35,60,20,2);r(0xd9ab54,7,72,6,8);r(0xffe8a0,8,74,4,4);
    }
  }
  return views;
}
export function travelLabel(target:string):string {
  return ({nivora:'STATEK · NIVORA',eldoria:'POWRÓT · VAREON',catacombs:'KATAKUMBY ↓','shop-upper':'SKLEP · PIĘTRO ↑',grove:'DO ZAGAJNIKA',courtyard:'NA DZIEDZINIEC',forest:'DO LASU',vareon:'DO VAREON'} as Record<string,string>)[target]??'PRZEJŚCIE';
}
