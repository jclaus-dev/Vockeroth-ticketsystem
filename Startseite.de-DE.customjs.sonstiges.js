/* Startseite: Sonstiges flow */

inputs.sonstiges.addEventListener("input", () => {
  buttons.sonstConfirm.style.color = inputs.sonstiges.value.trim() ? "green" : "white";
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
  if (!text || hasSent) return;

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
    buttons.sonstConfirm.style.color = "white";
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
