import { describe, expect, it } from 'vitest';
import { getDb } from '../src/model/db';
import { hornCatalog, weaponMatches, weaponSpecificScore } from '../src/weapons/specifics';

describe('gunlance specifics', () => {
  const gunlances = getDb().weaponsByKind.get('gunlance')!;

  it('has shelling data for every gunlance', () => {
    expect(gunlances.length).toBeGreaterThan(20);
    for (const g of gunlances) expect(g.specifics.kind).toBe('gunlance');
  });

  it('filters by shelling type and minimum level', () => {
    const wide3 = gunlances.filter((g) => weaponMatches(g, { shells: ['wide'], minShellLevel: 3 }));
    expect(wide3.length).toBeGreaterThan(0);
    for (const g of wide3) {
      expect(g.specifics).toMatchObject({ shell: 'wide' });
      if (g.specifics.kind === 'gunlance') expect(g.specifics.shellLevel).toBeGreaterThanOrEqual(3);
    }
    const excluded = gunlances.filter((g) => !weaponMatches(g, { shells: ['wide'], minShellLevel: 3 }));
    expect(excluded.some((g) => g.specifics.kind === 'gunlance' && g.specifics.shell === 'normal')).toBe(true);
  });

  it('accepts any shelling when no type is selected', () => {
    expect(gunlances.every((g) => weaponMatches(g, {}))).toBe(true);
  });

  it('scores higher shelling levels only when asked', () => {
    const g = gunlances[0];
    expect(weaponSpecificScore(g, {})).toBe(0);
    expect(weaponSpecificScore(g, { preferShellLevel: true })).toBeGreaterThan(0);
  });
});

describe('hunting horn specifics', () => {
  const horns = getDb().weaponsByKind.get('hunting-horn')!;
  const sample = horns.find((h) => h.specifics.kind === 'hunting-horn' && h.specifics.echoWave)!;
  if (sample.specifics.kind !== 'hunting-horn') throw new Error('unreachable');
  const { songs, echoBubble, echoWave } = sample.specifics;

  it('has melodies, echo bubble and echo wave data', () => {
    expect(horns.length).toBeGreaterThan(20);
    expect(songs.length).toBeGreaterThan(0);
    expect(echoBubble).not.toBeNull();
  });

  it('requires every selected song', () => {
    expect(weaponMatches(sample, { songs: songs.slice(0, 2) })).toBe(true);
    expect(weaponMatches(sample, { songs: [...songs, 'Mélodie inexistante'] })).toBe(false);
    const matching = horns.filter((h) => weaponMatches(h, { songs: [songs[songs.length - 1]] }));
    for (const h of matching) {
      if (h.specifics.kind === 'hunting-horn') expect(h.specifics.songs).toContain(songs[songs.length - 1]);
    }
  });

  it('filters by echo bubble and echo wave kinds', () => {
    expect(weaponMatches(sample, { echoBubbles: [echoBubble!.kind], echoWaves: [echoWave!.kind] })).toBe(true);
    expect(weaponMatches(sample, { echoBubbles: ['__none__'] })).toBe(false);
    expect(weaponMatches(sample, { echoWaves: ['__none__'] })).toBe(false);
  });

  it('lists every song in the catalog', () => {
    const catalog = hornCatalog(horns);
    expect(catalog.songs.map((s) => s.name)).toEqual(expect.arrayContaining(songs));
    expect(catalog.echoBubbles.length).toBeGreaterThanOrEqual(5);
    expect(catalog.echoWaves.length).toBeGreaterThanOrEqual(5);
  });
});
