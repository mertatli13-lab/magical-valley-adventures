import { describe, expect, it } from 'vitest';
import { AUDIO, POOLS, STAR_SPAWN } from '../config';
import { CueFeed, StarChain, type Cue } from './cues';
import { applyAction } from './player';
import { defaultSave, writeSave, type StorageLike } from './save';
import { Session } from './session';
import { spawnBarrier } from './barriers';
import { spawnStar } from './stars';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

const DT = 1 / 60;

function cuesSince(feed: CueFeed, seen: number): Cue[] {
  const cues: Cue[] = [];
  for (let n = feed.firstUnread(seen); n < feed.count; n++) cues.push(feed.cue(n));
  return cues;
}

function running(totalStars = 0): Session {
  const storage = new MemoryStorage();
  writeSave(storage, { ...defaultSave(), totalStars });
  const session = new Session(storage);
  session.play();
  session.choose();
  return session;
}

describe('star chain pitch', () => {
  it('rises one step per star in quick succession', () => {
    const chain = new StarChain();
    const step = 2 ** (AUDIO.STAR_PITCH_STEP / 12);
    expect(chain.next(0)).toBe(1);
    expect(chain.next(0.2)).toBeCloseTo(step);
    expect(chain.next(0.4)).toBeCloseTo(step * step);
  });

  it('stops rising at the cap', () => {
    const chain = new StarChain();
    let rate = 1;
    for (let i = 0; i < 50; i++) rate = chain.next(i * 0.1);
    expect(rate).toBeCloseTo(2 ** ((AUDIO.STAR_PITCH_MAX_STEPS * AUDIO.STAR_PITCH_STEP) / 12));
  });

  it('resets after 1 s without a star', () => {
    const chain = new StarChain();
    chain.next(0);
    chain.next(0.5);
    expect(chain.next(0.5 + AUDIO.STAR_CHAIN_RESET + 0.01)).toBe(1);
    expect(chain.next(2)).toBeGreaterThan(1); // 0.49 s later: still in the chain
  });
});

describe('cue feed', () => {
  it('keeps the latest cues when it wraps around', () => {
    const feed = new CueFeed();
    for (let i = 0; i < POOLS.CUES + 5; i++) feed.push(i % 2 ? 'jump' : 'star', i);
    expect(feed.firstUnread(0)).toBe(5);
    const last = POOLS.CUES + 4;
    expect(feed.cue(feed.count - 1)).toBe(last % 2 ? 'jump' : 'star');
    expect(feed.time[feed.slot(feed.count - 1)]).toBe(last);
  });
});

describe('the game emits cues', () => {
  it('for moves and landing', () => {
    const session = running();
    const { run } = session;
    const seen = run.cues.count;
    run.input.push('RIGHT', 0);
    session.update(DT, 0);
    run.input.push('JUMP', 0.05);
    for (let i = 0; i < 50; i++) session.update(DT, 0.05);
    run.input.push('SLIDE', 1);
    session.update(DT, 1);
    expect(cuesSince(run.cues, seen)).toEqual(['swipe', 'jump', 'land', 'slide']);
  });

  it('for stars, big stars, hits and going out', () => {
    const session = running();
    const { run } = session;
    const seen = run.cues.count;
    spawnStar(run.stars, 0, STAR_SPAWN.Y, -2, false);
    spawnStar(run.stars, 0, STAR_SPAWN.Y, -4, true);
    run.hearts = 1;
    spawnBarrier(run.barriers, 'T', 0, -8, 0.9);
    for (let i = 0; i < 60; i++) session.update(DT, i * DT);
    expect(cuesSince(run.cues, seen)).toEqual(['star', 'bigStar', 'hit', 'out']);
    expect(session.screen).toBe('OUT');
  });

  it('for revives, purchases and a new best', () => {
    const session = running(5000);
    const { run } = session;
    run.hearts = 1;
    spawnBarrier(run.barriers, 'T', 0, -3, 0.9);
    for (let i = 0; i < 30 && session.screen === 'RUN'; i++) session.update(DT, i * DT);
    const seen = run.cues.count;
    session.revive();
    run.hearts = 1;
    spawnBarrier(run.barriers, 'T', 0, -3, 0.9);
    run.player.safeTimer = 0;
    for (let i = 0; i < 30 && session.screen === 'RUN'; i++) session.update(DT, i * DT);
    run.runStarsCollected = 10;
    session.decline();
    session.openShop();
    session.buy('accessory', 'bow');
    expect(cuesSince(run.cues, seen)).toEqual(['revive', 'hit', 'out', 'newBest', 'purchase']);
  });

  it('jump timing is unchanged by cues', () => {
    const session = running();
    applyAction(session.run.player, 'JUMP');
    let frames = 0;
    do {
      session.update(DT, frames * DT);
      frames++;
    } while (session.run.player.y > 0 && frames < 100);
    expect(frames * DT).toBeCloseTo(0.6, 1);
  });
});

describe('settings', () => {
  it('music, sound and reduce motion persist after reload', () => {
    const storage = new MemoryStorage();
    const session = new Session(storage);
    session.setSetting('music', false);
    session.setSetting('reduceMotion', true);
    const reloaded = new Session(storage);
    expect(reloaded.save.settings).toEqual({ music: false, sound: true, reduceMotion: true });
  });
});
