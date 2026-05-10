// Extended server with registration/login, start countdown, number draw (1-75), and multi-player enforcement
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// In-memory store — replace with DB for production
const rooms = {}; // { roomId: { id, players: [{id, playerName, card, userId}], createdAt, state, timers... } }
const users = {}; // phone -> user {id, phone, name}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Register / login (simple)
app.post('/register', (req, res) => {
  const { phone, name } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone required' });
  let user = Object.values(users).find(u => u.phone === phone);
  if (!user) {
    user = { id: uuidv4(), phone, name: name || 'Player' };
    users[user.id] = user;
  }
  return res.json({ user });
});

// Create a new room
app.post('/rooms', (req, res) => {
  const { card, playerName, userId } = req.body || {};
  if (!card) return res.status(400).json({ error: 'card required' });
  if (!userId || !users[userId]) return res.status(400).json({ error: 'invalid user' });
  const id = uuidv4().slice(0, 8);
  const playerId = uuidv4();
  const room = { id, players: [{ id: playerId, playerName: playerName || users[userId].name, card, userId }], createdAt: new Date().toISOString(), state: 'waiting', called: [], drawQueue: [], timers: {} };
  rooms[id] = room;
  res.json({ roomId: id, playerId });
});

// Join an existing room
app.post('/rooms/:id/join', (req, res) => {
  const roomId = req.params.id;
  const { card, playerName, userId } = req.body || {};
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (!userId || !users[userId]) return res.status(400).json({ error: 'invalid user' });
  const playerId = uuidv4();
  const player = { id: playerId, playerName: playerName || users[userId].name, card, userId };
  room.players.push(player);

  // Inform connected sockets in room
  io.to(roomId).emit('player-joined', player);
  io.to(roomId).emit('room-update', room);

  res.json({ ok: true, roomId, playerId });
});

app.get('/rooms/:id', (req, res) => {
  const room = rooms[req.params.id];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// Start game (only if multiplayer)
app.post('/rooms/:id/start', (req, res) => {
  const roomId = req.params.id;
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if ((room.players || []).length < 2) return res.status(400).json({ error: 'Need at least 2 players to start' });
  if (room.state === 'starting' || room.state === 'running') return res.status(400).json({ error: 'Game already started' });

  room.state = 'starting';
  let seconds = 30;
  io.to(roomId).emit('countdown', seconds);

  // countdown every second
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
  // prepare shuffled numbers 1..75
  const pool = Array.from({length:75}, (_,i)=>i+1);
  for (let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  room.drawQueue = pool;
  io.to(roomId).emit('game-started');
  // emit first number immediately, then every 5s
  io.to(roomId).emit('number-draw', room.drawQueue.shift());
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

// Socket.io connection handling
io.on('connection', (socket) => {
  const { roomId } = socket.handshake.query || {};
  if (roomId && rooms[roomId]) {
    socket.join(roomId);
    io.to(roomId).emit('room-update', rooms[roomId]);
  }

  socket.on('disconnect', () => {
    // Optionally handle disconnects
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Bingo server listening on port ${PORT}`);
});
