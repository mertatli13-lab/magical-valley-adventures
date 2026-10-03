import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { MeshStandardMaterial, type Group, type Mesh } from 'three';
import {
  ACCESSORY_LOOKS,
  ATTACH_HEIGHTS,
  CHARACTER_COLORS,
  CHARACTER_POSES,
  JUMP,
  MOVE_LOOKS,
  PLAYER,
  RENDER,
  SLIDE,
} from '../config';
import { ACCESSORIES, type AccessoryInfo, type SignatureMoveInfo } from '../game/catalogue';
import { useGameStore } from '../store/gameStore';

const RADIUS = PLAYER.HALF_WIDTH;
const BODY_LENGTH = PLAYER.STAND_HEIGHT - 2 * RADIUS;
const TRAIL_INDICES = Array.from({ length: MOVE_LOOKS.TRAIL_COUNT }, (_, i) => i);
const FULL_TURN = Math.PI * 2;

/** A placeholder accessory: a simple shape from ACCESSORY_LOOKS. */
function AccessoryShape({ item }: { item: AccessoryInfo }) {
  const look = ACCESSORY_LOOKS[item.id as keyof typeof ACCESSORY_LOOKS];
  if (!look) return null;
  const material = <meshStandardMaterial color={look.color} />;
  switch (look.shape) {
    case 'box':
      return (
        <mesh>
          <boxGeometry args={[...look.size]} />
          {material}
        </mesh>
      );
    case 'cone':
      return (
        <mesh>
          <coneGeometry args={[look.size[0], look.size[1], MOVE_LOOKS.SEGMENTS * 2]} />
          {material}
        </mesh>
      );
    case 'torus':
      return (
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[look.size[0], look.size[1], MOVE_LOOKS.SEGMENTS, MOVE_LOOKS.SEGMENTS * 3]} />
          {material}
        </mesh>
      );
    case 'sphere':
      return (
        <mesh>
          <sphereGeometry args={[look.size[0], MOVE_LOOKS.SEGMENTS, MOVE_LOOKS.SEGMENTS]} />
          {material}
        </mesh>
      );
  }
}

/**
 * Grey-box hero: a capsule 1.2 m tall in the chosen character's colour, with
 * the equipped accessory at its attach point (placeholders attach relative to
 * the top of the capsule). It squashes when sliding, blinks while safe, sits
 * tilted when out and hops on a new best run. Signature moves only change how
 * it looks; the simulation never sees them.
 */
