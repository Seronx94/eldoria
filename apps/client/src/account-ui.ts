import {authStateSchema,accountViewSchema,type AccountView} from '@eldoria/protocol';
function node<T extends HTMLElement>(id:string):T {const element=document.querySelector<T>(id);if(!element)throw new Error(`Brak ${id}`);return element;}
export class AccountUI {
 private view?:AccountView;
 private lastActivity=0;
 private generation=0;
 constructor(private enter:(id:string)=>void,private leave:()=>Promise<boolean>,private expired:(message:string)=>void){
  node<HTMLFormElement>('#auth-form').addEventListener('submit',event=>{event.preventDefault();const action=(event.submitter as HTMLButtonElement|null)?.value==='register'?'register':'login';void this.authenticate(action);});
  node<HTMLFormElement>('#character-form').addEventListener('submit',event=>{event.preventDefault();void this.create();});
  node('#logout-account').addEventListener('click',()=>{void this.logout();});
  for(const event of ['pointerdown','pointermove','keydown'] as const)window.addEventListener(event,e=>{if(e.isTrusted)this.activity();},{passive:true});
  setInterval(()=>{if(this.view)void this.refresh();},30000);
  void this.refresh();
 }
 character(name:string):string|undefined {return this.view?.characters.find(c=>c.name===name)?.id;}
 private async request(path:string,body?:unknown):Promise<unknown> {
  const response=await fetch(`/api/${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  if(response.status===204)return null;const data:unknown=await response.json();
  if(!response.ok){const message=typeof data==='object'&&data!==null&&'error'in data&&typeof data.error==='string'?data.error:'Usługa kont jest niedostępna.';throw new Error(message);}return data;
 }
 async refresh():Promise<void> {const generation=this.generation;try{const result=authStateSchema.parse(await this.request('auth/me'));if(generation!==this.generation)return;const hadAccount=!!this.view;this.view=result.account?result as AccountView:undefined;this.render();if(hadAccount&&!this.view)this.expired('Wylogowano po 15 minutach bezczynności lub wygaśnięciu sesji.');}catch{if(generation===this.generation)node('#auth-status').textContent='Konta wymagają działającego serwera online. Offline jest dostępne poniżej.';}}
 private async authenticate(action:'register'|'login'):Promise<void> {
  this.generation++;this.busy(true);try{this.view=accountViewSchema.parse(await this.request(`auth/${action}`,{email:node<HTMLInputElement>('#account-email').value.trim(),password:node<HTMLInputElement>('#account-password').value}));node<HTMLInputElement>('#account-password').value='';node('#auth-status').textContent=action==='register'?'Konto utworzone. Stwórz pierwszą postać.':'Zalogowano. Wybierz postać.';this.render();}catch(error){this.error(error);}finally{this.busy(false);}
 }
 private async create():Promise<void> {this.generation++;this.busy(true);try{this.view=accountViewSchema.parse(await this.request('characters',{name:node<HTMLInputElement>('#character-name').value.trim(),profession:node<HTMLSelectElement>('#character-profession').value}));node<HTMLInputElement>('#character-name').value='';node('#auth-status').textContent='Postać utworzona. Wybierz Graj.';this.render();}catch(error){this.error(error);}finally{this.busy(false);}}
 async logout():Promise<void> {if(!await this.leave())return;this.generation++;try{await this.request('auth/logout',{});this.view=undefined;this.render();node('#auth-status').textContent='Wylogowano konto.';}catch(error){this.error(error);}}
 private activity():void {if(!this.view||Date.now()-this.lastActivity<10000)return;this.lastActivity=Date.now();void this.request('auth/activity',{}).catch(()=>{void this.refresh();});}
 private error(error:unknown):void {node('#auth-status').textContent=error instanceof Error?error.message:'Nie udało się wykonać operacji.';}
 private busy(value:boolean):void {for(const button of node('#account-panel').querySelectorAll<HTMLButtonElement>('form button'))button.disabled=value;if(!value&&this.view)node<HTMLButtonElement>('#create-character').disabled=this.view.characters.length>=this.view.account.characterLimit;}
 private render():void {
  node('#auth-form').hidden=!!this.view;node('#account-characters').hidden=!this.view;
  if(!this.view)return;node('#account-summary').textContent=`${this.view.account.email} · ${this.view.account.tier==='free'?'konto bezpłatne':'konto premium'} · postacie ${this.view.characters.length}/${this.view.account.characterLimit}`;
  const list=node('#character-list');list.replaceChildren();for(const c of this.view.characters){const button=document.createElement('button');button.type='button';button.className='character-card';button.textContent=`Graj: ${c.name} · ${c.profession==='mage'?'Mag':c.profession==='archer'?'Archer':'Knight'} · lvl: ${c.level}`;button.dataset.characterId=c.id;button.addEventListener('click',()=>this.enter(c.id));list.append(button);}
  node<HTMLButtonElement>('#create-character').disabled=this.view.characters.length>=this.view.account.characterLimit;
 }
}
