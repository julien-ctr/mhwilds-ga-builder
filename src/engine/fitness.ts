import type { Db } from '../model/db';
import type { Armor, Charm, Skill, SkillLevel, Weapon } from '../model/types';
import { ARMOR_KINDS } from '../model/types';
import { weaponSpecificScore } from '../weapons/specifics';
import { solveDecorations, type SolverDeco, type SolverSlot } from './decoSolver';
import { buildCandidates, requestedVec, type Candidates } from './prune';
import type { BuildRequest, BuildResult, SlotOwner } from './request';
import { computeSkills, setSkillLevel, sortedSkillList } from './skills';

/** Score penalty per missing requested skill level; dwarfs every secondary objective. */
export const MISSING_PENALTY = 10_000;

/** Genome: [weapon, head, chest, arms, waist, legs, charm], each an index into its candidate list. */
export type Genome = number[];
export const GENE_COUNT = 7;

interface Encoded {
  vec: number[];
  /** setFlags[i] = 1 if the item counts towards requested set/group skill i. */
  setFlags: number[];
  slots: SolverSlot[];
  /** Levels of non-requested skills (for the "bonus skills" objective). */
  bonus: number;
}

export interface Evaluation {
  score: number;
  missing: number;
  defense: number;
  placed: { decoration: SolverDeco; slot: SolverSlot }[];
  free: SolverSlot[];
}

function encode(
  skills: SkillLevel[],
  slots: number[],
  slotKind: 'weapon' | 'armor',
  owner: SlotOwner,
  requested: SkillLevel[],
  setSkills: number[] = [],
): Encoded {
  const requestedIds = new Set(requested.map((r) => r.id));
  return {
    vec: requestedVec(skills, requested),
    setFlags: requested.map((r) => (setSkills.includes(r.id) ? 1 : 0)),
    slots: slots.map((size) => ({ size, owner, kind: slotKind })),
    bonus: skills.filter((s) => !requestedIds.has(s.id)).reduce((sum, s) => sum + s.level, 0),
  };
}

const EMPTY: Encoded = { vec: [], setFlags: [], slots: [], bonus: 0 };

/** Prepared problem: candidates and precomputed per-item contributions for fast evaluation. */
export class Evaluator {
  readonly db: Db;
  readonly request: BuildRequest;
  readonly candidates: Candidates;
  /** Number of candidates per gene. */
  readonly geneSizes: number[];

  private readonly requested: SkillLevel[];
  private readonly setSkill: (Skill | null)[];
  private readonly weaponEnc: Encoded[];
  private readonly armorEnc: Encoded[][];
  private readonly charmEnc: Encoded[];
  private readonly decos: SolverDeco[];
  private readonly weaponAttackScore: number[];
  private readonly weaponSpecScore: number[];
  private readonly maxDefense: number;
  private readonly maxSlots: number;
  private readonly cache = new Map<string, Evaluation>();

  constructor(db: Db, request: BuildRequest, candidates: Candidates = buildCandidates(db, request)) {
    this.db = db;
    this.request = request;
    this.candidates = candidates;
    const req = (this.requested = request.skills);

    this.setSkill = req.map((r) => {
      const s = db.skill(r.id);
      return s && (s.kind === 'set' || s.kind === 'group') ? s : null;
    });

    this.weaponEnc = candidates.weapons.map((w) => encode(w.skills, w.slots, 'weapon', 'weapon', req));
    this.armorEnc = candidates.armor.map((list, k) =>
      list.map((a) => (a ? encode(a.skills, a.slots, 'armor', ARMOR_KINDS[k], req, a.setSkills) : EMPTY)),
    );
    this.charmEnc = candidates.charms.map((c) => (c ? encode(c.skills, [], 'armor', 'head', req) : EMPTY));

    const bannedDecos = new Set(request.blacklist.decorations);
    this.decos = db.decorations
      .filter((d) => !bannedDecos.has(d.id))
      .map((d) => ({ id: d.id, slot: d.slot, kind: d.kind, vec: requestedVec(d.skills, req) }))
      .filter((d) => d.vec.some((v) => v > 0));

    const attacks = candidates.weapons.map((w) => w.attack);
    const minAtk = Math.min(...attacks);
    const maxAtk = Math.max(...attacks);
    this.weaponAttackScore = attacks.map((a) => (maxAtk > minAtk ? ((a - minAtk) / (maxAtk - minAtk)) * 100 : 100));
    this.weaponSpecScore = candidates.weapons.map((w) => weaponSpecificScore(w, request.weaponOptions));

    const best = (xs: number[]) => (xs.length ? Math.max(...xs) : 0);
    const slotSum = (s: number[]) => s.reduce((a, b) => a + b, 0);
    this.maxDefense =
      candidates.armor.reduce((sum, list) => sum + best(list.map((a) => a?.defense ?? 0)), 0) +
      best(candidates.weapons.map((w) => w.defenseBonus)) || 1;
    this.maxSlots =
      candidates.armor.reduce((sum, list) => sum + best(list.map((a) => slotSum(a?.slots ?? []))), 0) +
        best(candidates.weapons.map((w) => slotSum(w.slots))) || 1;

    this.geneSizes = [candidates.weapons.length, ...candidates.armor.map((l) => l.length), candidates.charms.length];
  }

