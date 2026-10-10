"""Original provisional pixel art. Standard library only; reproducible PNG sources."""
from pathlib import Path
import struct
import zlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source'
PUBLIC = ROOT / 'apps/client/public/assets'
SOURCE.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)

class Canvas:
    def __init__(self, width, height):
        self.width, self.height = width, height
        self.pixels = bytearray(width * height * 4)
    def rect(self, x, y, w, h, color):
        rgba = bytes.fromhex(color) + b'\xff'
        for yy in range(max(0, y), min(self.height, y+h)):
            for xx in range(max(0, x), min(self.width, x+w)):
                offset = (yy * self.width + xx) * 4
                self.pixels[offset:offset+4] = rgba
    def save(self, name):
        def chunk(kind, data):
            return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
        raw = b''.join(b'\0' + self.pixels[y*self.width*4:(y+1)*self.width*4] for y in range(self.height))
        png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', self.width, self.height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
        (SOURCE/name).write_bytes(png)
        (PUBLIC/name).write_bytes(png)

tiles = Canvas(128, 32)
for index, color in enumerate(['49694c', '8f8061', '355349', '61696b']):
    tiles.rect(index*32, 0, 32, 32, color)
    for y in range(3, 32, 8):
        for x in range(2, 32, 9):
            tiles.rect(index*32+x+(y%3), y, 2, 2, ['5b7954','a39471','42695a','7c8482'][index])
    if index == 3:
        tiles.rect(index*32, 0, 32, 2, 'a7ad9b')
        tiles.rect(index*32, 30, 32, 2, '444e51')
tiles.save('tiles.png')
hero = Canvas(96, 192)
for direction in range(4):
    for frame in range(3):
        x, y = frame*32, direction*48
        shift = 1 if frame == 1 else 0
        hero.rect(x+7, y+40, 18, 4, '253b38')
        hero.rect(x+11, y+31, 5, 10-shift, '253445')
        hero.rect(x+18, y+31, 5, 9+shift, '253445')
        hero.rect(x+10, y+39-shift, 7, 3, 'b69760')
        hero.rect(x+18, y+39+shift, 7, 3, 'b69760')
        hero.rect(x+8, y+18, 17, 16, '304959')
        hero.rect(x+10, y+19, 13, 12, '728b92')
        hero.rect(x+11, y+30, 12, 3, 'bf995c')
        hero.rect(x+6, y+21, 4, 9, 'd6b589')
        hero.rect(x+24, y+21, 4, 9, 'd6b589')
        hero.rect(x+10, y+8, 14, 12, 'd6b589')
        hero.rect(x+9, y+6, 15, 6, '40372f')
        hero.rect(x+9, y+10, 3, 7, '40372f')
        if direction == 3:
            hero.rect(x+10, y+10, 14, 8, '40372f')
        else:
            ex = 19 if direction == 2 else 12
            hero.rect(x+ex, y+13, 2, 2, '253445')
            if direction == 0: hero.rect(x+20, y+13, 2, 2, '253445')
        hero.rect(x+27, y+17, 2, 14, 'd3e0d2')
        hero.rect(x+25, y+30, 6, 2, 'bf995c')
hero.save('wanderer.png')
tree = Canvas(64, 96)
tree.rect(12, 82, 44, 8, '354e3e')
tree.rect(27, 52, 12, 35, '675341')
tree.rect(30, 56, 4, 29, '957454')
for x,y,w,h,c in [(18,2,29,17,'547d56'),(8,17,48,20,'456e4e'),(1,34,62,20,'365b45'),(8,54,48,14,'2b4b3e'),(17,15,14,4,'6c905d'),(9,36,16,4,'638857'),(36,26,15,4,'5b8254')]: tree.rect(x,y,w,h,c)
tree.save('tree.png')
house = Canvas(128,128)
house.rect(7,115,114,8,'354e3e')
house.rect(14,52,100,64,'c0ad84')
house.rect(14,56,7,60,'766449')
house.rect(107,56,7,60,'766449')
house.rect(16,108,96,8,'8b7859')
for row in range(7): house.rect(50-row*6, 10+row*6, 28+row*12, 6,'644748' if row%2 else '845857')
house.rect(8,48,112,8,'453c3d')
house.rect(54,76,24,40,'4e4640')
house.rect(58,80,16,32,'71604b')
house.rect(69,94,3,3,'e4c776')
for x in [27,88]:
    house.rect(x,70,14,21,'514c43'); house.rect(x+2,72,10,17,'9caea1'); house.rect(x+6,72,2,17,'514c43'); house.rect(x+2,79,10,2,'514c43')
