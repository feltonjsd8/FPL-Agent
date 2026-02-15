# FPL Agent

FPL Agent is a small React + Express app to view an FPL team (by entry ID) and get a simple transfer suggestion for the upcoming game week. It uses public FPL endpoints and a heuristic to recommend a transfer.

## Quick start

1. Install dependencies

```bash
npm install
```

2. Run in development (starts server + Vite)

```bash
npm run dev
```

3. Open the app at `http://localhost:5173` (Vite default).

## How it works

- The server (`server/index.js`) proxies FPL API endpoints and provides `/api/suggest` which returns a basic transfer suggestion.
- The client (`src/`) lets you enter your FPL entry ID and optionally a GW (event) to load your picks and request a suggestion.

## Notes & next steps

- The suggestion algorithm is a simple heuristic combining `form`, `xG/xA`-derived proxy, upcoming fixture difficulty, and price. It is intended as a starting point.
- Improvements: respect positions strictly, support multiple transfer suggestions, integrate official FPL auth for private data, surface more metrics (expected points, ownership, injury news).
