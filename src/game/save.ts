import { DEFAULT_CHARACTER, SAVE } from '../config';
import { FREE_CHARACTERS, isCharacterId, type CharacterId } from './catalogue';

/** The save format from A8. */
export interface SaveData {
  version: typeof SAVE.VERSION;
  totalStars: number;
  bestRun: number;
  owned: { characters: CharacterId[]; accessories: string[]; moves: string[] };
  equipped: { character: CharacterId; accessory: string | null; moves: Record<string, boolean> };
  settings: { music: boolean; sound: boolean };
}

/** The part of localStorage the game uses, so tests can pass an in-memory store. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultSave(): SaveData {
  return {
    version: SAVE.VERSION,
    totalStars: 0,
    bestRun: 0,
    owned: { characters: [...FREE_CHARACTERS], accessories: [], moves: [] },
    equipped: { character: DEFAULT_CHARACTER, accessory: null, moves: {} },
    settings: { music: true, sound: true },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'boolean');
}

/**
 * Reads a save. A missing, unreadable or wrongly shaped save starts fresh.
 * Never throws.
 */
export function parseSave(raw: string | null): SaveData {
  if (raw === null) return defaultSave();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaultSave();
  }
  if (!isRecord(data) || data.version !== SAVE.VERSION) return defaultSave();
  const { owned, equipped, settings } = data;
  if (
    !isCount(data.totalStars) ||
    !isCount(data.bestRun) ||
    !isRecord(owned) ||
    !isStringArray(owned.characters) ||
    !isStringArray(owned.accessories) ||
    !isStringArray(owned.moves) ||
    !isRecord(equipped) ||
    !(equipped.accessory === null || typeof equipped.accessory === 'string') ||
    !isBooleanRecord(equipped.moves) ||
    !isRecord(settings) ||
    typeof settings.music !== 'boolean' ||
    typeof settings.sound !== 'boolean'
  ) {
    return defaultSave();
  }
  // Unknown character ids are ignored; free characters are always owned.
  const characters = [...new Set([...FREE_CHARACTERS, ...owned.characters.filter(isCharacterId)])];
  const character =
    isCharacterId(equipped.character) && characters.includes(equipped.character)
      ? equipped.character
      : DEFAULT_CHARACTER;
  return {
    version: SAVE.VERSION,
    totalStars: data.totalStars,
    bestRun: data.bestRun,
    owned: { characters, accessories: owned.accessories, moves: owned.moves },
    equipped: { character, accessory: equipped.accessory, moves: equipped.moves },
    settings: { music: settings.music, sound: settings.sound },
  };
}

/** Loads the save, or a fresh one if storage is missing or blocked (e.g. private browsing). */
export function loadSave(storage: StorageLike | null): SaveData {
  if (!storage) return defaultSave();
  try {
    return parseSave(storage.getItem(SAVE.KEY));
  } catch {
    return defaultSave();
  }
}

/** Writes the save. Returns false if storage is missing, full or blocked. */
export function writeSave(storage: StorageLike | null, data: SaveData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE.KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
