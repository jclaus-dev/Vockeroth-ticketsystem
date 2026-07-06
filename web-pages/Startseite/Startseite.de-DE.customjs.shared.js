/* Startseite: shared config, state, and DOM references */

const API_URL = "https://defaultb586119017e044ea9a1ed1cb5bebf7.bd.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/20a6b724a9d64815b9100a9e7c098519/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rMsIaBhPnfJKPLjEcpm44nhVG_g73_8joCkWRamx6Ys";

const SESSION_KEYS = {
  persNr: "personalnummer",
  filNr: "filialnummer",
  expiresAt: "sessionExpiresAt",
  lastTileIndex: "lastSelectedTileIndex"
};

const FILIAL_MAP = {
  "1":  "Homberg",
  "0":  "Melsungen",
  "2":  "Melsungen",
  "3": "Jack & Jones",
  "4": "Fritzlar",
  "6": "Kassel",
  "9": "Arnsberg",
  "10": "Kassel",
  "11": "Kassel",
  "15": "Nordhausen",
  "16": "Hann. Münden",
  "18": "Eschwege",
  "20": "Eschwege",
  "22": "Homberg",
  "23": "Nordhausen",
  "24": "Goslar",
  "25": "Goslar",
  "27": "Soest",
  "29": "Bad Hersfeld",
  "40": "Bad Hersfeld",
  "43": "Bad Hersfeld",
  "47": "Bad Hersfeld",
  "51": "Bad Hersfeld",
  "52": "Bad Hersfeld",
  "55": "Bad Hersfeld",
  "30": "Kassel",
  "36": "Einbeck",
  "46": "Homberg",
  "49": "Schwalmstadt",
  "50": "Melsungen",
  "53": "Einbeck",
  "54": "Eschwege",
  "56": "Homberg",
  "57": "Eschwege",
};

const ZALANDO_REASONS = [
  "Artikel defekt",
  "Kein Bestand",
  "Nicht Auffindbar",
  "Bereits gepicked für andere Bestellung / bereits stationär verkauft",
  "Umlagerung",
  "Hersteller Retoure",
  "Kundenreservierung",
  "Personalauswahl",
  "Im Bestand"
];

let hasSent = false;
let currentTileName = "";
let selectedTileIndex = 0;
let twoEans = false;
let passReason = "";
let inputMode = "keyboard";

const tiles = Array.from(document.querySelectorAll("#tileContainer .tile.clickable"));
const popup = document.getElementById("customPopup");
const userFieldsWrapper = document.getElementById("user-fields-wrapper");
const userFields = document.querySelector(".user-fields");
const mainContainer = document.getElementById("main");
const navFilialPlaceholder = document.getElementById("filialnamePlaceholder");

const containers = {
  tile:      document.getElementById("tileContainer"),
  tickets:   document.getElementById("containerTickets"),
  handbuch:  document.getElementById("containerHandbuch"),
  handbuchDetail: document.getElementById("containerHandbuchDetail"),
  handbuchArticle: document.getElementById("containerHandbuchArticle"),
  gutschein: document.getElementById("gutscheinContainer"),
  best1:     document.getElementById("containerBestellungNichtErfuellbar"),
  step2:     document.getElementById("containerBestellungStep2"),
  opt1:      document.getElementById("containerBestellungOpt1"),
  opt2:      document.getElementById("containerBestellungOpt2"),
  pass1:     document.getElementById("containerPasswortResetStep1"),
  pass2:     document.getElementById("containerPasswortResetStep2"),
  sonstiges: document.getElementById("containerSonstiges"),
  mboard:    document.getElementById("containerMboard"),
  mboardRetoure: document.getElementById("containerMboardRetoure")
};

