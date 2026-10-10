import { expect, it } from 'vitest';
import { importMap } from '@eldoria/content';
import { Simulation } from '@eldoria/domain';
import vareon from '../public/assets/vareon.json';
import forest from '../public/assets/forest.json';
import { OfflineStorage, SAVE_KEY, BACKUP_KEY } from './storage';
function setup() {
  const values=new Map<string,string>(); let quota=false;
  const storage=new OfflineStorage({getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(quota) throw new Error('QuotaExceededError'); values.set(k,v);}});
  const data=new Simulation([importMap(vareon),importMap(forest)],'Tester',{now:()=>0}).exportSave();
  return {values,storage,data,fail:()=>{quota=true;}};
}
it('retains the previous valid checkpoint and can recover without automatic deletion',()=>{
  const t=setup(); expect(t.storage.write(t.data)).toBeUndefined();
  const next={...t.data,gold:20}; expect(t.storage.write(next)).toBeUndefined(); expect(t.storage.load().backup?.gold).toBe(0);
  t.values.set(SAVE_KEY,'{damaged'); expect(t.storage.load()).toMatchObject({backup:{gold:0},error:expect.any(String)});
  expect(t.storage.write(next)).toContain('Uszkodzony'); expect(t.values.get(SAVE_KEY)).toBe('{damaged');
  expect(t.storage.write(t.data,true)).toBeUndefined(); expect(t.values.get(`${SAVE_KEY}.damaged`)).toBe('{damaged'); expect(t.storage.load().data?.gold).toBe(0);
});
it('reports quota errors and preserves both existing checkpoints',()=>{
  const t=setup(); t.storage.write(t.data); t.storage.write({...t.data,gold:5});
  const original=t.values.get(SAVE_KEY), backup=t.values.get(BACKUP_KEY); t.fail(); expect(t.storage.write({...t.data,gold:10})).toContain('brak miejsca');
  expect(t.values.get(SAVE_KEY)).toBe(original); expect(t.values.get(BACKUP_KEY)).toBe(backup);
});
it('rejects unsupported versions without replacing stored data',()=>{
  const t=setup(); t.storage.write(t.data); const original=t.values.get(SAVE_KEY);
  expect(t.storage.write({...t.data,version:2} as unknown as typeof t.data)).toContain('Nie udało'); expect(t.values.get(SAVE_KEY)).toBe(original);
});
