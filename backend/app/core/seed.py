"""
Seed de données de test — exécuté uniquement en environnement de développement.
Idempotent : ne recrée pas ce qui existe déjà.
"""

import itertools
import logging

from app.core.database import get_db
from app.core.security import _hash_password

logger = logging.getLogger("stepup")

# ─── Utilisateurs ────────────────────────────────────────────────────────────

UTILISATEURS_TEST = [
    {
        "pseudo": "alice",
        "email": "alice@test.com",
        "password": "Test1234!",
        "age": 25, "genre": "femme",  "pays": "France",        "region": "Île-de-France",
        "coins": 850,  "gems": 5,  "xp_total": 2400, "is_admin": False,
    },
    {
        "pseudo": "bob",
        "email": "bob@test.com",
        "password": "Test1234!",
        "age": 30, "genre": "homme", "pays": "France",        "region": "Bretagne",
        "coins": 620,  "gems": 3,  "xp_total": 1800, "is_admin": False,
    },
    {
        "pseudo": "charlie",
        "email": "charlie@test.com",
        "password": "Test1234!",
        "age": 22, "genre": "homme", "pays": "Belgique",       "region": None,
        "coins": 310,  "gems": 1,  "xp_total": 950,  "is_admin": False,
    },
    {
        "pseudo": "diana",
        "email": "diana@test.com",
        "password": "Test1234!",
        "age": 28, "genre": "femme",  "pays": "France",        "region": "Occitanie",
        "coins": 1100, "gems": 8,  "xp_total": 3200, "is_admin": False,
    },
    {
        "pseudo": "ethan",
        "email": "ethan@test.com",
        "password": "Test1234!",
        "age": 19, "genre": "homme", "pays": "France",        "region": "Normandie",
        "coins": 200,  "gems": 0,  "xp_total": 420,  "is_admin": False,
    },
    {
        "pseudo": "fanny",
        "email": "fanny@test.com",
        "password": "Test1234!",
        "age": 33, "genre": "femme",  "pays": "Espagne",       "region": "Catalogne",
        "coins": 750,  "gems": 6,  "xp_total": 2100, "is_admin": False,
    },
    {
        "pseudo": "gabriel",
        "email": "gabriel@test.com",
        "password": "Test1234!",
        "age": 26, "genre": "homme", "pays": "France",        "region": "PACA",
        "coins": 480,  "gems": 2,  "xp_total": 1350, "is_admin": False,
    },
    {
        "pseudo": "hugo",
        "email": "hugo@test.com",
        "password": "Test1234!",
        "age": 24, "genre": "homme", "pays": "Allemagne",      "region": "Bavière",
        "coins": 530,  "gems": 4,  "xp_total": 1600, "is_admin": False,
    },
    {
        "pseudo": "isabelle",
        "email": "isabelle@test.com",
        "password": "Test1234!",
        "age": 31, "genre": "femme",  "pays": "France",        "region": "Grand Est",
        "coins": 290,  "gems": 1,  "xp_total": 680,  "is_admin": False,
    },
    {
        "pseudo": "admin",
        "email": "admin@test.com",
        "password": "Test1234!",
        "age": 35, "genre": "autre",  "pays": "France",        "region": None,
        "coins": 9999, "gems": 99, "xp_total": 9999, "is_admin": True,
    },
]

# ─── Communautés ─────────────────────────────────────────────────────────────

COMMUNAUTES_TEST = [
    {"nom": "League of Legends", "description": "La Faille de l'Invocateur vous attend", "jeu": "Esport"},
    {"nom": "Valorant",          "description": "Tactique et précision",                  "jeu": "Esport"},
    {"nom": "Rocket League",     "description": "Un ballon, des voitures, des goals",     "jeu": "Esport"},
]

MEMBERSHIPS_TEST = {
    "alice":    ["League of Legends", "Valorant"],
    "bob":      ["Valorant", "Rocket League"],
    "charlie":  ["League of Legends", "Rocket League"],
    "diana":    ["League of Legends", "Valorant"],
    "ethan":    ["Rocket League"],
    "fanny":    ["Valorant"],
    "gabriel":  ["Rocket League"],
    "hugo":     ["League of Legends", "Rocket League"],
    "isabelle": ["Valorant"],
    "admin":    ["League of Legends", "Valorant", "Rocket League"],
}

# ─── Pronostics + Paris ───────────────────────────────────────────────────────
# Créés par admin. Format : pronostic → paris associé.

