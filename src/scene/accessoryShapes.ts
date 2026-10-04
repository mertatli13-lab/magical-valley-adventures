import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ACCESSORY_LOOKS, ACCESSORY_MOTION, DEFAULT_FIT, type AccessoryFit } from '../config';

/**
 * Accessories built in code. Each is drawn around its attach point with y up,
 * -z toward the hero's face and +z behind the hero, and sized from the body's
 * fit, so the same accessory suits the grey-box capsule and a slim plush model.
 * Parts are merged per accessory (colour is stored per vertex), so an accessory
 * costs one draw call, plus one per moving part.
 */

type Vec3 = readonly [number, number, number];
const FULL_TURN = Math.PI * 2;
const SMOOTH = 16;
const COARSE = 8;

interface Placement {
  at?: Vec3;
  turn?: Vec3;
  scale?: Vec3 | number;
}

/** Collects coloured parts and merges them into one mesh. */
class Parts {
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
    this.tint.set(color);
    const count = part.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) this.tint.toArray(colors, i * 3);
    part.setAttribute('color', new BufferAttribute(colors, 3));
    part.deleteAttribute('uv');
    this.geometries.push(part);
    return this;
  }

  /** One mesh for all parts added so far. `glow` makes it shine softly in that colour. */
  mesh({ glow, glowStrength = 0, sheet = false }: { glow?: string; glowStrength?: number; sheet?: boolean } = {}): Mesh {
    const geometry = mergeGeometries(this.geometries) ?? new BufferGeometry();
    geometry.computeVertexNormals();
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: ACCESSORY_MOTION.ROUGHNESS });
    if (sheet) material.side = DoubleSide; // capes and wings are thin sheets seen from both sides
    if (glow) {
      material.emissive.set(glow);
      material.emissiveIntensity = glowStrength;
    }
    return new Mesh(geometry, material);
  }
}

const ball = (radius: number, detail = SMOOTH) => new SphereGeometry(radius, detail, Math.ceil(detail * 0.75));

/** A flat star with `points` points, extruded to `depth`, centred on its origin and facing along z. */
function starGeometry(outer: number, inner: number, depth: number, points = 5): BufferGeometry {
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

/** A four-pointed twinkle about 1 unit across: a tall thin diamond crossed with a wide one. */
export function twinkleGeometry(): BufferGeometry {
  const tall = new OctahedronGeometry(0.5).scale(0.3, 1, 0.3);
  const wide = new OctahedronGeometry(0.5).scale(1, 0.3, 0.3);
  const merged = mergeGeometries([tall, wide]) ?? tall;
  merged.computeVertexNormals();
  return merged;
}

type Animate = (time: number, rush: number) => void;

/** Lets an accessory move: `animate` is called every frame by whoever wears it. */
function onFrame(object: Object3D, animate: Animate): void {
  (object.userData as { animate?: Animate }).animate = animate;
}

/**
 * Moves an accessory's cape, wings, tails or sparkles. `time` is in seconds;
 * `rush` is 0 standing still and 1 running, and lifts capes and scarf tails.
 */
export function animateAccessory(object: Object3D | null, time: number, rush = 0): void {
  (object?.userData as { animate?: Animate } | undefined)?.animate?.(time, rush);
}

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

function bow(group: Group, fit: AccessoryFit): void {
  const look = ACCESSORY_LOOKS.bow;
  const r = fit.head;
  const parts = new Parts();
  for (const side of [-1, 1]) {
    parts.add(ball(1), look.main, { at: [side * 0.5 * r, 0.26 * r, 0.12 * r], turn: [0, 0, side * 0.3], scale: [0.46 * r, 0.32 * r, 0.2 * r] });
    parts.add(ball(1), look.dark, { at: [side * 0.24 * r, -0.02 * r, 0.3 * r], turn: [0.5, 0, side * -0.35], scale: [0.14 * r, 0.34 * r, 0.08 * r] });
  }
  parts.add(ball(0.2 * r), look.dark, { at: [0, 0.22 * r, 0.12 * r] });
  group.add(parts.mesh());
}

function flowerCrown(group: Group, fit: AccessoryFit): void {
  const look = ACCESSORY_LOOKS['flower-crown'];
  const r = fit.head;
  const ring = 0.86 * r;
  const y = -0.42 * r;
  const parts = new Parts();
  parts.add(new TorusGeometry(ring, 0.06 * r, COARSE, SMOOTH * 2), look.vine, { at: [0, y, 0], turn: [Math.PI / 2, 0, 0] });
  const flowers = 8;
  for (let i = 0; i < flowers; i++) {
    const angle = (i / flowers) * FULL_TURN;
    const x = Math.sin(angle) * ring;
    const z = Math.cos(angle) * ring;
    const size = (i % 2 === 0 ? 0.2 : 0.15) * r;
    const petal = look.petals[i % look.petals.length] ?? look.petals[0];
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * FULL_TURN;
      // Petals lie in the plane facing outward from the head.
      const up = Math.cos(a) * size * 0.75;
      const along = Math.sin(a) * size * 0.75;
      parts.add(ball(size * 0.55, COARSE), petal, {
        at: [x * 1.06 + Math.cos(angle) * along, y + 0.06 * r + up, z * 1.06 - Math.sin(angle) * along],
        scale: [1, 1, 1],
      });
    }
    parts.add(ball(size * 0.45, COARSE), look.centre, { at: [x * 1.16, y + 0.06 * r, z * 1.16] });
  }
  group.add(parts.mesh());
}

