import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Card from "../components/Card";
import Button from "../components/Button";
import { formatDate, statutLabel, statutColor } from "../utils/helpers";

export default function DetailScreen({ pronostic, onBack }) {
  if (!pronostic) return null;

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <Button onPress={onBack} variant="secondary">← Retour</Button>
        <Text style={styles.screenTitle}>Détail</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.titleRow}>
            <Text style={styles.titre}>{pronostic.titre}</Text>
            <View style={[styles.badge, { backgroundColor: statutColor(pronostic.statut) }]}>
              <Text style={styles.badgeText}>{statutLabel(pronostic.statut)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Prédiction</Text>
            <Text style={styles.value}>"{pronostic.prediction}"</Text>
          </View>

          {pronostic.description ? (
            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.value}>{pronostic.description}</Text>
            </View>
          ) : null}

          {pronostic.cote ? (
            <View style={styles.section}>
              <Text style={styles.label}>Cote</Text>
              <Text style={styles.value}>{pronostic.cote}</Text>
            </View>
          ) : null}

          <View style={styles.meta}>
            <Text style={styles.metaText}>Auteur : {pronostic.auteur}</Text>
            <Text style={styles.metaText}>Publié le {formatDate(pronostic.created_at)}</Text>
          </View>
        </Card>
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
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  placeholder: {
    width: 70,
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  titre: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
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
  section: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    color: "#334155",
  },
  meta: {
    marginTop: 16,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  metaText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
