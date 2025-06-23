import React, { useRef, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  Maximize,
  Minimize,
  Users,
  Trophy,
  Zap,
  Gamepad2,
  GamepadIcon,
} from "lucide-react";

interface Player {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  score: number;
  skin: string;
  shieldUntil: number;
  freezeUntil: number;
  slowUntil: number;
}

interface GameObject {
  id: string;
  x: number;
  y: number;
  vy: number;
  type: "block" | "shield" | "freeze" | "slow";
  width: number;
  height: number;
}

interface GameState {
  players: Player[];
  objects: GameObject[];
  gameTime: number;
}

interface Props {
  socket: Socket;
  roomCode: string;
}

export default function GameCanvas({ socket, roomCode }: Props) {
  console.log("[GameCanvas] mount:", { roomCode, socketId: socket.id });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const animationRef = useRef<number | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    objects: [],
    gameTime: 0,
  });
  const [gameSize, setGameSize] = useState({ width: 800, height: 600 });
  const [playerId, setPlayerId] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooShort, setTooShort] = useState(false);
  const [keys, setKeys] = useState({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const alivePlayers = gameState.players.filter((p) => p.alive);
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      gameContainerRef.current
        ?.requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
          console.error("Error attempting to enable fullscreen:", err);
        });
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
        })
        .catch((err) => {
          console.error("Error attempting to exit fullscreen:", err);
        });
    }
  }, []);
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    console.log("[GameCanvas] setting up socket listeners");
    socketRef.current = socket;

    socket.on(
      "gameInit",
      (data: { width: number; height: number; playerId: string }) => {
         console.log("[GameCanvas] gameInit:", data);
        setGameSize({ width: data.width, height: data.height });
        setPlayerId(data.playerId);
      }
    );

    socket.on("gameState", (state: GameState) => {
      console.log("[GameCanvas] gameState t ick:", state);
      setGameState(state);
    });
  socket.emit(
    "join",
    roomCode,
    (res: { success: boolean; message?: string }) => {
      if (!res.success) {
        alert("Join failed: " + res.message);
      }
    }
  );


  return () => {
    socket.off("gameInit");
    socket.off("gameState");
  };
  }, [socket]);
  useEffect(() => {
    const checkSize = () => setTooShort(window.innerHeight < 890);
    window.addEventListener("resize", checkSize);
    checkSize();
    return () => window.removeEventListener("resize", checkSize);
  }, []);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newKeys = { ...keys };
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          newKeys.left = true;
          break;
        case "ArrowRight":
        case "KeyD":
          newKeys.right = true;
          break;
        case "ArrowUp":
        case "KeyW":
          newKeys.up = true;
          break;
        case "ArrowDown":
        case "KeyS":
          newKeys.down = true;
          break;
        case "Space":
          e.preventDefault();
          const myPlayer = gameState.players.find((p) => p.id === playerId);
          if (myPlayer && !myPlayer.alive) {
            socketRef.current?.emit("respawn");
          }
          break;
        case "F11":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
      setKeys(newKeys);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const newKeys = { ...keys };
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          newKeys.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          newKeys.right = false;
          break;
        case "ArrowUp":
        case "KeyW":
          newKeys.up = false;
          break;
        case "ArrowDown":
        case "KeyS":
          newKeys.down = false;
          break;
      }
      setKeys(newKeys);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [keys, gameState.players, playerId, toggleFullscreen]);

  useEffect(() => {
    socket.emit("input", roomCode, keys);
  }, [keys]);

  const drawPlayer = useCallback(
    (ctx: CanvasRenderingContext2D, player: Player, currentTime: number) => {
      const { x, y, skin, alive, shieldUntil, freezeUntil, slowUntil } = player;

      if (!alive) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "#666";
        ctx.fillRect(x, y, 32, 32);
        ctx.globalAlpha = 1;
        return;
      }

      switch (skin) {
        case "knight":
          ctx.fillStyle = "#4a5568";
          ctx.fillRect(x, y, 32, 32);
          ctx.fillStyle = "#cbd5e0";
          ctx.fillRect(x + 8, y + 8, 16, 16);
          break;
        case "wizard":
          ctx.fillStyle = "#553c9a";
          ctx.fillRect(x, y, 32, 32);
          ctx.fillStyle = "#9f7aea";
          ctx.fillRect(x + 8, y + 8, 16, 16);
          break;
        case "archer":
          ctx.fillStyle = "#38a169";
          ctx.fillRect(x, y, 32, 32);
          ctx.fillStyle = "#68d391";
          ctx.fillRect(x + 8, y + 8, 16, 16);
          break;
        case "rogue":
          ctx.fillStyle = "#2d3748";
          ctx.fillRect(x, y, 32, 32);
          ctx.fillStyle = "#4a5568";
          ctx.fillRect(x + 8, y + 8, 16, 16);
          break;
      }

      if (currentTime < shieldUntil) {
        ctx.strokeStyle = "#48bb78";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + 16, y + 16, 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (currentTime < freezeUntil) {
        ctx.fillStyle = "rgba(59, 130, 246, 0.5)";
        ctx.fillRect(x - 4, y - 4, 40, 40);
      }

      if (currentTime < slowUntil) {
        ctx.fillStyle = "rgba(245, 158, 11, 0.3)";
        ctx.fillRect(x - 2, y - 2, 36, 36);
      }
    },
    []
  );

  const drawObject = useCallback(
    (ctx: CanvasRenderingContext2D, obj: GameObject) => {
      const { x, y, type, width, height } = obj;

      switch (type) {
        case "block":
          ctx.fillStyle = "#e53e3e";
          ctx.fillRect(x, y, width, height);
          ctx.fillStyle = "#fc8181";
          ctx.fillRect(x + 2, y + 2, width - 4, 4);
          break;
        case "shield":
          ctx.fillStyle = "#48bb78";
          ctx.fillRect(x, y, width, height);
          ctx.fillStyle = "#9ae6b4";
          ctx.fillRect(x + 4, y + 4, width - 8, height - 8);
          break;
        case "freeze":
          ctx.fillStyle = "#3182ce";
          ctx.fillRect(x, y, width, height);
          ctx.fillStyle = "#90cdf4";
          ctx.fillRect(x + 4, y + 4, width - 8, height - 8);
          break;
        case "slow":
          ctx.fillStyle = "#d69e2e";
          ctx.fillRect(x, y, width, height);
          ctx.fillStyle = "#f6e05e";
          ctx.fillRect(x + 4, y + 4, width - 8, height - 8);
          break;
      }
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = "#1a202c";
      ctx.fillRect(0, 0, gameSize.width, gameSize.height);
      ctx.strokeStyle = "#2d3748";
      ctx.lineWidth = 1;
      for (let x = 0; x < gameSize.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, gameSize.height);
        ctx.stroke();
      }
      for (let y = 0; y < gameSize.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(gameSize.width, y);
        ctx.stroke();
      }

      const currentTime = gameState.gameTime * 1000;
      gameState.objects.forEach((obj) => drawObject(ctx, obj));
      gameState.players.forEach((player) =>
        drawPlayer(ctx, player, currentTime)
      );

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, gameSize, drawObject, drawPlayer]);

  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const isAlive = myPlayer?.alive ?? false;

  return (
    <div
      ref={gameContainerRef}
      className={`flex w-full h-screen bg-gradient-to-br from-gray-800/50 to-gray-900/50 ${
        isFullscreen ? "p-2" : "p-4"
      }`}
    >
      {tooShort ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "#fffae6",
            color: "#665c00",
            padding: "8px 16px",
            fontSize: 14,
            zIndex: 1000,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          ⚠️ Window height is too low. For the best experience, consider zooming
          out.
        </div>
      ) : (
        ""
      )}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-2 h-2 bg-blue-400 rounded-full animate-pulse"
          style={{ top: "20%", left: "10%" }}
        />
        <div
          className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse"
          style={{ top: "60%", left: "80%" }}
        />
        <div
          className="absolute w-3 h-3 bg-green-400 rounded-full animate-pulse"
          style={{ top: "80%", left: "20%" }}
        />
        <div
          className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-pulse"
          style={{ top: "30%", left: "70%" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <GamepadIcon className="w-8 h-8 text-purple-400" />
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 tracking-wider">
              DODGE MASTER
            </h1>
            <GamepadIcon className="w-8 h-8 text-purple-400" />
          </div>
          <div className="text-gray-300 text-lg font-medium">
            The Ultimate Survival Challenge
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-4 text-center backdrop-blur-sm">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <div className="text-green-400 font-bold text-xl">
              {Math.floor(myPlayer?.score ?? 0)}
            </div>
            <div className="text-gray-300 text-sm">Score</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4 text-center backdrop-blur-sm">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <div className="text-blue-400 font-bold text-xl">
              {alivePlayers.length}
            </div>
            <div className="text-gray-300 text-sm">Alive</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4 text-center backdrop-blur-sm">
            <Zap className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <div className="text-purple-400 font-bold text-xl">
              {gameState.objects.length}
            </div>
            <div className="text-gray-300 text-sm">Objects</div>
          </div>

          <div
            className={`bg-gradient-to-br ${
              connected
                ? "from-green-500/20 to-green-600/20 border-green-500/30"
                : "from-red-500/20 to-red-600/20 border-red-500/30"
            } border rounded-xl p-4 text-center backdrop-blur-sm`}
          >
            <div
              className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                connected ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <div
              className={`font-bold text-lg ${
                connected ? "text-green-400" : "text-red-400"
              }`}
            >
              {connected ? "ONLINE" : "OFFLINE"}
            </div>
            <div className="text-gray-300 text-sm">Status</div>
          </div>

          <div className="bg-gradient-to-br from-gray-500/20 to-gray-600/20 border border-gray-500/30 rounded-xl p-4 text-center backdrop-blur-sm">
            <button
              onClick={toggleFullscreen}
              className="w-full h-full flex flex-col items-center justify-center hover:scale-105 transition-transform"
            >
              {isFullscreen ? (
                <Minimize className="w-6 h-6 text-white mb-2" />
              ) : (
                <Maximize className="w-6 h-6 text-white mb-2" />
              )}
              <div className="text-white font-bold text-lg">
                {isFullscreen ? "EXIT" : "FULL"}
              </div>
              <div className="text-gray-300 text-sm">Screen</div>
            </button>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 backdrop-blur-sm border border-gray-700/50">
          <canvas
            ref={canvasRef}
            width={gameSize.width}
            height={gameSize.height}
            className="border-2 border-gray-500/50 bg-gray-900 rounded-lg shadow-2xl mx-auto block"
          />

          {!isAlive && (
            <div className="absolute inset-6 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="text-center text-white">
                <div className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-400">
                  GAME OVER
                </div>
                <div className="text-2xl mb-6 text-gray-300">
                  Final Score:{" "}
                  <span className="text-yellow-400 font-bold">
                    {Math.floor(myPlayer?.score ?? 0)}
                  </span>
                </div>
                <div className="text-lg text-gray-400 animate-pulse">
                  Press{" "}
                  <span className="bg-gray-700 px-2 py-1 rounded font-mono">
                    SPACE
                  </span>{" "}
                  to respawn
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
            <h3 className="font-bold text-white mb-4 text-xl flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              Controls
            </h3>
            <div className="space-y-2 text-gray-300">
              <div className="flex justify-between">
                <span>Movement:</span>
                <span className="font-mono bg-gray-700 px-2 py-1 rounded text-sm">
                  WASD / Arrow Keys
                </span>
              </div>
              <div className="flex justify-between">
                <span>Respawn:</span>
                <span className="font-mono bg-gray-700 px-2 py-1 rounded text-sm">
                  SPACE
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fullscreen:</span>
                <span className="font-mono bg-gray-700 px-2 py-1 rounded text-sm">
                  F11
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
            <h3 className="font-bold text-white mb-4 text-xl flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Power-ups
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span className="text-gray-300">Shield Protection</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-400 rounded"></div>
                <span className="text-gray-300">Freeze Others</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                <span className="text-gray-300">Slow Others</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}