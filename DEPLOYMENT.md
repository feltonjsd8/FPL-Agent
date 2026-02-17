# FPL Agent - Deployment Guide

## Overview
This project consists of:
- **Backend**: Express.js API server (port 4000) that proxies FPL endpoints and computes transfer suggestions
- **Frontend**: React app (built with Vite) that displays your FPL team and suggested transfers

## Local Development

### Prerequisites
- Node.js 16+ installed
- An FPL account and entry ID (find at https://fantasy.premierleague.com/)

### Setup
```bash
# Install dependencies for both frontend and backend
npm install

# Create a .env file in the project root (optional for local dev)
# VITE_API_BASE=  # Leave blank for local dev; uses localhost:4000

# Start dev server (runs frontend on 5173 with proxy to backend on 4000)
npm run dev

# In a separate terminal, start the backend
cd server && npm start
```

The frontend dev server includes a proxy that routes `/api/*` requests to `http://localhost:4000`, so you don't need to configure `VITE_API_BASE` locally.

## Deploy to Render

### Prerequisites
1. **GitHub Account**: Push your code to GitHub
2. **Render Account**: Sign up at https://render.com (free tier available)

### Step 1: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial FPL Agent commit"

# Add remote (replace with your GitHub URL)
git remote add origin https://github.com/yourusername/fpl-agent.git

# Push to main branch
git branch -M main
git push -u origin main
```

### Step 2: Create Services on Render

1. Go to https://render.com/dashboard
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub account and select the `fpl-agent` repository
4. Choose the branch (`main`)
5. Render will read `render.yaml` and automatically create:
   - **Backend Web Service** (`fpl-agent-api`): Node.js Express app
   - **Frontend Static Site** (`fpl-agent`): Vite build output

Name your deployment (e.g., "fpl-agent-prod") and click **"Create Deployment"**.

Render will:
- Build the backend and frontend in parallel
- Set environment variables automatically (frontend's `VITE_API_BASE` is populated with the backend service URL)
- Deploy both services

### Step 3: Configure (if needed)

By default, the blueprint uses:
- **Backend**: `PORT=4000` (Render assigns the actual port)
- **Frontend**: Builds with `npm run build` and serves from `dist/`
- **Environment Variable**: `VITE_API_BASE` is automatically set to the backend service's public URL

If you need custom settings, update `render.yaml` and push to GitHub; Render will auto-redeploy.

### Step 4: Use Your Deployed App

Once both services are live:
1. Open the frontend URL (provided in Render dashboard, e.g., `https://fpl-agent.onrender.com`)
2. Enter your FPL entry ID (default: 9093691)
3. Click **"Show Team"** to view your squad
4. Click **"Get Suggestions"** to see transfer recommendations

## Environment Variables

### Frontend
- `VITE_API_BASE`: Backend API base URL (e.g., `https://fpl-agent-api.onrender.com`)
  - In development: Not needed (proxy handles it)
  - In production: Automatically set by Render blueprint

### Backend
- `PORT`: Port to listen on (default: 4000)
  - Render overrides this to a dynamic port; your app reads from `process.env.PORT`

## File Structure

```
FPL Agent/
├── src/
│   ├── App.jsx                 # Main app component
│   ├── components/
│   │   ├── TeamView.jsx        # Displays your squad in formation
│   │   └── Suggestions.jsx     # Shows transfer suggestions
│   └── styles.css              # Styling
├── server/
│   └── index.js                # Express backend (FPL proxy + suggestions)
├── package.json                # Frontend dependencies
├── vite.config.js              # Vite configuration
├── render.yaml                 # Render multi-service blueprint
├── .env.example                # Environment variable template
└── .gitignore                  # Git ignore rules
```

## Troubleshooting

### "VITE_API_BASE is not set"
- **Local dev**: Not needed; proxy handles it
- **Production**: Check Render dashboard → Service Settings → Environment to verify `VITE_API_BASE` is set to backend URL

### Backend returns 404 or CORS errors
- Ensure backend service is running and healthy (check Render logs)
- Backend must be fully deployed before frontend is built (Render blueprint orders this correctly)

### Frontend shows team but suggestions fail
- Check browser DevTools → Network tab; verify requests to `/api/suggest` go to backend
- Check Render backend logs for errors

## Support

For issues with Render, see https://render.com/docs.
For FPL API questions, visit https://github.com/vaastav/Fantasy-Premier-League.
