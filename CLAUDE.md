# StepUp — Guide pour Claude

## Workflow de Synchronisation

- Les modifications manuelles de l'utilisateur sont listées dans `changes.md`.
- **Règle impérative** : Dès que tu as appliqué et répercuté les modifications de `changes.md` dans les fichiers concernés, tu dois supprimer le contenu traité de `changes.md` pour maintenir le fichier vide ou à jour.

## Description du projet

Application de paris sportifs / pronostics avec système d'amis et de communautés.
Projet académique (Ydays M2).

**Stack :**
- **Backend** : FastAPI (Python 3.12), PostgreSQL, psycopg2, JWT via python-jose
- **Frontend web** : React 18, Vite 5
- **Mobile** : React Native 0.74, Expo 51

---

## Structure

```
StepUp/
├── run.sh                           # Wrapper docker-compose
├── backend/
│   ├── alembic.ini                  # Config migrations Alembic
│   ├── docker-compose.yml
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                  # Point d'entrée FastAPI (66 lignes)
│   │   ├── core/
│   │   │   ├── config.py            # Variables d'environnement
│   │   │   ├── database.py          # Pool de connexions + gestion tokens
│   │   │   └── security.py          # JWT, hachage mots de passe, auth
│   │   └── routes/
│   │       ├── auth.py              # Authentification (register, login, refresh, logout, me)
│   │       ├── users.py             # Profil utilisateur
│   │       ├── friends.py           # Gestion des amis
│   │       ├── communautes.py       # Communautés
│   │       ├── pronostics.py        # Pronostics
│   │       └── admin.py             # Endpoints admin
│   ├── alembic/
│   │   └── versions/
│   │       └── 0001_schema_initial.py  # Migration initiale (15 tables)
│   ├── db/
│   │   └── init.sql                 # Placeholder (Alembic gère le schéma)
│   ├── tests/
│   │   ├── conftest.py              # Fixtures pytest (mock DB)
│   │   └── test_auth.py             # 27 tests endpoints auth
│   └── .env                         # Variables d'environnement (non commité)
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx                 # Point d'entrée React
│       ├── App.jsx                  # UI auth (225 lignes)
│       ├── styles.css
│       ├── api/api.js               # Client HTTP (localStorage)
│       ├── components/
│       │   ├── Button.js            # VIDE — stub
│       │   └── Card.js              # VIDE — stub
│       ├── screens/
│       │   ├── HomeScreen.js        # VIDE — stub
│       │   └── DetailScreen.js      # VIDE — stub
│       ├── navigation/
│       │   └── AppNavigator.js      # VIDE — stub
│       └── utils/
│           └── helpers.js           # VIDE — stub
└── mobile/
    ├── App.js                       # UI auth React Native (300 lignes)
    └── src/
        ├── api/api.js               # Client HTTP (AsyncStorage)
        ├── components/
        │   ├── Button.js            # VIDE — stub
        │   └── Card.js              # VIDE — stub
        ├── screens/
        │   ├── HomeScreen.js        # VIDE — stub
        │   └── DetailScreen.js      # VIDE — stub
        ├── navigation/
        │   └── AppNavigator.js      # VIDE — stub
        └── utils/
            └── helpers.js           # VIDE — stub
```

---

## Lancer le projet

```bash
# Démarrer le backend (Docker requis)
./run.sh up

# Autres commandes
./run.sh down       # Arrêter
./run.sh logs       # Voir les logs
./run.sh rebuild    # Rebuild complet
```

**Backend accessible sur :** `http://localhost:8000`
**Swagger UI :** `http://localhost:8000/swagger`
**PostgreSQL exposé sur :** `localhost:5433`

### Frontend web
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

---

## Variables d'environnement (`backend/.env`)

| Variable | Description | Obligatoire |
|---|---|---|
| `JWT_SECRET_KEY` | Clé secrète JWT — **doit être changée** | Oui |
| `POSTGRES_USER` | Utilisateur PostgreSQL | Oui |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | Oui |
| `POSTGRES_DB` | Nom de la base | Oui |
| `DATABASE_URL` | URL complète de connexion | Non (calculée) |
| `ALLOWED_ORIGINS` | Origines CORS autorisées (séparées par `,`) | Non (localhost par défaut) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée du token d'accès | Non (60 min) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Durée du refresh token | Non (30 jours) |

Générer une clé JWT sécurisée :
```bash
openssl rand -hex 32
```

