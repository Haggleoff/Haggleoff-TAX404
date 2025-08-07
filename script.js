let players = [];
let currentPlayerIndex = 0;
let timerInterval = null;
let timeLeft = 60;
let timerRunningState = true;
let disallowedNormalCards = [];

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
  disallowedNormalCards = Array(players.length).fill(0);
  document.getElementById("playerSetupBox").style.display = "none";
  const n = players.length;
  let setupMsg = `<span style="font-family: 'Roboto', sans-serif; color: #f1f1f1;">Reloading this page will reset your progress.</span><br><br>`;
  setupMsg += `<span style="font-family: 'Roboto', sans-serif; color: #f1f1f1;">
      After each player receives 1 free starting property during Setup,
    </span><br>
    <span class="player-name" style="color: #d4af7f;">Property Stack size: ${n + 1}</span>`;
  customPopup(setupMsg, function() {
    showPlayerCards();
  }, true, "Yes", "No", true);
});

function showPlayerCards() {
  let cards = '';
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    cards += `
      <div class="player-card${i === currentPlayerIndex ? ' active' : ''}" data-index="${i}">
        <div class="player-card-inner">
          <div class="player-card-name">${player.name}</div>
          <div class="player-card-timer" id="playerTimer">${i === currentPlayerIndex ? timeLeft : ""}</div>
          <div class="player-card-progress">${renderCardProgress(player.progress)}</div>
          <div class="player-card-breaks">
            <span>Tax Breaks Earned:</span>
            <span class="player-card-breaks-num">${player.streaks + player.powerCards}</span>
          </div>
          <div class="player-card-actions">
            <button class="card-btn donate-btn" onclick="donateAction(${i})">Donate</button>
            <button class="card-btn charity-btn" onclick="tookCharityAction(${i})">Take</button>
          </div>
        </div>
      </div>
    `;
  }
  // Removed arrow buttons on both sides
  document.getElementById("mainGameContainer").innerHTML = `
    <div class="player-cards-scroll-container">
      <div class="player-cards-row" id="playerCardsRow">${cards}</div>
    </div>
    <div style="text-align:center; margin: 2rem auto 0 auto;">
      <button id="endgameTaxesBtn" class="styled-btn" onclick="showEndgame()">Endgame Taxes</button>
    </div>
  `;
  scrollToActiveCard();
  setupScrollToSetActivePlayer();
  if (timerInterval) clearInterval(timerInterval);
  timeLeft = 60;
  timerRunningState = true;
  startTimer();
  updatePopupTimerDisplay();
}

// --- IMPROVED SCROLL/SWIPE HANDLING WITH TIMER RESET ---
function setupScrollToSetActivePlayer() {
  setTimeout(() => {
    const row = document.getElementById("playerCardsRow");
    if (!row) return;
    let scrollTimeout = null;
    row.onscroll = function() {
      let cards = Array.from(row.querySelectorAll('.player-card'));
      let rowRect = row.getBoundingClientRect();
      let center = rowRect.left + rowRect.width / 2;
      let minDist = Infinity, minIndex = 0;
      cards.forEach((card, i) => {
        let cardRect = card.getBoundingClientRect();
        let cardCenter = cardRect.left + cardRect.width / 2;
        let dist = Math.abs(center - cardCenter);
        if (dist < minDist) {
          minDist = dist;
          minIndex = i;
        }
      });
      // Only update active class, don't re-render the full cards!
      if (minIndex !== currentPlayerIndex) {
        currentPlayerIndex = minIndex;
        // Reset the timer when player changes via swipe/scroll
        if (timerInterval) clearInterval(timerInterval);
        timeLeft = 60;
        timerRunningState = true;
        startTimer();
        cards.forEach((c, idx) => c.classList.toggle('active', idx === minIndex));
        updatePopupTimerDisplay();
      }
      // Optionally, snap to the nearest card after user stops scrolling for a bit:
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const activeCard = cards[currentPlayerIndex];
        if (activeCard && row) {
          const rowRect = row.getBoundingClientRect();
          const activeRect = activeCard.getBoundingClientRect();
          const scrollLeft = row.scrollLeft +
            (activeRect.left + activeRect.width / 2) -
            (rowRect.left + rowRect.width / 2);
          row.scrollTo({ left: scrollLeft, behavior: "smooth" });
        }
      }, 200);
    };
  }, 0);
}
// --- END IMPROVED SCROLL/SWIPE HANDLING WITH TIMER RESET ---

