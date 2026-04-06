import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  API_BASE_URL,
  getMyProfile,
  initAuthTokens,
  login,
  logout,
  register,
} from "./src/api/api";

const initialRegisterForm = {
  pseudo: "",
  email: "",
  password: "",
  age: "",
  genre: "",
  region: "",
  pays: "",
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [profile, setProfile] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);

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
      } catch (_) {
        // Pas de session active.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onLogin() {
    try {
      setLoading(true);
      await login(loginForm);
      const me = await getMyProfile();
      setProfile(me);
    } catch (error) {
      Alert.alert("Erreur connexion", String(error.message || error));
    } finally {
      setLoading(false);
    }
  }

  async function onRegister() {
    try {
      setLoading(true);
      const payload = {
        ...registerForm,
        age: registerForm.age ? Number(registerForm.age) : null,
      };
      await register(payload);
      await login({ email: registerForm.email, password: registerForm.password });
      const me = await getMyProfile();
      setProfile(me);
      setRegisterForm(initialRegisterForm);
    } catch (error) {
      Alert.alert("Erreur inscription", String(error.message || error));
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    try {
      setLoading(true);
      await logout();
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.card}>
          <Text style={styles.h1}>Bienvenue {profile.pseudo}</Text>
          <Text style={styles.meta}>Email: {profile.email}</Text>
          <Text style={styles.meta}>Coins: {profile.coins}</Text>
          <Text style={styles.meta}>XP: {profile.xp_total}</Text>
          <Text style={styles.meta}>API: {API_BASE_URL}</Text>
          <View style={styles.spacer} />
          <Button title="Se deconnecter" onPress={onLogout} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>StepUp Mobile</Text>
        <Text style={styles.subtitle}>Backend: {API_BASE_URL}</Text>
        <View style={styles.switchRow}>
          <Button
            title="Connexion"
            onPress={() => setIsLoginMode(true)}
            color={isLoginMode ? "#2563eb" : "#94a3b8"}
          />
          <Button
            title="Inscription"
            onPress={() => setIsLoginMode(false)}
            color={!isLoginMode ? "#2563eb" : "#94a3b8"}
          />
        </View>
        <Text style={styles.h2}>{title}</Text>

        {isLoginMode ? (
          <View style={styles.form}>
            <TextInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              value={loginForm.email}
              onChangeText={(value) =>
                setLoginForm((prev) => ({ ...prev, email: value }))
              }
            />
            <TextInput
              placeholder="Mot de passe"
              secureTextEntry
              style={styles.input}
              value={loginForm.password}
              onChangeText={(value) =>
                setLoginForm((prev) => ({ ...prev, password: value }))
              }
            />
            <Button title="Se connecter" onPress={onLogin} />
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              placeholder="Pseudo"
              autoCapitalize="none"
              style={styles.input}
              value={registerForm.pseudo}
              onChangeText={(value) =>
                setRegisterForm((prev) => ({ ...prev, pseudo: value }))
              }
            />
            <TextInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              value={registerForm.email}
              onChangeText={(value) =>
                setRegisterForm((prev) => ({ ...prev, email: value }))
              }
            />
            <TextInput
              placeholder="Mot de passe"
              secureTextEntry
              style={styles.input}
              value={registerForm.password}
              onChangeText={(value) =>
                setRegisterForm((prev) => ({ ...prev, password: value }))
              }
            />
            <TextInput
              placeholder="Age"
              keyboardType="number-pad"
              style={styles.input}
              value={registerForm.age}
              onChangeText={(value) =>
                setRegisterForm((prev) => ({ ...prev, age: value }))
              }
            />
            <TextInput
              placeholder="Genre"
              style={styles.input}
              value={registerForm.genre}
              onChangeText={(value) =>
                setRegisterForm((prev) => ({ ...prev, genre: value }))
              }
            />
            <TextInput
              placeholder="Region"
              style={styles.input}
              value={registerForm.region}
              onChangeText={(value) =>
                setRegisterForm((prev) => ({ ...prev, region: value }))
              }
            />
            <TextInput
              placeholder="Pays"
              style={styles.input}
              value={registerForm.pays}
              onChangeText={(value) =>
                setRegisterForm((prev) => ({ ...prev, pays: value }))
              }
            />
            <Button title="S'inscrire" onPress={onRegister} />
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
  },
  scroll: {
    padding: 20,
    gap: 12,
  },
  card: {
    margin: 20,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  h1: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  h2: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  subtitle: {
    color: "#475569",
  },
  meta: {
    color: "#334155",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginVertical: 8,
  },
  form: {
    gap: 10,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  spacer: {
    height: 8,
  },
});
