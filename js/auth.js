// js/auth.js
"use strict";

import { fetchStandings } from "./standings.js";  // Импортируем функцию из standings.js

/* ===== token storage ===== */
const LS = {
  access: "access_token",
  refresh: "refresh_token",
  expiresAt: "access_expires_at",
  characterId: "character_id",
};

function getRefreshToken() {
  return localStorage.getItem(LS.refresh);
}

function storeTokens(t) {
  localStorage.setItem(LS.access, t.access_token);
  if (t.refresh_token) localStorage.setItem(LS.refresh, t.refresh_token);

  const expAt = Date.now() + (Number(t.expires_in || 0) * 1000) - 30000;
  localStorage.setItem(LS.expiresAt, String(expAt));
}

function logout(reason = "") {
  localStorage.removeItem(LS.access);
  localStorage.removeItem(LS.refresh);
  localStorage.removeItem(LS.expiresAt);
  localStorage.removeItem(LS.characterId);

  setUiLoggedIn(false);
  if (reason) console.warn("Logout:", reason);
}

let refreshInFlight = null;

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const rt = localStorage.getItem(LS.refresh);
    if (!rt) throw new Error("Not logged in");

    const body = new URLSearchParams();
    body.append("grant_type", "refresh_token");
    body.append("refresh_token", rt);
    body.append("client_id", clientId);

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

async function ensureValidAccessToken() {
  const token = localStorage.getItem(LS.access);
  const expAt = Number(localStorage.getItem(LS.expiresAt) || "0");

  if (!token || !expAt || Date.now() >= expAt) {
    return await refreshAccessToken();
  }
  return token;
}

/* ===== PKCE ===== */
function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

function randomString(len = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (x) => chars[x % chars.length]).join("");
}

/* ===== login ===== */
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
    "&client_id=" + encodeURIComponent(clientId) +
    "&scope=" + encodeURIComponent(scopes) +
    "&state=" + encodeURIComponent(state) +
    "&code_challenge=" + encodeURIComponent(challenge) +
    "&code_challenge_method=S256";

  window.location.href = authUrl;
}

async function exchange(code) {
  const verifier = sessionStorage.getItem("eve_code_verifier");
  if (!verifier) throw new Error("Missing PKCE verifier");

  const body = new URLSearchParams();
  body.append("grant_type", "authorization_code");
  body.append("code", code);
  body.append("client_id", clientId);
  body.append("code_verifier", verifier);

  const resp = await fetch("https://login.eveonline.com/v2/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function verifyToken() {
  let token;
  try {
    token = await ensureValidAccessToken();
  } catch (e) {
    logout("no valid token");
    return;
  }

  let resp = await fetch("https://login.eveonline.com/oauth/verify", {
    headers: { Authorization: "Bearer " + token },
  });

  if (!resp.ok) {
    try {
      token = await refreshAccessToken();
      resp = await fetch("https://login.eveonline.com/oauth/verify", {
        headers: { Authorization: "Bearer " + token },
      });

      if (!resp.ok) {
        logout("verify failed");
        return;
      }
    } catch (e) {
      logout("verify failed");
      return;
    }
  }

  const data = await resp.json().catch(() => ({}));

  document.getElementById("charName").textContent = data.CharacterName || "???";
  document.getElementById("charId").textContent = data.CharacterID || "???";
  localStorage.setItem(LS.characterId, String(data.CharacterID || ""));

  fetchStandings();
}

async function handleCallbackOnLoad() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const returnedState = params.get("state");

  if (!code) {
    const hasRefresh = !!getRefreshToken();
    setUiLoggedIn(hasRefresh);

    if (hasRefresh) {
      try {
        await verifyToken();
      } catch (e) {
        console.warn(e);
        logout("session invalid");
      }
    }
    return;
  }

  const expectedState = sessionStorage.getItem("eve_state");
  if (returnedState !== expectedState) {
    if (statusEl) statusEl.textContent = "state mismatch";
    return;
  }

  try {
    const token = await exchange(code);
    storeTokens(token);

    history.replaceState({}, document.title, redirectUri);
    setUiLoggedIn(true);

    await verifyToken();
  } catch (e) {
    console.error(e);
    if (statusEl) statusEl.textContent = "ошибка токена";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.addEventListener("click", startLogin);

  handleCallbackOnLoad().catch((e) => console.error(e));
});
