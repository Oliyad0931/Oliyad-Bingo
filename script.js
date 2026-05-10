// Client logic for Bingo card selection and room creation/joining
// Place this file next to index.html
(() => {
  const cardEl = document.getElementById('card');
  const generateBtn = document.getElementById('generateBtn');
  const selectBtn = document.getElementById('selectBtn');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const roomIdInput = document.getElementById('roomIdInput');
  const status = document.getElementById('status');
  const playerList = document.getElementById('playerList');
  const nameInput = document.getElementById('name');
  const sizeSelect = document.getElementById('size');

  let currentCard = null;
  let selectedCard = null;
  let socket = null;
  let currentRoomId = null;

  function randUniqueCount(min, max, count) {
    const pool = [];
    for (let i = min; i <= max; i++) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  function generateCard(size = 5, min = 1, max = 100) {
    const total = size * size;
    const nums = randUniqueCount(min, max, total);
    const grid = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        row.push(nums[r * size + c]);
      }
      grid.push(row);
    }
    return grid;
  }

  function renderCard(grid) {
    const size = grid.length;
    cardEl.style.gridTemplateColumns = `repeat(${size}, 60px)`;
    cardEl.innerHTML = '';
    grid.forEach((row, r) => {
      row.forEach((val, c) => {
        const div = document.createElement('div');
        div.className = 'cell';
        div.dataset.r = r;
        div.dataset.c = c;
        div.textContent = val;
        div.addEventListener('click', () => {
          div.classList.toggle('selected');
        });
        cardEl.appendChild(div);
      });
    });
  }

  generateBtn.addEventListener('click', () => {
    const size = parseInt(sizeSelect.value, 10);
    currentCard = generateCard(size, 1, 100);
    renderCard(currentCard);
    selectBtn.disabled = false;
    status.textContent = 'Card generated. Click "Select this card" to choose it.';
  });

  selectBtn.addEventListener('click', () => {
    if (!currentCard) return;
    selectedCard = currentCard;
    selectBtn.disabled = true;
    createRoomBtn.disabled = false;
    joinRoomBtn.disabled = false;
    status.textContent = 'Card selected. Now create or join a room.';
  });

  async function createRoom() {
    if (!selectedCard) { status.textContent = 'Select a card first.'; return; }
    const playerName = nameInput.value || 'Player';
    const res = await fetch('/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card: selectedCard, playerName }),
    });
    const body = await res.json();
    if (!res.ok) {
      status.textContent = 'Create room failed: ' + (body.error || res.statusText);
      return;
    }
    currentRoomId = body.roomId;
    status.textContent = `Room created: ${currentRoomId}. Connected.`;
    connectSocket(currentRoomId, playerName);
    roomIdInput.value = currentRoomId;
  }

  async function joinRoom() {
    if (!selectedCard) { status.textContent = 'Select a card first.'; return; }
    const roomId = roomIdInput.value.trim();
    if (!roomId) { status.textContent = 'Enter a room ID to join.'; return; }
    const playerName = nameInput.value || 'Player';
    const res = await fetch(`/rooms/${encodeURIComponent(roomId)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card: selectedCard, playerName }),
    });
    const body = await res.json();
    if (!res.ok) {
      status.textContent = 'Join room failed: ' + (body.error || res.statusText);
      return;
    }
    currentRoomId = roomId;
    status.textContent = `Joined room ${roomId}. Connected.`;
    connectSocket(roomId, playerName);
  }

  function connectSocket(roomId, playerName) {
    if (socket) socket.disconnect();
    socket = io({ query: { roomId, playerName } });
    socket.on('connect', () => {
      console.log('socket connected');
    });
    socket.on('room-update', (room) => {
      updatePlayerList(room);
    });
    socket.on('player-joined', (p) => {
      status.textContent = `${p.playerName} joined the room`;
    });
    socket.on('disconnect', () => {
      console.log('socket disconnected');
    });
  }

  function updatePlayerList(room) {
    playerList.innerHTML = '';
    (room.players || []).forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.playerName} (${p.id})`;
      playerList.appendChild(li);
    });
  }

  createRoomBtn.addEventListener('click', createRoom);
  joinRoomBtn.addEventListener('click', joinRoom);

  // Auto-generate initial card on load
  generateBtn.click();
})();
