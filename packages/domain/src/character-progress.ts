import {saveSchema} from './save';
import {rules,professions,actionAllowed,skillRequired} from '@eldoria/content';
import {z} from 'zod';
/** Server checkpoint only: never import offline loot or the private monster world. */
export const characterProgressSchema=z.object(saveSchema.in.shape).omit({version:true,mode:true,cityRevision:true,maps:true,loot:true}).strip().superRefine((s,ctx)=>{
 if(s.hp>rules.maxHp+(s.level-1)*10||s.mana>rules.maxMana+(s.level-1)*5||s.exp>=s.level*100)ctx.addIssue({code:'custom',message:'Nieprawidłowe statystyki'});
 if(s.equipment.weapon&&s.equipment.weapon!==professions[s.profession].weapon||s.actionSlots?.some(a=>!actionAllowed(s.profession,a)))ctx.addIssue({code:'custom',message:'Nieprawidłowa profesja'});
 for(const kind of ['melee','distance','magic'] as const)if(s.skills[kind].progress>=skillRequired(kind,s.skills[kind].level,s.profession))ctx.addIssue({code:'custom',message:'Nieprawidłowy postęp skilla'});
});
export type CharacterProgress=z.infer<typeof characterProgressSchema>;
