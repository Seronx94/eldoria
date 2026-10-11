import {openMenu} from './menu-navigation';
import {test,expect,type Page} from '@playwright/test';
import type {Profession} from '@eldoria/protocol';
import {walkInWorld} from './town-navigation';
const colors={hair:'#dd2255',body:'#ee8855',legs:'#3355cc',feet:'#55bb99'};
async function preview(page:Page):Promise<number[]>{return page.locator('#outfit-preview').evaluate(c=>Array.from((c as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,128,48).data));}
for(const profession of ['knight','archer','mage'] as Profession[]){
  test(`${profession}: individual appearance, four colors, movement, resume and rejected malformed import`,async({page},info)=>{
    test.setTimeout(90000);const errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto('/');await page.locator('#profession').selectOption(profession);await page.getByRole('button',{name:/Rozpocznij/}).click();
    await expect(page.locator('#hud')).toHaveAttribute('data-hero-profession',profession);
    await walkInWorld(page,32,81);
    await page.locator('#bag-button').click();await page.locator('#appearance summary').click();
    await expect(page.locator('#appearance-profession')).toHaveText(profession==='mage'?'Mag':profession==='knight'?'Knight':'Archer');
    const original=await preview(page);
    // Compare actual rendered pixels against the authored four directional source frames.
    const source=profession==='knight'?'styles/colorful/wanderer.png':`styles/professions/${profession}.png`;
    const expected=await page.evaluate(async src=>{
      const img=await createImageBitmap(await (await fetch(`/assets/${src}`)).blob()),c=document.createElement('canvas');c.width=128;c.height=48;const ctx=c.getContext('2d')!;
      for(let row=0;row<4;row++)ctx.drawImage(img,0,row*48,32,48,row*32,0,32,48);return Array.from(ctx.getImageData(0,0,128,48).data);
    },source);expect(original).toEqual(expected);
    await page.screenshot({path:info.outputPath(`${profession}-original-outfit.png`)});
    let previous=original;
    for(const [part,color]of Object.entries(colors)){
      const input=page.locator(`#outfit-${part}`),b=(await input.boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(48);expect(b.height).toBeGreaterThanOrEqual(48);
      await input.evaluate((el,value)=>{(el as HTMLInputElement).value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},color);
      await expect.poll(async()=>JSON.stringify(await preview(page))).not.toBe(JSON.stringify(previous));previous=await preview(page);
    }
    const custom=await preview(page);for(let i=3;i<custom.length;i+=4)expect(custom[i]).toBe(original[i]);
    // Actual authored equipment pixels must retain their color despite a matching hair/fabric hue.
    if(profession!=='knight'){
      const [x,y]=profession==='archer'?[26,17]:[5,22],i=4*(y!*128+x!);
      expect(original[i+3]).toBe(255);expect(custom.slice(i,i+4)).toEqual(original.slice(i,i+4));
    }
    await page.screenshot({path:info.outputPath(`${profession}-custom-outfit.png`)});
    await page.locator('#close-bag').click();
    await page.screenshot({path:info.outputPath(`${profession}-custom-world.png`)});
    await page.locator('#hud').evaluate(el=>new MutationObserver(()=>{
      const frames=new Set((el.dataset.outfitFrames??'').split(',').filter(Boolean));frames.add(el.dataset.heroFrame!);el.dataset.outfitFrames=[...frames].join(',');
    }).observe(el,{attributes:true,attributeFilter:['data-hero-frame']}));
    for(const [key,row]of [['s',0],['a',1],['d',2],['w',3]] as const){
      await page.locator('#hud').evaluate(el=>{el.dataset.outfitFrames='';});
      const position=await page.locator('#hud').getAttribute('data-position');await page.keyboard.down(key);
      await expect(page.locator('#hud')).not.toHaveAttribute('data-position',position!);
      await expect.poll(async()=>{const frames=(await page.locator('#hud').getAttribute('data-outfit-frames'))!.split(',').map(Number);return new Set(frames.filter(f=>f>=row*3&&f<row*3+3)).size;}).toBeGreaterThanOrEqual(2);
      await page.keyboard.up(key);
    }
    await page.reload();await page.locator('#resume').click();await expect(page.locator('#hud')).toHaveAttribute('data-hero-profession',profession);
    await page.locator('#bag-button').click();await page.locator('#appearance summary').click();expect(await preview(page)).toEqual(custom);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('eldoria.offline.v1')!));expect(saved.appearance).toEqual(colors);expect(saved.profession).toBe(profession);
    await page.locator('#reset-outfit').click();await expect.poll(async()=>JSON.stringify(await preview(page))).toBe(JSON.stringify(original));
    await page.locator('#close-bag').click();await page.waitForTimeout(230);await page.keyboard.press('s');await page.waitForTimeout(300);
    await page.screenshot({path:info.outputPath(`${profession}-original-world.png`)});await openMenu(page);
    const stored=await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1')!);const bad=JSON.parse(stored);bad.appearance.hair='url(javascript:bad)';
    await page.locator('#import-save').setInputFiles({name:'invalid-appearance.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await expect(page.locator('#save-menu-status')).toContainText('Import odrzucony');expect(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1'))).toBe(stored);expect(errors).toEqual([]);
  });
}
