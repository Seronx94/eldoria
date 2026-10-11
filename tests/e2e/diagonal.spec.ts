import {test,expect,type Page} from '@playwright/test';
import {openMenu,saveOffline} from './menu-navigation';
import {registerCharacter} from './account-navigation';
import {randomUUID} from 'node:crypto';
async function start(page:Page){await page.goto('/');await page.locator('#name').fill('Tester');await page.getByRole('button',{name:/Rozpocznij/}).click();const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('eldoria.offline.v1')!));save.player={x:32,y:92};await openMenu(page);await page.locator('#import-save').setInputFiles({name:'diagonal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(save))});await expect(page.locator('#hud')).toHaveAttribute('data-position','32,92');await page.waitForTimeout(350);}
const position=async(page:Page)=>(await page.locator('#hud').getAttribute('data-position'))!.split(',').map(Number);
test('diagonal keyboard steps, combined WASD, animation and reload',async({page},info)=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 for(const [key,returnKey,target]of [['Numpad3','Numpad7','33,93'],['Numpad9','Numpad1','33,91'],['Numpad7','Numpad3','31,91'],['Numpad1','Numpad9','31,93']] as const){await page.keyboard.press(key);await expect(page.locator('#hud')).toHaveAttribute('data-position',target);await page.waitForTimeout(350);await page.keyboard.press(returnKey);await expect(page.locator('#hud')).toHaveAttribute('data-position','32,92');await page.waitForTimeout(350);}
 const samples=await page.evaluate(async()=>{
  const hud=document.querySelector<HTMLElement>('#hud')!,samples:number[][]=[],started=performance.now();
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'3',code:'Numpad3'}));window.dispatchEvent(new KeyboardEvent('keyup',{key:'3',code:'Numpad3'}));
  await new Promise<void>(resolve=>{const frame=()=>{samples.push((hud.dataset.heroPosition??'').split(',').map(Number));if(performance.now()-started<500)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});return samples;
 });
 expect(samples.some(([x,y])=>x!>1040&&x!<1072&&y!>2976&&y!<3008)).toBe(true);
 await page.keyboard.press('Numpad7');await expect(page.locator('#hud')).toHaveAttribute('data-position','32,92');await page.waitForTimeout(350);
 await page.keyboard.down('w');await page.keyboard.down('a');await expect.poll(async()=>{const p=await position(page);return p[0]!<32&&p[1]!<91;}).toBe(true);await page.keyboard.up('w');await page.keyboard.up('a');await page.waitForTimeout(350);const stopped=await page.locator('#hud').getAttribute('data-position');await page.waitForTimeout(400);await expect(page.locator('#hud')).toHaveAttribute('data-position',stopped!);
 await page.screenshot({path:info.outputPath('diagonal-keyboard.png')});await saveOffline(page);await page.reload();await page.locator('#resume').click();await expect(page.locator('#hud')).toHaveAttribute('data-position',stopped!);expect(errors).toEqual([]);
});
test('online diagonal movement survives character checkpoint and rejoin',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const name=`Skos${randomUUID().slice(0,6)}`;
 await page.goto('/');await registerCharacter(page,name,'knight');await page.locator('.character-card').filter({hasText:name}).click();await expect(page.locator('#hud')).toHaveAttribute('data-position','32,76');
 await page.keyboard.press('Numpad7');await expect(page.locator('#hud')).toHaveAttribute('data-position','31,75');await page.waitForTimeout(350);
 await page.keyboard.press('Numpad3');await expect(page.locator('#hud')).toHaveAttribute('data-position','32,76');await page.waitForTimeout(350);
 await page.keyboard.press('Numpad7');await expect(page.locator('#hud')).toHaveAttribute('data-position','31,75');await openMenu(page);await expect(page.locator('#menu')).toBeVisible();
 await page.reload();await page.locator('.character-card').filter({hasText:name}).click();await expect(page.locator('#hud')).toHaveAttribute('data-position','31,75');expect(errors).toEqual([]);
});
test('touch joystick sends diagonal movement, releases and resets after resize',async({page},info)=>{
 test.skip(info.project.name!=='mobile-landscape','Actual emulated touch uses mobile viewport');test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
 const stick=page.locator('#joystick'),box=(await stick.boundingBox())!,cx=box.x+box.width/2,cy=box.y+box.height/2,session=await page.context().newCDPSession(page);
 const touch=(x:number,y:number)=>({x,y,id:1});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(cx+28,cy+28)]});await expect.poll(async()=>{const p=await position(page);return p[0]!>32&&p[1]!>92;}).toBe(true);await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(cx,cy)]});const p=await position(page);expect(p[0]!-32).toBe(p[1]!-92);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);const stopped=await page.locator('#hud').getAttribute('data-position');await page.waitForTimeout(500);await expect(page.locator('#hud')).toHaveAttribute('data-position',stopped!);await page.screenshot({path:info.outputPath('diagonal-touch.png')});
 await page.setViewportSize({width:900,height:420});await expect(stick).not.toHaveClass(/held/);await expect(page.locator('#hud')).toHaveAttribute('data-position',stopped!);expect(errors).toEqual([]);
});
