// Casino Games API Routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

// Ensure data files exist
if (!fs.existsSync(GAMES_FILE)) {
  fs.writeFileSync(GAMES_FILE, JSON.stringify([]));
}
if (!fs.existsSync(LEADERBOARD_FILE)) {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify([]));
}

function readGames() {
  try {
    return JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}

function writeGames(data) {
  fs.writeFileSync(GAMES_FILE, JSON.stringify(data, null, 2));
}

function readLeaderboard() {
  try {
    return JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}

function writeLeaderboard(data) {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
}

// ============ DICE GAME ============
router.post('/dice/play', (req, res) => {
  const { bet, prediction } = req.body || {};
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!bet || bet < 10 || bet > 5000) return res.status(400).json({ error: 'Invalid bet' });
  if (!prediction || !['high', 'low'].includes(prediction)) {
    return res.status(400).json({ error: 'Invalid prediction' });
  }

  // Roll two dice
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const sum = dice1 + dice2;

  const isHigh = sum >= 8;
  const isLow = sum <= 7;
  const won = (prediction === 'high' && isHigh) || (prediction === 'low' && isLow);

  let winnings = 0;
  if (won) {
    winnings = Math.floor(bet * 1.9);
  }

  // Record game
  const games = readGames();
  const game = {
    id: uuidv4(),
    userId,
    gameType: 'dice',
    bet,
    prediction,
    result: { dice1, dice2, sum },
    won,
    winnings,
    timestamp: new Date().toISOString()
  };
  games.push(game);
  writeGames(games);

  // Update leaderboard
  const leaderboard = readLeaderboard();
  const userEntry = leaderboard.find(e => e.userId === userId);
  if (userEntry) {
    userEntry.totalWinnings = (userEntry.totalWinnings || 0) + winnings;
    userEntry.gamesPlayed = (userEntry.gamesPlayed || 0) + 1;
    userEntry.lastPlayed = new Date().toISOString();
  } else {
    leaderboard.push({
      userId,
      username: req.user?.name,
      totalWinnings: winnings,
      gamesPlayed: 1,
      lastPlayed: new Date().toISOString()
    });
  }
  writeLeaderboard(leaderboard);

  res.json({
    success: true,
    game,
    message: won ? `🎉 You won ${winnings} ETB!` : '❌ You lost!'
  });
});

// ============ SLOTS GAME ============
router.post('/slots/play', (req, res) => {
  const { bet } = req.body || {};
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!bet || bet < 10 || bet > 5000) return res.status(400).json({ error: 'Invalid bet' });

  const symbols = ['🍎', '🌟', '💎', '🎰'];
  const result = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];

  let won = false;
  let winnings = 0;
  let multiplier = 0;

  if (result[0] === result[1] && result[1] === result[2]) {
    won = true;
    const symbol = result[0];
    if (symbol === '🍎') multiplier = 5;
    else if (symbol === '🌟') multiplier = 10;
    else if (symbol === '💎') multiplier = 20;
    else if (symbol === '🎰') multiplier = 100;

    winnings = bet * multiplier;
  }

  // Record game
  const games = readGames();
  const game = {
    id: uuidv4(),
    userId,
    gameType: 'slots',
    bet,
    result,
    multiplier,
    won,
    winnings,
    timestamp: new Date().toISOString()
  };
  games.push(game);
  writeGames(games);

  // Update leaderboard
  const leaderboard = readLeaderboard();
  const userEntry = leaderboard.find(e => e.userId === userId);
  if (userEntry) {
    userEntry.totalWinnings = (userEntry.totalWinnings || 0) + winnings;
    userEntry.gamesPlayed = (userEntry.gamesPlayed || 0) + 1;
  } else {
    leaderboard.push({
      userId,
      username: req.user?.name,
      totalWinnings: winnings,
      gamesPlayed: 1,
      lastPlayed: new Date().toISOString()
    });
  }
  writeLeaderboard(leaderboard);

  res.json({
    success: true,
    game,
    message: won ? `🎉 JACKPOT! ${result.join('')} - Won ${winnings} ETB!` : '❌ No match'
  });
});

// ============ CARD FLIP GAME ============
router.post('/cardflip/play', (req, res) => {
  const { bet, prediction } = req.body || {};
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!bet || bet < 10 || bet > 5000) return res.status(400).json({ error: 'Invalid bet' });
  if (!prediction || !['higher', 'lower'].includes(prediction)) {
    return res.status(400).json({ error: 'Invalid prediction' });
  }

  const currentCard = Math.floor(Math.random() * 13) + 1;
  const nextCard = Math.floor(Math.random() * 13) + 1;

  const isHigher = nextCard > currentCard;
  const isLower = nextCard < currentCard;
  let won = false;
  let winnings = 0;

  if ((prediction === 'higher' && isHigher) || (prediction === 'lower' && isLower)) {
    won = true;
    winnings = Math.floor(bet * 1.9);
  } else if (nextCard === currentCard) {
    // Tie - return bet
    winnings = bet;
    won = true;
  }

  // Record game
  const games = readGames();
  const game = {
    id: uuidv4(),
    userId,
    gameType: 'cardflip',
    bet,
    prediction,
    result: { currentCard, nextCard },
    won,
    winnings,
    timestamp: new Date().toISOString()
  };
  games.push(game);
  writeGames(games);

  // Update leaderboard
  const leaderboard = readLeaderboard();
  const userEntry = leaderboard.find(e => e.userId === userId);
  if (userEntry) {
    userEntry.totalWinnings = (userEntry.totalWinnings || 0) + winnings;
    userEntry.gamesPlayed = (userEntry.gamesPlayed || 0) + 1;
  } else {
    leaderboard.push({
      userId,
      username: req.user?.name,
      totalWinnings: winnings,
      gamesPlayed: 1,
      lastPlayed: new Date().toISOString()
    });
  }
  writeLeaderboard(leaderboard);

  res.json({
    success: true,
    game,
    message: won ? `🎉 You won ${winnings} ETB!` : '❌ You lost!'
  });
});

