# Models

The game loads these GLB files at startup, behind the loading bar on the
Landing screen. Any file that is missing is replaced by a grey-box or pastel
placeholder, with a warning in the browser console, so the game always runs.
Export settings and budgets are in docs/design.md, "Blender asset spec".

| File | Notes |
|---|---|
| `characters/strawberry.glb`, `ginza.glb`, `chity.glb`, `kusto.glb`, `sugar.glb` | About 1.2 m tall, origin at the feet. Clips named exactly `Idle`, `Run`, `Jump`, `Slide`, `Hit`, `Out`, `Celebrate`, `Signature`. Empties named `acc_head`, `acc_neck`, `acc_back`. Modelled facing the camera after export; the game turns them around. |
| `barriers/candy-pile.glb`, `cupcake.glb`, `macaron-stack.glb`, `lollipop-log.glb` | Low barriers. Origin at the bottom centre. |
| `barriers/cloud-bar.glb`, `donut-arch.glb`, `candy-floss-banner.glb` | High barriers, with 0.9 m clear underneath. Origin at the bottom centre (on the ground). |
| `barriers/cloud-bar-wide.glb` | The three-lane cloud bar for full rows. If missing, `cloud-bar.glb` is stretched. |
| `barriers/layer-cake.glb`, `jelly-tower.glb` | Tall barriers. Origin at the bottom centre. |
| `accessories/<id>.glb` | One per accessory id in `src/game/catalogue.ts` (for example `wizard-hat.glb`). Origin where it touches its attach empty. |
| `star.glb` | Two nodes named `Star` and `BigStar`, centred on their origin. |
| `valley/ground.glb` | One 40 m x 10 m chunk, origin at its centre, path along -Z. |
| `valley/sky.glb` | Sky dome; scaled to fit around the camera. |
| `valley/tree-1.glb`, `tree-2.glb`, `mushroom-1.glb`, `mushroom-2.glb`, `flowers-1.glb`, `flowers-2.glb`, `rock.glb`, `lantern.glb` | Side scenery. Origin at the base. |

Hitboxes never come from the models; they are set in `src/config.ts`.
