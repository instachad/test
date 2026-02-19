// js/config.js
"use strict";

// ===== CONFIG =====
const clientId = "4c2f7825780f4d0cba80a75d1a8a0c69";
const redirectUri = "https://instachad.github.io/test/";
const scopes = [
  "esi-wallet.read_character_wallet.v1",
  "esi-characters.read_standings.v1",
  "esi-skills.read_skills.v1",
].join(" ");

// ===== SKILL IDs =====
const DIPLOMACY = 3357;
const CONNECTIONS = 3359;

// ===== STATE =====
let standingsRaw = [];
let standingsPretty = [];
const nameCache = new Map();

let socialSkills = {
  connections: 0,
  diplomacy: 0,
};
