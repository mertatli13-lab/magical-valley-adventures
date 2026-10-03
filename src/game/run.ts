import { HEARTS, MAX_DT, PHASE1_SPEED, SPAWNER } from '../config';
import {
  createBarrierPool,
  moveBarriers,
  resetBarrierPool,
  type Barrier,
  type BarrierPool,
  type BarrierType,
} from './barriers';
import { sweptOverlapZ, touchesBarrier } from './collision';
import { effectiveSpeed, gapTimeFor, tierAt } from './difficulty';
import { createGround, resetGround, stepGround, type GroundState } from './ground';
import { InputBuffer } from './input';
import { createPlayer, resetPlayer, updatePlayer, type PlayerState } from './player';
import { createSpawner, resetSpawner, stepSpawner, type SpawnerState } from './spawner';

export type RunStatus = 'RUNNING' | 'OUT';

/** Everything the simulation of one run needs. Created once and reused across runs. */
export interface RunState {
  status: RunStatus;
  time: number;
  distance: number;
  /** Speed before the hit slowdown. Constant until the difficulty curve (Phase 3). */
  baseSpeed: number;
  /** Speed the world actually scrolls at this frame. */
  speed: number;
  tier: number;
  gapTime: number;
  /** A tier chosen in the debug panel, or null to follow run time. */
  forcedTier: number | null;
  hearts: number;
  /** True while the current safety comes from a hit, so the hit slowdown applies. */
  wasHit: boolean;
  /** Increases on every hit; the scene watches it to play the pop effect. */
  hitCount: number;
  lastHitType: BarrierType;
  lastHitX: number;
  lastHitZ: number;
  player: PlayerState;
  ground: GroundState;
  barriers: BarrierPool;
  spawner: SpawnerState;
  input: InputBuffer;
}

export function createRun(seed: number = SPAWNER.DEFAULT_SEED): RunState {
  const run: RunState = {
    status: 'RUNNING',
    time: 0,
    distance: 0,
    baseSpeed: PHASE1_SPEED,
    speed: PHASE1_SPEED,
    tier: 0,
    gapTime: gapTimeFor(PHASE1_SPEED),
    forcedTier: null,
    hearts: HEARTS.START,
    wasHit: false,
    hitCount: 0,
    lastHitType: 'L',
    lastHitX: 0,
    lastHitZ: 0,
    player: createPlayer(),
    ground: createGround(),
    barriers: createBarrierPool(),
    spawner: createSpawner(seed),
    input: new InputBuffer(),
  };
  return run;
}

/** Starts a fresh run in the same objects. The forced tier is kept. */
export function resetRun(run: RunState, seed: number = SPAWNER.DEFAULT_SEED): void {
  run.status = 'RUNNING';
  run.time = 0;
  run.distance = 0;
  run.baseSpeed = PHASE1_SPEED;
  run.speed = PHASE1_SPEED;
  run.tier = 0;
  run.gapTime = gapTimeFor(PHASE1_SPEED);
  run.hearts = HEARTS.START;
  run.wasHit = false;
  run.hitCount = 0;
  resetPlayer(run.player);
  resetGround(run.ground);
  resetBarrierPool(run.barriers);
  resetSpawner(run.spawner, seed);
  run.input.consume();
}

/** Clamps a real frame time so a slow frame cannot cause a huge jump (A8). */
export function frameDt(realDt: number): number {
  return Math.min(realDt, MAX_DT);
}

/** A barrier hit (A6 onHit): lose a heart, become safe, pop the barrier. */
function onHit(run: RunState, barrier: Barrier): void {
  run.hearts = Math.max(0, run.hearts - HEARTS.HIT_COST);
  run.player.safeTimer = HEARTS.HIT_SAFE_TIME;
  run.wasHit = true;
  run.hitCount++;
  run.lastHitType = barrier.type;
  run.lastHitX = barrier.x;
  run.lastHitZ = barrier.z;
  barrier.active = false;
  if (run.hearts === 0) run.status = 'OUT';
}

/** Checks every active barrier the player's box was swept across this frame (A6). */
function collide(run: RunState, distance: number): void {
  const items = run.barriers.items;
  for (let i = 0; i < items.length; i++) {
    const barrier = items[i];
    if (!barrier?.active || !sweptOverlapZ(barrier, distance)) continue;
    if (touchesBarrier(run.player, barrier) && run.player.safeTimer === 0) onHit(run, barrier);
  }
}

/**
 * Advances the run by one frame. `now` is in seconds, on the same clock as
 * input timestamps. Does nothing once the hero is out.
 */
export function stepRun(run: RunState, realDt: number, now: number): void {
  if (run.status !== 'RUNNING') return;
  const dt = frameDt(realDt);
  run.time += dt;
  run.baseSpeed = PHASE1_SPEED;
  run.speed = effectiveSpeed(run.baseSpeed, run.player.safeTimer, run.wasHit);
  run.gapTime = gapTimeFor(run.baseSpeed);
  run.tier = run.forcedTier ?? tierAt(run.time);

  const distance = run.speed * dt;
  run.distance += distance;
  updatePlayer(run.player, run.input, now, dt);
  stepGround(run.ground, distance);
  moveBarriers(run.barriers, distance);
  stepSpawner(run.spawner, run.barriers, distance, run.speed, run.time, run.tier, run.gapTime);
  collide(run, distance);
  if (run.player.safeTimer === 0) run.wasHit = false;
}
