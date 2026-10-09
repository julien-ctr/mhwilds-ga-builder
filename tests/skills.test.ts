import { describe, expect, it } from 'vitest';
import { getDb } from '../src/model/db';
import { computeSkills, setSkillLevel } from '../src/engine/skills';

const db = getDb();

describe('computeSkills', () => {
  it('activates set bonuses at their piece thresholds', () => {
    const setSkill = db.data.skills.find((s) => s.kind === 'set')!;
    const pieces = db.data.armor.filter((a) => a.setSkills.includes(setSkill.id));
    const thresholds = setSkill.ranks.map((r) => r.piecesRequired!);
    expect(setSkillLevel(setSkill, thresholds[0] - 1)).toBe(0);
    expect(setSkillLevel(setSkill, thresholds[0])).toBe(1);

    const byKind = new Map(pieces.map((p) => [p.kind, p]));
    const two = [...byKind.values()].slice(0, thresholds[0]);
    const skills = computeSkills(db, { weapon: null, armor: two, charm: null, decorations: [] });
    expect(skills.get(setSkill.id)).toBe(1);
  });

  it('sums armor, charm and decoration points and caps at max level', () => {
    const deco = db.decorations.find((d) => d.skills.length === 1 && d.kind === 'armor')!;
    const skillId = deco.skills[0].id;
    const max = db.maxLevel(skillId);
    const many = Array.from({ length: max + 3 }, () => deco);
    const skills = computeSkills(db, { weapon: null, armor: [], charm: null, decorations: many });
    expect(skills.get(skillId)).toBe(max);
  });
});
