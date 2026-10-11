import {items,type ItemId,depotRules,depotAtStand} from '@eldoria/content';
import type {Snapshot} from '@eldoria/domain';
import type {Command} from '@eldoria/protocol';
import {itemIcon} from './inventory-view';
export class DepotView {
  private signature='';
  constructor(private dialog:HTMLDialogElement,private send:(c:Command)=>void){
    dialog.querySelector('#close-depot')!.addEventListener('click',()=>send({type:'CloseDepot'}));
    dialog.querySelector('#locker-stash')!.addEventListener('click',()=>dialog.querySelector('#stash-items')!.scrollIntoView({block:'nearest'}));
    dialog.querySelector('#locker-market')!.addEventListener('click',()=>{const panel=dialog.querySelector<HTMLDetailsElement>('#player-market')!;panel.open=true;panel.scrollIntoView({block:'nearest'});});
    dialog.addEventListener('cancel',e=>{e.preventDefault();send({type:'CloseDepot'});});
  }
  update(s:Snapshot):void {
    if(!s.depotOpen){if(this.dialog.open)this.dialog.close();return;}
    if(!this.dialog.open)this.dialog.showModal();
    this.dialog.querySelector('#depot-message')!.textContent=s.message;
    this.dialog.querySelector('#locker-station')!.textContent=`Stanowisko ${depotAtStand(s.mapId,s.player)?.id.replace('depot-','')??''} · prywatny locker: ${s.name}`;
    const signature=JSON.stringify([s.inventory,s.stash]);if(signature===this.signature)return;this.signature=signature;
    this.dialog.querySelector('#stash-capacity')!.textContent=`${s.stash.length}/${depotRules.slots} pól · stosy zgodnie z limitem przedmiotu`;
    for(const [selector,list,direction,verb]of [['#depot-bag',s.inventory,'deposit','Odłóż'],['#stash-items',s.stash,'withdraw','Pobierz']] as const){
      const root=this.dialog.querySelector(selector)!;root.replaceChildren();
      const grouped=new Map<ItemId,number>();for(const stack of list)grouped.set(stack.itemId,(grouped.get(stack.itemId)??0)+stack.quantity);
      if(!grouped.size){const p=document.createElement('p');p.textContent='Brak przedmiotów';root.append(p);}
      for(const [itemId,count]of grouped){
        const row=document.createElement('div');row.className='trade-row';
        const icon=document.createElement('span');icon.className='item-icon';icon.innerHTML=itemIcon(itemId);
        const label=document.createElement('span');label.textContent=`${items[itemId].name} ×${count}`;
        row.append(icon,label);
        for(const [amount,suffix]of [[1,'1'],[Math.min(99,count),'stos']] as const){
          const button=document.createElement('button');button.textContent=`${verb} ${suffix}`;button.dataset.item=itemId;button.dataset.amount=String(amount);
          button.setAttribute('aria-label',`${verb} ${suffix}: ${items[itemId].name}`);button.addEventListener('click',()=>this.send({type:'StashTransfer',direction,itemId,quantity:amount}));row.append(button);
        }
        root.append(row);
      }
    }
  }
}
