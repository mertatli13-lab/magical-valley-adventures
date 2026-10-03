import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, InstancedMesh, MeshBasicMaterial, Object3D } from 'three';
import { EFFECTS } from '../config';
import { Random } from '../game/random';
import { frameDt } from '../game/run';
import { useGameStore } from '../store/gameStore';

/**
 * A burst of sprinkles when a barrier is hit (it "pops in a puff of
 * sprinkles"). Hits are at least 1.5 s apart, so one burst at a time; all
 * sprinkles are one instanced mesh.
 */
export function Sprinkles() {
  const { mesh, velocity, spin, random, dummy } = useMemo(() => {
    const [w, h, d] = EFFECTS.SPRINKLE_SIZE;
    const mesh = new InstancedMesh(new BoxGeometry(w, h, d), new MeshBasicMaterial(), EFFECTS.SPRINKLE_COUNT);
    mesh.count = 0;
    mesh.frustumCulled = false;
    return {
      mesh,
      velocity: new Float32Array(EFFECTS.SPRINKLE_COUNT * 3),
      spin: new Float32Array(EFFECTS.SPRINKLE_COUNT),
      random: new Random(EFFECTS.SEED),
      dummy: new Object3D(),
    };
  }, []);
  const burst = useRef<{ age: number; x: number; y: number; z: number; seen: number }>({
    age: EFFECTS.SPRINKLE_LIFE,
    x: 0,
    y: 0,
    z: 0,
    seen: -1,
  });

  useLayoutEffect(() => {
    const color = new Color();
    for (let i = 0; i < EFFECTS.SPRINKLE_COUNT; i++) {
      mesh.setColorAt(i, color.set(EFFECTS.SPRINKLE_COLORS[i % EFFECTS.SPRINKLE_COLORS.length] ?? '#ffffff'));
    }
  }, [mesh]);

  useFrame((_, delta) => {
    const dt = frameDt(delta);
    const { session } = useGameStore.getState();
    // The barrier pops at the hero, so the burst stays there instead of scrolling past the camera.
    const { cues } = session.run;
    const b = burst.current;
    if (b.seen < 0) b.seen = cues.count;
    for (let n = cues.firstUnread(b.seen); n < cues.count; n++) {
      if (cues.cue(n) !== 'hit') continue;
      const slot = cues.slot(n);
      b.age = 0;
      b.x = cues.x[slot] ?? 0;
      b.y = (cues.y[slot] ?? 0) + EFFECTS.SPRINKLE_START_Y;
      b.z = cues.z[slot] ?? 0;
      for (let i = 0; i < EFFECTS.SPRINKLE_COUNT; i++) {
        const angle = random.next() * Math.PI * 2;
        const speed = EFFECTS.SPRINKLE_SPEED_MIN + random.next() * (EFFECTS.SPRINKLE_SPEED - EFFECTS.SPRINKLE_SPEED_MIN);
        velocity[i * 3] = Math.cos(angle) * speed;
        velocity[i * 3 + 1] = EFFECTS.SPRINKLE_UP_MIN + random.next() * (EFFECTS.SPRINKLE_UP - EFFECTS.SPRINKLE_UP_MIN);
        velocity[i * 3 + 2] = Math.sin(angle) * speed;
        spin[i] = (random.next() * 2 - 1) * EFFECTS.SPRINKLE_SPIN;
      }
    }
    b.seen = cues.count;

    b.age += session.screen === 'PAUSE' ? 0 : dt;
    if (b.age >= EFFECTS.SPRINKLE_LIFE) {
      mesh.count = 0;
      return;
    }
    const t = b.age;
    const shrink = 1 - t / EFFECTS.SPRINKLE_LIFE;
    for (let i = 0; i < EFFECTS.SPRINKLE_COUNT; i++) {
      dummy.position.set(
        b.x + (velocity[i * 3] ?? 0) * t,
        Math.max(0, b.y + (velocity[i * 3 + 1] ?? 0) * t - (EFFECTS.SPRINKLE_GRAVITY * t * t) / 2),
        b.z + (velocity[i * 3 + 2] ?? 0) * t,
      );
      const turn = (spin[i] ?? 0) * t;
      dummy.rotation.set(turn, turn, 0);
      dummy.scale.setScalar(shrink);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = EFFECTS.SPRINKLE_COUNT;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