PARIS_TEST = [
    # ── Actifs ──────────────────────────────────────────────────────
    {
        "pronostic": {
            "titre": "PSG vs Marseille",
            "description": "Classique de la Ligue 1 — 38e journée",
            "prediction": "Victoire PSG",
            "cote": 1.65, "statut": "ouvert", "categorie": "Football",
        },
        "pari": {"description": "Pariez sur le vainqueur du Classique", "mise_min": 50, "statut": "actif"},
    },
    {
        "pronostic": {
            "titre": "Real Madrid vs FC Barcelone",
            "description": "El Clásico — Liga",
            "prediction": "Match nul",
            "cote": 3.20, "statut": "ouvert", "categorie": "Football",
        },
        "pari": {"description": "Le duel au sommet de la Liga", "mise_min": 100, "statut": "actif"},
    },
    {
        "pronostic": {
            "titre": "Nantes vs Lyon",
            "description": "Ligue 1 — Journée 32",
            "prediction": "Victoire Lyon",
            "cote": 2.10, "statut": "ouvert", "categorie": "Football",
        },
        "pari": {"description": "Les Gones l'emportent à la Beaujoire ?", "mise_min": 30, "statut": "actif"},
    },
    {
        "pronostic": {
            "titre": "Manchester City vs Arsenal",
            "description": "Premier League — Dernier virage du titre",
            "prediction": "Victoire Manchester City",
            "cote": 1.75, "statut": "ouvert", "categorie": "Football",
        },
        "pari": {"description": "City peut-il conserver son titre ?", "mise_min": 80, "statut": "actif"},
    },
    {
        "pronostic": {
            "titre": "T1 vs Cloud9 — Worlds 2025",
            "description": "Quart de finale Worlds League of Legends",
            "prediction": "Victoire T1",
            "cote": 1.45, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "Qui passera en demi-finale ?", "mise_min": 75, "statut": "actif"},
    },
    {
        "pronostic": {
            "titre": "G2 vs Fnatic — LEC Spring",
            "description": "Demi-finale LEC Spring Split",
            "prediction": "Victoire G2",
            "cote": 1.60, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "G2 vers la grande finale ?", "mise_min": 60, "statut": "actif"},
    },
    {
        "pronostic": {
            "titre": "Fnatic vs Vitality — VCT EMEA",
            "description": "Valorant Champions Tour EMEA",
            "prediction": "Victoire Vitality",
            "cote": 1.90, "statut": "ouvert", "categorie": "Valorant",
        },
        "pari": {"description": "Le duel franco-britannique", "mise_min": 60, "statut": "actif"},
    },
    {
        "pronostic": {
            "titre": "Sentinels vs LOUD — VCT Americas",
            "description": "Playoffs VCT Americas",
            "prediction": "Victoire LOUD",
            "cote": 2.05, "statut": "ouvert", "categorie": "Valorant",
        },
        "pari": {"description": "LOUD confirme sa domination ?", "mise_min": 50, "statut": "actif"},
    },
    {
        "pronostic": {
            "titre": "OG vs Team Liquid — RLCS",
            "description": "RLCS Spring Split — Playoffs",
            "prediction": "Victoire OG",
            "cote": 2.30, "statut": "ouvert", "categorie": "Rocket League",
        },
        "pari": {"description": "Playoffs Rocket League RLCS", "mise_min": 50, "statut": "actif"},
    },
    # ── Fermés ──────────────────────────────────────────────────────
    {
        "pronostic": {
            "titre": "Monaco vs Lens",
            "description": "Ligue 1 — Journée 28",
            "prediction": "Victoire Monaco",
            "cote": 1.55, "statut": "termine", "categorie": "Football",
        },
        "pari": {"description": "Monaco consolide sa 2e place", "mise_min": 40, "statut": "ferme"},
    },
    {
        "pronostic": {
            "titre": "NaVi vs G2 — CS2 Major",
            "description": "Grande finale du Major CS2",
            "prediction": "Victoire G2",
            "cote": 1.85, "statut": "termine", "categorie": "CS2",
        },
        "pari": {"description": "Qui lève le trophée du Major ?", "mise_min": 75, "statut": "ferme"},
    },
    # ── Réglés ──────────────────────────────────────────────────────
    {
        "pronostic": {
            "titre": "France vs Espagne — Euro 2025",
            "description": "Demi-finale de l'Euro 2025",
            "prediction": "Victoire France",
            "cote": 2.00, "statut": "termine", "categorie": "Football",
        },
        "pari": {"description": "Les Bleus en finale !", "mise_min": 100, "statut": "regle"},
    },
    {
        "pronostic": {
            "titre": "NaVi vs G2 — CS2 Major",
            "description": "Grande finale du Major CS2",
            "prediction": "Victoire G2",
            "cote": 1.85,
            "statut": "termine",
        },
        "pari": {
            "description": "Qui lève le trophée du Major ?",
            "mise_min": 75,
            "statut": "regle",
        },
    },
    {
        "pronostic": {
            "titre": "Bayern Munich vs Dortmund",
            "description": "Der Klassiker — Bundesliga",
            "prediction": "Match nul",
            "cote": 3.50,
            "statut": "termine",
        },
        "pari": {
            "description": "Le choc allemand de la saison",
            "mise_min": 60,
            "statut": "regle",
        },
    },
]