function starGlasses(group: Group, fit: AccessoryFit): void {
  const look = ACCESSORY_LOOKS['star-glasses'];
  const r = fit.head;
  const lens = 0.42 * r;
  const front = -(fit.face + 0.04 * r);
  const y = -fit.eyes;
  const parts = new Parts();
  for (const side of [-1, 1]) {
    parts.add(starGeometry(lens, lens * 0.52, 0.07 * r), look.frame, { at: [side * 0.47 * r, y, front] });
    parts.add(starGeometry(lens * 0.68, lens * 0.36, 0.09 * r), look.lens, { at: [side * 0.47 * r, y, front] });
    // The arm runs back along the side of the head to behind the ear.
    const length = fit.face + 0.25 * r;
    parts.add(new RoundedBoxGeometry(0.06 * r, 0.06 * r, length, 2, 0.02 * r), look.frame, { at: [side * 0.98 * r, y, front + length / 2] });
    parts.add(new RoundedBoxGeometry(0.2 * r, 0.06 * r, 0.06 * r, 2, 0.02 * r), look.frame, { at: [side * 0.88 * r, y, front] });
  }
  parts.add(new RoundedBoxGeometry(0.22 * r, 0.07 * r, 0.06 * r, 2, 0.02 * r), look.frame, { at: [0, y, front] });
  group.add(parts.mesh());
}

function wizardHat(group: Group, fit: AccessoryFit): void {
  const look = ACCESSORY_LOOKS['wizard-hat'];
  const r = fit.head;
  // Side profile, from the brim's edge up to the tip.
  const profile: [number, number][] = [
    [1.6, 0], [1.55, 0.06], [0.95, 0.12], [0.84, 0.2], [0.7, 0.65], [0.5, 1.15], [0.3, 1.6], [0.12, 1.95], [0, 2.1],
  ];
  const cone = new LatheGeometry(profile.map(([x, y]) => new Vector2(x * r, y * r)), SMOOTH * 2);
  // The tip droops backward, as a wizard's hat should.
  const position = cone.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const above = Math.max(0, position.getY(i) / r - 0.9);
    position.setZ(i, position.getZ(i) + above * above * 0.45 * r);
    position.setY(i, position.getY(i) - above * above * 0.12 * r);
  }
  const base = -0.3 * r;
  const parts = new Parts();
  parts.add(cone, look.main, { at: [0, base, 0] });
  parts.add(new TorusGeometry(0.86 * r, 0.07 * r, COARSE, SMOOTH * 2), look.band, { at: [0, base + 0.22 * r, 0], turn: [Math.PI / 2, 0, 0] });
  const stars: Vec3[] = [[0.2, 0.75, 2.4], [-0.5, 1.1, 3.6], [0.35, 1.35, 4.6], [-0.1, 0.5, 5.4], [0.3, 0.95, 0.9]];
  for (const [, height, angle] of stars) {
    const radius = (0.72 - (height - 0.5) * 0.36) * r;
    const lean = Math.max(0, height - 0.9) ** 2 * 0.45 * r;
    parts.add(starGeometry(0.15 * r, 0.07 * r, 0.04 * r), look.stars, {
      at: [Math.sin(angle) * radius, base + height * r, Math.cos(angle) * radius + lean],
      turn: [0, angle, 0],
    });
  }
  group.add(parts.mesh());
}

