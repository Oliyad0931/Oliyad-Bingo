import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';

const WIN_PATTERNS = [
  [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
  [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
  [0,6,12,18,24],[4,8,12,16,20],
];

// Generate 100 unique bingo cards
const CARDS_1_100 = Array.from({ length: 100 }, (_, cardIndex) => {
  const pool = Array.from({ length: 75 }, (_, i) => i + 1);
  // Seed random by card index for consistency
  const seed = cardIndex * 7919; // Prime number for better distribution
  const shuffled = [...pool].sort((a, b) => {
    const ra = Math.sin(seed + a) * 10000 - Math.floor(Math.sin(seed + a) * 10000);
    const rb = Math.sin(seed + b + 1000) * 10000 - Math.floor(Math.sin(seed + b + 1000) * 10000);
    return ra - rb;
  });
  return shuffled.slice(0, 25);
});

// Simulated bot players
const BOT_NAMES = ['Abebe_Eth', 'Bini_Bingo', 'Sara_K', 'Dawit_Pro', 'Hanna_Win', 'Kokeb_Bingo', 'Fikir_Gold'];

// Admin credentials
const ADMIN_USERNAME = 'OLIYAD';
const ADMIN_PASSWORD = 'OLIYAD';

// ============ STORAGE FUNCTIONS (using localStorage for web) ============
const storage = {
  getUsers: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem('oliyad_bingo_users');
        return data ? JSON.parse(data) : {};
      }
    } catch (e) {}
    return {};
  },
  setUsers: (users) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('oliyad_bingo_users', JSON.stringify(users));
      }
    } catch (e) {}
  },
  getDeposits: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem('oliyad_bingo_deposits');
        return data ? JSON.parse(data) : [];
      }
    } catch (e) {}
    return [];
  },
  setDeposits: (deposits) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('oliyad_bingo_deposits', JSON.stringify(deposits));
      }
    } catch (e) {}
  },
  getWithdrawals: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem('oliyad_bingo_withdrawals');
        return data ? JSON.parse(data) : [];
      }
    } catch (e) {}
    return [];
  },
  setWithdrawals: (withdrawals) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('oliyad_bingo_withdrawals', JSON.stringify(withdrawals));
      }
    } catch (e) {}
  },
};

export default function App() {
  // ============ AUTH STATE ============
  const [screen, setScreen] = useState('auth'); // auth, cardSelect, lobby, game, adminDashboard
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);

  // ============ ADMIN STATE ============
  const [adminTab, setAdminTab] = useState('users'); // users, deposits, withdrawals
  const [allDeposits, setAllDeposits] = useState([]);
  const [allWithdrawals, setAllWithdrawals] = useState([]);

  // ============ GAME STATE ============
  const [selectedCard, setSelectedCard] = useState(null);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState(new Set());
  const [currentNumber, setCurrentNumber] = useState(null);
  const [markedIndices, setMarkedIndices] = useState(new Set([12]));
  const [boardNumbers, setBoardNumbers] = useState([]);
  const [winners, setWinners] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [autoDrawTimer, setAutoDrawTimer] = useState(null);

  // ============ COUNTDOWN TIMER ============
  const [countdown, setCountdown] = useState(null);
  const countdownTimerRef = useRef(null);
  const autoStartTimeoutRef = useRef(null);

  // ============ WALLET STATE ============
  const [balance, setBalance] = useState(0);
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');

  // Track bot progress for each bot
  const [botStates, setBotStates] = useState({});
  const [hasCalledBingo, setHasCalledBingo] = useState(false);
  const [kickedForFalseBingo, setKickedForFalseBingo] = useState(false);
  const [newGameCountdown, setNewGameCountdown] = useState(null);
  const [needsFreshNumbers, setNeedsFreshNumbers] = useState(false);

  // ============ LOAD DATA FROM STORAGE ============
  useEffect(() => {
    // Load users from storage
    const savedUsers = storage.getUsers();
    setUsers(savedUsers);

    // Load deposits from storage
    const savedDeposits = storage.getDeposits();
    setAllDeposits(savedDeposits);

    // Load withdrawals from storage
    const savedWithdrawals = storage.getWithdrawals();
    setAllWithdrawals(savedWithdrawals);
  }, []);

  // ============ SAVE DATA TO STORAGE ============
  useEffect(() => {
    storage.setUsers(users);
  }, [users]);

  useEffect(() => {
    storage.setDeposits(allDeposits);
  }, [allDeposits]);

  useEffect(() => {
    storage.setWithdrawals(allWithdrawals);
  }, [allWithdrawals]);


  // ============ COUNTDOWN EFFECT ============
  useEffect(() => {
    // Start countdown when in lobby with 2+ players and game hasn't started
    if (screen === 'lobby' && roomPlayers.length >= 2 && !gameStarted) {
      // Start at 30 seconds
      setCountdown(30);

      // Clear any existing timers
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
      }

      // Set up the auto-start timeout (30 seconds)
      autoStartTimeoutRef.current = setTimeout(() => {
        startGame();
        setCountdown(null);
      }, 30000);

      // Set up countdown interval
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        // Cleanup timers when leaving lobby or conditions change
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        if (autoStartTimeoutRef.current) {
          clearTimeout(autoStartTimeoutRef.current);
          autoStartTimeoutRef.current = null;
        }
      };
    } else {
      // Clear countdown and timers if not in lobby or conditions not met
      setCountdown(null);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
        autoStartTimeoutRef.current = null;
      }
    }
  }, [screen, roomPlayers.length, gameStarted]);

  // ============ AUTO-RESTART GAME EFFECT ============
  useEffect(() => {
    // Start new game countdown when game is over (either someone won OR all numbers drawn)
    if (gameOver && screen === 'game' && !kickedForFalseBingo && (winners.length > 0 || needsFreshNumbers)) {
      // Start 10-second countdown for new game
      setNewGameCountdown(10);

      const countdownInterval = setInterval(() => {
        setNewGameCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            // Start new game
            setTimeout(() => {
              resetBoardForNewGame();
              // If all numbers were drawn, start fresh with new numbers
              if (needsFreshNumbers) {
                setDrawnNumbers(new Set());
                setCurrentNumber(null);
                setNeedsFreshNumbers(false);
              }
setGameStarted(true);
              // Start auto-draw
              const timer = setInterval(() => {
                drawNumber();
              }, 3000);
              setAutoDrawTimer(timer);
              drawNumber();
            }, 500);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    } else {
      setNewGameCountdown(null);
    }
  }, [gameOver, winners.length, needsFreshNumbers, screen]);

  // ============ AUTH FUNCTIONS ============
  const validateEthiopianPhone = (phone) => {
    // Ethiopian phone format: +2519XXXXXXXX or 09XXXXXXXX
    const cleaned = phone.replace(/\s/g, '');
    const ethiopianPattern = /^(\+251|0)9[0-9]{8}$/;
    return ethiopianPattern.test(cleaned);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Not provided';
    // Format Ethiopian phone number nicely
    if (phone.startsWith('+251')) {
      return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    } else if (phone.startsWith('09')) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }
    return phone;
  };

  const handleAuth = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    // Check for admin login
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setCurrentUser({ username: ADMIN_USERNAME, isAdmin: true });
      setScreen('adminDashboard');
      setUsername('');
      setPassword('');
      setPhoneNumber('');
      Alert.alert('Welcome Admin!', 'Logged in as OLIYAD (Admin)');
      return;
    }

    if (!isLogin) {
      // Registration
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (password.length < 4) {
        Alert.alert('Error', 'Password must be at least 4 characters');
        return;
      }
      if (!phoneNumber.trim()) {
        Alert.alert('Error', 'Please enter your phone number');
        return;
      }
      if (!validateEthiopianPhone(phoneNumber)) {
        Alert.alert('Error', 'Please enter a valid Ethiopian phone number\nFormat: +2519XXXXXXXX or 09XXXXXXXX');
        return;
      }
      if (users[username]) {
        Alert.alert('Error', 'Username already exists');
        return;
      }

      const newUser = {
username,
        password,
        phone: phoneNumber.replace(/\s/g, ''), // Store clean phone number
        balance: 100,
        gamesPlayed: 0,
        totalWon: 0,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      // Update users state
      const updatedUsers = { ...users, [username]: newUser };
      setUsers(updatedUsers);

      // Save to localStorage immediately
      storage.setUsers(updatedUsers);

      setCurrentUser(newUser);
      setBalance(100);
      setScreen('cardSelect');
      setUsername('');
      setPassword('');
      setPhoneNumber('');
      setConfirmPassword('');

      // Show user info in alert
      const formattedPhone = formatPhoneNumber(phoneNumber.replace(/\s/g, ''));
      Alert.alert(
        'Registration Successful!',
        `Welcome ${username}!\n\n🎁 100 ETB bonus added to your wallet!\n📱 Phone: ${formattedPhone}\n\nYou can now play games!`
      );
    } else {
      // Login
      const user = users[username];
      if (!user) {
        Alert.alert('Error', 'User not found. Please register first.');
        return;
      }
      if (user.password !== password) {
        Alert.alert('Error', 'Invalid password');
        return;
      }
      // Update last login
      const updatedUser = { ...user, lastLogin: new Date().toISOString() };
      const updatedUsers = { ...users, [username]: updatedUser };
      setUsers(updatedUsers);
      storage.setUsers(updatedUsers);
      setCurrentUser(updatedUser);
      setBalance(updatedUser.balance);
      setScreen('cardSelect');
      setUsername('');
      setPassword('');
      Alert.alert('Success', `Welcome back, ${username}!`);
    }
  };

  const handleLogout = () => {
    // Save current user state
    if (currentUser && !isAdmin) {
      setUsers(u => ({ ...u, [currentUser.username]: { ...u[currentUser.username], balance } }));
    }
    setCurrentUser(null);
    setIsAdmin(false);
    setScreen('auth');
    setUsername('');
    setPassword('');
    setPhoneNumber('');
    setConfirmPassword('');
    resetGame();
  };

  // ============ CARD SELECTION ============
  const handleSelectCard = (cardIndex) => {
    setSelectedCard(cardIndex);
    setBoardNumbers(CARDS_1_100[cardIndex]);
  };

