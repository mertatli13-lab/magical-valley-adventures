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
  /** Pop effect when a barrier is hit. */
  POP_COLOR: '#fff2a8',
  POP_DURATION: 0.35,
  POP_START_SCALE: 0.5,
  POP_END_SCALE: 2.5,
  POP_SEGMENTS: 16,
  FOG_NEAR: 60,
  FOG_FAR: 130,
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
} as const;
