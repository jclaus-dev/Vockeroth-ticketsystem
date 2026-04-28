/* Startseite: shared utility helpers */

function hideAllViews() {
  Object.values(containers).forEach(c => {
    if (c) c.style.display = "none";
  });
}

function setConfirmButtonReady(button, isReady) {
  if (!button) return;
  const ready = Boolean(isReady);
  button.style.color = ready ? "green" : "white";
  button.classList.toggle("is-ready", ready);
}

const GENERIC_FLOW_PROGRESS = {
  gutschein: {
    containerKey: "gutschein",
    total: 1,
    current: 1,
    labels: ["Ticketdaten"],
    status: "Ein Schritt"
  },
  pass1: {
    containerKey: "pass1",
    total: 1,
    current: 1,
    labels: ["Grund auswählen"],
    status: "Direktversand"
  },
  pass2: {
    containerKey: "pass2",
    total: 2,
    current: 2,
    labels: ["Grund", "Details & Abschicken"],
    status: "Letzter Schritt"
  },
  sonstiges: {
    containerKey: "sonstiges",
    total: 1,
    current: 1,
    labels: ["Anliegen"],
    status: "Ein Schritt"
  },
  mboard: {
    containerKey: "mboard",
    total: 1,
    current: 1,
    labels: ["Problem"],
    status: "Ein Schritt"
  },
  mboardRetoure: {
    containerKey: "mboardRetoure",
    total: 1,
    current: 1,
    labels: ["Retoure-Daten"],
    status: "Ein Schritt"
  }
};

function ensureGenericFlowProgress(container) {
  if (!container) return null;
  let el = container.querySelector(".flow-progress");
  if (el) return el;
  el = document.createElement("div");
  el.className = "flow-progress";
  container.insertAdjacentElement("afterbegin", el);
  return el;
}

function renderGenericFlowProgress(container, cfg) {
  const progress = ensureGenericFlowProgress(container);
  if (!progress || !cfg) return;
  progress.style.setProperty("--flow-progress-cols", String(Math.max(1, cfg.total)));
  const pills = cfg.labels.map((label, idx) => {
    const stepNumber = idx + 1;
    const classes = [
      "flow-progress-step",
      stepNumber < cfg.current ? "is-done" : "",
      stepNumber === cfg.current ? "is-active" : ""
    ].filter(Boolean).join(" ");
    return `<span class="${classes}">${stepNumber}. ${label}</span>`;
  }).join("");

  progress.innerHTML = `
    <div class="flow-progress-inner">
      <div class="flow-progress-meta">
        <span class="flow-progress-stepcount">Schritt ${cfg.current} von ${cfg.total}</span>
        <span class="flow-progress-status">${cfg.status}</span>
      </div>
      <div class="flow-progress-steps">${pills}</div>
    </div>
  `;
  progress.style.display = "block";
}

function updateGenericFlowProgressByView(viewName) {
  Object.values(GENERIC_FLOW_PROGRESS).forEach(cfg => {
    const container = containers[cfg.containerKey];
    const el = container?.querySelector(".flow-progress");
    if (el) el.style.display = "none";
  });

  const cfg = GENERIC_FLOW_PROGRESS[viewName];
  if (!cfg) return;
  const container = containers[cfg.containerKey];
  if (!container) return;
  renderGenericFlowProgress(container, cfg);
}

function updateTileSelection() {
  tiles.forEach((tileEl, idx) => {
    const isSelectableTile = !tileEl.classList.contains("disabled") && tileEl.dataset.kachelname !== "Coming Soon";
    const isSelected = isSelectableTile && idx === selectedTileIndex && inputMode === "keyboard";
    if (isSelected) {
      tileEl.classList.add("keyboard-selected");
      tileEl.scrollIntoView({ behavior: "smooth", block: "center" });
      tileEl.focus();
    } else {
      tileEl.classList.remove("keyboard-selected");
    }
  });
  localStorage.setItem(SESSION_KEYS.lastTileIndex, selectedTileIndex);
}

