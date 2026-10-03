import { describe, expect, it } from 'vitest';
import { ALL_MODELS, BARRIER_MODELS, CHARACTER_MODELS, SCENERY_MODELS } from './assetManifest';

describe('asset manifest', () => {
  it('lists the counts from the Blender asset spec', () => {
    expect(Object.keys(CHARACTER_MODELS)).toHaveLength(5);
    expect(BARRIER_MODELS.L).toHaveLength(4);
    expect(BARRIER_MODELS.H).toHaveLength(3);
    expect(BARRIER_MODELS.T).toHaveLength(2);
    expect(SCENERY_MODELS).toHaveLength(8);
  });

  it('has no duplicates and only .glb files under models/', () => {
    expect(new Set(ALL_MODELS).size).toBe(ALL_MODELS.length);
    for (const path of ALL_MODELS) expect(path).toMatch(/^models\/[a-z0-9/-]+\.glb$/);
  });
});
