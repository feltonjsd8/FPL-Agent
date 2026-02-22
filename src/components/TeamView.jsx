import React, { useState } from 'react'

const POS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const positionClasses = { 1: 'gk', 2: 'def', 3: 'mid', 4: 'fwd' };

export default function TeamView({ data, entryName = '', playerMap = {}, teamMap = {}, fixturesMap = {}, suggestionData = null }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const picks = (data && (data.picks || data.results)) || [];
  // starters have multiplier>0
  const starters = picks.filter(p => p.multiplier && p.multiplier > 0);
  const bench = picks.filter(p => !p.multiplier || p.multiplier === 0);

  // Debug: log first pick to see what fields are available
  if (picks.length > 0 && !window.__fplDebugLogged) {
    console.log('First pick object:', picks[0]);
    window.__fplDebugLogged = true;
  }

  const getPlayerSuggestions = (playerId) => {
    if (!suggestionData || !suggestionData.topSingles) return [];
    return suggestionData.topSingles.filter(s => s.out.id === playerId);
  };

  const hasSubstitutions = (playerId) => {
    return getPlayerSuggestions(playerId).length > 0;
  };

  const groupByType = (arr) => {
    const out = { 1: [], 2: [], 3: [], 4: [] };
    arr.forEach(p => { out[p.element_type] = out[p.element_type] || []; out[p.element_type].push(p); });
    // sort by position (the position index in squad)
    Object.keys(out).forEach(k => out[k].sort((a,b)=> (a.position||0)-(b.position||0)));
    return out;
  }

  function computeExpected(pm, fx) {
    // Calculate projected xG/xA for next 4 fixtures
    const gamesPlayed = pm.minutes ? Math.max(1, Math.round(pm.minutes / 90)) : 1;
    const avgXGPerGame = (pm.xg || 0) / gamesPlayed;
    const avgXAPerGame = (pm.xa || 0) / gamesPlayed;

    // Adjust for fixture difficulty
    let difficultyMultiplier = 1;
    if (fx && fx.length) {
      const fixtureAvg = fx.reduce((s, f) => s + (f.difficulty || 2.5), 0) / fx.length;
      difficultyMultiplier = 1 / (1 + fixtureAvg);
    }

    // Project xG/xA for next 4 fixtures
    const projectedXG = avgXGPerGame * Math.min(fx.length, 4) * difficultyMultiplier;
    const projectedXA = avgXAPerGame * Math.min(fx.length, 4) * difficultyMultiplier;
    const expected_points = projectedXG + projectedXA;

    const fixtureScore = fx && fx.length ? 1 / (1 + (fx.reduce((s, f) => s + (f.difficulty || 2.5), 0) / fx.length)) : 1 / 3.5;
    const minutesBoost = (pm && (pm.minutes || 0)) > 0 ? 0.5 : 0;
    const form = (pm && pm.form) || 0;
    // Form weight 1.5: balanced to credit hot players while emphasizing fixtures and xG/xA
    const score = form * 1.5 + expected_points * 1.9 + fixtureScore * 7.0 + minutesBoost;
    return { expected_points, score };
  }

  const renderPlayerRow = (p) => {
    const [showAlternatives, setShowAlternatives] = useState(null); // null = show none, number = index to show
    const pm = playerMap[p.element] || {};
    const tId = pm.team;
    const fx = tId ? (fixturesMap[tId] || []) : [];
    const exp = computeExpected(pm, fx);
    const hasSuggestions = hasSubstitutions(p.element);
    const isSelected = selectedPlayerId === p.element;
    const suggestions = isSelected ? getPlayerSuggestions(p.element) : [];

    // Check for double gameweek (2+ fixtures in current gameweek only)
    const currentEvent = localStorage.getItem('currentEvent');
    const currentGWFixtures = currentEvent ? (fx || []).filter(f => f.event === parseInt(currentEvent)) : [];
    const hasDGW = currentGWFixtures && currentGWFixtures.length >= 2;

    // Get gameweek score if available
    // Check multiple possible field names from FPL API
    const gwScore = (p.points !== undefined && p.points !== null) ? p.points :
                    (p.event_points !== undefined && p.event_points !== null) ? p.event_points : null;

    const formatFixture = (f) => {
      return f.ha === 'H' ? f.opponent.toUpperCase() : f.opponent.toLowerCase();
    };

    return (
      <div key={p.element}>
        <div
          className={`team-row ${positionClasses[p.element_type]} ${hasSuggestions ? 'has-suggestions' : ''} ${isSelected ? 'selected' : ''} ${hasDGW ? 'dgw' : ''}`}
          data-position={positionClasses[p.element_type]}
          onClick={() => setSelectedPlayerId(isSelected ? null : p.element)}
          style={{ cursor: hasSuggestions ? 'pointer' : 'default' }}
        >
          <div className="id">
            {pm.name || `#${p.element}`}
            <span className={`position-badge ${positionClasses[p.element_type]}`}>{POS[p.element_type]}</span>
            {p.is_captain ? ' (C)' : p.is_vice_captain ? ' (V)' : ''}
            {hasSuggestions && <span className="suggestion-marker">→</span>}
            {hasDGW && <span className="dgw-badge">DGW</span>}
          </div>
          <div className="muted">{tId ? (teamMap[tId] || `Team #${tId}`) : ''}</div>
          {fx && fx.length ? <div className="fixtures">{fx.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{formatFixture(f)}</span>)}</div> : null}
          <div className="muted">{gwScore !== null ? `GW: ${gwScore}` : `Expected: ${isNaN(exp.score) ? '-' : exp.score.toFixed(2)}`}</div>
        </div>
        {suggestions.length > 0 && (
          <div className="inline-suggestions">
            {suggestions.map((s, i) => {
              const inTeamId = s.in.team || (playerMap[s.in.id] && playerMap[s.in.id].team);
              const inFixtures = inTeamId ? (fixturesMap[inTeamId] || []) : [];
              return (
                <div key={i}>
                  <div className="suggestion-item card">
                    <div className="row">
                      <div className="col">
                        <div className="label">Out</div>
                        <div className="player">{s.out.name} <span className="muted">({POS[s.out.pos]})</span></div>
                        <div className="muted">{s.out.cost}m</div>
                        {fx && fx.length ? <div className="fixtures">{fx.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{formatFixture(f)}</span>)}</div> : null}
                      </div>
                      <div className="col">
                        <div className="label">In</div>
                        <div className="player">{s.in.name} <span className="muted">({POS[s.in.pos]})</span></div>
                        <div className="muted">{s.in.cost}m — expected {s.in.expected_score?.toFixed(2) || '?'}</div>
                        {inFixtures && inFixtures.length ? <div className="fixtures">{inFixtures.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{formatFixture(f)}</span>)}</div> : null}
                      </div>
                      <div className="col gain">+{s.gain?.toFixed(2) || '?'}</div>
                    </div>
                  </div>
                  {s.alternatives && s.alternatives.length > 0 && (
                    <div className="alternatives-inline">
                      <button
                        className="alternatives-toggle-inline"
                        onClick={() => setShowAlternatives(showAlternatives === i ? null : i)}
                      >
                        {showAlternatives === i ? '▼' : '▶'} {s.alternatives.length} alternative{s.alternatives.length !== 1 ? 's' : ''}
                      </button>
                      {showAlternatives === i && (
                        <div className="alternatives-list-inline">
                          {s.alternatives.map((alt, j) => {
                            const altTeamId = playerMap[alt.id] && playerMap[alt.id].team;
                            const altTeam = altTeamId ? (teamMap[altTeamId] || `Team #${altTeamId}`) : '';
                            const altFixtures = altTeamId ? (fixturesMap[altTeamId] || []) : [];
                            return (
                              <div key={j} className="alternative-item-inline">
                                <div className="alt-main">
                                  <div className="alt-name">{alt.name} <span className="muted">({altTeam || `Team #${altTeamId}`})</span> <span className="muted">({POS[alt.pos]})</span></div>
                                  <div className="alt-stats">
                                    <span>{alt.cost}m</span>
                                    <span>expected {alt.expected_score.toFixed(2)}</span>
                                    <span className="alt-gain-inline">+{alt.gain.toFixed(2)}</span>
                                  </div>
                                </div>
                                {altFixtures && altFixtures.length ? <div className="fixtures">{altFixtures.map((f,k)=> <span key={k} className={`fixture-badge diff-${f.difficulty}`}>{formatFixture(f)}</span>)}</div> : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const grouped = groupByType(starters);
  const defCount = (grouped[2] || []).length;
  const midCount = (grouped[3] || []).length;
  const fwdCount = (grouped[4] || []).length;
  const formation = `${defCount}-${midCount}-${fwdCount}`;

  return (
    <section className="teamview">
      <div className="formation-header">
        <div className="team-title">{entryName || 'Team'}</div>
        <div className="formation-display">Formation: {formation}</div>
      </div>

      <div className="formation-grid">
        {/* Goalkeeper */}
        <div className="formation-row goalkeeper-row">
          <div className="players-container">
            {(grouped[1] || []).map((p) => renderPlayerRow(p))}
          </div>
        </div>

        {/* Defenders */}
        <div className="formation-row defenders-row">
          <div className="players-container">
            {(grouped[2] || []).map((p) => renderPlayerRow(p))}
          </div>
        </div>

        {/* Midfielders */}
        <div className="formation-row midfielders-row">
          <div className="players-container">
            {(grouped[3] || []).map((p) => renderPlayerRow(p))}
          </div>
        </div>

        {/* Forwards */}
        <div className="formation-row forwards-row">
          <div className="players-container">
            {(grouped[4] || []).map((p) => renderPlayerRow(p))}
          </div>
        </div>
      </div>

      <div className="bench-section">
        <h3>Bench</h3>
        <div className="bench-players">
          {bench.map((p) => renderPlayerRow(p))}
        </div>
      </div>
    </section>
  )
}
