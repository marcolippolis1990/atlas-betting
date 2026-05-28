import React, { useState } from 'react';
import './App.css';

function App() {
  const [homeTab, setHomeTab] = useState('schedine');
  const [picksData, setPicksData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPick, setSelectedPick] = useState(null);
  const [selectedDays, setSelectedDays] = useState(null);
  const [picksTab, setPicksTab] = useState('oggi');
  const [donationAmount, setDonationAmount] = useState(10);
  const [donationEmail, setDonationEmail] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'https://atlas-betting-production.up.railway.app';

  // Fetch picks data
  const fetchPicks = async (days) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/picks-v5high`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setPicksData(data);
        setSelectedDays(days);
        setPicksTab('oggi');
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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const month = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'][date.getMonth()];
    return `${day} ${month}`;
  };

  const formatPickLabel = (pick) => {
    const marketLabel = pick.market === 'OU35' ? (pick.pick === 'U3.5' ? 'Under 3.5' : 'Over 3.5') :
                       pick.market === 'OU15' ? (pick.pick === 'O1.5' ? 'Over 1.5' : 'Under 1.5') :
                       pick.market === 'G1T' ? 'Goal in 1T' :
                       pick.market === 'BTTS' ? 'BTTS' :
                       pick.market === 'DC' ? pick.pick : pick.market;
    return marketLabel;
  };

  const getNewsLinks = (team) => {
    const encodedTeam = encodeURIComponent(team);
    return {
      gazzetta: `https://www.gazzetta.it/calcio/ricerca?q=${encodedTeam}`,
      sky: `https://sport.sky.it/calcio/ricerca?q=${encodedTeam}`,
      espn: `https://www.espn.com/soccer/search?query=${encodedTeam}`,
      tm: `https://www.transfermarkt.com/search/ergebnis/search?query=${encodedTeam}`
    };
  };

  const getResultBadge = (pick) => {
    if (!pick.result) return null;
    const { won, profit } = pick.result;
    return {
      text: won ? '✅ VINTO' : '❌ PERSO',
      color: won ? '#4ade80' : '#ff6b6b',
      profit: `${profit > 0 ? '+' : ''}€${profit.toFixed(2)}`
    };
  };

  const getDaysLabel = (days) => {
    const labels = {
      0: 'Oggi (d0)',
      1: 'Oggi + Domani (d1)',
      2: 'Oggi + 2 Giorni (d2)',
      3: 'Oggi + 3 Giorni (d3)'
    };
    return labels[days] || 'd0';
  };

  const getDaysDescription = (days) => {
    const descriptions = {
      0: '🔥 OGGI - Massimo rischio, massima frequenza. Gioca OGNI GIORNO le migliori partite di oggi.',
      1: '⚡ OGGI + DOMANI - Rischio moderato. Scegli le 2 migliori partite su 2 giorni per aumentare affidabilità.',
      2: '🛡️ OGGI + 2 GIORNI - Basso rischio. Scegli le 3 migliori partite su 3 giorni, massima probabilità di vincita.',
      3: '🏰 OGGI + 3 GIORNI - Minimo rischio, massima affidabilità. Gioca solo le partite ECCELLENTI su 4 giorni.'
    };
    return descriptions[days] || '';
  };

  return (
    <div className="app">
      <header className="header" onClick={() => { setPicksData(null); setSelectedPick(null); setHomeTab('schedine'); }} style={{cursor: 'pointer'}}>
        <h1>⚽ ATLAS Betting</h1>
        <p>Sistema di analisi calcistica avanzato</p>
      </header>

      {/* HOME - No picks loaded */}
      {!picksData && (
        <main className="content">
          {/* HOME TABS */}
          <nav className="nav-tabs" style={{marginBottom: '30px'}}>
            <button 
              className={`tab ${homeTab === 'schedine' ? 'active' : ''}`}
              onClick={() => setHomeTab('schedine')}
            >
              🎯 Schedine
            </button>
            <button 
              className={`tab ${homeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setHomeTab('stats')}
            >
              📊 Statistiche
            </button>
            <button 
              className={`tab ${homeTab === 'fantacalcio' ? 'active' : ''}`}
              onClick={() => setHomeTab('fantacalcio')}
            >
              👥 Fantacalcio
            </button>
            <button 
              className={`tab ${homeTab === 'supporta' ? 'active' : ''}`}
              onClick={() => setHomeTab('supporta')}
            >
              ❤️ Supporta
            </button>
          </nav>

          {/* SCHEDINE TAB */}
          {homeTab === 'schedine' && (
            <section className="section">
              <h2 style={{color: '#00d4ff', marginBottom: '30px'}}>🎯 Scegli la strategia</h2>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <button
                  onClick={() => fetchPicks(0)}
                  style={{
                    padding: '30px 20px',
                    backgroundColor: '#1a2332',
                    border: '2px solid #ff6b6b',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textAlign: 'left'
                  }}
                >
                  <h3 style={{color: '#ff6b6b', margin: '0 0 10px 0'}}>🔥 Oggi (d0)</h3>
                  <p style={{color: '#aaa', fontSize: '12px', margin: '0', lineHeight: '1.4'}}>
                    Massimo rischio, massima frequenza. Gioca OGNI GIORNO le migliori partite di oggi.
                  </p>
                </button>

                <button
                  onClick={() => fetchPicks(1)}
                  style={{
                    padding: '30px 20px',
                    backgroundColor: '#1a2332',
                    border: '2px solid #facc15',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textAlign: 'left'
                  }}
                >
                  <h3 style={{color: '#facc15', margin: '0 0 10px 0'}}>⚡ Oggi + Domani (d1)</h3>
                  <p style={{color: '#aaa', fontSize: '12px', margin: '0', lineHeight: '1.4'}}>
                    Rischio moderato. Scegli le 2 migliori partite su 2 giorni per aumentare affidabilità.
                  </p>
                </button>

                <button
                  onClick={() => fetchPicks(2)}
                  style={{
                    padding: '30px 20px',
                    backgroundColor: '#1a2332',
                    border: '2px solid #4ade80',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textAlign: 'left'
                  }}
                >
                  <h3 style={{color: '#4ade80', margin: '0 0 10px 0'}}>🛡️ Oggi + 2 Giorni (d2)</h3>
                  <p style={{color: '#aaa', fontSize: '12px', margin: '0', lineHeight: '1.4'}}>
                    Basso rischio. Scegli le 3 migliori partite su 3 giorni, massima probabilità di vincita.
                  </p>
                </button>

                <button
                  onClick={() => fetchPicks(3)}
                  style={{
                    padding: '30px 20px',
                    backgroundColor: '#1a2332',
                    border: '2px solid #00d4ff',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textAlign: 'left'
                  }}
                >
                  <h3 style={{color: '#00d4ff', margin: '0 0 10px 0'}}>🏰 Oggi + 3 Giorni (d3)</h3>
                  <p style={{color: '#aaa', fontSize: '12px', margin: '0', lineHeight: '1.4'}}>
                    Minimo rischio, massima affidabilità. Gioca solo le partite ECCELLENTI su 4 giorni.
                  </p>
                </button>
              </div>

              {loading && <p style={{color: '#aaa', marginTop: '20px'}}>⏳ Caricamento...</p>}
            </section>
          )}

          {/* STATS TAB */}
          {homeTab === 'stats' && (
            <section className="section">
              <h2 style={{color: '#00d4ff', marginBottom: '20px'}}>📊 Statistiche</h2>
              <p style={{color: '#aaa'}}>📈 Performance per lega, mercato e pattern — sezione in sviluppo</p>
            </section>
          )}

          {/* FANTACALCIO TAB */}
          {homeTab === 'fantacalcio' && (
            <section className="section">
              <h2 style={{color: '#00d4ff', marginBottom: '20px'}}>👥 Fantacalcio</h2>
              <p style={{color: '#aaa'}}>⚽ Top giocatori e statistiche — sezione in sviluppo</p>
            </section>
          )}

          {/* SUPPORTA TAB */}
          {homeTab === 'supporta' && (
            <section className="section">
              <h2 style={{color: '#00d4ff', marginBottom: '20px'}}>❤️ Supporta ATLAS</h2>
              <div style={{padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px'}}>
                <p style={{color: '#ccc'}}>Aiuta a migliorare il sistema con una donazione</p>
                <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                  {[5, 10, 25, 50].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setDonationAmount(amt)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: donationAmount === amt ? '#4ade80' : '#2a3f4f',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      €{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="email"
                  placeholder="La tua email"
                  value={donationEmail}
                  onChange={(e) => setDonationEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#2a3f4f',
                    border: '1px solid #00d4ff',
                    borderRadius: '4px',
                    color: '#fff',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#4ade80',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  💳 Dona €{donationAmount}
                </button>
              </div>
            </section>
          )}
        </main>
      )}

      {/* PICKS VIEW - Tab Oggi/Storico/Analisi */}
      {picksData && (
        <>
          <nav className="nav-tabs" style={{alignItems: 'center'}}>
            <div style={{flex: 1}}>
              <span style={{color: '#4ade80', fontWeight: 'bold'}}>📍 {getDaysLabel(selectedDays)}</span>
            </div>
            <button 
              className={`tab ${picksTab === 'oggi' ? 'active' : ''}`}
              onClick={() => { setPicksTab('oggi'); setSelectedPick(null); }}
            >
              📋 Oggi
            </button>
            <button 
              className={`tab ${picksTab === 'storico' ? 'active' : ''}`}
              onClick={() => setPicksTab('storico')}
            >
              📜 Storico
            </button>
            <button 
              className={`tab`}
              onClick={() => { setPicksData(null); setSelectedPick(null); }}
              style={{marginLeft: 'auto', backgroundColor: '#ff6b6b', color: '#fff'}}
            >
              ← Indietro
            </button>
          </nav>

          <main className="content">
            {/* TAB OGGI - Tabella sintetica */}
            {picksTab === 'oggi' && analysis && !selectedPick && (
              <section className="section">
                <div style={{marginBottom: '20px', padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px', borderLeft: '4px solid #4ade80'}}>
                  <p style={{color: '#4ade80', fontWeight: 'bold', margin: 0}}>
                    {getDaysDescription(selectedDays)}
                  </p>
                </div>

                {/* CONSIGLIATISSIMO */}
                <div style={{marginBottom: '30px', padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #00d4ff'}}>
                  <h2 style={{color: '#00d4ff', marginTop: 0}}>🎯 CONSIGLIATISSIMO</h2>
                  
                  {analysis.consigliatissimo.length > 0 ? (
                    analysis.consigliatissimo.map((pick, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedPick(pick)}
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
                          {pick.league} | {formatDate(pick.date)} ore 19:00 → <span style={{color: '#00d4ff', cursor: 'pointer'}}>clicca per Analisi</span>
                        </p>
                      </div>
                    ))
                  ) : (
                    <p style={{color: '#aaa'}}>Nessuna partita nel Consigliatissimo</p>
                  )}
                </div>

                {/* VARIANTI */}
                {Object.keys(analysis.varianti_grouped).length > 0 && (
                  <div style={{padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px'}}>
                    <h3 style={{color: '#4ade80', marginTop: 0}}>⚙️ VARIANTI</h3>
                    
                    {Object.entries(analysis.varianti_grouped).map(([schedina_name, varianti_list], group_idx) => (
                      <div key={group_idx} style={{marginBottom: '20px', padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px'}}>
                        <h4 style={{color: '#facc15', marginTop: 0, marginBottom: '12px'}}>
                          Variante {group_idx + 1}
                        </h4>
                        {varianti_list.map((pick, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedPick(pick)}
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
                              {pick.league} | {formatDate(pick.date)} ore 19:00 → <span style={{color: '#00d4ff', cursor: 'pointer'}}>clicca per Analisi</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TAB ANALISI */}
            {picksTab === 'oggi' && selectedPick && (
              <section className="section">
                <button
                  onClick={() => setSelectedPick(null)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#2a3f4f',
                    color: '#00d4ff',
                    border: '1px solid #00d4ff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '20px',
                    fontWeight: 'bold'
                  }}
                >
                  ← Torna alle partite
                </button>

                <div style={{padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #00d4ff'}}>
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

                  {/* News Links - MONETIZZAZIONE */}
                  <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px'}}>
                    <h4 style={{color: '#4ade80', marginTop: 0}}>📰 Notizie e Approfondimenti</h4>
                    <p style={{color: '#aaa', fontSize: '12px', marginBottom: '10px'}}>Clicca per leggere le ultime notizie su {selectedPick.home}</p>
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
                          {name === 'gazzetta' ? '📰 Gazzetta' : name === 'sky' ? '📺 Sky' : name === 'espn' ? 'ESPN' : 'Transfermarkt'}
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

            {/* TAB STORICO */}
            {picksTab === 'storico' && analysis && (
              <section className="section">
                <h2 style={{color: '#00d4ff', marginBottom: '20px'}}>📜 Storico Schedine {getDaysLabel(selectedDays)}</h2>
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
        <p>© 2026 ATLAS Betting | v4.0</p>
      </footer>
    </div>
  );
}

export default App;
