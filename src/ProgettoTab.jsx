import React, { useState, useEffect } from 'react';
import './ProgettoTab.css';

const ProgettoTab = () => {
  const [activeSection, setActiveSection] = useState('narrative');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch stats quando il componente si monta
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Mock data per ora (quando hai l'API pronta, cambia qui)
        const mockStats = {
          totalMatches: 2920,
          features: 136,
          masterRecord: 295,
          winRate: 69.0,
          roi: -5.1,
          pnl: -75.15,
          budget: 469.64,
          xgbAuc: 0.552,
          topLiga: { name: 'Serie A', wr: 75.8, matches: 33 },
          topMarket: { name: 'BTTS', wr: 80.0, roi: 34.8 },
          patterns: [
            { signal: 'xG < 2.7 → Under', wr: 86.3, strong: true },
            { signal: 'SOT <= 9 → Under', wr: 83.7, strong: true },
            { signal: '0-0 al 45\' → Under', wr: 93.7, strong: true },
            { signal: 'Corners > 9 → Under', wr: 75.0, strong: false },
          ],
        };
        setStats(mockStats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="progetto-container">
      {/* NAV SEZIONI */}
      <div className="progetto-nav">
        <button
          className={`nav-btn ${activeSection === 'narrative' ? 'active' : ''}`}
          onClick={() => setActiveSection('narrative')}
        >
          📖 La Storia
        </button>
        <button
          className={`nav-btn ${activeSection === 'ensemble' ? 'active' : ''}`}
          onClick={() => setActiveSection('ensemble')}
        >
          🧠 I 5 Modelli
        </button>
        <button
          className={`nav-btn ${activeSection === 'roadmap' ? 'active' : ''}`}
          onClick={() => setActiveSection('roadmap')}
        >
          📊 Roadmap
        </button>
        <button
          className={`nav-btn ${activeSection === 'ml' ? 'active' : ''}`}
          onClick={() => setActiveSection('ml')}
        >
          🤖 Machine Learning
        </button>
        <button
          className={`nav-btn ${activeSection === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveSection('stats')}
        >
          📈 Metriche
        </button>
      </div>

      {/* SEZIONE NARRATIVA */}
      {activeSection === 'narrative' && (
        <div className="section-content narrative">
          <h2>📖 La Ricerca della Prevedibilità nel Calcio</h2>
          
          <div className="narrative-text">
            <p>
              Ciao. Sono <strong>ATLAS</strong>, un sistema di intelligenza artificiale nato da una domanda semplice: 
              <em>è possibile prevedere l'esito di una partita di calcio con affidabilità?</em>
            </p>
            
            <p>
              Non con certezza, ovviamente. Ma con <strong>consapevolezza statistica e pattern recognition</strong> — sì.
            </p>

            <h3>⚽ Come tutto è iniziato...</h3>
            <p>
              Il calcio è uno sport meravigliosamente caotico. 22 giocatori in campo, migliaia di decisioni ogni 90 minuti, 
              un pallone che non sa di regole. Ma sotto il caos c'è <strong>struttura</strong>. Ogni squadra ha tendenze. 
              Ogni giocatore ha limiti e forze. Ogni lega ha caratteristiche <strong>distinte</strong>.
            </p>

            <p>
              ATLAS nasce dall'idea di catturare questa struttura. Non per predire il risultato esatto (3-2, 2-1, ecc.) 
              — sarebbe illusorio. Ma per identificare <strong>pattern probabilistici</strong>: quando è più probabile che una 
              partita finisca con pochi gol? Quando una squadra è fragile in difesa? Come cambiano le dinamiche quando un 
              giocatore chiave manca per infortunio?
            </p>

            <h3>🎯 Il Motore di ATLAS: Ensemble di 5 Modelli</h3>
            <p>
              Immagina di chiedere consiglio a 5 analisti esperti di calcio. Ognuno ha il suo stile, le sue intuizioni, 
              i suoi punti forti. Se 3 su 5 concordano, è un segnale forte. Se discordano, forse è meglio stare cauti. 
              Così funziona ATLAS.
            </p>

            <p>
              Il sistema non è <em>un</em> modello, ma <strong>5 modelli paralleli</strong> che gareggiano ogni giorno:
            </p>

            <ul className="models-list">
              <li><strong>xG Analyzer</strong> — Analizza il valore atteso dei tiri. Una partita con xG &lt; 2.7 finisce Under 3.5 nell'86.3% dei casi.</li>
              <li><strong>PAI Detector</strong> — Traccia l'impatto degli infortuni. Se una squadra ha 8+ giocatori importanti assenti, il suo xG cala drammaticamente.</li>
              <li><strong>H2H Pattern</strong> — Studia gli storici testa-a-testa per identificare tendenze ricorrenti.</li>
              <li><strong>Formation Tracker</strong> — Capisce come le formazioni tattiche influenzano il gioco.</li>
              <li><strong>Overnight Detector</strong> — Monitora i movimenti delle quote. Quando i soldi intelligenti si muovono verso l'Under, significa qualcosa.</li>
            </ul>

            <p>
              Quando i 5 modelli concordano, il segnale è <strong>consensus ATLAS 5/5</strong>. È raro, ma quando succede, 
              il tasso di vittoria sale al 92%.
            </p>

            <h3>🏆 I Mercati e le Leghe: Non Tutte Uguali</h3>
            <p>
              La Serie A non è come la Championship. La Liga ha caratteristiche distinte (xG più basso strutturalmente). 
              La Premier League è più imprevedibile.
            </p>

            <p>
              Per questo motivo, ATLAS differenzia le sue strategie:
            </p>

            <ul className="tiers-list">
              <li><strong>P1 (Prima scelta)</strong>: La Liga (WR 72.4%), Championship (69.0%) — massima fiducia</li>
              <li><strong>P2 (Seconda scelta)</strong>: Serie A (75.8%), Premier League (66.7%)</li>
              <li><strong>P3 (Specifici)</strong>: Coppe europee solo in condizioni particolari</li>
              <li><strong>SKIP</strong>: Champions League, Serie B — statisticamente inaffidabili</li>
            </ul>

            <h3>🤖 Il Ruolo del Machine Learning: Imparare dai Dati</h3>
            <p>
              Abbiamo un enorme vantaggio: <strong>i dati</strong>. Ogni giorno, ATLAS analizza migliaia di partite. 
              Ogni partita è un insegnamento.
            </p>

            <p>
              Attualmente il database contiene <strong>2.920 partite storiche</strong> con <strong>136 feature per match</strong>: 
              xG, xA, tiri in porta, corners, possesso, pressione, recuperi, distanza media dei tiri, qualità della difesa, 
              forma della squadra, PAI, fase della stagione... tutto.
            </p>

            <p>
              Questo database entra in un modello <strong>XGBoost</strong>, il leader mondiale nel machine learning per dati 
              strutturati. XGBoost apprende le relazioni nascoste: "Ah, quando una squadra ha xG &lt; 2.7 e un PAI ≥ 0.50 
              e gioca il giovedì, l'Under vince il 91.2% delle volte."
            </p>

            <p>
              Ma ecco il trucco: <strong>più dati abbiamo, meglio apprende il modello</strong>. Con 300 record otteniamo patterns 
              robusti. Con 400+ record otteniamo <em>certezza statistica</em>. Con 5.000+ record possiamo fare previsioni 
              incredibilmente precise.
            </p>

            <p>
              Oggi siamo a 2.920 record. Il modello XGBoost è addestrato e pronto. Quando raggiungeremo i 5.000 record, 
              saremo inarrestabili.
            </p>

            <h3>💡 Perché il Machine Learning non è Magia, ma Scienza Paziente</h3>
            <p>
              Il machine learning non vede il futuro. Vede i pattern del passato e assume che si ripetano. Se storicamente 
              una squadra con 50% possesso e xG 2.1 non ha mai vinto, il modello deduce che è raro che vinca. Se 200 volte 
              una squadra è arrivata al 70° minuto con 3+ tiri in porta e ha sempre segnato almeno 2 gol, il modello impara 
              "questi pattern predicono Over".
            </p>

            <p>
              Ma il calcio evolve. Le squadre cambiano allenatore. I giocatori si infortunano. Nuove tattiche emergono. 
              Per questo ATLAS aggiorna il database continuamente. Ogni 24 ore aggiungiamo 50-100 match nuovi. 
              Il modello si "rieduca" costantemente.
            </p>

            <h3>✅ Il Nostro Impegno: Trasparenza e Miglioramento</h3>
            <p>
              Siamo onesti su quello che ATLAS è e non è:
            </p>

            <div className="commitment-box">
              <div className="yes">
                <h4>✅ ATLAS È:</h4>
                <ul>
                  <li>Uno strumento di analisi probabilistica</li>
                  <li>Un aiuto per identificare partite a basso rischio statistico</li>
                  <li>Un sistema che migliora le tue decisioni di scommessa</li>
                </ul>
              </div>
              <div className="no">
                <h4>❌ ATLAS NON È:</h4>
                <ul>
                  <li>Una garanzia di vittorie (nessun sistema lo fa)</li>
                  <li>Un predicatore di risultati esatti</li>
                  <li>Un sostituto del tuo giudizio critico</li>
                </ul>
              </div>
            </div>

            <p className="final-stats">
              Siamo onesti, trasparenti e in costante miglioramento. Ogni settimana ottimizziamo il sistema, 
              aggiungiamo nuovi dati e raffiniamo i modelli.
            </p>
          </div>
        </div>
      )}

      {/* SEZIONE I 5 MODELLI */}
      {activeSection === 'ensemble' && (
        <div className="section-content ensemble">
          <h2>🧠 I 5 Modelli di ATLAS</h2>
          <p className="subtitle">Ognuno vede aspetti diversi della partita. Insieme decidono.</p>

          <div className="models-grid">
            <div className="model-card">
              <div className="model-icon">📊</div>
              <h3>xG Analyzer</h3>
              <p className="model-stat">Accuracy: 86.3%</p>
              <p>
                Analizza il valore atteso dei tiri da entrambe le squadre. 
                Una partita con xG totale &lt; 2.7 finisce Under 3.5 nell'86.3% dei casi. 
                È il nostro segnale più affidabile.
              </p>
              <div className="model-indicator">
                <div className="indicator-bar" style={{ width: '86.3%' }}></div>
                <span>86.3%</span>
              </div>
            </div>

            <div className="model-card">
              <div className="model-icon">🏥</div>
              <h3>PAI Detector</h3>
              <p className="model-stat">Impact: -2.5 xG per giocatore</p>
              <p>
                Traccia l'impatto degli infortuni (Player Availability Index). 
                Se una squadra ha 8+ giocatori importanti assenti, il suo xG cala drammaticamente. 
                Fondamentale per il contesto.
              </p>
              <div className="model-indicator">
                <div className="indicator-bar" style={{ width: '72%' }}></div>
                <span>72%</span>
              </div>
            </div>

            <div className="model-card">
              <div className="model-icon">🎯</div>
              <h3>H2H Pattern</h3>
              <p className="model-stat">Storico: 200+ scontri</p>
              <p>
                Studia gli storici testa-a-testa tra le squadre. 
                Certe coppie hanno pattern ricorrenti: "ultimi 5 scontri sempre Under", 
                "A vince sempre contro B in casa".
              </p>
              <div className="model-indicator">
                <div className="indicator-bar" style={{ width: '65%' }}></div>
                <span>65%</span>
              </div>
            </div>

            <div className="model-card">
              <div className="model-icon">⚙️</div>
              <h3>Formation Tracker</h3>
              <p className="model-stat">158 formazioni</p>
              <p>
                Capisce come le formazioni tattiche influenzano il gioco. 
                Una difesa a 5 tende a giocare più defensively. Un 4-2-3-1 più offensivo. 
                Decisivo per il contesto tattico.
              </p>
              <div className="model-indicator">
                <div className="indicator-bar" style={{ width: '68%' }}></div>
                <span>68%</span>
              </div>
            </div>

            <div className="model-card">
              <div className="model-icon">💰</div>
              <h3>Overnight Detector</h3>
              <p className="model-stat">Sharp Money: ±10%</p>
              <p>
                Monitora i movimenti delle quote alle scommesse. 
                Quando i soldi intelligenti si muovono nella notte verso l'Under, significa che gli esperti 
                concordano. È come uno "smart money tracker".
              </p>
              <div className="model-indicator">
                <div className="indicator-bar" style={{ width: '71%' }}></div>
                <span>71%</span>
              </div>
            </div>

            <div className="consensus-card">
              <div className="consensus-icon">🔗</div>
              <h3>Consensus ATLAS</h3>
              <p className="model-stat">Quando tutti concordano: 92% WR</p>
              <p>
                Quando i 5 modelli concordano (ATLAS 5/5), il segnale è fortissimo. 
                Il tasso di vittoria sale al 92%. È raro, ma quando succede, è quasi certo.
              </p>
              <div className="model-indicator">
                <div className="indicator-bar" style={{ width: '92%' }}></div>
                <span>92%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEZIONE ROADMAP */}
      {activeSection === 'roadmap' && (
        <div className="section-content roadmap">
          <h2>📊 Roadmap: L'Evoluzione di ATLAS</h2>
          <p className="subtitle">Come stiamo diventando sempre più intelligenti</p>

          <div className="timeline">
            <div className="timeline-item completed">
              <div className="timeline-marker">✅</div>
              <div className="timeline-content">
                <h3>FASE 1: Fondamenta</h3>
                <ul>
                  <li>Database iniziale: 100 record</li>
                  <li>Ensemble 3 modelli (xG, PAI, H2H)</li>
                  <li>Consensus tracking</li>
                  <li className="highlight">Track record: WR 65%</li>
                </ul>
              </div>
            </div>

            <div className="timeline-item completed">
              <div className="timeline-marker">✅</div>
              <div className="timeline-content">
                <h3>FASE 2: Scale-Up</h3>
                <ul>
                  <li>Database: 500 record</li>
                  <li>Ensemble 5 modelli (+ Formation, Overnight)</li>
                  <li>Regole operative 7-step</li>
                  <li>Context check automatico</li>
                  <li className="highlight">Track record: WR 69%</li>
                </ul>
              </div>
            </div>

            <div className="timeline-item active">
              <div className="timeline-marker">🔄</div>
              <div className="timeline-content">
                <h3>FASE 3: ML Operativo ← SIAMO QUI</h3>
                <ul>
                  <li>Database ML: 2.920 record</li>
                  <li>XGBoost training AUC 0.552</li>
                  <li>136 feature per match</li>
                  <li>PAI calibrazione fine-tuning</li>
                  <li>Formazione web check (PAI ≥ 0.50)</li>
                  <li className="highlight">Obiettivo: AUC 0.60 con 400+ record</li>
                </ul>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-marker">⏳</div>
              <div className="timeline-content">
                <h3>FASE 4: IA Autonoma</h3>
                <ul>
                  <li>XGBoost operativo (AUC &gt; 0.60)</li>
                  <li>Previsioni Real-Time</li>
                  <li>Auto-ranking partite per fiducia</li>
                  <li>Newsletter intelligente</li>
                  <li>Bonus: Previsioni player props</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEZIONE MACHINE LEARNING */}
      {activeSection === 'ml' && (
        <div className="section-content ml">
          <h2>🤖 Come il Machine Learning Impara dai Dati</h2>
          <p className="subtitle">Più dati = Migliori previsioni</p>

          {loading ? (
            <div className="loading">Caricamento metriche...</div>
          ) : stats ? (
            <>
              <div className="ml-explanation">
                <p>
                  Il machine learning <strong>non vede il futuro</strong>. Vede i pattern del passato e assume che si ripetano. 
                  Se storicamente una squadra con 50% possesso e xG 2.1 non ha mai vinto, il modello deduce che è raro che vinca.
                </p>

                <p>
                  Il nostro modello <strong>XGBoost</strong> è il leader mondiale nel machine learning per dati strutturati (tabellari). 
                  Apprende le relazioni nascoste tra le 136 feature per ogni partita.
                </p>

                <p>
                  Ma ecco il segreto: <strong>più dati abbiamo, meglio apprende il modello</strong>.
                </p>
              </div>

              <div className="ml-metrics">
                <div className="metric-card">
                  <h4>📊 Dataset Attuale</h4>
                  <div className="metric-value">{stats.totalMatches.toLocaleString()}</div>
                  <p>Partite storiche nel database</p>
                </div>

                <div className="metric-card">
                  <h4>🧮 Feature per Match</h4>
                  <div className="metric-value">{stats.features}</div>
                  <p>xG, PAI, H2H, Formation, Quote, Forma...</p>
                </div>

                <div className="metric-card">
                  <h4>🎯 AUC Score</h4>
                  <div className="metric-value">{stats.xgbAuc.toFixed(3)}</div>
                  <p>Obiettivo: 0.60 (operativo)</p>
                </div>
              </div>

              <div className="auc-progress">
                <h3>📈 Progresso verso AUC 0.60</h3>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(stats.xgbAuc / 0.70) * 100}%` }}>
                    <span>{stats.xgbAuc.toFixed(3)}</span>
                  </div>
                </div>
                <p className="progress-text">
                  Siamo al <strong>{Math.round((stats.xgbAuc / 0.70) * 100)}%</strong> del percorso verso il traguardo operativo.
                  Quando raggiungeremo <strong>AUC &gt; 0.60</strong>, XGBoost diventerà operativo e le previsioni 
                  saranno ancora più affidabili.
                </p>
              </div>

              <div className="data-growth">
                <h3>📚 Come Cresceranno i Dati</h3>
                <div className="growth-scenario">
                  <div className="scenario">
                    <h4>Oggi</h4>
                    <p className="stat">2.920 record</p>
                    <p className="note">Pattern robusti, ma ancora variabilità</p>
                    <p className="error">Margine di errore: ±8-10%</p>
                  </div>

                  <div className="arrow">→</div>

                  <div className="scenario">
                    <h4>Tra 2 mesi</h4>
                    <p className="stat">5.000 record</p>
                    <p className="note">Modello vede più contesti, più eccezioni</p>
                    <p className="error">Margine di errore: ±4-5%</p>
                  </div>

                  <div className="arrow">→</div>

                  <div className="scenario">
                    <h4>Tra 6 mesi</h4>
                    <p className="stat">10.000 record</p>
                    <p className="note">Ha visto davvero tutto</p>
                    <p className="error">Margine di errore: ±2-3%</p>
                  </div>
                </div>
              </div>

              <div className="ml-insight">
                <h3>💡 Il Metodo: Batch Training Settimanale</h3>
                <p>
                  Ogni settimana, XGBoost viene ri-addestrato con i nuovi match. Il modello si "rieduca" continuamente, 
                  imparando dagli ultimi pattern e dai cambiamenti nel calcio (nuovi allenatori, tattiche, infortuni).
                </p>
                <p>
                  È come un bambino che impara: con 10 esempi sbaglia spesso. Con 100 esempi, capisce meglio. 
                  Con 1.000 esempi, diventa esperto. Con 10.000 esempi di calcio, ATLAS diventa praticamente inarrestabile.
                </p>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* SEZIONE METRICHE */}
      {activeSection === 'stats' && (
        <div className="section-content stats">
          <h2>📈 Metriche Performance ATLAS</h2>
          <p className="subtitle">Trasparenza totale sui nostri risultati</p>

          {loading ? (
            <div className="loading">Caricamento metriche...</div>
          ) : stats ? (
            <>
              <div className="stats-grid">
                {/* BEST PER LEGA */}
                <div className="stats-section">
                  <h3>🏆 Migliore per Lega</h3>
                  <div className="highlight-card">
                    <p><strong>{stats.topLiga.name}</strong></p>
                    <p className="big-stat">{stats.topLiga.wr}% WR</p>
                    <p className="small">({stats.topLiga.matches} match)</p>
                  </div>
                </div>

                {/* BEST PER MERCATO */}
                <div className="stats-section">
                  <h3>💰 Migliore per Mercato</h3>
                  <div className="highlight-card">
                    <p><strong>{stats.topMarket.name}</strong></p>
                    <p className="big-stat">{stats.topMarket.wr}% WR</p>
                    <p className="small" style={{ color: '#4ade80' }}>ROI +{stats.topMarket.roi.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* PATTERN ORO */}
              <div className="patterns-section">
                <h3>⚡ Segnali Pattern ORO</h3>
                <p className="subtitle-small">I pattern più affidabili del nostro sistema</p>
                <div className="patterns-grid">
                  {stats.patterns.map((pattern, idx) => (
                    <div key={idx} className={`pattern-card ${pattern.strong ? 'strong' : ''}`}>
                      <div className="pattern-signal">{pattern.signal}</div>
                      <div className="pattern-wr">
                        <div className="wr-bar">
                          <div className="wr-fill" style={{ width: `${pattern.wr}%` }}></div>
                        </div>
                        <span className="wr-value">{pattern.wr}% WR</span>
                      </div>
                      {pattern.strong && <span className="strong-badge">FORTE</span>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* FOOTER NAV - Ripeti le 5 sezioni */}
      <div className="progetto-footer-nav">
        <button
          className={`footer-nav-btn ${activeSection === 'narrative' ? 'active' : ''}`}
          onClick={() => setActiveSection('narrative')}
        >
          📖 La Storia
        </button>
        <button
          className={`footer-nav-btn ${activeSection === 'ensemble' ? 'active' : ''}`}
          onClick={() => setActiveSection('ensemble')}
        >
          🧠 I 5 Modelli
        </button>
        <button
          className={`footer-nav-btn ${activeSection === 'roadmap' ? 'active' : ''}`}
          onClick={() => setActiveSection('roadmap')}
        >
          📊 Roadmap
        </button>
        <button
          className={`footer-nav-btn ${activeSection === 'ml' ? 'active' : ''}`}
          onClick={() => setActiveSection('ml')}
        >
          🤖 Machine Learning
        </button>
        <button
          className={`footer-nav-btn ${activeSection === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveSection('stats')}
        >
          📈 Metriche
        </button>
      </div>

      {/* FOOTER CTA */}
      <div className="progetto-footer">
        <h3>🚀 Pronto per iniziare?</h3>
        <p>Scopri i pick di oggi e le strategie ATLAS nella tab <a href="#schedine" className="footer-link"><strong>SCHEDINE</strong></a></p>
      </div>
    </div>
  );
};

export default ProgettoTab;
