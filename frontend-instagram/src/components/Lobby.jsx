import React, { useState, useEffect, useRef } from 'react';

export default function Lobby({ room, socket, onStartGame, onLeaveRoom }) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);

  const players = room?.players || [];
  const currentSocketId = socket?.id;
  const isHost = room?.hostId === currentSocketId;
  const roomCode = room?.code || '';

  // Copy Room Code Helper
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Socket chat listeners
  useEffect(() => {
    if (!socket) return;

    const handleChat = (msg) => {
      setChatLog((prev) => [...prev, msg]);
    };

    socket.on('chatMessage', handleChat);

    return () => {
      socket.off('chatMessage', handleChat);
    };
  }, [socket]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socket) return;
    socket.emit('sendChatMessage', chatMessage.trim());
    setChatMessage('');
  };

  return (
    <div className="glass-card" style={{ maxWidth: '500px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button 
          onClick={onLeaveRoom}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          ← Quit Lobby
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Lobby status: <strong style={{ color: 'var(--accent-green)' }}>WAITING</strong>
        </span>
      </div>

      <div className="brand-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="brand-title" style={{ fontSize: '1.8rem' }}>Game <span>Lobby</span></h1>
      </div>

      <div className="lobby-code-box" onClick={copyRoomCode}>
        <div className="lobby-code-title">{copied ? 'Copied to Clipboard!' : 'Share Room Code (Click to Copy)'}</div>
        <div className="lobby-code-val">{roomCode}</div>
      </div>

      <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
        Connected Friends ({players.length})
      </h3>

      <div className="lobby-players">
        {players.map((player) => {
          const isPlayerHost = room.hostId === player.socketId;
          const isSelf = player.socketId === currentSocketId;
          return (
            <div key={player.socketId} className={`player-row ${isPlayerHost ? 'is-host' : ''}`}>
              <img src={player.avatar} alt="Avatar" className="player-avatar" />
              <div className="player-info">
                <span className="player-name" style={{ color: isSelf ? 'var(--ig-pink)' : '#FFF' }}>
                  {player.displayName} {isSelf && '(You)'}
                </span>
                {isPlayerHost && <span className="player-tag">Host</span>}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {player.score} pts
              </div>
            </div>
          );
        })}
      </div>

      {/* Lobby Chat Box */}
      <div className="chat-container">
        <div className="chat-messages">
          {chatLog.length === 0 ? (
            <div style={{ color: '#606075', fontStyle: 'italic', textAlign: 'center', marginTop: '1.5rem' }}>
              No messages yet. Say hello!
            </div>
          ) : (
            chatLog.map((msg, index) => (
              <div key={index} className="chat-msg">
                <span className="chat-sender">{msg.sender}: </span>
                <span className="chat-text">{msg.text}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendChat} className="chat-input-row">
          <input
            type="text"
            className="chat-input"
            placeholder="Send a chat message..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
          />
          <button type="submit" className="btn-send">Send</button>
        </form>
      </div>

      {isHost ? (
        <button 
          onClick={onStartGame} 
          className="btn btn-primary"
          disabled={players.length < 1} // Change to 2 in production if desired
        >
          {players.length === 1 ? 'Start Game (Solo Demo Mode)' : 'Start Game'}
        </button>
      ) : (
        <div className="waiting-screen" style={{ padding: '0.5rem 0' }}>
          <div className="waiting-subtitle" style={{ fontSize: '0.95rem' }}>
            Waiting for Host to start the game...
          </div>
        </div>
      )}
    </div>
  );
}
