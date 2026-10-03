import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { MeshBasicMaterial, SphereGeometry, type Mesh } from 'three';
import { POOLS, RENDER } from '../config';
import { useRunStore } from '../store/runStore';

const POP_INDICES = Array.from({ length: POOLS.COLLECT_EVENTS }, (_, i) => i);

/** A small pop for every star pickup, from a fixed pool of spheres. */
export function StarPops() {
  const meshes = useRef<(Mesh | null)[]>([]);
  const ages = useRef(new Float64Array(POOLS.COLLECT_EVENTS).fill(RENDER.STAR_POP_DURATION));
  const seen = useRef(0);
  const { geometry, materials } = useMemo(
    () => ({
      geometry: new SphereGeometry(RENDER.STAR_RADIUS, RENDER.POP_SEGMENTS, RENDER.POP_SEGMENTS),
      materials: POP_INDICES.map(
        () => new MeshBasicMaterial({ color: RENDER.STAR_COLOR, transparent: true, depthWrite: false }),
      ),
    }),
    [],
  );

  useFrame((_, delta) => {
    const { run } = useRunStore.getState();
    const feed = run.collectFeed;
    if (feed.count < seen.current) seen.current = 0; // a new run started
    // Start a pop for each pickup since the last frame (at most one per slot).
    for (let n = Math.max(seen.current, feed.count - POOLS.COLLECT_EVENTS); n < feed.count; n++) {
      const slot = n % POOLS.COLLECT_EVENTS;
      const mesh = meshes.current[slot];
      if (!mesh) continue;
      ages.current[slot] = 0;
      mesh.position.set(feed.x[slot] ?? 0, feed.y[slot] ?? 0, feed.z[slot] ?? 0);
      materials[slot]?.color.set(feed.big[slot] ? RENDER.BIG_STAR_COLOR : RENDER.STAR_COLOR);
    }
    seen.current = feed.count;

    const scroll = run.status === 'RUNNING' ? run.speed * delta : 0;
    for (let slot = 0; slot < POOLS.COLLECT_EVENTS; slot++) {
      const mesh = meshes.current[slot];
      const material = materials[slot];
      if (!mesh || !material) continue;
      const age = (ages.current[slot] ?? RENDER.STAR_POP_DURATION) + delta;
      ages.current[slot] = age;
      const t = Math.min(age / RENDER.STAR_POP_DURATION, 1);
      mesh.visible = t < 1;
      if (!mesh.visible) continue;
      mesh.position.z += scroll;
      mesh.scale.setScalar(1 + (RENDER.STAR_POP_END_SCALE - 1) * t);
      material.opacity = 1 - t;
    }
  });

  return (
    <>
      {POP_INDICES.map((i) => (
        <mesh
          key={i}
          ref={(mesh) => void (meshes.current[i] = mesh)}
          geometry={geometry}
          material={materials[i]}
          visible={false}
        />
      ))}
    </>
  );
}
