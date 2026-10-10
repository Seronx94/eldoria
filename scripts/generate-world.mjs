/** Join reviewed local maps in one coordinate system. Keep originals for save validation. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=id=>JSON.parse(readFileSync(resolve(root,`assets/source/${id}.tmj`),'utf8'));
const town=read('vareon'),forest=read('forest'),width=64,height=112;
const property=(name,value)=>({name,type:'string',value:String(value)});
const names=['Ground','Details','Collision','Above','CityGround','CityWalls'];
const layers=names.map((name,i)=>({id:i+1,name,type:'tilelayer',width,height,x:0,y:0,opacity:1,visible:name!=='Collision',data:Array(width*height).fill(name==='Ground'?1:name==='Collision'?1:0)}));
for(const [map,dx,dy]of [[forest,0,0],[town,8,64]])for(const layer of layers){
  const source=map.layers.find(l=>l.name===layer.name)?.data;
  if(source)for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)layer.data[(y+dy)*width+x+dx]=source[y*map.width+x];
}
// Remove the forest's former bottom boundary. The city's physical wall is the border.
for(let x=1;x<63;x++)for(const layer of layers)layer.data[63*width+x]=layer.name==='Ground'?1:0;
for(let y=64;y<66;y++)for(let x=8;x<56;x++)for(const layer of layers)layer.data[y*width+x]=layer.name==='Ground'?1:0;
// Continuous three-tile road across both former outer borders; no portal trigger.
for(let y=58;y<=68;y++)for(let x=31;x<=33;x++){
  for(const layer of layers)layer.data[y*width+x]=layer.name==='Ground'?(y<64?2:4):layer.name==='CityGround'&&y>=64?5:0;
}
let objectId=1;
for(const name of ['Spawns','Portals','NPCs','Decorations','Buildings','TownProps']){
  const objects=[];
  if(name!=='Portals')for(const [map,dx,dy]of [[forest,0,0],[town,8,64]])for(const o of map.layers.find(l=>l.name===name)?.objects??[]){
    if(name==='Spawns'&&map===forest&&o.name==='entry')continue;
    objects.push({...o,id:objectId++,x:o.x+dx*32,y:o.y+dy*32});
  }
  layers.push({id:layers.length+1,name,type:'objectgroup',objects});
}
layers.push({id:layers.length+1,name:'Regions',type:'objectgroup',objects:[
  {id:objectId++,name:'forest',x:0,y:0,width:64*32,height:64*32,properties:[property('label','MROCZNY LAS'),property('combatAllowed',true)]},
  {id:objectId++,name:'vareon',x:8*32,y:64*32,width:48*32,height:48*32,properties:[property('label','VAREON · STREFA BEZPIECZNA'),property('combatAllowed',false)]},
]});
const world={...town,width,height,nextlayerid:layers.length+1,nextobjectid:objectId,properties:[property('mapId','eldoria'),property('combatAllowed',true),property('layoutRevision',2)],layers};
const data=JSON.stringify(world,null,2)+'\n';
writeFileSync(resolve(root,'assets/source/eldoria.tmj'),data);writeFileSync(resolve(root,'apps/client/public/assets/eldoria.json'),data);
console.log('Generated Eldoria: continuous 64×112 world, forest north / safe Vareon south.');
