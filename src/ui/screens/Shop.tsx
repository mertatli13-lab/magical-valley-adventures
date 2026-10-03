import { useState } from 'react';
import { CHARACTER_COLORS } from '../../config';
import {
  ACCESSORIES,
  CHARACTERS,
  SIGNATURE_MOVES,
  type CharacterId,
  type ItemKind,
} from '../../game/catalogue';
import type { Session } from '../../game/session';
import { useGameStore, useSession } from '../../store/gameStore';
import { ACCESSORY_ICONS, MOVE_ICONS } from '../shopIcons';

const TABS: { kind: ItemKind; label: string }[] = [
  { kind: 'character', label: 'Characters' },
  { kind: 'accessory', label: 'Accessories' },
  { kind: 'move', label: 'Signature moves' },
];

interface Item {
  kind: ItemKind;
  id: string;
  name: string;
  detail: string;
  price: number;
  preview: { character?: CharacterId; icon?: string };
}

function characterName(id: CharacterId): string {
  return CHARACTERS.find((c) => c.id === id)?.name ?? id;
}

function itemsFor(kind: ItemKind): Item[] {
  if (kind === 'character') {
    return CHARACTERS.map((c) => ({
      kind,
      id: c.id,
      name: c.name,
      detail: c.price === 0 ? 'Free' : 'Character',
      price: c.price,
      preview: { character: c.id },
    }));
  }
  if (kind === 'accessory') {
    return ACCESSORIES.map((a) => ({
      kind,
      id: a.id,
      name: a.name,
      detail: `${a.tier[0]?.toUpperCase()}${a.tier.slice(1)}`,
      price: a.price,
      preview: { icon: ACCESSORY_ICONS[a.id] },
    }));
  }
  return SIGNATURE_MOVES.map((m) => ({
    kind,
    id: m.id,
    name: m.name,
    detail: `${characterName(m.character)} · replaces ${m.replaces}`,
    price: m.price,
    preview: { character: m.character, icon: MOVE_ICONS[m.replaces] },
  }));
}

type Action = { label: string; disabled: boolean; run?: (s: Session) => void; buy?: boolean };

/** Which button an item shows: Buy, Equip or Equipped (tapping Equipped takes off an accessory or move). */
function actionFor(session: Session, item: Item): Action {
  const owned = session.isOwned(item.kind, item.id);
  if (item.kind === 'move') {
    const move = SIGNATURE_MOVES.find((m) => m.id === item.id);
    if (move && !session.canBuyMove(move) && !owned) {
      return { label: `Unlock ${characterName(move.character)} first`, disabled: true };
    }
  }
  if (!owned) return { label: 'Buy', disabled: !session.canBuy(item.kind, item.id), buy: true };
  if (item.kind === 'character') {
    const equipped = session.save.equipped.character === item.id;
    return equipped
      ? { label: 'Equipped', disabled: true }
      : { label: 'Equip', disabled: false, run: (s) => s.equipCharacter(item.id as CharacterId) };
  }
  if (item.kind === 'accessory') {
    return session.save.equipped.accessory === item.id
      ? { label: 'Equipped', disabled: false, run: (s) => s.equipAccessory(null) }
      : { label: 'Equip', disabled: false, run: (s) => s.equipAccessory(item.id) };
  }
  return session.isMoveOn(item.id)
    ? { label: 'Equipped', disabled: false, run: (s) => s.setMoveOn(item.id, false) }
    : { label: 'Equip', disabled: false, run: (s) => s.setMoveOn(item.id, true) };
}

function Preview({ preview }: { preview: Item['preview'] }) {
  return (
    <div className="shop-preview">
      {preview.character && (
        <div className="shop-capsule" style={{ background: CHARACTER_COLORS[preview.character] }} />
      )}
      {preview.icon && <span className={preview.character ? 'shop-badge' : 'shop-icon'}>{preview.icon}</span>}
    </div>
  );
}

/** The Shop: three tabs, each item with a preview, its price and Buy, Equip or Equipped. */
export function Shop() {
  const session = useSession();
  const act = useGameStore((state) => state.act);
  const [tab, setTab] = useState<ItemKind>('character');
  const [pending, setPending] = useState<Item | null>(null);
  if (session.screen !== 'SHOP') return null;

  return (
    <div className="shop">
      <header className="shop-header">
        <button type="button" className="secondary-button shop-back" onClick={() => act((s) => s.back())}>
          ‹ Back
        </button>
        <h2 className="screen-heading">Shop</h2>
        <div className="shop-total" aria-label="Total stars">
          ★ {session.save.totalStars.toLocaleString('en')}
        </div>
      </header>
      <nav className="shop-tabs" role="tablist">
        {TABS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={tab === kind}
            className={`shop-tab${tab === kind ? ' active' : ''}`}
            onClick={() => setTab(kind)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="shop-grid">
        {itemsFor(tab).map((item) => {
          const owned = session.isOwned(item.kind, item.id);
          const action = actionFor(session, item);
          return (
            <div key={item.id} className={`shop-card${owned ? ' owned' : ''}`}>
              <Preview preview={item.preview} />
              <div className="shop-name">{item.name}</div>
              <div className="shop-detail">{item.detail}</div>
              <div className="shop-price">{owned ? 'Owned' : `★ ${item.price.toLocaleString('en')}`}</div>
              <button
                type="button"
                className={`shop-action${action.label === 'Equipped' ? ' equipped' : ''}`}
                disabled={action.disabled}
                onClick={() => (action.buy ? setPending(item) : action.run && act(action.run))}
              >
                {action.label}
              </button>
            </div>
          );
        })}
      </div>
      {pending && (
        <div className="overlay dim" role="dialog" aria-modal="true">
          <div className="panel">
            <Preview preview={pending.preview} />
            <h2 className="screen-heading">Buy {pending.name}?</h2>
            <div className="shop-confirm-price">★ {pending.price.toLocaleString('en')}</div>
            <button
              type="button"
              className="primary-button"
              autoFocus
              onClick={() => {
                act((s) => s.buy(pending.kind, pending.id));
                setPending(null);
              }}
            >
              Buy
            </button>
            <button type="button" className="secondary-button" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
