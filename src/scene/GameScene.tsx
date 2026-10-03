import { Canvas } from '@react-three/fiber';
import { CAMERA, GROUND, RENDER } from '../config';
import { Ground } from './Ground';

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
      <Ground width={GROUND.CHUNK_WIDTH} length={RENDER.GROUND_LENGTH} centerZ={RENDER.GROUND_CENTER_Z} />
    </Canvas>
  );
}
