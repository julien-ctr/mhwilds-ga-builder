import type { Db } from '../model/db';
import type { Armor, Charm, Decoration, Skill, SkillLevel, Weapon } from '../model/types';

export interface Equipment {
  weapon: Weapon | null;
  armor: (Armor | null)[];
  charm: Charm | null;
  decorations: Decoration[];
}

/** Highest rank level of a set/group skill unlocked with `pieces` pieces. */
export function setSkillLevel(skill: Skill, pieces: number): number {
  let level = 0;
  for (const r of skill.ranks) {
    if (r.piecesRequired !== null && pieces >= r.piecesRequired) level = Math.max(level, r.level);
  }
  return level;
}

/** Pieces needed to unlock `level` of a set/group skill (Infinity if impossible). */
export function piecesForSetLevel(skill: Skill, level: number): number {
  const rank = skill.ranks.find((r) => r.level === level);
  return rank?.piecesRequired ?? Infinity;
}

/** Computes every active skill of a build, with levels capped at each skill's maximum. */
export function computeSkills(db: Db, eq: Equipment): Map<number, number> {
  const points = new Map<number, number>();
  const add = (list: SkillLevel[]) => {
    for (const s of list) points.set(s.id, (points.get(s.id) ?? 0) + s.level);
  };
  if (eq.weapon) add(eq.weapon.skills);
  if (eq.charm) add(eq.charm.skills);
  for (const d of eq.decorations) add(d.skills);

  const setPieces = new Map<number, number>();
  for (const a of eq.armor) {
    if (!a) continue;
    add(a.skills);
    for (const id of a.setSkills) setPieces.set(id, (setPieces.get(id) ?? 0) + 1);
  }

  const result = new Map<number, number>();
  for (const [id, pts] of points) {
    const max = db.maxLevel(id) || pts;
    result.set(id, Math.min(pts, max));
  }
  for (const [id, count] of setPieces) {
    const skill = db.skill(id);
    const level = skill ? setSkillLevel(skill, count) : 0;
    if (level > 0) result.set(id, level);
  }
  return result;
}

export function sortedSkillList(skills: Map<number, number>): SkillLevel[] {
  return [...skills]
    .filter(([, level]) => level > 0)
    .map(([id, level]) => ({ id, level }))
    .sort((a, b) => b.level - a.level || a.id - b.id);
}
