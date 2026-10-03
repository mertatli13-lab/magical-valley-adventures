import { create } from 'zustand';

/** Loading progress for the Landing screen's loading bar. */
interface AssetStore {
  loaded: number;
  total: number;
  done: boolean;
  /** Files that were missing or broken, so the debug panel can list them. */
  missing: string[];
  setProgress: (loaded: number, total: number) => void;
  finish: (missing: string[]) => void;
}

export const useAssetStore = create<AssetStore>((set) => ({
  loaded: 0,
  total: 0,
  done: false,
  missing: [],
  setProgress: (loaded, total) => set({ loaded, total }),
  finish: (missing) => set({ done: true, missing }),
}));
