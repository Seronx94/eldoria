import {movementDirection} from '@eldoria/content';
import type {MoveDirection} from '@eldoria/protocol';
/** One captured thumb owns movement; other pointers remain available for actions. */
export class VirtualJoystick {
  private pointer:number|undefined;
  private direction:MoveDirection|undefined;
  constructor(private root:HTMLElement,enabled:()=>boolean,private onDirection:(pointer:number,d:MoveDirection|undefined)=>void) {
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
    let next:MoveDirection|undefined;
    if(length>=radius*.3) {
      const angle=Math.atan2(y,x),sector=Math.round(angle/(Math.PI/4));
      next=movementDirection(Math.round(Math.cos(sector*Math.PI/4)),Math.round(Math.sin(sector*Math.PI/4)));
    }
    if(next!==this.direction){this.direction=next;this.onDirection(e.pointerId,next);}
  }
  reset():void {
    const id=this.pointer;this.pointer=undefined;this.direction=undefined;
    this.root.style.setProperty('--stick-x','0px');this.root.style.setProperty('--stick-y','0px');this.root.classList.remove('held');
    if(id!==undefined){this.onDirection(id,undefined);if(this.root.hasPointerCapture(id))this.root.releasePointerCapture(id);}
  }
}
