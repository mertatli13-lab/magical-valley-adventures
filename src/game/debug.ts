import type { Session } from './session';

/**
 * Development-only commands for testing. Only imported behind
 * `import.meta.env.DEV`, so production builds leave this module out.
 */
export function addStarsForTesting(session: Session, amount: number): void {
  session.save.totalStars += amount;
  session.saveProgress();
}
