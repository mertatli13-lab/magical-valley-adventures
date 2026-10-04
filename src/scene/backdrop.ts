import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  SphereGeometry,
  type Material,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { VALLEY } from '../config';
import { Random } from '../game/random';
import { COARSE, FULL_TURN, paint } from './parts';
import { radialTexture } from './textures';

/**
 * The daytime backdrop, built in code: a gradient sky dome, a sun, a rainbow,
 * three ridges of rolling hills and drifting clouds. Everything is unlit and
 * ignores fog; the hills fade into the horizon colour at their foot, so they
 * meet the fogged valley floor without a seam. About ten draw calls.
 */

const SKY_SEGMENTS = 32;
const radians = MathUtils.degToRad;

/** A point on the backdrop sphere. `turn` 0 is straight ahead (-z); `up` 0 is the horizon. */
function place(object: Object3D, turn: number, up: number, radius: number): void {
  const t = radians(turn);
  const u = radians(up);
  object.position.set(Math.sin(t) * Math.cos(u) * radius, Math.sin(u) * radius, -Math.cos(t) * Math.cos(u) * radius);
  object.lookAt(0, 0, 0);
}

function dome(): Mesh {
  const geometry = new SphereGeometry(VALLEY.SKY_RADIUS, SKY_SEGMENTS, SKY_SEGMENTS / 2);
  const top = new Color(VALLEY.SKY_TOP_COLOR);
  const horizon = new Color(VALLEY.SKY_HORIZON_COLOR);
  paint(geometry, (_x, y, _z, out) => {
    out.copy(horizon).lerp(top, Math.sqrt(Math.max(0, y / VALLEY.SKY_RADIUS)));
  });
  return new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, side: BackSide }));
}

/** One ridge: a wall round the horizon whose top rolls up and down. */
function ridge(index: number): Mesh {
  const hill = VALLEY.HILLS[index] ?? VALLEY.HILLS[0];
  const radius = VALLEY.BACKDROP_RADIUS - index * 8;
  const random = new Random(VALLEY.SEED + hill.seed);
  // A few sine waves of different lengths make a rolling skyline that joins up after a full turn.
  const waves = [2, 3, 5, 8, 13].map((frequency) => ({ frequency, phase: random.next() * FULL_TURN, size: 1 / Math.sqrt(frequency) }));
  const total = waves.reduce((sum, wave) => sum + wave.size, 0);
  const heightAt = (angle: number) =>
    hill.height + (waves.reduce((sum, wave) => sum + Math.sin(angle * wave.frequency + wave.phase) * wave.size, 0) / total) * hill.roll * 2;
  const rows = [0, 0.45, 1];
  const positions: number[] = [];
  const colors: number[] = [];
  const top = new Color(hill.color);
  const foot = new Color(VALLEY.SKY_HORIZON_COLOR);
  const color = new Color();
  const vertex = (segment: number, row: number) => {
    const angle = (segment / VALLEY.HILL_SEGMENTS) * FULL_TURN;
    const share = rows[row] ?? 0;
    const y = VALLEY.HILL_FOOT + (heightAt(angle) - VALLEY.HILL_FOOT) * share;
    positions.push(Math.sin(angle) * radius, y, -Math.cos(angle) * radius);
    color.copy(foot).lerp(top, share ** 0.6).toArray(colors, colors.length);
  };
  for (let segment = 0; segment < VALLEY.HILL_SEGMENTS; segment++) {
    for (let row = 0; row < rows.length - 1; row++) {
      vertex(segment, row);
      vertex(segment + 1, row);
      vertex(segment + 1, row + 1);
      vertex(segment, row);
      vertex(segment + 1, row + 1);
      vertex(segment, row + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  return new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }));
}

