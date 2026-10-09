import type { ArmorKind, ShellType, SkillKind, WeaponKind } from '../model/types';
import type { BlacklistCategory, SlotOwner } from '../engine/request';

// All user-facing text lives here. The app is French-only by design.

export const WEAPON_KIND_LABELS: Record<WeaponKind, string> = {
  'great-sword': 'Grande épée',
  'long-sword': 'Épée longue',
  'sword-shield': 'Épée et bouclier',
  'dual-blades': 'Lames doubles',
  hammer: 'Marteau',
  'hunting-horn': 'Corne de chasse',
  lance: 'Lance',
  gunlance: 'Lancecanon',
  'switch-axe': 'Morpho-hache',
  'charge-blade': 'Volto-hache',
  'insect-glaive': 'Insectoglaive',
  'light-bowgun': 'Fusarbalète léger',
  'heavy-bowgun': 'Fusarbalète lourd',
  bow: 'Arc',
};

export const ARMOR_KIND_LABELS: Record<ArmorKind, string> = {
  head: 'Tête',
  chest: 'Torse',
  arms: 'Bras',
  waist: 'Taille',
  legs: 'Jambes',
};

export const SLOT_OWNER_LABELS: Record<SlotOwner, string> = { weapon: 'Arme', ...ARMOR_KIND_LABELS };

export const SHELL_LABELS: Record<ShellType, string> = {
  normal: 'Normal',
  wide: 'Large',
  long: 'Long',
};

export const CHARGE_BLADE_PHIAL_LABELS: Record<string, string> = {
  impact: "Fiole d'impact",
  element: 'Fiole élémentaire',
};

export const SWITCH_AXE_PHIAL_LABELS: Record<string, string> = {
  power: 'Fiole de force',
  element: 'Fiole élémentaire',
  dragon: 'Fiole draconique',
  exhaust: "Fiole d'épuisement",
  paralyze: 'Fiole de paralysie',
  poison: 'Fiole de poison',
};

export const COATING_LABELS: Record<string, string> = {
  'close-range': 'Fiole de mêlée',
  power: 'Fiole de puissance',
  pierce: 'Fiole perforante',
  paralysis: 'Fiole de paralysie',
  poison: 'Fiole de poison',
  sleep: 'Fiole de sommeil',
  blast: 'Fiole explosive',
  exhaust: "Fiole d'épuisement",
};

export const ELEMENT_LABELS: Record<string, string> = {
  fire: 'Feu',
  water: 'Eau',
  thunder: 'Foudre',
  ice: 'Glace',
  dragon: 'Dragon',
  poison: 'Poison',
  sleep: 'Sommeil',
  paralysis: 'Paralysie',
  blastblight: 'Explosion',
};

export const SKILL_KIND_LABELS: Record<SkillKind, string> = {
  armor: "Talent d'armure",
  weapon: "Talent d'arme",
  set: 'Bonus de série',
  group: 'Bonus de groupe',
};

export const OBJECTIVE_LEVELS: { value: number; label: string }[] = [
  { value: 0, label: 'Ignoré' },
  { value: 0.5, label: 'Faible' },
  { value: 1, label: 'Normal' },
  { value: 2, label: 'Fort' },
];

