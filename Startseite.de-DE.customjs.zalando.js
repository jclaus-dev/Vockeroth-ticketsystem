/* Startseite: Zalando flow */

const eanFields = [
  { input: inputs.ean1, box: box1 },
  { input: inputs.ean2, box: box2 },
  { input: inputs.ean3, box: box3 },
  { input: inputs.ean4, box: box4 }
].filter(field => field.input && field.box);

let activeEanCount = 1;
const opt1Headline = document.querySelector("#containerBestellungOpt1 h2");
const ZALANDO_BORDER_COLORS = {
  default: "black",
  valid: "green",
  invalid: "#d64545"
};
const ZALANDO_FLOW_STEPS = [
  { key: "best1", label: "Bestellnummer" },
  { key: "step2", label: "EAN" },
  { key: "opt", label: "Grund & Senden" }
];
const ZALANDO_REASON_STATS_KEY = "zalandoReasonStats";

function loadZalandoReasonStats() {
  try {
    const raw = localStorage.getItem(ZALANDO_REASON_STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const normalized = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const reason = String(key || "").trim();
      const count = Number(value);
      if (!reason || !Number.isFinite(count) || count <= 0) return;
      normalized[reason] = Math.floor(count);
    });
    return normalized;
  } catch {
    return {};
  }
}

function saveZalandoReasonStats(stats) {
  try {
    localStorage.setItem(ZALANDO_REASON_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage issues
  }
}

function rememberRecentZalandoReasons(reasons) {
  const incoming = Array.isArray(reasons)
    ? reasons.map(item => String(item || "").trim()).filter(Boolean)
    : [];
  if (!incoming.length) return;
  const current = loadZalandoReasonStats();
  incoming.forEach(reason => {
    current[reason] = (current[reason] || 0) + 1;
  });
  saveZalandoReasonStats(current);
}

function getOrderedZalandoReasons(reasons) {
  const base = Array.isArray(reasons) ? reasons.slice() : [];
  const stats = loadZalandoReasonStats();
  if (!Object.keys(stats).length) return base;
  return base
    .map((reason, idx) => ({ reason, idx, score: Number(stats[reason] || 0) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.idx - b.idx;
    })
    .map(item => item.reason);
}

function getZalandoFlowStepIndex(viewName) {
  if (viewName === "best1") return 0;
  if (viewName === "step2") return 1;
  if (viewName === "opt1" || viewName === "opt2") return 2;
  return -1;
}

function renderZalandoProgressInto(container, stepIndex) {
  if (!container) return;
  let progress = container.querySelector(".zalando-flow-progress");
  if (!progress) {
    progress = document.createElement("div");
    progress.className = "zalando-flow-progress";
    container.insertAdjacentElement("afterbegin", progress);
  }

  const dots = ZALANDO_FLOW_STEPS.map((step, idx) => {
    const classes = [
      "zalando-flow-progress-step",
      idx < stepIndex ? "is-done" : "",
      idx === stepIndex ? "is-active" : ""
    ].filter(Boolean).join(" ");
    return `<span class="${classes}">${idx + 1}. ${step.label}</span>`;
  }).join("");

  const isLastStep = stepIndex === 2;
  const stepText = `Schritt ${stepIndex + 1} von ${ZALANDO_FLOW_STEPS.length}`;
  const statusClass = isLastStep ? "is-warning" : "is-safe";
  const statusText = isLastStep ? "Letzter Schritt" : "Zwischenschritt";
  progress.innerHTML = `
    <div class="zalando-flow-progress-meta">
      <span class="zalando-flow-progress-stepcount">${stepText}</span>
      <span class="zalando-flow-progress-status ${statusClass}">${statusText}</span>
    </div>
    <div class="zalando-flow-progress-steps">${dots}</div>
  `;
}

function updateZalandoProgressByView(viewName) {
  const stepIndex = getZalandoFlowStepIndex(viewName);
  const targets = [
    containers.best1,
    containers.step2,
    containers.opt1,
    containers.opt2
  ];

  if (stepIndex < 0) {
    targets.forEach(container => {
      const progress = container?.querySelector(".zalando-flow-progress");
      if (progress) progress.style.display = "none";
    });
    return;
  }

  targets.forEach(container => {
    if (!container) return;
    renderZalandoProgressInto(container, stepIndex);
    const progress = container.querySelector(".zalando-flow-progress");
    if (progress) progress.style.display = "block";
  });

  updateZalandoSubmitHint(viewName);
}

function updateZalandoSubmitHint(viewName) {
  const show = viewName === "opt1" || viewName === "opt2";
  const submitButtons = [buttons.confirmReason, buttons.confirmReason2].filter(Boolean);
  submitButtons.forEach(btn => {
    btn.classList.toggle("is-final-submit", show);
    if (show) {
      btn.setAttribute("aria-label", "Ticket abschicken");
      btn.setAttribute("title", "Ticket abschicken");
    } else {
      btn.removeAttribute("title");
      btn.removeAttribute("aria-label");
    }
  });

  document.querySelectorAll(".zalando-submit-hint").forEach(el => el.remove());
}

window.updateZalandoProgressByView = updateZalandoProgressByView;

function setBoxState(box, state) {
  if (!box) return;
  box.classList.remove("field-invalid");
  if (state === "valid") {
    box.style.borderColor = ZALANDO_BORDER_COLORS.valid;
    return;
  }
  if (state === "invalid") {
    box.classList.add("field-invalid");
    box.style.borderColor = ZALANDO_BORDER_COLORS.invalid;
    return;
  }
  box.style.borderColor = ZALANDO_BORDER_COLORS.default;
}

function showMissingFieldHint() {
  if (typeof showToast === "function") {
    showToast("Bitte alle Pflichtfelder ausfüllen.");
  }
}

function updateAddSecondEanPosition() {
  const lastActiveIdx = Math.max(0, activeEanCount - 1);
  const anchorBox = eanFields[lastActiveIdx]?.box || box1;
  if (anchorBox && buttons.addSecondEAN) {
    anchorBox.insertAdjacentElement("afterend", buttons.addSecondEAN);
  }
  buttons.addSecondEAN.style.display = activeEanCount >= eanFields.length ? "none" : "flex";
}

function removeEanAt(indexToRemove) {
  if (indexToRemove <= 0 || indexToRemove >= activeEanCount) return;

  // Shift following values left so active fields stay contiguous.
  for (let i = indexToRemove; i < activeEanCount - 1; i += 1) {
    eanFields[i].input.value = eanFields[i + 1].input.value;
  }
  eanFields[activeEanCount - 1].input.value = "";
  setBoxState(eanFields[activeEanCount - 1].box, "default");

  activeEanCount -= 1;
  for (let i = 1; i < eanFields.length; i += 1) {
    eanFields[i].box.style.display = i < activeEanCount ? "flex" : "none";
  }

  updateAddSecondEanPosition();
  const focusIndex = Math.min(indexToRemove, activeEanCount - 1);
  if (eanFields[focusIndex]?.input) eanFields[focusIndex].input.focus();
  updateConfirmState();
}

function setupEanRemoveButtons() {
  for (let idx = 1; idx < eanFields.length; idx += 1) {
    const field = eanFields[idx];
    if (!field?.box) continue;
    if (field.box.querySelector(".ean-remove-btn")) continue;

    field.box.style.position = "relative";
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "ean-remove-btn";
    removeBtn.setAttribute("aria-label", `EAN ${idx + 1} entfernen`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", evt => {
      evt.preventDefault();
      evt.stopPropagation();
      removeEanAt(idx);
    });
    field.box.appendChild(removeBtn);
  }
}

function resetZalandoStep2() {
  inputs.ean1.value = "";
  inputs.ean2.value = "";
  inputs.ean3.value = "";
  inputs.ean4.value = "";
  [box1, box2, box3, box4].forEach((box, idx) => {
    if (!box) return;
    setBoxState(box, "default");
    if (idx > 0) box.style.display = "none";
  });
  activeEanCount = 1;
  updateAddSecondEanPosition();
  setAddSecondEanKeyboardHighlight(false);
  setConfirmButtonReady(confirmBtn, false);
}

zalandoNext.addEventListener("click", () => {
  if (!inputs.best1.value.trim()) {
    setBoxState(box1, "invalid");
    markInvalidField(inputs.best1);
    showMissingFieldHint();
    focusDelayed(inputs.best1);
    return;
  }
  showView("step2");
  focusDelayed(inputs.ean1);
});

inputs.best1.addEventListener("input", () => {
  inputs.best1.value = inputs.best1.value.replace(/\D/g, "");
  const ok = inputs.best1.value.trim();
  setBoxState(document.getElementById("box1"), ok ? "valid" : "default");
  setConfirmButtonReady(zalandoNext, Boolean(ok));
});

inputs.best1.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    zalandoNext.click();
  }
});

