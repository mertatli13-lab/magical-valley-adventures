/**
 * Every gameplay number in the game. Values come from docs/design.md, which is
 * the source of truth; change the design document first, then this file.
 *
 * Units: metres, seconds, metres per second, stars. 1 unit = 1 m.
 * Nothing in this file may import React or three.js.
 */

// ---------------------------------------------------------------------------
// Run rules
// ---------------------------------------------------------------------------

/** Lanes: three lanes, each 2 m wide, centred at x = -2, 0 and +2. */
export const LANES = {
  COUNT: 3,
  WIDTH: 2,
  /** x position of each lane, index 0 = left. */
  X: [-2, 0, 2],
  /** Lane the hero starts a run in. */
  START_INDEX: 1,
  MIN_INDEX: 0,
  MAX_INDEX: 2,
} as const;

/** Seconds a lane change takes. */
export const LANE_CHANGE_TIME = 0.12;

/** Jump: leap 1.6 m high, 0.6 s in the air (see A3 for the physics). */
export const JUMP = {
  HEIGHT: 1.6,
  AIR_TIME: 0.6,
  /** m/s^2, from A3. Gives JUMP.HEIGHT and JUMP.AIR_TIME with VELOCITY. */
  GRAVITY: 35.6,
  /** m/s upward at take-off, from A3. */
  VELOCITY: 10.67,
} as const;

/** Slide: duck to half height for 0.7 s. */
export const SLIDE = {
  TIME: 0.7,
  /** Fraction of standing height while sliding. */
  HEIGHT_FACTOR: 0.5,
  /** Downward velocity applied when sliding in the air (fast fall, A3). */
  FAST_FALL_VELOCITY: -20,
} as const;

/** Player body heights in metres (A3) and hitbox (A6). */
export const PLAYER = {
  STAND_HEIGHT: 1.2,
  SLIDE_HEIGHT: 0.6,
  /** Hitbox half-width; the box is 0.7 m wide. */
  HALF_WIDTH: 0.35,
  /** Hitbox depth along z. */
  DEPTH: 0.6,
  /** The hero never moves along z; the world scrolls toward +z. */
  Z: 0,
} as const;

/** A move made up to this many seconds early is remembered and played. */
export const INPUT_BUFFER_TIME = 0.15;

/** Lane changes are allowed while in the air. */
export const LANE_CHANGE_IN_AIR = true;

/** Barriers fit inside a box 1.8 m wide (Blender asset spec). */
const BARRIER_HALF_WIDTH = 0.9;

/** Barrier sizes in metres. */
export const OBSTACLES = {
  /** Low: one lane wide, 0.8 m tall; jump over. */
  LOW_HEIGHT: 0.8,
  /** High: one or more lanes wide, 0.9 m clearance underneath; slide under. */
  HIGH_CLEARANCE: 0.9,
  /** Tall: one lane wide, 3 m tall; change lane. */
  TALL_HEIGHT: 3,
  HALF_WIDTH: BARRIER_HALF_WIDTH,
  /** Low barriers fit inside a box 0.8 m deep (Blender asset spec). */
  DEPTH: 0.8,
  /** The "HHH" row is one wide cloud bar across all three lanes. */
  WIDE_HALF_WIDTH: LANES.WIDTH + BARRIER_HALF_WIDTH,
} as const;

/** Stars: lines along a lane, arcs over low barriers, a rare big star. */
export const STARS = {
  LINE_MIN: 5,
  LINE_MAX: 10,
  /** Metres between stars in a line. */
  SPACING: 1.5,
  VALUE: 1,
  BIG_VALUE: 10,
  /** About one big star every this many seconds. */
  BIG_INTERVAL: 30,
} as const;

/** Hearts and hits. */
export const HEARTS = {
  START: 3,
  /** Hearts lost per barrier hit. */
  HIT_COST: 1,
  /** Seconds of blinking safety after a hit. */
  HIT_SAFE_TIME: 1.5,
  /** Speed multiplier during the safety after a hit (speed drops by 20%). */
  HIT_SPEED_FACTOR: 0.8,
} as const;

/** Revive offered on the Out screen. */
export const REVIVE = {
  /** Seconds the Out screen offers a revive. */
  OFFER_TIME: 5,
  /** Hearts restored by a revive. */
  HEARTS: 3,
  /** Barriers are cleared for this many metres after a revive. */
  CLEAR_DISTANCE: 30,
  /** Seconds of safety after a revive. */
  SAFE_TIME: 2,
  /** Cost of the first revive in a run. */
  BASE_COST: 100,
  /** Each later revive in the same run costs this many times the previous. */
  COST_MULTIPLIER: 2,
  /** A run allows this many revives at most. */
  MAX_PER_RUN: 3,
} as const;

// ---------------------------------------------------------------------------
// Difficulty curve (A4)
// ---------------------------------------------------------------------------

export const SPEED = {
  /** m/s at the start of a run. */
  START: 12,
  /** m/s cap. */
  MAX: 28,
  /** m/s gained per second of run time. */
  ACCELERATION: 0.1,
  /** Seconds to reach the cap: (MAX - START) / ACCELERATION. */
  RAMP_TIME: 160,
} as const;

