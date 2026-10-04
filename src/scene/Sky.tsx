import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Box3, Sphere, type Material, type Mesh, type Object3D } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { VALLEY } from '../config';
import { frameDt } from '../game/run';
import { SKY_MODEL } from './assetManifest';
import { getModel } from './assets';
import { makeBackdrop, type Backdrop } from './backdrop';
import { mood } from './mood';

/** A modelled sky dome, scaled to fit round the camera, wrapped to behave like the built one. */
function modelBackdrop(scene: Object3D): Backdrop {
  const root = cloneSkinned(scene);
  const radius = new Box3().setFromObject(root).getBoundingSphere(new Sphere()).radius;
  if (radius > 0) root.scale.setScalar(VALLEY.SKY_RADIUS / radius);
  const materials: Backdrop['materials'] = [];
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.renderOrder = -1;
    mesh.frustumCulled = false;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      (material as Material & { fog?: boolean }).fog = false;
      material.depthWrite = false;
      materials.push({ material, opacity: material.opacity });
      material.transparent = true;
    }
  });
  return { root: root as Backdrop['root'], materials, update: () => undefined };
}

/**
 * The daytime sky: the sky model if there is one, otherwise the backdrop built
 * in code (dome, sun, rainbow, hills, clouds). It follows the camera, ignores
 * fog, draws behind everything and fades in with the daylight.
 */
export function Sky() {
  const backdrop = useMemo(() => {
    const model = getModel(SKY_MODEL);
    return model ? modelBackdrop(model.scene) : makeBackdrop();
  }, []);

  useFrame(({ camera }, delta) => {
    backdrop.root.position.set(camera.position.x, 0, camera.position.z);
    backdrop.update(frameDt(delta));
    for (const { material, opacity } of backdrop.materials) material.opacity = opacity * mood.daylight;
  });

  return <primitive object={backdrop.root} />;
}
