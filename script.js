// ------- WheelPicker logic and device detection -------
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

let normalWheelPicker, powerWheelPicker, playerWheelPicker;

// Call after rendering donation and player pick fields
function initializeWheelPickers() {
  // Donation pickers for Normal and Power
  if (isMobileDevice() && window.WheelPicker) {
    // Normal
    const normalContainer = document.getElementById('normal-picker-container');
    if (normalContainer) {
      normalContainer.innerHTML = '';
      normalWheelPicker = new WheelPicker(normalContainer, {
        data: Array.from({length: 11}, (_, i) => i), // 0-10
        value: Number(document.getElementById('normal').value) || 0,
        onSelect: value => {
          document.getElementById('normal').value = value;
        }
      });
      // Allow manual entry for >10
      normalContainer.onclick = () => {
        let manual = prompt("Enter a number (0 or more):", document.getElementById('normal').value);
        if (manual !== null && /^\d+$/.test(manual)) {
          let n = Number(manual);
          document.getElementById('normal').value = n;
          normalWheelPicker.setValue(n > 10 ? 10 : n);
        }
      };
      document.getElementById('normal').style.display = 'none';
    }
    // Power
    const powerContainer = document.getElementById('power-picker-container');
    if (powerContainer) {
      powerContainer.innerHTML = '';
      powerWheelPicker = new WheelPicker(powerContainer, {
        data: Array.from({length: 11}, (_, i) => i), // 0-10
        value: Number(document.getElementById('power').value) || 0,
        onSelect: value => {
          document.getElementById('power').value = value;
        }
      });
      powerContainer.onclick = () => {
        let manual = prompt("Enter a number (0 or more):", document.getElementById('power').value);
        if (manual !== null && /^\d+$/.test(manual)) {
          let n = Number(manual);
          document.getElementById('power').value = n;
          powerWheelPicker.setValue(n > 10 ? 10 : n);
        }
      };
      document.getElementById('power').style.display = 'none';
    }
  } else {
    // Desktop fallback: show number inputs
    if (document.getElementById('normal')) document.getElementById('normal').style.display = '';
    if (document.getElementById('power')) document.getElementById('power').style.display = '';
    if (document.getElementById('normal-picker-container')) document.getElementById('normal-picker-container').innerHTML = '';
    if (document.getElementById('power-picker-container')) document.getElementById('power-picker-container').innerHTML = '';
  }

  // Player picker
  if (isMobileDevice() && window.WheelPicker && document.getElementById('player-picker-container')) {
    const playerContainer = document.getElementById('player-picker-container');
    playerContainer.innerHTML = '';
    playerWheelPicker = new WheelPicker(playerContainer, {
      data: players.map((p, i) => ({value: i, label: p.name})),
      value: currentPlayerIndex,
      onSelect: value => {
        document.getElementById('turnPlayerSelector').value = value;
      }
    });
    document.getElementById('turnPlayerSelector').style.display = 'none';
  } else {
    // Desktop: show native select
    if (document.getElementById('turnPlayerSelector')) document.getElementById('turnPlayerSelector').style.display = '';
    if (document.getElementById('player-picker-container')) document.getElementById('player-picker-container').innerHTML = '';
  }
}

// ------- App logic below ---------

let players = [];
let currentPlayerIndex = 0;

// Timer logic
let timerInterval = null;
let timeLeft = 60;
let timerRunning = false; // Track if timer is running

window.addEventListener("load", function () {
  const logo = document.getElementById("taxLogoText");
  logo.classList.remove("flicker-start");
  setTimeout(() => logo.classList.add("flicker-start"), 500);
});

function dismissDisclaimer() {
  document.getElementById("disclaimerOverlay").style.display = "none";
  document.getElementById("playerSetupBox").style.display = "block";
}

function addPlayerField() {
  const container = document.getElementById("playerInputFields");
  const count = container.querySelectorAll("input").length + 1;
  if (count > 7) return alert("Seven players is our legal max. Unless you wish to unionize.");

  const input = document.createElement("input");
  input.type = "text";
  input.name = "playerName";
  if (count === 2) {
    input.placeholder = "Player 2 (required)";
    input.required = true;
  } else {
    input.placeholder = `Player ${count} (optional)`;
  }
  container.appendChild(input);
}

