import { FAIRNESS, LANES, OBSTACLES, SPAWNER, WORLD } from '../config';
import { spawnBarrier, type BarrierPool } from './barriers';
import { laneX } from './player';
import { Random } from './random';

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

/**
 * One spawner frame (A5). `distance` is how far the world scrolled this frame.
 * Returns true if a row was spawned.
 */
export function stepSpawner(
  spawner: SpawnerState,
  pool: BarrierPool,
  distance: number,
  speed: number,
  runTime: number,
  tier: number,
  gapTime: number,
): boolean {
  spawner.distanceToNextRow -= distance;
  if (spawner.distanceToNextRow > 0 || runTime <= FAIRNESS.NO_BARRIER_START_TIME) return false;
  placeRow(generateRow(spawner, tier, gapTime), pool);
  commitRow(spawner);
  spawner.distanceToNextRow = speed * gapTime;
  return true;
}
