import {it,expect} from 'vitest';
import {projectileEndpoint} from './projectile-target';
it('follows movement within two tiles but keeps the impact point when the target vanishes or teleports',()=>{
 const initial={x:100,y:200};expect(projectileEndpoint(initial,{x:120,y:200})).toEqual({x:120,y:200});
 expect(projectileEndpoint(initial,undefined)).toEqual(initial);expect(projectileEndpoint(initial,{x:1000,y:200})).toEqual(initial);
});
