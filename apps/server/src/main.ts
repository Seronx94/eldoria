import type {Request,Response} from 'express';
import {Server} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {onlineRules} from '@eldoria/content';
import {PROTOCOL_VERSION} from '@eldoria/protocol';
import {WorldRoom} from './world-room';
const port=Number(process.env.ELDORIA_SERVER_PORT??2567),host=process.env.ELDORIA_SERVER_HOST??'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Nieprawidłowy ELDORIA_SERVER_PORT');
const server=new Server({greet:false,transport:new WebSocketTransport({maxPayload:onlineRules.maxMessageBytes}),express:app=>{
 app.get('/health',(_req:Request,res:Response)=>res.json({status:'ok',protocolVersion:PROTOCOL_VERSION,mode:'guest-test'}));
}});
server.define('eldoria',WorldRoom);
await server.listen(port,host);
console.log(`Eldoria online T12: ${host}:${port} — sesja testowa bez trwałego zapisu.`);