const inputs = {
  persNr:        document.getElementById("personalnummer"),
  filNr:         document.getElementById("filialnummer"),
  gutschein:     document.getElementById("gutscheinInput"),
  gutscheinWert: document.getElementById("gutscheinWertInput"),
  best1:         document.getElementById("input1"),
  ean1:          document.getElementById("step2Input1"),
  ean2:          document.getElementById("step2Input2"),
  ean3:          document.getElementById("step2Input3"),
  ean4:          document.getElementById("step2Input4"),
  newPassword:   document.getElementById("newPasswordInput"),
  sonstiges:     document.getElementById("sonstigesInput"),
  mboard:        document.getElementById("mboardInput"),
  mboardOrder:   document.getElementById("mboardRetoureOrder"),
  mboardEAN:     document.getElementById("mboardRetoureEAN"),
  mboardCustomer:document.getElementById("mboardRetoureCustomer"),
  mboardState:   document.getElementById("mboardRetoureState")
};

const buttons = {
  homeTab:        document.getElementById("homeTab"),
  ticketsTab:     document.getElementById("ticketsTab"),
  handbuchTab:    document.getElementById("handbuchTab"),
  popupYes:       document.getElementById("popupYes"),
  popupNo:        document.getElementById("popupNo"),
  save:           document.getElementById("saveBtn"),
  reset:          document.getElementById("resetBtn"),
  passPrev:       document.getElementById("passwordPrev"),
  passPrev1:      document.getElementById("passwordPrev1"),
  passConfirm:    document.getElementById("passwordConfirm"),
  sonstPrev:      document.getElementById("sonstigesPrev"),
  sonstConfirm:   document.getElementById("sonstigesConfirm"),
  addSecondEAN:   document.getElementById("addSecondEANBox"),
  confirmReason:  document.getElementById("confirmReasonBtn"),
  confirmReason2: document.getElementById("confirmReasonBtn2"),
  reasonPrev1:    document.getElementById("reasonPrev1"),
  reasonPrev2:    document.getElementById("reasonPrev2"),
  mboardPrev:     document.getElementById("mboardPrev"),
  zalandoPrev:    document.getElementById("zalandoPrev"),
  mboardConfirm:  document.getElementById("mboardConfirm"),
  mboardRetourePrev: document.getElementById("mboardRetourePrev"),
  mboardRetoureConfirm: document.getElementById("mboardRetoureConfirm")
};

const arrowPrev = document.getElementById("arrowPrev");
const arrowNext = document.getElementById("arrowNext");
const zalandoNext = document.getElementById("nextArrow");
const backBtn = document.getElementById("backBtn");
const step2Confirm = document.getElementById("step2Confirm");
const infoText = document.getElementById("infoText");

const reasonGrid1 = document.getElementById("reasonGrid1");
const reasonGrid2 = document.getElementById("reasonGrid2");
const containerOpt2 = document.getElementById("containerBestellungOpt2");
const opt2Headline = containerOpt2 ? containerOpt2.querySelector("h2") : null;
const box1 = document.getElementById("kachelEAN1");
const box2 = document.getElementById("kachelEAN2");
const box3 = document.getElementById("kachelEAN3");
const box4 = document.getElementById("kachelEAN4");
const confirmBtn = document.getElementById("step2Confirm");

