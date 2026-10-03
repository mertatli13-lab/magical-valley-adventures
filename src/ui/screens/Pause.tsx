import { useGameStore, useSession } from '../../store/gameStore';
import { SettingsToggles } from '../SettingsToggles';

export function Pause() {
  const session = useSession();
  const act = useGameStore((state) => state.act);
  if (session.screen !== 'PAUSE') return null;
  return (
    <div className="overlay dim">
      <div className="panel">
        <h2 className="screen-heading">Paused</h2>
        <button type="button" className="primary-button" autoFocus onClick={() => act((s) => s.resume())}>
          Resume
        </button>
        <button type="button" className="secondary-button" onClick={() => act((s) => s.restart())}>
          Restart
        </button>
        <button type="button" className="secondary-button" onClick={() => act((s) => s.home())}>
          Home
        </button>
        <SettingsToggles />
      </div>
    </div>
  );
}
