import { ECONOMY, FAIRNESS, JUMP, LANES, OBSTACLES, SPAWNER, STAR_SPAWN, STARS, WORLD } from '../config';
import { spawnBarrier, type BarrierPool } from './barriers';
import { clamp } from './math';
import { laneX } from './player';
import { Random } from './random';
import { spawnStar, type StarPool } from './stars';

/** One cell per lane: '.' empty, 'L' low, 'H' high, 'T' tall (A5). */
export type Cell = '.' | 'L' | 'H' | 'T';
export type Row = Cell[];

function parsePattern(pattern: string): Row {
  return [...pattern] as Row;
}

/** Pattern library by tier; each tier includes the patterns of the tiers before it. Built once. */
export const LIBRARY: readonly (readonly Row[])[] = SPAWNER.PATTERNS.map((_, tier) =>
  SPAWNER.PATTERNS.slice(0, tier + 1)
    .flat()
    .map(parsePattern),
);

export interface SpawnerState {
  rng: Random;
  distanceToNextRow: number;
  /** The row being built. Reused for every row. */
  row: Row;
  previous: Row;
  hasPrevious: boolean;
  rowsSpawned: number;
  /** How far the world has scrolled since the last row spawned: the real gap to it. */
  distanceSinceRow: number;
  /** Run time when the last big star was placed. */
  lastBigStarTime: number;
  /** Stars placed this run, for the placement-rate stats. */
  starsPlaced: number;
}

function emptyRow(): Row {
  return new Array<Cell>(LANES.COUNT).fill('.');
}

export function createSpawner(seed: number): SpawnerState {
  const spawner: SpawnerState = {
    rng: new Random(seed),
    distanceToNextRow: 0,
    row: emptyRow(),
    previous: emptyRow(),
    hasPrevious: false,
    rowsSpawned: 0,
    distanceSinceRow: 0,
    lastBigStarTime: 0,
    starsPlaced: 0,
  };
  resetSpawner(spawner, seed);
  return spawner;
}

export function resetSpawner(spawner: SpawnerState, seed: number): void {
  spawner.rng.reseed(seed);
  spawner.distanceToNextRow = 0;
  spawner.row.fill('.');
  spawner.previous.fill('.');
  spawner.hasPrevious = false;
  spawner.rowsSpawned = 0;
  spawner.distanceSinceRow = 0;
  spawner.lastBigStarTime = 0;
  spawner.starsPlaced = 0;
}

function isOpen(cell: Cell | undefined): boolean {
  return cell !== 'T';
}

/** The fairness check from A5. `previous` is null when there is no previous row. */
export function isFair(row: Row, previous: Row | null, gapTime: number): boolean {
  let anyOpen = false;
  for (let lane = 0; lane < LANES.COUNT; lane++) if (isOpen(row[lane])) anyOpen = true;
  if (!anyOpen) return false;
  if (gapTime < FAIRNESS.CLOSE_GAP_TIME && previous !== null) {
    for (let lane = 0; lane < LANES.COUNT; lane++) {
      if (!isOpen(row[lane])) continue;
      for (let prevLane = 0; prevLane < LANES.COUNT; prevLane++) {
        if (isOpen(previous[prevLane]) && Math.abs(lane - prevLane) <= FAIRNESS.MAX_SAFE_LANE_SHIFT) return true;
      }
    }
    return false;
  }
  return true;
}

/** Copies a random pattern of the tier into `row` and shuffles it across lanes (Fisher-Yates). */
function pickShuffled(spawner: SpawnerState, tier: number): void {
  const patterns = LIBRARY[Math.min(tier, LIBRARY.length - 1)] ?? [];
  const pattern = patterns[spawner.rng.int(patterns.length)];
  const row = spawner.row;
  for (let lane = 0; lane < LANES.COUNT; lane++) row[lane] = pattern?.[lane] ?? '.';
  for (let i = row.length - 1; i > 0; i--) {
    const j = spawner.rng.int(i + 1);
    const swap = row[i] ?? '.';
    row[i] = row[j] ?? '.';
    row[j] = swap;
  }
}

/**
 * Builds the next row into `spawner.row`: up to MAX_ATTEMPTS shuffled picks
 * until one is fair. If none is, the row is left empty, so a fairness rule is
 * never broken.
 */
export function generateRow(spawner: SpawnerState, tier: number, gapTime: number): Row {
  const previous = spawner.hasPrevious ? spawner.previous : null;
  for (let attempt = 0; attempt < SPAWNER.MAX_ATTEMPTS; attempt++) {
    pickShuffled(spawner, tier);
    if (isFair(spawner.row, previous, gapTime)) return spawner.row;
  }
  spawner.row.fill('.');
  return spawner.row;
}

/** Records the built row as the previous row. */
export function commitRow(spawner: SpawnerState): void {
  for (let lane = 0; lane < LANES.COUNT; lane++) spawner.previous[lane] = spawner.row[lane] ?? '.';
  spawner.hasPrevious = true;
  spawner.rowsSpawned++;
}

function isWideBar(row: Row): boolean {
  for (let lane = 0; lane < LANES.COUNT; lane++) if (row[lane] !== 'H') return false;
  return true;
}

