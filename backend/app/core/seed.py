"""
Seed de données de test — exécuté uniquement en environnement de développement.
Les entrées sont créées si absentes (idempotent).
"""

import logging

from app.core.database import get_db
from app.core.security import _hash_password

logger = logging.getLogger("stepup")

UTILISATEURS_TEST = [
    {
        "pseudo": "alice",
        "email": "alice@test.com",
        "password": "Test1234!",
        "age": 25,
        "genre": "femme",
        "pays": "France",
        "coins": 500,
        "xp_total": 1200,
        "is_admin": False,
    },
    {
        "pseudo": "bob",
        "email": "bob@test.com",
        "password": "Test1234!",
        "age": 30,
        "genre": "homme",
        "pays": "France",
        "coins": 300,
        "xp_total": 800,
        "is_admin": False,
    },
    {
        "pseudo": "charlie",
        "email": "charlie@test.com",
        "password": "Test1234!",
        "age": 22,
        "genre": "homme",
        "pays": "Belgique",
        "coins": 150,
        "xp_total": 400,
        "is_admin": False,
    },
    {
        "pseudo": "admin",
        "email": "admin@test.com",
        "password": "Test1234!",
        "age": 35,
        "genre": "autre",
        "pays": "France",
        "coins": 9999,
        "xp_total": 9999,
        "is_admin": True,
    },
]

COMMUNAUTES_TEST = [
    {"nom": "League of Legends", "description": "La Faille de l'Invocateur vous attend", "jeu": "Esport"},
    {"nom": "Valorant", "description": "Tactique et précision", "jeu": "Esport"},
    {"nom": "Overwatch", "description": "Les héros ne meurent jamais", "jeu": "Esport"},
]

# pseudo → liste de noms de communautés à rejoindre
MEMBERSHIPS_TEST = {
    "alice":   ["League of Legends", "Valorant"],
    "bob":     ["Valorant", "Overwatch"],
    "charlie": ["League of Legends", "Overwatch"],
    "admin":   ["League of Legends", "Valorant", "Overwatch"],
}


def seed_dev_data() -> None:
    """Insère les utilisateurs, communautés et memberships de test si absents."""
    users_created = 0
    communautes_created = 0
    memberships_created = 0

    with get_db() as conn:
        with conn.cursor() as cur:
            # Utilisateurs
            for u in UTILISATEURS_TEST:
                cur.execute("SELECT id FROM users WHERE email = %s", (u["email"],))
                if cur.fetchone():
                    continue
                cur.execute(
                    """
                    INSERT INTO users (pseudo, email, password_hash, age, genre, pays, coins, xp_total, is_admin)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        u["pseudo"],
                        u["email"],
                        _hash_password(u["password"]),
                        u["age"],
                        u["genre"],
                        u["pays"],
                        u["coins"],
                        u["xp_total"],
                        u["is_admin"],
                    ),
                )
                users_created += 1

            # Communautés
            for c in COMMUNAUTES_TEST:
                cur.execute("SELECT id FROM communautes WHERE nom = %s", (c["nom"],))
                if cur.fetchone():
                    continue
                cur.execute(
                    "INSERT INTO communautes (nom, description, jeu) VALUES (%s, %s, %s)",
                    (c["nom"], c["description"], c["jeu"]),
                )
                communautes_created += 1

            # Memberships : on relit les IDs pour être sûr
            for pseudo, commu_noms in MEMBERSHIPS_TEST.items():
                cur.execute("SELECT id FROM users WHERE pseudo = %s", (pseudo,))
                user_row = cur.fetchone()
                if not user_row:
                    continue
                for nom in commu_noms:
                    cur.execute("SELECT id FROM communautes WHERE nom = %s", (nom,))
                    commu_row = cur.fetchone()
                    if not commu_row:
                        continue
                    cur.execute(
                        """
                        INSERT INTO user_communautes (user_id, communaute_id)
                        VALUES (%s, %s)
                        ON CONFLICT (user_id, communaute_id) DO NOTHING
                        """,
                        (user_row["id"], commu_row["id"]),
                    )
                    if cur.rowcount:
                        memberships_created += 1

        conn.commit()

    if users_created:
        logger.info("Seed dev : %d utilisateur(s) créé(s). (mot de passe : Test1234!)", users_created)
    if communautes_created:
        logger.info("Seed dev : %d communauté(s) créée(s).", communautes_created)
    if memberships_created:
        logger.info("Seed dev : %d membership(s) créé(s).", memberships_created)
    if not any([users_created, communautes_created, memberships_created]):
        logger.info("Seed dev : données déjà présentes, rien à faire.")
