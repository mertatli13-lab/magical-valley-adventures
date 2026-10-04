import {
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  RingGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Mesh,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { VALLEY } from '../config';
import { ball, bandColor, COARSE, FULL_TURN, paintFaces, Parts, starGeometry, type Vec3 } from './parts';

/**
 * Magical Valley scenery built in code. Every piece stands on its origin
 * (y up) and is one merged mesh, so each kind costs one instanced draw call.
 */

export type SceneryKind = keyof typeof VALLEY.SCENERY;
const C = VALLEY.COLORS;
/** Detail for dots, berries and petals: just enough to read as round from the path. */
const TINY = 4;

const trunk = (parts: Parts, height: number, radius = 0.17) =>
  parts.add(new CylinderGeometry(radius * 0.8, radius * 1.3, height, COARSE), C.TRUNK, { at: [0, height / 2, 0] });

function bubbleTree(): Mesh {
  const parts = new Parts();
  trunk(parts, 1.6);
  const puffs: [Vec3, number, number][] = [
    [[0, 2.35, 0], 1.0, 0],
    [[0.75, 2.05, 0.2], 0.68, 2],
    [[-0.65, 2.1, -0.3], 0.7, 2],
    [[-0.15, 2.0, 0.72], 0.6, 0],
    [[0.1, 3.0, 0.05], 0.66, 1],
    [[0.35, 2.6, -0.55], 0.55, 1],
  ];
  for (const [at, radius, shade] of puffs) parts.add(ball(radius, COARSE), C.LILAC[shade] ?? C.LILAC[0], { at });
  return parts.mesh();
}

function blossomTree(): Mesh {
  const parts = new Parts();
  parts.add(new CylinderGeometry(0.14, 0.22, 1.1, COARSE), C.TRUNK, { at: [0.05, 0.55, 0], turn: [0, 0, -0.1] });
  parts.add(new CylinderGeometry(0.11, 0.14, 0.9, COARSE), C.TRUNK, { at: [0.02, 1.45, 0], turn: [0, 0, 0.14] });
  const crown: [Vec3, number, number][] = [
    [[0, 2.4, 0], 0.95, 0],
    [[0.7, 2.75, 0.1], 0.62, 1],
    [[-0.7, 2.6, 0.15], 0.66, 1],
    [[0.05, 2.25, -0.65], 0.6, 2],
  ];
  for (const [at, radius, shade] of crown) parts.add(ball(radius, COARSE), C.PINK[shade] ?? C.PINK[0], { at });
  // Blossoms dotted over the crown.
  for (let i = 0; i < 10; i++) {
    const turn = i * 2.4;
    const lift = 0.15 + ((i * 37) % 10) / 12;
    const reach = 0.98 * Math.cos(lift * 0.9);
    parts.add(ball(0.12, TINY), i % 3 === 0 ? C.YELLOW : C.WHITE, {
      at: [Math.sin(turn) * reach, 2.4 + Math.sin(lift) * 0.98, Math.cos(turn) * reach],
    });
  }
  return parts.mesh();
}

function mintTree(): Mesh {
  const parts = new Parts();
  trunk(parts, 1.1, 0.15);
  const tiers: [number, number, number, number][] = [
    [1.15, 1.5, 1.6, 2],
    [0.9, 1.3, 2.45, 0],
    [0.62, 1.15, 3.2, 1],
  ];
  for (const [radius, height, y, shade] of tiers) parts.add(new ConeGeometry(radius, height, 10), C.MINT[shade] ?? C.MINT[0], { at: [0, y, 0] });
  parts.add(starGeometry(0.26, 0.12, 0.08), C.YELLOW, { at: [0, 3.98, 0] });
  return parts.mesh();
}

/** A round lollipop head with a spiral of two colours, facing along z. */
function swirl(radius: number, thickness: number, colors: readonly string[], turns: number): BufferGeometry[] {
  const face = (side: number) =>
    paintFaces(new RingGeometry(0, radius, 20, 4), (x, y, _z, out) => {
      bandColor(colors, (Math.atan2(y, x) / FULL_TURN + (Math.hypot(x, y) / radius) * turns) * colors.length * 2, out);
    })
      .rotateY(side < 0 ? Math.PI : 0)
      .translate(0, 0, (side * thickness) / 2);
  const rim = paintFaces(new CylinderGeometry(radius, radius, thickness, 20, 1, true).rotateX(Math.PI / 2), (x, y, _z, out) => {
    bandColor(colors, (Math.atan2(y, x) / FULL_TURN + turns) * colors.length * 2, out);
  });
  return [face(1), face(-1), rim];
}

function lollipop(radius: number, stick: number, colors: readonly string[], turns: number): Mesh {
  const parts = new Parts();
  parts.add(new CylinderGeometry(0.05, 0.05, stick, 6), C.WHITE, { at: [0, stick / 2, 0] });
  for (const piece of swirl(radius, 0.2, colors, turns)) parts.add(piece, C.WHITE, { at: [0, stick + radius * 0.8, 0] });
  return parts.mesh();
}

function candyCane(): Mesh {
  const height = 1.5;
  const hook = 0.32;
  const points = [new Vector3(0, 0, 0), new Vector3(0, height * 0.6, 0), new Vector3(0, height, 0)];
  for (let i = 1; i <= 6; i++) {
    const angle = (i / 6) * Math.PI;
    points.push(new Vector3(hook - Math.cos(angle) * hook, height + Math.sin(angle) * hook, 0));
  }
  points.push(new Vector3(hook * 2, height - 0.25, 0));
  const tube = new TubeGeometry(new CatmullRomCurve3(points), 22, 0.1, 6, false).toNonIndexed();
  // Diagonal stripes: the band depends on how far along the cane and how far round it a face is.
  const uv = tube.getAttribute('uv');
  let face = 0;
  const striped = paintFaces(tube, (_x, _y, _z, out) => {
    const u = (uv.getX(face) + uv.getX(face + 1) + uv.getX(face + 2)) / 3;
    const v = (uv.getY(face) + uv.getY(face + 1) + uv.getY(face + 2)) / 3;
    face += 3;
    bandColor([C.RED, C.WHITE], u * 11 + v * 2, out);
  });
  const parts = new Parts().add(striped, C.WHITE);
  parts.add(ball(0.1, TINY), C.RED, { at: [hook * 2, height - 0.25, 0] });
  return parts.mesh();
}

function mushroom(parts: Parts, at: Vec3, size: number, cap: string, lean: number): void {
  const [x, y, z] = at;
  parts.add(new CylinderGeometry(0.13 * size, 0.2 * size, 0.55 * size, COARSE), C.STEM, { at: [x, y + 0.27 * size, z], turn: [0, 0, lean] });
  const top: Vec3 = [x - Math.sin(lean) * 0.5 * size, y + 0.5 * size, z];
  parts.add(ball(0.5 * size, COARSE).scale(1, 0.72, 1), cap, { at: top, turn: [0, 0, lean] });
  for (let i = 0; i < 6; i++) {
    const turn = i * 1.05 + 0.4;
    const out = i % 2 === 0 ? 0.3 : 0.14;
    parts.add(ball(0.085 * size, TINY).scale(1, 0.45, 1), C.WHITE, {
      at: [top[0] + Math.sin(turn) * out * size, top[1] + (0.33 - out * 0.35) * size, top[2] + Math.cos(turn) * out * size],
    });
  }
}

function spottyMushroom(): Mesh {
  const parts = new Parts();
  mushroom(parts, [0, 0, 0], 1.1, C.RED, 0);
  return parts.mesh();
}

function mushroomPair(): Mesh {
  const parts = new Parts();
  mushroom(parts, [-0.2, 0, 0], 0.85, C.LILAC[0], 0.12);
  mushroom(parts, [0.35, 0, 0.15], 0.55, C.YELLOW, -0.2);
  return parts.mesh();
}

const BLOOMS = [C.RED, C.YELLOW, C.PINK[2], C.LILAC[0], C.WHITE, C.BLUE];

function tulips(): Mesh {
  const parts = new Parts();
  const spots: Vec3[] = [[0, 0.5, 0], [0.32, 0.4, 0.12], [-0.28, 0.44, 0.2], [0.1, 0.36, -0.32], [-0.18, 0.5, -0.18], [0.36, 0.46, -0.24]];
  spots.forEach(([x, height, z], i) => {
    parts.add(new CylinderGeometry(0.018, 0.022, height, 3), C.LEAF[0], { at: [x, height / 2, z] });
    parts.add(ball(0.1, 6).scale(1, 1.35, 1), BLOOMS[i % BLOOMS.length] ?? C.RED, { at: [x, height + 0.08, z] });
    parts.add(ball(0.09, TINY).scale(0.5, 1.6, 0.25), C.LEAF[1], { at: [x + 0.06, height * 0.4, z], turn: [0, i, 0.5] });
  });
  return parts.mesh();
}

function daisies(): Mesh {
  const parts = new Parts();
  const spots: Vec3[] = [[0, 0.34, 0], [0.34, 0.26, 0.1], [-0.3, 0.3, 0.16], [0.08, 0.24, -0.3], [-0.2, 0.36, -0.22]];
  spots.forEach(([x, height, z], i) => {
    parts.add(new CylinderGeometry(0.016, 0.02, height, 3), C.LEAF[0], { at: [x, height / 2, z] });
    const petal = i % 2 === 0 ? C.WHITE : C.PINK[1];
    for (let p = 0; p < 6; p++) {
      const turn = (p / 6) * FULL_TURN;
      parts.add(ball(0.065, TINY).scale(1.3, 0.4, 0.8), petal, { at: [x + Math.sin(turn) * 0.09, height + 0.01, z + Math.cos(turn) * 0.09], turn: [0, turn + Math.PI / 2, 0] });
    }
    parts.add(ball(0.055, TINY), C.YELLOW, { at: [x, height + 0.03, z] });
  });
  return parts.mesh();
}

function berryBush(): Mesh {
  const parts = new Parts();
  parts.add(ball(0.5, COARSE).scale(1, 0.8, 1), C.LEAF[0], { at: [0, 0.35, 0] });
  parts.add(ball(0.38, COARSE).scale(1, 0.85, 1), C.LEAF[1], { at: [0.42, 0.28, 0.1] });
  parts.add(ball(0.33, COARSE).scale(1, 0.85, 1), C.LEAF[1], { at: [-0.4, 0.26, -0.08] });
  for (let i = 0; i < 7; i++) {
    const turn = i * 2.1;
    const lift = 0.25 + ((i * 13) % 7) / 14;
    parts.add(ball(0.07, TINY), C.RED, { at: [Math.sin(turn) * 0.46 * Math.cos(lift), 0.35 + Math.sin(lift) * 0.4, Math.cos(turn) * 0.46 * Math.cos(lift)] });
  }
  return parts.mesh();
}

function rocks(): Mesh {
  const parts = new Parts();
  const stones: [Vec3, Vec3, number][] = [
    [[0, 0.22, 0], [0.55, 0.36, 0.45], 0],
    [[0.5, 0.14, 0.2], [0.3, 0.22, 0.28], 1],
    [[-0.35, 0.12, -0.25], [0.24, 0.18, 0.22], 1],
  ];
  for (const [at, scale, shade] of stones) parts.add(new IcosahedronGeometry(1, 0), C.ROCK[shade] ?? C.ROCK[0], { at, scale, turn: [0.3, shade, 0.2] });
  return parts.mesh();
}

/** A cupcake cottage: a cream wrapper for walls and swirls of frosting for a roof. */
function cottage(): Mesh {
  const parts = new Parts();
  parts.add(new CylinderGeometry(1.35, 1.1, 1.6, 12), C.CREAM, { at: [0, 0.8, 0] });
  const roof: [number, number, number][] = [
    [1.6, 1.75, 0],
    [1.2, 2.45, 2],
    [0.8, 3.0, 0],
    [0.45, 3.45, 2],
  ];
  for (const [radius, y, shade] of roof) parts.add(ball(radius, 10).scale(1, 0.5, 1), C.PINK[shade] ?? C.PINK[0], { at: [0, y, 0] });
  parts.add(ball(0.24, 6), C.RED, { at: [0, 3.85, 0] });
  // A door and two windows on each of two opposite sides, so a face shows whichever way it is turned.
  for (const side of [-1, 1]) {
    parts.add(new RoundedBoxGeometry(0.5, 0.9, 0.12, 1, 0.05), C.LILAC[2], { at: [0, 0.45, side * 1.2] });
    parts.add(ball(0.05, TINY), C.YELLOW, { at: [0.14, 0.45, side * 1.28] });
    for (const x of [-0.72, 0.72]) parts.add(ball(0.2, 6).scale(1, 1, 0.3), C.BLUE, { at: [x, 1.0, side * 1.02] });
  }
  return parts.mesh();
}

function balloons(): Mesh {
  const parts = new Parts();
  const bunch: [Vec3, string][] = [
    [[0, 2.9, 0], C.RED],
    [[0.42, 2.55, 0.1], C.YELLOW],
    [[-0.4, 2.5, -0.1], C.BLUE],
    [[0.05, 2.35, 0.4], C.LILAC[0]],
  ];
  for (const [[x, y, z], color] of bunch) {
    parts.add(ball(0.34, COARSE).scale(1, 1.2, 1), color, { at: [x, y, z] });
    parts.add(new ConeGeometry(0.06, 0.1, 5), color, { at: [x, y - 0.44, z] });
    // The string runs from the knot down to where the strings meet.
    const length = Math.hypot(x, y - 0.5 - 0.6, z);
    parts.add(new CylinderGeometry(0.008, 0.008, length, 3), C.WHITE, {
      at: [x / 2, (y - 0.5 + 0.6) / 2, z / 2],
      turn: [Math.atan2(z, y - 1.1), 0, -Math.atan2(x, y - 1.1)],
    });
  }
  parts.add(new CylinderGeometry(0.008, 0.008, 0.6, 3), C.WHITE, { at: [0, 0.3, 0] });
  parts.add(new RoundedBoxGeometry(0.24, 0.16, 0.24, 1, 0.04), C.PINK[2], { at: [0, 0.08, 0] });
  return parts.mesh();
}

/** A candy lamp post: a striped pole with a glowing sweet on top. */
export function lampPost(): Mesh {
  const height = 2.3;
  const pole = paintFaces(new CylinderGeometry(0.07, 0.085, height, 6, 12), (_x, y, _z, out) => {
    bandColor([C.PINK[2], C.WHITE], (y / height + 0.5) * 12, out);
  });
  const parts = new Parts().add(pole, C.WHITE, { at: [0, height / 2, 0] });
  parts.add(new CylinderGeometry(0.14, 0.18, 0.12, COARSE), C.LILAC[2], { at: [0, 0.06, 0] });
  parts.add(ball(0.24, COARSE), C.GLOW, { at: [0, height + 0.2, 0] });
  parts.add(new ConeGeometry(0.2, 0.2, COARSE), C.LILAC[2], { at: [0, height + 0.48, 0] });
  return parts.mesh({ glow: C.GLOW, glowStrength: 0.25 });
}

const BUILDERS: Readonly<Record<SceneryKind, () => Mesh>> = {
  'bubble-tree': bubbleTree,
  'blossom-tree': blossomTree,
  'mint-tree': mintTree,
  lollipop: () => lollipop(0.55, 1.5, [C.PINK[2], C.WHITE], 1.6),
  'swirl-pop': () => lollipop(0.72, 2.0, [C.MINT[2], C.YELLOW, C.WHITE], 1.2),
  'candy-cane': candyCane,
  'spotty-mushroom': spottyMushroom,
  'mushroom-pair': mushroomPair,
  tulips,
  daisies,
  'berry-bush': berryBush,
  rocks,
  cottage,
  balloons,
};

export const SCENERY_KINDS = Object.keys(BUILDERS) as SceneryKind[];

export function makeScenery(kind: SceneryKind): Mesh {
  return BUILDERS[kind]();
}
