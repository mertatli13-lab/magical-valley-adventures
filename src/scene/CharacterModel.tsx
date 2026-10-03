import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AnimationMixer,
  Box3,
  LoopOnce,
  LoopRepeat,
  MeshStandardMaterial,
  type AnimationAction,
  type Material,
  type Mesh,
  type Object3D,
} from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CHARACTER_POSES, MODELS } from '../config';
import { CLIP_NAMES, clipFor, LOOPING_CLIPS, runPlaybackRate, type ClipName, type PoseInput } from '../game/animation';
import { ACCESSORIES } from '../game/catalogue';
import { frameDt } from '../game/run';
import { makeAccessoryPlaceholder } from './accessoryShapes';
import { ACCESSORY_MODELS } from './assetManifest';
import { getModel, isSettled, requestModel } from './assets';

const lockedMaterial = new MeshStandardMaterial({ color: CHARACTER_POSES.LOCKED_COLOR });
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
}

/**
 * A character model with its eight clips mapped by exact name, cross-fading
 * in 0.1 s. The model is cloned (so the same file can appear on the stage and
 * in the run) and turned to face away from the camera.
 */
export function CharacterModel({ gltf, name, frame, onClip }: Props) {
  const { root, mixer, actions, meshes, originals } = useMemo(() => {
    const root = cloneSkinned(gltf.scene);
    if (MODELS.FACES_CAMERA) root.rotation.y = MODELS.FACE_AWAY_YAW;
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
  }, [gltf, name]);

  const current = useRef<ClipName | null>(null);
  const dark = useRef(false);
  const accessory = useRef<{ id: string | null; object: Object3D | null; waitingFor: string | null }>({
    id: null,
    object: null,
    waitingFor: null,
  });

  useEffect(() => () => void mixer.stopAllAction(), [mixer]);

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
        const object = model ? cloneSkinned(model.scene) : makeAccessoryPlaceholder(item.id);
        const empty = root.getObjectByName(item.attach);
        if (empty) empty.add(object);
        else {
          object.position.y = new Box3().setFromObject(root).max.y;
          root.add(object);
        }
        accessory.current.object = object;
      }
    }
  });

  return <primitive object={root} />;
}
