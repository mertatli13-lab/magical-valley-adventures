import { describe, expect, it } from 'vitest';
import { INPUT_BUFFER_TIME, JUMP, LANE_CHANGE_TIME, LANES, PLAYER, SLIDE } from '../config';
import { InputBuffer, type Action } from './input';
import { applyAction, createPlayer, isOnGround, laneX, stepPlayer, updatePlayer } from './player';

const FRAME_RATES = [30, 60, 120];

function simulateJump(fps: number) {
  const dt = 1 / fps;
  const player = createPlayer();
  applyAction(player, 'JUMP');
  let peak = 0;
  let time = 0;
  do {
    stepPlayer(player, dt);
    time += dt;
    peak = Math.max(peak, player.y);
  } while (!isOnGround(player) && time < 2);
  return { peak, airTime: time, dt };
}

describe('jump', () => {
  it.each(FRAME_RATES)('peaks at 1.6 m and lands after 0.6 s at %i fps', (fps) => {
    const { peak, airTime, dt } = simulateJump(fps);
    expect(Math.abs(peak - JUMP.HEIGHT)).toBeLessThanOrEqual(0.05);
    // The landing is detected on the first frame at or after touchdown.
    expect(Math.abs(airTime - JUMP.AIR_TIME)).toBeLessThanOrEqual(Math.max(0.02, dt));
  });

  it('meets the tight 0.02 s tolerance at 60 fps', () => {
    expect(Math.abs(simulateJump(60).airTime - JUMP.AIR_TIME)).toBeLessThanOrEqual(0.02);
  });

  it('cannot jump again in the air', () => {
    const player = createPlayer();
    const buffer = new InputBuffer();
    applyAction(player, 'JUMP');
    stepPlayer(player, 1 / 60);
    const vy = player.vy;
    buffer.push('JUMP', 0);
    updatePlayer(player, buffer, 0, 1 / 60);
    expect(player.vy).toBeLessThan(vy);
  });
});

describe('lane change', () => {
  it.each(FRAME_RATES)('completes in 0.12 s at %i fps', (fps) => {
    const dt = 1 / fps;
    const player = createPlayer();
    applyAction(player, 'RIGHT');
    const target = laneX(player.lane);
    let time = 0;
    while (player.x !== target && time < 1) {
      stepPlayer(player, dt);
      time += dt;
    }
    expect(player.x).toBe(target);
    expect(Math.abs(time - LANE_CHANGE_TIME)).toBeLessThanOrEqual(dt);
  });

  it('lane centres are at -2, 0 and +2', () => {
    expect([0, 1, 2].map(laneX)).toEqual([...LANES.X]);
  });

  it('lane index never leaves 0..2', () => {
    const player = createPlayer();
    const actions: Action[] = ['LEFT', 'RIGHT', 'JUMP', 'SLIDE'];
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 10_000; i++) {
      applyAction(player, actions[Math.floor(random() * actions.length)] ?? 'LEFT');
      stepPlayer(player, 1 / 60);
      expect(player.lane).toBeGreaterThanOrEqual(LANES.MIN_INDEX);
      expect(player.lane).toBeLessThanOrEqual(LANES.MAX_INDEX);
    }
    for (let i = 0; i < 5; i++) applyAction(player, 'LEFT');
    expect(player.lane).toBe(LANES.MIN_INDEX);
    for (let i = 0; i < 5; i++) applyAction(player, 'RIGHT');
    expect(player.lane).toBe(LANES.MAX_INDEX);
  });

  it('is allowed in the air', () => {
    const player = createPlayer();
    const buffer = new InputBuffer();
    applyAction(player, 'JUMP');
    stepPlayer(player, 1 / 60);
    buffer.push('LEFT', 0);
    updatePlayer(player, buffer, 0, 1 / 60);
    expect(player.lane).toBe(LANES.START_INDEX - 1);
  });
});

describe('slide', () => {
  it('halves the height for 0.7 s', () => {
    const dt = 1 / 60;
    const player = createPlayer();
    applyAction(player, 'SLIDE');
    let time = 0;
    stepPlayer(player, dt);
    time += dt;
    expect(player.height).toBe(PLAYER.SLIDE_HEIGHT);
    while (player.height === PLAYER.SLIDE_HEIGHT && time < 2) {
      stepPlayer(player, dt);
      time += dt;
    }
    expect(Math.abs(time - SLIDE.TIME)).toBeLessThanOrEqual(dt);
    expect(player.height).toBe(PLAYER.STAND_HEIGHT);
  });

  it('in the air drops straight into a slide (fast fall)', () => {
    const dt = 1 / 60;
    const player = createPlayer();
    applyAction(player, 'JUMP');
    for (let i = 0; i < 15; i++) stepPlayer(player, dt); // near the top of the jump
    applyAction(player, 'SLIDE');
    expect(player.vy).toBe(SLIDE.FAST_FALL_VELOCITY);
    let frames = 0;
    while (!isOnGround(player) && frames < 60) {
      stepPlayer(player, dt);
      frames++;
    }
    expect(frames * dt).toBeLessThan(JUMP.AIR_TIME / 2);
    expect(player.height).toBe(PLAYER.SLIDE_HEIGHT);
  });

  it('a jump cancels a slide', () => {
    const player = createPlayer();
    applyAction(player, 'SLIDE');
    applyAction(player, 'JUMP');
    stepPlayer(player, 1 / 60);
    expect(player.height).toBe(PLAYER.STAND_HEIGHT);
  });
});

describe('input buffer', () => {
  it('drops an action older than 0.15 s', () => {
    const buffer = new InputBuffer();
    buffer.push('JUMP', 10);
    expect(buffer.peek(10 + INPUT_BUFFER_TIME + 0.01)).toBeNull();
    expect(buffer.peek(10)).toBeNull();
  });

  it('keeps an action up to 0.15 s old', () => {
    const buffer = new InputBuffer();
    buffer.push('LEFT', 10);
    expect(buffer.peek(10 + INPUT_BUFFER_TIME - 0.01)).toBe('LEFT');
  });

  it('plays a jump pressed just before landing as soon as the hero lands', () => {
    const dt = 1 / 60;
    const player = createPlayer();
    const buffer = new InputBuffer();
    applyAction(player, 'JUMP');
    let now = 0;
    // Run until 0.1 s before landing, then press jump.
    while (now < JUMP.AIR_TIME - 0.1) {
      updatePlayer(player, buffer, now, dt);
      now += dt;
    }
    buffer.push('JUMP', now);
    let jumpedAgain = false;
    for (let i = 0; i < 30 && !jumpedAgain; i++) {
      const wasOnGround = isOnGround(player);
      updatePlayer(player, buffer, now, dt);
      now += dt;
      if (wasOnGround && player.y > 0) jumpedAgain = true;
    }
    expect(jumpedAgain).toBe(true);
  });

  it('drops a jump pressed too early to be played on landing', () => {
    const dt = 1 / 60;
    const player = createPlayer();
    const buffer = new InputBuffer();
    applyAction(player, 'JUMP');
    let now = 0;
    updatePlayer(player, buffer, now, dt);
    buffer.push('JUMP', now);
    while (now < 2) {
      updatePlayer(player, buffer, now, dt);
      now += dt;
    }
    expect(isOnGround(player)).toBe(true);
    expect(player.y).toBe(0);
  });
});
