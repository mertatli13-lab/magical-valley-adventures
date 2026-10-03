import { describe, expect, it } from 'vitest';
import { ACCESSORY_TIERS, SIGNATURE_MOVE_PRICE } from '../config';
import { ACCESSORIES, CHARACTERS, moveFor, SIGNATURE_MOVES, type CharacterId } from './catalogue';
import { applyAction } from './player';
import { defaultSave, parseSave, writeSave, type SaveData, type StorageLike } from './save';
import { Session } from './session';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

function sessionWith(save: Partial<SaveData> = {}, storage = new MemoryStorage()): Session {
  writeSave(storage, { ...defaultSave(), ...save });
  return new Session(storage);
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('catalogue', () => {
  it('has five characters, five signature moves and ten accessories', () => {
    expect(CHARACTERS).toHaveLength(5);
    expect(SIGNATURE_MOVES).toHaveLength(5);
    expect(ACCESSORIES).toHaveLength(10);
  });

  it('has one signature move per character, each costing 800', () => {
    for (const character of CHARACTERS) expect(moveFor(character.id)?.price).toBe(SIGNATURE_MOVE_PRICE);
    expect(SIGNATURE_MOVES.map((m) => m.name)).toEqual([
      'Stretchy leap',
      'Clumsy tumble',
      'Victory punch',
      'Brave glide',
      'Rainbow dash',
    ]);
  });

  it('accessory tiers match the design: 4 x 150, 4 x 300, 2 x 600', () => {
    for (const [tier, { PRICE, COUNT }] of Object.entries(ACCESSORY_TIERS)) {
      const items = ACCESSORIES.filter((a) => a.tier === tier);
      expect(items).toHaveLength(COUNT);
      expect(items.every((a) => a.price === PRICE)).toBe(true);
    }
  });

  it('prices add up to 6,000 + 4,000 + 3,000 = 13,000', () => {
    const characters = sum(CHARACTERS.map((c) => c.price));
    const moves = sum(SIGNATURE_MOVES.map((m) => m.price));
    const accessories = sum(ACCESSORIES.map((a) => a.price));
    expect([characters, moves, accessories]).toEqual([6000, 4000, 3000]);
  });

  it('ids are unique', () => {
    const ids = [...CHARACTERS, ...SIGNATURE_MOVES, ...ACCESSORIES].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('buying', () => {
  it('Strawberry and Ginza are owned from the start', () => {
    const session = new Session(new MemoryStorage());
    expect(CHARACTERS.filter((c) => session.isOwned('character', c.id)).map((c) => c.id)).toEqual([
      'strawberry',
      'ginza',
    ]);
  });

  it('cannot buy without enough stars', () => {
    const session = sessionWith({ totalStars: 499 });
    expect(session.buy('character', 'chity')).toBe(false);
    expect(session.isOwned('character', 'chity')).toBe(false);
    expect(session.save.totalStars).toBe(499);
  });

  it('cannot buy twice', () => {
    const session = sessionWith({ totalStars: 1000 });
    expect(session.buy('character', 'chity')).toBe(true);
    expect(session.buy('character', 'chity')).toBe(false);
    expect(session.save.totalStars).toBe(500);
    expect(session.save.owned.characters.filter((id) => id === 'chity')).toHaveLength(1);
    expect(session.buy('character', 'strawberry')).toBe(false); // already owned for free
  });

  it.each([
    ['character', 'kusto', 1500],
    ['accessory', 'bow', 150],
    ['accessory', 'cape', 300],
    ['accessory', 'glowing-wings', 600],
    ['move', 'stretchy-leap', 800],
  ] as const)('buying a %s (%s) deducts exactly %i', (kind, id, price) => {
    const session = sessionWith({ totalStars: 5000 });
    expect(session.buy(kind, id)).toBe(true);
    expect(session.save.totalStars).toBe(5000 - price);
    expect(session.isOwned(kind, id)).toBe(true);
  });

  it('a signature move can only be bought for an owned character', () => {
    const session = sessionWith({ totalStars: 5000 });
    expect(session.buy('move', 'victory-punch')).toBe(false); // Chity is locked
    session.buy('character', 'chity');
    expect(session.buy('move', 'victory-punch')).toBe(true);
  });

  it('refuses unknown items', () => {
    const session = sessionWith({ totalStars: 5000 });
    expect(session.buy('accessory', 'crown-of-doom')).toBe(false);
    expect(session.save.totalStars).toBe(5000);
  });
});

describe('equipping', () => {
  it('only owned items can be equipped', () => {
    const session = sessionWith({ totalStars: 0 });
    expect(session.equipCharacter('sugar')).toBe(false);
    expect(session.equipAccessory('cape')).toBe(false);
    expect(session.setMoveOn('rainbow-dash', true)).toBe(false);
  });

  it('a signature move is switched on and off per character', () => {
    const session = sessionWith({ totalStars: 2000 });
    session.buy('move', 'stretchy-leap');
    session.buy('move', 'clumsy-tumble');
    session.setMoveOn('stretchy-leap', true);
    expect(session.isMoveOn('stretchy-leap')).toBe(true);
    expect(session.isMoveOn('clumsy-tumble')).toBe(false);
    session.equipCharacter('strawberry');
    expect(session.activeMove?.id).toBe('stretchy-leap');
    session.equipCharacter('ginza');
    expect(session.activeMove).toBeUndefined();
    session.setMoveOn('stretchy-leap', false);
    session.equipCharacter('strawberry');
    expect(session.activeMove).toBeUndefined();
  });

  it('equip state persists after reload', () => {
    const storage = new MemoryStorage();
    const session = sessionWith({ totalStars: 5000 }, storage);
    session.buy('character', 'kusto');
    session.equipCharacter('kusto');
    session.buy('accessory', 'wizard-hat');
    session.equipAccessory('wizard-hat');
    session.buy('move', 'brave-glide');
    session.setMoveOn('brave-glide', true);

    const reloaded = new Session(storage);
    expect(reloaded.equippedCharacter.id).toBe('kusto');
    expect(reloaded.equippedAccessory?.id).toBe('wizard-hat');
    expect(reloaded.activeMove?.id).toBe('brave-glide');
    expect(reloaded.save.totalStars).toBe(5000 - 1500 - 300 - 800);

    reloaded.equipAccessory(null);
    expect(new Session(storage).equippedAccessory).toBeUndefined();
  });

  it('a saved accessory or move that is not owned is not equipped', () => {
    const save = parseSave(
      JSON.stringify({
        ...defaultSave(),
        owned: { characters: [], accessories: ['bow', 'not-real'], moves: [] },
        equipped: { character: 'strawberry', accessory: 'cape', moves: { 'rainbow-dash': true } },
      }),
    );
    expect(save.owned.accessories).toEqual(['bow']);
    expect(save.equipped.accessory).toBeNull();
    expect(save.equipped.moves).toEqual({});
  });
});

describe('signature moves are cosmetic', () => {
  /** Plays a scripted jump then a slide and records the hero's y and height every frame. */
  function trace(character: CharacterId, moveOn: boolean) {
    const session = sessionWith({ totalStars: 10_000 });
    session.buy('character', character);
    const move = moveFor(character);
    if (move) {
      session.buy('move', move.id);
      session.setMoveOn(move.id, moveOn);
    }
    session.equipCharacter(character);
    session.play();
    session.choose();
    const samples: number[][] = [];
    const dt = 1 / 60;
    for (let frame = 0; frame < 120; frame++) {
      if (frame === 5) applyAction(session.run.player, 'JUMP');
      if (frame === 60) applyAction(session.run.player, 'SLIDE');
      session.update(dt, frame * dt);
      const { player } = session.run;
      samples.push([player.x, player.y, player.height, player.slideTimer]);
    }
    return { samples, active: session.activeMove?.id };
  }

  it.each(CHARACTERS.map((c) => c.id))('%s jumps and slides identically with and without the move', (id) => {
    const withMove = trace(id, true);
    const without = trace(id, false);
    expect(withMove.active).toBe(moveFor(id)?.id);
    expect(without.active).toBeUndefined();
    expect(withMove.samples).toEqual(without.samples);
  });
});

describe('acceptance: buy Chity with 500 stars and choose him on the stage', () => {
  it('works end to end and is remembered', () => {
    const storage = new MemoryStorage();
    const session = sessionWith({ totalStars: 500 }, storage);
    session.play();
    while (session.selectedCharacter.id !== 'chity') session.rotate(1);
    expect(session.choose()).toBe(false);
    expect(session.tapLocked()).toBe(true);
    expect(session.screen).toBe('SHOP');
    expect(session.buy('character', 'chity')).toBe(true);
    expect(session.save.totalStars).toBe(0);
    session.back();
    expect(session.screen).toBe('SELECT');
    expect(session.selectedCharacter.id).toBe('chity');
    expect(session.choose()).toBe(true);
    expect(session.screen).toBe('RUN');
    expect(new Session(storage).equippedCharacter.id).toBe('chity');
  });
});

describe('debug command', () => {
  it('adds 1,000 stars and saves them', async () => {
    const { addStarsForTesting } = await import('./debug');
    const storage = new MemoryStorage();
    const session = sessionWith({ totalStars: 0 }, storage);
    addStarsForTesting(session, 1000);
    expect(new Session(storage).save.totalStars).toBe(1000);
  });
});
