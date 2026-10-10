import { test, expect } from '@playwright/test';
test('animated combat: rejected melee, spark, pursuit, sword, cleanup and restart',async({page},info)=>{
  test.setTimeout(90000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('/');await page.locator('#graphics-style').selectOption('colorful');await page.locator('#mode').selectOption('trial');
  await page.getByRole('button',{name:/Rozpocznij/}).click();await page.locator('#cycle-target').click();
  await expect(page.locator('#target-label')).toContainText('Szczur');
  await page.locator('#attack').click();await expect(page.locator('#message')).toContainText('poza zasięgiem');
  await expect(page.locator('#hud')).not.toHaveAttribute('data-combat-id',/.+/);
  await page.locator('#cast').click();await expect(page.locator('#hud')).toHaveAttribute('data-combat','spell');
  await expect(page.locator('#hud')).toHaveAttribute('data-effects',/^[1-9][0-9]*$/);
  await page.screenshot({path:info.outputPath('spark.png')});
  // Let the provoked rat approach, with an animated four-legged stride.
  await expect(page.locator('#target-label')).toContainText('1 kratek');
  await page.screenshot({path:info.outputPath('pursuit.png')});
  await page.locator('#attack').click();await expect(page.locator('#hud')).toHaveAttribute('data-combat','melee');
  await expect(page.locator('#objective')).toHaveText('1 / 3');
  await page.screenshot({path:info.outputPath('sword.png')});
  await expect(page.locator('#hud')).toHaveAttribute('data-effects','0',{timeout:4000});
  const lastId=await page.locator('#hud').getAttribute('data-combat-id');
  await page.waitForTimeout(300);expect(await page.locator('#hud').getAttribute('data-combat-id')).toBe(lastId);
  await page.locator('#menu-button').click();await page.getByRole('button',{name:/Rozpocznij/}).click();
  await expect(page.locator('#objective')).toHaveText('0 / 3');await expect(page.locator('#hud')).toHaveAttribute('data-effects','0');
  await expect(page.locator('#hud')).not.toHaveAttribute('data-combat-id',/.+/);
  expect(errors).toEqual([]);
});
