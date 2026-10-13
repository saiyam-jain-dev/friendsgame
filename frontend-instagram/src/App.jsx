import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { BACKEND_URL } from './config';
import Login from './components/Login';
import OtpVerify from './components/OtpVerify';
import RegisterName from './components/RegisterName';
import Dashboard from './components/Dashboard';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import Leaderboard from './components/Leaderboard';

export default function App() {
  // Navigation Screens: 'login' | 'otp' | 'register_name' | 'dashboard' | 'lobby' | 'game' | 'leaderboard'
  const [screen, setScreen] = useState('login');
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [debugOtp, setDebugOtp] = useState('');

  // Game Room & WebSockets state
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Check token validity on mount
  useEffect(() => {
    const verifySavedToken = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/verify-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setUser(data.user);
          setScreen('dashboard');
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Failed to verify token:', err);
      }
    };
    verifySavedToken();
  }, [token]);

  // 2. Establish Socket connection on demand (e.g. when entering dashboard or joining rooms)
  const connectSocket = (currentUser) => {
    if (socket) return socket;

    const newSocket = io(BACKEND_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to socket server:', newSocket.id);
      newSocket.emit('registerSocket', {
        username: currentUser.username,
        displayName: currentUser.displayName
      });
    });

    newSocket.on('roomCreated', (roomData) => {
      setRoom(roomData);
      setScreen('lobby');
      setErrorMsg('');
    });

    newSocket.on('joinSuccess', (roomData) => {
      setRoom(roomData);
      setScreen('lobby');
      setErrorMsg('');
    });

    newSocket.on('roomUpdated', (roomData) => {
      setRoom(roomData);
      
      // Handle page transitions based on game state
      if (roomData.status === 'lobby') {
        setScreen('lobby');
      } else if (roomData.status === 'selecting' || roomData.status === 'guessing' || roomData.status === 'reveal') {
        setScreen('game');
      } else if (roomData.status === 'leaderboard') {
        setScreen('leaderboard');
      }
    });

    newSocket.on('errorMsg', (msg) => {
      setErrorMsg(msg);
      // If error occurs, push user back to dashboard if they were stuck
      if (screen === 'login' || screen === 'otp' || screen === 'register_name') {
        // do nothing
      } else {
        setScreen('dashboard');
      }
    });

    setSocket(newSocket);
    return newSocket;
  };

  // Auth Action handlers
  const handleLoginSuccess = ({ username, debugOtp }) => {
    setLoginUsername(username);
    setDebugOtp(debugOtp);
    setScreen('otp');
  };

  const handleOtpSuccess = (receivedToken, receivedUser) => {
    localStorage.setItem('token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    setScreen('dashboard');
  };

  const handleNameConfirm = async (newName) => {
    setErrorMsg('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/update-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName: newName })
      });
      
      if (res.ok) {
        const updatedUser = { ...user, displayName: newName };
        setUser(updatedUser);
        setScreen('dashboard');
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to update game display name.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to server.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setRoom(null);
    setScreen('login');
  };

  // Game Lobby Actions
  const handleCreateRoom = () => {
    setErrorMsg('');
    if (!user) return;
    const activeSocket = connectSocket(user);
    activeSocket.emit('createRoom');
  };

  const handleJoinRoom = (code) => {
    setErrorMsg('');
    if (!user) return;
    const activeSocket = connectSocket(user);
    activeSocket.emit('joinRoom', code);
  };

  const handleStartGame = () => {
    if (socket) {
      socket.emit('startGame');
    }
  };

  const handlePlayAgain = () => {
    if (socket) {
      socket.emit('playAgain');
    }
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setRoom(null);
    setScreen('dashboard');
  };

  // Sync state if user details changed (e.g. name update)
  useEffect(() => {
    if (socket && user) {
      socket.emit('registerSocket', {
        username: user.username,
        displayName: user.displayName
      });
    }
  }, [user?.displayName, socket]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '1.5rem',
      position: 'relative'
    }}>
      {/* Dynamic Screen Dispatcher */}
      {screen === 'login' && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}

      {screen === 'otp' && (
        <OtpVerify 
          username={loginUsername} 
          debugOtp={debugOtp}
          onOtpSuccess={handleOtpSuccess} 
          onBack={() => setScreen('login')} 
        />
      )}

      {screen === 'register_name' && (
        <RegisterName 
          initialName={user?.displayName} 
          onNameConfirm={handleNameConfirm} 
        />
      )}

      {screen === 'dashboard' && (
        <Dashboard 
          user={user} 
          onCreateRoom={handleCreateRoom} 
          onJoinRoom={handleJoinRoom} 
          errorMsg={errorMsg}
          onLogout={handleLogout} 
        />
      )}

      {screen === 'lobby' && (
        <Lobby 
          room={room} 
          socket={socket} 
          onStartGame={handleStartGame} 
          onLeaveRoom={handleLeaveRoom} 
        />
      )}

      {screen === 'game' && (
        <GameBoard 
          room={room} 
          socket={socket} 
        />
      )}

      {screen === 'leaderboard' && (
        <Leaderboard 
          room={room} 
          socket={socket} 
          onPlayAgain={handlePlayAgain} 
          onLeaveRoom={handleLeaveRoom} 
        />
      )}

      {/* Small floating footer */}
      <footer style={{
        position: 'absolute',
        bottom: '1rem',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        opacity: 0.6
      }}>
        Know Your Partner © 2026 • Instagram Integrated Styling
      </footer>
    </div>
  );
}
