import React from 'react'

const POS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

export default function TeamView({ data, playerMap = {}, teamMap = {}, fixturesMap = {} }) {
  const picks = (data && (data.picks || data.results)) || [];
  // starters have multiplier>0
  const starters = picks.filter(p => p.multiplier && p.multiplier > 0);
  const bench = picks.filter(p => !p.multiplier || p.multiplier === 0);

  const groupByType = (arr) => {
    const out = { 1: [], 2: [], 3: [], 4: [] };
    arr.forEach(p => { out[p.element_type] = out[p.element_type] || []; out[p.element_type].push(p); });
    // sort by position (the position index in squad)
    Object.keys(out).forEach(k => out[k].sort((a,b)=> (a.position||0)-(b.position||0)));
    return out;
  }

  function computeExpected(pm, fx) {
    const expected_points = (pm && ((pm.xg || 0) + (pm.xa || 0))) || 0;
    const fixtureAvg = (fx && fx.length) ? fx.reduce((s, f) => s + (f.difficulty || 2.5), 0) / fx.length : 2.5;
    const fixtureScore = 1 / (1 + fixtureAvg);
    const minutesBoost = (pm && (pm.minutes || 0)) > 0 ? 0.5 : 0;
    const popularity = (pm && (pm.selected_by_percent || 0)) / 100 || 0;
    const form = (pm && pm.form) || 0;
    const now_cost = (pm && pm.now_cost) || 0;
    const score = form * 2.2 + expected_points * 1.9 + fixtureScore * 3.2 + minutesBoost + popularity * 0.8 - (now_cost / 25);
    return { expected_points, score };
  }

  const grouped = groupByType(starters);
  const defCount = (grouped[2] || []).length;
  const midCount = (grouped[3] || []).length;
  const fwdCount = (grouped[4] || []).length;
  const formation = `${defCount}-${midCount}-${fwdCount}`;

  return (
    <section className="teamview">
      <h2>Your Team</h2>
      <div className="formation"><strong>Formation:</strong> {formation}</div>

      <div className="starting">
        <div className="position-block">
          <h4>Goalkeeper</h4>
          {(grouped[1] || []).map((p, i) => {
            const pm = playerMap[p.element] || {};
            const tId = pm.team;
            const fx = tId ? (fixturesMap[tId] || []) : [];
            const exp = computeExpected(pm, fx);
            return (
            <div key={i} className="team-row">
              <div className="id">{pm.name || `#${p.element}`} {p.is_captain ? ' (C)' : p.is_vice_captain ? ' (V)' : ''}</div>
              <div className="muted">{tId ? (teamMap[tId] || `Team #${tId}`) : ''}</div>
              {fx && fx.length ? <div className="fixtures">{fx.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{f.opponent} ({f.ha})</span>)}</div> : null}
              <div className="muted">Expected: {isNaN(exp.score) ? '-' : exp.score.toFixed(2)}</div>
            </div>
          )})}
        </div>

        <div className="position-block">
          <h4>Defenders</h4>
          {(grouped[2] || []).map((p, i) => {
            const pm = playerMap[p.element] || {};
            const tId = pm.team;
            const fx = tId ? (fixturesMap[tId] || []) : [];
            const exp = computeExpected(pm, fx);
            return (
            <div key={i} className="team-row">
              <div className="id">{pm.name || `#${p.element}`} {p.is_captain ? ' (C)' : p.is_vice_captain ? ' (V)' : ''}</div>
              <div className="muted">{tId ? (teamMap[tId] || `Team #${tId}`) : ''}</div>
              {fx && fx.length ? <div className="fixtures">{fx.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{f.opponent} ({f.ha})</span>)}</div> : null}
              <div className="muted">Expected: {isNaN(exp.score) ? '-' : exp.score.toFixed(2)}</div>
            </div>
          )})}
        </div>

        <div className="position-block">
          <h4>Midfielders</h4>
          {(grouped[3] || []).map((p, i) => {
            const pm = playerMap[p.element] || {};
            const tId = pm.team;
            const fx = tId ? (fixturesMap[tId] || []) : [];
            const exp = computeExpected(pm, fx);
            return (
            <div key={i} className="team-row">
              <div className="id">{pm.name || `#${p.element}`} {p.is_captain ? ' (C)' : p.is_vice_captain ? ' (V)' : ''}</div>
              <div className="muted">{tId ? (teamMap[tId] || `Team #${tId}`) : ''}</div>
              {fx && fx.length ? <div className="fixtures">{fx.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{f.opponent} ({f.ha})</span>)}</div> : null}
              <div className="muted">Expected: {isNaN(exp.score) ? '-' : exp.score.toFixed(2)}</div>
            </div>
          )})}
        </div>

        <div className="position-block">
          <h4>Forwards</h4>
          {(grouped[4] || []).map((p, i) => {
            const pm = playerMap[p.element] || {};
            const tId = pm.team;
            const fx = tId ? (fixturesMap[tId] || []) : [];
            const exp = computeExpected(pm, fx);
            return (
            <div key={i} className="team-row">
              <div className="id">{pm.name || `#${p.element}`} {p.is_captain ? ' (C)' : p.is_vice_captain ? ' (V)' : ''}</div>
              <div className="muted">{tId ? (teamMap[tId] || `Team #${tId}`) : ''}</div>
              {fx && fx.length ? <div className="fixtures">{fx.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{f.opponent} ({f.ha})</span>)}</div> : null}
              <div className="muted">Expected: {isNaN(exp.score) ? '-' : exp.score.toFixed(2)}</div>
            </div>
          )})}
        </div>
      </div>

      <div className="bench">
        <h4>Bench</h4>
        {bench.map((p, idx) => {
          const pm = playerMap[p.element] || {};
          const tId = pm.team;
          const fx = tId ? (fixturesMap[tId] || []) : [];
          const exp = computeExpected(pm, fx);
          return (
          <div key={idx} className="team-row">
            <div className="id">{pm.name || `#${p.element}`} {p.is_captain ? ' (C)' : p.is_vice_captain ? ' (V)' : ''}</div>
            <div className="muted">{tId ? (teamMap[tId] || `Team #${tId}`) : ''}</div>
            {fx && fx.length ? <div className="fixtures">{fx.map((f,j)=> <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{f.opponent} ({f.ha})</span>)}</div> : null}
            <div className="muted">Expected: {isNaN(exp.score) ? '-' : exp.score.toFixed(2)}</div>
          </div>
        )})}
      </div>
    </section>
  )
}
