import { REVIVE } from '../../config';
import { useGameStore, useSession } from '../../store/gameStore';

/** "Keep going?" with the revive price and a 5-second countdown. */
export function Out() {
  const session = useSession();
  const act = useGameStore((state) => state.act);
  if (session.screen !== 'OUT') return null;
  const usedAll = session.revivesThisRun >= REVIVE.MAX_PER_RUN;
  const reason = usedAll ? 'No revives left this run' : session.canRevive ? null : 'Not enough stars';

  return (
    <div className="overlay">
      <div className="panel">
        <h2 className="screen-heading">Keep going?</h2>
        <div className="countdown" aria-live="polite">
          {Math.ceil(session.outTimer)}
        </div>
        <button
          type="button"
          className="primary-button"
          autoFocus
          disabled={!session.canRevive}
          onClick={() => act((s) => s.revive())}
        >
          Revive · ★ {session.reviveCost}
        </button>
        {reason && <div className="panel-note">{reason}</div>}
        <button type="button" className="secondary-button" onClick={() => act((s) => s.decline())}>
          No thanks
        </button>
      </div>
    </div>
  );
}
