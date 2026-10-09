import type { SlotOwner } from './request';

/** A decoration projected onto the requested skills (vec[i] = levels of requested skill i). */
export interface SolverDeco {
  id: number;
  slot: number;
  kind: 'weapon' | 'armor';
  vec: number[];
}

export interface SolverSlot {
  size: number;
  owner: SlotOwner;
  kind: 'weapon' | 'armor';
}

export interface SolverResult {
  placed: { decoration: SolverDeco; slot: SolverSlot }[];
  free: SolverSlot[];
  /** Remaining deficit per requested skill after placing decorations. */
  remaining: number[];
}

/**
 * Greedily fills slots to cover skill deficits.
 *
 * At each step, picks the decoration with the best (useful levels / slot size used) ratio,
 * placing it in the smallest compatible free slot; ties prefer decorations wasting fewer levels.
 * Weapon decorations only go in weapon slots and armor decorations only in armor slots.
 */
export function solveDecorations(deficit: number[], slots: SolverSlot[], decos: SolverDeco[]): SolverResult {
  const remaining = deficit.slice();
  const sorted = slots.slice().sort((a, b) => a.size - b.size);
  const used = new Array<boolean>(sorted.length).fill(false);
  const placed: SolverResult['placed'] = [];

  if (remaining.some((r) => r > 0)) {
    for (;;) {
      let bestDeco = -1;
      let bestSlot = -1;
      let bestRatio = 0;
      let bestUseful = 0;
      let bestWaste = 0;
      for (let d = 0; d < decos.length; d++) {
        const deco = decos[d];
        let useful = 0;
        let waste = 0;
        for (let i = 0; i < remaining.length; i++) {
          if (deco.vec[i] > 0 && remaining[i] > 0) useful += Math.min(deco.vec[i], remaining[i]);
          if (deco.vec[i] > remaining[i]) waste += deco.vec[i] - remaining[i];
        }
        if (useful === 0) continue;
        let slot = -1;
        for (let s = 0; s < sorted.length; s++) {
          if (!used[s] && sorted[s].kind === deco.kind && sorted[s].size >= deco.slot) {
            slot = s;
            break;
          }
        }
        if (slot < 0) continue;
        const ratio = useful / sorted[slot].size;
        // Best ratio, then most useful levels, then smallest slot, then fewest wasted levels.
        const better =
          ratio !== bestRatio
            ? ratio > bestRatio
            : useful !== bestUseful
              ? useful > bestUseful
              : sorted[slot].size !== sorted[bestSlot].size
                ? sorted[slot].size < sorted[bestSlot].size
                : waste < bestWaste;
        if (bestDeco < 0 || better) {
          bestDeco = d;
          bestSlot = slot;
          bestRatio = ratio;
          bestUseful = useful;
          bestWaste = waste;
        }
      }
      if (bestDeco < 0) break;
      const deco = decos[bestDeco];
      used[bestSlot] = true;
      placed.push({ decoration: deco, slot: sorted[bestSlot] });
      for (let i = 0; i < remaining.length; i++) remaining[i] = Math.max(0, remaining[i] - deco.vec[i]);
      if (remaining.every((r) => r === 0)) break;
    }
  }

  return { placed, free: sorted.filter((_, s) => !used[s]), remaining };
}
