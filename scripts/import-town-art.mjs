/** Mechanical extraction of the original generated atlas; no painting or smoothing. */
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const source=resolve(root,'assets/source/town');
const output=resolve(root,'apps/client/public/assets/town');
for(const directory of [source,output]) mkdirSync(directory,{recursive:true});
const manifest=JSON.parse(readFileSync(resolve(root,'assets/design/town-atlas.json'),'utf8'));
for(const {name,rect,width,height,trim} of manifest.assets) {
  const file=resolve(source,name+'.png');
  execFileSync('magick',[resolve(root,'assets/design/town-atlas.png'),'-crop',`${rect[2]}x${rect[3]}+${rect[0]}+${rect[1]}`,'+repage','-channel','A','-threshold','50%','+channel',...(trim?['-trim','+repage']:[]),'-filter','point','-resize',trim?`${width}x${height}`:`${width}x${height}!`,'-gravity','south','-background','none','-extent',`${width}x${height}`,'-strip',file]);
  copyFileSync(file,resolve(output,name+'.png'));
}
console.log(`Imported ${manifest.assets.length} native town tiles/props.`);
