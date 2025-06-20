import React, { useRef, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

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

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [keys, setKeys] = useState({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  useEffect(() => {
    const socket = io("http://localhost:3000");
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on(
      "gameInit",
      (data: { width: number; height: number; playerId: string }) => {
        setGameSize({ width: data.width, height: data.height });
        setPlayerId(data.playerId);
      }
    );

    socket.on("gameState", (state: GameState) => {
      setGameState(state);
    });

    return () => {
      socket.disconnect();
    };
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
  }, [keys, gameState.players, playerId]);
  useEffect(() => {
    if (socketRef.current && connected) {
      socketRef.current.emit("input", keys);
    }
  }, [keys, connected]);
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
    <div className="flex w-full   overflow-x-hidden overflow-y-hidden flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="bg-gray-800 rounded-lg p-6 shadow-2xl">
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">DODGE MASTER</h1>
          <div className="flex gap-4 text-sm">
            <div className="text-green-400">
              Score: {Math.floor(myPlayer?.score ?? 0)}
            </div>
            <div className="text-blue-400">
              Players: {gameState.players.filter((p) => p.alive).length}
            </div>
            <div className={`${connected ? "text-green-400" : "text-red-400"}`}>
              {connected ? "Connected" : "Disconnected"}
            </div>
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={gameSize.width}
            height={gameSize.height}
            className="border-2 border-gray-600 bg-gray-900"
          />

          {!isAlive && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
              <div className="text-center text-white">
                <h2 className="text-2xl font-bold mb-2">GAME OVER</h2>
                <p className="mb-4">
                  Final Score: {Math.floor(myPlayer?.score ?? 0)}
                </p>
                <p className="text-sm text-gray-300">Press SPACE to respawn</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-gray-400">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-white mb-2">Controls</h3>
              <p>WASD or Arrow Keys to move</p>
              <p>SPACE to respawn when dead</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Power-ups</h3>
              <div className="text-xs">
                <p>
                  <span className="text-green-400">Green:</span> Shield
                </p>
                <p>
                  <span className="text-blue-400">Blue:</span> Freeze others
                </p>
                <p>
                  <span className="text-yellow-400">Yellow:</span> Slow others
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
