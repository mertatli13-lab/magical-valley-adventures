import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { BoxGeometry, InstancedMesh, MeshBasicMaterial, Object3D } from 'three';
import { EFFECTS, SPEED } from '../config';
import { Random } from '../game/random';
import { frameDt } from '../game/run';
import { useGameStore } from '../store/gameStore';

const SPAN = EFFECTS.SPEED_LINE_NEAR_Z - EFFECTS.SPEED_LINE_FAR_Z;

/**
 * Streaks rushing past the edges of the view above 24 m/s, stronger toward
 * the top speed. Off with "reduce motion". One instanced mesh.
 */
export function SpeedLines() {
  const { mesh, material, x, y, z, dummy } = useMemo(() => {
    const material = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false });
    const mesh = new InstancedMesh(
      new BoxGeometry(EFFECTS.SPEED_LINE_WIDTH, EFFECTS.SPEED_LINE_WIDTH, EFFECTS.SPEED_LINE_LENGTH),
      material,
      EFFECTS.SPEED_LINE_COUNT,
    );
    mesh.frustumCulled = false;
    const random = new Random(EFFECTS.SEED + 1);
    const count = EFFECTS.SPEED_LINE_COUNT;
    const x = new Float32Array(count);
    const y = new Float32Array(count);
    const z = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      x[i] = side * (EFFECTS.SPEED_LINE_MIN_X + random.next() * (EFFECTS.SPEED_LINE_MAX_X - EFFECTS.SPEED_LINE_MIN_X));
      y[i] = EFFECTS.SPEED_LINE_MIN_Y + random.next() * (EFFECTS.SPEED_LINE_MAX_Y - EFFECTS.SPEED_LINE_MIN_Y);
      z[i] = EFFECTS.SPEED_LINE_FAR_Z + random.next() * SPAN;
    }
    return { mesh, material, x, y, z, dummy: new Object3D() };
  }, []);

  useFrame((_, delta) => {
    const { session } = useGameStore.getState();
    const { run } = session;
    const strength = (run.speed - EFFECTS.SPEED_LINES_FROM) / (SPEED.MAX - EFFECTS.SPEED_LINES_FROM);
    mesh.visible = session.screen === 'RUN' && strength > 0 && !session.save.settings.reduceMotion;
    if (!mesh.visible) return;
    material.opacity = Math.min(strength, 1) * EFFECTS.SPEED_LINE_OPACITY;
    const move = run.speed * EFFECTS.SPEED_LINE_RUSH * frameDt(delta);
    for (let i = 0; i < EFFECTS.SPEED_LINE_COUNT; i++) {
      let lineZ = (z[i] ?? 0) + move;
      if (lineZ > EFFECTS.SPEED_LINE_NEAR_Z) lineZ -= SPAN;
      z[i] = lineZ;
      dummy.position.set(x[i] ?? 0, y[i] ?? 0, lineZ);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
