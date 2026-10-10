import type {Direction} from '@eldoria/protocol';

/** Face the actual step, including returning home, rather than the chased player's position. */
export function creatureFacing(from:{x:number;y:number},to:{x:number;y:number},previous:Direction):Direction {
  if(to.x!==from.x)return to.x>from.x?'right':'left';
  if(to.y!==from.y)return to.y>from.y?'down':'up';
  return previous;
}
export const creatureFrames:Record<Direction,{start:number;flipX:boolean}>={
  down:{start:0,flipX:false},right:{start:3,flipX:false},left:{start:3,flipX:true},up:{start:6,flipX:false},
};
