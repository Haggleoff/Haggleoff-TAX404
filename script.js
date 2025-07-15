let normalProgress = 0;
let completedStreaks = 0;
let powerCardsTotal = 0;

function renderCardProgress(progress) {
  if (progress === 0) return "┌─┐\n│0│\n└─┘";

  let top = "", mid = "", bot = "";
  for (let i = 1; i <= progress; i++) {
    top += "┌─┐ ";
    mid += `│${i}│ `;
    bot += "└─┘ ";
  }
  return `${top.trim()}\n${mid.trim()}\n${bot.trim()}`;
}

function calculate() {
  const normal = document.getElementById("normal").value.trim();
  const power = document.getElementById("power").value.trim();
  const interruptedChoice = document.querySelector('input[name="interrupted"]:checked');

  if (!/^\d+$/.test(normal)) {
    customPopup("Normal Cards must be a whole number.", () => {});
    return;
  }
  if (!/^\d+$/.test(power)) {
    customPopup("Power Cards must be a whole number.", () => {});
    return;
  }
  if (!interruptedChoice) {
    customPopup("Please select whether you took from Charity this round.", () => {});
    return;
  }

  const normalNum = Number(normal);
  const powerNum = Number(power);
  const interrupted = interruptedChoice.value === "yes";

  if (interrupted) {
    customPopup("Did you complete any streaks before taking from charity?", function(completedBefore) {
      if (completedBefore) {
        customInputPopup("How many normal cards were donated before charity was taken?", function(before) {
          if (before > normalNum) {
            customPopup("Invalid input: cannot exceed total normal cards this round.", () => {});
            return;
          }

          normalProgress += before;
          completedStreaks += Math.floor(normalProgress / 5);
          normalProgress %= 5;

          const after = normalNum - before;
          completedStreaks += Math.floor(after / 5);
          normalProgress = after % 5;

          finalizeRound(powerNum);
        });
      } else {
        customInputPopup("How many normal cards were donated after charity was taken?", function(after) {
          if (after > normalNum) {
            customPopup("Invalid input: cannot exceed total normal cards this round.", () => {});
            return;
          }

          completedStreaks += Math.floor(after / 5);
          normalProgress = after % 5;

          finalizeRound(powerNum);
        });
      }
    });
  } else {
    normalProgress += normalNum;
    completedStreaks += Math.floor(normalProgress / 5);
    normalProgress %= 5;

    finalizeRound(powerNum);
  }
}

function finalizeRound(power) {
  powerCardsTotal += power;
  const totalBreaks = completedStreaks + powerCardsTotal;

  document.getElementById("streaks").innerText = completedStreaks;
  document.getElementById("powers").innerText = powerCardsTotal;
  document.getElementById("totalBreaks").innerText = totalBreaks;
  document.getElementById("tallyProgress").innerText = renderCardProgress(normalProgress);

  document.getElementById("normal").value = "";
  document.getElementById("power").value = "";
  document.querySelectorAll('input[name="interrupted"]').forEach(el => el.checked = false);
}

