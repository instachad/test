"use strict";

// Данные для хранения токенов
const LS = {
  access: "access_token",
  refresh: "refresh_token",
  expiresAt: "access_expires_at",
  characterId: "character_id",
};

// Ваш clientId, который вы получили при регистрации в EVE Online Developer Portal
const clientId = "ВАШ_CLIENT_ID_ЗДЕСЬ";  // Замените на свой действующий clientId

// Функция для получения refresh токена
function getRefreshToken() {
  return localStorage.getItem(LS.refresh);
}

// Функция для хранения токенов
function storeTokens(t) {
  localStorage.setItem(LS.access, t.access_token);
  if (t.refresh_token) localStorage.setItem(LS.refresh, t.refresh_token);

  const expAt = Date.now() + (Number(t.expires_in || 0) * 1000) - 30000;
  localStorage.setItem(LS.expiresAt, String(expAt));
}

// Функция для выхода
function logout(reason = "") {
  localStorage.removeItem(LS.access);
  localStorage.removeItem(LS.refresh);
  localStorage.removeItem(LS.expiresAt);
  localStorage.removeItem(LS.characterId);

  setUiLoggedIn(false);
  if (reason) console.warn("Logout:", reason);
}

// Функция для обновления access токена
let refreshInFlight = null;

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const rt = localStorage.getItem(LS.refresh);
    if (!rt) throw new Error("Not logged in");

    const body = new URLSearchParams();
    body.append("grant_type", "refresh_token");
    body.append("refresh_token", rt);
    body.append("client_id", clientId);  // Убедитесь, что clientId используется здесь

    const res = await fetch("https://login.eveonline.com/v2/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Refresh failed: ${res.status} ${txt}`);
    }

    const json = await res.json();
    storeTokens(json);
    return json.access_token;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

// Функция для проверки валидности access токена
async function ensureValidAccessToken() {
  const token = localStorage.getItem(LS.access);
  const expAt = Number(localStorage.getItem(LS.expiresAt) || "0");

  if (!token || !expAt || Date.now() >= expAt) {
    return await refreshAccessToken(); // Если токен не найден или он истек, обновляем
  }
  return token; // Если токен еще валиден, возвращаем его
}

// Функция для старта логина через OAuth
async function startLogin() {
  const state = randomString(24);
  const verifier = randomString(64);
  const challenge = await sha256(verifier);

  sessionStorage.setItem("eve_state", state);
  sessionStorage.setItem("eve_code_verifier", verifier);

  const authUrl =
    "https://login.eveonline.com/v2/oauth/authorize/?" +
    "response_type=code" +
    "&redirect_uri=" + encodeURIComponent(redirectUri) +
    "&client_id=" + encodeURIComponent(clientId) +  // Используем clientId
    "&scope=" + encodeURIComponent(scopes) +
    "&state=" + encodeURIComponent(state) +
    "&code_challenge=" + encodeURIComponent(challenge) +
    "&code_challenge_method=S256";

  window.location.href = authUrl;
}

// Экспортируем все нужные функции
export { startLogin, logout, ensureValidAccessToken };  // Без export для refreshAccessToken