function partyHat(group: Group, fit: AccessoryFit): void {
  const look = ACCESSORY_LOOKS['party-hat'];
  const r = fit.head;
  const height = 1.5 * r;
  const radius = 0.6 * r;
  const bands = 5;
  const hat = new Parts();
  for (let i = 0; i < bands; i++) {
    const bottom = radius * (1 - i / bands);
    const top = radius * (1 - (i + 1) / bands);
    hat.add(new CylinderGeometry(top, bottom, height / bands, SMOOTH * 2, 1, true), look.bands[i % look.bands.length] ?? look.trim, {
      at: [0, (i + 0.5) * (height / bands), 0],
    });
  }
  hat.add(ball(0.17 * r), look.trim, { at: [0, height, 0] });
  const frills = 12;
  for (let i = 0; i < frills; i++) {
    const angle = (i / frills) * FULL_TURN;
    hat.add(ball(0.1 * r, COARSE), look.trim, { at: [Math.sin(angle) * radius, 0, Math.cos(angle) * radius] });
  }
  const mesh = hat.mesh();
  // Worn jauntily: a little to one side and tipped back.
  mesh.position.set(0.12 * r, -0.14 * r, 0.05 * r);
  mesh.rotation.set(0.16, 0, -0.2);
  group.add(mesh);
}

// ---------------------------------------------------------------------------
// Neck
// ---------------------------------------------------------------------------

function scarf(group: Group, fit: AccessoryFit): void {
  const look = ACCESSORY_LOOKS.scarf;
  const tube = 0.03 + 0.12 * fit.neck;
  const ring = fit.neck + tube * 0.6;
  const loop = new Parts();
  // The loop is striped: short arcs in alternating colours.
  const arcs = 10;
  for (let i = 0; i < arcs; i++) {
    loop.add(new TorusGeometry(ring, tube, COARSE, 6, FULL_TURN / arcs + 0.02), i % 2 === 0 ? look.main : look.stripe, {
      turn: [Math.PI / 2, 0, (i / arcs) * FULL_TURN],
    });
  }
  const knot: Vec3 = [ring * 0.6, -tube * 0.3, ring * 0.85];
  loop.add(ball(tube * 1.35), look.main, { at: knot });
  group.add(loop.mesh());

  // Two tails streaming out behind from the knot.
  const length = 0.22 + 0.6 * fit.neck;
  const tails = [-1, 1].map((side, index) => {
    const tail = new Parts();
    const segments = 4;
    for (let i = 0; i < segments; i++) {
      tail.add(new RoundedBoxGeometry(tube * 1.9, length / segments + 0.004, tube * 0.6, 2, tube * 0.2), i % 2 === 0 ? look.main : look.stripe, {
        at: [0, -(i + 0.5) * (length / segments), 0],
      });
    }
    const pivot = new Group();
    pivot.position.set(knot[0] + side * tube * 0.5, knot[1], knot[2]);
    pivot.rotation.z = side * 0.18;
    pivot.add(tail.mesh());
    group.add(pivot);
    return { pivot, phase: index * 1.3 };
  });
  onFrame(group, (time, rush) => {
    const lift = ACCESSORY_MOTION.SCARF_REST + (ACCESSORY_MOTION.SCARF_LIFT - ACCESSORY_MOTION.SCARF_REST) * rush;
    const wave = ACCESSORY_MOTION.SCARF_WAVE * (ACCESSORY_MOTION.CALM + (1 - ACCESSORY_MOTION.CALM) * rush);
    for (const { pivot, phase } of tails) {
      // Negative x rotation swings the hanging tail out behind (+z).
      pivot.rotation.x = -(lift + Math.sin(time * ACCESSORY_MOTION.SCARF_RATE * FULL_TURN + phase) * wave);
    }
  });
}

// ---------------------------------------------------------------------------
// Back
// ---------------------------------------------------------------------------

