import { MODELS, SPEED } from '../config';
import { clamp } from './math';

/** The eight clips every character model has, by exact name (Blender asset spec). */
export const CLIP_NAMES = ['Idle', 'Run', 'Jump', 'Slide', 'Hit', 'Out', 'Celebrate', 'Signature'] as const;
export type ClipName = (typeof CLIP_NAMES)[number];

/** Clips that loop; the rest play once and hold their last frame. */
export const LOOPING_CLIPS: ReadonlySet<ClipName> = new Set(['Idle', 'Run', 'Celebrate']);

/** What a character is doing, as far as its animation is concerned. */
export interface PoseInput {
  /** idle: on the stage; focus: in focus on the podium; run, out, celebrate: in a run. */
  pose: 'idle' | 'focus' | 'run' | 'out' | 'celebrate';
  airborne: boolean;
  sliding: boolean;
  /** Seconds since the last hit (Infinity if none). */
  hitAge: number;
  /** Which normal clip the equipped signature move replaces, if one is switched on. */
  signature: 'jump' | 'slide' | null;
}

/** Picks the clip for a character's current state. */
export function clipFor(input: PoseInput): ClipName {
  switch (input.pose) {
    case 'idle':
      return 'Idle';
    case 'focus':
      return 'Signature'; // the character in focus plays its signature pose
    case 'out':
      return 'Out';
    case 'celebrate':
      return 'Celebrate';
    case 'run':
      if (input.hitAge < MODELS.HIT_CLIP_TIME) return 'Hit';
      // A fast fall slides in the air, so sliding wins over airborne.
      if (input.sliding) return input.signature === 'slide' ? 'Signature' : 'Slide';
      if (input.airborne) return input.signature === 'jump' ? 'Signature' : 'Jump';
      return 'Run';
  }
}

/** Run clip playback rate: 1.0 at 12 m/s up to 1.6 at 28 m/s. */
export function runPlaybackRate(speed: number): number {
  const t = clamp((speed - SPEED.START) / (SPEED.MAX - SPEED.START), 0, 1);
  return MODELS.RUN_RATE_MIN + (MODELS.RUN_RATE_MAX - MODELS.RUN_RATE_MIN) * t;
}
