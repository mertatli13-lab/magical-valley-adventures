# Blender exports

Put the GLB files exported from Blender here, in the same layout as
`public/models/` (for example `characters/strawberry.glb`). Then run:

```sh
npm run optimize:models
```

It writes compressed copies to `public/models/`, which is what the game loads.
File names, origins, node names and clip names are listed in
`public/models/README.md`.
