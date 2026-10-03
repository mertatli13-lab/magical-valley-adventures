import { useState, type ReactNode } from 'react';
import { SCREENS } from '../../config';
import { CHARACTERS } from '../../game/catalogue';
import { useAssetStore } from '../../store/assetStore';
import { useGameStore, useSession } from '../../store/gameStore';
import { SettingsToggles } from '../SettingsToggles';
import { usePresence } from '../usePresence';

const ART = `${import.meta.env.BASE_URL}ui/landing/`;
const TRANSITION_MS = SCREENS.TRANSITION_TIME * 1000;

/** An artwork layer that falls back to a drawn placeholder until the PNG exists. */
function Layer({ src, alt, className, fallback }: { src: string; alt: string; className: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return <img className={className} src={src} alt={alt} draggable={false} onError={() => setFailed(true)} />;
}

/**
 * Landing: layered 2D artwork (sky, drifting clouds, five floating characters)
 * around a pulsing PLAY button, with the star total in a corner. On PLAY it
 * slides up while the 3D camera moves down from the sky into the night forest.
 */
export function Landing() {
  const session = useSession();
  const act = useGameStore((state) => state.act);
  const { mounted, leaving } = usePresence(session.screen === 'LANDING', TRANSITION_MS);
  const { loaded, total, done } = useAssetStore();
  if (!mounted) return null;

  return (
    <div className={`landing${leaving ? ' leaving' : ''}`} aria-hidden={leaving}>
      <picture className="landing-sky">
        <source media="(orientation: portrait)" srcSet={`${ART}sky-9x16.png`} />
        <Layer src={`${ART}sky-16x9.png`} alt="" className="landing-sky-image" fallback={null} />
      </picture>
      <div className="landing-clouds">
        <Layer
          src={`${ART}clouds.png`}
          alt=""
          className="landing-clouds-image"
          fallback={
            <div className="landing-clouds-fallback">
              <span />
              <span />
              <span />
            </div>
          }
        />
      </div>
      <div className="landing-characters">
        {CHARACTERS.map((character, i) => (
          <div key={character.id} className={`landing-character slot-${i}`}>
            <Layer
              src={`${ART}${character.id}.png`}
              alt={character.name}
              className="landing-character-image"
              fallback={<div className={`landing-character-fallback ${character.id}`}>{character.name}</div>}
            />
          </div>
        ))}
      </div>
      <div className="landing-stars" aria-label="Total stars">
        ★ {session.save.totalStars.toLocaleString('en')}
      </div>
      <div className="landing-settings">
        <SettingsToggles compact />
      </div>
      <h1 className="landing-title">Magical Valley Adventures</h1>
      <button
        type="button"
        className="play-button"
        autoFocus
        disabled={leaving || !done}
        onClick={() => act((s) => s.play())}
      >
        {done ? 'PLAY' : 'Loading'}
      </button>
      {!done && (
        <div className="loading-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={loaded}>
          <div className="loading-fill" style={{ width: `${total ? (loaded / total) * 100 : 0}%` }} />
        </div>
      )}
    </div>
  );
}