function scrollToActiveCard() {
  setTimeout(() => {
    const row = document.getElementById("playerCardsRow");
    const active = row.querySelector(".player-card.active");
    if (active && row) {
      const rowRect = row.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const scrollLeft = row.scrollLeft +
        (activeRect.left + activeRect.width / 2) -
        (rowRect.left + rowRect.width / 2);
      row.scrollTo({
        left: scrollLeft,
        behavior: "smooth"
      });
    }
  }, 0);
}

// prevPlayer and nextPlayer remain for legacy code, but are unused now
function prevPlayer() {
  currentPlayerIndex = (currentPlayerIndex - 1 + players.length) % players.length;
  showPlayerCards();
}

function nextPlayer() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  showPlayerCards();
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timerRunningState && timeLeft > 0) {
      timeLeft--;
      updatePopupTimerDisplay();
      if (timeLeft <= 0) {
        timerRunningState = false;
      }
    }
  }, 1000);
}

function updatePopupTimerDisplay() {
  const timerDivs = document.querySelectorAll("#playerTimer");
  timerDivs.forEach((div, i) => {
    if (i === currentPlayerIndex) div.innerText = timeLeft;
    else div.innerText = "";
  });
}

function donateAction(playerIndex) {
  if (playerIndex !== currentPlayerIndex) return;
  loadCalculator();
}

function tookCharityAction(playerIndex) {
  if (playerIndex !== currentPlayerIndex) return;
  if (players[currentPlayerIndex].progress > 0) {
    disallowedNormalCards[currentPlayerIndex] += players[currentPlayerIndex].progress;
  }
  players[currentPlayerIndex].progress = 0;
  nextPlayer();
}

function loadCalculator() {
  document.getElementById("mainGameContainer").innerHTML = `
    <div class="calculatorBox">
      <h2 class="player-name">${players[currentPlayerIndex].name}'s Turn</h2>
      <div id="tallyProgress">${renderCardProgress(players[currentPlayerIndex].progress)}</div>
      <label>Normal Cards Donated (this round):</label>
      <input type="number" id="normal" min="0" step="1"><br>
      <label>Power Cards or Cash Donated (this round):</label>
      <input type="number" id="power" min="0" step="1"><br>
      <p class="player-card-breaks">Tax Breaks Earned: ${players[currentPlayerIndex].streaks + players[currentPlayerIndex].powerCards}</p>
      <button onclick="confirmTurn()">Confirm</button>
    </div>
  `;
}

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
  nextPlayer();
}

function showEndgame() {
  customPopup("Is the game over? Ready for final taxes?", function(confirm) {
    if (confirm) {
      loadEndgame();
    } else {
      showPlayerCards();
    }
  });
}

function loadEndgame() {
  if (timerInterval) clearInterval(timerInterval);
  timerRunningState = false;
  let blocks = players.map((p, i) => `
    <div class="endgame-card">
      <div class="final-result-card-inner">
        <div class="final-result-name player-name">${p.name}</div>
        <div class="sideInputs">
          <input type="number" id="coins_${i}" min="0" step="1" placeholder="Haggleoffs">
          <input type="number" id="props_${i}" min="1" step="1" placeholder="Properties">
        </div>
      </div>
    </div>
  `).join("");

  document.getElementById("mainGameContainer").innerHTML = `
    <div class="calculatorBox">
      <h2 class="lilita" style="color: #d4af7f;">Endgame</h2>
      <p style="text-align:center;">Enter each player’s Haggleoffs and Properties.</p>
      <div class="endgame-cards-container">
        ${blocks}
      </div>
      <button onclick="calculateFinalTaxes()">Calculate Taxes</button>
      <div id="finalSummary" style="display:none;"></div>
    </div>
  `;
}

