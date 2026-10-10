import {test,expect} from '@playwright/test';
test('continuous colorful world: walk through the gate, camera, safe border and saved position',async({page},info)=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();
  for(let y=75;y>=64;y--){await page.waitForTimeout(230);await page.keyboard.press('w');await expect(page.locator('#hud')).toHaveAttribute('data-position',`32,${y}`);}
  await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');await expect(page.locator('#map-name')).toContainText('STREFA BEZPIECZNA');
  await page.waitForTimeout(500);await page.screenshot({path:info.outputPath('continuous-gate.png')});
  for(let i=0;i<5;i++){
    await page.waitForTimeout(230);
    // Mobile follows the same path using a real touch on the upper part of the thumb stick.
    if(info.project.name==='mobile-landscape'){const box=(await page.locator('#joystick').boundingBox())!;await page.touchscreen.tap(box.x+box.width/2,box.y+box.height*.2);}
    else await page.keyboard.press('w');
    await expect(page.locator('#hud')).toHaveAttribute('data-position','32,63');await expect(page.locator('#hud')).toHaveAttribute('data-region','forest');
    await expect(page.locator('#target-label')).toContainText('Vareon ↓');
    await page.locator('#interact').click();await expect(page.locator('#hud')).toHaveAttribute('data-position','32,63');
    // Crossing the region checkpoint is saved automatically; it is still one map.
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('eldoria.offline.v1')!))).toMatchObject({mapId:'eldoria',player:{x:32,y:63}});
    await page.waitForTimeout(230);await page.keyboard.press('s');await expect(page.locator('#hud')).toHaveAttribute('data-position','32,64');
    await page.locator('#cast').click();await expect(page.locator('#message')).toContainText('Strefa bezpieczna');
    await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');
  }
  await page.locator('#save-button').click();await page.reload();await page.locator('#resume').click();await expect(page.locator('#hud')).toHaveAttribute('data-position','32,64');
  expect(await page.locator('canvas').evaluate(c=>getComputedStyle(c).imageRendering)).toBe('pixelated');expect(errors).toEqual([]);
});

test('world respawn: return to safe gatehouse, retain progress and resume NPC interaction',async({page},info)=>{
  test.setTimeout(60000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();
  const raw=await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1')!);
  const data=JSON.parse(raw) as import('@eldoria/domain').SaveData;
  data.player={x:39,y:38};data.hp=1;data.gold=17;data.quest={status:'active',kills:2};
  // Let the view display the forest before the saved wolf cooldown expires.
  data.maps[0]!.creatures.find(c=>c.id==='wolf-1')!.attackIn=1200;
  await page.locator('#menu-button').click();
  await page.locator('#import-save').setInputFiles({name:'before-faint.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await expect(page.locator('#hud')).toHaveAttribute('data-position','32,76');
  await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');await expect(page.locator('#hud')).toHaveAttribute('data-building','gatehouse');
  await expect(page.locator('#hp-label')).toContainText('100 HP');await expect(page.locator('#objective')).toHaveText('2 / 5');await expect(page.locator('#rewards')).toContainText('17 złota');
  await page.waitForTimeout(300);await page.screenshot({path:info.outputPath('world-respawn.png')});
  await page.locator('#interact').click();await expect(page.locator('#npc-name')).toHaveText('Mira');expect(errors).toEqual([]);
});
