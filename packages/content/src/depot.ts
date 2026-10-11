/** Persistent storage, located inside the existing inn in Vareon. No offline player market. */
export const depotRules={slots:100,range:1,maxGold:10000000} as const;
export function depotOnMap(mapId:string):{x:number;y:number}|undefined {
  return mapId==='eldoria'?{x:20,y:98}:mapId==='vareon'?{x:12,y:34}:undefined;
}
