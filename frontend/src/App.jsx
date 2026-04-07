import { useEffect, useMemo, useState } from "react";
import {
  getMyProfile,
  initAuthTokens,
  login,
  logout,
  register,
} from "./api/api";
import AppNavigator from "./navigation/AppNavigator";

const emptyRegister = {
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
  const [error, setError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState(emptyRegister);

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
        // Session absente ou invalide.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginForm);
      const me = await getMyProfile();
      setProfile(me);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        ...registerForm,
        age: registerForm.age ? Number(registerForm.age) : null,
      });
      await login({
        email: registerForm.email,
        password: registerForm.password,
      });
      const me = await getMyProfile();
      setProfile(me);
      setRegisterForm(emptyRegister);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await logout();
      setProfile(null);
      setError("");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <main className="center">Chargement...</main>;
  }

  async function refreshProfile() {
    try {
      const me = await getMyProfile();
      setProfile(me);
    } catch (_) {}
  }

  if (profile) {
    return <AppNavigator profile={profile} onLogout={handleLogout} onRefreshProfile={refreshProfile} />;
  }

  return (
    <main className="container">
      <section className="card">
        <h1>StepUp</h1>
        <div className="switch">
          <button
            className={isLoginMode ? "active" : ""}
            onClick={() => setIsLoginMode(true)}
          >
            Connexion
          </button>
          <button
            className={!isLoginMode ? "active" : ""}
            onClick={() => setIsLoginMode(false)}
          >
            Inscription
          </button>
        </div>

        <h2>{title}</h2>
        {error ? <p className="error">{error}</p> : null}

        {isLoginMode ? (
          <form className="form" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, email: e.target.value }))
              }
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, password: e.target.value }))
              }
              required
            />
            <button type="submit">Se connecter</button>
          </form>
        ) : (
          <form className="form" onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Pseudo"
              value={registerForm.pseudo}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, pseudo: e.target.value }))
              }
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
              }
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={registerForm.password}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
              }
              required
            />
            <input
              type="number"
              placeholder="Age"
              min="16"
              max="100"
              value={registerForm.age}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, age: e.target.value }))
              }
            />
            <select
              value={registerForm.genre}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, genre: e.target.value }))
              }
            >
              <option value="">Sexe</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
              <option value="autre">Autre</option>
            </select>
            <input
              type="text"
              placeholder="Pays"
              value={registerForm.pays}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, pays: e.target.value }))
              }
            />
            <button type="submit">S'inscrire</button>
          </form>
        )}
      </section>
    </main>
  );
}
