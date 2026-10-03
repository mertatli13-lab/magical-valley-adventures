import { useEffect, useRef } from 'react';
import { CHARACTERS } from '../../game/catalogue';
import { useGameStore, useSession } from '../../store/gameStore';
import { stageTags } from '../../store/stageTags';

/** Price tags over locked characters, placed each frame from positions the scene projects. */
function PriceTags() {
  const tags = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    let frame = 0;
    const place = () => {
      for (let i = 0; i < tags.current.length; i++) {
        const tag = tags.current[i];
        if (!tag) continue;
        tag.style.visibility = stageTags.visible[i] ? 'visible' : 'hidden';
        tag.style.transform = `translate(${stageTags.x[i]}px, ${stageTags.y[i]}px) translate(-50%, -100%)`;
      }
      frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <>
      {CHARACTERS.map((character, i) => (
        <div key={character.id} ref={(tag) => void (tags.current[i] = tag)} className="price-tag stage-tag">
          ★ {character.price.toLocaleString('en')}
        </div>
      ))}
    </>
  );
}

/** Character select overlay: the 3D stage is behind it. Swipe or arrow keys also turn the stage. */
export function Select() {
  const session = useSession();
  const act = useGameStore((state) => state.act);
  if (session.screen !== 'SELECT') return null;
  const character = session.selectedCharacter;
  const owned = session.owns(character);

  return (
    <div className="select-screen">
      <PriceTags />
      <h2 className="screen-heading">Choose your hero</h2>
      <div className="select-bar">
        <button type="button" className="round-button" aria-label="Previous" onClick={() => act((s) => s.rotate(-1))}>
          ‹
        </button>
        <div className="select-info">
          <div className="select-name">{character.name}</div>
          <div className="select-price">{owned ? 'Ready to run' : `Locked · ★ ${character.price.toLocaleString('en')}`}</div>
        </div>
        <button type="button" className="round-button" aria-label="Next" onClick={() => act((s) => s.rotate(1))}>
          ›
        </button>
      </div>
      <button
        type="button"
        className="primary-button"
        autoFocus
        disabled={!owned}
        onClick={() => act((s) => s.choose())}
      >
        {owned ? 'CHOOSE' : 'LOCKED'}
      </button>
    </div>
  );
}
