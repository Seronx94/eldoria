import {PROTOCOL_VERSION} from '@eldoria/protocol';
import {describe,it,expect} from 'vitest';
import {importMap,rules} from '@eldoria/content';
import {SharedWorld,Simulation,onlinePacketSchema} from './index';
import source from '../../../apps/client/public/assets/eldoria.json';
function setup(combat=false){let now=0;const map=importMap(source);if(combat){map.spawns.entry={x:32,y:60};map.monsterSpawns=[{id:"rat-test",kind:"rat",x:32,y:56}];}const world=new SharedWorld([map],{now:()=>now});world.join('alice','Alice','mage');world.join('bob','Bobby','archer');return {world,step(ms:number=rules.stepMs){now+=ms;world.tick();}};}
describe('authoritative shared world',()=>{
 it('shares normal start tiles and sends private stats only to their owner',()=>{
  const t=setup(),a=t.world.snapshot('alice'),b=t.world.snapshot('bob');expect(a.player).toEqual(b.player);expect(a.creatures).toEqual(b.creatures);
  expect(a.players).toHaveLength(1);expect(a.players[0]).toMatchObject({id:'bob',name:'Bobby',profession:'archer'});
  expect(a.players[0]).not.toHaveProperty('mana');expect(a.players[0]).not.toHaveProperty('inventory');expect(a.players[0]).not.toHaveProperty('stash');
  expect(onlinePacketSchema.safeParse({protocolVersion:PROTOCOL_VERSION,snapshot:a}).success).toBe(true);
  expect(onlinePacketSchema.safeParse({protocolVersion:PROTOCOL_VERSION,snapshot:{...a,players:[{...a.players[0],mana:50}]}}).success).toBe(false);
 });
 it('does not trust HP, gold, actor ID, teleport coordinates or invalid directions; players may pass through one another',()=>{
  const t=setup(),before=t.world.snapshot('alice');
  for(const c of [{type:'Move',direction:'up',x:1,y:1},{type:'Move',direction:'up',actorId:'bob'},{type:'SetHP',hp:999},{type:'SetGold',gold:100000},{type:'Move',direction:'diagonal'}])t.world.send('alice',c);
  expect(t.world.snapshot('alice')).toMatchObject({hp:before.hp,gold:0,player:before.player});
  t.world.send('bob',{type:'Move',direction:'left'});t.world.send('alice',{type:'Move',direction:'left'});expect(t.world.snapshot('alice').player).toEqual(t.world.snapshot('bob').player);
 });
 it('both actors observe the same combat events, creature health and single loot/reward',()=>{
  const t=setup(true);
  // The real rat AI pursues the nearest actor; casts obey server range and level.
  for(let count=0;count<15&&t.world.snapshot('alice').kills===0;count++){t.world.send('alice',{type:'Attack'});t.world.send('alice',{type:'Cast'});t.step(1600);}
  const a=t.world.snapshot('alice'),b=t.world.snapshot('bob');expect(a.kills).toBeGreaterThan(0);expect(b.kills).toBe(0);expect(b.exp).toBe(0);
  expect(a.creatures).toEqual(b.creatures);expect(a.loot).toEqual(b.loot);
  expect(b.combatEvents.some(e=>e.sourceId==='alice'&&(e.kind==='ranged'||e.kind==='spell'))).toBe(true);
  const gold=a.gold+b.gold+a.loot.reduce((n,l)=>n+l.gold,0),exp=a.exp+b.exp;
  t.world.send('bob',{type:'Attack'});expect(t.world.snapshot('alice').exp+t.world.snapshot('bob').exp).toBe(exp);
  expect(t.world.snapshot('alice').gold+t.world.snapshot('bob').gold+t.world.snapshot('alice').loot.reduce((n,l)=>n+l.gold,0)).toBe(gold);
  t.world.send('bob',{type:'Move',direction:'up'});t.world.send('bob',{type:'Loot'});t.world.send('bob',{type:'Loot'});t.world.send('alice',{type:'Loot'});expect(t.world.snapshot('alice').loot).toEqual([]);expect(t.world.snapshot('bob').gold+t.world.snapshot('alice').gold).toBe(gold);
 });
 it('leaving removes the actor; joining again creates fresh resources with no offline import',()=>{
  const t=setup();t.world.leave('bob');expect(t.world.snapshot('alice').players).toEqual([]);t.world.join('bob','Bobby','knight');expect(t.world.snapshot('bob')).toMatchObject({gold:0,exp:0,level:1,hp:100,mana:50,stash:[]});
  expect(()=>t.world.join('bob','Other','mage')).toThrow();
 });
 it('a shared monster attacks the nearest actor once per cooldown and switches after departure',()=>{
  let now=0;const map=importMap(source);map.spawns.entry={x:32,y:60};map.monsterSpawns=[{id:'rat-test',kind:'rat',x:32,y:58}];
  const world=new SharedWorld([map],{now:()=>now});const progress=new Simulation([map],'Bobby',{now:()=>now},undefined,undefined,'archer').exportProgress();progress.player={x:32,y:59};world.join('alice','Alice','mage');world.join('bob','Bobby','archer',progress);
  world.tick();const bob=world.snapshot('bob'),alice=world.snapshot('alice');expect(bob.hp).toBeLessThan(100);expect(alice.hp).toBe(100);
  world.tick();now+=rules.monsterAttackMs-1;world.tick();expect(world.snapshot('bob').hp).toBe(bob.hp);
  now++;world.tick();expect(world.snapshot('bob').hp).toBe(100-2*(100-bob.hp));expect(world.snapshot('alice').hp).toBe(100);
  world.leave('bob');now+=rules.monsterAttackMs;world.tick();now+=rules.tickMs;world.tick();expect(world.snapshot('alice').hp).toBeLessThan(100);
 });
});
