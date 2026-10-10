import Phaser from 'phaser';
import type {Snapshot} from '@eldoria/domain';
import {recolorOutfit} from './outfit-colors';
/** One refreshed texture, twelve fixed frames: changing colors never accumulates GPU textures. */
export class HeroAppearance {
  private signature='';
  private texture:Phaser.Textures.CanvasTexture;
  constructor(private scene:Phaser.Scene){
    const texture=scene.textures.createCanvas('outfit',96,192);if(!texture)throw new Error('Nie można utworzyć wyglądu postaci');
    this.texture=texture;texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    for(let row=0;row<4;row++)for(let col=0;col<3;col++)texture.add(row*3+col,0,col*32,row*48,32,48);
    for(const [row,direction]of ['down','left','right','up'].entries())scene.anims.create({key:`hero-walk-${direction}`,frames:scene.anims.generateFrameNumbers('outfit',{start:row*3,end:row*3+2}),frameRate:10,repeat:-1});
  }
  update(s:Snapshot,colorful:boolean):void {
    const source=s.profession==='knight'?(colorful?'colorful-wanderer':'wanderer'):`colorful-${s.profession}`;
    const signature=JSON.stringify([source,s.appearance]);if(signature===this.signature)return;
    this.signature=signature;
    const context=this.texture.context;context.clearRect(0,0,96,192);context.imageSmoothingEnabled=false;
    context.drawImage(this.scene.textures.get(source).getSourceImage() as CanvasImageSource,0,0);
    const image=context.getImageData(0,0,96,192);image.data.set(recolorOutfit(image.data,s.profession,s.appearance));context.putImageData(image,0,0);this.texture.refresh();
    const preview=document.querySelector<HTMLCanvasElement>('#outfit-preview'),ctx=preview?.getContext('2d');
    if(ctx){ctx.clearRect(0,0,128,48);ctx.imageSmoothingEnabled=false;for(let row=0;row<4;row++)ctx.drawImage(this.texture.canvas,0,row*48,32,48,row*32,0,32,48);}
  }
}
