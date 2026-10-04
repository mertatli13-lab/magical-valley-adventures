import { CatmullRomCurve3, ConeGeometry, CylinderGeometry, RingGeometry, TorusGeometry, TubeGeometry, Vector3, type Mesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BARRIER_LOOKS, OBSTACLES } from '../config';
import type { BarrierType } from '../game/barriers';
import { ball, bandColor, COARSE, FULL_TURN, paintFaces, Parts, SMOOTH, starGeometry, type Vec3 } from './parts';

/**
 * Barriers built in code, each one merged mesh standing on its origin at the
 * bottom centre and filling the box its hitbox uses: low ones squat (jump),
 * high ones floating with clear space underneath (slide), tall ones towering
 * (go round). Sizes come from OBSTACLES, so the look always matches the rules.
 */

const L = BARRIER_LOOKS;
const HALF = OBSTACLES.HALF_WIDTH;
const LOW = OBSTACLES.LOW_HEIGHT;
const DEPTH = OBSTACLES.DEPTH;
const CLEAR = OBSTACLES.HIGH_CLEARANCE;
const TALL = OBSTACLES.TALL_HEIGHT;
const sweet = (index: number) => L.SWEETS[index % L.SWEETS.length] ?? L.SWEETS[0];

/** A wrapped sweet: a plump middle with a twist of wrapper at each end. */
function wrappedSweet(parts: Parts, at: Vec3, turn: Vec3, size: number, color: string): void {
  const [x, y, z] = at;
  const spin = Math.cos(turn[1]);
  const slide = Math.sin(turn[1]);
  parts.add(ball(size, 10).scale(1.35, 1, 1), color, { at, turn });
  for (const side of [-1, 1]) {
    parts.add(new ConeGeometry(size * 0.7, size * 0.8, COARSE).rotateZ((side * Math.PI) / 2), L.WHITE, {
      at: [x + side * spin * size * 1.65, y, z - side * slide * size * 1.65],
      turn,
    });
  }
}

function candyPile(): Mesh {
  const parts = new Parts();
  const size = LOW * 0.27;
  const heap: [Vec3, number][] = [
    [[-HALF * 0.62, size, 0.05], 0.3],
    [[-HALF * 0.1, size, -0.08], -0.5],
    [[HALF * 0.52, size, 0.06], 0.9],
    [[-HALF * 0.34, size * 2.55, 0], 1.3],
    [[HALF * 0.22, size * 2.5, -0.02], 0.1],
  ];
  heap.forEach(([at, turn], i) => wrappedSweet(parts, at, [0, turn, 0], size, sweet(i)));
  return parts.mesh();
}

/** A fluted paper case, frosting piled on top and a cherry. */
function cupcake(parts: Parts, x: number, width: number, height: number, frosting: number): void {
  const caseHeight = height * 0.42;
  const top = width / 2;
  const fluted = paintFaces(new CylinderGeometry(top, top * 0.72, caseHeight, 16, 1), (px, _y, pz, out) => {
    bandColor(L.WRAPPER, (Math.atan2(pz, px) / FULL_TURN) * 16, out);
  });
  parts.add(fluted, L.WRAPPER[0], { at: [x, caseHeight / 2, 0] });
  const swirl: [number, number][] = [[1.08, 0.5], [0.8, 0.72], [0.5, 0.88]];
  swirl.forEach(([radius, y], i) => {
    parts.add(ball(top * radius, 10).scale(1, 0.5, 1), L.FROSTING[(i + frosting) % L.FROSTING.length] ?? L.FROSTING[0], { at: [x, height * y, 0] });
  });
  parts.add(ball(top * 0.26, 6), L.CHERRY, { at: [x, height * 0.97 - top * 0.1, 0] });
}

function cupcakes(): Mesh {
  const parts = new Parts();
  const width = (HALF * 2) / 3;
  [-1, 0, 1].forEach((slot, i) => cupcake(parts, slot * width, Math.min(width * 0.98, DEPTH), LOW * (slot === 0 ? 1 : 0.9), i));
  return parts.mesh();
}

