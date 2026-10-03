import type { Group, Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MODELS } from '../config';
import { useAssetStore } from '../store/assetStore';
import { ACCESSORY_MODELS, ALL_MODELS } from './assetManifest';

/**
 * Loads every model once at startup, behind the Landing screen's loading bar.
 *
 * three's GLTFLoader is used directly (it is what drei's useGLTF wraps):
 * useGLTF suspends and throws on a missing file, and Vite's dev server answers
 * a missing file with index.html, so each file is fetched and checked for the
 * GLB signature first. Anything missing or broken is recorded as null and the
 * game uses its grey-box placeholder, with a warning in the console.
 */
const models = new Map<string, GLTF | null>();
const pending = new Map<string, Promise<GLTF | null>>();
// Models compressed with `npm run optimize:models` use meshopt; WebP textures need nothing extra.
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const GLB_MAGIC = 0x46546c67; // "glTF", little-endian

async function loadOne(path: string): Promise<GLTF | null> {
  const url = `${import.meta.env.BASE_URL}${path}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 4 || new DataView(bytes).getUint32(0, true) !== GLB_MAGIC) throw new Error('not a GLB file');
    return await loader.parseAsync(bytes, url.slice(0, url.lastIndexOf('/') + 1));
  } catch (error) {
    console.warn(`[assets] ${path} is missing or broken (${(error as Error).message}); using the placeholder.`);
    return null;
  }
}

/** Loads one model (once); getModel() returns it when done. Used for models not needed at startup. */
export function requestModel(path: string): Promise<GLTF | null> {
  let promise = pending.get(path);
  if (!promise) {
    promise = loadOne(path).then((gltf) => {
      models.set(path, gltf);
      return gltf;
    });
    pending.set(path, promise);
  }
  return promise;
}

/** Whether a model has finished loading (or been found missing). */
export function isSettled(path: string): boolean {
  return models.has(path);
}

/**
 * What the first load needs: everything except the accessories, apart from
 * the one being worn. The other accessories load when the shop opens.
 */
export function startupModels(equippedAccessory: string | null): string[] {
  const accessories = new Set(Object.values(ACCESSORY_MODELS));
  const worn = equippedAccessory ? ACCESSORY_MODELS[equippedAccessory] : undefined;
  return ALL_MODELS.filter((path) => !accessories.has(path) || path === worn);
}

let started: Promise<void> | null = null;

/** Starts loading (once). The asset store reports progress and completion. */
export function loadAllModels(paths: readonly string[] = ALL_MODELS): Promise<void> {
  if (started) return started;
  const { setProgress, finish } = useAssetStore.getState();
  let loaded = 0;
  setProgress(0, paths.length);
  const queue = [...paths];
  const worker = async () => {
    for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
      await requestModel(path);
      setProgress(++loaded, paths.length);
    }
  };
  started = Promise.all(Array.from({ length: MODELS.PARALLEL_LOADS }, worker)).then(() => {
    finish(paths.filter((path) => !models.get(path)));
  });
  return started;
}

/** A loaded model, or null if it is missing (use the placeholder). Valid once loading is done. */
export function getModel(path: string): GLTF | null {
  return models.get(path) ?? null;
}

/** Finds a named object inside a model, e.g. an attach empty or the "BigStar" node. */
export function findNode(root: Object3D | Group, name: string): Object3D | undefined {
  return root.getObjectByName(name) ?? undefined;
}
