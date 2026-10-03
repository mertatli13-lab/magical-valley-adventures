import { Canvas } from '@react-three/fiber';
import { CAMERA, RENDER, SCREENS } from '../config';
import { Barriers } from './Barriers';
import { Director } from './Director';
import { Forest } from './Forest';
import { Ground } from './Ground';
import { HitPop } from './HitPop';
import { Player } from './Player';
import { RunLoop } from './RunLoop';
import { RunWorld } from './RunWorld';
import { StarPops } from './StarPops';
import { Stars } from './Stars';

export function GameScene() {
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
      <Forest />
      <RunWorld>
        <Ground />
        <Barriers />
        <Stars />
        <StarPops />
        <HitPop />
        <Player />
      </RunWorld>
    </Canvas>
  );
}
