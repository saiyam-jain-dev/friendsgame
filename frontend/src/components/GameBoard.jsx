import React, { useState, useEffect } from 'react';

export default function GameBoard({ room, socket }) {
  const [selectedOption, setSelectedOption] = useState(null);

  const currentSocketId = socket?.id;
  const isHost = room?.hostId === currentSocketId;
  const currentQuestion = room?.currentQuestion;
  const status = room?.status; // 'selecting' | 'guessing' | 'reveal'
  const timer = room?.timer;
  const players = room?.players || [];
  const guesses = room?.guesses || {};

  // Reset local state when round changes
  useEffect(() => {
    setSelectedOption(null);
  }, [room?.currentRound]);

  if (!room || !currentQuestion) {
    return (
      <div className="glass-card text-center">
        <div className="spinner"></div>
        <h2>Loading flirty question...</h2>
      </div>
    );
  }

  const handleSelectOption = (optionLetter) => {
    if (selectedOption || guesses[currentSocketId]) return; // already submitted

    setSelectedOption(optionLetter);
    socket.emit('submitGuess', optionLetter);
    socket.emit('submitTargetAnswer', optionLetter);
  };

  // Option letters mapping
  const options = [
    { letter: 'A', text: currentQuestion.option_a },
    { letter: 'B', text: currentQuestion.option_b },
    { letter: 'C', text: currentQuestion.option_c },
    { letter: 'D', text: currentQuestion.option_d }
  ];

  const submittedCount = players.filter(p => guesses[p.socketId]).length;
  const mySubmittedChoice = selectedOption || guesses[currentSocketId];

  // ----------------------------------------------------
  // PHASE 1 & 2: SELECTING / GUESSING FLIRTY CHOICES
  // ----------------------------------------------------
  if (status === 'selecting' || status === 'guessing') {
    return (
      <div className="glass-card" style={{ maxWidth: '540px' }}>
        <div className="game-header">
          <div className="round-tracker" style={{ color: 'var(--accent-pink)', fontWeight: 'bold' }}>
            💕 Round <span>{room.currentRound}</span> of {room.totalRounds}
          </div>
          <div className={`timer-ring ${timer <= 5 ? 'low-time' : ''}`}>{timer}</div>
        </div>

        <div className="text-center" style={{ marginBottom: '1rem' }}>
          <span className="target-badge" style={{ backgroundColor: '#ff4b8b', color: '#FFF', fontWeight: 'bold', fontSize: '0.85rem' }}>
            🔥 FLIRTY CHOICE
          </span>
          <p className="game-prompt" style={{ marginTop: '0.4rem', fontSize: '0.95rem' }}>
            Select what you think your partner/friend likes the most!
          </p>
        </div>

        <h2 className="question-text" style={{ fontSize: '1.25rem', textAlign: 'center', marginBottom: '1.5rem', lineHeight: '1.4' }}>
          {currentQuestion.question_text}
        </h2>

        <div className="options-stack">
          {options.map((opt) => (
            <button
              key={opt.letter}
              className={`option-button ${mySubmittedChoice === opt.letter ? 'selected' : ''}`}
              onClick={() => handleSelectOption(opt.letter)}
              disabled={Boolean(mySubmittedChoice)}
            >
              <span className="option-letter">{opt.letter}</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{opt.text}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          {mySubmittedChoice ? (
            <div style={{
              backgroundColor: 'rgba(255, 75, 139, 0.15)',
              border: '1px solid var(--accent-pink)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: '#FFF',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              💖 Selection Locked! Waiting for partner ({submittedCount}/{players.length} ready)...
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Choose your answer before the timer runs out!
            </p>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PHASE 3: REVEAL FLIRTY ANSWERS & MATCH RESULTS
  // ----------------------------------------------------
  if (status === 'reveal') {
    const isMatch = room.isMatch;

    return (
      <div className="glass-card" style={{ maxWidth: '540px' }}>
        <div className="game-header">
          <div className="round-tracker" style={{ color: 'var(--accent-pink)', fontWeight: 'bold' }}>
            💕 Round <span>{room.currentRound}</span> of {room.totalRounds}
          </div>
          <div className="timer-ring low-time">{timer}</div>
        </div>

        <div className="text-center" style={{ marginBottom: '1rem' }}>
          {isMatch ? (
            <span className="target-badge" style={{ backgroundColor: '#22c55e', color: '#FFF', padding: '0.4rem 1rem', fontSize: '0.95rem', fontWeight: '800' }}>
              🔥 PERFECT FLIRTY MATCH! (+100 PTS)
            </span>
          ) : (
            <span className="target-badge" style={{ backgroundColor: '#a855f7', color: '#FFF', padding: '0.4rem 1rem', fontSize: '0.95rem', fontWeight: '800' }}>
              💕 FLIRTY CHOICES REVEALED! (+50 PTS)
            </span>
          )}
          <p className="game-prompt" style={{ marginTop: '0.5rem', fontSize: '1rem', fontWeight: '600', color: isMatch ? '#4ade80' : 'var(--snap-yellow)' }}>
            {isMatch ? 'You both picked the exact same flirty option!' : 'Opposites attract! Here is what both of you selected:'}
          </p>
        </div>

        <h2 className="question-text" style={{ fontSize: '1.2rem', textAlign: 'center', marginBottom: '1.25rem' }}>
          {currentQuestion.question_text}
        </h2>

        {/* Options Stack with Player Badges */}
        <div className="options-stack">
          {options.map((opt) => {
            const playersWhoPicked = players.filter(p => guesses[p.socketId] === opt.letter);
            const isSelected = playersWhoPicked.length > 0;

            return (
              <div
                key={opt.letter}
                className={`option-button ${isSelected ? (isMatch ? 'correct' : 'selected') : ''}`}
                style={{ cursor: 'default', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.85rem' }}
              >
                <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <span className="option-letter">{opt.letter}</span>
                  <span style={{ flexGrow: 1, fontWeight: '500' }}>{opt.text}</span>
                </div>

                {playersWhoPicked.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {playersWhoPicked.map((p) => (
                      <span key={p.socketId} style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#FFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        💋 {p.displayName} {p.socketId === currentSocketId && '(You)'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Player Choices Side-by-Side Summary */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem', letterSpacing: '1px' }}>
            💌 Summary of Selections:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {players.map((p) => {
              const pChoice = guesses[p.socketId];
              const chosenObj = options.find(o => o.letter === pChoice);
              return (
                <div key={p.socketId} style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  fontSize: '0.85rem'
                }}>
                  <span style={{ fontWeight: '600' }}>{p.displayName}:</span>
                  <span style={{ color: 'var(--snap-yellow)', fontWeight: 'bold' }}>
                    {pChoice ? `Option ${pChoice} - ${chosenObj ? chosenObj.text : ''}` : 'No selection'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {isHost && (
          <button 
            onClick={() => socket.emit('triggerNextRound')}
            className="btn btn-primary mt-4"
            style={{ padding: '0.8rem', width: '100%', fontWeight: 'bold' }}
          >
            {room.currentRound === room.totalRounds ? 'See Final Leaderboard 🏆' : 'Next Round →'}
          </button>
        )}
      </div>
    );
  }

  return null;
}
