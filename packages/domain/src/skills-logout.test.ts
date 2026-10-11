import {it,expect} from 'vitest';
import {Simulation} from './index';
import {rules,combatRules,importMap,skillRequired} from '@eldoria/content';
import town from '../../../apps/client/public/assets/eldoria.json';
const map=importMap(town);
it('trains only legal hits, preserves skills and combat status in character checkpoints',()=>{
 let now=0;const base=new Simulation([map],'Trainer',{now:()=>now}).exportSave();base.player={x:32,y:60};base.skills.melee.progress=19;
 for(const c of base.maps[0]!.creatures)Object.assign(c,{hp:0,state:'dead',respawnIn:20000});Object.assign(base.maps[0]!.creatures[0]!,{hp:30,state:'idle',x:33,y:60,moveIn:400,attackIn:1200});
 const sim=Simulation.restore([map],base,{now:()=>now});sim.send({type:'Attack'});expect(sim.snapshot().skills.melee).toEqual({level:11,progress:0});expect(sim.snapshot().combatMs).toBe(combatRules.logoutLockMs);sim.send({type:'Attack'});expect(sim.snapshot().skills.melee.progress).toBe(0);
 const saved=sim.exportProgress();expect(saved).not.toHaveProperty('loot');expect(saved).not.toHaveProperty('maps');expect(saved).not.toHaveProperty('mode');const resumed=new Simulation([map],'Trainer',{now:()=>now});resumed.restoreProgress(saved);expect(resumed.snapshot().skills).toEqual(sim.snapshot().skills);expect(resumed.snapshot().combatMs).toBe(combatRules.logoutLockMs);
 now+=rules.attackMs;for(const c of base.maps[0]!.creatures)Object.assign(c,{hp:0,state:'dead',respawnIn:20000});const empty=Simulation.restore([map],base,{now:()=>now});empty.send({type:'Attack'});expect(empty.snapshot().skills.melee.progress).toBe(19);
});
it('magic level advances from spent mana, not rejected casts; training rates differ by profession',()=>{
 let now=0;const base=new Simulation([map],'MageTrainer',{now:()=>now},undefined,undefined,'mage').exportSave();base.player={x:32,y:60};base.skills.magic.progress=12;
 for(const c of base.maps[0]!.creatures)Object.assign(c,{hp:0,state:'dead',respawnIn:20000});
 const sim=Simulation.restore([map],base,{now:()=>now});sim.send({type:'Cast'});expect(sim.snapshot().skills.magic).toEqual({level:1,progress:0});sim.send({type:'Cast'});expect(sim.snapshot().skills.magic.progress).toBe(0);expect(sim.snapshot().combatMs).toBe(0);
 now+=1500;sim.send({type:'Cast',spellId:'fireball'});expect(sim.snapshot().skills.magic.progress).toBe(0);expect(skillRequired('magic',0,'knight')).toBeGreaterThan(skillRequired('magic',0,'mage'));
});
it('archer trains distance through arrows; a wand does not grant distance training',()=>{
 const arena=structuredClone(map);arena.spawns.entry={x:32,y:60};arena.monsterSpawns=[{id:'training-rat',kind:'rat',x:33,y:60}];
 const archer=new Simulation([arena],'ArrowTrainer',{now:()=>0},undefined,undefined,'archer');archer.send({type:'Attack'});expect(archer.snapshot().skills.distance.progress).toBe(1);expect(archer.snapshot().skills.melee.progress).toBe(0);
 const mage=new Simulation([arena],'WandTrainer',{now:()=>0},undefined,undefined,'mage');mage.send({type:'Attack'});expect(mage.snapshot().skills.distance.progress).toBe(0);expect(mage.snapshot().skills.magic.progress).toBe(0);mage.send({type:'Cast'});expect(mage.snapshot().skills.magic.progress).toBe(8);
});

it('combat timer never exceeds its protocol limit through fractional clock rounding',()=>{
 const arena=structuredClone(map);arena.spawns.entry={x:32,y:60};arena.monsterSpawns=[{id:'rounding-rat',kind:'rat',x:33,y:60}];
 const sim=new Simulation([arena],'Rounding',{now:()=>5543.8362});sim.send({type:'Attack'});expect(sim.snapshot().combatMs).toBe(combatRules.logoutLockMs);expect(sim.exportProgress().combatIn).toBe(combatRules.logoutLockMs);
});

it('fractional clocks cannot make guard exceed the snapshot boundary',()=>{
 const clock={now:()=>234.2466},base=new Simulation([map],'GuardTrainer',clock).exportSave();base.level=5;base.player={x:32,y:60};
 const sim=Simulation.restore([map],base,clock);sim.send({type:'Cast',spellId:'guard'});expect(sim.snapshot().guardMs).toBe(4000);expect(sim.exportProgress().guardIn).toBe(4000);
});
