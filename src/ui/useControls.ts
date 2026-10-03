import { useEffect } from 'react';
import { DEBUG } from '../config';
import { keyToAction, swipeToAction } from '../game/input';
import { useRunStore } from '../store/runStore';

/** Seconds on the same clock the render loop uses to consume the input buffer. */
export function nowSeconds(): number {
  return performance.now() / 1000;
}

/**
 * Listens for swipes and keys and feeds actions into the run's input buffer
 * (A2). Every action goes through the same buffer, whatever produced it.
 */
export function useControls(): void {
  useEffect(() => {
    const { run, toggleDebug } = useRunStore.getState();
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === DEBUG.TOGGLE_KEY) {
        if (!event.repeat) toggleDebug();
        return;
      }
      const action = keyToAction(event.code);
      if (action === null) return;
      event.preventDefault(); // stop Space and arrows from scrolling the page
      if (event.repeat) return; // holding a key does not repeat the action
      run.input.push(action, nowSeconds());
    };

    const onTouchStart = (event: TouchEvent) => {
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
      if (action !== null) run.input.push(action, nowSeconds());
    };

    const onTouchCancel = () => {
      tracking = false;
    };

    // Stops iPad Safari from scrolling or bouncing the page during a swipe.
    const onTouchMove = (event: TouchEvent) => event.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);
}
