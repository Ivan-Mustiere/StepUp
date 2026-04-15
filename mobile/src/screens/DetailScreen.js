import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Card from "../components/Card";
import Button from "../components/Button";
import { formatDate, statutLabel, statutColor } from "../utils/helpers";
import { colors, fontSize, spacing, radius } from "../styles";

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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  screenTitle: {
    fontSize: fontSize.xl2,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  placeholder: {
    width: 70,
  },
  scroll: {
    flex: 1,
    padding: spacing.xl,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  titre: {
    fontSize: fontSize.xl2,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
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
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textPlaceholder,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  meta: {
    marginTop: spacing.xl,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.bgSubtle,
    paddingTop: spacing.md,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
  },
});
