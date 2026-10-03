import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Fog, Vector3, type DirectionalLight, type HemisphereLight } from 'three';
import { CAMERA, LIGHTING, NIGHT, RENDER, SCREENS } from '../config';
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
  const hemi = useRef<HemisphereLight>(null);
  const sun = useRef<DirectionalLight>(null);
  const v = useMemo(
    () => ({
      night: new Color(NIGHT.SKY_COLOR),
      day: new Color(RENDER.SKY_COLOR),
      dayFog: new Color(RENDER.FOG_COLOR),
      sky: new Color(NIGHT.SKY_COLOR),
      fog: new Color(NIGHT.SKY_COLOR),
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
  // The shop covers the screen; keep the scene as it was on the screen it was opened from.
  const sceneScreen = useRef<Screen>('LANDING');

  useLayoutEffect(() => {
    scene.background = v.sky;
    scene.fog = new Fog(v.fog, RENDER.FOG_NEAR, RENDER.FOG_FAR);
  }, [scene, v]);

  useFrame(({ camera }, delta) => {
    const dt = frameDt(delta);
    const { session } = useGameStore.getState();
    const step = dt / SCREENS.TRANSITION_TIME;
    if (session.screen !== 'SHOP') sceneScreen.current = session.screen;
    const screen = sceneScreen.current;

    // Night to day.
    const dayTarget = isDayScreen(screen) ? 1 : 0;
    mood.daylight += Math.sign(dayTarget - mood.daylight) * Math.min(step, Math.abs(dayTarget - mood.daylight));
    v.sky.copy(v.night).lerp(v.day, mood.daylight);
    // Day fog matches the sky dome's horizon, so it hides the spawn point cleanly.
    v.fog.copy(v.night).lerp(v.dayFog, mood.daylight);
    if (scene.fog) scene.fog.color.copy(v.fog); // Fog keeps its own copy of the colour
    if (hemi.current) {
      hemi.current.intensity =
        LIGHTING.HEMI_NIGHT_INTENSITY + (LIGHTING.HEMI_DAY_INTENSITY - LIGHTING.HEMI_NIGHT_INTENSITY) * mood.daylight;
    }
    if (sun.current) {
      sun.current.intensity = NIGHT.SUN_INTENSITY + (RENDER.SUN_INTENSITY - NIGHT.SUN_INTENSITY) * mood.daylight;
    }

    // Camera target for this screen.
    const nextPose = poseFor(screen);
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
      <hemisphereLight
        ref={hemi}
        args={[LIGHTING.HEMI_SKY_COLOR, LIGHTING.HEMI_GROUND_COLOR, LIGHTING.HEMI_NIGHT_INTENSITY]}
      />
      <directionalLight
        ref={sun}
        color={LIGHTING.SUN_COLOR}
        position={[...RENDER.SUN_POSITION]}
        intensity={NIGHT.SUN_INTENSITY}
      />
    </>
  );
}
