import {onlineCommandSchema,type Command} from '@eldoria/protocol';
import {onlineRules} from '@eldoria/content';
/** Per transport session: costs malformed requests too; no client timestamps or identity. */
export class CommandGate {
 private sequence=0;private tokens:number=onlineRules.commandBurst;private last:number;
 constructor(now:number){this.last=now;}
 accept(input:unknown,now:number):{command:Command}|{error:string} {
  this.tokens=Math.min(onlineRules.commandBurst,this.tokens+Math.max(0,now-this.last)*onlineRules.commandsPerSecond/1000);this.last=now;
  if(this.tokens<1)return {error:'Za dużo komend. Zwolnij.'};this.tokens--;
  const parsed=onlineCommandSchema.safeParse(input);if(!parsed.success)return {error:'Nieprawidłowa komenda.'};
  if(parsed.data.sequence<=this.sequence)return {error:'Powtórzona lub spóźniona komenda.'};
  this.sequence=parsed.data.sequence;return {command:parsed.data.command};
 }
}
