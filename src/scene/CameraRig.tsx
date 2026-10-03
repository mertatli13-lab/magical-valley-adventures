import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { CAMERA } from '../config';
import { frameDt } from '../game/run';
import { useRunStore } from '../store/runStore';

const [BASE_X, BASE_Y, BASE_Z] = CAMERA.POSITION;
const [LOOK_X, LOOK_Y, LOOK_Z] = CAMERA.LOOK_AT;

/** Fixed camera behind the hero that eases sideways toward 30% of the player's x. */
export function CameraRig() {
  const offsetX = useRef(0);

  useFrame(({ camera }, delta) => {
    const { player } = useRunStore.getState().run;
    const target = player.x * CAMERA.FOLLOW_X_FACTOR;
    const ease = 1 - Math.exp(-CAMERA.FOLLOW_RATE * frameDt(delta));
    offsetX.current += (target - offsetX.current) * ease;
    camera.position.set(BASE_X + offsetX.current, BASE_Y, BASE_Z);
    camera.lookAt(LOOK_X + offsetX.current, LOOK_Y, LOOK_Z);
  });

  return null;
}
