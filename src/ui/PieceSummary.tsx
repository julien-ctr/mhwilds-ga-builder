import type { Db } from '../model/db';
import { ARMOR_KINDS, type SkillLevel } from '../model/types';
import type { BuildResult, SlotOwner } from '../engine/request';
import { setSkillLevel } from '../engine/skills';
import { ARMOR_KIND_LABELS, T } from './strings.fr';
import { compareFr, decorationLabel, rarityColor } from './format';

export type PieceOwner = SlotOwner | 'charm';

interface Props {
  db: Db;
  build: BuildResult;
  owner: PieceOwner;
  withDecos: boolean;
  requestedIds: Set<number>;
  /** Hunting horn songs the user required, marked in the melody list. */
  requiredSongs?: string[];
}

interface Contribution {
  id: number;
  name: string;
  fromPiece: number;
  fromDecos: number;
}

function pieceInfo(db: Db, build: BuildResult, owner: PieceOwner) {
  if (owner === 'weapon') {
    const w = build.weaponId !== null ? db.weaponsById.get(build.weaponId) : undefined;
    return w && { name: w.name, rarity: w.rarity, kindLabel: T.weaponSection, skills: w.skills, setSkills: [] as number[], defense: null };
  }
  if (owner === 'charm') {
    const c = build.charmId !== null ? db.charmsById.get(build.charmId) : undefined;
    return c && { name: c.name, rarity: c.rarity, kindLabel: T.charm, skills: c.skills, setSkills: [] as number[], defense: null };
  }
  const id = build.armorIds[ARMOR_KINDS.indexOf(owner)];
  const a = id !== null ? db.armorById.get(id) : undefined;
  return a && { name: a.name, rarity: a.rarity, kindLabel: ARMOR_KIND_LABELS[owner], skills: a.skills, setSkills: a.setSkills, defense: a.defense };
}

/** Number of equipped armor pieces counting towards each set/group skill. */
function setCounts(db: Db, build: BuildResult): Map<number, number> {
  const counts = new Map<number, number>();
  for (const id of build.armorIds) {
    const a = id !== null ? db.armorById.get(id) : undefined;
    for (const s of a?.setSkills ?? []) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return counts;
}

/** Summary of what one equipped element (weapon, armor piece or charm) brings to a build. */
export function PieceSummary({ db, build, owner, withDecos, requestedIds, requiredSongs = [] }: Props) {
  const info = pieceInfo(db, build, owner);
  if (!info) return null;

  const decorations =
    withDecos && owner !== 'charm'
      ? build.decorations.filter((d) => d.owner === owner).map((d) => db.decorationsById.get(d.decorationId)!)
      : [];

  const contributions = new Map<number, Contribution>();
  const add = (list: SkillLevel[], field: 'fromPiece' | 'fromDecos') => {
    for (const s of list) {
      const c = contributions.get(s.id) ?? { id: s.id, name: db.skill(s.id)?.name ?? `#${s.id}`, fromPiece: 0, fromDecos: 0 };
      c[field] += s.level;
      contributions.set(s.id, c);
    }
  };
  add(info.skills, 'fromPiece');
  for (const d of decorations) add(d.skills, 'fromDecos');
  const rows = [...contributions.values()].sort(
    (a, b) =>
      Number(requestedIds.has(b.id)) - Number(requestedIds.has(a.id)) ||
      b.fromPiece + b.fromDecos - (a.fromPiece + a.fromDecos) ||
      compareFr(a.name, b.name),
  );

  const counts = setCounts(db, build);
  const weapon = owner === 'weapon' && build.weaponId !== null ? db.weaponsById.get(build.weaponId) : undefined;
  const hornSongs = weapon?.specifics.kind === 'hunting-horn' ? weapon.specifics.songs : null;

  return (
    <div className="piece-summary">
      <div className="hc-head">
        <div className="hc-title">
          <span className="hc-name" style={{ color: rarityColor(info.rarity) }}>
            {info.name}
          </span>
          <span className="hc-rarity" style={{ color: rarityColor(info.rarity) }}>
            ★{info.rarity}
          </span>
          <span className="label-caps hc-kind">{info.kindLabel}</span>
        </div>
        <div className="muted">
          {info.defense !== null && `${T.defense} ${info.defense} · `}
          {owner === 'charm' ? T.noSlotsOnCharm : withDecos ? T.withDecos : T.withoutDecos}
        </div>
      </div>

      <div className="hc-section">
        <h5 className="label-caps">{T.pieceSkills}</h5>
        {rows.length === 0 ? (
          <p className="muted">{T.noSkills}</p>
        ) : (
          rows.map((c) => {
            const req = requestedIds.has(c.id);
            const sources = [
              c.fromPiece > 0 ? `${c.fromPiece} ${T.fromPiece}` : null,
              c.fromDecos > 0 ? `${c.fromDecos} ${T.fromDecos}` : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <div key={c.id} className={`hc-line ${req ? 'is-req' : ''}`}>
                <span className="hc-mark" aria-hidden="true">
                  {req ? '▸' : ''}
                </span>
                <span className="hc-skill">
                  {c.name} +{c.fromPiece + c.fromDecos}
                </span>
                <span className="hc-src">({sources})</span>
              </div>
            );
          })
        )}
      </div>

      {info.setSkills.length > 0 && (
        <div className="hc-section">
          <h5 className="label-caps">{T.setContributions}</h5>
          {info.setSkills.map((id) => {
            const skill = db.skill(id);
            if (!skill) return null;
            const count = counts.get(id) ?? 0;
            const active = setSkillLevel(skill, count);
            const activeRank = skill.ranks.find((r) => r.level === active);
            const next = skill.ranks
              .filter((r) => r.piecesRequired !== null && r.piecesRequired > count)
              .sort((a, b) => a.piecesRequired! - b.piecesRequired!)[0];
            return active > 0 ? (
              <div key={id} className={`hc-bonus ${requestedIds.has(id) ? 'is-req' : ''}`}>
                <span className="bonus-name">◆ {skill.name}</span> — {T.equippedPieces(count)}
                {next && ` · ${T.nextRank(next.piecesRequired!, next.name ?? `${T.level} ${next.level}`)}`} →{' '}
                <strong>{activeRank?.name ?? `${T.level} ${active}`}</strong>
              </div>
            ) : (
              <div key={id} className="hc-bonus muted">
                ◇ {skill.name} — {T.inactive} ({T.equippedPieces(count)}
                {next && ` · ${T.nextRank(next.piecesRequired!, next.name ?? `${T.level} ${next.level}`)}`})
              </div>
            );
          })}
        </div>
      )}

      {hornSongs && (
        <div className="hc-section">
          <h5 className="label-caps">{T.songs}</h5>
          {hornSongs.map((song) => {
            const req = requiredSongs.includes(song);
            return (
              <div key={song} className={`hc-song ${req ? 'is-req' : ''}`}>
                <span className="note" aria-hidden="true">
                  ♪
                </span>
                <span>{song}</span>
                {req && <span className="hc-src">{T.songRequired}</span>}
              </div>
            );
          })}
        </div>
      )}

      {decorations.length > 0 && (
        <div className="hc-section hc-decos muted">
          {T.decorations} : {decorations.map((d) => decorationLabel(d.name)).join(', ')}
        </div>
      )}
    </div>
  );
}
