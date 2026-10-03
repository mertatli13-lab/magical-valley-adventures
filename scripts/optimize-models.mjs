// Compresses the Blender exports in art/models/ into public/models/, keeping the folder layout.
// Geometry: meshopt (decoded in the game by three's MeshoptDecoder). Textures: WebP.
// Scene-graph changes are off so named nodes survive: acc_head, acc_neck and acc_back empties,
// the Star and BigStar nodes, and every animation clip.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const SOURCE = 'art/models';
const OUTPUT = 'public/models';
const FLAGS = [
  '--compress', 'meshopt',
  '--texture-compress', 'webp',
  '--simplify', 'false',
  '--flatten', 'false',
  '--join', 'false',
  '--instance', 'false',
  '--palette', 'false',
  '--prune', 'false', // pruning would delete the empty attach nodes
];

function glbFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return glbFiles(path);
    return name.endsWith('.glb') ? [path] : [];
  });
}

if (!existsSync(SOURCE)) {
  console.log(`Put the Blender exports in ${SOURCE}/ (same layout as ${OUTPUT}/, see ${OUTPUT}/README.md).`);
  process.exit(0);
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
let before = 0;
let after = 0;
for (const source of glbFiles(SOURCE)) {
  const target = join(OUTPUT, relative(SOURCE, source));
  mkdirSync(dirname(target), { recursive: true });
  execFileSync('npx', ['--yes', '@gltf-transform/cli@4', 'optimize', source, target, ...FLAGS], { stdio: 'inherit' });
  const [a, b] = [statSync(source).size, statSync(target).size];
  before += a;
  after += b;
  console.log(`${relative(SOURCE, source)}: ${kb(a)} -> ${kb(b)}`);
}
console.log(`Total: ${kb(before)} -> ${kb(after)}`);
