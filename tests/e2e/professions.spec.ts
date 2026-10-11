import {openMenu,saveOffline} from './menu-navigation';
import {test,expect,type Page} from '@playwright/test';
import {professions,spells} from '../../packages/content/src/professions';
import type {Profession} from '@eldoria/protocol';
import type {SaveData} from '@eldoria/domain';
async function observeEffects(page:Page):Promise<void>{
  await page.locator('#hud').evaluate(el=>{
    el.dataset.seenEffects='';el.dataset.maxRangedHit='0';
    new MutationObserver(()=>{
      const seen=new Set((el.dataset.seenEffects??'').split(','));for(const effect of (el.dataset.effectTypes??'').split(','))if(effect)seen.add(effect);el.dataset.seenEffects=[...seen].join(',');
      if(el.dataset.combat==='ranged'&&Number(el.dataset.combatDamage)>0)el.dataset.maxRangedHit=String(Math.max(Number(el.dataset.maxRangedHit),Number(el.dataset.combatRange)));
    }).observe(el,{attributes:true,attributeFilter:['data-effect-types','data-combat-id']});
  });
}
async function importArena(page:Page,live=false):Promise<void>{
  const data=JSON.parse(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1')!)) as SaveData;
  data.player={x:32,y:60};data.level=5;data.hp=80;data.mana=50;data.loot=[];
  for(const c of data.maps[0]!.creatures){
    if(live&&c.id==='rat-1')Object.assign(c,{x:32,y:54,hp:30,state:'idle',moveIn:400,attackIn:1200});
    else Object.assign(c,{hp:0,state:'dead',respawnIn:20000});
  }
  await openMenu(page);
  await page.locator('#import-save').setInputFiles({name:'profession-arena.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await expect(page.locator('#hud')).toHaveAttribute('data-position','32,60');
}
for(const profession of ['knight','archer','mage'] as Profession[]){
  test(`${profession}: all three skill animations, four configurable slots and saved profession`,async({page},info)=>{
    test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto('/');await page.locator('#profession').selectOption(profession);await page.getByRole('button',{name:/Rozpocznij/}).click();
    await expect(page.locator('#hud')).toHaveAttribute('data-profession',profession);
    const nameBox=(await page.locator('#player-name').boundingBox())!,hpBox=(await page.locator('#hp-label').boundingBox())!;expect(nameBox.y+nameBox.height).toBeLessThanOrEqual(hpBox.y+.1);
    await page.locator('#attack').click();await expect(page.locator('#message')).toContainText('Strefa bezpieczna');
    await importArena(page);await observeEffects(page);
    const buttons=page.locator('#action-bar button');await expect(buttons).toHaveCount(4);
    for(let i=0;i<4;i++){
      const button=buttons.nth(i),b=(await button.boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(48);expect(b.height).toBeGreaterThanOrEqual(48);await expect(button.locator('svg')).toBeVisible();
      await button.click();const effect=i===0?professions[profession].effect:spells[professions[profession].spells[i-1]!].effect;
      await expect(page.locator('#hud')).toHaveAttribute('data-combat-effect',effect);
      await expect(page.locator('#hud')).toHaveAttribute('data-seen-effects',new RegExp(effect));
      if(i===3)await page.screenshot({path:info.outputPath(`${profession}-skill-mobile-layout.png`)});
    }
    await page.locator('#bag-button').click();await page.locator('#loadout summary').click();
    await page.locator('#action-choice-1').selectOption(professions[profession].spells[2]!);
    await page.locator('#action-choice-4').selectOption('attack');
    await page.locator('#close-bag').click();await expect(page.locator('#spell-slot-3')).toHaveAttribute('data-action','attack');
    await saveOffline(page);await page.reload();await page.locator('#resume').click();
    await expect(page.locator('#hud')).toHaveAttribute('data-profession',profession);await expect(page.locator('#spell-slot-3')).toHaveAttribute('data-action','attack');
    await expect(page.locator('#attack')).toHaveAttribute('data-action',professions[profession].spells[2]!);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('eldoria.offline.v1')!));expect(saved.profession).toBe(profession);expect(saved.equipment.weapon).toBe(professions[profession].weapon);
    await page.locator('#bag-button').click();await expect(page.locator('#equipment')).toContainText(professions[profession].attackName);await page.locator('#close-bag').click();
    expect(errors).toEqual([]);
  });
}
for(const profession of ['archer','mage'] as Profession[]){
  test(`${profession}: ranged basic attack hits before contact and joystick can cast with a second finger`,async({page},info)=>{
    test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');await page.locator('#profession').selectOption(profession);await page.getByRole('button',{name:/Rozpocznij/}).click();await importArena(page,true);await observeEffects(page);
    await page.keyboard.down('Space');await expect.poll(async()=>Number(await page.locator('#hud').getAttribute('data-max-ranged-hit'))).toBeGreaterThan(1);await page.keyboard.up('Space');
    if(info.project.name==='mobile-landscape'){
      await importArena(page);await observeEffects(page);
      const session=await page.context().newCDPSession(page),stick=(await page.locator('#joystick').boundingBox())!,cast=(await page.locator('#cast').boundingBox())!;
      const first={x:stick.x+stick.width/2,y:stick.y+stick.height*.2,id:1},second={x:cast.x+cast.width/2,y:cast.y+cast.height/2,id:2};
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,second]});
      await expect(page.locator('#hud')).toHaveAttribute('data-seen-effects',new RegExp(spells[professions[profession].spells[0]!].effect));
      await expect.poll(async()=>Number((await page.locator('#hud').getAttribute('data-position'))!.split(',')[1])).toBeLessThan(60);
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[second]});await expect(page.locator('#joystick')).toHaveClass(/held/);
      await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(page.locator('#joystick')).not.toHaveClass(/held/);
      await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));const position=await page.locator('#hud').getAttribute('data-position');await page.waitForTimeout(600);await expect(page.locator('#hud')).toHaveAttribute('data-position',position!);await session.detach();
    }
    expect(errors).toEqual([]);
  });
}

