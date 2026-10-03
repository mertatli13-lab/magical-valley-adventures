import { AUDIO, POOLS } from '../config';

/** Things that happen in the game that sound and effects react to. */
export const CUES = ['swipe', 'jump', 'slide', 'land', 'star', 'bigStar', 'hit', 'out', 'revive', 'purchase', 'newBest'] as const;
export type Cue = (typeof CUES)[number];

/**
 * A ring buffer of recent cues with where and when they happened. The game
 * pushes; sound and effects read everything since they last looked, by
 * sequence number. Fixed size and never reset, so it allocates nothing.
 */
export class CueFeed {
  private readonly codes = new Uint8Array(POOLS.CUES);
  readonly x = new Float64Array(POOLS.CUES);
  readonly y = new Float64Array(POOLS.CUES);
  readonly z = new Float64Array(POOLS.CUES);
  readonly time = new Float64Array(POOLS.CUES);
  /** Total cues so far; the newest has sequence number count - 1. */
  count = 0;

  push(cue: Cue, time: number, x = 0, y = 0, z = 0): void {
    const slot = this.count % POOLS.CUES;
    this.codes[slot] = CUES.indexOf(cue);
    this.time[slot] = time;
    this.x[slot] = x;
    this.y[slot] = y;
    this.z[slot] = z;
    this.count++;
  }

  /** The first sequence number still in the buffer, for a reader that last saw `seen`. */
  firstUnread(seen: number): number {
    return Math.max(seen, this.count - POOLS.CUES);
  }

  cue(sequence: number): Cue {
    return CUES[this.codes[sequence % POOLS.CUES] ?? 0] ?? 'swipe';
  }

  slot(sequence: number): number {
    return sequence % POOLS.CUES;
  }
}

const SEMITONES_PER_OCTAVE = 12;

/**
 * Star pickups in quick succession rise in pitch, one step per star up to a
 * cap, and start again after a second without a star.
 */
export class StarChain {
  private steps = 0;
  private last = -Infinity;

  /** Playback rate for a star collected at `time` (seconds). */
  next(time: number): number {
    if (time - this.last > AUDIO.STAR_CHAIN_RESET) this.steps = 0;
    this.last = time;
    const semitones = Math.min(this.steps, AUDIO.STAR_PITCH_MAX_STEPS) * AUDIO.STAR_PITCH_STEP;
    this.steps++;
    return 2 ** (semitones / SEMITONES_PER_OCTAVE);
  }
}
