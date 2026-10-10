import type {Appearance,Profession} from '@eldoria/protocol';
export const outfitParts=['hair','body','legs','feet'] as const;
const archerHeadBounds=[[8,23],[4,20],[10,27],[13,26]] as const;
export const outfitLabels={hair:'Włosy',body:'Strój i peleryna',legs:'Spodnie / dolna szata',feet:'Buty'} as const;
export const originalColors:Record<Profession,Record<keyof Appearance,string>>={
  knight:{hair:'#985c30',body:'#367f8a',legs:'#535342',feet:'#705029'},
  archer:{hair:'#8e542c',body:'#2b7046',legs:'#696538',feet:'#83532a'},
  mage:{hair:'#b2b0bf',body:'#2656af',legs:'#67458e',feet:'#83532a'},
};
/** Semantic palette regions of the authored 32x48 sprites, independent of chosen colors.
 * Skin, weapons, outline and alpha are preserved. Regions are always read from source art. */
function partFor(profession:Profession,x:number,y:number,r:number,g:number,b:number):keyof Appearance|undefined {
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  if(max<35)return;
  let hue=delta===0?0:max===r?60*((g-b)/delta%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4);
  if(hue<0)hue+=360;
  const saturation=max===0?0:delta/max;
  const row=Math.floor(y/48),fy=y%48,fx=x%32;
  // Quiver arrows sit beside the archer's head; the mage's crystal is beside the shoulders.
  const inHead=profession!=='archer'||fx>=archerHeadBounds[row]![0]&&fx<=archerHeadBounds[row]![1];
  if(profession==='mage'&&fy>=19&&fy<=25&&(fx<=8||fx>=24))return;
  // Head only: leather elsewhere must never become hair. Cream facial skin is excluded.
  const headEnd=profession==='knight'?24:profession==='archer'?22:24;
  if(fy<headEnd&&inHead){
    if(profession==='mage'&&fy>=19&&fx>=10&&fx<=22&&saturation<.30&&b>=r*.95&&max>85)return 'hair';
    if(profession!=='mage'&&hue>=12&&hue<=47&&saturation>(profession==='knight'?.46:.30)&&
      (row===3||fy<(profession==='knight'?18:16)||max<(profession==='knight'?200:135)&&((row===1&&fx>=15)||(row===2&&fx<=17)||(row===0&&(fx<12||fx>21)))))return 'hair';
  }
  const bootStart=profession==='knight'?41:profession==='archer'?42:44;
  if(fy>=bootStart&&fx>=8&&fx<=24&&hue>=12&&hue<48&&saturation>.30)return 'feet';
  if(profession==='knight'){
    if(fy>=36&&fy<41&&fx>=9&&fx<=23&&saturation<.40&&max>50)return 'legs';
    if(hue>=160&&hue<=225&&saturation>.20)return 'body';
  }else if(profession==='archer'){
    if(fy>=35&&fy<42&&fx>=9&&fx<=23&&hue>=12&&hue<80&&saturation>.20)return 'legs';
    if(hue>=80&&hue<=170&&saturation>.20)return 'body';
  }else{
    if(hue>245&&hue<=310&&saturation>.25)return 'legs';
    if(hue>=185&&hue<=245&&saturation>.30)return 'body';
  }
}
/** Recolor only labelled fabric/hair/leather, retaining the source shading and transparency. */
export function recolorOutfit(source:Uint8ClampedArray,profession:Profession,appearance:Appearance):Uint8ClampedArray {
  const pixels=new Uint8ClampedArray(source);
  if(outfitParts.every(part=>appearance[part]===null))return pixels;
  const regions=new Map<number,keyof Appearance>(),sums={hair:0,body:0,legs:0,feet:0},counts={hair:0,body:0,legs:0,feet:0};
  for(let i=0;i<source.length;i+=4){
    if(source[i+3]===0)continue;
    const part=partFor(profession,(i/4)%96,Math.floor(i/4/96),source[i]!,source[i+1]!,source[i+2]!);
    if(part&&appearance[part]!==null){regions.set(i,part);sums[part]+=(Math.max(source[i]!,source[i+1]!,source[i+2]!)+Math.min(source[i]!,source[i+1]!,source[i+2]!))/2;counts[part]++;}
  }
  for(const [i,part]of regions){
    const color=appearance[part]!,rgb=[1,3,5].map(at=>parseInt(color.slice(at,at+2),16));
    const light=(Math.max(source[i]!,source[i+1]!,source[i+2]!)+Math.min(source[i]!,source[i+1]!,source[i+2]!))/2;
    const shade=Math.min(1.7,Math.max(.35,light/(sums[part]/counts[part])));
    for(let channel=0;channel<3;channel++)pixels[i+channel]=Math.round(Math.min(255,rgb[channel]!*shade));
  }
  return pixels;
}
