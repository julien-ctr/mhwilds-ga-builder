import type { Db } from '../model/db';
import type { Armor, Charm, SkillLevel, Weapon } from '../model/types';
import { ARMOR_KINDS } from '../model/types';
import { weaponMatches } from '../weapons/specifics';
import { inRarityRange, type BuildRequest } from './request';

export interface Candidates {
  weapons: Weapon[];
  /** One list per ARMOR_KINDS entry; [null] when nothing matches the filters. */
  armor: (Armor | null)[][];
  charms: (Charm | null)[];
}

/** Levels of each requested skill provided by a list of skill levels. */
export function requestedVec(skills: SkillLevel[], requested: SkillLevel[]): number[] {
  return requested.map((r) => skills.filter((s) => s.id === r.id).reduce((sum, s) => sum + s.level, 0));
}

/** Slot sizes sorted descending, padded to `n` entries with zeros. */
export function slotVec(slots: number[], n = 3): number[] {
  const s = slots.slice().sort((a, b) => b - a);
  while (s.length < n) s.push(0);
  return s.slice(0, Math.max(n, s.length));
}

/**
 * Keeps only items not dominated by another one. `a` dominates `b` when every key component
 * of `a` is >= the one of `b`; exact duplicates keep the first occurrence.
 */
export function paretoFilter<T>(items: T[], key: (item: T) => number[]): T[] {
  const keys = items.map(key);
  return items.filter((_, i) => {
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const a = keys[j];
      const b = keys[i];
      let geq = true;
      let strictly = false;
      for (let k = 0; k < a.length; k++) {
        if (a[k] < b[k]) {
          geq = false;
          break;
        }
        if (a[k] > b[k]) strictly = true;
      }
      if (geq && (strictly || j < i)) return false;
    }
    return true;
  });
}

export function buildCandidates(db: Db, request: BuildRequest): Candidates {
  const req = request.skills;
  const banned = {
    weapons: new Set(request.blacklist.weapons),
    armor: new Set(request.blacklist.armor),
    charms: new Set(request.blacklist.charms),
  };

  const armor = ARMOR_KINDS.map((kind) => {
    const pool = db.armorByKind
      .get(kind)!
      .filter(
        (a) => (request.rank === 'all' || a.rank === 'high') && inRarityRange(a, request) && !banned.armor.has(a.id),
      );
    const kept = paretoFilter(pool, (a) => [
      a.defense,
      ...slotVec(a.slots),
      ...requestedVec(a.skills, req),
      ...req.map((r) => (a.setSkills.includes(r.id) ? 1 : 0)),
    ]);
    return kept.length ? kept : [null];
  });

  let weapons = (db.weaponsByKind.get(request.weaponKind) ?? []).filter(
    (w) => inRarityRange(w, request) && !banned.weapons.has(w.id) && weaponMatches(w, request.weaponOptions),
  );
  if (request.lockedWeaponId !== null) {
    const locked = db.weaponsById.get(request.lockedWeaponId);
    weapons = locked && !banned.weapons.has(locked.id) ? [locked] : [];
  }

  const relevantCharms = db.data.charms.filter(
    (c) =>
      !banned.charms.has(c.id) && c.rarity <= request.maxRarity && requestedVec(c.skills, req).some((v) => v > 0),
  );
  const charms = paretoFilter(relevantCharms, (c) => requestedVec(c.skills, req));

  return { weapons, armor, charms: charms.length ? charms : [null] };
}
