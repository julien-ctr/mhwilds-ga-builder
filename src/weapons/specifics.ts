import type { HornEffect, ShellType, Weapon, WeaponKind } from '../model/types';

/**
 * Weapon-type-specific constraints and preferences chosen by the user.
 * Every field is optional; only those relevant to the selected weapon type are used.
 */
export interface WeaponOptions {
  /** Gunlance: accepted shelling types (empty/undefined = any). */
  shells?: ShellType[];
  /** Gunlance: minimum shelling level. */
  minShellLevel?: number;
  /** Gunlance: favour higher shelling levels among otherwise equal builds. */
  preferShellLevel?: boolean;
  /** Charge blade / switch axe: accepted phial types (empty/undefined = any). */
  phials?: string[];
  /** Insect glaive: minimum kinsect level. */
  minKinsectLevel?: number;
  /** Bow: coatings the bow must support (all of them). */
  coatings?: string[];
  /** Hunting horn: songs the horn must be able to play (all of them, French names). */
  songs?: string[];
  /** Hunting horn: accepted echo bubble kinds (empty/undefined = any). */
  echoBubbles?: string[];
  /** Hunting horn: accepted echo wave kinds (empty/undefined = any). */
  echoWaves?: string[];
}

interface SpecificsHandler {
  /** Hard constraint: weapons failing it are never considered. */
  filter(weapon: Weapon, opts: WeaponOptions): boolean;
  /** Optional soft preference, normalized to 0..100. */
  score?(weapon: Weapon, opts: WeaponOptions): number;
}

const passThrough: SpecificsHandler = { filter: () => true };

const anyOf = <T>(allowed: T[] | undefined, value: T) => !allowed || allowed.length === 0 || allowed.includes(value);

export const MAX_SHELL_LEVEL = 4;

const handlers: Partial<Record<WeaponKind, SpecificsHandler>> = {
  gunlance: {
    filter(w, o) {
      if (w.specifics.kind !== 'gunlance') return false;
      return anyOf(o.shells, w.specifics.shell) && w.specifics.shellLevel >= (o.minShellLevel ?? 0);
    },
    score(w, o) {
      if (!o.preferShellLevel || w.specifics.kind !== 'gunlance') return 0;
      return (w.specifics.shellLevel / MAX_SHELL_LEVEL) * 100;
    },
  },
  'charge-blade': {
    filter: (w, o) => w.specifics.kind === 'charge-blade' && anyOf(o.phials, w.specifics.phial),
  },
  'switch-axe': {
    filter: (w, o) => w.specifics.kind === 'switch-axe' && anyOf(o.phials, w.specifics.phial),
  },
  'insect-glaive': {
    filter: (w, o) => w.specifics.kind === 'insect-glaive' && w.specifics.kinsectLevel >= (o.minKinsectLevel ?? 0),
  },
  'hunting-horn': {
    filter: (w, o) => {
      if (w.specifics.kind !== 'hunting-horn') return false;
      const { songs, echoBubble, echoWave } = w.specifics;
      return (
        (o.songs ?? []).every((s) => songs.includes(s)) &&
        (!o.echoBubbles?.length || (echoBubble !== null && o.echoBubbles.includes(echoBubble.kind))) &&
        (!o.echoWaves?.length || (echoWave !== null && o.echoWaves.includes(echoWave.kind)))
      );
    },
  },
  bow: {
    filter: (w, o) => {
      if (w.specifics.kind !== 'bow') return false;
      const coatings = w.specifics.coatings;
      return (o.coatings ?? []).every((c) => coatings.includes(c));
    },
  },
};

function handler(kind: WeaponKind): SpecificsHandler {
  return handlers[kind] ?? passThrough;
}

export function weaponMatches(weapon: Weapon, opts: WeaponOptions): boolean {
  return handler(weapon.kind).filter(weapon, opts);
}

export function weaponSpecificScore(weapon: Weapon, opts: WeaponOptions): number {
  return handler(weapon.kind).score?.(weapon, opts) ?? 0;
}

export interface HornCatalog {
  /** Every song name, sorted, with how many horns can play it. */
  songs: { name: string; count: number }[];
  echoBubbles: HornEffect[];
  echoWaves: HornEffect[];
}

/** Every hunting horn song, echo bubble and echo wave present in the data. */
export function hornCatalog(horns: Weapon[]): HornCatalog {
  const songs = new Map<string, number>();
  const bubbles = new Map<string, HornEffect>();
  const waves = new Map<string, HornEffect>();
  for (const h of horns) {
    if (h.specifics.kind !== 'hunting-horn') continue;
    for (const s of h.specifics.songs) songs.set(s, (songs.get(s) ?? 0) + 1);
    if (h.specifics.echoBubble) bubbles.set(h.specifics.echoBubble.kind, h.specifics.echoBubble);
    if (h.specifics.echoWave) waves.set(h.specifics.echoWave.kind, h.specifics.echoWave);
  }
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr');
  return {
    songs: [...songs].map(([name, count]) => ({ name, count })).sort(byName),
    echoBubbles: [...bubbles.values()].sort(byName),
    echoWaves: [...waves.values()].sort(byName),
  };
}
