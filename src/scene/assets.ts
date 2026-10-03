import type { Group, Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODELS } from '../config';
import { useAssetStore } from '../store/assetStore';
import { ALL_MODELS } from './assetManifest';

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
const GLB_MAGIC = 0x46546c67; // "glTF", little-endian

async function loadOne(loader: GLTFLoader, path: string): Promise<GLTF | null> {
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

let started: Promise<void> | null = null;

/** Starts loading (once). The asset store reports progress and completion. */
export function loadAllModels(paths: readonly string[] = ALL_MODELS): Promise<void> {
  if (started) return started;
  const { setProgress, finish } = useAssetStore.getState();
  const loader = new GLTFLoader();
  let loaded = 0;
  setProgress(0, paths.length);
  const queue = [...paths];
  const worker = async () => {
    for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
      models.set(path, await loadOne(loader, path));
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
