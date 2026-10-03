import { REVIVE } from '../config';

/** 100, 200, 400 for the first, second and third revive in a run (A7). */
export function reviveCost(revivesThisRun: number): number {
  return REVIVE.BASE_COST * REVIVE.COST_MULTIPLIER ** revivesThisRun;
}

export function canRevive(revivesThisRun: number, totalStars: number, runStars: number): boolean {
  return revivesThisRun < REVIVE.MAX_PER_RUN && totalStars + runStars >= reviveCost(revivesThisRun);
}

export interface Payment {
  runStars: number;
  totalStars: number;
}

/** Pays `cost` from this run's stars first, then from the saved total (A7). */
export function payRunStarsFirst(cost: number, runStars: number, totalStars: number): Payment {
  const fromRun = Math.min(cost, runStars);
  return { runStars: runStars - fromRun, totalStars: totalStars - (cost - fromRun) };
}
