/* Startseite: Passwort reset flow */

Array.from(containers.pass1.querySelectorAll(".passwort-reason")).forEach(btn => {
  btn.addEventListener("click", () => {
    passReason = btn.dataset.reason;

    if (passReason === "Sonstiges") {
      document.getElementById("passwortHeadline").textContent = `Grund: ${passReason}`;
      hideAllViews();
      showView("pass2");
      focusDelayed(inputs.newPassword);
    } else {
      if (hasSent) return;
      hasSent = true;
      if (typeof recordTicket === "function") {
        recordTicket({
          kachelname: "Zalando Passwort zurücksetzen",
          details: `Grund: ${passReason}`,
          typeKey: "zalando-passwort"
        });
      }

      showView("tile");
      sendPlannerTicket({
        kachelname: "Zalando Passwort zurücksetzen",
        reason:     passReason,
        password:   ""
      })
        .then(() => {
          showToast("Ticket für Zalando Passwort zurücksetzen wurde erfolgreich erstellt.");
          showView("tile");
        })
        .catch(err => {
          console.error("Fehler beim direkten Passwort-Reset-Ticket:", err);
          alert("Fehler beim Absenden: " + err.message);
          showView("pass1");
        })
        .finally(() => {
          hasSent = false;
        });
    }
  });
});

let passButtons = [];
function refreshPassButtons() {
  passButtons = Array.from(containers.pass1.querySelectorAll(".passwort-reason"));
  return passButtons;
}
refreshPassButtons();
let lastPassButton = null;

function setPassKeyboardSelected(target) {
  passButtons.forEach(btn => btn.classList.toggle("keyboard-selected", btn === target));
  lastPassButton = target;
}

passButtons.forEach((btn, idx) => {
  btn.tabIndex = 0;
  btn.addEventListener("focus", () => setPassKeyboardSelected(btn));
  btn.addEventListener("blur", () => btn.classList.remove("keyboard-selected"));
  btn.addEventListener("pointerenter", () => {
    if (containers.pass1) containers.pass1.dataset.inputMode = "mouse";
    setPassKeyboardSelected(btn);
  });
  btn.addEventListener("keydown", e => {
    if (containers.pass1) containers.pass1.dataset.inputMode = "keyboard";
    const btns = refreshPassButtons();
    const index = idx;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (index + 1) % btns.length;
      btns[next].focus();
      setPassKeyboardSelected(btns[next]);
    }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (index - 1 + btns.length) % btns.length;
      btns[prev].focus();
      setPassKeyboardSelected(btns[prev]);
    }
    else if (e.key === "Enter") {
      e.preventDefault();
      btn.click();
    }
  });
});

function focusFirstPasswortReason() {
  setTimeout(() => {
    const btns = refreshPassButtons();
    if (btns.length > 0) {
      if (containers.pass1) containers.pass1.dataset.inputMode = "keyboard";
      btns[0].focus();
      setPassKeyboardSelected(btns[0]);
    }
  }, 50);
}

function ensurePasswortFocus() {
  if (!containers.pass1 || containers.pass1.style.display === "none") return;
  const btns = refreshPassButtons();
  const active = document.activeElement;
  if (active && btns.includes(active)) return;
  const target = lastPassButton || btns[0];
  if (target) {
    target.focus();
    setPassKeyboardSelected(target);
  }
}

window.addEventListener("focus", ensurePasswortFocus);
document.addEventListener("keydown", e => {
  if (!containers.pass1 || containers.pass1.style.display === "none") return;
  if (!/Arrow(Left|Right|Up|Down)|Enter/.test(e.key)) return;
  containers.pass1.dataset.inputMode = "keyboard";
  const btns = refreshPassButtons();
  const active = document.activeElement;
  if (active && btns.includes(active)) return;
  if (!btns.length) return;
  const index = lastPassButton ? btns.indexOf(lastPassButton) : 0;
  let nextIndex = index;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    nextIndex = (index + 1) % btns.length;
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    nextIndex = (index - 1 + btns.length) % btns.length;
  } else if (e.key === "Enter") {
    e.preventDefault();
    const target = btns[index] || btns[0];
    target.focus();
    setPassKeyboardSelected(target);
    target.click();
    return;
  }
  const target = btns[nextIndex];
  target.focus();
  setPassKeyboardSelected(target);
});

if (containers.pass1) {
  containers.pass1.addEventListener("pointermove", () => {
    containers.pass1.dataset.inputMode = "mouse";
  });
}

inputs.newPassword.addEventListener("input", () => {
  buttons.passConfirm.style.color = inputs.newPassword.value.trim() ? "green" : "white";
});

inputs.newPassword.addEventListener("keydown", e => {
  if (e.key === "Enter" && inputs.newPassword.value.trim()) {
    e.preventDefault();
    buttons.passConfirm.click();
  }
});

buttons.passConfirm.addEventListener("click", async e => {
  e.preventDefault();
  const np = inputs.newPassword.value.trim();
  if (!np) return;
  if (!passReason) {
    alert("Bitte zuerst einen Grund auswählen.");
    return;
  }
  if (hasSent) return;

  hasSent = true;
  if (typeof recordTicket === "function") {
    recordTicket({
      kachelname: "Zalando Passwort zurücksetzen",
      details: `Grund: ${passReason}`,
      typeKey: "zalando-passwort"
    });
  }

  try {
    showView("tile");
    await sendPlannerTicket({
      kachelname: "Zalando Passwort zurücksetzen",
      reason:     passReason,
      password:   np
    });
    inputs.newPassword.value = "";
    buttons.passConfirm.style.color = "white";
    showToast("Ticket für Zalando Passwort zurücksetzen wurde erfolgreich erstellt.");
    showView("tile");
  } catch (err) {
    console.error("Fehler beim Passwort-Reset:", err);
    alert("Fehler beim Passwort-Reset: " + err.message);
    showView("pass2");
  } finally {
    hasSent = false;
  }
});
