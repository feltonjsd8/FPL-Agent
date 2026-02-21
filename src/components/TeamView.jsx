import React, { useState } from 'react'

const POS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

export default function TeamView({ data, playerMap = {}, teamMap = {}, fixturesMap = {}, suggestionData = null }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const picks = (data && (data.picks || data.results)) || [];
  // starters have multiplier>0
  const starters = picks.filter(p => p.multiplier && p.multiplier > 0);
  const bench = picks.filter(p => !p.multiplier || p.multiplier === 0);

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
    const pm = playerMap[p.element] || {};
    const tId = pm.team;
    const fx = tId ? (fixturesMap[tId] || []) : [];
    const exp = computeExpected(pm, fx);
    const hasSuggestions = hasSubstitutions(p.element);
    const isSelected = selectedPlayerId === p.element;
    const suggestions = isSelected ? getPlayerSuggestions(p.element) : [];

    return (
      <div key={p.element}>
        <div
          className={`team-row ${hasSuggestions ? 'has-suggestions' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => setSelectedPlayerId(isSelected ? null : p.element)}
          style={{ cursor: hasSuggestions ? 'pointer' : 'default' }}
        >
          <div className="id">
            {pm.name || `#${p.element}`}
            {p.is_captain ? ' (C)' : p.is_vice_captain ? ' (V)' : ''}
            {hasSuggestions && <span className="suggestion-marker">→</span>}
          </div>
          <div className="muted">{tId ? (teamMap[tId] || `Team #${tId}`) : ''}</div>
          {fx && fx.length ? <div className="fixtures">{fx.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{f.opponent} ({f.ha})</span>)}</div> : null}
          <div className="muted">Expected: {isNaN(exp.score) ? '-' : exp.score.toFixed(2)}</div>
        </div>
        {suggestions.length > 0 && (
          <div className="inline-suggestions">
            {suggestions.map((s, i) => {
              const inTeamId = s.in.team || (playerMap[s.in.id] && playerMap[s.in.id].team);
              const inFixtures = inTeamId ? (fixturesMap[inTeamId] || []) : [];
              return (
                <div key={i} className="suggestion-item card">
                  <div className="row">
                    <div className="col">
                      <div className="label">Out</div>
                      <div className="player">{s.out.name} <span className="muted">({POS[s.out.pos]})</span></div>
                      <div className="muted">{s.out.cost}m</div>
                      {fx && fx.length ? <div className="fixtures">{fx.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{f.opponent} ({f.ha})</span>)}</div> : null}
                    </div>
                    <div className="col">
                      <div className="label">In</div>
                      <div className="player">{s.in.name} <span className="muted">({POS[s.in.pos]})</span></div>
                      <div className="muted">{s.in.cost}m — expected {s.in.expected_score?.toFixed(2) || '?'}</div>
                      {inFixtures && inFixtures.length ? <div className="fixtures">{inFixtures.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{f.opponent} ({f.ha})</span>)}</div> : null}
                    </div>
                    <div className="col gain">+{s.gain?.toFixed(2) || '?'}</div>
                  </div>
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
      <h2>Formation: {formation}</h2>

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
