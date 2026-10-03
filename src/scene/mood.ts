import type { Screen } from '../game/machine';

/**
 * Shared, mutable scene state written once per frame by the Director and read
 * by other scene components. 0 = night forest (select), 1 = daylight run.
 */
export const mood = {
  daylight: 0,
};

/** Screens that show the daylight run world. */
export function isDayScreen(screen: Screen): boolean {
  return screen === 'RUN' || screen === 'PAUSE' || screen === 'OUT' || screen === 'RESULTS';
}
