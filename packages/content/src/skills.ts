import type {Profession,Skills} from '@eldoria/protocol';
export const combatRules={logoutLockMs:60000,idleMs:15*60*1000} as const;
export const skillNames={melee:'Melee fighting',distance:'Distance fighting',magic:'Magic level'} as const;
export function skillRequired(kind:keyof Skills,level:number,profession:Profession):number {
 return kind==='magic'?20*(level+1)**2*({knight:8,archer:4,mage:1}[profession]):20*(level-9)**2;
}
export function skillPower(kind:keyof Skills,level:number):number {return Math.floor((level-(kind==='magic'?0:10))/(kind==='magic'?3:5));}
