// Normalized domain types. Generated JSON in src/data follows these shapes.

export type ArmorKind = 'head' | 'chest' | 'arms' | 'waist' | 'legs';
export const ARMOR_KINDS: ArmorKind[] = ['head', 'chest', 'arms', 'waist', 'legs'];

export type WeaponKind =
  | 'great-sword'
  | 'long-sword'
  | 'sword-shield'
  | 'dual-blades'
  | 'hammer'
  | 'hunting-horn'
  | 'lance'
  | 'gunlance'
  | 'switch-axe'
  | 'charge-blade'
  | 'insect-glaive'
  | 'light-bowgun'
  | 'heavy-bowgun'
  | 'bow';

export type SkillKind = 'armor' | 'weapon' | 'set' | 'group';

export interface SkillLevel {
  id: number;
  level: number;
}

export interface SkillRank {
  level: number;
  /** Only set/group ranks have their own name (e.g. "Second souffle I"). */
  name: string | null;
  description: string;
  /** Only set/group ranks: number of pieces needed to activate this rank. */
  piecesRequired: number | null;
}

export interface Skill {
  id: number;
  name: string;
  kind: SkillKind;
  description: string | null;
  maxLevel: number;
  ranks: SkillRank[];
}

/** [fire, water, ice, thunder, dragon] (API order) */
export type Resistances = [number, number, number, number, number];

export interface Armor {
  id: number;
  name: string;
  kind: ArmorKind;
  rank: 'low' | 'high';
  rarity: number;
  defenseBase: number;
  defense: number; // max (fully upgraded)
  resistances: Resistances;
  slots: number[];
  /** Regular skill points (armor/weapon kind skills). */
  skills: SkillLevel[];
  /** Set/group skill ids this piece counts towards. */
  setSkills: number[];
  setId: number | null;
}

export interface ArmorSet {
  id: number;
  name: string;
}

export interface Decoration {
  id: number;
  name: string;
  slot: number;
  kind: 'weapon' | 'armor';
  rarity: number;
  skills: SkillLevel[];
}

export interface Charm {
  /** Charm *rank* id (each rank is a distinct equippable talisman). */
  id: number;
  name: string;
  level: number;
  rarity: number;
  skills: SkillLevel[];
}

export type ShellType = 'normal' | 'wide' | 'long';

/** Hunting horn echo bubble / echo wave: stable code + French name. */
export interface HornEffect {
  kind: string;
  name: string;
}

export type WeaponSpecifics =
  | { kind: 'gunlance'; shell: ShellType; shellLevel: number }
  | { kind: 'charge-blade'; phial: string }
  | { kind: 'switch-axe'; phial: string; phialDamage: number | null }
  | { kind: 'insect-glaive'; kinsectLevel: number }
  | { kind: 'bow'; coatings: string[] }
  | {
      kind: 'hunting-horn';
      /** Note colors of the melody set (e.g. purple, red, yellow). */
      notes: string[];
      songs: string[];
      echoBubble: HornEffect | null;
      echoWave: HornEffect | null;
    }
  | { kind: 'light-bowgun' | 'heavy-bowgun'; ammo: { kind: string; level: number; capacity: number }[]; specialAmmo: string | null }
  | { kind: 'none' };

export interface WeaponSpecial {
  /** Element (fire, water, ...) or status (poison, sleep, ...). */
  type: string;
  value: number;
  hidden: boolean;
}

export interface Sharpness {
  red: number;
  orange: number;
  yellow: number;
  green: number;
  blue: number;
  white: number;
  purple: number;
}

export interface Weapon {
  id: number;
  name: string;
  kind: WeaponKind;
  rarity: number;
  attack: number; // display value
  affinity: number;
  defenseBonus: number;
  elderseal: string | null;
  specials: WeaponSpecial[];
  sharpness: Sharpness | null;
  slots: number[];
  skills: SkillLevel[];
  specifics: WeaponSpecifics;
}

export interface GameData {
  version: string;
  skills: Skill[];
  armor: Armor[];
  sets: ArmorSet[];
  decorations: Decoration[];
  charms: Charm[];
  weapons: Weapon[];
}
