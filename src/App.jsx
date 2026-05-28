import React, { useState } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [picksData, setPicksData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPick, setSelectedPick] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'https://atlas-betting-production.up.railway.app';

  // Fetch picks data
  const fetchPicks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/picks-v5high`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setPicksData(data);
        setActiveTab('schedina');
        setSelectedPick(null);
      } else {
        alert('Nessun pick disponibile');
      }
    } catch (err) {
      console.error('Error fetching picks:', err);
      alert('Errore nel caricamento dei pick');
    }
    setLoading(false);
  };

  // Analyze data
  const analyzePicksData = () => {
    if (!picksData || !Array.isArray(picksData)) return null;

    const consigliatissimo = picksData.filter(p => p.in_schedina === true);
    const varianti = picksData.filter(p => p.in_schedina === false);

    // Group varianti by schedina
    const varianti_grouped = {};
    varianti.forEach(p => {
      if (p.schedina) {
        if (!varianti_grouped[p.schedina]) {
          varianti_grouped[p.schedina] = [];
        }
        varianti_grouped[p.schedina].push(p);
      }
    });

    return {
      consigliatissimo,
      varianti_grouped,
      allPicks: picksData
    };
  };

  const analysis = analyzePicksData();

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const month = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'][date.getMonth()];
    return `${day} ${month}`;
  };

  // Format pick label
  const formatPickLabel = (pick) => {
    const marketLabel = pick.market === 'OU35' ? (pick.pick === 'U3.5' ? 'Under 3.5' : 'Over 3.5') :
                       pick.market === 'OU15' ? (pick.pick === 'O1.5' ? 'Over 1.5' : 'Under 1.5') :
                       pick.market === 'G1T' ? 'Goal in 1T' :
                       pick.market === 'BTTS' ? 'BTTS' :
                       pick.market === 'DC' ? pick.pick : pick.market;
    return marketLabel;
  };

  // Get news links
  const getNewsLinks = (team) => {
    const encodedTeam = encodeURIComponent(team);
    return {
      gazzetta: `https://www.gazzetta.it/calcio/ricerca?q=${encodedTeam}`,
      sky: `https://sport.sky.it/calcio/ricerca?q=${encodedTeam}`,
      espn: `https://www.espn.com/soccer/search?query=${encodedTeam}`,
      tm: `https://www.transfermarkt.com/search/ergebnis/search?query=${encodedTeam}`
    };
  };

  // Result badge
  const getResultBadge = (pick) => {
    if (!pick.result) return null;
    const { won, profit } = pick.result;
    return {
      text: won ? '✅ VINTO' : '❌ PERSO',
      color: won ? '#4ade80' : '#ff6b6b',
      profit: `${profit > 0 ? '+' : ''}€${profit.toFixed(2)}`
    };
  };

  return (
    <div className="app">
      <header className="header">
        <h1>⚽ ATLAS Betting</h1>
        <p>Sistema di analisi calcistica avanzato</p>
      </header>

      {/* HOMEPAGE */}
      {activeTab === 'home' && !picksData && (
        <main className="content">
          <section className="section">
            <h2 style={{color: '#00d4ff', marginBottom: '30px'}}>🎯 Scegli l'orizzonte temporale</h2>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px'}}>
              <button
                onClick={fetchPicks}
                style={{
                  padding: '30px 20px',
                  backgroundColor: '#1a2332',
                  border: '2px solid #00d4ff',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                📅 Oggi (d0)
                <p style={{color: '#aaa', fontSize: '12px', margin: '10px 0 0 0'}}>Solo le partite di oggi</p>
              </button>

              <button
                onClick={fetchPicks}
                style={{
                  padding: '30px 20px',
                  backgroundColor: '#1a2332',
                  border: '2px solid #00d4ff',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                📅 Oggi + Domani (d1)
                <p style={{color: '#aaa', fontSize: '12px', margin: '10px 0 0 0'}}>Le migliori su 2 giorni</p>
              </button>

              <button
                onClick={fetchPicks}
                style={{
                  padding: '30px 20px',
                  backgroundColor: '#1a2332',
                  border: '2px solid #00d4ff',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                📅 Oggi + 2 Giorni (d2)
                <p style={{color: '#aaa', fontSize: '12px', margin: '10px 0 0 0'}}>Le migliori su 3 giorni</p>
              </button>

              <button
                onClick={fetchPicks}
                style={{
                  padding: '30px 20px',
                  backgroundColor: '#1a2332',
                  border: '2px solid #00d4ff',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                📅 Oggi + 3 Giorni (d3)
                <p style={{color: '#aaa', fontSize: '12px', margin: '10px 0 0 0'}}>Le migliori su 4 giorni</p>
              </button>
            </div>

            {loading && <p style={{color: '#aaa'}}>⏳ Caricamento...</p>}
          </section>
        </main>
      )}

      {/* TAB NAVIGATION */}
      {picksData && (
        <>
          <nav className="nav-tabs">
            <button 
              className={`tab ${activeTab === 'schedina' ? 'active' : ''}`}
              onClick={() => { setActiveTab('schedina'); setSelectedPick(null); }}
            >
              🎯 Schedina
            </button>
            <button 
              className={`tab ${activeTab === 'dettagli' ? 'active' : ''}`}
              onClick={() => setActiveTab('dettagli')}
              disabled={!selectedPick}
              style={{opacity: selectedPick ? 1 : 0.5, cursor: selectedPick ? 'pointer' : 'not-allowed'}}
            >
              🔍 Dettagli
            </button>
            <button 
              className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              📊 Stats
            </button>
            <button 
              className={`tab ${activeTab === 'storico' ? 'active' : ''}`}
              onClick={() => setActiveTab('storico')}
            >
              📜 Storico
            </button>
            <button 
              className={`tab`}
              onClick={() => { setActiveTab('home'); setPicksData(null); setSelectedPick(null); }}
              style={{marginLeft: 'auto'}}
            >
              ← Indietro
            </button>
          </nav>

          <main className="content">
            {/* TAB SCHEDINA */}
            {activeTab === 'schedina' && analysis && (
              <section className="section">
                <div style={{marginBottom: '30px', padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #00d4ff'}}>
                  <h2 style={{color: '#00d4ff', marginTop: 0}}>🎯 CONSIGLIATISSIMO</h2>
                  
                  <div style={{backgroundColor: '#2a3f4f', padding: '15px', borderRadius: '6px'}}>
                    {analysis.consigliatissimo.length > 0 ? (
                      analysis.consigliatissimo.map((pick, idx) => (
                        <div
                          key={idx}
                          onClick={() => { setSelectedPick(pick); setActiveTab('dettagli'); }}
                          style={{
                            padding: '12px',
                            marginBottom: '10px',
                            backgroundColor: '#0a1420',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            borderLeft: '3px solid #4ade80',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a2332'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a1420'}
                        >
                          <p style={{color: '#fff', fontWeight: 'bold', margin: '0 0 5px 0'}}>
                            {pick.home} vs {pick.away} | {formatPickLabel(pick)} @ {pick.odds}
                          </p>
                          <p style={{color: '#aaa', fontSize: '12px', margin: 0}}>
                            {pick.league} | {formatDate(pick.date)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p style={{color: '#aaa'}}>Nessuna partita nel Consigliatissimo</p>
                    )}
                  </div>
                </div>

                {/* VARIANTI */}
                {Object.keys(analysis.varianti_grouped).length > 0 && (
                  <div style={{padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px'}}>
                    <h3 style={{color: '#4ade80', marginTop: 0}}>⚙️ Se preferisci alternative: scegli una delle varianti qui sotto</h3>
                    
                    {Object.entries(analysis.varianti_grouped).map(([schedina_name, varianti_list], group_idx) => (
                      <div key={group_idx} style={{marginBottom: '20px', padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px'}}>
                        <h4 style={{color: '#facc15', marginTop: 0, marginBottom: '12px'}}>
                          Variante {group_idx + 1}
                        </h4>
                        {varianti_list.map((pick, idx) => (
                          <div
                            key={idx}
                            onClick={() => { setSelectedPick(pick); setActiveTab('dettagli'); }}
                            style={{
                              padding: '10px',
                              marginBottom: '8px',
                              backgroundColor: '#0a1420',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              borderLeft: '3px solid #facc15',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a2332'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a1420'}
                          >
                            <p style={{color: '#fff', fontWeight: 'bold', margin: '0 0 3px 0', fontSize: '13px'}}>
                              {pick.home} vs {pick.away} | {formatPickLabel(pick)} @ {pick.odds}
                            </p>
                            <p style={{color: '#aaa', fontSize: '11px', margin: 0}}>
                              {pick.league} | {formatDate(pick.date)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TAB DETTAGLI */}
            {activeTab === 'dettagli' && selectedPick && (
              <section className="section">
                <div style={{padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', marginBottom: '20px', border: '2px solid #00d4ff'}}>
                  <h2 style={{color: '#00d4ff', marginTop: 0}}>
                    {selectedPick.home} vs {selectedPick.away}
                  </h2>
                  <p style={{color: '#aaa', margin: '10px 0 0 0'}}>
                    {selectedPick.league} | {formatDate(selectedPick.date)}
                  </p>

                  {/* Pick Info */}
                  <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px', marginTop: '15px', marginBottom: '15px'}}>
                    <h4 style={{color: '#4ade80', marginTop: 0}}>📊 Il Pick</h4>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                      <div>
                        <p style={{color: '#aaa', fontSize: '12px', margin: '0 0 5px 0'}}>Mercato</p>
                        <p style={{color: '#fff', fontWeight: 'bold', margin: 0}}>{formatPickLabel(selectedPick)}</p>
                      </div>
                      <div>
                        <p style={{color: '#aaa', fontSize: '12px', margin: '0 0 5px 0'}}>Quota</p>
                        <p style={{color: '#4ade80', fontWeight: 'bold', margin: 0}}>@ {selectedPick.odds}</p>
                      </div>
                      <div>
                        <p style={{color: '#aaa', fontSize: '12px', margin: '0 0 5px 0'}}>Probabilità</p>
                        <p style={{color: '#00d4ff', fontWeight: 'bold', margin: 0}}>{selectedPick.prob}%</p>
                      </div>
                      <div>
                        <p style={{color: '#aaa', fontSize: '12px', margin: '0 0 5px 0'}}>Valore</p>
                        <p style={{color: '#facc15', fontWeight: 'bold', margin: 0}}>{selectedPick.value}</p>
                      </div>
                    </div>
                  </div>

                  {/* Segnali */}
                  <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px', marginBottom: '15px'}}>
                    <h4 style={{color: '#4ade80', marginTop: 0}}>⚡ Segnali</h4>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px'}}>
                      <div style={{backgroundColor: '#0a1420', padding: '10px', borderRadius: '4px'}}>
                        <p style={{color: '#aaa', margin: '0 0 3px 0'}}>Model Agreement</p>
                        <p style={{color: '#4ade80', fontWeight: 'bold', margin: 0}}>{selectedPick.model_agreement}%</p>
                      </div>
                      <div style={{backgroundColor: '#0a1420', padding: '10px', borderRadius: '4px'}}>
                        <p style={{color: '#aaa', margin: '0 0 3px 0'}}>Ensemble Raw</p>
                        <p style={{color: '#4ade80', fontWeight: 'bold', margin: 0}}>{selectedPick.ens_raw}</p>
                      </div>
                      <div style={{backgroundColor: '#0a1420', padding: '10px', borderRadius: '4px'}}>
                        <p style={{color: '#aaa', margin: '0 0 3px 0'}}>Infortuni Home</p>
                        <p style={{color: selectedPick.inj_h > 10 ? '#ff9800' : '#4ade80', fontWeight: 'bold', margin: 0}}>{selectedPick.inj_h}</p>
                      </div>
                      <div style={{backgroundColor: '#0a1420', padding: '10px', borderRadius: '4px'}}>
                        <p style={{color: '#aaa', margin: '0 0 3px 0'}}>Infortuni Away</p>
                        <p style={{color: selectedPick.inj_a > 10 ? '#ff9800' : '#4ade80', fontWeight: 'bold', margin: 0}}>{selectedPick.inj_a}</p>
                      </div>
                      <div style={{backgroundColor: '#0a1420', padding: '10px', borderRadius: '4px'}}>
                        <p style={{color: '#aaa', margin: '0 0 3px 0'}}>European Week</p>
                        <p style={{color: selectedPick.european_week ? '#facc15' : '#aaa', fontWeight: 'bold', margin: 0}}>
                          {selectedPick.european_week ? '🌍 SÌ' : 'No'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* News Links */}
                  <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px'}}>
                    <h4 style={{color: '#4ade80', marginTop: 0}}>📰 Notizie</h4>
                    <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                      {Object.entries(getNewsLinks(selectedPick.home)).map(([name, url]) => (
                        <a
                          key={name}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#0a1420',
                            color: '#00d4ff',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            border: '1px solid #00d4ff'
                          }}
                        >
                          {name === 'gazzetta' ? '📰 Gazzetta' : name === 'sky' ? '📺 Sky' : name === 'espn' ? 'ESPN' : 'TM'}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Risultato */}
                  {selectedPick.result && getResultBadge(selectedPick) && (
                    <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px', marginTop: '15px'}}>
                      <h4 style={{color: '#4ade80', marginTop: 0}}>⚽ Risultato</h4>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <p style={{color: '#aaa', fontSize: '12px', margin: 0}}>Finali: {selectedPick.result.home_goals} - {selectedPick.result.away_goals}</p>
                          <p style={{color: '#aaa', fontSize: '12px', margin: '5px 0 0 0'}}>1T: {selectedPick.result.ht_home} - {selectedPick.result.ht_away}</p>
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <p style={{color: getResultBadge(selectedPick).color, fontWeight: 'bold', margin: '0 0 5px 0'}}>
                            {getResultBadge(selectedPick).text}
                          </p>
                          <p style={{color: '#4ade80', fontWeight: 'bold', margin: 0}}>
                            {getResultBadge(selectedPick).profit}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB STATS */}
            {activeTab === 'stats' && (
              <section className="section">
                <h2 style={{color: '#00d4ff'}}>📊 Statistiche</h2>
                <p style={{color: '#aaa'}}>📈 Performance per lega, mercato e pattern</p>
                <div style={{padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px'}}>
                  <p style={{color: '#ccc'}}>Analisi in sviluppo — sezione disponibile con i dati completi</p>
                </div>
              </section>
            )}

            {/* TAB STORICO */}
            {activeTab === 'storico' && analysis && (
              <section className="section">
                <h2 style={{color: '#00d4ff', marginBottom: '20px'}}>📜 Storico Pick</h2>
                <div style={{overflowX: 'auto', backgroundColor: '#1a2332', padding: '15px', borderRadius: '8px'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px'}}>
                    <thead>
                      <tr style={{backgroundColor: '#0a1420', borderBottom: '2px solid #00d4ff'}}>
                        <th style={{padding: '10px', textAlign: 'left', color: '#00d4ff'}}>Data</th>
                        <th style={{padding: '10px', textAlign: 'left', color: '#00d4ff'}}>Partita</th>
                        <th style={{padding: '10px', textAlign: 'left', color: '#00d4ff'}}>Pick</th>
                        <th style={{padding: '10px', textAlign: 'center', color: '#00d4ff'}}>Quota</th>
                        <th style={{padding: '10px', textAlign: 'center', color: '#00d4ff'}}>Risultato</th>
                        <th style={{padding: '10px', textAlign: 'center', color: '#00d4ff'}}>Status</th>
                        <th style={{padding: '10px', textAlign: 'right', color: '#00d4ff'}}>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.allPicks.map((pick, idx) => {
                        const badge = getResultBadge(pick);
                        return (
                          <tr key={idx} style={{borderBottom: '1px solid #2a3f4f'}}>
                            <td style={{padding: '10px', color: '#aaa'}}>{formatDate(pick.date)}</td>
                            <td style={{padding: '10px', color: '#ccc'}}>{pick.home} vs {pick.away}</td>
                            <td style={{padding: '10px', color: '#00d4ff'}}>{formatPickLabel(pick)}</td>
                            <td style={{padding: '10px', textAlign: 'center', color: '#4ade80'}}>@ {pick.odds}</td>
                            <td style={{padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '11px'}}>
                              {pick.result ? `${pick.result.home_goals}-${pick.result.away_goals}` : '-'}
                            </td>
                            <td style={{padding: '10px', textAlign: 'center', color: badge?.color || '#aaa'}}>
                              {badge?.text || '-'}
                            </td>
                            <td style={{padding: '10px', textAlign: 'right', color: pick.result?.profit > 0 ? '#4ade80' : '#ff6b6b', fontWeight: 'bold'}}>
                              {pick.result ? `${pick.result.profit > 0 ? '+' : ''}€${pick.result.profit.toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </main>
        </>
      )}

      <footer className="footer">
        <p>© 2026 ATLAS Betting | v2.0</p>
      </footer>
    </div>
  );
}

export default App;
