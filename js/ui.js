// js/ui.js
"use strict";

// базовые элементы логина
const statusEl = document.getElementById("status");
const loginContainer = document.getElementById("login-container");

// рабочая зона (вставляем ниже страницы)
let appEl = document.createElement("div");
appEl.id = "app";
appEl.style.marginTop = "20px";
appEl.style.display = "none";

appEl.innerHTML = `
<div class="panel">
  <div class="row">
    <div><b>Рабочая зона</b></div>
    <button id="logoutBtn">Выход</button>
  </div>

  <div style="margin-top:10px;">
    <div><b>Персонаж:</b> <span id="charName">---</span></div>
    <div class="small">Character ID: <span id="charId">---</span></div>
  </div>

  <div class="grid" style="margin-top:12px;">

    <div class="section">
      <h3>Standings</h3>

      <div class="row" style="align-items:flex-end;">
        <div style="flex:1;">
          <div class="small">NPC корпорация</div>
          <select id="corpSelect" style="min-width:320px; width:100%; margin-top:6px;">
            <option value="">Сначала нажми "Обновить"</option>
          </select>
        </div>

        <div style="display:flex; gap:8px;">
          <button id="refreshStandingsBtn">Обновить</button>
        </div>
      </div>

      <div id="barsContainer" style="margin-top:14px;">
        <div class="small muted">Выбери корпорацию.</div>
      </div>
    </div>

    <div class="section">
      <h3>Storyline</h3>
      <div class="small muted">Пока заглушка, вернемся позже.</div>
    </div>

  </div>
</div>
`;

document.body.appendChild(appEl);

function setUiLoggedIn(state) {
  loginContainer.style.display = state ? "none" : "flex";
  appEl.style.display = state ? "block" : "none";
  if (statusEl) statusEl.textContent = state ? "залогинен" : "не залогинен";
}