function updateConfirmState() {
  let allValid = true;
  eanFields.forEach((field, idx) => {
    if (idx >= activeEanCount) return;
    const val = field.input.value.trim();
    const valid = val !== "";
    setBoxState(field.box, valid ? "valid" : "default");
    if (!valid) allValid = false;
  });
  setConfirmButtonReady(confirmBtn, allValid);
}

function getVisibleEanIndices() {
  const indices = [];
  for (let i = 0; i < activeEanCount; i += 1) {
    if (eanFields[i]?.input) indices.push(i);
  }
  return indices;
}

function focusEanByDelta(currentIndex, delta) {
  const visible = getVisibleEanIndices();
  const pos = visible.indexOf(currentIndex);
  if (pos < 0) return false;
  const nextPos = pos + delta;
  if (nextPos < 0 || nextPos >= visible.length) return false;
  const nextInput = eanFields[visible[nextPos]]?.input;
  if (!nextInput) return false;
  nextInput.focus();
  return true;
}

function setAddSecondEanKeyboardHighlight(active) {
  if (!buttons.addSecondEAN) return;
  buttons.addSecondEAN.classList.toggle("code-box-active-dashed", Boolean(active));
}

eanFields.forEach((field, idx) => {
  field.input.addEventListener("input", () => {
    field.input.value = field.input.value.replace(/\D/g, "");
    updateConfirmState();
  });
  field.input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const moved = focusEanByDelta(idx, 1);
      if (!moved && buttons.addSecondEAN && buttons.addSecondEAN.style.display !== "none") {
        buttons.addSecondEAN.focus();
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      focusEanByDelta(idx, -1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const nextIdx = idx + 1;
      if (nextIdx < activeEanCount) {
        eanFields[nextIdx].input.focus();
      } else if (confirmBtn.classList.contains("is-ready")) {
        confirmBtn.click();
      }
    }
  });
});

