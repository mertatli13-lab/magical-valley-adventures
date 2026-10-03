import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh, MeshBasicMaterial } from 'three';
import { OBSTACLES, RENDER } from '../config';
import { useRunStore } from '../store/runStore';

/**
 * Grey-box pop when a barrier is hit: a sphere that grows and fades. Hits are
 * at least 1.5 s apart, so one pooled sphere is enough. It runs on its own
 * clock so it finishes even after the run freezes.
 */
export function HitPop() {
  const mesh = useRef<Mesh>(null);
  const seenHits = useRef(0);
  const age = useRef<number>(RENDER.POP_DURATION);

  useFrame((_, delta) => {
    const pop = mesh.current;
    if (!pop) return;
    const { run } = useRunStore.getState();
    if (run.hitCount !== seenHits.current) {
      seenHits.current = run.hitCount;
      if (run.hitCount > 0) {
        age.current = 0;
        pop.position.set(run.lastHitX, OBSTACLES.LOW_HEIGHT / 2, run.lastHitZ);
      }
    }
    age.current += delta;
    const t = Math.min(age.current / RENDER.POP_DURATION, 1);
    pop.visible = t < 1;
    if (!pop.visible) return;
    if (run.status === 'RUNNING') pop.position.z += run.speed * delta;
    pop.scale.setScalar(RENDER.POP_START_SCALE + (RENDER.POP_END_SCALE - RENDER.POP_START_SCALE) * t);
    (pop.material as MeshBasicMaterial).opacity = 1 - t;
  });

  return (
    <mesh ref={mesh} visible={false}>
      <sphereGeometry args={[OBSTACLES.HALF_WIDTH / 2, RENDER.POP_SEGMENTS, RENDER.POP_SEGMENTS]} />
      <meshBasicMaterial color={RENDER.POP_COLOR} transparent depthWrite={false} />
    </mesh>
  );
}
