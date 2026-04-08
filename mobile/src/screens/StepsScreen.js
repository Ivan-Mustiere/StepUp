import { Pedometer } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { syncSteps, getTodaySteps } from "../api/api";
import Card from "../components/Card";
import Button from "../components/Button";

const MAX_GEMS_PAR_JOUR = 20;

export default function StepsScreen({ profile, onRefreshProfile }) {
  const [stepsData, setStepsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pedometerAvailable, setPedometerAvailable] = useState(false);
  const [liveSteps, setLiveSteps] = useState(0);
  const [manualSteps, setManualSteps] = useState("");
  const subscriptionRef = useRef(null);

  useEffect(() => {
    loadData();
    initPedometer();
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.remove();
    };
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getTodaySteps();
      setStepsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function initPedometer() {
    if (Platform.OS === "web") return;
    try {
      const available = await Pedometer.isAvailableAsync();
      setPedometerAvailable(available);
      if (available) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, new Date());
        setLiveSteps(result.steps);

        subscriptionRef.current = Pedometer.watchStepCount((result) => {
          setLiveSteps((prev) => prev + result.steps);
        });
      }
    } catch (_) {}
  }

  async function handleSync(steps) {
    setSyncing(true);
    setError("");
    setSuccess("");
    try {
      const data = await syncSteps(steps);
      setStepsData(data);
      if (data.nouveaux_gems > 0) {
        setSuccess(`+${data.nouveaux_gems} 💎 gagné${data.nouveaux_gems > 1 ? "s" : ""} !`);
      } else {
        setSuccess("Pas synchronisés !");
      }
      await onRefreshProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleManualSync() {
    const n = parseInt(manualSteps, 10);
    if (!n || n <= 0) {
      setError("Entrez un nombre de pas valide.");
      return;
    }
    setManualSteps("");
    await handleSync(n);
  }

  const pas = stepsData?.pas_aujourd_hui ?? 0;
  const gemsAujourdhui = stepsData?.gems_gagnes_aujourd_hui ?? 0;
  const totalGems = profile?.gems ?? stepsData?.total_gems ?? 0;
  const prochainGemDans = stepsData?.prochain_gem_dans ?? 1000;
  const progressPercent = Math.min(((1000 - prochainGemDans) / 1000) * 100, 100);
  const gemsPlafond = gemsAujourdhui >= MAX_GEMS_PAR_JOUR;

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Gems total */}
        <Card style={styles.gemsCard}>
          <Text style={styles.gemsEmoji}>💎</Text>
          <Text style={styles.gemsValue}>{totalGems}</Text>
          <Text style={styles.gemsLabel}>Gems disponibles</Text>
          <Text style={styles.gemsHint}>1 💎 requis pour parier · 1 💎 = 1 000 pas</Text>
        </Card>

        {/* Aujourd'hui */}
        <Card>
          <Text style={styles.sectionTitle}>Aujourd'hui</Text>

          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <>
              <View style={styles.stepsRow}>
                <Text style={styles.stepsValue}>{pas.toLocaleString("fr-FR")}</Text>
                <Text style={styles.stepsUnit}>pas</Text>
              </View>

              <View style={styles.gemsRow}>
                <Text style={styles.gemsToday}>
                  💎 {gemsAujourdhui} / {MAX_GEMS_PAR_JOUR} gems gagnés aujourd'hui
                </Text>
              </View>

              {!gemsPlafond && (
                <>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>
                    Encore {prochainGemDans} pas pour le prochain 💎
                  </Text>
                </>
              )}

              {gemsPlafond && (
                <Text style={styles.plafondLabel}>
                  🏆 Plafond journalier atteint ({MAX_GEMS_PAR_JOUR} gems) !
                </Text>
              )}
            </>
          )}

          {success ? <Text style={styles.success}>{success}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ marginTop: 16 }}>
            {pedometerAvailable ? (
              <Button onPress={() => handleSync(liveSteps)} disabled={syncing}>
                {syncing ? "Synchronisation..." : `Synchroniser (${liveSteps.toLocaleString("fr-FR")} pas détectés)`}
              </Button>
            ) : (
              <>
                <Text style={styles.simulLabel}>
                  {Platform.OS === "web"
                    ? "Mode web — entrez vos pas manuellement :"
                    : "Pédomètre non disponible — entrez vos pas :"}
                </Text>
                <View style={styles.manualRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Ex : 8500"
                    keyboardType="number-pad"
                    value={manualSteps}
                    onChangeText={setManualSteps}
                  />
                  <Button onPress={handleManualSync} disabled={syncing}>
                    {syncing ? "..." : "Sync"}
                  </Button>
                </View>

                {/* Raccourcis rapides */}
                <View style={styles.shortcutsRow}>
                  {[1000, 3000, 5000, 10000].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={styles.shortcut}
                      onPress={() => handleSync(n)}
                    >
                      <Text style={styles.shortcutText}>{n >= 1000 ? `${n / 1000}k` : n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </Card>

        {/* Barème */}
        <Card>
          <Text style={styles.sectionTitle}>Barème</Text>
          {[1000, 2000, 5000, 10000, 15000, 20000].map((seuil) => {
            const gems = seuil / 1000;
            const atteint = pas >= seuil;
            return (
              <View key={seuil} style={[styles.seuilRow, atteint && styles.seuilAtteint]}>
                <Text style={[styles.seuilSteps, atteint && styles.seuilAtteintText]}>
                  {seuil >= 1000 ? `${seuil / 1000} 000` : seuil} pas
                </Text>
                <Text style={[styles.seuilGems, atteint && styles.seuilAtteintText]}>
                  {atteint ? "✓ " : ""}{gems} 💎
                </Text>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  screenTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  scroll: { flex: 1, padding: 16 },
  gemsCard: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 12,
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  gemsEmoji: { fontSize: 40, marginBottom: 4 },
  gemsValue: { fontSize: 48, fontWeight: "800", color: "#0f172a" },
  gemsLabel: { fontSize: 14, color: "#64748b", marginTop: 4 },
  gemsHint: { fontSize: 12, color: "#94a3b8", marginTop: 6, textAlign: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  stepsRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 8 },
  stepsValue: { fontSize: 48, fontWeight: "800", color: "#0f172a" },
  stepsUnit: { fontSize: 18, color: "#64748b" },
  gemsRow: { marginBottom: 10 },
  gemsToday: { fontSize: 14, color: "#475569", fontWeight: "500" },
  progressBar: {
    height: 10,
    backgroundColor: "#e2e8f0",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 5,
  },
  progressLabel: { fontSize: 12, color: "#94a3b8", marginBottom: 4 },
  plafondLabel: { fontSize: 13, color: "#16a34a", fontWeight: "600", marginBottom: 4 },
  success: { color: "#16a34a", fontSize: 13, fontWeight: "600", marginTop: 8 },
  error: { color: "#dc2626", fontSize: 13, marginTop: 8 },
  loader: { marginVertical: 12 },
  simulLabel: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  manualRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  shortcutsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  shortcut: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  shortcutText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
  seuilRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  seuilAtteint: { backgroundColor: "#f0fdf4", borderRadius: 6, paddingHorizontal: 8 },
  seuilSteps: { fontSize: 14, color: "#475569" },
  seuilGems: { fontSize: 14, color: "#475569", fontWeight: "500" },
  seuilAtteintText: { color: "#16a34a", fontWeight: "600" },
});
