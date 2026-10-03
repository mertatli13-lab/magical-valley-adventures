import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh, MeshStandardMaterial } from 'three';
import { CHARACTER_COLORS, CHARACTER_POSES, PLAYER, RENDER } from '../config';
import { useGameStore } from '../store/gameStore';

const RADIUS = PLAYER.HALF_WIDTH;
const BODY_LENGTH = PLAYER.STAND_HEIGHT - 2 * RADIUS;

/**
 * Grey-box hero: a capsule 1.2 m tall in the chosen character's colour. It
 * squashes when sliding, blinks while safe, sits tilted when out and hops on
 * a new best run.
 */
export function Player() {
  const mesh = useRef<Mesh>(null);
  const shownCharacter = useRef('');

  useFrame(({ clock }) => {
    const body = mesh.current;
    if (!body) return;
    const { session } = useGameStore.getState();
    const { player } = session.run;
    const character = session.equippedCharacter.id;
    if (character !== shownCharacter.current) {
      shownCharacter.current = character;
      (body.material as MeshStandardMaterial).color.set(CHARACTER_COLORS[character]);
    }
    const celebrating = session.screen === 'RESULTS' && session.result.newBest;
    const hop = celebrating
      ? Math.abs(Math.sin(clock.elapsedTime * CHARACTER_POSES.CELEBRATE_RATE)) * CHARACTER_POSES.CELEBRATE_HEIGHT
      : 0;
    body.position.set(player.x, player.y + player.height / 2 + hop, PLAYER.Z);
    body.scale.y = player.height / PLAYER.STAND_HEIGHT;
    body.rotation.z = session.screen === 'OUT' ? CHARACTER_POSES.OUT_TILT : 0;
    // Blink while safe (not while frozen on another screen): visible for half of each blink period.
    const blinking = session.screen === 'RUN' && player.safeTimer > 0;
    body.visible = !blinking || (player.safeTimer * RENDER.BLINK_HZ) % 1 >= 0.5;
  });

  return (
    <mesh ref={mesh}>
      <capsuleGeometry args={[RADIUS, BODY_LENGTH, RENDER.PLAYER_CAP_SEGMENTS, RENDER.PLAYER_RADIAL_SEGMENTS]} />
      <meshStandardMaterial color={RENDER.PLAYER_COLOR} />
    </mesh>
  );
}
