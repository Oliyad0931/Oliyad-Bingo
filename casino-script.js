// Casino Games Script
(() => {
  let currentUser = null;
  let userBalance = 0;
  let token = null;
  let selectedPrediction = null;
  let isGameInProgress = false;

  // Game Statistics
  const gameStats = {
    dice: { played: 0, winnings: 0 },
    slots: { played: 0, winnings: 0 },
    cardflip: { played: 0, winnings: 0 },
    roulette: { played: 0, winnings: 0 },
    coinflip: { played: 0, winnings: 0 }
  };

  // Load user data from localStorage
  function loadUserData() {
    const saved = localStorage.getItem('bingoUser');
    const savedToken = localStorage.getItem('bingoToken');
    const savedBalance = localStorage.getItem('userBalance');
    
    if (saved && savedToken) {
      currentUser = JSON.parse(saved);
      token = savedToken;
      userBalance = parseFloat(savedBalance) || 100;
      updateUserDisplay();
    } else {
      window.location.href = 'index.html';
    }
  }

  // Update user display
  function updateUserDisplay() {
    document.getElementById('userName').textContent = currentUser.name || 'Player';
    document.getElementById('userBalance').textContent = `💰 ${userBalance.toFixed(2)} ETB`;
    localStorage.setItem('userBalance', userBalance);
  }

  // Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.game-panel').forEach(p => p.classList.remove('active'));
      
      e.target.classList.add('active');
      const gameType = e.target.dataset.game;
      document.getElementById(`${gameType}-game`).classList.add('active');
      loadGameStats(gameType);
    });
  });

  // Prediction Selection
  document.querySelectorAll('.predict-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parent = e.target.closest('.prediction-buttons') || e.target.parentElement;
      parent?.querySelectorAll('.predict-btn').forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');
      selectedPrediction = e.target.dataset.value;
    });
  });

  // ============ DICE GAME ============
  document.getElementById('diceRollBtn').addEventListener('click', rollDice);

  function rollDice() {
    if (isGameInProgress) return;
    
    const bet = parseFloat(document.getElementById('diceBet').value);
    if (!selectedPrediction) {
      showResult('diceResult', 'Please select High or Low!', 'loss');
      return;
    }
    if (bet < 10 || bet > 5000) {
      showResult('diceResult', 'Bet must be between 10-5000 ETB!', 'loss');
      return;
    }
    if (userBalance < bet) {
      showResult('diceResult', 'Insufficient balance!', 'loss');
      return;
    }

    isGameInProgress = true;
    userBalance -= bet;
    updateUserDisplay();

    // Animate dice
    const dice1 = document.getElementById('dice1');
    const dice2 = document.getElementById('dice2');
    let rolls = 0;

    const rollInterval = setInterval(() => {
      dice1.textContent = Math.floor(Math.random() * 6) + 1;
      dice2.textContent = Math.floor(Math.random() * 6) + 1;
      rolls++;
      if (rolls > 20) {
        clearInterval(rollInterval);

        const d1 = parseInt(dice1.textContent);
        const d2 = parseInt(dice2.textContent);
        const sum = d1 + d2;
        const isHigh = sum >= 8;
        const isLow = sum <= 7;

        const won = (selectedPrediction === 'high' && isHigh) || 
                   (selectedPrediction === 'low' && isLow);

        let winnings = 0;
        if (won) {
          winnings = bet * 1.9; // 90% profit
          userBalance += winnings;
          showResult('diceResult', `🎉 YOU WON! +${winnings.toFixed(2)} ETB\nSum: ${sum}`, 'win');
          gameStats.dice.winnings += winnings;
        } else {
          showResult('diceResult', `❌ YOU LOST! -${bet.toFixed(2)} ETB\nSum: ${sum}`, 'loss');
        }

        gameStats.dice.played++;
        updateUserDisplay();
        isGameInProgress = false;
        selectedPrediction = null;
        document.querySelectorAll('.predict-btn').forEach(b => b.classList.remove('selected'));
      }
    }, 100);
  }

  // ============ SLOTS GAME ============
  document.getElementById('slotsSpinBtn').addEventListener('click', spinSlots);

  function spinSlots() {
    if (isGameInProgress) return;

    const bet = parseFloat(document.getElementById('slotsBet').value);
    if (bet < 10 || bet > 5000) {
      showResult('slotsResult', 'Bet must be between 10-5000 ETB!', 'loss');
      return;
    }
    if (userBalance < bet) {
      showResult('slotsResult', 'Insufficient balance!', 'loss');
      return;
    }

    isGameInProgress = true;
    userBalance -= bet;
    updateUserDisplay();

    const symbols = ['🍎', '🌟', '💎', '🎰'];
    const slots = [
      document.getElementById('slot1'),
      document.getElementById('slot2'),
      document.getElementById('slot3')
    ];

    let spins = 0;
    const spinInterval = setInterval(() => {
      slots.forEach(slot => {
        slot.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      });
      spins++;

      if (spins > 30) {
        clearInterval(spinInterval);

        const result = [slots[0].textContent, slots[1].textContent, slots[2].textContent];
        let winnings = 0;
        let message = '';

        if (result[0] === result[1] && result[1] === result[2]) {
          const symbol = result[0];
          let multiplier = 0;

          if (symbol === '🍎') multiplier = 5;
          else if (symbol === '🌟') multiplier = 10;
          else if (symbol === '💎') multiplier = 20;
          else if (symbol === '🎰') multiplier = 100;

          winnings = bet * multiplier;
          userBalance += winnings;
          message = `🎉 JACKPOT! ${symbol}${symbol}${symbol}\n+${winnings.toFixed(2)} ETB`;
          gameStats.slots.winnings += winnings;
          showResult('slotsResult', message, 'win');
        } else {
          message = `❌ NO MATCH! ${result.join(' ')}\n-${bet.toFixed(2)} ETB`;
          showResult('slotsResult', message, 'loss');
        }

        gameStats.slots.played++;
        updateUserDisplay();
        isGameInProgress = false;
      }
    }, 100);
  }

  // ============ CARD FLIP GAME ============
  document.getElementById('cardFlipBtn').addEventListener('click', flipCard);

  function flipCard() {
    if (isGameInProgress) return;

    const bet = parseFloat(document.getElementById('cardBet').value);
    if (!selectedPrediction) {
      showResult('cardFlipResult', 'Please select Higher or Lower!', 'loss');
      return;
    }
    if (bet < 10 || bet > 5000) {
      showResult('cardFlipResult', 'Bet must be between 10-5000 ETB!', 'loss');
      return;
    }
    if (userBalance < bet) {
      showResult('cardFlipResult', 'Insufficient balance!', 'loss');
      return;
    }

    isGameInProgress = true;
    const currentCard = document.getElementById('currentCard');
    const currentValue = Math.floor(Math.random() * 13) + 1;
    currentCard.textContent = currentValue;

    userBalance -= bet;
    updateUserDisplay();

    setTimeout(() => {
      const nextValue = Math.floor(Math.random() * 13) + 1;
      currentCard.textContent = nextValue;

      const isHigher = nextValue > currentValue;
      const isLower = nextValue < currentValue;
      
      const won = (selectedPrediction === 'higher' && isHigher) ||
                 (selectedPrediction === 'lower' && isLower);

      let winnings = 0;
      if (won) {
        winnings = bet * 1.9;
        userBalance += winnings;
        showResult('cardFlipResult', `🎉 YOU WON! +${winnings.toFixed(2)} ETB\n${currentValue} → ${nextValue}`, 'win');
        gameStats.cardflip.winnings += winnings;
      } else if (nextValue === currentValue) {
        showResult('cardFlipResult', `🤝 TIE! ${currentValue} = ${nextValue}\nBet Returned`, 'win');
        userBalance += bet;
      } else {
        showResult('cardFlipResult', `❌ YOU LOST! -${bet.toFixed(2)} ETB\n${currentValue} → ${nextValue}`, 'loss');
      }

      gameStats.cardflip.played++;
      updateUserDisplay();
      isGameInProgress = false;
      selectedPrediction = null;
      document.querySelectorAll('.predict-btn').forEach(b => b.classList.remove('selected'));
    }, 800);
  }

  // ============ ROULETTE GAME ============
  document.getElementById('rouletteSpinBtn').addEventListener('click', spinRoulette);

  function spinRoulette() {
    if (isGameInProgress) return;

    const bet = parseFloat(document.getElementById('rouletteBet').value);
    if (!selectedPrediction) {
      showResult('rouletteResult', 'Please select Red, Black, or Green!', 'loss');
      return;
    }
    if (bet < 10 || bet > 5000) {
      showResult('rouletteResult', 'Bet must be between 10-5000 ETB!', 'loss');
      return;
    }
    if (userBalance < bet) {
      showResult('rouletteResult', 'Insufficient balance!', 'loss');
      return;
    }

    isGameInProgress = true;
    userBalance -= bet;
    updateUserDisplay();

    const wheel = document.getElementById('rouletteWheel');
    wheel.classList.remove('stopped');
    
    let rotation = 0;
    const spinInterval = setInterval(() => {
      rotation += 30;
      wheel.style.transform = `rotate(${rotation}deg)`;
    }, 50);

    setTimeout(() => {
      clearInterval(spinInterval);
      
      const colors = ['red', 'black', 'green'];
      const result = colors[Math.floor(Math.random() * colors.length)];
      
      const finalRotation = (360 - (Math.floor(Math.random() * 12) * 30)) % 360;
      wheel.style.transform = `rotate(${finalRotation}deg)`;
      wheel.classList.add('stopped');

      let winnings = 0;
      let multiplier = result === 'green' ? 14 : 2;

      if (selectedPrediction === result) {
        winnings = bet * multiplier;
        userBalance += winnings;
        const emoji = result === 'red' ? '🔴' : result === 'black' ? '⚫' : '🟢';
        showResult('rouletteResult', `🎉 YOU WON! ${emoji}\n+${winnings.toFixed(2)} ETB (${multiplier}x)`, 'win');
        gameStats.roulette.winnings += winnings;
      } else {
        const emoji = result === 'red' ? '🔴' : result === 'black' ? '⚫' : '🟢';
        showResult('rouletteResult', `❌ YOU LOST! ${emoji}\n-${bet.toFixed(2)} ETB`, 'loss');
      }

      gameStats.roulette.played++;
      updateUserDisplay();
      isGameInProgress = false;
      selectedPrediction = null;
      document.querySelectorAll('.predict-btn').forEach(b => b.classList.remove('selected'));
    }, 3000);
  }

  // ============ COIN FLIP GAME ============
  document.getElementById('coinFlipBtn').addEventListener('click', flipCoin);

  function flipCoin() {
    if (isGameInProgress) return;

    const bet = parseFloat(document.getElementById('coinBet').value);
    if (!selectedPrediction) {
      showResult('coinFlipResult', 'Please select Heads or Tails!', 'loss');
      return;
    }
    if (bet < 10 || bet > 5000) {
      showResult('coinFlipResult', 'Bet must be between 10-5000 ETB!', 'loss');
      return;
    }
    if (userBalance < bet) {
      showResult('coinFlipResult', 'Insufficient balance!', 'loss');
      return;
    }

    isGameInProgress = true;
    const coin = document.querySelector('.coin');
    coin.classList.add('flipping');

    userBalance -= bet;
    updateUserDisplay();

    setTimeout(() => {
      coin.classList.remove('flipping');
      
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = selectedPrediction === result;

      let winnings = 0;
      if (won) {
        winnings = bet * 1.95;
        userBalance += winnings;
        const emoji = result === 'heads' ? '👑' : '🪙';
        showResult('coinFlipResult', `🎉 YOU WON! ${emoji}\n+${winnings.toFixed(2)} ETB`, 'win');
        gameStats.coinflip.winnings += winnings;
      } else {
        const emoji = result === 'heads' ? '👑' : '🪙';
        showResult('coinFlipResult', `❌ YOU LOST! ${emoji}\n-${bet.toFixed(2)} ETB`, 'loss');
      }

      gameStats.coinflip.played++;
      updateUserDisplay();
      isGameInProgress = false;
      selectedPrediction = null;
      document.querySelectorAll('.predict-btn').forEach(b => b.classList.remove('selected'));
    }, 600);
  }

  // Show game result
  function showResult(elementId, message, type) {
    const resultEl = document.getElementById(elementId);
    resultEl.textContent = message;
    resultEl.className = `game-result ${type}`;
  }

  // Load game statistics
  function loadGameStats(gameType) {
    const stats = gameStats[gameType];
    const prefix = gameType === 'cardflip' ? 'card' : gameType;
    
    document.getElementById(`${prefix}GamesPlayed`).textContent = stats.played;
    document.getElementById(`${prefix}TotalWinnings`).textContent = `${stats.winnings.toFixed(2)} ETB`;
  }

  // Wallet - Deposit
  document.getElementById('depositBtn').addEventListener('click', () => {
    document.getElementById('depositModal').classList.add('show');
  });

  document.getElementById('confirmDepositBtn').addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const reference = document.getElementById('depositRef').value;

    if (!amount || amount < 50) {
      alert('Minimum deposit is 50 ETB');
      return;
    }

    try {
      const res = await fetch('/transactions/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, method: 'Manual', reference })
      });

      if (res.ok) {
        alert(`Deposit of ${amount} ETB submitted for admin approval!`);
        document.getElementById('depositModal').classList.remove('show');
        document.getElementById('depositAmount').value = '';
        document.getElementById('depositRef').value = '';
      }
    } catch (e) {
      console.error(e);
      alert('Deposit request failed');
    }
  });

  // Wallet - Withdraw
  document.getElementById('withdrawBtn').addEventListener('click', () => {
    document.getElementById('withdrawModal').classList.add('show');
  });

  document.getElementById('confirmWithdrawBtn').addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const phone = document.getElementById('withdrawPhone').value;
    const method = document.getElementById('withdrawMethod').value;

    if (!amount || amount < 50) {
      alert('Minimum withdrawal is 50 ETB');
      return;
    }

    if (amount > userBalance) {
      alert('Insufficient balance!');
      return;
    }

    if (!phone) {
      alert('Please enter phone/account number');
      return;
    }

    try {
      const res = await fetch('/transactions/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, method, reference: phone })
      });

      if (res.ok) {
        alert(`Withdrawal of ${amount} ETB requested! Admin will process it.`);
        userBalance -= amount;
        updateUserDisplay();
        document.getElementById('withdrawModal').classList.remove('show');
        document.getElementById('withdrawAmount').value = '';
        document.getElementById('withdrawPhone').value = '';
      }
    } catch (e) {
      console.error(e);
      alert('Withdrawal request failed');
    }
  });

  // Back to Bingo
  document.getElementById('backBtn').addEventListener('click', () => {
    localStorage.setItem('userBalance', userBalance);
    window.location.href = 'index.html';
  });

  // Logout
  document.querySelector('.logout-btn').addEventListener('click', () => {
    localStorage.removeItem('bingoUser');
    localStorage.removeItem('bingoToken');
    localStorage.removeItem('userBalance');
    window.location.href = 'index.html';
  });

  // Modal close buttons
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.target.dataset.modal;
      document.getElementById(modalId).classList.remove('show');
    });
  });

  // Close modal when clicking outside
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });

  // Initialize on page load
  window.addEventListener('load', loadUserData);
})();
