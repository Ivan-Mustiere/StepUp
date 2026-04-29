# Règles — Base de données PostgreSQL / Alembic

## Schéma

- **15 tables** gérées exclusivement par Alembic
- Ne jamais modifier `backend/db/init.sql` (placeholder uniquement)
- Nouvelle table ou colonne = nouvelle migration Alembic dans `backend/alembic/versions/`

## Conventions SQL

- Requêtes paramétrées uniquement : `cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`
- Accès aux colonnes par **nom** (RealDictCursor) — jamais par index numérique
- Transactions explicites pour les opérations multi-tables
- Index sur les foreign keys et colonnes fréquemment filtrées

## Tables clés

| Table | Usage |
|---|---|
| `users` | Comptes (pseudo, email, password_hash, coins, xp, vip, is_admin) |
| `user_friends` | Liens d'amitié bidirectionnels |
| `user_friend_requests` | Demandes (pending/accepted/rejected) |
| `user_community_requests` | Demandes de rejoindre une communauté |
| `user_communautes` | Membres d'une communauté |
| `user_refresh_tokens` | Tokens JWT de rafraîchissement |
| `pronostics` | Pronostics (ouvert/terminé/annulé) |
| `paris` | Paris admin (actif/fermé/réglé) |

## Migrations Alembic

```bash
# Dans le conteneur backend
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
```

## Connexion PostgreSQL

- Exposé sur `localhost:5433` (hôte) / `5432` (interne Docker)
- Pool géré dans `backend/app/core/database.py`
- Ne jamais créer de connexion directe hors de `database.py`
