import { useEffect } from 'react';
import { audio } from '../audio/audioEngine';
import { DEBUG } from '../config';
import { keyToAction, swipeToAction } from '../game/input';
import { useGameStore } from '../store/gameStore';

/** Keys that pause and resume the run. */
const PAUSE_KEYS = ['KeyP', 'Escape'];

/** Seconds on the same clock the render loop uses to consume the input buffer. */
export function nowSeconds(): number {
  return performance.now() / 1000;
}

/**
 * Listens for swipes and keys and routes them by screen (A2):
 * - Run: the four moves go through the run's input buffer; P or Escape pauses.
 * - Pause: P or Escape resumes.
 * - Select: left and right turn the stage. A swipe left brings the next
 *   character to the front, like the arrow key on the right.
 * - Shop: Escape goes back.
 * Buttons on each screen handle taps, Enter and Space themselves.
 * The run also pauses, and sound stops, when the browser tab is hidden.
 * The first tap or key press unlocks sound.
 */
export function useControls(): void {
  useEffect(() => {
    const { act, toggleDebug } = useGameStore.getState();
    const session = () => useGameStore.getState().session;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onKeyDown = (event: KeyboardEvent) => {
      if (import.meta.env.DEV && event.code === DEBUG.TOGGLE_KEY) {
        if (!event.repeat) toggleDebug();
        return;
      }
      const screen = session().screen;
      const action = keyToAction(event.code);
      if (screen === 'RUN') {
        if (PAUSE_KEYS.includes(event.code)) {
          if (!event.repeat) act((s) => s.pause());
          return;
        }
        if (action === null) return;
        event.preventDefault(); // stop Space and arrows from scrolling the page
        if (!event.repeat) session().run.input.push(action, nowSeconds()); // holding a key does not repeat
      } else if (screen === 'PAUSE') {
        if (PAUSE_KEYS.includes(event.code) && !event.repeat) act((s) => s.resume());
      } else if (screen === 'SHOP') {
        if (event.code === 'Escape' && !event.repeat && !document.querySelector('[role="dialog"]')) act((s) => s.back());
      } else if (screen === 'SELECT') {
        if (action !== 'LEFT' && action !== 'RIGHT') return;
        event.preventDefault();
        if (!event.repeat) act((s) => s.rotate(action === 'RIGHT' ? 1 : -1));
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      // Development only: a three-finger tap opens the debug panel on a tablet with no keyboard.
      if (import.meta.env.DEV && event.touches.length === DEBUG.TOGGLE_TOUCHES) {
        toggleDebug();
        tracking = false;
        return;
      }
      const touch = event.changedTouches[0];
      if (!touch || tracking) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch || !tracking) return;
      tracking = false;
      const action = swipeToAction(touch.clientX - startX, touch.clientY - startY);
      if (action === null) return;
      const screen = session().screen;
      if (screen === 'RUN') session().run.input.push(action, nowSeconds());
      else if (screen === 'SELECT' && (action === 'LEFT' || action === 'RIGHT')) {
        act((s) => s.rotate(action === 'LEFT' ? 1 : -1));
      }
    };

    const onTouchCancel = () => {
      tracking = false;
    };

    // Stops iPad Safari from scrolling or bouncing the page during a swipe.
    const onTouchMove = (event: TouchEvent) => event.preventDefault();

    const onVisibilityChange = () => {
      if (document.hidden) {
        act((s) => s.pause());
        audio.suspend();
      } else {
        audio.resume();
      }
    };

    // Sound may only start after the player's first tap or key press (browser rule).
    const onGesture = () => audio.unlock();
    // Every enabled button clicks.
    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest?.('button');
      if (button && !button.disabled) audio.play('button');
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('touchend', onGesture, { passive: true });
    window.addEventListener('pointerup', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('touchend', onGesture);
      window.removeEventListener('pointerup', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
}
