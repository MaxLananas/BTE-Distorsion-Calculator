# Distortion Lab — audit technique et protocole

**Date : 8 septembre 2026.** Analyse indépendante. Ce document porte sur le code source et une configuration donnée, pas sur tous les serveurs BuildTheEarth. Le PDF fourni a depuis été examiné : voir la [contre-vérification du dossier Chambord](PDF-REVIEW.md). La reproduction numérique est distinguée de la validation terrain.

## 1. Périmètre et sources primaires

Les trois dépôts ont été consultés localement aux révisions suivantes :

| Projet | Révision examinée | Rôle constaté |
|---|---|---|
| Terra++ | `b6b49d2737216b0c8dd787516f1fc82fb7cd1c20` | Mod ; projection et génération |
| TerraMinusMinus | `a1432a9beabd79025e62c8de0d0b1a99e7ea9943` | Fork destiné à être une bibliothèque, sans dépendance Minecraft/Forge |
| TerraPlusMinus | `195d2049c8e25f9fdcf83c877ca4ed61ce755587` | Plugin utilisant TerraMinusMinus |

Sources reproductibles :

1. [DymaxionProjection.java, Terra++](https://github.com/BuildTheEarth/terraplusplus/blob/b6b49d2737216b0c8dd787516f1fc82fb7cd1c20/src/main/java/net/buildtheearth/terraplusplus/projection/dymaxion/DymaxionProjection.java) : sommets, faces, rotations, transformation triangulaire, dépliage.
2. [ConformalDynmaxionProjection.java](https://github.com/BuildTheEarth/terraplusplus/blob/b6b49d2737216b0c8dd787516f1fc82fb7cd1c20/src/main/java/net/buildtheearth/terraplusplus/projection/dymaxion/ConformalDynmaxionProjection.java) : table conforme, interpolation, Newton et `metersPerUnit()`.
3. [BTEDymaxionProjection.java](https://github.com/BuildTheEarth/terraplusplus/blob/b6b49d2737216b0c8dd787516f1fc82fb7cd1c20/src/main/java/net/buildtheearth/terraplusplus/projection/dymaxion/BTEDymaxionProjection.java) : réarrangement continental et coupures.
4. [Configuration BTE](https://github.com/BuildTheEarth/terraplusplus/blob/b6b49d2737216b0c8dd787516f1fc82fb7cd1c20/src/main/resources/net/buildtheearth/terraplusplus/generator/bte_generator_settings.json5) : `scale(flip_vertical(bte_conformal_dymaxion))`, X = Y = 7318261.522857145.
5. [MathUtils.java](https://github.com/BuildTheEarth/terraplusplus/blob/b6b49d2737216b0c8dd787516f1fc82fb7cd1c20/src/main/java/net/buildtheearth/terraplusplus/util/MathUtils.java) : matrice `produceZYZRotationMatrix`.
6. [GeographicProjection.java](https://github.com/BuildTheEarth/terraplusplus/blob/b6b49d2737216b0c8dd787516f1fc82fb7cd1c20/src/main/java/net/buildtheearth/terraplusplus/projection/GeographicProjection.java) : méthode `tissot`, référence sphérique et différences avant.
7. [TerraMinusMinus](https://github.com/SmylerMC/terraminusminus/tree/a1432a9beabd79025e62c8de0d0b1a99e7ea9943) : README, classes de projection et configuration.
8. [TerraPlusMinus](https://github.com/BTE-Germany/TerraPlusMinus/tree/195d2049c8e25f9fdcf83c877ca4ed61ce755587) : dépendance Terra-- et `DistortionCommand.java`.
9. [GeographicLib JavaScript](https://geographiclib.sourceforge.io/JavaScript/doc/) : géodésiques de Charles Karney ; dépendance `geographiclib-geodesic` 2.2.0.
10. [Ancien calculateur, révision auditée](https://github.com/MaxLananas/BTE-Distorsion-Calculator/blob/794ae8572d15e7da528fd809019ec1526d7e6d32/index.html).

**Conclusion de filiation :** ces noms ne désignent pas trois projections indépendantes à classer. Terra+- consomme Terra--, lui-même issu de Terra++. Le nom du logiciel ne suffit pas à déterminer la projection, son échelle ni ses transformations. Il faut lire la configuration effective du monde. L’outil actuel ne simule que la configuration BTE citée en [4] ; le mode empirique accepte des relevés d’autres configurations sans en identifier la cause.

## 2. Défauts avérés de l’ancien calculateur

Ces défauts appartiennent au **calculateur de ce dépôt**, pas automatiquement à Terra++.

### P0 — ordre des rotations inversé

L’ancien `zyz(z1,y,z2)` multipliait `Rz(z1) Ry(y) Rz(z2)`. La formule Java [5] correspond à `Rz(z2) Ry(y) Rz(z1)` pour un vecteur colonne. Les rotations ne commutent pas. Conséquence : mauvaise position dans la face de référence, donc coordonnées et dérivées incorrectes. La refonte corrige l’ordre et le teste contre les neuf coefficients explicites de Java.

### P0 — incohérence d’unités

`bteFromGeo()` renvoyait des coordonnées non mises à l’échelle, tandis que `tissot()` divisait les dérivées par un rayon en mètres. Le résultat n’était pas un rapport blocs/mètre. La chaîne [4], inversion verticale comprise, est désormais appliquée avant toute mesure. La sortie est X/Z en blocs.

### P1 — substitution silencieuse de projection

Sans table LZMA, l’ancienne application utilisait la transformation non conforme comme simple mode « moins précis ». Or il s’agit d’un autre modèle. La refonte charge automatiquement la table locale et bloque l’analyse si elle manque. Aucun résultat de substitution n’est présenté comme BTE conforme.

### P1 — anisotropie incomplète

`|h−k| / moyenne(h,k)` ne mesure pas toute l’anisotropie : deux colonnes de même norme peuvent être non orthogonales. Un cisaillement fournit un contre-exemple. La refonte calcule les valeurs singulières du jacobien ; anisotropie = `(a/b−1) × 100`.

### P1 — fausse distance calculée

L’ancien résultat inter-points était `distance_haversine × échelle au milieu arithmétique`. Ce n’est ni la distance euclidienne des extrémités projetées, ni l’intégrale du trajet projeté. Le milieu arithmétique des longitudes échoue notamment près de l’antiméridien. La refonte projette les deux extrémités et utilise une géodésique WGS84 robuste, y compris pour les points antipodaux.

### P2 — présentation trompeuse et validation insuffisante

- Un signe « + » ajouté systématiquement produisait des valeurs ambiguës pour les contractions.
- Les seuils de couleur ne tenaient pas correctement compte des contractions.
- Les latitudes/longitudes hors domaine et certains champs vides n’étaient pas traités proprement.
- Des points identiques entraînaient une division par zéro en mode empirique.
- Une dispersion faible était présentée comme une confirmation d’homogénéité : elle ne prouve ni l’absence d’erreur systématique ni une précision de relevé.
- Les rayons de référence variaient entre modes sans comparaison cohérente.

## 3. Ce que le système BTE déforme réellement

### Échelle locale variable : propriété de projection

La transformation conforme approchée ne conserve pas partout les longueurs. Un facteur global ne peut supprimer une variation locale. Mais accuser `metersPerUnit()` d’être, à lui seul, « la cause du bug » inverse l’explication : une normalisation constante ne fait que fixer l’échelle générale d’un modèle déjà non isométrique. Le pipeline réellement configuré [4], et non le seul retour d’une méthode, définit les blocs.

### Conforme approchée ≠ exactement conforme ≠ isométrique

Le code [2] se décrit comme « almost conformal ». La table discrète, son interpolation affine par triangles et l’inversion en cinq itérations sont des approximations numériques. Il ne faut ni affirmer une conservation parfaite des angles ni interpréter un faible angle comme une conservation de surface. La refonte mesure la déformation obtenue ; elle ne démontre pas une borne mondiale d’erreur du solveur de Newton.

### Coupures

Le dépliage et le réarrangement continental [1,3] créent des coupures. Des points proches sur Terre peuvent être éloignés dans le plan. La notion de jacobien local ne s’applique pas à travers une discontinuité. Une distance traversant une coupure n’est pas une « inflation locale de bâtiment ».

### La métrique de référence compte

`GeographicProjection.tissot()` [6] utilise une sphère de rayon `EARTH_CIRCUMFERENCE / (2π)` et un pas angulaire avant de `1E-7`. Ici, les déplacements de référence sont géodésiques sur **WGS84**, avec des différences centrées de ±1 m. Le même point peut donc produire un résultat légèrement différent de `/distortion`, sans que l’un des logiciels soit nécessairement bogué. L’écart sphère/ellipsoïde fait partie de notre mesure. La projection elle-même reste le modèle sphérique de Terra++.

Le `DistortionCommand` examiné dans Terra+- lit la projection du monde, effectue `toGeo(X,Z)`, puis appelle `tissot()`. Il affiche déjà échelles min/max, moyenne, angle et aire. Ce n’est pas une preuve que le plugin ignorerait la distorsion.

### Autres facteurs, non mesurés ici

Relief et distance 3D, résolution des données d’altitude, géoréférencement des images, arrondis en blocs, modifications de builds, translation de mondes et transformations personnalisées doivent être évalués séparément. Cet audit ne démontre aucune faille de sécurité, ni une erreur de chaque bâtiment construit, ni un pourcentage global unique de distorsion BTE.

## 4. Calcul reproductible

Pour `P(longitude, latitude) = (X,Z)` :

1. Obtenir par GeographicLib les quatre points WGS84 situés à 1 m, azimuts 90°, 270°, 0°, 180°.
2. Former `E = (P_est − P_ouest)/2` et `N = (P_nord − P_sud)/2`, en blocs/m.
3. Former `J = [E N]`. Les racines des valeurs propres de `JᵀJ` donnent `a ≥ b`.
4. Échelle de synthèse `(a+b)/2` ; surface `|det J|` ; angle maximal `2 asin((a−b)/(a+b))` ; anisotropie `(a/b−1) × 100`.
5. Répéter à ±0,5 m. L’écart affiché est un **diagnostic de sensibilité au pas**, pas un intervalle de confiance.

Un résultat est refusé si |latitude| > 89,99°, si non fini, si a > 10, si b < 0,01, ou si l’écart d’échelle entre les deux pas dépasse 0,01. Ces seuils sont des garde-fous heuristiques, pas une preuve formelle de régularité.

Pour une paire : `d_terre = géodésique WGS84`, `d_blocs = hypot(X₂−X₁,Z₂−Z₁)`, `rapport = d_blocs/d_terre`. Les points distants de moins de 1 cm sont refusés. Une géodésique échantillonnée en 64 segments signale une coupure si un segment projeté dépasse dix fois sa longueur terrestre. **Cette heuristique peut manquer une coupure ; aucune garantie topologique.** Un avertissement supplémentaire apparaît au-delà de 100 km. En mode empirique, la coupure ne peut pas être détectée sans connaître la projection.

## 5. Exemple : Chambord

Au point latitude 47.616514°, longitude 1.516710°, cette implémentation donne :

| Mesure | Résultat numérique |
|---|---:|
| X | 2 741 702,1045 blocs |
| Z | −4 933 205,6223 blocs |
| a | 1,0540821 |
| b | 1,0516697 |
| Échelle moyenne | 1,0528759 soit +5,2876 % |
| Aire locale | 1,1085462 soit +10,8546 % |
| Angle maximal | 0,1312812° |

Ce sont des **sorties du modèle**, pas un relevé terrain indépendant. Les quatre points de l’ancien exemple sont reproduits à moins d’un bloc **par axe**, ce qui constitue une vérification utile de signe, ordre de rotation et échelle. L’origine des relevés n’est pas authentifiée. Ce test ne remplace pas une comparaison exhaustive Java/JS.

## 6. Données, tests et limites de validation

- `conformal.lzma` est identique octet par octet à la ressource Terra++ de la révision examinée.
- SHA-256 compressé : `296d33faf7f49fb3b9ba097ffa9f35a335f23efa3cf2e75569bfd21766b30823`.
- `public/conformal.bin` est sa décompression sans changement numérique : 530 448 octets, 33 153 paires de doubles big-endian. Le script Python fourni la régénère.
- Les tests unitaires couvrent unités, matrices, SVD, géodésiques, validation, points connus, stabilité, discontinuité synthétique et distances.
- Les tests navigateur couvrent changement de mode, export, partage, mobile, interactions, absence de grille et fond de carte de secours.
- Le build de production est testé. Les calculs et les données de secours sont locaux ; tuiles CARTO/OSM et polices Google restent externes. Pas de télémétrie applicative.
- Pas de benchmark Java/JS exhaustif exécuté, pas de borne certifiée pour toutes les faces, pas d’audit complet du moteur de génération. Les tests de régression ne sont pas une preuve indépendante de vérité géodésique.

### Fond géographique embarqué

Natural Earth, échelle 1:110 millions, domaine public : [conditions](https://www.naturalearthdata.com/about/terms-of-use/). Données issues de [natural-earth-vector, révision ca96624a56bd078437bca8184e78163e5039ad19](https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19/geojson) : `ne_110m_admin_0_countries.geojson` et `ne_110m_populated_places.geojson`, propriétés inutilisées retirées. Frontières cartographiques indicatives, sans prise de position politique. Ce fond ne convient pas à une lecture cadastrale ou à l’échelle d’un bâtiment.

## 7. Étapes nécessaires pour renforcer les preuves

1. Obtenir les scripts et fichiers AutoCAD originaux du PDF désormais examiné ; plusieurs équations et unités nécessitent les corrections documentées dans [PDF-REVIEW.md](PDF-REVIEW.md).
2. Ajouter des fixtures générées directement par la même version Java sur les 22 faces, près des sommets et de chaque coupure.
3. Archiver des relevés terrain avec version du plugin, configuration complète, coordonnées non arrondies et incertitude.
4. Comparer sphère et WGS84 explicitement avec deux modes de référence si l’objectif est de reproduire `/distortion` chiffre pour chiffre.
5. Étudier un échantillonnage mondial pondéré par surface terrestre avant d’avancer une statistique globale ; une moyenne de villes n’est pas une moyenne de la Terre.
