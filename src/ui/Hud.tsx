import { useEffect, useRef } from 'react';
import { HEARTS } from '../config';
import { useRunStore } from '../store/runStore';

const HEART_INDICES = Array.from({ length: HEARTS.START }, (_, i) => i);
const BOUNCE_CLASS = 'bounce';

/**
 * Run HUD as an HTML overlay: hearts top left, star count top centre with the
 * distance under it, pause top right. Numbers are written straight into the
 * DOM from an animation-frame loop, so React does not re-render every frame.
 */
export function Hud() {
  const status = useRunStore((state) => state.status);
  const togglePause = useRunStore((state) => state.togglePause);
  const heartsRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const distanceRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    let shownStars = -1;
    let shownHearts = -1;
    let shownDistance = -1;
    const update = () => {
      const { run } = useRunStore.getState();
      if (run.runStars !== shownStars) {
        // Bounce on every pickup, but not when a new run resets the counter.
        const bounce = run.runStars > shownStars && shownStars >= 0;
        shownStars = run.runStars;
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
  }, []);

  const paused = status === 'PAUSED';
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
          togglePause();
          event.currentTarget.blur(); // so Space keeps jumping instead of pressing the button
        }}
        disabled={status === 'OUT'}
        aria-label={paused ? 'Resume' : 'Pause'}
      >
        {paused ? '▶' : 'II'}
      </button>
      {paused && <div className="hud-paused">Paused</div>}
    </div>
  );
}