export const ROW_GAP = {
  /** Seconds between barrier rows at the start of a run. */
  START: 1.4,
  /** Seconds between barrier rows at top speed. */
  MIN: 0.85,
  /** gapTime = START - SHRINK * progress. */
  SHRINK: 0.55,
  /** progress = (baseSpeed - SPEED.START) / PROGRESS_RANGE, 0..1. */
  PROGRESS_RANGE: 16,
} as const;

/** Run-time thresholds (s) where pattern tiers 1, 2 and 3 begin. */
export const TIER_THRESHOLDS = [40, 80, 120] as const;

export const FAIRNESS = {
  /** No barriers in the first seconds of a run. */
  NO_BARRIER_START_TIME: 3,
  /** Below this gap time (s), the next safe lane must be close to the current one. */
  CLOSE_GAP_TIME: 1.0,
  /** Maximum lanes between consecutive safe lanes when the gap is close. */
  MAX_SAFE_LANE_SHIFT: 1,
} as const;

// ---------------------------------------------------------------------------
// Star economy
// ---------------------------------------------------------------------------

export const ECONOMY = {
  /** Stars placed on the track per minute (spawner target). */
  STARS_PLACED_PER_MINUTE: 180,
  /** Share of placed stars a player is expected to collect. */
  EXPECTED_COLLECT_RATIO: 2 / 3,
  /** Stars a clean run earns per minute; all prices are set against this. */
  STARS_EARNED_PER_MINUTE: 120,
} as const;

/** Character prices in stars. 0 = free and owned from the start. */
export const CHARACTER_PRICES = {
  strawberry: 0,
  ginza: 0,
  chity: 500,
  kusto: 1500,
  sugar: 4000,
} as const;

/** Display names, in stage order. */
export const CHARACTER_NAMES = {
  strawberry: 'Strawberry',
  ginza: 'Ginza',
  chity: 'Chity',
  kusto: 'Kusto',
  sugar: 'Sugar',
} as const;

/** Character the hero starts as on a fresh save. */
export const DEFAULT_CHARACTER = 'strawberry';

/** Every signature move costs the same. */
export const SIGNATURE_MOVE_PRICE = 800;

/** Accessory tiers: price in stars and number of items at launch. */
export const ACCESSORY_TIERS = {
  simple: { PRICE: 150, COUNT: 4 },
  fancy: { PRICE: 300, COUNT: 4 },
  special: { PRICE: 600, COUNT: 2 },
} as const;

// ---------------------------------------------------------------------------
// Algorithms
// ---------------------------------------------------------------------------

/** World conventions: the hero stays at z = 0 and objects scroll toward +z. */
export const WORLD = {
  /** Objects spawn at this z. */
  SPAWN_Z: -120,
  /** Objects are recycled when z is greater than this. */
  RECYCLE_Z: 10,
} as const;

export const CAMERA = {
  POSITION: [0, 3.2, 6.5],
  LOOK_AT: [0, 1, -8],
  /** Vertical field of view in degrees. */
  FOV: 60,
  NEAR: 0.1,
  FAR: 200,
  /** The camera eases toward this share of the player's x (Prompt 1). */
  FOLLOW_X_FACTOR: 0.3,
  /** How fast the camera eases sideways, per second (tuning value). */
  FOLLOW_RATE: 8,
  /**
   * In portrait the view widens until it is at least this many degrees across,
   * so all three lanes always fit. Landscape keeps FOV unchanged.
   */
  MIN_HORIZONTAL_FOV: 52,
} as const;

/** A2. Input. */
export const INPUT = {
  /** Swipes shorter than this many pixels are taps and are ignored. */
  SWIPE_MIN_DISTANCE_PX: 30,
} as const;

/** A5. Spawner. */
export const SPAWNER = {
  /** Attempts to find a fair row before using the last one tried. */
  MAX_ATTEMPTS: 10,
  /**
   * Row patterns per tier. One cell per lane: '.' empty, 'L' low, 'H' high,
   * 'T' tall. Each tier includes the patterns of the tiers before it.
   * Patterns are shuffled across lanes when spawned.
   */
  PATTERNS: [
    ['L..', 'H..'],
    ['T..', 'LL.', 'LH.', 'HH.'],
    ['TL.', 'TH.', 'TT.'],
    ['TTL', 'TTH', 'LLL', 'TLH', 'HHH'],
  ],
  /** Seed for the run's random generator, so runs can be replayed in tests. */
  DEFAULT_SEED: 1,
} as const;

/** A5. spawnStars. */
export const STAR_SPAWN = {
  /** n = clamp(floor((rowDistance - ROW_CLEARANCE) / STARS.SPACING), LINE_MIN, LINE_MAX). */
  ROW_CLEARANCE: 6,
  /**
   * Stars start this many metres from the row, on the hero's side, and the
   * line runs toward the hero through the gap before the previous row.
   */
  LEAD_DISTANCE: 4,
  /** chance = clamp(STARS_PLACED_PER_MINUTE / (rowsPerMinute * n), MIN, MAX). */
  CHANCE_MIN: 0.2,
  CHANCE_MAX: 0.9,
  /** Height of a star line. */
  Y: 0.8,
  /** Extra stars placed in an arc over a low barrier. */
  ARC_COUNT: 5,
  /** Peak height of the arc. */
  ARC_PEAK_Y: 2.0,
} as const;