house.save('house.png')
rat = Canvas(32,32)
rat.rect(6,24,22,4,'354e3e'); rat.rect(7,12,18,12,'8b8c85'); rat.rect(10,10,12,4,'a4a69c'); rat.rect(21,15,8,8,'a4a69c'); rat.rect(24,15,2,2,'222e32'); rat.rect(3,17,6,3,'c8a088'); rat.rect(8,23,4,3,'c8a088'); rat.save('rat.png')

beetle = Canvas(32,32)
beetle.rect(5,24,23,4,'354e3e')
for x in [5,25]:
    for y in [12,18,24]: beetle.rect(x,y,4,2,'343943')
beetle.rect(9,10,16,15,'664665'); beetle.rect(12,11,10,13,'9b7990'); beetle.rect(16,11,2,13,'3c344d'); beetle.rect(13,6,9,7,'343943'); beetle.rect(14,7,2,2,'d1b778'); beetle.save('beetle.png')
wolf = Canvas(32,32)
wolf.rect(3,25,27,4,'354e3e'); wolf.rect(5,11,19,14,'717c87'); wolf.rect(8,10,12,9,'9aa6ad'); wolf.rect(21,12,9,10,'939fa7'); wolf.rect(22,7,4,7,'717c87'); wolf.rect(26,14,2,2,'e3c992'); wolf.rect(4,23,5,5,'485863'); wolf.rect(19,23,5,5,'485863'); wolf.rect(1,11,7,4,'a5b0b6'); wolf.save('wolf.png')

# These two small maps are samples for style/input review, not final Vareon/forest.
for map_id, other, tint in [('courtyard','grove',1),('grove','courtyard',1)]:
    width, height = 28, 22
    ground, details, collision, above = [], [], [], []
    for y in range(height):
        for x in range(width):
            wall = x in (0,width-1) or y in (0,height-1) or (5<=x<=7 and 7<=y<=8)
            ground.append(2 if 12<=x<=15 or y in (10,11) else tint)
            details.append(4 if x in (0,width-1) or y in (0,height-1) else 0)
            collision.append(1 if wall else 0)
            above.append(0)
    for x,y in [(3,12),(8,16),(19,8),(23,13),(20,18)]:
        collision[y*width+x]=1
    layers=[]
    for i,(name,data) in enumerate([('Ground',ground),('Details',details),('Collision',collision),('Above',above)],1):
        layers.append({'id':i,'name':name,'type':'tilelayer','width':width,'height':height,'x':0,'y':0,'opacity':1,'visible':name!='Collision','data':data})
    def prop(name, value): return {'name':name,'type':'string','value':value}
    layers += [
        {'id':5,'name':'Spawns','type':'objectgroup','objects':[{'id':1,'name':'entry','x':13*32,'y':11*32,'point':True}]},
        {'id':6,'name':'Portals','type':'objectgroup','objects':[{'id':2,'name':'gate','x':13*32,'y':3*32,'width':32,'height':32,'properties':[prop('targetMapId',other),prop('targetSpawnId','entry')]}]},
        {'id':7,'name':'NPCs','type':'objectgroup','objects':[]},
        {'id':8,'name':'Decorations','type':'objectgroup','objects':[
            {'id':3,'name':'house','x':6*32,'y':8*32},
            *[{'id':4+i,'name':'tree','x':x*32,'y':y*32} for i,(x,y) in enumerate([(3,12),(8,16),(19,8),(23,13),(20,18)])]
        ]}
    ]
    doc={'type':'map','version':'1.10','tiledversion':'1.11.2','orientation':'orthogonal','renderorder':'right-down','infinite':False,'width':width,'height':height,'tilewidth':32,'tileheight':32,'properties':[prop('mapId',map_id), prop('combatAllowed','false' if map_id == 'courtyard' else 'true')],'layers':layers,'tilesets':[{'firstgid':1,'name':'eldoria-placeholder','tilewidth':32,'tileheight':32,'tilecount':4,'columns':4,'image':'tiles.png','imagewidth':128,'imageheight':32}]}
    text=json.dumps(doc,ensure_ascii=False,indent=2)+'\n'
    (SOURCE/(map_id+'.tmj')).write_text(text)
    (PUBLIC/(map_id+'.json')).write_text(text)
print('Generated original placeholder sprites and two editable sample maps.')

