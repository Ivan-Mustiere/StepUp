# Règles — Backend FastAPI

## Conventions Python

- Type hints obligatoires sur toutes les fonctions
- Logs via `print()` ou `logging` — cohérent avec le reste du projet
- `snake_case` pour variables, fonctions, fichiers
- Config via `os.getenv()` ou `core/config.py` — jamais de valeur en dur
- Requêtes SQL : toujours paramétrées avec `%s`, jamais de f-string ou concaténation

## FastAPI

- Chaque route dans son propre fichier dans `app/routes/`
- Modèles Pydantic v2 avec `field_validator` pour la validation
- `get_current_user` de `core/security.py` pour les routes authentifiées
- Rate limiting sur les routes publiques sensibles (auth)
- Réponses d'erreur cohérentes : `{"detail": "message"}` (format FastAPI standard)

## Sécurité

- Mots de passe : PBKDF2-HMAC-SHA256 via `security.py` — jamais bcrypt/autre
- Tokens JWT HS256 : access 60 min, refresh 30 jours avec rotation
- Refresh tokens stockés en base dans `user_refresh_tokens`
- Vérifier `is_admin` pour les endpoints admin avant toute opération

## Base de données

- Connexion via pool `core/database.py` — ne pas créer de nouvelles connexions directes
- Accès aux colonnes par **nom** (dictionnaire/RealDictCursor), jamais par index numérique
- Toujours fermer curseur + connexion dans un `finally` ou context manager
- Migrations via Alembic uniquement — ne jamais modifier `db/init.sql`

## Tests

- Mocker psycopg2 dans les fixtures `conftest.py`
- Structure : `tests/test_<route>.py` par fichier de route
- Coverage obligatoire pour register, login, refresh, logout, me