function tryParseJson(text) {
  if (!text || typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function firstStringValue(obj, keys) {
  if (!obj || typeof obj !== "object") return "";
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function extractFlowIds(rawResponse) {
  const parsed = typeof rawResponse === "string" ? tryParseJson(rawResponse) : rawResponse;
  if (!parsed || typeof parsed !== "object") return { ticketId: "", plannerTaskId: "" };

  const sources = [parsed, parsed.data, parsed.result, parsed.body, parsed.outputs].filter(Boolean);
  let ticketId = "";
  let plannerTaskId = "";

  for (const source of sources) {
    if (!ticketId) {
      ticketId = firstStringValue(source, ["ticketId", "TicketId", "sharePointTicketId", "sharepointTicketId"]);
    }
    if (!plannerTaskId) {
      plannerTaskId = firstStringValue(source, ["plannerTaskId", "PlannerTaskId", "taskId", "plannerId"]);
    }
    if (ticketId && plannerTaskId) break;
  }

  return { ticketId, plannerTaskId };
}

function inferLocalCreateTicketId(payload) {
  if (typeof loadTickets !== "function") return "";
  const tickets = loadTickets();
  if (!Array.isArray(tickets) || !tickets.length) return "";

  const match = tickets.find(ticket =>
    (ticket.kachelname || "") === (payload.kachelname || "") &&
    String(ticket.personalnummer || "") === String(payload.personalnummer || "") &&
    String(ticket.filialnummer || "") === String(payload.filialnummer || "")
  );

  if (!match) return "";
  return String(match.ticketId || match.id || "").trim();
}

function syncCreatedTicketIdsToLocal(payload, flowResponseText) {
  if (payload?.action !== "create") return;
  if (typeof loadTickets !== "function" || typeof saveTickets !== "function") return;

  const ids = extractFlowIds(flowResponseText);
  if (!ids.ticketId && !ids.plannerTaskId) return;

  const tickets = loadTickets();
  if (!Array.isArray(tickets) || !tickets.length) return;

  let idx = tickets.findIndex(ticket =>
    String(payload.ticketId || "").trim() &&
    String(ticket.ticketId || ticket.id || "").trim() === String(payload.ticketId || "").trim()
  );
  if (idx < 0) {
    idx = tickets.findIndex(ticket =>
    !String(ticket.ticketId || "").trim() &&
    (ticket.kachelname || "") === (payload.kachelname || "") &&
    String(ticket.personalnummer || "") === String(payload.personalnummer || "") &&
    String(ticket.filialnummer || "") === String(payload.filialnummer || "")
    );
  }
  if (idx < 0) {
    idx = tickets.findIndex(ticket => !String(ticket.ticketId || "").trim());
  }
  if (idx < 0) return;

  if (ids.ticketId) tickets[idx].ticketId = ids.ticketId;
  if (ids.plannerTaskId) tickets[idx].plannerTaskId = ids.plannerTaskId;
  saveTickets(tickets);
}

async function sendPlannerTicket(data = {}) {
  const payload = {
    action:         data.action || "create",
    ticketIds:      Array.isArray(data.ticketIds) ? data.ticketIds : [],
    kachelname:     data.kachelname || currentTileName || "",
    personalnummer: data.personalnummer || inputs.persNr.value.trim(),
    filialnummer:   data.filialnummer || inputs.filNr.value.trim()
  };

  ["gutscheincode", "gutscheinwert", "orderId", "reason", "password", "text", "ticketId"].forEach(key => {
    if (data[key]) payload[key] = data[key];
  });

  if (payload.action === "create" && !String(payload.ticketId || "").trim()) {
    const inferredTicketId = inferLocalCreateTicketId(payload);
    if (inferredTicketId) payload.ticketId = inferredTicketId;
  }

  if (Array.isArray(data.eans)) {
    payload.eans = data.eans;
  }
  if (Array.isArray(data.reasons)) {
    payload.reasons = data.reasons;
  }

  const res = await fetch(API_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload)
  });
  const resText = await res.text();
  if (!res.ok) {
    const isCreate = payload.action === "create";
    const isSoftFlow500 = res.status >= 500 && /InternalServerError/i.test(resText || "");
    if (isCreate && isSoftFlow500) {
      syncCreatedTicketIdsToLocal(payload, resText);
      console.warn("Flow returned 5xx after create action; suppressing UI error.", res.status, resText);
      return resText;
    }
    throw new Error(`Status ${res.status}: ${resText}`);
  }
  syncCreatedTicketIdsToLocal(payload, resText);
  return resText;
}

async function createTicket(payload = {}) {
  const responseText = await sendPlannerTicket({
    ...payload,
    action: "create"
  });
  const parsed = tryParseJson(responseText) || {};
  const ids = extractFlowIds(parsed);
  return {
    result: firstStringValue(parsed, ["result", "status"]) || "created",
    ticketId: ids.ticketId || "",
    plannerTaskId: ids.plannerTaskId || "",
    raw: parsed
  };
}

function showToast(message) {
  if (!message) return;
  let holder = document.getElementById("toastHolder");
  if (!holder) {
    holder = document.createElement("div");
    holder.id = "toastHolder";
    document.body.appendChild(holder);
  }
  const toast = document.createElement("div");
  toast.className = "toast-notice";
  toast.textContent = message;
  holder.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}
