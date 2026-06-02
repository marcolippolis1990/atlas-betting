import React, { useState, useEffect } from 'react';
import './FantacalcioTab.css';

function FantacalcioTab() {
  const [activeTab, setActiveTab] = useState('formazione');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRosa, setUserRosa] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [allPlayers, setAllPlayers] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState('4-3-3');

  // Formazioni disponibili
  const formations = {
    '4-3-3': { defenders: 4, midfielders: 3, forwards: 3, name: '4-3-3' },
    '3-5-2': { defenders: 3, midfielders: 5, forwards: 2, name: '3-5-2' },
    '4-2-4': { defenders: 4, midfielders: 2, forwards: 4, name: '4-2-4' },
    '3-4-3': { defenders: 3, midfielders: 4, forwards: 3, name: '3-4-3' },
    '5-3-2': { defenders: 5, midfielders: 3, forwards: 2, name: '5-3-2' }
  };

  // Verifica login e carica rosa dal backend
  useEffect(() => {
    const token = localStorage.getItem('atlas_token');
    setIsLoggedIn(!!token);
    
    if (token) {
      loadRosaFromBackend(token);
    }
  }, []);

  // Carica rosa dal backend
  const loadRosaFromBackend = async (token) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://atlas-betting-production.up.railway.app';
      const response = await fetch(`${API_URL}/api/user/rosa`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          setUserRosa(data.data);
        }
      }
    } catch (err) {
      console.error('Errore caricamento rosa:', err);
    }
  };

  // Carica giocatori dal JSON
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const response = await fetch('/player_props_updated.json');
        const data = await response.json();
        
        const allPlayersArray = [];
        const teamsSet = new Set();
        
        data.matches.forEach(match => {
          if (match.league === 'Serie A') {
            teamsSet.add(match.home);
            teamsSet.add(match.away);
            
            match.players.forEach(player => {
              allPlayersArray.push({
                ...player,
                match_home: match.home,
                match_away: match.away,
                match_date: match.date
              });
            });
          }
        });

        const uniquePlayers = Array.from(
          new Map(allPlayersArray.map(p => [p.id, p])).values()
        );

        uniquePlayers.sort((a, b) => b.avg_rating - a.avg_rating);

        const teams = Array.from(teamsSet).sort();

        setAllPlayers(uniquePlayers);
        setTopPlayers(uniquePlayers.slice(0, 10));
        setAllTeams(teams);
      } catch (err) {
        console.error('Errore caricamento giocatori:', err);
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
          }
        ];
        setAllPlayers(mockPlayers);
        setTopPlayers(mockPlayers);
        setAllTeams(['AC Milan']);
      }
    };

    loadPlayers();
  }, []);

  // Filtra giocatori
  const filteredPlayers = allPlayers.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = selectedRole === 'all' || p.pos === selectedRole;
    const matchTeam = selectedTeam === 'all' || p.team === selectedTeam;
    return matchSearch && matchRole && matchTeam;
  });

  // Genera la migliore formazione per il modulo selezionato
  const generateBestFormation = () => {
    if (userRosa.length === 0) return { starting: [], bench: [] };

    const formation = formations[selectedFormation];
    
    // Ordina giocatori per rating decrescente
    const sorted = [...userRosa].sort((a, b) => b.avg_rating - a.avg_rating);
    
    // Separa per ruolo
    const goalkeepers = sorted.filter(p => p.pos === 'G');
    const defenders = sorted.filter(p => p.pos === 'D');
    const midfielders = sorted.filter(p => p.pos === 'M' || p.pos === 'C');
    const forwards = sorted.filter(p => p.pos === 'F' || p.pos === 'A');
    
    // Seleziona i migliori per ogni ruolo
    const starting = [
      ...goalkeepers.slice(0, 1),
      ...defenders.slice(0, formation.defenders),
      ...midfielders.slice(0, formation.midfielders),
      ...forwards.slice(0, formation.forwards)
    ];
    
    // Il resto va in panchina
    const bench = sorted.filter(p => !starting.find(s => s.id === p.id));
    
    return { starting, bench };
  };

  const { starting, bench } = generateBestFormation();

  // Calcola statistiche della formazione
  const formationStats = () => {
    const ratingAvg = starting.length > 0 ? (starting.reduce((sum, p) => sum + p.avg_rating, 0) / starting.length).toFixed(2) : 0;
    const totalGoals = starting.reduce((sum, p) => sum + (p.prob_score || 0), 0).toFixed(2);
    const totalAssists = starting.reduce((sum, p) => sum + (p.prob_assist || 0), 0).toFixed(2);
    
    return { ratingAvg, totalGoals, totalAssists };
  };

  const stats = formationStats();

  // Toggle: aggiungi/rimuovi giocatore dalla rosa
  const togglePlayerInRosa = async (player) => {
    if (!isLoggedIn) {
      alert('Devi essere loggato per aggiungere giocatori!');
      return;
    }

    const isInRosa = userRosa.find(p => p.id === player.id);

    let newRosa;
    if (isInRosa) {
      // Rimuovi dalla rosa
      newRosa = userRosa.filter(p => p.id !== player.id);
    } else {
      // Aggiungi alla rosa
      newRosa = [...userRosa, player];
    }

    setUserRosa(newRosa);
    
    // Salva nel backend
    const token = localStorage.getItem('atlas_token');
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://atlas-betting-production.up.railway.app';
      const response = await fetch(`${API_URL}/api/user/rosa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          players: newRosa.map(p => ({
            id: p.id,
            name: p.name,
            team: p.team,
            pos: p.pos,
            avg_rating: p.avg_rating,
            prob_score: p.prob_score,
            prob_assist: p.prob_assist
          }))
        })
      });

      if (!response.ok) {
        console.error('Errore salvataggio rosa');
        setUserRosa(userRosa);
      }
    } catch (err) {
      console.error('Errore:', err);
      setUserRosa(userRosa);
    }
  };

  // Rimuovi giocatore dalla rosa
  const removeFromRosa = async (playerId) => {
    const newRosa = userRosa.filter(p => p.id !== playerId);
    setUserRosa(newRosa);
    
    const token = localStorage.getItem('atlas_token');
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://atlas-betting-production.up.railway.app';
      const response = await fetch(`${API_URL}/api/user/rosa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          players: newRosa.map(p => ({
            id: p.id,
            name: p.name,
            team: p.team,
            pos: p.pos,
            avg_rating: p.avg_rating,
            prob_score: p.prob_score,
            prob_assist: p.prob_assist
          }))
        })
      });

      if (!response.ok) {
        console.error('Errore salvataggio rosa');
        setUserRosa([...newRosa, userRosa.find(p => p.id === playerId)]);
      }
    } catch (err) {
      console.error('Errore:', err);
      setUserRosa([...newRosa, userRosa.find(p => p.id === playerId)]);
    }
  };

  const getRoleLabel = (pos) => {
    const labels = { 'G': 'Portiere', 'D': 'Difensore', 'M': 'Centrocampista', 'C': 'Centrocampista', 'F': 'Attaccante', 'A': 'Attaccante' };
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
                <div>
                  {/* SELEZIONE MODULO */}
                  <div style={{marginBottom: '20px', padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px'}}>
                    <p style={{color: '#aaa', margin: '0 0 10px 0', fontSize: '12px'}}>Scegli il modulo:</p>
                    <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                      {Object.keys(formations).map((formation) => (
                        <button
                          key={formation}
                          onClick={() => setSelectedFormation(formation)}
                          style={{
                            padding: '10px 16px',
                            backgroundColor: selectedFormation === formation ? '#4ade80' : '#0a1420',
                            color: selectedFormation === formation ? '#000' : '#4ade80',
                            border: `2px solid ${selectedFormation === formation ? '#4ade80' : '#4ade80'}`,
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {formation}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* STATISTICHE FORMAZIONE */}
                  <div style={{marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'}}>
                    <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px', textAlign: 'center', borderLeft: '3px solid #4ade80'}}>
                      <p style={{color: '#aaa', fontSize: '12px', margin: '0 0 5px 0'}}>Rating Medio</p>
                      <p style={{color: '#4ade80', fontWeight: 'bold', fontSize: '18px', margin: 0}}>{stats.ratingAvg}</p>
                    </div>
                    <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px', textAlign: 'center', borderLeft: '3px solid #00d4ff'}}>
                      <p style={{color: '#aaa', fontSize: '12px', margin: '0 0 5px 0'}}>Gol Previsti</p>
                      <p style={{color: '#00d4ff', fontWeight: 'bold', fontSize: '18px', margin: 0}}>{stats.totalGoals}</p>
                    </div>
                    <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px', textAlign: 'center', borderLeft: '3px solid #facc15'}}>
                      <p style={{color: '#aaa', fontSize: '12px', margin: '0 0 5px 0'}}>Assist Previsti</p>
                      <p style={{color: '#facc15', fontWeight: 'bold', fontSize: '18px', margin: 0}}>{stats.totalAssists}</p>
                    </div>
                  </div>

                  {/* TITOLARI */}
                  <div style={{marginBottom: '20px', padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #4ade80'}}>
                    <h3 style={{color: '#4ade80', marginTop: 0, marginBottom: '15px'}}>⚽ Titolari ({starting.length})</h3>
                    <div className="formazione-grid">
                      {starting.map((player, idx) => (
                        <div key={idx} className="formazione-card">
                          <p className="player-name">{player.name}</p>
                          <p className="player-team">{player.team}</p>
                          <p className="player-role" style={{color: '#fff', fontSize: '11px', fontWeight: 'bold'}}>{getRoleLabel(player.pos)}</p>
                          <p className="player-rating">Voto: {player.avg_rating}</p>
                          <p className="player-prob">Goal: {(player.prob_score * 100).toFixed(0)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PANCHINA */}
                  {bench.length > 0 && (
                    <div style={{padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #facc15'}}>
                      <h3 style={{color: '#facc15', marginTop: 0, marginBottom: '15px'}}>🪑 Panchina ({bench.length})</h3>
                      <div className="formazione-grid">
                        {bench.map((player, idx) => (
                          <div key={idx} className="formazione-card" style={{opacity: 0.7}}>
                            <p className="player-name">{player.name}</p>
                            <p className="player-team">{player.team}</p>
                            <p className="player-role" style={{color: '#fff', fontSize: '11px', fontWeight: 'bold'}}>{getRoleLabel(player.pos)}</p>
                            <p className="player-rating">Voto: {player.avg_rating}</p>
                            <p className="player-prob">Goal: {(player.prob_score * 100).toFixed(0)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                    onClick={() => togglePlayerInRosa(player)}
                    style={{
                      backgroundColor: userRosa.find(p => p.id === player.id) ? '#4ade80' : '#00d4ff',
                      color: userRosa.find(p => p.id === player.id) ? '#000' : '#000',
                      transition: 'all 0.2s',
                      boxShadow: userRosa.find(p => p.id === player.id) ? '0 0 10px rgba(74, 222, 128, 0.3)' : 'none'
                    }}
                  >
                    {userRosa.find(p => p.id === player.id) ? '✓ In rosa' : '➕ Aggiungi alla rosa'}
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
          
          <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px', marginBottom: '20px', border: '1px solid #00d4ff'}}>
            <p style={{color: '#d0d0d0', margin: 0}}>
              📌 Sfoglia i giocatori disponibili, filtra per ruolo o squadra, e <strong>clicca il ➕ per aggiungerli alla tua rosa!</strong>
            </p>
          </div>
          
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
              <option value="M">Centrocampisti</option>
              <option value="F">Attaccanti</option>
            </select>

            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="role-filter"
            >
              <option value="all">Tutte le squadre</option>
              {allTeams.map((team, idx) => (
                <option key={idx} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className="stats-table">
            {/* INTESTAZIONE TABELLA */}
            <div className="stat-row" style={{backgroundColor: '#0a1420', borderBottom: '2px solid #00d4ff', marginBottom: '10px', fontWeight: 'bold'}}>
              <div className="stat-info">
                <p style={{color: '#00d4ff', margin: 0, fontSize: '12px', fontWeight: 'bold'}}>GIOCATORE</p>
              </div>
              
              <div className="stat-numbers">
                <span className="number">
                  <span style={{color: '#4ade80', fontSize: '11px', fontWeight: 'bold'}}>Rating</span>
                </span>
                <span className="number">
                  <span style={{color: '#00d4ff', fontSize: '11px', fontWeight: 'bold'}}>Goal %</span>
                </span>
                <span className="number">
                  <span style={{color: '#facc15', fontSize: '11px', fontWeight: 'bold'}}>Assist %</span>
                </span>
                <span className="number">
                  <span style={{color: '#aaa', fontSize: '11px', fontWeight: 'bold'}}>Fair Sc.</span>
                </span>
              </div>

              <div style={{width: '40px'}}></div>
            </div>

            {/* RIGHE GIOCATORI */}
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
                      onClick={() => togglePlayerInRosa(player)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: userRosa.find(p => p.id === player.id) ? '#4ade80' : '#fff',
                        color: userRosa.find(p => p.id === player.id) ? '#000' : '#000',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s',
                        boxShadow: userRosa.find(p => p.id === player.id) ? '0 0 10px rgba(74, 222, 128, 0.3)' : 'none'
                      }}
                    >
                      {userRosa.find(p => p.id === player.id) ? '✓' : '➕'}
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
              <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px', marginBottom: '20px', border: '1px solid #00d4ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <p style={{color: '#d0d0d0', margin: 0}}>
                  Hai <strong style={{color: '#4ade80'}}>{userRosa.length}</strong> giocatori salvati nella tua rosa
                </p>
                <button
                  onClick={() => setActiveTab('statistiche')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#00d4ff',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ➕ Aggiungi altri giocatori
                </button>
              </div>
              
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
              <p style={{color: '#facc15', marginBottom: '15px', fontSize: '16px'}}>👉 La tua rosa è vuota!</p>
              <p style={{color: '#aaa', fontSize: '13px', marginBottom: '20px'}}>Sfoglia i giocatori disponibili e aggiungili alla tua rosa</p>
              <button
                onClick={() => setActiveTab('statistiche')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4ade80',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                📊 Vai a Statistiche Giocatori
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default FantacalcioTab;
