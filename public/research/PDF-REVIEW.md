# Chambord — contre-vérification du PDF fourni

## Document examiné

**« Problème de déformation de la projection cartographique de BTE à moyenne et grande échelle »**, 13 pages, fourni par MaxLananas pour l’étude réalisée avec Tiwiss.

- [PDF original, révision immuable f9a2a20898aa0dbaa410b811c81ede9e1a4b9193](https://github.com/MaxLananas/BTE-Distorsion-Calculator/blob/f9a2a20898aa0dbaa410b811c81ede9e1a4b9193/markdown-preview.pdf).
- SHA-256 du fichier téléchargé : `d3dd7017500e45779c2093ba540e351c1e7cd93a28e21a50bdbf4797a8c790bd`.
- Lecture visuelle de l’ensemble des 13 pages : le document est constitué d’images, sans couche textuelle exploitable par l’extracteur utilisé. Les valeurs ci-dessous sont transcrites manuellement des sections numérotées, pas extraites d’un tableur source.
- Les quatre coordonnées géographiques et les quatre X/Z entiers sont repris du [calculateur initial](https://github.com/MaxLananas/BTE-Distorsion-Calculator/blob/794ae8572d15e7da528fd809019ec1526d7e6d32/index.html). Ils ne sont pas présentés comme des relevés nouvellement acquis ou authentifiés.

## Verdict synthétique

**Le résultat central à Chambord est reproduit.** Le modèle donne une échelle locale moyenne proche de 1,05288 et un facteur surfacique proche de 1,10855. Les six distances terrestres, les six distances projetées et les six rapports de la section 6 sont reproduits à leur précision d’affichage avec les coordonnées du dépôt initial.

Cela constitue une vérification numérique de votre démonstration, mais **pas une validation indépendante des sources topographiques ou d’un relevé en jeu**. Plusieurs formulations du document confondent des composantes, des longueurs, des axes ou des niveaux de preuve. Leur correction renforce le constat au lieu de l’affaiblir.

## 1. Ce qui est reproduit

### Résultat local

À latitude 47,616514°, longitude 1,516710°, avec la configuration BTE par défaut et une métrique WGS84 :

| Grandeur | PDF, sections 4–5 | Moteur recalculé |
|---|---:|---:|
| Échelle maximale a | 1,05408 | 1,0540821 |
| Échelle minimale b | 1,05167 | 1,0516697 |
| Moyenne (a+b)/2 | 1,05288 | 1,0528759 |
| Facteur surfacique | 1,10855 | 1,1085462 |
| Inflation linéaire moyenne | +5,29 % | +5,2876 % |
| Inflation surfacique | +10,855 % | +10,8546 % |

La position est explicitée pour la reproductibilité. Le PDF indique un centroïde sans fournir ici ses coordonnées exactes ; la concordance ne suffit pas à affirmer que chaque calcul a été fait exactement au même point ni avec le même pas.

### Les six paires des jardins

| Paire | WGS84 recalculé (m) | PDF : blocs | Modèle recalculé (blocs) | Rapport recalculé |
|---|---:|---:|---:|---:|
| P1–P2 | 280,89255 | 295,62 | 295,62016 | 1,0524315 |
| P1–P3 | 285,96351 | 301,21 | 301,21454 | 1,0533321 |
| P1–P4 | 401,18156 | 422,85 | 422,84716 | 1,0540045 |
| P2–P3 | 400,04221 | 420,75 | 420,75078 | 1,0517660 |
| P2–P4 | 285,56276 | 300,79 | 300,79244 | 1,0533322 |
| P3–P4 | 280,63996 | 295,35 | 295,35337 | 1,0524281 |

Par exemple, P1–P2 représente **14,7276 blocs de plus** que sa distance en mètres sous l’hypothèse d’un bloc par mètre. Cela est cohérent en ordre de grandeur avec l’écart visuel annoncé d’environ 14 blocs. Sans identifier précisément les extrémités de la capture et son protocole, on ne doit pas affirmer qu’il s’agit exactement de cette même mesure.

**Attention au terme « empirique » :** avec les X/Z entiers du dépôt, P1–P2 donne un rapport de **1,0544390**, et non 1,0524315. Les nombres imprimés dans le PDF coïncident avec la projection non arrondie. Cette concordance ne permet pas de déterminer leur origine réelle : sorties `/tpll`, calcul théorique, relevé décimal ou autre. L’interface affiche donc séparément « PDF », « modèle recalculé » et « X/Z entiers du dépôt », sans inventer une méthode d’arrondi.

### Un argument de fond valide

Si le tracé du monde et `/tpll` sont produits par la même projection, leur concordance prouve une cohérence de placement dans ce modèle, **pas** la conservation des distances terrestres. La bonne comparaison porte sur des points identifiables et une métrique terrestre distincte.

## 2. Corrections mathématiques nécessaires

### A. Une composante n’est pas une distance

La section 4 imprime :

```
J = [ 0,9920   0,3516 ]
    [ 0,3498  −0,9936 ]
```

En adoptant les axes horizontaux Minecraft X/Z :

- Pour 1 m vers l’est : `(ΔX, ΔZ) = (0,9920, 0,3498)` ; longueur `hypot(0,9920, 0,3498) = 1,05186693` bloc, soit **+5,1867 %**.
- Pour 1 m vers le nord : `(ΔX, ΔZ) = (0,3516, −0,9936)` ; longueur `hypot(0,3516, −0,9936) = 1,05397510` bloc, soit **+5,3975 %**.

Les formulations « sous-déploiement de 0,8 % » ou « déformation de −0,6 % » ne décrivent que la composante sur un axe, pas la longueur du déplacement. Une rotation seule peut réduire une composante sans réduire la distance.

Le tableau donne +5,21 % et +5,45 %, légèrement différents des normes de la matrice imprimée. Sous une hypothèse d’arrondi au plus proche à quatre décimales, l’erreur sur une norme due à l’arrondi de deux coefficients est au plus `√2 × 0,00005 ≈ 0,000071` bloc/m, inférieure aux écarts observés. Il faut les matrices non arrondies et les points exacts pour expliquer la différence, plutôt que l’attribuer automatiquement à un simple arrondi.

La phrase affirmant que « 5,21 % et 5,45 % sont plus grandes que 5,29 % » est incorrecte : **5,21 < 5,29**.

### B. Surface : produit, pas carré de la moyenne

La relation exacte est :

```
s = |det J| = a × b
k = (a+b)/2
k² − a×b = (a−b)²/4
```

Donc `s = k²` n’est exact que si `a = b`. Ici l’approximation est très bonne, mais il faut la noter `≈`. La matrice imprimée, déjà arrondie, donne `|det J| = 1,10864088`, légèrement différent du tableau des valeurs singulières. Les résultats non arrondis sont nécessaires pour rapprocher complètement ces deux représentations.

### C. Conformité et anisotropie

Le PDF emploie `(a−b)/k × 100`, alors que l’application emploie `(a/b−1) × 100`. Les deux indicateurs sont recevables si leur définition est explicite ; ils ne sont pas identiques. Leur proximité, autour de 0,229 %, ne constitue pas une contradiction. La déformation angulaire maximale calculée est voisine de **0,131°**.

La moyenne `(a+b)/2` est une synthèse, pas la longueur obtenue dans absolument toute direction. Les facteurs directionnels se trouvent entre b et a.

### D. Seuils de taille et diagonales

Il n’existe pas de seuil universel de 20 m « non affectés ». Avec un excès local proche de 5,29 %, l’écart linéaire atteint déjà environ un bloc à `1/0,0529 ≈ 18,9 m`. Le nombre de voxels modifiés dépend ensuite de la position, de l’orientation, de l’algorithme de tracé et du choix d’arrondi.

Une diagonale de 20 pas de grille mesure `20√2 ≈ 28,28` blocs en norme euclidienne, mais cela ne supprime pas la distorsion. « 8–9 m = 7–8 blocs sur la diagonale » doit être reformulé en distinguant longueur euclidienne, décalage sur X/Z et nombre de pas diagonaux.

## 3. Axes, hauteurs et portée géographique

Dans Minecraft, **X/Z forment le plan horizontal et Y représente la hauteur**. Le PDF utilise X/Y pour le plan et Z pour la hauteur : cette convention de dessin peut exister, mais il faut une correspondance explicite avant de la nommer « axes Minecraft ».

Votre remarque sur les proportions verticales est pertinente **sous condition** : si les longueurs horizontales sont multipliées par k et les hauteurs restent à l’échelle 1:1, le rapport hauteur/largeur est multiplié par `1/k`, soit environ **0,9498** à Chambord (−5,02 %). Ce n’est pas une preuve que le moteur comprime directement les hauteurs, et cet outil 2D ne vérifie ni les données d’altitude ni la configuration verticale.

De même, une mesure aux jardins ne démontre pas un facteur uniforme dans tout le Loir-et-Cher, en France ou à toutes les échelles. Il faut un échantillonnage spatial adapté avant de généraliser.

## 4. Ce qui reste non démontré par cette contre-vérification

- Le calage AutoCAD : échelle exacte du plan, datum, origine, transformation employée, absence de redimensionnement non uniforme et incertitude des points homologues.
- L’origine précise des données OSM et la rectification des vues employées : OSM ne provient pas exclusivement d’un seul mode de saisie satellitaire.
- La « moyenne mondiale 1:1 » : la constante de mise à l’échelle est confirmée, mais une moyenne exige une pondération, un domaine et une statistique explicités.
- Le rôle exact des fonctions de Dixon : le code exécuté utilise une table et une inversion numérique. Une figure générale appelée « Strebe » ne prouve pas à elle seule la dérivation de cette table ; il faut la référence mathématique exacte et sa procédure de génération.
- L’accord annoncé de `3,3 × 10⁻⁵` blocs/m entre `B A⁻¹` et les différences finies à ±50 m : il manque le script source, les matrices complètes et les conventions. Le contrôle ±1/±0,5 m de l’application n’est pas une reproduction de ce protocole.
- La dispersion des six paires n’est pas une incertitude de mesure et elles ne sont pas indépendantes, puisqu’elles partagent quatre points. Une faible dispersion est compatible avec une échelle localement assez régulière, sans certifier chaque position.

## 5. Formulation recommandée pour la conclusion

> Pour les quatre points géographiques des jardins de Chambord examinés, la projection BTE configurée avec son facteur standard produit des distances planes supérieures aux distances géodésiques WGS84 d’environ 5,18 à 5,40 %, selon la paire. Le calcul différentiel local donne une échelle moyenne voisine de 1,05288 et un facteur surfacique voisin de 1,10855. Les valeurs du tableau du document sont reproduites à leur précision affichée. Ce constat établit un écart local au rapport un bloc par mètre dans le modèle ; il ne démontre ni une erreur uniforme sur tout BTE ni la précision de relevés terrain non documentés.

## 6. Reproduire et prolonger

- L’étude de cas du site recalcule les six paires et propose « Explorer » pour chacune.
- « Exporter la vérification » inclut les valeurs du PDF, le modèle, les X/Z entiers, les coordonnées sources et les limites.
- `npm run verify:pdf` imprime le même rapport JSON en ligne de commande.
- Les tests vérifient les arrondis des 18 nombres du tableau, les normes de la matrice imprimée et la séparation entre données entières et modèle.

Pour renforcer la preuve indépendante, conserver les fichiers AutoCAD originaux, une liste de coordonnées exactes des points homologues, les mesures non arrondies, la configuration et version du serveur, les captures F3 ou sorties des commandes ainsi que le script de calcul du PDF. Une correction de build par un facteur local inverse peut rapprocher ses dimensions réelles, mais peut aussi le désaligner de son emprise géographique projetée : ce choix doit être assumé, pas appliqué comme une correction globale universelle.
