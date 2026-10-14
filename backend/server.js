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

// Login Endpoint (triggers OTP step)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  try {
    const formattedUsername = username.trim().toLowerCase();
    // let user = await User.findOne({ username: formattedUsername });


    user = await User.create({
      username: formattedUsername,
      passwordHash: password || 'default',
      displayName: username.trim()
    });


    // Generate a demo 6-digit OTP
    const generatedOtp = '';
    user.otpCode = generatedOtp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60000);
    await user.save();

    console.log(`\n==============================================`);
    console.log(`[LOGIN SERVICE] USER ${formattedUsername} logged in. OTP sent: ${generatedOtp}`);
    console.log(`==============================================\n`);

    res.json({
      success: true,
      message: 'Login credentials accepted. Please input verification code.',
      username: formattedUsername,
      debugOtp: generatedOtp
    });
  } catch (err) {
    console.error(err);
    console.log("lalala")
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP Endpoint
app.post('/api/verify-otp', async (req, res) => {
  const { username, code } = req.body;
  console.log("lalalalala");

  if (!username || !code) {
    return res.status(400).json({ error: 'Username and verification code required' });
  }

  const formattedUsername = username.trim().toLowerCase();

  try {
    let user = await User.findOne({ username: formattedUsername });
    if (!user) {
      user = await User.create({
        username: formattedUsername,
        passwordHash: 'default',
        displayName: username.trim()
      });
    }
    user.otpCode = code;
    await user.save();

    const payload = {
      userId: user._id,
      username: user.username,
      displayName: user.displayName || user.username
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    console.log(`\n==============================================`);
    console.log(`[OTP VERIFIED] USER ${formattedUsername} verified OTP code: ${code}`);
    console.log(`==============================================\n`);

    res.json({
      success: true,
      token,
      user: payload
    });
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


const roomTimers = {};

function clearRoomTimer(code) {
  if (roomTimers[code]) {
    clearInterval(roomTimers[code]);
    delete roomTimers[code];
  }
}

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
      // Fetch random questions from MongoDB with fallback
      let dbQuestions = await Question.aggregate([{ $sample: { size: 5 } }]);
      if (!dbQuestions || dbQuestions.length === 0) {
        dbQuestions = await Question.find().limit(5);
      }

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

  // Player Submits Answer/Choice for the flirty question
  socket.on('submitTargetAnswer', (answer) => {
    handlePlayerSubmission(socket.id, answer);
  });

  socket.on('submitGuess', (guess) => {
    handlePlayerSubmission(socket.id, guess);
  });

  function handlePlayerSubmission(socketId, answer) {
    const room = rooms[currentRoomCode];
    if (!room || (room.status !== 'selecting' && room.status !== 'guessing')) return;

    room.guesses[socketId] = answer;
    if (room.targetPlayer && room.targetPlayer.socketId === socketId) {
      room.targetAnswer = answer;
    }

    // Check if all connected players in the room have submitted their answer
    const allSubmitted = room.players.every(p => room.guesses[p.socketId]);

    if (allSubmitted) {
      clearRoomTimer(room.code);
      revealRoundResults(room);
    } else {
      io.to(room.code).emit('roomUpdated', room);
    }
  }

  // Next Round Trigger (from Host)
  socket.on('triggerNextRound', () => {
    const room = rooms[currentRoomCode];
    if (!room || room.hostId !== socket.id || room.status !== 'reveal') return;

    clearRoomTimer(room.code);

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

    clearRoomTimer(room.code);

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
          clearRoomTimer(room.code);
          delete rooms[currentRoomCode];
          console.log(`Room ${currentRoomCode} deleted because it became empty`);
        } else {
          // If host disconnected, assign new host
          if (room.hostId === socket.id) {
            room.hostId = room.players[0].socketId;
            console.log(`Host disconnected. Assigned ${room.players[0].displayName} as new host`);
          }

          if (room.status !== 'lobby' && room.status !== 'leaderboard') {
            const allSubmitted = room.players.every(p => room.guesses[p.socketId]);
            if (allSubmitted && room.players.length > 0) {
              clearRoomTimer(room.code);
              revealRoundResults(room);
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

  // Start selection phase timer (30 seconds)
  startTimer(room, 30, () => {
    // If time expires, reveal whatever was chosen or auto-fill fallback
    room.players.forEach(p => {
      if (!room.guesses[p.socketId]) {
        room.guesses[p.socketId] = 'A';
      }
    });
    revealRoundResults(room);
  });

  io.to(room.code).emit('roomUpdated', room);
  console.log(`Room ${room.code}: Started Round ${room.currentRound}. Question: ${room.currentQuestion?.question_text}`);
}

// Helper: Start Room Timer
function startTimer(room, seconds, callback) {
  clearRoomTimer(room.code);
  room.timer = seconds;

  io.to(room.code).emit('timerUpdate', room.timer);

  roomTimers[room.code] = setInterval(() => {
    room.timer -= 1;
    io.to(room.code).emit('timerUpdate', room.timer);

    if (room.timer <= 0) {
      clearRoomTimer(room.code);
      callback();
    }
  }, 1000);
}

// Helper: Reveal results and award points
function revealRoundResults(room) {
  room.status = 'reveal';

  const guesses = room.guesses;
  const playerIds = Object.keys(guesses);

  // Check flirty match condition (e.g. if 2 players pick the same option or target match)
  let isPerfectMatch = false;
  if (room.players.length === 2) {
    const g1 = guesses[room.players[0].socketId];
    const g2 = guesses[room.players[1].socketId];
    if (g1 && g2 && g1 === g2) {
      isPerfectMatch = true;
    }
  }

  // Award score
  room.players.forEach(p => {
    const playerGuess = guesses[p.socketId];
    if (isPerfectMatch) {
      p.score += 100; // Perfect sync bonus!
    } else if (playerGuess) {
      p.score += 50; // Flirty participation points
    }
  });

  room.isMatch = isPerfectMatch;

  io.to(room.code).emit('roomUpdated', room);
  io.to(room.code).emit('roundEnded', {
    guesses: room.guesses,
    isMatch: isPerfectMatch
  });

  // Auto-advance after 8 seconds
  startTimer(room, 8, () => {
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
  clearRoomTimer(room.code);

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
