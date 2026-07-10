import React, { useState } from 'react';

export default function Dashboard({ user, onCreateRoom, onJoinRoom, errorMsg, onLogout }) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState(errorMsg || '');

  const handleJoin = (e) => {
    e.preventDefault();
    setError('');
    if (!roomCode.trim()) {
      setError('Please enter a room code.');
      return;
    }
    if (roomCode.trim().length !== 4) {
      setError('Room code must be exactly 4 letters.');
      return;
    }
    onJoinRoom(roomCode.trim().toUpperCase());
  };

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.displayName)}`;

  return (
    <div className="glass-card" style={{ maxWidth: '500px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src={avatarUrl} 
            alt="Profile Avatar" 
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--snap-yellow)' }}
          />
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{user.displayName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{user.username}</div>
          </div>
        </div>
        <button 
          onClick={onLogout} 
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-pink)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Sign Out
        </button>
      </div>

      <div className="brand-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="brand-title" style={{ fontSize: '1.8rem' }}>Friends <span>Lounge</span></h1>
        <p className="brand-subtitle">Host a room or enter a friend's room code to start playing</p>
      </div>

      {(error || errorMsg) && <div className="error-banner">{error || errorMsg}</div>}

      <div className="dashboard-grid">
        <div className="dashboard-card" onClick={onCreateRoom}>
          <span className="dashboard-card-icon">🎮</span>
          <h2 className="dashboard-card-title">Create Room</h2>
          <p className="dashboard-card-desc">Be the host and invite friends</p>
        </div>

        <div className="dashboard-card" style={{ cursor: 'default' }}>
          <span className="dashboard-card-icon">⚡</span>
          <h2 className="dashboard-card-title">Join Room</h2>
          <p className="dashboard-card-desc">Enter code to join friends</p>
        </div>
      </div>

      <form onSubmit={handleJoin} style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Enter Room Code"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              setError('');
            }}
            maxLength={4}
            style={{ textTransform: 'uppercase', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 1.5rem' }}>
            Join
          </button>
        </div>
      </form>

      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          📖 How to Play
        </h3>
        <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: '1.5' }}>
          <li>One friend is designated as the <strong>Target</strong> each round.</li>
          <li>The Target secretly answers a trivia question about themselves.</li>
          <li>All other friends guess what they think the Target picked.</li>
          <li>Earn <strong>100 pts</strong> for correct guesses! Targets get points when they are guessed correctly!</li>
        </ul>
      </div>
    </div>
  );
}
