#!/usr/bin/env bash
set -euo pipefail

# Chemin vers le docker-compose
COMPOSE_FILE="./backend/docker-compose.yml"

# Vérifie que docker est installé
if ! command -v docker >/dev/null 2>&1; then
    echo "Erreur: Docker n'est pas installé." >&2
    exit 1
fi

# Fonction pour choisir docker compose ou docker-compose
compose() {
    if docker compose version >/dev/null 2>&1; then
        docker compose -f "$COMPOSE_FILE" "$@"
    elif command -v docker-compose >/dev/null 2>&1; then
        docker-compose -f "$COMPOSE_FILE" "$@"
    else
        echo "Erreur: 'docker compose' ou 'docker-compose' requis." >&2
        exit 1
    fi
}

# Affiche l'aide
usage() {
    cat <<EOF
Usage:
  ./run.sh up        # build + démarrer
  ./run.sh down      # arrêter
  ./run.sh restart   # redémarrer
  ./run.sh logs      # suivre les logs
  ./run.sh ps        # status
  ./run.sh rebuild   # rebuild complet puis up
EOF
}

# Commande par défaut = up
cmd="${1:-up}"
shift || true

case "$cmd" in
    up)
        compose up --build "$@"
        ;;
    down)
        compose down "$@"
        ;;
    restart)
        compose down
        compose up --build "$@"
        ;;
    logs)
        compose logs -f "$@"
        ;;
    ps)
        compose ps "$@"
        ;;
    rebuild)
        compose build --no-cache "$@"
        compose up --build
        ;;
    -h|--help|help)
        usage
        ;;
    *)
        echo "Commande inconnue: $cmd" >&2
        usage
        exit 2
        ;;
esac
