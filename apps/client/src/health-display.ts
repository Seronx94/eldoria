/** Shared readable health colours; no mana or private character data. */
export function healthDisplay(hp:number,maxHp:number):{ratio:number;color:number;css:string} {
 const ratio=maxHp>0?Math.max(0,Math.min(1,hp/maxHp)):0;
 const color=ratio>.5?0x71d569:ratio>.25?0xffd45b:0xf36b63;
 return {ratio,color,css:`#${color.toString(16).padStart(6,'0')}`};
}
