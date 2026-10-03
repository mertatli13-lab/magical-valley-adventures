import { forwardRef } from 'react';
import type { Mesh } from 'three';
import { BLOB_SHADOW, RENDER } from '../config';
import { radialTexture } from './textures';

/** A soft round shadow on the ground, instead of real shadow maps. */
export const BlobShadow = forwardRef<Mesh, { radius?: number }>(function BlobShadow(
  { radius = BLOB_SHADOW.RADIUS },
  ref,
) {
  return (
    <mesh ref={ref} rotation-x={RENDER.FLAT_ROTATION_X} position-y={BLOB_SHADOW.LIFT} renderOrder={1}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial color="#000000" map={radialTexture()} transparent opacity={BLOB_SHADOW.OPACITY} depthWrite={false} />
    </mesh>
  );
});
