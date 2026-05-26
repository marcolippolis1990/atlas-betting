import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('betting');
  const [picks, setPicks] = useState([]);
  const [giocatori, setGiocatori] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [donationAmount, setDonationAmount] = useState(10);
  const [donationEmail, setDonationEmail] = useState('');
  const [donationMessage, setDonationMessage] = useState('');
  const [donationLoading, setDonationLoading] = useState(false);
  const [donationSubmitted, setDonationSubmitted] = useState(false);
  const [picksToday, setPicksToday] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'https://atlas-betting-production.up.railway.app';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const pickRes = await fetch(`${API_URL}/api/picks`);
      const pickData = await pickRes.json();
      setPicks(pickData.data || []);

      const gRes = await fetch(`${API_URL}/api/giocatori?limit=20`);
      const gData = await gRes.json();
      setGiocatori(gData.data || []);

      const statsRes = await fetch(`${API_URL}/api/analytics/picks-summary`);
      const statsData = await statsRes.json();
      setStats(statsData.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  }, [API_URL]);

  useEffect(() => {
    fetchData();
    
    fetch(`${API_URL}/api/picks-today`)
      .then(res => res.json())
      .then(data => setPicksToday(data))
      .catch(err => console.error('Error:', err));
  }, [fetchData, API_URL]);

  const handleDonation = async (e) => {
    e.preventDefault();
    
    if (!donationEmail || !donationAmount) {
      alert('Completa email e importo');
      return;
    }

    setDonationLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/donazioni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: donationEmail,
          amount: parseFloat(donationAmount),
          message: donationMessage,
          stripe_payment_id: 'pending_paypal'
        })
      });

      if (response.ok) {
        setDonationSubmitted(true);
        setTimeout(() => {
          window.location.href = `https://www.paypal.me/marcolippolis1990/${donationAmount}EUR`;
        }, 2000);
      }
    } catch (error) {
      console.error('Donation error:', error);
      alert('Errore nel salvataggio della donazione');
    } finally {
      setDonationLoading(false);
    }
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
          className={`tab ${activeTab === 'come-funziona' ? 'active' : ''}`}
          onClick={() => setActiveTab('come-funziona')}
        >
          📖 Come funziona
        </button>
        <button 
          className={`tab ${activeTab === 'donate' ? 'active' : ''}`}
          onClick={() => setActiveTab('donate')}
        >
          ❤️ Supporta
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
            <div style={{marginBottom: '40px', padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #00d4ff'}}>
              <h2 style={{color: '#00d4ff', marginBottom: '20px'}}>🎯 CONSIGLIATISSIMO</h2>
              {!picksToday ? (
                <p style={{color: '#aaa'}}>Caricamento schedina...</p>
              ) : picksToday.consigliatissimo?.schedina === 'SKIP' ? (
                <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px'}}>
                  <h3 style={{color: '#ff6b6b', marginTop: 0}}>🚫 {picksToday.consigliatissimo?.motivo}</h3>
                  <p style={{color: '#ccc'}}>{picksToday.consigliatissimo?.recommendation}</p>
                  <p style={{color: '#aaa', fontSize: '12px'}}>💰 Budget preservato: €{picksToday.consigliatissimo?.budget_preservato}</p>
                </div>
              ) : (
                <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px'}}>
                  <h3 style={{color: '#4ade80', marginTop: 0}}>✅ Schedina CONSIGLIATISSIMA</h3>
                  <p style={{color: '#ccc'}}>Stake: €{picksToday.consigliatissimo?.stake}</p>
                  <p style={{color: '#aaa', fontSize: '12px'}}>Quota: {picksToday.consigliatissimo?.quota_combinata}</p>
                </div>
              )}
            </div>

            <h2>📌 Pick Giornalieri</h2>
            {loading ? (
              <p>Caricamento...</p>
            ) : picks.length === 0 ? (
              <p>Nessun pick disponibile</p>
            ) : (
              <div className="picks-grid">
                {picks.map((pick, i) => (
                  <div key={i} className="pick-card">
                    <h3>{pick.home} vs {pick.away}</h3>
                    <p><strong>Pick:</strong> {pick.pick || '-'}</p>
                    <p><strong>Quota:</strong> {pick.odds || '-'}</p>
                    <p><strong>Probabilità:</strong> {pick.prob || '-'}%</p>
                    <p><strong>Valore:</strong> {pick.value || '-'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        
        {activeTab === 'fantacalcio' && (
          <section className="section">
            <h2>👥 Top Giocatori</h2>
            {loading ? (
              <p>Caricamento...</p>
            ) : giocatori.length === 0 ? (
              <p>Nessun giocatore disponibile</p>
            ) : (
              <div className="giocatori-grid">
                {giocatori.map((g, i) => (
                  <div key={i} className="giocatore-card">
                    <h3>{g.name || 'Giocatore'}</h3>
                    <p><strong>Squadra:</strong> {g.team || '-'}</p>
                    <p><strong>Ruolo:</strong> {g.position || '-'}</p>
                    <p><strong>xG Avg (10):</strong> {g.xg_avg_10 || '-'}</p>
                    <p><strong>PAI:</strong> {g.pai || '-'}</p>
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

        {activeTab === 'come-funziona' && (
          <section className="section">
            <h2>📖 Come funziona ATLAS</h2>
            <div className="come-funziona-container">
              <div className="cf-intro">
                <p>ATLAS è un sistema intelligente di analisi calcistica che combina dati statistici avanzati e machine learning per generare pick ad alta probabilità.</p>
              </div>

              <div className="cf-section">
                <h3>⚽ xG (Expected Goals)</h3>
                <p>L'Expected Goals misura la qualità e la quantità delle occasioni da gol. ATLAS combina l'xG atteso con lo storico delle ultime 10 partite per identificare opportunità ad alto valore.</p>
              </div>

              <div className="cf-section">
                <h3>👥 PAI (Player Availability Index)</h3>
                <p>Traccia la disponibilità di ogni giocatore chiave basandosi su infortuni, squalifiche, minutaggio recente e stato psicofisico. Un giocatore assente cambia completamente l'equilibrio tattico.</p>
              </div>

              <div className="cf-section">
                <h3>📊 H2H (Head to Head)</h3>
                <p>Analizza gli ultimi 10 scontri diretti tra due squadre per identificare pattern, risultati storici, goal medi e tendenze Over/Under. Il fattore casa è fondamentale.</p>
              </div>

              <div className="cf-section">
                <h3>💹 Movimenti Quote</h3>
                <p>Monitora i movimenti delle quote in tempo reale. Quando un pick ha ottimi fondamentali E la quota si muove favorevolmente, ATLAS identifica il momento ottimale per piazzare la scommessa.</p>
              </div>

              <div className="cf-section">
                <h3>🎯 Contesto Tattico</h3>
                <p>Valuta fattori situazionali come la competizione, il calendario, la forma della squadra, i viaggi lunghi, la pressione di uno scontro diretto e persino il clima. Tutto conta.</p>
              </div>

              <div className="cf-stats">
                <h3>📈 Statistiche</h3>
                {stats && stats.length > 0 ? (
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Market</th>
                        <th>Pick</th>
                        <th>Win Rate</th>
                        <th>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.slice(0, 5).map((stat, i) => (
                        <tr key={i}>
                          <td>{stat.market}</td>
                          <td>{stat.total_picks}</td>
                          <td style={{color: stat.win_rate > 50 ? '#4caf50' : '#f44336'}}>{stat.win_rate}%</td>
                          <td style={{color: stat.avg_profit > 0 ? '#4caf50' : '#f44336'}}>€{stat.avg_profit > 0 ? '+' : ''}{stat.avg_profit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Caricamento statistiche...</p>
                )}
              </div>

              <div className="cf-cta">
                <button 
                  className="cf-btn"
                  onClick={() => setActiveTab('donate')}
                >
                  ❤️ Supporta ATLAS
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'donate' && (
          <section className="section donate-section">
            <h2>❤️ Supporta ATLAS</h2>
            {!donationSubmitted ? (
              <form onSubmit={handleDonation} className="donation-form">
                <div className="form-group">
                  <label>Importo (€)</label>
                  <div className="amount-presets">
                    {[5, 10, 25, 50, 100].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        className={`preset-btn ${donationAmount === amt ? 'active' : ''}`}
                        onClick={() => setDonationAmount(amt)}
                      >
                        €{amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(parseFloat(e.target.value))}
                    min="1"
                    step="0.50"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={donationEmail}
                    onChange={(e) => setDonationEmail(e.target.value)}
                    placeholder="tua@email.com"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Messaggio (opzionale)</label>
                  <textarea
                    value={donationMessage}
                    onChange={(e) => setDonationMessage(e.target.value)}
                    placeholder="Un messaggio di supporto..."
                    className="form-input"
                    rows="4"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={donationLoading}
                  className="donate-btn"
                >
                  {donationLoading ? '⏳ Elaborazione...' : `💳 Dona €${donationAmount} con PayPal`}
                </button>
              </form>
            ) : (
              <div className="donation-success">
                <h3>✅ Grazie mille!</h3>
                <p>La tua donazione è stata registrata. Verrai reindirizzato a PayPal...</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'info' && (
          <section className="section">
            <h2>ℹ️ Informazioni</h2>
            <p>ATLAS è un sistema di analisi calcistica che combina:</p>
            <ul>
              <li><strong>xG (Expected Goals)</strong> — probabilità dei gol</li>
              <li><strong>PAI (Player Availability Index)</strong> — assenze giocatori</li>
              <li><strong>H2H</strong> — storico scontri diretti</li>
              <li><strong>Movimenti quote</strong> — smart money</li>
              <li><strong>Contesto tattico</strong> — fattori esterni</li>
            </ul>
            <p>I pick sono generati solo quando ATLAS riconosce un'opportunità ad alta probabilità e la quota è favorevole.</p>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>© 2026 ATLAS Betting | <button style={{background: 'none', border: 'none', color: '#2e75b6', cursor: 'pointer', textDecoration: 'underline'}} onClick={() => setActiveTab('come-funziona')}>Come funziona</button> | <button style={{background: 'none', border: 'none', color: '#2e75b6', cursor: 'pointer', textDecoration: 'underline'}} onClick={() => setActiveTab('donate')}>Supporta</button></p>
      </footer>
    </div>
  );
}

export default App;
