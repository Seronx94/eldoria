import type {Request,Response} from 'express';
import {Server} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {onlineRules} from '@eldoria/content';
import {PROTOCOL_VERSION} from '@eldoria/protocol';
import {WorldRoom,worldMap} from './world-room';
import {Accounts} from './accounts';
import {installAuthApi} from './auth-api';
const port=Number(process.env.ELDORIA_SERVER_PORT??2567),host=process.env.ELDORIA_SERVER_HOST??'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Nieprawidłowy ELDORIA_SERVER_PORT');
if(!process.env.DATABASE_URL)throw new Error('Brak DATABASE_URL. Najpierw uruchom npm run db:up.');
const accounts=new Accounts(process.env.DATABASE_URL);await accounts.migrate();WorldRoom.accounts=accounts;
const server=new Server({greet:false,transport:new WebSocketTransport({maxPayload:onlineRules.maxMessageBytes}),express:app=>{
 app.get('/health',(_req:Request,res:Response)=>res.json({status:'ok',protocolVersion:PROTOCOL_VERSION,mode:'accounts'}));installAuthApi(app,accounts,worldMap);
}});
server.define('eldoria',WorldRoom);
server.onShutdown(()=>accounts.close());
await server.listen(port,host);
console.log(`Eldoria online: ${host}:${port} — konta i postacie PostgreSQL.`);
