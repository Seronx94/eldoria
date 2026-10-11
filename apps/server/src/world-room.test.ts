import {it,expect} from 'vitest';
import {createServer} from 'node:http';
import {Server} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import {onlinePacketSchema,type OnlineSnapshot} from '@eldoria/domain';
import {onlineRules} from '@eldoria/content';
import {WorldRoom} from './world-room';

it('real sockets share one world, reject forged/replayed commands, enforce capacity and remove departed actors',async()=>{
 const http=createServer(),server=new Server({greet:false,gracefullyShutdown:false,transport:new WebSocketTransport({server:http,maxPayload:onlineRules.maxMessageBytes})});
 server.define('eldoria',WorldRoom);await server.listen(0,'127.0.0.1');
 const address=http.address();if(!address||typeof address==='string')throw new Error('Missing TCP port');
 const sdk=new Client(`ws://127.0.0.1:${address.port}`),rooms:Room[]=[],states=new Map<string,OnlineSnapshot>(),errors:string[]=[];
 async function join(name:string){const room=await sdk.joinOrCreate('eldoria',{protocolVersion:1,name,profession:'mage'});room.reconnection.enabled=false;rooms.push(room);room.onMessage<unknown>('snapshot',data=>states.set(room.sessionId,onlinePacketSchema.parse(data).snapshot));room.onMessage<string>('command-error',error=>errors.push(error));return room;}
 try{
  const a=await join('Alice'),b=await join('Bobby');expect(a.roomId).toBe(b.roomId);
  await expect.poll(()=>states.get(a.sessionId)?.players.length).toBe(1);
  const original=states.get(a.sessionId)!;
  expect(original.players[0]).not.toHaveProperty('mana');expect(original.players[0]).not.toHaveProperty('inventory');expect(original.players[0]).not.toHaveProperty('stash');
  a.send('command',{sequence:1,command:{type:'Move',direction:'left',x:1,y:1,gold:9999}});
  await expect.poll(()=>errors.length).toBe(1);expect(states.get(a.sessionId)!.player).toEqual(original.player);
  a.send('command',{sequence:2,command:{type:'Move',direction:'left'}});
  await expect.poll(()=>states.get(b.sessionId)?.players.find(p=>p.id===a.sessionId)?.player.x).toBe(original.player.x-1);
  a.send('command',{sequence:2,command:{type:'Move',direction:'left'}});
  await expect.poll(()=>errors.length).toBe(2);expect(states.get(a.sessionId)!.player).toEqual({x:original.player.x-1,y:original.player.y});expect(states.get(a.sessionId)!.gold).toBe(0);
  for(let sequence=3;sequence<63;sequence++)a.send('command',{sequence,command:{type:'Attack'}});
  await expect.poll(()=>errors.some(e=>e.includes('Za dużo'))).toBe(true);expect(states.get(a.sessionId)!.gold).toBe(0);expect(states.get(a.sessionId)!.hp).toBe(100);
  await expect(sdk.joinOrCreate('eldoria',{protocolVersion:1,name:'Forged',profession:'knight',hp:999,gold:999})).rejects.toThrow();
  for(let i=0;i<6;i++)expect((await join(`Guest${i}`)).roomId).toBe(a.roomId);
  await expect(sdk.joinOrCreate('eldoria',{protocolVersion:1,name:'Overflow',profession:'archer'})).rejects.toThrow(/pełna/);
  await b.leave();await expect.poll(()=>states.get(a.sessionId)?.players.some(p=>p.id===b.sessionId)).toBe(false);
  const rejoined=await join('Bobby');await expect.poll(()=>states.get(rejoined.sessionId)?.gold).toBe(0);expect(states.get(rejoined.sessionId)).toMatchObject({level:1,exp:0,stash:[]});
 }finally{await Promise.allSettled(rooms.filter(r=>r.connection.isOpen).map(r=>r.leave()));await server.gracefullyShutdown(false);}
},30000);
