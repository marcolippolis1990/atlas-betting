import React, { useState, useEffect } from 'react';

function ATLASAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carica dati analysis
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        // Prova a caricare l'ultimo file analysis
        const dates = ['2026-04-20', '2026-04-19', '2026-04-18'];
        let data = null;

        for (const date of dates) {
          try {
            const response = await fetch(`/analysis_${date}.txt`);
            if (response.ok) {
              const text = await response.text();
              data = parseAnalysisFile(text);
              if (data) break;
            }
          } catch (err) {
            console.log(`File analysis_${date}.txt non trovato`);
          }
        }

        if (data) {
          setAnalyticsData(data);
        } else {
          // Dati mock se file non trovato
          setAnalyticsData({
            record: '335',
            wr: '69.3%',
            roi: '-5.4%',
            pl: '-91.25 EUR',
            budget: '467.24 EUR',
            serieA: { wr: '84.6%', record: '55/65' },
            championship: { wr: '80.6%', record: '79/98' },
            pl: '78.3%',
            plWeek: '+2.85 EUR',
            lesson: 'Forest 4-1 Burnley: xG 1.54 ma 5 gol. Varianza estrema, non errore!',
            seriesA_pl: '+€2.85'
          });
        }
        setLoading(false);
      } catch (err) {
        console.error('Errore caricamento analytics:', err);
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const parseAnalysisFile = (text) => {
    try {
      // Estrai dati principali con regex
      const recordMatch = text.match(/Record:\s*(\d+)/);
      const wrMatch = text.match(/WR:\s*([\d.]+%)/);
      const roiMatch = text.match(/ROI:\s*([-\d.]+%)/);
      const plMatch = text.match(/P&L:\s*([-\d.]+\s*EUR)/);
      const budgetMatch = text.match(/Budget:\s*([^\s]+\s*EUR)/);

      // Estrai Universe ML
      const serieAMatch = text.match(/Serie A U3\.5:.*?WR\s*([\d.]+%)/);
      const serieARecordMatch = text.match(/Serie A U3\.5:.*?(\d+\/\d+)/);
      const champsMatch = text.match(/Championship.*?WR\s*([\d.]+%)/);
      const champsRecordMatch = text.match(/Championship.*?(\d+\/\d+)/);
      const plMatch2 = text.match(/PL U3\.5:.*?WR\s*([\d.]+%)/);
      const plRecordMatch = text.match(/PL U3\.5:.*?(\d+\/\d+)/);

      // Estrai P&L settimana
      const plWeekMatch = text.match(/P&L settimana.*?TOTALE.*?([-+]\d+\.\d+\s*EUR)/);

      // Estrai lezione
      const lessonMatch = text.match(/LEZIONE:.*?\n\s*(.+?)(?:\n|$)/);

      return {
        record: recordMatch ? recordMatch[1] : '?',
        wr: wrMatch ? wrMatch[1] : '?',
        roi: roiMatch ? roiMatch[1] : '?',
        pl: plMatch ? plMatch[1] : '?',
        budget: budgetMatch ? budgetMatch[1] : '?',
        serieA: {
          wr: serieAMatch ? serieAMatch[1] : '84.6%',
          record: serieARecordMatch ? serieARecordMatch[1] : '55/65'
        },
        championship: {
          wr: champsMatch ? champsMatch[1] : '80.6%',
          record: champsRecordMatch ? champsRecordMatch[1] : '79/98'
        },
        pl: plMatch2 ? plMatch2[1] : '78.3%',
        plWeek: plWeekMatch ? plWeekMatch[1] : '+€2.85',
        lesson: lessonMatch ? lessonMatch[1] : 'Nessuna lezione disponibile'
      };
    } catch (err) {
      console.error('Errore parsing:', err);
      return null;
    }
  };

  if (loading) {
    return (
      <div style={{padding: '30px', textAlign: 'center', color: '#aaa'}}>
        ⏳ Caricamento ATLAS Analytics...
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div style={{padding: '30px', textAlign: 'center', color: '#ff6b6b'}}>
        ❌ Dati non disponibili
      </div>
    );
  }

  return (
    <div style={{padding: '20px'}}>
      <h2 style={{color: '#00d4ff', marginTop: 0}}>📊 ATLAS PERFORMANCE</h2>

      {/* MASTER STATS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        {/* Record */}
        <div style={{
          background: '#2a3f4f',
          border: '2px solid #4ade80',
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <p style={{color: '#aaa', fontSize: '11px', margin: '0 0 5px 0', fontWeight: 'bold'}}>
            RECORD
          </p>
          <p style={{color: '#4ade80', fontWeight: 'bold', fontSize: '18px', margin: 0}}>
            {analyticsData.record}
          </p>
          <p style={{color: '#aaa', fontSize: '10px', margin: '5px 0 0 0'}}>
            partite analizzate
          </p>
        </div>

        {/* WR% */}
        <div style={{
          background: '#2a3f4f',
          border: '2px solid #00d4ff',
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <p style={{color: '#aaa', fontSize: '11px', margin: '0 0 5px 0', fontWeight: 'bold'}}>
            WIN RATE
          </p>
          <p style={{color: '#00d4ff', fontWeight: 'bold', fontSize: '18px', margin: 0}}>
            {analyticsData.wr}
          </p>
          <p style={{color: '#aaa', fontSize: '10px', margin: '5px 0 0 0'}}>
            overall WR
          </p>
        </div>

        {/* ROI */}
        <div style={{
          background: '#2a3f4f',
          border: `2px solid ${analyticsData.roi.includes('-') ? '#ff6b6b' : '#4ade80'}`,
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <p style={{color: '#aaa', fontSize: '11px', margin: '0 0 5px 0', fontWeight: 'bold'}}>
            ROI
          </p>
          <p style={{
            color: analyticsData.roi.includes('-') ? '#ff6b6b' : '#4ade80',
            fontWeight: 'bold',
            fontSize: '18px',
            margin: 0
          }}>
            {analyticsData.roi}
          </p>
          <p style={{color: '#aaa', fontSize: '10px', margin: '5px 0 0 0'}}>
            return on investment
          </p>
        </div>

        {/* P&L */}
        <div style={{
          background: '#2a3f4f',
          border: `2px solid ${analyticsData.pl.includes('-') ? '#ff6b6b' : '#4ade80'}`,
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <p style={{color: '#aaa', fontSize: '11px', margin: '0 0 5px 0', fontWeight: 'bold'}}>
            P&L TOTALE
          </p>
          <p style={{
            color: analyticsData.pl.includes('-') ? '#ff6b6b' : '#4ade80',
            fontWeight: 'bold',
            fontSize: '18px',
            margin: 0
          }}>
            {analyticsData.pl}
          </p>
          <p style={{color: '#aaa', fontSize: '10px', margin: '5px 0 0 0'}}>
            profit/loss
          </p>
        </div>

        {/* Budget */}
        <div style={{
          background: '#2a3f4f',
          border: '2px solid #facc15',
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <p style={{color: '#aaa', fontSize: '11px', margin: '0 0 5px 0', fontWeight: 'bold'}}>
            BUDGET
          </p>
          <p style={{color: '#facc15', fontWeight: 'bold', fontSize: '18px', margin: 0}}>
            {analyticsData.budget}
          </p>
          <p style={{color: '#aaa', fontSize: '10px', margin: '5px 0 0 0'}}>
            residuo
          </p>
        </div>
      </div>

      {/* UNIVERSE ML */}
      <h3 style={{color: '#00d4ff', marginBottom: '15px', fontSize: '14px'}}>
        🎯 UNIVERSO ML — WIN RATE PER MERCATO
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        {/* Serie A */}
        <div style={{
          background: '#1a2332',
          border: '1px solid #4ade80',
          borderRadius: '8px',
          padding: '15px'
        }}>
          <p style={{color: '#4ade80', fontWeight: 'bold', margin: '0 0 10px 0'}}>
            Serie A U3.5
          </p>
          <p style={{color: '#d0d0d0', margin: '0 0 5px 0'}}>
            <strong style={{color: '#4ade80', fontSize: '16px'}}>
              {analyticsData.serieA.wr}
            </strong>
          </p>
          <p style={{color: '#aaa', fontSize: '12px', margin: 0}}>
            Record: {analyticsData.serieA.record}
          </p>
          <p style={{color: '#aaa', fontSize: '11px', margin: '5px 0 0 0'}}>
            ✅ MIGLIOR MERCATO
          </p>
        </div>

        {/* Championship */}
        <div style={{
          background: '#1a2332',
          border: '1px solid #00d4ff',
          borderRadius: '8px',
          padding: '15px'
        }}>
          <p style={{color: '#00d4ff', fontWeight: 'bold', margin: '0 0 10px 0'}}>
            Championship U3.5
          </p>
          <p style={{color: '#d0d0d0', margin: '0 0 5px 0'}}>
            <strong style={{color: '#00d4ff', fontSize: '16px'}}>
              {analyticsData.championship.wr}
            </strong>
          </p>
          <p style={{color: '#aaa', fontSize: '12px', margin: 0}}>
            Record: {analyticsData.championship.record}
          </p>
        </div>

        {/* Premier League */}
        <div style={{
          background: '#1a2332',
          border: '1px solid #facc15',
          borderRadius: '8px',
          padding: '15px'
        }}>
          <p style={{color: '#facc15', fontWeight: 'bold', margin: '0 0 10px 0'}}>
            Premier League U3.5
          </p>
          <p style={{color: '#d0d0d0', margin: '0 0 5px 0'}}>
            <strong style={{color: '#facc15', fontSize: '16px'}}>
              {analyticsData.pl}
            </strong>
          </p>
          <p style={{color: '#aaa', fontSize: '12px', margin: 0}}>
            WR solida
          </p>
        </div>
      </div>

      {/* LEZIONE GIORNALIERA */}
      <h3 style={{color: '#00d4ff', marginBottom: '15px', fontSize: '14px'}}>
        🧠 LEZIONE DELLA GIORNATA
      </h3>
      <div style={{
        background: '#2a3f4f',
        border: '2px solid #00d4ff',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <p style={{
          color: '#d0d0d0',
          lineHeight: '1.6',
          margin: 0,
          fontSize: '13px'
        }}>
          💡 {analyticsData.lesson || 'Nessuna lezione disponibile'}
        </p>
      </div>

      {/* P&L SETTIMANA */}
      <h3 style={{color: '#00d4ff', marginBottom: '15px', fontSize: '14px'}}>
        📈 P&L SETTIMANALE
      </h3>
      <div style={{
        background: '#2a3f4f',
        border: '2px solid #facc15',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <p style={{color: '#aaa', margin: '0 0 10px 0', fontSize: '12px'}}>
          Profit/Loss questa settimana:
        </p>
        <p style={{
          color: analyticsData.plWeek.includes('-') ? '#ff6b6b' : '#4ade80',
          fontWeight: 'bold',
          fontSize: '24px',
          margin: 0
        }}>
          {analyticsData.plWeek}
        </p>
      </div>
    </div>
  );
}

export default ATLASAnalytics;
