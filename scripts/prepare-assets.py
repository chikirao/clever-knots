from pathlib import Path
from PIL import Image
import urllib.request, re

root = Path(__file__).resolve().parents[1]
source = Path(r'C:\Users\UserPC\Desktop\макраме')
uploads = root / 'src/assets/uploads'
uploads.mkdir(parents=True, exist_ok=True)
for src, target in [('photo_10_2023-09-13_14-06-41 1.png','bottle-window'),('photo_8_2023-09-13_14-06-41 1.png','bottle-table'),('photo_9_2023-09-13_14-06-41 1.png','bottle-detail'),('photo_12_2023-09-13_14-06-41 1.png','fiber-macro')]:
    image = Image.open(source/src).convert('RGB')
    image.save(uploads/f'{target}.webp', quality=88)
logo = Image.open(Path(r'C:\Users\UserPC\.codex\visualizations\2026\10\12\01a130f9-dd39-7541-bdee-b94a2944e965\concepts\rope-logo-cotton-v2.png')).convert('RGBA')
logo.save(root/'src/assets/rope-logo.webp',quality=90)
mark = Image.open(source/'лого3.png').convert('RGBA')
mark.putdata([(r,g,b,255 if g<150 else 0) for r,g,b,a in mark.getdata()])
(root/'public').mkdir(exist_ok=True)
mark.save(root/'public/brand-mark.png')
mark.resize((64,64),Image.Resampling.LANCZOS).save(root/'public/favicon.png')
Image.open(uploads/'bottle-window.webp').resize((1200,900)).save(root/'public/og.jpg',quality=87)

fonts=root/'public/fonts'
fonts.mkdir(exist_ok=True)
css=[]
for family,axes in [('Onest','wght@400..700'),('Literata','opsz,wght@7..72,400..600')]:
    url=f'https://fonts.googleapis.com/css2?family={family}:{axes}&display=swap'
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'})
    remote=urllib.request.urlopen(req).read().decode()
    for i,block in enumerate(re.findall(r'/\*.*?\*/\s*@font-face\s*\{.*?\}',remote,re.S)):
        if not any(f'/* {part} */' in block for part in ['latin','cyrillic','cyrillic-ext']):continue
        fonturl=re.search(r'url\(([^)]+)\)',block).group(1)
        name=f'{family.lower()}-{i}.woff2'
        (fonts/name).write_bytes(urllib.request.urlopen(fonturl).read())
        css.append(block.replace(fonturl,f'../../public/fonts/{name}'))
    ofl=f'https://raw.githubusercontent.com/google/fonts/main/ofl/{family.lower()}/OFL.txt'
    (fonts/f'{family}-OFL.txt').write_bytes(urllib.request.urlopen(ofl).read())
(root/'src/styles').mkdir(exist_ok=True)
# Fonts are imported by Vite so the build rewrites URLs correctly under any BASE_PATH.
(root/'src/styles/fonts.css').write_text('\n'.join(css),encoding='utf-8')
print('Assets and self-hosted Latin/Cyrillic fonts prepared.')
