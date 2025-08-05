let players = [];
let currentPlayerIndex = 0;
let timerInterval = null;
let timeLeft = 60;
let timerRunningState = true;

// --- TIMER LOGIC ---
function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    if (timerRunningState && timeLeft > 0) {
      timeLeft--;
      updatePopupTimerDisplay();
      if (timeLeft <= 0) {
        timerRunningState = false;
        updatePauseButtonState();
      }
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function updatePopupTimerDisplay() {
  const timerDivs = document.querySelectorAll("#playerTimer");
  timerDivs.forEach(div => div.innerText = timeLeft);
}

function updatePauseButtonState() {
  const pauseBtn = document.getElementById("pauseResumeBtn");
  if (!pauseBtn) return;
  if (timeLeft <= 0) {
    pauseBtn.innerText = "Restart";
    pauseBtn.style.backgroundColor = "";
  } else if (timerRunningState) {
    pauseBtn.innerText = "Pause";
    pauseBtn.style.backgroundColor = "#947c52";
  } else {
    pauseBtn.innerText = "Resume";
    pauseBtn.style.backgroundColor = "";
  }
}

function attachPauseButtonHandler() {
  const pauseBtn = document.getElementById("pauseResumeBtn");
  if (!pauseBtn) return;
  pauseBtn.onclick = function () {
    if (pauseBtn.innerText === "Pause") {
      timerRunningState = false;
      updatePauseButtonState();
    } else if (pauseBtn.innerText === "Resume") {
      timerRunningState = true;
      updatePauseButtonState();
    } else if (pauseBtn.innerText === "Restart") {
      timeLeft = 60;
      timerRunningState = true;
      updatePopupTimerDisplay();
      updatePauseButtonState();
    }
  };
}

// --- PLAYER ENTRY & SETUP ---
document.getElementById("playerForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const entered = [...this.querySelectorAll("input[name='playerName']")].filter(input => input.value.trim());
  if (entered.length < 2) {
    customPopup("You’ll need at least two capitalists to get crushed. Multiplayer only!");
    return;
  }
  players = entered.map(input => ({
    name: input.value.trim(),
    streaks: 0,
    powerCards: 0,
    progress: 0,
    coins: 0,
    properties: 0,
    tax: 0
  }));
  document.getElementById("playerSetupBox").style.display = "none";
  const n = players.length;
  let setupMsg = `<span style="font-family: 'Roboto', sans-serif; color: #f1f1f1;">Reloading this page will reset your progress.</span><br><br>`;
  setupMsg += `<span style="font-family: 'Roboto', sans-serif; color: #f1f1f1;">
      After each player receives 1 free starting property during Setup,
    </span><br>
    <span style="font-family: 'Lilita One', cursive; color: #d4af7f;">
      Property Stack size: ${n + 1}
    </span>`;
  customPopup(setupMsg, function() {
    showStartOptions();
  }, true, "Yes", "No", true);
});

let cachedDropdownHTML = "";

function showStartOptions() {
  cachedDropdownHTML = buildPlayerDropdownHTML();
  document.getElementById("mainGameContainer").innerHTML = `
    <div class="calculatorBox">
      <h2>Choose Starting Player</h2>
      <button onclick="manualStarter()">Select Starting Player</button>
      <button onclick="randomStarter()">Random Player</button>
    </div>
  `;
}

function buildPlayerDropdownHTML() {
  return `<select id="playerSelector" onchange="handlePlayerSwitch(this)">
    ${players.map((p, i) => `<option value="${i}" ${i === currentPlayerIndex ? "selected" : ""}>${p.name}</option>`).join("")}
  </select>`;
}

function manualStarter() {
  const html = cachedDropdownHTML + `<br><br><button onclick="confirmManualStarter()">Confirm</button>`;
  customHTMLPopup("Select starting player:", html, () => {});
}

function confirmManualStarter() {
  const select = document.getElementById("playerSelector");
  currentPlayerIndex = Number(select.value);
  document.getElementById("customPopupOverlay").style.display = "none";
  timeLeft = 60;
  timerRunningState = true;
  initializeTurn();
}

