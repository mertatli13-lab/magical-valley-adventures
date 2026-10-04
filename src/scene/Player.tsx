import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { MeshStandardMaterial, SphereGeometry, type Group, type Mesh } from 'three';
import {
  ATTACH_HEIGHTS,
  BLOB_SHADOW,
  CHARACTER_COLORS,
  CHARACTER_POSES,
  JUMP,
  MOVE_LOOKS,
  PLAYER,
  RENDER,
  SLIDE,
} from '../config';
import type { ClipName, PoseInput } from '../game/animation';
import { ACCESSORIES, type AccessoryInfo, type CharacterId, type SignatureMoveInfo } from '../game/catalogue';
import type { Session } from '../game/session';
import { useGameStore } from '../store/gameStore';
import { animateAccessory, makeAccessory, twinkleGeometry } from './accessoryShapes';
import { ACCESSORY_MODELS, CHARACTER_MODELS } from './assetManifest';
import { getModel } from './assets';
import { BlobShadow } from './BlobShadow';
import { CharacterModel, type CharacterFrame } from './CharacterModel';

const RADIUS = PLAYER.HALF_WIDTH;
const BODY_LENGTH = PLAYER.STAND_HEIGHT - 2 * RADIUS;
const TRAIL_INDICES = Array.from({ length: MOVE_LOOKS.TRAIL_COUNT }, (_, i) => i);
const FULL_TURN = Math.PI * 2;
/** Accessories drawn as a trail behind the hero rather than worn. */
const TRAIL_ACCESSORY = 'sparkle-trail';

interface Equipment {
  changes: number;
  move?: SignatureMoveInfo;
  accessory?: AccessoryInfo;
}

/** Equipment changes only between runs: look it up when the session reports a change, not every frame. */
function refreshEquipment(cache: Equipment, session: Session): Equipment {
  if (cache.changes === session.changes) return cache;
  return { changes: session.changes, move: session.activeMove, accessory: session.equippedAccessory };
}

/**
 * Grey-box hero: a capsule in the character's colour with its accessory at the
 * attach point. It squashes when sliding, sits tilted when out, hops on a new
 * best, and shows the signature move as a simple effect.
 */
function Capsule({ equipment }: { equipment: { current: Equipment } }) {
  const pivot = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const accessories = useRef<(Group | null)[]>([]);
  const placeholders = useMemo(() => ACCESSORIES.map((item) => makeAccessory(item.id)), []);
  const shownCharacter = useRef('');

  useFrame(({ clock }) => {
    const centre = pivot.current;
    const capsule = body.current;
    if (!centre || !capsule) return;
    const { session } = useGameStore.getState();
    const { player } = session.run;
    const character = session.equippedCharacter.id;
    if (character !== shownCharacter.current) {
      shownCharacter.current = character;
      (capsule.material as MeshStandardMaterial).color.set(CHARACTER_COLORS[character]);
    }

    let scaleX = 1;
    let scaleZ = 1;
    let scaleY = player.height / PLAYER.STAND_HEIGHT;
    let tiltX = 0;
    let tiltZ = 0;
    const { move, accessory } = equipment.current;
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
    const celebrating = session.screen === 'RESULTS' && session.result.newBest;
    if (session.screen === 'OUT') tiltZ = CHARACTER_POSES.OUT_TILT;
    // Tilts turn the body and its accessory together around the body's centre; only the body squashes.
    const hop = celebrating
      ? Math.abs(Math.sin(clock.elapsedTime * CHARACTER_POSES.CELEBRATE_RATE)) * CHARACTER_POSES.CELEBRATE_HEIGHT
      : 0;
    centre.position.y = player.height / 2 + hop;
    centre.rotation.set(tiltX, 0, tiltZ);
    capsule.scale.set(scaleX, scaleY, scaleZ);

    for (let i = 0; i < ACCESSORIES.length; i++) {
      const group = accessories.current[i];
      const item = ACCESSORIES[i];
      if (!group || !item) continue;
      group.visible = item === accessory && item.id !== TRAIL_ACCESSORY;
      if (!group.visible) continue;
      // Back items sit on the capsule's surface; head and neck items on its centre line.
      group.position.set(0, player.height * (ATTACH_HEIGHTS[item.attach] - 0.5), item.attach === 'acc_back' ? RADIUS : 0);
      animateAccessory(placeholders[i] ?? null, clock.elapsedTime, session.screen === 'RUN' ? 1 : 0);
    }
  });

  return (
    <group ref={pivot}>
      <mesh ref={body}>
        <capsuleGeometry args={[RADIUS, BODY_LENGTH, RENDER.PLAYER_CAP_SEGMENTS, RENDER.PLAYER_RADIAL_SEGMENTS]} />
        <meshStandardMaterial color={RENDER.PLAYER_COLOR} />
      </mesh>
      {placeholders.map((object, i) => (
        <group key={object.uuid} ref={(group) => void (accessories.current[i] = group)} visible={false}>
          <primitive object={object} />
        </group>
      ))}
    </group>
  );
}