/** All the clouds as one mesh, in a group that turns slowly. */
function clouds(): Group {
  const random = new Random(VALLEY.SEED + 7);
  const top = new Color(VALLEY.CLOUD_TOP_COLOR);
  const under = new Color(VALLEY.CLOUD_UNDER_COLOR);
  const puffs: BufferGeometry[] = [];
  for (let i = 0; i < VALLEY.CLOUD_COUNT; i++) {
    const size = VALLEY.CLOUD_MIN_SIZE + random.next() * (VALLEY.CLOUD_MAX_SIZE - VALLEY.CLOUD_MIN_SIZE);
    const turn = (i / VALLEY.CLOUD_COUNT) * 360 + random.next() * 14;
    const up = VALLEY.CLOUD_MIN_UP + random.next() * (VALLEY.CLOUD_MAX_UP - VALLEY.CLOUD_MIN_UP);
    const anchor = new Group();
    place(anchor, turn, up, VALLEY.BACKDROP_RADIUS - 30);
    anchor.updateMatrix();
    // A cloud: a row of overlapping balls, biggest in the middle, flat underneath.
    const balls = 5;
    for (let b = 0; b < balls; b++) {
      const along = b / (balls - 1) - 0.5;
      const radius = size * (0.34 - Math.abs(along) * 0.3 + random.next() * 0.06);
      const ball = new SphereGeometry(radius, COARSE + 4, COARSE).toNonIndexed();
      ball.scale(1, 0.72, 0.6);
      ball.translate(along * size * 1.25, radius * 0.45, 0);
      paint(ball, (_x, y, _z, out) => {
        out.copy(under).lerp(top, MathUtils.clamp(y / (size * 0.3) + 0.35, 0, 1));
      });
      ball.applyMatrix4(anchor.matrix);
      ball.deleteAttribute('uv');
      ball.deleteAttribute('normal');
      puffs.push(ball);
    }
  }
  const group = new Group();
  group.add(new Mesh(mergeGeometries(puffs) ?? new BufferGeometry(), new MeshBasicMaterial({ vertexColors: true })));
  return group;
}

function sun(): Group {
  const { turn, up, size, glow, glowOpacity, color, glowColor } = VALLEY.SUN;
  const group = new Group();
  const halo = new Mesh(
    new CircleGeometry(glow, SKY_SEGMENTS),
    new MeshBasicMaterial({ color: glowColor, map: radialTexture(), blending: AdditiveBlending, opacity: glowOpacity }),
  );
  const disc = new Mesh(new CircleGeometry(size, SKY_SEGMENTS), new MeshBasicMaterial({ color }));
  disc.position.z = 0.5;
  group.add(halo, disc);
  place(group, turn, up, VALLEY.BACKDROP_RADIUS + 12);
  return group;
}

function rainbow(): Mesh {
  const { turn, radius, width, sink, opacity, colors } = VALLEY.RAINBOW;
  const geometry = new RingGeometry(radius - width, radius, SKY_SEGMENTS * 2, colors.length, 0, Math.PI).toNonIndexed();
  const band = new Color();
  paint(geometry, (x, y, _z, out) => {
    const share = (Math.hypot(x, y) - (radius - width)) / width;
    const index = Math.min(colors.length - 1, Math.max(0, Math.floor((1 - share) * colors.length - 1e-4)));
    out.copy(band.set(colors[index] ?? colors[0] ?? '#ffffff'));
  });
  // Flat-colour each band: every triangle takes the colour at its centre.
  const position = geometry.getAttribute('position');
  const tint = geometry.getAttribute('color');
  for (let i = 0; i < position.count; i += 3) {
    const cx = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
    const cy = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
    const share = (Math.hypot(cx, cy) - (radius - width)) / width;
    const index = Math.min(colors.length - 1, Math.max(0, Math.floor((1 - share) * colors.length)));
    band.set(colors[index] ?? colors[0] ?? '#ffffff');
    for (let k = 0; k < 3; k++) tint.setXYZ(i + k, band.r, band.g, band.b);
  }
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, opacity }));
  const t = radians(turn);
  const distance = VALLEY.BACKDROP_RADIUS + 6;
  mesh.position.set(Math.sin(t) * distance, -sink, -Math.cos(t) * distance);
  mesh.rotation.y = -t;
  return mesh;
}

export interface Backdrop {
  root: Group;
  /** Every material and the opacity it has in full daylight, for fading in from night. */
  materials: { material: Material; opacity: number }[];
  /** Call every frame with the seconds since the last one. */
  update(delta: number): void;
}

export function makeBackdrop(): Backdrop {
  const root = new Group();
  const drifting = clouds();
  // Back to front: dome, sun, rainbow, far ridge, clouds, nearer ridges.
  const layers: Object3D[] = [dome(), sun(), rainbow(), ridge(0), drifting, ridge(1), ridge(2)];
  const materials: Backdrop['materials'] = [];
  layers.forEach((layer, order) => {
    root.add(layer);
    layer.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.renderOrder = -layers.length + order;
      mesh.frustumCulled = false;
      const material = mesh.material as Material & { fog?: boolean };
      material.fog = false;
      material.depthWrite = false;
      materials.push({ material, opacity: material.opacity });
      material.transparent = true;
    });
  });
  return {
    root,
    materials,
    update(delta) {
      drifting.rotation.y += radians(VALLEY.CLOUD_DRIFT) * delta;
    },
  };
}
