#!/usr/bin/env bash
set -euo pipefail

MAX_RETRIES=30
retries=0

echo "Attente de la base de données..."
until python - <<'EOF' 2>/dev/null
import psycopg2, os
from urllib.parse import urlparse
url = os.getenv("DATABASE_URL", "postgresql://appuser:secret@db:5432/appdb").replace("+psycopg2", "")
p = urlparse(url)
conn = psycopg2.connect(host=p.hostname, port=p.port or 5432, user=p.username, password=p.password, dbname=p.path.lstrip("/"))
conn.close()
EOF
do
    retries=$((retries + 1))
    if [ "$retries" -ge "$MAX_RETRIES" ]; then
        echo "Impossible de joindre la base de données après ${MAX_RETRIES} tentatives. Abandon."
        exit 1
    fi
    echo "  DB pas encore prête (tentative ${retries}/${MAX_RETRIES}), nouvelle tentative dans 1s..."
    sleep 1
done

echo "Application des migrations Alembic..."
alembic upgrade head

echo "Démarrage de l'application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
