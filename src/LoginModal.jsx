import React, { useState } from 'react';
import './LoginModal.css';

function LoginModal({ isOpen, onClose, onLogin, initialMode = 'login' }) {
  const API_URL = "https://atlas-betting-production.up.railway.app";
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotUsername, setForgotUsername] = useState('');
  const [resetLink, setResetLink] = useState('');

  // Sincronizza il mode quando cambia initialMode
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const API_URL = process.env.REACT_APP_API_URL || 'https://atlas-betting-production.up.railway.app';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      
      const payload = mode === 'login' 
        ? { email, password }
        : { email, password, password_confirm: confirmPassword, username };

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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!forgotEmail && !forgotUsername) {
        setError('Inserisci email o username');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail || null,
          username: forgotUsername || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Errore nella richiesta');
        setLoading(false);
        return;
      }

      // Mostra il link di reset
      setResetLink(data.reset_link);
      setError('');
    } catch (err) {
      setError('Errore di connessione. Riprova.');
      console.error('Error:', err);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  // Modale Password Dimenticata
  if (showForgotPassword) {
    return (
      <div className="login-modal-overlay">
        <div className="login-modal">
          <button className="close-btn" onClick={() => {
            setShowForgotPassword(false);
            setResetLink('');
            setError('');
            setForgotEmail('');
            setForgotUsername('');
          }}>✕</button>
          
          <h2 style={{color: '#00d4ff', textAlign: 'center', marginTop: 0}}>
            RECUPERA PASSWORD
          </h2>

          {!resetLink ? (
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email o Username</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="tua@email.com"
                />
              </div>

              <p style={{color: '#aaa', textAlign: 'center', fontSize: '12px', margin: '15px 0'}}>OPPURE</p>

              <div className="form-group">
                <input
                  type="text"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  placeholder="username"
                />
              </div>

              {error && <p className="error-msg">{error}</p>}

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? '⏳ Attendere...' : 'INVIA LINK RESET'}
              </button>
            </form>
          ) : (
            <div>
              <p style={{color: '#4ade80', textAlign: 'center', marginBottom: '15px'}}>
                ✅ Link di reset generato!
              </p>
              <div style={{
                padding: '15px',
                background: '#0a1420',
                border: '1px solid #00d4ff',
                borderRadius: '4px',
                marginBottom: '15px',
                wordBreak: 'break-all'
              }}>
                <p style={{color: '#aaa', fontSize: '11px', margin: '0 0 8px 0'}}>Copia questo link:</p>
                <p style={{color: '#00d4ff', fontFamily: 'monospace', fontSize: '12px', margin: 0}}>
                  {resetLink}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetLink);
                  alert('Link copiato!');
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#00d4ff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📋 COPIA LINK
              </button>
            </div>
          )}

          <button
            type="button"
            className="toggle-mode-btn"
            onClick={() => {
              setShowForgotPassword(false);
              setResetLink('');
              setError('');
              setForgotEmail('');
              setForgotUsername('');
            }}
            style={{marginTop: '15px', width: '100%'}}
          >
            TORNA AL LOGIN
          </button>
        </div>
      </div>
    );
  }

  // Modale Principale Login/Register
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

          {mode === 'register' && (
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                required
              />
            </div>
          )}

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
          
          {mode === 'login' && (
            <p style={{color: '#aaa', margin: '15px 0 0 0', fontSize: '12px', textAlign: 'center'}}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00d4ff',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '12px'
                }}
              >
                Password dimenticata?
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
