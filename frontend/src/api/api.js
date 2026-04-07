const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const ACCESS_TOKEN_KEY = "stepup_web_access_token";
const REFRESH_TOKEN_KEY = "stepup_web_refresh_token";

let accessToken = null;
let refreshToken = null;

export async function initAuthTokens() {
  accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
}

function persistTokens(tokens) {
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken || "");
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken || "");
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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
  persistTokens(tokens);
  return tokens;
}

export async function refreshSession() {
  if (!refreshToken) {
    return false;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) {
      await clearSession();
      return false;
    }
    const tokens = await response.json();
    persistTokens(tokens);
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
      // Nettoyage local meme si l'API ne repond pas.
    }
  }
  await clearSession();
}

export function getMyProfile() {
  return request("/api/v1/auth/me");
}

export { API_BASE_URL };
