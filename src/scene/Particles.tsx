import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { BufferAttribute, BufferGeometry, Color, PointsMaterial, Points as ThreePoints } from 'three';
import { VALLEY, WORLD } from '../config';
import { frameDt } from '../game/run';
import { Random } from '../game/random';
import { useGameStore } from '../store/gameStore';
import { radialTexture } from './textures';

const TRACK_LENGTH = WORLD.RECYCLE_Z - WORLD.SPAWN_Z;

/** A drifting cloud of soft points beside the track that scrolls with the world and wraps around. */
function useDrift(count: number, colors: readonly string[], size: number, seed: number) {
  return useMemo(() => {
    const random = new Random(seed);
    const positions = new Float32Array(count * 3);
    const baseY = new Float32Array(count);
    const phase = new Float32Array(count);
    const tint = new Float32Array(count * 3);
    const color = new Color();
    for (let i = 0; i < count; i++) {
      const side = random.next() < 0.5 ? -1 : 1;
      positions[i * 3] = side * (VALLEY.PARTICLE_MIN_X + random.next() * (VALLEY.PARTICLE_MAX_X - VALLEY.PARTICLE_MIN_X));
      baseY[i] = VALLEY.PARTICLE_MIN_Y + random.next() * (VALLEY.PARTICLE_MAX_Y - VALLEY.PARTICLE_MIN_Y);
      positions[i * 3 + 1] = baseY[i] ?? 0;
      positions[i * 3 + 2] = WORLD.SPAWN_Z + random.next() * TRACK_LENGTH;
      phase[i] = random.next() * Math.PI * 2;
      color.set(colors[i % colors.length] ?? '#ffffff');
      tint.set([color.r, color.g, color.b], i * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(tint, 3));
    const material = new PointsMaterial({
      size,
      map: radialTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    const points = new ThreePoints(geometry, material);
    points.frustumCulled = false;
    return { points, positions, baseY, phase };
  }, [count, colors, size, seed]);
}

/** Butterflies and floating sparkles over the valley, as instanced points. */
export function Particles() {
  const butterflies = useDrift(VALLEY.BUTTERFLY_COUNT, VALLEY.BUTTERFLY_COLORS, VALLEY.BUTTERFLY_SIZE, VALLEY.SEED);
  const sparkles = useDrift(VALLEY.SPARKLE_COUNT, [VALLEY.SPARKLE_COLOR], VALLEY.SPARKLE_SIZE, VALLEY.SEED + 1);

  useFrame(({ clock }, delta) => {
    const { session } = useGameStore.getState();
    const scroll = session.screen === 'RUN' ? session.run.speed * frameDt(delta) : 0;
    const t = clock.elapsedTime * VALLEY.PARTICLE_BOB_RATE;
    for (const drift of [butterflies, sparkles]) {
      const { positions, baseY, phase, points } = drift;
      for (let i = 0; i < baseY.length; i++) {
        let z = (positions[i * 3 + 2] ?? 0) + scroll;
        if (z > WORLD.RECYCLE_Z) z -= TRACK_LENGTH;
        positions[i * 3 + 2] = z;
        positions[i * 3 + 1] = (baseY[i] ?? 0) + Math.sin(t + (phase[i] ?? 0)) * VALLEY.PARTICLE_BOB;
      }
      points.geometry.getAttribute('position').needsUpdate = true;
    }
  });

  return (
    <>
      <primitive object={butterflies.points} />
      <primitive object={sparkles.points} />
    </>
  );
}
