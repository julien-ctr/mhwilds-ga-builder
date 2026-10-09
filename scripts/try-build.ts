import { getDb } from '../src/model/db';
import { runGa } from '../src/engine/ga';
import { DEFAULT_GA, DEFAULT_OBJECTIVES, EMPTY_BLACKLIST, MAX_RARITY } from '../src/engine/request';
import { ARMOR_KINDS } from '../src/model/types';
const db = getDb();
const byName = (n: string) => db.data.skills.find((s) => s.name === n)!;
const want = process.argv.slice(2).map((a) => { const [n, l] = a.split('='); return { id: byName(n).id, level: +l }; });
const t = Date.now();
const out = runGa(db, { weaponKind: 'gunlance', weaponOptions: { shells: ['wide'] }, lockedWeaponId: null, skills: want, rank: 'high', minRarity: 1, maxRarity: MAX_RARITY, objectives: DEFAULT_OBJECTIVES, ga: DEFAULT_GA, blacklist: EMPTY_BLACKLIST });
console.log(`${Date.now() - t} ms, gens ${out.generations}, evals ${out.evaluations}, candidates ${out.candidateCounts}`);
for (const r of out.results.slice(0, 2)) {
  console.log('--- missing', r.missing, 'def', r.defense, 'score', r.score.toFixed(1));
  console.log(' arme', db.weaponsById.get(r.weaponId!)?.name, JSON.stringify(db.weaponsById.get(r.weaponId!)?.specifics));
  r.armorIds.forEach((id, k) => console.log(' ', ARMOR_KINDS[k], id && db.armorById.get(id)!.name));
  console.log('  talisman', r.charmId && db.charmsById.get(r.charmId)!.name);
  console.log('  joyaux', r.decorations.map((d) => `${db.decorationsById.get(d.decorationId)!.name}@${d.owner}`).join(', '));
  console.log('  talents', r.skills.map((s) => `${db.skill(s.id)!.name} ${s.level}`).join(', '));
}
