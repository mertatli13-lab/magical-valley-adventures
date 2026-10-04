"""Prepare a Meshy GLB for art/models/: 1024 px textures, the idle clip renamed to Idle, and optionally
scaled to a height in metres with its origin at the feet (for unrigged models, such as the ponies).

Usage: python3 scripts/prep-meshy.py <meshy.glb> art/models/characters/<id>.glb [height]
Then run npm run optimize:models."""
import io, json, struct, sys
from PIL import Image

def read(path):
    d = open(path, 'rb').read()
    jl = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + jl])
    bl = struct.unpack('<I', d[20 + jl:24 + jl])[0]
    return j, bytearray(d[28 + jl:28 + jl + bl])

def write(path, j, views):
    # Rebuild the binary chunk from the (possibly replaced) buffer views, 4-byte aligned.
    out = bytearray()
    for i, data in enumerate(views):
        while len(out) % 4: out.append(0)
        j['bufferViews'][i]['byteOffset'] = len(out)
        j['bufferViews'][i]['byteLength'] = len(data)
        out += data
    while len(out) % 4: out.append(0)
    j['buffers'] = [{'byteLength': len(out)}]
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(out)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(out), 0x004E4942)); f.write(out)

def prep(src, dst, height=None, texture=1024):
    j, binary = read(src)
    views = [bytes(binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]) for v in j['bufferViews']]
    for image in j.get('images', []):
        i = image['bufferView']
        im = Image.open(io.BytesIO(views[i])).convert('RGB')
        if max(im.size) > texture: im = im.resize((texture, texture), Image.LANCZOS)
        buf = io.BytesIO(); im.save(buf, 'JPEG', quality=90); views[i] = buf.getvalue()
        image['mimeType'] = 'image/jpeg'
    for a in j.get('animations', []):
        if 'idle' in a.get('name', '').lower(): a['name'] = 'Idle'
    if height:
        lo, hi = [1e9] * 3, [-1e9] * 3
        for m in j['meshes']:
            for p in m['primitives']:
                acc = j['accessors'][p['attributes']['POSITION']]
                lo = [min(a, b) for a, b in zip(lo, acc['min'])]; hi = [max(a, b) for a, b in zip(hi, acc['max'])]
        s = height / (hi[1] - lo[1])
        root = {'name': 'Root', 'scale': [s, s, s], 'translation': [-(lo[0] + hi[0]) / 2 * s, -lo[1] * s, -(lo[2] + hi[2]) / 2 * s],
                'children': list(j['scenes'][0]['nodes'])}
        j['nodes'].append(root)
        j['scenes'][0]['nodes'] = [len(j['nodes']) - 1]
        print(f'  scaled by {s:.3f} to {height} m, feet at y=0')
    write(dst, j, views)

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    prep(src, dst, float(sys.argv[3]) if len(sys.argv) > 3 else None)