function cape(group: Group, fit: AccessoryFit): void {
  const look = ACCESSORY_LOOKS.cape;
  const half = fit.shoulders * 1.05;
  const length = 0.7 * fit.body + 0.12;
  const columns = 14;
  const rows = 10;
  const positions: number[] = [];
  const colors: number[] = [];
  const main = new Color(look.main);
  const trim = new Color(look.trim);
  const point = (u: number, v: number): Vec3 => {
    // u: -1 to 1 across, v: 0 at the shoulders to 1 at the hem. The cape widens toward the hem,
    // wraps a little around the shoulders and ripples along the hem.
    const width = half * (1 + 0.55 * v);
    const wrap = (1 - Math.cos(u * 1.2)) * half * 0.55 * (1 - 0.6 * v);
    const ripple = Math.sin(u * 7) * 0.025 * v;
    return [Math.sin(u * 1.2) * width, -v * length, 0.02 - wrap + ripple];
  };
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const u0 = (column / columns) * 2 - 1;
      const u1 = ((column + 1) / columns) * 2 - 1;
      const v0 = row / rows;
      const v1 = (row + 1) / rows;
      const quad = [point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v0), point(u1, v1), point(u0, v1)];
      const edge = row === rows - 1 || column === 0 || column === columns - 1;
      for (const corner of quad) {
        positions.push(...corner);
        (edge ? trim : main).toArray(colors, colors.length);
      }
    }
  }
  const sheet = new BufferGeometry();
  sheet.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  sheet.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  sheet.computeVertexNormals();
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: ACCESSORY_MOTION.ROUGHNESS, side: DoubleSide });
  const pivot = new Group();
  const rise = 0.1 * fit.body + 0.04;
  pivot.position.set(0, rise, 0);
  pivot.add(new Mesh(sheet, material));
  group.add(pivot);
  // Collar: a soft roll across the shoulders with a golden clasp at each end.
  const collar = new Parts();
  collar.add(new TorusGeometry(half * 0.95, 0.035 + 0.02 * fit.body, COARSE, SMOOTH, Math.PI), look.main, {
    at: [0, rise, -half * 0.55],
    turn: [Math.PI / 2, 0, 0],
  });
  for (const side of [-1, 1]) collar.add(ball(0.04 + 0.02 * fit.body), look.trim, { at: [side * half * 0.95, rise, -half * 0.55] });
  group.add(collar.mesh());
  onFrame(group, (time, rush) => {
    const lift = ACCESSORY_MOTION.CAPE_REST + (ACCESSORY_MOTION.CAPE_LIFT - ACCESSORY_MOTION.CAPE_REST) * rush;
    const flutter = ACCESSORY_MOTION.CAPE_FLUTTER * (ACCESSORY_MOTION.CALM + (1 - ACCESSORY_MOTION.CALM) * rush);
    pivot.rotation.x = -(lift + Math.sin(time * ACCESSORY_MOTION.CAPE_RATE * FULL_TURN) * flutter);
  });
}

function backpack(group: Group, fit: AccessoryFit): void {
  const look = ACCESSORY_LOOKS.backpack;
  const s = fit.body;
  const width = 0.42 * s;
  const height = 0.46 * s;
  const depth = 0.22 * s;
  const parts = new Parts();
  parts.add(new RoundedBoxGeometry(width, height, depth, 4, 0.07 * s), look.main, { at: [0, 0, depth / 2] });
  parts.add(new RoundedBoxGeometry(width * 0.72, height * 0.42, 0.08 * s, 3, 0.035 * s), look.pocket, { at: [0, -height * 0.2, depth + 0.02 * s] });
  // The flap: half a drum lying across the top.
  parts.add(new CylinderGeometry(depth * 0.56, depth * 0.56, width * 1.02, SMOOTH, 1, false, 0, Math.PI), look.flap, {
    at: [0, height * 0.32, depth / 2],
    turn: [0, 0, Math.PI / 2],
  });
  parts.add(starGeometry(0.06 * s, 0.028 * s, 0.02 * s), look.charm, { at: [0, -height * 0.2, depth + 0.07 * s] });
  for (const side of [-1, 1]) {
    // Shoulder straps loop from the top of the pack over the shoulder.
    parts.add(new TorusGeometry(0.16 * s, 0.028 * s, COARSE, SMOOTH, Math.PI), look.straps, {
      at: [side * width * 0.3, height * 0.12, 0],
      turn: [0, Math.PI / 2, Math.PI / 2],
      scale: [1, 1.25, 1],
    });
  }
  parts.add(new TorusGeometry(0.05 * s, 0.018 * s, COARSE, SMOOTH), look.straps, { at: [0, height * 0.56, depth / 2], turn: [0, Math.PI / 2, 0] });
  group.add(parts.mesh());
}