export const T = {
  appTitle: 'Forge de sets',
  appSubtitle: 'Générateur de sets pour Monster Hunter Wilds par algorithme évolutionnaire',
  dataVersion: 'Données du',

  weaponSection: 'Arme',
  weaponType: "Type d'arme",
  lockedWeapon: 'Arme imposée',
  anyWeapon: "Laisser l'algorithme choisir",
  noMatchingWeapon: 'Aucune arme ne correspond à ces critères.',
  matchingWeapons: (n: number) => `${n} arme${n > 1 ? 's' : ''} correspondant à ces critères.`,

  hornSongs: 'Mélodies requises',
  addSong: 'Ajouter une mélodie…',
  hornsCount: (n: number) => `${n} cor${n > 1 ? 's' : ''}`,
  allSongsRequired: 'Le cor doit pouvoir jouer toutes les mélodies choisies.',
  echoBubble: "Bulle d'écho",
  echoWave: "Onde d'écho",
  anyEcho: 'Pour les bulles et les ondes, tout est accepté si rien n’est coché.',
  songs: 'Mélodies',
  songRequired: 'requise',
  resultTitle: (n: number) => `${n} set${n > 1 ? 's' : ''}`,
  runMeta: (ms: number, generations: number, evals: number) =>
    `${(ms / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} s · ${generations} générations · ${evals.toLocaleString('fr-FR')} combinaisons`,
  rerun: 'Relancer',
  previousResults: 'résultats précédents affichés',

  shellType: "Type d'obus",
  anyShell: 'Tous les types acceptés si aucun n’est coché.',
  minShellLevel: "Niveau d'obus minimum",
  preferShellLevel: "Privilégier un niveau d'obus élevé",
  phialType: 'Type de fiole',
  anyPhial: 'Toutes les fioles acceptées si aucune n’est cochée.',
  minKinsectLevel: 'Niveau de kinsecte minimum',
  requiredCoatings: 'Fioles requises',

  skillsSection: 'Talents recherchés',
  skillSearch: 'Rechercher un talent…',
  noSkillFound: 'Aucun talent trouvé.',
  noSkillSelected: 'Ajoutez les talents que vous souhaitez obtenir.',
  level: 'Niv.',
  pieces: (n: number) => `${n} pièces`,
  remove: 'Retirer',

  optionsSection: 'Options',
  rank: 'Rang',
  rankHigh: 'Rang supérieur',
  rankAll: 'Tous les rangs',
  minRarity: 'Rareté minimale',
  maxRarity: 'Rareté maximale',
  noArmorInRange: 'Aucune armure ne correspond à ce rang et à cette rareté.',
  objectives: 'Objectifs secondaires',
  objDefense: 'Défense',
  objFreeSlots: 'Emplacements libres',
  objBonusSkills: 'Talents supplémentaires',
  objWeaponAttack: "Attaque de l'arme",

  advanced: 'Paramètres avancés',
  population: 'Taille de la population',
  generations: 'Générations maximum',
  stall: 'Arrêt après stagnation (générations)',
  seed: 'Graine aléatoire',
  resultCount: 'Nombre de résultats',

  run: 'Lancer la recherche',
  cancel: 'Annuler',
  searching: 'Recherche en cours…',
  generation: (g: number, total: number) => `Génération ${g} / ${total}`,
  bestMissing: (n: number) => (n === 0 ? 'Tous les talents sont atteints' : `${n} niveau(x) manquant(s)`),
  noResults: 'Aucun résultat. Assouplissez les contraintes sur l’arme ou la rareté.',
  emptyState: 'Choisissez une arme et des talents, puis lancez la recherche.',

  build: (n: number) => `Set n°${n}`,
  complete: 'Tous les talents demandés',
  missing: (n: number) => `${n} niveau(x) manquant(s)`,
  defense: 'Défense',
  attack: 'Attaque',
  affinity: 'Affinité',
  element: 'Élément',
  shell: 'Obus',
  phial: 'Fiole',
  kinsect: 'Kinsecte',
  charm: 'Talisman',
  noCharm: 'Aucun talisman',
  nothing: '—',
  slot: 'Emplacement',
  piece: 'Pièce',
  decorations: 'Joyaux',
  freeSlot: 'libre',
  skills: 'Talents',
  requested: 'demandé',

  hoverDecosSwitch: 'Inclure les joyaux au survol des pièces',
  pieceSkills: 'Talents apportés',
  noSkills: 'Aucun talent.',
  withDecos: 'Joyaux inclus',
  withoutDecos: 'Sans joyaux',
  noSlotsOnCharm: "Pas d'emplacement",
  fromPiece: 'pièce',
  fromDecos: 'joyaux',
  setContributions: 'Bonus de série / groupe',
  equippedPieces: (n: number) => `${n} pièce${n > 1 ? 's' : ''} équipée${n > 1 ? 's' : ''}`,
  nextRank: (pieces: number, name: string) => `${name} à ${pieces}`,
  inactive: 'inactif',

  blacklistSection: 'Objets exclus',
  blacklistHint: "Utilisez le bouton ⊘ d'un set proposé pour exclure un objet que vous ne possédez pas : il ne sera plus suggéré.",
  blacklistEmpty: 'Aucun objet exclu.',
  exclude: "Exclure (je n'ai pas cet objet)",
  include: 'Réinclure cet objet',
  clearBlacklist: 'Tout réinclure',
  blacklistChanged: 'La liste des objets exclus a changé : relancez la recherche pour mettre à jour les sets.',
};

export const BLACKLIST_CATEGORY_LABELS: Record<BlacklistCategory, string> = {
  weapons: 'Armes',
  armor: 'Armures',
  charms: 'Talismans',
  decorations: 'Joyaux',
};
