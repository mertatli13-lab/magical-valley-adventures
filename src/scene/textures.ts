import { CanvasTexture, SRGBColorSpace } from 'three';
import { BLOB_SHADOW, NIGHT, STAGE } from '../config';

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

let star: CanvasTexture | null = null;

/** A small glowing star on a soft halo: the select-screen fireflies. Built once. */
export function starTexture(): CanvasTexture {
  if (star) return star;
  const size = NIGHT.FIREFLY_TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const c = size / 2;
    const halo = context.createRadialGradient(c, c, 0, c, c, c);
    halo.addColorStop(0, 'rgba(255,255,255,0.55)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = halo;
    context.fillRect(0, 0, size, size);
    const points = NIGHT.FIREFLY_STAR_POINTS;
    const outer = c * 0.62;
    const inner = outer * NIGHT.FIREFLY_STAR_INNER;
    context.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      context.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    context.closePath();
    context.fillStyle = 'rgba(255,255,255,1)';
    context.fill();
  }
  star = new CanvasTexture(canvas);
  star.colorSpace = SRGBColorSpace;
  return star;
}

let stageTop: CanvasTexture | null = null;

/**
 * The stage top seen from above: a pearl gradient with one curved groove
 * between each pair of character slots. `slots` grooves start at the podium
 * edge and curl outward to the rim. Built once.
 */
export function stageTopTexture(slots: number): CanvasTexture {
  if (stageTop) return stageTop;
  const size = STAGE.TOP_TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const c = size / 2;
    const gradient = context.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, STAGE.TOP_CENTER_COLOR);
    gradient.addColorStop(1, STAGE.TOP_EDGE_COLOR);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    // Canvas point for a stage angle (x = sin, z = cos, as the characters use) and radius.
    const at = (theta: number, r: number): [number, number] => [c + Math.sin(theta) * r, c + Math.cos(theta) * r];
    const inner = (STAGE.PODIUM_RADIUS / STAGE.RADIUS) * c;
    const step = (Math.PI * 2) / slots;
    const strokes: [string, number][] = [
      [STAGE.GROOVE_COLOR, STAGE.GROOVE_WIDTH],
      [STAGE.GROOVE_HIGHLIGHT, STAGE.GROOVE_WIDTH / 2.5],
    ];
    for (const [color, width] of strokes) {
      context.strokeStyle = color;
      context.lineWidth = width;
      context.lineCap = 'round';
      for (let i = 0; i < slots; i++) {
        const theta = i * step + step / 2;
        context.beginPath();
        context.moveTo(...at(theta, inner));
        context.quadraticCurveTo(...at(theta + STAGE.GROOVE_CURL * 0.75, (inner + c) / 2), ...at(theta + STAGE.GROOVE_CURL, c));
        context.stroke();
      }
    }
  }
  stageTop = new CanvasTexture(canvas);
  stageTop.colorSpace = SRGBColorSpace;
  return stageTop;
}

let beam: CanvasTexture | null = null;

/** Vertical fade for the moonbeams: bright at the top, gone at the bottom. Built once. */
export function beamTexture(): CanvasTexture {
  if (beam) return beam;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  beam = new CanvasTexture(canvas);
  beam.colorSpace = SRGBColorSpace;
  return beam;
}
