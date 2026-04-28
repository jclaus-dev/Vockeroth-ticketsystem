/* Startseite: M-Board Retoure flow */

function updateMboardRetoureUI() {
  const fields = [inputs.mboardOrder, inputs.mboardEAN, inputs.mboardCustomer, inputs.mboardState];
  fields.forEach(el => {
    if (!el) return;
    el.parentElement.style.borderColor = el.value.trim() ? "green" : "black";
  });
  const filled = fields.every(el => el && el.value.trim());
  buttons.mboardRetoureConfirm.style.color = filled ? "green" : "white";
}

const retoureFields = [inputs.mboardOrder, inputs.mboardEAN, inputs.mboardCustomer, inputs.mboardState].filter(Boolean);

retoureFields.forEach((inp, idx) => {
  inp.addEventListener("input", updateMboardRetoureUI);
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = retoureFields[idx + 1];
      if (next) {
        next.focus();
      } else if (buttons.mboardRetoureConfirm) {
        buttons.mboardRetoureConfirm.click();
      }
    }
  });
});

if (buttons.mboardRetoureConfirm) {
  buttons.mboardRetoureConfirm.addEventListener("click", async e => {
    e.preventDefault();
    const order = inputs.mboardOrder.value.trim();
    const ean = inputs.mboardEAN.value.trim();
    const customer = inputs.mboardCustomer.value.trim();
    const state = inputs.mboardState.value.trim();
    let firstInvalid = null;
    if (!order) {
      markInvalidField(inputs.mboardOrder);
      firstInvalid = firstInvalid || inputs.mboardOrder;
    }
    if (!ean) {
      markInvalidField(inputs.mboardEAN);
      firstInvalid = firstInvalid || inputs.mboardEAN;
    }
    if (!customer) {
      markInvalidField(inputs.mboardCustomer);
      firstInvalid = firstInvalid || inputs.mboardCustomer;
    }
    if (!state) {
      markInvalidField(inputs.mboardState);
      firstInvalid = firstInvalid || inputs.mboardState;
    }
    if (firstInvalid) {
      showRequiredFieldsError();
      focusDelayed(firstInvalid);
      return;
    }
    if (hasSent) return;

    hasSent = true;
    const detailText = `Bestellnummer: ${order} | EAN: ${ean} | Kundenname: ${customer} | Zustand: ${state}`;

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
    [inputs.mboardOrder, inputs.mboardEAN, inputs.mboardCustomer, inputs.mboardState].forEach(inp => inp.value = "");
    buttons.mboardRetoureConfirm.style.color = "white";
    showToast("Ticket für M-Board Retoure wurde erfolgreich erstellt.");
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