// ============ ROULETTE GAME ============
router.post('/roulette/play', (req, res) => {
  const { bet, prediction } = req.body || {};
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!bet || bet < 10 || bet > 5000) return res.status(400).json({ error: 'Invalid bet' });
  if (!prediction || !['red', 'black', 'green'].includes(prediction)) {
    return res.status(400).json({ error: 'Invalid prediction' });
  }

  const colors = ['red', 'black', 'green'];
  const result = colors[Math.floor(Math.random() * colors.length)];

  let won = prediction === result;
  let multiplier = result === 'green' ? 14 : 2;
  let winnings = won ? bet * multiplier : 0;

  // Record game
  const games = readGames();
  const game = {
    id: uuidv4(),
    userId,
    gameType: 'roulette',
    bet,
    prediction,
    result,
    multiplier,
    won,
    winnings,
    timestamp: new Date().toISOString()
  };
  games.push(game);
  writeGames(games);

  // Update leaderboard
  const leaderboard = readLeaderboard();
  const userEntry = leaderboard.find(e => e.userId === userId);
  if (userEntry) {
    userEntry.totalWinnings = (userEntry.totalWinnings || 0) + winnings;
    userEntry.gamesPlayed = (userEntry.gamesPlayed || 0) + 1;
  } else {
    leaderboard.push({
      userId,
      username: req.user?.name,
      totalWinnings: winnings,
      gamesPlayed: 1,
      lastPlayed: new Date().toISOString()
    });
  }
  writeLeaderboard(leaderboard);

  res.json({
    success: true,
    game,
    message: won ? `🎉 You won ${winnings} ETB!` : '❌ You lost!'
  });
});

// ============ COIN FLIP GAME ============
router.post('/coinflip/play', (req, res) => {
  const { bet, prediction } = req.body || {};
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!bet || bet < 10 || bet > 5000) return res.status(400).json({ error: 'Invalid bet' });
  if (!prediction || !['heads', 'tails'].includes(prediction)) {
    return res.status(400).json({ error: 'Invalid prediction' });
  }

  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = prediction === result;
  const winnings = won ? Math.floor(bet * 1.95) : 0;

  // Record game
  const games = readGames();
  const game = {
    id: uuidv4(),
    userId,
    gameType: 'coinflip',
    bet,
    prediction,
    result,
    won,
    winnings,
    timestamp: new Date().toISOString()
  };
  games.push(game);
  writeGames(games);

  // Update leaderboard
  const leaderboard = readLeaderboard();
  const userEntry = leaderboard.find(e => e.userId === userId);
  if (userEntry) {
    userEntry.totalWinnings = (userEntry.totalWinnings || 0) + winnings;
    userEntry.gamesPlayed = (userEntry.gamesPlayed || 0) + 1;
  } else {
    leaderboard.push({
      userId,
      username: req.user?.name,
      totalWinnings: winnings,
      gamesPlayed: 1,
      lastPlayed: new Date().toISOString()
    });
  }
  writeLeaderboard(leaderboard);

  res.json({
    success: true,
    game,
    message: won ? `🎉 You won ${winnings} ETB!` : '❌ You lost!'
  });
});

// ============ GET USER GAME HISTORY ============
router.get('/history', (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const games = readGames();
  const userGames = games.filter(g => g.userId === userId);

  res.json({
    total: userGames.length,
    games: userGames.slice(-50) // Last 50 games
  });
});

// ============ GET LEADERBOARD ============
router.get('/leaderboard', (req, res) => {
  const leaderboard = readLeaderboard()
    .sort((a, b) => b.totalWinnings - a.totalWinnings)
    .slice(0, 20); // Top 20

  res.json({ leaderboard });
});

// ============ GET USER STATS ============
router.get('/stats', (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const games = readGames();
  const userGames = games.filter(g => g.userId === userId);

  const stats = {
    totalGames: userGames.length,
    totalWinnings: userGames.reduce((sum, g) => sum + (g.winnings || 0), 0),
    totalLosses: userGames.reduce((sum, g) => sum + (g.won ? 0 : g.bet), 0),
    winRate: userGames.length > 0 ? ((userGames.filter(g => g.won).length / userGames.length) * 100).toFixed(2) : 0,
    gameBreakdown: {
      dice: userGames.filter(g => g.gameType === 'dice').length,
      slots: userGames.filter(g => g.gameType === 'slots').length,
      cardflip: userGames.filter(g => g.gameType === 'cardflip').length,
      roulette: userGames.filter(g => g.gameType === 'roulette').length,
      coinflip: userGames.filter(g => g.gameType === 'coinflip').length
    }
  };

  res.json(stats);
});

// ============ ADMIN: GET ALL GAMES ============
router.get('/admin/games', (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const games = readGames();
  res.json({ total: games.length, games: games.slice(-100) }); // Last 100 games
});

module.exports = router;
