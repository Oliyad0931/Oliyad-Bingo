// Server with registration (phone + strong password), login (JWT), persistent JSON storage for users & transactions
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Paths for data
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TX_FILE = path.join(DATA_DIR, 'transactions.json');

// ensure data dir
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({}));
if (!fs.existsSync(TX_FILE)) fs.writeFileSync(TX_FILE, JSON.stringify([]));

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function readUsers(){ try { return JSON.parse(fs.readFileSync(USERS_FILE,'utf8')||'{}'); } catch(e){ return {}; } }
function writeUsers(data){ fs.writeFileSync(USERS_FILE, JSON.stringify(data,null,2)); }
function readTx(){ try { return JSON.parse(fs.readFileSync(TX_FILE,'utf8')||'[]'); } catch(e){ return []; } }
function writeTx(data){ fs.writeFileSync(TX_FILE, JSON.stringify(data,null,2)); }

// In-memory rooms for game state
const rooms = {}; // { roomId: { id, players: [{id, playerName, card, userId}], createdAt, state, called, drawQueue, timers } }

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Auth helpers
function generateToken(payload){ return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }); }
function authMiddleware(req,res,next){ const h = req.headers.authorization; if(!h) return res.status(401).json({error:'missing token'}); const parts = h.split(' '); if(parts.length!==2) return res.status(401).json({error:'invalid auth header'}); const token = parts[1]; try{ const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next(); }catch(e){ return res.status(401).json({error:'invalid token'}); } }
function adminMiddleware(req,res,next){ if(!req.user || req.user.role!=='admin') return res.status(403).json({error:'admin required'}); next(); }

// Register
app.post('/register', (req, res) => {
  const { phone, name, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: 'phone and password required' });
  // basic strong password check
  if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
  const users = readUsers();
  // check if phone exists
  const existing = Object.values(users).find(u => u.phone === phone);
  if (existing) return res.status(400).json({ error: 'phone already registered' });
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const user = { id, phone, name: name || 'Player', passwordHash: hash, balance: 0, createdAt: new Date().toISOString() };
  users[id] = user;
  writeUsers(users);
  // return limited user
  const out = { id: user.id, phone: user.phone, name: user.name, balance: user.balance, createdAt: user.createdAt };
  res.json({ user: out });
});

// Login
app.post('/login', (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: 'phone and password required' });
  const users = readUsers();
  const user = Object.values(users).find(u => u.phone === phone);
  if (!user) return res.status(400).json({ error: 'invalid credentials' });
  if (!bcrypt.compareSync(password, user.passwordHash)) return res.status(400).json({ error: 'invalid credentials' });
  const token = generateToken({ id: user.id, phone: user.phone, name: user.name, role: 'user' });
  const out = { id: user.id, phone: user.phone, name: user.name, balance: user.balance };
  res.json({ token, user: out });
});

// Admin login (simple)
app.post('/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'invalid admin credentials' });
  const token = generateToken({ role: 'admin' });
  res.json({ token });
});

// Get current user
app.get('/me', authMiddleware, (req, res) => {
  const users = readUsers();
  const u = users[req.user.id];
  if (!u) return res.status(404).json({ error: 'user not found' });
  const out = { id: u.id, phone: u.phone, name: u.name, balance: u.balance, createdAt: u.createdAt };
  res.json({ user: out });
});

