import { InstancedMesh, Matrix4, type Material, type Mesh, type Object3D } from 'three';

interface Part {
  mesh: InstancedMesh;
  /** The part's transform inside the model. */
  offset: Matrix4;
}

/**
 * Draws many copies of a model with one InstancedMesh per part, so a pool of
 * barriers or scenery costs a few draw calls instead of one per object. Each
 * frame: begin(), add() a matrix per copy, end(). Allocates nothing per frame.
 */
export class InstancedModel {
  readonly parts: Part[] = [];
  private count = 0;
  private readonly temp = new Matrix4();

  constructor(
    root: Object3D,
    readonly capacity: number,
  ) {
    root.updateMatrixWorld(true);
    const inverseRoot = new Matrix4().copy(root.matrixWorld).invert();
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || (mesh as { isSkinnedMesh?: boolean }).isSkinnedMesh) return;
      const instanced = new InstancedMesh(mesh.geometry, mesh.material as Material, capacity);
      instanced.count = 0;
      instanced.frustumCulled = false;
      this.parts.push({ mesh: instanced, offset: new Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld) });
    });
  }

  get objects(): InstancedMesh[] {
    return this.parts.map((part) => part.mesh);
  }

  begin(): void {
    this.count = 0;
  }

  add(matrix: Matrix4): void {
    if (this.count >= this.capacity) return;
    for (const part of this.parts) {
      this.temp.multiplyMatrices(matrix, part.offset);
      part.mesh.setMatrixAt(this.count, this.temp);
    }
    this.count++;
  }

  end(): void {
    for (const part of this.parts) {
      part.mesh.count = this.count;
      part.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
