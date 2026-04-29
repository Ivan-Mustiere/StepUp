export const RANKS = [
  {
    id: "bronze",
    name: "Bronze",
    minXp: 0,
    image:   require("../assets/images/Elo/badges/Badges_Bronze.png"),
    banner:  require("../assets/images/Elo/bannieres/Bannieres_Bronze.png"),
    color: "#cd7f32",
    discount: 0,
    specialAccess: [],
  },
  {
    id: "silver",
    name: "Silver",
    minXp: 500,
    image:   require("../assets/images/Elo/badges/Badges_Silver.png"),
    banner:  require("../assets/images/Elo/bannieres/Bannieres_Silver.png"),
    color: "#a8a9ad",
    discount: 5,
    specialAccess: [],
  },
  {
    id: "gold",
    name: "Gold",
    minXp: 1500,
    image:   require("../assets/images/Elo/badges/Badges_Gold.png"),
    banner:  require("../assets/images/Elo/bannieres/Bannieres_Gold.png"),
    color: "#ffd700",
    discount: 10,
    specialAccess: [],
  },
  {
    id: "platine",
    name: "Platine",
    minXp: 3000,
    image:   require("../assets/images/Elo/badges/Badges_Platine.png"),
    banner:  require("../assets/images/Elo/bannieres/Bannieres_Platine.png"),
    color: "#00c8ff",
    discount: 15,
    specialAccess: [],
  },
  {
    id: "diamant",
    name: "Diamant",
    minXp: 5000,
    image:   require("../assets/images/Elo/badges/Badges_Diamant.png"),
    banner:  require("../assets/images/Elo/bannieres/Bannieres_Diamant.png"),
    color: "#b9f2ff",
    discount: 20,
    specialAccess: ["early_access"],
  },
  {
    id: "emeraude",
    name: "Émeraude",
    minXp: 8000,
    image:   require("../assets/images/Elo/badges/Badges_Emeraude.png"),
    banner:  require("../assets/images/Elo/bannieres/Bannieres_Emeraude.png"),
    color: "#50c878",
    discount: 25,
    specialAccess: ["early_access", "vip_chat"],
  },
  {
    id: "master",
    name: "Master",
    minXp: 12000,
    image:   require("../assets/images/Elo/badges/Badges_Master.png"),
    banner:  require("../assets/images/Elo/bannieres/Bannieres_Master.png"),
    color: "#9b59b6",
    discount: 30,
    specialAccess: ["early_access", "vip_chat", "beta_features"],
  },
];

export function getRank(xp = 0) {
  return [...RANKS].reverse().find((r) => xp >= r.minXp) ?? RANKS[0];
}

export function getNextRank(xp = 0) {
  const current = getRank(xp);
  const idx = RANKS.findIndex((r) => r.id === current.id);
  return RANKS[idx + 1] ?? null;
}

export function getRankProgress(xp = 0) {
  const current = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return 1;
  const range = next.minXp - current.minXp;
  return Math.min((xp - current.minXp) / range, 1);
}
