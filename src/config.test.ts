import { describe, expect, it } from 'vitest';
import {
  ACCESSORY_TIERS,
  CAMERA,
  CHARACTER_PRICES,
  ECONOMY,
  HEARTS,
  INPUT_BUFFER_TIME,
  JUMP,
  LANE_CHANGE_TIME,
  LANES,
  PLAYER,
  REVIVE,
  ROW_GAP,
  SIGNATURE_MOVE_PRICE,
  SLIDE,
  SPAWNER,
  SPEED,
  STARS,
  TIER_THRESHOLDS,
  WORLD,
} from './config';

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

describe('run rules', () => {
  it('has three 2 m lanes centred at -2, 0 and +2', () => {
    expect(LANES.COUNT).toBe(3);
    expect(LANES.WIDTH).toBe(2);
    expect(LANES.X).toEqual([-2, 0, 2]);
    expect(LANE_CHANGE_TIME).toBe(0.12);
  });

  it('jump physics give 1.6 m height and 0.6 s air time', () => {
    const peak = JUMP.VELOCITY ** 2 / (2 * JUMP.GRAVITY);
    const airTime = (2 * JUMP.VELOCITY) / JUMP.GRAVITY;
    expect(peak).toBeCloseTo(JUMP.HEIGHT, 1);
    expect(airTime).toBeCloseTo(JUMP.AIR_TIME, 1);
  });

  it('slide halves the standing height for 0.7 s', () => {
    expect(SLIDE.TIME).toBe(0.7);
    expect(PLAYER.SLIDE_HEIGHT).toBe(PLAYER.STAND_HEIGHT * SLIDE.HEIGHT_FACTOR);
    expect(INPUT_BUFFER_TIME).toBe(0.15);
  });

  it('hearts and revive values match the design', () => {
    expect(HEARTS.START).toBe(3);
    expect(HEARTS.HIT_SAFE_TIME).toBe(1.5);
    expect(REVIVE.OFFER_TIME).toBe(5);
    expect(REVIVE.HEARTS).toBe(3);
    expect(REVIVE.CLEAR_DISTANCE).toBe(30);
    expect(REVIVE.SAFE_TIME).toBe(2);
    const costs = [0, 1, 2].map((n) => REVIVE.BASE_COST * REVIVE.COST_MULTIPLIER ** n);
    expect(costs).toEqual([100, 200, 400]);
    expect(REVIVE.MAX_PER_RUN).toBe(3);
  });

  it('stars come in lines of 5 to 10, 1.5 m apart', () => {
    expect([STARS.LINE_MIN, STARS.LINE_MAX, STARS.SPACING]).toEqual([5, 10, 1.5]);
    expect([STARS.VALUE, STARS.BIG_VALUE]).toEqual([1, 10]);
  });
});

describe('difficulty curve', () => {
  it('speed ramps from 12 to 28 m/s over 160 s', () => {
    expect(SPEED.START + SPEED.ACCELERATION * SPEED.RAMP_TIME).toBeCloseTo(SPEED.MAX);
    expect([SPEED.START, SPEED.MAX]).toEqual([12, 28]);
  });

  it('row gap shrinks from 1.4 s to 0.85 s at full progress', () => {
    expect(ROW_GAP.PROGRESS_RANGE).toBe(SPEED.MAX - SPEED.START);
    expect(ROW_GAP.START - ROW_GAP.SHRINK).toBeCloseTo(ROW_GAP.MIN);
  });

  it('has one pattern tier per threshold plus the starting tier', () => {
    expect(SPAWNER.PATTERNS).toHaveLength(TIER_THRESHOLDS.length + 1);
    for (const tier of SPAWNER.PATTERNS) {
      for (const pattern of tier) expect(pattern).toMatch(/^[.LHT]{3}$/);
    }
  });
});

describe('star economy', () => {
  it('earns two thirds of the stars placed', () => {
    expect(ECONOMY.STARS_PLACED_PER_MINUTE * ECONOMY.EXPECTED_COLLECT_RATIO).toBeCloseTo(
      ECONOMY.STARS_EARNED_PER_MINUTE,
    );
  });

  it('prices add up to the totals in the design', () => {
    const characters = sum(Object.values(CHARACTER_PRICES));
    const moves = SIGNATURE_MOVE_PRICE * Object.keys(CHARACTER_PRICES).length;
    const accessories = sum(Object.values(ACCESSORY_TIERS).map((t) => t.PRICE * t.COUNT));
    expect(characters).toBe(0); // every character is free from the start
    expect(moves).toBe(4000);
    expect(accessories).toBe(3000);
    expect(characters + moves + accessories).toBe(7000);
  });
});

describe('world conventions', () => {
  it('keeps the hero at z = 0 with objects spawning ahead', () => {
    expect(PLAYER.Z).toBe(0);
    expect(WORLD.SPAWN_Z).toBe(-120);
    expect(WORLD.RECYCLE_Z).toBe(10);
    expect(CAMERA.POSITION).toEqual([0, 3.2, 6.5]);
    expect(CAMERA.LOOK_AT).toEqual([0, 1, -8]);
  });
});
