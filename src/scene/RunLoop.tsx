import { useFrame } from '@react-three/fiber';
import { DEBUG } from '../config';
import { useGameStore } from '../store/gameStore';
import { nowSeconds } from '../ui/useControls';

/** Runs before every other frame callback so they all draw the same simulation step. */
const SIMULATION_PRIORITY = -1;

export function RunLoop() {
  useFrame((_, delta) => {
    const { session, stats, sync } = useGameStore.getState();
    if (delta > 0) stats.fps += (1 / delta - stats.fps) * DEBUG.FPS_SMOOTHING;
    session.update(delta, nowSeconds());
    sync();
  }, SIMULATION_PRIORITY);
  return null;
}
