import Phaser from 'phaser';
/** Camera-culling tile layer: native pixels, no sprite per tile or world-sized bitmap. */
export function createTileLayer(scene:Phaser.Scene,texture:string,width:number,height:number,indexAt:(x:number,y:number)=>number,depth:number):Phaser.Tilemaps.TilemapLayer {
  const data=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>indexAt(x,y)));
  const map=scene.make.tilemap({data,tileWidth:32,tileHeight:32});
  const tileset=map.addTilesetImage(texture,texture,32,32);
  if(!tileset)throw new Error(`Brak tilesetu ${texture}`);
  const layer=map.createLayer(0,tileset,0,0);
  if(!layer)throw new Error(`Brak warstwy ${texture}`);
  return layer.setDepth(depth).setCullPadding(2,2);
}
