/* Startseite: Mboard flow */

inputs.mboard.addEventListener("input", () => {
  buttons.mboardConfirm.style.color = inputs.mboard.value.trim() ? "green" : "white";
});

inputs.mboard.addEventListener("keydown", e => {
  if (e.key === "Enter" && inputs.mboard.value.trim()) {
    e.preventDefault();
    e.stopImmediatePropagation();
    buttons.mboardConfirm.click();
  }
});

buttons.mboardConfirm.addEventListener("keydown", e => {
  if (e.key === "Enter" && !buttons.mboardConfirm.disabled) {
    e.preventDefault();
    e.stopImmediatePropagation();
    buttons.mboardConfirm.click();
  }
});

buttons.mboardConfirm.addEventListener("click", async e => {
  e.preventDefault();
  const text = inputs.mboard.value.trim();
  if (!text || hasSent) return;

  hasSent = true;
  if (typeof recordTicket === "function") {
    recordTicket({
      kachelname: "Mboard Probleme",
      details: `Text: ${text}`,
      typeKey: "mboard"
    });
  }

  try {
    showView("tile");
    await sendPlannerTicket({
      kachelname: "Mboard Probleme",
      text
    });
    inputs.mboard.value = "";
    buttons.mboardConfirm.style.color = "white";
    showToast("Ticket für Mboard Probleme wurde erfolgreich erstellt.");
    showView("tile");
  } catch (err) {
    console.error("Fehler Mboard:", err);
    alert("Fehler: " + err.message);
    showView("mboard");
  } finally {
    hasSent = false;
  }
});
