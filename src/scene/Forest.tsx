import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type Points,
} from 'three';
import { CHARACTER_COLORS, CHARACTER_POSES, NIGHT, PLAYER, RENDER, STAGE } from '../config';
import { CHARACTERS } from '../game/catalogue';
import { frameDt } from '../game/run';
import { Random } from '../game/random';
import { useGameStore } from '../store/gameStore';
import { stageTags } from '../store/stageTags';
import { CHARACTER_MODELS } from './assetManifest';
import { getModel } from './assets';
import { BlobShadow } from './BlobShadow';
import { CharacterModel, type CharacterFrame } from './CharacterModel';
import { mood } from './mood';
import { radialTexture } from './textures';

const RADIUS = PLAYER.HALF_WIDTH;
const BODY_LENGTH = PLAYER.STAND_HEIGHT - 2 * RADIUS;
const STEP_ANGLE = (Math.PI * 2) / CHARACTERS.length;
const STAGE_TOP = STAGE.HEIGHT;
const PODIUM_TOP = STAGE.HEIGHT + STAGE.PODIUM_HEIGHT;
const TAG_HEIGHT = PLAYER.STAND_HEIGHT + STAGE.TAG_OFFSET;

/** Round glowing stage with a raised centre podium. */
function Stage() {
  return (
    <group>
      <mesh position-y={STAGE.HEIGHT / 2}>
        <cylinderGeometry args={[STAGE.RADIUS, STAGE.RADIUS, STAGE.HEIGHT, STAGE.SEGMENTS]} />
        <meshStandardMaterial color={STAGE.COLOR} emissive={STAGE.GLOW_COLOR} emissiveIntensity={STAGE.GLOW_INTENSITY} />
      </mesh>
      <mesh position-y={STAGE_TOP + STAGE.PODIUM_HEIGHT / 2}>
        <cylinderGeometry args={[STAGE.PODIUM_RADIUS, STAGE.PODIUM_RADIUS, STAGE.PODIUM_HEIGHT, STAGE.SEGMENTS]} />
        <meshStandardMaterial color={STAGE.COLOR} emissive={STAGE.GLOW_COLOR} emissiveIntensity={STAGE.GLOW_INTENSITY * 1.5} />
      </mesh>
    </group>
  );
}

/**
 * The five characters as placeholder capsules on a ring. The stage turns one
 * character per step; the one in focus hops onto the podium. Locked characters
 * are dark silhouettes with a price tag.
 */
function StageCharacters() {
  const tag = useMemo(() => new Vector3(), []);
  const models = useMemo(() => CHARACTERS.map((c) => getModel(CHARACTER_MODELS[c.id])), []);
  // One reusable frame state per character for its model.
  const frames = useMemo<CharacterFrame[]>(
    () =>
      CHARACTERS.map(() => ({
        pose: { pose: 'idle', airborne: false, sliding: false, hitAge: Infinity, signature: null },
        speed: 0,
        frozen: false,
        dark: false,
        accessory: null,
      })),
    [],
  );
  const groups = useRef<(Group | null)[]>([]);
  const meshes = useRef<(Mesh | null)[]>([]);
  const angle = useRef(-useGameStore.getState().session.selection * STEP_ANGLE);
  const focus = useRef(CHARACTERS.map(() => 0));
  const materials = useMemo(
    () => ({
      colors: CHARACTERS.map((c) => new MeshStandardMaterial({ color: CHARACTER_COLORS[c.id] })),
      locked: new MeshStandardMaterial({ color: CHARACTER_POSES.LOCKED_COLOR }),
    }),
    [],
  );

  useFrame(({ camera, size }, delta) => {
    const dt = frameDt(delta);
    const { session: s } = useGameStore.getState();
    const onStage = s.screen === 'SELECT';
    const target = -s.selection * STEP_ANGLE;
    angle.current += (target - angle.current) * (1 - Math.exp(-STAGE.ROTATE_RATE * dt));
    const selected = s.selectedCharacter.id;
    for (let i = 0; i < CHARACTERS.length; i++) {
      const character = CHARACTERS[i];
      const group = groups.current[i];
      const mesh = meshes.current[i];
      if (!character || !group) continue;
      const goal = character.id === selected ? 1 : 0;
      const w = (focus.current[i] ?? 0) + (goal - (focus.current[i] ?? 0)) * (1 - Math.exp(-STAGE.FOCUS_RATE * dt));
      focus.current[i] = w;
      const theta = i * STEP_ANGLE + angle.current;
      const ringX = Math.sin(theta) * STAGE.RING_RADIUS;
      const ringZ = Math.cos(theta) * STAGE.RING_RADIUS;
      const y = STAGE_TOP + (PODIUM_TOP - STAGE_TOP) * w + Math.sin(Math.PI * w) * STAGE.HOP_HEIGHT;
      group.position.set(ringX * (1 - w), y, ringZ * (1 - w));
      const owned = s.owns(character);
      if (mesh) mesh.material = owned ? (materials.colors[i] ?? materials.locked) : materials.locked;
      const state = frames[i];
      if (state) {
        state.pose.pose = character.id === selected ? 'focus' : 'idle';
        state.dark = !owned;
        state.accessory = owned ? s.save.equipped.accessory : null;
      }
      // Where this character's price tag goes on screen.
      tag.set(group.position.x, group.position.y + TAG_HEIGHT, group.position.z).project(camera);
      stageTags.x[i] = (tag.x * 0.5 + 0.5) * size.width;
      stageTags.y[i] = (-tag.y * 0.5 + 0.5) * size.height;
      stageTags.visible[i] = onStage && !owned && tag.z < 1 ? 1 : 0;
    }
  });

  return (
    <>
      {CHARACTERS.map((character, i) => (
        <group key={character.id} ref={(group) => void (groups.current[i] = group)}>
          {models[i] ? (
            <CharacterModel gltf={models[i]} name={character.id} frame={() => frames[i] as CharacterFrame} />
          ) : (
            <mesh ref={(mesh) => void (meshes.current[i] = mesh)} position-y={PLAYER.STAND_HEIGHT / 2}>
              <capsuleGeometry args={[RADIUS, BODY_LENGTH, RENDER.PLAYER_CAP_SEGMENTS, RENDER.PLAYER_RADIAL_SEGMENTS]} />
            </mesh>
          )}
          <BlobShadow />
        </group>
      ))}
    </>
  );
}

