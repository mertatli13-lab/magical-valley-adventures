import { ACCESSORY_TIERS, CHARACTER_NAMES, CHARACTER_PRICES, SIGNATURE_MOVE_PRICE, type AttachPoint } from '../config';

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Signature moves: cosmetic only, they never change timing or hitboxes
// ---------------------------------------------------------------------------

export interface SignatureMoveInfo {
  id: string;
  name: string;
  character: CharacterId;
  /** The normal animation it replaces. */
  replaces: 'jump' | 'slide';
  price: number;
}

export const SIGNATURE_MOVES: readonly SignatureMoveInfo[] = [
  { id: 'stretchy-leap', name: 'Stretchy leap', character: 'strawberry', replaces: 'jump', price: SIGNATURE_MOVE_PRICE },
  { id: 'clumsy-tumble', name: 'Clumsy tumble', character: 'ginza', replaces: 'slide', price: SIGNATURE_MOVE_PRICE },
  { id: 'victory-punch', name: 'Victory punch', character: 'chity', replaces: 'jump', price: SIGNATURE_MOVE_PRICE },
  { id: 'brave-glide', name: 'Brave glide', character: 'kusto', replaces: 'jump', price: SIGNATURE_MOVE_PRICE },
  { id: 'rainbow-dash', name: 'Rainbow dash', character: 'sugar', replaces: 'slide', price: SIGNATURE_MOVE_PRICE },
];

export type SignatureMoveId = (typeof SIGNATURE_MOVES)[number]['id'];

/** The signature move of each character. */
export function moveFor(character: CharacterId): SignatureMoveInfo | undefined {
  return SIGNATURE_MOVES.find((move) => move.character === character);
}

// ---------------------------------------------------------------------------
// Accessories: any character can wear one
// ---------------------------------------------------------------------------

export type AccessoryTier = keyof typeof ACCESSORY_TIERS;

export type { AttachPoint };

export interface AccessoryInfo {
  id: string;
  name: string;
  tier: AccessoryTier;
  attach: AttachPoint;
  price: number;
}

function accessory(id: string, name: string, tier: AccessoryTier, attach: AttachPoint): AccessoryInfo {
  return { id, name, tier, attach, price: ACCESSORY_TIERS[tier].PRICE };
}

/** The launch set of ten accessories. */
export const ACCESSORIES: readonly AccessoryInfo[] = [
  accessory('bow', 'Bow', 'simple', 'acc_head'),
  accessory('scarf', 'Scarf', 'simple', 'acc_neck'),
  accessory('flower-crown', 'Flower crown', 'simple', 'acc_head'),
  accessory('star-glasses', 'Star glasses', 'simple', 'acc_head'),
  accessory('cape', 'Cape', 'fancy', 'acc_back'),
  accessory('wizard-hat', 'Wizard hat', 'fancy', 'acc_head'),
  accessory('backpack', 'Backpack', 'fancy', 'acc_back'),
  accessory('party-hat', 'Party hat', 'fancy', 'acc_head'),
  accessory('sparkle-trail', 'Sparkle trail', 'special', 'acc_back'),
  accessory('glowing-wings', 'Glowing wings', 'special', 'acc_back'),
];

export function isAccessoryId(value: unknown): boolean {
  return ACCESSORIES.some((item) => item.id === value);
}

export function isMoveId(value: unknown): boolean {
  return SIGNATURE_MOVES.some((move) => move.id === value);
}

// ---------------------------------------------------------------------------
// Shop items
// ---------------------------------------------------------------------------

export type ItemKind = 'character' | 'accessory' | 'move';

export function priceOf(kind: ItemKind, id: string): number | undefined {
  const list: readonly { id: string; price: number }[] =
    kind === 'character' ? CHARACTERS : kind === 'accessory' ? ACCESSORIES : SIGNATURE_MOVES;
  return list.find((item) => item.id === id)?.price;
}
