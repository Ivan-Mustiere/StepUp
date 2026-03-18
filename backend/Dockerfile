# backend/Dockerfile
FROM python:3.12-slim

# Dépendances système
RUN apt-get update && apt-get install -y build-essential libpq-dev cron && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier requirements et installer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code de l'app
COPY app ./app

# Copier scripts cron (optionnel)
COPY scripts/run_resolver.sh /run_resolver.sh
RUN chmod +x /run_resolver.sh || true  # ignore si vide

# Commande finale
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
