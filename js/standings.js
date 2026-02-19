// js/standings.js
"use strict";

import { getNpcFactionIdForCorp } from "./esi.js"; // Импортируем функцию для получения фракции

/* ===== skills ===== */

function applyStandingSkill(base, level) {
  // effective = base + (10 - base) * 0.04 * level
  return base + (10 - base) * 0.04 * level;
}

async function fetchSocialSkillLevels() {
  const charId = localStorage.getItem("character_id");
  if (!charId) return;

  const data = await esiFetchJson(`https://esi.evetech.net/latest/characters/${charId}/skills/`);
  const map = new Map((data.skills || []).map((s) => [s.skill_id, s.trained_skill_level]));

  socialSkills.connections = map.get(CONNECTIONS) || 0;
  socialSkills.diplomacy = map.get(DIPLOMACY) || 0;
}

/* ===== standings fetch ===== */

async function fetchStandings() {
  const charId = localStorage.getItem("character_id");
  const bars = document.getElementById("barsContainer");
  if (!charId || !bars) return;

  bars.innerHTML = "Гружу standings...";

  let data;
  try {
    data = await esiFetchJson(`https://esi.evetech.net/latest/characters/${charId}/standings/?_=${Date.now()}`);
  } catch (e) {
    console.error(e);
    bars.innerHTML = "Ошибка загрузки standings (возможно, сессия умерла)";
    if (String(e.message || e).includes("Refresh failed") || String(e.message || e).includes("Not logged in")) {
      logout("standings auth failed");
    }
    return;
  }

  standingsRaw = data;

  const filtered = data.filter((x) => x.from_type === "faction" || x.from_type === "npc_corp");
  const ids = [...new Set(filtered.map((x) => x.from_id))];

  const names = await publicFetchJson("https://esi.evetech.net/latest/universe/names/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids),
  });

  const idToName = new Map(names.map((x) => [x.id, x.name]));
  idToName.forEach((name, id) => nameCache.set(id, name));

  standingsPretty = filtered.map((x) => ({
    id: x.from_id,
    type: x.from_type,
    name: idToName.get(x.from_id) || String(x.from_id),
    standing: x.standing,
  }));

  populateCorpSelect();
  bars.innerHTML = `<div class="small muted">Выбери корпорацию.</div>`;
}

/* ===== UI: select ===== */

function populateCorpSelect() {
  const select = document.getElementById("corpSelect");
  if (!select) return;

  select.innerHTML = `<option value="">Выберите NPC-корпорацию</option>`;

  standingsPretty
    .filter((x) => x.type === "npc_corp")
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
}

/* ===== faction resolver ===== */

async function getFactionIdForCorp(corp) {
  // 1) пробуем ESI /corporations/{corp_id}
  try {
    const corpData = await publicFetchJson(`https://esi.evetech.net/latest/corporations/${corp.id}/?_=${Date.now()}`);
    if (corpData && corpData.faction_id) return corpData.faction_id;
  } catch (e) {
    console.warn("corp info fetch failed", e);
  }

  // 2) если ESI не дала фракцию, пробуем получить её из словаря
  const factionId = await getNpcFactionIdForCorp(corp.id); // Получаем из словаря

  return factionId;  // Возвращаем ID фракции (или null, если не найдено)
}

async function getFactionName(factionId) {
  let name = nameCache.get(factionId);
  if (name) return name;

  try {
    const arr = await publicFetchJson("https://esi.evetech.net/latest/universe/names/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([Number(factionId)]),
    });

    if (arr && arr[0] && arr[0].name) {
      name = arr[0].name;
      nameCache.set(factionId, name);
      return name;
    }
  } catch (e) {
    console.warn("faction name fetch failed", e);
  }

  return "Faction";
}

/* ===== render ===== */

async function renderBarsForCorpId(corpId) {
  const bars = document.getElementById("barsContainer");
  if (!bars) return;

  bars.innerHTML = "";

  const corp = standingsPretty.find((x) => x.type === "npc_corp" && String(x.id) === String(corpId));
  if (!corp) {
    bars.innerHTML = `<div class="small muted">Выбери корпорацию.</div>`;
    return;
  }

  const factionId = await getFactionIdForCorp(corp);

  if (factionId) {
    let factionStandingObj =
      standingsPretty.find((x) => x.type === "faction" && Number(x.id) === Number(factionId)) ||
      { id: factionId, type: "faction", name: null, standing: 0 };

    const factionName = await getFactionName(factionId);
    bars.appendChild(createBar(factionName, factionStandingObj.standing, "faction"));
  }

  bars.appendChild(createBar(corp.name, corp.standing, "corp"));
}

function createBar(label, baseStanding, kind) {
  const wrapper = document.createElement("div");
  wrapper.className = "barBlock";

  const level = baseStanding >= 0 ? (socialSkills.connections || 0) : (socialSkills.diplomacy || 0);
  const effective = applyStandingSkill(baseStanding, level);
  const bonus = effective - baseStanding;

  const clamped = Math.max(-10, Math.min(10, effective));
  const pct = ((clamped + 10) / 20) * 100;

  const isZero = Math.abs(clamped) < 1e-9;
  const signClass = isZero ? "zero" : clamped > 0 ? "pos" : "neg";

  const title = document.createElement("div");
  title.className = "barTitle";

  const nameEl = document.createElement("div");
  nameEl.className = "name";
  nameEl.textContent = label;

  const numEl = document.createElement("div");
  numEl.className = "num";
  const baseTxt = baseStanding.toFixed(2);
  const effTxt = effective.toFixed(2);
  const bonusTxt = (bonus >= 0 ? "+" : "") + bonus.toFixed(2);
  numEl.textContent = `${effTxt} (${baseTxt}${bonusTxt})`;

  title.appendChild(nameEl);
  title.appendChild(numEl);

  const bar = document.createElement("div");
  bar.className = `bar ${kind}`;

  const ticks = document.createElement("div");
  ticks.className = "ticks";

  const zero = document.createElement("div");
  zero.className = "zero";

  const fill = document.createElement("div");
  fill.className = `fill ${signClass}`;

  const marker = document.createElement("div");
  marker.className = `marker ${signClass}`;

  if (isZero) {
    fill.style.left = "50%";
    fill.style.width = "0%";
    marker.style.left = "50%";
  } else if (clamped > 0) {
    fill.style.left = "50%";
    fill.style.width = `${pct - 50}%`;
    marker.style.left = `${pct}%`;
  } else {
    fill.style.left = `${pct}%`;
    fill.style.width = `${50 - pct}%`;
    marker.style.left = `${pct}%`;
  }

  bar.appendChild(ticks);
  bar.appendChild(zero);
  bar.appendChild(fill);
  bar.appendChild(marker);

  wrapper.appendChild(title);
  wrapper.appendChild(bar);

  return wrapper;
}

window.addEventListener('load', fetchStandings);  // Эта строка вызывает fetchStandings при загрузке страницы

