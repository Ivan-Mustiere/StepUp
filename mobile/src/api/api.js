const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8000";

import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "stepup_access_token";
const REFRESH_TOKEN_KEY = "stepup_refresh_token";

let accessToken = null;
let refreshToken = null;

export async function initAuthTokens() {
  accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

async function persistTokens(tokens) {
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, accessToken || ""],
    [REFRESH_TOKEN_KEY, refreshToken || ""],
  ]);
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

async function request(path, options = {}) {
  const response = await fetchWithAuth(path, options);

  if (!response.ok) {
    if (response.status === 401 && refreshToken && !options._retry) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return request(path, { ...options, _retry: true });
      }
    }
    const body = await response.text();
    let message = body;
    try {
      const json = JSON.parse(body);
      if (json.detail) {
        message = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
      }
    } catch (_) {}
    throw new Error(`Erreur (${response.status}): ${message}`);
  }

  return response.json();
}

function fetchWithAuth(path, options = {}) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });
}

export async function register(payload) {
  return request("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload) {
  const tokens = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await persistTokens(tokens);
  return tokens;
}

export async function refreshSession() {
  if (!refreshToken) {
    return false;
  }
  try {
    const tokens = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!tokens.ok) {
      await clearSession();
      return false;
    }
    const payload = await tokens.json();
    await persistTokens(payload);
    return true;
  } catch (_) {
    await clearSession();
    return false;
  }
}

export async function logout() {
  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (_) {
      // On nettoie localement meme si l'appel serveur echoue.
    }
  }
  await clearSession();
}

export function getMyProfile() {
  return request("/api/v1/auth/me");
}

export function getHealth() {
  return request("/health");
}

export function getApiMessage() {
  return request("/api/v1/message");
}

export { API_BASE_URL };
