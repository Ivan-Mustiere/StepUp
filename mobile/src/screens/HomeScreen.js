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
import { colors, fontSize, spacing, radius } from "../styles";

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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  screenTitle: {
    fontSize: fontSize.xl3,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  formCard: {
    marginBottom: spacing.md,
    gap: 10,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    backgroundColor: colors.bgWhite,
    marginBottom: spacing.sm,
  },
  filterBar: {
    marginBottom: spacing.md,
  },
  filterBarContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  filterBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.bgLight,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: "500",
  },
  filterBtnTextActive: {
    color: colors.white,
  },
  error: {
    color: colors.error,
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  pronosticHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pronosticTitre: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.lg,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.white,
  },
  prediction: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
  },
  empty: {
    textAlign: "center",
    color: colors.textPlaceholder,
    marginTop: spacing.xl3,
    fontSize: fontSize.base,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  centerBtn: {
    alignItems: "center",
    marginVertical: spacing.md,
  },
});
