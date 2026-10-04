import { ACCESSORIES, CHARACTERS, type CharacterId } from '../game/catalogue';
import type { BarrierType } from '../game/barriers';

/**
 * Every model the game loads, from the Blender asset spec in docs/design.md.
 * Paths are relative to the site root (public/). Any missing file falls back
 * to the grey-box placeholder.
 */
export const CHARACTER_MODELS: Readonly<Record<CharacterId, string>> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, `models/characters/${c.id}.glb`]),
) as Record<CharacterId, string>;

/** Barrier models by type. Each spawned barrier uses one of its type's models. */
export const BARRIER_MODELS: Readonly<Record<BarrierType, readonly string[]>> = {
  L: [
    'models/barriers/candy-pile.glb',
    'models/barriers/cupcake.glb',
    'models/barriers/macaron-stack.glb',
    'models/barriers/lollipop-log.glb',
  ],
  H: ['models/barriers/cloud-bar.glb', 'models/barriers/donut-arch.glb', 'models/barriers/candy-floss-banner.glb'],
  T: ['models/barriers/layer-cake.glb', 'models/barriers/jelly-tower.glb'],
};

/** The three-lane cloud bar for "HHH" rows (asset spec: the cloud bar comes in two widths). */
export const WIDE_CLOUD_BAR_MODEL = 'models/barriers/cloud-bar-wide.glb';

export const ACCESSORY_MODELS: Readonly<Record<string, string>> = Object.fromEntries(
  ACCESSORIES.map((a) => [a.id, `models/accessories/${a.id}.glb`]),
);

/** Star and big star in one file, as nodes named "Star" and "BigStar". */
export const STAR_MODEL = 'models/star.glb';

export const GROUND_MODEL = 'models/valley/ground.glb';
export const SKY_MODEL = 'models/valley/sky.glb';

/** Side scenery: 2 trees, 2 mushrooms, 2 flower clumps, a rock and a lantern. */
export const SCENERY_MODELS: readonly string[] = [
  'models/valley/tree-1.glb',
  'models/valley/tree-2.glb',
  'models/valley/mushroom-1.glb',
  'models/valley/mushroom-2.glb',
  'models/valley/flowers-1.glb',
  'models/valley/flowers-2.glb',
  'models/valley/rock.glb',
  'models/valley/lantern.glb',
];

/** Named empties on each character where accessories attach. */
export const ATTACH_EMPTIES = ['acc_head', 'acc_neck', 'acc_back'] as const;

/** The joint each attach point follows on a model that has no empties (auto-rigged models). */
export const ATTACH_BONES = { acc_head: 'head_end', acc_neck: 'neck', acc_back: 'Spine' } as const;

export const ALL_MODELS: readonly string[] = [
  ...Object.values(CHARACTER_MODELS),
  ...Object.values(BARRIER_MODELS).flat(),
  WIDE_CLOUD_BAR_MODEL,
  ...Object.values(ACCESSORY_MODELS),
  STAR_MODEL,
  GROUND_MODEL,
  SKY_MODEL,
  ...SCENERY_MODELS,
];