if (buttons.addSecondEAN) {
  buttons.addSecondEAN.tabIndex = 0;
  buttons.addSecondEAN.addEventListener("focus", () => setAddSecondEanKeyboardHighlight(true));
  buttons.addSecondEAN.addEventListener("blur", () => setAddSecondEanKeyboardHighlight(false));
  buttons.addSecondEAN.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const lastVisible = Math.max(0, activeEanCount - 1);
      const target = eanFields[lastVisible]?.input || inputs.ean1;
      if (target) target.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      buttons.addSecondEAN.click();
    }
  });
}

buttons.addSecondEAN.addEventListener("click", () => {
  if (activeEanCount >= eanFields.length) return;
  setAddSecondEanKeyboardHighlight(false);
  const nextField = eanFields[activeEanCount];
  nextField.box.style.display = "flex";
  activeEanCount += 1;
  updateAddSecondEanPosition();
  // If nothing is typed yet, keep the cursor in the first EAN field.
  const hasTypedAnyEan = eanFields.some(field => field.input.value.trim() !== "");
  if (!hasTypedAnyEan) {
    inputs.ean1.focus();
  } else {
    nextField.input.focus();
  }
  updateConfirmState();
});

if (backBtn) {
  backBtn.addEventListener("click", () => {
    resetZalandoStep2();
    showView("best1");
    focusDelayed(inputs.best1);
  });
}

function goBackToEanStep() {
  showView("step2");
  focusDelayed(inputs.ean1);
  updateConfirmState();
}

if (buttons.reasonPrev1) {
  buttons.reasonPrev1.addEventListener("click", goBackToEanStep);
}
if (buttons.reasonPrev2) {
  buttons.reasonPrev2.addEventListener("click", goBackToEanStep);
}

confirmBtn.addEventListener("click", () => {
  const eans = [];
  let firstInvalidField = null;
  for (let i = 0; i < activeEanCount; i += 1) {
    const val = eanFields[i].input.value.trim();
    if (!val) {
      setBoxState(eanFields[i].box, "invalid");
      markInvalidField(eanFields[i].input);
      if (!firstInvalidField) firstInvalidField = eanFields[i].input;
      continue;
    }
    setBoxState(eanFields[i].box, "valid");
    eans.push(val);
  }
  if (firstInvalidField) {
    showMissingFieldHint();
    focusDelayed(firstInvalidField);
    return;
  }

  resetZalandoStep2();
  hideAllViews();

  if (eans.length === 1) {
    if (opt1Headline) opt1Headline.textContent = "W\u00e4hle eine EAN aus:";
    showView("opt1");
    buildReasonGrid1(reasonGrid1, ZALANDO_REASONS, eans);
  } else {
    if (opt2Headline) {
      const mapText = {
        2: "W\u00e4hle zwei EANs aus:",
        3: "W\u00e4hle drei EANs aus:",
        4: "W\u00e4hle vier EANs aus:"
      };
      opt2Headline.textContent = mapText[eans.length] || "W\u00e4hle EANs aus:";
    }
    showView("opt2");
    buildReasonGrid2(reasonGrid2, ZALANDO_REASONS, eans);
  }
});

function resetZalandoFlowCompletely() {
  inputs.best1.value = "";
  setBoxState(document.getElementById("box1"), "default");
  setConfirmButtonReady(zalandoNext, false);

  inputs.ean1.value = "";
  inputs.ean2.value = "";
  inputs.ean3.value = "";
  inputs.ean4.value = "";
  setBoxState(box1, "default");
  setBoxState(box2, "default");
  box2.style.display = "none";
  if (box3) {
    setBoxState(box3, "default");
    box3.style.display = "none";
  }
  if (box4) {
    setBoxState(box4, "default");
    box4.style.display = "none";
  }

  setConfirmButtonReady(confirmBtn, false);

  activeEanCount = 1;

  reasonGrid1.innerHTML = "";
  reasonGrid2.innerHTML = "";

  buttons.confirmReason.disabled = true;
  setConfirmButtonReady(buttons.confirmReason, false);
  buttons.confirmReason.style.cursor = "not-allowed";

  buttons.confirmReason2.disabled = true;
  setConfirmButtonReady(buttons.confirmReason2, false);
  buttons.confirmReason2.style.cursor = "not-allowed";

  updateAddSecondEanPosition();
  setAddSecondEanKeyboardHighlight(false);
}

setupEanRemoveButtons();

function setReasonInputMode(container, mode) {
  if (!container) return;
  container.dataset.inputMode = mode;
}

