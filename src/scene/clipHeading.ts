import { Quaternion, Vector3, type AnimationClip, type Bone, type Object3D } from 'three';
import { MODELS } from '../config';

const UP = new Vector3(0, 1, 0);
const corrected = new WeakMap<AnimationClip, AnimationClip>();

/** Turn about the vertical axis of a rotation, in radians. */
function yawOf(x: number, y: number, z: number, w: number): number {
  return Math.atan2(2 * (w * y + x * z), 1 - 2 * (x * x + y * y));
}

/** The skeleton's top bone: the first bone whose parent is not a bone. */
export function rootBone(root: Object3D): Bone | null {
  let found: Bone | null = null;
  root.traverse((object) => {
    if (!found && (object as Bone).isBone && !(object.parent as Bone | null)?.isBone) found = object as Bone;
  });
  return found;
}

/**
 * Some auto-rigged clips turn the whole body to one side (Strawberry's Idle
 * faces about 43° off). This returns a copy of the clip with the root bone's
 * average heading turned back to its rest heading, so every clip faces the
 * way the model does. Clips already within the tolerance come back as they are.
 */
export function faceForward(clip: AnimationClip, bone: Bone): AnimationClip {
  const cached = corrected.get(clip);
  if (cached) return cached;
  let result = clip;
  const track = clip.tracks.find((t) => t.name === `${bone.name}.quaternion`);
  if (track) {
    const v = track.values;
    let sin = 0;
    let cos = 0;
    for (let i = 0; i < v.length; i += 4) {
      const yaw = yawOf(v[i] ?? 0, v[i + 1] ?? 0, v[i + 2] ?? 0, v[i + 3] ?? 1);
      sin += Math.sin(yaw);
      cos += Math.cos(yaw);
    }
    const rest = bone.quaternion;
    const offset = Math.atan2(sin, cos) - yawOf(rest.x, rest.y, rest.z, rest.w);
    const delta = Math.atan2(Math.sin(offset), Math.cos(offset));
    if (Math.abs(delta) > MODELS.HEADING_TOLERANCE) {
      result = clip.clone();
      const fixed = result.tracks.find((t) => t.name === track.name);
      if (fixed) {
        const turn = new Quaternion().setFromAxisAngle(UP, -delta);
        const q = new Quaternion();
        const values = fixed.values;
        for (let i = 0; i < values.length; i += 4) {
          q.fromArray(values, i).premultiply(turn).toArray(values, i);
        }
      }
    }
  }
  corrected.set(clip, result);
  return result;
}
