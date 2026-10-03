import { GROUND, POOLS } from '../config';

/** Centre z of each pooled ground chunk. Created once; only mutated after that. */
export interface GroundState {
  chunkZ: number[];
}

export function createGround(): GroundState {
  const ground: GroundState = { chunkZ: new Array<number>(POOLS.GROUND_CHUNKS).fill(0) };
  resetGround(ground);
  return ground;
}

/** Lays the chunks end to end, the first one under the hero. */
export function resetGround(ground: GroundState): void {
  for (let i = 0; i < ground.chunkZ.length; i++) {
    ground.chunkZ[i] = GROUND.CHUNK_LENGTH / 2 - i * GROUND.CHUNK_LENGTH;
  }
}

/** Scrolls the chunks toward +z; a chunk past RECYCLE_Z jumps to the far end of the line. */
export function stepGround(ground: GroundState, distance: number): void {
  const lineLength = ground.chunkZ.length * GROUND.CHUNK_LENGTH;
  for (let i = 0; i < ground.chunkZ.length; i++) {
    let z = (ground.chunkZ[i] ?? 0) + distance;
    while (z > GROUND.RECYCLE_Z) z -= lineLength;
    ground.chunkZ[i] = z;
  }
}
