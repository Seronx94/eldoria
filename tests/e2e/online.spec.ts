import {test,expect} from '@playwright/test';
import {walkInWorld} from './town-navigation';
test('two guests share movement and combat, render private/public health separately and preserve offline saves',async({page,browser},info)=>{
 test.setTimeout(120000);const mobile=info.project.name==='mobile-landscape';
 const peerContext=await browser.newContext({viewport:page.viewportSize()!,isMobile:mobile,hasTouch:mobile}),peer=await peerContext.newPage();
 const errors:string[]=[];for(const p of [page,peer]){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});}
 try{
  await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();await page.locator('#menu-button').click();
  const offline=await page.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('eldoria.offline.v1')!);saved.gold=999;const text=JSON.stringify(saved);localStorage.setItem('eldoria.offline.v1',text);return text;});
  await peer.goto('/');
  for(const [p,name,profession,style]of [[page,'Alice','mage','arcs'],[peer,'Bobby','archer','bars']] as const){await p.locator('#name').fill(name);await p.locator('#profession').selectOption(profession);await p.locator('#vitals-style').selectOption(style);await p.locator('#connection-mode').selectOption('online');await p.getByRole('button',{name:/Rozpocznij/}).click();await expect(p.locator('#hud')).toHaveAttribute('data-connection','online');}
  const poses=async(p:typeof page)=>JSON.parse((await p.locator('#hud').getAttribute('data-remote-players'))??'[]') as {id:string;x:number;y:number;headTop:number;hpVisible:boolean;nameColor:string;nameBottom:number;hpTop:number;hpBottom:number;centerX:number}[];
  const checkNameplate=async(p:typeof page)=>{const actor=(await poses(p))[0];if(!actor)throw new Error('Missing remote actor');expect(actor.hpVisible).toBe(true);expect(actor.nameBottom).toBeLessThan(actor.hpTop);expect(actor.hpBottom).toBeLessThan(actor.headTop);expect(Math.abs(actor.centerX-actor.x)).toBeLessThanOrEqual(.5);};
  for(const p of [page,peer]){await expect.poll(async()=>(await poses(p)).length).toBe(1);await expect(p.locator('#save-button')).toBeDisabled();await expect(p.locator('#rewards')).toContainText('0 złota');}
  await expect(page.locator('#hud')).toHaveAttribute('data-vitals-style','arcs');await expect(peer.locator('#hud')).toHaveAttribute('data-vitals-style','bars');
  expect((await poses(peer))[0]).toMatchObject({hpVisible:true,nameColor:'#71d569'});
  for(const p of [page,peer])await checkNameplate(p);
  await peer.screenshot({path:info.outputPath('nameplates-bars.png')});
  await page.screenshot({path:info.outputPath('nameplates-arcs.png')});
  // Bobby clears the doorway; Alice moves through real server-accepted steps.
  if(mobile){const stick=(await peer.locator('#joystick').boundingBox())!;await peer.touchscreen.tap(stick.x+stick.width*.2,stick.y+stick.height/2);}else await peer.keyboard.press('a');
  await page.keyboard.press('a');
  await expect(page.locator('#hud')).toHaveAttribute('data-position','31,76');
  await expect.poll(async()=>(await poses(peer))[0]?.x).toBe(31*32+16);
  await checkNameplate(peer);
  await page.waitForTimeout(250);await page.keyboard.press('d');await walkInWorld(page,32,60);
  await walkInWorld(peer,33,63);
  // Patrol timing varies with capture/viewport cost. Wait for a real rat in
  // spell range and select it, rather than firing eight times into empty space.
  await expect.poll(async()=>{const actors=JSON.parse((await page.locator('#hud').getAttribute('data-creature-poses'))??'[]') as {id:string;x:number;y:number}[];const rat=actors.find(c=>c.id==='rat-1');return rat?Math.abs(rat.x-32)+Math.abs(rat.y-60):Infinity;},{timeout:15000}).toBeLessThanOrEqual(4);
  await page.locator('#cycle-target').click();await expect(page.locator('#hud')).toHaveAttribute('data-selected-id','rat-1');
  if(mobile){
   await page.bringToFront();const session=await page.context().newCDPSession(page),stick=(await page.locator('#joystick').boundingBox())!,spell=(await page.locator('#cast').boundingBox())!;
   const first={x:stick.x+stick.width/2,y:stick.y+stick.height/2,id:1},second={x:spell.x+spell.width/2,y:spell.y+spell.height/2,id:2};
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});await expect(page.locator('#joystick')).toHaveClass(/held/);
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,second]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[second]});await expect(page.locator('#joystick')).toHaveClass(/held/);
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('#joystick')).not.toHaveClass(/held/);await session.detach();
  }else await page.keyboard.press('e');
  await expect(page.locator('#hud')).toHaveAttribute('data-player-combat-kind','spell');
  await expect.poll(async()=>Number(await peer.locator('#hud').getAttribute('data-combat-id'))).toBeGreaterThan(0);
  for(let i=0;i<8;i++){await page.keyboard.press('Space');await page.keyboard.press('e');await page.waitForTimeout(850);}
  await expect.poll(async()=>Number((await page.locator('#rewards').textContent())?.match(/(\d+) EXP/)?.[1]??0)).toBeGreaterThan(0);
  await page.screenshot({path:info.outputPath('online-two-players.png')});
  expect(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1'))).toBe(offline);
  await peer.locator('#menu-button').click();await expect.poll(async()=>(await poses(page)).length).toBe(0);
  await peer.getByRole('button',{name:/Rozpocznij/}).click();await expect(peer.locator('#hud')).toHaveAttribute('data-position','32,76');await expect(peer.locator('#rewards')).toContainText('0 złota');
  await page.locator('#menu-button').click();await page.locator('#resume').click();await expect(page.locator('#hud')).toHaveAttribute('data-connection','offline');await expect(page.locator('#rewards')).toContainText('999 złota');
  expect(errors).toEqual([]);
 }finally{await peerContext.close();}
});

test('lost socket returns to menu without local simulation or automatic guest rejoin',async({page})=>{
 await page.addInitScript(()=>{const Native=window.WebSocket;window.WebSocket=class extends Native {constructor(url:string|URL,protocols?:string|string[]){super(url,protocols);(window as Window&{testSocket?:WebSocket}).testSocket=this;}};});
 await page.goto('/');await page.locator('#connection-mode').selectOption('online');await page.getByRole('button',{name:/Rozpocznij/}).click();
 await expect(page.locator('#hud')).toHaveAttribute('data-connection','online');await page.evaluate(()=>{const socket=(window as Window&{testSocket?:WebSocket}).testSocket;if(!socket)throw new Error('Missing socket');socket.close(3001,'test connection loss');});
 await expect(page.locator('#menu')).toBeVisible();await expect(page.locator('#hud')).toBeHidden();await expect(page.locator('#name-error')).toContainText(/połączenie|Połączenie/);
 expect(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1'))).toBeNull();
});
