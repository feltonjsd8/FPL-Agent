import React, { useState } from 'react'

const POS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

const formatFixture = (f) => {
  return f.ha === 'H' ? f.opponent.toUpperCase() : f.opponent.toLowerCase();
};

function Single({ s, playerMap = {}, teamMap = {}, fixturesMap = {} }) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const outTeamId = s.out.team || (playerMap[s.out.id] && playerMap[s.out.id].team);
  const inTeamId = s.in.team || (playerMap[s.in.id] && playerMap[s.in.id].team);
  const outTeam = outTeamId ? (teamMap[outTeamId] || `Team #${outTeamId}`) : '';
  const inTeam = inTeamId ? (teamMap[inTeamId] || `Team #${inTeamId}`) : '';
  const outFixtures = outTeamId ? (fixturesMap[outTeamId] || []) : [];
  const inFixtures = inTeamId ? (fixturesMap[inTeamId] || []) : [];
  const outNextHA = outFixtures && outFixtures.length ? outFixtures[0].ha : '';
  const inNextHA = inFixtures && inFixtures.length ? inFixtures[0].ha : '';
  return (
    <div className="single card">
      <div className="row">
        <div className="col">
          <div className="label">Out</div>
          <div className="player">{s.out.name} {outTeam ? <span className="muted">({outTeam}{outNextHA ? ` ${outNextHA}` : ''})</span> : null} <span className="muted">({POS[s.out.pos]})</span></div>
          <div className="muted">{s.out.cost}m</div>
          {outFixtures && outFixtures.length ? <div className="fixtures">{outFixtures.map((f, j) => <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{formatFixture(f)}</span>)}</div> : null}
        </div>
        <div className="col">
          <div className="label">In</div>
          <div className="player">{s.in.name} {inTeam ? <span className="muted">({inTeam}{inNextHA ? ` ${inNextHA}` : ''})</span> : null} <span className="muted">({POS[s.in.pos]})</span></div>
          <div className="muted">{s.in.cost}m — expected {s.in.expected_score.toFixed(2)}</div>
          {inFixtures && inFixtures.length ? <div className="fixtures">{inFixtures.map((f, j) => <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{formatFixture(f)}</span>)}</div> : null}
        </div>
        <div className="col gain">+{s.gain.toFixed(2)}</div>
      </div>
      {s.alternatives && s.alternatives.length > 0 && (
        <div className="alternatives-section">
          <button
            className="alternatives-toggle"
            onClick={() => setShowAlternatives(!showAlternatives)}
          >
            {showAlternatives ? '▼' : '▶'} {s.alternatives.length} alternative{s.alternatives.length !== 1 ? 's' : ''}
          </button>
          {showAlternatives && (
            <div className="alternatives-list">
              {s.alternatives.map((alt, i) => {
                const altTeamId = playerMap[alt.id] && playerMap[alt.id].team;
                const altTeam = altTeamId ? (teamMap[altTeamId] || `Team #${altTeamId}`) : '';
                const altFixtures = altTeamId ? (fixturesMap[altTeamId] || []) : [];
                const altNextHA = altFixtures && altFixtures.length ? altFixtures[0].ha : '';
                return (
                  <div key={i} className="alternative-item">
                    <div className="alt-name">{alt.name} {altTeam ? <span className="muted">({altTeam}{altNextHA ? ` ${altNextHA}` : ''})</span> : null} <span className="muted">({POS[alt.pos]})</span></div>
                    <div className="alt-meta">
                      <span className="alt-cost">{alt.cost}m</span>
                      <span className="alt-expected">expected {alt.expected_score.toFixed(2)}</span>
                      <span className="alt-gain">+{alt.gain.toFixed(2)}</span>
                    </div>
                    {altFixtures && altFixtures.length ? <div className="fixtures">{altFixtures.map((f, j) => <span key={j} className={`fixture-badge diff-${f.difficulty}`}>{formatFixture(f)}</span>)}</div> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Pair({ p, playerMap = {}, teamMap = {}, fixturesMap = {} }) {
  const fmt = (obj) => {
    const outName = obj.out.name;
    const inName = obj.in.name;
    const outTeamId = obj.out.team || (playerMap[obj.out.id] && playerMap[obj.out.id].team);
    const inTeamId = obj.in.team || (playerMap[obj.in.id] && playerMap[obj.in.id].team);
    const outTeam = outTeamId ? (teamMap[outTeamId] || `Team #${outTeamId}`) : '';
    const inTeam = inTeamId ? (teamMap[inTeamId] || `Team #${inTeamId}`) : '';
    const outFixtures = outTeamId ? (fixturesMap[outTeamId] || []) : [];
    const inFixtures = inTeamId ? (fixturesMap[inTeamId] || []) : [];
    return {
      text: `${outName}${outTeam ? ` (${outTeam})` : ''} → ${inName}${inTeam ? ` (${inTeam})` : ''} (${POS[obj.in.pos]})`,
      outFixtures, inFixtures
    };
  }
  return (
    <div className="pair card">
      <h4>Total gain: <span className="gain">{p.total_gain.toFixed(2)}</span></h4>
      <div className="pair-grid">
        <div>
          <div className="label">First</div>
          {(() => { const f = fmt(p.first); return <div><div className="muted">{f.text}</div>{f.outFixtures && f.outFixtures.length ? <div className="fixtures">{f.outFixtures.map((x,i)=> <span key={i} className={`fixture-badge diff-${x.difficulty}`}>{formatFixture(x)}</span>)}</div> : null}{f.inFixtures && f.inFixtures.length ? <div className="fixtures">{f.inFixtures.map((x,i)=> <span key={i} className={`fixture-badge diff-${x.difficulty}`}>{formatFixture(x)}</span>)}</div> : null}</div> })()}
        </div>
        <div>
          <div className="label">Second</div>
          {(() => { const f = fmt(p.second); return <div><div className="muted">{f.text}</div>{f.outFixtures && f.outFixtures.length ? <div className="fixtures">{f.outFixtures.map((x,i)=> <span key={i} className={`fixture-badge diff-${x.difficulty}`}>{formatFixture(x)}</span>)}</div> : null}{f.inFixtures && f.inFixtures.length ? <div className="fixtures">{f.inFixtures.map((x,i)=> <span key={i} className={`fixture-badge diff-${x.difficulty}`}>{formatFixture(x)}</span>)}</div> : null}</div> })()}
        </div>
      </div>
    </div>
  )
}

export default function Suggestions({ data, playerMap = {}, teamMap = {}, fixturesMap = {}, isLoading = false }) {
  const { bank, topSingles = [], pairs = [], topCandidates = [] } = data || {};
  return (
    <section className="suggestions">
      <h2>Suggestions</h2>
      <div className="meta"><strong>Bank:</strong> {bank}m {isLoading ? <span className="loading">Loading…</span> : null}</div>

      <div className="singles">
        <h3>Top Single Transfers</h3>
        {topSingles.length ? topSingles.map((s, i) => {
          // fill missing names from playerMap (playerMap entries are {name,team})
          if (!s.out.name) {
            const p = playerMap[s.out.id];
            s.out.name = p ? p.name : `#${s.out.id}`;
            s.out.team = p ? p.team : undefined;
          }
          if (!s.in.name) {
            const p = playerMap[s.in.id];
            s.in.name = p ? p.name : `#${s.in.id}`;
            s.in.team = p ? p.team : undefined;
          }
          return <Single key={i} s={s} playerMap={playerMap} teamMap={teamMap} fixturesMap={fixturesMap} />
        }) : <div className="muted">No single-transfer suggestions</div>}
      </div>

      <div className="pairs">
        <h3>Two-Transfer Pairs</h3>
        {pairs.length ? pairs.map((p, i) => {
          const fill = (obj) => {
            if (obj && obj.out && !obj.out.name) {
              const po = playerMap[obj.out.id];
              obj.out.name = po ? po.name : `#${obj.out.id}`;
              obj.out.team = po ? po.team : undefined;
            }
            if (obj && obj.in && !obj.in.name) {
              const pi = playerMap[obj.in.id];
              obj.in.name = pi ? pi.name : `#${obj.in.id}`;
              obj.in.team = pi ? pi.team : undefined;
            }
          }
          fill(p.first); fill(p.second);
          return <Pair key={i} p={p} playerMap={playerMap} teamMap={teamMap} fixturesMap={fixturesMap} />
        }) : <div className="muted">No pairs available</div>}
      </div>

      <div className="candidates">
        <h3>Top Candidates</h3>
        <ul>
          {topCandidates.slice(0,10).map(c => {
            const teamId = (playerMap[c.id] && playerMap[c.id].team) || c.team;
            const fixtures = teamId ? (fixturesMap[teamId] || []) : [];
            return (
              <li key={c.id}>{c.web_name || (playerMap[c.id] && playerMap[c.id].name) || `#${c.id}`} — {POS[c.element_type]} — {c.now_cost}m — {teamMap[teamId] ? ` ${teamMap[teamId]}` : ''}{fixtures && fixtures.length ? <> — {fixtures.map((f,i)=> <span key={i} className={`fixture-badge diff-${f.difficulty}`}>{formatFixture(f)}</span>)}</> : ''} — score {c.score.toFixed(2)}</li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