function handlePlayerSwitch(el) {
  const selectedIndex = Number(el.value);
  if (selectedIndex === currentPlayerIndex) return;
  customPopup(
    `End <span class="player-name">${players[currentPlayerIndex].name}</span>'s turn and switch to <span class="player-name">${players[selectedIndex].name}</span>?`, 
    function(confirm) {
      if (confirm) {
        stopTimer();
        timeLeft = 60;
        currentPlayerIndex = selectedIndex;
        timerRunningState = true;
        initializeTurn();
      } else {
        el.value = currentPlayerIndex;
      }
    },
    true
  );
}

function randomStarter() {
  document.getElementById("mainGameContainer").innerHTML = `
    <div class="calculatorBox">
      <h2>🔒 Appointing Board Chair...</h2>
      <p><em>Preparing randomized selection. Cue suspense...</em></p>
    </div>
  `;
  setTimeout(() => {
    currentPlayerIndex = Math.floor(Math.random() * players.length);
    const name = players[currentPlayerIndex].name;
    document.getElementById("mainGameContainer").innerHTML = `
      <div class="calculatorBox">
        <h2>🎉 Starting Player is...</h2>
        <h1><span class="player-name">${name}</span></h1>
        <button onclick="initializeTurn()">START</button>
      </div>
    `;
    timeLeft = 60;
    timerRunningState = true;
  }, 3000);
}

function initializeTurn() {
  showDonateOrCharityPopup();
}

// --- PICK PLAYER MODAL ---
function pickPlayerPopup() {
  const dropdownHtml = `<select id="turnPlayerSelector">
    ${players.map((p, i) => `<option value="${i}" ${i === currentPlayerIndex ? "selected" : ""}>${p.name}</option>`).join("")}
  </select>`;
  const html = `
    ${dropdownHtml}
    <br><br>
    <button id="confirmPickPlayer" class="styled-btn">Confirm</button>
  `;
  customHTMLPopup(
    `<div style="text-align:center; font-family:'Lilita One'; font-size:1.5rem; margin-bottom:1rem;">
      <span class="player-name">${players[currentPlayerIndex].name}</span>'s Turn
    </div>
    Pick a player to take their turn:`,
    html,
    () => {
      const confirmBtn = document.getElementById("confirmPickPlayer");
      const selector = document.getElementById("turnPlayerSelector");
      if (confirmBtn && selector) {
        confirmBtn.onclick = () => {
          if (Number(selector.value) !== currentPlayerIndex) {
            stopTimer();
            currentPlayerIndex = Number(selector.value);
            timeLeft = 60;
            timerRunningState = true;
          }
          document.getElementById("customPopupOverlay").style.display = "none";
          initializeTurn();
        };
      }
      const closeBtn = document.getElementById("customCloseBtn");
      if (closeBtn) {
        closeBtn.onclick = () => {
          document.getElementById("customPopupOverlay").style.display = "none";
          showDonateOrCharityPopup();
        };
      }
    }
  );
}

