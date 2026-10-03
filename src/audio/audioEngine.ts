import { AUDIO } from '../config';
import { MUSIC_FILES, SOUND_FILES, type Sound, type Track } from './audioManifest';

type AudioContextClass = typeof AudioContext;

/**
 * Web Audio playback. Browsers (iPad Safari above all) only allow sound after
 * a tap, so no AudioContext exists until unlock() is called from a user
 * gesture: nothing can play before the first tap. Files are fetched at
 * startup and decoded after unlocking; a missing file is silent, with a
 * warning in the console.
 */
class AudioEngine {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private soundGain: GainNode | null = null;
  private readonly fetched = new Map<string, Promise<ArrayBuffer | null>>();
  private readonly buffers = new Map<string, AudioBuffer | null>();
  private readonly trackGains = new Map<Track, GainNode>();
  private musicOn = true;
  private soundOn = true;
  private track: Track = 'menu';
  private paused = false;
  /** Sounds played, for tests in development. */
  played = 0;

  /**
   * Starts downloading files (no sound is made). Sound effects download at
   * startup; the larger music files only after the first tap, to keep the
   * first load small.
   */
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
    this.prefetch(Object.values(MUSIC_FILES));
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
    this.startMusic();
  }

  /** Both tracks loop from the start; only the current one is audible. */
  private startMusic(): void {
    const context = this.context;
    if (!context || !this.musicGain) return;
    for (const track of Object.keys(MUSIC_FILES) as Track[]) {
      const buffer = this.buffers.get(MUSIC_FILES[track]);
      if (!buffer || this.trackGains.has(track)) continue;
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(this.musicGain);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      this.trackGains.set(track, gain);
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
    for (const [track, gain] of this.trackGains) {
      ramp(gain.gain, track === this.track ? (this.paused ? AUDIO.PAUSED_MUSIC_FACTOR : 1) : 0);
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

  /** Silences everything while the tab is hidden. */
  suspend(): void {
    void this.context?.suspend().catch(() => {});
  }

  resume(): void {
    if (this.context && !document.hidden) void this.context.resume().catch(() => {});
  }
}

export const audio = new AudioEngine();