/** A6. Collision. */
export const COLLISION = {
  /** A low barrier hits only if the player's feet are below this (0.1 m forgiveness). */
  LOW_HIT_BELOW_Y: 0.7,
  /** A high barrier hits if the top of the player is above this. */
  HIGH_HIT_ABOVE_Y: 0.9,
  /** Stars within this distance of the player's centre are collected. */
  STAR_PICKUP_RADIUS: 0.9,
} as const;

/** A8. Pools and world scroll. */
export const POOLS = {
  BARRIERS: 40,
  STARS: 150,
  GROUND_CHUNKS: 6,
  /** Recent star pickups kept for the pop effect. */
  COLLECT_EVENTS: 16,
  /** Recent game cues (jump, hit, star...) kept for sound and effects. */
  CUES: 32,
} as const;

export const GROUND = {
  /** Chunk length along z. */
  CHUNK_LENGTH: 40,
  /** Chunk width along x (Blender asset spec). */
  CHUNK_WIDTH: 10,
  /** When a chunk passes this z it jumps to the far end of the line. */
  RECYCLE_Z: 40,
} as const;

/** A frame step never exceeds this many seconds: dt = min(real dt, MAX_DT). */
export const MAX_DT = 1 / 30;

/** A8. Save format. */
export const SAVE = {
  KEY: 'mvr-save-v1',
  VERSION: 1,
} as const;

// ---------------------------------------------------------------------------
// Rendering (not gameplay, kept here so no number is hard-coded elsewhere)
// ---------------------------------------------------------------------------

export const RENDER = {
  /** Device pixel ratio range; capped at 2 to keep iPads at 60 fps. */
  DPR: [1, 2],
  /** If the frame rate drops, the pixel ratio steps down by this much (and back up when it recovers). */
  DPR_STEP: 0.25,
  SKY_COLOR: '#bfe3ff',
  /** Grey-box player capsule. */
  PLAYER_COLOR: '#9b8cff',
  PLAYER_CAP_SEGMENTS: 8,
  PLAYER_RADIAL_SEGMENTS: 16,
  /** The player blinks this many times per second while safe after a hit. */
  BLINK_HZ: 8,
  /** How thick a high barrier counts as above its 0.9 m clearance, so stars are never placed inside it. */
  HIGH_BAR_THICKNESS: 0.5,
  /** Grey-box star: a flat five-point star, extruded. */
  STAR_RADIUS: 0.3,
  STAR_INNER_RATIO: 0.45,
  STAR_POINTS: 5,
  STAR_THICKNESS: 0.1,
  STAR_COLOR: '#ffd84d',
  BIG_STAR_COLOR: '#ff8fd0',
  BIG_STAR_SCALE: 1.8,
  /** Spin speed in radians per second. */
  STAR_SPIN: 3,
  /** Spin offset between pooled stars, so a line never turns edge-on all at once. */
  STAR_PHASE_STEP: 2.4,
  /** Pop when a star is collected. */
  STAR_POP_DURATION: 0.25,
  STAR_POP_END_SCALE: 2.2,
  /** Sphere detail for the star sparkle. */
  POP_SEGMENTS: 16,
  /** Fog is complete before the spawn point (126.5 m from the camera), so nothing pops into view. */
  FOG_NEAR: 45,
  FOG_FAR: 118,
  /** Day fog matches the sky dome's horizon. */
  FOG_COLOR: '#ffe6f2',
  AMBIENT_INTENSITY: 1.1,
  SUN_INTENSITY: 1.4,
  SUN_POSITION: [5, 10, 5],
  /** Rotation that lays a plane flat on the ground. */
  FLAT_ROTATION_X: -Math.PI / 2,
} as const;

// ---------------------------------------------------------------------------
// Screens (not gameplay)
// ---------------------------------------------------------------------------

export const SCREENS = {
  /** Sky-to-forest camera move, and night-to-day when a run starts (seconds). */
  TRANSITION_TIME: 0.8,
  /** Camera while the Landing artwork covers the screen: looking up into the sky. */
  SKY_CAMERA_POSITION: [0, 12, 7.5],
  SKY_LOOK_AT: [0, 15, -6],
  /** Camera on the character select stage. */
  SELECT_CAMERA_POSITION: [0, 2.6, 6.4],
  SELECT_LOOK_AT: [0, 0.55, 0],
} as const;

