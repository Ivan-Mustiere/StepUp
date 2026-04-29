import { Pedometer } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Images } from "../assets/images";
import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { syncSteps, getTodaySteps } from "../api/api";
import Button from "../components/Button";
import { colors, fontSize, spacing, radius, shadow } from "../styles";

const MAX_GEMS_PAR_JOUR = 20;
const GOAL = 10000;

// ─── Speedometer SVG ────────────────────────────────────────────────────────

const SIZE = 340;
const CX = SIZE / 2;
const CY = SIZE / 2 + 10;
const R_OUTER = 148;
const R_INNER = 112;
const START_ANGLE = 150;
const END_ANGLE   = 390;

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

const MILESTONES = [0, 2500, 5000, 7500, 10000];

function Speedometer({ steps }) {
  const progress = Math.min(steps / GOAL, 1);
  const fillEnd = START_ANGLE + progress * (END_ANGLE - START_ANGLE);

  return (
  <View style={{ alignSelf: "center" }}>
    <View style={{ width: SIZE, height: SIZE - 20 }}>
    <Svg width={SIZE} height={SIZE - 20} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Defs />

      {/* Piste grise */}
      <Path
        d={ringPath(CX, CY, R_OUTER, R_INNER, START_ANGLE, END_ANGLE)}
        fill={colors.borderLight}
      />

      {/* Remplissage coloré */}
      {progress > 0 && (
        <Path
          d={ringPath(CX, CY, R_OUTER, R_INNER, START_ANGLE, fillEnd)}
          fill={colors.primary}
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
              stroke={reached ? colors.primary : colors.textPlaceholder}
              strokeWidth={m % 5000 === 0 ? 2.5 : 1.5}
            />
            {m % 5000 === 0 && (
              <SvgText
                x={label.x}
                y={label.y + 4}
                textAnchor="middle"
                fontSize={10}
                fill={reached ? colors.textPrimary : colors.textPlaceholder}
                fontWeight="600"
              >
                {m === 0 ? "0" : `${m / 1000}k`}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}


    </Svg>

    {/* Logo XP + pas en overlay absolu centré */}
    <View style={{
      position: "absolute",
      top: Math.round(CY * (SIZE - 20) / SIZE) - 80,
      left: 0, right: 0,
      alignItems: "center",
    }}>
      <Image source={Images.xp} style={{ width: 130, height: 130, resizeMode: "contain" }} />
      <Text style={{
        fontSize: 38,
        fontWeight: "800",
        color: colors.textPrimary,
        letterSpacing: 1,
        marginTop: 2,
      }}>
        {steps.toLocaleString("fr-FR")}
      </Text>
      <Text style={{
        fontSize: 13,
        color: colors.textSubtle,
        marginTop: 2,
      }}>
        pas / objectif {GOAL.toLocaleString("fr-FR")}
      </Text>
    </View>
    </View>
  </View>
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
          <ActivityIndicator size="large" color={colors.primary} style={{ height: SIZE - 20 }} />
        ) : (
          <Speedometer steps={pas} />
        )}
      </View>

      {/* Gems du jour */}
      <View style={styles.gemsRow}>
        <View style={styles.gemsBadge}>
          <Image source={Images.gemme} style={styles.gemsBadgeIcon} />
          <Text style={styles.gemsBadgeValue}>{totalGems}</Text>
          <Text style={styles.gemsBadgeLabel}>total</Text>
        </View>
        <View style={styles.gemsDivider} />
        <View style={styles.gemsBadge}>
          <Image source={Images.cup} style={styles.gemsBadgeIcon} />
          <Text style={styles.gemsBadgeValue}>{gemsAujourdhui}/{MAX_GEMS_PAR_JOUR}</Text>
          <Text style={styles.gemsBadgeLabel}>aujourd'hui</Text>
        </View>
      </View>

      {/* Barre prochain gem */}
      {!gemsPlafond && !loading && (
        <View style={styles.nextGemCard}>
          <View style={styles.nextGemHeader}>
            <View style={styles.nextGemLabelRow}>
              <Text style={styles.nextGemLabel}>Prochain </Text>
              <Image source={Images.gemme} style={styles.nextGemIcon} />
            </View>
            <Text style={styles.nextGemCount}>{prochainGemDans} pas</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressGem}%` }]} />
          </View>
        </View>
      )}
      {gemsPlafond && (
        <View style={styles.plafondCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Image source={Images.cup} style={{ width: 18, height: 18, resizeMode: "contain" }} />
            <Text style={styles.plafondText}>Plafond journalier atteint ({MAX_GEMS_PAR_JOUR} gems) !</Text>
          </View>
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
                <View style={styles.baremeGemsRow}>
                  <Text style={[styles.baremeGems, atteint && styles.baremeTextActive]}>{gems} </Text>
                  <Image source={Images.gemme} style={styles.baremeGemIcon} />
                </View>
              </View>
            );
          })}
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: colors.bgLight },
  scrollContent: { paddingBottom: spacing.xl4 },

  speedo: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.xs,
    backgroundColor: colors.bgWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSubtle,
  },

  gemsRow: {
    flexDirection: "row",
    backgroundColor: colors.bgWhite,
    marginTop: spacing.md,
    marginHorizontal: spacing.xl,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    ...shadow.sm,
  },
  gemsBadge:      { flex: 1, alignItems: "center" },
  gemsBadgeIcon:  { width: 36, height: 36, resizeMode: "contain", marginBottom: 2 },
  gemsBadgeValue: { fontSize: fontSize.xl4, fontWeight: "800", color: colors.textPrimary },
  gemsBadgeLabel: { fontSize: fontSize.xs, color: colors.textPlaceholder, marginTop: 2 },
  gemsDivider:    { width: 1, height: 40, backgroundColor: colors.borderLight },

  nextGemCard: {
    backgroundColor: colors.bgWhite,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.sm,
  },
  nextGemHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  nextGemLabel:  { fontSize: fontSize.md, color: colors.textMuted, fontWeight: "500" },
  nextGemCount:  { fontSize: fontSize.md, color: colors.primary, fontWeight: "700" },
  progressTrack: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: radius.xs,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.xs,
  },

  plafondCard: {
    backgroundColor: colors.successBg,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  plafondText: { fontSize: fontSize.md, color: colors.success, fontWeight: "600" },

  success: { color: colors.success, fontSize: fontSize.md, fontWeight: "600", textAlign: "center", marginTop: 10 },
  error:   { color: colors.error,   fontSize: fontSize.md, textAlign: "center", marginTop: 10, marginHorizontal: spacing.xl },

  syncCard: {
    backgroundColor: colors.bgWhite,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.sm,
  },
  syncTitle: { fontSize: fontSize.base, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.xs },
  syncSub:   { fontSize: fontSize.md, color: colors.textSubtle, marginBottom: spacing.md },
  syncBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 13,
    alignItems: "center",
  },
  syncBtnSmall:    { paddingHorizontal: 18, paddingVertical: 13 },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText:     { color: colors.white, fontSize: fontSize.lg, fontWeight: "700" },

  manualRow: { flexDirection: "row", gap: spacing.sm, marginBottom: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    backgroundColor: colors.bgLight,
  },

  shortcutsRow: { flexDirection: "row", gap: spacing.sm },
  shortcut: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
  },
  shortcutText: { fontSize: fontSize.md, color: colors.primary, fontWeight: "600" },

  bareme: {
    backgroundColor: colors.bgWhite,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.sm,
  },
  baremeTitle: { fontSize: fontSize.base, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.md },
  baremeGrid:  { gap: 6 },
  baremeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgLight,
  },
  baremeItemActive:  { backgroundColor: colors.successBg },
  baremeSteps:       { fontSize: fontSize.md, color: colors.textMuted, fontWeight: "500", flex: 1 },
  baremeArrow:       { fontSize: fontSize.md, color: colors.borderMedium, marginHorizontal: spacing.sm },
  baremeGems:        { fontSize: fontSize.md, color: colors.textMuted, fontWeight: "600" },
  baremeGemsRow:     { flexDirection: "row", alignItems: "center" },
  baremeGemIcon:     { width: 14, height: 14, resizeMode: "contain" },
  baremeTextActive:  { color: colors.success, fontWeight: "700" },
  nextGemLabelRow:   { flexDirection: "row", alignItems: "center" },
  nextGemIcon:       { width: 14, height: 14, resizeMode: "contain", marginHorizontal: 2 },
});
