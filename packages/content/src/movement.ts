import type {MoveDirection,Direction} from '@eldoria/protocol';
import {rules} from './index';
export const movementVectors:Record<MoveDirection,{x:number;y:number}>={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0},'up-left':{x:-1,y:-1},'up-right':{x:1,y:-1},'down-left':{x:-1,y:1},'down-right':{x:1,y:1}};
export function movementDirection(x:number,y:number):MoveDirection|undefined {return (Object.keys(movementVectors) as MoveDirection[]).find(d=>movementVectors[d].x===Math.sign(x)&&movementVectors[d].y===Math.sign(y));}
export function movementFacing(d:MoveDirection):Direction {const v=movementVectors[d];return v.x? v.x<0?'left':'right':v.y<0?'up':'down';}
export function movementDuration(from:{x:number;y:number},to:{x:number;y:number}):number {return from.x!==to.x&&from.y!==to.y?rules.diagonalStepMs:rules.stepMs;}
