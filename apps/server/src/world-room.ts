import {Room,type Client,type AuthContext,ServerError} from '@colyseus/core';
import {importMap,rules,onlineRules,combatRules} from '@eldoria/content';
import {SharedWorld,onlinePacketSchema,type CharacterProgress} from '@eldoria/domain';
import {onlineJoinSchema,guestJoinSchema,PROTOCOL_VERSION} from '@eldoria/protocol';
import {readFileSync} from 'node:fs';
import {CommandGate} from './command-gate';
import {Accounts,AccountError,cookieToken,type Identity} from './accounts';
import {sameOrigin} from './auth-api';
export const worldMap=importMap(JSON.parse(readFileSync(new URL('../../client/public/assets/eldoria.json',import.meta.url),'utf8')));
interface Actor {characterId:string;leaseId:string;removed:boolean;finalData?:CharacterProgress;identity:Identity;connected:boolean;closing:boolean;expired:boolean;failed:boolean;write:Promise<void>;lastTouch:number;checking:boolean;}
export class WorldRoom extends Room {
 static accounts:Accounts|undefined;
 protected guests=false;
 maxClients=Number.MAX_SAFE_INTEGER;
 maxMessagesPerSecond=120;
 private world=new SharedWorld([worldMap],{now:()=>performance.now()});
 private gates=new Map<string,CommandGate>();
 private actors=new Map<string,Actor>();
 async onAuth(_client:Client,input:unknown,context:AuthContext):Promise<Identity|boolean> {
  if(this.guests){if(!guestJoinSchema.safeParse(input).success)throw new ServerError(400,'Nieprawidłowe dane.');return true;}
  if(!WorldRoom.accounts)throw new ServerError(503,'Baza kont niedostępna.');
  if(!onlineJoinSchema.safeParse(input).success)throw new ServerError(400,'Wybierz postać z konta.');
  if(!sameOrigin(context.headers.get('origin')??undefined,context.headers.get('host')??undefined))throw new ServerError(403,'Niedozwolone pochodzenie.');
  try{return await WorldRoom.accounts.authenticate(cookieToken(context.headers.get('cookie')??undefined));}catch(error){throw new ServerError(error instanceof AccountError?error.status:503,error instanceof AccountError?error.message:'Usługa kont niedostępna.');}
 }
 onCreate():void {
  if(!this.guests)this.autoDispose=false;
  this.onMessage<unknown>('command',(client,input)=>{
   const actor=this.actors.get(client.sessionId);if(actor&&(actor.closing||actor.expired||actor.failed))return;
   const result=this.gates.get(client.sessionId)?.accept(input,performance.now());
   if(!result)return;if('error'in result){client.send('command-error',result.error);return;}
   if(actor&&(Date.now()>=actor.identity.idleUntil||Date.now()>=actor.identity.expiresAt)){this.expire(client.sessionId,actor);return;}
   this.world.send(client.sessionId,result.command);if(actor){actor.identity.idleUntil=Date.now()+combatRules.idleMs;this.touch(actor,client);}
  });
  this.onMessage('logout',client=>{void this.logout(client);});
  this.onMessage<unknown>('*',client=>{const result=this.gates.get(client.sessionId)?.accept(null,performance.now());if(result&&'error'in result)client.send('command-error',result.error);});
  this.setSimulationInterval(()=>{this.world.tick();for(const [id,actor]of this.actors)if(!actor.removed&&!actor.connected&&!actor.closing&&this.world.snapshot(id).combatMs===0)void this.finish(id,actor).catch(()=>{});},rules.tickMs);
  this.clock.setInterval(()=>this.publish(),onlineRules.snapshotMs);
  this.clock.setInterval(()=>{for(const [id,actor]of this.actors){if(actor.closing)continue;if(actor.removed){void this.finish(id,actor).catch(()=>{});continue;}this.persist(id,actor);this.checkSession(id,actor);}},5000);
 }
 async onJoin(client:Client,input:unknown):Promise<void> {
  if(this.gates.size>=onlineRules.maxPlayers)throw new ServerError(503,'Sesja jest pełna (8 graczy).');
  if(this.guests){const data=guestJoinSchema.parse(input);this.world.join(client.sessionId,data.name,data.profession);}
  else {
   const data=onlineJoinSchema.parse(input),identity=client.auth as Identity,store=WorldRoom.accounts!;
   const {progress,leaseId}=await store.claim(identity,data.characterId);
   // Capacity may change while PostgreSQL is acquiring the lease.
   if(this.gates.size>=onlineRules.maxPlayers){await store.abandonClaim(data.characterId,leaseId);throw new ServerError(503,'Sesja jest pełna (8 graczy).');}
   try{this.world.join(client.sessionId,progress.name,progress.profession,progress);}catch(error){await store.abandonClaim(data.characterId,leaseId);throw error;}
   const actor:Actor={characterId:data.characterId,leaseId,removed:false,identity,connected:true,closing:false,expired:false,failed:false,write:Promise.resolve(),lastTouch:0,checking:false};this.actors.set(client.sessionId,actor);this.touch(actor,client);
  }
  this.gates.set(client.sessionId,new CommandGate(performance.now()));this.publish();
 }
 onLeave(client:Client):void {
  const actor=this.actors.get(client.sessionId);
  if(actor){actor.connected=false;if(actor.removed||this.world.snapshot(client.sessionId).combatMs===0)void this.finish(client.sessionId,actor).catch(()=>{});}
  else{this.gates.delete(client.sessionId);this.world.leave(client.sessionId);this.publish();}
 }
 private touch(actor:Actor,client:Client):void {
  if(Date.now()-actor.lastTouch<10000)return;actor.lastTouch=Date.now();void WorldRoom.accounts!.touch(actor.identity).catch(()=>{actor.failed=true;client.send('command-error','Błąd bazy. Akcje wstrzymane.');});
 }
 private checkSession(id:string,actor:Actor):void {
  if(actor.checking||actor.expired)return;actor.checking=true;
  void WorldRoom.accounts!.checkSession(actor.identity.tokenHash).then(identity=>{
   actor.identity.idleUntil=Math.max(actor.identity.idleUntil,identity.idleUntil);
   if(Date.now()<actor.identity.idleUntil&&Date.now()<identity.expiresAt)return;this.expire(id,actor);
  }).catch(error=>{if(error instanceof AccountError)this.expire(id,actor);else{actor.failed=true;this.clients.find(c=>c.sessionId===id)?.send('command-error','Baza niedostępna. Akcje wstrzymane.');}}).finally(()=>{actor.checking=false;});
 }
 private expire(id:string,actor:Actor):void {actor.expired=true;const client=this.clients.find(c=>c.sessionId===id);client?.send('session-ended','Wylogowano po 15 minutach bezczynności lub wygaśnięciu sesji.');if(client)void client.leave();else if(this.world.snapshot(id).combatMs===0)void this.finish(id,actor).catch(()=>{});}
 private persist(id:string,actor:Actor,release=false,progress?:CharacterProgress):Promise<void> {
  const data=progress??this.world.progress(id);
  actor.write=actor.write.catch(()=>{}).then(()=>WorldRoom.accounts!.checkpoint(actor.characterId,actor.leaseId,data,release));
  void actor.write.catch(()=>{actor.failed=true;this.clients.find(c=>c.sessionId===id)?.send('command-error','Nie udało się zapisać postaci. Akcje wstrzymane; nie zamykaj gry.');});return actor.write;
 }
 private async finish(id:string,actor:Actor):Promise<void> {
  if(actor.closing)return actor.write;actor.closing=true;const data=actor.finalData??this.world.progress(id);actor.finalData=data;actor.removed=true;this.world.leave(id);this.gates.delete(id);this.publish();
  try{await this.persist(id,actor,true,data);this.actors.delete(id);}catch(error){actor.closing=false;throw error;}
 }
 private async logout(client:Client):Promise<void> {
  const actor=this.actors.get(client.sessionId);if(!actor&&!this.gates.has(client.sessionId))return;
  if(!actor?.removed&&this.world.snapshot(client.sessionId).combatMs>0){client.send('exit-result',{allowed:false,reason:'Nie możesz wylogować się podczas walki. Poczekaj 60 sekund od ostatniego trafienia.'});return;}
  try{if(actor)await this.finish(client.sessionId,actor);else{this.world.leave(client.sessionId);this.gates.delete(client.sessionId);}client.send('exit-result',{allowed:true,reason:'Zapisano postać.'});}catch{client.send('exit-result',{allowed:false,reason:'Zapis niedostępny. Nie zamykaj gry; spróbuj ponownie.'});}
 }
 async onDispose():Promise<void> {await Promise.allSettled([...this.actors].filter(([,a])=>!a.closing).map(([id,actor])=>this.finish(id,actor)));}
 private publish():void {for(const client of this.clients){if(!this.gates.has(client.sessionId))continue;const packet=onlinePacketSchema.parse({protocolVersion:PROTOCOL_VERSION,snapshot:this.world.snapshot(client.sessionId)});client.send('snapshot',packet);}}
}
/** Explicit isolated fixture; never registered by the application server. */
export class GuestTestRoom extends WorldRoom {protected guests=true;}
