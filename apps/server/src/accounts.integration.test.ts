import {beforeAll,afterAll,it,expect,describe,vi} from 'vitest';
import {createServer} from 'node:http';
import {Server} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {Simulation,onlinePacketSchema,type OnlineSnapshot} from '@eldoria/domain';
import {createCharacterSchema,credentialsSchema,PROTOCOL_VERSION,exitResultSchema} from '@eldoria/protocol';
import {combatRules} from '@eldoria/content';
import {Accounts} from './accounts';
import {worldMap,WorldRoom} from './world-room';
if(!process.env.DATABASE_URL&&existsSync('.eldoria-local/server.env'))process.loadEnvFile('.eldoria-local/server.env');
describe.skipIf(!process.env.DATABASE_URL)('PostgreSQL accounts, limits, sessions and checkpoints',()=>{
 const schema=`test_${randomUUID().replaceAll('-','')}`,admin=new Pool({connectionString:process.env.DATABASE_URL});let store:Accounts;let now=Date.now();
 beforeAll(async()=>{await admin.query(`CREATE SCHEMA ${schema}`);const url=new URL(process.env.DATABASE_URL!);url.searchParams.set('options',`-csearch_path=${schema}`);store=new Accounts(url.toString(),()=>now);await store.migrate();await store.migrate();});
 afterAll(async()=>{await store?.close();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();});
 const progress=(name:string)=>new Simulation([worldMap],name,{now:()=>0}).exportProgress();
 it('hashes passwords, validates credentials and rejects bad logins without importing client fields',async()=>{
  const token=await store.register('first@example.test','Correct password 42'),identity=await store.authenticate(token),view=await store.view(identity);
  expect(view.account).toMatchObject({tier:'free',characterLimit:3});expect(view.characters).toEqual([]);
  const row=(await store.pool.query('SELECT password_hash FROM accounts WHERE id=$1',[identity.accountId])).rows[0] as {password_hash:string};expect(row.password_hash).toMatch(/^scrypt-131072:/);expect(row.password_hash).not.toContain('Correct password');
  const saved=(await store.pool.query('SELECT token_hash FROM sessions')).rows as {token_hash:string}[];expect(saved.some(row=>row.token_hash===token)).toBe(false);
  await expect(store.login('first@example.test','Incorrect password')).rejects.toThrow('Nieprawidłowy email lub hasło');await expect(store.login('missing@example.test','Incorrect password')).rejects.toThrow('Nieprawidłowy email lub hasło');
  expect((await store.authenticate(await store.login('first@example.test','Correct password 42'))).accountId).toBe(identity.accountId);
  expect(credentialsSchema.safeParse({email:'bad',password:'short'}).success).toBe(false);expect(createCharacterSchema.safeParse({name:'Hacker',profession:'mage',tier:'premium',level:100}).success).toBe(false);
 });
 it('serializes simultaneous creations: three free, five premium; unique names across accounts',async()=>{
  const identity=await store.authenticate(await store.register('limits@example.test','Correct password 42'));
  const results=await Promise.allSettled([1,2,3,4].map(i=>store.create(identity,progress(`Limit${i}`))));expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(3);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  await store.pool.query("UPDATE accounts SET tier='premium' WHERE id=$1",[identity.accountId]);await store.create(identity,progress('PremiumOne'));await store.create(identity,progress('PremiumTwo'));await expect(store.create(identity,progress('PremiumSix'))).rejects.toThrow('limit');expect((await store.view(identity)).characters).toHaveLength(5);
  const other=await store.authenticate(await store.register('other@example.test','Correct password 42'));await expect(store.create(other,progress('PremiumOne'))).rejects.toThrow('zajęta');
 });
 it('enforces ownership and unique leases, retains progress and prevents a stale lease from writing',async()=>{
  const a=await store.authenticate(await store.register('lease@example.test','Correct password 42')),b=await store.authenticate(await store.register('foreign@example.test','Correct password 42'));await store.create(a,progress('LeaseKnight'));const id=(await store.view(a)).characters[0]!.id;
  await expect(store.claim(b,id)).rejects.toThrow('nie należy');const first=await store.claim(a,id);await expect(store.claim(a,id)).rejects.toThrow('już w grze');await expect(store.revoke(a)).rejects.toThrow('opuść');
  first.progress.inventory=[{itemId:'skin',quantity:2,bag:'materials'}];first.progress.lootSettings={enabled:true,gold:false,itemIds:['skin'],destinations:{skin:'materials'}};first.progress.gold=23;first.progress.skills.melee={level:12,progress:3};first.progress.stash=[{itemId:'skin',quantity:2}];await store.checkpoint(id,first.leaseId,first.progress,true);
  const second=await store.claim(a,id);expect(second.progress).toMatchObject({inventory:[{itemId:'skin',quantity:2,bag:'materials'}],lootSettings:{enabled:true,gold:false,itemIds:['skin'],destinations:{skin:'materials'}},gold:23,skills:{melee:{level:12,progress:3}},stash:[{itemId:'skin',quantity:2}]});await expect(store.checkpoint(id,first.leaseId,first.progress)).rejects.toThrow('wyłączność');await store.checkpoint(id,second.leaseId,second.progress,true);await store.revoke(a);await expect(store.authenticate(await store.login('lease@example.test','Correct password 42'))).resolves.toHaveProperty('accountId');
 });
 it('expires at fifteen idle minutes; reads do not refresh, activity refreshes and revocation invalidates',async()=>{
  const token=await store.register('idle@example.test','Correct password 42'),identity=await store.authenticate(token);
  now+=combatRules.idleMs-1;await store.view(identity);await expect(store.authenticate(token)).resolves.toHaveProperty('accountId');now++;await expect(store.authenticate(token)).rejects.toThrow('bezczynności');
  const fresh=await store.authenticate(await store.login('idle@example.test','Correct password 42'));now+=combatRules.idleMs-100;await store.touch(fresh);now+=200;await expect(store.checkSession(fresh.tokenHash)).resolves.toHaveProperty('accountId');await store.revoke(fresh);await expect(store.checkSession(fresh.tokenHash)).rejects.toThrow('bezczynności');
 });
 it('real authenticated sockets reject duplicate/foreign joins and retain a disconnected combat actor until safe',async()=>{
  now=Date.now();const token=await store.register('socket@example.test','Correct password 42'),identity=await store.authenticate(token),checkpoint=progress('SocketKeeper');checkpoint.combatIn=1800;await store.create(identity,checkpoint);const id=(await store.view(identity)).characters[0]!.id;
  const otherToken=await store.register('watcher@example.test','Correct password 42'),other=await store.authenticate(otherToken);await store.create(other,progress('SocketWatcher'));const otherId=(await store.view(other)).characters[0]!.id;
  const http=createServer(),server=new Server({greet:false,gracefullyShutdown:false,transport:new WebSocketTransport({server:http})});WorldRoom.accounts=store;server.define('eldoria',WorldRoom);await server.listen(0,'127.0.0.1');const address=http.address();if(!address||typeof address==='string')throw new Error('Missing port');const host=`127.0.0.1:${address.port}`;
  // Node's browser-compatible WebSocket cannot send cookie headers. Exercise
  // the SDK's real Node transport, not a mock socket or auth bypass.
  vi.stubGlobal('WebSocket',undefined);const {Client}=await import('@colyseus/sdk');
  const sdk=new Client(`ws://${host}`,{headers:{Cookie:`eldoria_session=${token}`,Origin:`http://${host}`}}),watcher=new Client(`ws://${host}`,{headers:{Cookie:`eldoria_session=${otherToken}`,Origin:`http://${host}`}});
  let current:OnlineSnapshot|undefined;
  try{
   const a=await sdk.joinOrCreate('eldoria',{protocolVersion:PROTOCOL_VERSION,characterId:id});a.reconnection.enabled=false;let denied=false;a.onMessage<unknown>('exit-result',input=>{denied=!exitResultSchema.parse(input).allowed;});a.onMessage('snapshot',()=>{});a.onMessage('command-error',()=>{});
   await expect(sdk.joinOrCreate('eldoria',{protocolVersion:PROTOCOL_VERSION,characterId:id})).rejects.toThrow(/już w grze/);await expect(watcher.joinOrCreate('eldoria',{protocolVersion:PROTOCOL_VERSION,characterId:id})).rejects.toThrow(/nie należy/);
   const b=await watcher.joinOrCreate('eldoria',{protocolVersion:PROTOCOL_VERSION,characterId:otherId});b.reconnection.enabled=false;b.onMessage<unknown>('snapshot',input=>{current=onlinePacketSchema.parse(input).snapshot;});b.onMessage('command-error',()=>{});
   a.send('logout');await expect.poll(()=>denied).toBe(true);await expect.poll(()=>current?.players.some(p=>p.id===a.sessionId)).toBe(true);await a.leave();
   expect((await store.pool.query('SELECT lease_until FROM characters WHERE id=$1',[id])).rows[0]?.lease_until).not.toBeNull();await expect.poll(()=>current?.players.some(p=>p.id===a.sessionId),{timeout:5000}).toBe(false);
   await expect.poll(async()=>(await store.pool.query('SELECT lease_until FROM characters WHERE id=$1',[id])).rows[0]?.lease_until).toBeNull();await b.leave();
  }finally{await server.gracefullyShutdown(false);WorldRoom.accounts=undefined;vi.unstubAllGlobals();}
 },15000);
});
