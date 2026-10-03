import { describe, expect, it } from 'vitest';
import { FAIRNESS, HEARTS, JUMP, LANES, MAX_DT, PLAYER, SPEED } from '../config';
import { activeBarrierCount, spawnBarrier, type BarrierType } from './barriers';
import { sweptOverlapZ, touchesBarrier } from './collision';
import { applyAction, laneX } from './player';
import { createRun, resetRun, stepRun, type RunState } from './run';

const DT = 1 / 60;

/** A run with one barrier in the hero's lane, `distance` metres ahead. */
function runWithBarrier(type: BarrierType, distance: number): RunState {
  const run = createRun();
  spawnBarrier(run.barriers, type, laneX(LANES.START_INDEX), -distance, 0.9);
  return run;
}

/** Steps until the barrier has passed the hero (or 3 s, before any spawns). */
function runPast(run: RunState, onFrame?: (time: number) => void): void {
  let time = 0;
  while (time < 2.5) {
    onFrame?.(time);
    stepRun(run, DT, time);
    time += DT;
  }
}

/** When to press so the hero is at the top of the jump as the barrier arrives. */
function jumpTimeFor(distance: number): number {
  return distance / SPEED.START - JUMP.AIR_TIME / 2;
}

describe('first 3 seconds', () => {
  it('have no barriers', () => {
    const run = createRun();
    let time = 0;
    while (time + DT <= FAIRNESS.NO_BARRIER_START_TIME) {
      stepRun(run, DT, time);
      time += DT;
      expect(activeBarrierCount(run.barriers)).toBe(0);
    }
    for (let i = 0; i < 10; i++) stepRun(run, DT, (time += DT));
    expect(activeBarrierCount(run.barriers)).toBeGreaterThan(0);
  });
});

describe('low barrier', () => {
  it('is cleared by jumping', () => {
    const distance = 10;
    const run = runWithBarrier('L', distance);
    let jumped = false;
    runPast(run, (time) => {
      if (!jumped && time >= jumpTimeFor(distance)) {
        applyAction(run.player, 'JUMP');
        jumped = true;
      }
    });
    expect(run.hearts).toBe(HEARTS.START);
  });

  it('is a hit when running into it', () => {
    const run = runWithBarrier('L', 10);
    runPast(run);
    expect(run.hearts).toBe(HEARTS.START - 1);
  });

  it('is a hit when sliding into it', () => {
    const run = runWithBarrier('L', 10);
    runPast(run, () => applyAction(run.player, 'SLIDE'));
    expect(run.hearts).toBe(HEARTS.START - 1);
  });
});

describe('high barrier', () => {
  it('is cleared by sliding', () => {
    const distance = 10;
    const run = runWithBarrier('H', distance);
    let slid = false;
    runPast(run, (time) => {
      // Slide shortly before it arrives; the 0.7 s slide covers the crossing.
      if (!slid && time >= distance / SPEED.START - 0.3) {
        applyAction(run.player, 'SLIDE');
        slid = true;
      }
    });
    expect(run.hearts).toBe(HEARTS.START);
  });

  it('is a hit when standing', () => {
    const run = runWithBarrier('H', 10);
    runPast(run);
    expect(run.hearts).toBe(HEARTS.START - 1);
  });

  it('is a hit when jumping', () => {
    const distance = 10;
    const run = runWithBarrier('H', distance);
    let jumped = false;
    runPast(run, (time) => {
      if (!jumped && time >= jumpTimeFor(distance)) {
        applyAction(run.player, 'JUMP');
        jumped = true;
      }
    });
    expect(run.hearts).toBe(HEARTS.START - 1);
  });
});

describe('tall barrier', () => {
  it('is a hit even at the top of a jump', () => {
    const run = runWithBarrier('T', 10);
    const player = run.player;
    player.y = JUMP.HEIGHT;
    expect(touchesBarrier(player, run.barriers.items[0]!)).toBe(true);
  });

  it('is avoided by changing lane', () => {
    const run = runWithBarrier('T', 10);
    applyAction(run.player, 'LEFT');
    runPast(run);
    expect(run.hearts).toBe(HEARTS.START);
  });

  it('is a hit while half way through a lane change', () => {
    const run = runWithBarrier('T', 10);
    run.player.x = laneX(LANES.START_INDEX) - LANES.WIDTH / 2;
    expect(touchesBarrier(run.player, run.barriers.items[0]!)).toBe(true);
  });
});

