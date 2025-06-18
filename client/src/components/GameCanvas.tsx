import React, { useRef, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type Player = {
    skin: any; id: string; x: number; y: number 
};
type FallingObject = { id: string; x: number; y: number };

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const keys = useRef<{ [k: string]: 0 | 1 }>({
    ArrowLeft: 0,
    ArrowRight: 0,
    ArrowUp: 0,
    ArrowDown: 0,
  });
  const skinImages: Record<string, HTMLImageElement> = {};
  const skinList = ["knight", "wizard", "archer"];
  for (const skin of skinList) {
    const img = new Image();
    img.src = `/avatars/${skin}.png`; 
    skinImages[skin] = img;
  }
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
    window.addEventListener("keydown", (e) => handleKey(e, 1));
    window.addEventListener("keyup", (e) => handleKey(e, 0));

    return () => {
      socket.disconnect();
      window.removeEventListener("keydown", (e) => handleKey(e, 1));
      window.removeEventListener("keyup", (e) => handleKey(e, 0));
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const o of objects) {
        ctx.fillStyle = "black";
        ctx.fillRect(o.x, o.y, 32, 32);
      }
      for (const p of players) {
        const img = skinImages[p.skin] || skinImages["knight"];
        ctx.drawImage(img, p.x, p.y, 32, 32);
      }

      requestAnimationFrame(draw);
    }
    draw();
  }, [players, objects]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ border: "1px solid #000" }}
    />
  );
}
