/** Every sound the game plays, from public/audio/. Missing files are simply silent. */
export const SOUND_FILES = {
  swipe: 'audio/swipe.mp3',
  jump: 'audio/jump.mp3',
  slide: 'audio/slide.mp3',
  star: 'audio/star.mp3',
  bigStar: 'audio/big-star.mp3',
  hit: 'audio/hit.mp3',
  out: 'audio/out.mp3',
  revive: 'audio/revive.mp3',
  button: 'audio/button.mp3',
  purchase: 'audio/purchase.mp3',
  newBest: 'audio/new-best.mp3',
} as const;

export type Sound = keyof typeof SOUND_FILES;

/**
 * Music for the menus and for the run. Both play Mert's "Sugar Dash", so one song
 * runs through the whole game without restarting; give a track its own file to
 * cross-fade between two songs instead.
 */
export const MUSIC_FILES: Readonly<Record<'menu' | 'run', string>> = {
  menu: 'audio/music-sugar-dash.mp3',
  run: 'audio/music-sugar-dash.mp3',
};

export type Track = keyof typeof MUSIC_FILES;

export const ALL_AUDIO: readonly string[] = [...Object.values(SOUND_FILES), ...new Set(Object.values(MUSIC_FILES))];
