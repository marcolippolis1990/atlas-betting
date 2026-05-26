import React, { useState, useEffect } from 'react';

export function BettingPicks({ API_URL }) {
  const [picksToday, setPicksToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('consigliatissimo');

  useEffect(() => {
    fetch(`${API_URL}/api/picks-today`)
      .then(res => res.json())
      .then(data => {
        setPicksToday(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, [API_URL]);

  if (loading) return <div style={{color: '#aaa'}}>Caricamento schedina...</div>;
  if (!picksToday) return <div style={{color: '#ff6b6b'}}>Errore caricamento dati</div>;

  // SEZIONE CONSIGLIATISSIMO
  if (picksToday.consigliatissimo?.schedina === 'SKIP') {
    return (
      <div style={{marginBottom: '40px', padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #00d4ff'}}>
        <h2 style={{color: '#00d4ff', marginBottom: '20px'}}>🎯 CONSIGLIATISSIMO</h2>
        <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '6px', border: '2px solid #ff6b6b'}}>
          <h3 style={{color: '#ff6b6b', marginTop: 0}}>🚫 {picksToday.consigliatissimo?.motivo}</h3>
          <p style={{color: '#ccc'}}>{picksToday.consigliatissimo?.recommendation}</p>
          <p style={{color: '#aaa', fontSize: '12px'}}>💰 Budget preservato: €{picksToday.consigliatissimo?.budget_preservato}</p>
        </div>
      </div>
    );
  }

  // SEZIONE CON SCHEDINA VERA
  const schedina = picksToday.consigliatissimo;
  const varianti = picksToday.varianti || [];
  const dettagli = picksToday.dettagli_pattern || {};
  const stats = picksToday.statistiche_giornaliere || {};
  const alternative = picksToday.alternative_scartate || [];
  const checklist = picksToday.checklist_finale || {};

  const getRiskColor = (risk) => {
    if (risk === 'BASSISSIMO' || risk === 'BASSO') return '#4ade80';
    if (risk === 'MEDIO') return '#facc15';
    return '#ff6b6b';
  };

  const getRiskEmoji = (risk) => {
    if (risk === 'BASSISSIMO') return '🟢🟢';
    if (risk === 'BASSO') return '🟢';
    if (risk === 'MEDIO') return '🟡';
    return '🔴';
  };

  return (
    <div style={{marginBottom: '40px'}}>
      {/* HEADER PRINCIPALE */}
      <div style={{padding: '20px', backgroundColor: '#1a2332', borderRadius: '8px', border: '2px solid #00d4ff', marginBottom: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h2 style={{color: '#00d4ff', marginTop: 0}}>🎯 CONSIGLIATISSIMO — {picksToday.data}</h2>
            <p style={{color: '#aaa', marginBottom: '10px'}}>
              Stake: €{schedina.stake} | Quota: {schedina.quota_combinata} | Profitto: +€{schedina.profitto_atteso}
            </p>
          </div>
          <div style={{textAlign: 'right'}}>
            <p style={{color: getRiskColor(schedina.risk_level), fontSize: '18px', fontWeight: 'bold'}}>
              {getRiskEmoji(schedina.risk_level)} {schedina.risk_level}
            </p>
            <p style={{color: '#aaa', fontSize: '12px'}}>WR {schedina.wr_storico}%</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #2a3f4f', paddingBottom: '10px'}}>
        <button
          onClick={() => setActiveTab('consigliatissimo')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'consigliatissimo' ? '#00d4ff' : 'transparent',
            color: activeTab === 'consigliatissimo' ? '#000' : '#aaa',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📌 Schedina
        </button>
        <button
          onClick={() => setActiveTab('varianti')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'varianti' ? '#00d4ff' : 'transparent',
            color: activeTab === 'varianti' ? '#000' : '#aaa',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ⚙️ Varianti
        </button>
        <button
          onClick={() => setActiveTab('dettagli')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'dettagli' ? '#00d4ff' : 'transparent',
            color: activeTab === 'dettagli' ? '#000' : '#aaa',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🔍 Dettagli
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'stats' ? '#00d4ff' : 'transparent',
            color: activeTab === 'stats' ? '#000' : '#aaa',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📊 Stats
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'checklist' ? '#00d4ff' : 'transparent',
            color: activeTab === 'checklist' ? '#000' : '#aaa',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ✅ Checklist
        </button>
      </div>

      {/* TAB CONSIGLIATISSIMO */}
      {activeTab === 'consigliatissimo' && (
        <div>
          <h3 style={{color: '#00d4ff', marginBottom: '20px'}}>Le gambe della schedina</h3>
          {schedina.gambe?.map((gamba, idx) => (
            <div key={idx} style={{marginBottom: '20px', padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px', borderLeft: '4px solid #00d4ff'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                <div>
                  <h4 style={{color: '#fff', marginTop: 0}}>{idx + 1}. {gamba.partita}</h4>
                  <p style={{color: '#aaa', fontSize: '12px'}}>
                    {gamba.lega} • {gamba.data} {gamba.ora}
                  </p>
                </div>
                <div style={{textAlign: 'right'}}>
                  <p style={{color: '#4ade80', fontWeight: 'bold', marginTop: 0}}>Quota: {gamba.quota}</p>
                  <p style={{color: '#aaa', fontSize: '12px', marginBottom: 0}}>Prob: {gamba.probabilita}%</p>
                </div>
              </div>

              <p style={{color: '#ccc', margin: '10px 0'}}>
                <strong>Pick:</strong> {gamba.mercato}
              </p>

              <div style={{backgroundColor: '#1a2332', padding: '10px', borderRadius: '4px', marginTop: '10px'}}>
                <p style={{color: '#facc15', fontSize: '12px', marginTop: 0}}>🎯 Segnali forti:</p>
                {gamba.segnali_forti?.map((sig, i) => (
                  <p key={i} style={{color: '#ccc', fontSize: '12px', margin: '5px 0'}}>
                    • <strong>{sig.segnale}</strong>: {sig.valore} (WR {sig.wr}%)
                  </p>
                ))}
              </div>

              {gamba.warning && (
                <p style={{color: '#ff6b6b', fontSize: '12px', marginTop: '10px'}}>⚠️ {gamba.warning}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB VARIANTI */}
      {activeTab === 'varianti' && (
        <div>
          <h3 style={{color: '#00d4ff', marginBottom: '20px'}}>Scegli la tua variante</h3>
          {varianti.map((v, idx) => (
            <div key={idx} style={{marginBottom: '15px', padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px', border: '1px solid #4ade80'}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <div>
                  <h4 style={{color: '#4ade80', marginTop: 0}}>{v.nome}</h4>
                  <p style={{color: '#aaa', fontSize: '12px'}}>{v.descrizione}</p>
                </div>
                <div style={{textAlign: 'right'}}>
                  <p style={{color: '#fff', fontWeight: 'bold', marginTop: 0}}>€{v.stake}</p>
                  <p style={{color: '#aaa', fontSize: '12px'}}>Quota: {v.quota_combinata}</p>
                </div>
              </div>
              <p style={{color: '#ccc', fontSize: '12px', margin: '10px 0'}}>
                ✅ WR {v.wr}% | Profitto: +€{v.profitto_atteso}
              </p>
              <p style={{color: '#aaa', fontSize: '11px', margin: 0}}>
                💡 {v.quando_sceglierla}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB DETTAGLI */}
      {activeTab === 'dettagli' && (
        <div>
          <h3 style={{color: '#00d4ff', marginBottom: '20px'}}>Analisi tecnica dei segnali</h3>
          
          {dettagli.xg_pattern && (
            <div style={{marginBottom: '15px', padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px'}}>
              <h4 style={{color: '#facc15', marginTop: 0}}>⚽ Pattern xG</h4>
              <p style={{color: '#ccc'}}>Backtest su {dettagli.xg_pattern.partite_backtest} partite</p>
              <p style={{color: '#4ade80', fontWeight: 'bold'}}>WR {dettagli.xg_pattern.wr}% | ROI +{dettagli.xg_pattern.roi}%</p>
              <p style={{color: '#aaa', fontSize: '12px'}}>📊 Partite oggi con questo pattern: {dettagli.xg_pattern.partite_oggi}</p>
            </div>
          )}

          {dettagli.consensus_pattern && (
            <div style={{marginBottom: '15px', padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px'}}>
              <h4 style={{color: '#facc15', marginTop: 0}}>🎯 Consensus</h4>
              <p style={{color: '#ccc'}}>Atlas 3/3: {dettagli.consensus_pattern.atlas_3_3?.conteggio} pick (WR {dettagli.consensus_pattern.atlas_3_3?.wr}%)</p>
              <p style={{color: '#4ade80'}}>V5High: {dettagli.consensus_pattern.v5high_accordo ? '✅ Accordo' : '❌ Disaccordo'}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB STATS */}
      {activeTab === 'stats' && (
        <div>
          <h3 style={{color: '#00d4ff', marginBottom: '20px'}}>Statistiche giornaliere</h3>
          
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
            <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px'}}>
              <p style={{color: '#aaa', fontSize: '12px', marginTop: 0}}>Pick P1</p>
              <p style={{color: '#4ade80', fontSize: '20px', fontWeight: 'bold', margin: '5px 0'}}>{stats.pick_p1_disponibili || 0}</p>
            </div>
            <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px'}}>
              <p style={{color: '#aaa', fontSize: '12px', marginTop: 0}}>Pick P2</p>
              <p style={{color: '#4ade80', fontSize: '20px', fontWeight: 'bold', margin: '5px 0'}}>{stats.pick_p2_disponibili || 0}</p>
            </div>
            <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px'}}>
              <p style={{color: '#aaa', fontSize: '12px', marginTop: 0}}>ROI Potenziale</p>
              <p style={{color: '#facc15', fontSize: '20px', fontWeight: 'bold', margin: '5px 0'}}>+{stats.roi_potenziale_medio || 0}%</p>
            </div>
            <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px'}}>
              <p style={{color: '#aaa', fontSize: '12px', marginTop: 0}}>Budget Preservato</p>
              <p style={{color: '#ff9800', fontSize: '20px', fontWeight: 'bold', margin: '5px 0'}}>€{stats.budget_preservato || 0}</p>
            </div>
          </div>

          <div style={{padding: '15px', backgroundColor: '#2a3f4f', borderRadius: '8px'}}>
            <h4 style={{color: '#00d4ff', marginTop: 0}}>Mercati</h4>
            {stats.mercati && Object.entries(stats.mercati).map(([market, count]) => (
              <p key={market} style={{color: '#ccc', margin: '5px 0'}}>
                {market}: {count} pick
              </p>
            ))}
          </div>
        </div>
      )}

      {/* TAB CHECKLIST */}
      {activeTab === 'checklist' && (
        <div>
          <h3 style={{color: '#00d4ff', marginBottom: '20px'}}>✅ Checklist finale ATLAS</h3>
          {checklist && Object.entries(checklist).map(([check, status]) => (
            <div key={check} style={{padding: '10px', marginBottom: '8px', backgroundColor: '#2a3f4f', borderRadius: '4px', display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: '#ccc', textTransform: 'capitalize'}}>
                {check.replace(/_/g, ' ')}
              </span>
              <span style={{
                color: status?.includes('✅') ? '#4ade80' : status?.includes('❌') ? '#ff6b6b' : '#aaa',
                fontWeight: 'bold'
              }}>
                {status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