# ─── Fonction principale ──────────────────────────────────────────────────────

def seed_dev_data() -> None:
    users_created = 0
    communautes_created = 0
    memberships_created = 0
    friendships_created = 0
    pronostics_created = 0
    paris_created = 0

    with get_db() as conn:
        with conn.cursor() as cur:

            # ── Utilisateurs ─────────────────────────────────────────
            for u in UTILISATEURS_TEST:
                cur.execute("SELECT id FROM users WHERE email = %s", (u["email"],))
                if cur.fetchone():
                    continue
                cur.execute(
                    """
                    INSERT INTO users (
                        pseudo, email, password_hash, age, genre, pays, region,
                        coins, gems, xp_total, is_admin
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        u["pseudo"], u["email"], _hash_password(u["password"]),
                        u["age"], u["genre"], u["pays"], u.get("region"),
                        u["coins"], u["gems"], u["xp_total"], u["is_admin"],
                    ),
                )
                users_created += 1

            # ── Communautés ───────────────────────────────────────────
            for c in COMMUNAUTES_TEST:
                cur.execute("SELECT id FROM communautes WHERE nom = %s", (c["nom"],))
                if cur.fetchone():
                    continue
                cur.execute(
                    "INSERT INTO communautes (nom, description, jeu) VALUES (%s, %s, %s)",
                    (c["nom"], c["description"], c["jeu"]),
                )
                communautes_created += 1

            # ── Memberships ───────────────────────────────────────────
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
                        VALUES (%s, %s) ON CONFLICT DO NOTHING
                        """,
                        (user_row["id"], commu_row["id"]),
                    )
                    if cur.rowcount:
                        memberships_created += 1

            # ── Amitiés (tous les non-admin entre eux) ────────────────
            non_admin = [u["pseudo"] for u in UTILISATEURS_TEST if not u["is_admin"]]
            for a, b in itertools.combinations(non_admin, 2):
                cur.execute("SELECT id FROM users WHERE pseudo = %s", (a,))
                row_a = cur.fetchone()
                cur.execute("SELECT id FROM users WHERE pseudo = %s", (b,))
                row_b = cur.fetchone()
                if not row_a or not row_b:
                    continue
                id_a, id_b = row_a["id"], row_b["id"]
                # Bidirectionnel
                for u1, u2 in [(id_a, id_b), (id_b, id_a)]:
                    cur.execute(
                        """
                        INSERT INTO user_friends (user_id, friend_user_id)
                        VALUES (%s, %s) ON CONFLICT DO NOTHING
                        """,
                        (u1, u2),
                    )
                    if cur.rowcount:
                        friendships_created += 1

            # ── Pronostics + Paris ────────────────────────────────────
            cur.execute("SELECT id FROM users WHERE pseudo = 'admin'")
            admin_row = cur.fetchone()
            if admin_row:
                admin_id = admin_row["id"]
                for item in PARIS_TEST:
                    p = item["pronostic"]
                    cur.execute(
                        "SELECT id FROM pronostics WHERE titre = %s AND user_id = %s",
                        (p["titre"], admin_id),
                    )
                    if cur.fetchone():
                        continue
                    cur.execute(
                        """
                        INSERT INTO pronostics (user_id, titre, description, prediction, cote, statut, categorie)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (admin_id, p["titre"], p["description"], p["prediction"], p["cote"], p["statut"], p.get("categorie", "Autre")),
                    )
                    pronostic_id = cur.fetchone()["id"]
                    pronostics_created += 1

                    pa = item["pari"]
                    cur.execute(
                        """
                        INSERT INTO paris (admin_user_id, pronostic_id, description, mise_min, statut)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (admin_id, pronostic_id, pa["description"], pa["mise_min"], pa["statut"]),
                    )
                    paris_created += 1

        conn.commit()

    if users_created:
        logger.info("Seed : %d utilisateur(s) créé(s). Mot de passe : Test1234!", users_created)
    if communautes_created:
        logger.info("Seed : %d communauté(s) créée(s).", communautes_created)
    if memberships_created:
        logger.info("Seed : %d membership(s) créé(s).", memberships_created)
    if friendships_created:
        logger.info("Seed : %d lien(s) d'amitié créé(s).", friendships_created)
    if pronostics_created:
        logger.info("Seed : %d pronostic(s) créé(s).", pronostics_created)
    if paris_created:
        logger.info("Seed : %d pari(s) créé(s).", paris_created)
    if not any([users_created, communautes_created, memberships_created,
                friendships_created, pronostics_created, paris_created]):
        logger.info("Seed : données déjà présentes, rien à faire.")
