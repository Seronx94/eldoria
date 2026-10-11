import {Room,type Client,ServerError} from '@colyseus/core';
import {importMap,rules,onlineRules} from '@eldoria/content';
import {SharedWorld,onlinePacketSchema} from '@eldoria/domain';
import {onlineJoinSchema,PROTOCOL_VERSION} from '@eldoria/protocol';
import {readFileSync} from 'node:fs';
import {CommandGate} from './command-gate';
const map=importMap(JSON.parse(readFileSync(new URL('../../client/public/assets/eldoria.json',import.meta.url),'utf8')));
export class WorldRoom extends Room {
 // Keep a single guest world; reject overflow instead of creating hidden shards.
 maxClients=Number.MAX_SAFE_INTEGER;
 maxMessagesPerSecond=120;
 private world=new SharedWorld([map],{now:()=>performance.now()});
 private gates=new Map<string,CommandGate>();
 onCreate():void {
  this.onMessage<unknown>('command',(client,input)=>{
   const result=this.gates.get(client.sessionId)?.accept(input,performance.now());
   if(!result)return;if('error'in result){client.send('command-error',result.error);return;}
   this.world.send(client.sessionId,result.command);
  });
  this.onMessage<unknown>('*',(client)=>{const result=this.gates.get(client.sessionId)?.accept(null,performance.now());if(result&&'error'in result)client.send('command-error',result.error);});
  this.setSimulationInterval(()=>this.world.tick(),rules.tickMs);
  this.clock.setInterval(()=>this.publish(),onlineRules.snapshotMs);
 }
 onJoin(client:Client,input:unknown):void {
  if(this.gates.size>=onlineRules.maxPlayers)throw new ServerError(503,'Sesja testowa jest pełna (8 graczy).');
  const parsed=onlineJoinSchema.safeParse(input);if(!parsed.success)throw new ServerError(400,'Nieprawidłowa wersja lub dane wejścia.');
  this.world.join(client.sessionId,parsed.data.name,parsed.data.profession);this.gates.set(client.sessionId,new CommandGate(performance.now()));this.publish();
 }
 onLeave(client:Client):void {this.gates.delete(client.sessionId);this.world.leave(client.sessionId);this.publish();}
 private publish():void {for(const client of this.clients){if(!this.gates.has(client.sessionId))continue;const packet=onlinePacketSchema.parse({protocolVersion:PROTOCOL_VERSION,snapshot:this.world.snapshot(client.sessionId)});client.send('snapshot',packet);}}
}