const handleJoinRoom = () => {
    if (selectedCard === null) {
      Alert.alert('Select a Card', 'Please select a bingo card first');
      return;
    }
    if (balance < 10) {
      Alert.alert('Insufficient Balance', 'You need 10 ETB to join a room');
      return;
    }
    // Deduct entry fee
    setBalance(b => b - 10);
    initializeRoom();
    setScreen('lobby');
  };

  // ============ ROOM & GAME FUNCTIONS ============
  const initializeRoom = () => {
    // Generate 1-3 random bots (so total players = 2-4 including human)
    const numBots = 1 + Math.floor(Math.random() * 3);
    const bots = Array.from({ length: numBots }, (_, i) => {
      const name = BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? `_${i}` : '');
      const cardIndex = Math.floor(Math.random() * 100);
      return {
        id: `bot_${i}`,
        name,
        cardIndex,
        isBot: true,
        cardNumbers: CARDS_1_100[cardIndex],
      };
    });

    // Add current player
    const allPlayers = [
      {
        id: currentUser.username,
        name: currentUser.username + ' (You)',
        cardIndex: selectedCard,
        isBot: false,
        cardNumbers: CARDS_1_100[selectedCard],
      },
      ...bots,
    ];

    setRoomPlayers(allPlayers);

    // Initialize bot states
    const initialBotStates = {};
    bots.forEach(bot => {
      initialBotStates[bot.id] = {
        markedIndices: new Set([12]),
        hasWon: false,
        winTime: null,
      };
    });
    setBotStates(initialBotStates);

    resetGame();
    setNeedsFreshNumbers(false);
  };

  const resetGame = () => {
    setDrawnNumbers(new Set());
    setCurrentNumber(null);
    setMarkedIndices(new Set([12]));
    setWinners([]);
    setGameOver(false);
    setGameStarted(false);
    setHasCalledBingo(false);
    if (autoDrawTimer) {
      clearInterval(autoDrawTimer);
      setAutoDrawTimer(null);
    }
  };

