import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Fog, Vector3, type AmbientLight, type DirectionalLight } from 'three';
import { CAMERA, NIGHT, RENDER, SCREENS } from '../config';
import type { Screen } from '../game/machine';
import { frameDt } from '../game/run';
import { useGameStore } from '../store/gameStore';
import { isDayScreen, mood } from './mood';

type Pose = 'SKY' | 'SELECT' | 'RUN';

function poseFor(screen: Screen): Pose {
  if (screen === 'LANDING') return 'SKY';
  if (isDayScreen(screen)) return 'RUN';
  return 'SELECT';
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Owns the camera, sky colour, fog and lights. Blends the camera between the
 * sky (behind the Landing art), the select stage and the run over 0.8 s, and
 * fades night to day as a run starts.
 */
export function Director() {
  const scene = useThree((state) => state.scene);
  const ambient = useRef<AmbientLight>(null);
  const sun = useRef<DirectionalLight>(null);
  const v = useMemo(
    () => ({
      night: new Color(NIGHT.SKY_COLOR),
      day: new Color(RENDER.SKY_COLOR),
      sky: new Color(NIGHT.SKY_COLOR),
      fromPosition: new Vector3(...SCREENS.SKY_CAMERA_POSITION),
      fromLook: new Vector3(...SCREENS.SKY_LOOK_AT),
      look: new Vector3(...SCREENS.SKY_LOOK_AT),
      targetPosition: new Vector3(),
      targetLook: new Vector3(),
    }),
    [],
  );
  const pose = useRef<Pose>('SKY');
  const blend = useRef(1);
  const followX = useRef(0);

  useLayoutEffect(() => {
    scene.background = v.sky;
    scene.fog = new Fog(v.sky, RENDER.FOG_NEAR, RENDER.FOG_FAR);
  }, [scene, v]);

  useFrame(({ camera }, delta) => {
    const dt = frameDt(delta);
    const { session } = useGameStore.getState();
    const step = dt / SCREENS.TRANSITION_TIME;

    // Night to day.
    const dayTarget = isDayScreen(session.screen) ? 1 : 0;
    mood.daylight += Math.sign(dayTarget - mood.daylight) * Math.min(step, Math.abs(dayTarget - mood.daylight));
    v.sky.copy(v.night).lerp(v.day, mood.daylight);
    if (scene.fog) scene.fog.color.copy(v.sky); // Fog keeps its own copy of the colour
    if (ambient.current) {
      ambient.current.intensity = NIGHT.AMBIENT_INTENSITY + (RENDER.AMBIENT_INTENSITY - NIGHT.AMBIENT_INTENSITY) * mood.daylight;
    }
    if (sun.current) {
      sun.current.intensity = NIGHT.SUN_INTENSITY + (RENDER.SUN_INTENSITY - NIGHT.SUN_INTENSITY) * mood.daylight;
    }

    // Camera target for this screen.
    const nextPose = poseFor(session.screen);
    if (nextPose !== pose.current) {
      pose.current = nextPose;
      blend.current = 0;
      v.fromPosition.copy(camera.position);
      v.fromLook.copy(v.look);
    }
    if (nextPose === 'SKY') {
      v.targetPosition.set(...SCREENS.SKY_CAMERA_POSITION);
      v.targetLook.set(...SCREENS.SKY_LOOK_AT);
    } else if (nextPose === 'SELECT') {
      v.targetPosition.set(...SCREENS.SELECT_CAMERA_POSITION);
      v.targetLook.set(...SCREENS.SELECT_LOOK_AT);
    } else {
      // Run: fixed behind the hero, easing sideways toward 30% of the player's x.
      const target = session.run.player.x * CAMERA.FOLLOW_X_FACTOR;
      followX.current += (target - followX.current) * (1 - Math.exp(-CAMERA.FOLLOW_RATE * dt));
      const [px, py, pz] = CAMERA.POSITION;
      const [lx, ly, lz] = CAMERA.LOOK_AT;
      v.targetPosition.set(px + followX.current, py, pz);
      v.targetLook.set(lx + followX.current, ly, lz);
    }
    blend.current = Math.min(1, blend.current + step);
    const s = smoothstep(blend.current);
    camera.position.lerpVectors(v.fromPosition, v.targetPosition, s);
    v.look.lerpVectors(v.fromLook, v.targetLook, s);
    camera.lookAt(v.look);
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={NIGHT.AMBIENT_INTENSITY} />
      <directionalLight ref={sun} position={[...RENDER.SUN_POSITION]} intensity={NIGHT.SUN_INTENSITY} />
    </>
  );
}
