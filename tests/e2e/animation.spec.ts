import {openMenu} from './menu-navigation';
import { test, expect } from '@playwright/test';
test('animated combat: automatic melee, spark, pursuit, sword, cleanup and restart',async({page},info)=>{
  test.setTimeout(90000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('/');await page.locator('#graphics-style').selectOption('colorful');await page.locator('#mode').selectOption('trial');
  await page.getByRole('button',{name:/Rozpocznij/}).click();await page.locator('#cycle-target').click();
  await expect(page.locator('#target-label')).toContainText('Szczur');
  await page.locator('#cast').click();await expect(page.locator('#hud')).toHaveAttribute('data-combat','spell');
  await expect(page.locator('#hud')).toHaveAttribute('data-effects',/^[1-9][0-9]*$/);
  await page.screenshot({path:info.outputPath('spark.png')});
  // Let the provoked rat approach, with an animated four-legged stride.
  await expect(page.locator('#target-label')).toContainText('1 kratek');
  await page.screenshot({path:info.outputPath('pursuit.png')});
  await page.keyboard.down('Space');await expect(page.locator('#hud')).toHaveAttribute('data-combat','melee');
  await expect(page.locator('#objective')).toHaveText('1 / 3');await page.keyboard.up('Space');
  await page.screenshot({path:info.outputPath('sword.png')});
  // The beetle can occupy the northern route. Fight it before walking to the safe scene.
  await page.keyboard.down('Space');await expect(page.locator('#objective')).toHaveText('2 / 3',{timeout:15000});await page.keyboard.up('Space');
  for(let i=0;i<7;i++){await page.waitForTimeout(230);await page.keyboard.press('w');}
  await page.locator('#interact').click();await expect(page.locator('#hud')).toHaveAttribute('data-map','courtyard');
  await expect(page.locator('#hud')).toHaveAttribute('data-effects','0',{timeout:4000});
  await openMenu(page);await page.getByRole('button',{name:/Rozpocznij/}).click();
  await expect(page.locator('#objective')).toHaveText('0 / 3');await expect(page.locator('#hud')).toHaveAttribute('data-effects','0');
  await expect(page.locator('#hud')).not.toHaveAttribute('data-combat-id',/.+/);
  expect(errors).toEqual([]);
});
