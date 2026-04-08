import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
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
        <ActivityIndicator size="large" color="#2563eb" />
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
              <Text style={styles.rewardCoins}>+{rewardData?.coins_gagnes} 🪙</Text>
              <Text style={styles.rewardStreak}>
                🔥 Streak : {rewardData?.strick} jour{rewardData?.strick > 1 ? "s" : ""}
              </Text>
              <Text style={styles.rewardTotal}>
                Total : {rewardData?.coins_total} 🪙
              </Text>
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
    backgroundColor: "#f8fafc",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  scroll: {
    padding: 24,
  },
  h1: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 24,
    marginTop: 16,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "center",
  },
  switchRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
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
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94a3b8",
  },
  switchBtnTextActive: {
    color: "#0f172a",
    fontWeight: "700",
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
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
    borderColor: "#cbd5e1",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  selectOptionActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  selectOptionText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  selectOptionTextActive: {
    color: "#ffffff",
  },
  btn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
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
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  chipText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  rewardOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 32,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "center",
  },
  rewardCoins: {
    fontSize: 42,
    fontWeight: "800",
    color: "#d97706",
    marginBottom: 8,
  },
  rewardStreak: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ea580c",
    marginBottom: 4,
  },
  rewardTotal: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 24,
  },
  rewardBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  rewardBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
