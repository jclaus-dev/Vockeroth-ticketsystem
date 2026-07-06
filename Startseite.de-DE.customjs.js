/* Startseite: initialization */

function initializeApp() {
  hideAllViews();
  showView("tile");

  const idxZalando = tiles.findIndex(t => 
    t.dataset.kachelname === "Zalando Bestellung nicht erf\u00fcllbar" &&
    !t.classList.contains("disabled")
  );
  if (idxZalando >= 0) {
    selectedTileIndex = idxZalando;
  } else {
    const rawIndex = +localStorage.getItem(SESSION_KEYS.lastTileIndex);
    if (
      !isNaN(rawIndex) &&
      rawIndex < tiles.length &&
      !tiles[rawIndex].classList.contains("disabled") &&
      tiles[rawIndex].dataset.kachelname !== "Coming Soon"
    ) {
      selectedTileIndex = rawIndex;
    } else {
      selectedTileIndex = tiles.findIndex(t => {
        return (
          !t.classList.contains("disabled") &&
          t.dataset.kachelname !== "Coming Soon"
        );
      });
      if (selectedTileIndex < 0) selectedTileIndex = 0;
    }
  }

  updateTileSelection();

  disableAllTiles();

  const savedPers = localStorage.getItem(SESSION_KEYS.persNr);
  const savedFil  = localStorage.getItem(SESSION_KEYS.filNr);
  if (savedPers) inputs.persNr.value = savedPers;
  if (savedFil)  inputs.filNr.value  = savedFil;
  updateFilialPlaceholder();
  validatePersonalFilial();
  if (typeof loadTickets === "function" && typeof updateTicketsTabLabel === "function") {
    const openCount = loadTickets().filter(t => !t.done).length;
    updateTicketsTabLabel(openCount);
  }

  if (!inputs.persNr.value.trim()) {
    inputs.persNr.focus();
  }
}

const BANNER_MODE = "endpoint"; // "endpoint" | "sharepoint"
const BANNER_ENDPOINT_URL = "https://defaultb586119017e044ea9a1ed1cb5bebf7.bd.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1f71f630de2946ce90bc6f3452390666/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Zeg80quVx2TPrmFxxR2V7Z6NvdlwQ5MXTUVddL_5n60";
const SHAREPOINT_SITE_URL = "https://kvockeroth.sharepoint.com/sites/Online-Team/Lists/TicketUI_BenachrichtigungsLeiste/AllItems.aspx?viewid=c253f374%2Dd796%2D40db%2D94be%2De28cd602e57b";
const POLL_MS = 60000;
const ALLOW_HTML = false;

const DAILY_RELOAD_KEY = "dailyReloadDate";
const MORNING_RELOAD_HOUR = 5;
let bannerPollingTimer = null;
let bannerRequestInFlight = false;
let lastBannerValue = null;

function getTodayLocalDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getBannerElements() {
  let bannerEl = document.getElementById("infoBanner");
  if (!bannerEl) {
    const center = document.querySelector(".center-content");
    if (!center) return {};
    bannerEl = document.createElement("div");
    bannerEl.id = "infoBanner";
    bannerEl.className = "info-banner";
    center.prepend(bannerEl);
  }
  const targetEl = document.getElementById("infoText") || bannerEl;
  return { bannerEl, targetEl };
}

function renderBannerValue(value) {
  const { bannerEl, targetEl } = getBannerElements();
  if (!bannerEl || !targetEl) return;

  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    bannerEl.style.display = "none";
    return;
  }

  bannerEl.style.display = "flex";
  if (ALLOW_HTML) {
    targetEl.innerHTML = text;
  } else {
    targetEl.textContent = text;
  }
  lastBannerValue = text;
}

function getCurrentBannerValue() {
  if (lastBannerValue !== null) return lastBannerValue;
  const infoTextEl = document.getElementById("infoText");
  if (infoTextEl) {
    lastBannerValue = (infoTextEl.textContent || "").trim();
    return lastBannerValue;
  }
  const bannerEl = document.getElementById("infoBanner");
  if (bannerEl) {
    lastBannerValue = (bannerEl.textContent || "").trim();
    return lastBannerValue;
  }
  lastBannerValue = "";
  return lastBannerValue;
}

