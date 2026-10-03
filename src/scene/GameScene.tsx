import { Canvas } from '@react-three/fiber';
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
  return (
    <Canvas
      className="scene"
      dpr={[...RENDER.DPR]}
      camera={{
        position: [...SCREENS.SKY_CAMERA_POSITION],
        fov: CAMERA.FOV,
        near: CAMERA.NEAR,
        far: CAMERA.FAR,
      }}
    >
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
