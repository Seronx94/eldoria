/** Follow nearby movement during a bounded cosmetic flight; never follow a respawn/teleport. */
export function projectileEndpoint(initial:{x:number;y:number},current:{x:number;y:number}|undefined):{x:number;y:number} {
  return current&&Math.hypot(current.x-initial.x,current.y-initial.y)<=64?current:initial;
}
