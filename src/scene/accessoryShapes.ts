import {
  BoxGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three';
import { ACCESSORY_LOOKS, MOVE_LOOKS } from '../config';

/** A placeholder accessory: a simple shape from ACCESSORY_LOOKS, until the real model exists. */
export function makeAccessoryPlaceholder(id: string): Group {
  const group = new Group();
  const look = ACCESSORY_LOOKS[id as keyof typeof ACCESSORY_LOOKS];
  if (!look) return group;
  let geometry: BufferGeometry;
  switch (look.shape) {
    case 'box':
      geometry = new BoxGeometry(look.size[0], look.size[1], look.size[2]);
      break;
    case 'cone':
      geometry = new ConeGeometry(look.size[0], look.size[1], MOVE_LOOKS.SEGMENTS * 2);
      break;
    case 'torus':
      geometry = new TorusGeometry(look.size[0], look.size[1], MOVE_LOOKS.SEGMENTS, MOVE_LOOKS.SEGMENTS * 3);
      geometry.rotateX(Math.PI / 2);
      break;
    case 'sphere':
      geometry = new SphereGeometry(look.size[0], MOVE_LOOKS.SEGMENTS, MOVE_LOOKS.SEGMENTS);
      break;
  }
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: look.color }));
  mesh.position.set(0, look.lift, look.back);
  group.add(mesh);
  return group;
}
