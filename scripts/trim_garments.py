"""Prepara las imágenes de prendas a partir de los renders y las guarda en WebP.
Uso: python3 scripts/trim_garments.py <carpeta con PNG> <carpeta de salida>

- Sueltas (tee-negro.png): se recorta el borde transparente.
- Colgadas (tee-negro-hang.png + tee-shadow.png): se les compone detrás la sombra sobre la pared,
  desenfocada, y se recortan dejando el gancho centrado arriba (el margen es igual a ambos lados).
Imprime el tamaño final de cada imagen (para src/components/GarmentImage.tsx)."""
import sys, os, json
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
sizes = {}


def bbox(im):
    return im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()


def save(im, name, longest=900):
    k = longest / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(os.path.join(dst, name + '.webp'), 'WEBP', quality=88, method=6)
    sizes[name] = im.size


for f in sorted(os.listdir(src)):
    if not f.endswith('.png') or f.startswith('test-') or f.endswith('-shadow.png') or '-' not in f:
        continue
    name = f[:-4]
    im = Image.open(os.path.join(src, f)).convert('RGBA')
    if not name.endswith('-hang'):
        b = bbox(im)
        pad = 6
        save(im.crop((max(0, b[0] - pad), max(0, b[1] - pad), min(im.width, b[2] + pad), min(im.height, b[3] + pad))), name)
        continue
    model = name.split('-')[0]
    sh = Image.open(os.path.join(src, model + '-shadow.png')).convert('RGBA')
    # Sombra: se usa solo su alfa, suavizada y más tenue
    a = sh.getchannel('A').filter(ImageFilter.GaussianBlur(im.width / 75)).point(lambda v: int(v * 0.4))
    shadow = Image.new('RGBA', im.size, (12, 11, 10, 0))
    shadow.putalpha(a)
    out = Image.alpha_composite(shadow, im)
    b = bbox(im)
    w = b[2] - b[0]
    px = round(w * 0.11)
    pb = round(max((b[3] - b[1]) * 0.13, w * 0.07))
    save(out.crop((b[0] - px, max(0, b[1] - 4), b[2] + px, min(im.height, b[3] + pb))), name, 1000)
print(json.dumps(sizes))
