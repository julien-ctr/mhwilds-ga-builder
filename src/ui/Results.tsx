import { useState, type ReactNode } from 'react';
import type { Db } from '../model/db';
import { ARMOR_KINDS, type SkillLevel } from '../model/types';
import type { Blacklist, BlacklistCategory, BuildResult, SlotOwner } from '../engine/request';
import { weaponElementLabel, weaponSpecificLabel } from './WeaponPicker';
import { ARMOR_KIND_LABELS, SLOT_OWNER_LABELS, T } from './strings.fr';
import { decorationLabel, formatNumber, rarityColor } from './format';
import { SkillTooltip } from './SkillTooltip';
import { HoverCard } from './HoverCard';
import { PieceSummary, type PieceOwner } from './PieceSummary';
import { ExcludeButton, isBlacklisted } from './Blacklist';
import { Socket } from './Socket';

const HOVER_DECOS_KEY = 'mhwgb.hoverDecos';

function loadHoverDecos(): boolean {
  try {
    return localStorage.getItem(HOVER_DECOS_KEY) !== '0';
  } catch {
    return true;
  }
}

type ToggleBlacklist = (category: BlacklistCategory, id: number) => void;

interface Props {
  db: Db;
  results: BuildResult[];
  requested: SkillLevel[];
  /** Songs the user required (hunting horn), highlighted in the weapon summary. */
  requiredSongs: string[];
  /** Short run summary shown next to the result count ("0,03 s · 61 générations"). */
  meta: string;
  blacklist: Blacklist;
  onToggleBlacklist: ToggleBlacklist;
}

interface SlotListProps {
  db: Db;
  build: BuildResult;
  owner: SlotOwner;
  blacklist: Blacklist;
  onToggleBlacklist: ToggleBlacklist;
}

function SlotList({ db, build, owner, blacklist, onToggleBlacklist }: SlotListProps) {
  const decos = build.decorations.filter((d) => d.owner === owner);
  const free = build.freeSlots.filter((s) => s.owner === owner);
  if (!decos.length && !free.length) return <span className="decos muted">{T.nothing}</span>;
  return (
    <span className="decos">
      {decos.map((d, i) => {
        const excluded = isBlacklisted(blacklist, 'decorations', d.decorationId);
        return (
          <span key={`d${i}`} className={`deco ${excluded ? 'excluded' : ''}`}>
            <Socket size={d.slotSize} />
            <span className="item-name">{decorationLabel(db.decorationsById.get(d.decorationId)?.name ?? '')}</span>
            <ExcludeButton excluded={excluded} onToggle={() => onToggleBlacklist('decorations', d.decorationId)} />
          </span>
        );
      })}
      {free.map((s, i) => (
        <span key={`f${i}`} className="deco deco-free">
          <Socket size={s.size} />
          <span>{T.freeSlot}</span>
        </span>
      ))}
    </span>
  );
}

interface CardProps {
  db: Db;
  build: BuildResult;
  index: number;
  requested: SkillLevel[];
  requiredSongs: string[];
  withDecos: boolean;
  blacklist: Blacklist;
  onToggleBlacklist: ToggleBlacklist;
}

