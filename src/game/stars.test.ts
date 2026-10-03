import { describe, expect, it } from 'vitest';
import { FAIRNESS, LANES, OBSTACLES, RENDER, STAR_SPAWN, STARS, WORLD } from '../config';
import { createBarrierPool, moveBarriers, type Barrier } from './barriers';
import { baseSpeedAt, gapTimeFor, tierAt } from './difficulty';
import { createRun, stepRun, togglePause } from './run';
import { createSpawner, spawnStars, starChance, starLineLength, stepSpawner } from './spawner';
import { activeStarCount, createStarPool, moveStars, spawnStar, type Star } from './stars';
import { RateWindow } from './stats';

const DT = 1 / 60;

/** Vertical extent of a barrier, matching what is drawn. */
function barrierBox(barrier: Barrier): [number, number] {
  switch (barrier.type) {
    case 'L':
      return [0, OBSTACLES.LOW_HEIGHT];
    case 'H':
      return [OBSTACLES.HIGH_CLEARANCE, OBSTACLES.HIGH_CLEARANCE + RENDER.HIGH_BAR_THICKNESS];
    case 'T':
      return [0, OBSTACLES.TALL_HEIGHT];
  }
}

/** Whether a star (with its drawn radius) overlaps a barrier's box. */
function starInsideBarrier(star: Star, barrier: Barrier): boolean {
  const r = RENDER.STAR_RADIUS * (star.big ? RENDER.BIG_STAR_SCALE : 1);
  const [bottom, top] = barrierBox(barrier);
  return (
    Math.abs(star.x - barrier.x) < barrier.halfWidth + r &&
    Math.abs(star.z - barrier.z) < OBSTACLES.DEPTH / 2 + r &&
    star.y + r > bottom &&
    star.y - r < top
  );
}

describe('star placement', () => {
  it('a line has 5 to 10 stars', () => {
    expect(starLineLength(0)).toBe(STARS.LINE_MIN);
    expect(starLineLength(16.8)).toBe(7);
    expect(starLineLength(1000)).toBe(STARS.LINE_MAX);
  });

  it('chance stays between 0.2 and 0.9', () => {
    expect(starChance(1.4, 7)).toBeCloseTo(0.6);
    expect(starChance(0.1, 10)).toBe(STAR_SPAWN.CHANCE_MIN);
    expect(starChance(10, 5)).toBe(STAR_SPAWN.CHANCE_MAX);
  });

  it('a line starts 4 m in front of the row, 1.5 m apart, at y = 0.8', () => {
    const spawner = createSpawner(1);
    const stars = createStarPool();
    // Chance is clamped to 0.9, so try seeds until a line appears.
    for (let seed = 0; activeStarCount(stars) === 0; seed++) {
      spawner.rng.reseed(seed);
      spawnStars(spawner, ['.', '.', '.'], stars, 12, 1.4, 16.8, 10);
    }
    const line = stars.items.filter((s) => s.active).map((s) => s.z);
    expect(line[0]).toBeCloseTo(WORLD.SPAWN_Z + STAR_SPAWN.LEAD_DISTANCE);
    expect((line[1] ?? 0) - (line[0] ?? 0)).toBeCloseTo(STARS.SPACING);
    expect(stars.items.filter((s) => s.active).every((s) => s.y === STAR_SPAWN.Y)).toBe(true);
  });

  it('a line in a low-barrier lane adds 5 stars arcing over it, peaking near 2.0 m', () => {
    const spawner = createSpawner(1);
    const stars = createStarPool();
    for (let seed = 0; activeStarCount(stars) === 0; seed++) {
      spawner.rng.reseed(seed);
      spawnStars(spawner, ['L', 'T', 'T'], stars, 12, 1.4, 16.8, 10);
    }
    const arc = stars.items.filter((s) => s.active && s.y > STAR_SPAWN.Y);
    expect(arc).toHaveLength(STAR_SPAWN.ARC_COUNT);
    expect(Math.max(...arc.map((s) => s.y))).toBeCloseTo(STAR_SPAWN.ARC_PEAK_Y);
    expect(arc.every((s) => s.x === LANES.X[0])).toBe(true);
  });

  it('a big star appears about every 30 s', () => {
    const run = createRun(5);
    const bigTimes: number[] = [];
    let wasBig = false;
    while (run.time < 300) {
      run.hearts = 3;
      stepRun(run, DT, run.time);
      const hasBig = run.stars.items.some((s) => s.active && s.big);
      if (hasBig && !wasBig) bigTimes.push(run.time);
      wasBig = hasBig;
    }
    expect(bigTimes.length).toBeGreaterThanOrEqual(8);
    expect(bigTimes.length).toBeLessThanOrEqual(10);
    for (let i = 1; i < bigTimes.length; i++) {
      expect((bigTimes[i] ?? 0) - (bigTimes[i - 1] ?? 0)).toBeGreaterThanOrEqual(STARS.BIG_INTERVAL);
    }
  });

  it.each([1, 2, 3, 4])('no star is ever placed inside a barrier (seed %i, with hits)', (seed) => {
    const run = createRun(seed);
    let rows = 0;
    while (run.time < 200) {
      run.hearts = 3; // keep running through hits, so speeds change between rows
      stepRun(run, DT, run.time);
      if (run.spawner.rowsSpawned === rows) continue;
      rows = run.spawner.rowsSpawned;
      for (const star of run.stars.items) {
        if (!star.active) continue;
        for (const barrier of run.barriers.items) {
          if (barrier.active) expect(starInsideBarrier(star, barrier)).toBe(false);
        }
      }
    }
    expect(rows).toBeGreaterThan(100);
  });

  it.each([0, 80, 160])('places 150 to 220 stars per minute at %i s', (runTime) => {
    const spawner = createSpawner(runTime + 1);
    const barriers = createBarrierPool();
    const stars = createStarPool();
    const speed = baseSpeedAt(runTime);
    const gapTime = gapTimeFor(speed);
    const tier = tierAt(runTime);
    const minutes = 20;
    const spawnTime = Math.max(runTime, FAIRNESS.NO_BARRIER_START_TIME + DT);
    for (let t = 0; t < minutes * 60; t += DT) {
      const distance = speed * DT;
      moveBarriers(barriers, distance);
      moveStars(stars, distance);
      stepSpawner(spawner, barriers, stars, distance, speed, spawnTime, tier, gapTime);
    }
    const perMinute = spawner.starsPlaced / minutes;
    expect(perMinute).toBeGreaterThanOrEqual(150);
    expect(perMinute).toBeLessThanOrEqual(220);
    expect(stars.dropped).toBe(0);
  });
});

