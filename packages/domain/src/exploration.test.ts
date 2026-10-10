import { describe, expect, it } from 'vitest';
import { importMap, landmarks } from '@eldoria/content';
import town from '../../../apps/client/public/assets/vareon.json';
import forest from '../../../apps/client/public/assets/forest.json';
import { Simulation, type SaveData } from './index';
const maps = [importMap(town),importMap(forest)];
const clock = {now:()=>0};
function begin() { return new Simulation(maps,'Tester',clock); }
function accept(sim:Simulation) {
  sim.send({type:'Interact',npcId:'mira'});
  sim.send({type:'AcceptQuest',questId:'exploration'});
  sim.send({type:'CloseDialog'});
}
function relocate(sim:Simulation,mapId:'forest'|'vareon',x:number,y:number) {
  const data=sim.exportSave();
  if (!data.maps.some(m=>m.mapId==='forest')) {
    const fresh=new Simulation([...maps].reverse(),'Tester',clock).exportSave();
    data.maps.push(fresh.maps[0]!);
  }
  return Simulation.restore(maps,{...data,mapId,player:{x,y}},clock);
}
function discover() {
  let sim=begin(); accept(sim);
  for(const l of landmarks) {
    sim=relocate(sim,'forest',l.x,l.y+1); sim.send({type:'Interact'});
    sim.send({type:'Interact'}); // Duplicate inspection cannot increase progress.
  }
  return relocate(sim,'vareon',24,12);
}
describe('exploration quest',()=>{
  it('all landmarks and neighbours are reachable from the forest entry',()=>{
    const m=maps[1]!, seen=new Set<string>(), queue=[m.spawns.entry!];
    while(queue.length) {
      const p=queue.shift()!, key=`${p.x},${p.y}`;
      if(seen.has(key)||p.x<0||p.y<0||p.x>=m.width||p.y>=m.height||m.collision[p.y*m.width+p.x]) continue;
      seen.add(key); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) queue.push({x:p.x+dx!,y:p.y+dy!});
    }
    for(const l of landmarks) expect(seen.has(`${l.x},${l.y+1}`)).toBe(true);
  });
  it('requires acceptance and proximity, persists discoveries, pays exactly once',()=>{
    let sim=relocate(begin(),'forest',32,53); sim.send({type:'Interact'});
    expect(sim.snapshot().exploration.found).toEqual([]);
    sim=begin(); sim.send({type:'AcceptQuest',questId:'exploration'});
    expect(sim.snapshot().exploration.status).toBe('available'); accept(sim);
    sim=relocate(sim,'forest',32,58); sim.send({type:'Interact'});
    expect(sim.snapshot().exploration.found).toEqual([]);
    sim=discover(); expect(sim.snapshot().exploration).toEqual({status:'ready',found:['trail','camp','stone']});
    sim.send({type:'Interact',npcId:'mira'}); sim.send({type:'ClaimReward',questId:'exploration'});
    expect(sim.snapshot()).toMatchObject({gold:25,exp:75,potions:5,exploration:{status:'claimed'},quest:{status:'available'}});
    sim.send({type:'ClaimReward',questId:'exploration'}); sim.send({type:'AcceptQuest',questId:'exploration'});
    const saved=sim.exportSave(); sim=Simulation.restore(maps,saved,clock);
    sim.send({type:'Interact',npcId:'mira'}); sim.send({type:'ClaimReward',questId:'exploration'});
    expect(sim.snapshot()).toMatchObject({gold:saved.gold,exp:saved.exp,inventory:saved.inventory,exploration:saved.exploration});
  });
  it('keeps a full-bag reward pending and rejects inconsistent or duplicate discoveries',()=>{
    const data=discover().exportSave(); data.equipment.weapon=null; data.inventory=Array.from({length:20},()=>({itemId:'sword',quantity:1}));
    const sim=Simulation.restore(maps,data,clock); sim.send({type:'Interact',npcId:'mira'}); sim.send({type:'ClaimReward',questId:'exploration'});
    expect(sim.snapshot()).toMatchObject({gold:0,exp:0,exploration:{status:'ready'}});
    sim.send({type:'CloseDialog'}); sim.send({type:'Equip',itemId:'sword'});
    sim.send({type:'Interact',npcId:'mira'}); sim.send({type:'ClaimReward',questId:'exploration'});
    expect(sim.snapshot()).toMatchObject({gold:25,exp:75,potions:2,exploration:{status:'claimed'}});
    for(const q of [{status:'ready',found:['trail']},{status:'active',found:['trail','trail']},{status:'active',found:['unknown']}]) {
      expect(()=>Simulation.restore(maps,{...data,exploration:q},clock)).toThrow();
    }
  });
  it('loads pre-exploration v1 saves with a fresh quest',()=>{
    const data: Partial<SaveData>=begin().exportSave(); delete data.exploration;
    expect(Simulation.restore(maps,data,clock).snapshot().exploration).toEqual({status:'available',found:[]});
  });
});
