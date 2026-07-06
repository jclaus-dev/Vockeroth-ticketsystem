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

function setupBlinkingPlaceholder(input) {
  if (!input || input.dataset.keepPlaceholder === "true") return;
  input.addEventListener("focus", () => {
    if (input.value.trim() === "") {
      input.classList.add("blink-placeholder");
      input.placeholder = "Warte auf Eingabe...";
    }
  });

  input.addEventListener("input", () => {
    if (input.value.trim() !== "") {
      input.classList.remove("blink-placeholder");
      input.placeholder = "";
    } else {
      input.classList.add("blink-placeholder");
      input.placeholder = "Warte auf Eingabe...";
    }
  });

  input.addEventListener("blur", () => {
    if (input.value.trim() === "") {
      if (input.dataset.allowEmpty === "true") return;
      setTimeout(() => input.focus(), 10);
    } else {
      input.classList.remove("blink-placeholder");
      input.placeholder = "";
    }
  });
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
