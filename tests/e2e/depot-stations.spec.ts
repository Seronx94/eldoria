import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {registerCharacter} from './account-navigation';
import {walkInWorld} from './town-navigation';
import {openMenu} from './menu-navigation';
test('two account players share corridors, reserve different lockers, free a stand and retain private stash',async({page,browser},info)=>{
 test.setTimeout(300000);const mobile=info.project.name==='mobile-landscape';
 const context=await browser.newContext({viewport:page.viewportSize()!,isMobile:mobile,hasTouch:mobile}),peer=await context.newPage();
 const errors:string[]=[];for(const p of [page,peer]){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});}
 const alice=`Locker${randomUUID().slice(0,4)}`,bob=`Depot${randomUUID().slice(0,4)}`;
 try{
  await page.goto('/');await peer.goto(page.url());
  for(const [p,name]of [[page,alice],[peer,bob]] as const){await registerCharacter(p,name,'knight');await p.locator('.character-card').filter({hasText:name}).click();await expect(p.locator('#hud')).toHaveAttribute('data-connection','online');await expect(p.locator('#hud')).toHaveAttribute('data-position','32,76');}
  await expect.poll(async()=>JSON.parse((await page.locator('#hud').getAttribute('data-remote-players'))??'[]')[0]?.hpVisible).toBe(false);
  await page.keyboard.press('a');await expect(page.locator('#hud')).toHaveAttribute('data-position','31,76');await peer.keyboard.press('a');await expect(peer.locator('#hud')).toHaveAttribute('data-position','31,76');
  await walkInWorld(page,21,99);await walkInWorld(peer,21,99);await expect(page.locator('#hud')).toHaveAttribute('data-position','21,99');
  await page.bringToFront();await page.keyboard.press('w');await expect(page.locator('#hud')).toHaveAttribute('data-position','21,98');await page.screenshot({path:info.outputPath('depot-cabins.png')});await page.keyboard.press('f');await expect(page.locator('#depot-dialog')).toBeVisible();await expect(page.locator('#locker-station')).toContainText('Stanowisko 1');await expect(page.locator('#locker-slots button')).toHaveCount(2);
  await page.getByRole('button',{name:'Odłóż stos: Mikstura HP',exact:true}).click();await expect(page.locator('#stash-items')).toContainText('Mikstura HP ×3');
  await peer.bringToFront();await peer.keyboard.press('w');await expect(peer.locator('#message')).toContainText('Przejście zablokowane');await expect(peer.locator('#hud')).toHaveAttribute('data-position','21,99');await peer.keyboard.press('f');await expect(peer.locator('#depot-dialog')).toBeHidden();
  await walkInWorld(peer,19,98);await peer.keyboard.press('f');await expect(peer.locator('#locker-station')).toContainText('Stanowisko 3');await expect(peer.locator('#stash-items')).toContainText('Brak przedmiotów');await peer.screenshot({path:info.outputPath('private-locker.png')});await peer.locator('#locker-market').click();await expect(peer.locator('#player-market')).toHaveAttribute('open','');await expect(peer.locator('#player-market')).toContainText('trwałej gospodarki');await peer.locator('#close-depot').click();await walkInWorld(peer,21,99);
  await page.bringToFront();await page.locator('#close-depot').click();await page.keyboard.press('s');await expect(page.locator('#hud')).toHaveAttribute('data-position','21,99');
  await peer.bringToFront();await peer.keyboard.press('w');await expect(peer.locator('#hud')).toHaveAttribute('data-position','21,98');await peer.keyboard.press('f');await expect(peer.locator('#stash-items')).toContainText('Brak przedmiotów');await peer.locator('#close-depot').click();await openMenu(peer);
  await page.bringToFront();await openMenu(page);await page.locator('.character-card').filter({hasText:alice}).click();await expect(page.locator('#hud')).toHaveAttribute('data-position','21,99');await page.keyboard.press('w');await expect(page.locator('#hud')).toHaveAttribute('data-position','21,98');await page.keyboard.press('f');await expect(page.locator('#stash-items')).toContainText('Mikstura HP ×3');await page.screenshot({path:info.outputPath('locker-stash.png')});await page.locator('#close-depot').click();await openMenu(page);
  expect(errors).toEqual([]);
 }finally{await context.close();}
});

test('locker layout presents four cabins, private stash icons and usable mobile controls',async({page},info)=>{
 test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto('/');await page.locator('#name').fill('Tester');await page.getByRole('button',{name:/Rozpocznij/}).click();
 const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('eldoria.offline.v1')!));save.player={x:21,y:98};save.stash=[{itemId:'skin',quantity:4}];
 await openMenu(page);await page.locator('#import-save').setInputFiles({name:'locker-layout.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(save))});
 await expect(page.locator('#hud')).toHaveAttribute('data-position','21,98');await expect(page.locator('#target-label')).toContainText('stanowisko 1');await page.waitForTimeout(1500);await page.screenshot({path:info.outputPath('depot-cabins-final.png')});
 await page.locator('#interact').click();await expect(page.locator('#depot-dialog')).toBeVisible();await expect(page.locator('#locker-station')).toContainText('prywatny locker: Tester');await expect(page.locator('#locker-slots svg')).toHaveCount(2);
 for(const button of await page.locator('#locker-slots button').all()){const box=(await button.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(48);expect(box.height).toBeGreaterThanOrEqual(48);}
 await page.locator('#locker-stash').click();await expect(page.locator('#close-depot')).toBeInViewport();await expect(page.locator('#stash-items')).toContainText('Skóra wilka ×4');await page.screenshot({path:info.outputPath('locker-final.png')});
 await page.getByRole('button',{name:'Pobierz 1: Skóra wilka',exact:true}).click();await expect(page.locator('#stash-items')).toContainText('Skóra wilka ×3');await page.locator('#locker-market').click();await expect(page.locator('#player-market')).toHaveAttribute('open','');await expect(page.locator('#player-market')).toContainText('trwałej gospodarki');
 await page.locator('#close-depot').click();await expect(page.locator('#depot-dialog')).toBeHidden();expect(errors).toEqual([]);
});
