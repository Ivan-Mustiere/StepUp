#!/bin/bash
# Hook PostToolUse — vérification syntaxique après écriture/édition de fichiers clés

INPUT=$(cat)

FILE_PATH=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    ti = data.get('tool_input', {})
    print(ti.get('file_path', ''))
except Exception:
    print('')
" 2>/dev/null)

[ -z "$FILE_PATH" ] && exit 0

BASENAME=$(basename "$FILE_PATH")

# ── Python backend ────────────────────────────────────────────────────────────
case "$FILE_PATH" in
    */backend/app/*.py|*/backend/app/**/*.py)
        echo ""
        echo "→ [py_compile] $BASENAME"
        if python3 -m py_compile "$FILE_PATH" 2>&1; then
            echo "  ✓ Syntaxe Python OK"
        else
            echo "  ✗ Erreur de syntaxe — corriger avant de committer"
        fi
        printf '%s\n' '{"systemMessage": "Fichier backend modifié — penser à lancer les tests: cd backend && pytest tests/ -v"}'
        ;;
    */backend/alembic/versions/*.py)
        echo ""
        echo "→ [Alembic] Migration modifiée : $BASENAME"
        echo "  Penser à lancer : alembic upgrade head (dans le conteneur)"
        printf '%s\n' '{"systemMessage": "Migration Alembic modifiée — vérifier avec alembic upgrade head"}'
        ;;
esac

# ── Frontend React ────────────────────────────────────────────────────────────
case "$FILE_PATH" in
    */frontend/src/*.jsx|*/frontend/src/**/*.jsx|*/frontend/src/*.js|*/frontend/src/**/*.js)
        echo ""
        echo "→ [Frontend] $BASENAME modifié"
        printf '%s\n' '{"systemMessage": "Fichier frontend modifié — vérifier dans le navigateur: npm run dev (http://localhost:5173)"}'
        ;;
esac

# ── Mobile React Native ───────────────────────────────────────────────────────
case "$FILE_PATH" in
    */mobile/App.js|*/mobile/src/**/*.js)
        echo ""
        echo "→ [Mobile] $BASENAME modifié"
        printf '%s\n' '{"systemMessage": "Fichier mobile modifié — tester avec: cd mobile && npx expo start"}'
        ;;
esac

# ── docker-compose.yml ────────────────────────────────────────────────────────
case "$BASENAME" in
    docker-compose.yml)
        echo ""
        echo "→ [Docker] docker-compose.yml modifié"
        if docker compose -f "$(dirname "$FILE_PATH")/docker-compose.yml" config --quiet 2>/dev/null; then
            echo "  ✓ Syntaxe docker-compose valide"
        else
            echo "  ✗ Erreur dans docker-compose.yml"
        fi
        ;;
esac

# ── changes.md ────────────────────────────────────────────────────────────────
case "$BASENAME" in
    changes.md)
        LINES=$(grep -c '[^[:space:]]' "$FILE_PATH" 2>/dev/null || echo 0)
        if [ "$LINES" -gt 0 ]; then
            echo ""
            echo "→ [changes.md] $LINES ligne(s) de modifications en attente"
            printf '%s\n' '{"systemMessage": "changes.md mis à jour — appliquer les modifications puis vider le fichier"}'
        fi
        ;;
esac

exit 0