function BuildCard({ db, build, index, requested, requiredSongs, withDecos, blacklist, onToggleBlacklist }: CardProps) {
  const weapon = build.weaponId !== null ? db.weaponsById.get(build.weaponId) : undefined;
  const charm = build.charmId !== null ? db.charmsById.get(build.charmId) : undefined;
  const requestedIds = new Map(requested.map((r) => [r.id, r.level]));
  const requestedSet = new Set(requestedIds.keys());
  const level = (id: number) => build.skills.find((s) => s.id === id)?.level ?? 0;
  const isSetLike = (id: number) => ['set', 'group'].includes(db.skill(id)?.kind ?? '');
  const bonuses = build.skills.filter((s) => !requestedIds.has(s.id) && isSetLike(s.id));
  const others = build.skills.filter((s) => !requestedIds.has(s.id) && !isSetLike(s.id));

  const row = (
    key: string,
    slotLabel: string,
    owner: PieceOwner,
    category: BlacklistCategory,
    item: { id: number; name: string; rarity: number } | undefined,
    slots: ReactNode,
  ) => {
    const excluded = item ? isBlacklisted(blacklist, category, item.id) : false;
    return (
      <div key={key} className="build-row">
        <span className="row-slot">{slotLabel}</span>
        {item ? (
          <span className={`row-piece ${excluded ? 'excluded' : ''}`} style={{ color: rarityColor(item.rarity) }}>
            <HoverCard
              className="item-name"
              content={() => (
                <PieceSummary
                  db={db}
                  build={build}
                  owner={owner}
                  withDecos={withDecos}
                  requestedIds={requestedSet}
                  requiredSongs={requiredSongs}
                />
              )}
            >
              {item.name}
            </HoverCard>
            <span className="rarity">★{item.rarity}</span>
            <ExcludeButton excluded={excluded} onToggle={() => onToggleBlacklist(category, item.id)} />
          </span>
        ) : (
          <span className="row-piece muted">{owner === 'charm' ? T.noCharm : T.nothing}</span>
        )}
        {slots}
      </div>
    );
  };
  const slotsOf = (owner: SlotOwner) => (
    <SlotList db={db} build={build} owner={owner} blacklist={blacklist} onToggleBlacklist={onToggleBlacklist} />
  );

  const complete = build.missing === 0;
  const specific = weapon ? weaponSpecificLabel(weapon) : null;
  const weaponStats = weapon
    ? [
        `${T.attack} ${weapon.attack}`,
        weapon.affinity !== 0 ? `${T.affinity} ${weapon.affinity > 0 ? '+' : ''}${weapon.affinity} %` : null,
        weaponElementLabel(weapon),
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <article className={`card ${index === 0 ? 'card-best' : ''}`}>
      <header className="card-head">
        <h3>{T.build(index + 1)}</h3>
        <span className={`badge ${complete ? 'ok' : 'ko'}`}>
          {complete ? `✓ ${T.complete}` : `⚠ ${T.missing(build.missing)}`}
        </span>
        <span className="card-def">
          <span className="label-caps">{T.defense}</span>
          <strong>{formatNumber(build.defense)}</strong>
        </span>
      </header>

      {weapon && (
        <div className="weapon-line">
          <strong style={{ color: rarityColor(weapon.rarity) }}>
            {weapon.name} ★{weapon.rarity}
          </strong>
          <span className="sep">·</span>
          <span>{weaponStats}</span>
          {specific && (
            <>
              <span className="sep">·</span>
              <span className="weapon-spec">{specific}</span>
            </>
          )}
        </div>
      )}

      <div className="build-rows">
        {row('weapon', SLOT_OWNER_LABELS.weapon, 'weapon', 'weapons', weapon, slotsOf('weapon'))}
        {ARMOR_KINDS.map((kind, k) => {
          const id = build.armorIds[k];
          return row(kind, ARMOR_KIND_LABELS[kind], kind, 'armor', id !== null ? db.armorById.get(id) : undefined, slotsOf(kind));
        })}
        {row('charm', T.charm, 'charm', 'charms', charm, <span className="decos muted">{T.nothing}</span>)}
      </div>

      <div className="skill-chips">
        {requested.map((r) => {
          const skill = db.skill(r.id);
          if (!skill) return null;
          const got = level(r.id);
          const ok = got >= r.level;
          return (
            <span key={r.id} className={`skill-chip req ${ok ? 'ok' : 'ko'}`}>
              <SkillTooltip skill={skill} level={got} target={r.level}>
                <span aria-hidden="true">{ok ? '✓' : '✕'}</span> {skill.name} <strong>{got}/{r.level}</strong>
              </SkillTooltip>
            </span>
          );
        })}
        {bonuses.map((s) => {
          const skill = db.skill(s.id);
          if (!skill) return null;
          const rankName = skill.ranks.find((r) => r.level === s.level)?.name ?? `${skill.name} ${s.level}`;
          return (
            <span key={s.id} className="skill-chip bonus">
              <SkillTooltip skill={skill} level={s.level}>
                <span aria-hidden="true">◆</span> {rankName}
              </SkillTooltip>
            </span>
          );
        })}
        {others.length > 0 && <span className="chips-divider" aria-hidden="true" />}
        {others.map((s) => {
          const skill = db.skill(s.id);
          if (!skill) return null;
          return (
            <span key={s.id} className="skill-chip other">
              <SkillTooltip skill={skill} level={s.level}>
                {skill.name} <span className="muted">{s.level}</span>
              </SkillTooltip>
            </span>
          );
        })}
      </div>
    </article>
  );
}

export function Results({ db, results, requested, requiredSongs, meta, blacklist, onToggleBlacklist }: Props) {
  const [withDecos, setWithDecos] = useState(loadHoverDecos);
  const toggle = (on: boolean) => {
    setWithDecos(on);
    try {
      localStorage.setItem(HOVER_DECOS_KEY, on ? '1' : '0');
    } catch {
      // Storage unavailable: the preference just won't persist.
    }
  };

  return (
    <>
      <div className="results-bar">
        <h2>{T.resultTitle(results.length)}</h2>
        <span className="muted">{meta}</span>
        <label className="switch">
          <input type="checkbox" role="switch" checked={withDecos} onChange={(e) => toggle(e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          {T.hoverDecosSwitch}
        </label>
      </div>
      <div className="results">
        {results.map((b, i) => (
          <BuildCard
            key={i}
            db={db}
            build={b}
            index={i}
            requested={requested}
            requiredSongs={requiredSongs}
            withDecos={withDecos}
            blacklist={blacklist}
            onToggleBlacklist={onToggleBlacklist}
          />
        ))}
      </div>
    </>
  );
}
