import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { OBSTACLES, POOLS } from '../config';
import type { BarrierType } from '../game/barriers';
import { useGameStore } from '../store/gameStore';
import { BARRIER_MODELS, WIDE_CLOUD_BAR_MODEL } from './assetManifest';
import { getModel } from './assets';
import { makeBarriers, makeWideCloudBar } from './barrierShapes';
import { InstancedModel } from './instancing';

const TYPES: readonly BarrierType[] = ['L', 'H', 'T'];
const WIDE_SCALE = OBSTACLES.WIDE_HALF_WIDTH / OBSTACLES.HALF_WIDTH;

/**
 * Barriers drawn from the pool. Each type uses its loaded models, or the
 * barriers built in code when there are none, picking one per barrier from its
 * spawn serial. All are built to size with their origin at the bottom centre.
 * Hitboxes come from config, never from the meshes.
 */
export function Barriers() {
  const { variants, wide, all } = useMemo(() => {
    const built = makeBarriers();
    const variants = {} as Record<BarrierType, InstancedModel[]>;
    for (const type of TYPES) {
      const loaded = BARRIER_MODELS[type].map(getModel).filter((m) => m !== null);
      const roots = loaded.length ? loaded.map((gltf) => gltf.scene) : built[type];
      variants[type] = roots.map((root) => new InstancedModel(root, POOLS.BARRIERS));
    }
    const wide = new InstancedModel(getModel(WIDE_CLOUD_BAR_MODEL)?.scene ?? makeWideCloudBar(), POOLS.BARRIERS);
    const all = [...TYPES.flatMap((type) => variants[type]), wide];
    return { variants, wide, all };
  }, []);
  const temp = useMemo(
    () => ({ matrix: new Matrix4(), position: new Vector3(), rotation: new Quaternion(), scale: new Vector3() }),
    [],
  );

  useFrame(() => {
    const items = useGameStore.getState().session.run.barriers.items;
    for (const model of all) model.begin();
    for (let i = 0; i < items.length; i++) {
      const barrier = items[i];
      if (!barrier?.active) continue;
      const isWide = barrier.halfWidth > OBSTACLES.HALF_WIDTH;
      const models = variants[barrier.type];
      // A full row of high barriers is one wide cloud bar; any other wide barrier is stretched.
      const model = isWide && barrier.type === 'H' ? wide : models[barrier.serial % models.length];
      if (!model) continue;
      temp.position.set(barrier.x, 0, barrier.z);
      temp.scale.set(isWide && model !== wide ? WIDE_SCALE : 1, 1, 1);
      temp.matrix.compose(temp.position, temp.rotation, temp.scale);
      model.add(temp.matrix);
    }
    for (const model of all) model.end();
  });

  return (
    <>
      {all.flatMap((model) => model.objects).map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}
