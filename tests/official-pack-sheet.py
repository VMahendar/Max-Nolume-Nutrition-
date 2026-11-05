import base64, io, json, os, urllib.request
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
out=Path('reports/official-photo-research');out.mkdir(parents=True,exist_ok=True)
urls={
 'Potency Whey Sep (official)': 'https://unicornproseries.com/wp-content/uploads/2026/09/Potency-Whey.png',
 'Nitro Mass 1 (official)': 'https://unicornproseries.com/wp-content/uploads/2026/07/Nitro-Mass-1.png',
 'Nitro Mass gallery 2 (official)': 'https://unicornproseries.com/wp-content/uploads/2026/07/47305.jpeg',
 'Sturdy Watermelon (official)': 'https://unicornproseries.com/wp-content/uploads/2026/07/Stuedy-Watermelon.png',
 'Pro Creatine Blueberry (official)': 'https://unicornproseries.com/wp-content/uploads/2026/05/Pro-Creatine-Blueberry-1.png',
 'Nitro Mass variant (official)': 'https://unicornproseries.com/wp-content/uploads/2026/07/Nitro-Mass.png'
}
sheet=Image.new('RGB',(1200,920),'#eff3fb')
draw=ImageDraw.Draw(sheet)
meta=[]
for i,(name,url) in enumerate(urls.items()):
 x=(i%3)*400;y=(i//3)*460
 draw.rectangle([x+6,y+6,x+394,y+454],fill='white',outline='#dbe4ef',width=2)
 draw.text((x+16,y+16),name,fill='#111827')
 try:
  source=list(urls).index(name)
  ext='.jpg' if source==2 else '.png'
  data=(out/('raw-'+str(source)+ext)).read_bytes()
  img=Image.open(io.BytesIO(data));original=(img.width,img.height)
  img.thumbnail((350,360))
  if img.mode in ['RGBA','LA']:
   background=Image.new('RGB',img.size,'white');background.paste(img,mask=img.getchannel('A') if img.mode=='RGBA' else img.getchannel('L'));img=background
  else:img=img.convert('RGB')
  sheet.paste(img,(x+200-img.width//2,y+70+((360-img.height)//2)))
  meta.append({'name':name,'url':url,'size':original,'bytes':len(data)})
 except Exception as e:
  draw.text((x+20,y+160),'FETCH FAILED '+str(e)[:45],fill='#a11')
  meta.append({'name':name,'url':url,'error':str(e)})
sheet.save(out/'official-contact-sheet.jpg',quality=62,optimize=True)
print('OFFICIAL_SHEET_META',json.dumps(meta))
encoded=base64.b64encode((out/'official-contact-sheet.jpg').read_bytes()).decode()
for i in range(0,len(encoded),9000):
 print('OFFICIAL_SHEET_'+str(i//9000).zfill(3)+' '+encoded[i:i+9000])
