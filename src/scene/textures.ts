import { CanvasTexture, SRGBColorSpace } from 'three';
import { BLOB_SHADOW } from '../config';

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
