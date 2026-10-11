import {randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const cwd=resolve(import.meta.dirname,'..'),directory=resolve(cwd,'.eldoria-local'),file=resolve(directory,'server.env');
if(spawnSync('docker',['info'],{stdio:'ignore'}).status!==0){console.error('Uruchom Docker Desktop i spróbuj ponownie.');process.exit(1);}
if(!existsSync(file)&&spawnSync('docker',['volume','inspect','eldoria-local_postgres'],{stdio:'ignore'}).status===0){console.error('Baza już istnieje. Skopiuj folder .eldoria-local z poprzedniego katalogu gry; dane nie zostały usunięte.');process.exit(1);}
mkdirSync(directory,{recursive:true,mode:0o700});
if(!existsSync(file)){
 const password=randomBytes(32).toString('hex');
 writeFileSync(file,`ELDORIA_DB_PASSWORD=${password}\nDATABASE_URL=postgresql://eldoria:${password}@127.0.0.1:54329/eldoria\n`,{mode:0o600,flag:'wx'});
}
const values=Object.fromEntries(readFileSync(file,'utf8').trim().split('\n').map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)];}));
const down=process.argv[2]==='down';
const child=spawn('docker',['compose',...(down?['stop','db']:['up','-d','--wait','db'])],{cwd,env:{...values,...process.env},stdio:'inherit'});
child.on('error',()=>{console.error('Uruchom Docker Desktop i spróbuj ponownie.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;if(code===0)console.log(down?'Baza zatrzymana; dane zachowane.':'PostgreSQL gotowy. Uruchom npm run dev:online.');});
