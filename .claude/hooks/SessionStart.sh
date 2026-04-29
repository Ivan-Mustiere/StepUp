#!/bin/bash
# Hook SessionStart — état du projet au démarrage de chaque session Claude Code

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_DIR" || exit 0

echo ""
echo "========================================"
echo " StepUp — Session Start"
echo "========================================"

# --- .env backend ---
if [ -f "backend/.env" ]; then
    if grep -q "JWT_SECRET_KEY=$" backend/.env 2>/dev/null || grep -q "JWT_SECRET_KEY=changeme" backend/.env 2>/dev/null; then
        echo "[.env]     ATTENTION : JWT_SECRET_KEY non sécurisée"
    else
        echo "[.env]     OK (credentials présents)"
    fi
else
    echo "[.env]     MANQUANT — créer backend/.env avec JWT_SECRET_KEY, POSTGRES_*"
fi

# --- Docker ---
if docker info >/dev/null 2>&1; then
    cd backend 2>/dev/null
    RUNNING=$(docker compose ps --services --filter "status=running" 2>/dev/null | wc -l | tr -d ' ')
    TOTAL=$(docker compose ps --services 2>/dev/null | wc -l | tr -d ' ')
    if [ "$RUNNING" -gt 0 ] 2>/dev/null; then
        echo "[Docker]   $RUNNING/$TOTAL services actifs (backend sur :8000)"
    else
        echo "[Docker]   Stack arrêtée (lancer avec: ./run.sh up)"
    fi
    cd "$PROJECT_DIR"
else
    echo "[Docker]   Docker non disponible"
fi

# --- changes.md ---
if [ -f "changes.md" ]; then
    LINES=$(grep -c '[^[:space:]]' changes.md 2>/dev/null || echo 0)
    if [ "$LINES" -gt 0 ]; then
        echo "[changes]  ATTENTION : changes.md contient $LINES ligne(s) non traitée(s)"
    else
        echo "[changes]  OK (aucune modification en attente)"
    fi
fi

# --- Git ---
if git rev-parse --git-dir >/dev/null 2>&1; then
    LAST_COMMIT=$(git log -1 --pretty=format:"%h %s (%ar)" 2>/dev/null)
    BRANCH=$(git branch --show-current 2>/dev/null)
    DIRTY=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
    echo "[Git]      $BRANCH | dernier commit : $LAST_COMMIT"
    if [ "$DIRTY" -gt 0 ]; then
        echo "[Git]      $DIRTY fichier(s) modifié(s) non commités"
    fi
fi

echo "========================================"
echo ""
