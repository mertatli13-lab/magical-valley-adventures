import { useEffect, useState } from 'react';
import { DEBUG, SPAWNER } from '../config';
import { activeBarrierCount } from '../game/barriers';
import { useGameStore } from '../store/gameStore';

interface Snapshot {
  fps: string;
  speed: string;
  lane: number;
  y: string;
  action: string;
  hearts: number;
  tier: number;
  gap: string;
  barriers: string;
  time: string;
  stars: number;
  placed: string;
  collected: string;
}

function readSnapshot(): Snapshot {
  const { session, stats } = useGameStore.getState();
  const { run } = session;
  const { player } = run;
  return {
    fps: stats.fps.toFixed(0),
    speed: run.speed.toFixed(DEBUG.DECIMALS),
    lane: player.lane,
    y: player.y.toFixed(DEBUG.DECIMALS),
    action: player.lastAction ?? '-',
    hearts: run.hearts,
    tier: run.tier,
    gap: run.gapTime.toFixed(DEBUG.DECIMALS),
    barriers: `${activeBarrierCount(run.barriers)}/${run.barriers.items.length}` +
      (run.barriers.dropped > 0 ? ` (${run.barriers.dropped} dropped)` : ''),
    time: run.time.toFixed(0),
    stars: run.runStarsCollected,
    placed: run.placedRate.perMinute(run.time).toFixed(0),
    collected: run.collectedRate.perMinute(run.time).toFixed(0),
  };
}

const AUTO = 'auto';
const TIER_OPTIONS = SPAWNER.PATTERNS.map((_, tier) => tier);

/** Toggled with the backtick key. Polls the simulation instead of re-rendering every frame. */
export function DebugPanel() {
  const visible = useGameStore((state) => state.debugVisible);
  const forcedTier = useGameStore((state) => state.forcedTier);
  const setForcedTier = useGameStore((state) => state.setForcedTier);
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
      <dt>time</dt>
      <dd>{snapshot.time} s</dd>
      <dt>speed</dt>
      <dd>{snapshot.speed} m/s</dd>
      <dt>lane</dt>
      <dd>{snapshot.lane}</dd>
      <dt>y</dt>
      <dd>{snapshot.y} m</dd>
      <dt>action</dt>
      <dd>{snapshot.action}</dd>
      <dt>hearts</dt>
      <dd>{snapshot.hearts}</dd>
      <dt>tier</dt>
      <dd>{snapshot.tier}</dd>
      <dt>gap</dt>
      <dd>{snapshot.gap} s</dd>
      <dt>barriers</dt>
      <dd>{snapshot.barriers}</dd>
      <dt>stars</dt>
      <dd>{snapshot.stars}</dd>
      <dt>placed/min</dt>
      <dd>{snapshot.placed}</dd>
      <dt>collected/min</dt>
      <dd>{snapshot.collected}</dd>
      <dt>
        <label htmlFor="force-tier">force tier</label>
      </dt>
      <dd>
        <select
          id="force-tier"
          value={forcedTier ?? AUTO}
          onChange={(event) => setForcedTier(event.target.value === AUTO ? null : Number(event.target.value))}
        >
          <option value={AUTO}>auto</option>
          {TIER_OPTIONS.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </dd>
    </dl>
  );
}
