import { POOLS, WORLD } from '../config';

export type BarrierType = 'L' | 'H' | 'T';

export interface Barrier {
  active: boolean;
  type: BarrierType;
  x: number;
  /** Centre of the barrier along z. */
  z: number;
  halfWidth: number;
}

/** Fixed pool of barriers, created once at load (A8). */
export interface BarrierPool {
  items: Barrier[];
  /** Barriers that could not spawn because the pool was full. */
  dropped: number;
}

export function createBarrierPool(): BarrierPool {
  const items: Barrier[] = [];
  for (let i = 0; i < POOLS.BARRIERS; i++) {
    items.push({ active: false, type: 'L', x: 0, z: 0, halfWidth: 0 });
  }
  return { items, dropped: 0 };
}

export function resetBarrierPool(pool: BarrierPool): void {
  for (const barrier of pool.items) barrier.active = false;
  pool.dropped = 0;
}

/** Activates a free barrier, or returns null (and counts it) when the pool is full. */
export function spawnBarrier(
  pool: BarrierPool,
  type: BarrierType,
  x: number,
  z: number,
  halfWidth: number,
): Barrier | null {
  for (let i = 0; i < pool.items.length; i++) {
    const barrier = pool.items[i];
    if (!barrier || barrier.active) continue;
    barrier.active = true;
    barrier.type = type;
    barrier.x = x;
    barrier.z = z;
    barrier.halfWidth = halfWidth;
    return barrier;
  }
  pool.dropped++;
  return null;
}

/** Scrolls active barriers toward +z and returns the ones past the hero to the pool. */
export function moveBarriers(pool: BarrierPool, distance: number): void {
  for (let i = 0; i < pool.items.length; i++) {
    const barrier = pool.items[i];
    if (!barrier?.active) continue;
    barrier.z += distance;
    if (barrier.z > WORLD.RECYCLE_Z) barrier.active = false;
  }
}

export function activeBarrierCount(pool: BarrierPool): number {
  let count = 0;
  for (let i = 0; i < pool.items.length; i++) if (pool.items[i]?.active) count++;
  return count;
}
