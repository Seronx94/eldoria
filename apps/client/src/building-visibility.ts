import type {TownBuilding} from '@eldoria/content';

/** Distance from the nearest occupied building tile, including its outer walls. */
export function nearBuilding(b:TownBuilding,p:{x:number;y:number},radius=2):boolean {
  return p.x>=b.x-radius&&p.y>=b.y-radius&&p.x<b.x+b.width+radius&&p.y<b.y+b.height+radius;
}
export function insideBuilding(b:TownBuilding,p:{x:number;y:number}):boolean {
  return nearBuilding(b,p,0);
}
