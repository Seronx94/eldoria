import {items,type ItemId} from '@eldoria/content';
import type {Snapshot} from '@eldoria/domain';
import type {Command} from '@eldoria/protocol';
import {actionIcon} from './action-icons';
// Original equipment/material illustrations on the same 32-pixel grid as the action icons.
export function itemIcon(id:ItemId):string {
  if(id==='sword'||id==='bow'||id==='wand')return actionIcon('attack',id);
  if(id==='potion')return actionIcon('potion');
  const art=id==='tunic'?'<path fill="#13252e" d="M9 3h14l8 7-5 8-4-3v15H10V15l-4 3-5-8z"/><path fill="#669ac0" d="M10 5h12l6 6-3 4-5-3v15h-8V12l-5 3-3-4z"/><path fill="#d7bd72" d="M12 5h8v4h-8zm0 14h8v3h-8z"/>':id==='skin'?'<path fill="#3b2825" d="m5 3 7 4 4-3 4 3 7-4-2 10 4 9-8 2-5 7-5-7-8-2 4-9z"/><path fill="#b58f60" d="m8 7 8 3 8-3-3 8 4 5-7 2-2 5-2-5-7-2 4-5z"/><path fill="#e2cda4" d="M12 11h8v5h-8z"/>':'<path fill="#162823" d="m16 2 10 5 4 10-6 10-8 4-8-4-6-10L6 7z"/><path fill="#78a858" d="m16 5 8 4 3 8-5 8-6 3-6-3-5-8 3-8z"/><path fill="none" stroke="#355838" stroke-width="2" d="M16 5v23M6 15h20M9 22h14"/><path fill="#b6d57b" d="M10 9h4v4h-4z"/>';
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${art}</svg>`;
}
let selected:ItemId|undefined;
export function renderInventory(s:Snapshot,send:(command:Command)=>void):void {
  const equipment=document.querySelector<HTMLElement>('#equipment')!;
  equipment.replaceChildren();
  for(const slot of ['weapon','armor'] as const){
    const id=s.equipment[slot],button=document.createElement('button');button.className='equipment-slot';
    const label=document.createElement('span');label.textContent=`${slot==='weapon'?'Broń':'Pancerz'}: ${id?items[id].name:'brak'}`;
    const icon=document.createElement('span');icon.className='item-icon';if(id)icon.innerHTML=itemIcon(id);
    const hint=document.createElement('small');hint.textContent=id?'Zdejmij':'Pusty slot';button.disabled=!id;
    button.setAttribute('aria-label',`${label.textContent} · Zdejmij`);
    button.addEventListener('click',()=>send({type:'Unequip',slot}));button.append(icon,label,hint);equipment.append(button);
  }
  document.querySelector('#bag-gold')!.textContent=`${s.gold} złota · ${s.inventory.length}/20 pól · ${s.exp} EXP`;
  const slots=document.querySelector('#bag-slots')!;slots.replaceChildren();
  const details=document.querySelector('#item-details')!;
  const show=(id:ItemId|undefined)=>{
    selected=id;details.replaceChildren();
    for(const cell of slots.children)cell.classList.toggle('selected',id!==undefined&&(cell as HTMLElement).dataset.item===id);
    if(!id){details.textContent='Wybierz przedmiot, aby zobaczyć opis i dostępne akcje.';return;}
    const name=document.createElement('strong');name.textContent=items[id].name;
    const description=document.createElement('p');description.textContent=items[id].slot?`Wyposażenie · ${items[id].slot==='weapon'?'broń swojej profesji':'pancerz'}`:id==='potion'?'Przywraca zdrowie. Możesz też przypisać ją do przycisku akcji.':'Materiał z potworów — sprzedaj u Borina w mieście.';
    details.append(name,description);
    if(items[id].slot||id==='potion'){
      const action=document.createElement('button');action.textContent=id==='potion'?'Użyj mikstury':'Załóż';
      // Combat items still use the same validated domain command, including dialogue/cooldown checks.
      action.addEventListener('click',()=>{
        if(id==='potion')send({type:'UseItem'});
        else if(id==='sword'||id==='bow'||id==='wand'||id==='tunic')send({type:'Equip',itemId:id});
      });details.append(action);
    }
  };
  const view=document.querySelector<HTMLSelectElement>('#bag-view')!.value;
  const visible=s.inventory.filter(stack=>view==='all'||(stack.bag??'main')===view);
  for(let i=0;i<20;i++){
    const stack=visible[i],cell=document.createElement('button');cell.className='bag-slot';
    cell.disabled=!stack;cell.setAttribute('aria-label',stack?`${items[stack.itemId].name} ×${stack.quantity}`:`Puste pole ${i+1}`);
    if(stack){
      cell.dataset.item=stack.itemId;cell.title=`${items[stack.itemId].name} ×${stack.quantity} · ${stack.bag==='materials'?'Materiały':stack.bag==='supplies'?'Zapasy':'Główny'}`;
      const icon=document.createElement('span');icon.className='item-icon';icon.innerHTML=itemIcon(stack.itemId);
      const count=document.createElement('small');count.className='item-count';count.textContent=String(stack.quantity);
      const text=document.createElement('span');text.className='item-accessible';text.textContent=items[stack.itemId].name;
      cell.append(icon,count,text);cell.addEventListener('click',()=>show(stack.itemId));
    }
    slots.append(cell);
  }
  show(s.inventory.some(stack=>stack.itemId===selected)?selected:undefined);
}
