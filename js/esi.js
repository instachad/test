"use strict";

// Функция для получения и обновления токенов (из auth.js)
import { ensureValidAccessToken, refreshAccessToken } from './auth.js';

// Функция для выполнения запросов с токеном
export async function esiFetchJson(url, options = {}) {
  const doReq = async (accessToken) => {
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, { ...options, headers });
  };

  let token = await ensureValidAccessToken();
  let res = await doReq(token);

  if (res.status === 401) {
    token = await refreshAccessToken();
    res = await doReq(token);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ESI ${res.status}: ${txt}`);
  }

  return res.json();
}

// Загрузка мапы NPC корпораций и их фракций из файла (npc_corp_to_faction.json)
let npcCorpFactionMap = null;

export async function loadNpcCorpFactionMap() {
  if (npcCorpFactionMap) return npcCorpFactionMap; // Если уже загружено, не повторяем

  const res = await fetch("./data/npc_corp_to_faction.json", { cache: "force-cache" });
  if (!res.ok) throw new Error("Failed to load npc_corp_to_faction.json");

  npcCorpFactionMap = await res.json(); // Сохраняем данные
  console.log(npcCorpFactionMap); // Логируем, что загрузилось
  return npcCorpFactionMap; // Возвращаем
}

// Получаем ID фракции для конкретной корпорации
export async function getNpcFactionIdForCorp(corpId) {
  const map = await loadNpcCorpFactionMap(); // Загружаем мапу
  return map[String(corpId)] ?? null; // Возвращаем ID фракции или null, если нет
}
