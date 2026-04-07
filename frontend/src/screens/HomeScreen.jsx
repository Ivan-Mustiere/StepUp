import { useEffect, useState } from "react";
import { getPronostics, createPronostic } from "../api/api";
import Card from "../components/Card";
import Button from "../components/Button";
import { formatDate, statutLabel, statutColor } from "../utils/helpers";

const STATUTS = ["", "ouvert", "termine", "annule"];
const LIMIT = 20;
const emptyForm = { titre: "", prediction: "", description: "", cote: "" };

export default function HomeScreen({ onSelect }) {
  const [pronostics, setPronostics] = useState([]);
  const [statut, setStatut] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function load(reset = false) {
    setLoading(true);
    setError("");
    const currentOffset = reset ? 0 : offset;
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset: currentOffset });
      if (statut) params.set("statut", statut);
      const data = await getPronostics(params.toString());
      if (reset) {
        setPronostics(data);
        setOffset(data.length);
      } else {
        setPronostics((prev) => [...prev, ...data]);
        setOffset((prev) => prev + data.length);
      }
      setHasMore(data.length === LIMIT);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
  }, [statut]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await createPronostic({
        ...form,
        cote: form.cote ? Number(form.cote) : null,
      });
      setForm(emptyForm);
      setShowForm(false);
      load(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Pronostics</h2>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Annuler" : "+ Nouveau"}
        </Button>
      </div>

      {showForm && (
        <Card className="form-card">
          <h3>Nouveau pronostic</h3>
          {error && <p className="error">{error}</p>}
          <form className="form" onSubmit={handleCreate}>
            <input
              placeholder="Titre"
              value={form.titre}
              onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))}
              required
            />
            <input
              placeholder="Prédiction"
              value={form.prediction}
              onChange={(e) => setForm((p) => ({ ...p, prediction: e.target.value }))}
              required
            />
            <input
              placeholder="Description (optionnel)"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="Cote (optionnel)"
              value={form.cote}
              onChange={(e) => setForm((p) => ({ ...p, cote: e.target.value }))}
            />
            <Button type="submit">Publier</Button>
          </form>
        </Card>
      )}

      <div className="filter-bar">
        {STATUTS.map((s) => (
          <button
            key={s}
            className={`filter-btn ${statut === s ? "active" : ""}`}
            onClick={() => setStatut(s)}
          >
            {s === "" ? "Tous" : statutLabel(s)}
          </button>
        ))}
      </div>

      {error && !showForm && <p className="error">{error}</p>}

      <div className="list">
        {pronostics.map((p) => (
          <Card key={p.id} className="pronostic-card" onClick={() => onSelect(p)}>
            <div className="pronostic-header">
              <span className="pronostic-titre">{p.titre}</span>
              <span className="badge" style={{ background: statutColor(p.statut) }}>
                {statutLabel(p.statut)}
              </span>
            </div>
            <p className="pronostic-prediction">"{p.prediction}"</p>
            <div className="pronostic-meta">
              <span>par {p.auteur}</span>
              {p.cote && <span>Cote : {p.cote}</span>}
              <span>{formatDate(p.created_at)}</span>
            </div>
          </Card>
        ))}
        {pronostics.length === 0 && !loading && (
          <p className="empty">Aucun pronostic.</p>
        )}
      </div>

      {hasMore && (
        <div className="center-btn">
          <Button onClick={() => load(false)} disabled={loading} variant="secondary">
            {loading ? "Chargement..." : "Voir plus"}
          </Button>
        </div>
      )}
    </div>
  );
}
