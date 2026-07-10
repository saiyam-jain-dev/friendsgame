import React, { useState, useEffect } from 'react';

export default function GameBoard({ room, socket }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [roundWinnerData, setRoundWinnerData] = useState(null);

  const currentSocketId = socket?.id;
  const isHost = room?.hostId === currentSocketId;
  const targetPlayer = room?.targetPlayer;
  const isTarget = targetPlayer?.socketId === currentSocketId;
  const currentQuestion = room?.currentQuestion;
  const status = room?.status; // 'selecting' | 'guessing' | 'reveal'
  const timer = room?.timer;

  // Reset local state when round changes
  useEffect(() => {
    setSelectedOption(null);
  }, [room?.currentRound]);

  // Listen for round results to show who got it right
  useEffect(() => {
    if (!socket) return;
    const handleRoundEnd = (data) => {
      setRoundWinnerData(data);
    };
    socket.on('roundEnded', handleRoundEnd);
    return () => {
      socket.off('roundEnded', handleRoundEnd);
    };
  }, [socket]);

  if (!room || !currentQuestion) {
    return (
      <div className="glass-card text-center">
        <div className="spinner"></div>
        <h2>Loading game data...</h2>
      </div>
    );
  }

  const handleSelectOption = (optionLetter) => {
    if (selectedOption) return; // already submitted

    setSelectedOption(optionLetter);

    if (isTarget) {
      // Target submits their actual answer
      socket.emit('submitTargetAnswer', optionLetter);
    } else {
      // Guesser submits their guess
      socket.emit('submitGuess', optionLetter);
    }
  };

  // Option letters mapping
  const options = [
    { letter: 'A', text: currentQuestion.option_a },
    { letter: 'B', text: currentQuestion.option_b },
    { letter: 'C', text: currentQuestion.option_c },
    { letter: 'D', text: currentQuestion.option_d }
  ];

  // ----------------------------------------------------
  // PHASE 1: TARGET SELECTING ANSWER
  // ----------------------------------------------------
  if (status === 'selecting') {
    return (
      <div className="glass-card" style={{ maxWidth: '520px' }}>
        <div className="game-header">
          <div className="round-tracker">
            Round <span>{room.currentRound}</span> of {room.totalRounds}
          </div>
          <div className={`timer-ring ${timer <= 5 ? 'low-time' : ''}`}>{timer}</div>
        </div>

        {isTarget ? (
          <div>
            <div className="text-center">
              <span className="target-badge" style={{ backgroundColor: 'var(--snap-yellow)', color: '#000' }}>
                🌟 You are the TARGET!
              </span>
              <p className="game-prompt">Choose the answer that is TRUE about you:</p>
            </div>

            <h2 className="question-text">{currentQuestion.question_text}</h2>

            <div className="options-stack">
              {options.map((opt) => (
                <button
                  key={opt.letter}
                  className={`option-button ${selectedOption === opt.letter ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(opt.letter)}
                  disabled={selectedOption !== null}
                >
                  <span className="option-letter">{opt.letter}</span>
                  <span>{opt.text}</span>
                </button>
              ))}
            </div>
            
            <p className="text-center" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {selectedOption ? 'Answer submitted! Waiting for friends...' : 'Choose quickly!'}
            </p>
          </div>
        ) : (
          <div className="waiting-screen">
            <div className="spinner"></div>
            <span className="target-badge">Target Friend: {targetPlayer?.displayName}</span>
            <h2 className="waiting-title" style={{ marginTop: '1rem' }}>
              {targetPlayer?.displayName} is choosing...
            </h2>
            <p className="waiting-subtitle" style={{ padding: '0 1rem' }}>
              They are answering a question about themselves. Get ready to guess what they choose!
            </p>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // PHASE 2: OTHER PLAYERS GUESSING
  // ----------------------------------------------------
  if (status === 'guessing') {
    // Check if player has already submitted guess
    const hasGuessed = selectedOption !== null;
    const guessers = room.players.filter(p => p.socketId !== targetPlayer.socketId);
    const guessedCount = guessers.filter(p => room.guesses[p.socketId]).length;

    return (
      <div className="glass-card" style={{ maxWidth: '520px' }}>
        <div className="game-header">
          <div className="round-tracker">
            Round <span>{room.currentRound}</span> of {room.totalRounds}
          </div>
          <div className={`timer-ring ${timer <= 5 ? 'low-time' : ''}`}>{timer}</div>
        </div>

        {isTarget ? (
          <div className="waiting-screen">
            <div className="spinner" style={{ borderColor: 'rgba(14,146,243,0.1)', borderLeftColor: 'var(--accent-blue)' }}></div>
            <span className="target-badge">Locked In: Option {room.targetAnswer}</span>
            <h2 className="waiting-title" style={{ marginTop: '1rem' }}>
              Friends are guessing...
            </h2>
            <p className="waiting-subtitle">
              Submitted: {guessedCount} of {guessers.length} players
            </p>
            
            <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Guess Log:
              </h4>
              {guessers.map((p) => (
                <div key={p.socketId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.85rem' }}>
                  <span>{p.displayName}</span>
                  <span style={{ color: room.guesses[p.socketId] ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                    {room.guesses[p.socketId] ? '✓ Guessed' : 'Thinking...'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center">
              <span className="target-badge">Target Friend: {targetPlayer?.displayName}</span>
              <p className="game-prompt">What will {targetPlayer?.displayName} choose?</p>
            </div>

            <h2 className="question-text">{currentQuestion.question_text}</h2>

            <div className="options-stack">
              {options.map((opt) => (
                <button
                  key={opt.letter}
                  className={`option-button ${selectedOption === opt.letter ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(opt.letter)}
                  disabled={hasGuessed}
                >
                  <span className="option-letter">{opt.letter}</span>
                  <span>{opt.text}</span>
                </button>
              ))}
            </div>

            <p className="text-center" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {hasGuessed 
                ? `You guessed Option ${selectedOption}. Waiting for others (${guessedCount}/${guessers.length})...`
                : 'Select the option you think they chose!'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // PHASE 3: REVEAL ANSWERS & SCORING
  // ----------------------------------------------------
  if (status === 'reveal') {
    const targetAns = room.targetAnswer;

    return (
      <div className="glass-card" style={{ maxWidth: '520px' }}>
        <div className="game-header">
          <div className="round-tracker">
            Round <span>{room.currentRound}</span> of {room.totalRounds}
          </div>
          <div className="timer-ring low-time">{timer}</div>
        </div>

        <div className="text-center">
          <span className="target-badge" style={{ backgroundColor: 'var(--accent-green)', color: '#000' }}>
            Reveal Phase
          </span>
          <p className="game-prompt">
            {isTarget 
              ? `You selected Option ${targetAns}` 
              : `${targetPlayer?.displayName} selected Option ${targetAns}!`}
          </p>
        </div>

        <h2 className="question-text">{currentQuestion.question_text}</h2>

        <div className="options-stack">
          {options.map((opt) => {
            const isCorrect = opt.letter === targetAns;
            const wasGuessedByMe = selectedOption === opt.letter;
            let optClass = '';
            
            if (isCorrect) {
              optClass = 'correct';
            } else if (wasGuessedByMe && !isTarget) {
              optClass = 'incorrect';
            }

            return (
              <div
                key={opt.letter}
                className={`option-button ${optClass}`}
                style={{ cursor: 'default' }}
              >
                <span className="option-letter">{opt.letter}</span>
                <span style={{ flexGrow: 1 }}>{opt.text}</span>
                {isCorrect && <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>✓ Correct Answer</span>}
                {wasGuessedByMe && !isTarget && !isCorrect && (
                  <span style={{ color: 'var(--accent-pink)', fontWeight: 'bold' }}>Your Guess</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Who guessed what:
          </h4>
          <div className="reveal-grid">
            {room.players.map((p) => {
              if (p.socketId === targetPlayer.socketId) {
                return (
                  <div key={p.socketId} className="reveal-guess-row" style={{ borderLeft: '3px solid var(--snap-yellow)' }}>
                    <strong>{p.displayName} (Target)</strong>
                    <span style={{ color: 'var(--snap-yellow)' }}>Picked Option {targetAns}</span>
                  </div>
                );
              }

              const pGuess = room.guesses[p.socketId];
              const isCorrectGuess = pGuess === targetAns;

              return (
                <div key={p.socketId} className="reveal-guess-row">
                  <span>{p.displayName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: isCorrectGuess ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                      Guessed Option {pGuess || 'None'}
                    </span>
                    <span className={`guess-status-pill ${isCorrectGuess ? 'correct' : 'incorrect'}`}>
                      {isCorrectGuess ? '+100 pts' : '+0 pts'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isHost && (
          <button 
            onClick={() => socket.emit('triggerNextRound')}
            className="btn btn-primary mt-4"
            style={{ padding: '0.8rem' }}
          >
            {room.currentRound === room.totalRounds ? 'See Final Leaderboard' : 'Next Round (Skip Timer)'}
          </button>
        )}
      </div>
    );
  }

  return null;
}