describe('swept collision', () => {
  it('catches a barrier that jumps past the player in one frame', () => {
    const run = createRun();
    const barrier = spawnBarrier(run.barriers, 'T', 0, 5, 0.9)!;
    // The barrier moved from z = -5 to z = 5 this frame: it went straight through.
    expect(sweptOverlapZ(barrier, 10)).toBe(true);
    expect(sweptOverlapZ(barrier, 1)).toBe(false);
  });

  it('never skips a barrier at the clamped frame time', () => {
    for (const fps of [10, 20, 30, 60]) {
      const run = runWithBarrier('T', 10);
      let time = 0;
      while (time < 2.5) {
        stepRun(run, 1 / fps, time);
        time += 1 / fps;
      }
      expect(run.hearts).toBe(HEARTS.START - 1);
    }
    expect(MAX_DT).toBeLessThanOrEqual(1 / 30);
  });
});

describe('hits and hearts', () => {
  it('a hit pops the barrier, gives 1.5 s of safety and slows the world by 20%', () => {
    const run = runWithBarrier('T', 3);
    let time = 0;
    while (run.hearts === HEARTS.START) {
      stepRun(run, DT, time);
      time += DT;
    }
    expect(activeBarrierCount(run.barriers)).toBe(0);
    expect(run.player.safeTimer).toBe(HEARTS.HIT_SAFE_TIME);
    stepRun(run, DT, (time += DT));
    expect(run.speed).toBeCloseTo(run.baseSpeed * HEARTS.HIT_SPEED_FACTOR);
    for (let t = 0; t < HEARTS.HIT_SAFE_TIME; t += DT) stepRun(run, DT, (time += DT));
    expect(run.player.safeTimer).toBe(0);
    stepRun(run, DT, (time += DT));
    expect(run.speed).toBe(run.baseSpeed);
  });

  it('a barrier touched while safe costs nothing', () => {
    const run = runWithBarrier('T', 3);
    run.player.safeTimer = HEARTS.HIT_SAFE_TIME;
    runPast(run);
    expect(run.hearts).toBe(HEARTS.START);
  });

  it('a run with no input loses three hearts, ends and freezes', () => {
    const run = createRun(12345);
    let time = 0;
    while (run.status === 'RUNNING' && time < 600) {
      stepRun(run, DT, time);
      time += DT;
    }
    expect(run.status).toBe('OUT');
    expect(run.hearts).toBe(0);
    const frozen = { time: run.time, distance: run.distance, z: run.ground.chunkZ[0] };
    for (let i = 0; i < 60; i++) stepRun(run, DT, (time += DT));
    expect({ time: run.time, distance: run.distance, z: run.ground.chunkZ[0] }).toEqual(frozen);
  });

  it('a restart gives a fresh run in the same objects', () => {
    const run = createRun(1);
    const pool = run.barriers.items;
    let time = 0;
    while (run.status === 'RUNNING' && time < 600) stepRun(run, DT, (time += DT));
    resetRun(run, 2);
    expect(run.status).toBe('RUNNING');
    expect(run.hearts).toBe(HEARTS.START);
    expect(run.time).toBe(0);
    expect(activeBarrierCount(run.barriers)).toBe(0);
    expect(run.barriers.items).toBe(pool);
  });

  it('the same seed replays the same run', () => {
    const play = (seed: number) => {
      const run = createRun(seed);
      let time = 0;
      while (run.status === 'RUNNING' && time < 600) stepRun(run, DT, (time += DT));
      return run.time;
    };
    expect(play(99)).toBe(play(99));
  });

  it('the player box matches the design', () => {
    expect(PLAYER.HALF_WIDTH * 2).toBeCloseTo(0.7);
  });
});
