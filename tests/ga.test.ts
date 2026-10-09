import { describe, expect, it } from 'vitest';
import { getDb } from '../src/model/db';
import { runGa } from '../src/engine/ga';
import { DEFAULT_GA, DEFAULT_OBJECTIVES, EMPTY_BLACKLIST, MAX_RARITY, type BuildRequest } from '../src/engine/request';

const db = getDb();

function request(partial: Partial<BuildRequest>): BuildRequest {
  return {
    weaponKind: 'gunlance',
    weaponOptions: {},
    lockedWeaponId: null,
    skills: [],
    rank: 'high',
    minRarity: 1,
    maxRarity: MAX_RARITY,
    objectives: DEFAULT_OBJECTIVES,
    ga: { ...DEFAULT_GA, generations: 120, populationSize: 120 },
    blacklist: EMPTY_BLACKLIST,
    ...partial,
  };
}

describe('runGa', () => {
  it('satisfies an easy request', () => {
    // Maître d'armes 3 (weapon skill) + Expert en survie 2 (armor skill)
    const out = runGa(db, request({ skills: [{ id: 3, level: 3 }, { id: 90, level: 2 }] }));
    expect(out.results.length).toBeGreaterThan(0);
    const best = out.results[0];
    expect(best.missing).toBe(0);
    const lvl = (id: number) => best.skills.find((s) => s.id === id)?.level ?? 0;
    expect(lvl(3)).toBeGreaterThanOrEqual(3);
    expect(lvl(90)).toBeGreaterThanOrEqual(2);
  });

  it('respects gunlance shelling constraints', () => {
    const out = runGa(
      db,
      request({ weaponOptions: { shells: ['wide'], minShellLevel: 3 }, skills: [{ id: 3, level: 2 }] }),
    );
    expect(out.results.length).toBeGreaterThan(0);
    for (const r of out.results) {
      const w = db.weaponsById.get(r.weaponId!)!;
      expect(w.specifics).toMatchObject({ kind: 'gunlance', shell: 'wide' });
    }
  });

  it('never suggests blacklisted items', () => {
    const req = request({ skills: [{ id: 3, level: 5 }, { id: 90, level: 3 }] });
    const first = runGa(db, req).results[0];
    const blacklist = {
      weapons: [first.weaponId!],
      armor: first.armorIds.filter((id): id is number => id !== null),
      charms: first.charmId !== null ? [first.charmId] : [],
      decorations: [...new Set(first.decorations.map((d) => d.decorationId))],
    };
    const out = runGa(db, { ...req, blacklist });
    expect(out.results.length).toBeGreaterThan(0);
    for (const r of out.results) {
      expect(blacklist.weapons).not.toContain(r.weaponId);
      for (const id of r.armorIds) expect(blacklist.armor).not.toContain(id);
      expect(blacklist.charms).not.toContain(r.charmId);
      for (const d of r.decorations) expect(blacklist.decorations).not.toContain(d.decorationId);
    }
  });

  it('respects the rarity range', () => {
    const out = runGa(db, request({ rank: 'all', minRarity: 5, maxRarity: 6, skills: [{ id: 3, level: 2 }] }));
    expect(out.results.length).toBeGreaterThan(0);
    for (const r of out.results) {
      const items = [
        db.weaponsById.get(r.weaponId!)!,
        ...r.armorIds.filter((id): id is number => id !== null).map((id) => db.armorById.get(id)!),
      ];
      for (const item of items) {
        expect(item.rarity).toBeGreaterThanOrEqual(5);
        expect(item.rarity).toBeLessThanOrEqual(6);
      }
      if (r.charmId !== null) expect(db.charmsById.get(r.charmId)!.rarity).toBeLessThanOrEqual(6);
    }
  });

  it('is reproducible with a fixed seed', () => {
    const req = request({ skills: [{ id: 3, level: 3 }] });
    expect(runGa(db, req).results[0]).toEqual(runGa(db, req).results[0]);
  });
});