document.getElementById("playerForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const entered = [...this.querySelectorAll("input[name='playerName']")].filter(input => input.value.trim());
  if (entered.length < 2) return customPopup("You’ll need at least two capitalists to get crushed.");
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
  initializeTurn();
}

function handlePlayerSwitch(el) {
  const selectedIndex = Number(el.value);
  if (selectedIndex === currentPlayerIndex) return;
  customPopup(
    `End <span class="player-name">${players[currentPlayerIndex].name}</span>'s turn and switch to <span class="player-name">${players[selectedIndex].name}</span>?`, 
    function(confirm) {
      if (confirm) {
        currentPlayerIndex = selectedIndex;
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
  }, 3000);
}

function initializeTurn() {
  // Always reset and pause timer for new player
  pausePlayerTimer();
  timeLeft = 60;
  timerRunning = false;
  showDonateOrCharityPopup();
}

// Timer helpers
function startPlayerTimer() {
  if (timerInterval) return; // Already running
  timerRunning = true;
  timerInterval = setInterval(() => {
    timeLeft--;
    updatePopupTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning = false;
      updatePopupTimerDisplay();
      const pauseBtn = document.getElementById("pauseResumeBtn");
      if (pauseBtn) pauseBtn.innerText = "Restart";
    }
  }, 1000);
}

function pausePlayerTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
}

function updatePopupTimerDisplay() {
  const timerDiv = document.getElementById("playerTimer");
  if (timerDiv) timerDiv.innerText = timeLeft;
}

// ------- Pick Player Popup with WheelPicker -------
function pickPlayerPopup() {
  const dropdownHtml = `<select id="turnPlayerSelector" style="display:none;">
    ${players.map((p, i) => `<option value="${i}" ${i === currentPlayerIndex ? "selected" : ""}>${p.name}</option>`).join("")}
  </select>
  <div id="player-picker-container"></div>`;
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
      if (typeof initializeWheelPickers === 'function') {
        initializeWheelPickers();
      }
      const confirmBtn = document.getElementById("confirmPickPlayer");
      confirmBtn.onclick = () => {
        let selectedIndex;
        if (isMobileDevice() && window.WheelPicker && window.playerWheelPicker) {
          selectedIndex = playerWheelPicker.getValue();
        } else {
          selectedIndex = Number(document.getElementById("turnPlayerSelector").value);
        }
        document.getElementById("customPopupOverlay").style.display = "none";
        if (selectedIndex !== currentPlayerIndex) {
          currentPlayerIndex = selectedIndex;
          initializeTurn();
        } else {
          showDonateOrCharityPopup();
        }
      };
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

// ------- End Pick Player Popup -------

function showDonateOrCharityPopup() {
  const player = players[currentPlayerIndex];
  const popupTitleHTML = `
    <div style="text-align:center; font-family:'Lilita One'; font-size:1.5rem; margin-bottom:1rem;">
      <span class="player-name">${player.name}</span>'s Turn
    </div>
  `;
  const titleRowHTML = `
    <div style="display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-bottom:0.5rem;">
      ${
        players.length > 1
          ? `<button id="popupPickPlayerBtn" class="styled-btn" style="margin-left:0.25rem;">Pick Player</button>
             <span id="popupDropdownContainer" style="display:none; margin-left:0.5rem;"></span>`
          : ""
      }
    </div>
  `;
  const timerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; margin: 1rem 0 1rem 0;">
      <p id="playerTimer" style="margin-bottom: 0.25rem; font-family:'Lilita One'; font-size:2.2rem; color:#d4af7f;">${timeLeft}</p>
      <div style="display:flex; gap:0.5rem;">
        <button id="pauseResumeBtn" class="styled-btn">${timerRunning ? "Pause" : "Start Timer"}</button>
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
        // Stay on same player, timer continues
        loadCalculator();
      } else {
        // Switch to next player: reset timer and pause it
        pausePlayerTimer();
        timeLeft = 60;
        timerRunning = false;
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        initializeTurn();
      }
    },
    true,
    "Donate",
    "Took Charity"
  );

  updatePopupTimerDisplay();

  setTimeout(() => {
    const pauseBtn = document.getElementById("pauseResumeBtn");
    if (pauseBtn) {
      pauseBtn.innerText = timerRunning ? "Pause" : "Start Timer";
      pauseBtn.onclick = function() {
        if (!timerRunning) {
          startPlayerTimer();
          pauseBtn.innerText = "Pause";
        } else {
          pausePlayerTimer();
          pauseBtn.innerText = "Resume";
        }
      };
    }
    if (players.length > 1) {
      const pickBtn = document.getElementById("popupPickPlayerBtn");
      if (pickBtn) pickBtn.onclick = function() { pickPlayerPopup(); };
    }
  }, 50);

  setTimeout(() => {
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
      endgameBtn.onclick = function() {
        overlay.style.display = "none";
        showEndgame();
      };
      noBtn.parentNode.insertBefore(endgameBtn, noBtn.nextSibling);
    }
  }, 0);
}

