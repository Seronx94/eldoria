import {openMenu} from './menu-navigation';
import {test,expect} from '@playwright/test';
test('free sword and spark: hold, release, blur, empty cast and roof visibility',async({page},info)=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();
  const hud=page.locator('#hud');
  await expect(hud).toHaveAttribute('data-building','gatehouse');
  await expect(hud).toHaveAttribute('data-roofs',/temple/);await expect(hud).not.toHaveAttribute('data-roofs',/gatehouse/);
  for(let i=0;i<2;i++){await page.waitForTimeout(230);await page.keyboard.press('s');}
  await expect(hud).toHaveAttribute('data-building','outside');await expect(hud).not.toHaveAttribute('data-roofs',/gatehouse/);
  for(let i=0;i<3;i++){await page.waitForTimeout(230);await page.keyboard.press('s');}
  await expect(hud).toHaveAttribute('data-position','32,81');await expect(hud).toHaveAttribute('data-roofs',/gatehouse/);
  expect((await hud.getAttribute('data-roofs'))!.split(',')).toHaveLength(7);
  await page.waitForTimeout(300);await page.screenshot({path:info.outputPath('exterior-roofs.png')});
  await page.waitForTimeout(230);await page.keyboard.press('w');
  await expect(hud).toHaveAttribute('data-roofs',/gatehouse/);
  await page.waitForTimeout(230);await page.keyboard.press('w');
  await expect(hud).toHaveAttribute('data-building','outside');await expect(hud).not.toHaveAttribute('data-roofs',/gatehouse/);
  await page.screenshot({path:info.outputPath('approaching-roof.png')});
  for(let i=0;i<3;i++){await page.waitForTimeout(230);await page.keyboard.press('w');}
  await expect(hud).not.toHaveAttribute('data-roofs',/gatehouse/);expect((await hud.getAttribute('data-roofs'))!.split(',')).toHaveLength(6);
  await openMenu(page);await page.locator('#mode').selectOption('trial');await page.locator('#walk-mode').check();await page.getByRole('button',{name:/Rozpocznij/}).click();
  for(let i=0;i<7;i++){await page.waitForTimeout(230);await page.keyboard.press('w');}
  await page.locator('#interact').click();await expect(hud).toHaveAttribute('data-map','grove');
  // No creature exists in the walk fixture: a swing still animates and does not create a reward.
  await page.keyboard.down('Space');await expect.poll(async()=>Number(await hud.getAttribute('data-combat-id'))).toBeGreaterThanOrEqual(3);
  await page.keyboard.up('Space');await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));const released=await hud.getAttribute('data-combat-id');await page.waitForTimeout(1000);await expect(hud).toHaveAttribute('data-combat-id',released!);
  await expect(hud).toHaveAttribute('data-combat-damage','0');await expect(page.locator('#rewards')).toContainText('0 EXP · 0 złota');
  await hud.evaluate(el=>{
    el.dataset.observedEffects='0';
    const observer=new MutationObserver(()=>{
      el.dataset.observedEffects=String(Math.max(Number(el.dataset.observedEffects),Number(el.dataset.effects)));
    });observer.observe(el,{attributes:true,attributeFilter:['data-effects']});
  });
  await page.locator('#cast').click();await page.screenshot({path:info.outputPath('free-spark.png')});await expect(hud).toHaveAttribute('data-combat','spell');await expect(hud).toHaveAttribute('data-combat-target','');
  await expect(hud).toHaveAttribute('data-observed-effects',/^[1-9]/);await expect.poll(()=>page.locator('#mana').evaluate(el=>(el as HTMLProgressElement).value)).toBeLessThan(50);
  await page.keyboard.down('Space');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('Space');
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const blurred=await hud.getAttribute('data-combat-id');await page.waitForTimeout(1000);await expect(hud).toHaveAttribute('data-combat-id',blurred!);
  if(info.project.name==='mobile-landscape'){
    const session=await page.context().newCDPSession(page),stick=(await page.locator('#joystick').boundingBox())!,attack=(await page.locator('#attack').boundingBox())!;
    const first={x:stick.x+stick.width*.15,y:stick.y+stick.height/2,id:1},second={x:attack.x+attack.width/2,y:attack.y+attack.height/2,id:2};
    const before=Number(await hud.getAttribute('data-combat-id'));
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,second]});
    await expect.poll(async()=>Number(await hud.getAttribute('data-combat-id'))).toBeGreaterThan(before+1);
    await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(page.locator('#joystick')).not.toHaveClass(/held/);
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    const cancelled=await hud.getAttribute('data-combat-id'),position=await hud.getAttribute('data-position');
    await page.waitForTimeout(1000);await expect(hud).toHaveAttribute('data-combat-id',cancelled!);await expect(hud).toHaveAttribute('data-position',position!);await session.detach();
  }
  expect(errors).toEqual([]);
});

test('nearby monsters approach and melee kills without selecting a target',async({page})=>{
  test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();await page.locator('#interact').click();await page.getByRole('button',{name:'Przyjmij zadanie',exact:true}).click();await page.locator('#close-npc').click();
  for(let i=0;i<15;i++){await page.waitForTimeout(230);await page.keyboard.press('w');}
  await expect(page.locator('#hud')).toHaveAttribute('data-position','32,61');
  // From four or more tiles away, rats must approach before their attack can reduce HP.
  await expect.poll(()=>page.locator('#hp').evaluate(el=>(el as HTMLProgressElement).value)).toBeLessThan(100);
  await page.keyboard.down('Space');await expect(page.locator('#objective')).toHaveText('1 / 5',{timeout:12000});await page.keyboard.up('Space');
  await expect(page.locator('#message')).toContainText('Pokonano');
  for(let i=0;i<3;i++){await page.waitForTimeout(230);await page.keyboard.press('s');}
  await expect(page.locator('#hud')).toHaveAttribute('data-position','32,64');
  const hp=await page.locator('#hp').evaluate(el=>(el as HTMLProgressElement).value);await page.waitForTimeout(1800);expect(await page.locator('#hp').evaluate(el=>(el as HTMLProgressElement).value)).toBe(hp);
  expect(errors).toEqual([]);
});
