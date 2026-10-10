import { test, expect, type Page } from '@playwright/test';
import forest from '../../apps/client/public/assets/forest.json' with {type:'json'};
async function move(page:Page,key:string,count:number) {
  for(let i=0;i<count;i++) { await page.waitForTimeout(240); await page.keyboard.press(key); }
}
// Navigate the real controls around trees and patrolling actors; never teleport.
async function walkTo(page:Page,x:number,y:number) {
  const collision=forest.layers.find(l=>l.name==='Collision')!.data!;
  const blocked=new Set<string>();
  const read = () => page.locator('#hud').evaluate(el=>({position:el.dataset.position!,map:el.dataset.map}));
  let state = await read();
  for(let budget=0;budget<150;budget++) {
    const start=state.position.split(',').map(Number);
    if(start[0]===x && start[1]===y) return;
    const queue=[{x:start[0]!,y:start[1]!,keys:[] as string[]}], seen=new Set<string>();
    let route:string[]|undefined;
    while(queue.length) {
      const p=queue.shift()!, k=`${p.x},${p.y}`;
      if(seen.has(k)||blocked.has(k)||p.x<0||p.y<0||p.x>=64||p.y>=64||collision[p.y*64+p.x]) continue;
      seen.add(k);
      if(p.x===x&&p.y===y) { route=p.keys; break; }
      for(const [key,dx,dy] of [['w',0,-1],['s',0,1],['a',-1,0],['d',1,0]] as const) queue.push({x:p.x+dx,y:p.y+dy,keys:[...p.keys,key]});
    }
    expect(route?.length).toBeGreaterThan(0);
    const key=route![0]!; await move(page,key,1); await page.waitForTimeout(60);
    state=await read();
    if(state.position===start.join(',')) {
      const delta=({w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]} as const)[key as 'w'|'s'|'a'|'d'];
      blocked.add(`${start[0]!+delta[0]},${start[1]!+delta[1]}`);
    }
    expect(state.map).toBe('forest');
  }
  throw new Error('Exploration route exceeded movement budget');
}
test('old trail: real exploration, chronicle, reward once and saved discoveries',async({page},info)=>{
  // Full journey, two reloads and screenshots; this is a functional test, not an FPS budget.
  test.setTimeout(120000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();
  await page.locator('#interact').click();await page.getByRole('button',{name:'Przyjmij: Ślady dawnego szlaku'}).click();
  await expect(page.locator('#npc-text')).toContainText('0/3');await page.locator('#close-npc').click();
  await move(page,'w',7);await page.locator('#interact').click();
  await expect(page.locator('#target-label')).toContainText('Stary drogowskaz');
  await walkTo(page,32,53);await expect(page.locator('#hud')).toHaveAttribute('data-position','32,53');
  await page.locator('#interact').click();await expect(page.locator('#message')).toContainText('Odkrycia 1/3');
  await page.locator('#interact').click();await expect(page.locator('#message')).toContainText('Odkrycia 1/3');
  await page.screenshot({path:info.outputPath('trail.png')});
  await page.reload();await page.locator('#resume').click();await expect(page.locator('#target-label')).toContainText('odkryte');
  await walkTo(page,24,49);
  await expect(page.locator('#hud')).toHaveAttribute('data-position','24,49');
  await page.locator('#interact').click();await expect(page.locator('#message')).toContainText('Odkrycia 2/3');
  await walkTo(page,40,45);
  await expect(page.locator('#hud')).toHaveAttribute('data-position','40,45');
  await page.locator('#interact').click();await expect(page.locator('#message')).toContainText('3/3');
  await page.locator('#bag-button').click();await page.locator('#chronicle summary').click();
  await expect(page.locator('#chronicle-text')).toContainText('Tu kończy się stary szlak');
  const lastNote=page.locator('#chronicle-text p').last();
  await lastNote.scrollIntoViewIfNeeded();await expect(lastNote).toBeVisible();
  await page.screenshot({path:info.outputPath('chronicle.png')});await page.locator('#close-bag').click();
  await walkTo(page,32,59);await page.locator('#interact').click();
  await expect(page.locator('#hud')).toHaveAttribute('data-map','vareon');
  await page.locator('#interact').click();await page.getByRole('button',{name:'Odbierz nagrodę za szlak'}).click();
  await expect(page.locator('#npc-message')).toContainText('75 EXP, 25 złota');
  await expect(page.getByRole('button',{name:'Odbierz nagrodę za szlak'})).toHaveCount(0);
  await expect(page.locator('#rewards')).toContainText('25 złota');await page.locator('#close-npc').click();
  await page.reload();await page.locator('#resume').click();await page.locator('#interact').click();
  await expect(page.locator('#npc-text')).toContainText('Ślady dawnego szlaku: ukończone');
  await expect(page.getByRole('button',{name:'Odbierz nagrodę za szlak'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Przyjmij zadanie',exact:true})).toBeVisible();
  await page.locator('#close-npc').click();await page.locator('#bag-button').click();
  for(const button of await page.locator('#bag button').all()) { const b=await button.boundingBox();expect(b?.height).toBeGreaterThanOrEqual(48); }
  expect(errors).toEqual([]);
});
