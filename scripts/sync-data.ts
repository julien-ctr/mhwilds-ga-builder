/**
 * Pulls Monster Hunter Wilds data from https://wilds.mhdb.io (French locale),
 * normalizes it and writes compact JSON files to src/data.
 *
 * Usage: npm run sync
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Armor,
  ArmorSet,
  Charm,
  Decoration,
  Skill,
  SkillLevel,
  Weapon,
  WeaponKind,
  WeaponSpecifics,
} from '../src/model/types';

const API = 'https://wilds.mhdb.io';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');

// The API is loosely typed; we only touch known fields below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

async function get(locale: string, path: string): Promise<Raw> {
  const url = `${API}/${locale}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

/** Fetch an endpoint in French, with an English copy indexed by id for fallbacks. */
async function getLocalized(path: string): Promise<{ fr: Raw[]; en: Map<number, Raw> }> {
  const [fr, en] = await Promise.all([get('fr', path), get('en', path)]);
  return { fr, en: new Map((en as Raw[]).map((x) => [x.id, x])) };
}

const fallbacks: string[] = [];

/** French text, or the English one if the French translation is missing. */
function text(frValue: unknown, enValue: unknown, where: string): string {
  if (typeof frValue === 'string' && frValue.trim() !== '') return frValue;
  if (typeof enValue === 'string' && enValue.trim() !== '') {
    fallbacks.push(where);
    return enValue;
  }
  return '';
}

function skillLevels(raw: Raw[], predicate: (kind: string | undefined) => boolean = () => true): SkillLevel[] {
  return (raw ?? [])
    .filter((s: Raw) => predicate(s.skill?.kind))
    .map((s: Raw) => ({ id: s.skill.id, level: s.level }));
}

async function syncSkills(): Promise<Skill[]> {
  const { fr, en } = await getLocalized('skills');
  return fr.map((s: Raw): Skill => {
    const e = en.get(s.id);
    const ranks = [...s.ranks].sort((a: Raw, b: Raw) => a.level - b.level);
    return {
      id: s.id,
      name: text(s.name, e?.name, `skill ${s.id}`),
      kind: s.kind,
      description: s.description ?? e?.description ?? null,
      maxLevel: Math.max(...ranks.map((r: Raw) => r.level)),
      ranks: ranks.map((r: Raw) => {
        const er = e?.ranks.find((x: Raw) => x.id === r.id);
        return {
          level: r.level,
          name: r.name ?? er?.name ?? null,
          description: text(r.description, er?.description, `skill ${s.id} rank ${r.level}`),
          piecesRequired: r.setPiecesRequired ?? null,
        };
      }),
    };
  });
}

async function syncArmor(): Promise<Armor[]> {
  const { fr, en } = await getLocalized('armor');
  const isSetLike = (k: string | undefined) => k === 'set' || k === 'group';
  return fr.map((a: Raw): Armor => {
    const r = a.resistances;
    return {
      id: a.id,
      name: text(a.name, en.get(a.id)?.name, `armor ${a.id}`),
      kind: a.kind,
      rank: a.rank,
      rarity: a.rarity,
      defenseBase: a.defense.base,
      defense: a.defense.max,
      resistances: [r.fire, r.water, r.ice, r.thunder, r.dragon],
      slots: [...a.slots].sort((x: number, y: number) => y - x),
      skills: skillLevels(a.skills, (k) => !isSetLike(k)),
      setSkills: [...new Set<number>(a.skills.filter((s: Raw) => isSetLike(s.skill.kind)).map((s: Raw) => s.skill.id))],
      setId: a.armorSet?.id ?? null,
    };
  });
}

async function syncSets(): Promise<ArmorSet[]> {
  // Only names are needed here; the endpoint also embeds full pieces.
  const { fr, en } = await getLocalized('armor/sets');
  return fr.map((s: Raw) => ({ id: s.id, name: text(s.name, en.get(s.id)?.name, `set ${s.id}`) }));
}

async function syncDecorations(): Promise<Decoration[]> {
  const { fr, en } = await getLocalized('decorations');
  return fr.map((d: Raw): Decoration => ({
    id: d.id,
    name: text(d.name, en.get(d.id)?.name, `decoration ${d.id}`),
    slot: d.slot,
    kind: d.kind,
    rarity: d.rarity,
    skills: skillLevels(d.skills),
  }));
}

