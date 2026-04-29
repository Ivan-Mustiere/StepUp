const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" && window.location
    ? "http://localhost:8000"
    : "http://10.0.2.2:8000");

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
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) {
      await clearSession();
      return false;
    }
    const payload = await response.json();
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

export function getPronostics(queryString = "") {
  return request(`/api/v1/pronostics${queryString ? `?${queryString}` : ""}`);
}

export function createPronostic(payload) {
  return request("/api/v1/pronostics", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getUserProfile(userId) {
  return request(`/api/v1/users/${userId}`);
}

export function getCommunautes() {
  return request("/api/v1/communautes");
}

export function joinCommunaute(id) {
  return request(`/api/v1/communautes/${id}/rejoindre`, { method: "POST" });
}

export function leaveCommunaute(id) {
  return request(`/api/v1/communautes/${id}/quitter`, { method: "DELETE" });
}

export function getClassement(communauteId) {
  return request(`/api/v1/communautes/${communauteId}/classement`);
}

export function getMessages(communauteId) {
  return request(`/api/v1/communautes/${communauteId}/messages`);
}

export function sendMessage(communauteId, contenu) {
  return request(`/api/v1/communautes/${communauteId}/messages`, {
    method: "POST",
    body: JSON.stringify({ contenu }),
  });
}

export function getConversation(friendId) {
  return request(`/api/v1/messages/${friendId}`);
}

export function sendPrivateMessage(friendId, contenu) {
  return request(`/api/v1/messages/${friendId}`, {
    method: "POST",
    body: JSON.stringify({ contenu }),
  });
}

export function getParis(queryString = "") {
  return request(`/api/v1/paris${queryString ? `?${queryString}` : ""}`);
}

export function reglerPari(pariId, equipeGagnante) {
  return request(`/api/v1/admin/paris/${pariId}/regler`, {
    method: "POST",
    body: JSON.stringify({ equipe_gagnante: equipeGagnante }),
  });
}

export function placeBet(pariId, mise, equipeChoisie) {
  return request(`/api/v1/paris/${pariId}/miser`, {
    method: "POST",
    body: JSON.stringify({ mise, equipe_choisie: equipeChoisie ?? null }),
  });
}

export function getFriends() {
  return request("/api/v1/friends");
}

export function searchByFriendCode(code) {
  return request(`/api/v1/friends/search?code=${encodeURIComponent(code)}`);
}

export function getFriendRequestsIncoming() {
  return request("/api/v1/friends/requests/incoming");
}

export function sendFriendRequest(friendUserId) {
  return request("/api/v1/friends/requests", {
    method: "POST",
    body: JSON.stringify({ friend_user_id: friendUserId }),
  });
}

export function acceptFriendRequest(requestId) {
  return request(`/api/v1/friends/requests/${requestId}/accept`, {
    method: "POST",
  });
}

export function rejectFriendRequest(requestId) {
  return request(`/api/v1/friends/requests/${requestId}/reject`, {
    method: "POST",
  });
}

export function removeFriend(friendId) {
  return request(`/api/v1/friends/${friendId}`, { method: "DELETE" });
}

export function syncSteps(pas) {
  return request("/api/v1/steps", {
    method: "POST",
    body: JSON.stringify({ pas }),
  });
}

export function getTodaySteps() {
  return request("/api/v1/steps/today");
}

export function getEquipes() {
  return request("/api/v1/equipes");
}

export function getMyEquipes() {
  return request("/api/v1/equipes/me");
}

export function setMyEquipes(equipe_ids) {
  return request("/api/v1/equipes/me", {
    method: "PUT",
    body: JSON.stringify({ equipe_ids }),
  });
}

export function dailyReward() {
  return request("/api/v1/auth/daily-reward", { method: "POST" });
}

export function updateProfile(payload) {
  return request("/api/v1/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changePassword(currentPassword, newPassword) {
  return request("/api/v1/users/me/password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function uploadAvatar(imageUri) {
  const rawName = imageUri.split("/").pop().split("?")[0];
  const filename = rawName || "avatar.jpg";
  const ext = filename.split(".").pop().toLowerCase();
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const formData = new FormData();

  // En mode web (Expo Web), imageUri est une data: URI ou blob: URL.
  // fetch/FormData du navigateur ne comprend pas { uri, name, type }.
  // Il faut convertir en Blob avant d'appender.
  if (imageUri.startsWith("data:") || imageUri.startsWith("blob:")) {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    formData.append("file", blob, filename);
  } else {
    // Mode natif React Native : { uri, name, type } est géré par le fetch natif.
    formData.append("file", { uri: imageUri, name: filename, type: mimeType });
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/users/me/avatar`, {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de l'upload de l'avatar.");
  }
  return response.json();
}

export { API_BASE_URL };