function buildReasonGrid1(grid, reasons, eans) {
  const orderedReasons = getOrderedZalandoReasons(reasons);
  const stats = loadZalandoReasonStats();
  const frequentTopThree = orderedReasons.filter(item => Number(stats[item] || 0) > 0).slice(0, 3);
  const eanEntries = eans.map((ean, idx) => ({ key: `slot-${idx}`, label: ean }));
  const assignments = {};
  let missingAssignment = false;
  let lastFocusedBtn = null;
  let needsRefocus = false;
  const oldBoard = containers.opt1?.querySelector(".reason-assignment-board-opt1");
  if (oldBoard) oldBoard.remove();
  let panel = containers.opt1?.querySelector(".reason-panel-opt1");
  if (!panel && grid.parentElement) {
    panel = document.createElement("div");
    panel.className = "reason-panel reason-panel-opt1";
    grid.parentElement.insertBefore(panel, grid);
  }
  if (panel && grid.parentElement !== panel) {
    panel.appendChild(grid);
  }

  const assignmentBoard = document.createElement("div");
  assignmentBoard.className = "reason-assignment-board reason-assignment-board-opt1";
  assignmentBoard.dataset.eanCount = String(eanEntries.length);

  const boardTitle = document.createElement("div");
  boardTitle.className = "reason-assignment-title";
  boardTitle.textContent = "Zuordnung";

  const boardList = document.createElement("div");
  boardList.className = "reason-assignment-list";
  boardList.dataset.eanCount = String(eanEntries.length);

  assignmentBoard.appendChild(boardTitle);
  assignmentBoard.appendChild(boardList);
  if (panel) {
    panel.appendChild(assignmentBoard);
  } else if (grid.parentElement) {
    grid.parentElement.insertBefore(assignmentBoard, grid);
  }

  function ensureReasonFocus() {
    if (document.hidden) return;
    if (!containers.opt1 || containers.opt1.style.display === "none") return;
    const active = document.activeElement;
    if (active && containers.opt1.contains(active)) return;
    const target = lastFocusedBtn || grid.querySelector("button");
    if (target) {
      requestAnimationFrame(() => {
        try {
          target.focus();
        } catch (err) {
          // ignore focus errors (e.g. when window focus is still settling)
        }
        setReasonInputMode(containers.opt1, "keyboard");
        setKeyboardSelected(target);
      });
    }
  }

  function onWindowBlur() {
    if (!containers.opt1 || containers.opt1.style.display === "none") return;
    needsRefocus = true;
  }

  function onWindowFocus() {
    if (!needsRefocus) return;
    needsRefocus = false;
    ensureReasonFocus();
  }

  function onContainerPointerDown(e) {
    if (!containers.opt1 || containers.opt1.style.display === "none") return;
    const isButton = e.target && typeof e.target.closest === "function" && e.target.closest("button");
    if (isButton) return;
    ensureReasonFocus();
  }

  function onAnyPointerDown(e) {
    if (!containers.opt1 || containers.opt1.style.display === "none") return;
    const isButton = e.target && typeof e.target.closest === "function" && e.target.closest("button");
    if (isButton) return;
    ensureReasonFocus();
  }

  function onDocumentKeyDown(e) {
    if (!containers.opt1 || containers.opt1.style.display === "none") return;
    if (!/Arrow(Left|Right)|Enter/.test(e.key)) return;
    setReasonInputMode(containers.opt1, "keyboard");
    const active = document.activeElement;
    if (active && grid.contains(active)) return;
    const btns = Array.from(grid.querySelectorAll("button"));
    if (!btns.length) return;
    let index = lastFocusedBtn ? btns.indexOf(lastFocusedBtn) : -1;
    if (index < 0) index = 0;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = btns[(index + 1) % btns.length];
      lastFocusedBtn = next;
      next.focus();
      setKeyboardSelected(next);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const next = btns[(index - 1 + btns.length) % btns.length];
      lastFocusedBtn = next;
      next.focus();
      setKeyboardSelected(next);
      return;
    }
    if (e.key === "Enter") {
      if (isAssigned() && !buttons.confirmReason.disabled) {
        e.preventDefault();
        buttons.confirmReason.focus();
        return;
      }
      e.preventDefault();
      const target = btns[index];
      lastFocusedBtn = target;
      target.focus();
      setKeyboardSelected(target);
    }
  }

  if (grid._reasonFocusCleanup) {
    grid._reasonFocusCleanup();
  }
  grid._reasonFocusCleanup = () => {
    window.removeEventListener("focus", onWindowFocus);
    window.removeEventListener("blur", onWindowBlur);
    document.removeEventListener("visibilitychange", ensureReasonFocus);
    if (containers.opt1) {
      containers.opt1.removeEventListener("pointerdown", onContainerPointerDown);
      containers.opt1.removeEventListener("mousedown", onContainerPointerDown);
    }
    document.removeEventListener("pointerdown", onAnyPointerDown, true);
    document.removeEventListener("mousedown", onAnyPointerDown, true);
    document.removeEventListener("click", onAnyPointerDown, true);
    window.removeEventListener("pointerdown", onAnyPointerDown, true);
    window.removeEventListener("mousedown", onAnyPointerDown, true);
    window.removeEventListener("click", onAnyPointerDown, true);
    document.removeEventListener("keydown", onDocumentKeyDown);
  };

  window.addEventListener("focus", () => {
    onWindowFocus();
    setTimeout(ensureReasonFocus, 0);
  });
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("focus", ensureReasonFocus);
  document.addEventListener("visibilitychange", ensureReasonFocus);
  if (containers.opt1) {
    containers.opt1.addEventListener("pointerdown", onContainerPointerDown);
    containers.opt1.addEventListener("mousedown", onContainerPointerDown);
  }
  document.addEventListener("pointerdown", onAnyPointerDown, true);
  document.addEventListener("mousedown", onAnyPointerDown, true);
  document.addEventListener("click", onAnyPointerDown, true);
  window.addEventListener("pointerdown", onAnyPointerDown, true);
  window.addEventListener("mousedown", onAnyPointerDown, true);
  window.addEventListener("click", onAnyPointerDown, true);
  document.addEventListener("keydown", onDocumentKeyDown);

  function isAssigned() {
    return Boolean(eanEntries[0] && assignments[eanEntries[0].key]);
  }

  function animateReasonToSlot(fromBtn, toSlot, reasonText) {
    if (!fromBtn || !toSlot || !reasonText) return;
    const fromRect = fromBtn.getBoundingClientRect();
    const toRect = toSlot.getBoundingClientRect();
    if (!fromRect.width || !fromRect.height || !toRect.width || !toRect.height) return;

    const chip = document.createElement("div");
    chip.className = "reason-fly-chip";
    chip.textContent = reasonText;
    chip.style.left = `${fromRect.left}px`;
    chip.style.top = `${fromRect.top}px`;
    chip.style.width = `${fromRect.width}px`;
    chip.style.height = `${Math.min(44, fromRect.height)}px`;
    document.body.appendChild(chip);
    requestAnimationFrame(() => {
      chip.style.transform = `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px) scale(0.86)`;
      chip.style.opacity = "0.15";
    });
    chip.addEventListener("transitionend", () => chip.remove(), { once: true });
    setTimeout(() => chip.remove(), 380);
  }

  function flashReasonSelection(btn) {
    if (!btn) return;
    btn.classList.remove("selected-flash");
    if (btn._flashTimeout) {
      clearTimeout(btn._flashTimeout);
    }
    void btn.offsetWidth;
    btn.classList.add("selected-flash");
    btn._flashTimeout = setTimeout(() => {
      btn.classList.remove("selected-flash");
      btn._flashTimeout = null;
    }, 900);
  }

  function renderAssignmentBoard() {
    boardList.innerHTML = "";
    eanEntries.slice(0, 1).forEach((entry, index) => {
      const slot = document.createElement("div");
      slot.className = "reason-assignment-slot";
      slot.dataset.slotKey = entry.key;

      const slotHeader = document.createElement("div");
      slotHeader.className = "reason-assignment-slot-head";

      const slotLabel = document.createElement("span");
      slotLabel.className = "reason-assignment-slot-label";
      slotLabel.textContent = `EAN ${index + 1}`;

      const slotEan = document.createElement("span");
      slotEan.className = "reason-assignment-slot-ean";
      slotEan.textContent = entry.label;

      slotHeader.appendChild(slotLabel);
      slotHeader.appendChild(slotEan);
      slot.appendChild(slotHeader);

      const assignedReason = assignments[entry.key];
      const slotValue = document.createElement("div");
      slotValue.className = "reason-assignment-slot-value";
      slotValue.textContent = assignedReason || "Noch kein Grund ausgewählt";
      slot.appendChild(slotValue);

      if (!assignedReason && missingAssignment) {
        slot.classList.add("is-missing");
      }

      if (assignedReason) {
        slot.classList.add("is-filled");
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "reason-assignment-remove";
        removeBtn.setAttribute("aria-label", `Zuordnung für EAN ${index + 1} entfernen`);
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          delete assignments[entry.key];
          updateUI();
        });
        slot.appendChild(removeBtn);
      }

      boardList.appendChild(slot);
    });
  }

  function updateUI() {
    Array.from(grid.children).forEach(btn => {
      btn.classList.remove("selected");
    });
    renderAssignmentBoard();

    if (isAssigned()) {
      missingAssignment = false;
      buttons.confirmReason.disabled = false;
      setConfirmButtonReady(buttons.confirmReason, true);
      buttons.confirmReason.style.cursor = "pointer";
      buttons.confirmReason.focus();
    } else {
      buttons.confirmReason.disabled = false;
      setConfirmButtonReady(buttons.confirmReason, false);
      buttons.confirmReason.style.cursor = "not-allowed";
    }
  }

  grid.innerHTML = "";
  buttons.confirmReason.disabled = false;
  buttons.confirmReason.style.display = "inline-flex";
  setConfirmButtonReady(buttons.confirmReason, false);
  buttons.confirmReason.style.cursor = "not-allowed";

  orderedReasons.forEach((grund, idx) => {
    const btn = document.createElement("button");
    btn.textContent = grund;
    btn.dataset.reason = grund;
    btn.tabIndex = 0;
    btn.style.cssText = "";
    if (frequentTopThree.includes(grund)) btn.classList.add("is-frequent-used");
    if (idx === 0 && frequentTopThree.length) btn.classList.add("is-most-used");

    btn.addEventListener("focus", () => {
      setReasonInputMode(containers.opt1, "keyboard");
      lastFocusedBtn = btn;
      btn.classList.add("keyboard-selected");
    });
    btn.addEventListener("blur", () => btn.classList.remove("keyboard-selected"));
    btn.addEventListener("pointerenter", () => {
      setReasonInputMode(containers.opt1, "mouse");
    });

    btn.addEventListener("click", () => {
      setReasonInputMode(containers.opt1, "mouse");
      const currentSlot = eanEntries[0];
      if (!currentSlot) return;
      if (!isAssigned()) {
        const targetSlot = boardList.querySelector(`[data-slot-key="${currentSlot.key}"]`);
        animateReasonToSlot(btn, targetSlot, grund);
        flashReasonSelection(btn);
        assignments[currentSlot.key] = grund;
        missingAssignment = false;
        updateUI();
      }
    });

    btn.addEventListener("keydown", e => {
      setReasonInputMode(containers.opt1, "keyboard");
      const btns = Array.from(grid.querySelectorAll("button"));
      const index = btns.indexOf(btn);
      if (e.key === "ArrowRight") {
        e.preventDefault();
        btns[(index + 1) % btns.length].focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        btns[(index - 1 + btns.length) % btns.length].focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!isAssigned()) {
          btn.click();
        }
      }
    });

    grid.appendChild(btn);
  });

  renderAssignmentBoard();
  buttons.confirmReason.onclick = () => {
    const eanList = eanEntries.filter(entry => assignments[entry.key]).map(entry => entry.label);
    if (!eanList.length) {
      missingAssignment = true;
      updateUI();
      showToast("Bitte für jede EAN einen Grund auswählen.", "error");
      return;
    }
    const reasonList = eanEntries.filter(entry => assignments[entry.key]).map(entry => assignments[entry.key]);

    sendZalandoTicket({
      kachelname: currentTileName,
      orderId:    inputs.best1.value.trim(),
      eans:       eanList,
      reasons:    reasonList
    });

    resetZalandoFlowCompletely();
    Object.keys(assignments).forEach(key => delete assignments[key]);
    hideAllViews();
    showView("tile");
  };

  buttons.confirmReason.addEventListener("keydown", e => {
    if (e.key === "Enter" && !buttons.confirmReason.disabled) {
      e.preventDefault();
      e.stopImmediatePropagation();
      buttons.confirmReason.click();
    }
  });

  buttons.confirmReason.addEventListener("keydown", e => {
    if (e.key === "Enter" && !buttons.confirmReason.disabled) {
      e.preventDefault();
      buttons.confirmReason.click();
    }
  });

  setTimeout(() => {
    const firstBtn = grid.querySelector("button");
    if (firstBtn) firstBtn.focus();
  }, 50);
}