export const STAGE = {
  RADIUS: 3,
  HEIGHT: 0.3,
  PODIUM_RADIUS: 0.8,
  PODIUM_HEIGHT: 0.5,
  /** Characters stand on a ring this far from the centre. */
  RING_RADIUS: 2.2,
  /** Characters stand this much larger on the stage than in the run, so they fill it as in the reference art. */
  CHARACTER_SCALE: 1.45,
  /** How high the focused character hops onto the podium. */
  HOP_HEIGHT: 0.8,
  /** How fast the stage turns and the focus moves, per second. */
  ROTATE_RATE: 8,
  FOCUS_RATE: 6,
  SEGMENTS: 64,
  /** Pearly stage surface. */
  COLOR: '#e9e2ff',
  SHEEN_COLOR: '#ffd9f4',
  ROUGHNESS: 0.35,
  CLEARCOAT: 1,
  IRIDESCENCE: 0.7,
  GLOW_COLOR: '#9d86e8',
  GLOW_INTENSITY: 0.35,
  /** Stage top: pearl gradient with one curved groove between each character's slot. */
  TOP_TEXTURE_SIZE: 512,
  TOP_CENTER_COLOR: '#ffffff',
  TOP_EDGE_COLOR: '#d2c6f5',
  GROOVE_COLOR: 'rgba(120, 95, 200, 0.8)',
  GROOVE_HIGHLIGHT: 'rgba(255, 255, 255, 0.7)',
  /** How far each groove curls round, in radians, from the podium to the rim. */
  GROOVE_CURL: 0.55,
  GROOVE_WIDTH: 8,
  /** Glowing rims round the stage and podium edges. */
  RIM_COLOR: '#fbf3ff',
  RIM_THICKNESS: 0.035,
  RIM_TUBE_SEGMENTS: 8,
  RIM_RING_SEGMENTS: 128,
  /** Soft lilac glow on the ground under the stage, as a multiple of the stage radius. */
  POOL_SCALE: 2.6,
  POOL_COLOR: '#a98bff',
  POOL_OPACITY: 0.55,
  /** Moonbeams shining down onto the podium. */
  BEAM_COUNT: 3,
  BEAM_HEIGHT: 9,
  BEAM_TOP_RADIUS: 0.25,
  BEAM_BOTTOM_RADIUS: 1.5,
  BEAM_COLOR: '#efe6ff',
  BEAM_OPACITY: 0.16,
  /** Sideways tilt of the outer beams, in radians, and their slow sway. */
  BEAM_TILT: 0.22,
  BEAM_SWAY: 0.04,
  BEAM_SWAY_SPEED: 0.4,
  BEAM_SEGMENTS: 32,
  /** Price tag height above a locked character's head. */
  TAG_OFFSET: 0.35,
  /** Soft front light from the camera's side so the characters' faces read brightly. */
  KEY_LIGHT_COLOR: '#fff4ec',
  KEY_LIGHT_POSITION: [1.5, 4, 8],
  KEY_LIGHT_INTENSITY: 1.6,
  /** Soft light over the stage so the characters read at night. */
  LIGHT_POSITION: [0, 5, 3],
  LIGHT_INTENSITY: 40,
  LIGHT_DISTANCE: 15,
} as const;

export const NIGHT = {
  SKY_COLOR: '#141a3a',
  AMBIENT_INTENSITY: 0.35,
  SUN_INTENSITY: 0.3,
  TREE_COUNT: 16,
  TREE_MIN_DISTANCE: 7,
  TREE_MAX_DISTANCE: 14,
  TREE_HEIGHT: 4,
  TREE_RADIUS: 1.2,
  TRUNK_HEIGHT: 1,
  TRUNK_RADIUS: 0.2,
  TREE_COLOR: '#1f3b3a',
  TRUNK_COLOR: '#3a2a22',
  TREE_SEGMENTS: 8,
  FIREFLY_COUNT: 70,
  /** Fireflies drift inside a box around the stage, from this far out. */
  FIREFLY_SPREAD: 9,
  /** Nearest a firefly comes toward the camera (z), so none drift up close and look huge. */
  FIREFLY_MAX_Z: 3.5,
  FIREFLY_MIN_Y: 0.5,
  FIREFLY_MAX_Y: 3.5,
  FIREFLY_BOB: 0.25,
  FIREFLY_SPEED: 1.5,
  FIREFLY_SIZE: 0.32,
  FIREFLY_COLOR: '#ffe58a',
  /** Fireflies are drawn as small glowing stars. */
  FIREFLY_TEXTURE_SIZE: 64,
  FIREFLY_STAR_POINTS: 5,
  /** Inner radius of the star shape, as a share of its outer radius. */
  FIREFLY_STAR_INNER: 0.45,
  /** Painted forest behind the stage (public/ui/select/). Without it, the trees above stand in. */
  BACKDROP_DISTANCE: 40,
  /** Slight overscan so the edges never show while the camera settles. */
  BACKDROP_OVERSCAN: 1.04,
  /** Fixed seed so the forest looks the same every time. */
  SEED: 7,
} as const;

/** Placeholder capsule colours until the real models arrive (Phase 6). */
export const CHARACTER_COLORS = {
  strawberry: '#ff9ec7',
  ginza: '#b48cff',
  chity: '#ffe066',
  kusto: '#9fc3dd',
  sugar: '#ffffff',
} as const;

export const CHARACTER_POSES = {
  /** Locked characters stand as dark silhouettes. */
  LOCKED_COLOR: '#120d1f',
  /** The hero sits down dizzy on the Out screen: sideways tilt in radians. */
  OUT_TILT: 0.5,
  /** Celebration hop on a new best run. */
  CELEBRATE_HEIGHT: 0.5,
  CELEBRATE_RATE: 6,
} as const;

/**
 * Barriers built in code (used until a modelled GLB exists for a barrier).
 * Colours only; the shapes are in src/scene/barrierShapes.ts and are sized from
 * OBSTACLES, so they always match the hitboxes.
 */
export const BARRIER_LOOKS = {
  /** Sweet-wrapper colours for the candy pile, macarons and sprinkles. */
  SWEETS: ['#ff8fbc', '#ffe066', '#8fd3ff', '#b9a4ff', '#8fe3b0', '#ffab7a'],
  CREAM: '#fff6e6',
  WHITE: '#ffffff',
  CHERRY: '#ff5f86',
  WRAPPER: ['#ffd27a', '#fff0c2'],
  FROSTING: ['#ff9cc4', '#ffc4dd'],
  LOG: ['#ff8fbc', '#ffffff'],
  CLOUD: ['#ffc4dd', '#ffe1ee', '#ffffff'],
  DONUT: '#f2c58c',
  DONUT_ICING: '#ff9cc4',
  POLE: ['#ff6f91', '#ffffff'],
  BANNER: '#ffb3d9',
  BANNER_TRIM: '#fff07a',
  CAKE: ['#ff9cc4', '#fff6e6', '#c9a7ff'],
  JELLY: ['#8fe3b0', '#ffe066', '#ff9cc4'],
  PLATE: '#fff6e6',
} as const;

