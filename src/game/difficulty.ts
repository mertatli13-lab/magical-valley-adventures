import { HEARTS, ROW_GAP, SPEED, TIER_THRESHOLDS } from '../config';
import { clamp } from './math';

/** Speed before the hit slowdown: min(28, 12 + 0.1 * runTime) m/s (A4). */
export function baseSpeedAt(runTime: number): number {
  return Math.min(SPEED.MAX, SPEED.START + SPEED.ACCELERATION * runTime);
}

/** Speed after the hit slowdown: x0.8 while safe after a hit (A4). */
export function effectiveSpeed(baseSpeed: number, safeTimer: number, wasHit: boolean): number {
  return safeTimer > 0 && wasHit ? baseSpeed * HEARTS.HIT_SPEED_FACTOR : baseSpeed;
}

/** Seconds between barrier rows for a base speed (A4). */
export function gapTimeFor(baseSpeed: number): number {
  const progress = clamp((baseSpeed - SPEED.START) / ROW_GAP.PROGRESS_RANGE, 0, 1);
  return ROW_GAP.START - ROW_GAP.SHRINK * progress;
}

/** Pattern tier for a run time: 0 before 40 s, 1 before 80 s, 2 before 120 s, then 3 (A4). */
export function tierAt(runTime: number): number {
  let tier = 0;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (runTime >= (TIER_THRESHOLDS[i] ?? Infinity)) tier = i + 1;
  }
  return tier;
}
