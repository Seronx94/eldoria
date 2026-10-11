/** Original Eldoria geography; deterministic editable Tiled sources and matching exports. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const world=JSON.parse(readFileSync(resolve(root,'assets/source/eldoria.tmj'),'utf8'));
const prop=(name,value)=>({name,type:'string',value:String(value)});
let id=10000;
const obj=(name,x,y,properties=[])=>({id:id++,name,x:x*32,y:y*32,width:0,height:0,point:true,properties});
const layer=(m,n)=>m.layers.find(l=>l.name===n);
const portal=(m,name,x,y,target,spawn)=>layer(m,'Portals').objects.push(obj(name,x,y,[prop('targetMapId',target),prop('targetSpawnId',spawn)]));
const spawn=(m,name,x,y)=>layer(m,'Spawns').objects.push(obj(name,x,y));
const scenery=m=>{const l={id:m.layers.length+1,name:'Scenery',type:'objectgroup',objects:[]};m.layers.push(l);return l.objects;};
const clear=(m,x,y,gid=2)=>{for(const n of ['Ground','Details','Above','Collision','CityGround','CityWalls'])layer(m,n).data[y*m.width+x]=n==='Ground'?gid:0;};
const decor=scenery(world);
// Decorative ground cover never changes existing collisions or checkpoint positions.
for(let y=3;y<109;y++)for(let x=3;x<61;x++)if(layer(world,'Ground').data[y*64+x]===1&&layer(world,'Collision').data[y*64+x]===0&&(x*17+y*31)%23===0)decor.push(obj((x+y)%3===0?'shrub':(x+y)%3===1?'flowers':'pebbles',x,y));
// Eastern harbour: open a gate at road level, with shore, a three-tile pier and vessel.
for(let y=86;y<=103;y++)for(let x=50;x<63;x++){
 const i=y*64+x;if(x>=56){layer(world,'Ground').data[i]=3;layer(world,'Collision').data[i]=1;}
 if(y>=92&&y<=94){clear(world,x,y,4);layer(world,'CityGround').data[i]=x>=56?7:5;}
}
layer(world,'Regions').objects.push({...obj('harbour',56,80,[prop('label','PORT VAREON · STREFA BEZPIECZNA'),prop('combatAllowed',false)]),width:8*32,height:32*32});
for(const [x,y]of [[56,91],[58,91],[56,95],[58,95]])decor.push(obj('bollard',x,y));
decor.push(obj('ship',60,90));portal(world,'boat-nivora',59,93,'nivora','entry');spawn(world,'harbour',58,93);
// Physical stairs in Borin's shop and a forest cave entrance, away from old landmarks.
clear(world,46,87,4);portal(world,'stairs-shop-up',46,87,'shop-upper','entry');spawn(world,'shop-return',46,88);
for(let y=56;y<=58;y++)for(let x=17;x<=19;x++)clear(world,x,y);
layer(world,'Decorations').objects=layer(world,'Decorations').objects.filter(o=>!(o.x/32>=17&&o.x/32<=19&&o.y/32>=56&&o.y/32<=58));
portal(world,'stairs-cave-down',18,57,'catacombs','entry');spawn(world,'cave-return',18,58);
function map(name,width,height,safe){
 const m={...world,width,height,properties:[prop('mapId',name),prop('combatAllowed',!safe),prop('layoutRevision',3)],layers:[]};
 for(const n of ['Ground','Details','Above','Collision','CityGround','CityWalls'])m.layers.push({id:m.layers.length+1,name:n,type:'tilelayer',width,height,opacity:1,visible:n!=='Collision',data:Array(width*height).fill(n==='Ground'?4:n==='Collision'?1:0)});
 for(const n of ['Spawns','Portals','NPCs','Decorations','Buildings','TownProps'])m.layers.push({id:m.layers.length+1,name:n,type:'objectgroup',objects:[]});
 return m;
}
const cave=map('catacombs',40,36,false);const cd=scenery(cave);
// Connected rooms and corridors, with solid rock outside their carved footprint.
for(const [x,y,w,h]of [[3,3,12,11],[11,9,17,4],[24,5,12,12],[8,11,4,18],[7,24,15,9],[20,25,16,4],[29,16,4,16]])for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)clear(cave,xx,yy,4);
spawn(cave,'entry',7,7);portal(cave,'stairs-cave-up',7,8,'eldoria','cave-return');
for(const [name,kind,x,y]of [['cave-rat-1','rat',12,10],['cave-rat-2','rat',27,12],['cave-beetle-1','beetle',12,27],['cave-beetle-2','beetle',30,26]])layer(cave,'Spawns').objects.push(obj(name,x,y,[prop('monsterId',kind)]));
for(const [x,y]of [[4,4],[13,4],[25,6],[34,6],[8,25],[20,31],[34,27]])cd.push(obj('crystal',x,y));
for(const [x,y]of [[9,9],[30,10],[16,29]])cd.push(obj('bones',x,y));
for(const [x,y]of [[4,5],[13,12],[25,7],[10,25],[34,27]]){layer(cave,'TownProps').objects.push(obj('lamp',x,y));layer(cave,'Collision').data[y*40+x]=1;}
const shop=map('shop-upper',16,14,true);scenery(shop);
for(let y=3;y<=11;y++)for(let x=3;x<=12;x++){clear(shop,x,y,4);layer(shop,'CityGround').data[y*16+x]=7;}
for(let y=2;y<=12;y++)for(let x=2;x<=13;x++)if(x===2||x===13||y===2||y===12)layer(shop,'CityWalls').data[y*16+x]=y===2||y===12?8:9;
spawn(shop,'entry',5,8);portal(shop,'stairs-shop-down',5,9,'eldoria','shop-return');
for(const [kind,x,y]of [['bookcase',4,3],['bookcase',8,3],['crates',11,4],['bed',10,9],['lamp',7,6]]){layer(shop,'TownProps').objects.push(obj(kind,x,y));layer(shop,'Collision').data[y*16+x]=1;}
const snow=map('nivora',48,48,false);const sd=scenery(snow);
for(let y=2;y<46;y++)for(let x=2;x<46;x++){
 const island=((x-24)/21)**2+((y-24)/20)**2<1;
 layer(snow,'Ground').data[y*48+x]=island?1:3;layer(snow,'Collision').data[y*48+x]=island?0:1;
 if(island&&(x*13+y*7)%31===0){const kind=(x+y)%2?'snow-pine':'crystal';sd.push(obj(kind,x,y));if(kind==='snow-pine')layer(snow,'Collision').data[y*48+x]=1;}
}
for(let y=33;y<=43;y++)for(let x=22;x<=26;x++){clear(snow,x,y,4);layer(snow,'CityGround').data[y*48+x]=y>=39?7:5;}
for(let i=sd.length-1;i>=0;i--){const x=sd[i].x/32,y=sd[i].y/32;if(y>=33&&x>=22&&x<=26||y>=39&&x>=26&&x<=32){if(sd[i].name==='snow-pine'&&layer(snow,'Ground').data[y*48+x]!==3)layer(snow,'Collision').data[y*48+x]=0;sd.splice(i,1);}}
for(let y=43;y<=46;y++)for(let x=27;x<=31;x++){layer(snow,'Ground').data[y*48+x]=3;layer(snow,'Collision').data[y*48+x]=1;}
spawn(snow,'entry',24,40);portal(snow,'boat-vareon',24,42,'eldoria','harbour');sd.push(obj('ship',28,43));
snow.layers.push({id:snow.layers.length+1,name:'Regions',type:'objectgroup',objects:[{...obj('nivora-port',19,33,[prop('label','NIVORA · BEZPIECZNY PORT'),prop('combatAllowed',false)]),width:12*32,height:13*32}]});
for(const [name,kind,x,y]of [['snow-wolf-1','wolf',18,23],['snow-wolf-2','wolf',30,20],['snow-beetle','beetle',24,12]])layer(snow,'Spawns').objects.push(obj(name,x,y,[prop('monsterId',kind)]));
for(const m of [world,cave,shop,snow]){m.nextobjectid=id;m.nextlayerid=m.layers.length+1;const data=JSON.stringify(m,null,2)+'\n';const name=m.properties.find(p=>p.name==='mapId').value;writeFileSync(resolve(root,`assets/source/${name}.tmj`),data);writeFileSync(resolve(root,`apps/client/public/assets/${name}.json`),data);}
console.log('Generated harbour, catacombs, shop upper floor and Nivora winter island.');
