import {test,expect} from '@playwright/test';
import {walkInTown} from './town-navigation';
test('Vareon: located services, doors, roofs, plan, market, resize and old save migration',async({page},info)=>{
  test.setTimeout(180000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();
  await expect(page.locator('#hud')).toHaveAttribute('data-building','gatehouse');
  await page.screenshot({path:info.outputPath('gatehouse.png')});
  await page.locator('#bag-button').click();await page.locator('#city-guide summary').click();
  await expect(page.getByRole('img',{name:/Plan Vareon/})).toBeVisible();
  for(const b of await page.locator('[data-guide]').all()){const box=await b.boundingBox();expect(box?.height).toBeGreaterThanOrEqual(48);}
  await page.locator('[data-guide="oren"]').click();await expect(page.locator('#target-label')).toContainText('Uzdrowiciel świątyni');
  await walkInTown(page,12,23);await expect(page.locator('#hud')).toHaveAttribute('data-building','temple');
  await page.waitForTimeout(350);await page.screenshot({path:info.outputPath('temple.png')});
  await page.locator('#interact').click();await expect(page.locator('#npc-name')).toHaveText('Oren');await page.getByRole('button',{name:'Przywróć zdrowie i manę'}).click();await page.locator('#close-npc').click();
  await walkInTown(page,12,27);await expect(page.locator('#hud')).toHaveAttribute('data-building','outside');
  await walkInTown(page,24,28);await page.waitForTimeout(350);await page.screenshot({path:info.outputPath('market.png')});
  await page.locator('#bag-button').click();await page.locator('[data-guide="borin"]').click();
  await expect(page.locator('#target-label')).toContainText('Kupiec przy rynku');
  await walkInTown(page,36,22);await expect(page.locator('#hud')).toHaveAttribute('data-building','shop');
  await page.waitForTimeout(350);await page.screenshot({path:info.outputPath('shop.png')});
  await page.locator('#interact').click();await expect(page.locator('#npc-name')).toHaveText('Borin');await page.locator('#close-npc').click();
  const original=page.viewportSize()!;await page.setViewportSize({width:390,height:844});await expect(page.locator('#rotate')).toBeVisible();await page.setViewportSize(original);await expect(page.locator('#hud')).toHaveAttribute('data-building','shop');
  await page.locator('#save-button').click();
  // Install the legacy fixture after pagehide has saved the current adventure.
  await page.addInitScript(()=>{const key='eldoria.offline.v1';const save=JSON.parse(localStorage.getItem(key)!);delete save.cityRevision;save.player={x:7,y:23};save.gold=17;localStorage.setItem(key,JSON.stringify(save));});
  await page.reload();await page.locator('#resume').click();await expect(page.locator('#hud')).toHaveAttribute('data-position','24,12');await expect(page.locator('#rewards')).toContainText('17 złota');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('eldoria.offline.v1')!).cityRevision)).toBe(2);
  expect(await page.locator('canvas').evaluate(c=>getComputedStyle(c).imageRendering)).toBe('pixelated');expect(errors).toEqual([]);
});
