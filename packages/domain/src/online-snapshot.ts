import {z} from 'zod';
import {appearanceSchema,professionSchema,directionSchema,nameSchema,PROTOCOL_VERSION} from '@eldoria/protocol';
import {saveSchema} from './save';
import type {OnlineSnapshot} from './index';
const saved=saveSchema.in;
const point=z.object({x:z.number().int().min(0).max(255),y:z.number().int().min(0).max(255)}).strict();
const id=z.string().min(1).max(100),kind=z.enum(['rat','beetle','wolf']);
const publicPlayerSchema=z.object({id,name:nameSchema,profession:professionSchema,appearance:appearanceSchema,mapId:saved.shape.mapId,player:point,direction:directionSchema,hp:z.number().int().min(1).max(1090),maxHp:z.number().int().min(1).max(1090),level:saved.shape.level}).strict();
export const onlineSnapshotSchema=z.object(saved.shape).pick({appearance:true,profession:true,stash:true,lootSettings:true,exploration:true,quest:true,name:true,mapId:true,player:true,direction:true,hp:true,mana:true,level:true,exp:true,gold:true,kills:true,inventory:true,equipment:true,loot:true,eventId:true,}).extend({
 skills:saved.shape.skills.unwrap(),combatMs:z.number().int().min(0).max(60000),actionSlots:saved.shape.actionSlots.unwrap(),selfId:id,players:z.array(publicPlayerSchema).max(8),depotOpen:z.boolean(),attackCooldown:z.number().min(0).max(10000),spellCooldowns:saved.shape.spellCooldowns.unwrap(),guardMs:z.number().min(0).max(4000),
 maxHp:z.number().int().min(1).max(1090),maxMana:z.number().int().min(1).max(545),potions:z.number().int().min(0).max(1980),
 selectedId:id.nullable(),dialog:z.enum(['mira','oren','borin']).nullable(),defeatedKinds:z.array(kind).max(3),message:z.string().max(2000),complete:z.boolean(),
 creatures:z.array(z.object({id,kind,hp:z.number().int().min(0).max(70),spawn:point,x:point.shape.x,y:point.shape.y,state:z.enum(['idle','chase','attack','return','dead']),lastAttack:z.number(),lastMove:z.number(),diedAt:z.number()}).strict()).max(100),
 combatEvents:z.array(z.object({id:z.number().int().positive(),mapId:saved.shape.mapId,kind:z.enum(['melee','ranged','spell','monster']),effect:z.enum(['sword','arrow','bolt','blade-wave','spin','guard','power-arrow','volley','heal','spark','fireball','frost','claw']),abilityId:z.enum(['attack','blade-wave','spin','guard','power-shot','volley','mend','spark','fireball','frost']).nullable(),radius:z.number().min(0).max(10),healing:z.number().min(0).max(1000),hits:z.array(z.object({targetId:id,to:point,damage:z.number().min(0).max(1000)}).strict()).max(100),sourceId:id,targetId:id.nullable(),direction:directionSchema,from:point,to:point,damage:z.number().min(0).max(1000)}).strict()).max(64),
}).strict() satisfies z.ZodType<OnlineSnapshot>;
export const onlinePacketSchema=z.object({protocolVersion:z.literal(PROTOCOL_VERSION),snapshot:onlineSnapshotSchema}).strict();
