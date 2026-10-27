"""Repinta la librea del A319 (Pincel de Alas, CC BY 4.0) con la identidad BILAIR.

Uso: python3 scripts/repaint_livery.py <entrada.glb> <salida.glb> <fuente_marker> <fuente_sans>
Reemplaza las texturas de fuselaje (logo y matrícula) y recolorea la cola.
"""
import io, json, struct, sys
from PIL import Image, ImageDraw, ImageFont

SRC, DST, MARKER, SANS = sys.argv[1:5]
CHARCOAL = (24, 23, 21)
ORANGE = (255, 79, 26)
STONE = (138, 133, 124)
SKY = (116, 172, 223)
DARK_STONE = (78, 75, 70)

raw = open(SRC, 'rb').read()
jlen = struct.unpack('<I', raw[12:16])[0]
gltf = json.loads(raw[20:20 + jlen])
boff = 20 + jlen
blen = struct.unpack('<I', raw[boff:boff + 4])[0]
binbuf = bytearray(raw[boff + 8:boff + 8 + blen])


def read_image(i):
    bv = gltf['bufferViews'][gltf['images'][i]['bufferView']]
    s = bv.get('byteOffset', 0)
    return Image.open(io.BytesIO(bytes(binbuf[s:s + bv['byteLength']]))).convert('RGB')


def erase(im, box):
    """Rellena box interpolando verticalmente entre la fila de arriba y la de abajo."""
    x0, y0, x1, y1 = box
    px = im.load()
    for x in range(x0, x1):
        top = px[x, max(y0 - 2, 0)]
        bot = px[x, min(y1 + 1, im.height - 1)]
        for y in range(y0, y1):
            t = (y - y0) / max(y1 - y0, 1)
            px[x, y] = tuple(int(top[c] * (1 - t) + bot[c] * t) for c in range(3))


def fit_text(draw, text, font_path, box, anchor_x='l'):
    x0, y0, x1, y1 = box
    size = 200
    while size > 8:
        f = ImageFont.truetype(font_path, size)
        l, t, r, b = draw.textbbox((0, 0), text, font=f)
        if r - l <= x1 - x0 and b - t <= y1 - y0:
            break
        size -= 2
    l, t, r, b = draw.textbbox((0, 0), text, font=f)
    x = x0 - l if anchor_x == 'l' else x1 - (r - l) - l
    y = y0 + ((y1 - y0) - (b - t)) / 2 - t
    return f, x, y, r - l


def wordmark(im, box):
    d = ImageDraw.Draw(im)
    f, x, y, w = fit_text(d, 'BILAIR', MARKER, box)
    d.text((x, y), 'BILAIR', font=f, fill=CHARCOAL)
    # trazo naranja bajo el logo: el único acento de color del fuselaje
    x0, _, _, y1 = box
    d.line([(x0 + 4, y1 + 2), (x0 + w * 0.42, y1 - 1)], fill=ORANGE, width=4)


def registration(im, box, flag_side):
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = box
    h = y1 - y0
    fw = int(h * 1.6)
    if flag_side == 'right':
        fx, tb = x1 - fw, (x0, y0, x1 - fw - 10, y1)
        f, tx, ty, _ = fit_text(d, 'LV-BLR', SANS, tb, anchor_x='r')
    else:
        fx, tb = x0, (x0 + fw + 10, y0, x1, y1)
        f, tx, ty, _ = fit_text(d, 'LV-BLR', SANS, tb)
    d.text((tx, ty), 'LV-BLR', font=f, fill=CHARCOAL)
    third = h / 3
    d.rectangle([fx, y0, fx + fw, y0 + third], fill=SKY)
    d.rectangle([fx, y0 + third, fx + fw, y0 + 2 * third], fill=(250, 250, 248))
    d.rectangle([fx, y0 + 2 * third, fx + fw, y1], fill=SKY)
    d.ellipse([fx + fw / 2 - 3, y0 + h / 2 - 3, fx + fw / 2 + 3, y0 + h / 2 + 3], fill=(240, 180, 40))


def recolor_tail(im):
    """Estabilizadores en carbón y piedra; en la deriva, una sola franja naranja de acento."""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            if mx - mn < 60:
                continue
            shade = mx / 255
            fin = y > 640
            if r > 180 and g < 110:
                base = CHARCOAL; shade = 1
            elif r > 180 and g >= 110 and b < 90:
                base = STONE; shade = min(1, shade * 1.05)
            elif b > r and g > r:
                base = ORANGE if fin else DARK_STONE; shade = min(1, shade * 1.6) if not fin else 1
            else:
                continue
            px[x, y] = tuple(int(c * shade) for c in base)


edits = {}
fus = read_image(2)
erase(fus, (570, 34, 1012, 108))
erase(fus, (18, 708, 486, 794))
wordmark(fus, (600, 48, 930, 104))
wordmark(fus, (40, 722, 370, 778))
edits[2] = fus

reg = read_image(3)
erase(reg, (832, 60, 1024, 100))
erase(reg, (0, 742, 188, 780))
registration(reg, (850, 67, 1018, 94), 'right')
registration(reg, (4, 748, 176, 774), 'left')
edits[3] = reg

tail = read_image(8)
recolor_tail(tail)
edits[8] = tail

# Reescribir el buffer binario con las imágenes nuevas (JPEG: mucho más liviano que PNG).
chunks, views = [], []
images_by_view = {img['bufferView']: i for i, img in enumerate(gltf['images'])}
out = bytearray()
for vi, bv in enumerate(gltf['bufferViews']):
    s = bv.get('byteOffset', 0)
    data = bytes(binbuf[s:s + bv['byteLength']])
    if vi in images_by_view:
        ii = images_by_view[vi]
        im = edits.get(ii) or read_image(ii)
        buf = io.BytesIO()
        im.save(buf, 'JPEG', quality=82, optimize=True, progressive=False)
        data = buf.getvalue()
        gltf['images'][ii]['mimeType'] = 'image/jpeg'
    while len(out) % 4:
        out.append(0)
    bv['byteOffset'] = len(out)
    bv['byteLength'] = len(data)
    out += data
while len(out) % 4:
    out.append(0)
gltf['buffers'][0]['byteLength'] = len(out)
gltf['asset'].setdefault('extras', {})['note'] = 'Livery repainted for BILAIR'

js = json.dumps(gltf, separators=(',', ':')).encode()
js += b' ' * ((4 - len(js) % 4) % 4)
total = 12 + 8 + len(js) + 8 + len(out)
with open(DST, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, total))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(out), 0x004E4942)); f.write(out)
for i, im in edits.items():
    im.save(DST + f'.tex{i}.png')
print('ok', total)
