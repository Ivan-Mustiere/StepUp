"""
Seed de données de test — exécuté uniquement en environnement de développement.
Idempotent : ne recrée pas ce qui existe déjà.
"""

import itertools
import logging
import random
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras
from app.core.config import DATABASE_URL
from app.core.security import _hash_password


def _get_sync_db():
    """Connexion synchrone psycopg2 pour le seed (exécuté au démarrage)."""
    from contextlib import contextmanager
    from urllib.parse import urlparse

    @contextmanager
    def _conn():
        parsed = urlparse(DATABASE_URL)
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            dbname=(parsed.path or "").lstrip("/"),
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
        try:
            yield conn
        finally:
            conn.close()

    return _conn()

def _dans(hours=0, minutes=0, days=0):
    """Retourne un datetime futur relatif à maintenant."""
    return datetime.now() + timedelta(hours=hours, minutes=minutes, days=days)

def _il_y_a(hours=0, days=0):
    """Retourne un datetime passé relatif à maintenant."""
    return datetime.now() - timedelta(hours=hours, days=days)

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

# ─── Équipes esport ──────────────────────────────────────────────────────────

EQUIPES_TEST = [
    # League of Legends
    {"nom": "T1",            "jeu": "League of Legends", "couleur": "#C89B3C"},
    {"nom": "Gen.G",         "jeu": "League of Legends", "couleur": "#000000"},
    {"nom": "G2 Esports",    "jeu": "League of Legends", "couleur": "#1F1F1F"},
    {"nom": "Fnatic",        "jeu": "League of Legends", "couleur": "#FF5900"},
    {"nom": "Cloud9",        "jeu": "League of Legends", "couleur": "#1BA8FF"},
    {"nom": "Team Liquid",   "jeu": "League of Legends", "couleur": "#026BE3"},
    {"nom": "BLG",           "jeu": "League of Legends", "couleur": "#004B87"},
    {"nom": "JDG",           "jeu": "League of Legends", "couleur": "#C8AA6E"},
    {"nom": "NaVi",          "jeu": "League of Legends", "couleur": "#FFD700"},
    {"nom": "MAD Lions",     "jeu": "League of Legends", "couleur": "#00C4FF"},
    {"nom": "KT Rolster",    "jeu": "League of Legends", "couleur": "#E4002B"},
    {"nom": "DRX",           "jeu": "League of Legends", "couleur": "#0044CC"},
    {"nom": "Top Esports",   "jeu": "League of Legends", "couleur": "#1A1A1A"},
    {"nom": "Weibo Gaming",  "jeu": "League of Legends", "couleur": "#D40000"},
    {"nom": "LOUD",          "jeu": "League of Legends", "couleur": "#00FF00"},
    {"nom": "Vitality",      "jeu": "League of Legends", "couleur": "#F4D000"},
    # Valorant
    {"nom": "Sentinels",     "jeu": "Valorant", "couleur": "#E4002B"},
    {"nom": "Fnatic",        "jeu": "Valorant", "couleur": "#FF5900"},
    {"nom": "Team Vitality", "jeu": "Valorant", "couleur": "#F4D000"},
    {"nom": "LOUD",          "jeu": "Valorant", "couleur": "#00FF00"},
    {"nom": "NRG",           "jeu": "Valorant", "couleur": "#FF6B00"},
    {"nom": "Paper Rex",     "jeu": "Valorant", "couleur": "#C8001E"},
    {"nom": "EDG",           "jeu": "Valorant", "couleur": "#003DA5"},
    # Rocket League
    {"nom": "OG",            "jeu": "Rocket League", "couleur": "#0066CC"},
    {"nom": "Team Liquid",   "jeu": "Rocket League", "couleur": "#026BE3"},
    {"nom": "Karmine Corp",  "jeu": "Rocket League", "couleur": "#001AFF"},
    {"nom": "G2 Esports",    "jeu": "Rocket League", "couleur": "#1F1F1F"},
    {"nom": "Vitality",      "jeu": "Rocket League", "couleur": "#F4D000"},
]

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
        "pari": {"description": "Pariez sur le vainqueur du Classique", "mise_min": 50, "statut": "actif", "date_debut": lambda: _dans(hours=3)},
    },
    {
        "pronostic": {
            "titre": "Real Madrid vs FC Barcelone",
            "description": "El Clásico — Liga",
            "prediction": "Match nul",
            "cote": 3.20, "statut": "ouvert", "categorie": "Football",
        },
        "pari": {"description": "Le duel au sommet de la Liga", "mise_min": 100, "statut": "actif", "date_debut": lambda: _dans(hours=24)},
    },
    {
        "pronostic": {
            "titre": "Nantes vs Lyon",
            "description": "Ligue 1 — Journée 32",
            "prediction": "Victoire Lyon",
            "cote": 2.10, "statut": "ouvert", "categorie": "Football",
        },
        "pari": {"description": "Les Gones l'emportent à la Beaujoire ?", "mise_min": 30, "statut": "actif", "date_debut": lambda: _dans(minutes=10)},
    },
    {
        "pronostic": {
            "titre": "Manchester City vs Arsenal",
            "description": "Premier League — Dernier virage du titre",
            "prediction": "Victoire Manchester City",
            "cote": 1.75, "statut": "ouvert", "categorie": "Football",
        },
        "pari": {"description": "City peut-il conserver son titre ?", "mise_min": 80, "statut": "actif", "date_debut": lambda: _dans(hours=48)},
    },
    {
        "pronostic": {
            "titre": "T1 vs Cloud9 — Worlds 2025",
            "description": "Quart de finale Worlds League of Legends",
            "prediction": "Victoire T1",
            "cote": 1.45, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "Qui passera en demi-finale ?", "mise_min": 75, "statut": "actif", "date_debut": lambda: _dans(hours=2)},
    },
    {
        "pronostic": {
            "titre": "G2 vs Fnatic — LEC Spring",
            "description": "Demi-finale LEC Spring Split",
            "prediction": "Victoire G2",
            "cote": 1.60, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "G2 vers la grande finale ?", "mise_min": 60, "statut": "actif", "date_debut": lambda: _dans(hours=5)},
    },
    {
        "pronostic": {
            "titre": "BLG vs JDG — LPL Summer",
            "description": "Demi-finale LPL Summer Split 2025",
            "prediction": "Victoire BLG",
            "cote": 1.75, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "Le derby chinois des titans", "mise_min": 60, "statut": "actif", "date_debut": lambda: _dans(hours=3)},
    },
    {
        "pronostic": {
            "titre": "T1 vs Gen.G — LCK Summer",
            "description": "Grande finale LCK Summer 2025",
            "prediction": "Victoire Gen.G",
            "cote": 2.10, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "Qui domine le LCK cet été ?", "mise_min": 80, "statut": "actif", "date_debut": lambda: _dans(hours=7)},
    },
    {
        "pronostic": {
            "titre": "NaVi vs G2 — LEC Playoffs",
            "description": "Quart de finale LEC Summer Split",
            "prediction": "Victoire G2",
            "cote": 1.55, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "G2 confirme sa domination en Europe ?", "mise_min": 50, "statut": "actif", "date_debut": lambda: _dans(hours=4)},
    },
    {
        "pronostic": {
            "titre": "Cloud9 vs Team Liquid — LCS Finals",
            "description": "Grande finale LCS Summer 2025",
            "prediction": "Victoire Cloud9",
            "cote": 1.80, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "Le choc américain du split", "mise_min": 70, "statut": "actif", "date_debut": lambda: _dans(hours=6)},
    },
    {
        "pronostic": {
            "titre": "LOUD vs RED Canids — CBLOL",
            "description": "Grande finale CBLOL Summer 2025",
            "prediction": "Victoire LOUD",
            "cote": 1.65, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "LOUD roi du Brésil encore une fois ?", "mise_min": 40, "statut": "actif", "date_debut": lambda: _dans(hours=9)},
    },
    {
        "pronostic": {
            "titre": "KT Rolster vs DRX — LCK",
            "description": "Match de régularité LCK Summer — Semaine 8",
            "prediction": "Victoire KT Rolster",
            "cote": 1.90, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "KT peut-il renverser DRX ?", "mise_min": 50, "statut": "actif", "date_debut": lambda: _dans(hours=12)},
    },
    {
        "pronostic": {
            "titre": "Vitality vs MAD Lions — LEC",
            "description": "LEC Summer Split — Semaine 6",
            "prediction": "Match nul (bo1 remporté par MAD)",
            "cote": 2.50, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "Upset ou performance attendue ?", "mise_min": 40, "statut": "actif", "date_debut": lambda: _dans(hours=8)},
    },
    {
        "pronostic": {
            "titre": "Weibo Gaming vs Top Esports",
            "description": "LPL Summer — Semaine 9",
            "prediction": "Victoire Top Esports",
            "cote": 1.70, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "TES se relève après sa défaite ?", "mise_min": 60, "statut": "actif", "date_debut": lambda: _dans(hours=10)},
    },
    {
        "pronostic": {
            "titre": "T1 vs BLG — Worlds 2025 Finale",
            "description": "Grande finale des Worlds 2025",
            "prediction": "Victoire T1",
            "cote": 1.50, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "Faker soulève une 5e coupe du monde ?", "mise_min": 100, "statut": "actif", "date_debut": lambda: _dans(hours=24)},
    },
    {
        "pronostic": {
            "titre": "G2 vs Cloud9 — Worlds Group Stage",
            "description": "Phase de groupes Worlds 2025",
            "prediction": "Victoire G2",
            "cote": 1.45, "statut": "ouvert", "categorie": "League of Legends",
        },
        "pari": {"description": "L'Europe domine l'Amérique du Nord", "mise_min": 50, "statut": "actif", "date_debut": lambda: _dans(hours=15)},
    },
    {
        "pronostic": {
            "titre": "Fnatic vs MAD Lions — LEC",
            "description": "LEC Summer — Derby européen",
            "prediction": "Victoire Fnatic",
            "cote": 2.00, "statut": "termine", "categorie": "League of Legends",
        },
        "pari": {"description": "Le vieux lion se réveille ?", "mise_min": 40, "statut": "ferme", "date_debut": lambda: _il_y_a(hours=3)},
    },
    {
        "pronostic": {
            "titre": "JDG vs NRG — Worlds 2024 SF",
            "description": "Demi-finale Worlds 2024 (archivé)",
            "prediction": "Victoire JDG",
            "cote": 1.35, "statut": "termine", "categorie": "League of Legends",
        },
        "pari": {"description": "JDG en route vers la finale ?", "mise_min": 75, "statut": "regle", "date_debut": lambda: _il_y_a(days=5)},
    },
    {
        "pronostic": {
            "titre": "Fnatic vs Vitality — VCT EMEA",
            "description": "Valorant Champions Tour EMEA",
            "prediction": "Victoire Vitality",
            "cote": 1.90, "statut": "ouvert", "categorie": "Valorant",
        },
        "pari": {"description": "Le duel franco-britannique", "mise_min": 60, "statut": "actif", "date_debut": lambda: _dans(hours=1)},
    },
    {
        "pronostic": {
            "titre": "Sentinels vs LOUD — VCT Americas",
            "description": "Playoffs VCT Americas",
            "prediction": "Victoire LOUD",
            "cote": 2.05, "statut": "ouvert", "categorie": "Valorant",
        },
        "pari": {"description": "LOUD confirme sa domination ?", "mise_min": 50, "statut": "actif", "date_debut": lambda: _dans(hours=6)},
    },
    {
        "pronostic": {
            "titre": "OG vs Team Liquid — RLCS",
            "description": "RLCS Spring Split — Playoffs",
            "prediction": "Victoire OG",
            "cote": 2.30, "statut": "ouvert", "categorie": "Rocket League",
        },
        "pari": {"description": "Playoffs Rocket League RLCS", "mise_min": 50, "statut": "actif", "date_debut": lambda: _dans(hours=4)},
    },
    # ── Fermés ──────────────────────────────────────────────────────
    {
        "pronostic": {
            "titre": "Monaco vs Lens",
            "description": "Ligue 1 — Journée 28",
            "prediction": "Victoire Monaco",
            "cote": 1.55, "statut": "termine", "categorie": "Football",
        },
        "pari": {"description": "Monaco consolide sa 2e place", "mise_min": 40, "statut": "ferme", "date_debut": lambda: _il_y_a(hours=2)},
    },
    {
        "pronostic": {
            "titre": "NaVi vs G2 — CS2 Major",
            "description": "Grande finale du Major CS2",
            "prediction": "Victoire G2",
            "cote": 1.85, "statut": "termine", "categorie": "CS2",
        },
        "pari": {"description": "Qui lève le trophée du Major ?", "mise_min": 75, "statut": "ferme", "date_debut": lambda: _il_y_a(days=1)},
    },
    # ── Réglés ──────────────────────────────────────────────────────
    {
        "pronostic": {
            "titre": "France vs Espagne — Euro 2025",
            "description": "Demi-finale de l'Euro 2025",
            "prediction": "Victoire France",
            "cote": 2.00, "statut": "termine", "categorie": "Football",
        },
        "pari": {"description": "Les Bleus en finale !", "mise_min": 100, "statut": "regle", "date_debut": lambda: _il_y_a(days=3)},
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
    equipes_created = 0
    equipes_assigned = 0
    pronostics_created = 0
    paris_created = 0

    with _get_sync_db() as conn:
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

            # ── Équipes esport ────────────────────────────────────────
            for e in EQUIPES_TEST:
                cur.execute(
                    "SELECT id FROM equipes_esport WHERE nom = %s",
                    (e["nom"],),
                )
                if cur.fetchone():
                    continue
                cur.execute(
                    "INSERT INTO equipes_esport (nom, couleur) VALUES (%s, %s)",
                    (e["nom"], e["couleur"]),
                )
                equipes_created += 1

            # ── Équipes favorites des utilisateurs ────────────────────
            cur.execute("SELECT id FROM equipes_esport")
            all_equipe_ids = [r["id"] for r in cur.fetchall()]
            equipes_assigned = 0
            if all_equipe_ids:
                for u in UTILISATEURS_TEST:
                    cur.execute("SELECT id FROM users WHERE pseudo = %s", (u["pseudo"],))
                    user_row = cur.fetchone()
                    if not user_row:
                        continue
                    cur.execute(
                        "SELECT 1 FROM user_equipes_esport WHERE user_id = %s",
                        (user_row["id"],),
                    )
                    if cur.fetchone():
                        continue
                    nb = random.randint(1, 3)
                    chosen = random.sample(all_equipe_ids, min(nb, len(all_equipe_ids)))
                    for equipe_id in chosen:
                        cur.execute(
                            "INSERT INTO user_equipes_esport (user_id, equipe_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (user_row["id"], equipe_id),
                        )
                        equipes_assigned += 1

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
                    date_debut = pa["date_debut"]() if callable(pa.get("date_debut")) else pa.get("date_debut")
                    cur.execute(
                        """
                        INSERT INTO paris (admin_user_id, pronostic_id, description, mise_min, statut, date_debut)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (admin_id, pronostic_id, pa["description"], pa["mise_min"], pa["statut"], date_debut),
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
    if equipes_created:
        logger.info("Seed : %d équipe(s) esport créée(s).", equipes_created)
    if equipes_assigned:
        logger.info("Seed : %d équipe(s) assignée(s) aux utilisateurs.", equipes_assigned)
    if pronostics_created:
        logger.info("Seed : %d pronostic(s) créé(s).", pronostics_created)
    if paris_created:
        logger.info("Seed : %d pari(s) créé(s).", paris_created)
    if not any([users_created, communautes_created, memberships_created,
                friendships_created, equipes_assigned, pronostics_created, paris_created]):
        logger.info("Seed : données déjà présentes, rien à faire.")
