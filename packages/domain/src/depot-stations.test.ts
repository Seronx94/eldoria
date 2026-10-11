import {it,expect} from 'vitest';
import {importMap,depotsOnMap} from '@eldoria/content';
import {Simulation,SharedWorld} from './index';
import source from '../../../apps/client/public/assets/eldoria.json';
const map=importMap(source);
it('reserves a stand until departure, shares corridors and frees it after leaving/disconnecting',()=>{
 let now=0;const clock={now:()=>now},world=new SharedWorld([map],clock);
 const progress=(name:string,player:{x:number;y:number})=>{const p=new Simulation([map],name,clock).exportProgress();p.player=player;return p;};
 const station=depotsOnMap(map.id)[0]!;
 world.join('alice','Alice','knight',progress('Alice',station.stand));world.join('bob','Bobby','knight',progress('Bobby',station.stand));
 expect(world.snapshot('alice').player).toEqual(station.stand);expect(world.snapshot('bob').player).toEqual({x:21,y:99});
 world.send('alice',{type:'OpenDepot'});world.send('bob',{type:'Move',direction:'up'});world.send('bob',{type:'OpenDepot'});expect(world.snapshot('bob')).toMatchObject({player:{x:21,y:99},depotOpen:false});
 world.send('alice',{type:'CloseDepot'});world.send('bob',{type:'Move',direction:'up'});expect(world.snapshot('bob').player).toEqual({x:21,y:99});
 world.send('alice',{type:'Move',direction:'down'});expect(world.snapshot('alice').player).toEqual(world.snapshot('bob').player);
 now+=200;world.send('bob',{type:'Move',direction:'up'});world.send('bob',{type:'OpenDepot'});expect(world.snapshot('bob').depotOpen).toBe(true);
 world.leave('bob');world.send('alice',{type:'Move',direction:'up'});expect(world.snapshot('alice').player).toEqual(station.stand);
});
it('all four stands can be used concurrently and resources stay private',()=>{
 const clock={now:()=>0},world=new SharedWorld([map],clock);
 for(const [i,station]of depotsOnMap(map.id).entries()){const progress=new Simulation([map],`Tester${i}`,clock).exportProgress();progress.player=station.stand;progress.stash=[{itemId:'skin',quantity:i+1}];world.join(`p${i}`,`Tester${i}`,'knight',progress);world.send(`p${i}`,{type:'OpenDepot'});}
 for(let i=0;i<4;i++){const s=world.snapshot(`p${i}`);expect(s.depotOpen).toBe(true);expect(s.stash[0]!.quantity).toBe(i+1);for(const other of s.players)expect(other).not.toHaveProperty('stash');}
});
it('revision 2 positions covered by new dividers relocate safely, retaining stash and rejecting current wall saves',()=>{
 const sim=new Simulation([map],'Tester',{now:()=>0}),save=sim.exportSave();save.cityRevision=2;save.player={x:20,y:98};save.stash=[{itemId:'skin',quantity:8}];save.gold=19;
 const restored=Simulation.restore([map],save,{now:()=>0});expect(restored.snapshot()).toMatchObject({player:{x:21,y:100},gold:19,stash:save.stash});expect(restored.exportSave().cityRevision).toBe(3);
 expect(()=>Simulation.restore([map],{...save,cityRevision:3},{now:()=>0})).toThrow();expect(()=>Simulation.restore([map],{...save,cityRevision:1},{now:()=>0})).toThrow();
 const online=sim.exportProgress();online.player=save.player;online.stash=save.stash;sim.restoreProgress(online);expect(sim.snapshot()).toMatchObject({player:{x:21,y:100},stash:save.stash});
});
