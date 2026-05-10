// Minimal Node + Express + Socket.io server for Bingo rooms (in-memory)
// Run: npm install
// Start: npm start

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Simple in-memory store — replace with DB for production
const rooms = {}; // { roomId: { id, players: [{id, playerName, card}], createdAt } }

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Create a new room
app.post('/rooms', (req, res) => {
  const { card, playerName } = req.body || {};
  if (!card) return res.status(400).json({ error: 'card required' });
  const id = uuidv4().slice(0, 8);
  const playerId = uuidv4();
  const room = { id, players: [{ id: playerId, playerName: playerName || 'Player', card }], createdAt: new Date().toISOString() };
  rooms[id] = room;
  res.json({ roomId: id, playerId });
});

// Join an existing room
app.post('/rooms/:id/join', (req, res) => {
  const roomId = req.params.id;
  const { card, playerName } = req.body || {};
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const playerId = uuidv4();
  const player = { id: playerId, playerName: playerName || 'Player', card };
  room.players.push(player);

  // Inform connected sockets in room
  io.to(roomId).emit('player-joined', player);
  io.to(roomId).emit('room-update', room);

  res.json({ ok: true, roomId, playerId });
});

// Get room info
app.get('/rooms/:id', (req, res) => {
  const room = rooms[req.params.id];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  const { roomId } = socket.handshake.query || {};
  if (roomId && rooms[roomId]) {
    socket.join(roomId);
    io.to(roomId).emit('room-update', rooms[roomId]);
  }

  socket.on('disconnect', () => {
    // Optionally handle disconnects (remove players or mark them)
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Bingo server listening on port ${PORT}`);
});
