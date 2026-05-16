POS Parfum Refill - Implementation Workspace

Status: scaffolded backend and DB schema. Basic API endpoints and simple frontend added.

Quickstart:
1) Install dependencies
   cd backend && npm install
2) Run server
   npm start
3) Initialize DB
   curl -X POST http://localhost:3000/api/init-db
4) Open UI
   Visit http://localhost:3000/static/index.html

Run tests:
   cd backend && npm test

Notes:
- DB path: backend/data/pos.db (default)
- Use UUIDs for IDs
- Tests use jest + supertest and run app directly without starting separate server
