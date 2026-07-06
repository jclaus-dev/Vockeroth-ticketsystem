/* Startseite: session handling and user identification */
const VALID_FILIAL_NUMBERS = [
  "0", "2", "3", "4", "5", "6", "7", "9", "14", "15", "16", "18", "20",
  "24", "25", "27", "29", "30", "19", "40", "43", "46", "49", "42", "50",
  "51", "52", "53", "54", "55", "57", "58"
];
const VALID_FILIAL_SET = new Set(VALID_FILIAL_NUMBERS);

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

  buttons.save.disabled = !canSave;
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
    [inputs.persNr, inputs.filNr].forEach(i => {
      if (!i.value.trim()) i.style.border = "2px solid red";
    });
    return;
  }
  if (!isValidFilialNumber(inputs.filNr.value)) {
    inputs.filNr.style.border = "2px solid red";
    alert(`Ungültige Filialnummer.\nErlaubte Werte: ${VALID_FILIAL_NUMBERS.join(", ")}`);
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
  document.getElementById("savedNotice").style.display = "block";
  setTimeout(() => document.getElementById("savedNotice").style.display = "none", 4000);
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
    validatePersonalFilial();
    disableAllTiles();
    if (buttons.ticketsTab) buttons.ticketsTab.disabled = true;
    inputs.persNr.focus();
  });
}
