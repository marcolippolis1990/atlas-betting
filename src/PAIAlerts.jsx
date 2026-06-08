import React, { useState, useEffect } from 'react';

function PAIAlerts({ userRosa }) {
  const [injuredPlayers, setInjuredPlayers] = useState([]);
  const [paiData, setPaiData] = useState({});
  const [loading, setLoading] = useState(true);

  // Carica dati infortuni e PAI
  useEffect(() => {
    const loadInjuriesAndPAI = async () => {
      try {
        // Carica lista infortunati (usiamo la data di oggi)
        const today = '2026-04-20';
        
        // Prova a caricare il file injuries più recente
        const injuriesResponse = await fetch(`/injuries_${today}.json`);
        const injuriesData = injuriesResponse.ok ? await injuriesResponse.json() : {};

        // Prova a caricare il file pai_structural più recente
        const paiResponse = await fetch(`/pai_structural_${today}.json`);
        const paiRawData = paiResponse.ok ? await paiResponse.json() : {};

        // Trasforma pai_structural in mappa per accesso rapido
        const paiMap = {};
        Object.values(paiRawData).forEach(matchup => {
          if (matchup.pai_home?.critical_absent) {
            matchup.pai_home.critical_absent.forEach(absent => {
              paiMap[absent.name] = {
                team: matchup.pai_home.team,
                impact: absent.impact,
                bestSub: absent.best_sub,
                bestSubRating: absent.best_sub_rating,
                position: absent.position,
                role: matchup.pai_home.team
              };
            });
          }
          if (matchup.pai_away?.critical_absent) {
            matchup.pai_away.critical_absent.forEach(absent => {
              paiMap[absent.name] = {
                team: matchup.pai_away.team,
                impact: absent.impact,
                bestSub: absent.best_sub,
                bestSubRating: absent.best_sub_rating,
                position: absent.position,
                role: matchup.pai_away.team
              };
            });
          }
        });

        setPaiData(paiMap);

        // Controlla quali giocatori della rosa sono infortunati
        const injured = [];
        userRosa.forEach(player => {
          // Controlla in injuries
          const squadra = player.team;
          if (injuriesData[squadra]?.injured) {
            const isInjured = injuriesData[squadra].injured.some(
              inj => inj.name.toLowerCase() === player.name.toLowerCase()
            );
            
            if (isInjured && paiMap[player.name]) {
              injured.push({
                ...player,
                injuryData: paiMap[player.name]
              });
            }
          }

          // Controlla anche direttamente in paiMap
          if (!injured.find(p => p.id === player.id) && paiMap[player.name]) {
            injured.push({
              ...player,
              injuryData: paiMap[player.name]
            });
          }
        });

        setInjuredPlayers(injured);
        setLoading(false);
      } catch (err) {
        console.error('Errore caricamento infortuni:', err);
        setLoading(false);
      }
    };

    if (userRosa.length > 0) {
      loadInjuriesAndPAI();
    } else {
      setLoading(false);
    }
  }, [userRosa]);

  if (loading) {
    return (
      <div style={{padding: '15px', color: '#aaa', fontSize: '12px'}}>
        ⏳ Caricamento avvisi infortuni...
      </div>
    );
  }

  if (injuredPlayers.length === 0) {
    return (
      <div style={{padding: '15px', color: '#4ade80', fontSize: '12px', textAlign: 'center'}}>
        ✅ Nessun infortunato nella tua rosa!
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#2a3f4f',
      border: '2px solid #ff6b6b',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px',
      maxWidth: '400px'
    }}>
      <h3 style={{
        color: '#ff6b6b',
        margin: '0 0 15px 0',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        🚑 AVVISI INFORTUNI ROSA
      </h3>

      {injuredPlayers.map((player, idx) => (
        <div 
          key={player.id}
          style={{
            background: '#1a2332',
            border: '1px solid #ff6b6b',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: idx < injuredPlayers.length - 1 ? '10px' : '0',
            fontSize: '12px'
          }}
        >
          {/* Intestazione giocatore */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
            <div>
              <p style={{color: '#ff6b6b', fontWeight: 'bold', margin: '0 0 3px 0'}}>
                🔴 {player.name}
              </p>
              <p style={{color: '#aaa', margin: 0, fontSize: '11px'}}>
                {player.team} • {player.pos}
              </p>
            </div>
            <div style={{
              background: '#ff6b6b',
              color: '#000',
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              {player.injuryData?.impact?.toFixed(1) || '?'}/10
            </div>
          </div>

          {/* Dettagli infortunio */}
          {player.injuryData && (
            <div style={{
              borderTop: '1px solid #00d4ff',
              paddingTop: '8px',
              marginTop: '8px',
              fontSize: '11px'
            }}>
              <p style={{color: '#aaa', margin: '0 0 4px 0'}}>
                📊 <strong>Impact:</strong> {player.injuryData.impact?.toFixed(1) || '?'}/10 
                {player.injuryData.impact >= 6 && ' ⚠️ ALTO'}
              </p>
              
              {player.injuryData.bestSub && (
                <p style={{color: '#4ade80', margin: '4px 0 0 0'}}>
                  ✅ <strong>Miglior sub:</strong> {player.injuryData.bestSub}
                  {player.injuryData.bestSubRating && ` (${player.injuryData.bestSubRating})`}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Footer */}
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #ff6b6b',
        color: '#aaa',
        fontSize: '11px',
        textAlign: 'center'
      }}>
        💡 Considera di sostituire questi giocatori
      </div>
    </div>
  );
}

export default PAIAlerts;
