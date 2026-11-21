# Kairn sur Android (APK)

L'application web existante est empaquetée avec **Capacitor 6** (WebView native) : même interface, même code, plus des rappels de révision en notifications locales. L'APK est construit par GitHub Actions.

> Capacitor 6 est volontairement épinglé : c'est la dernière version majeure qui compile avec **Java 17** (les suivantes exigent Java 21).

## 1. État des lieux du frontend (avant packaging)

| Sujet | Constat |
|---|---|
| Framework / build | React 19 + Vite 8 + Tailwind 4 ; sortie dans `dist/` (`webDir`). |
| Routage | Aucun routeur : onglets et sous-vues gérés par l'état React. Pas de `history`/URL à gérer dans la WebView. |
| Service worker | **Aucun.** Rien à désactiver ; le programme (72 missions) est embarqué dans le bundle JS, donc disponible hors ligne. |
| Stockage | `localStorage` (cache local) + synchronisation vers le serveur Docker (`/api/state`, volume `kairn_data`). Pas d'IndexedDB. |
| URL de l'API | Chemins **relatifs** (`/api/...`) : valables sur le web, **faux dans l'APK** (la WebView sert l'appli depuis `https://localhost`). Corrigé par `VITE_API_BASE_URL` (voir §3). |
| Polices | Étaient chargées depuis Google Fonts (absentes hors ligne) → désormais embarquées (`@fontsource`), rendu identique. |

Comportement et design de l'appli sont inchangés ; les seuls ajouts visibles sont, **dans l'APK uniquement**, la section « Rappels de révision » dans Réglages.

## 2. Ce qui a été ajouté

- `capacitor.config.json` : `appId` `app.kairn.coach`, `appName` `Kairn`, `webDir` `dist`, schéma `https`.
- `android/` : projet natif généré (à committer ; `android/app/src/main/assets/public` est régénéré par `cap sync` et ignoré).
- `android/app/build.gradle` : `versionCode`/`versionName` via `-PKAIRN_VERSION_CODE` / `-PKAIRN_VERSION_NAME`, signature release via `-PKAIRN_KEYSTORE_FILE` + variables d'environnement.
- `src/utils/apiBase.ts` (URL d'API), `src/native/*` (stockage durable, rappels), `src/components/RemindersSection.tsx`.
- Serveur : en-têtes **CORS** pour l'origine de la WebView (`CORS_ORIGINS`, défaut `https://localhost,capacitor://localhost,http://localhost`).
- `.github/workflows/android.yml`.

## 3. Adresse du serveur

L'APK parle à **ton** serveur Kairn (Docker). Il faut une adresse **HTTPS** joignable depuis le téléphone, par exemple celle de Tailscale :

```bash
tailscale serve --bg --https=443 http://127.0.0.1:3000   # sur le PC qui héberge Kairn
# → https://mon-pc.tailXXXX.ts.net   (téléphone avec Tailscale actif)
```

Cette adresse est **compilée dans l'APK** (`VITE_API_BASE_URL`). En CI : variable de dépôt `KAIRN_API_URL` (*Settings → Secrets and variables → Actions → Variables*). Changer d'adresse = reconstruire l'APK. Le HTTP en clair est refusé par Android : ne pas utiliser d'adresse `http://`.

## 4. Hors ligne et synchronisation

- **Stockage** : l'état est écrit à chaque modification dans le `localStorage` de la WebView (persistant : stocké dans le dossier privé de l'appli, survit aux redémarrages et au « fermer l'appli ») **et**, dans l'APK, dans un **miroir natif** (`@capacitor/preferences`, SharedPreferences). Si Android vidait les données web de la WebView, le miroir restaure l'état au démarrage. Seule la désinstallation ou « Effacer les données » supprime les deux ; le serveur reste la copie de référence.
- **Pas de service worker** : tout fonctionne hors ligne parce que l'appli et le programme sont dans l'APK, et que les écritures sont locales d'abord.
- **Quand la synchro s'exécute** : 2 s après une modification ; **à la reprise de l'appli** (retour au premier plan) ; **au retour du réseau** (événement `online`) ; et **tout de suite quand l'appli passe en arrière-plan**. À la reprise : s'il y a des modifications en attente, elles sont envoyées ; sinon la version du serveur est reprise si un autre appareil a écrit.
- **Conflit** : chaque écriture porte une révision ; si un autre appareil a écrit entre-temps, le serveur refuse et l'appareil reprend la version du serveur (les modifications locales non envoyées de cet appareil sont alors perdues : c'est le choix « le serveur fait foi »).
- Les fonctions IA (Coach, briefing, indices, vérification IA) exigent le réseau et le serveur ; elles échouent proprement hors ligne, le reste de l'appli fonctionne.

## 5. Rappels de révision (notifications locales)

Réglages → **Rappels de révision** (APK seulement). Désactivés par défaut.

**Permission (Android 13+)** : `POST_NOTIFICATIONS` est demandée **au moment où l'on active l'interrupteur** (pas au lancement), avec la boîte de dialogue système. Refus → message expliquant comment l'autoriser dans les réglages Android ; aucun rappel n'est planifié. Android ≤ 12 : pas de dialogue (autorisé par défaut).

**Précision : inexacte, volontairement.** Planification avec `allowWhileIdle` et **sans** la permission `SCHEDULE_EXACT_ALARM`.
- Android ≥ 12 : alarme inexacte, retard possible de quelques minutes (jusqu'à ~15 min en veille profonde).
- Android ≤ 11 : alarme exacte.

**Règles** (implémentées dans `src/native/reminderPlan.ts`, fonction pure testée) :

| Règle | Détail |
|---|---|
| Maximum | **2 rappels par jour** (matin 09:00, soir 19:00 par défaut ; modifiables, jamais plus de 2 même en forçant) |
| Heures calmes | **Aucune notification entre 23:00 et 05:00** ; une heure choisie dans cette plage est ramenée à 05:00 |
| Utilité | Un rappel n'existe que si au moins une carte est due ce jour-là (les cartes en retard s'accumulent) |
| Passé | Jamais de rappel dans le passé |
| Horizon | 7 jours, recalculé |

**Re-planification** (tout annuler puis recréer = le plan reflète toujours l'état réel) : à chaque changement des cartes (révision, import), **après chaque synchronisation**, à la reprise de l'appli, et à l'activation/modification des réglages. **Redémarrage du téléphone** : le plugin enregistre un récepteur `BOOT_COMPLETED` qui réarme les alarmes encore à venir ; l'appli re-planifie de toute façon à sa prochaine ouverture.

### Ce qui est garanti, et ce qui ne l'est pas

| | Statut |
|---|---|
| Jamais plus de 2/jour, jamais 23:00–05:00, jamais dans le passé, jamais sans carte due, ids uniques | **Testé automatiquement** (`npm test`, 8 tests) |
| Permission demandée seulement à l'activation ; planification sans la permission d'alarme exacte | Par construction du code et du manifeste du plugin ; **à confirmer sur téléphone** (checklist §8) |
| Réarmement des alarmes après redémarrage | Comportement documenté du plugin (récepteur `BOOT_COMPLETED`) ; **à confirmer sur téléphone** |
| Heure exacte | **Non garanti** (inexact, voir ci-dessus) |
| Notification après « Forcer l'arrêt » | **Non garanti** : Android annule les alarmes d'une appli arrêtée de force jusqu'à sa prochaine ouverture |
| Constructeurs agressifs (Xiaomi, Huawei, Samsung, OnePlus…) | **Non garanti** : l'économie d'énergie peut retarder ou bloquer ; exclure Kairn de l'optimisation de batterie |
| Plus de 7 jours sans ouvrir l'appli | **Non garanti** : l'horizon est de 7 jours, puis plus aucun rappel avant la prochaine ouverture |
| Nombre de cartes affiché dans la notification | Calculé à la planification, et recalculé à chaque révision et synchro sur cet appareil ; peut être décalé si on révise sur un autre appareil, jusqu'à la prochaine synchro |

> Limite de cette livraison : aucun test sur appareil ni émulateur n'a été fait (pas d'Android SDK dans l'environnement de développement). Les points « à confirmer » sont couverts par la checklist.

## 6. Construire un APK de debug en local

Prérequis : Node 22, **JDK 17**, Android SDK (plateforme 34, build-tools 34 ; Android Studio les installe), `ANDROID_HOME` défini.

```bash
npm ci
export VITE_API_BASE_URL=https://mon-pc.tailXXXX.ts.net   # adresse du serveur Kairn
npm run android:debug          # = vite build + cap sync android + gradlew assembleDebug
# APK : android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Ouvrir dans Android Studio : `npx cap open android`.

## 7. GitHub Actions (`.github/workflows/android.yml`)

| Événement | Résultat |
|---|---|
| Pull request / lancement manuel | Tests, build web, `cap sync`, `assembleDebug` → artefact **`kairn-debug-apk`** (APK de debug, signé par la clé de debug Android, installable pour test) |
| Tag `vX.Y.Z` (ex. `v1.2.0`) | `assembleRelease` **signé** → vérifié avec `apksigner` → **GitHub Release** avec `kairn-X.Y.Z.apk` |

Étapes : Java 17, Node 22, Android SDK (préinstallé sur le runner ; licences acceptées, le reste est téléchargé par Gradle), `npm ci`, `npm test`, build web, `npx cap sync android`, Gradle. **versionCode** = numéro d'exécution du workflow (`github.run_number`, croissant) ; **versionName** = tag sans le `v`.

### Configuration unique

1. Créer un keystore (à **conserver précieusement** : le perdre empêche toute mise à jour des installations existantes) :
   ```bash
   keytool -genkeypair -v -keystore kairn.keystore -alias kairn -keyalg RSA -keysize 4096 -validity 10000
   base64 -w0 kairn.keystore      # macOS : base64 -i kairn.keystore
   ```
2. *Settings → Secrets and variables → Actions* :
   - Secrets : `ANDROID_KEYSTORE_BASE64` (sortie de la commande ci-dessus), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (ici `kairn`), `KEY_PASSWORD`.
   - Variable : `KAIRN_API_URL` (adresse HTTPS du serveur, §3).
3. Publier : `git tag v1.0.0 && git push origin v1.0.0`.

Si un secret manque, le workflow échoue tout de suite avec un message explicite. Les pull requests venant de forks n'ont pas accès aux secrets (ils ne sont d'ailleurs pas utilisés pour le debug).

## 8. Checklist de test (téléphone réel)

Prérequis : serveur Kairn en marche et joignable en HTTPS ; téléphone Android avec « Sources inconnues » autorisées pour l'installation de l'APK.

**Installation**
- [ ] Télécharger l'APK (artefact de PR ou Release) et l'installer ; Kairn apparaît avec son icône.
- [ ] Android refuse l'installation ? Vérifier « Installer des applications inconnues » pour le navigateur/gestionnaire utilisé.

**Premier lancement**
- [ ] L'appli s'ouvre sans écran blanc, thème et polices identiques à la version web.
- [ ] Les données du serveur apparaissent (progression, cartes) ; sinon, bandeau « Serveur injoignable » → vérifier l'adresse, Tailscale actif, HTTPS.
- [ ] Faire une action (valider une mission ou changer le prénom), attendre 3 s ; vérifier sur le PC (`GET /api/state` ou ouvrir la version web) que le changement est arrivé.

**Mode avion**
- [ ] Activer le mode avion, ouvrir Kairn : l'appli démarre avec toutes les données (missions, cartes).
- [ ] Réviser des cartes et changer un réglage hors ligne : tout fonctionne ; les fonctions IA affichent une erreur propre.
- [ ] **Fermer complètement** l'appli (retirer des récents), la rouvrir toujours en mode avion : les modifications sont toujours là.
- [ ] Désactiver le mode avion : sans rien toucher, les modifications partent vers le serveur (vérifier côté PC).
- [ ] Modifier sur le PC (autre appareil), puis ramener Kairn au premier plan : la modification apparaît.

**Notifications**
- [ ] Réglages → Rappels → activer : la boîte de dialogue de permission apparaît (Android 13+). Refuser : message d'aide, rien n'est planifié. Réactiver après autorisation dans les réglages Android.
- [ ] Avoir des cartes dues, régler l'heure du rappel à +3 min : la notification arrive (retard de quelques minutes toléré) ; l'icône et le titre « Kairn · révisions » s'affichent ; un appui ouvre l'appli.
- [ ] Réviser toutes les cartes : le rappel suivant du jour ne s'affiche plus.
- [ ] Régler une heure à 23:30 : le champ indique qu'elle sera ramenée à 05:00 ; aucune notification la nuit.
- [ ] Jamais plus de 2 notifications dans la même journée.
- [ ] **Redémarrer le téléphone** sans rouvrir Kairn : le rappel suivant arrive quand même.
- [ ] (Optionnel) « Forcer l'arrêt » : constater qu'aucun rappel n'arrive tant qu'on n'a pas rouvert l'appli.

**Mise à jour par-dessus une installation existante**
- [ ] Noter la progression, installer un APK de **version supérieure** (versionCode plus grand) **signé avec la même clé** : l'installation se fait « par-dessus », sans désinstaller ; données et réglages de rappels conservés ; version visible dans *Paramètres Android → Applications → Kairn*.
- [ ] Attention : un APK de **debug** et un APK **release** ont des signatures différentes → Android refuse la mise à jour (« conflit de package ») : désinstaller d'abord. Deux APK de debug construits sur des machines différentes ont aussi des clés différentes.
- [ ] Installer un APK de versionCode inférieur : refusé (comportement normal d'Android).
