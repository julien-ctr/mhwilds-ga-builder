# Forge de sets – Monster Hunter Wilds

Générateur de builds pour Monster Hunter Wilds basé sur un algorithme génétique.
L'outil permet de choisir son arme principale ainsi que les talents désirés, et va chercher a obtenir la meilleure combinaison d'équipements pour satisfaire la requête.
Les builds proposés sont constitués d'une arme, des 5 pièces d'armure, du talisman ainsi que des joyaux.

## Démarrage en local

```bash
npm install
npm run dev        # http://localhost:5173
```

| Commande          | Rôle                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| `npm run sync`    | Télécharge les données (FR) depuis wilds.mhdb.io vers `src/data/`      |
| `npm test`        | Tests unitaires (vitest)                                               |
| `npm run build`   | Vérification TypeScript + build statique dans `dist/`                  |
| `npx tsx scripts/try-build.ts "Maître d'armes=5" "Expert en survie=3"` | Recherche en ligne de commande (lancecanon, obus Large) |

Relancez `npm run sync` après une mise à jour du jeu ; les fichiers générés sont versionnés.

## Fonctionnement

- **Données** (`scripts/sync-data.ts`) : l'API [wilds.mhdb.io](https://docs.wilds.mhdb.io/) en locale `fr`,
  avec repli sur l'anglais si un texte n'est pas traduit, normalisée en JSON compact.
- **Évaluation** (`src/engine/`) : le génome est `[arme, tête, torse, bras, taille, jambes, talisman]`.
  Les joyaux ne sont pas évolués : un solveur glouton les place dans les emplacements libres
  (joyaux d'arme → emplacements d'arme, joyaux d'armure → emplacements d'armure).
  Les bonus de série et de groupe s'activent selon le nombre de pièces.
- **Score** : chaque niveau de talent manquant coûte 10 000 points ; ensuite défense, emplacements libres,
  talents supplémentaires, attaque de l'arme et préférences spécifiques (niveau d'obus) départagent.
- **Recherche** (`src/engine/ga.ts`) : élagage des pièces dominées, population initiale biaisée,
  sélection par tournoi, croisement uniforme, mutation, élitisme et recherche locale périodique.
  Tourne dans un Web Worker, avec une seed reproductible.
- **Blacklist** : le bouton ⊘ d'un set proposé exclut une arme, une pièce, un talisman ou un joyau
  de la recherche ; la liste est conservée dans le navigateur et appliquée aux recherches suivantes.
- **Spécificités d'arme** (`src/weapons/specifics.ts`) : registre par type d'arme (filtre + score),
  à étendre pour d'autres armes.
