/* Startseite: local ticket overview */
const TICKET_RETENTION_DAYS = 7;

function getTicketRetentionCutoffTs() {
  const daysMs = TICKET_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - daysMs;
}

function getTicketStorageKey() {
  const fil = inputs.filNr?.value.trim() || localStorage.getItem(SESSION_KEYS.filNr) || "unknown";
  return `tickets:${fil}`;
}

function pruneOldTickets(tickets) {
  if (!Array.isArray(tickets) || !tickets.length) return [];

  const cutoffTs = getTicketRetentionCutoffTs();
  return tickets.filter(ticket => {
    if (!ticket || typeof ticket !== "object") return false;
    const createdTs = new Date(ticket.createdAt).getTime();
    if (Number.isNaN(createdTs)) return true;
    return createdTs >= cutoffTs;
  });
}

function loadTickets() {
  try {
    const raw = localStorage.getItem(getTicketStorageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    const pruned = pruneOldTickets(parsed);
    if (pruned.length !== parsed.length) {
      localStorage.setItem(getTicketStorageKey(), JSON.stringify(pruned));
    }
    return pruned;
  } catch {
    return [];
  }
}

function getTypeKeyFromName(name) {
  if (!name) return "other";
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();

  if (normalized.includes("zalandobestellungnicht")) return "zalando-bestellung";
  if (normalized.includes("onlinegutscheine")) return "online-gutscheine";
  if (normalized.includes("zalandopasswort")) return "zalando-passwort";
  if (normalized.includes("sonstigesanliegen")) return "sonstiges";
  if (normalized.includes("mboardprobleme")) return "mboard";
  return "other";
}

function saveTickets(tickets) {
  localStorage.setItem(getTicketStorageKey(), JSON.stringify(tickets));
}

function recordTicket(entry) {
  const tickets = loadTickets();
  const localId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const entryTicketId = typeof entry?.ticketId === "string" ? entry.ticketId.trim() : "";
  const ticketId = entryTicketId || localId;
  const createdTicket = {
    id: localId,
    ticketId,
    createdAt: new Date().toISOString(),
    personalnummer: inputs.persNr?.value.trim() || "",
    filialnummer: inputs.filNr?.value.trim() || "",
    done: false,
    typeKey: entry.typeKey || getTypeKeyFromName(entry.kachelname),
    ...entry
  };
  tickets.unshift(createdTicket);
  saveTickets(tickets);
  const openCount = tickets.filter(t => !t.done).length;
  updateTicketsTabLabel(openCount);
  return createdTicket;
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("de-DE");
}

const currentTicketFilters = {
  status: "all",
  type: "all",
  favorite: "all",
  search: ""
};

let filtersInitialized = false;
let lastRenderedTickets = [];
let deleteModeActive = false;
const selectedTicketIds = new Set();

function updateDeleteButtonState() {
  const deleteBtn = document.getElementById("ticketsDeleteBtn");
  if (!deleteBtn) return;
  deleteBtn.textContent = deleteModeActive ? "Bestätigen" : "Löschen";
  deleteBtn.classList.toggle("is-confirm", deleteModeActive);
}

function clearDeleteSelection() {
  selectedTicketIds.clear();
}

function handleDeleteModeButtonClick() {
  if (!deleteModeActive) {
    deleteModeActive = true;
    clearDeleteSelection();
    updateDeleteButtonState();
    renderTickets();
    return;
  }

  if (!selectedTicketIds.size) {
    const shouldExitDeleteMode = window.confirm(
      "Kein Ticket ausgew\u00e4hlt. M\u00f6chtest du den L\u00f6schmodus beenden?"
    );
    if (shouldExitDeleteMode) {
      deleteModeActive = false;
      clearDeleteSelection();
      updateDeleteButtonState();
      renderTickets();
    }
    return;
  }

  const all = loadTickets();
  const remaining = all.filter(ticket => !selectedTicketIds.has(ticket.id));
  saveTickets(remaining);
  deleteModeActive = false;
  clearDeleteSelection();
  updateDeleteButtonState();
  renderTickets();
}

function updateFilterButtons(group, value) {
  const buttons = document.querySelectorAll(`[data-filter-group="${group}"]`);
  buttons.forEach(btn => {
    const isActive = btn.dataset.filterValue === value && !(group === "favorite" && value === "all");
    btn.classList.toggle("is-active", isActive);
  });
}

function initTicketFilters() {
  if (filtersInitialized) return;
  filtersInitialized = true;
  const filterButtons = document.querySelectorAll(".filter-button");
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.filterGroup;
      const value = btn.dataset.filterValue;
      if (!group || !value) return;
      if (group === "favorite") {
        currentTicketFilters.favorite = currentTicketFilters.favorite === "fav" ? "all" : "fav";
        currentTicketFilters.status = "all";
        updateFilterButtons("favorite", currentTicketFilters.favorite);
        updateFilterButtons("status", currentTicketFilters.status);
      } else {
        currentTicketFilters[group] = value;
        currentTicketFilters.favorite = "all";
        updateFilterButtons("status", currentTicketFilters.status);
        updateFilterButtons("favorite", currentTicketFilters.favorite);
      }
      renderTickets();
    });
  });

  const searchInput = document.getElementById("ticketSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentTicketFilters.search = searchInput.value.trim().toLowerCase();
      renderTickets();
    });
  }

  const exportBtn = document.getElementById("ticketsExportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportTicketsToCsv(lastRenderedTickets);
    });
  }

  const deleteBtn = document.getElementById("ticketsDeleteBtn");
  if (deleteBtn) {
    updateDeleteButtonState();
    deleteBtn.addEventListener("click", handleDeleteModeButtonClick);
  }
}

