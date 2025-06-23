import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Gamepad2, Users, Zap, Trophy, Play, Plus, LogIn, Wifi, WifiOff } from 'lucide-react';
import GameCanvas from './GameCanvas';

const SOCKET_URL = 'http://localhost:3000';

interface LandingPageProps {}

export default function LandingPage({}: LandingPageProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentView, setCurrentView] = useState<'landing' | 'game'>('landing');
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [error, setError] = useState('');
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      setError('');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
      setError('Connection lost');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setConnected(false);
      setError('Failed to connect to server');
    });

    newSocket.on('gameState', (state) => {
      setPlayerCount(state.players.filter((p: { alive: boolean }) => p.alive).length);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const createRoom = async () => {
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }

    setIsCreatingRoom(true);
    setError('');

    try {
      socket.emit('createRoom', (res: { code: string }) => {
        console.log('Room created:', res.code);
        setRoomCode(res.code);
        
        socket.emit('joinRoom', res.code, (joinRes: { success: boolean; message?: string }) => {
          if (joinRes.success) {
            socket.emit('join', res.code, (gameRes: { success: boolean; message?: string }) => {
              if (gameRes.success) {
                setCurrentView('game');
              } else {
                setError(gameRes.message || 'Failed to join game');
              }
              setIsCreatingRoom(false);
            });
          } else {
            setError(joinRes.message || 'Failed to join room');
            setIsCreatingRoom(false);
          }
        });
      });
    } catch (err) {
      setError('Failed to create room');
      setIsCreatingRoom(false);
    }
  };

  const joinRoom = async () => {
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }

    if (!inputRoomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsJoiningRoom(true);
    setError('');

    try {
      const code = inputRoomCode.trim().toUpperCase();
      
      socket.emit('joinRoom', code, (joinRes: { success: boolean; message?: string }) => {
        if (joinRes.success) {
          socket.emit('join', code, (gameRes: { success: boolean; message?: string }) => {
            if (gameRes.success) {
              setRoomCode(code);
              setCurrentView('game');
            } else {
              setError(gameRes.message || 'Failed to join game');
            }
            setIsJoiningRoom(false);
          });
        } else {
          setError(joinRes.message || 'Room not found');
          setIsJoiningRoom(false);
        }
      });
    } catch (err) {
      setError('Failed to join room');
      setIsJoiningRoom(false);
    }
  };

  const leaveGame = () => {
    if (socket && roomCode) {
      socket.emit('leaveRoom', roomCode);
    }
    setCurrentView('landing');
    setRoomCode('');
    setInputRoomCode('');
    setError('');
    setPlayerCount(0);
  };

  if (currentView === 'game' && socket && roomCode) {
    return (
      <div className="relative">
        <button
          onClick={leaveGame}
          className="absolute top-4 left-4 z-50 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          Leave Game
        </button>
        <GameCanvas socket={socket} roomCode={roomCode} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ top: '20%', left: '10%' }} />
        <div className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{ top: '60%', left: '80%' }} />
        <div className="absolute w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{ top: '80%', left: '20%' }} />
        <div className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-pulse" style={{ top: '30%', left: '70%' }} />
        <div className="absolute w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ top: '15%', left: '85%' }} />
        <div className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse" style={{ top: '75%', left: '15%' }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Gamepad2 className="w-12 h-12 text-purple-400" />
            <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 tracking-wider">
              DODGE MASTER
            </h1>
            <Gamepad2 className="w-12 h-12 text-purple-400" />
          </div>
          <p className="text-2xl text-gray-300 font-medium mb-4">
            The Ultimate Survival Challenge
          </p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Dodge falling objects, collect power-ups, and survive as long as possible in this thrilling multiplayer experience!
          </p>
        </div>

        <div className="mb-8 flex justify-center">
          <div className={`flex items-center gap-3 px-6 py-3 rounded-full ${
            connected 
              ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            {connected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            <span className="font-semibold">
              {connected ? 'Connected to Server' : 'Disconnected from Server'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-6 text-center backdrop-blur-sm">
            <Trophy className="w-8 h-8 mx-auto mb-3 text-purple-400" />
            <div className="text-purple-400 font-bold text-2xl mb-1">Survival</div>
            <div className="text-gray-300">Test your reflexes and endurance</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl p-6 text-center backdrop-blur-sm">
            <Users className="w-8 h-8 mx-auto mb-3 text-blue-400" />
            <div className="text-blue-400 font-bold text-2xl mb-1">Multiplayer</div>
            <div className="text-gray-300">Compete with friends online</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl p-6 text-center backdrop-blur-sm">
            <Zap className="w-8 h-8 mx-auto mb-3 text-green-400" />
            <div className="text-green-400 font-bold text-2xl mb-1">Power-ups</div>
            <div className="text-gray-300">Shield, freeze, and slow effects</div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-8 backdrop-blur-sm border border-gray-700/50">
            <div className="text-center mb-6">
              <Plus className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <h2 className="text-2xl font-bold text-white mb-2">Create Room</h2>
              <p className="text-gray-400">Start a new game and invite friends</p>
            </div>
            
            <button
              onClick={createRoom}
              disabled={!connected || isCreatingRoom}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all transform ${
                connected && !isCreatingRoom
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:scale-105 shadow-lg hover:shadow-green-500/25'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isCreatingRoom ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Room
                </div>
              )}
            </button>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-8 backdrop-blur-sm border border-gray-700/50">
            <div className="text-center mb-6">
              <LogIn className="w-12 h-12 mx-auto mb-4 text-blue-400" />
              <h2 className="text-2xl font-bold text-white mb-2">Join Room</h2>
              <p className="text-gray-400">Enter a room code to join friends</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter room code (e.g., ABC123)"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={6}
              />
              
              <button
                onClick={joinRoom}
                disabled={!connected || !inputRoomCode.trim() || isJoiningRoom}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all transform ${
                  connected && inputRoomCode.trim() && !isJoiningRoom
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105 shadow-lg hover:shadow-blue-500/25'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isJoiningRoom ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Joining...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5" />
                    Join Room
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-8 backdrop-blur-sm border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
            <Play className="w-6 h-6" />
            How to Play
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Controls</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Movement:</span>
                  <span className="font-mono bg-gray-700 px-2 py-1 rounded text-sm">WASD / Arrow Keys</span>
                </div>
                <div className="flex justify-between">
                  <span>Respawn:</span>
                  <span className="font-mono bg-gray-700 px-2 py-1 rounded text-sm">SPACE</span>
                </div>
                <div className="flex justify-between">
                  <span>Fullscreen:</span>
                  <span className="font-mono bg-gray-700 px-2 py-1 rounded text-sm">F11</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Power-ups</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-400 rounded"></div>
                  <span className="text-gray-300">Shield - Protects from damage</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-400 rounded"></div>
                  <span className="text-gray-300">Freeze - Freezes other players</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span className="text-gray-300">Slow - Slows other players</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-gray-300 text-center">
              <strong className="text-white">Objective:</strong> Dodge falling red blocks while collecting power-ups. 
              Survive as long as possible to achieve the highest score!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}