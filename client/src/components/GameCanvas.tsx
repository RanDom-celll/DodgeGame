import React, { useRef, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

//-------types-----
import type { Player } from "../types/Player";
import type { FallingObject } from "../types/FallingObject";

// --- Image Preloading (outside component) ---
const powerUpImages = ({ obj, ctx }: { obj: FallingObject; ctx: CanvasRenderingContext2D }) => {
  const centerX = obj.x + 16;
  const centerY = obj.y + 16;
  const time = Date.now() * 0.005;
  
  if (obj.type === "shield") {
    // Animated shield with glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 20);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
    gradient.addColorStop(0.7, 'rgba(34, 197, 94, 0.4)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 18 + Math.sin(time * 2) * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Shield icon
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 12);
    ctx.lineTo(centerX - 8, centerY - 6);
    ctx.lineTo(centerX - 8, centerY + 6);
    ctx.lineTo(centerX, centerY + 12);
    ctx.lineTo(centerX + 8, centerY + 6);
    ctx.lineTo(centerX + 8, centerY - 6);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#065f46';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (obj.type === "freeze") {
    // Animated ice crystal with particles
    const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 20);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
    gradient.addColorStop(0.7, 'rgba(147, 197, 253, 0.4)');
    gradient.addColorStop(1, 'rgba(219, 234, 254, 0.1)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 18 + Math.sin(time * 3) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Snowflake design
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + time;
      const x1 = centerX + Math.cos(angle) * 10;
      const y1 = centerY + Math.sin(angle) * 10;
      const x2 = centerX + Math.cos(angle) * 4;
      const y2 = centerY + Math.sin(angle) * 4;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x1, y1);
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 + Math.cos(angle + Math.PI/4) * 3, y2 + Math.sin(angle + Math.PI/4) * 3);
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 + Math.cos(angle - Math.PI/4) * 3, y2 + Math.sin(angle - Math.PI/4) * 3);
      ctx.stroke();
    }
  } else if (obj.type === "slow") {
    // Animated clock with golden glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 20);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.8)');
    gradient.addColorStop(0.7, 'rgba(251, 191, 36, 0.4)');
    gradient.addColorStop(1, 'rgba(254, 243, 199, 0.1)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 18 + Math.sin(time * 2.5) * 1.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Clock face
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Clock hands
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Hour hand
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(time * 0.5) * 6, centerY + Math.sin(time * 0.5) * 6);
    ctx.stroke();
    
    // Minute hand
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(time * 2) * 9, centerY + Math.sin(time * 2) * 9);
    ctx.stroke();
  }
};

