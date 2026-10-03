import { describe, expect, it } from 'vitest';
import { HEARTS, REVIVE, SAVE } from '../config';
import { CHARACTERS } from './catalogue';
import { canRevive, payRunStarsFirst, reviveCost } from './economy';
import { defaultSave, parseSave, writeSave, type SaveData, type StorageLike } from './save';
import { Session } from './session';

const DT = 1 / 60;

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

function storageWith(save: Partial<SaveData>): MemoryStorage {
  const storage = new MemoryStorage();
  writeSave(storage, { ...defaultSave(), ...save });
  return storage;
}

/** A session that has just started a run. */
function running(storage: StorageLike = new MemoryStorage()): Session {
  const session = new Session(storage);
  session.play();
  expect(session.choose()).toBe(true);
  return session;
}

/** Runs with no input until the hero is out. */
function runUntilOut(session: Session): void {
  let time = 0;
  while (session.screen === 'RUN' && time < 600) {
    session.update(DT, time);
    time += DT;
  }
  expect(session.screen).toBe('OUT');
}

describe('revive economy (A7)', () => {
  it('costs 100, 200, 400 and is refused the fourth time', () => {
    expect([0, 1, 2].map(reviveCost)).toEqual([100, 200, 400]);
    expect(canRevive(2, 10_000, 0)).toBe(true);
    expect(canRevive(3, 10_000, 0)).toBe(false);
  });

  it('pays from run stars before total stars', () => {
    expect(payRunStarsFirst(100, 30, 500)).toEqual({ runStars: 0, totalStars: 430 });
    expect(payRunStarsFirst(100, 150, 500)).toEqual({ runStars: 50, totalStars: 500 });
  });

  it('a session refuses the fourth revive in a run', () => {
    const session = running(storageWith({ totalStars: 10_000 }));
    const costs: number[] = [];
    for (let i = 0; i < REVIVE.MAX_PER_RUN; i++) {
      runUntilOut(session);
      session.run.runStars = 0; // pay every revive from the saved total
      costs.push(session.reviveCost);
      expect(session.revive()).toBe(true);
    }
    expect(costs).toEqual([100, 200, 400]);
    runUntilOut(session);
    expect(session.canRevive).toBe(false);
    expect(session.revive()).toBe(false);
    expect(session.screen).toBe('OUT');
    expect(session.save.totalStars).toBe(10_000 - 700);
  });

  it('a session pays from run stars first, then the saved total', () => {
    const session = running(storageWith({ totalStars: 500 }));
    runUntilOut(session);
    session.run.runStars = 30;
    session.run.runStarsCollected = 30;
    session.revive();
    expect(session.run.runStars).toBe(0);
    expect(session.save.totalStars).toBe(430);
  });

  it('cannot revive without enough stars', () => {
    const session = running();
    runUntilOut(session);
    session.run.runStars = 99;
    expect(session.canRevive).toBe(false);
    expect(session.revive()).toBe(false);
  });

  it('after a revive: three hearts, 2 s of safety and no barriers for 30 m', () => {
    const session = running(storageWith({ totalStars: 1000 }));
    runUntilOut(session);
    session.revive();
    expect(session.screen).toBe('RUN');
    expect(session.run.hearts).toBe(REVIVE.HEARTS);
    expect(session.run.player.safeTimer).toBe(REVIVE.SAFE_TIME);
    const nearest = Math.max(
      -Infinity,
      ...session.run.barriers.items.filter((b) => b.active).map((b) => b.z),
    );
    expect(nearest).toBeLessThanOrEqual(-REVIVE.CLEAR_DISTANCE);
    // No hearts lost while the next 30 m pass, even standing still in one lane.
    const start = session.run.distance;
    let time = 0;
    while (session.run.distance - start < REVIVE.CLEAR_DISTANCE) session.update(DT, (time += DT));
    expect(session.run.hearts).toBe(REVIVE.HEARTS);
    // The safety lasts 2 s and is not the slowed-down kind from a hit.
    expect(session.run.wasHit).toBe(false);
  });

  it('the safety after a revive lasts 2 s', () => {
    const session = running(storageWith({ totalStars: 1000 }));
    runUntilOut(session);
    session.revive();
    let time = 0;
    while (session.run.player.safeTimer > 0) {
      session.update(DT, time);
      time += DT;
    }
    expect(Math.abs(time - REVIVE.SAFE_TIME)).toBeLessThanOrEqual(DT);
  });
});

