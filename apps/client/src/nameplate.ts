import Phaser from 'phaser';

/** High-resolution text stays readable without smoothing the pixel-art world. */
export function createNameplate(scene:Phaser.Scene,fontSize:number,depth:number):Phaser.GameObjects.Text {
 const text=scene.add.text(0,0,'',{fontFamily:'Arial, sans-serif',fontStyle:'bold',fontSize:`${fontSize}px`,stroke:'#101e23',strokeThickness:2,resolution:2}).setOrigin(.5,1).setDepth(depth);
 text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
 return text;
}
