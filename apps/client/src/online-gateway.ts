import {Client,type Room} from '@colyseus/sdk';
import {commandSchema,PROTOCOL_VERSION,type Profession} from '@eldoria/protocol';
import {onlinePacketSchema,type OnlineSnapshot,type Snapshot,type GameGateway} from '@eldoria/domain';
export class OnlineGateway implements GameGateway {
 private room?:Room;private listeners=new Set<(s:Snapshot)=>void>();private latest?:OnlineSnapshot;
 private sequence=0;private connecting=false;private stopped=false;
 constructor(private endpoint:string,private name:string,private profession:Profession,private status:(message:string,failed:boolean)=>void){}
 connect():void {
  if(this.room||this.connecting||this.stopped)return;this.connecting=true;this.status('Łączenie ze wspólnym światem…',false);
  void new Client(this.endpoint).joinOrCreate('eldoria',{protocolVersion:PROTOCOL_VERSION,name:this.name,profession:this.profession}).then(room=>{
   this.connecting=false;if(this.stopped){void room.leave();return;}this.room=room;room.reconnection.enabled=false;
   room.onMessage<unknown>('snapshot',input=>{const packet=onlinePacketSchema.safeParse(input);if(!packet.success){this.fail('Niezgodny stan serwera. Zaktualizuj klienta.');return;}this.latest=packet.data.snapshot;for(const listener of this.listeners)listener(this.latest);this.status('Online · sesja testowa bez trwałego zapisu',false);});
   room.onMessage<unknown>('command-error',input=>{if(typeof input==='string')this.status(input,false);});
   room.onLeave(()=>{if(!this.stopped)this.fail('Połączenie zakończone. Wróć do menu i dołącz ponownie.');});
   room.onDrop(()=>this.fail('Utracono połączenie. Wróć do menu i dołącz ponownie.'));
   room.onError(()=>this.fail('Błąd połączenia. Wróć do menu i dołącz ponownie.'));
  }).catch((error:unknown)=>{this.connecting=false;this.fail(error instanceof Error&&error.message.includes('Sesja testowa jest pełna')?'Sesja testowa jest pełna (8 graczy). Spróbuj później.':'Nie udało się połączyć. Sprawdź, czy działa serwer online.');});
 }
 send(input:unknown):void {const parsed=commandSchema.safeParse(input);if(!parsed.success||!this.room||this.stopped)return;this.room.send('command',{sequence:++this.sequence,command:parsed.data});}
 subscribe(listener:(s:Snapshot)=>void):()=>void {this.listeners.add(listener);if(this.latest)listener(this.latest);return()=>{this.listeners.delete(listener);};}
 disconnect():void {this.stopped=true;const room=this.room;this.room=undefined;this.listeners.clear();if(room?.connection.isOpen)void room.leave().catch(()=>{});}
 private fail(message:string):void {this.disconnect();this.status(message,true);}
}