describe('out and results', () => {
  it('the revive offer times out after 5 s and banks the stars', () => {
    const storage = new MemoryStorage();
    const session = running(storage);
    runUntilOut(session);
    session.run.runStars = 42;
    session.run.runStarsCollected = 42;
    let time = 0;
    while (session.screen === 'OUT') {
      session.update(DT, time);
      time += DT;
    }
    expect(session.screen).toBe('RESULTS');
    expect(Math.abs(time - REVIVE.OFFER_TIME)).toBeLessThanOrEqual(DT);
    expect(session.result).toMatchObject({ starsCollected: 42, bestRun: 42, totalStars: 42, newBest: true });
  });

  it('No thanks banks run stars and keeps the best run', () => {
    const session = running(storageWith({ totalStars: 10, bestRun: 100 }));
    runUntilOut(session);
    session.run.runStars = 20;
    session.run.runStarsCollected = 20;
    session.decline();
    expect(session.result).toMatchObject({ totalStars: 30, bestRun: 100, newBest: false });
  });

  it('banks the stars left after a revive, but the best run counts every star collected', () => {
    const session = running(storageWith({ totalStars: 0 }));
    runUntilOut(session);
    session.run.runStars = 150;
    session.run.runStarsCollected = 150;
    session.revive(); // pays 100 from the run
    expect(session.run.runStars).toBe(50);
    runUntilOut(session); // the hero may collect a few more stars here
    const left = session.run.runStars;
    const collected = session.run.runStarsCollected;
    session.decline();
    expect(left).toBe(50 + (collected - 150));
    expect(session.save.totalStars).toBe(left);
    expect(session.save.bestRun).toBe(collected);
  });

  it('Home from Pause banks the run once', () => {
    const session = running();
    session.run.runStars = 7;
    session.run.runStarsCollected = 7;
    session.pause();
    session.home();
    expect(session.screen).toBe('LANDING');
    expect(session.save.totalStars).toBe(7);
    session.home(); // not allowed from LANDING; nothing changes
    expect(session.save.totalStars).toBe(7);
  });

  it('Play again starts a fresh run', () => {
    const session = running();
    runUntilOut(session);
    session.decline();
    session.playAgain();
    expect(session.screen).toBe('RUN');
    expect(session.run.hearts).toBe(HEARTS.START);
    expect(session.revivesThisRun).toBe(0);
  });

  it('only RUN advances the simulation', () => {
    const session = running();
    session.update(DT, 0);
    session.pause();
    const time = session.run.time;
    for (let i = 0; i < 60; i++) session.update(DT, i * DT);
    expect(session.run.time).toBe(time);
    session.resume();
    session.update(DT, 1);
    expect(session.run.time).toBeGreaterThan(time);
  });
});

