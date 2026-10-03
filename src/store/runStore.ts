import { create } from 'zustand';
import { createRun, type RunState } from '../game/run';

/** Live frame statistics written by the render loop, read by the debug panel. */
export interface FrameStats {
  fps: number;
}

interface RunStore {
  /**
   * The simulation. It is mutated in place every frame and never replaced, so
   * components read it in useFrame instead of subscribing to it.
   */
  run: RunState;
  stats: FrameStats;
  debugVisible: boolean;
  toggleDebug: () => void;
}

export const useRunStore = create<RunStore>((set) => ({
  run: createRun(),
  stats: { fps: 0 },
  debugVisible: false,
  toggleDebug: () => set((state) => ({ debugVisible: !state.debugVisible })),
}));