// --- PLAYER TURN POPUP ---
function showDonateOrCharityPopup() {
  timerRunningState = true;
  startTimer();

  const player = players[currentPlayerIndex];
  const popupTitleHTML = `
    <div style="text-align:center; font-family:'Lilita One'; font-size:1.5rem; margin-bottom:1rem;">
      <span class="player-name">${player.name}</span>'s Turn
    </div>
  `;
  const titleRowHTML = `
    <div style="display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-bottom:0.5rem;">
      <button id="popupPickPlayerBtn" class="styled-btn" style="margin-left:0.25rem;">Pick Player</button>
      <span id="popupDropdownContainer" style="display:none; margin-left:0.5rem;"></span>
    </div>
  `;
  const timerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; margin: 1rem 0 1rem 0;">
      <p id="playerTimer" style="margin-bottom: 0.25rem; font-family:'Lilita One'; font-size:2.2rem; color:#d4af7f;">${timeLeft}</p>
      <div style="display:flex; gap:0.5rem;">
        <button id="pauseResumeBtn" class="styled-btn">Pause</button>
      </div>
    </div>
  `;
  const streakProgressHTML = `
    <div style="margin-bottom:1rem;">
      <strong>Current Streak Progress:</strong>
      ${renderCardProgress(player.progress) || "<span style='color:#bbb;'>No cards in streak.</span>"}
      <br>
      <span style="font-family:'Lilita One'; color:#d4af7f;">
        Tax Breaks Earned: ${player.streaks + player.powerCards}
      </span>
    </div>
  `;
  const popupContent = `
    ${popupTitleHTML}
    ${titleRowHTML}
    ${timerHTML}
    Did <span class="player-name">${player.name}</span> <strong>Donate</strong> or <strong>Take Charity</strong>?<br><br>
    ${streakProgressHTML}
    <div id="endgameBtnContainer"></div>
  `;
  customPopup(
    popupContent,
    function(choice) {
      if (choice === true) {
        loadCalculator();
      } else {
        players[currentPlayerIndex].progress = 0;
        showDonateOrCharityPopup();
      }
    },
    true,
    "Donate",
    "Took Charity"
  );
  setTimeout(() => {
    updatePopupTimerDisplay();
    updatePauseButtonState();
    attachPauseButtonHandler();

    // -- FIX: Attach Pick Player handler --
    const pickBtn = document.getElementById("popupPickPlayerBtn");
    if (pickBtn) {
      pickBtn.onclick = function() {
        pickPlayerPopup();
      };
    }

    // Endgame button logic (optional)
    const yesBtn = document.getElementById("customPopupYes");
    const noBtn = document.getElementById("customPopupNo");
    const overlay = document.getElementById("customPopupOverlay");
    if (yesBtn && noBtn && overlay) {
      const oldEndgame = document.getElementById("endgameFromTurn");
      if (oldEndgame) oldEndgame.remove();
      const endgameBtn = document.createElement("button");
      endgameBtn.type = "button";
      endgameBtn.id = "endgameFromTurn";
      endgameBtn.className = "styled-btn popup-action-btn";
      endgameBtn.innerText = "Endgame Taxes";
      endgameBtn.style.backgroundColor = "#947c52";
      endgameBtn.onclick = function() {
        overlay.style.display = "none";
        showEndgame();
      };
      noBtn.parentNode.insertBefore(endgameBtn, noBtn.nextSibling);
    }
  }, 50);
}

function loadCalculator() {
  document.getElementById("mainGameContainer").innerHTML = `
    <div class="calculatorBox">
      <h2><span class="player-name">${players[currentPlayerIndex].name}</span>'s Turn</h2>
      <div id="tallyProgress">${renderCardProgress(players[currentPlayerIndex].progress)}</div>
      <label>Normal Cards Donated (this round):</label>
      <input type="number" id="normal" min="0" step="1"><br>
      <label>Power Cards or Cash Donated (this round):</label>
      <input type="number" id="power" min="0" step="1"><br>
      <p style="font-family:'Lilita One'; color:#d4af7f;">Tax Breaks Earned: ${players[currentPlayerIndex].streaks + players[currentPlayerIndex].powerCards}</p>
      <button onclick="confirmTurn()">Confirm</button>
    </div>
  `;
}

// --- DONATION LOGIC ---
function confirmTurn() {
  const normalVal = document.getElementById("normal").value.trim();
  const powerVal = document.getElementById("power").value.trim();
  if (normalVal === "" && powerVal === "") {
    customPopup("Please enter your donations for at least one field.");
    return;
  }
  if (
    (normalVal !== "" && !/^\d+$/.test(normalVal)) ||
    (powerVal !== "" && !/^\d+$/.test(powerVal))
  ) {
    customPopup("Please enter whole numbers only (no decimals or negative numbers) for both Normal Cards Donated and Power Cards or Cash Donated.");
    return;
  }
  const normalNum = normalVal === "" ? 0 : Number(normalVal);
  const powerNum = powerVal === "" ? 0 : Number(powerVal);
  if (normalNum < 0 || powerNum < 0) {
    customPopup("Please enter non-negative whole numbers for both Normal Cards Donated and Power Cards or Cash Donated.");
    return;
  }
  const p = players[currentPlayerIndex];
  p.progress += normalNum;
  const completedStreaks = Math.floor(p.progress / 5);
  p.streaks += completedStreaks;
  p.progress = p.progress % 5;
  p.powerCards += powerNum;
  showDonateOrCharityPopup();
}

// --- ENDGAME SECTION ---
function showEndgame() {
  customPopup("Is the game over? Ready for final taxes?", function(confirm) {
    if (confirm) {
      loadEndgame();
    } else {
      showDonateOrCharityPopup();
    }
  });
}

function loadEndgame() {
  stopTimer();
  timerRunningState = false;
  let blocks = players.map((p, i) => `
    <div class="playerEndgameBlock">
      <h3><span class="player-name">${p.name}</span></h3>
      <div class="sideInputs">
        <input type="number" id="coins_${i}" min="0" step="1" placeholder="Haggleoffs">
        <input type="number" id="props_${i}" min="1" step="1" placeholder="Properties">
      </div>
    </div>
  `).join("");

  document.getElementById("mainGameContainer").innerHTML = `
    <div class="calculatorBox">
      <h2>Endgame</h2>
      <p style="text-align:center;">Enter each player’s Haggleoffs and Properties.</p>
      ${blocks}
      <button onclick="calculateFinalTaxes()">Calculate Taxes</button>
      <div id="finalSummary" style="display:none;"></div>
    </div>
  `;
}

// --- UPDATED TAX BRACKET MESSAGE FUNCTION ---
function getTaxBracketMessage(coins, properties) {
  // New satirical message if coins <= 6 and more than 3 properties
  if (coins <= 6 && properties > 3) return "Broke on paper, rich in acres.";
  if (coins <= 6) return "Enjoy tax-free poverty.";
  if (coins <= 14) return "The poor get crushed.";
  if (coins <= 24) return "The middle class gets squeezed.";
  if (coins <= 39) return "The rich barely feel it.";
  return "Wealth scales, burden doesn’t.";
}

function calculateFinalTaxes() {
  const summary = document.getElementById("finalSummary");
  summary.style.display = "none";
  summary.innerHTML = "";

  for (let i = 0; i < players.length; i++) {
    const coinsVal = document.getElementById(`coins_${i}`).value.trim();
    const propsVal = document.getElementById(`props_${i}`).value.trim();
    if (!/^\d+$/.test(coinsVal) || !/^\d+$/.test(propsVal)) {
      customPopup("Use only whole non-negative numbers.");
      return;
    }
  }

  summary.style.display = "block";
  summary.innerHTML = "<h3>Final Results</h3>";

  players.forEach((p, i) => {
    const coinsVal = document.getElementById(`coins_${i}`).value.trim();
    const propsVal = document.getElementById(`props_${i}`).value.trim();

    p.coins = Number(coinsVal);
    p.properties = Math.max(1, Number(propsVal));

    const bracketTax = p.coins <= 6 ? 0 : p.coins <= 14 ? 3 : p.coins <= 24 ? 5 : p.coins <= 39 ? 8 : 10;
    const propertyTax = p.coins > 6 ? p.properties * (p.properties >= 4 ? 2 : 1) : 0;

    // --- CAP GROSS TAX AT 54% ---
    let preLimitTax = bracketTax + propertyTax;
    if (p.coins > 6) {
      const maxGrossTax = Math.floor(p.coins * 0.54); // CHANGED FROM 0.58 TO 0.54
      if (preLimitTax > maxGrossTax) {
        preLimitTax = maxGrossTax;
      }
    }

    const postBreakTax = Math.max(0, preLimitTax - (p.streaks + p.powerCards));
    p.tax = Math.min(postBreakTax, p.coins);

    const avoided = Math.max(0, preLimitTax - p.tax);
    const beforeRate = p.coins ? Math.round((preLimitTax / p.coins) * 100) : 0;
    const afterRate = p.coins ? Math.round((p.tax / p.coins) * 100) : 0;
    const netIncome = p.coins - p.tax;

    summary.innerHTML += `
      <p>
        <span class="player-name">${p.name}</span><br>
        Coins: ${p.coins}, Properties: ${p.properties}<br>
        <strong>Gross Tax: ${preLimitTax}</strong><br>
        <span style="font-weight:bold; color:#d4af7f;">Effective Rate: ${beforeRate}% → ${afterRate}%</span><br>
        Deductions: ${avoided}<br>
        <span style="font-weight:bold; color:#d4af7f;">Tax Owed: ${p.tax}</span><br>
        <span style="font-weight:bold; color:#d4af7f;">Net Income: ${netIncome}</span><br>
        Audit Risk: ${getAuditRiskLevel(p)}<br>
        <em style="color:#d4af7f;">${getTaxBracketMessage(p.coins, p.properties)}</em>
      </p>
    `;
  });

  determineWinner();
}

function getAuditRiskLevel(player) {
  const breaks = player.streaks + player.powerCards;
  const income = player.coins || 1;
  const ratio = breaks / income;

  if (ratio >= 1) return "Board Review Pending";
  if (ratio >= 0.5) return "High";
  if (ratio >= 0.3) return "Moderate";
  return "Low";
}

function determineWinner() {
  const netWorths = players.map(p => p.coins - p.tax);
  const maxCoins = Math.max(...netWorths);
  const contenders = players.filter(p => (p.coins - p.tax) === maxCoins);
  const summary = document.getElementById("finalSummary");

  if (contenders.length === 1) {
    summary.innerHTML += `<p><strong><span class="player-name">${contenders[0].name}</span> wins with ${maxCoins} Haggleoffs!</strong></p>`;
  } else {
    const maxProps = Math.max(...contenders.map(p => p.properties));
    const tied = contenders.filter(p => p.properties === maxProps);
    if (tied.length === 1) {
      summary.innerHTML += `<p><strong><span class="player-name">${tied[0].name}</span> wins by owning more properties!</strong></p>`;
    } else {
      const names = tied.map(p => `<span class="player-name">${p.name}</span>`).join(", ");
      summary.innerHTML += `<p><strong><span style="color:#d4af7f;">There are no winners—just shareholders.</span></strong><br>Tied players: ${names}</p>`;
    }
  }

  summary.innerHTML += `
    <button onclick="exitToSetup()">EXIT</button>
  `;
}

function exitToSetup() {
  document.getElementById("mainGameContainer").innerHTML = `
    <div class="calculatorBox">
      <h2>Thank you for Haggleoffing...</h2>
      <button onclick="backToNameInput()">Enter New Players</button>
    </div>
  `;
}

function backToNameInput() {
  document.getElementById("playerSetupBox").style.display = "block";
  document.getElementById("mainGameContainer").innerHTML = "";
  players = [];
  currentPlayerIndex = 0;
  stopTimer();
  timerRunningState = true;
  timeLeft = 60;
}

// --- POPUPS/UTILS ---
function customPopup(message, callback, isHtml = false, yesText = "Yes", noText = "No", okOnly = false) {
  const overlay = document.getElementById("customPopupOverlay");
  const msg = document.getElementById("customPopupMessage");
  const yesBtn = document.getElementById("customPopupYes");
  const noBtn = document.getElementById("customPopupNo");

  if (isHtml) {
    msg.innerHTML = message;
  } else {
    msg.innerHTML = message.replace(/\n/g, "<br>");
  }
  overlay.style.display = "flex";

  if (typeof callback !== "function") {
    yesBtn.innerText = "OK";
    yesBtn.style.display = "inline-block";
    noBtn.style.display = "none";
    yesBtn.onclick = () => overlay.style.display = "none";
    const oldEndgame = document.getElementById("endgameFromTurn");
    if (oldEndgame) oldEndgame.remove();
  } else if (okOnly) {
    yesBtn.innerText = "OK";
    yesBtn.style.display = "inline-block";
    noBtn.style.display = "none";
    yesBtn.onclick = () => {
      overlay.style.display = "none";
      callback();
    };
  } else {
    yesBtn.innerText = yesText;
    noBtn.innerText = noText;
    yesBtn.style.display = "inline-block";
    noBtn.style.display = "inline-block";
    yesBtn.onclick = () => {
      overlay.style.display = "none";
      callback(true);
    };
    noBtn.onclick = () => {
      overlay.style.display = "none";
      callback(false);
    };
    const oldEndgame = document.getElementById("endgameFromTurn");
    if (oldEndgame) oldEndgame.remove();
  }
}

function customHTMLPopup(message, html, callback) {
  const overlay = document.getElementById("customPopupOverlay");
  const msg = document.getElementById("customPopupMessage");
  const yesBtn = document.getElementById("customPopupYes");
  const noBtn = document.getElementById("customPopupNo");

  msg.innerHTML = `${message}<br><br>${html}<br><br><button id="customCloseBtn">Close</button>`;
  overlay.style.display = "flex";
  yesBtn.style.display = "none";
  noBtn.style.display = "none";

  const closeBtn = document.getElementById("customCloseBtn");
  if (typeof callback === "function") callback();
}

function renderCardProgress(progress) {
  if (progress === 0) return "";
  let blocks = "";
  for (let i = 0; i < progress; i++) {
    blocks += `<div style="
      width: 24px;
      height: 36px;
      background-color: #d4af7f;
      margin: 0 3px;
      border-radius: 6px;">
    </div>`;
  }
  return `<div style="display: flex; justify-content: center; margin-top: 1rem;">${blocks}</div>`;
}

// --- Start timer on load ---
startTimer();
