// Client logic for Bingo with registration, start countdown, number draws, and copy buttons
(() => {
  const cardEl = document.getElementById('card');
  const generateBtn = document.getElementById('generateBtn');
  const selectBtn = document.getElementById('selectBtn');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const startBtn = document.getElementById('startBtn');
  const roomIdInput = document.getElementById('roomIdInput');
  const status = document.getElementById('status');
  const playerList = document.getElementById('playerList');
  const nameInput = document.getElementById('name');
  const sizeSelect = document.getElementById('size');
  const phoneInput = document.getElementById('phone');
  const displayNameInput = document.getElementById('displayName');
  const registerBtn = document.getElementById('registerBtn');
  const userInfo = document.getElementById('userInfo');
  const countdownEl = document.getElementById('countdown');
  const calledNumbersEl = document.getElementById('calledNumbers');

  let currentCard = null;
  let selectedCard = null;
  let socket = null;
  let currentRoomId = null;
  let currentUser = null; // {id, phone, name}

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
    createRoomBtn.disabled = !currentUser;
    joinRoomBtn.disabled = !currentUser;
    status.textContent = 'Card selected. Now create or join a room.';
  });

  registerBtn.addEventListener('click', async () => {
    const phone = phoneInput.value.trim();
    const name = displayNameInput.value.trim() || 'Player';
    if (!phone) { userInfo.textContent = 'Enter phone number.'; return; }
    // call register endpoint
    const res = await fetch('/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ phone, name }) });
    const body = await res.json();
    if (!res.ok) { userInfo.textContent = body.error || 'Register failed'; return; }
    currentUser = body.user;
    localStorage.setItem('bingoUser', JSON.stringify(currentUser));
    userInfo.textContent = `Logged in: ${currentUser.name} (${currentUser.phone})`;
    createRoomBtn.disabled = !selectedCard;
    joinRoomBtn.disabled = !selectedCard;
  });

  // load user from storage
  const saved = localStorage.getItem('bingoUser');
  if (saved) { currentUser = JSON.parse(saved); userInfo.textContent = `Logged in: ${currentUser.name} (${currentUser.phone})`; }

  async function createRoom() {
    if (!selectedCard) { status.textContent = 'Select a card first.'; return; }
    if (!currentUser) { status.textContent = 'Register/login first.'; return; }
    const playerName = nameInput.value || currentUser.name;
    const res = await fetch('/rooms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card: selectedCard, playerName, userId: currentUser.id }),
    });
    const body = await res.json();
    if (!res.ok) { status.textContent = 'Create room failed: ' + (body.error || res.statusText); return; }
    currentRoomId = body.roomId;
    roomIdInput.value = currentRoomId;
    status.textContent = `Room created: ${currentRoomId}. Connected.`;
    connectSocket(currentRoomId, playerName);
    startBtn.disabled = false;
  }

  async function joinRoom() {
    if (!selectedCard) { status.textContent = 'Select a card first.'; return; }
    if (!currentUser) { status.textContent = 'Register/login first.'; return; }
    const roomId = roomIdInput.value.trim();
    if (!roomId) { status.textContent = 'Enter a room ID to join.'; return; }
    const playerName = nameInput.value || currentUser.name;
    const res = await fetch(`/rooms/${encodeURIComponent(roomId)}/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card: selectedCard, playerName, userId: currentUser.id }),
    });
    const body = await res.json();
    if (!res.ok) { status.textContent = 'Join room failed: ' + (body.error || res.statusText); return; }
    currentRoomId = roomId;
    status.textContent = `Joined room ${roomId}. Connected.`;
    connectSocket(roomId, playerName);
    startBtn.disabled = false;
  }

  async function startGame() {
    if (!currentRoomId) { status.textContent = 'Join a room first.'; return; }
    const res = await fetch(`/rooms/${encodeURIComponent(currentRoomId)}/start`, { method: 'POST' });
    const body = await res.json();
    if (!res.ok) { status.textContent = 'Start failed: ' + (body.error || res.statusText); return; }
    status.textContent = 'Game starting...';
  }

  function connectSocket(roomId, playerName) {
    if (socket) socket.disconnect();
    socket = io({ query: { roomId } });
    socket.on('connect', () => { console.log('socket connected'); });
    socket.on('room-update', (room) => { updatePlayerList(room); });
    socket.on('player-joined', (p) => { status.textContent = `${p.playerName} joined the room`; });
    socket.on('countdown', (seconds) => { countdownEl.textContent = seconds>0 ? `Starting in ${seconds}s` : 'Starting now'; });
    socket.on('number-draw', (n) => { addCalledNumber(n); });
    socket.on('game-started', () => { status.textContent = 'Game started'; });
    socket.on('disconnect', () => { console.log('socket disconnected'); });
  }

  function updatePlayerList(room) {
    playerList.innerHTML = '';
    (room.players || []).forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.playerName} (${p.id})`;
      playerList.appendChild(li);
    });
  }

  function addCalledNumber(n) {
    const el = document.createElement('div'); el.className='num'; el.textContent = n;
    calledNumbersEl.appendChild(el);
  }

  // copy buttons
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.copy-btn');
    if (b) {
      const txt = b.dataset.copy;
      navigator.clipboard.writeText(txt).then(() => { status.textContent = 'Copied: ' + txt; });
    }
  });

  createRoomBtn.addEventListener('click', createRoom);
  joinRoomBtn.addEventListener('click', joinRoom);
  startBtn.addEventListener('click', startGame);

  // enable buttons accordingly
  // auto-generate initial card on load
  generateBtn.click();
})();
