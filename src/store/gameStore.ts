import { create } from 'zustand';
import type { StorageLike } from '../game/save';
import { Session } from '../game/session';

/** Live frame statistics written by the render loop, read by the debug panel. */
export interface FrameStats {
  fps: number;
}

/** A fresh seed per run in the app; tests use fixed seeds to replay runs. */
function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

/** localStorage, or null where it is blocked (some private-browsing modes throw on access). */
function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface GameStore {
  /**
   * The game. It is mutated in place and never replaced; `version` changes
   * whenever something on screen should update, so components subscribe to
   * `version` and read the session.
   */
  session: Session;
  version: number;
  stats: FrameStats;
  /** Mirrors run.forcedTier for the debug panel. */
  forcedTier: number | null;
  debugVisible: boolean;
  /** Runs an action on the session and lets the UI know if it changed anything. */
  act: (action: (session: Session) => void) => void;
  /** Called by the render loop after each frame. */
  sync: () => void;
  toggleDebug: () => void;
  setForcedTier: (tier: number | null) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: new Session(browserStorage(), newSeed),
  version: 0,
  stats: { fps: 0 },
  forcedTier: null,
  debugVisible: false,
  act: (action) => {
    action(get().session);
    get().sync();
  },
  sync: () => {
    const { session, version } = get();
    if (session.changes !== version) set({ version: session.changes });
  },
  toggleDebug: () => set((state) => ({ debugVisible: !state.debugVisible })),
  setForcedTier: (tier) => {
    get().session.run.forcedTier = tier;
    set({ forcedTier: tier });
  },
}));

/** The session, re-rendering the component whenever the session reports a change. */
export function useSession(): Session {
  useGameStore((state) => state.version);
  return useGameStore((state) => state.session);
}
