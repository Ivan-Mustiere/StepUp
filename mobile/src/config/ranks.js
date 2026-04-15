/**
 * Configuration des rangs StepUp.
 * Chaque rang est lié à un seuil d'XP et embarque tous ses paramètres.
 *
 * Pour ajouter un perk :
 *   1. Ajoute le champ ici dans chaque rang.
 *   2. Utilise getRank(xp).monChamp là où tu en as besoin.
 */

export const RANKS = [
  {
    id: "bronze",
    name: "Bronze",
    minXp: 0,
    image: require("../assets/images/Elo/bronze.png"),
    color: "#cd7f32",
    banner: null,
    discount: 0,           // % de réduction en boutique
    specialAccess: [],     // ex: ["early_access", "vip_chat"]
  },
  {
    id: "silver",
    name: "Silver",
    minXp: 500,
    image: require("../assets/images/Elo/silver.png"),
    color: "#a8a9ad",
    banner: null,
    discount: 5,
    specialAccess: [],
  },
  {
    id: "gold",
    name: "Gold",
    minXp: 1500,
    image: require("../assets/images/Elo/gold.png"),
    color: "#ffd700",
    banner: null,
    discount: 10,
    specialAccess: [],
  },
  {
    id: "platine",
    name: "Platine",
    minXp: 3000,
    image: require("../assets/images/Elo/platine.png"),
    color: "#00c8ff",
    banner: null,
    discount: 15,
    specialAccess: [],
  },
  {
    id: "diamant",
    name: "Diamant",
    minXp: 5000,
    image: require("../assets/images/Elo/diamant.png"),
    color: "#b9f2ff",
    banner: null,
    discount: 20,
    specialAccess: ["early_access"],
  },
  {
    id: "emeraude",
    name: "Émeraude",
    minXp: 8000,
    image: require("../assets/images/Elo/emeraude.png"),
    color: "#50c878",
    banner: null,
    discount: 25,
    specialAccess: ["early_access", "vip_chat"],
  },
  {
    id: "master",
    name: "Master",
    minXp: 12000,
    image: require("../assets/images/Elo/master.png"),
    color: "#9b59b6",
    banner: null,
    discount: 30,
    specialAccess: ["early_access", "vip_chat", "beta_features"],
  },
];

/**
 * Retourne le rang correspondant à un total d'XP.
 * @param {number} xp
 * @returns {object} rang
 */
export function getRank(xp = 0) {
  return [...RANKS].reverse().find((r) => xp >= r.minXp) ?? RANKS[0];
}

/**
 * Retourne le prochain rang (null si déjà Master).
 * @param {number} xp
 * @returns {object|null}
 */
export function getNextRank(xp = 0) {
  const current = getRank(xp);
  const idx = RANKS.findIndex((r) => r.id === current.id);
  return RANKS[idx + 1] ?? null;
}

/**
 * Retourne la progression (0–1) vers le prochain rang.
 * @param {number} xp
 * @returns {number} entre 0 et 1
 */
export function getRankProgress(xp = 0) {
  const current = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return 1;
  const range = next.minXp - current.minXp;
  return Math.min((xp - current.minXp) / range, 1);
}
