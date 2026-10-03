import { COLLISION, OBSTACLES, PLAYER } from '../config';
import type { Barrier } from './barriers';
import type { PlayerState } from './player';

/**
 * Whether the barrier's z-range overlapped the player's at any point this
 * frame. The barrier moved from z - distance to z, so the whole swept range is
 * checked and a fast frame cannot skip a barrier (A6).
 */
export function sweptOverlapZ(barrier: Barrier, distance: number): boolean {
  const halfDepth = OBSTACLES.DEPTH / 2;
  const playerHalfDepth = PLAYER.DEPTH / 2;
  const back = barrier.z - distance - halfDepth;
  const front = barrier.z + halfDepth;
  return back <= PLAYER.Z + playerHalfDepth && front >= PLAYER.Z - playerHalfDepth;
}

/** Whether the player's body touches the barrier sideways and vertically (A6). Ignores safety. */
export function touchesBarrier(player: PlayerState, barrier: Barrier): boolean {
  if (Math.abs(player.x - barrier.x) > barrier.halfWidth + PLAYER.HALF_WIDTH) return false;
  switch (barrier.type) {
    case 'T':
      return true;
    case 'L':
      return player.y < COLLISION.LOW_HIT_BELOW_Y;
    case 'H':
      return player.y + player.height > COLLISION.HIGH_HIT_ABOVE_Y;
  }
}
