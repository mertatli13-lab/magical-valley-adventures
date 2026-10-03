import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { BoxGeometry, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { OBSTACLES, POOLS, RENDER } from '../config';
import type { BarrierType } from '../game/barriers';
import { useGameStore } from '../store/gameStore';
import { BARRIER_MODELS, WIDE_CLOUD_BAR_MODEL } from './assetManifest';
import { getModel } from './assets';
import { InstancedModel } from './instancing';

const TYPES: readonly BarrierType[] = ['L', 'H', 'T'];
const COLORS: Record<BarrierType, string> = { L: RENDER.LOW_COLOR, H: RENDER.HIGH_COLOR, T: RENDER.TALL_COLOR };
const WIDE_SCALE = OBSTACLES.WIDE_HALF_WIDTH / OBSTACLES.HALF_WIDTH;

/** Height of the grey-box barrier and the y of its centre. */
function greyBox(type: BarrierType): { height: number; centerY: number } {
  switch (type) {
    case 'L':
      return { height: OBSTACLES.LOW_HEIGHT, centerY: OBSTACLES.LOW_HEIGHT / 2 };
    case 'H':
      return { height: RENDER.HIGH_BAR_THICKNESS, centerY: OBSTACLES.HIGH_CLEARANCE + RENDER.HIGH_BAR_THICKNESS / 2 };
    case 'T':
      return { height: OBSTACLES.TALL_HEIGHT, centerY: OBSTACLES.TALL_HEIGHT / 2 };
  }
}

interface Variants {
  /** True when these are real models (placed at their origin, unscaled); false for the grey box. */
  real: boolean;
  models: InstancedModel[];
}

/**
 * Barriers drawn from the pool. Each type uses its loaded models, picking one
 * per barrier from its spawn serial; with no models it falls back to a grey
 * box per type. Hitboxes come from config, never from the meshes.
 */
export function Barriers() {
  const { variants, wide, all } = useMemo(() => {
    const variants = {} as Record<BarrierType, Variants>;
    for (const type of TYPES) {
      const loaded = BARRIER_MODELS[type].map(getModel).filter((m) => m !== null);
      variants[type] = loaded.length
        ? { real: true, models: loaded.map((gltf) => new InstancedModel(gltf.scene, POOLS.BARRIERS)) }
        : {
            real: false,
            models: [
              new InstancedModel(
                new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: COLORS[type] })),
                POOLS.BARRIERS,
              ),
            ],
          };
    }
    const wideModel = getModel(WIDE_CLOUD_BAR_MODEL);
    const wide = wideModel ? new InstancedModel(wideModel.scene, POOLS.BARRIERS) : null;
    const all = [...TYPES.flatMap((type) => variants[type].models), ...(wide ? [wide] : [])];
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
      const group = variants[barrier.type];
      if (isWide && wide) {
        temp.matrix.makeTranslation(barrier.x, 0, barrier.z);
        wide.add(temp.matrix);
        continue;
      }
      const model = group.models[barrier.serial % group.models.length];
      if (!model) continue;
      if (group.real) {
        // Real models are built to size with their origin at the bottom centre.
        temp.position.set(barrier.x, 0, barrier.z);
        temp.scale.set(isWide ? WIDE_SCALE : 1, 1, 1);
      } else {
        const box = greyBox(barrier.type);
        temp.position.set(barrier.x, box.centerY, barrier.z);
        temp.scale.set(barrier.halfWidth * 2, box.height, OBSTACLES.DEPTH);
      }
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
