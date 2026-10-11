import {json,type Application,type Request,type Response,type NextFunction} from 'express';
import {credentialsSchema,createCharacterSchema} from '@eldoria/protocol';
import {Simulation} from '@eldoria/domain';
import type {WorldMap} from '@eldoria/content';
import {Accounts,AccountError,cookieName,cookieToken} from './accounts';
export function sameOrigin(origin:string|undefined,host:string|undefined):boolean {try{return !!origin&&new URL(origin).host===host;}catch{return false;}}
export function installAuthApi(app:Application,accounts:Accounts,map:WorldMap):void {
 app.use('/api',json({limit:'8kb'}));
 app.use('/api',(req:Request,res:Response,next:NextFunction)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'&&!sameOrigin(req.headers.origin,req.headers.host)){res.status(403).json({error:'Niedozwolone pochodzenie żądania.'});return;}next();
 });
 const attempts=new Map<string,{count:number;until:number}>();
 function limited(req:Request,res:Response):boolean {
  const now=Date.now(),key=req.ip??'unknown';let entry=attempts.get(key);
  if(!entry||entry.until<=now){for(const [id,value]of attempts)if(value.until<=now)attempts.delete(id);if(attempts.size>=5000){res.status(429).json({error:'Spróbuj za minutę.'});return true;}entry={count:0,until:now+60000};attempts.set(key,entry);}
  if(++entry.count>20){res.status(429).json({error:'Za dużo prób. Spróbuj za minutę.'});return true;}return false;
 }
 const setCookie=(req:Request,res:Response,token:string)=>res.cookie(cookieName,token,{httpOnly:true,sameSite:'strict',secure:req.secure||process.env.ELDORIA_SECURE_COOKIE==='1',path:'/',maxAge:7*86400000});
 for(const action of ['register','login'] as const)app.post(`/api/auth/${action}`,async(req,res)=>{
  if(limited(req,res))return;const data=credentialsSchema.safeParse(req.body);if(!data.success){res.status(400).json({error:'Podaj poprawny email i hasło o długości 10–128 znaków.'});return;}
  const token=await accounts[action](data.data.email,data.data.password);setCookie(req,res,token);res.status(action==='register'?201:200).json(await accounts.view(await accounts.authenticate(token)));
 });
 app.get('/api/auth/me',async(req,res)=>{try{res.json(await accounts.view(await accounts.authenticate(cookieToken(req.headers.cookie))));}catch(error){if(error instanceof AccountError&&error.status===401){res.json({account:null,characters:[]});return;}throw error;}});
 app.post('/api/auth/activity',async(req,res)=>{await accounts.touch(await accounts.authenticate(cookieToken(req.headers.cookie)));res.sendStatus(204);});
 app.post('/api/auth/logout',async(req,res)=>{await accounts.revoke(await accounts.authenticate(cookieToken(req.headers.cookie)));res.clearCookie(cookieName,{path:'/',httpOnly:true,sameSite:'strict'});res.sendStatus(204);});
 app.post('/api/characters',async(req,res)=>{
  const identity=await accounts.authenticate(cookieToken(req.headers.cookie)),data=createCharacterSchema.safeParse(req.body);
  if(!data.success){res.status(400).json({error:'Nazwa: 3–16 liter, cyfr, spacji, _ lub -. Wybierz profesję.'});return;}
  const progress=new Simulation([map],data.data.name,{now:()=>0},undefined,undefined,data.data.profession).exportProgress();await accounts.create(identity,progress);await accounts.touch(identity);res.status(201).json(await accounts.view(identity));
 });
 app.use('/api',(error:unknown,_req:Request,res:Response,next:NextFunction)=>{
  void next; // Express identifies error middleware by its four-argument signature.
  if(error instanceof AccountError){res.status(error.status).json({error:error.message});return;}
  if(error instanceof SyntaxError||(error as {type?:string})?.type==='entity.too.large'){res.status(400).json({error:'Nieprawidłowe żądanie.'});return;}
  console.error('Błąd obsługi konta.');res.status(503).json({error:'Usługa kont jest chwilowo niedostępna.'});
 });
}