function glowingWings(group: Group, fit: AccessoryFit): void {
  const look = ACCESSORY_LOOKS['glowing-wings'];
  const s = 0.35 + 0.55 * fit.body;
  // One wing's outline: a tall upper lobe and a smaller lower one, hinged at the origin.
  const outline = new Shape();
  outline.moveTo(0, 0.02);
  outline.bezierCurveTo(0.1, 0.5, 0.55, 0.78, 0.82, 0.6);
  outline.bezierCurveTo(1.0, 0.45, 0.8, 0.12, 0.42, 0.02);
  outline.bezierCurveTo(0.72, -0.05, 0.75, -0.42, 0.5, -0.5);
  outline.bezierCurveTo(0.3, -0.56, 0.08, -0.3, 0, -0.06);
  outline.closePath();
  const main = new Color(look.main);
  const tip = new Color(look.tip);
  const blend = new Color();
  const wings = [-1, 1].map((side) => {
    const geometry = new ShapeGeometry(outline, 10).scale(side * s, s, s);
    const position = geometry.getAttribute('position');
    const colors = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      blend.copy(main).lerp(tip, Math.min(1, Math.abs(position.getX(i)) / (0.8 * s)));
      blend.toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    const material = new MeshStandardMaterial({
      vertexColors: true,
      side: DoubleSide,
      transparent: true,
      opacity: 0.9,
      emissive: look.glow,
      emissiveIntensity: ACCESSORY_MOTION.WING_GLOW,
      roughness: 0.4,
    });
    const pivot = new Group();
    pivot.position.set(side * 0.03 * s, 0.08 * s, 0.03);
    pivot.add(new Mesh(geometry, material));
    group.add(pivot);
    return { pivot, side };
  });
  onFrame(group, (time) => {
    const sweep = ACCESSORY_MOTION.WING_REST + Math.sin(time * ACCESSORY_MOTION.WING_RATE * FULL_TURN) * ACCESSORY_MOTION.WING_FLAP;
    // A positive turn about y swings the right wing's tip toward -z, so sweep back with the opposite sign.
    for (const { pivot, side } of wings) pivot.rotation.y = -side * sweep;
  });
}

function sparkles(group: Group, fit: AccessoryFit): void {
  const look = ACCESSORY_LOOKS['sparkle-trail'];
  const s = 0.4 + 0.6 * fit.body;
  const spots: Vec3[] = [[-0.2, 0.18, 0.16], [0.18, 0.02, 0.26], [-0.05, -0.2, 0.36], [0.24, 0.3, 0.42]];
  const twinkles = spots.map(([x, y, z], index) => {
    const parts = new Parts();
    // A four-pointed twinkle: a stretched octahedron crossed with a flat one.
    parts.add(new OctahedronGeometry(1), look.main, { scale: [0.3, 1, 0.3] });
    parts.add(new OctahedronGeometry(1), look.main, { scale: [1, 0.3, 0.3] });
    const mesh = parts.mesh({ glow: look.main, glowStrength: ACCESSORY_MOTION.SPARKLE_GLOW });
    mesh.position.set(x * s, y * s, z * s);
    group.add(mesh);
    return { mesh, size: (0.09 - index * 0.012) * s, phase: index * 1.7 };
  });
  const twinkle = (time: number) => {
    for (const { mesh, size, phase } of twinkles) {
      const pulse = 1 - ACCESSORY_MOTION.SPARKLE_SHRINK * (0.5 + 0.5 * Math.sin(time * ACCESSORY_MOTION.SPARKLE_RATE * FULL_TURN + phase));
      mesh.scale.setScalar(size * pulse);
      mesh.rotation.z = time + phase;
    }
  };
  twinkle(0);
  onFrame(group, twinkle);
}

const BUILDERS: Readonly<Record<string, (group: Group, fit: AccessoryFit) => void>> = {
  bow,
  scarf,
  'flower-crown': flowerCrown,
  'star-glasses': starGlasses,
  cape,
  'wizard-hat': wizardHat,
  backpack,
  'party-hat': partyHat,
  'sparkle-trail': sparkles,
  'glowing-wings': glowingWings,
};

/** Builds an accessory to fit a body. Returns an empty group for an unknown id. */
export function makeAccessory(id: string, fit: AccessoryFit = DEFAULT_FIT): Group {
  const group = new Group();
  BUILDERS[id]?.(group, fit);
  animateAccessory(group, 0, 0);
  return group;
}
