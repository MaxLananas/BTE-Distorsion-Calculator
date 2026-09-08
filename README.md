# Distortion Lab

Explorateur indépendant des distorsions de la projection **BTE Modified Airocean**. Interface française responsive, carte Leaflet, mesures locales et comparaison de deux points. Initiative originale : **MaxLananas & Tiwiss**.

## Démarrer

Node.js **22.12+** (ou version compatible avec Vite 8).

```sh
npm ci
npm run dev
```

Ouvrir l’adresse indiquée par Vite. Le serveur écoute sur `0.0.0.0` ; les hôtes de prévisualisation `*.e2b.app` sont autorisés.

```sh
npm test                 # tests numériques et contre-vérification du PDF
npx playwright install --with-deps chromium
npm run test:browser     # parcours navigateur ; démarre Vite si nécessaire
npm run build            # site statique dans dist/
npm run preview          # prévisualisation du build
```

Sur un environnement avec Chromium préinstallé, définir `CHROMIUM_PATH`. Les tests navigateur ont aussi été exécutés dans le sandbox avec un binaire Chromium alternatif et ses bibliothèques système, les téléchargements Playwright/CDN y étant bloqués.

## Utilisation

- **Un lieu** : exemple, latitude/longitude, clic sur la carte ou déplacement du marqueur.
- **Une distance** : sélectionner A/B avec les boutons « Placer sur la carte ». Comparaison géodésique WGS84 / distance plane des extrémités.
- **Mes coordonnées Minecraft** : saisir X/Z ; un bouton distinct charge les anciens relevés de Chambord. Ces observations ne sont pas authentifiées indépendamment.
- **Échantillons d’échelle** : 70 points dans la fenêtre courante, recalculés au déplacement ; survol pour les chiffres. Bleu = contraction ; vert = 0 à 5 % ; ocre = 5 à 15 % ; corail = ≥15 %. Pas une interpolation continue.
- **Exporter JSON** : coordonnées, modèle, métrique, résultats, paramètres et référence source.
- **Partager** : URL avec paramètres dans le fragment. Aucun stockage serveur des analyses. Les coordonnées sont visibles dans le lien partagé.

## Méthode et preuves

Lire **[l’audit technique](public/research/AUDIT.md)**, également livré à l’URL `research/AUDIT.md` sur le site. Il documente les trois projets, leurs révisions, les erreurs de l’ancien calculateur, les formules et ce qui n’a pas été validé.

Le moteur est un port du pipeline source Terra++ avec sa table conforme, la mise à l’échelle BTE et l’inversion verticale. Les dérivées sont calculées par déplacements WGS84 de ±1 m, contrôlés à ±0,5 m. **Ce n’est pas une reproduction chiffre pour chiffre de `/distortion`**, qui utilise une métrique sphérique et un autre schéma de différences finies. Les valeurs propres de `JᵀJ` donnent les échelles principales. La référence WGS84 est commune aux mesures locales et aux distances.

**Ne pas confondre une propriété inévitable des projections, un compromis BTE et un bug d’implémentation.** La moyenne locale n’est ni une distorsion mondiale ni une validation d’un bâtiment réel. Le [PDF fourni](https://github.com/MaxLananas/BTE-Distorsion-Calculator/blob/f9a2a20898aa0dbaa410b811c81ede9e1a4b9193/markdown-preview.pdf) est confronté au modèle dans une étude de cas dédiée : [contre-vérification détaillée](public/research/PDF-REVIEW.md). Les six paires sont recalculées à l’ouverture et exportables séparément. `npm run verify:pdf` produit le rapport JSON, sans navigateur. Les distances du modèle et celles des X/Z entiers du dépôt sont volontairement séparées.

## Architecture

- `src/projection.js` : géométrie et table conforme, sans DOM.
- `src/metrics.js` : GeographicLib, jacobien, valeurs singulières, géodésiques et garde-fous.
- `src/app.js` : état, formulaires, carte, export et partage.
- `src/style.css` : interface responsive.
- `public/conformal.bin` : table binaire servie localement (530 Ko), dérivée sans perte de `conformal.lzma`.
- `scripts/prepare-grid.py` : régénération vérifiée par empreinte SHA-256.
- `public/data/` : fond Natural Earth simplifié (~303 Ko), secours aux tuiles réseau.
- `tests/` : calculs et parcours navigateur.

Pas de backend, de clé API, de décompression LZMA à l’exécution, ni de substitution silencieuse de modèle. Les calculs sont locaux. Les tuiles CARTO/OSM et polices Google sont des ressources externes : leurs fournisseurs reçoivent les requêtes habituelles du navigateur. Le fond Natural Earth reste disponible sans eux, mais sans détail urbain. Le téléchargement initial du site demeure nécessaire ; ce n’est pas une PWA hors ligne.

## Publication

Publier **le contenu de `dist/`**, pas les sources à la racine. Le chemin relatif Vite permet un sous-répertoire tel que `/BTE-Distorsion-Calculator/`. Un ancien hébergement GitHub Pages configuré pour servir directement la racine devra être remplacé par un workflow de build ou un déploiement de `dist/`. Aucune configuration GitHub distante n’a été changée par cette refonte.

## Licences et attributions

Port et table Terra++ : [licence MIT BuildTheEarth](public/TERRA-LICENSE.txt). Les contributions originales conservent leurs droits respectifs. Leaflet et GeographicLib : voir leurs licences dans les dépendances. Fond Natural Earth : domaine public ; origine et révision dans l’audit. Tuiles : © OpenStreetMap contributors, © CARTO. L’application n’est ni affiliée ni approuvée par BuildTheEarth.
