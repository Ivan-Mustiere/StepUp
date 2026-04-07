import Card from "../components/Card";
import Button from "../components/Button";
import { formatDate, statutLabel, statutColor } from "../utils/helpers";

export default function DetailScreen({ pronostic, onBack }) {
  if (!pronostic) return null;

  return (
    <div className="screen">
      <div className="screen-header">
        <Button onClick={onBack} variant="secondary">← Retour</Button>
        <h2>Détail</h2>
      </div>

      <Card>
        <div className="pronostic-header">
          <h3 style={{ margin: 0 }}>{pronostic.titre}</h3>
          <span className="badge" style={{ background: statutColor(pronostic.statut) }}>
            {statutLabel(pronostic.statut)}
          </span>
        </div>

        <div className="detail-section">
          <p className="detail-label">Prédiction</p>
          <p className="detail-value">"{pronostic.prediction}"</p>
        </div>

        {pronostic.description && (
          <div className="detail-section">
            <p className="detail-label">Description</p>
            <p className="detail-value">{pronostic.description}</p>
          </div>
        )}

        {pronostic.cote && (
          <div className="detail-section">
            <p className="detail-label">Cote</p>
            <p className="detail-value">{pronostic.cote}</p>
          </div>
        )}

        <div className="pronostic-meta" style={{ marginTop: 16 }}>
          <span>Auteur : {pronostic.auteur}</span>
          <span>Publié le {formatDate(pronostic.created_at)}</span>
        </div>
      </Card>
    </div>
  );
}
