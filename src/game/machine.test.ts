import { describe, expect, it } from 'vitest';
import { GameMachine, isSimulating, TRANSITIONS, type GameEvent, type Screen } from './machine';

/** Puts a fresh machine on a screen by replaying a path from LANDING. */
const PATHS: Record<Screen, GameEvent[]> = {
  LANDING: [],
  SELECT: ['PLAY'],
  RUN: ['PLAY', 'CHOOSE'],
  PAUSE: ['PLAY', 'CHOOSE', 'PAUSE'],
  OUT: ['PLAY', 'CHOOSE', 'HEARTS_ZERO'],
  RESULTS: ['PLAY', 'CHOOSE', 'HEARTS_ZERO', 'DECLINE'],
  SHOP: ['PLAY', 'TAP_LOCKED'],
};

function machineAt(screen: Screen): GameMachine {
  const machine = new GameMachine();
  for (const event of PATHS[screen]) expect(machine.send(event)).toBe(true);
  expect(machine.screen).toBe(screen);
  return machine;
}

const A1: [Screen, GameEvent, Screen][] = [
  ['LANDING', 'PLAY', 'SELECT'],
  ['SELECT', 'CHOOSE', 'RUN'],
  ['SELECT', 'TAP_LOCKED', 'SHOP'],
  ['RUN', 'PAUSE', 'PAUSE'],
  ['PAUSE', 'RESUME', 'RUN'],
  ['PAUSE', 'HOME', 'LANDING'],
  ['PAUSE', 'RESTART', 'RUN'],
  ['RUN', 'HEARTS_ZERO', 'OUT'],
  ['OUT', 'REVIVE', 'RUN'],
  ['OUT', 'DECLINE', 'RESULTS'],
  ['RESULTS', 'PLAY_AGAIN', 'RUN'],
  ['RESULTS', 'SHOP', 'SHOP'],
  ['RESULTS', 'HOME', 'LANDING'],
];

describe('state machine (A1)', () => {
  it.each(A1)('%s --%s--> %s', (from, event, to) => {
    const machine = machineAt(from);
    expect(machine.send(event)).toBe(true);
    expect(machine.screen).toBe(to);
  });

  it('SHOP --BACK--> returns to the screen it was opened from', () => {
    const fromSelect = machineAt('SHOP');
    fromSelect.send('BACK');
    expect(fromSelect.screen).toBe('SELECT');
    const fromResults = machineAt('RESULTS');
    fromResults.send('SHOP');
    fromResults.send('BACK');
    expect(fromResults.screen).toBe('RESULTS');
  });

  it('ignores every event not in the table', () => {
    const events: GameEvent[] = [
      'PLAY', 'CHOOSE', 'TAP_LOCKED', 'PAUSE', 'RESUME', 'RESTART', 'HOME',
      'HEARTS_ZERO', 'REVIVE', 'DECLINE', 'PLAY_AGAIN', 'SHOP', 'BACK',
    ];
    for (const screen of Object.keys(TRANSITIONS) as Screen[]) {
      for (const event of events) {
        const allowed = TRANSITIONS[screen][event] !== undefined || (screen === 'SHOP' && event === 'BACK');
        if (allowed) continue;
        const machine = machineAt(screen);
        expect(machine.send(event)).toBe(false);
        expect(machine.screen).toBe(screen);
      }
    }
  });

  it('only RUN advances the simulation', () => {
    const simulating = (Object.keys(TRANSITIONS) as Screen[]).filter(isSimulating);
    expect(simulating).toEqual(['RUN']);
  });
});
