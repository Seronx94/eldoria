import {describe,it,expect} from 'vitest';
import {importMap,validateMaps} from '@eldoria/content';
import town from '../../../apps/client/public/assets/vareon.json';
import forest from '../../../apps/client/public/assets/forest.json';
import {Simulation,type SaveData} from './index';
const maps=[importMap(town),importMap(forest)];
function save(){return new Simulation(maps,'Tester',{now:()=>0}).exportSave();}
describe('walkable town and service locations',()=>{
  it('connects all seven interiors and NPC neighbours without walking through walls or furnishings',()=>{
    validateMaps(maps,new Set(['tiles.png']));const m=maps[0]!;
    const actors=new Set(m.npcs.map(n=>`${n.x},${n.y}`));
    const seen=new Set<string>(),queue=[m.spawns.entry!];
    while(queue.length){
      const p=queue.shift()!,key=`${p.x},${p.y}`;
      if(seen.has(key)||actors.has(key)||p.x<0||p.y<0||p.x>=m.width||p.y>=m.height||m.collision[p.y*m.width+p.x])continue;
      seen.add(key);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:p.x+dx!,y:p.y+dy!});
    }
    expect(m.buildings).toHaveLength(7);
    for(const b of m.buildings)for(const d of b.doors)expect(seen.has(`${d.x},${d.y}`)).toBe(true);
    for(const n of m.npcs){
      const b=m.buildings.find(b=>n.x>b.x&&n.x<b.x+b.width-1&&n.y>b.y&&n.y<b.y+b.height-1);
      expect(b?.purpose).toBe(({mira:'guard',oren:'temple',borin:'shop'})[n.id]);
      expect([[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>seen.has(`${n.x+x!},${n.y+y!}`))).toBe(true);
    }
  });
  it('rejects a wall crossing and permits entry through the temple door',()=>{
    let now=0;const data=save();data.player={x:6,y:23};
    const wall=Simulation.restore(maps,data,{now:()=>now});wall.send({type:'Move',direction:'right'});expect(wall.snapshot().player).toEqual(data.player);
    data.player={x:12,y:27};const door=Simulation.restore(maps,data,{now:()=>now});
    door.send({type:'Move',direction:'up'});now+=200;door.send({type:'Move',direction:'up'});expect(door.snapshot().player).toEqual({x:12,y:25});
  });
  it('rejects blocked entrances and overlapping buildings in content',()=>{
    const m=structuredClone(maps[0]!);const d=m.buildings[1]!.doors[0]!;m.collision[d.y*m.width+d.x]=1;
    expect(()=>validateMaps([m,maps[1]!],new Set(['tiles.png']))).toThrow(/drzwi/);
    const overlap=structuredClone(maps[0]!);overlap.buildings[1]!.x=overlap.buildings[0]!.x;overlap.buildings[1]!.y=overlap.buildings[0]!.y;
    expect(()=>validateMaps([overlap,maps[1]!],new Set(['tiles.png']))).toThrow();
  });
});
describe('town save revision migration',()=>{
  it('relocates only an old legitimate position covered by new walls, retaining progress and resources',()=>{
    const data:Partial<SaveData>=save();delete data.cityRevision;
    Object.assign(data,{player:{x:7,y:23},gold:50,hp:30,mana:20,quest:{status:'active',kills:2},exploration:{status:'active',found:['trail']}});
    const sim=Simulation.restore(maps,data,{now:()=>9000});
    expect(sim.snapshot()).toMatchObject({player:{x:24,y:12},gold:50,hp:30,mana:20,quest:{status:'active',kills:2},exploration:{status:'active',found:['trail']}});
    expect(sim.snapshot().message).toContain('przebudowano');expect(sim.exportSave().cityRevision).toBe(2);
    const again=Simulation.restore(maps,sim.exportSave(),{now:()=>10000});expect(again.snapshot().player).toEqual({x:24,y:12});
  });
  it('keeps an old position that is still valid and rejects corrupt or current-revision wall positions',()=>{
    const data=save();data.cityRevision=1;data.player={x:23,y:12};
    expect(Simulation.restore(maps,data,{now:()=>0}).snapshot().player).toEqual(data.player);
    for(const bad of [{...data,player:{x:0,y:0}},{...data,cityRevision:2,player:{x:7,y:23}},{...data,cityRevision:3}])expect(()=>Simulation.restore(maps,bad,{now:()=>0})).toThrow();
  });
});
