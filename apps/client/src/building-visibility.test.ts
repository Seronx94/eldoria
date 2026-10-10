import {describe,it,expect} from 'vitest';
import {importMap} from '@eldoria/content';
import world from '../public/assets/eldoria.json';
import {insideBuilding,nearBuilding} from './building-visibility';
const buildings=importMap(world).buildings;
describe('approaching town roofs',()=>{
  it('reveals every building from two tiles on each side, without treating the street as an interior',()=>{
    for(const b of buildings){
      const midX=b.x+Math.floor(b.width/2),midY=b.y+Math.floor(b.height/2);
      for(const p of [{x:b.x-2,y:midY},{x:b.x+b.width+1,y:midY},{x:midX,y:b.y-2},{x:midX,y:b.y+b.height+1}]){
        expect(nearBuilding(b,p)).toBe(true);expect(insideBuilding(b,p)).toBe(false);
      }
      for(const p of [{x:b.x-3,y:midY},{x:b.x+b.width+2,y:midY},{x:midX,y:b.y-3},{x:midX,y:b.y+b.height+2}])expect(nearBuilding(b,p)).toBe(false);
      expect(insideBuilding(b,{x:midX,y:midY})).toBe(true);
    }
  });
});
