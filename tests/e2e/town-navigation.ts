import {expect,type Page} from '@playwright/test';
import town from '../../apps/client/public/assets/vareon.json' with {type:'json'};
/** Static-city BFS drives real cardinal key presses through doorways, never teleports. */
export async function walkInTown(page:Page,x:number,y:number):Promise<void> {
  const collision=town.layers.find(l=>l.name==='Collision')!.data!;
  const actors=new Set(town.layers.find(l=>l.name==='NPCs')!.objects!.map(n=>`${n.x/32},${n.y/32}`));
  const position=(await page.locator('#hud').getAttribute('data-position'))!.split(',').map(Number);
  const queue=[{x:position[0]!,y:position[1]!,keys:[] as string[]}],seen=new Set<string>();let route:string[]|undefined;
  while(queue.length){
    const p=queue.shift()!,k=`${p.x},${p.y}`;
    if(seen.has(k)||actors.has(k)||p.x<0||p.y<0||p.x>=48||p.y>=48||collision[p.y*48+p.x])continue;
    seen.add(k);if(p.x===x&&p.y===y){route=p.keys;break;}
    for(const [key,dx,dy]of [['w',0,-1],['s',0,1],['a',-1,0],['d',1,0]] as const)queue.push({x:p.x+dx,y:p.y+dy,keys:[...p.keys,key]});
  }
  expect(route,'Reachable city destination').toBeDefined();
  for(const key of route!){await page.waitForTimeout(230);await page.keyboard.press(key);}
  await expect(page.locator('#hud')).toHaveAttribute('data-position',`${x},${y}`);
}