function parseSharePointBannerValue(data) {
  if (!data || typeof data !== "object") return "";
  if (typeof data.value === "string") return data.value;
  if (typeof data.Value === "string") return data.Value;
  if (data.body && typeof data.body.value === "string") return data.body.value;
  if (data.body && typeof data.body.Value === "string") return data.body.Value;
  if (data.d && typeof data.d.Value === "string") return data.d.Value;
  if (Array.isArray(data.value) && data.value.length) {
    const first = data.value[0];
    if (first && typeof first.Value === "string") return first.Value;
  }
  return "";
}

async function fetchBannerValue() {
  if (BANNER_MODE === "endpoint") {
    if (!BANNER_ENDPOINT_URL) {
      console.warn("Info-Banner: BANNER_ENDPOINT_URL ist leer.");
      return null;
    }
    const res = await fetch(BANNER_ENDPOINT_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
        "Content-Type": "application/json"
      },
      body: "{}",
      cache: "no-store"
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Endpoint Status ${res.status} ${res.statusText} - ${errText.slice(0, 300)}`);
    }
    const raw = await res.text();
    const trimmed = raw.trim();
    if (!trimmed) return "";
    try {
      const data = JSON.parse(trimmed);
      return parseSharePointBannerValue(data);
    } catch {
      return trimmed;
    }
  }

  if (BANNER_MODE === "sharepoint") {
    const baseUrl = (SHAREPOINT_SITE_URL || "").trim().replace(/\/+$/, "");
    const apiPath = "/_api/web/lists/getbytitle('TicketUI_Settings')/items(1)?$select=Value,Title";
    const url = baseUrl ? `${baseUrl}${apiPath}` : apiPath;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json;odata=nometadata" },
      credentials: "include",
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`SharePoint Status ${res.status}`);
    const data = await res.json();
    return parseSharePointBannerValue(data);
  }

  console.warn(`Info-Banner: Unbekannter BANNER_MODE "${BANNER_MODE}".`);
  return null;
}

async function loadBanner() {
  if (bannerRequestInFlight) return;
  bannerRequestInFlight = true;
  try {
    const value = await fetchBannerValue();
    if (value === null || value === undefined) return;
    const nextValue = typeof value === "string" ? value.trim() : "";
    const currentValue = getCurrentBannerValue();
    if (nextValue !== currentValue) {
      renderBannerValue(nextValue);
    }
  } catch (err) {
    console.warn("Info-Banner konnte nicht geladen werden.", err);
  } finally {
    bannerRequestInFlight = false;
  }
}

function startBannerPolling() {
  loadBanner();
  if (bannerPollingTimer) clearInterval(bannerPollingTimer);
  bannerPollingTimer = setInterval(loadBanner, POLL_MS);
}

function scheduleDailyReload() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(MORNING_RELOAD_HOUR, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  const delay = next.getTime() - now.getTime();
  setTimeout(() => {
    const today = getTodayLocalDate();
    localStorage.setItem(DAILY_RELOAD_KEY, today);
    window.location.reload();
  }, delay);
}

function enforceDailyReload() {
  const now = new Date();
  const today = getTodayLocalDate();
  const lastReloadDate = localStorage.getItem(DAILY_RELOAD_KEY);
  if (now.getHours() >= MORNING_RELOAD_HOUR && lastReloadDate !== today) {
    localStorage.setItem(DAILY_RELOAD_KEY, today);
    window.location.reload();
    return;
  }
  scheduleDailyReload();
}

document.addEventListener("DOMContentLoaded", () => {
  initializeNewsletterQuickSelect();
  setupBlinkingPlaceholder(inputs.gutschein);
  setupBlinkingPlaceholder(inputs.gutscheinWert);
  setupBlinkingPlaceholder(inputs.best1);
  setupBlinkingPlaceholder(inputs.ean1);
  setupBlinkingPlaceholder(inputs.ean2);
  setupBlinkingPlaceholder(inputs.ean3);
  setupBlinkingPlaceholder(inputs.ean4);
  setupBlinkingPlaceholder(inputs.newPassword);
  setupBlinkingPlaceholder(inputs.sonstiges);

  Object.values(inputs).forEach(setupBlinkingPlaceholder);

  initSessionTimer();
  if (buttons.reset) {
    buttons.reset.style.display = "inline-block";
  }
  startBannerPolling();
  window.addEventListener("focus", loadBanner);
  window.addEventListener("online", loadBanner);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      loadBanner();
    }
  });
  enforceDailyReload();
  initializeApp();
});