---

## Base de données

Le schéma est géré entièrement par **Alembic** (`backend/alembic/versions/`).
`backend/db/init.sql` est un placeholder — ne plus y ajouter de tables.

**15 tables (migration 0001_schema_initial) :**
- `users` — comptes utilisateurs (pseudo, email, password_hash, coins, xp_total, vip, is_admin, rank, strick...)
- `user_friends` — liens d'amitié bidirectionnels
- `user_friend_requests` — demandes d'amis (pending/accepted/rejected)
- `user_community_requests` — demandes de rejoindre une communauté
- `user_communautes` — membres d'une communauté
- `user_clubs` — clubs favoris/détestés
- `user_jeux` — participations à des jeux
- `user_succes` — succès débloqués
- `user_historique_parie` — historique des paris (JSONB)
- `user_pas_history` — suivi quotidien des pas
- `user_evenements` — événements associés
- `user_refresh_tokens` — tokens de rafraîchissement JWT
- `pronostics` — pronostics (ouvert/terminé/annulé)
- `paris` — paris créés par les admins (actif/fermé/réglé)

---

## API — Endpoints existants

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/health` | Non | Statut de l'API |
| POST | `/api/v1/auth/register` | Non | Inscription (10 req/min) |
| POST | `/api/v1/auth/login` | Non | Connexion (5 req/min) |
| POST | `/api/v1/auth/refresh` | Non | Rafraîchir les tokens |
| POST | `/api/v1/auth/logout` | Non | Révoquer le refresh token |
| GET | `/api/v1/auth/me` | Oui | Profil de l'utilisateur connecté |
| GET | `/api/v1/users/{user_id}` | Oui | Profil d'un utilisateur |
| GET | `/api/v1/friends` | Oui | Liste des amis |
| POST | `/api/v1/friends/requests` | Oui | Envoyer une demande d'ami |
| POST | `/api/v1/friends/requests/{id}/accept` | Oui | Accepter une demande |
| POST | `/api/v1/friends/requests/{id}/reject` | Oui | Refuser une demande |
| DELETE | `/api/v1/friends/requests/{id}` | Oui | Annuler une demande envoyée |
| GET | `/api/v1/friends/requests/incoming` | Oui | Demandes reçues |
| GET | `/api/v1/friends/requests/outgoing` | Oui | Demandes envoyées |
| POST | `/api/v1/communautes/rejoindre` | Oui | Demander à rejoindre une communauté |
| GET | `/api/v1/communautes/requests/me` | Oui | Mes demandes de communauté |
| DELETE | `/api/v1/communautes/requests/{id}` | Oui | Annuler une demande de communauté |
| GET | `/api/v1/pronostics` | Oui | Lister les pronostics (avec filtres) |
| POST | `/api/v1/pronostics` | Oui | Créer un pronostic |
| POST | `/api/v1/admin/paris` | Admin | Créer un pari (admin seulement) |

---

## Tests

```bash
cd backend
pytest tests/ -v
```

Les tests mockent la base de données (psycopg2) — aucun PostgreSQL requis.
27 tests couvrant l'authentification (register, login, refresh, logout, me).

---

## Problèmes connus (à corriger)

- Code synchrone dans un framework async (FastAPI + psycopg2 bloquant)
- Accès aux colonnes par index numérique dans certaines routes — fragile
- `frontend/api.js` et `mobile/api.js` partagent beaucoup de logique mais ne peuvent pas être mutualisés (localStorage vs AsyncStorage)
- Nombreux fichiers stubs vides à implémenter : `Button.js`, `Card.js`, `HomeScreen.js`, `DetailScreen.js`, `AppNavigator.js`, `helpers.js` (frontend et mobile)
- Pas de tests pour les routes friends, communautés, pronostics, admin

---

## Conventions

- Langue : commentaires et messages d'erreur en **français**
- Mots de passe : PBKDF2-HMAC-SHA256 avec sel aléatoire (via `security.py`)
- Tokens JWT : HS256, access token 60 min, refresh token 30 jours (rotation à chaque refresh)
- Validation : Pydantic v2 (`field_validator`)
- Requêtes SQL : paramétrisées (`%s`), jamais de concaténation de chaînes
- Migrations : Alembic uniquement — ne pas modifier `init.sql`

---

@.claude/rules/backend.md
@.claude/rules/frontend.md
@.claude/rules/mobile.md
@.claude/rules/database.md
