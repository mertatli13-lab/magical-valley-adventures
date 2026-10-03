import { useGameStore, useSession } from '../../store/gameStore';

export function Results() {
  const session = useSession();
  const act = useGameStore((state) => state.act);
  if (session.screen !== 'RESULTS') return null;
  const { result } = session;

  return (
    <div className="overlay">
      <div className="panel">
        <h2 className="screen-heading">{result.newBest ? 'New best!' : 'Run over'}</h2>
        <dl className="results">
          <dt>Stars this run</dt>
          <dd>★ {result.starsCollected.toLocaleString('en')}</dd>
          <dt>Best run</dt>
          <dd>★ {result.bestRun.toLocaleString('en')}</dd>
          <dt>Distance</dt>
          <dd>{Math.floor(result.distance).toLocaleString('en')} m</dd>
          <dt>Total stars</dt>
          <dd>★ {result.totalStars.toLocaleString('en')}</dd>
        </dl>
        <button type="button" className="primary-button" autoFocus onClick={() => act((s) => s.playAgain())}>
          Play again
        </button>
        <button type="button" className="secondary-button" disabled title="Coming soon">
          Shop
        </button>
        <button type="button" className="secondary-button" onClick={() => act((s) => s.home())}>
          Home
        </button>
      </div>
    </div>
  );
}
