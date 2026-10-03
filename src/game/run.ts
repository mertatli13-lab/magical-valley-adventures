import { COLLISION, HEARTS, MAX_DT, PLAYER, REVIVE, SPAWNER } from '../config';
import {
  createBarrierPool,
  moveBarriers,
  resetBarrierPool,
  type Barrier,
  type BarrierPool,
  type BarrierType,
} from './barriers';
import { sweptOverlapZ, touchesBarrier } from './collision';
import { baseSpeedAt, effectiveSpeed, gapTimeFor, tierAt } from './difficulty';
import { createGround, resetGround, stepGround, type GroundState } from './ground';
import { InputBuffer } from './input';
import { clamp } from './math';
import { createPlayer, resetPlayer, updatePlayer, type PlayerState } from './player';
import { createSpawner, resetSpawner, stepSpawner, type SpawnerState } from './spawner';
import {
  createCollectFeed,
  createStarPool,
  moveStars,
  pushCollect,
  resetStarPool,
  starValue,
  type CollectFeed,
  type StarPool,
} from './stars';
import { RateWindow } from './stats';

export type RunStatus = 'RUNNING' | 'OUT';

/** Everything the simulation of one run needs. Created once and reused across runs. */
export interface RunState {
  status: RunStatus;
  time: number;
  distance: number;
  /** Speed before the hit slowdown (A4). */
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
  /** Run score: the value of stars collected (a big star is worth 10). Shown in the HUD. */
  runStarsCollected: number;
  /** This run's stars still unspent; revives are paid from these first (A7). */
  runStars: number;
  /** Metres left after a revive during which no barrier rows spawn (A5). */
  reviveClearRemaining: number;
  /** Number of star pickups this run. */
  starsCollected: number;
  collectFeed: CollectFeed;
  /** Stars placed and collected per minute, for the debug panel. */
  placedRate: RateWindow;
  collectedRate: RateWindow;
  player: PlayerState;
  ground: GroundState;
  barriers: BarrierPool;
  stars: StarPool;
  spawner: SpawnerState;
  input: InputBuffer;
}

export function createRun(seed: number = SPAWNER.DEFAULT_SEED): RunState {
  const run: RunState = {
    status: 'RUNNING',
    time: 0,
    distance: 0,
    baseSpeed: baseSpeedAt(0),
    speed: baseSpeedAt(0),
    tier: 0,
    gapTime: gapTimeFor(baseSpeedAt(0)),
    forcedTier: null,
    hearts: HEARTS.START,
    wasHit: false,
    hitCount: 0,
    lastHitType: 'L',
    lastHitX: 0,
    lastHitZ: 0,
    runStarsCollected: 0,
    runStars: 0,
    reviveClearRemaining: 0,
    starsCollected: 0,
    collectFeed: createCollectFeed(),
    placedRate: new RateWindow(),
    collectedRate: new RateWindow(),
    player: createPlayer(),
    ground: createGround(),
    barriers: createBarrierPool(),
    stars: createStarPool(),
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
  run.baseSpeed = baseSpeedAt(0);
  run.speed = run.baseSpeed;
  run.tier = 0;
  run.gapTime = gapTimeFor(run.baseSpeed);
  run.hearts = HEARTS.START;
  run.wasHit = false;
  run.hitCount = 0;
  run.runStarsCollected = 0;
  run.runStars = 0;
  run.reviveClearRemaining = 0;
  run.starsCollected = 0;
  run.placedRate.reset();
  run.collectedRate.reset();
  resetPlayer(run.player);
  resetGround(run.ground);
  resetBarrierPool(run.barriers);
  resetStarPool(run.stars);
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
function collideBarriers(run: RunState, distance: number): void {
  const items = run.barriers.items;
  for (let i = 0; i < items.length; i++) {
    const barrier = items[i];
    if (!barrier?.active || !sweptOverlapZ(barrier, distance)) continue;
    if (touchesBarrier(run.player, barrier) && run.player.safeTimer === 0) onHit(run, barrier);
  }
}

/**
 * Collects every star within the pickup radius of the player's centre (A6).
 * Each star moved from z - distance to z this frame, so its closest point to
 * the hero along that path is used and fast frames cannot skip a star.
 */
function collectStars(run: RunState, distance: number): void {
  const { player } = run;
  const centerY = player.y + player.height / 2;
  const radiusSquared = COLLISION.STAR_PICKUP_RADIUS * COLLISION.STAR_PICKUP_RADIUS;
  const items = run.stars.items;
  for (let i = 0; i < items.length; i++) {
    const star = items[i];
    if (!star?.active) continue;
    const dz = clamp(PLAYER.Z, star.z - distance, star.z) - PLAYER.Z;
    const dx = star.x - player.x;
    const dy = star.y - centerY;
    if (dx * dx + dy * dy + dz * dz > radiusSquared) continue;
    star.active = false;
    const value = starValue(star);
    run.runStarsCollected += value;
    run.runStars += value;
    run.starsCollected++;
    run.collectedRate.add(run.time, 1);
    pushCollect(run.collectFeed, star);
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
  run.baseSpeed = baseSpeedAt(run.time);
  run.speed = effectiveSpeed(run.baseSpeed, run.player.safeTimer, run.wasHit);
  run.gapTime = gapTimeFor(run.baseSpeed);
  run.tier = run.forcedTier ?? tierAt(run.time);

  const distance = run.speed * dt;
  run.distance += distance;
  run.reviveClearRemaining = Math.max(0, run.reviveClearRemaining - distance);
  updatePlayer(run.player, run.input, now, dt);
  stepGround(run.ground, distance);
  moveBarriers(run.barriers, distance);
  moveStars(run.stars, distance);
  const placedBefore = run.spawner.starsPlaced;
  stepSpawner(
    run.spawner,
    run.barriers,
    run.stars,
    distance,
    run.speed,
    run.time,
    run.tier,
    run.gapTime,
    run.reviveClearRemaining > 0,
  );
  if (run.spawner.starsPlaced !== placedBefore) run.placedRate.add(run.time, run.spawner.starsPlaced - placedBefore);
  collideBarriers(run, distance);
  collectStars(run, distance);
  if (run.player.safeTimer === 0) run.wasHit = false;
}

/**
 * Brings the hero back after a paid revive (A7): three hearts, two seconds of
 * safety, no barriers in the next 30 m, and no new rows while that ground passes.
 */
export function reviveRun(run: RunState): void {
  run.status = 'RUNNING';
  run.hearts = REVIVE.HEARTS;
  run.player.safeTimer = REVIVE.SAFE_TIME;
  run.wasHit = false;
  run.reviveClearRemaining = REVIVE.CLEAR_DISTANCE;
  const items = run.barriers.items;
  for (let i = 0; i < items.length; i++) {
    const barrier = items[i];
    if (barrier?.active && barrier.z > -REVIVE.CLEAR_DISTANCE) barrier.active = false;
  }
}
