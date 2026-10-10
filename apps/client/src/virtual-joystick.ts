import type {Direction} from '@eldoria/protocol';
/** One captured thumb owns movement; other pointers remain available for actions. */
export class VirtualJoystick {
  private pointer:number|undefined;
  private direction:Direction|undefined;
  constructor(private root:HTMLElement,enabled:()=>boolean,private onDirection:(pointer:number,d:Direction|undefined)=>void) {
    root.addEventListener('pointerdown',e=>{
      e.preventDefault();if(this.pointer!==undefined||!enabled())return;
      this.pointer=e.pointerId;root.setPointerCapture(e.pointerId);root.classList.add('held');this.update(e);
    });
    root.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer)this.update(e);});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(name,e=>{if((e as PointerEvent).pointerId===this.pointer)this.reset();});
    root.addEventListener('contextmenu',e=>e.preventDefault());
  }
  private update(e:PointerEvent):void {
    const box=this.root.getBoundingClientRect(),radius=Math.min(box.width,box.height)*.32;
    const x=e.clientX-box.x-box.width/2,y=e.clientY-box.y-box.height/2,length=Math.hypot(x,y),scale=length>radius?radius/length:1;
    this.root.style.setProperty('--stick-x',`${x*scale}px`);this.root.style.setProperty('--stick-y',`${y*scale}px`);
    let next:Direction|undefined;
    if(length>=radius*.3) {
      // A small axis margin avoids alternating directions at a diagonal boundary.
      const horizontal=this.direction==='left'||this.direction==='right';
      const vertical=this.direction==='up'||this.direction==='down';
      const useHorizontal=horizontal?Math.abs(x)*1.15>=Math.abs(y):vertical?Math.abs(x)>Math.abs(y)*1.15:Math.abs(x)>=Math.abs(y);
      next=useHorizontal?(x<0?'left':'right'):(y<0?'up':'down');
    }
    if(next!==this.direction){this.direction=next;this.onDirection(e.pointerId,next);}
  }
  reset():void {
    const id=this.pointer;this.pointer=undefined;this.direction=undefined;
    this.root.style.setProperty('--stick-x','0px');this.root.style.setProperty('--stick-y','0px');this.root.classList.remove('held');
    if(id!==undefined){this.onDirection(id,undefined);if(this.root.hasPointerCapture(id))this.root.releasePointerCapture(id);}
  }
}
