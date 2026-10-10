import { test, expect } from '@playwright/test';
test('colorful art: native sprites, walking, NPC, portal, real combat and reversible comparison',async({page},info)=>{
  test.setTimeout(90000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('/');
  await expect(page.locator('#graphics-style')).toHaveValue('colorful');
  await page.getByRole('button',{name:/Rozpocznij/}).click();
  await expect(page.locator('#hud')).toHaveAttribute('data-graphics','colorful');
  await page.waitForTimeout(700); await page.screenshot({path:info.outputPath('colorful-town.png')});
  await page.locator('#interact').click(); await expect(page.locator('#npc-name')).toHaveText('Mira');
  await page.getByRole('button',{name:'Przyjmij zadanie'}).click(); await page.locator('#close-npc').click();
  for(let i=0;i<15;i++){await page.waitForTimeout(220); await page.keyboard.press('W');}
  await page.locator('#interact').click(); await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');
  await page.waitForTimeout(700); await page.screenshot({path:info.outputPath('colorful-forest.png')});
  await expect.poll(()=>page.locator('#hp').evaluate(el=>(el as HTMLProgressElement).value)).toBeLessThan(100);
  await page.locator('#cycle-target').click(); await expect(page.locator('#target-label')).toContainText('Szczur');
  await page.locator('#cast').click();await page.keyboard.down('Space');
  await expect(page.locator('#objective')).toHaveText('1 / 5',{timeout:15000});await page.keyboard.up('Space');
  await page.locator('#loot').click(); expect(Number((await page.locator('#rewards').textContent())!.match(/(\d+) złota/)![1])).toBeGreaterThanOrEqual(1);
  await page.locator('#menu-button').click();
  await page.locator('#mode').selectOption('trial'); await page.locator('#walk-mode').check();
  await page.getByRole('button',{name:/Rozpocznij/}).click();
  for(let i=0;i<5;i++){await page.waitForTimeout(220);await page.keyboard.press('W');}
  await page.waitForTimeout(700); await page.screenshot({path:info.outputPath('colorful-sample.png')});
  await page.keyboard.down('d'); await page.waitForTimeout(100); await page.screenshot({path:info.outputPath('colorful-moving.png')}); await page.keyboard.up('d');
  const [movedX,movedY]=(await page.locator('#hud').getAttribute('data-position'))!.split(',').map(Number);
  expect(movedX).toBeGreaterThan(13); expect(movedY).toBe(6);
  expect(await page.locator('canvas').evaluate(c=>getComputedStyle(c).imageRendering)).toBe('pixelated');
  for(const button of await page.locator('#hud button').all()){
    if(!await button.isVisible())continue;
    const box=await button.boundingBox(); expect(box?.width).toBeGreaterThanOrEqual(48);expect(box?.height).toBeGreaterThanOrEqual(48);
  }
  await page.locator('#menu-button').click(); await page.locator('#graphics-style').selectOption('classic');
  await page.getByRole('button',{name:/Rozpocznij/}).click();
  for(let i=0;i<5;i++){await page.waitForTimeout(220);await page.keyboard.press('W');}
  await page.waitForTimeout(700); await page.screenshot({path:info.outputPath('classic-sample.png')});
  await expect(page.locator('#hud')).toHaveAttribute('data-graphics','classic');
  await page.reload(); await expect(page.locator('#graphics-style')).toHaveValue('classic');
  expect(errors).toEqual([]);
});
