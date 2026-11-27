"""Recorta el borde transparente de los renders de prendas y los guarda en WebP.
Uso: python3 scripts/trim_garments.py <carpeta con PNG> <carpeta de salida>
Imprime el tamaño final de cada imagen (para src/components/GarmentImage.tsx)."""
import sys, os, json
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
sizes = {}
for f in sorted(os.listdir(src)):
    if not f.endswith('.png') or f.startswith('test-') or '-' not in f:
        continue
    im = Image.open(os.path.join(src, f)).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    pad = 6
    im = im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))
    k = 900 / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    name = f[:-4]
    im.save(os.path.join(dst, name + '.webp'), 'WEBP', quality=88, method=6)
    sizes[name] = im.size
print(json.dumps(sizes))
