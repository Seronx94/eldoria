import {describe,it,expect} from 'vitest';
import {importMap,movementVectors,rules} from '@eldoria/content';
import raw from '../../../apps/client/public/assets/catacombs.json';
import {Simulation,SharedWorld} from './index';
import type {MoveDirection} from '@eldoria/protocol';
function map(){const m=importMap(raw);m.npcs=[];m.portals=[];m.monsterSpawns=[{id:'rat-test',kind:'rat',x:12,y:12}];m.collision.fill(1);for(let y=3;y<=20;y++)for(let x=3;x<=20;x++)m.collision[y*m.width+x]=0;return m;}
describe('eight-direction movement',()=>{
 it('moves in all eight directions and restores the longer diagonal cooldown without gaining speed',()=>{
  for(const d of Object.keys(movementVectors) as MoveDirection[]){const m=map(),sim=new Simulation([m],'Tester',{now:()=>0});sim.send({type:'Move',direction:d});expect(sim.snapshot().player).toEqual({x:7+movementVectors[d].x,y:7+movementVectors[d].y});}
  const m=map();let now=0;const clock={now:()=>now},sim=new Simulation([m],'Tester',clock);sim.send({type:'Move',direction:'down-right'});const save=sim.exportSave();expect(save.cooldowns.move).toBe(rules.diagonalStepMs);
  const restored=Simulation.restore([m],save,clock);now=282;restored.send({type:'Move',direction:'right'});expect(restored.snapshot().player).toEqual({x:8,y:8});now=283;restored.send({type:'Move',direction:'right'});expect(restored.snapshot().player).toEqual({x:9,y:8});
  expect(()=>Simulation.restore([m],{...save,cooldowns:{...save.cooldowns,move:284}},clock)).toThrow();
 });
 it('rejects either blocked side of a corner, NPCs, monsters and malformed diagonal commands',()=>{
  for(const side of [{x:8,y:7},{x:7,y:8}]){const m=map();m.collision[side.y*m.width+side.x]=1;const sim=new Simulation([m],'Tester',{now:()=>0});sim.send({type:'Move',direction:'down-right'});expect(sim.snapshot().player).toEqual({x:7,y:7});}
  for(const kind of ['npc','monster']){const m=map();if(kind==='npc')m.npcs=[{id:'mira',x:8,y:7}];else m.monsterSpawns[0]={id:'rat-test',kind:'rat',x:8,y:7};const sim=new Simulation([m],'Tester',{now:()=>0});sim.send({type:'Move',direction:'down-right'});sim.send({type:'Move',direction:'southeast'});expect(sim.snapshot().player).toEqual({x:7,y:7});}
 });
 it('shares ordinary diagonal destinations online while retaining server-authoritative cooldowns',()=>{
  const m=map();let now=0;const world=new SharedWorld([m],{now:()=>now});world.join('a','Alice','knight');world.join('b','Bob','mage');
  for(const id of ['a','b'])world.send(id,{type:'Move',direction:'down-right'});expect(world.snapshot('a').player).toEqual(world.snapshot('b').player);
  now=200;world.send('a',{type:'Move',direction:'down-right'});expect(world.snapshot('a').player).toEqual({x:8,y:8});now=283;world.send('a',{type:'Move',direction:'down-right'});expect(world.snapshot('a').player).toEqual({x:9,y:9});
 });
 it('chases diagonally with proportional timing and retains the monster cooldown when saved',()=>{
  const m=map();m.monsterSpawns[0]={id:'rat-test',kind:'rat',x:10,y:10};let now=0;const clock={now:()=>now},sim=new Simulation([m],'Tester',clock);sim.tick();expect(sim.snapshot().creatures[0]).toMatchObject({x:9,y:9,state:'chase'});expect(sim.exportSave().maps[0]!.creatures[0]!.moveIn).toBe(566);
  const restored=Simulation.restore([m],sim.exportSave(),clock);now=565;restored.tick();expect(restored.snapshot().creatures[0]).toMatchObject({x:9,y:9});now=566;restored.tick();expect(restored.snapshot().creatures[0]).toMatchObject({x:8,y:8});
 });
 it('routes monsters around corners with legal steps instead of cutting through walls',()=>{
  const m=map();m.monsterSpawns[0]={id:'rat-test',kind:'rat',x:10,y:10};m.collision[10*m.width+9]=1;let now=0;const sim=new Simulation([m],'Tester',{now:()=>now});
  let previous={x:10,y:10};for(let i=0;i<20;i++){sim.tick();const c=sim.snapshot().creatures[0]!;expect(Math.max(Math.abs(c.x-previous.x),Math.abs(c.y-previous.y))).toBeLessThanOrEqual(1);expect(m.collision[c.y*m.width+c.x]).toBe(0);if(c.x!==previous.x&&c.y!==previous.y){expect(m.collision[c.y*m.width+previous.x]).toBe(0);expect(m.collision[previous.y*m.width+c.x]).toBe(0);}previous={x:c.x,y:c.y};now+=566;}
 });
 it('returns diagonally to its spawn and also patrols in diagonal directions',()=>{
  const m=map();m.monsterSpawns[0]={id:'rat-test',kind:'rat',x:10,y:10};let now=0;const clock={now:()=>now},sim=new Simulation([m],'Tester',clock);sim.tick();const save=sim.exportSave();save.player={x:19,y:19};const restored=Simulation.restore([m],save,clock);now=566;restored.tick();expect(restored.snapshot().creatures[0]).toMatchObject({x:10,y:10});
  let previous={x:10,y:10},diagonal=false;for(let i=0;i<24;i++){now+=1600;restored.tick();const c=restored.snapshot().creatures[0]!;if(Math.abs(c.x-previous.x)===1&&Math.abs(c.y-previous.y)===1)diagonal=true;previous={x:c.x,y:c.y};}expect(diagonal).toBe(true);
 });
});
