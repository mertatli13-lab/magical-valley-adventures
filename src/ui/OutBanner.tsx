import { useRunStore } from '../store/runStore';

/** Temporary Phase 2 screen at zero hearts. R restarts; tapping it does too, for the iPad. */
export function OutBanner() {
  const status = useRunStore((state) => state.status);
  const restart = useRunStore((state) => state.restart);
  if (status !== 'OUT') return null;
  return (
    <button type="button" className="out-banner" onClick={restart}>
      OUT - press R
    </button>
  );
}
