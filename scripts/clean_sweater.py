"""Quita el logo de terceros de la textura del buzo 3D (Sweater Club Fleece, PKY_studio, CC BY 4.0).

Uso: python3 scripts/clean_sweater.py <entrada.glb> <salida.glb>
Rellena la zona del logo con el color de tela de alrededor y deja el resto igual.
"""
import io, json, struct, sys
from PIL import Image

SRC, DST = sys.argv[1:3]
LOGO_BOX = (655, 392, 700, 440)  # x0, y0, x1, y1 en la textura difusa (1024 px)

raw = open(SRC, 'rb').read()
jlen = struct.unpack('<I', raw[12:16])[0]
gltf = json.loads(raw[20:20 + jlen])
boff = 20 + jlen
blen = struct.unpack('<I', raw[boff:boff + 4])[0]
binbuf = raw[boff + 8:boff + 8 + blen]

diffuse_index = gltf['materials'][0]['extensions']['KHR_materials_pbrSpecularGlossiness']['diffuseTexture']['index']
image_index = gltf['textures'][diffuse_index]['source']

out = bytearray()
for vi, bv in enumerate(gltf['bufferViews']):
    s = bv.get('byteOffset', 0)
    data = binbuf[s:s + bv['byteLength']]
    if vi == gltf['images'][image_index]['bufferView']:
        im = Image.open(io.BytesIO(data)).convert('RGB')
        x0, y0, x1, y1 = LOGO_BOX
        # color de la tela: promedio del marco alrededor del logo
        ring = [im.getpixel((x, y)) for x in range(x0 - 6, x1 + 6) for y in (y0 - 6, y1 + 6)]
        fill = tuple(sum(c[i] for c in ring) // len(ring) for i in range(3))
        im.paste(fill, (x0, y0, x1, y1))
        buf = io.BytesIO()
        im.save(buf, 'JPEG', quality=90)
        data = buf.getvalue()
        gltf['images'][image_index]['mimeType'] = 'image/jpeg'
    while len(out) % 4:
        out.append(0)
    bv['byteOffset'] = len(out)
    bv['byteLength'] = len(data)
    out += data
while len(out) % 4:
    out.append(0)
gltf['buffers'][0]['byteLength'] = len(out)
js = json.dumps(gltf, separators=(',', ':')).encode()
js += b' ' * ((4 - len(js) % 4) % 4)
with open(DST, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(out), 0x004E4942)); f.write(out)
print('ok', fill)
