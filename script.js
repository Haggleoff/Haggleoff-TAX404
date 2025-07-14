let normalProgress = 0;
let completedStreaks = 0;
let powerCardsTotal = 0;

function renderCardProgress(progress) {
  if (progress === 0) {
    return "┌─┐\n│0│\n└─┘";
  }

  let topRow = "", midRow = "", botRow = "";
  for (let i = 1; i <= progress; i++) {
    topRow += "┌─┐ ";
    midRow += `│${i}│ `;
    botRow += "└─┘ ";
  }

  return `${topRow.trim()}\n${midRow.trim()}\n${botRow.trim()}`;
}

function calculate() {
  const normalInput = document.getElementById("normal");
  const powerInput = document.getElementById("power");
  const interrupted = document.getElementById("interrupted").checked;

  const normal = Number(normalInput.value);
  const power = Number(powerInput.value);

  if (!Number.isInteger(normal)) {
    alert("Normal Cards must be a whole number. Please re-enter.");
    return;
  }

  if (!Number.isInteger(power)) {
    alert("Power Cards must be a whole number. Please re-enter.");
    return;
  }

  if (interrupted) {
    normalProgress = 0;
  } else {
    normalProgress += normal;
    const newStreaks = Math.floor(normalProgress / 5);
    completedStreaks += newStreaks;
    normalProgress = normalProgress % 5;
  }

  powerCardsTotal += power;

  const totalBreaks = completedStreaks + powerCardsTotal;

  document.getElementById("streaks").innerText = completedStreaks;
  document.getElementById("powers").innerText = powerCardsTotal;
  document.getElementById("totalBreaks").innerText = totalBreaks;
  document.getElementById("tallyProgress").innerText = renderCardProgress(normalProgress);

  normalInput.value = "";
  powerInput.value = "";
  document.getElementById("interrupted").checked = false;
}

function calculateFinalTaxes() {
  const coinsInput = document.getElementById("coinsEarned");
  const propertiesInput = document.getElementById("propertiesOwned");

  const coins = Number(coinsInput.value);
  let properties = Number(propertiesInput.value);

  if (!Number.isInteger(coins)) {
    alert("Haggleoffs Earned must be a whole number. Please re-enter.");
    return;
  }

  if (!Number.isInteger(properties)) {
    alert("Properties Owned must be a whole number. Please re-enter.");
    return;
  }

  if (properties < 1) {
    properties = 1;
    propertiesInput.value = "1";
  }

  const taxBreaks = completedStreaks + powerCardsTotal;

  let bracketTax = 0;
  let taxRate = "";
  let message = "";

  if (coins <= 6) {
    bracketTax = 0;
    taxRate = "0%";
    message = "Enjoy tax-free poverty.";
  } else if (coins <= 14) {
    bracketTax = 3;
    taxRate = "21–43%";
    message = "The poor get crushed.";
  } else if (coins <= 24) {
    bracketTax = 5;
    taxRate = "21–33%";
    message = "The middle class gets squeezed.";
  } else if (coins <= 39) {
    bracketTax = 8;
    taxRate = "21–32%";
    message = "The rich barely feel it.";
  } else {
    bracketTax = 10;
    taxRate = "20–25%";
    message = "Wealth scales, burden doesn’t.";
  }

  // Property tax waived if coins ≤ 6
  const propertyTax = (coins > 6)
    ? properties * (properties >= 4 ? 2 : 1)
    : 0;

  const totalTax = Math.max(0, bracketTax + propertyTax - taxBreaks);

  document.getElementById("finalTax").innerText = `${totalTax} coin(s)`;
  document.getElementById("taxRateCategory").innerText = taxRate;
  document.getElementById("bracketMessage").innerText = message;
}