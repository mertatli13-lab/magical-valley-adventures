import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { GROUND, LANES, POOLS, RENDER } from '../config';
import { laneX } from '../game/player';
import { useGameStore } from '../store/gameStore';

const CHUNK_INDICES = Array.from({ length: POOLS.GROUND_CHUNKS }, (_, i) => i);
const LANE_INDICES = Array.from({ length: LANES.COUNT }, (_, i) => i);
const BAND_INDICES = Array.from({ length: RENDER.BANDS_PER_CHUNK }, (_, i) => i);
const BAND_SPACING = GROUND.CHUNK_LENGTH / RENDER.BANDS_PER_CHUNK;

/** One 40 m chunk: the ground, three lane stripes and cross bands to show the scroll. */
function Chunk() {
  return (
    <>
      <mesh rotation-x={RENDER.FLAT_ROTATION_X}>
        <planeGeometry args={[GROUND.CHUNK_WIDTH, GROUND.CHUNK_LENGTH]} />
        <meshStandardMaterial color={RENDER.GROUND_COLOR} />
      </mesh>
      {LANE_INDICES.map((lane) => (
        <mesh key={lane} rotation-x={RENDER.FLAT_ROTATION_X} position={[laneX(lane), RENDER.STRIPE_LIFT, 0]}>
          <planeGeometry args={[RENDER.LANE_STRIPE_WIDTH, GROUND.CHUNK_LENGTH]} />
          <meshStandardMaterial color={RENDER.LANE_STRIPE_COLOR} />
        </mesh>
      ))}
      {BAND_INDICES.map((band) => (
        <mesh
          key={band}
          rotation-x={RENDER.FLAT_ROTATION_X}
          position={[0, RENDER.BAND_LIFT, GROUND.CHUNK_LENGTH / 2 - band * BAND_SPACING]}
        >
          <planeGeometry args={[GROUND.CHUNK_WIDTH, RENDER.BAND_DEPTH]} />
          <meshStandardMaterial color={RENDER.BAND_COLOR} />
        </mesh>
      ))}
    </>
  );
}

/** The pooled ground chunks, created once and moved every frame to follow the simulation. */
export function Ground() {
  const chunks = useRef<(Group | null)[]>([]);

  useFrame(() => {
    const { chunkZ } = useGameStore.getState().session.run.ground;
    for (let i = 0; i < chunks.current.length; i++) {
      const chunk = chunks.current[i];
      if (chunk) chunk.position.z = chunkZ[i] ?? 0;
    }
  });

  return (
    <>
      {CHUNK_INDICES.map((i) => (
        <group key={i} ref={(group) => void (chunks.current[i] = group)}>
          <Chunk />
        </group>
      ))}
    </>
  );
}
