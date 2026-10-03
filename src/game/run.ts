import { MAX_DT, PHASE1_SPEED } from '../config';
import { createGround, resetGround, stepGround, type GroundState } from './ground';
import { InputBuffer } from './input';
import { createPlayer, resetPlayer, updatePlayer, type PlayerState } from './player';

/** Everything the simulation of one run needs. Created once and reused across runs. */
export interface RunState {
  time: number;
  distance: number;
  speed: number;
  player: PlayerState;
  ground: GroundState;
  input: InputBuffer;
}

export function createRun(): RunState {
  return {
    time: 0,
    distance: 0,
    speed: PHASE1_SPEED,
    player: createPlayer(),
    ground: createGround(),
    input: new InputBuffer(),
  };
}

export function resetRun(run: RunState): void {
  run.time = 0;
  run.distance = 0;
  run.speed = PHASE1_SPEED;
  resetPlayer(run.player);
  resetGround(run.ground);
  run.input.consume();
}

/** Clamps a real frame time so a slow frame cannot cause a huge jump (A8). */
export function frameDt(realDt: number): number {
  return Math.min(realDt, MAX_DT);
}

/** Advances the run by one frame. `now` is in seconds, on the same clock as input timestamps. */
export function stepRun(run: RunState, realDt: number, now: number): void {
  const dt = frameDt(realDt);
  run.time += dt;
  run.speed = PHASE1_SPEED;
  run.distance += run.speed * dt;
  updatePlayer(run.player, run.input, now, dt);
  stepGround(run.ground, run.speed * dt);
}
