import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
  const [formError, setFormError] = useState("");

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

  async function handleCreate() {
    setFormError("");
    if (!form.titre.trim() || !form.prediction.trim()) {
      setFormError("Le titre et la prédiction sont requis.");
      return;
    }
    try {
      await createPronostic({
        ...form,
        cote: form.cote ? Number(form.cote) : null,
      });
      setForm(emptyForm);
      setShowForm(false);
      load(true);
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Pronostics</Text>
        <Button
          variant={showForm ? "secondary" : "primary"}
          onPress={() => { setShowForm((v) => !v); setFormError(""); }}
        >
          {showForm ? "Annuler" : "+ Nouveau"}
        </Button>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {showForm && (
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Nouveau pronostic</Text>
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <TextInput
              placeholder="Titre"
              style={styles.input}
              value={form.titre}
              onChangeText={(v) => setForm((p) => ({ ...p, titre: v }))}
            />
            <TextInput
              placeholder="Prédiction"
              style={styles.input}
              value={form.prediction}
              onChangeText={(v) => setForm((p) => ({ ...p, prediction: v }))}
            />
            <TextInput
              placeholder="Description (optionnel)"
              style={styles.input}
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
            />
            <TextInput
              placeholder="Cote (optionnel)"
              style={styles.input}
              keyboardType="decimal-pad"
              value={form.cote}
              onChangeText={(v) => setForm((p) => ({ ...p, cote: v }))}
            />
            <Button onPress={handleCreate}>Publier</Button>
          </Card>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}
        >
          {STATUTS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterBtn, statut === s && styles.filterBtnActive]}
              onPress={() => setStatut(s)}
            >
              <Text style={[styles.filterBtnText, statut === s && styles.filterBtnTextActive]}>
                {s === "" ? "Tous" : statutLabel(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error && !showForm ? <Text style={styles.error}>{error}</Text> : null}

        {pronostics.map((p) => (
          <Card key={p.id} onPress={() => onSelect(p)}>
            <View style={styles.pronosticHeader}>
              <Text style={styles.pronosticTitre} numberOfLines={1}>
                {p.titre}
              </Text>
              <View style={[styles.badge, { backgroundColor: statutColor(p.statut) }]}>
                <Text style={styles.badgeText}>{statutLabel(p.statut)}</Text>
              </View>
            </View>
            <Text style={styles.prediction}>"{p.prediction}"</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>par {p.auteur}</Text>
              {p.cote ? <Text style={styles.metaText}>Cote : {p.cote}</Text> : null}
              <Text style={styles.metaText}>{formatDate(p.created_at)}</Text>
            </View>
          </Card>
        ))}

        {pronostics.length === 0 && !loading && (
          <Text style={styles.empty}>Aucun pronostic.</Text>
        )}

        {loading && <ActivityIndicator style={styles.loader} />}

        {hasMore && !loading && (
          <View style={styles.centerBtn}>
            <Button onPress={() => load(false)} variant="secondary">
              Voir plus
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  formCard: {
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  filterBar: {
    marginBottom: 12,
  },
  filterBarContent: {
    gap: 8,
    paddingBottom: 4,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  filterBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterBtnText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  filterBtnTextActive: {
    color: "#ffffff",
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    marginBottom: 8,
  },
  pronosticHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pronosticTitre: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  prediction: {
    fontSize: 13,
    color: "#475569",
    fontStyle: "italic",
    marginBottom: 8,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  empty: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 24,
    fontSize: 14,
  },
  loader: {
    marginVertical: 16,
  },
  centerBtn: {
    alignItems: "center",
    marginVertical: 12,
  },
});
