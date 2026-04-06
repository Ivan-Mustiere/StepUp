-- Schema StepUp: creation idempotente
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    pseudo VARCHAR(255) NOT NULL,
    age INT,
    genre VARCHAR(50),
    region VARCHAR(100),
    pays VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    coins INT DEFAULT 0 CHECK (coins >= 0),
    rank INT DEFAULT 0 CHECK (rank >= 0),
    xp_total INT DEFAULT 0 CHECK (xp_total >= 0),
    xp_semaine INT DEFAULT 0 CHECK (xp_semaine >= 0),
    verification_ok BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_utilisation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stock_paris INT DEFAULT 0 CHECK (stock_paris >= 0),
    vip BOOLEAN DEFAULT FALSE,
    strick INT DEFAULT 0 CHECK (strick >= 0),
    stock_degel_strick INT DEFAULT 0 CHECK (stock_degel_strick >= 0),
    league_regarde VARCHAR(100),
    pas_total INT DEFAULT 0 CHECK (pas_total >= 0)
);

CREATE TABLE IF NOT EXISTS user_friends (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, friend_user_id),
    CHECK (user_id <> friend_user_id)
);

CREATE TABLE IF NOT EXISTS user_communautes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    communaute_id INT NOT NULL,
    UNIQUE(user_id, communaute_id)
);

CREATE TABLE IF NOT EXISTS user_clubs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    club_id INT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('favori', 'detest')),
    UNIQUE(user_id, club_id)
);

CREATE TABLE IF NOT EXISTS user_jeux (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jeu_id INT NOT NULL,
    UNIQUE(user_id, jeu_id)
);

CREATE TABLE IF NOT EXISTS user_succes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    succes_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_historique_parie (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paris_detail JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS user_pas_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    pas INT NOT NULL CHECK (pas >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS user_evenements (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evenement_id INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_pas_history_user_date ON user_pas_history(user_id, date);
