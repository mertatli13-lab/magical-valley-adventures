import { JUMP, LANE_CHANGE_IN_AIR, LANE_CHANGE_TIME, LANES, PLAYER, SLIDE } from '../config';
import type { Action, InputBuffer } from './input';
import { clamp, moveToward } from './math';

/** Player controller state (A3). The hero never moves along z. */
export interface PlayerState {
  lane: number;
  x: number;
  y: number;
  vy: number;
  slideTimer: number;
  safeTimer: number;
  height: number;
  /** The last action the controller played, for the debug panel. */
  lastAction: Action | null;
}

/** x position of a lane's centre. */
export function laneX(lane: number): number {
  return (lane - LANES.START_INDEX) * LANES.WIDTH;
}

export function createPlayer(): PlayerState {
  const player = {} as PlayerState;
  resetPlayer(player);
  return player;
}

export function resetPlayer(player: PlayerState): void {
  player.lane = LANES.START_INDEX;
  player.x = laneX(LANES.START_INDEX);
  player.y = 0;
  player.vy = 0;
  player.slideTimer = 0;
  player.safeTimer = 0;
  player.height = PLAYER.STAND_HEIGHT;
  player.lastAction = null;
}

export function isOnGround(player: PlayerState): boolean {
  return player.y <= 0 && player.vy <= 0;
}

export function isSliding(player: PlayerState): boolean {
  return player.slideTimer > 0;
}

/** Whether an action can be played right now. A jump waits until the hero lands. */
export function canPerform(player: PlayerState, action: Action): boolean {
  switch (action) {
    case 'JUMP':
      return isOnGround(player);
    case 'LEFT':
    case 'RIGHT':
      return LANE_CHANGE_IN_AIR || isOnGround(player);
    case 'SLIDE':
      return true;
  }
}

export function applyAction(player: PlayerState, action: Action): void {
  switch (action) {
    case 'LEFT':
      player.lane = clamp(player.lane - 1, LANES.MIN_INDEX, LANES.MAX_INDEX);
      break;
    case 'RIGHT':
      player.lane = clamp(player.lane + 1, LANES.MIN_INDEX, LANES.MAX_INDEX);
      break;
    case 'JUMP':
      player.vy = JUMP.VELOCITY;
      player.slideTimer = 0;
      break;
    case 'SLIDE':
      // In the air this is a fast fall straight into a slide.
      if (!isOnGround(player)) player.vy = SLIDE.FAST_FALL_VELOCITY;
      player.slideTimer = SLIDE.TIME;
      break;
  }
  player.lastAction = action;
}

/** Advances lane movement, jump physics and timers by dt seconds. */
export function stepPlayer(player: PlayerState, dt: number): void {
  player.x = moveToward(player.x, laneX(player.lane), (LANES.WIDTH / LANE_CHANGE_TIME) * dt);

  if (!isOnGround(player)) {
    // Average of old and new velocity: exact for constant gravity, so the jump
    // height and air time match the design at any frame rate.
    const vyBefore = player.vy;
    player.vy -= JUMP.GRAVITY * dt;
    player.y += ((vyBefore + player.vy) / 2) * dt;
    if (player.y <= 0) {
      player.y = 0;
      player.vy = 0;
    }
  }

  player.slideTimer = Math.max(0, player.slideTimer - dt);
  player.height = isSliding(player) ? PLAYER.SLIDE_HEIGHT : PLAYER.STAND_HEIGHT;
  player.safeTimer = Math.max(0, player.safeTimer - dt);
}

/**
 * One controller frame: plays the buffered action if it is allowed now
 * (otherwise it stays buffered until it is allowed or expires), then steps.
 */
export function updatePlayer(player: PlayerState, buffer: InputBuffer, now: number, dt: number): void {
  const action = buffer.peek(now);
  if (action !== null && canPerform(player, action)) {
    applyAction(player, action);
    buffer.consume();
  }
  stepPlayer(player, dt);
}
