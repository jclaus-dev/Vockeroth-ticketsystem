/* Startseite: tile navigation and view switching */

function moveTileSelection(direction) {
  let next = selectedTileIndex;
  const start = selectedTileIndex;
  do {
    next = (next + direction + tiles.length) % tiles.length;
  } while (
    (tiles[next].dataset.kachelname === "Coming Soon" ||
    tiles[next].classList.contains("disabled")) &&
    next !== start
  );
  if (
    tiles[next].dataset.kachelname === "Coming Soon" ||
    tiles[next].classList.contains("disabled")
  ) {
    return;
  }
  selectedTileIndex = next;
  updateTileSelection();
}

function setInputMode(mode) {
  if (inputMode === mode) return;
  inputMode = mode;
  if (mode === "keyboard") {
    document.body.classList.add("keyboard-mode");
  } else {
    document.body.classList.remove("keyboard-mode");
  }
  updateTileSelection();
}

setInputMode("keyboard");

document.addEventListener("keydown", e => {
  if (getComputedStyle(popup).display === "flex") {
    setInputMode("keyboard");
    const popupBtns = [buttons.popupYes, buttons.popupNo];
    if (/Arrow(Right|Left)/.test(e.key)) {
      let idx = popupBtns.findIndex(b => b.classList.contains("keyboard-selected"));
      idx = (idx + (e.key === "ArrowRight" ? 1 : -1) + popupBtns.length) % popupBtns.length;
      popupBtns.forEach((b, i) => b.classList.toggle("keyboard-selected", i === idx));
      popupBtns[idx].focus();
      e.preventDefault();
    } else if (e.key === "Enter") {
      popupBtns.find(b => b.classList.contains("keyboard-selected")).click();
    }
    return;
  }

  if (
    getComputedStyle(containers.tile).display === "flex" &&
    buttons.save.disabled &&
    (/Arrow(Right|Left)/.test(e.key) || e.key === "Enter")
  ) {
    setInputMode("keyboard");
    return;
  }

  if (getComputedStyle(containers.tile).display !== "none") {
    if (/Arrow(Right|Left)/.test(e.key)) {
      setInputMode("keyboard");
      moveTileSelection(e.key === "ArrowRight" ? 1 : -1);
      e.preventDefault();
    } else if (e.key === "Enter" && !tiles[selectedTileIndex].classList.contains("disabled")) {
      setInputMode("keyboard");
      tiles[selectedTileIndex].click();
    }
  }
});

function goBackToTiles() {
  showView("tile");
}

arrowPrev.addEventListener("click", goBackToTiles);
buttons.passPrev.addEventListener("click", goBackToTiles);
if (buttons.passPrev1) {
  buttons.passPrev1.addEventListener("click", goBackToTiles);
}
buttons.sonstPrev.addEventListener("click", goBackToTiles);
buttons.mboardPrev.addEventListener("click", goBackToTiles);
buttons.zalandoPrev.addEventListener("click", goBackToTiles);
if (buttons.mboardRetourePrev) {
  buttons.mboardRetourePrev.addEventListener("click", goBackToTiles);
}

function updateTile() {
  tiles.forEach((t, i) => {
    if (i === selectedTile) {
      t.classList.add("keyboard-selected");
      t.scrollIntoView({ behavior: "smooth", block: "center" });
      t.focus();
    } else {
      t.classList.remove("keyboard-selected");
      t.style.transform = "";
    }
  });
  localStorage.setItem("lastSelectedTileIndex", selectedTile);
}

function selectTile(i, name) {
  if (userFieldsWrapper) {
    userFieldsWrapper.style.display = "none";
  }

  selectedTileIndex = i;
  currentTileName = name;

  updateTileSelection();

  hideAllViews();

  switch (name) {
    case "Online Gutscheine":
      showView("gutschein");
      resetGutscheinForm();
      focusDelayed(inputs.gutschein);
      break;

    case "Zalando Bestellung nicht erf\u00fcllbar":
      resetZalandoFlowCompletely();
      showView("best1");
      focusDelayed(inputs.best1);
      break;

    case "Zalando Passwort zur\u00fccksetzen":
      showView("pass1");
      focusFirstPasswortReason();
      break;

    case "Sonstiges Anliegen":
      console.log("showView aufgerufen mit:", name);
      showView("sonstiges");
      focusDelayed(inputs.sonstiges);
      break;

    case "Mboard Probleme":
      console.log("showView mboard triggered!");
      showView("mboard");
      focusDelayed(inputs.mboard);
      break;

    case "M-Board Retoure":
      showView("mboardRetoure");
      focusDelayed(inputs.mboardOrder);
      break;

    default:
      showView("tile");
      break;
  }
}

tiles.forEach((t, i) => {
  t.tabIndex = 0;

  t.addEventListener("pointerenter", e => {
    if (e.pointerType === "mouse") {
      selectedTileIndex = i;
      setInputMode("mouse");
    }
  });

  t.addEventListener("click", e => {
    if (t.classList.contains("disabled")) {
      e.stopPropagation();
      return;
    }
    selectTile(i, t.dataset.kachelname);
  });
});