/** Objects built in code from simple parts (accessories, barriers, scenery). Cosmetic only. */
export const PARTS = {
  /** Segments around round parts: close-up shapes, and small or distant ones. */
  SMOOTH: 16,
  COARSE: 8,
  /** A soft, matt surface. */
  ROUGHNESS: 0.85,
} as const;

/**
 * Accessories built in code (used until a modelled GLB exists for an item).
 * Colours per item; the shapes are in src/scene/accessoryShapes.ts.
 */
export const ACCESSORY_LOOKS = {
  bow: { main: '#ff5c9a', dark: '#e0407f' },
  scarf: { main: '#ff8a65', stripe: '#fff3e0' },
  'flower-crown': { vine: '#8bd17c', centre: '#ffd84d', petals: ['#ff8fbc', '#ffffff', '#c9a4ff'] },
  'star-glasses': { frame: '#ffd84d', lens: '#ff7eb6' },
  cape: { main: '#e53950', trim: '#ffd84d' },
  'wizard-hat': { main: '#6a3fd0', band: '#ffd84d', stars: '#fff59d' },
  backpack: { main: '#7fdcc6', pocket: '#c9a4ff', flap: '#ff8fbc', straps: '#fff3e0', charm: '#ffd84d' },
  'party-hat': { bands: ['#26c6da', '#ffd84d', '#ff7eb6', '#c9a4ff'], trim: '#ffffff' },
  'sparkle-trail': { main: '#fff59d' },
  'glowing-wings': { main: '#d6f4ff', tip: '#ffc1e6', glow: '#8fe3ff' },
} as const;

/** How the moving accessory parts behave. Cosmetic only. */
export const ACCESSORY_MOTION = {
  /** Wings: resting sweep-back angle, flap size (radians) and flaps per second. */
  WING_REST: 0.55,
  WING_FLAP: 0.4,
  WING_RATE: 2.2,
  WING_GLOW: 0.7,
  /** Cape: how far it swings out behind standing still and running, flutter size (radians), flutters per second. */
  CAPE_REST: 0.06,
  CAPE_LIFT: 0.2,
  CAPE_FLUTTER: 0.12,
  CAPE_RATE: 1.6,
  /** Scarf tails: the same four settings. */
  SCARF_REST: 0.15,
  SCARF_LIFT: 0.95,
  SCARF_WAVE: 0.25,
  SCARF_RATE: 2.4,
  /** How much of the flutter and wave remains when standing still (0 to 1). */
  CALM: 0.3,
  /** Sparkles: twinkles per second and how far they shrink (0 to 1). */
  SPARKLE_RATE: 1.5,
  SPARKLE_SHRINK: 0.5,
  SPARKLE_GLOW: 0.9,
} as const;

/** Named points on each character where accessories attach (Blender asset spec: empties with these names). */
export type AttachPoint = 'acc_head' | 'acc_neck' | 'acc_back';

/**
 * How accessories fit a body, in metres. `head`, `neck`: radius; `eyes`: how far
 * below the top of the head the eyes sit; `face`: how far the face is in front of
 * the head's centre line; `shoulders`: half the shoulder width; `body`: size of
 * back items (cape, backpack, wings) compared with the grey-box capsule.
 */
export interface AccessoryFit {
  readonly head: number;
  readonly neck: number;
  readonly eyes: number;
  readonly face: number;
  readonly shoulders: number;
  readonly body: number;
}

/** The grey-box capsule, and any character without its own entry below. */
export const DEFAULT_FIT: AccessoryFit = { head: 0.35, neck: 0.35, eyes: 0.35, face: 0.35, shoulders: 0.33, body: 1 };

/**
 * Characters with a model: their fit, and each attach point as an offset in
 * metres (sideways, up, behind) from its joint on the resting model: the top
 * of the head from the head-end joint, the neck from the neck joint and the
 * upper back from the spine joint. Used when the model has no acc_head,
 * acc_neck and acc_back empties.
 */
export const MODEL_FITS: Readonly<Record<string, { fit: AccessoryFit; points: Record<AttachPoint, readonly [number, number, number]> }>> = {
  strawberry: {
    fit: { head: 0.17, neck: 0.09, eyes: 0.12, face: 0.15, shoulders: 0.16, body: 0.62 },
    points: { acc_head: [0, 0.06, -0.1], acc_neck: [0, 0.03, -0.06], acc_back: [0, -0.03, 0.07] },
  },
};

/** Where each attach point sits on the capsule, as a share of the hero's current height. */
export const ATTACH_HEIGHTS: Readonly<Record<AttachPoint, number>> = {
  acc_head: 1,
  acc_neck: 0.72,
  acc_back: 0.62,
};

