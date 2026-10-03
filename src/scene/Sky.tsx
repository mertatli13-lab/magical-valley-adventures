import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import {
  BackSide,
  Box3,
  BufferAttribute,
  Color,
  Mesh,
  MeshBasicMaterial,
  Sphere,
  SphereGeometry,
  type Material,
  type Object3D,
} from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { VALLEY } from '../config';
import { SKY_MODEL } from './assetManifest';
import { getModel } from './assets';
import { mood } from './mood';

const SKY_SEGMENTS = 32;

/** Gradient sphere from the horizon colour up to the sky colour, seen from inside. */
function placeholderSky(): Object3D {
  const geometry = new SphereGeometry(VALLEY.SKY_RADIUS, SKY_SEGMENTS, SKY_SEGMENTS / 2);
  const top = new Color(VALLEY.SKY_TOP_COLOR);
  const horizon = new Color(VALLEY.SKY_HORIZON_COLOR);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const color = new Color();
  for (let i = 0; i < position.count; i++) {
    const height = Math.max(0, position.getY(i) / VALLEY.SKY_RADIUS);
    color.copy(horizon).lerp(top, Math.sqrt(height));
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, side: BackSide }));
}

/**
 * The daytime sky dome. It follows the camera, ignores fog, draws behind
 * everything and fades in with the daylight.
 */
export function Sky() {
  const { root, materials } = useMemo(() => {
    const model = getModel(SKY_MODEL);
    let root: Object3D;
    if (model) {
      root = cloneSkinned(model.scene);
      const radius = new Box3().setFromObject(root).getBoundingSphere(new Sphere()).radius;
      if (radius > 0) root.scale.setScalar(VALLEY.SKY_RADIUS / radius);
    } else {
      root = placeholderSky();
    }
    const materials: Material[] = [];
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.renderOrder = -1;
      mesh.frustumCulled = false;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        (material as Material & { fog?: boolean }).fog = false;
        material.depthWrite = false;
        material.transparent = true;
        materials.push(material);
      }
    });
    return { root, materials };
  }, []);

  useFrame(({ camera }) => {
    root.position.copy(camera.position);
    for (const material of materials) material.opacity = mood.daylight;
  });

  return <primitive object={root} />;
}