function buildReasonGrid2(grid, reasons, eans) {
  const orderedReasons = getOrderedZalandoReasons(reasons);
  const stats = loadZalandoReasonStats();
  const frequentTopThree = orderedReasons.filter(item => Number(stats[item] || 0) > 0).slice(0, 3);
  // allow duplicate EAN values by tracking via index keys
  const eanEntries = eans.map((ean, idx) => ({ key: `slot-${idx}`, label: ean }));
  const assignments = {}; // key -> grund
  const missingSlotKeys = new Set();
  let lastFocusedBtn = null;
  let needsRefocus = false;
  const oldBoard = containers.opt2?.querySelector(".reason-assignment-board-opt2");
  if (oldBoard) oldBoard.remove();
  let panel = containers.opt2?.querySelector(".reason-panel-opt2");
  if (!panel && grid.parentElement) {
    panel = document.createElement("div");
    panel.className = "reason-panel reason-panel-opt2";
    grid.parentElement.insertBefore(panel, grid);
  }
  if (panel && grid.parentElement !== panel) {
    panel.appendChild(grid);
  }

  const assignmentBoard = document.createElement("div");
  assignmentBoard.className = "reason-assignment-board reason-assignment-board-opt2";
  assignmentBoard.dataset.eanCount = String(eanEntries.length);

  const boardTitle = document.createElement("div");
  boardTitle.className = "reason-assignment-title";
  boardTitle.textContent = "Zuordnung";

  const boardList = document.createElement("div");
  boardList.className = "reason-assignment-list";
  boardList.dataset.eanCount = String(eanEntries.length);

  assignmentBoard.appendChild(boardTitle);
  assignmentBoard.appendChild(boardList);
  if (panel) {
    panel.appendChild(assignmentBoard);
  } else if (grid.parentElement) {
    grid.parentElement.insertBefore(assignmentBoard, grid);
  }

  function ensureReasonFocus() {
    if (document.hidden) return;
    if (!containers.opt2 || containers.opt2.style.display === "none") return;
    const active = document.activeElement;
    if (active && containers.opt2.contains(active)) return;
    const target = lastFocusedBtn || grid.querySelector("button");
    if (target) {
      requestAnimationFrame(() => {
        try {
          target.focus();
        } catch (err) {
          // ignore focus errors (e.g. when window focus is still settling)
        }
        setReasonInputMode(containers.opt2, "keyboard");
        setKeyboardSelected(target);
      });
    }
  }

  function onWindowBlur() {
    if (!containers.opt2 || containers.opt2.style.display === "none") return;
    needsRefocus = true;
  }

  function onWindowFocus() {
    if (!needsRefocus) return;
    needsRefocus = false;
    ensureReasonFocus();
  }

  function onContainerPointerDown(e) {
    if (!containers.opt2 || containers.opt2.style.display === "none") return;
    const isButton = e.target && typeof e.target.closest === "function" && e.target.closest("button");
    if (isButton) return;
    ensureReasonFocus();
  }

  function onAnyPointerDown(e) {
    if (!containers.opt2 || containers.opt2.style.display === "none") return;
    const isButton = e.target && typeof e.target.closest === "function" && e.target.closest("button");
    if (isButton) return;
    ensureReasonFocus();
  }

  function onDocumentKeyDown(e) {
    if (!containers.opt2 || containers.opt2.style.display === "none") return;
    if (!/Arrow(Left|Right)|Enter/.test(e.key)) return;
    setReasonInputMode(containers.opt2, "keyboard");
    const active = document.activeElement;
    if (active && grid.contains(active)) return;
    const btns = Array.from(grid.querySelectorAll("button"));
    if (!btns.length) return;
    let index = lastFocusedBtn ? btns.indexOf(lastFocusedBtn) : -1;
    if (index < 0) index = 0;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = btns[(index + 1) % btns.length];
      lastFocusedBtn = next;
      next.focus();
      setKeyboardSelected(next);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const next = btns[(index - 1 + btns.length) % btns.length];
      lastFocusedBtn = next;
      next.focus();
      setKeyboardSelected(next);
      return;
    }
    if (e.key === "Enter") {
      if (totalAssigned() === eanEntries.length && !buttons.confirmReason2.disabled) {
        e.preventDefault();
        buttons.confirmReason2.focus();
        return;
      }
      e.preventDefault();
      const target = btns[index];
      lastFocusedBtn = target;
      target.focus();
      setKeyboardSelected(target);
    }
  }

  if (grid._reasonFocusCleanup) {
    grid._reasonFocusCleanup();
  }
  grid._reasonFocusCleanup = () => {
    window.removeEventListener("focus", onWindowFocus);
    window.removeEventListener("blur", onWindowBlur);
    document.removeEventListener("visibilitychange", ensureReasonFocus);
    if (containers.opt2) {
      containers.opt2.removeEventListener("pointerdown", onContainerPointerDown);
      containers.opt2.removeEventListener("mousedown", onContainerPointerDown);
    }
    document.removeEventListener("pointerdown", onAnyPointerDown, true);
    document.removeEventListener("mousedown", onAnyPointerDown, true);
    document.removeEventListener("click", onAnyPointerDown, true);
    window.removeEventListener("pointerdown", onAnyPointerDown, true);
    window.removeEventListener("mousedown", onAnyPointerDown, true);
    window.removeEventListener("click", onAnyPointerDown, true);
    document.removeEventListener("keydown", onDocumentKeyDown);
  };

  window.addEventListener("focus", () => {
    onWindowFocus();
    setTimeout(ensureReasonFocus, 0);
  });
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("focus", ensureReasonFocus);
  document.addEventListener("visibilitychange", ensureReasonFocus);
  if (containers.opt2) {
    containers.opt2.addEventListener("pointerdown", onContainerPointerDown);
    containers.opt2.addEventListener("mousedown", onContainerPointerDown);
  }
  document.addEventListener("pointerdown", onAnyPointerDown, true);
  document.addEventListener("mousedown", onAnyPointerDown, true);
  document.addEventListener("click", onAnyPointerDown, true);
  window.addEventListener("pointerdown", onAnyPointerDown, true);
  window.addEventListener("mousedown", onAnyPointerDown, true);
  window.addEventListener("click", onAnyPointerDown, true);
  document.addEventListener("keydown", onDocumentKeyDown);

  function totalAssigned() {
    return Object.keys(assignments).length;
  }
  function nextFreeSlot() {
    return eanEntries.find(entry => !(entry.key in assignments));
  }
  function getSlotNode(slotKey) {
    return boardList.querySelector(`[data-slot-key="${slotKey}"]`);
  }
  function flashReasonSelection(btn) {
    if (!btn) return;
    btn.classList.remove("selected-flash");
    if (btn._flashTimeout) {
      clearTimeout(btn._flashTimeout);
    }
    // restart animation cleanly
    void btn.offsetWidth;
    btn.classList.add("selected-flash");
    btn._flashTimeout = setTimeout(() => {
      btn.classList.remove("selected-flash");
      btn._flashTimeout = null;
    }, 920);
  }

  function animateReasonToSlot(fromBtn, toSlot, reasonText) {
    if (!fromBtn || !toSlot || !reasonText) return;
    const fromRect = fromBtn.getBoundingClientRect();
    const toRect = toSlot.getBoundingClientRect();
    if (!fromRect.width || !fromRect.height || !toRect.width || !toRect.height) return;

    const chip = document.createElement("div");
    chip.className = "reason-fly-chip";
    chip.textContent = reasonText;
    chip.style.left = `${fromRect.left}px`;
    chip.style.top = `${fromRect.top}px`;
    chip.style.width = `${fromRect.width}px`;
    chip.style.height = `${Math.min(44, fromRect.height)}px`;

    document.body.appendChild(chip);
    requestAnimationFrame(() => {
      chip.style.transform = `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px) scale(0.86)`;
      chip.style.opacity = "0.15";
    });
    chip.addEventListener("transitionend", () => chip.remove(), { once: true });
    setTimeout(() => chip.remove(), 380);
  }

  function renderAssignmentBoard() {
    boardList.innerHTML = "";
    eanEntries.forEach((entry, index) => {
      const slot = document.createElement("div");
      slot.className = "reason-assignment-slot";
      slot.dataset.slotKey = entry.key;

      const slotHeader = document.createElement("div");
      slotHeader.className = "reason-assignment-slot-head";

      const slotLabel = document.createElement("span");
      slotLabel.className = "reason-assignment-slot-label";
      slotLabel.textContent = `EAN ${index + 1}`;

      const slotEan = document.createElement("span");
      slotEan.className = "reason-assignment-slot-ean";
      slotEan.textContent = entry.label;

      slotHeader.appendChild(slotLabel);
      slotHeader.appendChild(slotEan);
      slot.appendChild(slotHeader);

      const assignedReason = assignments[entry.key];
      const slotValue = document.createElement("div");
      slotValue.className = "reason-assignment-slot-value";
      slotValue.textContent = assignedReason || "Noch kein Grund ausgewählt";
      slot.appendChild(slotValue);

      if (!assignedReason && missingSlotKeys.has(entry.key)) {
        slot.classList.add("is-missing");
      }

      if (assignedReason) {
        slot.classList.add("is-filled");
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "reason-assignment-remove";
        removeBtn.setAttribute("aria-label", `Zuordnung für EAN ${index + 1} entfernen`);
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          delete assignments[entry.key];
          updateUI();
        });
        slot.appendChild(removeBtn);
      }

      boardList.appendChild(slot);
    });
  }

  function updateUI() {
    Array.from(grid.children).forEach(btn => {
      btn.classList.remove("selected");
    });
    renderAssignmentBoard();

    if (totalAssigned() === eanEntries.length) {
      missingSlotKeys.clear();
      buttons.confirmReason2.disabled = false;
      setConfirmButtonReady(buttons.confirmReason2, true);
      buttons.confirmReason2.style.cursor = "pointer";
      buttons.confirmReason2.focus();
    } else {
      buttons.confirmReason2.disabled = false;
      setConfirmButtonReady(buttons.confirmReason2, false);
      buttons.confirmReason2.style.cursor = "not-allowed";
    }
  }

  grid.innerHTML = "";
  buttons.confirmReason2.disabled = false;
  buttons.confirmReason2.style.display = "inline-flex";
  setConfirmButtonReady(buttons.confirmReason2, false);
  buttons.confirmReason2.style.cursor = "not-allowed";

  orderedReasons.forEach((grund, idx) => {
    const btn = document.createElement("button");
    btn.textContent = grund;
    btn.dataset.reason = grund;
    btn.tabIndex = 0;
    btn.style.cssText = "";
    if (frequentTopThree.includes(grund)) btn.classList.add("is-frequent-used");
    if (idx === 0 && frequentTopThree.length) btn.classList.add("is-most-used");

    btn.addEventListener("focus", () => {
      setReasonInputMode(containers.opt2, "keyboard");
      lastFocusedBtn = btn;
      btn.classList.add("keyboard-selected");
    });
    btn.addEventListener("blur", () => btn.classList.remove("keyboard-selected"));
    btn.addEventListener("pointerenter", () => {
      setReasonInputMode(containers.opt2, "mouse");
    });

    btn.addEventListener("click", () => {
      setReasonInputMode(containers.opt2, "mouse");
      if (totalAssigned() >= eanEntries.length) return;
      const frei = nextFreeSlot();
      if (frei) {
        missingSlotKeys.delete(frei.key);
        const targetSlot = getSlotNode(frei.key);
        animateReasonToSlot(btn, targetSlot, grund);
        flashReasonSelection(btn);
        assignments[frei.key] = grund;
        updateUI();
      }
    });

    btn.addEventListener("keydown", e => {
      setReasonInputMode(containers.opt2, "keyboard");
      const btns = Array.from(grid.querySelectorAll("button"));
      const index = btns.indexOf(btn);
      if (e.key === "ArrowRight") {
        e.preventDefault();
        btns[(index + 1) % btns.length].focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        btns[(index - 1 + btns.length) % btns.length].focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        btn.click();
        if (totalAssigned() === eanEntries.length) {
          buttons.confirmReason2.focus();
        }
      }
    });

    grid.appendChild(btn);
  });

  renderAssignmentBoard();
  buttons.confirmReason2.onclick = () => {
    if (Object.keys(assignments).length < eanEntries.length) {
      missingSlotKeys.clear();
      eanEntries.forEach(entry => {
        if (!assignments[entry.key]) missingSlotKeys.add(entry.key);
      });
      updateUI();
      showToast("Bitte für jede EAN einen Grund auswählen.", "error");
      return;
    }

    const eanList = eanEntries.map(e => e.label);
    const reasonList = eanEntries.map(e => assignments[e.key]);

    sendZalandoTicket({
      kachelname: currentTileName,
      orderId:    inputs.best1.value.trim(),
      eans:       eanList,
      reasons:    reasonList
    });

    resetZalandoFlowCompletely();
    Object.keys(assignments).forEach(key => delete assignments[key]);
    hideAllViews();
    showView("tile");
  };

  buttons.confirmReason2.addEventListener("keydown", e => {
    if (e.key === "Enter" && !buttons.confirmReason2.disabled) {
      e.preventDefault();
      e.stopImmediatePropagation();
      buttons.confirmReason2.click();
    }
  });

  buttons.confirmReason2.addEventListener("keydown", e => {
    if (e.key === "Enter" && !buttons.confirmReason2.disabled) {
      e.preventDefault();
      buttons.confirmReason2.click();
    }
  });

  setTimeout(() => {
    const firstBtn = grid.querySelector("button");
    if (firstBtn) firstBtn.focus();
  }, 50);
}

