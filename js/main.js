// js/main.js
"use strict";

document.addEventListener("click", (e) => {
  if (e.target.id === "logoutBtn") logout("manual");
  if (e.target.id === "refreshStandingsBtn") fetchStandings();
});

document.addEventListener("change", (e) => {
  if (e.target.id === "corpSelect") renderBarsForCorpId(e.target.value);
});
