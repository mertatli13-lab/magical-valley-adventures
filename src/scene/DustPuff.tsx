import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three';
import { EFFECTS } from '../config';
import { frameDt } from '../game/run';
import { useGameStore } from '../store/gameStore';
import { radialTexture } from './textures';

/** A small puff of dust spreading from the hero's feet on landing. */
export function DustPuff() {
  const { points, material, positions, directions } = useMemo(() => {
    const positions = new Float32Array(EFFECTS.DUST_COUNT * 3);
    const directions = new Float32Array(EFFECTS.DUST_COUNT * 2);
    for (let i = 0; i < EFFECTS.DUST_COUNT; i++) {
      const angle = (i / EFFECTS.DUST_COUNT) * Math.PI * 2;
      directions[i * 2] = Math.cos(angle);
      directions[i * 2 + 1] = Math.sin(angle);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color: EFFECTS.DUST_COLOR,
      size: EFFECTS.DUST_SIZE,
      map: radialTexture(),
      transparent: true,
      depthWrite: false,
    });
    const points = new Points(geometry, material);
    points.frustumCulled = false;
    points.visible = false;
    return { points, material, positions, directions };
  }, []);
  const puff = useRef<{ age: number; x: number; seen: number }>({ age: EFFECTS.DUST_LIFE, x: 0, seen: -1 });

  useFrame((_, delta) => {
    const { session } = useGameStore.getState();
    const { cues } = session.run;
    const p = puff.current;
    if (p.seen < 0) p.seen = cues.count;
    for (let n = cues.firstUnread(p.seen); n < cues.count; n++) {
      if (cues.cue(n) !== 'land') continue;
      p.age = 0;
      p.x = cues.x[cues.slot(n)] ?? 0;
    }
    p.seen = cues.count;
    if (session.screen !== 'PAUSE') p.age += frameDt(delta);
    const t = p.age / EFFECTS.DUST_LIFE;
    points.visible = t < 1;
    if (!points.visible) return;
    const reach = 1 - (1 - t) * (1 - t); // eases out
    for (let i = 0; i < EFFECTS.DUST_COUNT; i++) {
      positions[i * 3] = p.x + (directions[i * 2] ?? 0) * reach * EFFECTS.DUST_SPREAD_X;
      positions[i * 3 + 1] = EFFECTS.DUST_START_Y + t * EFFECTS.DUST_RISE;
      positions[i * 3 + 2] = (directions[i * 2 + 1] ?? 0) * reach * EFFECTS.DUST_SPREAD_Z;
    }
    points.geometry.getAttribute('position').needsUpdate = true;
    material.opacity = 1 - t;
  });

  return <primitive object={points} />;
}
