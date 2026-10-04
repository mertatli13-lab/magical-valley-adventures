import { describe, expect, it } from 'vitest';
import { AnimationClip, Bone, Quaternion, QuaternionKeyframeTrack, Vector3 } from 'three';
import { MODELS } from '../config';
import { faceForward } from './clipHeading';

const UP = new Vector3(0, 1, 0);

function yawOf(values: ArrayLike<number>, key: number): number {
  const [x = 0, y = 0, z = 0, w = 1] = Array.from(values).slice(key * 4, key * 4 + 4);
  return Math.atan2(2 * (w * y + x * z), 1 - 2 * (x * x + y * y));
}

/** A hips bone with a spine child, and a clip turning each by the given yaws (radians). */
function rig(name: string, hips: number[], spine: number[]) {
  const root = new Bone();
  root.name = 'Hips';
  const child = new Bone();
  child.name = 'Spine';
  root.add(child);
  const track = (bone: string, yaws: number[]) =>
    new QuaternionKeyframeTrack(
      `${bone}.quaternion`,
      yaws.map((_, i) => i),
      yaws.flatMap((y) => new Quaternion().setFromAxisAngle(UP, y).toArray()),
    );
  const clip = new AnimationClip(name, -1, [track('Hips', hips), track('Spine', spine)]);
  return { root, clip };
}

const DEG = Math.PI / 180;

describe('faceForward', () => {
  it('turns a clip that faces 43° off back to the rest heading', () => {
    const { root, clip } = rig('Jump', [-43 * DEG, -43 * DEG], [0, 0]);
    const fixed = faceForward(clip, root);
    const hips = fixed.tracks.find((t) => t.name === 'Hips.quaternion');
    expect(yawOf(hips?.values ?? [], 0)).toBeCloseTo(0, 5);
    // The original clip is left alone.
    expect(yawOf(clip.tracks[0]?.values ?? [], 0)).toBeCloseTo(-43 * DEG, 5);
  });

  it('keeps a clip that already faces forward as it is', () => {
    const { root, clip } = rig('Run', [-10 * DEG, 10 * DEG], [5 * DEG, -5 * DEG]);
    expect(faceForward(clip, root)).toBe(clip);
  });

  it('damps the hips and spine turning of a look-around idle', () => {
    const { root, clip } = rig('Idle', [-41 * DEG, 14 * DEG, -77 * DEG], [40 * DEG, -40 * DEG, 0]);
    const fixed = faceForward(clip, root);
    const hips = fixed.tracks.find((t) => t.name === 'Hips.quaternion')?.values ?? [];
    const spine = fixed.tracks.find((t) => t.name === 'Spine.quaternion')?.values ?? [];
    for (let k = 0; k < 3; k++) {
      expect(Math.abs(yawOf(hips, k))).toBeLessThan(55 * DEG * MODELS.IDLE_TURN_KEEP + DEG);
    }
    expect(yawOf(spine, 0)).toBeCloseTo(40 * DEG * MODELS.IDLE_TURN_KEEP, 5);
  });
});
