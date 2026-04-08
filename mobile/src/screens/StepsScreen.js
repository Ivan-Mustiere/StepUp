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
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { syncSteps, getTodaySteps } from "../api/api";
import Button from "../components/Button";

const MAX_GEMS_PAR_JOUR = 20;
const GOAL = 10000;

// ─── Speedometer SVG ────────────────────────────────────────────────────────

const SIZE = 280;
const CX = SIZE / 2;
const CY = SIZE / 2 + 10;
const R_OUTER = 118;
const R_INNER = 90;
const STROKE = R_OUTER - R_INNER; // 28
const START_ANGLE = 150;  // degrees  (bottom-left)
const END_ANGLE   = 390;  // degrees  (bottom-right), span = 240°

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function polarXY(cx, cy, r, angleDeg) {
  const rad = degToRad(angleDeg);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const s = polarXY(cx, cy, r, startDeg);
  const e = polarXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function ringPath(cx, cy, rOuter, rInner, startDeg, endDeg) {
  const so = polarXY(cx, cy, rOuter, startDeg);
  const eo = polarXY(cx, cy, rOuter, endDeg);
  const si = polarXY(cx, cy, rInner, endDeg);
  const ei = polarXY(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${so.x} ${so.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${eo.x} ${eo.y}`,
    `L ${si.x} ${si.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${ei.x} ${ei.y}`,
    "Z",
  ].join(" ");
}

function fillColor(progress) {
  if (progress >= 1)    return "#16a34a"; // vert (objectif atteint)
  if (progress >= 0.7)  return "#f59e0b"; // orange
  if (progress >= 0.4)  return "#2563eb"; // bleu
  return "#6366f1";                        // indigo (début)
}

// Ticks aux jalons 0 / 2500 / 5000 / 7500 / 10000
const MILESTONES = [0, 2500, 5000, 7500, 10000];

function Speedometer({ steps }) {
  const progress = Math.min(steps / GOAL, 1);
  const fillEnd = START_ANGLE + progress * (END_ANGLE - START_ANGLE);
  const color = fillColor(progress);

  // Aiguille
  const needleAngle = START_ANGLE + progress * (END_ANGLE - START_ANGLE);
  const needleTip = polarXY(CX, CY, R_INNER - 6, needleAngle);
  const needleBase1 = polarXY(CX, CY, 12, needleAngle + 90);
  const needleBase2 = polarXY(CX, CY, 12, needleAngle - 90);

  return (
    <Svg width={SIZE} height={SIZE - 20} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Defs>
        <LinearGradient id="fillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#6366f1" />
          <Stop offset="50%" stopColor="#2563eb" />
          <Stop offset="80%" stopColor="#f59e0b" />
          <Stop offset="100%" stopColor="#16a34a" />
        </LinearGradient>
      </Defs>

      {/* Piste grise */}
      <Path
        d={ringPath(CX, CY, R_OUTER, R_INNER, START_ANGLE, END_ANGLE)}
        fill="#e2e8f0"
      />

      {/* Remplissage coloré */}
      {progress > 0 && (
        <Path
          d={ringPath(CX, CY, R_OUTER, R_INNER, START_ANGLE, fillEnd)}
          fill="url(#fillGrad)"
        />
      )}

      {/* Ticks jalons */}
      {MILESTONES.map((m) => {
        const pct = m / GOAL;
        const tickAngle = START_ANGLE + pct * (END_ANGLE - START_ANGLE);
        const inner = polarXY(CX, CY, R_INNER - 10, tickAngle);
        const outer = polarXY(CX, CY, R_OUTER + 6, tickAngle);
        const label = polarXY(CX, CY, R_OUTER + 18, tickAngle);
        const reached = steps >= m;
        return (
          <React.Fragment key={m}>
            <Path
              d={`M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`}
              stroke={reached ? color : "#94a3b8"}
              strokeWidth={m % 5000 === 0 ? 2.5 : 1.5}
            />
            {m % 5000 === 0 && (
              <SvgText
                x={label.x}
                y={label.y + 4}
                textAnchor="middle"
                fontSize={10}
                fill={reached ? "#0f172a" : "#94a3b8"}
                fontWeight="600"
              >
                {m === 0 ? "0" : `${m / 1000}k`}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}

      {/* Aiguille */}
      <Path
        d={`M ${needleBase1.x} ${needleBase1.y} L ${needleTip.x} ${needleTip.y} L ${needleBase2.x} ${needleBase2.y} Z`}
        fill={color}
        opacity={0.9}
      />
      {/* Centre aiguille */}
      <Circle cx={CX} cy={CY} r={10} fill="#0f172a" />
      <Circle cx={CX} cy={CY} r={5} fill="#ffffff" />

      {/* Pas (centre) */}
      <SvgText
        x={CX}
        y={CY - 18}
        textAnchor="middle"
        fontSize={44}
        fontWeight="800"
        fill="#0f172a"
      >
        {steps.toLocaleString("fr-FR")}
      </SvgText>
      <SvgText
        x={CX}
        y={CY + 10}
        textAnchor="middle"
        fontSize={15}
        fill="#64748b"
        fontWeight="500"
      >
        pas
      </SvgText>

      {/* Objectif en bas */}
      <SvgText
        x={CX}
        y={CY + 58}
        textAnchor="middle"
        fontSize={12}
        fill="#94a3b8"
      >
        objectif {GOAL.toLocaleString("fr-FR")} pas
      </SvgText>
    </Svg>
  );
}

// ─── Écran principal ─────────────────────────────────────────────────────────

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
        subscriptionRef.current = Pedometer.watchStepCount((r) => {
          setLiveSteps((prev) => prev + r.steps);
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

  const pas = pedometerAvailable ? liveSteps : (stepsData?.pas_aujourd_hui ?? 0);
  const gemsAujourdhui = stepsData?.gems_gagnes_aujourd_hui ?? 0;
  const totalGems = profile?.gems ?? stepsData?.total_gems ?? 0;
  const prochainGemDans = stepsData?.prochain_gem_dans ?? 1000;
  const progressGem = Math.min(((1000 - prochainGemDans) / 1000) * 100, 100);
  const gemsPlafond = gemsAujourdhui >= MAX_GEMS_PAR_JOUR;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

      {/* Speedomètre */}
      <View style={styles.speedo}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ height: SIZE - 20 }} />
        ) : (
          <Speedometer steps={pas} />
        )}
      </View>

      {/* Gems du jour */}
      <View style={styles.gemsRow}>
        <View style={styles.gemsBadge}>
          <Text style={styles.gemsBadgeIcon}>💎</Text>
          <Text style={styles.gemsBadgeValue}>{totalGems}</Text>
          <Text style={styles.gemsBadgeLabel}>total</Text>
        </View>
        <View style={styles.gemsDivider} />
        <View style={styles.gemsBadge}>
          <Text style={styles.gemsBadgeIcon}>🏆</Text>
          <Text style={styles.gemsBadgeValue}>{gemsAujourdhui}/{MAX_GEMS_PAR_JOUR}</Text>
          <Text style={styles.gemsBadgeLabel}>aujourd'hui</Text>
        </View>
      </View>

      {/* Barre prochain gem */}
      {!gemsPlafond && !loading && (
        <View style={styles.nextGemCard}>
          <View style={styles.nextGemHeader}>
            <Text style={styles.nextGemLabel}>Prochain 💎 dans</Text>
            <Text style={styles.nextGemCount}>{prochainGemDans} pas</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressGem}%` }]} />
          </View>
        </View>
      )}
      {gemsPlafond && (
        <View style={styles.plafondCard}>
          <Text style={styles.plafondText}>🏆 Plafond journalier atteint ({MAX_GEMS_PAR_JOUR} gems) !</Text>
        </View>
      )}

      {/* Messages */}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      {error   ? <Text style={styles.error}>{error}</Text>   : null}

      {/* Synchronisation */}
      <View style={styles.syncCard}>
        {pedometerAvailable ? (
          <>
            <Text style={styles.syncTitle}>Pédomètre détecté</Text>
            <Text style={styles.syncSub}>{liveSteps.toLocaleString("fr-FR")} pas enregistrés</Text>
            <TouchableOpacity
              style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
              onPress={() => handleSync(liveSteps)}
              disabled={syncing}
            >
              <Text style={styles.syncBtnText}>
                {syncing ? "Synchronisation…" : "Synchroniser mes pas"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.syncTitle}>
              {Platform.OS === "web" ? "Mode web" : "Entrez vos pas"}
            </Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.input}
                placeholder="Ex : 8 500"
                keyboardType="number-pad"
                value={manualSteps}
                onChangeText={setManualSteps}
              />
              <TouchableOpacity
                style={[styles.syncBtn, styles.syncBtnSmall, syncing && styles.syncBtnDisabled]}
                onPress={handleManualSync}
                disabled={syncing}
              >
                <Text style={styles.syncBtnText}>{syncing ? "…" : "Sync"}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.shortcutsRow}>
              {[1000, 3000, 5000, 10000].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={styles.shortcut}
                  onPress={() => handleSync(n)}
                  disabled={syncing}
                >
                  <Text style={styles.shortcutText}>{n >= 1000 ? `${n / 1000}k` : n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Barème */}
      <View style={styles.bareme}>
        <Text style={styles.baremeTitle}>Barème</Text>
        <View style={styles.baremeGrid}>
          {[1000, 2000, 5000, 10000, 15000, 20000].map((seuil) => {
            const gems = seuil / 1000;
            const atteint = pas >= seuil;
            return (
              <View key={seuil} style={[styles.baremeItem, atteint && styles.baremeItemActive]}>
                <Text style={[styles.baremeSteps, atteint && styles.baremeTextActive]}>
                  {seuil >= 1000 ? `${seuil / 1000} 000` : seuil}
                </Text>
                <Text style={styles.baremeArrow}>{atteint ? "✓" : "→"}</Text>
                <Text style={[styles.baremeGems, atteint && styles.baremeTextActive]}>
                  {gems} 💎
                </Text>
              </View>
            );
          })}
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { paddingBottom: 32 },

  speedo: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  gemsRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  gemsBadge: { flex: 1, alignItems: "center" },
  gemsBadgeIcon: { fontSize: 22, marginBottom: 2 },
  gemsBadgeValue: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  gemsBadgeLabel: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  gemsDivider: { width: 1, height: 40, backgroundColor: "#e2e8f0" },

  nextGemCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  nextGemHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  nextGemLabel: { fontSize: 13, color: "#475569", fontWeight: "500" },
  nextGemCount: { fontSize: 13, color: "#2563eb", fontWeight: "700" },
  progressTrack: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 4,
  },

  plafondCard: {
    backgroundColor: "#f0fdf4",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  plafondText: { fontSize: 13, color: "#16a34a", fontWeight: "600" },

  success: { color: "#16a34a", fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 10 },
  error:   { color: "#dc2626", fontSize: 13, textAlign: "center", marginTop: 10, marginHorizontal: 16 },

  syncCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  syncTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  syncSub:   { fontSize: 13, color: "#64748b", marginBottom: 12 },
  syncBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  syncBtnSmall: { paddingHorizontal: 18, paddingVertical: 13 },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },

  manualRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f8fafc",
  },

  shortcutsRow: { flexDirection: "row", gap: 8 },
  shortcut: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
    alignItems: "center",
  },
  shortcutText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },

  bareme: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  baremeTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  baremeGrid: { gap: 6 },
  baremeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  baremeItemActive: { backgroundColor: "#f0fdf4" },
  baremeSteps: { fontSize: 13, color: "#475569", fontWeight: "500", flex: 1 },
  baremeArrow: { fontSize: 13, color: "#cbd5e1", marginHorizontal: 8 },
  baremeGems:  { fontSize: 13, color: "#475569", fontWeight: "600" },
  baremeTextActive: { color: "#16a34a", fontWeight: "700" },
});
