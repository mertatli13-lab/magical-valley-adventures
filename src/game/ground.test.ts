import { describe, expect, it } from 'vitest';
import { GROUND, POOLS } from '../config';
import { createGround, stepGround } from './ground';
import { createRun, stepRun } from './run';

describe('ground', () => {
  it('keeps six chunks end to end while scrolling', () => {
    const ground = createGround();
    expect(ground.chunkZ).toHaveLength(POOLS.GROUND_CHUNKS);
    for (let frame = 0; frame < 5000; frame++) {
      stepGround(ground, 12 / 60);
      const sorted = [...ground.chunkZ].sort((a, b) => b - a);
      expect(sorted[0]).toBeLessThanOrEqual(GROUND.RECYCLE_Z);
      for (let i = 1; i < sorted.length; i++) {
        expect((sorted[i - 1] ?? 0) - (sorted[i] ?? 0)).toBeCloseTo(GROUND.CHUNK_LENGTH, 6);
      }
    }
  });

  it('always covers the hero at z = 0', () => {
    const ground = createGround();
    for (let frame = 0; frame < 2000; frame++) {
      stepGround(ground, 28 / 30);
      const half = GROUND.CHUNK_LENGTH / 2;
      expect(ground.chunkZ.some((z) => z - half <= 0 && z + half >= 0)).toBe(true);
    }
  });
});

describe('run', () => {
  it('scrolls at 12 m/s and clamps slow frames to 1/30 s', () => {
    const run = createRun();
    stepRun(run, 1 / 60, 0);
    expect(run.speed).toBe(12);
    expect(run.distance).toBeCloseTo(12 / 60);
    stepRun(run, 1, 0);
    expect(run.distance).toBeCloseTo(12 / 60 + 12 / 30);
  });

  it('reuses the same chunk array during a run', () => {
    const run = createRun();
    const chunks = run.ground.chunkZ;
    for (let i = 0; i < 1000; i++) stepRun(run, 1 / 60, i / 60);
    expect(run.ground.chunkZ).toBe(chunks);
  });
});
