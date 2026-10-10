import {describe,it,expect} from 'vitest';
import {importMap} from '@eldoria/content';
import {defaultAppearance} from '@eldoria/protocol';
import grove from '../../../apps/client/public/assets/grove.json';
import {Simulation} from './index';
const colors={hair:'#dd2255',body:'#ee8855',legs:'#3355cc',feet:'#55bb99'};
describe('validated cosmetic appearance',()=>{
  it.each(['knight','archer','mage'] as const)('%s retains colors on save and legacy saves retain their profession and progress',profession=>{
    const map=importMap(grove);map.id='forest';const clock={now:()=>0},sim=new Simulation([map],'Tester',clock,[],undefined,profession);
    const before=sim.exportSave();sim.send({type:'SetAppearance',appearance:{...colors,hair:'#DD2255'}});
    const data=sim.exportSave();expect(data.appearance).toEqual(colors);
    const {appearance:_a,eventId:_e,...after}=data;const {appearance:_b,eventId:_f,...original}=before;
    void _a;void _b;void _e;void _f;expect(after).toEqual(original);
    const resumed=Simulation.restore([map],data,clock);expect(resumed.snapshot().appearance).toEqual(colors);
    const snapshot=resumed.snapshot();snapshot.appearance.hair='#000000';expect(resumed.snapshot().appearance).toEqual(colors);
    const legacy={...data,gold:17,quest:{status:'claimed',kills:5}};delete (legacy as {appearance?:unknown}).appearance;
    expect(Simulation.restore([map],legacy,clock).snapshot()).toMatchObject({profession,gold:17,quest:legacy.quest,appearance:defaultAppearance(),equipment:data.equipment});
    resumed.send({type:'SetAppearance',appearance:defaultAppearance()});expect(resumed.exportSave().appearance).toEqual(defaultAppearance());
  });
  it('rejects malformed colors, missing parts and unknown parts without changing appearance or progress',()=>{
    const map=importMap(grove);map.id='forest';const clock={now:()=>0},sim=new Simulation([map],'Tester',clock,[]);
    sim.send({type:'SetAppearance',appearance:colors});const before=sim.exportSave();
    for(const appearance of [{...colors,hair:'red'},{...colors,body:'#abc'},{...colors,feet:123},{hair:'#123456'},{...colors,skin:'#ffffff'}]){
      sim.send({type:'SetAppearance',appearance});expect(sim.exportSave()).toEqual({...before,eventId:sim.snapshot().eventId});
      expect(()=>Simulation.restore([map],{...before,appearance},clock)).toThrow();
    }
  });
});