# Adventure maps reuse the reviewed provisional palette, with reproducible Tiled sources.
for map_id, width, height in [('vareon',48,48),('forest',64,64)]:
    town = map_id == 'vareon'
    cx = 24 if town else 32
    entry = (cx,12) if town else (cx,58)
    gate = (cx,4) if town else (cx,60)
    buildings = [(12,15),(35,15),(12,29),(35,29),(24,39)] if town else []
    trees = ([(5,7),(42,7),(6,22),(41,22),(6,36),(41,36)] if town else
             [(x,y) for y in range(7,57,7) for x in range(5,60,6) if abs(x-cx)>4 and (x+y)%3!=0])
    npcs = [('mira',25,12),('oren',22,12),('borin',27,14)] if town else []
    monster_points = [] if town else [
        ('rat-1','rat',33,56),('rat-2','rat',35,52),('rat-3','rat',30,48),('rat-4','rat',34,44),
        ('beetle-1','beetle',36,58),('beetle-2','beetle',29,53),('beetle-3','beetle',37,48),('beetle-4','beetle',30,40),
        ('wolf-1','wolf',40,38),('wolf-2','wolf',25,30),('wolf-3','wolf',40,22),('wolf-4','wolf',30,12)]
    ground=[]; details=[]; collision=[]; above=[]
    for y in range(height):
        for x in range(width):
            border = x in (0,width-1) or y in (0,height-1)
            road = abs(x-cx)<=1 or (town and (10<=y<=17 or y in (28,29,38,39)))
            ground.append(2 if road else 1)
            details.append(4 if border else 0)
            collision.append(1 if border else 0)
            above.append(0)
    for x,y in buildings:
        for yy in range(y-1,y+1):
            for xx in range(x-1,x+2): collision[yy*width+xx]=1
    # Fountain at the market; the water is impassable, with paths around it.
    if town:
        for y in range(19,22):
            for x in range(23,26):
                ground[y*width+x]=3; details[y*width+x]=4 if x in (23,25) or y in (19,21) else 0
                collision[y*width+x]=1
    reserved={entry,gate,*[(x,y) for _,x,y in npcs],*[(x,y) for _,_,x,y in monster_points]}
    trees=[(x,y) for x,y in trees if (x,y) not in reserved]
    for x,y in trees: collision[y*width+x]=1
    def obj(identifier,name,x,y,props=None):
        return {'id':identifier,'name':name,'x':x*32,'y':y*32,'point':True,'properties':props or []}
    layers=[]
    for i,(name,data) in enumerate([('Ground',ground),('Details',details),('Collision',collision),('Above',above)],1):
        layers.append({'id':i,'name':name,'type':'tilelayer','width':width,'height':height,'x':0,'y':0,'opacity':1,'visible':name!='Collision','data':data})
    layers += [
        {'id':5,'name':'Spawns','type':'objectgroup','objects':[obj(1,'entry',*entry),*[obj(10+i,name,x,y,[prop('monsterId',kind)]) for i,(name,kind,x,y) in enumerate(monster_points)]]},
        {'id':6,'name':'Portals','type':'objectgroup','objects':[obj(2,'gate',*gate,[prop('targetMapId','forest' if town else 'vareon'),prop('targetSpawnId','entry')])]},
        {'id':7,'name':'NPCs','type':'objectgroup','objects':[obj(30+i,name,x,y,[prop('npcId',name)]) for i,(name,x,y) in enumerate(npcs)]},
        {'id':8,'name':'Decorations','type':'objectgroup','objects':[*[obj(40+i,'house',x,y) for i,(x,y) in enumerate(buildings)],*[obj(60+i,'tree',x,y) for i,(x,y) in enumerate(trees)]]}
    ]
    doc={'type':'map','version':'1.10','tiledversion':'1.11.2','orientation':'orthogonal','renderorder':'right-down','infinite':False,'width':width,'height':height,'tilewidth':32,'tileheight':32,'properties':[prop('mapId',map_id),prop('combatAllowed','false' if town else 'true')],'layers':layers,'tilesets':[{'firstgid':1,'name':'eldoria-placeholder','tilewidth':32,'tileheight':32,'tilecount':4,'columns':4,'image':'tiles.png','imagewidth':128,'imageheight':32}]}
    text=json.dumps(doc,ensure_ascii=False,indent=2)+'\n'
    (SOURCE/(map_id+'.tmj')).write_text(text)
    (PUBLIC/(map_id+'.json')).write_text(text)
print('Generated Vareon 48x48 and forest 64x64 with NPC and monster markers.')
