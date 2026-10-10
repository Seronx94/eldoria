import {test,expect} from '@playwright/test';
test('thumb stick: dead zone, cardinal drag, pointer ownership, release, resize and dialog reset',async({page},info)=>{
  test.skip(info.project.name!=='mobile-landscape','Thumb stick uses mobile viewport');test.setTimeout(60000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();
  const stick=page.locator('#joystick');await expect(stick).toBeVisible();await expect(page.locator('.dpad')).toBeHidden();
  const box=(await stick.boundingBox())!,cx=box.x+box.width/2,cy=box.y+box.height/2;
  const session=await page.context().newCDPSession(page);
  const touch=(x:number,y:number,id=1)=>({x,y,id});
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(cx+2,cy)]});await page.waitForTimeout(450);
  await expect(page.locator('#hud')).toHaveAttribute('data-position','32,76');
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(cx-30,cy)]});
  const position=async()=>(await page.locator('#hud').getAttribute('data-position'))!.split(',').map(Number);
  await expect.poll(async()=>(await position())[0]).toBeLessThan(32);
  // Center before reading: a held stick can legitimately make several steps during a slow DOM read.
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(cx,cy)]});
  const left=await position();expect(left[0]).toBeGreaterThanOrEqual(30);expect(left[1]).toBe(76);
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(cx,cy-30)]});
  await expect.poll(async()=>(await position())[1]).toBeLessThan(76);
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(cx,cy)]});
  expect((await position())[0]).toBe(left[0]);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const stopped=await page.locator('#hud').getAttribute('data-position');await page.waitForTimeout(500);await expect(page.locator('#hud')).toHaveAttribute('data-position',stopped!);
  await expect(stick).not.toHaveClass(/held/);expect(await stick.evaluate(el=>el.style.getPropertyValue('--stick-x'))).toBe('0px');
  // Only the first finger owns the stick; releasing the second finger leaves it held.
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(cx,cy)]});
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(cx,cy),touch(cx+25,cy,2)]});
  await page.waitForTimeout(350);await expect(page.locator('#hud')).toHaveAttribute('data-position',stopped!);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[touch(cx+25,cy,2)]});await expect(stick).toHaveClass(/held/);
  await page.setViewportSize({width:390,height:844});await expect(stick).not.toHaveClass(/held/);await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.setViewportSize({width:844,height:390});await expect(page.locator('#hud')).toHaveAttribute('data-position',stopped!);
  const bag=(await page.locator('#bag-button').boundingBox())!;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(cx,cy)]});await expect(stick).toHaveClass(/held/);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(cx,cy),touch(bag.x+bag.width/2,bag.y+bag.height/2,2)]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[touch(bag.x+bag.width/2,bag.y+bag.height/2,2)]});
  await expect(page.locator('#bag')).toBeVisible();await expect(stick).not.toHaveClass(/held/);
  await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.locator('#close-bag').click();
  for(const id of ['attack','cast','potion','cycle-target','loot','interact']){await expect(page.locator(`#${id} svg`)).toBeVisible();const b=(await page.locator(`#${id}`).boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(48);expect(b.height).toBeGreaterThanOrEqual(48);}
  await page.screenshot({path:info.outputPath('joystick-mobile.png')});
  expect(errors).toEqual([]);await session.detach();
});
