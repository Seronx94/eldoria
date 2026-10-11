import {randomUUID} from 'node:crypto';
import {registerCharacter} from './account-navigation';
import {walkInWorld} from './town-navigation';
import {test,expect,type Page} from '@playwright/test';
import {openMenu,saveOffline} from './menu-navigation';
async function fixture(page:Page,x:number,y:number){
 const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('eldoria.offline.v1')!));save.player={x,y};save.mapId='eldoria';
 await openMenu(page);await page.locator('#import-save').setInputFiles({name:'travel-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(save))});
 await expect(page.locator('#hud')).toHaveAttribute('data-position',`${x},${y}`);
}
async function step(page:Page,key:string,map:string,pos:string){await page.waitForTimeout(240);await page.keyboard.press(key);await expect(page.locator('#hud')).toHaveAttribute('data-map',map);await expect(page.locator('#hud')).toHaveAttribute('data-position',pos);}
test('walks five stair trips, explores caves and sails to winter island with reload and return',async({page},info)=>{
 const interact=async()=>info.project.name==='mobile-landscape'?page.locator('#interact').tap():page.locator('#interact').click();
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto('/');await page.locator('#name').fill('Tester');await page.getByRole('button',{name:/Rozpocznij/}).click();
 await fixture(page,46,88);
 for(let i=0;i<5;i++){await step(page,'w','shop-upper','5,8');if(i===0){await page.waitForTimeout(500);await page.screenshot({path:info.outputPath('shop-upper.png')});}await step(page,'s','eldoria','46,88');}
 await fixture(page,18,58);await step(page,'w','catacombs','7,7');await page.waitForTimeout(500);await page.screenshot({path:info.outputPath('catacombs.png')});await step(page,'s','eldoria','18,58');
 await fixture(page,58,93);await page.waitForTimeout(700);await page.screenshot({path:info.outputPath('harbour.png')});await interact();await expect(page.locator('#hud')).toHaveAttribute('data-map','nivora');await expect(page.locator('#hud')).toHaveAttribute('data-position','24,40');
 await page.waitForTimeout(500);await page.screenshot({path:info.outputPath('nivora.png')});await saveOffline(page);await page.reload();await page.locator('#resume').click();await expect(page.locator('#hud')).toHaveAttribute('data-map','nivora');
 await step(page,'s','nivora','24,41');await interact();await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');await expect(page.locator('#hud')).toHaveAttribute('data-position','58,93');expect(errors).toEqual([]);
});

test('online character uses real shop stairs and resumes the saved floor after logout',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const name=`Szlak${randomUUID().slice(0,6)}`;await page.goto('/');await registerCharacter(page,name,'knight');await page.locator('.character-card').filter({hasText:name}).click();await expect(page.locator('#hud')).toHaveAttribute('data-map','eldoria');
 await walkInWorld(page,46,88);await step(page,'w','shop-upper','5,8');await openMenu(page);await expect(page.locator('#menu')).toBeVisible();
 await page.reload();await expect(page.locator('.character-card').filter({hasText:name})).toBeVisible();await page.locator('.character-card').filter({hasText:name}).click();await expect(page.locator('#hud')).toHaveAttribute('data-map','shop-upper');await expect(page.locator('#hud')).toHaveAttribute('data-position','5,8');
 await step(page,'s','eldoria','46,88');expect(errors).toEqual([]);
});
