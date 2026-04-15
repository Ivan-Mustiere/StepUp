#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="./backend/docker-compose.yml"

# Vérifie que docker est installé
if ! command -v docker >/dev/null 2>&1; then
    echo "Erreur: Docker n'est pas installé." >&2
    exit 1
fi

# Choisit docker compose ou docker-compose
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

usage() {
    echo "Usage: ./run.sh [commande]"
    echo ""
    echo "Commandes disponibles :"
    echo "  up        Build + démarrer les services"
    echo "  down      Arrêter les services"
    echo "  restart   Redémarrer les services"
    echo "  logs      Suivre les logs en temps réel"
    echo "  ps        Statut des services"
    echo "  rebuild   Rebuild complet (sans cache) puis up"
    echo "  reset     Supprimer la BDD et repartir de zéro"
    echo "  test      Lancer les tests pytest"
    echo "  migrate   Appliquer les migrations Alembic"
    echo ""
}

cmd_up() {
    echo ">>> Démarrage des services..."
    compose up --build "$@"
}

cmd_down() {
    echo ">>> Arrêt des services..."
    compose down "$@"
}

cmd_restart() {
    echo ">>> Redémarrage des services..."
    compose down
    compose up --build "$@"
}

cmd_logs() {
    compose logs -f "$@"
}

cmd_ps() {
    compose ps "$@"
}

cmd_rebuild() {
    echo ">>> Rebuild complet..."
    compose build --no-cache "$@"
    compose up --build
}

cmd_reset() {
    echo ">>> ⚠️  Suppression du volume PostgreSQL et redémarrage..."
    compose down -v
    compose up --build
}

cmd_test() {
    echo ">>> Lancement des tests pytest..."
    docker exec stepup_backend python -m pytest tests/ -v
}

cmd_migrate() {
    echo ">>> Application des migrations Alembic..."
    docker exec stepup_backend alembic upgrade head
}

case "${1:-}" in
    up)       shift; cmd_up "$@" ;;
    down)     shift; cmd_down "$@" ;;
    restart)  shift; cmd_restart "$@" ;;
    logs)     shift; cmd_logs "$@" ;;
    ps)       shift; cmd_ps "$@" ;;
    rebuild)  shift; cmd_rebuild "$@" ;;
    reset)    cmd_reset ;;
    test)     cmd_test ;;
    migrate)  cmd_migrate ;;
    -h|--help|help) usage ;;
    *)        usage ;;
esac