export function Player() {
  const root = useRef<Group>(null);
  const pivot = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const accessories = useRef<(Group | null)[]>([]);
  const beads = useRef<(Mesh | null)[]>([]);
  const shownCharacter = useRef('');
  const beadMaterials = useMemo(
    () => TRAIL_INDICES.map(() => new MeshStandardMaterial({ emissiveIntensity: 0.6 })),
    [],
  );
  const shownTrail = useRef('');
  // Equipment only changes between runs; look it up when the session reports a change, not every frame.
  const equipment = useRef<{ changes: number; move?: SignatureMoveInfo; accessory?: AccessoryInfo }>({ changes: -1 });

  useFrame(({ clock }) => {
    const hero = root.current;
    const capsule = body.current;
    const centre = pivot.current;
    if (!hero || !capsule || !centre) return;
    const { session } = useGameStore.getState();
    const { player } = session.run;
    if (equipment.current.changes !== session.changes) {
      equipment.current = { changes: session.changes, move: session.activeMove, accessory: session.equippedAccessory };
    }
    const character = session.equippedCharacter.id;
    if (character !== shownCharacter.current) {
      shownCharacter.current = character;
      (capsule.material as MeshStandardMaterial).color.set(CHARACTER_COLORS[character]);
    }

    // Whole hero: position, celebration hop, dizzy tilt, blink.
    const celebrating = session.screen === 'RESULTS' && session.result.newBest;
    const hop = celebrating
      ? Math.abs(Math.sin(clock.elapsedTime * CHARACTER_POSES.CELEBRATE_RATE)) * CHARACTER_POSES.CELEBRATE_HEIGHT
      : 0;
    hero.position.set(player.x, player.y + hop, PLAYER.Z);
    hero.rotation.z = session.screen === 'OUT' ? CHARACTER_POSES.OUT_TILT : 0;
    const blinking = session.screen === 'RUN' && player.safeTimer > 0;
    hero.visible = !blinking || (player.safeTimer * RENDER.BLINK_HZ) % 1 >= 0.5;

    // Body: squash when sliding, plus the signature move's look.
    let scaleX = 1;
    let scaleZ = 1;
    let scaleY = player.height / PLAYER.STAND_HEIGHT;
    let tiltX = 0;
    let tiltZ = 0;
    const { move } = equipment.current;
    const airborne = player.y > 0;
    const apex = Math.min(player.y / JUMP.HEIGHT, 1);
    const sliding = player.slideTimer > 0;
    if (move?.id === 'stretchy-leap' && airborne) {
      scaleY *= 1 + MOVE_LOOKS.STRETCH * apex;
      scaleX *= 1 - (MOVE_LOOKS.STRETCH / 2) * apex;
      scaleZ = scaleX;
    } else if (move?.id === 'victory-punch' && airborne) {
      tiltZ = -MOVE_LOOKS.PUNCH_TILT * apex;
    } else if (move?.id === 'brave-glide' && airborne && player.vy < 0) {
      scaleX *= 1 + MOVE_LOOKS.GLIDE_SPREAD; // wings spread sideways only
      tiltX = -MOVE_LOOKS.GLIDE_TILT;
    } else if (move?.id === 'clumsy-tumble' && sliding) {
      tiltX = -(1 - player.slideTimer / SLIDE.TIME) * MOVE_LOOKS.TUMBLE_TURNS * FULL_TURN;
    }
    // Tilts turn the body and its accessory together around the body's centre; only the body squashes.
    centre.position.y = player.height / 2;
    centre.rotation.set(tiltX, 0, tiltZ);
    capsule.scale.set(scaleX, scaleY, scaleZ);

    // Accessory: only the equipped one is shown, at its attach point.
    const equipped = equipment.current.accessory;
    for (let i = 0; i < ACCESSORIES.length; i++) {
      const group = accessories.current[i];
      const item = ACCESSORIES[i];
      if (!group || !item) continue;
      group.visible = item === equipped && item.id !== 'sparkle-trail';
      if (!group.visible) continue;
      const look = ACCESSORY_LOOKS[item.id as keyof typeof ACCESSORY_LOOKS];
      group.position.set(0, player.height * (ATTACH_HEIGHTS[item.attach] - 0.5) + look.lift, look.back);
    }

    // Trail: the rainbow dash while sliding, or the sparkle trail accessory while running.
    const trail =
      move?.id === 'rainbow-dash' && sliding ? 'rainbow' : equipped?.id === 'sparkle-trail' ? 'sparkle' : '';
    if (trail !== shownTrail.current) {
      shownTrail.current = trail;
      beadMaterials.forEach((material, i) => {
        const color = trail === 'rainbow' ? (MOVE_LOOKS.RAINBOW[i % MOVE_LOOKS.RAINBOW.length] ?? MOVE_LOOKS.SPARKLE_COLOR) : MOVE_LOOKS.SPARKLE_COLOR;
        material.color.set(color);
        material.emissive.set(color);
      });
    }
    for (let i = 0; i < beads.current.length; i++) {
      const bead = beads.current[i];
      if (!bead) continue;
      bead.visible = trail !== '' && hero.visible;
      if (!bead.visible) continue;
      const wobble = Math.sin(clock.elapsedTime * MOVE_LOOKS.TRAIL_WOBBLE_RATE + i) * MOVE_LOOKS.TRAIL_WOBBLE;
      bead.position.set(player.x + wobble, player.y + MOVE_LOOKS.TRAIL_HEIGHT, PLAYER.Z + (i + 1) * MOVE_LOOKS.TRAIL_SPACING);
    }
  });

  return (
    <>
      <group ref={root}>
        <group ref={pivot}>
          <mesh ref={body}>
            <capsuleGeometry args={[RADIUS, BODY_LENGTH, RENDER.PLAYER_CAP_SEGMENTS, RENDER.PLAYER_RADIAL_SEGMENTS]} />
            <meshStandardMaterial color={RENDER.PLAYER_COLOR} />
          </mesh>
          {ACCESSORIES.map((item, i) => (
            <group key={item.id} ref={(group) => void (accessories.current[i] = group)} visible={false}>
              <AccessoryShape item={item} />
            </group>
          ))}
        </group>
      </group>
      {TRAIL_INDICES.map((i) => (
        <mesh key={i} ref={(bead) => void (beads.current[i] = bead)} material={beadMaterials[i]} visible={false}>
          <sphereGeometry args={[MOVE_LOOKS.TRAIL_SIZE, MOVE_LOOKS.SEGMENTS, MOVE_LOOKS.SEGMENTS]} />
        </mesh>
      ))}
    </>
  );
}
