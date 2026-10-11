import type {ActionId,Profession,SpellId,Weapon} from '@eldoria/protocol';
export type CombatVisual='sword'|'arrow'|'bolt'|'blade-wave'|'spin'|'guard'|'power-arrow'|'volley'|'heal'|'spark'|'fireball'|'frost'|'claw';
interface SpellDefinition {
  name:string;profession:Profession;level:number;mana:number;cooldown:number;range:number;
  damage:number;radius:number;mode:'target'|'area'|'self-area'|'guard'|'heal';effect:CombatVisual;
}
/** Stable skill IDs and level gates are the basis for a later profession development tree. */
export const spells:Record<SpellId,SpellDefinition>={
  'blade-wave':{name:'Iskra ostrza',profession:'knight',level:1,mana:8,cooldown:1500,range:4,damage:18,radius:0,mode:'target',effect:'blade-wave'},
  spin:{name:'Wir ostrzy',profession:'knight',level:3,mana:12,cooldown:3000,range:1,damage:20,radius:1,mode:'self-area',effect:'spin'},
  guard:{name:'Żelazna osłona',profession:'knight',level:5,mana:10,cooldown:6000,range:0,damage:0,radius:0,mode:'guard',effect:'guard'},
  'power-shot':{name:'Precyzyjny strzał',profession:'archer',level:1,mana:8,cooldown:1500,range:6,damage:24,radius:0,mode:'target',effect:'power-arrow'},
  volley:{name:'Deszcz strzał',profession:'archer',level:3,mana:14,cooldown:3500,range:5,damage:16,radius:1,mode:'area',effect:'volley'},
  mend:{name:'Oddech lasu',profession:'archer',level:5,mana:12,cooldown:5000,range:0,damage:0,radius:0,mode:'heal',effect:'heal'},
  spark:{name:'Iskra',profession:'mage',level:1,mana:8,cooldown:1500,range:4,damage:18,radius:0,mode:'target',effect:'spark'},
  fireball:{name:'Kula ognia',profession:'mage',level:3,mana:16,cooldown:3500,range:5,damage:22,radius:1,mode:'area',effect:'fireball'},
  frost:{name:'Lodowy krąg',profession:'mage',level:5,mana:14,cooldown:3500,range:2,damage:16,radius:2,mode:'self-area',effect:'frost'},
};
export const professions:Record<Profession,{name:string;weapon:Weapon;attackName:string;range:number;damage:number;attackMs:number;effect:CombatVisual;spells:SpellId[]}>= {
  knight:{name:'Knight',weapon:'sword',attackName:'Miecz',range:1,damage:12,attackMs:800,effect:'sword',spells:['blade-wave','spin','guard']},
  archer:{name:'Archer',weapon:'bow',attackName:'Łuk',range:5,damage:10,attackMs:800,effect:'arrow',spells:['power-shot','volley','mend']},
  mage:{name:'Mag',weapon:'wand',attackName:'Różdżka',range:4,damage:9,attackMs:800,effect:'bolt',spells:['spark','fireball','frost']},
};
export const professionRules={guardMs:4000,guardDefense:4,mendHp:24} as const;
export function defaultActions(profession:Profession):[ActionId,ActionId,ActionId,ActionId] {
  const [first,second,third]=professions[profession].spells;
  return ['attack',first!,second!,third!];
}
export function actionAllowed(profession:Profession,action:ActionId):boolean {
  return action==='attack'||action==='potion'||spells[action].profession===profession;
}
export function emptySpellCooldowns():Record<SpellId,number> {
  return {'blade-wave':0,spin:0,guard:0,'power-shot':0,volley:0,mend:0,spark:0,fireball:0,frost:0};
}
