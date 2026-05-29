import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './ResetPassword.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://atlas-betting-production.up.railway.app';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Controlla se il token esiste
  useEffect(() => {
    if (!token) {
      setError('Token non valido. Torna al login.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        setError('Le password non corrispondono');
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        setError('La password deve essere almeno 6 caratteri');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Errore nel reset della password');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError('Errore di connessione. Riprova.');
      console.error('Error:', err);
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <h2>⚠️ Link Non Valido</h2>
          <p>Torna al login e richiedi un nuovo link di reset password.</p>
          <button onClick={() => navigate('/')} className="btn-back">
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <h2>✅ Password Resettata!</h2>
          <p>La tua password è stata cambiata con successo.</p>
          <p className="redirect-message">Verrai reindirizzato al login tra 2 secondi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <h2>🔐 RESETTA PASSWORD</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nuova Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

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

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? '⏳ Attendere...' : 'RESETTA PASSWORD'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-back"
        >
          Torna al Login
        </button>
      </div>
    </div>
  );
}

export default ResetPassword;