// ------- Donation Input with WheelPickers -------
function loadCalculator() {
  document.getElementById("mainGameContainer").innerHTML = `
    <div class="calculatorBox">
      <h2><span class="player-name">${players[currentPlayerIndex].name}</span>'s Turn</h2>
      <div id="tallyProgress">${renderCardProgress(players[currentPlayerIndex].progress)}</div>
      <label>Normal Cards Donated (this round):</label>
      <div id="normal-picker-container"></div>
      <input type="number" id="normal" min="0" step="1" value="0" style="display:none;">
      <label>Power Cards or Cash Donated (this round):</label>
      <div id="power-picker-container"></div>
      <input type="number" id="power" min="0" step="1" value="0" style="display:none;">
      <p style="font-family:'Lilita One'; color:#d4af7f;">Tax Breaks Earned: ${players[currentPlayerIndex].streaks + players[currentPlayerIndex].powerCards}</p>
      <button onclick="calculate()">Confirm</button>
    </div>
  `;
  if (typeof initializeWheelPickers === 'function') {
    initializeWheelPickers();
  }
}

function calculate() {
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

  // Stay on same player's popup, timer continues
  showDonateOrCharityPopup();
}

// ------- End Donation Input -------

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
  pausePlayerTimer();
  timerRunning = false;
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
    const preLimitTax = bracketTax + propertyTax;
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
        <em style="color:#d4af7f;">${getTaxBracketMessage(p.coins)}</em>
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

function getTaxBracketMessage(coins) {
  if (coins <= 6) return "Enjoy tax-free poverty.";
  if (coins <= 14) return "The poor get crushed.";
  if (coins <= 24) return "The middle class gets squeezed.";
  if (coins <= 39) return "The rich barely feel it.";
  return "Wealth scales, burden doesn’t.";
}

function determineWinner() {
  const netWorths = players.map(p => p.coins - p.tax);
  const maxCoins = Math.max(...netWorths);
  const contenders = players.filter(p => (p.coins - p.tax) === maxCoins);
  const summary = document.getElementById("finalSummary");
  if (players.length > 1) {
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
  pausePlayerTimer();
  timerRunning = false;
  timeLeft = 60;
}

// Popups
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

function customInputPopup(message, callback) {
  const overlay = document.getElementById("customInputOverlay");
  const msg = document.getElementById("customInputMessage");
  const field = document.getElementById("customInputField");
  const submit = document.getElementById("customInputSubmit");
  const cancel = document.getElementById("customInputCancel");
  msg.innerText = message;
  field.value = "";
  overlay.style.display = "flex";
  submit.onclick = () => {
    const val = Number(field.value.trim());
    if (!Number.isInteger(val) || val < 0) {
      overlay.style.display = "none";
      return customPopup("Please enter a valid whole number.");
    }
    overlay.style.display = "none";
    callback(val);
  };
  cancel.onclick = () => {
    overlay.style.display = "none";
  };
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