import {describe,it,expect} from 'vitest';
import {importMap} from '@eldoria/content';
import mainland from '../../../apps/client/public/assets/eldoria.json';
import cave from '../../../apps/client/public/assets/catacombs.json';
import upper from '../../../apps/client/public/assets/shop-upper.json';
import winter from '../../../apps/client/public/assets/nivora.json';
import {Simulation,SharedWorld} from './index';
const maps=[mainland,cave,upper,winter].map(importMap);
function setup(x:number,y:number){let now=0;const clock={now:()=>now};const data=new Simulation(maps,'Tester',clock).exportSave();data.player={x,y};const sim=Simulation.restore(maps,data,clock);return{sim,clock,move(direction:'up'|'down'){now+=200;sim.send({type:'Move',direction});},advance(ms:number){now+=ms;}};}
describe('floors, caves and island travel',()=>{
 it('walks up and down shop stairs five times without touching a travel button or losing progress',()=>{
  const t=setup(46,88),before=t.sim.exportSave();
  for(let i=0;i<5;i++){t.move('up');expect(t.sim.snapshot()).toMatchObject({mapId:'shop-upper',player:{x:5,y:8}});t.move('down');expect(t.sim.snapshot()).toMatchObject({mapId:'eldoria',player:{x:46,y:88}});}
  t.move('up');t.move('up');expect(t.sim.snapshot()).toMatchObject({mapId:'shop-upper',player:{x:5,y:7}});t.move('down');t.move('down');expect(t.sim.snapshot().mapId).toBe('eldoria');
  expect(t.sim.exportSave()).toMatchObject({inventory:before.inventory,gold:before.gold,skills:before.skills});
 });
 it('requires proximity for boats, blocks departure in combat and preserves the lock across stairs',()=>{
  const far=setup(32,76);far.sim.send({type:'Interact'});expect(far.sim.snapshot().mapId).toBe('eldoria');
  const t=setup(58,93),data=t.sim.exportSave();data.combatIn=60000;const locked=Simulation.restore(maps,data,t.clock);
  locked.send({type:'Interact'});expect(locked.snapshot().mapId).toBe('eldoria');expect(locked.snapshot().message).toContain('walki');
  t.advance(60001);locked.send({type:'Interact'});expect(locked.snapshot()).toMatchObject({mapId:'nivora',player:{x:24,y:40}});
  const c=setup(18,58),saved=c.sim.exportSave();saved.combatIn=59000;const stairs=Simulation.restore(maps,saved,c.clock);c.advance(200);stairs.send({type:'Move',direction:'up'});expect(stairs.snapshot().mapId).toBe('catacombs');expect(stairs.snapshot().combatMs).toBeGreaterThan(58000);
 });
 it('restores all four visited floors, monster damage and ground loot, and rejects impossible floors or repeated records',()=>{
  const t=setup(18,58);t.move('up');expect(t.sim.snapshot().mapId).toBe('catacombs');t.move('down');expect(t.sim.snapshot().mapId).toBe('eldoria');
  let data=t.sim.exportSave();data.player={x:46,y:88};let sim=Simulation.restore(maps,data,t.clock);t.advance(200);sim.send({type:'Move',direction:'up'});t.advance(200);sim.send({type:'Move',direction:'down'});
  data=sim.exportSave();data.player={x:58,y:93};sim=Simulation.restore(maps,data,t.clock);sim.send({type:'Interact'});data=sim.exportSave();
  expect(data.maps).toHaveLength(4);data.maps.find(m=>m.mapId==='catacombs')!.creatures[0]!.hp=12;
  data.loot=[{id:'cave-loot',mapId:'catacombs',x:7,y:7,gold:1,items:[]}];
  const resumed=Simulation.restore(maps,data,t.clock);expect(resumed.snapshot()).toMatchObject({mapId:'nivora',player:{x:24,y:40}});expect(resumed.exportSave().maps.find(m=>m.mapId==='catacombs')!.creatures[0]!.hp).toBe(12);expect(resumed.exportSave().loot).toEqual(data.loot);
  expect(()=>Simulation.restore(maps,{...data,mapId:'unknown'},t.clock)).toThrow();
  expect(()=>Simulation.restore(maps,{...data,maps:[data.maps[0],...data.maps]},t.clock)).toThrow();
  expect(()=>Simulation.restore(maps,{...data,player:{x:0,y:0}},t.clock)).toThrow();
 });
 it('isolates public players by floor and restores an online checkpoint on the winter island',()=>{
  let now=0;const clock={now:()=>now},world=new SharedWorld(maps,clock);
  const initial=new Simulation(maps,'Alice',clock).exportProgress();initial.player={x:46,y:88};world.join('alice','Alice','knight',initial);const bob=new Simulation(maps,'Bob',clock,undefined,undefined,'mage').exportProgress();bob.player={x:46,y:88};world.join('bob','Bob','mage',bob);expect(world.snapshot('alice').players.map(p=>p.id)).toEqual(['bob']);
  now+=200;world.send('alice',{type:'Move',direction:'up'});expect(world.snapshot('alice').mapId).toBe('shop-upper');expect(world.snapshot('alice').players).toHaveLength(0);expect(world.snapshot('bob').players).toHaveLength(0);
  const progress=world.progress('alice');progress.mapId='nivora';progress.player={x:24,y:40};world.leave('alice');world.join('alice','Alice','knight',progress);expect(world.snapshot('alice')).toMatchObject({mapId:'nivora',player:{x:24,y:40}});
 });
 it('fights a cave creature, pays its loot only once and retains the defeated creature after floor travel',()=>{
  const t=setup(18,58);t.move('up');let data=t.sim.exportSave();data.player={x:11,y:10};const sim=Simulation.restore(maps,data,t.clock);
  sim.send({type:'Select',targetId:'cave-rat-1'});
  for(let i=0;i<10&&sim.snapshot().creatures.find(c=>c.id==='cave-rat-1')!.hp>0;i++){t.advance(1200);sim.send({type:'Attack'});}
  expect(sim.snapshot().creatures.find(c=>c.id==='cave-rat-1')!.hp).toBe(0);expect(sim.snapshot().exp).toBeGreaterThan(0);
  const gold=sim.snapshot().gold;sim.send({type:'Loot'});expect(sim.snapshot().gold).toBeGreaterThan(gold);const paid=sim.snapshot().gold;sim.send({type:'Loot'});sim.send({type:'Attack'});expect(sim.snapshot().gold).toBe(paid);
  data=sim.exportSave();data.player={x:7,y:7};const exit=Simulation.restore(maps,data,t.clock);t.advance(200);exit.send({type:'Move',direction:'down'});t.advance(200);exit.send({type:'Move',direction:'up'});
  expect(exit.snapshot().mapId).toBe('catacombs');expect(exit.snapshot().creatures.find(c=>c.id==='cave-rat-1')!.hp).toBe(0);expect(exit.snapshot().gold).toBe(paid);
 });

});