function clearFlowInputsForHome() {
  const keepIds = new Set([
    "personalnummer",
    "filialnummer",
    "ticketSearchInput",
    "handbuchSearchInput",
    "handbuchStartSearchInput"
  ]);

  const resetScopes = [
    containers.gutschein,
    containers.best1,
    containers.step2,
    containers.opt1,
    containers.opt2,
    containers.pass1,
    containers.pass2,
    containers.sonstiges,
    containers.mboard,
    containers.mboardRetoure
  ].filter(Boolean);

  resetScopes.forEach(scope => {
    scope.querySelectorAll("input, textarea").forEach(field => {
      if (!field || keepIds.has(field.id)) return;
      field.value = "";
      field.classList?.remove("field-input-invalid");
      if (typeof clearInvalidFieldState === "function") {
        clearInvalidFieldState(field);
      }
    });
  });

  document.querySelectorAll(".field-invalid").forEach(el => el.classList.remove("field-invalid"));

  if (typeof resetGutscheinForm === "function") resetGutscheinForm();
  if (typeof resetZalandoFlowCompletely === "function") resetZalandoFlowCompletely();
  if (typeof preparePasswortStep1 === "function") preparePasswortStep1();

  if (buttons?.sonstConfirm) setConfirmButtonReady(buttons.sonstConfirm, false);
  if (buttons?.mboardConfirm) setConfirmButtonReady(buttons.mboardConfirm, false);
  if (buttons?.passConfirm) setConfirmButtonReady(buttons.passConfirm, false);
  if (typeof zalandoNext !== "undefined" && zalandoNext) setConfirmButtonReady(zalandoNext, false);
  if (typeof confirmBtn !== "undefined" && confirmBtn) setConfirmButtonReady(confirmBtn, false);
  if (buttons?.confirmReason) setConfirmButtonReady(buttons.confirmReason, false);
  if (buttons?.confirmReason2) setConfirmButtonReady(buttons.confirmReason2, false);
  if (buttons?.mboardRetoureConfirm) setConfirmButtonReady(buttons.mboardRetoureConfirm, false);
}

function showView(name) {
  hideAllViews();

  document.body.classList.toggle("home-view", name === "tile");
  document.body.classList.toggle("tickets-view", name === "tickets");
  const isTopBarView = name === "tile" || name === "tickets" || name === "handbuch" || name === "handbuchDetail" || name === "handbuchArticle";
  document.body.classList.toggle("flow-view", !isTopBarView);

  if (containers[name]) containers[name].style.display = "flex";
  if (typeof updateZalandoProgressByView === "function") {
    updateZalandoProgressByView(name);
  }
  updateGenericFlowProgressByView(name);

  if (buttons.homeTab && buttons.ticketsTab) {
    const isHome = name === "tile";
    const isTickets = name === "tickets";
    const isHandbuch = name === "handbuch" || name === "handbuchDetail" || name === "handbuchArticle";
    buttons.homeTab.classList.toggle("is-active", isHome);
    buttons.ticketsTab.classList.toggle("is-active", isTickets);
    if (buttons.handbuchTab) {
      buttons.handbuchTab.classList.toggle("is-active", isHandbuch);
    }
  }

  if (isTopBarView) {
    if (userFieldsWrapper) userFieldsWrapper.style.display = "flex";
    if (userFields) userFields.style.display = name === "tile" ? "flex" : "none";

    if (name === "tile") {
      clearFlowInputsForHome();
      if (!inputs.persNr.value.trim()) {
        inputs.persNr.focus();
      } else if (!inputs.filNr.value.trim()) {
        inputs.filNr.focus();
      } else {
        updateTileSelection();
      }
    }
  } else {
    if (userFieldsWrapper) userFieldsWrapper.style.display = "none";
  }
}

function focusDelayed(el) {
  setTimeout(() => el && el.focus(), 50);
}

