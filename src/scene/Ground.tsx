import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { BufferAttribute, Color, Mesh, MeshStandardMaterial, PlaneGeometry, type BufferGeometry, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GROUND, LANES, POOLS, RENDER, VALLEY } from '../config';
import { laneX } from '../game/player';
import { useGameStore } from '../store/gameStore';
import { GROUND_MODEL } from './assetManifest';
import { getModel } from './assets';

const CHUNK_INDICES = Array.from({ length: POOLS.GROUND_CHUNKS }, (_, i) => i);

/** A flat coloured rectangle on the ground, as geometry ready to merge. */
function flatPiece(width: number, length: number, x: number, y: number, z: number, color: string): BufferGeometry {
  const geometry = new PlaneGeometry(width, length);
  geometry.rotateX(RENDER.FLAT_ROTATION_X);
  geometry.translate(x, y, z);
  const rgb = new Color(color);
  const colors = new Float32Array(geometry.getAttribute('position').count * 3);
  for (let i = 0; i < colors.length; i += 3) colors.set([rgb.r, rgb.g, rgb.b], i);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/** Placeholder chunk in one geometry: path, three lane stripes, cross bands and grass on both sides. */
function placeholderChunk(): BufferGeometry {
  const pieces = [
    flatPiece(GROUND.CHUNK_WIDTH, GROUND.CHUNK_LENGTH, 0, 0, 0, RENDER.GROUND_COLOR),
    ...[-1, 1].map((side) =>
      flatPiece(VALLEY.GRASS_WIDTH, GROUND.CHUNK_LENGTH, side * (GROUND.CHUNK_WIDTH + VALLEY.GRASS_WIDTH) / 2, 0, 0, VALLEY.GRASS_COLOR),
    ),
    ...Array.from({ length: LANES.COUNT }, (_, lane) =>
      flatPiece(RENDER.LANE_STRIPE_WIDTH, GROUND.CHUNK_LENGTH, laneX(lane), RENDER.STRIPE_LIFT, 0, RENDER.LANE_STRIPE_COLOR),
    ),
    ...Array.from({ length: RENDER.BANDS_PER_CHUNK }, (_, band) =>
      flatPiece(
        GROUND.CHUNK_WIDTH,
        RENDER.BAND_DEPTH,
        0,
        RENDER.BAND_LIFT,
        GROUND.CHUNK_LENGTH / 2 - (band * GROUND.CHUNK_LENGTH) / RENDER.BANDS_PER_CHUNK,
        RENDER.BAND_COLOR,
      ),
    ),
  ];
  return mergeGeometries(pieces) ?? pieces[0]!;
}

/**
 * The six pooled ground chunks, moved every frame to follow the simulation.
 * Uses the ground model if it exists (origin at the chunk centre), otherwise a
 * merged placeholder: one draw call per chunk either way.
 */
export function Ground() {
  const chunks = useMemo<Object3D[]>(() => {
    const model = getModel(GROUND_MODEL);
    if (model) return CHUNK_INDICES.map(() => cloneSkinned(model.scene));
    const geometry = placeholderChunk();
    const material = new MeshStandardMaterial({ vertexColors: true });
    return CHUNK_INDICES.map(() => new Mesh(geometry, material));
  }, []);

  useFrame(() => {
    const { chunkZ } = useGameStore.getState().session.run.ground;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk) chunk.position.z = chunkZ[i] ?? 0;
    }
  });

  return (
    <>
      {chunks.map((chunk) => (
        <primitive key={chunk.uuid} object={chunk} />
      ))}
    </>
  );
}
