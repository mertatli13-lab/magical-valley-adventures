# Blender exports

Put the GLB files exported from Blender here, in the same layout as
`public/models/` (for example `characters/strawberry.glb`). Then run:

```sh
npm run optimize:models
```

It writes compressed copies to `public/models/`, which is what the game loads.
File names, origins, node names and clip names are listed in
`public/models/README.md`.

Character models generated with Meshy (directly or through Higgsfield) go
through `scripts/prep-meshy.py` first. It shrinks the texture to 1024 px,
renames the idle clip to `Idle`, and can scale an unrigged model to a height
with its origin at the feet:

```sh
python3 scripts/prep-meshy.py meshy-output.glb art/models/characters/ginza.glb 1.15
```

## Four-legged characters (Ginza, Sugar)

Meshy's auto-rig is humanoid only, so the ponies are rigged and animated in
code with Blender's Python module. The unrigged Meshy models live in
`art/meshy/` (outside this folder, so `optimize:models` ignores them).

```sh
python3.11 -m venv .blender && .blender/bin/pip install bpy==4.5.3 numpy
.blender/bin/python -I scripts/rig-quadruped.py -- art/meshy/ginza.glb art/models/characters/ginza.glb --character ginza
npm run optimize:models
```

`scripts/rig-quadruped.py` straightens the model, cuts it to the 8,000-triangle
budget, builds a 19-bone skeleton from the joint table in `SKELETONS`, skins
it, adds the `acc_*` empties and keys all eight clips at 30 fps. It checks the
spec's limits: the slide stays under 0.6 m and the tumble under the 0.9 m gap
below high barriers. Add `--previews <dir>` for rendered key frames.
A new four-legged character needs its own `SKELETONS` entry (joint positions
in metres, measured from a side and a front render). An entry can also give a
rigid `horn` bone (Sugar's, so her horn doesn't follow the ear beside it), a
mane chain of any length, its `signature` (`tumble` for Ginza, `skid` for
Sugar's rainbow dash) and `tune`, small changes to the shared poses.

```sh
.blender/bin/python -I scripts/rig-quadruped.py -- art/meshy/sugar.glb art/models/characters/sugar.glb --character sugar
```
