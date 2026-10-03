import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BoxGeometry, MeshStandardMaterial, type Mesh } from 'three';
import { OBSTACLES, POOLS, RENDER } from '../config';
import type { Barrier } from '../game/barriers';
import { useGameStore } from '../store/gameStore';

const POOL_INDICES = Array.from({ length: POOLS.BARRIERS }, (_, i) => i);

/** Height of the barrier's box and the y of its centre. */
function verticalExtent(barrier: Barrier, out: { height: number; centerY: number }): void {
  switch (barrier.type) {
    case 'L':
      out.height = OBSTACLES.LOW_HEIGHT;
      out.centerY = OBSTACLES.LOW_HEIGHT / 2;
      break;
    case 'H':
      out.height = RENDER.HIGH_BAR_THICKNESS;
      out.centerY = OBSTACLES.HIGH_CLEARANCE + RENDER.HIGH_BAR_THICKNESS / 2;
      break;
    case 'T':
      out.height = OBSTACLES.TALL_HEIGHT;
      out.centerY = OBSTACLES.TALL_HEIGHT / 2;
      break;
  }
}

/**
 * Grey-box barriers: one mesh per pooled barrier, created once. Each frame the
 * meshes copy the pool: visibility, position, size and colour by type.
 */
export function Barriers() {
  const meshes = useRef<(Mesh | null)[]>([]);
  const extent = useRef({ height: 0, centerY: 0 });
  const { geometry, materials } = useMemo(
    () => ({
      geometry: new BoxGeometry(1, 1, 1),
      materials: {
        L: new MeshStandardMaterial({ color: RENDER.LOW_COLOR }),
        H: new MeshStandardMaterial({ color: RENDER.HIGH_COLOR }),
        T: new MeshStandardMaterial({ color: RENDER.TALL_COLOR }),
      },
    }),
    [],
  );

  useFrame(() => {
    const items = useGameStore.getState().session.run.barriers.items;
    for (let i = 0; i < meshes.current.length; i++) {
      const mesh = meshes.current[i];
      const barrier = items[i];
      if (!mesh) continue;
      mesh.visible = barrier?.active ?? false;
      if (!barrier?.active) continue;
      verticalExtent(barrier, extent.current);
      mesh.material = materials[barrier.type];
      mesh.position.set(barrier.x, extent.current.centerY, barrier.z);
      mesh.scale.set(barrier.halfWidth * 2, extent.current.height, OBSTACLES.DEPTH);
    }
  });

  return (
    <>
      {POOL_INDICES.map((i) => (
        <mesh
          key={i}
          ref={(mesh) => void (meshes.current[i] = mesh)}
          geometry={geometry}
          material={materials.L}
          visible={false}
        />
      ))}
    </>
  );
}
