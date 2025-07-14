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
  const normal = Number(document.getElementById("normal").value);
  const power = Number(document.getElementById("power").value);
  const interruptedChoice = document.querySelector('input[name="interrupted"]:checked');

  if (!Number.isInteger(normal)) {
    alert("Normal Cards must be a whole number.");
    return;
  }
  if (!Number.isInteger(power)) {
    alert("Power Cards must be a whole number.");
    return;
  }
  if (!interruptedChoice) {
    alert("Please select whether you took from charity (this round).");
    return;
  }

  const interrupted = interruptedChoice.value === "yes";

  if (interrupted) {
    normalProgress = 0;
  } else {
    normalProgress += normal;
    const newStreaks = Math.floor(normalProgress / 5);
    completedStreaks += newStreaks;
    normalProgress %= 5;
  }

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
  const coins = Number(document.getElementById("coinsEarned").value);
  let properties = Number(document.getElementById("propertiesOwned").value);

  if (!Number.isInteger(coins)) {
    alert("Coins Earned must be a whole number.");
    return;
  }
  if (!Number.isInteger(properties)) {
    alert("Properties Owned must be a whole number.");
    return;
  }

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

  const propertyTax = (coins > 6)
    ? properties * (properties >= 4 ? 2 : 1)
    : 0;

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
}
