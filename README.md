# Oliyad Bingo — Card Selection & Rooms (demo)

This adds a minimal demo to generate Bingo cards (numbers 1–100), select a card, and create/join playing rooms using Socket.io.

Files added:
- index.html — frontend UI
- script.js — frontend logic
- server.js — minimal Node/Express + Socket.io server
- package.json — dependencies and start script
- README.md — quick instructions

Quick start (run locally):
1. Ensure Node.js (16+) is installed.
2. In the repository root run:
   npm install
   npm start
3. Open http://localhost:3000 in your browser.

Notes:
- Rooms are stored in memory and will reset when the server restarts.
- This is a demo scaffold. Add persistence, authentication, and game logic (calling numbers, marking cards, win detection) as next steps.
