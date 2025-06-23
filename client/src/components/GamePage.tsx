
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import GameCanvas from "./GameCanvas";

export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [joinError, setJoinError] = useState<string>();
  const socketRef = useRef<Socket | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    console.log("Creating socket connection to localhost:3000");
    const newSocket = io("http://localhost:3000", {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  newSocket.on('connect', () => {
    newSocket.emit('joinRoom', code, (res) => {
      if (!res.success) {
        setJoinError(res.message || 'Room not found');
        setIsJoining(false);
        return;
      }
      newSocket.emit('join', code, (gameRes) => {
        if (!gameRes.success) {
          setJoinError(gameRes.message || 'Failed to join game');
        }
        setIsJoining(false);
      });
    });
  });
    const connectionTimeout = setTimeout(() => {
      console.log('Connection timeout reached');
      if (isJoining && !newSocket.connected) {
        setJoinError("Connection timeout - server may be down");
        setIsJoining(false);
      }
    }, 15000);
  return () => {
    newSocket.emit('leaveRoom', code);
    newSocket.disconnect();
  };
}, [code, navigate]);

  const handleJoinRoom = (socket: Socket, roomCode: string) => {
    console.log("Attempting to join room:", roomCode);

    socket.emit("joinRoom", roomCode, (res: any) => {
      console.log("joinRoom response:", res);
      
      if (res.success) {
        console.log("Successfully joined room, now joining game");
        
        socket.emit("join", roomCode, (gameRes: any) => {
          console.log("join game response:", gameRes);
          
          if (gameRes.success) {
            console.log("Successfully joined game");
            setIsJoining(false);
          } else {
            console.error("Failed to join game:", gameRes.message);
            setJoinError(gameRes.message || "Failed to join game");
            setIsJoining(false);
          }
        });
      } else {
        console.error("Failed to join room:", res.message);
        setJoinError(res.message || "Room not found");
        setIsJoining(false);
      }
    });
  };

  if (!code) return null;

  if (isJoining) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to server...</p>
          <p className="text-sm text-gray-400 mt-2">Joining room {code}</p>
        </div>
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{joinError}</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!socket) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">Socket connection failed</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return <GameCanvas socket={socket} roomCode={code} />;
}