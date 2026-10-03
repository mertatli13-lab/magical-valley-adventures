import { describe, expect, it } from 'vitest';
import { HEARTS, MODELS } from '../config';
import { clipFor, LOOPING_CLIPS, runPlaybackRate, type PoseInput } from './animation';

const base: PoseInput = { pose: 'run', airborne: false, sliding: false, hitAge: Infinity, signature: null };

describe('clip choice', () => {
  it('runs, jumps and slides', () => {
    expect(clipFor(base)).toBe('Run');
    expect(clipFor({ ...base, airborne: true })).toBe('Jump');
    expect(clipFor({ ...base, sliding: true })).toBe('Slide');
  });

  it('a fast fall shows the slide', () => {
    expect(clipFor({ ...base, airborne: true, sliding: true })).toBe('Slide');
  });

  it('plays Hit for 0.5 s after a hit, then goes back', () => {
    expect(clipFor({ ...base, hitAge: 0 })).toBe('Hit');
    expect(clipFor({ ...base, hitAge: MODELS.HIT_CLIP_TIME - 0.01 })).toBe('Hit');
    expect(clipFor({ ...base, hitAge: MODELS.HIT_CLIP_TIME })).toBe('Run');
    expect(MODELS.HIT_CLIP_TIME).toBeLessThanOrEqual(HEARTS.HIT_SAFE_TIME);
  });

  it('a signature move replaces only the clip it is for', () => {
    expect(clipFor({ ...base, airborne: true, signature: 'jump' })).toBe('Signature');
    expect(clipFor({ ...base, sliding: true, signature: 'jump' })).toBe('Slide');
    expect(clipFor({ ...base, sliding: true, signature: 'slide' })).toBe('Signature');
    expect(clipFor({ ...base, airborne: true, signature: 'slide' })).toBe('Jump');
  });

  it('screens: stage idle, podium signature pose, out, celebrate', () => {
    expect(clipFor({ ...base, pose: 'idle' })).toBe('Idle');
    expect(clipFor({ ...base, pose: 'focus' })).toBe('Signature');
    expect(clipFor({ ...base, pose: 'out' })).toBe('Out');
    expect(clipFor({ ...base, pose: 'celebrate' })).toBe('Celebrate');
  });

  it('loops only Idle, Run and Celebrate', () => {
    expect([...LOOPING_CLIPS].sort()).toEqual(['Celebrate', 'Idle', 'Run']);
  });
});

describe('run playback rate', () => {
  it('is 1.0 at 12 m/s and 1.6 at 28 m/s', () => {
    expect(runPlaybackRate(12)).toBeCloseTo(1);
    expect(runPlaybackRate(20)).toBeCloseTo(1.3);
    expect(runPlaybackRate(28)).toBeCloseTo(1.6);
  });

  it('stays in range when slowed by a hit or past the cap', () => {
    expect(runPlaybackRate(9.6)).toBeCloseTo(1);
    expect(runPlaybackRate(40)).toBeCloseTo(1.6);
  });
});