async function sendZalandoTicket({ kachelname, orderId, eans = [], reasons = [], ean1, ean2, reason }) {
  const eanList = Array.isArray(eans) && eans.length ? eans.filter(Boolean) : [ean1, ean2].filter(Boolean);
  const reasonList = Array.isArray(reasons) && reasons.length ? reasons.filter(r => r !== undefined) : (reason ? [reason] : []);
  rememberRecentZalandoReasons(reasonList);
  const safeOrder = orderId || "-";
  const eansText = eanList.length ? eanList.join(", ") : "-";
  const reasonsText = reasonList.length ? reasonList.join(", ") : "-";
  const detailString = `Order: ${safeOrder} | EANs: ${eansText} | Grund: ${reasonsText}`;
  if (typeof recordTicket === "function") {
    recordTicket({
      kachelname,
      details: detailString,
      typeKey: "zalando-bestellung"
    });
  }
  try {
    if (hasSent) return;
    hasSent = true;
    await sendPlannerTicket({
      kachelname,
      orderId: safeOrder,
      eans: eanList,
      reasons: reasonList
    });
    showToast("Ticket für Zalando Bestellung nicht erfüllbar wurde erfolgreich erstellt.");
  } catch (err) {
    console.error("Fehler beim Erstellen des Tickets:", err);
    alert("Fehler beim Erstellen des Tickets: " + err.message);
  } finally {
    hasSent = false;
  }
}
function setKeyboardSelected(target, scopeGrid) {
  const gridEl = scopeGrid || (target && typeof target.closest === "function" ? target.closest(".reason-grid") : null);
  if (!gridEl) return;
  Array.from(gridEl.querySelectorAll("button")).forEach(btn => {
    btn.classList.toggle("keyboard-selected", btn === target);
  });
}