const resetBoardForNewGame = () => {
    // Keep drawnNumbers and currentNumber, reset only the board state
    setMarkedIndices(new Set([12]));
    setWinners([]);
    setGameOver(false);
    setHasCalledBingo(false);
    if (autoDrawTimer) {
      clearInterval(autoDrawTimer);
      setAutoDrawTimer(null);
    }
  };

  const startGame = () => {
    if (gameStarted) return;
    setGameStarted(true);
    setCountdown(null); // Clear countdown when game starts

    // Clear countdown timers
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (autoStartTimeoutRef.current) {
      clearTimeout(autoStartTimeoutRef.current);
      autoStartTimeoutRef.current = null;
    }

    // Start auto-draw every 3 seconds
    const timer = setInterval(() => {
      drawNumber();
    }, 3000);
    setAutoDrawTimer(timer);

    // First draw immediately
    drawNumber();
  };

  const drawNumber = () => {
    if (drawnNumbers.size >= 75) {
      clearInterval(autoDrawTimer);
      setAutoDrawTimer(null);
      // All numbers drawn - game over
      setGameOver(true);
      setGameStarted(false);
      setNeedsFreshNumbers(true); // Mark that we need fresh numbers for next game
      // Check for any winners
      checkAllWinners(drawnNumbers);
      return;
    }

    let num;
    do {
      num = Math.floor(Math.random() * 75) + 1;
    } while (drawnNumbers.has(num));

    const newDrawn = new Set(drawnNumbers);
    newDrawn.add(num);
    setDrawnNumbers(newDrawn);
    setCurrentNumber(num);

    // Update bot states - bots have 60-90% chance to mark correctly
    setBotStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(botId => {
        if (!newStates[botId].hasWon) {
          const bot = roomPlayers.find(p => p.id === botId);
          if (bot) {
            const cardNums = bot.cardNumbers;
            // Find indices of drawn numbers on bot's card
            cardNums.forEach((cardNum, idx) => {
              if (idx !== 12 && !newStates[botId].markedIndices.has(idx)) {
                if (newDrawn.has(cardNum)) {
                  // Bot has 70% chance to mark when number is called
                  if (Math.random() < 0.7) {
                    newStates[botId].markedIndices.add(idx);
                  }
                }
              }
            });

// Check if bot won
            if (checkWin(newStates[botId].markedIndices)) {
              newStates[botId].hasWon = true;
              newStates[botId].winTime = Date.now();
            }
          }
        }
      });
      return newStates;
    });

    // Check if human won
    checkAllWinners(newDrawn);
  };

  const checkWin = (indices) => {
    for (const pattern of WIN_PATTERNS) {
      if (pattern.every(i => indices.has(i))) return true;
    }
    return false;
  };

  const checkAllWinners = (currentDrawn) => {
    const newWinners = [];

    // Check human player
    if (checkWin(markedIndices)) {
      newWinners.push({
        id: currentUser.username,
        name: currentUser.username + ' (You)',
        position: 0,
        isHuman: true,
      });
    }

    // Check bots
    Object.entries(botStates).forEach(([botId, state]) => {
      if (state.hasWon && !newWinners.find(w => w.id === botId)) {
        const bot = roomPlayers.find(p => p.id === botId);
        if (bot) {
          newWinners.push({
            id: botId,
            name: bot.name,
            position: 0,
            isHuman: false,
          });
        }
      }
    });

    if (newWinners.length > 0 && winners.length === 0) {
      // First win detected - assign positions
      newWinners.sort((a, b) => {
        const aState = botStates[a.id] || { winTime: Date.now() };
        const bState = botStates[b.id] || { winTime: Date.now() };
        return (aState.winTime || Date.now()) - (bState.winTime || Date.now());
      });

      const positionedWinners = newWinners.map((w, i) => ({ ...w, position: i + 1 }));
      setWinners(positionedWinners);
      setGameOver(true);

      if (autoDrawTimer) {
        clearInterval(autoDrawTimer);
        setAutoDrawTimer(null);
      }

      // Calculate and award winnings
      const humanWinner = positionedWinners.find(w => w.isHuman);
      if (humanWinner) {
        calculateWinnings(humanWinner.position, positionedWinners.length);
      }
    }

    setWinners(prev => prev.length > 0 ? prev : newWinners);
  };

  const calculateWinnings = (position, totalWinners) => {
    const totalPot = roomPlayers.length * 10; // 10 ETB per player
    let winnings = 0;

 if (position === 1) {
      winnings = Math.floor(totalPot * 0.5); // 50% for 1st place
    } else if (position === 2) {
      winnings = Math.floor(totalPot * 0.3); // 30% for 2nd place
    } else if (position === 3) {
      winnings = Math.floor(totalPot * 0.15); // 15% for 3rd place
    } else {
      winnings = Math.floor(totalPot * 0.05); // 5% for others
    }

    // Update user stats
    setUsers(u => {
      const user = u[currentUser.username];
      if (user) {
        return {
          ...u,
          [currentUser.username]: {
            ...user,
            balance: user.balance + winnings,
            gamesPlayed: (user.gamesPlayed || 0) + 1,
            totalWon: (user.totalWon || 0) + winnings,
          }
        };
      }
      return u;
    });

    setBalance(b => b + winnings);
    Alert.alert(
      '🎉 BINGO! You Won!',
      `Position: ${position}${position === 1 ? ' 🏆' : position === 2 ? ' 🥈' : position === 3 ? ' 🥉' : ''}\n\nYou won ${winnings} ETB!`
    );
  };

  const handleCellPress = (index) => {
    if (!gameStarted || gameOver) return;
    if (index === 12) return;
    if (!drawnNumbers.has(boardNumbers[index])) {
      Alert.alert('Not Drawn Yet', 'This number has not been drawn!');
      return;
    }
    if (markedIndices.has(index)) return;

    const newMarked = new Set(markedIndices);
    newMarked.add(index);
    setMarkedIndices(newMarked);
    // Removed auto-win detection - player must click BINGO button
  };

  const handleCallBingo = () => {
    if (!gameStarted || gameOver || hasCalledBingo) return;

    const hasWin = checkWin(markedIndices);

    if (hasWin) {
      // Real BINGO!
      setHasCalledBingo(true);
      checkAllWinners(drawnNumbers);
    } else {
      // False BINGO - Kick player out!
      Alert.alert(
        '❌ FALSE BINGO!',
        'You do not have a valid bingo pattern!\n\nYou have been removed from the game.',
        [
          {
            text: 'OK',
            onPress: () => {
              setKickedForFalseBingo(true);
              leaveRoom();
            }
          }
        ]
      );
    }
  };

  const leaveRoom = () => {
    // Clear all timers
    if (autoDrawTimer) {
      clearInterval(autoDrawTimer);
      setAutoDrawTimer(null);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (autoStartTimeoutRef.current) {
      clearTimeout(autoStartTimeoutRef.current);
      autoStartTimeoutRef.current = null;
    }
    resetGame();
    setNeedsFreshNumbers(false);
    setNewGameCountdown(null);
    setScreen('cardSelect');
  };

  // ============ WALLET FUNCTIONS ============
  const verifyTransaction = () => {
    if (smsText.includes('received') || smsText.includes('Transferred') || smsText.includes('Confirmed')) {
      const match = smsText.match(/\d+(\.\d+)?(?=\s*ETB)/);
      const amount = match ? parseFloat(match[0]) : 100;

      // Record deposit as PENDING (not yet added to balance)
      const newDeposit = {
        id: Date.now(),
        username: currentUser.username,
        amount,
        smsMessage: smsText,
        timestamp: new Date().toISOString(),
        status: 'pending', // Changed from 'completed' to 'pending'
      };
      setAllDeposits(d => [...d, newDeposit]);

      Alert.alert('Deposit Submitted', `Your deposit of ${amount} ETB has been submitted for approval.\n\nAdmin will review and approve it shortly.`);
      setDepositVisible(false);
      setSmsText('');
    } else {
      Alert.alert('Invalid SMS', 'Please copy the full transaction message');
    }
  };

  const processWithdrawal = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 50) {
      Alert.alert('Error', 'Minimum withdrawal is 50 ETB');
      return;
    }
    if (amount > balance) {
      Alert.alert('Error', 'Insufficient balance!');
      return;
    }

    // Record withdrawal as PENDING (not yet deducted from balance)
    const newWithdrawal = {
      id: Date.now(),
      username: currentUser.username,
      amount,
      account: withdrawAccount,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    setAllWithdrawals(w => [...w, newWithdrawal]);

    Alert.alert('Withdrawal Submitted', `Your withdrawal of ${amount} ETB has been submitted for approval.\n\nAdmin will process it shortly.`);
    setWithdrawVisible(false);
    setWithdrawAmount('');
    setWithdrawAccount('');
  };

  // ============ ADMIN APPROVAL FUNCTIONS ============
  const approveDeposit = (depositId) => {
    const deposit = allDeposits.find(d => d.id === depositId);
    if (!deposit || deposit.status !== 'pending') return;

    // Update deposit status
    setAllDeposits(d => d.map(dep =>
      dep.id === depositId ? { ...dep, status: 'completed' } : dep
    ));

    // Add amount to user's balance
    setUsers(u => {
      const user = u[deposit.username];
      if (user) {
        return {
          ...u,
          [deposit.username]: { ...user, balance: user.balance + deposit.amount }
        };
      }
      return u;
    });

    Alert.alert('Approved', `${deposit.amount} ETB added to ${deposit.username}'s wallet`);
  };

  const rejectDeposit = (depositId) => {
    setAllDeposits(d => d.map(dep =>
      dep.id === depositId ? { ...dep, status: 'rejected' } : dep
    ));
    Alert.alert('Rejected', 'Deposit has been rejected');
  };

  const approveWithdrawal = (withdrawalId) => {
    const withdrawal = allWithdrawals.find(w => w.id === withdrawalId);
    if (!withdrawal || withdrawal.status !== 'pending') return;

    const user = users[withdrawal.username];
    if (!user || user.balance < withdrawal.amount) {
      Alert.alert('Error', 'Insufficient balance in user account');
      return;
    }

    // Update withdrawal status
    setAllWithdrawals(w => w.map(withdrawal =>
      withdrawal.id === withdrawalId ? { ...withdrawal, status: 'completed' } : withdrawal
    ));

    // Deduct from user's balance
    setUsers(u => {
      const usr = u[withdrawal.username];
      if (usr) {
        return {
          ...u,
          [withdrawal.username]: { ...usr, balance: usr.balance - withdrawal.amount }
        };
      }
      return u;
    });

    Alert.alert('Approved', `Withdrawal of ${withdrawal.amount} ETB has been processed`);
  };

  const rejectWithdrawal = (withdrawalId) => {
    setAllWithdrawals(w => w.map(withdrawal =>
      withdrawal.id === withdrawalId ? { ...withdrawal, status: 'rejected' } : withdrawal
    ));
    Alert.alert('Rejected', 'Withdrawal has been rejected');
  };

  // Set document background for web
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = BLACK;
      document.documentElement.style.backgroundColor = BLACK;
    }
  }, []);

  // ============ RENDER ============
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* ==================== AUTH SCREEN ==================== */}
          {screen === 'auth' && (
            <View style={styles.authContainer}>
              <Text style={styles.authTitle}>OLIYAD BINGO</Text>
              <Text style={styles.authSubtitle}>Multiplayer Bingo with Real Winnings</Text>

              <View style={styles.authForm}>
                <TextInput
                  style={styles.authInput}
                  placeholder="Username"
                  placeholderTextColor="#555"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.authInput}
                  placeholder="Password"
                  placeholderTextColor="#555"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                {!isLogin && (
                  <>
                    <TextInput
                      style={styles.authInput}
                      placeholder="Confirm Password"
                      placeholderTextColor="#555"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                    <TextInput
                      style={styles.authInput}
                      placeholder="Phone Number (+2519XXXXXXXX or 09XXXXXXXX)"
                      placeholderTextColor="#555"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                    />
                  </>
                )}

<TouchableOpacity style={styles.authBtn} onPress={handleAuth}>
                  <Text style={styles.authBtnText}>{isLogin ? 'LOGIN' : 'REGISTER'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => {
                  setIsLogin(!isLogin);
                  setPhoneNumber('');
                  setConfirmPassword('');
                }}>
                  <Text style={styles.switchText}>
                    {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.authInfo}>
                  <Text style={styles.authInfoText}>🎁 New players get 100 ETB bonus!</Text>
                  <Text style={styles.authInfoText}>💰 Entry fee: 10 ETB per game</Text>
                  <Text style={styles.authInfoText}>🏆 Win up to 500+ ETB!</Text>
                  {!isLogin && <Text style={styles.authInfoText}>📱 Ethiopian phone number required</Text>}
                </View>
              </View>
            </View>
          )}

          {/* ==================== ADMIN DASHBOARD ==================== */}
          {screen === 'adminDashboard' && (
            <View style={styles.mainContainer}>
              <View style={styles.header}>
                <Text style={styles.headerText}>👑 ADMIN DASHBOARD</Text>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                <Text style={styles.adminWelcome}>Welcome, OLIYAD!</Text>

                {/* Refresh Button */}
                <TouchableOpacity style={styles.refreshBtn} onPress={() => {
                  const savedUsers = storage.getUsers();
                  setUsers(savedUsers);
                  const savedDeposits = storage.getDeposits();
                  setAllDeposits(savedDeposits);
                  const savedWithdrawals = storage.getWithdrawals();
                  setAllWithdrawals(savedWithdrawals);
                  Alert.alert('Refreshed', `Data loaded: ${Object.keys(savedUsers).length} users, ${savedDeposits.length} deposits, ${savedWithdrawals.length} withdrawals`);
                }}>
                  <Text style={styles.refreshBtnText}>🔄 Refresh Data</Text>
                </TouchableOpacity>

                {/* Admin Stats */}
                <View style={styles.adminStats}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{Object.keys(users).length}</Text>
                    <Text style={styles.statLabel}>Registered Users</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{allDeposits.length}</Text>
                    <Text style={styles.statLabel}>Total Deposits</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{allWithdrawals.length}</Text>
                    <Text style={styles.statLabel}>Withdrawals</Text>
                  </View>
                </View>

{/* Admin Tabs */}
                <View style={styles.adminTabs}>
                  <TouchableOpacity
                    style={[styles.adminTab, adminTab === 'users' && styles.adminTabActive]}
                    onPress={() => setAdminTab('users')}
                  >
                    <Text style={[styles.adminTabText, adminTab === 'users' && styles.adminTabTextActive]}>Users</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adminTab, adminTab === 'deposits' && styles.adminTabActive]}
                    onPress={() => setAdminTab('deposits')}
                  >
                    <Text style={[styles.adminTabText, adminTab === 'deposits' && styles.adminTabTextActive]}>Deposits</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adminTab, adminTab === 'withdrawals' && styles.adminTabActive]}
                    onPress={() => setAdminTab('withdrawals')}
                  >
                    <Text style={[styles.adminTabText, adminTab === 'withdrawals' && styles.adminTabTextActive]}>Withdrawals</Text>
                  </TouchableOpacity>
                </View>

                {/* Users Tab */}
                {adminTab === 'users' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.tabTitle}>Registered Users</Text>
                    {Object.values(users).length === 0 ? (
                      <Text style={styles.emptyText}>No users registered yet</Text>
                    ) : (
                      Object.values(users).map((user) => (
                        <View key={user.username} style={styles.adminItem}>
                          <View style={styles.adminItemInfo}>
                            <Text style={styles.adminItemName}>{user.username}</Text>
                            <Text style={styles.adminItemPhone}>📱 {formatPhoneNumber(user.phone)}</Text>
                            <Text style={styles.adminItemDetail}>Balance: {user.balance} ETB</Text>
                            <Text style={styles.adminItemDetail}>Games: {user.gamesPlayed || 0}</Text>
                            <Text style={styles.adminItemDetail}>Won: {user.totalWon || 0} ETB</Text>
                            <Text style={styles.adminItemDetail}>Joined: {new Date(user.createdAt).toLocaleDateString()}</Text>
                            <Text style={styles.adminItemDetail}>Last login: {new Date(user.lastLogin).toLocaleString()}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* Deposits Tab */}
                {adminTab === 'deposits' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.tabTitle}>Deposit History</Text>
                    {allDeposits.length === 0 ? (
                      <Text style={styles.emptyText}>No deposits yet</Text>
                    ) : (
                      allDeposits.slice().reverse().map((deposit) => (
                        <View key={deposit.id} style={styles.adminItem}>
                          <View style={styles.adminItemInfo}>
                            <Text style={styles.adminItemName}>{deposit.username}</Text>
                            <Text style={styles.adminItemAmount}>+{deposit.amount} ETB</Text>
                            <Text style={styles.adminItemDetail}>{new Date(deposit.timestamp).toLocaleString()}</Text>
                            <View style={styles.smsContainer}>
                              <Text style={styles.smsLabel}>SMS:</Text>
                              <Text style={styles.smsText}>{deposit.smsMessage}</Text>
                            </View>
                          </View>
    <View style={styles.actionButtons}>
                            {deposit.status === 'pending' && (
                              <>
                                <TouchableOpacity
                                  style={styles.approveBtn}
                                  onPress={() => approveDeposit(deposit.id)}
                                >
                                  <Text style={styles.actionBtnText}>✓ Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.rejectBtn}
                                  onPress={() => rejectDeposit(deposit.id)}
                                >
                                  <Text style={styles.actionBtnText}>✗ Reject</Text>
                                </TouchableOpacity>
                              </>
                            )}
                            <View style={[styles.statusBadge, {
                              backgroundColor: deposit.status === 'pending' ? '#cc6600' :
                                           deposit.status === 'completed' ? '#006600' : '#990000'
                            }]}>
                              <Text style={styles.statusText}>
                                {deposit.status === 'pending' ? '⏳ Pending' :
                                 deposit.status === 'completed' ? '✓ Approved' : '✗ Rejected'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* Withdrawals Tab */}
                {adminTab === 'withdrawals' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.tabTitle}>Withdrawal Requests</Text>
                    {allWithdrawals.length === 0 ? (
                      <Text style={styles.emptyText}>No withdrawals yet</Text>
                    ) : (
                      allWithdrawals.slice().reverse().map((withdrawal) => (
                        <View key={withdrawal.id} style={styles.adminItem}>
                          <View style={styles.adminItemInfo}>
                            <Text style={styles.adminItemName}>{withdrawal.username}</Text>
                            <Text style={styles.adminItemAmount}>-{withdrawal.amount} ETB</Text>
                            <Text style={styles.adminItemDetail}>To: {withdrawal.account}</Text>
                            <Text style={styles.adminItemDetail}>{new Date(withdrawal.timestamp).toLocaleString()}</Text>
                            <Text style={styles.adminItemDetail}>User Balance: {users[withdrawal.username]?.balance || 0} ETB</Text>
                          </View>
                          <View style={styles.actionButtons}>
                            {withdrawal.status === 'pending' && (
                              <>
                                <TouchableOpacity
                                  style={styles.approveBtn}
                                  onPress={() => approveWithdrawal(withdrawal.id)}
                                >
                                  <Text style={styles.actionBtnText}>✓ Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.rejectBtn}
                                  onPress={() => rejectWithdrawal(withdrawal.id)}
                                >
                                  <Text style={styles.actionBtnText}>✗ Reject</Text>
                                </TouchableOpacity>
                              </>
                            )}
                            <View style={[styles.statusBadge, {
                              backgroundColor: withdrawal.status === 'pending' ? '#cc6600' :
                                               withdrawal.status === 'completed' ? '#006600' : '#990000'
                            }]}>
<Text style={styles.statusText}>
                                {withdrawal.status === 'pending' ? '⏳ Pending' :
                                 withdrawal.status === 'completed' ? '✓ Paid' : '✗ Rejected'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ==================== CARD SELECT SCREEN ==================== */}
          {screen === 'cardSelect' && (
            <View style={styles.mainContainer}>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerText}>👤 {currentUser?.username}</Text>
                  <Text style={styles.headerSubtext}>📱 {currentUser?.phone ? formatPhoneNumber(currentUser.phone) : 'No phone'}</Text>
                  <Text style={styles.headerSubtext}>ID: {currentUser?.username?.toUpperCase()?.slice(0, 8)}-{Math.floor(Math.random() * 9000) + 1000}</Text>
                </View>
                <View style={styles.headerRight}>
                  <Text style={styles.headerBalance}>💰 {balance} ETB</Text>
                  <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.content}>
                <Text style={styles.sectionTitle}>SELECT YOUR BINGO CARD (1-100)</Text>
                <Text style={styles.sectionSubtext}>Choose a unique card for this game</Text>

                {/* Card Grid */}
                <ScrollView style={styles.cardGridScroll}>
                  <View style={styles.cardGrid}>
                    {Array.from({ length: 100 }, (_, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.cardItem,
                          selectedCard === i && styles.cardItemSelected,
                        ]}
                        onPress={() => handleSelectCard(i)}
                      >
                        <Text style={[styles.cardItemText, selectedCard === i && styles.cardItemTextSelected]}>
                          {i + 1}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Selected Card Preview */}
                {selectedCard !== null && (
                  <View style={styles.cardPreview}>
                    <Text style={styles.cardPreviewTitle}>Card #{selectedCard + 1} Preview</Text>
                    <View style={styles.miniBoard}>
                      {CARDS_1_100[selectedCard].slice(0, 25).map((num, i) => (
                        <View key={i} style={[styles.miniCell, i === 12 && styles.miniCellFree]}>
                          <Text style={styles.miniCellText}>{i === 12 ? 'FREE' : num}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

<TouchableOpacity style={[styles.primaryBtn, selectedCard === null && styles.btnDisabled]} onPress={handleJoinRoom}>
                  <Text style={styles.primaryBtnText}>JOIN ROOM (10 ETB)</Text>
                </TouchableOpacity>

                {/* Wallet Buttons */}
                <View style={styles.walletBtns}>
                  <TouchableOpacity style={styles.walletBtn} onPress={() => setDepositVisible(true)}>
                    <Text style={styles.walletBtnText}>💵 Deposit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.walletBtn} onPress={() => setWithdrawVisible(true)}>
                    <Text style={styles.walletBtnText}>💸 Withdraw</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ==================== LOBBY SCREEN ==================== */}
          {screen === 'lobby' && (
            <View style={styles.mainContainer}>
              <View style={styles.header}>
                <Text style={styles.headerText}>🎮 GAME LOBBY</Text>
                <TouchableOpacity style={styles.backBtn} onPress={leaveRoom}>
                  <Text style={styles.backBtnText}>← Leave</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                {/* Countdown Timer */}
                {countdown !== null && roomPlayers.length >= 2 && !gameStarted && (
                  <View style={styles.countdownContainer}>
                    <Text style={styles.countdownLabel}>GAME STARTING IN</Text>
                    <View style={styles.countdownCircle}>
                      <Text style={styles.countdownNumber}>{countdown}</Text>
                    </View>
                    <Text style={styles.countdownSubtext}>seconds</Text>
                  </View>
                )}

                <Text style={styles.sectionTitle}>Waiting for Players...</Text>
                <Text style={styles.sectionSubtext}>{roomPlayers.length} players in room {roomPlayers.length >= 2 && '(Ready to start!)'}</Text>

                <View style={styles.playersList}>
                  {roomPlayers.map((player, i) => (
                    <View key={player.id} style={styles.playerItem}>
                      <Text style={styles.playerRank}>#{i + 1}</Text>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{player.name}</Text>
                        <Text style={styles.playerCard}>Card #{player.cardIndex + 1}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.potInfo}>
                  <Text style={styles.potText}>💰 Total Pot: {roomPlayers.length * 10} ETB</Text>
                  <Text style={styles.potBreakdown}>
                    1st: {Math.floor(roomPlayers.length * 10 * 0.5)} ETB |
                    2nd: {Math.floor(roomPlayers.length * 10 * 0.3)} ETB |
                    3rd: {Math.floor(roomPlayers.length * 10 * 0.15)} ETB
                  </Text>
                </View>

                {!gameStarted ? (
                  <TouchableOpacity style={[styles.startBtn, countdown !== null && styles.startBtnDisabled]} onPress={startGame} disabled={countdown !== null}>
                    <Text style={styles.startBtnText}>
                      {countdown !== null ? `Auto-starting in ${countdown}s...` : '🎮 START GAME NOW'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.startingContainer}>
                    <Text style={styles.startingText}>Game Starting...</Text>
                  </View>
                )}
              </View>
            </View>
          )}

{/* ==================== GAME SCREEN ==================== */}
          {screen === 'game' && (
            <View style={styles.mainContainer}>
              <View style={styles.header}>
                <Text style={styles.headerText}>🎮 PLAYING</Text>
                <TouchableOpacity style={styles.backBtn} onPress={leaveRoom}>
                  <Text style={styles.backBtnText}>← Leave</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                {/* Current Number */}
                <View style={styles.currentNumberContainer}>
                  <View style={styles.numberBall}>
                    <Text style={styles.numberBallText}>{currentNumber ?? '--'}</Text>
                  </View>
                  <View style={styles.gameInfo}>
                    <Text style={styles.drawnCount}>Drawn: {drawnNumbers.size}/75</Text>
                    <Text style={styles.playersInGame}>{roomPlayers.length} Players</Text>
                  </View>
                </View>

                {/* Called Numbers Board (1-75) */}
                <View style={styles.calledNumbersContainer}>
                  <Text style={styles.calledNumbersTitle}>CALLED NUMBERS</Text>
                  <ScrollView style={styles.calledNumbersScroll}>
                    <View style={styles.calledNumbersGrid}>
                      {Array.from({ length: 75 }, (_, i) => i + 1).map((num) => {
                        const isCalled = drawnNumbers.has(num);
                        return (
                          <View key={num} style={[styles.calledNumberCell, isCalled && styles.calledNumberCellCalled]}>
                            <Text style={[styles.calledNumberText, isCalled && styles.calledNumberTextCalled]}>
                              {num}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Bingo Board */}
                <View style={styles.board}>
                  {boardNumbers.map((num, i) => {
                    const isFree = i === 12;
                    const isMarked = markedIndices.has(i);
                    const isDrawn = drawnNumbers.has(num);
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.cell,
                          isMarked && styles.cellMarked,
                          isFree && styles.cellFree,
                          !isFree && !isMarked && !isDrawn && styles.cellDisabled,
                        ]}
                        onPress={() => handleCellPress(i)}
                        disabled={!isDrawn || isMarked || gameOver || !gameStarted}
                      >
                        <Text style={[styles.cellText, isMarked && styles.cellTextMarked]}>
                          {isFree ? 'FREE' : num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* CALL BINGO Button - Only show during active game */}
                {gameStarted && !gameOver && !hasCalledBingo && (
                  <TouchableOpacity style={styles.bingoBtn} onPress={handleCallBingo}>
                    <Text style={styles.bingoBtnText}>🎯 CALL BINGO!</Text>
                    <Text style={styles.bingoBtnSubtext}>Click when you have a complete line!</Text>
                  </TouchableOpacity>
                )}

{/* Game Status */}
                {gameOver && winners.length > 0 && (
                  <View style={styles.winnersContainer}>
                    <Text style={styles.winnersTitle}>🏆 WINNERS</Text>
                    {winners.slice(0, 5).map((winner) => (
                      <View key={winner.id} style={styles.winnerItem}>
                        <Text style={styles.winnerPosition}>
                          {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : winner.position === 3 ? '🥉' : `#${winner.position}`}
                        </Text>
                        <Text style={[styles.winnerName, winner.isHuman && styles.winnerNameYou]}>
                          {winner.name}
                        </Text>
                        <Text style={styles.winnerPrize}>
                          {winner.position === 1 ? `+${Math.floor(roomPlayers.length * 10 * 0.5)} ETB` :
                           winner.position === 2 ? `+${Math.floor(roomPlayers.length * 10 * 0.3)} ETB` :
                           winner.position === 3 ? `+${Math.floor(roomPlayers.length * 10 * 0.15)} ETB` :
                           `+${Math.floor(roomPlayers.length * 10 * 0.05)} ETB`}
                        </Text>
                      </View>
                    ))}

                    {/* New Game Countdown */}
                    {newGameCountdown !== null && (
                      <View style={styles.newGameCountdownContainer}>
                        <Text style={styles.newGameCountdownText}>🔄 New game starting in {newGameCountdown}s...</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* All Numbers Drawn Message */}
                {gameOver && drawnNumbers.size >= 75 && winners.length === 0 && (
                  <View style={styles.winnersContainer}>
                    <Text style={styles.winnersTitle}>📊 ALL NUMBERS DRAWN!</Text>
                    <Text style={styles.allNumbersText}>All 75 numbers have been called. No winners this round.</Text>
                    <Text style={styles.allNumbersSubtext}>Numbers will continue for next game...</Text>

                    {/* New Game Countdown */}
                    {newGameCountdown !== null && (
                      <View style={styles.newGameCountdownContainer}>
                        <Text style={styles.newGameCountdownText}>🔄 New game starting in {newGameCountdown}s...</Text>
                      </View>
                    )}
                  </View>
                )}

                {!gameStarted && !gameOver && (
                  <View style={styles.waitingMsg}>
                    <Text style={styles.waitingText}>Waiting for game to start...</Text>
                  </View>
                )}
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ==================== DEPOSIT MODAL ==================== */}
      <Modal visible={depositVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>DEPOSIT FUNDS</Text>
            <Text style={styles.paymentInfo}>Telebirr: 0967692398</Text>
            <Text style={styles.paymentInfo}>CBE Bank: 1000438187937</Text>
            <Text style={styles.paymentInfo}>Name: Oliyad Tefera</Text>
            <Text style={styles.modalHint}>Paste your SMS confirmation:</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Paste message here..."
              placeholderTextColor="#555"
              value={smsText}
              onChangeText={setSmsText}
            />
<TouchableOpacity style={styles.modalBtn} onPress={verifyTransaction}>
              <Text style={styles.modalBtnText}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDepositVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================== WITHDRAW MODAL ==================== */}
      <Modal visible={withdrawVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>WITHDRAW FUNDS</Text>
            <Text style={styles.balanceText}>Balance: {balance} ETB</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Amount ETB (min 50)"
              placeholderTextColor="#555"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone or Account Number"
              placeholderTextColor="#555"
              value={withdrawAccount}
              onChangeText={setWithdrawAccount}
            />
            <TouchableOpacity style={styles.modalBtn} onPress={processWithdrawal}>
              <Text style={styles.modalBtnText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setWithdrawVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const GREEN = '#00c853';
const DARK_GREEN = '#007c33';
const BLACK = '#000000';
const CARD = '#111111';
const BORDER = '#00c853';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: BLACK },
  scroll: { flexGrow: 1 },

  // ==================== AUTH STYLES ====================
  authContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24, backgroundColor: BLACK,
  },
  authTitle: {
    fontSize: 42, fontWeight: 'bold', color: GREEN,
    letterSpacing: 6, marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14, color: '#888', marginBottom: 40,
  },
  authForm: { width: '100%', maxWidth: 350 },
  authInput: {
    backgroundColor: '#111', borderWidth: 1, borderColor: GREEN,
    color: '#fff', padding: 16, borderRadius: 10,
    fontSize: 16, marginBottom: 16,
  },
  authBtn: {
    backgroundColor: GREEN, padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 8, marginBottom: 16,
  },
  authBtnText: { color: BLACK, fontSize: 18, fontWeight: 'bold' },
  switchText: { color: GREEN, textAlign: 'center', fontSize: 14 },
  authInfo: { marginTop: 32, gap: 8 },
  authInfoText: { color: '#666', fontSize: 13, textAlign: 'center' },

  // ==================== ADMIN DASHBOARD STYLES ====================
  adminWelcome: {
    color: GREEN, fontSize: 20, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 12,
  },
  refreshBtn: {
    backgroundColor: '#006600', padding: 10, paddingHorizontal: 16,
    borderRadius: 8, alignItems: 'center', marginBottom: 16,
    alignSelf: 'center',
  },
  refreshBtnText: {
    color: '#fff', fontSize: 12, fontWeight: 'bold',
  },
  adminStats: {
    flexDirection: 'row', justifyContent: 'space-around',
    width: '100%', marginBottom: 20,
  },
  statBox: {
    backgroundColor: '#111', padding: 15, borderRadius: 10,
    borderWidth: 1, borderColor: GREEN, alignItems: 'center',
    minWidth: 90,
  },
  statNumber: {
    color: GREEN, fontSize: 28, fontWeight: 'bold',
  },
  statLabel: {
    color: '#666', fontSize: 11, marginTop: 4,
  },
  adminTabs: {
    flexDirection: 'row', width: '100%', marginBottom: 16,
    backgroundColor: '#111', borderRadius: 10, padding: 4,
  },
adminTab: {
    flex: 1, padding: 12, borderRadius: 8, alignItems: 'center',
  },
  adminTabActive: {
    backgroundColor: DARK_GREEN,
  },
  adminTabText: {
    color: '#666', fontSize: 12, fontWeight: 'bold',
  },
  adminTabTextActive: {
    color: GREEN,
  },
  tabContent: {
    width: '100%',
  },
  tabTitle: {
    color: GREEN, fontSize: 16, fontWeight: 'bold',
    marginBottom: 12, textAlign: 'center',
  },
  emptyText: {
    color: '#666', fontSize: 14, textAlign: 'center',
    padding: 20,
  },
  adminItem: {
    backgroundColor: '#111', padding: 12, borderRadius: 8,
    marginBottom: 8, flexDirection: 'row',
    alignItems: 'flex-start', borderWidth: 1, borderColor: '#222',
  },
  adminItemInfo: {
    flex: 1,
  },
  adminItemName: {
    color: '#fff', fontSize: 14, fontWeight: 'bold',
    marginBottom: 4,
  },
  adminItemPhone: {
    color: '#00d4ff', fontSize: 13, fontWeight: '600',
    marginBottom: 3,
  },
  adminItemAmount: {
    color: GREEN, fontSize: 16, fontWeight: 'bold',
    marginBottom: 4,
  },
  adminItemDetail: {
    color: '#666', fontSize: 11, marginBottom: 2,
  },
  smsContainer: {
    backgroundColor: '#000', padding: 8, borderRadius: 4,
    marginTop: 6,
  },
  smsLabel: {
    color: GREEN, fontSize: 10, fontWeight: 'bold',
    marginBottom: 4,
  },
  smsText: {
    color: '#aaa', fontSize: 10, lineHeight: 14,
  },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff', fontSize: 10, fontWeight: 'bold',
  },
// Admin Action Buttons
  actionButtons: {
    flexDirection: 'column', gap: 6, alignItems: 'flex-end',
  },
  approveBtn: {
    backgroundColor: '#006600', padding: 8, paddingHorizontal: 12,
    borderRadius: 4, alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#990000', padding: 8, paddingHorizontal: 12,
    borderRadius: 4, alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff', fontSize: 11, fontWeight: 'bold',
  },

  // ==================== HEADER STYLES ====================
  header: {
    width: '100%', backgroundColor: '#0a0a0a',
    padding: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 2, borderBottomColor: GREEN,
  },
  headerText: { color: GREEN, fontWeight: 'bold', fontSize: 14 },
  headerSubtext: { color: '#666', fontSize: 11, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerBalance: { color: GREEN, fontWeight: 'bold', fontSize: 14 },
  logoutBtn: {
    backgroundColor: '#330000', borderWidth: 1, borderColor: '#ff4444',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 5, marginTop: 4,
  },
  logoutBtnText: { color: '#ff4444', fontSize: 11, fontWeight: 'bold' },
  backBtn: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: GREEN,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
  },
  backBtnText: { color: GREEN, fontSize: 12, fontWeight: 'bold' },

  // ==================== MAIN CONTAINER ====================
  mainContainer: { flex: 1, backgroundColor: BLACK },
  content: { padding: 16, alignItems: 'center' },
  sectionTitle: {
    color: GREEN, fontSize: 22, fontWeight: 'bold',
    marginTop: 16, marginBottom: 4, textAlign: 'center',
  },
  sectionSubtext: { color: '#666', fontSize: 13, marginBottom: 20 },

  // ==================== COUNTDOWN TIMER STYLES ====================
  countdownContainer: {
    alignItems: 'center', marginBottom: 20,
  },
  countdownLabel: {
    color: GREEN, fontSize: 16, fontWeight: 'bold',
    marginBottom: 12, letterSpacing: 2,
  },
  countdownCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: DARK_GREEN, borderWidth: 4, borderColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10,
    elevation: 10,
  },
  countdownNumber: {
    color: GREEN, fontSize: 48, fontWeight: 'bold',
  },
  countdownSubtext: {
    color: '#666', fontSize: 12, marginTop: 8,
  },
// ==================== CARD SELECT STYLES ====================
  cardGridScroll: { height: 350, marginBottom: 16 },
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: '100%', gap: 6,
  },
  cardItem: {
    width: '14%', aspectRatio: 1,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },
  cardItemSelected: { backgroundColor: DARK_GREEN, borderColor: GREEN },
  cardItemText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  cardItemTextSelected: { color: GREEN },
  cardPreview: {
    width: '100%', backgroundColor: '#111',
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333',
    marginBottom: 16,
  },
  cardPreviewTitle: { color: GREEN, fontSize: 12, marginBottom: 8, textAlign: 'center' },
  miniBoard: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: '100%', gap: 2,
  },
  miniCell: {
    width: '18%', aspectRatio: 1, backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center', borderRadius: 2,
  },
  miniCellFree: { backgroundColor: DARK_GREEN },
  miniCellText: { color: '#555', fontSize: 8 },

  // ==================== LOBBY STYLES ====================
  playersList: { width: '100%', marginBottom: 20 },
  playerItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', padding: 12, borderRadius: 8,
    marginBottom: 8, borderWidth: 1, borderColor: '#222',
  },
  playerRank: {
    color: GREEN, fontWeight: 'bold', fontSize: 16,
    width: 40, textAlign: 'center',
  },
  playerInfo: { flex: 1 },
  playerName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  playerCard: { color: '#666', fontSize: 11 },
  botBadge: {
    backgroundColor: '#333', color: '#888',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
    fontSize: 10, fontWeight: 'bold',
  },
  potInfo: {
    width: '100%', backgroundColor: '#0a0a0a',
    padding: 16, borderRadius: 10, borderWidth: 1, borderColor: GREEN,
    marginBottom: 20, alignItems: 'center',
  },
  potText: { color: GREEN, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  potBreakdown: { color: '#666', fontSize: 11 },
  startBtn: {
    backgroundColor: GREEN, padding: 16, borderRadius: 10,
    alignItems: 'center', width: '100%',
  },
  startBtnDisabled: {
    backgroundColor: '#333', opacity: 0.7,
  },
  startBtnText: { color: BLACK, fontSize: 16, fontWeight: 'bold' },
  startingContainer: { padding: 16 },
  startingText: { color: GREEN, fontSize: 16, textAlign: 'center' },

  // ==================== GAME SCREEN STYLES ====================
  currentNumberContainer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20, marginBottom: 20,
  },
numberBall: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  numberBallText: { color: BLACK, fontSize: 28, fontWeight: 'bold' },
  gameInfo: { alignItems: 'center' },
  drawnCount: { color: GREEN, fontSize: 14, fontWeight: 'bold' },
  playersInGame: { color: '#666', fontSize: 12 },

  // Called Numbers Board
  calledNumbersContainer: {
    width: '100%', marginBottom: 16,
  },
  calledNumbersTitle: {
    color: GREEN, fontSize: 14, fontWeight: 'bold',
    marginBottom: 8, textAlign: 'center', letterSpacing: 1,
  },
  calledNumbersScroll: {
    maxHeight: 120,
  },
  calledNumbersGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: '100%', gap: 3,
  },
  calledNumberCell: {
    width: '11.1%', aspectRatio: 1,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center', borderRadius: 3,
  },
  calledNumberCellCalled: {
    backgroundColor: DARK_GREEN, borderColor: GREEN,
  },
  calledNumberText: {
    color: '#555', fontSize: 10, fontWeight: '600',
  },
  calledNumberTextCalled: {
    color: GREEN, fontWeight: 'bold',
  },

  // Board
  board: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: '100%', gap: 5, marginBottom: 16,
  },
  cell: {
    width: '18.4%', aspectRatio: 1,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    alignItems: 'center', justifyContent: 'center', borderRadius: 4,
  },
  cellMarked: { backgroundColor: GREEN, borderColor: GREEN },
  cellFree: { backgroundColor: DARK_GREEN, borderColor: DARK_GREEN },
  cellDisabled: { opacity: 0.5 },
  cellText: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  cellTextMarked: { color: BLACK, fontWeight: 'bold' },

  // BINGO Button
bingoBtn: {
    backgroundColor: GREEN, padding: 16, borderRadius: 12,
    alignItems: 'center', width: '100%', marginBottom: 16,
    borderWidth: 3, borderColor: '#00ff00',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 15, elevation: 10,
  },
  bingoBtnText: {
    color: BLACK, fontSize: 22, fontWeight: 'bold',
    letterSpacing: 3,
  },
  bingoBtnSubtext: {
    color: '#003300', fontSize: 11, marginTop: 4,
  },

  // Winners
  winnersContainer: {
    width: '100%', backgroundColor: '#0a0a0a',
    padding: 16, borderRadius: 10, borderWidth: 1, borderColor: GREEN,
    marginBottom: 16,
  },
  winnersTitle: {
    color: GREEN, fontSize: 16, fontWeight: 'bold',
    marginBottom: 12, textAlign: 'center',
  },
  winnerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222',
  },
  winnerPosition: { fontSize: 20, width: 40 },
  winnerName: { flex: 1, color: '#ccc', fontSize: 14 },
  winnerNameYou: { color: GREEN, fontWeight: 'bold' },
  winnerPrize: { color: GREEN, fontSize: 12, fontWeight: 'bold' },

  // New Game Countdown
  newGameCountdownContainer: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#222',
    alignItems: 'center',
  },
  newGameCountdownText: {
    color: '#00ff00', fontSize: 14, fontWeight: 'bold',
  },

  // All Numbers Drawn Message
  allNumbersText: {
    color: '#ccc', fontSize: 14, textAlign: 'center',
    marginTop: 8, marginBottom: 4,
  },
  allNumbersSubtext: {
    color: '#666', fontSize: 12, textAlign: 'center',
  },

  waitingMsg: { padding: 20 },
  waitingText: { color: '#666', fontSize: 14, textAlign: 'center' },

  // ==================== BUTTONS ====================
  primaryBtn: {
    backgroundColor: GREEN, padding: 14, borderRadius: 10,
    alignItems: 'center', width: '100%', marginBottom: 12,
  },
  primaryBtnText: { color: BLACK, fontSize: 16, fontWeight: 'bold' },
  btnDisabled: { backgroundColor: '#333', opacity: 0.6 },
  walletBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  walletBtn: {
    flex: 1, backgroundColor: '#111',
    borderWidth: 1, borderColor: GREEN,
    padding: 12, borderRadius: 8, alignItems: 'center',
  },
  walletBtnText: { color: GREEN, fontSize: 12, fontWeight: 'bold' },

  // ==================== MODAL STYLES ====================
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
modalContent: {
    backgroundColor: '#111', width: '85%',
    padding: 24, borderRadius: 16,
    borderWidth: 2, borderColor: GREEN,
  },
  modalTitle: {
    color: GREEN, fontSize: 18,
    fontWeight: 'bold', marginBottom: 14,
    textAlign: 'center', letterSpacing: 2,
  },
  paymentInfo: { color: '#ccc', fontSize: 13, marginBottom: 4 },
  modalHint: { color: '#777', fontSize: 11, marginTop: 10, marginBottom: 4 },
  balanceText: { color: GREEN, fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  textArea: {
    borderWidth: 1, borderColor: GREEN,
    color: '#fff', padding: 10, borderRadius: 6,
    height: 90, textAlignVertical: 'top',
    backgroundColor: '#000', marginBottom: 10,
  },
  input: {
    borderWidth: 1, borderColor: GREEN,
    color: '#fff', padding: 10,
    borderRadius: 6, backgroundColor: '#000', marginBottom: 10,
  },
  modalBtn: {
    backgroundColor: GREEN, padding: 12,
    borderRadius: 8, alignItems: 'center', marginBottom: 8,
  },
  modalBtnText: { color: BLACK, fontWeight: 'bold' },
  cancelBtn: {
    backgroundColor: '#330000', padding: 10,
    borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#ff4444',
  },
  cancelBtnText: { color: '#ff4444', fontWeight: 'bold' },
});

