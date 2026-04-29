Aide à créer et appliquer une migration Alembic.

Étapes :
1. Lire le schéma actuel dans backend/alembic/versions/ pour comprendre l'état actuel
2. Demander quelle modification de schéma est souhaitée (nouvelle table, colonne, index...)
3. Générer le fichier de migration dans backend/alembic/versions/
4. Rappeler la commande pour appliquer : `alembic upgrade head` (dans le conteneur backend)

Rappel : ne jamais modifier backend/db/init.sql.
