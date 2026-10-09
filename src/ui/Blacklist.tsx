import type { Db } from '../model/db';
import type { Blacklist, BlacklistCategory } from '../engine/request';
import { EMPTY_BLACKLIST } from '../engine/request';
import { BLACKLIST_CATEGORY_LABELS, T } from './strings.fr';
import { compareFr, rarityColor } from './format';
import { Panel } from './Panel';

const CATEGORIES = Object.keys(BLACKLIST_CATEGORY_LABELS) as BlacklistCategory[];

export function itemName(db: Db, category: BlacklistCategory, id: number): string {
  const item =
    category === 'weapons'
      ? db.weaponsById.get(id)
      : category === 'armor'
        ? db.armorById.get(id)
        : category === 'charms'
          ? db.charmsById.get(id)
          : db.decorationsById.get(id);
  return item?.name ?? `#${id}`;
}

/** Rarity of an item, when its category has one (decorations are shown without colour). */
function itemRarity(db: Db, category: BlacklistCategory, id: number): number | null {
  if (category === 'weapons') return db.weaponsById.get(id)?.rarity ?? null;
  if (category === 'armor') return db.armorById.get(id)?.rarity ?? null;
  if (category === 'charms') return db.charmsById.get(id)?.rarity ?? null;
  return null;
}

export function isBlacklisted(blacklist: Blacklist, category: BlacklistCategory, id: number): boolean {
  return blacklist[category].includes(id);
}

export function toggleBlacklist(blacklist: Blacklist, category: BlacklistCategory, id: number): Blacklist {
  const list = blacklist[category];
  return { ...blacklist, [category]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
}

/** Small ⊘ / ↺ button excluding or re-including an item. */
export function ExcludeButton({ excluded, onToggle }: { excluded: boolean; onToggle: () => void }) {
  const label = excluded ? T.include : T.exclude;
  return (
    <button
      type="button"
      className={`exclude-btn ${excluded ? 'is-excluded' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={excluded}
      onClick={onToggle}
    >
      {excluded ? '↺' : '⊘'}
    </button>
  );
}

interface PanelProps {
  db: Db;
  blacklist: Blacklist;
  onChange: (blacklist: Blacklist) => void;
}

/** Form section listing excluded items, each one restorable. */
export function BlacklistPanel({ db, blacklist, onChange }: PanelProps) {
  const total = CATEGORIES.reduce((n, c) => n + blacklist[c].length, 0);
  const rows = CATEGORIES.flatMap((c) =>
    blacklist[c]
      .map((id) => ({ category: c, id, name: itemName(db, c, id), rarity: itemRarity(db, c, id) }))
      .sort((a, b) => compareFr(a.name, b.name)),
  );
  return (
    <Panel
      title={T.blacklistSection}
      extra={
        total > 0 && (
          <>
            <span className="count-badge">{total}</span>
            <button type="button" className="link-btn panel-action" onClick={() => onChange(EMPTY_BLACKLIST)}>
              {T.clearBlacklist}
            </button>
          </>
        )
      }
    >
      {total === 0 ? (
        <p className="muted hint">{T.blacklistHint}</p>
      ) : (
        <ul className="bl-list">
          {rows.map(({ category, id, name, rarity }) => (
            <li key={`${category}-${id}`}>
              <span className="label-caps bl-cat">{BLACKLIST_CATEGORY_LABELS[category]}</span>
              <span className="bl-name" style={rarity ? { color: rarityColor(rarity) } : undefined}>
                {name}
              </span>
              <button
                type="button"
                className="square-btn"
                title={T.include}
                aria-label={`${T.include} : ${name}`}
                onClick={() => onChange(toggleBlacklist(blacklist, category, id))}
              >
                ↺
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
