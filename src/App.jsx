import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('betting');
  const [picks, setPicks] = useState([]);
  const [giocatori, setGiocatori] = useState([]);
  const [loading, setLoading] = useState(false);
  const [donationAmount, setDonationAmount] = useState(10);
  const [donationEmail, setDonationEmail] = useState('');
  const [donationMessage, setDonationMessage] = useState('');
  const [donationLoading, setDonationLoading] = useState(false);
  const [donationSubmitted, setDonationSubmitted] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const pickRes = await fetch(`${API_URL}/api/picks`);
      const pickData = await pickRes.json();
      setPicks(pickData.data || []);

      const gRes = await fetch(`${API_URL}/api/giocatori?limit=20`);
      const gData = await gRes.json();
      setGiocatori(gData.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  }, [API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
            <h2>📌 Pick Giornalieri</h2>
            {loading ? (
              <p>Caricamento...</p>
            ) : picks.length === 0 ? (
              <p>Nessun pick disponibile</p>
            ) : (
              <div className="picks-grid">
                {picks.map((pick, i) => (
                  <div key={i} className="pick-card">
                    <h3>{
