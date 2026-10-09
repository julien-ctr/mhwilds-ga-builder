/** Lowercase, accent-free version of a string for tolerant search ("maitre" finds "Maître"). */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
}

export const compareFr = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });

/** "Joyau maître III [3]" → "Joyau maître III" (the socket marker already shows the size). */
export const decorationLabel = (name: string) => name.replace(/\s*\[\d\]$/, '');

export const formatNumber = (n: number) => n.toLocaleString('fr-FR');

/** CSS colour token of an item rarity (★1 to ★8). */
export const rarityColor = (rarity: number) => `var(--r${Math.min(8, Math.max(1, rarity))})`;