function getTaxBracketMessage(coins, properties) {
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

  // Validate input
  for (let i = 0; i < players.length; i++) {
    const coinsVal = document.getElementById(`coins_${i}`).value.trim();
    const propsVal = document.getElementById(`props_${i}`).value.trim();
    if (!/^\d+$/.test(coinsVal) || !/^\d+$/.test(propsVal)) {
      customPopup("Use only whole non-negative numbers.");
      return;
    }
  }

  // Assign coins/properties and calculate taxes for each player before winner calculation
  for (let i = 0; i < players.length; i++) {
    const coinsVal = document.getElementById(`coins_${i}`).value.trim();
    const propsVal = document.getElementById(`props_${i}`).value.trim();

    players[i].coins = Number(coinsVal);
    players[i].properties = Math.max(1, Number(propsVal));

    // Tax calculation logic (same as below)
    const p = players[i];
    const bracketTax = p.coins <= 6 ? 0 : p.coins <= 14 ? 3 : p.coins <= 24 ? 5 : p.coins <= 39 ? 8 : 10;
    const propertyTax = p.coins > 6 ? p.properties * (p.properties >= 4 ? 2 : 1) : 0;
    let grossTax = bracketTax + propertyTax;
    let capTax = Math.floor(p.coins * 0.54);
    let baseTax = grossTax < capTax ? grossTax : capTax;
    const postBreakTax = Math.max(0, baseTax - (p.streaks + p.powerCards));
    p.tax = Math.min(postBreakTax, p.coins);

    // AMT logic
    if (p.tax === 0) {
      if (p.coins >= 34 && p.coins <= 39) {
        p.tax = Math.floor(p.coins * 0.03);
      } else if (p.coins >= 40) {
        p.tax = Math.floor(p.coins * 0.05);
      }
    }
  }

  // Compute winner(s) after taxes are fully calculated and assigned
  const netWorths = players.map(p => p.coins - p.tax);
  const maxCoins = Math.max(...netWorths);
  const contenders = players.filter(p => (p.coins - p.tax) === maxCoins);

  let winnerHtml = "";
  if (contenders.length === 1) {
    winnerHtml = `<div class="final-results-winner"><span class="player-name">${contenders[0].name}</span> wins with ${maxCoins} Haggleoffs!</div>`;
  } else {
    const maxProps = Math.max(...contenders.map(p => p.properties));
    const tied = contenders.filter(p => p.properties === maxProps);
    if (tied.length === 1) {
      winnerHtml = `<div class="final-results-winner"><span class="player-name">${tied[0].name}</span> wins by owning more properties!</div>`;
    } else {
      const names = tied.map(p => `<span class="player-name">${p.name}</span>`).join(", ");
      winnerHtml = `<div class="final-results-winner"><span style="color:#d4af7f;">There are no winners—just shareholders.</span><br>Tied players: ${names}</div>`;
    }
  }

  // Cards layout for final results
  let cardsHtml = "";
  players.forEach((p, i) => {
    // Re-calculate all breakdowns to display (matches calculation above)
    const coinsVal = p.coins;
    const propsVal = p.properties;

    const bracketTax = coinsVal <= 6 ? 0 : coinsVal <= 14 ? 3 : coinsVal <= 24 ? 5 : coinsVal <= 39 ? 8 : 10;
    const propertyTax = coinsVal > 6 ? propsVal * (propsVal >= 4 ? 2 : 1) : 0;

    let grossTax = bracketTax + propertyTax;
    let capTax = Math.floor(coinsVal * 0.54);

    let baseTax = grossTax < capTax ? grossTax : capTax;

    const breaks = p.streaks + p.powerCards;
    const postBreakTax = Math.max(0, baseTax - breaks);
    let displayTax = Math.min(postBreakTax, coinsVal);

    let amtApplied = false;
    let amtValue = 0;
    let amtPercentString = "";
    if (displayTax === 0) {
      if (coinsVal >= 34 && coinsVal <= 39) {
        amtApplied = true;
        amtValue = Math.floor(coinsVal * 0.03);
        amtPercentString = "3%";
        displayTax = amtValue;
      } else if (coinsVal >= 40) {
        amtApplied = true;
        amtValue = Math.floor(coinsVal * 0.05);
        amtPercentString = "5%";
        displayTax = amtValue;
      }
    }

    const avoided = Math.max(0, baseTax - displayTax);
    const beforeRate = coinsVal ? Math.round((baseTax / coinsVal) * 100) : 0;
    const afterRate = coinsVal ? Math.round((displayTax / coinsVal) * 100) : 0;
    const netIncome = coinsVal - displayTax;

    cardsHtml += `
      <div class="final-result-card">
        <div class="final-result-card-inner">
          <div class="final-result-name player-name">${p.name}</div>
          <div class="final-result-content">
            ${amtApplied ? `<span style="color:#dc143c;">AMT Triggered</span><br>` : ""}
            Coins: <span>${coinsVal}</span>, Properties: <span>${propsVal}</span><br>
            Gross Tax: ${baseTax}<br>
            <span style="color:#d4af7f;">Effective Rate: ${beforeRate}% → ${afterRate}%</span><br>
            Tax Avoided: ${avoided}<br>
            ${amtApplied ? `<span style="color:#dc143c;">AMT: ${amtValue} (${amtPercentString})</span><br>` : ""}
            <span style="color:#d4af7f;">Tax Owed: ${displayTax}</span><br>
            <span style="color:#d4af7f;">Net Income: ${netIncome}</span><br>
            Audit Risk: ${getAuditRiskLevel(p)}<br>
            <em style="color:#d4af7f;">${getTaxBracketMessage(coinsVal, propsVal)}</em><br>
            <a href="#" onclick="showTaxBreakdown(${i}); return false;" style="color:#f1f1f1; text-decoration:underline; font-style:italic;">More Info</a>
          </div>
        </div>
      </div>
    `;
  });

  summary.style.display = "block";
  summary.innerHTML = `
    <h3 style="margin-bottom:0.6rem;">Final Results</h3>
    ${winnerHtml}
    <div class="final-results-cards-container">
      ${cardsHtml}
    </div>
    <button onclick="exitToSetup()" class="styled-btn" style="max-width:180px; margin:1.1rem auto 0 auto; display:block;">EXIT</button>
  `;
}

