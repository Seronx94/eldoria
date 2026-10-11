import {openMenu} from './menu-navigation';
import {test,expect} from '@playwright/test';
import type {SaveData} from '@eldoria/domain';
test('owner bars/arcs and compact public health keep separate presentation and health colours',async({page},info)=>{
 test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto('/');await page.locator('#name').fill('Damian');await page.getByRole('button',{name:/Rozpocznij/}).click();
 const original=JSON.parse(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1')!)) as SaveData;
 for(const [hp,mobHp,color]of [[100,30,'#71d569'],[50,15,'#ffd45b'],[25,7,'#f36b63']] as const){
  const data=structuredClone(original);data.player={x:32,y:60};data.hp=hp;
  for(const c of data.maps[0]!.creatures)Object.assign(c,{hp:0,state:'dead',respawnIn:20000});
  Object.assign(data.maps[0]!.creatures.find(c=>c.id==='rat-1')!,{x:35,y:60,hp:mobHp,state:'idle',moveIn:400,attackIn:1200});
  await openMenu(page);await page.locator('#import-save').setInputFiles({name:'health.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await expect(page.locator('#hud')).toHaveAttribute('data-hero-name-color',color);
  await expect.poll(async()=>JSON.parse((await page.locator('#hud').getAttribute('data-creature-poses'))!).find((c:{id:string})=>c.id==='rat-1')?.vitalsColor).toBe(color);
  if(hp===100){await expect.poll(async()=>JSON.parse((await page.locator('#hud').getAttribute('data-creature-poses'))!)[0]?.vitalsVisible).toBe(false);await page.locator('#cycle-target').click();await expect(page.locator('#hud')).toHaveAttribute('data-selected-id','rat-1');await expect.poll(async()=>JSON.parse((await page.locator('#hud').getAttribute('data-creature-poses'))!)[0]?.vitalsVisible).toBe(true);await page.locator('#cycle-target').click();}
  else{await expect.poll(async()=>JSON.parse((await page.locator('#hud').getAttribute('data-creature-poses'))!)[0]?.vitalsVisible).toBe(true);}
  if(hp===50){await page.screenshot({path:info.outputPath('health-yellow.png')});await openMenu(page);await page.locator('#vitals-style').selectOption('arcs');await page.locator('#resume').click();await expect(page.locator('#hud')).toHaveAttribute('data-vitals-style','arcs');}
  if(hp===25)await page.screenshot({path:info.outputPath('health-red-arcs.png')});
 }
 expect(errors).toEqual([]);
});
