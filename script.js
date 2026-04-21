let balance = 0;
let myId = "OLI-" + Math.floor(1000 + Math.random() * 9000);
let drawnNumbers = new Set();
let markedIndices = new Set([12]);
let boardNumbers = [];

const balanceDisplay = document.getElementById('balanceDisplay');
const userIdDisplay = document.getElementById('userIdDisplay');
const drawBtn = document.getElementById('drawBtn');

// Initialize Game
window.onload = () => {
    userIdDisplay.innerText = myId;
    simulatePlayers();
    generateBoard();
};

function showModal(id) { document.getElementById(id).style.display = 'block'; }
function hideModal(id) { document.getElementById(id).style.display = 'none'; }

function simulatePlayers() {
    const players = ["User_99", "Abebe_Eth", "Bini_Bingo", "Sara_K", "Oliyad_Pro"];
    document.getElementById('playerCount').innerText = `Multiplayer: ${players.length} Players Online`;
    drawBtn.disabled = false;
}

function verifyTransaction() {
    const sms = document.getElementById('smsPasteArea').value;
    if (sms.includes("received") || sms.includes("Transferred") || sms.includes("Confirmed")) {
        let amountMatch = sms.match(/\d+(\.\d+)?(?=\s*ETB)/);
        let amount = amountMatch ? parseFloat(amountMatch[0]) : 100;

        balance += amount;
      updateUI();
        alert(`Success! ${amount} ETB added to ID: ${myId}`);
        hideModal('depositModal');
        document.getElementById('smsPasteArea').value = "";
    } else {
        alert("Invalid Transaction SMS. Please copy the full message.");
    }
}

function processWithdrawal() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    if (amount > balance) {
        alert("Insufficient Balance!");
    } else if (amount >= 50) {
        balance -= amount;
        updateUI();
alert(`Withdrawal of ${amount} ETB to ${document.getElementById('withdrawAccount').value} is processing...`);
        hideModal('withdrawModal');
    } else {
        alert("Minimum withdrawal is 50 ETB");
    }
}

function updateUI() {
    balanceDisplay.innerText = balance;
}

function generateBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    let pool = Array.from({length: 75}, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    boardNumbers = pool.slice(0, 25);
     
  for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        if (i === 12) {
            cell.innerText = "FREE";
            cell.classList.add('marked', 'free');
        } else {
            cell.innerText = boardNumbers[i];
            cell.onclick = () => {
                if (drawnNumbers.has(boardNumbers[i])) {
                    cell.classList.add('marked');
                    markedIndices.add(i);
                    checkWin();
                }
            };
        }
        board.appendChild(cell);
    }
    }

drawBtn.onclick = () => {
    if (balance < 50) {
        alert("Need 50 ETB to Draw!");
        return;
    }
    balance -= 50;
    updateUI();

    let num;
    do { num = Math.floor(Math.random() * 75) + 1; } while (drawnNumbers.has(num));
    drawnNumbers.add(num);
    document.getElementById('currentNumber').innerText = num;
};

function checkWin() {
    const wins = [
      [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
        [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
        [0,6,12,18,24],[4,8,12,16,20]
    ];
    for (let p of wins) {
        if (p.every(idx => markedIndices.has(idx))) {
            document.getElementById('message').innerText = "BINGO! +500 ETB";
            balance += 500;
            updateUI();
            drawBtn.disabled = true;
        }
    }
          }

document.getElementById('resetBtn').onclick = () => {
    drawnNumbers.clear();
    markedIndices = new Set([12]);
    document.getElementById('currentNumber').innerText = "--";
    document.getElementById('message').innerText = "";
    drawBtn.disabled = false;
    generateBoard();
};
