import {Pool} from 'pg';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {characterProgressSchema,type CharacterProgress} from '@eldoria/domain';
import {accountViewSchema,type AccountView} from '@eldoria/protocol';
import {combatRules} from '@eldoria/content';
import {hashPassword,verifyPassword} from './password';
export class AccountError extends Error {constructor(public status:number,message:string){super(message);}}
export interface Identity {accountId:string;tokenHash:string;idleUntil:number;expiresAt:number;}
interface AccountRow {id:string;email:string;tier:'free'|'premium';password_hash:string;}
interface CharacterRow {id:string;name:string;profession:'knight'|'archer'|'mage';progress:unknown;}
const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export const cookieName='eldoria_session';
export function cookieToken(cookie:string|undefined):string|undefined {return cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);}
/** PostgreSQL owns limits, leases and sessions; neither UI nor join options grant entitlement. */
export class Accounts {
 readonly pool:Pool;
 private dummyHash='';
 constructor(url:string,private now:()=>number=Date.now){this.pool=new Pool({connectionString:url,max:12,connectionTimeoutMillis:5000,query_timeout:5000});this.pool.on('error',()=>console.error('Utracono połączenie z PostgreSQL. Sprawdź bazę danych.'));}
 async migrate():Promise<void> {
  const client=await this.pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(739204)');await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
   if(!(await client.query('SELECT 1 FROM schema_migrations WHERE version=1')).rowCount){await client.query(await readFile(new URL('../migrations/001_accounts.sql',import.meta.url),'utf8'));await client.query('INSERT INTO schema_migrations(version) VALUES(1)');}
   await client.query('COMMIT');this.dummyHash=await hashPassword(randomBytes(32).toString('hex'));
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async register(email:string,password:string):Promise<string> {
  const hash=await hashPassword(password),id=randomUUID();
  try{await this.pool.query('INSERT INTO accounts(id,email,password_hash) VALUES($1,$2,$3)',[id,email,hash]);}catch(error){if((error as {code?:string}).code==='23505')throw new AccountError(409,'Nie można utworzyć konta z tym adresem.');throw error;}
  return this.newSession(id);
 }
 async login(email:string,password:string):Promise<string> {
  const account=(await this.pool.query<AccountRow>('SELECT * FROM accounts WHERE email=$1',[email])).rows[0];
  const correct=await verifyPassword(password,account?.password_hash??this.dummyHash);
  if(!account||!correct)throw new AccountError(401,'Nieprawidłowy email lub hasło.');return this.newSession(account.id);
 }
 private async newSession(accountId:string):Promise<string> {
  const token=randomBytes(32).toString('hex'),now=this.now();
  await this.pool.query('INSERT INTO sessions(token_hash,account_id,last_activity,expires_at) VALUES($1,$2,$3,$4)',[tokenHash(token),accountId,new Date(now),new Date(now+7*86400000)]);return token;
 }
 async authenticate(token:string|undefined):Promise<Identity> {
  if(!token||!/^[a-f0-9]{64}$/.test(token))throw new AccountError(401,'Zaloguj się na konto.');return this.checkSession(tokenHash(token));
 }
 async checkSession(hash:string):Promise<Identity> {
  const row=(await this.pool.query<{account_id:string;last_activity:Date;expires_at:Date}>('SELECT account_id,last_activity,expires_at FROM sessions WHERE token_hash=$1',[hash])).rows[0],now=this.now();
  if(!row||row.expires_at.getTime()<=now||row.last_activity.getTime()+combatRules.idleMs<=now)throw new AccountError(401,'Wylogowano po bezczynności lub wygaśnięciu sesji.');
  return {accountId:row.account_id,tokenHash:hash,idleUntil:row.last_activity.getTime()+combatRules.idleMs,expiresAt:row.expires_at.getTime()};
 }
 async touch(identity:Identity):Promise<void> {await this.pool.query('UPDATE sessions SET last_activity=$2 WHERE token_hash=$1 AND expires_at>$2',[identity.tokenHash,new Date(this.now())]);}
 async revoke(identity:Identity):Promise<void> {
  const active=await this.pool.query('SELECT 1 FROM characters WHERE lease_session=$1 AND lease_until>$2',[identity.tokenHash,new Date(this.now())]);
  if(active.rowCount)throw new AccountError(409,'Najpierw bezpiecznie opuść postać. Wylogowanie podczas walki jest zablokowane.');
  await this.pool.query('DELETE FROM sessions WHERE token_hash=$1',[identity.tokenHash]);
 }
 async view(identity:Identity):Promise<AccountView> {
  const account=(await this.pool.query<AccountRow>('SELECT id,email,tier FROM accounts WHERE id=$1',[identity.accountId])).rows[0];if(!account)throw new AccountError(401,'Brak konta.');
  const rows=(await this.pool.query<CharacterRow>('SELECT id,name,profession,progress FROM characters WHERE account_id=$1 ORDER BY updated_at DESC,id',[account.id])).rows;
  return accountViewSchema.parse({account:{id:account.id,email:account.email,tier:account.tier,characterLimit:account.tier==='premium'?5:3},characters:rows.map(row=>({id:row.id,name:row.name,profession:row.profession,level:characterProgressSchema.parse(row.progress).level}))});
 }
 async create(identity:Identity,progress:CharacterProgress):Promise<void> {
  const client=await this.pool.connect();try{
   await client.query('BEGIN');const account=(await client.query<AccountRow>('SELECT tier FROM accounts WHERE id=$1 FOR UPDATE',[identity.accountId])).rows[0];if(!account)throw new AccountError(401,'Brak konta.');
   const count=Number((await client.query<{count:string}>('SELECT count(*) FROM characters WHERE account_id=$1',[identity.accountId])).rows[0]!.count);
   if(count>=(account.tier==='premium'?5:3))throw new AccountError(409,'Osiągnięto limit postaci na koncie.');
   await client.query('INSERT INTO characters(id,account_id,name,profession,progress) VALUES($1,$2,$3,$4,$5)',[randomUUID(),identity.accountId,progress.name,progress.profession,JSON.stringify(characterProgressSchema.parse(progress))]);await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');if((error as {code?:string}).code==='23505')throw new AccountError(409,'Ta nazwa postaci jest już zajęta.');throw error;}finally{client.release();}
 }
 async claim(identity:Identity,id:string):Promise<{progress:CharacterProgress;leaseId:string}> {
  const leaseId=randomUUID();
  const row=(await this.pool.query<CharacterRow>('UPDATE characters SET lease_owner=$3,lease_session=$4,lease_until=$5 WHERE id=$1 AND account_id=$2 AND (lease_until IS NULL OR lease_until<=$6) RETURNING id,name,profession,progress',[id,identity.accountId,leaseId,identity.tokenHash,new Date(this.now()+120000),new Date(this.now())])).rows[0];
  if(!row)throw new AccountError(409,'Postać nie należy do konta albo jest już w grze.');return {progress:characterProgressSchema.parse(row.progress),leaseId};
 }
 async checkpoint(id:string,leaseId:string,progress:CharacterProgress,release=false):Promise<void> {
  const result=await this.pool.query('UPDATE characters SET progress=$3,updated_at=$4,lease_until=$5,lease_owner=CASE WHEN $6 THEN NULL ELSE lease_owner END,lease_session=CASE WHEN $6 THEN NULL ELSE lease_session END WHERE id=$1 AND lease_owner=$2 AND lease_until>$4',[id,leaseId,JSON.stringify(characterProgressSchema.parse(progress)),new Date(this.now()),release?null:new Date(this.now()+120000),release]);
  if(result.rowCount!==1)throw new Error('Utracono wyłączność zapisu postaci');
 }
 async abandonClaim(id:string,leaseId:string):Promise<void> {await this.pool.query('UPDATE characters SET lease_owner=NULL,lease_session=NULL,lease_until=NULL WHERE id=$1 AND lease_owner=$2',[id,leaseId]);}
 async close():Promise<void> {await this.pool.end();}
}
