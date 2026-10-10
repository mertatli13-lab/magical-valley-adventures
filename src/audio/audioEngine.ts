import { AUDIO } from '../config';
import { MUSIC_FILES, SOUND_FILES, type Sound, type Track } from './audioManifest';

type AudioContextClass = typeof AudioContext;

/**
 * Web Audio playback. Browsers (iPad Safari above all) only allow sound after
 * a tap, so no AudioContext exists until unlock() is called from a user
 * gesture: nothing can play before the first tap. Sound effects are fetched
 * at startup and decoded after unlocking. Music streams from an <audio>
 * element through Web Audio instead of being decoded whole (a 3-minute song
 * would take about 65 MB of memory), and starts on the first tap. A missing
 * file is silent, with a warning in the console.
 */
class AudioEngine {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private soundGain: GainNode | null = null;
  private readonly fetched = new Map<string, Promise<ArrayBuffer | null>>();
  private readonly buffers = new Map<string, AudioBuffer | null>();
  /** One streaming element per music file: tracks that share a file share one song, so it never restarts. */
  private readonly music = new Map<string, { element: HTMLAudioElement; gain: GainNode }>();
  private musicOn = true;
  private soundOn = true;
  private track: Track = 'menu';
  private paused = false;
  /** Sounds played, for tests in development. */
  played = 0;

  /** Starts downloading sound effects (no sound is made). Music streams only after the first tap. */
  prefetch(paths: readonly string[] = Object.values(SOUND_FILES)): void {
    for (const path of paths) {
      if (this.fetched.has(path)) continue;
      this.fetched.set(path, this.fetchOne(path));
    }
  }

  private async fetchOne(path: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
      // Vite's dev server answers a missing file with the page itself.
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
        throw new Error(response.ok ? 'not an audio file' : `HTTP ${response.status}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.warn(`[audio] ${path} is missing (${(error as Error).message}); it will be silent.`);
      return null;
    }
  }

  get unlocked(): boolean {
    return this.context !== null;
  }

  /** Call from a tap, click or key press. Creates or resumes the audio context. */
  unlock(): void {
    if (this.context) {
      if (this.context.state === 'suspended' && !document.hidden) void this.context.resume().catch(() => {});
      // A later tap retries music the browser refused to start.
      for (const { element } of this.music.values()) if (element.paused && !document.hidden) void element.play().catch(() => {});
      return;
    }
    const Context: AudioContextClass | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    this.context = context;
    this.musicGain = context.createGain();
    this.soundGain = context.createGain();
    this.musicGain.connect(context.destination);
    this.soundGain.connect(context.destination);
    this.applyVolumes(0);
    // Older iOS needs a sound started inside the gesture to unlock output.
    const silence = context.createBufferSource();
    silence.buffer = context.createBuffer(1, 1, context.sampleRate);
    silence.connect(context.destination);
    silence.start();
    void context.resume().catch(() => {});
    this.prefetch();
    this.startMusic();
    void this.decodeAll();
  }

  private async decodeAll(): Promise<void> {
    const context = this.context;
    if (!context) return;
    await Promise.all(
      [...this.fetched].map(async ([path, bytes]) => {
        const data = await bytes;
        if (!data) return this.buffers.set(path, null);
        try {
          // Callback form, for older Safari.
          const buffer = await new Promise<AudioBuffer>((resolve, reject) =>
            context.decodeAudioData(data.slice(0), resolve, reject),
          );
          this.buffers.set(path, buffer);
        } catch {
          console.warn(`[audio] ${path} could not be decoded; it will be silent.`);
          this.buffers.set(path, null);
        }
      }),
    );
  }

  /**
   * Starts every music file looping, inside the unlocking gesture (play() must be
   * called from a tap on iPad Safari). Only the current track's file is audible.
   */
  private startMusic(): void {
    const context = this.context;
    if (!context || !this.musicGain) return;
    for (const path of new Set(Object.values(MUSIC_FILES))) {
      if (this.music.has(path)) continue;
      const element = new Audio(`${import.meta.env.BASE_URL}${path}`);
      element.loop = true;
      element.preload = 'auto';
      element.addEventListener('error', () => console.warn(`[audio] ${path} is missing or unreadable; it will be silent.`), {
        once: true,
      });
      const gain = context.createGain();
      gain.gain.value = 0;
      context.createMediaElementSource(element).connect(gain);
      gain.connect(this.musicGain);
      this.music.set(path, { element, gain });
      void element.play().catch(() => {});
    }
    this.applyVolumes(AUDIO.MUSIC_FADE);
  }

  private applyVolumes(fade: number): void {
    const context = this.context;
    if (!context || !this.musicGain || !this.soundGain) return;
    const now = context.currentTime;
    const ramp = (param: AudioParam, value: number) => {
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(value, now + fade);
    };
    ramp(this.musicGain.gain, this.musicOn ? AUDIO.MUSIC_VOLUME : 0);
    ramp(this.soundGain.gain, this.soundOn ? AUDIO.SOUND_VOLUME : 0);
    const current = MUSIC_FILES[this.track];
    for (const [path, { gain }] of this.music) {
      ramp(gain.gain, path === current ? (this.paused ? AUDIO.PAUSED_MUSIC_FACTOR : 1) : 0);
    }
  }

  /** Plays a sound effect, optionally faster or slower (higher or lower). Silent before unlocking. */
  play(sound: Sound, rate = 1): void {
    const context = this.context;
    if (!context || !this.soundGain || !this.soundOn || context.state !== 'running') return;
    const buffer = this.buffers.get(SOUND_FILES[sound]);
    this.played++;
    if (!buffer) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    source.connect(this.soundGain);
    source.start();
  }

  /** Which track should play, whether the game is paused, and the music and sound toggles. */
  setMix(track: Track, paused: boolean, musicOn: boolean, soundOn: boolean): void {
    if (track === this.track && paused === this.paused && musicOn === this.musicOn && soundOn === this.soundOn) return;
    this.track = track;
    this.paused = paused;
    this.musicOn = musicOn;
    this.soundOn = soundOn;
    this.applyVolumes(AUDIO.MUSIC_FADE);
  }

  /** Silences everything while the tab is hidden; the music pauses where it is. */
  suspend(): void {
    for (const { element } of this.music.values()) element.pause();
    void this.context?.suspend().catch(() => {});
  }

  resume(): void {
    if (!this.context || document.hidden) return;
    void this.context.resume().catch(() => {});
    for (const { element } of this.music.values()) void element.play().catch(() => {});
  }
}

export const audio = new AudioEngine();
