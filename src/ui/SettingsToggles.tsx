import type { SaveData } from '../game/save';
import { useGameStore, useSession } from '../store/gameStore';

const TOGGLES: { setting: keyof SaveData['settings']; label: string; icon: string }[] = [
  { setting: 'music', label: 'Music', icon: '♪' },
  { setting: 'sound', label: 'Sound', icon: '🔊' },
  { setting: 'reduceMotion', label: 'Reduce motion', icon: '🌀' },
];

/** Music, sound and reduce-motion switches. `compact` shows icons only (Landing corner). */
export function SettingsToggles({ compact = false }: { compact?: boolean }) {
  const session = useSession();
  const act = useGameStore((state) => state.act);
  return (
    <div className={compact ? 'settings compact' : 'settings'}>
      {TOGGLES.map(({ setting, label, icon }) => {
        const on = session.save.settings[setting];
        return (
          <button
            key={setting}
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            title={label}
            className={`setting${on ? ' on' : ''}`}
            onClick={() => act((s) => s.setSetting(setting, !on))}
          >
            <span className="setting-icon" aria-hidden="true">
              {icon}
            </span>
            {!compact && <span className="setting-label">{label}</span>}
            {!compact && <span className="setting-state">{on ? 'On' : 'Off'}</span>}
          </button>
        );
      })}
    </div>
  );
}
