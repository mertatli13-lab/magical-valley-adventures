import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AnimationMixer,
  Box3,
  LoopOnce,
  LoopRepeat,
  Group,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type AnimationAction,
  type Material,
  type Mesh,
  type Object3D,
  type SkinnedMesh,
} from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CHARACTER_POSES, DEFAULT_FIT, MODEL_FITS, MODELS } from '../config';
import { CLIP_NAMES, clipFor, LOOPING_CLIPS, runPlaybackRate, type ClipName, type PoseInput } from '../game/animation';
import { ACCESSORIES, type AttachPoint } from '../game/catalogue';
import { frameDt } from '../game/run';
import { animateAccessory, makeAccessory } from './accessoryShapes';
import { ACCESSORY_MODELS, ATTACH_BONES } from './assetManifest';
import { getModel, isSettled, requestModel } from './assets';

const lockedMaterial = new MeshStandardMaterial({ color: CHARACTER_POSES.LOCKED_COLOR });
const TURN_AROUND = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);

/**
 * An attach point for a model without acc_* empties: a group fixed to the joint
 * for that point, moved by the offset in MODEL_FITS and turned so that, with the
 * model at rest, its y is up and its +z points behind the character, as the
 * accessory shapes expect. It is sized in metres whatever units the rig uses.
 */
function boneAnchor(root: Object3D, name: string, point: AttachPoint): Object3D | null {
  const offset = MODEL_FITS[name]?.points[point];
  let skinned: SkinnedMesh | null = null;
  root.traverse((object) => {
    if ((object as SkinnedMesh).isSkinnedMesh) skinned ??= object as SkinnedMesh;
  });
  const skeleton = (skinned as SkinnedMesh | null)?.skeleton;
  const index = skeleton?.bones.findIndex((bone) => bone.name === ATTACH_BONES[point]) ?? -1;
  const bone = skeleton?.bones[index];
  const inverse = skeleton?.boneInverses[index];
  if (!offset || !bone || !inverse) return null;
  // The joint's direction in the resting model, and the rig's units (e.g. centimetres under a 0.01 scale).
  const rest = new Quaternion();
  new Matrix4().copy(inverse).invert().decompose(new Vector3(), rest, new Vector3());
  let unit = 1;
  for (let node: Object3D | null = bone; node && node !== root; node = node.parent) unit *= node.scale.x;
  const toJoint = rest.clone().invert();
  const anchor = new Group();
  anchor.name = point;
  // The model faces +z, so "behind" is -z in the model's own space.
  anchor.position.set(offset[0], offset[1], -offset[2]).applyQuaternion(toJoint).divideScalar(unit);
  anchor.quaternion.copy(toJoint).multiply(TURN_AROUND);
  anchor.scale.setScalar(1 / unit);
  bone.add(anchor);
  return anchor;
}

const warnedMissingClips = new Set<string>();

export interface CharacterFrame {
  pose: PoseInput;
  /** World speed, for the Run clip's playback rate. */
  speed: number;
  /** Freeze the animation (paused game). */
  frozen: boolean;
  /** Draw as a dark silhouette (locked on the stage). */
  dark: boolean;
  /** Equipped accessory id, or null. */
  accessory: string | null;
}

interface Props {
  gltf: GLTF;
  name: string;
  /** Called every frame for the character's current state. */
  frame: () => CharacterFrame;
  /** Reports the clip now playing (debug panel). */
  onClip?: (clip: ClipName) => void;
  /** Keep the model facing the camera (the selection stage) instead of running away from it. */
  facesCamera?: boolean;
}

/**
 * A character model with its eight clips mapped by exact name, cross-fading
 * in 0.1 s. The model is cloned (so the same file can appear on the stage and
 * in the run) and turned to face away from the camera, unless it is on the stage.
 */
