import { useEffect, useState } from 'react';

/** Keeps something mounted for `ms` after it is hidden, so it can animate out. */
export function usePresence(show: boolean, ms: number): { mounted: boolean; leaving: boolean } {
  const [mounted, setMounted] = useState(show);
  useEffect(() => {
    if (show) {
      setMounted(true);
      return;
    }
    const id = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(id);
  }, [show, ms]);
  return { mounted: show || mounted, leaving: !show && mounted };
}
