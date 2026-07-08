/* Startseite: M-Board Retoure flow */

const mboardRetoureEanFields = [
  { input: inputs.mboardEAN, box: inputs.mboardEAN?.parentElement },
  { input: inputs.mboardEAN2, box: document.getElementById("mboardRetoureEAN2Box") },
  { input: inputs.mboardEAN3, box: document.getElementById("mboardRetoureEAN3Box") },
  { input: inputs.mboardEAN4, box: document.getElementById("mboardRetoureEAN4Box") }
].filter(field => field.input && field.box);

let mboardRetoureActiveEanCount = 1;

function getMboardRetoureActiveEanFields() {
  return mboardRetoureEanFields.slice(0, mboardRetoureActiveEanCount).map(field => field.input);
}

function getMboardRetoureRequiredFields() {
  return [
    inputs.mboardOrder,
    ...getMboardRetoureActiveEanFields(),
    inputs.mboardCustomer,
    inputs.mboardState
  ].filter(Boolean);
}

function updateMboardRetoureAddButtonPosition() {
  if (!buttons.mboardRetoureAddDouble || !mboardRetoureEanFields.length) return;
  const lastActiveField = mboardRetoureEanFields[Math.max(0, mboardRetoureActiveEanCount - 1)];
  lastActiveField?.box?.insertAdjacentElement("afterend", buttons.mboardRetoureAddDouble);
  buttons.mboardRetoureAddDouble.style.display = mboardRetoureActiveEanCount >= mboardRetoureEanFields.length ? "none" : "flex";
}

function updateMboardRetoureUI() {
  mboardRetoureEanFields.forEach((field, idx) => {
    const isActive = idx < mboardRetoureActiveEanCount;
    if (idx > 0) field.box.style.display = isActive ? "flex" : "none";
    if (!isActive) field.input.value = "";
    field.box.style.borderColor = isActive && field.input.value.trim() ? "green" : "black";
  });

  [inputs.mboardOrder, inputs.mboardCustomer, inputs.mboardState].forEach(el => {
    if (!el) return;
    el.parentElement.style.borderColor = el.value.trim() ? "green" : "black";
  });

  updateMboardRetoureAddButtonPosition();

  const filled = getMboardRetoureRequiredFields().every(el => el && el.value.trim());
  setConfirmButtonReady(buttons.mboardRetoureConfirm, filled);
}

function addMboardRetoureEanField() {
  if (mboardRetoureActiveEanCount >= mboardRetoureEanFields.length) return;
  mboardRetoureActiveEanCount += 1;
  const addedField = mboardRetoureEanFields[mboardRetoureActiveEanCount - 1];
  updateMboardRetoureUI();
  focusDelayed(addedField?.input);
}

function resetMboardRetoureEanFields() {
  mboardRetoureActiveEanCount = 1;
  mboardRetoureEanFields.forEach((field, idx) => {
    field.input.value = "";
    field.box.style.borderColor = "black";
    if (idx > 0) field.box.style.display = "none";
  });
  updateMboardRetoureAddButtonPosition();
}

const retoureFields = [
  inputs.mboardOrder,
  ...mboardRetoureEanFields.map(field => field.input),
  inputs.mboardCustomer,
  inputs.mboardState
].filter(Boolean);

retoureFields.forEach(inp => {
  inp.addEventListener("input", updateMboardRetoureUI);
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      const navFields = getMboardRetoureRequiredFields();
      const idx = navFields.indexOf(inp);
      const next = navFields[idx + 1];
      if (next) {
        next.focus();
      } else if (buttons.mboardRetoureConfirm) {
        buttons.mboardRetoureConfirm.click();
      }
    }
  });
});

if (buttons.mboardRetoureAddDouble) {
  buttons.mboardRetoureAddDouble.setAttribute("role", "button");
  buttons.mboardRetoureAddDouble.setAttribute("tabindex", "0");
  buttons.mboardRetoureAddDouble.addEventListener("click", addMboardRetoureEanField);
  buttons.mboardRetoureAddDouble.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      addMboardRetoureEanField();
    }
  });
}

if (buttons.mboardRetoureConfirm) {
  buttons.mboardRetoureConfirm.addEventListener("click", async e => {
    e.preventDefault();
    const order = inputs.mboardOrder.value.trim();
    const eans = getMboardRetoureActiveEanFields()
      .map(input => input.value.trim())
      .filter(Boolean);
    const customer = inputs.mboardCustomer.value.trim();
    const state = inputs.mboardState.value.trim();
    let firstInvalid = null;

    getMboardRetoureRequiredFields().forEach(field => {
      if (!field.value.trim()) {
        markInvalidField(field);
        firstInvalid = firstInvalid || field;
      }
    });

    if (firstInvalid || !order || !eans.length || !customer || !state) {
      showRequiredFieldsError();
      focusDelayed(firstInvalid || inputs.mboardOrder);
      return;
    }
    if (hasSent) return;

    hasSent = true;
    const eanText = eans.join(", ");
    const detailText = `Bestellnummer: ${order} | EANs: ${eanText} | Kundenname: ${customer} | Zustand: ${state}`;

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
      retoureFields.forEach(inp => inp.value = "");
      resetMboardRetoureEanFields();
      setConfirmButtonReady(buttons.mboardRetoureConfirm, false);
      showToast("Ticket f\u00fcr M-Board Retoure wurde erfolgreich erstellt.");
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

resetMboardRetoureEanFields();
updateMboardRetoureUI();