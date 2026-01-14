-- Création de la table principale des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    pseudo VARCHAR(255) NOT NULL,
    age INT,
    genre VARCHAR(50),
    region VARCHAR(100),
    pays VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    coins INT DEFAULT 0,
    rank INT DEFAULT 0,
    xp_total INT DEFAULT 0,
    xp_semaine INT DEFAULT 0,
    verification_ok BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_utilisation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stock_paris INT DEFAULT 0,
    vip BOOLEAN DEFAULT FALSE,
    strick INT DEFAULT 0,
    stock_degel_strick INT DEFAULT 0,
    league_regarde VARCHAR(100),
    pas_total INT DEFAULT 0
);

-- Table des amis
CREATE TABLE user_friends (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, friend_user_id)
);

-- Table des communautés
CREATE TABLE user_communautes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    communaute_id INT NOT NULL,
    UNIQUE(user_id, communaute_id)
);

-- Table des clubs
CREATE TABLE user_clubs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    club_id INT NOT NULL,
    type VARCHAR(50) CHECK (type IN ('favori', 'detest')),
    UNIQUE(user_id, club_id)
);

-- Table des jeux
CREATE TABLE user_jeux (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jeu_id INT NOT NULL,
    UNIQUE(user_id, jeu_id)
);

-- Table des succès
CREATE TABLE user_succes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    succes_name VARCHAR(255) NOT NULL
);

-- Table historique des paris
CREATE TABLE user_historique_parie (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paris_detail JSONB NOT NULL
);

-- Table historique des pas
CREATE TABLE user_pas_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    pas INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des événements
CREATE TABLE user_evenements (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evenement_id INT NOT NULL
);

-- Index pour optimiser certaines recherches
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_pas_history_user_date ON user_pas_history(user_id, date);
