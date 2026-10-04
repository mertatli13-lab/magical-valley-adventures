import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PointsMaterial,
  Quaternion,
  Shape,
  ShapeGeometry,
  Points as ThreePoints,
  Vector3,
} from 'three';
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

/** One butterfly wing: a rounded upper lobe and a smaller lower one, hinged along the body line at x = 0. */
function wingGeometry(size: number): ShapeGeometry {
  const outline = new Shape();
  outline.moveTo(0, 0.25);
  outline.bezierCurveTo(0.35, 0.95, 1.05, 0.85, 0.95, 0.3);
  outline.bezierCurveTo(0.9, 0.05, 0.45, 0, 0.2, 0);
  outline.bezierCurveTo(0.6, -0.05, 0.75, -0.5, 0.45, -0.62);
  outline.bezierCurveTo(0.2, -0.7, 0.05, -0.35, 0, -0.1);
  outline.closePath();
  // Laid flat: the wing spreads sideways along x and the body line runs along z.
  return new ShapeGeometry(outline, 5).scale(size, size, size).rotateX(-Math.PI / 2);
}

/**
 * Butterflies over the valley: each is a pair of instanced wings that beat,
 * bob and scroll past with the world. Two draw calls for all of them.
 */
function useButterflies() {
  return useMemo(() => {
    const count = VALLEY.BUTTERFLY_COUNT;
    const random = new Random(VALLEY.SEED);
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const wings = [-1, 1].map((side) => {
      const mesh = new InstancedMesh(wingGeometry(VALLEY.BUTTERFLY_SIZE).scale(side, 1, 1), material, count);
      mesh.frustumCulled = false;
      return { mesh, side };
    });
    const flock = Array.from({ length: count }, (_, i) => {
      const side = random.next() < 0.5 ? -1 : 1;
      const tint = new Color(VALLEY.BUTTERFLY_COLORS[i % VALLEY.BUTTERFLY_COLORS.length] ?? '#ffffff');
      for (const wing of wings) wing.mesh.setColorAt(i, tint);
      return {
        x: side * (VALLEY.PARTICLE_MIN_X + random.next() * (VALLEY.PARTICLE_MAX_X - VALLEY.PARTICLE_MIN_X)),
        y: VALLEY.PARTICLE_MIN_Y + random.next() * (VALLEY.PARTICLE_MAX_Y - VALLEY.PARTICLE_MIN_Y) * 0.5,
        z: WORLD.SPAWN_Z + random.next() * TRACK_LENGTH,
        turn: random.next() * Math.PI * 2,
        phase: random.next() * Math.PI * 2,
      };
    });
    return { wings, flock, matrix: new Matrix4(), position: new Vector3(), rotation: new Quaternion(), euler: new Euler(), scale: new Vector3(1, 1, 1) };
  }, []);
}

/** Butterflies and floating sparkles over the valley. */
export function Particles() {
  const butterflies = useButterflies();
  const sparkles = useDrift(VALLEY.SPARKLE_COUNT, [VALLEY.SPARKLE_COLOR], VALLEY.SPARKLE_SIZE, VALLEY.SEED + 1);

  useFrame(({ clock }, delta) => {
    const { session } = useGameStore.getState();
    const scroll = session.screen === 'RUN' ? session.run.speed * frameDt(delta) : 0;
    const t = clock.elapsedTime * VALLEY.PARTICLE_BOB_RATE;
    {
      const { positions, baseY, phase, points } = sparkles;
      for (let i = 0; i < baseY.length; i++) {
        let z = (positions[i * 3 + 2] ?? 0) + scroll;
        if (z > WORLD.RECYCLE_Z) z -= TRACK_LENGTH;
        positions[i * 3 + 2] = z;
        positions[i * 3 + 1] = (baseY[i] ?? 0) + Math.sin(t + (phase[i] ?? 0)) * VALLEY.PARTICLE_BOB;
      }
      points.geometry.getAttribute('position').needsUpdate = true;
    }
    const b = butterflies;
    const beat = clock.elapsedTime * VALLEY.BUTTERFLY_FLAP_RATE * Math.PI * 2;
    for (let i = 0; i < b.flock.length; i++) {
      const fly = b.flock[i];
      if (!fly) continue;
      fly.z += scroll;
      if (fly.z > WORLD.RECYCLE_Z) fly.z -= TRACK_LENGTH;
      b.position.set(fly.x, fly.y + Math.sin(t + fly.phase) * VALLEY.PARTICLE_BOB, fly.z);
      const open = (0.5 + 0.5 * Math.sin(beat + fly.phase)) * VALLEY.BUTTERFLY_FLAP;
      for (const wing of b.wings) {
        // Heading `turn`; each wing lifts about the body line (z).
        b.rotation.setFromEuler(b.euler.set(0, fly.turn, wing.side * open, 'YXZ'));
        wing.mesh.setMatrixAt(i, b.matrix.compose(b.position, b.rotation, b.scale));
      }
    }
    for (const wing of b.wings) wing.mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {butterflies.wings.map((wing) => (
        <primitive key={wing.mesh.uuid} object={wing.mesh} />
      ))}
      <primitive object={sparkles.points} />
    </>
  );
}
