let players = [];
let currentPlayerIndex = 0;
let timerInterval = null;
let timeLeft = 60;

document.getElementById("playerForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const entered = [...this.querySelectorAll("input[name='playerName']")].filter(input => input.value.trim());

  if (entered.length < 1) return customPopup("You’ll need at least one capitalist to get crushed.");

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
  document.getElementById("globalClockContainer").style.display = "block";

  customPopup("Reloading this page will reset your progress.");

  if (players.length === 1) {
    initializeTurn();
  } else {
    showStartOptions();
  }
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
  currentPlayerIndex = Number(el.value);
  loadCalculator();
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
        <h1 style="color:#d4af7f">${name}</h1>
        <button onclick="initializeTurn()">START</button>
      </div>
    `;
  }, 3000);
}

function initializeTurn() {
  loadCalculator();
  startTurn();
}

function startTurn() {
  timeLeft = 60;
  updateTimerDisplay();
  clearInterval(timerInterval);
  timerInterval = setInterval(decrementTimer, 1000);
}

function updateTimerDisplay() {
  const buttonLabel = (timeLeft <= 0) ? "Restart Timer" : "Pause Timer";
  document.getElementById("globalClockContainer").innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
      <p id="playerTimer" style="margin-bottom: 0.25rem;">${timeLeft}</p>
      <button id="pauseResumeBtn" class="styled-btn" onclick="toggleTimer()">${buttonLabel}</button>
    </div>
  `;
}

function toggleTimer() {
  const btn = document.getElementById("pauseResumeBtn");

  if (timeLeft <= 0 && btn.innerText === "Restart Timer") {
    timeLeft = 60;
    updateTimerDisplay();
    clearInterval(timerInterval);
    timerInterval = setInterval(decrementTimer, 1000);
    return;
  }

  if (btn.innerText === "Pause Timer") {
    clearInterval(timerInterval);
    timerInterval = null;
    btn.innerText = "Resume Timer";
  } else {
    timerInterval = setInterval(decrementTimer, 1000);
    btn.innerText = "Pause Timer";
  }
}

function decrementTimer() {
  timeLeft--;
  document.getElementById("playerTimer").innerText = timeLeft;

  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;

    const btn = document.getElementById("pauseResumeBtn");
    if (btn) btn.innerText = "Restart Timer";

    const overlay = document.getElementById("customPopupOverlay");
    const msg = document.getElementById("customPopupMessage");
    const yesBtn = document.getElementById("customPopupYes");
    const noBtn = document.getElementById("customPopupNo");

    const name = players[currentPlayerIndex].name;
    let popupHTML = `${name}'s time is up. What now?<br><br>`;
    popupHTML += (players.length === 1)
      ? `<button onclick="loadCharityEntry()">Record Moves</button>`
      : `<button onclick="handleNextPlayer()">Next Player</button>
         <button onclick="loadCharityEntry()">Record Moves</button>`;

    msg.innerHTML = popupHTML;
    overlay.style.display = "flex";
    yesBtn.style.display = "none";
    noBtn.style.display = "none";
  }
}

function handleNextPlayer() {
  document.getElementById("customPopupOverlay").style.display = "none";
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  initializeTurn();
}

function loadCharityEntry() {
  document.getElementById("customPopupOverlay").style.display = "none";
  loadCalculator();
}

function loadCalculator() {
  const p = players[currentPlayerIndex];
  updateTimerDisplay();

  document.getElementById("mainGameContainer").innerHTML = `
    <div class="calculatorBox">
      <h2>${p.name}'s Turn</h2>
      ${players.length > 1 ? `<p>Select Next Player: ${cachedDropdownHTML}</p>` : ""}
      <div id="tallyProgress">${renderCardProgress(p.progress)}</div>
      <p>Completed Streaks: <span id="streaks">${p.streaks}</span></p>
      <p>Total Power Cards Donated: <span id="powers">${p.powerCards}</span></p>
      <label>Normal Cards Donated (this round):</label>
      <input type="number" id="normal" min="0" step="1"><br>
      <label>Power Cards Donated (this round):</label>
      <input type="number" id="power" min="0" step="1"><br>
      <p>Did you take from Charity (this round)?</p>
      <label><input type="radio" name="interrupted" value="yes"> Yes</label>
      <label><input type="radio" name="interrupted" value="no"> No</label><br>
      <p style="font-family:'Lilita One'; color:#d4af7f;">Tax Breaks Earned: ${p.streaks + p.powerCards}</p>
      <button onclick="calculate()">Confirm Moves</button>
      <button onclick="showEndgame()">Endgame Taxes</button>
    </div>
  `;
}