describe('select', () => {
  it('runs in two taps from a fresh start: PLAY, then CHOOSE', () => {
    const session = new Session(new MemoryStorage());
    session.play();
    expect(session.choose()).toBe(true);
    expect(session.screen).toBe('RUN');
  });

  it('cannot choose a locked character; tapping it opens the shop', () => {
    const session = new Session(new MemoryStorage());
    session.play();
    while (session.owns(session.selectedCharacter)) session.rotate(1);
    expect(session.choose()).toBe(false);
    expect(session.screen).toBe('SELECT');
    expect(session.tapLocked()).toBe(true);
    expect(session.screen).toBe('SHOP');
    session.back();
    expect(session.screen).toBe('SELECT');
  });

  it('turns the stage around all five characters in both directions', () => {
    const session = new Session(new MemoryStorage());
    session.play();
    const seen = new Set<string>();
    for (let i = 0; i < CHARACTERS.length; i++) {
      seen.add(session.selectedCharacter.id);
      session.rotate(-1);
    }
    expect(seen.size).toBe(CHARACTERS.length);
    session.rotate(CHARACTERS.length);
    expect(session.selectedCharacter.id).toBe(session.equippedCharacter.id);
  });

  it('remembers the chosen character', () => {
    const storage = storageWith({ owned: { characters: ['strawberry', 'ginza'], accessories: [], moves: [] } });
    const session = new Session(storage);
    session.play();
    session.rotate(1);
    session.choose();
    expect(new Session(storage).equippedCharacter.id).toBe('ginza');
  });
});

describe('save (A8)', () => {
  it('total stars and best run survive a page reload', () => {
    const storage = new MemoryStorage();
    const first = running(storage);
    runUntilOut(first);
    first.run.runStars = 33;
    first.run.runStarsCollected = 33;
    first.decline();
    const reloaded = new Session(storage);
    expect(reloaded.save.totalStars).toBe(33);
    expect(reloaded.save.bestRun).toBe(33);
  });

  it('uses the key and format from the design', () => {
    const storage = new MemoryStorage();
    writeSave(storage, defaultSave());
    const raw = JSON.parse(storage.getItem(SAVE.KEY) ?? '{}');
    expect(raw).toEqual({
      version: 1,
      totalStars: 0,
      bestRun: 0,
      owned: { characters: ['strawberry', 'ginza'], accessories: [], moves: [] },
      equipped: { character: 'strawberry', accessory: null, moves: {} },
      settings: { music: true, sound: true, reduceMotion: false },
    });
  });

  it('loads a save in the original A8 format (before the reduce-motion setting)', () => {
    const original = { ...defaultSave(), totalStars: 9, settings: { music: false, sound: true } };
    const save = parseSave(JSON.stringify(original));
    expect(save.totalStars).toBe(9);
    expect(save.settings).toEqual({ music: false, sound: true, reduceMotion: false });
  });

  it.each([
    ['not JSON', '{oops'],
    ['an array', '[]'],
    ['null', 'null'],
    ['wrong version', JSON.stringify({ ...defaultSave(), version: 2 })],
    ['negative stars', JSON.stringify({ ...defaultSave(), totalStars: -5 })],
    ['stars as text', JSON.stringify({ ...defaultSave(), totalStars: '500' })],
    ['missing owned', JSON.stringify({ ...defaultSave(), owned: undefined })],
    ['bad settings', JSON.stringify({ ...defaultSave(), settings: { music: 'yes', sound: true } })],
  ])('a corrupt save (%s) starts fresh without crashing', (_, raw) => {
    expect(parseSave(raw)).toEqual(defaultSave());
    const storage = new MemoryStorage();
    storage.setItem(SAVE.KEY, raw);
    expect(() => new Session(storage)).not.toThrow();
    expect(new Session(storage).save).toEqual(defaultSave());
  });

  it('a missing save starts fresh', () => {
    expect(parseSave(null)).toEqual(defaultSave());
  });

  it('storage that throws (private browsing) does not crash', () => {
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const session = running(blocked);
    runUntilOut(session);
    expect(() => session.decline()).not.toThrow();
  });

  it('keeps free characters owned and drops unknown ones', () => {
    const save = parseSave(
      JSON.stringify({ ...defaultSave(), owned: { characters: ['kusto', 'dragon'], accessories: [], moves: [] } }),
    );
    expect(save.owned.characters.sort()).toEqual(['ginza', 'kusto', 'strawberry']);
  });

  it('falls back to the default character if the equipped one is not owned', () => {
    const save = parseSave(
      JSON.stringify({ ...defaultSave(), equipped: { character: 'sugar', accessory: null, moves: {} } }),
    );
    expect(save.equipped.character).toBe('strawberry');
  });
});
