import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { PLAYER, RENDER } from '../config';
import { useRunStore } from '../store/runStore';

const RADIUS = PLAYER.HALF_WIDTH;
const BODY_LENGTH = PLAYER.STAND_HEIGHT - 2 * RADIUS;

/** Grey-box hero: a capsule 1.2 m tall that squashes to half height when sliding. */
export function Player() {
  const mesh = useRef<Mesh>(null);

  useFrame(() => {
    const body = mesh.current;
    if (!body) return;
    const { player } = useRunStore.getState().run;
    body.position.set(player.x, player.y + player.height / 2, PLAYER.Z);
    body.scale.y = player.height / PLAYER.STAND_HEIGHT;
  });

  return (
    <mesh ref={mesh}>
      <capsuleGeometry args={[RADIUS, BODY_LENGTH, RENDER.PLAYER_CAP_SEGMENTS, RENDER.PLAYER_RADIAL_SEGMENTS]} />
      <meshStandardMaterial color={RENDER.PLAYER_COLOR} />
    </mesh>
  );
}
