import { useFrame } from '@react-three/fiber';
import { DEBUG } from '../config';
import { stepRun } from '../game/run';
import { useRunStore } from '../store/runStore';
import { nowSeconds } from '../ui/useControls';

/** Runs before every other frame callback so they all draw the same simulation step. */
const SIMULATION_PRIORITY = -1;

export function RunLoop() {
  useFrame((_, delta) => {
    const { run, stats } = useRunStore.getState();
    if (delta > 0) stats.fps += (1 / delta - stats.fps) * DEBUG.FPS_SMOOTHING;
    stepRun(run, delta, nowSeconds());
  }, SIMULATION_PRIORITY);
  return null;
}