describe('star pickup', () => {
  it('collects a star in the hero lane and adds its value', () => {
    const run = createRun();
    spawnStar(run.stars, 0, STAR_SPAWN.Y, -3, false);
    spawnStar(run.stars, 0, STAR_SPAWN.Y, -5, true);
    for (let i = 0; i < 60; i++) stepRun(run, DT, i * DT);
    expect(run.starsCollected).toBe(2);
    expect(run.runStars).toBe(STARS.VALUE + STARS.BIG_VALUE);
    expect(run.collectFeed.count).toBe(2);
  });

  it('does not collect a star in another lane', () => {
    const run = createRun();
    spawnStar(run.stars, LANES.X[0] ?? 0, STAR_SPAWN.Y, -3, false);
    for (let i = 0; i < 60; i++) stepRun(run, DT, i * DT);
    expect(run.starsCollected).toBe(0);
  });

  it('catches a star even at the slowest allowed frame rate', () => {
    const run = createRun();
    run.time = 200; // top speed
    spawnStar(run.stars, 0, STAR_SPAWN.Y, -3, false);
    for (let i = 0; i < 10; i++) stepRun(run, 1 / 30, i / 30);
    expect(run.starsCollected).toBe(1);
  });
});

describe('pause', () => {
  it('freezes the run and resumes it', () => {
    const run = createRun();
    stepRun(run, DT, 0);
    togglePause(run);
    const time = run.time;
    for (let i = 0; i < 30; i++) stepRun(run, DT, i * DT);
    expect(run.time).toBe(time);
    togglePause(run);
    stepRun(run, DT, 1);
    expect(run.time).toBeGreaterThan(time);
  });
});

describe('rate window', () => {
  it('reports a per-minute rate over the recent window', () => {
    const rate = new RateWindow();
    for (let t = 0; t < 30; t += 0.5) rate.add(t, 1); // 2 per second
    expect(rate.perMinute(30)).toBeCloseTo(120);
  });

  it('forgets events older than the window', () => {
    const rate = new RateWindow();
    rate.add(1, 100);
    expect(rate.perMinute(200)).toBe(0);
  });
});
