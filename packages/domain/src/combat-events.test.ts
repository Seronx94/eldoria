import { describe, it, expect } from 'vitest';
import { importMap, rules } from '@eldoria/content';
import { Simulation } from './index';
import grove from '../../../apps/client/public/assets/grove.json';
import courtyard from '../../../apps/client/public/assets/courtyard.json';
import forest from '../../../apps/client/public/assets/forest.json';
function training(x = 14, kind: 'rat' | 'wolf' = 'rat') {
  let now = 0;
  const sim = new Simulation([importMap(grove),importMap(courtyard)],'Tester',{now:()=>now},[{id:'target',kind,x,y:11}]);
  return {sim,advance:(ms:number)=>{now+=ms;sim.tick();}};
}
describe('confirmed combat presentation events',()=>{
  it('emits only accepted hits, including a lethal hit, without replaying rejected cooldowns',()=>{
    const t=training(16); const sim=t.sim;
    sim.send({type:'Attack'});sim.send({type:'Select',targetId:'target'});sim.send({type:'Attack'});
    expect(sim.snapshot().combatEvents).toEqual([]);
    sim.send({type:'Cast'});sim.send({type:'Cast'});
    expect(sim.snapshot().combatEvents).toEqual([{id:1,mapId:'grove',kind:'spell',sourceId:'player',targetId:'target',from:{x:13,y:11},to:{x:16,y:11},damage:18}]);
    t.advance(rules.spellMs);sim.send({type:'Cast'});
    expect(sim.snapshot().combatEvents.filter(e=>e.kind==='spell').map(e=>e.id)).toEqual([1,3]);
    expect(sim.snapshot().kills).toBe(1);
    sim.send({type:'Cast'});expect(sim.snapshot().combatEvents).toHaveLength(3);
  });
  it('reports melee and monster damage once per accepted attack, copying coordinates',()=>{
    const t=training();t.sim.send({type:'Select',targetId:'target'});t.sim.send({type:'Attack'});
    t.advance(50); const first=t.sim.snapshot();
    expect(first.combatEvents).toMatchObject([{kind:'melee',damage:12,targetId:'target'},{kind:'monster',damage:1,targetId:'player'}]);
    t.advance(50);expect(t.sim.snapshot().combatEvents).toHaveLength(2);
    first.combatEvents[0]!.from.x=999;
    expect(t.sim.snapshot().combatEvents[0]!.from.x).toBe(13);
  });
  it('does not replay combat events when a saved adventure is restored',()=>{
    let now=0;const maps=[importMap(forest)];const sim=new Simulation(maps,'Tester',{now:()=>now});
    sim.send({type:'Select',targetId:'rat-1'});sim.send({type:'Cast'});now+=1500;sim.send({type:'Cast'});
    expect(sim.snapshot().combatEvents.length).toBeGreaterThan(0);
    const restored=Simulation.restore(maps,sim.exportSave(),{now:()=>now});
    expect(restored.snapshot().kills).toBe(1);expect(restored.snapshot().combatEvents).toEqual([]);
  });
  it('bounds retained events across deaths and respawns',()=>{
    const t=training();
    for(let i=0;i<10;i++){
      t.sim.send({type:'Select',targetId:'target'});t.sim.send({type:'Cast'});t.advance(1500);t.sim.send({type:'Cast'});t.advance(20000);
    }
    const events=t.sim.snapshot().combatEvents;
    expect(events).toHaveLength(16);expect(events.at(-1)!.id).toBeGreaterThan(16);
    expect(new Set(events.map(e=>e.id)).size).toBe(16);
  });
});
describe('forest idle patrol',()=>{
  it('moves distant idle creatures within their spawn area without occupying walls, actors or gates',()=>{
    let now=0;const map=importMap(forest);
    const sim=new Simulation([map],'Tester',{now:()=>now});
    const initial=sim.snapshot();const visited=new Set<string>();
    for(let i=0;i<30;i++){
      now+=800;sim.tick();const s=sim.snapshot();
      const positions=s.creatures.filter(c=>c.hp>0).map(c=>`${c.x},${c.y}`);
      expect(new Set(positions).size).toBe(positions.length);
      for(const c of s.creatures){
        visited.add(`${c.id}:${c.x},${c.y}`);
        expect(map.collision[c.y*map.width+c.x]).toBe(0);
        expect(Math.abs(c.x-c.spawn.x)+Math.abs(c.y-c.spawn.y)).toBeLessThanOrEqual(rules.patrolRadius);
        expect(map.portals.some(p=>Math.abs(p.x-c.x)+Math.abs(p.y-c.y)<=1)).toBe(false);
      }
      expect(s.player).toEqual(initial.player);expect(s.hp).toBe(100);
      expect(s.creatures.find(c=>c.id==='rat-1')).toMatchObject({x:33,y:56,state:'idle'});
    }
    expect(visited.size).toBeGreaterThan(initial.creatures.length);
  });
});
