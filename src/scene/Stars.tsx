import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, ExtrudeGeometry, MeshBasicMaterial, Object3D, Shape, type InstancedMesh } from 'three';
import { POOLS, RENDER } from '../config';
import { useRunStore } from '../store/runStore';

/** A flat five-point star, extruded and centred. Built once. */
function createStarGeometry(): ExtrudeGeometry {
  const shape = new Shape();
  const corners = RENDER.STAR_POINTS * 2;
  for (let i = 0; i < corners; i++) {
    const radius = i % 2 === 0 ? RENDER.STAR_RADIUS : RENDER.STAR_RADIUS * RENDER.STAR_INNER_RATIO;
    const angle = (i / corners) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: RENDER.STAR_THICKNESS, bevelEnabled: false });
  geometry.center();
  return geometry;
}

/**
 * All pooled stars in one instanced mesh (one draw call). Each frame the
 * active stars are packed into the first instances and the rest are hidden by
 * lowering the instance count.
 */
export function Stars() {
  const mesh = useRef<InstancedMesh>(null);
  const { geometry, material, dummy, color, bigColor } = useMemo(
    () => ({
      geometry: createStarGeometry(),
      // Unlit, so stars read as flat glowing colour (Blender asset spec).
      material: new MeshBasicMaterial({ color: '#ffffff' }),
      dummy: new Object3D(),
      color: new Color(RENDER.STAR_COLOR),
      bigColor: new Color(RENDER.BIG_STAR_COLOR),
    }),
    [],
  );

  // Create the per-instance colour buffer once, before the first frame.
  useLayoutEffect(() => {
    const stars = mesh.current;
    if (!stars) return;
    for (let i = 0; i < POOLS.STARS; i++) stars.setColorAt(i, color);
    stars.count = 0;
  }, [color]);

  useFrame(({ clock }) => {
    const stars = mesh.current;
    if (!stars) return;
    const items = useRunStore.getState().run.stars.items;
    const spin = clock.elapsedTime * RENDER.STAR_SPIN;
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      const star = items[i];
      if (!star?.active) continue;
      dummy.position.set(star.x, star.y, star.z);
      dummy.rotation.set(0, spin + i * RENDER.STAR_PHASE_STEP, 0);
      dummy.scale.setScalar(star.big ? RENDER.BIG_STAR_SCALE : 1);
      dummy.updateMatrix();
      stars.setMatrixAt(count, dummy.matrix);
      stars.setColorAt(count, star.big ? bigColor : color);
      count++;
    }
    stars.count = count;
    stars.instanceMatrix.needsUpdate = true;
    if (stars.instanceColor) stars.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, POOLS.STARS]} frustumCulled={false} />;
}
