import { CHARACTER_NAMES, CHARACTER_PRICES } from '../config';

export type CharacterId = keyof typeof CHARACTER_PRICES;

export interface CharacterInfo {
  id: CharacterId;
  name: string;
  price: number;
}

/** The five characters in stage order, with names and prices from the design. */
export const CHARACTERS: readonly CharacterInfo[] = (Object.keys(CHARACTER_NAMES) as CharacterId[]).map((id) => ({
  id,
  name: CHARACTER_NAMES[id],
  price: CHARACTER_PRICES[id],
}));

/** Characters that cost nothing are owned from the start. */
export const FREE_CHARACTERS: readonly CharacterId[] = CHARACTERS.filter((c) => c.price === 0).map((c) => c.id);

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && Object.hasOwn(CHARACTER_PRICES, value);
}