function showTaxBreakdown(playerIndex) {
  const p = players[playerIndex];

  const bracketTax = p.coins <= 6 ? 0 : p.coins <= 14 ? 3 : p.coins <= 24 ? 5 : p.coins <= 39 ? 8 : 10;
  const propertyTax = p.coins > 6 ? p.properties * (p.properties >= 4 ? 2 : 1) : 0;
  let grossTax = bracketTax + propertyTax;
  let capTax = Math.floor(p.coins * 0.54);
  let baseTax = grossTax < capTax ? grossTax : capTax;
  const breaks = p.streaks + p.powerCards;
  const postBreakTax = Math.max(0, baseTax - breaks);
  let tax = Math.min(postBreakTax, p.coins);

  let amtApplied = false;
  let amtValue = 0;
  let amtPercentString = "";
  let amtExplanation = "";
  if (tax === 0) {
    if (p.coins >= 34 && p.coins <= 39) {
      amtApplied = true;
      amtValue = Math.floor(p.coins * 0.03);
      amtPercentString = "3%";
      tax = amtValue;
      amtExplanation = "<i>The Alternative Minimum Tax is a penalty imposed on wealthy taxpayers who reduced their tax bill to zero—because even loopholes have limits.</i>";
    } else if (p.coins >= 40) {
      amtApplied = true;
      amtValue = Math.floor(p.coins * 0.05);
      amtPercentString = "5%";
      tax = amtValue;
      amtExplanation = "<i>The Alternative Minimum Tax is a penalty imposed on wealthy taxpayers who reduced their tax bill to zero—because even loopholes have limits.</i>";
    }
  }

  const avoided = Math.max(0, baseTax - tax);
  const beforeRate = p.coins ? Math.round((baseTax / p.coins) * 100) : 0;
  const afterRate = p.coins ? Math.round((tax / p.coins) * 100) : 0;
  const netIncome = p.coins - tax;

  let streaksEarned = p.streaks;
  let donationsDetails = `
    <ul style="text-align:left;">
      <li>Normal Cards Donated: ${p.streaks * 5 + p.progress}</li>
      <li>Streaks Earned: ${streaksEarned}</li>
      <li>Power Cards or Cash Donated: ${p.powerCards}</li>
      <li><span style="color:#d4af7f;">Total Tax Breaks Earned:</span> <span style="color:#d4af7f;">${breaks}</span></li>
    </ul>
  `;

  let breakdownHTML = `
    <div style="text-align:left;">
      <span class="player-name">${p.name}</span><br>
      <strong>Income (Haggleoffs):</strong> ${p.coins}<br>
      <strong>Properties:</strong> ${p.properties}<br>
      <strong>Donations:</strong> ${donationsDetails}
      <hr>
      <strong>Bracket Tax:</strong> ${bracketTax}<br>
      <strong>Property Tax:</strong> ${propertyTax} (${p.properties >= 4 ? "2 per property" : p.coins > 6 ? "1 per property" : "0"})
      <br>
      <strong style="color:#d4af7f;">Gross Tax:</strong> <span style="color:#d4af7f;">${grossTax}</span><br>
      <strong>Maximum Tax Ceiling:</strong> ${capTax}<br>
      <span style="font-size:0.98em; color:#888;"><i>A built-in cap that ensures your tax never exceeds 54% of your gross income.</i></span><br>
      <strong>Base Tax Applied:</strong> ${baseTax}<br>
      <strong>Deductions from Donations:</strong> ${breaks} (Tax Breaks)<br>
      <strong>Tax after Deductions:</strong> ${Math.max(0, baseTax - breaks)}<br>
      ${amtApplied ? `<strong style="color:#dc143c;">AMT Applied:</strong> ${amtValue} (${amtPercentString})<br><span style="font-size:0.99em; color:#dc143c;">${amtExplanation}</span><br>` : ""}
      <strong style="color:#d4af7f;">Tax Owed:</strong> <span style="color:#d4af7f;">${tax}</span><br>
      <strong style="color:#d4af7f;">Net Income:</strong> <span style="color:#d4af7f;">${netIncome}</span><br>
      <strong>Effective Rate Before Deductions:</strong> ${beforeRate}%<br>
      <strong>Effective Rate After Deductions:</strong> ${afterRate}%<br>
      <strong style="color:#d4af7f;">Tax Avoided:</strong> <span style="color:#d4af7f;">${avoided}</span><br>
      <strong>Audit Risk:</strong> ${getAuditRiskLevel(p)}<br>
      <hr>
      <em style="color:#d4af7f;">${getTaxBracketMessage(p.coins, p.properties)}</em>
    </div>
  `;

  customHTMLPopup(
    `<h2 class="lilita" style="color:#d4af7f; font-weight:normal;">Tax Overview Statement</h2>`,
    breakdownHTML,
    () => {
      const closeBtn = document.getElementById("customCloseBtn");
      if (closeBtn) {
        closeBtn.onclick = () => {
          document.getElementById("customPopupOverlay").style.display = "none";
          calculateFinalTaxes();
        };
      }
    }
  );
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

function exitToSetup() {
  document.getElementById("mainGameContainer").innerHTML = `
    <div class="calculatorBox">
      <h2 class="lilita" style="color: #d4af7f;">Thank you for Haggleoffing...</h2>
      <button onclick="backToNameInput()">Enter New Players</button>
    </div>
  `;
}

function backToNameInput() {
  document.getElementById("playerSetupBox").style.display = "block";
  document.getElementById("mainGameContainer").innerHTML = "";
  players = [];
  disallowedNormalCards = [];
  currentPlayerIndex = 0;
  if (timerInterval) clearInterval(timerInterval);
  timerRunningState = true;
  timeLeft = 60;
}

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
  msg.style.maxHeight = "75vh";
  msg.style.overflowY = "auto";

  overlay.style.display = "flex";

  if (typeof callback !== "function") {
    yesBtn.innerText = "OK";
    yesBtn.style.display = "inline-block";
    noBtn.style.display = "none";
    yesBtn.onclick = () => overlay.style.display = "none";
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
  }
}

function customHTMLPopup(message, html, callback) {
  const overlay = document.getElementById("customPopupOverlay");
  const msg = document.getElementById("customPopupMessage");
  const yesBtn = document.getElementById("customPopupYes");
  const noBtn = document.getElementById("customPopupNo");

  msg.innerHTML = `${message}<br><br>${html}<br><br><button id="customCloseBtn">Close</button>`;
  msg.style.maxHeight = "75vh";
  msg.style.overflowY = "auto";

  overlay.style.display = "flex";
  yesBtn.style.display = "none";
  noBtn.style.display = "none";

  if (typeof callback === "function") callback();
}

function renderCardProgress(progress) {
  if (progress === 0) return "";
  let blocks = "";
  for (let i = 0; i < progress; i++) {
    blocks += `<div style="
      width: 20px;
      height: 30px;
      background-color: #d4af7f;
      margin: 0 2px;
      border-radius: 5px;">
    </div>`;
  }
  return `<div style="display: flex; justify-content: center; margin-top: 0.5rem;">${blocks}</div>`;
}