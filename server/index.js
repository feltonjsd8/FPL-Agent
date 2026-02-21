const express = require('express');
const cors = require('cors');
const fetch = global.fetch || require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const FPL_BASE = 'https://fantasy.premierleague.com/api';
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Referer': 'https://fantasy.premierleague.com/',
  'Accept-Language': 'en-US,en;q=0.9'
};

app.get('/api/bootstrap', async (req, res) => {
  try {
    const r = await fetch(`${FPL_BASE}/bootstrap-static/`, { headers: DEFAULT_HEADERS });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fixtures', async (req, res) => {
  try {
    const r = await fetch(`${FPL_BASE}/fixtures/`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/entry/:id/picks/:event?', async (req, res) => {
  const { id, event } = req.params;
  console.log(`GET /api/entry/${id}/picks/${event || ''}`);
  try {
    const url = event
      ? `${FPL_BASE}/entry/${id}/event/${event}/picks/`
      : `${FPL_BASE}/entry/${id}/picks/`;
    const r = await fetch(url, { headers: DEFAULT_HEADERS });
    const contentType = (r.headers.get('content-type') || '').toLowerCase();
    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).send(txt);
    }
    // If upstream didn't return JSON, forward as an error so client can display raw HTML/text
    if (!contentType.includes('application/json')) {
      const txt = await r.text();
      console.error('Non-JSON response from upstream for entry picks:', txt.substring(0, 800));
      return res.status(502).json({ error: 'Upstream returned non-JSON response', body: txt });
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shared suggestion computation used by multiple endpoints
async function computeSuggestions(bootstrap, picks, fixtures, entryInfo = {}, maxSingles = 8, maxPairs = 3) {
  // Build player map
  const players = {};
  bootstrap.elements.forEach(p => {
    // Calculate games played from minutes
    const gamesPlayed = Math.max(1, Math.round((p.minutes || 0) / 90));
    // Calculate average xG/xA per game
    const seasonXG = parseFloat(p.expected_goals || 0);
    const seasonXA = parseFloat(p.expected_assists || 0);
    const avgXGPerGame = seasonXG / gamesPlayed;
    const avgXAPerGame = seasonXA / gamesPlayed;
    // This will be projected in fixtureScoreForPlayer
    players[p.id] = {
      id: p.id,
      web_name: p.web_name,
      team: p.team,
      element_type: p.element_type,
      form: parseFloat(p.form) || 0,
      now_cost: p.now_cost / 10,
      total_points: p.total_points || 0,
      minutes: p.minutes || 0,
      seasonXG: seasonXG,
      seasonXA: seasonXA,
      avgXGPerGame: avgXGPerGame,
      avgXAPerGame: avgXAPerGame,
      gamesPlayed: gamesPlayed,
      expected_points: (seasonXG + seasonXA) || 0,
      selected_by_percent: parseFloat(p.selected_by_percent || 0)
    };
  });

  // Fixture difficulty per team (next up to 4 fixtures)
  const upcoming = fixtures.filter(f => !f.finished).slice(0, 200);
  const teamFixtures = {};
  upcoming.forEach(f => {
    const { team_h, team_a, team_h_difficulty, team_a_difficulty } = f;
    teamFixtures[team_h] = teamFixtures[team_h] || [];
    teamFixtures[team_a] = teamFixtures[team_a] || [];
    teamFixtures[team_h].push(team_h_difficulty);
    teamFixtures[team_a].push(team_a_difficulty);
  });

  function fixtureScoreForPlayer(player) {
    const tf = teamFixtures[player.team] || [];
    const arr = tf.slice(0, 4);
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 2.5;
    return 1 / (1 + avg);
  }

  // Project xG/xA for next 4 fixtures based on average per game and fixture difficulty
  function projectedExpectedPoints(player) {
    const tf = teamFixtures[player.team] || [];
    const upcomingFixtures = tf.slice(0, 4);
    if (!upcomingFixtures.length) {
      return player.seasonXG + player.seasonXA;
    }
    // Average xG/xA per game
    const avgXGPerGame = player.avgXGPerGame;
    const avgXAPerGame = player.avgXAPerGame;
    // Adjust by average fixture difficulty over next 4 games
    const avgFixtureDifficulty = upcomingFixtures.reduce((a, b) => a + b, 0) / upcomingFixtures.length;
    const difficultyMultiplier = 1 / (1 + avgFixtureDifficulty); // Higher difficulty = lower multiplier
    // Project for 4 fixtures with difficulty adjustment
    const projectedXG = avgXGPerGame * 4 * difficultyMultiplier;
    const projectedXA = avgXAPerGame * 4 * difficultyMultiplier;
    return projectedXG + projectedXA;
  }

  // Normalize squad picks
  let squad = [];
  if (picks && picks.picks) squad = picks.picks.map(p => ({ element: p.element, position: p.position, multiplier: p.multiplier }));
  else if (picks && picks.results) squad = picks.results.map(p => ({ element: p.element, position: p.position }));

  const squadSet = new Set(squad.map(s => s.element));

  // Score candidates (not currently in squad)
  const candidates = Object.values(players).filter(p => !squadSet.has(p.id));
  const scoredCandidates = candidates.map(p => {
    const fScore = fixtureScoreForPlayer(p);
    const minutesBoost = p.minutes > 0 ? 0.5 : 0;
    // Use projected xG/xA for next 4 fixtures instead of season totals
    const projectedXGXA = projectedExpectedPoints(p);
    const score = p.form * 1.5 + projectedXGXA * 1.9 + fScore * 7.0 + minutesBoost;
    return { ...p, score, fixtureScore: fScore, projectedExpectedPoints: projectedXGXA };
  }).sort((a, b) => b.score - a.score);

  // Score current players
  const currentPlayers = squad.map(s => ({ pick: s, info: players[s.element] })).filter(x => x.info);
  function currentValue(info) {
    const fScore = fixtureScoreForPlayer(info);
    const projectedXGXA = projectedExpectedPoints(info);
    return (info.form || 0) * 1.5 + projectedXGXA * 1.9 + fScore * 3.2;
  }

  // Attempt to get available bank (fallback to 0)
  let bank = 0;
  try {
    bank = (entryInfo && (entryInfo.bank || (entryInfo.entry && entryInfo.entry.bank))) || 0;
  } catch (e) { bank = 0; }

  // Build per-position worst players
  const byPosition = {};
  currentPlayers.forEach(({ pick, info }) => {
    const pos = info.element_type;
    byPosition[pos] = byPosition[pos] || [];
    byPosition[pos].push({ pick, info, value: currentValue(info) });
  });
  Object.keys(byPosition).forEach(k => byPosition[k].sort((a, b) => a.value - b.value));

  // For each worst player per position, find top affordable candidate of same position
  const singles = [];
  Object.entries(byPosition).forEach(([pos, arr]) => {
    arr.slice(0, 2).forEach(w => {
      const worst = w.info;
      const worstSell = worst.now_cost;
      const affordability = worstSell + bank + 0.1; // small buffer
      const best = scoredCandidates.find(c => c.element_type === worst.element_type && c.now_cost <= affordability);
      if (best) {
        const gain = best.score - w.value;
        singles.push({ out: { id: worst.id, name: worst.web_name, pos: worst.element_type, cost: worst.now_cost }, in: { id: best.id, name: best.web_name, pos: best.element_type, cost: best.now_cost, expected_score: best.score }, gain });
      }
    });
  });

  const topSingles = singles.sort((a, b) => b.gain - a.gain).slice(0, Math.max(1, Math.min(50, Number(maxSingles))));

  // Simple two-transfer pairs: greedy simulate applying first transfer then pick second best
  const pairs = [];
  for (let i = 0; i < Math.min(topSingles.length, Number(maxPairs) || 3); i++) {
    const first = topSingles[i];
    const newSquadSet = new Set(squadSet);
    newSquadSet.delete(first.out.id);
    newSquadSet.add(first.in.id);
    const bankAfter = bank + first.out.cost - first.in.cost;

    const remainingCandidates = scoredCandidates.filter(c => !newSquadSet.has(c.id) && c.id !== first.in.id);
    const secondWorstCandidates = currentPlayers.filter(cp => cp.info.id !== first.out.id).map(cp => cp.info);
    let bestPair = null;
    secondWorstCandidates.forEach(w => {
      const affordability = w.now_cost + bankAfter + 0.1;
      const best = remainingCandidates.find(c => c.element_type === w.element_type && c.now_cost <= affordability);
      if (best) {
        const gain = best.score - currentValue(w);
        if (!bestPair || gain > bestPair.gain) bestPair = { out: { id: w.id, name: w.web_name, pos: w.element_type, cost: w.now_cost }, in: { id: best.id, name: best.web_name, pos: best.element_type, cost: best.now_cost, expected_score: best.score }, gain };
      }
    });
    if (bestPair) {
      pairs.push({ first, second: bestPair, total_gain: first.gain + bestPair.gain });
    }
  }

  pairs.sort((a, b) => b.total_gain - a.total_gain);

  return { bank, topSingles, pairs, topCandidates: scoredCandidates.slice(0, 20) };
}


// Suggest transfers: position-aware, multiple single-transfer options and simple two-transfer pairs
app.get('/api/suggest', async (req, res) => {
  const { entryId, event, maxSingles = 8, maxPairs = 3 } = req.query;
  if (!entryId) return res.status(400).json({ error: 'entryId required' });
  try {
    const [bootstrapRes, picksRes, fixturesRes, entryRes] = await Promise.all([
      fetch(`${FPL_BASE}/bootstrap-static/`, { headers: DEFAULT_HEADERS }),
      fetch(event ? `${FPL_BASE}/entry/${entryId}/event/${event}/picks/` : `${FPL_BASE}/entry/${entryId}/picks/`, { headers: DEFAULT_HEADERS }),
      fetch(`${FPL_BASE}/fixtures/`, { headers: DEFAULT_HEADERS }),
      fetch(`${FPL_BASE}/entry/${entryId}/`, { headers: DEFAULT_HEADERS }) // attempt to get bank/info
    ]);
    const bootstrap = await bootstrapRes.json();
    const picks = await picksRes.json();
    const fixtures = await fixturesRes.json();
    const entryInfo = entryRes.ok ? await entryRes.json() : {};
    const result = await computeSuggestions(bootstrap, picks, fixtures, entryInfo, maxSingles, maxPairs);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept posted picks JSON and compute suggestions without fetching picks from FPL
app.post('/api/suggest/json', async (req, res) => {
  try {
    console.log('POST /api/suggest/json received body:', JSON.stringify(req.body).slice(0, 2000));
    const { entryPicks, entryInfo, maxSingles = 8, maxPairs = 3 } = req.body || {};
    if (!entryPicks) {
      console.warn('Missing entryPicks in request body');
      return res.status(400).json({ error: 'entryPicks required in request body' });
    }
    const [bootstrapRes, fixturesRes] = await Promise.all([
      fetch(`${FPL_BASE}/bootstrap-static/`, { headers: DEFAULT_HEADERS }),
      fetch(`${FPL_BASE}/fixtures/`, { headers: DEFAULT_HEADERS })
    ]);
    const bootstrap = await bootstrapRes.json();
    const fixtures = await fixturesRes.json();
    const result = await computeSuggestions(bootstrap, entryPicks, fixtures, entryInfo, maxSingles, maxPairs);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in /api/suggest/json:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
