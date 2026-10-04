import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  ExtrudeGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PARTS } from '../config';

/**
 * Helpers for objects built in code: accessories, barriers and scenery. An
 * object is made of simple coloured parts merged into one mesh, with the
 * colour stored per vertex, so it costs one draw call however many parts it has.
 */

export type Vec3 = readonly [number, number, number];
export const FULL_TURN = Math.PI * 2;
/** Segment counts for round parts: smooth for close-up shapes, coarse for small or distant ones. */
export const SMOOTH = PARTS.SMOOTH;
export const COARSE = PARTS.COARSE;

export interface Placement {
  at?: Vec3;
  turn?: Vec3;
  scale?: Vec3 | number;
}

export interface Finish {
  /** Makes the mesh shine softly in this colour. */
  glow?: string;
  glowStrength?: number;
  /** A thin sheet seen from both sides (capes, wings, banners). */
  sheet?: boolean;
  /** Keep the parts' own normals (for smooth round shapes) instead of flat-shading every face. */
  roughness?: number;
}

/** Collects coloured parts and merges them into one mesh. */
export class Parts {
  private readonly geometries: BufferGeometry[] = [];
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly euler = new Euler();
  private readonly size = new Vector3();
  private readonly tint = new Color();

  add(geometry: BufferGeometry, color: string, { at = [0, 0, 0], turn = [0, 0, 0], scale = 1 }: Placement = {}): this {
    const part = geometry.index ? geometry.toNonIndexed() : geometry;
    this.position.set(at[0], at[1], at[2]);
    this.rotation.setFromEuler(this.euler.set(turn[0], turn[1], turn[2]));
    if (typeof scale === 'number') this.size.setScalar(scale);
    else this.size.set(scale[0], scale[1], scale[2]);
    part.applyMatrix4(this.matrix.compose(this.position, this.rotation, this.size));
    if (!part.getAttribute('normal')) part.computeVertexNormals();
    if (!part.getAttribute('color')) {
      this.tint.set(color);
      const count = part.getAttribute('position').count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) this.tint.toArray(colors, i * 3);
      part.setAttribute('color', new BufferAttribute(colors, 3));
    }
    for (const name of Object.keys(part.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'color') part.deleteAttribute(name);
    }
    this.geometries.push(part);
    return this;
  }

  /** All parts added so far as one geometry. */
  geometry(): BufferGeometry {
    return mergeGeometries(this.geometries) ?? new BufferGeometry();
  }

  /** One mesh for all parts added so far. */
  mesh({ glow, glowStrength = 0, sheet = false, roughness = PARTS.ROUGHNESS }: Finish = {}): Mesh {
    const material = new MeshStandardMaterial({ vertexColors: true, roughness });
    if (sheet) material.side = DoubleSide;
    if (glow) {
      material.emissive.set(glow);
      material.emissiveIntensity = glowStrength;
    }
    return new Mesh(this.geometry(), material);
  }
}

export const ball = (radius: number, detail: number = SMOOTH) => new SphereGeometry(radius, detail, Math.ceil(detail * 0.75));

/** A flat star with `points` points, extruded to `depth`, centred on its origin and facing along z. */
export function starGeometry(outer: number, inner: number, depth: number, points = 5): BufferGeometry {
  const shape = new Shape();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * FULL_TURN + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
}

/** Gives a geometry one colour per vertex from a function of its position (for gradients). */
export function paint(geometry: BufferGeometry, colorAt: (x: number, y: number, z: number, out: Color) => void): BufferGeometry {
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const color = new Color();
  for (let i = 0; i < position.count; i++) {
    colorAt(position.getX(i), position.getY(i), position.getZ(i), color);
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Colours each triangle of a geometry from its centre point, for crisp bands
 * (rainbows, candy stripes, lollipop swirls). Returns a non-indexed copy.
 */
export function paintFaces(geometry: BufferGeometry, colorAt: (x: number, y: number, z: number, out: Color) => void): BufferGeometry {
  const faces = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = faces.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const color = new Color();
  for (let i = 0; i < position.count; i += 3) {
    colorAt(
      (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3,
      (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3,
      (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3,
      color,
    );
    for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3);
  }
  faces.setAttribute('color', new BufferAttribute(colors, 3));
  return faces;
}

/** Picks one of `colors` for a band number, wrapping round. */
export function bandColor(colors: readonly string[], band: number, out: Color): Color {
  const count = colors.length;
  return out.set(colors[((Math.floor(band) % count) + count) % count] ?? '#ffffff');
}
