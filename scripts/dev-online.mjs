import {setTimeout as delay} from 'node:timers/promises';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {networkInterfaces} from 'node:os';
const require=createRequire(import.meta.url),cwd=resolve(import.meta.dirname,'..');
const vite=resolve(dirname(require.resolve('vite/package.json')),'bin/vite.js');
const children=[];let stopping=false;
function stop(code){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
function run(args){const child=spawn(process.execPath,args,{cwd,stdio:'inherit',env:{...process.env,ELDORIA_PROXY_TARGET:process.env.ELDORIA_PROXY_TARGET??`http://127.0.0.1:${process.env.ELDORIA_SERVER_PORT??'2567'}`}});children.push(child);child.on('error',error=>{console.error(error.message);stop(1);});child.on('exit',code=>{if(!stopping)stop(code??1);});return child;}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop(0));
run(['--env-file-if-exists=.eldoria-local/server.env','--import','tsx','apps/server/src/main.ts']);
const port=process.env.ELDORIA_SERVER_PORT??'2567';
let ready=false;
for(let attempt=0;attempt<50&&!stopping;attempt++){
 try{const response=await globalThis.fetch(`http://127.0.0.1:${port}/health`,{signal:globalThis.AbortSignal.timeout(1000)});const body=await response.json();if(response.ok&&body.protocolVersion===3&&body.mode==='accounts'){ready=true;break;}}catch{/* Server still starting. */}
 await delay(100);
}
if(ready&&!stopping){
 console.log('Online: załóż konto lub zaloguj się, a potem wybierz postać.');
 for(const group of Object.values(networkInterfaces()))for(const address of group??[])if(address.family==='IPv4'&&!address.internal)console.log(`Telefon w tej samej sieci (po uruchomieniu Vite): http://${address.address}:5173`);
 run([vite,'--config','apps/client/vite.config.ts','--host','0.0.0.0','--port','5173','--strictPort']);
}else if(!stopping){console.error('Serwer online nie osiągnął gotowości.');stop(1);}
