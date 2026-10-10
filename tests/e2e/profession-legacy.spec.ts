import {test,expect} from '@playwright/test';
test('legacy adventure becomes Knight and foreign profession import preserves the save',async({page})=>{
  test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();
  const legacy=await page.evaluate(()=>{
    const d=JSON.parse(localStorage.getItem('eldoria.offline.v1')!);delete d.profession;delete d.actionSlots;delete d.spellCooldowns;delete d.guardIn;delete d.appearance;
    d.gold=17;d.quest={status:'claimed',kills:5};return d;
  });
  await page.locator('#menu-button').click();await page.locator('#profession').selectOption('mage');
  await page.locator('#import-save').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
  await expect(page.locator('#hud')).toHaveAttribute('data-profession','knight');await expect(page.locator('#objective')).toHaveText('✓');await expect(page.locator('#rewards')).toContainText('17 złota');
  await expect(page.locator('#hud')).toHaveAttribute('data-action-slots','attack,blade-wave,spin,guard');
  await page.locator('#save-button').click();await page.reload();await page.locator('#profession').selectOption('archer');await page.locator('#resume').click();
  await expect(page.locator('#hud')).toHaveAttribute('data-profession','knight');await expect(page.locator('#rewards')).toContainText('17 złota');
  await page.locator('#menu-button').click();const stored=await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1')!);
  const incompatible=JSON.parse(stored);incompatible.actionSlots[1]='fireball';
  await page.locator('#import-save').setInputFiles({name:'foreign-skill.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incompatible))});
  await expect(page.locator('#save-menu-status')).toContainText('Import odrzucony');expect(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1'))).toBe(stored);expect(errors).toEqual([]);
});
