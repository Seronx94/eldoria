import legacy from './legacy-vareon.json';
/** Only legitimate revision-1 positions may be relocated during the town redesign. */
export function legacyTownPositionAllowed(p:{x:number;y:number}):boolean {
  return Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<legacy.width&&p.y<legacy.height&&legacy.collision[p.y*legacy.width+p.x]===0&&!legacy.npcs.some(n=>n.x===p.x&&n.y===p.y);
}
