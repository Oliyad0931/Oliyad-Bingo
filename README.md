# Oliyad Bingo — Card Selection, Rooms & Game (extended)

This update adds:
- Registration / login by phone (simple in-memory demo)
- Create / join rooms (requires login)
- Start game with 30s countdown; game draws numbers 1..75 randomly and emits them every 5s
- UI theme gold / white / black
- Deposit/payment info (TELEBIRR and CBE account) with Copy buttons

Files changed/added:
- index.html (updated UI and theme)
- script.js (registration, start, number calls, copy)
- server.js (register/login, start countdown, draw logic)
- package.json unchanged

Run locally:
1. npm install
2. npm start
3. Open http://localhost:3000

Notes:
- All data (users, rooms) stored in memory for demo purposes.
- The register/login is a simple phone-based flow (no SMS). For production, integrate an SMS gateway or proper auth.
- Payment details shown are for convenience; secure handling and verification are required for real money flows.
