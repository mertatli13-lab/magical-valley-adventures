import { Quaternion, Vector3, type AnimationClip, type Bone, type Object3D } from 'three';
import { MODELS } from '../config';

const UP = new Vector3(0, 1, 0);
const corrected = new WeakMap<AnimationClip, AnimationClip>();

/** Turn about the vertical axis of a rotation, in radians. */
function yawOf(x: number, y: number, z: number, w: number): number {
  return Math.atan2(2 * (w * y + x * z), 1 - 2 * (x * x + y * y));
}

/** An angle wrapped into -π..π. */
function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** The skeleton's top bone: the first bone whose parent is not a bone. */
export function rootBone(root: Object3D): Bone | null {
  let found: Bone | null = null;
  root.traverse((object) => {
    if (!found && (object as Bone).isBone && !(object.parent as Bone | null)?.isBone) found = object as Bone;
  });
  return found;
}

/** Each key's turn away from the bone's rest heading. */
function turns(values: ArrayLike<number>, rest: Quaternion): number[] {
  const restYaw = yawOf(rest.x, rest.y, rest.z, rest.w);
  const out: number[] = [];
  for (let i = 0; i < values.length; i += 4) {
    out.push(wrap(yawOf(values[i] ?? 0, values[i + 1] ?? 0, values[i + 2] ?? 0, values[i + 3] ?? 1) - restYaw));
  }
  return out;
}

/** Average of angles, done on the circle. */
function meanAngle(angles: number[]): number {
  let sin = 0;
  let cos = 0;
  for (const a of angles) {
    sin += Math.sin(a);
    cos += Math.cos(a);
  }
  return Math.atan2(sin, cos);
}

/**
 * Auto-rigged clips can face the wrong way. This returns a copy of the clip in which:
 * - the root bone's average heading is turned back to its rest heading (Strawberry's
 *   Idle and Jump face about 43° off, so she stood sideways), and
 * - in the Idle clip, the hips, spine, neck and head keep only part of their turning,
 *   so a look-around idle no longer spins the character away from the camera.
 * Clips that need neither come back as they are. Results are cached per clip.
 */
export function faceForward(clip: AnimationClip, root: Bone): AnimationClip {
  const cached = corrected.get(clip);
  if (cached) return cached;
  const isIdle = clip.name === 'Idle';
  const bones = new Map<string, Bone>();
  root.traverse((object) => {
    if ((object as Bone).isBone) bones.set(object.name, object as Bone);
  });

  // New turn for every key of every track that needs one.
  const plans: { name: string; change: number[] }[] = [];
  for (const track of clip.tracks) {
    if (!track.name.endsWith('.quaternion')) continue;
    const boneName = track.name.slice(0, -'.quaternion'.length);
    const bone = bones.get(boneName);
    if (!bone) continue;
    const isRoot = bone === root;
    const steady = isIdle && MODELS.IDLE_STEADY_BONES.some((prefix) => boneName.startsWith(prefix));
    if (!isRoot && !steady) continue;
    const yaw = turns(track.values, bone.quaternion);
    const offset = isRoot ? meanAngle(yaw) : 0;
    const keep = steady ? MODELS.IDLE_TURN_KEEP : 1;
    const change = yaw.map((y) => wrap(keep * wrap(y - offset) - y));
    if (change.some((c) => Math.abs(c) > MODELS.HEADING_TOLERANCE)) plans.push({ name: track.name, change });
  }

  let result = clip;
  if (plans.length) {
    result = clip.clone();
    const turn = new Quaternion();
    const q = new Quaternion();
    for (const { name, change } of plans) {
      const track = result.tracks.find((t) => t.name === name);
      if (!track) continue;
      const values = track.values;
      for (let k = 0; k < change.length; k++) {
        turn.setFromAxisAngle(UP, change[k] ?? 0);
        q.fromArray(values, k * 4).premultiply(turn).toArray(values, k * 4);
      }
    }
  }
  corrected.set(clip, result);
  return result;
}
