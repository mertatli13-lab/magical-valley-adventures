import { RENDER } from '../config';

type GroundProps = {
  width: number;
  length: number;
  centerZ: number;
};

/** A flat ground plane. Replaced by pooled, scrolling chunks in Phase 1. */
export function Ground({ width, length, centerZ }: GroundProps) {
  return (
    <mesh rotation-x={RENDER.FLAT_ROTATION_X} position-z={centerZ}>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial color={RENDER.GROUND_COLOR} />
    </mesh>
  );
}
