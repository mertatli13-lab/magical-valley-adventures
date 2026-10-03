import { Canvas } from '@react-three/fiber';
import { CAMERA, RENDER } from '../config';
import { Barriers } from './Barriers';
import { CameraRig } from './CameraRig';
import { Ground } from './Ground';
import { HitPop } from './HitPop';
import { Player } from './Player';
import { RunLoop } from './RunLoop';
import { StarPops } from './StarPops';
import { Stars } from './Stars';

export function GameScene() {
  return (
    <Canvas
      className="scene"
      dpr={[...RENDER.DPR]}
      camera={{
        position: [...CAMERA.POSITION],
        fov: CAMERA.FOV,
        near: CAMERA.NEAR,
        far: CAMERA.FAR,
      }}
      onCreated={({ camera }) => camera.lookAt(...CAMERA.LOOK_AT)}
    >
      <color attach="background" args={[RENDER.SKY_COLOR]} />
      <fog attach="fog" args={[RENDER.SKY_COLOR, RENDER.FOG_NEAR, RENDER.FOG_FAR]} />
      <ambientLight intensity={RENDER.AMBIENT_INTENSITY} />
      <directionalLight position={[...RENDER.SUN_POSITION]} intensity={RENDER.SUN_INTENSITY} />
      <RunLoop />
      <CameraRig />
      <Ground />
      <Barriers />
      <Stars />
      <StarPops />
      <HitPop />
      <Player />
    </Canvas>
  );
}
