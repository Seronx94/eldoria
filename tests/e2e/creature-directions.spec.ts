import {test,expect} from '@playwright/test';
import type {SaveData} from '@eldoria/domain';
type Pose={id:string;x:number;y:number;facing:string;frame:number;flip:boolean;animation:string|null};
for(const [kind,id,center] of [['rat','rat-1',{x:31,y:54}],['beetle','beetle-1',{x:34,y:56}],['wolf','wolf-1',{x:38,y:36}]] as const){
  test(`${kind}: live pursuit animates north, south and both sides, then retains its facing`,async({page},info)=>{
    test.setTimeout(120000);
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto('/');await page.getByRole('button',{name:/Rozpocznij/}).click();
    const hud=page.locator('#hud'),original=JSON.parse(await page.evaluate(()=>localStorage.getItem('eldoria.offline.v1')!)) as SaveData;
    await hud.evaluate(el=>{
      el.dataset.renderedPoses='[]';
      new MutationObserver(()=>{
        const poses=JSON.parse(el.dataset.creaturePoses??'[]');
        const seen=JSON.parse(el.dataset.renderedPoses??'[]');
        el.dataset.renderedPoses=JSON.stringify([...seen,...poses].slice(-200));
      }).observe(el,{attributes:true,attributeFilter:['data-creature-poses']});
    });
    for(const [direction,dx,dy,start,flip] of [['down',0,1,0,false],['left',-1,0,3,true],['right',1,0,3,false],['up',0,-1,6,false]] as const){
      // Valid offline save fixtures isolate one live enemy. Its ordinary AI and clock remain active.
      const data=structuredClone(original);data.player={x:center.x+dx*5,y:center.y+dy*5};
      for(const c of data.maps[0]!.creatures){
        if(c.id===id){Object.assign(c,center,{state:'idle',moveIn:400,attackIn:1200});}
        else Object.assign(c,{hp:0,state:'dead',respawnIn:20000});
      }
      await page.locator('#menu-button').click();await hud.evaluate(el=>{el.dataset.renderedPoses='[]';});
      await page.locator('#import-save').setInputFiles({name:'direction.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
      await expect(hud).toHaveAttribute('data-position',`${data.player.x},${data.player.y}`);
      const samples=async()=> (JSON.parse((await hud.getAttribute('data-rendered-poses'))??'[]') as Pose[]).filter(p=>p.id===id&&p.animation===`colorful-${kind}-${direction}`&&(dx===0?p.x===center.x&&(p.y-center.y)*dy>0:p.y===center.y&&(p.x-center.x)*dx>0));
      await expect.poll(async()=>new Set((await samples()).map(p=>p.frame)).size).toBeGreaterThanOrEqual(2);
      for(const p of await samples()){expect(p.frame).toBeGreaterThanOrEqual(start);expect(p.frame).toBeLessThan(start+3);expect(p.flip).toBe(flip);expect(p.facing).toBe(direction);}
      await expect.poll(async()=> (JSON.parse((await hud.getAttribute('data-creature-poses'))??'[]') as Pose[]).find(p=>p.id===id)).toMatchObject({facing:direction,frame:start,flip,animation:null});
      if(direction==='up')await page.screenshot({path:info.outputPath(`${kind}-north.png`)});
    }
    expect(errors).toEqual([]);
  });
}
