/* Startseite: shared utility helpers */

function hideAllViews() {
  Object.values(containers).forEach(c => {
    if (c) c.style.display = "none";
  });
}

function updateTileSelection() {
  const allowHighlight = !buttons.save.disabled;
  tiles.forEach((tileEl, idx) => {
    const isSelected = allowHighlight && idx === selectedTileIndex && inputMode === "keyboard";
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

function showView(name) {
  hideAllViews();

  document.body.classList.toggle("home-view", name === "tile");
  document.body.classList.toggle("tickets-view", name === "tickets");

  if (containers[name]) containers[name].style.display = "flex";

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

  if (name === "tile" || name === "tickets" || name === "handbuch" || name === "handbuchDetail" || name === "handbuchArticle") {
    if (userFieldsWrapper) userFieldsWrapper.style.display = "flex";
    if (userFields) userFields.style.display = name === "tile" ? "flex" : "none";

    if (name === "tile") {
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
  navFilialPlaceholder.textContent = `Standort ${name}`;
}

let activeCodeBoxBlinkTimer = null;

function stopActiveCodeBoxBlink() {
  if (activeCodeBoxBlinkTimer) {
    clearInterval(activeCodeBoxBlinkTimer);
    activeCodeBoxBlinkTimer = null;
  }

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

  activeCodeBoxBlinkTimer = setInterval(() => {
    const dashed = box.classList.toggle("code-box-active-dashed");
    box.style.borderStyle = dashed ? "dashed" : "solid";
  }, 420);
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

function syncInputPlaceholderState(input) {
  if (!input) return;

  const defaultPlaceholder = input.dataset.defaultPlaceholder ?? input.getAttribute("placeholder") ?? "";
  const keepPlaceholder = input.dataset.keepPlaceholder === "true";
  const isEmpty = input.value.trim() === "";
  const isFocused = document.activeElement === input;
  const shouldShowWaiting = !keepPlaceholder && isFocused && isEmpty;

  input.classList.toggle("blink-placeholder", shouldShowWaiting);
  input.placeholder = shouldShowWaiting ? "Warte auf Eingabe..." : defaultPlaceholder;
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
