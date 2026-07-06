/* Startseite: shared config, state, and DOM references */

const API_URL = "https://defaultb586119017e044ea9a1ed1cb5bebf7.bd.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/20a6b724a9d64815b9100a9e7c098519/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rMsIaBhPnfJKPLjEcpm44nhVG_g73_8joCkWRamx6Ys";

const SESSION_KEYS = {
  persNr: "personalnummer",
  filNr: "filialnummer",
  expiresAt: "sessionExpiresAt",
  lastTileIndex: "lastSelectedTileIndex"
};

const FILIAL_MAP = {
  "1": "TEST_Fil",
  "0": "Melsungen",
  "2": "Online Filiale",
  "3": "Bad Hersfeld Jack&Jones",
  "4": "Fritzlar",
  "5": "Schwalmstadt",
  "6": "Kassel DEZ Vockeroth",
  "7": "Göttingen",
  "9": "Arnsberg Zebra 21",
  "14": "Einbeck Schünemann",
  "15": "Nordhausen",
  "16": "Hann. Münden",
  "18": "Eschwege",
  "20": "Eschwege Outlet",
  "24": "Goslar Kaiserpassage",
  "25": "Goslar",
  "27": "Soest HAKA",
  "29": "Bad Hersfeld S.Oliver",
  "30": "Kassel DEZ s.Oliver",
  "40": "Bad Hersfeld",
  "43": "Bad Hersfeld Sauer Zebra 21",
  "46": "Homberg Sauer",
  "46": "Schwalmstad Sauer Wäsche",
  "50": "Melsungen Intersport",
  "51": "Bad Hersfeld Intersport",
  "52": "Bad Hersfeld Bike Werkstatt",
  "53": "Einbeck Intersport",
  "54": "Eschwege Intersport",
  "55": "Bad Hersfeld Bike Store",
  "57": "Göttingen Intersport",
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
let pendingCreateRequests = 0;
const NEWSLETTER_PDFS = [
  { order: 1, title: "Bestellungen melden Übersicht", file: "1. Bestellungen_melden_Übersicht.pdf" },
  { order: 2, title: "EAN vergleichen", file: "2. EAN_vergleichen.pdf" },
  { order: 3, title: "GLS Retoure finden", file: "3. GLS Retoure finden.pdf" },
  { order: null, title: "Grundlagen zu M-Board und Zalando", file: "Grundlagen zu M‑Board und Zalando.pdf" },
  { order: null, title: "Neuer Ablauf Stationärer Umtausch", file: "Neuer_Ablauf_Stationärer_Umtausch.pdf" },
  { order: null, title: "Neuer Ablauf Zalando und MBoard", file: "Neuer_Ablauf_Zalando_und_MBoard.pdf" },
  { order: null, title: "Retourenbeleg", file: "Retourenbeleg.pdf" },
  { order: null, title: "Vorstellung Team Onlineshop", file: "Vorstellung_Team_Onlineshop.pdf" }
];

const NEWSLETTER_MANIFEST = [
  "1. EAN_vergleichen.pdf",
  "2. Artikelversand-Kontrolle.pdf",
  "3. Verpacken_Versandtüten_Kartons.pdf",
  "4. Pakete_Verpackungen_Inhalt_prüfen.pdf",
  "5. Neuer_Ablauf_Stationärer_Umtausch.pdf",
  "5.1 Retourenbeleg.pdf",
  "6. Einzelteile suchen.pdf",
  "7. Neuer_Ablauf_Zalando_und_MBoard.pdf",
  "8. Zalando_Retouren_bearbeiten.pdf",
  "9. Wie_verpacke_ich_richtig_.pdf",
  "10. Schwarz-Weiß_drucken _Abschließen.pdf",
  "11. Newsletter_Zalando_Leistungsbewertung.pdf",
  "12. Gutscheine.pdf",
  "13. Abarbeitung der Online-Shop Bestellungen.pdf",
  "14. Bestellungen_melden_Übersicht.pdf",
  "15. Neuigkeiten im M-Board.pdf",
  "16. Vorstellung_Team_Onlineshop.pdf",
  "17. Grundlagen zu M‑Board und Zalando.pdf",
  "18. GLS Retoure finden.pdf"
];

const NEWSLETTER_MANIFEST_FALLBACK = [
  "1. EAN_vergleichen.pdf",
  "2. Artikelversand-Kontrolle.pdf",
  "3. Verpacken_Versandt\u00fcten_Kartons.pdf",
  "4. Pakete_Verpackungen_Inhalt_pr\u00fcfen.pdf",
  "5. Neuer_Ablauf_Station\u00e4rer_Umtausch.pdf",
  "5.1 Retourenbeleg.pdf",
  "6. Einzelteile suchen.pdf",
  "7. Neuer_Ablauf_Zalando_und_MBoard.pdf",
  "8. Zalando_Retouren_bearbeiten.pdf",
  "9. Wie_verpacke_ich_richtig_.pdf",
  "10. Schwarz-Wei\u00df_drucken _Abschlie\u00dfen.pdf",
  "11. Newsletter_Zalando_Leistungsbewertung.pdf",
  "12. Gutscheine.pdf",
  "13. Abarbeitung der Online-Shop Bestellungen.pdf",
  "14. Bestellungen_melden_\u00dcbersicht.pdf",
  "15. Neuigkeiten im M-Board.pdf",
  "16. Vorstellung_Team_Onlineshop.pdf",
  "17. Grundlagen zu M\u2011Board und Zalando.pdf",
  "18. GLS Retoure finden.pdf"
];

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

  const isCreateAction = payload.action === "create";
  if (isCreateAction) {
    pendingCreateRequests += 1;
    setSendingIndicatorVisible(true);
    await waitForUiPaint();
  }

  try {
    const res = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    });
    const resText = await res.text();
    if (!res.ok) {
      const isSoftFlow500 = res.status >= 500 && /InternalServerError/i.test(resText || "");
      if (isCreateAction && isSoftFlow500) {
        syncCreatedTicketIdsToLocal(payload, resText);
        console.warn("Flow returned 5xx after create action; suppressing UI error.", res.status, resText);
        return resText;
      }
      throw new Error(`Status ${res.status}: ${resText}`);
    }
    syncCreatedTicketIdsToLocal(payload, resText);
    return resText;
  } finally {
    if (isCreateAction) {
      pendingCreateRequests = Math.max(0, pendingCreateRequests - 1);
      if (pendingCreateRequests === 0) {
        setSendingIndicatorVisible(false);
      }
    }
  }
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

function ensureSendingIndicator() {
  let el = document.getElementById("ticketSendingIndicator");
  if (el) return el;

  el = document.createElement("div");
  el.id = "ticketSendingIndicator";
  el.textContent = "Ticket wird gesendet...";
  el.style.position = "fixed";
  el.style.left = "50%";
  el.style.bottom = "16px";
  el.style.transform = "translateX(-50%)";
  el.style.zIndex = "100000";
  el.style.padding = "8px 14px";
  el.style.borderRadius = "999px";
  el.style.border = "1px solid #6a7b6a";
  el.style.background = "rgba(20, 28, 20, 0.92)";
  el.style.color = "#f4fff4";
  el.style.fontSize = "12px";
  el.style.fontWeight = "700";
  el.style.letterSpacing = "0.2px";
  el.style.display = "none";
  document.body.appendChild(el);
  return el;
}

function setSendingIndicatorVisible(visible) {
  const el = ensureSendingIndicator();
  if (!el) return;
  el.style.display = visible ? "block" : "none";
}

function waitForUiPaint() {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}
