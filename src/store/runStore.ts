import { create } from 'zustand';
import { createRun, resetRun, togglePause, type RunState, type RunStatus } from '../game/run';

/** Live frame statistics written by the render loop, read by the debug panel. */
export interface FrameStats {
  fps: number;
}

/** A fresh seed per run in the app; tests use fixed seeds to replay runs. */
function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

interface RunStore {
  /**
   * The simulation. It is mutated in place every frame and never replaced, so
   * components read it in useFrame instead of subscribing to it.
   */
  run: RunState;
  stats: FrameStats;
  /** Mirrors run.status so React screens can re-render when it changes. */
  status: RunStatus;
  /** Mirrors run.forcedTier for the debug panel. */
  forcedTier: number | null;
  debugVisible: boolean;
  toggleDebug: () => void;
  /** Called by the render loop after each step. */
  syncStatus: () => void;
  restart: () => void;
  togglePause: () => void;
  setForcedTier: (tier: number | null) => void;
}

export const useRunStore = create<RunStore>((set, get) => ({
  run: createRun(newSeed()),
  stats: { fps: 0 },
  status: 'RUNNING',
  forcedTier: null,
  debugVisible: false,
  toggleDebug: () => set((state) => ({ debugVisible: !state.debugVisible })),
  syncStatus: () => {
    const { run, status } = get();
    if (run.status !== status) set({ status: run.status });
  },
  restart: () => {
    const { run } = get();
    resetRun(run, newSeed());
    set({ status: run.status });
  },
  togglePause: () => {
    const { run } = get();
    togglePause(run);
    set({ status: run.status });
  },
  setForcedTier: (tier) => {
    get().run.forcedTier = tier;
    set({ forcedTier: tier });
  },
}));