/**
 * The hero. Uses the character's model when it exists, with its clips driven
 * by the run, otherwise the capsule placeholder. Blinks while safe, casts a
 * soft blob shadow, and draws the rainbow dash or sparkle trail. Signature
 * moves only change how it looks; the simulation never sees them.
 */
export function Player() {
  const characterId = useGameStore((state) => (state.version, state.session.equippedCharacter.id)) as CharacterId;
  const gltf = getModel(CHARACTER_MODELS[characterId]);
  const root = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const beads = useRef<(Mesh | null)[]>([]);
  const equipment = useRef<Equipment>({ changes: -1 });
  const hit = useRef({ count: 0, at: -Infinity });
  const clock = useRef(0);
  const beadMaterials = useMemo(() => TRAIL_INDICES.map(() => new MeshStandardMaterial({ emissiveIntensity: 0.6 })), []);
  // Rainbow dash trails round beads; the sparkle trail trails four-pointed twinkles.
  const beadShapes = useMemo(
    () => ({
      ball: new SphereGeometry(MOVE_LOOKS.TRAIL_SIZE, MOVE_LOOKS.SEGMENTS, MOVE_LOOKS.SEGMENTS),
      twinkle: twinkleGeometry().scale(MOVE_LOOKS.TWINKLE_SIZE, MOVE_LOOKS.TWINKLE_SIZE, MOVE_LOOKS.TWINKLE_SIZE),
    }),
    [],
  );
  const shownTrail = useRef('');
  const frameState = useRef<CharacterFrame>({
    pose: { pose: 'run', airborne: false, sliding: false, hitAge: Infinity, signature: null },
    speed: 0,
    frozen: false,
    dark: false,
    accessory: null,
  });

  /** The model's state this frame, reusing one object. */
  const heroFrame = (): CharacterFrame => {
    const { session } = useGameStore.getState();
    const { run } = session;
    const pose: PoseInput = frameState.current.pose;
    pose.pose =
      session.screen === 'OUT'
        ? 'out'
        : session.screen === 'RESULTS'
          ? session.result.newBest
            ? 'celebrate'
            : 'idle'
          : 'run';
    pose.airborne = run.player.y > 0;
    pose.sliding = run.player.slideTimer > 0;
    pose.hitAge = clock.current - hit.current.at;
    pose.signature = equipment.current.move?.replaces ?? null;
    const accessory = equipment.current.accessory?.id ?? null;
    frameState.current.speed = run.speed;
    frameState.current.frozen = session.screen === 'PAUSE';
    // The sparkle trail is drawn as a trail unless it has its own model.
    frameState.current.accessory =
      accessory === TRAIL_ACCESSORY && !getModel(ACCESSORY_MODELS[accessory] ?? '') ? null : accessory;
    return frameState.current;
  };
  const onClip = (clip: ClipName) => {
    useGameStore.getState().stats.heroClip = clip;
  };

  useFrame((state, delta) => {
    const hero = root.current;
    if (!hero) return;
    const { session } = useGameStore.getState();
    const { run } = session;
    const { player } = run;
    equipment.current = refreshEquipment(equipment.current, session);
    if (session.screen !== 'PAUSE') clock.current += delta;
    if (run.hitCount !== hit.current.count) hit.current = { count: run.hitCount, at: run.hitCount > 0 ? clock.current : -Infinity };

    hero.position.set(player.x, player.y, PLAYER.Z);
    const blinking = session.screen === 'RUN' && player.safeTimer > 0;
    hero.visible = !blinking || (player.safeTimer * RENDER.BLINK_HZ) % 1 >= 0.5;

    // Blob shadow stays on the ground and shrinks as the hero rises.
    if (shadow.current) {
      shadow.current.position.x = player.x;
      shadow.current.scale.setScalar(Math.max(0, 1 - player.y / BLOB_SHADOW.FADE_HEIGHT));
    }

    // Trail: the rainbow dash while sliding, or the sparkle trail accessory while running.
    const { move, accessory } = equipment.current;
    const sliding = player.slideTimer > 0;
    const trail = move?.id === 'rainbow-dash' && sliding ? 'rainbow' : accessory?.id === TRAIL_ACCESSORY ? 'sparkle' : '';
    if (trail !== shownTrail.current) {
      shownTrail.current = trail;
      beadMaterials.forEach((material, i) => {
        const color =
          trail === 'rainbow' ? (MOVE_LOOKS.RAINBOW[i % MOVE_LOOKS.RAINBOW.length] ?? MOVE_LOOKS.SPARKLE_COLOR) : MOVE_LOOKS.SPARKLE_COLOR;
        material.color.set(color);
        material.emissive.set(color);
      });
      for (const bead of beads.current) if (bead) bead.geometry = trail === 'sparkle' ? beadShapes.twinkle : beadShapes.ball;
    }
    for (let i = 0; i < beads.current.length; i++) {
      const bead = beads.current[i];
      if (!bead) continue;
      bead.visible = trail !== '' && hero.visible;
      if (!bead.visible) continue;
      const wobble = Math.sin(state.clock.elapsedTime * MOVE_LOOKS.TRAIL_WOBBLE_RATE + i) * MOVE_LOOKS.TRAIL_WOBBLE;
      bead.position.set(player.x + wobble, player.y + MOVE_LOOKS.TRAIL_HEIGHT, PLAYER.Z + (i + 1) * MOVE_LOOKS.TRAIL_SPACING);
      if (trail === 'sparkle') {
        // Twinkles spin, bob at different heights and shrink toward the end of the trail.
        bead.rotation.z = state.clock.elapsedTime * MOVE_LOOKS.TWINKLE_SPIN + i;
        bead.position.y += Math.sin(state.clock.elapsedTime * MOVE_LOOKS.TRAIL_WOBBLE_RATE * 0.5 + i * 2) * MOVE_LOOKS.TWINKLE_BOB + MOVE_LOOKS.TWINKLE_BOB;
        bead.scale.setScalar(1 - i / (beads.current.length + 1));
      } else {
        bead.rotation.z = 0;
        bead.scale.setScalar(1);
      }
    }
  });

  return (
    <>
      <group ref={root}>
        {gltf ? (
          <CharacterModel key={characterId} gltf={gltf} name={characterId} frame={heroFrame} onClip={onClip} />
        ) : (
          <Capsule equipment={equipment} />
        )}
      </group>
      <BlobShadow ref={shadow} />
      {TRAIL_INDICES.map((i) => (
        <mesh key={i} ref={(bead) => void (beads.current[i] = bead)} geometry={beadShapes.ball} material={beadMaterials[i]} visible={false} />
      ))}
    </>
  );
}
