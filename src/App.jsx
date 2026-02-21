import React, { useState, useEffect } from 'react'
import TeamView from './components/TeamView'
import Suggestions from './components/Suggestions'

export default function App() {
  const [entryId, setEntryId] = useState('9093691')
  const [event, setEvent] = useState('')
  const [teamData, setTeamData] = useState(null)
  const [entryName, setEntryName] = useState('')
  const [suggestionData, setSuggestionData] = useState(null)
  const [error, setError] = useState(null)
  const [showTeam, setShowTeam] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
    const [playerMap, setPlayerMap] = useState({})
    const [teamMap, setTeamMap] = useState({})
    const [fixturesMap, setFixturesMap] = useState({})

  async function loadTeam() {
    setError(null);
    if (!entryId) return setError('Enter your entry ID (numeric)');
    try {
      const backend = getBackendUrl();
      const [pickRes, entryRes] = await Promise.all([
        fetch(`/api/entry/${entryId}/picks/${event || ''}`),
        fetch(`${backend}/api/entry/${entryId}`)
      ]);

      if (!pickRes.ok) {
        const txt = await pickRes.text();
        setTeamData(null);
        return setError(`Request failed: ${pickRes.status} ${pickRes.statusText} — ${txt}`);
      }

      const data = await pickRes.json();
      setTeamData(data);

      if (entryRes.ok) {
        const entryData = await entryRes.json();
        setEntryName(entryData.name || '');
      }

      setShowTeam(true);
      // automatically request suggestions for loaded picks
      try {
        setIsLoading(true);
        const postRes = await fetch(`${backend}/api/suggest/json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryPicks: data }) });
        if (!postRes.ok) {
          const txt = await postRes.text();
          return setError(`Suggestion request failed: ${postRes.status} ${postRes.statusText} — ${txt}`);
        }
        const sug = await postRes.json();
        setSuggestionData(sug);
      } catch (e) {
        setError(`Suggestion fetch error: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    } catch (e) {
      setTeamData(null);
      setError(`Fetch error: ${e.message}`);
    }
  }

  async function getSuggestion() {
    setError(null);
    setIsLoading(true);
    try {
      // If the team was already loaded via Load Team, POST it to the server suggest endpoint
      if (teamData) {
        const body = { entryPicks: teamData };
        const backend = getBackendUrl();
        const res = await fetch(`${backend}/api/suggest/json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) {
          const txt = await res.text();
          return setError(`Request failed: ${res.status} ${res.statusText} — ${txt}`);
        }
        const data = await res.json();
        setSuggestionData(data);
        setIsLoading(false);
        return;
      }
      if (!entryId) return setError('Enter entry ID');
      const q = new URLSearchParams({ entryId, event }).toString();
      const res = await fetch(`/api/suggest?${q}`);
      if (!res.ok) {
        const txt = await res.text();
        return setError(`Request failed: ${res.status} ${res.statusText} — ${txt}`);
      }
      const data = await res.json();
      setSuggestionData(data);
      setIsLoading(false);
    } catch (e) {
      setError(`Fetch error: ${e.message}`);
      setIsLoading(false);
    }
  }

  // no longer auto-request suggestions from pasted JSON

  useEffect(() => {
    // fetch bootstrap to resolve player ids -> names
    async function loadBootstrap() {
      try {
        const backend = getBackendUrl();
        const [bRes, fRes] = await Promise.all([fetch(`${backend}/api/bootstrap`), fetch(`${backend}/api/fixtures`)]);
        if (!bRes.ok) return;
        const data = await bRes.json();
        const fixtures = fRes.ok ? await fRes.json() : [];
        const map = {};
        const tmap = {};
        (data.elements || []).forEach(e => {
          map[e.id] = {
            name: e.web_name,
            team: e.team,
            element_type: e.element_type,
            form: parseFloat(e.form) || 0,
            now_cost: (e.now_cost || 0) / 10,
            xg: parseFloat(e.expected_goals || 0) || 0,
            xa: parseFloat(e.expected_assists || 0) || 0,
            minutes: e.minutes || 0,
            selected_by_percent: parseFloat(e.selected_by_percent || 0) || 0
          };
        });
        (data.teams || []).forEach(t => { tmap[t.id] = t.short_name || t.name });
        // auto-select current event/gameweek if user hasn't set one
        let currentEvent = null;
        try {
          currentEvent = data.current_event || ((data.events || []).find(e => e.is_current) || (data.events || []).find(e => e.is_next) || {}).id;
          if (currentEvent && !event) setEvent(String(currentEvent));
        } catch (e) { }
        // build fixturesMap: teamId -> [shortNameOpponent,...] for next 4 upcoming fixtures
        const allUpcoming = (fixtures || []).filter(f => !f.finished).sort((a,b)=> (a.event||0)-(b.event||0));
        const fm = {};
        allUpcoming.forEach(fx => {
          const h = fx.team_h, a = fx.team_a;
          fm[h] = fm[h] || [];
          fm[a] = fm[a] || [];
          const aName = tmap[a] || `Team ${a}`;
          const hName = tmap[h] || `Team ${h}`;
          // from the perspective of team_h it's a home fixture (H), team_a it's away (A)
          fm[h].push({ opponent: aName, difficulty: fx.team_h_difficulty, ha: 'H', event: fx.event });
          fm[a].push({ opponent: hName, difficulty: fx.team_a_difficulty, ha: 'A', event: fx.event });
        });
        // trim to next 4
        Object.keys(fm).forEach(k => { fm[k] = fm[k].slice(0,4); });
        setPlayerMap(map);
        setTeamMap(tmap);
        setFixturesMap(fm);
        // Store currentEvent in state for DGW detection
        if (currentEvent) {
          localStorage.setItem('currentEvent', currentEvent);
        }
      } catch (e) {
        // ignore
      }
    }
    loadBootstrap();
  }, [])

  const getBackendUrl = () => {
    // Use env variable if set (for production)
    if (import.meta.env.VITE_API_BASE) {
      return import.meta.env.VITE_API_BASE;
    }
    // Default to localhost for dev
    return `http://${window.location.hostname}:4000`;
  };

  return (
    <div className="app">
      <header>
        <h1>FPL Agent</h1>
        <p>Enter your FPL entry ID to load your team and get transfer suggestions.</p>
      </header>

      <div className="controls">
        <input placeholder="Entry ID (numeric)" value={entryId} onChange={e=>setEntryId(e.target.value)} />
        <input placeholder="Event/GW (optional)" value={event} onChange={e=>setEvent(e.target.value)} />
        <button onClick={getSuggestion}>Get Suggestions</button>
        <button onClick={async ()=>{
          if (!teamData) {
            await loadTeam();
            return;
          }
          setShowTeam(s => !s);
        }}>{showTeam ? 'Hide Team' : 'Show Team'}</button>
        <button onClick={() => { setTeamData(null); setSuggestionData(null); setError(null); setShowTeam(false); }}>Clear</button>
      </div>


      {error && <div className="error">Error: {error}</div>}
      {teamData && showTeam && <TeamView data={teamData} entryName={entryName} playerMap={playerMap} teamMap={teamMap} fixturesMap={fixturesMap} suggestionData={suggestionData} />}

      {suggestionData && <Suggestions data={suggestionData} playerMap={playerMap} teamMap={teamMap} fixturesMap={fixturesMap} isLoading={isLoading} />}
    </div>
  )
}