function macaronStack(): Mesh {
  const parts = new Parts();
  const radius = Math.min(HALF * 0.33, DEPTH / 2);
  const stacks: [number, number][] = [[-HALF * 0.66, 2], [0, 3], [HALF * 0.66, 2]];
  let color = 0;
  for (const [x, count] of stacks) {
    const each = LOW / 3;
    for (let i = 0; i < count; i++) {
      const y = i * each;
      const shell = sweet(color++);
      parts.add(ball(radius, COARSE).scale(1, (each * 0.36) / radius, 1), shell, { at: [x, y + each * 0.28, 0] });
      parts.add(new CylinderGeometry(radius * 0.9, radius * 0.9, each * 0.2, 12), L.CREAM, { at: [x, y + each * 0.5, 0] });
      parts.add(ball(radius, COARSE).scale(1, (each * 0.36) / radius, 1), shell, { at: [x, y + each * 0.72, 0] });
    }
  }
  return parts.mesh();
}

/** A fat striped candy log lying across the lane, with a swirl on each end. */
function lollipopLog(): Mesh {
  const radius = Math.min(LOW, DEPTH) / 2;
  const length = HALF * 2 - 0.1;
  const body = paintFaces(new CylinderGeometry(radius, radius, length, SMOOTH, 9, true).rotateZ(Math.PI / 2), (x, _y, _z, out) => {
    bandColor(L.LOG, (x / length + 0.5) * 9, out);
  });
  const parts = new Parts().add(body, L.WHITE, { at: [0, radius, 0] });
  for (const side of [-1, 1]) {
    const end = paintFaces(new RingGeometry(0, radius, SMOOTH, 3), (x, y, _z, out) => {
      bandColor(L.LOG, (Math.atan2(y, x) / FULL_TURN + Math.hypot(x, y) / radius) * 4, out);
    });
    parts.add(end, L.WHITE, { at: [(side * length) / 2, radius, 0], turn: [0, (side * Math.PI) / 2, 0] });
  }
  return parts.mesh();
}

/** A row of soft puffs floating above the clear space, wide enough for `halfWidth`. */
function cloudBar(halfWidth: number): Mesh {
  const parts = new Parts();
  const puff = 0.4;
  const count = Math.max(3, Math.round((halfWidth * 2) / (puff * 1.15)));
  for (let i = 0; i < count; i++) {
    const x = -halfWidth + puff + (i / (count - 1)) * (halfWidth - puff) * 2;
    const radius = puff * (i % 2 === 0 ? 1 : 0.82);
    parts.add(ball(radius, 10), L.CLOUD[i % L.CLOUD.length] ?? L.WHITE, { at: [x, CLEAR + puff + (i % 2 === 0 ? 0 : 0.12), i % 2 === 0 ? 0 : 0.08] });
    if (i % 2 === 0) parts.add(ball(radius * 0.62, COARSE), L.CLOUD[2], { at: [x + puff * 0.3, CLEAR + puff * 1.75, -0.05] });
  }
  return parts.mesh();
}

/** Half a giant donut standing across the lane: the hole is only as high as the clear space. */
function donutArch(): Mesh {
  const tube = 0.2;
  const ring = HALF - tube;
  const stretch = (CLEAR + tube) / ring;
  const parts = new Parts();
  parts.add(new TorusGeometry(ring, tube, 10, SMOOTH * 2, Math.PI).scale(1, stretch, 1.5), L.DONUT);
  // Icing over the top half of the arch, a little fatter than the dough, and sprinkles.
  parts.add(new TorusGeometry(ring, tube * 1.08, 10, SMOOTH * 2, Math.PI * 0.72).rotateZ(Math.PI * 0.14).scale(1, stretch, 1.62), L.DONUT_ICING, { at: [0, 0.03, 0] });
  for (let i = 0; i < 12; i++) {
    const angle = Math.PI * (0.2 + (i / 11) * 0.6);
    const face = i % 2 === 0 ? 1 : -1;
    parts.add(new CylinderGeometry(0.035, 0.035, 0.16, 5), sweet(i), {
      at: [Math.cos(angle) * ring, Math.sin(angle) * ring * stretch + 0.05, face * tube * 1.72],
      turn: [Math.PI / 2, 0, i * 1.3],
    });
  }
  return parts.mesh();
}

