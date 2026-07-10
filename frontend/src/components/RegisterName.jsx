import React, { useState } from 'react';

export default function RegisterName({ initialName, onNameConfirm }) {
  const [displayName, setDisplayName] = useState(initialName || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter a display name.');
      return;
    }
    onNameConfirm(displayName.trim());
  };

  // Generate dynamic robot avatar seed
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName || 'Guest')}`;

  return (
    <div className="glass-card">
      <div className="brand-header">
        <h1 className="brand-title">Who's <span>Playing?</span></h1>
        <p className="brand-subtitle">
          Choose the nickname that your friends will see during the game.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <img 
          src={avatarUrl} 
          alt="Avatar Preview" 
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '3px solid var(--snap-yellow)',
            padding: '4px',
            boxShadow: '0 8px 24px rgba(255, 252, 0, 0.2)',
            transition: 'transform 0.3s ease'
          }}
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Your Game Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="Enter Display Name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setError('');
            }}
            maxLength={18}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary mt-4">
          Enter Game Lounge
        </button>
      </form>
    </div>
  );
}
