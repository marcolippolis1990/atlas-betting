import React, { useState, useEffect } from 'react';

export function BettingPicks({ API_URL }) {
  const [picksToday, setPicksToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('consigliatissimo');

  useEffect(() => {
    fetch(`${API_URL}/api/picks-today`)
      .then(res => res.json())
      .then(data => {
        console.log('Picks loaded:', data);
        setPicksToday(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, [API_URL]);

  if (loading) return <p style={{color: '#aaa'}}>Caricamento schedina...</p>;
  if (!picksToday) return <p style={{color: '#ff6b6b'}}>Errore caricamento</p>;

  const schedina = picksToday.consigliatissimo || {};
  const isSkip = schedina.schedina === 'SKIP';

  return (
    <div style={{marginBottom: '40px'}}>
      {/* HEADER */}
      <div style={{padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #00d4ff', marginBottom: '20px'}}>
        <h2 style={{color: '#00d4ff', marginTop: 0}}>🎯 CONSIGLIATISSIMO — {picksToday.data}</h2>
      </div>

      {/* MESSAGGIO SKIP O SCHEDINA */}
      {isSkip ? (
        <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px', border: '2px solid #ff6b6b', marginBottom: '20px'}}>
          <h3 style={{color: '#ff6b6b', marginTop: 0}}>🚫 {schedina.motivo}</h3>
          <p style={{color: '#ccc'}}>{schedina.recommendation}</p>
          <p style={{color: '#aaa', fontSize: '12px'}}>💰 Budget preservato: €{schedina.budget_preservato}</p>
        </div>
      ) : (
        <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px', border: '2px solid #4ade80', marginBottom: '20px'}}>
          <h3 style={{color: '#4ade80', marginTop: 0}}>✅ Schedina disponibile</h3>
          <p style={{color: '#ccc'}}>Stake: €{schedina.stake} | Quota: {schedina.quota_combinata}</p>
        </div>
      )}

      {/* TABS */}
      <div style={{display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #2a3f4f', paddingBottom: '10px'}}>
        <button onClick={() => setActiveTab('consigliatissimo')} style={{padding: '10px 15px', backgroundColor: activeTab === 'consigliatissimo' ? '#00d4ff' : '#2a3f4f', color: activeTab === 'consigliatissimo' ? '#000' : '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>📌 Schedina</button>
        <button onClick={() => setActiveTab('varianti')} style={{padding: '10px 15px', backgroundColor: activeTab === 'varianti' ? '#00d4ff' : '#2a3f4f', color: activeTab === 'varianti' ? '#000' : '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>⚙️ Varianti</button>
        <button onClick={() => setActiveTab('dettagli')} style={{padding: '10px 15px', backgroundColor: activeTab === 'dettagli' ? '#00d4ff' : '#2a3f4f', color: activeTab === 'dettagli' ? '#000' : '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>🔍 Dettagli</button>
        <button onClick={() => setActiveTab('stats')} style={{padding: '10px 15px', backgroundColor: activeTab === 'stats' ? '#00d4ff' : '#2a3f4f', color: activeTab === 'stats' ? '#000' : '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>📊 Stats</button>
        <button onClick={() => setActiveTab('checklist')} style={{padding: '10px 15px', backgroundColor: activeTab === 'checklist' ? '#00d4ff' : '#2a3f4f', color: activeTab === 'checklist' ? '#000' : '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>✅ Checklist</button>
      </div>

      {/* CONTENUTI TAB */}
      {activeTab === 'consigliatissimo' && (
        <div>
          <h3 style={{color: '#00d4ff'}}>Le gambe</h3>
          {isSkip ? <p style={{color: '#aaa'}}>Nessuna schedina oggi</p> : <p style={{color: '#ccc'}}>Gambe della schedina</p>}
        </div>
      )}

      {activeTab === 'varianti' && (
        <div>
          <h3 style={{color: '#00d4ff'}}>Varianti</h3>
          <p style={{color: '#ccc'}}>Nessuna variante disponibile</p>
        </div>
      )}

      {activeTab === 'dettagli' && (
        <div>
          <h3 style={{color: '#00d4ff'}}>Dettagli</h3>
          <p style={{color: '#ccc'}}>Nessun dettaglio disponibile</p>
        </div>
      )}

      {activeTab === 'stats' && (
        <div>
          <h3 style={{color: '#00d4ff'}}>Stats</h3>
          <p style={{color: '#ccc'}}>Nessuna statistica disponibile</p>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div>
          <h3 style={{color: '#00d4ff'}}>Checklist</h3>
          <p style={{color: '#ccc'}}>Nessun checklist disponibile</p>
        </div>
      )}
    </div>
  );
}
