/** One private stash per character, accessible at every exclusive depot station. */
export const depotRules={slots:100,range:1,maxGold:10000000} as const;
export interface DepotStation {id:string;x:number;y:number;stand:{x:number;y:number}}
export function depotsOnMap(mapId:string):DepotStation[] {
  const offset=mapId==='eldoria'?{x:8,y:64}:mapId==='vareon'?{x:0,y:0}:undefined;
  return offset?[13,9,11,15].map((x,i)=>({id:`depot-${i+1}`,x:x+offset.x,y:33+offset.y,stand:{x:x+offset.x,y:34+offset.y}})):[];
}
/** Default station for the city guide; interaction uses the actor's exact stand tile. */
export function depotOnMap(mapId:string):DepotStation|undefined {return depotsOnMap(mapId)[0];}
export function depotAtStand(mapId:string,p:{x:number;y:number}):DepotStation|undefined {return depotsOnMap(mapId).find(d=>d.stand.x===p.x&&d.stand.y===p.y);}
/** Revision-2 walkable tiles newly occupied by depot dividers/chests. */
export function legacyDepotPositionAllowed(mapId:string,p:{x:number;y:number}):boolean {
  const dx=mapId==='eldoria'?8:0,dy=mapId==='eldoria'?64:0;
  if(mapId!=='eldoria'&&mapId!=='vareon')return false;
  const x=p.x-dx,y=p.y-dy;
  return y===33&&[8,9,10,11,12,13,14,16].includes(x)||y===34&&[8,12,14,16].includes(x);
}
