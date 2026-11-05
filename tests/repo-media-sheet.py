import base64,io,json
from pathlib import Path
from PIL import Image,ImageDraw
files=['public/assets/IMG-20261102-WA0019.jpg','public/assets/Screenshot_2026_1103_003852.jpg','public/assets/nitro-mass-5kg.jpg','public/assets/potency-whey.png','public/assets/sturdy-pre-workout.png','public/assets/pro-creatine.png']
s=Image.new('RGB',(1200,920),'#f3f6fc');d=ImageDraw.Draw(s);meta=[]
for i,name in enumerate(files):
 x=(i%3)*400;y=(i//3)*460
 d.rectangle([x+5,y+5,x+395,y+455],fill='white',outline='#cfdaed',width=2)
 d.text((x+13,y+16),name.replace('public/assets/','')[:36],fill='#111827')
 try:
  im=Image.open(name);meta.append({'file':name,'width':im.width,'height':im.height})
  im.thumbnail((345,360));im=im.convert('RGB');s.paste(im,(x+200-im.width//2,y+70+(360-im.height)//2))
 except Exception as e:meta.append({'file':name,'error':str(e)})
out=Path('reports/official-photo-research');out.mkdir(exist_ok=True,parents=True)
s.save(out/'existing-repo-assets.jpg',quality=62,optimize=True)
print('REPO_SHEET_META',json.dumps(meta))
b=base64.b64encode((out/'existing-repo-assets.jpg').read_bytes()).decode()
for i in range(0,len(b),9000):print('REPO_SHEET_'+str(i//9000).zfill(3)+' '+b[i:i+9000])
