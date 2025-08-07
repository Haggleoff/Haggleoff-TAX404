// --- Player Data ---
let players = [];
let currentPlayerIndex = 0;
let timers = [];
let disallowedNormalCards = [];

// --- Utility Functions for Timer ---
function initializeTimers(n) {
  timers = [];
  for (let i = 0; i < n; i++) {
    timers.push({ timeLeft: 60, interval: null, running: false });
  }
}

function startPlayerTimer(idx) {
  stopAllTimers();
  timers[idx].timeLeft = 60;
  if (timers[idx].interval) clearInterval(timers[idx].interval);
  timers[idx].running = true;
  timers[idx].interval = setInterval(() => {
    if (timers[idx].running && timers[idx].timeLeft > 0) {
      timers[idx].timeLeft--;
      updatePlayerCardTimer(idx);
      if (timers[idx].timeLeft === 0) {
        timers[idx].running = false;
      }
    }
  }, 1000);
  updatePlayerCardTimer(idx);
}

function stopAllTimers() {
  timers.forEach(t => {
    if (t.interval) clearInterval(t.interval);
    t.running = false;
    t.interval = null;
  });
}

function updatePlayerCardTimer(idx) {
  const timerDiv = document.getElementById(`playerTimer_${idx}`);
  if (timerDiv) timerDiv.innerText = timers[idx].timeLeft;
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
  disallowedNormalCards = Array(players.length).fill(0);
  initializeTimers(players.length);
  document.getElementById("playerSetupBox").style.display = "none";

  let setupMsg = `<span style="font-family: 'Roboto', sans-serif; color: #f1f1f1;">Reloading this page will reset your progress.</span><br><br>`;
  setupMsg += `<span style="font-family: 'Roboto', sans-serif; color: #f1f1f1;">
      After each player receives 1 free starting property during Setup,
    </span><br>
    <span style="font-family: 'Lilita One', cursive; color: #d4af7f;">
      Property Stack size: ${players.length + 1}
    </span>`;
  customPopup(setupMsg, function() {
    showPlayerCarousel();
  }, true, "Yes", "No", true);
});

// --- PLAYER CAROUSEL (Flex row, animated, only prev/next/active visible) ---
let carouselStartX = 0;
let carouselDeltaX = 0;
let carouselIsDragging = false;

function showPlayerCarousel() {
  renderCarousel();
  setTimeout(() => {
    startPlayerTimer(currentPlayerIndex);
    attachDonateCharityHandlers();
    attachSwipeHandlers();
    window.addEventListener('resize', updateCarouselTransform);
  }, 50);
}

