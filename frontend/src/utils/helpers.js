export function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function statutLabel(statut) {
  const map = { ouvert: "Ouvert", termine: "Terminé", annule: "Annulé" };
  return map[statut] || statut;
}

export function statutColor(statut) {
  const map = { ouvert: "#16a34a", termine: "#64748b", annule: "#dc2626" };
  return map[statut] || "#64748b";
}
