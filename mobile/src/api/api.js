const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Erreur API (${response.status}): ${body}`);
  }

  return response.json();
}

export function getHealth() {
  return request("/health");
}

export function getApiMessage() {
  return request("/api/v1/message");
}

export { API_BASE_URL };