async function syncCharms(): Promise<Charm[]> {
  const { fr, en } = await getLocalized('charms');
  return fr
    .filter((c: Raw) => !c.random)
    .flatMap((c: Raw) =>
      c.ranks.map((r: Raw): Charm => ({
        id: r.id,
        name: text(r.name, en.get(c.id)?.ranks.find((x: Raw) => x.id === r.id)?.name, `charm rank ${r.id}`),
        level: r.level,
        rarity: r.rarity,
        skills: skillLevels(r.skills),
      })),
    );
}

function weaponSpecifics(w: Raw): WeaponSpecifics {
  switch (w.kind as WeaponKind) {
    case 'gunlance':
      return { kind: 'gunlance', shell: w.shell, shellLevel: w.shellLevel };
    case 'charge-blade':
      return { kind: 'charge-blade', phial: w.phial };
    case 'switch-axe':
      return { kind: 'switch-axe', phial: w.phial?.kind, phialDamage: w.phial?.damage?.display ?? null };
    case 'insect-glaive':
      return { kind: 'insect-glaive', kinsectLevel: w.kinsectLevel };
    case 'bow':
      return { kind: 'bow', coatings: w.coatings ?? [] };
    case 'hunting-horn':
      return {
        kind: 'hunting-horn',
        notes: w.melody?.notes ?? [],
        songs: (w.melody?.songs ?? []).map((s: Raw) => s.name),
        echoBubble: w.echoBubble ? { kind: w.echoBubble.kind, name: w.echoBubble.name } : null,
        echoWave: w.echoWave ? { kind: w.echoWave.kind, name: w.echoWave.name } : null,
      };
    case 'light-bowgun':
    case 'heavy-bowgun':
      return {
        kind: w.kind,
        ammo: (w.ammo ?? []).map((a: Raw) => ({ kind: a.kind, level: a.level, capacity: a.capacity })),
        specialAmmo: w.specialAmmo ?? null,
      };
    default:
      return { kind: 'none' };
  }
}

async function syncWeapons(): Promise<Weapon[]> {
  const { fr, en } = await getLocalized('weapons');
  return fr.map((w: Raw): Weapon => ({
    id: w.id,
    name: text(w.name, en.get(w.id)?.name, `weapon ${w.id}`),
    kind: w.kind,
    rarity: w.rarity,
    attack: w.damage.display,
    affinity: w.affinity,
    defenseBonus: w.defenseBonus ?? 0,
    elderseal: w.elderseal ?? null,
    specials: (w.specials ?? []).map((s: Raw) => ({
      type: s.element ?? s.status,
      value: s.damage.display,
      hidden: !!s.hidden,
    })),
    sharpness: w.sharpness ?? null,
    slots: [...w.slots].sort((x: number, y: number) => y - x),
    skills: skillLevels(w.skills),
    specifics: weaponSpecifics(w),
  }));
}

function write(name: string, data: unknown): void {
  const file = join(OUT_DIR, `${name}.json`);
  writeFileSync(file, JSON.stringify(data));
  console.log(`  ${name}.json  ${Array.isArray(data) ? `${data.length} entrées` : ''}`);
}

async function main(): Promise<void> {
  console.log(`Synchronisation depuis ${API} (fr)…`);
  const [version, skills, armor, sets, decorations, charms, weapons] = await Promise.all([
    fetch(`${API}/version`).then((r) => r.json()),
    syncSkills(),
    syncArmor(),
    syncSets(),
    syncDecorations(),
    syncCharms(),
    syncWeapons(),
  ]);
  mkdirSync(OUT_DIR, { recursive: true });
  write('version', { version: version.version, syncedAt: new Date().toISOString() });
  write('skills', skills);
  write('armor', armor);
  write('sets', sets);
  write('decorations', decorations);
  write('charms', charms);
  write('weapons', weapons);
  if (fallbacks.length) {
    console.warn(`⚠ ${fallbacks.length} textes sans traduction française (anglais utilisé) :`);
    for (const f of fallbacks.slice(0, 50)) console.warn(`  - ${f}`);
  } else {
    console.log('Toutes les données sont traduites en français.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
