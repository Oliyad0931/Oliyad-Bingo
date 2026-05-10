# Oliyad Bingo — Backend for registration, deposits, and withdrawals

What I implemented
- Registration with phone + strong password (hashed using bcryptjs)
- Login endpoint returning JWT (jsonwebtoken)
- Persistent storage for users and transactions using JSON files in /data (data/users.json, data/transactions.json)
- Deposit and Withdraw endpoints that create pending transactions
- Admin endpoints to view users and transactions and approve/reject transactions (admin login uses ADMIN_PASSWORD env var)
- Updated client to use JWT for auth, show deposit/withdraw UI, and auto-login after register

How to run
1. Install dependencies:
   npm install
2. Start server:
   JWT_SECRET and ADMIN_PASSWORD can be set as environment variables. Example:
   JWT_SECRET=replace_this ADMIN_PASSWORD=secret npm start
3. Open http://localhost:3000

Admin flow
- POST /admin/login with { "password": "<ADMIN_PASSWORD>" } to get an admin token
- Use the admin token in Authorization: Bearer <token> to call /admin/users, /admin/transactions, /admin/transactions/:id/approve

Notes and next steps
- This is still a demo. JSON file storage is fine for testing but switch to a real DB (Postgres, MySQL, MongoDB, Redis) for production to handle concurrency and scalability.
- Add SMS OTP verification for phone-based registration for better security.
- Add HTTPS and secure cookie handling for tokens in production.
- Add server-side validation and rate-limiting.
