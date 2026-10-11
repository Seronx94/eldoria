import {openMenu,saveOffline} from './menu-navigation';
import {test,expect,type Page} from '@playwright/test';
import type {SaveData} from '@eldoria/domain';
async function start(page:Page,profession='knight'){
 await page.goto('/');await page.locator('#name').fill('Damian');await page.locator('#profession').selectOption(profession);await page.getByRole('button',{name:/Rozpocznij/}).click();
}
async function fixture(page:Page,mutate:(data:SaveData)=>void){
 const data=JSON.parse(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1')!)) as SaveData;
 for(const c of data.maps[0]!.creatures)Object.assign(c,{hp:0,state:'dead',respawnIn:20000});
 mutate(data);await openMenu(page);await page.locator('#import-save').setInputFiles({name:'play.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
}
function checkErrors(page:Page){const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});return errors;}
test('nick, overhead bars and arcs are remembered; filtered auto loot survives reload',async({page},info)=>{
 test.setTimeout(60000);const errors=checkErrors(page);await start(page);await expect(page.locator('#hud')).toHaveAttribute('data-hero-nick','Damian');await expect(page.locator('#hud')).toHaveAttribute('data-vitals-style','bars');
 await fixture(page,d=>{d.player={x:32,y:60};d.hp=65;d.mana=25;d.loot=[{id:'filtered',mapId:'eldoria',x:32,y:58,gold:3,items:[{itemId:'skin',quantity:2},{itemId:'chitin',quantity:1}]}];});
 await page.locator('#bag-button').click();await page.locator('#auto-loot summary').click();await expect(page.locator('.loot-row')).toHaveCount(7);await page.getByLabel('Plecak dla: Skóra wilka',{exact:true}).selectOption('materials');await page.getByRole('checkbox',{name:'Zbieraj: Chityna',exact:true}).uncheck();await page.locator('#loot-search').fill('skóra');await expect(page.locator('.loot-row:visible')).toHaveCount(1);await expect(page.locator('.loot-row:visible svg')).toHaveCount(1);await page.locator('#loot-clear-all').click();await expect(page.getByRole('checkbox',{name:'Zbieraj: Skóra wilka',exact:true})).not.toBeChecked();await page.locator('#loot-select-all').click();await page.locator('#loot-search').fill('');await page.locator('#close-bag').click();
 await page.keyboard.press('ArrowUp');await expect(page.locator('#hud')).toHaveAttribute('data-position','32,59');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('eldoria.offline.v1')!).gold)).toBe(3);
 await page.screenshot({path:info.outputPath('hero-bars.png')});
 await openMenu(page);await page.locator('#vitals-style').selectOption('arcs');await page.locator('#resume').click();await expect(page.locator('#hud')).toHaveAttribute('data-vitals-style','arcs');
 await page.screenshot({path:info.outputPath('hero-arcs.png')});await saveOffline(page);await page.reload();await page.locator('#resume').click();
 await expect(page.locator('#hud')).toHaveAttribute('data-vitals-style','arcs');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('eldoria.offline.v1')!));
 expect(saved.gold).toBe(3);expect(saved.inventory).toContainEqual({itemId:'skin',quantity:2,bag:'materials'});expect(saved.lootSettings.destinations.skin).toBe('materials');await page.locator('#bag-button').click();await page.locator('#bag-view').selectOption('materials');await expect(page.locator('#bag-slots')).toContainText('Skóra wilka');await expect(page.locator('#bag-slots [data-item=potion]')).toHaveCount(0);await page.screenshot({path:info.outputPath('loot-bag.png')});await page.locator('#auto-loot summary').click();await page.locator('#loot-search').fill('skóra');await page.getByLabel('Plecak dla: Skóra wilka',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('loot-catalog.png')});expect(saved.loot).toMatchObject([{gold:0,items:[{itemId:'chitin',quantity:1}]}]);expect(saved.lootSettings.itemIds).not.toContain('chitin');expect(errors).toEqual([]);
});
test('depot chest, stash transfers and NPC trade icons/prices persist',async({page},info)=>{
 test.setTimeout(60000); // Two imports, a real reload and independent stash/trade transactions.
 const errors=checkErrors(page);await start(page);await fixture(page,d=>{d.player={x:21,y:98};d.inventory=[{itemId:'potion',quantity:3},{itemId:'skin',quantity:4}];d.gold=10;});
 await page.screenshot({path:info.outputPath('depot-chest.png')});await page.keyboard.press('f');await expect(page.locator('#depot-dialog')).toBeVisible();
 await page.getByRole('button',{name:'Odłóż stos: Skóra wilka',exact:true}).click();await expect(page.locator('#stash-items')).toContainText('Skóra wilka ×4');
 await page.getByRole('button',{name:'Pobierz 1: Skóra wilka',exact:true}).click();await expect(page.locator('#stash-items')).toContainText('Skóra wilka ×3');
 await page.locator('#player-market summary').click();await expect(page.locator('#player-market')).toContainText('trwałej gospodarki online');
 await page.screenshot({path:info.outputPath('stash.png')});await page.locator('#close-depot').click();await page.reload();await page.locator('#resume').click();await page.keyboard.press('f');await expect(page.locator('#stash-items')).toContainText('Skóra wilka ×3');await page.locator('#close-depot').click();
 await fixture(page,d=>{d.player={x:44,y:86};});
 await page.keyboard.press('f');await expect(page.locator('#npc-dialog')).toBeVisible();await expect(page.locator('#npc-actions .trade-row svg')).toHaveCount(3);
 await page.getByRole('button',{name:'Kup miksturę — 5 złota',exact:true}).click();await expect(page.locator('#npc-message')).toContainText('Kupiono');
 await page.getByRole('button',{name:'Sprzedaj: Skóra wilka — 2 złota',exact:true}).click();await expect(page.locator('#npc-message')).toContainText('Sprzedano');await page.screenshot({path:info.outputPath('npc-trade.png')});
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('eldoria.offline.v1')!));expect(data.gold).toBe(7);expect(data.stash).toEqual([{itemId:'skin',quantity:3}]);expect(errors).toEqual([]);
});
for(const profession of ['archer','mage'])test(`${profession}: clicked target receives ranged attacks and distant lock cannot hit a nearer enemy`,async({page})=>{
 const errors=checkErrors(page);await start(page,profession);
 await fixture(page,d=>{d.player={x:32,y:60};for(const c of d.maps[0]!.creatures){if(c.id==='rat-1')Object.assign(c,{x:32,y:53,hp:30,state:'idle',moveIn:400,attackIn:1200});if(c.id==='beetle-1')Object.assign(c,{x:34,y:60,hp:45,state:'idle',moveIn:400,attackIn:1200});}});
 await page.keyboard.press('t');await page.locator('#attack').click();await expect(page.locator('#message')).toContainText('poza zasięgiem');await page.locator('#cast').click();await expect(page.locator('#message')).toContainText('poza zasięgiem');
 await fixture(page,d=>{d.player={x:32,y:60};d.mana=50;for(const c of d.maps[0]!.creatures)if(c.id==='rat-1')Object.assign(c,{x:32,y:58,hp:30,state:'idle',moveIn:400,attackIn:1200});});
 // Tap the settled rendered rat, rather than coordinates read mid-chase.
 let previous:{screenX:number;screenY:number}|undefined;
 await expect.poll(async()=>{
  const rat=(JSON.parse((await page.locator('#hud').getAttribute('data-creature-poses'))!) as {id:string;y:number;animation:string|null;screenX:number;screenY:number}[]).find(c=>c.id==='rat-1')!;
  const stable=previous&&Math.hypot(rat.screenX-previous.screenX,rat.screenY-previous.screenY)<.5;previous={screenX:rat.screenX,screenY:rat.screenY};
  return rat.y===59&&rat.animation===null&&!!stable;
 }).toBe(true);
 const point=await page.locator('#hud').evaluate(el=>JSON.parse(el.dataset.creaturePoses!).find((c:{id:string})=>c.id==='rat-1'));
 if(infoTouch(page))await page.touchscreen.tap(point.screenX,point.screenY);else await page.mouse.click(point.screenX,point.screenY);
 await expect(page.locator('#hud')).toHaveAttribute('data-selected-id','rat-1');
 await page.locator('#attack').click();await expect(page.locator('#hud')).toHaveAttribute('data-player-combat-target','rat-1');await expect(page.locator('#hud')).toHaveAttribute('data-player-combat-kind','ranged');
 await page.locator('#cast').click();await expect(page.locator('#hud')).toHaveAttribute('data-player-combat-target','rat-1');await expect(page.locator('#hud')).toHaveAttribute('data-player-combat-kind','spell');expect(errors).toEqual([]);
});
function infoTouch(page:Page):boolean {return page.context().browser()!==null&&page.viewportSize()!.width<1000;}
