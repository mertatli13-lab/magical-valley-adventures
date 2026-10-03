import { describe, expect, it } from 'vitest';
import { HEARTS } from '../config';
import { baseSpeedAt, effectiveSpeed, gapTimeFor } from './difficulty';

const gapAt = (runTime: number) => gapTimeFor(baseSpeedAt(runTime));

describe('difficulty curve', () => {
  it('speed is 12 at 0 s, 20 at 80 s, 28 at 160 s and 28 at 300 s', () => {
    expect(baseSpeedAt(0)).toBeCloseTo(12);
    expect(baseSpeedAt(80)).toBeCloseTo(20);
    expect(baseSpeedAt(160)).toBeCloseTo(28);
    expect(baseSpeedAt(300)).toBeCloseTo(28);
  });

  it('gap time is 1.40 s at 0 s and 0.85 s at 160 s', () => {
    expect(gapAt(0)).toBeCloseTo(1.4);
    expect(gapAt(160)).toBeCloseTo(0.85);
    expect(gapAt(300)).toBeCloseTo(0.85);
  });

  it('matches the table in the design document', () => {
    const table = [
      [0, 12, 1.4, 16.8],
      [40, 16, 1.26, 20.2],
      [80, 20, 1.13, 22.5],
      [120, 24, 0.99, 23.7],
      [160, 28, 0.85, 23.8],
    ];
    for (const [time, speed, gap, distance] of table) {
      const t = time ?? 0;
      expect(baseSpeedAt(t)).toBeCloseTo(speed ?? 0);
      expect(gapAt(t)).toBeCloseTo(gap ?? 0, 1);
      expect(baseSpeedAt(t) * gapAt(t)).toBeCloseTo(distance ?? 0, 0);
    }
  });

  it('a hit slows the world by 20% only while safe', () => {
    expect(effectiveSpeed(20, 1, true)).toBeCloseTo(20 * HEARTS.HIT_SPEED_FACTOR);
    expect(effectiveSpeed(20, 0, true)).toBe(20);
    expect(effectiveSpeed(20, 1, false)).toBe(20);
  });
});