function updateTicketsTabLabel(openCount) {
  if (!buttons.ticketsTab) return;
  buttons.ticketsTab.textContent = openCount > 0 ? `Tickets (${openCount})` : "Tickets";
}

function renderTickets() {
  const listEl = document.getElementById("ticketsList");
  const emptyEl = document.getElementById("ticketsEmpty");
  if (!listEl || !emptyEl) return;
  startTicketStatusPolling();

  const tickets = loadTickets();
  const statusFilter = currentTicketFilters.status;
  const typeFilter = currentTicketFilters.type;
  const search = currentTicketFilters.search;
  const favFilter = currentTicketFilters.favorite;
  const openCount = tickets.filter(t => !t.done).length;
  updateTicketsTabLabel(openCount);
  const filtered = tickets.filter(ticket => {
    const typeKey = ticket.typeKey || getTypeKeyFromName(ticket.kachelname);
    if (statusFilter === "done" && !ticket.done) return false;
    if (statusFilter === "open" && ticket.done) return false;
    if (typeFilter !== "all" && typeKey !== typeFilter) return false;
    if (favFilter === "fav" && !ticket.isFav) return false;
    if (favFilter === "nonfav" && ticket.isFav) return false;
    if (search) {
      const haystack = [
        ticket.kachelname,
        ticket.details,
        ticket.personalnummer,
        ticket.filialnummer
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const existingIds = new Set(tickets.map(ticket => ticket.id));
  Array.from(selectedTicketIds).forEach(id => {
    if (!existingIds.has(id)) selectedTicketIds.delete(id);
  });

  lastRenderedTickets = filtered.slice();
  listEl.innerHTML = "";

  if (!filtered.length) {
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";
  filtered.forEach((ticket, idx) => {
    const card = document.createElement("div");
    card.className = `ticket-card${ticket.done ? " done" : ""} is-animated`;
    card.style.animationDelay = `${Math.min(200 * idx, 800)}ms`;
    card.dataset.id = ticket.id;
    card.dataset.ticketId = (ticket.ticketId || ticket.id || "").trim();
    if (deleteModeActive) card.classList.add("is-delete-mode");
    if (selectedTicketIds.has(ticket.id)) card.classList.add("is-delete-selected");

    const info = document.createElement("div");
    info.className = "ticket-info";

    const title = document.createElement("div");
    title.className = "ticket-title";
    title.textContent = ticket.kachelname || "Ticket";

    const detailsBlock = document.createElement("div");
    detailsBlock.className = "ticket-details-list";
    const detailLines = (ticket.details || "").split("|").map(s => s.trim()).filter(Boolean);
    if (detailLines.length) {
      detailLines.forEach(line => {
        const row = document.createElement("div");
        row.textContent = line;
        detailsBlock.appendChild(row);
      });
    }

    const meta = document.createElement("div");
    meta.className = "ticket-meta";
    meta.textContent = `Datum: ${formatDate(ticket.createdAt)} | Personalnummer ${ticket.personalnummer || "-"} | Filiale: ${ticket.filialnummer || "-"}`;

    info.appendChild(title);
    if (detailLines.length) info.appendChild(detailsBlock);
    info.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "ticket-actions";
    const fav = document.createElement("span");
    fav.className = `ticket-fav${ticket.isFav ? " is-fav" : ""}`;
    fav.textContent = ticket.isFav ? "★" : "☆";
    fav.title = ticket.isFav ? "Favorit entfernen" : "Als Favorit markieren";
    fav.addEventListener("click", () => {
      const all = loadTickets();
      const ticketIndex = all.findIndex(t => t.id === ticket.id);
      if (ticketIndex >= 0) {
        all[ticketIndex].isFav = !all[ticketIndex].isFav;
        saveTickets(all);
        renderTickets();
      }
    });
    actions.appendChild(fav);

    if (deleteModeActive) {
      card.addEventListener("click", evt => {
        if (evt.target.closest(".ticket-actions")) return;
        if (selectedTicketIds.has(ticket.id)) {
          selectedTicketIds.delete(ticket.id);
          card.classList.remove("is-delete-selected");
        } else {
          selectedTicketIds.add(ticket.id);
          card.classList.add("is-delete-selected");
        }
      });
    }

    card.appendChild(info);
    card.appendChild(actions);
    listEl.appendChild(card);
  });

}

function getTypeLabelFromKey(typeKey) {
  switch (typeKey) {
    case "zalando-bestellung":
      return "Zalando Bestellung nicht erf\u00fcllbar";
    case "online-gutscheine":
      return "Online Gutscheine";
    case "zalando-passwort":
      return "Zalando Passwort zur\u00fccksetzen";
    case "sonstiges":
      return "Sonstiges Anliegen";
    case "mboard":
      return "Mboard Probleme";
    default:
      return "Andere";
  }
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[\"\r\n;]/.test(text)) {
    return `"${text.replace(/\"/g, "\"\"")}"`;
  }
  return text;
}

function exportTicketsToCsv(tickets) {
  if (!tickets || !tickets.length) {
    alert("Keine Tickets zum Exportieren.");
    return;
  }

  const header = [
    "Datum",
    "Status",
    "Favorit",
    "Typ",
    "Ticket",
    "Details",
    "Personalnummer",
    "Filialnummer",
    "ID"
  ].join(";");

  const lines = tickets.map(ticket => {
    const typeKey = ticket.typeKey || getTypeKeyFromName(ticket.kachelname);
    return [
      formatDate(ticket.createdAt),
      ticket.done ? "Erledigt" : "Nicht erledigt",
      ticket.isFav ? "Ja" : "Nein",
      getTypeLabelFromKey(typeKey),
      ticket.kachelname || "Ticket",
      (ticket.details || "").split("|").map(s => s.trim()).filter(Boolean).join(" | "),
      ticket.personalnummer || "",
      ticket.filialnummer || "",
      ticket.id || ""
    ].map(csvEscape).join(";");
  });

  const csv = `\uFEFF${header}\n${lines.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filiale = inputs.filNr?.value.trim() || localStorage.getItem(SESSION_KEYS.filNr) || "filiale";
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `tickets_${filiale}_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

if (buttons.homeTab) {
  buttons.homeTab.addEventListener("click", () => showView("tile"));
}
if (buttons.ticketsTab) {
  buttons.ticketsTab.addEventListener("click", () => {
    if (buttons.ticketsTab.disabled) return;
    showView("tickets");
    initTicketFilters();
    renderTickets();
  });
}
if (buttons.handbuchTab) {
  buttons.handbuchTab.addEventListener("click", () => {
    if (buttons.handbuchTab.disabled) return;
    showView("handbuch");
  });
}

// === SharePoint Status Sync ===
// FLOW_URL: Power Automate HTTP endpoint (gleiches Flow-Endpoint, action=status)
// Ticket selector: .ticket-card[data-ticket-id]
// Optional selectors for title/checkbox/badge in TICKET_STATUS_SELECTORS
const FLOW_URL = (typeof API_URL === "string" && API_URL) || "{{HIER_DEINE_FLOW_HTTP_URL}}";
const POLL_INTERVAL_MS = 30000;

const TICKET_STATUS_SELECTORS = {
  ticket: ".ticket-card[data-ticket-id]",
  title: ".ticket-title",
  checkbox: 'input[type="checkbox"]',
  badge: ".ticket-done-badge.done",
  info: ".ticket-info",
  actionButtons: ".ticket-actions button"
};

let ticketStatusPollingTimer = null;
let ticketStatusSyncRunning = false;

function isTicketsViewVisible() {
  if (!containers?.tickets) return false;
  return getComputedStyle(containers.tickets).display !== "none";
}

function collectTicketIdsFromDom() {
  const ids = new Set();
  document.querySelectorAll(TICKET_STATUS_SELECTORS.ticket).forEach(ticketEl => {
    const ticketId = (ticketEl.dataset.ticketId || "").trim();
    if (ticketId) ids.add(ticketId);
  });
  return Array.from(ids);
}

async function fetchStatuses(ticketIds) {
  if (!ticketIds.length) return [];

  const res = await fetch(FLOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "status",
      ticketIds
    })
  });

  if (!res.ok) {
    throw new Error(`Statusabfrage fehlgeschlagen (${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data?.tickets) ? data.tickets : [];
}

async function fetchTicketStatuses(ticketIds) {
  return fetchStatuses(ticketIds);
}

function markTicketDone(ticketEl) {
  ticketEl.classList.add("is-done");
  ticketEl.classList.add("done");

  const checkbox = ticketEl.querySelector(TICKET_STATUS_SELECTORS.checkbox);
  if (checkbox) checkbox.checked = true;

  const existingBadge = ticketEl.querySelector(TICKET_STATUS_SELECTORS.badge);
  if (existingBadge) existingBadge.remove();
}

function markTicketUndone(ticketEl) {
  ticketEl.classList.remove("is-done");
  ticketEl.classList.remove("done");

  const checkbox = ticketEl.querySelector(TICKET_STATUS_SELECTORS.checkbox);
  if (checkbox) checkbox.checked = false;

  const existingBadge = ticketEl.querySelector(TICKET_STATUS_SELECTORS.badge);
  if (existingBadge) existingBadge.remove();

}

function applyStatusesToDom(tickets) {
  if (!Array.isArray(tickets) || !tickets.length) return;

  const statusMap = new Map();
  tickets.forEach(item => {
    const id = (item?.ticketId || "").trim();
    const status = (item?.status || "").trim();
    if (id) statusMap.set(id, status);
  });
  if (!statusMap.size) return;

  // Lokalen Ticket-Status persistieren, damit der UI-Zustand wie beim manuellen Klick bleibt.
  const allTickets = loadTickets();
  let hasLocalChanges = false;
  allTickets.forEach(ticket => {
    const lookupId = (ticket.ticketId || ticket.id || "").trim();
    if (!lookupId) return;
    const status = (statusMap.get(lookupId) || "").trim().toLowerCase();
    if (!status) return;

    const shouldBeDone = status === "fertig";
    if (ticket.done !== shouldBeDone) {
      ticket.done = shouldBeDone;
      hasLocalChanges = true;
    }
  });

  if (hasLocalChanges) {
    saveTickets(allTickets);
    const openCount = allTickets.filter(t => !t.done).length;
    updateTicketsTabLabel(openCount);
    renderTickets();
    return;
  }

  document.querySelectorAll(TICKET_STATUS_SELECTORS.ticket).forEach(ticketEl => {
    const ticketId = (ticketEl.dataset.ticketId || "").trim();
    if (!ticketId) return;
    const status = (statusMap.get(ticketId) || "").trim().toLowerCase();
    if (!status) return;
    if (status === "fertig") {
      markTicketDone(ticketEl);
    } else {
      markTicketUndone(ticketEl);
    }
  });
}

async function refreshTicketStatuses() {
  if (!isTicketsViewVisible()) return;
  if (ticketStatusSyncRunning) return;
  const ticketIds = collectTicketIdsFromDom();
  if (!ticketIds.length) return;

  ticketStatusSyncRunning = true;
  try {
    const tickets = await fetchTicketStatuses(ticketIds);
    applyStatusesToDom(tickets);
  } catch (err) {
    console.warn("Ticket-Status-Sync fehlgeschlagen.", err);
  } finally {
    ticketStatusSyncRunning = false;
  }
}

function startStatusPolling() {
  refreshTicketStatuses();
  if (ticketStatusPollingTimer) return;
  ticketStatusPollingTimer = setInterval(refreshTicketStatuses, POLL_INTERVAL_MS);
}

function startTicketStatusPolling() {
  startStatusPolling();
}

const initialTickets = loadTickets();
const initialOpenCount = initialTickets.filter(t => !t.done).length;
updateTicketsTabLabel(initialOpenCount);

const HANDBUCH_DATA = {
  mboard: {
    title: "M-board",
    subtitle: "Handbuch für M-board, Bestellungen und Versand",
    count: "6 Artikel",
    sections: [
      {
        title: "Grundlagen",
        items: [
          "Anmelden im M-Board",
          "Picklisten nachdrucken",
          "Bestellung melden",
          "M-Board aktualisieren",
          "Neuigkeiten im M-Board",
          "Reservierung",
        ]
      }
    ]
  },
  zalando: {
    title: "Zalando",
    subtitle: "Handbuch für Zalando",
    count: "7 Artikel",
    sections: [
      {
        title: "Grundlagen",
        items: [
          "Anmeldung",
          "Passwort abgelaufen",
          "Bestellungen nachdrucken",
          "Bestellung melden",
          "Stornierungen",
          "Button nicht Verfügbar",
          "Retouren",
        ]
      }
    ]
  },
  umtausch: {
    title: "Stationäres Geschäft",
    subtitle: "Alles rund um Stationäres Geschäft",
    count: "2 Artikel",
    sections: [
      {
        title: "Umtausch",
        items: [
          "Umtausch einer Online Bestellung",
          "Gutscheine",
        ]
      }
    ]
  },
  abschliessen: {
    title: "Abschließen der Bestellungen (Zalando & M-Board)",
    subtitle: "Bestellungen täglich abschließen",
    count: "1 Artikel",
    sections: [
      {
        title: "Abschließen",
        items: [
          "Abschließen der Bestellungen (Zalando & M-Board)",
        ]
      }
    ]
  },
  irics: {
    title: "Irics Grundlagen",
    subtitle: "Grundlagen",
    count: "3 Artikel",
    sections: [
      {
        title: "Irics",
        items: [
          "Online gesperrt",
          "Letztes Update",
          "WE nicht erfasst",
        ]
      }
    ]
  },
  paketversand: {
    title: "Paketversand",
    subtitle: "Atrikel prüfen und Verpackung",
    count: "2 Artikel",
    sections: [
      {
        title: "Bestellungen",
        items: [
          "Artikel prüfen",
          "Richtig verpacken",
        ]
      }
    ]
  },
  onlineshop: {
    title: "Onlineshop Bestellungen",
    subtitle: "Onlineshop Bestellungen & Verpackungen",
    count: "2 Artikel",
    sections: [
      {
        title: "Onlineshop Bestellungen",
        items: [
          "Priorisierung und Verpackung",
          "Vorgehen beim Verpacken",
        ]
      }
    ]
  },
};

let currentHandbuchKey = "mboard";
let currentHandbuchQuery = "";
let handbuchStartIndex = null;

function normalizeHandbuchText(text) {
  return (text || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitHandbuchQuery(query) {
  const normalized = normalizeHandbuchText(query);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

function stripHandbuchHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function buildHandbuchStartIndex() {
  if (handbuchStartIndex) return handbuchStartIndex;
  const index = [];
  Object.keys(HANDBUCH_DATA).forEach(key => {
    const data = HANDBUCH_DATA[key];
    if (!data || !data.sections) return;
    data.sections.forEach(section => {
      (section.items || []).forEach(item => {
        const rawHtml = getHandbuchArticleContent(key, section.title || "", item);
        const contentText = stripHandbuchHtml(rawHtml);
        index.push({
          key,
          collection: data.title || key,
          section: section.title || "",
          title: item,
          content: contentText
        });
      });
    });
  });
  handbuchStartIndex = index;
  return index;
}

function renderHandbuchStartResults(query) {
  const resultsWrap = document.getElementById("handbuchStartResults");
  const listWrap = document.getElementById("handbuchStartResultsList");
  const cardsWrap = document.querySelector(".handbuch-list");
  if (!resultsWrap || !listWrap || !cardsWrap) return;

  const q = normalizeHandbuchText(query).trim();
  if (!q) {
    resultsWrap.style.display = "none";
    listWrap.innerHTML = "";
    cardsWrap.style.display = "flex";
    return;
  }

  const terms = splitHandbuchQuery(q);
  const items = buildHandbuchStartIndex().filter(entry => {
    const haystack = normalizeHandbuchText(
      [entry.title, entry.section, entry.collection, entry.content].filter(Boolean).join(" ")
    );
    if (!haystack) return false;
    if (!terms.length) return false;
    return terms.every(term => haystack.includes(term));
  });

  listWrap.innerHTML = "";
  resultsWrap.style.display = "flex";
  cardsWrap.style.display = "none";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "handbuch-start-result";
    empty.textContent = "Keine passenden Artikel gefunden.";
    listWrap.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "handbuch-start-result";
    row.innerHTML = `
      <div>
        <div class="handbuch-start-result-title">${item.title}</div>
        <div class="handbuch-start-result-meta">${item.collection} · ${item.section}</div>
      </div>
      <div class="handbuch-start-result-chevron">›</div>
    `;
    row.addEventListener("click", () => {
      currentHandbuchKey = item.key;
      renderHandbuchDetail(item.key);
      renderHandbuchArticle(item.section, item.title);
      showView("handbuchArticle");
    });
    listWrap.appendChild(row);
  });
}

function renderHandbuchSections(data, query) {
  const sectionsEl = document.getElementById("handbuchSections");
  if (!sectionsEl) return;
  const q = normalizeHandbuchText(query).trim();
  sectionsEl.innerHTML = "";

  data.sections.forEach(section => {
    const items = q
      ? section.items.filter(item => normalizeHandbuchText(item).includes(q))
      : section.items.slice();

    if (!items.length) return;

    const wrapper = document.createElement("div");
    wrapper.className = "handbuch-section";
    const header = document.createElement("h4");
    header.textContent = section.title;
    wrapper.appendChild(header);

    items.forEach(item => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "handbuch-article";
      row.dataset.sectionTitle = section.title;
      row.dataset.articleTitle = item;
      row.innerHTML = `<span class="handbuch-article-title-text">${item}</span><span class="handbuch-article-chevron">›</span>`;
      wrapper.appendChild(row);
    });

    sectionsEl.appendChild(wrapper);
  });

  const articles = sectionsEl.querySelectorAll(".handbuch-article");
  articles.forEach(article => {
    article.addEventListener("click", () => {
      const sectionTitle = article.dataset.sectionTitle || "";
      const articleTitle = article.dataset.articleTitle || "";
      renderHandbuchArticle(sectionTitle, articleTitle);
      showView("handbuchArticle");
    });
  });
}

function renderHandbuchDetail(key) {
  const data = HANDBUCH_DATA[key];
  if (!data) return;
  const titleEl = document.getElementById("handbuchTitle");
  const subEl = document.getElementById("handbuchSub");
  const countEl = document.getElementById("handbuchCount");
  const crumbEl = document.getElementById("handbuchCrumb");
  if (!titleEl) return;

  currentHandbuchKey = key;
  titleEl.textContent = data.title;
  subEl.textContent = data.subtitle;
  countEl.textContent = data.count;
  if (crumbEl) crumbEl.textContent = data.title;

  renderHandbuchSections(data, currentHandbuchQuery);
}

function initHandbuchLinks() {
  const cards = document.querySelectorAll(".handbuch-card.is-clickable");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      const key = card.dataset.handbuchId;
      renderHandbuchDetail(key);
      showView("handbuchDetail");
    });
  });

  const backLink = document.getElementById("handbuchBackLink");
  if (backLink) {
    backLink.addEventListener("click", e => {
      e.preventDefault();
      showView("handbuch");
    });
  }

  const backArticle = document.getElementById("handbuchArticleBackLink");
  if (backArticle) {
    backArticle.addEventListener("click", e => {
      e.preventDefault();
      renderHandbuchDetail(currentHandbuchKey);
      showView("handbuchDetail");
    });
  }

  const collectionLink = document.getElementById("handbuchArticleCollectionLink");
  if (collectionLink) {
    collectionLink.addEventListener("click", e => {
      e.preventDefault();
      renderHandbuchDetail(currentHandbuchKey);
      showView("handbuchDetail");
    });
  }

  const searchInput = document.getElementById("handbuchSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentHandbuchQuery = searchInput.value;
      renderHandbuchDetail(currentHandbuchKey);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initHandbuchLinks();
  const startSearch = document.getElementById("handbuchStartSearchInput");
  if (startSearch) {
    startSearch.addEventListener("input", () => {
      renderHandbuchStartResults(startSearch.value);
    });
  }
});

const HANDBUCH_ARTICLE_CONTENT = {
  mboard: {
    "Anmelden im M-Board": `
      <div class="handbuch-article-block">
        <p>Neues Browser Fenster &ouml;ffnen und auf den M-Board Button klicken. Bei Anmeldung bitte Organisation &bdquo;Vockeroth&ldquo; eingeben. Bitte mit Fortfahren best&auml;tigen.</p>
        <p>Nun sind E-Mail-Adresse und Passwort gefragt. Bitte in das Feld E-Mail-Adresse klicken und die entsprechende E-Mail-Adresse ausw&auml;hlen. Das Passwort ist gespeichert und wird automatisch ausgef&uuml;llt. Falls nicht, bitte erneut ins Feld klicken und die Anmelde-E-Mail ausw&auml;hlen. Bitte mit Fortfahren best&auml;tigen.</p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Anmelden im M-Board.png" alt="M-Board Anmeldung" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
      </div>
    `,
    "Picklisten nachdrucken": `
      <div class="handbuch-article-block">
        <p>Um Picklisten nachzudrucken, klickt man auf den ersten Button auf der oberen rechten Seite.</p>
        <p>Dieser Button wird gr&uuml;n, wenn die Pickliste gedruckt wurde. Ist der Button wei&szlig;, wurde noch keine Pickliste gedruckt.</p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Pickliste nachdrucken.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
      </div>
    `,
    "Bestellung melden": `
      <div class="handbuch-article-block">
        <p>Um Bestellungen zu melden, klickt Ihr den roten &bdquo;Melden&ldquo; Button auf der rechten Seite. M-Board Bestellungen werden ausschlie&szlig;lich im M-Board gemeldet!</p>
        <p>Wenn eine Bestellung gemeldet wurde, verschwindet diese aus euren offenen Bestellungen.</p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Bestellung melden.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
      </div>
    `,
    "M-Board aktualisieren": `
      <div class="handbuch-article-block">
        <p>Das M‑Board aktualisiert sich nicht immer automatisch. Bitte
        denkt daher daran, es regelmäßig manuell zu aktualisieren. Ihr
        könnt entweder oben rechts auf die drei Punkte klicken und dort
        „Aktualisieren“ im M-Board auswählen, oder alternativ die
        komplette Seite über den runden Pfeil oben links neu laden..<br><br>
        Das hilft auch in Fällen, in denen ihr eine Bestellung nicht sofort
        findet.</p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Aktualisieren.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
      </div>
    `,
    "Neuigkeiten im M-Board": `
      <div class="handbuch-article-block">
        <p>Wenn ihr die kleine Glocke unten rechts anklickt, werden euch wichtige Mitteilungen und Neuigkeiten angezeigt.</p>
        <p>Beispiele:</p>
        <ul>
          <li>Infos zu Aktionen</li>
          <li>Probleme mit dem Versanddienstleister (Versandlabel)</li>
          <li>interne Updates oder wichtige Hinweise.</li>
        </ul>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Neuigkeiten im M-Board.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
      </div>
    `,
    "Reservierung": `
      <div class="handbuch-article-block">
       <p>Reservierungen werden separat im M-Board angezeigt mit dem Status
          “Angekündigt”. Bitte nutzt hierfür den Reiter “Angekündigt”.</p>
          <div style="padding-top: 12px;">
            <img src="web-files/Handbuch_images/M-Board_Reservierungen.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
          </div
          <p>Druckt die Pickliste und drückt den “Picken” Button für das
          Zurücklegen der Ware
          oder den “Melden” Button, wenn ihr die Ware nicht vorhanden
          habt.
          Die Bestellung bleibt nach dem Picken im Reiter “Angekündigt”. Da die
          Reservierungen/Bestellung im Reiter “Angekündigt” bleiben, bitte
          regelmäßig eure Reservierungen kontrollieren. Sobald der Kunde die
          Bestellung bezahlt hat, erscheintz die Bestellung im Reiter “Offen”..
        </p>
      </div>
    `
  },

  zalando: {
    "Anmeldung": `
      <div class="handbuch-article-block">
        <p>Bitte in das Feld E-Mail-Adresse klicken und die entsprechende E-MailAdresse auswählen. Das Passwort ist gespeichert und wird automatisch
        ausgefüllt. Falls nicht, bitte erneut ins Feld klicken und die Anmelde-EMail auswählen. Zum Schluss “Bestätigen” klicken.</p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Anmeldung.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
      </div>
    `,
    "Passwort abgelaufen": `
      <div class="handbuch-article-block">
        <p>Wenn ein neues Passwort benötigt wird, meldet dies bitte über
        das Ticketsystem. Das Onlineteam richtet euch dann ein neues
        Passwort ein und meldet euch wieder an. Gebt dabei bitte auch
        an, an welchen Computern das neue Passwort hinterlegt werden
        soll.</p>
      </div>
    `,
    "Bestellungen nachdrucken": `
      <div class="handbuch-article-block">
        <p>Um Picklisten nachzudrucken, klickt man oben rechts auf den Button
        “Drucke Pickliste”.<p><p>
        Wenn links ein kleiner grüner Haken erscheint, wurde die Pickliste bereits
        gedruckt.</p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Bestellungen nachdrucken.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
      </div>
    `,
    "Bestellung melden": `
      <div class="handbuch-article-block">
        <p>Zalando Bestellungen werden ausschließlich über das Ticketsystem
        gemeldet. Das Online Team bearbeitet diese dann.
        Gemeldete Bestellungen bleiben weiterhin unter „Offene Bestellungen“
        sichtbar und werden nicht automatisch ausgeblendet wie im M‑Board.</p>
      </div>
    `,
    "Stornierungen": `
      <div class="handbuch-article-block">
        <p style="text-decoration: underline; color: red;">Bitte keine Bestellungen stornieren!<p>
        <p>Achtet beim Abschließen unbedingt darauf, nicht versehentlich auf den
        Button „Stornieren“ zu klicken. Dieser wird angezeigt, wenn wir eure
        gemeldeten Anfragen bearbeiten und kein weiterer Bestand für die
        jeweilige Bestellung verfügbar ist.</p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Stornierungen.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
      </div>
    `,
    "Button nicht Verfügbar": `
      <div class="handbuch-article-block">
        <p style="text-decoration: underline; color: red;">Bitte setzt keine Bestellungen eigenständig auf „Nicht verfügbar“.<p>
        <p>Sollte kein Bestand vorhanden sein, übernimmt das Online‑Team die
        Prüfung und stellt die Bestellung entsprechend auf „Nicht verfügbar“.</p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Stornierungen.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
      </div>
    `,
    "Retouren": `
      <div class="handbuch-article-block">
        <p>1. Wenn ihr Zalando‑Retouren erhaltet, bearbeitet diese bitte zeitnah, damit
        der Kunde seine Rückerstattung schnell erhält.<p>
        Solltet ihr eine Retoure bekommen, die nicht von eurer Filiale versendet
        wurde, meldet dies bitte an folgende E‑Mail‑Adresse: onlinevockeroth@vockeroth.com</p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Retouren.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
        <p><br>2. Wenn ihr auf „Retourenmeldung erstellen“ klickt, müsst ihr anschließend
        einen Rückgabegrund auswählen. Dieser steht auf dem Retourenschein.<p>
        Hat der Kunde keinen Grund angegeben, wählt bitte „Kein Grund
        verfügbar“</p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Retouren-2.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
        <p><br>3. Zum Schluss ist es wichtig, dass ihr auf den Button
        „Retourenbestätigung“ klickt. Ohne diesen Schritt wird die Retoure nicht
        verbucht.<p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/M-Board_Retouren-3.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div>
      </div>
    `
  },

  umtausch: {
    "Umtausch einer Online Bestellung": `
      <div class="handbuch-article-block">
        <p>
          1. Der Kunde möchte einen Online gekauften Artikel umtauschen. Wir benötigen von dem Kunden
          einen Rücksendeschein / Lieferschein. Bitte den EAN am Lieferschein und am Etikett vergleichen
          und auf Tragespuren / Defekte prüfen.
        <p>

        <p>
          2. Stimmt die EAN des Lieferscheins mit der EAN am Etikett überein und sind keine Tragespuren /
          Defekte vorhanden kann der Artikel umgetauscht werden.
          <ul class="online-umtausch-bullets">
            <li>Online Retourenschein als Quittung mitgeben</li>
            <li>Das Online Team wird dem Kunden im Nachgang die Gutschrift über die ursprüngliche Zahlungsart übermitteln.</li>
          </ul>
        <p>

        <p>
          3. Hierzu müsst Ihr uns eine Mail schreiben an: <span class="email">online-vockeroth@vockeroth.com</span> mit folgenden Daten:
          <ul class="online-umtausch-bullets">
            <li>Order-ID und Kundennamen (dies findet Ihr oben rechts auf dem Lieferschein)</li>
            <li>Rückgabegrund (falls vorhanden)</li>
            <li>das es ein stationärer Umtausch war</li>
            <li>EAN des Artikels</li>
          </ul>
        <p>

        <p>
          4. Im Anschluss teilen wir euch mit, an welche Filiale ihr den Artikel senden sollt
        <p>     
       
        Prüfung und stellt die Bestellung entsprechend auf „Nicht verfügbar“.</p><br>
        <p style="text-decoration: underline; color: red;">Wichtig: Nicht umlagern<p>
      </div>
    `,
    "Gutscheine": `
      <div class="handbuch-article-block">
        <p>Kommt ein Kunde in den Laden und hat einen Online-Gutschein dabei,
        dann handelt ihr wie folgt:<p>
        <li>Dem Kunde den Betrag von seinem Kaufbetrag abziehen und den
        Gutschein einbehalten</li>
        <li>Ticket erstellen, Gutscheincode + Gutscheinwert angeben</li>
        <li>Gutschein mit den Kassenabschluss Kassenzetteln nach Melsungen
        schicken</li><p>
      </div>
    `
  },

  abschliessen: { 
    "Abschließen der Bestellungen (Zalando & M-Board)": `
      <div class="handbuch-article-block">
        <p>Bitte achtet darauf, dass alle Bestellungen im M-Board und auf Zalando
        ordnungsgemäß am Abend abgeschlossen werden.<p>
      </div>
      <div style="padding-top: 12px;">
        <img src="web-files/Handbuch_images/M-Board_Abschließeen der Bestellungen.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
      </div>
    `
  },

  irics: {
    "Online gesperrt": `
      <div class="handbuch-article-block">
        <p>bedeutet, dass ein Artikel im System vorübergehend nicht für den OnlineVerkauf verfügbar ist. Beispiele dafür sind:<p>
        <li>Wenn ein Artikel beschädigt oder fehlerhaft ist. (Auf die neutrale
        Filiale gebucht wurde)</li>
        <li>Wenn ein Artikel nicht mehr verfügbar ist z. B. weil er ausverkauft ist,
        kann er gesperrt werden, um zu verhindern, dass Kunden ihn
        bestellen.</li>
      </div>
      <div style="padding-top: 12px;">
        <img src="web-files/Handbuch_images/Irics_Online_gesperrt.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
      </div>
    `,
    "Letztes Update": `
      <div class="handbuch-article-block">
        <p>das letzte Update bedeutet, dass Informationen oder Daten im System aktualisiert wurden. Wenn zum Beispiel:<p>
        <li>der Preis eines Produkts geändert wurde</li>
        <li>der Lagerbestand aktualisiert wurde, dann ist das ein Update.</li><br>
        <p>Es ist im Grunde genommen eine Aktualisierung, die im System
        stattgefunden hat.<p>
      </div>
      <div style="padding-top: 12px;">
        <img src="web-files/Handbuch_images/Irics_Letztes_Update.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
      </div>
    `,
    "WE nicht erfasst": `
      <div class="handbuch-article-block">
        <p>Das bedeutet, dass ein Artikel oder eine Ware im System nicht richtig erfasst wurde. Das kann passieren, wenn:<p>
        <li>ein Artikel nicht an der selben Kasse bearbeitet wurde</li>
        <li>der Wareneingang nicht korrekt verbucht wurde.</li>
        <li>Manchmal gibt es technische Probleme, die dazu führen
        können, dass Artikel nicht erfasst werden.
        </li>
        <li>Fehler bei der manuellen Eingabe oder beim Scannen von
        Barcodes können ebenfalls dazu führen, dass Artikel nicht
        korrekt erfasst werden.</li>
      </div>
      <div style="padding-top: 12px;">
        <img src="web-files/Handbuch_images/Irics_WE_nicht_erfasst.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
      </div>
    `
  },
  paketversand: {
    "Artikel prüfen": `
      <div class="handbuch-article-block">
        <p>Bevor der Artikel versendet werdet prüft bitte ob:<p>
        <li>die Rotpreise entfernt sind</li>
        <li>die EAN auf der Pickliste und auf dem Etikett übereinstimmen</li>
        <li>alle Warensicherungen entfernt sind</li>
      </div>
    `,
    "Richtig verpacken": `
      <div class="handbuch-article-block">
      <li>Kleider, BHs, Taschen und Schuhe bitte in Kartons einpacken.</li>
      <li>Die Kleider zusätzlich in Seidenpapier einpacken.</li>
      <li>Die Cups von den BHs sollen nicht ineinander geklappt
      werden, sondern ordentlich aufgeklappt im Karton liegen.</li><br>
      <p>Bitte achtet auf die Größe vom Verpackungsmaterial.<p>
      <li>keine unnötig großen Tüten für z.B. T-Shirts verwenden.</li>
      <li>Dazu könnt Ihr euch auch nochmal den Newsletter
      “Verpacken in verschiedene Karton und Versandtüten”
      anschauen. Dort sind auch die verschiedenen Größen des
      Verpackungsmaterial vermerkt.</li><br>
      <p>Fehlendes Verpackungsmaterial bitte an: b.danzer@vockeroth.com melden.<p>
      </div>
    `
  },

    onlineshop: {
    "Priorisierung und Verpackung": `
      <div class="handbuch-article-block">
        <p>1. Priorisierung<p>
        <p>Online-Shop-Bestellungen werden bitte immer vorrangig bearbeitet.<p><br>
        <p>2. Besondere Verpackungsart (nur für Online-ShopBestellungen) Materialien (werden euch bereitgestellt):<p>
        <li>Seidenpapier</li>
        <li>Sticker</li>
        <li>Vockeroth-Karte</li><br>
      </div>
      <div style="padding-top: 12px;">
        <img src="web-files/Handbuch_images/Onlineshop-Bestellungen_Priorisierung und Verpackung.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
      </div>
    `,
    "Vorgehen beim Verpacken": `
      <div class="handbuch-article-block">
        <p>Schritt 1:<br>
        Artikel vorbereiten<br>
        Wenn möglich, Artikel in A4 Format falten<br>
        Den/die Artikel ordentlich in Seidenpapier falten.<p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/Onlineshop-Bestellungen_Vorgehen beim Verpacken-1.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div><br>
        <p>Schritt 2:<br>
        Verpackung verschließen<br>
        Offene Seite des Seidenpapiers mit einem Sticker verschließen.<p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/Onlineshop-Bestellungen_Vorgehen beim Verpacken.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div><br>
        <p>Verpackten Artikel einmal drehen<p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/Onlineshop-Bestellungen_Vorgehen beim Verpacken-2.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div><br>
        <p>Schritt 3<br><v
        In den Karton legen<br>
        Den verpackten Artikel mit der Sticker-Seite nach oben in eine<br>
        passende Kartonage legen.
        <p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/Onlineshop-Bestellungen_Vorgehen beim Verpacken-3.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div><br>
        <p>Schritt 4:<br>
        Vockeroth-Karte dazulegen
        <p>
        <div style="padding-top: 12px;">
          <img src="web-files/Handbuch_images/Onlineshop-Bestellungen_Vorgehen beim Verpacken-4.png" alt="Picklisten nachdrucken" style="max-width: 100%; border-radius: 10px; border: 1px solid #e6e6e6; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);" />
        </div><br>
        <span style="text-decoration: underline;">WICHTIG:</span><br>
        <span>Geht euch das Material leer, dann schreibt eine E-Mail an:
        online-melsungen@vockeroth.com</span>
        <p>
      </div>
    `
  }
};

function getHandbuchArticleContent(key, sectionTitle, articleTitle) {
  const byKey = HANDBUCH_ARTICLE_CONTENT[key];
  if (!byKey) return "";
  return byKey[articleTitle] || "";
}

function renderHandbuchArticle(sectionTitle, articleTitle) {
  const crumb = document.getElementById("handbuchArticleCollectionLink");
  const section = document.getElementById("handbuchArticleSection");
  const titleCrumb = document.getElementById("handbuchArticleTitleCrumb");
  const title = document.getElementById("handbuchArticleTitle");
  const sub = document.querySelector(".handbuch-article-sub");
  const content = document.getElementById("handbuchArticleContent");
  const data = HANDBUCH_DATA[currentHandbuchKey];
  if (crumb && data) crumb.textContent = data.title;
  if (section) section.textContent = sectionTitle;
  if (titleCrumb) titleCrumb.textContent = articleTitle;
  if (title) title.textContent = articleTitle;
  if (sub) sub.textContent = "";
  if (content) {
    const html = getHandbuchArticleContent(currentHandbuchKey, sectionTitle, articleTitle);
    content.innerHTML = html || "<p>Kein Inhalt vorhanden.</p>";
  }
}
