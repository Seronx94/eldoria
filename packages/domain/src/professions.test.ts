import {describe,it,expect} from 'vitest';
import {importMap,professions,spells,defaultActions} from '@eldoria/content';
import type {Profession} from '@eldoria/protocol';
import grove from '../../../apps/client/public/assets/grove.json';
import {Simulation,type Spawn} from './index';
function setup(profession:Profession,spawns:Spawn[]=[],hp=100,mana=50){
  let now=0;const map=importMap(grove);map.id='forest';map.monsterSpawns=spawns;
  const data=new Simulation([map],'Tester',{now:()=>now},spawns,undefined,profession).exportSave();
  data.hp=hp;data.mana=mana;for(const c of data.maps[0]!.creatures){c.moveIn=400;c.attackIn=1200;}
  const sim=Simulation.restore([map],data,{now:()=>now});
  return {sim,map,advance(ms:number){now+=ms;sim.tick();},restore(input:unknown){return Simulation.restore([map],input,{now:()=>now});}};
}
describe('profession combat and validated actions',()=>{
  it.each(['knight','archer','mage'] as const)('%s starts with its own weapon, three skills and four slots',p=>{
    const t=setup(p),s=t.sim.snapshot();expect(s.profession).toBe(p);expect(s.equipment.weapon).toBe(professions[p].weapon);
    expect(s.actionSlots).toEqual(defaultActions(p));expect(s.spellCooldowns).toMatchObject({guard:0,fireball:0});
  });
  it.each(['archer','mage'] as const)('%s attacks at a distance without mana, with cooldown, selection fallback and walls',p=>{
    const t=setup(p,[{id:'target',kind:'wolf',x:17,y:11}]);
    t.sim.send({type:'Attack'});const first=t.sim.snapshot();expect(first.creatures[0]!.hp).toBe(70-professions[p].damage+2);expect(first.mana).toBe(50);
    expect(first.combatEvents.at(-1)).toMatchObject({kind:'ranged',effect:professions[p].effect,targetId:'target'});
    t.sim.send({type:'Attack'});expect(t.sim.snapshot().combatEvents).toHaveLength(1);
    t.map.collision[11*t.map.width+15]=1;t.advance(800);t.sim.send({type:'Attack'});
    expect(t.sim.snapshot().creatures[0]!.hp).toBe(first.creatures[0]!.hp);expect(t.sim.snapshot().combatEvents.at(-1)?.targetId).toBeNull();
  });
  it('rejects foreign, malformed or locked actions without consuming mana or touching cooldowns',()=>{
    const t=setup('knight');for(const command of [{type:'Cast',spellId:'fireball'},{type:'Cast',spellId:'unknown'},{type:'SetActionSlot',slot:0,actionId:'volley'},{type:'SetActionSlot',slot:4,actionId:'attack'}])t.sim.send(command);
    expect(t.sim.snapshot()).toMatchObject({mana:50,combatEvents:[],actionSlots:defaultActions('knight')});
  });
  it('applies each cooldown separately and cannot reset it by rebinding or restoring',()=>{
    const t=setup('mage');t.sim.send({type:'Cast',spellId:'spark'});t.sim.send({type:'Cast',spellId:'fireball'});
    expect(t.sim.snapshot().mana).toBe(26);expect(t.sim.snapshot().combatEvents).toHaveLength(2);
    t.sim.send({type:'SetActionSlot',slot:0,actionId:'fireball'});t.sim.send({type:'Cast',spellId:'fireball'});expect(t.sim.snapshot().mana).toBe(26);
    const resumed=t.restore(t.sim.exportSave());resumed.send({type:'Cast',spellId:'fireball'});expect(resumed.snapshot().mana).toBe(26);expect(resumed.snapshot().combatEvents).toEqual([]);
    expect(resumed.snapshot().actionSlots[0]).toBe('fireball');
    t.advance(1500);t.sim.send({type:'Cast',spellId:'spark'});expect(t.sim.snapshot().mana).toBe(18);expect(t.sim.snapshot().spellCooldowns.fireball).toBe(2000);
  });
  it('spins through neighbouring enemies and grants each kill and loot exactly once',()=>{
    const t=setup('knight',[{id:'a',kind:'rat',x:13,y:10},{id:'b',kind:'rat',x:12,y:11},{id:'c',kind:'rat',x:14,y:11}]);
    t.sim.send({type:'Cast',spellId:'spin'});expect(t.sim.snapshot().combatEvents.at(-1)?.hits).toHaveLength(3);
    t.advance(3000);t.sim.send({type:'Cast',spellId:'spin'});expect(t.sim.snapshot()).toMatchObject({kills:3,exp:30});expect(t.sim.snapshot().loot).toHaveLength(3);
    t.sim.send({type:'Cast',spellId:'spin'});expect(t.sim.snapshot().kills).toBe(3);expect(new Set(t.sim.snapshot().loot.map(l=>l.id)).size).toBe(3);
  });
  it.each([['archer','volley'],['mage','fireball']] as const)('%s %s hits around the chosen impact, with one mana payment', (profession,spellId)=>{
    const t=setup(profession,[{id:'center',kind:'wolf',x:16,y:11},{id:'near',kind:'wolf',x:16,y:10},{id:'far',kind:'wolf',x:17,y:10}]);
    t.sim.send({type:'Select',targetId:'center'});t.sim.send({type:'Cast',spellId});
    const s=t.sim.snapshot();expect(s.combatEvents.at(-1)?.hits.map(h=>h.targetId)).toEqual(['center','near']);
    expect(s.creatures.find(c=>c.id==='far')!.hp).toBe(70);expect(s.mana).toBe(50-spells[spellId].mana);
  });
  it('frost hits in two tiles around the mage, stopping at walls and the safe region',()=>{
    const t=setup('mage',[{id:'near',kind:'rat',x:14,y:11},{id:'behind-wall',kind:'rat',x:13,y:9}]);t.map.collision[10*t.map.width+13]=1;
    t.sim.send({type:'Cast',spellId:'frost'});expect(t.sim.snapshot().creatures.map(c=>c.hp)).toEqual([14,30]);
    t.map.combatAllowed=false;const mana=t.sim.snapshot().mana;t.sim.send({type:'Cast',spellId:'spark'});expect(t.sim.snapshot().mana).toBe(mana);
  });
  it('guard reduces damage for four seconds, persists remaining time and expires',()=>{
    const t=setup('knight',[{id:'wolf',kind:'wolf',x:13,y:10}]);t.sim.send({type:'Cast',spellId:'guard'});t.advance(1200);
    expect(t.sim.snapshot().hp).toBe(97);expect(t.sim.exportSave().guardIn).toBe(2800);
    const resumed=t.restore(t.sim.exportSave());expect(resumed.snapshot().guardMs).toBe(2800);
    t.advance(3000.5);expect(t.sim.exportSave().guardIn).toBe(0);expect(t.sim.snapshot().hp).toBe(90);
  });
  it('mend heals only missing HP and cannot consume mana or heal repeatedly at full HP',()=>{
    const t=setup('archer',[],90);t.sim.send({type:'Cast',spellId:'mend'});expect(t.sim.snapshot()).toMatchObject({hp:100,mana:38});
    expect(t.sim.snapshot().combatEvents.at(-1)).toMatchObject({effect:'heal',healing:10});
    t.advance(5000);const mana=t.sim.snapshot().mana;t.sim.send({type:'Cast',spellId:'mend'});expect(t.sim.snapshot().mana).toBe(mana);
  });
  it('rejects insufficient mana and missing profession weapon without any attack event',()=>{
    const t=setup('archer',[],100,7);t.sim.send({type:'Cast',spellId:'power-shot'});t.sim.send({type:'Unequip',slot:'weapon'});t.sim.send({type:'Attack'});
    expect(t.sim.snapshot()).toMatchObject({mana:7,combatEvents:[]});
    t.sim.send({type:'Equip',itemId:'bow'});t.sim.send({type:'Attack'});expect(t.sim.snapshot().combatEvents.at(-1)?.effect).toBe('arrow');
  });
  it('migrates legacy saves to Knight without losing progress and rejects incompatible gear, skills and cooldowns',()=>{
    const t=setup('knight'),data=t.sim.exportSave();const {profession:_,actionSlots:_a,spellCooldowns:_s,guardIn:_g,...legacy}=data;
    void _;void _a;void _s;void _g;legacy.gold=17;legacy.cooldowns.spell=500;
    const migrated=t.restore(legacy);expect(migrated.snapshot()).toMatchObject({profession:'knight',gold:17,actionSlots:defaultActions('knight')});
    expect(migrated.snapshot().spellCooldowns['blade-wave']).toBe(500);
    for(const bad of [{...data,profession:'archer'},{...data,actionSlots:['attack','fireball','spin','guard']},{...data,spellCooldowns:{...data.spellCooldowns,fireball:1}},{...data,guardIn:4001}])expect(()=>t.restore(bad)).toThrow();
  });
});