function getNewsletterPdfUrl(fileName) {
  return `PDF/${encodeURIComponent(fileName).replace(/%2F/g, "/")}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
}

function getNewsletterDisplayTitle(fileName) {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/^\d+(?:\.\d+)?\.\s+/, "")
    .replace(/\s+copy$/i, "")
    .replace(/_/g, " ")
    .trim();
}

const NEWSLETTER_FILES = [
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

const NEWSLETTER_FILES_RESOLVED = [
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

let newsletterState = {
  activeFile: "",
  visibleStart: 0
};

function initializeNewsletterQuickSelect() {
  const quickSelect = document.getElementById("newsletterQuickSelect");
  const morePanel = document.getElementById("newsletterMorePanel");
  const emptyState = document.getElementById("newsletterEmpty");
  const frame = document.getElementById("newsletterFrame");
  const titleEl = document.getElementById("newsletterCurrentName");
  const fullscreenBtn = document.getElementById("newsletterFullscreenBtn");
  const frameWrap = frame ? frame.closest(".newsletter-pdf-frame") : null;
  if (!quickSelect || !morePanel || !emptyState || !frame || !titleEl) return;

  if (fullscreenBtn && frameWrap && !fullscreenBtn.dataset.fullscreenBound) {
    fullscreenBtn.dataset.fullscreenBound = "true";
    fullscreenBtn.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement === frameWrap) {
          await document.exitFullscreen();
          return;
        }
        await frameWrap.requestFullscreen();
      } catch (error) {
        console.warn("Newsletter-Vollbild konnte nicht geöffnet werden.", error);
      }
    });
  }

  const fileNames = NEWSLETTER_FILES_RESOLVED.slice();

  const numberedDocs = fileNames
    .map(file => {
      const match = file.match(/^(\d+(?:\.\d+)?)\.\s+(.+)\.pdf$/i);
      if (!match) return null;
      return {
        order: Number.parseFloat(match[1]),
        title: getNewsletterDisplayTitle(file),
        file
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.order - a.order);

  const extraDocs = fileNames
    .filter(file => !/^\d+(?:\.\d+)?\.\s+.+\.pdf$/i.test(file))
    .map(file => ({
      order: null,
      title: getNewsletterDisplayTitle(file),
      file
    }));

  if (!numberedDocs.length) {
    quickSelect.style.display = "none";
    morePanel.innerHTML = "";
    emptyState.style.display = "block";
    emptyState.textContent = "Aktuell ist kein nummerierter Newsletter vorhanden.";
    frame.style.display = "none";
    titleEl.textContent = "Kein aktueller Newsletter";
    return;
  }

  quickSelect.style.display = "grid";
  emptyState.style.display = "none";
  frame.style.display = "block";

  let activeFile = numberedDocs.some(doc => doc.file === newsletterState.activeFile)
    ? newsletterState.activeFile
    : numberedDocs[0].file;
  const allDocs = [...numberedDocs, ...extraDocs];
  const maxVisible = 3;
  let visibleStart = Math.max(0, Math.min(newsletterState.visibleStart || 0, Math.max(0, allDocs.length - maxVisible)));

  function createDocButton(doc, extraClass = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `newsletter-quick-btn${doc.file === activeFile ? " is-active" : ""}${extraClass ? ` ${extraClass}` : ""}`;
    if (doc.file === numberedDocs[0].file) {
      const badge = document.createElement("span");
      badge.className = "newsletter-new-badge";
      badge.textContent = "NEW";
      btn.appendChild(badge);
    }

    const label = document.createElement("span");
    label.className = "newsletter-btn-label";
    label.textContent = doc.title;
    btn.appendChild(label);
    btn.addEventListener("click", () => {
      activeFile = doc.file;
      frame.src = `${getNewsletterPdfUrl(doc.file)}&reload=${Date.now()}`;
      titleEl.textContent = doc.title;
      newsletterState.activeFile = activeFile;
      renderButtons();
    });
    return btn;
  }

  function renderButtons() {
    quickSelect.innerHTML = "";
    morePanel.innerHTML = "";
    morePanel.classList.remove("is-open");

    const showNav = allDocs.length > maxVisible;
    if (showNav) {
      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "newsletter-nav-btn";
      prevBtn.textContent = "<";
      prevBtn.disabled = visibleStart === 0;
      prevBtn.addEventListener("click", () => {
        visibleStart = Math.max(0, visibleStart - 1);
        newsletterState.visibleStart = visibleStart;
        renderButtons();
      });
      quickSelect.appendChild(prevBtn);
    }

    allDocs.slice(visibleStart, visibleStart + maxVisible).forEach(doc => {
      quickSelect.appendChild(createDocButton(doc));
    });

    if (showNav) {
      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "newsletter-nav-btn";
      nextBtn.textContent = ">";
      nextBtn.disabled = visibleStart >= allDocs.length - maxVisible;
      nextBtn.addEventListener("click", () => {
        visibleStart = Math.min(allDocs.length - maxVisible, visibleStart + 1);
        newsletterState.visibleStart = visibleStart;
        renderButtons();
      });
      quickSelect.appendChild(nextBtn);
    }
  }

  titleEl.textContent = (numberedDocs.find(doc => doc.file === activeFile) || numberedDocs[0]).title;
  frame.src = `${getNewsletterPdfUrl(activeFile)}&reload=${Date.now()}`;
  newsletterState.activeFile = activeFile;
  newsletterState.visibleStart = visibleStart;
  renderButtons();
}

let newsletterRefreshTimer = null;
let newsletterFilesCache = NEWSLETTER_FILES_RESOLVED.slice();
let newsletterRefreshInFlight = false;
let newsletterUiInitialized = false;

async function fetchNewsletterFilesFromManifest() {
  const res = await fetch(`PDF/newsletters.json?ts=${Date.now()}`, {
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Newsletter-Manifest ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.files)) return data.files;
  return [];
}

function normalizeNewsletterFiles(files) {
  return (files || [])
    .map(file => (file || "").toString().trim())
    .filter(file => /\.pdf$/i.test(file))
    .filter((file, index, list) => list.indexOf(file) === index);
}

async function refreshNewsletterFiles() {
  if (newsletterRefreshInFlight) return newsletterFilesCache;
  newsletterRefreshInFlight = true;
  try {
    const files = await fetchNewsletterFilesFromManifest();
    const normalized = normalizeNewsletterFiles(files);
    if (normalized.length) {
      newsletterFilesCache = normalized;
    }
  } catch {
    newsletterFilesCache = NEWSLETTER_FILES_RESOLVED.slice();
  } finally {
    newsletterRefreshInFlight = false;
  }
  return newsletterFilesCache;
}

function renderNewsletterQuickSelect() {
  const quickSelect = document.getElementById("newsletterQuickSelect");
  const morePanel = document.getElementById("newsletterMorePanel");
  const emptyState = document.getElementById("newsletterEmpty");
  const frame = document.getElementById("newsletterFrame");
  const titleEl = document.getElementById("newsletterCurrentName");
  if (!quickSelect || !morePanel || !emptyState || !frame || !titleEl) return;

  const fileNames = newsletterFilesCache.slice();
  const numberedDocs = fileNames
    .map(file => {
      const match = file.match(/^(\d+(?:\.\d+)?)\.\s+(.+)\.pdf$/i);
      if (!match) return null;
      return {
        order: Number.parseFloat(match[1]),
        title: getNewsletterDisplayTitle(file),
        file
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.order - a.order);

  const extraDocs = fileNames
    .filter(file => !/^\d+(?:\.\d+)?\.\s+.+\.pdf$/i.test(file))
    .map(file => ({
      order: null,
      title: getNewsletterDisplayTitle(file),
      file
    }));

  if (!numberedDocs.length) {
    quickSelect.style.display = "none";
    morePanel.innerHTML = "";
    emptyState.style.display = "block";
    emptyState.textContent = "Aktuell ist kein nummerierter Newsletter vorhanden.";
    frame.style.display = "none";
    titleEl.textContent = "Kein aktueller Newsletter";
    return;
  }

  quickSelect.style.display = "grid";
  emptyState.style.display = "none";
  frame.style.display = "block";

  const activeFile = numberedDocs.some(doc => doc.file === newsletterState.activeFile)
    ? newsletterState.activeFile
    : numberedDocs[0].file;
  const allDocs = [...numberedDocs, ...extraDocs];
  const maxVisible = 3;
  const visibleStart = Math.max(0, Math.min(newsletterState.visibleStart || 0, Math.max(0, allDocs.length - maxVisible)));

  function createDocButton(doc, extraClass = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `newsletter-quick-btn${doc.file === activeFile ? " is-active" : ""}${extraClass ? ` ${extraClass}` : ""}`;
    if (doc.file === numberedDocs[0].file) {
      const badge = document.createElement("span");
      badge.className = "newsletter-new-badge";
      badge.textContent = "NEW";
      btn.appendChild(badge);
    }

    const label = document.createElement("span");
    label.className = "newsletter-btn-label";
    label.textContent = doc.title;
    btn.appendChild(label);
    btn.addEventListener("click", () => {
      newsletterState.activeFile = doc.file;
      frame.src = `${getNewsletterPdfUrl(doc.file)}&reload=${Date.now()}`;
      titleEl.textContent = doc.title;
      renderNewsletterQuickSelect();
    });
    return btn;
  }

  quickSelect.innerHTML = "";
  morePanel.innerHTML = "";
  morePanel.classList.remove("is-open");

  const showNav = allDocs.length > maxVisible;
  if (showNav) {
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "newsletter-nav-btn";
    prevBtn.textContent = "<";
    prevBtn.disabled = visibleStart === 0;
    prevBtn.addEventListener("click", () => {
      newsletterState.visibleStart = Math.max(0, visibleStart - 1);
      renderNewsletterQuickSelect();
    });
    quickSelect.appendChild(prevBtn);
  }

  allDocs.slice(visibleStart, visibleStart + maxVisible).forEach(doc => {
    quickSelect.appendChild(createDocButton(doc));
  });

  if (showNav) {
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "newsletter-nav-btn";
    nextBtn.textContent = ">";
    nextBtn.disabled = visibleStart >= allDocs.length - maxVisible;
    nextBtn.addEventListener("click", () => {
      newsletterState.visibleStart = Math.min(allDocs.length - maxVisible, visibleStart + 1);
      renderNewsletterQuickSelect();
    });
    quickSelect.appendChild(nextBtn);
  }

  titleEl.textContent = (numberedDocs.find(doc => doc.file === activeFile) || numberedDocs[0]).title;
  frame.src = `${getNewsletterPdfUrl(activeFile)}&reload=${Date.now()}`;
  newsletterState.activeFile = activeFile;
  newsletterState.visibleStart = visibleStart;
}

function initializeNewsletterQuickSelect() {
  const quickSelect = document.getElementById("newsletterQuickSelect");
  const morePanel = document.getElementById("newsletterMorePanel");
  const emptyState = document.getElementById("newsletterEmpty");
  const frame = document.getElementById("newsletterFrame");
  const titleEl = document.getElementById("newsletterCurrentName");
  const fullscreenBtn = document.getElementById("newsletterFullscreenBtn");
  const frameWrap = frame ? frame.closest(".newsletter-pdf-frame") : null;
  if (!quickSelect || !morePanel || !emptyState || !frame || !titleEl) return;

  if (fullscreenBtn && frameWrap && !fullscreenBtn.dataset.fullscreenBound) {
    fullscreenBtn.dataset.fullscreenBound = "true";
    fullscreenBtn.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement === frameWrap) {
          await document.exitFullscreen();
          return;
        }
        await frameWrap.requestFullscreen();
      } catch (error) {
        console.warn("Newsletter-Vollbild konnte nicht geöffnet werden.", error);
      }
    });
  }

  if (!newsletterUiInitialized) {
    newsletterUiInitialized = true;
    refreshNewsletterFiles().then(() => {
      renderNewsletterQuickSelect();
    });

    if (newsletterRefreshTimer) clearInterval(newsletterRefreshTimer);
    newsletterRefreshTimer = setInterval(async () => {
      await refreshNewsletterFiles();
      renderNewsletterQuickSelect();
    }, 15000);
    return;
  }

  renderNewsletterQuickSelect();
}

function disableAllTiles() {
  tiles.forEach(t => {
    t.classList.add("disabled");
    t.tabIndex = -1;
  });
}

function enableAllTiles() {
  tiles.forEach(t => {
    if (t.dataset.kachelname !== "Coming Soon") {
      t.classList.remove("disabled");
      t.tabIndex = 0;
    }
  });
}

function updateFilialPlaceholder() {
  const nr = inputs.filNr.value.trim();
  const name = FILIAL_MAP[nr] || "unbekannt";
  navFilialPlaceholder.textContent = `${name}`;
}

const WAITING_PLACEHOLDER_TEXT = "Warte auf Eingabe";
const waitingPlaceholderTimers = new WeakMap();

function stopActiveCodeBoxBlink() {
  document.querySelectorAll(".code-box.code-box-active, .code-box.code-box-active-dashed").forEach(box => {
    box.classList.remove("code-box-active", "code-box-active-dashed");
    box.style.borderStyle = "solid";
  });
}

function startActiveCodeBoxBlink(box) {
  if (!box) return;

  stopActiveCodeBoxBlink();
  box.classList.add("code-box-active");
  box.style.borderStyle = "solid";
}

function clearActiveCodeBoxState() {
  stopActiveCodeBoxBlink();
}

function setCodeBoxActiveState(input, isActive) {
  const box = input?.closest(".code-box");
  if (!box) return;
  if (input?.dataset.skipActiveBoxBlink === "true") {
    box.classList.remove("code-box-active", "code-box-active-dashed");
    box.style.borderStyle = "solid";
    return;
  }
  if (isActive) {
    startActiveCodeBoxBlink(box);
    return;
  }
  if (box.classList.contains("code-box-active") || box.classList.contains("code-box-active-dashed")) {
    box.classList.remove("code-box-active", "code-box-active-dashed");
    box.style.borderStyle = "solid";
    if (!document.querySelector(".code-box.code-box-active")) {
      stopActiveCodeBoxBlink();
    }
  }
}

function stopWaitingPlaceholderBlink(input) {
  if (!input) return;
  const timer = waitingPlaceholderTimers.get(input);
  if (timer) {
    clearInterval(timer);
    waitingPlaceholderTimers.delete(input);
  }
  input.dataset.waitingPlaceholderVisible = "false";
}

function startWaitingPlaceholderBlink(input) {
  if (!input || waitingPlaceholderTimers.has(input)) return;
  input.dataset.waitingPlaceholderVisible = "true";

  const timer = setInterval(() => {
    if (!document.body.contains(input)) {
      stopWaitingPlaceholderBlink(input);
      return;
    }
    const keepPlaceholder = input.dataset.keepPlaceholder === "true";
    const isFocused = document.activeElement === input;
    const isEmpty = input.value.trim() === "";
    if (keepPlaceholder || !isFocused || !isEmpty) {
      stopWaitingPlaceholderBlink(input);
      return;
    }
    const visible = input.dataset.waitingPlaceholderVisible === "true";
    input.dataset.waitingPlaceholderVisible = visible ? "false" : "true";
    input.placeholder = visible ? "" : WAITING_PLACEHOLDER_TEXT;
  }, 520);

  waitingPlaceholderTimers.set(input, timer);
}

function syncInputPlaceholderState(input) {
  if (!input) return;

  const defaultPlaceholder = input.dataset.defaultPlaceholder ?? input.getAttribute("placeholder") ?? "";
  const keepPlaceholder = input.dataset.keepPlaceholder === "true";
  const isEmpty = input.value.trim() === "";
  const isFocused = document.activeElement === input;
  const shouldShowWaiting = !keepPlaceholder && isFocused && isEmpty;

  input.classList.toggle("blink-placeholder", shouldShowWaiting);
  if (shouldShowWaiting) {
    if (input.dataset.waitingPlaceholderVisible !== "false") {
      input.placeholder = WAITING_PLACEHOLDER_TEXT;
    }
    startWaitingPlaceholderBlink(input);
  } else {
    stopWaitingPlaceholderBlink(input);
    input.placeholder = defaultPlaceholder;
  }
  setCodeBoxActiveState(input, isFocused);
}

function setupBlinkingPlaceholder(input) {
  if (!input || input.dataset.placeholderSetup === "true") return;
  input.dataset.placeholderSetup = "true";
  input.dataset.defaultPlaceholder = input.getAttribute("placeholder") ?? "";
  input.dataset.skipActiveBoxBlink = input.id === "personalnummer" || input.id === "filialnummer" ? "true" : "false";

  input.addEventListener("focus", () => {
    syncInputPlaceholderState(input);
  });

  input.addEventListener("input", () => {
    syncInputPlaceholderState(input);
  });

  input.addEventListener("blur", () => {
    stopWaitingPlaceholderBlink(input);
    if (input.value.trim() === "") {
      syncInputPlaceholderState(input);
      if (input.dataset.allowEmpty === "true") return;
      setTimeout(() => {
        const active = document.activeElement;
        if (active && active !== input) {
          if (active.matches?.("input, textarea, button, [tabindex]")) return;
          if (active.closest?.(".code-box")) return;
        }
        input.focus();
      }, 10);
      return;
    }
    syncInputPlaceholderState(input);
  });

  syncInputPlaceholderState(input);
}

function setupCodeBoxClickFocus() {
  document.addEventListener("click", evt => {
    const box = evt.target.closest(".code-box");
    if (!box) return;
    if (evt.target.matches("input, textarea")) return;

    const field = box.querySelector("input, textarea");
    if (!field) return;
    if (field.disabled || field.readOnly) return;

    field.focus();
    if (typeof field.setSelectionRange === "function") {
      const len = field.value ? field.value.length : 0;
      field.setSelectionRange(len, len);
    }
  });
}

setupCodeBoxClickFocus();

function initKeyboardShortcutsHint() {
  if (document.getElementById("keyboardShortcutsHint")) return;
  const wrap = document.createElement("div");
  wrap.id = "keyboardShortcutsHint";
  wrap.className = "keyboard-shortcuts-hint";
  wrap.innerHTML = `
    <div class="keyboard-shortcuts-subtle">Probier mal die Tastatursteurung aus.</div>
    <div class="keyboard-shortcuts-title">Shortcuts</div>
    <div class="keyboard-shortcuts-items">
      <span><kbd>Enter</kbd> bestätigen</span>
      <span><kbd>←</kbd> <kbd>→</kbd> Navigation</span>
    </div>
  `;
  document.body.appendChild(wrap);
}


