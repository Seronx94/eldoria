import {openMenu,saveOffline} from './menu-navigation';
import { test, expect, type Page } from '@playwright/test';
import {walkInTown,walkInWorld} from './town-navigation';
test.use({ actionTimeout:10000 });
async function move(page:Page,key:string,count=1) {
  for(let i=0;i<count;i++) { await page.waitForTimeout(220); await page.keyboard.press(key); }
}
async function begin(page:Page) {
  await page.goto('/'); await page.locator('#graphics-style').selectOption('classic'); await page.getByRole('button',{name:/Rozpocznij/}).click();
  await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');
  await expect(page.locator('#hud')).toHaveAttribute('data-position','32,76');
}
async function interact(page:Page) { await page.locator('#interact').click(); }
async function close(page:Page) { await page.getByRole('button',{name:'Zakończ rozmowę'}).click(); }
test('adventure: accept, five real kills, reward, heal, shop and reload',async({page},info)=>{
  test.setTimeout(300000); // Five kills with real respawn waits and full walking routes through three services.
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`);});
  await begin(page); await page.waitForTimeout(600); await page.screenshot({path:info.outputPath('vareon.png')});
  await interact(page); await expect(page.locator('#npc-name')).toHaveText('Mira');
  await page.keyboard.press('W'); await page.keyboard.press('e');
  await expect(page.locator('#hud')).toHaveAttribute('data-position','32,76'); await expect(page.locator('#hp-label')).toContainText('50 MP');
  await page.getByRole('button',{name:'Przyjmij zadanie'}).click(); await close(page);
  await move(page,'W',15);
  await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');
  await page.screenshot({path:info.outputPath('forest.png')});
  // Fight approaching monsters through the real held control; no manual selection is required.
  for(let kill=0;kill<5;kill++) {
    await page.keyboard.down('Space');
    await expect(page.locator('#objective')).toHaveText(`${kill+1} / 5`,{timeout:35000});
    await page.keyboard.up('Space');
    await page.getByRole('button',{name:/Łup/}).click();
    // Continue toward the spawn after a path-blocking pursuer has been defeated.
    const y=Number((await page.locator('#hud').getAttribute('data-position'))!.split(',')[1]);
    if(y>59)await move(page,'W',y-59);
  }
  const lootGold=Number((await page.locator('#rewards').textContent())!.match(/(\d+) złota/)![1]);
  expect(lootGold).toBeGreaterThanOrEqual(5);
  await expect(page.locator('#target-label')).toContainText('wróć do Miry');
  await walkInWorld(page,32,76); await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');
  await interact(page); await page.getByRole('button',{name:'Odbierz nagrodę'}).click();
  await expect(page.locator('#objective')).toHaveText('✓'); await expect(page.locator('#npc-message')).toContainText('20 złota');
  await expect(page.getByRole('button',{name:'Odbierz nagrodę'})).toHaveCount(0);
  await page.screenshot({path:info.outputPath('reward.png')}); await close(page);
  await walkInTown(page,12,23); await interact(page); await expect(page.locator('#npc-name')).toHaveText('Oren');
  await page.getByRole('button',{name:'Przywróć zdrowie i manę'}).click(); await expect(page.locator('#hp-label')).toHaveText('110 HP · 55 MP'); await close(page);
  await walkInTown(page,36,22); await interact(page); await expect(page.locator('#npc-name')).toHaveText('Borin');
  await expect(page.locator('#npc-text')).toContainText(`Twoje złoto: ${lootGold+20}`); await page.getByRole('button',{name:/Kup miksturę/}).click();
  await expect(page.locator('#npc-text')).toContainText(`Twoje złoto: ${lootGold+15}`); await close(page);
  await page.reload(); await page.getByRole('button',{name:'Wznów przygodę'}).click();
  await expect(page.locator('#hud')).toHaveAttribute('data-position','44,86'); await expect(page.locator('#objective')).toHaveText('✓');
  await expect(page.locator('#potion-count')).toContainText('6 SZT.'); await expect(page.locator('#rewards')).toContainText(`${lootGold+15} złota`);
  await walkInTown(page,24,12); await interact(page); await expect(page.locator('#npc-text')).toContainText('nagroda odebrana');
  await expect(page.getByRole('button',{name:'Odbierz nagrodę'})).toHaveCount(0); expect(errors).toEqual([]);
});
test('five continuous journeys: one world, no gate command, one step per press',async({page},info)=>{
  test.setTimeout(180000); await begin(page);
  for(let i=0;i<5;i++) {
    for(let y=75;y>=63;y--){await move(page,'W');await expect(page.locator('#hud')).toHaveAttribute('data-position',`32,${y}`);await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');}
    await expect(page.locator('#hud')).toHaveAttribute('data-region','forest');await expect(page.locator('#map-name')).toHaveText('MROCZNY LAS');
    if(i===0){await page.screenshot({path:info.outputPath('continuous-forest.png')});await interact(page);await expect(page.locator('#hud')).toHaveAttribute('data-position','32,63');}
    for(let y=64;y<=76;y++){await move(page,'S');await expect(page.locator('#hud')).toHaveAttribute('data-position',`32,${y}`);await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');}
    await expect(page.locator('#hud')).toHaveAttribute('data-region','vareon');await expect(page.locator('#map-name')).toContainText('STREFA BEZPIECZNA');
  }
});
test('damaged save stays intact, backup recovery works and invalid import cannot replace it',async({page})=>{
  await begin(page); await move(page,'A'); await saveOffline(page);
  await page.evaluate(()=>localStorage.setItem('eldoria.offline.v1','{damaged'));
  await page.reload(); await expect(page.locator('#save-menu-status')).toContainText('uszkodzony');
  expect(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1'))).toBe('{damaged');
  await page.locator('#import-save').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":99}')});
  await expect(page.locator('#save-menu-status')).toContainText('Import odrzucony');
  expect(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1'))).toBe('{damaged');
  await page.getByRole('button',{name:'Odzyskaj kopię zapisu'}).click(); await expect(page.locator('#hud')).toHaveAttribute('data-position','32,76');
  expect(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1.damaged'))).toBe('{damaged');
  await openMenu(page);
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Eksport zapisu'}).click()]);
  await page.locator('#import-save').setInputFiles((await download.path())!); await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');
});

test('blocked storage reports an error while the active adventure can still be exported',async({page})=>{
  await page.addInitScript(()=>{ Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError');}; });
  await begin(page); await expect(page.locator('#save-status')).toContainText('brak miejsca');
  await move(page,'A'); await openMenu(page);
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Eksport zapisu'}).click()]);
  expect(download.suggestedFilename()).toBe('eldoria-offline.json');
  await page.locator('#import-save').setInputFiles((await download.path())!);
  await expect(page.locator('#hud')).toHaveAttribute('data-position','31,76'); await expect(page.locator('#save-status')).toContainText('brak miejsca');
});