const PlayerVisual = ({ player, ctx }: { player: Player; ctx: CanvasRenderingContext2D }) => {
  const centerX = player.x + 16;
  const centerY = player.y + 16;
  const time = Date.now() * 0.003;
  
  // Enhanced player avatar with glow effect
  const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 25);
  gradient.addColorStop(0, 'rgba(139, 69, 19, 0.1)');
  gradient.addColorStop(1, 'rgba(139, 69, 19, 0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
  ctx.fill();
  
  // Player body (knight-like character)
  if (player.skin === "knight" || !player.skin) {
    // Body
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(player.x + 8, player.y + 12, 16, 16);
    
    // Head
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(centerX, player.y + 8, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Helmet
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(centerX, player.y + 6, 8, Math.PI, 2 * Math.PI);
    ctx.fill();
    
    // Sword
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(player.x + 26, player.y + 8, 2, 12);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(player.x + 25, player.y + 20, 4, 3);
  } else if (player.skin === "bird") {
    // Bird body
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 2, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird head
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(centerX - 2, centerY - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Wing flapping animation
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.ellipse(centerX + 4, centerY, 4, 8 + Math.sin(time * 10) * 2, Math.PI/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(centerX - 7, centerY - 4);
    ctx.lineTo(centerX - 10, centerY - 2);
    ctx.lineTo(centerX - 7, centerY);
    ctx.fill();
  }
  
  // Enhanced power-up effects
  if (Date.now() < player.freezeUntil) {
    const iceGradient = ctx.createRadialGradient(centerX, centerY, 15, centerX, centerY, 25);
    iceGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    iceGradient.addColorStop(1, 'rgba(147, 197, 253, 0.1)');
    
    ctx.fillStyle = iceGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Ice particles
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI / 4) + time * 2;
      const radius = 28 + Math.sin(time * 3 + i) * 3;
      const px = centerX + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;
      
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  if (Date.now() < player.shieldUntil) {
    const shieldGradient = ctx.createRadialGradient(centerX, centerY, 15, centerX, centerY, 28);
    shieldGradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
    shieldGradient.addColorStop(0.8, 'rgba(34, 197, 94, 0.2)');
    shieldGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
    
    ctx.fillStyle = shieldGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 28 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Shield barrier effect
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -time * 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  if (Date.now() < player.slowUntil) {
    const slowGradient = ctx.createRadialGradient(centerX, centerY, 15, centerX, centerY, 30);
    slowGradient.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
    slowGradient.addColorStop(1, 'rgba(251, 191, 36, 0.1)');
    
    ctx.fillStyle = slowGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Time distortion effect
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI / 3) + time;
      const radius = 32 + Math.sin(time * 2 + i) * 4;
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.6 - (i * 0.1)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, angle, angle + Math.PI / 6);
      ctx.stroke();
    }
  }
};


const skinList = ["knight", "bird"];
const skinImages: Record<string, HTMLImageElement> = {};

for (const skin of skinList) {
  const img = new Image();
  img.src = `/avatars/${skin}.png`;
  skinImages[skin] = img;
}

// --- Component ---
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const [gameStats, setGameStats] = useState({ score: 0, level: 1, lives: 3 });

  const keys = useRef<{ [key: string]: 0 | 1 }>({
    ArrowLeft: 0,
    ArrowRight: 0,
    ArrowUp: 0,
    ArrowDown: 0,
  });

  const playersRef = useRef<Player[]>([]);
  const objectsRef = useRef<FallingObject[]>([]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on(
      "state",
      (data: { players: Player[]; objects: FallingObject[] }) => {
        setPlayers(data.players);
        setObjects(data.objects);
      }
    );

    const handleKey = (e: KeyboardEvent, value: 0 | 1) => {
      if (e.key in keys.current) {
        keys.current[e.key] = value;
        const dx = keys.current.ArrowRight - keys.current.ArrowLeft;
        const dy = keys.current.ArrowDown - keys.current.ArrowUp;
        socket.emit("input", { dx, dy });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => handleKey(e, 1);
    const handleKeyUp = (e: KeyboardEvent) => handleKey(e, 0);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      socket.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const obj of objectsRef.current) {
        if (obj.type === "block") {
          // Enhanced danger block with glow and animation
          const time = Date.now() * 0.005;
          const centerX = obj.x + 14;
          const centerY = obj.y + 14;
          
          // Danger glow
          const dangerGradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 25);
          dangerGradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
          dangerGradient.addColorStop(0.7, 'rgba(239, 68, 68, 0.3)');
          dangerGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
          
          ctx.fillStyle = dangerGradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 25 + Math.sin(time * 4) * 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Main block with beveled edges
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(obj.x, obj.y, 28, 28);
          
          // Highlight and shadow for 3D effect
          ctx.fillStyle = '#fca5a5';
          ctx.fillRect(obj.x, obj.y, 28, 2);
          ctx.fillRect(obj.x, obj.y, 2, 28);
          
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(obj.x, obj.y + 26, 28, 2);
          ctx.fillRect(obj.x + 26, obj.y, 2, 28);
          
          // Warning symbol
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('!', centerX, centerY + 5);
        } else {
          powerUpImages({ obj, ctx });
        }
      }
      for (const player of playersRef.current) {
        PlayerVisual({ player, ctx });
      }

      requestAnimationFrame(draw);
    };

    draw();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Game Header */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
          DODGE MASTER
        </h1>
        <div className="flex gap-6 text-white">
          <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-500/30">
            <span className="text-purple-300">Score:</span> <span className="font-bold text-yellow-400">{gameStats.score}</span>
          </div>
          <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-500/30">
            <span className="text-purple-300">Level:</span> <span className="font-bold text-green-400">{gameStats.level}</span>
          </div>
          <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-500/30">
            <span className="text-purple-300">Lives:</span> <span className="font-bold text-red-400">{gameStats.lives}</span>
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-75"></div>
        <canvas
          ref={canvasRef}
          width={1024}
          height={600}
          className="relative bg-slate-900 rounded-lg shadow-2xl border border-purple-500/30"
        />
      </div>

      {/* Controls */}
      <div className="mt-6 text-center">
        <div className="bg-black/20 backdrop-blur-sm px-6 py-4 rounded-lg border border-purple-500/30 max-w-2xl">
          <h3 className="text-lg font-semibold text-purple-300 mb-2">Controls</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <span className="bg-purple-600 px-2 py-1 rounded text-xs">↑</span>
              <span>Move Up</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-600 px-2 py-1 rounded text-xs">↓</span>
              <span>Move Down</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-600 px-2 py-1 rounded text-xs">←</span>
              <span>Move Left</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-600 px-2 py-1 rounded text-xs">→</span>
              <span>Move Right</span>
            </div>
          </div>
        </div>
      </div>

      {/* Power-ups Legend */}
      <div className="mt-4 text-center">
        <div className="bg-black/20 backdrop-blur-sm px-6 py-4 rounded-lg border border-purple-500/30 max-w-2xl">
          <h3 className="text-lg font-semibold text-purple-300 mb-2">Power-ups</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">🛡️</div>
              <span><strong className="text-green-400">Shield:</strong> Protects from damage</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">❄️</div>
              <span><strong className="text-blue-400">Freeze:</strong> Slows down obstacles</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">⏰</div>
              <span><strong className="text-yellow-400">Slow:</strong> Slows down time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}