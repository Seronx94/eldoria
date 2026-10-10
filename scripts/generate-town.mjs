/** Rebuild only Vareon. Forest, sample maps and reviewed sprites remain separate. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const m=JSON.parse(readFileSync(resolve(root,'assets/source/vareon.tmj'),'utf8'));
const width=48,height=48;
const ground=Array(width*height).fill(1),details=Array(width*height).fill(0),collision=Array(width*height).fill(0),cityGround=Array(width*height).fill(0),cityWalls=Array(width*height).fill(0);
const property=(name,value)=>({name,type:'string',value:String(value)});
const object=(id,name,x,y,properties=[])=>({id,name,x:x*32,y:y*32,point:true,width:0,height:0,properties});
function area(x,y,w,h,fn) {for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)fn(yy*width+xx,xx,yy);}
function pave(x,y,w,h) {area(x,y,w,h,i=>{cityGround[i]=1;ground[i]=4;});}
// Perimeter and a usable north gate; south/west/east gates stay closed in this version.
area(2,2,44,44,(i,x,y)=>{if(x===2||x===45||y===2||y===45){collision[i]=1;cityWalls[i]=(y===2||y===45)?1:2;}});
area(0,0,48,48,(i,x,y)=>{if(x<2||x>45||y<2||y>45)collision[i]=1;});
for(let x=23;x<=25;x++){collision[2*48+x]=0;cityWalls[2*48+x]=0;}
pave(23,2,3,41);pave(4,27,40,3);pave(19,17,11,16);pave(11,14,27,3);
pave(11,26,3,6);pave(35,26,3,6);pave(5,36,38,3);
const buildings=[
  {id:'gatehouse',label:'Wartownia',purpose:'guard',x:21,y:5,w:7,h:9,passage:true},
  {id:'temple',label:'Świątynia Świtu',purpose:'temple',x:7,y:18,w:11,h:9},
  {id:'shop',label:'Sklep Borina',purpose:'shop',x:31,y:18,w:11,h:9},
  {id:'inn',label:'Gospoda Pod Liściem',purpose:'inn',x:7,y:31,w:11,h:9},
  {id:'smith',label:'Warsztat',purpose:'workshop',x:31,y:31,w:11,h:9},
  {id:'home-west',label:'Dom wędrowców',purpose:'home',x:7,y:6,w:10,h:9},
  {id:'home-east',label:'Dom zielarki',purpose:'home',x:32,y:6,w:10,h:9},
];
for(const b of buildings) {
  const doorX=b.x+Math.floor(b.w/2);
  area(b.x,b.y,b.w,b.h,(i,x,y)=>{
    ground[i]=4;cityGround[i]=['guard','temple'].includes(b.purpose)?2:3;
    const wall=x===b.x||x===b.x+b.w-1||y===b.y||y===b.y+b.h-1;
    collision[i]=wall?1:0;cityWalls[i]=wall?((y===b.y||y===b.y+b.h-1)?1:2):0;
  });
  for(const y of [b.y+b.h-1,...(b.passage?[b.y]:[])]) {collision[y*48+doorX]=0;cityWalls[y*48+doorX]=0;}
  // One-tile path out of each southern doorway.
  pave(doorX,b.y+b.h,1,b.y+b.h<17?17-(b.y+b.h):b.y+b.h<30?30-(b.y+b.h):43-(b.y+b.h));
}
const props=[
  ['counter',25,10,'gatehouse',2],['bookcase',22,7,'gatehouse',1],
  ['altar',11,20,'temple',2],['bookcase',8,20,'temple',1],['bookcase',16,20,'temple',1],
  ['counter',34,22,'shop',2],['counter',37,22,'shop',2],['bookcase',32,20,'shop',1],['crates',40,24,'shop',1],
  ['counter',9,34,'inn',2],['bed',15,33,'inn',1],['bed',15,36,'inn',1],
  ['forge',36,34,'smith',2],['crates',33,36,'smith',1],
  ['bed',9,8,'home-west',1],['bookcase',14,8,'home-west',1],['bed',39,8,'home-east',1],['bookcase',34,8,'home-east',1],
  ['fountain',23,23,'',3],['stall',20,30,'',2],['stall',28,30,'',2],
  ...[[20,17],[28,17],[20,26],[28,26],[5,27],[43,27],[24,35],[24,41]].map(([x,y])=>['lamp',x,y,'',1]),
];
for(const [kind,x,y,,w] of props) {
  for(let dx=0;dx<w;dx++) collision[y*48+x+dx]=1;
  if(kind==='fountain') area(23,21,3,3,i=>{collision[i]=1;ground[i]=3;cityGround[i]=0;});
}
const trees=[[5,5],[18,7],[29,7],[43,5],[5,19],[43,19],[5,32],[43,32],[19,40],[29,40],[5,42],[43,42]];
for(const [x,y] of trees)collision[y*48+x]=1;
const tileLayer=(id,name,data,visible=true)=>({id,name,type:'tilelayer',width,height,x:0,y:0,opacity:1,visible,data});
m.properties=[property('mapId','vareon'),property('combatAllowed','false'),property('layoutRevision',2)];
m.layers=[tileLayer(1,'Ground',ground),tileLayer(2,'Details',details),tileLayer(3,'Collision',collision,false),tileLayer(4,'Above',Array(width*height).fill(0)),
  {id:5,name:'Spawns',type:'objectgroup',objects:[object(1,'entry',24,12)]},
  {id:6,name:'Portals',type:'objectgroup',objects:[object(2,'gate',24,4,[property('targetMapId','forest'),property('targetSpawnId','entry')])]},
  {id:7,name:'NPCs',type:'objectgroup',objects:[object(30,'mira',25,12,[property('npcId','mira')]),object(31,'oren',12,22,[property('npcId','oren')]),object(32,'borin',36,21,[property('npcId','borin')])]},
  {id:8,name:'Decorations',type:'objectgroup',objects:trees.map(([x,y],i)=>object(60+i,'tree',x,y))},
  tileLayer(9,'CityGround',cityGround),tileLayer(10,'CityWalls',cityWalls),
  {id:11,name:'Buildings',type:'objectgroup',objects:buildings.map((b,i)=>({...object(100+i,b.id,b.x,b.y,[property('label',b.label),property('purpose',b.purpose),property('passage',b.passage??false)]),point:false,width:b.w*32,height:b.h*32}))},
  {id:12,name:'TownProps',type:'objectgroup',objects:props.map(([kind,x,y,buildingId,w],i)=>object(200+i,kind,x,y,[property('footprintWidth',w),...(buildingId?[property('buildingId',buildingId)]:[])]))},
];
// Two auxiliary Tiled tilesets make the new numeric layers editable in Tiled too.
m.tilesets=[m.tilesets[0],{firstgid:5,name:'town-ground',tilewidth:32,tileheight:32,tilecount:3,columns:0,tiles:['paving','stone-floor','wood-floor'].map((name,id)=>({id,image:`town/${name}.png`,imagewidth:32,imageheight:32}))},{firstgid:8,name:'town-walls',tilewidth:32,tileheight:32,tilecount:2,columns:0,tiles:['wall-h','wall-v'].map((name,id)=>({id,image:`town/${name}.png`,imagewidth:32,imageheight:32}))}];
// GIDs are actual global Tiled IDs, not local frame numbers.
for(const l of m.layers)if(l.name==='CityGround')l.data=l.data.map(v=>v?v+4:0);else if(l.name==='CityWalls')l.data=l.data.map(v=>v?v+7:0);
m.nextlayerid=13;m.nextobjectid=250;
const data=JSON.stringify(m,null,2)+'\n';
writeFileSync(resolve(root,'assets/source/vareon.tmj'),data);writeFileSync(resolve(root,'apps/client/public/assets/vareon.json'),data);
console.log('Generated Vareon revision 2: seven enterable buildings, market and located services.');
