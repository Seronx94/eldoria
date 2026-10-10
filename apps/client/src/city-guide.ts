import {npcs,type NpcId,type WorldMap} from '@eldoria/content';
const namespace='http://www.w3.org/2000/svg';
/** A readable plan and destination choice; movement remains entirely manual. */
export class CityGuide {
  private pin:SVGCircleElement;
  constructor(map:WorldMap,root:HTMLElement,onChoose:(id:NpcId)=>void) {
    root.replaceChildren();
    const svg=document.createElementNS(namespace,'svg');svg.setAttribute('viewBox','0 0 48 48');svg.setAttribute('role','img');svg.setAttribute('aria-label','Plan Vareon: wartownia na północy, świątynia na zachodzie, sklep na wschodzie');
    const rectangle=(x:number,y:number,w:number,h:number,color:string)=>{const r=document.createElementNS(namespace,'rect');for(const [k,v]of Object.entries({x,y,width:w,height:h,fill:color}))r.setAttribute(k,String(v));svg.append(r);};
    rectangle(0,0,48,48,'#36533c');
    for(let y=0;y<48;y++)for(let x=0;x<48;) {
      if(!map.cityGround[y*48+x]){x++;continue;}
      const start=x;while(x<48&&map.cityGround[y*48+x])x++;
      rectangle(start,y,x-start,1,'#9e997d');
    }
    for(const b of map.buildings)rectangle(b.x,b.y,b.width,b.height,({guard:'#bc8357',temple:'#dbd9b6',shop:'#d6a256',inn:'#a57456',home:'#927759',workshop:'#bd7255'})[b.purpose]);
    for(const n of map.npcs) {
      const mark=document.createElementNS(namespace,'circle');mark.setAttribute('cx',String(n.x+.5));mark.setAttribute('cy',String(n.y+.5));mark.setAttribute('r','1.1');mark.setAttribute('fill','#1e3730');
      const title=document.createElementNS(namespace,'title');title.textContent=npcs[n.id].name;mark.append(title);svg.append(mark);
    }
    this.pin=document.createElementNS(namespace,'circle');this.pin.setAttribute('r','1');this.pin.setAttribute('fill','#8aeeff');this.pin.setAttribute('stroke','#152d27');this.pin.setAttribute('stroke-width','.3');svg.append(this.pin);root.append(svg);
    const actions=document.createElement('div');actions.className='city-guide-actions';
    for(const [id,label]of [['mira','Mira · wartownia'],['oren','Oren · świątynia'],['borin','Borin · sklep']] as const) {
      const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.guide=id;button.addEventListener('click',()=>onChoose(id));actions.append(button);
    }
    const hint=document.createElement('p');hint.textContent='Błękitny punkt: Twoja pozycja w mieście. Wybierz usługę, a wskazówka nad światem pokaże kierunek. Wejdź południowymi drzwiami; dach odsłoni wnętrze. Gospoda, domy i warsztat są do zwiedzania, bez dodatkowych usług.';
    root.append(actions,hint);
  }
  update(mapId:string,p:{x:number;y:number}):void {
    this.pin.style.display=mapId==='vareon'?'':'none';this.pin.setAttribute('cx',String(p.x+.5));this.pin.setAttribute('cy',String(p.y+.5));
  }
}
