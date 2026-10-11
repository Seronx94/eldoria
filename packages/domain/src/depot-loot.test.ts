import {describe,it,expect} from 'vitest';
import {importMap,depotOnMap} from '@eldoria/content';
import {Simulation,countItem,type Stack} from './index';
import {defaultLootSettings} from '@eldoria/protocol';
import world from '../../../apps/client/public/assets/eldoria.json';
function setup(player={x:32,y:60},inventory:Stack[]=[{itemId:'potion',quantity:3}],stash:Stack[]=[]){
 let now=0;const map=importMap(world),data=new Simulation([map],'Tester',{now:()=>now}).exportSave();
 data.player=player;data.inventory=inventory;data.stash=stash;
 for(const c of data.maps[0]!.creatures)Object.assign(c,{hp:0,state:'dead',respawnIn:20000});
 const sim=Simulation.restore([map],data,{now:()=>now});
 return {sim,map,restore:(value:unknown)=>Simulation.restore([map],value,{now:()=>now}),advance(ms=200){now+=ms;sim.tick();}};
}
describe('automatic filtered loot',()=>{
 it('collects adjacent and diagonal loot on movement exactly once, and persists preferences',()=>{
  const t=setup();const data=t.sim.exportSave();data.loot=[{id:'drop',mapId:'eldoria',x:33,y:59,gold:3,items:[{itemId:'skin',quantity:2},{itemId:'chitin',quantity:1}]}];
  data.lootSettings={enabled:true,gold:true,itemIds:['skin']};const sim=t.restore(data);
  sim.send({type:'Move',direction:'up'});
  expect(sim.snapshot()).toMatchObject({gold:3,inventory:[{itemId:'potion',quantity:3},{itemId:'skin',quantity:2}],loot:[{gold:0,items:[{itemId:'chitin',quantity:1}]}]});
  t.advance();sim.send({type:'Move',direction:'down'});expect(sim.snapshot().gold).toBe(3);expect(countItem(sim.snapshot().inventory,'skin')).toBe(2);
  const resumed=t.restore(sim.exportSave());expect(resumed.snapshot().lootSettings).toEqual(data.lootSettings);
  t.advance();resumed.send({type:'Move',direction:'right'});resumed.send({type:'Loot'});expect(resumed.snapshot().loot).toEqual([]);expect(countItem(resumed.snapshot().inventory,'chitin')).toBe(1);
 });
 it('routes loot into selected bags without merging elsewhere, preserves filters and save state',()=>{
  const t=setup(),data=t.sim.exportSave();data.inventory=[{itemId:'skin',quantity:98}];
  data.lootSettings={enabled:true,gold:true,itemIds:['skin'],destinations:{skin:'materials'}};
  data.loot=[{id:'bags',mapId:'eldoria',x:32,y:59,gold:0,items:[{itemId:'skin',quantity:2},{itemId:'chitin',quantity:1}]}];
  const sim=t.restore(data);sim.send({type:'Move',direction:'up'});
  expect(sim.snapshot().inventory).toEqual([{itemId:'skin',quantity:98},{itemId:'skin',quantity:2,bag:'materials'}]);
  expect(sim.snapshot().loot[0]!.items).toEqual([{itemId:'chitin',quantity:1}]);
  const resumed=t.restore(sim.exportSave());expect(resumed.snapshot().inventory).toEqual(sim.snapshot().inventory);expect(resumed.snapshot().lootSettings).toEqual(data.lootSettings);
  resumed.send({type:'SetLootSettings',settings:{...data.lootSettings,destinations:{skin:'stash'}}});expect(resumed.snapshot().lootSettings).toEqual(data.lootSettings);
 });
 it('selected bags share capacity; room in a different stack cannot bypass a full destination',()=>{
  const t=setup(undefined,[...Array.from({length:19},()=>({itemId:'tunic' as const,quantity:1})),{itemId:'skin',quantity:98}]);const data=t.sim.exportSave();
  data.lootSettings={enabled:true,gold:true,itemIds:['skin'],destinations:{skin:'materials'}};
  data.loot=[{id:'full-bags',mapId:'eldoria',x:32,y:59,gold:0,items:[{itemId:'skin',quantity:1}]}];
  const sim=t.restore(data);sim.send({type:'Move',direction:'up'});expect(sim.snapshot().inventory).toEqual(data.inventory);expect(sim.snapshot().loot).toHaveLength(1);
 });
 it('full bag keeps items on the ground while gold is collected; disabled and distant drops are untouched',()=>{
  const t=setup(undefined,Array.from({length:20},()=>({itemId:'tunic' as const,quantity:1})));const data=t.sim.exportSave();
  data.loot=[{id:'near',mapId:'eldoria',x:32,y:59,gold:2,items:[{itemId:'skin',quantity:1}]},{id:'far',mapId:'eldoria',x:32,y:55,gold:3,items:[]}];
  const sim=t.restore(data);sim.send({type:'SetLootSettings',settings:{...defaultLootSettings(),enabled:false}});sim.send({type:'Move',direction:'up'});expect(sim.snapshot().gold).toBe(0);
  sim.send({type:'SetLootSettings',settings:defaultLootSettings()});expect(sim.snapshot().gold).toBe(2);expect(sim.snapshot().loot).toHaveLength(2);expect(sim.snapshot().loot[0]?.items).toEqual([{itemId:'skin',quantity:1}]);
  const before=sim.exportSave();sim.send({type:'SetLootSettings',settings:{enabled:true,gold:true,itemIds:['skin','skin']}});expect(sim.exportSave().lootSettings).toEqual(before.lootSettings);expect(sim.snapshot().gold).toBe(2);
 });
});
describe('depot storage transactions',()=>{
 const position={x:21,y:98};
 it('chest is on the inn floor; rejects remote/closed/malformed transfers, blocks movement while open',()=>{
  const t=setup();const chest=depotOnMap('eldoria')!;expect(t.map.collision[chest.y*t.map.width+chest.x]).toBe(0);
  t.sim.send({type:'OpenDepot'});t.sim.send({type:'StashTransfer',direction:'deposit',itemId:'potion',quantity:1});expect(t.sim.snapshot()).toMatchObject({stash:[],potions:3,depotOpen:false});
  const near=setup(position).sim;near.send({type:'StashTransfer',direction:'deposit',itemId:'potion',quantity:1});expect(near.snapshot().stash).toEqual([]);
  near.send({type:'Interact'});near.send({type:'Move',direction:'right'});expect(near.snapshot()).toMatchObject({depotOpen:true,player:position});
  for(const quantity of [0,-1,100,1.5])near.send({type:'StashTransfer',direction:'deposit',itemId:'potion',quantity});expect(near.snapshot().potions).toBe(3);
 });
 it('moves both ways atomically, persists 100-slot stash, never duplicates or withdraws equipped gear',()=>{
  const t=setup(position),sim=t.sim;sim.send({type:'OpenDepot'});sim.send({type:'StashTransfer',direction:'deposit',itemId:'potion',quantity:3});
  sim.send({type:'StashTransfer',direction:'deposit',itemId:'potion',quantity:3});sim.send({type:'StashTransfer',direction:'deposit',itemId:'sword',quantity:1});
  expect(sim.snapshot()).toMatchObject({potions:0,inventory:[],stash:[{itemId:'potion',quantity:3}],equipment:{weapon:'sword'}});
  const resumed=t.restore(sim.exportSave());expect(resumed.snapshot().depotOpen).toBe(false);resumed.send({type:'OpenDepot'});resumed.send({type:'StashTransfer',direction:'withdraw',itemId:'potion',quantity:2});
  expect(resumed.snapshot()).toMatchObject({potions:2,stash:[{itemId:'potion',quantity:1}]});
  const big=setup(position,[],Array.from({length:100},()=>({itemId:'tunic' as const,quantity:1})));expect(big.restore(big.sim.exportSave()).snapshot().stash).toHaveLength(100);
  expect(()=>big.restore({...big.sim.exportSave(),stash:Array.from({length:101},()=>({itemId:'tunic',quantity:1}))})).toThrow();
 });
 it('full destination rejects without removing or charging anything, and can merge an existing stack',()=>{
  const full=Array.from({length:20},()=>({itemId:'tunic' as const,quantity:1}));const t=setup(position,full,[{itemId:'potion',quantity:5}]);t.sim.send({type:'OpenDepot'});
  t.sim.send({type:'StashTransfer',direction:'withdraw',itemId:'potion',quantity:1});expect(t.sim.snapshot().stash).toEqual([{itemId:'potion',quantity:5}]);expect(t.sim.snapshot().inventory).toEqual(full);
  const stash=Array.from({length:100},()=>({itemId:'tunic' as const,quantity:1}));const s=setup(position,[{itemId:'potion',quantity:1}],stash).sim;s.send({type:'OpenDepot'});s.send({type:'StashTransfer',direction:'deposit',itemId:'potion',quantity:1});expect(s.snapshot().potions).toBe(1);expect(s.snapshot().stash).toEqual(stash);
  const merge=setup(position,[...full.slice(1),{itemId:'potion',quantity:98}],[{itemId:'potion',quantity:1}]).sim;merge.send({type:'OpenDepot'});merge.send({type:'StashTransfer',direction:'withdraw',itemId:'potion',quantity:1});expect(merge.snapshot().potions).toBe(99);expect(merge.snapshot().stash).toEqual([]);
 });
 it('legacy saves gain empty stash and default auto loot; malformed new state is rejected',()=>{
  const t=setup(position),{stash:_,lootSettings:__,...legacy}=t.sim.exportSave();void _;void __;
  expect(t.restore(legacy).snapshot()).toMatchObject({stash:[],lootSettings:defaultLootSettings()});
  expect(()=>t.restore({...legacy,stash:[{itemId:'potion',quantity:100}]})).toThrow();
  expect(()=>t.restore({...legacy,lootSettings:{enabled:true,gold:true,itemIds:['junk']}})).toThrow();
 });
});