// Transactions: deposit (user creates a deposit record, admin approves later)
app.post('/transactions/deposit', authMiddleware, (req, res) => {
  const { amount, method, reference } = req.body || {};
  if (!amount || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
  const txs = readTx();
  const tx = { id: uuidv4(), userId: req.user.id, type: 'deposit', amount, method: method||'unknown', reference: reference||'', status: 'pending', createdAt: new Date().toISOString() };
  txs.push(tx);
  writeTx(txs);
  res.json({ ok: true, tx });
});

// Withdraw request
app.post('/transactions/withdraw', authMiddleware, (req, res) => {
  const { amount, method, reference } = req.body || {};
  if (!amount || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
  const users = readUsers();
  const user = users[req.user.id];
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (user.balance < amount) return res.status(400).json({ error: 'insufficient balance' });
  const txs = readTx();
  const tx = { id: uuidv4(), userId: req.user.id, type: 'withdraw', amount, method: method||'unknown', reference: reference||'', status: 'pending', createdAt: new Date().toISOString() };
  txs.push(tx);
  writeTx(txs);
  res.json({ ok: true, tx });
});

// Admin endpoints to view users and transactions
app.get('/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = readUsers();
  const out = Object.values(users).map(u => ({ id: u.id, phone: u.phone, name: u.name, balance: u.balance, createdAt: u.createdAt }));
  res.json({ users: out });
});

app.get('/admin/transactions', authMiddleware, adminMiddleware, (req, res) => {
  const txs = readTx();
  res.json({ transactions: txs });
});

// Admin approve/reject transaction
app.post('/admin/transactions/:id/approve', authMiddleware, adminMiddleware, (req, res) => {
  const id = req.params.id;
  const txs = readTx();
  const tx = txs.find(t => t.id === id);
  if (!tx) return res.status(404).json({ error: 'tx not found' });
  if (tx.status !== 'pending') return res.status(400).json({ error: 'tx already processed' });
  const users = readUsers();
  const user = users[tx.userId];
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (tx.type === 'deposit') {
    user.balance = (user.balance || 0) + Number(tx.amount);
    tx.status = 'approved';
  } else if (tx.type === 'withdraw') {
    if (user.balance < tx.amount) return res.status(400).json({ error: 'insufficient balance' });
    user.balance = (user.balance || 0) - Number(tx.amount);
    tx.status = 'approved';
  }
  writeUsers(users);
  writeTx(txs);
  res.json({ ok: true, tx });
});

app.post('/admin/transactions/:id/reject', authMiddleware, adminMiddleware, (req, res) => {
  const id = req.params.id;
  const txs = readTx();
  const tx = txs.find(t => t.id === id);
  if (!tx) return res.status(404).json({ error: 'tx not found' });
  if (tx.status !== 'pending') return res.status(400).json({ error: 'tx already processed' });
  tx.status = 'rejected';
  writeTx(txs);
  res.json({ ok: true, tx });
});

// -- Game room endpoints (reuse previous implementation but require auth where appropriate)
app.post('/rooms', authMiddleware, (req, res) => {
  const { card, playerName } = req.body || {};
  if (!card) return res.status(400).json({ error: 'card required' });
  const id = uuidv4().slice(0, 8);
  const playerId = uuidv4();
  const room = { id, players: [{ id: playerId, playerName: playerName || req.user.name, card, userId: req.user.id }], createdAt: new Date().toISOString(), state: 'waiting', called: [], drawQueue: [], timers: {} };
  rooms[id] = room;
  res.json({ roomId: id, playerId });
});

app.post('/rooms/:id/join', authMiddleware, (req, res) => {
  const roomId = req.params.id;
  const { card, playerName } = req.body || {};
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const playerId = uuidv4();
  const player = { id: playerId, playerName: playerName || req.user.name, card, userId: req.user.id };
  room.players.push(player);
  io.to(roomId).emit('player-joined', player);
  io.to(roomId).emit('room-update', room);
  res.json({ ok: true, roomId, playerId });
});

app.get('/rooms/:id', authMiddleware, (req, res) => {
  const room = rooms[req.params.id];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

app.post('/rooms/:id/start', authMiddleware, (req, res) => {
  const roomId = req.params.id;
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if ((room.players || []).length < 2) return res.status(400).json({ error: 'Need at least 2 players to start' });
  if (room.state === 'starting' || room.state === 'running') return res.status(400).json({ error: 'Game already started' });
  room.state = 'starting';
  let seconds = 30;
  io.to(roomId).emit('countdown', seconds);
  room.timers.countdown = setInterval(() => {
    seconds -= 1;
    if (seconds >= 0) io.to(roomId).emit('countdown', seconds);
    if (seconds <= 0) {
      clearInterval(room.timers.countdown);
      startDraws(roomId);
    }
  }, 1000);
  res.json({ ok: true });
});

function startDraws(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  room.state = 'running';
  const pool = Array.from({length:75}, (_,i)=>i+1);
  for (let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  room.drawQueue = pool;
  io.to(roomId).emit('game-started');
  // emit first number immediately
  const first = room.drawQueue.shift();
  room.called.push(first);
  io.to(roomId).emit('number-draw', first);
  io.to(roomId).emit('room-update', room);
  room.timers.draw = setInterval(() => {
    const next = room.drawQueue.shift();
    if (next === undefined) {
      clearInterval(room.timers.draw);
      room.state = 'finished';
      io.to(roomId).emit('room-update', room);
      return;
    }
    room.called.push(next);
    io.to(roomId).emit('number-draw', next);
    io.to(roomId).emit('room-update', room);
  }, 5000);
}

// Socket.io
io.on('connection', (socket) => {
  const { roomId } = socket.handshake.query || {};
  if (roomId && rooms[roomId]) {
    socket.join(roomId);
    io.to(roomId).emit('room-update', rooms[roomId]);
  }
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Bingo server listening on port ${PORT}`);
});
