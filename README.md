# FPL Agent

FPL Agent is a React + Express app that displays your FPL team in formation and recommends transfer options for the upcoming gameweek. It uses public FPL API endpoints and a position-aware transfer suggestion algorithm.

**Live Demo**: Currently available only on local dev. See [deployment guide](./DEPLOYMENT.md) to deploy to Render.

## Features

- **Team Viewer**: View your squad organized by position (GK, DEF, MID, FWD)
- **Formation Display**: Visualize your team's formation
- **Fixture Difficulty Badges**: See your players' next 4 fixtures with color-coded difficulty (green=easy, yellow=mid, red=hard) and home/away indicators
- **Expected Score Calculation**: See each player's expected points for the coming gameweek
- **Smart Suggestions**: Get transfer recommendations (single swaps or double transfers) based on:
  - Player form and expected points
  - Upcoming fixture difficulty
  - Price efficiency
  - Ownership penalties
- **Auto Gameweek**: Automatically detects the current/next gameweek from FPL

## Quick Start (Local Development)

### Prerequisites
- Node.js 16+
- An FPL account and entry ID (find at https://fantasy.premierleague.com/)

### Run Locally

```bash
# Install dependencies
npm install

# Start dev server (frontend on 5173, backend on 4000)
npm run dev

# In a separate terminal (optional; npm run dev handles it)
cd server && npm start
```

Open `http://localhost:5173` and enter your FPL entry ID (default: 9093691).

## Architecture

- **Frontend**: React 18 + Vite
  - Components: `TeamView` (squad display), `Suggestions` (transfer recommendations)
  - Communicates with backend via `/api` routes
  
- **Backend**: Express.js
  - Proxies FPL endpoints (`bootstrap-static`, `fixtures`, `/entry/:id/picks`)
  - Computes position-aware transfer suggestions via `/api/suggest`

## Scoring Algorithm

Transfer suggestions are scored using:
```
score = (form × 2.2) + (expected_points × 1.9) 
        + (fixture_score × 3.2) + minutes_boost 
        + (popularity × 0.8) − (cost / 25)
```

Where `fixture_score = 1 / (1 + avg_upcoming_fixture_difficulty)`

## Deployment

To deploy to Render (free):

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions including:
- Pushing to GitHub
- Creating Render services
- Automatic environment configuration

## Project Structure

```
FPL Agent/
├── src/
│   ├── App.jsx                 # Main app, data orchestration
│   ├── components/
│   │   ├── TeamView.jsx        # Squad display in formation
│   │   └── Suggestions.jsx     # Transfer recommendations
│   └── styles.css              # Styling
├── server/
│   └── index.js                # Express backend
├── package.json                # Dependencies
├── vite.config.js              # Vite config (includes /api proxy)
├── render.yaml                 # Render deployment blueprint
├── DEPLOYMENT.md               # Deployment guide
└── .env.example                # Environment variable template
```

## Notes & Future Improvements

- The suggestion algorithm is a heuristic; it's a starting point and can be tuned
- Possible enhancements:
  - Official FPL OAuth for private data access
  - Injury/suspension tracking
  - Bench player consideration
  - Multi-gameweek planning
  - Expected points from official FPL sources (when available)