test('reassigned fourth slot holds basic attack and releases independently from joystick',async({page},info)=>{
  test.setTimeout(60000);
  await page.goto('/');await page.locator('#profession').selectOption('archer');await page.getByRole('button',{name:/Rozpocznij/}).click();await importArena(page);
  await page.locator('#bag-button').click();await page.locator('#loadout summary').click();await page.locator('#action-choice-4').selectOption('attack');await page.locator('#close-bag').click();
  await page.locator('#hud').evaluate(el=>{el.dataset.basicIds='';new MutationObserver(()=>{if(el.dataset.combatEffect==='arrow'){const ids=new Set((el.dataset.basicIds??'').split(',').filter(Boolean));ids.add(el.dataset.combatId!);el.dataset.basicIds=[...ids].join(',');}}).observe(el,{attributes:true,attributeFilter:['data-combat-id']});});
  const button=page.locator('#spell-slot-3'),b=(await button.boundingBox())!;
  if(info.project.name==='mobile-landscape'){
    const session=await page.context().newCDPSession(page),s=(await page.locator('#joystick').boundingBox())!;
    const first={x:s.x+s.width/2,y:s.y+s.height*.2,id:1},second={x:b.x+b.width/2,y:b.y+b.height/2,id:2};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,second]});
    await expect.poll(async()=>(await page.locator('#hud').getAttribute('data-basic-ids'))!.split(',').filter(Boolean).length).toBeGreaterThanOrEqual(2);
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[second]});await expect(page.locator('#joystick')).toHaveClass(/held/);
    await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await session.detach();
  }else{
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await expect.poll(async()=>(await page.locator('#hud').getAttribute('data-basic-ids'))!.split(',').filter(Boolean).length).toBeGreaterThanOrEqual(2);await page.mouse.up();
  }
  await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
  const ids=await page.locator('#hud').getAttribute('data-basic-ids');await page.waitForTimeout(1000);await expect(page.locator('#hud')).toHaveAttribute('data-basic-ids',ids!);
});
