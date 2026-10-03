import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { mood } from './mood';

/** The daylight run world. Hidden while the night forest is fully showing. */
export function RunWorld({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null);
  useFrame(() => {
    if (root.current) root.current.visible = mood.daylight > 0;
  });
  return <group ref={root}>{children}</group>;
}