/** Dark trees in a ring around the stage, placed once from a fixed seed. */
function Trees() {
  const crowns = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const random = new Random(NIGHT.SEED);
    const matrix = new Matrix4();
    for (let i = 0; i < NIGHT.TREE_COUNT; i++) {
      const theta = (i / NIGHT.TREE_COUNT) * Math.PI * 2 + random.next();
      const distance = NIGHT.TREE_MIN_DISTANCE + random.next() * (NIGHT.TREE_MAX_DISTANCE - NIGHT.TREE_MIN_DISTANCE);
      const x = Math.sin(theta) * distance;
      const z = Math.cos(theta) * distance;
      crowns.current?.setMatrixAt(i, matrix.makeTranslation(x, NIGHT.TRUNK_HEIGHT + NIGHT.TREE_HEIGHT / 2, z));
      trunks.current?.setMatrixAt(i, matrix.makeTranslation(x, NIGHT.TRUNK_HEIGHT / 2, z));
    }
    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <>
      <instancedMesh ref={crowns} args={[undefined, undefined, NIGHT.TREE_COUNT]}>
        <coneGeometry args={[NIGHT.TREE_RADIUS, NIGHT.TREE_HEIGHT, NIGHT.TREE_SEGMENTS]} />
        <meshStandardMaterial color={NIGHT.TREE_COLOR} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, NIGHT.TREE_COUNT]}>
        <cylinderGeometry args={[NIGHT.TRUNK_RADIUS, NIGHT.TRUNK_RADIUS, NIGHT.TRUNK_HEIGHT, NIGHT.TREE_SEGMENTS]} />
        <meshStandardMaterial color={NIGHT.TRUNK_COLOR} />
      </instancedMesh>
    </>
  );
}

/** Fireflies drifting around the stage. */
function Fireflies() {
  const points = useRef<Points>(null);
  const { geometry, baseY, phase } = useMemo(() => {
    const random = new Random(NIGHT.SEED + 1);
    const positions = new Float32Array(NIGHT.FIREFLY_COUNT * 3);
    const baseY = new Float32Array(NIGHT.FIREFLY_COUNT);
    const phase = new Float32Array(NIGHT.FIREFLY_COUNT);
    for (let i = 0; i < NIGHT.FIREFLY_COUNT; i++) {
      positions[i * 3] = (random.next() * 2 - 1) * NIGHT.FIREFLY_SPREAD;
      baseY[i] = NIGHT.FIREFLY_MIN_Y + random.next() * (NIGHT.FIREFLY_MAX_Y - NIGHT.FIREFLY_MIN_Y);
      positions[i * 3 + 1] = baseY[i] ?? 0;
      positions[i * 3 + 2] = (random.next() * 2 - 1) * NIGHT.FIREFLY_SPREAD;
      phase[i] = random.next() * Math.PI * 2;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    return { geometry, baseY, phase };
  }, []);

  useFrame(({ clock }) => {
    const position = geometry.getAttribute('position') as BufferAttribute;
    const t = clock.elapsedTime * NIGHT.FIREFLY_SPEED;
    for (let i = 0; i < NIGHT.FIREFLY_COUNT; i++) {
      position.setY(i, (baseY[i] ?? 0) + Math.sin(t + (phase[i] ?? 0)) * NIGHT.FIREFLY_BOB);
    }
    position.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color={NIGHT.FIREFLY_COLOR} size={NIGHT.FIREFLY_SIZE} map={radialTexture()} transparent depthWrite={false} />
    </points>
  );
}

/** The night forest and the select stage. Dissolves away as daylight comes up. */
export function Forest() {
  const root = useRef<Group>(null);
  const stage = useRef<Group>(null);

  useFrame(() => {
    if (root.current) root.current.visible = mood.daylight < 1;
    if (stage.current) stage.current.scale.setScalar(Math.max(1 - mood.daylight, Number.EPSILON));
  });

  return (
    <group ref={root}>
      <pointLight position={[...STAGE.LIGHT_POSITION]} intensity={STAGE.LIGHT_INTENSITY} distance={STAGE.LIGHT_DISTANCE} />
      <group ref={stage}>
        <Stage />
        <StageCharacters />
      </group>
      <Trees />
      <Fireflies />
    </group>
  );
}
