import { describe, expect, it } from 'vitest';
import { FAIRNESS, LANES, OBSTACLES, POOLS, ROW_GAP, SPAWNER, WORLD } from '../config';
import { activeBarrierCount, createBarrierPool } from './barriers';
import { gapTimeFor, tierAt } from './difficulty';
import { Random } from './random';
import { commitRow, createSpawner, generateRow, isFair, LIBRARY, placeRow, type Row } from './spawner';

const ROWS_PER_TIER = 10_000;
const TIERS = [0, 1, 2, 3];
const GAP_TIMES = [ROW_GAP.START, ROW_GAP.MIN];

const openLanes = (row: Row) => [0, 1, 2].filter((lane) => row[lane] !== 'T');

describe('random', () => {
  it('replays the same sequence for the same seed', () => {
    const a = new Random(42);
    const b = new Random(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('stays in [0, 1)', () => {
    const random = new Random(3);
    for (let i = 0; i < 10_000; i++) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('difficulty helpers', () => {
  it('tier follows run time', () => {
    expect([0, 39.9, 40, 79.9, 80, 119.9, 120, 500].map(tierAt)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('gap time is 1.4 s at 12 m/s and 0.85 s at 28 m/s', () => {
    expect(gapTimeFor(12)).toBeCloseTo(1.4);
    expect(gapTimeFor(28)).toBeCloseTo(0.85);
  });
});

describe('pattern library', () => {
  it('each tier contains the tiers before it', () => {
    expect(LIBRARY.map((tier) => tier.length)).toEqual([2, 6, 9, 14]);
    expect(LIBRARY[3]?.map((row) => row.join(''))).toContain('HHH');
  });
});

describe('isFair', () => {
  it('rejects a row of three tall barriers', () => {
    expect(isFair(['T', 'T', 'T'], null, ROW_GAP.START)).toBe(false);
  });

  it('rejects a safe lane two lanes away when the gap is under 1.0 s', () => {
    expect(isFair(['.', 'T', 'T'], ['T', 'T', '.'], ROW_GAP.MIN)).toBe(false);
    expect(isFair(['.', 'T', 'T'], ['T', 'T', '.'], ROW_GAP.START)).toBe(true);
    expect(isFair(['T', '.', 'T'], ['T', 'T', '.'], ROW_GAP.MIN)).toBe(true);
  });
});

describe.each(TIERS)('generated rows, tier %i', (tier) => {
  it.each(GAP_TIMES)(`never has tall barriers in all three lanes over ${ROWS_PER_TIER} rows (gap %f s)`, (gapTime) => {
    const spawner = createSpawner(tier + 1);
    for (let i = 0; i < ROWS_PER_TIER; i++) {
      const row = generateRow(spawner, tier, gapTime);
      expect(openLanes(row).length).toBeGreaterThan(0);
      commitRow(spawner);
    }
  });

  it(`never breaks the rule for gaps under 1.0 s over ${ROWS_PER_TIER} rows`, () => {
    const gapTime = ROW_GAP.MIN;
    expect(gapTime).toBeLessThan(FAIRNESS.CLOSE_GAP_TIME);
    const spawner = createSpawner(100 + tier);
    let previous: Row | null = null;
    for (let i = 0; i < ROWS_PER_TIER; i++) {
      const row = [...generateRow(spawner, tier, gapTime)];
      if (previous) {
        const prevOpen = openLanes(previous);
        const reachable = openLanes(row).some((lane) =>
          prevOpen.some((prevLane) => Math.abs(lane - prevLane) <= FAIRNESS.MAX_SAFE_LANE_SHIFT),
        );
        expect(reachable).toBe(true);
      }
      commitRow(spawner);
      previous = row;
    }
  });

  it('only uses patterns from its tier', () => {
    const allowed = new Set((LIBRARY[tier] ?? []).map((row) => [...row].sort().join('')));
    allowed.add('...'); // the fallback when no fair row is found
    const spawner = createSpawner(7);
    for (let i = 0; i < 2000; i++) {
      expect(allowed.has([...generateRow(spawner, tier, ROW_GAP.START)].sort().join(''))).toBe(true);
      commitRow(spawner);
    }
  });
});

describe('placeRow', () => {
  it('places one barrier per filled cell at the spawn point', () => {
    const pool = createBarrierPool();
    placeRow(['L', '.', 'T'], pool);
    const active = pool.items.filter((b) => b.active);
    expect(active.map((b) => [b.type, b.x, b.z])).toEqual([
      ['L', LANES.X[0], WORLD.SPAWN_Z],
      ['T', LANES.X[2], WORLD.SPAWN_Z],
    ]);
  });

  it('turns HHH into one wide cloud bar', () => {
    const pool = createBarrierPool();
    placeRow(['H', 'H', 'H'], pool);
    expect(activeBarrierCount(pool)).toBe(1);
    expect(pool.items[0]?.halfWidth).toBe(OBSTACLES.WIDE_HALF_WIDTH);
  });

  it('drops barriers instead of growing when the pool is full', () => {
    const pool = createBarrierPool();
    for (let i = 0; i < POOLS.BARRIERS; i++) placeRow(['T', '.', '.'], pool);
    placeRow(['T', '.', '.'], pool);
    expect(pool.items).toHaveLength(POOLS.BARRIERS);
    expect(pool.dropped).toBe(1);
  });

  it('uses the default seed for replays', () => {
    expect(SPAWNER.DEFAULT_SEED).toBeTypeOf('number');
  });
});
