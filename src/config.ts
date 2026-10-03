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
  GROUND_COLOR: '#f7d6e6',
  /** Grey-box lane stripes: width of each stripe inside its 2 m lane. */
  LANE_STRIPE_WIDTH: 1.7,
  LANE_STRIPE_COLOR: '#fbe9f1',
  /** Cross bands on each chunk so the scrolling is easy to see. */
  BANDS_PER_CHUNK: 4,
  BAND_DEPTH: 0.5,
  BAND_COLOR: '#efc3d8',
  /** Small heights that stop stripes and bands flickering against the ground. */
  STRIPE_LIFT: 0.01,
  BAND_LIFT: 0.02,
  /** Grey-box player capsule. */
  PLAYER_COLOR: '#9b8cff',
  PLAYER_CAP_SEGMENTS: 8,
  PLAYER_RADIAL_SEGMENTS: 16,
  /** The player blinks this many times per second while safe after a hit. */
  BLINK_HZ: 8,
  /** Grey-box barriers. */
  LOW_COLOR: '#ff9ec7',
  HIGH_COLOR: '#8fd3ff',
  TALL_COLOR: '#b48cff',
  /** Thickness of the grey-box high bar above its 0.9 m clearance. */
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
  SUN_INTENSITY: 1.2,
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
  SELECT_CAMERA_POSITION: [0, 2.6, 7.5],
  SELECT_LOOK_AT: [0, 1, 0],
} as const;

export const STAGE = {
  RADIUS: 3,
  HEIGHT: 0.3,
  PODIUM_RADIUS: 0.8,
  PODIUM_HEIGHT: 0.5,
  /** Characters stand on a ring this far from the centre. */
  RING_RADIUS: 2.2,
  /** How high the focused character hops onto the podium. */
  HOP_HEIGHT: 0.8,
  /** How fast the stage turns and the focus moves, per second. */
  ROTATE_RATE: 8,
  FOCUS_RATE: 6,
  SEGMENTS: 48,
  COLOR: '#3b2d6b',
  GLOW_COLOR: '#8f6bff',
  GLOW_INTENSITY: 0.6,
  /** Price tag height above a locked character's head. */
  TAG_OFFSET: 0.35,
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
  FIREFLY_COUNT: 40,
  /** Fireflies drift inside a box around the stage, from this far out. */
  FIREFLY_SPREAD: 9,
  FIREFLY_MIN_Y: 0.5,
  FIREFLY_MAX_Y: 3.5,
  FIREFLY_BOB: 0.25,
  FIREFLY_SPEED: 1.5,
  FIREFLY_SIZE: 0.15,
  FIREFLY_COLOR: '#fff59d',
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
 * Placeholder accessories until the real models arrive (Phase 6). Each is a
 * simple shape at its attach point: `size` is [width, height, depth] for a
 * box, [radius, height] for a cone, [radius, tube] for a torus and [radius]
 * for a sphere. `lift` raises it and `back` moves it behind the hero (+z).
 */
export const ACCESSORY_LOOKS = {
  bow: { shape: 'box', color: '#ff5c9a', size: [0.32, 0.14, 0.1], lift: 0.02, back: 0 },
  scarf: { shape: 'torus', color: '#ff8a65', size: [0.3, 0.07], lift: 0, back: 0 },
  'flower-crown': { shape: 'torus', color: '#ffb3d9', size: [0.24, 0.06], lift: 0, back: 0 },
  'star-glasses': { shape: 'box', color: '#ffd84d', size: [0.5, 0.12, 0.05], lift: -0.2, back: -0.32 },
  cape: { shape: 'box', color: '#e53935', size: [0.6, 0.75, 0.04], lift: -0.3, back: 0.38 },
  'wizard-hat': { shape: 'cone', color: '#5e35b1', size: [0.3, 0.6], lift: 0.3, back: 0 },
  backpack: { shape: 'box', color: '#a1887f', size: [0.42, 0.45, 0.2], lift: -0.1, back: 0.42 },
  'party-hat': { shape: 'cone', color: '#26c6da', size: [0.2, 0.45], lift: 0.22, back: 0 },
  'sparkle-trail': { shape: 'sphere', color: '#fff59d', size: [0.1], lift: 0, back: 0.4 },
  'glowing-wings': { shape: 'box', color: '#e1f5fe', size: [1, 0.4, 0.04], lift: 0, back: 0.38 },
} as const;

/** Where each attach point sits, as a share of the hero's current height. */
export const ATTACH_HEIGHTS = {
  acc_head: 1,
  acc_neck: 0.72,
  acc_back: 0.62,
} as const;

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
  /** Files downloaded at once while loading. */
  PARALLEL_LOADS: 6,
} as const;

export const LIGHTING = {
  /** Bright pastel daylight: a hemisphere light plus one soft directional light. */
  HEMI_SKY_COLOR: '#fff6fb',
  HEMI_GROUND_COLOR: '#d9c4ff',
  HEMI_DAY_INTENSITY: 1.6,
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
  SCENERY_PER_CHUNK: 10,
  /** Scenery stays at least 5 m from the centre line (asset spec). */
  SCENERY_MIN_X: 5.5,
  SCENERY_MAX_X: 13,
  /** Landscape screens see further to the sides: a second band of scenery out there. */
  FAR_SCENERY_PER_CHUNK: 8,
  FAR_SCENERY_MIN_X: 15,
  FAR_SCENERY_MAX_X: 32,
  SCENERY_MIN_SCALE: 0.8,
  SCENERY_MAX_SCALE: 1.3,
  /** Grass on each side of the path, beyond the 10 m ground chunk. */
  GRASS_WIDTH: 40,
  GRASS_COLOR: '#c8f0d0',
  /** Placeholder scenery: pastel trees, mushrooms and flowers. */
  TREE_TRUNK: [0.15, 1.2],
  TREE_CROWN: 0.9,
  MUSHROOM_STEM: [0.15, 0.5],
  MUSHROOM_CAP: 0.4,
  FLOWER_SIZE: 0.18,
  TRUNK_COLOR: '#c9a27e',
  STEM_COLOR: '#fff3e0',
  CROWN_COLORS: ['#d7b8ff', '#b8f0d8', '#ffc9e3'],
  CAP_COLORS: ['#ff9ec7', '#ffd27a', '#b8a6ff'],
  FLOWER_COLORS: ['#ff8fc7', '#fff07a', '#9fe7ff', '#ffffff'],
  SEGMENTS: 10,
  /** Sky dome: gradient sphere around the camera when there is no sky model. */
  SKY_RADIUS: 170,
  SKY_TOP_COLOR: '#8fd0ff',
  SKY_HORIZON_COLOR: '#ffe6f2',
  /** Butterflies and sparkles drifting over the valley, scrolling with the world. */
  BUTTERFLY_COUNT: 40,
  BUTTERFLY_SIZE: 0.35,
  BUTTERFLY_COLORS: ['#ff8fc7', '#c9a7ff', '#ffd27a'],
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
