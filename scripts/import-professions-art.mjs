/** Mechanical crop/nearest sizing only. Source artwork was generated for Eldoria. */
import {execFileSync} from 'node:child_process';
import {mkdirSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),source=resolve(root,'assets/source/styles/professions'),runtime=resolve(root,'apps/client/public/assets/styles/professions'),scratch=resolve(root,'assets/design/extracted/professions');
mkdirSync(scratch,{recursive:true});mkdirSync(runtime,{recursive:true});
const input=resolve(root,'assets/design/profession-atlas.png');
const [width,height]=execFileSync('magick',['identify','-format','%w %h',input],{encoding:'utf8'}).trim().split(' ').map(Number);
for(const [profession,offset]of [['archer',0],['mage',3]]){
 const rows=[];
 for(let row=0;row<4;row++){
  const frames=[];
  for(let col=0;col<3;col++){
   const x=Math.floor((col+offset)*width/6),y=Math.floor(row*height/4),w=Math.floor((col+offset+1)*width/6)-x,h=Math.floor((row+1)*height/4)-y;
   const frame=resolve(scratch,`${profession}-${row}-${col}.png`);
   execFileSync('magick',[input,'-crop',`${w}x${h}+${x}+${y}`,'+repage','-channel','A','-threshold','50%','+channel','-trim','+repage','-filter','point','-resize','32x44','-gravity','south','-background','none','-extent','32x48',frame]);frames.push(frame);
  }
  const strip=resolve(scratch,`${profession}-${row}.png`);execFileSync('magick',[...frames,'+append',strip]);rows.push(strip);
 }
 const output=resolve(source,`${profession}.png`);execFileSync('magick',[...rows,'-append',output]);copyFileSync(output,resolve(runtime,`${profession}.png`));
 console.log(`${profession}: 96x192, down/left/right/up, three walking frames each`);
}
