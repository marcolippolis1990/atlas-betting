import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('betting');
  const [picks, setPicks] = useState([]);
  const [giocatori, setGiocatori] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pickRes = await fetch(`${API_URL}/api/picks/2026-04-11`);
      const pickData = await pickRes.json();
      setPicks(pickData.picks || []);

      const gRes = await fetch(`${API_URL}/api/giocatori?lega=Serie%20A&limit=20`);
      const gData = await gRes.json();
      setGiocatori(gData.giocatori || []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>⚽ ATLAS Betting</h1>
        <p>Sistema di analisi calcistica avanzato</p>
      </header>

      <nav className="nav-tabs">
        <button 
          className={`tab ${activeTab === 'betting' ? 'active' : ''}`}
          onClick={() => setActiveTab('betting')}
        >
          🎯 Betting
        </button>
        <button 
          className={`tab ${activeTab === 'fantacalcio' ? 'active' : ''}`}
          onClick={() => setActiveTab('fantacalcio')}
        >
          👥 Fantacalcio
        </button>
        <button 
          className={`tab ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          📊 Live
        </button>
        <button 
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          ℹ️ Info
        </button>
      </nav>

      <main className="content">
        {activeTab === 'betting' && (
          <section className="section">
            <h2>📌 Pick Giornalieri</h2>
            {loading ? (
              <p>Caricamento...</p>
            ) : picks.length === 0 ? (
              <p>Nessun pick disponibile</p>
            ) : (
              <div className="picks-grid">
                {picks.map((pick, i) => (
                  <div key={i} className="pick-card">
                    <h3>{pick.match || 'Partita'}</h3>
                    <p><strong>Pick:</strong> {pick.pick || '-'}</p>
                    <p><strong>Quota:</strong> {pick.quota || '-'}</p>
                    <p><strong>Probabilità:</strong> {pick.prob || '-'}%</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'fantacalcio' && (
          <section className="section">
            <h2>👥 Giocatori Serie A</h2>
            {loading ? (
              <p>Caricamento...</p>
            ) : giocatori.length === 0 ? (
              <p>Nessun giocatore disponibile</p>
            ) : (
              <div className="giocatori-grid">
                {giocatori.map((g, i) => (
                  <div key={i} className="giocatore-card">
                    <h3>{g.nome || 'Giocatore'}</h3>
                    <p><strong>Squadra:</strong> {g.squadra || '-'}</p>
                    <p><strong>Ruolo:</strong> {g.posizione || '-'}</p>
                    <p><strong>xG:</strong> {g.xg || '-'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'live' && (
          <section className="section">
            <h2>📊 Segnali Live</h2>
            <p>Funzionalità in sviluppo — torna a breve!</p>
          </section>
        )}

        {activeTab === 'info' && (
          <section className="section">
            <h2>ℹ️ Come funziona ATLAS</h2>
            <p>ATLAS è un sistema di analisi calcistica che combina:</p>
            <ul>
              <li><strong>xG (Expected Goals)</strong> — probabilità dei gol</li>
              <li><strong>PAI (Player Availability Index)</strong> — assenze giocatori</li>
              <li><strong>H2H</strong> — storico scontri diretti</li>
              <li><strong>Movimenti quote</strong> — smart money</li>
              <li><strong>Contesto tattico</strong> — fattori esterni</li>
            </ul>
            <p>I pick sono generati solo quando ATLAS e V5High concordano e la quota è favorevole.</p>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>© 2026 ATLAS Betting | <a href="/come-funziona">Come funziona</a> | <a href="/feedback">Feedback</a> | <a href="/donate">Supporta</a></p>
      </footer>
    </div>
  );
}

export default App;
