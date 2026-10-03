import { StarChain, type Cue } from '../game/cues';
import type { Screen } from '../game/machine';
import type { Session } from '../game/session';
import type { Sound, Track } from './audioManifest';
import { audio } from './audioEngine';

/** Cues that have a sound. Landing only makes dust. */
const CUE_SOUNDS: Partial<Record<Cue, Sound>> = {
  swipe: 'swipe',
  jump: 'jump',
  slide: 'slide',
  star: 'star',
  bigStar: 'bigStar',
  hit: 'hit',
  out: 'out',
  revive: 'revive',
  purchase: 'purchase',
  newBest: 'newBest',
};

function trackFor(screen: Screen): Track {
  return screen === 'RUN' || screen === 'PAUSE' || screen === 'OUT' ? 'run' : 'menu';
}

const chain = new StarChain();
let seen = -1;

/** Once per frame: plays a sound for each new cue and sets the music for the screen. */
export function updateAudio(session: Session): void {
  const { cues } = session.run;
  if (seen < 0) seen = cues.count; // nothing from before the first frame
  for (let n = cues.firstUnread(seen); n < cues.count; n++) {
    const cue = cues.cue(n);
    const sound = CUE_SOUNDS[cue];
    if (!sound) continue;
    // Stars rise in pitch when collected in quick succession.
    const rate = cue === 'star' || cue === 'bigStar' ? chain.next(cues.time[cues.slot(n)] ?? 0) : 1;
    audio.play(sound, rate);
  }
  seen = cues.count;
  const { music, sound } = session.save.settings;
  audio.setMix(trackFor(session.screen), session.screen === 'PAUSE', music, sound);
}
