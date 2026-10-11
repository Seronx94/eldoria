import {Client,type Room} from '@colyseus/sdk';
import {commandSchema,PROTOCOL_VERSION,exitResultSchema} from '@eldoria/protocol';
import {onlinePacketSchema,type OnlineSnapshot,type Snapshot,type GameGateway} from '@eldoria/domain';
export class OnlineGateway implements GameGateway {
 private room?:Room;private listeners=new Set<(s:Snapshot)=>void>();private latest?:OnlineSnapshot;
 private sequence=0;private connecting=false;private stopped=false;
 private exit?:{resolve:(allowed:boolean)=>void;timer:ReturnType<typeof setTimeout>};
 constructor(private endpoint:string,private characterId:string,private status:(message:string,failed:boolean)=>void){}
 connect():void {
  if(this.room||this.connecting||this.stopped)return;this.connecting=true;this.status('Łączenie ze wspólnym światem…',false);
  void new Client(this.endpoint).joinOrCreate('eldoria',{protocolVersion:PROTOCOL_VERSION,characterId:this.characterId}).then(room=>{
   this.connecting=false;if(this.stopped){void room.leave();return;}this.room=room;room.reconnection.enabled=false;
   room.onMessage<unknown>('snapshot',input=>{const packet=onlinePacketSchema.safeParse(input);if(!packet.success){this.fail('Niezgodny stan serwera. Zaktualizuj klienta.');return;}const first=!this.latest;this.latest=packet.data.snapshot;for(const listener of this.listeners)listener(this.latest);if(first)this.status('Online · postać na koncie · checkpoint co 5 s',false);});
   room.onMessage<unknown>('command-error',input=>{if(typeof input==='string')this.status(input,false);});
   room.onMessage<unknown>('exit-result',input=>{const result=exitResultSchema.safeParse(input);if(!result.success)return;this.status(result.data.reason,false);if(this.exit){clearTimeout(this.exit.timer);this.exit.resolve(result.data.allowed);this.exit=undefined;}});
   room.onMessage<unknown>('session-ended',input=>this.fail(typeof input==='string'?input:'Sesja wygasła. Zaloguj się ponownie.'));
   room.onLeave(()=>{if(!this.stopped)this.fail('Połączenie zakończone. Wróć do menu i dołącz ponownie.');});
   room.onDrop(()=>this.fail('Utracono połączenie. Wróć do menu i dołącz ponownie.'));
   room.onError(()=>this.fail('Błąd połączenia. Wróć do menu i dołącz ponownie.'));
  }).catch((error:unknown)=>{this.connecting=false;this.fail(error instanceof Error&&/pełna|już w grze|nie należy|Zaloguj|pochodzenie/.test(error.message)?error.message:'Nie udało się połączyć. Zaloguj się i sprawdź serwer online.');});
 }
 send(input:unknown):void {const parsed=commandSchema.safeParse(input);if(!parsed.success||!this.room||this.stopped)return;this.room.send('command',{sequence:++this.sequence,command:parsed.data});}
 subscribe(listener:(s:Snapshot)=>void):()=>void {this.listeners.add(listener);if(this.latest)listener(this.latest);return()=>{this.listeners.delete(listener);};}
 requestLogout():Promise<boolean> {if(!this.room||this.stopped||this.exit)return Promise.resolve(false);return new Promise(resolve=>{const timer=setTimeout(()=>{this.exit=undefined;this.status('Serwer nie potwierdził zapisu. Spróbuj ponownie.',false);resolve(false);},10000);this.exit={resolve,timer};this.room!.send('logout');});}
 disconnect():void {this.stopped=true;const room=this.room;this.room=undefined;this.listeners.clear();if(this.exit){clearTimeout(this.exit.timer);this.exit.resolve(false);this.exit=undefined;}if(room?.connection.isOpen)void room.leave().catch(()=>{});}
 private fail(message:string):void {this.disconnect();this.status(message,true);}
}
