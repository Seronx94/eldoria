import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
let active=0;const waiters:(()=>void)[]=[];
async function acquire():Promise<void> {if(active<2){active++;return;}if(waiters.length>=32)throw new Error('Usługa haseł zajęta.');await new Promise<void>(resolve=>waiters.push(resolve));}
function release():void {const next=waiters.shift();if(next)next();else active--;}
async function derive(password:string,salt:string,N:number):Promise<Buffer> {
 await acquire();try{return await new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N,r:8,p:1,maxmem:256*1024*1024},(error,key)=>error?reject(error):resolve(key)));}finally{release();}
}
export async function hashPassword(password:string):Promise<string> {const salt=randomBytes(16).toString('hex');return `scrypt-131072:${salt}:${(await derive(password,salt,131072)).toString('hex')}`;}
export async function verifyPassword(password:string,hash:string):Promise<boolean> {const [format,salt,key]=hash.split(':'),N=format==='scrypt-131072'?131072:format==='scrypt'?32768:0;if(!N||!salt||!key||!/^[a-f0-9]{128}$/.test(key))return false;return timingSafeEqual(await derive(password,salt,N),Buffer.from(key,'hex'));}
