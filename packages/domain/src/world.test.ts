import {describe,it,expect} from 'vitest';
import {importMap,validateMaps,combatAllowedAt,regionAt} from '@eldoria/content';
import rawWorld from '../../../apps/client/public/assets/eldoria.json';
import town from '../../../apps/client/public/assets/vareon.json';
import forest from '../../../apps/client/public/assets/forest.json';
import {Simulation} from './index';
const world=importMap(rawWorld),legacy=[importMap(town),importMap(forest)],maps=[world,...legacy];
function setup(){let now=0;const clock={now:()=>now},sim=new Simulation(maps,'Tester',clock);return{sim,clock,advance(ms=200){now+=ms;sim.tick();},move(direction:'up'|'down',n=1){for(let i=0;i<n;i++){now+=200;sim.send({type:'Move',direction});}}};}
describe('continuous world',()=>{
  it('connects the town and forest by ordinary single steps, five times without interaction or changing map',()=>{
    validateMaps(maps,new Set(['tiles.png']));expect(world.portals).toEqual([]);
    const t=setup();t.move('up',12);expect(t.sim.snapshot().player).toEqual({x:32,y:64});
    for(let i=0;i<5;i++){
      const before=t.sim.snapshot();t.move('up');const outside=t.sim.snapshot();
      expect(outside).toMatchObject({mapId:'eldoria',player:{x:32,y:63}});
      expect(regionAt(world,outside.player)?.id).toBe('forest');expect(combatAllowedAt(world,outside.player)).toBe(true);
      expect(outside.creatures.map(c=>[c.id,c.hp])).toEqual(before.creatures.map(c=>[c.id,c.hp]));
      t.sim.send({type:'Interact'});expect(t.sim.snapshot().player).toEqual(outside.player);
      t.move('down');expect(t.sim.snapshot()).toMatchObject({mapId:'eldoria',player:{x:32,y:64}});
      expect(combatAllowedAt(world,t.sim.snapshot().player)).toBe(false);
    }
    t.move('down',12);expect(t.sim.snapshot().player).toEqual(world.spawns.entry);
    expect(t.sim.snapshot().creatures).toHaveLength(12);
  });
  it('prevents attacks across the safety boundary and monsters pursuing into town',()=>{
    const t=setup(),data=t.sim.exportSave();data.player={x:32,y:64};
    const rat=data.maps[0]!.creatures.find(c=>c.id==='rat-1')!;Object.assign(rat,{x:32,y:63,state:'chase'});
    const sim=Simulation.restore(maps,data,t.clock);sim.send({type:'Select',targetId:'rat-1'});sim.send({type:'Cast'});sim.send({type:'Attack'});
    expect(sim.snapshot()).toMatchObject({hp:100,mana:50});expect(sim.snapshot().combatEvents).toEqual([]);
    for(let i=0;i<20;i++){t.advance();sim.tick();expect(sim.snapshot().creatures.every(c=>c.hp===0||combatAllowedAt(world,c))).toBe(true);}
    expect(sim.snapshot().hp).toBe(100);expect(sim.snapshot().creatures.find(c=>c.id==='rat-1')?.state).not.toBe('attack');
    rat.y=64;expect(()=>Simulation.restore(maps,data,t.clock)).toThrow();
  });
  it('counts forest kills and discovers the old trail on the unified map; reward remains once',()=>{
    const t=setup();t.sim.send({type:'Interact'});t.sim.send({type:'AcceptQuest'});t.sim.send({type:'AcceptQuest',questId:'exploration'});t.sim.send({type:'CloseDialog'});t.move('up',18);
    expect(t.sim.snapshot().player).toEqual({x:32,y:58});t.sim.send({type:'Select',targetId:'rat-1'});t.sim.send({type:'Cast'});t.advance(1500);t.sim.send({type:'Cast'});
    expect(t.sim.snapshot().quest).toEqual({status:'active',kills:1});
    let data=t.sim.exportSave();
    for(const p of [{x:32,y:53},{x:24,y:49},{x:40,y:45}]){data.player=p;const sim=Simulation.restore(maps,data,t.clock);sim.send({type:'Interact'});sim.send({type:'Interact'});data=sim.exportSave();}
    expect(data.exploration).toEqual({status:'ready',found:['trail','camp','stone']});
    data.player={...world.spawns.entry!};const sim=Simulation.restore(maps,data,t.clock);sim.send({type:'Interact'});sim.send({type:'ClaimReward',questId:'exploration'});sim.send({type:'ClaimReward',questId:'exploration'});
    expect(sim.snapshot()).toMatchObject({gold:25,potions:5,exploration:{status:'claimed'}});expect(Simulation.restore(maps,sim.exportSave(),t.clock).exportSave()).toEqual(sim.exportSave());
  });
  it('migrates valid old city/forest saves and loot while retaining timers, dead monsters, rewards and equipment',()=>{
    const old=new Simulation([...legacy].reverse(),'Tester',{now:()=>0}),data=old.exportSave();data.player={x:32,y:58};data.quest={status:'active',kills:1};data.gold=17;
    const rat=data.maps[0]!.creatures[0]!;rat.hp=0;rat.state='dead';rat.respawnIn=17000;
    data.loot=[{id:'old-rat',mapId:'forest',x:32,y:56,gold:1,items:[]}];data.cooldowns.spell=1300;
    const sim=Simulation.restore(maps,data,{now:()=>100000});expect(sim.exportSave()).toMatchObject({mapId:'eldoria',player:data.player,gold:17,quest:data.quest,cooldowns:data.cooldowns,loot:[{id:'old-rat',mapId:'eldoria',x:32,y:56}]});
    expect(sim.exportSave().maps[0]!.creatures[0]).toMatchObject({hp:0,respawnIn:17000});
    const city=new Simulation(legacy,'Tester',{now:()=>0}).exportSave();city.player={x:36,y:22};city.gold=42;
    expect(Simulation.restore(maps,city,{now:()=>0}).snapshot()).toMatchObject({player:{x:44,y:86},gold:42,creatures:expect.any(Array)});
    city.cityRevision=1;city.player={x:7,y:23};expect(Simulation.restore(maps,city,{now:()=>0}).snapshot().player).toEqual(world.spawns.entry);
    city.player={x:0,y:0};expect(()=>Simulation.restore(maps,city,{now:()=>0})).toThrow();
  });
  it('respawns in safe Vareon on the same world without losing progress or creating creatures twice',()=>{
    const t=setup(),data=t.sim.exportSave();data.player={x:39,y:38};data.hp=1;data.gold=20;data.quest={status:'active',kills:2};
    const sim=Simulation.restore(maps,data,t.clock);for(let i=0;i<10&&sim.snapshot().hp===1;i++){t.advance(1200);sim.tick();}
    expect(sim.snapshot()).toMatchObject({mapId:'eldoria',player:world.spawns.entry,hp:100,gold:20,quest:data.quest});expect(sim.snapshot().creatures).toHaveLength(12);
    expect(()=>Simulation.restore(maps,sim.exportSave(),t.clock)).not.toThrow();
  });
  it('rejects malformed, overlapping and unsafe regions',()=>{
    const bad=structuredClone(rawWorld);bad.layers.find(l=>l.name==='Regions')!.objects![1]!.y=63*32;expect(()=>importMap(bad)).toThrow();
    const altered=structuredClone(world);altered.monsterSpawns[0]!.y=64;expect(()=>validateMaps([altered],new Set(['tiles.png']))).toThrow();
  });
});