export function CharacterModel({ gltf, name, frame, onClip, facesCamera = false }: Props) {
  const { root, mixer, actions, meshes, originals } = useMemo(() => {
    const root = cloneSkinned(gltf.scene);
    if (MODELS.FACES_CAMERA !== facesCamera) root.rotation.y = MODELS.FACE_AWAY_YAW;
    const mixer = new AnimationMixer(root);
    const actions = new Map<ClipName, AnimationAction>();
    for (const clipName of CLIP_NAMES) {
      const clip = gltf.animations.find((c) => c.name === clipName);
      if (!clip) {
        const key = `${name}:${clipName}`;
        if (!warnedMissingClips.has(key)) {
          warnedMissingClips.add(key);
          console.warn(`[assets] ${name} has no "${clipName}" clip.`);
        }
        continue;
      }
      const action = mixer.clipAction(clip);
      const loops = LOOPING_CLIPS.has(clipName);
      action.setLoop(loops ? LoopRepeat : LoopOnce, Infinity);
      action.clampWhenFinished = !loops;
      actions.set(clipName, action);
    }
    const meshes: Mesh[] = [];
    root.traverse((object) => {
      if ((object as Mesh).isMesh) meshes.push(object as Mesh);
    });
    const originals = meshes.map((mesh) => mesh.material as Material | Material[]);
    return { root, mixer, actions, meshes, originals };
  }, [gltf, name, facesCamera]);

  const current = useRef<ClipName | null>(null);
  const dark = useRef(false);
  const accessory = useRef<{ id: string | null; object: Object3D | null; waitingFor: string | null }>({
    id: null,
    object: null,
    waitingFor: null,
  });
  const clock = useRef(0);

  // Stopping the clips also forgets which one was playing, so a remount starts it again.
  // (React's StrictMode remounts every component once in development.)
  useEffect(
    () => () => {
      mixer.stopAllAction();
      current.current = null;
    },
    [mixer],
  );

  useFrame((_, delta) => {
    const state = frame();

    // Clip: cross-fade to the new one; one-shot clips start from the beginning.
    const wanted = clipFor(state.pose);
    const clip = actions.has(wanted) ? wanted : actions.has('Idle') ? 'Idle' : null;
    if (clip && clip !== current.current) {
      const next = actions.get(clip);
      const previous = current.current ? actions.get(current.current) : undefined;
      if (next) {
        next.reset().play();
        if (previous) previous.crossFadeTo(next, MODELS.CROSSFADE, false);
      }
      current.current = clip;
      onClip?.(clip);
    }
    const run = actions.get('Run');
    if (run) run.timeScale = runPlaybackRate(state.speed);
    if (!state.frozen) mixer.update(frameDt(delta));

    // Locked silhouette.
    if (state.dark !== dark.current) {
      dark.current = state.dark;
      meshes.forEach((mesh, i) => {
        mesh.material = state.dark ? lockedMaterial : (originals[i] ?? lockedMaterial);
      });
    }

    // Accessory on its named empty, or on top of the model if the empty is missing. Accessory
    // models load on demand: the placeholder shows until the model arrives, then it is swapped in.
    const waiting = accessory.current.waitingFor;
    if (state.accessory !== accessory.current.id || (waiting !== null && isSettled(waiting))) {
      accessory.current.object?.removeFromParent();
      accessory.current = { id: state.accessory, object: null, waitingFor: null };
      const item = ACCESSORIES.find((a) => a.id === state.accessory);
      if (item) {
        const path = ACCESSORY_MODELS[item.id] ?? '';
        if (!isSettled(path)) {
          void requestModel(path);
          accessory.current.waitingFor = path;
        }
        const model = getModel(path);
        const object = model ? cloneSkinned(model.scene) : makeAccessory(item.id, MODEL_FITS[name]?.fit ?? DEFAULT_FIT);
        const empty = root.getObjectByName(item.attach) ?? boneAnchor(root, name, item.attach);
        if (empty) empty.add(object);
        else {
          object.position.y = new Box3().setFromObject(root).max.y;
          root.add(object);
        }
        accessory.current.object = object;
      }
    }
    if (!state.frozen) clock.current += frameDt(delta);
    // Capes and scarf tails stream out while the character runs, and hang while it stands.
    animateAccessory(accessory.current.object, clock.current, state.pose.pose === 'run' ? 1 : 0);
  });

  return <primitive object={root} />;
}
