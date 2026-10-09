import type { ArmorKind, SkillLevel, WeaponKind } from '../model/types';
import type { WeaponOptions } from '../weapons/specifics';

/** Relative weight of each secondary objective (0 = ignored). */
export interface ObjectiveWeights {
  defense: number;
  freeSlots: number;
  bonusSkills: number;
  weaponAttack: number;
  /** Weapon-type-specific preference (e.g. gunlance shelling level). */
  weaponSpecific: number;
}

export interface GaParams {
  populationSize: number;
  generations: number;
  /** Stop early after this many generations without improvement. */
  stallGenerations: number;
  seed: number;
  resultCount: number;
}

/** Items the user cannot get; never suggested. Ids per category (charm ids are charm rank ids). */
export interface Blacklist {
  weapons: number[];
  armor: number[];
  charms: number[];
  decorations: number[];
}

export type BlacklistCategory = keyof Blacklist;

export const EMPTY_BLACKLIST: Blacklist = { weapons: [], armor: [], charms: [], decorations: [] };

export interface BuildRequest {
  weaponKind: WeaponKind;
  weaponOptions: WeaponOptions;
  /** Force a specific weapon (id), or let the algorithm choose. */
  lockedWeaponId: number | null;
  skills: SkillLevel[];
  rank: 'high' | 'all';
  minRarity: number;
  maxRarity: number;
  objectives: ObjectiveWeights;
  ga: GaParams;
  blacklist: Blacklist;
}

export const MAX_RARITY = 8;

/** True when an item's rarity is within the request's [minRarity, maxRarity] range. */
export function inRarityRange(item: { rarity: number }, request: Pick<BuildRequest, 'minRarity' | 'maxRarity'>): boolean {
  return item.rarity >= request.minRarity && item.rarity <= request.maxRarity;
}

export const DEFAULT_OBJECTIVES: ObjectiveWeights = {
  defense: 1,
  freeSlots: 1,
  bonusSkills: 0.5,
  weaponAttack: 1,
  weaponSpecific: 1,
};

export const DEFAULT_GA: GaParams = {
  populationSize: 200,
  generations: 300,
  stallGenerations: 60,
  seed: 1,
  resultCount: 10,
};

export type SlotOwner = 'weapon' | ArmorKind;

export interface PlacedDecoration {
  decorationId: number;
  owner: SlotOwner;
  slotSize: number;
}

export interface BuildResult {
  weaponId: number | null;
  /** Armor ids in ARMOR_KINDS order (null = nothing equipped). */
  armorIds: (number | null)[];
  charmId: number | null;
  decorations: PlacedDecoration[];
  freeSlots: { owner: SlotOwner; size: number }[];
  /** All active skills (capped), sorted by level desc. */
  skills: SkillLevel[];
  /** Total missing levels across requested skills (0 = all satisfied). */
  missing: number;
  defense: number;
  score: number;
}
