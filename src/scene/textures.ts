import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { BLOB_SHADOW, GROUND, LANES, VALLEY } from '../config';
import { Random } from '../game/random';

let radial: CanvasTexture | null = null;

/** A soft white dot fading to transparent: blob shadows and round particles. Built once. */
export function radialTexture(): CanvasTexture {
  if (radial) return radial;
  const size = BLOB_SHADOW.TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  radial = new CanvasTexture(canvas);
  radial.colorSpace = SRGBColorSpace;
  return radial;
}

function finish(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = VALLEY.ANISOTROPY;
  return texture;
}

/** Runs `draw` at (x, y) and at its wrapped-around copies, so shapes crossing the tile's edge stay seamless. */
function wrapped(size: number, x: number, y: number, draw: (x: number, y: number) => void): void {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) draw(x + dx, y + dy);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

/**
 * The candy path: one square tile as wide as the ground chunk, seamless along
 * the path. Paving stones in the three lanes, icing dashes between lanes, a
 * candy-stripe band beside them and biscuit shoulders with sprinkles.
 */
export function pathTexture(): CanvasTexture {
  const look = VALLEY.PATH;
  const size = look.TILE_PIXELS;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return finish(canvas);
  const metre = size / GROUND.CHUNK_WIDTH;
  const centre = size / 2;
  const random = new Random(VALLEY.SEED + 21);
  const pick = <T,>(list: readonly T[]): T => list[random.int(list.length)] as T;
  const lanesHalf = (LANES.COUNT * LANES.WIDTH) / 2;

  // Shoulders, with darker specks and sprinkles.
  context.fillStyle = look.SHOULDER_COLOR;
  context.fillRect(0, 0, size, size);
  context.fillStyle = look.SHOULDER_SPECK_COLOR;
  for (let i = 0; i < look.SPECKS; i++) {
    const radius = (0.02 + random.next() * 0.04) * metre;
    wrapped(size, random.next() * size, random.next() * size, (x, y) => {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });
  }
  context.lineCap = 'round';
  context.lineWidth = 0.07 * metre;
  for (let i = 0; i < look.SPRINKLES; i++) {
    const angle = random.next() * Math.PI;
    const half = 0.1 * metre;
    context.strokeStyle = pick(look.SPRINKLE_COLORS);
    wrapped(size, random.next() * size, random.next() * size, (x, y) => {
      context.beginPath();
      context.moveTo(x - Math.cos(angle) * half, y - Math.sin(angle) * half);
      context.lineTo(x + Math.cos(angle) * half, y + Math.sin(angle) * half);
      context.stroke();
    });
  }

  // The lanes: grout, then staggered paving stones.
  context.fillStyle = look.GROUT_COLOR;
  context.fillRect(centre - lanesHalf * metre, 0, lanesHalf * 2 * metre, size);
  const rows = Math.round(GROUND.CHUNK_WIDTH / look.STONE_LENGTH);
  const rowHeight = size / rows;
  const gap = look.STONE_GAP * metre;
  for (let lane = 0; lane < LANES.COUNT; lane++) {
    const left = centre + (lane * LANES.WIDTH - lanesHalf) * metre;
    for (let column = 0; column < 2; column++) {
      const width = (LANES.WIDTH / 2) * metre;
      // Every other column is shifted half a stone, like brickwork.
      const shift = (lane * 2 + column) % 2 === 0 ? 0 : rowHeight / 2;
      for (let row = -1; row <= rows; row++) {
        context.fillStyle = pick(look.STONE_COLORS);
        roundedRect(context, left + column * width + gap / 2, row * rowHeight + shift + gap / 2, width - gap, rowHeight - gap, look.STONE_ROUND * metre);
      }
    }
  }

  // Icing dashes between the lanes.
  context.fillStyle = look.DASH_COLOR;
  const dashes = Math.round(GROUND.CHUNK_WIDTH / look.DASH_PERIOD);
  for (let lane = 1; lane < LANES.COUNT; lane++) {
    const x = centre + (lane * LANES.WIDTH - lanesHalf) * metre;
    for (let i = 0; i < dashes; i++) {
      roundedRect(context, x - (look.DASH_WIDTH * metre) / 2, (i * size) / dashes, look.DASH_WIDTH * metre, look.DASH_LENGTH * metre, (look.DASH_WIDTH * metre) / 2);
    }
  }

  // Candy-stripe bands beside the lanes.
  const stripes = Math.round(GROUND.CHUNK_WIDTH / look.EDGE_STRIPE);
  for (const side of [-1, 1]) {
    const x = centre + side * lanesHalf * metre - (side < 0 ? look.EDGE_WIDTH * metre : 0);
    for (let i = 0; i < stripes; i++) {
      context.fillStyle = look.EDGE_COLORS[i % look.EDGE_COLORS.length] ?? look.DASH_COLOR;
      context.fillRect(x, (i * size) / stripes, look.EDGE_WIDTH * metre, size / stripes + 1);
    }
  }
  return finish(canvas);
}

/** The meadow: a seamless square tile of soft green patches, darker tufts and tiny flowers. */
export function grassTexture(): CanvasTexture {
  const look = VALLEY.GRASS;
  const size = look.TILE_PIXELS;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return finish(canvas);
  const metre = size / look.TILE;
  const random = new Random(VALLEY.SEED + 22);
  const pick = <T,>(list: readonly T[]): T => list[random.int(list.length)] as T;

  context.fillStyle = look.COLOR;
  context.fillRect(0, 0, size, size);
  for (let i = 0; i < look.PATCHES; i++) {
    const radius = (0.5 + random.next() * 1.1) * metre;
    const squash = 0.5 + random.next() * 0.4;
    const angle = random.next() * Math.PI;
    context.fillStyle = pick(look.PATCH_COLORS);
    wrapped(size, random.next() * size, random.next() * size, (x, y) => {
      context.beginPath();
      context.ellipse(x, y, radius, radius * squash, angle, 0, Math.PI * 2);
      context.fill();
    });
  }
  context.strokeStyle = look.TUFT_COLOR;
  context.lineCap = 'round';
  context.lineWidth = 0.035 * metre;
  for (let i = 0; i < look.TUFTS; i++) {
    const blade = (0.1 + random.next() * 0.1) * metre;
    wrapped(size, random.next() * size, random.next() * size, (x, y) => {
      // A tuft: three short blades fanning out.
      for (const lean of [-0.5, 0, 0.5]) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + Math.sin(lean) * blade, y - Math.cos(lean) * blade);
        context.stroke();
      }
    });
  }
  for (let i = 0; i < look.DOTS; i++) {
    const radius = (0.035 + random.next() * 0.035) * metre;
    context.fillStyle = pick(look.DOT_COLORS);
    wrapped(size, random.next() * size, random.next() * size, (x, y) => {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });
  }
  return finish(canvas);
}
