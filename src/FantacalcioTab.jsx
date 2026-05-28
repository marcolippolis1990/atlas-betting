import React, { useState, useEffect } from 'react';
import './FantacalcioTab.css';

function FantacalcioTab() {
  const [activeTab, setActiveTab] = useState('formazione');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRosa, setUserRosa] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [allPlayers, setAllPlayers] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);

  // Verifica login
  useEffect(() => {
    const token = localStorage.getItem('atlas_token');
    setIsLoggedIn(!!token);
    
    if (token) {
      const saved = localStorage.getItem('atlas_user_rosa');
      if (saved) {
        setUserRosa(JSON.parse(saved));
      }
    }
  }, []);

  // Carica giocatori (mock per ora - sarà dal file JSON)
  useEffect(() => {
    // MOCK DATA - Sostituire con file JSON reale
    const mockPlayers = [
      {
        id: 1,
        name: 'Gianluigi Donnarumma',
        team: 'AC Milan',
        pos: 'G',
        avg_rating: 7.5,
        prob_score: 0,
        prob_assist: 0,
        fair_score: 45,
        fair_assist: 50
      },
      {
        id: 2,
        name: 'Theo Hernández',
        team: 'AC Milan',
        pos: 'D',
        avg_rating: 7.8,
        prob_score: 0.05,
        prob_assist: 0.15,
        fair_score: 50,
        fair_assist: 55
      },
      {
        id: 3,
        name: 'Khvicha Kvaratskhelia',
        team: 'Napoli',
        pos: 'A',
        avg_rating: 7.9,
        prob_score: 0.35,
        prob_assist: 0.25,
        fair_score: 65,
        fair_assist: 60
      }
      // Aggiungere più giocatori...
    ];
    
    setAllPlayers(mockPlayers);
    setTopPlayers(mockPlayers.slice(0, 5).sort((a, b) => b.avg_rating - a.avg_rating));
  }, []);

  // Filtra giocatori
  const filteredPlayers = allPlayers.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = selectedRole === 'all' || p.pos === selectedRole;
    return matchSearch && matchRole;
  });

  // Aggiungi giocatore alla rosa
  const addToRosa = (player) => {
    if (!userRosa.find(p => p.id === player.id)) {
      const newRosa = [...userRosa, player];
      setUserRosa(newRosa);
      localStorage.setItem('atlas_user_rosa', JSON.stringify(newRosa));
    }
  };

  // Rimuovi giocatore dalla rosa
  const removeFromRosa = (playerId) => {
    const newRosa = userRosa.filter(p => p.id !== playerId);
    setUserRosa(newRosa);
    localStorage.setItem('atlas_user_rosa', JSON.stringify(newRosa));
  };

  const getRoleLabel = (pos) => {
    const labels = { 'G': 'Portiere', 'D': 'Difensore', 'C': 'Centrocampista', 'A': 'Attaccante' };
    return labels[pos] || pos;
  };

  return (
    <section className="section fantacalcio-section">
      {/* TABS */}
      <nav className="fantacalcio-tabs">
        <button 
          className={`tab ${activeTab === 'formazione' ? 'active' : ''}`}
          onClick={() => setActiveTab('formazione')}
        >
          ⭐ Formazione Ideale
        </button>
        <button 
          className={`tab ${activeTab === 'topplayers' ? 'active' : ''}`}
          onClick={() => setActiveTab('topplayers')}
        >
          🔝 Top Players
        </button>
        <button 
          className={`tab ${activeTab === 'statistiche' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistiche')}
        >
          📊 Statistiche Giocatori
        </button>
        {isLoggedIn && (
          <button 
            className={`tab ${activeTab === 'rosa' ? 'active' : ''}`}
            onClick={() => setActiveTab('rosa')}
          >
            👥 La tua rosa
          </button>
        )}
      </nav>

      {/* FORMAZIONE IDEALE */}
      {activeTab === 'formazione' && (
        <div className="fantacalcio-content">
          {isLoggedIn ? (
            <div>
              <h2 style={{color: '#00d4ff'}}>⭐ Formazione Ideale</h2>
              <div className="info-box">
                <p style={{color: '#d0d0d0', lineHeight: '1.8'}}>
                  In base ai tuoi dati e alle statistiche della giornata, questa è la <strong>formazione migliore</strong> per massimizzare i tuoi punti fantacalcio.
                </p>
              </div>

              {userRosa.length > 0 ? (
                <div className="formazione-grid">
                  <h3 style={{color: '#4ade80', gridColumn: '1/-1'}}>I tuoi migliori 11</h3>
                  {userRosa.slice(0, 11).map((player, idx) => (
                    <div key={idx} className="formazione-card">
                      <p className="player-name">{player.name}</p>
                      <p className="player-team">{player.team}</p>
                      <p className="player-rating">Voto: {player.avg_rating}</p>
                      <p className="player-prob">Goal: {(player.prob_score * 100).toFixed(0)}%</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #facc15', marginTop: '20px'}}>
                  <p style={{color: '#facc15', textAlign: 'center'}}>
                    📌 Aggiungi i tuoi giocatori in "La tua rosa" per vedere la formazione ideale!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{padding: '30px', textAlign: 'center'}}>
              <p style={{color: '#aaa', fontSize: '16px'}}>🔐 Accedi per vedere la tua formazione ideale personalizzata</p>
            </div>
          )}
        </div>
      )}

      {/* TOP PLAYERS */}
      {activeTab === 'topplayers' && (
        <div className="fantacalcio-content">
          <h2 style={{color: '#00d4ff'}}>🔝 Top Players Giornata</h2>
          <div className="players-grid">
            {topPlayers.map((player, idx) => (
              <div key={idx} className="player-card">
                <div className="player-header">
                  <h4 style={{color: '#fff', margin: '0 0 5px 0'}}>{player.name}</h4>
                  <span className="player-role">{getRoleLabel(player.pos)}</span>
                </div>
                <p style={{color: '#aaa', fontSize: '12px', margin: '10px 0'}}>{player.team}</p>
                
                <div className="player-stats">
                  <div className="stat">
                    <span className="stat-label">Rating</span>
                    <span className="stat-value" style={{color: '#4ade80'}}>{player.avg_rating}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Goal %</span>
                    <span className="stat-value" style={{color: '#00d4ff'}}>{(player.prob_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Assist %</span>
                    <span className="stat-value" style={{color: '#facc15'}}>{(player.prob_assist * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {isLoggedIn && (
                  <button 
                    className="btn-add"
                    onClick={() => addToRosa(player)}
                  >
                    ➕ Aggiungi alla rosa
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATISTICHE */}
      {activeTab === 'statistiche' && (
        <div className="fantacalcio-content">
          <h2 style={{color: '#00d4ff'}}>📊 Statistiche Giocatori</h2>
          
          <div className="filters">
            <input
              type="text"
              placeholder="Cerca giocatore..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            <select 
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="role-filter"
            >
              <option value="all">Tutti i ruoli</option>
              <option value="G">Portieri</option>
              <option value="D">Difensori</option>
              <option value="C">Centrocampisti</option>
              <option value="A">Attaccanti</option>
            </select>
          </div>

          <div className="stats-table">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player, idx) => (
                <div key={idx} className="stat-row">
                  <div className="stat-info">
                    <h4 style={{color: '#fff', margin: 0}}>{player.name}</h4>
                    <p style={{color: '#aaa', fontSize: '12px', margin: '3px 0 0 0'}}>
                      {player.team} • {getRoleLabel(player.pos)}
                    </p>
                  </div>
                  
                  <div className="stat-numbers">
                    <span className="number" title="Rating medio">
                      <strong style={{color: '#4ade80'}}>{player.avg_rating}</strong>
                    </span>
                    <span className="number" title="Probabilità goal">
                      <strong style={{color: '#00d4ff'}}>{(player.prob_score * 100).toFixed(0)}%</strong>
                    </span>
                    <span className="number" title="Probabilità assist">
                      <strong style={{color: '#facc15'}}>{(player.prob_assist * 100).toFixed(0)}%</strong>
                    </span>
                    <span className="number" title="Fair score">
                      <strong style={{color: '#aaa'}}>{player.fair_score}</strong>
                    </span>
                  </div>

                  {isLoggedIn && (
                    <button 
                      className="btn-small"
                      onClick={() => addToRosa(player)}
                    >
                      ➕
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p style={{color: '#aaa', textAlign: 'center', padding: '20px'}}>Nessun giocatore trovato</p>
            )}
          </div>
        </div>
      )}

      {/* LA TUA ROSA */}
      {isLoggedIn && activeTab === 'rosa' && (
        <div className="fantacalcio-content">
          <h2 style={{color: '#00d4ff'}}>👥 La tua rosa</h2>
          
          {userRosa.length > 0 ? (
            <div>
              <p style={{color: '#aaa', marginBottom: '20px'}}>
                Hai {userRosa.length} giocatori salvati nella tua rosa
              </p>
              
              <div className="rosa-grid">
                {userRosa.map((player, idx) => (
                  <div key={idx} className="rosa-card">
                    <div className="rosa-header">
                      <h4 style={{color: '#fff', margin: 0}}>{player.name}</h4>
                      <button 
                        className="btn-remove"
                        onClick={() => removeFromRosa(player.id)}
                      >
                        ✕
                      </button>
                    </div>
                    <p style={{color: '#aaa', fontSize: '12px', margin: '8px 0 0 0'}}>
                      {player.team} • {getRoleLabel(player.pos)}
                    </p>
                    <div style={{marginTop: '10px', fontSize: '12px'}}>
                      <div style={{color: '#4ade80'}}>Voto: <strong>{player.avg_rating}</strong></div>
                      <div style={{color: '#00d4ff'}}>Goal: <strong>{(player.prob_score * 100).toFixed(0)}%</strong></div>
                      <div style={{color: '#facc15'}}>Assist: <strong>{(player.prob_assist * 100).toFixed(0)}%</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{padding: '30px', textAlign: 'center', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #facc15'}}>
              <p style={{color: '#facc15'}}>📌 La tua rosa è vuota. Aggiungi giocatori dalle altre schede!</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default FantacalcioTab;
