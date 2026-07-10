import React from 'react';

export default function Leaderboard({ room, socket, onPlayAgain, onLeaveRoom }) {
  const currentSocketId = socket?.id;
  const isHost = room?.hostId === currentSocketId;
  const players = [...(room?.players || [])].sort((a, b) => b.score - a.score);

  const winner = players[0];

  return (
    <div className="glass-card" style={{ maxWidth: '500px' }}>
      <div className="brand-header" style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '3rem' }}>🏆</span>
        <h1 className="brand-title">Final <span>Standings</span></h1>
        <p className="brand-subtitle">How well did you know your friends?</p>
      </div>

      {winner && (
        <div style={{
          backgroundColor: 'rgba(255, 252, 0, 0.08)',
          border: '2px solid var(--snap-yellow)',
          borderRadius: '24px',
          padding: '1.5rem',
          textAlign: 'center',
          marginBottom: '2rem',
          boxShadow: '0 0 25px rgba(255, 252, 0, 0.15)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '2rem'
          }}>
            👑
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#FFF' }}>{winner.displayName}</h2>
          <p style={{ color: 'var(--snap-yellow)', fontWeight: '700', fontSize: '1.1rem', marginTop: '0.25rem' }}>
            Ultimate Best Friend ({winner.score} pts)
          </p>
        </div>
      )}

      <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
        Scoreboard
      </h3>

      <div className="leaderboard-list">
        {players.map((player, index) => {
          const isSelf = player.socketId === currentSocketId;
          let medal = '';
          if (index === 0) medal = '🥇';
          else if (index === 1) medal = '🥈';
          else if (index === 2) medal = '🥉';
          else medal = `#${index + 1}`;

          return (
            <div key={player.socketId} className="leaderboard-row" style={{
              borderColor: isSelf ? 'rgba(255,252,0,0.2)' : 'transparent'
            }}>
              <span className="leaderboard-rank">{medal}</span>
              <img src={player.avatar} alt="Avatar" className="player-avatar" style={{ width: '36px', height: '36px' }} />
              <div className="player-info">
                <span className="player-name" style={{ color: isSelf ? 'var(--snap-yellow)' : '#FFF' }}>
                  {player.displayName} {isSelf && '(You)'}
                </span>
              </div>
              <span className="leaderboard-score">{player.score} pts</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
        {isHost ? (
          <button onClick={onPlayAgain} className="btn btn-primary" style={{ flexGrow: 2 }}>
            Play Again (Lobby)
          </button>
        ) : (
          <div style={{ flexGrow: 2, textAlign: 'center', alignSelf: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Waiting for Host to restart the game...
          </div>
        )}
        <button onClick={onLeaveRoom} className="btn btn-secondary" style={{ width: 'auto' }}>
          Leave Room
        </button>
      </div>
    </div>
  );
}
