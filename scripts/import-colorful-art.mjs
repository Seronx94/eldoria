/** Mechanical atlas extraction only: crop, nearest-neighbour sizing and PNG packing. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const source=resolve(root,'assets/source/styles/colorful');
const output=resolve(root,'apps/client/public/assets/styles/colorful');
const scratch=resolve(root,'assets/design/extracted');
for(const path of [source,output,scratch]) mkdirSync(path,{recursive:true});
const magick=(args)=>execFileSync('magick',args,{stdio:['ignore','pipe','inherit']});
const world=resolve(root,'assets/design/colorful-world-atlas.png');
const actors=resolve(root,'assets/design/colorful-actors-atlas.png');
const manifest=JSON.parse(readFileSync(resolve(root,'assets/design/colorful-atlas.json'),'utf8'));
function crop(input,rect,name){
 const file=resolve(scratch,name+'.png');
 magick([input,'-crop',`${rect[2]}x${rect[3]}+${rect[0]}+${rect[1]}`,'+repage',file]);
 return file;
}
function sprite(input,rect,name,w,h,trim=true,runtime=true){
 const cropped=crop(input,rect,name);
 const target=resolve(runtime?source:scratch,name+(runtime?'':'-native')+'.png');
 magick([cropped,'-channel','A','-threshold','50%','+channel',...(trim?['-trim','+repage']:[]),'-filter','point','-resize',trim?`${w}x${h}`:`${w}x${h}!`,'-gravity','south','-background','none','-extent',`${w}x${h}`,target]);
 if(runtime) copyFileSync(target,resolve(output,name+'.png'));
 return target;
}
const tiles=[];
for(let variant=0;variant<4;variant++) for(let terrain=0;terrain<4;terrain++){
 const [x,y,w,h]=manifest.terrain[terrain];
 const halfW=Math.floor(w/2),halfH=Math.floor(h/2);
 const rect=[x+(variant%2)*halfW,y+Math.floor(variant/2)*halfH,halfW,halfH];
 const file=resolve(scratch,`tile-${variant}-${terrain}.png`);
 magick([world,'-crop',`${rect[2]}x${rect[3]}+${rect[0]}+${rect[1]}`,'+repage','-filter','point','-resize','32x32!',file]); tiles.push(file);
}
magick([...tiles,'+append',resolve(source,'tiles.png')]); copyFileSync(resolve(source,'tiles.png'),resolve(output,'tiles.png'));
for(const asset of manifest.world) sprite(world,asset.rect,asset.name,asset.width,asset.height);
const frames=[];
for(let row=0;row<4;row++){
 const strip=[];
 for(let col=0;col<3;col++) strip.push(sprite(actors,manifest.actors[row][col],`frame-${row}-${col}`,32,48,true,false));
 const file=resolve(scratch,`row-${row}.png`); magick([...strip,'+append',file]); frames.push(file);
}
magick([...frames,'-append',resolve(source,'wanderer.png')]); copyFileSync(resolve(source,'wanderer.png'),resolve(output,'wanderer.png'));
for(let i=0;i<3;i++) sprite(actors,manifest.actors[i][3],['mira','oren','borin'][i],32,48);
const monsterAtlas=resolve(root,'assets/design/colorful-monsters-atlas.png');
for(const [kind,rects] of Object.entries(manifest.monsterWalk)){
 const cells=rects.map((rect,index)=>sprite(monsterAtlas,rect,`${kind}-walk-${index}`,32,32,true,false));
 magick([...cells,'+append',resolve(source,`${kind}-walk.png`)]);
 copyFileSync(resolve(source,`${kind}-walk.png`),resolve(output,`${kind}-walk.png`));
}
// Individual intermediate character frames are useful for source inspection but are not runtime exports.
writeFileSync(resolve(source,'README.md'),'# Kolorowy zestaw do oceny\n\nŹródło: assets/design/colorful-*-atlas.png; współrzędne: assets/design/colorful-atlas.json.\nImport: npm run assets:import-colorful (ImageMagick 7). Cropping i nearest-neighbour; bez wygładzania.\nAutorskie grafiki wygenerowane narzędziem image_gen; prawa i ograniczenia w ASSET_LICENSES.md.\n');
console.log('Imported colorful pixel sprites and 16 native 32x32 terrain variants.');
