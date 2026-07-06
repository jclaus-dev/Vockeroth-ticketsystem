/* Startseite: M-Board Retoure flow */

const mboardRetoureEanBoxes = Array.from(document.querySelectorAll(".mboard-retoure-ean-box"));
const mboardRetoureEanInputs = Array.from(document.querySelectorAll(".mboard-retoure-ean-input"));
const mboardRetoureAddEAN = document.getElementById("mboardRetoureAddEAN");
let activeMboardRetoureEanCount = 1;

function getMboardRetoureEans() {
  return mboardRetoureEanInputs
    .slice(0, activeMboardRetoureEanCount)
    .map(input => input.value.trim())
    .filter(Boolean);
}

function getMboardRetoureFieldOrder() {
  return [
    inputs.mboardOrder,
    ...mboardRetoureEanInputs.slice(0, activeMboardRetoureEanCount),
    inputs.mboardCustomer,
    inputs.mboardState
  ].filter(Boolean);
}

function updateMboardRetoureAddPosition() {
  const lastActiveBox = mboardRetoureEanBoxes[Math.max(0, activeMboardRetoureEanCount - 1)];
  if (lastActiveBox && mboardRetoureAddEAN) {
    lastActiveBox.insertAdjacentElement("afterend", mboardRetoureAddEAN);
    mboardRetoureAddEAN.style.display = activeMboardRetoureEanCount >= mboardRetoureEanInputs.length ? "none" : "flex";
  }
}

function updateMboardRetoureUI() {
  [inputs.mboardOrder, inputs.mboardCustomer, inputs.mboardState].forEach(el => {
    if (!el) return;
    el.parentElement.style.borderColor = el.value.trim() ? "green" : "black";
  });

  let allVisibleEansFilled = true;
  mboardRetoureEanInputs.forEach((input, idx) => {
    const box = mboardRetoureEanBoxes[idx];
    if (!box) return;
    const isActive = idx < activeMboardRetoureEanCount;
    box.style.display = isActive ? "flex" : "none";
    if (!isActive) {
      box.style.borderColor = "black";
      return;
    }
    const filled = input.value.trim() !== "";
    box.style.borderColor = filled ? "green" : "black";
    if (!filled) allVisibleEansFilled = false;
  });

  updateMboardRetoureAddPosition();

  const fixedFieldsFilled = [inputs.mboardOrder, inputs.mboardCustomer, inputs.mboardState]
    .every(el => el && el.value.trim());
  buttons.mboardRetoureConfirm.style.color = fixedFieldsFilled && allVisibleEansFilled ? "green" : "white";
}

function removeMboardRetoureEanAt(indexToRemove) {
  if (indexToRemove <= 0 || indexToRemove >= activeMboardRetoureEanCount) return;

  for (let i = indexToRemove; i < activeMboardRetoureEanCount - 1; i += 1) {
    mboardRetoureEanInputs[i].value = mboardRetoureEanInputs[i + 1].value;
  }
  mboardRetoureEanInputs[activeMboardRetoureEanCount - 1].value = "";
  activeMboardRetoureEanCount -= 1;
  updateMboardRetoureUI();

  const focusIndex = Math.min(indexToRemove, activeMboardRetoureEanCount - 1);
  if (mboardRetoureEanInputs[focusIndex]) mboardRetoureEanInputs[focusIndex].focus();
}

function setupMboardRetoureRemoveButtons() {
  mboardRetoureEanBoxes.forEach((box, idx) => {
    if (!box || idx === 0 || box.querySelector(".ean-remove-btn")) return;
    box.style.position = "relative";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "ean-remove-btn";
    removeBtn.setAttribute("aria-label", `EAN ${idx + 1} entfernen`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", evt => {
      evt.preventDefault();
      evt.stopPropagation();
      removeMboardRetoureEanAt(idx);
    });
    box.appendChild(removeBtn);
  });
}

function addMboardRetoureEanField() {
  if (activeMboardRetoureEanCount >= mboardRetoureEanInputs.length) return;
  activeMboardRetoureEanCount += 1;
  updateMboardRetoureUI();
  const nextInput = mboardRetoureEanInputs[activeMboardRetoureEanCount - 1];
  if (nextInput) nextInput.focus();
}

function resetMboardRetoureFields() {
  [inputs.mboardOrder, inputs.mboardCustomer, inputs.mboardState, ...mboardRetoureEanInputs].forEach(inp => {
    if (inp) inp.value = "";
  });
  activeMboardRetoureEanCount = 1;
  updateMboardRetoureUI();
}

const retoureFields = [inputs.mboardOrder, ...mboardRetoureEanInputs, inputs.mboardCustomer, inputs.mboardState].filter(Boolean);

retoureFields.forEach(inp => {
  inp.addEventListener("input", () => {
    if (inp.classList.contains("mboard-retoure-ean-input")) {
      inp.value = inp.value.replace(/\D/g, "");
    }
    updateMboardRetoureUI();
  });
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      const visibleFields = getMboardRetoureFieldOrder();
      const idx = visibleFields.indexOf(inp);
      const next = visibleFields[idx + 1];
      if (next) {
        next.focus();
      } else if (buttons.mboardRetoureConfirm && buttons.mboardRetoureConfirm.style.color === "green") {
        buttons.mboardRetoureConfirm.click();
      }
    }
  });
});

if (mboardRetoureAddEAN) {
  mboardRetoureAddEAN.addEventListener("click", addMboardRetoureEanField);
  mboardRetoureAddEAN.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      addMboardRetoureEanField();
    }
  });
}

setupMboardRetoureRemoveButtons();
updateMboardRetoureUI();

if (buttons.mboardRetoureConfirm) {
  buttons.mboardRetoureConfirm.addEventListener("click", async e => {
    e.preventDefault();
    const order = inputs.mboardOrder.value.trim();
    const eans = getMboardRetoureEans();
    const customer = inputs.mboardCustomer.value.trim();
    const state = inputs.mboardState.value.trim();
    if (!(order && eans.length === activeMboardRetoureEanCount && customer && state) || hasSent) return;

    hasSent = true;
    const eansText = eans.join(", ");
    const detailText = `Bestellnummer: ${order} | EAN: ${eansText} | Kundenname: ${customer} | Zustand: ${state}`;

    if (typeof recordTicket === "function") {
      recordTicket({
        kachelname: "M-Board Retoure",
        details: detailText,
        typeKey: "mboard"
      });
    }

  try {
    showView("tile");
    await sendPlannerTicket({
      kachelname: "M-Board Retoure",
      text: detailText
    });
    resetMboardRetoureFields();
    showToast("Ticket fuer M-Board Retoure wurde erfolgreich erstellt.");
    showView("tile");
  } catch (err) {
      console.error("Fehler M-Board Retoure:", err);
      alert("Fehler: " + err.message);
      showView("mboardRetoure");
    } finally {
      hasSent = false;
    }
  });
}