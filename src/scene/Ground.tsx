import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { BoxGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, PlaneGeometry, type BufferGeometry, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GROUND, PARTS, POOLS, RENDER, VALLEY } from '../config';
import { useGameStore } from '../store/gameStore';
import { GROUND_MODEL } from './assetManifest';
import { getModel } from './assets';
import { Parts } from './parts';
import { grassTexture, pathTexture } from './textures';

const CHUNK_INDICES = Array.from({ length: POOLS.GROUND_CHUNKS }, (_, i) => i);

/** A flat rectangle on the ground whose texture repeats `repeatX` by `repeatZ` times. */
function flat(width: number, length: number, x: number, repeatX: number, repeatZ: number): BufferGeometry {
  const geometry = new PlaneGeometry(width, length);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * repeatX, uv.getY(i) * repeatZ);
  geometry.rotateX(RENDER.FLAT_ROTATION_X);
  geometry.translate(x, 0, 0);
  return geometry;
}

/** One chunk of raised kerb blocks along both edges of the path, in alternating colours. */
function kerbs(): BufferGeometry {
  const { WIDTH, HEIGHT, LENGTH, COLORS } = VALLEY.KERB;
  const parts = new Parts();
  const count = Math.round(GROUND.CHUNK_LENGTH / LENGTH);
  for (const side of [-1, 1]) {
    for (let i = 0; i < count; i++) {
      parts.add(new BoxGeometry(WIDTH, HEIGHT, LENGTH), COLORS[i % COLORS.length] ?? COLORS[0], {
        at: [side * (GROUND.CHUNK_WIDTH / 2 - WIDTH / 2), HEIGHT / 2, -GROUND.CHUNK_LENGTH / 2 + (i + 0.5) * LENGTH],
      });
    }
  }
  return parts.geometry();
}

/** The valley floor built in code: the candy path, the meadow on both sides and the kerbs. */
function builtLayers(): InstancedMesh[] {
  const tiles = GROUND.CHUNK_LENGTH / GROUND.CHUNK_WIDTH;
  const path = flat(GROUND.CHUNK_WIDTH, GROUND.CHUNK_LENGTH, 0, 1, tiles);
  const meadow = mergeGeometries(
    [-1, 1].map((side) =>
      flat(
        VALLEY.GRASS_WIDTH,
        GROUND.CHUNK_LENGTH,
        (side * (GROUND.CHUNK_WIDTH + VALLEY.GRASS_WIDTH)) / 2,
        VALLEY.GRASS_WIDTH / VALLEY.GRASS.TILE,
        GROUND.CHUNK_LENGTH / VALLEY.GRASS.TILE,
      ),
    ),
  );
  const layers: [BufferGeometry, MeshStandardMaterial][] = [
    [path, new MeshStandardMaterial({ map: pathTexture(), roughness: PARTS.ROUGHNESS })],
    [meadow ?? path, new MeshStandardMaterial({ map: grassTexture(), roughness: 1 })],
    [kerbs(), new MeshStandardMaterial({ vertexColors: true, roughness: PARTS.ROUGHNESS })],
  ];
  return layers.map(([geometry, material]) => {
    const mesh = new InstancedMesh(geometry, material, POOLS.GROUND_CHUNKS);
    mesh.frustumCulled = false;
    return mesh;
  });
}

/**
 * The six pooled ground chunks, moved every frame to follow the simulation.
 * With a ground model, each chunk is a copy of it (origin at the chunk centre).
 * Otherwise the floor is built in code and drawn as three instanced layers
 * (path, meadow, kerbs): three draw calls for all six chunks.
 */
export function Ground() {
  const { chunks, layers } = useMemo(() => {
    const model = getModel(GROUND_MODEL);
    return model
      ? { chunks: CHUNK_INDICES.map((): Object3D => cloneSkinned(model.scene)), layers: [] }
      : { chunks: [], layers: builtLayers() };
  }, []);
  const matrix = useMemo(() => new Matrix4(), []);

  useFrame(() => {
    const { chunkZ } = useGameStore.getState().session.run.ground;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk) chunk.position.z = chunkZ[i] ?? 0;
    }
    for (const layer of layers) {
      for (let i = 0; i < POOLS.GROUND_CHUNKS; i++) layer.setMatrixAt(i, matrix.makeTranslation(0, 0, chunkZ[i] ?? 0));
      layer.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {[...chunks, ...layers].map((object) => (
        <primitive key={object.uuid} object={object} />
      ))}
    </>
  );
}