/** Placeholder looks for the signature moves. Cosmetic only. */
export const MOVE_LOOKS = {
  /** Stretchy leap: extra height at the top of the jump. */
  STRETCH: 0.4,
  /** Victory punch: statue-like tilt at the top of the jump (radians). */
  PUNCH_TILT: 0.35,
  /** Brave glide: wings spread sideways and the body leans in the second half. */
  GLIDE_SPREAD: 0.9,
  GLIDE_TILT: 0.3,
  /** Clumsy tumble: full rolls during the slide. */
  TUMBLE_TURNS: 2,
  /** Trails (rainbow dash, sparkle trail): beads streaming behind the hero. */
  TRAIL_COUNT: 7,
  TRAIL_SPACING: 0.35,
  TRAIL_SIZE: 0.12,
  TRAIL_HEIGHT: 0.25,
  TRAIL_WOBBLE: 0.08,
  TRAIL_WOBBLE_RATE: 12,
  RAINBOW: ['#ff5252', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#7e57c2', '#ec407a'],
  SPARKLE_COLOR: '#fff59d',
  /** Sparkle trail twinkles: size (m), spin (radians per second) and how far they bob (m). */
  TWINKLE_SIZE: 0.22,
  TWINKLE_SPIN: 3,
  TWINKLE_BOB: 0.18,
  SEGMENTS: 8,
} as const;

// ---------------------------------------------------------------------------
// Art (Phase 6): models, lighting, valley
// ---------------------------------------------------------------------------

export const MODELS = {
  /** Cross-fade between animation clips (seconds). */
  CROSSFADE: 0.1,
  /** Run clip playback rate: 1.0 at the start speed, 1.6 at the top speed. */
  RUN_RATE_MIN: 1,
  RUN_RATE_MAX: 1.6,
  /** How long the Hit clip plays after a hit (asset spec: 0.5 s). */
  HIT_CLIP_TIME: 0.5,
  /** Blender exports face +z, toward the camera; turn them to run away from it. */
  FACES_CAMERA: true,
  FACE_AWAY_YAW: Math.PI,
  /** A clip whose root bone faces further than this (radians) from its rest heading is turned back to face forward. */
  HEADING_TOLERANCE: 0.15,
  /**
   * Auto-rigged idles often look around, turning the hips, spine and head far
   * to each side (Meshy's default idle swings about 45 degrees). In the Idle
   * clip, those bones keep only this share of their turn, so the character
   * stays facing forward on the stage while still moving.
   */
  IDLE_TURN_KEEP: 0.3,
  IDLE_STEADY_BONES: ['Hips', 'Spine', 'Neck', 'Head'],
  /** Files downloaded at once while loading. */
  PARALLEL_LOADS: 6,
} as const;

export const LIGHTING = {
  /** Bright pastel daylight: a hemisphere light plus one soft directional light. */
  HEMI_SKY_COLOR: '#fff6fb',
  HEMI_GROUND_COLOR: '#d9c4ff',
  /** With the sun, this lights an upward-facing surface at exactly its own colour. */
  HEMI_DAY_INTENSITY: 2,
  HEMI_NIGHT_INTENSITY: 0.45,
  SUN_COLOR: '#fff1d6',
} as const;

export const BLOB_SHADOW = {
  RADIUS: 0.5,
  OPACITY: 0.35,
  /** The shadow shrinks and fades as the hero rises: gone at this height. */
  FADE_HEIGHT: 3,
  LIFT: 0.03,
  TEXTURE_SIZE: 64,
} as const;

export const VALLEY = {
  /** Side scenery per 40 m ground chunk, recycled with the chunk. */
  SCENERY_PER_CHUNK: 22,
  /** Scenery stays at least 5 m from the centre line (asset spec). */
  SCENERY_MIN_X: 5.9,
  SCENERY_MAX_X: 14,
  /** Landscape screens see further to the sides: a second band of scenery out there. */
  FAR_SCENERY_PER_CHUNK: 12,
  FAR_SCENERY_MIN_X: 15,
  FAR_SCENERY_MAX_X: 36,
  SCENERY_MIN_SCALE: 0.8,
  SCENERY_MAX_SCALE: 1.3,
  /**
   * Scenery built in code. `weight`: how often it is chosen; `near` / `far`: which
   * band it may stand in; `minX`: tall things keep further from the path; `sway`:
   * how far it leans in the breeze (radians); `bob`: how far it floats up and down (m).
   */
  SCENERY: {
    'bubble-tree': { weight: 4, near: true, far: true, minX: 7.5, sway: 0.025, bob: 0 },
    'blossom-tree': { weight: 4, near: true, far: true, minX: 7.5, sway: 0.025, bob: 0 },
    'mint-tree': { weight: 3, near: true, far: true, minX: 7.5, sway: 0.02, bob: 0 },
    lollipop: { weight: 3, near: true, far: true, minX: 6.5, sway: 0.03, bob: 0 },
    'swirl-pop': { weight: 2, near: true, far: true, minX: 6.5, sway: 0.03, bob: 0 },
    'candy-cane': { weight: 3, near: true, far: false, minX: 6.2, sway: 0, bob: 0 },
    'spotty-mushroom': { weight: 4, near: true, far: false, minX: 0, sway: 0, bob: 0 },
    'mushroom-pair': { weight: 3, near: true, far: false, minX: 0, sway: 0, bob: 0 },
    tulips: { weight: 6, near: true, far: false, minX: 0, sway: 0.06, bob: 0 },
    daisies: { weight: 6, near: true, far: false, minX: 0, sway: 0.06, bob: 0 },
    'berry-bush': { weight: 4, near: true, far: true, minX: 0, sway: 0, bob: 0 },
    rocks: { weight: 2, near: true, far: true, minX: 0, sway: 0, bob: 0 },
    cottage: { weight: 2, near: false, far: true, minX: 0, sway: 0, bob: 0 },
    balloons: { weight: 1.5, near: true, far: true, minX: 8, sway: 0.08, bob: 0.25 },
  },
  /** Sways and bobs per second. */
  SWAY_RATE: 0.35,
  /** Candy lamp posts beside the path, this many on each side per chunk, alternating sides. */
  LAMP_POSTS_PER_CHUNK: 2,
  LAMP_POST_X: 5.55,
  /** Shared scenery colours. */
  COLORS: {
    TRUNK: '#c9a27e',
    LILAC: ['#c9a7ff', '#dcc6ff', '#b592f5'],
    PINK: ['#ffb3d1', '#ffd0e2', '#ff93bd'],
    MINT: ['#9fe7c8', '#c1f2dc', '#7fd9b4'],
    LEAF: ['#8fdc86', '#a9e89c'],
    STEM: '#fff3e0',
    CREAM: '#fff6e6',
    WHITE: '#ffffff',
    RED: '#ff6f91',
    YELLOW: '#ffe066',
    BLUE: '#8fd3ff',
    ROCK: ['#e6ddf2', '#d5c9ea'],
    GLOW: '#fff3b0',
  },
  /** Grass on each side of the path, beyond the 10 m ground chunk. */
  GRASS_WIDTH: 40,
  /**
   * The candy path, drawn once as a square tile that repeats along the chunk.
   * Lengths are in metres; the tile is one chunk-width square.
   */
  PATH: {
    TILE_PIXELS: 512,
    /** The three lanes: paving stones in a few close pinks, with icing dashes between lanes. */
    STONE_COLORS: ['#fff3f8', '#ffe9f2', '#fff7ee', '#fdeafb'],
    GROUT_COLOR: '#ffb9d8',
    STONE_LENGTH: 1.25,
    STONE_GAP: 0.07,
    STONE_ROUND: 0.16,
    DASH_COLOR: '#c9a7ff',
    DASH_WIDTH: 0.1,
    DASH_LENGTH: 1.1,
    DASH_PERIOD: 2.5,
    /** Candy-stripe band along each side of the lanes. */
    EDGE_COLORS: ['#ff8fbc', '#ffffff'],
    EDGE_WIDTH: 0.28,
    EDGE_STRIPE: 0.5,
    /** Biscuit shoulders between the lanes and the grass, scattered with sprinkles. */
    SHOULDER_COLOR: '#ffefd2',
    SHOULDER_SPECK_COLOR: '#f9dcae',
    SPRINKLE_COLORS: ['#ff8fbc', '#8fd3ff', '#fff07a', '#b9a4ff', '#8fe39a'],
    SPRINKLES: 70,
    SPECKS: 260,
  },
  /** Raised kerb blocks along both edges of the path, in alternating colours. */
  KERB: { WIDTH: 0.3, HEIGHT: 0.16, LENGTH: 1, COLORS: ['#ff9cc4', '#fff6fb'] },
  /** The meadow, drawn once as a square tile GRASS_TILE metres across that repeats. */
  GRASS: {
    TILE_PIXELS: 512,
    TILE: 10,
    COLOR: '#a8ea9a',
    PATCH_COLORS: ['#98e28c', '#b9f0a6', '#a0e6a8'],
    PATCHES: 46,
    TUFT_COLOR: '#7fd47c',
    TUFTS: 320,
    DOT_COLORS: ['#ffffff', '#ff9ec7', '#fff07a', '#c9a7ff'],
    DOTS: 110,
  },
  /** Texture sharpness at grazing angles (capped by the device). */
  ANISOTROPY: 8,
  /** Sky dome: gradient sphere around the camera when there is no sky model. */
  SKY_RADIUS: 170,
  SKY_TOP_COLOR: '#69bfff',
  SKY_HORIZON_COLOR: '#ffe9f3',
  /**
   * Backdrop around the sky dome: it follows the camera, so it never gets closer.
   * Angles are in degrees: `turn` is measured from straight ahead (negative = left), `up` from the horizon.
   */
  BACKDROP_RADIUS: 150,
  /** Rolling hills, far ridge first. `height` and `roll` in metres; each fades into the horizon at its foot. */
  HILLS: [
    { color: '#c3bfff', height: 13, roll: 5, seed: 1 },
    { color: '#a9e2cf', height: 8, roll: 3.5, seed: 2 },
    { color: '#9fe2a0', height: 4, roll: 2, seed: 3 },
  ],
  HILL_FOOT: -10,
  HILL_SEGMENTS: 120,
  /** Puffy clouds: white on top, pink underneath, drifting slowly round the sky. */
  CLOUD_COUNT: 18,
  CLOUD_TOP_COLOR: '#ffffff',
  CLOUD_UNDER_COLOR: '#ffd3e8',
  CLOUD_MIN_UP: 6,
  CLOUD_MAX_UP: 26,
  CLOUD_MIN_SIZE: 9,
  CLOUD_MAX_SIZE: 20,
  /** Degrees per second. */
  CLOUD_DRIFT: 0.25,
  SUN: { turn: -24, up: 14, size: 7, glow: 17, glowOpacity: 0.45, color: '#fff8cf', glowColor: '#ffe9a8' },
  RAINBOW: {
    turn: 14,
    radius: 46,
    width: 9,
    /** How far its centre sits below the horizon (m). */
    sink: 6,
    opacity: 0.55,
    colors: ['#ff8a9a', '#ffb27a', '#fff07a', '#8fe39a', '#7ecbff', '#a99bff', '#e39bff'],
  },
  /** Butterflies and sparkles drifting over the valley, scrolling with the world. */
  BUTTERFLY_COUNT: 40,
  BUTTERFLY_SIZE: 0.3,
  /** Wing beats per second, and how far the wings open and close (radians). */
  BUTTERFLY_FLAP_RATE: 5,
  BUTTERFLY_FLAP: 1.1,
  BUTTERFLY_COLORS: ['#ff7eb6', '#b48cff', '#ffc94d', '#6ec6ff', '#ffffff'],
  SPARKLE_COUNT: 120,
  SPARKLE_SIZE: 0.12,
  SPARKLE_COLOR: '#ffffff',
  PARTICLE_MIN_X: 3,
  PARTICLE_MAX_X: 14,
  PARTICLE_MIN_Y: 0.5,
  PARTICLE_MAX_Y: 6,
  PARTICLE_BOB: 0.4,
  PARTICLE_BOB_RATE: 2,
  SEED: 11,
} as const;

// ---------------------------------------------------------------------------
// Sound and effects (Phase 7)
// ---------------------------------------------------------------------------

export const AUDIO = {
  /** Star pickups in quick succession rise by this many semitones each... */
  STAR_PITCH_STEP: 1,
  /** ...up to this many steps... */
  STAR_PITCH_MAX_STEPS: 12,
  /** ...and start again after this many seconds without a star. */
  STAR_CHAIN_RESET: 1,
  MUSIC_VOLUME: 0.5,
  SOUND_VOLUME: 0.9,
  /** Music is quieter while paused. */
  PAUSED_MUSIC_FACTOR: 0.35,
  /** Seconds to fade between the menu and run tracks, or a toggle. */
  MUSIC_FADE: 0.6,
} as const;

export const EFFECTS = {
  /** Sprinkle burst on a hit. */
  SPRINKLE_COUNT: 28,
  SPRINKLE_LIFE: 0.7,
  /** Sideways and upward launch speeds (m/s), random within these ranges. */
  SPRINKLE_SPEED_MIN: 2,
  SPRINKLE_SPEED: 5,
  SPRINKLE_UP_MIN: 2,
  SPRINKLE_UP: 6,
  /** Launch height above the hero's feet. */
  SPRINKLE_START_Y: 0.4,
  /** Fastest tumble (radians per second). */
  SPRINKLE_SPIN: 12,
  SPRINKLE_GRAVITY: 14,
  SPRINKLE_SIZE: [0.06, 0.06, 0.22],
  SPRINKLE_COLORS: ['#ff8fc7', '#ffd27a', '#9fe7ff', '#c9a7ff', '#b8f0d8', '#ffffff'],
  /** Speed lines above this speed (m/s), fully visible at the top speed. */
  SPEED_LINES_FROM: 24,
  SPEED_LINE_COUNT: 36,
  SPEED_LINE_LENGTH: 3,
  SPEED_LINE_WIDTH: 0.03,
  SPEED_LINE_MIN_X: 2.5,
  SPEED_LINE_MAX_X: 6,
  SPEED_LINE_MIN_Y: 0.4,
  SPEED_LINE_MAX_Y: 4.5,
  /** Lines live between these z values, close to the camera. */
  SPEED_LINE_FAR_Z: -40,
  SPEED_LINE_NEAR_Z: 7,
  /** Lines move this many times faster than the world, to read as streaks. */
  SPEED_LINE_RUSH: 1.6,
  SPEED_LINE_OPACITY: 0.55,
  /** Camera shake on a hit: this many frames, this far (metres). */
  SHAKE_FRAMES: 3,
  SHAKE_AMOUNT: 0.18,
  /** Dust puff on landing. */
  DUST_COUNT: 10,
  DUST_LIFE: 0.4,
  /** How far the dust spreads sideways and along the track, and how much it rises. */
  DUST_SPREAD_X: 1.4,
  DUST_SPREAD_Z: 0.7,
  DUST_RISE: 0.3,
  DUST_START_Y: 0.1,
  DUST_SIZE: 0.75,
  DUST_COLOR: '#cfa3b8',
  SEED: 23,
} as const;

export const DEBUG = {
  /** KeyboardEvent.code that shows or hides the debug panel. */
  TOGGLE_KEY: 'Backquote',
  /** How often the debug panel refreshes, in milliseconds. */
  REFRESH_MS: 200,
  /** Smoothing factor for the fps reading (0..1, higher reacts faster). */
  FPS_SMOOTHING: 0.1,
  /** Decimal places shown in the panel. */
  DECIMALS: 2,
  /** Stars per minute in the panel are measured over this many recent seconds. */
  RATE_WINDOW_SECONDS: 60,
  /** Stars added by the development-only debug button. */
  ADD_STARS: 1000,
  /** Touches that toggle the debug panel on a tablet (development only). */
  TOGGLE_TOUCHES: 3,
} as const;
