import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { ExtrudeGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Shape, Vector3 } from 'three';
import { POOLS, RENDER } from '../config';
import { useGameStore } from '../store/gameStore';
import { STAR_MODEL } from './assetManifest';
import { getModel } from './assets';
import { InstancedModel } from './instancing';

/** A flat five-point star, extruded and centred. Built once. */
function createStarGeometry(): ExtrudeGeometry {
  const shape = new Shape();
  const corners = RENDER.STAR_POINTS * 2;
  for (let i = 0; i < corners; i++) {
    const radius = i % 2 === 0 ? RENDER.STAR_RADIUS : RENDER.STAR_RADIUS * RENDER.STAR_INNER_RATIO;
    const angle = (i / corners) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: RENDER.STAR_THICKNESS, bevelEnabled: false });
  geometry.center();
  return geometry;
}

/** The star and big star: from star.glb ("Star" and "BigStar" nodes) or the placeholder shape. */
function starModels(): { small: InstancedModel; big: InstancedModel; real: boolean } {
  const model = getModel(STAR_MODEL);
  const smallNode = model?.scene.getObjectByName('Star');
  if (model && smallNode) {
    const bigNode = model.scene.getObjectByName('BigStar');
    return {
      small: new InstancedModel(smallNode, POOLS.STARS),
      big: new InstancedModel(bigNode ?? smallNode, POOLS.STARS),
      real: bigNode !== undefined,
    };
  }
  if (model) console.warn(`[assets] ${STAR_MODEL} has no "Star" node; using the placeholder.`);
  const geometry = createStarGeometry();
  // Unlit, so stars read as flat glowing colour (Blender asset spec).
  return {
    small: new InstancedModel(new Mesh(geometry, new MeshBasicMaterial({ color: RENDER.STAR_COLOR })), POOLS.STARS),
    big: new InstancedModel(new Mesh(geometry, new MeshBasicMaterial({ color: RENDER.BIG_STAR_COLOR })), POOLS.STARS),
    real: false,
  };
}

/** All pooled stars, spinning: one instanced model for stars and one for big stars. */
export function Stars() {
  const { small, big, real } = useMemo(starModels, []);
  const temp = useMemo(() => ({ matrix: new Matrix4(), position: new Vector3(), rotation: new Quaternion(), scale: new Vector3(), up: new Vector3(0, 1, 0) }), []);

  useFrame(({ clock }) => {
    const items = useGameStore.getState().session.run.stars.items;
    const spin = clock.elapsedTime * RENDER.STAR_SPIN;
    small.begin();
    big.begin();
    for (let i = 0; i < items.length; i++) {
      const star = items[i];
      if (!star?.active) continue;
      temp.position.set(star.x, star.y, star.z);
      temp.rotation.setFromAxisAngle(temp.up, spin + i * RENDER.STAR_PHASE_STEP);
      // A real big-star model is built to size; the placeholder is scaled up.
      temp.scale.setScalar(star.big && !real ? RENDER.BIG_STAR_SCALE : 1);
      temp.matrix.compose(temp.position, temp.rotation, temp.scale);
      (star.big ? big : small).add(temp.matrix);
    }
    small.end();
    big.end();
  });

  return (
    <>
      {[...small.objects, ...big.objects].map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}
