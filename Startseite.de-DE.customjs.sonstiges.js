/* Startseite: Sonstiges flow */

inputs.sonstiges.addEventListener("input", () => {
  setConfirmButtonReady(buttons.sonstConfirm, Boolean(inputs.sonstiges.value.trim()));
});

inputs.sonstiges.addEventListener("keydown", e => {
  if (e.key === "Enter" && inputs.sonstiges.value.trim()) {
    e.preventDefault();
    e.stopImmediatePropagation();
    buttons.sonstConfirm.click();
  }
});

buttons.sonstConfirm.addEventListener("keydown", e => {
  if (e.key === "Enter" && !buttons.sonstConfirm.disabled) {
    e.preventDefault();
    e.stopImmediatePropagation();
    buttons.sonstConfirm.click();
  }
});

buttons.sonstConfirm.addEventListener("click", async e => {
  e.preventDefault();
  const text = inputs.sonstiges.value.trim();
  if (!text) {
    markInvalidField(inputs.sonstiges, true);
    showRequiredFieldsError();
    return;
  }
  if (hasSent) return;

  hasSent = true;
  if (typeof recordTicket === "function") {
    recordTicket({
      kachelname: "Sonstiges Anliegen",
      details: `Text: ${text}`,
      typeKey: "sonstiges"
    });
  }
  try {
    showView("tile");
    await sendPlannerTicket({
      kachelname: "Sonstiges Anliegen",
      text
    });
    inputs.sonstiges.value = "";
    setConfirmButtonReady(buttons.sonstConfirm, false);
    showToast("Ticket für Sonstiges Anliegen wurde erfolgreich erstellt.");
    showView("tile");
  } catch (err) {
    console.error("Fehler Sonstiges:", err);
    alert("Fehler: " + err.message);
    showView("sonstiges");
  } finally {
    hasSent = false;
  }
});
