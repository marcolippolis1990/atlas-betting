import React, { useState } from 'react';
import './LoginModal.css';

function LoginModal({ isOpen, onClose, onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' o 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'https://atlas-betting-production.up.railway.app';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      
      const payload = mode === 'login' 
        ? { email, password }
        : { email, password, password_confirm: confirmPassword };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Errore nell\'autenticazione');
        setLoading(false);
        return;
      }

      // Salva il token e i dati utente in localStorage
      localStorage.setItem('atlas_token', data.access_token);
      localStorage.setItem('atlas_user', JSON.stringify({
        email: data.email,
        username: data.username || email.split('@')[0]
      }));

      onLogin(data);
      onClose();
    } catch (err) {
      setError('Errore di connessione. Riprova.');
      console.error('Error:', err);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal">
        <button className="close-btn" onClick={onClose}>✕</button>
        
        <h2 style={{color: '#00d4ff', textAlign: 'center', marginTop: 0}}>
          {mode === 'login' ? 'ACCEDI' : 'REGISTRATI'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tua@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label>Conferma Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? '⏳ Attendere...' : (mode === 'login' ? 'ACCEDI' : 'REGISTRATI')}
          </button>
        </form>

        <div className="form-toggle">
          <p style={{color: '#aaa', margin: '20px 0 10px 0'}}>
            {mode === 'login' ? 'Non hai un account?' : 'Hai già un account?'}
          </p>
          <button
            type="button"
            className="toggle-mode-btn"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? 'REGISTRATI' : 'ACCEDI'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
