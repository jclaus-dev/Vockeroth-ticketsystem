/* Startseite: Gutschein flow */

function resetGutscheinForm() {
  inputs.gutschein.value = "";
  inputs.gutscheinWert.value = "";
  document.getElementById("kachelCode").style.borderColor = "";
  document.getElementById("kachelWert").style.borderColor = "";
  arrowNext.style.color = "white";
}

function getEuroNumericValue() {
  return inputs.gutscheinWert.value.replace(/[^\d]/g, "");
}

function updateGutscheinUI() {
  const codeOk = inputs.gutschein.value.trim();
  const wertOk = getEuroNumericValue();
  document.getElementById("kachelCode").style.borderColor = codeOk ? "green" : "";
  document.getElementById("kachelWert").style.borderColor = wertOk ? "green" : "";
  arrowNext.style.color = codeOk && wertOk ? "green" : "white";
}

inputs.gutschein.addEventListener("input", updateGutscheinUI);
inputs.gutscheinWert.addEventListener("input", () => {
  const raw = getEuroNumericValue();
  inputs.gutscheinWert.value = raw;
  updateGutscheinUI();
});

inputs.gutscheinWert.addEventListener("focus", () => {
  inputs.gutscheinWert.value = getEuroNumericValue();
});

inputs.gutscheinWert.addEventListener("blur", () => {
  const raw = getEuroNumericValue();
  inputs.gutscheinWert.value = raw;
});

inputs.gutscheinWert.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    arrowNext.click();
  }
});

inputs.gutschein.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    focusDelayed(inputs.gutscheinWert);
  }
});
inputs.gutscheinWert.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    arrowNext.click();
  }
});

arrowNext.addEventListener("click", async e => {
  e.preventDefault();
  const code = inputs.gutschein.value.trim();
  const wert = getEuroNumericValue();
  if (!code || !wert || hasSent) return;

  hasSent = true;
  if (typeof recordTicket === "function") {
    recordTicket({
      kachelname: "Online Gutscheine",
      details: `Gutscheincode: ${code} | Wert: ${wert}`,
      typeKey: "online-gutscheine"
    });
  }

  try {
    showView("tile");
    await sendPlannerTicket({
      kachelname:    "Online Gutscheine",
      gutscheincode: code,
      gutscheinwert: wert
    });
    showToast("Ticket für Online Gutscheine wurde erfolgreich erstellt.");
    resetGutscheinForm();
    showView("tile");
  } catch (err) {
    console.error("Fehler beim Senden des Gutscheins:", err);
    alert("Netzwerkfehler beim Senden des Gutscheins:\n" + err.message);
    showView("gutschein");
  } finally {
    hasSent = false;
  }
});

buttons.popupYes.addEventListener("click", async () => {
  if (hasSent) return;
  hasSent = true;
  hideAllViews();

  try {
    showView("tile");
  } catch (err) {
    console.error(err);
    alert("Beim Senden ist ein Fehler aufgetreten: " + err.message);
    showView("tile");
  } finally {
    hasSent = false;
  }
});

buttons.popupNo.addEventListener("click", () => {
  hideAllViews();
  showView("gutschein");
  focusDelayed(inputs.gutscheinWert);
});

async function sendGutschein() {
  try {
    showView("tile");
    await sendPlannerTicket({
      kachelname:    currentTileName || "Online Gutscheine",
      gutscheincode: inputs.gutschein.value.trim(),
      gutscheinwert: getEuroNumericValue()
    });
    showToast("Ticket für Online Gutscheine wurde erfolgreich erstellt.");
    showView("tile");
  } catch (err) {
    console.error("Gutschein-Fehler:", err);
    alert("Netzwerkfehler beim Senden des Gutscheins:\n" + err.message);
    showView("gutschein");
  } finally {
    hasSent = false;
  }
}
