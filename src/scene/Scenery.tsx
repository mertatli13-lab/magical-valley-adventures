import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { GROUND, POOLS, VALLEY } from '../config';
import { Random } from '../game/random';
import { useGameStore } from '../store/gameStore';
import { SCENERY_MODELS } from './assetManifest';
import { getModel } from './assets';
import { InstancedModel } from './instancing';
import { FULL_TURN } from './parts';
import { lampPost, makeScenery, SCENERY_KINDS } from './sceneryShapes';

/** What a kind of scenery may do: where it may stand and how it moves. */
interface Kind {
  weight: number;
  near: boolean;
  far: boolean;
  minX: number;
  sway: number;
  bob: number;
}

/** One piece of scenery inside a chunk, relative to the chunk centre. Fixed per chunk slot. */
interface Placement {
  variant: number;
  x: number;
  z: number;
  scale: number;
  turn: number;
  /** In the outer band, only shown on landscape screens. */
  far: boolean;
  sway: number;
  bob: number;
  phase: number;
}

const MODEL_KIND: Kind = { weight: 1, near: true, far: true, minX: 0, sway: 0, bob: 0 };

/** Picks an index from `weights` in proportion to each weight. */
function weighted(weights: readonly number[], roll: number): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let left = roll * total;
  for (let i = 0; i < weights.length; i++) {
    left -= weights[i] ?? 0;
    if (left < 0) return i;
  }
  return weights.length - 1;
}

/**
 * Side scenery, at least 5 m from the centre line, placed once per chunk slot
 * and carried along with its ground chunk, so it recycles with the ground.
 * Each kind is one instanced model. Uses the scenery models if they exist,
 * otherwise the scenery built in code, with candy lamp posts beside the path.
 */
export function Scenery() {
  const { models, layout, lamps, lampSpots } = useMemo(() => {
    const loaded = SCENERY_MODELS.map(getModel).filter((m) => m !== null);
    const kinds: Kind[] = loaded.length ? loaded.map(() => MODEL_KIND) : SCENERY_KINDS.map((kind) => VALLEY.SCENERY[kind]);
    const roots = loaded.length ? loaded.map((gltf) => gltf.scene) : SCENERY_KINDS.map(makeScenery);
    const perChunk = VALLEY.SCENERY_PER_CHUNK + VALLEY.FAR_SCENERY_PER_CHUNK;
    const capacity = POOLS.GROUND_CHUNKS * perChunk;
    const models = roots.map((root) => new InstancedModel(root, capacity));
    const layout: Placement[][] = Array.from({ length: POOLS.GROUND_CHUNKS }, (_, chunk) => {
      const random = new Random(VALLEY.SEED + chunk);
      const band = (count: number, minX: number, maxX: number, far: boolean): Placement[] => {
        const weights = kinds.map((kind) => ((far ? kind.far : kind.near) ? kind.weight : 0));
        return Array.from({ length: count }, (_, slot) => {
          const side = slot % 2 === 0 ? -1 : 1;
          const variant = weighted(weights, random.next());
          const kind = kinds[variant] ?? MODEL_KIND;
          const from = Math.max(minX, kind.minX);
          return {
            variant,
            x: side * (from + random.next() * (maxX - from)),
            z: -GROUND.CHUNK_LENGTH / 2 + ((slot + random.next()) * GROUND.CHUNK_LENGTH) / count,
            scale: VALLEY.SCENERY_MIN_SCALE + random.next() * (VALLEY.SCENERY_MAX_SCALE - VALLEY.SCENERY_MIN_SCALE),
            turn: random.next() * FULL_TURN,
            far,
            sway: kind.sway,
            bob: kind.bob,
            phase: random.next() * FULL_TURN,
          };
        });
      };
      return [
        ...band(VALLEY.SCENERY_PER_CHUNK, VALLEY.SCENERY_MIN_X, VALLEY.SCENERY_MAX_X, false),
        ...band(VALLEY.FAR_SCENERY_PER_CHUNK, VALLEY.FAR_SCENERY_MIN_X, VALLEY.FAR_SCENERY_MAX_X, true),
      ];
    });
    // Lamp posts stand at even steps along both sides, the two sides half a step apart.
    const lamps = loaded.length ? null : new InstancedModel(lampPost(), POOLS.GROUND_CHUNKS * VALLEY.LAMP_POSTS_PER_CHUNK * 2);
    const step = GROUND.CHUNK_LENGTH / VALLEY.LAMP_POSTS_PER_CHUNK;
    const lampSpots = [-1, 1].flatMap((side) =>
      Array.from({ length: VALLEY.LAMP_POSTS_PER_CHUNK }, (_, i) => ({
        x: side * VALLEY.LAMP_POST_X,
        z: -GROUND.CHUNK_LENGTH / 2 + (i + (side < 0 ? 0.25 : 0.75)) * step,
      })),
    );
    return { models, layout, lamps, lampSpots };
  }, []);
  const temp = useMemo(
    () => ({ matrix: new Matrix4(), position: new Vector3(), rotation: new Quaternion(), euler: new Euler(), scale: new Vector3() }),
    [],
  );

  useFrame(({ size, clock }) => {
    const { chunkZ } = useGameStore.getState().session.run.ground;
    const landscape = size.width > size.height;
    const breeze = clock.elapsedTime * VALLEY.SWAY_RATE * FULL_TURN;
    for (const model of models) model.begin();
    lamps?.begin();
    for (let chunk = 0; chunk < layout.length; chunk++) {
      const placements = layout[chunk];
      if (!placements) continue;
      const z = chunkZ[chunk] ?? 0;
      for (const p of placements) {
        if (p.far && !landscape) continue;
        const wave = Math.sin(breeze + p.phase);
        temp.position.set(p.x, p.bob * (0.5 + 0.5 * wave), z + p.z);
        // Leaning about x and z rocks the top while the foot stays planted.
        temp.rotation.setFromEuler(temp.euler.set(p.sway * wave, p.turn, p.sway * Math.cos(breeze * 0.8 + p.phase)));
        temp.scale.setScalar(p.scale);
        temp.matrix.compose(temp.position, temp.rotation, temp.scale);
        models[p.variant]?.add(temp.matrix);
      }
      if (lamps) for (const spot of lampSpots) lamps.add(temp.matrix.makeTranslation(spot.x, 0, z + spot.z));
    }
    for (const model of models) model.end();
    lamps?.end();
  });

  return (
    <>
      {[...models, ...(lamps ? [lamps] : [])].flatMap((model) => model.objects).map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}