/** Places the row's barriers at the spawn point. "HHH" becomes one wide cloud bar. */
export function placeRow(row: Row, pool: BarrierPool): void {
  if (isWideBar(row)) {
    spawnBarrier(pool, 'H', 0, WORLD.SPAWN_Z, OBSTACLES.WIDE_HALF_WIDTH);
    return;
  }
  for (let lane = 0; lane < LANES.COUNT; lane++) {
    const cell = row[lane];
    if (cell === undefined || cell === '.') continue;
    spawnBarrier(pool, cell, laneX(lane), WORLD.SPAWN_Z, OBSTACLES.HALF_WIDTH);
  }
}

const SECONDS_PER_MINUTE = 60;

/** Star chance for a row so about 180 stars per minute sit on the track (A5). */
export function starChance(gapTime: number, lineLength: number): number {
  const rowsPerMinute = SECONDS_PER_MINUTE / gapTime;
  return clamp(
    ECONOMY.STARS_PLACED_PER_MINUTE / (rowsPerMinute * lineLength),
    STAR_SPAWN.CHANCE_MIN,
    STAR_SPAWN.CHANCE_MAX,
  );
}

/** Stars in a line for the distance to the previous row (A5). */
export function starLineLength(rowDistance: number): number {
  return clamp(
    Math.floor((rowDistance - STAR_SPAWN.ROW_CLEARANCE) / STARS.SPACING),
    STARS.LINE_MIN,
    STARS.LINE_MAX,
  );
}

/** Picks a random lane without a tall barrier, or -1 if there is none. */
function randomOpenLane(spawner: SpawnerState, row: Row): number {
  let open = 0;
  for (let lane = 0; lane < LANES.COUNT; lane++) if (row[lane] !== 'T') open++;
  if (open === 0) return -1;
  let pick = spawner.rng.int(open);
  for (let lane = 0; lane < LANES.COUNT; lane++) {
    if (row[lane] === 'T') continue;
    if (pick === 0) return lane;
    pick--;
  }
  return -1;
}

/**
 * Places the stars for a row that just spawned at the spawn point (A5).
 *
 * The line starts LEAD_DISTANCE in front of the row and runs toward the hero,
 * 1.5 m apart, stopping short of the previous row. `rowDistance` is the real
 * distance to the previous row. Over a low barrier, five more stars follow
 * the hero's own jump arc, peaking above the barrier.
 */
export function spawnStars(
  spawner: SpawnerState,
  row: Row,
  stars: StarPool,
  speed: number,
  gapTime: number,
  rowDistance: number,
  runTime: number,
): void {
  const n = starLineLength(rowDistance);
  if (spawner.rng.next() >= starChance(gapTime, n)) return;
  const lane = randomOpenLane(spawner, row);
  if (lane < 0) return;
  const x = laneX(lane);

  const big = runTime - spawner.lastBigStarTime >= STARS.BIG_INTERVAL;
  if (big) spawner.lastBigStarTime = runTime;
  const bigIndex = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const z = WORLD.SPAWN_Z + STAR_SPAWN.LEAD_DISTANCE + i * STARS.SPACING;
    spawnStar(stars, x, STAR_SPAWN.Y, z, big && i === bigIndex);
  }
  spawner.starsPlaced += n;

  if (row[lane] !== 'L') return;
  // The arc spans the jump length at this speed, centred on the barrier. The
  // ends are left out so the arc does not crowd the line.
  const halfJump = (speed * JUMP.AIR_TIME) / 2;
  for (let k = 1; k <= STAR_SPAWN.ARC_COUNT; k++) {
    const u = -1 + (2 * k) / (STAR_SPAWN.ARC_COUNT + 1);
    const y = STAR_SPAWN.Y + (STAR_SPAWN.ARC_PEAK_Y - STAR_SPAWN.Y) * (1 - u * u);
    spawnStar(stars, x, y, WORLD.SPAWN_Z + u * halfJump, false);
  }
  spawner.starsPlaced += STAR_SPAWN.ARC_COUNT;
}

/**
 * One spawner frame (A5). `distance` is how far the world scrolled this frame.
 * Returns true if a row was spawned.
 */
export function stepSpawner(
  spawner: SpawnerState,
  pool: BarrierPool,
  stars: StarPool,
  distance: number,
  speed: number,
  runTime: number,
  tier: number,
  gapTime: number,
  inReviveClearZone = false,
): boolean {
  spawner.distanceToNextRow -= distance;
  spawner.distanceSinceRow += distance;
  if (spawner.distanceToNextRow > 0 || runTime <= FAIRNESS.NO_BARRIER_START_TIME || inReviveClearZone) return false;
  // Measure to the previous row as it really is, not as speed x gap: the speed
  // may have changed since it spawned (a hit slows the world down).
  const planned = speed * gapTime;
  const rowDistance = spawner.hasPrevious ? Math.min(planned, spawner.distanceSinceRow) : planned;
  const row = generateRow(spawner, tier, gapTime);
  placeRow(row, pool);
  spawnStars(spawner, row, stars, speed, gapTime, rowDistance, runTime);
  commitRow(spawner);
  spawner.distanceToNextRow = planned;
  spawner.distanceSinceRow = 0;
  return true;
}