function calculateFinalTaxes() {
  const coinsInput = document.getElementById("coinsEarned").value.trim();
  const propertiesInput = document.getElementById("propertiesOwned").value.trim();

  if (!/^\d+$/.test(coinsInput) || !/^\d+$/.test(propertiesInput)) {
    customPopup("Please enter valid whole numbers for both fields.", () => {});
    return;
  }

  const coins = Number(coinsInput);
  let properties = Number(propertiesInput);

  if (properties < 1) {
    properties = 1;
    document.getElementById("propertiesOwned").value = "1";
  }

  const taxBreaks = completedStreaks + powerCardsTotal;

  let bracketTax = 0;
  let message = "";

  if (coins <= 6) {
    bracketTax = 0;
    message = "Enjoy tax-free poverty.";
  } else if (coins <= 14) {
    bracketTax = 3;
    message = "The poor get crushed.";
  } else if (coins <= 24) {
    bracketTax = 5;
    message = "The middle class gets squeezed.";
  } else if (coins <= 39) {
    bracketTax = 8;
    message = "The rich barely feel it.";
  } else {
    bracketTax = 10;
    message = "Wealth scales, burden doesn’t.";
  }

  const propertyTax = coins > 6 ? properties * (properties >= 4 ? 2 : 1) : 0;
  const preLimitTax = bracketTax + propertyTax;
  const postBreakTax = Math.max(0, preLimitTax - taxBreaks);
  const finalTax = Math.min(postBreakTax, coins);

  const beforeRate = coins > 0 ? Math.round((preLimitTax / coins) * 100) : 0;
  const afterRate  = coins > 0 ? Math.round((finalTax / coins) * 100) : 0;

  document.getElementById("finalBreaksApplied").innerText = taxBreaks;
  document.getElementById("finalTax").innerText = `${finalTax} coin(s)`;
  document.getElementById("taxRateBefore").innerText = `${beforeRate}%`;
  document.getElementById("taxRateCategory").innerText = `${afterRate}%`;
  document.getElementById("bracketMessage").innerText = message;

  document.getElementById("playAgainBtn").style.display = "block";
}

function showEndgame() {
  customPopup("Are you sure the game is over and you're ready to file your endgame taxes?", function(confirmEnd) {
    if (confirmEnd) {
      document.getElementById("calculatorContainer").style.display = "none";
      document.getElementById("endgameContainer").style.display = "block";
    }
  });
}

function playAgain() {
  customPopup("Are you sure you want to reset the game and start over?", function(confirmReset) {
    if (confirmReset) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });

      normalProgress = 0;
      completedStreaks = 0;
      powerCardsTotal = 0;

      document.getElementById("normal").value = "";
      document.getElementById("power").value = "";
      document.querySelectorAll('input[name="interrupted"]').forEach(el => el.checked = false);
      document.getElementById("coinsEarned").value = "";
      document.getElementById("propertiesOwned").value = "";

      document.getElementById("streaks").innerText = "0";
      document.getElementById("powers").innerText = "0";
      document.getElementById("totalBreaks").innerText = "0";
      document.getElementById("tallyProgress").innerText = "–";

      document.getElementById("finalBreaksApplied").innerText = "–";
      document.getElementById("finalTax").innerText = "–";
      document.getElementById("taxRateBefore").innerText = "–";
      document.getElementById("taxRateCategory").innerText = "–";
      document.getElementById("bracketMessage").innerText = "";

      document.getElementById("endgameContainer").style.display = "none";
      document.getElementById("calculatorContainer").style.display = "block";
      document.getElementById("playAgainBtn").style.display = "none";
    }
  });
}

/* 🪄 Custom Yes/No Modal */
function customPopup(message, callback) {
  const overlay = document.getElementById("customPopupOverlay");
  const msg = document.getElementById("customPopupMessage");
  const yesBtn = document.getElementById("customPopupYes");
  const noBtn = document.getElementById("customPopupNo");

  msg.innerText = message;
  overlay.style.display = "flex";

  yesBtn.onclick = () => {
    overlay.style.display = "none";
    callback(true);
  };
  noBtn.onclick = () => {
    overlay.style.display = "none";
    callback(false);
  };
}

/* 📥 Custom Input Modal */
function customInputPopup(question, callback) {
  const overlay = document.getElementById("customInputOverlay");
  const message = document.getElementById("customInputMessage");
  const field = document.getElementById("customInputField");
  const submit = document.getElementById("customInputSubmit");
  const cancel = document.getElementById("customInputCancel");

  message.innerText = question;
  field.value = "";
  overlay.style.display = "flex";

  submit.onclick = () => {
    const value = field.value.trim();
    if (!/^\d+$/.test(value)) {
      customPopup("Please enter a valid whole number.", () => {});
      return;
    }
    overlay.style.display = "none";
    callback(Number(value));
  };

  cancel.onclick = () => {
    overlay.style.display = "none";
  };
}