function renderCarousel() {
  const container = document.getElementById("mainGameContainer");
  container.innerHTML = `
    <div id="playerCarouselWrap">
      <div id="playerCarousel">
        ${players.map((p, i) => {
          let cardClass = "playerCard";
          if (i === currentPlayerIndex) cardClass += " activeCard";
          else if (i === (currentPlayerIndex - 1 + players.length) % players.length) cardClass += " prevCard";
          else if (i === (currentPlayerIndex + 1) % players.length) cardClass += " nextCard";
          else cardClass += " farCard";
          return `
            <div class="${cardClass}" data-index="${i}">
              <div class="player-name">${p.name}</div>
              <div class="streak-section">
                <div class="streak-progress-verbiage"><strong>Current Streak Progress:</strong></div>
                ${p.progress > 0
                  ? renderCardProgress(p.progress)
                  : `<span class="no-cards-verbiage">No cards in streak.</span>`
                }
              </div>
              <div class="tax-breaks">
                Tax Breaks Earned: ${p.streaks + p.powerCards}
              </div>
              <div class="timer-section">
                <p id="playerTimer_${i}">${timers[i].timeLeft}</p>
              </div>
              <div class="card-buttons">
                <button id="donateBtn_${i}" class="styled-btn">Donate</button>
                <button id="charityBtn_${i}" class="styled-btn">Take</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
    <div style="margin-top:1.5rem; text-align:center;">
      <button id="endgameTaxesBtn" class="styled-btn popup-action-btn" style="background-color:#947c52;">Endgame Taxes</button>
    </div>
  `;
  setTimeout(updateCarouselTransform, 0);

  // Make cards clickable to bring them to focus
  setTimeout(() => {
    document.querySelectorAll('.playerCard').forEach(card => {
      card.onclick = function(e) {
        const idx = parseInt(this.getAttribute('data-index'));
        if (idx !== currentPlayerIndex) {
          moveToPlayer(idx);
        }
      }
    });
  }, 0);
}

function updateCarouselTransform() {
  const carousel = document.getElementById("playerCarousel");
  const cards = document.querySelectorAll('.playerCard');
  if (carousel && cards.length) {
    const active = cards[currentPlayerIndex];
    const cardWidth = active.offsetWidth;
    const cardStyle = window.getComputedStyle(active);
    const cardMarginLeft = parseFloat(cardStyle.marginLeft);
    const viewportWidth = window.innerWidth;
    const cardCenter = active.offsetLeft + cardMarginLeft + cardWidth / 2;
    const translateX = (viewportWidth / 2) - cardCenter;
    carousel.style.transform = `translateX(${translateX}px)`;
    startPlayerTimer(currentPlayerIndex);
  }
  setTimeout(() => {
    attachDonateCharityHandlers();
  }, 20);
}

function attachDonateCharityHandlers() {
  players.forEach((_, i) => {
    const donateBtn = document.getElementById(`donateBtn_${i}`);
    const charityBtn = document.getElementById(`charityBtn_${i}`);
    if (donateBtn) {
      donateBtn.onclick = () => {
        if (i === currentPlayerIndex) {
          stopAllTimers();
          loadCalculator();
        }
      };
    }
    if (charityBtn) {
      charityBtn.onclick = () => {
        if (i === currentPlayerIndex) {
          if (players[i].progress > 0) {
            disallowedNormalCards[i] += players[i].progress;
          }
          players[i].progress = 0;
          moveToNextPlayer();
        }
      };
    }
  });
  const endBtn = document.getElementById("endgameTaxesBtn");
  if (endBtn) {
    endBtn.onclick = () => showEndgame();
  }
}

function attachSwipeHandlers() {
  const wrap = document.getElementById("playerCarouselWrap");
  if (!wrap) return;

  wrap.onmousedown = null;
  wrap.ontouchstart = null;
  wrap.onmousemove = null;
  wrap.ontouchmove = null;
  wrap.onmouseup = null;
  wrap.ontouchend = null;
  wrap.onmouseleave = null;

  // Desktop mouse events
  wrap.onmousedown = function(e) {
    carouselIsDragging = true;
    carouselStartX = e.clientX;
    carouselDeltaX = 0;
  };
  wrap.onmousemove = function(e) {
    if (!carouselIsDragging) return;
    carouselDeltaX = e.clientX - carouselStartX;
  };
  wrap.onmouseup = function(e) {
    if (!carouselIsDragging) return;
    carouselIsDragging = false;
    handleSwipeEnd(carouselDeltaX);
  };
  wrap.onmouseleave = function(e) {
    if (!carouselIsDragging) return;
    carouselIsDragging = false;
    handleSwipeEnd(carouselDeltaX);
  };

  // Touch events
  wrap.ontouchstart = function(e) {
    if (e.touches.length === 1) {
      carouselIsDragging = true;
      carouselStartX = e.touches[0].clientX;
      carouselDeltaX = 0;
    }
  };
  wrap.ontouchmove = function(e) {
    if (!carouselIsDragging || e.touches.length !== 1) return;
    carouselDeltaX = e.touches[0].clientX - carouselStartX;
  };
  wrap.ontouchend = function(e) {
    if (!carouselIsDragging) return;
    carouselIsDragging = false;
    handleSwipeEnd(carouselDeltaX);
  };
}

function handleSwipeEnd(deltaX) {
  const threshold = 60;
  if (deltaX > threshold) {
    // Swipe right: go to previous player, wrap if needed (infinite)
    let prev = currentPlayerIndex - 1;
    if (prev < 0) prev = players.length - 1;
    moveToPlayer(prev);
  } else if (deltaX < -threshold) {
    // Swipe left: go to next player, wrap if needed (infinite)
    let next = currentPlayerIndex + 1;
    if (next >= players.length) next = 0;
    moveToPlayer(next);
  } else {
    updateCarouselTransform();
  }
}

function moveToPlayer(idx) {
  if (idx === currentPlayerIndex) {
    updateCarouselTransform();
    return;
  }
  currentPlayerIndex = idx;
  renderCarousel(); // ensures correct focus and updates .activeCard
}

function moveToNextPlayer() {
  let next = currentPlayerIndex + 1;
  if (next >= players.length) next = 0;
  moveToPlayer(next);
}

// --- DONATE CALCULATOR ---
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

  showPlayerCarousel();
  moveToNextPlayer();
}

// --- ENDGAME ---
function showEndgame() {
  customPopup("Is the game over? Ready for final taxes?", function(confirm) {
    if (confirm) {
      loadEndgame();
    } else {
      showPlayerCarousel();
    }
  });
}

function loadEndgame() {
  stopAllTimers();
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

    let grossTax = bracketTax + propertyTax;
    let capTax = Math.floor(p.coins * 0.54);

    let baseTax = grossTax < capTax ? grossTax : capTax;

    const postBreakTax = Math.max(0, baseTax - (p.streaks + p.powerCards));
    p.tax = Math.min(postBreakTax, p.coins);

    let amtApplied = false;
    let amtValue = 0;
    let amtPercentString = "";
    if (p.tax === 0) {
      if (p.coins >= 34 && p.coins <= 39) {
        amtApplied = true;
        amtValue = Math.floor(p.coins * 0.03);
        amtPercentString = "3%";
        p.tax = amtValue;
      } else if (p.coins >= 40) {
        amtApplied = true;
        amtValue = Math.floor(p.coins * 0.05);
        amtPercentString = "5%";
        p.tax = amtValue;
      }
    }

    const avoided = Math.max(0, baseTax - p.tax);
    const beforeRate = p.coins ? Math.round((baseTax / p.coins) * 100) : 0;
    const afterRate = p.coins ? Math.round((p.tax / p.coins) * 100) : 0;
    const netIncome = p.coins - p.tax;

    summary.innerHTML += `
      <p>
        <span class="player-name">${p.name}</span>
        ${amtApplied ? `<span style="color:#dc143c; font-weight:bold;">AMT Triggered</span>` : ""}<br>
        Coins: ${p.coins}, Properties: ${p.properties}<br>
        <strong>Gross Tax: ${baseTax}</strong><br>
        <span style="font-weight:bold; color:#d4af7f;">Effective Rate: ${beforeRate}% → ${afterRate}%</span><br>
        Tax Avoided: ${avoided}<br>
        ${amtApplied ? `<span style="font-weight:bold; color:#dc143c;">AMT: ${amtValue} (${amtPercentString})</span><br>` : ""}
        <span style="font-weight:bold; color:#d4af7f;">Tax Owed: ${p.tax}</span><br>
        <span style="font-weight:bold; color:#d4af7f;">Net Income: ${netIncome}</span><br>
        Audit Risk: ${getAuditRiskLevel(p)}<br>
        <em style="color:#d4af7f;">${getTaxBracketMessage(p.coins, p.properties)}</em><br>
        <a href="#" onclick="showTaxBreakdown(${i}); return false;" style="color:#f1f1f1; text-decoration:underline; font-style:italic;">More Info</a>
      </p>
    `;
  });

  determineWinner();
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
      <li>Normal Cards Donated: <strong>${p.streaks * 5 + p.progress}</strong></li>
      <li>Streaks Earned: <strong>${streaksEarned}</strong></li>
      <li>Power Cards or Cash Donated: <strong>${p.powerCards}</strong></li>
      <li><span style="color:#d4af7f;">Total Tax Breaks Earned:</span> <strong style="color:#d4af7f;">${breaks}</strong></li>
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
    `<h2 style="font-family:'Lilita One'; color:#d4af7f;">Tax Overview Statement</h2>`,
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
  disallowedNormalCards = [];
  currentPlayerIndex = 0;
  stopAllTimers();
  timers = [];
}

// --- POPUPS ---

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
      width: 24px;
      height: 36px;
      background-color: #d4af7f;
      margin: 0 3px;
      border-radius: 6px;">
    </div>`;
  }
  return `<div style="display: flex; justify-content: center; margin-top: 1rem;">${blocks}</div>`;
}