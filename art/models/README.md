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