/** Two candy-cane poles holding a banner across the lane, above the clear space. */
function banner(): Mesh {
  const parts = new Parts();
  const top = CLEAR + 0.75;
  for (const side of [-1, 1]) {
    const x = side * (HALF - 0.09);
    const pole = paintFaces(new CylinderGeometry(0.075, 0.075, top + 0.15, COARSE, 10), (_x, y, _z, out) => {
      bandColor(L.POLE, (y / (top + 0.15) + 0.5) * 10, out);
    });
    parts.add(pole, L.WHITE, { at: [x, (top + 0.15) / 2, 0] });
    parts.add(ball(0.13, COARSE), L.BANNER_TRIM, { at: [x, top + 0.25, 0] });
  }
  const width = HALF * 2 - 0.3;
  parts.add(new RoundedBoxGeometry(width, 0.42, 0.1, 2, 0.05), L.BANNER, { at: [0, CLEAR + 0.42, 0] });
  // A scalloped lower edge of candy floss, and stars on both faces.
  const scallops = 6;
  for (let i = 0; i < scallops; i++) {
    parts.add(ball(width / scallops / 2, COARSE).scale(1, 0.8, 0.6), L.WHITE, { at: [-width / 2 + ((i + 0.5) * width) / scallops, CLEAR + 0.17, 0] });
  }
  for (const face of [-1, 1]) {
    for (const x of [-0.42, 0, 0.42]) parts.add(starGeometry(0.11, 0.05, 0.03), L.BANNER_TRIM, { at: [x, CLEAR + 0.45, face * 0.06] });
  }
  return parts.mesh();
}

function layerCake(): Mesh {
  const parts = new Parts();
  const tiers: [number, number][] = [[HALF * 0.98, 0.36], [HALF * 0.74, 0.31], [HALF * 0.5, 0.25]];
  let y = 0.06;
  parts.add(new CylinderGeometry(HALF, HALF, 0.06, 20), L.PLATE, { at: [0, 0.03, 0] });
  tiers.forEach(([radius, share], i) => {
    const height = TALL * share;
    parts.add(new CylinderGeometry(radius, radius, height, 20), L.CAKE[i % L.CAKE.length] ?? L.CAKE[0], { at: [0, y + height / 2, 0] });
    // Icing round the top edge, with drips.
    parts.add(new TorusGeometry(radius * 0.96, 0.09, 6, 20), L.WHITE, { at: [0, y + height, 0], turn: [Math.PI / 2, 0, 0] });
    const drips = 8 + i * -2;
    for (let d = 0; d < drips; d++) {
      const angle = (d / drips) * FULL_TURN + i;
      parts.add(ball(0.09, 5).scale(1, 1.8 + (d % 3) * 0.5, 1), L.WHITE, { at: [Math.sin(angle) * radius, y + height - 0.12, Math.cos(angle) * radius] });
    }
    y += height;
  });
  parts.add(ball(0.2, 10), L.CHERRY, { at: [0, y + 0.14, 0] });
  return parts.mesh();
}

function jellyTower(): Mesh {
  const parts = new Parts();
  parts.add(new CylinderGeometry(HALF, HALF, 0.06, 20), L.PLATE, { at: [0, 0.03, 0] });
  // Three wobbly domes, each a tall half-ball sitting on the one below.
  const domes: [number, number][] = [[HALF * 0.95, 1.25], [HALF * 0.72, 1.0], [HALF * 0.48, 0.6]];
  let y = 0.06;
  domes.forEach(([radius, height], i) => {
    parts.add(ball(radius, 14).scale(1, height / radius, 1), L.JELLY[i % L.JELLY.length] ?? L.JELLY[0], { at: [0, y, 0] });
    y += height * 0.86;
  });
  parts.add(ball(0.16, COARSE), L.CHERRY, { at: [0, TALL - 0.14, 0] });
  // A curl of cream round the base of each upper dome.
  const curl = new TubeGeometry(
    new CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => new Vector3(Math.sin((i / 12) * FULL_TURN), Math.sin(i * 1.5) * 0.04, Math.cos((i / 12) * FULL_TURN))), true),
    24,
    0.07,
    5,
    true,
  );
  parts.add(curl.clone(), L.WHITE, { at: [0, 0.06 + 1.25 * 0.86, 0], scale: [HALF * 0.74, 1, HALF * 0.74] });
  parts.add(curl, L.WHITE, { at: [0, 0.06 + (1.25 + 1.0) * 0.86, 0], scale: [HALF * 0.5, 1, HALF * 0.5] });
  return parts.mesh();
}

/** The barriers built in code, by type; each barrier uses one of its type's shapes. */
export function makeBarriers(): Record<BarrierType, Mesh[]> {
  return {
    L: [candyPile(), cupcakes(), macaronStack(), lollipopLog()],
    H: [cloudBar(HALF), donutArch(), banner()],
    T: [layerCake(), jellyTower()],
  };
}

/** The three-lane cloud bar for full rows. */
export const makeWideCloudBar = () => cloudBar(OBSTACLES.WIDE_HALF_WIDTH);
