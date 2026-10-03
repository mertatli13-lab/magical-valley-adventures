import { INPUT, INPUT_BUFFER_TIME } from '../config';

/** The four moves the player can make (A2). */
export type Action = 'LEFT' | 'RIGHT' | 'JUMP' | 'SLIDE';

/**
 * Turns a finished swipe into an action. dx and dy are in screen pixels, with
 * +y pointing down. Returns null for a tap.
 */
export function swipeToAction(dx: number, dy: number): Action | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < INPUT.SWIPE_MIN_DISTANCE_PX) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'RIGHT' : 'LEFT';
  return dy > 0 ? 'SLIDE' : 'JUMP';
}

const KEY_ACTIONS: Readonly<Record<string, Action>> = {
  ArrowLeft: 'LEFT',
  KeyA: 'LEFT',
  ArrowRight: 'RIGHT',
  KeyD: 'RIGHT',
  ArrowUp: 'JUMP',
  KeyW: 'JUMP',
  Space: 'JUMP',
  ArrowDown: 'SLIDE',
  KeyS: 'SLIDE',
};

/** Maps a KeyboardEvent.code to an action, or null if the key is not a control. */
export function keyToAction(code: string): Action | null {
  return KEY_ACTIONS[code] ?? null;
}

/**
 * Holds the most recent action for up to INPUT_BUFFER_TIME seconds, so a move
 * made slightly early is played as soon as it is allowed. Holds one action;
 * a newer one replaces it. Allocates nothing.
 */
export class InputBuffer {
  private action: Action | null = null;
  private time = 0;

  push(action: Action, time: number): void {
    this.action = action;
    this.time = time;
  }

  /** The buffered action, or null if there is none or it is too old (it is then dropped). */
  peek(now: number): Action | null {
    if (this.action !== null && now - this.time > INPUT_BUFFER_TIME) this.action = null;
    return this.action;
  }

  consume(): void {
    this.action = null;
  }
}
