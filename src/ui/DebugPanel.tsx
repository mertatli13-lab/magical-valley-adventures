import { useEffect, useState } from 'react';
import { DEBUG } from '../config';
import { useRunStore } from '../store/runStore';

interface Snapshot {
  fps: string;
  speed: string;
  lane: number;
  y: string;
  action: string;
}

function readSnapshot(): Snapshot {
  const { run, stats } = useRunStore.getState();
  const { player } = run;
  return {
    fps: stats.fps.toFixed(0),
    speed: run.speed.toFixed(DEBUG.DECIMALS),
    lane: player.lane,
    y: player.y.toFixed(DEBUG.DECIMALS),
    action: player.lastAction ?? '-',
  };
}

/** Toggled with the backtick key. Polls the simulation instead of re-rendering every frame. */
export function DebugPanel() {
  const visible = useRunStore((state) => state.debugVisible);
  const [snapshot, setSnapshot] = useState(readSnapshot);

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => setSnapshot(readSnapshot()), DEBUG.REFRESH_MS);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;
  return (
    <dl className="debug-panel">
      <dt>fps</dt>
      <dd>{snapshot.fps}</dd>
      <dt>speed</dt>
      <dd>{snapshot.speed} m/s</dd>
      <dt>lane</dt>
      <dd>{snapshot.lane}</dd>
      <dt>y</dt>
      <dd>{snapshot.y} m</dd>
      <dt>action</dt>
      <dd>{snapshot.action}</dd>
    </dl>
  );
}
