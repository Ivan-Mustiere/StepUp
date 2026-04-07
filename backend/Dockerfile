# backend/Dockerfile
FROM python:3.12-slim

# libpq-dev : requis pour psycopg2-binary au runtime
RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier requirements et installer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code de l'app
COPY app ./app

# Copier Alembic
COPY alembic ./alembic
COPY alembic.ini .

# Copier le script de démarrage
COPY scripts/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
