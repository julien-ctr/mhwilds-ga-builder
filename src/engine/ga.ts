import type { Db } from '../model/db';
import { Evaluator, GENE_COUNT, type Genome } from './fitness';
import type { BuildRequest, BuildResult } from './request';

export interface GaProgress {
  generation: number;
  totalGenerations: number;
  bestScore: number;
  bestMissing: number;
  evaluations: number;
}

export interface GaOutput {
  results: BuildResult[];
  generations: number;
  evaluations: number;
  /** Candidate counts per gene after pruning (weapon, 5 armor, charm). */
  candidateCounts: number[];
}

/** Small, fast, seedable PRNG (mulberry32). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Individual {
  genome: Genome;
  score: number;
}

export interface RunOptions {
  onProgress?: (p: GaProgress) => void;
  shouldStop?: () => boolean;
}

/**
 * Evolutionary search over (weapon, 5 armor pieces, charm). Decorations are not evolved:
 * each genome is decoded with the greedy decoration solver.
 */
export function runGa(db: Db, request: BuildRequest, options: RunOptions = {}): GaOutput {
  const ev = new Evaluator(db, request);
  const sizes = ev.geneSizes;
  const params = request.ga;
  if (!ev.hasWeapons) return { results: [], generations: 0, evaluations: 0, candidateCounts: sizes };

  const rng = createRng(params.seed);
  const randInt = (n: number) => Math.floor(rng() * n);

  // Per-gene sampling weights favouring candidates that bring requested skills or slots.
  const weights = sizes.map((n, g) => {
    const w = Array.from({ length: n }, (_, i) => 1 + ev.geneUsefulness(g, i));
    const total = w.reduce((a, b) => a + b, 0);
    return { w, total };
  });
  const biasedPick = (g: number) => {
    const { w, total } = weights[g];
    let r = rng() * total;
    for (let i = 0; i < w.length; i++) {
      r -= w[i];
      if (r <= 0) return i;
    }
    return w.length - 1;
  };

  const make = (genome: Genome): Individual => ({ genome, score: ev.evaluate(genome).score });

  /** Coordinate-descent local search: tries every candidate for every gene until no improvement. */
  const hillClimb = (ind: Individual): Individual => {
    let best = ind;
    let improved = true;
    while (improved) {
      improved = false;
      for (let g = 0; g < GENE_COUNT; g++) {
        for (let v = 0; v < sizes[g]; v++) {
          if (v === best.genome[g]) continue;
          const genome = best.genome.slice();
          genome[g] = v;
          const cand = make(genome);
          if (cand.score > best.score) {
            best = cand;
            improved = true;
          }
        }
      }
    }
    return best;
  };

  // Initial population: biased random individuals + a greedy seed.
  let population: Individual[] = [];
  const greedy = sizes.map((n, g) => {
    let bi = 0;
    for (let i = 1; i < n; i++) if (ev.geneUsefulness(g, i) > ev.geneUsefulness(g, bi)) bi = i;
    return bi;
  });
  population.push(hillClimb(make(greedy)));
  while (population.length < params.populationSize) {
    population.push(make(sizes.map((_, g) => biasedPick(g))));
  }

  const tournament = (): Individual => {
    let best = population[randInt(population.length)];
    for (let i = 0; i < 2; i++) {
      const c = population[randInt(population.length)];
      if (c.score > best.score) best = c;
    }
    return best;
  };

  const eliteCount = Math.max(2, Math.round(params.populationSize * 0.05));
  const mutationRate = 1 / GENE_COUNT;
  let bestScore = -Infinity;
  let stall = 0;
  let generation = 0;

  for (generation = 1; generation <= params.generations; generation++) {
    population.sort((a, b) => b.score - a.score);
    if (population[0].score > bestScore) {
      bestScore = population[0].score;
      stall = 0;
    } else {
      stall++;
    }

    options.onProgress?.({
      generation,
      totalGenerations: params.generations,
      bestScore,
      bestMissing: ev.evaluate(population[0].genome).missing,
      evaluations: ev.evaluations,
    });
    if (stall >= params.stallGenerations || options.shouldStop?.()) break;

    // Periodic local search on the champion (memetic step).
    if (generation % 25 === 0) population[0] = hillClimb(population[0]);

    const next: Individual[] = population.slice(0, eliteCount);
    while (next.length < params.populationSize) {
      const a = tournament();
      const b = tournament();
      const child = a.genome.map((gene, g) => (rng() < 0.5 ? gene : b.genome[g]));
      for (let g = 0; g < GENE_COUNT; g++) {
        if (rng() < mutationRate) child[g] = rng() < 0.7 ? biasedPick(g) : randInt(sizes[g]);
      }
      next.push(make(child));
    }
    population = next;
  }

  // Polish the best distinct individuals, then rank everything we have seen in the final population.
  population.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const finals: Individual[] = [];
  for (const ind of population) {
    const polished = finals.length < params.resultCount ? hillClimb(ind) : ind;
    for (const cand of [polished, ind]) {
      const key = cand.genome.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      finals.push(cand);
    }
  }
  finals.sort((a, b) => b.score - a.score);

  return {
    results: finals.slice(0, params.resultCount).map((i) => ev.toResult(i.genome)),
    generations: Math.min(generation, params.generations),
    evaluations: ev.evaluations,
    candidateCounts: sizes,
  };
}
