import { useEffect, useRef } from 'react';
import { HEARTS } from '../config';
import { useGameStore, useSession } from '../store/gameStore';

const HEART_INDICES = Array.from({ length: HEARTS.START }, (_, i) => i);
const BOUNCE_CLASS = 'bounce';

/**
 * Run HUD as an HTML overlay: hearts top left, star count top centre with the
 * distance under it, pause top right. Numbers are written straight into the
 * DOM from an animation-frame loop, so React does not re-render every frame.
 */
export function Hud() {
  const session = useSession();
  const act = useGameStore((state) => state.act);
  const heartsRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const distanceRef = useRef<HTMLSpanElement>(null);
  const { screen } = session;
  const visible = screen === 'RUN' || screen === 'PAUSE' || screen === 'OUT';

  // Restarts whenever the HUD appears, so fresh elements get their first values.
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    let shownStars = -1;
    let shownHearts = -1;
    let shownDistance = -1;
    const update = () => {
      const { run } = useGameStore.getState().session;
      if (run.runStarsCollected !== shownStars) {
        // Bounce on every pickup, but not when a new run resets the counter.
        const bounce = run.runStarsCollected > shownStars && shownStars >= 0;
        shownStars = run.runStarsCollected;
        if (starsRef.current) starsRef.current.textContent = String(shownStars);
        const counter = counterRef.current;
        if (bounce && counter) {
          counter.classList.remove(BOUNCE_CLASS);
          void counter.offsetWidth; // restart the CSS animation
          counter.classList.add(BOUNCE_CLASS);
        }
      }
      if (run.hearts !== shownHearts) {
        shownHearts = run.hearts;
        heartsRef.current?.querySelectorAll('.heart').forEach((heart, i) => {
          heart.classList.toggle('empty', i >= shownHearts);
        });
      }
      const distance = Math.floor(run.distance);
      if (distance !== shownDistance) {
        shownDistance = distance;
        if (distanceRef.current) distanceRef.current.textContent = String(distance);
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="hud">
      <div className="hud-hearts" ref={heartsRef} aria-label="Hearts">
        {HEART_INDICES.map((i) => (
          <span key={i} className="heart">
            ♥
          </span>
        ))}
      </div>
      <div className="hud-center">
        <div className="hud-stars" ref={counterRef}>
          <span className="hud-star-icon">★</span>
          <span ref={starsRef}>0</span>
        </div>
        <div className="hud-distance">
          <span ref={distanceRef}>0</span> m
        </div>
      </div>
      <button
        type="button"
        className="hud-pause"
        onClick={(event) => {
          act((s) => s.pause());
          event.currentTarget.blur(); // so Space keeps jumping instead of pressing the button
        }}
        disabled={screen !== 'RUN'}
        aria-label="Pause"
      >
        II
      </button>
    </div>
  );
}
