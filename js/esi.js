"use strict";

// Импортируем функцию для проверки валидности access токена
import { ensureValidAccessToken } from './auth.js';  // Импортируем только ensureValidAccessToken

// Функция для выполнения запросов с токеном
export async function esiFetchJson(url, options = {}) {
  const doReq = async (accessToken) => {
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, { ...options, headers });
  };

  let token = await ensureValidAccessToken();  // Будем использовать ensureValidAccessToken напрямую
  let res = await doReq(token);

  if (res.status === 401) {
    // Если токен истек, обновим его
    token = await ensureValidAccessToken();  // Повторно используем ensureValidAccessToken для обновления
    res = await doReq(token);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ESI ${res.status}: ${txt}`);
  }

  return res.json();
}
