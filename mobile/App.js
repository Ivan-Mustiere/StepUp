import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Images } from "./src/assets/images";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/styles/colors";
import {
  dailyReward,
  getMyProfile,
  initAuthTokens,
  login,
  logout,
  register,
} from "./src/api/api";
import AppNavigator from "./src/navigation/AppNavigator";

const PAYS = [
  { label: "France", flag: "🇫🇷" },
  { label: "États-Unis", flag: "🇺🇸" },
  { label: "Royaume-Uni", flag: "🇬🇧" },
  { label: "Allemagne", flag: "🇩🇪" },
  { label: "Espagne", flag: "🇪🇸" },
  { label: "Italie", flag: "🇮🇹" },
];

const initialRegisterForm = {
  pseudo: "",
  email: "",
  password: "",
  age: "",
  genre: "",
  pays: "",
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [profile, setProfile] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [error, setError] = useState("");
  const [rewardData, setRewardData] = useState(null);

  const title = useMemo(
    () => (isLoginMode ? "Connexion" : "Inscription"),
    [isLoginMode]
  );

  useEffect(() => {
    (async () => {
      try {
        await initAuthTokens();
        const me = await getMyProfile();
        setProfile(me);
        claimDailyReward();
      } catch (_) {
        // Pas de session active.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function claimDailyReward() {
    try {
      const result = await dailyReward();
      if (!result.already_claimed) {
        setRewardData(result);
      }
    } catch (_) {}
  }

  async function onLogin() {
    setError("");
    setLoading(true);
    try {
      await login(loginForm);
      const me = await getMyProfile();
      setProfile(me);
      claimDailyReward();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function onRegister() {
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...registerForm,
        age: registerForm.age ? Number(registerForm.age) : null,
      };
      await register(payload);
      await login({ email: registerForm.email, password: registerForm.password });
      const me = await getMyProfile();
      setProfile(me);
      setRegisterForm(initialRegisterForm);
      claimDailyReward();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    setLoading(true);
    try {
      await logout();
      setProfile(null);
      setError("");
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    try {
      const me = await getMyProfile();
      setProfile(me);
    } catch (_) {}
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (profile) {
    return (
      <>
        <StatusBar style="dark" />
        <AppNavigator
          profile={profile}
          onLogout={onLogout}
          onRefreshProfile={refreshProfile}
        />
        <Modal
          visible={!!rewardData}
          transparent
          animationType="fade"
          onRequestClose={() => setRewardData(null)}
        >
          <View style={styles.rewardOverlay}>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardTitle}>Récompense journalière 🎁</Text>
              <View style={styles.rewardCoinsRow}>
                <Text style={styles.rewardCoins}>+{rewardData?.coins_gagnes}</Text>
                <Image source={Images.coin} style={styles.rewardIcon} />
              </View>
              <Text style={styles.rewardStreak}>
                🔥 Streak : {rewardData?.strick} jour{rewardData?.strick > 1 ? "s" : ""}
              </Text>
              <View style={styles.rewardTotalRow}>
                <Text style={styles.rewardTotal}>Total : {rewardData?.coins_total}</Text>
                <Image source={Images.coin} style={styles.rewardIconSm} />
              </View>
              <TouchableOpacity
                style={styles.rewardBtn}
                onPress={() => { setRewardData(null); refreshProfile(); }}
              >
                <Text style={styles.rewardBtnText}>Super !</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>StepUp</Text>

        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[styles.switchBtn, isLoginMode && styles.switchBtnActive]}
            onPress={() => { setIsLoginMode(true); setError(""); }}
          >
            <Text style={[styles.switchBtnText, isLoginMode && styles.switchBtnTextActive]}>
              Connexion
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, !isLoginMode && styles.switchBtnActive]}
            onPress={() => { setIsLoginMode(false); setError(""); }}
          >
            <Text style={[styles.switchBtnText, !isLoginMode && styles.switchBtnTextActive]}>
              Inscription
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.h2}>{title}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isLoginMode ? (
          <View style={styles.form}>
            <TextInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              value={loginForm.email}
              onChangeText={(v) => setLoginForm((p) => ({ ...p, email: v }))}
            />
            <TextInput
              placeholder="Mot de passe"
              secureTextEntry
              style={styles.input}
              value={loginForm.password}
              onChangeText={(v) => setLoginForm((p) => ({ ...p, password: v }))}
            />
            <TouchableOpacity style={styles.btn} onPress={onLogin}>
              <Text style={styles.btnText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              placeholder="Pseudo"
              autoCapitalize="none"
              style={styles.input}
              value={registerForm.pseudo}
              onChangeText={(v) => setRegisterForm((p) => ({ ...p, pseudo: v }))}
            />
            <TextInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              value={registerForm.email}
              onChangeText={(v) => setRegisterForm((p) => ({ ...p, email: v }))}
            />
            <TextInput
              placeholder="Mot de passe"
              secureTextEntry
              style={styles.input}
              value={registerForm.password}
              onChangeText={(v) => setRegisterForm((p) => ({ ...p, password: v }))}
            />
            <TextInput
              placeholder="Age"
              keyboardType="number-pad"
              style={styles.input}
              value={registerForm.age}
              onChangeText={(v) => setRegisterForm((p) => ({ ...p, age: v }))}
            />
            <View style={styles.selectRow}>
              {["homme", "femme", "autre"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.selectOption, registerForm.genre === g && styles.selectOptionActive]}
                  onPress={() => setRegisterForm((p) => ({ ...p, genre: g }))}
                >
                  <Text style={[styles.selectOptionText, registerForm.genre === g && styles.selectOptionTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Pays</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {PAYS.map(({ label, flag }) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.chip, registerForm.pays === label && styles.chipActive]}
                  onPress={() => setRegisterForm((prev) => ({ ...prev, pays: label }))}
                >
                  <Text style={[styles.chipText, registerForm.pays === label && styles.chipTextActive]}>
                    {label} {flag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btn} onPress={onRegister}>
              <Text style={styles.btnText}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgWhite,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgWhite,
  },
  scroll: {
    padding: 24,
  },
  h1: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 24,
    marginTop: 16,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  switchRow: {
    flexDirection: "row",
    backgroundColor: colors.bgSubtle,
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  switchBtnActive: {
    backgroundColor: colors.bgLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  switchBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPlaceholder,
  },
  switchBtnTextActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: colors.bgLight,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  selectRow: {
    flexDirection: "row",
    gap: 8,
  },
  selectOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    alignItems: "center",
    backgroundColor: colors.bgLight,
  },
  selectOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectOptionText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  selectOptionTextActive: {
    color: colors.white,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: colors.error,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSubtle,
    marginBottom: 6,
  },
  chipsScroll: {
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.bgLight,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.white,
  },
  rewardOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardCard: {
    backgroundColor: colors.bgLight,
    borderRadius: 20,
    padding: 32,
    width: "80%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  rewardCoinsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  rewardTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 24,
  },
  rewardIcon: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  rewardIconSm: {
    width: 16,
    height: 16,
    resizeMode: "contain",
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  rewardCoins: {
    fontSize: 42,
    fontWeight: "800",
    color: "#f59e0b",
    marginBottom: 8,
  },
  rewardStreak: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 4,
  },
  rewardTotal: {
    fontSize: 13,
    color: colors.textSubtle,
  },
  rewardBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  rewardBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
