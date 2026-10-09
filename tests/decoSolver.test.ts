import { describe, expect, it } from 'vitest';
import { solveDecorations, type SolverDeco, type SolverSlot } from '../src/engine/decoSolver';

const armorSlot = (size: number): SolverSlot => ({ size, owner: 'head', kind: 'armor' });
const weaponSlot = (size: number): SolverSlot => ({ size, owner: 'weapon', kind: 'weapon' });

describe('solveDecorations', () => {
  const decos: SolverDeco[] = [
    { id: 1, slot: 1, kind: 'armor', vec: [1, 0] },
    { id: 2, slot: 3, kind: 'armor', vec: [2, 0] },
    { id: 3, slot: 2, kind: 'weapon', vec: [0, 2] },
  ];

  it('fills deficits using the smallest fitting slot', () => {
    const r = solveDecorations([1, 0], [armorSlot(3), armorSlot(1)], decos);
    expect(r.remaining).toEqual([0, 0]);
    expect(r.placed).toHaveLength(1);
    expect(r.placed[0].slot.size).toBe(1);
    expect(r.free.map((s) => s.size)).toEqual([3]);
  });

  it('never puts a decoration in a slot that is too small', () => {
    const r = solveDecorations([0, 2], [weaponSlot(1)], decos);
    expect(r.placed).toHaveLength(0);
    expect(r.remaining).toEqual([0, 2]);
  });

  it('keeps weapon and armor decorations apart', () => {
    const r = solveDecorations([0, 2], [armorSlot(3)], decos);
    expect(r.placed).toHaveLength(0);
    const w = solveDecorations([0, 2], [weaponSlot(3), armorSlot(3)], decos);
    expect(w.placed.map((p) => p.slot.kind)).toEqual(['weapon']);
    expect(w.remaining).toEqual([0, 0]);
  });

  it('covers several skills at once', () => {
    const r = solveDecorations([3, 2], [armorSlot(3), armorSlot(1), weaponSlot(2)], decos);
    expect(r.remaining).toEqual([0, 0]);
    expect(r.free).toHaveLength(0);
  });

  it('prefers the decoration that wastes fewer levels on ties', () => {
    const lvl: SolverDeco[] = [
      { id: 10, slot: 3, kind: 'weapon', vec: [3] },
      { id: 11, slot: 2, kind: 'weapon', vec: [2] },
    ];
    const r = solveDecorations([5], [weaponSlot(3), weaponSlot(3)], lvl);
    expect(r.placed.map((p) => p.decoration.id).sort()).toEqual([10, 11]);
  });
});
