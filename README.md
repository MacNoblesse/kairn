# Kairn — coach IT quotidien

Application React (Vite) + serveur Express, **lancée par un seul `docker compose`**. Toutes les données (progression, flashcards, historique…) sont enregistrées côté serveur dans le **volume Docker `kairn_data`** : elles survivent aux redémarrages, aux mises à jour de l'image et sont partagées entre PC et téléphone.

## Démarrer

```bash
cp .env.example .env        # facultatif : mettre GEMINI_API_KEY pour le Coach IA
docker compose up -d --build
```

Ouvrir <http://localhost:3000>. C'est tout.

| Commande | Effet |
|---|---|
| `docker compose up -d --build` | démarre / met à jour après modification du code |
| `docker compose down` | arrête (les données restent dans le volume) |
| `docker compose logs -f` | journaux |
| `docker compose ps` | état et santé (`healthy`) |
| `docker compose down -v` | ⚠️ **supprime aussi le volume = toutes les données** |

`restart: unless-stopped` : le conteneur redémarre seul avec Docker (activer « Start Docker Desktop when you sign in » sous Windows).

## Où sont les données ?

Dans le volume nommé `kairn_data`, monté sur `/data` dans le conteneur :

```
/data/state.json                    état complet de l'application (écriture atomique)
/data/backups/state-AAAA-MM-JJ.json  un instantané par jour, 14 jours conservés
```

- **Sauvegarde** (archive dans le dossier courant) :
  ```bash
  docker run --rm -v kairn_data:/data -v "$PWD":/out alpine tar czf /out/kairn-data.tgz -C /data .
  ```
- **Restauration** (écrase les données actuelles) :
  ```bash
  docker compose down
  docker run --rm -v kairn_data:/data -v "$PWD":/in alpine sh -c "rm -rf /data/* && tar xzf /in/kairn-data.tgz -C /data"
  docker compose up -d
  ```
- **Revenir à un instantané quotidien** : copier `backups/state-<date>.json` sur `state.json` (même commande `docker run` avec `cp`).
- Conserver une copie de `kairn-data.tgz` **hors du PC** (disque externe, cloud).

### Migration depuis l'ancienne version
Au premier lancement, si le serveur est vide et que le navigateur contient des données (ancien stockage `localStorage`), elles sont **envoyées automatiquement au serveur**. Ouvrir l'appli une fois depuis le navigateur qui contenait ta progression.

### Synchronisation
Le navigateur enregistre tout de suite en local (cache de secours) puis envoie au serveur au plus toutes les 2 secondes. Chaque écriture porte un numéro de révision : si un autre appareil a écrit entre-temps, le serveur refuse l'écriture périmée et l'appareil reprend la version du serveur (rien n'est écrasé par erreur). Au retour sur l'application, la version la plus récente du serveur est reprise s'il n'y a rien en attente. Serveur injoignable : bandeau d'avertissement, les données restent sur l'appareil et sont envoyées dès que la connexion revient.

## Accès depuis le téléphone

L'appli n'a **pas de mot de passe** (et consomme ta clé Gemini) : par défaut elle n'écoute que sur `127.0.0.1`.

- **Partout, en privé (recommandé)** : installer [Tailscale](https://tailscale.com/download) sur le PC et le téléphone (même compte), puis sur le PC :
  ```bash
  tailscale serve --bg --https=443 http://127.0.0.1:3000
  ```
  et ouvrir `https://<nom-du-pc>.<tailnet>.ts.net` sur le téléphone. N'utilise **jamais** `tailscale funnel`.
- **Maison seulement** : `BIND_ADDRESS=0.0.0.0` dans `.env`, puis `docker compose up -d`, et ouvrir `http://<ip-du-pc>:3000`. Sans HTTPS, le micro (vue Anglais) peut être bloqué par le navigateur.

## Application Android (APK)

L'appli web est aussi empaquetée en APK (Capacitor), construit par GitHub Actions : voir **[docs/ANDROID.md](docs/ANDROID.md)** (état des lieux, build local, workflow, rappels de révision, checklist de test sur téléphone).

## Flashcards

Les cartes sont **créées automatiquement à la validation d'une mission** (et rattrapées au démarrage pour les missions déjà validées), à partir du contenu réel du programme — aucune réponse inventée :

1. une carte par commande de vérification (« Quelle commande permet de vérifier… ? » → la commande, avec le résultat attendu) ;
2. une carte « notions clés » ; 3. une carte « livrable » ; 4. des cartes « étape n sur N » ;

dans la limite de `flashcards_target` de la mission (5 par défaut). Identifiants déterministes : revalider une mission ne crée jamais de doublon et ne remet pas la progression à zéro. Première révision le lendemain.

Corrections de l'écran de révision : « À revoir » remet bien la carte en fin de session ; les intervalles affichés sur les boutons sont les vrais (plus des valeurs fixes) ; la « révision libre » ne modifie plus le calendrier de répétition espacée ; la file se base sur l'état à jour ; ordre des cartes dues : les plus en retard d'abord.

## Structure du dépôt

```
docker-compose.yml   un service + volume kairn_data
Dockerfile           build (vite + esbuild) → image finale non-root
server/
  index.ts           assemblage Express (santé, état, IA, fichiers statiques)
  stateStore.ts      persistance JSON atomique, révisions, instantanés quotidiens
  stateRoutes.ts     GET/PUT /api/state
  ai.ts              routes Gemini (/api/ai/coach|briefing|hint|verify)
src/                 application React
public/assets/…      programme de 12 semaines (72 missions)
```

## Développement local (sans Docker)

```bash
npm ci
npm run dev      # http://localhost:3000, données dans ./data
npm test         # tests (node:test via tsx)
npm run lint     # tsc --noEmit
```

## Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `GEMINI_API_KEY` | vide | Coach IA, briefings, indices, vérification IA |
| `PORT` | `3000` | port publié sur l'hôte |
| `BIND_ADDRESS` | `127.0.0.1` | adresse d'écoute sur l'hôte |
| `TZ` | `Europe/Paris` | fuseau (instantanés quotidiens) |
| `DATA_DIR` | `/data` (conteneur) · `./data` (dev) | dossier des données |

## Limites connues

- Pas de login : la protection repose sur le réseau (localhost / Tailscale).
- Données : un seul profil par serveur.
- Les « compétences » restent à 0/10 : leur calcul à partir des `skill_nodes` n'existe pas encore dans l'appli.
- Le démarrage réel du conteneur (`docker compose up`) n'a pas pu être exécuté dans l'environnement où ce travail a été fait (pas de démon Docker) ; la configuration passe `docker compose config`, et le serveur compilé a été testé avec uniquement les dépendances de production, dans un vrai navigateur.
