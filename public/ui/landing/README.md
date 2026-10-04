# Landing artwork

The Landing screen loads these WebP images from this folder. Any file that is missing
is replaced by a drawn placeholder, so the game works before the art exists.

| File | What it is |
|---|---|
| `sky-16x9.webp` | Daytime sky background for landscape screens |
| `sky-9x16.webp` | Daytime sky background for portrait screens |
| `clouds.webp` | Clouds and ribbons on a transparent background; its left and right edges must match, because it repeats as it drifts sideways |
| `strawberry.webp`, `ginza.webp`, `chity.webp`, `kusto.webp`, `sugar.webp` | Each character floating, cut out on a transparent background |

See "Higgsfield prompt pack → 4. Menu artwork layers" in docs/design.md.
