import {professions,spells} from '@eldoria/content';
import type {Snapshot} from '@eldoria/domain';
import {actionIcon} from './action-icons';
import type {ActionId} from '@eldoria/protocol';
export function actionName(s:Snapshot,id:ActionId):string {
  return id==='attack'?professions[s.profession].attackName:id==='potion'?'Mikstura':spells[id].name;
}
export class ActionBar {
  private signature='';
  constructor(private buttons:HTMLButtonElement[]){}
  update(s:Snapshot):void {
    const signature=JSON.stringify([s.profession,s.actionSlots]);
    for(const [index,button] of this.buttons.entries()){
      const id=s.actionSlots[index]!;
      if(signature!==this.signature){
        const span=button.querySelector('span')!;span.className='action-icon';span.setAttribute('aria-hidden','true');span.innerHTML=actionIcon(id,professions[s.profession].weapon);
        button.querySelector('b')!.textContent=actionName(s,id);button.dataset.action=id;
        button.setAttribute('aria-label',`Pozycja ${index+1}: ${actionName(s,id)}`);
      }
      const cooldown=id==='attack'?s.attackCooldown:id==='potion'?0:s.spellCooldowns[id];
      const lackMana=id!=='attack'&&id!=='potion'&&s.mana<spells[id].mana;
      const small=button.querySelector('small')!;
      const caption=cooldown>0?`${(cooldown/1000).toFixed(1)} s`:`${index+1}${id==='attack'?' · ATAK':id==='potion'?` · ${s.potions} SZT.`:` · ${spells[id].mana} MANY`}`;
      if(small.textContent!==caption)small.textContent=caption;
      button.classList.toggle('cooling',cooldown>0);button.classList.toggle('no-mana',lackMana);
      button.title=lackMana?'Za mało many':`${actionName(s,id)}${id==='attack'?` · zasięg ${professions[s.profession].range}`:id==='potion'?'':` · zasięg ${spells[id].range} · odnowienie ${spells[id].cooldown/1000} s`}`;
    }
    this.signature=signature;
  }
}
