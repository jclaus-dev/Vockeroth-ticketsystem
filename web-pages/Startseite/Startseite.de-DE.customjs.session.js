/* Startseite: session handling and user identification */
const VALID_FILIAL_NUMBERS = [
  "0", "2", "3", "4", "5", "6", "7", "9", "14", "15", "16", "18", "20",
  "24", "25", "27", "29", "30", "19", "40", "43", "46", "49", "42", "50",
  "51", "52", "53", "54", "55", "57", "58"
];
const VALID_FILIAL_SET = new Set(VALID_FILIAL_NUMBERS);
const SAVE_LABEL_DEFAULT = "Bestätigen";
const SAVE_LABEL_CONFIRMED = "Bestätigt";

function setSaveButtonConfirmed(isConfirmed) {
  if (!buttons.save) return;
  buttons.save.classList.toggle("is-confirmed", !!isConfirmed);
  buttons.save.textContent = isConfirmed ? SAVE_LABEL_CONFIRMED : SAVE_LABEL_DEFAULT;
}

function hasConfirmedSessionData() {
  const savedPers = (localStorage.getItem(SESSION_KEYS.persNr) || "").trim();
  const savedFil = (localStorage.getItem(SESSION_KEYS.filNr) || "").trim();
  const expRaw = localStorage.getItem(SESSION_KEYS.expiresAt);
  const currentPers = (inputs.persNr.value || "").trim();
  const currentFil = (inputs.filNr.value || "").trim();
  if (!savedPers || !savedFil || !expRaw) return false;
  const expiresAt = new Date(expRaw);
  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime())) return false;
  if (expiresAt <= new Date()) return false;
  return savedPers === currentPers && savedFil === currentFil;
}

function isValidFilialNumber(value) {
  return VALID_FILIAL_SET.has(String(value || "").trim());
}

function updateFilialInputState() {
  const filValue = inputs.filNr.value.trim();
  const filValid = isValidFilialNumber(filValue);
  const invalid = !!filValue && !filValid;
  inputs.filNr.classList.toggle("is-invalid", invalid);
  inputs.filNr.style.border = invalid ? "2px solid red" : "";
}

function expireSession() {
  [SESSION_KEYS.persNr, SESSION_KEYS.filNr, SESSION_KEYS.expiresAt].forEach(k => localStorage.removeItem(k));
  setSaveButtonConfirmed(false);
  if (buttons.save) buttons.save.disabled = true;
  disableAllTiles();
  alert("Deine Session ist abgelaufen. Bitte Personal- und Filialnummer erneut eingeben.");
}

function initSessionTimer() {
  const now = new Date();
  const exp = localStorage.getItem(SESSION_KEYS.expiresAt);
  if (!exp) return;

  const expiresAt = new Date(exp);
  if (expiresAt > now) {
    setTimeout(expireSession, expiresAt - now);
  } else {
    expireSession();
  }
}

function validatePersonalFilial() {
  const persFilled = !!inputs.persNr.value.trim();
  const filValue = inputs.filNr.value.trim();
  const filValid = isValidFilialNumber(filValue);
  const canSave = persFilled && filValid;

  updateFilialInputState();
  inputs.filNr.title = filValue && !filValid
    ? `Ungültige Filialnummer. Erlaubt: ${VALID_FILIAL_NUMBERS.join(", ")}`
    : "";

  const isConfirmed = canSave && hasConfirmedSessionData();
  buttons.save.disabled = isConfirmed ? true : !canSave;
  setSaveButtonConfirmed(isConfirmed);
  if (buttons.reset) {
    buttons.reset.classList.toggle("is-ready", canSave);
  }
  if (buttons.ticketsTab) {
    buttons.ticketsTab.disabled = !canSave;
  }
  if (buttons.handbuchTab) {
    buttons.handbuchTab.disabled = !canSave;
  }
}

function handlePersonalFilialInput(e) {
  e.target.value = e.target.value.replace(/\D/g, "");
  updateFilialInputState();
  validatePersonalFilial();

  const persFilled = !!inputs.persNr.value.trim();
  const filValid = isValidFilialNumber(inputs.filNr.value);
  if (!persFilled || !filValid) {
    disableAllTiles();
    if (buttons.ticketsTab) buttons.ticketsTab.disabled = true;
    if (buttons.handbuchTab) buttons.handbuchTab.disabled = true;
  }
}

[inputs.persNr, inputs.filNr].forEach(inp => {
  ["input", "keyup", "change", "blur"].forEach(evtName => {
    inp.addEventListener(evtName, handlePersonalFilialInput);
  });
});

inputs.persNr.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    inputs.filNr.focus();
  }
});

inputs.filNr.addEventListener("keydown", e => {
  if (e.key === "Enter" && !buttons.save.disabled) {
    e.preventDefault();
    e.stopPropagation();
    buttons.save.click();
  }
});

buttons.save.addEventListener("click", () => {
  if (!(inputs.persNr.value.trim() && inputs.filNr.value.trim())) {
    if (!inputs.persNr.value.trim()) markInvalidField(inputs.persNr, true);
    if (!inputs.filNr.value.trim()) markInvalidField(inputs.filNr, !inputs.persNr.value.trim());
    showRequiredFieldsError();
    return;
  }
  if (!isValidFilialNumber(inputs.filNr.value)) {
    markInvalidField(inputs.filNr, true);
    showToast(`Ungültige Filialnummer. Erlaubt: ${VALID_FILIAL_NUMBERS.join(", ")}`, "error");
    return;
  }
  localStorage.setItem(SESSION_KEYS.persNr, inputs.persNr.value.trim());
  localStorage.setItem(SESSION_KEYS.filNr, inputs.filNr.value.trim());
  const expiresAt = new Date(Date.now() + 12 * 3600 * 1000);
  localStorage.setItem(SESSION_KEYS.expiresAt, expiresAt.toISOString());
  setTimeout(expireSession, expiresAt - new Date());

  updateFilialPlaceholder();
  enableAllTiles();
  if (buttons.ticketsTab) buttons.ticketsTab.disabled = false;
  if (buttons.handbuchTab) buttons.handbuchTab.disabled = false;
  if (typeof loadTickets === "function" && typeof updateTicketsTabLabel === "function") {
    const openCount = loadTickets().filter(t => !t.done).length;
    updateTicketsTabLabel(openCount);
  }
  const legacySavedNotice = document.getElementById("savedNotice");
  if (legacySavedNotice) {
    legacySavedNotice.style.display = "none";
  }
  if (typeof showToast === "function") {
    showToast("Personalnummer und Filialnummer korrekt hinterlegt.", "success");
  }
  setSaveButtonConfirmed(true);
  buttons.save.disabled = true;
  showView("tile");
});

if (buttons.reset) {
  buttons.reset.addEventListener("click", () => {
    [inputs.persNr, inputs.filNr].forEach(i => {
      i.value = "";
      i.style.border = "";
    });
    [SESSION_KEYS.persNr, SESSION_KEYS.filNr, SESSION_KEYS.expiresAt].forEach(k => localStorage.removeItem(k));
    updateFilialPlaceholder();
    setSaveButtonConfirmed(false);
    validatePersonalFilial();
    disableAllTiles();
    if (buttons.ticketsTab) buttons.ticketsTab.disabled = true;
    inputs.persNr.focus();
  });
}