function calculate() {
  const normalVal = document.getElementById("normal").value.trim();
  const powerVal = document.getElementById("power").value.trim();
  const interruptedChoice = document.querySelector('input[name="interrupted"]:checked');
  const p = players[currentPlayerIndex];

  const normalNum = /^\d+$/.test(normalVal) ? Number(normalVal) : 0;
  const powerNum = /^\d+$/.test(powerVal) ? Number(powerVal) : 0;

  if (!interruptedChoice) {
    if (normalNum === 0 && p.progress === 0) {
      p.powerCards += powerNum;
      loadCalculator();
      return;
    }
    return customPopup("Please select whether Charity was taken this round.");
  }

  if (interruptedChoice.value === "yes") {
    if (p.progress > 0) p.progress = 0;

    if (normalNum > 0) {
      customInputPopup(`Of the ${normalNum} normal cards donated, how many were given BEFORE Charity was taken?`, function(beforeCards) {
        if (!Number.isInteger(beforeCards) || beforeCards < 0 || beforeCards > normalNum) {
          return customPopup("Invalid number. Must be between 0 and total donated.");
        }

                const afterCards = normalNum - beforeCards;
        p.progress += beforeCards;

        if (p.progress >= 5) {
          const completedBefore = Math.floor(p.progress / 5);
          p.streaks += completedBefore;
          p.progress = p.progress % 5;
        }

        p.progress = afterCards;

        if (p.progress >= 5) {
          const completedAfter = Math.floor(p.progress / 5);
          p.streaks += completedAfter;
          p.progress = p.progress % 5;
        }

        p.powerCards += powerNum;
        loadCalculator();
      });
    } else {
      p.progress = 0;
      p.powerCards += powerNum;
      loadCalculator();
    }
  } else {
    p.progress += normalNum;
    const completedStreaks = Math.floor(p.progress / 5);
    p.streaks += completedStreaks;
    p.progress = p.progress % 5;

    p.powerCards += powerNum;
    loadCalculator();
  }

  if (!players.length || players.length === 1) {
    document.getElementById("normal").value = "";
    document.getElementById("power").value = "";
    document.querySelectorAll('input[name="interrupted"]').forEach(el => el.checked = false);
  }
}

function showEndgame() {
  customPopup("Is the game over? Ready for final taxes?", function(confirm) {
    if (confirm) loadEndgame();
  });
}

function loadEndgame() {
  clearInterval(timerInterval);
  timerInterval = null;
  document.getElementById("playerTimer").innerText = "–";

  let blocks = players.map((p, i) => `
    <div class="playerEndgameBlock">
      <h3>${p.name}</h3>
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
  summary.style.display = "block";

  setTimeout(() => {
    summary.innerHTML = "<h3>Final Results</h3>";

    players.forEach((p, i) => {
      const coinsVal = document.getElementById(`coins_${i}`).value.trim();
      const propsVal = document.getElementById(`props_${i}`).value.trim();

      if (!/^\d+$/.test(coinsVal) || !/^\d+$/.test(propsVal)) return customPopup("Use only whole non-negative numbers.");

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

      summary.innerHTML += `
        <p><span style="font-family:'Lilita One'; color:#d4af7f;">
          ${p.name} — ${p.tax} Haggleoffs Tax Owed</span><br>
          Coins: ${p.coins}, Properties: ${p.properties}<br>
          Effective Rate: ${beforeRate}% → ${afterRate}%<br>
          Tax Avoided: ${avoided}<br>
          Audit Risk: ${getAuditRiskLevel(p)}<br>
          <em>${getTaxBracketMessage(p.coins)}</em>
        </p>
      `;
    });

    determineWinner();
  }, 1000);
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

  if (contenders.length === 1) {
    summary.innerHTML += `<p><strong><span style="color:#d4af7f;">${contenders[0].name} wins with ${maxCoins} Haggleoffs!</span></strong></p>`;
  } else {
    const maxProps = Math.max(...contenders.map(p => p.properties));
    const tied = contenders.filter(p => p.properties === maxProps);
    if (tied.length === 1) {
      summary.innerHTML += `<p><strong><span style="color:#d4af7f;">${tied[0].name} wins by owning more properties!</span></strong></p>`;
    } else {
      const names = tied.map(p => p.name).join(", ");
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
  document.getElementById("globalClockContainer").style.display = "none";
}

function backToNameInput() {
  document.getElementById("playerSetupBox").style.display = "block";
  document.getElementById("mainGameContainer").innerHTML = "";
  document.getElementById("globalClockContainer").innerHTML = "";
  players = [];
  currentPlayerIndex = 0;
}

function customPopup(message, callback) {
  const overlay = document.getElementById("customPopupOverlay");
  const msg = document.getElementById("customPopupMessage");
  const yesBtn = document.getElementById("customPopupYes");
  const noBtn = document.getElementById("customPopupNo");

  msg.innerText = message;
  overlay.style.display = "flex";

  if (typeof callback !== "function") {
    yesBtn.innerText = "OK";
    yesBtn.style.display = "inline-block";
    noBtn.style.display = "none";
    yesBtn.onclick = () => overlay.style.display = "none";
  } else {
    yesBtn.innerText = "Yes";
    noBtn.innerText = "No";
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
  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.style.display = "none";
    };
  }

  if (typeof callback === "function") callback();
}

function renderCardProgress(progress) {
  if (progress === 0) return `<pre style="color:#d4af7f;">┌─┐\n│0│\n└─┘</pre>`;
  let top = "", mid = "", bot = "";
  for (let i = 1; i <= progress; i++) {
    top += "┌─┐ ";
    mid += `│${i}│ `;
    bot += "└─┘ ";
  }
  return `<pre style="color:#d4af7f;">${top.trim()}\n${mid.trim()}\n${bot.trim()}</pre>`;
}