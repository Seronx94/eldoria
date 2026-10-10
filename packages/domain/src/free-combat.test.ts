import {describe,it,expect} from 'vitest';
import {importMap,rules} from '@eldoria/content';
import grove from '../../../apps/client/public/assets/grove.json';
import {Simulation,type Spawn} from './index';
function setup(spawns:Spawn[]=[]){let now=0;const map=importMap(grove),sim=new Simulation([map],'Tester',{now:()=>now},spawns);return {map,sim,advance(ms:number){now+=ms;sim.tick();}};}
describe('optional target and free casting',()=>{
  it('swings and casts with no monsters, consuming cooldown and mana without rewards or fake hits',()=>{
    const t=setup();t.sim.send({type:'Move',direction:'right'});
    t.sim.send({type:'Attack'});t.sim.send({type:'Attack'});t.sim.send({type:'Cast'});t.sim.send({type:'Cast'});
    expect(t.sim.snapshot()).toMatchObject({mana:42,kills:0,exp:0,gold:0,selectedId:null});
    expect(t.sim.snapshot().combatEvents).toMatchObject([{kind:'melee',damage:0,targetId:null,to:{x:15,y:11}},{kind:'spell',damage:0,targetId:null,to:{x:18,y:11}}]);
    t.advance(rules.attackMs);t.sim.send({type:'Attack'});expect(t.sim.snapshot().combatEvents).toHaveLength(3);
    t.advance(rules.spellMs-rules.attackMs);t.sim.send({type:'Cast'});expect(t.sim.snapshot().mana).toBe(34);
  });
  it('prioritizes a reachable selected enemy and falls back when that enemy is out of range',()=>{
    const t=setup([{id:'near',kind:'rat',x:14,y:11},{id:'far',kind:'rat',x:17,y:11}]);
    t.sim.send({type:'Select',targetId:'far'});t.sim.send({type:'Cast'});
    expect(t.sim.snapshot().combatEvents.at(-1)).toMatchObject({targetId:'far',damage:18});
    t.sim.send({type:'Attack'});expect(t.sim.snapshot().combatEvents.at(-1)).toMatchObject({targetId:'near',damage:12});
    expect(t.sim.snapshot().selectedId).toBe('far');
  });
  it('does not acquire or damage a creature through a wall; a free projectile stops at the wall',()=>{
    const t=setup([{id:'rat',kind:'rat',x:13,y:8}]);t.map.collision[10*t.map.width+13]=1;
    t.sim.send({type:'Move',direction:'up'});t.sim.send({type:'Cast'});
    expect(t.sim.snapshot().creatures[0]).toMatchObject({x:13,y:8,state:'idle',hp:30});
    expect(t.sim.snapshot().combatEvents.at(-1)).toMatchObject({targetId:null,to:{x:13,y:11},damage:0});
  });
  it.each(['rat','beetle','wolf'] as const)('%s detects the player and follows consecutive steps without being attacked',kind=>{
    const t=setup([{id:'pursuer',kind,x:13,y:7}]);
    t.advance(400);expect(t.sim.snapshot().creatures[0]).toMatchObject({state:'chase',y:8});
    t.advance(400);expect(t.sim.snapshot().creatures[0]).toMatchObject({y:9});
    t.sim.send({type:'Move',direction:'right'});t.advance(400);
    const s=t.sim.snapshot();expect(s.creatures[0]!.hp).toBeGreaterThan(0);expect(s.creatures[0]!.state).toBe('chase');
    expect(s.kills).toBe(0);expect(s.combatEvents.filter(e=>e.sourceId==='player')).toEqual([]);
  });
});
