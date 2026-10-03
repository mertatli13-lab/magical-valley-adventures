import { describe, expect, it } from 'vitest';
import { INPUT } from '../config';
import { keyToAction, swipeToAction } from './input';

describe('swipes', () => {
  const far = INPUT.SWIPE_MIN_DISTANCE_PX * 2;

  it('ignores taps shorter than the minimum distance', () => {
    expect(swipeToAction(INPUT.SWIPE_MIN_DISTANCE_PX - 1, 0)).toBeNull();
    expect(swipeToAction(0, 0)).toBeNull();
  });

  it('maps the four directions (screen y points down)', () => {
    expect(swipeToAction(far, 0)).toBe('RIGHT');
    expect(swipeToAction(-far, 0)).toBe('LEFT');
    expect(swipeToAction(0, -far)).toBe('JUMP');
    expect(swipeToAction(0, far)).toBe('SLIDE');
  });

  it('uses the dominant axis for diagonal swipes', () => {
    expect(swipeToAction(far, -far / 2)).toBe('RIGHT');
    expect(swipeToAction(far / 2, -far)).toBe('JUMP');
  });
});

describe('keys', () => {
  it('maps arrows, WASD and Space', () => {
    expect(['ArrowLeft', 'KeyA'].map(keyToAction)).toEqual(['LEFT', 'LEFT']);
    expect(['ArrowRight', 'KeyD'].map(keyToAction)).toEqual(['RIGHT', 'RIGHT']);
    expect(['ArrowUp', 'KeyW', 'Space'].map(keyToAction)).toEqual(['JUMP', 'JUMP', 'JUMP']);
    expect(['ArrowDown', 'KeyS'].map(keyToAction)).toEqual(['SLIDE', 'SLIDE']);
    expect(keyToAction('KeyQ')).toBeNull();
  });
});
