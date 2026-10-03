import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import {
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GROUND, POOLS, VALLEY } from '../config';
import { Random } from '../game/random';
import { useGameStore } from '../store/gameStore';
import { SCENERY_MODELS } from './assetManifest';
import { getModel } from './assets';
import { InstancedModel } from './instancing';

/** One piece of scenery inside a chunk, relative to the chunk centre. Fixed per chunk slot. */
interface Placement {
  variant: number;
  x: number;
  z: number;
  scale: number;
  turn: number;
}

/** Pastel placeholder scenery: trees, mushrooms and flower clumps in a few colours. */
function placeholderVariants(): Object3D[] {
  const s = VALLEY.SEGMENTS;
  const [trunkRadius, trunkHeight] = VALLEY.TREE_TRUNK;
  const [stemRadius, stemHeight] = VALLEY.MUSHROOM_STEM;
  const trees = VALLEY.CROWN_COLORS.map((color) => {
    const group = new Group();
    const trunk = new Mesh(new CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, s), new MeshStandardMaterial({ color: VALLEY.TRUNK_COLOR }));
    trunk.position.y = trunkHeight / 2;
    const crown = new Mesh(new SphereGeometry(VALLEY.TREE_CROWN, s, s), new MeshStandardMaterial({ color }));
    crown.position.y = trunkHeight + VALLEY.TREE_CROWN * 0.7;
    group.add(trunk, crown);
    return group;
  });
  const mushrooms = VALLEY.CAP_COLORS.map((color) => {
    const group = new Group();
    const stem = new Mesh(new CylinderGeometry(stemRadius, stemRadius * 1.3, stemHeight, s), new MeshStandardMaterial({ color: VALLEY.STEM_COLOR }));
    stem.position.y = stemHeight / 2;
    const cap = new Mesh(new SphereGeometry(VALLEY.MUSHROOM_CAP, s, s, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color }));
    cap.position.y = stemHeight;
    group.add(stem, cap);
    return group;
  });
  // A flower clump: a few blooms merged into one geometry, so it is one draw call.
  const bloomOffsets = [
    [0, 0.2, 0],
    [0.3, 0.15, 0.1],
    [-0.25, 0.18, 0.2],
    [0.1, 0.12, -0.3],
    [-0.15, 0.22, -0.15],
  ];
  const clump = mergeGeometries(
    bloomOffsets.map(([x = 0, y = 0, z = 0]) => new SphereGeometry(VALLEY.FLOWER_SIZE, s, s).translate(x, y, z)),
  );
  const flowers = VALLEY.FLOWER_COLORS.map((color) => new Mesh(clump ?? undefined, new MeshStandardMaterial({ color })));
  return [...trees, ...mushrooms, ...flowers];
}

/**
 * Side scenery, at least 5 m from the centre line, placed once per chunk slot
 * and carried along with its ground chunk, so it recycles with the ground.
 * Each kind is one instanced model.
 */
export function Scenery() {
  const { models, layout } = useMemo(() => {
    const loaded = SCENERY_MODELS.map(getModel).filter((m) => m !== null);
    const roots = loaded.length ? loaded.map((gltf) => gltf.scene) : placeholderVariants();
    const capacity = POOLS.GROUND_CHUNKS * VALLEY.SCENERY_PER_CHUNK;
    const models = roots.map((root) => new InstancedModel(root, capacity));
    const layout: Placement[][] = Array.from({ length: POOLS.GROUND_CHUNKS }, (_, chunk) => {
      const random = new Random(VALLEY.SEED + chunk);
      return Array.from({ length: VALLEY.SCENERY_PER_CHUNK }, (_, slot) => {
        const side = slot % 2 === 0 ? -1 : 1;
        return {
          variant: random.int(models.length),
          x: side * (VALLEY.SCENERY_MIN_X + random.next() * (VALLEY.SCENERY_MAX_X - VALLEY.SCENERY_MIN_X)),
          z: -GROUND.CHUNK_LENGTH / 2 + ((slot + random.next()) * GROUND.CHUNK_LENGTH) / VALLEY.SCENERY_PER_CHUNK,
          scale: VALLEY.SCENERY_MIN_SCALE + random.next() * (VALLEY.SCENERY_MAX_SCALE - VALLEY.SCENERY_MIN_SCALE),
          turn: random.next() * Math.PI * 2,
        };
      });
    });
    return { models, layout };
  }, []);
  const temp = useMemo(
    () => ({ matrix: new Matrix4(), position: new Vector3(), rotation: new Quaternion(), scale: new Vector3(), up: new Vector3(0, 1, 0) }),
    [],
  );

  useFrame(() => {
    const { chunkZ } = useGameStore.getState().session.run.ground;
    for (const model of models) model.begin();
    for (let chunk = 0; chunk < layout.length; chunk++) {
      const placements = layout[chunk];
      if (!placements) continue;
      for (const p of placements) {
        temp.position.set(p.x, 0, (chunkZ[chunk] ?? 0) + p.z);
        temp.rotation.setFromAxisAngle(temp.up, p.turn);
        temp.scale.setScalar(p.scale);
        temp.matrix.compose(temp.position, temp.rotation, temp.scale);
        models[p.variant]?.add(temp.matrix);
      }
    }
    for (const model of models) model.end();
  });

  return (
    <>
      {models.flatMap((model) => model.objects).map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}
