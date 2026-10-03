import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { useAssetStore } from '../store/assetStore';
import { CAMERA, RENDER, SCREENS } from '../config';
import { Barriers } from './Barriers';
import { Director } from './Director';
import { Forest } from './Forest';
import { DustPuff } from './DustPuff';
import { Ground } from './Ground';
import { Particles } from './Particles';
import { Player } from './Player';
import { RunLoop } from './RunLoop';
import { RunWorld } from './RunWorld';
import { Scenery } from './Scenery';
import { Sky } from './Sky';
import { SpeedLines } from './SpeedLines';
import { Sprinkles } from './Sprinkles';
import { StarPops } from './StarPops';
import { Stars } from './Stars';

export function GameScene() {
  // The worlds read loaded models when they mount, so they wait for loading to finish
  // (the Landing screen covers everything until then).
  const loaded = useAssetStore((state) => state.done);
  const [minDpr, maxDpr] = RENDER.DPR;
  // Start sharp; if the frame rate drops, render fewer pixels (and go back up when it recovers).
  const [dpr, setDpr] = useState<number>(Math.min(maxDpr, window.devicePixelRatio || minDpr));
  return (
    <Canvas
      className="scene"
      dpr={dpr}
      camera={{
        position: [...SCREENS.SKY_CAMERA_POSITION],
        fov: CAMERA.FOV,
        near: CAMERA.NEAR,
        far: CAMERA.FAR,
      }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((value) => Math.max(minDpr, value - RENDER.DPR_STEP))}
        onIncline={() => setDpr((value) => Math.min(maxDpr, window.devicePixelRatio || minDpr, value + RENDER.DPR_STEP))}
      />
      <RunLoop />
      <Director />
      {loaded && <Forest />}
      {loaded && (
        <RunWorld>
          <Sky />
          <Ground />
          <Scenery />
          <Particles />
          <Barriers />
          <Stars />
          <StarPops />
          <Sprinkles />
          <DustPuff />
          <SpeedLines />
          <Player />
        </RunWorld>
      )}
    </Canvas>
  );
}
