import {it,expect} from 'vitest';
import {defaultAppearance} from '@eldoria/protocol';
import {recolorOutfit} from './outfit-colors';
it('default appearance preserves every source pixel and recoloring preserves transparency, skin, outline and steel',()=>{
  const source=new Uint8ClampedArray(96*192*4);
  const pixel=(x:number,y:number,color:number[])=>source.set(color,(y*96+x)*4);
  pixel(15,6,[150,85,40,255]); // Hair.
  pixel(15,25,[30,120,140,255]);pixel(16,25,[45,160,180,255]); // Two fabric shades.
  pixel(15,38,[85,90,85,255]);pixel(15,44,[110,75,35,255]); // Legs and boots.
  pixel(16,15,[230,183,135,255]);pixel(9,25,[15,20,20,255]);pixel(27,25,[180,185,190,255]);
  const original=source.slice();expect(recolorOutfit(source,'knight',defaultAppearance())).toEqual(original);
  const colored=recolorOutfit(source,'knight',{hair:'#dd2255',body:'#ee8855',legs:'#3355cc',feet:'#55bb99'});
  const rgba=(data:Uint8ClampedArray,x:number,y:number)=>data.slice((y*96+x)*4,(y*96+x)*4+4);
  for(const [x,y] of [[15,6],[15,25],[15,38],[15,44]])expect(rgba(colored,x!,y!)).not.toEqual(rgba(source,x!,y!));
  for(const [x,y] of [[16,15],[9,25],[27,25],[0,0]])expect(rgba(colored,x!,y!)).toEqual(rgba(source,x!,y!));
  expect(colored[(25*96+16)*4]).toBeGreaterThan(colored[(25*96+15)*4]!);expect(source).toEqual(original);
  expect(recolorOutfit(source,'knight',defaultAppearance())).toEqual(original);
});
it('mage hair and footwear colors preserve the wand crystal, shaft and face',()=>{
  const source=new Uint8ClampedArray(96*192*4);
  const point=(x:number,y:number)=>4*(y*96+x);
  source.set([30,90,170,255],point(6,22));source.set([110,75,35,255],point(8,43));source.set([230,183,135,255],point(16,23));
  source.set([170,170,185,255],point(13,21));source.set([110,75,35,255],point(15,45));
  const colored=recolorOutfit(source,'mage',{hair:'#dd2255',body:'#ee8855',legs:null,feet:'#55bb99'});
  for(const [x,y]of [[6,22],[8,43],[16,23]])expect(colored.slice(point(x!,y!),point(x!,y!)+4)).toEqual(source.slice(point(x!,y!),point(x!,y!)+4));
  for(const [x,y]of [[13,21],[15,45]])expect(colored.slice(point(x!,y!),point(x!,y!)+4)).not.toEqual(source.slice(point(x!,y!),point(x!,y!)+4));
});
it('archer hair colors leave the quiver arrows in their original palette',()=>{
  const source=new Uint8ClampedArray(96*192*4),heads=[4*(10*96+15),4*(58*96+6)],quivers=[4*(17*96+26),4*(64*96+23)];
  for(const i of heads)source.set([150,85,40,255],i);for(const i of quivers)source.set([110,65,30,255],i);
  const colored=recolorOutfit(source,'archer',{hair:'#dd2255',body:'#ee8855',legs:'#3355cc',feet:'#55bb99'});
  for(const i of heads)expect(colored.slice(i,i+4)).not.toEqual(source.slice(i,i+4));for(const i of quivers)expect(colored.slice(i,i+4)).toEqual(source.slice(i,i+4));
});
