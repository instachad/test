// js/esi.js
"use strict";

async function publicFetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

async function esiFetchJson(url, options = {}) {
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
