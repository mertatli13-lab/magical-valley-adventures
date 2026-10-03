/** Screens of the game state machine (A1). */
export type Screen = 'LANDING' | 'SELECT' | 'RUN' | 'PAUSE' | 'OUT' | 'RESULTS' | 'SHOP';

export type GameEvent =
  | 'PLAY'
  | 'CHOOSE'
  | 'TAP_LOCKED'
  | 'PAUSE'
  | 'RESUME'
  | 'RESTART'
  | 'HOME'
  | 'HEARTS_ZERO'
  | 'REVIVE'
  | 'DECLINE'
  | 'PLAY_AGAIN'
  | 'SHOP'
  | 'BACK';

/**
 * A1 as a table. PAUSE --RESTART--> RUN is added for the Restart button on the
 * Pause screen (Prompt 4). SHOP --BACK--> returns to the previous screen and is
 * handled by GameMachine.
 */
export const TRANSITIONS: Readonly<Record<Screen, Readonly<Partial<Record<GameEvent, Screen>>>>> = {
  LANDING: { PLAY: 'SELECT' },
  SELECT: { CHOOSE: 'RUN', TAP_LOCKED: 'SHOP' },
  RUN: { PAUSE: 'PAUSE', HEARTS_ZERO: 'OUT' },
  PAUSE: { RESUME: 'RUN', RESTART: 'RUN', HOME: 'LANDING' },
  OUT: { REVIVE: 'RUN', DECLINE: 'RESULTS' },
  RESULTS: { PLAY_AGAIN: 'RUN', SHOP: 'SHOP', HOME: 'LANDING' },
  SHOP: {},
};

export class GameMachine {
  screen: Screen = 'LANDING';
  /** Where SHOP --BACK--> returns to. */
  private previous: Screen = 'LANDING';

  canSend(event: GameEvent): boolean {
    if (event === 'BACK') return this.screen === 'SHOP';
    return TRANSITIONS[this.screen][event] !== undefined;
  }

  /** Applies the event if it is allowed from the current screen. Returns whether it was. */
  send(event: GameEvent): boolean {
    if (event === 'BACK') {
      if (this.screen !== 'SHOP') return false;
      this.screen = this.previous;
      return true;
    }
    const next = TRANSITIONS[this.screen][event];
    if (next === undefined) return false;
    if (next === 'SHOP') this.previous = this.screen;
    this.screen = next;
    return true;
  }
}

/** Only RUN advances the simulation; every other screen freezes it (A1). */
export function isSimulating(screen: Screen): boolean {
  return screen === 'RUN';
}
