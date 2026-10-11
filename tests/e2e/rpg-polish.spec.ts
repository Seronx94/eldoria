import {test,expect,type Page} from '@playwright/test';
import type {SaveData} from '@eldoria/domain';
import {professions} from '../../packages/content/src/professions';
async function arena(page:Page,level:number){
  const data=JSON.parse(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1')!)) as SaveData;
  data.level=level;data.exp=0;data.player={x:32,y:60};data.hp=80;data.mana=50;
  for(const c of data.maps[0]!.creatures)Object.assign(c,{hp:0,state:'dead',respawnIn:20000});
  await page.locator('#menu-button').click();await page.locator('#import-save').setInputFiles({name:'level-arena.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await expect(page.locator('#hud')).toHaveAttribute('data-position','32,60');
}
for(const profession of ['knight','archer','mage'] as const){
  test(`${profession}: level gates in action bar, codex and casting; backpack equipment survives reload`,async({page},info)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto('/');await page.locator('#profession').selectOption(profession);await page.getByRole('button',{name:/Rozpocznij/}).click();await arena(page,1);
    const buttons=page.locator('#action-bar button');await expect(buttons.nth(1)).toBeEnabled();await expect(buttons.nth(2)).toBeDisabled();await expect(buttons.nth(3)).toBeDisabled();
    await page.keyboard.press('3');await expect(page.locator('#message')).toContainText('wymagany poziom 3');
    await page.locator('#bag-button').click();await expect(page.locator('#bag-slots button')).toHaveCount(20);
    await expect(page.locator('#bag-slots svg')).toHaveCount(1);
    await expect(page.locator('#bag-slots .selected')).toHaveCount(0);
    await page.locator('#bag-slots button').first().click();
    const use=page.locator('#item-details').getByRole('button',{name:'Użyj mikstury'});const useBox=(await use.boundingBox())!;
    expect(useBox.width).toBeGreaterThanOrEqual(48);expect(useBox.height).toBeGreaterThanOrEqual(48);expect(useBox.y+useBox.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await use.click();await expect(page.locator('#bag-slots button').first()).toHaveAttribute('aria-label','Mikstura HP ×2');
    await page.locator('#equipment button').first().click();await expect(page.locator('#equipment')).toContainText('Broń: brak');
    await page.locator('#bag-slots button').filter({hasText:professions[profession].attackName}).click();
    await page.locator('#item-details').getByRole('button',{name:'Załóż'}).click();await expect(page.locator('#equipment')).toContainText(professions[profession].attackName);
    await page.locator('#bag').evaluate(el=>el.scrollTop=0);await page.screenshot({path:info.outputPath(`${profession}-backpack.png`)});
    await page.locator('#loadout summary').click();await expect(page.locator('#spellbook .locked')).toHaveCount(2);
    await page.locator('#close-bag').click();await page.locator('#save-button').click();await page.reload();await page.locator('#resume').click();await expect(buttons.nth(2)).toBeDisabled();
    await arena(page,3);await expect(buttons.nth(2)).toBeEnabled();await expect(buttons.nth(3)).toBeDisabled();await buttons.nth(2).click();
    await expect(page.locator('#hud')).toHaveAttribute('data-combat-effect',profession==='knight'?'spin':profession==='archer'?'volley':'fireball');
    await page.waitForTimeout(330);await page.screenshot({path:info.outputPath(`${profession}-impact.png`)});
    await arena(page,5);await expect(buttons.nth(3)).toBeEnabled();await buttons.nth(3).click();
    await expect(page.locator('#hud')).toHaveAttribute('data-combat-effect',profession==='knight'?'guard':profession==='archer'?'heal':'frost');
    await page.waitForTimeout(260);await page.screenshot({path:info.outputPath(`${profession}-advanced.png`)});
    expect(errors).toEqual([]);
  });
}
test('held movement renders intermediate positions continuously instead of full-tile jumps',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();await arena(page,1);
  await page.keyboard.down('ArrowUp');
  const samples=await page.locator('#hud').evaluate(el=>new Promise<{t:number;y:number}[]>(resolve=>{
    const points:{t:number;y:number}[]=[],start=performance.now();
    const frame=(t:number)=>{points.push({t,y:Number(el.dataset.heroPosition!.split(',')[1])});if(t-start<1100)requestAnimationFrame(frame);else resolve(points);};requestAnimationFrame(frame);
  }));
  await page.keyboard.up('ArrowUp');
  const steady=samples.filter(p=>p.t>samples[0]!.t+120);let moved=0,observed=0;
  for(let i=1;i<steady.length;i++){
    const before=steady[i-1]!,after=steady[i]!,dt=after.t-before.t;
    if(dt<40){observed++;const distance=before.y-after.y;expect(distance).toBeGreaterThanOrEqual(-.1);expect(distance).toBeLessThan(12);if(distance>.05)moved++;}
  }
  expect(observed).toBeGreaterThan(15);expect(moved/observed).toBeGreaterThan(.85);
  expect(samples[0]!.y-samples.at(-1)!.y).toBeGreaterThan(100);
});