  /** True when the request is feasible to search (at least one weapon). */
  get hasWeapons(): boolean {
    return this.candidates.weapons.length > 0;
  }

  /** Contribution vectors of a gene value (used to bias mutation). */
  geneUsefulness(gene: number, index: number): number {
    const enc =
      gene === 0 ? this.weaponEnc[index] : gene === GENE_COUNT - 1 ? this.charmEnc[index] : this.armorEnc[gene - 1][index];
    const pts = enc.vec.reduce((a, b) => a + b, 0) + enc.setFlags.reduce((a, b) => a + b, 0);
    return pts + enc.slots.reduce((a, s) => a + s.size, 0) * 0.5;
  }

  evaluate(genome: Genome): Evaluation {
    const key = genome.join(',');
    const cached = this.cache.get(key);
    if (cached) return cached;
    const result = this.evaluateUncached(genome);
    this.cache.set(key, result);
    return result;
  }

  get evaluations(): number {
    return this.cache.size;
  }

  private evaluateUncached(genome: Genome): Evaluation {
    const req = this.requested;
    const R = req.length;
    const pts = new Array<number>(R).fill(0);
    const setCount = new Array<number>(R).fill(0);
    const slots: SolverSlot[] = [];
    let bonus = 0;

    const items: Encoded[] = [
      this.weaponEnc[genome[0]],
      ...this.armorEnc.map((list, k) => list[genome[k + 1]]),
      this.charmEnc[genome[GENE_COUNT - 1]],
    ];
    for (const enc of items) {
      for (let i = 0; i < enc.vec.length; i++) pts[i] += enc.vec[i];
      for (let i = 0; i < enc.setFlags.length; i++) setCount[i] += enc.setFlags[i];
      for (const s of enc.slots) slots.push(s);
      bonus += enc.bonus;
    }

    const deficit = new Array<number>(R).fill(0);
    let setMissing = 0;
    for (let i = 0; i < R; i++) {
      const set = this.setSkill[i];
      if (set) setMissing += Math.max(0, req[i].level - setSkillLevel(set, setCount[i]));
      else deficit[i] = Math.max(0, req[i].level - pts[i]);
    }

    const solved = solveDecorations(deficit, slots, this.decos);
    const missing = solved.remaining.reduce((a, b) => a + b, 0) + setMissing;

    const weapon = this.candidates.weapons[genome[0]];
    let defense = weapon?.defenseBonus ?? 0;
    this.candidates.armor.forEach((list, k) => (defense += list[genome[k + 1]]?.defense ?? 0));
    const freeSlots = solved.free.reduce((a, s) => a + s.size, 0);

    const w = this.request.objectives;
    const score =
      -missing * MISSING_PENALTY +
      w.defense * ((defense / this.maxDefense) * 100) +
      w.freeSlots * ((freeSlots / this.maxSlots) * 100) +
      w.bonusSkills * Math.min(100, bonus * 4) +
      w.weaponAttack * (this.weaponAttackScore[genome[0]] ?? 0) +
      w.weaponSpecific * (this.weaponSpecScore[genome[0]] ?? 0);

    return { score, missing, defense, placed: solved.placed, free: solved.free };
  }

  /** Full, human-readable description of a genome. */
  toResult(genome: Genome): BuildResult {
    const ev = this.evaluate(genome);
    const weapon = this.candidates.weapons[genome[0]] ?? null;
    const armor: (Armor | null)[] = this.candidates.armor.map((list, k) => list[genome[k + 1]] ?? null);
    const charm: Charm | null = this.candidates.charms[genome[GENE_COUNT - 1]] ?? null;
    const decorations = ev.placed.map((p) => this.db.decorationsById.get(p.decoration.id)!);
    const skills = computeSkills(this.db, { weapon: weapon as Weapon | null, armor, charm, decorations });
    return {
      weaponId: weapon?.id ?? null,
      armorIds: armor.map((a) => a?.id ?? null),
      charmId: charm?.id ?? null,
      decorations: ev.placed.map((p) => ({ decorationId: p.decoration.id, owner: p.slot.owner, slotSize: p.slot.size })),
      freeSlots: ev.free.map((s) => ({ owner: s.owner, size: s.size })),
      skills: sortedSkillList(skills),
      missing: ev.missing,
      defense: ev.defense,
      score: ev.score,
    };
  }
}
