import { POOLS, STARS, WORLD } from '../config';

export interface Star {
  active: boolean;
  big: boolean;
  x: number;
  y: number;
  z: number;
}

/** Fixed pool of stars, created once at load (A8). */
export interface StarPool {
  items: Star[];
  /** Stars that could not spawn because the pool was full. */
  dropped: number;
}

export function createStarPool(): StarPool {
  const items: Star[] = [];
  for (let i = 0; i < POOLS.STARS; i++) items.push({ active: false, big: false, x: 0, y: 0, z: 0 });
  return { items, dropped: 0 };
}

export function resetStarPool(pool: StarPool): void {
  for (let i = 0; i < pool.items.length; i++) {
    const star = pool.items[i];
    if (star) star.active = false;
  }
  pool.dropped = 0;
}

export function spawnStar(pool: StarPool, x: number, y: number, z: number, big: boolean): Star | null {
  for (let i = 0; i < pool.items.length; i++) {
    const star = pool.items[i];
    if (!star || star.active) continue;
    star.active = true;
    star.big = big;
    star.x = x;
    star.y = y;
    star.z = z;
    return star;
  }
  pool.dropped++;
  return null;
}

/** Scrolls active stars toward +z and returns the ones past the hero to the pool. */
export function moveStars(pool: StarPool, distance: number): void {
  for (let i = 0; i < pool.items.length; i++) {
    const star = pool.items[i];
    if (!star?.active) continue;
    star.z += distance;
    if (star.z > WORLD.RECYCLE_Z) star.active = false;
  }
}

export function activeStarCount(pool: StarPool): number {
  let count = 0;
  for (let i = 0; i < pool.items.length; i++) if (pool.items[i]?.active) count++;
  return count;
}

export function starValue(star: Star): number {
  return star.big ? STARS.BIG_VALUE : STARS.VALUE;
}

/**
 * Ring buffer of recent star pickups, so the scene can play a pop for each one
 * even when several are collected in one frame. Fixed size, no allocation.
 */
export interface CollectFeed {
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  big: Uint8Array;
  /** Total pickups so far; the newest is at (count - 1) % size. */
  count: number;
}

export function createCollectFeed(): CollectFeed {
  return {
    x: new Float64Array(POOLS.COLLECT_EVENTS),
    y: new Float64Array(POOLS.COLLECT_EVENTS),
    z: new Float64Array(POOLS.COLLECT_EVENTS),
    big: new Uint8Array(POOLS.COLLECT_EVENTS),
    count: 0,
  };
}

export function pushCollect(feed: CollectFeed, star: Star): void {
  const i = feed.count % POOLS.COLLECT_EVENTS;
  feed.x[i] = star.x;
  feed.y[i] = star.y;
  feed.z[i] = star.z;
  feed.big[i] = star.big ? 1 : 0;
  feed.count++;
}
