import { describe, expect, it } from 'vitest';
import vareon from '../../../apps/client/public/assets/vareon.json';
import forest from '../../../apps/client/public/assets/forest.json';
import { importMap, validateMaps } from '@eldoria/content';
import { Simulation, type SaveData, type Stack } from './index';
import type { Direction } from '@eldoria/protocol';
const maps = () => [importMap(vareon), importMap(forest)];
function setup(inventory?: Stack[]) {
  let now = 0;
  const sim = new Simulation(maps(),'Tester',{now:() => now},undefined,inventory);
  const advance = (ms: number) => { now += ms; sim.tick(); };
  const move = (direction: Direction, count = 1) => { for (let i=0;i<count;i++) { advance(200); sim.send({type:'Move',direction}); } };
  return {sim,advance,move};
}
function killRat(t: ReturnType<typeof setup>) {
  t.sim.send({type:'Select',targetId:'rat-1'});
  t.sim.send({type:'Cast'}); t.advance(1500); t.sim.send({type:'Cast'});
}
function inForest(t: ReturnType<typeof setup>) { t.move('up',7); t.sim.send({type:'Interact'}); }
function readySave(inventory: Stack[] = [{itemId:'potion',quantity:3}]): SaveData {
  const t=setup(inventory); const data=t.sim.exportSave(); data.quest={status:'ready',kills:5}; data.gold=20; return data;
}
describe('adventure maps and NPCs', () => {
  it('has the specified sizes, 12 forest creatures and reachable gates/NPC neighbours', () => {
    const world=maps(); validateMaps(world,new Set(['tiles.png']));
    expect(world.map(m=>[m.width,m.height])).toEqual([[48,48],[64,64]]);
    expect(world[1]!.monsterSpawns).toHaveLength(12);
    for (const map of world) {
      const npcKeys=new Set(map.npcs.map(n=>`${n.x},${n.y}`));
      const seen=new Set<string>(); const queue=[map.spawns.entry!];
      while(queue.length) {
        const p=queue.shift()!, key=`${p.x},${p.y}`;
        if(seen.has(key)||npcKeys.has(key)||p.x<0||p.y<0||p.x>=map.width||p.y>=map.height||map.collision[p.y*map.width+p.x]!==0) continue;
        seen.add(key); for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]) queue.push({x:p.x+x!,y:p.y+y!});
      }
      for(const actor of [...map.portals,...map.npcs]) expect([[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>seen.has(`${actor.x+x!},${actor.y+y!}`))).toBe(true);
    }
  });
  it('rejects NPC interaction from afar, blocks movement/attacks in dialog and cannot walk through NPCs', () => {
    const t=setup(); t.sim.send({type:'Interact',npcId:'borin'}); expect(t.sim.snapshot().dialog).toBeNull();
    t.sim.send({type:'Move',direction:'right'}); expect(t.sim.snapshot().player).toEqual({x:24,y:12});
    t.sim.send({type:'Interact',npcId:'mira'}); expect(t.sim.snapshot().dialog).toBe('mira');
    t.move('up'); t.sim.send({type:'Attack'}); t.sim.send({type:'Cast'});
    expect(t.sim.snapshot()).toMatchObject({player:{x:24,y:12},mana:50});
    t.sim.send({type:'CloseDialog'}); t.move('up'); expect(t.sim.snapshot().player.y).toBe(11);
    t.sim.send({type:'Heal'}); expect(t.sim.snapshot().message).toContain('Podejdź');
  });
  it('finds a free arrival when a cached forest creature occupies the entry tile', () => {
    const t=setup(); inForest(t); const save=t.sim.exportSave(); save.player={x:32,y:59};
    const rat=save.maps.find(m=>m.mapId==='forest')!.creatures[0]!; rat.x=32; rat.y=58;
    let now=0; const sim=Simulation.restore(maps(),save,{now:()=>now}); sim.send({type:'Interact'});
    for(let i=0;i<7;i++) { now+=200; sim.send({type:'Move',direction:'up'}); }
    sim.send({type:'Interact'}); expect(sim.snapshot().mapId).toBe('forest');
    const state=sim.snapshot(); expect(state.creatures.some(c=>c.hp>0 && c.x===state.player.x && c.y===state.player.y)).toBe(false);
    expect(()=>sim.exportSave()).not.toThrow();
  });
  it('makes five explicit return journeys without landing in a portal or duplicating creatures', () => {
    const t=setup();
    for(let i=0;i<5;i++) {
      inForest(t); expect(t.sim.snapshot().mapId).toBe('forest'); expect(t.sim.snapshot().creatures).toHaveLength(12);
      t.sim.send({type:'Interact'}); expect(t.sim.snapshot().mapId).toBe('forest');
      // Diagonal AI can occupy the old entry: approach from the actual free arrival.
      for(let step=0;step<16;step++){
        const state=t.sim.snapshot(),map=maps().find(m=>m.id==='forest')!,portal=map.portals[0]!;
        const queue=[{...state.player,path:[] as Direction[]}],seen=new Set<string>();let route:Direction[]|undefined;
        for(let i=0;i<queue.length;i++){
          const p=queue[i]!,key=`${p.x},${p.y}`;
          if(seen.has(key)||p.x<0||p.y<0||p.x>=map.width||p.y>=map.height||map.collision[p.y*map.width+p.x]||state.creatures.some(c=>c.hp>0&&c.x===p.x&&c.y===p.y))continue;
          seen.add(key);if(Math.abs(p.x-portal.x)+Math.abs(p.y-portal.y)<=1){route=p.path;break;}
          for(const [d,x,y]of [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]] as const)queue.push({x:p.x+x,y:p.y+y,path:[...p.path,d]});
        }
        expect(route).toBeDefined();if(!route!.length)break;t.move(route![0]!);
      }
      t.sim.send({type:'Interact'}); expect(t.sim.snapshot().mapId).toBe('vareon');
      expect(t.sim.snapshot().player).toEqual({x:24,y:12});
    }
  });
});
describe('quest and shop atomicity', () => {
  it('counts only post-acceptance kills and pays the reward exactly once', () => {
    const t=setup(); inForest(t); killRat(t); expect(t.sim.snapshot().quest).toEqual({status:'available',kills:0});
    t.move('down'); t.sim.send({type:'Interact'}); t.sim.send({type:'Interact',npcId:'mira'}); t.sim.send({type:'AcceptQuest'}); t.sim.send({type:'AcceptQuest'}); t.sim.send({type:'CloseDialog'});
    inForest(t);
    for(let i=0;i<5;i++) { t.advance(20000); killRat(t); }
    expect(t.sim.snapshot().quest).toEqual({status:'ready',kills:5});
    t.move('down'); t.sim.send({type:'Interact'}); t.sim.send({type:'Interact',npcId:'mira'});
    const before=t.sim.snapshot(); t.sim.send({type:'ClaimReward'}); const paid=t.sim.snapshot();
    expect(paid.gold-before.gold).toBe(20); expect(paid.potions-before.potions).toBe(2); expect(paid.quest.status).toBe('claimed'); expect(paid.level).toBe(2);
    t.sim.send({type:'ClaimReward'}); expect(t.sim.snapshot()).toMatchObject({gold:paid.gold,exp:paid.exp,potions:paid.potions});
  });
  it('keeps a full-bag reward pending, then allows one complete payment after freeing a slot', () => {
    const data=readySave(Array.from({length:20},()=>({itemId:'sword',quantity:1}))); data.equipment.weapon=null;
    const sim=Simulation.restore(maps(),data,{now:()=>0});
    sim.send({type:'Interact',npcId:'mira'}); sim.send({type:'ClaimReward'}); sim.send({type:'ClaimReward'});
    expect(sim.snapshot()).toMatchObject({gold:20,exp:0,quest:{status:'ready',kills:5},potions:0});
    sim.send({type:'CloseDialog'}); sim.send({type:'Equip',itemId:'sword'}); sim.send({type:'Interact',npcId:'mira'}); sim.send({type:'ClaimReward'});
    expect(sim.snapshot()).toMatchObject({gold:40,exp:50,potions:2,quest:{status:'claimed'}});
  });
  it('checks shop proximity, gold, inventory, quantities and repeated sales', () => {
    const data=readySave([{itemId:'chitin',quantity:1}]); data.player={x:36,y:22}; data.gold=4;
    const sim=Simulation.restore(maps(),data,{now:()=>0}); sim.send({type:'Buy',quantity:1}); expect(sim.snapshot().gold).toBe(4);
    sim.send({type:'Interact',npcId:'borin'}); sim.send({type:'Buy',quantity:1}); expect(sim.snapshot().gold).toBe(4);
    sim.send({type:'Sell',itemId:'chitin',quantity:1}); sim.send({type:'Sell',itemId:'chitin',quantity:1}); expect(sim.snapshot().gold).toBe(6);
    sim.send({type:'Buy',quantity:-1}); sim.send({type:'Buy',quantity:100}); expect(sim.snapshot().gold).toBe(6);
    sim.send({type:'Buy',quantity:1}); sim.send({type:'Buy',quantity:1}); expect(sim.snapshot()).toMatchObject({gold:1,potions:1});
    const full=readySave(Array.from({length:20},()=>({itemId:'sword',quantity:1}))); full.player={x:36,y:22};
    const fullSim=Simulation.restore(maps(),full,{now:()=>0}); fullSim.send({type:'Interact',npcId:'borin'}); fullSim.send({type:'Buy',quantity:1}); expect(fullSim.snapshot().gold).toBe(20);
  });
  it('Oren heals without taking gold or potions', () => {
    const data=readySave(); data.player={x:12,y:23}; data.hp=30; data.mana=1;
    const sim=Simulation.restore(maps(),data,{now:()=>0}); sim.send({type:'Interact',npcId:'oren'}); sim.send({type:'Heal'});
    expect(sim.snapshot()).toMatchObject({hp:100,mana:50,potions:3,gold:20});
  });
});
describe('versioned offline saves', () => {
  it('round-trips position, equipment, quest, resources, loot and dead creatures without replaying rewards', () => {
    const t=setup(); t.sim.send({type:'Interact',npcId:'mira'}); t.sim.send({type:'AcceptQuest'}); t.sim.send({type:'CloseDialog'}); inForest(t); killRat(t);
    const save=t.sim.exportSave(); const sim=Simulation.restore(maps(),JSON.parse(JSON.stringify(save)),{now:()=>100000});
    expect(sim.exportSave()).toEqual(save); expect(sim.snapshot().dialog).toBeNull();
    sim.send({type:'Select',targetId:'rat-1'}); sim.send({type:'Attack'}); expect(sim.snapshot().quest.kills).toBe(1);
    sim.send({type:'Loot'}); const gold=sim.snapshot().gold; sim.send({type:'Loot'}); expect(sim.snapshot().gold).toBe(gold);
  });
  it('restores cooldowns across a different clock origin and keeps respawn delayed', () => {
    const t=setup(); inForest(t); killRat(t); const save=t.sim.exportSave(); let now=500000;
    const sim=Simulation.restore(maps(),save,{now:()=>now}); sim.send({type:'Select',targetId:'beetle-1'}); const mana=sim.snapshot().mana;
    sim.send({type:'Cast'}); expect(sim.snapshot().mana).toBe(mana);
    now+=1500; sim.send({type:'Cast'}); expect(sim.snapshot().mana).toBeLessThan(mana);
    expect(sim.snapshot().creatures[0]!.hp).toBe(0);
    now+=20000; sim.tick(); expect(sim.snapshot().creatures[0]!.hp).toBe(30);
  });
  it('rejects corruption, unsupported versions, mismatched stats and map/wall positions', () => {
    const save=readySave();
    for(const bad of [{...save,version:2},{...save,hp:101},{...save,quest:{status:'claimed',kills:0}},{...save,player:{x:0,y:0}},{...save,mapId:'missing'},{...save,extra:100}]) expect(()=>Simulation.restore(maps(),bad,{now:()=>0})).toThrow();
    expect(()=>Simulation.restore(maps(),'{broken',{now:()=>0})).toThrow();
  });
  it('restores after death without losing accepted quest, economy or equipment', () => {
    const data=readySave(); data.quest={status:'active',kills:2}; data.hp=1;
    const t=setup(); inForest(t); const combat=t.sim.exportSave(); Object.assign(combat,{hp:1,quest:data.quest,gold:20,player:{x:39,y:38}});
    let now=0; const sim=Simulation.restore(maps(),combat,{now:()=>now});
    for(let i=0;i<10 && sim.snapshot().mapId==='forest';i++) { now+=1200; sim.tick(); }
    expect(sim.snapshot()).toMatchObject({mapId:'vareon',hp:100,mana:50,gold:20,quest:data.quest,equipment:{weapon:'sword',armor:'tunic'}});
    expect(Simulation.restore(maps(),sim.exportSave(),{now:()=>9000}).snapshot()).toMatchObject({mapId:'vareon',quest:data.quest,gold:20});
  });
});
